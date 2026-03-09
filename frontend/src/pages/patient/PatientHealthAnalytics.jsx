import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { patientService } from '../../services/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const PatientHealthAnalytics = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    patientService.getHealthAnalytics()
      .then((res) => { if (res.success) setRecords(res.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const chartData = records.map((r) => ({
    date: new Date(r.visitDate).toLocaleDateString(),
    bloodSugar: r.healthMetrics?.bloodSugar ?? null,
    systolic: r.healthMetrics?.bloodPressureSystolic ?? null,
    diastolic: r.healthMetrics?.bloodPressureDiastolic ?? null,
    thyroidTSH: r.healthMetrics?.thyroidTSH ?? null,
    heartRate: r.healthMetrics?.heartRate ?? null,
    weight: r.healthMetrics?.weight ?? null,
  }));

  const hasData = (key) => chartData.some((d) => d[key] != null);

  const ChartCard = ({ title, children, color }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <span className={`w-3 h-3 rounded-full bg-${color}-500 inline-block`}></span>
        {title}
      </h3>
      {children}
    </div>
  );

  return (
    <DashboardLayout title="Health Analytics">
      {loading ? (
        <p className="text-gray-500">Loading analytics...</p>
      ) : chartData.length === 0 ? (
        <div className="bg-white p-12 rounded-xl shadow-sm text-center">
          <p className="text-5xl mb-4">📊</p>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No Health Data Yet</h2>
          <p className="text-gray-500">Health metrics will appear here after hospital visits where vital signs are recorded.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <p className="text-gray-500 text-sm">Trends based on {records.length} medical records with health metrics.</p>

          {/* Blood Sugar */}
          {hasData('bloodSugar') && (
            <ChartCard title="Blood Sugar (mg/dL)" color="green">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="bloodSugar" stroke="#16a34a" strokeWidth={2} dot={{ r: 4 }} name="Blood Sugar" connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {/* Blood Pressure */}
          {(hasData('systolic') || hasData('diastolic')) && (
            <ChartCard title="Blood Pressure (mmHg)" color="red">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="systolic" stroke="#dc2626" strokeWidth={2} dot={{ r: 4 }} name="Systolic" connectNulls />
                  <Line type="monotone" dataKey="diastolic" stroke="#f97316" strokeWidth={2} dot={{ r: 4 }} name="Diastolic" connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {/* Thyroid TSH */}
          {hasData('thyroidTSH') && (
            <ChartCard title="Thyroid TSH (mIU/L)" color="blue">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="thyroidTSH" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} name="TSH" connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {/* Heart Rate */}
          {hasData('heartRate') && (
            <ChartCard title="Heart Rate (bpm)" color="purple">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="heartRate" stroke="#9333ea" strokeWidth={2} dot={{ r: 4 }} name="Heart Rate" connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {/* Weight */}
          {hasData('weight') && (
            <ChartCard title="Weight (kg)" color="yellow">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="weight" stroke="#ca8a04" strokeWidth={2} dot={{ r: 4 }} name="Weight" connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          )}
        </div>
      )}
    </DashboardLayout>
  );
};

export default PatientHealthAnalytics;
