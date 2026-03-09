const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const path = require('path');
const multer = require('multer');
const Nurse = require('../models/Nurse');
const Hospital = require('../models/Hospital');
const HospitalOTP = require('../models/HospitalOTP');
const HospitalAffiliation = require('../models/HospitalAffiliation');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const MedicalRecord = require('../models/MedicalRecord');
const ActivityLog = require('../models/ActivityLog');
const Notification = require('../models/Notification');
const HospitalAuditLog = require('../models/HospitalAuditLog');
const DoctorAccess = require('../models/DoctorAccess');
const { protect, authorize } = require('../middleware/auth');

// Multer config for prescription uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads', 'prescriptions')),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: (req, file, cb) => {
  const allowed = ['.pdf', '.jpg', '.jpeg', '.png'];
  const ext = path.extname(file.originalname).toLowerCase();
  cb(null, allowed.includes(ext));
}});

// Specialization-specific health metric templates
const SPECIALIZATION_FIELDS = {
  'Cardiology': [
    { key: 'bloodPressureSystolic', label: 'Blood Pressure (Systolic)', unit: 'mmHg', type: 'number' },
    { key: 'bloodPressureDiastolic', label: 'Blood Pressure (Diastolic)', unit: 'mmHg', type: 'number' },
    { key: 'heartRate', label: 'Heart Rate', unit: 'bpm', type: 'number' },
    { key: 'weight', label: 'Weight', unit: 'kg', type: 'number' }
  ],
  'Endocrinology': [
    { key: 'bloodSugar', label: 'Blood Sugar Level', unit: 'mg/dL', type: 'number' },
    { key: 'thyroidTSH', label: 'Thyroid TSH', unit: 'mIU/L', type: 'number' },
    { key: 'weight', label: 'Weight', unit: 'kg', type: 'number' },
    { key: 'height', label: 'Height', unit: 'cm', type: 'number' }
  ],
  'General Medicine': [
    { key: 'bloodPressureSystolic', label: 'Blood Pressure (Systolic)', unit: 'mmHg', type: 'number' },
    { key: 'bloodPressureDiastolic', label: 'Blood Pressure (Diastolic)', unit: 'mmHg', type: 'number' },
    { key: 'heartRate', label: 'Heart Rate', unit: 'bpm', type: 'number' },
    { key: 'temperature', label: 'Temperature', unit: '°F', type: 'number' },
    { key: 'weight', label: 'Weight', unit: 'kg', type: 'number' },
    { key: 'height', label: 'Height', unit: 'cm', type: 'number' }
  ],
  'Orthopedics': [
    { key: 'weight', label: 'Weight', unit: 'kg', type: 'number' },
    { key: 'height', label: 'Height', unit: 'cm', type: 'number' }
  ],
  'Dermatology': [
    { key: 'temperature', label: 'Temperature', unit: '°F', type: 'number' }
  ],
  'Neurology': [
    { key: 'bloodPressureSystolic', label: 'Blood Pressure (Systolic)', unit: 'mmHg', type: 'number' },
    { key: 'bloodPressureDiastolic', label: 'Blood Pressure (Diastolic)', unit: 'mmHg', type: 'number' },
    { key: 'heartRate', label: 'Heart Rate', unit: 'bpm', type: 'number' },
    { key: 'temperature', label: 'Temperature', unit: '°F', type: 'number' }
  ],
  'Pediatrics': [
    { key: 'weight', label: 'Weight', unit: 'kg', type: 'number' },
    { key: 'height', label: 'Height', unit: 'cm', type: 'number' },
    { key: 'temperature', label: 'Temperature', unit: '°F', type: 'number' },
    { key: 'heartRate', label: 'Heart Rate', unit: 'bpm', type: 'number' }
  ],
  'Pulmonology': [
    { key: 'heartRate', label: 'Heart Rate', unit: 'bpm', type: 'number' },
    { key: 'temperature', label: 'Temperature', unit: '°F', type: 'number' },
    { key: 'bloodPressureSystolic', label: 'Blood Pressure (Systolic)', unit: 'mmHg', type: 'number' },
    { key: 'bloodPressureDiastolic', label: 'Blood Pressure (Diastolic)', unit: 'mmHg', type: 'number' }
  ]
};

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

    HospitalAuditLog.create({ hospital: otpRecord.hospitalId, action: 'nurse_joined', performedBy: { id: req.user._id, role: 'nurse', name: req.user.name }, details: `Nurse ${req.user.name} joined the hospital` });

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

// @route   GET /api/nurse/dashboard
// @desc    Get dashboard stats for this nurse
router.get('/dashboard', async (req, res) => {
  try {
    const affiliations = await HospitalAffiliation.find({ staffId: req.user._id, staffRole: 'nurse', status: 'active' });
    const affiliationCount = affiliations.length;

    // Find assigned doctors
    const assignedDoctorIds = affiliations.filter(a => a.assignedDoctor).map(a => a.assignedDoctor);
    const assignedDoctors = await Doctor.find({ _id: { $in: assignedDoctorIds } }).select('name specialization email');

    const recordCount = await MedicalRecord.countDocuments({ nurse: req.user._id });

    // Recent records created by this nurse
    const recentRecords = await MedicalRecord.find({ nurse: req.user._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('patient', 'name')
      .populate('doctor', 'name specialization')
      .populate('hospital', 'name')
      .lean();

    res.json({
      success: true,
      data: { affiliationCount, assignedDoctors, recordCount, recentRecords }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/nurse/assigned-doctors
// @desc    Get list of doctors this nurse is assigned to (from hospital affiliations)
router.get('/assigned-doctors', async (req, res) => {
  try {
    const affiliations = await HospitalAffiliation.find({
      staffId: req.user._id,
      staffRole: 'nurse',
      status: 'active',
      assignedDoctor: { $ne: null }
    }).lean();

    const doctorIds = affiliations.map(a => a.assignedDoctor);
    const doctors = await Doctor.find({ _id: { $in: doctorIds } }).select('name specialization email phone department');

    // Combine with hospital info
    const result = await Promise.all(
      affiliations.map(async (aff) => {
        const doctor = doctors.find(d => d._id.toString() === aff.assignedDoctor.toString());
        const hospital = await Hospital.findById(aff.hospitalId).select('name');
        return {
          affiliationId: aff._id,
          hospitalId: aff.hospitalId,
          hospitalName: hospital?.name || 'Unknown',
          doctor: doctor || null
        };
      })
    );

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/nurse/specialization-fields/:specialization
// @desc    Get dynamic health metric fields for a doctor's specialization
router.get('/specialization-fields/:specialization', async (req, res) => {
  try {
    const spec = req.params.specialization;
    const fields = SPECIALIZATION_FIELDS[spec] || SPECIALIZATION_FIELDS['General Medicine'];
    res.json({ success: true, data: fields, specialization: spec });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/nurse/my-records
// @desc    Get all medical records created by this nurse
router.get('/my-records', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      MedicalRecord.find({ nurse: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('patient', 'name email')
        .populate('doctor', 'name specialization')
        .populate('hospital', 'name')
        .lean(),
      MedicalRecord.countDocuments({ nurse: req.user._id })
    ]);

    res.json({ success: true, data: records, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/nurse/audit-logs
// @desc    Get audit trail for actions by this nurse
router.get('/audit-logs', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      ActivityLog.find({ 'performedBy.id': req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('patient', 'name')
        .lean(),
      ActivityLog.countDocuments({ 'performedBy.id': req.user._id })
    ]);

    res.json({ success: true, data: logs, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==================== MEDICAL RECORD CREATION ====================

// @route   POST /api/nurse/create-record
// @desc    Nurse digitizes a doctor's prescription and creates a medical record
router.post('/create-record', upload.single('prescriptionFile'), async (req, res) => {
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

    // Verify the nurse is assigned to this doctor
    if (!affiliation.assignedDoctor || affiliation.assignedDoctor.toString() !== doctorId) {
      // Check other affiliations at the same hospital
      const otherAff = await HospitalAffiliation.findOne({
        staffId: req.user._id,
        hospitalId,
        assignedDoctor: doctorId,
        status: 'active'
      });
      if (!otherAff) {
        return res.status(403).json({ success: false, message: 'You are not assigned to this doctor' });
      }
    }

    // Verify the doctor exists and is verified
    const doctor = await Doctor.findById(doctorId);
    if (!doctor || doctor.accountStatus !== 'verified') {
      return res.status(404).json({ success: false, message: 'Doctor not found or not verified' });
    }

    // Verify doctor has access to this patient
    const doctorAccess = await DoctorAccess.findOne({ patient: patient._id, doctor: doctorId, isActive: true });
    if (!doctorAccess) {
      return res.status(403).json({ success: false, message: 'Doctor does not have access to this patient' });
    }

    // Handle prescription document - file upload or link
    let prescriptionDoc = prescriptionDocument || '';
    if (req.file) {
      prescriptionDoc = `/uploads/prescriptions/${req.file.filename}`;
    }

    // Parse medications if sent as string
    let parsedMedications = medications;
    if (typeof medications === 'string') {
      try { parsedMedications = JSON.parse(medications); } catch { parsedMedications = []; }
    }

    // Parse healthMetrics if sent as string
    let parsedMetrics = healthMetrics;
    if (typeof healthMetrics === 'string') {
      try { parsedMetrics = JSON.parse(healthMetrics); } catch { parsedMetrics = {}; }
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
      medications: parsedMedications,
      recommendedTests,
      prescriptionDocument: prescriptionDoc,
      nextVisitDate,
      healthMetrics: parsedMetrics
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

    // Notify patient about new record
    Notification.create({
      user: patient._id,
      type: 'record_created',
      title: 'New Medical Record',
      message: `A new medical record was created by Nurse ${req.user.name} from your hospital visit.`
    }).catch(() => {});

    res.status(201).json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
});

module.exports = router;
