const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const nurseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    default: 'nurse'
  },
  phone: {
    type: String,
    required: true
  },
  qualification: {
    type: String,
    required: true
  },
  licenseNumber: {
    type: String,
    required: true,
    unique: true
  },
  experience: {
    type: Number,
    default: 0
  },
  hospitalAffiliation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital'
  },
  department: {
    type: String,
    required: true
  },
  shift: {
    type: String,
    enum: ['Morning', 'Evening', 'Night', 'Rotating'],
    default: 'Morning'
  },
  specialization: {
    type: String
  },
  assignedWard: {
    type: String
  },
  patientsAssigned: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  supervisingDoctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor'
  },
  profileImage: {
    type: String,
    default: 'default-nurse.png'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  }
}, {
  timestamps: true
});

// Hash password before saving
nurseSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
nurseSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Nurse', nurseSchema);
