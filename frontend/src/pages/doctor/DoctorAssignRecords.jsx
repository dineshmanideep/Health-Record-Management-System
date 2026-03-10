import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { doctorService } from '../../services/api';

const DoctorAssignRecords = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [nurses, setNurses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Assignment form state
  const [showForm, setShowForm] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [selectedNurse, setSelectedNurse] = useState('');
  const [selectedHospital, setSelectedHospital] = useState('');
  const [instructions, setInstructions] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [patientsRes, nursesRes, assignmentsRes] = await Promise.all([
        doctorService.getMyPatients(),
        doctorService.getAssignedNurses(),
        doctorService.getAssignments()
      ]);
      setPatients(patientsRes.data || []);
      setNurses(nursesRes.data || []);
      setAssignments(assignmentsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + attachments.length > 5) {
      setMessage({ type: 'error', text: 'Maximum 5 attachments allowed' });
      return;
    }
    setAttachments([...attachments, ...files]);
  };

  const removeAttachment = (index) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPatient || !selectedNurse || !selectedHospital || !instructions.trim()) {
      setMessage({ type: 'error', text: 'Please fill all required fields' });
      return;
    }

    setSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      const formData = new FormData();
      formData.append('patientId', selectedPatient);
      formData.append('nurseId', selectedNurse);
      formData.append('hospitalId', selectedHospital);
      formData.append('instructions', instructions);
      if (dueDate) formData.append('dueDate', dueDate);
      
      attachments.forEach(file => {
        formData.append('attachments', file);
      });

      await doctorService.createAssignment(formData);
      setMessage({ type: 'success', text: 'Assignment created successfully!' });
      
      // Reset form
      setSelectedPatient('');
      setSelectedNurse('');
      setSelectedHospital('');
      setInstructions('');
      setDueDate('');
      setAttachments([]);
      setShowForm(false);
      
      fetchData();
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error?.response?.data?.message || 'Failed to create assignment' 
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id) => {
    if (!confirm('Are you sure you want to cancel this assignment?')) return;
    
    try {
      await doctorService.cancelAssignment(id);
      fetchData();
    } catch (error) {
      console.error('Error cancelling assignment:', error);
      alert('Failed to cancel assignment');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-700',
      in_progress: 'bg-blue-100 text-blue-700',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-gray-100 text-gray-700'
    };
    return badges[status] || 'bg-gray-100 text-gray-700';
  };

  const getStatusText = (status) => {
    const text = {
      pending: 'Pending',
      in_progress: 'In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled'
    };
    return text[status] || status;
  };

  return (
    <DashboardLayout title="Assign Medical Records">
      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <>
          {/* Header */}
          <div className="bg-white p-6 rounded-xl shadow-sm mb-5">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Record Assignments</h2>
                <p className="text-gray-600 mt-1">Assign nurses to create medical records for your patients</p>
              </div>
              <button
                onClick={() => setShowForm(!showForm)}
                className="bg-purple-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
              >
                {showForm ? 'Cancel' : '+ New Assignment'}
              </button>
            </div>

            {message.text && (
              <div className={`mt-4 p-3 rounded-lg text-sm ${
                message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              }`}>
                {message.text}
              </div>
            )}
          </div>

          {/* Assignment Form */}
          {showForm && (
            <div className="bg-white p-6 rounded-xl shadow-sm mb-5">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Create New Assignment</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Select Patient *
                    </label>
                    <select
                      value={selectedPatient}
                      onChange={(e) => setSelectedPatient(e.target.value)}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-600"
                      required
                    >
                      <option value="">-- Choose Patient --</option>
                      {patients.map((p) => (
                        <option key={p.patient?._id} value={p.patient?._id}>
                          {p.patient?.name} 
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Assign to Nurse *
                    </label>
                    <select
                      value={selectedNurse}
                      onChange={(e) => setSelectedNurse(e.target.value)}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-600"
                      required
                    >
                      <option value="">-- Choose Nurse --</option>
                      {nurses.map((n) => (
                        <option key={n.nurse?._id} value={n.nurse?._id}>
                          {n.nurse?.name} 
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Hospital *
                  </label>
                  <select
                    value={selectedHospital}
                    onChange={(e) => setSelectedHospital(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-600"
                    required
                  >
                    <option value="">-- Choose Hospital --</option>
                    {nurses.map((n) => n.hospitalId).filter((h, i, arr) => 
                      h && arr.findIndex(x => x?._id === h?._id) === i
                    ).map((h) => (
                      <option key={h._id} value={h._id}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Instructions for Nurse *
                  </label>
                  <textarea
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="Provide detailed instructions for the nurse..."
                    rows={4}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Due Date (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Attachments (Images/PDFs - Max 5)
                  </label>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    accept=".jpg,.jpeg,.png,.pdf"
                    multiple
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-600"
                  />
                  {attachments.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {attachments.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                          <span className="text-sm text-gray-700">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => removeAttachment(index)}
                            className="text-red-600 hover:text-red-800 text-sm font-semibold"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-purple-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50"
                  >
                    {submitting ? 'Creating...' : 'Create Assignment'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="bg-gray-200 text-gray-700 px-6 py-2.5 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Assignments List */}
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h3 className="text-xl font-bold text-gray-800 mb-4">All Assignments</h3>
            {assignments.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No assignments created yet</p>
            ) : (
              <div className="space-y-3">
                {assignments.map((assignment) => (
                  <div key={assignment._id} className="border-2 border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(assignment.status)}`}>
                          {getStatusText(assignment.status)}
                        </span>
                        <p className="font-bold text-gray-800 mt-2">Patient: {assignment.patient?.name} ({assignment.patient?.patientId})</p>
                        <p className="text-sm text-gray-600">Nurse: {assignment.nurse?.name}</p>
                        <p className="text-sm text-gray-600">Hospital: {assignment.hospital?.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">{new Date(assignment.createdAt).toLocaleDateString()}</p>
                        {assignment.dueDate && (
                          <p className="text-xs text-orange-600 mt-1">Due: {new Date(assignment.dueDate).toLocaleDateString()}</p>
                        )}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg mb-3">
                      <p className="text-sm font-semibold text-gray-700 mb-1">Instructions:</p>
                      <p className="text-sm text-gray-600">{assignment.instructions}</p>
                    </div>
                    {assignment.attachments && assignment.attachments.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-semibold text-gray-700 mb-1">Attachments: {assignment.attachments.length}</p>
                      </div>
                    )}
                    <div className="flex gap-2">
                      {assignment.status === 'completed' && assignment.medicalRecord && (
                        <button
                          onClick={() => navigate(`/doctor/patients/${assignment.patient._id}/records`)}
                          className="text-sm bg-green-600 text-white px-4 py-1.5 rounded-lg hover:bg-green-700"
                        >
                          View Record
                        </button>
                      )}
                      {assignment.status === 'pending' && (
                        <button
                          onClick={() => handleCancel(assignment._id)}
                          className="text-sm bg-red-600 text-white px-4 py-1.5 rounded-lg hover:bg-red-700"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </DashboardLayout>
  );
};

export default DoctorAssignRecords;
