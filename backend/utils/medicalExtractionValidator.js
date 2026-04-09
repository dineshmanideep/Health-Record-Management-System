function stripJsonFences(value = '') {
  return String(value || '')
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function normalizeMedicationList(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || '').trim())
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(/,|\n|;/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function toPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

function isSupportedFieldValue(value) {
  if (value == null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'boolean') return true;
  return Boolean(toPlainObject(value));
}

function validateMedicalExtractionResponse(payload) {
  const errors = [];
  let parsed = payload;

  if (typeof payload === 'string') {
    const cleaned = stripJsonFences(payload);
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return {
        valid: false,
        data: null,
        errors: ['LLM response is not valid JSON']
      };
    }
  }

  const objectPayload = toPlainObject(parsed);
  if (!objectPayload) {
    return {
      valid: false,
      data: null,
      errors: ['LLM response must be a JSON object']
    };
  }

  const fields = toPlainObject(objectPayload.fields);
  if (!fields) {
    errors.push('LLM response is missing a valid fields object');
  }

  const specialization = String(objectPayload.specialization || '').trim();
  if (!specialization) {
    errors.push('LLM response is missing specialization');
  }

  const usableFields = {};
  for (const [key, value] of Object.entries(fields || {})) {
    if (!isSupportedFieldValue(value)) continue;
    usableFields[key] = value;
  }

  if (!Object.keys(usableFields).length) {
    errors.push('LLM response does not contain usable extracted fields');
  }

  const nextVisitRaw = objectPayload.nextVisit || objectPayload.nextVisitDate || '';
  const nextVisitDate = nextVisitRaw ? new Date(nextVisitRaw) : null;
  const reportDateRaw = objectPayload.reportDate || objectPayload.testDate || objectPayload.report_date || '';
  const reportDate = reportDateRaw ? new Date(reportDateRaw) : null;

  return {
    valid: errors.length === 0,
    errors,
    data: {
      diagnosis: String(objectPayload.diagnosis || '').trim(),
      specialization,
      fields: usableFields,
      medications: normalizeMedicationList(objectPayload.medications),
      nextVisit: nextVisitDate && !Number.isNaN(nextVisitDate.getTime()) ? nextVisitDate : null,
      reportDate: reportDate && !Number.isNaN(reportDate.getTime()) ? reportDate : null
    }
  };
}

module.exports = {
  validateMedicalExtractionResponse
};
