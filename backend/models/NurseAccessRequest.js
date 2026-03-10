const mongoose = require('mongoose');

const nurseAccessRequestSchema = new mongoose.Schema({
  nurse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Nurse',
    required: true
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },
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
  // 'create' = new record, 'edit' = modify existing record
  operation: {
    type: String,
    enum: ['create', 'edit'],
    required: true
  },
  // Only set for edit operations — which record the nurse wants to edit
  record: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MedicalRecord'
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'expired', 'completed'],
    default: 'pending'
  },
  // Time limit in minutes (configurable, default 10)
  timeLimit: {
    type: Number,
    default: 10
  },
  // Set when doctor approves — nurse must submit before this
  approvedAt: {
    type: Date
  },
  expiresAt: {
    type: Date
  },
  // Extension tracking
  extensionRequested: {
    type: Boolean,
    default: false
  },
  extensionRejected: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

nurseAccessRequestSchema.index({ nurse: 1, status: 1 });
nurseAccessRequestSchema.index({ doctor: 1, status: 1 });
nurseAccessRequestSchema.index({ expiresAt: 1 });

module.exports = mongoose.model('NurseAccessRequest', nurseAccessRequestSchema);
