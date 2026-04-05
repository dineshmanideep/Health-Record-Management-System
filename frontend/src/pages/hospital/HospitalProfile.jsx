import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { profileService } from '../../services/api';

// ── Defined OUTSIDE to avoid remounting on every render ──
const InfoRow = ({ label, value }) => (
  <div className="flex items-center py-6 border-b border-slate-100 dark:border-slate-800/50 last:border-0 group">
    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.22em] w-64 shrink-0 italic group-hover:text-teal-500 transition-colors">{label}</span>
    <span className="text-sm font-black text-slate-800 dark:text-white flex-1 uppercase tracking-widest">{value ?? 'Registry Null'}</span>
  </div>
);

const inputCls = "w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-sm font-black dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all";

const HospitalProfile = () => {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [editAddr, setEditAddr] = useState(false);
  const [form, setForm] = useState({});
  const [addrForm, setAddrForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    profileService.hospital.get()
      .then((res) => { if (res.success) setProfile(res.data); })
      .catch(() => setError('Failed to load institution credentials'));
  }, []);

  const startEdit = () => {
    setForm({
      name: profile.name || '',
      phone: profile.phone || '',
      website: profile.website || '',
      hospitalType: profile.hospitalType || '',
      establishedYear: profile.establishedYear || '',
      totalBeds: profile.totalBeds || 0,
      emergencyServices: profile.emergencyServices ?? true,
      ambulanceService: profile.ambulanceService ?? false
    });
    setEditing(true);
    setSuccess('');
  };

  const startEditAddr = () => {
    setAddrForm({
      street: profile.address?.street || '',
      city: profile.address?.city || '',
      state: profile.address?.state || '',
      zipCode: profile.address?.zipCode || '',
      country: profile.address?.country || ''
    });
    setEditAddr(true);
    setSuccess('');
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await profileService.hospital.update(form);
      if (res.success) { setProfile(res.data); setEditing(false); setSuccess('Institution metadata updated'); setTimeout(() => setSuccess(''), 3000); }
    } catch (err) {
      setError(err?.response?.data?.message || 'Metadata synchronization failed');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAddr = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await profileService.hospital.update({ address: addrForm });
      if (res.success) { setProfile(res.data); setEditAddr(false); setSuccess('Geospatial artifacts updated'); setTimeout(() => setSuccess(''), 3000); }
    } catch (err) {
      setError(err?.response?.data?.message || 'Geospatial link protocol failed');
    } finally {
      setSaving(false);
    }
  };

  const setF = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));
  const setA = (key, val) => setAddrForm((prev) => ({ ...prev, [key]: val }));

  return (
    <DashboardLayout title="Institutional Identity">
      <div className="space-y-10 pb-24 max-w-6xl">
        {error && (
          <div className="bg-rose-50 dark:bg-rose-900/10 text-rose-600 dark:text-rose-400 p-6 rounded-[2.5rem] border-l-4 border-rose-500 shadow-xl shadow-rose-500/10 text-[10px] font-black uppercase tracking-widest animate-in slide-in-from-top-4 duration-500">
            ⚠️ SYSTEM ERROR: {error}
          </div>
        )}
        {success && (
          <div className="bg-teal-50 dark:bg-teal-900/10 text-teal-600 dark:text-teal-400 p-6 rounded-[2.5rem] border-l-4 border-teal-500 shadow-xl shadow-teal-500/10 text-[10px] font-black uppercase tracking-widest animate-in slide-in-from-top-4 duration-500">
            ✅ PROTOCOL SUCCESS: {success}
          </div>
        )}

        {!profile ? (
          <div className="flex flex-col items-center justify-center py-40 animate-pulse">
            <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mb-8" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Downloading Institution Artifacts...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Institution Header */}
            <div className="lg:col-span-12 bg-white dark:bg-slate-900 rounded-[3.5rem] border border-slate-200/50 dark:border-slate-800 p-10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/5 dark:bg-teal-500/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl" />
              <div className="flex flex-col md:flex-row md:items-center gap-10 relative z-10">
                <div className="w-24 h-24 rounded-[2.5rem] bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white text-4xl font-black shadow-2xl shadow-teal-500/20 shrink-0 border-4 border-white dark:border-slate-800 group-hover:scale-105 transition-transform">
                  {profile.name?.[0]?.toUpperCase() || 'H'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-black text-teal-500 uppercase tracking-[0.3em] mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" /> 
                    Institution Node // Reg#{profile.registrationNumber}
                  </p>
                  <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{profile.name}</h2>
                  <div className="flex flex-wrap items-center gap-3 mt-4">
                    <span className="px-3 py-1.5 bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 text-[9px] font-black uppercase tracking-widest rounded-xl border border-teal-100 dark:border-teal-800/40">
                      {profile.hospitalType || 'Medical Center'}
                    </span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic flex items-center gap-2">
                       <span className="text-lg opacity-50">📧</span> {profile.email}
                    </span>
                  </div>
                </div>
                <div className="shrink-0">
                  <span className={`px-6 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] shadow-lg ${
                    profile.accountStatus === 'active'
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/40'
                      : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-800/40'
                  }`}>
                    {profile.accountStatus === 'active' ? '● Node Active' : profile.accountStatus}
                  </span>
                </div>
              </div>
            </div>

            {/* Metric Matrix */}
            <div className="lg:col-span-8 space-y-10">
              <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] border border-slate-200/50 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="px-10 py-8 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div>
                    <h3 className="text-xl font-black text-slate-950 dark:text-white uppercase tracking-tight">Institution Artifacts</h3>
                    <p className="text-[10px] font-black text-teal-500 uppercase tracking-[0.2em] mt-2 italic flex items-center gap-2">
                       <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                       Core Operational Data
                    </p>
                  </div>
                  {!editing && (
                    <button onClick={startEdit} className="px-8 py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 hover:-translate-y-1">
                      Modify Metadata
                    </button>
                  )}
                </div>

                {editing ? (
                  <div className="p-10 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3 italic">Subject Identifier</label>
                        <input type="text" value={form.name} onChange={(e) => setF('name', e.target.value)} className={inputCls} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3 italic">Comm Frequency</label>
                        <input type="text" value={form.phone} onChange={(e) => setF('phone', e.target.value)} className={inputCls} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3 italic">Digital Portal</label>
                        <input type="text" value={form.website} onChange={(e) => setF('website', e.target.value)} className={inputCls} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3 italic">Classification</label>
                        <select value={form.hospitalType} onChange={(e) => setF('hospitalType', e.target.value)} className={inputCls}>
                          <option value="">SELECT TYPE...</option>
                          <option value="Government">AUTHORITY / GOVERNMENT</option>
                          <option value="Private">PRIVATE ENTITY</option>
                          <option value="Semi-Government">HYBRID / SEMI-GOV</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3 italic">Initialization Year</label>
                        <input type="number" value={form.establishedYear} onChange={(e) => setF('establishedYear', e.target.value)} className={inputCls} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3 italic">Artifact Capacity (Beds)</label>
                        <input type="number" value={form.totalBeds} onChange={(e) => setF('totalBeds', e.target.value)} className={inputCls} />
                      </div>
                    </div>
                    <div className="flex gap-6 py-6 border-t border-slate-100 dark:border-slate-800">
                      <label className="flex items-center gap-4 cursor-pointer group">
                        <input type="checkbox" checked={form.emergencyServices} onChange={(e) => setF('emergencyServices', e.target.checked)} className="w-6 h-6 rounded-lg accent-teal-600 bg-slate-100 dark:bg-slate-900 border-none" />
                        <span className="text-[10px] font-black text-slate-700 dark:text-slate-400 uppercase tracking-widest group-hover:text-teal-500 transition-colors">Emergency Protocol</span>
                      </label>
                      <label className="flex items-center gap-4 cursor-pointer group">
                        <input type="checkbox" checked={form.ambulanceService} onChange={(e) => setF('ambulanceService', e.target.checked)} className="w-6 h-6 rounded-lg accent-teal-600 bg-slate-100 dark:bg-slate-900 border-none" />
                        <span className="text-[10px] font-black text-slate-700 dark:text-slate-400 uppercase tracking-widest group-hover:text-teal-500 transition-colors">Logistics Node</span>
                      </label>
                    </div>
                    <div className="flex gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                      <button onClick={handleSave} disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white px-10 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-teal-500/20 transition-all active:scale-95 disabled:opacity-50">
                        {saving ? 'SYNCHRONIZING...' : 'COMMIT CHANGES'}
                      </button>
                      <button onClick={() => setEditing(false)} className="bg-slate-50 dark:bg-slate-950 text-slate-400 px-10 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all border border-slate-100 dark:border-slate-800">
                        ABORT
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="px-10 pb-10">
                    <InfoRow label="Institutional Artifact" value={profile.name} />
                    <InfoRow label="Access Vector" value={profile.email} />
                    <InfoRow label="Classification" value={profile.hospitalType} />
                    <InfoRow label="Comm Frequency" value={profile.phone} />
                    <InfoRow label="Digital Portal" value={profile.website} />
                    <InfoRow label="Initialization Year" value={profile.establishedYear} />
                  </div>
                )}
              </div>

              {/* Geographic Coordinates */}
              <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] border border-slate-200/50 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="px-10 py-8 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div>
                    <h3 className="text-xl font-black text-slate-950 dark:text-white uppercase tracking-tight">Geospatial Registry</h3>
                    <p className="text-[10px] font-black text-teal-500 uppercase tracking-[0.2em] mt-2 italic flex items-center gap-2">
                       <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                       Institution Deployment Coordinates
                    </p>
                  </div>
                  {!editAddr && (
                    <button onClick={startEditAddr} className="px-8 py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 hover:-translate-y-1">
                      Relocate Node
                    </button>
                  )}
                </div>

                {editAddr ? (
                  <div className="p-10 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {[
                        { label: 'Vector Street', key: 'street' },
                        { label: 'Node City', key: 'city' },
                        { label: 'Node State', key: 'state' },
                        { label: 'Zip Registry', key: 'zipCode' },
                        { label: 'Regional Sector', key: 'country' }
                      ].map(({ label, key }) => (
                        <div key={key}>
                          <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3 italic">{label}</label>
                          <input type="text" value={addrForm[key]} onChange={(e) => setA(key, e.target.value)} className={inputCls} />
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-4 pt-10 border-t border-slate-100 dark:border-slate-800">
                      <button onClick={handleSaveAddr} disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white px-10 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-teal-500/20 transition-all active:scale-95 disabled:opacity-50">
                        {saving ? 'SYNCHRONIZING...' : 'COMMIT COORDINATES'}
                      </button>
                      <button onClick={() => setEditAddr(false)} className="bg-slate-50 dark:bg-slate-950 text-slate-400 px-10 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all border border-slate-100 dark:border-slate-800">
                        ABORT
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="px-10 pb-10">
                    <InfoRow label="Deployment Street" value={profile.address?.street} />
                    <InfoRow label="Node City" value={profile.address?.city} />
                    <InfoRow label="Node State" value={profile.address?.state} />
                    <InfoRow label="Regional Code" value={profile.address?.zipCode} />
                    <InfoRow label="Global Sector" value={profile.address?.country} />
                  </div>
                )}
              </div>
            </div>

            {/* Status Artifacts */}
            <div className="lg:col-span-4 space-y-8">
              <div className="bg-white dark:bg-slate-900 p-10 rounded-[3.5rem] shadow-sm border border-slate-200/50 dark:border-slate-800">
                <h3 className="text-[10px] font-black text-slate-950 dark:text-white mb-10 uppercase tracking-[0.3em] flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                  Capacity status
                </h3>
                <div className="space-y-6">
                  <div className="p-6 bg-slate-50 dark:bg-slate-950 rounded-3xl border border-slate-100 dark:border-slate-800 text-center">
                    <p className="text-4xl font-black text-teal-600 dark:text-teal-400 tracking-widest">{profile.totalBeds ?? 0}</p>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2 italic">Total Artifact Slots</p>
                  </div>
                  <div className="p-6 bg-emerald-50 dark:bg-emerald-900/10 rounded-3xl border border-emerald-100 dark:border-emerald-800/20 text-center">
                    <p className="text-4xl font-black text-emerald-600 dark:text-emerald-400 tracking-widest">{profile.availableBeds ?? 0}</p>
                    <p className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em] mt-2 italic">Active Vacancy</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-10 rounded-[3.5rem] shadow-sm border border-slate-200/50 dark:border-slate-800">
                <h3 className="text-[10px] font-black text-slate-950 dark:text-white mb-8 uppercase tracking-[0.3em] flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                  Node Reputation
                </h3>
                <div className="p-8 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-[2.5rem] text-center shadow-xl shadow-teal-500/20">
                  <p className="text-5xl font-black text-white tracking-tighter italic">{profile.rating != null ? profile.rating.toFixed(1) : '0.0'}</p>
                  <p className="text-[10px] font-black text-teal-100 uppercase tracking-widest mt-3">Registry Score / 5.0</p>
                  <div className="flex justify-center gap-1 mt-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} className={`text-sm ${i < (profile.rating ?? 0) ? 'text-white' : 'text-teal-800/40'}`}>★</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-10 rounded-[3.5rem] border border-slate-200/50 dark:border-slate-800">
                <h3 className="text-[10px] font-black text-slate-950 dark:text-white mb-8 uppercase tracking-[0.3em] flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                  Capabilities
                </h3>
                <div className="space-y-4">
                   <div className="flex justify-between items-center p-5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Emergency</span>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${profile.emergencyServices ? 'text-emerald-500' : 'text-rose-500'}`}>{profile.emergencyServices ? 'ENABLED' : 'DISABLED'}</span>
                  </div>
                  <div className="flex justify-between items-center p-5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Logistics</span>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${profile.ambulanceService ? 'text-emerald-500' : 'text-rose-500'}`}>{profile.ambulanceService ? 'ACTIVE' : 'OFFLINE'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default HospitalProfile;
