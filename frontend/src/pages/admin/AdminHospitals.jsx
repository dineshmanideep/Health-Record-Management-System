import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { adminService } from '../../services/api';

const STATUS_BADGE = {
  pending_approval: 'bg-amber-100 text-amber-700',
  active: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  suspended: 'bg-gray-200 text-gray-600'
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
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Total', value: counts.total, color: 'text-indigo-600' },
          { label: 'Pending', value: counts.pending, color: 'text-amber-500' },
          { label: 'Active', value: counts.active, color: 'text-green-600' },
          { label: 'Rejected', value: counts.rejected, color: 'text-red-500' },
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
              { value: 'pending_approval', label: 'Pending' },
              { value: 'active', label: 'Active' },
              { value: 'rejected', label: 'Rejected' },
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
                {f.value === 'pending_approval' && counts.pending > 0 && (
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
        ) : hospitals.length === 0 ? (
          <div className="p-10 text-center text-gray-400">No hospitals found.</div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {hospitals.map((h) => (
              <li key={h._id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-800">{h.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[h.accountStatus]}`}>
                      {STATUS_LABEL[h.accountStatus]}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {h.email} · {h.hospitalType} · Reg# {h.registrationNumber}
                  </p>
                  {h.address && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {[h.address.city, h.address.state].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {h.accountStatus === 'pending_approval' && (
                    <>
                      <ActionBtn color="green" loading={loadingId === h._id} onClick={() => doAction(adminService.approveHospital, h._id)}>
                        Approve
                      </ActionBtn>
                      <ActionBtn color="red" loading={loadingId === h._id} onClick={() => doAction(adminService.rejectHospital, h._id)}>
                        Reject
                      </ActionBtn>
                    </>
                  )}
                  {h.accountStatus === 'active' && (
                    <ActionBtn color="orange" loading={loadingId === h._id} onClick={() => doAction(adminService.suspendHospital, h._id)}>
                      Revoke Access
                    </ActionBtn>
                  )}
                  {(h.accountStatus === 'rejected' || h.accountStatus === 'suspended') && (
                    <ActionBtn color="green" loading={loadingId === h._id} onClick={() => doAction(adminService.reactivateHospital, h._id)}>
                      Reactivate
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
    red: 'bg-red-500 hover:bg-red-600',
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

export default AdminHospitals;
