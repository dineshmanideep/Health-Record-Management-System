import { validatePasswordStrength } from '../utils/passwordValidation';

/**
 * PasswordStrengthIndicator Component
 * Displays real-time password strength feedback
 */
const PasswordStrengthIndicator = ({ password }) => {
  if (!password) return null;

  const strength = validatePasswordStrength(password);

  return (
    <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <p className="text-xs font-semibold text-gray-700 mb-2">Password Requirements:</p>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className={`text-xs ${strength.minLength ? 'text-green-600' : 'text-gray-400'}`}>
            {strength.minLength ? '✓' : '○'} At least 8 characters
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs ${strength.hasUppercase ? 'text-green-600' : 'text-gray-400'}`}>
            {strength.hasUppercase ? '✓' : '○'} One uppercase letter (A-Z)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs ${strength.hasLowercase ? 'text-green-600' : 'text-gray-400'}`}>
            {strength.hasLowercase ? '✓' : '○'} One lowercase letter (a-z)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs ${strength.hasNumber ? 'text-green-600' : 'text-gray-400'}`}>
            {strength.hasNumber ? '✓' : '○'} One number (0-9)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs ${strength.hasSpecialChar ? 'text-green-600' : 'text-gray-400'}`}>
            {strength.hasSpecialChar ? '✓' : '○'} One special character (!@#$%^&*)
          </span>
        </div>
      </div>
    </div>
  );
};

export default PasswordStrengthIndicator;
