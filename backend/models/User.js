const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  patientId: {
    type: Number,
    unique: true,
    sparse: true
  },
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
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    enum: ['user', 'doctor', 'hospital', 'nurse', 'admin'],
    default: 'user'
  },
  phone: {
    type: String,
    trim: true
    // Optional - can be added in profile
  },
  dateOfBirth: {
    type: Date
    // Optional - can be added in profile
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other']
    // Optional - can be added in profile
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
    // Optional - can be added in profile
  },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
    // Optional - can be added in profile
  },
  medicalRecords: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MedicalRecord'
  }],
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String
  },
  profileImage: {
    type: String,
    default: 'default-avatar.png'
  },
  accessibilityProfile: {
    modeEnabled: { type: Boolean, default: false },
    textSize: {
      type: String,
      enum: ['normal', 'large', 'extra-large'],
      default: 'normal'
    },
    keyboardMode: { type: Boolean, default: false },
    dyslexiaMode: { type: Boolean, default: false },
    targetBoost: { type: Boolean, default: false },
    formAssistMode: { type: Boolean, default: false },
    accessibleChartsMode: { type: Boolean, default: false }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Generate unique patientId for patients before saving
userSchema.pre('save', async function() {
  if (this.isNew && this.role === 'user' && !this.patientId) {
    const count = await mongoose.model('User').countDocuments({ role: 'user' });
    this.patientId = count + 1;
  }
});

// Hash password before saving
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
