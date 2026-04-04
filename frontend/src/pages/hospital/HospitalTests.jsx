import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { hospitalService } from '../../services/api';

const HospitalTests = () => {
  const [testTypes, setTestTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'blood_test',
    estimatedDuration: 30,
    instructions: []
  });
  const [instructionInput, setInstructionInput] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [saving, setSaving] = useState(false);

  const categories = [
    { value: 'blood_test', label: 'Blood Test' },
    { value: 'imaging', label: 'Imaging' },
    { value: 'vital_signs', label: 'Vital Signs' },
    { value: 'screening', label: 'Screening' },
    { value: 'other', label: 'Other' }
  ];

  const fetchTestTypes = async () => {
    try {
      setLoading(true);
      const res = await hospitalService.getTestTypes();
      setTestTypes(res.data || []);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load test types' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTestTypes();
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'blood_test',
      estimatedDuration: 30,
      instructions: []
    });
    setInstructionInput('');
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (testType) => {
    setFormData({
      name: testType.name,
      description: testType.description || '',
      category: testType.category,
      estimatedDuration: testType.estimatedDuration || 30,
      instructions: testType.instructions || []
    });
    setEditingId(testType._id);
    setShowForm(true);
  };

  const addInstruction = () => {
    if (!instructionInput.trim()) return;
    setFormData({
      ...formData,
      instructions: [
        ...formData.instructions,
        { step: instructionInput.trim(), order: formData.instructions.length }
      ]
    });
    setInstructionInput('');
  };

  const removeInstruction = (index) => {
    setFormData({
      ...formData,
      instructions: formData.instructions.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setMessage({ type: 'error', text: 'Test name is required' });
      return;
    }

    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      if (editingId) {
        await hospitalService.updateTestType(editingId, formData);
        setMessage({ type: 'success', text: 'Test type updated successfully!' });
      } else {
        await hospitalService.createTestType(formData);
        setMessage({ type: 'success', text: 'Test type created successfully!' });
      }
      resetForm();
      fetchTestTypes();
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to save test type' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Deactivate test type "${name}"?`)) return;

    try {
      await hospitalService.deleteTestType(id);
      setMessage({ type: 'success', text: 'Test type deactivated' });
      fetchTestTypes();
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to deactivate test type' });
    }
  };

  return (
    <DashboardLayout title="Protocol Management">
      <div className="space-y-6 pb-12">
        {/* Message Alert */}
        {message.text && (
          <div className={`p-4 rounded-2xl text-sm font-medium animate-fadeIn flex items-center gap-3 border ${
            message.type === 'success' 
              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/50' 
              : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-800/50'
          }`}>
            <span>{message.type === 'success' ? '✅' : '⚠️'}</span>
            {message.text}
          </div>
        )}

        {/* Header */}
        <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2rem] border border-slate-200/60 dark:border-slate-800 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
            <div>
              <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight uppercase">Lab Protocol Library</h2>
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mt-1">Configure diagnostic standards and nurse instructions</p>
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
              <Link 
                to="/hospital/test-assignments" 
                className="flex-1 sm:flex-initial px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-750 transition-all no-underline text-center"
              >
                📋 Assignments
              </Link>
              {!showForm && (
                <button
                  onClick={() => setShowForm(true)}
                  className="flex-1 sm:flex-initial px-6 py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all active:scale-95"
                >
                  ✚ New Protocol
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Create/Edit Form */}
        {showForm && (
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl border-4 border-emerald-500/10 mb-8 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-10">
               <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
                    {editingId ? 'Modify Protocol' : 'Initialize Protocol'}
                  </h3>
                  <p className="text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase mt-1">Configuring clinical diagnostic parameters</p>
               </div>
               <button onClick={resetForm} className="text-slate-400 hover:text-rose-500 transition-all text-2xl font-black">×</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Protocol Alias *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., NEURO_SCREEN_ALPHA"
                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold dark:text-white placeholder:opacity-30 focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Classification *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-[10px] font-black dark:text-white focus:ring-2 focus:ring-emerald-500 transition-all outline-none appearance-none cursor-pointer uppercase tracking-widest"
                  >
                    {categories.map((cat) => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Operational Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Primary objective and scope of this protocol..."
                  rows="3"
                  className="w-full px-8 py-6 bg-slate-50 dark:bg-slate-800 border-none rounded-[2rem] text-sm font-bold dark:text-white focus:ring-2 focus:ring-emerald-500 transition-all outline-none resize-none"
                />
              </div>

              <div className="space-y-2 max-w-xs">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Temporal Estimate (Min)</label>
                <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800 px-6 py-4 rounded-2xl">
                   <span className="text-xl">⏱️</span>
                   <input
                    type="number"
                    value={formData.estimatedDuration}
                    onChange={(e) => setFormData({ ...formData, estimatedDuration: parseInt(e.target.value) || 30 })}
                    min="1"
                    className="w-full bg-transparent border-none text-sm font-black dark:text-white focus:ring-0 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-6 p-8 bg-slate-50 dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-750">
                <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                   <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Operational Directives
                </h4>
                
                <div className="flex gap-4">
                  <input
                    type="text"
                    value={instructionInput}
                    onChange={(e) => setInstructionInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addInstruction())}
                    placeholder="Enter discrete step instruction..."
                    className="flex-1 px-6 py-4 bg-white dark:bg-slate-900 border-none rounded-2xl text-xs font-bold dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                  />
                  <button
                    type="button"
                    onClick={addInstruction}
                    className="px-6 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 dark:hover:bg-white dark:hover:text-slate-900 transition-all"
                  >
                    Append Step
                  </button>
                </div>

                {formData.instructions.length > 0 ? (
                  <div className="space-y-3">
                    {formData.instructions.map((inst, index) => (
                      <div key={index} className="flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl group animate-slideIn">
                        <div className="flex items-center gap-4">
                          <span className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[10px] font-black">
                             {index + 1}
                          </span>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            {inst.step}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeInstruction(index)}
                          className="text-[9px] font-black uppercase text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-10 text-center opacity-30 grayscale italic">
                     <p className="text-[10px] font-black uppercase tracking-widest">No directives defined</p>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-6">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  {saving ? 'Synchronizing Archive...' : editingId ? 'Update System Protocol' : 'Deploy New Protocol'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-10 py-5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase tracking-widest rounded-[2rem] transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Protocols Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
             [1,2,3].map(i => <div key={i} className="h-64 bg-slate-100 dark:bg-slate-800 rounded-[2rem] animate-pulse" />)
          ) : testTypes.length === 0 ? (
            <div className="col-span-full py-24 text-center grayscale opacity-40">
              <span className="text-7xl mb-6 block">🔬</span>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Protocol Database Empty</p>
            </div>
          ) : (
            testTypes.map((test) => (
              <div key={test._id} className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-[2.5rem] p-8 hover:shadow-xl transition-all group overflow-hidden relative">
                <div className="flex justify-between items-start mb-6 relative z-10">
                  <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/40 rounded-lg text-[9px] font-black uppercase tracking-widest">
                    {categories.find(c => c.value === test.category)?.label || test.category}
                  </span>
                  <div className={`w-2 h-2 rounded-full ${test.isActive ? 'bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50' : 'bg-slate-300'}`} />
                </div>

                <div className="mb-8 relative z-10">
                  <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight line-clamp-1 group-hover:text-emerald-600 transition-colors">
                    {test.name}
                  </h3>
                  {test.description && (
                    <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mt-2 line-clamp-2 leading-relaxed italic">
                      "{test.description}"
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8 pt-6 border-t border-slate-50 dark:border-slate-800 relative z-10">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Time Profile</p>
                    <p className="text-sm font-black text-slate-900 dark:text-slate-200">~{test.estimatedDuration || 30}m</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Directives</p>
                    <p className="text-sm font-black text-slate-900 dark:text-slate-200">{test.instructions?.length || 0} Steps</p>
                  </div>
                </div>

                <div className="flex gap-2 relative z-10">
                  <button
                    onClick={() => handleEdit(test)}
                    className="flex-1 py-3 bg-slate-50 dark:bg-slate-800 text-slate-500 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    Configure
                  </button>
                  {test.isActive && (
                    <button
                      onClick={() => handleDelete(test._id, test.name)}
                      className="px-4 py-3 bg-slate-50 dark:bg-slate-800 text-rose-400 hover:bg-rose-500 hover:text-white dark:hover:bg-rose-500 rounded-xl text-[10px] font-black transition-all"
                      title="Deactivate"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Decorative BG element */}
                <div className="absolute bottom-0 right-0 w-24 h-24 bg-emerald-500/5 blur-[60px] rounded-full group-hover:scale-150 transition-transform" />
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default HospitalTests;
