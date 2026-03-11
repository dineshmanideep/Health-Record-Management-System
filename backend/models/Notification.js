const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
    // Can reference User, Doctor, Nurse, Hospital depending on context
  },
  userModel: {
    type: String,
    enum: ['User', 'Doctor', 'Nurse', 'Hospital'],
    default: 'User'
  },
  type: {
    type: String,
    enum: [
      'doctor_access_request',
      'doctor_access_granted',
      'doctor_access_revoked',
      'record_created',
      'record_modified',
      'visit_reminder',
      'nurse_access_request',
      'nurse_extension_request',
      'nurse_request_approved',
      'nurse_request_rejected',
      'test_assigned',
      'test_completed',
      'test_cancelled',
      'general'
    ],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  // Reference to NurseAccessRequest for actionable notifications
  accessRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'NurseAccessRequest'
  },
  read: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, read: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
