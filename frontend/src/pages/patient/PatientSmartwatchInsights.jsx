import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { useTheme } from '../../context/ThemeContext';
import { patientService } from '../../services/api';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar
} from 'recharts';

const providerOptions = [
  { value: 'apple_health', label: 'Apple Health', icon: '🍎' },
  { value: 'google_fit', label: 'Google Fit', icon: '🏃' },
  { value: 'fitbit', label: 'Fitbit', icon: '⌚' },
  { value: 'garmin', label: 'Garmin', icon: '🛰️' },
  { value: 'other', label: 'Other', icon: '📱' }
];

const PatientSmartwatchInsights = () => {
  const { theme } = useTheme();
  const [status, setStatus] = useState(null);
  const [metricsData, setMetricsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [days, setDays] = useState(7);
  const [message, setMessage] = useState('');

  const [form, setForm] = useState({
    provider: 'google_fit',
    deviceId: '',
    apiBaseUrl: '',
    apiToken: ''
  });

  const loadData = async (selectedDays = days) => {
    try {
      const [statusRes, metricsRes] = await Promise.all([
        patientService.getSmartwatchStatus(),
        patientService.getSmartwatchMetrics(selectedDays)
      ]);

      const statusData = statusRes?.data || null;
      const metricsPayload = metricsRes?.data || {};

      setStatus(statusData);
      setMetricsData(metricsPayload.metrics || []);

      if (statusData?.provider) {
        setForm((prev) => ({
          ...prev,
          provider: statusData.provider,
          deviceId: statusData.deviceId || '',
          apiBaseUrl: statusData.apiBaseUrl || ''
        }));
      }
    } catch {
      setMessage('Unsynchronized state detected. Check connectivity.');
    }
  };

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let interval;
    if (status?.isConnected) {
      interval = setInterval(() => {
        patientService.syncSmartwatch()
          .then(() => loadData(days))
          .catch(() => {});
      }, 30000);
    }
    return () => clearInterval(interval);
  }, [status?.isConnected, days]);

  const chartData = useMemo(() => {
    return metricsData.map((metric) => ({
      time: new Date(metric.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      heartRate: metric.heartRate,
      steps: metric.steps,
      calories: metric.calories,
      spo2: metric.spo2,
      sleepHours: metric.sleepHours
    }));
  }, [metricsData]);

  const latest = status?.latestMetrics || null;

  const updateForm = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const connectSmartwatch = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage('');

    try {
      const payload = { ...form };
      const response = await patientService.connectSmartwatch(payload);
      setMessage(response?.message || 'Device linked successfully.');
      await loadData(days);
      setForm((prev) => ({ ...prev, apiToken: '' }));
    } catch (error) {
      setMessage(error?.response?.data?.message || 'Handshake failed.');
    } finally {
      setBusy(false);
    }
  };

  const syncNow = async () => {
    setBusy(true);
    setMessage('');
    try {
      await patientService.syncSmartwatch();
      await loadData(days);
    } catch (error) {
      setMessage('Sync transmission error.');
    } finally {
      setBusy(false);
    }
  };

  const disconnectSmartwatch = async () => {
    setBusy(true);
    setMessage('');
    try {
      await patientService.disconnectSmartwatch();
      await loadData(days);
    } catch (error) {
      setMessage('De-registration failed.');
    } finally {
      setBusy(false);
    }
  };

  const changeDays = async (nextDays) => {
    setDays(nextDays);
    setBusy(true);
    try {
      await loadData(nextDays);
    } finally {
      setBusy(false);
    }
  };

  const MetricCard = ({ label, value, unit, icon, gradient, colorClass }) => (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-200/50 dark:border-slate-800 relative group overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1">
      <div className={`absolute -top-4 -right-4 w-20 h-20 ${gradient} opacity-5 dark:opacity-10 blur-xl rounded-full group-hover:scale-150 transition-transform`} />
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-4">
          <span className="text-2xl group-hover:scale-110 transition-transform block">{icon}</span>
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{unit}</span>
        </div>
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">{label}</p>
        <p className={`text-3xl font-black ${colorClass} dark:text-white`}>{value ?? '--'}</p>
      </div>
    </div>
  );

  return (
    <DashboardLayout title="Health Metrics">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
           <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
           <p className="mt-4 text-slate-500 font-medium tracking-tight">Accessing biometric streams...</p>
        </div>
      ) : (
        <div className="space-y-8 pb-20">
          {/* Header & Connection Section */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-[2.5rem] p-8 sm:p-12 shadow-sm overflow-hidden relative">
            <div className="absolute top-0 right-0 p-12 opacity-5 dark:opacity-10 pointer-events-none group-hover:scale-110 transition-transform">
               <span className="text-9xl">📡</span>
            </div>
            
            <div className="relative z-10 flex flex-col lg:flex-row gap-12">
               <div className="flex-1">
                  <div className="flex items-center gap-3 mb-6">
                    <div className={`w-3 h-3 rounded-full ${status?.isConnected ? 'bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-slate-300 dark:bg-slate-700'}`} />
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                      {status?.isConnected ? 'Terminal Connected' : 'Device Registration'}
                    </h2>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 max-w-md leading-relaxed mb-8 font-medium">
                    Bridge your clinical records with live smartwatch telemetry. We support direct API integration for precise health monitoring.
                  </p>
                  
                  {status?.isConnected && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl inline-flex items-center gap-4 border dark:border-slate-800">
                      <span className="text-2xl">{providerOptions.find(p => p.value === status.provider)?.icon}</span>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Source</p>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{providerOptions.find(p => p.value === status.provider)?.label}</p>
                      </div>
                      <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Last Update</p>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{status.lastSyncedAt ? new Date(status.lastSyncedAt).toLocaleTimeString() : 'Pending'}</p>
                      </div>
                    </div>
                  )}
               </div>

               <div className="lg:w-[400px] space-y-4">
                  <form onSubmit={connectSmartwatch} className="grid grid-cols-1 gap-4">
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Protocol</label>
                          <select
                            value={form.provider}
                            onChange={(e) => updateForm('provider', e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 ring-indigo-500/20"
                          >
                            {providerOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                       </div>
                       <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Static ID</label>
                          <input
                            value={form.deviceId}
                            onChange={(e) => updateForm('deviceId', e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 ring-indigo-500/20"
                            placeholder="watch-xyz"
                          />
                       </div>
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Authentication Token</label>
                       <input
                         type="password"
                         value={form.apiToken}
                         onChange={(e) => updateForm('apiToken', e.target.value)}
                         className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 ring-indigo-500/20"
                         placeholder="••••••••••••••••"
                       />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button type="submit" disabled={busy} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 active:scale-95 transition-all disabled:opacity-50">
                        {status?.isConnected ? 'Reconfigure' : 'Initiate'}
                      </button>
                      {status?.isConnected && (
                         <button type="button" onClick={syncNow} disabled={busy} className="p-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50">
                            🔄
                         </button>
                      )}
                      {status?.isConnected && (
                         <button type="button" onClick={disconnectSmartwatch} disabled={busy} className="p-3 bg-red-500 hover:bg-red-600 text-white rounded-xl shadow-lg shadow-red-500/20 active:scale-95 transition-all disabled:opacity-50">
                            ✖
                         </button>
                      )}
                    </div>
                  </form>
                  {message && <p className={`text-[10px] font-bold text-center uppercase tracking-widest ${message.includes('error') || message.includes('fail') ? 'text-red-500' : 'text-emerald-500'}`}>{message}</p>}
               </div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            <MetricCard label="Heart Rate" value={latest?.heartRate} unit="bpm" icon="💓" gradient="bg-red-500" colorClass="text-red-500" />
            <MetricCard label="Cardio Load" value={latest?.spo2} unit="spO2%" icon="🫁" gradient="bg-emerald-500" colorClass="text-emerald-500" />
            <MetricCard label="Movement" value={latest?.steps} unit="steps" icon="👟" gradient="bg-indigo-500" colorClass="text-indigo-500" />
            <MetricCard label="Energy Ex." value={latest?.calories} unit="kcal" icon="🔥" gradient="bg-orange-500" colorClass="text-orange-500" />
            <MetricCard label="Resurrection" value={latest?.sleepHours} unit="hrs" icon="🌙" gradient="bg-purple-500" colorClass="text-purple-500" />
          </div>

          {/* Charts Area */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-[2.5rem] p-8 sm:p-12 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-12">
               <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Timeline Analytics</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Biometric progression over interval</p>
               </div>
               <select
                 value={days}
                 onChange={(e) => changeDays(Number(e.target.value))}
                 className="bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-3 text-xs font-black text-slate-800 dark:text-slate-200 outline-none focus:ring-2 ring-indigo-500/20"
                 disabled={busy}
               >
                 <option value={7}>Diagnostic Window: 7D</option>
                 <option value={14}>Diagnostic Window: 14D</option>
                 <option value={30}>Diagnostic Window: 30D</option>
               </select>
            </div>

            {chartData.length > 0 ? (
              <div className="space-y-16">
                 <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                       <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#1e293b' : '#f1f5f9'} />
                          <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: theme === 'dark' ? '#64748b' : '#94a3b8' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: theme === 'dark' ? '#64748b' : '#94a3b8' }} />
                          <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', backgroundColor: theme === 'dark' ? '#0f172a' : '#fff' }} />
                          <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                          <Line type="smooth" dataKey="heartRate" stroke="#ef4444" strokeWidth={4} dot={false} name="Pulse" animationDuration={1500} />
                          <Line type="smooth" dataKey="spo2" stroke="#10b981" strokeWidth={4} dot={false} name="Oxygenation" animationDuration={2000} />
                       </LineChart>
                    </ResponsiveContainer>
                 </div>
                 <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#1e293b' : '#f1f5f9'} />
                          <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: theme === 'dark' ? '#64748b' : '#94a3b8' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: theme === 'dark' ? '#64748b' : '#94a3b8' }} />
                          <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', backgroundColor: theme === 'dark' ? '#0f172a' : '#fff' }} />
                          <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                          <Bar dataKey="steps" fill="#6366f1" radius={[10, 10, 0, 0]} name="Movement / Steps" />
                          <Bar dataKey="calories" fill="#f97316" radius={[10, 10, 0, 0]} name="Energy Burn" />
                       </BarChart>
                    </ResponsiveContainer>
                 </div>
              </div>
            ) : (
              <div className="py-24 text-center">
                 <p className="text-slate-400 dark:text-slate-600 font-bold text-sm">Synchronous stream not found. Please initiate device handshake.</p>
              </div>
            )}
          </div>

          {/* Audit Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-[2.5rem] p-8 sm:p-12 shadow-sm">
             <h3 className="text-xl font-black text-slate-900 dark:text-white mb-8 tracking-tight">Raw Feed Archive</h3>
             <div className="overflow-x-auto -mx-8 sm:mx-0">
                <table className="w-full text-left">
                   <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                         <th className="py-4 px-8 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Temporal Marker</th>
                         <th className="py-4 px-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Pulse</th>
                         <th className="py-4 px-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Motion</th>
                         <th className="py-4 px-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Saturation</th>
                         <th className="py-4 px-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Sleep</th>
                      </tr>
                   </thead>
                   <tbody>
                      {metricsData.slice(0, 10).map((m, i) => (
                         <tr key={i} className="border-b dark:border-slate-800 last:border-0 group hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                            <td className="py-5 px-8 text-xs font-bold text-slate-900 dark:text-slate-300">
                               {new Date(m.recordedAt).toLocaleDateString()} · {new Date(m.recordedAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                            </td>
                            <td className="py-5 px-4 text-xs font-black text-red-500 dark:text-red-400 text-center">{m.heartRate || '--'}</td>
                            <td className="py-5 px-4 text-xs font-black text-indigo-500 dark:text-indigo-400 text-center">{m.steps || '--'}</td>
                            <td className="py-5 px-4 text-xs font-black text-emerald-500 dark:text-emerald-400 text-center">{m.spo2 ? `${m.spo2}%` : '--'}</td>
                            <td className="py-5 px-4 text-xs font-black text-purple-500 dark:text-purple-400 text-right pr-8">{m.sleepHours ? `${m.sleepHours}h` : '--'}</td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default PatientSmartwatchInsights;
