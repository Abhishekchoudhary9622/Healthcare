import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DoctorCard from '@/components/shared/DoctorCard';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import BookingModal from './BookingModal';
import api from '@/lib/api';
import { SPECIALISATIONS } from '@/lib/utils';
import { Search, SlidersHorizontal, UserX } from 'lucide-react';

export default function FindDoctors() {
  const [search, setSearch] = useState('');
  const [specialisation, setSpecialisation] = useState('');
  const [page, setPage] = useState(1);
  const [bookingDoctor, setBookingDoctor] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['doctors', search, specialisation, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page, limit: 12 });
      if (search) params.set('name', search);
      if (specialisation) params.set('specialisation', specialisation);
      const { data } = await api.get(`/appointments/doctors/search?${params}`);
      return data.data;
    },
    keepPreviousData: true,
  });

  const doctors = data?.doctors || [];
  const pagination = data?.pagination;

  return (
    <DashboardLayout title="Find Doctors">
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Find a Doctor</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">Search from our network of verified specialists</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="Search by doctor name..."
              icon={Search}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div className="w-full sm:w-56">
            <Select
              value={specialisation}
              onChange={(e) => { setSpecialisation(e.target.value); setPage(1); }}
            >
              <option value="">All Specialisations</option>
              {SPECIALISATIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
          {(search || specialisation) && (
            <Button variant="secondary" onClick={() => { setSearch(''); setSpecialisation(''); }}>
              Clear
            </Button>
          )}
        </div>

        {/* Results */}
        {isLoading ? (
          <PageSpinner />
        ) : doctors.length === 0 ? (
          <div className="text-center py-20">
            <UserX className="h-12 w-12 mx-auto text-[var(--text-muted)] mb-3" />
            <p className="text-[var(--text-secondary)] font-medium">No doctors found</p>
            <p className="text-sm text-[var(--text-muted)] mt-1">Try adjusting your search filters</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-[var(--text-muted)]">
              Showing {doctors.length} of {pagination?.total} doctors
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {doctors.map(doctor => (
                <DoctorCard
                  key={doctor.id}
                  doctor={doctor}
                  onBook={setBookingDoctor}
                />
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  Previous
                </Button>
                <span className="text-sm text-[var(--text-secondary)] px-3">
                  Page {page} of {pagination.pages}
                </span>
                <Button variant="secondary" size="sm" disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}>
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Booking modal */}
      <BookingModal
        doctor={bookingDoctor}
        onClose={() => setBookingDoctor(null)}
      />
    </DashboardLayout>
  );
}
