// src/api/client.ts

const API_URL = import.meta.env.VITE_API_URL || "https://your-backend-domain.com/api";

async function request(endpoint: string, options: RequestInit = {}) {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (options.headers) Object.assign(headers, options.headers);

  const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  const data = await response.json();

  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
}

// ---------- Auth ----------
export const apiLogin = (email: string, password: string) =>
  request("/login", { method: "POST", body: JSON.stringify({ username: email, password }) });

export const apiRegister = (data: object) =>
  request("/register", { method: "POST", body: JSON.stringify(data) });

// ---------- Users ----------
export const apiGetUsers = () => request("/users");
export const apiCreateUser = (data: object) =>
  request("/users", { method: "POST", body: JSON.stringify(data) });
export const apiUpdateUserRole = (id: number, role: string) =>
  request(`/users/${id}/role`, { method: "PUT", body: JSON.stringify({ role }) });
export const apiDeleteUser = (id: number) => request(`/users/${id}`, { method: "DELETE" });

// ---------- Products ----------
export const apiGetProducts = () => request("/products");
export const apiCreateProduct = (data: object) =>
  request("/products", { method: "POST", body: JSON.stringify(data) });
export const apiUpdateProduct = (id: number, data: object) =>
  request(`/products/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const apiDeleteProduct = (id: number) => request(`/products/${id}`, { method: "DELETE" });

// ---------- Orders ----------
export const apiGetOrders = () => request("/orders");
export const apiAddWalkInOrder = (order: object) =>
  request("/orders", { method: "POST", body: JSON.stringify(order) });
export const apiUpdateOrderStatus = (id: number, statusData: object) =>
  request(`/orders/${id}`, { method: "PUT", body: JSON.stringify(statusData) });
