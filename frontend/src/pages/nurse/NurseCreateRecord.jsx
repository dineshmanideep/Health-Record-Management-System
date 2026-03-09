import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { nurseService } from '../../services/api';

const NurseCreateRecord = () => {
  const navigate = useNavigate();
  const [assignedDoctors, setAssignedDoctors] = useState([]);
  const [specializationFields, setSpecializationFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  // Form state
  const [form, setForm] = useState({
    patientEmail: '',
    hospitalId: '',
    doctorId: '',
    visitDate: new Date().toISOString().split('T')[0],
    diagnosis: '',
    symptoms: '',
    prescriptionNotes: '',
    recommendedTests: '',
    nextVisitDate: '',
    uploadType: 'file' // 'file' or 'link'
  });
  const [prescriptionFile, setPrescriptionFile] = useState(null);
  const [prescriptionLink, setPrescriptionLink] = useState('');
  const [medications, setMedications] = useState([{ name: '', dosage: '', frequency: '', duration: '' }]);
  const [healthMetrics, setHealthMetrics] = useState({});

  useEffect(() => {
    nurseService.getAssignedDoctors()
      .then((res) => setAssignedDoctors(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // When doctor changes, fetch specialization fields
  useEffect(() => {
    if (!form.doctorId) {
      setSpecializationFields([]);
      setHealthMetrics({});
      return;
    }

    const selected = assignedDoctors.find(d => d.doctor?._id === form.doctorId);
    if (!selected?.doctor?.specialization) return;

    nurseService.getSpecializationFields(selected.doctor.specialization)
      .then((res) => {
        setSpecializationFields(res.data || []);
        // Reset health metrics
        const defaults = {};
        (res.data || []).forEach(f => { defaults[f.key] = ''; });
        setHealthMetrics(defaults);
      })
      .catch(() => setSpecializationFields([]));

    // Auto-set hospital from the doctor's assignment
    if (selected.hospitalId) {
      setForm(prev => ({ ...prev, hospitalId: selected.hospitalId }));
    }
  }, [form.doctorId, assignedDoctors]);

  const updateForm = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const addMedication = () => setMedications(prev => [...prev, { name: '', dosage: '', frequency: '', duration: '' }]);
  const removeMedication = (idx) => setMedications(prev => prev.filter((_, i) => i !== idx));
  const updateMedication = (idx, field, value) => {
    setMedications(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg({ type: '', text: '' });

    try {
      // Build health metrics (filter out empty values)
      const metricsToSend = {};
      Object.entries(healthMetrics).forEach(([k, v]) => {
        if (v !== '' && v != null) metricsToSend[k] = parseFloat(v);
      });

      // Filter out empty medications
      const medsToSend = medications.filter(m => m.name.trim());

      const formData = new FormData();
      formData.append('patientEmail', form.patientEmail);
      formData.append('hospitalId', form.hospitalId);
      formData.append('doctorId', form.doctorId);
      formData.append('visitDate', form.visitDate);
      formData.append('diagnosis', form.diagnosis);
      if (form.symptoms) formData.append('symptoms', form.symptoms);
      if (form.prescriptionNotes) formData.append('prescriptionNotes', form.prescriptionNotes);
      if (form.recommendedTests) formData.append('recommendedTests', form.recommendedTests);
      if (form.nextVisitDate) formData.append('nextVisitDate', form.nextVisitDate);
      formData.append('medications', JSON.stringify(medsToSend));
      formData.append('healthMetrics', JSON.stringify(metricsToSend));

      // Prescription document
      if (form.uploadType === 'file' && prescriptionFile) {
        formData.append('prescriptionFile', prescriptionFile);
      } else if (form.uploadType === 'link' && prescriptionLink) {
        formData.append('prescriptionDocument', prescriptionLink);
      }

      await nurseService.createRecord(formData);
      setMsg({ type: 'success', text: 'Patient visit record created successfully!' });

      // Reset form after short delay
      setTimeout(() => navigate('/nurse/records'), 1500);
    } catch (err) {
      setMsg({ type: 'error', text: err?.response?.data?.message || 'Failed to create record' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Create Patient Visit Record">
        <p className="text-gray-500">Loading...</p>
      </DashboardLayout>
    );
  }

  if (assignedDoctors.length === 0) {
    return (
      <DashboardLayout title="Create Patient Visit Record">
        <div className="bg-white p-12 rounded-xl shadow-sm text-center">
          <p className="text-6xl mb-4">👨‍⚕️</p>
          <p className="text-gray-500 text-lg">No doctors assigned to you yet</p>
          <p className="text-gray-400 text-sm mt-1">A hospital administrator needs to assign you to a doctor first.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Create Patient Visit Record">
      <form onSubmit={handleSubmit} className="max-w-4xl">
        {msg.text && (
          <div className={`p-4 rounded-xl mb-5 ${msg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {msg.text}
          </div>
        )}

        {/* Patient & Doctor Selection */}
        <div className="bg-white p-6 rounded-xl shadow-sm mb-5">
          <h2 className="text-gray-800 text-xl font-semibold mb-4">Patient & Doctor Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">Patient Email *</label>
              <input
                type="email"
                required
                value={form.patientEmail}
                onChange={(e) => updateForm('patientEmail', e.target.value)}
                placeholder="patient@example.com"
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-600"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">Doctor *</label>
              <select
                required
                value={form.doctorId}
                onChange={(e) => updateForm('doctorId', e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-600"
              >
                <option value="">Select a doctor...</option>
                {assignedDoctors.map((d) => (
                  <option key={d.doctor?._id} value={d.doctor?._id}>
                    Dr. {d.doctor?.name} — {d.doctor?.specialization || 'N/A'} ({d.hospitalName})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">Visit Date *</label>
              <input
                type="date"
                required
                value={form.visitDate}
                onChange={(e) => updateForm('visitDate', e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-600"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">Next Visit Date</label>
              <input
                type="date"
                value={form.nextVisitDate}
                onChange={(e) => updateForm('nextVisitDate', e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-600"
              />
            </div>
          </div>
        </div>

        {/* Diagnosis & Symptoms */}
        <div className="bg-white p-6 rounded-xl shadow-sm mb-5">
          <h2 className="text-gray-800 text-xl font-semibold mb-4">Diagnosis & Treatment</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">Diagnosis *</label>
              <textarea
                required
                rows={2}
                value={form.diagnosis}
                onChange={(e) => updateForm('diagnosis', e.target.value)}
                placeholder="Enter diagnosis information..."
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-600 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">Symptoms</label>
              <textarea
                rows={2}
                value={form.symptoms}
                onChange={(e) => updateForm('symptoms', e.target.value)}
                placeholder="Enter symptoms..."
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-600 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">Prescription Notes</label>
              <textarea
                rows={3}
                value={form.prescriptionNotes}
                onChange={(e) => updateForm('prescriptionNotes', e.target.value)}
                placeholder="Enter prescription notes..."
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-600 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">Recommended Tests</label>
              <input
                type="text"
                value={form.recommendedTests}
                onChange={(e) => updateForm('recommendedTests', e.target.value)}
                placeholder="e.g., CBC, Blood Sugar, X-Ray"
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-600"
              />
            </div>
          </div>
        </div>

        {/* Medications */}
        <div className="bg-white p-6 rounded-xl shadow-sm mb-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-gray-800 text-xl font-semibold">Medications</h2>
            <button type="button" onClick={addMedication} className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm font-semibold hover:bg-purple-200 transition-colors">
              + Add Medication
            </button>
          </div>
          {medications.map((med, idx) => (
            <div key={idx} className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3 items-end">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Name</label>
                <input type="text" value={med.name} onChange={(e) => updateMedication(idx, 'name', e.target.value)} placeholder="Medicine name" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-600" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Dosage</label>
                <input type="text" value={med.dosage} onChange={(e) => updateMedication(idx, 'dosage', e.target.value)} placeholder="e.g., 500mg" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-600" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Frequency</label>
                <input type="text" value={med.frequency} onChange={(e) => updateMedication(idx, 'frequency', e.target.value)} placeholder="e.g., Twice daily" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-600" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Duration</label>
                <input type="text" value={med.duration} onChange={(e) => updateMedication(idx, 'duration', e.target.value)} placeholder="e.g., 7 days" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-600" />
              </div>
              <div>
                {medications.length > 1 && (
                  <button type="button" onClick={() => removeMedication(idx)} className="px-3 py-2 bg-red-100 text-red-600 rounded-lg text-sm hover:bg-red-200 transition-colors">
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Dynamic Health Metrics (based on doctor specialization) */}
        {specializationFields.length > 0 && (
          <div className="bg-white p-6 rounded-xl shadow-sm mb-5">
            <h2 className="text-gray-800 text-xl font-semibold mb-2">Health Metrics</h2>
            <p className="text-gray-500 text-sm mb-4">
              Fields based on doctor's specialization: <span className="font-semibold text-purple-600">
                {assignedDoctors.find(d => d.doctor?._id === form.doctorId)?.doctor?.specialization}
              </span>
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {specializationFields.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">
                    {field.label} <span className="text-gray-400 font-normal">({field.unit})</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={healthMetrics[field.key] || ''}
                    onChange={(e) => setHealthMetrics(prev => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-600"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Prescription Document Upload */}
        <div className="bg-white p-6 rounded-xl shadow-sm mb-5">
          <h2 className="text-gray-800 text-xl font-semibold mb-4">Prescription Document</h2>
          <div className="flex gap-3 mb-4">
            <button
              type="button"
              onClick={() => updateForm('uploadType', 'file')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${form.uploadType === 'file' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              Upload File
            </button>
            <button
              type="button"
              onClick={() => updateForm('uploadType', 'link')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${form.uploadType === 'link' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              Provide Link
            </button>
          </div>

          {form.uploadType === 'file' ? (
            <div>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setPrescriptionFile(e.target.files[0])}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
              />
              <p className="text-xs text-gray-400 mt-1">Accepted formats: PDF, JPG, PNG (max 10MB)</p>
            </div>
          ) : (
            <div>
              <input
                type="url"
                value={prescriptionLink}
                onChange={(e) => setPrescriptionLink(e.target.value)}
                placeholder="https://drive.google.com/..."
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-600"
              />
              <p className="text-xs text-gray-400 mt-1">Enter a link to the prescription (e.g., Google Drive, Dropbox)</p>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="px-8 py-3 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Creating Record...' : 'Create Visit Record'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/nurse/dashboard')}
            className="px-8 py-3 bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </DashboardLayout>
  );
};

export default NurseCreateRecord;
