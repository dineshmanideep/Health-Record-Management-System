const {
  FIELD_DEFINITIONS,
  normalizeLookup,
  toStableCamelCase,
  getCanonicalFieldDefinition
} = require('./medicalCanonicalization');
const { resolveFieldsWithLLM } = require('./medicalFieldResolverService');

const STANDARD_FIELD_ALIASES = FIELD_DEFINITIONS.reduce((acc, definition) => {
  (definition.aliases || []).forEach((alias) => {
    acc[normalizeLookup(alias)] = definition.canonical;
  });
  acc[normalizeLookup(definition.canonical)] = definition.canonical;
  return acc;
}, {});

const HEALTH_METRIC_KEY_MAP = {
  bloodSugar: 'bloodSugar',
  bloodPressureSystolic: 'bloodPressureSystolic',
  bloodPressureDiastolic: 'bloodPressureDiastolic',
  heartRate: 'heartRate',
  temperature: 'temperature',
  weight: 'weight',
  height: 'height',
  thyroidTSH: 'thyroidTSH'
};

const FIELD_PRIORITY = {
  thyroidTSH: 100,
  thyroidTPOAntibodies: 96,
  thyroidFreeT4: 95,
  thyroidT4: 94,
  thyroidFreeT3: 93,
  thyroidT3: 92,
  hbA1c: 90,
  bloodSugar: 89,
  bloodPressureSystolic: 88,
  bloodPressureDiastolic: 87,
  heartRate: 86,
  spo2: 85,
  temperature: 84,
  weight: 70,
  height: 69,
  bmi: 68
};

function normalizeLookupKey(key = '') {
  return normalizeLookup(key);
}

function parseDateValue(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toUsableValue(value) {
  if (value == null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'boolean') return value;

  if (Array.isArray(value)) {
    const compact = value
      .map((item) => toUsableValue(item))
      .filter((item) => item !== null);
    return compact.length ? compact : null;
  }

  if (typeof value === 'object') {
    return null;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  const normalized = raw.replace(/,/g, '');
  if (/^-?\d+(?:\.\d+)?$/.test(normalized)) {
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : raw;
  }

  return raw;
}

function extractNumericCandidate(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const raw = String(value || '').replace(/,/g, ' ').trim();
  if (!raw) return null;
  const match = raw.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseBloodPressureValue(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return { systolic: value, diastolic: null };
  }

  const match = String(value || '').match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
  if (!match) return null;

  return {
    systolic: Number(match[1]),
    diastolic: Number(match[2])
  };
}

function parseReferenceRange(reference = '') {
  const raw = String(reference || '').trim();
  if (!raw) return { reference: '', min: null, max: null };

  const lessThanMatch = raw.match(/<\s*(-?\d+(?:\.\d+)?)/);
  if (lessThanMatch) {
    return {
      reference: raw,
      min: null,
      max: Number(lessThanMatch[1])
    };
  }

  const greaterThanMatch = raw.match(/>\s*(-?\d+(?:\.\d+)?)/);
  if (greaterThanMatch) {
    return {
      reference: raw,
      min: Number(greaterThanMatch[1]),
      max: null
    };
  }

  const rangeCandidates = [];
  const rangeRegex = /(-?\d+(?:\.\d+)?)\s*(?:to|–|-)\s*(-?\d+(?:\.\d+)?)/gi;
  let rangeMatch;

  while ((rangeMatch = rangeRegex.exec(raw)) !== null) {
    const left = Number(rangeMatch[1]);
    const right = Number(rangeMatch[2]);
    if (!Number.isFinite(left) || !Number.isFinite(right)) continue;

    const min = Math.min(left, right);
    const max = Math.max(left, right);
    const contextStart = Math.max(0, rangeMatch.index - 30);
    const contextEnd = Math.min(raw.length, rangeMatch.index + rangeMatch[0].length + 30);
    const context = raw.slice(contextStart, contextEnd).toLowerCase();
    const ageContext = /(year|years|yr|week|weeks|day|days|month|months|trimester|pregnan|pediatric|paediatric|adult|age|cord blood)/i.test(context);

    rangeCandidates.push({ min, max, ageContext, index: rangeMatch.index });
  }

  if (rangeCandidates.length) {
    const preferred = rangeCandidates.find((candidate) => !candidate.ageContext) || rangeCandidates[0];
    return {
      reference: raw,
      min: preferred.min,
      max: preferred.max
    };
  }

  const matches = raw.match(/-?\d+(?:\.\d+)?/g) || [];
  if (matches.length >= 2) {
    const hasAgeContext = /(year|years|yr|week|weeks|day|days|month|months|trimester|pregnan|pediatric|paediatric|adult|age|cord blood)/i.test(raw);
    if (hasAgeContext && matches.length > 4) {
      return {
        reference: raw,
        min: null,
        max: null
      };
    }

    const min = Number(matches[0]);
    const max = Number(matches[1]);
    return {
      reference: raw,
      min: Number.isFinite(min) ? min : null,
      max: Number.isFinite(max) ? max : null
    };
  }

  return { reference: raw, min: null, max: null };
}

function deriveStatus({ rawStatus, numericValue, referenceMin, referenceMax }) {
  if (typeof numericValue === 'number' && Number.isFinite(numericValue)) {
    if (referenceMin != null && numericValue < referenceMin) return 'low';
    if (referenceMax != null && numericValue > referenceMax) return 'high';
    if (referenceMin != null || referenceMax != null) return 'normal';
    return 'unknown';
  }

  const normalizedStatus = String(rawStatus || '').trim().toLowerCase();
  if (normalizedStatus.includes('high') || normalizedStatus.includes('above')) return 'high';
  if (normalizedStatus.includes('low') || normalizedStatus.includes('below')) return 'low';
  if (normalizedStatus.includes('normal') || normalizedStatus.includes('within')) return 'normal';

  return 'unknown';
}

function extractFieldDescriptor(rawValue) {
  if (rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)) {
    const candidateValue = rawValue.value ?? rawValue.result ?? rawValue.reading ?? rawValue.observedValue ?? null;
    const usableValue = toUsableValue(candidateValue);
    const numericValue = extractNumericCandidate(candidateValue);
    const unit = String(rawValue.unit || rawValue.units || '').trim();
    const reference = String(rawValue.reference || rawValue.referenceRange || rawValue.range || '').trim();
    const referenceInfo = parseReferenceRange(reference);
    const status = deriveStatus({
      rawStatus: rawValue.status,
      numericValue,
      referenceMin: referenceInfo.min,
      referenceMax: referenceInfo.max
    });

    return {
      usableValue: usableValue ?? (numericValue ?? null),
      numericValue,
      unit,
      reference: referenceInfo.reference,
      referenceMin: referenceInfo.min,
      referenceMax: referenceInfo.max,
      status
    };
  }

  const usableValue = toUsableValue(rawValue);
  const raw = typeof rawValue === 'string' ? rawValue.trim() : '';
  const numericValue = extractNumericCandidate(rawValue);

  const referenceMatch = raw.match(/(?:ref(?:erence)?(?: range)?[:\s]*|range[:\s]*)([^,;)\]]+)/i);
  const referenceText = referenceMatch ? referenceMatch[1].trim() : '';
  const referenceInfo = parseReferenceRange(referenceText);

  const status = deriveStatus({
    rawStatus: raw,
    numericValue,
    referenceMin: referenceInfo.min,
    referenceMax: referenceInfo.max
  });

  let unit = '';
  if (numericValue != null && raw) {
    const unitMatch = raw.match(/-?\d+(?:\.\d+)?\s*([A-Za-z%/][A-Za-z0-9%/.\-]*)/);
    unit = unitMatch ? unitMatch[1].trim() : '';
  }

  return {
    usableValue,
    numericValue,
    unit,
    reference: referenceInfo.reference,
    referenceMin: referenceInfo.min,
    referenceMax: referenceInfo.max,
    status
  };
}

function buildMetricEntry(name, descriptor = {}) {
  if (typeof descriptor.numericValue !== 'number' || !Number.isFinite(descriptor.numericValue)) {
    return null;
  }

  return {
    name,
    value: descriptor.numericValue,
    unit: descriptor.unit || '',
    reference: descriptor.reference || '',
    referenceMin: descriptor.referenceMin ?? null,
    referenceMax: descriptor.referenceMax ?? null,
    status: descriptor.status || 'unknown'
  };
}

function rankMetric(metric = {}) {
  const abnormalWeight = metric.status === 'high' || metric.status === 'low'
    ? 1000
    : (metric.status === 'unknown' ? 100 : 0);
  return abnormalWeight + (FIELD_PRIORITY[metric.name] || 0);
}

function metricQualityScore(metric = {}) {
  const reference = String(metric.reference || '').trim().toLowerCase();
  const hasAgeContext = /(year|years|yr|week|weeks|day|days|month|months|trimester|pregnan|pediatric|paediatric|adult|age|cord blood)/i.test(reference);

  let score = 0;
  if (metric.status && metric.status !== 'unknown') score += 3;
  if (reference) score += 1;
  if (reference && !hasAgeContext) score += 2;
  if (reference && reference.length <= 120) score += 1;
  if (Number.isFinite(metric.referenceMin) || Number.isFinite(metric.referenceMax)) score += 1;

  return score;
}

function normalizeMetricUnit(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[µμ]/g, 'u')
    .replace(/\s+/g, '')
    .trim();
}

function dedupeParsedMetrics(metrics = []) {
  const byKey = new Map();

  for (const metric of metrics || []) {
    const key = [
      String(metric?.name || '').toLowerCase(),
      String(metric?.value ?? ''),
      normalizeMetricUnit(metric?.unit || '')
    ].join('|');

    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, metric);
      continue;
    }

    if (metricQualityScore(metric) > metricQualityScore(existing)) {
      byKey.set(key, metric);
    }
  }

  return Array.from(byKey.values());
}

function resolveBloodSugarDuplicates(normalizedFields = {}, numericFields = {}, parsedMetrics = []) {
  const bloodSugarKeys = ['bloodSugar', 'fastingBloodSugar', 'postMealBloodSugar', 'randomBloodSugar'];
  const populatedKeys = bloodSugarKeys.filter((key) => Number.isFinite(numericFields?.[key]));
  if (populatedKeys.length <= 1) {
    return {
      normalizedFields,
      numericFields,
      parsedMetrics
    };
  }

  const priority = {
    fastingBloodSugar: 4,
    postMealBloodSugar: 3,
    randomBloodSugar: 2,
    bloodSugar: 1
  };

  const sorted = [...populatedKeys].sort((left, right) => {
    const diff = (priority[right] || 0) - (priority[left] || 0);
    if (diff !== 0) return diff;
    return Math.abs((numericFields?.[right] || 0)) - Math.abs((numericFields?.[left] || 0));
  });

  const keepKey = sorted[0];
  const dropSet = new Set(populatedKeys.filter((key) => key !== keepKey));

  if (!dropSet.size) {
    return {
      normalizedFields,
      numericFields,
      parsedMetrics
    };
  }

  const nextNormalizedFields = { ...(normalizedFields || {}) };
  const nextNumericFields = { ...(numericFields || {}) };

  for (const key of dropSet) {
    delete nextNormalizedFields[key];
    delete nextNumericFields[key];
  }

  const nextParsedMetrics = (parsedMetrics || []).filter((metric) => !dropSet.has(metric?.name));

  return {
    normalizedFields: nextNormalizedFields,
    numericFields: nextNumericFields,
    parsedMetrics: nextParsedMetrics
  };
}

function normalizeFieldEntries(fields = {}) {
  const normalizedFields = {};
  const numericFields = {};
  const unknownFields = [];
  const conflicts = [];
  const parsedMetrics = [];
  let reportDate = null;

  for (const [rawKey, rawValue] of Object.entries(fields || {})) {
    const lookupKey = normalizeLookupKey(rawKey);
    const standardizedKey = STANDARD_FIELD_ALIASES[lookupKey] || toStableCamelCase(lookupKey);

    if (!getCanonicalFieldDefinition(rawKey)) {
      unknownFields.push(String(rawKey));
    }

    const descriptor = extractFieldDescriptor(rawValue);
    if (descriptor.usableValue === null && descriptor.numericValue === null) continue;

    if (standardizedKey === 'reportDate') {
      const parsedDate = parseDateValue(descriptor.usableValue || rawValue);
      if (parsedDate) {
        reportDate = parsedDate;
        normalizedFields.reportDate = parsedDate.toISOString();
      }
      continue;
    }

    const normalizedValue = descriptor.numericValue ?? descriptor.usableValue;

    if (Object.prototype.hasOwnProperty.call(normalizedFields, standardizedKey)) {
      conflicts.push({
        field: standardizedKey,
        previousValue: normalizedFields[standardizedKey],
        nextValue: normalizedValue
      });
    }

    normalizedFields[standardizedKey] = normalizedValue;

    if (typeof descriptor.numericValue === 'number' && Number.isFinite(descriptor.numericValue)) {
      numericFields[standardizedKey] = descriptor.numericValue;
    }

    if (standardizedKey === 'bloodPressure') {
      const bloodPressure = parseBloodPressureValue(normalizedValue);
      if (bloodPressure?.systolic != null) {
        numericFields.bloodPressureSystolic = bloodPressure.systolic;
        normalizedFields.bloodPressureSystolic = bloodPressure.systolic;
      }
      if (bloodPressure?.diastolic != null) {
        numericFields.bloodPressureDiastolic = bloodPressure.diastolic;
        normalizedFields.bloodPressureDiastolic = bloodPressure.diastolic;
      }
    }

    const metric = buildMetricEntry(standardizedKey, descriptor);
    if (metric) {
      parsedMetrics.push(metric);
    }
  }

  const uniqueParsedMetrics = dedupeParsedMetrics(parsedMetrics);
  uniqueParsedMetrics.sort((a, b) => rankMetric(b) - rankMetric(a));

  return {
    normalizedFields,
    numericFields,
    parsedMetrics: uniqueParsedMetrics,
    reportDate,
    importantFindings: uniqueParsedMetrics.slice(0, 8),
    unknownFields: Array.from(new Set(unknownFields)),
    conflicts
  };
}

async function normalizeFieldEntriesWithCatalog(fields = {}, clarificationSelections = {}) {
  const normalizedFields = {};
  const numericFields = {};
  const unknownFields = [];
  const conflicts = [];
  const parsedMetrics = [];
  const ambiguities = [];
  let reportDate = null;

  const stage2Resolution = await resolveFieldsWithLLM({
    extractedFields: fields,
    clarificationSelections
  });

  const resolutionMap = new Map(
    (stage2Resolution.internalResolutions || []).map((item) => [
      normalizeLookup(item.inputName),
      item
    ])
  );

  for (const [rawKey, rawValue] of Object.entries(fields || {})) {
    const resolution = resolutionMap.get(normalizeLookup(rawKey));

    if (resolution?.status === 'clarification_required') {
      if (resolution.ambiguity) {
        ambiguities.push(resolution.ambiguity);
      }
      continue;
    }

    const standardizedKey = resolution?.canonicalKey || toStableCamelCase(rawKey);
    if (!getCanonicalFieldDefinition(rawKey) && resolution?.source === 'learned') {
      unknownFields.push(String(rawKey));
    }

    const descriptor = extractFieldDescriptor(rawValue);
    if (descriptor.usableValue === null && descriptor.numericValue === null) continue;

    if (standardizedKey === 'reportDate') {
      const parsedDate = parseDateValue(descriptor.usableValue || rawValue);
      if (parsedDate) {
        reportDate = parsedDate;
        normalizedFields.reportDate = parsedDate.toISOString();
      }
      continue;
    }

    const normalizedValue = descriptor.numericValue ?? descriptor.usableValue;

    if (Object.prototype.hasOwnProperty.call(normalizedFields, standardizedKey)) {
      conflicts.push({
        field: standardizedKey,
        previousValue: normalizedFields[standardizedKey],
        nextValue: normalizedValue
      });
    }

    normalizedFields[standardizedKey] = normalizedValue;

    if (typeof descriptor.numericValue === 'number' && Number.isFinite(descriptor.numericValue)) {
      numericFields[standardizedKey] = descriptor.numericValue;
    }

    if (standardizedKey === 'bloodPressure') {
      const bloodPressure = parseBloodPressureValue(normalizedValue);
      if (bloodPressure?.systolic != null) {
        numericFields.bloodPressureSystolic = bloodPressure.systolic;
        normalizedFields.bloodPressureSystolic = bloodPressure.systolic;
      }
      if (bloodPressure?.diastolic != null) {
        numericFields.bloodPressureDiastolic = bloodPressure.diastolic;
        normalizedFields.bloodPressureDiastolic = bloodPressure.diastolic;
      }
    }

    const metric = buildMetricEntry(standardizedKey, descriptor);
    if (metric) {
      parsedMetrics.push(metric);
    }
  }

  const uniqueParsedMetrics = dedupeParsedMetrics(parsedMetrics);
  uniqueParsedMetrics.sort((a, b) => rankMetric(b) - rankMetric(a));

  const bloodSugarResolved = resolveBloodSugarDuplicates(normalizedFields, numericFields, uniqueParsedMetrics);
  const finalParsedMetrics = dedupeParsedMetrics(bloodSugarResolved.parsedMetrics);
  finalParsedMetrics.sort((a, b) => rankMetric(b) - rankMetric(a));

  return {
    normalizedFields: bloodSugarResolved.normalizedFields,
    numericFields: bloodSugarResolved.numericFields,
    parsedMetrics: finalParsedMetrics,
    reportDate,
    importantFindings: finalParsedMetrics.slice(0, 8),
    unknownFields: Array.from(new Set(unknownFields)),
    conflicts,
    ambiguities,
    fieldResolutions: stage2Resolution.resolvedFields || []
  };
}

function buildHealthMetrics(normalizedFields = {}) {
  const healthMetrics = {};

  for (const [fieldKey, value] of Object.entries(normalizedFields || {})) {
    const metricKey = HEALTH_METRIC_KEY_MAP[fieldKey];
    if (!metricKey || typeof value !== 'number' || !Number.isFinite(value)) continue;
    healthMetrics[metricKey] = value;
  }

  if (
    healthMetrics.bloodPressureSystolic == null ||
    healthMetrics.bloodPressureDiastolic == null
  ) {
    const bloodPressure = parseBloodPressureValue(normalizedFields.bloodPressure);
    if (bloodPressure?.systolic != null && healthMetrics.bloodPressureSystolic == null) {
      healthMetrics.bloodPressureSystolic = bloodPressure.systolic;
    }
    if (bloodPressure?.diastolic != null && healthMetrics.bloodPressureDiastolic == null) {
      healthMetrics.bloodPressureDiastolic = bloodPressure.diastolic;
    }
  }

  return healthMetrics;
}

function buildCustomFields(normalizedFields = {}) {
  return Object.entries(normalizedFields || {})
    .filter(([fieldName]) => fieldName !== 'reportDate')
    .map(([fieldName, fieldValue]) => ({
      fieldName,
      fieldValue: Array.isArray(fieldValue) ? fieldValue.join(', ') : String(fieldValue)
    }));
}

module.exports = {
  STANDARD_FIELD_ALIASES,
  normalizeLookupKey,
  normalizeFieldEntries,
  normalizeFieldEntriesWithCatalog,
  buildHealthMetrics,
  buildCustomFields
};
