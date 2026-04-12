import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import LoadingScreen from '../../components/LoadingScreen';
import toast from 'react-hot-toast';
import { profileService, nurseService } from '../../services/api';

const NurseDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [affiliation, setAffiliation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [otpInput, setOtpInput] = useState('');
  const [deptInput, setDeptInput] = useState('');
  const [affiliating, setAffiliating] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dashRes, affRes] = await Promise.all([
        nurseService.getDashboard(),
        profileService.nurse.getAffiliations()
      ]);
      setDashboard(dashRes.data);
      setAffiliation(affRes.data || null);
    } catch {
      toast.error('Failed to synchronize nurse clinical data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAffiliate = async (e) => {
    e.preventDefault();
    if (!otpInput.trim()) return;
    setAffiliating(true);
    try {
      const data = await profileService.nurse.affiliate(otpInput.trim(), deptInput.trim());
      toast.success(`Successfully affiliated with ${data.hospital?.name || 'the hospital'}`);
      setOtpInput('');
      setDeptInput('');
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to affiliate.');
    } finally {
      setAffiliating(false);
    }
  };

  // Calculate total pending tasks (doctor assignments + hospital test assignments)
  const totalPendingTasks = (dashboard?.pendingAssignmentsCount ?? 0) + (dashboard?.pendingTestAssignmentsCount ?? 0);

  return (
    <DashboardLayout title="Nurse Dashboard">
      {loading ? (
        <LoadingScreen message="Initializing Support Personnel Console" />
      ) : (
      <div className="max-w-7xl mx-auto space-y-8 pb-20 px-4 sm:px-0">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-200/50 dark:border-slate-800 relative group overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/10 dark:bg-orange-500/20 blur-2xl rounded-full -translate-y-1/2 translate-x-1/2"></div>
            <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Pending Tasks</h3>
            <p className="text-4xl font-black text-orange-600 dark:text-orange-400">{totalPendingTasks}</p>
            <div className="flex gap-2 mt-3">
               <span className="px-2 py-0.5 bg-orange-50 dark:bg-orange-950/30 text-[9px] font-black text-orange-600 rounded-md">DOCTOR: {dashboard?.pendingAssignmentsCount ?? 0}</span>
               <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/30 text-[9px] font-black text-blue-600 rounded-md">TEST: {dashboard?.pendingTestAssignmentsCount ?? 0}</span>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-200/50 dark:border-slate-800 relative group overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-500/10 dark:bg-indigo-500/20 blur-2xl rounded-full -translate-y-1/2 translate-x-1/2"></div>
            <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Records Created</h3>
            <p className="text-4xl font-black text-indigo-600 dark:text-indigo-400">{dashboard?.recordCount ?? 0}</p>
            <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-tight">Total Submissions</p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-200/50 dark:border-slate-800 relative group overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 dark:bg-purple-500/20 blur-2xl rounded-full -translate-y-1/2 translate-x-1/2"></div>
            <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Assigned Doctor</h3>
            <p className="text-4xl font-black text-purple-600 dark:text-purple-400">{dashboard?.assignedDoctor ? '01' : '00'}</p>
            <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-tight">Active Link</p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-200/50 dark:border-slate-800 relative group overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 dark:bg-emerald-500/20 blur-2xl rounded-full -translate-y-1/2 translate-x-1/2"></div>
            <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Hospital Status</h3>
            <p className={`text-2xl font-black ${affiliation ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-700'}`}>
              {affiliation ? 'CONNECTED' : 'NOT LINKED'}
            </p>
            <div className={`w-2 h-2 rounded-full mt-4 ${affiliation ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-200/50 dark:border-slate-800 mb-6 group">
          <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight mb-8">Nurse Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link to="/nurse/assignments" className="flex items-center gap-4 px-6 py-4 bg-indigo-600 hover:bg-slate-900 dark:hover:bg-white dark:hover:text-slate-900 text-white rounded-2xl shadow-lg shadow-indigo-500/20 transition-all no-underline group/link">
              <span className="text-2xl group-hover/link:rotate-12 transition-transform">📋</span>
              <div className="text-left">
                 <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Physician</p>
                 <p className="font-bold text-sm">Doctor Tasks</p>
              </div>
            </Link>
            <Link to="/nurse/test-assignments" className="flex items-center gap-4 px-6 py-4 bg-blue-600 hover:bg-slate-900 dark:hover:bg-white dark:hover:text-slate-900 text-white rounded-2xl shadow-lg shadow-blue-500/20 transition-all no-underline group/link">
              <span className="text-2xl group-hover/link:rotate-12 transition-transform">🧪</span>
              <div className="text-left">
                 <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Hospital</p>
                 <p className="font-bold text-sm">Test Center</p>
              </div>
            </Link>
            <Link to="/nurse/profile" className="flex items-center gap-4 px-6 py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl transition-all no-underline group/link">
              <span className="text-2xl group-hover/link:rotate-12 transition-transform">👤</span>
              <div className="text-left">
                 <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Profile</p>
                 <p className="font-bold text-sm">My Profile</p>
              </div>
            </Link>
            <Link to="/nurse/audit-logs" className="flex items-center gap-4 px-6 py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl transition-all no-underline group/link">
              <span className="text-2xl group-hover/link:rotate-12 transition-transform">📊</span>
              <div className="text-left">
                 <p className="text-[10px] font-black uppercase tracking-widest opacity-40">System</p>
                 <p className="font-bold text-sm">Audit Logs</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Pending Assignments */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-200/50 dark:border-slate-800 mb-6 relative overflow-hidden">
          <div className="flex justify-between items-center mb-8 relative z-10">
            <div>
              <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">Pending Doctor Assignments</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Tasks assigned by doctors</p>
            </div>
            <Link to="/nurse/assignments" className="px-6 py-2 bg-slate-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-xl font-black text-[10px] uppercase tracking-widest no-underline hover:bg-indigo-600 hover:text-white transition-all">
              View All →
            </Link>
          </div>
          {!dashboard?.pendingAssignments?.length ? (
            <div className="py-12 text-center opacity-30 grayscale relative z-10">
              <p className="text-5xl mb-4">✨</p>
              <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed px-10">No pending doctor assignments</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
              {dashboard.pendingAssignments.map((assignment) => (
                <div key={assignment._id} className="bg-slate-50 dark:bg-slate-800/50 border border-transparent dark:border-slate-700 p-6 rounded-[2rem] hover:shadow-xl transition-all group/card">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-slate-800 dark:text-white truncate uppercase tracking-tight group-hover/card:text-indigo-600 transition-colors">
                        {assignment.patient?.name}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1 mb-4">ID: {assignment.patient?.patientId}</p>
                      
                      <div className="space-y-2 mb-6">
                        <p className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                          <span className="w-4 h-4 rounded bg-white dark:bg-slate-700 flex items-center justify-center text-[10px]">🩺</span> 
                          Dr. {assignment.doctor?.name}
                        </p>
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-500 flex items-center gap-2">
                          <span className="w-4 h-4 rounded bg-white dark:bg-slate-700 flex items-center justify-center text-[10px]">🏢</span> 
                          {assignment.hospital?.name}
                        </p>
                      </div>

                      <Link 
                        to="/nurse/assignments" 
                        className="w-full block text-center py-2.5 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-white/10 no-underline shadow-sm active:scale-95 transition-all hover:bg-indigo-600 hover:text-white hover:border-indigo-600"
                      >
                        Open Assignment
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Hospital Test Assignments */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-200/50 dark:border-slate-800 mb-6">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">Pending Test Assignments</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Tasks assigned by hospital</p>
            </div>
            <Link to="/nurse/test-assignments" className="px-6 py-2 bg-slate-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 rounded-xl font-black text-[10px] uppercase tracking-widest no-underline hover:bg-blue-600 hover:text-white transition-all">
              View Tests →
            </Link>
          </div>
          {!dashboard?.pendingTestAssignments?.length ? (
            <div className="py-12 text-center opacity-30 grayscale">
              <p className="text-5xl mb-4">🧪</p>
              <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed px-10">No pending test assignments</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dashboard.pendingTestAssignments.map((assignment) => (
                <div key={assignment._id} className="bg-slate-50 dark:bg-slate-800/50 border border-transparent dark:border-slate-700 p-5 rounded-[2rem] hover:shadow-xl transition-all group/test">
                  <div className="mb-4">
                    <span className="px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                      {assignment.testType?.category || 'General'}
                    </span>
                  </div>
                  <p className="font-black text-slate-800 dark:text-white truncate uppercase tracking-tight group-hover/test:text-blue-600 transition-colors">
                    {assignment.testType?.name}
                  </p>
                  <div className="mt-4 space-y-2 mb-6">
                    <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                      <span className="w-4 h-4 rounded bg-white dark:bg-slate-700 flex items-center justify-center text-[10px]">👤</span>
                      {assignment.patient?.name}
                    </p>
                    <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 truncate flex items-center gap-2">
                      <span className="w-4 h-4 rounded bg-white dark:bg-slate-700 flex items-center justify-center text-[10px]">🏥</span>
                      {assignment.hospital?.name}
                    </p>
                  </div>
                  <Link 
                    to="/nurse/test-assignments" 
                    className="w-full block text-center py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest no-underline shadow-lg shadow-blue-500/10 active:scale-95 transition-all"
                  >
                    Open Test
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Assigned Doctor */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-200/50 dark:border-slate-800 group">
            <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight mb-8 flex items-center gap-3">
               <span className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl flex items-center justify-center text-lg">👨‍⚕️</span> Assigned Doctor
            </h2>
            {!dashboard?.assignedDoctor ? (
              <div className="p-10 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl text-center opacity-40">
                <p className="text-[10px] font-black uppercase tracking-widest">No physician linkage identified</p>
              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-800/50 p-8 rounded-3xl border border-transparent hover:border-indigo-500/20 transition-all flex items-start gap-6">
                <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-indigo-500/20">
                  {dashboard.assignedDoctor.name[0]}
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 dark:text-white tracking-tight">DR. {dashboard.assignedDoctor.name.toUpperCase()}</h3>
                  <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1">{dashboard.assignedDoctor.specialization || 'Clinical Operations'}</p>
                  <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mt-4 leading-normal">{dashboard.assignedDoctor.email}</p>
                </div>
              </div>
            )}
          </div>

          {/* Hospital Affiliation Detail (only if linked) */}
          {affiliation && (
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-200/50 dark:border-slate-800 group">
              <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight mb-8 flex items-center gap-3">
                 <span className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl flex items-center justify-center text-lg">🏢</span> Base Operations
              </h2>
              <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-8 rounded-3xl border border-emerald-100/50 dark:border-emerald-900/40 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 animate-pulse"><span className="text-4xl text-emerald-600 font-black italic">ACTIVE</span></div>
                <p className="text-lg font-black text-slate-800 dark:text-white tracking-tight mb-2 truncate">{affiliation.hospital?.name || 'Hospital'}</p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4">
                   <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                     <span className="w-2 h-2 rounded-full bg-emerald-500"></span> {affiliation.department || 'General'}
                   </p>
                   <span className="text-slate-300 dark:text-slate-700">|</span>
                   <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Since {new Date(affiliation.joinedAt).toLocaleDateString()}</p>
                </div>
                <p className="text-[10px] font-bold text-slate-400 mt-6 max-w-sm leading-relaxed italic opacity-80 uppercase tracking-tighter">Only one facility linkage permitted per session cycle.</p>
              </div>
            </div>
          )}
        </div>

        {/* New Affiliation Form (if not linked) */}
        {!affiliation && (
          <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-xl border-2 border-indigo-500/20 mb-8 animate-in zoom-in-95 duration-300">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-8 mb-10">
              <div>
                <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Hospital Affiliation</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-3 max-w-lg leading-relaxed font-medium italic">Enter the 6-digit OTP shared by your hospital administrator to join the hospital.</p>
              </div>
              <div className="w-24 h-24 bg-indigo-50 dark:bg-slate-800 rounded-[2rem] flex items-center justify-center text-4xl shadow-inner group transition-transform hover:scale-105">
                 🏢
              </div>
            </div>

            <form onSubmit={handleAffiliate} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Hospital OTP *</label>
                <input 
                  type="text" 
                  maxLength={6} 
                  value={otpInput} 
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))} 
                  placeholder="Ex: 882944" 
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-xl font-black font-mono dark:text-white tracking-[0.5em] focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-center" 
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Department</label>
                <input 
                  type="text" 
                  value={deptInput} 
                  onChange={(e) => setDeptInput(e.target.value)} 
                  placeholder="Ex: Emergency/ICU" 
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 transition-all outline-none" 
                />
              </div>
              <button 
                type="submit" 
                disabled={affiliating || otpInput.length !== 6} 
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-500/20 active:scale-95 transition-all disabled:opacity-50 hover:bg-slate-900 dark:hover:bg-white dark:hover:text-slate-900"
              >
                {affiliating ? 'Submitting...' : 'Join Hospital'}
              </button>
            </form>
          </div>
        )}
      </div>
      )}
    </DashboardLayout>
  );
};

export default NurseDashboard;
