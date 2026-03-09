import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { doctorService } from '../../services/api';

const DoctorPatients = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    doctorService.getMyPatients()
      .then((res) => setPatients(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = patients.filter((p) => {
    const name = p.patient?.name?.toLowerCase() || '';
    const email = p.patient?.email?.toLowerCase() || '';
    const q = search.toLowerCase();
    return name.includes(q) || email.includes(q);
  });

  return (
    <DashboardLayout title="My Patients">
      <div className="bg-white p-6 rounded-xl shadow-sm mb-5">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h2 className="text-gray-800 text-xl font-semibold">
            Patients ({patients.length})
          </h2>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-72 px-4 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-600 transition-colors"
          />
        </div>

        {loading ? (
          <p className="text-gray-500">Loading patients...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-6xl mb-4">👥</p>
            <p className="text-gray-500 text-lg">No patients found</p>
            <p className="text-gray-400 text-sm mt-1">Patients will appear here once they grant you access.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((item) => (
              <div key={item._id} className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-800 text-lg">{item.patient?.name || 'N/A'}</h3>
                    <p className="text-sm text-gray-500">{item.patient?.email || 'N/A'}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${item.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {item.isActive ? 'Active' : 'Revoked'}
                  </span>
                </div>

                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  {item.patient?.phone && (
                    <div className="flex items-center gap-2">
                      <span>📞</span> {item.patient.phone}
                    </div>
                  )}
                  {item.patient?.gender && (
                    <div className="flex items-center gap-2">
                      <span>👤</span> <span className="capitalize">{item.patient.gender}</span>
                    </div>
                  )}
                  {item.patient?.bloodGroup && (
                    <div className="flex items-center gap-2">
                      <span>🩸</span> {item.patient.bloodGroup}
                    </div>
                  )}
                  {item.patient?.dateOfBirth && (
                    <div className="flex items-center gap-2">
                      <span>🎂</span> {new Date(item.patient.dateOfBirth).toLocaleDateString()}
                    </div>
                  )}
                  {item.lastVisitDate && (
                    <div className="flex items-center gap-2">
                      <span>📅</span> Last visit: {new Date(item.lastVisitDate).toLocaleDateString()}
                    </div>
                  )}
                  {item.lastHospital && (
                    <div className="flex items-center gap-2">
                      <span>🏥</span> {item.lastHospital}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>Access via {item.accessMethod?.toUpperCase() || 'OTP'}</span>
                  <span>Since {new Date(item.grantedAt).toLocaleDateString()}</span>
                </div>

                <Link
                  to={`/doctor/patient-records/${item.patient?._id}`}
                  className="mt-3 block text-center px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors no-underline"
                >
                  View Records
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DoctorPatients;
