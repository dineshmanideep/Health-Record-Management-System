import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { patientService } from '../../services/api';

const actionLabels = {
  record_created: { label: 'Inbound Record', color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400', icon: '📝' },
  record_viewed: { label: 'Audit Access', color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400', icon: '👁️' },
  record_modified: { label: 'Structure Update', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400', icon: '🔧' },
  self_record_uploaded: { label: 'Self Deposition', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400', icon: '📤' },
  self_record_deleted: { label: 'Erasure Request', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400', icon: '🗑️' },
  doctor_access_granted: { label: 'Privilege Granted', color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400', icon: '🔓' },
  doctor_access_revoked: { label: 'Access Revocation', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400', icon: '🔒' },
  doctor_viewed_records: { label: 'Clinical Review', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400', icon: '👨‍⚕️' },
  profile_updated: { label: 'Identity Update', color: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400', icon: '👤' }
};

const PatientActivityLogs = () => {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadLogs(page);
  }, [page]);

  const loadLogs = async (p) => {
    setLoading(true);
    try {
      const res = await patientService.getActivityLogs(p, 15);
      if (res.success) {
        setLogs(res.data);
        setPagination(res.pagination);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  };

  return (
    <DashboardLayout title="System Activity">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 animate-pulse">
           <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
           <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Retrieving audit trail...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-20 rounded-[3rem] shadow-sm border border-slate-200/50 dark:border-slate-800 text-center max-w-2xl mx-auto">
          <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-[2rem] flex items-center justify-center text-5xl mx-auto mb-8 shadow-inner">📄</div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">No Temporal Data</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">System activity is currently sterile. Interactions with your health records will populate this chronological ledger.</p>
        </div>
      ) : (
        <div className="space-y-8 pb-12">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-2">
             <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{pagination.total} Sequential Events Registered</p>
             </div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chronicle Page {pagination.page} of {pagination.pages}</p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-slate-200/50 dark:border-slate-800 overflow-hidden">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {logs.map((log) => {
                const info = actionLabels[log.action] || { label: log.action, color: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400', icon: '❓' };
                return (
                  <div key={log._id} className="flex items-start gap-6 px-10 py-8 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-xl shrink-0 group-hover:scale-110 transition-transform">
                       {info.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-3 mb-3">
                        <span className={`inline-block px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg ${info.color}`}>
                          {info.label}
                        </span>
                        {log.performedBy?.role && log.performedBy.role !== 'user' && (
                          <span className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1 rounded-lg">
                            Principal: {log.performedBy.name}
                          </span>
                        )}
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-auto opacity-60">
                           {new Date(log.createdAt).toLocaleDateString()} · {new Date(log.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-relaxed">{log.details || 'Operational record entry sanitized.'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex justify-center items-center gap-3 pt-6">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-20 transition-all shadow-sm active:scale-90"
              >
                ←
              </button>
              
              <div className="flex items-center gap-2 px-1">
                {Array.from({ length: pagination.pages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === pagination.pages || Math.abs(p - page) <= 1)
                  .map((p, idx, arr) => (
                    <div key={p} className="flex items-center gap-2">
                      {idx > 0 && arr[idx - 1] !== p - 1 && <span className="text-slate-300 dark:text-slate-700 font-bold px-1">•••</span>}
                      <button
                        onClick={() => setPage(p)}
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xs font-black transition-all shadow-sm active:scale-95 ${
                          p === page 
                            ? 'bg-indigo-600 text-white border-transparent scale-110 z-10' 
                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50'
                        }`}
                      >
                        {p}
                      </button>
                    </div>
                  ))}
              </div>

              <button
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                disabled={page === pagination.pages}
                className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-20 transition-all shadow-sm active:scale-90"
              >
                →
              </button>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
};

export default PatientActivityLogs;
