const API_URL = import.meta.env.VITE_API_URL;

async function request(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('wm_token');
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (options.headers) Object.assign(headers, options.headers);
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const apiLogin = (email: string, password: string) =>
  request('/login', { method: 'POST', body: JSON.stringify({ username: email, password }) });

export const apiRegister = (data: object) =>
  request('/register', { method: 'POST', body: JSON.stringify(data) });
