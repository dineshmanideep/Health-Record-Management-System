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
      <div className="mb-6 flex items-center justify-between">
        <Link to="/doctor/patients" className="inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 text-[10px] font-black uppercase tracking-widest no-underline bg-white dark:bg-slate-900 px-4 py-2 rounded-xl shadow-sm border border-slate-200/50 dark:border-slate-800 transition-all active:scale-95">
          <span>←</span> Back to Subject List
        </Link>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
           <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
           <p className="mt-4 text-slate-500 font-medium tracking-widest uppercase text-[10px]">Accessing Medical Archives...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/10 p-8 rounded-[2rem] text-center border-2 border-red-200/50 dark:border-red-900/30">
          <p className="text-red-600 dark:text-red-400 font-black uppercase tracking-widest text-xs">{error}</p>
        </div>
      ) : records.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-16 rounded-[2.5rem] shadow-sm text-center border border-slate-200/50 dark:border-slate-800">
          <p className="text-7xl mb-6 grayscale opacity-20">📂</p>
          <p className="text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest text-xs">Clinical Vault Empty</p>
          <p className="text-slate-400 dark:text-slate-600 text-sm mt-2">No synchronized medical records found for this node.</p>
        </div>
      ) : (
        <>
          {/* Record detail modal */}
          {selectedRecord && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
              <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col">
                <div className="flex justify-between items-center px-10 py-8 border-b dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
                  <div>
                     <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Clinical Manifest</h2>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Detailed Diagnostic Outcome</p>
                  </div>
                  <button onClick={() => setSelectedRecord(null)} className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-2xl hover:bg-red-500 hover:text-white transition-all">&times;</button>
                </div>

                <div className="p-10 overflow-y-auto space-y-10 custom-scrollbar">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Timeline</span>
                      <span className="text-sm font-black text-slate-800 dark:text-slate-200">{new Date(selectedRecord.visitDate).toLocaleDateString()}</span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl col-span-1 sm:col-span-2">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Facility Node</span>
                      <span className="text-sm font-black text-slate-800 dark:text-slate-200 truncate block">{selectedRecord.hospital?.name || 'N/A'}</span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Assigned Physician</span>
                      <span className="text-sm font-black text-slate-800 dark:text-slate-200">Dr. {selectedRecord.doctor?.name || 'N/A'}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block mb-3 ml-1">Primary Diagnosis</span>
                    <p className="text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl font-bold leading-relaxed border-l-4 border-indigo-500">{selectedRecord.diagnosis}</p>
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

                  {selectedRecord.prescriptionDocuments?.length > 0 && (
                    <div>
                      <span className="font-semibold text-gray-600 block mb-2">Prescription Documents</span>
                      <div className="space-y-2">
                        {selectedRecord.prescriptionDocuments.map((doc, i) => (
                          <a
                            key={i}
                            href={doc.startsWith('http') ? doc : `http://localhost:5001${doc}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium bg-purple-50 px-4 py-2 rounded-lg text-sm"
                          >
                            📄 {doc.split('/').pop()}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedRecord.prescriptionLinks?.length > 0 && (
                    <div>
                      <span className="font-semibold text-gray-600 block mb-2">Prescription Links</span>
                      <div className="space-y-2">
                        {selectedRecord.prescriptionLinks.map((link, i) => (
                          <a
                            key={i}
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium bg-blue-50 px-4 py-2 rounded-lg text-sm"
                          >
                            🔗 {link.length > 60 ? link.substring(0, 60) + '...' : link}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedRecord.customFields?.length > 0 && (
                    <div>
                      <span className="font-semibold text-gray-600 block mb-2">Additional Fields</span>
                      <div className="bg-gray-50 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-100 text-gray-600">
                              <th className="text-left p-2">Field</th>
                              <th className="text-left p-2">Value</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedRecord.customFields.map((cf, i) => (
                              <tr key={i} className="border-t border-gray-200">
                                <td className="p-2 font-medium">{cf.fieldName}</td>
                                <td className="p-2">{cf.fieldValue}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {selectedRecord.nextVisitDate && (
                    <div>
                      <span className="font-semibold text-gray-600 block mb-1">Next Visit Date</span>
                      <span className="text-gray-800">{new Date(selectedRecord.nextVisitDate).toLocaleDateString()}</span>
                    </div>
                  )}

                  {selectedRecord.editHistory?.length > 0 && (
                    <div>
                      <span className="font-semibold text-gray-600 block mb-2">Edit History</span>
                      <div className="space-y-2">
                        {selectedRecord.editHistory.map((edit, i) => (
                          <div key={i} className="bg-yellow-50 p-3 rounded-lg text-sm">
                            <p className="font-medium text-gray-700">{edit.summary}</p>
                            <p className="text-gray-500 text-xs mt-1">{new Date(edit.editedAt).toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Records grouped by hospital */}
          {Object.entries(groupedByHospital).map(([hospitalName, hospitalRecords]) => (
            <div key={hospitalName} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-200/50 dark:border-slate-800 mb-8 overflow-hidden group">
              <div className="flex items-center justify-between mb-8">
                 <div>
                   <h2 className="text-slate-900 dark:text-white text-xl font-black tracking-tight flex items-center gap-3">
                     <span className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-lg">🏥</span> {hospitalName}
                   </h2>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 ml-1">{hospitalRecords.length} Clinical Artifacts</p>
                 </div>
              </div>
              <div className="space-y-4">
                {hospitalRecords.map((record) => (
                  <div
                    key={record._id}
                    onClick={() => setSelectedRecord(record)}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border border-transparent dark:border-slate-700 hover:shadow-xl hover:bg-white dark:hover:bg-slate-800 group/item cursor-pointer transition-all duration-300"
                  >
                    <div className="mb-4 sm:mb-0">
                      <p className="font-black text-slate-800 dark:text-slate-200 text-lg group-hover/item:text-indigo-600 transition-colors uppercase tracking-tight">{record.diagnosis}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-1.5">
                         <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                           👨‍⚕️ Dr. {record.doctor?.name || 'N/A'}
                         </p>
                         <span className="w-1 h-1 bg-slate-300 rounded-full hidden sm:block"></span>
                         <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">
                           {record.doctor?.specialization || 'General'}
                         </p>
                      </div>
                    </div>
                    <div className="text-left sm:text-right w-full sm:w-auto flex flex-row sm:flex-col justify-between items-center sm:items-end border-t sm:border-t-0 border-slate-200 dark:border-slate-700 pt-4 sm:pt-0">
                      <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{new Date(record.visitDate).toLocaleDateString()}</p>
                      {record.nextVisitDate && (
                        <p className="text-[9px] font-black text-emerald-500 dark:text-emerald-400 uppercase tracking-widest mt-1.5 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-md">Follow-up: {new Date(record.nextVisitDate).toLocaleDateString()}</p>
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
