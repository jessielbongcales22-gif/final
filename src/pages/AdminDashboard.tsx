import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import {
  TrendingUp, Calendar, ShoppingCart,
  Package, AlertTriangle, Users, BarChart3, ArrowUpRight,
  ArrowDownRight, UserPlus, FileText, Droplets
} from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

export default function AdminDashboard() {
  const { user } = useAuth();
  const { orders, products, getTotalSales, getTodaySales, getMonthlySales, getTodayOrders, getPendingOrders, getLowStockProducts } = useData();

  const todaySales = getTodaySales();
  const monthlySales = getMonthlySales();
  const totalSales = getTotalSales();
  const todayOrders = getTodayOrders();
  const pendingOrders = getPendingOrders();
  const lowStock = getLowStockProducts();

  const users: { id: string; username: string; email: string; role: string }[] = (() => {
    try { return JSON.parse(localStorage.getItem('wm_users') || '[]'); } catch { return []; }
  })();

  const recentOrders = [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 6);
  const completedOrders = orders.filter(o => o.status === 'completed');

  // Revenue trend (last 7 days)
  const revenueTrend = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    const daySales = completedOrders.filter(o => o.createdAt.startsWith(dateStr)).reduce((s, o) => s + o.totalAmount, 0);
    return { date: d.toLocaleDateString('en-US', { weekday: 'short' }), revenue: daySales };
  });

  // Payment breakdown
  const paymentData = [
    { name: 'Cash', value: completedOrders.filter(o => o.paymentMethod === 'cash').reduce((s, o) => s + o.totalAmount, 0), color: '#10B981' },
    { name: 'GCash', value: completedOrders.filter(o => o.paymentMethod === 'gcash').reduce((s, o) => s + o.totalAmount, 0), color: '#3B82F6' },
  ].filter(p => p.value > 0);

  // Product performance
  const productPerf = products.map(p => {
    const sold = completedOrders.reduce((sum, o) => {
      const item = o.items.find(i => i.productId === p.id);
      return sum + (item ? item.quantity : 0);
    }, 0);
    return { name: p.name, sold, revenue: sold * p.price };
  }).filter(p => p.sold > 0).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  const statusBadge = (status: string) => {
    const s: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      processing: 'bg-blue-100 text-blue-700',
      'out-for-delivery': 'bg-purple-100 text-purple-700',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
    };
    return s[status] || 'bg-gray-100 text-gray-700';
  };

  const yesterdaySales = (() => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const ys = y.toISOString().split('T')[0];
    return completedOrders.filter(o => o.createdAt.startsWith(ys)).reduce((s, o) => s + o.totalAmount, 0);
  })();

  const salesChange = yesterdaySales > 0 ? ((todaySales - yesterdaySales) / yesterdaySales * 100).toFixed(0) : '0';

  // Walk-in vs Delivery breakdown
  const walkInOrders = completedOrders.filter(o => o.orderType === 'walk-in');
  const deliveryOrders = completedOrders.filter(o => o.orderType === 'delivery');
  const walkInRevenue = walkInOrders.reduce((s, o) => s + o.totalAmount, 0);
  const deliveryRevenue = deliveryOrders.reduce((s, o) => s + o.totalAmount, 0);
  const todayWalkIn = orders.filter(o => {
    const today = new Date().toDateString();
    return o.orderType === 'walk-in' && new Date(o.createdAt).toDateString() === today;
  }).length;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-cyan-700 rounded-2xl p-6 lg:p-8 text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 opacity-10">
          <Droplets className="w-full h-full" />
        </div>
        <div className="relative z-10">
          <h1 className="text-2xl lg:text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-blue-200 mt-1">Welcome back, {user?.username}. Here's your business overview.</p>
          <p className="text-blue-300 text-sm mt-2">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="w-11 h-11 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-green-200">
              <span className="text-white font-bold text-lg">₱</span>
            </div>
            <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${Number(salesChange) >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
              {Number(salesChange) >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {salesChange}%
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-800">₱{todaySales.toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-0.5">Today's Revenue</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="w-11 h-11 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
              <Calendar className="w-5 h-5 text-white" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-800">₱{monthlySales.toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-0.5">Monthly Revenue</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="w-11 h-11 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-200">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded-full">{todayOrders} today</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">{pendingOrders}</p>
          <p className="text-sm text-gray-500 mt-0.5">Pending Orders</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="w-11 h-11 bg-gradient-to-br from-orange-400 to-red-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-200">
              <Users className="w-5 h-5 text-white" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-800">{users.length}</p>
          <p className="text-sm text-gray-500 mt-0.5">Total Users</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="w-11 h-11 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-teal-200">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs font-medium text-teal-600 bg-teal-50 px-2 py-1 rounded-full">{todayWalkIn} today</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">{walkInOrders.length}</p>
          <p className="text-sm text-gray-500 mt-0.5">Walk-in Sales</p>
        </div>
      </div>

      {/* Walk-in vs Delivery Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <UserPlus className="w-6 h-6 text-teal-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600">Walk-in Sales</p>
            <p className="text-xl font-bold text-gray-800">₱{walkInRevenue.toLocaleString()}</p>
            <p className="text-xs text-gray-400">{walkInOrders.length} transactions</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-teal-600">
              {completedOrders.length > 0 ? Math.round((walkInOrders.length / completedOrders.length) * 100) : 0}%
            </div>
            <p className="text-xs text-gray-400">of total</p>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <ShoppingCart className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600">Delivery Orders</p>
            <p className="text-xl font-bold text-gray-800">₱{deliveryRevenue.toLocaleString()}</p>
            <p className="text-xs text-gray-400">{deliveryOrders.length} transactions</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">
              {completedOrders.length > 0 ? Math.round((deliveryOrders.length / completedOrders.length) * 100) : 0}%
            </div>
            <p className="text-xs text-gray-400">of total</p>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-gray-800">Revenue Trend</h3>
              <p className="text-xs text-gray-500">Last 7 days performance</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-blue-600">₱{revenueTrend.reduce((s, d) => s + d.revenue, 0).toLocaleString()}</p>
              <p className="text-xs text-gray-500">Total this week</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={revenueTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₱${v}`} />
              <Tooltip formatter={(value) => [`₱${value}`, 'Revenue']} />
              <Line type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={3} dot={{ fill: '#3B82F6', r: 5, strokeWidth: 0 }} activeDot={{ r: 7 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Payment Methods */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-1">Payment Methods</h3>
          <p className="text-xs text-gray-500 mb-4">Revenue distribution</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={paymentData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                {paymentData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`₱${Number(value).toLocaleString()}`, 'Revenue']} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {paymentData.map(p => (
              <div key={p.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                  <span className="text-gray-600">{p.name}</span>
                </div>
                <span className="font-medium text-gray-800">₱{p.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-800">Recent Orders</h3>
              <p className="text-xs text-gray-500">Latest transactions</p>
            </div>
            <span className="text-xs text-gray-400">{orders.length} total</span>
          </div>
          <div className="divide-y divide-gray-50">
            {recentOrders.map(order => (
              <div key={order.id} className="p-4 flex items-center gap-4 hover:bg-gray-50/50 transition-colors">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <ShoppingCart className="w-5 h-5 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{order.customerName}</p>
                  <p className="text-xs text-gray-500">{order.items.map(i => i.productName).join(', ').slice(0, 40)}{order.items.map(i => i.productName).join(', ').length > 40 ? '...' : ''}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-gray-800">₱{order.totalAmount}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusBadge(order.status)}`}>
                    {order.status.replace(/-/g, ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-blue-50 rounded-xl text-center hover:bg-blue-100 transition-colors cursor-pointer">
                <FileText className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                <p className="text-xs font-medium text-blue-700">Reports</p>
              </div>
              <div className="p-3 bg-green-50 rounded-xl text-center hover:bg-green-100 transition-colors cursor-pointer">
                <UserPlus className="w-5 h-5 text-green-600 mx-auto mb-1" />
                <p className="text-xs font-medium text-green-700">Add User</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-xl text-center hover:bg-purple-100 transition-colors cursor-pointer">
                <Package className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                <p className="text-xs font-medium text-purple-700">Inventory</p>
              </div>
              <div className="p-3 bg-orange-50 rounded-xl text-center hover:bg-orange-100 transition-colors cursor-pointer">
                <BarChart3 className="w-5 h-5 text-orange-600 mx-auto mb-1" />
                <p className="text-xs font-medium text-orange-700">Analytics</p>
              </div>
            </div>
          </div>

          {/* Low Stock Alerts */}
          {lowStock.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="p-5 border-b border-gray-100 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                <h3 className="font-semibold text-gray-800 text-sm">Low Stock Alerts</h3>
                <span className="ml-auto text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">{lowStock.length}</span>
              </div>
              <div className="divide-y divide-gray-50">
                {lowStock.slice(0, 4).map(p => (
                  <div key={p.id} className="p-3 flex items-center justify-between">
                    <p className="text-sm text-gray-700 truncate">{p.name}</p>
                    <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-lg">{p.stock} left</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Products */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800 text-sm">Top Products</h3>
            </div>
            <div className="p-4 space-y-3">
              {productPerf.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{p.name}</p>
                    <p className="text-[10px] text-gray-500">{p.sold} sold</p>
                  </div>
                  <p className="text-xs font-semibold text-gray-800">₱{p.revenue}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Financial Summary Bar */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-green-400" />
          <span className="text-sm text-gray-300">Total All-Time Revenue</span>
        </div>
        <div className="flex items-center gap-8">
          <div>
            <p className="text-xs text-gray-400">Total Revenue</p>
            <p className="text-xl font-bold">₱{totalSales.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Total Orders</p>
            <p className="text-xl font-bold">{orders.length}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Products</p>
            <p className="text-xl font-bold">{products.length}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
