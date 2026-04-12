import React, { useEffect, useState } from 'react';

const LoadingScreen = ({ message = 'Initialising secure session' }) => {
  const [dots, setDots] = useState('');
  const [stateMessage, setStateMessage] = useState(message);

  // States to cycle through for extra style
  const states = [
    'Verifying credentials',
    'Securing connection',
    'Encrypting medical data',
    'Loading clinical module',
    'Readying dashboard'
  ];

  useEffect(() => {
    const dotsInterval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);

    let stateIndex = 0;
    const stateInterval = setInterval(() => {
      stateIndex = (stateIndex + 1) % states.length;
      setStateMessage(states[stateIndex]);
    }, 2000);

    return () => {
      clearInterval(dotsInterval);
      clearInterval(stateInterval);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[10000] bg-slate-50 dark:bg-[#0B1120] flex flex-col items-center justify-center overflow-hidden transition-colors duration-500">
      {/* Dynamic Background Orbs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 dark:bg-emerald-500/5 blur-[120px] rounded-full animate-float" />
      <div className="absolute top-1/4 left-1/3 w-[400px] h-[400px] bg-indigo-500/10 dark:bg-indigo-500/5 blur-[100px] rounded-full animate-float" style={{ animationDelay: '1s' }} />
      
      <div className="relative flex flex-col items-center text-center">
        {/* Pulsing Medical Cross */}
        <div className="relative mb-12">
          <div className="absolute inset-0 bg-emerald-500/20 dark:bg-emerald-500/40 blur-2xl rounded-full animate-pulse scale-150" />
          <div className="relative w-20 h-20 bg-emerald-600 rounded-2xl flex items-center justify-center text-white text-4xl font-bold shadow-2xl shadow-emerald-500/30 animate-fadeInScale">
            ✚
            {/* Inner rotating ring */}
            <div className="absolute -inset-2 border-2 border-emerald-500/30 rounded-[1.5rem] animate-[spin_4s_linear_infinite]" />
            {/* Outer dotted ring */}
            <div className="absolute -inset-6 border border-dashed border-emerald-500/20 rounded-[2rem] animate-[spin_8s_linear_infinite_reverse]" />
          </div>
        </div>

        {/* Text Content */}
        <div className="space-y-4 animate-slideUp">
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-800 dark:text-white">
            HRMS <span className="text-emerald-600 dark:text-emerald-400">Portal</span>
          </h2>
          
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] h-5 min-w-[200px]">
              {stateMessage}
              <span className="inline-block w-6 text-left">{dots}</span>
            </p>
            <div className="w-48 h-1 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
               <div className="h-full bg-emerald-600 animate-[shimmer_1.5s_infinite] w-1/3 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Safety Note */}
      <p className="absolute bottom-12 text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-[0.3em] flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Secure HIPAA-Compliant Gateway
      </p>
    </div>
  );
};

export default LoadingScreen;
