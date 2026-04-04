import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { profileService } from '../../services/api';

const HospitalAuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchLogs = async (p = page) => {
    try {
      setLoading(true);
      const res = await profileService.hospital.getAuditLogs(p, 20);
      if (res.success) {
        setLogs(res.data.logs);
        setTotalPages(res.data.totalPages);
      }
    } catch {
      setError('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(page); }, [page]);

  const actionLabel = (action) => {
    const map = {
      doctor_joined: 'Doctor Joined',
      nurse_joined: 'Nurse Joined',
      doctor_revoked: 'Doctor Revoked',
      nurse_revoked: 'Nurse Revoked',
      nurse_assigned_to_doctor: 'Nurse Assigned to Doctor',
      nurse_unassigned_from_doctor: 'Nurse Unassigned',
      profile_updated: 'Profile Updated'
    };
    return map[action] || action;
  };

  const actionColor = (action) => {
    if (action.includes('joined')) return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400';
    if (action.includes('revoked')) return 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400';
    if (action.includes('assigned')) return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400';
    if (action.includes('updated')) return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
    return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
  };

  const actionIcon = (action) => {
    if (action.includes('joined')) return '✅';
    if (action.includes('revoked')) return '🚫';
    if (action === 'nurse_assigned_to_doctor') return '🔗';
    if (action === 'nurse_unassigned_from_doctor') return '🔓';
    if (action.includes('updated')) return '✏️';
    return '📋';
  };

  return (
    <DashboardLayout title="Safety Logs">
      <div className="space-y-6 pb-12">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-2xl border border-red-100 dark:border-red-800/50 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-10 h-10 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm text-slate-400">Loading logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 py-20 text-center">
            <span className="text-5xl opacity-20 block mb-4">📋</span>
            <p className="text-slate-500 dark:text-slate-400 font-semibold">No audit logs yet</p>
            <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Staff joining, revoking, and assignments will appear here.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {logs.map((log) => (
                <div key={log._id} className="flex items-start gap-4 px-6 py-5 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <span className="text-2xl mt-0.5 shrink-0">{actionIcon(log.action)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className={`px-2.5 py-0.5 text-[10px] font-semibold rounded-full ${actionColor(log.action)}`}>
                        {actionLabel(log.action)}
                      </span>
                      {log.performedBy?.name && (
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">
                          by <span className="font-medium text-slate-600 dark:text-slate-300">{log.performedBy.name}</span>
                          <span className="opacity-60"> ({log.performedBy.role})</span>
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{log.details}</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">{new Date(log.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-3 mt-2">
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

export default HospitalAuditLogs;
