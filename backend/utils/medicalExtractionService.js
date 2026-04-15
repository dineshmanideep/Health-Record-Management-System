const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { AI_RUNTIME_CONFIG, callModelGenerate, aiTrace, createTraceId } = require('./aiSummarizer');
const { extractDocumentText } = require('./aiDocumentTextExtractor');
const { validateMedicalExtractionResponse } = require('./medicalExtractionValidator');
const { normalizeFieldEntriesWithCatalog } = require('./medicalFieldNormalization');
const { buildCatalogPromptSection } = require('./medicalFieldCatalogService');
const {
  canonicalizeDiagnosis,
  canonicalizeSpecialization,
  canonicalizeMedicationName,
  buildCanonicalPromptSection
} = require('./medicalCanonicalization');

const execFileAsync = promisify(execFile);
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const PRESCRIPTION_SIGNAL_PATTERN = /\b(tablet|tab\b|capsule|cap\b|syrup|drops|ointment|inject(?:ion)?|take|before food|after food|once daily|twice daily|thrice|morning|night|bedtime|od\b|bd\b|tid\b|hs\b|for\s+\d+\s*(?:day|week|month)s?)\b/i;
const FOLLOW_UP_SIGNAL_PATTERN = /\b(next visit|follow[\s-]?up|review (?:after|in)|revisit|consult (?:again|after)|after\s+\d+\s*(?:day|week|month)s?|in\s+\d+\s*(?:day|week|month)s?)\b/i;
const LAB_DOSAGE_UNIT_PATTERN = /(?:\/\s*(?:dl|ml|l)|\b(?:mg\/dl|g\/dl|ng\/dl|pg\/ml|mmol\/l|miu\/l|uiu\/ml|iu\/ml)\b)/i;
const LIKELY_LAB_TERM_PATTERN = /\b(tsh|t3|t4|ft3|ft4|hemoglobin|hgb|rbc|wbc|platelet|pcv|glucose|sugar|cholesterol|triglyceride|creatinine|urea|bilirubin|sgot|sgpt|ast|alt)\b/i;
const MEDICATION_EVIDENCE_ALIASES = {
  levothyroxine: ['levothyroxine', 'thyroxine', 'lt4', 'l thyroxine', 'thyronorm', 'thyrowell', 'eltroxin', 'euthyrox'],
  'vitamin d3': ['vitamin d3', 'cholecalciferol', 'd rise', 'd-rise', 'd3'],
  metformin: ['metformin', 'glyciphage', 'glucophage']
};

function normalizeEvidenceText(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasEvidenceForMedicationName(name = '', evidenceText = '') {
  const normalizedName = normalizeEvidenceText(name);
  if (!normalizedName || !evidenceText) return false;

  if (evidenceText.includes(normalizedName)) return true;

  const significantTokens = normalizedName
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length >= 4);

  if (!significantTokens.length) return false;
  return significantTokens.every((token) => evidenceText.includes(token));
}

function hasPartialEvidenceForMedicationName(name = '', evidenceText = '') {
  const normalizedName = normalizeEvidenceText(name);
  if (!normalizedName || !evidenceText) return false;

  const significantTokens = normalizedName
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length >= 4);

  if (!significantTokens.length) return false;
  return significantTokens.some((token) => evidenceText.includes(token));
}

function hasMedicationAliasEvidence(name = '', evidenceText = '') {
  const normalizedName = normalizeEvidenceText(name);
  if (!normalizedName || !evidenceText) return false;

  const aliases = MEDICATION_EVIDENCE_ALIASES[normalizedName] || [];
  if (!aliases.length) return false;

  return aliases.some((alias) => {
    const normalizedAlias = normalizeEvidenceText(alias);
    if (!normalizedAlias) return false;
    return evidenceText.includes(normalizedAlias);
  });
}

function isLabLikeDosageText(value = '') {
  const normalized = String(value || '').toLowerCase().replace(/\s+/g, '');
  if (!normalized) return false;
  return LAB_DOSAGE_UNIT_PATTERN.test(normalized);
}

function isLikelyLabTerm(value = '') {
  const normalized = normalizeEvidenceText(value);
  if (!normalized) return false;
  return LIKELY_LAB_TERM_PATTERN.test(normalized);
}

function stripMedicationFormPrefix(name = '') {
  return String(name || '')
    .replace(/^\s*(?:tab(?:let)?\.?|cap(?:sule)?\.?|syp\.?|syrup|inj(?:ection)?\.?|drop(?:s)?\.?|ointment\.?|cream\.?)\s+/i, '')
    .trim();
}

function hasPrescriptionHintInDocuments(documents = []) {
  return (documents || []).some((document) => {
    const reportTag = String(document?.reportTag || '').trim();
    if (!reportTag) return false;
    return /(prescription|\brx\b|medication|medicine)/i.test(reportTag);
  });
}

function hasStructuredMedicationEvidence(item = {}) {
  const dosage = String(item?.dosage || '').trim();
  const frequency = String(item?.frequency || '').trim();
  const timing = String(item?.timing || '').trim();
  const instructions = String(item?.instructions || '').trim();
  const duration = String(item?.duration || '').trim();

  const scheduleText = `${frequency} ${timing} ${instructions}`.toLowerCase();
  const dosageText = dosage.toLowerCase();

  const hasDosePattern = /\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu|units?)\b/i.test(dosageText)
    || /\b(?:one|two|three|once|twice|thrice|\d+)\b/i.test(dosageText);

  const hasSchedulePattern = /\b(?:once|twice|thrice|daily|day|week|month|morning|night|before\s+food|after\s+food|od|bd|tid|hs)\b/i.test(scheduleText);

  const hasDurationEvidence = Number.isFinite(item?.durationDays)
    || Number.isFinite(item?.totalTablets)
    || Number.isFinite(item?.tabletsPerDose)
    || Number.isFinite(item?.timesPerDay)
    || /\b\d+\s*(?:day|days|week|weeks|month|months)\b/i.test(duration);

  return hasDosePattern || (hasSchedulePattern && hasDurationEvidence);
}

function normalizeYear(yearValue) {
  const yearNumber = Number(yearValue);
  if (!Number.isFinite(yearNumber)) return null;
  if (yearNumber >= 100) return yearNumber;
  return yearNumber >= 70 ? (1900 + yearNumber) : (2000 + yearNumber);
}

function buildValidDate(yearValue, monthValue, dayValue) {
  const year = normalizeYear(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return null;
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;

  const now = new Date();
  if (date.getFullYear() < 1990 || date.getTime() > now.getTime() + (24 * 60 * 60 * 1000)) {
    return null;
  }

  return date;
}

function parseDateFromText(value = '') {
  const text = String(value || '').replace(/[,]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return null;

  const yearFirstMatch = text.match(/\b(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})\b/);
  if (yearFirstMatch) {
    const parsed = buildValidDate(yearFirstMatch[1], yearFirstMatch[2], yearFirstMatch[3]);
    if (parsed) return parsed;
  }

  const monthNameMatch = text.match(/\b(\d{1,2})\s*(?:-|\/|\s)\s*(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s*(?:-|\/|\s)?\s*(\d{2,4})\b/i);
  if (monthNameMatch) {
    const monthLookup = {
      jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
      jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12
    };
    const monthToken = monthNameMatch[2].slice(0, 4).toLowerCase();
    const month = monthLookup[monthToken] || monthLookup[monthToken.slice(0, 3)];
    if (month) {
      const parsed = buildValidDate(monthNameMatch[3], month, monthNameMatch[1]);
      if (parsed) return parsed;
    }
  }

  const dmyMatch = text.match(/\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})\b/);
  if (dmyMatch) {
    const day = Number(dmyMatch[1]);
    const month = Number(dmyMatch[2]);
    let parsed = buildValidDate(dmyMatch[3], month, day);

    if (!parsed && day <= 12 && month <= 31) {
      parsed = buildValidDate(dmyMatch[3], day, month);
    }

    if (parsed) return parsed;
  }

  return null;
}

function extractAllDatesFromText(value = '') {
  const text = String(value || '').replace(/[,]/g, ' ');
  const collected = [];
  const seen = new Set();

  const register = (date = null) => {
    if (!date || Number.isNaN(date.getTime())) return;
    const key = date.toISOString().slice(0, 10);
    if (seen.has(key)) return;
    seen.add(key);
    collected.push(date);
  };

  let match;
  const yearFirstRegex = /\b(\d{4})[\/.\-](\d{1,2})[\/.\-](\d{1,2})\b/g;
  while ((match = yearFirstRegex.exec(text)) !== null) {
    register(buildValidDate(match[1], match[2], match[3]));
  }

  const dmyRegex = /\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})\b/g;
  while ((match = dmyRegex.exec(text)) !== null) {
    const day = Number(match[1]);
    const month = Number(match[2]);

    let parsed = buildValidDate(match[3], month, day);
    if (!parsed && day <= 12 && month <= 31) {
      parsed = buildValidDate(match[3], day, month);
    }
    register(parsed);
  }

  const monthNameRegex = /\b(\d{1,2})\s*(?:-|\/|\s)\s*(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s*(?:-|\/|\s)?\s*(\d{2,4})\b/gi;
  while ((match = monthNameRegex.exec(text)) !== null) {
    const monthLookup = {
      jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
      jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12
    };
    const monthToken = match[2].slice(0, 4).toLowerCase();
    const month = monthLookup[monthToken] || monthLookup[monthToken.slice(0, 3)];
    if (!month) continue;

    register(buildValidDate(match[3], month, match[1]));
  }

  return collected;
}

function inferClinicalReportDate(sourceText = '', fallbackDate = null) {
  const candidates = [];

  const addCandidate = (date, priority, reason) => {
    if (!date || Number.isNaN(date.getTime())) return;
    candidates.push({ date, priority, reason });
  };

  const text = String(sourceText || '').replace(/\r/g, '\n');

  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  for (const line of lines) {
    const normalizedLine = line.toLowerCase();
    const hasRegnLikeLabel = /(regn|registration)\s*[.\-:]?\s*d(?:ate|ata|te)?/.test(normalizedLine);
    const hasReportedLikeLabel = /(reported?|report)\s*[.\-:]?\s*d(?:ate|ata|te)?/.test(normalizedLine);

    if (!(hasRegnLikeLabel && hasReportedLikeLabel)) continue;

    const lineDates = extractAllDatesFromText(line);
    if (!lineDates.length) continue;

    // Most lab headers list registration/sample first and reported date second.
    addCandidate(lineDates[0], 1, 'header_regn_date');
    if (lineDates[1]) {
      addCandidate(lineDates[1], 3, 'header_reported_date');
    }
  }

  const labeledDateRules = [
    {
      priority: 1,
      pattern: /(?:sample\s*[.\-:]?\s*d(?:ate|ata|te)?|collection\s*[.\-:]?\s*d(?:ate|ata|te)?|specimen\s*[.\-:]?\s*d(?:ate|ata|te)?|date\s*of\s*collection|test\s*[.\-:]?\s*d(?:ate|ata|te)?|regn(?:istration)?\s*[.\-:]?\s*d(?:ate|ata|te)?|reg\s*[.\-:]?\s*d(?:ate|ata|te)?)\s*[:\-]?\s*([^\n]{0,120})/gi,
      reason: 'sample_or_registration_date'
    },
    {
      priority: 3,
      pattern: /(?:reported?\s*[.\-:]?\s*d(?:ate|ata|te)?|report\s*[.\-:]?\s*d(?:ate|ata|te)?)\s*[:\-]?\s*([^\n]{0,120})/gi,
      reason: 'reported_date'
    }
  ];

  for (const rule of labeledDateRules) {
    let match;
    while ((match = rule.pattern.exec(text)) !== null) {
      const parsed = parseDateFromText(match[1]);
      addCandidate(parsed, rule.priority, rule.reason);
    }
  }

  const allDates = extractAllDatesFromText(text);
  if (allDates.length > 1) {
    const earliest = [...allDates].sort((left, right) => left.getTime() - right.getTime())[0];
    addCandidate(earliest, 2, 'earliest_detected_date');
  }

  const fallbackParsed = fallbackDate ? new Date(fallbackDate) : null;
  if (fallbackParsed && !Number.isNaN(fallbackParsed.getTime())) {
    addCandidate(fallbackParsed, 4, 'llm_report_date');
  }

  if (!candidates.length) {
    return fallbackParsed && !Number.isNaN(fallbackParsed.getTime()) ? fallbackParsed : null;
  }

  candidates.sort((left, right) => {
    if (left.priority !== right.priority) return left.priority - right.priority;
    return left.date.getTime() - right.date.getTime();
  });

  return candidates[0].date;
}

function sanitizeClinicalPlan({
  medications = [],
  medicationDetails = [],
  nextVisitDate = null,
  fallbackText = '',
  sourceText = '',
  visitDate = null,
  hasPrescriptionDocumentHint = false
}) {
  const evidenceText = normalizeEvidenceText(`${fallbackText || ''}\n${sourceText || ''}`);
  const hasPrescriptionSignal = PRESCRIPTION_SIGNAL_PATTERN.test(evidenceText);
  const hasPrescriptionContext = hasPrescriptionSignal || Boolean(hasPrescriptionDocumentHint);
  const hasFollowUpSignal = FOLLOW_UP_SIGNAL_PATTERN.test(evidenceText);
  const sparseEvidenceText = evidenceText.replace(/\s+/g, '').length < 80;

  const filteredMedicationDetails = (medicationDetails || []).filter((item) => {
    const name = String(item?.name || '').trim();
    if (!name) return false;

    const hasNameEvidence = hasEvidenceForMedicationName(name, evidenceText);
    const hasAliasEvidence = hasMedicationAliasEvidence(name, evidenceText);
    const hasStrongNameEvidence = hasNameEvidence || hasAliasEvidence;
    const hasPartialNameEvidence = hasPartialEvidenceForMedicationName(name, evidenceText);
    const hasInstructionSignal = Boolean(
      String(item?.frequency || '').trim() ||
      String(item?.timing || '').trim() ||
      String(item?.instructions || '').trim() ||
      String(item?.duration || '').trim() ||
      Number.isFinite(item?.durationDays)
    );

    const dosageLooksLabLike = isLabLikeDosageText(item?.dosage || '');
    const nameLooksLabLike = isLikelyLabTerm(name);

    if (nameLooksLabLike) {
      return false;
    }

    if (dosageLooksLabLike && !hasPrescriptionContext) {
      return false;
    }

    if (!hasStrongNameEvidence) {
      if (!(
        hasPrescriptionContext
        && !dosageLooksLabLike
        && (
          hasPartialNameEvidence
          || (hasInstructionSignal && hasStructuredMedicationEvidence(item))
        )
      )) {
        return false;
      }
    }

    return true;
  });

  // OCR on image-based prescriptions can be sparse. If a prescription-tagged upload has
  // structured medication rows from LLM, keep them unless they look lab-like.
  const recoveryMedicationDetails = (sparseEvidenceText && hasPrescriptionDocumentHint)
    ? (medicationDetails || []).filter((item) => {
      const name = String(item?.name || '').trim();
      if (!name) return false;

      const nameLooksLabLike = isLikelyLabTerm(name);
      const dosageLooksLabLike = isLabLikeDosageText(item?.dosage || '');
      const hasInstructionSignal = Boolean(
        String(item?.frequency || '').trim() ||
        String(item?.timing || '').trim() ||
        String(item?.instructions || '').trim() ||
        String(item?.duration || '').trim() ||
        Number.isFinite(item?.durationDays)
      );

      if (nameLooksLabLike || dosageLooksLabLike) return false;
      return hasInstructionSignal || hasStructuredMedicationEvidence(item);
    })
    : [];

  const finalMedicationDetails = mergeMedicationDetails([
    ...filteredMedicationDetails,
    ...recoveryMedicationDetails
  ]);

  const detailNames = new Set(
    finalMedicationDetails
      .map((item) => String(item?.name || '').trim())
      .filter(Boolean)
      .map((name) => name.toLowerCase())
  );

  const filteredMedications = uniqueNonEmpty([
    ...(medications || []),
    ...finalMedicationDetails.map((item) => item.name)
  ]).filter((name) => {
    const hasNameEvidence = hasEvidenceForMedicationName(name, evidenceText);
    const hasAliasEvidence = hasMedicationAliasEvidence(name, evidenceText);
    const hasStrongNameEvidence = hasNameEvidence || hasAliasEvidence;
    const hasPartialNameEvidence = hasPartialEvidenceForMedicationName(name, evidenceText);
    const nameLooksLabLike = isLikelyLabTerm(name);
    const includedInDetails = detailNames.has(String(name || '').trim().toLowerCase());

    if (nameLooksLabLike) {
      return false;
    }

    if (!hasStrongNameEvidence && !includedInDetails && !(hasPrescriptionContext && hasPartialNameEvidence)) {
      return false;
    }

    return true;
  });

  const recoveryMedicationNames = (sparseEvidenceText && hasPrescriptionDocumentHint)
    ? uniqueNonEmpty(medications).filter((name) => {
      const normalized = String(name || '').trim();
      if (!normalized) return false;
      if (isLikelyLabTerm(normalized)) return false;
      return true;
    })
    : [];

  const finalMedications = uniqueNonEmpty([
    ...filteredMedications,
    ...recoveryMedicationNames,
    ...finalMedicationDetails.map((item) => item.name)
  ]);

  let sanitizedNextVisitDate = nextVisitDate || null;
  if (sanitizedNextVisitDate && visitDate) {
    const anchor = new Date(visitDate);
    if (!Number.isNaN(anchor.getTime()) && sanitizedNextVisitDate.getTime() <= anchor.getTime()) {
      sanitizedNextVisitDate = null;
    }
  }

  if (sanitizedNextVisitDate && !hasFollowUpSignal && !hasPrescriptionSignal) {
    sanitizedNextVisitDate = null;
  }

  return {
    medications: finalMedications,
    medicationDetails: finalMedicationDetails,
    nextVisitDate: sanitizedNextVisitDate
  };
}

function sanitizeEvidenceBackedFields(normalized = {}, options = {}) {
  const evidenceText = ` ${normalizeEvidenceText(`${options.fallbackText || ''}\n${options.sourceText || ''}`)} `;
  const evidenceRequiredFields = {
    weight: ['weight', 'wt'],
    height: ['height', 'ht'],
    bmi: ['bmi', 'body mass index']
  };

  const shouldKeepField = (fieldKey) => {
    const aliases = evidenceRequiredFields[fieldKey];
    if (!aliases) return true;
    return aliases.some((alias) => evidenceText.includes(` ${alias} `));
  };

  const dropSet = new Set(
    Object.keys(evidenceRequiredFields).filter((fieldKey) => (
      Object.prototype.hasOwnProperty.call(normalized.normalizedFields || {}, fieldKey)
      && !shouldKeepField(fieldKey)
    ))
  );

  if (!dropSet.size) {
    return normalized;
  }

  const normalizedFields = { ...(normalized.normalizedFields || {}) };
  const numericFields = { ...(normalized.numericFields || {}) };

  for (const fieldKey of dropSet) {
    delete normalizedFields[fieldKey];
    delete numericFields[fieldKey];
  }

  const parsedMetrics = (normalized.parsedMetrics || []).filter((metric) => !dropSet.has(metric?.name));

  return {
    ...normalized,
    normalizedFields,
    numericFields,
    parsedMetrics,
    importantFindings: parsedMetrics.slice(0, 8)
  };
}

function buildExtractionPrompt({ combinedText = '', fallbackText = '', documentLabels = [], catalogPromptSection = '' }) {
  return [
    'You are a medical data extraction system.',
    '',
    'Extract structured medical information from the full combined medical context.',
    'The input may contain multiple uploaded files and prescription notes.',
    'Use the exact field wording from the source when possible. Do not silently merge blood sugar context if it is ambiguous.',
    'When multiple reports are provided, include the UNION of distinct tests from every report. Do not drop tests that appear in only one document.',
    '',
    'Return ONLY valid JSON.',
    '',
    'Format:',
    '{',
    '"diagnosis": "...",',
    '"specialization": "...",',
    '"registrationDate": "YYYY-MM-DD",',
    '"reportedDate": "YYYY-MM-DD",',
    '"reportDate": "YYYY-MM-DD",',
    '"fields": {',
    '  "field_name_from_source": {',
    '    "value": 0,',
    '    "unit": "",',
    '    "reference": "",',
    '    "status": "high|low|normal|unknown"',
    '  }',
    '},',
    '"medications": ["Medicine Name"],',
    '"medicationDetails": [{',
    '  "name": "",',
    '  "dosage": "",',
    '  "frequency": "",',
    '  "timing": "",',
    '  "duration": "",',
    '  "durationDays": 0,',
    '  "totalTablets": 0,',
    '  "tabletsPerDose": 0,',
    '  "timesPerDay": 0,',
    '  "instructions": ""',
    '}],',
    '"nextVisit": "YYYY-MM-DD",',
    '"nextVisitInDays": 0',
    '}',
    '',
    'Rules:',
    '- Use numeric values where applicable.',
    '- If report or sample date is visible, include it in reportDate.',
    '- If both registration/test date and reported date are present, set registrationDate and reportedDate separately, and set reportDate to registration/test date.',
    '- If prescription notes mention medicines, dosage, after food/before food, morning/night, or duration, capture them in medicationDetails.',
    '- Add medicine names only when they are explicitly present in report text or prescription context. Do not guess medicine names.',
    '- If next visit is relative such as "after 1 week", fill nextVisitInDays.',
    '- Do not invent missing information.',
    '- Never infer medications from lab values unless explicitly present in prescription context.',
    '',
    buildCanonicalPromptSection(),
    '',
    catalogPromptSection,
    '',
    `Uploaded documents: ${documentLabels.join(', ') || 'none'}`,
    '',
    'DOCUMENT CONTENT:',
    combinedText || '',
    '',
    'PRESCRIPTION OR FALLBACK NOTES:',
    fallbackText || ''
  ].join('\n');
}

function detectMimeType(filePath = '') {
  const ext = path.extname(filePath || '').toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.pdf') return 'application/pdf';
  return 'application/octet-stream';
}

async function createPdfPreviewImage(filePath = '') {
  if (!filePath || path.extname(filePath).toLowerCase() !== '.pdf' || !fs.existsSync(filePath)) {
    return '';
  }

  const outputDir = path.join(os.tmpdir(), 'medical-pdf-previews');
  fs.mkdirSync(outputDir, { recursive: true });

  const previewBaseName = `${path.basename(filePath, '.pdf')}-${crypto.createHash('md5').update(filePath).digest('hex')}`;

  try {
    await execFileAsync('/usr/bin/qlmanage', ['-t', '-s', '1000', '-o', outputDir, filePath], {
      timeout: 15000
    });
  } catch {
    return '';
  }

  const previewPath = path.join(outputDir, `${previewBaseName}.pdf.png`);
  if (fs.existsSync(previewPath)) return previewPath;

  const fallbackName = `${path.basename(filePath)}.png`;
  const fallbackPath = path.join(outputDir, fallbackName);
  return fs.existsSync(fallbackPath) ? fallbackPath : '';
}

function buildModelImage(filePath = '') {
  if (!filePath || !fs.existsSync(filePath)) return null;
  if (!IMAGE_EXTENSIONS.has(path.extname(filePath).toLowerCase())) return null;
  return {
    data: fs.readFileSync(filePath).toString('base64'),
    mimeType: detectMimeType(filePath)
  };
}

async function collectDocumentSources(documents = []) {
  const textSections = [];
  const images = [];
  const labels = [];

  for (const document of documents || []) {
    if (!document?.filePath) continue;
    const label = document.reportTag || document.category || path.basename(document.filePath);
    labels.push(label);

    const extractedText = await extractDocumentText(document.filePath, { maxChars: Math.floor(AI_RUNTIME_CONFIG.maxInputChars / Math.max(documents.length || 1, 1)) });
    if (extractedText) {
      textSections.push(`### ${label}\n${extractedText}`);
      continue;
    }

    const mimeType = detectMimeType(document.filePath);
    const previewPath = mimeType === 'application/pdf'
      ? await createPdfPreviewImage(document.filePath)
      : document.filePath;
    const image = buildModelImage(previewPath);
    if (image) {
      images.push(image);
      textSections.push(`### ${label}\n[visual document attached]`);
    }
  }

  return {
    combinedText: textSections.join('\n\n').slice(0, AI_RUNTIME_CONFIG.maxInputChars),
    textSections,
    images,
    labels
  };
}

function computeMedicationDurations(medicationDetails = [], visitDate = null) {
  const startDate = visitDate ? new Date(visitDate) : new Date();
  return (medicationDetails || []).map((item) => {
    const cleanedName = stripMedicationFormPrefix(item.name);
    const normalized = {
      name: canonicalizeMedicationName(cleanedName),
      dosage: item.dosage || '',
      frequency: item.frequency || '',
      duration: item.duration || '',
      timing: item.timing || '',
      instructions: item.instructions || '',
      durationDays: Number.isFinite(item.durationDays) ? item.durationDays : null,
      totalTablets: Number.isFinite(item.totalTablets) ? item.totalTablets : null,
      tabletsPerDose: Number.isFinite(item.tabletsPerDose) ? item.tabletsPerDose : null,
      timesPerDay: Number.isFinite(item.timesPerDay) ? item.timesPerDay : null
    };

    if (
      normalized.durationDays == null &&
      normalized.totalTablets != null &&
      normalized.tabletsPerDose != null &&
      normalized.timesPerDay != null &&
      normalized.tabletsPerDose > 0 &&
      normalized.timesPerDay > 0
    ) {
      normalized.durationDays = Math.max(
        1,
        Math.floor(normalized.totalTablets / (normalized.tabletsPerDose * normalized.timesPerDay))
      );
    }

    normalized.startDate = startDate;
    normalized.endDate = normalized.durationDays
      ? new Date(startDate.getTime() + normalized.durationDays * 24 * 60 * 60 * 1000)
      : null;

    return normalized;
  });
}

function resolveNextVisitDate(validatedData = {}, visitDate = null) {
  if (validatedData.nextVisit) return validatedData.nextVisit;
  if (validatedData.nextVisitInDays == null) return null;

  const anchor = visitDate ? new Date(visitDate) : new Date();
  return new Date(anchor.getTime() + validatedData.nextVisitInDays * 24 * 60 * 60 * 1000);
}

function uniqueNonEmpty(values = []) {
  return Array.from(new Set((values || []).map((value) => String(value || '').trim()).filter(Boolean)));
}

function fieldValueScore(value) {
  if (value == null) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? 4 : 0;
  if (typeof value === 'boolean') return 1;
  if (typeof value === 'string') return value.trim().length ? 2 : 0;
  if (typeof value !== 'object' || Array.isArray(value)) return 0;

  let score = 0;
  if (value.value != null && String(value.value).trim() !== '') score += 4;
  if (value.unit && String(value.unit).trim()) score += 1;
  if (value.reference && String(value.reference).trim()) score += 1;
  if (value.status && String(value.status).trim()) score += 1;
  return score;
}

function mergeFieldMaps(current = {}, incoming = {}) {
  const merged = { ...(current || {}) };

  for (const [fieldKey, candidate] of Object.entries(incoming || {})) {
    if (!(fieldKey in merged)) {
      merged[fieldKey] = candidate;
      continue;
    }

    const existing = merged[fieldKey];
    if (fieldValueScore(candidate) > fieldValueScore(existing)) {
      merged[fieldKey] = candidate;
    }
  }

  return merged;
}

function normalizeMedicationToken(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function medicationDetailCompleteness(item = {}) {
  let score = 0;
  if (normalizeMedicationToken(item.name)) score += 5;
  if (normalizeMedicationToken(item.dosage)) score += 4;
  if (normalizeMedicationToken(item.frequency)) score += 3;
  if (normalizeMedicationToken(item.timing)) score += 2;
  if (normalizeMedicationToken(item.instructions)) score += 2;
  if (normalizeMedicationToken(item.duration)) score += 2;
  if (Number.isFinite(item.durationDays)) score += 3;
  if (Number.isFinite(item.totalTablets)) score += 1;
  if (Number.isFinite(item.tabletsPerDose)) score += 1;
  if (Number.isFinite(item.timesPerDay)) score += 1;
  if (item.endDate) score += 1;
  return score;
}

function choosePreferredText(existingValue = '', candidateValue = '') {
  const existing = String(existingValue || '').trim();
  const candidate = String(candidateValue || '').trim();
  if (!candidate) return existing;
  if (!existing) return candidate;

  const existingWeight = normalizeMedicationToken(existing).length;
  const candidateWeight = normalizeMedicationToken(candidate).length;
  return candidateWeight > existingWeight ? candidate : existing;
}

function choosePreferredNumber(existingValue, candidateValue) {
  const hasExisting = Number.isFinite(existingValue);
  const hasCandidate = Number.isFinite(candidateValue);
  if (!hasExisting && !hasCandidate) return null;
  if (!hasExisting) return candidateValue;
  if (!hasCandidate) return existingValue;
  return Math.max(existingValue, candidateValue);
}

function choosePreferredDate(existingValue, candidateValue, mode = 'earliest') {
  const existingDate = existingValue ? new Date(existingValue) : null;
  const candidateDate = candidateValue ? new Date(candidateValue) : null;
  const existingValid = existingDate && !Number.isNaN(existingDate.getTime());
  const candidateValid = candidateDate && !Number.isNaN(candidateDate.getTime());

  if (!existingValid && !candidateValid) return null;
  if (!existingValid) return candidateDate;
  if (!candidateValid) return existingDate;

  if (mode === 'latest') {
    return candidateDate.getTime() > existingDate.getTime() ? candidateDate : existingDate;
  }

  return candidateDate.getTime() < existingDate.getTime() ? candidateDate : existingDate;
}

function areMedicationEntriesMergeable(left = {}, right = {}) {
  const leftName = normalizeMedicationToken(left?.name || '');
  const rightName = normalizeMedicationToken(right?.name || '');
  if (!leftName || !rightName || leftName !== rightName) return false;

  const leftDosage = normalizeMedicationToken(left?.dosage || '');
  const rightDosage = normalizeMedicationToken(right?.dosage || '');
  if (!leftDosage || !rightDosage) return true;
  return leftDosage === rightDosage;
}

function mergeMedicationEntry(existing = {}, candidate = {}) {
  const betterBase = medicationDetailCompleteness(candidate) > medicationDetailCompleteness(existing)
    ? candidate
    : existing;
  const weaker = betterBase === candidate ? existing : candidate;

  const merged = {
    ...betterBase,
    name: choosePreferredText(stripMedicationFormPrefix(betterBase.name), stripMedicationFormPrefix(weaker.name)),
    dosage: choosePreferredText(betterBase.dosage, weaker.dosage),
    frequency: choosePreferredText(betterBase.frequency, weaker.frequency),
    duration: choosePreferredText(betterBase.duration, weaker.duration),
    timing: choosePreferredText(betterBase.timing, weaker.timing),
    instructions: choosePreferredText(betterBase.instructions, weaker.instructions),
    durationDays: choosePreferredNumber(betterBase.durationDays, weaker.durationDays),
    totalTablets: choosePreferredNumber(betterBase.totalTablets, weaker.totalTablets),
    tabletsPerDose: choosePreferredNumber(betterBase.tabletsPerDose, weaker.tabletsPerDose),
    timesPerDay: choosePreferredNumber(betterBase.timesPerDay, weaker.timesPerDay),
    startDate: choosePreferredDate(betterBase.startDate, weaker.startDate, 'earliest'),
    endDate: choosePreferredDate(betterBase.endDate, weaker.endDate, 'latest')
  };

  if (merged.startDate && merged.endDate && merged.startDate.getTime() > merged.endDate.getTime()) {
    merged.endDate = null;
  }

  return merged;
}

function mergeMedicationDetails(items = []) {
  const merged = [];

  for (const item of items || []) {
    if (!item || typeof item !== 'object') continue;

    const normalizedItem = {
      ...item,
      name: canonicalizeMedicationName(stripMedicationFormPrefix(item.name))
    };

    if (!normalizeMedicationToken(normalizedItem.name)) continue;

    const existingIndex = merged.findIndex((existingItem) => areMedicationEntriesMergeable(existingItem, normalizedItem));
    if (existingIndex < 0) {
      merged.push(normalizedItem);
      continue;
    }

    merged[existingIndex] = mergeMedicationEntry(merged[existingIndex], normalizedItem);
  }

  const bySignature = new Map();
  for (const item of merged) {
    const signature = [
      normalizeMedicationToken(item.name),
      normalizeMedicationToken(item.dosage),
      normalizeMedicationToken(item.frequency),
      normalizeMedicationToken(item.timing),
      normalizeMedicationToken(item.instructions)
    ].join('|');

    const existing = bySignature.get(signature);
    if (!existing || medicationDetailCompleteness(item) > medicationDetailCompleteness(existing)) {
      bySignature.set(signature, item);
    }
  }

  return Array.from(bySignature.values());
}

function mergeValidatedPayloads(payloads = []) {
  const merged = {
    diagnosis: '',
    specialization: '',
    reportDate: null,
    fields: {},
    medications: [],
    medicationDetails: [],
    nextVisit: null,
    nextVisitInDays: null
  };

  for (const payload of payloads || []) {
    if (!payload || typeof payload !== 'object') continue;

    if (!merged.diagnosis && payload.diagnosis) {
      merged.diagnosis = payload.diagnosis;
    }

    if (!merged.specialization && payload.specialization) {
      merged.specialization = payload.specialization;
    }

    if (!merged.reportDate && payload.reportDate) {
      merged.reportDate = payload.reportDate;
    }

    if (!merged.nextVisit && payload.nextVisit) {
      merged.nextVisit = payload.nextVisit;
    }

    if (merged.nextVisitInDays == null && Number.isFinite(payload.nextVisitInDays)) {
      merged.nextVisitInDays = payload.nextVisitInDays;
    }

    merged.fields = mergeFieldMaps(merged.fields, payload.fields || {});
    merged.medications.push(...(payload.medications || []));
    merged.medicationDetails.push(...(payload.medicationDetails || []));
  }

  merged.medications = uniqueNonEmpty(merged.medications);
  merged.medicationDetails = mergeMedicationDetails(merged.medicationDetails);
  return merged;
}

function buildCompactCombinedText(sourceBundle = {}, maxChars = 3600) {
  const textSections = Array.isArray(sourceBundle.textSections)
    ? sourceBundle.textSections
    : [];

  if (!textSections.length) {
    return String(sourceBundle.combinedText || '').slice(0, maxChars);
  }

  const docCount = Math.max(textSections.length, 1);
  const perDocBudget = Math.max(500, Math.floor(maxChars / docCount));
  return textSections
    .map((section) => String(section || '').slice(0, perDocBudget))
    .join('\n\n')
    .slice(0, maxChars);
}

async function validateOrRepairExtraction(rawResponse = '') {
  const initialValidation = validateMedicalExtractionResponse(rawResponse);
  if (initialValidation.valid) {
    return {
      valid: true,
      data: initialValidation.data,
      rawResponse,
      repaired: false,
      errors: []
    };
  }

  const repaired = await repairMedicalExtractionJson(rawResponse);
  const repairedValidation = repaired?.content
    ? validateMedicalExtractionResponse(repaired.content)
    : { valid: false, errors: ['LLM repair returned no content'] };

  if (repairedValidation.valid) {
    return {
      valid: true,
      data: repairedValidation.data,
      rawResponse: repaired.content,
      repaired: true,
      errors: []
    };
  }

  return {
    valid: false,
    data: null,
    rawResponse,
    repaired: false,
    errors: uniqueNonEmpty([
      ...(initialValidation.errors || []),
      ...((repairedValidation.errors || []).map((error) => `repair: ${error}`))
    ])
  };
}

function buildExtractionSuccessResponse({ normalized, rawResponse, validatedData }) {
  const requiresClarification = Array.isArray(normalized.ambiguities) && normalized.ambiguities.length > 0;

  return {
    success: !requiresClarification,
    status: requiresClarification ? 'clarification_required' : 'completed',
    rawResponse,
    diagnosis: normalized.diagnosis,
    specialization: normalized.specialization,
    reportDate: normalized.reportDate,
    medications: normalized.medications,
    medicationDetails: normalized.medicationDetails,
    nextVisitDate: normalized.nextVisitDate,
    normalizedFields: normalized.normalizedFields,
    numericFields: normalized.numericFields,
    parsedMetrics: normalized.parsedMetrics,
    importantFindings: normalized.importantFindings,
    unknownFields: normalized.unknownFields,
    conflicts: normalized.conflicts,
    ambiguities: normalized.ambiguities,
    validationErrors: [],
    validatedData
  };
}

async function requestMedicalExtractionFromSources({ documents = [], fallbackText = '' }) {
  const sourceBundle = await collectDocumentSources(documents);
  const catalogPromptSection = await buildCatalogPromptSection();
  const localFallbackEnabled = AI_RUNTIME_CONFIG.provider === 'local' || AI_RUNTIME_CONFIG.fallbackProvider === 'local';
  const shouldCompactPrompt = localFallbackEnabled && (documents.length > 1 || sourceBundle.images.length > 1);
  const compactCatalogSection = shouldCompactPrompt
    ? String(catalogPromptSection || '').split('\n').slice(0, 28).join('\n')
    : catalogPromptSection;
  const combinedText = shouldCompactPrompt
    ? buildCompactCombinedText(sourceBundle, Math.min(AI_RUNTIME_CONFIG.maxInputChars, 3600))
    : sourceBundle.combinedText;
  const fallbackTextLimit = shouldCompactPrompt
    ? 1200
    : Math.floor(AI_RUNTIME_CONFIG.maxInputChars / 2);
  const prompt = buildExtractionPrompt({
    combinedText,
    fallbackText: String(fallbackText || '').slice(0, fallbackTextLimit),
    documentLabels: sourceBundle.labels,
    catalogPromptSection: compactCatalogSection
  });

  const providerResult = await callModelGenerate({
    prompt,
    images: sourceBundle.images
  });

  return {
    ...providerResult,
    sourceText: sourceBundle.combinedText
  };
}

async function repairMedicalExtractionJson(rawResponse = '') {
  const prompt = [
    'You are a JSON repair system.',
    'Convert the following model output into valid JSON only.',
    'Do not add explanations.',
    'Preserve the original medical meaning.',
    'Return one JSON object only.',
    '',
    rawResponse
  ].join('\n');

  return callModelGenerate({ prompt });
}

async function extractBySplittingDocuments(options = {}, traceId = '') {
  const documents = options.documents || [];
  if (documents.length <= 1) {
    return { success: false, errors: [] };
  }

  aiTrace('structured_extraction_split_retry_start', {
    traceId,
    documentCount: documents.length
  });

  const successfulPayloads = [];
  const documentErrors = [];

  for (let index = 0; index < documents.length; index += 1) {
    const document = documents[index];
    const label = document?.reportTag || document?.category || path.basename(document?.filePath || '') || `document_${index + 1}`;

    const docResult = await requestMedicalExtractionFromSources({
      documents: [document],
      fallbackText: index === 0 ? options.fallbackText : '',
      visitDate: options.visitDate
    });

    const docRawResponse = docResult?.content || '';
    const docProvider = docResult?.providerUsed || AI_RUNTIME_CONFIG.provider;
    if (!docRawResponse) {
      documentErrors.push(`${label}: ${docResult?.error || 'LLM returned no content'}`);
      continue;
    }

    const docValidation = await validateOrRepairExtraction(docRawResponse);
    if (!docValidation.valid) {
      documentErrors.push(...(docValidation.errors || []).map((error) => `${label}: ${error}`));
      continue;
    }

    successfulPayloads.push({
      label,
      provider: docProvider,
      repaired: docValidation.repaired,
      data: docValidation.data
    });
  }

  if (!successfulPayloads.length) {
    aiTrace('structured_extraction_split_retry_failed', {
      traceId,
      errorCount: documentErrors.length
    });
    return {
      success: false,
      errors: documentErrors
    };
  }

  const mergedPayload = mergeValidatedPayloads(successfulPayloads.map((item) => item.data));
  const mergedValidation = validateMedicalExtractionResponse(mergedPayload);
  if (!mergedValidation.valid) {
    const mergedErrors = uniqueNonEmpty([
      ...documentErrors,
      ...(mergedValidation.errors || [])
    ]);
    aiTrace('structured_extraction_split_retry_failed', {
      traceId,
      errorCount: mergedErrors.length
    });
    return {
      success: false,
      errors: mergedErrors
    };
  }

  const mergedRawResponse = JSON.stringify({
    strategy: 'per_document_merge',
    mergedDocumentCount: successfulPayloads.length,
    documents: successfulPayloads.map((item) => ({
      label: item.label,
      provider: item.provider,
      repaired: item.repaired,
      fieldCount: Object.keys(item.data?.fields || {}).length
    }))
  });

  aiTrace('structured_extraction_split_retry_success', {
    traceId,
    mergedDocumentCount: successfulPayloads.length,
    mergedFieldCount: Object.keys(mergedValidation.data?.fields || {}).length
  });

  return {
    success: true,
    validatedData: mergedValidation.data,
    rawResponse: mergedRawResponse,
    repaired: successfulPayloads.some((item) => item.repaired),
    errors: documentErrors
  };
}

async function normalizeValidatedMedicalData(validatedData = {}, options = {}) {
  const normalizedRaw = await normalizeFieldEntriesWithCatalog(
    validatedData.fields,
    options.clarificationSelections || {}
  );
  const normalized = sanitizeEvidenceBackedFields(normalizedRaw, options);
  const diagnosis = canonicalizeDiagnosis(validatedData.diagnosis);
  const specialization = canonicalizeSpecialization(validatedData.specialization);
  const medicationDetails = mergeMedicationDetails(
    computeMedicationDurations(validatedData.medicationDetails, options.visitDate)
  );
  const medications = Array.from(new Set([
    ...(validatedData.medications || []).map((item) => canonicalizeMedicationName(item)),
    ...medicationDetails.map((item) => item.name)
  ].filter(Boolean)));
  const nextVisitDate = resolveNextVisitDate(validatedData, options.visitDate);
  const sanitizedPlan = sanitizeClinicalPlan({
    medications,
    medicationDetails,
    nextVisitDate,
    fallbackText: options.fallbackText || '',
    sourceText: options.sourceText || '',
    visitDate: options.visitDate || null,
    hasPrescriptionDocumentHint: Boolean(options.hasPrescriptionDocumentHint)
  });

  const llmPreferredDate =
    validatedData.registrationDate
    || normalized.reportDate
    || validatedData.reportDate
    || validatedData.reportedDate
    || null;

  const inferredReportDate = inferClinicalReportDate(options.sourceText || '', llmPreferredDate);

  return {
    diagnosis,
    specialization,
    reportDate: inferredReportDate,
    normalizedFields: normalized.normalizedFields,
    numericFields: normalized.numericFields,
    parsedMetrics: normalized.parsedMetrics,
    importantFindings: normalized.importantFindings,
    unknownFields: normalized.unknownFields,
    conflicts: normalized.conflicts,
    ambiguities: normalized.ambiguities,
    medications: sanitizedPlan.medications,
    medicationDetails: sanitizedPlan.medicationDetails,
    nextVisitDate: sanitizedPlan.nextVisitDate
  };
}

async function extractStructuredMedicalData(options = {}) {
  const traceId = createTraceId('ext');
  aiTrace('structured_extraction_start', {
    traceId,
    provider: AI_RUNTIME_CONFIG.provider,
    documentCount: (options.documents || []).length,
    hasFallbackText: Boolean(options.fallbackText)
  });

  const result = await requestMedicalExtractionFromSources(options);
  const activeProvider = result?.providerUsed || AI_RUNTIME_CONFIG.provider;
  const rawResponse = result?.content || '';
  const sourceText = result?.sourceText || '';
  const hasPrescriptionDocumentHint = hasPrescriptionHintInDocuments(options.documents || []);
  const providerError = result?.error || '';

  if (!rawResponse) {
    aiTrace('structured_extraction_failed', {
      traceId,
      provider: activeProvider,
      stage: 'provider_response',
      reason: (providerError || 'empty_content').slice(0, 160)
    });
    return {
      success: false,
      status: 'failed',
      rawResponse: '',
      validationErrors: [providerError || 'LLM extraction returned no content'],
      normalizedFields: {},
      numericFields: {},
      medications: [],
      medicationDetails: [],
      unknownFields: [],
      conflicts: [],
      ambiguities: []
    };
  }

  let parsed = await validateOrRepairExtraction(rawResponse);
  let parsedFromSplitRetry = false;

  if (!parsed.valid) {
    const splitRetry = await extractBySplittingDocuments(options, traceId);
    if (splitRetry.success) {
      parsed = {
        valid: true,
        data: splitRetry.validatedData,
        rawResponse: splitRetry.rawResponse,
        repaired: splitRetry.repaired,
        errors: []
      };
      parsedFromSplitRetry = true;
    } else {
      const combinedErrors = uniqueNonEmpty([
        ...(parsed.errors || []),
        ...(splitRetry.errors || [])
      ]);

      aiTrace('structured_extraction_failed', {
        traceId,
        provider: activeProvider,
        stage: 'validation',
        errorCount: combinedErrors.length
      });
      return {
        success: false,
        status: 'failed',
        rawResponse,
        validationErrors: combinedErrors.length ? combinedErrors : ['Medical extraction validation failed'],
        normalizedFields: {},
        numericFields: {},
        medications: [],
        medicationDetails: [],
        unknownFields: [],
        conflicts: [],
        ambiguities: []
      };
    }
  }

  const shouldRefineWithSplitMerge =
    !parsedFromSplitRetry
    && (options.documents || []).length > 1
    && (activeProvider === 'local' || AI_RUNTIME_CONFIG.provider === 'local' || AI_RUNTIME_CONFIG.fallbackProvider === 'local');

  if (shouldRefineWithSplitMerge) {
    const splitRetry = await extractBySplittingDocuments(options, traceId);
    if (splitRetry.success) {
      const mergedPayload = mergeValidatedPayloads([parsed.data, splitRetry.validatedData]);
      const mergedValidation = validateMedicalExtractionResponse(mergedPayload);

      if (mergedValidation.valid) {
        aiTrace('structured_extraction_multidoc_merge', {
          traceId,
          combinedFieldCount: Object.keys(parsed.data?.fields || {}).length,
          splitFieldCount: Object.keys(splitRetry.validatedData?.fields || {}).length,
          mergedFieldCount: Object.keys(mergedValidation.data?.fields || {}).length
        });

        parsed = {
          ...parsed,
          data: mergedValidation.data,
          repaired: parsed.repaired || splitRetry.repaired,
          rawResponse: parsed.rawResponse || splitRetry.rawResponse
        };
      } else {
        aiTrace('structured_extraction_multidoc_merge_failed', {
          traceId,
          errorCount: (mergedValidation.errors || []).length
        });
      }
    } else {
      aiTrace('structured_extraction_multidoc_merge_skipped', {
        traceId,
        reason: (splitRetry.errors || []).slice(0, 2).join(' | ').slice(0, 200)
      });
    }
  }

  const normalized = await normalizeValidatedMedicalData(parsed.data, {
    ...options,
    sourceText,
    hasPrescriptionDocumentHint
  });
  const requiresClarification = Array.isArray(normalized.ambiguities) && normalized.ambiguities.length > 0;

  aiTrace(requiresClarification ? 'structured_extraction_clarification_required' : 'structured_extraction_complete', {
    traceId,
    provider: activeProvider,
    normalizedFieldCount: Object.keys(normalized.normalizedFields || {}).length,
    numericFieldCount: Object.keys(normalized.numericFields || {}).length,
    ambiguityCount: (normalized.ambiguities || []).length,
    repairedJson: parsed.repaired
  });

  return buildExtractionSuccessResponse({
    normalized,
    rawResponse: parsed.rawResponse,
    validatedData: parsed.data
  });
}

module.exports = {
  extractStructuredMedicalData,
  normalizeValidatedMedicalData
};
