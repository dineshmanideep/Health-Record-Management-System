const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Hospital = require('../models/Hospital');
const HospitalOTP = require('../models/HospitalOTP');
const HospitalAffiliation = require('../models/HospitalAffiliation');
const { protect, authorize } = require('../middleware/auth');

// All routes below require a valid JWT AND the 'hospital' role.
router.use(protect);
router.use(authorize('hospital'));

// @route   GET /api/hospital/profile
// @desc    Get authenticated hospital's full profile
// @access  Private — hospital only
router.get('/profile', async (req, res) => {
  try {
    res.json({ success: true, data: req.user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/hospital/profile
// @desc    Update authenticated hospital's profile
// @access  Private — hospital only
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

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
});

// @route   POST /api/hospital/otp/generate
// @desc    Generate a one-time 6-digit OTP for a doctor or nurse to affiliate with this hospital
// @access  Private — hospital only
router.post('/otp/generate', async (req, res) => {
  try {
    const { targetRole } = req.body;
    if (!['doctor', 'nurse'].includes(targetRole)) {
      return res.status(400).json({ success: false, message: 'targetRole must be "doctor" or "nurse"' });
    }

    // Invalidate any existing unused OTPs for this hospital + role
    await HospitalOTP.deleteMany({ hospitalId: req.user._id, targetRole, used: false });

    const otp = crypto.randomInt(100000, 999999).toString();
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await HospitalOTP.create({ hospitalId: req.user._id, otpHash, targetRole, expiresAt });

    res.json({ success: true, otp, expiresAt, targetRole });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
});

// @route   GET /api/hospital/affiliations
// @desc    List all staff currently affiliated with this hospital
// @access  Private — hospital only
router.get('/affiliations', async (req, res) => {
  try {
    const affiliations = await HospitalAffiliation.find({
      hospitalId: req.user._id,
      status: 'active'
    });
    res.json({ success: true, count: affiliations.length, data: affiliations });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
