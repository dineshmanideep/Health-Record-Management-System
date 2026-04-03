import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { useTheme } from '../../context/ThemeContext';
import { patientService } from '../../services/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine
} from 'recharts';

const PatientHealthAnalytics = () => {
  const { theme } = useTheme();
  const [reportAnalytics, setReportAnalytics] = useState([]);
  const [selectedMetricByReport, setSelectedMetricByReport] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    patientService.getHealthAnalytics()
      .then((res) => {
        if (!res.success) return;
        const payload = res.data;
        setReportAnalytics(Array.isArray(payload) ? [] : (payload?.reportAnalytics || []));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const formatReportTag = (tag) =>
    String(tag || 'General Report')
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

  const statusColor = (status) => {
    if (status === 'high' || status === 'low') return '#ef4444';
    if (status === 'normal') return '#10b981';
    return '#6366f1';
  };

  const referenceLineColor = '#f59e0b';
  const reportMarkerColor = theme === 'dark' ? '#334155' : '#e2e8f0';

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

  return (
    <DashboardLayout title="Health Analytics">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm text-slate-400 font-medium">Loading analytics...</p>
        </div>
      ) :  reportAnalytics.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-16 rounded-2xl border border-slate-200/60 dark:border-slate-800 text-center max-w-lg mx-auto animate-fadeIn">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-5">📉</div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">No Data Yet</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">Health metrics will appear here once recorded during medical consultations.</p>
        </div>
      ) : (
        <div className="space-y-6 pb-12 animate-fadeIn">
          <div className="flex items-center gap-2 px-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
              {`Analysis based on ${reportAnalytics.length} parsed test report groups`}
            </p>
          </div>

        

          {reportAnalytics.length > 0 && (
            <div className="mt-10 space-y-8">
              <div className="flex items-center gap-2 px-1">
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                <p className="text-xs font-medium text-slate-400 dark:text-slate-500">Parsed report analytics from uploaded PDF test reports</p>
              </div>

              {reportAnalytics.map((group, groupIndex) => (
                <div key={`${group.reportTag}-${groupIndex}`} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">{formatReportTag(group.reportTag)}</h3>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-5">Grouped by report type</p>

                  {group.metricSeries?.length ? (
                    (() => {
                      const reportKey = `${group.reportTag}-${groupIndex}`;
                      const selectedAttr = selectedMetricByReport[reportKey] || group.metricSeries[0].attribute;
                      const selectedSeries = group.metricSeries.find((series) => series.attribute === selectedAttr) || group.metricSeries[0];

                      const graphData = (selectedSeries.points || []).map((point) => ({
                        date: new Date(point.date).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }),
                        value: point.value,
                        referenceMin: point.referenceMin,
                        referenceMax: point.referenceMax,
                        status: point.status,
                        reference: point.reference,
                        sourceLabel: point.sourceLabel
                      }));

                      return (
                        <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-xl border border-slate-200/60 dark:border-slate-800">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                            <div>
                              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">{selectedSeries.attribute}</h4>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">Unit: {selectedSeries.unit || '-'}</p>
                            </div>
                            <div className="min-w-55">
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Select Attribute</label>
                              <select
                                value={selectedSeries.attribute}
                                onChange={(e) => setSelectedMetricByReport((prev) => ({ ...prev, [reportKey]: e.target.value }))}
                                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200"
                              >
                                {group.metricSeries.map((series) => (
                                  <option key={series.attribute} value={series.attribute}>{series.attribute}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="h-70 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={graphData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={axisStyle} />
                                <YAxis axisLine={false} tickLine={false} tick={axisStyle} />
                                <Tooltip
                                  contentStyle={tooltipStyle}
                                  labelFormatter={(label) => `Recorded: ${label}`}
                                  formatter={(value, name, props) => {
                                    const ref = props?.payload?.reference;
                                    const source = props?.payload?.sourceLabel;
                                    return [
                                      `${value}${selectedSeries.unit ? ` ${selectedSeries.unit}` : ''}${ref ? ` (Ref: ${ref})` : ''}${source ? ` • ${source}` : ''}`,
                                      name
                                    ];
                                  }}
                                />
                                <Legend iconType="circle" wrapperStyle={{ paddingTop: '12px', fontSize: '11px', fontWeight: 600 }} />

                                {graphData.map((entry, index) => (
                                  <ReferenceLine
                                    key={`${entry.date}-${index}`}
                                    x={entry.date}
                                    stroke={reportMarkerColor}
                                    strokeDasharray="2 6"
                                    strokeWidth={1}
                                  />
                                ))}

                                <Line
                                  type="monotone"
                                  dataKey="value"
                                  stroke="#6366f1"
                                  strokeWidth={3}
                                  dot={(props) => (
                                    <circle
                                      cx={props.cx}
                                      cy={props.cy}
                                      r={4}
                                      fill={statusColor(props?.payload?.status)}
                                      stroke="#fff"
                                      strokeWidth={1}
                                    />
                                  )}
                                  activeDot={{ r: 6 }}
                                  name={`${selectedSeries.attribute} Value`}
                                  connectNulls
                                />

                                <Line
                                  type="monotone"
                                  dataKey="referenceMin"
                                  stroke={referenceLineColor}
                                  strokeDasharray="6 6"
                                  strokeWidth={2}
                                  dot={false}
                                  name="Reference Min"
                                  connectNulls
                                />

                                <Line
                                  type="monotone"
                                  dataKey="referenceMax"
                                  stroke={referenceLineColor}
                                  strokeDasharray="3 6"
                                  strokeWidth={2}
                                  dot={false}
                                  name="Reference Max"
                                  connectNulls
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400">No measurable attributes found for this report type.</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
};

export default PatientHealthAnalytics;
