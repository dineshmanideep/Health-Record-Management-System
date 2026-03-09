const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

// Storage for self-uploaded patient records
const selfRecordStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/self-records');
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // patientId_timestamp_originalname  (sanitize original name)
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${req.user._id}_${Date.now()}_${safeName}`);
  }
});

// Storage for prescription documents (uploaded by nurse/doctor)
const prescriptionStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/prescriptions');
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${req.user._id}_${Date.now()}_${safeName}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG, PNG, and PDF files are allowed'), false);
  }
};

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

exports.uploadSelfRecord = multer({
  storage: selfRecordStorage,
  fileFilter,
  limits: { fileSize: MAX_SIZE }
}).single('document');

exports.uploadPrescription = multer({
  storage: prescriptionStorage,
  fileFilter,
  limits: { fileSize: MAX_SIZE }
}).single('prescriptionDocument');
