'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, XCircle, Video, TrendingUp, Download, Briefcase } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/stores/useAuthStore';
import { Appointment } from '@/types/appointments';
import { Doctor } from '@/types/doctor';
import RequireRole from '@/components/auth/RequireRole';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import InviteSecretaryCard from '@/components/auth/InviteSecretaryCard';
import JoinDoctorForm from '@/components/auth/JoinDoctorForm';

interface DashboardStats {
  weekly_appointments: number;
  weekly_cancellations: number;
  weekly_video_consultations: number;
  filling_rate: number;
}

export default function PraticienDashboardPage() {
  const { user } = useAuthStore();

  // Export CSV dates state
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [exporting, setExporting] = useState(false);

  // Secretary state: active doctor selection
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');

  // Fetch appointments (mostly for secretary stats or recent list)
  const { data: appointments, isLoading: isApptsLoading } = useQuery<Appointment[]>({
    queryKey: ['dashboard-appointments'],
    queryFn: () => apiClient.get('/api/v1/appointments'),
  });

  // Extract linked doctors from appointments list (for secretary selector)
  const linkedDoctorIds = useMemo(() => {
    if (!appointments || user?.role !== 'secretaire') return [];
    return Array.from(new Set(appointments.map((a) => a.doctor_id)));
  }, [appointments, user]);

  // Fetch details of linked doctors
  const { data: linkedDoctorsMap, isLoading: isLinkedDocsLoading } = useQuery<Record<string, Doctor>>({
    queryKey: ['linked-doctors', linkedDoctorIds],
    queryFn: async () => {
      const map: Record<string, Doctor> = {};
      await Promise.all(
        linkedDoctorIds.map(async (id) => {
          try {
            const doc = await apiClient.get<Doctor>(`/api/v1/doctors/${id}`);
            map[id] = doc;
          } catch (e) {
            console.error(e);
          }
        })
      );
      return map;
    },
    enabled: linkedDoctorIds.length > 0,
  });

  // Automatically select first doctor for secretary if not set
  useEffect(() => {
    if (linkedDoctorIds.length > 0 && !selectedDoctorId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedDoctorId(linkedDoctorIds[0]);
    }
  }, [linkedDoctorIds, selectedDoctorId]);

  // Fetch stats for Medecin
  const { data: doctorStats, isLoading: isStatsLoading } = useQuery<DashboardStats>({
    queryKey: ['doctor-stats'],
    queryFn: () => apiClient.get('/api/v1/dashboard/doctor'),
    enabled: user?.role === 'medecin',
  });

  // Compute stats for Secretary locally to bypass the doctor-only endpoint
  const computedSecretaryStats = useMemo<DashboardStats>(() => {
    if (user?.role !== 'secretaire' || !appointments) {
      return { weekly_appointments: 0, weekly_cancellations: 0, weekly_video_consultations: 0, filling_rate: 0 };
    }

    // Filter appointments for the selected doctor
    const docAppts = appointments.filter((a) => a.doctor_id === selectedDoctorId);
    
    // Compute stats for the current week
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 1)); // Monday
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000); // Next Sunday

    const weekly = docAppts.filter((a) => {
      const d = new Date(a.slot_start);
      return d >= startOfWeek && d < endOfWeek;
    });

    const confirmed = weekly.filter((a) => a.status === 'confirme');
    const cancelled = weekly.filter((a) => a.status === 'annule');
    const video = confirmed.filter((a) => a.type === 'video');

    // Real fill rate based on the weekly appointment mix.
    const totalSlots = weekly.length;
    const fillingRate = totalSlots > 0 ? (confirmed.length / totalSlots) * 100 : 0;

    return {
      weekly_appointments: confirmed.length,
      weekly_cancellations: cancelled.length,
      weekly_video_consultations: video.length,
      filling_rate: Math.round(fillingRate * 10) / 10,
    };
  }, [appointments, user, selectedDoctorId]);

  const stats = user?.role === 'medecin' ? doctorStats : computedSecretaryStats;

  // Handle Export CSV
  const handleExportCSV = async (e: React.FormEvent) => {
    e.preventDefault();
    setExporting(true);
    try {
      const store = useAuthStore.getState();
      const headers = new Headers();
      if (store.accessToken) {
        headers.set('Authorization', `Bearer ${store.accessToken}`);
      }

      // Use active doctor for secretary or logged-in doctor
      const targetDocId = user?.role === 'secretaire' ? selectedDoctorId : user?.id;
      let url = `/api/v1/appointments/export?doctor_id=${targetDocId}`;
      if (fromDate) url += `&from=${new Date(fromDate).toISOString()}`;
      if (toDate) url += `&to=${new Date(toDate).toISOString()}`;

      const res = await fetch(url, { headers, credentials: 'include' });
      if (!res.ok) throw new Error('Échec du téléchargement du fichier d&apos;export.');
      const text = await res.text();
      
      const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `appointments-export.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error(err);
      alert('Impossible d\'exporter les rendez-vous.');
    } finally {
      setExporting(false);
    }
  };

  const isLoading = isApptsLoading || isLinkedDocsLoading || isStatsLoading;

  return (
    <RequireRole allowedRoles={['medecin', 'secretaire']}>
      <div className="pt-28 pb-16 min-h-screen bg-secondary">
        <div className="max-w-[1300px] mx-auto px-4 lg:px-[15px]">
          
          {/* Dashboard Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-primary">
                Espace Praticien
              </h1>
              <p className="text-text mt-1">
                Bienvenue, {user?.first_name} {user?.last_name} ({user?.role === 'medecin' ? 'Médecin' : 'Secrétaire'}).
              </p>
            </div>

            {/* Doctor Selection (Secretary Only) */}
            {user?.role === 'secretaire' && linkedDoctorIds.length > 0 && (
              <div className="flex items-center gap-3 bg-white p-3 rounded-pluxes-sm border border-divider shadow-xs">
                <span className="text-xs font-bold text-primary uppercase">Médecin actif :</span>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="rounded border border-divider p-1.5 text-sm font-semibold text-primary outline-none"
                >
                  {linkedDoctorIds.map((id) => {
                    const doc = linkedDoctorsMap?.[id];
                    return (
                      <option key={id} value={id}>
                        {doc ? `Dr. ${doc.first_name} ${doc.last_name}` : `Médecin (${id.slice(0, 8)})`}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="py-20 flex justify-center">
              <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-8">
              
              {/* KPIs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* KPI: Filling Rate */}
                <Card hoverable={false} className="p-6 bg-white border border-divider flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs text-text mb-0.5">Taux de remplissage</p>
                    <p className="text-2xl font-bold text-primary">{stats?.filling_rate || 0}%</p>
                  </div>
                </Card>

                {/* KPI: Weekly appointments */}
                <Card hoverable={false} className="p-6 bg-white border border-divider flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center text-success">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs text-text mb-0.5">RDV cette semaine</p>
                    <p className="text-2xl font-bold text-primary">{stats?.weekly_appointments || 0}</p>
                  </div>
                </Card>

                {/* KPI: Cancellations */}
                <Card hoverable={false} className="p-6 bg-white border border-divider flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center text-error">
                    <XCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs text-text mb-0.5">Annulations</p>
                    <p className="text-2xl font-bold text-primary">{stats?.weekly_cancellations || 0}</p>
                  </div>
                </Card>

                {/* KPI: Teleconsultations */}
                <Card hoverable={false} className="p-6 bg-white border border-divider flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-info/10 flex items-center justify-center text-info">
                    <Video className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs text-text mb-0.5">Téléconsultations</p>
                    <p className="text-2xl font-bold text-primary">{stats?.weekly_video_consultations || 0}</p>
                  </div>
                </Card>
              </div>

              {/* Taux de remplissage visual representation */}
              {stats && (
                <Card hoverable={false} className="p-6 bg-white border border-divider">
                  <h3 className="text-lg font-bold text-primary mb-4">Statistiques d&apos;occupation de l&apos;agenda</h3>
                  <div className="w-full bg-secondary h-4 rounded-full overflow-hidden mb-2">
                    <div
                      className="bg-accent h-full transition-all duration-500"
                      style={{ width: `${stats.filling_rate}%` }}
                    />
                  </div>
                  <p className="text-xs text-text">
                    Le cabinet est actuellement rempli à <strong className="text-primary">{stats.filling_rate}%</strong> pour cette semaine.
                  </p>
                </Card>
              )}

              {/* Admin Actions: Association, Export CSV */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Secretary Linking */}
                <div>
                  {user?.role === 'medecin' ? (
                    <InviteSecretaryCard />
                  ) : (
                    <Card hoverable={false} className="p-6 bg-white border border-divider">
                      <h3 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-accent" />
                        Associer un médecin
                      </h3>
                      <JoinDoctorForm />
                    </Card>
                  )}
                </div>

                {/* CSV Export Form */}
                <Card hoverable={false} className="p-6 bg-white border border-divider">
                  <h3 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
                    <Download className="w-5 h-5 text-accent" />
                    Exporter les rendez-vous (CSV)
                  </h3>
                  <form onSubmit={handleExportCSV} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        type="date"
                        label="Date de début"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        name="fromDate"
                      />
                      <Input
                        type="date"
                        label="Date de fin"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        name="toDate"
                      />
                    </div>
                    <Button type="submit" fullWidth loading={exporting}>
                      Télécharger le fichier .csv
                    </Button>
                  </form>
                </Card>
              </div>

            </div>
          )}
        </div>
      </div>
    </RequireRole>
  );
}
