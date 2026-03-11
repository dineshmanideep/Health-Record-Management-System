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

  // Get all documents from all records in timeline order
  const getAllDocuments = () => {
    const allDocs = [];
    groupedRecords.forEach(group => {
      group.records.forEach(record => {
        if (record.recordType === 'medical_record') {
          // Handle doctor-created medical records
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
          // Handle test assignments
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
    
    // Sort by upload date (newest first)
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
    <DashboardLayout title="Medical Records">
      {error && <p className="text-red-600 mb-4">{error}</p>}

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setSelectedRecord(null); }}
            className={`px-5 py-2.5 rounded-lg font-medium text-sm border-none cursor-pointer transition-colors ${
              tab === t.key ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-500">Loading records...</p>
      ) : (
        <>
          {/* ==================== HOSPITAL RECORDS ==================== */}
          {tab === 'hospital' && (
            <>
              {selectedRecord ? (
                <div className="bg-white p-8 rounded-xl shadow-sm">
                  <button onClick={() => setSelectedRecord(null)} className="text-purple-600 font-medium mb-4 cursor-pointer bg-transparent border-none text-sm">
                    ← Back to Records
                  </button>
                  
                  {selectedRecord.recordType === 'medical_record' ? (
                    /* MEDICAL RECORD DETAIL VIEW */
                    <>
                      <h2 className="text-2xl font-semibold text-gray-800 mb-4">Visit Details</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div><span className="font-semibold text-gray-600">Visit Date:</span> <span>{formatDate(selectedRecord.visitDate)}</span></div>
                          <div><span className="font-semibold text-gray-600">Doctor:</span> <span>Dr. {selectedRecord.doctor?.name} ({selectedRecord.doctor?.specialization})</span></div>
                          <div><span className="font-semibold text-gray-600">Hospital:</span> <span>{selectedRecord.hospital?.name}</span></div>
                          <div><span className="font-semibold text-gray-600">Recorded By:</span> <span>Nurse {selectedRecord.nurse?.name}</span></div>
                          <div><span className="font-semibold text-gray-600">Diagnosis:</span> <span>{selectedRecord.diagnosis}</span></div>
                          {selectedRecord.symptoms && <div><span className="font-semibold text-gray-600">Symptoms:</span> <span>{selectedRecord.symptoms}</span></div>}
                          {selectedRecord.recommendedTests && <div><span className="font-semibold text-gray-600">Recommended Tests:</span> <span>{selectedRecord.recommendedTests}</span></div>}
                          {selectedRecord.nextVisitDate && <div><span className="font-semibold text-gray-600">Next Visit:</span> <span className="text-yellow-700 font-medium">{formatDate(selectedRecord.nextVisitDate)}</span></div>}
                        </div>
                        <div className="space-y-3">
                          {selectedRecord.prescriptionNotes && (
                            <div>
                              <span className="font-semibold text-gray-600 block mb-1">Prescription:</span>
                              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded text-sm whitespace-pre-wrap">
                                {selectedRecord.prescriptionNotes}
                              </div>
                            </div>
                          )}
                          
                          {/* Test Reports */}
                          {selectedRecord.categorizedDocuments?.filter(d => d.category === 'test_report').length > 0 && (
                            <div>
                              <span className="font-semibold text-gray-600 block mb-2">🧪 Test Reports:</span>
                              <div className="space-y-2">
                                {selectedRecord.categorizedDocuments
                                  .filter(d => d.category === 'test_report')
                                  .map((doc, i) => (
                                    <a
                                      key={i}
                                      href={doc.filePath.startsWith('http') ? doc.filePath : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${doc.filePath}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center justify-between gap-2 text-green-700 hover:text-green-900 font-medium text-sm bg-green-50 border border-green-200 px-4 py-3 rounded-lg"
                                    >
                                      <span className="flex items-center gap-2">
                                        📊 {doc.filePath.split('/').pop()}
                                      </span>
                                      <span className="text-xs text-green-600">
                                        {new Date(doc.uploadedAt).toLocaleDateString()}
                                      </span>
                                    </a>
                                  ))}
                              </div>
                            </div>
                          )}

                          {/* Diagnosis Reports */}
                          {selectedRecord.categorizedDocuments?.filter(d => d.category === 'diagnosis_report').length > 0 && (
                            <div>
                              <span className="font-semibold text-gray-600 block mb-2">📋 Diagnosis Reports:</span>
                              <div className="space-y-2">
                                {selectedRecord.categorizedDocuments
                                  .filter(d => d.category === 'diagnosis_report')
                                  .map((doc, i) => (
                                    <a
                                      key={i}
                                      href={doc.filePath.startsWith('http') ? doc.filePath : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${doc.filePath}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center justify-between gap-2 text-purple-700 hover:text-purple-900 font-medium text-sm bg-purple-50 border border-purple-200 px-4 py-3 rounded-lg"
                                    >
                                      <span className="flex items-center gap-2">
                                        📄 {doc.filePath.split('/').pop()}
                                      </span>
                                      <span className="text-xs text-purple-600">
                                        {new Date(doc.uploadedAt).toLocaleDateString()}
                                      </span>
                                    </a>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      {selectedRecord.healthMetrics && Object.values(selectedRecord.healthMetrics).some(v => v != null) && (
                        <div className="mt-6">
                          <h3 className="font-semibold text-gray-700 mb-3">Health Metrics</h3>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {selectedRecord.healthMetrics.bloodSugar != null && (
                              <div className="bg-green-50 p-3 rounded text-center">
                                <p className="text-xs text-gray-500">Blood Sugar</p>
                                <p className="text-lg font-bold text-green-700">{selectedRecord.healthMetrics.bloodSugar} mg/dL</p>
                              </div>
                            )}
                            {selectedRecord.healthMetrics.bloodPressureSystolic != null && (
                              <div className="bg-red-50 p-3 rounded text-center">
                                <p className="text-xs text-gray-500">Blood Pressure</p>
                                <p className="text-lg font-bold text-red-700">{selectedRecord.healthMetrics.bloodPressureSystolic}/{selectedRecord.healthMetrics.bloodPressureDiastolic} mmHg</p>
                              </div>
                            )}
                            {selectedRecord.healthMetrics.thyroidTSH != null && (
                              <div className="bg-blue-50 p-3 rounded text-center">
                                <p className="text-xs text-gray-500">Thyroid (TSH)</p>
                                <p className="text-lg font-bold text-blue-700">{selectedRecord.healthMetrics.thyroidTSH} mIU/L</p>
                              </div>
                            )}
                            {selectedRecord.healthMetrics.heartRate != null && (
                              <div className="bg-purple-50 p-3 rounded text-center">
                                <p className="text-xs text-gray-500">Heart Rate</p>
                                <p className="text-lg font-bold text-purple-700">{selectedRecord.healthMetrics.heartRate} bpm</p>
                              </div>
                            )}
                            {selectedRecord.healthMetrics.weight != null && (
                              <div className="bg-yellow-50 p-3 rounded text-center">
                                <p className="text-xs text-gray-500">Weight</p>
                                <p className="text-lg font-bold text-yellow-700">{selectedRecord.healthMetrics.weight} kg</p>
                              </div>
                            )}
                            {selectedRecord.healthMetrics.height != null && (
                              <div className="bg-indigo-50 p-3 rounded text-center">
                                <p className="text-xs text-gray-500">Height</p>
                                <p className="text-lg font-bold text-indigo-700">{selectedRecord.healthMetrics.height} cm</p>
                              </div>
                            )}
                            {selectedRecord.healthMetrics.temperature != null && (
                              <div className="bg-orange-50 p-3 rounded text-center">
                                <p className="text-xs text-gray-500">Temperature</p>
                                <p className="text-lg font-bold text-orange-700">{selectedRecord.healthMetrics.temperature} °F</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {selectedRecord.editHistory?.length > 0 && (
                        <div className="mt-6">
                          <h3 className="font-semibold text-gray-700 mb-3">Edit History</h3>
                          <div className="space-y-2">
                            {selectedRecord.editHistory.map((edit, i) => (
                              <div key={i} className="bg-yellow-50 p-3 rounded text-sm">
                                <p className="font-medium text-gray-700">{edit.summary}</p>
                                <p className="text-gray-500 text-xs mt-1">{new Date(edit.editedAt).toLocaleString()}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <p className="text-xs text-gray-400 mt-4">Record created: {new Date(selectedRecord.createdAt).toLocaleString()}</p>
                    </>
                  ) : (
                    /* TEST ASSIGNMENT DETAIL VIEW */
                    <>
                      <h2 className="text-2xl font-semibold text-gray-800 mb-4">Test Assignment Details</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div><span className="font-semibold text-gray-600">Test Type:</span> <span className="text-lg font-medium text-green-700">🧪 {selectedRecord.testType?.name}</span></div>
                          {selectedRecord.testType?.description && <div><span className="font-semibold text-gray-600">Description:</span> <span className="text-sm text-gray-500">{selectedRecord.testType.description}</span></div>}
                          <div><span className="font-semibold text-gray-600">Completed Date:</span> <span>{formatDate(selectedRecord.completedAt)}</span></div>
                          <div><span className="font-semibold text-gray-600">Hospital:</span> <span>{selectedRecord.hospital?.name}</span></div>
                          <div><span className="font-semibold text-gray-600">Performed By:</span> <span>Nurse {selectedRecord.nurse?.name}</span></div>
                          <div><span className="font-semibold text-gray-600">Status:</span> <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-medium">{selectedRecord.status}</span></div>
                        </div>
                        <div className="space-y-3">
                          {selectedRecord.results && (
                            <div>
                              <span className="font-semibold text-gray-600 block mb-1">Test Results:</span>
                              <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded text-sm whitespace-pre-wrap">
                                {selectedRecord.results}
                              </div>
                            </div>
                          )}
                          {selectedRecord.notes && (
                            <div>
                              <span className="font-semibold text-gray-600 block mb-1">Notes:</span>
                              <div className="bg-gray-50 p-3 rounded text-sm whitespace-pre-wrap">
                                {selectedRecord.notes}
                              </div>
                            </div>
                          )}
                          
                          {/* Test Reports */}
                          {selectedRecord.resultDocuments?.filter(d => d.category === 'test_report').length > 0 && (
                            <div>
                              <span className="font-semibold text-gray-600 block mb-2">🧪 Test Reports:</span>
                              <div className="space-y-2">
                                {selectedRecord.resultDocuments
                                  .filter(d => d.category === 'test_report')
                                  .map((doc, i) => (
                                    <a
                                      key={i}
                                      href={doc.filePath.startsWith('http') ? doc.filePath : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${doc.filePath}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center justify-between gap-2 text-green-700 hover:text-green-900 font-medium text-sm bg-green-50 border border-green-200 px-4 py-3 rounded-lg"
                                    >
                                      <span className="flex items-center gap-2">
                                        📊 {doc.filePath.split('/').pop()}
                                      </span>
                                      <span className="text-xs text-green-600">
                                        {new Date(doc.uploadedAt).toLocaleDateString()}
                                      </span>
                                    </a>
                                  ))}
                              </div>
                            </div>
                          )}

                          {/* Diagnosis Reports */}
                          {selectedRecord.resultDocuments?.filter(d => d.category === 'diagnosis_report').length > 0 && (
                            <div>
                              <span className="font-semibold text-gray-600 block mb-2">📋 Diagnosis Reports:</span>
                              <div className="space-y-2">
                                {selectedRecord.resultDocuments
                                  .filter(d => d.category === 'diagnosis_report')
                                  .map((doc, i) => (
                                    <a
                                      key={i}
                                      href={doc.filePath.startsWith('http') ? doc.filePath : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${doc.filePath}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center justify-between gap-2 text-purple-700 hover:text-purple-900 font-medium text-sm bg-purple-50 border border-purple-200 px-4 py-3 rounded-lg"
                                    >
                                      <span className="flex items-center gap-2">
                                        📄 {doc.filePath.split('/').pop()}
                                      </span>
                                      <span className="text-xs text-purple-600">
                                        {new Date(doc.uploadedAt).toLocaleDateString()}
                                      </span>
                                    </a>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mt-4">Test assigned: {new Date(selectedRecord.createdAt).toLocaleString()}</p>
                    </>
                  )}
                </div>
              ) : (
                <>
                  {groupedRecords.length === 0 ? (
                    <div className="bg-white p-8 rounded-xl shadow-sm text-center text-gray-500">
                      No hospital records found. Records will appear here after hospital visits.
                    </div>
                  ) : (
                    groupedRecords.map((group) => (
                      <div key={group.hospital?._id} className="bg-white p-8 rounded-xl shadow-sm mb-5">
                        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                          <span>🏥</span> {group.hospital?.name || 'Unknown Hospital'}
                        </h2>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="border-b border-gray-200">
                                <th className="py-3 px-4 text-sm font-semibold text-gray-600">Date</th>
                                <th className="py-3 px-4 text-sm font-semibold text-gray-600">Type</th>
                                <th className="py-3 px-4 text-sm font-semibold text-gray-600">Details</th>
                                <th className="py-3 px-4 text-sm font-semibold text-gray-600">Staff</th>
                                <th className="py-3 px-4 text-sm font-semibold text-gray-600">Documents</th>
                                <th className="py-3 px-4 text-sm font-semibold text-gray-600">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {group.records.map((r) => (
                                <tr key={r._id} className="border-b border-gray-100 hover:bg-gray-50">
                                  <td className="py-3 px-4 text-sm">
                                    {r.recordType === 'medical_record' 
                                      ? formatDate(r.visitDate) 
                                      : formatDate(r.completedAt)}
                                  </td>
                                  <td className="py-3 px-4 text-sm">
                                    {r.recordType === 'medical_record' ? (
                                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium">
                                        👨‍⚕️ Doctor Visit
                                      </span>
                                    ) : (
                                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-medium">
                                        🧪 {r.testType?.name || 'Test'}
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 text-sm">
                                    {r.recordType === 'medical_record' 
                                      ? r.diagnosis 
                                      : (r.results || r.notes || 'Test completed')}
                                  </td>
                                  <td className="py-3 px-4 text-sm">
                                    {r.recordType === 'medical_record' ? (
                                      <>Dr. {r.doctor?.name} <span className="text-gray-400 text-xs">({r.doctor?.specialization})</span></>
                                    ) : (
                                      <>Nurse {r.nurse?.name}</>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 text-xs">
                                    {r.recordType === 'medical_record' && r.categorizedDocuments?.length > 0 ? (
                                      <div className="flex gap-2">
                                        {r.categorizedDocuments.filter(d => d.category === 'test_report').length > 0 && (
                                          <span className="bg-green-100 text-green-700 px-2 py-1 rounded">
                                            🧪 {r.categorizedDocuments.filter(d => d.category === 'test_report').length}
                                          </span>
                                        )}
                                        {r.categorizedDocuments.filter(d => d.category === 'diagnosis_report').length > 0 && (
                                          <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded">
                                            📋 {r.categorizedDocuments.filter(d => d.category === 'diagnosis_report').length}
                                          </span>
                                        )}
                                      </div>
                                    ) : r.recordType === 'test_assignment' && r.resultDocuments?.length > 0 ? (
                                      <div className="flex gap-2">
                                        {r.resultDocuments.filter(d => d.category === 'test_report').length > 0 && (
                                          <span className="bg-green-100 text-green-700 px-2 py-1 rounded">
                                            🧪 {r.resultDocuments.filter(d => d.category === 'test_report').length}
                                          </span>
                                        )}
                                        {r.resultDocuments.filter(d => d.category === 'diagnosis_report').length > 0 && (
                                          <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded">
                                            📋 {r.resultDocuments.filter(d => d.category === 'diagnosis_report').length}
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-gray-400">—</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 text-sm">
                                    <button onClick={() => setSelectedRecord(r)} className="text-purple-600 hover:text-purple-800 font-medium bg-transparent border-none cursor-pointer text-sm">
                                      View Details
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
                </>
              )}
            </>
          )}
          {/* ==================== ALL DOCUMENTS ==================== */}
          {tab === 'documents' && (
            <div className="bg-white p-8 rounded-xl shadow-sm">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-gray-800 mb-2">Medical Documents</h2>
                <p className="text-sm text-gray-500">All test reports and diagnosis documents from your hospital visits</p>
              </div>

              {/* Filter Buttons */}
              <div className="flex gap-3 mb-6">
                <button
                  onClick={() => setDocumentFilter('all')}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    documentFilter === 'all' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All Documents ({allDocuments.length})
                </button>
                <button
                  onClick={() => setDocumentFilter('test')}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    documentFilter === 'test' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  🧪 Test Reports ({testReports.length})
                </button>
                <button
                  onClick={() => setDocumentFilter('diagnosis')}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    documentFilter === 'diagnosis' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  📋 Diagnosis Reports ({diagnosisReports.length})
                </button>
              </div>

              {allDocuments.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-6xl mb-4">📄</p>
                  <p>No medical documents found yet.</p>
                  <p className="text-sm mt-2">Documents will appear here after hospital visits and tests.</p>
                </div>
              ) : (
                <>
                  {/* Test Reports Section */}
                  {(documentFilter === 'all' || documentFilter === 'test') && testReports.length > 0 && (
                    <div className="mb-8">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <span>🧪</span> Test Reports ({testReports.length})
                      </h3>
                      <div className="space-y-3">
                        {testReports.map((doc, idx) => (
                          <div key={idx} className="border-l-4 border-green-500 bg-green-50 p-4 rounded-lg hover:bg-green-100 transition-colors">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <a
                                    href={doc.filePath.startsWith('http') ? doc.filePath : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${doc.filePath}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-green-700 hover:text-green-900 font-semibold flex items-center gap-2 no-underline"
                                  >
                                    <span className="text-2xl">📊</span>
                                    <span>{doc.filePath.split('/').pop()}</span>
                                  </a>
                                  <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full font-medium">
                                    {new Date(doc.uploadedAt).toLocaleDateString()}
                                  </span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-700">
                                  {doc.record.recordType === 'medical_record' ? (
                                    <>
                                      <div>
                                        <span className="font-medium">Visit Date:</span> {formatDate(doc.record.visitDate)}
                                      </div>
                                      <div>
                                        <span className="font-medium">Doctor:</span> Dr. {doc.record.doctor?.name} ({doc.record.doctor?.specialization})
                                      </div>
                                      <div>
                                        <span className="font-medium">Hospital:</span> {doc.record.hospital?.name}
                                      </div>
                                      <div>
                                        <span className="font-medium">Diagnosis:</span> {doc.record.diagnosis}
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <div>
                                        <span className="font-medium">Test Date:</span> {formatDate(doc.record.completedAt)}
                                      </div>
                                      <div>
                                        <span className="font-medium">Test Type:</span> 🧪 {doc.record.testType?.name}
                                      </div>
                                      <div>
                                        <span className="font-medium">Hospital:</span> {doc.record.hospital?.name}
                                      </div>
                                      <div>
                                        <span className="font-medium">Performed By:</span> Nurse {doc.record.nurse?.name}
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  const record = groupedRecords.flatMap(g => g.records).find(r => r._id === doc.record._id);
                                  setSelectedRecord(record);
                                  setTab('hospital');
                                }}
                                className="text-green-700 hover:text-green-900 font-medium text-sm bg-white border border-green-300 px-3 py-2 rounded-lg hover:bg-green-50 transition-colors"
                              >
                                View Record
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Diagnosis Reports Section */}
                  {(documentFilter === 'all' || documentFilter === 'diagnosis') && diagnosisReports.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <span>📋</span> Diagnosis Reports ({diagnosisReports.length})
                      </h3>
                      <div className="space-y-3">
                        {diagnosisReports.map((doc, idx) => (
                          <div key={idx} className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded-lg hover:bg-blue-100 transition-colors">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <a
                                    href={doc.filePath.startsWith('http') ? doc.filePath : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${doc.filePath}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-700 hover:text-blue-900 font-semibold flex items-center gap-2 no-underline"
                                  >
                                    <span className="text-2xl">📄</span>
                                    <span>{doc.filePath.split('/').pop()}</span>
                                  </a>
                                  <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full font-medium">
                                    {new Date(doc.uploadedAt).toLocaleDateString()}
                                  </span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-700">
                                  {doc.record.recordType === 'medical_record' ? (
                                    <>
                                      <div>
                                        <span className="font-medium">Visit Date:</span> {formatDate(doc.record.visitDate)}
                                      </div>
                                      <div>
                                        <span className="font-medium">Doctor:</span> Dr. {doc.record.doctor?.name} ({doc.record.doctor?.specialization})
                                      </div>
                                      <div>
                                        <span className="font-medium">Hospital:</span> {doc.record.hospital?.name}
                                      </div>
                                      <div>
                                        <span className="font-medium">Diagnosis:</span> {doc.record.diagnosis}
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <div>
                                        <span className="font-medium">Test Date:</span> {formatDate(doc.record.completedAt)}
                                      </div>
                                      <div>
                                        <span className="font-medium">Test Type:</span> 🧪 {doc.record.testType?.name}
                                      </div>
                                      <div>
                                        <span className="font-medium">Hospital:</span> {doc.record.hospital?.name}
                                      </div>
                                      <div>
                                        <span className="font-medium">Performed By:</span> Nurse {doc.record.nurse?.name}
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  const record = groupedRecords.flatMap(g => g.records).find(r => r._id === doc.record._id);
                                  setSelectedRecord(record);
                                  setTab('hospital');
                                }}
                                className="text-blue-700 hover:text-blue-900 font-medium text-sm bg-white border border-blue-300 px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors"
                              >
                                View Record
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* No documents message for filtered view */}
                  {documentFilter === 'test' && testReports.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      <p className="text-4xl mb-2">🧪</p>
                      <p>No test reports found.</p>
                    </div>
                  )}
                  {documentFilter === 'diagnosis' && diagnosisReports.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      <p className="text-4xl mb-2">📋</p>
                      <p>No diagnosis reports found.</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          {/* ==================== SELF-UPLOADED RECORDS ==================== */}
          {tab === 'self' && (
            <div className="bg-white p-8 rounded-xl shadow-sm">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-xl font-semibold text-gray-800">Self-Uploaded Documents</h2>
                <button
                  onClick={() => setShowForm(!showForm)}
                  className="bg-purple-600 text-white px-4 py-2 rounded-md font-medium text-sm hover:bg-purple-700 transition-colors border-none cursor-pointer"
                >
                  {showForm ? 'Cancel' : '+ Upload Document'}
                </button>
              </div>

              {showForm && (
                <form onSubmit={handleCreateSelfRecord} className="bg-gray-50 p-5 rounded-lg mb-5 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      rows="2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Document *</label>
                    {/* Toggle */}
                    <div className="flex gap-1 mb-3 bg-gray-200 rounded-lg p-1 w-fit">
                      <button
                        type="button"
                        onClick={() => setDocMode('file')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors border-none cursor-pointer ${
                          docMode === 'file' ? 'bg-white text-purple-700 shadow-sm' : 'bg-transparent text-gray-500'
                        }`}
                      >
                        📁 Upload File
                      </button>
                      <button
                        type="button"
                        onClick={() => setDocMode('link')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors border-none cursor-pointer ${
                          docMode === 'link' ? 'bg-white text-purple-700 shadow-sm' : 'bg-transparent text-gray-500'
                        }`}
                      >
                        🔗 Paste Link
                      </button>
                    </div>

                    {docMode === 'file' ? (
                      <div>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => setFormFile(e.target.files[0] || null)}
                          className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                        />
                        <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG — max 5 MB</p>
                        {formFile && <p className="text-xs text-green-600 mt-1">✓ {formFile.name}</p>}
                      </div>
                    ) : (
                      <div>
                        <input
                          type="url"
                          value={formLink}
                          onChange={(e) => setFormLink(e.target.value)}
                          placeholder="https://drive.google.com/... or any document URL"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                        <p className="text-xs text-gray-400 mt-1">Google Drive, Dropbox, OneDrive, or any public link</p>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Record Date</label>
                    <input
                      type="date"
                      value={formData.recordDate}
                      onChange={(e) => setFormData({ ...formData, recordDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="bg-green-600 text-white px-6 py-2 rounded-md font-medium text-sm hover:bg-green-700 transition-colors border-none cursor-pointer disabled:opacity-50"
                  >
                    {formLoading ? 'Saving...' : 'Save Record'}
                  </button>
                </form>
              )}

              {selfRecords.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No self-uploaded documents yet.</p>
              ) : (
                <div className="space-y-3">
                  {selfRecords.map((r) => (
                    <div key={r._id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div>
                        <p className="font-semibold text-gray-800">{r.title}</p>
                        {r.description && <p className="text-sm text-gray-500 mt-1">{r.description}</p>}
                        <p className="text-xs text-gray-400 mt-1">Uploaded: {formatDate(r.createdAt)} | Record Date: {formatDate(r.recordDate)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <a
                          href={r.documentPath}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-600 hover:text-purple-800 font-medium text-sm"
                        >
                          📄 View
                        </a>
                        <button
                          onClick={() => handleDeleteSelfRecord(r._id)}
                          className="text-red-600 hover:text-red-800 font-medium bg-transparent border-none cursor-pointer text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ==================== TRUSTED DOCTORS ==================== */}
          {tab === 'doctors' && (
            <div className="bg-white p-8 rounded-xl shadow-sm">
              <h2 className="text-xl font-semibold text-gray-800 mb-5">Trusted Doctors</h2>
              <p className="text-sm text-gray-500 mb-5">
                These doctors have access to your medical records. You can revoke access at any time.
              </p>

              {trustedDoctors.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No trusted doctors yet. Generate an OTP from your dashboard to grant a doctor access.</p>
              ) : (
                <div className="space-y-3">
                  {trustedDoctors.map((access) => (
                    <div key={access._id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div>
                        <p className="font-semibold text-gray-800">Dr. {access.doctor?.name}</p>
                        <p className="text-sm text-gray-500">{access.doctor?.specialization} | {access.doctor?.email}</p>
                        <p className="text-xs text-gray-400 mt-1">Access granted: {formatDate(access.grantedAt)} via {access.accessMethod?.toUpperCase()}</p>
                      </div>
                      <button
                        onClick={() => handleRevokeAccess(access.doctor?._id)}
                        className="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-md font-medium text-sm border border-red-200 cursor-pointer transition-colors"
                      >
                        Revoke Access
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
};

export default PatientMedicalRecords;
