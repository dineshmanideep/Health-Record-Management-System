import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const FloatingNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Check if we are on a dashboard-related route that has a sidebar on desktop
  const isDashboardRoute = [
    '/patient', '/doctor', '/nurse', '/hospital', '/admin', '/dashboard'
  ].some(path => location.pathname.startsWith(path));

  // Check if we are on a login or signup page specifically
  const isAuthPage = ['/login', '/signup'].includes(location.pathname);

  // Only show the floating nav on non-dashboard pages (Home, Login, etc.)
  // because dashboard pages now have these controls integrated into the sidebar.
  if (isDashboardRoute) return null;

  return (
    <div 
      className={`fixed ${isAuthPage ? 'top-2 left-8' : 'top-40 left-6'} z-[9999] flex items-center gap-1.5 p-1 glass-strong border border-slate-200/50 dark:border-slate-800/50 rounded-xl shadow-2xl shadow-black/10 animate-fadeIn pointer-events-auto transition-all duration-300`}
    >
      <button
        onClick={() => navigate(-1)}
        className="group flex items-center justify-center w-8 h-8 bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 border border-slate-100 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-800/50 rounded-lg transition-all duration-300 hover:scale-110 active:scale-95 shadow-sm"
        title="Go Back"
        aria-label="Previous Page"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="14" 
          height="14" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="3" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          className="group-hover:-translate-x-0.5 transition-transform"
        >
          <path d="m15 18-6-6 6-6"/>
        </svg>
      </button>

      <div className="w-px h-4 bg-slate-200 dark:bg-slate-800" />

      <button
        onClick={() => navigate(1)}
        className="group flex items-center justify-center w-8 h-8 bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 border border-slate-100 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-800/50 rounded-lg transition-all duration-300 hover:scale-110 active:scale-95 shadow-sm"
        title="Go Forward"
        aria-label="Next Page"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="14" 
          height="14" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="3" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          className="group-hover:translate-x-0.5 transition-transform"
        >
          <path d="m9 18 6-6 6-6"/>
        </svg>
      </button>
    </div>
  );
};

export default FloatingNav;
