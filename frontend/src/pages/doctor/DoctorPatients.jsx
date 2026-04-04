import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { doctorService } from '../../services/api';

const DoctorPatients = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    doctorService.getMyPatients()
      .then((res) => setPatients(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = patients.filter((p) => {
    const name = p.patient?.name?.toLowerCase() || '';
    const email = p.patient?.email?.toLowerCase() || '';
    const q = search.toLowerCase();
    return name.includes(q) || email.includes(q);
  });

  return (
    <DashboardLayout title="Clinical Intelligence">
      <div className="pb-20">
        {/* Search & Stats Header */}
        <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-sm border border-slate-200/50 dark:border-slate-800 mb-10 transition-all">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase flex items-center gap-4">
                <span className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center text-2xl shadow-sm border border-emerald-100/50 dark:border-emerald-800/30">👥</span>
                Subject Directory
              </h2>
              <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mt-3 ml-16 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> 
                {patients.length} Authenticated Synaptic Links
              </p>
            </div>
            <div className="relative w-full lg:w-96">
              <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 text-lg">🔍</span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Subject ID or Alias..."
                className="w-full pl-14 pr-6 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-[2rem] text-sm font-black dark:text-white placeholder:text-slate-400 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none uppercase tracking-widest"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-40 animate-pulse">
             <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
             <p className="mt-8 text-slate-400 font-black tracking-[0.3em] uppercase text-[10px]">Scanning Subject Registry...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-32 rounded-[3.5rem] shadow-sm text-center border border-slate-200/50 dark:border-slate-800">
            <p className="text-8xl mb-10 grayscale opacity-10">👥</p>
            <p className="text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.4em] text-[11px] mb-4">Registry Null</p>
            <p className="text-slate-400 dark:text-slate-600 text-sm font-bold max-w-xs mx-auto leading-relaxed">No subjects discovered matching the search vector.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {filtered.map((item) => (
              <div 
                key={item._id} 
                className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-[3rem] p-10 hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 group relative overflow-hidden"
              >
                {/* Decorative accent */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-emerald-500/10 transition-colors" />
                
                <div className="flex items-start justify-between mb-8 relative z-10">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> 
                       Subject_{item.patient?.patientId?.substring(0, 8)}
                    </p>
                    <h3 className="font-black text-slate-900 dark:text-white text-2xl uppercase tracking-tight truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors mb-2">
                      {item.patient?.name || 'Anonymous Subject'}
                    </h3>
                    <p className="text-[11px] font-bold text-slate-400 dark:text-slate-600 truncate italic">
                      {item.patient?.email || 'Unauthorized Data Access'}
                    </p>
                  </div>
                  <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                    item.isActive 
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/30' 
                      : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-800/30'
                  }`}>
                    {item.isActive ? 'Active' : 'Revoked'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8 relative z-10">
                  {item.patient?.gender && (
                    <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 italic">Genotype</p>
                      <p className="text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase">{item.patient.gender}</p>
                    </div>
                  )}
                  {item.patient?.bloodGroup && (
                    <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-4 rounded-2xl border border-emerald-100/50 dark:border-emerald-800/20">
                      <p className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em] mb-1.5 italic">Blood Type</p>
                      <p className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase">{item.patient.bloodGroup}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-4 mb-10 relative z-10">
                  {item.patient?.phone && (
                    <div className="flex items-center gap-3 text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                      <span className="w-6 h-6 bg-slate-50 dark:bg-slate-950 rounded-lg flex items-center justify-center border border-slate-100 dark:border-slate-800">📞</span> 
                      <span>{item.patient.phone}</span>
                    </div>
                  )}
                  {item.lastVisitDate && (
                    <div className="flex items-center gap-3 text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest bg-emerald-50/30 dark:bg-emerald-900/10 px-4 py-2 rounded-xl border border-emerald-100/50 dark:border-emerald-800/20">
                      <span className="text-sm">📅</span> 
                      <span>Last Synchronization: {new Date(item.lastVisitDate).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] mb-10 border-t dark:border-slate-800 pt-6 relative z-10 italic">
                  <span>VECTOR: {item.accessMethod?.toUpperCase() || 'OTP'}</span>
                  <span>EST: {new Date(item.grantedAt).toLocaleDateString()}</span>
                </div>

                <Link
                  to={`/doctor/patient-records/${item.patient?._id}`}
                  className="w-full block text-center py-4.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] shadow-xl transition-all no-underline hover:-translate-y-1 active:scale-95"
                >
                  Access Medical Vault
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DoctorPatients;
