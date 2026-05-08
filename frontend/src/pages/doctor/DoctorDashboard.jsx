import { useState, useEffect, useCallback, useRef } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import LoadingScreen from '../../components/LoadingScreen';
import toast from 'react-hot-toast';
import QRScanner from '../../components/QRScanner';
import { useLanguage } from '../../context/LanguageContext';
import { profileService, doctorService } from '../../services/api';

const NURSE_REQUEST_POLL = 5000;

const KPICard = ({ label, value, icon, color }) => (
  <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-200/50 dark:border-slate-800 group hover:shadow-xl transition-all overflow-hidden relative">
    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform pointer-events-none">
      <span className="text-8xl">{icon}</span>
    </div>
    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 relative z-10">{label}</p>
    <p className={`text-4xl font-black ${color} relative z-10`}>{value}</p>
  </div>
);

const DoctorDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [assignedNurses, setAssignedNurses] = useState([]);
  const [otpInput, setOtpInput] = useState('');
  const [deptInput, setDeptInput] = useState('');
  const [affiliating, setAffiliating] = useState(false);
  const [affiliateMsg, setAffiliateMsg] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(true);

  const [patientEmail, setPatientEmail] = useState('');
  const [patientOtp, setPatientOtp] = useState('');
  const [accessingPatient, setAccessingPatient] = useState(false);
  const [accessMsg, setAccessMsg] = useState({ type: '', text: '' });

  const [qrAccessMsg, setQrAccessMsg] = useState({ type: '', text: '' });
  const [showQRScanner, setShowQRScanner] = useState(false);

  const [accessMethod, setAccessMethod] = useState('otp');
  const [nurseRequests, setNurseRequests] = useState([]);
  const [showNursePopup, setShowNursePopup] = useState(false);
  const [processingRequest, setProcessingRequest] = useState(null);
  const nurseReqPollRef = useRef(null);
  const { t } = useLanguage();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, nursesRes] = await Promise.all([
        doctorService.getDashboard(),
        doctorService.getAssignedNurses()
      ]);
      setDashboard(dashRes.data);
      setAssignedNurses(nursesRes.data || []);
    } catch { 
      toast.error(t({ en: 'Failed to synchronize clinical data', hi: 'क्लिनिकल डेटा सिंक नहीं हो सका' }));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchNurseRequests = useCallback(async () => {
    try {
      const [reqRes, countRes] = await Promise.all([
        doctorService.getNurseRequests('pending'),
        doctorService.getNurseRequestCount()
      ]);
      setNurseRequests(reqRes.data || []);
      const count = countRes.data?.count || 0;
      if (count > 0 && !showNursePopup) setShowNursePopup(true);
    } catch { /* silent */ }
  }, [showNursePopup]);

  useEffect(() => { fetchData(); fetchNurseRequests(); }, [fetchData, fetchNurseRequests]);

  useEffect(() => {
    nurseReqPollRef.current = setInterval(fetchNurseRequests, NURSE_REQUEST_POLL);
    return () => { if (nurseReqPollRef.current) clearInterval(nurseReqPollRef.current); };
  }, [fetchNurseRequests]);

  const handleApproveRequest = async (requestId) => {
    setProcessingRequest(requestId);
    try {
      await doctorService.approveNurseRequest(requestId);
      fetchNurseRequests();
    } catch { /* silent */ } finally { setProcessingRequest(null); }
  };

  const handleRejectRequest = async (requestId) => {
    setProcessingRequest(requestId);
    try {
      await doctorService.rejectNurseRequest(requestId);
      fetchNurseRequests();
    } catch { /* silent */ } finally { setProcessingRequest(null); }
  };

  const handleAffiliate = async (e) => {
    e.preventDefault();
    if (!otpInput.trim()) return;
    setAffiliating(true);
    setAffiliateMsg({ type: '', text: '' });
    try {
      const data = await profileService.doctor.affiliate(otpInput.trim(), deptInput.trim());
      toast.success(t({ en: `Affiliated with ${data.hospital?.name}`, hi: `${data.hospital?.name} से जुड़ गए` }));
      setOtpInput(''); setDeptInput(''); fetchData();
    } catch (err) { 
      toast.error(err?.response?.data?.message || t({ en: 'Affiliation failed.', hi: 'जुड़ नहीं पाए।' }));
    } finally { 
      setAffiliating(false); 
    }
  };

  const handlePatientAccess = async (e) => {
    e.preventDefault();
    if (!patientEmail.trim() || !patientOtp.trim()) return;
    setAccessingPatient(true);
    setAccessMsg({ type: '', text: '' });
    try {
      const res = await doctorService.verifyPatientOtp(patientEmail.trim(), patientOtp.trim());
      toast.success(t({ en: `Access granted: ${res.data?.patientName}`, hi: `एक्सेस मिला: ${res.data?.patientName}` }));
      setPatientEmail(''); setPatientOtp(''); fetchData();
    } catch (err) { 
      toast.error(err?.response?.data?.message || t({ en: 'OTP verification failed.', hi: 'OTP जांच नहीं हो सकी।' }));
    } finally { 
      setAccessingPatient(false); 
    }
  };

  const handleQRScan = async (scannedText) => {
    setShowQRScanner(false);
    let token = scannedText.startsWith('hrms:patient:') ? scannedText.replace('hrms:patient:', '') : scannedText;
    setQrAccessMsg({ type: '', text: '' });
    try {
      const res = await doctorService.verifyQrToken(token.trim());
      toast.success(t({ en: `Access granted: ${res.data?.patientName}`, hi: `एक्सेस मिला: ${res.data?.patientName}` }));
      fetchData();
    } catch (err) { 
      toast.error(err?.response?.data?.message || t({ en: 'Invalid QR code.', hi: 'QR कोड गलत है।' }));
    } finally { /* silent */ }
  };

  return (
    <DashboardLayout title={t({ en: 'Clinical Oversight', hi: 'क्लिनिकल ओवरव्यू' })}>
      {loading ? (
        <LoadingScreen message={t({ en: 'Establishing Clinical Environment', hi: 'क्लिनिकल वातावरण तैयार हो रहा है' })} />
      ) : (
        <div className="max-w-7xl mx-auto space-y-8 pb-20 px-4 sm:px-0">
        
        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <KPICard label={t({ en: 'Clinical Subjects', hi: 'मरीज' })} value={dashboard?.patientCount ?? 0} icon="👥" color="text-indigo-600 dark:text-indigo-400" />
          <KPICard label={t({ en: 'Medical Artifacts', hi: 'मेडिकल रिकॉर्ड' })} value={dashboard?.recordCount ?? 0} icon="📄" color="text-emerald-500" />
          <KPICard label={t({ en: 'Network Nodes', hi: 'अस्पताल लिंक' })} value={dashboard?.affiliationCount ?? 0} icon="🏥" color="text-amber-500" />
        </div>

        {/* Central Operations Console */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Patient Access Cluster */}
          <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-sm border border-slate-200/50 dark:border-slate-800">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2">{t({ en: 'Patient Access', hi: 'मरीज एक्सेस' })}</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">{t({ en: 'Verify a patient before opening their records.', hi: 'रिकॉर्ड खोलने से पहले मरीज की जांच करें।' })}</p>

            <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit mb-8">
              {['otp', 'qr'].map(m => (
                <button
                  key={m}
                  onClick={() => setAccessMethod(m)}
                  className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${accessMethod === m ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500'}`}
                >
                  {m === 'otp' ? t({ en: 'OTP Access', hi: 'OTP एक्सेस' }) : t({ en: 'QR Access', hi: 'QR एक्सेस' })}
                </button>
              ))}
            </div>

            {accessMethod === 'otp' ? (
              <form onSubmit={handlePatientAccess} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t({ en: 'Patient Email', hi: 'मरीज ईमेल' })}</label>
                      <input type="email" value={patientEmail} onChange={(e) => setPatientEmail(e.target.value)} placeholder="subject@node.com" className="w-full px-5 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-transparent focus:ring-2 focus:ring-indigo-500 dark:text-white font-bold transition-all outline-none" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t({ en: '6-Digit OTP', hi: '6 अंकों का OTP' })}</label>
                      <input type="text" maxLength={6} value={patientOtp} onChange={(e) => setPatientOtp(e.target.value.replace(/\D/g, ''))} placeholder="000000" className="w-full px-5 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-transparent focus:ring-2 focus:ring-indigo-500 dark:text-white font-black tracking-[0.5em] text-center outline-none" />
                   </div>
                </div>
                <button type="submit" disabled={accessingPatient || !patientEmail || patientOtp.length !== 6} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-500/20 active:scale-95 transition-all disabled:opacity-50">
                  {accessingPatient ? t({ en: 'Verifying Access...', hi: 'जांच हो रही है...' }) : t({ en: 'Verify Patient Access', hi: 'मरीज एक्सेस जांचें' })}
                </button>
              </form>
            ) : (
              <div className="flex flex-col items-center py-6">
                 <button onClick={() => setShowQRScanner(true)} className="w-32 h-32 bg-slate-100 dark:bg-slate-800 rounded-[2.5rem] flex items-center justify-center text-5xl hover:scale-105 transition-all shadow-inner border dark:border-slate-700 mb-6">📷</button>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t({ en: 'Scan a patient QR code to verify access', hi: 'मरीज का QR कोड स्कैन करें' })}</p>
              </div>
            )}
          </div>

          {/* Hospital Affiliation Cluster */}
          <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-sm border border-slate-200/50 dark:border-slate-800">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2">{t({ en: 'Hospital Affiliation', hi: 'अस्पताल से जुड़ें' })}</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">{t({ en: 'Use the hospital OTP to connect your account.', hi: 'अस्पताल OTP से अकाउंट जोड़ें।' })}</p>
            
            <form onSubmit={handleAffiliate} className="space-y-6">
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t({ en: 'Hospital OTP', hi: 'अस्पताल OTP' })}</label>
                     <input type="text" maxLength={6} value={otpInput} onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))} placeholder="000000" className="w-full px-5 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-transparent focus:ring-2 focus:ring-indigo-500 dark:text-white font-black tracking-[0.5em] text-center outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t({ en: 'Department', hi: 'विभाग' })}</label>
                    <input type="text" value={deptInput} onChange={(e) => setDeptInput(e.target.value)} placeholder={t({ en: 'e.g. Oncology', hi: 'जैसे ऑन्कोलॉजी' })} className="w-full px-5 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-transparent focus:ring-2 focus:ring-indigo-500 dark:text-white font-bold outline-none" />
                  </div>
               </div>
               <button type="submit" disabled={affiliating || otpInput.length !== 6} className="w-full bg-slate-900 dark:bg-white dark:text-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all disabled:opacity-50">
                  {affiliating ? t({ en: 'Connecting...', hi: 'जुड़ रहा है...' }) : t({ en: 'Join Hospital', hi: 'अस्पताल से जुड़ें' })}
               </button>
            </form>
          </div>
        </div>

        {/* Support Personnel Section */}
        <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-sm border border-slate-200/50 dark:border-slate-800">
           <div className="flex justify-between items-center mb-10">
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{t({ en: 'Assigned Nurses', hi: 'जुड़ी नर्सें' })}</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{t({ en: 'Nurses currently assigned to support your work', hi: 'जो नर्सें आपके साथ हैं' })}</p>
              </div>
              <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black">
                 {assignedNurses.length}
              </div>
           </div>
           {assignedNurses.length === 0 ? (
             <p className="text-center py-10 text-slate-400 font-bold uppercase tracking-widest text-[10px]">{t({ en: 'No assigned nurses yet', hi: 'अभी कोई नर्स नहीं जुड़ी' })}</p>
           ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {assignedNurses.map((item) => (
                  <div key={item._id} className="p-6 bg-slate-50 dark:bg-slate-800 border border-transparent dark:border-slate-700 rounded-[2rem] hover:shadow-xl transition-all group">
                     <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-700 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">👩‍⚕️</div>
                        <div>
                           <p className="text-sm font-black text-slate-900 dark:text-white line-clamp-1">{item.nurse?.name}</p>
                          <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{item.nurse?.shift || t({ en: 'Rotational', hi: 'रोटेशन' })}</p>
                        </div>
                     </div>
                     <div className="space-y-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                        <div className="flex justify-between"><span>{t({ en: 'Hospital', hi: 'अस्पताल' })}:</span> <span className="text-slate-800 dark:text-slate-200">{item.hospitalId?.name}</span></div>
                        <div className="flex justify-between"><span>{t({ en: 'Department', hi: 'विभाग' })}:</span> <span className="text-slate-800 dark:text-slate-200">{item.department || t({ en: 'N/A', hi: 'उपलब्ध नहीं' })}</span></div>
                        <div className="flex justify-between"><span>{t({ en: 'License', hi: 'लाइसेंस' })}:</span> <span className="text-slate-800 dark:text-slate-200 font-mono tracking-tighter">{item.nurse?.licenseNumber}</span></div>
                     </div>
                  </div>
                ))}
             </div>
           )}
        </div>

        {/* History Tables Grid */}
        <div className="grid grid-cols-1 gap-8">
           <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-sm border border-slate-200/50 dark:border-slate-800 overflow-hidden">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-8">{t({ en: 'Access History', hi: 'एक्सेस इतिहास' })}</h2>
              <div className="overflow-x-auto">
                 <table className="w-full">
                    <thead>
                       <tr className="text-left py-4 border-b dark:border-slate-800">
                      <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t({ en: 'Subject', hi: 'मरीज' })}</th>
                      <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t({ en: 'Blood Group', hi: 'ब्लड ग्रुप' })}</th>
                      <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t({ en: 'Gender', hi: 'लिंग' })}</th>
                      <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">{t({ en: 'Clearance Date', hi: 'क्लियरेंस तारीख' })}</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-slate-800">
                       {dashboard?.recentPatients?.map((a) => (
                          <tr key={a._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                             <td className="py-5">
                                <p className="text-sm font-black text-slate-800 dark:text-slate-200">{a.patient?.name}</p>
                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 italic">{a.patient?.email}</p>
                             </td>
                              <td className="py-5"><span className="px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-black rounded-lg">{a.patient?.bloodGroup || t({ en: 'UNK', hi: 'अज्ञात' })}</span></td>
                              <td className="py-5 text-[10px] font-black text-slate-500 uppercase">{a.patient?.gender || t({ en: '--', hi: '--' })}</td>
                             <td className="py-5 text-right text-[10px] font-black text-slate-400 uppercase">{new Date(a.grantedAt).toLocaleDateString()}</td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>

        {/* Nurse Request Popups handled by original logic but with modern styling */}
        {showNursePopup && nurseRequests.length > 0 && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
              <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-slate-800">
                 <div className="bg-indigo-600 p-8 flex items-center justify-between">
                    <div>
                    <h3 className="text-xl font-black text-white">{t({ en: 'Nurse Access Requests', hi: 'नर्स एक्सेस अनुरोध' })}</h3>
                      <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mt-1">{nurseRequests.length} {t({ en: 'Pending Requests', hi: 'लंबित अनुरोध' })}</p>
                    </div>
                    <button onClick={() => setShowNursePopup(false)} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-2xl transition-all">&times;</button>
                 </div>
                 <div className="p-8 max-h-[50vh] overflow-y-auto space-y-4">
                    {nurseRequests.map((req) => (
                       <div key={req._id} className="p-6 bg-slate-50 dark:bg-slate-800 rounded-[2rem] border border-transparent dark:border-slate-700">
                          <div className="flex justify-between items-start mb-4">
                             <div>
                            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{req.type === 'nurse_extension_request' ? t({ en: 'Access Extension', hi: 'एक्सेस बढ़ाना' }) : t({ en: 'Record Access', hi: 'रिकॉर्ड एक्सेस' })}</p>
                            <p className="text-sm font-black dark:text-white">{t({ en: 'Nurse', hi: 'नर्स' })} {req.nurse?.name}</p>
                             </div>
                             <span className="text-[9px] font-black text-slate-400 uppercase">{new Date(req.createdAt).toLocaleTimeString()}</span>
                          </div>
                        <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-6 italic">{t({ en: 'Requesting', hi: 'अनुरोध' })} {req.operation} {t({ en: 'access for patient', hi: 'एक्सेस मरीज के लिए' })} {req.patient?.name}</p>
                          <div className="flex gap-3">
                          <button onClick={() => handleApproveRequest(req._id)} disabled={processingRequest === req._id} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50">{t({ en: 'Approve', hi: 'मंजूर' })}</button>
                          <button onClick={() => handleRejectRequest(req._id)} disabled={processingRequest === req._id} className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50">{t({ en: 'Reject', hi: 'अस्वीकार' })}</button>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
           </div>
        )}

        </div>
      )}
      {showQRScanner && <QRScanner onScan={handleQRScan} onError={() => {}} onClose={() => setShowQRScanner(false)} />}
    </DashboardLayout>
  );
};

export default DoctorDashboard;
