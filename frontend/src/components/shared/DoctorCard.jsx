import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Star, Briefcase, DollarSign, Clock, Award } from 'lucide-react';

export default function DoctorCard({ doctor, onBook, onView }) {
  const { firstName, lastName, avatar, doctorProfile } = doctor;
  const { specialisation, experience, consultationFee, qualifications, bio } = doctorProfile || {};

  return (
    <Card hover className="overflow-hidden group">
      {/* Top accent bar */}
      <div className="h-1.5 w-full bg-gradient-to-r from-brand-500 to-violet-500" />

      <CardContent className="p-5">
        <div className="flex gap-4">
          <Avatar firstName={firstName} lastName={lastName} src={avatar} size="lg" />

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-[var(--text-primary)] text-sm">
                  Dr. {firstName} {lastName}
                </h3>
                <Badge className="mt-1 bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300 text-[11px]">
                  {specialisation}
                </Badge>
              </div>
              <div className="flex items-center gap-1 text-warning-500">
                <Star className="h-3.5 w-3.5 fill-current" />
                <span className="text-xs font-medium text-[var(--text-secondary)]">4.9</span>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                <Briefcase className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                {experience}y experience
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                <DollarSign className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                ${consultationFee}/visit
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] col-span-2">
                <Award className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                <span className="truncate">{qualifications}</span>
              </div>
            </div>

            {bio && (
              <p className="mt-2.5 text-xs text-[var(--text-secondary)] line-clamp-2">{bio}</p>
            )}

            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={() => onBook?.(doctor)} className="flex-1">
                Book Appointment
              </Button>
              {onView && (
                <Button size="sm" variant="secondary" onClick={() => onView(doctor)}>
                  Profile
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
