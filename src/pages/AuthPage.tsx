import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Droplets, Eye, EyeOff, Mail, Lock, User, Phone,
  ShieldCheck, RefreshCw, CheckCircle, MessageSquare,
  MapPin, Clock, ShoppingCart, Users, Shield, X, ChevronRight
} from 'lucide-react';
import AddressPicker from '../components/AddressPicker';
import { generateOTP, storeOTP, verifyOTP, sendEmailOTP, sendSmsOTP } from '../services/otpService';

interface AuthPageProps { onLogin: () => void; }
type SignupStep = 'form' | 'choose-otp' | 'verify-otp' | 'done';
type OtpMethod  = 'email' | 'sms';

export default function AuthPage({ onLogin }: AuthPageProps) {
  const { login, register } = useAuth();

  const [modal,  setModal]  = useState<'none' | 'login' | 'signup'>('login');
  const [tab,    setTab]    = useState<'login' | 'signup'>('login');

  const [showPassword, setShowPassword] = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [success,      setSuccess]      = useState('');

  const [loginEmail,    setLoginEmail]    = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [step,           setStep]          = useState<SignupStep>('form');
  const [otpMethod,      setOtpMethod]     = useState<OtpMethod>('email');
  const [,               setOtpSent]       = useState(false);
  const [otpDigits,      setOtpDigits]     = useState(['','','','','','']);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [simulated,      setSimulated]     = useState(false);
  const [devOtp,         setDevOtp]        = useState('');
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [signup, setSignup] = useState({
    username:'', email:'', password:'', confirmPassword:'', phone:'', address:'',
  });
  const [pendingUser, setPendingUser] = useState<typeof signup | null>(null);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const openModal = (m: 'login' | 'signup') => {
    setModal(m); setTab(m);
    setError(''); setSuccess('');
    resetSignup();
  };
  const closeModal = () => { setModal('none'); setError(''); };
  const switchTab = (t: 'login' | 'signup') => {
    setTab(t); setError(''); setSuccess(''); resetSignup();
  };
  const resetSignup = () => {
    setStep('form'); setOtpSent(false);
    setOtpDigits(['','','','','','']);
    setSimulated(false); setDevOtp('');
    setError(''); setSuccess(''); setPendingUser(null);
  };

  // Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const user = await login(loginEmail, loginPassword);
      if (user) { onLogin(); } else { setError('Invalid email or password.'); }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    }
    setLoading(false);
  };

  // Signup step 1
  const handleSignupFormSubmit = (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (!signup.username.trim())  return setError('Username is required.');
    if (!signup.email.trim())     return setError('Email is required.');
    if (!signup.phone.trim())     return setError('Phone number is required.');
    if (!signup.address.trim())   return setError('Please select your delivery address.');
    if (signup.phone.replace(/\D/g,'').length < 10) return setError('Enter a valid phone number.');
    if (signup.password.length < 6) return setError('Password must be at least 6 characters.');
    if (signup.password !== signup.confirmPassword) return setError('Passwords do not match.');
    setPendingUser({ ...signup }); setStep('choose-otp');
  };

  // Send OTP
  const handleSendOtp = async (method: OtpMethod) => {
    if (!pendingUser) return;
    setOtpMethod(method); setError(''); setLoading(true);
    const otp = generateOTP(); storeOTP(pendingUser.email, otp);
    const result = method === 'email'
      ? await sendEmailOTP(pendingUser.email, pendingUser.username, otp)
      : await sendSmsOTP(pendingUser.phone, otp);
    setLoading(false);
    if (result.success) {
      setOtpSent(true); setSimulated(result.simulated);
      if (result.simulated) setDevOtp(otp);
      setStep('verify-otp'); setResendCooldown(60);
      setOtpDigits(['','','','','','']);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } else { setError('Failed to send OTP.'); }
  };

  const handleOtpDigit = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otpDigits]; next[index] = value.slice(-1); setOtpDigits(next);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
    if (next.every(d => d !== '') && next.join('').length === 6)
      setTimeout(() => handleVerifyOtp(next.join('')), 100);
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0)
      otpRefs.current[index - 1]?.focus();
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6);
    if (pasted.length === 6) {
      setOtpDigits(pasted.split(''));
      otpRefs.current[5]?.focus();
      setTimeout(() => handleVerifyOtp(pasted), 100);
    }
  };

  const handleVerifyOtp = async (code?: string) => {
    if (!pendingUser) return;
    const inputOtp = code ?? otpDigits.join('');
    if (inputOtp.length < 6) return setError('Please enter all 6 digits.');
    setError(''); setLoading(true);
    const result = verifyOTP(pendingUser.email, inputOtp);
    if (result === 'expired') { setLoading(false); setOtpDigits(['','','','','','']); return setError('OTP has expired.'); }
    if (result === 'invalid') { setLoading(false); setOtpDigits(['','','','','','']); otpRefs.current[0]?.focus(); return setError('Incorrect OTP.'); }
    try {
      await register({ username:pendingUser.username, email:pendingUser.email, password:pendingUser.password, role:'customer', phone:pendingUser.phone, address:pendingUser.address });
      setStep('done'); setTimeout(() => onLogin(), 1500);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Registration failed.'); }
    setLoading(false);
  };

  const handleResend = async () => {
    if (!pendingUser || resendCooldown > 0) return;
    const otp = generateOTP(); storeOTP(pendingUser.email, otp);
    const result = otpMethod === 'email'
      ? await sendEmailOTP(pendingUser.email, pendingUser.username, otp)
      : await sendSmsOTP(pendingUser.phone, otp);
    if (result.simulated) setDevOtp(otp);
    setSimulated(result.simulated); setResendCooldown(60);
    setOtpDigits(['','','','','','']); setError('');
    setSuccess('OTP resent!'); setTimeout(() => setSuccess(''), 3000);
    otpRefs.current[0]?.focus();
  };

  // ═══════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-blue-50/60 to-blue-100/80 font-sans">

      {/* ── NAVBAR ── */}
      <nav className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-md">
            <Droplets className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm leading-tight">Water Market Station</p>
            <p className="text-gray-400 text-[10px] uppercase tracking-widest font-medium">Hinunangan, Southern Leyte</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => openModal('login')}
            className="px-5 py-2 text-sm font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-all"
          >
            Sign In
          </button>
          <button
            onClick={() => openModal('signup')}
            className="px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 rounded-xl transition-all shadow-md shadow-blue-500/20"
          >
            Create Account
          </button>
        </div>
      </nav>

      {/* ── HERO SECTION ── */}
      <section className="max-w-4xl mx-auto px-8 pt-16 pb-12">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-blue-100/80 text-blue-700 text-sm font-medium px-4 py-2 rounded-full mb-8 border border-blue-200/50">
          <Shield className="w-4 h-4" />
          Trusted Water Refilling Station in Hinunangan
        </div>

        {/* Big Title */}
        <h1 className="text-6xl font-black text-gray-900 leading-none mb-2 tracking-tight">
          Water Market
        </h1>
        <h1 className="text-6xl font-black text-blue-600 leading-none mb-8 tracking-tight">
          Station
        </h1>

        {/* Description */}
        <p className="text-gray-600 text-lg leading-relaxed max-w-2xl mb-10">
          Your reliable source of clean, safe, and affordable purified water
          in <strong className="text-gray-900 font-bold">Hinunangan, Southern Leyte</strong>. We serve the community with
          quality water refills delivered right to your doorstep.
        </p>

        {/* Info Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 max-w-2xl">
          <div className="flex items-start gap-4 pb-5 border-b border-gray-100">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">Station Address</p>
              <p className="text-gray-500 text-sm mt-0.5">
                Purok Saging, Brgy. Panalaron, <span className="text-blue-600 font-medium">Hinunangan, Southern Leyte</span>
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4 pt-5">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">Operating Hours</p>
              <p className="text-gray-500 text-sm mt-0.5">Monday–Saturday: 7:00 AM – 6:00 PM</p>
              <p className="text-gray-400 text-xs mt-0.5">Sunday: Closed</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHAT WE OFFER ── */}
      <section className="bg-blue-50/80 py-16">
        <div className="max-w-4xl mx-auto px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">What We Offer</h2>
            <p className="text-gray-500">Clean water services for your home and business</p>
          </div>
          <div className="grid grid-cols-2 gap-5">
            {[
              {
                icon: Droplets, label: 'Purified Water',
                desc: 'High-quality purified water refill at ₱30 per container',
                bg: 'bg-gradient-to-br from-blue-500 to-cyan-400',
              },
              {
                icon: ShoppingCart, label: 'Online Ordering',
                desc: 'Order water delivery from the comfort of your home',
                bg: 'bg-gradient-to-br from-blue-600 to-indigo-500',
              },
              {
                icon: Users, label: 'Walk-in Service',
                desc: 'Visit our station anytime during operating hours',
                bg: 'bg-gradient-to-br from-emerald-500 to-teal-400',
              },
              {
                icon: Shield, label: 'Safe & Clean',
                desc: 'Filtered and tested water you can trust for your family',
                bg: 'bg-gradient-to-br from-purple-500 to-pink-500',
              },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-2xl p-7 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className={`w-14 h-14 ${s.bg} rounded-2xl flex items-center justify-center mb-5 shadow-lg`}>
                  <s.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 text-base mb-1.5">{s.label}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-white border-t border-gray-200 py-6 text-center">
        <p className="text-gray-400 text-sm">
          © 2025 Water Market Water Refilling Station · Hinunangan, Southern Leyte
        </p>
      </footer>

      {/* ══════════════════════════════════════════════════════════════
          AUTH MODAL
      ══════════════════════════════════════════════════════════════ */}
      {modal !== 'none' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />

          {/* Modal box */}
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto">
            {/* Modal header */}
            <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-7 pt-6 pb-4 border-b border-gray-100 rounded-t-3xl">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                  <Droplets className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-bold text-gray-800 text-sm">Water Market Station</p>
                  <p className="text-gray-400 text-xs">Hinunangan, Southern Leyte</p>
                </div>
              </div>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="px-7 py-6">
              {/* Tab switcher */}
              {(step === 'form' || tab === 'login') && (
                <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
                  <button onClick={() => switchTab('login')}
                    className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${tab === 'login' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    Sign In
                  </button>
                  <button onClick={() => switchTab('signup')}
                    className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${tab === 'signup' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    Create Account
                  </button>
                </div>
              )}

              {/* Error / success */}
              {error && (
                <div className="mb-4 p-3.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-center gap-2">
                  <span className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center text-xs flex-shrink-0">!</span>
                  {error}
                </div>
              )}
              {success && (
                <div className="mb-4 p-3.5 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 flex-shrink-0" /> {success}
                </div>
              )}

              {/* ── LOGIN ── */}
              {tab === 'login' && (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-gray-50/50"
                        placeholder="you@example.com" required />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type={showPassword ? 'text' : 'password'} value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
                        className="w-full pl-11 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-gray-50/50"
                        placeholder="Enter your password" required />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <button type="submit" disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white py-3 rounded-xl font-bold hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
                    {loading
                      ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing in...</>
                      : <>Sign In <ChevronRight className="w-4 h-4" /></>}
                  </button>

                  {/* Demo credentials */}
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="text-xs font-bold text-blue-700 mb-2.5 flex items-center gap-1.5">
                      <span className="w-5 h-5 bg-blue-200 rounded-md flex items-center justify-center text-[10px]">ℹ</span>
                      Demo Credentials — click to auto-fill
                    </p>
                    <div className="space-y-1.5">
                      {[
                        { role:'Admin', email:'admin@watermarket.com', pw:'admin123', color:'text-blue-700', bg:'bg-blue-100' },
                        { role:'Staff', email:'staff1@watermarket.com', pw:'staff123', color:'text-emerald-700', bg:'bg-emerald-100' },
                      ].map(c => (
                        <button key={c.role} type="button"
                          onClick={() => { setLoginEmail(c.email); setLoginPassword(c.pw); }}
                          className="w-full flex items-center gap-3 bg-white hover:bg-blue-50 rounded-lg px-3 py-2 transition-colors text-left border border-gray-100 hover:border-blue-200">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.bg} ${c.color}`}>{c.role}</span>
                          <span className="text-gray-500 font-mono text-xs flex-1 truncate">{c.email}</span>
                          <ChevronRight className="w-3 h-3 text-gray-300" />
                        </button>
                      ))}
                    </div>
                  </div>
                </form>
              )}

              {/* ── SIGNUP STEP 1: FORM ── */}
              {tab === 'signup' && step === 'form' && (
                <form onSubmit={handleSignupFormSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name / Username</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="text" value={signup.username} onChange={e => setSignup({...signup, username:e.target.value})}
                        className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-gray-50/50"
                        placeholder="e.g. Juan Dela Cruz" required />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Gmail Address <span className="text-blue-400 text-xs">(for OTP)</span></label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="email" value={signup.email} onChange={e => setSignup({...signup, email:e.target.value})}
                        className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-gray-50/50"
                        placeholder="yourname@gmail.com" required />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number <span className="text-green-500 text-xs">(for OTP)</span></label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="tel" value={signup.phone} onChange={e => setSignup({...signup, phone:e.target.value})}
                        className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-gray-50/50"
                        placeholder="09XXXXXXXXX" required />
                    </div>
                  </div>
                  <AddressPicker value={signup.address} onChange={addr => setSignup({...signup, address:addr})} required />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type={showPassword ? 'text' : 'password'} value={signup.password} onChange={e => setSignup({...signup, password:e.target.value})}
                        className="w-full pl-11 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-gray-50/50"
                        placeholder="At least 6 characters" required />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="password" value={signup.confirmPassword} onChange={e => setSignup({...signup, confirmPassword:e.target.value})}
                        className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-gray-50/50"
                        placeholder="Re-enter password" required />
                    </div>
                  </div>
                  <button type="submit"
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white py-3 rounded-xl font-bold hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg flex items-center justify-center gap-2">
                    Continue <ChevronRight className="w-4 h-4" />
                  </button>
                  <p className="text-center text-xs text-gray-400">You'll verify your identity in the next step.</p>
                </form>
              )}

              {/* ── SIGNUP STEP 2: CHOOSE OTP ── */}
              {tab === 'signup' && step === 'choose-otp' && (
                <div className="space-y-5">
                  <div className="text-center">
                    <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <ShieldCheck className="w-7 h-7 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">Verify Your Identity</h3>
                    <p className="text-sm text-gray-500 mt-1">Choose how to receive your 6-digit OTP</p>
                  </div>
                  <div className="space-y-3">
                    <button onClick={() => handleSendOtp('email')} disabled={loading}
                      className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 rounded-2xl transition-all group disabled:opacity-50">
                      <div className="w-12 h-12 bg-red-100 group-hover:bg-red-200 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Mail className="w-6 h-6 text-red-600" />
                      </div>
                      <div className="text-left flex-1">
                        <p className="font-semibold text-gray-800">Send to Gmail</p>
                        <p className="text-sm text-gray-500 truncate">{pendingUser?.email}</p>
                      </div>
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">Gmail</span>
                    </button>
                    <button onClick={() => handleSendOtp('sms')} disabled={loading}
                      className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 hover:border-green-400 hover:bg-green-50 rounded-2xl transition-all group disabled:opacity-50">
                      <div className="w-12 h-12 bg-green-100 group-hover:bg-green-200 rounded-xl flex items-center justify-center flex-shrink-0">
                        <MessageSquare className="w-6 h-6 text-green-600" />
                      </div>
                      <div className="text-left flex-1">
                        <p className="font-semibold text-gray-800">Send SMS</p>
                        <p className="text-sm text-gray-500">{pendingUser?.phone}</p>
                      </div>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">SMS</span>
                    </button>
                  </div>
                  {loading && (
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                      <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                      Sending OTP...
                    </div>
                  )}
                  <button onClick={() => setStep('form')} className="w-full text-sm text-gray-400 hover:text-gray-600 transition-colors">
                    ← Back to form
                  </button>
                </div>
              )}

              {/* ── SIGNUP STEP 3: ENTER OTP ── */}
              {tab === 'signup' && step === 'verify-otp' && (
                <div className="space-y-5">
                  <div className="text-center">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 ${otpMethod==='email' ? 'bg-red-100' : 'bg-green-100'}`}>
                      {otpMethod==='email' ? <Mail className="w-7 h-7 text-red-600" /> : <MessageSquare className="w-7 h-7 text-green-600" />}
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">Enter Verification Code</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Code sent to <span className="font-semibold text-gray-700">{otpMethod==='email' ? pendingUser?.email : pendingUser?.phone}</span>
                    </p>
                  </div>
                  {simulated && devOtp && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <p className="text-xs font-bold text-amber-700 mb-1">⚠️ Demo Mode — EmailJS not configured yet</p>
                      <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-amber-200 mt-2">
                        <span className="text-xs text-amber-600">Your OTP:</span>
                        <span className="text-xl font-bold text-amber-700 tracking-widest">{devOtp}</span>
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                    {otpDigits.map((digit, i) => (
                      <input key={i} ref={el => { otpRefs.current[i] = el; }}
                        type="text" inputMode="numeric" maxLength={1} value={digit}
                        onChange={e => handleOtpDigit(i, e.target.value)}
                        onKeyDown={e => handleOtpKeyDown(i, e)}
                        className={`w-11 h-14 text-center text-xl font-bold border-2 rounded-xl outline-none transition-all ${digit ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-gray-50'} focus:border-blue-500 focus:ring-2 focus:ring-blue-100`}
                      />
                    ))}
                  </div>
                  <button onClick={() => handleVerifyOtp()} disabled={loading || otpDigits.join('').length < 6}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white py-3 rounded-xl font-bold hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
                    {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Verifying...</> : 'Verify & Create Account'}
                  </button>
                  <div className="text-center space-y-2">
                    <p className="text-sm text-gray-500">Didn't receive the code?</p>
                    <button onClick={handleResend} disabled={resendCooldown > 0}
                      className="flex items-center gap-1.5 mx-auto text-sm font-medium text-blue-600 hover:text-blue-700 disabled:text-gray-400 transition-colors">
                      <RefreshCw className="w-3.5 h-3.5" />
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                    </button>
                    <button onClick={() => setStep('choose-otp')} className="block mx-auto text-xs text-gray-400 hover:text-gray-600">
                      Try a different method
                    </button>
                  </div>
                </div>
              )}

              {/* ── SIGNUP STEP 4: DONE ── */}
              {tab === 'signup' && step === 'done' && (
                <div className="text-center py-8 space-y-4">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle className="w-10 h-10 text-green-500" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">Account Verified! 🎉</h3>
                  <p className="text-sm text-gray-500">
                    Welcome, <strong>{pendingUser?.username}</strong>! Redirecting to your dashboard...
                  </p>
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                    <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                    Loading...
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
