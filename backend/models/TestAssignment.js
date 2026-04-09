const mongoose = require('mongoose');

const llmExtractionSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'skipped'],
    default: 'pending'
  },
  diagnosis: { type: String, trim: true },
  specialization: { type: String, trim: true },
  normalizedFields: { type: mongoose.Schema.Types.Mixed, default: {} },
  numericFields: { type: mongoose.Schema.Types.Mixed, default: {} },
  medications: [{ type: String, trim: true }],
  reportDate: { type: Date },
  nextVisitDate: { type: Date },
  validationErrors: [{ type: String, trim: true }],
  unknownFields: [{ type: String, trim: true }],
  conflicts: [{
    field: { type: String, trim: true },
    previousValue: { type: mongoose.Schema.Types.Mixed },
    nextValue: { type: mongoose.Schema.Types.Mixed }
  }],
  rawResponse: { type: String, trim: true },
  processedAt: { type: Date },
  sourceType: { type: String, trim: true }
}, { _id: false });

const structuredMedicalDataSchema = new mongoose.Schema({
  extractionStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'skipped'],
    default: 'skipped'
  },
  diagnosis: { type: String, trim: true },
  specialization: { type: String, trim: true },
  normalizedFields: { type: mongoose.Schema.Types.Mixed, default: {} },
  numericFields: { type: mongoose.Schema.Types.Mixed, default: {} },
  medications: [{ type: String, trim: true }],
  reportDate: { type: Date },
  nextVisitDate: { type: Date },
  validationErrors: [{ type: String, trim: true }],
  unknownFields: [{ type: String, trim: true }],
  conflicts: [{
    field: { type: String, trim: true },
    previousValue: { type: mongoose.Schema.Types.Mixed },
    nextValue: { type: mongoose.Schema.Types.Mixed }
  }],
  rawResponses: [{
    documentPath: { type: String, trim: true },
    response: { type: String, trim: true },
    status: { type: String, trim: true }
  }],
  processedAt: { type: Date }
}, { _id: false });

const testAssignmentSchema = new mongoose.Schema({
  hospital: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital',
    required: true
  },
  testType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TestType',
    required: true
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  nurse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Nurse',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  notes: {
    type: String,
    trim: true
  },
  // Test results uploaded by nurse
  results: {
    type: String,
    trim: true
  },
  resultDocuments: [{
    filePath: { type: String, required: true },
    category: { type: String, enum: ['test_report', 'diagnosis_report'], default: 'test_report' },
    reportTag: { type: String, trim: true },
    parsedMetrics: [{
      name: { type: String, trim: true },
      value: { type: Number },
      unit: { type: String, trim: true },
      reference: { type: String, trim: true },
      referenceMin: { type: Number },
      referenceMax: { type: Number },
      status: { type: String, enum: ['low', 'normal', 'high', 'unknown'], default: 'unknown' }
    }],
    reportDate: { type: Date },
    aiSummary: { type: String, trim: true },
    aiSummaryGeneratedAt: { type: Date },
    uploadedAt: { type: Date, default: Date.now },
    llmExtraction: { type: llmExtractionSchema, default: () => ({ status: 'pending' }) }
  }],
  structuredData: {
    type: structuredMedicalDataSchema,
    default: () => ({ extractionStatus: 'skipped', normalizedFields: {}, numericFields: {} })
  },
  startedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  scheduledDate: {
    type: Date
  }
}, {
  timestamps: true
});

testAssignmentSchema.index({ hospital: 1, status: 1 });
testAssignmentSchema.index({ nurse: 1, status: 1 });
testAssignmentSchema.index({ patient: 1 });

module.exports = mongoose.model('TestAssignment', testAssignmentSchema);
