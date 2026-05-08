import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { useLanguage } from '../../context/LanguageContext';
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
  const [resolutionState, setResolutionState] = useState({ visible: false, sessionId: '', ambiguities: [], clarifications: {} });
  const { t } = useLanguage();

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
      setMessage({ type: 'success', text: t({ en: 'Assignment started. You can proceed.', hi: 'असाइनमेंट शुरू हो गया। अब आप आगे बढ़ सकते हैं।' }) });
      fetchAssignments();
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error starting assignment:', error);
      setMessage({ type: 'error', text: t({ en: 'Failed to start assignment. Please try again.', hi: 'असाइनमेंट शुरू नहीं हो सका। फिर कोशिश करें।' }) });
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
    setResolutionState({ visible: false, sessionId: '', ambiguities: [], clarifications: {} });
  };

  const handleFileAdd = () => {
    setFiles([...files, { file: null, category: 'test_report' }]);
  };

  const handleFileChange = (index, event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
    const fileName = file.name?.toLowerCase() || '';
    const isAllowed = allowedExtensions.some((ext) => fileName.endsWith(ext));

    if (!isAllowed) {
      const clearedFiles = [...files];
      if (clearedFiles[index]) {
        clearedFiles[index].file = null;
      }
      setFiles(clearedFiles);
      event.target.value = '';
      showToast('error', t({ en: 'Unsupported file. Use PDF, JPG, JPEG, or PNG.', hi: 'असमर्थित फाइल। PDF, JPG, JPEG, या PNG उपयोग करें।' }));
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
      setMessage({ type: 'error', text: t({ en: 'Please provide prescription text', hi: 'कृपया प्रिस्क्रिप्शन टेक्स्ट लिखें' }) });
      showToast('error', t({ en: 'Please provide prescription text.', hi: 'कृपया प्रिस्क्रिप्शन टेक्स्ट लिखें।' }));
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
      setMessage({ type: 'success', text: t({ en: 'Medical record created successfully! Redirecting...', hi: 'रिकॉर्ड सफलतापूर्वक बना! रीडायरेक्ट हो रहा है...' }) });
      
      setTimeout(() => {
        setShowCompletionForm(false);
        setSelectedAssignment(null);
        setFilter('all'); // Reset to show all assignments
        fetchAssignments(); // Refresh the list
      }, 1500);
    } catch (error) {
      if (error?.response?.data?.resolutionRequired) {
        const payload = error.response.data;
        const defaultClarifications = Object.fromEntries(
          (payload.ambiguities || []).map((item) => [item.rawFieldName, item.options?.[0] || 'fasting'])
        );
        setResolutionState({
          visible: true,
          sessionId: payload.sessionId,
          ambiguities: payload.ambiguities || [],
          clarifications: defaultClarifications
        });
        setMessage({
          type: 'error',
          text: payload.message || t({ en: 'Clarification is required to complete this record.', hi: 'रिकॉर्ड पूरा करने के लिए स्पष्टीकरण चाहिए।' })
        });
        return;
      }
      showToast('error', error?.response?.data?.message || t({ en: 'Failed to complete assignment', hi: 'असाइनमेंट पूरा नहीं हो सका' }));
      setMessage({ 
        type: 'error', 
        text: error?.response?.data?.message || t({ en: 'Failed to complete assignment', hi: 'असाइनमेंट पूरा नहीं हो सका' }) 
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClarificationChange = (rawFieldName, value) => {
    setResolutionState((prev) => ({
      ...prev,
      clarifications: {
        ...prev.clarifications,
        [rawFieldName]: value
      }
    }));
  };

  const handleResolveClarification = async () => {
    if (!resolutionState.sessionId) return;
    setSubmitting(true);
    try {
      await nurseService.resolveUploadSession(resolutionState.sessionId, resolutionState.clarifications);
      setMessage({ type: 'success', text: t({ en: 'Medical record created successfully! Redirecting...', hi: 'रिकॉर्ड सफलतापूर्वक बना! रीडायरेक्ट हो रहा है...' }) });
      setTimeout(() => {
        setShowCompletionForm(false);
        setSelectedAssignment(null);
        setFilter('all');
        resetForm();
        fetchAssignments();
      }, 1500);
    } catch (error) {
      showToast('error', error?.response?.data?.message || t({ en: 'Failed to resolve clarification', hi: 'स्पष्टीकरण हल नहीं हो सका' }));
      setMessage({
        type: 'error',
        text: error?.response?.data?.message || t({ en: 'Failed to resolve clarification', hi: 'स्पष्टीकरण हल नहीं हो सका' })
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
      pending: t({ en: 'Pending', hi: 'लंबित' }),
      in_progress: t({ en: 'In Progress', hi: 'चल रहा है' }),
      completed: t({ en: 'Completed', hi: 'पूरा हुआ' }),
      cancelled: t({ en: 'Cancelled', hi: 'रद्द' })
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
    <DashboardLayout title={t({ en: 'My Assignments', hi: 'मेरे असाइनमेंट' })}>
      {toast.show && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed top-20 md:top-6 right-4 z-[60] px-4 py-3 rounded-xl shadow-xl border text-xs font-black uppercase tracking-widest animate-in slide-in-from-top-2 duration-200 ${toast.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}
        >
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
           <p className="mt-8 text-slate-400 font-black tracking-[0.3em] uppercase text-[10px]">{t({ en: 'Loading assignments...', hi: 'असाइनमेंट लोड हो रहे हैं...' })}</p>
        </div>
      ) : (
        <>
          {resolutionState.visible && (
            <div className="mb-6 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-[2rem] p-6">
              <h3 className="text-sm font-black text-amber-700 dark:text-amber-300 uppercase tracking-wider mb-2">{t({ en: 'Clarification Required', hi: 'स्पष्टीकरण जरूरी' })}</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mb-4">{t({ en: 'An ambiguous blood sugar field was found. Confirm the correct test type to finish the record.', hi: 'ब्लड शुगर फील्ड अस्पष्ट है। रिकॉर्ड पूरा करने के लिए सही टेस्ट प्रकार चुनें।' })}</p>
              <div className="space-y-4">
                {resolutionState.ambiguities.map((item) => (
                  <div key={item.rawFieldName} className="bg-white dark:bg-slate-900 border border-amber-100 dark:border-amber-900/40 rounded-2xl p-4">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-2">{item.rawFieldName}</p>
                    <select
                      value={resolutionState.clarifications[item.rawFieldName] || item.options?.[0] || 'fasting'}
                      onChange={(e) => handleClarificationChange(item.rawFieldName, e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-700 dark:text-slate-200"
                    >
                      {(item.options || []).map((option) => (
                        <option key={option} value={option}>
                          {option === 'post_meal' ? t({ en: 'Post-Meal Blood Sugar', hi: 'भोजन के बाद ब्लड शुगर' }) : `${option.charAt(0).toUpperCase()}${option.slice(1).replace('_', ' ')} ${t({ en: 'Blood Sugar', hi: 'ब्लड शुगर' })}`}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleResolveClarification}
                  disabled={submitting}
                  className="px-5 py-3 rounded-xl bg-amber-600 text-white text-xs font-black uppercase tracking-wider disabled:opacity-50"
                >
                  {submitting ? t({ en: 'Resolving...', hi: 'हल हो रहा है...' }) : t({ en: 'Confirm And Complete', hi: 'पुष्टि करें और पूरा करें' })}
                </button>
              </div>
            </div>
          )}

          {/* Header & Filters */}
          <div className="bg-white dark:bg-slate-900 p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] shadow-sm border border-slate-200/50 dark:border-slate-800 mb-8 transition-all">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 sm:gap-8 mb-6 sm:mb-10">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">{t({ en: 'Assignment Inbox', hi: 'असाइनमेंट इनबॉक्स' })}</h2>
                <p className="text-[9px] sm:text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mt-2">{t({ en: 'Assignment Queue', hi: 'असाइनमेंट कतार' })}</p>
              </div>
              <div className="flex flex-wrap gap-2 md:gap-3">
                {[
                  { id: 'all', label: t({ en: 'All', hi: 'सभी' }), count: stats.all, color: 'slate' },
                  { id: 'pending', label: t({ en: 'Pending', hi: 'लंबित' }), count: stats.pending, color: 'amber' },
                  { id: 'in_progress', label: t({ en: 'In Progress', hi: 'चल रहा है' }), count: stats.in_progress, color: 'blue' },
                  { id: 'completed', label: t({ en: 'Done', hi: 'पूरा' }), count: stats.completed, color: 'emerald' }
                ].map((btn) => (
                  <button
                    key={btn.id}
                    onClick={() => setFilter(btn.id)}
                    className={`px-4 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl font-black text-[8px] sm:text-[9px] uppercase tracking-widest transition-all active:scale-95 border ${
                      filter === btn.id 
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xl shadow-emerald-600/20' 
                        : 'bg-white dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-800 hover:border-emerald-500/30'
                    }`}
                  >
                    {btn.label} <span className={`ml-1 sm:ml-2 opacity-60 ${filter === btn.id ? 'text-white' : ''}`}>[{btn.count}]</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Assignments List */}
          {!selectedAssignment && (
            <div className="pb-20">
              {filteredAssignments.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 p-20 rounded-[3.5rem] shadow-sm text-center border border-slate-200/50 dark:border-slate-800">
                  <div className="w-20 h-20 rounded-[2rem] bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-4xl mx-auto mb-8">🩺</div>
                  <p className="text-slate-800 dark:text-slate-100 font-black uppercase tracking-[0.2em] text-sm mb-3">
                    {filter === 'all' ? t({ en: 'No doctor tasks yet', hi: 'अभी कोई डॉक्टर कार्य नहीं' }) : `${t({ en: 'No', hi: 'कोई' })} ${getStatusText(filter)} ${t({ en: 'tasks', hi: 'कार्य' })}`}
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-medium max-w-md mx-auto leading-relaxed">
                    {t({ en: 'Assigned tasks will appear here with instructions and attachments.', hi: 'असाइन किए गए कार्य यहां निर्देशों और फाइलों के साथ दिखेंगे।' })}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  {filteredAssignments.map((assignment) => (
                    <div 
                      key={assignment._id} 
                      className="bg-white dark:bg-slate-900 p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] border border-slate-200/50 dark:border-slate-800 hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 group/item relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover/item:bg-emerald-500/10 transition-colors" />
                      
                      <div className="flex justify-between items-start mb-6 sm:mb-8 relative z-10">
                        <div className="flex-1">
                           <p className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3 sm:mb-4 flex items-center gap-2">
                             <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> 
                             {assignment.patient?.patientId}
                           </p>
                           <h3 className="font-black text-xl sm:text-2xl text-slate-900 dark:text-white uppercase tracking-tight line-clamp-1 mb-2 group-hover/item:text-emerald-600 dark:group-hover/item:text-emerald-400 transition-colors">
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
                               {t({ en: 'DEADLINE', hi: 'डेडलाइन' })}: {new Date(assignment.dueDate).toLocaleDateString()}
                             </p>
                           )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-10 relative z-10">
                         <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                             <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5">{t({ en: 'Doctor', hi: 'डॉक्टर' })}</p>
                             <p className="text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase truncate">{t({ en: 'Dr.', hi: 'डॉ.' })} {assignment.doctor?.name}</p>
                         </div>
                         <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                             <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5">{t({ en: 'Hospital', hi: 'अस्पताल' })}</p>
                            <p className="text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase truncate">{assignment.hospital?.name}</p>
                         </div>
                      </div>

                      <div className="flex gap-4 relative z-10">
                        <button
                          onClick={() => handleViewDetails(assignment)}
                          className="flex-1 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 border-none"
                        >
                          {t({ en: 'View Details', hi: 'विवरण देखें' })}
                        </button>
                        {assignment.status === 'pending' && (
                          <button
                            onClick={() => handleStartAssignment(assignment._id)}
                            className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-500/20 transition-all active:scale-95 hover:bg-emerald-700"
                          >
                            {t({ en: 'Start', hi: 'शुरू करें' })}
                          </button>
                        )}
                        {assignment.status === 'in_progress' && (
                          <button
                            onClick={() => { setSelectedAssignment(assignment); handleStartCompletion(); }}
                            className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-500/20 transition-all active:scale-95 hover:bg-blue-700"
                          >
                            {t({ en: 'Complete', hi: 'पूरा करें' })}
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
                  <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">{t({ en: 'Assignment Details', hi: 'असाइनमेंट विवरण' })}</h3>
                  <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> {t({ en: 'Secure Diagnostic Subsystem', hi: 'सुरक्षित डायग्नोस्टिक सिस्टम' })}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedAssignment(null)}
                  className="px-8 py-3 bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all border border-slate-100 dark:border-slate-800"
                >
                  ← {t({ en: 'Close', hi: 'बंद करें' })}
                </button>
              </div>

              <div className="space-y-12">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {[
                    { label: t({ en: 'Patient', hi: 'मरीज' }), val: selectedAssignment.patient?.name, sub: selectedAssignment.patient?.patientId },
                    { label: t({ en: 'Doctor', hi: 'डॉक्टर' }), val: `${t({ en: 'Dr.', hi: 'डॉ.' })} ${selectedAssignment.doctor?.name}`, sub: selectedAssignment.doctor?.email },
                    { label: t({ en: 'Hospital', hi: 'अस्पताल' }), val: selectedAssignment.hospital?.name, sub: t({ en: 'Facility', hi: 'सुविधा' }) },
                    { label: t({ en: 'Status', hi: 'स्थिति' }), val: getStatusText(selectedAssignment.status), sub: t({ en: 'Assignment Status', hi: 'असाइनमेंट स्थिति' }), isStatus: true }
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
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {t({ en: 'Instructions', hi: 'निर्देश' })}
                  </p>
                  <p className="text-slate-800 dark:text-slate-200 font-bold text-lg leading-relaxed italic whitespace-pre-wrap">
                    "{selectedAssignment.instructions}"
                  </p>
                </div>

                {selectedAssignment.attachments && selectedAssignment.attachments.length > 0 && (
                  <div>
                    <span className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] block mb-6 ml-2 italic">{t({ en: 'Attachments', hi: 'फाइलें' })}</span>
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
                              <span className="text-2xl group-hover:scale-110 transition-transform">📄</span> {t({ en: 'File', hi: 'फाइल' })}_{index + 1}
                            </span>
                            <span className="text-[10px] font-black text-emerald-500 group-hover:text-white/80 uppercase tracking-widest group-hover:translate-x-1 transition-transform">{t({ en: 'Open', hi: 'खोलें' })} ↗</span>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selectedAssignment.voiceNote?.filePath && (
                  <div className="bg-indigo-50/60 dark:bg-indigo-900/10 p-8 rounded-[2.5rem] border border-indigo-100 dark:border-indigo-900/30">
                    <p className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] mb-4">{t({ en: 'Doctor Voice Note', hi: 'डॉक्टर वॉइस नोट' })}</p>
                    <audio
                      controls
                      src={resolveFileUrl(selectedAssignment.voiceNote.filePath)}
                      className="w-full mb-4"
                    />
                    <div className="bg-white dark:bg-slate-950 rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t({ en: 'Transcript', hi: 'ट्रांसक्रिप्ट' })}</p>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                        {selectedAssignment.voiceNote.transcript || t({ en: 'Transcript is not available for this voice note yet.', hi: 'इस वॉइस नोट का ट्रांसक्रिप्ट अभी उपलब्ध नहीं है।' })}
                      </p>
                    </div>
                  </div>
                )}

                {selectedAssignment.dueDate && (
                  <div className="bg-rose-500 p-8 rounded-[2.5rem] flex items-center justify-between shadow-2xl shadow-rose-500/20 text-white">
                    <div>
                      <p className="text-[10px] font-black text-white/70 uppercase tracking-[0.3em] mb-1.5 italic">{t({ en: 'Submission Deadline', hi: 'सबमिशन डेडलाइन' })}</p>
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
                      {t({ en: 'Start Assignment', hi: 'असाइनमेंट शुरू करें' })}
                    </button>
                  )}
                  {selectedAssignment.status === 'in_progress' && (
                    <button
                      onClick={handleStartCompletion}
                      className="flex-1 py-5 bg-blue-600 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-blue-500/20 active:scale-95 transition-all hover:bg-blue-700 hover:-translate-y-1"
                    >
                      {t({ en: 'Finalize Output', hi: 'आउटपुट पूरा करें' })}
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedAssignment(null)}
                    className="flex-1 py-5 bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 rounded-[2rem] font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all border border-slate-100 dark:border-slate-800"
                  >
                    {t({ en: 'Close', hi: 'बंद करें' })}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Completion Form Modal */}
          {showCompletionForm && selectedAssignment && createPortal(
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl flex items-center justify-center z-[999] p-2 sm:p-4 animate-in fade-in duration-300">
              <div className="bg-white dark:bg-slate-950 rounded-[2rem] md:rounded-[3.5rem] shadow-2xl max-w-4xl w-full max-h-[95vh] md:max-h-[90vh] overflow-hidden border border-slate-200 dark:border-emerald-500/10 flex flex-col">
                <div className="flex justify-between items-center px-6 md:px-12 py-6 md:py-10 border-b dark:border-slate-800/50 sticky top-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md z-10">
                  <div>
                    <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">{t({ en: 'Complete Assignment', hi: 'असाइनमेंट पूरा करें' })}</h3>
                    <p className="text-[9px] md:text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mt-1 md:mt-2 italic">{t({ en: 'Finalize output', hi: 'आउटपुट फाइनल करें' })}</p>
                  </div>
                  <button
                    onClick={() => setShowCompletionForm(false)}
                    className="w-10 h-10 md:w-12 md:h-12 rounded-[1rem] md:rounded-[1.5rem] bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-xl md:text-2xl font-black text-slate-400 hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                  >
                    ×
                  </button>
                </div>
                <div className="p-6 md:p-12 overflow-y-auto custom-scrollbar flex-1">
                  {message.text && (
                    <div className="mb-6 md:mb-10 p-4 md:p-6 bg-rose-50 dark:bg-rose-900/10 text-rose-600 dark:text-rose-400 rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest text-center border-l-4 border-rose-500">
                      ⚠️ {t({ en: 'Error', hi: 'त्रुटि' })}: {message.text}
                    </div>
                  )}
                  <form onSubmit={handleCompleteAssignment} className="space-y-8 md:space-y-12">
                    <div>
                      <label className="text-[10px] md:text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-2 mb-3 md:mb-4 block italic">
                        {t({ en: 'Clinical Observations & Regimen *', hi: 'क्लिनिकल नोट्स और निर्देश *' })}
                      </label>
                      <textarea
                        value={prescription}
                        onChange={(e) => setPrescription(e.target.value)}
                        rows={6}
                        placeholder={t({ en: 'Write findings and instructions...', hi: 'निष्कर्ष और निर्देश लिखें...' })}
                        className="w-full px-5 md:px-8 py-5 md:py-7 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-[1.5rem] md:rounded-[2.5rem] text-sm font-bold dark:text-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none resize-none leading-relaxed"
                        required
                      />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-4 md:mb-6 px-2">
                        <span className="text-[10px] md:text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] italic">Telemetry Artifacts</span>
                        <button
                          type="button"
                          onClick={handleFileAdd}
                          className="px-4 md:px-6 py-2 md:py-2.5 bg-emerald-600 text-white rounded-xl font-black text-[8px] md:text-[9px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all"
                        >
                          + {t({ en: 'Add File', hi: 'फाइल जोड़ें' })}
                        </button>
                      </div>
                      {files.length === 0 ? (
                        <div className="bg-slate-50 dark:bg-slate-900/30 p-8 md:p-12 rounded-[1.5rem] md:rounded-[2.5rem] text-center border-2 border-dashed border-slate-200 dark:border-slate-800">
                          <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic">{t({ en: 'No files attached', hi: 'कोई फाइल नहीं जोड़ी गई' })}</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                          {files.map((item, index) => (
                            <div key={index} className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] relative group border border-slate-100 dark:border-slate-800 hover:border-emerald-500/30 transition-all shadow-sm">
                              <button
                                type="button"
                                onClick={() => handleFileRemove(index)}
                                className="absolute -top-2 -right-2 md:-top-3 md:-right-3 w-7 h-7 md:w-8 md:h-8 bg-rose-500 text-white rounded-lg md:rounded-xl flex items-center justify-center text-xs md:text-sm shadow-xl opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                ×
                              </button>
                              <div className="space-y-3 md:space-y-4">
                                <div>
                                  <label className="text-[8px] md:text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase block mb-1.5 md:mb-2 px-1">{t({ en: 'Category', hi: 'कैटेगरी' })}</label>
                                  <select
                                    value={item.category}
                                    onChange={(e) => handleCategoryChange(index, e.target.value)}
                                    className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-[10px] md:text-[11px] font-black uppercase dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 transition-all appearance-none cursor-pointer"
                                  >
                                    <option value="test_report">{t({ en: 'Diagnostic Report', hi: 'डायग्नोस्टिक रिपोर्ट' })}</option>
                                    <option value="diagnosis_report">{t({ en: 'Clinical Analysis', hi: 'क्लिनिकल एनालिसिस' })}</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[8px] md:text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase block mb-1.5 md:mb-2 px-1">{t({ en: 'File', hi: 'फाइल' })}</label>
                                  <div className="relative">
                                    <input
                                      type="file"
                                      onChange={(e) => handleFileChange(index, e)}
                                      accept=".jpg,.jpeg,.png,.pdf"
                                      className="w-full text-[9px] md:text-[10px] font-bold dark:text-slate-400 file:mr-3 md:file:mr-4 file:py-1.5 md:file:py-2 file:px-3 md:file:px-4 file:rounded-xl file:border-0 file:text-[8px] md:file:text-[9px] file:font-black file:uppercase file:bg-slate-900 dark:file:bg-white file:text-white dark:file:text-slate-900 hover:file:opacity-80 transition-all cursor-pointer"
                                    />
                                  </div>
                                  {item.file && <p className="text-[8px] md:text-[9px] font-black text-emerald-500 mt-1.5 md:mt-2 truncate italic px-1">{t({ en: 'Linked', hi: 'जुड़ा' })}: {item.file.name}</p>}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 md:gap-6 pt-6 md:pt-10 border-t dark:border-slate-800">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="flex-1 py-4 md:py-5 bg-emerald-600 text-white rounded-[1.5rem] md:rounded-[2rem] font-black text-[10px] md:text-[11px] uppercase tracking-widest shadow-2xl shadow-emerald-500/30 active:scale-95 transition-all disabled:opacity-50 hover:bg-emerald-700 hover:-translate-y-1"
                      >
                        {submitting ? t({ en: 'Submitting...', hi: 'भेजा जा रहा है...' }) : t({ en: 'Submit', hi: 'सबमिट करें' })}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCompletionForm(false)}
                        className="flex-1 py-4 md:py-5 bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 rounded-[1.5rem] md:rounded-[2rem] font-black text-[10px] md:text-[11px] uppercase tracking-widest active:scale-95 transition-all border border-slate-100 dark:border-slate-800"
                      >
                        {t({ en: 'Cancel', hi: 'रद्द करें' })}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>,
            document.body
          )}
        </>
      )}
    </DashboardLayout>
  );
};

export default NurseAssignments;
