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

  const formatMedicationDuration = (medication) => {
    if (medication?.durationDays) return `${medication.durationDays} day(s)`;
    if (medication?.duration) return medication.duration;
    return '-';
  };

  const formatMedicationTiming = (medication) =>
    [medication?.frequency, medication?.timing, medication?.instructions].filter(Boolean).join(' • ') || '-';

  return (
    <DashboardLayout title="Subject Archives">
      <div className="mb-8 flex items-center justify-between">
        <Link to="/doctor/patients" className="inline-flex items-center gap-3 text-slate-500 dark:text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em] no-underline bg-white dark:bg-slate-900 px-6 py-3 rounded-2xl shadow-sm border border-slate-200/50 dark:border-slate-800 transition-all active:scale-95 group">
          <span className="group-hover:-translate-x-1 transition-transform">←</span> Node Directory
        </Link>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 animate-pulse">
           <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
           <p className="mt-6 text-slate-400 font-black tracking-[0.3em] uppercase text-[9px]">Synchronizing Medical Vault...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 dark:bg-rose-900/10 p-10 rounded-[2.5rem] text-center border-2 border-rose-100 dark:border-rose-900/20">
          <p className="text-rose-600 dark:text-rose-400 font-black uppercase tracking-[0.2em] text-[10px]">{error}</p>
        </div>
      ) : records.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-20 rounded-[3rem] shadow-sm text-center border border-slate-200/50 dark:border-slate-800">
          <p className="text-7xl mb-8 grayscale opacity-20">📂</p>
          <p className="text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.3em] text-[10px]">Registry Empty</p>
          <p className="text-slate-400 dark:text-slate-600 text-sm mt-4 font-bold max-w-xs mx-auto leading-relaxed">No clinical data has been synchronized for this Subject ID.</p>
        </div>
      ) : (
        <div className="pb-12">
          {/* Record detail modal */}
          {selectedRecord && (
            <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
              <div className="bg-white dark:bg-slate-950 rounded-[3rem] shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-slate-200 dark:border-emerald-500/10 flex flex-col">
                <div className="flex justify-between items-center px-10 py-10 border-b dark:border-slate-800/50 sticky top-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md z-10">
                  <div>
                     <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Clinical Artifact Detail</h2>
                     <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" /> Secure Diagnostic Output
                     </p>
                  </div>
                  <button onClick={() => setSelectedRecord(null)} className="w-12 h-12 rounded-[1.5rem] bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-2xl font-black text-slate-400 hover:bg-rose-500 hover:text-white transition-all shadow-sm">&times;</button>
                </div>

                <div className="p-10 overflow-y-auto space-y-12 custom-scrollbar">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 p-5 rounded-[2rem]">
                      <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1.5">Timeline Vector</span>
                      <span className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase">{new Date(selectedRecord.visitDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 p-5 rounded-[2rem] md:col-span-2">
                      <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1.5">Origin Facility</span>
                      <span className="text-sm font-black text-slate-800 dark:text-slate-200 truncate uppercase tracking-tight block">{selectedRecord.hospital?.name || 'N/A'}</span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 p-5 rounded-[2rem]">
                      <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1.5">Reporting Physician</span>
                      <span className="text-sm font-black text-slate-800 dark:text-slate-200 truncate block">DR. {selectedRecord.doctor?.name?.toUpperCase() || 'N/A'}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-black text-emerald-500 dark:text-emerald-400 uppercase tracking-[0.2em] block mb-4 ml-1 flex items-center gap-2">
                       <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Executive Diagnosis
                    </span>
                    <div className="text-slate-800 dark:text-slate-200 bg-emerald-50/30 dark:bg-emerald-900/10 p-8 rounded-[2.5rem] font-bold text-lg leading-relaxed border-l-[6px] border-emerald-500 shadow-sm italic">
                      "{selectedRecord.diagnosis}"
                    </div>
                  </div>

                  {selectedRecord.symptoms && (
                    <div>
                      <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] block mb-4 ml-1">Observed Indicators</span>
                      <p className="text-slate-700 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 p-6 rounded-[2rem] font-medium leading-relaxed border border-slate-100 dark:border-slate-800">{selectedRecord.symptoms}</p>
                    </div>
                  )}

                  {selectedRecord.prescriptionNotes && (
                    <div>
                      <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] block mb-4 ml-1">Clinical Instructions</span>
                      <p className="text-slate-700 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 p-6 rounded-[2rem] font-medium leading-relaxed border border-slate-100 dark:border-slate-800">{selectedRecord.prescriptionNotes}</p>
                    </div>
                  )}

                  {selectedRecord.structuredData?.summary && (
                    <div>
                      <span className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-[0.2em] block mb-4 ml-1">Structured AI Summary</span>
                      <div className="text-slate-800 dark:text-slate-200 bg-indigo-50 dark:bg-indigo-900/15 p-6 rounded-[2rem] font-medium leading-relaxed border border-indigo-100 dark:border-indigo-900/30 whitespace-pre-line">
                        {selectedRecord.structuredData.summary}
                      </div>
                    </div>
                  )}

                  {selectedRecord.medications?.length > 0 && (
                    <div>
                      <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] block mb-4 ml-1">Pharmacological Regimen</span>
                      <div className="bg-white dark:bg-slate-900/50 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b dark:border-slate-800">
                              <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Agent</th>
                              <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Node</th>
                              <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Frequency</th>
                              <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Timing</th>
                              <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Duration</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {selectedRecord.medications.map((m, i) => (
                              <tr key={i} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/30 transition-colors">
                                <td className="p-5 text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">{m.name || '-'}</td>
                                <td className="p-5 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">{m.dosage || '-'}</td>
                                <td className="p-5 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">{m.frequency || '-'}</td>
                                <td className="p-5 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">{formatMedicationTiming(m)}</td>
                                <td className="p-5 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">{formatMedicationDuration(m)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {selectedRecord.healthMetrics && Object.keys(selectedRecord.healthMetrics).some(k => selectedRecord.healthMetrics[k] != null) && (
                    <div>
                      <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] block mb-4 ml-1">Biometric Telemetry</span>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                          { label: 'Blood Sugar', val: selectedRecord.healthMetrics.bloodSugar, unit: 'mg/dL', color: 'emerald' },
                          { label: 'Blood Pressure', val: selectedRecord.healthMetrics.bloodPressureSystolic ? `${selectedRecord.healthMetrics.bloodPressureSystolic}/${selectedRecord.healthMetrics.bloodPressureDiastolic}` : null, unit: 'mmHg', color: 'rose' },
                          { label: 'Heart Rate', val: selectedRecord.healthMetrics.heartRate, unit: 'bpm', color: 'pink' },
                          { label: 'Temperature', val: selectedRecord.healthMetrics.temperature, unit: '°F', color: 'amber' }
                        ].filter(m => m.val).map((m, idx) => (
                           <div key={idx} className={`bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-all`}>
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{m.label}</p>
                              <div className="flex items-baseline gap-1.5">
                                 <span className={`text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight`}>{m.val}</span>
                                 <span className="text-[8px] font-bold text-slate-400/50 uppercase tracking-widest">{m.unit}</span>
                              </div>
                           </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(selectedRecord.prescriptionDocument || selectedRecord.prescriptionDocuments?.length > 0 || selectedRecord.prescriptionLinks?.length > 0) && (
                    <div>
                      <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] block mb-4 ml-1">Clinical Media Attachments</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {selectedRecord.prescriptionDocument && (
                           <a
                             href={selectedRecord.prescriptionDocument.startsWith('http') ? selectedRecord.prescriptionDocument : `http://localhost:5001${selectedRecord.prescriptionDocument}`}
                             target="_blank"
                             rel="noopener noreferrer"
                             className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl group transition-all hover:bg-emerald-600 no-underline"
                           >
                             <span className="text-[10px] font-black text-slate-800 dark:text-slate-200 group-hover:text-white uppercase tracking-widest flex items-center gap-3">
                                <span className="text-xl">📄</span> Prescription Node
                             </span>
                             <span className="text-[9px] font-black text-emerald-500 group-hover:text-white/80 uppercase tracking-widest group-hover:translate-x-1 transition-transform">Access ↗</span>
                           </a>
                        )}
                        {selectedRecord.prescriptionDocuments?.map((doc, i) => (
                           <a
                             key={i}
                             href={doc.startsWith('http') ? doc : `http://localhost:5001${doc}`}
                             target="_blank"
                             rel="noopener noreferrer"
                             className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl group transition-all hover:bg-emerald-600 no-underline"
                           >
                             <span className="text-[10px] font-black text-slate-800 dark:text-slate-200 group-hover:text-white uppercase tracking-widest flex items-center gap-3">
                                <span className="text-xl">📊</span> {doc.split('/').pop()?.substring(0, 15)}...
                             </span>
                             <span className="text-[9px] font-black text-emerald-500 group-hover:text-white/80 uppercase tracking-widest group-hover:translate-x-1 transition-transform">Access ↗</span>
                           </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedRecord.customFields?.length > 0 && (
                    <div>
                      <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] block mb-4 ml-1">Extended Attributes</span>
                      <div className="bg-white dark:bg-slate-900/50 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                        <table className="w-full text-left border-collapse">
                          <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {selectedRecord.customFields.map((cf, i) => (
                              <tr key={i} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/30 transition-colors">
                                <td className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[40%] bg-slate-50/30 dark:bg-slate-800/20 italic">{cf.fieldName}</td>
                                <td className="p-5 text-sm font-bold text-slate-800 dark:text-slate-200">{cf.fieldValue}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {selectedRecord.nextVisitDate && (
                    <div className="bg-emerald-600 p-8 rounded-[2.5rem] text-white flex items-center justify-between shadow-xl shadow-emerald-600/10">
                       <div>
                          <p className="text-[9px] font-black text-white/60 uppercase tracking-[0.3em] mb-1.5">Scheduled Follow-up Vector</p>
                          <p className="text-xl font-black uppercase tracking-tight">{new Date(selectedRecord.nextVisitDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                       </div>
                       <span className="text-4xl">📅</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Records grouped by hospital */}
          <div className="space-y-12">
            {Object.entries(groupedByHospital).map(([hospitalName, hospitalRecords]) => (
              <div key={hospitalName} className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-sm border border-slate-200/50 dark:border-slate-800 transition-all">
                <div className="flex items-center justify-between mb-10 pb-6 border-b dark:border-slate-800">
                   <div>
                     <h2 className="text-slate-900 dark:text-white text-2xl font-black tracking-tight flex items-center gap-4">
                       <span className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center text-2xl shadow-sm border border-emerald-100/50 dark:border-emerald-800/30">🏥</span> 
                       <span className="uppercase">{hospitalName}</span>
                     </h2>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2 ml-16">{hospitalRecords.length} Authenticated Archives Found</p>
                   </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {hospitalRecords.map((record) => (
                    <div
                      key={record._id}
                      onClick={() => setSelectedRecord(record)}
                      className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-8 bg-slate-50 dark:bg-slate-800/50 rounded-[2.5rem] border border-transparent dark:border-slate-700/50 hover:shadow-xl hover:bg-white dark:hover:bg-slate-800/80 group/item cursor-pointer transition-all duration-500 relative overflow-hidden"
                    >
                      {/* Decorative accent */}
                      <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500 opacity-0 group-hover/item:opacity-100 transition-all shadow-lg" />
                      
                      <div className="mb-6 sm:mb-0 relative z-10">
                        <p className="font-black text-slate-800 dark:text-white text-lg group-hover/item:text-emerald-600 dark:group-hover/item:text-emerald-400 transition-colors uppercase tracking-tight leading-none mb-4">{record.diagnosis}</p>
                        <div className="flex flex-wrap items-center gap-4">
                           <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
                              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">DR. {record.doctor?.name?.toUpperCase() || 'N/A'}</p>
                           </div>
                           <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${record.doctor?.specialization ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                              {record.doctor?.specialization || 'General MD'}
                           </span>
                        </div>
                      </div>
                      
                      <div className="text-left sm:text-right flex flex-row sm:flex-col justify-between items-center sm:items-end sm:pl-8 sm:border-l dark:border-slate-700 relative z-10">
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] mb-1.5">{new Date(record.visitDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                        {record.nextVisitDate && (
                          <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-xl border border-emerald-100 dark:border-emerald-800/50">
                             <span className="text-[10px]">📅</span>
                             <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tight">Phase Follow-up</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default DoctorPatientRecords;
