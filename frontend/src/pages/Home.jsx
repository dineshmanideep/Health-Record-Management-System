import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import LoadingScreen from '../components/LoadingScreen';

const Home = () => {
  const { isAuthenticated, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage, t } = useLanguage();

  if (loading) return <LoadingScreen />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const features = [
    { icon: '🛡️', title: t({ en: 'For Patients', hi: 'मरीजों के लिए' }), desc: t({ en: 'Securely store and access your complete medical history from anywhere, anytime with a single tap.', hi: 'अपना पूरा मेडिकल इतिहास सुरक्षित रखें और कहीं से भी, कभी भी एक टैप में देखें।' }), color: 'from-indigo-500 to-purple-500' },
    { icon: '🩺', title: t({ en: 'For Doctors', hi: 'डॉक्टरों के लिए' }), desc: t({ en: 'Instant access to comprehensive patient data for faster, evidence-based clinical decisions.', hi: 'मरीज का पूरा डेटा तुरंत पाएं और जल्दी, सही फैसले लें।' }), color: 'from-teal-500 to-cyan-500' },
    { icon: '🏥', title: t({ en: 'For Hospitals', hi: 'अस्पतालों के लिए' }), desc: t({ en: 'Elevate operational efficiency by centralizing records and eliminating data silos across departments.', hi: 'रिकॉर्ड एक जगह रखकर काम आसान बनाएं और विभागों का डेटा अलग-अलग न रहे।' }), color: 'from-blue-500 to-indigo-500' },
    { icon: '💉', title: t({ en: 'For Nurses', hi: 'नर्सों के लिए' }), desc: t({ en: 'Real-time updates and seamless test result uploads for perfectly coordinated patient care.', hi: 'रियल-टाइम अपडेट और टेस्ट रिपोर्ट आसानी से अपलोड करें।' }), color: 'from-pink-500 to-rose-500' }
  ];



  return (
    <div className={`min-h-screen bg-white dark:bg-[#0a0f1e] transition-colors duration-500 ${theme === 'dark' ? 'dark' : ''}`}>
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 glass-strong border-b border-slate-200/50 dark:border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex justify-between items-center">
          <div className="flex items-center gap-2.5 group cursor-pointer">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 group-hover:scale-105 transition-all">
              <span className="text-sm font-bold">✚</span>
            </div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white hidden sm:block">
              HRMS <span className="text-indigo-600 dark:text-indigo-400">{t({ en: 'Portal', hi: 'पोर्टल' })}</span>
            </h2>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={toggleTheme}
              className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-amber-400 hover:scale-105 transition-all flex items-center justify-center"
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <button
              onClick={toggleLanguage}
              title={t({ en: 'Switch language', hi: 'भाषा बदलें' })}
              className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:scale-105 transition-all flex items-center justify-center"
            >
              {language === 'en' ? 'EN' : 'HI'}
            </button>
            <Link to="/login" className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors px-3 py-2">
              {t({ en: 'Sign In', hi: 'साइन इन' })}
            </Link>
            <Link to="/signup" className="hidden sm:inline-flex bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all">
              {t({ en: 'Get Started', hi: 'शुरू करें' })}
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-28 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Gradient Orbs */}
        <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-indigo-400/10 dark:bg-indigo-500/5 blur-[120px] rounded-full -z-10" />
        <div className="absolute top-40 right-1/4 w-[400px] h-[400px] bg-purple-400/10 dark:bg-purple-500/5 blur-[120px] rounded-full -z-10" />
        
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-semibold tracking-wide uppercase mb-8 animate-fadeIn border border-indigo-100 dark:border-indigo-800/50">
            <span className="flex h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
            {t({ en: 'Next-Gen Healthcare Platform', hi: 'नया हेल्थकेयर प्लेटफॉर्म' })}
          </div>
          
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-slate-900 dark:text-white mb-6 leading-[1.1] tracking-tight animate-slideUp">
            {t({ en: 'Your Health Data,', hi: 'आपका हेल्थ डेटा,' })}{' '}
            <br className="hidden sm:block" />
            <span className="gradient-text">{t({ en: 'Unified & Secure', hi: 'एक जगह और सुरक्षित' })}</span>
          </h1>
          
          <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed mb-10 animate-slideUp" style={{ animationDelay: '0.1s' }}>
            {t({ en: 'A centralized, globally accessible health record platform. Empower patients, doctors, and hospitals with unified medical intelligence.', hi: 'एक केंद्रीकृत हेल्थ रिकॉर्ड प्लेटफॉर्म जो कहीं से भी इस्तेमाल हो सके। मरीज, डॉक्टर और अस्पताल सबको एक साथ सही जानकारी मिले।' })}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center animate-slideUp" style={{ animationDelay: '0.2s' }}>
            <Link to="/signup" className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-8 py-3.5 rounded-2xl font-semibold text-base shadow-xl shadow-indigo-500/25 hover:-translate-y-1 hover:shadow-indigo-500/40 transition-all">
              {t({ en: 'Create Free Account', hi: 'फ्री अकाउंट बनाएं' })}
            </Link>
            <Link to="/login" className="w-full sm:w-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-white px-8 py-3.5 rounded-2xl font-semibold text-base hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
              {t({ en: 'Sign In →', hi: 'साइन इन →' })}
            </Link>
          </div>
        </div>
      </section>



      {/* Features Grid */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight">{t({ en: 'Built for Everyone', hi: 'सबके लिए बनाया गया' })}</h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto">{t({ en: 'Role-based access ensures every stakeholder gets exactly what they need.', hi: 'रोल के हिसाब से हर व्यक्ति को वही मिलता है जो उसे चाहिए।' })}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 stagger-children">
          {features.map((f, i) => (
            <div key={i} className="group p-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 hover-lift animate-fadeInScale" style={{ animationDelay: `${i * 0.1}s`, opacity: 0, animationFillMode: 'forwards' }}>
              <div className={`w-14 h-14 text-3xl mb-5 bg-gradient-to-br ${f.color} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
                <span className="drop-shadow-sm">{f.icon}</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{f.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 rounded-3xl p-10 sm:p-16 text-center relative overflow-hidden shadow-2xl shadow-indigo-500/30">
          <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/3 blur-xl" />
          
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white mb-4 relative z-10 tracking-tight">
            {t({ en: 'Ready to modernize your healthcare?', hi: 'हेल्थकेयर को आधुनिक बनाने के लिए तैयार?' })}
          </h2>
          <p className="text-indigo-100 text-base sm:text-lg mb-8 relative z-10 max-w-xl mx-auto leading-relaxed opacity-90">
            {t({ en: 'Join the platform trusted by healthcare professionals for secure, centralized medical record management.', hi: 'सुरक्षित और केंद्रीकृत रिकॉर्ड के लिए भरोसेमंद प्लेटफॉर्म से जुड़ें।' })}
          </p>
          <Link to="/signup" className="relative z-10 inline-flex bg-white text-indigo-700 px-8 py-3.5 rounded-2xl font-bold text-base shadow-xl hover:-translate-y-1 hover:shadow-2xl transition-all">
            {t({ en: 'Start for Free', hi: 'फ्री शुरू करें' })}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-50 dark:bg-[#0a0f1e] border-t border-slate-100 dark:border-slate-800/50 py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col items-center">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center text-[10px] text-white font-bold shadow-md">✚</div>
            <span className="font-bold text-slate-900 dark:text-white text-sm">HRMS {t({ en: 'Portal', hi: 'पोर्टल' })}</span>
          </div>
          <p className="text-slate-400 dark:text-slate-600 text-xs font-medium">
            © {new Date().getFullYear()} {t({ en: 'Health Record Management System. All rights reserved.', hi: 'हेल्थ रिकॉर्ड मैनेजमेंट सिस्टम। सभी अधिकार सुरक्षित।' })}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
