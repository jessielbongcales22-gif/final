import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { OrderItem } from '../types';
import {
  ShoppingCart, Plus, Minus, Wallet,
  Smartphone, CheckCircle, Package
} from 'lucide-react';
import AddressPicker from '../components/AddressPicker';
import PaymentModal from '../components/PaymentModal';

export default function PlaceOrder() {
  const { user } = useAuth();
  const { products, addOrder } = useData();
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [address, setAddress] = useState(user?.address || '');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'gcash'>('cash');
  const [notes, setNotes] = useState('');
  const [success, setSuccess] = useState(false);
  const [filter, setFilter] = useState<'all' | 'water' | 'container'>('all');
  const [showPayment, setShowPayment] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState('');

  const filteredProducts = products.filter(p => filter === 'all' || p.type === filter);

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

  const deleteFromCart = (productId: string) => {
    setCart(cart.filter(i => i.productId !== productId));
  };

  const total = cart.reduce((s, i) => s + i.subtotal, 0);

  const handlePlaceOrder = () => {
    if (cart.length === 0 || !address) return;

    if (paymentMethod === 'gcash') {
      // Show payment modal first — order placed after payment confirmation
      const tempId = 'o' + Date.now();
      setPendingOrderId(tempId);
      setShowPayment(true);
      return;
    }

    // Cash — place order directly
    placeOrderNow('pending');
  };

  const placeOrderNow = (payStatus: 'pending' | 'paid') => {
    addOrder({
      customerId: user!.id,
      customerName: user!.username,
      items: cart,
      totalAmount: total,
      status: 'pending',
      paymentMethod,
      paymentStatus: payStatus,
      orderType: 'delivery',
      deliveryAddress: address,
      notes,
      createdAt: new Date().toISOString(),
    });
    setCart([]);
    setNotes('');
    setShowPayment(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const handlePaymentComplete = () => {
    placeOrderNow('paid');
  };

  const getCartQuantity = (productId: string) => {
    const item = cart.find(i => i.productId === productId);
    return item ? item.quantity : 0;
  };

  return (
    <div className="space-y-6">
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <p className="text-sm text-green-700 font-medium">Order placed successfully! We'll process it shortly.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800">Available Products</h2>
            <div className="flex bg-gray-100 rounded-lg p-1">
              {(['all', 'water', 'container'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-all ${
                    filter === f ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredProducts.map(p => {
              const inCart = getCartQuantity(p.id);
              const available = p.stock - inCart;
              return (
                <div key={p.id} className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${
                  inCart > 0 ? 'border-blue-300 ring-2 ring-blue-100' : 'border-gray-100'
                }`}>
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-800 text-sm">{p.name}</h3>
                        <p className="text-xs text-gray-500 capitalize">{p.type} • {p.unit}</p>
                      </div>
                      <p className="text-lg font-bold text-blue-600">₱{p.price}</p>
                    </div>
                    <p className="text-xs text-gray-400 mb-3">{p.description}</p>
                    <p className={`text-xs mb-3 ${available <= 0 ? 'text-red-500' : available <= 5 ? 'text-yellow-600' : 'text-green-600'}`}>
                      {available <= 0 ? 'Out of stock' : `${available} available`}
                    </p>
                    {available > 0 ? (
                      <div className="flex items-center gap-2">
                        {inCart > 0 && (
                          <>
                            <button onClick={() => removeFromCart(p.id)} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                              <Minus className="w-4 h-4 text-gray-600" />
                            </button>
                            <span className="w-8 text-center font-semibold text-sm">{inCart}</span>
                          </>
                        )}
                        <button
                          onClick={() => addToCart(p.id)}
                          className={`flex-1 py-2 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-1.5 ${
                            inCart > 0
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                          }`}
                        >
                          <Plus className="w-4 h-4" />
                          {inCart > 0 ? 'Add More' : 'Add to Cart'}
                        </button>
                        {inCart > 0 && (
                          <button onClick={() => deleteFromCart(p.id)} className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors">
                            <Minus className="w-4 h-4 text-red-500" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <button disabled className="w-full py-2 rounded-lg bg-gray-100 text-gray-400 text-sm font-medium cursor-not-allowed">
                        Out of Stock
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cart & Checkout */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 sticky top-20">
            <div className="flex items-center gap-2 mb-4">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-gray-800">Your Cart</h3>
              {cart.length > 0 && (
                <span className="ml-auto bg-blue-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                  {cart.reduce((s, i) => s + i.quantity, 0)}
                </span>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Your cart is empty</p>
                <p className="text-xs text-gray-300">Add products to get started</p>
              </div>
            ) : (
              <div className="space-y-3 mb-4">
                {cart.map(item => (
                  <div key={item.productId} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg p-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 truncate">{item.productName}</p>
                      <p className="text-xs text-gray-500">{item.quantity} × ₱{item.price}</p>
                    </div>
                    <p className="font-semibold text-gray-800 ml-2">₱{item.subtotal}</p>
                  </div>
                ))}
              </div>
            )}

            {cart.length > 0 && (
              <>
                <div className="border-t border-gray-100 pt-4 mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600">Subtotal</span>
                    <span className="text-sm font-medium text-gray-800">₱{total}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-gray-100 pt-2 mt-2">
                    <span className="font-semibold text-gray-800">Total</span>
                    <span className="text-lg font-bold text-blue-600">₱{total}</span>
                  </div>
                </div>

                {/* Delivery Address */}
                <div className="mb-4">
                  <AddressPicker
                    value={address}
                    onChange={setAddress}
                    required
                  />
                </div>

                {/* Payment Method */}
                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Payment Method</label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { id: 'cash' as const, label: 'Cash', icon: Wallet },
                      { id: 'gcash' as const, label: 'GCash', icon: Smartphone },
                    ]).map(pm => (
                      <button
                        key={pm.id}
                        onClick={() => setPaymentMethod(pm.id)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-xs font-medium ${
                          paymentMethod === pm.id
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
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
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Notes (Optional)</label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    rows={2}
                    placeholder="Special instructions..."
                  />
                </div>

                <button
                  onClick={handlePlaceOrder}
                  disabled={!address}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 rounded-xl font-medium hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Place Order — ₱{total}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* GCash Payment Modal */}
      <PaymentModal
        show={showPayment}
        onClose={() => setShowPayment(false)}
        onPaymentComplete={handlePaymentComplete}
        amount={total}
        orderId={pendingOrderId}
        paymentMethod="gcash"
      />
    </div>
  );
}
