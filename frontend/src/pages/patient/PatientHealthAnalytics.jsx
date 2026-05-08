import { useEffect, useRef, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { useTheme } from '../../context/ThemeContext';
import { useAccessibility } from '../../context/useAccessibility';
import { useLanguage } from '../../context/LanguageContext';
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

const normalizeUnitKey = (unit = '') => String(unit || '')
  .toLowerCase()
  .replace(/[µμ]/g, 'u')
  .replace(/\s+/g, '')
  .trim();

const pointDedupeKey = (point = {}) => {
  const dateKey = point?.date ? new Date(point.date).toISOString().slice(0, 10) : '';
  const valueKey = Number.isFinite(point?.value) ? String(point.value) : String(point?.value ?? '');
  const statusKey = String(point?.status || '').toLowerCase();
  const referenceKey = String(point?.reference || '').toLowerCase().trim();
  return [dateKey, valueKey, statusKey, referenceKey].join('|');
};

const mergeMetricSeriesOptions = (metricSeries = []) => {
  const bySeries = new Map();
  const unitsPerAttribute = new Map();

  for (const series of metricSeries || []) {
    const attribute = String(series?.attribute || '').trim();
    if (!attribute) continue;

    const attrKey = attribute.toLowerCase();
    const unit = String(series?.unit || '').trim();
    const unitKey = normalizeUnitKey(unit);
    const key = `${attrKey}|${unitKey}`;

    if (!bySeries.has(key)) {
      bySeries.set(key, {
        key,
        attribute,
        unit,
        points: []
      });
    }

    if (!unitsPerAttribute.has(attrKey)) {
      unitsPerAttribute.set(attrKey, new Set());
    }
    unitsPerAttribute.get(attrKey).add(unitKey || '-');

    bySeries.get(key).points.push(...(series?.points || []));
  }

  return Array.from(bySeries.values()).map((series) => {
    const pointMap = new Map();
    for (const point of series.points || []) {
      pointMap.set(pointDedupeKey(point), point);
    }

    const points = Array.from(pointMap.values())
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    const attrKey = series.attribute.toLowerCase();
    const hasMultipleUnits = (unitsPerAttribute.get(attrKey)?.size || 0) > 1;

    return {
      ...series,
      points,
      displayLabel: hasMultipleUnits && series.unit
        ? `${series.attribute} (${series.unit})`
        : series.attribute
    };
  });
};

const PatientHealthAnalytics = () => {
  const { theme } = useTheme();
  const { profile } = useAccessibility();
  const { t } = useLanguage();
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
    String(tag || t({ en: 'General Report', hi: 'सामान्य रिपोर्ट' }))
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
    if (status === 'high') return { label: t({ en: 'High ▲', hi: 'ज्यादा ▲' }), tone: 'text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30' };
    if (status === 'low') return { label: t({ en: 'Low ▼', hi: 'कम ▼' }), tone: 'text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30' };
    if (status === 'normal') return { label: t({ en: 'Normal ✓', hi: 'सामान्य ✓' }), tone: 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/30' };
    return { label: t({ en: 'Needs Review', hi: 'जांच चाहिए' }), tone: 'text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30' };
  };

  const explainStatus = (attribute, status, reference) => {
    if (status === 'high') return `${attribute} ${t({ en: 'is above the healthy range', hi: 'स्वस्थ सीमा से ऊपर है' })}${reference ? ` (${reference})` : ''}.`;
    if (status === 'low') return `${attribute} ${t({ en: 'is below the healthy range', hi: 'स्वस्थ सीमा से नीचे है' })}${reference ? ` (${reference})` : ''}.`;
    if (status === 'normal') return `${attribute} ${t({ en: 'is within the healthy range', hi: 'स्वस्थ सीमा में है' })}${reference ? ` (${reference})` : ''}.`;
    return `${t({ en: 'No clear range match for', hi: 'स्पष्ट सीमा नहीं मिली' })} ${attribute}${reference ? ` (${t({ en: 'reference', hi: 'रेफरेंस' })}: ${reference})` : ''}.`;
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
    <DashboardLayout title={t({ en: 'Health Analytics', hi: 'हेल्थ विश्लेषण' })}>
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm text-slate-400 font-medium">{t({ en: 'Loading analytics...', hi: 'विश्लेषण लोड हो रहा है...' })}</p>
        </div>
      ) :  reportAnalytics.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-16 rounded-2xl border border-slate-200/60 dark:border-slate-800 text-center max-w-lg mx-auto animate-fadeIn">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-5">📉</div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{t({ en: 'No Data Yet', hi: 'अभी डेटा नहीं है' })}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{t({ en: 'Health metrics will appear here once recorded during medical consultations.', hi: 'मेडिकल विज़िट के बाद डेटा यहां दिखेगा।' })}</p>
        </div>
      ) : (
        <div className="space-y-6 pb-12 animate-fadeIn">
          <div className="flex items-center gap-2 px-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
              {t({ en: `Analysis based on ${reportAnalytics.length} parsed test report groups`, hi: `${reportAnalytics.length} रिपोर्ट समूहों पर आधारित विश्लेषण` })}
            </p>
          </div>

        

          {reportAnalytics.length > 0 && (
            <div className="mt-10 space-y-8">
              <div className="flex items-center gap-2 px-1">
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                <p className="text-xs font-medium text-slate-400 dark:text-slate-500">{t({ en: 'Parsed report analytics from uploaded PDF test reports', hi: 'अपलोड की गई PDF रिपोर्ट से निकला विश्लेषण' })}</p>
              </div>

              {reportAnalytics.map((group, groupIndex) => (
                <div key={`${group.reportTag}-${groupIndex}`} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">{formatReportTag(group.reportTag)}</h3>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-5">{t({ en: 'Grouped by report type', hi: 'रिपोर्ट प्रकार के अनुसार' })}</p>

                  {group.metricSeries?.length ? (
                    (() => {
                      const reportKey = `${group.reportTag}-${groupIndex}`;
                      const mergedSeriesOptions = mergeMetricSeriesOptions(group.metricSeries || []);
                      const selectedSeriesKey = selectedMetricByReport[reportKey] || mergedSeriesOptions[0]?.key;
                      const selectedSeries = mergedSeriesOptions.find((series) => series.key === selectedSeriesKey) || mergedSeriesOptions[0];

                      if (!selectedSeries) {
                        return <p className="text-sm text-slate-500 dark:text-slate-400">{t({ en: 'No measurable attributes found for this report type.', hi: 'इस रिपोर्ट में कोई मापने योग्य डेटा नहीं मिला।' })}</p>;
                      }

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
                        if (graphData.length < 2) return t({ en: 'Not enough data points to describe trend yet.', hi: 'ट्रेंड बताने के लिए डेटा कम है।' });
                        const first = graphData[0].value;
                        const last = graphData[graphData.length - 1].value;
                        if (last > first) return t({ en: 'Overall trend is increasing.', hi: 'कुल ट्रेंड बढ़ रहा है।' });
                        if (last < first) return t({ en: 'Overall trend is decreasing.', hi: 'कुल ट्रेंड घट रहा है।' });
                        return t({ en: 'Overall trend is stable.', hi: 'कुल ट्रेंड स्थिर है।' });
                      })();

                      return (
                        <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-xl border border-slate-200/60 dark:border-slate-800">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                            <div>
                              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">{selectedSeries.attribute}</h4>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">{t({ en: 'Unit', hi: 'इकाई' })}: {selectedSeries.unit || '-'}</p>
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
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t({ en: 'Select Attribute', hi: 'गुण चुनें' })}</label>
                              <select
                                value={selectedSeries.key}
                                onChange={(e) => setSelectedMetricByReport((prev) => ({ ...prev, [reportKey]: e.target.value }))}
                                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200"
                              >
                                {mergedSeriesOptions.map((series) => (
                                  <option key={series.key} value={series.key}>{series.displayLabel}</option>
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
                                  labelFormatter={(label) => `${t({ en: 'Recorded', hi: 'रिकॉर्डेड' })}: ${label}`}
                                  formatter={(value, name, props) => {
                                    const ref = props?.payload?.reference;
                                    const source = props?.payload?.sourceLabel;
                                    const status = statusBadge(props?.payload?.status).label;
                                    return [
                                      `${value}${selectedSeries.unit ? ` ${selectedSeries.unit}` : ''}${ref ? ` (${t({ en: 'Ref', hi: 'रेफ' })}: ${ref})` : ''}${source ? ` • ${source}` : ''} • ${status}`,
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
                                  name={`${selectedSeries.attribute} ${t({ en: 'Value', hi: 'मान' })}`}
                                  connectNulls
                                />

                                <Line
                                  type="monotone"
                                  dataKey="referenceMin"
                                  stroke={referenceLineColor}
                                  strokeDasharray="6 6"
                                  strokeWidth={2}
                                  dot={false}
                                  name={t({ en: 'Reference Min', hi: 'रेफरेंस न्यूनतम' })}
                                  connectNulls
                                />

                                <Line
                                  type="monotone"
                                  dataKey="referenceMax"
                                  stroke={referenceLineColor}
                                  strokeDasharray="3 6"
                                  strokeWidth={2}
                                  dot={false}
                                  name={t({ en: 'Reference Max', hi: 'रेफरेंस अधिकतम' })}
                                  connectNulls
                                />
                              </LineChart>
                            )}
                          </AutoSizedChart>

                          <div className="mt-4 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-700">
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{t({ en: 'Trend Summary', hi: 'ट्रेंड सारांश' })}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{readableTrend}</p>
                            {abnormalPoints.length > 0 ? (
                              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                {abnormalPoints.length} {t({ en: 'abnormal reading(s) detected. Review highlighted points for follow-up.', hi: 'असामान्य रीडिंग मिली। हाइलाइट किए गए पॉइंट देखें।' })}
                              </p>
                            ) : (
                              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">{t({ en: 'No abnormal values detected in this selection.', hi: 'इस चयन में कोई असामान्य मान नहीं मिला।' })}</p>
                            )}
                            {group.aiTrendSummary && (
                              <div className="mt-3 p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/40">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">{t({ en: 'AI-generated trend note', hi: 'AI ट्रेंड नोट' })}</p>
                                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{group.aiTrendSummary}</p>
                              </div>
                            )}
                          </div>

                          {(profile.accessibleChartsMode || profile.modeEnabled) && (
                            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200/70 dark:border-slate-700 bg-white dark:bg-slate-900">
                              <table className="w-full text-left min-w-160">
                                <thead>
                                  <tr className="border-b border-slate-200 dark:border-slate-700">
                                    <th className="px-3 py-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">{t({ en: 'Timestamp', hi: 'समय' })}</th>
                                    <th className="px-3 py-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">{t({ en: 'Value', hi: 'मान' })}</th>
                                    <th className="px-3 py-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">{t({ en: 'Reference', hi: 'रेफरेंस' })}</th>
                                    <th className="px-3 py-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">{t({ en: 'Status', hi: 'स्थिति' })}</th>
                                    <th className="px-3 py-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">{t({ en: 'Meaning', hi: 'मतलब' })}</th>
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
