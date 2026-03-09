const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Doctor = require('../models/Doctor');
const Hospital = require('../models/Hospital');
const HospitalOTP = require('../models/HospitalOTP');
const HospitalAffiliation = require('../models/HospitalAffiliation');
const User = require('../models/User');
const PatientAccessOTP = require('../models/PatientAccessOTP');
const DoctorAccess = require('../models/DoctorAccess');
const MedicalRecord = require('../models/MedicalRecord');
const ActivityLog = require('../models/ActivityLog');
const { protect, authorize } = require('../middleware/auth');

// All routes below require a valid JWT AND the 'doctor' role.
router.use(protect);
router.use(authorize('doctor'));

// @route   GET /api/doctor/profile
// @desc    Get authenticated doctor's full profile
// @access  Private — doctor only
router.get('/profile', async (req, res) => {
  try {
    res.json({ success: true, data: req.user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/doctor/profile
// @desc    Update authenticated doctor's profile
// @access  Private — doctor only
router.put('/profile', async (req, res) => {
  try {
    const allowed = ['name', 'phone', 'specialization', 'qualification', 'experience', 'consultationFee', 'department', 'availableSlots'];
    const updates = {};
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const updated = await Doctor.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
});

// @route   POST /api/doctor/affiliate
// @desc    Affiliate this doctor with a hospital using a hospital-generated OTP
// @access  Private — doctor only
router.post('/affiliate', async (req, res) => {
  try {
    const { otp, department } = req.body;
    if (!otp) return res.status(400).json({ success: false, message: 'OTP is required' });

    const otpHash = crypto.createHash('sha256').update(String(otp)).digest('hex');
    const otpRecord = await HospitalOTP.findOne({
      otpHash,
      targetRole: 'doctor',
      used: false,
      expiresAt: { $gt: new Date() }
    });

    if (!otpRecord) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    // Prevent duplicate affiliation
    const existing = await HospitalAffiliation.findOne({
      staffId: req.user._id,
      hospitalId: otpRecord.hospitalId
    });
    if (existing) {
      if (existing.status === 'active') {
        return res.status(409).json({ success: false, message: 'You are already affiliated with this hospital' });
      }
      // Reactivate inactive affiliation
      existing.status = 'active';
      existing.joinedAt = new Date();
      existing.leftAt = undefined;
      if (department) existing.department = department;
      await existing.save();
      await HospitalOTP.findByIdAndUpdate(otpRecord._id, { used: true, usedBy: req.user._id });
      const hospital = await Hospital.findById(otpRecord.hospitalId).select('name address');
      return res.json({ success: true, data: existing, hospital });
    }

    const affiliation = await HospitalAffiliation.create({
      staffId: req.user._id,
      staffRole: 'doctor',
      hospitalId: otpRecord.hospitalId,
      department: department || ''
    });

    await HospitalOTP.findByIdAndUpdate(otpRecord._id, { used: true, usedBy: req.user._id });

    const hospital = await Hospital.findById(otpRecord.hospitalId).select('name address');
    res.status(201).json({ success: true, data: affiliation, hospital });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
});

// @route   GET /api/doctor/affiliations
// @desc    Get all hospital affiliations for this doctor
// @access  Private — doctor only
router.get('/affiliations', async (req, res) => {
  try {
    const affiliations = await HospitalAffiliation.find({
      staffId: req.user._id,
      staffRole: 'doctor'
    });

    // Manually populate hospital details
    const populated = await Promise.all(
      affiliations.map(async (aff) => {
        const hospital = await Hospital.findById(aff.hospitalId).select('name address phone email hospitalType');
        return { ...aff.toObject(), hospital };
      })
    );

    res.json({ success: true, count: populated.length, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==================== PATIENT ACCESS (OTP) ====================

// @route   POST /api/doctor/patient-access/verify-otp
// @desc    Doctor enters patient email + OTP to gain access to records
router.post('/patient-access/verify-otp', async (req, res) => {
  try {
    const { patientEmail, otp } = req.body;
    if (!patientEmail || !otp) {
      return res.status(400).json({ success: false, message: 'Patient email and OTP are required' });
    }

    const patient = await User.findOne({ email: patientEmail, role: 'user' });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const otpHash = crypto.createHash('sha256').update(String(otp)).digest('hex');
    const otpRecord = await PatientAccessOTP.findOne({
      patient: patient._id,
      otpHash,
      used: false,
      expiresAt: { $gt: new Date() }
    });

    if (!otpRecord) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    // Mark OTP as used
    otpRecord.used = true;
    otpRecord.usedByDoctor = req.user._id;
    await otpRecord.save();

    // Create or reactivate DoctorAccess
    let access = await DoctorAccess.findOne({ patient: patient._id, doctor: req.user._id });
    if (access) {
      access.isActive = true;
      access.accessMethod = 'otp';
      access.grantedAt = new Date();
      access.revokedAt = undefined;
      await access.save();
    } else {
      access = await DoctorAccess.create({
        patient: patient._id,
        doctor: req.user._id,
        accessMethod: 'otp'
      });
    }

    // Add patient to doctor's patients list if not already there
    await Doctor.findByIdAndUpdate(req.user._id, { $addToSet: { patients: patient._id } });

    // Log activity
    ActivityLog.create({
      patient: patient._id,
      action: 'doctor_access_granted',
      performedBy: { id: req.user._id, role: 'doctor', name: req.user.name },
      details: `Dr. ${req.user.name} granted access via OTP`
    }).catch(() => {});

    res.json({ success: true, message: 'Access granted', data: { patientName: patient.name } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
});

// @route   GET /api/doctor/patient-records/:patientId
// @desc    View a patient's medical records (only if doctor has active access)
router.get('/patient-records/:patientId', async (req, res) => {
  try {
    const access = await DoctorAccess.findOne({
      patient: req.params.patientId,
      doctor: req.user._id,
      isActive: true
    });

    if (!access) {
      return res.status(403).json({ success: false, message: 'You do not have access to this patient\'s records' });
    }

    const records = await MedicalRecord.find({ patient: req.params.patientId })
      .sort({ visitDate: -1 })
      .populate('doctor', 'name specialization')
      .populate('nurse', 'name')
      .populate('hospital', 'name')
      .lean();

    // Log the access
    ActivityLog.create({
      patient: req.params.patientId,
      action: 'doctor_viewed_records',
      performedBy: { id: req.user._id, role: 'doctor', name: req.user.name },
      details: `Dr. ${req.user.name} viewed medical records`
    }).catch(() => {});

    res.json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/doctor/my-patients
// @desc    Get list of patients who have granted this doctor access
router.get('/my-patients', async (req, res) => {
  try {
    const accessList = await DoctorAccess.find({ doctor: req.user._id, isActive: true })
      .populate('patient', 'name email phone dateOfBirth gender bloodGroup')
      .lean();

    res.json({ success: true, data: accessList });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
