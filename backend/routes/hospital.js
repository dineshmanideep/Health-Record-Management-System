const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Hospital = require('../models/Hospital');
const HospitalOTP = require('../models/HospitalOTP');
const HospitalAffiliation = require('../models/HospitalAffiliation');
const HospitalAuditLog = require('../models/HospitalAuditLog');
const Doctor = require('../models/Doctor');
const Nurse = require('../models/Nurse');
const { protect, authorize } = require('../middleware/auth');

// All routes below require a valid JWT AND the 'hospital' role.
router.use(protect);
router.use(authorize('hospital'));

// Helper to log hospital audit actions
const logAudit = (hospitalId, action, performedBy, details) =>
  HospitalAuditLog.create({ hospital: hospitalId, action, performedBy, details });

// ==================== PROFILE ====================

// @route   GET /api/hospital/profile
router.get('/profile', async (req, res) => {
  try {
    res.json({ success: true, data: req.user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/hospital/profile
router.put('/profile', async (req, res) => {
  try {
    const allowed = ['name', 'phone', 'website', 'address', 'hospitalType', 'establishedYear', 'totalBeds', 'facilities', 'services', 'emergencyServices', 'ambulanceService'];
    const updates = {};
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const updated = await Hospital.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Hospital not found' });
    }

    logAudit(req.user._id, 'profile_updated', { id: req.user._id, role: 'hospital', name: req.user.name }, 'Hospital profile updated');

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
});

// ==================== DASHBOARD ====================

// @route   GET /api/hospital/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const hospitalId = req.user._id;

    const [doctorCount, nurseCount, recentLogs] = await Promise.all([
      HospitalAffiliation.countDocuments({ hospitalId, staffRole: 'doctor', status: 'active' }),
      HospitalAffiliation.countDocuments({ hospitalId, staffRole: 'nurse', status: 'active' }),
      HospitalAuditLog.find({ hospital: hospitalId }).sort({ createdAt: -1 }).limit(10).lean()
    ]);

    res.json({
      success: true,
      data: {
        doctorCount,
        nurseCount,
        totalBeds: req.user.totalBeds || 0,
        availableBeds: req.user.availableBeds || 0,
        recentLogs
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==================== OTP / CODE GENERATION ====================

// @route   POST /api/hospital/otp/generate
router.post('/otp/generate', async (req, res) => {
  try {
    const { targetRole } = req.body;
    if (!['doctor', 'nurse'].includes(targetRole)) {
      return res.status(400).json({ success: false, message: 'targetRole must be "doctor" or "nurse"' });
    }

    await HospitalOTP.deleteMany({ hospitalId: req.user._id, targetRole, used: false });

    const otp = crypto.randomInt(100000, 999999).toString();
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await HospitalOTP.create({ hospitalId: req.user._id, otpHash, targetRole, expiresAt });

    res.json({ success: true, otp, expiresAt, targetRole });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
});

// ==================== AFFILIATIONS / STAFF LIST ====================

// @route   GET /api/hospital/affiliations
router.get('/affiliations', async (req, res) => {
  try {
    const affiliations = await HospitalAffiliation.find({
      hospitalId: req.user._id,
      status: 'active'
    }).lean();

    // Populate staff names
    const doctorIds = affiliations.filter(a => a.staffRole === 'doctor').map(a => a.staffId);
    const nurseIds = affiliations.filter(a => a.staffRole === 'nurse').map(a => a.staffId);

    const [doctors, nurses] = await Promise.all([
      Doctor.find({ _id: { $in: doctorIds } }).select('name email specialization phone').lean(),
      Nurse.find({ _id: { $in: nurseIds } }).select('name email specialization phone').lean()
    ]);

    const doctorMap = Object.fromEntries(doctors.map(d => [d._id.toString(), d]));
    const nurseMap = Object.fromEntries(nurses.map(n => [n._id.toString(), n]));

    const populated = affiliations.map(a => ({
      ...a,
      staff: a.staffRole === 'doctor' ? doctorMap[a.staffId.toString()] : nurseMap[a.staffId.toString()]
    }));

    res.json({ success: true, count: populated.length, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/hospital/doctors
router.get('/doctors', async (req, res) => {
  try {
    const affiliations = await HospitalAffiliation.find({
      hospitalId: req.user._id,
      staffRole: 'doctor',
      status: 'active'
    }).lean();

    const doctorIds = affiliations.map(a => a.staffId);
    const doctors = await Doctor.find({ _id: { $in: doctorIds } })
      .select('name email specialization phone qualification experience')
      .lean();

    const doctorMap = Object.fromEntries(doctors.map(d => [d._id.toString(), d]));

    const result = affiliations.map(a => ({
      affiliationId: a._id,
      department: a.department,
      joinedAt: a.joinedAt,
      doctor: doctorMap[a.staffId.toString()] || null
    }));

    res.json({ success: true, count: result.length, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/hospital/nurses
router.get('/nurses', async (req, res) => {
  try {
    const affiliations = await HospitalAffiliation.find({
      hospitalId: req.user._id,
      staffRole: 'nurse',
      status: 'active'
    })
      .populate('assignedDoctor', 'name specialization')
      .lean();

    const nurseIds = affiliations.map(a => a.staffId);
    const nurses = await Nurse.find({ _id: { $in: nurseIds } })
      .select('name email specialization phone qualification experience shift')
      .lean();

    const nurseMap = Object.fromEntries(nurses.map(n => [n._id.toString(), n]));

    const result = affiliations.map(a => ({
      affiliationId: a._id,
      department: a.department,
      joinedAt: a.joinedAt,
      assignedDoctor: a.assignedDoctor || null,
      nurse: nurseMap[a.staffId.toString()] || null
    }));

    res.json({ success: true, count: result.length, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==================== REVOKE AFFILIATION ====================

// @route   PATCH /api/hospital/affiliations/:id/revoke
router.patch('/affiliations/:id/revoke', async (req, res) => {
  try {
    const affiliation = await HospitalAffiliation.findOneAndUpdate(
      { _id: req.params.id, hospitalId: req.user._id, status: 'active' },
      { status: 'inactive', leftAt: new Date() },
      { new: true }
    );

    if (!affiliation) {
      return res.status(404).json({ success: false, message: 'Active affiliation not found' });
    }

    // Get staff name for audit log
    const Model = affiliation.staffRole === 'doctor' ? Doctor : Nurse;
    const staff = await Model.findById(affiliation.staffId).select('name').lean();

    const action = affiliation.staffRole === 'doctor' ? 'doctor_revoked' : 'nurse_revoked';
    logAudit(
      req.user._id,
      action,
      { id: req.user._id, role: 'hospital', name: req.user.name },
      `Revoked ${affiliation.staffRole} ${staff?.name || 'Unknown'} from hospital`
    );

    res.json({ success: true, message: `${affiliation.staffRole} association revoked` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==================== NURSE-TO-DOCTOR ASSIGNMENT ====================

// @route   POST /api/hospital/assign-nurse
router.post('/assign-nurse', async (req, res) => {
  try {
    const { affiliationId, doctorId } = req.body;

    // Verify the nurse affiliation belongs to this hospital
    const nurseAff = await HospitalAffiliation.findOne({
      _id: affiliationId,
      hospitalId: req.user._id,
      staffRole: 'nurse',
      status: 'active'
    });

    if (!nurseAff) {
      return res.status(404).json({ success: false, message: 'Nurse affiliation not found' });
    }

    // Verify the doctor is affiliated with this hospital
    const doctorAff = await HospitalAffiliation.findOne({
      hospitalId: req.user._id,
      staffId: doctorId,
      staffRole: 'doctor',
      status: 'active'
    });

    if (!doctorAff) {
      return res.status(404).json({ success: false, message: 'Doctor is not affiliated with this hospital' });
    }

    nurseAff.assignedDoctor = doctorId;
    await nurseAff.save();

    const [nurse, doctor] = await Promise.all([
      Nurse.findById(nurseAff.staffId).select('name').lean(),
      Doctor.findById(doctorId).select('name').lean()
    ]);

    logAudit(
      req.user._id,
      'nurse_assigned_to_doctor',
      { id: req.user._id, role: 'hospital', name: req.user.name },
      `Assigned nurse ${nurse?.name || 'Unknown'} to Dr. ${doctor?.name || 'Unknown'}`
    );

    res.json({ success: true, message: 'Nurse assigned to doctor' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/hospital/assign-nurse/:affiliationId
router.delete('/assign-nurse/:affiliationId', async (req, res) => {
  try {
    const nurseAff = await HospitalAffiliation.findOne({
      _id: req.params.affiliationId,
      hospitalId: req.user._id,
      staffRole: 'nurse',
      status: 'active'
    });

    if (!nurseAff) {
      return res.status(404).json({ success: false, message: 'Nurse affiliation not found' });
    }

    const [nurse, doctor] = await Promise.all([
      Nurse.findById(nurseAff.staffId).select('name').lean(),
      nurseAff.assignedDoctor ? Doctor.findById(nurseAff.assignedDoctor).select('name').lean() : null
    ]);

    nurseAff.assignedDoctor = undefined;
    await nurseAff.save();

    logAudit(
      req.user._id,
      'nurse_unassigned_from_doctor',
      { id: req.user._id, role: 'hospital', name: req.user.name },
      `Unassigned nurse ${nurse?.name || 'Unknown'} from Dr. ${doctor?.name || 'Unknown'}`
    );

    res.json({ success: true, message: 'Nurse unassigned from doctor' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==================== AUDIT LOGS ====================

// @route   GET /api/hospital/audit-logs
router.get('/audit-logs', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      HospitalAuditLog.find({ hospital: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      HospitalAuditLog.countDocuments({ hospital: req.user._id })
    ]);

    res.json({
      success: true,
      data: {
        logs,
        page,
        totalPages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
