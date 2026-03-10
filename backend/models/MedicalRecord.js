const mongoose = require('mongoose');

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
