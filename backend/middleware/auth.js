const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Hospital = require('../models/Hospital');
const Nurse = require('../models/Nurse');
const Admin = require('../models/Admin');

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }

  try {
    // Verify token signature and expiry
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch the user from the DB using the role embedded in the token
    // This ensures the account still exists and is not tampered with
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
        return res.status(401).json({ success: false, message: 'Invalid role in token' });
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'User no longer exists' });
    }

    // Role-specific account status enforcement
    if (decoded.role === 'hospital') {
      if (user.accountStatus !== 'active') {
        return res.status(403).json({ success: false, message: 'Hospital account is not active. Please contact support.' });
      }
    } else if (decoded.role === 'doctor' || decoded.role === 'nurse') {
      if (user.accountStatus === 'pending_verification') {
        return res.status(403).json({ success: false, message: 'Account pending admin verification' });
      }
      if (user.accountStatus === 'suspended') {
        return res.status(403).json({ success: false, message: 'Account has been suspended' });
      }
    } else {
      // Patient and Admin use isActive boolean
      if (user.isActive === false) {
        return res.status(403).json({ success: false, message: 'Account is deactivated' });
      }
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired, please log in again' });
    }
    return res.status(401).json({ success: false, message: 'Not authorized, invalid token' });
  }
};

// Middleware to enforce role-based authorization
// Must be used AFTER protect middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied: role '${req.user.role}' is not permitted to access this resource`
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
