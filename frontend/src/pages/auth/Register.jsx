import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Mail, Lock, User, Phone, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/components/ui/Toast';
import GoogleAuthModal from '@/components/shared/GoogleAuthModal';

export default function Register() {
  const navigate = useNavigate();
  const { register: registerUser, loginWithGoogle } = useAuthStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm({ defaultValues: { role: 'PATIENT' } });
  const selectedRole = watch('role');

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const user = await registerUser(data);
      toast({ type: 'success', title: 'Account created!', message: `Welcome to iMed Portal, ${user.firstName}!` });
      navigate(user.role === 'PATIENT' ? '/patient' : '/doctor');
    } catch (err) {
      toast({ type: 'error', title: 'Registration failed', message: err.response?.data?.message || err.message || 'Please try again' });
    } finally {
      setLoading(false);
    }
  };

  // Google Sign-In Handler
  const handleGoogleAccountSelected = async (googleUser) => {
    setLoading(true);
    try {
      const user = await loginWithGoogle({ ...googleUser, role: selectedRole || 'PATIENT' });
      setIsGoogleModalOpen(false);
      toast({ type: 'success', title: 'Google Registration Successful', message: `Welcome, ${user.firstName}!` });
      navigate(user.role === 'PATIENT' ? '/patient' : '/doctor');
    } catch (err) {
      toast({ type: 'error', title: 'Google registration failed', message: err.response?.data?.message || 'Please try again' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F6FA] p-6 font-sans select-none">
      <div className="w-full max-w-md">
        
        {/* Brand header */}
        <div className="flex items-center gap-3 mb-6 justify-center">
          <div className="h-10 w-10 rounded-2xl bg-[#1271F5] flex items-center justify-center shadow-md shadow-[#1271F5]/25">
            <div className="h-4 w-4 rounded-full bg-white flex items-center justify-center">
              <div className="h-2 w-2 rounded-full bg-[#1271F5]" />
            </div>
          </div>
          <div>
            <span className="font-extrabold text-xl text-[#121A26] tracking-tight">iMed Portal</span>
            <p className="text-[10px] text-[#1271F5] font-semibold -mt-0.5">Healthcare & Clinical System</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white border border-[#E6EBF2] p-8 md:p-9 rounded-[32px] shadow-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-[#1271F5] text-[11px] font-bold mb-3">
            <ShieldCheck className="h-3.5 w-3.5" /> Encrypted Healthcare Account
          </div>
          <h1 className="text-2xl font-extrabold text-[#121A26] tracking-tight">Create your account</h1>
          <p className="mt-1 text-xs text-slate-500 font-medium">Join iMed Portal to manage consultations, EHR records & vitals</p>

          {/* Social Google Sign-up Button */}
          <div className="mt-5">
            <button
              type="button"
              onClick={() => setIsGoogleModalOpen(true)}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-2xl border border-slate-200 bg-[#FAFBFD] hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-sm transition-all active:scale-95"
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Sign up with Google</span>
            </button>
          </div>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-wider">
              <span className="bg-white px-3 text-slate-400 font-bold">Or register with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">First name</label>
                <input
                  type="text"
                  placeholder="Raj"
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-[#FAFBFD] text-xs text-[#121A26] focus:bg-white focus:border-[#1271F5] focus:outline-none"
                  {...register('firstName', { required: 'Required' })}
                />
                {errors.firstName && <p className="text-[10px] text-rose-500 mt-1">{errors.firstName.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Last name</label>
                <input
                  type="text"
                  placeholder="De"
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-[#FAFBFD] text-xs text-[#121A26] focus:bg-white focus:border-[#1271F5] focus:outline-none"
                  {...register('lastName', { required: 'Required' })}
                />
                {errors.lastName && <p className="text-[10px] text-rose-500 mt-1">{errors.lastName.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="email"
                  placeholder="raj.de@example.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-[#FAFBFD] text-xs text-[#121A26] focus:bg-white focus:border-[#1271F5] focus:outline-none"
                  {...register('email', { required: 'Email is required' })}
                />
              </div>
              {errors.email && <p className="text-[10px] text-rose-500 mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phone (optional)</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-[#FAFBFD] text-xs text-[#121A26] focus:bg-white focus:border-[#1271F5] focus:outline-none"
                  {...register('phone')}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Password (min 8 chars)</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-[#FAFBFD] text-xs text-[#121A26] focus:bg-white focus:border-[#1271F5] focus:outline-none"
                  {...register('password', {
                    required: 'Password required',
                    minLength: { value: 8, message: 'Minimum 8 characters' }
                  })}
                />
              </div>
              {errors.password && <p className="text-[10px] text-rose-500 mt-1">{errors.password.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">I am registering as a</label>
              <select
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-[#FAFBFD] text-xs text-[#121A26] font-medium focus:bg-white focus:border-[#1271F5] focus:outline-none cursor-pointer"
                {...register('role')}
              >
                <option value="PATIENT">Patient</option>
                <option value="DOCTOR">Doctor / Specialist</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-full bg-[#1271F5] hover:bg-[#0b5cd5] text-white text-xs font-bold shadow-md shadow-[#1271F5]/25 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {loading ? 'Creating account...' : 'Create Account →'}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500 font-medium">
              Already have an account?{' '}
              <Link to="/login" className="font-bold text-[#1271F5] hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>

      </div>

      {isGoogleModalOpen && (
        <GoogleAuthModal
          isOpen={isGoogleModalOpen}
          onClose={() => setIsGoogleModalOpen(false)}
          onSelectAccount={handleGoogleAccountSelected}
        />
      )}
    </div>
  );
}
