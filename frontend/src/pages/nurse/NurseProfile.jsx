import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { profileService } from '../../services/api';

const NurseProfile = () => {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    profileService.nurse.get()
      .then((res) => { if (res.success) setProfile(res.data); })
      .catch(() => setError('Failed to load profile'));
  }, []);

  return (
    <DashboardLayout title="Nurse Profile">
      {error && <p className="text-red-600 mb-4">{error}</p>}
      {!profile ? (
        <p className="text-gray-500">Loading profile...</p>
      ) : (
        <>
          <div className="bg-white p-8 rounded-xl shadow-sm mb-5">
            <h2 className="text-gray-800 mb-5 text-2xl font-semibold">Professional Information</h2>
            <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Full Name</span><span className="text-gray-800 flex-1">{profile.name || 'N/A'}</span></div>
            <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Email</span><span className="text-gray-800 flex-1">{profile.email || 'N/A'}</span></div>
            <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Role</span><span className="text-gray-800 flex-1">Nurse</span></div>
            <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Qualification</span><span className="text-gray-800 flex-1">{profile.qualification || 'Not provided'}</span></div>
            <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">License Number</span><span className="text-gray-800 flex-1">{profile.licenseNumber || 'Not provided'}</span></div>
            <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Experience</span><span className="text-gray-800 flex-1">{profile.experience != null ? `${profile.experience} years` : '0 years'}</span></div>
            <div className="flex py-4"><span className="font-semibold text-gray-600 w-52">Phone</span><span className="text-gray-800 flex-1">{profile.phone || 'Not provided'}</span></div>
            <button className="bg-purple-600 text-white px-6 py-2.5 rounded-md font-semibold hover:bg-purple-700 transition-colors mt-5 border-none cursor-pointer">Edit Profile</button>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm mb-5">
            <h2 className="text-gray-800 mb-5 text-2xl font-semibold">Work Details</h2>
            <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Hospital</span><span className="text-gray-800 flex-1">{profile.hospitalAffiliation || 'Not affiliated'}</span></div>
            <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Department</span><span className="text-gray-800 flex-1">{profile.department || 'Not provided'}</span></div>
            <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Shift</span><span className="text-gray-800 flex-1">{profile.shift || 'Morning'}</span></div>
            <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Assigned Ward</span><span className="text-gray-800 flex-1">{profile.assignedWard || 'Not assigned'}</span></div>
            <div className="flex py-4"><span className="font-semibold text-gray-600 w-52">Supervising Doctor</span><span className="text-gray-800 flex-1">{profile.supervisingDoctor || 'Not assigned'}</span></div>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm">
            <h2 className="text-gray-800 mb-5 text-2xl font-semibold">Statistics</h2>
            <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Assigned Patients</span><span className="text-gray-800 flex-1">{profile.assignedPatients ?? 0}</span></div>
            <div className="flex py-4"><span className="font-semibold text-gray-600 w-52">Rating</span><span className="text-gray-800 flex-1">{profile.rating != null ? `${profile.rating} / 5.0` : '0.0 / 5.0'}</span></div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
};

export default NurseProfile;
