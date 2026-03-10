import axios from 'axios';

const API_URL = 'http://localhost:5001/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach JWT to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle 401 / 403 responses globally
// 401 → token missing/expired → force logout and redirect to login
// 403 → valid token but wrong role → redirect to /unauthorized
//   (skipped for /auth/* endpoints so login can show user-friendly status messages)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    const isAuthEndpoint = url.includes('/auth/');
    if (status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    } else if (status === 403 && !isAuthEndpoint) {
      window.location.href = '/unauthorized';
    }
    return Promise.reject(error);
  }
);

// Auth API calls
export const authService = {
  signup: async (userData) => {
    const response = await api.post('/auth/signup', userData);
    // Only persist token for patients (immediate active accounts)
    if (response.data.success && !response.data.pending && response.data.data?.token) {
      localStorage.setItem('token', response.data.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.data));
    }
    return response.data;
  },

  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    if (response.data.success && response.data.data.token) {
      localStorage.setItem('token', response.data.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.data));
    }
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  getToken: () => localStorage.getItem('token'),

  // Verify token is still valid and fetch fresh user data from the server
  verifyToken: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  }
};

// Profile API calls — each method is authorized by role on the backend
export const profileService = {
  patient: {
    get: () => api.get('/patient/profile').then((r) => r.data),
    update: (data) => api.put('/patient/profile', data).then((r) => r.data)
  },
  doctor: {
    get: () => api.get('/doctor/profile').then((r) => r.data),
    update: (data) => api.put('/doctor/profile', data).then((r) => r.data),
    getAffiliations: () => api.get('/doctor/affiliations').then((r) => r.data),
    affiliate: (otp, department) => api.post('/doctor/affiliate', { otp, department }).then((r) => r.data)
  },
  nurse: {
    get: () => api.get('/nurse/profile').then((r) => r.data),
    update: (data) => api.put('/nurse/profile', data).then((r) => r.data),
    getAffiliations: () => api.get('/nurse/affiliations').then((r) => r.data),
    affiliate: (otp, department) => api.post('/nurse/affiliate', { otp, department }).then((r) => r.data)
  },
  hospital: {
    get: () => api.get('/hospital/profile').then((r) => r.data),
    update: (data) => api.put('/hospital/profile', data).then((r) => r.data),
    generateOTP: (targetRole) => api.post('/hospital/otp/generate', { targetRole }).then((r) => r.data),
    getAffiliations: () => api.get('/hospital/affiliations').then((r) => r.data),
    getDashboard: () => api.get('/hospital/dashboard').then((r) => r.data),
    getDoctors: () => api.get('/hospital/doctors').then((r) => r.data),
    getNurses: () => api.get('/hospital/nurses').then((r) => r.data),
    revokeAffiliation: (id) => api.patch(`/hospital/affiliations/${id}/revoke`).then((r) => r.data),
    assignNurse: (affiliationId, doctorId) => api.post('/hospital/assign-nurse', { affiliationId, doctorId }).then((r) => r.data),
    unassignNurse: (affiliationId) => api.delete(`/hospital/assign-nurse/${affiliationId}`).then((r) => r.data),
    getAuditLogs: (page, limit) => api.get(`/hospital/audit-logs?page=${page || 1}&limit=${limit || 20}`).then((r) => r.data),
    // Test types
    createTestType: (data) => api.post('/hospital/test-types', data).then((r) => r.data),
    getTestTypes: (isActive) => api.get(`/hospital/test-types${isActive !== undefined ? `?isActive=${isActive}` : ''}`).then((r) => r.data),
    updateTestType: (id, data) => api.put(`/hospital/test-types/${id}`, data).then((r) => r.data),
    deleteTestType: (id) => api.delete(`/hospital/test-types/${id}`).then((r) => r.data),
    // Patient verification
    verifyPatient: (method, data) => api.post('/hospital/verify-patient', { method, ...data }).then((r) => r.data),
    // Test assignments
    createTestAssignment: (data) => api.post('/hospital/test-assignments', data).then((r) => r.data),
    getTestAssignments: (filters) => {
      const params = new URLSearchParams(filters).toString();
      return api.get(`/hospital/test-assignments${params ? `?${params}` : ''}`).then((r) => r.data);
    },
    getTestAssignment: (id) => api.get(`/hospital/test-assignments/${id}`).then((r) => r.data),
    cancelTestAssignment: (id) => api.patch(`/hospital/test-assignments/${id}/cancel`).then((r) => r.data)
  },
  admin: {
    get: () => api.get('/admin/profile').then((r) => r.data),
    update: (data) => api.put('/admin/profile', data).then((r) => r.data),
    listUsers: () => api.get('/admin/users').then((r) => r.data),
    listDoctors: () => api.get('/admin/doctors').then((r) => r.data),
    listHospitals: () => api.get('/admin/hospitals').then((r) => r.data),
    listNurses: () => api.get('/admin/nurses').then((r) => r.data)
  }
};

// Patient service — dashboard, records, self-records, doctor access, analytics, activity
export const patientService = {
  // Dashboard summary
  getDashboard: () => api.get('/patient/dashboard').then((r) => r.data),
  // Hospital medical records
  getRecords: () => api.get('/patient/records').then((r) => r.data),
  getRecord: (id) => api.get(`/patient/records/${id}`).then((r) => r.data),
  // Self-uploaded records
  getSelfRecords: () => api.get('/patient/self-records').then((r) => r.data),
  createSelfRecord: (formData) =>
    api.post('/patient/self-records', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then((r) => r.data),
  createSelfRecordLink: (data) => api.post('/patient/self-records/link', data).then((r) => r.data),
  deleteSelfRecord: (id) => api.delete(`/patient/self-records/${id}`).then((r) => r.data),
  // Doctor access
  generateAccessOTP: () => api.post('/patient/access/generate-otp').then((r) => r.data),
  getTrustedDoctors: () => api.get('/patient/trusted-doctors').then((r) => r.data),
  revokeDoctorAccess: (doctorId) => api.patch(`/patient/revoke-access/${doctorId}`).then((r) => r.data),
  // Health analytics
  getHealthAnalytics: () => api.get('/patient/health-analytics').then((r) => r.data),
  // Activity logs
  getActivityLogs: (page, limit) => api.get(`/patient/activity-logs?page=${page || 1}&limit=${limit || 20}`).then((r) => r.data),
  // Notifications
  getNotifications: (page, limit) => api.get(`/patient/notifications?page=${page || 1}&limit=${limit || 15}`).then((r) => r.data),
  getUnreadNotificationCount: () => api.get('/patient/notifications/unread-count').then((r) => r.data),
  markNotificationRead: (id) => api.patch(`/patient/notifications/${id}/read`).then((r) => r.data),
  markAllNotificationsRead: () => api.patch('/patient/notifications/mark-all-read').then((r) => r.data)
};

// Admin approval / verification service
export const adminService = {
  // Hospitals
  getAllHospitals: (status) => api.get(`/admin/hospitals${status ? `?status=${status}` : ''}`).then((r) => r.data),
  getPendingHospitals: () => api.get('/admin/pending/hospitals').then((r) => r.data),
  approveHospital: (id) => api.patch(`/admin/hospitals/${id}/approve`).then((r) => r.data),
  rejectHospital: (id) => api.patch(`/admin/hospitals/${id}/reject`).then((r) => r.data),
  suspendHospital: (id) => api.patch(`/admin/hospitals/${id}/suspend`).then((r) => r.data),
  reactivateHospital: (id) => api.patch(`/admin/hospitals/${id}/reactivate`).then((r) => r.data),
  // Doctors
  getAllDoctors: (status) => api.get(`/admin/doctors${status ? `?status=${status}` : ''}`).then((r) => r.data),
  getPendingDoctors: () => api.get('/admin/pending/doctors').then((r) => r.data),
  verifyDoctor: (id) => api.patch(`/admin/doctors/${id}/verify`).then((r) => r.data),
  suspendDoctor: (id) => api.patch(`/admin/doctors/${id}/suspend`).then((r) => r.data),
  reinstateDoctor: (id) => api.patch(`/admin/doctors/${id}/reinstate`).then((r) => r.data),
  // Nurses
  getAllNurses: (status) => api.get(`/admin/nurses${status ? `?status=${status}` : ''}`).then((r) => r.data),
  getPendingNurses: () => api.get('/admin/pending/nurses').then((r) => r.data),
  verifyNurse: (id) => api.patch(`/admin/nurses/${id}/verify`).then((r) => r.data),
  suspendNurse: (id) => api.patch(`/admin/nurses/${id}/suspend`).then((r) => r.data),
  reinstateNurse: (id) => api.patch(`/admin/nurses/${id}/reinstate`).then((r) => r.data)
};

// Doctor service — dashboard, patients, records, OTP/QR access, audit logs, nurse requests, assignments
export const doctorService = {
  getDashboard: () => api.get('/doctor/dashboard').then((r) => r.data),
  getMyPatients: () => api.get('/doctor/my-patients').then((r) => r.data),
  getPatientRecords: (patientId) => api.get(`/doctor/patient-records/${patientId}`).then((r) => r.data),
  verifyPatientOtp: (patientEmail, otp) => api.post('/doctor/patient-access/verify-otp', { patientEmail, otp }).then((r) => r.data),
  verifyQrToken: (qrToken) => api.post('/doctor/patient-access/verify-qr', { qrToken }).then((r) => r.data),
  getAuditLogs: (page, limit) => api.get(`/doctor/audit-logs?page=${page || 1}&limit=${limit || 20}`).then((r) => r.data),
  // Nurse access request management
  getNurseRequests: (status) => api.get(`/doctor/nurse-requests?status=${status || 'pending'}`).then((r) => r.data),
  getNurseRequestCount: () => api.get('/doctor/nurse-requests/count').then((r) => r.data),
  approveNurseRequest: (id) => api.patch(`/doctor/nurse-requests/${id}/approve`).then((r) => r.data),
  rejectNurseRequest: (id) => api.patch(`/doctor/nurse-requests/${id}/reject`).then((r) => r.data),
  // Assigned nurses
  getAssignedNurses: () => api.get('/doctor/assigned-nurses').then((r) => r.data),
  // Record assignments
  createAssignment: (formData) => api.post('/doctor/assign-record', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then((r) => r.data),
  getAssignments: (status) => api.get(`/doctor/record-assignments${status ? `?status=${status}` : ''}`).then((r) => r.data),
  getAssignment: (id) => api.get(`/doctor/record-assignments/${id}`).then((r) => r.data),
  cancelAssignment: (id) => api.patch(`/doctor/record-assignments/${id}/cancel`).then((r) => r.data)
};

// Nurse service — dashboard, assigned doctors, audit logs, assignments, test assignments
export const nurseService = {
  getDashboard: () => api.get('/nurse/dashboard').then((r) => r.data),
  getAssignedDoctors: () => api.get('/nurse/assigned-doctors').then((r) => r.data),
  getAuditLogs: (page, limit) => api.get(`/nurse/audit-logs?page=${page || 1}&limit=${limit || 20}`).then((r) => r.data),
  // Doctor record assignments
  getAssignments: (status) => api.get(`/nurse/assignments${status ? `?status=${status}` : ''}`).then((r) => r.data),
  getAssignment: (id) => api.get(`/nurse/assignments/${id}`).then((r) => r.data),
  startAssignment: (id) => api.patch(`/nurse/assignments/${id}/start`).then((r) => r.data),
  completeAssignment: (id, formData) => api.post(`/nurse/assignments/${id}/complete`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then((r) => r.data),
  // Hospital test assignments
  getTestAssignments: (status) => api.get(`/nurse/test-assignments${status ? `?status=${status}` : ''}`).then((r) => r.data),
  getTestAssignment: (id) => api.get(`/nurse/test-assignments/${id}`).then((r) => r.data),
  startTestAssignment: (id) => api.patch(`/nurse/test-assignments/${id}/start`).then((r) => r.data),
  completeTestAssignment: (id, formData) => api.post(`/nurse/test-assignments/${id}/complete`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then((r) => r.data)
};

export default api;
