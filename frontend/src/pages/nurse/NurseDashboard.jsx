import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { profileService, nurseService } from '../../services/api';

const NurseDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [affiliation, setAffiliation] = useState(null);
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
      setAffiliation(affRes.data || null);
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

  // Calculate total pending tasks (doctor assignments + hospital test assignments)
  const totalPendingTasks = (dashboard?.pendingAssignmentsCount ?? 0) + (dashboard?.pendingTestAssignmentsCount ?? 0);

  return (
    <DashboardLayout title="Nurse Dashboard">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-xs uppercase text-gray-600 font-medium mb-2">Pending Tasks</h3>
          <p className="text-4xl font-bold text-orange-600">{totalPendingTasks}</p>
          <p className="text-xs text-gray-500 mt-1">{dashboard?.pendingAssignmentsCount ?? 0} Doctor | {dashboard?.pendingTestAssignmentsCount ?? 0} Tests</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-xs uppercase text-gray-600 font-medium mb-2">Records Created</h3>
          <p className="text-4xl font-bold text-purple-600">{dashboard?.recordCount ?? 0}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-xs uppercase text-gray-600 font-medium mb-2">Assigned Doctor</h3>
          <p className="text-4xl font-bold text-purple-600">{dashboard?.assignedDoctor ? '1' : '0'}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-xs uppercase text-gray-600 font-medium mb-2">Hospital</h3>
          <p className="text-2xl font-bold text-purple-600">{affiliation ? '✅ Linked' : '❌ Not Linked'}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-xl shadow-sm mb-5">
        <h2 className="text-gray-800 text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link to="/nurse/assignments" className="px-5 py-3 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors no-underline">
            📋 View Doctor Assignments
          </Link>
          <Link to="/nurse/test-assignments" className="px-5 py-3 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors no-underline">
            🧪 Hospital Test Assignments
          </Link>
          <Link to="/nurse/profile" className="px-5 py-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors no-underline">
            👤 My Profile
          </Link>
          <Link to="/nurse/audit-logs" className="px-5 py-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors no-underline">
            📊 Audit Logs
          </Link>
        </div>
      </div>

      {/* Pending Assignments */}
      <div className="bg-white p-6 rounded-xl shadow-sm mb-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-gray-800 text-xl font-semibold">Pending Doctor Assignments</h2>
          <Link to="/nurse/assignments" className="text-purple-600 hover:text-purple-700 text-sm font-semibold no-underline">
            View All →
          </Link>
        </div>
        {!dashboard?.pendingAssignments?.length ? (
          <p className="text-gray-500 text-sm">No pending assignments. You're all caught up! 🎉</p>
        ) : (
          <div className="space-y-3">
            {dashboard.pendingAssignments.map((assignment) => (
              <div key={assignment._id} className="border-l-4 border-orange-500 bg-orange-50 p-4 rounded-lg">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-bold text-gray-800">
                      Patient: {assignment.patient?.name} (ID: {assignment.patient?.patientId})
                    </p>
                    <p className="text-sm text-gray-600">
                      Assigned by: Dr. {assignment.doctor?.name} ({assignment.doctor?.specialization})
                    </p>
                    <p className="text-sm text-gray-500">
                      Hospital: {assignment.hospital?.name}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Assigned: {new Date(assignment.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <Link 
                    to="/nurse/assignments" 
                    className="ml-4 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors no-underline"
                  >
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending Hospital Test Assignments */}
      <div className="bg-white p-6 rounded-xl shadow-sm mb-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-gray-800 text-xl font-semibold">Pending Hospital Test Assignments</h2>
          <Link to="/nurse/test-assignments" className="text-blue-600 hover:text-blue-700 text-sm font-semibold no-underline">
            View All →
          </Link>
        </div>
        {!dashboard?.pendingTestAssignments?.length ? (
          <p className="text-gray-500 text-sm">No pending test assignments. You're all caught up! 🎉</p>
        ) : (
          <div className="space-y-3">
            {dashboard.pendingTestAssignments.map((assignment) => (
              <div key={assignment._id} className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded-lg">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-bold text-gray-800">
                      Test: {assignment.testType?.name} ({assignment.testType?.category})
                    </p>
                    <p className="text-sm text-gray-600">
                      Patient: {assignment.patient?.name} (ID: {assignment.patient?.patientId})
                    </p>
                    <p className="text-sm text-gray-500">
                      Hospital: {assignment.hospital?.name}
                    </p>
                    {assignment.scheduledDate && (
                      <p className="text-xs text-gray-400 mt-1">
                        Scheduled: {new Date(assignment.scheduledDate).toLocaleString()}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      Assigned: {new Date(assignment.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <Link 
                    to="/nurse/test-assignments" 
                    className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors no-underline"
                  >
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assigned Doctor */}
      <div className="bg-white p-6 rounded-xl shadow-sm mb-5">
        <h2 className="text-gray-800 text-xl font-semibold mb-4">My Assigned Doctor</h2>
        {!dashboard?.assignedDoctor ? (
          <p className="text-gray-500 text-sm">No doctor assigned yet. A hospital administrator will assign you to a doctor.</p>
        ) : (
          <div className="border border-gray-200 rounded-xl p-4">
            <h3 className="font-semibold text-gray-800">Dr. {dashboard.assignedDoctor.name}</h3>
            <p className="text-sm text-purple-600">{dashboard.assignedDoctor.specialization || 'General Medicine'}</p>
            <p className="text-sm text-gray-500">{dashboard.assignedDoctor.email}</p>
          </div>
        )}
      </div>

      {/* Hospital Affiliation */}
      {!affiliation ? (
        <div className="bg-white p-6 rounded-xl shadow-sm mb-5">
          <h2 className="text-gray-800 text-xl font-semibold mb-2">Link to a Hospital</h2>
          <p className="text-gray-500 text-sm mb-4">Enter the 6-digit OTP provided by the hospital to affiliate your account. Note: You can only work at one hospital at a time.</p>
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
      ) : (
        <div className="bg-white p-6 rounded-xl shadow-sm mb-5">
          <h2 className="text-gray-800 text-xl font-semibold mb-4">My Hospital</h2>
          <div className="border-l-4 border-green-500 bg-green-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-bold text-gray-800 text-lg">{affiliation.hospital?.name || 'Hospital'}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {affiliation.hospital?.address?.city && `${affiliation.hospital.address.city} · `}
                  {affiliation.department || 'No department assigned'}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Joined: {new Date(affiliation.joinedAt).toLocaleDateString()}
                </p>
              </div>
              <span className="px-4 py-2 rounded-full text-sm font-semibold bg-green-100 text-green-700">
                ✅ Active
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            💡 You can only be affiliated with one hospital at a time. Contact your administrator if you need to change hospitals.
          </p>
        </div>
      )}

      {/* Recent Records */}
      {/* <div className="bg-white p-6 rounded-xl shadow-sm">
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
      </div> */}
    </DashboardLayout>
  );
};

export default NurseDashboard;
