import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Avatar from '@/components/ui/Avatar';
import { useToast } from '@/components/ui/Toast';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { SPECIALISATIONS, formatDate } from '@/lib/utils';
import { Save, Plus, Trash2, Calendar, Stethoscope } from 'lucide-react';

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];

export default function DoctorProfile() {
  const { user, fetchMe } = useAuthStore();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [newLeave, setNewLeave] = useState('');
  const [leaveReason, setLeaveReason] = useState('');

  const { data: leaves = [] } = useQuery({
    queryKey: ['doctor-leaves'],
    queryFn: async () => {
      const { data } = await api.get('/doctor/leaves');
      return data.data;
    },
  });

  const doc = user?.doctorProfile;
  const { register, handleSubmit } = useForm({
    defaultValues: {
      firstName: user?.firstName,
      lastName:  user?.lastName,
      phone:     user?.phone,
      bio:       doc?.bio,
      specialisation: doc?.specialisation,
      qualifications: doc?.qualifications,
      experience: doc?.experience,
      consultationFee: doc?.consultationFee,
      slotDuration: doc?.slotDuration,
    },
  });

  const profileMutation = useMutation({
    mutationFn: (data) => api.put('/doctor/profile', data),
    onSuccess: async () => { await fetchMe(); toast({ type: 'success', title: 'Profile updated' }); },
    onError: () => toast({ type: 'error', title: 'Update failed' }),
  });

  const leaveMutation = useMutation({
    mutationFn: ({ date, reason }) => api.post(`/admin/doctors/${user.id}/leave`, { date, reason }),
    onSuccess: () => {
      qc.invalidateQueries(['doctor-leaves']);
      setNewLeave('');
      setLeaveReason('');
      toast({ type: 'success', title: 'Leave added' });
    },
    onError: (err) => toast({ type: 'error', message: err.response?.data?.message }),
  });

  return (
    <DashboardLayout title="My Profile">
      <div className="max-w-2xl mx-auto space-y-5">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Doctor Profile</h1>

        {/* Avatar */}
        <Card>
          <CardContent className="flex items-center gap-5">
            <Avatar firstName={user?.firstName} lastName={user?.lastName} size="2xl" />
            <div>
              <p className="font-bold text-lg text-[var(--text-primary)]">Dr. {user?.firstName} {user?.lastName}</p>
              <p className="text-sm text-[var(--text-muted)]">{doc?.specialisation}</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">{user?.email}</p>
            </div>
          </CardContent>
        </Card>

        {/* Profile Form */}
        <Card>
          <CardContent className="space-y-4">
            <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-brand-500" /> Professional Details
            </h3>
            <form onSubmit={handleSubmit(data => profileMutation.mutate(data))} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Input label="First name" {...register('firstName')} />
                <Input label="Last name"  {...register('lastName')}  />
              </div>
              <Input label="Phone" {...register('phone')} />
              <Select label="Specialisation" {...register('specialisation')}>
                {SPECIALISATIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
              <Input label="Qualifications" {...register('qualifications')} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Experience (years)" type="number" {...register('experience')} />
                <Input label="Consultation Fee (₹)" type="number" {...register('consultationFee')} />
              </div>
              <Select label="Slot Duration (minutes)" {...register('slotDuration')}>
                {[15, 20, 30, 45, 60].map(d => <option key={d} value={d}>{d} minutes</option>)}
              </Select>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--text-secondary)]">Bio</label>
                <textarea
                  className="input-base min-h-[80px] resize-none"
                  placeholder="Brief professional bio..."
                  {...register('bio')}
                />
              </div>
              <Button type="submit" loading={profileMutation.isPending} icon={Save}>Save Profile</Button>
            </form>
          </CardContent>
        </Card>

        {/* Leave Management */}
        <Card>
          <CardContent className="space-y-4">
            <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Calendar className="h-4 w-4 text-warning-500" /> Leave Management
            </h3>
            <div className="flex gap-2">
              <Input
                type="date"
                value={newLeave}
                onChange={(e) => setNewLeave(e.target.value)}
                className="flex-1"
              />
              <Input
                placeholder="Reason (optional)"
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                className="flex-1"
              />
              <Button
                icon={Plus}
                disabled={!newLeave}
                loading={leaveMutation.isPending}
                onClick={() => leaveMutation.mutate({ date: newLeave, reason: leaveReason })}
              >
                Add
              </Button>
            </div>

            {leaves.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] text-center py-4">No leave days scheduled</p>
            ) : (
              <div className="space-y-2">
                {leaves.map(l => (
                  <div key={l.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-tertiary)]">
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{formatDate(l.date, 'EEEE, MMMM d, yyyy')}</p>
                      {l.reason && <p className="text-xs text-[var(--text-muted)]">{l.reason}</p>}
                    </div>
                    <span className="badge bg-warning-50 dark:bg-warning-500/10 text-warning-500">On Leave</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
