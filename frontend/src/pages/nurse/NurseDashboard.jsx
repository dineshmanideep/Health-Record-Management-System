import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { profileService, nurseService } from '../../services/api';

const NurseDashboard = () => {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [affiliations, setAffiliations] = useState([]);
  const [otpInput, setOtpInput] = useState('');
  const [deptInput, setDeptInput] = useState('');
  const [affiliating, setAffiliating] = useState(false);
  const [affiliateMsg, setAffiliateMsg] = useState({ type: '', text: '' });

  const fetchData = async () => {
    try {
      const [dashRes, affRes] = await Promise.all([
        nurseService.getDashboard(),
        profileService.nurse.getAffiliations()
      ]);
      setDashboard(dashRes.data);
      setAffiliations(affRes.data || []);
    } catch {
      // silent
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAffiliate = async (e) => {
    e.preventDefault();
    if (!otpInput.trim()) return;
    setAffiliating(true);
    setAffiliateMsg({ type: '', text: '' });
    try {
      const data = await profileService.nurse.affiliate(otpInput.trim(), deptInput.trim());
      setAffiliateMsg({ type: 'success', text: `Successfully affiliated with ${data.hospital?.name || 'the hospital'}!` });
      setOtpInput('');
      setDeptInput('');
      fetchData();
    } catch (err) {
      setAffiliateMsg({ type: 'error', text: err?.response?.data?.message || 'Failed to affiliate.' });
    } finally {
      setAffiliating(false);
    }
  };

  return (
    <DashboardLayout title="Nurse Dashboard">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-xs uppercase text-gray-600 font-medium mb-2">Records Created</h3>
          <p className="text-4xl font-bold text-purple-600">{dashboard?.recordCount ?? 0}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-xs uppercase text-gray-600 font-medium mb-2">Assigned Doctors</h3>
          <p className="text-4xl font-bold text-purple-600">{dashboard?.assignedDoctors?.length ?? 0}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-xs uppercase text-gray-600 font-medium mb-2">Hospital Affiliations</h3>
          <p className="text-4xl font-bold text-purple-600">{dashboard?.affiliationCount ?? 0}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-xs uppercase text-gray-600 font-medium mb-2">Current Shift</h3>
          <p className="text-xl font-bold text-purple-600">{user?.shift || 'Morning'}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-xl shadow-sm mb-5">
        <h2 className="text-gray-800 text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link to="/nurse/create-record" className="px-5 py-3 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors no-underline">
            + Create Patient Visit Record
          </Link>
          <Link to="/nurse/records" className="px-5 py-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors no-underline">
            View My Records
          </Link>
        </div>
      </div>

      {/* Assigned Doctors */}
      <div className="bg-white p-6 rounded-xl shadow-sm mb-5">
        <h2 className="text-gray-800 text-xl font-semibold mb-4">Assigned Doctors</h2>
        {!dashboard?.assignedDoctors?.length ? (
          <p className="text-gray-500 text-sm">No doctors assigned yet. A hospital administrator will assign you to a doctor.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dashboard.assignedDoctors.map((doc) => (
              <div key={doc._id} className="border border-gray-200 rounded-xl p-4">
                <h3 className="font-semibold text-gray-800">Dr. {doc.name}</h3>
                <p className="text-sm text-purple-600">{doc.specialization || 'General Medicine'}</p>
                <p className="text-sm text-gray-500">{doc.email}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hospital Affiliation */}
      <div className="bg-white p-6 rounded-xl shadow-sm mb-5">
        <h2 className="text-gray-800 text-xl font-semibold mb-2">Link to a Hospital</h2>
        <p className="text-gray-500 text-sm mb-4">Enter the 6-digit OTP provided by the hospital to affiliate your account.</p>
        <form onSubmit={handleAffiliate} className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">OTP from Hospital</label>
            <input type="text" maxLength={6} value={otpInput} onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))} placeholder="6-digit OTP" className="w-36 px-3 py-2 border-2 border-gray-200 rounded-lg text-base font-mono focus:outline-none focus:border-purple-600 transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Department (optional)</label>
            <input type="text" value={deptInput} onChange={(e) => setDeptInput(e.target.value)} placeholder="e.g., Pediatrics" className="w-48 px-3 py-2 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-purple-600 transition-colors" />
          </div>
          <button type="submit" disabled={affiliating || otpInput.length !== 6} className="px-5 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50">
            {affiliating ? 'Linking...' : 'Link'}
          </button>
        </form>
        {affiliateMsg.text && (
          <p className={`mt-3 text-sm font-medium ${affiliateMsg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{affiliateMsg.text}</p>
        )}
      </div>

      {/* Current affiliations */}
      <div className="bg-white p-6 rounded-xl shadow-sm mb-5">
        <h2 className="text-gray-800 text-xl font-semibold mb-4">My Hospital Affiliations</h2>
        {affiliations.length === 0 ? (
          <p className="text-gray-500 text-sm">No affiliations yet.</p>
        ) : (
          <ul className="space-y-3">
            {affiliations.map((aff) => (
              <li key={aff._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-semibold text-gray-800">{aff.hospital?.name || 'Hospital'}</p>
                  <p className="text-sm text-gray-500">
                    {aff.hospital?.address?.city && `${aff.hospital.address.city} · `}{aff.department || 'No department assigned'}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${aff.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{aff.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Recent Records */}
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h2 className="text-gray-800 text-xl font-semibold mb-4">Recent Records Created</h2>
        {!dashboard?.recentRecords?.length ? (
          <p className="text-gray-500 text-sm">No records created yet.</p>
        ) : (
          <div className="space-y-3">
            {dashboard.recentRecords.map((r) => (
              <div key={r._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-semibold text-gray-800">{r.diagnosis}</p>
                  <p className="text-sm text-gray-500">
                    Patient: {r.patient?.name || 'N/A'} · Dr. {r.doctor?.name || 'N/A'} · {r.hospital?.name || 'N/A'}
                  </p>
                </div>
                <span className="text-sm text-gray-500">{new Date(r.visitDate || r.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default NurseDashboard;
