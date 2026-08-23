import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Avatar from '@/components/ui/Avatar';
import { useToast } from '@/components/ui/Toast';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { User, Mail, Phone, Shield, Save } from 'lucide-react';

export default function PatientProfile() {
  const { user, fetchMe } = useAuthStore();
  const { toast } = useToast();

  const { register, handleSubmit, formState: { isDirty } } = useForm({
    defaultValues: {
      firstName: user?.firstName,
      lastName:  user?.lastName,
      phone:     user?.phone,
    },
  });

  const mutation = useMutation({
    mutationFn: (data) => api.put('/auth/profile', data),
    onSuccess: async () => {
      await fetchMe();
      toast({ type: 'success', title: 'Profile updated' });
    },
    onError: () => toast({ type: 'error', title: 'Update failed' }),
  });

  const passwordForm = useForm();
  const passwordMutation = useMutation({
    mutationFn: (data) => api.put('/auth/change-password', data),
    onSuccess: () => {
      toast({ type: 'success', title: 'Password changed' });
      passwordForm.reset();
    },
    onError: (err) => toast({ type: 'error', message: err.response?.data?.message }),
  });

  return (
    <DashboardLayout title="My Profile">
      <div className="max-w-2xl mx-auto space-y-5">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">My Profile</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">Manage your personal information</p>
        </div>

        {/* Avatar card */}
        <Card>
          <CardContent className="flex items-center gap-5">
            <Avatar firstName={user?.firstName} lastName={user?.lastName} src={user?.avatar} size="2xl" />
            <div>
              <p className="font-bold text-lg text-[var(--text-primary)]">{user?.firstName} {user?.lastName}</p>
              <p className="text-sm text-[var(--text-muted)]">{user?.email}</p>
              <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300 text-xs font-medium">
                <Shield className="h-3 w-3" />
                Patient
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile form */}
        <Card>
          <CardContent className="space-y-4">
            <h3 className="font-semibold text-[var(--text-primary)]">Personal Information</h3>
            <form onSubmit={handleSubmit(data => mutation.mutate(data))} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Input label="First name" icon={User} {...register('firstName')} />
                <Input label="Last name" {...register('lastName')} />
              </div>
              <Input label="Email" type="email" icon={Mail} value={user?.email} disabled className="opacity-60 cursor-not-allowed" />
              <Input label="Phone" type="tel" icon={Phone} {...register('phone')} />
              <Button type="submit" loading={mutation.isPending} icon={Save} disabled={!isDirty}>
                Save Changes
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Change password */}
        <Card>
          <CardContent className="space-y-4">
            <h3 className="font-semibold text-[var(--text-primary)]">Change Password</h3>
            <form onSubmit={passwordForm.handleSubmit(data => passwordMutation.mutate(data))} className="space-y-4">
              <Input
                label="Current password"
                type="password"
                {...passwordForm.register('currentPassword', { required: true })}
              />
              <Input
                label="New password"
                type="password"
                {...passwordForm.register('newPassword', { required: true, minLength: 8 })}
              />
              <Button type="submit" loading={passwordMutation.isPending} variant="secondary">
                Change Password
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
