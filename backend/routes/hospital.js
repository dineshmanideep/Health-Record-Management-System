const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const path = require('path');
const multer = require('multer');
const Hospital = require('../models/Hospital');
const HospitalOTP = require('../models/HospitalOTP');
const HospitalAffiliation = require('../models/HospitalAffiliation');
const HospitalAuditLog = require('../models/HospitalAuditLog');
const Doctor = require('../models/Doctor');
const Nurse = require('../models/Nurse');
const User = require('../models/User');
const TestType = require('../models/TestType');
const TestAssignment = require('../models/TestAssignment');
const PatientAccessOTP = require('../models/PatientAccessOTP');
const Notification = require('../models/Notification');
const ActivityLog = require('../models/ActivityLog');
const MedicalRecord = require('../models/MedicalRecord');
const { protect, authorize } = require('../middleware/auth');

// All routes below require a valid JWT AND the 'hospital' role.
router.use(protect);
router.use(authorize('hospital'));

// Configure multer for test result uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/test-results/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `test-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image and document files are allowed'));
    }
  }
});

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

// ==================== TEST TYPES ====================

// @route   POST /api/hospital/test-types
// @desc    Create a new test type
router.post('/test-types', async (req, res) => {
  try {
    const { name, description, instructions, category, estimatedDuration } = req.body;

    if (!name || !category) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name and category are required' 
      });
    }

    const testType = await TestType.create({
      hospital: req.user._id,
      name,
      description,
      instructions,
      category,
      estimatedDuration
    });

    await logAudit(
      req.user._id,
      'create_test_type',
      { id: req.user._id, role: 'hospital', name: req.user.name },
      { testTypeId: testType._id, name }
    );

    res.status(201).json({ success: true, data: testType });
  } catch (error) {
    console.error('Error creating test type:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
});

// @route   GET /api/hospital/test-types
// @desc    Get all test types for the hospital
router.get('/test-types', async (req, res) => {
  try {
    const { isActive } = req.query;
    
    const filter = { hospital: req.user._id };
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    const testTypes = await TestType.find(filter)
      .sort('-createdAt')
      .lean();

    res.json({ success: true, data: testTypes });
  } catch (error) {
    console.error('Error fetching test types:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
});

// @route   PUT /api/hospital/test-types/:id
// @desc    Update a test type
router.put('/test-types/:id', async (req, res) => {
  try {
    const { name, description, instructions, category, estimatedDuration, isActive } = req.body;

    const testType = await TestType.findOne({
      _id: req.params.id,
      hospital: req.user._id
    });

    if (!testType) {
      return res.status(404).json({ success: false, message: 'Test type not found' });
    }

    if (name !== undefined) testType.name = name;
    if (description !== undefined) testType.description = description;
    if (instructions !== undefined) testType.instructions = instructions;
    if (category !== undefined) testType.category = category;
    if (estimatedDuration !== undefined) testType.estimatedDuration = estimatedDuration;
    if (isActive !== undefined) testType.isActive = isActive;

    await testType.save();

    await logAudit(
      req.user._id,
      'update_test_type',
      { id: req.user._id, role: 'hospital', name: req.user.name },
      { testTypeId: testType._id, name: testType.name }
    );

    res.json({ success: true, data: testType });
  } catch (error) {
    console.error('Error updating test type:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
});

// @route   DELETE /api/hospital/test-types/:id
// @desc    Deactivate a test type
router.delete('/test-types/:id', async (req, res) => {
  try {
    const testType = await TestType.findOne({
      _id: req.params.id,
      hospital: req.user._id
    });

    if (!testType) {
      return res.status(404).json({ success: false, message: 'Test type not found' });
    }

    testType.isActive = false;
    await testType.save();

    await logAudit(
      req.user._id,
      'deactivate_test_type',
      { id: req.user._id, role: 'hospital', name: req.user.name },
      { testTypeId: testType._id, name: testType.name }
    );

    res.json({ success: true, message: 'Test type deactivated' });
  } catch (error) {
    console.error('Error deactivating test type:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
});

// ==================== PATIENT VERIFICATION ====================

// @route   POST /api/hospital/patient-access/verify-otp
// @desc    Hospital enters patient email + OTP to gain access for test assignment
router.post('/patient-access/verify-otp', async (req, res) => {
  try {
    const { patientEmail, otp } = req.body;
    
    if (!patientEmail || !otp) {
      return res.status(400).json({ 
        success: false, 
        message: 'Patient email and OTP are required' 
      });
    }

    // Find patient by email
    const patient = await User.findOne({ email: patientEmail, role: 'user' });
    if (!patient) {
      return res.status(404).json({ 
        success: false, 
        message: 'Patient not found with this email' 
      });
    }

    // Hash the OTP to match database storage
    const otpHash = crypto.createHash('sha256').update(String(otp)).digest('hex');

    // Verify OTP
    const otpRecord = await PatientAccessOTP.findOne({
      patient: patient._id,
      otpHash,
      used: false,
      expiresAt: { $gt: new Date() }
    });

    if (!otpRecord) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired OTP' 
      });
    }

    // Mark OTP as used (optional - hospitals may want to keep it for multiple assignments)
    // For now, we won't mark as used so hospitals can assign multiple tests with same OTP
    // otpRecord.used = true;
    // await otpRecord.save();

    // Log access activity
    ActivityLog.create({
      patient: patient._id,
      action: 'hospital_access_granted',
      performedBy: { 
        id: req.user._id, 
        role: 'hospital', 
        name: req.user.name 
      },
      details: `${req.user.name} granted access via email + OTP`
    }).catch(() => {});

    // Return patient details
    res.json({
      success: true,
      data: {
        patient: {
          _id: patient._id,
          name: patient.name,
          email: patient.email,
          phone: patient.phone,
          dateOfBirth: patient.dateOfBirth,
          gender: patient.gender,
          bloodGroup: patient.bloodGroup,
          address: patient.address
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/hospital/verify-patient
// @desc    Verify patient using OTP or QR code
router.post('/verify-patient', async (req, res) => {
  try {
    const { method, otp, qrToken } = req.body;

    if (!method || !['otp', 'qr'].includes(method)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid verification method' 
      });
    }

    let patientId;

    if (method === 'otp') {
      if (!otp) {
        return res.status(400).json({ success: false, message: 'OTP is required' });
      }

      // Hash the OTP to match database storage
      const otpHash = crypto.createHash('sha256').update(String(otp)).digest('hex');

      const otpRecord = await PatientAccessOTP.findOne({
        otpHash,
        expiresAt: { $gt: new Date() }
      }).populate('patient');

      if (!otpRecord) {
        return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
      }

      patientId = otpRecord.patient._id;
    } else if (method === 'qr') {
      if (!qrToken) {
        return res.status(400).json({ success: false, message: 'QR token is required' });
      }

      // Verify QR token signature
      const [userIdPart, timestamp, signature] = qrToken.split('-');
      
      if (!userIdPart || !timestamp || !signature) {
        return res.status(400).json({ success: false, message: 'Invalid QR token format' });
      }

      // Verify token age (24 hours)
      const tokenAge = Date.now() - parseInt(timestamp);
      if (tokenAge > 24 * 60 * 60 * 1000) {
        return res.status(400).json({ success: false, message: 'QR code has expired' });
      }

      // Verify signature
      const expectedSignature = crypto
        .createHmac('sha256', process.env.JWT_SECRET)
        .update(`${userIdPart}-${timestamp}`)
        .digest('hex')
        .substring(0, 8);

      if (signature !== expectedSignature) {
        return res.status(400).json({ success: false, message: 'Invalid QR token' });
      }

      patientId = userIdPart;
    }

    // Get patient details
    const patient = await User.findOne({ _id: patientId, role: 'user' })
      .select('name email phone dateOfBirth gender address bloodGroup')
      .lean();

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    res.json({ success: true, data: { patient } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/hospital/patient-records/:patientId
// @desc    Get patient medical records (hospital can view all records for verified patients)
router.get('/patient-records/:patientId', async (req, res) => {
  try {
    // Verify patient exists
    const patient = await User.findOne({ _id: req.params.patientId, role: 'user' });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    // Get all medical records for this patient
    const records = await MedicalRecord.find({ patient: req.params.patientId })
      .sort({ visitDate: -1 })
      .populate('doctor', 'name specialization email')
      .populate('nurse', 'name email')
      .populate('hospital', 'name')
      .lean();

    // Log the access
    ActivityLog.create({
      patient: req.params.patientId,
      action: 'hospital_viewed_records',
      performedBy: { id: req.user._id, role: 'hospital', name: req.user.name },
      details: `Hospital ${req.user.name} viewed medical records`
    }).catch(() => {});

    res.json({ success: true, data: records });
  } catch (error) {
    console.error('Error fetching patient records:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
});

// ==================== TEST ASSIGNMENTS ====================

// @route   POST /api/hospital/test-assignments
// @desc    Create a test assignment for a nurse
router.post('/test-assignments', async (req, res) => {
  try {
    const { testTypeId, patientId, nurseId, notes, scheduledDate } = req.body;

    if (!testTypeId || !patientId || !nurseId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Test type, patient, and nurse are required' 
      });
    }

    // Verify test type belongs to this hospital
    const testType = await TestType.findOne({
      _id: testTypeId,
      hospital: req.user._id,
      isActive: true
    });

    if (!testType) {
      return res.status(404).json({ 
        success: false, 
        message: 'Test type not found or inactive' 
      });
    }

    // Verify nurse is affiliated with this hospital
    const nurseAffiliation = await HospitalAffiliation.findOne({
      hospitalId: req.user._id,
      staffId: nurseId,
      staffRole: 'nurse',
      status: 'active'
    });

    if (!nurseAffiliation) {
      return res.status(400).json({ 
        success: false, 
        message: 'Nurse is not affiliated with this hospital' 
      });
    }

    // Verify patient exists
    const patient = await User.findOne({ _id: patientId, role: 'user' });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const testAssignment = await TestAssignment.create({
      hospital: req.user._id,
      testType: testTypeId,
      patient: patientId,
      nurse: nurseId,
      notes,
      scheduledDate
    });

    // Create notification for nurse
    await Notification.create({
      user: nurseId,
      userModel: 'Nurse',
      type: 'test_assigned',
      title: 'New Test Assignment',
      message: `You have been assigned a new test: ${testType.name} for patient ${patient.name}`
    });

    await logAudit(
      req.user._id,
      'create_test_assignment',
      { id: req.user._id, role: 'hospital', name: req.user.name },
      { 
        testAssignmentId: testAssignment._id, 
        testTypeName: testType.name,
        nurseId,
        patientId 
      }
    );

    const populatedAssignment = await TestAssignment.findById(testAssignment._id)
      .populate('testType', 'name category')
      .populate('patient', 'name email')
      .populate('nurse', 'name email')
      .lean();

    res.status(201).json({ success: true, data: populatedAssignment });
  } catch (error) {
    console.error('Error creating test assignment:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
});

// @route   GET /api/hospital/test-assignments
// @desc    Get all test assignments for the hospital
router.get('/test-assignments', async (req, res) => {
  try {
    const { status, nurseId, patientId, testTypeId } = req.query;
    
    const filter = { hospital: req.user._id };
    if (status) filter.status = status;
    if (nurseId) filter.nurse = nurseId;
    if (patientId) filter.patient = patientId;
    if (testTypeId) filter.testType = testTypeId;

    const assignments = await TestAssignment.find(filter)
      .populate('testType', 'name category estimatedDuration')
      .populate('patient', 'name email phone')
      .populate('nurse', 'name email')
      .sort('-createdAt')
      .lean();

    res.json({ success: true, data: assignments });
  } catch (error) {
    console.error('Error fetching test assignments:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
});

// @route   GET /api/hospital/test-assignments/:id
// @desc    Get single test assignment
router.get('/test-assignments/:id', async (req, res) => {
  try {
    const assignment = await TestAssignment.findOne({
      _id: req.params.id,
      hospital: req.user._id
    })
      .populate('testType')
      .populate('patient', 'name email phone dateOfBirth gender')
      .populate('nurse', 'name email phone')
      .lean();

    if (!assignment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Test assignment not found' 
      });
    }

    res.json({ success: true, data: assignment });
  } catch (error) {
    console.error('Error fetching test assignment:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
});

// @route   PATCH /api/hospital/test-assignments/:id/cancel
// @desc    Cancel a test assignment
router.patch('/test-assignments/:id/cancel', async (req, res) => {
  try {
    const assignment = await TestAssignment.findOne({
      _id: req.params.id,
      hospital: req.user._id
    });

    if (!assignment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Test assignment not found' 
      });
    }

    if (assignment.status === 'completed') {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot cancel completed assignment' 
      });
    }

    assignment.status = 'cancelled';
    await assignment.save();

    // Notify nurse
    await Notification.create({
      user: assignment.nurse,
      userModel: 'Nurse',
      type: 'test_cancelled',
      title: 'Test Assignment Cancelled',
      message: `A test assignment has been cancelled by the hospital`
    });

    await logAudit(
      req.user._id,
      'cancel_test_assignment',
      { id: req.user._id, role: 'hospital', name: req.user.name },
      { testAssignmentId: assignment._id }
    );

    res.json({ success: true, message: 'Test assignment cancelled' });
  } catch (error) {
    console.error('Error cancelling test assignment:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
});

module.exports = router;

