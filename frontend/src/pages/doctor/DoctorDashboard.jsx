import { useState, useEffect, useRef } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { profileService, doctorService } from '../../services/api';

const NURSE_REQUEST_POLL = 5000; // poll every 5 seconds

const DoctorDashboard = () => {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [affiliations, setAffiliations] = useState([]);
  const [assignedNurses, setAssignedNurses] = useState([]);
  const [otpInput, setOtpInput] = useState('');
  const [deptInput, setDeptInput] = useState('');
  const [affiliating, setAffiliating] = useState(false);
  const [affiliateMsg, setAffiliateMsg] = useState({ type: '', text: '' });

  // Patient access via OTP
  const [patientEmail, setPatientEmail] = useState('');
  const [patientOtp, setPatientOtp] = useState('');
  const [accessingPatient, setAccessingPatient] = useState(false);
  const [accessMsg, setAccessMsg] = useState({ type: '', text: '' });

  // Patient access via QR
  const [qrToken, setQrToken] = useState('');
  const [qrAccessMsg, setQrAccessMsg] = useState({ type: '', text: '' });
  const [accessingQr, setAccessingQr] = useState(false);

  const [accessMethod, setAccessMethod] = useState('otp');

  // Nurse access requests
  const [nurseRequests, setNurseRequests] = useState([]);
  const [nurseRequestCount, setNurseRequestCount] = useState(0);
  const [showNursePopup, setShowNursePopup] = useState(false);
  const [processingRequest, setProcessingRequest] = useState(null);
  const nurseReqPollRef = useRef(null);

  const fetchData = async () => {
    try {
      const [dashRes, affRes, nursesRes] = await Promise.all([
        doctorService.getDashboard(),
        profileService.doctor.getAffiliations(),
        doctorService.getAssignedNurses()
      ]);
      setDashboard(dashRes.data);
      setAffiliations(affRes.data || []);
      setAssignedNurses(nursesRes.data || []);
    } catch {
      // silent
    }
  };

  const fetchNurseRequests = async () => {
    try {
      const [reqRes, countRes] = await Promise.all([
        doctorService.getNurseRequests('pending'),
        doctorService.getNurseRequestCount()
      ]);
      setNurseRequests(reqRes.data || []);
      const count = countRes.data?.count || 0;
      setNurseRequestCount(count);
      // Auto-show popup when new requests arrive
      if (count > 0 && !showNursePopup) {
        setShowNursePopup(true);
      }
    } catch {
      // silent
    }
  };

  useEffect(() => { fetchData(); fetchNurseRequests(); }, []);

  // Poll for nurse requests
  useEffect(() => {
    nurseReqPollRef.current = setInterval(fetchNurseRequests, NURSE_REQUEST_POLL);
    return () => { if (nurseReqPollRef.current) clearInterval(nurseReqPollRef.current); };
  }, []);

  const handleApproveRequest = async (requestId) => {
    setProcessingRequest(requestId);
    try {
      await doctorService.approveNurseRequest(requestId);
      fetchNurseRequests();
    } catch {
      // silent
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleRejectRequest = async (requestId) => {
    setProcessingRequest(requestId);
    try {
      await doctorService.rejectNurseRequest(requestId);
      fetchNurseRequests();
    } catch {
      // silent
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleAffiliate = async (e) => {
    e.preventDefault();
    if (!otpInput.trim()) return;
    setAffiliating(true);
    setAffiliateMsg({ type: '', text: '' });
    try {
      const data = await profileService.doctor.affiliate(otpInput.trim(), deptInput.trim());
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

  const handlePatientAccess = async (e) => {
    e.preventDefault();
    if (!patientEmail.trim() || !patientOtp.trim()) return;
    setAccessingPatient(true);
    setAccessMsg({ type: '', text: '' });
    try {
      const res = await doctorService.verifyPatientOtp(patientEmail.trim(), patientOtp.trim());
      setAccessMsg({ type: 'success', text: `Access granted to patient: ${res.data?.patientName || patientEmail}` });
      setPatientEmail('');
      setPatientOtp('');
      fetchData();
    } catch (err) {
      setAccessMsg({ type: 'error', text: err?.response?.data?.message || 'Failed to verify OTP.' });
    } finally {
      setAccessingPatient(false);
    }
  };

  const handleQrAccess = async (e) => {
    e.preventDefault();
    if (!qrToken.trim()) return;
    setAccessingQr(true);
    setQrAccessMsg({ type: '', text: '' });
    try {
      const res = await doctorService.verifyQrToken(qrToken.trim());
      setQrAccessMsg({ type: 'success', text: `Access granted to patient: ${res.data?.patientName || 'Unknown'}` });
      setQrToken('');
      fetchData();
    } catch (err) {
      setQrAccessMsg({ type: 'error', text: err?.response?.data?.message || 'Invalid QR code.' });
    } finally {
      setAccessingQr(false);
    }
  };

  return (
    <DashboardLayout title="Doctor Dashboard">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-xs uppercase text-gray-600 font-medium mb-2">Total Patients</h3>
          <p className="text-4xl font-bold text-purple-600">{dashboard?.patientCount ?? 0}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-xs uppercase text-gray-600 font-medium mb-2">Medical Records</h3>
          <p className="text-4xl font-bold text-purple-600">{dashboard?.recordCount ?? 0}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-xs uppercase text-gray-600 font-medium mb-2">Hospital Affiliations</h3>
          <p className="text-4xl font-bold text-purple-600">{dashboard?.affiliationCount ?? 0}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-xs uppercase text-gray-600 font-medium mb-2">Rating</h3>
          <p className="text-4xl font-bold text-purple-600">{user?.rating?.toFixed(1) ?? '0.0'}</p>
        </div>
      </div>

      {/* Nurse Request Notification Bell */}
      {nurseRequestCount > 0 && !showNursePopup && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={() => setShowNursePopup(true)}
            className="relative bg-purple-600 text-white w-14 h-14 rounded-full shadow-lg hover:bg-purple-700 flex items-center justify-center text-2xl animate-bounce"
          >
            🔔
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold">
              {nurseRequestCount}
            </span>
          </button>
        </div>
      )}

      {/* Nurse Access Request Popup */}
      {showNursePopup && nurseRequests.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="bg-purple-600 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold">Nurse Access Requests ({nurseRequests.length})</h3>
              <button onClick={() => setShowNursePopup(false)} className="text-white/80 hover:text-white text-2xl">&times;</button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh] space-y-3">
              {nurseRequests.map((req) => (
                <div key={req._id} className="border-2 border-gray-200 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-gray-800">{req.nurse?.name || 'Nurse'}</p>
                      <p className="text-xs text-gray-500">
                        {req.type === 'nurse_extension_request' ? '⏱️ Time Extension Request' : req.operation === 'edit' ? '✏️ Edit Record' : '📝 Create Record'}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400">{new Date(req.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <div className="text-sm text-gray-600 mb-3 space-y-1">
                    <p>Patient: <span className="font-medium">{req.patient?.name || 'Unknown'}</span> ({req.patient?.patientId || ''})</p>
                    {req.hospital?.name && <p>Hospital: <span className="font-medium">{req.hospital.name}</span></p>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApproveRequest(req._id)}
                      disabled={processingRequest === req._id}
                      className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
                    >
                      {processingRequest === req._id ? '...' : '✓ Approve'}
                    </button>
                    <button
                      onClick={() => handleRejectRequest(req._id)}
                      disabled={processingRequest === req._id}
                      className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
                    >
                      {processingRequest === req._id ? '...' : '✗ Reject'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Nurse requests inline panel (when popup is dismissed) */}
      {nurseRequestCount > 0 && (
        <div className="bg-orange-50 border-2 border-orange-200 p-5 rounded-xl mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-orange-800">🔔 Pending Nurse Requests ({nurseRequestCount})</h2>
            <button onClick={() => setShowNursePopup(true)} className="text-orange-600 text-sm font-semibold hover:text-orange-700">View All</button>
          </div>
          <p className="text-sm text-orange-600">You have {nurseRequestCount} pending nurse access request(s). Click "View All" to approve or reject.</p>
        </div>
      )}

      {/* Patient Access Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm mb-5">
        <h2 className="text-gray-800 text-xl font-semibold mb-2">Access Patient Records</h2>
        <p className="text-gray-500 text-sm mb-4">
          Request access to a patient's medical records using their OTP or QR code.
        </p>

        <div className="flex gap-3 mb-4">
          <button
            onClick={() => setAccessMethod('otp')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${accessMethod === 'otp' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            OTP Access
          </button>
          <button
            onClick={() => setAccessMethod('qr')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${accessMethod === 'qr' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            QR Code Access
          </button>
        </div>

        {accessMethod === 'otp' ? (
          <form onSubmit={handlePatientAccess} className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Patient Email</label>
              <input
                type="email"
                value={patientEmail}
                onChange={(e) => setPatientEmail(e.target.value)}
                placeholder="patient@example.com"
                className="w-60 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-600 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">OTP from Patient</label>
              <input
                type="text"
                maxLength={6}
                value={patientOtp}
                onChange={(e) => setPatientOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="6-digit OTP"
                className="w-36 px-3 py-2 border-2 border-gray-200 rounded-lg text-base font-mono focus:outline-none focus:border-purple-600 transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={accessingPatient || !patientEmail || patientOtp.length !== 6}
              className="px-5 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {accessingPatient ? 'Verifying...' : 'Verify & Access'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleQrAccess} className="flex flex-wrap gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-600 mb-1">QR Token</label>
              <input
                type="text"
                value={qrToken}
                onChange={(e) => setQrToken(e.target.value.trim())}
                placeholder="Paste QR code token here"
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:border-purple-600 transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={accessingQr || !qrToken}
              className="px-5 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {accessingQr ? 'Verifying...' : 'Verify QR'}
            </button>
          </form>
        )}

        {accessMsg.text && accessMethod === 'otp' && (
          <p className={`mt-3 text-sm font-medium ${accessMsg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{accessMsg.text}</p>
        )}
        {qrAccessMsg.text && accessMethod === 'qr' && (
          <p className={`mt-3 text-sm font-medium ${qrAccessMsg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{qrAccessMsg.text}</p>
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
            <input type="text" value={deptInput} onChange={(e) => setDeptInput(e.target.value)} placeholder="e.g., Cardiology" className="w-48 px-3 py-2 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-purple-600 transition-colors" />
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

      {/* Assigned Nurses */}
      <div className="bg-white p-6 rounded-xl shadow-sm mb-5">
        <h2 className="text-gray-800 text-xl font-semibold mb-4">👩‍⚕️ Nurses Assigned to Me</h2>
        {assignedNurses.length === 0 ? (
          <p className="text-gray-500 text-sm">No nurses currently assigned to you.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assignedNurses.map((item) => (
              <div key={item._id} className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border-2 border-purple-100">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-gray-800 text-lg">{item.nurse?.name || 'Nurse'}</p>
                    <p className="text-sm text-gray-600">{item.nurse?.email || ''}</p>
                  </div>
                  <span className="px-2 py-1 bg-purple-600 text-white text-xs rounded-full font-semibold">
                    {item.nurse?.shift || 'N/A'}
                  </span>
                </div>
                <div className="space-y-1 text-sm text-gray-700">
                  <p><span className="font-semibold">License:</span> {item.nurse?.licenseNumber || 'N/A'}</p>
                  <p><span className="font-semibold">Qualification:</span> {item.nurse?.qualification || 'N/A'}</p>
                  {item.nurse?.specialization && (
                    <p><span className="font-semibold">Specialization:</span> {item.nurse.specialization}</p>
                  )}
                  <p><span className="font-semibold">Department:</span> {item.department || item.nurse?.department || 'N/A'}</p>
                  <p><span className="font-semibold">Hospital:</span> {item.hospitalId?.name || 'N/A'}</p>
                  {item.nurse?.phone && (
                    <p><span className="font-semibold">Phone:</span> {item.nurse.phone}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Patients */}
      <div className="bg-white p-6 rounded-xl shadow-sm mb-5">
        <h2 className="text-gray-800 text-xl font-semibold mb-4">Recent Patients</h2>
        {!dashboard?.recentPatients?.length ? (
          <p className="text-gray-500 text-sm">No patients have granted you access yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600 border-b">
                  <th className="pb-3 font-semibold">Name</th>
                  <th className="pb-3 font-semibold">Email</th>
                  <th className="pb-3 font-semibold">Gender</th>
                  <th className="pb-3 font-semibold">Blood Group</th>
                  <th className="pb-3 font-semibold">Access Granted</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.recentPatients.map((a) => (
                  <tr key={a._id} className="border-b border-gray-100">
                    <td className="py-3 font-medium text-gray-800">{a.patient?.name || 'N/A'}</td>
                    <td className="py-3 text-gray-600">{a.patient?.email || 'N/A'}</td>
                    <td className="py-3 text-gray-600 capitalize">{a.patient?.gender || '-'}</td>
                    <td className="py-3 text-gray-600">{a.patient?.bloodGroup || '-'}</td>
                    <td className="py-3 text-gray-600">{new Date(a.grantedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Records */}
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h2 className="text-gray-800 text-xl font-semibold mb-4">Recent Medical Records</h2>
        {!dashboard?.recentRecords?.length ? (
          <p className="text-gray-500 text-sm">No medical records yet.</p>
        ) : (
          <div className="space-y-3">
            {dashboard.recentRecords.map((r) => (
              <div key={r._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-semibold text-gray-800">{r.diagnosis}</p>
                  <p className="text-sm text-gray-500">Patient: {r.patient?.name || 'N/A'} · Hospital: {r.hospital?.name || 'N/A'}</p>
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

export default DoctorDashboard;
