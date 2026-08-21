import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import api from '@/lib/api';
import { Plus, Trash2, Pill, FileText, Sparkles } from 'lucide-react';

const emptyRx = () => ({ medicationName: '', dosage: '', frequency: '', durationDays: 7, instructions: '' });

export default function PostVisitModal({ appointment, onClose }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [notes, setNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [prescriptions, setPrescriptions] = useState([emptyRx()]);

  const mutation = useMutation({
    mutationFn: () => api.post(`/doctor/appointments/${appointment.id}/post-visit`, {
      clinicalNotes: notes,
      prescriptions: prescriptions.filter(p => p.medicationName.trim()),
      followUpDate: followUpDate || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries(['doctor-appointments']);
      toast({ type: 'success', title: 'Notes saved!', message: 'Patient summary is being generated.' });
      onClose();
    },
    onError: (err) => toast({ type: 'error', title: 'Error', message: err.response?.data?.message }),
  });

  const addRx = () => setPrescriptions(p => [...p, emptyRx()]);
  const removeRx = (i) => setPrescriptions(p => p.filter((_, idx) => idx !== i));
  const updateRx = (i, field, value) =>
    setPrescriptions(p => p.map((rx, idx) => idx === i ? { ...rx, [field]: value } : rx));

  if (!appointment) return null;

  const patient = appointment.patient?.user;

  return (
    <Modal open={!!appointment} onClose={onClose} title="Post-Visit Notes" size="lg">
      <div className="p-6 space-y-5">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-tertiary)]">
          <FileText className="h-5 w-5 text-brand-500" />
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              Patient: {patient?.firstName} {patient?.lastName}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              AI will generate a patient-friendly summary from your notes
            </p>
          </div>
          <Sparkles className="h-4 w-4 text-violet-500 ml-auto" />
        </div>

        {/* Clinical notes */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[var(--text-secondary)]">
            Clinical Notes <span className="text-danger-500">*</span>
          </label>
          <textarea
            className="input-base min-h-[120px] resize-none"
            placeholder="Diagnosis, examination findings, treatment plan, etc."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Follow-up date */}
        <Input
          type="date"
          label="Follow-up Date (optional)"
          value={followUpDate}
          onChange={(e) => setFollowUpDate(e.target.value)}
        />

        {/* Prescriptions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
              <Pill className="h-4 w-4 text-violet-500" /> Prescriptions
            </label>
            <Button size="sm" variant="secondary" icon={Plus} onClick={addRx}>Add</Button>
          </div>

          {prescriptions.map((rx, i) => (
            <div key={i} className="p-4 rounded-2xl border border-[var(--border)] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--text-muted)]">Medication #{i + 1}</span>
                {prescriptions.length > 1 && (
                  <button onClick={() => removeRx(i)} className="text-danger-500 hover:text-danger-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="Medication name"
                  value={rx.medicationName}
                  onChange={(e) => updateRx(i, 'medicationName', e.target.value)}
                />
                <Input
                  placeholder="Dosage (e.g. 500mg)"
                  value={rx.dosage}
                  onChange={(e) => updateRx(i, 'dosage', e.target.value)}
                />
                <Input
                  placeholder="Frequency (e.g. twice daily)"
                  value={rx.frequency}
                  onChange={(e) => updateRx(i, 'frequency', e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="Duration (days)"
                  value={rx.durationDays}
                  onChange={(e) => updateRx(i, 'durationDays', Number(e.target.value))}
                />
              </div>
              <Input
                placeholder="Special instructions (optional)"
                value={rx.instructions}
                onChange={(e) => updateRx(i, 'instructions', e.target.value)}
              />
            </div>
          ))}
        </div>

        <div className="flex gap-3 pt-2 border-t border-[var(--border)]">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            className="flex-1"
            loading={mutation.isPending}
            disabled={!notes.trim()}
            icon={Sparkles}
            onClick={() => mutation.mutate()}
          >
            Save & Generate Summary
          </Button>
        </div>
      </div>
    </Modal>
  );
}
