import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { patientService } from '../../services/api';

const PatientMedicalRecords = () => {
  const [tab, setTab] = useState('hospital'); // 'hospital' | 'self' | 'doctors'
  const [groupedRecords, setGroupedRecords] = useState([]);
  const [selfRecords, setSelfRecords] = useState([]);
  const [trustedDoctors, setTrustedDoctors] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Self-record form state
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', documentPath: '', recordDate: '' });
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
    if (!formData.title || !formData.documentPath) return;
    setFormLoading(true);
    try {
      const res = await patientService.createSelfRecord(formData);
      if (res.success) {
        setSelfRecords([res.data, ...selfRecords]);
        setFormData({ title: '', description: '', documentPath: '', recordDate: '' });
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

  const tabs = [
    { key: 'hospital', label: 'Hospital Records' },
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
                          <span className="font-semibold text-gray-600 block mb-1">Prescription Notes:</span>
                          <p className="bg-gray-50 p-3 rounded text-sm">{selectedRecord.prescriptionNotes}</p>
                        </div>
                      )}
                      {selectedRecord.medications?.length > 0 && (
                        <div>
                          <span className="font-semibold text-gray-600 block mb-2">Medications:</span>
                          <div className="space-y-2">
                            {selectedRecord.medications.map((med, i) => (
                              <div key={i} className="bg-blue-50 p-3 rounded text-sm">
                                <p className="font-medium">{med.name}</p>
                                <p className="text-gray-600">Dosage: {med.dosage} | {med.frequency} | {med.duration}</p>
                              </div>
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
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-4">Record created: {new Date(selectedRecord.createdAt).toLocaleString()}</p>
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
                                <th className="py-3 px-4 text-sm font-semibold text-gray-600">Visit Date</th>
                                <th className="py-3 px-4 text-sm font-semibold text-gray-600">Doctor</th>
                                <th className="py-3 px-4 text-sm font-semibold text-gray-600">Diagnosis</th>
                                <th className="py-3 px-4 text-sm font-semibold text-gray-600">Next Visit</th>
                                <th className="py-3 px-4 text-sm font-semibold text-gray-600">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {group.records.map((r) => (
                                <tr key={r._id} className="border-b border-gray-100 hover:bg-gray-50">
                                  <td className="py-3 px-4 text-sm">{formatDate(r.visitDate)}</td>
                                  <td className="py-3 px-4 text-sm">Dr. {r.doctor?.name} <span className="text-gray-400">({r.doctor?.specialization})</span></td>
                                  <td className="py-3 px-4 text-sm">{r.diagnosis}</td>
                                  <td className="py-3 px-4 text-sm">{r.nextVisitDate ? formatDate(r.nextVisitDate) : '—'}</td>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Document URL / Path *</label>
                    <input
                      type="text"
                      value={formData.documentPath}
                      onChange={(e) => setFormData({ ...formData, documentPath: e.target.value })}
                      placeholder="e.g., https://example.com/report.pdf"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      required
                    />
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
                      <div className="flex gap-2">
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
