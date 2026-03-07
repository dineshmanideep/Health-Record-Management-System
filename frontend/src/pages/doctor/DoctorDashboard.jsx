import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';

const DoctorDashboard = () => {
  const { user } = useAuth();

  return (
    <DashboardLayout title="Doctor Dashboard">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-xs uppercase text-gray-600 font-medium mb-2">Total Patients</h3>
          <p className="text-4xl font-bold text-purple-600">0</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-xs uppercase text-gray-600 font-medium mb-2">Today's Appointments</h3>
          <p className="text-4xl font-bold text-purple-600">0</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-xs uppercase text-gray-600 font-medium mb-2">Pending Consultations</h3>
          <p className="text-4xl font-bold text-purple-600">0</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-xs uppercase text-gray-600 font-medium mb-2">Rating</h3>
          <p className="text-4xl font-bold text-purple-600">0.0</p>
        </div>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-sm mb-5">
        <h2 className="text-gray-800 mb-5 text-2xl font-semibold">Welcome, Dr. {user?.name}!</h2>
        <p className="text-gray-600 leading-relaxed">
          Your doctor portal is ready. You can now:
        </p>
        <ul className="text-gray-600 leading-loose mt-4 list-disc list-inside">
          <li>View and manage patient records</li>
          <li>Schedule and manage appointments</li>
          <li>Create prescriptions and treatment plans</li>
          <li>Access complete patient medical history</li>
          <li>Collaborate with other healthcare professionals</li>
        </ul>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-sm">
        <h2 className="text-gray-800 mb-5 text-2xl font-semibold">Today's Schedule</h2>
        <p className="text-gray-600 mt-2">No appointments scheduled for today.</p>
      </div>
    </DashboardLayout>
  );
};

export default DoctorDashboard;
