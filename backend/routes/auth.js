const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { protect } = require('../middleware/auth');
const {
  getModelByRole,
  getAccessStatusError,
  buildAuthResponseData
} = require('../utils/authRoleHelpers');

const DEFAULT_ACCESSIBILITY_PROFILE = {
  modeEnabled: false,
  textSize: 'normal',
  keyboardMode: false,
  dyslexiaMode: false,
  targetBoost: false,
  formAssistMode: false,
  accessibleChartsMode: false
};

const normalizeAccessibilityProfile = (input = {}) => {
  const textSize = ['normal', 'large', 'extra-large'].includes(input.textSize)
    ? input.textSize
    : DEFAULT_ACCESSIBILITY_PROFILE.textSize;

  return {
    modeEnabled: Boolean(input.modeEnabled),
    textSize,
    keyboardMode: Boolean(input.keyboardMode),
    dyslexiaMode: Boolean(input.dyslexiaMode),
    targetBoost: Boolean(input.targetBoost),
    formAssistMode: Boolean(input.formAssistMode),
    accessibleChartsMode: Boolean(input.accessibleChartsMode)
  };
};

// Generate JWT Token
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  });
};

// @route   POST /api/auth/signup
// @desc    Register a new user — patient, doctor, nurse, or hospital only
// @access  Public
router.post('/signup', async (req, res) => {
  try {
    const { role, ...userData } = req.body;

    // Admin accounts are pre-seeded — no public signup allowed
    if (role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin accounts cannot be created through public signup'
      });
    }

    if (!role) {
      return res.status(400).json({ success: false, message: 'Role is required' });
    }

    const Model = getModelByRole(role);
    if (!Model) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    // Check if user already exists
    const existingUser = await Model.findOne({ email: userData.email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Determine initial accountStatus based on role
    const statusDefaults = {
      hospital: { accountStatus: 'pending_approval' },
      doctor:   { accountStatus: 'pending_verification' },
      nurse:    { accountStatus: 'pending_verification' }
    };
    const extraFields = statusDefaults[role] || {};

    const user = await Model.create({ ...userData, role, ...extraFields });

    if (user) {
      // Patient — immediately active, issue JWT
      if (role === 'user') {
        const token = generateToken(user._id, role);
        return res.status(201).json({
          success: true,
          data: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            patientId: user.patientId,
            token
          }
        });
      }

      // Hospital / Doctor / Nurse — pending, no JWT issued
      const pendingMessages = {
        hospital: 'Your hospital registration has been submitted. An admin will review and approve your application. You will be able to log in once approved.',
        doctor:   'Your account has been created. An admin will verify your medical license. You will be able to log in once verified.',
        nurse:    'Your account has been created. An admin will verify your nursing license. You will be able to log in once verified.'
      };

      return res.status(201).json({
        success: true,
        pending: true,
        role,
        message: pendingMessages[role]
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

    const accessError = getAccessStatusError(role, user);
    if (accessError) {
      return res.status(accessError.status).json({
        success: false,
        message: accessError.message
      });
    }

    const token = generateToken(user._id, role);

    res.json({
      success: true,
      data: buildAuthResponseData(user, role, token)
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
// @desc    Get current logged in user (verified from DB, not just JWT payload)
// @access  Private — requires valid JWT
router.get('/me', protect, async (req, res) => {
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

// @route   GET /api/auth/accessibility-profile
// @desc    Get current user's accessibility profile
// @access  Private
router.get('/accessibility-profile', protect, async (req, res) => {
  try {
    const profile = {
      ...DEFAULT_ACCESSIBILITY_PROFILE,
      ...(req.user.accessibilityProfile || {})
    };

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/auth/accessibility-profile
// @desc    Update current user's accessibility profile
// @access  Private
router.put('/accessibility-profile', protect, async (req, res) => {
  try {
    const Model = getModelByRole(req.user.role);
    if (!Model) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role'
      });
    }

    const normalized = normalizeAccessibilityProfile(req.body || {});

    const updatedUser = await Model.findByIdAndUpdate(
      req.user._id,
      { $set: { accessibilityProfile: normalized } },
      { returnDocument: 'after' }
    ).select('accessibilityProfile');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        ...DEFAULT_ACCESSIBILITY_PROFILE,
        ...(updatedUser.accessibilityProfile || {})
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
