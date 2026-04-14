const mongoose = require('mongoose');

const uploadProcessingSessionSchema = new mongoose.Schema(
  {
    nurse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Nurse',
      required: true
    },
    flowType: {
      type: String,
      enum: ['medical_record', 'test_assignment'],
      required: true
    },
    assignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    documents: [{
      filePath: { type: String, required: true, trim: true },
      category: { type: String, enum: ['test_report', 'diagnosis_report'], default: 'test_report' },
      reportTag: { type: String, trim: true },
      uploadedAt: { type: Date, default: Date.now }
    }],
    fallbackText: {
      type: String,
      trim: true
    },
    rawResponse: {
      type: String,
      trim: true
    },
    validatedData: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    ambiguities: [{
      code: { type: String, trim: true },
      fieldKey: { type: String, trim: true },
      rawFieldName: { type: String, trim: true },
      message: { type: String, trim: true },
      options: [{ type: String, trim: true }]
    }],
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000)
    }
  },
  { timestamps: true }
);

uploadProcessingSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
uploadProcessingSessionSchema.index({ nurse: 1, flowType: 1, createdAt: -1 });

module.exports = mongoose.model('UploadProcessingSession', uploadProcessingSessionSchema);
