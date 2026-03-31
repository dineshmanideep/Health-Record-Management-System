const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
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
const RecordAssignment = require('../models/RecordAssignment');
const TestAssignment = require('../models/TestAssignment');
const TestType = require('../models/TestType');
const { protect, authorize } = require('../middleware/auth');

// Multer config for prescription uploads
const ensureUploadDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const prescriptionStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads', 'prescriptions');
    ensureUploadDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ 
  storage: prescriptionStorage, 
  limits: { fileSize: 10 * 1024 * 1024 }, 
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  }
});

// Multer config for test result uploads
const testResultStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads', 'test-results');
    ensureUploadDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, `test-${Date.now()}-${file.originalname}`)
});
const uploadTestResults = multer({ 
  storage: testResultStorage, 
  limits: { fileSize: 10 * 1024 * 1024 }, 
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  }
});

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
// NOTE: One nurse can only be affiliated with ONE hospital at a time
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

    // Check if nurse already has an active affiliation with ANY hospital
    const existingAffiliation = await HospitalAffiliation.findOne({
      staffId: req.user._id,
      staffRole: 'nurse',
      status: 'active'
    });

    if (existingAffiliation) {
      const currentHospital = await Hospital.findById(existingAffiliation.hospitalId).select('name');
      return res.status(409).json({ 
        success: false, 
        message: `You are already affiliated with ${currentHospital?.name || 'another hospital'}. A nurse can only work at one hospital at a time.` 
      });
    }

    // Check if there's an inactive affiliation with this specific hospital
    const existing = await HospitalAffiliation.findOne({
      staffId: req.user._id,
      hospitalId: otpRecord.hospitalId
    });
    
    if (existing && existing.status === 'inactive') {
      // Reactivate the affiliation
      existing.status = 'active';
      existing.joinedAt = new Date();
      existing.leftAt = undefined;
      if (department) existing.department = department;
      await existing.save();
      await HospitalOTP.findByIdAndUpdate(otpRecord._id, { used: true, usedBy: req.user._id });
      const hospital = await Hospital.findById(otpRecord.hospitalId).select('name address');
      return res.json({ success: true, data: existing, hospital });
    }

    // Create new affiliation
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
// @desc    Get hospital affiliation for this nurse (single hospital only)
// @access  Private — nurse only
router.get('/affiliations', async (req, res) => {
  try {
    // One nurse can only be affiliated with ONE hospital
    const affiliation = await HospitalAffiliation.findOne({
      staffId: req.user._id,
      staffRole: 'nurse',
      status: 'active'
    });

    if (!affiliation) {
      return res.json({ success: true, data: null });
    }

    const hospital = await Hospital.findById(affiliation.hospitalId).select('name address phone email hospitalType');
    const result = { ...affiliation.toObject(), hospital };

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/nurse/dashboard
// @desc    Get dashboard stats for this nurse
router.get('/dashboard', async (req, res) => {
  try {
    // One nurse = one hospital
    const affiliation = await HospitalAffiliation.findOne({ 
      staffId: req.user._id, 
      staffRole: 'nurse', 
      status: 'active' 
    });

    let hospital = null;
    let assignedDoctor = null;

    if (affiliation) {
      hospital = await Hospital.findById(affiliation.hospitalId).select('name address');
      if (affiliation.assignedDoctor) {
        assignedDoctor = await Doctor.findById(affiliation.assignedDoctor).select('name specialization email');
      }
    }

    const recordCount = await MedicalRecord.countDocuments({ nurse: req.user._id });

    // Recent records created by this nurse
    const recentRecords = await MedicalRecord.find({ nurse: req.user._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('patient', 'name')
      .populate('doctor', 'name specialization')
      .populate('hospital', 'name')
      .lean();

    // Pending doctor assignments count
    const pendingAssignmentsCount = await RecordAssignment.countDocuments({ 
      nurse: req.user._id, 
      status: 'pending' 
    });

    // Recent pending assignments
    const pendingAssignments = await RecordAssignment.find({ 
      nurse: req.user._id, 
      status: 'pending' 
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('doctor', 'name specialization')
      .populate('patient', 'name patientId')
      .populate('hospital', 'name')
      .lean();

    // Pending hospital test assignments count
    const pendingTestAssignmentsCount = await TestAssignment.countDocuments({ 
      nurse: req.user._id, 
      status: 'pending' 
    });

    // Recent pending test assignments
    const pendingTestAssignments = await TestAssignment.find({ 
      nurse: req.user._id, 
      status: 'pending' 
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('testType', 'name category')
      .populate('patient', 'name patientId')
      .populate('hospital', 'name')
      .lean();

    res.json({
      success: true,
      data: { 
        hospital,
        assignedDoctor, 
        recordCount, 
        recentRecords,
        pendingAssignmentsCount,
        pendingAssignments,
        pendingTestAssignmentsCount,
        pendingTestAssignments,
        isAffiliated: !!affiliation
      }
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

// ==================== DOCTOR RECORD ASSIGNMENTS ====================

// @route   GET /api/nurse/assignments
// @desc    Get all record assignments assigned to this nurse
router.get('/assignments', async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { nurse: req.user._id };
    if (status) filter.status = status;

    const assignments = await RecordAssignment.find(filter)
      .sort({ createdAt: -1 })
      .populate('doctor', 'name specialization email phone')
      .populate('patient', 'name patientId email gender bloodGroup dateOfBirth')
      .populate('hospital', 'name')
      .populate('medicalRecord')
      .lean();

    res.json({ success: true, count: assignments.length, data: assignments });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/nurse/assignments/:id
// @desc    Get a specific assignment details
router.get('/assignments/:id', async (req, res) => {
  try {
    const assignment = await RecordAssignment.findOne({ 
      _id: req.params.id, 
      nurse: req.user._id 
    })
      .populate('doctor', 'name specialization email phone')
      .populate('patient', 'name patientId email gender bloodGroup dateOfBirth phone address')
      .populate('hospital', 'name address')
      .populate('medicalRecord');

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    res.json({ success: true, data: assignment });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PATCH /api/nurse/assignments/:id/start
// @desc    Mark assignment as in progress
router.patch('/assignments/:id/start', async (req, res) => {
  try {
    const assignment = await RecordAssignment.findOne({ 
      _id: req.params.id, 
      nurse: req.user._id 
    });

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    if (assignment.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: 'Assignment is not in pending status' 
      });
    }

    assignment.status = 'in_progress';
    assignment.startedAt = new Date();
    await assignment.save();

    res.json({ success: true, data: assignment });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/nurse/assignments/:id/complete
// @desc    Complete an assignment by creating the medical record with prescription and categorized files
router.post('/assignments/:id/complete', upload.array('medicalFiles', 10), async (req, res) => {
  try {
    const assignment = await RecordAssignment.findOne({ 
      _id: req.params.id, 
      nurse: req.user._id 
    }).populate('doctor', 'name').populate('patient', 'name patientId');

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    if (assignment.status === 'completed') {
      return res.status(400).json({ 
        success: false, 
        message: 'Assignment already completed' 
      });
    }

    if (assignment.status === 'cancelled') {
      return res.status(400).json({ 
        success: false, 
        message: 'Assignment was cancelled' 
      });
    }

    const { prescription } = req.body;

    if (!prescription || !prescription.trim()) {
      return res.status(400).json({ success: false, message: 'Prescription is required' });
    }

    // Build categorized documents array
    const categorizedDocuments = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach((file, index) => {
        const categoryFromIndexedKey = req.body[`fileCategories[${index}]`];
        const categoryFromArray = Array.isArray(req.body.fileCategories)
          ? req.body.fileCategories[index]
          : undefined;
        const rawCategory = categoryFromIndexedKey || categoryFromArray || 'test_report';
        const category = ['test_report', 'diagnosis_report'].includes(rawCategory)
          ? rawCategory
          : 'test_report';
        categorizedDocuments.push({
          filePath: `/uploads/prescriptions/${file.filename}`,
          category: category,
          uploadedAt: new Date()
        });
      });
    }

    // Create the medical record
    const record = await MedicalRecord.create({
      patient: assignment.patient,
      hospital: assignment.hospital,
      doctor: assignment.doctor,
      nurse: req.user._id,
      visitDate: Date.now(),
      diagnosis: 'See Prescription',
      prescriptionNotes: prescription,
      categorizedDocuments,
      prescriptionDocuments: categorizedDocuments.map((doc) => doc.filePath),
      prescriptionDocument: categorizedDocuments[0]?.filePath
    });

    // Add to patient's medicalRecords array
    await User.findByIdAndUpdate(assignment.patient, { 
      $push: { medicalRecords: record._id } 
    });

    // Update assignment
    assignment.status = 'completed';
    assignment.completedAt = new Date();
    assignment.medicalRecord = record._id;
    await assignment.save();

    // Log activity
    ActivityLog.create({
      patient: assignment.patient,
      action: 'record_created',
      performedBy: { id: req.user._id, role: 'nurse', name: req.user.name },
      details: `Medical record created by Nurse ${req.user.name} (assigned by Dr. ${assignment.doctor?.name || 'Unknown'})`
    }).catch(() => {});

    // Notify patient
    Notification.create({
      user: assignment.patient,
      type: 'record_created',
      title: 'New Medical Record',
      message: `A new medical record was created by Nurse ${req.user.name}.`
    }).catch(() => {});

    // Notify doctor
    Notification.create({
      user: assignment.doctor,
      userModel: 'Doctor',
      type: 'general',
      title: 'Assignment Completed',
      message: `Nurse ${req.user.name} completed the record assignment for patient ${assignment.patient?.name || 'Unknown'}.`
    }).catch(() => {});

    res.status(201).json({ 
      success: true, 
      message: 'Medical record created successfully',
      data: { recordId: record._id }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
});

// ==================== TEST ASSIGNMENTS ====================

// @route   GET /api/nurse/test-assignments
// @desc    Get all test assignments for the authenticated nurse
router.get('/test-assignments', async (req, res) => {
  try {
    const { status } = req.query;
    
    const filter = { nurse: req.user._id };
    if (status) filter.status = status;

    const assignments = await TestAssignment.find(filter)
      .populate('testType', 'name category instructions estimatedDuration')
      .populate('hospital', 'name address phone')
      .populate('patient', 'name email phone dateOfBirth gender')
      .sort('-createdAt')
      .lean();

    res.json({ success: true, count: assignments.length, data: assignments });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/nurse/test-assignments/:id
// @desc    Get single test assignment with full details
router.get('/test-assignments/:id', async (req, res) => {
  try {
    const assignment = await TestAssignment.findOne({
      _id: req.params.id,
      nurse: req.user._id
    })
      .populate('testType')
      .populate('hospital', 'name address phone email')
      .populate('patient', 'name email phone dateOfBirth gender address')
      .lean();

    if (!assignment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Test assignment not found' 
      });
    }

    res.json({ success: true, data: assignment });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PATCH /api/nurse/test-assignments/:id/start
// @desc    Mark test assignment as in progress
router.patch('/test-assignments/:id/start', async (req, res) => {
  try {
    const assignment = await TestAssignment.findOne({
      _id: req.params.id,
      nurse: req.user._id
    });

    if (!assignment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Test assignment not found' 
      });
    }

    if (assignment.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot start assignment with status: ${assignment.status}` 
      });
    }

    assignment.status = 'in_progress';
    assignment.startedAt = new Date();
    await assignment.save();

    // Log in hospital audit
    await HospitalAuditLog.create({
      hospital: assignment.hospital,
      action: 'start_test_assignment',
      performedBy: { 
        id: req.user._id, 
        role: 'nurse', 
        name: req.user.name 
      },
      details: { testAssignmentId: assignment._id }
    });

    res.json({ 
      success: true, 
      message: 'Test assignment started',
      data: assignment 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/nurse/test-assignments/:id/complete
// @desc    Complete test assignment with results and documents
router.post('/test-assignments/:id/complete', uploadTestResults.array('documents', 10), async (req, res) => {
  try {
    const { results } = req.body;

    const assignment = await TestAssignment.findOne({
      _id: req.params.id,
      nurse: req.user._id
    }).populate('testType patient hospital');

    if (!assignment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Test assignment not found' 
      });
    }

    if (assignment.status === 'completed') {
      return res.status(400).json({ 
        success: false, 
        message: 'Test assignment is already completed' 
      });
    }

    if (assignment.status === 'cancelled') {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot complete cancelled assignment' 
      });
    }

    // Process uploaded documents (using categories from frontend if available)
    const resultDocuments = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach((file, index) => {
        const categoryFromIndexedKey = req.body[`documentCategories[${index}]`];
        const categoryFromArray = Array.isArray(req.body.documentCategories)
          ? req.body.documentCategories[index]
          : undefined;
        const rawCategory = categoryFromIndexedKey || categoryFromArray || 'test_report';
        const category = ['test_report', 'diagnosis_report'].includes(rawCategory)
          ? rawCategory
          : 'test_report';
        resultDocuments.push({
          filePath: `/uploads/test-results/${file.filename}`,
          category: category,
          uploadedAt: new Date()
        });
      });
    }

    assignment.status = 'completed';
    assignment.results = results || '';
    assignment.resultDocuments = resultDocuments;
    assignment.completedAt = new Date();
    await assignment.save();

    // Log in hospital audit
    await HospitalAuditLog.create({
      hospital: assignment.hospital._id,
      action: 'complete_test_assignment',
      performedBy: { 
        id: req.user._id, 
        role: 'nurse', 
        name: req.user.name 
      },
      details: { 
        testAssignmentId: assignment._id,
        testTypeName: assignment.testType.name,
        patientId: assignment.patient._id
      }
    });

    // Notify hospital
    await Notification.create({
      user: assignment.hospital._id,
      userModel: 'Hospital',
      type: 'test_completed',
      title: 'Test Assignment Completed',
      message: `Nurse ${req.user.name} completed test: ${assignment.testType.name} for patient ${assignment.patient.name}`,
      relatedModel: 'TestAssignment',
      relatedId: assignment._id
    });

    res.json({ 
      success: true, 
      message: 'Test assignment completed successfully',
      data: assignment 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
});

module.exports = router;

