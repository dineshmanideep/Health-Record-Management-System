const mongoose = require('mongoose');

const medicalFieldCatalogSchema = new mongoose.Schema(
  {
    canonicalKey: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    displayName: {
      type: String,
      required: true,
      trim: true
    },
    aliases: [{
      type: String,
      trim: true
    }],
    category: {
      type: String,
      trim: true
    },
    clarificationGroup: {
      type: String,
      trim: true
    },
    source: {
      type: String,
      enum: ['system', 'learned'],
      default: 'system'
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('MedicalFieldCatalog', medicalFieldCatalogSchema);
