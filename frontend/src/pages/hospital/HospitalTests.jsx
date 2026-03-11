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
    <DashboardLayout title="Test Management">
      {/* Message Alert */}
      {message.text && (
        <div className={`mb-5 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
          {message.text}
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Test Types</h2>
          <p className="text-gray-600 text-sm mt-1">Create and manage test types for your hospital</p>
        </div>
        <div className="flex gap-3">
          <Link 
            to="/hospital/test-assignments" 
            className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors no-underline"
          >
            📋 View Assignments
          </Link>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="px-5 py-2.5 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
            >
              ✚ Create Test Type
            </button>
          )}
        </div>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="bg-white p-6 rounded-xl shadow-sm mb-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            {editingId ? 'Edit Test Type' : 'Create New Test Type'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-2">Test Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Complete Blood Count (CBC)"
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-600"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-2">Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-600"
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the test..."
                rows="3"
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-600"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">Estimated Duration (minutes)</label>
              <input
                type="number"
                value={formData.estimatedDuration}
                onChange={(e) => setFormData({ ...formData, estimatedDuration: parseInt(e.target.value) || 30 })}
                min="1"
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-600"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">Instructions for Nurses</label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={instructionInput}
                  onChange={(e) => setInstructionInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addInstruction())}
                  placeholder="Add instruction step..."
                  className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-600"
                />
                <button
                  type="button"
                  onClick={addInstruction}
                  className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200"
                >
                  Add Step
                </button>
              </div>

              {formData.instructions.length > 0 && (
                <ul className="space-y-2">
                  {formData.instructions.map((inst, index) => (
                    <li key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-700">
                        <span className="font-semibold text-purple-600">{index + 1}.</span> {inst.step}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeInstruction(index)}
                        className="text-red-500 hover:text-red-700 font-semibold"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingId ? 'Update Test Type' : 'Create Test Type'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Test Types List */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <p className="p-6 text-gray-500">Loading test types...</p>
        ) : testTypes.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-5xl mb-4">🧪</p>
            <p className="text-gray-500 text-lg">No test types created yet</p>
            <p className="text-gray-400 text-sm mt-1">Click "Create Test Type" to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Test Name</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Category</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Duration</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Instructions</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {testTypes.map((test) => (
                  <tr key={test._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-800">{test.name}</div>
                      {test.description && (
                        <div className="text-sm text-gray-500 mt-1">{test.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                        {categories.find(c => c.value === test.category)?.label || test.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {test.estimatedDuration || 30} min
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {test.instructions?.length || 0} steps
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        test.isActive 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {test.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(test)}
                          className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-semibold hover:bg-blue-200"
                        >
                          Edit
                        </button>
                        {test.isActive && (
                          <button
                            onClick={() => handleDelete(test._id, test.name)}
                            className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-semibold hover:bg-red-200"
                          >
                            Deactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default HospitalTests;
