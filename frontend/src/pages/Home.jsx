import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <nav className="flex justify-between items-center px-12 py-5 bg-white shadow-md">
        <div>
          <h2 className="text-purple-600 text-xl font-bold m-0">Health Record Management System</h2>
        </div>
        <div className="flex gap-5 items-center">
          <Link to="/login" className="text-gray-800 no-underline font-medium hover:text-purple-600 transition-colors">
            Login
          </Link>
          <Link to="/signup" className="bg-gradient-to-r from-purple-600 to-purple-800 text-white px-6 py-2.5 rounded-full no-underline font-semibold hover:-translate-y-0.5 hover:shadow-lg transition-all text-sm">
            Sign Up
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-purple-600 to-purple-800 text-white py-24 px-12 text-center">
        <div>
          <h1 className="text-5xl mb-5 font-bold">Centralized Health Records for Everyone</h1>
          <p className="text-xl mb-10 max-w-3xl mx-auto leading-relaxed">
            Access your complete medical history anytime, anywhere. 
            Visit any hospital and share your health records seamlessly.
          </p>
          <div className="flex gap-5 justify-center">
            <Link to="/signup" className="bg-white text-purple-600 px-10 py-4 rounded-full no-underline font-semibold text-base hover:-translate-y-1 hover:shadow-xl transition-all">
              Get Started
            </Link>
            <Link to="/login" className="bg-transparent text-white px-10 py-4 rounded-full no-underline font-semibold text-base border-2 border-white hover:bg-white/10 hover:-translate-y-1 transition-all">
              Login
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-12 text-center">
        <h2 className="text-4xl mb-12 text-gray-800">Why Choose Our System?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 max-w-6xl mx-auto">
          <div className="p-8 bg-white rounded-xl shadow-lg hover:-translate-y-2 hover:shadow-2xl transition-all">
            <div className="text-6xl mb-5">👤</div>
            <h3 className="text-purple-600 mb-4 text-xl font-semibold">For Patients</h3>
            <p className="text-gray-600 leading-relaxed">
              Keep all your medical records in one secure place. Access them from any hospital.
            </p>
          </div>
          <div className="p-8 bg-white rounded-xl shadow-lg hover:-translate-y-2 hover:shadow-2xl transition-all">
            <div className="text-6xl mb-5">⚕️</div>
            <h3 className="text-purple-600 mb-4 text-xl font-semibold">For Doctors</h3>
            <p className="text-gray-600 leading-relaxed">
              View complete patient history instantly. Make informed decisions faster.
            </p>
          </div>
          <div className="p-8 bg-white rounded-xl shadow-lg hover:-translate-y-2 hover:shadow-2xl transition-all">
            <div className="text-6xl mb-5">🏥</div>
            <h3 className="text-purple-600 mb-4 text-xl font-semibold">For Hospitals</h3>
            <p className="text-gray-600 leading-relaxed">
              Streamline operations with centralized records. Reduce paperwork and errors.
            </p>
          </div>
          <div className="p-8 bg-white rounded-xl shadow-lg hover:-translate-y-2 hover:shadow-2xl transition-all">
            <div className="text-6xl mb-5">👩‍⚕️</div>
            <h3 className="text-purple-600 mb-4 text-xl font-semibold">For Nurses</h3>
            <p className="text-gray-600 leading-relaxed">
              Efficient patient management. Quick access to vital information.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-purple-600 to-purple-800 text-white py-20 px-12 text-center">
        <h2 className="text-4xl mb-5">Ready to Get Started?</h2>
        <p className="text-lg mb-8">Join thousands of healthcare professionals and patients using our system</p>
        <Link to="/signup" className="bg-white text-purple-600 px-12 py-4 rounded-full no-underline font-semibold text-lg inline-block hover:-translate-y-1 hover:shadow-xl transition-all">
          Create Your Account
        </Link>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white text-center py-8">
        <p className="m-0">&copy; 2026 Health Record Management System. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Home;
