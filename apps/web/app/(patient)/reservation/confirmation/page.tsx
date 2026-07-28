'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Calendar, Clock, Video, Building, AlertCircle } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { Doctor } from '@/types/doctor';
import RequireRole from '@/components/auth/RequireRole';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';

function ConfirmationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  // Read query params
  const doctorId = searchParams.get('doctor_id') || '';
  const slotStart = searchParams.get('slot_start') || '';
  const slotEnd = searchParams.get('slot_end') || '';
  const type = searchParams.get('type') || 'presentiel';

  const [motif, setMotif] = useState('');
  const [conflictError, setConflictError] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Fetch doctor details
  const { data: doctor, isLoading: isDoctorLoading } = useQuery<Doctor>({
    queryKey: ['doctor', doctorId],
    queryFn: () => apiClient.get(`/api/v1/doctors/${doctorId}`),
    enabled: !!doctorId,
  });

  // Booking mutation
  const bookingMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post('/api/v1/appointments', {
        doctor_id: doctorId,
        slot_start: slotStart,
        slot_end: slotEnd,
        type: type,
        // reason is ignored by marshmallow but passed for completeness
        reason: motif || undefined,
      });
    },
    onSuccess: () => {
      // Invalidate availabilities cache
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      router.push('/mes-rendez-vous?success=true');
    },
    onError: (err: unknown) => {
      const error = err as { status?: number; message?: string };
      if (error.status === 409) {
        setConflictError(true);
      } else {
        setServerError(error.message || 'Impossible d\'enregistrer le rendez-vous.');
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setConflictError(false);
    bookingMutation.mutate();
  };

  const formattedDate = slotStart
    ? new Date(slotStart).toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';

  const formattedTime = slotStart
    ? new Date(slotStart).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : '';

  const isLoading = isDoctorLoading || bookingMutation.isPending;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary">
        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Conflict view (slot taken by someone else)
  if (conflictError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary px-4">
        <Card hoverable={false} className="max-w-md text-center p-8 bg-white border border-divider">
          <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center text-error mx-auto mb-6">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-primary mb-4">Créneau indisponible</h2>
          <p className="text-text mb-6">
            Désolé, ce créneau a été réservé par un autre patient entre-temps.
          </p>
          <Link href={`/medecins/${doctorId}/reserver`}>
            <Button fullWidth>Choisir un autre créneau</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <RequireRole allowedRoles={['patient']}>
      <div className="pt-28 pb-16 min-h-screen bg-secondary">
        <div className="max-w-[700px] mx-auto px-4">
          <h1 className="text-3xl font-bold text-primary mb-8 text-center">
            Confirmez votre rendez-vous
          </h1>

          {serverError && (
            <div className="mb-6 p-4 rounded bg-error/10 border border-error text-error text-sm text-center">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Appointment summary */}
            <Card hoverable={false} className="p-6 bg-white border border-divider">
              <h2 className="text-lg font-bold text-primary mb-4 border-b border-divider pb-3">
                Récapitulatif de la consultation
              </h2>

              <div className="flex gap-4 items-center mb-6">
                <Avatar
                  src={doctor?.photo_url}
                  alt={doctor ? `${doctor.first_name} ${doctor.last_name}` : ''}
                  size="md"
                  className="border border-divider shadow-xs"
                />
                <div>
                  <span className="text-xs font-bold text-accent uppercase">{doctor?.specialty}</span>
                  <h3 className="font-bold text-primary text-base">
                    Dr. {doctor?.first_name} {doctor?.last_name}
                  </h3>
                  <p className="text-xs text-text">{doctor?.cabinet_name}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 text-text">
                  <Calendar className="w-5 h-5 text-accent" />
                  <span className="capitalize">{formattedDate}</span>
                </div>
                <div className="flex items-center gap-3 text-text">
                  <Clock className="w-5 h-5 text-accent" />
                  <span>à {formattedTime} (durée 30 min)</span>
                </div>
                <div className="flex items-center gap-3 text-text">
                  {type === 'video' ? (
                    <>
                      <Video className="w-5 h-5 text-accent" />
                      <span>Téléconsultation Vidéo</span>
                    </>
                  ) : (
                    <>
                      <Building className="w-5 h-5 text-accent" />
                      <span>En cabinet : {doctor?.address}</span>
                    </>
                  )}
                </div>
              </div>
            </Card>

            {/* Motif & Actions */}
            <Card hoverable={false} className="p-6 bg-white border border-divider">
              <div className="space-y-4 mb-6">
                <label className="block text-sm font-semibold text-primary">
                  Motif de consultation (facultatif)
                </label>
                <textarea
                  rows={4}
                  placeholder="Ex: Consultation de contrôle, renouvellement d'ordonnance..."
                  value={motif}
                  onChange={(e) => setMotif(e.target.value)}
                  className="w-full text-base font-normal leading-[1.25em] rounded-pluxes-xs px-5 py-5 border border-divider focus:border-accent outline-none text-primary placeholder:text-text/40 focus:ring-0"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link href={`/medecins/${doctorId}/reserver`} className="flex-1">
                  <Button variant="secondary" fullWidth>
                    Modifier le créneau
                  </Button>
                </Link>
                <Button type="submit" fullWidth className="flex-1">
                  Valider le rendez-vous
                </Button>
              </div>
            </Card>
          </form>
        </div>
      </div>
    </RequireRole>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-secondary">
          <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ConfirmationForm />
    </Suspense>
  );
}
