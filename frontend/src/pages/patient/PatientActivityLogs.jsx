import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { patientService } from '../../services/api';

const actionLabels = {
  record_created: { label: 'Record Created', color: 'bg-green-100 text-green-700' },
  record_viewed: { label: 'Record Viewed', color: 'bg-blue-100 text-blue-700' },
  record_modified: { label: 'Record Modified', color: 'bg-yellow-100 text-yellow-700' },
  self_record_uploaded: { label: 'Document Uploaded', color: 'bg-purple-100 text-purple-700' },
  self_record_deleted: { label: 'Document Deleted', color: 'bg-red-100 text-red-700' },
  doctor_access_granted: { label: 'Doctor Access Granted', color: 'bg-green-100 text-green-700' },
  doctor_access_revoked: { label: 'Doctor Access Revoked', color: 'bg-red-100 text-red-700' },
  doctor_viewed_records: { label: 'Doctor Viewed Records', color: 'bg-blue-100 text-blue-700' },
  profile_updated: { label: 'Profile Updated', color: 'bg-gray-100 text-gray-700' }
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
    <DashboardLayout title="Activity Logs">
      {loading ? (
        <p className="text-gray-500">Loading activity logs...</p>
      ) : logs.length === 0 ? (
        <div className="bg-white p-12 rounded-xl shadow-sm text-center">
          <p className="text-5xl mb-4">📝</p>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No Activity Yet</h2>
          <p className="text-gray-500">Activity logs will appear here as doctors, nurses, and you interact with your records.</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <p className="text-sm text-gray-500">{pagination.total} total activities</p>
              <p className="text-sm text-gray-500">Page {pagination.page} of {pagination.pages}</p>
            </div>
            <div className="divide-y divide-gray-100">
              {logs.map((log) => {
                const info = actionLabels[log.action] || { label: log.action, color: 'bg-gray-100 text-gray-700' };
                return (
                  <div key={log._id} className="flex items-start gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-block px-2.5 py-0.5 text-xs font-medium rounded-full ${info.color}`}>
                          {info.label}
                        </span>
                        {log.performedBy?.role && log.performedBy.role !== 'user' && (
                          <span className="text-xs text-gray-400">
                            by {log.performedBy.name} ({log.performedBy.role})
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700">{log.details || 'No additional details'}</p>
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-md text-sm font-medium border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                ← Previous
              </button>
              {Array.from({ length: pagination.pages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === pagination.pages || Math.abs(p - page) <= 2)
                .map((p, idx, arr) => (
                  <span key={p}>
                    {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1 text-gray-400">...</span>}
                    <button
                      onClick={() => setPage(p)}
                      className={`px-3.5 py-2 rounded-md text-sm font-medium border cursor-pointer transition-colors ${
                        p === page ? 'bg-purple-600 text-white border-purple-600' : 'border-gray-300 bg-white hover:bg-gray-50'
                      }`}
                    >
                      {p}
                    </button>
                  </span>
                ))}
              <button
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                disabled={page === pagination.pages}
                className="px-4 py-2 rounded-md text-sm font-medium border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
};

export default PatientActivityLogs;
