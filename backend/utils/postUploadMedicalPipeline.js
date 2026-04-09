const path = require('path');
const MedicalRecord = require('../models/MedicalRecord');
const TestAssignment = require('../models/TestAssignment');
const { extractStructuredMedicalData } = require('./medicalExtractionService');
const { buildCustomFields, buildHealthMetrics } = require('./medicalFieldNormalization');
const { getFieldDisplayLabel } = require('./medicalCanonicalization');

function toAbsoluteUploadPath(filePath = '') {
  return path.join(__dirname, '..', String(filePath || '').replace(/^\/+/, ''));
}

function mergeLatest(base = {}, next = {}) {
  return { ...(base || {}), ...(next || {}) };
}

function mergeLists(base = [], next = []) {
  return Array.from(new Set([...(base || []), ...(next || [])].filter(Boolean)));
}

function buildMedicationObjects(list = []) {
  return (list || []).filter(Boolean).map((name) => ({
    name,
    dosage: '',
    frequency: '',
    duration: ''
  }));
}

function buildSummaryFromExtraction(result = {}, document = {}) {
  const lines = [];
  const reportLabel = document.reportTag || document.category || 'medical report';
  const displayLabel = String(reportLabel)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

  lines.push(`${displayLabel} summary:`);

  if (result.specialization) {
    lines.push(`- Specialty: ${result.specialization}`);
  }

  if (result.diagnosis) {
    lines.push(`- Main finding: ${result.diagnosis}`);
  }

  const topFindings = (result.importantFindings || []).slice(0, 4);
  if (topFindings.length) {
    lines.push(`- Important values: ${topFindings.map((finding) => {
      const unit = finding.unit ? ` ${finding.unit}` : '';
      const reference = finding.reference ? ` (Ref: ${finding.reference})` : '';
      const flag = finding.status && finding.status !== 'unknown' ? `, ${finding.status}` : '';
      return `${getFieldDisplayLabel(finding.name)}: ${finding.value}${unit}${reference}${flag}`;
    }).join(', ')}`);
  }

  if (result.medications?.length) {
    lines.push(`- Mentioned medicines: ${result.medications.slice(0, 4).join(', ')}`);
  }

  if (result.nextVisitDate) {
    lines.push(`- Suggested next visit: ${new Date(result.nextVisitDate).toLocaleDateString('en-US')}`);
  }

  return lines.join('\n');
}

async function processDocuments({ documents, fallbackText }) {
  const aggregate = {
    normalizedFields: {},
    numericFields: {},
    medications: [],
    validationErrors: [],
    unknownFields: [],
    conflicts: [],
    rawResponses: [],
    diagnosis: '',
    specialization: '',
    reportDate: null,
    nextVisitDate: null,
    anySuccess: false,
    anyAttempted: false
  };

  for (const document of documents || []) {
    if (!document?.filePath) {
      document.llmExtraction = {
        ...(document.llmExtraction || {}),
        status: 'skipped',
        processedAt: new Date(),
        validationErrors: ['Document is missing a file path']
      };
      continue;
    }

    aggregate.anyAttempted = true;
    const isRemoteSource = /^https?:\/\//i.test(document.filePath);
    const result = await extractStructuredMedicalData({
      filePath: isRemoteSource ? '' : toAbsoluteUploadPath(document.filePath),
      sourceUrl: isRemoteSource ? document.filePath : '',
      category: document.category,
      fallbackText
    });

    document.llmExtraction = {
      status: result.status,
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
      processedAt: new Date(),
      sourceType: document.category
    };
    document.parsedMetrics = result.parsedMetrics || [];
    document.reportDate = result.reportDate || null;

    if (result.success) {
      document.aiSummary = buildSummaryFromExtraction(result, document);
      document.aiSummaryGeneratedAt = new Date();
    }

    aggregate.rawResponses.push({
      documentPath: document.filePath,
      response: result.rawResponse || '',
      status: result.status
    });

    aggregate.validationErrors.push(...(result.validationErrors || []));
    aggregate.unknownFields.push(...(result.unknownFields || []));
    aggregate.conflicts.push(...(result.conflicts || []));

    if (!result.success) {
      continue;
    }

    aggregate.anySuccess = true;
    aggregate.normalizedFields = mergeLatest(aggregate.normalizedFields, result.normalizedFields);
    aggregate.numericFields = mergeLatest(aggregate.numericFields, result.numericFields);
    aggregate.medications = mergeLists(aggregate.medications, result.medications);
    if (result.diagnosis) aggregate.diagnosis = result.diagnosis;
    if (result.specialization) aggregate.specialization = result.specialization;
    if (result.reportDate) aggregate.reportDate = result.reportDate;
    if (result.nextVisitDate) aggregate.nextVisitDate = result.nextVisitDate;
  }

  aggregate.validationErrors = Array.from(new Set(aggregate.validationErrors));
  aggregate.unknownFields = Array.from(new Set(aggregate.unknownFields));
  return aggregate;
}

function applyAggregateToMedicalRecord(record, aggregate) {
  const healthMetrics = buildHealthMetrics(aggregate.normalizedFields);

  record.structuredData = {
    extractionStatus: aggregate.anyAttempted
      ? (aggregate.anySuccess ? 'completed' : 'failed')
      : 'skipped',
    diagnosis: aggregate.diagnosis || record.structuredData?.diagnosis || '',
    specialization: aggregate.specialization || record.structuredData?.specialization || '',
    reportDate: aggregate.reportDate || record.structuredData?.reportDate || null,
    normalizedFields: aggregate.normalizedFields || {},
    numericFields: aggregate.numericFields || {},
    medications: aggregate.medications || [],
    nextVisitDate: aggregate.nextVisitDate || null,
    validationErrors: aggregate.validationErrors || [],
    unknownFields: aggregate.unknownFields || [],
    conflicts: aggregate.conflicts || [],
    rawResponses: aggregate.rawResponses || [],
    processedAt: new Date()
  };

  if ((record.diagnosis === 'See Prescription' || !record.diagnosis) && aggregate.diagnosis) {
    record.diagnosis = aggregate.diagnosis;
  }

  if (aggregate.medications?.length) {
    record.medications = buildMedicationObjects(aggregate.medications);
  }

  if (aggregate.nextVisitDate) {
    record.nextVisitDate = aggregate.nextVisitDate;
  }

  record.healthMetrics = {
    ...(record.healthMetrics?.toObject ? record.healthMetrics.toObject() : (record.healthMetrics || {})),
    ...healthMetrics
  };

  record.customFields = buildCustomFields(aggregate.normalizedFields);
}

function applyAggregateToTestAssignment(assignment, aggregate) {
  assignment.structuredData = {
    extractionStatus: aggregate.anyAttempted
      ? (aggregate.anySuccess ? 'completed' : 'failed')
      : 'skipped',
    diagnosis: aggregate.diagnosis || assignment.structuredData?.diagnosis || '',
    specialization: aggregate.specialization || assignment.structuredData?.specialization || '',
    reportDate: aggregate.reportDate || assignment.structuredData?.reportDate || null,
    normalizedFields: aggregate.normalizedFields || {},
    numericFields: aggregate.numericFields || {},
    medications: aggregate.medications || [],
    nextVisitDate: aggregate.nextVisitDate || null,
    validationErrors: aggregate.validationErrors || [],
    unknownFields: aggregate.unknownFields || [],
    conflicts: aggregate.conflicts || [],
    rawResponses: aggregate.rawResponses || [],
    processedAt: new Date()
  };
}

async function processMedicalRecord(recordId) {
  const record = await MedicalRecord.findById(recordId);
  if (!record) return;

  const aggregate = await processDocuments({
    documents: record.categorizedDocuments || [],
    fallbackText: record.prescriptionNotes || record.diagnosis || ''
  });

  applyAggregateToMedicalRecord(record, aggregate);
  record.markModified('categorizedDocuments');
  record.markModified('structuredData');
  record.markModified('healthMetrics');
  record.markModified('customFields');
  await record.save();
}

async function processTestAssignment(assignmentId) {
  const assignment = await TestAssignment.findById(assignmentId);
  if (!assignment) return;

  const aggregate = await processDocuments({
    documents: assignment.resultDocuments || [],
    fallbackText: assignment.results || ''
  });

  applyAggregateToTestAssignment(assignment, aggregate);
  assignment.markModified('resultDocuments');
  assignment.markModified('structuredData');
  await assignment.save();
}

function queueMedicalRecordPostUploadProcessing(recordId) {
  setImmediate(() => {
    processMedicalRecord(recordId).catch((error) => {
      console.error('Medical record LLM post-upload processing failed:', error.message || error);
    });
  });
}

function queueTestAssignmentPostUploadProcessing(assignmentId) {
  setImmediate(() => {
    processTestAssignment(assignmentId).catch((error) => {
      console.error('Test assignment LLM post-upload processing failed:', error.message || error);
    });
  });
}

module.exports = {
  processMedicalRecord,
  processTestAssignment,
  queueMedicalRecordPostUploadProcessing,
  queueTestAssignmentPostUploadProcessing
};
