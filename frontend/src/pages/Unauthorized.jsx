import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

const Unauthorized = () => {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-linear-to-br from-indigo-500 to-purple-700 text-white text-center p-5">
      <h1 className="text-7xl m-0">403</h1>
      <h2 className="text-3xl my-5">{t({ en: 'Access Denied', hi: 'पहुंच नहीं है' })}</h2>
      <p className="text-lg mb-8">
        {t({ en: "You don't have permission to access this page.", hi: 'आपको इस पेज को देखने की अनुमति नहीं है।' })}
      </p>
      <Link 
        to="/dashboard" 
        className="bg-white text-indigo-500 px-10 py-4 rounded-full no-underline font-semibold text-base hover:bg-gray-100 transition-colors"
      >
        {t({ en: 'Go to Dashboard', hi: 'डैशबोर्ड पर जाएं' })}
      </Link>
    </div>
  );
};

export default Unauthorized;
