import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Activity, Mail, Lock, User, Phone, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/components/ui/Toast';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import GoogleAuthModal from '@/components/shared/GoogleAuthModal';

export default function Register() {
  const navigate = useNavigate();
  const { register: registerUser, loginWithGoogle } = useAuthStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({ defaultValues: { role: 'PATIENT' } });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const user = await registerUser(data);
      toast({ type: 'success', title: 'Account created!', message: `Welcome to HealthSync, ${user.firstName}!` });
      navigate(user.role === 'PATIENT' ? '/patient' : '/doctor');
    } catch (err) {
      toast({ type: 'error', title: 'Registration failed', message: err.response?.data?.message || 'Please try again' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAccountSelected = async (googleUser) => {
    setLoading(true);
    try {
      const user = await loginWithGoogle(googleUser);
      setIsGoogleModalOpen(false);
      toast({ type: 'success', title: 'Google Registration Successful', message: `Welcome to HealthSync, ${user.firstName}!` });
      navigate(user.role === 'PATIENT' ? '/patient' : '/doctor');
    } catch (err) {
      toast({ type: 'error', title: 'Google registration failed', message: err.response?.data?.message || 'Please try again' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-lg text-[var(--text-primary)]">HealthSync</span>
        </div>

        <div className="card p-6 shadow-xl">
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Create an account</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Join HealthSync to manage your healthcare and EHR</p>

          {/* Social Google Sign-up Button */}
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
              <span>Sign up with Google</span>
            </button>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--border)]" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[var(--bg-secondary)] px-2 text-[var(--text-muted)] font-medium">Or register with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="First name"
                placeholder="John"
                icon={User}
                error={errors.firstName?.message}
                {...register('firstName', { required: 'Required' })}
              />
              <Input
                label="Last name"
                placeholder="Doe"
                error={errors.lastName?.message}
                {...register('lastName', { required: 'Required' })}
              />
            </div>

            <Input
              label="Email"
              type="email"
              icon={Mail}
              placeholder="you@example.com"
              error={errors.email?.message}
              {...register('email', { required: 'Email is required' })}
            />

            <Input
              label="Phone"
              type="tel"
              icon={Phone}
              placeholder="+91 98765 43210"
              {...register('phone')}
            />

            <Input
              label="Password"
              type="password"
              icon={Lock}
              placeholder="Min. 8 characters"
              error={errors.password?.message}
              {...register('password', { required: 'Required', minLength: { value: 8, message: 'Min 8 characters' } })}
            />

            <Select
              label="I am registering as a"
              {...register('role')}
            >
              <option value="PATIENT">Patient</option>
              <option value="DOCTOR">Doctor / Specialist</option>
            </Select>

            <Button type="submit" loading={loading} className="w-full h-11" size="lg" iconRight={ArrowRight}>
              Create account
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-[var(--text-secondary)]">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-600 dark:text-brand-400 font-medium hover:underline">Sign in</Link>
        </p>
      </div>

      {/* Google Account Chooser Modal */}
      <GoogleAuthModal
        isOpen={isGoogleModalOpen}
        onClose={() => setIsGoogleModalOpen(false)}
        onSelectAccount={handleGoogleAccountSelected}
        loading={loading}
      />
    </div>
  );
}
