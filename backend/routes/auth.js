const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Hospital = require('../models/Hospital');
const Nurse = require('../models/Nurse');
const Admin = require('../models/Admin');

// Generate JWT Token
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// Helper function to get model based on role
const getModelByRole = (role) => {
  switch (role) {
    case 'user':
      return User;
    case 'doctor':
      return Doctor;
    case 'hospital':
      return Hospital;
    case 'nurse':
      return Nurse;
    case 'admin':
      return Admin;
    default:
      return null;
  }
};

// @route   POST /api/auth/signup
// @desc    Register a new user (any role)
// @access  Public
router.post('/signup', async (req, res) => {
  try {
    const { role, ...userData } = req.body;

    if (!role) {
      return res.status(400).json({
        success: false,
        message: 'Role is required'
      });
    }

    const Model = getModelByRole(role);
    
    if (!Model) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role'
      });
    }

    // Check if user already exists
    const existingUser = await Model.findOne({ email: userData.email });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create new user
    const user = await Model.create({
      ...userData,
      role
    });

    if (user) {
      const token = generateToken(user._id, role);
      
      res.status(201).json({
        success: true,
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          token
        }
      });
    }
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error during signup'
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user (any role)
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email, password, and role'
      });
    }

    const Model = getModelByRole(role);
    
    if (!Model) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role'
      });
    }

    // Find user and include password
    const user = await Model.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact support.'
      });
    }

    const token = generateToken(user._id, role);

    res.json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current logged in user
// @access  Private
router.get('/me', async (req, res) => {
  try {
    // This route would require auth middleware
    res.json({
      success: true,
      data: req.user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
