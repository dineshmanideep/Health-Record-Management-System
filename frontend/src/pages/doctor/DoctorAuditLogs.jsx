import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { doctorService } from '../../services/api';

const DoctorAuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    let isActive = true;

    const fetchLogs = async () => {
      setLoading(true);
      try {
        const res = await doctorService.getAuditLogs(page);
        if (!isActive) return;
        setLogs(res.data || []);
        setTotalPages(res.totalPages || 1);
      } catch {
        if (!isActive) return;
        setLogs([]);
      } finally {
        if (isActive) setLoading(false);
      }
    };

    void fetchLogs();
    return () => {
      isActive = false;
    };
  }, [page]);

  const actionIcons = {
    record_created: '📝',
    record_viewed: '👁️',
    record_modified: '✏️',
    self_record_uploaded: '📤',
    self_record_deleted: '🗑️',
    doctor_access_granted: '✅',
    doctor_access_revoked: '❌',
    doctor_viewed_records: '📋',
    profile_updated: '👤'
  };

  const actionColors = {
    record_created: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
    record_viewed: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    record_modified: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    doctor_access_granted: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
    doctor_access_revoked: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    doctor_viewed_records: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    profile_updated: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
  };

  return (
    <DashboardLayout title="Audit Logs">
      <div className="space-y-6 pb-12">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-10 h-10 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm text-slate-400">Loading logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 py-20 text-center">
            <span className="text-5xl opacity-20 block mb-4">📋</span>
            <p className="text-slate-500 dark:text-slate-400 font-semibold">No audit logs found</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Activity Trail</h2>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {logs.map((log) => (
                <div key={log._id} className="flex items-start gap-4 px-6 py-5 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <span className="text-2xl mt-0.5 shrink-0">{actionIcons[log.action] || '📋'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className={`px-2.5 py-0.5 text-[10px] font-semibold rounded-full ${actionColors[log.action] || 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                        {log.action?.replace(/_/g, ' ')}
                      </span>
                      {log.patient?.name && (
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">
                          Patient: <span className="font-medium text-slate-600 dark:text-slate-300">{log.patient.name}</span>
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{log.details || 'No details'}</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">
                      By <span className="font-medium">{log.performedBy?.name || 'System'}</span>
                      <span className="opacity-60"> ({log.performedBy?.role || 'N/A'})</span>
                      {' · '}{new Date(log.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-3">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
            >
              ← Previous
            </button>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DoctorAuditLogs;
