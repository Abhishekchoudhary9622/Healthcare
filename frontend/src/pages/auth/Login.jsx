import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  Activity, Mail, Lock, Eye, EyeOff, ArrowRight, Phone, KeyRound,
  CheckCircle2, ArrowLeft, ShieldCheck, RefreshCw, Award, Star, Clock,
  HeartPulse, Stethoscope, Sparkles, UserCheck
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/components/ui/Toast';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import GoogleAuthModal from '@/components/shared/GoogleAuthModal';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

export default function Login() {
  const navigate = useNavigate();
  const { login, loginWithGoogle, loginWithPhoneOtp } = useAuthStore();
  const { toast } = useToast();

  const [authMethod, setAuthMethod] = useState('EMAIL'); // 'EMAIL' | 'PHONE'
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);

  // Phone OTP States
  const [phone, setPhone] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [otpSent, setOtpSent] = useState(false);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [debugOtp, setDebugOtp] = useState('');

  // Forgot Password Modal States
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtpDigits, setForgotOtpDigits] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotDebugOtp, setForgotDebugOtp] = useState('');

  const otpInputsRef = useRef([]);
  const forgotOtpInputsRef = useRef([]);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm();

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const navigateByRole = (user) => {
    if (!user) return navigate('/patient');
    const portals = { PATIENT: '/patient', DOCTOR: '/doctor', ADMIN: '/admin', DRIVER: '/driver' };
    navigate(portals[user.role] || '/patient');
  };

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const user = await login(data.email, data.password);
      toast({ type: 'success', title: 'Welcome back!', message: `Logged in as ${user.firstName || 'Patient'}` });
      navigateByRole(user);
    } catch (err) {
      toast({ type: 'error', title: 'Login failed', message: err.response?.data?.message || 'Invalid email or password' });
    } finally {
      setLoading(false);
    }
  };

  // Google Sign-In Account Selection Handler
  const handleGoogleAccountSelected = async (googleUser) => {
    setLoading(true);
    try {
      const user = await loginWithGoogle(googleUser);
      setIsGoogleModalOpen(false);
      toast({ type: 'success', title: 'Google Sign-In Successful', message: `Welcome, ${user.firstName}!` });
      navigateByRole(user);
    } catch (err) {
      toast({ type: 'error', title: 'Google authentication failed', message: err.response?.data?.message || 'Please try again' });
    } finally {
      setLoading(false);
    }
  };

  // Quick Demo Login helper
  const handleDemoLogin = (email, password) => {
    setValue('email', email);
    setValue('password', password);
    onSubmit({ email, password });
  };

  // Send Phone OTP
  const handleSendPhoneOtp = async () => {
    if (!phone || phone.length < 10) {
      return toast({ type: 'error', title: 'Invalid Phone Number', message: 'Please enter a valid 10-digit mobile number' });
    }
    setPhoneLoading(true);
    try {
      const res = await api.post('/auth/send-otp', { phone });
      setOtpSent(true);
      setCooldown(30);
      setOtpDigits(['', '', '', '', '', '']);
      if (res.data.data?.debugOtp) {
        setDebugOtp(res.data.data.debugOtp);
      }
      toast({ type: 'success', title: 'OTP Dispatched', message: 'Verification code sent to your phone' });
    } catch (err) {
      toast({ type: 'error', title: 'Error sending OTP', message: err.response?.data?.message || 'Failed to send OTP' });
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (value.length > 1) {
      const pasted = value.replace(/[^0-9]/g, '').slice(0, 6).split('');
      const nextDigits = [...otpDigits];
      pasted.forEach((char, i) => {
        if (index + i < 6) nextDigits[index + i] = char;
      });
      setOtpDigits(nextDigits);
      const nextFocus = Math.min(5, index + pasted.length);
      otpInputsRef.current[nextFocus]?.focus();
      return;
    }

    const nextDigits = [...otpDigits];
    nextDigits[index] = value.replace(/[^0-9]/g, '');
    setOtpDigits(nextDigits);

    if (value && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handleVerifyPhoneOtp = async () => {
    const fullOtp = otpDigits.join('');
    if (fullOtp.length !== 6) {
      return toast({ type: 'error', title: 'Invalid OTP', message: 'Please enter all 6 digits of the OTP' });
    }
    setPhoneLoading(true);
    try {
      const user = await loginWithPhoneOtp(phone, fullOtp);
      toast({ type: 'success', title: 'OTP Verified!', message: `Welcome back, ${user.firstName}!` });
      navigateByRole(user);
    } catch (err) {
      toast({ type: 'error', title: 'Verification Failed', message: err.response?.data?.message || 'Invalid OTP code' });
    } finally {
      setPhoneLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#F4F6FA] select-none font-sans">
      
      {/* Left decorative medical showcase panel (Clean Light Medical Theme) */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-[#EDF5FF] via-[#F4F8FD] to-[#E5F0FA] p-12 flex-col justify-between relative overflow-hidden border-r border-[#E6EBF2]">
        
        {/* Soft atmospheric gradient highlights */}
        <div className="absolute top-[-10%] left-[-10%] h-96 w-96 rounded-full bg-[#1271F5]/10 blur-[90px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] h-96 w-96 rounded-full bg-emerald-400/10 blur-[100px] pointer-events-none" />

        {/* Top Header: Brand Logo */}
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-[#1271F5] flex items-center justify-center shadow-md shadow-[#1271F5]/25">
                <div className="h-5 w-5 rounded-full bg-white flex items-center justify-center">
                  <div className="h-2.5 w-2.5 rounded-full bg-[#1271F5]" />
                </div>
              </div>
              <div>
                <span className="text-[#121A26] font-extrabold text-2xl tracking-tight">iMed Portal</span>
                <p className="text-xs text-[#1271F5] font-semibold -mt-0.5">Healthcare & Patient Dashboard</p>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Care Network Online</span>
            </div>
          </div>
        </div>

        {/* Middle Showcase: Photo Banner + 1-Click Demo Logins */}
        <div className="relative z-10 my-auto py-6 space-y-6 max-w-lg">
          
          {/* Aesthetic Medical Picture Card */}
          <div className="relative rounded-3xl overflow-hidden shadow-lg border border-white group">
            <img
              src="/doctor_promo_portrait.jpg"
              alt="Medical Care Team"
              className="w-full h-56 object-cover object-top transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 text-slate-800 text-xs font-bold shadow-sm backdrop-blur-md">
                <ShieldCheck className="h-3.5 w-3.5 text-[#1271F5]" />
                Trusted by 12,000+ Patients
              </div>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100/90 px-3 py-1 rounded-full shadow-sm backdrop-blur-md">
                24/7 Verified Doctors
              </span>
            </div>
          </div>

          {/* Quick 1-Click Demo Login Box (For Instant Evaluation) */}
          <div className="p-5 rounded-3xl bg-white border border-[#E6EBF2] shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Quick 1-Click Demo Logins
              </span>
              <span className="text-[11px] font-semibold text-[#1271F5] bg-blue-50 px-2 py-0.5 rounded-full">
                Pre-configured
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleDemoLogin('patient@healthsync.com', 'Patient@123')}
                className="p-3 rounded-2xl bg-[#F8FAFD] border border-slate-200/80 hover:border-[#1271F5] hover:bg-blue-50/50 text-left transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#121A26] group-hover:text-[#1271F5]">
                    Patient Account
                  </span>
                  <UserCheck className="h-3.5 w-3.5 text-[#1271F5]" />
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">patient@healthsync.com</p>
                <span className="inline-block mt-1.5 text-[10px] font-bold text-[#1271F5]">
                  Instant Sign In →
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin('dr.williams@healthsync.com', 'Doctor@123')}
                className="p-3 rounded-2xl bg-[#F8FAFD] border border-slate-200/80 hover:border-emerald-500 hover:bg-emerald-50/50 text-left transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#121A26] group-hover:text-emerald-600">
                    Doctor Account
                  </span>
                  <Stethoscope className="h-3.5 w-3.5 text-emerald-600" />
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">dr.williams@healthsync.com</p>
                <span className="inline-block mt-1.5 text-[10px] font-bold text-emerald-600">
                  Instant Sign In →
                </span>
              </button>
            </div>
          </div>

          {/* 3 Value Pillars */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-2xl bg-white border border-[#E6EBF2] text-center shadow-sm">
              <span className="text-lg">🩺</span>
              <p className="text-xs font-bold text-[#121A26] mt-1">Specialists</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Instant Telehealth</p>
            </div>
            <div className="p-3 rounded-2xl bg-white border border-[#E6EBF2] text-center shadow-sm">
              <span className="text-lg">🏥</span>
              <p className="text-xs font-bold text-[#121A26] mt-1">Live Beds</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Nearby Hospitals</p>
            </div>
            <div className="p-3 rounded-2xl bg-white border border-[#E6EBF2] text-center shadow-sm">
              <span className="text-lg">📁</span>
              <p className="text-xs font-bold text-[#121A26] mt-1">Reports</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Digital Vitals</p>
            </div>
          </div>
        </div>

        {/* Bottom Trust Indicators */}
        <div className="relative z-10 grid grid-cols-4 gap-3 pt-2">
          {[
            { label: 'Patients', value: '12,400+' },
            { label: 'Specialists', value: '340+' },
            { label: 'Rating', value: '4.9 ★' },
            { label: 'Support', value: '24/7' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white border border-[#E6EBF2] rounded-2xl p-2.5 text-center shadow-sm">
              <p className="text-sm font-extrabold text-[#121A26]">{value}</p>
              <p className="text-slate-400 text-[10px] font-medium mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right form container */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 max-w-xl mx-auto w-full">
        <div className="w-full max-w-md bg-white border border-[#E6EBF2] shadow-xl rounded-[32px] p-8 md:p-10">
          
          {/* Header */}
          <div className="mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-[#1271F5] text-[11px] font-bold mb-3">
              <ShieldCheck className="h-3.5 w-3.5" /> HIPAA Encrypted Portal
            </div>
            <h1 className="text-2xl font-extrabold text-[#121A26] tracking-tight">
              Sign in to your account
            </h1>
            <p className="mt-1 text-xs text-slate-500 font-medium">
              Manage appointments, prescriptions & vital health records
            </p>
          </div>

          {/* Social Google Sign-in */}
          <button
            type="button"
            onClick={() => setIsGoogleModalOpen(true)}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-2xl border border-slate-200 bg-[#FAFBFD] hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-sm transition-all active:scale-95 mb-5"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-wider">
              <span className="bg-white px-3 text-slate-400 font-bold">Or with credentials</span>
            </div>
          </div>

          {/* Auth Method Switcher Tabs */}
          <div className="flex p-1 rounded-2xl bg-[#F4F6FA] border border-[#E6EBF2] mb-5">
            <button
              type="button"
              onClick={() => setAuthMethod('EMAIL')}
              className={cn(
                'flex-1 py-2 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5',
                authMethod === 'EMAIL'
                  ? 'bg-white text-[#1271F5] shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              <Mail className="h-3.5 w-3.5" />
              <span>Email & Password</span>
            </button>
            <button
              type="button"
              onClick={() => setAuthMethod('PHONE')}
              className={cn(
                'flex-1 py-2 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5',
                authMethod === 'PHONE'
                  ? 'bg-white text-[#1271F5] shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              <Phone className="h-3.5 w-3.5" />
              <span>Phone OTP</span>
            </button>
          </div>

          {/* Form 1: Email & Password */}
          {authMethod === 'EMAIL' ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    type="email"
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-[#FAFBFD] text-xs text-[#121A26] placeholder:text-slate-400 focus:bg-white focus:border-[#1271F5] focus:outline-none focus:ring-2 focus:ring-[#1271F5]/10"
                    {...register('email', { required: 'Email is required' })}
                  />
                </div>
                {errors.email && <p className="text-[11px] text-rose-500 mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Password</label>
                  <button
                    type="button"
                    onClick={() => setForgotModalOpen(true)}
                    className="text-[11px] font-bold text-[#1271F5] hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-2xl border border-slate-200 bg-[#FAFBFD] text-xs text-[#121A26] placeholder:text-slate-400 focus:bg-white focus:border-[#1271F5] focus:outline-none focus:ring-2 focus:ring-[#1271F5]/10"
                    {...register('password', { required: 'Password is required' })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-[11px] text-rose-500 mt-1">{errors.password.message}</p>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-full bg-[#1271F5] hover:bg-[#0b5cd5] text-white text-xs font-bold shadow-md shadow-[#1271F5]/25 active:scale-95 transition-all flex items-center justify-center gap-2 mt-2"
              >
                {loading ? 'Authenticating...' : 'Sign In to Portal →'}
              </button>
            </form>
          ) : (
            /* Form 2: Phone OTP */
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Phone Number</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-[#FAFBFD] text-xs text-[#121A26] focus:bg-white focus:border-[#1271F5] focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSendPhoneOtp}
                    disabled={phoneLoading || cooldown > 0}
                    className="px-4 py-2.5 rounded-2xl bg-[#1271F5] text-white text-xs font-bold hover:bg-[#0b5cd5] disabled:opacity-50 transition-all whitespace-nowrap shadow-sm"
                  >
                    {cooldown > 0 ? `${cooldown}s` : otpSent ? 'Resend' : 'Send OTP'}
                  </button>
                </div>
              </div>

              {otpSent && (
                <div className="space-y-3 pt-2">
                  <label className="block text-xs font-bold text-slate-700">Enter 6-Digit Code</label>
                  <div className="flex justify-between gap-2">
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => (otpInputsRef.current[idx] = el)}
                        type="text"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        className="w-11 h-12 text-center text-base font-extrabold rounded-2xl border border-slate-200 bg-[#FAFBFD] focus:border-[#1271F5] focus:bg-white focus:outline-none shadow-sm"
                      />
                    ))}
                  </div>

                  {debugOtp && (
                    <p className="text-[11px] text-[#1271F5] font-semibold bg-blue-50 p-2 rounded-xl border border-blue-100">
                      Debug OTP: <strong>{debugOtp}</strong>
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={handleVerifyPhoneOtp}
                    disabled={phoneLoading}
                    className="w-full py-3 rounded-full bg-[#1271F5] hover:bg-[#0b5cd5] text-white text-xs font-bold shadow-md shadow-[#1271F5]/25 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    {phoneLoading ? 'Verifying...' : 'Verify Code & Sign In →'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Bottom link to Register */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500 font-medium">
              Don't have an account yet?{' '}
              <Link to="/register" className="font-bold text-[#1271F5] hover:underline">
                Create new account
              </Link>
            </p>
          </div>

        </div>
      </div>

      {/* Google Auth Modal */}
      {isGoogleModalOpen && (
        <GoogleAuthModal
          isOpen={isGoogleModalOpen}
          onClose={() => setIsGoogleModalOpen(false)}
          onSelectAccount={handleGoogleAccountSelected}
        />
      )}

      {/* Forgot Password Modal */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-base text-[#121A26]">Password Recovery</h3>
              <button
                onClick={() => setForgotModalOpen(false)}
                className="h-8 w-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Enter your account email to receive a secure recovery code.
            </p>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setForgotLoading(true);
                try {
                  await api.post('/auth/forgot-password', { email: forgotEmail });
                  toast({ type: 'success', title: 'Code Dispatched', message: 'Check your email inbox for instructions' });
                  setForgotModalOpen(false);
                } catch (err) {
                  toast({ type: 'error', title: 'Error', message: err.response?.data?.message || 'Email not found' });
                } finally {
                  setForgotLoading(false);
                }
              }}
              className="space-y-4"
            >
              <input
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-[#FAFBFD] text-xs text-[#121A26] focus:border-[#1271F5] focus:outline-none"
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setForgotModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="px-5 py-2 rounded-xl bg-[#1271F5] text-white text-xs font-bold shadow-sm"
                >
                  {forgotLoading ? 'Sending...' : 'Send Recovery Code'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
