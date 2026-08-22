import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Activity, Mail, Lock, Eye, EyeOff, ArrowRight, Phone, KeyRound, Sparkles, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/components/ui/Toast';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

export default function Login() {
  const navigate = useNavigate();
  const { login, loginWithGoogle, loginWithPhoneOtp } = useAuthStore();
  const { toast } = useToast();

  const [authMethod, setAuthMethod] = useState('EMAIL'); // 'EMAIL' | 'PHONE'
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Phone OTP Login States
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [debugOtp, setDebugOtp] = useState('');

  // Forgot Password Modal States
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1 = Enter Email, 2 = Enter OTP & New Password
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotDebugOtp, setForgotDebugOtp] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm();

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

  // Send Phone OTP
  const handleSendPhoneOtp = async () => {
    if (!phone || phone.length < 8) {
      return toast({ type: 'error', title: 'Invalid Phone', message: 'Please enter a valid phone number' });
    }
    setPhoneLoading(true);
    try {
      const res = await api.post('/auth/send-otp', { phone });
      setOtpSent(true);
      if (res.data.data?.debugOtp) {
        setDebugOtp(res.data.data.debugOtp);
      }
      toast({ type: 'success', title: 'OTP Sent', message: 'Verification code sent to your phone' });
    } catch (err) {
      toast({ type: 'error', title: 'Error sending OTP', message: err.response?.data?.message || 'Failed to send OTP' });
    } finally {
      setPhoneLoading(false);
    }
  };

  // Verify Phone OTP
  const handleVerifyPhoneOtp = async () => {
    if (!otp || otp.length < 4) {
      return toast({ type: 'error', title: 'Invalid Code', message: 'Please enter the verification code' });
    }
    setPhoneLoading(true);
    try {
      const user = await loginWithPhoneOtp(phone, otp);
      toast({ type: 'success', title: 'Welcome!', message: `Logged in as ${user.firstName}` });
      navigateByRole(user);
    } catch (err) {
      toast({ type: 'error', title: 'Verification failed', message: err.response?.data?.message || 'Invalid OTP' });
    } finally {
      setPhoneLoading(false);
    }
  };

  // Google OAuth Login
  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      // In production with Google OAuth Client ID, this receives token from Google OAuth provider
      const googleUser = {
        email: 'alex.morgan.health@gmail.com',
        firstName: 'Alex',
        lastName: 'Morgan',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        googleId: 'google-oauth-10928374'
      };
      const user = await loginWithGoogle(googleUser);
      toast({ type: 'success', title: 'Google Sign-In Successful', message: `Welcome ${user.firstName}!` });
      navigateByRole(user);
    } catch (err) {
      toast({ type: 'error', title: 'Google login failed', message: err.response?.data?.message || 'Authentication error' });
    } finally {
      setLoading(false);
    }
  };

  // Forgot Password - Step 1
  const handleRequestResetOtp = async () => {
    if (!forgotEmail || !forgotEmail.includes('@')) {
      return toast({ type: 'error', title: 'Invalid Email', message: 'Please enter a valid email address' });
    }
    setForgotLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email: forgotEmail });
      setForgotStep(2);
      if (res.data.data?.debugOtp) {
        setForgotDebugOtp(res.data.data.debugOtp);
      }
      toast({ type: 'success', title: 'Reset Code Sent', message: 'Check your email for the 6-digit recovery code' });
    } catch (err) {
      toast({ type: 'error', title: 'Error', message: err.response?.data?.message || 'Could not process request' });
    } finally {
      setForgotLoading(false);
    }
  };

  // Forgot Password - Step 2
  const handleConfirmPasswordReset = async () => {
    if (!forgotOtp || newPassword.length < 8) {
      return toast({ type: 'error', title: 'Incomplete', message: 'Password must be at least 8 characters' });
    }
    setForgotLoading(true);
    try {
      await api.post('/auth/reset-password', {
        email: forgotEmail,
        otp: forgotOtp,
        newPassword
      });
      toast({ type: 'success', title: 'Password Reset Complete', message: 'You can now sign in with your new password.' });
      setForgotModalOpen(false);
      setForgotStep(1);
    } catch (err) {
      toast({ type: 'error', title: 'Reset failed', message: err.response?.data?.message || 'Invalid or expired code' });
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[var(--bg-primary)]">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-brand-600 via-violet-600 to-brand-800 p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 h-72 w-72 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-20 right-20 h-96 w-96 rounded-full bg-white blur-3xl" />
        </div>
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <span className="text-white font-bold text-xl">HealthSync</span>
          </div>
          <h2 className="mt-12 text-4xl font-bold text-white leading-tight">
            Your health,<br />managed smarter.
          </h2>
          <p className="mt-4 text-white/70 text-lg leading-relaxed max-w-sm">
            AI-powered appointment management with real-time summaries, EHR records, and seamless care coordination.
          </p>
        </div>
        <div className="relative grid grid-cols-2 gap-4">
          {[
            { label: 'Active Patients', value: '12,400+' },
            { label: 'Doctors',         value: '340+' },
            { label: 'Appointments',    value: '98,000+' },
            { label: 'Satisfaction',    value: '4.9★' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white/10 backdrop-blur rounded-2xl p-4">
              <p className="text-2xl font-bold text-white">{value}</p>
              <p className="text-white/60 text-sm mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 max-w-xl mx-auto w-full">
        <div className="w-full max-w-sm">
          {/* Mobile brand */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg text-[var(--text-primary)]">HealthSync</span>
          </div>

          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Welcome back</h1>
          <p className="mt-1.5 text-sm text-[var(--text-secondary)]">Sign in to your account to continue</p>

          {/* Social Google Login Button */}
          <div className="mt-6">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-sm font-semibold shadow-sm transition-all hover:shadow"
            >
              {/* Google G SVG */}
              <svg className="h-4 w-4" viewBox="0 0 24 24">
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
          <div className="flex p-1 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border)] mb-6 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setAuthMethod('EMAIL')}
              className={cn(
                'flex-1 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5',
                authMethod === 'EMAIL' ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)]'
              )}
            >
              <Mail className="h-3.5 w-3.5" /> Email & Password
            </button>
            <button
              type="button"
              onClick={() => setAuthMethod('PHONE')}
              className={cn(
                'flex-1 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5',
                authMethod === 'PHONE' ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)]'
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

              <Button type="submit" loading={loading} className="w-full" size="lg" iconRight={ArrowRight}>
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
                    <label className="block text-sm font-medium text-[var(--text-secondary)]">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)] pointer-events-none" />
                      <input
                        type="tel"
                        placeholder="+91 98765 43210"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="input-base pl-10"
                      />
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={handleSendPhoneOtp}
                    loading={phoneLoading}
                    className="w-full bg-brand-600 text-white font-bold"
                    size="lg"
                    iconRight={ArrowRight}
                  >
                    Send Verification Code
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-3 bg-brand-50 dark:bg-brand-500/10 rounded-xl border border-brand-200 dark:border-brand-900/50 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-brand-700 dark:text-brand-300">Code sent to {phone}</p>
                      {debugOtp && <p className="text-[10px] text-brand-600 font-mono mt-0.5">Code: {debugOtp}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => setOtpSent(false)}
                      className="text-brand-600 font-bold hover:underline"
                    >
                      Change
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-[var(--text-secondary)]">Enter 6-Digit OTP</label>
                    <div className="relative">
                      <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)] pointer-events-none" />
                      <input
                        type="text"
                        maxLength="6"
                        placeholder="123456"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        className="input-base pl-10 tracking-widest text-center text-base font-bold font-mono"
                      />
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={handleVerifyPhoneOtp}
                    loading={phoneLoading}
                    className="w-full bg-brand-600 text-white font-bold"
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

      {/* Forgot Password Reset Modal */}
      <Modal open={forgotModalOpen} onClose={() => setForgotModalOpen(false)} title="Reset Password" size="sm">
        <div className="p-6 space-y-4 text-xs">
          {forgotStep === 1 ? (
            <div className="space-y-4">
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                Enter your registered email address and we'll send you a 6-digit recovery code to reset your password.
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
                  Send Code
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-brand-50 dark:bg-brand-500/10 rounded-xl border border-brand-200 text-xs">
                <p className="font-semibold text-brand-700 dark:text-brand-300">Code sent to {forgotEmail}</p>
                {forgotDebugOtp && <p className="text-[10px] text-brand-600 font-mono mt-0.5">Code: {forgotDebugOtp}</p>}
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">6-Digit Reset Code</label>
                <input
                  type="text"
                  maxLength="6"
                  placeholder="123456"
                  value={forgotOtp}
                  onChange={(e) => setForgotOtp(e.target.value)}
                  className="input-base text-center font-mono font-bold tracking-widest"
                />
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
