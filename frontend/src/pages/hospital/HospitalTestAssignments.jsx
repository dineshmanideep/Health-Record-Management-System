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
    } catch {
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
    } catch {
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

  const filterTone = {
    all: 'bg-slate-900 text-white shadow-lg shadow-slate-900/10',
    pending: 'bg-amber-600 text-white shadow-lg shadow-amber-500/20',
    in_progress: 'bg-blue-600 text-white shadow-lg shadow-blue-500/20',
    completed: 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
  };

  return (
    <DashboardLayout title="Clinical Deployments">
      <div className="space-y-6 pb-12">
        {/* Message Alert */}
        {message.text && (
          <div className={`p-4 rounded-2xl text-sm font-medium animate-fadeIn flex items-center gap-3 border ${
            message.type === 'success' 
              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/50' 
              : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-800/50'
          }`}>
            <span>{message.type === 'success' ? '✅' : '⚠️'}</span>
            {message.text}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: stats.total, icon: '📋', color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
            { label: 'Pending', value: stats.pending, icon: '⏳', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
            { label: 'In Progress', value: stats.in_progress, icon: '⚙️', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
            { label: 'Completed', value: stats.completed, icon: '✅', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' }
          ].map((s) => (
            <div key={s.label} className="bg-white dark:bg-slate-900 p-4 md:p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800 relative overflow-hidden group hover:shadow-md transition-all">
              <div className={`absolute top-0 right-0 w-12 h-12 md:w-16 md:h-16 ${s.bg} blur-xl rounded-full -translate-y-1/2 translate-x-1/2 opacity-60`} />
              <p className="text-[9px] md:text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{s.label}</p>
              <div className="flex items-end justify-between">
                <p className={`text-xl md:text-2xl font-extrabold ${s.color}`}>{s.value}</p>
                <span className="text-lg md:text-xl opacity-40">{s.icon}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Header Action Bar */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">Test Administration</h2>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">Manage patient diagnostics and nurse protocols</p>
            </div>
            <div className="flex gap-3">
              <Link 
                to="/hospital/tests" 
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-750 transition-all no-underline flex items-center gap-2"
              >
                🔬 Protocol Library
              </Link>
              {!showCreateForm && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/20 uppercase tracking-widest hover:bg-emerald-700 transition-all active:scale-95 flex items-center gap-2"
                >
                  ✚ Deploy Team
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Create Assignment Form */}
        {showCreateForm && (
          <div className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-3xl md:rounded-[2.5rem] shadow-xl border-4 border-emerald-500/10 mb-8 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-10">
               <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">New Assignment Protocol</h3>
                  <p className="text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase mt-1">Initiating secure deployment sequence</p>
               </div>
               <button onClick={resetForm} className="text-slate-400 hover:text-rose-500 transition-all text-2xl font-black">×</button>
            </div>

            {/* Step 1: Verify Patient */}
            <div className="mb-10 p-6 md:p-8 bg-slate-50 dark:bg-slate-800/80 rounded-3xl md:rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-700">
              <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                 <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Phase I: Subject Verification
              </h4>
              
              {!verifiedPatient ? (
                <div className="space-y-8">
                  <div className="flex flex-wrap gap-2 md:gap-4 p-1.5 bg-white dark:bg-slate-900 rounded-2xl w-full sm:w-fit border border-slate-100 dark:border-slate-800">
                    {[
                      { id: 'email', label: 'EMAIL & OTP', icon: '📧' },
                      { id: 'qr', label: 'QR SCANNER', icon: '📷' }
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        onClick={() => setVerificationMethod(mode.id)}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all flex items-center gap-2 ${
                          verificationMethod === mode.id
                            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                            : 'text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400'
                        }`}
                      >
                        {mode.icon} {mode.label}
                      </button>
                    ))}
                  </div>

                  {verificationMethod === 'email' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 ml-1">
                          Subject Email Node
                        </label>
                        <input
                          type="email"
                          value={patientEmail}
                          onChange={(e) => setPatientEmail(e.target.value)}
                          placeholder="target@clinical_node.com"
                          className="w-full px-6 py-4 bg-white dark:bg-slate-900 border-none rounded-2xl text-sm font-bold dark:text-white placeholder:opacity-30 focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                        />
                      </div>
                      <div className="flex gap-3 items-end">
                        <div className="flex-1">
                          <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 ml-1">
                            Auth Key (OTP)
                          </label>
                          <input
                            type="text"
                            value={patientOtp}
                            onChange={(e) => setPatientOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="000 000"
                            maxLength={6}
                            className="w-full px-6 py-4 bg-white dark:bg-slate-900 border-none rounded-2xl font-black text-lg text-emerald-500 tracking-[0.2em] focus:ring-2 focus:ring-emerald-500 transition-all outline-none text-center"
                          />
                        </div>
                        <button
                          onClick={handleVerifyPatient}
                          disabled={verifyingPatient || !patientEmail || patientOtp.length !== 6}
                          className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all disabled:opacity-50 h-[56px]"
                        >
                          {verifyingPatient ? 'Verifying...' : 'Verify'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-10 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                      <div className="text-4xl mb-6 opacity-40">📷</div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-6">Scanner ready for subject identification</p>
                      <button
                        onClick={() => setShowQRScanner(true)}
                        disabled={verifyingPatient}
                        className="px-10 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:scale-105 transition-all disabled:opacity-50"
                      >
                        Launch QR Interface
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-between p-8 bg-emerald-50/50 dark:bg-emerald-900/10 border-2 border-emerald-500/20 rounded-[2rem] animate-fadeIn">
                  <div className="flex items-center gap-6 mb-4 sm:mb-0">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-emerald-600 flex items-center justify-center text-white text-3xl font-black">
                       {verifiedPatient?.name?.[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xl font-black text-slate-900 dark:text-white leading-none uppercase tracking-tight">{verifiedPatient?.name}</p>
                      <p className="text-[10px] font-black text-emerald-500/80 uppercase tracking-widest mt-2">{verifiedPatient?.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setVerifiedPatient(null); setPatientEmail(''); setPatientOtp(''); }}
                    className="px-6 py-3 bg-white dark:bg-slate-900 text-slate-400 hover:text-rose-500 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm transition-all"
                  >
                    Abort Verification
                  </button>
                </div>
              )}
            </div>

            {/* Step 2: Assignment Details */}
            {verifiedPatient && (
              <form onSubmit={handleCreateAssignment} className="space-y-10 animate-fadeInUp">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 p-8 bg-slate-50 dark:bg-slate-800 rounded-[2rem] border border-slate-100 dark:border-slate-750">
                  <div className="lg:col-span-3 mb-2">
                    <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                       <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Phase II: Lab Assignment Data
                    </h4>
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 ml-1">Protocol Type *</label>
                    <select
                      value={formData.testTypeId}
                      onChange={(e) => setFormData({ ...formData, testTypeId: e.target.value })}
                      className="w-full px-6 py-4 bg-white dark:bg-slate-900 border-none rounded-2xl text-xs font-black dark:text-white focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none appearance-none cursor-pointer uppercase tracking-tight"
                      required
                    >
                      <option value="">-- SELECT PROTOCOL --</option>
                      {testTypes.map((test) => (
                        <option key={test._id} value={test._id}>{test?.name} ({test?.category})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 ml-1">Assigned Personnel *</label>
                    <select
                      value={formData.nurseId}
                      onChange={(e) => setFormData({ ...formData, nurseId: e.target.value })}
                      className="w-full px-6 py-4 bg-white dark:bg-slate-900 border-none rounded-2xl text-xs font-black dark:text-white focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none appearance-none cursor-pointer uppercase tracking-tight"
                      required
                    >
                      <option value="">-- CHOOSE NURSE --</option>
                      {nurses.map((nurse) => (
                        <option key={nurse.affiliationId} value={nurse.nurse._id}>{nurse.nurse?.name} [{nurse.department}]</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 ml-1">Deployment Time (Est)</label>
                    <input
                      type="datetime-local"
                      value={formData.scheduledDate}
                      onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                      className="w-full px-6 py-4 bg-white dark:bg-slate-900 border-none rounded-2xl text-[10px] font-black dark:text-white focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                    />
                  </div>

                  <div className="lg:col-span-3">
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 ml-1">Clinical Directives</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Enter special instructions for field personnel..."
                      rows="4"
                      className="w-full px-8 py-6 bg-white dark:bg-slate-900 border-none rounded-[2.5rem] text-sm font-bold dark:text-white focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    type="submit"
                    disabled={creatingAssignment}
                    className="flex-1 py-5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-transform disabled:opacity-50"
                  >
                    {creatingAssignment ? 'Synchronizing Pipeline...' : 'Authorize Full Deployment'}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-10 py-5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase tracking-widest rounded-[2rem] active:scale-95 transition-transform"
                  >
                    Abort
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Filter Toolbar */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800 overflow-x-auto">
          <div className="flex items-center gap-2">
            {[
              { id: 'all', label: 'All Assignments', count: stats.total },
              { id: 'pending', label: 'Queued', count: stats.pending },
              { id: 'in_progress', label: 'Active Lab', count: stats.in_progress },
              { id: 'completed', label: 'Archived', count: stats.completed }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                  filter === f.id
                    ? filterTone[f.id]
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {f.label} ({f.count})
              </button>
            ))}
          </div>
        </div>

        {/* Assignments Table */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl md:rounded-[2.5rem] border border-slate-200/60 dark:border-slate-800 overflow-hidden shadow-sm">
          {loading ? (
             <div className="flex items-center justify-center py-24">
                <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
             </div>
          ) : filteredAssignments.length === 0 ? (
            <div className="py-24 text-center">
              <div className="w-20 h-20 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-4xl mx-auto mb-6">🧪</div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">
                {filter === 'all' ? 'No deployments created yet.' : `No ${filter.replace('_', ' ')} deployments found.`}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 max-w-md mx-auto">
                Verify a patient, choose a protocol, and assign a nurse to start the diagnostic workflow.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Subject Entity</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Lab Protocol</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Personnel</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Phase</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest italic text-right">Target Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                  {filteredAssignments.map((assignment) => (
                    <tr key={assignment._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight">{assignment.patient?.name}</div>
                        <div className="text-[10px] font-bold text-slate-400 italic mt-0.5">{assignment.patient?.email}</div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-black uppercase inline-block whitespace-nowrap">
                           {assignment.testType?.name}
                        </div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1.5">{assignment.testType?.category}</p>
                      </td>
                      <td className="px-8 py-6">
                        <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">{assignment.nurse?.name}</div>
                        <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">RN-CERTIFIED</div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter shadow-sm border ${
                          assignment.status === 'completed' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/50' :
                          assignment.status === 'in_progress' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800/50' :
                          assignment.status === 'pending' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800/50' :
                          'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200'
                        }`}>
                          {assignment.status === 'pending' ? '● QUEUED' : 
                           assignment.status === 'in_progress' ? '● PROCESSING' : 
                           assignment.status === 'completed' ? '● FINALIZED' : 
                           assignment.status?.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        {assignment.status !== 'completed' && assignment.status !== 'cancelled' ? (
                          <button
                            onClick={() => handleCancelAssignment(assignment._id)}
                            className="w-10 h-10 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all ml-auto opacity-0 group-hover:opacity-100"
                            title="Cancel Assignment"
                          >
                            ×
                          </button>
                        ) : (
                           <div className="text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase italic">Locked</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
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
