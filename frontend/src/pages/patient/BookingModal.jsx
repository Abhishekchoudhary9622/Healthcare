import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import Avatar from '@/components/ui/Avatar';
import { cn, formatDate, formatTime } from '@/lib/utils';
import api from '@/lib/api';
import { Calendar, Clock, AlertTriangle, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { format, addDays, subDays, startOfToday } from 'date-fns';

const steps = ['Select Date & Slot', 'Describe Symptoms', 'Confirm Booking'];

export default function BookingModal({ doctor, onClose }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [heldSlot, setHeldSlot] = useState(null);
  const [symptoms, setSymptoms] = useState('');
  const [holdExpiry, setHoldExpiry] = useState(null);

  const docProfile = doctor?.doctorProfile;

  const { data: slotsData, isLoading: slotsLoading } = useQuery({
    queryKey: ['slots', docProfile?.id, format(selectedDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      const { data } = await api.get(`/appointments/slots?doctorId=${docProfile.id}&date=${format(selectedDate, 'yyyy-MM-dd')}`);
      return data.data;
    },
    enabled: !!docProfile?.id && !!doctor,
  });

  const holdMutation = useMutation({
    mutationFn: (slot) => api.post('/appointments/hold', { doctorId: docProfile.id, scheduledAt: slot }),
    onSuccess: (_, slot) => {
      setHeldSlot(slot);
      setHoldExpiry(new Date(Date.now() + 10 * 60 * 1000));
      setStep(1);
    },
    onError: (err) => toast({ type: 'error', title: 'Slot unavailable', message: err.response?.data?.message }),
  });

  const bookMutation = useMutation({
    mutationFn: () => api.post('/appointments', {
      doctorId: docProfile.id,
      scheduledAt: heldSlot,
      symptoms: symptoms.trim() || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries(['patient-appointments']);
      toast({ type: 'success', title: 'Appointment booked!', message: 'You will receive a confirmation email shortly.' });
      onClose();
    },
    onError: (err) => toast({ type: 'error', title: 'Booking failed', message: err.response?.data?.message }),
  });

  if (!doctor) return null;

  const slots = slotsData?.slots || [];
  const today = startOfToday();

  return (
    <Modal open={!!doctor} onClose={onClose} title="Book Appointment" size="md">
      <div className="p-6">
        {/* Doctor summary */}
        <div className="flex items-center gap-3 mb-6 p-4 rounded-2xl bg-[var(--bg-tertiary)]">
          <Avatar firstName={doctor.firstName} lastName={doctor.lastName} size="md" />
          <div>
            <p className="font-semibold text-[var(--text-primary)] text-sm">Dr. {doctor.firstName} {doctor.lastName}</p>
            <p className="text-xs text-[var(--text-muted)]">{docProfile?.specialisation} · ${docProfile?.consultationFee}/visit</p>
          </div>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-1 mb-6">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center flex-1">
              <div className={cn(
                'h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                i < step ? 'bg-accent-500 text-white' : i === step ? 'bg-brand-600 text-white' : 'bg-[var(--border)] text-[var(--text-muted)]'
              )}>
                {i < step ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
              </div>
              {i < steps.length - 1 && <div className={cn('flex-1 h-0.5 mx-1', i < step ? 'bg-accent-500' : 'bg-[var(--border)]')} />}
            </div>
          ))}
        </div>
        <p className="text-xs text-[var(--text-muted)] mb-4">{steps[step]}</p>

        {/* Step 0: Date & Slot */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setSelectedDate(d => subDays(d, 1))}
                disabled={selectedDate <= today}
                className="h-8 w-8 flex items-center justify-center rounded-lg border border-[var(--border)] hover:bg-[var(--bg-tertiary)] disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="text-center">
                <p className="font-semibold text-[var(--text-primary)] text-sm">{format(selectedDate, 'EEEE')}</p>
                <p className="text-xs text-[var(--text-muted)]">{format(selectedDate, 'MMM d, yyyy')}</p>
              </div>
              <button
                onClick={() => setSelectedDate(d => addDays(d, 1))}
                className="h-8 w-8 flex items-center justify-center rounded-lg border border-[var(--border)] hover:bg-[var(--bg-tertiary)]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {slotsLoading ? <PageSpinner /> : (
              <>
                {slots.length === 0 ? (
                  <div className="text-center py-8 text-[var(--text-muted)] text-sm">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    No slots available on this date
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {slots.map(slot => (
                      <button
                        key={slot}
                        onClick={() => setSelectedSlot(slot)}
                        className={cn(
                          'py-2 px-3 rounded-xl text-sm border transition-all',
                          selectedSlot === slot
                            ? 'bg-brand-600 text-white border-brand-600'
                            : 'border-[var(--border)] hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/10 text-[var(--text-primary)]'
                        )}
                      >
                        {formatTime(slot)}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            <Button
              className="w-full"
              disabled={!selectedSlot}
              loading={holdMutation.isPending}
              onClick={() => holdMutation.mutate(selectedSlot)}
            >
              Hold this slot
            </Button>
          </div>
        )}

        {/* Step 1: Symptoms */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-brand-50 dark:bg-brand-500/10 flex items-start gap-2.5 text-xs text-brand-700 dark:text-brand-300">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <p>Your symptoms will be analysed by our AI to create a pre-visit summary for the doctor. Slot held for 10 minutes.</p>
            </div>

            <div className="p-3 rounded-xl bg-[var(--bg-tertiary)] flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-brand-500" />
              <span className="text-[var(--text-primary)] font-medium">{formatDate(heldSlot)}</span>
              <Clock className="h-4 w-4 text-brand-500 ml-2" />
              <span className="text-[var(--text-primary)] font-medium">{formatTime(heldSlot)}</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--text-secondary)]">
                Describe your symptoms <span className="text-[var(--text-muted)]">(optional)</span>
              </label>
              <textarea
                className="input-base min-h-[120px] resize-none"
                placeholder="E.g. I've been experiencing persistent headaches for 3 days, along with mild fever and fatigue..."
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setStep(0)}>Back</Button>
              <Button className="flex-1" onClick={() => setStep(2)}>Continue</Button>
            </div>
          </div>
        )}

        {/* Step 2: Confirm */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-[var(--bg-tertiary)] p-4 space-y-3">
              <h3 className="font-semibold text-[var(--text-primary)] text-sm">Booking Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Doctor</span>
                  <span className="text-[var(--text-primary)] font-medium">Dr. {doctor.firstName} {doctor.lastName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Specialisation</span>
                  <span className="text-[var(--text-primary)]">{docProfile?.specialisation}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Date</span>
                  <span className="text-[var(--text-primary)]">{formatDate(heldSlot)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Time</span>
                  <span className="text-[var(--text-primary)]">{formatTime(heldSlot)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Fee</span>
                  <span className="text-[var(--text-primary)] font-medium">${docProfile?.consultationFee}</span>
                </div>
                {symptoms && (
                  <div className="pt-2 border-t border-[var(--border)]">
                    <p className="text-[var(--text-muted)] text-xs mb-1">Symptoms</p>
                    <p className="text-[var(--text-secondary)] text-xs">{symptoms}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setStep(1)}>Back</Button>
              <Button
                className="flex-1"
                loading={bookMutation.isPending}
                onClick={() => bookMutation.mutate()}
                icon={CheckCircle2}
              >
                Confirm Booking
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
