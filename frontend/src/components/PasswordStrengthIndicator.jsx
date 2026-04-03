import { validatePasswordStrength } from '../utils/passwordValidation';

const PasswordStrengthIndicator = ({ password }) => {
  if (!password) return null;

  const strength = validatePasswordStrength(password);
  const checks = [
    { key: 'minLength', label: 'At least 8 characters' },
    { key: 'hasUppercase', label: 'One uppercase letter (A-Z)' },
    { key: 'hasLowercase', label: 'One lowercase letter (a-z)' },
    { key: 'hasNumber', label: 'One number (0-9)' },
    { key: 'hasSpecialChar', label: 'One special character (!@#$%^&*)' }
  ];

  const passedCount = checks.filter(c => strength[c.key]).length;
  const progressPercent = (passedCount / checks.length) * 100;
  const progressColor = passedCount <= 2 ? 'bg-red-500' : passedCount <= 3 ? 'bg-amber-500' : passedCount <= 4 ? 'bg-indigo-500' : 'bg-emerald-500';

  return (
    <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/50">
      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mb-3 overflow-hidden">
        <div className={`h-full ${progressColor} rounded-full transition-all duration-500 ease-out`} style={{ width: `${progressPercent}%` }} />
      </div>
      <div className="space-y-1.5">
        {checks.map(c => (
          <div key={c.key} className="flex items-center gap-2">
            <span className={`text-xs transition-colors ${strength[c.key] ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
              {strength[c.key] ? '✓' : '○'} {c.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PasswordStrengthIndicator;
