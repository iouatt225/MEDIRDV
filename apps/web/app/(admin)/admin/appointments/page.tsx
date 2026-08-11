'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CalendarCheck2, Clock3, Video } from 'lucide-react';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { apiClient } from '@/lib/api/client';
import { AdminDashboardResponse } from '@/types/admin';

function formatDate(value: string | null) {
  if (!value) return 'Date inconnue';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function statusTone(status: string) {
  switch (status) {
    case 'confirme':
      return 'bg-success/10 text-success';
    case 'annule':
      return 'bg-error/10 text-error';
    case 'effectue':
      return 'bg-accent/10 text-accent';
    case 'manque':
      return 'bg-warning/10 text-warning';
    default:
      return 'bg-secondary text-primary';
  }
}

function statusLabel(status: string) {
  switch (status) {
    case 'confirme':
      return 'Confirmé';
    case 'annule':
      return 'Annulé';
    case 'effectue':
      return 'Effectué';
    case 'manque':
      return 'Manqué';
    default:
      return status;
  }
}

export default function AdminAppointmentsPage() {
  const { data, isLoading, isError, refetch } = useQuery<AdminDashboardResponse>({
    queryKey: ['admin-dashboard'],
    queryFn: () => apiClient.get('/api/v1/admin/dashboard'),
  });

  const appointments = data?.recent_appointments ?? [];

  return (
    <div className="space-y-8">
      <section className="rounded-[36px] border border-white/70 bg-white/80 p-6 shadow-[0_24px_80px_rgba(8,54,59,0.12)] backdrop-blur-xl lg:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <Link href="/admin/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-accent">
              <ArrowLeft className="h-4 w-4" />
              Retour au hub
            </Link>
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.35em] text-accent">
              <CalendarCheck2 className="h-3.5 w-3.5" />
              Rendez-vous
            </div>
            <h1 className="text-3xl font-extrabold text-primary lg:text-5xl">Pilotage des rendez-vous</h1>
            <p className="max-w-2xl text-sm leading-7 text-text lg:text-base">
              Cette vue isole les rendez-vous récents pour lire rapidement les flux, les statuts et les canaux de consultation.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:min-w-[430px]">
            {[
              { label: 'Total', value: data?.overview.appointments_total ?? 0 },
              { label: 'Confirmés', value: data?.overview.appointments_confirmed ?? 0 },
              { label: 'Annulés', value: data?.overview.appointments_cancelled ?? 0 },
              { label: 'Semaine', value: data?.overview.appointments_week ?? 0 },
            ].map((item) => (
              <div key={item.label} className="rounded-3xl border border-divider bg-secondary/60 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-text/55">{item.label}</p>
                <p className="mt-2 text-2xl font-extrabold text-primary">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-accent border-t-transparent" />
        </div>
      ) : isError ? (
        <Card hoverable={false} className="border border-error/20 bg-error/10 p-6 text-center">
          <p className="text-lg font-bold text-primary">Impossible de charger les rendez-vous</p>
          <Button className="mt-4" onClick={() => refetch()}>
            Réessayer
          </Button>
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Card hoverable={false} className="border border-white/70 bg-white/80 p-6 shadow-card">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-text/55">Répartition</p>
                <h2 className="mt-2 text-2xl font-bold text-primary">État des rendez-vous</h2>
              </div>
              <Clock3 className="h-10 w-10 text-accent" />
            </div>

            <div className="mt-6 space-y-4">
              {[
                { label: 'Confirmés', value: data?.overview.appointments_confirmed ?? 0 },
                { label: 'Annulés', value: data?.overview.appointments_cancelled ?? 0 },
                { label: 'Effectués', value: data?.overview.appointments_effectue ?? 0 },
                { label: 'Manqués', value: data?.overview.appointments_manque ?? 0 },
              ].map((item) => (
                <div key={item.label} className="rounded-3xl bg-secondary/60 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.3em] text-text/55">{item.label}</p>
                  <p className="mt-2 text-3xl font-extrabold text-primary">{item.value}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card hoverable={false} className="border border-white/70 bg-white/80 p-6 shadow-card">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-text/55">Derniers rendez-vous</p>
                <h2 className="mt-2 text-2xl font-bold text-primary">Flux récent</h2>
              </div>
              <Video className="h-10 w-10 text-accent" />
            </div>

            <div className="mt-6 space-y-3">
              {appointments.map((appointment) => (
                <div key={appointment.id} className="rounded-3xl border border-divider bg-white p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-semibold text-primary">{appointment.patient_name || 'Patient inconnu'}</p>
                      <p className="mt-1 text-sm text-text/65">
                        {appointment.doctor_name || 'Médecin inconnu'} | {formatDate(appointment.slot_start)}
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] ${statusTone(appointment.status)}`}>
                      {statusLabel(appointment.status)}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                      {appointment.type === 'video' ? 'Téléconsultation' : 'Présentiel'}
                    </span>
                    {appointment.reason && (
                      <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-text">
                        {appointment.reason}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
