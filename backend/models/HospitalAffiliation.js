const mongoose = require('mongoose');

// Tracks many-to-many relationships between doctors/nurses and hospitals.
// A staff member can be affiliated with multiple hospitals simultaneously.
const hospitalAffiliationSchema = new mongoose.Schema(
  {
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
      // Points to a Doctor or Nurse document depending on staffRole
    },
    staffRole: {
      type: String,
      required: true,
      enum: ['doctor', 'nurse']
    },
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      required: true
    },
    department: {
      type: String
    },
    assignedDoctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor'
      // Only relevant for nurse affiliations — which doctor this nurse assists
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    leftAt: {
      type: Date
    }
  },
  { timestamps: true }
);

// Prevent duplicate affiliations for the same staff+hospital pair
hospitalAffiliationSchema.index({ staffId: 1, hospitalId: 1 }, { unique: true });

module.exports = mongoose.model('HospitalAffiliation', hospitalAffiliationSchema);
