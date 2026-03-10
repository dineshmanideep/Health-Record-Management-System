const mongoose = require('mongoose');

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
    uploadedAt: { type: Date, default: Date.now }
  }],
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
