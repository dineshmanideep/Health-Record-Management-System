import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { useLanguage } from '../../context/LanguageContext';
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
  const [resolutionState, setResolutionState] = useState({ visible: false, sessionId: '', ambiguities: [], clarifications: {} });
  const { t } = useLanguage();

  const fetchAssignments = useCallback(async () => {
    try {
      setLoading(true);
      const status = filter === 'all' ? undefined : filter;
      const res = await nurseService.getTestAssignments(status);
      setAssignments(res.data || []);
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error?.response?.data?.message || t({ en: 'Failed to load test assignments', hi: 'टेस्ट असाइनमेंट लोड नहीं हो सके' }) 
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
        text: error?.response?.data?.message || t({ en: 'Failed to load assignment details', hi: 'विवरण लोड नहीं हो सके' }) 
      });
    }
  };

  const handleStartAssignment = async (assignmentId) => {
    try {
      await nurseService.startTestAssignment(assignmentId);
      setMessage({ type: 'success', text: t({ en: 'Test assignment started. Status updated.', hi: 'टेस्ट असाइनमेंट शुरू हुआ। स्टेटस अपडेट हो गया।' }) });
      fetchAssignments();
      if (selectedAssignment?._id === assignmentId) {
        handleViewDetails(assignmentId); // Refresh details
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error?.response?.data?.message || t({ en: 'Failed to start assignment', hi: 'असाइनमेंट शुरू नहीं हो सका' }) 
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
    if (!file) return;
    const fileName = file.name?.toLowerCase() || '';
    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
    const isAllowed = allowedExtensions.some((ext) => fileName.endsWith(ext));
    if (!isAllowed) {
      setMessage({ type: 'error', text: t({ en: 'Unsupported file. Use PDF, JPG, JPEG, or PNG.', hi: 'असमर्थित फाइल। PDF, JPG, JPEG, या PNG उपयोग करें।' }) });
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
    if (!results.trim()) {
      setMessage({ type: 'error', text: t({ en: 'Please provide test results', hi: 'कृपया टेस्ट परिणाम लिखें' }) });
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
      setMessage({ type: 'success', text: t({ en: 'Test completed successfully! Redirecting...', hi: 'टेस्ट सफलतापूर्वक पूरा हुआ! रीडायरेक्ट हो रहा है...' }) });
      
      setTimeout(() => {
        setShowCompletionForm(false);
        setSelectedAssignment(null);
        setFilter('all');
        fetchAssignments();
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
        setMessage({ type: 'error', text: payload.message || t({ en: 'Clarification is required to complete this test assignment.', hi: 'टेस्ट पूरा करने के लिए स्पष्टीकरण जरूरी है।' }) });
        return;
      }
      setMessage({ 
        type: 'error', 
        text: error?.response?.data?.message || t({ en: 'Failed to complete test assignment', hi: 'टेस्ट असाइनमेंट पूरा नहीं हो सका' }) 
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
      setMessage({ type: 'success', text: t({ en: 'Test completed successfully! Redirecting...', hi: 'टेस्ट सफलतापूर्वक पूरा हुआ! रीडायरेक्ट हो रहा है...' }) });
      setTimeout(() => {
        setShowCompletionForm(false);
        setSelectedAssignment(null);
        setFilter('all');
        setFiles([{ file: null, category: 'test_report' }]);
        setResolutionState({ visible: false, sessionId: '', ambiguities: [], clarifications: {} });
        fetchAssignments();
      }, 1500);
    } catch (error) {
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
      pending: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
      in_progress: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400',
      completed: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
      cancelled: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
    };
    return badges[status] || 'bg-slate-100 text-slate-700';
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

  return (
    <DashboardLayout title={t({ en: 'Test Assignments', hi: 'टेस्ट असाइनमेंट' })}>
      <div className="space-y-6 pb-12">
        {/* Global Message */}
        {message.text && !showCompletionForm && (
          <div className={`p-4 rounded-2xl text-sm font-medium animate-fadeIn flex items-center gap-3 border ${
            message.type === 'success' 
              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/50' 
              : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-800/50'
          }`}>
            <span>{message.type === 'success' ? '✅' : '⚠️'}</span>
            {message.text}
          </div>
        )}

        {loading && !selectedAssignment ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-10 h-10 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm text-slate-400 font-medium">{t({ en: 'Loading test assignments...', hi: 'टेस्ट असाइनमेंट लोड हो रहे हैं...' })}</p>
          </div>
        ) : (
          <>
            {resolutionState.visible && (
              <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-2xl p-5">
                <h3 className="text-sm font-bold text-amber-700 dark:text-amber-300 mb-2">{t({ en: 'Clarification Required', hi: 'स्पष्टीकरण जरूरी' })}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mb-4">{t({ en: 'An ambiguous blood sugar field was found. Confirm the correct test type to finish the assignment.', hi: 'ब्लड शुगर फील्ड अस्पष्ट है। सही टेस्ट प्रकार चुनें।' })}</p>
                <div className="space-y-4">
                  {resolutionState.ambiguities.map((item) => (
                    <div key={item.rawFieldName} className="bg-white dark:bg-slate-900 border border-amber-100 dark:border-amber-900/40 rounded-xl p-4">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-2">{item.rawFieldName}</p>
                      <select
                        value={resolutionState.clarifications[item.rawFieldName] || item.options?.[0] || 'fasting'}
                        onChange={(e) => handleClarificationChange(item.rawFieldName, e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-700 dark:text-slate-200"
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
                    className="px-5 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold uppercase tracking-widest disabled:opacity-50"
                  >
                    {submitting ? t({ en: 'Resolving...', hi: 'हल हो रहा है...' }) : t({ en: 'Confirm And Complete', hi: 'पुष्टि करें और पूरा करें' })}
                  </button>
                </div>
              </div>
            )}

            {/* Header with Filters & Stats */}
            {!selectedAssignment && !showCompletionForm && (
              <div className="space-y-6">
                {/* Stat Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: t({ en: 'Total', hi: 'कुल' }), value: stats.all, icon: '🧪', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                    { label: t({ en: 'Pending', hi: 'लंबित' }), value: stats.pending, icon: '⏳', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                    { label: t({ en: 'Working', hi: 'चल रहा' }), value: stats.in_progress, icon: '⚙️', color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
                    { label: t({ en: 'Done', hi: 'पूरा' }), value: stats.completed, icon: '✅', color: 'text-emerald-500 dark:text-emerald-300', bg: 'bg-emerald-100 dark:bg-emerald-900/40' }
                  ].map((s) => (
                    <div key={s.label} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800 relative overflow-hidden group hover:shadow-md transition-all">
                      <div className={`absolute top-0 right-0 w-16 h-16 ${s.bg} blur-xl rounded-full -translate-y-1/2 translate-x-1/2 opacity-60`} />
                      <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{s.label}</p>
                      <div className="flex items-end justify-between">
                        <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
                        <span className="text-xl opacity-40">{s.icon}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">{t({ en: 'Assigned Tests', hi: 'असाइन टेस्ट' })}</h2>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
                      {[
                        { value: 'all', label: t({ en: 'All', hi: 'सभी' }) },
                        { value: 'pending', label: t({ en: 'Pending', hi: 'लंबित' }) },
                        { value: 'in_progress', label: t({ en: 'In Progress', hi: 'चल रहा है' }) },
                        { value: 'completed', label: t({ en: 'Completed', hi: 'पूरा हुआ' }) }
                      ].map((f) => (
                        <button
                          key={f.value}
                          onClick={() => setFilter(f.value)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                            filter === f.value
                              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/25'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Assignments List */}
            {!selectedAssignment && !showCompletionForm && (
              <div className="space-y-4">
                {assignments.length === 0 ? (
                  <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800 py-24 text-center">
                    <span className="text-6xl opacity-20 block mb-6">🔬</span>
                    <p className="text-slate-500 dark:text-slate-400 font-bold text-lg uppercase tracking-tight">
                      {filter === 'all' ? t({ en: 'No test assignments yet.', hi: 'अभी कोई टेस्ट असाइनमेंट नहीं' }) : `${t({ en: 'No', hi: 'कोई' })} ${filter} ${t({ en: 'tests found', hi: 'टेस्ट नहीं मिले' })}`}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {assignments.map((assignment) => (
                      <div
                        key={assignment._id}
                        className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800 hover:border-emerald-500/30 transition-all group"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                              <h3 className="font-bold text-base text-slate-800 dark:text-white truncate uppercase tracking-tight">
                                {assignment.testType?.name}
                              </h3>
                              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest ${getStatusBadge(assignment.status)}`}>
                                {getStatusText(assignment.status)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                               <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center text-xs font-black text-slate-600 dark:text-slate-400">
                                  {assignment.patient?.name?.[0]?.toUpperCase()}
                               </div>
                               <div>
                                 <p className="text-xs font-bold dark:text-slate-300">{assignment.patient?.name}</p>
                                 <p className="text-[10px] tracking-widest uppercase opacity-60">P_ID: {assignment.patient?.patientId}</p>
                               </div>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-6 pt-4 border-t border-slate-100 dark:border-slate-800/50">
                           <div>
                              <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">{t({ en: 'Hospital', hi: 'अस्पताल' })}</p>
                              <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{assignment.hospital?.name}</p>
                           </div>
                           <div>
                              <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">{t({ en: 'Category', hi: 'कैटेगरी' })}</p>
                              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{assignment.testType?.category || t({ en: 'N/A', hi: 'उपलब्ध नहीं' })}</p>
                           </div>
                           {assignment.scheduledDate && (
                             <div className="col-span-2">
                               <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">{t({ en: 'Scheduled Date & Time', hi: 'निर्धारित दिनांक और समय' })}</p>
                                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">📅 {new Date(assignment.scheduledDate).toLocaleString()}</p>
                             </div>
                           )}
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleViewDetails(assignment._id)}
                            className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                          >
                            {t({ en: 'Details', hi: 'विवरण' })}
                          </button>
                          
                          {assignment.status === 'pending' && (
                            <button
                              onClick={() => handleStartAssignment(assignment._id)}
                              className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold uppercase shadow-lg shadow-emerald-500/20 tracking-widest hover:bg-emerald-700 transition-all"
                            >
                              {t({ en: 'Start', hi: 'शुरू करें' })}
                            </button>
                          )}

                          {assignment.status === 'in_progress' && (
                            <button
                              onClick={() => {
                                setSelectedAssignment(assignment);
                                handleShowCompletionForm();
                              }}
                              className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase shadow-lg shadow-indigo-500/20 tracking-widest hover:bg-indigo-700 transition-all"
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
              <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200/60 dark:border-slate-800 p-8 shadow-xl animate-fadeIn">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-10">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">{t({ en: 'Test Details', hi: 'टेस्ट विवरण' })}</h2>
                    <p className="text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase mt-1">Ref_{selectedAssignment._id.slice(-8).toUpperCase()}</p>
                  </div>
                  <button
                    onClick={() => setSelectedAssignment(null)}
                    className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-950 dark:hover:bg-white dark:hover:text-slate-950 transition-all border border-slate-200 dark:border-slate-700"
                  >
                    ← {t({ en: 'Back', hi: 'वापस' })}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                  <div className="space-y-6">
                    <section>
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                         <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {t({ en: 'Test Information', hi: 'टेस्ट जानकारी' })}
                      </h3>
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl space-y-4 border border-slate-100 dark:border-slate-800">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-semibold text-slate-400 uppercase">{t({ en: 'Test Name', hi: 'टेस्ट नाम' })}</span>
                           <span className="text-sm font-black dark:text-white">{selectedAssignment.testType?.name}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-semibold text-slate-400 uppercase">{t({ en: 'Category', hi: 'कैटेगरी' })}</span>
                           <span className="text-sm font-bold text-indigo-500 uppercase">{selectedAssignment.testType?.category}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-semibold text-slate-400 uppercase">{t({ en: 'Current Status', hi: 'वर्तमान स्थिति' })}</span>
                           <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter ${getStatusBadge(selectedAssignment.status)}`}>
                              {getStatusText(selectedAssignment.status)}
                           </span>
                        </div>
                      </div>
                    </section>
                  </div>

                  <div className="space-y-6">
                    <section>
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                         <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> {t({ en: 'Patient Info', hi: 'मरीज जानकारी' })}
                      </h3>
                      <div className="bg-slate-50 dark:bg-slate-950/50 p-6 rounded-2xl space-y-4 border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-xl font-black">
                              {selectedAssignment.patient?.name?.[0]}
                           </div>
                           <div>
                              <p className="text-sm font-black uppercase text-slate-900 dark:text-white leading-none">{selectedAssignment.patient?.name}</p>
                              <p className="text-[10px] font-bold text-slate-400 mt-1">ID_{selectedAssignment.patient?.patientId}</p>
                           </div>
                        </div>
                      </div>
                    </section>
                  </div>
                </div>

                {/* Instructions */}
                {selectedAssignment.testType?.instructions?.length > 0 && (
                  <div className="mb-10">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">{t({ en: 'Procedure Steps', hi: 'प्रक्रिया चरण' })}</h3>
                    <div className="bg-emerald-50 dark:bg-emerald-900/10 border-2 border-emerald-500/10 p-8 rounded-[2rem]">
                      <ol className="space-y-4">
                        {selectedAssignment.testType.instructions
                          .sort((a, b) => (a.order || 0) - (b.order || 0))
                          .map((instruction, idx) => (
                            <li key={idx} className="flex gap-4">
                              <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center shrink-0">{idx + 1}</span>
                              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{instruction.step}</p>
                            </li>
                          ))}
                      </ol>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-4">
                  {selectedAssignment.status === 'pending' && (
                    <button
                      onClick={() => handleStartAssignment(selectedAssignment._id)}
                      className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:scale-[1.02] transition-all"
                    >
                      {t({ en: 'Start Test', hi: 'टेस्ट शुरू करें' })}
                    </button>
                  )}

                  {selectedAssignment.status === 'in_progress' && (
                    <button
                      onClick={handleShowCompletionForm}
                      className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-500/20 hover:scale-[1.02] transition-all"
                    >
                      {t({ en: 'Process & Complete', hi: 'प्रोसेस और पूरा करें' })}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Completion Form */}
            {showCompletionForm && selectedAssignment && (
              <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-2xl border-4 border-emerald-500/10 animate-in zoom-in-95 duration-500">
                <div className="flex justify-between items-center mb-10">
                  <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase mb-2">{t({ en: 'Final Report', hi: 'अंतिम रिपोर्ट' })}</h2>
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{t({ en: 'Transmission Mode', hi: 'ट्रांसमिशन मोड' })}: {t({ en: 'Secure', hi: 'सुरक्षित' })}</p>
                  </div>
                  <button
                    onClick={() => setShowCompletionForm(false)}
                    className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-rose-500 transition-all text-2xl font-black"
                  >
                    ×
                  </button>
                </div>

                <form onSubmit={handleCompleteAssignment} className="space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-6 bg-slate-50 dark:bg-slate-800/80 rounded-3xl border border-slate-100 dark:border-slate-700">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{t({ en: 'Patient', hi: 'मरीज' })}</p>
                      <p className="font-black text-lg text-slate-900 dark:text-white tracking-tight uppercase">{selectedAssignment.patient?.name}</p>
                    </div>
                    <div className="p-6 bg-slate-50 dark:bg-slate-800/80 rounded-3xl border border-slate-100 dark:border-slate-700 text-right">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{t({ en: 'Test', hi: 'टेस्ट' })}</p>
                      <p className="font-black text-lg text-emerald-500 dark:text-emerald-400 tracking-tight uppercase">{selectedAssignment.testType?.name}</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 ml-1">
                      {t({ en: 'Clinical Findings & Observations *', hi: 'क्लिनिकल निष्कर्ष और नोट्स *' })}
                    </label>
                    <textarea
                      value={results}
                      onChange={(e) => setResults(e.target.value)}
                      placeholder={t({ en: 'Enter detailed findings...', hi: 'विस्तृत निष्कर्ष लिखें...' })}
                      rows={10}
                      className="w-full px-8 py-6 bg-slate-50 dark:bg-slate-800 border-none rounded-[2.5rem] text-sm font-bold dark:text-white focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none resize-none shadow-inner"
                      required
                    />
                  </div>

                  <div className="space-y-6">
                     <div className="flex justify-between items-center px-2">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t({ en: 'Attachments', hi: 'फाइलें' })}</h4>
                        <button
                          type="button"
                          onClick={handleFileAdd}
                          className="px-6 py-2 bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 rounded-xl font-black text-[9px] uppercase tracking-widest border border-emerald-600/20 hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                        >
                          + {t({ en: 'Add Attachment', hi: 'फाइल जोड़ें' })}
                        </button>
                     </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {files.map((item, index) => (
                        <div key={index} className="bg-slate-50 dark:bg-slate-800 p-6 rounded-3xl relative group border border-slate-100 dark:border-slate-750 hover:border-emerald-500/40 transition-all">
                          <button
                            type="button"
                            onClick={() => handleFileRemove(index)}
                            className="absolute -top-3 -right-3 w-8 h-8 bg-rose-500 text-white rounded-xl flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-95"
                          >
                            ×
                          </button>
                          
                          <div className="space-y-4">
                            <div>
                               <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase mb-2">{t({ en: 'Category', hi: 'कैटेगरी' })}</p>
                               <select
                                 value={item.category}
                                 onChange={(e) => handleCategoryChange(index, e.target.value)}
                                 className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border-none rounded-xl text-[11px] font-black uppercase text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none shadow-sm cursor-pointer"
                               >
                                 <option value="test_report">{t({ en: 'Test Report', hi: 'टेस्ट रिपोर्ट' })}</option>
                                 <option value="diagnosis_report">{t({ en: 'Diagnostic Report', hi: 'डायग्नोस्टिक रिपोर्ट' })}</option>
                               </select>
                            </div>
                            <div className="pt-2">
                               <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase mb-2">{t({ en: 'File', hi: 'फाइल' })}</p>
                               <input
                                 type="file"
                                 onChange={(e) => handleFileChange(index, e.target.files[0])}
                                 className="w-full text-[10px] dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[9px] file:font-black file:uppercase file:bg-emerald-600 file:text-white file:hover:bg-emerald-700 file:transition-all cursor-pointer"
                               />
                               {item.file && <p className="text-[9px] font-black text-emerald-500 mt-2 truncate italic">✓ {item.file.name}</p>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-4 pt-10 border-t dark:border-slate-800">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 py-5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/30 hover:scale-[1.01] transition-all disabled:opacity-50"
                    >
                      {submitting ? t({ en: 'Submitting...', hi: 'भेजा जा रहा है...' }) : t({ en: 'Submit Report', hi: 'रिपोर्ट सबमिट करें' })}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default NurseTestAssignments;
