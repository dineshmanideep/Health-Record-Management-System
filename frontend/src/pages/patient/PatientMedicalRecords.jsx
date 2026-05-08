import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { useLanguage } from '../../context/LanguageContext';
import { patientService } from '../../services/api';

const PatientMedicalRecords = () => {
  const [tab, setTab] = useState('hospital');
  const [groupedRecords, setGroupedRecords] = useState([]);
  const [selfRecords, setSelfRecords] = useState([]);
  const [trustedDoctors, setTrustedDoctors] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [documentFilter, setDocumentFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', recordDate: '' });
  const [formFile, setFormFile] = useState(null);
  const [formLink, setFormLink] = useState('');
  const [docMode, setDocMode] = useState('file');
  const [formLoading, setFormLoading] = useState(false);
  const [reprocessingId, setReprocessingId] = useState('');
  const { t } = useLanguage();

  useEffect(() => {
    let isActive = true;

    const loadData = async () => {
      setLoading(true);
      try {
        const [recRes, selfRes, docRes] = await Promise.all([
          patientService.getRecords(), patientService.getSelfRecords(), patientService.getTrustedDoctors()
        ]);
        if (!isActive) return;
        if (recRes.success) setGroupedRecords(recRes.data);
        if (selfRes.success) setSelfRecords(selfRes.data);
        if (docRes.success) setTrustedDoctors(docRes.data);
      } catch {
        if (isActive) setError(t({ en: 'Failed to load records', hi: 'रिकॉर्ड लोड नहीं हो सके' }));
      } finally {
        if (isActive) setLoading(false);
      }
    };

    void loadData();
    return () => {
      isActive = false;
    };
  }, []);

  const handleCreateSelfRecord = async (e) => {
    e.preventDefault();
    if (!formData.title) return;
    if (docMode === 'file' && !formFile) { alert(t({ en: 'Please select a file.', hi: 'कृपया फ़ाइल चुनें।' })); return; }
    if (docMode === 'link' && !formLink.trim()) { alert(t({ en: 'Please enter a link.', hi: 'कृपया लिंक डालें।' })); return; }
    setFormLoading(true);
    try {
      let res;
      if (docMode === 'file') {
        const fd = new FormData();
        fd.append('title', formData.title);
        fd.append('description', formData.description);
        fd.append('recordDate', formData.recordDate);
        fd.append('document', formFile);
        res = await patientService.createSelfRecord(fd);
      } else {
        res = await patientService.createSelfRecordLink({
          title: formData.title, description: formData.description,
          recordDate: formData.recordDate, documentPath: formLink.trim()
        });
      }
      if (res.success) {
        setSelfRecords([res.data, ...selfRecords]);
        setFormData({ title: '', description: '', recordDate: '' });
        setFormFile(null); setFormLink(''); setShowForm(false);
      }
    } catch { alert(t({ en: 'Failed to create record', hi: 'रिकॉर्ड नहीं बन पाया' })); }
    setFormLoading(false);
  };

  const handleDeleteSelfRecord = async (id) => {
    if (!confirm(t({ en: 'Delete this record?', hi: 'क्या यह रिकॉर्ड हटाएं?' }))) return;
    try {
      const res = await patientService.deleteSelfRecord(id);
      if (res.success) setSelfRecords(selfRecords.filter((r) => r._id !== id));
    } catch { alert(t({ en: 'Failed to delete', hi: 'हटाया नहीं जा सका' })); }
  };

  const handleRevokeAccess = async (doctorId) => {
    if (!confirm(t({ en: 'Revoke this doctor\'s access?', hi: 'क्या इस डॉक्टर का एक्सेस हटाएं?' }))) return;
    try {
      const res = await patientService.revokeDoctorAccess(doctorId);
      if (res.success) setTrustedDoctors(trustedDoctors.filter((d) => d.doctor?._id !== doctorId));
    } catch { alert(t({ en: 'Failed to revoke access', hi: 'एक्सेस हटाया नहीं जा सका' })); }
  };

  const handleReprocessRecord = async (record) => {
    if (!record?._id) return;
    setReprocessingId(record._id);
    try {
      const response = record.recordType === 'test_assignment'
        ? await patientService.reprocessTestAssignment(record._id)
        : await patientService.reprocessRecord(record._id);

      if (response.success) {
        alert(t({ en: 'Reprocessing started. Refresh this page after a short time to see updated findings.', hi: 'रीप्रोसेस शुरू हुआ। थोड़ी देर बाद पेज रिफ्रेश करें।' }));
      } else {
        alert(response.message || t({ en: 'Failed to start reprocessing', hi: 'रीप्रोसेस शुरू नहीं हो सका' }));
      }
    } catch (error) {
      alert(error?.response?.data?.message || t({ en: 'Failed to start reprocessing', hi: 'रीप्रोसेस शुरू नहीं हो सका' }));
    } finally {
      setReprocessingId('');
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString() : t({ en: 'N/A', hi: 'उपलब्ध नहीं' });
  const formatFieldLabel = (field) =>
    String(field || '')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  const formatMetricValue = (metric) => `${metric?.value ?? '--'}${metric?.unit ? ` ${metric.unit}` : ''}`;
  const formatMedicationDuration = (medication) => {
    if (medication?.durationDays) return `${medication.durationDays} ${t({ en: 'day(s)', hi: 'दिन' })}`;
    if (medication?.duration) return medication.duration;
    return t({ en: 'Duration not specified', hi: 'अवधि नहीं बताई गई' });
  };
  const formatMedicationSchedule = (medication) => {
    return [medication?.frequency, medication?.timing, medication?.instructions]
      .filter(Boolean)
      .join(' • ');
  };
  const dedupeMetrics = (metrics = []) => {
    const byKey = new Map();

    const normalizeUnit = (value) => String(value || '')
      .toLowerCase()
      .replace(/[µμ]/g, 'u')
      .replace(/\s+/g, '')
      .trim();

    const qualityScore = (metric) => {
      let score = 0;
      if (metric?.status && metric.status !== 'unknown') score += 2;
      const reference = String(metric?.reference || '').toLowerCase();
      if (reference) score += 1;
      if (reference && !/(year|years|week|weeks|day|days|month|months|trimester|pregnan|pediatric|paediatric|adult|cord blood|age)/i.test(reference)) score += 2;
      if (reference && reference.length <= 120) score += 1;
      return score;
    };

    for (const metric of metrics || []) {
      const reportDateKey = metric?.reportDate
        ? new Date(metric.reportDate).toISOString().slice(0, 10)
        : '';
      const key = [
        String(metric?.name || '').toLowerCase(),
        String(metric?.value ?? ''),
        normalizeUnit(metric?.unit || ''),
        reportDateKey
      ].join('|');

      const existing = byKey.get(key);
      if (!existing || qualityScore(metric) > qualityScore(existing)) {
        byKey.set(key, metric);
      }
    }

    return Array.from(byKey.values());
  };
  const findingTone = (status) => {
    if (status === 'high' || status === 'low') {
      return {
        wrap: 'border-red-200/70 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20',
        label: 'text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30'
      };
    }
    if (status === 'normal') {
      return {
        wrap: 'border-emerald-200/70 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/20',
        label: 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/30'
      };
    }
    return {
      wrap: 'border-amber-200/70 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20',
      label: 'text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30'
    };
  };
  const solveFileUrl = (path) => {
    if (!path) return '#';
    if (path.startsWith('http')) return path;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const backendOrigin = import.meta.env.VITE_BACKEND_ORIGIN || '';
    return backendOrigin ? `${backendOrigin}${cleanPath}` : cleanPath;
  };

  const getAllDocuments = () => {
    const allDocs = [];
    groupedRecords.forEach(group => {
      group.records.forEach(record => {
        if (record.recordType === 'medical_record') {
          (record.categorizedDocuments || []).forEach(doc => {
            allDocs.push({ ...doc, record: { _id: record._id, recordType: 'medical_record', visitDate: record.visitDate, diagnosis: record.diagnosis, doctor: record.doctor, hospital: record.hospital, nurse: record.nurse } });
          });
        } else if (record.recordType === 'test_assignment') {
          (record.resultDocuments || []).forEach(doc => {
            allDocs.push({ ...doc, record: { _id: record._id, recordType: 'test_assignment', completedAt: record.completedAt, testType: record.testType, results: record.results, nurse: record.nurse, hospital: record.hospital } });
          });
        }
      });
    });
    return allDocs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
  };

  const allDocuments = getAllDocuments();
  const testReports = allDocuments.filter(d => d.category === 'test_report');
  const diagnosisReports = allDocuments.filter(d => d.category === 'diagnosis_report');

  const getImportantFields = (record) => {
    const documentMetrics = ((record?.recordType === 'medical_record' ? record?.categorizedDocuments : record?.resultDocuments) || [])
      .flatMap((doc) => (doc?.parsedMetrics || []).map((metric) => ({
        ...metric,
        documentName: doc?.filePath?.split('/').pop() || '',
        reportDate: doc?.reportDate || doc?.uploadedAt || null
      })));

    const structuredMetrics = Array.isArray(record?.structuredData?.parsedMetrics)
      ? record.structuredData.parsedMetrics
      : [];

    const metricPool = documentMetrics.length > 0 ? documentMetrics : structuredMetrics;

    return dedupeMetrics(metricPool)
      .sort((a, b) => {
        const aRank = a.status === 'high' || a.status === 'low' ? 2 : (a.status === 'unknown' ? 1 : 0);
        const bRank = b.status === 'high' || b.status === 'low' ? 2 : (b.status === 'unknown' ? 1 : 0);
        return bRank - aRank;
      })
      .slice(0, 8);
  };

  const tabs = [
    { key: 'hospital', label: t({ en: 'Hospital Records', hi: 'अस्पताल रिकॉर्ड' }), icon: '🏥' },
    { key: 'documents', label: t({ en: 'All Documents', hi: 'सभी दस्तावेज़' }), icon: '📂' },
    { key: 'self', label: t({ en: 'My Uploads', hi: 'मेरे अपलोड' }), icon: '📤' },
    { key: 'doctors', label: t({ en: 'Doctor Access', hi: 'डॉक्टर एक्सेस' }), icon: '👨‍⚕️' }
  ];

  return (
    <DashboardLayout title={t({ en: 'Medical Records', hi: 'मेडिकल रिकॉर्ड' })}>
      {error && (
        <div className="mb-5 p-3.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl border border-red-100 dark:border-red-900/30 text-sm font-medium flex items-center gap-2">
          ⚠️ {error}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-1.5 mb-6 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl w-fit border border-slate-200 dark:border-slate-800">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setSelectedRecord(null); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
              tab === t.key 
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <span className="text-sm">{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm text-slate-400 font-medium">{t({ en: 'Loading records...', hi: 'रिकॉर्ड लोड हो रहे हैं...' })}</p>
        </div>
      ) : (
        <div className="space-y-5 animate-fadeIn">
          {/* ===== HOSPITAL RECORDS ===== */}
          {tab === 'hospital' && (
            <div>
              {selectedRecord ? (
                <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <button onClick={() => setSelectedRecord(null)} className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-semibold text-xs mb-6 hover:-translate-x-1 transition-transform">
                    {t({ en: '← Back to list', hi: '← सूची पर वापस' })}
                  </button>
                  
                  {selectedRecord.recordType === 'medical_record' ? (
                    <>
                      {selectedRecord.structuredData?.summary && (
                        <div className="mb-6 p-5 rounded-xl border border-indigo-200/70 dark:border-indigo-900/40 bg-indigo-50 dark:bg-indigo-950/20">
                          <h3 className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2">{t({ en: 'AI Summary', hi: 'AI सारांश' })}</h3>
                          <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-line leading-relaxed">{selectedRecord.structuredData.summary}</p>
                        </div>
                      )}

                      {getImportantFields(selectedRecord).length > 0 && (
                        <div className="mb-6 p-5 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
                          <h3 className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">{t({ en: 'Important Findings', hi: 'महत्वपूर्ण निष्कर्ष' })}</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                            {getImportantFields(selectedRecord).map((finding, index) => {
                              const tone = findingTone(finding.status);
                              return (
                              <div key={`${finding.name}-${index}`} className={`p-3 rounded-lg border ${tone.wrap}`}>
                                <div className="flex items-center justify-between gap-2 mb-2">
                                  <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{formatFieldLabel(finding.name)}</p>
                                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${tone.label}`}>{finding.status || t({ en: 'review', hi: 'जांच' })}</span>
                                </div>
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-100 break-words">{formatMetricValue(finding)}</p>
                                {finding.reference && <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">{t({ en: 'Ref', hi: 'रेफ' })}: {finding.reference}</p>}
                                {finding.reportDate && <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{t({ en: 'Report Date', hi: 'रिपोर्ट तारीख' })}: {formatDate(finding.reportDate)}</p>}
                              </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {(selectedRecord.categorizedDocuments || []).some((doc) => doc.reportDate) && (
                        <div className="mb-6 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30">
                          <h3 className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">{t({ en: 'Report Dates', hi: 'रिपोर्ट तारीखें' })}</h3>
                          <div className="flex flex-wrap gap-2">
                            {(selectedRecord.categorizedDocuments || [])
                              .filter((doc) => doc.reportDate)
                              .map((doc, index) => (
                                <span key={`${doc.filePath}-${index}`} className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                                  {doc.filePath.split('/').pop()}: {formatDate(doc.reportDate)}
                                </span>
                              ))}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-6">
                          <div>
                            <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">{t({ en: 'Visit Details', hi: 'विज़िट विवरण' })}</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                              {[
                                { label: t({ en: 'Visit Date', hi: 'विज़िट तारीख' }), value: formatDate(selectedRecord.visitDate), icon: '📅' },
                                { label: t({ en: 'Doctor', hi: 'डॉक्टर' }), value: `${t({ en: 'Dr.', hi: 'डॉ.' })} ${selectedRecord.doctor?.name}`, icon: '👨‍⚕️', sub: selectedRecord.doctor?.specialization },
                                { label: t({ en: 'Diagnosis', hi: 'निदान' }), value: selectedRecord.diagnosis, icon: '📋' },
                                { label: t({ en: 'Hospital', hi: 'अस्पताल' }), value: selectedRecord.hospital?.name, icon: '🏥' },
                              ].map((item, idx) => (
                                <div key={idx} className="flex gap-3">
                                  <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-base">{item.icon}</div>
                                  <div>
                                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">{item.label}</p>
                                    <p className="text-sm font-semibold text-slate-800 dark:text-white">{item.value}</p>
                                    {item.sub && <p className="text-[11px] text-indigo-500">{item.sub}</p>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          {selectedRecord.prescriptionNotes && (
                            <div className="bg-indigo-50 dark:bg-indigo-900/15 p-5 rounded-xl border border-indigo-100 dark:border-indigo-800/30">
                              <h4 className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2">{t({ en: 'Prescription', hi: 'पर्ची' })}</h4>
                              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic">{selectedRecord.prescriptionNotes}</p>
                            </div>
                          )}
                          {selectedRecord.medications?.length > 0 && (
                            <div className="bg-emerald-50 dark:bg-emerald-950/20 p-5 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                              <h4 className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-3">{t({ en: 'Tablet Schedule', hi: 'दवा समय' })}</h4>
                              <div className="space-y-3">
                                {selectedRecord.medications.map((medication, index) => (
                                  <div key={`${medication.name}-${index}`} className="bg-white dark:bg-slate-900 rounded-xl border border-emerald-100 dark:border-emerald-900/30 p-4">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <p className="text-sm font-bold text-slate-800 dark:text-white">{medication.name}</p>
                                      <span className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">{formatMedicationDuration(medication)}</span>
                                    </div>
                                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-2">
                                      {[medication.dosage, formatMedicationSchedule(medication)].filter(Boolean).join(' • ') || t({ en: 'Dosage instructions not specified', hi: 'डोज की जानकारी नहीं है' })}
                                    </p>
                                    {(medication.startDate || medication.endDate) && (
                                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                                        {medication.startDate ? `${t({ en: 'Start', hi: 'शुरू' })}: ${formatDate(medication.startDate)}` : ''}
                                        {medication.startDate && medication.endDate ? ' • ' : ''}
                                        {medication.endDate ? `${t({ en: 'End', hi: 'समाप्त' })}: ${formatDate(medication.endDate)}` : ''}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {selectedRecord.nextVisitDate && (
                            <div className="bg-amber-50 dark:bg-amber-950/20 p-5 rounded-xl border border-amber-100 dark:border-amber-900/30">
                              <h4 className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2">{t({ en: 'Next Visit', hi: 'अगली विज़िट' })}</h4>
                              <p className="text-sm font-bold text-slate-800 dark:text-white">{new Date(selectedRecord.nextVisitDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t({ en: 'Documents', hi: 'दस्तावेज़' })}</h3>
                          <div className="space-y-2">
                            {(selectedRecord.categorizedDocuments || []).map((doc, i) => (
                              <a key={i} href={solveFileUrl(doc.filePath)} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl hover:border-indigo-400 transition-all group/doc">
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-base ${doc.category === 'test_report' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600'}`}>
                                  {doc.category === 'test_report' ? '📊' : '📄'}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{doc.category?.replace('_', ' ')}</p>
                                  <p className="text-xs font-semibold text-slate-700 dark:text-white truncate group-hover/doc:text-indigo-500">{doc.filePath.split('/').pop()}</p>
                                  {doc.reportTag && (
                                    <p className="text-[10px] text-indigo-500 dark:text-indigo-400 truncate mt-0.5">{t({ en: 'Tag', hi: 'टैग' })}: {doc.reportTag}</p>
                                  )}
                                  {doc.reportDate && (
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{t({ en: 'Report Date', hi: 'रिपोर्ट तारीख' })}: {formatDate(doc.reportDate)}</p>
                                  )}
                                  {doc.aiSummary && <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-3">{doc.aiSummary}</p>}
                                </div>
                              </a>
                            ))}
                            {!selectedRecord.categorizedDocuments?.length && <p className="text-xs text-slate-400 italic">{t({ en: 'No documents.', hi: 'कोई दस्तावेज़ नहीं।' })}</p>}
                          </div>
                        </div>
                      </div>
                      {selectedRecord.healthMetrics && Object.values(selectedRecord.healthMetrics).some(v => v != null) && (
                        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">{t({ en: 'Vitals', hi: 'वाइटल्स' })}</h3>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {[
                              { label: t({ en: 'Blood Sugar', hi: 'ब्लड शुगर' }), val: selectedRecord.healthMetrics.bloodSugar, unit: 'mg/dL', color: 'text-emerald-600 dark:text-emerald-400' },
                              { label: t({ en: 'BP', hi: 'बीपी' }), val: selectedRecord.healthMetrics.bloodPressureSystolic ? `${selectedRecord.healthMetrics.bloodPressureSystolic}/${selectedRecord.healthMetrics.bloodPressureDiastolic}` : null, unit: 'mmHg', color: 'text-rose-600 dark:text-rose-400' },
                              { label: 'TSH', val: selectedRecord.healthMetrics.thyroidTSH, unit: 'mIU/L', color: 'text-blue-600 dark:text-blue-400' },
                              { label: t({ en: 'Heart Rate', hi: 'हार्ट रेट' }), val: selectedRecord.healthMetrics.heartRate, unit: 'bpm', color: 'text-indigo-600 dark:text-indigo-400' },
                            ].filter(m => m.val).map((m, idx) => (
                              <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{m.label}</p>
                                <p className={`text-lg font-bold ${m.color}`}>{m.val} <span className="text-[10px] font-medium opacity-60">{m.unit}</span></p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl flex flex-wrap gap-4 items-center justify-between border border-slate-100 dark:border-slate-800">
                        <p className="text-[10px] font-medium text-slate-400">ID: {selectedRecord._id}</p>
                        <div className="flex items-center gap-3">
                          <p className="text-[10px] font-medium text-slate-400">{t({ en: 'Created', hi: 'बनाया गया' })}: {new Date(selectedRecord.createdAt).toLocaleString()}</p>
                          <button
                            onClick={() => handleReprocessRecord(selectedRecord)}
                            disabled={reprocessingId === selectedRecord._id}
                            className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-[11px] font-semibold disabled:opacity-50"
                          >
                            {reprocessingId === selectedRecord._id ? t({ en: 'Reprocessing...', hi: 'रीप्रोसेस हो रहा है...' }) : t({ en: 'Reprocess With LLM', hi: 'LLM से रीप्रोसेस' })}
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {selectedRecord.structuredData?.summary && (
                        <div className="mb-6 p-5 rounded-xl border border-emerald-200/70 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/20">
                          <h3 className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2">{t({ en: 'AI Summary', hi: 'AI सारांश' })}</h3>
                          <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-line leading-relaxed">{selectedRecord.structuredData.summary}</p>
                        </div>
                      )}
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">{t({ en: 'Test Result Details', hi: 'टेस्ट परिणाम विवरण' })}</h2>
                      {getImportantFields(selectedRecord).length > 0 && (
                        <div className="mb-6 p-5 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
                          <h3 className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">{t({ en: 'Important Findings', hi: 'महत्वपूर्ण निष्कर्ष' })}</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                            {getImportantFields(selectedRecord).map((finding, index) => {
                              const tone = findingTone(finding.status);
                              return (
                                <div key={`${finding.name}-${index}`} className={`p-3 rounded-lg border ${tone.wrap}`}>
                                  <div className="flex items-center justify-between gap-2 mb-2">
                                    <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{formatFieldLabel(finding.name)}</p>
                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${tone.label}`}>{finding.status || t({ en: 'review', hi: 'जांच' })}</span>
                                  </div>
                                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100 break-words">{formatMetricValue(finding)}</p>
                                  {finding.reference && <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">{t({ en: 'Ref', hi: 'रेफ' })}: {finding.reference}</p>}
                                  {finding.reportDate && <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{t({ en: 'Report Date', hi: 'रिपोर्ट तारीख' })}: {formatDate(finding.reportDate)}</p>}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-6">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            {[
                              { label: t({ en: 'Test Name', hi: 'टेस्ट नाम' }), value: selectedRecord.testType?.name, icon: '🧪', sub: selectedRecord.testType?.description },
                              { label: t({ en: 'Completed On', hi: 'पूरा हुआ' }), value: formatDate(selectedRecord.completedAt), icon: '✅' },
                              { label: t({ en: 'Hospital', hi: 'अस्पताल' }), value: selectedRecord.hospital?.name, icon: '🏥' },
                              { label: t({ en: 'Performed By', hi: 'किसने किया' }), value: `${t({ en: 'Nurse', hi: 'नर्स' })} ${selectedRecord.nurse?.name}`, icon: '👩‍⚕️' },
                            ].map((item, idx) => (
                              <div key={idx} className="flex gap-3">
                                <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-base">{item.icon}</div>
                                <div className="min-w-0">
                                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">{item.label}</p>
                                  <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{item.value}</p>
                                  {item.sub && <p className="text-[11px] text-slate-500 truncate mt-0.5">{item.sub}</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                          {selectedRecord.results && (
                            <div className="bg-emerald-50 dark:bg-emerald-900/15 p-5 rounded-xl border border-emerald-100 dark:border-emerald-800/30">
                              <h4 className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2">{t({ en: 'Test Observations', hi: 'टेस्ट टिप्पणियां' })}</h4>
                              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic whitespace-pre-wrap">{selectedRecord.results}</p>
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t({ en: 'Test Files', hi: 'टेस्ट फाइलें' })}</h3>
                          <div className="space-y-2">
                            {(selectedRecord.resultDocuments || []).map((doc, i) => (
                              <a key={i} href={solveFileUrl(doc.filePath)} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl hover:border-indigo-400 transition-all group/doc">
                                <div className="w-9 h-9 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-lg flex items-center justify-center text-base">📁</div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wider">{t({ en: 'Test File', hi: 'टेस्ट फाइल' })}</p>
                                  <p className="text-xs font-semibold text-slate-700 dark:text-white truncate group-hover/doc:text-indigo-500">{doc.filePath.split('/').pop()}</p>
                                  {doc.reportTag && (
                                    <p className="text-[10px] text-indigo-500 dark:text-indigo-400 truncate mt-0.5">{t({ en: 'Tag', hi: 'टैग' })}: {doc.reportTag}</p>
                                  )}
                                  {doc.reportDate && (
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{t({ en: 'Report Date', hi: 'रिपोर्ट तारीख' })}: {formatDate(doc.reportDate)}</p>
                                  )}
                                  {doc.aiSummary && <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-3">{doc.aiSummary}</p>}
                                </div>
                              </a>
                            ))}
                            {!selectedRecord.resultDocuments?.length && <p className="text-xs text-slate-400 italic">{t({ en: 'No files uploaded.', hi: 'कोई फाइल अपलोड नहीं हुई।' })}</p>}
                          </div>
                        </div>
                      </div>
                      <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl flex items-center justify-between border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                          <p className="text-[10px] font-medium text-slate-400">{t({ en: 'Ref', hi: 'रेफ' })}: {selectedRecord._id}</p>
                          <button
                            onClick={() => handleReprocessRecord(selectedRecord)}
                            disabled={reprocessingId === selectedRecord._id}
                            className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-[11px] font-semibold disabled:opacity-50"
                          >
                            {reprocessingId === selectedRecord._id ? t({ en: 'Reprocessing...', hi: 'रीप्रोसेस हो रहा है...' }) : t({ en: 'Reprocess With LLM', hi: 'LLM से रीप्रोसेस' })}
                          </button>
                        </div>
                        <span className="text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2.5 py-0.5 rounded-md uppercase">{selectedRecord.status}</span>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-5">
                  {groupedRecords.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 p-16 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
                      <p className="text-4xl mb-4">🏥</p>
                      <p className="text-sm text-slate-400 italic">{t({ en: 'No clinical records found.', hi: 'कोई क्लिनिकल रिकॉर्ड नहीं मिले।' })}</p>
                    </div>
                  ) : (
                    groupedRecords.map((group) => (
                      <div key={group.hospital?._id} className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
                        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-3">
                          <span className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-base">🏥</span>
                          {group.hospital?.name || t({ en: 'Hospital', hi: 'अस्पताल' })}
                        </h2>
                        <div className="overflow-x-auto -mx-5 sm:-mx-6">
                          <table className="w-full text-left min-w-[700px]">
                            <thead>
                              <tr className="border-b border-slate-100 dark:border-slate-800">
                                <th className="py-3 px-5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{t({ en: 'Date', hi: 'तारीख' })}</th>
                                <th className="py-3 px-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{t({ en: 'Type', hi: 'प्रकार' })}</th>
                                <th className="py-3 px-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{t({ en: 'Clinician', hi: 'चिकित्सक' })}</th>
                                <th className="py-3 px-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{t({ en: 'Files', hi: 'फाइलें' })}</th>
                                <th className="py-3 px-5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-right">{t({ en: 'Action', hi: 'कार्रवाई' })}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {group.records.map((r) => (
                                <tr key={r._id} className="group border-b border-slate-50 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                  <td className="py-4 px-5 text-xs font-medium text-slate-600 dark:text-slate-400">
                                    {r.recordType === 'medical_record' ? formatDate(r.visitDate) : formatDate(r.completedAt)}
                                  </td>
                                  <td className="py-4 px-4">
                                    {r.recordType === 'medical_record' ? (
                                      <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2.5 py-0.5 rounded-md text-[10px] font-semibold">👨‍⚕️ {t({ en: 'Visit', hi: 'विज़िट' })}</span>
                                    ) : (
                                      <span className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-md text-[10px] font-semibold">🧪 {r.testType?.name || t({ en: 'Test', hi: 'टेस्ट' })}</span>
                                    )}
                                  </td>
                                  <td className="py-4 px-4">
                                    <p className="text-xs font-semibold text-slate-800 dark:text-white">
                                      {r.recordType === 'medical_record' ? `${t({ en: 'Dr.', hi: 'डॉ.' })} ${r.doctor?.name}` : `${t({ en: 'Nurse', hi: 'नर्स' })} ${r.nurse?.name}`}
                                    </p>
                                    {r.recordType === 'medical_record' && <p className="text-[10px] text-slate-400 mt-0.5">{r.doctor?.specialization}</p>}
                                  </td>
                                  <td className="py-4 px-4">
                                    <div className="flex gap-1">
                                      {((r.recordType === 'medical_record' ? r.categorizedDocuments : r.resultDocuments) || []).slice(0, 3).map((d, i) => (
                                        <div key={i} className={`w-6 h-6 rounded flex items-center justify-center text-[10px] ${d.category === 'test_report' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                                          {d.category === 'test_report' ? '🧪' : '📄'}
                                        </div>
                                      ))}
                                      {((r.recordType === 'medical_record' ? r.categorizedDocuments : r.resultDocuments) || []).length > 3 && (
                                        <span className="text-[10px] text-slate-400 font-medium">+{((r.recordType === 'medical_record' ? r.categorizedDocuments : r.resultDocuments) || []).length - 3}</span>
                                      )}
                                      {!((r.recordType === 'medical_record' ? r.categorizedDocuments : r.resultDocuments) || []).length && <span className="text-slate-300">--</span>}
                                    </div>
                                  </td>
                                  <td className="py-4 px-5 text-right">
                                    <button onClick={() => setSelectedRecord(r)} className="text-indigo-600 dark:text-indigo-400 font-semibold text-xs hover:underline">
                                      {t({ en: 'View →', hi: 'देखें →' })}
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* ===== ALL DOCUMENTS ===== */}
          {tab === 'documents' && (
            <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="mb-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{t({ en: 'Medical Reports', hi: 'मेडिकल रिपोर्ट' })}</h2>
                <p className="text-xs text-slate-400">{t({ en: 'All test results and diagnostic reports in one place.', hi: 'सभी टेस्ट और निदान रिपोर्ट एक जगह।' })}</p>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                {[
                  { id: 'all', label: `${t({ en: 'All', hi: 'सभी' })} (${allDocuments.length})`, icon: '📄' },
                  { id: 'test', label: `${t({ en: 'Tests', hi: 'टेस्ट' })} (${testReports.length})`, icon: '🧪' },
                  { id: 'diagnosis', label: `${t({ en: 'Reports', hi: 'रिपोर्ट' })} (${diagnosisReports.length})`, icon: '📋' }
                ].map((f) => (
                  <button key={f.id} onClick={() => setDocumentFilter(f.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      documentFilter === f.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'
                    }`}>
                    <span>{f.icon}</span> {f.label}
                  </button>
                ))}
              </div>

              {allDocuments.length === 0 ? (
                <div className="text-center py-16"><p className="text-4xl mb-3">📂</p><p className="text-sm text-slate-400 italic">{t({ en: 'No reports found.', hi: 'कोई रिपोर्ट नहीं मिली।' })}</p></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allDocuments
                    .filter(d => documentFilter === 'all' || (documentFilter === 'test' && d.category === 'test_report') || (documentFilter === 'diagnosis' && d.category === 'diagnosis_report'))
                    .map((doc, idx) => (
                      <div key={idx} className="group p-5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-all">
                        <div className="flex items-start justify-between mb-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${doc.category === 'test_report' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'}`}>
                            {doc.category === 'test_report' ? '📊' : '📄'}
                          </div>
                          <span className="text-[10px] font-medium text-slate-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-100 dark:border-slate-700">{formatDate(doc.reportDate || doc.uploadedAt)}</span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-800 dark:text-white mb-1.5 truncate">{doc.filePath.split('/').pop()}</h4>
                        <p className="text-[10px] text-slate-400 mb-4">{doc.record.hospital?.name}</p>
                        {doc.reportTag && (
                          <p className="text-[10px] font-semibold text-indigo-500 dark:text-indigo-400 mb-3 truncate">{t({ en: 'Tag', hi: 'टैग' })}: {doc.reportTag}</p>
                        )}
                        {doc.aiSummary && <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3 line-clamp-4">{doc.aiSummary}</p>}
                        <div className="flex gap-2">
                          <a href={solveFileUrl(doc.filePath)} target="_blank" rel="noopener noreferrer" className="flex-1 text-center py-2 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-indigo-400 transition-all">{t({ en: 'Preview', hi: 'देखें' })}</a>
                          <button onClick={() => { const record = groupedRecords.flatMap(g => g.records).find(r => r._id === doc.record._id); setSelectedRecord(record); setTab('hospital'); }}
                            className="flex-1 text-center py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-all">{t({ en: 'Source', hi: 'स्रोत' })}</button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* ===== SELF UPLOADS ===== */}
          {tab === 'self' && (
            <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{t({ en: 'My Uploads', hi: 'मेरे अपलोड' })}</h2>
                  <p className="text-xs text-slate-400">{t({ en: 'Medical documents uploaded by you.', hi: 'आपके द्वारा अपलोड किए गए दस्तावेज़।' })}</p>
                </div>
                <button onClick={() => setShowForm(!showForm)}
                  className={`px-5 py-2.5 rounded-xl text-xs font-semibold transition-all ${showForm ? 'bg-red-50 dark:bg-red-900/20 text-red-500' : 'bg-indigo-600 text-white shadow-md'}`}>
                  {showForm ? t({ en: 'Cancel', hi: 'रद्द करें' }) : t({ en: '+ Upload New', hi: '+ नया अपलोड' })}
                </button>
              </div>

              {showForm && (
                <form onSubmit={handleCreateSelfRecord} className="p-5 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800 mb-6 space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">{t({ en: 'Title *', hi: 'शीर्षक *' })}</label>
                        <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder={t({ en: 'e.g. Blood Test Result', hi: 'जैसे ब्लड टेस्ट रिजल्ट' })} required
                          className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">{t({ en: 'Date', hi: 'तारीख' })}</label>
                        <input type="date" value={formData.recordDate} onChange={(e) => setFormData({ ...formData, recordDate: e.target.value })}
                          className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">{t({ en: 'Description', hi: 'विवरण' })}</label>
                      <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder={t({ en: 'Add notes...', hi: 'नोट्स लिखें...' })}
                        className="w-full h-[130px] px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all resize-none" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex gap-1.5 bg-slate-200/50 dark:bg-slate-700/50 p-0.5 rounded-lg w-fit">
                      {['file', 'link'].map(m => (
                        <button key={m} type="button" onClick={() => setDocMode(m)}
                          className={`px-3 py-1.5 rounded-md text-[10px] font-semibold uppercase ${docMode === m ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500'}`}>
                          {m === 'file' ? t({ en: '📁 File', hi: '📁 फाइल' }) : t({ en: '🔗 Link', hi: '🔗 लिंक' })}
                        </button>
                      ))}
                    </div>
                    {docMode === 'file' ? (
                      <input type="file" onChange={(e) => setFormFile(e.target.files[0] || null)} className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-indigo-50 file:text-indigo-600" />
                    ) : (
                      <input type="url" value={formLink} onChange={(e) => setFormLink(e.target.value)} placeholder="https://..."
                        className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all" />
                    )}
                  </div>
                  <button type="submit" disabled={formLoading} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md disabled:opacity-50 transition-all">
                    {formLoading ? t({ en: 'Uploading...', hi: 'अपलोड हो रहा है...' }) : t({ en: 'Save Record', hi: 'रिकॉर्ड सेव करें' })}
                  </button>
                </form>
              )}

              {selfRecords.length === 0 ? (
                <div className="text-center py-16"><p className="text-4xl mb-3">📝</p><p className="text-sm text-slate-400 italic">{t({ en: 'No records uploaded yet.', hi: 'अभी कोई रिकॉर्ड अपलोड नहीं हुआ।' })}</p></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {selfRecords.map((r) => (
                    <div key={r._id} className="group p-5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-all">
                      <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center text-xl mb-4">📄</div>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-1 truncate">{r.title}</h3>
                      <p className="text-[10px] text-slate-400 mb-4">{formatDate(r.recordDate)}</p>
                      <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <a href={r.documentPath} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-700 hover:scale-110 transition-all text-sm">👁️</a>
                        <button onClick={() => handleDeleteSelfRecord(r._id)} className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center text-rose-500 shadow-sm border border-slate-100 dark:border-slate-700 hover:scale-110 transition-all text-sm">🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ===== DOCTOR ACCESS ===== */}
          {tab === 'doctors' && (
            <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="mb-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{t({ en: 'Doctor Access', hi: 'डॉक्टर एक्सेस' })}</h2>
                <p className="text-xs text-slate-400">{t({ en: 'Doctors currently authorized to view your records.', hi: 'जो डॉक्टर आपके रिकॉर्ड देख सकते हैं।' })}</p>
              </div>

              {trustedDoctors.length === 0 ? (
                <div className="text-center py-16"><p className="text-4xl mb-3">👨‍⚕️</p><p className="text-sm text-slate-400 italic">{t({ en: 'No doctors have access to your records.', hi: 'किसी डॉक्टर को अभी एक्सेस नहीं है।' })}</p></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {trustedDoctors.map((access) => (
                    <div key={access._id} className="group p-5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-all flex flex-col">
                      <div className="flex items-center gap-4 mb-5">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-xl font-bold shadow-md">
                          {access.doctor?.name?.[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{t({ en: 'Dr.', hi: 'डॉ.' })} {access.doctor?.name}</p>
                          <p className="text-[11px] font-medium text-indigo-500">{access.doctor?.specialization}</p>
                        </div>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 mb-4 flex-1">
                        <span className="text-[10px] font-semibold text-slate-400">{t({ en: 'STATUS', hi: 'स्थिति' })}</span>
                        <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">✅ {t({ en: 'ACCESS GRANTED', hi: 'एक्सेस मिला' })}</span>
                      </div>
                      <button onClick={() => handleRevokeAccess(access.doctor?._id)}
                        className="w-full py-3 bg-red-50 dark:bg-red-900/15 text-red-600 text-xs font-semibold rounded-xl border border-red-100 dark:border-red-900/30 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all">
                        {t({ en: 'Revoke Access', hi: 'एक्सेस हटाएं' })}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
};

export default PatientMedicalRecords;
