import axios from 'axios';
const api = axios.create({baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'});
api.interceptors.request.use(config => { const token=sessionStorage.getItem('access'); if(token) config.headers.Authorization=`Bearer ${token}`; return config; });
let refreshRequest;
api.interceptors.response.use(response => response, async error => {
  const request = error.config;
  if (error.response?.status !== 401 || !request || request._retried || request.url?.includes('/auth/refresh/')) throw error;
  const refresh = sessionStorage.getItem('refresh');
  if (!refresh) throw error;
  request._retried = true;
  try {
    refreshRequest ||= axios.post(`${api.defaults.baseURL}/auth/refresh/`, { refresh });
    const { data } = await refreshRequest;
    sessionStorage.setItem('access', data.access);
    request.headers.Authorization = `Bearer ${data.access}`;
    return api(request);
  } catch (refreshError) {
    sessionStorage.removeItem('access');
    sessionStorage.removeItem('refresh');
    sessionStorage.removeItem('user');
    const refreshDetail = String(refreshError.response?.data?.detail || '').toLowerCase();
    window.dispatchEvent(new CustomEvent('shopsphere:session-expired', {
      detail: { blocked: refreshDetail.includes('no active account') || refreshDetail.includes('inactive') },
    }));
    throw refreshError;
  } finally { refreshRequest = undefined; }
});
export default api;
