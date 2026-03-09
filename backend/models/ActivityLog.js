const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    enum: [
      'record_created',
      'record_viewed',
      'record_modified',
      'self_record_uploaded',
      'self_record_deleted',
      'doctor_access_granted',
      'doctor_access_revoked',
      'doctor_viewed_records',
      'profile_updated'
    ],
    required: true
  },
  performedBy: {
    id: { type: mongoose.Schema.Types.ObjectId },
    role: { type: String, enum: ['user', 'doctor', 'nurse', 'hospital', 'admin'] },
    name: { type: String }
  },
  details: {
    type: String
  }
}, {
  timestamps: true
});

activityLogSchema.index({ patient: 1, createdAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
