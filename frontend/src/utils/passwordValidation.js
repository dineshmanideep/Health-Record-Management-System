/**
 * Password validation utility
 * Enforces strong password requirements
 */

export const passwordRequirements = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: true
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {object} - Object with validation results
 */
export const validatePasswordStrength = (password) => {
  return {
    minLength: password.length >= passwordRequirements.minLength,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)
  };
};

/**
 * Check if password meets all requirements
 * @param {string} password - Password to validate
 * @returns {boolean} - True if password is valid
 */
export const isPasswordValid = (password) => {
  const strength = validatePasswordStrength(password);
  return Object.values(strength).every(value => value === true);
};

/**
 * Get password validation error message
 * @param {string} password - Password to validate
 * @returns {string} - Error message or empty string if valid
 */
export const getPasswordError = (password) => {
  if (password.length < passwordRequirements.minLength) {
    return `Password must be at least ${passwordRequirements.minLength} characters`;
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number';
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    return 'Password must contain at least one special character (!@#$%^&*)';
  }
  return '';
};

/**
 * React component helper for password strength indicator
 * @param {string} password - Password to check
 * @returns {object} - Strength object with boolean values
 */
export const usePasswordStrength = (password) => {
  return validatePasswordStrength(password);
};
