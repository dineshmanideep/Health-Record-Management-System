import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';

const PatientDashboard = () => {
  const { user } = useAuth();

  return (
    <DashboardLayout title="Patient Dashboard">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-xs uppercase text-gray-600 font-medium mb-2">Medical Records</h3>
          <p className="text-4xl font-bold text-purple-600">0</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-xs uppercase text-gray-600 font-medium mb-2">Upcoming Appointments</h3>
          <p className="text-4xl font-bold text-purple-600">0</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-xs uppercase text-gray-600 font-medium mb-2">Prescriptions</h3>
          <p className="text-4xl font-bold text-purple-600">0</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-xs uppercase text-gray-600 font-medium mb-2">Reports</h3>
          <p className="text-4xl font-bold text-purple-600">0</p>
        </div>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-sm mb-5">
        <h2 className="text-gray-800 mb-5 text-2xl font-semibold">Welcome, {user?.name}!</h2>
        <p className="text-gray-600 leading-relaxed">
          Your centralized health record system is ready. You can now:
        </p>
        <ul className="text-gray-600 leading-loose mt-4 list-disc list-inside">
          <li>View and manage your medical records</li>
          <li>Book appointments with doctors</li>
          <li>Access your prescriptions and test reports</li>
          <li>Share your records with any hospital</li>
          <li>Keep track of your medical history</li>
        </ul>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-sm">
        <h2 className="text-gray-800 mb-5 text-2xl font-semibold">Quick Actions</h2>
        <div className="flex gap-4 mt-5 flex-wrap">
          <button className="bg-purple-600 text-white px-6 py-2.5 rounded-md font-semibold hover:bg-purple-700 transition-colors border-none cursor-pointer">Book Appointment</button>
          <button className="bg-purple-600 text-white px-6 py-2.5 rounded-md font-semibold hover:bg-purple-700 transition-colors border-none cursor-pointer">Add Medical Record</button>
          <button className="bg-purple-600 text-white px-6 py-2.5 rounded-md font-semibold hover:bg-purple-700 transition-colors border-none cursor-pointer">View Reports</button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PatientDashboard;
