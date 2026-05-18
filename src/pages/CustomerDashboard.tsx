import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Package, Clock, CheckCircle } from 'lucide-react';
import { municipalities } from '../data/locations';

interface CustomerDashboardProps {
  onNavigate: (page: string) => void;
}

function getOrderMapCoords(address: string) {
  let lat = 10.4015, lng = 125.2052;
  const match = address.match(/Brgy\. ([^,]+), ([^,]+), Southern Leyte/);
  if (match) {
    const mun = municipalities.find(m => m.name === match[2]);
    const brgy = mun?.barangays.find(b => b.name === match[1]);
    if (brgy)     { lat = brgy.lat; lng = brgy.lng; }
    else if (mun) { lat = mun.lat;  lng = mun.lng; }
  }
  return { lat, lng };
}

export default function CustomerDashboard({ onNavigate }: CustomerDashboardProps) {
  const { user } = useAuth();
  const { getOrdersByCustomer } = useData();

  const myOrders = getOrdersByCustomer(user!.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const totalSpent    = myOrders.filter(o => o.status === 'completed').reduce((s, o) => s + o.totalAmount, 0);
  const pendingCount  = myOrders.filter(o => o.status === 'pending' || o.status === 'processing').length;
  const completedCount = myOrders.filter(o => o.status === 'completed').length;

  const statusColors: Record<string, string> = {
    pending:            'bg-yellow-100 text-yellow-700',
    processing:         'bg-blue-100 text-blue-700',
    'out-for-delivery': 'bg-purple-100 text-purple-700',
    completed:          'bg-green-100 text-green-700',
    cancelled:          'bg-red-100 text-red-700',
  };

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold">Hello, {user?.username}! 💧</h1>
        <p className="text-blue-100 mt-1">Welcome to Water Market. Order fresh water delivered to your door.</p>
        <button
          onClick={() => onNavigate('place-order')}
          className="mt-4 bg-white text-blue-600 px-6 py-2.5 rounded-xl font-medium hover:bg-blue-50 transition-colors"
        >
          Place New Order
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{pendingCount}</p>
              <p className="text-sm text-gray-500">Pending Orders</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{completedCount}</p>
              <p className="text-sm text-gray-500">Completed Orders</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <span className="text-blue-600 font-bold text-lg">₱</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">₱{totalSpent.toLocaleString()}</p>
              <p className="text-sm text-gray-500">Total Spent</p>
            </div>
          </div>
        </div>
      </div>

      {/* Order History */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">My Order History</h3>
        </div>

        {myOrders.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No orders yet</p>
            <button
              onClick={() => onNavigate('place-order')}
              className="mt-3 text-blue-600 text-sm font-medium hover:underline"
            >
              Place your first order
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {myOrders.map(order => {
              const { lat, lng } = getOrderMapCoords(order.deliveryAddress);
              const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.018}%2C${lat - 0.013}%2C${lng + 0.018}%2C${lat + 0.013}&layer=mapnik&marker=${lat}%2C${lng}`;
              const openMapLink = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`;

              return (
                <div key={order.id} className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-gray-800">Order #{order.id}</p>
                      <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[order.status]}`}>
                        {order.status.replace(/-/g, ' ')}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {order.orderType === 'walk-in' ? '🏪 Walk-in' : '🚚 Delivery'}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  {order.orderType === 'delivery' && (
                    <div className="flex items-center gap-1 mb-3">
                      {['pending', 'processing', 'out-for-delivery', 'completed'].map((step, i) => {
                        const steps = ['pending', 'processing', 'out-for-delivery', 'completed'];
                        const currentIdx = order.status === 'cancelled' ? -1 : steps.indexOf(order.status);
                        const done = i <= currentIdx;
                        return (
                          <div key={step} className="flex items-center flex-1">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${done ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                              {done ? '✓' : i + 1}
                            </div>
                            {i < 3 && <div className={`flex-1 h-0.5 ${i < currentIdx ? 'bg-blue-600' : 'bg-gray-200'}`} />}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Items */}
                  <div className="bg-gray-50 rounded-lg p-3 mb-3">
                    {order.items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{item.productName} × {item.quantity}</span>
                        <span className="text-gray-800 font-medium">₱{item.subtotal}</span>
                      </div>
                    ))}
                    <div className="border-t border-gray-200 mt-2 pt-2 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-800">Total</span>
                      <span className="text-sm font-bold text-blue-600">₱{order.totalAmount}</span>
                    </div>
                  </div>

                  {/* Payment info */}
                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                    <span className="flex items-center gap-1">
                      <span className="font-bold">₱</span> {order.paymentMethod.toUpperCase()}
                    </span>
                    <span>Payment: <span className={order.paymentStatus === 'paid' ? 'text-green-600 font-medium' : 'text-yellow-600 font-medium'}>{order.paymentStatus}</span></span>
                  </div>

                  {/* Delivery address + mini map */}
                  {order.orderType === 'delivery' && order.deliveryAddress && (
                    <div className="rounded-xl overflow-hidden border border-gray-200">
                      <div className="bg-gray-50 px-3 py-2 flex items-center justify-between border-b border-gray-100">
                        <p className="text-xs text-gray-700 font-medium truncate">
                          📍 {order.deliveryAddress}
                        </p>
                        <a
                          href={openMapLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-600 hover:underline font-medium ml-2 flex-shrink-0"
                        >
                          Open Map ↗
                        </a>
                      </div>
                      <iframe
                        src={mapUrl}
                        width="100%"
                        height="180"
                        className="block border-0"
                        title="Delivery Location"
                        loading="lazy"
                      />
                      <div className="bg-gray-50 px-3 py-1.5 border-t border-gray-100">
                        <p className="text-xs text-gray-400">🌐 {lat.toFixed(5)}, {lng.toFixed(5)} · Hinunangan, Southern Leyte</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
