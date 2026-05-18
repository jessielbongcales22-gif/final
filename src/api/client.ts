// API Client for Water Market Backend
// Set API_URL in .env or use the default local server
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Check if we should use the API or localStorage demo mode
export const USE_API = import.meta.env.VITE_USE_API === 'true';

async function request(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('wm_token');

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (options.headers) {
    Object.assign(headers, options.headers);
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem('wm_token');
    localStorage.removeItem('wm_user');
    window.location.reload();
    return null;
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

// Auth
export const apiLogin = (email: string, password: string) =>
  request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });

export const apiRegister = (data: object) =>
  request('/auth/register', { method: 'POST', body: JSON.stringify(data) });

// Users
export const apiGetUsers = () => request('/users');
export const apiCreateUser = (data: object) =>
  request('/users', { method: 'POST', body: JSON.stringify(data) });
export const apiUpdateUserRole = (id: string, role: string) =>
  request(`/users/${id}/role`, { method: 'PUT', body: JSON.stringify({ role }) });
export const apiDeleteUser = (id: string) =>
  request(`/users/${id}`, { method: 'DELETE' });

// Products
export const apiGetProducts = () => request('/products');
export const apiCreateProduct = (data: object) =>
  request('/products', { method: 'POST', body: JSON.stringify(data) });
export const apiUpdateProduct = (id: string, data: object) =>
  request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const apiDeleteProduct = (id: string) =>
  request(`/products/${id}`, { method: 'DELETE' });

// Orders
export const apiGetOrders = () => request('/orders');
export const apiCreateOrder = (data: object) =>
  request('/orders', { method: 'POST', body: JSON.stringify(data) });
export const apiUpdateOrder = (id: string, data: object) =>
  request(`/orders/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const apiDeleteOrder = (id: string) =>
  request(`/orders/${id}`, { method: 'DELETE' });

// Reports
export const apiGetReportSummary = () => request('/reports/summary');
