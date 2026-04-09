const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Hospital = require('../models/Hospital');
const Nurse = require('../models/Nurse');
const Admin = require('../models/Admin');
const { protect, authorize } = require('../middleware/auth');

// All routes below require a valid JWT AND the 'admin' role.
router.use(protect);
router.use(authorize('admin'));

// @route   GET /api/admin/profile
// @desc    Get authenticated admin's full profile
// @access  Private — admin only
router.get('/profile', async (req, res) => {
  try {
    res.json({ success: true, data: req.user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/admin/profile
// @desc    Update authenticated admin's profile
// @access  Private — admin only
router.put('/profile', async (req, res) => {
  try {
    const allowed = ['name', 'phone', 'department'];
    const updates = {};
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const updated = await Admin.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { returnDocument: 'after', runValidators: true }
    ).select('-password');

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
});

// ── User/entity management endpoints (admin only) ────────────────────────────

// @route   GET /api/admin/users
// @desc    List all patients
// @access  Private — admin only
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/admin/doctors?status=
// @desc    List all doctors; optional ?status= filter
// @access  Private — admin only
router.get('/doctors', async (req, res) => {
  try {
    const filter = req.query.status ? { accountStatus: req.query.status } : {};
    const doctors = await Doctor.find(filter).select('-password').sort({ createdAt: -1 });
    res.json({ success: true, count: doctors.length, data: doctors });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/admin/hospitals?status=
// @desc    List all hospitals; optional ?status= filter
// @access  Private — admin only
router.get('/hospitals', async (req, res) => {
  try {
    const filter = req.query.status ? { accountStatus: req.query.status } : {};
    const hospitals = await Hospital.find(filter).select('-password').sort({ createdAt: -1 });
    res.json({ success: true, count: hospitals.length, data: hospitals });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/admin/nurses?status=
// @desc    List all nurses; optional ?status= filter
// @access  Private — admin only
router.get('/nurses', async (req, res) => {
  try {
    const filter = req.query.status ? { accountStatus: req.query.status } : {};
    const nurses = await Nurse.find(filter).select('-password').sort({ createdAt: -1 });
    res.json({ success: true, count: nurses.length, data: nurses });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PATCH /api/admin/users/:id/deactivate
// @desc    Deactivate a patient account
// @access  Private — admin only
router.patch('/users/:id/deactivate', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { returnDocument: 'after' }
    ).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── Pending approvals ────────────────────────────────────────────────────────

// @route   GET /api/admin/pending/hospitals
// @desc    List hospitals awaiting admin approval
// @access  Private — admin only
router.get('/pending/hospitals', async (req, res) => {
  try {
    const hospitals = await Hospital.find({ accountStatus: 'pending_approval' }).select('-password');
    res.json({ success: true, count: hospitals.length, data: hospitals });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PATCH /api/admin/hospitals/:id/approve
// @access  Private — admin only
router.patch('/hospitals/:id/approve', async (req, res) => {
  try {
    const hospital = await Hospital.findByIdAndUpdate(
      req.params.id,
      { accountStatus: 'active' },
      { returnDocument: 'after' }
    ).select('-password');
    if (!hospital) return res.status(404).json({ success: false, message: 'Hospital not found' });
    res.json({ success: true, data: hospital });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PATCH /api/admin/hospitals/:id/reject
// @access  Private — admin only
router.patch('/hospitals/:id/reject', async (req, res) => {
  try {
    const hospital = await Hospital.findByIdAndUpdate(
      req.params.id,
      { accountStatus: 'rejected' },
      { returnDocument: 'after' }
    ).select('-password');
    if (!hospital) return res.status(404).json({ success: false, message: 'Hospital not found' });
    res.json({ success: true, data: hospital });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/admin/pending/doctors
// @access  Private — admin only
router.get('/pending/doctors', async (req, res) => {
  try {
    const doctors = await Doctor.find({ accountStatus: 'pending_verification' }).select('-password');
    res.json({ success: true, count: doctors.length, data: doctors });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PATCH /api/admin/doctors/:id/verify
// @access  Private — admin only
router.patch('/doctors/:id/verify', async (req, res) => {
  try {
    const doctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      { accountStatus: 'verified' },
      { returnDocument: 'after' }
    ).select('-password');
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });
    res.json({ success: true, data: doctor });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/admin/pending/nurses
// @access  Private — admin only
router.get('/pending/nurses', async (req, res) => {
  try {
    const nurses = await Nurse.find({ accountStatus: 'pending_verification' }).select('-password');
    res.json({ success: true, count: nurses.length, data: nurses });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PATCH /api/admin/nurses/:id/verify
// @access  Private — admin only
router.patch('/nurses/:id/verify', async (req, res) => {
  try {
    const nurse = await Nurse.findByIdAndUpdate(
      req.params.id,
      { accountStatus: 'verified' },
      { returnDocument: 'after' }
    ).select('-password');
    if (!nurse) return res.status(404).json({ success: false, message: 'Nurse not found' });
    res.json({ success: true, data: nurse });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PATCH /api/admin/hospitals/:id/suspend
// @desc    Revoke a hospital's access (suspend)
// @access  Private — admin only
router.patch('/hospitals/:id/suspend', async (req, res) => {
  try {
    const hospital = await Hospital.findByIdAndUpdate(
      req.params.id,
      { accountStatus: 'suspended' },
      { returnDocument: 'after' }
    ).select('-password');
    if (!hospital) return res.status(404).json({ success: false, message: 'Hospital not found' });
    res.json({ success: true, data: hospital });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PATCH /api/admin/hospitals/:id/reactivate
// @desc    Reactivate a suspended/rejected hospital
// @access  Private — admin only
router.patch('/hospitals/:id/reactivate', async (req, res) => {
  try {
    const hospital = await Hospital.findByIdAndUpdate(
      req.params.id,
      { accountStatus: 'active' },
      { returnDocument: 'after' }
    ).select('-password');
    if (!hospital) return res.status(404).json({ success: false, message: 'Hospital not found' });
    res.json({ success: true, data: hospital });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PATCH /api/admin/doctors/:id/suspend
// @desc    Suspend a doctor account
// @access  Private — admin only
router.patch('/doctors/:id/suspend', async (req, res) => {
  try {
    const doctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      { accountStatus: 'suspended' },
      { returnDocument: 'after' }
    ).select('-password');
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });
    res.json({ success: true, data: doctor });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PATCH /api/admin/doctors/:id/reinstate
// @desc    Reinstate a suspended doctor
// @access  Private — admin only
router.patch('/doctors/:id/reinstate', async (req, res) => {
  try {
    const doctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      { accountStatus: 'verified' },
      { returnDocument: 'after' }
    ).select('-password');
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });
    res.json({ success: true, data: doctor });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PATCH /api/admin/nurses/:id/suspend
// @desc    Suspend a nurse account
// @access  Private — admin only
router.patch('/nurses/:id/suspend', async (req, res) => {
  try {
    const nurse = await Nurse.findByIdAndUpdate(
      req.params.id,
      { accountStatus: 'suspended' },
      { returnDocument: 'after' }
    ).select('-password');
    if (!nurse) return res.status(404).json({ success: false, message: 'Nurse not found' });
    res.json({ success: true, data: nurse });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PATCH /api/admin/nurses/:id/reinstate
// @desc    Reinstate a suspended nurse
// @access  Private — admin only
router.patch('/nurses/:id/reinstate', async (req, res) => {
  try {
    const nurse = await Nurse.findByIdAndUpdate(
      req.params.id,
      { accountStatus: 'verified' },
      { returnDocument: 'after' }
    ).select('-password');
    if (!nurse) return res.status(404).json({ success: false, message: 'Nurse not found' });
    res.json({ success: true, data: nurse });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
