const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Hospital = require('../models/Hospital');
const Nurse = require('../models/Nurse');
const Admin = require('../models/Admin');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token based on role
      let user;
      switch (decoded.role) {
        case 'user':
          user = await User.findById(decoded.id).select('-password');
          break;
        case 'doctor':
          user = await Doctor.findById(decoded.id).select('-password');
          break;
        case 'hospital':
          user = await Hospital.findById(decoded.id).select('-password');
          break;
        case 'nurse':
          user = await Nurse.findById(decoded.id).select('-password');
          break;
        case 'admin':
          user = await Admin.findById(decoded.id).select('-password');
          break;
        default:
          return res.status(401).json({ success: false, message: 'Invalid role' });
      }

      if (!user) {
        return res.status(401).json({ success: false, message: 'User not found' });
      }

      req.user = user;
      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }
};

// Middleware to check specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role ${req.user.role} is not authorized to access this route`
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
