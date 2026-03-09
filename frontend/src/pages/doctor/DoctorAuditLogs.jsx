import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { doctorService } from '../../services/api';

const DoctorAuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchLogs = (p) => {
    setLoading(true);
    doctorService.getAuditLogs(p)
      .then((res) => {
        setLogs(res.data || []);
        setTotalPages(res.totalPages || 1);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchLogs(page); }, [page]);

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
    record_created: 'bg-green-100 text-green-700',
    record_viewed: 'bg-blue-100 text-blue-700',
    record_modified: 'bg-yellow-100 text-yellow-700',
    doctor_access_granted: 'bg-green-100 text-green-700',
    doctor_access_revoked: 'bg-red-100 text-red-700',
    doctor_viewed_records: 'bg-blue-100 text-blue-700',
    profile_updated: 'bg-purple-100 text-purple-700'
  };

  return (
    <DashboardLayout title="Audit Logs">
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h2 className="text-gray-800 text-xl font-semibold mb-6">Activity Trail</h2>

        {loading ? (
          <p className="text-gray-500">Loading logs...</p>
        ) : logs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-6xl mb-4">📋</p>
            <p className="text-gray-500 text-lg">No audit logs found</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log._id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                  <span className="text-2xl">{actionIcons[log.action] || '📋'}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${actionColors[log.action] || 'bg-gray-100 text-gray-600'}`}>
                        {log.action?.replace(/_/g, ' ')}
                      </span>
                      {log.patient?.name && (
                        <span className="text-xs text-gray-500">Patient: {log.patient.name}</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700">{log.details || 'No details'}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      By {log.performedBy?.name || 'System'} ({log.performedBy?.role || 'N/A'}) · {new Date(log.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-3 mt-6">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-gray-100 rounded-lg text-sm font-semibold disabled:opacity-40 hover:bg-gray-200 transition-colors"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 bg-gray-100 rounded-lg text-sm font-semibold disabled:opacity-40 hover:bg-gray-200 transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DoctorAuditLogs;
