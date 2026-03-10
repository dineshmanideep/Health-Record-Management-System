const mongoose = require('mongoose');

// Doctor creates a record assignment and assigns it to a nurse
const recordAssignmentSchema = new mongoose.Schema({
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
  // Doctor's instructions to the nurse
  instructions: {
    type: String,
    required: true
  },
  // Images/documents uploaded by doctor
  attachments: [{
    type: String
  }],
  // Status tracking
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  // When nurse starts working on it
  startedAt: {
    type: Date
  },
  // When nurse completes it
  completedAt: {
    type: Date
  },
  // The medical record created by nurse (once completed)
  medicalRecord: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MedicalRecord'
  },
  // Deadline for completion (optional)
  dueDate: {
    type: Date
  }
}, {
  timestamps: true
});

recordAssignmentSchema.index({ nurse: 1, status: 1 });
recordAssignmentSchema.index({ doctor: 1, createdAt: -1 });
recordAssignmentSchema.index({ patient: 1 });

module.exports = mongoose.model('RecordAssignment', recordAssignmentSchema);
