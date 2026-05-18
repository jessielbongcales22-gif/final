const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface CheckoutResult {
  checkoutUrl: string | null;
  checkoutId?: string;
  simulated: boolean;
  message?: string;
}

export async function createCheckout(
  amount: number,
  description: string,
  orderId: string,
  paymentMethod: 'gcash',
): Promise<CheckoutResult> {
  try {
    const token = localStorage.getItem('wm_token');
    const res = await fetch(`${API_URL}/payment/create-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        amount,
        description,
        orderId,
        paymentMethod,
        successUrl: `${window.location.origin}?payment=success&orderId=${orderId}`,
        failedUrl: `${window.location.origin}?payment=failed&orderId=${orderId}`,
      }),
    });

    if (!res.ok) throw new Error('Payment request failed');
    return await res.json();
  } catch {
    // API not available — simulate
    return { checkoutUrl: null, simulated: true, message: 'Payment gateway not available' };
  }
}

export async function checkPaymentStatus(checkoutId: string): Promise<{ status: string; simulated: boolean }> {
  try {
    const token = localStorage.getItem('wm_token');
    const res = await fetch(`${API_URL}/payment/status/${checkoutId}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    return await res.json();
  } catch {
    return { status: 'unknown', simulated: true };
  }
}

// GCash QR Code data for manual payment
export const GCASH_QR_DATA = {
  name: 'Water Market Station',
  number: '0917-123-4567', // Replace with your real GCash number
};
