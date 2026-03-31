import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { nurseService } from '../../services/api';

const NurseTestAssignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [showCompletionForm, setShowCompletionForm] = useState(false);
  const [results, setResults] = useState('');
  const [files, setFiles] = useState([{ file: null, category: 'test_report' }]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const fetchAssignments = useCallback(async () => {
    try {
      setLoading(true);
      const status = filter === 'all' ? undefined : filter;
      const res = await nurseService.getTestAssignments(status);
      setAssignments(res.data || []);
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error?.response?.data?.message || 'Failed to load test assignments' 
      });
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const stats = {
    all: assignments.length,
    pending: assignments.filter(a => a.status === 'pending').length,
    in_progress: assignments.filter(a => a.status === 'in_progress').length,
    completed: assignments.filter(a => a.status === 'completed').length
  };

  const handleViewDetails = async (assignmentId) => {
    try {
      const res = await nurseService.getTestAssignment(assignmentId);
      setSelectedAssignment(res.data);
      setMessage({ type: '', text: '' });
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error?.response?.data?.message || 'Failed to load assignment details' 
      });
    }
  };

  const handleStartAssignment = async (assignmentId) => {
    try {
      await nurseService.startTestAssignment(assignmentId);
      setMessage({ type: 'success', text: 'Test assignment started! Status updated to In Progress.' });
      fetchAssignments();
      if (selectedAssignment?._id === assignmentId) {
        handleViewDetails(assignmentId); // Refresh details
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error?.response?.data?.message || 'Failed to start assignment' 
      });
    }
  };

  const handleShowCompletionForm = () => {
    setShowCompletionForm(true);
    setResults('');
    setFiles([{ file: null, category: 'test_report' }]);
    setMessage({ type: '', text: '' });
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
    if (!results.trim()) {
      setMessage({ type: 'error', text: 'Please provide test results' });
      return;
    }

    setSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      const submitData = new FormData();
      submitData.append('results', results);
      
      // Add categorized files
      let uploadIndex = 0;
      files.forEach((item) => {
        if (item.file) {
          submitData.append('documents', item.file);
          submitData.append(`documentCategories[${uploadIndex}]`, item.category);
          uploadIndex += 1;
        }
      });

      await nurseService.completeTestAssignment(selectedAssignment._id, submitData);
      setMessage({ type: 'success', text: 'Test completed successfully! Redirecting...' });
      
      setTimeout(() => {
        setShowCompletionForm(false);
        setSelectedAssignment(null);
        setFilter('all');
        fetchAssignments();
      }, 1500);
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error?.response?.data?.message || 'Failed to complete test assignment' 
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

  return (
    <DashboardLayout title="Hospital Test Assignments">
      {/* Global Message */}
      {message.text && !showCompletionForm && (
        <div className={`mb-5 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 text-green-800 border-2 border-green-200' : 'bg-red-50 text-red-800 border-2 border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {loading && !selectedAssignment ? (
        <div className="bg-white p-12 rounded-xl shadow-sm text-center">
          <p className="text-gray-500">Loading test assignments...</p>
        </div>
      ) : (
        <>
          {/* Header with Filters */}
          {!selectedAssignment && !showCompletionForm && (
            <div className="bg-white p-6 rounded-xl shadow-sm mb-5">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Hospital Test Assignments</h2>
              
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
          )}

          {/* Assignments List */}
          {!selectedAssignment && !showCompletionForm && (
            <div className="bg-white p-6 rounded-xl shadow-sm">
              {assignments.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-6xl mb-4">🧪</p>
                  <p className="text-gray-500 text-lg">
                    {filter === 'all' 
                      ? 'No test assignments yet.'
                      : `No ${filter.replace('_', ' ')} test assignments.`
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {assignments.map((assignment) => (
                    <div
                      key={assignment._id}
                      className={`border-l-4 p-5 rounded-lg ${
                        assignment.status === 'pending' 
                          ? 'border-yellow-500 bg-yellow-50'
                          : assignment.status === 'in_progress'
                          ? 'border-blue-500 bg-blue-50'
                          : assignment.status === 'completed'
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-300 bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-bold text-lg text-gray-800">
                              {assignment.testType?.name || 'Unknown Test'}
                            </h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusBadge(assignment.status)}`}>
                              {getStatusText(assignment.status)}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            <p className="text-gray-700">
                              <strong>Patient:</strong> {assignment.patient?.name} (ID: {assignment.patient?.patientId})
                            </p>
                            <p className="text-gray-700">
                              <strong>Hospital:</strong> {assignment.hospital?.name}
                            </p>
                            <p className="text-gray-700">
                              <strong>Category:</strong> {assignment.testType?.category || 'N/A'}
                            </p>
                            {assignment.scheduledDate && (
                              <p className="text-gray-700">
                                <strong>Scheduled:</strong> {new Date(assignment.scheduledDate).toLocaleString()}
                              </p>
                            )}
                          </div>

                          {assignment.notes && (
                            <p className="text-sm text-gray-600 mt-2">
                              <strong>Notes:</strong> {assignment.notes}
                            </p>
                          )}

                          <p className="text-xs text-gray-400 mt-2">
                            Assigned: {new Date(assignment.createdAt).toLocaleString()}
                          </p>
                        </div>

                        <div className="ml-4 flex flex-col gap-2">
                          <button
                            onClick={() => handleViewDetails(assignment._id)}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors whitespace-nowrap"
                          >
                            View Details
                          </button>
                          
                          {assignment.status === 'pending' && (
                            <button
                              onClick={() => handleStartAssignment(assignment._id)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors whitespace-nowrap"
                            >
                              Start Test
                            </button>
                          )}

                          {assignment.status === 'in_progress' && (
                            <button
                              onClick={() => {
                                setSelectedAssignment(assignment);
                                handleShowCompletionForm();
                              }}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors whitespace-nowrap"
                            >
                              Complete Test
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Assignment Details View */}
          {selectedAssignment && !showCompletionForm && (
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Test Assignment Details</h2>
                <button
                  onClick={() => setSelectedAssignment(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  ← Back to List
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-sm font-semibold text-gray-600 uppercase mb-2">Test Information</h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <p className="text-gray-800">
                      <strong>Test Name:</strong> {selectedAssignment.testType?.name}
                    </p>
                    <p className="text-gray-800">
                      <strong>Category:</strong> {selectedAssignment.testType?.category}
                    </p>
                    <p className="text-gray-800">
                      <strong>Status:</strong>{' '}
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusBadge(selectedAssignment.status)}`}>
                        {getStatusText(selectedAssignment.status)}
                      </span>
                    </p>
                    {selectedAssignment.scheduledDate && (
                      <p className="text-gray-800">
                        <strong>Scheduled:</strong> {new Date(selectedAssignment.scheduledDate).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-600 uppercase mb-2">Patient Information</h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <p className="text-gray-800">
                      <strong>Name:</strong> {selectedAssignment.patient?.name}
                    </p>
                    <p className="text-gray-800">
                      <strong>Patient ID:</strong> {selectedAssignment.patient?.patientId}
                    </p>
                    <p className="text-gray-800">
                      <strong>Email:</strong> {selectedAssignment.patient?.email}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-600 uppercase mb-2">Hospital Information</h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <p className="text-gray-800">
                      <strong>Name:</strong> {selectedAssignment.hospital?.name}
                    </p>
                    <p className="text-gray-800">
                      <strong>Hospital ID:</strong> {selectedAssignment.hospital?.hospitalId}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-600 uppercase mb-2">Assignment Info</h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <p className="text-gray-800">
                      <strong>Created:</strong> {new Date(selectedAssignment.createdAt).toLocaleString()}
                    </p>
                    {selectedAssignment.startedAt && (
                      <p className="text-gray-800">
                        <strong>Started:</strong> {new Date(selectedAssignment.startedAt).toLocaleString()}
                      </p>
                    )}
                    {selectedAssignment.completedAt && (
                      <p className="text-gray-800">
                        <strong>Completed:</strong> {new Date(selectedAssignment.completedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Test Instructions */}
              {selectedAssignment.testType?.instructions?.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase mb-2">Test Instructions</h3>
                  <div className="bg-blue-50 border-2 border-blue-200 p-4 rounded-lg">
                    <ol className="list-decimal list-inside space-y-2">
                      {selectedAssignment.testType.instructions
                        .sort((a, b) => (a.order || 0) - (b.order || 0))
                        .map((instruction, idx) => (
                          <li key={instruction._id || idx} className="text-gray-800">
                            {instruction.step}
                          </li>
                        ))}
                    </ol>
                  </div>
                </div>
              )}

              {/* Assignment Notes */}
              {selectedAssignment.notes && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase mb-2">Assignment Notes</h3>
                  <div className="bg-yellow-50 border-2 border-yellow-200 p-4 rounded-lg">
                    <p className="text-gray-800">{selectedAssignment.notes}</p>
                  </div>
                </div>
              )}

              {/* Results (if completed) */}
              {selectedAssignment.status === 'completed' && selectedAssignment.results && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase mb-2">Test Results</h3>
                  <div className="bg-green-50 border-2 border-green-200 p-4 rounded-lg">
                    <p className="text-gray-800 whitespace-pre-wrap">{selectedAssignment.results}</p>
                  </div>
                </div>
              )}

              {/* Documents (if completed) */}
              {selectedAssignment.status === 'completed' && selectedAssignment.resultDocuments?.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase mb-2">Uploaded Documents</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedAssignment.resultDocuments.map((doc, idx) => (
                      <a
                        key={idx}
                        href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/${doc.filePath}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 bg-gray-50 border-2 border-gray-200 rounded-lg hover:bg-gray-100 transition-colors no-underline"
                      >
                        <span className="text-2xl">📄</span>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800">{doc.category === 'test_report' ? 'Test Report' : 'Diagnosis Report'}</p>
                          <p className="text-xs text-gray-500">Uploaded {new Date(doc.uploadedAt).toLocaleString()}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                {selectedAssignment.status === 'pending' && (
                  <button
                    onClick={() => handleStartAssignment(selectedAssignment._id)}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Start Test
                  </button>
                )}

                {selectedAssignment.status === 'in_progress' && (
                  <button
                    onClick={handleShowCompletionForm}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
                  >
                    Complete Test
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Completion Form */}
          {showCompletionForm && selectedAssignment && (
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border-2 border-emerald-500/20 animate-in zoom-in-95 duration-300">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Complete Test Results</h2>
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Submit final findings and reports</p>
                </div>
                <button
                  onClick={() => {
                    setShowCompletionForm(false);
                    setMessage({ type: '', text: '' });
                  }}
                  className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-rose-500 transition-all text-xl"
                >
                  ×
                </button>
              </div>

              {/* Form Message */}
              {message.text && (
                <div className={`mb-6 p-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-center animate-pulse ${
                  message.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                }`}>
                  ⚠️ {message.text}
                </div>
              )}

              <form onSubmit={handleCompleteAssignment} className="space-y-8">
                {/* Test Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-2xl">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Test Type</p>
                    <p className="font-black text-slate-800 dark:text-white uppercase tracking-tight">{selectedAssignment.testType?.name}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-2xl">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Patient Name</p>
                    <p className="font-black text-slate-800 dark:text-white uppercase tracking-tight">{selectedAssignment.patient?.name}</p>
                  </div>
                </div>

                {/* Test Results */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 ml-1">
                    Findings / Observations *
                  </label>
                  <textarea
                    value={results}
                    onChange={(e) => setResults(e.target.value)}
                    placeholder="Enter detailed observations and findings here..."
                    rows={8}
                    className="w-full px-6 py-5 bg-slate-50 dark:bg-slate-800 border-none rounded-[2rem] text-sm font-bold dark:text-white focus:ring-2 focus:ring-emerald-500 transition-all outline-none resize-none"
                    required
                  />
                </div>

                {/* File Uploads */}
                <div className="space-y-4">
                   <div className="flex justify-between items-center px-1">
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                      Test Documents
                    </label>
                    <button
                      type="button"
                      onClick={handleFileAdd}
                      className="px-4 py-2 bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all"
                    >
                      + Add File
                    </button>
                   </div>
                  
                  {files.length === 0 ? (
                    <div className="bg-slate-50 dark:bg-slate-800 p-8 rounded-[2rem] text-center border-2 border-dashed border-slate-200 dark:border-slate-700">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">No documents attached</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {files.map((item, index) => (
                        <div key={index} className="bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl relative group border border-transparent hover:border-emerald-500/20 transition-all">
                          <button
                            type="button"
                            onClick={() => handleFileRemove(index)}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ×
                          </button>
                          
                          <div className="space-y-3">
                            <div>
                               <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase block mb-1">Category</label>
                               <select
                                 value={item.category}
                                 onChange={(e) => handleCategoryChange(index, e.target.value)}
                                 className="w-full px-3 py-2 bg-white dark:bg-slate-900 border-none rounded-xl text-[11px] font-bold dark:text-white outline-none focus:ring-1 focus:ring-emerald-500 appearance-none"
                               >
                                 <option value="test_report">Test Report</option>
                                 <option value="diagnosis_report">Diagnostic Report</option>
                               </select>
                            </div>
                            <div>
                               <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase block mb-1">Choose File</label>
                               <input
                                 type="file"
                                 onChange={(e) => handleFileChange(index, e.target.files[0])}
                                 accept="image/*,.pdf,.doc,.docx"
                                 className="w-full text-[10px] dark:text-slate-400 file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[9px] file:font-black file:uppercase file:bg-emerald-600 file:text-white"
                               />
                               {item.file && <p className="text-[9px] font-black text-emerald-500 mt-1 truncate">{item.file.name}</p>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-slate-100">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50 hover:bg-emerald-700"
                  >
                    {submitting ? 'Transmitting Data...' : 'Submit Test Results'}
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

export default NurseTestAssignments;
