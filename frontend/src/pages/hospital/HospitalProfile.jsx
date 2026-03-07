import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';

const HospitalProfile = () => {
  const { user } = useAuth();

  return (
    <DashboardLayout title="Hospital Profile">
      <div className="bg-white p-8 rounded-xl shadow-sm mb-5">
        <h2 className="text-gray-800 mb-5 text-2xl font-semibold">Hospital Information</h2>
        <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Hospital Name</span><span className="text-gray-800 flex-1">{user?.name || 'N/A'}</span></div>
        <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Email</span><span className="text-gray-800 flex-1">{user?.email || 'N/A'}</span></div>
        <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Role</span><span className="text-gray-800 flex-1">Hospital</span></div>
        <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Registration Number</span><span className="text-gray-800 flex-1">Not provided</span></div>
        <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Type</span><span className="text-gray-800 flex-1">Not specified</span></div>
        <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Phone</span><span className="text-gray-800 flex-1">Not provided</span></div>
        <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Website</span><span className="text-gray-800 flex-1">Not provided</span></div>
        <div className="flex py-4"><span className="font-semibold text-gray-600 w-52">Established Year</span><span className="text-gray-800 flex-1">Not provided</span></div>
        <button className="bg-teal-600 text-white px-6 py-2.5 rounded-md font-semibold hover:bg-teal-700 transition-colors mt-5 border-none cursor-pointer">Edit Profile</button>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-sm mb-5">
        <h2 className="text-gray-800 mb-5 text-2xl font-semibold">Address</h2>
        <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Street</span><span className="text-gray-800 flex-1">Not provided</span></div>
        <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">City</span><span className="text-gray-800 flex-1">Not provided</span></div>
        <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">State</span><span className="text-gray-800 flex-1">Not provided</span></div>
        <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">ZIP Code</span><span className="text-gray-800 flex-1">Not provided</span></div>
        <div className="flex py-4"><span className="font-semibold text-gray-600 w-52">Country</span><span className="text-gray-800 flex-1">Not provided</span></div>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-sm">
        <h2 className="text-gray-800 mb-5 text-2xl font-semibold">Facilities & Services</h2>
        <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Total Beds</span><span className="text-gray-800 flex-1">0</span></div>
        <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Available Beds</span><span className="text-gray-800 flex-1">0</span></div>
        <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Emergency Services</span><span className="text-gray-800 flex-1">Yes</span></div>
        <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Ambulance Service</span><span className="text-gray-800 flex-1">No</span></div>
        <div className="flex py-4"><span className="font-semibold text-gray-600 w-52">Rating</span><span className="text-gray-800 flex-1">0.0 / 5.0</span></div>
      </div>
    </DashboardLayout>
  );
};

export default HospitalProfile;
