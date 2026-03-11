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
    type: String
    // Optional - can be added in profile
  },
  specialization: {
    type: String
    // Optional - can be added in profile  
  },
  qualification: {
    type: String
    // Optional - can be added in profile
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
  accountStatus: {
    type: String,
    enum: ['pending_verification', 'verified', 'suspended'],
    default: 'pending_verification'
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
doctorSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
doctorSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Doctor', doctorSchema);
