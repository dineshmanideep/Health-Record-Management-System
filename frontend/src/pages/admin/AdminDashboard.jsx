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
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  const handleAction = async (action, id) => {
    setLoadingId(id);
    try {
      await action(id);
      await fetchPending();
    } catch { /* ignore */ } finally { setLoadingId(null); }
  };

  const totalPending = pending.hospitals.length + pending.doctors.length + pending.nurses.length;

  const KPICard = ({ label, value, icon, color }) => (
    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-200/50 dark:border-slate-800 group hover:shadow-xl transition-all overflow-hidden relative">
      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform pointer-events-none">
        <span className="text-8xl">{icon}</span>
      </div>
      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 relative z-10">{label}</p>
      <p className={`text-4xl font-black ${color} relative z-10`}>{value}</p>
    </div>
  );

  return (
    <DashboardLayout title="Admin Dashboard">
      <div className="max-w-7xl mx-auto space-y-8 pb-20 px-4 sm:px-0">
        
        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard label="Hospital backlog" value={pending.hospitals.length} icon="🏥" color="text-amber-500" />
          <KPICard label="Doctor backlog" value={pending.doctors.length} icon="👨‍⚕️" color="text-amber-500" />
          <KPICard label="Nurse backlog" value={pending.nurses.length} icon="👩‍⚕️" color="text-amber-500" />
          <KPICard label="Global Pendency" value={totalPending} icon="📁" color="text-indigo-600 dark:text-indigo-400" />
        </div>

        {/* Governance Terminal */}
        <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-sm border border-slate-200/50 dark:border-slate-800 overflow-hidden">
          <div className="p-10 border-b dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Verify users</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Authorize new users</p>
            </div>
            <button onClick={fetchPending} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl hover:scale-105 transition-transform">🔄</button>
          </div>

          <div className="flex gap-2 p-4 bg-slate-50 dark:bg-slate-800">
            {[
              { key: 'hospitals', label: 'Hospitals', count: pending.hospitals.length },
              { key: 'doctors',   label: 'Doctors', count: pending.doctors.length },
              { key: 'nurses',    label: 'Nurses', count: pending.nurses.length }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.key ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-indigo-500'}`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          <div className="p-10">
            {activeTab === 'hospitals' && (
              <PendingList
                items={pending.hospitals}
                emptyText="Registry sterile. No hospitals awaiting authorization."
                renderInfo={(h) => (
                  <div className="flex-1">
                    <p className="text-lg font-black text-slate-900 dark:text-white mb-1">{h.name}</p>
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{h.hospitalType} · REG-ID: {h.registrationNumber} · {h.email}</p>
                  </div>
                )}
                actions={(h) => (
                  <div className="flex gap-3">
                    <ActionBtn color="emerald" loading={loadingId === h._id} onClick={() => handleAction(adminService.approveHospital, h._id)}>Authorize</ActionBtn>
                    <ActionBtn color="red" loading={loadingId === h._id} onClick={() => handleAction(adminService.rejectHospital, h._id)}>Reject</ActionBtn>
                  </div>
                )}
              />
            )}
            {activeTab === 'doctors' && (
              <PendingList
                items={pending.doctors}
                emptyText="No medical principals awaiting license verification."
                renderInfo={(d) => (
                  <div className="flex-1">
                    <p className="text-lg font-black text-slate-900 dark:text-white mb-1">Dr. {d.name}</p>
                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{d.specialization} · LICENSE: {d.licenseNumber} · {d.email}</p>
                  </div>
                )}
                actions={(d) => (
                  <ActionBtn color="indigo" loading={loadingId === d._id} onClick={() => handleAction(adminService.verifyDoctor, d._id)}>Authorize</ActionBtn>
                )}
              />
            )}
            {activeTab === 'nurses' && (
              <PendingList
                items={pending.nurses}
                emptyText="No nursing staff awaiting credentials verification."
                renderInfo={(n) => (
                  <div className="flex-1">
                    <p className="text-lg font-black text-slate-900 dark:text-white mb-1">{n.name}</p>
                    <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest">LICENSE: {n.licenseNumber} · {n.email}</p>
                  </div>
                )}
                actions={(n) => (
                  <ActionBtn color="teal" loading={loadingId === n._id} onClick={() => handleAction(adminService.verifyNurse, n._id)}>Authorize</ActionBtn>
                )}
              />
            )}
          </div>
        </div>

        {/* <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-sm border border-slate-200/50 dark:border-slate-800">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2">System Genesis</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">Administrator {user?.name} acknowledged. You maintain ultimate oversight of hospital credentialing and clinical staff validation within the Health Record Management System.</p>
        </div> */}

      </div>
    </DashboardLayout>
  );
};

const PendingList = ({ items, emptyText, renderInfo, actions }) => {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
         <span className="text-5xl mb-6 opacity-20">📁</span>
         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{emptyText}</p>
      </div>
    );
  }
  return (
    <ul className="space-y-4">
      {items.map((item) => (
        <li key={item._id} className="flex flex-col sm:flex-row items-center justify-between p-8 bg-slate-50 dark:bg-slate-800 border border-transparent dark:border-slate-700 rounded-[2.5rem] group hover:shadow-lg transition-all gap-6">
          {renderInfo(item)}
          <div className="flex gap-2 shrink-0">{actions(item)}</div>
        </li>
      ))}
    </ul>
  );
};

const ActionBtn = ({ color, loading, onClick, children }) => {
  const colors = {
    emerald: 'bg-emerald-600 hover:bg-emerald-700',
    indigo:  'bg-indigo-600 hover:bg-indigo-700',
    teal:    'bg-teal-600 hover:bg-teal-700',
    red:     'bg-red-600 hover:bg-red-700'
  };
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`px-8 py-3 text-[10px] font-black text-white rounded-xl uppercase tracking-widest shadow-lg transition-all active:scale-95 disabled:opacity-50 ${colors[color]}`}
    >
      {loading ? '...' : children}
    </button>
  );
};

export default AdminDashboard;
