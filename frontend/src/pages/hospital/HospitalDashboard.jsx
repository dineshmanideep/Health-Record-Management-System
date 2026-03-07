import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';

const HospitalDashboard = () => {
  const { user } = useAuth();

  return (
    <DashboardLayout title="Hospital Dashboard">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-xs uppercase text-gray-600 font-medium mb-2">Total Doctors</h3>
          <p className="text-4xl font-bold text-teal-600">0</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-xs uppercase text-gray-600 font-medium mb-2">Total Nurses</h3>
          <p className="text-4xl font-bold text-teal-600">0</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-xs uppercase text-gray-600 font-medium mb-2">Available Beds</h3>
          <p className="text-4xl font-bold text-teal-600">0</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-xs uppercase text-gray-600 font-medium mb-2">Departments</h3>
          <p className="text-4xl font-bold text-teal-600">0</p>
        </div>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-sm mb-5">
        <h2 className="text-gray-800 mb-5 text-2xl font-semibold">Welcome to {user?.name}!</h2>
        <p className="text-gray-600 leading-relaxed">
          Your hospital management portal is ready. You can now:
        </p>
        <ul className="text-gray-600 leading-loose mt-4 list-disc list-inside">
          <li>Manage doctors and nurses</li>
          <li>Track bed availability and occupancy</li>
          <li>Manage departments and facilities</li>
          <li>View patient admissions and discharges</li>
          <li>Monitor hospital operations</li>
        </ul>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-sm">
        <h2 className="text-gray-800 mb-5 text-2xl font-semibold">Quick Stats</h2>
        <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Today's Admissions</span><span className="text-gray-800 flex-1">0</span></div>
        <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Today's Discharges</span><span className="text-gray-800 flex-1">0</span></div>
        <div className="flex py-4 border-b border-gray-200"><span className="font-semibold text-gray-600 w-52">Emergency Cases</span><span className="text-gray-800 flex-1">0</span></div>
        <div className="flex py-4"><span className="font-semibold text-gray-600 w-52">OPD Patients</span><span className="text-gray-800 flex-1">0</span></div>
      </div>
    </DashboardLayout>
  );
};

export default HospitalDashboard;
