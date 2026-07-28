'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Phone, Mail, Calendar, Eye, ShieldAlert, HeartPulse } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/stores/useAuthStore';
import { Appointment } from '@/types/appointments';
import RequireRole from '@/components/auth/RequireRole';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';

export default function PraticienPatientsPage() {
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  // Secretary active doctor selection
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');

  // Fetch appointments for patient list extraction
  const { data: appointments, isLoading: isApptsLoading } = useQuery<Appointment[]>({
    queryKey: ['patients-appointments'],
    queryFn: () => apiClient.get('/api/v1/appointments'),
  });

  // Extract linked doctors from appointments list (for secretary selector)
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

  // Active doctor ID for filter
  const activeDoctorId = user?.role === 'medecin' ? user.id : selectedDoctorId;

  // Filter appointments for active doctor
  const doctorAppointments = useMemo(() => {
    if (!appointments) return [];
    return appointments.filter((a) => a.doctor_id === activeDoctorId);
  }, [appointments, activeDoctorId]);

  // Extract unique patients from appointments
  const patientsList = useMemo(() => {
    const list: Record<string, NonNullable<Appointment['patient']>> = {};
    doctorAppointments.forEach((appt) => {
      if (appt.patient && appt.patient_id) {
        list[appt.patient_id] = appt.patient;
      }
    });

    return Object.entries(list).map(([id, patient]) => ({
      id,
      ...patient,
    }));
  }, [doctorAppointments]);

  // Search filter
  const filteredPatients = useMemo(() => {
    return patientsList.filter((p) => {
      const name = `${p.first_name} ${p.last_name}`.toLowerCase();
      const phone = p.phone.toLowerCase();
      const query = searchTerm.toLowerCase();
      return name.includes(query) || phone.includes(query);
    });
  }, [patientsList, searchTerm]);

  const selectedPatient = useMemo(() => {
    if (!selectedPatientId) return null;
    return patientsList.find((p) => p.id === selectedPatientId) || null;
  }, [patientsList, selectedPatientId]);

  // Filter appointments history for selected patient
  const selectedPatientAppointments = useMemo(() => {
    if (!selectedPatientId) return [];
    return doctorAppointments.filter((a) => a.patient_id === selectedPatientId)
      .sort((a, b) => new Date(b.slot_start).getTime() - new Date(a.slot_start).getTime());
  }, [doctorAppointments, selectedPatientId]);

  const isLoading = isApptsLoading;

  return (
    <RequireRole allowedRoles={['medecin', 'secretaire']}>
      <div className="pt-28 pb-16 min-h-screen bg-secondary">
        <div className="max-w-[1300px] mx-auto px-4 lg:px-[15px]">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
                <Users className="w-8 h-8 text-accent" />
                Gestion des Patients
              </h1>
              <p className="text-text mt-1">Consultez les fiches de vos patients et leur historique de consultation.</p>
            </div>

            {/* Doctor Selector (Secretary only) */}
            {user?.role === 'secretaire' && linkedDoctorIds.length > 0 && (
              <div className="flex items-center gap-3 bg-white p-3 rounded-pluxes-sm border border-divider shadow-xs">
                <span className="text-xs font-bold text-primary uppercase">Médecin :</span>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => {
                    setSelectedDoctorId(e.target.value);
                    setSelectedPatientId(null); // Clear selected patient
                  }}
                  className="rounded border border-divider p-1.5 text-sm font-semibold text-primary outline-none"
                >
                  {linkedDoctorIds.map((id) => (
                    <option key={id} value={id}>
                      Dr. {id.slice(0, 8)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="py-20 flex justify-center">
              <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Column: Patients List */}
              <div className="lg:col-span-4 space-y-4">
                <Card hoverable={false} className="p-4 bg-white border border-divider">
                  <Input
                    placeholder="Rechercher par nom ou téléphone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    name="search"
                  />
                </Card>

                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {filteredPatients.length === 0 ? (
                    <Card hoverable={false} className="p-6 text-center text-text/60 bg-white border border-divider">
                      Aucun patient trouvé.
                    </Card>
                  ) : (
                    filteredPatients.map((p) => {
                      const isActive = selectedPatientId === p.id;
                      return (
                        <button
                          key={p.id}
                          onClick={() => setSelectedPatientId(p.id)}
                          className={`w-full text-left p-4 rounded-pluxes-sm border transition-all cursor-pointer flex items-center justify-between bg-white ${
                            isActive
                              ? 'border-accent shadow-sm'
                              : 'border-divider hover:border-text/30'
                          }`}
                        >
                          <div>
                            <p className="font-bold text-primary">{p.first_name} {p.last_name}</p>
                            <p className="text-xs text-text/70 mt-1 flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5 text-accent" />
                              {p.phone}
                            </p>
                          </div>
                          <Eye className={`w-4 h-4 ${isActive ? 'text-accent' : 'text-text/30'}`} />
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Column: Patient Details */}
              <div className="lg:col-span-8">
                {selectedPatient ? (
                  <div className="space-y-6">
                    {/* Patient Info Card */}
                    <Card hoverable={false} className="p-8 bg-white border border-divider">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-6 pb-6 border-b border-divider">
                        <div>
                          <span className="text-xs font-bold text-accent uppercase">Fiche Patient</span>
                          <h2 className="text-2xl font-bold text-primary mt-1">
                            {selectedPatient.first_name} {selectedPatient.last_name}
                          </h2>
                          {selectedPatient.date_of_birth && (
                            <p className="text-sm text-text/80 mt-1">
                              Né(e) le :{' '}
                              <strong className="text-primary">
                                {new Date(selectedPatient.date_of_birth).toLocaleDateString('fr-FR')}
                              </strong>
                            </p>
                          )}
                        </div>
                        <Avatar alt={`${selectedPatient.first_name} ${selectedPatient.last_name}`} size="lg" />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <p className="text-sm text-text flex items-center gap-2">
                            <Phone className="w-4 h-4 text-accent" />
                            Téléphone principal : <strong className="text-primary">{selectedPatient.phone}</strong>
                          </p>
                          {selectedPatient.phone_secondary && (
                            <p className="text-sm text-text flex items-center gap-2">
                              <Phone className="w-4 h-4 text-accent" />
                              Téléphone secondaire : <strong className="text-primary">{selectedPatient.phone_secondary}</strong>
                            </p>
                          )}
                        </div>
                        <div className="space-y-3">
                          <p className="text-sm text-text flex items-center gap-2">
                            <Mail className="w-4 h-4 text-accent" />
                            Email : <strong className="text-primary">{selectedPatient.email || 'Non renseigné'}</strong>
                          </p>
                          {selectedPatient.address && (
                            <p className="text-sm text-text flex items-center gap-2">
                              Adresse : <strong className="text-primary">{selectedPatient.address}</strong>
                            </p>
                          )}
                        </div>
                      </div>
                    </Card>

                    {/* Consultation History Card */}
                    <Card hoverable={false} className="p-8 bg-white border border-divider">
                      <h3 className="text-lg font-bold text-primary mb-6 flex items-center gap-2 border-b border-divider pb-3">
                        <Calendar className="w-5 h-5 text-accent" />
                        Historique des rendez-vous
                      </h3>

                      <div className="space-y-4">
                        {selectedPatientAppointments.map((appt) => (
                          <div
                            key={appt.id}
                            className="p-4 rounded-pluxes-sm border border-divider bg-secondary/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                          >
                            <div className="space-y-1">
                              <p className="font-semibold text-primary capitalize">
                                {new Date(appt.slot_start).toLocaleDateString('fr-FR', {
                                  weekday: 'long',
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric',
                                })}
                              </p>
                              <p className="text-xs text-text/80 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                {new Date(appt.slot_start).toLocaleTimeString('fr-FR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                                {' — '}
                                {appt.type === 'video' ? 'Téléconsultation Vidéo' : 'En cabinet'}
                              </p>

                              {/* Medical data Privacy Check (Secretary vs Doctor) */}
                              {appt.reason && (
                                <div className="mt-3 p-3 rounded bg-secondary/50 border border-divider text-sm text-text">
                                  <span className="font-bold text-xs text-primary block mb-1">
                                    Motif de consultation :
                                  </span>
                                  {user?.role === 'secretaire' ? (
                                    <span className="text-xs italic text-text/60 flex items-center gap-1">
                                      <ShieldAlert className="w-3.5 h-3.5 text-accent" />
                                      Masqué (Donnée médicale confidentielle)
                                    </span>
                                  ) : (
                                    appt.reason
                                  )}
                                </div>
                              )}
                            </div>

                            <Badge variant={appt.status === 'annule' ? 'cancelled' : 'confirmed'}>
                              {appt.status === 'annule' ? 'Annulé' : 'Confirmé'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>
                ) : (
                  <Card hoverable={false} className="py-24 text-center text-text/60 bg-white border border-divider flex flex-col items-center gap-4">
                    <HeartPulse className="w-12 h-12 text-divider" />
                    <p>Sélectionnez un patient dans la liste de gauche pour consulter sa fiche détaillée.</p>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </RequireRole>
  );
}

function Clock({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}
