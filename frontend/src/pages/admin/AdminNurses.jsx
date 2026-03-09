import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { adminService } from '../../services/api';

const STATUS_BADGE = {
  pending_verification: 'bg-amber-100 text-amber-700',
  verified: 'bg-green-100 text-green-700',
  suspended: 'bg-gray-200 text-gray-600'
};

const STATUS_LABEL = {
  pending_verification: 'Pending',
  verified: 'Verified',
  suspended: 'Suspended'
};

const AdminNurses = () => {
  const [allNurses, setAllNurses] = useState([]);
  const [filter, setFilter] = useState('');
  const [loadingId, setLoadingId] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminService.getAllNurses();
      setAllNurses(res.data || []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const counts = {
    total: allNurses.length,
    pending: allNurses.filter((n) => n.accountStatus === 'pending_verification').length,
    verified: allNurses.filter((n) => n.accountStatus === 'verified').length,
    suspended: allNurses.filter((n) => n.accountStatus === 'suspended').length
  };

  const nurses = filter ? allNurses.filter((n) => n.accountStatus === filter) : allNurses;

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
    <DashboardLayout title="Manage Nurses">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total', value: counts.total, color: 'text-indigo-600' },
          { label: 'Pending', value: counts.pending, color: 'text-amber-500' },
          { label: 'Verified', value: counts.verified, color: 'text-green-600' },
          { label: 'Suspended', value: counts.suspended, color: 'text-gray-500' }
        ].map((s) => (
          <div key={s.label} className="bg-white p-5 rounded-xl shadow-sm text-center">
            <p className="text-xs uppercase text-gray-500 mb-1">{s.label}</p>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {/* Filter bar */}
        <div className="p-5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
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
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filter === f.value
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.label}
                {f.value === 'pending_verification' && counts.pending > 0 && (
                  <span className="ml-1.5 bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5">
                    {counts.pending}
                  </span>
                )}
              </button>
            ))}
          </div>
          <button onClick={fetchAll} className="text-sm text-indigo-600 hover:underline">
            ↻ Refresh
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div className="p-10 text-center text-gray-400">Loading...</div>
        ) : nurses.length === 0 ? (
          <div className="p-10 text-center text-gray-400">No nurses found.</div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {nurses.map((n) => (
              <li key={n._id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-800">{n.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[n.accountStatus]}`}>
                      {STATUS_LABEL[n.accountStatus]}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {n.email}
                    {n.licenseNumber && ` · License# ${n.licenseNumber}`}
                    {n.department && ` · ${n.department}`}
                  </p>
                  {n.experience !== undefined && (
                    <p className="text-xs text-gray-400 mt-0.5">{n.experience} yr{n.experience !== 1 ? 's' : ''} experience</p>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {n.accountStatus === 'pending_verification' && (
                    <ActionBtn color="green" loading={loadingId === n._id} onClick={() => doAction(adminService.verifyNurse, n._id)}>
                      Verify
                    </ActionBtn>
                  )}
                  {n.accountStatus === 'verified' && (
                    <ActionBtn color="orange" loading={loadingId === n._id} onClick={() => doAction(adminService.suspendNurse, n._id)}>
                      Suspend
                    </ActionBtn>
                  )}
                  {n.accountStatus === 'suspended' && (
                    <ActionBtn color="green" loading={loadingId === n._id} onClick={() => doAction(adminService.reinstateNurse, n._id)}>
                      Reinstate
                    </ActionBtn>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardLayout>
  );
};

const ActionBtn = ({ color, loading, onClick, children }) => {
  const colors = {
    green: 'bg-green-600 hover:bg-green-700',
    orange: 'bg-orange-500 hover:bg-orange-600'
  };
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`px-4 py-1.5 text-sm text-white rounded-lg font-medium transition-colors disabled:opacity-50 ${colors[color]}`}
    >
      {loading ? '...' : children}
    </button>
  );
};

export default AdminNurses;
