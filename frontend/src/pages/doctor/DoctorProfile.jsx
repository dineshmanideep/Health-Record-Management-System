import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';

const DoctorProfile = () => {
  const { user } = useAuth();

  return (
    <DashboardLayout title="Doctor Profile">
      <div className="bg-white p-8 rounded-xl shadow-sm mb-5">
        <h2 className="text-gray-800 mb-5 text-2xl font-semibold">Professional Information</h2>
        <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Full Name</span><span className="text-gray-800 flex-1">Dr. {user?.name || 'N/A'}</span></div>
        <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Email</span><span className="text-gray-800 flex-1">{user?.email || 'N/A'}</span></div>
        <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Role</span><span className="text-gray-800 flex-1">Doctor</span></div>
        <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Specialization</span><span className="text-gray-800 flex-1">Not provided</span></div>
        <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Qualification</span><span className="text-gray-800 flex-1">Not provided</span></div>
        <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">License Number</span><span className="text-gray-800 flex-1">Not provided</span></div>
        <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Experience</span><span className="text-gray-800 flex-1">0 years</span></div>
        <div className="flex py-4"><span className="font-semibold text-gray-600 w-52">Phone</span><span className="text-gray-800 flex-1">Not provided</span></div>
        <button className="bg-purple-600 text-white px-6 py-2.5 rounded-md font-semibold hover:bg-purple-700 transition-colors mt-5 border-none cursor-pointer">Edit Profile</button>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-sm mb-5">
        <h2 className="text-gray-800 mb-5 text-2xl font-semibold">Hospital Affiliation</h2>
        <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Hospital</span><span className="text-gray-800 flex-1">Not affiliated</span></div>
        <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Department</span><span className="text-gray-800 flex-1">Not provided</span></div>
        <div className="flex py-4"><span className="font-semibold text-gray-600 w-52">Consultation Fee</span><span className="text-gray-800 flex-1">Not set</span></div>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-sm">
        <h2 className="text-gray-800 mb-5 text-2xl font-semibold">Statistics</h2>
        <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Total Patients</span><span className="text-gray-800 flex-1">0</span></div>
        <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Rating</span><span className="text-gray-800 flex-1">0.0 / 5.0</span></div>
        <div className="flex py-4"><span className="font-semibold text-gray-600 w-52">Reviews</span><span className="text-gray-800 flex-1">0</span></div>
      </div>
    </DashboardLayout>
  );
};

export default DoctorProfile;
