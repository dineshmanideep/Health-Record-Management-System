import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { profileService } from '../../services/api';

const AdminProfile = () => {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    profileService.admin.get()
      .then((res) => { if (res.success) setProfile(res.data); })
      .catch(() => setError('Failed to load profile'));
  }, []);

  return (
    <DashboardLayout title="Admin Profile">
      {error && <p className="text-red-600 mb-4">{error}</p>}
      {!profile ? (
        <p className="text-gray-500">Loading profile...</p>
      ) : (
        <>
      <div className="bg-white p-8 rounded-xl shadow-sm mb-5">
        <h2 className="text-gray-800 mb-5 text-2xl font-semibold">Administrator Information</h2>
        <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Full Name</span><span className="text-gray-800 flex-1">{profile.name || 'N/A'}</span></div>
        <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Email</span><span className="text-gray-800 flex-1">{profile.email || 'N/A'}</span></div>
        <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Role</span><span className="text-gray-800 flex-1">Administrator</span></div>
        <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Access Level</span><span className="text-gray-800 flex-1">{profile.accessLevel || 'Admin'}</span></div>
        <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Department</span><span className="text-gray-800 flex-1">{profile.department || 'System Administration'}</span></div>
        <div className="flex py-4"><span className="font-semibold text-gray-600 w-52">Phone</span><span className="text-gray-800 flex-1">{profile.phone || 'Not provided'}</span></div>
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
        <div className="flex py-4"><span className="font-semibold text-gray-600 w-52">Account Status</span><span className={`flex-1 font-semibold ${profile.isActive === false ? 'text-red-600' : 'text-green-600'}`}>{profile.isActive === false ? 'Inactive' : 'Active'}</span></div>
      </div>
        </>
      )}
    </DashboardLayout>
  );
};

export default AdminProfile;
