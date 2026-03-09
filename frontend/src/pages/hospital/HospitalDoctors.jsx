import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { profileService } from '../../services/api';

const HospitalDoctors = () => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const res = await profileService.hospital.getDoctors();
      if (res.success) setDoctors(res.data);
    } catch {
      setError('Failed to load doctors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDoctors(); }, []);

  const handleRevoke = async (affiliationId, name) => {
    if (!confirm(`Remove Dr. ${name} from this hospital?`)) return;
    try {
      setError('');
      await profileService.hospital.revokeAffiliation(affiliationId);
      setSuccess(`Dr. ${name} has been removed`);
      setDoctors((prev) => prev.filter((d) => d.affiliationId !== affiliationId));
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to revoke');
    }
  };

  return (
    <DashboardLayout title="Connected Doctors">
      {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4">{error}</div>}
      {success && <div className="bg-green-50 text-green-600 p-4 rounded-lg mb-4">{success}</div>}

      {loading ? (
        <p className="text-gray-500">Loading doctors...</p>
      ) : doctors.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-5xl mb-4">⚕️</p>
          <p className="text-gray-500 text-lg">No doctors affiliated yet</p>
          <p className="text-gray-400 text-sm mt-1">Generate an OTP from the dashboard and share it with a doctor to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {doctors.map((d) => (
            <div key={d.affiliationId} className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Dr. {d.doctor?.name || 'Unknown'}</h3>
                  <p className="text-sm text-teal-600 font-medium">{d.doctor?.specialization || 'N/A'}</p>
                </div>
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">Active</span>
              </div>

              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <div className="flex justify-between">
                  <span>Email</span>
                  <span className="text-gray-800">{d.doctor?.email || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Phone</span>
                  <span className="text-gray-800">{d.doctor?.phone || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Qualification</span>
                  <span className="text-gray-800">{d.doctor?.qualification || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Experience</span>
                  <span className="text-gray-800">{d.doctor?.experience ? `${d.doctor.experience} yrs` : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Department</span>
                  <span className="text-gray-800">{d.department || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Joined</span>
                  <span className="text-gray-800">{new Date(d.joinedAt).toLocaleDateString()}</span>
                </div>
              </div>

              <button
                onClick={() => handleRevoke(d.affiliationId, d.doctor?.name)}
                className="w-full bg-red-50 text-red-600 hover:bg-red-100 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Remove from Hospital
              </button>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default HospitalDoctors;
