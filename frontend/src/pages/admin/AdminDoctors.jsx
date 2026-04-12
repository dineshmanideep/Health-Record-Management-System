import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import LoadingScreen from '../../components/LoadingScreen';
import toast from 'react-hot-toast';
import { adminService } from '../../services/api';

const STATUS_BADGE = {
  pending_verification: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  verified: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  suspended: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
};

const STATUS_LABEL = {
  pending_verification: 'Pending',
  verified: 'Verified',
  suspended: 'Suspended'
};

const AdminDoctors = () => {
  const [allDoctors, setAllDoctors] = useState([]);
  const [filter, setFilter] = useState('');
  const [loadingId, setLoadingId] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminService.getAllDoctors();
      setAllDoctors(res.data || []);
    } catch {
      toast.error('Failed to retrieve medical practitioner data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const counts = {
    total: allDoctors.length,
    pending: allDoctors.filter((d) => d.accountStatus === 'pending_verification').length,
    verified: allDoctors.filter((d) => d.accountStatus === 'verified').length,
    suspended: allDoctors.filter((d) => d.accountStatus === 'suspended').length
  };

  const doctors = filter ? allDoctors.filter((d) => d.accountStatus === filter) : allDoctors;

  const doAction = async (actionFn, id) => {
    setLoadingId(id);
    try {
      await actionFn(id);
      toast.success('Action successfully executed');
      await fetchData();
    } catch {
      toast.error('Operation failed. Please try again.');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <DashboardLayout title="Manage Doctors">
      <div className="space-y-6 pb-12">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: counts.total, icon: '⚕️', color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
            { label: 'Pending', value: counts.pending, icon: '⏳', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
            { label: 'Verified', value: counts.verified, icon: '✅', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
            { label: 'Suspended', value: counts.suspended, icon: '🚫', color: 'text-slate-500 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-800/50' }
          ].map((s) => (
            <div key={s.label} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800 relative overflow-hidden group hover:shadow-md transition-all">
              <div className={`absolute top-0 right-0 w-16 h-16 ${s.bg} blur-xl rounded-full -translate-y-1/2 translate-x-1/2 opacity-60`} />
              <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{s.label}</p>
              <div className="flex items-end justify-between">
                <p className={`text-3xl font-extrabold ${s.color}`}>{s.value}</p>
                <span className="text-xl opacity-40">{s.icon}</span>
              </div>
            </div>
          ))}
        </div>

        {/* List Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 overflow-hidden shadow-sm">
          {/* Filter bar */}
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2 flex-wrap">
              {[
                { value: '', label: 'All' },
                { value: 'pending_verification', label: 'Pending' },
                { value: 'verified', label: 'Verified' },
                { value: 'suspended', label: 'Suspended' }
              ].map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    filter === f.value
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {f.label}
                  {f.value === 'pending_verification' && counts.pending > 0 && (
                    <span className="ml-1.5 bg-amber-500 text-white text-[10px] rounded-full px-1.5 py-0.5">
                      {counts.pending}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={fetchAll}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              ↻ Refresh
            </button>
          </div>

          {/* List */}
          {loading ? (
            <LoadingScreen message="Accessing Medical Registry" />
          ) : doctors.length === 0 ? (
            <div className="p-12 text-center">
              <span className="text-4xl opacity-20 block mb-3">⚕️</span>
              <p className="text-sm text-slate-400 dark:text-slate-500">No doctors found.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {doctors.map((d) => (
                <li key={d._id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shadow-md shrink-0">
                      {d.name?.[0]?.toUpperCase() || 'D'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-800 dark:text-white">Dr. {d.name}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${STATUS_BADGE[d.accountStatus]}`}>
                          {STATUS_LABEL[d.accountStatus]}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                        {d.email}
                        {d.licenseNumber && <span className="ml-1 opacity-60">· License# {d.licenseNumber}</span>}
                        {d.specialization && <span className="ml-1 text-indigo-500 dark:text-indigo-400"> · {d.specialization}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap shrink-0">
                    {d.accountStatus === 'pending_verification' && (
                      <ActionBtn color="emerald" loading={loadingId === d._id} onClick={() => doAction(adminService.verifyDoctor, d._id)}>
                        ✓ Verify
                      </ActionBtn>
                    )}
                    {d.accountStatus === 'verified' && (
                      <ActionBtn color="amber" loading={loadingId === d._id} onClick={() => doAction(adminService.suspendDoctor, d._id)}>
                        Suspend
                      </ActionBtn>
                    )}
                    {d.accountStatus === 'suspended' && (
                      <ActionBtn color="emerald" loading={loadingId === d._id} onClick={() => doAction(adminService.reinstateDoctor, d._id)}>
                        Reinstate
                      </ActionBtn>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

const ActionBtn = ({ color, loading, onClick, children }) => {
  const colors = {
    emerald: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20',
    amber: 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20',
    red: 'bg-red-500 hover:bg-red-600 shadow-red-500/20'
  };
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`px-4 py-2 text-xs text-white rounded-xl font-semibold transition-all shadow-sm active:scale-95 disabled:opacity-50 ${colors[color]}`}
    >
      {loading ? '...' : children}
    </button>
  );
};

export default AdminDoctors;
