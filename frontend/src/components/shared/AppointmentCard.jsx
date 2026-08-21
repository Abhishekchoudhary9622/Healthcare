import { formatDateTime, formatDate } from '@/lib/utils';
import { StatusBadge, UrgencyBadge } from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Clock, Calendar, ChevronRight, AlertTriangle } from 'lucide-react';

export default function AppointmentCard({ appointment, role = 'PATIENT', onView, onCancel, compact = false }) {
  const { doctor, patient, scheduledAt, status, urgencyLevel, symptoms } = appointment;

  const person = role === 'PATIENT' ? doctor : patient;
  const personUser = person?.user;
  const personName = personUser
    ? role === 'PATIENT'
      ? `Dr. ${personUser.firstName} ${personUser.lastName}`
      : `${personUser.firstName} ${personUser.lastName}`
    : '—';

  const subtitle = role === 'PATIENT'
    ? doctor?.specialisation
    : patient?.user?.email;

  return (
    <Card hover className="overflow-hidden">
      <CardContent className={compact ? 'p-4' : 'p-5'}>
        <div className="flex items-start gap-4">
          <Avatar
            firstName={personUser?.firstName}
            lastName={personUser?.lastName}
            src={personUser?.avatar}
            size={compact ? 'sm' : 'md'}
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-sm text-[var(--text-primary)] truncate">{personName}</p>
                {subtitle && <p className="text-xs text-[var(--text-muted)] truncate">{subtitle}</p>}
              </div>
              <StatusBadge status={status} />
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-2.5">
              <span className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                <Calendar className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                {formatDate(scheduledAt)}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                <Clock className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                {formatDateTime(scheduledAt).split(', ')[1] || formatDateTime(scheduledAt)}
              </span>
              {urgencyLevel && <UrgencyBadge level={urgencyLevel} />}
            </div>

            {!compact && symptoms && (
              <p className="mt-2 text-xs text-[var(--text-secondary)] line-clamp-2 bg-[var(--bg-tertiary)] rounded-lg px-3 py-2">
                <AlertTriangle className="h-3 w-3 inline mr-1 text-warning-500" />
                {symptoms}
              </p>
            )}

            {!compact && (
              <div className="flex gap-2 mt-3">
                {onView && (
                  <Button size="sm" variant="secondary" onClick={() => onView(appointment)}>
                    View Details
                  </Button>
                )}
                {onCancel && !['CANCELLED', 'COMPLETED'].includes(status) && (
                  <Button size="sm" variant="ghost" onClick={() => onCancel(appointment)}
                    className="text-danger-500 hover:text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-500/10"
                  >
                    Cancel
                  </Button>
                )}
              </div>
            )}
          </div>

          {compact && onView && (
            <button onClick={() => onView(appointment)} className="text-[var(--text-muted)] hover:text-brand-500">
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
