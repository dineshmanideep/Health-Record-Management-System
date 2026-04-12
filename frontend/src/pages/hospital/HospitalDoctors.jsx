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
    <DashboardLayout title="Clinical Staffing">
      <div className="space-y-10 pb-20">
        {error && (
          <div className="bg-rose-50 dark:bg-rose-900/10 text-rose-600 dark:text-rose-400 p-6 rounded-[2rem] border-l-4 border-rose-500 shadow-xl shadow-rose-500/10 text-[10px] font-black uppercase tracking-widest animate-in slide-in-from-top-4 duration-500">
            ⚠️ SYSTEM ERROR: {error}
          </div>
        )}
        {success && (
          <div className="bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 p-6 rounded-[2rem] border-l-4 border-emerald-500 shadow-xl shadow-emerald-500/10 text-[10px] font-black uppercase tracking-widest animate-in slide-in-from-top-4 duration-500">
            ✅ PROTOCOL SUCCESS: {success}
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-3xl md:rounded-[3rem] shadow-sm border border-slate-200/50 dark:border-slate-800 transition-all">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase flex items-center gap-4">
                <span className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center text-2xl shadow-sm border border-emerald-100/50 dark:border-emerald-800/30">⚕️</span>
                Physician Registry
              </h2>
              <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mt-3 ml-16 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> 
                {doctors.length} Authenticated Medical Practitioners
              </p>
            </div>
            {!loading && doctors.length > 0 && (
               <div className="px-6 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl font-black text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest truncate">
                 Affiliation Node Status: Online
               </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-40 animate-pulse">
             <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
             <p className="mt-8 text-slate-400 font-black tracking-[0.3em] uppercase text-[10px]">Scanning Physician Registry...</p>
          </div>
        ) : doctors.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-12 md:p-32 rounded-3xl md:rounded-[3.5rem] shadow-sm text-center border border-slate-200/50 dark:border-slate-800">
            <p className="text-8xl mb-10 grayscale opacity-10">⚕️</p>
            <p className="text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.4em] text-[11px] mb-4">Registry Null</p>
            <p className="text-slate-400 dark:text-slate-600 text-sm font-bold max-w-xs mx-auto leading-relaxed">No medical practitioners affiliated yet. Share a secure OTP to initiate registration.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {doctors.map((d) => (
              <div 
                key={d.affiliationId} 
                className="bg-white dark:bg-slate-900 rounded-3xl md:rounded-[3rem] border border-slate-200/50 dark:border-slate-800 p-6 md:p-10 hover:shadow-2xl transition-all duration-500 group relative overflow-hidden"
              >
                {/* Decorative accent */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-emerald-500/10 transition-colors" />

                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-black shadow-xl shadow-emerald-500/20 text-lg">
                        {d.doctor?.name?.[0]?.toUpperCase() || 'D'}
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Dr. {d.doctor?.name || 'Anonymous'}</h3>
                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-1 italic">{d.doctor?.specialization || 'General Practice'}</p>
                      </div>
                    </div>
                    <span className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40">
                      Active
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3 mb-10 bg-slate-50 dark:bg-slate-950 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                    {[
                      { label: 'Artifact ID', value: d.doctor?.email },
                      { label: 'Comm Link', value: d.doctor?.phone },
                      { label: 'Degree', value: d.doctor?.qualification },
                      { label: 'Efficiency', value: d.doctor?.experience ? `${d.doctor.experience} Cycles` : null },
                      { label: 'Division', value: d.department },
                      { label: 'Established', value: new Date(d.joinedAt).toLocaleDateString() }
                    ].map((row) => row.value && (
                      <div key={row.label} className="flex justify-between items-center text-[10px] border-b border-slate-500/5 last:border-0 pb-2 last:pb-0">
                        <span className="font-black text-slate-400 uppercase tracking-widest italic">{row.label}</span>
                        <span className="font-black text-slate-700 dark:text-slate-300 uppercase truncate ml-4 max-w-[60%] text-right">{row.value}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => handleRevoke(d.affiliationId, d.doctor?.name)}
                    className="w-full bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border border-rose-100 dark:border-rose-900/30 active:scale-95 shadow-lg shadow-rose-500/5"
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

export default HospitalDoctors;
