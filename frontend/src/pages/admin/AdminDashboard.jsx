import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';

const AdminDashboard = () => {
  const { user } = useAuth();

  return (
    <DashboardLayout title="Admin Dashboard">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-xs uppercase text-gray-600 font-medium mb-2">Total Users</h3>
          <p className="text-4xl font-bold text-indigo-600">0</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-xs uppercase text-gray-600 font-medium mb-2">Total Doctors</h3>
          <p className="text-4xl font-bold text-indigo-600">0</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-xs uppercase text-gray-600 font-medium mb-2">Total Hospitals</h3>
          <p className="text-4xl font-bold text-indigo-600">0</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-xs uppercase text-gray-600 font-medium mb-2">Total Records</h3>
          <p className="text-4xl font-bold text-indigo-600">0</p>
        </div>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-sm mb-5">
        <h2 className="text-gray-800 mb-5 text-2xl font-semibold">Welcome, {user?.name}!</h2>
        <p className="text-gray-600 leading-relaxed">
          System administration portal. You have access to:
        </p>
        <ul className="text-gray-600 leading-loose mt-4 list-disc list-inside">
          <li>Manage all users (Patients, Doctors, Nurses, Hospitals)</li>
          <li>View and manage system-wide health records</li>
          <li>Monitor system performance and statistics</li>
          <li>Generate reports and analytics</li>
          <li>Configure system settings and permissions</li>
        </ul>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-sm">
        <h2 className="text-gray-800 mb-5 text-2xl font-semibold">System Statistics</h2>
        <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Active Users</span><span className="text-gray-800 flex-1">0</span></div>
        <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">New Registrations (Today)</span><span className="text-gray-800 flex-1">0</span></div>
        <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">System Uptime</span><span className="text-gray-800 flex-1">100%</span></div>
        <div className="flex py-4"><span className="font-semibold text-gray-600 w-52">Total Medical Records</span><span className="text-gray-800 flex-1">0</span></div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
