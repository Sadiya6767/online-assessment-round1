import axios from 'axios';

const rawApiUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
const API_BASE_URL = rawApiUrl ? `${rawApiUrl}/api` : 'https://online-assessment-round1.onrender.com/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 90000,
});

// Request interceptor to automatically attach JWT for admin endpoints
api.interceptors.request.use(
  (config) => {
    const adminToken = localStorage.getItem('nexis_admin_token');
    if (adminToken && config.url.startsWith('/admin')) {
      config.headers.Authorization = `Bearer ${adminToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for session expiry handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401 && error.config.url.startsWith('/admin')) {
      localStorage.removeItem('nexis_admin_token');
      localStorage.removeItem('nexis_admin_user');
      if (window.location.pathname.startsWith('/admin') && window.location.pathname !== '/admin/login') {
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(error);
  }
);

export const candidateAPI = {
  register: (formData) => api.post('/candidate/register', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
};

export const assessmentAPI = {
  start: (assessmentId) => api.post(`/assessment/${assessmentId}/start`),
  getCurrentQuestion: (assessmentId) => api.get(`/assessment/${assessmentId}/current`),
  submitAnswer: (assessmentId, questionId, selectedOption) =>
    api.post(`/assessment/${assessmentId}/answer`, { questionId, selectedOption }),
  recordViolation: (assessmentId, data) => api.post(`/assessment/${assessmentId}/violation`, data),
  getStatus: (assessmentId) => api.get(`/assessment/${assessmentId}/status`),
};

export const adminAPI = {
  login: (email, password) => api.post('/admin/login', { email, password }),
  getStats: () => api.get('/admin/stats'),
  getCandidates: (params) => api.get('/admin/candidates', { params }),
  getCandidateDetails: (id) => api.get(`/admin/candidate/${id}`),
  getResumeUrl: (filename) => `${API_BASE_URL}/admin/resume/${encodeURIComponent(filename)}`,
  exportCSV: () => api.get('/admin/export-csv', { responseType: 'blob' }),
  deleteCandidate: (id) => api.delete(`/admin/candidate/${id}`),
  purgeExpired: () => api.post('/admin/purge-expired'),
};

export default api;
