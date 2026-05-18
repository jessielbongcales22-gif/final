import { useState } from 'react';
import { X, ExternalLink, Copy, CheckCircle, Smartphone, QrCode, Clock, AlertTriangle } from 'lucide-react';
import { createCheckout, GCASH_QR_DATA } from '../services/paymentService';

interface PaymentModalProps {
  show: boolean;
  onClose: () => void;
  onPaymentComplete: () => void;
  amount: number;
  orderId: string;
  paymentMethod: 'gcash';
}

export default function PaymentModal({
  show, onClose, onPaymentComplete,
  amount, orderId,
}: PaymentModalProps) {
  const [step, setStep]         = useState<'choose' | 'online' | 'manual' | 'done'>('choose');
  const [loading, setLoading]   = useState(false);
  const [copied, setCopied]     = useState(false);
  const [refNumber, setRefNumber] = useState('');
  const [refError, setRefError]   = useState('');

  if (!show) return null;

  const handleOnlinePayment = async () => {
    setLoading(true);
    const result = await createCheckout(amount, `Water Market Order #${orderId}`, orderId, 'gcash');
    setLoading(false);
    if (result.checkoutUrl) {
      window.open(result.checkoutUrl, '_blank');
      setStep('online');
    } else {
      setStep('manual');
    }
  };

  const copyNumber = () => {
    navigator.clipboard.writeText(GCASH_QR_DATA.number.replace(/-/g, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const validateRef = (ref: string): string | null => {
    const cleaned = ref.replace(/[\s-]/g, '');
    if (!cleaned) return 'Please enter the GCash reference number.';
    if (cleaned.length < 10) return 'Reference number is too short. GCash reference numbers are usually 13 digits (e.g. 1234 5678 90123).';
    if (cleaned.length > 16) return 'Reference number is too long. Please double-check.';
    if (!/^\d+$/.test(cleaned)) return 'Reference number should contain only numbers.';
    return null;
  };

  const handleConfirmManual = () => {
    const err = validateRef(refNumber);
    if (err) { setRefError(err); return; }
    setRefError('');
    setStep('done');
    setTimeout(() => {
      onPaymentComplete();
      setStep('choose');
      setRefNumber('');
      setRefError('');
    }, 2000);
  };

  const handleOnlineDone = () => {
    setStep('done');
    setTimeout(() => {
      onPaymentComplete();
      setStep('choose');
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto">

        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between bg-gradient-to-r from-blue-600 to-blue-500 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <Smartphone className="w-5 h-5 text-white" />
            <div>
              <p className="text-white font-bold">Pay with GCash</p>
              <p className="text-white/70 text-xs">Order #{orderId}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Amount */}
          <div className="text-center mb-6">
            <p className="text-gray-500 text-sm">Amount to Pay</p>
            <p className="text-4xl font-black text-gray-900 mt-1">₱{amount.toLocaleString()}</p>
          </div>

          {/* ── STEP 1: Choose method ── */}
          {step === 'choose' && (
            <div className="space-y-3">
              <button onClick={handleOnlinePayment} disabled={loading}
                className="w-full flex items-center gap-4 p-4 border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 rounded-2xl transition-all disabled:opacity-50">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <ExternalLink className="w-6 h-6 text-blue-600" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-semibold text-gray-800">Pay Online via GCash</p>
                  <p className="text-xs text-gray-500">Redirect to GCash to complete payment</p>
                </div>
              </button>

              <button onClick={() => setStep('manual')}
                className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded-2xl transition-all">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <QrCode className="w-6 h-6 text-gray-600" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-semibold text-gray-800">Send via GCash App</p>
                  <p className="text-xs text-gray-500">Manually send to our GCash number</p>
                </div>
              </button>

              {loading && (
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500 py-2">
                  <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                  Connecting to GCash...
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2A: Online — waiting ── */}
          {step === 'online' && (
            <div className="text-center space-y-5">
              <div className="w-16 h-16 mx-auto bg-blue-100 rounded-2xl flex items-center justify-center">
                <Clock className="w-8 h-8 text-blue-600 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">Completing Payment...</h3>
                <p className="text-sm text-gray-500 mt-2">
                  A GCash checkout page has opened in a new tab.<br />
                  Complete the payment there, then click the button below.
                </p>
              </div>
              <button onClick={handleOnlineDone}
                className="w-full py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all">
                I've Completed the Payment ✓
              </button>
              <button onClick={() => setStep('choose')} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
            </div>
          )}

          {/* ── STEP 2B: Manual — send via app ── */}
          {step === 'manual' && (
            <div className="space-y-5">
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
                <p className="text-sm font-bold text-gray-800 mb-3">Send ₱{amount.toLocaleString()} to:</p>
                <div className="bg-white rounded-xl p-4 space-y-3">
                  <div>
                    <p className="text-xs text-gray-500">GCash Name</p>
                    <p className="font-bold text-gray-800">{GCASH_QR_DATA.name}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500">GCash Number</p>
                      <p className="font-bold text-gray-800 text-lg tracking-wide">{GCASH_QR_DATA.number}</p>
                    </div>
                    <button onClick={copyNumber}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        copied ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      }`}>
                      {copied ? <><CheckCircle className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy</>}
                    </button>
                  </div>
                </div>
                <div className="mt-3 p-3 bg-white/80 rounded-lg border border-dashed border-gray-300">
                  <p className="text-xs text-gray-600">
                    <strong>Steps:</strong><br />
                    1. Open GCash App on your phone<br />
                    2. Tap "Send Money"<br />
                    3. Enter the number above<br />
                    4. Enter amount: <strong>₱{amount.toLocaleString()}</strong><br />
                    5. Add message: <strong>Order #{orderId}</strong><br />
                    6. Confirm and send<br />
                    7. Enter the reference number below
                  </p>
                </div>
              </div>

              {/* Reference number input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  GCash Reference Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={refNumber}
                  onChange={e => { setRefNumber(e.target.value); setRefError(''); }}
                  placeholder="e.g. 1234 5678 90123"
                  maxLength={20}
                  className={`w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono tracking-widest text-lg ${
                    refError ? 'border-red-400 bg-red-50' : 'border-gray-200'
                  }`}
                />
                {refError ? (
                  <div className="flex items-start gap-1.5 mt-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-red-600 font-medium">{refError}</p>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 mt-1.5">
                    Enter the 13-digit reference number from your GCash receipt. This is required to verify your payment.
                  </p>
                )}
              </div>

              {/* Tip */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <p className="text-xs text-blue-700">
                  <strong>💡 Tip:</strong> Find the reference number in your GCash app → <strong>Transaction History</strong> → tap the transaction → look for <strong>"Ref. No."</strong>
                </p>
              </div>

              <button onClick={handleConfirmManual} disabled={!refNumber.trim()}
                className="w-full py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all disabled:opacity-50">
                Confirm Payment
              </button>
              <button onClick={() => { setStep('choose'); setRefError(''); }} className="w-full text-sm text-gray-400 hover:text-gray-600">← Back</button>
            </div>
          )}

          {/* ── STEP 3: Done ── */}
          {step === 'done' && (
            <div className="text-center py-4 space-y-4">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-800">Payment Confirmed!</h3>
              <p className="text-sm text-gray-500">
                Your ₱{amount.toLocaleString()} payment via GCash has been recorded.
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                <div className="w-4 h-4 border-2 border-green-200 border-t-green-600 rounded-full animate-spin" />
                Processing order...
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
