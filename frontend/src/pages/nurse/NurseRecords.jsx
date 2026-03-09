import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { nurseService } from '../../services/api';

const NurseRecords = () => {
  const [records, setRecords] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState(null);

  useEffect(() => {
    setLoading(true);
    nurseService.getMyRecords(page)
      .then((res) => {
        setRecords(res.data.records || []);
        setTotalPages(res.data.totalPages || 1);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page]);

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  if (loading) {
    return (
      <DashboardLayout title="My Records">
        <p className="text-gray-500">Loading...</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="My Records">
      {records.length === 0 ? (
        <div className="bg-white p-12 rounded-xl shadow-sm text-center">
          <p className="text-6xl mb-4">📋</p>
          <p className="text-gray-500 text-lg">No records created yet</p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {records.map((r) => (
              <div key={r._id} className="bg-white p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedRecord(r)}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-gray-800 font-semibold">{r.patient?.name || 'Unknown Patient'}</h3>
                    <p className="text-gray-500 text-sm">Dr. {r.doctor?.name || 'Unknown'} • {r.hospital?.name || 'Unknown Hospital'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-700 font-semibold text-sm">{formatDate(r.visitDate)}</p>
                    <p className="text-gray-500 text-xs">{r.diagnosis?.substring(0, 50) || 'No diagnosis'}{r.diagnosis?.length > 50 ? '...' : ''}</p>
                  </div>
                </div>
                {r.medications?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {r.medications.slice(0, 4).map((med, i) => (
                      <span key={i} className="px-2 py-1 bg-purple-50 text-purple-600 rounded text-xs font-medium">{med.name}</span>
                    ))}
                    {r.medications.length > 4 && <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded text-xs">+{r.medications.length - 4} more</span>}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-4 py-2 bg-white border rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">Previous</button>
              <span className="px-4 py-2 text-sm text-gray-600">Page {page} of {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="px-4 py-2 bg-white border rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">Next</button>
            </div>
          )}
        </>
      )}

      {/* Record Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedRecord(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-gray-800 text-xl font-bold">Record Details</h2>
              <button onClick={() => setSelectedRecord(null)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-gray-500 font-semibold">Patient</p><p className="text-gray-800 font-medium">{selectedRecord.patient?.name}</p></div>
                <div><p className="text-xs text-gray-500 font-semibold">Doctor</p><p className="text-gray-800 font-medium">Dr. {selectedRecord.doctor?.name}</p></div>
                <div><p className="text-xs text-gray-500 font-semibold">Hospital</p><p className="text-gray-800 font-medium">{selectedRecord.hospital?.name}</p></div>
                <div><p className="text-xs text-gray-500 font-semibold">Visit Date</p><p className="text-gray-800 font-medium">{formatDate(selectedRecord.visitDate)}</p></div>
              </div>

              {selectedRecord.diagnosis && (
                <div><p className="text-xs text-gray-500 font-semibold">Diagnosis</p><p className="text-gray-700 mt-1">{selectedRecord.diagnosis}</p></div>
              )}
              {selectedRecord.symptoms && (
                <div><p className="text-xs text-gray-500 font-semibold">Symptoms</p><p className="text-gray-700 mt-1">{selectedRecord.symptoms}</p></div>
              )}
              {selectedRecord.prescriptionNotes && (
                <div><p className="text-xs text-gray-500 font-semibold">Prescription Notes</p><p className="text-gray-700 mt-1">{selectedRecord.prescriptionNotes}</p></div>
              )}

              {selectedRecord.medications?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 font-semibold mb-2">Medications</p>
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-gray-500 border-b"><th className="pb-2">Name</th><th className="pb-2">Dosage</th><th className="pb-2">Frequency</th><th className="pb-2">Duration</th></tr></thead>
                    <tbody>
                      {selectedRecord.medications.map((m, i) => (
                        <tr key={i} className="border-b border-gray-100">
                          <td className="py-2 text-gray-800">{m.name}</td>
                          <td className="py-2 text-gray-600">{m.dosage}</td>
                          <td className="py-2 text-gray-600">{m.frequency}</td>
                          <td className="py-2 text-gray-600">{m.duration}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {selectedRecord.healthMetrics && Object.keys(selectedRecord.healthMetrics).length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 font-semibold mb-2">Health Metrics</p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(selectedRecord.healthMetrics).map(([k, v]) => (
                      <div key={k} className="bg-purple-50 p-3 rounded-lg">
                        <p className="text-xs text-purple-500 font-semibold">{k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</p>
                        <p className="text-purple-700 font-bold text-lg">{v}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedRecord.prescriptionDocument && (
                <div>
                  <p className="text-xs text-gray-500 font-semibold mb-1">Prescription Document</p>
                  <a href={selectedRecord.prescriptionDocument} target="_blank" rel="noopener noreferrer" className="text-purple-600 text-sm font-semibold hover:underline">View Document →</a>
                </div>
              )}

              {selectedRecord.nextVisitDate && (
                <div><p className="text-xs text-gray-500 font-semibold">Next Visit</p><p className="text-gray-800 font-medium">{formatDate(selectedRecord.nextVisitDate)}</p></div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default NurseRecords;
