import { useCallback, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/api';
import { useAuth } from './AuthContext';
import { AccessibilityContext } from './AccessibilityContextValue';

const ACCESSIBILITY_STORAGE_KEY = 'accessibilityProfile';

const DEFAULT_PROFILE = {
  modeEnabled: false,
  textSize: 'normal',
  keyboardMode: false,
  dyslexiaMode: false,
  targetBoost: false,
  formAssistMode: false,
  accessibleChartsMode: false
};

const normalizeProfile = (value = {}) => {
  const safeTextSize = ['normal', 'large', 'extra-large'].includes(value.textSize)
    ? value.textSize
    : DEFAULT_PROFILE.textSize;

  return {
    modeEnabled: Boolean(value.modeEnabled),
    textSize: safeTextSize,
    keyboardMode: Boolean(value.keyboardMode),
    dyslexiaMode: Boolean(value.dyslexiaMode),
    targetBoost: Boolean(value.targetBoost),
    formAssistMode: Boolean(value.formAssistMode),
    accessibleChartsMode: Boolean(value.accessibleChartsMode)
  };
};

export const AccessibilityProvider = ({ children }) => {
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState(() => {
    try {
      const stored = localStorage.getItem(ACCESSIBILITY_STORAGE_KEY);
      return stored ? normalizeProfile(JSON.parse(stored)) : DEFAULT_PROFILE;
    } catch {
      return DEFAULT_PROFILE;
    }
  });
  const [loading, setLoading] = useState(true);
  const [formErrors, setFormErrors] = useState([]);

  useEffect(() => {
    localStorage.setItem(ACCESSIBILITY_STORAGE_KEY, JSON.stringify(profile));

    const root = window.document.documentElement;
    root.dataset.a11yMode = profile.modeEnabled ? 'on' : 'off';
    root.dataset.a11yTextSize = profile.textSize;
    root.dataset.a11yKeyboard = profile.keyboardMode ? 'on' : 'off';
    root.dataset.a11yDyslexia = profile.dyslexiaMode ? 'on' : 'off';
    root.dataset.a11yTargetBoost = profile.targetBoost ? 'on' : 'off';
    root.dataset.a11yFormAssist = profile.formAssistMode ? 'on' : 'off';
    root.dataset.a11yCharts = profile.accessibleChartsMode ? 'on' : 'off';

    root.classList.toggle('a11y-mode', profile.modeEnabled);
    root.classList.toggle('a11y-keyboard', profile.keyboardMode || profile.modeEnabled);
    root.classList.toggle('a11y-dyslexia', profile.dyslexiaMode);
    root.classList.toggle('a11y-target-boost', profile.targetBoost);
  }, [profile]);

  useEffect(() => {
    const loadRemoteProfile = async () => {
      if (authLoading) return;

      if (!isAuthenticated || !user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await authService.getAccessibilityProfile();
        if (response?.success && response.data) {
          setProfile(normalizeProfile(response.data));
        }
      } catch (error) {
        console.debug('Accessibility profile fetch fallback to local profile', error?.message || error);
      } finally {
        setLoading(false);
      }
    };

    loadRemoteProfile();
  }, [isAuthenticated, user, authLoading]);

  useEffect(() => {
    const onInvalid = (event) => {
      if (!(profile.formAssistMode || profile.modeEnabled)) return;
      const target = event.target;
      if (!target || typeof target !== 'object') return;

      const name = target.getAttribute('aria-label')
        || target.getAttribute('name')
        || target.getAttribute('id')
        || 'Field';
      const message = target.validationMessage || 'Please check this field';

      setFormErrors((prev) => {
        const next = [`${name}: ${message}`, ...prev.filter((item) => item !== `${name}: ${message}`)];
        return next.slice(0, 5);
      });
    };

    window.addEventListener('invalid', onInvalid, true);
    return () => window.removeEventListener('invalid', onInvalid, true);
  }, [profile.formAssistMode, profile.modeEnabled]);

  const saveProfile = useCallback(async (nextProfile) => {
    const normalized = normalizeProfile(nextProfile);
    setProfile(normalized);

    if (isAuthenticated) {
      try {
        await authService.updateAccessibilityProfile(normalized);
      } catch (error) {
        console.debug('Accessibility profile save fallback to local profile', error?.message || error);
      }
    }
  }, [isAuthenticated]);

  const updateProfile = useCallback(async (updates) => {
    const merged = normalizeProfile({ ...profile, ...updates });
    await saveProfile(merged);
  }, [profile, saveProfile]);

  const toggleAccessibilityMode = useCallback(async () => {
    if (profile.modeEnabled) {
      await updateProfile({ modeEnabled: false });
      return;
    }

    await updateProfile({
      modeEnabled: true,
      textSize: profile.textSize === 'normal' ? 'large' : profile.textSize,
      keyboardMode: true,
      dyslexiaMode: true,
      targetBoost: true,
      formAssistMode: true,
      accessibleChartsMode: true
    });
  }, [profile, updateProfile]);

  const clearFormErrors = () => setFormErrors([]);

  const value = useMemo(() => ({
    profile,
    loading,
    formErrors,
    updateProfile,
    toggleAccessibilityMode,
    clearFormErrors
  }), [profile, loading, formErrors, updateProfile, toggleAccessibilityMode]);

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
};
