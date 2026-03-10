import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { nurseService } from '../../services/api';

const POLL_INTERVAL = 3000;

const NurseEditRecord = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const recordIdParam = searchParams.get('recordId');

  // Step control: 'lookup' -> 'waiting' -> 'form'
  const [step, setStep] = useState('lookup');

  // Step 1: Patient lookup
  const [assignedDoctors, setAssignedDoctors] = useState([]);
  const [patientIdInput, setPatientIdInput] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [patientInfo, setPatientInfo] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupMsg, setLookupMsg] = useState({ type: '', text: '' });
  const [patientRecords, setPatientRecords] = useState([]);
  const [selectedRecordId, setSelectedRecordId] = useState(recordIdParam || '');

  // Step 2: Waiting for doctor approval
  const [accessRequest, setAccessRequest] = useState(null);
  const pollRef = useRef(null);

  // Step 3: Record form
  const [specializationFields, setSpecializationFields] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  // Timer
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const timerRef = useRef(null);
  const [extensionRequested, setExtensionRequested] = useState(false);
  const [extensionRejected, setExtensionRejected] = useState(false);

  // Form state
  const [form, setForm] = useState({
    visitDate: '',
    diagnosis: '',
    symptoms: '',
    prescriptionNotes: '',
    recommendedTests: '',
    nextVisitDate: ''
  });
  const [prescriptionFiles, setPrescriptionFiles] = useState([]);
  const [prescriptionLinks, setPrescriptionLinks] = useState(['']);
  const [medications, setMedications] = useState([{ name: '', dosage: '', frequency: '', duration: '' }]);
  const [healthMetrics, setHealthMetrics] = useState({});
  const [customFields, setCustomFields] = useState([]);
  const [existingDocuments, setExistingDocuments] = useState([]);

  // Fetch assigned doctors on mount
  useEffect(() => {
    nurseService.getAssignedDoctors()
      .then((res) => setAssignedDoctors(res.data || []))
      .catch(() => {});
  }, []);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ==================== STEP 1: LOOKUP ====================

  const handleLookup = async () => {
    if (!patientIdInput.trim() || !selectedDoctorId) {
      setLookupMsg({ type: 'error', text: 'Please enter Patient ID and select a doctor' });
      return;
    }
    setLookupLoading(true);
    setLookupMsg({ type: '', text: '' });
    try {
      const res = await nurseService.lookupPatient(patientIdInput.trim(), selectedDoctorId);
      setPatientInfo(res.data.patient);
      // Fetch patient records for this doctor
      if (res.data.records) {
        setPatientRecords(res.data.records);
      }
      setLookupMsg({ type: 'success', text: `Patient found: ${res.data.patient.name}` });
    } catch (err) {
      setLookupMsg({ type: 'error', text: err?.response?.data?.message || 'Patient lookup failed' });
      setPatientInfo(null);
    } finally {
      setLookupLoading(false);
    }
  };

  const handleRequestAccess = async () => {
    if (!patientInfo || !selectedDoctorId || !selectedRecordId) return;
    setLookupLoading(true);
    try {
      const res = await nurseService.requestAccess({
        patientId: patientInfo.patientId,
        doctorId: selectedDoctorId,
        operation: 'edit',
        recordId: selectedRecordId
      });
      setAccessRequest(res.data);
      setStep('waiting');
      startPolling(res.data._id);
    } catch (err) {
      setLookupMsg({ type: 'error', text: err?.response?.data?.message || 'Failed to send request' });
    } finally {
      setLookupLoading(false);
    }
  };

  // ==================== STEP 2: POLLING ====================

  const startPolling = useCallback((requestId) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await nurseService.getAccessRequestStatus(requestId);
        const data = res.data;
        setAccessRequest(data);

        if (data.status === 'approved') {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setRemainingSeconds(data.remainingSeconds);
          setExtensionRejected(data.extensionRejected || false);

          // Fetch specialization fields for doctor
          const doctor = assignedDoctors.find(d => d.doctor?._id === selectedDoctorId);
          if (doctor?.doctor?.specialization) {
            try {
              const fieldRes = await nurseService.getSpecializationFields(doctor.doctor.specialization);
              setSpecializationFields(fieldRes.data || []);
            } catch { /* use empty */ }
          }

          // Fetch existing record data to pre-fill
          try {
            const recordRes = await nurseService.getRecordForEdit(requestId);
            const rec = recordRes.data;
            setForm({
              visitDate: rec.visitDate ? rec.visitDate.split('T')[0] : '',
              diagnosis: rec.diagnosis || '',
              symptoms: rec.symptoms || '',
              prescriptionNotes: rec.prescriptionNotes || '',
              recommendedTests: rec.recommendedTests || '',
              nextVisitDate: rec.nextVisitDate ? rec.nextVisitDate.split('T')[0] : ''
            });
            setMedications(rec.medications?.length ? rec.medications : [{ name: '', dosage: '', frequency: '', duration: '' }]);
            setHealthMetrics(rec.healthMetrics || {});
            setCustomFields(rec.customFields?.length ? rec.customFields : []);
            setPrescriptionLinks(rec.prescriptionLinks?.length ? rec.prescriptionLinks : ['']);
            setExistingDocuments(rec.prescriptionDocuments || []);
          } catch { /* use empty form */ }

          setStep('form');
          startTimer(data.remainingSeconds);
        } else if (data.status === 'rejected') {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setLookupMsg({ type: 'error', text: 'Doctor rejected your request.' });
          setStep('lookup');
        } else if (data.status === 'expired') {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setLookupMsg({ type: 'error', text: 'Request expired.' });
          setStep('lookup');
        }
      } catch {
        // ignore polling errors
      }
    }, POLL_INTERVAL);
  }, [assignedDoctors, selectedDoctorId]);

  // ==================== TIMER ====================

  const startTimer = (seconds) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRemainingSeconds(seconds);
    timerRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  const handleExtendTime = async () => {
    if (!accessRequest) return;
    setExtensionRequested(true);
    try {
      await nurseService.requestExtension(accessRequest._id);
      startPolling(accessRequest._id);
      setStep('waiting');
    } catch (err) {
      setMsg({ type: 'error', text: err?.response?.data?.message || 'Failed to request extension' });
      setExtensionRequested(false);
    }
  };

  // ==================== FORM HANDLERS ====================

  const handleFormChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleMetricChange = (key, value) => setHealthMetrics({ ...healthMetrics, [key]: value });

  const removeExistingDocument = (index) => {
    setExistingDocuments(existingDocuments.filter((_, i) => i !== index));
  };

  const handleMedChange = (index, field, value) => {
    const updated = [...medications];
    updated[index][field] = value;
    setMedications(updated);
  };

  const addMedication = () => setMedications([...medications, { name: '', dosage: '', frequency: '', duration: '' }]);
  const removeMedication = (i) => setMedications(medications.filter((_, idx) => idx !== i));

  const addCustomField = () => setCustomFields([...customFields, { fieldName: '', fieldValue: '' }]);
  const removeCustomField = (i) => setCustomFields(customFields.filter((_, idx) => idx !== i));
  const handleCustomFieldChange = (i, key, value) => {
    const updated = [...customFields];
    updated[i][key] = value;
    setCustomFields(updated);
  };

  const addLink = () => setPrescriptionLinks([...prescriptionLinks, '']);
  const removeLink = (i) => setPrescriptionLinks(prescriptionLinks.filter((_, idx) => idx !== i));
  const handleLinkChange = (i, value) => {
    const updated = [...prescriptionLinks];
    updated[i] = value;
    setPrescriptionLinks(updated);
  };

  // ==================== SUBMIT ====================

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (remainingSeconds <= 0) {
      setMsg({ type: 'error', text: 'Time expired! You cannot submit.' });
      return;
    }
    if (!form.diagnosis.trim()) {
      setMsg({ type: 'error', text: 'Diagnosis is required' });
      return;
    }
    setSubmitting(true);
    setMsg({ type: '', text: '' });

    try {
      const formData = new FormData();
      formData.append('visitDate', form.visitDate);
      formData.append('diagnosis', form.diagnosis);
      formData.append('symptoms', form.symptoms);
      formData.append('prescriptionNotes', form.prescriptionNotes);
      formData.append('recommendedTests', form.recommendedTests);
      formData.append('nextVisitDate', form.nextVisitDate);
      formData.append('medications', JSON.stringify(medications.filter(m => m.name.trim())));
      formData.append('healthMetrics', JSON.stringify(healthMetrics));
      formData.append('customFields', JSON.stringify(customFields.filter(f => f.fieldName.trim())));
      formData.append('prescriptionLinks', JSON.stringify(prescriptionLinks.filter(l => l.trim())));
      formData.append('existingDocuments', JSON.stringify(existingDocuments));

      prescriptionFiles.forEach((file) => {
        formData.append('prescriptionFiles', file);
      });

      await nurseService.editRecord(accessRequest._id, formData);
      setMsg({ type: 'success', text: 'Record updated successfully!' });
      if (timerRef.current) clearInterval(timerRef.current);
      setTimeout(() => navigate('/nurse/records'), 1500);
    } catch (err) {
      setMsg({ type: 'error', text: err?.response?.data?.message || 'Failed to update record' });
    } finally {
      setSubmitting(false);
    }
  };

  // ==================== TIMER BAR (sticky) ====================

  const TimerBar = () => {
    if (step !== 'form') return null;
    const isLow = remainingSeconds <= 60;
    const isExpired = remainingSeconds <= 0;

    return (
      <div className={`sticky top-0 z-50 px-6 py-3 flex items-center justify-between rounded-xl mb-4 shadow-md ${isExpired ? 'bg-red-600' : isLow ? 'bg-orange-500' : 'bg-green-600'} text-white`}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{isExpired ? '⏰' : '⏱️'}</span>
          <span className="font-bold text-lg">
            {isExpired ? 'TIME EXPIRED' : `Time Remaining: ${formatTime(remainingSeconds)}`}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {!isExpired && !extensionRejected && (
            <button
              type="button"
              onClick={handleExtendTime}
              disabled={extensionRequested}
              className="bg-white text-gray-800 px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-gray-100 disabled:opacity-50"
            >
              {extensionRequested ? 'Extension Requested...' : '+ Extend Time'}
            </button>
          )}
          {extensionRejected && (
            <span className="text-sm bg-white/20 px-3 py-1 rounded-lg">Extension rejected</span>
          )}
        </div>
      </div>
    );
  };

  // ==================== RENDER ====================

  return (
    <DashboardLayout title="Edit Medical Record">
      <TimerBar />

      {/* STEP 1: Patient Lookup + Record Selection */}
      {step === 'lookup' && (
        <div className="bg-white p-6 rounded-xl shadow-sm max-w-2xl mx-auto">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Step 1: Select Record to Edit</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Doctor</label>
              <select
                value={selectedDoctorId}
                onChange={(e) => { setSelectedDoctorId(e.target.value); setPatientInfo(null); setPatientRecords([]); setLookupMsg({ type: '', text: '' }); }}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-600"
              >
                <option value="">-- Select Doctor --</option>
                {assignedDoctors.map((d) => (
                  <option key={d.doctor?._id} value={d.doctor?._id}>
                    Dr. {d.doctor?.name} — {d.doctor?.specialization} ({d.hospitalName})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Patient ID</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={patientIdInput}
                  onChange={(e) => setPatientIdInput(e.target.value)}
                  placeholder="e.g. PID-000001"
                  className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-600"
                />
                <button
                  onClick={handleLookup}
                  disabled={lookupLoading}
                  className="bg-purple-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50"
                >
                  {lookupLoading ? 'Looking...' : 'Lookup'}
                </button>
              </div>
            </div>

            {lookupMsg.text && (
              <div className={`p-3 rounded-lg text-sm ${lookupMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {lookupMsg.text}
              </div>
            )}

            {patientInfo && (
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="font-semibold text-purple-800 mb-2">Patient Found</h3>
                <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                  <p><span className="text-gray-500">Name:</span> {patientInfo.name}</p>
                  <p><span className="text-gray-500">ID:</span> {patientInfo.patientId}</p>
                </div>

                {patientRecords.length > 0 ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Record to Edit</label>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {patientRecords.map((rec) => (
                        <label key={rec._id} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${selectedRecordId === rec._id ? 'bg-purple-100 border-purple-400' : 'bg-white border-gray-200'} border-2`}>
                          <input
                            type="radio"
                            name="record"
                            value={rec._id}
                            checked={selectedRecordId === rec._id}
                            onChange={(e) => setSelectedRecordId(e.target.value)}
                            className="text-purple-600"
                          />
                          <div>
                            <p className="font-medium text-gray-800 text-sm">{rec.diagnosis}</p>
                            <p className="text-xs text-gray-500">{new Date(rec.visitDate || rec.createdAt).toLocaleDateString()} · {rec.hospital?.name || ''}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No editable records found for this patient under this doctor.</p>
                )}

                {selectedRecordId && (
                  <button
                    onClick={handleRequestAccess}
                    disabled={lookupLoading}
                    className="mt-4 w-full bg-purple-600 text-white py-2.5 rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50"
                  >
                    Request Doctor Permission to Edit Record
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 2: Waiting for approval */}
      {step === 'waiting' && (
        <div className="bg-white p-8 rounded-xl shadow-sm max-w-lg mx-auto text-center">
          <div className="animate-pulse mb-6">
            <span className="text-6xl">🔔</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Waiting for Doctor Approval</h2>
          <p className="text-gray-500 mb-4">
            A notification has been sent to <span className="font-semibold">Dr. {assignedDoctors.find(d => d.doctor?._id === selectedDoctorId)?.doctor?.name || 'the doctor'}</span>.
          </p>
          <p className="text-gray-400 text-sm mb-6">This page will automatically update when the doctor responds.</p>
          <div className="flex items-center justify-center gap-2 text-purple-600">
            <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
            <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
          </div>
          <button
            onClick={() => { if (pollRef.current) clearInterval(pollRef.current); setStep('lookup'); }}
            className="mt-6 text-sm text-gray-400 hover:text-gray-600 underline"
          >
            Cancel and go back
          </button>
        </div>
      )}

      {/* STEP 3: Edit Record Form */}
      {step === 'form' && (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl mx-auto">
          {msg.text && (
            <div className={`p-3 rounded-lg text-sm ${msg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {msg.text}
            </div>
          )}

          {/* Patient Info Banner */}
          <div className="bg-purple-50 p-4 rounded-xl flex items-center justify-between">
            <div>
              <p className="font-semibold text-purple-800">{patientInfo?.name} ({patientInfo?.patientId})</p>
              <p className="text-sm text-purple-600">Dr. {assignedDoctors.find(d => d.doctor?._id === selectedDoctorId)?.doctor?.name} — Editing Record</p>
            </div>
            <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-semibold">Edit Mode</span>
          </div>

          {/* Basic Fields */}
          <div className="bg-white p-6 rounded-xl shadow-sm space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Visit Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Visit Date *</label>
                <input type="date" name="visitDate" value={form.visitDate} onChange={handleFormChange}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-600" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Next Visit Date</label>
                <input type="date" name="nextVisitDate" value={form.nextVisitDate} onChange={handleFormChange}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-600" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Diagnosis *</label>
              <textarea name="diagnosis" value={form.diagnosis} onChange={handleFormChange} rows={2}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-600" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Symptoms</label>
              <textarea name="symptoms" value={form.symptoms} onChange={handleFormChange} rows={2}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-600" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prescription Notes</label>
              <textarea name="prescriptionNotes" value={form.prescriptionNotes} onChange={handleFormChange} rows={2}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-600" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Recommended Tests</label>
              <input type="text" name="recommendedTests" value={form.recommendedTests} onChange={handleFormChange}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-600" />
            </div>
          </div>

          {/* Medications */}
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Medications</h3>
              <button type="button" onClick={addMedication} className="text-purple-600 text-sm font-semibold hover:text-purple-700">+ Add Medication</button>
            </div>
            {medications.map((med, i) => (
              <div key={i} className="grid grid-cols-5 gap-2 mb-2">
                <input placeholder="Name" value={med.name} onChange={(e) => handleMedChange(i, 'name', e.target.value)} className="px-3 py-2 border rounded-lg text-sm" />
                <input placeholder="Dosage" value={med.dosage} onChange={(e) => handleMedChange(i, 'dosage', e.target.value)} className="px-3 py-2 border rounded-lg text-sm" />
                <input placeholder="Frequency" value={med.frequency} onChange={(e) => handleMedChange(i, 'frequency', e.target.value)} className="px-3 py-2 border rounded-lg text-sm" />
                <input placeholder="Duration" value={med.duration} onChange={(e) => handleMedChange(i, 'duration', e.target.value)} className="px-3 py-2 border rounded-lg text-sm" />
                <button type="button" onClick={() => removeMedication(i)} className="text-red-500 text-sm hover:text-red-600">Remove</button>
              </div>
            ))}
          </div>

          {/* Specialization Health Metrics */}
          {specializationFields.length > 0 && (
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Health Metrics ({assignedDoctors.find(d => d.doctor?._id === selectedDoctorId)?.doctor?.specialization})</h3>
              <div className="grid grid-cols-2 gap-4">
                {specializationFields.map((field) => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{field.label} ({field.unit})</label>
                    <input
                      type="number"
                      step="any"
                      value={healthMetrics[field.key] || ''}
                      onChange={(e) => handleMetricChange(field.key, e.target.value ? Number(e.target.value) : '')}
                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-600"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Custom Fields */}
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Custom Fields</h3>
              <button type="button" onClick={addCustomField} className="text-purple-600 text-sm font-semibold hover:text-purple-700">+ Add Field</button>
            </div>
            {customFields.length === 0 && <p className="text-gray-400 text-sm">No custom fields. Click above to add.</p>}
            {customFields.map((cf, i) => (
              <div key={i} className="grid grid-cols-3 gap-2 mb-2">
                <input placeholder="Field Name" value={cf.fieldName} onChange={(e) => handleCustomFieldChange(i, 'fieldName', e.target.value)} className="px-3 py-2 border rounded-lg text-sm" />
                <input placeholder="Field Value" value={cf.fieldValue} onChange={(e) => handleCustomFieldChange(i, 'fieldValue', e.target.value)} className="px-3 py-2 border rounded-lg text-sm" />
                <button type="button" onClick={() => removeCustomField(i)} className="text-red-500 text-sm hover:text-red-600">Remove</button>
              </div>
            ))}
          </div>

          {/* File Uploads */}
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Prescription Documents</h3>

            {existingDocuments.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-600 mb-2">Existing Documents ({existingDocuments.length})</p>
                <div className="space-y-2">
                  {existingDocuments.map((doc, i) => (
                    <div key={i} className="flex items-center justify-between bg-gray-50 px-4 py-2 rounded-lg">
                      <a
                        href={doc.startsWith('http') ? doc : `http://localhost:5001${doc}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-600 hover:text-purple-700 text-sm font-medium flex items-center gap-2"
                      >
                        📄 {doc.split('/').pop()}
                      </a>
                      <button
                        type="button"
                        onClick={() => removeExistingDocument(i)}
                        className="text-red-500 hover:text-red-600 text-sm font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">Remove documents or upload new files below to add more.</p>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Upload New Files (PDF, JPG, PNG)</label>
              <input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setPrescriptionFiles(Array.from(e.target.files))}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg"
              />
              {prescriptionFiles.length > 0 && (
                <p className="text-sm text-gray-500 mt-1">{prescriptionFiles.length} new file(s) selected</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Prescription Links</label>
                <button type="button" onClick={addLink} className="text-purple-600 text-sm font-semibold hover:text-purple-700">+ Add Link</button>
              </div>
              {prescriptionLinks.map((link, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input
                    type="url"
                    placeholder="https://..."
                    value={link}
                    onChange={(e) => handleLinkChange(i, e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-lg text-sm"
                  />
                  {prescriptionLinks.length > 1 && (
                    <button type="button" onClick={() => removeLink(i)} className="text-red-500 text-sm hover:text-red-600">Remove</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-4">
            <button type="button" onClick={() => navigate('/nurse/dashboard')} className="px-6 py-2.5 border-2 border-gray-300 rounded-lg text-gray-600 font-semibold hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={submitting || remainingSeconds <= 0} className="px-8 py-2.5 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50">
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      )}
    </DashboardLayout>
  );
};

export default NurseEditRecord;
