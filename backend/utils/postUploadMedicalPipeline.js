const path = require('path');
const MedicalRecord = require('../models/MedicalRecord');
const TestAssignment = require('../models/TestAssignment');
const { extractStructuredMedicalData, normalizeValidatedMedicalData } = require('./medicalExtractionService');
const { buildCustomFields, buildHealthMetrics } = require('./medicalFieldNormalization');
const { getFieldDisplayLabel } = require('./medicalCanonicalization');

let postUploadProcessingQueue = Promise.resolve();

function toAbsoluteUploadPath(filePath = '') {
  return path.join(__dirname, '..', String(filePath || '').replace(/^\/+/, ''));
}

function hasPrescriptionHintInDocuments(documents = []) {
  return (documents || []).some((document) => {
    const reportTag = String(document?.reportTag || '').trim();
    if (!reportTag) return false;
    return /(prescription|\brx\b|medication|medicine)/i.test(reportTag);
  });
}

function toProcessingDocuments(documents = []) {
  return (documents || [])
    .filter((document) => document?.filePath)
    .map((document) => ({
      ...document,
      filePath: /^https?:\/\//i.test(document.filePath)
        ? document.filePath
        : toAbsoluteUploadPath(document.filePath)
    }));
}

function buildSummaryFromExtraction(result = {}) {
  const lines = [];

  if (result.specialization) {
    lines.push(`Specialty: ${result.specialization}`);
  }

  if (result.diagnosis) {
    lines.push(`Main finding: ${result.diagnosis}`);
  }

  if (result.medicationDetails?.length) {
    lines.push(`Medicines: ${result.medicationDetails.slice(0, 4).map((item) => {
      const timing = item.timing ? `, ${item.timing}` : '';
      const duration = item.durationDays ? `, ${item.durationDays} day(s)` : (item.duration ? `, ${item.duration}` : '');
      return `${item.name}${item.dosage ? ` ${item.dosage}` : ''}${timing}${duration}`;
    }).join('; ')}`);
  } else if (result.medications?.length) {
    lines.push(`Medicines: ${result.medications.slice(0, 4).join(', ')}`);
  }

  const topFindings = (result.parsedMetrics || []).slice(0, 4);
  if (topFindings.length) {
    lines.push(`Important values: ${topFindings.map((finding) => {
      const unit = finding.unit ? ` ${finding.unit}` : '';
      const reference = finding.reference ? ` (Ref: ${finding.reference})` : '';
      const flag = finding.status && finding.status !== 'unknown' ? `, ${finding.status}` : '';
      return `${getFieldDisplayLabel(finding.name)}: ${finding.value}${unit}${reference}${flag}`;
    }).join('; ')}`);
  }

  if (result.nextVisitDate) {
    lines.push(`Next visit: ${new Date(result.nextVisitDate).toLocaleDateString('en-US')}`);
  }

  return lines.join('\n');
}

async function processDocuments({ documents, fallbackText, visitDate, clarificationSelections }) {
  const extraction = await extractStructuredMedicalData({
    documents: toProcessingDocuments(documents),
    fallbackText,
    visitDate,
    clarificationSelections
  });

  return {
    ...extraction,
    summary: extraction.success ? buildSummaryFromExtraction(extraction) : ''
  };
}

function applyResultToDocuments(documents = [], result = {}) {
  const summary = result.summary || '';
  const hasMultipleDocuments = (documents || []).length > 1;
  for (const document of documents || []) {
    if (!document?.filePath) continue;
    document.aiSummary = hasMultipleDocuments ? '' : summary;
    document.aiSummaryGeneratedAt = !hasMultipleDocuments && summary ? new Date() : document.aiSummaryGeneratedAt;
    document.reportDate = result.reportDate || document.reportDate || null;
    document.llmExtraction = {
      ...(document.llmExtraction || {}),
      status: result.status || 'failed',
      diagnosis: result.diagnosis || '',
      specialization: result.specialization || '',
      reportDate: result.reportDate || null,
      normalizedFields: result.normalizedFields || {},
      numericFields: result.numericFields || {},
      medications: result.medications || [],
      nextVisitDate: result.nextVisitDate || null,
      validationErrors: result.validationErrors || [],
      unknownFields: result.unknownFields || [],
      conflicts: result.conflicts || [],
      rawResponse: result.rawResponse || '',
      processedAt: new Date()
    };
    document.parsedMetrics = hasMultipleDocuments ? [] : (result.parsedMetrics || []);
  }
}

function applyResultToMedicalRecord(record, result) {
  const healthMetrics = buildHealthMetrics(result.normalizedFields);

  record.structuredData = {
    extractionStatus: result.status || 'skipped',
    diagnosis: result.diagnosis || '',
    specialization: result.specialization || '',
    summary: result.summary || '',
    reportDate: result.reportDate || null,
    normalizedFields: result.normalizedFields || {},
    numericFields: result.numericFields || {},
    parsedMetrics: result.parsedMetrics || [],
    medications: result.medications || [],
    nextVisitDate: result.nextVisitDate || null,
    validationErrors: result.validationErrors || [],
    unknownFields: result.unknownFields || [],
    ambiguities: result.ambiguities || [],
    conflicts: result.conflicts || [],
    rawResponses: result.rawResponse ? [{
      documentPath: 'combined',
      response: result.rawResponse,
      status: result.status
    }] : [],
    processedAt: new Date()
  };

  if ((record.diagnosis === 'See Prescription' || !record.diagnosis) && result.diagnosis) {
    record.diagnosis = result.diagnosis;
  }

  if (result.medicationDetails?.length) {
    record.medications = result.medicationDetails;
  } else if (result.medications?.length) {
    record.medications = result.medications.map((name) => ({
      name,
      dosage: '',
      frequency: '',
      duration: '',
      timing: '',
      instructions: ''
    }));
  } else {
    record.medications = [];
  }

  if (result.nextVisitDate) {
    record.nextVisitDate = result.nextVisitDate;
  } else {
    record.nextVisitDate = null;
  }

  record.healthMetrics = {
    ...(record.healthMetrics?.toObject ? record.healthMetrics.toObject() : (record.healthMetrics || {})),
    ...healthMetrics
  };
  record.customFields = buildCustomFields(result.normalizedFields);
}

function applyResultToTestAssignment(assignment, result) {
  assignment.structuredData = {
    extractionStatus: result.status || 'skipped',
    diagnosis: result.diagnosis || '',
    specialization: result.specialization || '',
    summary: result.summary || '',
    reportDate: result.reportDate || null,
    normalizedFields: result.normalizedFields || {},
    numericFields: result.numericFields || {},
    parsedMetrics: result.parsedMetrics || [],
    medications: result.medications || [],
    nextVisitDate: result.nextVisitDate || null,
    validationErrors: result.validationErrors || [],
    unknownFields: result.unknownFields || [],
    ambiguities: result.ambiguities || [],
    conflicts: result.conflicts || [],
    rawResponses: result.rawResponse ? [{
      documentPath: 'combined',
      response: result.rawResponse,
      status: result.status
    }] : [],
    processedAt: new Date()
  };
}

function enqueuePostUploadProcessing(taskName, taskFn) {
  postUploadProcessingQueue = postUploadProcessingQueue
    .catch(() => {})
    .then(() => taskFn())
    .catch((error) => {
      console.error(`${taskName} failed:`, error.message || error);
    });

  return postUploadProcessingQueue;
}

async function processMedicalRecord(recordId, clarificationSelections = {}) {
  const record = await MedicalRecord.findById(recordId);
  if (!record) return null;

  const result = await processDocuments({
    documents: record.categorizedDocuments || [],
    fallbackText: record.prescriptionNotes || record.diagnosis || '',
    visitDate: record.visitDate || record.createdAt || new Date(),
    clarificationSelections
  });

  applyResultToDocuments(record.categorizedDocuments, result);
  applyResultToMedicalRecord(record, result);
  record.markModified('categorizedDocuments');
  record.markModified('structuredData');
  record.markModified('healthMetrics');
  record.markModified('customFields');
  await record.save();
  return result;
}

async function processTestAssignment(assignmentId, clarificationSelections = {}) {
  const assignment = await TestAssignment.findById(assignmentId);
  if (!assignment) return null;

  const result = await processDocuments({
    documents: assignment.resultDocuments || [],
    fallbackText: assignment.results || '',
    visitDate: assignment.completedAt || assignment.createdAt || new Date(),
    clarificationSelections
  });

  applyResultToDocuments(assignment.resultDocuments, result);
  applyResultToTestAssignment(assignment, result);
  assignment.markModified('resultDocuments');
  assignment.markModified('structuredData');
  await assignment.save();
  return result;
}

async function finalizeValidatedMedicalRecord(record, validatedData, rawResponse, clarificationSelections = {}) {
  const hasPrescriptionDocumentHint = hasPrescriptionHintInDocuments(record.categorizedDocuments || []);

  const normalized = await normalizeValidatedMedicalData(validatedData, {
    clarificationSelections,
    visitDate: record.visitDate || record.createdAt || new Date(),
    fallbackText: record.prescriptionNotes || record.diagnosis || '',
    hasPrescriptionDocumentHint
  });

  const result = {
    success: !normalized.ambiguities?.length,
    status: normalized.ambiguities?.length ? 'clarification_required' : 'completed',
    rawResponse,
    validationErrors: [],
    ...normalized,
    summary: buildSummaryFromExtraction(normalized)
  };

  applyResultToDocuments(record.categorizedDocuments, result);
  applyResultToMedicalRecord(record, result);
  record.markModified('categorizedDocuments');
  record.markModified('structuredData');
  record.markModified('healthMetrics');
  record.markModified('customFields');
  await record.save();
  return result;
}

async function finalizeValidatedTestAssignment(assignment, validatedData, rawResponse, clarificationSelections = {}) {
  const hasPrescriptionDocumentHint = hasPrescriptionHintInDocuments(assignment.resultDocuments || []);

  const normalized = await normalizeValidatedMedicalData(validatedData, {
    clarificationSelections,
    visitDate: assignment.completedAt || assignment.createdAt || new Date(),
    fallbackText: assignment.results || '',
    hasPrescriptionDocumentHint
  });

  const result = {
    success: !normalized.ambiguities?.length,
    status: normalized.ambiguities?.length ? 'clarification_required' : 'completed',
    rawResponse,
    validationErrors: [],
    ...normalized,
    summary: buildSummaryFromExtraction(normalized)
  };

  applyResultToDocuments(assignment.resultDocuments, result);
  applyResultToTestAssignment(assignment, result);
  assignment.markModified('resultDocuments');
  assignment.markModified('structuredData');
  await assignment.save();
  return result;
}

function queueMedicalRecordPostUploadProcessing(recordId) {
  setImmediate(() => {
    enqueuePostUploadProcessing('Medical record LLM post-upload processing', () => processMedicalRecord(recordId));
  });
}

function queueTestAssignmentPostUploadProcessing(assignmentId) {
  setImmediate(() => {
    enqueuePostUploadProcessing('Test assignment LLM post-upload processing', () => processTestAssignment(assignmentId));
  });
}

module.exports = {
  processDocuments,
  processMedicalRecord,
  processTestAssignment,
  finalizeValidatedMedicalRecord,
  finalizeValidatedTestAssignment,
  queueMedicalRecordPostUploadProcessing,
  queueTestAssignmentPostUploadProcessing
};
