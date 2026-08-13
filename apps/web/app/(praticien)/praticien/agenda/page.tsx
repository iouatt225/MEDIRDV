'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { Calendar as CalendarIcon, Clock, Video, Building, Plus, Trash2, ShieldAlert, User } from 'lucide-react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/stores/useAuthStore';
import { Appointment } from '@/types/appointments';
import RequireRole from '@/components/auth/RequireRole';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';

// Dynamically load FullCalendar to prevent build hydration window errors
const FullCalendarComponent = dynamic(() => import('@fullcalendar/react'), {
  ssr: false,
});

interface MappedEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  extendedProps: {
    type: 'appointment' | 'slot';
    appointment?: Appointment;
    slot?: {
      id: string;
      day_of_week: number;
      start_time: string;
      end_time: string;
      consultation_type: string;
    };
  };
}

interface AgendaSlot {
  id: string;
  doctor_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  consultation_type: string;
  duration_min: number;
  is_recurring: boolean;
}

export default function PraticienAgendaPage() {
  const { user, hasHydrated } = useAuthStore();
  const queryClient = useQueryClient();

  // Secretary active doctor selection
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');

  // Modals state
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [isApptModalOpen, setIsApptModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<MappedEvent | null>(null);

  // New slot form state
  const [slotDay, setSlotDay] = useState('1'); // Monday
  const [slotStart, setSlotStart] = useState('09:00');
  const [slotEnd, setSlotEnd] = useState('17:00');
  const [slotType, setSlotType] = useState('presentiel');

  // New block form state
  const [blockStart, setBlockStart] = useState('');
  const [blockEnd, setBlockEnd] = useState('');
  const [blockReason, setBlockReason] = useState('');

  // New manual booking form state
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingPatientId, setBookingPatientId] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [bookingType, setBookingType] = useState('presentiel');
  const [bookingReason, setBookingReason] = useState('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch appointments
  const {
    data: appointments,
    refetch: refetchAppts,
    isLoading: isAppointmentsLoading,
    isError: isAppointmentsError,
    error: appointmentsError,
  } = useQuery<Appointment[]>({
    queryKey: ['agenda-appointments'],
    queryFn: () => apiClient.get('/api/v1/appointments'),
    enabled: hasHydrated && !!user,
  });

  // Extract linked doctors from appointments (for secretary)
  const linkedDoctorIds = useMemo(() => {
    if (!appointments || user?.role !== 'secretaire') return [];
    return Array.from(new Set(appointments.map((a) => a.doctor_id)));
  }, [appointments, user]);

  // Sync secretary doctor selection
  useEffect(() => {
    if (linkedDoctorIds.length > 0 && !selectedDoctorId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedDoctorId(linkedDoctorIds[0]);
    }
  }, [linkedDoctorIds, selectedDoctorId]);

  const activeDoctorId = user?.role === 'medecin' ? user.id : selectedDoctorId;

  // Fetch recurring slots for active doctor
  const {
    data: slots,
    refetch: refetchSlots,
    isLoading: isSlotsLoading,
    isError: isSlotsError,
    error: slotsError,
  } = useQuery<AgendaSlot[]>({
    queryKey: ['agenda-slots', activeDoctorId],
    queryFn: () =>
      apiClient.get('/api/v1/slots', {
        params: {
          doctor_id: activeDoctorId,
        },
      }),
    enabled: !!activeDoctorId,
  });

  const isAgendaLoading = !hasHydrated || isAppointmentsLoading || (user?.role === 'medecin' && isSlotsLoading);
  const agendaError = errorMsg || (isAppointmentsError ? (appointmentsError instanceof Error ? appointmentsError.message : 'Impossible de charger les rendez-vous.') : null) || (isSlotsError ? (slotsError instanceof Error ? slotsError.message : 'Impossible de charger les créneaux.') : null);

  // Unique patients for manual booking autocomplete
  const patientsList = useMemo(() => {
    if (!appointments) return [];
    const list: Record<string, NonNullable<Appointment['patient']>> = {};
    appointments.forEach((appt) => {
      if (appt.patient && appt.patient_id) {
        list[appt.patient_id] = appt.patient;
      }
    });
    return Object.entries(list).map(([id, p]) => ({ id, ...p }));
  }, [appointments]);

  // Map slots and appointments to FullCalendar events
  const events = useMemo<MappedEvent[]>(() => {
    const list: MappedEvent[] = [];

    // 1. Add booked appointments
    if (appointments) {
      appointments
        .filter((a) => a.doctor_id === activeDoctorId && a.status === 'confirme')
        .forEach((appt) => {
          const isVideo = appt.type === 'video';
          const patientName = appt.patient
            ? `${appt.patient.first_name} ${appt.patient.last_name}`
            : 'Patient';

          list.push({
            id: `appt-${appt.id}`,
            title: `RDV: ${patientName} (${isVideo ? 'Vidéo' : 'Cabinet'})`,
            start: appt.slot_start,
            end: appt.slot_end,
            backgroundColor: isVideo ? '#3b82f6' : '#10b981', // Blue for Video, Green for Cabinet
            borderColor: isVideo ? '#2563eb' : '#059669',
            textColor: '#ffffff',
            extendedProps: {
              type: 'appointment',
              appointment: appt,
            },
          });
        });
    }

    // 2. Add recurring slots so the agenda remains visible even with no RDVs
    if (slots) {
      slots
        .filter((slot) => slot.doctor_id === activeDoctorId)
        .forEach((slot) => {
          list.push({
            id: `slot-${slot.id}`,
            title: slot.consultation_type === 'video' ? 'Créneau visio' : 'Créneau cabinet',
            start: slot.start_time,
            end: slot.end_time,
            backgroundColor: '#0ea5e9',
            borderColor: '#0284c7',
            textColor: '#ffffff',
            extendedProps: {
              type: 'slot',
              slot,
            },
          });
        });
    }

    return list;
  }, [appointments, activeDoctorId, slots]);

  // Mutations
  const createSlotMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post('/api/v1/slots', {
        day_of_week: Number(slotDay),
        start_time: slotStart,
        end_time: slotEnd,
        consultation_type: slotType,
        duration_min: 30,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda-slots'] });
      setIsSlotModalOpen(false);
      refetchSlots();
    },
    onError: (err: unknown) => {
      const error = err as { message?: string };
      setErrorMsg(error.message || 'Impossible d\'ajouter le créneau.');
    },
  });

  const createBlockMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post('/api/v1/slots/block', {
        start_datetime: new Date(blockStart).toISOString(),
        end_datetime: new Date(blockEnd).toISOString(),
        reason: blockReason || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda-slots'] });
      setIsBlockModalOpen(false);
      refetchSlots();
    },
    onError: (err: unknown) => {
      const error = err as { message?: string };
      setErrorMsg(error.message || 'Impossible de bloquer cette plage.');
    },
  });

  const cancelAppointmentMutation = useMutation({
    mutationFn: async (appt: Appointment) => {
      return apiClient.patch(`/api/v1/appointments/${appt.id}/status`, {
        status: 'annule',
        version_token: appt.version_token,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda-appointments'] });
      setIsApptModalOpen(false);
      refetchAppts();
    },
    onError: (err: unknown) => {
      const error = err as { message?: string };
      setErrorMsg(error.message || 'Impossible d\'annuler ce rendez-vous.');
    },
  });

  const createManualBookingMutation = useMutation({
    mutationFn: async () => {
      const start = new Date(`${bookingDate}T${bookingTime}`);
      const end = new Date(start.getTime() + 30 * 60000);

      return apiClient.post('/api/v1/appointments', {
        doctor_id: activeDoctorId,
        patient_id: bookingPatientId,
        slot_start: start.toISOString(),
        slot_end: end.toISOString(),
        type: bookingType,
        reason: bookingReason || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda-appointments'] });
      setIsBookingModalOpen(false);
      refetchAppts();
    },
    onError: (err: unknown) => {
      const error = err as { message?: string };
      setErrorMsg(error.message || 'Impossible d\'enregistrer le rendez-vous.');
    },
  });

  if (isAgendaLoading) {
    return (
      <RequireRole allowedRoles={['medecin', 'secretaire']}>
        <div className="pt-28 pb-16 min-h-screen bg-secondary">
          <div className="max-w-[1300px] mx-auto px-4 lg:px-[15px]">
            <Card hoverable={false} className="p-10 bg-white border border-divider flex items-center justify-center">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
                <div>
                  <h2 className="text-lg font-semibold text-primary">Chargement de l'agenda</h2>
                  <p className="text-sm text-text mt-1">Récupération des rendez-vous et des créneaux en cours...</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </RequireRole>
    );
  }

  if (agendaError) {
    return (
      <RequireRole allowedRoles={['medecin', 'secretaire']}>
        <div className="pt-28 pb-16 min-h-screen bg-secondary">
          <div className="max-w-[1300px] mx-auto px-4 lg:px-[15px]">
            <Card hoverable={false} className="p-8 bg-white border border-divider">
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-primary">Impossible de charger l'agenda</h2>
                <p className="text-sm text-text">{agendaError}</p>
                <div className="flex gap-3">
                  <Button onClick={() => void refetchAppts()}>
                    Réessayer les rendez-vous
                  </Button>
                  <Button variant="secondary" onClick={() => void refetchSlots()}>
                    Réessayer les créneaux
                  </Button>
                  <Button variant="ghost" onClick={() => setErrorMsg(null)}>
                    Fermer
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </RequireRole>
    );
  }

  return (
    <RequireRole allowedRoles={['medecin', 'secretaire']}>
      <div className="pt-28 pb-16 min-h-screen bg-secondary">
        <div className="max-w-[1300px] mx-auto px-4 lg:px-[15px]">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
                <CalendarIcon className="w-8 h-8 text-accent" />
                Agenda de consultation
              </h1>
              <p className="text-text mt-1">Consultez, modifiez et planifiez les créneaux horaires.</p>
            </div>

            {/* Doctor Selector & CTA Buttons */}
            <div className="flex flex-wrap gap-3 items-center">
              {user?.role === 'secretaire' && linkedDoctorIds.length > 0 && (
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="rounded border border-divider p-2.5 text-sm font-semibold text-primary bg-white shadow-xs outline-none mr-2"
                >
                  {linkedDoctorIds.map((id) => (
                    <option key={id} value={id}>
                      Dr. {id.slice(0, 8)}
                    </option>
                  ))}
                </select>
              )}

              {user?.role === 'medecin' && (
                <>
                  <Button variant="secondary" size="sm" onClick={() => setIsSlotModalOpen(true)}>
                    <Plus className="w-4 h-4 mr-1" /> Créneau Récurrent
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setIsBlockModalOpen(true)}>
                    <ShieldAlert className="w-4 h-4 mr-1" /> Bloquer Plage
                  </Button>
                </>
              )}

              <Button size="sm" onClick={() => setIsBookingModalOpen(true)}>
                <Plus className="w-4 h-4 mr-1" /> Prendre RDV
              </Button>
            </div>
          </div>

          {errorMsg && (
            <div className="mb-6 p-4 rounded bg-error/10 border border-error text-error text-sm text-center">
              {errorMsg}
              <Button size="sm" variant="ghost" className="ml-2 text-error!" onClick={() => setErrorMsg(null)}>
                Fermer
              </Button>
            </div>
          )}

          {/* Calendar Card */}
          <Card hoverable={false} className="p-6 bg-white border border-divider">
            {/* @ts-expect-error - FullCalendar type discrepancies */}
            <FullCalendarComponent
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="timeGridWeek"
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay',
              }}
              locale="fr"
              slotMinTime="07:00:00"
              slotMaxTime="20:00:00"
              allDaySlot={false}
              events={events}
              eventClick={(info) => {
                setSelectedEvent(info.event as unknown as MappedEvent);
                setIsApptModalOpen(true);
              }}
              height="auto"
            />
          </Card>
        </div>
      </div>

      {/* Modal: Add Recurring Slot */}
      <Modal open={isSlotModalOpen} onClose={() => setIsSlotModalOpen(false)} title="Ajouter une plage horaire récurrente">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createSlotMutation.mutate();
          }}
          className="space-y-4"
        >
          <Select
            label="Jour de la semaine"
            options={[
              { value: '0', label: 'Lundi' },
              { value: '1', label: 'Mardi' },
              { value: '2', label: 'Mercredi' },
              { value: '3', label: 'Jeudi' },
              { value: '4', label: 'Vendredi' },
              { value: '5', label: 'Samedi' },
              { value: '6', label: 'Dimanche' },
            ]}
            value={slotDay}
            onChange={(e) => setSlotDay(e.target.value)}
            name="day"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Heure de début" type="time" value={slotStart} onChange={(e) => setSlotStart(e.target.value)} name="start" required />
            <Input label="Heure de fin" type="time" value={slotEnd} onChange={(e) => setSlotEnd(e.target.value)} name="end" required />
          </div>
          <Select
            label="Type de consultation"
            options={[
              { value: 'presentiel', label: 'En cabinet (Présentiel)' },
              { value: 'video', label: 'Téléconsultation Vidéo' },
            ]}
            value={slotType}
            onChange={(e) => setSlotType(e.target.value)}
            name="type"
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" type="button" onClick={() => setIsSlotModalOpen(false)}>Annuler</Button>
            <Button type="submit" loading={createSlotMutation.isPending}>Ajouter</Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Block Time */}
      <Modal open={isBlockModalOpen} onClose={() => setIsBlockModalOpen(false)} title="Bloquer une plage horaire (Formation, Congés...)">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createBlockMutation.mutate();
          }}
          className="space-y-4"
        >
          <Input label="Début du blocage" type="datetime-local" value={blockStart} onChange={(e) => setBlockStart(e.target.value)} name="blockStart" required />
          <Input label="Fin du blocage" type="datetime-local" value={blockEnd} onChange={(e) => setBlockEnd(e.target.value)} name="blockEnd" required />
          <Input label="Motif / Description" placeholder="Ex: Congés annuels, Réunion..." value={blockReason} onChange={(e) => setBlockReason(e.target.value)} name="reason" />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" type="button" onClick={() => setIsBlockModalOpen(false)}>Annuler</Button>
            <Button type="submit" loading={createBlockMutation.isPending}>Bloquer</Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Manual Appointment Booking */}
      <Modal open={isBookingModalOpen} onClose={() => setIsBookingModalOpen(false)} title="Créer un rendez-vous (Prise manuelle)">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createManualBookingMutation.mutate();
          }}
          className="space-y-4"
        >
          <Select
            label="Sélectionner un patient existant"
            options={[
              { value: '', label: '-- Choisir un patient --' },
              ...patientsList.map((p) => ({
                value: p.id,
                label: `${p.first_name} ${p.last_name} (${p.phone})`,
              })),
            ]}
            value={bookingPatientId}
            onChange={(e) => setBookingPatientId(e.target.value)}
            name="patient"
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Date" type="date" value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} name="date" required />
            <Input label="Heure de début" type="time" value={bookingTime} onChange={(e) => setBookingTime(e.target.value)} name="time" required />
          </div>
          <Select
            label="Type"
            options={[
              { value: 'presentiel', label: 'En cabinet (Présentiel)' },
              { value: 'video', label: 'Téléconsultation Vidéo' },
            ]}
            value={bookingType}
            onChange={(e) => setBookingType(e.target.value)}
            name="type"
          />
          <Input label="Motif de consultation" value={bookingReason} onChange={(e) => setBookingReason(e.target.value)} name="reason" />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" type="button" onClick={() => setIsBookingModalOpen(false)}>Annuler</Button>
            <Button type="submit" loading={createManualBookingMutation.isPending}>Enregistrer</Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Event Details & Action (Cancel) */}
      <Modal open={isApptModalOpen} onClose={() => setIsApptModalOpen(false)} title="Détails du rendez-vous">
        {selectedEvent?.extendedProps.type === 'appointment' && selectedEvent.extendedProps.appointment && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-divider">
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                <User className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-primary text-base">
                  {selectedEvent.extendedProps.appointment.patient?.first_name}{' '}
                  {selectedEvent.extendedProps.appointment.patient?.last_name}
                </p>
                <p className="text-xs text-text">{selectedEvent.extendedProps.appointment.patient?.phone}</p>
              </div>
            </div>

            <div className="space-y-2 text-sm text-text">
              <p className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Début :{' '}
                <strong className="text-primary">
                  {new Date(selectedEvent.extendedProps.appointment.slot_start).toLocaleString('fr-FR')}
                </strong>
              </p>
              <p className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Fin :{' '}
                <strong className="text-primary">
                  {new Date(selectedEvent.extendedProps.appointment.slot_end).toLocaleString('fr-FR')}
                </strong>
              </p>
              <p className="flex items-center gap-2">
                {selectedEvent.extendedProps.appointment.type === 'video' ? (
                  <>
                    <Video className="w-4 h-4" /> Teleconsultation Vidéo
                  </>
                ) : (
                  <>
                    <Building className="w-4 h-4" /> En cabinet
                  </>
                )}
              </p>
            </div>

            {/* Medical privacy check for Secretary role */}
            {selectedEvent.extendedProps.appointment.reason && (
              <div className="p-3 rounded bg-secondary border border-divider text-xs">
                <span className="font-bold text-primary block mb-1">Motif de consultation :</span>
                {user?.role === 'secretaire' ? (
                  <span className="italic text-text/60 flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-accent" />
                    Masqué (Donnée confidentielle secrétaire)
                  </span>
                ) : (
                  selectedEvent.extendedProps.appointment.reason
                )}
              </div>
            )}

            <div className="flex justify-between items-center pt-6 border-t border-divider">
              <Button
                variant="danger"
                size="sm"
                className="flex items-center gap-1"
                loading={cancelAppointmentMutation.isPending}
                onClick={() =>
                  selectedEvent.extendedProps.appointment &&
                  cancelAppointmentMutation.mutate(selectedEvent.extendedProps.appointment)
                }
              >
                <Trash2 className="w-4 h-4" /> Annuler le RDV
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setIsApptModalOpen(false)}>
                Fermer
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </RequireRole>
  );
}
