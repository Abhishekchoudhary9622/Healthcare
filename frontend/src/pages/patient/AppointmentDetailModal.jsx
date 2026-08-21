import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { StatusBadge, UrgencyBadge } from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import { formatDate, formatTime } from '@/lib/utils';
import {
  Calendar, Clock, FileText, Pill, Stethoscope,
  AlertTriangle, CheckCircle2, User, Phone, Mail,
} from 'lucide-react';

export default function AppointmentDetailModal({ appointment, role, onClose, onCancel }) {
  if (!appointment) return null;

  const { doctor, patient, scheduledAt, status, symptoms, preVisitSummary,
          urgencyLevel, chiefComplaint, suggestedQuestions, clinicalNotes,
          postVisitSummary, prescriptions } = appointment;

  const doctorUser  = doctor?.user;
  const patientUser = patient?.user;

  const Section = ({ title, icon: Icon, children }) => (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-brand-500" />}
        <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">{title}</h4>
      </div>
      <div>{children}</div>
    </div>
  );

  return (
    <Modal open={!!appointment} onClose={onClose} title="Appointment Details" size="lg">
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar
              firstName={role === 'PATIENT' ? doctorUser?.firstName : patientUser?.firstName}
              lastName={role === 'PATIENT' ? doctorUser?.lastName : patientUser?.lastName}
              size="md"
            />
            <div>
              <p className="font-semibold text-[var(--text-primary)] text-sm">
                {role === 'PATIENT'
                  ? `Dr. ${doctorUser?.firstName} ${doctorUser?.lastName}`
                  : `${patientUser?.firstName} ${patientUser?.lastName}`}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                {role === 'PATIENT' ? doctor?.specialisation : patientUser?.email}
              </p>
            </div>
          </div>
          <StatusBadge status={status} />
        </div>

        {/* Date/Time */}
        <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-[var(--bg-tertiary)]">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-brand-500" />
            <span className="text-[var(--text-secondary)]">{formatDate(scheduledAt, 'EEEE, MMM d, yyyy')}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-brand-500" />
            <span className="text-[var(--text-secondary)]">{formatTime(scheduledAt)}</span>
          </div>
        </div>

        {/* Urgency */}
        {urgencyLevel && (
          <div className="flex items-center gap-3">
            <UrgencyBadge level={urgencyLevel} />
            {chiefComplaint && <p className="text-sm text-[var(--text-secondary)]">{chiefComplaint}</p>}
          </div>
        )}

        {/* Symptoms */}
        {symptoms && (
          <Section title="Reported Symptoms" icon={AlertTriangle}>
            <p className="text-sm text-[var(--text-secondary)] bg-[var(--bg-tertiary)] rounded-xl p-3 leading-relaxed">{symptoms}</p>
          </Section>
        )}

        {/* Pre-visit AI Summary */}
        {preVisitSummary && (
          <Section title="AI Pre-Visit Summary" icon={Stethoscope}>
            <div className="bg-brand-50 dark:bg-brand-500/10 rounded-xl p-4 border border-brand-200 dark:border-brand-500/20">
              <p className="text-sm text-brand-800 dark:text-brand-200 leading-relaxed">{preVisitSummary}</p>
              {suggestedQuestions?.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-brand-600 dark:text-brand-400 mb-2">Suggested questions for your doctor:</p>
                  <ul className="space-y-1">
                    {suggestedQuestions.map((q, i) => (
                      <li key={i} className="text-xs text-brand-700 dark:text-brand-300 flex items-start gap-1.5">
                        <span className="font-bold">{i + 1}.</span> {q}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Section>
        )}

        {/* Post-visit */}
        {postVisitSummary && (
          <Section title="Post-Visit Summary" icon={FileText}>
            <div className="bg-accent-50 dark:bg-accent-500/10 rounded-xl p-4 border border-accent-200 dark:border-accent-500/20">
              <p className="text-sm text-accent-800 dark:text-accent-200 whitespace-pre-wrap leading-relaxed">{postVisitSummary}</p>
            </div>
          </Section>
        )}

        {/* Prescriptions */}
        {prescriptions?.length > 0 && (
          <Section title="Prescriptions" icon={Pill}>
            <div className="space-y-2">
              {prescriptions.map(p => (
                <div key={p.id} className="flex items-start gap-3 p-3 rounded-xl bg-[var(--bg-tertiary)]">
                  <div className="h-7 w-7 rounded-lg bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center shrink-0">
                    <Pill className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{p.medicationName}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{p.dosage} · {p.frequency} · {p.durationDays} days</p>
                    {p.instructions && <p className="text-xs text-[var(--text-muted)] mt-0.5">{p.instructions}</p>}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t border-[var(--border)]">
          {onCancel && !['CANCELLED', 'COMPLETED'].includes(status) && (
            <Button
              variant="ghost"
              className="text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-500/10"
              onClick={() => { onCancel(appointment); onClose(); }}
            >
              Cancel Appointment
            </Button>
          )}
          <Button variant="secondary" onClick={onClose} className="ml-auto">Close</Button>
        </div>
      </div>
    </Modal>
  );
}
