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
const NurseAccessRequest = require('../models/NurseAccessRequest');
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
// @desc    Get summary of medical records created by this nurse (no full content — nurse cannot view after submission)
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
        .select('patient doctor hospital visitDate diagnosis createdAt updatedAt')
        .populate('patient', 'name patientId')
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

// ==================== PERMISSION-BASED RECORD WORKFLOW ====================

// @route   GET /api/nurse/lookup-patient/:patientId
// @desc    Lookup patient by PID and verify patient-doctor relationship
router.get('/lookup-patient/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    const { doctorId } = req.query;

    if (!doctorId) {
      return res.status(400).json({ success: false, message: 'doctorId query param is required' });
    }

    // Find the patient by their PID
    const patient = await User.findOne({ patientId, role: 'user' }).select('name email patientId gender bloodGroup phone');
    if (!patient) {
      return res.status(404).json({ success: false, message: 'No patient found with this ID' });
    }

    // Verify doctor has access to this patient
    const doctorAccess = await DoctorAccess.findOne({ patient: patient._id, doctor: doctorId, isActive: true });
    if (!doctorAccess) {
      return res.status(403).json({ success: false, message: 'This patient is not assigned to the selected doctor' });
    }

    // Verify the nurse is assigned to this doctor (via any active affiliation)
    const nurseAffiliation = await HospitalAffiliation.findOne({
      staffId: req.user._id,
      staffRole: 'nurse',
      assignedDoctor: doctorId,
      status: 'active'
    });
    if (!nurseAffiliation) {
      return res.status(403).json({ success: false, message: 'You are not assigned to this doctor' });
    }

    // For edit operations, also return the patient's records under this doctor
    const records = await MedicalRecord.find({ patient: patient._id, doctor: doctorId })
      .sort({ createdAt: -1 })
      .select('diagnosis visitDate createdAt')
      .populate('hospital', 'name')
      .lean();

    res.json({
      success: true,
      data: {
        patient,
        hospitalId: nurseAffiliation.hospitalId,
        records
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/nurse/request-access
// @desc    Nurse requests permission from doctor to create/edit a record
router.post('/request-access', async (req, res) => {
  try {
    const { patientId, doctorId, operation, recordId } = req.body;

    if (!patientId || !doctorId || !operation) {
      return res.status(400).json({ success: false, message: 'patientId, doctorId, and operation are required' });
    }
    if (!['create', 'edit'].includes(operation)) {
      return res.status(400).json({ success: false, message: 'operation must be "create" or "edit"' });
    }
    if (operation === 'edit' && !recordId) {
      return res.status(400).json({ success: false, message: 'recordId is required for edit operations' });
    }

    // Verify patient
    const patient = await User.findOne({ patientId, role: 'user' });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    // Verify nurse→doctor assignment
    const nurseAffiliation = await HospitalAffiliation.findOne({
      staffId: req.user._id,
      staffRole: 'nurse',
      assignedDoctor: doctorId,
      status: 'active'
    });
    if (!nurseAffiliation) {
      return res.status(403).json({ success: false, message: 'You are not assigned to this doctor' });
    }

    // Check for existing active request
    const existingRequest = await NurseAccessRequest.findOne({
      nurse: req.user._id,
      doctor: doctorId,
      patient: patient._id,
      status: { $in: ['pending', 'approved'] }
    });
    if (existingRequest) {
      return res.status(409).json({ success: false, message: 'You already have an active request for this patient' });
    }

    // Create the access request
    const accessRequest = await NurseAccessRequest.create({
      nurse: req.user._id,
      doctor: doctorId,
      patient: patient._id,
      hospital: nurseAffiliation.hospitalId,
      operation,
      record: operation === 'edit' ? recordId : undefined,
      timeLimit: 10 // 10 minutes
    });

    // Notify the doctor
    const doctor = await Doctor.findById(doctorId).select('name');
    await Notification.create({
      user: doctorId,
      userModel: 'Doctor',
      type: 'nurse_access_request',
      title: 'Nurse Record Request',
      message: `Nurse ${req.user.name} requests permission to ${operation} a medical record for patient ${patient.name} (${patient.patientId}).`,
      accessRequest: accessRequest._id
    });

    res.status(201).json({ success: true, data: accessRequest });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
});

// @route   GET /api/nurse/access-request/:id/status
// @desc    Poll the status of a nurse access request (auto-expire check included)
router.get('/access-request/:id/status', async (req, res) => {
  try {
    const request = await NurseAccessRequest.findOne({ _id: req.params.id, nurse: req.user._id });
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    // Auto-expire if past expiresAt and still approved (not completed)
    if (request.status === 'approved' && request.expiresAt && new Date() > request.expiresAt) {
      request.status = 'expired';
      await request.save();
    }

    // Calculate remaining seconds
    let remainingSeconds = 0;
    if (request.status === 'approved' && request.expiresAt) {
      remainingSeconds = Math.max(0, Math.floor((request.expiresAt - Date.now()) / 1000));
    }

    res.json({
      success: true,
      data: {
        _id: request._id,
        status: request.status,
        operation: request.operation,
        remainingSeconds,
        extensionRequested: request.extensionRequested,
        extensionRejected: request.extensionRejected,
        approvedAt: request.approvedAt,
        expiresAt: request.expiresAt
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/nurse/request-extension/:id
// @desc    Nurse requests a time extension from the doctor
router.post('/request-extension/:id', async (req, res) => {
  try {
    const request = await NurseAccessRequest.findOne({ _id: req.params.id, nurse: req.user._id });
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }
    if (request.status !== 'approved') {
      return res.status(400).json({ success: false, message: 'Can only request extension on an approved request' });
    }
    if (request.extensionRejected) {
      return res.status(400).json({ success: false, message: 'Extension was already rejected. No further extensions allowed.' });
    }

    request.extensionRequested = true;
    request.status = 'pending'; // goes back to pending for doctor to re-approve
    await request.save();

    // Notify doctor
    await Notification.create({
      user: request.doctor,
      userModel: 'Doctor',
      type: 'nurse_extension_request',
      title: 'Time Extension Request',
      message: `Nurse ${req.user.name} is requesting a time extension for the medical record form.`,
      accessRequest: request._id
    });

    res.json({ success: true, message: 'Extension request sent to doctor' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/nurse/submit-record
// @desc    Nurse submits a new medical record (requires approved, non-expired access request)
router.post('/submit-record', upload.array('prescriptionFiles', 10), async (req, res) => {
  try {
    const {
      accessRequestId,
      visitDate,
      diagnosis,
      symptoms,
      prescriptionNotes,
      medications,
      recommendedTests,
      nextVisitDate,
      healthMetrics,
      customFields,
      prescriptionLinks
    } = req.body;

    if (!accessRequestId) {
      return res.status(400).json({ success: false, message: 'accessRequestId is required' });
    }

    // Validate the access request
    const accessReq = await NurseAccessRequest.findOne({
      _id: accessRequestId,
      nurse: req.user._id,
      operation: 'create',
      status: 'approved'
    });
    if (!accessReq) {
      return res.status(403).json({ success: false, message: 'No valid approved access request found' });
    }

    // Check expiration
    if (accessReq.expiresAt && new Date() > accessReq.expiresAt) {
      accessReq.status = 'expired';
      await accessReq.save();
      return res.status(403).json({ success: false, message: 'Access request has expired. Please request again.' });
    }

    if (!diagnosis || !diagnosis.trim()) {
      return res.status(400).json({ success: false, message: 'Diagnosis is required' });
    }

    // Parse JSON fields
    let parsedMedications = [];
    try { parsedMedications = typeof medications === 'string' ? JSON.parse(medications) : (medications || []); } catch { parsedMedications = []; }
    let parsedMetrics = {};
    try { parsedMetrics = typeof healthMetrics === 'string' ? JSON.parse(healthMetrics) : (healthMetrics || {}); } catch { parsedMetrics = {}; }
    let parsedCustomFields = [];
    try { parsedCustomFields = typeof customFields === 'string' ? JSON.parse(customFields) : (customFields || []); } catch { parsedCustomFields = []; }
    let parsedLinks = [];
    try { parsedLinks = typeof prescriptionLinks === 'string' ? JSON.parse(prescriptionLinks) : (prescriptionLinks || []); } catch { parsedLinks = []; }

    // Handle file uploads
    const uploadedDocs = (req.files || []).map(f => `/uploads/prescriptions/${f.filename}`);

    const record = await MedicalRecord.create({
      patient: accessReq.patient,
      hospital: accessReq.hospital,
      doctor: accessReq.doctor,
      nurse: req.user._id,
      visitDate: visitDate || Date.now(),
      diagnosis,
      symptoms,
      prescriptionNotes,
      medications: parsedMedications,
      recommendedTests,
      nextVisitDate,
      healthMetrics: parsedMetrics,
      customFields: parsedCustomFields,
      prescriptionDocuments: uploadedDocs,
      prescriptionLinks: parsedLinks
    });

    // Add to patient's medicalRecords
    await User.findByIdAndUpdate(accessReq.patient, { $push: { medicalRecords: record._id } });

    // Mark access request as completed
    accessReq.status = 'completed';
    await accessReq.save();

    // Log activity
    ActivityLog.create({
      patient: accessReq.patient,
      action: 'record_created',
      performedBy: { id: req.user._id, role: 'nurse', name: req.user.name },
      details: `Medical record created by Nurse ${req.user.name} (permission-based workflow)`
    }).catch(() => {});

    // Notify patient
    Notification.create({
      user: accessReq.patient,
      type: 'record_created',
      title: 'New Medical Record',
      message: `A new medical record was created by Nurse ${req.user.name} from your hospital visit.`
    }).catch(() => {});

    res.status(201).json({ success: true, data: { _id: record._id, diagnosis: record.diagnosis, visitDate: record.visitDate } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
});

// @route   GET /api/nurse/record-for-edit/:accessRequestId
// @desc    Fetch existing record data to pre-fill the edit form
router.get('/record-for-edit/:accessRequestId', async (req, res) => {
  try {
    const accessReq = await NurseAccessRequest.findOne({
      _id: req.params.accessRequestId,
      nurse: req.user._id,
      operation: 'edit',
      status: 'approved'
    });
    if (!accessReq) {
      return res.status(403).json({ success: false, message: 'No valid approved access request found' });
    }

    // Check expiration
    if (accessReq.expiresAt && new Date() > accessReq.expiresAt) {
      accessReq.status = 'expired';
      await accessReq.save();
      return res.status(403).json({ success: false, message: 'Access request has expired' });
    }

    const record = await MedicalRecord.findById(accessReq.record);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    res.json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/nurse/edit-record/:accessRequestId
// @desc    Nurse edits an existing medical record (overwrites with edit history)
router.put('/edit-record/:accessRequestId', upload.array('prescriptionFiles', 10), async (req, res) => {
  try {
    const accessReq = await NurseAccessRequest.findOne({
      _id: req.params.accessRequestId,
      nurse: req.user._id,
      operation: 'edit',
      status: 'approved'
    });
    if (!accessReq) {
      return res.status(403).json({ success: false, message: 'No valid approved access request found' });
    }

    // Check expiration
    if (accessReq.expiresAt && new Date() > accessReq.expiresAt) {
      accessReq.status = 'expired';
      await accessReq.save();
      return res.status(403).json({ success: false, message: 'Access request has expired' });
    }

    const record = await MedicalRecord.findById(accessReq.record);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    const { visitDate, diagnosis, symptoms, prescriptionNotes, medications, recommendedTests, nextVisitDate, healthMetrics, customFields, prescriptionLinks, existingDocuments } = req.body;

    if (!diagnosis || !diagnosis.trim()) {
      return res.status(400).json({ success: false, message: 'Diagnosis is required' });
    }

    // Parse JSON fields
    let parsedMedications = [];
    try { parsedMedications = typeof medications === 'string' ? JSON.parse(medications) : (medications || []); } catch { parsedMedications = []; }
    let parsedMetrics = {};
    try { parsedMetrics = typeof healthMetrics === 'string' ? JSON.parse(healthMetrics) : (healthMetrics || {}); } catch { parsedMetrics = {}; }
    let parsedCustomFields = [];
    try { parsedCustomFields = typeof customFields === 'string' ? JSON.parse(customFields) : (customFields || []); } catch { parsedCustomFields = []; }
    let parsedLinks = [];
    try { parsedLinks = typeof prescriptionLinks === 'string' ? JSON.parse(prescriptionLinks) : (prescriptionLinks || []); } catch { parsedLinks = []; }

    // Parse existing documents sent from frontend (may have removals)
    let keptDocs = [];
    try { keptDocs = typeof existingDocuments === 'string' ? JSON.parse(existingDocuments) : (existingDocuments || record.prescriptionDocuments || []); } catch { keptDocs = record.prescriptionDocuments || []; }

    // Handle new file uploads — append to kept existing documents
    const newDocs = (req.files || []).map(f => `/uploads/prescriptions/${f.filename}`);
    const allDocs = [...keptDocs, ...newDocs];

    // Add edit history entry
    record.editHistory.push({
      editedBy: { id: req.user._id, role: 'nurse', name: req.user.name },
      editedAt: new Date(),
      summary: `Record edited by Nurse ${req.user.name}`
    });

    // Overwrite fields
    record.visitDate = visitDate || record.visitDate;
    record.diagnosis = diagnosis;
    record.symptoms = symptoms;
    record.prescriptionNotes = prescriptionNotes;
    record.medications = parsedMedications;
    record.recommendedTests = recommendedTests;
    record.nextVisitDate = nextVisitDate || record.nextVisitDate;
    record.healthMetrics = parsedMetrics;
    record.customFields = parsedCustomFields;
    record.prescriptionDocuments = allDocs;
    record.prescriptionLinks = parsedLinks;

    await record.save();

    // Mark access request as completed
    accessReq.status = 'completed';
    await accessReq.save();

    // Log activity
    ActivityLog.create({
      patient: record.patient,
      action: 'record_modified',
      performedBy: { id: req.user._id, role: 'nurse', name: req.user.name },
      details: `Medical record edited by Nurse ${req.user.name} (permission-based workflow)`
    }).catch(() => {});

    // Notify patient
    Notification.create({
      user: record.patient,
      type: 'record_modified',
      title: 'Medical Record Updated',
      message: `Your medical record was updated by Nurse ${req.user.name}.`
    }).catch(() => {});

    res.json({ success: true, data: { _id: record._id, diagnosis: record.diagnosis, visitDate: record.visitDate } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
});

module.exports = router;
