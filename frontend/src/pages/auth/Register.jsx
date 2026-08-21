import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Activity, Mail, Lock, User, Phone, ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/components/ui/Toast';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';

export default function Register() {
  const navigate = useNavigate();
  const { register: registerUser } = useAuthStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, watch, formState: { errors } } = useForm({ defaultValues: { role: 'PATIENT' } });

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-lg text-[var(--text-primary)]">HealthSync</span>
        </div>

        <div className="card p-6">
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Create account</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Join HealthSync to manage your healthcare</p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
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
              label="Phone (optional)"
              type="tel"
              icon={Phone}
              placeholder="+1 234 567 890"
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
              label="I am a"
              {...register('role')}
            >
              <option value="PATIENT">Patient</option>
              <option value="DOCTOR">Doctor</option>
            </Select>

            <Button type="submit" loading={loading} className="w-full" size="lg" iconRight={ArrowRight}>
              Create account
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-[var(--text-secondary)]">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-600 dark:text-brand-400 font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
