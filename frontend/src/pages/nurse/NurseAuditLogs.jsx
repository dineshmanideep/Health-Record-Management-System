import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { nurseService } from '../../services/api';

const NurseAuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    nurseService.getAuditLogs(page)
      .then((res) => {
        setLogs(res.data?.logs || []);
        setTotalPages(res.data?.totalPages || 1);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page]);

  const formatDate = (d) => new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const actionColors = {
    'record_created': 'bg-green-100 text-green-700',
    'record_updated': 'bg-blue-100 text-blue-700',
    'login': 'bg-purple-100 text-purple-700',
    'affiliation': 'bg-yellow-100 text-yellow-700'
  };

  const getColor = (action) => {
    const key = Object.keys(actionColors).find(k => action?.toLowerCase().includes(k));
    return key ? actionColors[key] : 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <DashboardLayout title="Audit Logs">
        <p className="text-gray-500">Loading...</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Audit Logs">
      {logs.length === 0 ? (
        <div className="bg-white p-12 rounded-xl shadow-sm text-center">
          <p className="text-6xl mb-4">🔍</p>
          <p className="text-gray-500 text-lg">No audit logs found</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log._id} className="bg-white p-4 rounded-xl shadow-sm flex items-center gap-4">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${getColor(log.action)}`}>
                  {log.action?.replace(/_/g, ' ').toUpperCase() || 'ACTION'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-800 font-medium text-sm truncate">{log.details || 'No details'}</p>
                  <p className="text-gray-400 text-xs">{log.patient?.name ? `Patient: ${log.patient.name}` : ''}</p>
                </div>
                <p className="text-gray-400 text-xs whitespace-nowrap">{formatDate(log.createdAt)}</p>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-4 py-2 bg-white border rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">Previous</button>
              <span className="px-4 py-2 text-sm text-gray-600">Page {page} of {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="px-4 py-2 bg-white border rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">Next</button>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
};

export default NurseAuditLogs;
