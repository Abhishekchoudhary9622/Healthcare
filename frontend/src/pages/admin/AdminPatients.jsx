import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Avatar from '@/components/ui/Avatar';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import api from '@/lib/api';
import { Search, Users } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function AdminPatients() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-patients', search, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page, limit: 15 });
      if (search) params.set('search', search);
      const { data } = await api.get(`/admin/patients?${params}`);
      return data.data;
    },
  });

  const patients = data?.patients || [];
  const pagination = data?.pagination;

  return (
    <DashboardLayout title="Patients">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Patients</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">{pagination?.total || 0} registered patients</p>
          </div>
        </div>

        <div className="max-w-sm">
          <Input icon={Search} placeholder="Search patients..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>

        {isLoading ? <PageSpinner /> : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--bg-tertiary)]">
                    {['Patient', 'Email', 'Phone', 'Joined'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {patients.length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-12 text-[var(--text-muted)]">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />No patients found
                    </td></tr>
                  ) : patients.map(p => (
                    <tr key={p.id} className="hover:bg-[var(--bg-tertiary)] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar firstName={p.firstName} lastName={p.lastName} size="sm" />
                          <span className="font-medium text-[var(--text-primary)]">{p.firstName} {p.lastName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">{p.email}</td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">{p.phone || 'â€”'}</td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">{formatDate(p.createdAt)}</td>
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
    </DashboardLayout>
  );
}
