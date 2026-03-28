import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { useTheme } from '../../context/ThemeContext';
import { patientService } from '../../services/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const PatientHealthAnalytics = () => {
  const { theme } = useTheme();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    patientService.getHealthAnalytics()
      .then((res) => { if (res.success) setRecords(res.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const chartData = records.map((r) => ({
    date: new Date(r.visitDate).toLocaleDateString([], { month: 'short', day: 'numeric' }),
    bloodSugar: r.healthMetrics?.bloodSugar ?? null,
    systolic: r.healthMetrics?.bloodPressureSystolic ?? null,
    diastolic: r.healthMetrics?.bloodPressureDiastolic ?? null,
    thyroidTSH: r.healthMetrics?.thyroidTSH ?? null,
    heartRate: r.healthMetrics?.heartRate ?? null,
    weight: r.healthMetrics?.weight ?? null,
  }));

  const hasData = (key) => chartData.some((d) => d[key] != null);

  const ChartCard = ({ title, children, color, icon }) => (
    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-sm border border-slate-200/50 dark:border-slate-800 transition-all hover:shadow-xl group">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
           <div className={`w-12 h-12 rounded-2xl bg-${color}-500/10 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform`}>
              {icon}
           </div>
           <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{title}</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Historical biometric trend</p>
           </div>
        </div>
      </div>
      <div className="h-[300px] w-full">
        {children}
      </div>
    </div>
  );

  return (
    <DashboardLayout title="Performance Analytics">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 animate-pulse">
           <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
           <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Processing health clusters...</p>
        </div>
      ) : chartData.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-20 rounded-[3rem] shadow-sm border border-slate-200/50 dark:border-slate-800 text-center max-w-2xl mx-auto">
          <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-[2rem] flex items-center justify-center text-5xl mx-auto mb-8 shadow-inner">📉</div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">Telemetry Stream Empty</h2>
          <p className="text-slate-500 dark:text-slate-400 leading-relaxed font-medium">Biometric data will materialize here once clinical markers are recorded during official medical consultations.</p>
        </div>
      ) : (
        <div className="space-y-8 pb-12">
          <div className="flex items-center gap-3 px-2">
             <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aggregate Analysis based on {records.length} clinical points</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Blood Sugar */}
            {hasData('bloodSugar') && (
              <ChartCard title="Glucose Levels" color="emerald" icon="🩸">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#1e293b' : '#f1f5f9'} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: theme === 'dark' ? '#64748b' : '#94a3b8' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: theme === 'dark' ? '#64748b' : '#94a3b8' }} />
                    <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', backgroundColor: theme === 'dark' ? '#0f172a' : '#fff' }} />
                    <Line type="monotone" dataKey="bloodSugar" stroke="#10b981" strokeWidth={4} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} name="mg/dL" connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {/* Blood Pressure */}
            {(hasData('systolic') || hasData('diastolic')) && (
              <ChartCard title="Blood Pressure" color="red" icon="🫀">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#1e293b' : '#f1f5f9'} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: theme === 'dark' ? '#64748b' : '#94a3b8' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: theme === 'dark' ? '#64748b' : '#94a3b8' }} />
                    <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', backgroundColor: theme === 'dark' ? '#0f172a' : '#fff' }} />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }} />
                    <Line type="monotone" dataKey="systolic" stroke="#ef4444" strokeWidth={4} dot={{ r: 4, fill: '#ef4444' }} name="Systolic" connectNulls />
                    <Line type="monotone" dataKey="diastolic" stroke="#f97316" strokeWidth={4} dot={{ r: 4, fill: '#f97316' }} name="Diastolic" connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {/* Thyroid */}
            {hasData('thyroidTSH') && (
              <ChartCard title="Endocrine / TSH" color="blue" icon="🦋">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#1e293b' : '#f1f5f9'} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: theme === 'dark' ? '#64748b' : '#94a3b8' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: theme === 'dark' ? '#64748b' : '#94a3b8' }} />
                    <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', backgroundColor: theme === 'dark' ? '#0f172a' : '#fff' }} />
                    <Line type="monotone" dataKey="thyroidTSH" stroke="#3b82f6" strokeWidth={4} dot={{ r: 4, fill: '#3b82f6' }} name="mIU/L" connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {/* Heart Rate */}
            {hasData('heartRate') && (
              <ChartCard title="Pulse Rate" color="rose" icon="💓">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#1e293b' : '#f1f5f9'} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: theme === 'dark' ? '#64748b' : '#94a3b8' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: theme === 'dark' ? '#64748b' : '#94a3b8' }} />
                    <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', backgroundColor: theme === 'dark' ? '#0f172a' : '#fff' }} />
                    <Line type="monotone" dataKey="heartRate" stroke="#f43f5e" strokeWidth={4} dot={{ r: 4, fill: '#f43f5e' }} name="bpm" connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {/* Weight */}
            {hasData('weight') && (
              <ChartCard title="Body Mass Index" color="amber" icon="⚖️">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#1e293b' : '#f1f5f9'} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: theme === 'dark' ? '#64748b' : '#94a3b8' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: theme === 'dark' ? '#64748b' : '#94a3b8' }} />
                    <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', backgroundColor: theme === 'dark' ? '#0f172a' : '#fff' }} />
                    <Line type="monotone" dataKey="weight" stroke="#f59e0b" strokeWidth={4} dot={{ r: 4, fill: '#f59e0b' }} name="kg" connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default PatientHealthAnalytics;
