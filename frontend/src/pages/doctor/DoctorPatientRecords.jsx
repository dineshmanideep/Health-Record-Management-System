import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { doctorService } from '../../services/api';

const DoctorPatientRecords = () => {
  const { patientId } = useParams();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);

  useEffect(() => {
    doctorService.getPatientRecords(patientId)
      .then((res) => setRecords(res.data || []))
      .catch((err) => setError(err?.response?.data?.message || 'Failed to load records'))
      .finally(() => setLoading(false));
  }, [patientId]);

  // Group records by hospital
  const groupedByHospital = records.reduce((acc, r) => {
    const hName = r.hospital?.name || 'Unknown Hospital';
    if (!acc[hName]) acc[hName] = [];
    acc[hName].push(r);
    return acc;
  }, {});

  return (
    <DashboardLayout title="Patient Medical Records">
      <div className="mb-4">
        <Link to="/doctor/patients" className="text-purple-600 hover:text-purple-700 text-sm font-semibold no-underline">
          ← Back to Patients
        </Link>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading records...</p>
      ) : error ? (
        <div className="bg-red-50 p-6 rounded-xl text-center">
          <p className="text-red-600 font-medium">{error}</p>
        </div>
      ) : records.length === 0 ? (
        <div className="bg-white p-12 rounded-xl shadow-sm text-center">
          <p className="text-6xl mb-4">📋</p>
          <p className="text-gray-500 text-lg">No medical records found for this patient</p>
        </div>
      ) : (
        <>
          {/* Record detail modal */}
          {selectedRecord && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8">
                <div className="flex justify-between items-start mb-6">
                  <h2 className="text-xl font-bold text-gray-800">Medical Record Details</h2>
                  <button onClick={() => setSelectedRecord(null)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
                </div>

                <div className="space-y-4 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="font-semibold text-gray-600 block">Visit Date</span>
                      <span className="text-gray-800">{new Date(selectedRecord.visitDate).toLocaleDateString()}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-600 block">Hospital</span>
                      <span className="text-gray-800">{selectedRecord.hospital?.name || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-600 block">Doctor</span>
                      <span className="text-gray-800">Dr. {selectedRecord.doctor?.name || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-600 block">Nurse</span>
                      <span className="text-gray-800">{selectedRecord.nurse?.name || 'N/A'}</span>
                    </div>
                  </div>

                  <div>
                    <span className="font-semibold text-gray-600 block mb-1">Diagnosis</span>
                    <p className="text-gray-800 bg-gray-50 p-3 rounded-lg">{selectedRecord.diagnosis}</p>
                  </div>

                  {selectedRecord.symptoms && (
                    <div>
                      <span className="font-semibold text-gray-600 block mb-1">Symptoms</span>
                      <p className="text-gray-800 bg-gray-50 p-3 rounded-lg">{selectedRecord.symptoms}</p>
                    </div>
                  )}

                  {selectedRecord.prescriptionNotes && (
                    <div>
                      <span className="font-semibold text-gray-600 block mb-1">Prescription Notes</span>
                      <p className="text-gray-800 bg-gray-50 p-3 rounded-lg">{selectedRecord.prescriptionNotes}</p>
                    </div>
                  )}

                  {selectedRecord.medications?.length > 0 && (
                    <div>
                      <span className="font-semibold text-gray-600 block mb-2">Medications</span>
                      <div className="bg-gray-50 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-100 text-gray-600">
                              <th className="text-left p-2">Name</th>
                              <th className="text-left p-2">Dosage</th>
                              <th className="text-left p-2">Frequency</th>
                              <th className="text-left p-2">Duration</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedRecord.medications.map((m, i) => (
                              <tr key={i} className="border-t border-gray-200">
                                <td className="p-2">{m.name || '-'}</td>
                                <td className="p-2">{m.dosage || '-'}</td>
                                <td className="p-2">{m.frequency || '-'}</td>
                                <td className="p-2">{m.duration || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {selectedRecord.healthMetrics && Object.keys(selectedRecord.healthMetrics).some(k => selectedRecord.healthMetrics[k] != null) && (
                    <div>
                      <span className="font-semibold text-gray-600 block mb-2">Health Metrics</span>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {selectedRecord.healthMetrics.bloodSugar != null && (
                          <div className="bg-blue-50 p-3 rounded-lg text-center">
                            <p className="text-xs text-gray-500">Blood Sugar</p>
                            <p className="text-lg font-bold text-blue-600">{selectedRecord.healthMetrics.bloodSugar} mg/dL</p>
                          </div>
                        )}
                        {selectedRecord.healthMetrics.bloodPressureSystolic != null && (
                          <div className="bg-red-50 p-3 rounded-lg text-center">
                            <p className="text-xs text-gray-500">Blood Pressure</p>
                            <p className="text-lg font-bold text-red-600">{selectedRecord.healthMetrics.bloodPressureSystolic}/{selectedRecord.healthMetrics.bloodPressureDiastolic} mmHg</p>
                          </div>
                        )}
                        {selectedRecord.healthMetrics.heartRate != null && (
                          <div className="bg-pink-50 p-3 rounded-lg text-center">
                            <p className="text-xs text-gray-500">Heart Rate</p>
                            <p className="text-lg font-bold text-pink-600">{selectedRecord.healthMetrics.heartRate} bpm</p>
                          </div>
                        )}
                        {selectedRecord.healthMetrics.temperature != null && (
                          <div className="bg-orange-50 p-3 rounded-lg text-center">
                            <p className="text-xs text-gray-500">Temperature</p>
                            <p className="text-lg font-bold text-orange-600">{selectedRecord.healthMetrics.temperature} °F</p>
                          </div>
                        )}
                        {selectedRecord.healthMetrics.weight != null && (
                          <div className="bg-green-50 p-3 rounded-lg text-center">
                            <p className="text-xs text-gray-500">Weight</p>
                            <p className="text-lg font-bold text-green-600">{selectedRecord.healthMetrics.weight} kg</p>
                          </div>
                        )}
                        {selectedRecord.healthMetrics.height != null && (
                          <div className="bg-indigo-50 p-3 rounded-lg text-center">
                            <p className="text-xs text-gray-500">Height</p>
                            <p className="text-lg font-bold text-indigo-600">{selectedRecord.healthMetrics.height} cm</p>
                          </div>
                        )}
                        {selectedRecord.healthMetrics.thyroidTSH != null && (
                          <div className="bg-purple-50 p-3 rounded-lg text-center">
                            <p className="text-xs text-gray-500">Thyroid TSH</p>
                            <p className="text-lg font-bold text-purple-600">{selectedRecord.healthMetrics.thyroidTSH} mIU/L</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedRecord.recommendedTests && (
                    <div>
                      <span className="font-semibold text-gray-600 block mb-1">Recommended Tests</span>
                      <p className="text-gray-800 bg-gray-50 p-3 rounded-lg">{selectedRecord.recommendedTests}</p>
                    </div>
                  )}

                  {selectedRecord.prescriptionDocument && (
                    <div>
                      <span className="font-semibold text-gray-600 block mb-1">Prescription Document</span>
                      <a
                        href={selectedRecord.prescriptionDocument.startsWith('http') ? selectedRecord.prescriptionDocument : `http://localhost:5001${selectedRecord.prescriptionDocument}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium"
                      >
                        📄 View Document
                      </a>
                    </div>
                  )}

                  {selectedRecord.nextVisitDate && (
                    <div>
                      <span className="font-semibold text-gray-600 block mb-1">Next Visit Date</span>
                      <span className="text-gray-800">{new Date(selectedRecord.nextVisitDate).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Records grouped by hospital */}
          {Object.entries(groupedByHospital).map(([hospitalName, hospitalRecords]) => (
            <div key={hospitalName} className="bg-white p-6 rounded-xl shadow-sm mb-5">
              <h2 className="text-gray-800 text-xl font-semibold mb-4 flex items-center gap-2">
                <span>🏥</span> {hospitalName}
                <span className="text-sm font-normal text-gray-400">({hospitalRecords.length} records)</span>
              </h2>
              <div className="space-y-3">
                {hospitalRecords.map((record) => (
                  <div
                    key={record._id}
                    onClick={() => setSelectedRecord(record)}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                  >
                    <div>
                      <p className="font-semibold text-gray-800">{record.diagnosis}</p>
                      <p className="text-sm text-gray-500">
                        Dr. {record.doctor?.name || 'N/A'} ({record.doctor?.specialization || 'N/A'})
                        {record.symptoms && ` · ${record.symptoms.substring(0, 50)}${record.symptoms.length > 50 ? '...' : ''}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-700">{new Date(record.visitDate).toLocaleDateString()}</p>
                      {record.nextVisitDate && (
                        <p className="text-xs text-purple-500">Next: {new Date(record.nextVisitDate).toLocaleDateString()}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </DashboardLayout>
  );
};

export default DoctorPatientRecords;
