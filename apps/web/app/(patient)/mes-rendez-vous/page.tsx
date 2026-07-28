'use client';

import { useMemo, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Clock, Video, Building, XCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { Appointment } from '@/types/appointments';
import { Doctor } from '@/types/doctor';
import RequireRole from '@/components/auth/RequireRole';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import Modal from '@/components/ui/Modal';

function AppointmentsList() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const successParam = searchParams.get('success') === 'true';
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Fetch patient's appointments list
  const { data: appointments, isLoading: isApptsLoading, refetch } = useQuery<Appointment[]>({
    queryKey: ['my-appointments'],
    queryFn: () => apiClient.get('/api/v1/appointments'),
  });

  // Unique doctor ids in appointments list
  const uniqueDoctorIds = useMemo(() => {
    if (!appointments) return [];
    return Array.from(new Set(appointments.map((a) => a.doctor_id)));
  }, [appointments]);

  // Fetch doctor profiles for names & details
  const { data: doctorsMap, isLoading: isDoctorsLoading } = useQuery<Record<string, Doctor>>({
    queryKey: ['doctors-map', uniqueDoctorIds],
    queryFn: async () => {
      const map: Record<string, Doctor> = {};
      await Promise.all(
        uniqueDoctorIds.map(async (id) => {
          try {
            const doc = await apiClient.get<Doctor>(`/api/v1/doctors/${id}`);
            map[id] = doc;
          } catch (e) {
            console.error(`Error fetching doctor ${id}:`, e);
          }
        })
      );
      return map;
    },
    enabled: uniqueDoctorIds.length > 0,
  });

  // Mutation to cancel appointment
  const cancelMutation = useMutation({
    mutationFn: async (appt: Appointment) => {
      return apiClient.patch(`/api/v1/appointments/${appt.id}/status`, {
        status: 'annule',
        version_token: appt.version_token,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      setCancelTarget(null);
      refetch();
    },
    onError: (err: unknown) => {
      const error = err as { message?: string };
      setActionError(error.message || 'Impossible d\'annuler le rendez-vous. Il a peut-être été modifié.');
    },
  });

  // Reschedule mutation (cancels old one, then redirects)
  const rescheduleMutation = useMutation({
    mutationFn: async (appt: Appointment) => {
      return apiClient.patch(`/api/v1/appointments/${appt.id}/status`, {
        status: 'annule',
        version_token: appt.version_token,
      });
    },
    onSuccess: (_, appt) => {
      queryClient.invalidateQueries({ queryKey: ['my-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      setRescheduleTarget(null);
      // Redirect to select slot page for this doctor
      router.push(`/medecins/${appt.doctor_id}/reserver`);
    },
    onError: (err: unknown) => {
      const error = err as { message?: string };
      setActionError(error.message || 'Impossible de lancer le report.');
    },
  });

  // Helpers to split appointments
  const { upcomingAppts, pastAppts } = useMemo(() => {
    if (!appointments) return { upcomingAppts: [], pastAppts: [] };
    const now = new Date();
    const upcoming: Appointment[] = [];
    const past: Appointment[] = [];

    appointments.forEach((appt) => {
      const start = new Date(appt.slot_start);
      if (start >= now && appt.status === 'confirme') {
        upcoming.push(appt);
      } else {
        past.push(appt);
      }
    });

    // Sort chronologically
    upcoming.sort((a, b) => new Date(a.slot_start).getTime() - new Date(b.slot_start).getTime());
    past.sort((a, b) => new Date(b.slot_start).getTime() - new Date(a.slot_start).getTime());

    return { upcomingAppts: upcoming, pastAppts: past };
  }, [appointments]);

  // Helper to check cancellation limit
  const getCancelability = (appt: Appointment) => {
    const doctor = doctorsMap?.[appt.doctor_id];
    if (!doctor) return { allowed: false, limitStr: '' };

    const delay = doctor.cancellation_delay_hours;
    const now = new Date();
    const limitTime = new Date(new Date(appt.slot_start).getTime() - delay * 60 * 60 * 1000);

    return {
      allowed: now < limitTime,
      limitStr: `L'annulation doit être effectuée au moins ${delay} heures avant la consultation.`,
    };
  };

  const isLoading = isApptsLoading || (uniqueDoctorIds.length > 0 && isDoctorsLoading);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary">
        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <RequireRole allowedRoles={['patient']}>
      <div className="pt-28 pb-16 min-h-screen bg-secondary">
        <div className="max-w-[900px] mx-auto px-4">
          
          {/* Success Banner */}
          {successParam && (
            <div className="mb-6 p-4 rounded-pluxes-sm bg-success/10 border border-success/30 text-success flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
              <div>
                <p className="font-bold">Rendez-vous confirmé !</p>
                <p className="text-sm">Votre rendez-vous a bien été enregistré. Un e-mail de confirmation vous a été envoyé.</p>
              </div>
            </div>
          )}

          {actionError && (
            <div className="mb-6 p-4 rounded bg-error/10 border border-error text-error text-sm text-center">
              {actionError}
              <Button size="sm" variant="ghost" className="ml-2 text-error!" onClick={() => setActionError(null)}>
                Fermer
              </Button>
            </div>
          )}

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-primary">Mes rendez-vous</h1>
            <p className="text-text mt-1">Consultez et gérez vos rendez-vous médicaux.</p>
          </div>

          {/* Section: Upcoming */}
          <div className="mb-10">
            <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-accent" />
              Prochaines consultations
            </h2>

            {upcomingAppts.length === 0 ? (
              <Card hoverable={false} className="py-12 text-center text-text/60 bg-white border border-divider">
                Aucun rendez-vous à venir.
              </Card>
            ) : (
              <div className="space-y-4">
                {upcomingAppts.map((appt) => {
                  const doc = doctorsMap?.[appt.doctor_id];
                  const { allowed: isCancelable, limitStr } = getCancelability(appt);

                  return (
                    <Card key={appt.id} hoverable={false} className="p-6 bg-white border border-divider">
                      <div className="flex flex-col md:flex-row justify-between gap-6">
                        {/* Summary details */}
                        <div className="flex gap-4 items-start">
                          <Avatar src={doc?.photo_url} alt={doc ? `${doc.first_name} ${doc.last_name}` : ''} size="md" />
                          <div>
                            <span className="text-xs font-bold text-accent uppercase">{doc?.specialty}</span>
                            <h3 className="font-bold text-primary text-base">
                              Dr. {doc?.first_name} {doc?.last_name}
                            </h3>
                            <p className="text-xs text-text mb-2">{doc?.cabinet_name}</p>
                            
                            <div className="space-y-1.5 text-sm text-text font-medium mt-3">
                              <span className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-accent" />
                                <span className="capitalize">
                                  {new Date(appt.slot_start).toLocaleDateString('fr-FR', {
                                    weekday: 'short',
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                  })}
                                </span>
                              </span>
                              <span className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-accent" />
                                <span>
                                  {new Date(appt.slot_start).toLocaleTimeString('fr-FR', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </span>
                              <span className="flex items-center gap-2">
                                {appt.type === 'video' ? (
                                  <>
                                    <Video className="w-4 h-4 text-accent" />
                                    <span>Téléconsultation Vidéo</span>
                                  </>
                                ) : (
                                  <>
                                    <Building className="w-4 h-4 text-accent" />
                                    <span>En cabinet</span>
                                  </>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col justify-between items-end gap-4">
                          <Badge variant="confirmed">Confirmé</Badge>
                          
                          <div className="flex gap-2 w-full md:w-auto">
                            <Button
                              variant="secondary"
                              size="sm"
                              className="flex-1 md:flex-none flex items-center justify-center gap-1.5"
                              onClick={() => setRescheduleTarget(appt)}
                            >
                              <RefreshCw className="w-4 h-4" />
                              Reporter
                            </Button>
                            
                            <Button
                              variant="danger"
                              size="sm"
                              disabled={!isCancelable}
                              className="flex-1 md:flex-none flex items-center justify-center gap-1.5"
                              onClick={() => setCancelTarget(appt)}
                              title={!isCancelable ? limitStr : ''}
                            >
                              <XCircle className="w-4 h-4" />
                              Annuler
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section: Past & Canceled */}
          <div>
            <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-accent" />
              Historique des rendez-vous
            </h2>

            {pastAppts.length === 0 ? (
              <Card hoverable={false} className="py-12 text-center text-text/60 bg-white border border-divider">
                Aucun historique disponible.
              </Card>
            ) : (
              <div className="space-y-4">
                {pastAppts.map((appt) => {
                  const doc = doctorsMap?.[appt.doctor_id];

                  return (
                    <Card key={appt.id} hoverable={false} className="p-6 bg-white/70 border border-divider opacity-80">
                      <div className="flex flex-col md:flex-row justify-between gap-6">
                        <div className="flex gap-4 items-start">
                          <Avatar src={doc?.photo_url} alt={doc ? `${doc.first_name} ${doc.last_name}` : ''} size="md" />
                          <div>
                            <span className="text-xs font-bold text-text uppercase">{doc?.specialty}</span>
                            <h3 className="font-bold text-primary text-base">
                              Dr. {doc?.first_name} {doc?.last_name}
                            </h3>
                            <div className="space-y-1.5 text-xs text-text/80 mt-2">
                              <span className="flex items-center gap-2">
                                <Calendar className="w-3.5 h-3.5" />
                                <span className="capitalize">
                                  {new Date(appt.slot_start).toLocaleDateString('fr-FR', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                  })}
                                </span>
                              </span>
                              <span className="flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5" />
                                <span>
                                  {new Date(appt.slot_start).toLocaleTimeString('fr-FR', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center">
                          <Badge variant={appt.status === 'annule' ? 'cancelled' : 'default'} dot={false}>
                            {appt.status === 'annule' ? 'Annulé' : appt.status === 'effectue' ? 'Effectué' : 'Passé'}
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal: Cancellation */}
      <Modal
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title="Annuler le rendez-vous"
      >
        <p className="text-text mb-6">
          Êtes-vous sûr de vouloir annuler ce rendez-vous ? Cette action est irréversible.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setCancelTarget(null)}>
            Garder le RDV
          </Button>
          <Button
            variant="danger"
            loading={cancelMutation.isPending}
            onClick={() => cancelTarget && cancelMutation.mutate(cancelTarget)}
          >
            Confirmer l&apos;annulation
          </Button>
        </div>
      </Modal>

      {/* Confirmation Modal: Reschedule */}
      <Modal
        open={!!rescheduleTarget}
        onClose={() => setRescheduleTarget(null)}
        title="Reporter le rendez-vous"
      >
        <p className="text-text mb-6 leading-relaxed">
          Pour reporter votre consultation, votre rendez-vous actuel sera **annulé** et vous serez redirigé vers le calendrier du praticien pour sélectionner un nouveau créneau.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setRescheduleTarget(null)}>
            Fermer
          </Button>
          <Button
            loading={rescheduleMutation.isPending}
            onClick={() => rescheduleTarget && rescheduleMutation.mutate(rescheduleTarget)}
          >
            Confirmer et Choisir un créneau
          </Button>
        </div>
      </Modal>
    </RequireRole>
  );
}

export default function AppointmentsListPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-secondary">
          <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <AppointmentsList />
    </Suspense>
  );
}
