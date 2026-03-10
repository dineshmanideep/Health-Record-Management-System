import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { nurseService } from '../../services/api';

const NurseAssignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [showCompletionForm, setShowCompletionForm] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [stats, setStats] = useState({ all: 0, pending: 0, in_progress: 0, completed: 0 });

  // Medical record form state
  const [prescription, setPrescription] = useState('');
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const statusFilter = filter !== 'all' ? filter : '';
      const response = await nurseService.getAssignments(statusFilter);
      const data = response.data || [];
      setAssignments(data);
      
      // Calculate stats from all assignments (fetch all for stats)
      if (filter === 'all') {
        const pending = data.filter(a => a.status === 'pending').length;
        const inProgress = data.filter(a => a.status === 'in_progress').length;
        const completed = data.filter(a => a.status === 'completed').length;
        setStats({ 
          all: data.length, 
          pending, 
          in_progress: inProgress, 
          completed 
        });
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  // Fetch all assignments once for stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await nurseService.getAssignments('');
        const data = response.data || [];
        const pending = data.filter(a => a.status === 'pending').length;
        const inProgress = data.filter(a => a.status === 'in_progress').length;
        const completed = data.filter(a => a.status === 'completed').length;
        setStats({ 
          all: data.length, 
          pending, 
          in_progress: inProgress, 
          completed 
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };
    fetchStats();
  }, [assignments.length]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const handleStartAssignment = async (id) => {
    try {
      await nurseService.startAssignment(id);
      setMessage({ type: 'success', text: 'Assignment started! You can now work on it.' });
      fetchAssignments();
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error starting assignment:', error);
      setMessage({ type: 'error', text: 'Failed to start assignment. Please try again.' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  const handleViewDetails = async (assignment) => {
    setSelectedAssignment(assignment);
  };

  const handleStartCompletion = () => {
    setShowCompletionForm(true);
    resetForm();
  };

  const resetForm = () => {
    setPrescription('');
    setFiles([]);
  };

  const handleFileAdd = () => {
    setFiles([...files, { file: null, category: 'test_report' }]);
  };

  const handleFileChange = (index, file) => {
    const newFiles = [...files];
    newFiles[index].file = file;
    setFiles(newFiles);
  };

  const handleCategoryChange = (index, category) => {
    const newFiles = [...files];
    newFiles[index].category = category;
    setFiles(newFiles);
  };

  const handleFileRemove = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleCompleteAssignment = async (e) => {
    e.preventDefault();
    if (!prescription.trim()) {
      setMessage({ type: 'error', text: 'Please provide prescription text' });
      return;
    }

    setSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      const submitData = new FormData();
      submitData.append('prescription', prescription);
      
      // Add categorized files
      files.forEach((item, index) => {
        if (item.file) {
          submitData.append('medicalFiles', item.file);
          submitData.append(`fileCategories[${index}]`, item.category);
        }
      });

      await nurseService.completeAssignment(selectedAssignment._id, submitData);
      setMessage({ type: 'success', text: 'Medical record created successfully! Redirecting...' });
      
      setTimeout(() => {
        setShowCompletionForm(false);
        setSelectedAssignment(null);
        setFilter('all'); // Reset to show all assignments
        fetchAssignments(); // Refresh the list
      }, 1500);
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error?.response?.data?.message || 'Failed to complete assignment' 
      });
    } finally {
      setSubmitting(false);
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

  const filteredAssignments = assignments;

  return (
    <DashboardLayout title="My Assignments">
      {/* Global Message */}
      {message.text && !showCompletionForm && (
        <div className={`mb-5 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 text-green-800 border-2 border-green-200' : 'bg-red-50 text-red-800 border-2 border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="bg-white p-12 rounded-xl shadow-sm text-center">
          <p className="text-gray-500">Loading assignments...</p>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="bg-white p-6 rounded-xl shadow-sm mb-5">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Medical Record Assignments</h2>
            
            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  filter === 'all' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                All ({stats.all})
              </button>
              <button
                onClick={() => setFilter('pending')}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  filter === 'pending' ? 'bg-yellow-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Pending ({stats.pending})
              </button>
              <button
                onClick={() => setFilter('in_progress')}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  filter === 'in_progress' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                In Progress ({stats.in_progress})
              </button>
              <button
                onClick={() => setFilter('completed')}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  filter === 'completed' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Completed ({stats.completed})
              </button>
            </div>
          </div>

          {/* Assignments List */}
          {!selectedAssignment && (
            <div className="bg-white p-6 rounded-xl shadow-sm">
              {loading ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">Loading assignments...</p>
                </div>
              ) : filteredAssignments.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-6xl mb-4">📋</p>
                  <p className="text-gray-500 text-lg font-medium mb-2">
                    {filter === 'all' && 'No assignments yet'}
                    {filter === 'pending' && 'No pending assignments'}
                    {filter === 'in_progress' && 'No assignments in progress'}
                    {filter === 'completed' && 'No completed assignments'}
                  </p>
                  <p className="text-gray-400 text-sm">
                    {filter === 'pending' && "You're all caught up! New tasks will appear here when doctors assign them."}
                    {filter === 'in_progress' && "Start working on pending assignments to see them here."}
                    {filter === 'completed' && "Completed tasks will appear here for your reference."}
                    {filter === 'all' && "Doctors will assign medical record tasks to you."}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredAssignments.map((assignment) => (
                    <div key={assignment._id} className="border-2 border-gray-200 rounded-lg p-5 hover:border-purple-300 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(assignment.status)}`}>
                              {getStatusText(assignment.status)}
                            </span>
                            {assignment.dueDate && (
                              <span className="text-xs text-orange-600 font-semibold">
                                Due: {new Date(assignment.dueDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <p className="font-bold text-lg text-gray-800">
                            Patient: {assignment.patient?.name} ({assignment.patient?.patientId})
                          </p>
                          <p className="text-sm text-gray-600">Doctor: {assignment.doctor?.name}</p>
                          <p className="text-sm text-gray-600">Hospital: {assignment.hospital?.name}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Assigned: {new Date(assignment.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => handleViewDetails(assignment)}
                          className="bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
                        >
                          View Details
                        </button>
                        {assignment.status === 'pending' && (
                          <button
                            onClick={() => handleStartAssignment(assignment._id)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                          >
                            Start Working
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Assignment Details */}
          {selectedAssignment && !showCompletionForm && (
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="flex justify-between items-start mb-5">
                <h3 className="text-xl font-bold text-gray-800">Assignment Details</h3>
                <button
                  onClick={() => setSelectedAssignment(null)}
                  className="text-gray-600 hover:text-gray-800"
                >
                  ← Back to List
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Patient</p>
                    <p className="text-lg text-gray-900">{selectedAssignment.patient?.name}</p>
                    <p className="text-sm text-gray-600">{selectedAssignment.patient?.patientId}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Doctor</p>
                    <p className="text-lg text-gray-900">{selectedAssignment.doctor?.name}</p>
                    <p className="text-sm text-gray-600">{selectedAssignment.doctor?.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Hospital</p>
                    <p className="text-lg text-gray-900">{selectedAssignment.hospital?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Status</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(selectedAssignment.status)}`}>
                      {getStatusText(selectedAssignment.status)}
                    </span>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Instructions from Doctor:</p>
                  <p className="text-gray-800 whitespace-pre-wrap">{selectedAssignment.instructions}</p>
                </div>

                {selectedAssignment.attachments && selectedAssignment.attachments.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">Attachments:</p>
                    <div className="space-y-2">
                      {selectedAssignment.attachments.map((attachment, index) => (
                        <a
                          key={index}
                          href={`http://localhost:5000${attachment}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <span className="text-purple-600 hover:text-purple-700">
                            📎 Attachment {index + 1}
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {selectedAssignment.dueDate && (
                  <div className="bg-orange-50 p-3 rounded-lg">
                    <p className="text-sm font-semibold text-orange-700">
                      Due Date: {new Date(selectedAssignment.dueDate).toLocaleString()}
                    </p>
                  </div>
                )}

                {selectedAssignment.status !== 'completed' && selectedAssignment.status !== 'cancelled' && (
                  <div className="flex gap-3 pt-4 border-t">
                    {selectedAssignment.status === 'pending' && (
                      <button
                        onClick={() => handleStartAssignment(selectedAssignment._id)}
                        className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                      >
                        Start Working
                      </button>
                    )}
                    {selectedAssignment.status === 'in_progress' && (
                      <button
                        onClick={handleStartCompletion}
                        className="bg-green-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-green-700 transition-colors"
                      >
                        Complete Assignment
                      </button>
                    )}
                  </div>
                )}

                {selectedAssignment.status === 'completed' && (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-green-800 font-semibold">✓ Assignment completed successfully!</p>
                    <p className="text-sm text-green-700 mt-1">
                      Completed on: {new Date(selectedAssignment.completedAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Completion Form */}
          {showCompletionForm && selectedAssignment && (
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="flex justify-between items-start mb-5">
                <h3 className="text-xl font-bold text-gray-800">Complete Medical Record</h3>
                <button
                  onClick={() => setShowCompletionForm(false)}
                  className="text-gray-600 hover:text-gray-800"
                >
                  ← Back
                </button>
              </div>

              {message.text && (
                <div className={`mb-4 p-3 rounded-lg text-sm ${
                  message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                }`}>
                  {message.text}
                </div>
              )}

              <form onSubmit={handleCompleteAssignment} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Prescription (Final Report) *</label>
                  <textarea
                    value={prescription}
                    onChange={(e) => setPrescription(e.target.value)}
                    rows={6}
                    placeholder="Enter the complete prescription and medical report..."
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-600"
                    required
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-semibold text-gray-700">Medical Documents</label>
                    <button
                      type="button"
                      onClick={handleFileAdd}
                      className="text-sm bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700"
                    >
                      + Add Document
                    </button>
                  </div>
                  
                  {files.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No documents added yet</p>
                  ) : (
                    <div className="space-y-3">
                      {files.map((item, index) => (
                        <div key={index} className="border-2 border-gray-200 rounded-lg p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1">Category</label>
                              <select
                                value={item.category}
                                onChange={(e) => handleCategoryChange(index, e.target.value)}
                                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-600"
                              >
                                <option value="test_report">Test Report</option>
                                <option value="diagnosis_report">Diagnosis Report</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1">File</label>
                              <input
                                type="file"
                                onChange={(e) => handleFileChange(index, e.target.files[0])}
                                accept=".jpg,.jpeg,.png,.pdf"
                                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-600 text-sm"
                              />
                            </div>
                          </div>
                          <div className="mt-2 flex justify-between items-center">
                            <span className="text-xs text-gray-600">
                              {item.file ? item.file.name : 'No file selected'}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleFileRemove(index)}
                              className="text-xs text-red-600 hover:text-red-800 font-semibold"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4 border-t">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-green-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {submitting ? 'Submitting...' : 'Submit Medical Record'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCompletionForm(false)}
                    className="bg-gray-200 text-gray-700 px-6 py-2.5 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
};

export default NurseAssignments;
