export type UserRole = 'admin' | 'staff' | 'customer';

export interface User {
  id: string;
  username: string;
  email: string;
  password: string;
  role: UserRole;
  phone: string;
  address: string;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  type: 'water' | 'container';
  price: number;
  stock: number;
  unit: string;
  description: string;
  minStock: number;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export type OrderStatus = 'pending' | 'processing' | 'out-for-delivery' | 'completed' | 'cancelled';
export type PaymentMethod = 'cash' | 'gcash';
export type PaymentStatus = 'pending' | 'paid';
export type OrderType = 'delivery' | 'walk-in';

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  deliveryAddress: string;
  notes: string;
  orderType: OrderType;
  createdAt: string;
  updatedAt: string;
}

export interface SalesReport {
  date: string;
  totalSales: number;
  totalOrders: number;
  cashSales: number;
  gcashSales: number;
}
