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
    type: String
    // Optional - can be added in profile
  },
  registrationNumber: {
    type: String,
    required: true,
    unique: true
  },
  address: {
    street: {
      type: String
      // Optional - can be added in profile
    },
    city: {
      type: String
      // Optional - can be added in profile
    },
    state: {
      type: String
      // Optional - can be added in profile
    },
    zipCode: {
      type: String
      // Optional - can be added in profile
    },
    country: {
      type: String
      // Optional - can be added in profile
    }
  },
  hospitalType: {
    type: String,
    enum: ['Government', 'Private', 'Semi-Government']
    // Optional - can be added in profile
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
  accountStatus: {
    type: String,
    enum: ['pending_approval', 'active', 'rejected', 'suspended'],
    default: 'pending_approval'
  }
}, {
  timestamps: true
});

// Hash password before saving
hospitalSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
hospitalSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Hospital', hospitalSchema);
