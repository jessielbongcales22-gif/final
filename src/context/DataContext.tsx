import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Order, Product } from '../types';
import { seedOrders, seedProducts } from '../data/seed';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const USE_API = import.meta.env.VITE_USE_API === 'true';

const SEED_VERSION = 'v4';

// ── API helper ────────────────────────────────────────────────────────────────
async function api(path: string, method = 'GET', body?: object) {
  const token = localStorage.getItem('wm_token');
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.error || 'API error');
  }
  return res.json();
}

// ── localStorage helpers ──────────────────────────────────────────────────────
function initLocalProducts(): Product[] {
  try {
    if (localStorage.getItem('wm_seed_version') !== SEED_VERSION) {
      localStorage.setItem('wm_products', JSON.stringify(seedProducts));
      return seedProducts;
    }
    const s = localStorage.getItem('wm_products');
    return s ? JSON.parse(s) : seedProducts;
  } catch { return seedProducts; }
}

function initLocalOrders(): Order[] {
  try {
    if (localStorage.getItem('wm_seed_version') !== SEED_VERSION) {
      localStorage.setItem('wm_orders', JSON.stringify(seedOrders));
      return seedOrders;
    }
    const s = localStorage.getItem('wm_orders');
    return s ? JSON.parse(s) : seedOrders;
  } catch { return seedOrders; }
}

// ── Context types ─────────────────────────────────────────────────────────────
interface DataContextType {
  products: Product[];
  orders: Order[];
  usingApi: boolean;
  newOrderAlert: Order | null;
  clearNewOrderAlert: () => void;
  addProduct:    (p: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (id: string, p: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addOrder:      (o: Omit<Order, 'id' | 'updatedAt'>) => Promise<void>;
  updateOrder:   (id: string, o: Partial<Order>) => Promise<void>;
  deleteOrder:   (id: string) => Promise<void>;
  getOrdersByCustomer: (cId: string) => Order[];
  getLowStockProducts: () => Product[];
  getTotalSales:   () => number;
  getTodaySales:   () => number;
  getMonthlySales: () => number;
  getTodayOrders:  () => number;
  getPendingOrders:() => number;
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [products,      setProducts]      = useState<Product[]>([]);
  const [orders,        setOrders]        = useState<Order[]>([]);
  const [ready,         setReady]         = useState(false);
  const [usingApi,      setUsingApi]      = useState(false);
  const [newOrderAlert, setNewOrderAlert] = useState<Order | null>(null);

  // ── Load data ──────────────────────────────────────────────────────────────
  const loadFromApi = useCallback(async () => {
    const [p, o] = await Promise.all([api('/products'), api('/orders')]);
    setProducts(p);
    setOrders(o);
    setUsingApi(true);
  }, []);

  const loadFromLocal = useCallback(() => {
    const p = initLocalProducts();
    const o = initLocalOrders();
    setProducts(p);
    setOrders(o);
    if (localStorage.getItem('wm_seed_version') !== SEED_VERSION) {
      localStorage.setItem('wm_seed_version', SEED_VERSION);
      localStorage.removeItem('wm_seeded_v2');
      localStorage.removeItem('wm_seeded_version');
      localStorage.removeItem('wm_seed_version');
      // reset properly
      localStorage.setItem('wm_products', JSON.stringify(seedProducts));
      localStorage.setItem('wm_orders', JSON.stringify(seedOrders));
      localStorage.setItem('wm_seed_version', SEED_VERSION);
    }
    setUsingApi(false);
  }, []);

  useEffect(() => {
    const init = async () => {
      if (USE_API) {
        try {
          await loadFromApi();
        } catch {
          console.warn('⚠️  API not reachable — using localStorage');
          loadFromLocal();
        }
      } else {
        loadFromLocal();
      }
      setReady(true);
    };
    init();
  }, []);

  // ── Poll every 5s to stay in sync ─────────────────────────────────────────
  useEffect(() => {
    if (!ready) return;
    const interval = setInterval(async () => {
      if (usingApi) {
        try {
          const [p, o] = await Promise.all([api('/products'), api('/orders')]);
          setProducts(p);
          setOrders(prev => {
            const prevIds = new Set(prev.map(x => x.id));
            const fresh = o.filter((x: Order) => !prevIds.has(x.id) && x.orderType === 'delivery');
            if (fresh.length > 0) setNewOrderAlert(fresh[fresh.length - 1]);
            return o;
          });
        } catch { /* ignore polling errors */ }
      } else {
        // localStorage sync across tabs
        const sp = localStorage.getItem('wm_products');
        const so = localStorage.getItem('wm_orders');
        if (sp) setProducts(JSON.parse(sp));
        if (so) {
          const parsed: Order[] = JSON.parse(so);
          setOrders(prev => {
            const prevIds = new Set(prev.map(x => x.id));
            const fresh = parsed.filter(x => !prevIds.has(x.id) && x.orderType === 'delivery');
            if (fresh.length > 0) setNewOrderAlert(fresh[fresh.length - 1]);
            return parsed;
          });
        }
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [ready, usingApi]);

  // ── Save helpers ───────────────────────────────────────────────────────────
  const saveP = (p: Product[]) => { setProducts(p); localStorage.setItem('wm_products', JSON.stringify(p)); };
  const saveO = (o: Order[])   => { setOrders(o);   localStorage.setItem('wm_orders',   JSON.stringify(o)); };

  // ── Products CRUD ──────────────────────────────────────────────────────────
  const addProduct = async (p: Omit<Product, 'id'>) => {
    if (usingApi) { await api('/products', 'POST', p); const d = await api('/products'); setProducts(d); }
    else saveP([...products, { ...p, id: 'p' + Date.now() }]);
  };

  const updateProduct = async (id: string, p: Partial<Product>) => {
    if (usingApi) { const ex = products.find(x => x.id === id); await api(`/products/${id}`, 'PUT', { ...ex, ...p }); const d = await api('/products'); setProducts(d); }
    else saveP(products.map(x => x.id === id ? { ...x, ...p } : x));
  };

  const deleteProduct = async (id: string) => {
    if (usingApi) { await api(`/products/${id}`, 'DELETE'); const d = await api('/products'); setProducts(d); }
    else saveP(products.filter(x => x.id !== id));
  };

  // ── Orders CRUD ────────────────────────────────────────────────────────────
  const addOrder = async (o: Omit<Order, 'id' | 'updatedAt'>) => {
    if (usingApi) {
      await api('/orders', 'POST', o);
      const d = await api('/orders');
      setOrders(d);
    } else {
      const now = new Date().toISOString();
      const newO: Order = { ...o, id: 'o' + Date.now(), updatedAt: now };
      const updated = [...orders, newO];
      saveO(updated);
      // Deduct stock locally
      saveP(products.map(p => {
        const item = o.items.find(i => i.productId === p.id);
        return item ? { ...p, stock: Math.max(0, p.stock - item.quantity) } : p;
      }));
    }
  };

  const updateOrder = async (id: string, o: Partial<Order>) => {
    if (usingApi) {
      await api(`/orders/${id}`, 'PUT', o);
      const d = await api('/orders');
      setOrders(d);
    } else {
      saveO(orders.map(x => x.id === id ? { ...x, ...o, updatedAt: new Date().toISOString() } : x));
    }
  };

  const deleteOrder = async (id: string) => {
    if (usingApi) {
      await api(`/orders/${id}`, 'DELETE');
      const d = await api('/orders');
      setOrders(d);
    } else {
      saveO(orders.filter(x => x.id !== id));
    }
  };

  // ── Computed values ────────────────────────────────────────────────────────
  const getOrdersByCustomer = (cId: string) => orders.filter(o => o.customerId === cId);
  const getLowStockProducts  = ()            => products.filter(p => p.stock <= p.minStock);

  const getTotalSales   = () => orders.filter(o => o.status === 'completed' && o.paymentStatus === 'paid').reduce((s, o) => s + o.totalAmount, 0);
  const getTodaySales   = () => { const t = new Date().toDateString(); return orders.filter(o => o.status === 'completed' && new Date(o.createdAt).toDateString() === t).reduce((s, o) => s + o.totalAmount, 0); };
  const getMonthlySales = () => { const now = new Date(); return orders.filter(o => { const d = new Date(o.createdAt); return o.status === 'completed' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).reduce((s, o) => s + o.totalAmount, 0); };
  const getTodayOrders  = () => { const t = new Date().toDateString(); return orders.filter(o => new Date(o.createdAt).toDateString() === t).length; };
  const getPendingOrders= () => orders.filter(o => o.status === 'pending' || o.status === 'processing').length;

  if (!ready) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
        <p className="text-sm text-gray-500">Connecting to database...</p>
      </div>
    </div>
  );

  return (
    <DataContext.Provider value={{
      products, orders, usingApi,
      newOrderAlert, clearNewOrderAlert: () => setNewOrderAlert(null),
      addProduct, updateProduct, deleteProduct,
      addOrder, updateOrder, deleteOrder,
      getOrdersByCustomer, getLowStockProducts,
      getTotalSales, getTodaySales, getMonthlySales, getTodayOrders, getPendingOrders,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
