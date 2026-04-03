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

  const tooltipStyle = {
    borderRadius: '12px',
    border: 'none',
    boxShadow: '0 10px 30px -5px rgb(0 0 0 / 0.15)',
    backgroundColor: theme === 'dark' ? '#1e293b' : '#fff',
    padding: '12px 16px',
    fontSize: '12px'
  };

  const axisStyle = { fontSize: 11, fontWeight: 500, fill: theme === 'dark' ? '#64748b' : '#94a3b8' };
  const gridStroke = theme === 'dark' ? '#1e293b' : '#f1f5f9';

  const ChartCard = ({ title, subtitle, children, icon }) => (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800 transition-all hover-lift group">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">{icon}</div>
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">{subtitle || 'Trend over visits'}</p>
        </div>
      </div>
      <div className="h-[280px] w-full">{children}</div>
    </div>
  );

  return (
    <DashboardLayout title="Health Analytics">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm text-slate-400 font-medium">Loading analytics...</p>
        </div>
      ) : chartData.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-16 rounded-2xl border border-slate-200/60 dark:border-slate-800 text-center max-w-lg mx-auto animate-fadeIn">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-5">📉</div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">No Data Yet</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">Health metrics will appear here once recorded during medical consultations.</p>
        </div>
      ) : (
        <div className="space-y-6 pb-12 animate-fadeIn">
          <div className="flex items-center gap-2 px-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500">Analysis based on {records.length} clinical records</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 stagger-children">
            {hasData('bloodSugar') && (
              <ChartCard title="Blood Sugar" subtitle="Glucose levels (mg/dL)" icon="🩸">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={axisStyle} />
                    <YAxis axisLine={false} tickLine={false} tick={axisStyle} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="bloodSugar" stroke="#10b981" strokeWidth={3} dot={{ r: 3, fill: '#10b981' }} activeDot={{ r: 5 }} name="mg/dL" connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {(hasData('systolic') || hasData('diastolic')) && (
              <ChartCard title="Blood Pressure" subtitle="Systolic & Diastolic (mmHg)" icon="🫀">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={axisStyle} />
                    <YAxis axisLine={false} tickLine={false} tick={axisStyle} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '16px', fontSize: '11px', fontWeight: 600 }} />
                    <Line type="monotone" dataKey="systolic" stroke="#ef4444" strokeWidth={3} dot={{ r: 3, fill: '#ef4444' }} name="Systolic" connectNulls />
                    <Line type="monotone" dataKey="diastolic" stroke="#f97316" strokeWidth={3} dot={{ r: 3, fill: '#f97316' }} name="Diastolic" connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {hasData('thyroidTSH') && (
              <ChartCard title="Thyroid TSH" subtitle="mIU/L levels" icon="🦋">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={axisStyle} />
                    <YAxis axisLine={false} tickLine={false} tick={axisStyle} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="thyroidTSH" stroke="#3b82f6" strokeWidth={3} dot={{ r: 3, fill: '#3b82f6' }} name="mIU/L" connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {hasData('heartRate') && (
              <ChartCard title="Heart Rate" subtitle="Beats per minute" icon="💓">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={axisStyle} />
                    <YAxis axisLine={false} tickLine={false} tick={axisStyle} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="heartRate" stroke="#f43f5e" strokeWidth={3} dot={{ r: 3, fill: '#f43f5e' }} name="bpm" connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {hasData('weight') && (
              <ChartCard title="Weight" subtitle="Body weight (kg)" icon="⚖️">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={axisStyle} />
                    <YAxis axisLine={false} tickLine={false} tick={axisStyle} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="weight" stroke="#f59e0b" strokeWidth={3} dot={{ r: 3, fill: '#f59e0b' }} name="kg" connectNulls />
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
