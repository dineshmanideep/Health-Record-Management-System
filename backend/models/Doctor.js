const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const doctorSchema = new mongoose.Schema({
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
    default: 'doctor'
  },
  phone: {
    type: String,
    required: true
  },
  specialization: {
    type: String,
    required: [true, 'Specialization is required']
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
    type: String
  },
  consultationFee: {
    type: Number,
    default: 0
  },
  availableSlots: [{
    day: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    },
    startTime: String,
    endTime: String
  }],
  patients: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  profileImage: {
    type: String,
    default: 'default-doctor.png'
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
  },
  reviewCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Hash password before saving
doctorSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
doctorSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Doctor', doctorSchema);
