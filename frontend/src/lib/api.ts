import axios from 'axios';
import Cookies from 'js-cookie';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = Cookies.get('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = Cookies.get('refreshToken');
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_BASE}/api/auth/refresh`, { refreshToken });
          Cookies.set('accessToken', data.accessToken, { expires: 7 });
          Cookies.set('refreshToken', data.refreshToken, { expires: 30 });
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(originalRequest);
        } catch {
          Cookies.remove('accessToken');
          Cookies.remove('refreshToken');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// ==================== AUTH ====================
export const authApi = {
  patientGoogleLogin: (token: string) => api.post('/api/auth/patient/google', { token }),
  patientRequestOtp: (data: { email?: string; phone?: string }) => api.post('/api/auth/patient/otp/request', data),
  patientVerifyOtp: (data: { email?: string; phone?: string; otp: string }) => api.post('/api/auth/patient/otp/verify', data),
  doctorRegister: (data: any) => api.post('/api/auth/doctor/register', data),
  doctorLogin: (data: { email: string; password: string }) => api.post('/api/auth/doctor/login', data),
  adminLogin: (data: { email: string; password: string; mfaCode?: string }) => api.post('/api/auth/admin/login', data),
  getProfile: () => api.get('/api/auth/profile'),
};

// Public — no auth required (used by doctor register and patient new-case)
export const specialitiesApi = {
  listPublic: () => api.get('/api/specialities'),
};

// ==================== CASES ====================
export const casesApi = {
  create: (data: any) => api.post('/api/cases', data),
  getMyCases: (status?: string) => api.get('/api/cases/my', { params: { status } }),
  getById: (id: string) => api.get(`/api/cases/${id}`),
  update: (id: string, data: any) => api.put(`/api/cases/${id}`, data),
  submit: (id: string) => api.post(`/api/cases/${id}/submit`),
  uploadDocuments: (caseId: string, files: File[]) => {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    return api.post(`/api/cases/${caseId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  updateDocLabel: (caseId: string, docId: string, label: string) =>
    api.put(`/api/cases/${caseId}/documents/${docId}/label`, { label }),
  deleteDocument: (caseId: string, docId: string) =>
    api.delete(`/api/cases/${caseId}/documents/${docId}`),
  // Doctor endpoints
  getDoctorQueue: (specialityId?: number) =>
    api.get('/api/cases/doctor/queue', { params: { specialityId } }),
  acceptCase: (id: string) => api.post(`/api/cases/${id}/accept`),
  getDoctorCases: (status?: string) =>
    api.get('/api/cases/doctor/assigned', { params: { status } }),
  // Admin
  getAllCases: (page?: number, limit?: number, status?: string) =>
    api.get('/api/cases/admin/all', { params: { page, limit, status } }),
  reassignCase: (id: string, doctorId: string) =>
    api.post(`/api/cases/admin/${id}/reassign`, { doctorId }),
};

// ==================== DOCTORS ====================
export const doctorsApi = {
  getPublicList: (specialityId?: number, language?: string) =>
    api.get('/api/doctors/public', { params: { specialityId, language } }),
  getPublicSlots: (doctorId: string, date: string) =>
    api.get(`/api/doctors/public/${doctorId}/slots`, { params: { date } }),
  getProfile: () => api.get('/api/doctors/profile'),
  updateProfile: (data: any) => api.put('/api/doctors/profile', data),
  setAvailability: (slots: any[]) => api.put('/api/doctors/availability', { slots }),
  getAvailability: () => api.get('/api/doctors/availability'),
  submitReport: (caseId: string, data: any) => api.post(`/api/doctors/cases/${caseId}/report`, data),
  getEarnings: () => api.get('/api/doctors/earnings'),
  // Admin
  getPending: () => api.get('/api/doctors/admin/pending'),
  approve: (id: string) => api.post(`/api/doctors/admin/${id}/approve`),
  reject: (id: string, reason: string) => api.post(`/api/doctors/admin/${id}/reject`, { reason }),
  suspend: (id: string, reason: string) => api.post(`/api/doctors/admin/${id}/suspend`, { reason }),
};

// ==================== AI ====================
export const aiApi = {
  getReport: (caseId: string) => api.get(`/api/ai/report/${caseId}`),
  triggerProcessing: (caseId: string) => api.post(`/api/ai/process/${caseId}`),
  // Doctor-initiated internal AI draft for an assigned case
  generateForDoctor: (caseId: string) => api.post(`/api/ai/cases/${caseId}/generate`),
};

// ==================== APPOINTMENTS ====================
export const appointmentsApi = {
  create: (data: any) => api.post('/api/appointments', data),
  getPatientAppointments: () => api.get('/api/appointments/patient'),
  getDoctorAppointments: (upcoming?: boolean) =>
    api.get('/api/appointments/doctor', { params: { upcoming } }),
  start: (id: string) => api.post(`/api/appointments/${id}/start`),
  complete: (id: string, notes?: string) => api.post(`/api/appointments/${id}/complete`, { notes }),
  cancel: (id: string, reason?: string) => api.post(`/api/appointments/${id}/cancel`, { reason }),
};

// ==================== PAYMENTS ====================
export const paymentsApi = {
  createOrder: (appointmentId: string) => api.post('/api/payments/create-order', { appointmentId }),
  confirm: (id: string, gatewayPaymentId: string) =>
    api.post(`/api/payments/${id}/confirm`, { gatewayPaymentId }),
  getMyPayments: () => api.get('/api/payments/my'),
  getRevenue: () => api.get('/api/payments/admin/revenue'),
};

// ==================== PRESCRIPTIONS ====================
export const prescriptionsApi = {
  create: (data: any) => api.post('/api/prescriptions', data),
  getByCaseId: (caseId: string) => api.get(`/api/prescriptions/case/${caseId}`),
  getMyPrescriptions: () => api.get('/api/prescriptions/patient'),
  getById: (id: string) => api.get(`/api/prescriptions/${id}`),
  downloadPdf: (id: string) => api.get(`/api/prescriptions/${id}/pdf`, { responseType: 'blob' }),
};

// ==================== REVIEWS ====================
export const reviewsApi = {
  create: (appointmentId: string, data: { rating: number; reviewText?: string }) =>
    api.post(`/api/reviews/appointments/${appointmentId}`, data),
  getMyReview: (appointmentId: string) =>
    api.get(`/api/reviews/appointments/${appointmentId}/my`),
  getDoctorReviews: (doctorId: string, page?: number) =>
    api.get(`/api/reviews/doctors/${doctorId}`, { params: { page } }),
};

// ==================== SERVICE CATALOG ====================
export const servicesApi = {
  // Patient (authenticated) — catalog browse
  listEnabled: () => api.get('/api/services'),
  getBySlug: (slug: string) => api.get(`/api/services/slug/${slug}`),

  // Admin
  adminList: () => api.get('/api/services/admin/all'),
  adminGet: (id: string) => api.get(`/api/services/admin/${id}`),
  adminCreate: (data: any) => api.post('/api/services/admin', data),
  adminUpdate: (id: string, data: any) => api.put(`/api/services/admin/${id}`, data),
  adminToggle: (id: string, isEnabled: boolean) =>
    api.post(`/api/services/admin/${id}/toggle`, { isEnabled }),
  adminDelete: (id: string) => api.delete(`/api/services/admin/${id}`),
};

export const serviceRequestsApi = {
  create: (data: { serviceId: string; intakePayload: unknown; notes?: string }) =>
    api.post('/api/service-requests', data),
  getMine: () => api.get('/api/service-requests/my'),
  getById: (id: string) => api.get(`/api/service-requests/${id}`),
};

// ==================== ADMIN ====================
export const adminApi = {
  getDashboard: (from?: string, to?: string) =>
    api.get('/api/admin/dashboard', { params: { from, to } }),
  getSpecialities: () => api.get('/api/admin/specialities'),
  getPatients: (page?: number, limit?: number, search?: string) =>
    api.get('/api/admin/patients', { params: { page, limit, search } }),
  getDoctors: (page?: number, limit?: number, status?: string) =>
    api.get('/api/admin/doctors', { params: { page, limit, status } }),
  togglePatient: (id: string, isActive: boolean) =>
    api.post(`/api/admin/patients/${id}/toggle`, { isActive }),
};

// ==================== MAGIC DIET ====================
export const dietApi = {
  // Foods
  searchFoods: (q?: string, category?: string, veg?: string) =>
    api.get('/api/diet/foods', { params: { q, category, veg } }),
  getFoodById: (id: string) => api.get(`/api/diet/foods/${id}`),

  // Recipes
  searchRecipes: (slot?: string, cuisine?: string) =>
    api.get('/api/diet/recipes', { params: { slot, cuisine } }),

  // Generate (patient self-service; backend forces patientId = req.user.sub for patient role)
  generate: (data: {
    patientId?: string;
    heightCm?: number;
    weightKg?: number;
    targetWeightKg?: number;
    age?: number;
    gender?: string;
    activityLevel?: string;
    dietType?: string;
    fastingWindow?: string;
    cuisineRegion?: string;
    budgetTier?: string;
    cookingTimeTier?: string;
    allergens?: string[];
    foodDislikes?: string[];
    diseaseTags?: string[];
    biomarkers?: { marker: string; value: number; unit: string; measuredAt?: string }[];
    medications?: string[];
    pregnancyStatus?: string;
    ayurvedicPrakriti?: string;
    persist?: boolean;
  }) => api.post('/api/diet/generate', data),

  // Swap
  swap: (data: {
    fromFoodId: string;
    slot?: string;
    allergens?: string[];
    dislikes?: string[];
    diseases?: string[];
    dietType?: string;
  }) => api.post('/api/diet/swap', data),

  // Charts
  saveChart: (data: any) => api.post('/api/diet/charts', data),
  updateChart: (id: string, data: any) => api.patch(`/api/diet/charts/${id}`, data),
  getCharts: (patientId?: string, page?: number, limit?: number) =>
    api.get('/api/diet/charts', { params: { patientId, page, limit } }),
  getChartById: (id: string) => api.get(`/api/diet/charts/${id}`),
  deleteChart: (id: string) => api.delete(`/api/diet/charts/${id}`),

  // Biomarkers
  createBiomarker: (data: {
    patientId: string;
    visitId?: string;
    marker: string;
    value: number;
    unit: string;
    measuredAt: string;
  }) => api.post('/api/diet/biomarkers', data),
  getBiomarkers: (patientId?: string) =>
    api.get('/api/diet/biomarkers', { params: { patientId } }),
  getLatestBiomarkers: (patientId?: string) =>
    api.get('/api/diet/biomarkers/latest', { params: { patientId } }),

  // Patient diet profile
  updatePatientDietProfile: (patientId: string, data: any) =>
    api.put(`/api/diet/patient-profile/${patientId}`, data),
};

export default api;
