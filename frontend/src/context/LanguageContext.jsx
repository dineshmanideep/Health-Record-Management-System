import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const LanguageContext = createContext();

const STORAGE_KEY = 'hrmsLanguage';

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'hi' ? 'hi' : 'en';
  });

  const updateLanguage = useCallback((nextLanguage) => {
    const value = nextLanguage === 'hi' ? 'hi' : 'en';
    setLanguage(value);
    localStorage.setItem(STORAGE_KEY, value);
  }, []);

  const toggleLanguage = useCallback(() => {
    updateLanguage(language === 'en' ? 'hi' : 'en');
  }, [language, updateLanguage]);

  const t = useCallback((map, fallback = '') => {
    if (!map) return fallback;
    if (typeof map === 'string') return map;
    return map[language] ?? map.en ?? fallback;
  }, [language]);

  const value = useMemo(() => ({ language, setLanguage: updateLanguage, toggleLanguage, t }), [language, updateLanguage, toggleLanguage, t]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within a LanguageProvider');
  return context;
};
