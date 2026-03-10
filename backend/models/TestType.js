const mongoose = require('mongoose');

const testTypeSchema = new mongoose.Schema({
  hospital: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  // Premade instructions/checklist for nurses
  instructions: [{
    step: { type: String, required: true },
    order: { type: Number, default: 0 }
  }],
  category: {
    type: String,
    enum: ['blood_test', 'imaging', 'vital_signs', 'screening', 'other'],
    default: 'other'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  estimatedDuration: {
    type: Number, // in minutes
    default: 30
  }
}, {
  timestamps: true
});

testTypeSchema.index({ hospital: 1, name: 1 });

module.exports = mongoose.model('TestType', testTypeSchema);
