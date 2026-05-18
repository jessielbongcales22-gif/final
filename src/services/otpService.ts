import emailjs from '@emailjs/browser';

// ─── EmailJS Configuration ────────────────────────────────────────────────────
// To use REAL email OTP:
// 1. Sign up free at https://www.emailjs.com
// 2. Add Gmail as a service → copy your Service ID
// 3. Create a template with variables: {{otp_code}}, {{to_name}}, {{to_email}}
// 4. Copy your Template ID and Public Key
// 5. Replace the values below with your real credentials
// ─────────────────────────────────────────────────────────────────────────────

const EMAILJS_SERVICE_ID  = import.meta.env.VITE_EMAILJS_SERVICE_ID  || 'YOUR_SERVICE_ID';
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'YOUR_TEMPLATE_ID';
const EMAILJS_PUBLIC_KEY  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY  || 'YOUR_PUBLIC_KEY';

const IS_CONFIGURED = (
  EMAILJS_SERVICE_ID  !== 'YOUR_SERVICE_ID' &&
  EMAILJS_TEMPLATE_ID !== 'YOUR_TEMPLATE_ID' &&
  EMAILJS_PUBLIC_KEY  !== 'YOUR_PUBLIC_KEY'
);

// Generate a 6-digit OTP
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Store OTP with 10-minute expiry
export function storeOTP(key: string, otp: string) {
  const expires = Date.now() + 10 * 60 * 1000; // 10 minutes
  localStorage.setItem(`wm_otp_${key}`, JSON.stringify({ otp, expires }));
}

// Verify OTP
export function verifyOTP(key: string, inputOtp: string): 'valid' | 'invalid' | 'expired' {
  try {
    const stored = localStorage.getItem(`wm_otp_${key}`);
    if (!stored) return 'invalid';
    const { otp, expires } = JSON.parse(stored);
    if (Date.now() > expires) {
      localStorage.removeItem(`wm_otp_${key}`);
      return 'expired';
    }
    if (otp === inputOtp.trim()) {
      localStorage.removeItem(`wm_otp_${key}`);
      return 'valid';
    }
    return 'invalid';
  } catch {
    return 'invalid';
  }
}

// Send OTP via EmailJS (real email)
export async function sendEmailOTP(email: string, name: string, otp: string): Promise<{ success: boolean; simulated: boolean }> {
  if (!IS_CONFIGURED) {
    // Simulate — show OTP in console and alert for dev/demo
    console.log(`%c📧 OTP for ${email}: ${otp}`, 'background:#1e40af;color:white;padding:4px 8px;border-radius:4px;font-size:14px;');
    return { success: true, simulated: true };
  }

  try {
    await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      {
        to_email: email,
        to_name:  name || email,
        otp_code: otp,
        app_name: 'Water Market',
      },
      EMAILJS_PUBLIC_KEY
    );
    return { success: true, simulated: false };
  } catch (err) {
    console.error('EmailJS error:', err);
    // Fallback to simulated
    console.log(`%c📧 OTP for ${email}: ${otp}`, 'background:#1e40af;color:white;padding:4px 8px;border-radius:4px;font-size:14px;');
    return { success: true, simulated: true };
  }
}

// Simulate SMS OTP (no free SMS API available without backend)
// In production, connect Twilio/Semaphore via your Node.js backend
export async function sendSmsOTP(phone: string, otp: string): Promise<{ success: boolean; simulated: boolean }> {
  // Always simulated on frontend — real SMS needs backend
  console.log(`%c📱 SMS OTP for ${phone}: ${otp}`, 'background:#059669;color:white;padding:4px 8px;border-radius:4px;font-size:14px;');
  return { success: true, simulated: true };
}
