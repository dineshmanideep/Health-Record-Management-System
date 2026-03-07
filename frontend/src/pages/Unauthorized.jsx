import { Link } from 'react-router-dom';

const Unauthorized = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-indigo-500 to-purple-700 text-white text-center p-5">
      <h1 className="text-7xl m-0">403</h1>
      <h2 className="text-3xl my-5">Access Denied</h2>
      <p className="text-lg mb-8">
        You don't have permission to access this page.
      </p>
      <Link 
        to="/dashboard" 
        className="bg-white text-indigo-500 px-10 py-4 rounded-full no-underline font-semibold text-base hover:bg-gray-100 transition-colors"
      >
        Go to Dashboard
      </Link>
    </div>
  );
};

export default Unauthorized;
