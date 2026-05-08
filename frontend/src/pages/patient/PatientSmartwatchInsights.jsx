import { useEffect, useMemo, useState, useCallback } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { patientService } from '../../services/api';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar
} from 'recharts';

const PatientSmartwatchInsights = () => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [status, setStatus] = useState(null);
  const [metricsData, setMetricsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [days, setDays] = useState(7);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ provider: 'google_fit', deviceId: '', apiBaseUrl: '', apiToken: '' });

  const providerOptions = [
    { value: 'apple_health', label: 'Apple Health', icon: '🍎' },
    { value: 'google_fit', label: 'Google Fit', icon: '🏃' },
    { value: 'fitbit', label: 'Fitbit', icon: '⌚' },
    { value: 'garmin', label: 'Garmin', icon: '🛰️' },
    { value: 'other', label: t({ en: 'Other', hi: 'अन्य' }), icon: '📱' }
  ];

  const loadData = useCallback(async (selectedDays = days) => {
    try {
      const [statusRes, metricsRes] = await Promise.all([
        patientService.getSmartwatchStatus(), patientService.getSmartwatchMetrics(selectedDays)
      ]);
      setStatus(statusRes?.data || null);
      setMetricsData(metricsRes?.data?.metrics || []);
      if (statusRes?.data?.provider) {
        setForm((prev) => ({ ...prev, provider: statusRes.data.provider, deviceId: statusRes.data.deviceId || '', apiBaseUrl: statusRes.data.apiBaseUrl || '' }));
      }
    } catch { setMessage(t({ en: 'Failed to load data.', hi: 'डेटा लोड नहीं हो सका।' })); }
  }, [days]);

  useEffect(() => { loadData().finally(() => setLoading(false)); }, [loadData]);
  useEffect(() => {
    let interval;
    if (status?.isConnected) {
      interval = setInterval(() => { patientService.syncSmartwatch().then(() => loadData(days)).catch(() => {}); }, 30000);
    }
    return () => clearInterval(interval);
  }, [status?.isConnected, days, loadData]);

  const chartData = useMemo(() => metricsData.map((m) => ({
    time: new Date(m.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    heartRate: m.heartRate, steps: m.steps, calories: m.calories, spo2: m.spo2, sleepHours: m.sleepHours
  })), [metricsData]);

  const latest = status?.latestMetrics || null;
  const updateForm = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const connectSmartwatch = async (event) => {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const response = await patientService.connectSmartwatch({ ...form });
      setMessage(response?.message || t({ en: 'Device linked!', hi: 'डिवाइस जुड़ गया!' }));
      await loadData(days);
      setForm((prev) => ({ ...prev, apiToken: '' }));
    } catch (error) { setMessage(error?.response?.data?.message || t({ en: 'Connection failed.', hi: 'कनेक्शन नहीं हो सका।' })); }
    finally { setBusy(false); }
  };

  const syncNow = async () => {
    setBusy(true); setMessage('');
    try { await patientService.syncSmartwatch(); await loadData(days); }
    catch { setMessage(t({ en: 'Sync failed.', hi: 'सिंक नहीं हो पाया।' })); }
    finally { setBusy(false); }
  };

  const disconnectSmartwatch = async () => {
    setBusy(true); setMessage('');
    try { await patientService.disconnectSmartwatch(); await loadData(days); }
    catch { setMessage(t({ en: 'Disconnect failed.', hi: 'डिस्कनेक्ट नहीं हो सका।' })); }
    finally { setBusy(false); }
  };

  const changeDays = async (nextDays) => {
    setDays(nextDays); setBusy(true);
    try { await loadData(nextDays); } finally { setBusy(false); }
  };

  const tooltipStyle = { borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px -5px rgb(0 0 0 / 0.15)', backgroundColor: theme === 'dark' ? '#1e293b' : '#fff', padding: '12px 16px', fontSize: '12px' };
  const axisStyle = { fontSize: 11, fontWeight: 500, fill: theme === 'dark' ? '#64748b' : '#94a3b8' };
  const gridStroke = theme === 'dark' ? '#1e293b' : '#f1f5f9';

  const MetricCard = ({ label, value, unit, icon, color }) => (
    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 relative group overflow-hidden hover-lift transition-all">
      <div className={`absolute -top-4 -right-4 w-16 h-16 ${color} opacity-10 dark:opacity-15 blur-xl rounded-full group-hover:scale-150 transition-transform duration-500`} />
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-3">
          <span className="text-xl group-hover:scale-110 transition-transform block">{icon}</span>
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{unit}</span>
        </div>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{label}</p>
        <p className={`text-2xl font-bold text-slate-900 dark:text-white`}>{value ?? '--'}</p>
      </div>
    </div>
  );

  const InputField = ({ label, value, onChange, type = 'text', placeholder }) => (
    <div>
      <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">{label}</label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all" />
    </div>
  );

  return (
    <DashboardLayout title={t({ en: 'Smartwatch Insights', hi: 'स्मार्टवॉच जानकारी' })}>
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm text-slate-400 font-medium">{t({ en: 'Loading health metrics...', hi: 'हेल्थ डेटा लोड हो रहा है...' })}</p>
        </div>
      ) : (
        <div className="space-y-6 pb-12 animate-fadeIn">
          {/* Connection Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 overflow-hidden relative">
            <div className="flex flex-col lg:flex-row gap-8">
              <div className="flex-1">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className={`w-2.5 h-2.5 rounded-full ${status?.isConnected ? 'bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50' : 'bg-slate-300 dark:bg-slate-700'}`} />
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                    {status?.isConnected ? t({ en: 'Device Connected', hi: 'डिवाइस जुड़ा है' }) : t({ en: 'Connect Your Device', hi: 'अपना डिवाइस जोड़ें' })}
                  </h2>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md leading-relaxed mb-5">
                  {t({ en: 'Link your smartwatch to get real-time health telemetry and insights.', hi: 'रियल-टाइम हेल्थ डेटा के लिए अपनी स्मार्टवॉच जोड़ें।' })}
                </p>
                
                {status?.isConnected && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl inline-flex items-center gap-3 border border-slate-100 dark:border-slate-800">
                    <span className="text-xl">{providerOptions.find(p => p.value === status.provider)?.icon}</span>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{t({ en: 'Source', hi: 'स्रोत' })}</p>
                      <p className="text-xs font-semibold text-slate-800 dark:text-white">{providerOptions.find(p => p.value === status.provider)?.label}</p>
                    </div>
                    <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{t({ en: 'Last Sync', hi: 'आख़िरी सिंक' })}</p>
                      <p className="text-xs font-semibold text-slate-800 dark:text-white">{status.lastSyncedAt ? new Date(status.lastSyncedAt).toLocaleTimeString() : t({ en: 'Pending', hi: 'लंबित' })}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="lg:w-[380px]">
                <form onSubmit={connectSmartwatch} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">{t({ en: 'Provider', hi: 'प्रोवाइडर' })}</label>
                      <select value={form.provider} onChange={(e) => updateForm('provider', e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all">
                        {providerOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                    </div>
                    <InputField label={t({ en: 'Device ID', hi: 'डिवाइस आईडी' })} value={form.deviceId} onChange={(e) => updateForm('deviceId', e.target.value)} placeholder="watch-xyz" />
                  </div>
                  <InputField label={t({ en: 'API Token', hi: 'API टोकन' })} value={form.apiToken} onChange={(e) => updateForm('apiToken', e.target.value)} type="password" placeholder="••••••••" />
                  <div className="flex gap-2 pt-1">
                    <button type="submit" disabled={busy} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md active:scale-95 transition-all disabled:opacity-50">
                      {status?.isConnected ? t({ en: 'Reconfigure', hi: 'फिर से सेट करें' }) : t({ en: 'Connect', hi: 'कनेक्ट करें' })}
                    </button>
                    {status?.isConnected && (
                      <>
                        <button type="button" onClick={syncNow} disabled={busy} className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md active:scale-95 transition-all disabled:opacity-50">🔄</button>
                        <button type="button" onClick={disconnectSmartwatch} disabled={busy} className="py-2.5 px-3 bg-red-500 hover:bg-red-600 text-white rounded-xl shadow-md active:scale-95 transition-all disabled:opacity-50">✖</button>
                      </>
                    )}
                  </div>
                </form>
                {message && <p className={`text-[11px] font-medium text-center mt-3 ${message.includes('fail') || message.includes('error') ? 'text-red-500' : 'text-emerald-500'}`}>{message}</p>}
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <MetricCard label={t({ en: 'Heart Rate', hi: 'हार्ट रेट' })} value={latest?.heartRate} unit="bpm" icon="💓" color="bg-red-500" />
            <MetricCard label="SpO2" value={latest?.spo2} unit="%" icon="🫁" color="bg-emerald-500" />
            <MetricCard label={t({ en: 'Steps', hi: 'कदम' })} value={latest?.steps} unit={t({ en: 'steps', hi: 'steps' })} icon="👟" color="bg-indigo-500" />
            <MetricCard label={t({ en: 'Calories', hi: 'कैलोरी' })} value={latest?.calories} unit="kcal" icon="🔥" color="bg-orange-500" />
            <MetricCard label={t({ en: 'Sleep', hi: 'नींद' })} value={latest?.sleepHours} unit={t({ en: 'hrs', hi: 'hrs' })} icon="🌙" color="bg-purple-500" />
          </div>

          {/* Charts */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-8">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{t({ en: 'Timeline Analytics', hi: 'टाइमलाइन विश्लेषण' })}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{t({ en: 'Health metrics over time', hi: 'समय के साथ हेल्थ डेटा' })}</p>
              </div>
              <select value={days} onChange={(e) => changeDays(Number(e.target.value))} disabled={busy}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all">
                <option value={7}>{t({ en: 'Last 7 Days', hi: 'पिछले 7 दिन' })}</option>
                <option value={14}>{t({ en: 'Last 14 Days', hi: 'पिछले 14 दिन' })}</option>
                <option value={30}>{t({ en: 'Last 30 Days', hi: 'पिछले 30 दिन' })}</option>
              </select>
            </div>

            {chartData.length > 0 ? (
              <div className="space-y-10">
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                      <XAxis dataKey="time" axisLine={false} tickLine={false} tick={axisStyle} />
                      <YAxis axisLine={false} tickLine={false} tick={axisStyle} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend iconType="circle" wrapperStyle={{ paddingTop: '16px', fontSize: '11px', fontWeight: 600 }} />
                      <Line type="monotone" dataKey="heartRate" stroke="#ef4444" strokeWidth={3} dot={false} name="Heart Rate" animationDuration={1500} />
                      <Line type="monotone" dataKey="spo2" stroke="#10b981" strokeWidth={3} dot={false} name="SpO2" animationDuration={2000} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                      <XAxis dataKey="time" axisLine={false} tickLine={false} tick={axisStyle} />
                      <YAxis axisLine={false} tickLine={false} tick={axisStyle} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend iconType="circle" wrapperStyle={{ paddingTop: '16px', fontSize: '11px', fontWeight: 600 }} />
                      <Bar dataKey="steps" fill="#6366f1" radius={[6, 6, 0, 0]} name="Steps" />
                      <Bar dataKey="calories" fill="#f97316" radius={[6, 6, 0, 0]} name="Calories" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center">
                <p className="text-sm text-slate-400">{t({ en: 'No data available. Connect your device to start tracking.', hi: 'डेटा उपलब्ध नहीं है। ट्रैकिंग के लिए डिवाइस जोड़ें।' })}</p>
              </div>
            )}
          </div>

          {/* Data Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-5">{t({ en: 'Raw Data Feed', hi: 'रॉ डेटा' })}</h3>
            <div className="overflow-x-auto -mx-5 sm:-mx-6">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50">
                    <th className="py-3 px-5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{t({ en: 'Time', hi: 'समय' })}</th>
                    <th className="py-3 px-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center">{t({ en: 'Heart Rate', hi: 'हार्ट रेट' })}</th>
                    <th className="py-3 px-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center">{t({ en: 'Steps', hi: 'कदम' })}</th>
                    <th className="py-3 px-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center">SpO2</th>
                    <th className="py-3 px-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-right pr-5">{t({ en: 'Sleep', hi: 'नींद' })}</th>
                  </tr>
                </thead>
                <tbody>
                  {metricsData.slice(0, 10).map((m, i) => (
                    <tr key={i} className="border-b border-slate-50 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-4 px-5 text-xs font-medium text-slate-800 dark:text-slate-300">
                        {new Date(m.recordedAt).toLocaleDateString()} · {new Date(m.recordedAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                      </td>
                      <td className="py-4 px-4 text-xs font-bold text-red-500 text-center">{m.heartRate || '--'}</td>
                      <td className="py-4 px-4 text-xs font-bold text-indigo-500 text-center">{m.steps || '--'}</td>
                      <td className="py-4 px-4 text-xs font-bold text-emerald-500 text-center">{m.spo2 ? `${m.spo2}%` : '--'}</td>
                      <td className="py-4 px-4 text-xs font-bold text-purple-500 text-right pr-5">{m.sleepHours ? `${m.sleepHours}h` : '--'}</td>
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
