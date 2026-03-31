import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { patientService } from '../../services/api';

const PatientMedicalRecords = () => {
  const [tab, setTab] = useState('hospital'); // 'hospital' | 'self' | 'doctors' | 'documents'
  const [groupedRecords, setGroupedRecords] = useState([]);
  const [selfRecords, setSelfRecords] = useState([]);
  const [trustedDoctors, setTrustedDoctors] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [documentFilter, setDocumentFilter] = useState('all'); // 'all' | 'test' | 'diagnosis'

  // Self-record form state
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', recordDate: '' });
  const [formFile, setFormFile] = useState(null);
  const [formLink, setFormLink] = useState('');
  const [docMode, setDocMode] = useState('file'); // 'file' | 'link'
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [recRes, selfRes, docRes] = await Promise.all([
        patientService.getRecords(),
        patientService.getSelfRecords(),
        patientService.getTrustedDoctors()
      ]);
      if (recRes.success) setGroupedRecords(recRes.data);
      if (selfRes.success) setSelfRecords(selfRes.data);
      if (docRes.success) setTrustedDoctors(docRes.data);
    } catch {
      setError('Failed to load records');
    }
    setLoading(false);
  };

  const handleCreateSelfRecord = async (e) => {
    e.preventDefault();
    if (!formData.title) return;
    if (docMode === 'file' && !formFile) { alert('Please select a file to upload.'); return; }
    if (docMode === 'link' && !formLink.trim()) { alert('Please enter a document link.'); return; }
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
          title: formData.title,
          description: formData.description,
          recordDate: formData.recordDate,
          documentPath: formLink.trim()
        });
      }
      if (res.success) {
        setSelfRecords([res.data, ...selfRecords]);
        setFormData({ title: '', description: '', recordDate: '' });
        setFormFile(null);
        setFormLink('');
        setShowForm(false);
      }
    } catch {
      alert('Failed to create record');
    }
    setFormLoading(false);
  };

  const handleDeleteSelfRecord = async (id) => {
    if (!confirm('Delete this record?')) return;
    try {
      const res = await patientService.deleteSelfRecord(id);
      if (res.success) setSelfRecords(selfRecords.filter((r) => r._id !== id));
    } catch {
      alert('Failed to delete');
    }
  };

  const handleRevokeAccess = async (doctorId) => {
    if (!confirm('Revoke this doctor\'s access to your records?')) return;
    try {
      const res = await patientService.revokeDoctorAccess(doctorId);
      if (res.success) setTrustedDoctors(trustedDoctors.filter((d) => d.doctor?._id !== doctorId));
    } catch {
      alert('Failed to revoke access');
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString() : 'N/A';

  const solveFileUrl = (path) => {
    if (!path) return '#';
    if (path.startsWith('http')) return path;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const backendOrigin = import.meta.env.VITE_BACKEND_ORIGIN || '';
    if (backendOrigin) {
      return `${backendOrigin}${cleanPath}`;
    }
    return cleanPath;
  };

  // Get all documents from all records in timeline order
  const getAllDocuments = () => {
    const allDocs = [];
    groupedRecords.forEach(group => {
      group.records.forEach(record => {
        if (record.recordType === 'medical_record') {
          if (record.categorizedDocuments?.length > 0) {
            record.categorizedDocuments.forEach(doc => {
              allDocs.push({
                ...doc,
                record: {
                  _id: record._id,
                  recordType: 'medical_record',
                  visitDate: record.visitDate,
                  diagnosis: record.diagnosis,
                  doctor: record.doctor,
                  hospital: record.hospital,
                  nurse: record.nurse
                }
              });
            });
          }
        } else if (record.recordType === 'test_assignment') {
          if (record.resultDocuments?.length > 0) {
            record.resultDocuments.forEach(doc => {
              allDocs.push({
                ...doc,
                record: {
                  _id: record._id,
                  recordType: 'test_assignment',
                  completedAt: record.completedAt,
                  testType: record.testType,
                  results: record.results,
                  nurse: record.nurse,
                  hospital: record.hospital
                }
              });
            });
          }
        }
      });
    });
    return allDocs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
  };

  const allDocuments = getAllDocuments();
  const testReports = allDocuments.filter(d => d.category === 'test_report');
  const diagnosisReports = allDocuments.filter(d => d.category === 'diagnosis_report');

  const tabs = [
    { key: 'hospital', label: 'Hospital Records' },
    { key: 'documents', label: 'All Documents' },
    { key: 'self', label: 'Self-Uploaded' },
    { key: 'doctors', label: 'Trusted Doctors' }
  ];

  return (
    <DashboardLayout title="Medical records">
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center animate-pulse">
          ⚠️ {error}
        </div>
      )}

      {/* Modern Tab Navigation */}
      <div className="flex flex-wrap gap-2 mb-8 bg-slate-100/50 dark:bg-slate-800/30 p-1.5 rounded-2xl w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setSelectedRecord(null); }}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
              tab === t.key 
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm scale-105' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
           <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
           <p className="mt-4 text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest text-[10px]">Loading records...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* ==================== HOSPITAL RECORDS ==================== */}
          {tab === 'hospital' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {selectedRecord ? (
                <div className="bg-white dark:bg-slate-900 p-8 sm:p-12 rounded-[3.5rem] shadow-sm border border-slate-200/50 dark:border-slate-800">
                  <button 
                    onClick={() => setSelectedRecord(null)} 
                    className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-black text-[10px] uppercase tracking-widest mb-10 hover:translate-x-[-4px] transition-transform"
                  >
                    ← Back To List
                  </button>
                  
                  {selectedRecord.recordType === 'medical_record' ? (
                    <>
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                        <div className="lg:col-span-2 space-y-10">
                          <div>
                            <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6">Visit Details</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                               {[
                               { label: 'Visit Date', value: formatDate(selectedRecord.visitDate), icon: '📅' },
                                 { label: 'Physician', value: `Dr. ${selectedRecord.doctor?.name}`, icon: '👨‍⚕️', sub: selectedRecord.doctor?.specialization },
                                 { label: 'Diagnosis', value: selectedRecord.diagnosis, icon: '📋' },
                                 { label: 'Hospital', value: selectedRecord.hospital?.name, icon: '🏥' },
                               ].map((item, idx) => (
                                 <div key={idx} className="flex gap-4">
                                   <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-lg">{item.icon}</div>
                                   <div>
                                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
                                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{item.value}</p>
                                      {item.sub && <p className="text-[10px] text-indigo-500 font-bold">{item.sub}</p>}
                                   </div>
                                 </div>
                               ))}
                            </div>
                          </div>

                          {selectedRecord.prescriptionNotes && (
                            <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-8 rounded-3xl border border-indigo-100 dark:border-indigo-800/50">
                               <h4 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-4">Prescription</h4>
                               <p className="text-sm font-bold text-slate-700 dark:text-slate-300 leading-relaxed italic">{selectedRecord.prescriptionNotes}</p>
                            </div>
                          )}
                        </div>

                        <div className="space-y-8">
                           <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Uploaded Documents</h3>
                           <div className="space-y-3">
                              {(selectedRecord.categorizedDocuments || []).map((doc, i) => (
                                <a
                                  key={i}
                                  href={solveFileUrl(doc.filePath)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 border border-transparent dark:border-slate-700 rounded-2xl hover:border-indigo-500 transition-all group/doc"
                                >
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${doc.category === 'test_report' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                                     {doc.category === 'test_report' ? '📊' : '📄'}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5 truncate">{doc.category?.replace('_', ' ')}</p>
                                     <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate group-hover/doc:text-indigo-500">{doc.filePath.split('/').pop()}</p>
                                  </div>
                                </a>
                              ))}
                              {!selectedRecord.categorizedDocuments?.length && <p className="text-[10px] text-slate-400 italic">No documents found.</p>}
                           </div>
                        </div>
                      </div>

                      {selectedRecord.healthMetrics && Object.values(selectedRecord.healthMetrics).some(v => v != null) && (
                        <div className="mt-12 pt-12 border-t dark:border-slate-800">
                          <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-8">Vital Statistics</h3>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {[
                              { label: 'Glucose', val: selectedRecord.healthMetrics.bloodSugar, unit: 'mg/dL', bg: 'bg-emerald-50 dark:bg-emerald-900/10', text: 'text-emerald-600' },
                              { label: 'Pressure', val: selectedRecord.healthMetrics.bloodPressureSystolic ? `${selectedRecord.healthMetrics.bloodPressureSystolic}/${selectedRecord.healthMetrics.bloodPressureDiastolic}` : null, unit: 'mmHg', bg: 'bg-rose-50 dark:bg-rose-900/10', text: 'text-rose-600' },
                              { label: 'Endocrine', val: selectedRecord.healthMetrics.thyroidTSH, unit: 'mIU/L', bg: 'bg-blue-50 dark:bg-blue-900/10', text: 'text-blue-600' },
                              { label: 'Pulse', val: selectedRecord.healthMetrics.heartRate, unit: 'bpm', bg: 'bg-indigo-50 dark:bg-indigo-900/10', text: 'text-indigo-600' },
                            ].filter(m => m.val).map((m, idx) => (
                              <div key={idx} className={`${m.bg} p-6 rounded-3xl border border-transparent dark:border-slate-800`}>
                                <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">{m.label}</p>
                                <p className={`text-xl font-black ${m.text} dark:text-white`}>{m.val} <span className="text-[10px] opacity-60 font-medium">{m.unit}</span></p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="mt-12 p-6 bg-slate-50 dark:bg-slate-800/20 rounded-3xl flex flex-wrap gap-4 items-center justify-between">
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Record ID: {selectedRecord._id.toUpperCase()}</p>
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Uploaded On: {new Date(selectedRecord.createdAt).toLocaleString()}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-8 uppercase">Test Result Details</h2>
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                        <div className="lg:col-span-2 space-y-10">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                             {[
                               { label: 'Test Name', value: selectedRecord.testType?.name, icon: '🧪', sub: selectedRecord.testType?.description },
                               { label: 'Completed On', value: formatDate(selectedRecord.completedAt), icon: '✅' },
                               { label: 'Hospital', value: selectedRecord.hospital?.name, icon: '🏥' },
                               { label: 'Performed By', value: `Nurse ${selectedRecord.nurse?.name}`, icon: '👩‍⚕️' },
                             ].map((item, idx) => (
                               <div key={idx} className="flex gap-4">
                                 <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-lg">{item.icon}</div>
                                 <div className="min-w-0">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{item.value}</p>
                                    {item.sub && <p className="text-[10px] text-slate-500 leading-tight mt-1 truncate">{item.sub}</p>}
                                 </div>
                               </div>
                             ))}
                          </div>

                          {selectedRecord.results && (
                            <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-8 rounded-3xl border border-emerald-100 dark:border-emerald-800/50">
                               <h4 className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-4">Test Observations</h4>
                               <p className="text-sm font-bold text-slate-700 dark:text-slate-300 leading-relaxed italic whitespace-pre-wrap">{selectedRecord.results}</p>
                            </div>
                          )}
                        </div>

                        <div className="space-y-8">
                            <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Test Files</h3>
                            <div className="space-y-3">
                               {(selectedRecord.resultDocuments || []).map((doc, i) => (
                                 <a
                                   key={i}
                                   href={solveFileUrl(doc.filePath)}
                                   target="_blank"
                                   rel="noopener noreferrer"
                                   className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 border border-transparent dark:border-slate-700 rounded-2xl hover:border-indigo-500 transition-all group/doc"
                                 >
                                   <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center text-lg">📁</div>
                                   <div className="min-w-0 flex-1">
                                      <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-0.5">Test File</p>
                                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate group-hover/doc:text-indigo-500">{doc.filePath.split('/').pop()}</p>
                                   </div>
                                 </a>
                               ))}
                               {!selectedRecord.resultDocuments?.length && <p className="text-[10px] text-slate-400 italic">No files uploaded.</p>}
                            </div>
                        </div>
                      </div>
                      <div className="mt-12 p-6 bg-slate-50 dark:bg-slate-800/20 rounded-3xl flex items-center justify-between">
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Test Reference: {selectedRecord._id.toUpperCase()}</p>
                         <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full uppercase">{selectedRecord.status}</span>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-8">
                  {groupedRecords.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 p-20 rounded-[3rem] shadow-sm border border-slate-200/50 dark:border-slate-800 text-center opacity-40 grayscale">
                      <p className="text-6xl mb-6">🏥</p>
                      <p className="text-[10px] font-black uppercase tracking-widest italic">No clinical records found.</p>
                    </div>
                  ) : (
                    groupedRecords.map((group) => (
                      <div key={group.hospital?._id} className="bg-white dark:bg-slate-900 p-8 sm:p-12 rounded-[3rem] shadow-sm border border-slate-200/50 dark:border-slate-800">
                        <h2 className="text-xl font-black text-slate-900 dark:text-white mb-10 flex items-center gap-4 uppercase tracking-tight">
                          <span className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-2xl">🏥</span> 
                          {group.hospital?.name || 'Hospital'}
                        </h2>
                        <div className="overflow-x-auto -mx-8 sm:mx-0">
                          <table className="w-full text-left min-w-[800px]">
                            <thead>
                              <tr className="border-b border-slate-100 dark:border-slate-800">
                                <th className="py-4 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                                <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Clinician</th>
                                <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Files</th>
                                <th className="py-4 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {group.records.map((r) => (
                                <tr key={r._id} className="group border-b border-slate-50 dark:border-slate-800 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                  <td className="py-6 px-8 text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                    {r.recordType === 'medical_record' ? formatDate(r.visitDate) : formatDate(r.completedAt)}
                                  </td>
                                  <td className="py-6 px-4">
                                    {r.recordType === 'medical_record' ? (
                                      <span className="bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">
                                        👨‍⚕️ Clinician Visit
                                      </span>
                                    ) : (
                                      <span className="bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">
                                        🧪 {r.testType?.name || 'Diagnostic'}
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-6 px-4">
                                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                        {r.recordType === 'medical_record' ? `Dr. ${r.doctor?.name}` : `Nurse ${r.nurse?.name}`}
                                      </p>
                                      {r.recordType === 'medical_record' && <p className="text-[9px] text-slate-400 mt-0.5">{r.doctor?.specialization}</p>}
                                  </td>
                                  <td className="py-6 px-4">
                                    <div className="flex gap-1.5">
                                      {((r.recordType === 'medical_record' ? r.categorizedDocuments : r.resultDocuments) || []).slice(0, 3).map((d, i) => (
                                        <div key={i} className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] ${d.category === 'test_report' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                                          {d.category === 'test_report' ? '🧪' : '📄'}
                                        </div>
                                      ))}
                                      {((r.recordType === 'medical_record' ? r.categorizedDocuments : r.resultDocuments) || []).length > 3 && (
                                        <span className="text-[10px] text-slate-400 font-bold">+{((r.recordType === 'medical_record' ? r.categorizedDocuments : r.resultDocuments) || []).length - 3}</span>
                                      )}
                                      {!((r.recordType === 'medical_record' ? r.categorizedDocuments : r.resultDocuments) || []).length && <span className="text-slate-300 dark:text-slate-700">--</span>}
                                    </div>
                                  </td>
                                  <td className="py-6 px-8 text-right">
                                    <button 
                                      onClick={() => setSelectedRecord(r)} 
                                      className="text-indigo-600 dark:text-indigo-400 font-black text-[10px] uppercase tracking-widest hover:translate-x-1 transition-transform"
                                    >
                                      View Details →
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

          {/* ==================== ALL DOCUMENTS ==================== */}
          {tab === 'documents' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white dark:bg-slate-900 p-8 sm:p-12 rounded-[3.5rem] shadow-sm border border-slate-200/50 dark:border-slate-800">
                <div className="mb-10">
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Medical Reports</h2>
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Access all your test results and diagnostic reports.</p>
                </div>

                <div className="flex flex-wrap gap-2 mb-10 overflow-x-auto pb-2 no-scrollbar">
                  {[
                    { id: 'all', label: `All Reports (${allDocuments.length})`, color: 'bg-indigo-600', icon: '📄' },
                    { id: 'test', label: `Test Results (${testReports.length})`, color: 'bg-emerald-600', icon: '🧪' },
                    { id: 'diagnosis', label: `Doctor Reports (${diagnosisReports.length})`, color: 'bg-blue-600', icon: '📋' }
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setDocumentFilter(f.id)}
                      className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shrink-0 ${
                        documentFilter === f.id 
                          ? `${f.color} text-white shadow-lg` 
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      <span>{f.icon}</span> {f.label}
                    </button>
                  ))}
                </div>

                {allDocuments.length === 0 ? (
                  <div className="text-center py-20 opacity-40 grayscale">
                    <p className="text-6xl mb-6">📂</p>
                    <p className="text-[10px] font-black uppercase tracking-widest italic">No reports found.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {allDocuments
                      .filter(d => documentFilter === 'all' || (documentFilter === 'test' && d.category === 'test_report') || (documentFilter === 'diagnosis' && d.category === 'diagnosis_report'))
                      .map((doc, idx) => (
                        <div key={idx} className="group p-6 bg-slate-50 dark:bg-slate-800/40 rounded-[2.5rem] border border-transparent dark:border-slate-800/50 hover:border-indigo-500/50 transition-all">
                           <div className="flex items-start justify-between mb-6">
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${doc.category === 'test_report' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                                 {doc.category === 'test_report' ? '📊' : '📄'}
                              </div>
                              <span className="text-[9px] font-black text-slate-400 uppercase bg-white dark:bg-slate-800 px-3 py-1 rounded-full border dark:border-slate-700">{formatDate(doc.uploadedAt)}</span>
                           </div>
                           <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 mb-2 truncate">{doc.filePath.split('/').pop()}</h4>
                           <div className="space-y-1 mb-6">
                              <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Origin: {doc.record.hospital?.name}</p>
                           </div>
                           <div className="flex gap-2">
                              <a href={solveFileUrl(doc.filePath)} target="_blank" rel="noopener noreferrer" className="flex-1 text-center py-2.5 bg-white dark:bg-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 rounded-xl border dark:border-slate-700">Preview</a>
                              <button
                                onClick={() => {
                                  const record = groupedRecords.flatMap(g => g.records).find(r => r._id === doc.record._id);
                                  setSelectedRecord(record);
                                  setTab('hospital');
                                }}
                                className="flex-1 text-center py-2.5 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl"
                              >
                                Source
                              </button>
                           </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================== MY UPLOADS (SELF) ==================== */}
          {tab === 'self' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white dark:bg-slate-900 p-8 sm:p-12 rounded-[3.5rem] shadow-sm border border-slate-200/50 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">My Uploads</h2>
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Medical documents uploaded by you.</p>
                  </div>
                  <button
                    onClick={() => setShowForm(!showForm)}
                    className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      showForm ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600' : 'bg-indigo-600 text-white shadow-lg'
                    }`}
                  >
                    {showForm ? 'Cancel' : 'Upload New +'}
                  </button>
                </div>

                {showForm && (
                  <form onSubmit={handleCreateSelfRecord} className="p-8 bg-slate-50 dark:bg-slate-800/30 rounded-[2.5rem] border dark:border-slate-800 mb-10 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-6">
                          <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Record Title *</label>
                            <input
                              type="text"
                              value={formData.title}
                              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                              className="w-full px-6 py-4 bg-white dark:bg-slate-900 border-none rounded-2xl text-xs font-bold text-slate-800 dark:text-white ring-1 ring-slate-200 dark:ring-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                              placeholder="E.g., Blood Test Result"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Record Date</label>
                            <input
                              type="date"
                              value={formData.recordDate}
                              onChange={(e) => setFormData({ ...formData, recordDate: e.target.value })}
                              className="w-full px-6 py-4 bg-white dark:bg-slate-900 border-none rounded-2xl text-xs font-bold text-slate-800 dark:text-white ring-1 ring-slate-200 dark:ring-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                       </div>
                       <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Description / Notes</label>
                          <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full h-[155px] px-6 py-4 bg-white dark:bg-slate-900 border-none rounded-2xl text-xs font-bold text-slate-800 dark:text-white ring-1 ring-slate-200 dark:ring-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                            placeholder="Add any notes here..."
                          />
                       </div>
                    </div>

                    <div className="space-y-4">
                       <div className="flex gap-2 bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-xl w-fit">
                          {['file', 'link'].map(m => (
                            <button key={m} type="button" onClick={() => setDocMode(m)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase ${docMode === m ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}>
                              {m === 'file' ? 'File' : 'Link'}
                            </button>
                          ))}
                       </div>
                       <div className="mt-4">
                          {docMode === 'file' ? (
                             <input type="file" onChange={(e) => setFormFile(e.target.files[0] || null)} className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-indigo-50 file:text-indigo-700" />
                          ) : (
                             <input type="url" value={formLink} onChange={(e) => setFormLink(e.target.value)} placeholder="URL link..." className="w-full px-6 py-4 bg-white dark:bg-slate-900 border-none rounded-2xl text-xs font-bold ring-1 ring-slate-200 dark:ring-slate-800 outline-none" />
                          )}
                       </div>
                    </div>

                    <button type="submit" disabled={formLoading} className="w-full py-4 bg-indigo-600 text-white text-[10px] font-black uppercase rounded-2xl shadow-lg disabled:opacity-50">
                      {formLoading ? 'Uploading...' : 'Save Record'}
                    </button>
                  </form>
                )}

                {selfRecords.length === 0 ? (
                  <div className="text-center py-20 opacity-40 grayscale">
                    <p className="text-6xl mb-6">📝</p>
                    <p className="text-[10px] font-black uppercase tracking-widest italic">No records uploaded by you.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {selfRecords.map((r) => (
                      <div key={r._id} className="group p-8 bg-slate-50 dark:bg-slate-800/40 rounded-[2.5rem] border border-transparent dark:border-slate-800/50 hover:border-indigo-500/50 transition-all">
                         <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center text-2xl mb-6">📄</div>
                         <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 mb-2 truncate">{r.title}</h3>
                         <div className="flex justify-between items-center pt-6 border-t dark:border-slate-800/50 mt-6">
                            <div className="space-y-1">
                               <p className="text-[8px] font-black text-slate-400 uppercase">{formatDate(r.recordDate)}</p>
                            </div>
                            <div className="flex gap-2">
                               <a href={r.documentPath} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm border dark:border-slate-700 hover:scale-110 transition-all">👁️</a>
                               <button onClick={() => handleDeleteSelfRecord(r._id)} className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center text-rose-500 shadow-sm border dark:border-slate-700 hover:scale-110 transition-all">🗑️</button>
                            </div>
                         </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================== DOCTOR ACCESS ==================== */}
          {tab === 'doctors' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white dark:bg-slate-900 p-8 sm:p-12 rounded-[3.5rem] shadow-sm border border-slate-200/50 dark:border-slate-800">
                <div className="mb-10">
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Doctor Access</h2>
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Clinicians authorized to view your medical records.</p>
                </div>

                {trustedDoctors.length === 0 ? (
                  <div className="text-center py-20 opacity-40 grayscale">
                    <p className="text-6xl mb-6">👨‍⚕️</p>
                    <p className="text-[10px] font-black uppercase tracking-widest italic leading-relaxed">No doctors currently have access to your records.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {trustedDoctors.map((access) => (
                      <div key={access._id} className="group p-8 bg-slate-50 dark:bg-slate-800/40 rounded-[2.5rem] border border-transparent dark:border-slate-800/50 hover:border-indigo-500 transition-all flex flex-col">
                         <div className="flex items-center gap-6 mb-8">
                            <div className="w-16 h-16 rounded-[1.25rem] bg-indigo-600 text-white flex items-center justify-center text-3xl font-black shadow-lg">
                               {access.doctor?.name?.[0].toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                               <p className="text-sm font-black text-slate-900 dark:text-white truncate">Dr. {access.doctor?.name}</p>
                               <p className="text-[10px] font-black text-indigo-500 uppercase">{access.doctor?.specialization}</p>
                            </div>
                         </div>
                         <div className="space-y-2 mb-8 flex-1">
                            <div className="flex justify-between items-center bg-white/50 dark:bg-slate-800/50 p-3 rounded-xl border dark:border-slate-700">
                               <span className="text-[9px] font-black text-slate-400">STATUS</span>
                               <span className="text-[9px] font-black text-emerald-500 uppercase">ACCESS GRANTED</span>
                            </div>
                         </div>
                         <button onClick={() => handleRevokeAccess(access.doctor?._id)} className="w-full py-4 bg-rose-50 dark:bg-rose-900/10 text-rose-600 text-[10px] font-black uppercase rounded-2xl border border-rose-100 dark:border-rose-900/30 hover:bg-rose-600 hover:text-white transition-all">
                           Revoke Access
                         </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
};

export default PatientMedicalRecords;
