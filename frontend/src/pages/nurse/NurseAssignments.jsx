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
  const [toast, setToast] = useState({ show: false, type: 'error', text: '' });

  const showToast = (type, text) => {
    setToast({ show: true, type, text });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 3500);
  };

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

  const handleFileChange = (index, event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.doc', '.docx'];
    const fileName = file.name?.toLowerCase() || '';
    const isAllowed = allowedExtensions.some((ext) => fileName.endsWith(ext));

    if (!isAllowed) {
      const clearedFiles = [...files];
      if (clearedFiles[index]) {
        clearedFiles[index].file = null;
      }
      setFiles(clearedFiles);
      event.target.value = '';
      showToast('error', 'Unsupported file. Use PDF, JPG, PNG, WEBP, HEIC, DOC, or DOCX.');
      return;
    }

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
      showToast('error', 'Please provide prescription text.');
      return;
    }

    setSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      const submitData = new FormData();
      submitData.append('prescription', prescription);
      
      // Add categorized files
      let uploadIndex = 0;
      files.forEach((item) => {
        if (item.file) {
          submitData.append('medicalFiles', item.file);
          submitData.append(`fileCategories[${uploadIndex}]`, item.category);
          uploadIndex += 1;
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
      showToast('error', error?.response?.data?.message || 'Failed to complete assignment');
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
      {toast.show && (
        <div className={`fixed top-4 right-4 z-110 px-4 py-3 rounded-xl shadow-xl border text-xs font-black uppercase tracking-widest animate-in slide-in-from-top-2 duration-200 ${toast.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
          {toast.text}
        </div>
      )}

      {/* Global Message */}
      {message.text && !showCompletionForm && (
        <div className={`mb-6 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center animate-in slide-in-from-top-2 duration-300 ${
          message.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
        }`}>
          {message.type === 'success' ? '✅' : '⚠️'} {message.text}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
           <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
           <p className="mt-4 text-slate-500 font-medium tracking-widest uppercase text-[10px]">Synchronizing assignments...</p>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-200/50 dark:border-slate-800 mb-6 transition-all">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-6">Patient Assignments</h2>
            
            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              {[
                { id: 'all', label: 'Total', count: stats.all, color: 'indigo' },
                { id: 'pending', label: 'Pending', count: stats.pending, color: 'amber' },
                { id: 'in_progress', label: 'In Progress', count: stats.in_progress, color: 'blue' },
                { id: 'completed', label: 'Completed', count: stats.completed, color: 'emerald' }
              ].map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => setFilter(btn.id)}
                  className={`px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 ${
                    filter === btn.id 
                      ? `bg-${btn.color}-600 text-white shadow-lg shadow-${btn.color}-500/20` 
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {btn.label} ({btn.count})
                </button>
              ))}
            </div>
          </div>

          {/* Assignments List */}
          {!selectedAssignment && (
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-200/50 dark:border-slate-800 transition-all overflow-hidden">
              {filteredAssignments.length === 0 ? (
                <div className="text-center py-20 grayscale opacity-40">
                  <p className="text-7xl mb-6">📂</p>
                  <p className="text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest text-[10px]">
                    {filter === 'all' && 'No assignments yet'}
                    {filter === 'pending' && 'Catch up complete'}
                    {filter === 'in_progress' && 'No active tasks'}
                    {filter === 'completed' && 'No archives found'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredAssignments.map((assignment) => (
                    <div key={assignment._id} className="bg-slate-50 dark:bg-slate-800/50 border border-transparent dark:border-slate-700 rounded-[2rem] p-6 hover:shadow-xl transition-all group/item">
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-4">
                            <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                              assignment.status === 'completed' 
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' 
                                : assignment.status === 'pending'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                                : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400'
                            }`}>
                              {getStatusText(assignment.status)}
                            </span>
                          </div>
                          <p className="font-black text-lg text-slate-800 dark:text-white line-clamp-1 group-hover/item:text-indigo-600 transition-colors uppercase tracking-tight">
                            {assignment.patient?.name}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">ID: {assignment.patient?.patientId}</p>
                        </div>
                        <div className="text-right">
                           <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase">{new Date(assignment.createdAt).toLocaleDateString()}</p>
                           {assignment.dueDate && (
                             <p className={`text-[9px] font-black uppercase mt-1 ${new Date(assignment.dueDate) < new Date() ? 'text-red-500' : 'text-amber-500'}`}>
                               DUE: {new Date(assignment.dueDate).toLocaleDateString()}
                             </p>
                           )}
                        </div>
                      </div>
                      
                      <div className="space-y-3 mb-6">
                         <div className="flex items-center gap-3 text-[11px] font-bold text-slate-600 dark:text-slate-400">
                            <span className="w-5 h-5 bg-white dark:bg-slate-700 rounded-md flex items-center justify-center text-[10px]">👨‍⚕️</span>
                            Dr. {assignment.doctor?.name}
                         </div>
                         <div className="flex items-center gap-3 text-[11px] font-bold text-slate-600 dark:text-slate-400">
                            <span className="w-5 h-5 bg-white dark:bg-slate-700 rounded-md flex items-center justify-center text-[10px]">🏥</span>
                            {assignment.hospital?.name}
                         </div>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => handleViewDetails(assignment)}
                          className="flex-1 py-3.5 bg-indigo-600 hover:bg-slate-900 dark:hover:bg-white dark:hover:text-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-500/10 transition-all active:scale-95"
                        >
                          Details
                        </button>
                        {assignment.status === 'pending' && (
                          <button
                            onClick={() => handleStartAssignment(assignment._id)}
                            className="px-6 py-3.5 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/10 transition-all active:scale-95 hover:bg-emerald-700"
                          >
                            Acquire
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
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-200/50 dark:border-slate-800 animate-in fade-in duration-300">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Assignment Details</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Instructions from doctor</p>
                </div>
                <button
                  onClick={() => setSelectedAssignment(null)}
                  className="px-6 py-2 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  ← Back
                </button>
              </div>

              <div className="space-y-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl relative group">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Patient</p>
                    <p className="text-sm font-black text-slate-800 dark:text-white">{selectedAssignment.patient?.name}</p>
                    <p className="text-[10px] font-bold text-slate-500 mt-1">{selectedAssignment.patient?.patientId}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Lead Physician</p>
                    <p className="text-sm font-black text-slate-800 dark:text-white">Dr. {selectedAssignment.doctor?.name}</p>
                    <p className="text-[10px] font-bold text-slate-500 mt-1">{selectedAssignment.doctor?.email}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Facility Base</p>
                    <p className="text-sm font-black text-slate-800 dark:text-white truncate">{selectedAssignment.hospital?.name}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Current Phase</p>
                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${getStatusBadge(selectedAssignment.status)}`}>
                      {getStatusText(selectedAssignment.status)}
                    </span>
                  </div>
                </div>

                <div className="bg-indigo-50 dark:bg-indigo-900/10 p-8 rounded-[2rem] border-l-4 border-indigo-500">
                  <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-4">Doctor instructions</p>
                  <p className="text-slate-800 dark:text-slate-300 font-bold leading-relaxed whitespace-pre-wrap">"{selectedAssignment.instructions}"</p>
                </div>

                {selectedAssignment.attachments && selectedAssignment.attachments.length > 0 && (
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4 ml-1">Attached files</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {selectedAssignment.attachments.map((attachment, index) => {
                         const fileUrl = attachment.includes('/backend/uploads/') 
                            ? attachment.replace('/backend/uploads/', '/uploads/') 
                            : attachment.startsWith('http') ? attachment : `/uploads/${attachment.split('/').pop()}`;
                        return (
                          <a
                            key={index}
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-indigo-500/30 transition-all flex items-center justify-between group no-underline"
                          >
                            <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-3">
                              <span className="text-xl">📎</span> File {index + 1}
                            </span>
                            <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest group-hover:translate-x-1 transition-transform">Access ↗</span>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selectedAssignment.dueDate && (
                  <div className="bg-amber-50 dark:bg-amber-900/10 p-5 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                    <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">Due date</p>
                    <p className="text-sm font-black text-amber-700 dark:text-amber-300 mt-1">{new Date(selectedAssignment.dueDate).toLocaleString()}</p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-4 pt-10 border-t dark:border-slate-800">
                  {selectedAssignment.status === 'pending' && (
                    <button
                      onClick={() => handleStartAssignment(selectedAssignment._id)}
                      className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-500/20 active:scale-95 transition-all hover:bg-indigo-700"
                    >
                      Start Assignment
                    </button>
                  )}
                  {selectedAssignment.status === 'in_progress' && (
                    <button
                      onClick={handleStartCompletion}
                      className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all hover:bg-emerald-700"
                    >
                      Complete Assignment
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedAssignment(null)}
                    className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Completion Form */}
          {showCompletionForm && selectedAssignment && (
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl border-2 border-emerald-500/20 animate-in zoom-in-95 duration-300">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Complete Assignment</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Add notes and upload reports</p>
                </div>
                <button
                  onClick={() => setShowCompletionForm(false)}
                  className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-red-500 transition-all text-xl"
                >
                  ×
                </button>
              </div>

              {message.text && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-[10px] font-black uppercase tracking-widest text-center animate-pulse">
                  ⚠️ {message.text}
                </div>
              )}

              <form onSubmit={handleCompleteAssignment} className="space-y-8">
                <div>
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 mb-2 block">
                    Prescription / Notes *
                  </label>
                  <textarea
                    value={prescription}
                    onChange={(e) => setPrescription(e.target.value)}
                    rows={8}
                    placeholder="Enter notes, findings, and prescription details..."
                    className="w-full px-6 py-5 bg-slate-50 dark:bg-slate-800 border-none rounded-[2rem] text-sm font-bold dark:text-white focus:ring-2 focus:ring-emerald-500 transition-all outline-none resize-none"
                    required
                  />
                </div>

                <div>
                   <div className="flex justify-between items-center mb-4 px-1">
                      <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Reports</span>
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
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">No files added</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {files.map((item, index) => (
                        <div key={index} className="bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl relative group border border-transparent hover:border-emerald-500/20 transition-all">
                          <button
                            type="button"
                            onClick={() => handleFileRemove(index)}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ×
                          </button>
                          
                          <div className="space-y-3">
                             <div>
                               <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase block mb-1">Report Type</label>
                               <select
                                 value={item.category}
                                 onChange={(e) => handleCategoryChange(index, e.target.value)}
                                 className="w-full px-3 py-2 bg-white dark:bg-slate-900 border-none rounded-xl text-[11px] font-bold dark:text-white outline-none focus:ring-1 focus:ring-emerald-500 appearance-none"
                               >
                                 <option value="test_report">Test Report</option>
                                 <option value="diagnosis_report">Diagnosis Report</option>
                               </select>
                             </div>
                             <div>
                               <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase block mb-1">Choose File</label>
                               <input
                                 type="file"
                                 onChange={(e) => handleFileChange(index, e)}
                                 accept=".jpg,.jpeg,.png,.webp,.heic,.heif,.pdf,.doc,.docx"
                                 className="w-full text-[10px] font-bold dark:text-slate-400 file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[9px] file:font-black file:uppercase file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer"
                               />
                               {item.file && <p className="text-[9px] font-black text-emerald-500 mt-1 truncate">{item.file.name}</p>}
                             </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50 hover:bg-emerald-700"
                  >
                    {submitting ? 'Uploading...' : 'Submit'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCompletionForm(false)}
                    className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all"
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
