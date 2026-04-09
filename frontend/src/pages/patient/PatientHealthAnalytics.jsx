import { useEffect, useRef, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { useTheme } from '../../context/ThemeContext';
import { useAccessibility } from '../../context/useAccessibility';
import { patientService } from '../../services/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine
} from 'recharts';

const AutoSizedChart = ({ height = 320, children }) => {
  const containerRef = useRef(null);
  const [size, setSize] = useState({ width: 0, height });

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return undefined;

    const updateSize = () => {
      const nextWidth = Math.floor(element.getBoundingClientRect().width);
      if (nextWidth > 0) {
        setSize({ width: nextWidth, height });
      }
    };

    updateSize();

    const observer = new ResizeObserver(() => updateSize());
    observer.observe(element);
    window.addEventListener('resize', updateSize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, [height]);

  return (
    <div ref={containerRef} className="w-full min-w-0" style={{ minHeight: `${height}px` }}>
      {size.width > 0 ? children(size) : <div style={{ height: `${height}px` }} />}
    </div>
  );
};

const PatientHealthAnalytics = () => {
  const { theme } = useTheme();
  const { profile } = useAccessibility();
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
    return '#f59e0b';
  };

  const referenceLineColor = '#f59e0b';
  const reportMarkerColor = theme === 'dark' ? '#334155' : '#e2e8f0';

  const statusBadge = (status) => {
    if (status === 'high') return { label: 'High ▲', tone: 'text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30' };
    if (status === 'low') return { label: 'Low ▼', tone: 'text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30' };
    if (status === 'normal') return { label: 'Normal ✓', tone: 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/30' };
    return { label: 'Needs Review', tone: 'text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30' };
  };

  const explainStatus = (attribute, status, reference) => {
    if (status === 'high') return `${attribute} is above the healthy range${reference ? ` (${reference})` : ''}.`;
    if (status === 'low') return `${attribute} is below the healthy range${reference ? ` (${reference})` : ''}.`;
    if (status === 'normal') return `${attribute} is within the healthy range${reference ? ` (${reference})` : ''}.`;
    return `No clear range match for ${attribute}${reference ? ` (reference: ${reference})` : ''}.`;
  };

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
                        date: new Date(point.date).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        }),
                        value: point.value,
                        referenceMin: point.referenceMin,
                        referenceMax: point.referenceMax,
                        status: point.status,
                        reference: point.reference,
                        sourceLabel: point.sourceLabel
                      }));

                      const latestPoint = graphData.length ? graphData[graphData.length - 1] : null;
                      const latestStatus = statusBadge(latestPoint?.status);
                      const abnormalPoints = graphData.filter((point) => point.status === 'high' || point.status === 'low');

                      const readableTrend = (() => {
                        if (graphData.length < 2) return 'Not enough data points to describe trend yet.';
                        const first = graphData[0].value;
                        const last = graphData[graphData.length - 1].value;
                        if (last > first) return 'Overall trend is increasing.';
                        if (last < first) return 'Overall trend is decreasing.';
                        return 'Overall trend is stable.';
                      })();

                      return (
                        <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-xl border border-slate-200/60 dark:border-slate-800">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                            <div>
                              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">{selectedSeries.attribute}</h4>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">Unit: {selectedSeries.unit || '-'}</p>
                              {latestPoint && (
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  <span className={`text-[10px] font-semibold px-2 py-1 rounded-md ${latestStatus.tone}`}>{latestStatus.label}</span>
                                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                    {explainStatus(selectedSeries.attribute, latestPoint.status, latestPoint.reference)}
                                  </span>
                                </div>
                              )}
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

                          <AutoSizedChart height={340}>
                            {({ width, height }) => (
                              <LineChart width={width} height={height} data={graphData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={axisStyle} />
                                <YAxis axisLine={false} tickLine={false} tick={axisStyle} />
                                <Tooltip
                                  contentStyle={tooltipStyle}
                                  labelFormatter={(label) => `Recorded: ${label}`}
                                  formatter={(value, name, props) => {
                                    const ref = props?.payload?.reference;
                                    const source = props?.payload?.sourceLabel;
                                    const status = statusBadge(props?.payload?.status).label;
                                    return [
                                      `${value}${selectedSeries.unit ? ` ${selectedSeries.unit}` : ''}${ref ? ` (Ref: ${ref})` : ''}${source ? ` • ${source}` : ''} • ${status}`,
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
                            )}
                          </AutoSizedChart>

                          <div className="mt-4 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-700">
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Trend Summary</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{readableTrend}</p>
                            {abnormalPoints.length > 0 ? (
                              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                {abnormalPoints.length} abnormal reading(s) detected. Review highlighted points for follow-up.
                              </p>
                            ) : (
                              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">No abnormal values detected in this selection.</p>
                            )}
                            {group.aiTrendSummary && (
                              <div className="mt-3 p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/40">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">AI-generated trend note</p>
                                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{group.aiTrendSummary}</p>
                              </div>
                            )}
                          </div>

                          {(profile.accessibleChartsMode || profile.modeEnabled) && (
                            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200/70 dark:border-slate-700 bg-white dark:bg-slate-900">
                              <table className="w-full text-left min-w-160">
                                <thead>
                                  <tr className="border-b border-slate-200 dark:border-slate-700">
                                    <th className="px-3 py-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">Timestamp</th>
                                    <th className="px-3 py-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">Value</th>
                                    <th className="px-3 py-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">Reference</th>
                                    <th className="px-3 py-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">Status</th>
                                    <th className="px-3 py-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">Meaning</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {graphData.map((row, rowIndex) => {
                                    const badge = statusBadge(row.status);
                                    return (
                                      <tr
                                        key={`${row.date}-${rowIndex}`}
                                        className={`border-b border-slate-100 dark:border-slate-800 last:border-0 ${row.status === 'high' || row.status === 'low' ? 'bg-red-50/60 dark:bg-red-950/10' : ''}`}
                                      >
                                        <td className="px-3 py-2 text-xs text-slate-700 dark:text-slate-200">{row.date}</td>
                                        <td className="px-3 py-2 text-xs text-slate-700 dark:text-slate-200">{row.value}{selectedSeries.unit ? ` ${selectedSeries.unit}` : ''}</td>
                                        <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-300">{row.reference || '-'}</td>
                                        <td className="px-3 py-2">
                                          <span className={`text-[10px] font-semibold px-2 py-1 rounded-md ${badge.tone}`}>{badge.label}</span>
                                        </td>
                                        <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-300">{explainStatus(selectedSeries.attribute, row.status, row.reference)}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
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
