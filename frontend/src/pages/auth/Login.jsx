import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  Activity, Mail, Lock, Eye, EyeOff, ArrowRight, Phone, KeyRound,
  CheckCircle2, ArrowLeft, ShieldCheck, RefreshCw, Award, Star, Clock,
  HeartPulse, Stethoscope, Sparkles
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/components/ui/Toast';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import GoogleAuthModal from '@/components/shared/GoogleAuthModal';
import { useGoogleLogin } from '@react-oauth/google';
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

  const { register, handleSubmit, formState: { errors } } = useForm();

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const navigateByRole = (user) => {
    const routes = { PATIENT: '/patient', DOCTOR: '/doctor', ADMIN: '/admin', DRIVER: '/driver' };
    navigate(routes[user?.role] || '/');
  };

  // Standard Email/Password login
  const onSubmit = async ({ email, password }) => {
    setLoading(true);
    try {
      const user = await login(email, password);
      toast({ type: 'success', title: 'Welcome back!', message: `Logged in as ${user.firstName}` });
      navigateByRole(user);
    } catch (err) {
      toast({ type: 'error', title: 'Login failed', message: err.response?.data?.message || 'Invalid credentials' });
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
      toast({ type: 'success', title: 'Google Sign-In Successful', message: `Welcome back, ${user.firstName}!` });
      navigateByRole(user);
    } catch (err) {
      toast({ type: 'error', title: 'Google authentication failed', message: err.response?.data?.message || 'Please try again' });
    } finally {
      setLoading(false);
    }
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
      setCooldown(30); // 30 seconds resend cooldown
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

  // Handle individual digit typing for Phone OTP
  const handleOtpChange = (index, value) => {
    if (value.length > 1) {
      // Paste support
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

  // Verify Phone OTP
  const handleVerifyPhoneOtp = async () => {
    const fullOtp = otpDigits.join('');
    if (fullOtp.length < 6) {
      return toast({ type: 'error', title: 'Incomplete Code', message: 'Please enter the 6-digit OTP' });
    }
    setPhoneLoading(true);
    try {
      const user = await loginWithPhoneOtp(phone, fullOtp);
      toast({ type: 'success', title: 'Verified Successfully', message: `Welcome, ${user.firstName}!` });
      navigateByRole(user);
    } catch (err) {
      toast({ type: 'error', title: 'Verification failed', message: err.response?.data?.message || 'Invalid or expired OTP' });
    } finally {
      setPhoneLoading(false);
    }
  };

  // Forgot Password - Step 1: Send recovery OTP to email
  const handleRequestResetOtp = async () => {
    if (!forgotEmail || !forgotEmail.includes('@')) {
      return toast({ type: 'error', title: 'Invalid Email', message: 'Please enter a valid email address' });
    }
    setForgotLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email: forgotEmail });
      setForgotStep(2);
      setForgotOtpDigits(['', '', '', '', '', '']);
      if (res.data.data?.debugOtp) {
        setForgotDebugOtp(res.data.data.debugOtp);
      }
      toast({ type: 'success', title: 'Recovery Code Sent', message: '6-digit reset code has been sent to your email' });
    } catch (err) {
      toast({ type: 'error', title: 'Error', message: err.response?.data?.message || 'Could not process request' });
    } finally {
      setForgotLoading(false);
    }
  };

  // Forgot Password - Step 2: Verify OTP and save new password
  const handleConfirmPasswordReset = async () => {
    const fullOtp = forgotOtpDigits.join('');
    if (fullOtp.length < 6) {
      return toast({ type: 'error', title: 'Incomplete Code', message: 'Please enter the 6-digit recovery code' });
    }
    if (newPassword.length < 8) {
      return toast({ type: 'error', title: 'Weak Password', message: 'Password must be at least 8 characters' });
    }
    if (newPassword !== confirmPassword) {
      return toast({ type: 'error', title: 'Password Mismatch', message: 'Passwords do not match' });
    }

    setForgotLoading(true);
    try {
      await api.post('/auth/reset-password', {
        email: forgotEmail,
        otp: fullOtp,
        newPassword
      });
      toast({ type: 'success', title: 'Password Updated', message: 'Your password has been reset. Please sign in.' });
      setForgotModalOpen(false);
      setForgotStep(1);
    } catch (err) {
      toast({ type: 'error', title: 'Reset failed', message: err.response?.data?.message || 'Invalid or expired code' });
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[var(--bg-primary)] overflow-hidden">
      {/* Left decorative medical showcase panel */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-[#071322] via-[#0a1e35] to-[#041a23] p-10 flex-col justify-between relative overflow-hidden border-r border-teal-500/15">
        
        {/* Soft background ambient lighting */}
        <div className="absolute top-[-5%] left-[-5%] h-80 w-80 rounded-full bg-teal-500/15 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-5%] right-[-5%] h-96 w-96 rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />

        {/* Top Header: Brand Logo */}
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-teal-400 via-cyan-500 to-blue-600 p-[1.5px] shadow-lg shadow-teal-500/25">
                <div className="h-full w-full bg-[#07172b] rounded-2xl flex items-center justify-center">
                  <Activity className="h-6 w-6 text-teal-400" />
                </div>
              </div>
              <div>
                <span className="text-white font-extrabold text-2xl tracking-tight">HealthSync</span>
                <p className="text-xs text-teal-300/80 font-medium">Healthcare & Wellness Portal</p>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Care Network Online</span>
            </div>
          </div>
        </div>

        {/* Middle Showcase: Photo Banner + Inspirational Quote */}
        <div className="relative z-10 my-auto py-4 space-y-5 max-w-lg">
          
          {/* Aesthetic Medical Picture Card */}
          <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-teal-500/20 group">
            <img
              src="/healthcare_hero.jpg"
              alt="Medical Care Team"
              className="w-full h-52 object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#071322] via-transparent to-transparent" />
            
            <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#071322]/80 border border-teal-500/30 text-teal-200 text-xs font-semibold backdrop-blur-md">
                <ShieldCheck className="h-3.5 w-3.5 text-teal-400" />
                Trusted by 12,000+ Families
              </div>
              <span className="text-xs font-bold text-emerald-300 bg-emerald-950/70 px-2.5 py-1 rounded-full border border-emerald-500/30 backdrop-blur-md">
                24/7 Care
              </span>
            </div>
          </div>

          {/* Inspirational Healthcare Quote */}
          <div className="p-5 rounded-2xl bg-[#091b30]/80 border border-teal-500/20 backdrop-blur-md shadow-lg relative">
            <div className="text-teal-400 text-3xl font-serif leading-none mb-1 opacity-60">“</div>
            <p className="text-slate-200 text-sm font-medium italic leading-relaxed pl-2">
              Wherever the art of Medicine is loved, there is also a love of Humanity.
            </p>
            <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-700/50 pl-2">
              <span className="text-xs font-bold text-teal-300">— Hippocrates</span>
              <span className="text-[11px] text-slate-400">Father of Modern Medicine</span>
            </div>
          </div>

          {/* 3 Simple Healthcare Pillars */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-3 rounded-xl bg-[#07172b]/80 border border-slate-700/60 text-center">
              <span className="text-lg">🩺</span>
              <p className="text-xs font-bold text-white mt-1">Specialists</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Top Verified Doctors</p>
            </div>
            <div className="p-3 rounded-xl bg-[#07172b]/80 border border-slate-700/60 text-center">
              <span className="text-lg">🏥</span>
              <p className="text-xs font-bold text-white mt-1">Hospitals</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Live Bed & SOS</p>
            </div>
            <div className="p-3 rounded-xl bg-[#07172b]/80 border border-slate-700/60 text-center">
              <span className="text-lg">📁</span>
              <p className="text-xs font-bold text-white mt-1">Records</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Digital EHR History</p>
            </div>
          </div>
        </div>

        {/* Bottom Simple Metrics Bar */}
        <div className="relative z-10 grid grid-cols-4 gap-2.5 pt-2">
          {[
            { label: 'Patients', value: '12,400+' },
            { label: 'Doctors', value: '340+' },
            { label: 'Rating', value: '4.9★' },
            { label: 'Support', value: '24/7' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-[#07172b]/80 border border-slate-800 backdrop-blur-md rounded-xl p-2.5 text-center">
              <p className="text-sm xl:text-base font-extrabold text-white">{value}</p>
              <p className="text-slate-400 text-[10px] font-medium mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right form container */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 max-w-xl mx-auto w-full">
        <div className="w-full max-w-sm">
          {/* Mobile brand */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-teal-400 to-blue-600 flex items-center justify-center shadow-lg shadow-teal-500/25">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-lg text-[var(--text-primary)]">HealthSync</span>
              <p className="text-[10px] text-teal-500 font-bold uppercase tracking-wider">Clinical Care Portal</p>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Welcome back</h1>
          <p className="mt-1.5 text-sm text-[var(--text-secondary)]">Sign in to your account to continue</p>

          {/* Social Google Login Button */}
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setIsGoogleModalOpen(true)}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-sm font-semibold shadow-sm transition-all hover:shadow hover:border-brand-500/50"
            >
              {/* Google G Multi-Color SVG */}
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--border)]" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[var(--bg-primary)] px-2 text-[var(--text-muted)] font-medium">Or sign in with</span>
            </div>
          </div>

          {/* Method Tabs: Email vs Phone */}
          <div className="flex p-1 rounded-2xl bg-[var(--bg-tertiary)] border border-[var(--border)] mb-6 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setAuthMethod('EMAIL')}
              className={cn(
                'flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5',
                authMethod === 'EMAIL' ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              )}
            >
              <Mail className="h-3.5 w-3.5" /> Email & Password
            </button>
            <button
              type="button"
              onClick={() => setAuthMethod('PHONE')}
              className={cn(
                'flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5',
                authMethod === 'PHONE' ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              )}
            >
              <Phone className="h-3.5 w-3.5" /> Phone & OTP
            </button>
          </div>

          {/* Email / Password Form */}
          {authMethod === 'EMAIL' && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Email address"
                type="email"
                icon={Mail}
                placeholder="you@example.com"
                error={errors.email?.message}
                {...register('email', { required: 'Email is required' })}
              />

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-[var(--text-secondary)]">Password</label>
                  <button
                    type="button"
                    onClick={() => { setForgotModalOpen(true); setForgotStep(1); }}
                    className="text-xs text-brand-600 dark:text-brand-400 font-semibold hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)] pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className={cn('input-base pl-10 pr-10', errors.password && 'border-danger-500')}
                    {...register('password', { required: 'Password is required' })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-danger-500">{errors.password.message}</p>}
              </div>

              <Button type="submit" loading={loading} className="w-full h-11" size="lg" iconRight={ArrowRight}>
                Sign in
              </Button>
            </form>
          )}

          {/* Phone Number & OTP Form */}
          {authMethod === 'PHONE' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {!otpSent ? (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-[var(--text-secondary)]">Mobile Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)] pointer-events-none" />
                      <input
                        type="tel"
                        placeholder="9876543210 or +91 9876543210"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="input-base pl-10"
                      />
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)]">We will send a 6-digit OTP code to verify your mobile number.</p>
                  </div>

                  <Button
                    type="button"
                    onClick={handleSendPhoneOtp}
                    loading={phoneLoading}
                    className="w-full h-11 bg-brand-600 text-white font-bold"
                    size="lg"
                    iconRight={ArrowRight}
                  >
                    Send Verification Code
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-3 bg-brand-50 dark:bg-brand-500/10 rounded-2xl border border-brand-200 dark:border-brand-900/50 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-brand-700 dark:text-brand-300">Code sent to {phone}</p>
                      {debugOtp && <p className="text-[10px] text-brand-600 font-mono mt-0.5 font-bold">Auto-Test Code: {debugOtp}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => setOtpSent(false)}
                      className="text-brand-600 dark:text-brand-400 font-bold hover:underline"
                    >
                      Change
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-[var(--text-secondary)]">Enter 6-Digit Code</label>
                      {cooldown > 0 ? (
                        <span className="text-[11px] text-[var(--text-muted)] font-medium">Resend in {cooldown}s</span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSendPhoneOtp}
                          className="text-[11px] text-brand-600 dark:text-brand-400 font-bold hover:underline flex items-center gap-1"
                        >
                          <RefreshCw className="h-3 w-3" /> Resend OTP
                        </button>
                      )}
                    </div>

                    {/* 6 Individual Digit Inputs */}
                    <div className="flex justify-between gap-2">
                      {otpDigits.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={el => otpInputsRef.current[idx] = el}
                          type="text"
                          maxLength="1"
                          value={digit}
                          onChange={(e) => handleOtpChange(idx, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                          className="h-12 w-11 text-center font-mono font-bold text-lg rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 shadow-sm"
                        />
                      ))}
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={handleVerifyPhoneOtp}
                    loading={phoneLoading}
                    className="w-full h-11 bg-brand-600 text-white font-bold"
                    size="lg"
                    icon={CheckCircle2}
                  >
                    Verify & Sign In
                  </Button>
                </div>
              )}
            </div>
          )}

          <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
            No account?{' '}
            <Link to="/register" className="text-brand-600 dark:text-brand-400 font-medium hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>

      {/* Google Account Modal */}
      <GoogleAuthModal
        isOpen={isGoogleModalOpen}
        onClose={() => setIsGoogleModalOpen(false)}
        onSelectAccount={handleGoogleAccountSelected}
        loading={loading}
      />

      {/* Forgot Password Reset Modal */}
      <Modal open={forgotModalOpen} onClose={() => setForgotModalOpen(false)} title="Reset Password" size="sm">
        <div className="p-6 space-y-4 text-xs">
          {forgotStep === 1 ? (
            <div className="space-y-4">
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                Enter your registered email address and we'll send a 6-digit recovery code to reset your account password.
              </p>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="input-base"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="secondary" className="flex-1" onClick={() => setForgotModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-brand-600 text-white font-bold"
                  loading={forgotLoading}
                  onClick={handleRequestResetOtp}
                >
                  Send Recovery Code
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-brand-50 dark:bg-brand-500/10 rounded-2xl border border-brand-200 text-xs">
                <p className="font-semibold text-brand-700 dark:text-brand-300">Code sent to {forgotEmail}</p>
                {forgotDebugOtp && <p className="text-[10px] text-brand-600 font-mono mt-0.5 font-bold">Auto-Test Code: {forgotDebugOtp}</p>}
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-2">6-Digit Recovery Code</label>
                <div className="flex justify-between gap-1.5">
                  {forgotOtpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={el => forgotOtpInputsRef.current[idx] = el}
                      type="text"
                      maxLength="1"
                      value={digit}
                      onChange={(e) => {
                        const next = [...forgotOtpDigits];
                        next[idx] = e.target.value.replace(/[^0-9]/g, '');
                        setForgotOtpDigits(next);
                        if (e.target.value && idx < 5) forgotOtpInputsRef.current[idx + 1]?.focus();
                      }}
                      className="h-10 w-9 text-center font-mono font-bold text-base rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]"
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">New Password</label>
                <input
                  type="password"
                  placeholder="Min. 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input-base"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Confirm New Password</label>
                <input
                  type="password"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-base"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="secondary" className="flex-1" onClick={() => setForgotStep(1)} icon={ArrowLeft}>
                  Back
                </Button>
                <Button
                  className="flex-1 bg-brand-600 text-white font-bold"
                  loading={forgotLoading}
                  onClick={handleConfirmPasswordReset}
                >
                  Reset Password
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
