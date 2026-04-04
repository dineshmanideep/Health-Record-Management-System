import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { adminService } from '../../services/api';

const STATUS_BADGE = {
  pending_approval: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  active: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  rejected: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  suspended: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
};

const STATUS_LABEL = {
  pending_approval: 'Pending',
  active: 'Active',
  rejected: 'Rejected',
  suspended: 'Suspended'
};

const AdminHospitals = () => {
  const [allHospitals, setAllHospitals] = useState([]);
  const [filter, setFilter] = useState('');
  const [loadingId, setLoadingId] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminService.getAllHospitals();
      setAllHospitals(res.data || []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const counts = {
    total: allHospitals.length,
    pending: allHospitals.filter((h) => h.accountStatus === 'pending_approval').length,
    active: allHospitals.filter((h) => h.accountStatus === 'active').length,
    rejected: allHospitals.filter((h) => h.accountStatus === 'rejected').length,
    suspended: allHospitals.filter((h) => h.accountStatus === 'suspended').length
  };

  const hospitals = filter ? allHospitals.filter((h) => h.accountStatus === filter) : allHospitals;

  const doAction = async (actionFn, id) => {
    setLoadingId(id);
    try {
      await actionFn(id);
      await fetchAll();
    } catch {
      // ignore
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <DashboardLayout title="Manage Hospitals">
      <div className="space-y-6 pb-12">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Total', value: counts.total, icon: '🏥', color: 'text-indigo-600 dark:text-indigo-400' },
            { label: 'Pending', value: counts.pending, icon: '⏳', color: 'text-amber-600 dark:text-amber-400' },
            { label: 'Active', value: counts.active, icon: '✅', color: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'Rejected', value: counts.rejected, icon: '✕', color: 'text-red-500 dark:text-red-400' },
            { label: 'Suspended', value: counts.suspended, icon: '🚫', color: 'text-slate-500 dark:text-slate-400' }
          ].map((s) => (
            <div key={s.label} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800 relative overflow-hidden hover:shadow-md transition-all">
              <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{s.label}</p>
              <div className="flex items-end justify-between">
                <p className={`text-3xl font-extrabold ${s.color}`}>{s.value}</p>
                <span className="text-xl opacity-30">{s.icon}</span>
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
                { value: 'pending_approval', label: 'Pending' },
                { value: 'active', label: 'Active' },
                { value: 'rejected', label: 'Rejected' },
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
                  {f.value === 'pending_approval' && counts.pending > 0 && (
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
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-400 dark:text-slate-500">Loading hospitals...</p>
            </div>
          ) : hospitals.length === 0 ? (
            <div className="p-12 text-center">
              <span className="text-4xl opacity-20 block mb-3">🏥</span>
              <p className="text-sm text-slate-400 dark:text-slate-500">No hospitals found.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {hospitals.map((h) => (
                <li key={h._id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white text-sm font-bold shadow-md shrink-0">
                      {h.name?.[0]?.toUpperCase() || 'H'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-800 dark:text-white">{h.name}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${STATUS_BADGE[h.accountStatus]}`}>
                          {STATUS_LABEL[h.accountStatus]}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                        {h.email}
                        {h.hospitalType && <span className="ml-1 opacity-60">· {h.hospitalType}</span>}
                        {h.registrationNumber && <span className="ml-1 opacity-60">· Reg# {h.registrationNumber}</span>}
                      </p>
                      {h.address && (
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                          📍 {[h.address.city, h.address.state].filter(Boolean).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap shrink-0">
                    {h.accountStatus === 'pending_approval' && (
                      <>
                        <ActionBtn color="emerald" loading={loadingId === h._id} onClick={() => doAction(adminService.approveHospital, h._id)}>
                          ✓ Approve
                        </ActionBtn>
                        <ActionBtn color="red" loading={loadingId === h._id} onClick={() => doAction(adminService.rejectHospital, h._id)}>
                          Reject
                        </ActionBtn>
                      </>
                    )}
                    {h.accountStatus === 'active' && (
                      <ActionBtn color="amber" loading={loadingId === h._id} onClick={() => doAction(adminService.suspendHospital, h._id)}>
                        Revoke Access
                      </ActionBtn>
                    )}
                    {(h.accountStatus === 'rejected' || h.accountStatus === 'suspended') && (
                      <ActionBtn color="emerald" loading={loadingId === h._id} onClick={() => doAction(adminService.reactivateHospital, h._id)}>
                        Reactivate
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
    emerald: 'bg-emerald-600 hover:bg-emerald-700',
    red: 'bg-red-500 hover:bg-red-600',
    amber: 'bg-amber-500 hover:bg-amber-600'
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

export default AdminHospitals;
