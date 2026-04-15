function stripJsonFences(value = '') {
  return String(value || '')
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
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
      // continue
    }
  }

  return { parsed: null, source: '' };
}

function normalizeMedicationList(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return [
      ...(normalizeMedicationList(value.items) || []),
      ...(normalizeMedicationList(value.list) || []),
      ...(normalizeMedicationList(value.values) || []),
      ...(normalizeMedicationList(value.medications) || []),
      ...(normalizeMedicationList(value.medicines) || []),
      ...(normalizeMedicationList(value.drugs) || []),
      ...(normalizeMedicationList(value.names) || [])
    ];
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (item && typeof item === 'object') {
          return String(
            item.name
            || item.medicine
            || item.medication
            || item.medicineName
            || item.drug
            || item.drugName
            || item.tablet
            || item.brand
            || ''
          ).trim();
        }
        return String(item || '').trim();
      })
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

function normalizeMedicationDetails(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return [
      ...(normalizeMedicationDetails(value.items) || []),
      ...(normalizeMedicationDetails(value.list) || []),
      ...(normalizeMedicationDetails(value.values) || []),
      ...(normalizeMedicationDetails(value.medicationDetails) || []),
      ...(normalizeMedicationDetails(value.medicineDetails) || []),
      ...(normalizeMedicationDetails(value.medications) || []),
      ...(normalizeMedicationDetails(value.medicines) || []),
      ...(normalizeMedicationDetails(value.drugs) || []),
      ...(normalizeMedicationDetails(value.tablets) || []),
      ...(normalizeMedicationDetails(value.schedule) || []),
      ...(normalizeMedicationDetails(value.rx) || [])
    ];
  }

  if (typeof value === 'string') {
    return value
      .split(/\n|;|,/)
      .map((line) => String(line || '').trim())
      .filter(Boolean)
      .map((name) => ({
        name,
        dosage: '',
        frequency: '',
        duration: '',
        timing: '',
        instructions: '',
        durationDays: null,
        totalTablets: null,
        tabletsPerDose: null,
        timesPerDay: null
      }));
  }

  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === 'string') {
        const name = String(item || '').trim();
        if (!name) return null;

        return {
          name,
          dosage: '',
          frequency: '',
          duration: '',
          timing: '',
          instructions: '',
          durationDays: null,
          totalTablets: null,
          tabletsPerDose: null,
          timesPerDay: null
        };
      }

      if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
      const name = String(
        item.name
        || item.medicine
        || item.medication
        || item.medicineName
        || item.drug
        || item.drugName
        || item.tablet
        || item.brand
        || ''
      ).trim();
      if (!name) return null;

      const toNumber = (input) => {
        const parsed = Number(input);
        return Number.isFinite(parsed) ? parsed : null;
      };

      return {
        name,
        dosage: String(item.dosage || item.dose || item.strength || '').trim(),
        frequency: String(item.frequency || item.schedule || item.interval || '').trim(),
        duration: String(item.duration || item.days || '').trim(),
        timing: String(item.timing || item.when || '').trim(),
        instructions: String(item.instructions || item.notes || '').trim(),
        durationDays: toNumber(item.durationDays),
        totalTablets: toNumber(item.totalTablets),
        tabletsPerDose: toNumber(item.tabletsPerDose),
        timesPerDay: toNumber(item.timesPerDay)
      };
    })
    .filter(Boolean);
}

function toPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

function uniqueMedicationNames(values = []) {
  const seen = new Set();
  const result = [];

  for (const value of values || []) {
    const name = String(value || '').trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(name);
  }

  return result;
}

function dedupeMedicationDetails(details = []) {
  const byKey = new Map();

  for (const item of details || []) {
    const name = String(item?.name || '').trim();
    if (!name) continue;

    const key = [
      name.toLowerCase(),
      String(item?.dosage || '').trim().toLowerCase(),
      String(item?.frequency || '').trim().toLowerCase(),
      String(item?.timing || '').trim().toLowerCase(),
      String(item?.instructions || '').trim().toLowerCase(),
      String(item?.duration || '').trim().toLowerCase()
    ].join('|');

    if (!byKey.has(key)) {
      byKey.set(key, item);
    }
  }

  return Array.from(byKey.values());
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
    const attempt = tryParseJsonCandidates(payload);
    if (attempt.parsed) {
      parsed = attempt.parsed;
    } else {
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

  const specialization = String(objectPayload.specialization || '').trim() || 'General Medicine';

  const usableFields = {};
  for (const [key, value] of Object.entries(fields || {})) {
    if (!isSupportedFieldValue(value)) continue;
    usableFields[key] = value;
  }

  const nextVisitRaw = objectPayload.nextVisit || objectPayload.nextVisitDate || '';
  const nextVisitDate = nextVisitRaw ? new Date(nextVisitRaw) : null;
  const nextVisitInDaysRaw = objectPayload.nextVisitInDays;
  const nextVisitInDays = Number.isFinite(Number(nextVisitInDaysRaw)) ? Number(nextVisitInDaysRaw) : null;
  const registrationDateRaw = objectPayload.registrationDate
    || objectPayload.regnDate
    || objectPayload.registration_date
    || objectPayload.regn_date
    || objectPayload.sampleDate
    || objectPayload.collectionDate
    || '';
  const registrationDate = registrationDateRaw ? new Date(registrationDateRaw) : null;
  const reportedDateRaw = objectPayload.reportedDate
    || objectPayload.reported_date
    || objectPayload.releaseDate
    || objectPayload.release_date
    || '';
  const reportedDate = reportedDateRaw ? new Date(reportedDateRaw) : null;
  const reportDateRaw = objectPayload.reportDate || objectPayload.testDate || objectPayload.report_date || '';
  const reportDate = reportDateRaw ? new Date(reportDateRaw) : null;
  const diagnosis = String(objectPayload.diagnosis || '').trim();

  const medicationNameCandidates = [
    objectPayload.medications,
    objectPayload.medicines,
    objectPayload.medicineNames,
    objectPayload.drugs,
    objectPayload.tablets,
    objectPayload.prescription,
    objectPayload.prescriptions,
    objectPayload.prescribedMedicines,
    objectPayload.rx,
    objectPayload.rxMedicines
  ];

  const medicationDetailCandidates = [
    objectPayload.medicationDetails,
    objectPayload.medicineDetails,
    objectPayload.drugDetails,
    objectPayload.tabletSchedule,
    objectPayload.medicationSchedule,
    objectPayload.prescriptionDetails,
    objectPayload.prescriptions,
    objectPayload.rxDetails,
    objectPayload.rx,
    objectPayload.medications,
    objectPayload.medicines,
    objectPayload.tablets
  ];

  const medicationDetails = dedupeMedicationDetails(
    medicationDetailCandidates.flatMap((candidate) => normalizeMedicationDetails(candidate))
  );

  const medications = uniqueMedicationNames([
    ...medicationNameCandidates.flatMap((candidate) => normalizeMedicationList(candidate)),
    ...medicationDetails.map((item) => item?.name)
  ]);

  const hasStructuredSignal =
    Object.keys(usableFields).length > 0 ||
    Boolean(diagnosis) ||
    medications.length > 0 ||
    medicationDetails.length > 0 ||
    Boolean(nextVisitDate && !Number.isNaN(nextVisitDate.getTime())) ||
    nextVisitInDays != null;

  if (!hasStructuredSignal) {
    errors.push('LLM response does not contain usable extracted fields');
  }

  return {
    valid: errors.length === 0,
    errors,
    data: {
      diagnosis,
      specialization,
      fields: usableFields,
      medications,
      medicationDetails,
      nextVisit: nextVisitDate && !Number.isNaN(nextVisitDate.getTime()) ? nextVisitDate : null,
      nextVisitInDays,
      registrationDate: registrationDate && !Number.isNaN(registrationDate.getTime()) ? registrationDate : null,
      reportedDate: reportedDate && !Number.isNaN(reportedDate.getTime()) ? reportedDate : null,
      reportDate: reportDate && !Number.isNaN(reportDate.getTime()) ? reportDate : null
    }
  };
}

module.exports = {
  validateMedicalExtractionResponse
};
