const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const hospitalSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Hospital name is required'],
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
    default: 'hospital'
  },
  phone: {
    type: String,
    required: true
  },
  registrationNumber: {
    type: String,
    required: true,
    unique: true
  },
  address: {
    street: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    zipCode: {
      type: String,
      required: true
    },
    country: {
      type: String,
      required: true
    }
  },
  type: {
    type: String,
    enum: ['Government', 'Private', 'Semi-Government'],
    required: true
  },
  facilities: [{
    type: String
  }],
  departments: [{
    name: String,
    headDoctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor'
    }
  }],
  totalBeds: {
    type: Number,
    default: 0
  },
  availableBeds: {
    type: Number,
    default: 0
  },
  emergencyServices: {
    type: Boolean,
    default: true
  },
  ambulanceService: {
    type: Boolean,
    default: false
  },
  doctors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor'
  }],
  nurses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Nurse'
  }],
  profileImage: {
    type: String,
    default: 'default-hospital.png'
  },
  website: {
    type: String
  },
  establishedYear: {
    type: Number
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Hash password before saving
hospitalSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
hospitalSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Hospital', hospitalSchema);
