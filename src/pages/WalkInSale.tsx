import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { OrderItem } from '../types';
import {
  ShoppingCart, Plus, Minus, Wallet,
  Smartphone, CheckCircle, Package, User, Trash2,
  Receipt, Droplets
} from 'lucide-react';

export default function WalkInSale() {
  const { user } = useAuth();
  const { products, addOrder } = useData();
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'gcash'>('cash');
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [notes, setNotes] = useState('');
  const [success, setSuccess] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<{ items: OrderItem[]; total: number; method: string; name: string; id: string } | null>(null);

  const addToCart = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product || product.stock <= 0) return;
    const existing = cart.find(i => i.productId === productId);
    if (existing) {
      if (existing.quantity >= product.stock) return;
      setCart(cart.map(i => i.productId === productId
        ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.price }
        : i
      ));
    } else {
      setCart([...cart, {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        price: product.price,
        subtotal: product.price,
      }]);
    }
  };

  const removeFromCart = (productId: string) => {
    const existing = cart.find(i => i.productId === productId);
    if (existing && existing.quantity > 1) {
      setCart(cart.map(i => i.productId === productId
        ? { ...i, quantity: i.quantity - 1, subtotal: (i.quantity - 1) * i.price }
        : i
      ));
    } else {
      setCart(cart.filter(i => i.productId !== productId));
    }
  };

  const total = cart.reduce((s, i) => s + i.subtotal, 0);

  const handleCheckout = () => {
    if (cart.length === 0) return;
    const orderId = 'wi' + Date.now();
    addOrder({
      customerId: 'walk-in',
      customerName: customerName.trim() || 'Walk-in Customer',
      items: cart,
      totalAmount: total,
      status: 'completed',
      paymentMethod,
      paymentStatus: 'paid',
      orderType: 'walk-in',
      deliveryAddress: 'Store / Walk-in',
      notes: notes || `Served by: ${user?.username}`,
      createdAt: new Date().toISOString(),
    });
    setLastReceipt({ items: [...cart], total, method: paymentMethod, name: customerName || 'Walk-in Customer', id: orderId });
    // orderId captured before clear
    setCart([]);
    setCustomerName('Walk-in Customer');
    setNotes('');
    setSuccess(true);
  };

  const getCartQty = (productId: string) => cart.find(i => i.productId === productId)?.quantity || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-cyan-600 rounded-2xl p-6 text-white flex items-center gap-4">
        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
          <User className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Walk-in Sale</h1>
          <p className="text-teal-100 text-sm">Quick checkout for in-store customers</p>
        </div>
      </div>

      {/* Receipt Modal */}
      {success && lastReceipt && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-t-2xl p-6 text-white text-center">
              <CheckCircle className="w-12 h-12 mx-auto mb-2" />
              <h3 className="text-lg font-bold">Sale Complete!</h3>
              <p className="text-green-100 text-sm">Payment received successfully</p>
            </div>
            <div className="p-6">
              {/* Receipt */}
              <div className="border border-dashed border-gray-300 rounded-xl p-4 mb-4 bg-gray-50">
                <div className="text-center mb-3">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Droplets className="w-5 h-5 text-blue-600" />
                    <span className="font-bold text-gray-800">Water Market</span>
                  </div>
                  <p className="text-xs text-gray-500">Official Receipt</p>
                  <p className="text-xs text-gray-400">{new Date().toLocaleString()}</p>
                </div>
                <div className="border-t border-dashed border-gray-300 pt-3 mb-3">
                  <p className="text-xs text-gray-500 mb-1">Customer: <span className="font-medium text-gray-700">{lastReceipt.name}</span></p>
                  <p className="text-xs text-gray-500">Order: <span className="font-medium text-gray-700">#{lastReceipt.id}</span></p>
                </div>
                <div className="space-y-1.5 mb-3">
                  {lastReceipt.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-gray-700">{item.productName} × {item.quantity}</span>
                      <span className="font-medium text-gray-800">₱{item.subtotal}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-dashed border-gray-300 pt-3">
                  <div className="flex justify-between font-bold text-base">
                    <span className="text-gray-800">TOTAL</span>
                    <span className="text-green-600">₱{lastReceipt.total}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Paid via: <span className="font-medium capitalize">{lastReceipt.method}</span>
                  </p>
                </div>
                <div className="text-center mt-3">
                  <p className="text-xs text-gray-400">Thank you for your purchase!</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setSuccess(false); setLastReceipt(null); }}
                  className="flex-1 bg-teal-600 text-white py-2.5 rounded-xl font-medium hover:bg-teal-700 transition-colors"
                >
                  New Sale
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-4 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-medium hover:bg-gray-200 transition-colors flex items-center gap-1.5"
                >
                  <Receipt className="w-4 h-4" /> Print
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products Panel */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-base font-semibold text-gray-800">Select Products</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {products.map(p => {
              const inCart = getCartQty(p.id);
              const available = p.stock - inCart;
              return (
                <div key={p.id} className={`bg-white rounded-xl border shadow-sm p-5 transition-all ${inCart > 0 ? 'border-teal-300 ring-2 ring-teal-100' : 'border-gray-100 hover:shadow-md'}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-cyan-100 rounded-xl flex items-center justify-center">
                      <Droplets className="w-5 h-5 text-cyan-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800 text-sm">{p.name}</h3>
                      <p className={`text-xs ${available <= 0 ? 'text-red-500' : 'text-gray-400'}`}>
                        {available <= 0 ? 'Out of stock' : `${available} available`}
                      </p>
                    </div>
                    <p className="ml-auto text-xl font-bold text-teal-600">₱{p.price}</p>
                  </div>
                  {available > 0 ? (
                    <div className="flex items-center gap-2">
                      {inCart > 0 && (
                        <button onClick={() => removeFromCart(p.id)} className="w-9 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                          <Minus className="w-4 h-4 text-gray-600" />
                        </button>
                      )}
                      {inCart > 0 && (
                        <span className="w-8 text-center font-bold text-gray-800">{inCart}</span>
                      )}
                      <button
                        onClick={() => addToCart(p.id)}
                        className={`flex-1 py-2.5 rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-1.5 ${
                          inCart > 0 ? 'bg-teal-600 text-white hover:bg-teal-700' : 'bg-teal-50 text-teal-700 hover:bg-teal-100'
                        }`}
                      >
                        <Plus className="w-4 h-4" />
                        {inCart > 0 ? 'Add More' : 'Add to Cart'}
                      </button>
                      {inCart > 0 && (
                        <button onClick={() => setCart(cart.filter(i => i.productId !== p.id))} className="w-9 h-9 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors">
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="w-full py-2.5 rounded-xl bg-gray-100 text-gray-400 text-sm font-medium text-center">Out of Stock</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Checkout Panel */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 sticky top-20">
            <div className="flex items-center gap-2 mb-4">
              <ShoppingCart className="w-5 h-5 text-teal-600" />
              <h3 className="font-bold text-gray-800">Checkout</h3>
              {cart.length > 0 && (
                <span className="ml-auto bg-teal-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                  {cart.reduce((s, i) => s + i.quantity, 0)}
                </span>
              )}
            </div>

            {/* Customer Name */}
            <div className="mb-4">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">Customer Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="Walk-in Customer"
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                />
              </div>
            </div>

            {/* Cart Items */}
            {cart.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl mb-4">
                <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No items added yet</p>
                <p className="text-xs text-gray-300">Click "Add to Cart" on a product</p>
              </div>
            ) : (
              <div className="space-y-2 mb-4">
                {cart.map(item => (
                  <div key={item.productId} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{item.productName}</p>
                      <p className="text-xs text-gray-500">{item.quantity} × ₱{item.price}</p>
                    </div>
                    <p className="text-sm font-bold text-gray-800 ml-3">₱{item.subtotal}</p>
                  </div>
                ))}
              </div>
            )}

            {cart.length > 0 && (
              <>
                {/* Total */}
                <div className="border-t border-gray-100 pt-3 mb-4 flex justify-between items-center">
                  <span className="font-bold text-gray-800">Total</span>
                  <span className="text-2xl font-bold text-teal-600">₱{total}</span>
                </div>

                {/* Payment Method */}
                <div className="mb-4">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 block">Payment</label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { id: 'cash' as const, label: 'Cash', icon: Wallet },
                      { id: 'gcash' as const, label: 'GCash', icon: Smartphone },
                    ]).map(pm => (
                      <button
                        key={pm.id}
                        onClick={() => setPaymentMethod(pm.id)}
                        className={`flex flex-col items-center gap-1 py-3 rounded-xl border-2 transition-all text-xs font-medium ${
                          paymentMethod === pm.id
                            ? 'border-teal-500 bg-teal-50 text-teal-700'
                            : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        <pm.icon className="w-5 h-5" />
                        {pm.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div className="mb-4">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">Notes (Optional)</label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none resize-none"
                    rows={2}
                    placeholder="Any special notes..."
                  />
                </div>

                {/* Checkout Button */}
                <button
                  onClick={handleCheckout}
                  className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 text-white py-3.5 rounded-xl font-bold hover:from-teal-700 hover:to-cyan-700 transition-all shadow-lg shadow-teal-500/25 flex items-center justify-center gap-2 text-base"
                >
                  <CheckCircle className="w-5 h-5" />
                  Complete Sale — ₱{total}
                </button>
                <p className="text-center text-xs text-gray-400 mt-2">
                  Paid via {paymentMethod.toUpperCase()} • Walk-in
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
