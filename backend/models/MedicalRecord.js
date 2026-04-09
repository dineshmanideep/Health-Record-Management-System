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

const medicalRecordSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  hospital: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital',
    required: true
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },
  nurse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Nurse',
    required: true
  },
  visitDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  diagnosis: {
    type: String,
    required: true,
    trim: true
  },
  symptoms: {
    type: String,
    trim: true
  },
  prescriptionNotes: {
    type: String,
    trim: true
  },
  medications: [{
    name: String,
    dosage: String,
    frequency: String,
    duration: String
  }],
  recommendedTests: {
    type: String,
    trim: true
  },
  // Multiple prescription documents (file paths)
  prescriptionDocuments: [{
    type: String
  }],
  // Categorized medical documents
  categorizedDocuments: [{
    filePath: { type: String, required: true },
    category: { type: String, enum: ['test_report', 'diagnosis_report'], required: true },
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
  // Multiple prescription links (URLs)
  prescriptionLinks: [{
    type: String
  }],
  // Keep legacy single field for backward compat
  prescriptionDocument: {
    type: String
  },
  nextVisitDate: {
    type: Date
  },
  healthMetrics: {
    bloodSugar: { type: Number },
    bloodPressureSystolic: { type: Number },
    bloodPressureDiastolic: { type: Number },
    thyroidTSH: { type: Number },
    heartRate: { type: Number },
    temperature: { type: Number },
    weight: { type: Number },
    height: { type: Number }
  },
  // Nurse-added custom fields (key-value pairs)
  customFields: [{
    fieldName: { type: String },
    fieldValue: { type: String }
  }],
  structuredData: {
    type: structuredMedicalDataSchema,
    default: () => ({ extractionStatus: 'skipped', normalizedFields: {}, numericFields: {} })
  },
  // Edit history — tracks who edited and when (overwrites, not versions)
  editHistory: [{
    editedBy: {
      id: { type: mongoose.Schema.Types.ObjectId },
      role: { type: String },
      name: { type: String }
    },
    editedAt: { type: Date, default: Date.now },
    summary: { type: String }
  }]
}, {
  timestamps: true
});

// Index for efficient patient queries
medicalRecordSchema.index({ patient: 1, createdAt: -1 });
medicalRecordSchema.index({ patient: 1, hospital: 1 });

module.exports = mongoose.model('MedicalRecord', medicalRecordSchema);
