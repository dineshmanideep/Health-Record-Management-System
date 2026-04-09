const jwt = require('jsonwebtoken');
const { getModelByRole, getAccessStatusError } = require('../utils/authRoleHelpers');

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

    const Model = getModelByRole(decoded.role);
    if (!Model) {
      return res.status(401).json({ success: false, message: 'Invalid role in token' });
    }

    // Fetch the user from the DB using the role embedded in the token
    // This ensures the account still exists and is not tampered with
    const user = await Model.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'User no longer exists' });
    }

    const accessError = getAccessStatusError(decoded.role, user);
    if (accessError) {
      return res.status(accessError.status).json({ success: false, message: accessError.message });
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
