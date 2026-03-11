const mongoose = require('mongoose');

const hospitalAuditLogSchema = new mongoose.Schema(
  {
    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      required: true
    },
    action: {
      type: String,
      enum: [
        'doctor_joined',
        'nurse_joined',
        'doctor_revoked',
        'nurse_revoked',
        'nurse_assigned_to_doctor',
        'nurse_unassigned_from_doctor',
        'profile_updated',
        'create_test_type',
        'update_test_type',
        'deactivate_test_type',
        'create_test_assignment',
        'start_test_assignment',
        'complete_test_assignment',
        'cancel_test_assignment'
      ],
      required: true
    },
    performedBy: {
      id: { type: mongoose.Schema.Types.ObjectId },
      role: { type: String },
      name: { type: String }
    },
    details: {
      type: mongoose.Schema.Types.Mixed
    }
  },
  { timestamps: true }
);

hospitalAuditLogSchema.index({ hospital: 1, createdAt: -1 });

module.exports = mongoose.model('HospitalAuditLog', hospitalAuditLogSchema);
