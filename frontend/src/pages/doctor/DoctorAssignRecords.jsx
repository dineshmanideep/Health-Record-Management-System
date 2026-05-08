import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import LoadingScreen from '../../components/LoadingScreen';
import toast from 'react-hot-toast';
import { useLanguage } from '../../context/LanguageContext';
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
  const [voiceNote, setVoiceNote] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const { t } = useLanguage();

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
      toast.error(t({ en: 'Failed to synchronize assignment data', hi: 'असाइनमेंट डेटा सिंक नहीं हो सका' }));
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + attachments.length > 5) {
      setMessage({ type: 'error', text: t({ en: 'Maximum 5 attachments allowed', hi: 'अधिकतम 5 फाइलें ही जोड़ें' }) });
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
      setMessage({ type: 'error', text: t({ en: 'Please fill all required fields', hi: 'सभी जरूरी फ़ील्ड भरें' }) });
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
      if (voiceNote) {
        formData.append('voiceNote', voiceNote);
      }

      await doctorService.createAssignment(formData);
      setMessage({ type: 'success', text: t({ en: 'Assignment created successfully!', hi: 'असाइनमेंट सफलतापूर्वक बना' }) });
      
      // Reset form
      setSelectedPatient('');
      setSelectedNurse('');
      setSelectedHospital('');
      setInstructions('');
      setDueDate('');
      setAttachments([]);
      setVoiceNote(null);
      setShowForm(false);
      
      fetchData();
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error?.response?.data?.message || t({ en: 'Failed to create assignment', hi: 'असाइनमेंट नहीं बन पाया' }) 
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id) => {
    if (!confirm(t({ en: 'Are you sure you want to cancel this assignment?', hi: 'क्या आप यह असाइनमेंट रद्द करना चाहते हैं?' }))) return;
    
    try {
      await doctorService.cancelAssignment(id);
      toast.success(t({ en: 'Assignment cancelled successfully', hi: 'असाइनमेंट रद्द हो गया' }));
      fetchData();
    } catch (error) {
      toast.error(t({ en: 'Cancel failed. Please retry.', hi: 'रद्द नहीं हो सका। फिर कोशिश करें।' }));
    }
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
    <DashboardLayout title={t({ en: 'Assign Medical Records', hi: 'रिकॉर्ड असाइन करें' })}>
      {loading ? (
        <LoadingScreen message={t({ en: 'Loading assignment data', hi: 'असाइनमेंट डेटा लोड हो रहा है' })} />
      ) : (
        <>
          {/* Header */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-200/50 dark:border-slate-800 mb-6 group overflow-hidden relative">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-6 relative z-10">
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{t({ en: 'Record Assignments', hi: 'रिकॉर्ड असाइनमेंट' })}</h2>
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">{t({ en: 'Assign nurses for data entry', hi: 'डेटा एंट्री के लिए नर्स को असाइन करें' })}</p>
              </div>
              <button
                onClick={() => setShowForm(!showForm)}
                className={`w-full sm:w-auto px-8 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-all active:scale-95 ${
                  showForm 
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300' 
                    : 'bg-indigo-600 text-white shadow-indigo-500/20 hover:bg-indigo-700'
                }`}
              >
                {showForm ? t({ en: 'Cancel', hi: 'रद्द करें' }) : t({ en: '+ New Assignment', hi: '+ नया असाइनमेंट' })}
              </button>
            </div>

            {message.text && (
              <div className={`mt-8 p-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-center animate-in slide-in-from-top-2 duration-300 ${
                message.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
              }`}>
                {message.type === 'success' ? '✅' : '⚠️'} {message.text}
              </div>
            )}
          </div>

          {/* Assignment Form */}
          {showForm && (
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl border-2 border-indigo-500/20 mb-8 animate-in zoom-in-95 duration-300">
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-8">{t({ en: 'Assignment Details', hi: 'असाइनमेंट विवरण' })}</h3>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                      {t({ en: 'Patient *', hi: 'मरीज *' })}
                    </label>
                    <select
                      value={selectedPatient}
                      onChange={(e) => setSelectedPatient(e.target.value)}
                      className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none appearance-none cursor-pointer"
                      required
                    >
                      <option value="">{t({ en: '-- Choose Patient --', hi: '-- मरीज चुनें --' })}</option>
                      {patients.map((p) => (
                        <option key={p.patient?._id} value={p.patient?._id}>
                          {p.patient?.name} 
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                      {t({ en: 'Nurse *', hi: 'नर्स *' })}
                    </label>
                    <select
                      value={selectedNurse}
                      onChange={(e) => setSelectedNurse(e.target.value)}
                      className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none appearance-none cursor-pointer"
                      required
                    >
                      <option value="">{t({ en: '-- Choose Nurse --', hi: '-- नर्स चुनें --' })}</option>
                      {nurses.map((n) => (
                        <option key={n.nurse?._id} value={n.nurse?._id}>
                          {n.nurse?.name} 
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                    {t({ en: 'Hospital *', hi: 'अस्पताल *' })}
                  </label>
                  <select
                    value={selectedHospital}
                    onChange={(e) => setSelectedHospital(e.target.value)}
                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none appearance-none cursor-pointer"
                    required
                  >
                    <option value="">{t({ en: '-- Choose Hospital --', hi: '-- अस्पताल चुनें --' })}</option>
                    {nurses.map((n) => n.hospitalId).filter((h, i, arr) => 
                      h && arr.findIndex(x => x?._id === h?._id) === i
                    ).map((h) => (
                      <option key={h._id} value={h._id}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                    {t({ en: 'Instructions *', hi: 'निर्देश *' })}
                  </label>
                  <textarea
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder={t({ en: 'Write clear instructions for the nurse...', hi: 'नर्स के लिए साफ निर्देश लिखें...' })}
                    rows={4}
                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none resize-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                      {t({ en: 'Due Date (Optional)', hi: 'ड्यू डेट (वैकल्पिक)' })}
                    </label>
                    <input
                      type="datetime-local"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                      {t({ en: 'Attachments (Max 5)', hi: 'फाइलें (अधिकतम 5)' })}
                    </label>
                    <input
                      type="file"
                      onChange={handleFileChange}
                      accept=".jpg,.jpeg,.png,.pdf"
                      multiple
                      className="w-full px-5 py-3 opacity-0 absolute pointer-events-none"
                      id="assignment-files"
                    />
                    <label 
                      htmlFor="assignment-files"
                      className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-400 dark:text-slate-500 text-center cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-400 transition-all block"
                    >
                      {attachments.length > 0 ? `📦 ${attachments.length} ${t({ en: 'files ready', hi: 'फाइल तैयार' })}` : t({ en: '📂 Upload Files', hi: '📂 फाइलें अपलोड करें' })}
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                    {t({ en: 'Voice Note (Optional)', hi: 'वॉइस नोट (वैकल्पिक)' })}
                  </label>
                  <input
                    type="file"
                    accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm"
                    onChange={(e) => setVoiceNote(e.target.files?.[0] || null)}
                    className="w-full px-5 py-3 opacity-0 absolute pointer-events-none"
                    id="assignment-voice-note"
                  />
                  <label
                    htmlFor="assignment-voice-note"
                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-400 dark:text-slate-500 text-center cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-400 transition-all block"
                  >
                    {voiceNote ? t({ en: '🎙️ Voice Note Ready', hi: '🎙️ वॉइस नोट तैयार' }) : t({ en: '🎙️ Upload Voice Note', hi: '🎙️ वॉइस नोट अपलोड करें' })}
                  </label>
                  {voiceNote && (
                    <div className="flex items-center justify-between gap-3 px-2 py-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800/40">
                      <p className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-300 truncate">{voiceNote.name}</p>
                      <button
                        type="button"
                        onClick={() => setVoiceNote(null)}
                        className="text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600"
                      >
                        {t({ en: 'Remove', hi: 'हटाएं' })}
                      </button>
                    </div>
                  )}
                </div>

                {attachments.length > 0 && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-2">
                    {attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-slate-600 dark:text-slate-400 truncate max-w-[80%]">📎 {file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeAttachment(index)}
                          className="text-red-500 hover:text-red-600 uppercase tracking-widest text-[9px]"
                        >
                          {t({ en: 'Remove', hi: 'हटाएं' })}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-500/20 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {submitting ? t({ en: 'Submitting...', hi: 'भेजा जा रहा है...' }) : t({ en: 'Create Assignment', hi: 'असाइनमेंट बनाएं' })}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all"
                  >
                    {t({ en: 'Cancel', hi: 'रद्द करें' })}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Assignments List */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-200/50 dark:border-slate-800 overflow-hidden">
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-8">{t({ en: 'Assignment History', hi: 'असाइनमेंट इतिहास' })}</h3>
            {assignments.length === 0 ? (
              <p className="text-center py-12 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t({ en: 'No assignments yet', hi: 'अभी कोई असाइनमेंट नहीं' })}</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {assignments.map((assignment) => (
                  <div key={assignment._id} className="bg-slate-50 dark:bg-slate-800/50 border border-transparent dark:border-slate-700 rounded-[2rem] p-6 hover:shadow-xl transition-all group">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex-1">
                        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                          assignment.status === 'completed' 
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' 
                            : assignment.status === 'pending'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                            : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400'
                        }`}>
                          {getStatusText(assignment.status)}
                        </span>
                        <p className="font-black text-slate-900 dark:text-white mt-4 text-sm line-clamp-1">{assignment.patient?.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">{t({ en: 'ID', hi: 'आईडी' })}: {assignment.patient?.patientId}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase">{new Date(assignment.createdAt).toLocaleDateString()}</p>
                        {assignment.dueDate && (
                          <p className={`text-[9px] font-black uppercase mt-1 ${new Date(assignment.dueDate) < new Date() ? 'text-red-500' : 'text-amber-500'}`}>
                            {t({ en: 'DUE', hi: 'ड्यू' })}: {new Date(assignment.dueDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4 mb-6">
                       <div className="flex items-center gap-3 text-[11px] font-bold text-slate-600 dark:text-slate-400">
                          <span className="w-5 h-5 bg-white dark:bg-slate-700 rounded-md flex items-center justify-center text-[10px]">👩‍⚕️</span>
                          {assignment.nurse?.name}
                       </div>
                       <div className="flex items-center gap-3 text-[11px] font-bold text-slate-600 dark:text-slate-400">
                          <span className="w-5 h-5 bg-white dark:bg-slate-700 rounded-md flex items-center justify-center text-[10px]">🏥</span>
                          {assignment.hospital?.name}
                       </div>
                    </div>

                    <div className="bg-white dark:bg-slate-700/50 p-4 rounded-2xl mb-6">
                      <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">{t({ en: 'Instructions', hi: 'निर्देश' })}</p>
                      <p className="text-[11px] font-bold dark:text-slate-300 line-clamp-3 italic opacity-80">"{assignment.instructions}"</p>
                    </div>

                    <div className="flex gap-3">
                      {assignment.status === 'completed' && assignment.medicalRecord && (
                        <button
                          onClick={() => navigate(`/doctor/patient-records/${assignment.patient._id}`)}
                          className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          {t({ en: 'View Record', hi: 'रिकॉर्ड देखें' })}
                        </button>
                      )}
                      {assignment.status === 'pending' && (
                        <button
                          onClick={() => handleCancel(assignment._id)}
                          className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          {t({ en: 'Cancel', hi: 'रद्द करें' })}
                        </button>
                      )}
                      {assignment.attachments?.length > 0 && (
                        <div className="flex items-center px-4 bg-slate-100 dark:bg-slate-800 rounded-xl text-[10px] font-black text-slate-500">
                          📦 {assignment.attachments.length}
                        </div>
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
