const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Nurse = require('../models/Nurse');
const Hospital = require('../models/Hospital');
const HospitalOTP = require('../models/HospitalOTP');
const HospitalAffiliation = require('../models/HospitalAffiliation');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const MedicalRecord = require('../models/MedicalRecord');
const ActivityLog = require('../models/ActivityLog');
const { protect, authorize } = require('../middleware/auth');

// All routes below require a valid JWT AND the 'nurse' role.
router.use(protect);
router.use(authorize('nurse'));

// @route   GET /api/nurse/profile
// @desc    Get authenticated nurse's full profile
// @access  Private — nurse only
router.get('/profile', async (req, res) => {
  try {
    res.json({ success: true, data: req.user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/nurse/profile
// @desc    Update authenticated nurse's profile
// @access  Private — nurse only
router.put('/profile', async (req, res) => {
  try {
    const allowed = ['name', 'phone', 'qualification', 'experience', 'department', 'shift', 'assignedWard'];
    const updates = {};
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const updated = await Nurse.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Nurse not found' });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
});

// @route   POST /api/nurse/affiliate
// @desc    Affiliate this nurse with a hospital using a hospital-generated OTP
// @access  Private — nurse only
router.post('/affiliate', async (req, res) => {
  try {
    const { otp, department } = req.body;
    if (!otp) return res.status(400).json({ success: false, message: 'OTP is required' });

    const otpHash = crypto.createHash('sha256').update(String(otp)).digest('hex');
    const otpRecord = await HospitalOTP.findOne({
      otpHash,
      targetRole: 'nurse',
      used: false,
      expiresAt: { $gt: new Date() }
    });

    if (!otpRecord) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    const existing = await HospitalAffiliation.findOne({
      staffId: req.user._id,
      hospitalId: otpRecord.hospitalId
    });
    if (existing) {
      if (existing.status === 'active') {
        return res.status(409).json({ success: false, message: 'You are already affiliated with this hospital' });
      }
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
      staffRole: 'nurse',
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

// @route   GET /api/nurse/affiliations
// @desc    Get all hospital affiliations for this nurse
// @access  Private — nurse only
router.get('/affiliations', async (req, res) => {
  try {
    const affiliations = await HospitalAffiliation.find({
      staffId: req.user._id,
      staffRole: 'nurse'
    });

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

// ==================== MEDICAL RECORD CREATION ====================

// @route   POST /api/nurse/create-record
// @desc    Nurse digitizes a doctor's prescription and creates a medical record
router.post('/create-record', async (req, res) => {
  try {
    const {
      patientEmail,
      hospitalId,
      doctorId,
      visitDate,
      diagnosis,
      symptoms,
      prescriptionNotes,
      medications,
      recommendedTests,
      prescriptionDocument,
      nextVisitDate,
      healthMetrics
    } = req.body;

    if (!patientEmail || !hospitalId || !doctorId || !diagnosis) {
      return res.status(400).json({ success: false, message: 'Patient email, hospital, doctor, and diagnosis are required' });
    }

    // Verify the patient exists
    const patient = await User.findOne({ email: patientEmail, role: 'user' });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    // Verify the nurse is affiliated with this hospital
    const affiliation = await HospitalAffiliation.findOne({
      staffId: req.user._id,
      hospitalId,
      status: 'active'
    });
    if (!affiliation) {
      return res.status(403).json({ success: false, message: 'You are not affiliated with this hospital' });
    }

    // Verify the doctor exists and is verified
    const doctor = await Doctor.findById(doctorId);
    if (!doctor || doctor.accountStatus !== 'verified') {
      return res.status(404).json({ success: false, message: 'Doctor not found or not verified' });
    }

    const record = await MedicalRecord.create({
      patient: patient._id,
      hospital: hospitalId,
      doctor: doctorId,
      nurse: req.user._id,
      visitDate: visitDate || Date.now(),
      diagnosis,
      symptoms,
      prescriptionNotes,
      medications,
      recommendedTests,
      prescriptionDocument,
      nextVisitDate,
      healthMetrics
    });

    // Add record ref to patient's medicalRecords array
    await User.findByIdAndUpdate(patient._id, { $push: { medicalRecords: record._id } });

    // Log activity
    ActivityLog.create({
      patient: patient._id,
      action: 'record_created',
      performedBy: { id: req.user._id, role: 'nurse', name: req.user.name },
      details: `Medical record created by Nurse ${req.user.name} at hospital visit`
    }).catch(() => {});

    res.status(201).json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
});

module.exports = router;
