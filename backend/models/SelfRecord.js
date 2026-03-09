const mongoose = require('mongoose');

const selfRecordSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Document title is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  documentPath: {
    type: String,
    required: [true, 'Document file is required']
  },
  recordDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

selfRecordSchema.index({ patient: 1, createdAt: -1 });

module.exports = mongoose.model('SelfRecord', selfRecordSchema);
