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
    if (action.includes('joined')) return 'bg-green-100 text-green-700';
    if (action.includes('revoked')) return 'bg-red-100 text-red-700';
    if (action.includes('assigned')) return 'bg-blue-100 text-blue-700';
    if (action.includes('updated')) return 'bg-yellow-100 text-yellow-700';
    return 'bg-gray-100 text-gray-700';
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
    <DashboardLayout title="Audit Logs">
      {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4">{error}</div>}

      {loading ? (
        <p className="text-gray-500">Loading audit logs...</p>
      ) : logs.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-5xl mb-4">📋</p>
          <p className="text-gray-500 text-lg">No audit logs yet</p>
          <p className="text-gray-400 text-sm mt-1">Actions like staff joining, revoking, and assignments will appear here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm">
          <div className="divide-y divide-gray-100">
            {logs.map((log) => (
              <div key={log._id} className="flex items-start gap-4 p-5">
                <span className="text-2xl mt-0.5">{actionIcon(log.action)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${actionColor(log.action)}`}>
                      {actionLabel(log.action)}
                    </span>
                    {log.performedBy?.name && (
                      <span className="text-xs text-gray-500">
                        by {log.performedBy.name} ({log.performedBy.role})
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700">{log.details}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(log.createdAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-white border rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 bg-white border rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </DashboardLayout>
  );
};

export default HospitalAuditLogs;
