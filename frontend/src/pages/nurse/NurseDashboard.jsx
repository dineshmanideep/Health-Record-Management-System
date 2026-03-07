import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';

const NurseDashboard = () => {
  const { user } = useAuth();

  return (
    <DashboardLayout title="Nurse Dashboard">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-xs uppercase text-gray-600 font-medium mb-2">Assigned Patients</h3>
          <p className="text-4xl font-bold text-purple-600">0</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-xs uppercase text-gray-600 font-medium mb-2">Pending Tasks</h3>
          <p className="text-4xl font-bold text-purple-600">0</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-xs uppercase text-gray-600 font-medium mb-2">Completed Tasks Today</h3>
          <p className="text-4xl font-bold text-purple-600">0</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-xs uppercase text-gray-600 font-medium mb-2">Current Shift</h3>
          <p className="text-xl font-bold text-purple-600">Morning</p>
        </div>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-sm mb-5">
        <h2 className="text-gray-800 mb-5 text-2xl font-semibold">Welcome, {user?.name}!</h2>
        <p className="text-gray-600 leading-relaxed">
          Your nurse portal is ready. You can now:
        </p>
        <ul className="text-gray-600 leading-loose mt-4 list-disc list-inside">
          <li>View and manage assigned patients</li>
          <li>Update patient vital signs and records</li>
          <li>Manage daily tasks and schedules</li>
          <li>Communicate with doctors and staff</li>
          <li>Track medication administration</li>
        </ul>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-sm">
        <h2 className="text-gray-800 mb-5 text-2xl font-semibold">Today's Tasks</h2>
        <p className="text-gray-600 mt-2">No tasks assigned for today.</p>
      </div>
    </DashboardLayout>
  );
};

export default NurseDashboard;
