import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import QRScanner from '../../components/QRScanner';
import { hospitalService, profileService } from '../../services/api';

const HospitalTestAssignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [testTypes, setTestTypes] = useState([]);
  const [nurses, setNurses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [verifyingPatient, setVerifyingPatient] = useState(false);
  const [creatingAssignment, setCreatingAssignment] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [filter, setFilter] = useState('all');

  // Patient verification
  const [verificationMethod, setVerificationMethod] = useState('email'); // 'email', 'qr', or 'otp'
  const [patientEmail, setPatientEmail] = useState('');
  const [patientOtp, setPatientOtp] = useState('');
  const [verifiedPatient, setVerifiedPatient] = useState(null);

  // Assignment form
  const [formData, setFormData] = useState({
    testTypeId: '',
    nurseId: '',
    notes: '',
    scheduledDate: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [assignRes, testRes, nurseRes] = await Promise.all([
        hospitalService.getTestAssignments(),
        hospitalService.getTestTypes(),
        profileService.hospital.getNurses()
      ]);
      setAssignments(assignRes.data || []);
      setTestTypes((testRes.data || []).filter(t => t.isActive));
      setNurses(nurseRes.data || []);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load data' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleVerifyPatient = async () => {
    // Validation
    if (verificationMethod === 'email') {
      if (!patientEmail || !patientOtp) {
        setMessage({ type: 'error', text: 'Please enter both patient email and OTP' });
        return;
      }
      if (patientOtp.length !== 6) {
        setMessage({ type: 'error', text: 'OTP must be 6 digits' });
        return;
      }
    } else if (verificationMethod === 'otp' && patientOtp.length !== 6) {
      setMessage({ type: 'error', text: 'Please enter a valid 6-digit OTP' });
      return;
    }

    setVerifyingPatient(true);
    setMessage({ type: '', text: '' });

    try {
      let res;
      
      if (verificationMethod === 'email') {
        // New email + OTP method
        res = await hospitalService.verifyPatientWithEmail(patientEmail, patientOtp);
      } else {
        // Existing OTP-only method
        res = await hospitalService.verifyPatient(verificationMethod, {
          otp: verificationMethod === 'otp' ? patientOtp : undefined
        });
      }
      
      setVerifiedPatient(res.data.patient);
      setMessage({ type: 'success', text: `✅ Patient verified: ${String(res.data.patient?.name || 'Unknown')}` });
      setPatientEmail('');
      setPatientOtp('');
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to verify patient' });
      setVerifiedPatient(null);
    } finally {
      setVerifyingPatient(false);
    }
  };

  const handleQRScan = async (scannedText) => {
    setShowQRScanner(false);
    
    // Strip the 'hrms:patient:' prefix if present
    let token = scannedText;
    if (token.startsWith('hrms:patient:')) {
      token = token.replace('hrms:patient:', '');
    }

    setVerifyingPatient(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await hospitalService.verifyPatient('qr', { qrToken: token });
      setVerifiedPatient(res.data.patient);
      setMessage({ type: 'success', text: `✅ Patient verified: ${String(res.data.patient?.name || 'Unknown')}` });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Invalid QR code' });
      setVerifiedPatient(null);
    } finally {
      setVerifyingPatient(false);
    }
  };

  const handleQRScanError = () => {
    setShowQRScanner(false);
    setMessage({ type: 'error', text: 'Failed to scan QR code. Please check camera permissions.' });
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    
    if (!verifiedPatient) {
      setMessage({ type: 'error', text: 'Please verify patient first' });
      return;
    }

    if (!formData.testTypeId || !formData.nurseId) {
      setMessage({ type: 'error', text: 'Please select test type and nurse' });
      return;
    }

    setCreatingAssignment(true);
    setMessage({ type: '', text: '' });

    try {
      await hospitalService.createTestAssignment({
        testTypeId: formData.testTypeId,
        patientId: verifiedPatient._id,
        nurseId: formData.nurseId,
        notes: formData.notes,
        scheduledDate: formData.scheduledDate || undefined
      });

      setMessage({ type: 'success', text: 'Test assignment created successfully!' });
      resetForm();
      fetchData();
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to create assignment' });
    } finally {
      setCreatingAssignment(false);
    }
  };

  const resetForm = () => {
    setShowCreateForm(false);
    setVerifiedPatient(null);
    setPatientEmail('');
    setPatientOtp('');
    setFormData({
      testTypeId: '',
      nurseId: '',
      notes: '',
      scheduledDate: ''
    });
  };

  const handleCancelAssignment = async (id) => {
    if (!confirm('Cancel this test assignment?')) return;

    try {
      await hospitalService.cancelTestAssignment(id);
      setMessage({ type: 'success', text: 'Assignment cancelled' });
      fetchData();
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to cancel assignment' });
    }
  };

  const filteredAssignments = filter === 'all' 
    ? assignments 
    : assignments.filter(a => a.status === filter);

  const stats = {
    total: assignments.length,
    pending: assignments.filter(a => a.status === 'pending').length,
    in_progress: assignments.filter(a => a.status === 'in_progress').length,
    completed: assignments.filter(a => a.status === 'completed').length
  };

  return (
    <DashboardLayout title="Test Assignments">
      {/* Message Alert */}
      {message.text && (
        <div className={`mb-5 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
          {message.text}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-6">
        <div className="bg-white p-5 rounded-xl shadow-sm">
          <h3 className="text-xs uppercase text-gray-600 font-medium mb-2">Total Assignments</h3>
          <p className="text-3xl font-bold text-purple-600">{stats.total}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm">
          <h3 className="text-xs uppercase text-gray-600 font-medium mb-2">Pending</h3>
          <p className="text-3xl font-bold text-orange-600">{stats.pending}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm">
          <h3 className="text-xs uppercase text-gray-600 font-medium mb-2">In Progress</h3>
          <p className="text-3xl font-bold text-blue-600">{stats.in_progress}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm">
          <h3 className="text-xs uppercase text-gray-600 font-medium mb-2">Completed</h3>
          <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
        </div>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Test Assignments</h2>
          <p className="text-gray-600 text-sm mt-1">Assign tests to nurses for patient care</p>
        </div>
        <div className="flex gap-3">
          <Link 
            to="/hospital/tests" 
            className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors no-underline"
          >
            🧪 Manage Tests
          </Link>
          {!showCreateForm && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-5 py-2.5 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
            >
              ✚ Create Assignment
            </button>
          )}
        </div>
      </div>

      {/* Create Assignment Form */}
      {showCreateForm && (
        <div className="bg-white p-6 rounded-xl shadow-sm mb-6">
          <h3 className="text-xl font-bold text-gray-800 mb-5">Create Test Assignment</h3>

          {/* Step 1: Verify Patient */}
          <div className="mb-6 p-5 bg-blue-50 border-2 border-blue-200 rounded-lg">
            <h4 className="font-bold text-gray-800 mb-3">Step 1: Verify Patient</h4>
            
            {!verifiedPatient ? (
              <>
                <div className="flex flex-wrap gap-4 mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="email"
                      checked={verificationMethod === 'email'}
                      onChange={(e) => setVerificationMethod(e.target.value)}
                      className="w-4 h-4"
                    />
                    <span className="font-semibold">Email + OTP</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="qr"
                      checked={verificationMethod === 'qr'}
                      onChange={(e) => setVerificationMethod(e.target.value)}
                      className="w-4 h-4"
                    />
                    <span className="font-semibold">QR Code Scanner</span>
                  </label>
                  {/* <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="otp"
                      checked={verificationMethod === 'otp'}
                      onChange={(e) => setVerificationMethod(e.target.value)}
                      className="w-4 h-4"
                    />
                    <span className="font-semibold">OTP Only</span>
                  </label> */}
                </div>

                {verificationMethod === 'email' ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Patient Email Address
                      </label>
                      <input
                        type="email"
                        value={patientEmail}
                        onChange={(e) => setPatientEmail(e.target.value)}
                        placeholder="patient@example.com"
                        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-600"
                      />
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Patient OTP (6 digits)
                        </label>
                        <input
                          type="text"
                          value={patientOtp}
                          onChange={(e) => setPatientOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="000000"
                          maxLength={6}
                          className="w-40 px-4 py-2.5 border-2 border-gray-200 rounded-lg font-mono text-lg focus:outline-none focus:border-purple-600"
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          onClick={handleVerifyPatient}
                          disabled={verifyingPatient || !patientEmail || patientOtp.length !== 6}
                          className="px-6 py-2.5 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50"
                        >
                          {verifyingPatient ? 'Verifying...' : 'Verify Patient'}
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      💡 Ask the patient to generate an OTP from their dashboard and provide their email address.
                    </p>
                  </div>
                ) : verificationMethod === 'qr' ? (
                  <button
                    onClick={() => setShowQRScanner(true)}
                    disabled={verifyingPatient}
                    className="px-6 py-3 bg-linear-to-r from-purple-600 to-blue-600 text-white rounded-xl font-bold hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg disabled:opacity-50"
                  >
                    📷 Scan Patient QR Code
                  </button>
                ) : (
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={patientOtp}
                      onChange={(e) => setPatientOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Enter 6-digit OTP"
                      maxLength={6}
                      className="w-40 px-4 py-2.5 border-2 border-gray-200 rounded-lg font-mono text-lg focus:outline-none focus:border-purple-600"
                    />
                    <button
                      onClick={handleVerifyPatient}
                      disabled={verifyingPatient || patientOtp.length !== 6}
                      className="px-6 py-2.5 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50"
                    >
                      {verifyingPatient ? 'Verifying...' : 'Verify'}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-between p-4 bg-green-50 border-2 border-green-300 rounded-lg">
                <div>
                  <p className="font-bold text-green-800 text-lg">{String(verifiedPatient?.name || 'N/A')}</p>
                  <p className="text-sm text-green-600">{String(verifiedPatient?.email || 'N/A')}</p>
                </div>
                <button
                  onClick={() => {
                    setVerifiedPatient(null);
                    setPatientEmail('');
                    setPatientOtp('');
                  }}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-semibold hover:bg-red-200"
                >
                  Change Patient
                </button>
              </div>
            )}
          </div>

          {/* Step 2: Assignment Details (only shown after patient verification) */}
          {verifiedPatient && (
            <form onSubmit={handleCreateAssignment} className="space-y-4">
              <div className="mb-6 p-5 bg-purple-50 border-2 border-purple-200 rounded-lg">
                <h4 className="font-bold text-gray-800 mb-3">Step 2: Assignment Details</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-2">Test Type *</label>
                    <select
                      value={formData.testTypeId}
                      onChange={(e) => setFormData({ ...formData, testTypeId: e.target.value })}
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-600"
                      required
                    >
                      <option value="">Select test type...</option>
                      {testTypes.map((test) => (
                        <option key={test._id} value={test._id}>
                          {String(test?.name || 'Unknown Test')} ({String(test?.category || 'N/A')})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-2">Assign to Nurse *</label>
                    <select
                      value={formData.nurseId}
                      onChange={(e) => setFormData({ ...formData, nurseId: e.target.value })}
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-600"
                      required
                    >
                      <option value="">Select nurse...</option>
                      {nurses.map((nurse) => (
                        <option key={nurse.affiliationId} value={nurse.nurse._id}>
                          {String(nurse.nurse?.name || 'Unknown Nurse')} - {String(nurse.department || 'General')}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-2">Scheduled Date (Optional)</label>
                    <input
                      type="datetime-local"
                      value={formData.scheduledDate}
                      onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-600"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-semibold text-gray-600 mb-2">Additional Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Any special instructions or notes..."
                    rows="3"
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-600"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={creatingAssignment}
                  className="px-6 py-2.5 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {creatingAssignment ? 'Creating...' : 'Create Assignment'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Filter Buttons */}
      <div className="flex gap-3 mb-5">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            filter === 'all'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All ({stats.total})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            filter === 'pending'
              ? 'bg-orange-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Pending ({stats.pending})
        </button>
        <button
          onClick={() => setFilter('in_progress')}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            filter === 'in_progress'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          In Progress ({stats.in_progress})
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            filter === 'completed'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Completed ({stats.completed})
        </button>
      </div>

      {/* Assignments List */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <p className="p-6 text-gray-500">Loading assignments...</p>
        ) : filteredAssignments.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-5xl mb-4">📋</p>
            <p className="text-gray-500 text-lg">No {filter !== 'all' ? filter : ''} assignments found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Patient</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Test</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Nurse</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Scheduled</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredAssignments.map((assignment) => (
                  <tr key={assignment._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-800">{String(assignment.patient?.name || 'N/A')}</div>
                      <div className="text-sm text-gray-500">{String(assignment.patient?.email || 'N/A')}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-800">{assignment.testType?.name || 'N/A'}</div>
                      <div className="text-sm text-gray-500">{assignment.testType?.category || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-800">{String(assignment.nurse?.name || 'N/A')}</div>
                      <div className="text-sm text-gray-500">{String(assignment.nurse?.email || 'N/A')}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        assignment.status === 'completed' ? 'bg-green-100 text-green-700' :
                        assignment.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                        assignment.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {String(assignment.status || 'unknown').replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-sm">
                      {assignment.scheduledDate 
                        ? new Date(assignment.scheduledDate).toLocaleString()
                        : 'Not scheduled'
                      }
                    </td>
                    <td className="px-6 py-4">
                      {assignment.status !== 'completed' && assignment.status !== 'cancelled' && (
                        <button
                          onClick={() => handleCancelAssignment(assignment._id)}
                          className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-semibold hover:bg-red-200"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* QR Scanner Modal */}
      {showQRScanner && (
        <QRScanner
          onScan={handleQRScan}
          onError={handleQRScanError}
          onClose={() => setShowQRScanner(false)}
        />
      )}
    </DashboardLayout>
  );
};

export default HospitalTestAssignments;
