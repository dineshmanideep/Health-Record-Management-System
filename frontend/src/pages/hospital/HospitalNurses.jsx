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
    <DashboardLayout title="Clinical Operations">
      <div className="space-y-10 pb-20">
        {error && (
          <div className="bg-rose-50 dark:bg-rose-900/10 text-rose-600 dark:text-rose-400 p-6 rounded-[2.5rem] border-l-4 border-rose-500 shadow-xl shadow-rose-500/10 text-[10px] font-black uppercase tracking-widest animate-in slide-in-from-top-4 duration-500">
            ⚠️ SYSTEM ERROR: {error}
          </div>
        )}
        {success && (
          <div className="bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 p-6 rounded-[2.5rem] border-l-4 border-emerald-500 shadow-xl shadow-emerald-500/10 text-[10px] font-black uppercase tracking-widest animate-in slide-in-from-top-4 duration-500">
            ✅ PROTOCOL SUCCESS: {success}
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-sm border border-slate-200/50 dark:border-slate-800 transition-all">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase flex items-center gap-4">
                <span className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center text-2xl shadow-sm border border-emerald-100/50 dark:border-emerald-800/30">👩‍⚕️</span>
                Clinical Support Registry
              </h2>
              <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mt-3 ml-16 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> 
                {nurses.length} Authenticated Nursing Staff
              </p>
            </div>
            {!loading && nurses.length > 0 && (
               <div className="px-6 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl font-black text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest truncate">
                 Operations Node Status: Active
               </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-40 animate-pulse">
             <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
             <p className="mt-8 text-slate-400 font-black tracking-[0.3em] uppercase text-[10px]">Scanning Personnel Database...</p>
          </div>
        ) : nurses.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-32 rounded-[3.5rem] shadow-sm text-center border border-slate-200/50 dark:border-slate-800">
            <p className="text-8xl mb-10 grayscale opacity-10">👩‍⚕️</p>
            <p className="text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.4em] text-[11px] mb-4">Registry Null</p>
            <p className="text-slate-400 dark:text-slate-600 text-sm font-bold max-w-xs mx-auto leading-relaxed">No nursing staff discovered in the registry. Initiate secure OTP registration to onboard personnel.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {nurses.map((n) => (
              <div 
                key={n.affiliationId} 
                className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200/50 dark:border-slate-800 p-10 hover:shadow-2xl transition-all duration-500 group relative overflow-hidden"
              >
                {/* Decorative accent */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-emerald-500/10 transition-colors" />

                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-black shadow-xl shadow-emerald-500/20 text-lg">
                        {n.nurse?.name?.[0]?.toUpperCase() || 'N'}
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{n.nurse?.name || 'Anonymous'}</h3>
                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-1 italic">{n.nurse?.specialization || 'Clinical Support'}</p>
                      </div>
                    </div>
                    <span className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40">
                      Active
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3 mb-10 bg-slate-50 dark:bg-slate-950 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                    {[
                      { label: 'Artifact ID', value: n.nurse?.email },
                      { label: 'Comm Link', value: n.nurse?.phone },
                      { label: 'Degree', value: n.nurse?.qualification },
                      { label: 'Shift Phase', value: n.nurse?.shift },
                      { label: 'Division', value: n.department },
                      { label: 'Established', value: new Date(n.joinedAt).toLocaleDateString() }
                    ].map((row) => row.value && (
                      <div key={row.label} className="flex justify-between items-center text-[10px] border-b border-slate-500/5 last:border-0 pb-2 last:pb-0">
                        <span className="font-black text-slate-400 uppercase tracking-widest italic">{row.label}</span>
                        <span className="font-black text-slate-700 dark:text-slate-300 uppercase truncate ml-4 max-w-[60%] text-right">{row.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Doctor Assignment Section */}
                  <div className="mb-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 italic">Assigned Clinical Officer</p>
                    {n.assignedDoctor ? (
                      <div className="flex items-center justify-between bg-emerald-50/50 dark:bg-emerald-900/10 p-5 rounded-[1.5rem] border border-emerald-100 dark:border-emerald-800/30">
                        <div>
                          <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tight">Dr. {n.assignedDoctor.name}</p>
                          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-1 uppercase italic">{n.assignedDoctor.specialization || 'General Surgery'}</p>
                        </div>
                        <button
                          onClick={() => handleUnassign(n.affiliationId)}
                          className="bg-white dark:bg-slate-900 p-2 rounded-lg text-[9px] font-black text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-sm border border-rose-100/50 dark:border-rose-900/40 uppercase"
                        >
                          Revoke
                        </button>
                      </div>
                    ) : assigningId === n.affiliationId ? (
                      <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                        <select
                          value={selectedDoctor}
                          onChange={(e) => setSelectedDoctor(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3 text-[10px] font-black uppercase text-slate-700 dark:text-white outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all appearance-none cursor-pointer"
                        >
                          <option value="">Select Liaison Officer</option>
                          {doctors.map((d) => (
                            <option key={d.doctor?._id} value={d.doctor?._id}>
                              Dr. {d.doctor?.name} | {d.doctor?.specialization || 'N/A'}
                            </option>
                          ))}
                        </select>
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleAssign(n.affiliationId)}
                            disabled={!selectedDoctor}
                            className="flex-1 bg-emerald-600 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20 active:scale-95"
                          >
                            Bind
                          </button>
                          <button
                            onClick={() => { setAssigningId(null); setSelectedDoctor(''); }}
                            className="flex-1 bg-slate-50 dark:bg-slate-950 text-slate-500 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-slate-100 dark:border-slate-800 active:scale-95"
                          >
                            Abort
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAssigningId(n.affiliationId)}
                        className="w-full bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:bg-emerald-600 hover:text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-slate-100 dark:border-slate-800 active:scale-95 group/btn"
                      >
                        <span className="group-hover/btn:scale-110 inline-block transition-transform">+ Assign Protocol Lead</span>
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => handleRevoke(n.affiliationId, n.nurse?.name)}
                    className="w-full bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border border-rose-100 dark:border-rose-900/30 active:scale-95"
                  >
                    Terminate Affiliation
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default HospitalNurses;
