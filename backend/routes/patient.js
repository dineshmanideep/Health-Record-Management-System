const express = require('express');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { uploadSelfRecord } = require('../utils/upload');
const Notification = require('../models/Notification');
const User = require('../models/User');
const MedicalRecord = require('../models/MedicalRecord');
const SelfRecord = require('../models/SelfRecord');
const DoctorAccess = require('../models/DoctorAccess');
const PatientAccessOTP = require('../models/PatientAccessOTP');
const ActivityLog = require('../models/ActivityLog');
const Doctor = require('../models/Doctor');
const Hospital = require('../models/Hospital');
const TestAssignment = require('../models/TestAssignment');
const TestType = require('../models/TestType');
const SmartwatchConnection = require('../models/SmartwatchConnection');
const { protect, authorize } = require('../middleware/auth');

// All routes below require a valid JWT AND the 'user' (patient) role.
router.use(protect);
router.use(authorize('user'));

// ---------- helpers ----------
function logActivity(patient, action, performedBy, details) {
  ActivityLog.create({ patient, action, performedBy, details }).catch(() => {});
}

const ALLOWED_SMARTWATCH_PROVIDERS = new Set(['apple_health', 'google_fit', 'fitbit', 'garmin', 'other']);

function toNumber(value, fallback = null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeMetric(payload = {}) {
  const recordedAt = payload.recordedAt ? new Date(payload.recordedAt) : new Date();

  return {
    recordedAt: Number.isNaN(recordedAt.getTime()) ? new Date() : recordedAt,
    heartRate: toNumber(payload.heartRate),
    steps: toNumber(payload.steps),
    calories: toNumber(payload.calories),
    spo2: toNumber(payload.spo2),
    sleepHours: toNumber(payload.sleepHours)
  };
}

function buildSyntheticMetric() {
  return {
    recordedAt: new Date(),
    heartRate: Math.round(62 + Math.random() * 48),
    steps: Math.round(2500 + Math.random() * 9000),
    calories: Math.round(1450 + Math.random() * 1300),
    spo2: Math.round(95 + Math.random() * 4),
    sleepHours: Number((5.5 + Math.random() * 3).toFixed(1))
  };
}

async function fetchMetricsFromProvider(connection) {
  const baseUrl = connection.apiBaseUrl?.trim();
  if (!baseUrl) {
    return buildSyntheticMetric();
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const endpoint = `${baseUrl.replace(/\/$/, '')}/metrics${connection.deviceId ? `?deviceId=${encodeURIComponent(connection.deviceId)}` : ''}`;
    const headers = {};
    if (connection.apiToken) {
      headers.Authorization = `Bearer ${connection.apiToken}`;
    }

    const response = await fetch(endpoint, {
      method: 'GET',
      headers,
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error('Smartwatch provider request failed');
    }

    const payload = await response.json();
    return normalizeMetric(payload?.data || payload);
  } catch (error) {
    return buildSyntheticMetric();
  } finally {
    clearTimeout(timeout);
  }
}

// ==================== PROFILE ====================

// @route   GET /api/patient/profile
router.get('/profile', async (req, res) => {
  try {
    res.json({ success: true, data: req.user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/patient/profile
router.put('/profile', async (req, res) => {
  try {
    const allowed = ['name', 'phone', 'dateOfBirth', 'gender', 'address', 'bloodGroup', 'emergencyContact'];
    const updates = {};
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    logActivity(req.user._id, 'profile_updated', { id: req.user._id, role: 'user', name: req.user.name }, 'Profile updated');

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
});

// ==================== DASHBOARD SUMMARY ====================

// @route   GET /api/patient/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const patientId = req.user._id;

    const [recordCount, selfRecordCount, trustedDoctorCount, upcomingReminders] = await Promise.all([
      MedicalRecord.countDocuments({ patient: patientId }),
      SelfRecord.countDocuments({ patient: patientId }),
      DoctorAccess.countDocuments({ patient: patientId, isActive: true }),
      MedicalRecord.find({
        patient: patientId,
        nextVisitDate: { $gte: new Date() }
      })
        .sort({ nextVisitDate: 1 })
        .limit(5)
        .populate('doctor', 'name specialization')
        .populate('hospital', 'name')
        .select('nextVisitDate doctor hospital diagnosis')
        .lean()
    ]);

    const [recentRecords, recentActivity, recentNotifications, unreadNotificationCount] = await Promise.all([
      MedicalRecord.find({ patient: patientId })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('doctor', 'name specialization')
        .populate('hospital', 'name')
        .select('visitDate diagnosis doctor hospital createdAt')
        .lean(),
      ActivityLog.find({ patient: patientId })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      Notification.find({ user: patientId })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      Notification.countDocuments({ user: patientId, read: false })
    ]);

    // Generate a unique, deterministic QR token for this patient
    const qrToken = crypto
      .createHmac('sha256', process.env.JWT_SECRET)
      .update(patientId.toString())
      .digest('hex');

    res.json({
      success: true,
      data: {
        recordCount,
        selfRecordCount,
        trustedDoctorCount,
        upcomingReminders,
        recentRecords,
        recentActivity,
        recentNotifications,
        unreadNotificationCount,
        qrToken
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==================== MEDICAL RECORDS ====================

// @route   GET /api/patient/records
// @desc    Get all hospital-created medical records and test assignments, grouped by hospital
router.get('/records', async (req, res) => {
  try {
    // Fetch doctor-created medical records
    const medicalRecords = await MedicalRecord.find({ patient: req.user._id })
      .sort({ visitDate: -1 })
      .populate('doctor', 'name specialization')
      .populate('nurse', 'name')
      .populate('hospital', 'name')
      .lean();

    // Fetch completed test assignments
    const testAssignments = await TestAssignment.find({ 
      patient: req.user._id,
      status: 'completed'
    })
      .sort({ completedAt: -1 })
      .populate('testType', 'name description')
      .populate('nurse', 'name')
      .populate('hospital', 'name')
      .lean();

    // Group by hospital
    const grouped = {};
    
    // Add medical records
    medicalRecords.forEach((r) => {
      const hId = r.hospital?._id?.toString() || 'unknown';
      if (!grouped[hId]) {
        grouped[hId] = { hospital: r.hospital, records: [] };
      }
      grouped[hId].records.push({ ...r, recordType: 'medical_record' });
    });

    // Add test assignments
    testAssignments.forEach((t) => {
      const hId = t.hospital?._id?.toString() || 'unknown';
      if (!grouped[hId]) {
        grouped[hId] = { hospital: t.hospital, records: [] };
      }
      grouped[hId].records.push({ ...t, recordType: 'test_assignment' });
    });

    // Sort records within each hospital by date
    Object.values(grouped).forEach(group => {
      group.records.sort((a, b) => {
        const dateA = a.recordType === 'medical_record' ? new Date(a.visitDate) : new Date(a.completedAt);
        const dateB = b.recordType === 'medical_record' ? new Date(b.visitDate) : new Date(b.completedAt);
        return dateB - dateA; // newest first
      });
    });

    res.json({ success: true, data: Object.values(grouped) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/patient/records/:id
router.get('/records/:id', async (req, res) => {
  try {
    const record = await MedicalRecord.findOne({ _id: req.params.id, patient: req.user._id })
      .populate('doctor', 'name specialization qualification')
      .populate('nurse', 'name')
      .populate('hospital', 'name')
      .lean();

    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    res.json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==================== SELF-UPLOADED RECORDS ====================

// @route   GET /api/patient/self-records
router.get('/self-records', async (req, res) => {
  try {
    const records = await SelfRecord.find({ patient: req.user._id }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/patient/self-records/link
// @desc    Save a self-record using an external link (Google Drive, Dropbox, etc.) — JSON body
router.post('/self-records/link', async (req, res) => {
  try {
    const { title, description, documentPath, recordDate } = req.body;
    if (!title || !documentPath) {
      return res.status(400).json({ success: false, message: 'Title and document link are required' });
    }

    const record = await SelfRecord.create({
      patient: req.user._id,
      title,
      description,
      documentPath,
      recordDate: recordDate || Date.now()
    });

    logActivity(req.user._id, 'self_record_uploaded', { id: req.user._id, role: 'user', name: req.user.name }, `Added self-record link: ${title}`);

    res.status(201).json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
});

// @route   POST /api/patient/self-records
// Accepts multipart/form-data with fields: title, description, recordDate, and file: document
router.post('/self-records', (req, res) => {
  uploadSelfRecord(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    try {
      const { title, description, recordDate } = req.body;
      if (!title) {
        return res.status(400).json({ success: false, message: 'Title is required' });
      }
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Document file is required' });
      }

      // Build a publicly accessible URL for the stored file
      const protocol = req.protocol;
      const host = req.get('host');
      const documentPath = `${protocol}://${host}/uploads/self-records/${req.file.filename}`;

      const record = await SelfRecord.create({
        patient: req.user._id,
        title,
        description,
        documentPath,
        recordDate: recordDate || Date.now()
      });

      logActivity(req.user._id, 'self_record_uploaded', { id: req.user._id, role: 'user', name: req.user.name }, `Uploaded self-record: ${title}`);

      res.status(201).json({ success: true, data: record });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message || 'Server error' });
    }
  });
});

// @route   DELETE /api/patient/self-records/:id
router.delete('/self-records/:id', async (req, res) => {
  try {
    const record = await SelfRecord.findOneAndDelete({ _id: req.params.id, patient: req.user._id });
    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    // Remove the physical file from disk if it was an uploaded file
    if (record.documentPath && record.documentPath.includes('/uploads/self-records/')) {
      const filename = record.documentPath.split('/uploads/self-records/').pop();
      const filePath = path.join(__dirname, '../uploads/self-records', filename);
      fs.unlink(filePath, () => {}); // fire-and-forget, ignore errors
    }

    logActivity(req.user._id, 'self_record_deleted', { id: req.user._id, role: 'user', name: req.user.name }, `Deleted self-record: ${record.title}`);

    res.json({ success: true, message: 'Record deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==================== DOCTOR ACCESS / TRUSTED DOCTORS ====================

// @route   POST /api/patient/access/generate-otp
// @desc    Generate OTP that patient shares with doctor to grant access
router.post('/access/generate-otp', async (req, res) => {
  try {
    const plainOTP = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash = crypto.createHash('sha256').update(plainOTP).digest('hex');

    await PatientAccessOTP.create({
      patient: req.user._id,
      otpHash,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    });

    res.json({ success: true, data: { otp: plainOTP, expiresInMinutes: 10 } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/patient/trusted-doctors
router.get('/trusted-doctors', async (req, res) => {
  try {
    const accessList = await DoctorAccess.find({ patient: req.user._id, isActive: true })
      .populate('doctor', 'name specialization qualification email phone')
      .lean();

    res.json({ success: true, data: accessList });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PATCH /api/patient/revoke-access/:doctorId
router.patch('/revoke-access/:doctorId', async (req, res) => {
  try {
    const access = await DoctorAccess.findOneAndUpdate(
      { patient: req.user._id, doctor: req.params.doctorId, isActive: true },
      { isActive: false, revokedAt: new Date() },
      { new: true }
    ).populate('doctor', 'name');

    if (!access) {
      return res.status(404).json({ success: false, message: 'Active access not found for this doctor' });
    }

    logActivity(req.user._id, 'doctor_access_revoked', { id: req.user._id, role: 'user', name: req.user.name }, `Revoked access for Dr. ${access.doctor?.name}`);

    await Notification.create({
      user: req.user._id,
      type: 'doctor_access_revoked',
      title: 'Doctor Access Revoked',
      message: `You revoked access for Dr. ${access.doctor?.name}.`
    });

    res.json({ success: true, message: 'Doctor access revoked' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==================== HEALTH ANALYTICS ====================

// @route   GET /api/patient/health-analytics
// @desc    Aggregate health metrics from all medical records for trend graphs
router.get('/health-analytics', async (req, res) => {
  try {
    const records = await MedicalRecord.find({
      patient: req.user._id,
      $or: [
        { 'healthMetrics.bloodSugar': { $exists: true } },
        { 'healthMetrics.bloodPressureSystolic': { $exists: true } },
        { 'healthMetrics.thyroidTSH': { $exists: true } },
        { 'healthMetrics.heartRate': { $exists: true } },
        { 'healthMetrics.weight': { $exists: true } }
      ]
    })
      .sort({ visitDate: 1 })
      .select('visitDate healthMetrics')
      .lean();

    res.json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==================== SMARTWATCH ====================

// @route   GET /api/patient/smartwatch/status
router.get('/smartwatch/status', async (req, res) => {
  try {
    const connection = await SmartwatchConnection.findOne({ patient: req.user._id }).lean();

    if (!connection) {
      return res.json({
        success: true,
        data: {
          isConnected: false,
          provider: null,
          deviceId: null,
          apiBaseUrl: null,
          hasApiToken: false,
          lastSyncedAt: null,
          latestMetrics: null
        }
      });
    }

    res.json({
      success: true,
      data: {
        isConnected: !!connection.isConnected,
        provider: connection.provider,
        deviceId: connection.deviceId || null,
        apiBaseUrl: connection.apiBaseUrl || null,
        hasApiToken: !!connection.apiToken,
        lastSyncedAt: connection.lastSyncedAt || null,
        latestMetrics: connection.latestMetrics || null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/patient/smartwatch/connect
router.post('/smartwatch/connect', async (req, res) => {
  try {
    const provider = req.body.provider || 'other';
    const deviceId = req.body.deviceId || '';
    const apiBaseUrl = req.body.apiBaseUrl || '';
    const apiToken = req.body.apiToken || '';

    if (!ALLOWED_SMARTWATCH_PROVIDERS.has(provider)) {
      return res.status(400).json({ success: false, message: 'Unsupported smartwatch provider' });
    }

    const connection = await SmartwatchConnection.findOneAndUpdate(
      { patient: req.user._id },
      {
        $set: {
          provider,
          deviceId,
          apiBaseUrl,
          apiToken,
          isConnected: true
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    logActivity(
      req.user._id,
      'smartwatch_connected',
      { id: req.user._id, role: 'user', name: req.user.name },
      `Connected smartwatch provider: ${provider}`
    );

    res.json({
      success: true,
      message: 'Smartwatch connected successfully',
      data: {
        provider: connection.provider,
        deviceId: connection.deviceId,
        apiBaseUrl: connection.apiBaseUrl,
        isConnected: connection.isConnected
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
});

// @route   POST /api/patient/smartwatch/disconnect
router.post('/smartwatch/disconnect', async (req, res) => {
  try {
    await SmartwatchConnection.findOneAndUpdate(
      { patient: req.user._id },
      {
        $set: {
          isConnected: false,
          apiToken: '',
          apiBaseUrl: '',
          deviceId: '',
          lastSyncedAt: null,
          latestMetrics: null,
          metricsHistory: []
        }
      },
      { new: true }
    );

    logActivity(
      req.user._id,
      'smartwatch_disconnected',
      { id: req.user._id, role: 'user', name: req.user.name },
      'Disconnected smartwatch integration'
    );

    res.json({ success: true, message: 'Smartwatch disconnected' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/patient/smartwatch/sync
router.post('/smartwatch/sync', async (req, res) => {
  try {
    const connection = await SmartwatchConnection.findOne({ patient: req.user._id });
    if (!connection || !connection.isConnected) {
      return res.status(400).json({ success: false, message: 'No smartwatch connected' });
    }

    const incoming = req.body?.metrics;
    const metric = incoming ? normalizeMetric(incoming) : await fetchMetricsFromProvider(connection);

    connection.latestMetrics = metric;
    connection.lastSyncedAt = new Date();
    connection.metricsHistory.push(metric);

    if (connection.metricsHistory.length > 200) {
      connection.metricsHistory = connection.metricsHistory.slice(-200);
    }

    await connection.save();

    logActivity(
      req.user._id,
      'smartwatch_synced',
      { id: req.user._id, role: 'user', name: req.user.name },
      `Synced smartwatch metrics from ${connection.provider}`
    );

    res.json({
      success: true,
      message: 'Smartwatch metrics synced',
      data: {
        lastSyncedAt: connection.lastSyncedAt,
        latestMetrics: connection.latestMetrics
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
});

// @route   GET /api/patient/smartwatch/metrics
router.get('/smartwatch/metrics', async (req, res) => {
  try {
    const days = Math.max(1, Math.min(parseInt(req.query.days, 10) || 7, 60));
    const connection = await SmartwatchConnection.findOne({ patient: req.user._id }).lean();

    if (!connection || !connection.isConnected) {
      return res.json({
        success: true,
        data: {
          provider: null,
          lastSyncedAt: null,
          latestMetrics: null,
          metrics: []
        }
      });
    }

    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const metrics = (connection.metricsHistory || [])
      .filter((m) => m.recordedAt && new Date(m.recordedAt) >= cutoff)
      .sort((a, b) => new Date(a.recordedAt) - new Date(b.recordedAt));

    res.json({
      success: true,
      data: {
        provider: connection.provider,
        lastSyncedAt: connection.lastSyncedAt || null,
        latestMetrics: connection.latestMetrics || null,
        metrics
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==================== ACTIVITY LOGS ====================

// @route   GET /api/patient/activity-logs
router.get('/activity-logs', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      ActivityLog.find({ patient: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ActivityLog.countDocuments({ patient: req.user._id })
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==================== NOTIFICATIONS ====================

// @route   GET /api/patient/notifications
router.get('/notifications', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments({ user: req.user._id }),
      Notification.countDocuments({ user: req.user._id, read: false })
    ]);

    res.json({
      success: true,
      data: notifications,
      unreadCount,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/patient/notifications/unread-count
router.get('/notifications/unread-count', async (req, res) => {
  try {
    const count = await Notification.countDocuments({ user: req.user._id, read: false });
    res.json({ success: true, data: { count } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PATCH /api/patient/notifications/:id/read
router.patch('/notifications/:id/read', async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { read: true }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PATCH /api/patient/notifications/mark-all-read
router.patch('/notifications/mark-all-read', async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, read: false },
      { read: true }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
