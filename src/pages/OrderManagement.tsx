import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Order, OrderStatus, PaymentStatus } from '../types';
import {
  Search, Filter, Eye, CheckCircle, XCircle, Truck,
  Package, ChevronDown, Trash2
} from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';

export default function OrderManagement() {
  const { user } = useAuth();
  const { orders, updateOrder, deleteOrder } = useData();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);

  const filtered = orders
    .filter(o => user?.role === 'customer' ? o.customerId === user.id : true)
    .filter(o => statusFilter === 'all' || o.status === statusFilter)
    .filter(o => typeFilter === 'all' || o.orderType === typeFilter)
    .filter(o => o.customerName.toLowerCase().includes(search.toLowerCase()) || o.id.includes(search))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    processing: 'bg-blue-100 text-blue-700 border-blue-200',
    'out-for-delivery': 'bg-purple-100 text-purple-700 border-purple-200',
    completed: 'bg-green-100 text-green-700 border-green-200',
    cancelled: 'bg-red-100 text-red-700 border-red-200',
  };

  const paymentColors: Record<string, string> = {
    cash: 'bg-emerald-100 text-emerald-700',
    gcash: 'bg-blue-100 text-blue-700',
  };

  const getNextStatus = (current: OrderStatus): OrderStatus | null => {
    const flow: Record<string, OrderStatus> = {
      pending: 'processing',
      processing: 'out-for-delivery',
      'out-for-delivery': 'completed',
    };
    return flow[current] || null;
  };

  const getNextLabel = (current: OrderStatus): string => {
    const labels: Record<string, string> = {
      pending: 'Start Processing',
      processing: 'Send for Delivery',
      'out-for-delivery': 'Mark Completed',
    };
    return labels[current] || '';
  };

  const handleStatusUpdate = (orderId: string, status: OrderStatus) => {
    if (status === 'completed') {
      updateOrder(orderId, { status, paymentStatus: 'paid' as PaymentStatus });
    } else {
      updateOrder(orderId, { status });
    }
    setSelectedOrder(null);
    setShowDetail(false);
  };

  const handleCancel = (orderId: string) => {
    updateOrder(orderId, { status: 'cancelled' as OrderStatus });
    setSelectedOrder(null);
    setShowDetail(false);
  };

  const handleDelete = async () => {
    if (!orderToDelete) return;
    await deleteOrder(orderToDelete.id);
    setOrderToDelete(null);
    if (selectedOrder?.id === orderToDelete.id) {
      setSelectedOrder(null);
      setShowDetail(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Order Management</h2>
          <p className="text-sm text-gray-500">{filtered.length} orders found</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by order ID or customer..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="pl-10 pr-8 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="out-for-delivery">Out for Delivery</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
        {user?.role !== 'customer' && (
          <div className="relative">
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="pl-4 pr-8 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white"
            >
              <option value="all">All Types</option>
              <option value="delivery">🚚 Delivery</option>
              <option value="walk-in">🏪 Walk-in</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        )}
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Order</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Items</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Payment</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(order => (
                <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <p className="text-sm font-medium text-gray-800">#{order.id}</p>
                    <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString()}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-sm text-gray-800">{order.customerName}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${order.orderType === 'walk-in' ? 'bg-teal-100 text-teal-700' : 'bg-blue-50 text-blue-600'}`}>
                      {order.orderType === 'walk-in' ? '🏪 Walk-in' : '🚚 Delivery'}
                    </span>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <p className="text-sm text-gray-600">{order.items.length} item(s)</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-sm font-semibold text-gray-800">₱{order.totalAmount}</p>
                  </td>
                  <td className="px-5 py-4 hidden sm:table-cell">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${paymentColors[order.paymentMethod]}`}>
                      {order.paymentMethod.toUpperCase()}
                    </span>
                    <p className="text-xs text-gray-400 mt-0.5">{order.paymentStatus}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${statusColors[order.status]}`}>
                      {order.status.replace(/-/g, ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setSelectedOrder(order); setShowDetail(true); }}
                        className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {user?.role !== 'customer' && order.status !== 'completed' && order.status !== 'cancelled' && (
                        <>
                          <button
                            onClick={() => handleStatusUpdate(order.id, getNextStatus(order.status)!)}
                            className="p-2 rounded-lg hover:bg-green-50 text-green-600 transition-colors"
                            title={getNextLabel(order.status)}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleCancel(order.id)}
                            className="p-2 rounded-lg hover:bg-orange-50 text-orange-600 transition-colors"
                            title="Cancel Order"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {(user?.role === 'admin' || user?.role === 'staff') && (
                        <button
                          onClick={() => setOrderToDelete(order)}
                          className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                          title="Delete Order"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="p-12 text-center text-gray-400">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No orders found</p>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {showDetail && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800">Order #{selectedOrder.id}</h3>
              <button onClick={() => setShowDetail(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <XCircle className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Status Timeline */}
              <div className="flex items-center gap-2">
                {['pending', 'processing', 'out-for-delivery', 'completed'].map((step, i) => {
                  const steps = ['pending', 'processing', 'out-for-delivery', 'completed'];
                  const currentIdx = steps.indexOf(selectedOrder.status);
                  const isCompleted = i <= currentIdx && selectedOrder.status !== 'cancelled';
                  const isCurrent = step === selectedOrder.status;
                  return (
                    <div key={step} className="flex items-center flex-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        isCompleted ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                      } ${isCurrent ? 'ring-4 ring-blue-100' : ''}`}>
                        {i + 1}
                      </div>
                      {i < 3 && <div className={`flex-1 h-1 ${i < currentIdx && selectedOrder.status !== 'cancelled' ? 'bg-blue-600' : 'bg-gray-200'}`} />}
                    </div>
                  );
                })}
              </div>

              {/* Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Customer</p>
                  <p className="font-medium text-gray-800">{selectedOrder.customerName}</p>
                </div>
                <div>
                  <p className="text-gray-500">Date</p>
                  <p className="font-medium text-gray-800">{new Date(selectedOrder.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-500">Payment</p>
                  <p className="font-medium text-gray-800 capitalize">{selectedOrder.paymentMethod}</p>
                </div>
                <div>
                  <p className="text-gray-500">Pay Status</p>
                  <p className="font-medium text-gray-800 capitalize">{selectedOrder.paymentStatus}</p>
                </div>
              </div>

              <div>
                <p className="text-gray-500 text-sm mb-1">Delivery Address</p>
                <p className="text-sm text-gray-800">{selectedOrder.deliveryAddress}</p>
              </div>

              {selectedOrder.notes && (
                <div>
                  <p className="text-gray-500 text-sm mb-1">Notes</p>
                  <p className="text-sm text-gray-800">{selectedOrder.notes}</p>
                </div>
              )}

              {/* Items */}
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-2">Order Items</p>
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  {selectedOrder.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{item.productName} × {item.quantity}</span>
                      <span className="font-medium text-gray-800">₱{item.subtotal}</span>
                    </div>
                  ))}
                  <div className="border-t border-gray-200 pt-2 flex items-center justify-between font-bold text-sm">
                    <span className="text-gray-800">Total</span>
                    <span className="text-blue-600">₱{selectedOrder.totalAmount}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              {user?.role !== 'customer' && selectedOrder.status !== 'completed' && selectedOrder.status !== 'cancelled' && (
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => handleStatusUpdate(selectedOrder.id, getNextStatus(selectedOrder.status)!)}
                    className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Truck className="w-4 h-4" />
                    {getNextLabel(selectedOrder.status)}
                  </button>
                  <button
                    onClick={() => handleCancel(selectedOrder.id)}
                    className="px-6 bg-red-100 text-red-700 py-2.5 rounded-xl font-medium hover:bg-red-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        show={!!orderToDelete}
        title="Delete Order?"
        message={`Are you sure you want to permanently delete Order #${orderToDelete?.id} from ${orderToDelete?.customerName}? This will remove the order and all its items. This action cannot be undone.`}
        confirmText="Yes, Delete"
        onConfirm={handleDelete}
        onCancel={() => setOrderToDelete(null)}
      />
    </div>
  );
}
