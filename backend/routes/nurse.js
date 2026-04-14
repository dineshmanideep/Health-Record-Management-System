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
const UploadProcessingSession = require('../models/UploadProcessingSession');
const {
  processDocuments,
  finalizeValidatedMedicalRecord,
  finalizeValidatedTestAssignment
} = require('../utils/postUploadMedicalPipeline');
const { protect, authorize } = require('../middleware/auth');
const { hashOtp, createAsyncSideEffect, buildActor } = require('../utils/routeHelpers');
const { getActiveAffiliation, reactivateOrCreateAffiliation } = require('../utils/affiliationHelpers');

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
    if (!allowed.includes(ext)) {
      return cb(new Error('Unsupported file type. Use PDF, JPG, JPEG, or PNG.'));
    }
    cb(null, true);
  }
});

const uploadMedicalFiles = (req, res, next) => {
  upload.array('medicalFiles', 10)(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload failed'
      });
    }
    next();
  });
};

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
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) {
      return cb(new Error('Unsupported file type. Use PDF, JPG, JPEG, or PNG.'));
    }
    cb(null, true);
  }
});

function buildCategorizedDocuments(files = [], categories = {}, basePath = '') {
  return (files || []).map((file, index) => {
    const categoryFromIndexedKey = categories[`indexed:${index}`];
    const categoryFromArray = Array.isArray(categories.array)
      ? categories.array[index]
      : undefined;
    const rawCategory = categoryFromIndexedKey || categoryFromArray || 'test_report';
    const category = ['test_report', 'diagnosis_report'].includes(rawCategory)
      ? rawCategory
      : 'test_report';

    return {
      filePath: `${basePath}/${file.filename}`,
      category,
      reportTag: file.originalname || '',
      parsedMetrics: [],
      aiSummary: '',
      uploadedAt: new Date(),
      llmExtraction: {
        status: 'pending',
        sourceType: category
      }
    };
  });
}

async function createClarificationSession({
  nurseId,
  flowType,
  assignmentId,
  metadata,
  documents,
  fallbackText,
  result
}) {
  return UploadProcessingSession.create({
    nurse: nurseId,
    flowType,
    assignmentId,
    metadata,
    documents,
    fallbackText,
    rawResponse: result.rawResponse || '',
    validatedData: result.validatedData || {},
    ambiguities: result.ambiguities || []
  });
}

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
      { returnDocument: 'after', runValidators: true }
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

    const otpHash = hashOtp(otp);
    const otpRecord = await HospitalOTP.findOne({
      otpHash,
      targetRole: 'nurse',
      used: false,
      expiresAt: { $gt: new Date() }
    });

    if (!otpRecord) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    const affiliationResult = await reactivateOrCreateAffiliation({
      staffId: req.user._id,
      staffRole: 'nurse',
      hospitalId: otpRecord.hospitalId,
      department: department || '',
      singleHospital: true
    });

    if (affiliationResult.kind === 'conflict') {
      const currentHospital = affiliationResult.hospital;
      return res.status(409).json({ 
        success: false, 
        message: `You are already affiliated with ${currentHospital?.name || 'another hospital'}. A nurse can only work at one hospital at a time.` 
      });
    }

    if (affiliationResult.kind === 'existing_active') {
      return res.status(409).json({
        success: false,
        message: 'You are already affiliated with this hospital'
      });
    }

    await HospitalOTP.findByIdAndUpdate(otpRecord._id, { used: true, usedBy: req.user._id });
    createAsyncSideEffect(
      HospitalAuditLog.create({
        hospital: otpRecord.hospitalId,
        action: 'nurse_joined',
        performedBy: buildActor(req.user, 'nurse'),
        details: `Nurse ${req.user.name} joined the hospital`
      })
    );

    res.status(affiliationResult.kind === 'created' ? 201 : 200).json({
      success: true,
      data: affiliationResult.affiliation,
      hospital: affiliationResult.hospital
    });
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
    const affiliation = await getActiveAffiliation({
      staffId: req.user._id,
      staffRole: 'nurse'
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
    const affiliation = await getActiveAffiliation({
      staffId: req.user._id,
      staffRole: 'nurse'
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
router.post('/assignments/:id/complete', uploadMedicalFiles, async (req, res) => {
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

    const categorizedDocuments = buildCategorizedDocuments(
      req.files,
      {
        array: req.body.fileCategories,
        ...Object.fromEntries(
          Object.keys(req.body)
            .filter((key) => key.startsWith('fileCategories['))
            .map((key) => [`indexed:${key.match(/\[(\d+)\]/)?.[1] || ''}`, req.body[key]])
        )
      },
      '/uploads/prescriptions'
    );

    const result = await processDocuments({
      documents: categorizedDocuments,
      fallbackText: prescription,
      visitDate: new Date()
    });

    if (result.status === 'clarification_required') {
      const session = await createClarificationSession({
        nurseId: req.user._id,
        flowType: 'medical_record',
        assignmentId: assignment._id,
        metadata: {
          patient: assignment.patient._id,
          hospital: assignment.hospital,
          doctor: assignment.doctor._id,
          prescription
        },
        documents: categorizedDocuments,
        fallbackText: prescription,
        result
      });

      return res.status(409).json({
        success: false,
        resolutionRequired: true,
        sessionId: session._id,
        ambiguities: result.ambiguities,
        message: 'Nurse clarification is required before the record can be completed.'
      });
    }

    const extractionFailed = result.status === 'failed';

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
      prescriptionDocument: categorizedDocuments[0]?.filePath,
      structuredData: {
        extractionStatus: extractionFailed
          ? 'failed'
          : (categorizedDocuments.length ? 'pending' : 'skipped'),
        validationErrors: extractionFailed ? (result.validationErrors || []) : [],
        rawResponses: extractionFailed && result.rawResponse
          ? [{ documentPath: 'combined', response: result.rawResponse, status: 'failed' }]
          : [],
        normalizedFields: {},
        numericFields: {},
        processedAt: extractionFailed ? new Date() : undefined
      }
    });

    if (extractionFailed) {
      const extractionErrors = result.validationErrors || ['Medical extraction failed'];
      const processedAt = new Date();

      record.categorizedDocuments = (record.categorizedDocuments || []).map((doc) => ({
        ...(doc.toObject ? doc.toObject() : doc),
        llmExtraction: {
          ...(doc.llmExtraction?.toObject ? doc.llmExtraction.toObject() : (doc.llmExtraction || {})),
          status: 'failed',
          diagnosis: '',
          specialization: '',
          reportDate: null,
          nextVisitDate: null,
          normalizedFields: {},
          numericFields: {},
          medications: [],
          validationErrors: extractionErrors,
          unknownFields: [],
          conflicts: [],
          rawResponse: result.rawResponse || '',
          processedAt,
          sourceType: doc.category
        }
      }));
      record.markModified('categorizedDocuments');
      await record.save();
    } else {
      await finalizeValidatedMedicalRecord(record, result.validatedData, result.rawResponse, {});
    }

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
      message: extractionFailed
        ? 'Medical record created successfully (AI extraction unavailable for this upload).'
        : 'Medical record created successfully',
      data: {
        recordId: record._id,
        extractionStatus: extractionFailed ? 'failed' : 'completed',
        extractionErrors: extractionFailed ? (result.validationErrors || []) : []
      }
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

    const resultDocuments = buildCategorizedDocuments(
      req.files,
      {
        array: req.body.documentCategories,
        ...Object.fromEntries(
          Object.keys(req.body)
            .filter((key) => key.startsWith('documentCategories['))
            .map((key) => [`indexed:${key.match(/\[(\d+)\]/)?.[1] || ''}`, req.body[key]])
        )
      },
      '/uploads/test-results'
    );

    const result = await processDocuments({
      documents: resultDocuments,
      fallbackText: results || '',
      visitDate: new Date()
    });

    if (result.status === 'clarification_required') {
      const session = await createClarificationSession({
        nurseId: req.user._id,
        flowType: 'test_assignment',
        assignmentId: assignment._id,
        metadata: {
          results: results || ''
        },
        documents: resultDocuments,
        fallbackText: results || '',
        result
      });

      return res.status(409).json({
        success: false,
        resolutionRequired: true,
        sessionId: session._id,
        ambiguities: result.ambiguities,
        message: 'Nurse clarification is required before the test assignment can be completed.'
      });
    }

    const extractionFailed = result.status === 'failed';

    assignment.status = 'completed';
    assignment.results = results || '';
    assignment.resultDocuments = resultDocuments;
    assignment.structuredData = {
      extractionStatus: extractionFailed
        ? 'failed'
        : (resultDocuments.length ? 'pending' : 'skipped'),
      validationErrors: extractionFailed ? (result.validationErrors || []) : [],
      rawResponses: extractionFailed && result.rawResponse
        ? [{ documentPath: 'combined', response: result.rawResponse, status: 'failed' }]
        : [],
      normalizedFields: {},
      numericFields: {},
      processedAt: extractionFailed ? new Date() : undefined
    };
    assignment.completedAt = new Date();
    await assignment.save();

    if (extractionFailed) {
      const extractionErrors = result.validationErrors || ['Medical extraction failed'];
      const processedAt = new Date();

      assignment.resultDocuments = (assignment.resultDocuments || []).map((doc) => ({
        ...(doc.toObject ? doc.toObject() : doc),
        llmExtraction: {
          ...(doc.llmExtraction?.toObject ? doc.llmExtraction.toObject() : (doc.llmExtraction || {})),
          status: 'failed',
          diagnosis: '',
          specialization: '',
          reportDate: null,
          nextVisitDate: null,
          normalizedFields: {},
          numericFields: {},
          medications: [],
          validationErrors: extractionErrors,
          unknownFields: [],
          conflicts: [],
          rawResponse: result.rawResponse || '',
          processedAt,
          sourceType: doc.category
        }
      }));
      assignment.markModified('resultDocuments');
      await assignment.save();
    } else {
      await finalizeValidatedTestAssignment(assignment, result.validatedData, result.rawResponse, {});
    }

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
      message: extractionFailed
        ? 'Test assignment completed successfully (AI extraction unavailable for this upload).'
        : 'Test assignment completed successfully',
      data: {
        ...assignment.toObject(),
        extractionStatus: extractionFailed ? 'failed' : 'completed',
        extractionErrors: extractionFailed ? (result.validationErrors || []) : []
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
});

router.post('/upload-sessions/:id/resolve', async (req, res) => {
  try {
    const session = await UploadProcessingSession.findOne({
      _id: req.params.id,
      nurse: req.user._id
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Clarification session not found' });
    }

    const clarifications = req.body?.clarifications || {};

    if (session.flowType === 'medical_record') {
      const assignment = await RecordAssignment.findOne({
        _id: session.assignmentId,
        nurse: req.user._id
      }).populate('doctor', 'name').populate('patient', 'name patientId');

      if (!assignment) {
        return res.status(404).json({ success: false, message: 'Assignment not found' });
      }

      const record = await MedicalRecord.create({
        patient: session.metadata.patient,
        hospital: session.metadata.hospital,
        doctor: session.metadata.doctor,
        nurse: req.user._id,
        visitDate: Date.now(),
        diagnosis: 'See Prescription',
        prescriptionNotes: session.metadata.prescription || '',
        categorizedDocuments: session.documents,
        prescriptionDocuments: session.documents.map((doc) => doc.filePath),
        prescriptionDocument: session.documents[0]?.filePath,
        structuredData: {
          extractionStatus: 'pending',
          normalizedFields: {},
          numericFields: {}
        }
      });

      const result = await finalizeValidatedMedicalRecord(record, session.validatedData, session.rawResponse, clarifications);
      if (result.status === 'clarification_required') {
        await MedicalRecord.findByIdAndDelete(record._id);
        session.ambiguities = result.ambiguities || [];
        await session.save();
        return res.status(422).json({
          success: false,
          resolutionRequired: true,
          sessionId: session._id,
          ambiguities: result.ambiguities,
          message: 'More clarification is still required.'
        });
      }

      await User.findByIdAndUpdate(session.metadata.patient, { $push: { medicalRecords: record._id } });
      assignment.status = 'completed';
      assignment.completedAt = new Date();
      assignment.medicalRecord = record._id;
      await assignment.save();

      ActivityLog.create({
        patient: session.metadata.patient,
        action: 'record_created',
        performedBy: { id: req.user._id, role: 'nurse', name: req.user.name },
        details: `Medical record created by Nurse ${req.user.name} (assigned by Dr. ${assignment.doctor?.name || 'Unknown'})`
      }).catch(() => {});

      Notification.create({
        user: session.metadata.patient,
        type: 'record_created',
        title: 'New Medical Record',
        message: `A new medical record was created by Nurse ${req.user.name}.`
      }).catch(() => {});

      Notification.create({
        user: session.metadata.doctor,
        userModel: 'Doctor',
        type: 'general',
        title: 'Assignment Completed',
        message: `Nurse ${req.user.name} completed the record assignment for patient ${assignment.patient?.name || 'Unknown'}.`
      }).catch(() => {});

      await UploadProcessingSession.deleteOne({ _id: session._id });

      return res.status(201).json({
        success: true,
        message: 'Medical record created successfully',
        data: { recordId: record._id }
      });
    }

    const assignment = await TestAssignment.findOne({
      _id: session.assignmentId,
      nurse: req.user._id
    }).populate('testType patient hospital');

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Test assignment not found' });
    }

    assignment.status = 'completed';
    assignment.results = session.metadata.results || '';
    assignment.resultDocuments = session.documents;
    assignment.structuredData = {
      extractionStatus: 'pending',
      normalizedFields: {},
      numericFields: {}
    };
    assignment.completedAt = new Date();
    await assignment.save();

    const result = await finalizeValidatedTestAssignment(assignment, session.validatedData, session.rawResponse, clarifications);
    if (result.status === 'clarification_required') {
      assignment.status = 'in_progress';
      await assignment.save();
      session.ambiguities = result.ambiguities || [];
      await session.save();
      return res.status(422).json({
        success: false,
        resolutionRequired: true,
        sessionId: session._id,
        ambiguities: result.ambiguities,
        message: 'More clarification is still required.'
      });
    }

    await HospitalAuditLog.create({
      hospital: assignment.hospital._id || assignment.hospital,
      action: 'complete_test_assignment',
      performedBy: {
        id: req.user._id,
        role: 'nurse',
        name: req.user.name
      },
      details: {
        testAssignmentId: assignment._id,
        testTypeName: assignment.testType?.name || '',
        patientId: assignment.patient?._id || assignment.patient
      }
    });

    await Notification.create({
      user: assignment.hospital._id || assignment.hospital,
      userModel: 'Hospital',
      type: 'test_completed',
      title: 'Test Assignment Completed',
      message: `Nurse ${req.user.name} completed test: ${assignment.testType?.name || 'Test'} for patient ${assignment.patient?.name || 'Unknown'}`,
      relatedModel: 'TestAssignment',
      relatedId: assignment._id
    });

    await UploadProcessingSession.deleteOne({ _id: session._id });

    return res.json({
      success: true,
      message: 'Test assignment completed successfully',
      data: assignment
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
});

module.exports = router;
