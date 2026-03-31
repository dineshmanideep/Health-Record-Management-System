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
        setLogs(res.data || []);
        setTotalPages(res.totalPages || 1);
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
        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
           <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
           <p className="mt-4 text-slate-500 font-medium tracking-widest uppercase text-[10px]">Loading logs...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Audit Logs">
      {logs.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-20 rounded-[3rem] shadow-sm border border-slate-200/50 dark:border-slate-800 text-center opacity-40 grayscale transition-all">
          <p className="text-6xl mb-6">📂</p>
          <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">No logs found</p>
        </div>
      ) : (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-200/50 dark:border-slate-800">
            <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight mb-8">Recent Activity</h2>
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log._id} className="bg-slate-50 dark:bg-slate-800/50 border border-transparent dark:border-slate-700 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:shadow-lg transition-all group/log">
                  <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest whitespace-nowrap shadow-sm group-hover/log:scale-105 transition-transform ${
                    log.action?.includes('created') ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' :
                    log.action?.includes('updated') ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' :
                    log.action?.includes('login') ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400' :
                    'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                  }`}>
                    {log.action?.replace(/_/g, ' ') || 'SYSTEM_LOG'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-800 dark:text-slate-200 font-bold text-sm truncate uppercase tracking-tight">{log.details || 'LOG_ENTRY_NULL'}</p>
                    <div className="flex items-center gap-3 mt-1 opacity-60">
                       {log.patient?.name && (
                         <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 truncate">Sbj: {log.patient.name}</p>
                       )}
                       <span className="text-slate-300 dark:text-slate-700 text-[10px]">|</span>
                       <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{formatDate(log.createdAt)}</p>
                    </div>
                  </div>
                  <div className="hidden sm:block">
                     <span className="text-[10px] text-slate-300 dark:text-slate-700 font-black">ID_{log._id.slice(-6).toUpperCase()}</span>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-4 mt-10 pt-8 border-t dark:border-slate-800">
                <button 
                  disabled={page <= 1} 
                  onClick={() => setPage(page - 1)} 
                  className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-black text-[10px] uppercase tracking-widest disabled:opacity-30 hover:bg-indigo-600 hover:text-white transition-all active:scale-95"
                >
                  ← Previous
                </button>
                <div className="flex flex-col items-center">
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sequence</span>
                   <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">{page} / {totalPages}</span>
                </div>
                <button 
                  disabled={page >= totalPages} 
                  onClick={() => setPage(page + 1)} 
                  className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-black text-[10px] uppercase tracking-widest disabled:opacity-30 hover:bg-indigo-600 hover:text-white transition-all active:scale-95"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default NurseAuditLogs;
