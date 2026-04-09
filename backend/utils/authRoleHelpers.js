const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Hospital = require('../models/Hospital');
const Nurse = require('../models/Nurse');
const Admin = require('../models/Admin');

const ROLE_MODEL_MAP = {
  user: User,
  doctor: Doctor,
  hospital: Hospital,
  nurse: Nurse,
  admin: Admin
};

function getModelByRole(role) {
  return ROLE_MODEL_MAP[role] || null;
}

function getAccessStatusError(role, account) {
  if (!account) {
    return {
      status: 401,
      message: 'Account not found'
    };
  }

  if (role === 'hospital') {
    if (account.accountStatus === 'pending_approval') {
      return {
        status: 403,
        message: 'Hospital account is pending admin approval.'
      };
    }
    if (account.accountStatus === 'rejected') {
      return {
        status: 403,
        message: 'Hospital account was rejected. Please contact support.'
      };
    }
    if (account.accountStatus === 'suspended') {
      return {
        status: 403,
        message: 'Hospital account is suspended. Please contact support.'
      };
    }
    if (account.accountStatus !== 'active') {
      return {
        status: 403,
        message: 'Hospital account is not active.'
      };
    }
    return null;
  }

  if (role === 'doctor' || role === 'nurse') {
    if (account.accountStatus === 'pending_verification') {
      return {
        status: 403,
        message: 'Account is pending admin verification.'
      };
    }
    if (account.accountStatus === 'suspended') {
      return {
        status: 403,
        message: 'Account is suspended. Please contact support.'
      };
    }
    if (account.accountStatus !== 'verified') {
      return {
        status: 403,
        message: 'Account is not verified.'
      };
    }
    return null;
  }

  if (account.isActive === false) {
    return {
      status: 403,
      message: 'Account is deactivated. Please contact support.'
    };
  }

  return null;
}

function buildAuthResponseData(account, role, token) {
  const payload = {
    _id: account._id,
    name: account.name,
    email: account.email,
    role: account.role,
    token
  };

  if (role === 'user') {
    payload.patientId = account.patientId;
  }

  return payload;
}

module.exports = {
  getModelByRole,
  getAccessStatusError,
  buildAuthResponseData
};
