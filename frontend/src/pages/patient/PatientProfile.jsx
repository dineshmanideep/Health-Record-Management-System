import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import LoadingScreen from '../../components/LoadingScreen';
import toast from 'react-hot-toast';
import { useLanguage } from '../../context/LanguageContext';
import { profileService } from '../../services/api';

const InfoRow = ({ label, value, icon, emptyLabel }) => (
  <div className="flex items-center gap-5 py-6 border-b border-slate-100 dark:border-slate-800/50 last:border-0 group">
    <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-xl group-hover:scale-110 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/20 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-all shadow-sm border border-slate-100 dark:border-slate-800 shrink-0">
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1.5">{label}</p>
      <p className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest truncate">{value || emptyLabel}</p>
    </div>
  </div>
);

const inputCls = "w-full px-6 py-4 rounded-[1.5rem] bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-sm font-black dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all";

const PatientProfile = () => {
  const { t } = useLanguage();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editProfile, setEditProfile] = useState(false);
  const [editEmergency, setEditEmergency] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', dateOfBirth: '', gender: '', bloodGroup: '' });
  const [ecForm, setEcForm] = useState({ name: '', relationship: '', phone: '' });

  const syncForms = (data) => {
    setForm({
      name: data.name || '',
      phone: data.phone || '',
      dateOfBirth: data.dateOfBirth ? data.dateOfBirth.slice(0, 10) : '',
      gender: data.gender || '',
      bloodGroup: data.bloodGroup || ''
    });
    setEcForm({
      name: data.emergencyContact?.name || '',
      relationship: data.emergencyContact?.relationship || '',
      phone: data.emergencyContact?.phone || ''
    });
  };

  useEffect(() => {
    profileService.patient.get()
      .then((res) => {
        if (res.success) {
          setProfile(res.data);
          syncForms(res.data);
        }
      })
      .catch(() => toast.error(t({ en: 'Failed to retrieve medical identity record', hi: 'मेडिकल पहचान रिकॉर्ड नहीं मिला' })))
      .finally(() => setLoading(false));
  }, []);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await profileService.patient.update(form);
      if (res.success) {
        setProfile(res.data);
        syncForms(res.data);
        setEditProfile(false);
        toast.success(t({ en: 'Medical identity updated successfully', hi: 'मेडिकल पहचान सफलतापूर्वक अपडेट हुई' }));
      }
    } catch {
      toast.error(t({ en: 'Identity update synchronization failed', hi: 'पहचान अपडेट नहीं हो सका' }));
    }

    setSaving(false);
  };

  const handleEmergencySave = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await profileService.patient.update({ emergencyContact: ecForm });
      if (res.success) {
        setProfile(res.data);
        syncForms(res.data);
        setEditEmergency(false);
        toast.success(t({ en: 'Emergency contact updated', hi: 'इमरजेंसी संपर्क अपडेट हुआ' }));
      }
    } catch {
      toast.error(t({ en: 'Emergency contact synchronization failed', hi: 'इमरजेंसी संपर्क अपडेट नहीं हो सका' }));
    }

    setSaving(false);
  };

  const formatDate = (value) =>
    value ? new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase() : t({ en: 'NOT PROVIDED', hi: 'उपलब्ध नहीं' });

  return (
    <DashboardLayout title={t({ en: 'My Profile', hi: 'मेरी प्रोफाइल' })}>
      <div className="max-w-6xl mx-auto space-y-10 pb-24">
        {loading ? (
          <LoadingScreen message={t({ en: 'Accessing Medical Identity Profile', hi: 'मेडिकल पहचान प्रोफाइल खुल रही है' })} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-fadeIn">
            <div className="lg:col-span-4 space-y-8">
              <div className="bg-white dark:bg-slate-900 p-10 rounded-[3.5rem] shadow-sm border border-slate-200/50 dark:border-slate-800 text-center relative overflow-hidden group">
                <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-emerald-500 to-teal-600" />
                <div className="relative z-10 pt-10">
                  <div className="w-24 h-24 bg-white dark:bg-slate-900 rounded-[2.5rem] flex items-center justify-center text-4xl mx-auto mb-6 shadow-2xl border-4 border-white dark:border-slate-900 font-black text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                    {profile.name?.charAt(0)}
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase mb-1">{profile.name}</h2>
                  <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 mb-8 uppercase tracking-[0.3em]">
                    {t({ en: 'Patient ID', hi: 'मरीज आईडी' })}: {profile.patientId}
                  </p>

                  <div className="grid grid-cols-2 gap-4 pb-2">
                    <div className="p-5 bg-slate-50 dark:bg-slate-950 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 italic">{t({ en: 'Gender', hi: 'लिंग' })}</p>
                      <p className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">{profile.gender || t({ en: 'Not Set', hi: 'सेट नहीं' })}</p>
                    </div>
                    <div className="p-5 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-[2rem] border border-emerald-100/50 dark:border-emerald-800/20">
                      <p className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em] mb-1.5 italic">{t({ en: 'Blood Group', hi: 'ब्लड ग्रुप' })}</p>
                      <p className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">{profile.bloodGroup || t({ en: 'Not Set', hi: 'सेट नहीं' })}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-10 rounded-[3.5rem] shadow-sm border border-slate-200/50 dark:border-slate-800">
                <h3 className="text-[10px] font-black text-slate-950 dark:text-white mb-8 uppercase tracking-[0.3em] flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {t({ en: 'Account Status', hi: 'अकाउंट स्थिति' })}
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">{t({ en: 'Record Access', hi: 'रिकॉर्ड एक्सेस' })}</span>
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{t({ en: 'Protected', hi: 'सुरक्षित' })}</span>
                  </div>
                  <div className="flex justify-between items-center p-5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">{t({ en: 'Account', hi: 'अकाउंट' })}</span>
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{t({ en: 'Verified', hi: 'वेरिफाइड' })}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-8 space-y-10">
              <div className="bg-white dark:bg-slate-900 p-10 sm:p-14 rounded-[4rem] shadow-sm border border-slate-200/50 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-12">
                  <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">{t({ en: 'Personal Details', hi: 'व्यक्तिगत विवरण' })}</h2>
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mt-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      {t({ en: 'Basic patient information', hi: 'मरीज की मूल जानकारी' })}
                    </p>
                  </div>
                  {!editProfile && (
                    <button onClick={() => setEditProfile(true)} className="px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 hover:-translate-y-1">
                      {t({ en: 'Edit Profile', hi: 'प्रोफाइल संपादित करें' })}
                    </button>
                  )}
                </div>

                {editProfile ? (
                  <form onSubmit={handleProfileSave} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3 italic">{t({ en: 'Full Name', hi: 'पूरा नाम' })}</label>
                        <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3 italic">{t({ en: 'Phone Number', hi: 'फोन नंबर' })}</label>
                        <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91-0000000000" className={inputCls} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3 italic">{t({ en: 'Date of Birth', hi: 'जन्म तारीख' })}</label>
                        <input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} className={inputCls} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3 italic">{t({ en: 'Gender', hi: 'लिंग' })}</label>
                        <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className={inputCls}>
                          <option value="">{t({ en: 'Select Gender', hi: 'लिंग चुनें' })}</option>
                          <option value="male">{t({ en: 'Male', hi: 'पुरुष' })}</option>
                          <option value="female">{t({ en: 'Female', hi: 'महिला' })}</option>
                          <option value="other">{t({ en: 'Other', hi: 'अन्य' })}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3 italic">{t({ en: 'Blood Group', hi: 'ब्लड ग्रुप' })}</label>
                        <select value={form.bloodGroup} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })} className={inputCls}>
                          <option value="">{t({ en: 'Select Blood Group', hi: 'ब्लड ग्रुप चुनें' })}</option>
                          {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map((group) => <option key={group} value={group}>{group}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-4 pt-10 border-t border-slate-100 dark:border-slate-800">
                      <button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50">
                        {saving ? t({ en: 'Saving...', hi: 'सेव हो रहा है...' }) : t({ en: 'Save Changes', hi: 'बदलाव सेव करें' })}
                      </button>
                      <button type="button" onClick={() => { setEditProfile(false); syncForms(profile); }} className="bg-slate-50 dark:bg-slate-950 text-slate-400 px-10 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all border border-slate-100 dark:border-slate-800">
                        {t({ en: 'Cancel', hi: 'रद्द करें' })}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 px-2">
                    <InfoRow label={t({ en: 'Email', hi: 'ईमेल' })} value={profile.email} icon="📧" emptyLabel={t({ en: 'Not Provided', hi: 'उपलब्ध नहीं' })} />
                    <InfoRow label={t({ en: 'Phone', hi: 'फोन' })} value={profile.phone} icon="📞" emptyLabel={t({ en: 'Not Provided', hi: 'उपलब्ध नहीं' })} />
                    <InfoRow label={t({ en: 'Date of Birth', hi: 'जन्म तारीख' })} value={formatDate(profile.dateOfBirth)} icon="🎂" emptyLabel={t({ en: 'Not Provided', hi: 'उपलब्ध नहीं' })} />
                    <InfoRow label={t({ en: 'Gender', hi: 'लिंग' })} value={profile.gender ? profile.gender.toUpperCase() : null} icon="🧬" emptyLabel={t({ en: 'Not Provided', hi: 'उपलब्ध नहीं' })} />
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-slate-900 p-10 sm:p-14 rounded-[4rem] shadow-sm border border-slate-200/50 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-12">
                  <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">{t({ en: 'Emergency Contact', hi: 'इमरजेंसी संपर्क' })}</h2>
                    <p className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] mt-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                      {t({ en: 'Person to contact in an emergency', hi: 'आपात स्थिति में संपर्क करें' })}
                    </p>
                  </div>
                  {!editEmergency && (
                    <button onClick={() => setEditEmergency(true)} className="px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 hover:-translate-y-1">
                      {profile.emergencyContact?.name ? t({ en: 'Edit Contact', hi: 'संपर्क बदलें' }) : t({ en: 'Add Contact', hi: 'संपर्क जोड़ें' })}
                    </button>
                  )}
                </div>

                {editEmergency ? (
                  <form onSubmit={handleEmergencySave} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3 italic">{t({ en: 'Contact Name', hi: 'संपर्क का नाम' })}</label>
                        <input type="text" value={ecForm.name} onChange={(e) => setEcForm({ ...ecForm, name: e.target.value })} placeholder={t({ en: 'Full Name', hi: 'पूरा नाम' })} className={inputCls} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3 italic">{t({ en: 'Relationship', hi: 'रिश्ता' })}</label>
                        <input type="text" value={ecForm.relationship} onChange={(e) => setEcForm({ ...ecForm, relationship: e.target.value })} placeholder={t({ en: 'Parent, Spouse, Sibling', hi: 'माता-पिता, पति/पत्नी, भाई/बहन' })} className={inputCls} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3 italic">{t({ en: 'Phone Number', hi: 'फोन नंबर' })}</label>
                        <input type="text" value={ecForm.phone} onChange={(e) => setEcForm({ ...ecForm, phone: e.target.value })} placeholder="+91-0000000000" className={inputCls} />
                      </div>
                    </div>
                    <div className="flex gap-4 pt-10 border-t border-slate-100 dark:border-slate-800">
                      <button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50">
                        {saving ? t({ en: 'Saving...', hi: 'सेव हो रहा है...' }) : t({ en: 'Save Contact', hi: 'संपर्क सेव करें' })}
                      </button>
                      <button type="button" onClick={() => { setEditEmergency(false); syncForms(profile); }} className="bg-slate-50 dark:bg-slate-950 text-slate-400 px-10 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all border border-slate-100 dark:border-slate-800">
                        {t({ en: 'Cancel', hi: 'रद्द करें' })}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-x-12 px-2">
                    <InfoRow label={t({ en: 'Name', hi: 'नाम' })} value={profile.emergencyContact?.name} icon="🤝" emptyLabel={t({ en: 'Not Provided', hi: 'उपलब्ध नहीं' })} />
                    <InfoRow label={t({ en: 'Relationship', hi: 'रिश्ता' })} value={profile.emergencyContact?.relationship} icon="🔗" emptyLabel={t({ en: 'Not Provided', hi: 'उपलब्ध नहीं' })} />
                    <InfoRow label={t({ en: 'Phone', hi: 'फोन' })} value={profile.emergencyContact?.phone} icon="🚨" emptyLabel={t({ en: 'Not Provided', hi: 'उपलब्ध नहीं' })} />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default PatientProfile;
