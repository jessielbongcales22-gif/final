// src/api/client.ts

// Set API_URL from environment variables, fallback to deployed backend
const API_URL = import.meta.env.VITE_API_URL || 'https://your-backend-domain.com/api';

// Generic request helper
async function request(endpoint: string, options: RequestInit = {}) {
  // Add JSON headers
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (options.headers) Object.assign(headers, options.headers);

  // Send request
  const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });

  // Handle unauthorized
  if (response.status === 401) {
    localStorage.removeItem('wm_token');
    localStorage.removeItem('wm_user');
    window.location.href = '/login'; // redirect to login
    return null;
  }

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// -------- Auth --------
export const apiLogin = async (email: string, password: string) =>
  request('/login', {
    method: 'POST',
    body: JSON.stringify({ username: email, password }),
  });

export const apiRegister = async (userData: {
  name: string;
  email: string;
  password: string;
  barangay: string;
  role?: string;
}) =>
  request('/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  });

// -------- Users --------
export const apiGetUsers = () => request('/users');
export const apiCreateUser = (data: object) =>
  request('/users', { method: 'POST', body: JSON.stringify(data) });
export const apiUpdateUserRole = (id: string, role: string) =>
  request(`/users/${id}/role`, { method: 'PUT', body: JSON.stringify({ role }) });
export const apiDeleteUser = (id: string) => request(`/users/${id}`, { method: 'DELETE' });

// -------- Products --------
export const apiGetProducts = () => request('/products');
export const apiCreateProduct = (data: object) =>
  request('/products', { method: 'POST', body: JSON.stringify(data) });
export const apiUpdateProduct = (id: string, data: object) =>
  request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const apiDeleteProduct = (id: string) => request(`/products/${id}`, { method: 'DELETE' });

// -------- Orders / Walk-in --------
export const apiGetOrders = () => request('/orders');
export const apiAddWalkInOrder = (order: object) =>
  request('/orders', { method: 'POST', body: JSON.stringify(order) });
export const apiUpdateOrderStatus = (id: string, statusData: object) =>
  request(`/orders/${id}`, { method: 'PUT', body: JSON.stringify(statusData) });

// -------- Customers --------
export const apiGetCustomers = () => request('/customers');
export const apiCreateCustomer = (data: object) =>
  request('/customers', { method: 'POST', body: JSON.stringify(data) });
export const apiUpdateCustomer = (id: string, data: object) =>
  request(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const apiDeleteCustomer = (id: string) =>
  request(`/customers/${id}`, { method: 'DELETE' });
