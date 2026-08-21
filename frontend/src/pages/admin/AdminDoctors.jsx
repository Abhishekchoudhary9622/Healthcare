import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Avatar from '@/components/ui/Avatar';
import Modal from '@/components/ui/Modal';
import { PageSpinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { cn, SPECIALISATIONS } from '@/lib/utils';
import api from '@/lib/api';
import { Search, Plus, Trash2, Edit2, Calendar, CheckCircle, XCircle } from 'lucide-react';

export default function AdminDoctors() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [leaveModal, setLeaveModal] = useState(null);
  const [leaveDate, setLeaveDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-doctors', search, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page, limit: 12 });
      if (search) params.set('search', search);
      const { data } = await api.get(`/admin/doctors?${params}`);
      return data.data;
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id) => api.delete(`/admin/doctors/${id}`),
    onSuccess: () => {
      qc.invalidateQueries(['admin-doctors']);
      toast({ type: 'success', title: 'Doctor deactivated' });
    },
  });

  const leaveMutation = useMutation({
    mutationFn: ({ doctorId, date, reason }) =>
      api.post(`/admin/doctors/${doctorId}/leave`, { date, reason }),
    onSuccess: (data) => {
      const affected = data.data?.data?.affectedCount;
      setLeaveModal(null);
      setLeaveDate('');
      setLeaveReason('');
      toast({
        type: 'success',
        title: 'Leave added',
        message: affected > 0 ? `${affected} patients notified` : undefined,
      });
    },
    onError: (err) => toast({ type: 'error', message: err.response?.data?.message }),
  });

  const doctors = data?.doctors || [];
  const pagination = data?.pagination;

  return (
    <DashboardLayout title="Manage Doctors">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Doctors</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">{pagination?.total || 0} registered doctors</p>
          </div>
          <Link to="/admin/doctors/new">
            <Button icon={Plus}>Add Doctor</Button>
          </Link>
        </div>

        <div className="max-w-sm">
          <Input
            icon={Search}
            placeholder="Search doctors..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        {isLoading ? <PageSpinner /> : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--bg-tertiary)]">
                    {['Doctor', 'Specialisation', 'Experience', 'Fee', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {doctors.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-12 text-[var(--text-muted)]">No doctors found</td></tr>
                  ) : doctors.map(doc => (
                    <tr key={doc.id} className="hover:bg-[var(--bg-tertiary)] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar firstName={doc.firstName} lastName={doc.lastName} size="sm" />
                          <div>
                            <p className="font-medium text-[var(--text-primary)]">Dr. {doc.firstName} {doc.lastName}</p>
                            <p className="text-xs text-[var(--text-muted)]">{doc.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">{doc.doctorProfile?.specialisation}</td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">{doc.doctorProfile?.experience}y</td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">${doc.doctorProfile?.consultationFee}</td>
                      <td className="px-4 py-3">
                        {doc.isActive ? (
                          <span className="badge bg-accent-100 dark:bg-accent-500/10 text-accent-600 dark:text-accent-400">
                            <CheckCircle className="h-3 w-3" /> Active
                          </span>
                        ) : (
                          <span className="badge bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
                            <XCircle className="h-3 w-3" /> Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setLeaveModal(doc)}
                            className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-warning-50 dark:hover:bg-warning-500/10 text-[var(--text-muted)] hover:text-warning-500 transition-colors"
                            title="Add leave"
                          >
                            <Calendar className="h-4 w-4" />
                          </button>
                          <Link to={`/admin/doctors/${doc.id}/edit`}>
                            <button className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-brand-50 dark:hover:bg-brand-500/10 text-[var(--text-muted)] hover:text-brand-500 transition-colors">
                              <Edit2 className="h-4 w-4" />
                            </button>
                          </Link>
                          {doc.isActive && (
                            <button
                              onClick={() => {
                                if (confirm(`Deactivate Dr. ${doc.firstName} ${doc.lastName}?`)) {
                                  deactivateMutation.mutate(doc.id);
                                }
                              }}
                              className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-danger-50 dark:hover:bg-danger-500/10 text-[var(--text-muted)] hover:text-danger-500 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {pagination && pagination.pages > 1 && (
          <div className="flex justify-center gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <span className="text-sm text-[var(--text-secondary)] px-2">Page {page} of {pagination.pages}</span>
            <Button variant="secondary" size="sm" disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        )}
      </div>

      {/* Leave modal */}
      <Modal open={!!leaveModal} onClose={() => setLeaveModal(null)} title="Add Leave Day" size="sm">
        <div className="p-6 space-y-4">
          {leaveModal && (
            <p className="text-sm text-[var(--text-secondary)]">
              Add leave for <strong>Dr. {leaveModal.firstName} {leaveModal.lastName}</strong>. Affected patients will be notified automatically.
            </p>
          )}
          <Input type="date" label="Leave Date" value={leaveDate} onChange={(e) => setLeaveDate(e.target.value)} />
          <Input label="Reason (optional)" placeholder="e.g. Personal" value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} />
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setLeaveModal(null)}>Cancel</Button>
            <Button
              className="flex-1"
              loading={leaveMutation.isPending}
              disabled={!leaveDate}
              onClick={() => leaveMutation.mutate({ doctorId: leaveModal.id, date: leaveDate, reason: leaveReason })}
            >
              Add Leave
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
