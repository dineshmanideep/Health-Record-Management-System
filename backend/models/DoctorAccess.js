const mongoose = require('mongoose');

const doctorAccessSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  accessMethod: {
    type: String,
    enum: ['otp', 'qr'],
    required: true
  },
  grantedAt: {
    type: Date,
    default: Date.now
  },
  revokedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Unique: one active access per patient-doctor pair
doctorAccessSchema.index({ patient: 1, doctor: 1 }, { unique: true });
doctorAccessSchema.index({ patient: 1, isActive: 1 });

module.exports = mongoose.model('DoctorAccess', doctorAccessSchema);
