const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const Doctor = require('../models/Doctor');
const Hospital = require('../models/Hospital');
const HospitalOTP = require('../models/HospitalOTP');
const HospitalAffiliation = require('../models/HospitalAffiliation');
const User = require('../models/User');
const PatientAccessOTP = require('../models/PatientAccessOTP');
const DoctorAccess = require('../models/DoctorAccess');
const MedicalRecord = require('../models/MedicalRecord');
const ActivityLog = require('../models/ActivityLog');
const Notification = require('../models/Notification');
const HospitalAuditLog = require('../models/HospitalAuditLog');
const NurseAccessRequest = require('../models/NurseAccessRequest');
const Nurse = require('../models/Nurse');
const RecordAssignment = require('../models/RecordAssignment');
const { transcribeVoiceNote } = require('../utils/aiSummarizer');
const { protect, authorize } = require('../middleware/auth');
const { hashOtp, createAsyncSideEffect, buildActor } = require('../utils/routeHelpers');
const { reactivateOrCreateAffiliation, getHospitalSummary } = require('../utils/affiliationHelpers');

// Multer config for doctor's attachments
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads', 'assignments')),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ 
  storage, 
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.mp3', '.wav', '.m4a', '.ogg', '.webm'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  }
});

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

// @route   GET /api/doctor/dashboard
// @desc    Get dashboard summary for this doctor
router.get('/dashboard', async (req, res) => {
  try {
    const patientCount = await DoctorAccess.countDocuments({ doctor: req.user._id, isActive: true });
    const affiliationCount = await HospitalAffiliation.countDocuments({ staffId: req.user._id, staffRole: 'doctor', status: 'active' });
    const recordCount = await MedicalRecord.countDocuments({ doctor: req.user._id });

    // Recent patients (last 5)
    const recentPatients = await DoctorAccess.find({ doctor: req.user._id, isActive: true })
      .sort({ grantedAt: -1 })
      .limit(5)
      .populate('patient', 'name email phone dateOfBirth gender bloodGroup');

    // Recent records
    const recentRecords = await MedicalRecord.find({ doctor: req.user._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('patient', 'name')
      .populate('hospital', 'name')
      .lean();

    res.json({
      success: true,
      data: { patientCount, affiliationCount, recordCount, recentPatients, recentRecords }
    });
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
      { returnDocument: 'after', runValidators: true }
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

    const otpHash = hashOtp(otp);
    const otpRecord = await HospitalOTP.findOne({
      otpHash,
      targetRole: 'doctor',
      used: false,
      expiresAt: { $gt: new Date() }
    });

    if (!otpRecord) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    const affiliationResult = await reactivateOrCreateAffiliation({
      staffId: req.user._id,
      staffRole: 'doctor',
      hospitalId: otpRecord.hospitalId,
      department: department || ''
    });

    if (affiliationResult.kind === 'existing_active') {
      return res.status(409).json({ success: false, message: 'You are already affiliated with this hospital' });
    }

    await HospitalOTP.findByIdAndUpdate(otpRecord._id, { used: true, usedBy: req.user._id });
    createAsyncSideEffect(
      HospitalAuditLog.create({
        hospital: otpRecord.hospitalId,
        action: 'doctor_joined',
        performedBy: buildActor(req.user, 'doctor'),
        details: `Dr. ${req.user.name} joined the hospital`
      })
    );

    return res.status(affiliationResult.kind === 'created' ? 201 : 200).json({
      success: true,
      data: affiliationResult.affiliation,
      hospital: affiliationResult.hospital || await getHospitalSummary(otpRecord.hospitalId)
    });
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

    const otpHash = hashOtp(otp);
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
    createAsyncSideEffect(ActivityLog.create({
      patient: patient._id,
      action: 'doctor_access_granted',
      performedBy: buildActor(req.user, 'doctor'),
      details: `Dr. ${req.user.name} granted access via OTP`
    }));

    // Notify patient
    createAsyncSideEffect(Notification.create({
      user: patient._id,
      type: 'doctor_access_granted',
      title: 'Doctor Access Granted',
      message: `Dr. ${req.user.name} now has access to your medical records.`
    }));

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

    // For each patient, get last visit date
    const enriched = await Promise.all(
      accessList.map(async (a) => {
        const lastRecord = await MedicalRecord.findOne({ patient: a.patient._id, doctor: req.user._id })
          .sort({ visitDate: -1 })
          .select('visitDate hospital')
          .populate('hospital', 'name')
          .lean();
        return {
          ...a,
          lastVisitDate: lastRecord?.visitDate || null,
          lastHospital: lastRecord?.hospital?.name || null
        };
      })
    );

    res.json({ success: true, data: enriched });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/doctor/patient-access/verify-qr
// @desc    Doctor scans QR code to gain access to patient records
router.post('/patient-access/verify-qr', async (req, res) => {
  try {
    const { qrToken } = req.body;
    if (!qrToken) {
      return res.status(400).json({ success: false, message: 'QR token is required' });
    }

    // Find the patient whose HMAC token matches
    const users = await User.find({ role: 'user' }).select('_id name');
    let matchedPatient = null;
    const secret = process.env.JWT_SECRET || 'default_secret';

    for (const u of users) {
      const expectedToken = crypto.createHmac('sha256', secret).update(u._id.toString()).digest('hex');
      if (expectedToken === qrToken) {
        matchedPatient = u;
        break;
      }
    }

    if (!matchedPatient) {
      return res.status(404).json({ success: false, message: 'Invalid QR code' });
    }

    // Create or reactivate DoctorAccess
    let access = await DoctorAccess.findOne({ patient: matchedPatient._id, doctor: req.user._id });
    if (access) {
      access.isActive = true;
      access.accessMethod = 'qr';
      access.grantedAt = new Date();
      access.revokedAt = undefined;
      await access.save();
    } else {
      access = await DoctorAccess.create({
        patient: matchedPatient._id,
        doctor: req.user._id,
        accessMethod: 'qr'
      });
    }

    await Doctor.findByIdAndUpdate(req.user._id, { $addToSet: { patients: matchedPatient._id } });

    ActivityLog.create({
      patient: matchedPatient._id,
      action: 'doctor_access_granted',
      performedBy: { id: req.user._id, role: 'doctor', name: req.user.name },
      details: `Dr. ${req.user.name} granted access via QR code`
    }).catch(() => {});

    Notification.create({
      user: matchedPatient._id,
      type: 'doctor_access_granted',
      title: 'Doctor Access Granted',
      message: `Dr. ${req.user.name} now has access to your medical records (via QR code).`
    }).catch(() => {});

    res.json({ success: true, message: 'Access granted via QR code', data: { patientName: matchedPatient.name } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
});

// @route   GET /api/doctor/audit-logs
// @desc    Get activity logs related to this doctor's patients
router.get('/audit-logs', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Get all patient IDs the doctor has access to
    const accessList = await DoctorAccess.find({ doctor: req.user._id }).select('patient');
    const patientIds = accessList.map((a) => a.patient);

    const [logs, total] = await Promise.all([
      ActivityLog.find({ patient: { $in: patientIds } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('patient', 'name')
        .lean(),
      ActivityLog.countDocuments({ patient: { $in: patientIds } })
    ]);

    res.json({ success: true, data: logs, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==================== NURSE ACCESS REQUEST MANAGEMENT ====================

// @route   GET /api/doctor/nurse-requests
// @desc    Get all pending nurse access requests for this doctor
router.get('/nurse-requests', async (req, res) => {
  try {
    const status = req.query.status || 'pending';
    const requests = await NurseAccessRequest.find({ doctor: req.user._id, status })
      .sort({ createdAt: -1 })
      .populate('nurse', 'name email licenseNumber')
      .populate('patient', 'name patientId email')
      .populate('hospital', 'name')
      .populate('record', 'diagnosis visitDate')
      .lean();

    res.json({ success: true, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PATCH /api/doctor/nurse-requests/:id/approve
// @desc    Doctor approves a nurse's request — starts the timer
router.patch('/nurse-requests/:id/approve', async (req, res) => {
  try {
    const request = await NurseAccessRequest.findOne({ _id: req.params.id, doctor: req.user._id });
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Request is not pending' });
    }

    const timeLimit = request.timeLimit || 10; // minutes
    request.status = 'approved';
    request.approvedAt = new Date();
    request.expiresAt = new Date(Date.now() + timeLimit * 60 * 1000);
    if (request.extensionRequested) {
      request.extensionRequested = false; // reset extension flag after approval
    }
    await request.save();

    // Notify the nurse
    await Notification.create({
      user: request.nurse,
      userModel: 'Nurse',
      type: 'nurse_request_approved',
      title: 'Request Approved',
      message: `Dr. ${req.user.name} approved your request. You have ${timeLimit} minutes to complete the form.`,
      accessRequest: request._id
    });

    res.json({ success: true, data: request });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PATCH /api/doctor/nurse-requests/:id/reject
// @desc    Doctor rejects a nurse's request
router.patch('/nurse-requests/:id/reject', async (req, res) => {
  try {
    const request = await NurseAccessRequest.findOne({ _id: req.params.id, doctor: req.user._id });
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Request is not pending' });
    }

    // If this was an extension request, mark extension as rejected
    if (request.extensionRequested) {
      request.extensionRejected = true;
      request.extensionRequested = false;
      // Keep status as approved but let it naturally expire
      request.status = 'approved';
    } else {
      request.status = 'rejected';
    }
    await request.save();

    // Notify the nurse
    const isExtension = request.extensionRejected;
    await Notification.create({
      user: request.nurse,
      userModel: 'Nurse',
      type: 'nurse_request_rejected',
      title: isExtension ? 'Extension Rejected' : 'Request Rejected',
      message: isExtension
        ? `Dr. ${req.user.name} rejected your time extension request. Please submit before the timer expires.`
        : `Dr. ${req.user.name} rejected your request to ${request.operation} the medical record.`,
      accessRequest: request._id
    });

    res.json({ success: true, data: request });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/doctor/nurse-requests/count
// @desc    Get count of pending nurse requests (for badge/notification)
router.get('/nurse-requests/count', async (req, res) => {
  try {
    const count = await NurseAccessRequest.countDocuments({ doctor: req.user._id, status: 'pending' });
    res.json({ success: true, data: { count } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/doctor/assigned-nurses
// @desc    Get all nurses assigned to this doctor
router.get('/assigned-nurses', async (req, res) => {
  try {
    // Find all nurse affiliations where this doctor is assigned
    const affiliations = await HospitalAffiliation.find({
      assignedDoctor: req.user._id,
      staffRole: 'nurse',
      status: 'active'
    })
      .populate({
        path: 'hospitalId',
        select: 'name address'
      })
      .lean();

    // Get nurse details for each affiliation
    const nursesData = await Promise.all(
      affiliations.map(async (aff) => {
        const nurse = await Nurse.findById(aff.staffId).select('name email phone qualification licenseNumber department shift specialization');
        return {
          ...aff,
          nurse
        };
      })
    );

    res.json({ success: true, count: nursesData.length, data: nursesData });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==================== RECORD ASSIGNMENTS ====================

// @route   POST /api/doctor/assign-record
// @desc    Doctor creates a record assignment for a nurse
router.post('/assign-record', upload.fields([
  { name: 'attachments', maxCount: 5 },
  { name: 'voiceNote', maxCount: 1 }
]), async (req, res) => {
  try {
    const { nurseId, patientId, hospitalId, instructions, dueDate } = req.body;

    if (!nurseId || !patientId || !hospitalId || !instructions) {
      return res.status(400).json({ 
        success: false, 
        message: 'Nurse, patient, hospital, and instructions are required' 
      });
    }

    // Verify patient access
    const access = await DoctorAccess.findOne({ 
      doctor: req.user._id, 
      patient: patientId, 
      isActive: true 
    });
    if (!access) {
      return res.status(403).json({ 
        success: false, 
        message: 'You do not have access to this patient' 
      });
    }

    // Verify nurse is assigned to this doctor
    const nurseAffiliation = await HospitalAffiliation.findOne({
      staffId: nurseId,
      assignedDoctor: req.user._id,
      staffRole: 'nurse',
      status: 'active'
    });
    if (!nurseAffiliation) {
      return res.status(403).json({ 
        success: false, 
        message: 'This nurse is not assigned to you' 
      });
    }

    // Build attachment URLs
    const attachmentFiles = Array.isArray(req.files)
      ? req.files
      : (req.files?.attachments || []);

    const attachments = attachmentFiles.map(file => 
      `${req.protocol}://${req.get('host')}/uploads/assignments/${file.filename}`
    );

    const voiceNoteFile = Array.isArray(req.files?.voiceNote) ? req.files.voiceNote[0] : null;
    let voiceNote;

    if (voiceNoteFile) {
      const voicePath = path.join(__dirname, '..', 'uploads', 'assignments', voiceNoteFile.filename);
      const transcription = await transcribeVoiceNote(voicePath, voiceNoteFile.mimetype);

      voiceNote = {
        filePath: `${req.protocol}://${req.get('host')}/uploads/assignments/${voiceNoteFile.filename}`,
        mimeType: voiceNoteFile.mimetype || '',
        transcript: transcription.transcript,
        transcriptStatus: transcription.status,
        transcriptError: transcription.error,
        uploadedAt: new Date()
      };
    }

    const assignment = await RecordAssignment.create({
      doctor: req.user._id,
      nurse: nurseId,
      patient: patientId,
      hospital: hospitalId,
      instructions,
      attachments,
      voiceNote,
      dueDate: dueDate || undefined
    });

    // Notify the nurse
    await Notification.create({
      user: nurseId,
      userModel: 'Nurse',
      type: 'general',
      title: 'New Record Assignment',
      message: `Dr. ${req.user.name} assigned you to create a medical record. Check your assignments.`
    });

    const populated = await RecordAssignment.findById(assignment._id)
      .populate('nurse', 'name email')
      .populate('patient', 'name patientId')
      .populate('hospital', 'name');

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
});

// @route   GET /api/doctor/record-assignments
// @desc    Get all record assignments created by this doctor
router.get('/record-assignments', async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { doctor: req.user._id };
    if (status) filter.status = status;

    const assignments = await RecordAssignment.find(filter)
      .sort({ createdAt: -1 })
      .populate('nurse', 'name email')
      .populate('patient', 'name patientId')
      .populate('hospital', 'name')
      .populate('medicalRecord')
      .lean();

    res.json({ success: true, count: assignments.length, data: assignments });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/doctor/record-assignments/:id
// @desc    Get a specific assignment
router.get('/record-assignments/:id', async (req, res) => {
  try {
    const assignment = await RecordAssignment.findOne({ 
      _id: req.params.id, 
      doctor: req.user._id 
    })
      .populate('nurse', 'name email phone')
      .populate('patient', 'name patientId email')
      .populate('hospital', 'name')
      .populate('medicalRecord');

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    res.json({ success: true, data: assignment });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PATCH /api/doctor/record-assignments/:id/cancel
// @desc    Cancel a pending assignment
router.patch('/record-assignments/:id/cancel', async (req, res) => {
  try {
    const assignment = await RecordAssignment.findOne({ 
      _id: req.params.id, 
      doctor: req.user._id 
    });

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    if (assignment.status === 'completed') {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot cancel a completed assignment' 
      });
    }

    assignment.status = 'cancelled';
    await assignment.save();

    await Notification.create({
      user: assignment.nurse,
      userModel: 'Nurse',
      type: 'general',
      title: 'Assignment Cancelled',
      message: `Dr. ${req.user.name} cancelled the record assignment.`
    });

    res.json({ success: true, data: assignment });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
