const mongoose = require('mongoose');

const smartwatchMetricSchema = new mongoose.Schema({
  recordedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  heartRate: {
    type: Number
  },
  steps: {
    type: Number
  },
  calories: {
    type: Number
  },
  spo2: {
    type: Number
  },
  sleepHours: {
    type: Number
  }
}, { _id: false });

const smartwatchConnectionSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  provider: {
    type: String,
    enum: ['apple_health', 'google_fit', 'fitbit', 'garmin', 'other'],
    default: 'other'
  },
  deviceId: {
    type: String,
    trim: true
  },
  apiBaseUrl: {
    type: String,
    trim: true
  },
  apiToken: {
    type: String,
    trim: true
  },
  isConnected: {
    type: Boolean,
    default: false
  },
  lastSyncedAt: {
    type: Date
  },
  latestMetrics: smartwatchMetricSchema,
  metricsHistory: {
    type: [smartwatchMetricSchema],
    default: []
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('SmartwatchConnection', smartwatchConnectionSchema);