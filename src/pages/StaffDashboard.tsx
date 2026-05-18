import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Order } from '../types';
import {
  ClipboardList, CheckCircle, Truck, Clock, Package,
  AlertTriangle, Eye, XCircle, Zap, Droplets, UserPlus
} from 'lucide-react';

export default function StaffDashboard() {
  const { user } = useAuth();
  const { orders, updateOrder, getLowStockProducts } = useData();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const pendingOrders = orders.filter(o => o.status === 'pending').sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const processingOrders = orders.filter(o => o.status === 'processing').sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const deliveringOrders = orders.filter(o => o.status === 'out-for-delivery').sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const todayCompleted = orders.filter(o => {
    const today = new Date().toDateString();
    return o.status === 'completed' && new Date(o.updatedAt).toDateString() === today;
  });
  const todayWalkIn = orders.filter(o => {
    const today = new Date().toDateString();
    return o.orderType === 'walk-in' && new Date(o.createdAt).toDateString() === today;
  });

  const lowStock = getLowStockProducts();

  const advanceOrder = (order: Order) => {
    const flow: Record<string, string> = {
      pending: 'processing',
      processing: 'out-for-delivery',
      'out-for-delivery': 'completed',
    };
    const next = flow[order.status];
    if (next) {
      const updates: Record<string, unknown> = { status: next };
      if (next === 'completed') updates.paymentStatus = 'paid';
      updateOrder(order.id, updates);
    }
    if (selectedOrder?.id === order.id) setSelectedOrder(null);
  };

  const cancelOrder = (orderId: string) => {
    updateOrder(orderId, { status: 'cancelled' });
    if (selectedOrder?.id === orderId) setSelectedOrder(null);
  };

  const orderCard = (order: Order, actionLabel: string, actionColor: string) => (
    <div key={order.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold text-gray-800 text-sm">#{order.id}</p>
          <p className="text-xs text-gray-500">{order.customerName}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-gray-800">₱{order.totalAmount}</p>
          <p className="text-[10px] text-gray-400">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      </div>

      <div className="space-y-1 mb-3">
        {order.items.map((item, i) => (
          <p key={i} className="text-xs text-gray-600">• {item.productName} × {item.quantity}</p>
        ))}
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
        <span className={`px-2 py-0.5 rounded-full font-medium ${
          order.paymentMethod === 'cash' ? 'bg-emerald-100 text-emerald-700' :
          order.paymentMethod === 'gcash' ? 'bg-blue-100 text-blue-700' :
          'bg-indigo-100 text-indigo-700'
        }`}>
          {order.paymentMethod.toUpperCase()}
        </span>
        <span>{order.paymentStatus === 'paid' ? '✅ Paid' : '⏳ Unpaid'}</span>
      </div>

      <p className="text-xs text-gray-500 mb-3 truncate">📍 {order.deliveryAddress}</p>

      <div className="flex gap-2">
        <button
          onClick={() => setSelectedOrder(order)}
          className="flex-1 py-2 rounded-lg bg-gray-100 text-gray-600 text-xs font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-1"
        >
          <Eye className="w-3 h-3" /> Details
        </button>
        <button
          onClick={() => advanceOrder(order)}
          className={`flex-1 py-2 rounded-lg text-white text-xs font-medium transition-colors flex items-center justify-center gap-1 ${actionColor}`}
        >
          <Zap className="w-3 h-3" /> {actionLabel}
        </button>
        <button
          onClick={() => cancelOrder(order.id)}
          className="py-2 px-3 rounded-lg bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition-colors"
        >
          <XCircle className="w-3 h-3" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-700 via-teal-600 to-cyan-600 rounded-2xl p-6 lg:p-8 text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 opacity-10">
          <Droplets className="w-full h-full" />
        </div>
        <div className="relative z-10">
          <h1 className="text-2xl lg:text-3xl font-bold">Staff Workspace</h1>
          <p className="text-teal-100 mt-1">Hi {user?.username}! Process orders and keep things running.</p>
          <p className="text-teal-200 text-sm mt-2">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      {/* Order Flow Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 flex flex-wrap items-center gap-3 text-sm text-blue-700">
        <span className="font-semibold">📋 Order Flow:</span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block"/> Customer Places Order
        </span>
        <span className="text-blue-300">→</span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"/> Staff Processes
        </span>
        <span className="text-blue-300">→</span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-purple-500 inline-block"/> Out for Delivery
        </span>
        <span className="text-blue-300">→</span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block"/> Completed
        </span>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-4 h-4 text-yellow-600" />
            </div>
          </div>
          <p className="text-xl font-bold text-gray-800">{pendingOrders.length}</p>
          <p className="text-xs text-gray-500">Pending</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <p className="text-xl font-bold text-gray-800">{processingOrders.length}</p>
          <p className="text-xs text-gray-500">Processing</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center">
              <Truck className="w-4 h-4 text-purple-600" />
            </div>
          </div>
          <p className="text-xl font-bold text-gray-800">{deliveringOrders.length}</p>
          <p className="text-xs text-gray-500">Delivering</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 bg-teal-100 rounded-lg flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-teal-600" />
            </div>
          </div>
          <p className="text-xl font-bold text-gray-800">{todayWalkIn.length}</p>
          <p className="text-xs text-gray-500">Walk-ins Today</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
          </div>
          <p className="text-xl font-bold text-gray-800">{todayCompleted.length}</p>
          <p className="text-xs text-gray-500">Done Today</p>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStock.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0" />
          <p className="text-sm text-orange-700">
            <strong>{lowStock.length} product(s)</strong> are running low on stock: {lowStock.map(p => p.name).join(', ')}
          </p>
        </div>
      )}

      {/* Order Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Column */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <h3 className="font-semibold text-gray-800 text-sm">Pending</h3>
            <span className="ml-auto text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">{pendingOrders.length}</span>
          </div>
          <div className="space-y-3">
            {pendingOrders.length === 0 && (
              <div className="bg-gray-50 rounded-xl p-8 text-center">
                <ClipboardList className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-400">No pending orders</p>
              </div>
            )}
            {pendingOrders.map(o => orderCard(o, 'Start Processing', 'bg-yellow-500 hover:bg-yellow-600'))}
          </div>
        </div>

        {/* Processing Column */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <h3 className="font-semibold text-gray-800 text-sm">Processing</h3>
            <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{processingOrders.length}</span>
          </div>
          <div className="space-y-3">
            {processingOrders.length === 0 && (
              <div className="bg-gray-50 rounded-xl p-8 text-center">
                <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-400">Nothing processing</p>
              </div>
            )}
            {processingOrders.map(o => orderCard(o, 'Send Delivery', 'bg-blue-500 hover:bg-blue-600'))}
          </div>
        </div>

        {/* Out for Delivery Column */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full bg-purple-500" />
            <h3 className="font-semibold text-gray-800 text-sm">Out for Delivery</h3>
            <span className="ml-auto text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">{deliveringOrders.length}</span>
          </div>
          <div className="space-y-3">
            {deliveringOrders.length === 0 && (
              <div className="bg-gray-50 rounded-xl p-8 text-center">
                <Truck className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-400">No deliveries</p>
              </div>
            )}
            {deliveringOrders.map(o => orderCard(o, 'Complete', 'bg-green-500 hover:bg-green-600'))}
          </div>
        </div>
      </div>

      {/* Today's Completed */}
      {todayCompleted.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="p-5 border-b border-gray-100 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <h3 className="font-semibold text-gray-800">Completed Today</h3>
            <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">{todayCompleted.length}</span>
          </div>
          <div className="divide-y divide-gray-50">
            {todayCompleted.map(o => (
              <div key={o.id} className="p-4 flex items-center gap-4">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{o.customerName}</p>
                  <p className="text-xs text-gray-500">{o.items.length} item(s)</p>
                </div>
                <p className="text-sm font-semibold text-gray-800">₱{o.totalAmount}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800">Order #{selectedOrder.id}</h3>
              <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <XCircle className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Progress */}
              <div className="flex items-center gap-1">
                {['pending', 'processing', 'out-for-delivery', 'completed'].map((step, i) => {
                  const steps = ['pending', 'processing', 'out-for-delivery', 'completed'];
                  const idx = steps.indexOf(selectedOrder.status);
                  const done = i <= idx && selectedOrder.status !== 'cancelled';
                  return (
                    <div key={step} className="flex items-center flex-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${done ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                        {done ? '✓' : i + 1}
                      </div>
                      {i < 3 && <div className={`flex-1 h-1 ${i < idx && selectedOrder.status !== 'cancelled' ? 'bg-teal-600' : 'bg-gray-200'}`} />}
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-gray-500 text-xs">Customer</p><p className="font-medium">{selectedOrder.customerName}</p></div>
                <div><p className="text-gray-500 text-xs">Date</p><p className="font-medium">{new Date(selectedOrder.createdAt).toLocaleString()}</p></div>
                <div><p className="text-gray-500 text-xs">Payment</p><p className="font-medium capitalize">{selectedOrder.paymentMethod} ({selectedOrder.paymentStatus})</p></div>
                <div><p className="text-gray-500 text-xs">Status</p><p className="font-medium capitalize">{selectedOrder.status.replace(/-/g, ' ')}</p></div>
              </div>

              <div>
                <p className="text-gray-500 text-xs mb-1">Address</p>
                <p className="text-sm">{selectedOrder.deliveryAddress}</p>
              </div>

              {selectedOrder.notes && (
                <div>
                  <p className="text-gray-500 text-xs mb-1">Notes</p>
                  <p className="text-sm">{selectedOrder.notes}</p>
                </div>
              )}

              {/* Items */}
              <div className="bg-gray-50 rounded-xl p-4">
                {selectedOrder.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm py-1">
                    <span className="text-gray-700">{item.productName} × {item.quantity}</span>
                    <span className="font-medium">₱{item.subtotal}</span>
                  </div>
                ))}
                <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between font-bold text-sm">
                  <span>Total</span><span className="text-teal-600">₱{selectedOrder.totalAmount}</span>
                </div>
              </div>

              {/* Actions */}
              {selectedOrder.status !== 'completed' && selectedOrder.status !== 'cancelled' && (
                <div className="flex gap-3">
                  <button onClick={() => advanceOrder(selectedOrder)} className="flex-1 bg-teal-600 text-white py-2.5 rounded-xl font-medium hover:bg-teal-700 transition-colors">
                    Advance to Next Stage
                  </button>
                  <button onClick={() => cancelOrder(selectedOrder.id)} className="px-6 bg-red-100 text-red-700 py-2.5 rounded-xl font-medium hover:bg-red-200 transition-colors">
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
