import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { patientService } from '../../services/api';

const actionLabels = {
  record_created: { label: 'Record Created', color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400', icon: '📝' },
  record_viewed: { label: 'Record Viewed', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400', icon: '👁️' },
  record_modified: { label: 'Record Updated', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400', icon: '🔧' },
  self_record_uploaded: { label: 'Document Uploaded', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400', icon: '📤' },
  self_record_deleted: { label: 'Document Deleted', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400', icon: '🗑️' },
  doctor_access_granted: { label: 'Access Granted', color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400', icon: '🔓' },
  doctor_access_revoked: { label: 'Access Revoked', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400', icon: '🔒' },
  doctor_viewed_records: { label: 'Doctor Review', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400', icon: '👨‍⚕️' },
  profile_updated: { label: 'Profile Updated', color: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400', icon: '👤' }
};

const PatientActivityLogs = () => {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => { loadLogs(page); }, [page]);

  const loadLogs = async (p) => {
    setLoading(true);
    try {
      const res = await patientService.getActivityLogs(p, 15);
      if (res.success) { setLogs(res.data); setPagination(res.pagination); }
    } catch {}
    setLoading(false);
  };

  return (
    <DashboardLayout title="Activity Logs">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm text-slate-400 font-medium">Loading activity...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-16 rounded-2xl border border-slate-200 dark:border-slate-800 text-center max-w-lg mx-auto animate-fadeIn">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-5">📄</div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">No Activity Yet</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">Activity will appear here when you interact with your health records.</p>
        </div>
      ) : (
        <div className="space-y-5 pb-12 animate-fadeIn">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{pagination.total} events total</p>
            </div>
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500">Page {pagination.page} of {pagination.pages}</p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {logs.map((log) => {
                const info = actionLabels[log.action] || { label: log.action, color: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400', icon: '❓' };
                return (
                  <div key={log._id} className="flex items-start gap-4 px-5 sm:px-6 py-5 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-base shrink-0 group-hover:scale-110 transition-transform">
                      {info.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className={`inline-block px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md ${info.color}`}>{info.label}</span>
                        {log.performedBy?.role && log.performedBy.role !== 'user' && (
                          <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2.5 py-0.5 rounded-md">
                            By: {log.performedBy.name}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 ml-auto whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleDateString()} · {new Date(log.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{log.details || 'Activity recorded.'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex justify-center items-center gap-2 pt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-10 h-10 rounded-xl flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-20 transition-all active:scale-90"
              >←</button>
              
              <div className="flex items-center gap-1.5">
                {Array.from({ length: pagination.pages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === pagination.pages || Math.abs(p - page) <= 1)
                  .map((p, idx, arr) => (
                    <div key={p} className="flex items-center gap-1.5">
                      {idx > 0 && arr[idx - 1] !== p - 1 && <span className="text-slate-300 dark:text-slate-700 px-0.5">···</span>}
                      <button
                        onClick={() => setPage(p)}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-semibold transition-all active:scale-95 ${
                          p === page 
                            ? 'bg-indigo-600 text-white shadow-md' 
                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50'
                        }`}
                      >{p}</button>
                    </div>
                  ))}
              </div>

              <button
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                disabled={page === pagination.pages}
                className="w-10 h-10 rounded-xl flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-20 transition-all active:scale-90"
              >→</button>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
};

export default PatientActivityLogs;
