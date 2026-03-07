import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';

const AdminProfile = () => {
  const { user } = useAuth();

  return (
    <DashboardLayout title="Admin Profile">
      <div className="bg-white p-8 rounded-xl shadow-sm mb-5">
        <h2 className="text-gray-800 mb-5 text-2xl font-semibold">Administrator Information</h2>
        <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Full Name</span><span className="text-gray-800 flex-1">{user?.name || 'N/A'}</span></div>
        <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Email</span><span className="text-gray-800 flex-1">{user?.email || 'N/A'}</span></div>
        <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Role</span><span className="text-gray-800 flex-1">Administrator</span></div>
        <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Access Level</span><span className="text-gray-800 flex-1">Admin</span></div>
        <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Department</span><span className="text-gray-800 flex-1">System Administration</span></div>
        <div className="flex py-4"><span className="font-semibold text-gray-600 w-52">Phone</span><span className="text-gray-800 flex-1">Not provided</span></div>
        <button className="bg-indigo-600 text-white px-6 py-2.5 rounded-md font-semibold hover:bg-indigo-700 transition-colors mt-5 border-none cursor-pointer">Edit Profile</button>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-sm mb-5">
        <h2 className="text-gray-800 mb-5 text-2xl font-semibold">Permissions</h2>
        <div className="py-2">
          <p className="text-gray-600 mb-2">Current permissions:</p>
          <ul className="text-gray-600 leading-loose list-disc list-inside">
            <li>Manage Users</li>
            <li>Manage Doctors</li>
            <li>Manage Hospitals</li>
            <li>Manage Nurses</li>
            <li>View Records</li>
            <li>System Settings</li>
            <li>Generate Reports</li>
          </ul>
        </div>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-sm">
        <h2 className="text-gray-800 mb-5 text-2xl font-semibold">Activity</h2>
        <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Last Login</span><span className="text-gray-800 flex-1">Just now</span></div>
        <div className="flex py-4"><span className="font-semibold text-gray-600 w-52">Account Status</span><span className="text-green-600 flex-1 font-semibold">Active</span></div>
      </div>
    </DashboardLayout>
  );
};

export default AdminProfile;
