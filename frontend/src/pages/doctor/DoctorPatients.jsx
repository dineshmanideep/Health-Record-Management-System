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
    <DashboardLayout title="My Patients">
      <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-200/50 dark:border-slate-800 mb-6 transition-all">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-8">
          <div>
            <h2 className="text-slate-900 dark:text-white text-2xl font-black tracking-tight">
              Clinical Subjects
            </h2>
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
              {patients.length} Synchronized Nodes
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Subject ID or Alias..."
              className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
            />
          </div>
        </div>

        {loading ? (
          <p className="text-gray-500">Loading patients...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-6xl mb-4">👥</p>
            <p className="text-gray-500 text-lg">No patients found</p>
            <p className="text-gray-400 text-sm mt-1">Patients will appear here once they grant you access.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((item) => (
              <div key={item._id} className="bg-slate-50 dark:bg-slate-800/50 border border-transparent dark:border-slate-700 rounded-[2rem] p-6 hover:shadow-xl transition-all group relative overflow-hidden">
                <div className="flex items-start justify-between mb-4 relative z-10">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-slate-900 dark:text-white text-lg truncate group-hover:text-indigo-600 transition-colors">{item.patient?.name || 'N/A'}</h3>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 italic truncate">{item.patient?.email || 'N/A'}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${item.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'}`}>
                    {item.isActive ? 'Active' : 'Revoked'}
                  </span>
                </div>

                <div className="space-y-3 text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-6 relative z-10">
                  {item.patient?.phone && (
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 bg-white dark:bg-slate-700 rounded-md flex items-center justify-center text-[10px]">📞</span> 
                      <span className="font-mono">{item.patient.phone}</span>
                    </div>
                  )}
                  {item.patient?.gender && (
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 bg-white dark:bg-slate-700 rounded-md flex items-center justify-center text-[10px]">👤</span> 
                      <span className="capitalize">{item.patient.gender}</span>
                    </div>
                  )}
                  {item.patient?.bloodGroup && (
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 bg-white dark:bg-slate-700 rounded-md flex items-center justify-center text-[10px]">🩸</span> 
                      {item.patient.bloodGroup}
                    </div>
                  )}
                  {item.lastVisitDate && (
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 bg-white dark:bg-slate-700 rounded-md flex items-center justify-center text-[10px]">📅</span> 
                      Last visit: {new Date(item.lastVisitDate).toLocaleDateString()}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest mb-6 border-t dark:border-slate-700 pt-4 relative z-10">
                  <span>{item.accessMethod?.toUpperCase() || 'OTP'} LINK</span>
                  <span>SINCE {new Date(item.grantedAt).toLocaleDateString()}</span>
                </div>

                <Link
                  to={`/doctor/patient-records/${item.patient?._id}`}
                  className="w-full block text-center py-3.5 bg-indigo-600 hover:bg-slate-900 dark:hover:bg-white dark:hover:text-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/10 transition-all no-underline"
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
