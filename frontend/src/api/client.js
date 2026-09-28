import axios from 'axios'

// Base URL points to the FastAPI backend (to be built next).
// Set VITE_API_URL in a .env file when deploying.
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

const client = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' }
})

// Attach JWT token to every request if present
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('gehu_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Auto-logout on 401 (expired/invalid token). A 401 from the login/verify
// endpoints themselves just means "wrong credentials" and must not bounce the
// user around, so only sign out when a token was actually in use.
client.interceptors.response.use(
  (response) => response,
  (error) => {
    const hadToken = !!localStorage.getItem('gehu_token')
    const detail = error.response?.data?.detail
    const deactivated = error.response?.status === 403 && detail === 'This account has been deactivated'
    if (hadToken && (error.response?.status === 401 || deactivated)) {
      localStorage.removeItem('gehu_token')
      localStorage.removeItem('gehu_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default client

// ---- API endpoint helpers ----
// These map 1:1 to the FastAPI routes we'll build in the backend phase.

export const authAPI = {
  login: (data) => client.post('/auth/login', data),
  register: (data) => client.post('/auth/register', data),
  me: () => client.get('/auth/me'),
  verifyEmail: (data) => client.post('/auth/verify-email', data),
  resendOtp: (email) => client.post('/auth/resend-otp', { email }),
  forgotPassword: (email) => client.post('/auth/forgot-password', { email }),
  resetPassword: (data) => client.post('/auth/reset-password', data)
}

export const staffAPI = {
  list: () => client.get('/staff'),
  create: (data) => client.post('/auth/create-staff', data),
  update: (id, data) => client.patch(`/staff/${id}`, data),
  resetPassword: (id, new_password) => client.post(`/staff/${id}/reset-password`, { new_password })
}

export const complaintsAPI = {
  create: (formData) =>
    client.post('/complaints', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  listMine: () => client.get('/complaints/mine'),
  listAssigned: (params) => client.get('/complaints/assigned', { params }),
  listAll: (params) => client.get('/complaints', { params }),
  getOne: (id) => client.get(`/complaints/${id}`),
  updateStatus: (id, data) => client.patch(`/complaints/${id}/status`, data),
  addComment: (id, data) => client.post(`/complaints/${id}/comments`, data),
  search: (params) => client.get('/complaints/search', { params }),
  leaveFeedback: (id, data) => client.post(`/complaints/${id}/feedback`, data),
  reopen: (id, reason) => client.post(`/complaints/${id}/reopen`, { reason }),
  assign: (id, warden_id) => client.patch(`/complaints/${id}/assign`, { warden_id })
}

export const analyticsAPI = {
  overview: () => client.get('/analytics/overview'),
  categoryBreakdown: () => client.get('/analytics/categories'),
  trend: (days = 14) => client.get('/analytics/trend', { params: { days } }),
  resolutionTime: () => client.get('/analytics/resolution-time')
}

export const notificationsAPI = {
  list: () => client.get('/notifications'),
  unreadCount: () => client.get('/notifications/unread-count'),
  markRead: (id) => client.post(`/notifications/${id}/read`),
  markAllRead: () => client.post('/notifications/read-all'),
  vapidPublicKey: () => client.get('/notifications/push/vapid-public-key'),
  pushSubscribe: (subscription) => client.post('/notifications/push/subscribe', subscription),
  pushUnsubscribe: (endpoint) => client.post('/notifications/push/unsubscribe', { endpoint })
}

export const presenceAPI = {
  heartbeat: () => client.post('/presence/heartbeat'),
  staffOnline: () => client.get('/presence/staff-online')
}
