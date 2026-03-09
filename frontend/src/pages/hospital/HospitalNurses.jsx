import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { profileService } from '../../services/api';

const HospitalNurses = () => {
  const [nurses, setNurses] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [assigningId, setAssigningId] = useState(null);
  const [selectedDoctor, setSelectedDoctor] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [nurseRes, doctorRes] = await Promise.all([
        profileService.hospital.getNurses(),
        profileService.hospital.getDoctors()
      ]);
      if (nurseRes.success) setNurses(nurseRes.data);
      if (doctorRes.success) setDoctors(doctorRes.data);
    } catch {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleRevoke = async (affiliationId, name) => {
    if (!confirm(`Remove ${name} from this hospital?`)) return;
    try {
      setError('');
      await profileService.hospital.revokeAffiliation(affiliationId);
      setSuccess(`${name} has been removed`);
      setNurses((prev) => prev.filter((n) => n.affiliationId !== affiliationId));
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to revoke');
    }
  };

  const handleAssign = async (affiliationId) => {
    if (!selectedDoctor) return;
    try {
      setError('');
      await profileService.hospital.assignNurse(affiliationId, selectedDoctor);
      setSuccess('Nurse assigned to doctor');
      setAssigningId(null);
      setSelectedDoctor('');
      fetchData();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to assign');
    }
  };

  const handleUnassign = async (affiliationId) => {
    try {
      setError('');
      await profileService.hospital.unassignNurse(affiliationId);
      setSuccess('Nurse unassigned from doctor');
      fetchData();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to unassign');
    }
  };

  return (
    <DashboardLayout title="Connected Nurses">
      {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4">{error}</div>}
      {success && <div className="bg-green-50 text-green-600 p-4 rounded-lg mb-4">{success}</div>}

      {loading ? (
        <p className="text-gray-500">Loading nurses...</p>
      ) : nurses.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-5xl mb-4">👩‍⚕️</p>
          <p className="text-gray-500 text-lg">No nurses affiliated yet</p>
          <p className="text-gray-400 text-sm mt-1">Generate an OTP from the dashboard and share it with a nurse to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {nurses.map((n) => (
            <div key={n.affiliationId} className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">{n.nurse?.name || 'Unknown'}</h3>
                  <p className="text-sm text-teal-600 font-medium">{n.nurse?.specialization || 'General'}</p>
                </div>
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">Active</span>
              </div>

              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <div className="flex justify-between">
                  <span>Email</span>
                  <span className="text-gray-800">{n.nurse?.email || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Phone</span>
                  <span className="text-gray-800">{n.nurse?.phone || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Qualification</span>
                  <span className="text-gray-800">{n.nurse?.qualification || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shift</span>
                  <span className="text-gray-800">{n.nurse?.shift || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Department</span>
                  <span className="text-gray-800">{n.department || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Joined</span>
                  <span className="text-gray-800">{new Date(n.joinedAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Doctor Assignment */}
              <div className="border-t border-gray-200 pt-4 mb-4">
                <p className="text-xs uppercase text-gray-500 font-medium mb-2">Assigned Doctor</p>
                {n.assignedDoctor ? (
                  <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Dr. {n.assignedDoctor.name}</p>
                      <p className="text-xs text-gray-500">{n.assignedDoctor.specialization || ''}</p>
                    </div>
                    <button
                      onClick={() => handleUnassign(n.affiliationId)}
                      className="text-xs text-red-600 hover:text-red-800 font-medium"
                    >
                      Remove
                    </button>
                  </div>
                ) : assigningId === n.affiliationId ? (
                  <div className="space-y-2">
                    <select
                      value={selectedDoctor}
                      onChange={(e) => setSelectedDoctor(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="">Select a doctor</option>
                      {doctors.map((d) => (
                        <option key={d.doctor?._id} value={d.doctor?._id}>
                          Dr. {d.doctor?.name} — {d.doctor?.specialization || 'N/A'}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAssign(n.affiliationId)}
                        disabled={!selectedDoctor}
                        className="flex-1 bg-teal-600 text-white py-1.5 rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors disabled:opacity-50"
                      >
                        Assign
                      </button>
                      <button
                        onClick={() => { setAssigningId(null); setSelectedDoctor(''); }}
                        className="flex-1 bg-gray-200 text-gray-700 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setAssigningId(n.affiliationId)}
                    className="w-full bg-teal-50 text-teal-700 hover:bg-teal-100 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Assign to Doctor
                  </button>
                )}
              </div>

              <button
                onClick={() => handleRevoke(n.affiliationId, n.nurse?.name)}
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

export default HospitalNurses;
