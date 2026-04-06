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

  const resolveFileUrl = (filePath) => {
    if (!filePath) return '#';
    if (filePath.startsWith('http')) return filePath;
    const cleanPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
    const backendOrigin = import.meta.env.VITE_BACKEND_ORIGIN || '';
    return backendOrigin ? `${backendOrigin}${cleanPath}` : cleanPath;
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
        <div className={`mb-8 p-6 rounded-[2rem] text-[10px] font-black uppercase tracking-widest text-center animate-in slide-in-from-top-4 duration-500 shadow-xl border-l-[6px] ${
          message.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 border-emerald-500' 
            : 'bg-rose-50 dark:bg-rose-900/10 text-rose-600 dark:text-rose-400 border-rose-500'
        }`}>
          <div className="flex items-center justify-center gap-3">
             <span className="text-xl">{message.type === 'success' ? '✅' : '⚠️'}</span>
             <span>{message.text}</span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-40 animate-pulse">
           <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
           <p className="mt-8 text-slate-400 font-black tracking-[0.3em] uppercase text-[10px]">Synchronizing Active protocols...</p>
        </div>
      ) : (
        <>
          {/* Header & Filters */}
          <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-sm border border-slate-200/50 dark:border-slate-800 mb-8 transition-all">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-10">
              <div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Clinical Inbox</h2>
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mt-2">Authenticated Assignment Queue</p>
              </div>
              <div className="flex flex-wrap gap-3">
                {[
                  { id: 'all', label: 'All Artifacts', count: stats.all, color: 'slate' },
                  { id: 'pending', label: 'Pending', count: stats.pending, color: 'amber' },
                  { id: 'in_progress', label: 'In Progress', count: stats.in_progress, color: 'blue' },
                  { id: 'completed', label: 'Completed', count: stats.completed, color: 'emerald' }
                ].map((btn) => (
                  <button
                    key={btn.id}
                    onClick={() => setFilter(btn.id)}
                    className={`px-6 py-3 rounded-2xl font-black text-[9px] uppercase tracking-widest transition-all active:scale-95 border ${
                      filter === btn.id 
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xl shadow-emerald-600/20' 
                        : 'bg-white dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-800 hover:border-emerald-500/30'
                    }`}
                  >
                    {btn.label} <span className={`ml-2 opacity-60 ${filter === btn.id ? 'text-white' : ''}`}>[{btn.count}]</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Assignments List */}
          {!selectedAssignment && (
            <div className="pb-20">
              {filteredAssignments.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 p-32 rounded-[3.5rem] shadow-sm text-center border border-slate-200/50 dark:border-slate-800">
                  <p className="text-8xl mb-10 grayscale opacity-10">📂</p>
                  <p className="text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.4em] text-[11px] mb-4">Registry Null</p>
                  <p className="text-slate-400 dark:text-slate-600 text-sm font-bold max-w-xs mx-auto leading-relaxed">No protocols discovered matching the current filter parameters.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  {filteredAssignments.map((assignment) => (
                    <div 
                      key={assignment._id} 
                      className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-200/50 dark:border-slate-800 hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 group/item relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover/item:bg-emerald-500/10 transition-colors" />
                      
                      <div className="flex justify-between items-start mb-8 relative z-10">
                        <div className="flex-1">
                           <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                             <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> 
                             {assignment.patient?.patientId}
                           </p>
                           <h3 className="font-black text-2xl text-slate-900 dark:text-white uppercase tracking-tight line-clamp-1 mb-2 group-hover/item:text-emerald-600 dark:group-hover/item:text-emerald-400 transition-colors">
                            {assignment.patient?.name}
                           </h3>
                           <div className="flex items-center gap-3 mt-4">
                              <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                                assignment.status === 'completed' 
                                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/30' 
                                  : assignment.status === 'pending'
                                  ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800/30'
                                  : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800/30'
                              }`}>
                                {getStatusText(assignment.status)}
                              </span>
                           </div>
                        </div>
                        <div className="text-right flex flex-col items-end">
                           <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest bg-slate-50 dark:bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800">{new Date(assignment.createdAt).toLocaleDateString()}</p>
                           {assignment.dueDate && (
                             <p className={`text-[9px] font-black uppercase mt-3 tracking-widest px-3 py-1 rounded-lg ${new Date(assignment.dueDate) < new Date() ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-500' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-500'}`}>
                               DEADLINE: {new Date(assignment.dueDate).toLocaleDateString()}
                             </p>
                           )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-10 relative z-10">
                         <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5">Source Node</p>
                            <p className="text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase truncate">Dr. {assignment.doctor?.name}</p>
                         </div>
                         <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5">Facility</p>
                            <p className="text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase truncate">{assignment.hospital?.name}</p>
                         </div>
                      </div>

                      <div className="flex gap-4 relative z-10">
                        <button
                          onClick={() => handleViewDetails(assignment)}
                          className="flex-1 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 border-none"
                        >
                          Access Profile
                        </button>
                        {assignment.status === 'pending' && (
                          <button
                            onClick={() => handleStartAssignment(assignment._id)}
                            className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-500/20 transition-all active:scale-95 hover:bg-emerald-700"
                          >
                            Synchronize
                          </button>
                        )}
                        {assignment.status === 'in_progress' && (
                          <button
                            onClick={() => { setSelectedAssignment(assignment); handleStartCompletion(); }}
                            className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-500/20 transition-all active:scale-95 hover:bg-blue-700"
                          >
                            Finalize
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Assignment Details View */}
          {selectedAssignment && !showCompletionForm && (
            <div className="bg-white dark:bg-slate-900 p-12 rounded-[3.5rem] shadow-2xl border border-slate-200/50 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-500 pb-20">
              <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-12 border-b dark:border-slate-800 pb-10">
                <div>
                  <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Protocol Parameters</h3>
                  <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Secure Diagnostic Subsystem
                  </p>
                </div>
                <button
                  onClick={() => setSelectedAssignment(null)}
                  className="px-8 py-3 bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all border border-slate-100 dark:border-slate-800"
                >
                  ← Terminate View
                </button>
              </div>

              <div className="space-y-12">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {[
                    { label: 'Artifact Subject', val: selectedAssignment.patient?.name, sub: selectedAssignment.patient?.patientId },
                    { label: 'Reporting Lead', val: `Dr. ${selectedAssignment.doctor?.name}`, sub: selectedAssignment.doctor?.email },
                    { label: 'Physical Node', val: selectedAssignment.hospital?.name, sub: 'Facility Core' },
                    { label: 'Current Phase', val: getStatusText(selectedAssignment.status), sub: 'Protocol Status', isStatus: true }
                  ].map((item, i) => (
                    <div key={i} className="bg-slate-50 dark:bg-slate-950/50 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 italic">{item.label}</p>
                      {item.isStatus ? (
                         <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border inline-block ${getStatusBadge(selectedAssignment.status)}`}>
                            {item.val}
                         </span>
                      ) : (
                        <p className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">{item.val}</p>
                      )}
                      <p className="text-[10px] font-bold text-slate-500 mt-2 truncate">{item.sub}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-10 rounded-[3rem] border-l-[8px] border-emerald-500 shadow-sm relative overflow-hidden">
                  <div className="absolute top-4 right-6 text-6xl opacity-10">📝</div>
                  <p className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Executive Directives
                  </p>
                  <p className="text-slate-800 dark:text-slate-200 font-bold text-lg leading-relaxed italic whitespace-pre-wrap">
                    "{selectedAssignment.instructions}"
                  </p>
                </div>

                {selectedAssignment.attachments && selectedAssignment.attachments.length > 0 && (
                  <div>
                    <span className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] block mb-6 ml-2 italic">Supporting Clinical Artifacts</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {selectedAssignment.attachments.map((attachment, index) => {
                         const fileUrl = resolveFileUrl(attachment);
                        return (
                          <a
                            key={index}
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-white dark:bg-slate-950 p-6 rounded-[2rem] hover:bg-emerald-600 group border border-slate-100 dark:border-slate-800 transition-all duration-300 flex items-center justify-between no-underline shadow-sm"
                          >
                            <span className="text-[11px] font-black text-slate-800 dark:text-slate-200 group-hover:text-white uppercase tracking-widest flex items-center gap-4">
                              <span className="text-2xl group-hover:scale-110 transition-transform">📄</span> Artifact_{index + 1}
                            </span>
                            <span className="text-[10px] font-black text-emerald-500 group-hover:text-white/80 uppercase tracking-widest group-hover:translate-x-1 transition-transform">Access ↗</span>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selectedAssignment.voiceNote?.filePath && (
                  <div className="bg-indigo-50/60 dark:bg-indigo-900/10 p-8 rounded-[2.5rem] border border-indigo-100 dark:border-indigo-900/30">
                    <p className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] mb-4">Doctor Voice Note</p>
                    <audio
                      controls
                      src={resolveFileUrl(selectedAssignment.voiceNote.filePath)}
                      className="w-full mb-4"
                    />
                    <div className="bg-white dark:bg-slate-950 rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Transcript</p>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                        {selectedAssignment.voiceNote.transcript || 'Transcript is not available for this voice note yet.'}
                      </p>
                    </div>
                  </div>
                )}

                {selectedAssignment.dueDate && (
                  <div className="bg-rose-500 p-8 rounded-[2.5rem] flex items-center justify-between shadow-2xl shadow-rose-500/20 text-white">
                    <div>
                      <p className="text-[10px] font-black text-white/70 uppercase tracking-[0.3em] mb-1.5 italic">Submission Vector Deadline</p>
                      <p className="text-xl font-black uppercase tracking-tight">{new Date(selectedAssignment.dueDate).toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <span className="text-4xl animate-bounce">⏱️</span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-6 pt-12 border-t dark:border-slate-800">
                  {selectedAssignment.status === 'pending' && (
                    <button
                      onClick={() => handleStartAssignment(selectedAssignment._id)}
                      className="flex-1 py-5 bg-emerald-600 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-emerald-500/20 active:scale-95 transition-all hover:bg-emerald-700 hover:-translate-y-1"
                    >
                      Initialize Assignment
                    </button>
                  )}
                  {selectedAssignment.status === 'in_progress' && (
                    <button
                      onClick={handleStartCompletion}
                      className="flex-1 py-5 bg-blue-600 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-blue-500/20 active:scale-95 transition-all hover:bg-blue-700 hover:-translate-y-1"
                    >
                      Finalize Output
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedAssignment(null)}
                    className="flex-1 py-5 bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 rounded-[2rem] font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all border border-slate-100 dark:border-slate-800"
                  >
                    Close Protocol
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Completion Form Modal */}
          {showCompletionForm && selectedAssignment && (
            <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center z-[100] p-4 animate-in fade-in duration-500">
              <div className="bg-white dark:bg-slate-950 rounded-[3.5rem] shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-slate-200 dark:border-emerald-500/10 flex flex-col">
                <div className="flex justify-between items-center px-12 py-10 border-b dark:border-slate-800/50 sticky top-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md z-10">
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Protocol Finalization</h3>
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mt-2 italic">Authenticated Output Generation</p>
                  </div>
                  <button
                    onClick={() => setShowCompletionForm(false)}
                    className="w-12 h-12 rounded-[1.5rem] bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-2xl font-black text-slate-400 hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                  >
                    ×
                  </button>
                </div>

                <div className="p-12 overflow-y-auto custom-scrollbar flex-1">
                  {message.text && (
                    <div className="mb-10 p-6 bg-rose-50 dark:bg-rose-900/10 text-rose-600 dark:text-rose-400 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center border-l-4 border-rose-500">
                      ⚠️ SYNTAX ERROR: {message.text}
                    </div>
                  )}

                  <form onSubmit={handleCompleteAssignment} className="space-y-12">
                    <div>
                      <label className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-2 mb-4 block italic italic">
                        Clinical Observations & Regimen *
                      </label>
                      <textarea
                        value={prescription}
                        onChange={(e) => setPrescription(e.target.value)}
                        rows={8}
                        placeholder="Define the patient findings and medical directives..."
                        className="w-full px-8 py-7 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] text-sm font-bold dark:text-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none resize-none leading-relaxed"
                        required
                      />
                    </div>

                    <div>
                       <div className="flex justify-between items-center mb-6 px-2">
                          <span className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] italic">Telemetry Artifacts</span>
                          <button
                            type="button"
                            onClick={handleFileAdd}
                            className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all"
                          >
                            + Add Data Node
                          </button>
                       </div>
                      
                      {files.length === 0 ? (
                        <div className="bg-slate-50 dark:bg-slate-900/30 p-12 rounded-[2.5rem] text-center border-2 border-dashed border-slate-200 dark:border-slate-800">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic">No binary objects attached</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {files.map((item, index) => (
                            <div key={index} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] relative group border border-slate-100 dark:border-slate-800 hover:border-emerald-500/30 transition-all shadow-sm">
                              <button
                                type="button"
                                onClick={() => handleFileRemove(index)}
                                className="absolute -top-3 -right-3 w-8 h-8 bg-rose-500 text-white rounded-xl flex items-center justify-center text-sm shadow-xl opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                ×
                              </button>
                              
                              <div className="space-y-4">
                                 <div>
                                   <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase block mb-2 px-1">Classification</label>
                                   <select
                                     value={item.category}
                                     onChange={(e) => handleCategoryChange(index, e.target.value)}
                                     className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-[11px] font-black uppercase dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 transition-all appearance-none cursor-pointer"
                                   >
                                     <option value="test_report">Diagnostic Report</option>
                                     <option value="diagnosis_report">Clinical Analysis</option>
                                   </select>
                                 </div>
                                 <div>
                                   <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase block mb-2 px-1">Data Stream</label>
                                   <div className="relative">
                                     <input
                                       type="file"
                                       onChange={(e) => handleFileChange(index, e.target.files[0])}
                                       accept=".jpg,.jpeg,.png,.pdf"
                                       className="w-full text-[10px] font-bold dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[9px] file:font-black file:uppercase file:bg-slate-900 dark:file:bg-white file:text-white dark:file:text-slate-900 hover:file:opacity-80 transition-all cursor-pointer"
                                     />
                                   </div>
                                   {item.file && <p className="text-[9px] font-black text-emerald-500 mt-2 truncate italic px-1">Linked: {item.file.name}</p>}
                                 </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-6 pt-10 border-t dark:border-slate-800">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="flex-1 py-5 bg-emerald-600 text-white rounded-[2rem] font-black text-[11px] uppercase tracking-widest shadow-2xl shadow-emerald-500/30 active:scale-95 transition-all disabled:opacity-50 hover:bg-emerald-700 hover:-translate-y-1"
                      >
                        {submitting ? 'Transmitting Data...' : 'Finalize & Transmit'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCompletionForm(false)}
                        className="flex-1 py-5 bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 rounded-[2rem] font-black text-[11px] uppercase tracking-widest active:scale-95 transition-all border border-slate-100 dark:border-slate-800"
                      >
                        Abort Submission
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
};

export default NurseAssignments;
