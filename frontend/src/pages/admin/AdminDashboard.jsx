import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { adminService } from '../../services/api';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [pending, setPending] = useState({ hospitals: [], doctors: [], nurses: [] });
  const [loadingId, setLoadingId] = useState(null);
  const [activeTab, setActiveTab] = useState('hospitals');

  const fetchPending = useCallback(async () => {
    try {
      const [h, d, n] = await Promise.all([
        adminService.getPendingHospitals(),
        adminService.getPendingDoctors(),
        adminService.getPendingNurses()
      ]);
      setPending({
        hospitals: h.data || [],
        doctors: d.data || [],
        nurses: n.data || []
      });
    } catch {
      // silently fail — user sees empty lists
    }
  }, []);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  const handleAction = async (action, id) => {
    setLoadingId(id);
    try {
      await action(id);
      await fetchPending();
    } catch {
      // ignore
    } finally {
      setLoadingId(null);
    }
  };

  const totalPending = pending.hospitals.length + pending.doctors.length + pending.nurses.length;

  return (
    <DashboardLayout title="Admin Dashboard">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-xs uppercase text-gray-600 font-medium mb-2">Pending Hospitals</h3>
          <p className="text-4xl font-bold text-amber-500">{pending.hospitals.length}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-xs uppercase text-gray-600 font-medium mb-2">Pending Doctors</h3>
          <p className="text-4xl font-bold text-amber-500">{pending.doctors.length}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-xs uppercase text-gray-600 font-medium mb-2">Pending Nurses</h3>
          <p className="text-4xl font-bold text-amber-500">{pending.nurses.length}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-xs uppercase text-gray-600 font-medium mb-2">Total Pending</h3>
          <p className="text-4xl font-bold text-indigo-600">{totalPending}</p>
        </div>
      </div>

      {/* Pending Approvals */}
      <div className="bg-white rounded-xl shadow-sm mb-5 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-gray-800 text-xl font-semibold">Pending Approvals</h2>
          <button onClick={fetchPending} className="text-sm text-indigo-600 hover:underline">Refresh</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {[
            { key: 'hospitals', label: `Hospitals (${pending.hospitals.length})` },
            { key: 'doctors',   label: `Doctors (${pending.doctors.length})` },
            { key: 'nurses',    label: `Nurses (${pending.nurses.length})` }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-6 py-3 text-sm font-medium transition-colors ${activeTab === tab.key ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'hospitals' && (
            <PendingList
              items={pending.hospitals}
              emptyText="No hospitals pending approval."
              renderInfo={(h) => (
                <>
                  <p className="font-semibold text-gray-800">{h.name}</p>
                  <p className="text-sm text-gray-500">{h.email} · {h.hospitalType} · Reg# {h.registrationNumber}</p>
                </>
              )}
              actions={(h) => (
                <>
                  <ActionBtn color="green" loading={loadingId === h._id} onClick={() => handleAction(adminService.approveHospital, h._id)}>Approve</ActionBtn>
                  <ActionBtn color="red"   loading={loadingId === h._id} onClick={() => handleAction(adminService.rejectHospital,  h._id)}>Reject</ActionBtn>
                </>
              )}
            />
          )}
          {activeTab === 'doctors' && (
            <PendingList
              items={pending.doctors}
              emptyText="No doctors pending verification."
              renderInfo={(d) => (
                <>
                  <p className="font-semibold text-gray-800">Dr. {d.name}</p>
                  <p className="text-sm text-gray-500">{d.email} · {d.specialization} · License# {d.licenseNumber}</p>
                </>
              )}
              actions={(d) => (
                <ActionBtn color="green" loading={loadingId === d._id} onClick={() => handleAction(adminService.verifyDoctor, d._id)}>Verify</ActionBtn>
              )}
            />
          )}
          {activeTab === 'nurses' && (
            <PendingList
              items={pending.nurses}
              emptyText="No nurses pending verification."
              renderInfo={(n) => (
                <>
                  <p className="font-semibold text-gray-800">{n.name}</p>
                  <p className="text-sm text-gray-500">{n.email} · License# {n.licenseNumber}</p>
                </>
              )}
              actions={(n) => (
                <ActionBtn color="green" loading={loadingId === n._id} onClick={() => handleAction(adminService.verifyNurse, n._id)}>Verify</ActionBtn>
              )}
            />
          )}
        </div>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-sm">
        <h2 className="text-gray-800 mb-3 text-xl font-semibold">Welcome, {user?.name}!</h2>
        <p className="text-gray-600 text-sm">
          Use the panels above to approve hospitals and verify doctor/nurse licenses. Approved hospitals can then generate OTPs to invite staff.
        </p>
      </div>
    </DashboardLayout>
  );
};

const PendingList = ({ items, emptyText, renderInfo, actions }) => {
  if (items.length === 0) {
    return <p className="text-gray-500 text-sm py-4">{emptyText}</p>;
  }
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex-1">{renderInfo(item)}</div>
          <div className="flex gap-2 ml-4">{actions(item)}</div>
        </li>
      ))}
    </ul>
  );
};

const ActionBtn = ({ color, loading, onClick, children }) => {
  const colors = {
    green: 'bg-green-600 hover:bg-green-700',
    red:   'bg-red-500 hover:bg-red-600'
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

export default AdminDashboard;
