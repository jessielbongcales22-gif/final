import { useEffect, useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { ShoppingCart, X, Bell } from 'lucide-react';

export default function NewOrderAlert({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { user } = useAuth();
  const { newOrderAlert, clearNewOrderAlert } = useData();
  const [visible, setVisible] = useState(false);
  const [animate, setAnimate] = useState(false);

  // Only show to admin and staff
  const canSee = user?.role === 'admin' || user?.role === 'staff';

  useEffect(() => {
    if (newOrderAlert && canSee) {
      setVisible(true);
      setAnimate(true);
      // Auto-dismiss after 8 seconds
      const timer = setTimeout(() => {
        handleDismiss();
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [newOrderAlert]);

  const handleDismiss = () => {
    setAnimate(false);
    setTimeout(() => {
      setVisible(false);
      clearNewOrderAlert();
    }, 300);
  };

  const handleView = () => {
    handleDismiss();
    onNavigate('orders');
  };

  if (!visible || !newOrderAlert || !canSee) return null;

  return (
    <div className={`fixed top-5 right-5 z-[100] transition-all duration-300 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
      <div className="bg-white rounded-2xl shadow-2xl border border-blue-100 w-80 overflow-hidden">
        {/* Top bar */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-white animate-bounce" />
            <span className="text-white text-xs font-semibold tracking-wide uppercase">New Order Received!</span>
          </div>
          <button onClick={handleDismiss} className="text-white/70 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800">{newOrderAlert.customerName}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {newOrderAlert.items.map(i => `${i.productName} × ${i.quantity}`).join(', ')}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(newOrderAlert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • 🚚 Delivery
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-bold text-blue-600">₱{newOrderAlert.totalAmount}</p>
              <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-medium">Pending</span>
            </div>
          </div>

          {/* Progress bar (auto-dismiss countdown) */}
          <div className="mt-3 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full animate-[shrink_8s_linear_forwards]" />
          </div>

          <button
            onClick={handleView}
            className="w-full mt-3 bg-blue-600 text-white py-2 rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors"
          >
            View Order →
          </button>
        </div>
      </div>
    </div>
  );
}
