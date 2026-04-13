import React, { useState, useEffect, useRef } from 'react';
import { useAccessibility } from '../context/useAccessibility';
import { useTheme } from '../context/ThemeContext';

const AccessibilityTools = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { profile, updateProfile, toggleAccessibilityMode, formErrors, clearFormErrors } = useAccessibility();
  const { theme, toggleTheme } = useTheme();
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const toggleOpen = () => setIsOpen(!isOpen);

  const ControlButton = ({ label, active, onClick, icon, showCheck = false, fullWidth = false, statusText = "" }) => (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-300 group ${fullWidth ? 'h-auto py-5' : 'h-[100px]'} ${
        active && label === "High Contrast"
          ? 'bg-black border-black text-white'
          : active 
            ? 'bg-white border-slate-300 text-slate-900 border-2 dark:bg-slate-800 dark:border-emerald-500/50 dark:text-emerald-400'
            : 'bg-white border-slate-50 text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:bg-slate-900/60 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/80 shadow-sm'
      }`}
    >
      <div className={`mb-2 flex items-center justify-center ${active && label === "High Contrast" ? 'text-white' : 'text-slate-900 dark:text-inherit'}`}>
        {icon}
      </div>
      {(active || showCheck) && (
        <div className="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-lg">
          <svg viewBox="0 0 24 24" width="8" height="8" stroke="white" strokeWidth="4" fill="none">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
      )}
      <span className={`text-[9px] font-black text-center leading-tight uppercase tracking-wider ${active && label === "High Contrast" ? 'text-white' : ''}`}>
        {label === "Dyslexic Help" || label === "Spaced Type" ? "Dyslexic" : label}
        <span className={`block text-[8px] mt-1 font-black ${active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
          {active ? (statusText || 'ON') : (statusText || 'OFF')}
        </span>
      </span>
      {label === "Normal Font" || label === "Normal Contrast" ? (
        <div className="absolute bottom-4 w-12 h-[1px] bg-slate-400 mt-1 opacity-50 dark:bg-slate-700" />
      ) : null}
    </button>
  );

  return (
    <div className="fixed bottom-32 right-4 md:right-8 z-[9999]" ref={menuRef}>
      {/* Floating Toggle Button */}
      <button
        onClick={toggleOpen}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-[0_20px_50px_rgba(16,185,129,0.3)] transition-all duration-500 border-4 border-white dark:border-slate-800 ${
          isOpen 
            ? 'bg-slate-900 text-white rotate-90 scale-110' 
            : 'bg-emerald-600 text-white hover:scale-110 hover:shadow-emerald-500/50'
        }`}
        title="Accessibility Terminal"
      >
        {isOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        ) : (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="3"></circle><path d="m9 22 2-6h2l2 6"></path><path d="M6 12h12"></path><path d="m4.5 16 1.5-4 1.5-4"></path><path d="m19.5 16-1.5-4-1.5-4"></path></svg>
        )}
      </button>

      {/* Tools Panel */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-[calc(100vw-2.5rem)] sm:w-[500px] max-h-[calc(100vh-240px)] overflow-y-auto bg-white dark:bg-[#0B1120] border border-slate-100 dark:border-slate-800 rounded-3xl shadow-[0_30px_100px_rgba(15,23,42,0.4)] p-6 md:p-10 pt-12 animate-fadeInScale custom-scrollbar translate-x-[0.5rem] sm:translate-x-0 ring-1 ring-slate-200 dark:ring-slate-800">
          <div className="pb-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between mb-10">
            <div>
                <h3 className="text-base md:text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter">Accessibility Settings</h3>
                <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 mt-1 uppercase tracking-widest leading-none">Terminal v2.5.0</p>
            </div>
            <button 
                onClick={toggleAccessibilityMode}
                className={`text-[9px] font-black px-4 py-2 rounded-xl border-2 transition-all duration-300 ${
                    profile.modeEnabled 
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-500/30' 
                    : 'bg-transparent border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:border-slate-300'
                }`}
            >
                AUTO-MODE: {profile.modeEnabled ? 'LIVE' : 'OFF'}
            </button>
          </div>

          <div className="space-y-10 md:space-y-12">
            {/* Global Theme */}
            <section>
              <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4 md:mb-6">Interface Theme</h4>
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <ControlButton
                    label="Light Mode"
                    active={theme === 'light'}
                    onClick={() => theme !== 'light' && toggleTheme()}
                    fullWidth
                    statusText={theme === 'light' ? 'ACTIVE' : 'INACTIVE'}
                    icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>}
                />
                <ControlButton
                    label="Dark Mode"
                    active={theme === 'dark'}
                    onClick={() => theme !== 'dark' && toggleTheme()}
                    fullWidth
                    statusText={theme === 'dark' ? 'ACTIVE' : 'INACTIVE'}
                    icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>}
                />
              </div>
            </section>

            {/* Matrix Contextual Controls */}
            <section>
              <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4 md:mb-6">Optimization Matrix</h4>
              
              <div className="grid grid-cols-1 gap-4 md:gap-6 mb-4 md:mb-6">
                <div className="flex flex-col gap-3 p-4 md:p-6 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Scaling Factor Matrix</span>
                        <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">{profile.textSize === 'normal' ? '1.0x' : profile.textSize === 'large' ? '1.1x' : '1.2x'}</span>
                    </div>
                    <select
                        value={profile.textSize}
                        onChange={(e) => updateProfile({ textSize: e.target.value })}
                        className="w-full px-4 md:px-5 py-3 md:py-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all cursor-pointer appearance-none shadow-sm"
                    >
                        <option value="normal">NORMAL (1.0x)</option>
                        <option value="large">LARGE (1.1x)</option>
                        <option value="extra-large">CRITICAL (1.2x)</option>
                    </select>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <ControlButton
                    label="Dyslexic Help"
                    active={profile.dyslexiaMode}
                    onClick={() => updateProfile({ dyslexiaMode: !profile.dyslexiaMode })}
                    icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>}
                />
                <ControlButton
                    label="Key Focus"
                    active={profile.keyboardMode}
                    onClick={() => updateProfile({ keyboardMode: !profile.keyboardMode })}
                    icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10"/></svg>}
                />
                <ControlButton
                    label="Target Boost"
                    active={profile.targetBoost}
                    onClick={() => updateProfile({ targetBoost: !profile.targetBoost })}
                    icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>}
                />
                <ControlButton
                    label="Form Assist"
                    active={profile.formAssistMode}
                    onClick={() => updateProfile({ formAssistMode: !profile.formAssistMode })}
                    icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>}
                />
              </div>
            </section>

            {/* Diagnostic Summary */}
            {(profile.formAssistMode || profile.modeEnabled) && formErrors.length > 0 && (
                <section className="animate-fadeIn">
                    <h4 className="text-[10px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-[0.2em] mb-4 md:mb-6">Diagnostic Summary</h4>
                    <div className="bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-100 dark:border-amber-900/50 rounded-2xl p-5 md:p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2">
                           <button onClick={clearFormErrors} className="p-1 px-2 bg-amber-200 dark:bg-amber-900/40 rounded-lg text-[8px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest hover:bg-amber-300 transition-colors">RESET</button>
                        </div>
                        <ul className="space-y-3">
                            {formErrors.map((error, index) => (
                                <li key={`${error}-${index}`} className="text-[11px] font-bold text-amber-800 dark:text-amber-200 flex items-start gap-3">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1 shadow-sm shrink-0" />
                                    <span>{error}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>
            )}

            {/* Visual Modulation */}
            <section>
              <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4 md:mb-6">Visual Modulation</h4>
              <div className="grid grid-cols-3 gap-3 md:gap-4">
                <ControlButton
                  label="High Contrast"
                  active={profile.contrast === 'high'}
                  onClick={() => updateProfile({ contrast: 'high' })}
                  icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 3v18"/><path d="M12 7l4 4-4 4"/></svg>}
                />
                <ControlButton
                  label="Normal Contrast"
                  active={profile.contrast === 'normal'}
                  onClick={() => updateProfile({ contrast: 'normal' })}
                  icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="4" y="4" width="16" height="16" rx="2"/><circle cx="12" cy="12" r="3"/></svg>}
                />
                <ControlButton
                  label="Highlight Links"
                  active={profile.highlightLinks}
                  onClick={() => updateProfile({ highlightLinks: !profile.highlightLinks })}
                  icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>}
                />
                <ControlButton
                  label="Invert"
                  active={profile.invert}
                  onClick={() => updateProfile({ invert: !profile.invert })}
                  icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18V4c4.41 0 8 3.59 8 8s-3.59 8-8 8z"/></svg>}
                />
                <ControlButton
                  label="Saturation"
                  active={profile.saturation !== 'normal'}
                  onClick={() => updateProfile({ saturation: profile.saturation === 'low' ? 'high' : (profile.saturation === 'high' ? 'normal' : 'low') })}
                  icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2s-8 5.33-8 10a8 8 0 0 0 16 0c0-4.67-8-10-8-10z"/><path d="M12 2v20a8 8 0 0 0 8-8c0-4.67-8-10-8-10z" fill="currentColor"/></svg>}
                />
              </div>
            </section>

            {/* Parameter Adjustment */}
            <section>
              <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4 md:mb-6">Parameter Adjustment</h4>
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <ControlButton
                  label="Text Spacing"
                  active={profile.textSpacing === 'high'}
                  onClick={() => updateProfile({ textSpacing: profile.textSpacing === 'high' ? 'normal' : 'high' })}
                  fullWidth
                  icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M7 5H3v14h4M17 5h4v14h-4M7 12h10M4 12l3 3m-3-3l3-3m13 0l-3 3 3 3"/></svg>}
                />
                <ControlButton
                  label="Line Height"
                  active={profile.lineHeight === 'high'}
                  onClick={() => updateProfile({ lineHeight: profile.lineHeight === 'high' ? 'normal' : 'high' })}
                  fullWidth
                  icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 7H3M21 17H3M12 12h9M15 9l-3 3 3 3"/></svg>}
                />
              </div>
            </section>

            {/* System Parameters */}
            <section>
              <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4 md:mb-6">System Level</h4>
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <ControlButton
                  label="Hide Images"
                  active={profile.hideImages}
                  onClick={() => updateProfile({ hideImages: !profile.hideImages })}
                  fullWidth
                  icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="21" x2="21" y2="3"/><path d="M8.5 8.5v0"/></svg>}
                />
                <ControlButton
                  label="Big Cursor"
                  active={profile.bigCursor}
                  onClick={() => updateProfile({ bigCursor: !profile.bigCursor })}
                  fullWidth
                  icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 4l7.07 16.97 2.51-6.73 6.73-2.51L4 4z"/><path d="M12 12l2-2M15 15l2-2M18 18l2-2" strokeDasharray="2 2"/></svg>}
                />
              </div>
            </section>
          </div>

          <div className="mt-10 md:mt-12 pt-6 md:pt-8 border-t border-slate-100 dark:border-slate-800 text-center">
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.4em]">
                Governance Protocol v2.5.0-STABLE
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccessibilityTools;
