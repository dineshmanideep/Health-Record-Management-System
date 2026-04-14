const MedicalFieldCatalog = require('../models/MedicalFieldCatalog');
const { callModelGenerate, aiTrace, createTraceId } = require('./aiSummarizer');
const { normalizeLookup, toStableCamelCase, titleCase } = require('./medicalCanonicalization');
const {
  loadCatalogEntries,
  detectBloodSugarResolution,
  buildClarificationIssue
} = require('./medicalFieldCatalogService');

function uniqueNonEmpty(values = []) {
  return Array.from(new Set((values || []).map((value) => String(value || '').trim()).filter(Boolean)));
}

function compactLookup(value = '') {
  return normalizeLookup(value).replace(/[^a-z0-9]/g, '');
}

function stripJsonFences(value = '') {
  return String(value || '')
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function normalizeJsonLikeText(value = '') {
  return String(value || '')
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\t/g, '  ')
    .trim();
}

function extractFirstJsonObject(value = '') {
  const text = String(value || '');
  const start = text.indexOf('{');
  if (start < 0) return '';

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, index + 1);
      }
    }
  }

  return '';
}

function tryParseJsonCandidates(payload = '') {
  const cleaned = normalizeJsonLikeText(stripJsonFences(payload));
  const candidates = [
    cleaned,
    extractFirstJsonObject(cleaned)
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      return { parsed: JSON.parse(candidate), source: candidate };
    } catch {
      // Continue trying other candidates.
    }
  }

  return { parsed: null, source: '' };
}

function extractFieldSample(rawValue) {
  if (rawValue == null) return null;
  if (typeof rawValue === 'number' || typeof rawValue === 'boolean') return rawValue;
  if (typeof rawValue === 'string') return rawValue.slice(0, 80);
  if (Array.isArray(rawValue)) return rawValue.slice(0, 3);
  if (typeof rawValue === 'object') {
    return {
      value: rawValue.value ?? rawValue.result ?? rawValue.reading ?? null,
      unit: rawValue.unit || rawValue.units || '',
      reference: rawValue.reference || rawValue.referenceRange || rawValue.range || ''
    };
  }
  return null;
}

function buildPromptMappings(entries = [], limit = 140) {
  return (entries || []).slice(0, limit).map((entry) => ({
    unifiedName: String(entry.displayName || entry.canonicalKey || '').trim(),
    canonicalKey: String(entry.canonicalKey || '').trim(),
    aliases: uniqueNonEmpty([entry.canonicalKey, ...(entry.aliases || [])]).slice(0, 15)
  }));
}

function buildExtractedFieldPayload(extractedFields = {}) {
  return Object.entries(extractedFields || {}).map(([inputName, rawValue]) => ({
    inputName: String(inputName || '').trim(),
    sample: extractFieldSample(rawValue)
  })).filter((item) => item.inputName);
}

function buildResolutionPrompt({ extractedFieldPayload = [], promptMappings = [], clarificationSelections = {} }) {
  return [
    'You are Stage-2 in a medical extraction pipeline.',
    'Task: unify extracted field names using existing DB mappings.',
    'Do semantic matching only for medical field names.',
    '',
    'Output MUST be valid JSON only with this exact shape:',
    '{',
    '  "resolvedFields": [',
    '    {',
    '      "inputName": "string",',
    '      "matched": true,',
    '      "unifiedName": "string"',
    '    }',
    '  ]',
    '}',
    '',
    'Rules:',
    '- Include every inputName exactly once in resolvedFields.',
    '- If field semantically matches existing mappings: matched=true and unifiedName must be one of existing unifiedName values.',
    '- If field is new: matched=false and unifiedName should preserve original meaning (do not invent another test).',
    '- Do NOT merge different blood sugar contexts.',
    '- fasting blood sugar is NOT the same as post-meal blood sugar or random blood sugar.',
    '- If uncertain, use matched=false and unifiedName equal to inputName.',
    '',
    `Clarification selections (if any): ${JSON.stringify(clarificationSelections || {})}`,
    '',
    `Extracted fields: ${JSON.stringify(extractedFieldPayload)}`,
    '',
    `Existing DB mappings: ${JSON.stringify(promptMappings)}`
  ].join('\n');
}

function validateResolutionPayload(payload, expectedInputNames = []) {
  const objectPayload = payload && typeof payload === 'object' && !Array.isArray(payload)
    ? payload
    : null;

  if (!objectPayload || !Array.isArray(objectPayload.resolvedFields)) {
    return {
      valid: false,
      errors: ['Stage-2 response is missing resolvedFields array'],
      data: { resolvedFields: [] }
    };
  }

  const resolved = [];
  for (const item of objectPayload.resolvedFields) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;

    const inputName = String(item.inputName || '').trim();
    const unifiedName = String(item.unifiedName || '').trim();
    const matched = typeof item.matched === 'boolean'
      ? item.matched
      : ['1', 'true', 'yes'].includes(String(item.matched || '').trim().toLowerCase());

    if (!inputName || !unifiedName) continue;
    resolved.push({ inputName, matched, unifiedName });
  }

  if (!resolved.length && expectedInputNames.length) {
    return {
      valid: false,
      errors: ['Stage-2 response does not include usable resolvedFields entries'],
      data: { resolvedFields: [] }
    };
  }

  return {
    valid: true,
    errors: [],
    data: { resolvedFields: resolved }
  };
}

function findCatalogEntry(entries = [], searchName = '', searchCanonicalKey = '') {
  const lookup = normalizeLookup(searchName);
  const compact = compactLookup(searchName);
  const canonicalKey = String(searchCanonicalKey || '').trim();

  for (const entry of entries || []) {
    if (!entry) continue;

    if (canonicalKey && String(entry.canonicalKey || '').trim() === canonicalKey) {
      return entry;
    }

    const candidates = [entry.canonicalKey, entry.displayName, ...(entry.aliases || [])];
    for (const candidate of candidates) {
      const candidateLookup = normalizeLookup(candidate);
      if (!candidateLookup) continue;
      if (lookup && candidateLookup === lookup) return entry;
      if (compact && compactLookup(candidate) === compact) return entry;
    }
  }

  return null;
}

function buildDisplayName(value = '', fallback = '') {
  const raw = String(value || '').trim();
  if (raw) return raw;

  const titled = titleCase(normalizeLookup(fallback));
  return titled || String(fallback || '').trim() || 'Unknown Field';
}

function createUniqueCanonicalKey(baseName = '', entries = []) {
  const base = toStableCamelCase(baseName) || `field${Date.now()}`;
  const used = new Set((entries || []).map((entry) => normalizeLookup(entry?.canonicalKey || '')));

  let candidate = base;
  let counter = 2;
  while (used.has(normalizeLookup(candidate))) {
    candidate = `${base}${counter}`;
    counter += 1;
  }

  return candidate;
}

async function persistAliases(entry, aliases = []) {
  const aliasList = uniqueNonEmpty(aliases);
  if (!entry?._id || !aliasList.length) return entry;

  const updated = await MedicalFieldCatalog.findOneAndUpdate(
    { _id: entry._id },
    {
      $addToSet: {
        aliases: { $each: aliasList }
      }
    },
    { returnDocument: 'after' }
  ).lean();

  return updated || entry;
}

function upsertEntryInCache(entries = [], updatedEntry = null) {
  if (!updatedEntry?._id) return entries;

  const index = entries.findIndex((entry) => String(entry?._id) === String(updatedEntry._id));
  if (index >= 0) {
    const next = [...entries];
    next[index] = updatedEntry;
    return next;
  }

  return [...entries, updatedEntry];
}

async function createLearnedEntry({ unifiedName = '', inputName = '', entries = [] }) {
  const displayName = buildDisplayName(unifiedName, inputName);
  const canonicalKey = createUniqueCanonicalKey(displayName, entries);
  const aliasList = uniqueNonEmpty([inputName, unifiedName]);

  const created = await MedicalFieldCatalog.findOneAndUpdate(
    { canonicalKey },
    {
      $setOnInsert: {
        canonicalKey,
        displayName,
        source: 'learned'
      },
      $addToSet: {
        aliases: { $each: aliasList }
      }
    },
    {
      upsert: true,
      returnDocument: 'after'
    }
  ).lean();

  return created;
}

function buildResponseShape(internalResolutions = []) {
  return (internalResolutions || []).map((item) => ({
    inputName: item.inputName,
    matched: Boolean(item.matched),
    unifiedName: item.unifiedName
  }));
}

async function resolveFieldsWithLLM({ extractedFields = {}, clarificationSelections = {} } = {}) {
  const traceId = createTraceId('fres');
  const fieldNames = Object.keys(extractedFields || {}).map((name) => String(name || '').trim()).filter(Boolean);

  if (!fieldNames.length) {
    return {
      resolvedFields: [],
      internalResolutions: [],
      ambiguities: [],
      validationErrors: [],
      rawResponse: '',
      providerUsed: ''
    };
  }

  let catalogEntries = await loadCatalogEntries();
  const promptMappings = buildPromptMappings(catalogEntries);
  const extractedFieldPayload = buildExtractedFieldPayload(extractedFields);
  const prompt = buildResolutionPrompt({
    extractedFieldPayload,
    promptMappings,
    clarificationSelections
  });

  aiTrace('field_unification_stage2_start', {
    traceId,
    fieldCount: fieldNames.length,
    mappingCount: promptMappings.length
  });

  const llmResult = await callModelGenerate({ prompt });
  const rawResponse = String(llmResult?.content || '');
  const providerUsed = llmResult?.providerUsed || '';

  const parsed = rawResponse
    ? tryParseJsonCandidates(rawResponse)
    : { parsed: null, source: '' };

  const validation = validateResolutionPayload(parsed.parsed, fieldNames);
  const validationErrors = validation.valid
    ? []
    : uniqueNonEmpty([
      ...(validation.errors || []),
      llmResult?.error || ''
    ]);

  aiTrace(validation.valid ? 'field_unification_stage2_success' : 'field_unification_stage2_fallback', {
    traceId,
    provider: providerUsed,
    outputChars: rawResponse.length,
    errorCount: validationErrors.length
  });

  const llmResolvedByInput = new Map();
  for (const item of validation.data.resolvedFields || []) {
    const key = normalizeLookup(item.inputName);
    if (!key || llmResolvedByInput.has(key)) continue;
    llmResolvedByInput.set(key, item);
  }

  const internalResolutions = [];
  const ambiguities = [];

  for (const inputName of fieldNames) {
    const clarificationChoice = clarificationSelections?.[inputName]
      || clarificationSelections?.[normalizeLookup(inputName)]
      || '';

    const bloodSugarRule = detectBloodSugarResolution(inputName, clarificationChoice);
    if (bloodSugarRule.needsClarification) {
      const ambiguity = buildClarificationIssue(inputName);
      ambiguities.push(ambiguity);
      internalResolutions.push({
        inputName,
        matched: false,
        unifiedName: inputName,
        canonicalKey: '',
        source: '',
        status: 'clarification_required',
        ambiguity
      });
      continue;
    }

    const llmResolution = llmResolvedByInput.get(normalizeLookup(inputName));
    const llmUnifiedName = String(llmResolution?.unifiedName || '').trim();

    let targetEntry = null;
    if (bloodSugarRule.canonicalKey) {
      targetEntry = findCatalogEntry(catalogEntries, '', bloodSugarRule.canonicalKey);
    }

    if (!targetEntry && llmResolution?.matched) {
      targetEntry = findCatalogEntry(catalogEntries, llmUnifiedName);
    }

    if (!targetEntry) {
      targetEntry = findCatalogEntry(catalogEntries, inputName);
    }

    let matchedExisting = Boolean(targetEntry);
    if (!targetEntry) {
      const proposedUnifiedName = llmUnifiedName || inputName;
      targetEntry = await createLearnedEntry({
        unifiedName: proposedUnifiedName,
        inputName,
        entries: catalogEntries
      });
      matchedExisting = false;
      catalogEntries = upsertEntryInCache(catalogEntries, targetEntry);
    } else {
      const updated = await persistAliases(targetEntry, [inputName, llmUnifiedName]);
      targetEntry = updated;
      catalogEntries = upsertEntryInCache(catalogEntries, targetEntry);
    }

    internalResolutions.push({
      inputName,
      matched: matchedExisting,
      unifiedName: targetEntry?.displayName || llmUnifiedName || inputName,
      canonicalKey: targetEntry?.canonicalKey || toStableCamelCase(inputName),
      source: targetEntry?.source || (matchedExisting ? 'system' : 'learned'),
      status: 'resolved'
    });
  }

  return {
    resolvedFields: buildResponseShape(internalResolutions),
    internalResolutions,
    ambiguities,
    validationErrors,
    rawResponse,
    providerUsed
  };
}

module.exports = {
  resolveFieldsWithLLM
};
