import { User, Product, Order } from '../types';

export const seedUsers: User[] = [
  {
    id: 'u1',
    username: 'admin',
    email: 'admin@watermarket.com',
    password: 'admin123',
    role: 'admin',
    phone: '09171234567',
    address: '123 Main St, Barangay 1',
    createdAt: '2024-01-01T08:00:00Z',
  },
  {
    id: 'u2',
    username: 'staff1',
    email: 'staff1@watermarket.com',
    password: 'staff123',
    role: 'staff',
    phone: '09181234567',
    address: '456 Second St, Barangay 2',
    createdAt: '2024-01-15T08:00:00Z',
  },
  {
    id: 'u3',
    username: 'juan_delacruz',
    email: 'juan@email.com',
    password: 'customer123',
    role: 'customer',
    phone: '09191234567',
    address: '789 Third St, Barangay 3',
    createdAt: '2024-02-01T08:00:00Z',
  },
  {
    id: 'u4',
    username: 'maria_santos',
    email: 'maria@email.com',
    password: 'customer123',
    role: 'customer',
    phone: '09201234567',
    address: '321 Fourth St, Barangay 4',
    createdAt: '2024-02-15T08:00:00Z',
  },
  {
    id: 'u5',
    username: 'pedro_reyes',
    email: 'pedro@email.com',
    password: 'customer123',
    role: 'customer',
    phone: '09211234567',
    address: '654 Fifth St, Barangay 5',
    createdAt: '2024-03-01T08:00:00Z',
  },
];

export const seedProducts: Product[] = [
  {
    id: 'p1',
    name: 'Purified Water',
    type: 'water',
    price: 30,
    stock: 500,
    unit: 'container',
    description: 'Refill of purified water',
    minStock: 50,
  },
];

const now = new Date();
const d = (daysAgo: number, hours = 8) => {
  const date = new Date(now);
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hours, 0, 0, 0);
  return date.toISOString();
};

export const seedOrders: Order[] = [
  {
    id: 'o1', customerId: 'u3', customerName: 'juan_delacruz',
    items: [{ productId: 'p1', productName: 'Purified Water', quantity: 3, price: 30, subtotal: 90 }],
    totalAmount: 90, status: 'completed', paymentMethod: 'cash', paymentStatus: 'paid',
    orderType: 'delivery',
    deliveryAddress: '789 Third St, Barangay 3', notes: '', createdAt: d(7), updatedAt: d(7, 10),
  },
  {
    id: 'o2', customerId: 'u4', customerName: 'maria_santos',
    items: [{ productId: 'p1', productName: 'Purified Water', quantity: 5, price: 30, subtotal: 150 }],
    totalAmount: 150, status: 'completed', paymentMethod: 'gcash', paymentStatus: 'paid',
    orderType: 'delivery',
    deliveryAddress: '321 Fourth St, Barangay 4', notes: 'Deliver in the morning', createdAt: d(5), updatedAt: d(5, 11),
  },
  {
    id: 'o3', customerId: 'walk-in', customerName: 'Walk-in Customer',
    items: [{ productId: 'p1', productName: 'Purified Water', quantity: 4, price: 30, subtotal: 120 }],
    totalAmount: 120, status: 'completed', paymentMethod: 'cash', paymentStatus: 'paid',
    orderType: 'walk-in',
    deliveryAddress: 'Store', notes: '', createdAt: d(4), updatedAt: d(4, 14),
  },
  {
    id: 'o4', customerId: 'u5', customerName: 'pedro_reyes',
    items: [{ productId: 'p1', productName: 'Purified Water', quantity: 2, price: 30, subtotal: 60 }],
    totalAmount: 60, status: 'out-for-delivery', paymentMethod: 'cash', paymentStatus: 'pending',
    orderType: 'delivery',
    deliveryAddress: '654 Fifth St, Barangay 5', notes: 'Call before delivery', createdAt: d(1, 9), updatedAt: d(1, 10),
  },
  {
    id: 'o5', customerId: 'walk-in', customerName: 'Walk-in Customer',
    items: [{ productId: 'p1', productName: 'Purified Water', quantity: 6, price: 30, subtotal: 180 }],
    totalAmount: 180, status: 'completed', paymentMethod: 'cash', paymentStatus: 'paid',
    orderType: 'walk-in',
    deliveryAddress: 'Store', notes: '', createdAt: d(0, 7), updatedAt: d(0, 8),
  },
  {
    id: 'o6', customerId: 'u5', customerName: 'pedro_reyes',
    items: [{ productId: 'p1', productName: 'Purified Water', quantity: 10, price: 30, subtotal: 300 }],
    totalAmount: 300, status: 'pending', paymentMethod: 'cash', paymentStatus: 'pending',
    orderType: 'delivery',
    deliveryAddress: '654 Fifth St, Barangay 5', notes: 'Urgent order', createdAt: d(0, 10), updatedAt: d(0, 10),
  },
];
