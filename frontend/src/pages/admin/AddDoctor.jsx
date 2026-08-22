import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import api from '@/lib/api';
import { SPECIALISATIONS } from '@/lib/utils';
import { UserPlus, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AddDoctor() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      specialisation: 'General Practice',
      experience: 0,
      consultationFee: 100,
      slotDuration: 30,
    },
  });

  const mutation = useMutation({
    mutationFn: (data) => api.post('/admin/doctors', data),
    onSuccess: () => {
      qc.invalidateQueries(['admin-doctors']);
      toast({ type: 'success', title: 'Doctor created!', message: 'Default password: Doctor@123' });
      navigate('/admin/doctors');
    },
    onError: (err) => toast({ type: 'error', message: err.response?.data?.message }),
  });

  return (
    <DashboardLayout title="Add Doctor">
      <div className="max-w-xl mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <Link to="/admin/doctors">
            <Button variant="secondary" size="sm" icon={ArrowLeft}>Back</Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Add New Doctor</h1>
            <p className="text-sm text-[var(--text-secondary)]">Default password: Doctor@123</p>
          </div>
        </div>

        <Card>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit(data => mutation.mutate(data))} className="space-y-4">
              <h3 className="font-semibold text-[var(--text-primary)]">Account Details</h3>
              <Input
                label="Email *"
                type="email"
                error={errors.email?.message}
                {...register('email', { required: 'Email is required' })}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="First Name *"
                  error={errors.firstName?.message}
                  {...register('firstName', { required: 'Required' })}
                />
                <Input
                  label="Last Name *"
                  error={errors.lastName?.message}
                  {...register('lastName', { required: 'Required' })}
                />
              </div>
              <Input label="Phone" type="tel" {...register('phone')} />

              <div className="border-t border-[var(--border)] pt-4">
                <h3 className="font-semibold text-[var(--text-primary)] mb-4">Professional Details</h3>
              </div>

              <Select label="Specialisation *" {...register('specialisation', { required: true })}>
                {SPECIALISATIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>

              <Input label="Qualifications" placeholder="MBBS, MD Cardiology" {...register('qualifications')} />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Experience (years)"
                  type="number"
                  min="0"
                  {...register('experience', { valueAsNumber: true })}
                />
                <Input
                  label="Consultation Fee (₹)"
                  type="number"
                  min="0"
                  placeholder="e.g. 500"
                  {...register('consultationFee', { valueAsNumber: true })}
                />
              </div>

              <Select label="Slot Duration" {...register('slotDuration', { valueAsNumber: true })}>
                {[15, 20, 30, 45, 60].map(d => <option key={d} value={d}>{d} minutes</option>)}
              </Select>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--text-secondary)]">Bio</label>
                <textarea className="input-base min-h-[80px] resize-none" {...register('bio')} />
              </div>

              <Button
                type="submit"
                loading={mutation.isPending}
                icon={UserPlus}
                className="w-full"
                size="lg"
              >
                Create Doctor Account
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
