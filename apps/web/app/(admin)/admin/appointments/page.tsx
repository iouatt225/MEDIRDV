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
      return 'bg-emerald-50 text-emerald-700';
    case 'annule':
      return 'bg-rose-50 text-rose-700';
    case 'effectue':
      return 'bg-[#e8fbfd] text-[#0b6270]';
    case 'manque':
      return 'bg-amber-50 text-amber-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function statusLabel(status: string) {
  switch (status) {
    case 'confirme':
      return 'Confirme';
    case 'annule':
      return 'Annule';
    case 'effectue':
      return 'Effectue';
    case 'manque':
      return 'Manque';
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
    <div className="space-y-6">
      <section className="rounded-[36px] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-7 lg:p-9">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <Link href="/admin/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-[#00a8bc]">
              <ArrowLeft className="h-4 w-4" />
              Retour au dashboard
            </Link>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#00a8bc]/15 bg-[#e8fbfd] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-[#0b6270]">
              <CalendarCheck2 className="h-3.5 w-3.5" />
              Rendez-vous
            </div>
            <h1 className="text-3xl font-semibold leading-tight text-[#0b1420] sm:text-4xl lg:text-5xl">
              Pilotage des rendez-vous et du flux clinique
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
              Une vue concentrée pour lire rapidement les statuts, les canaux de consultation et les derniers
              mouvements du planning.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:min-w-[460px]">
            {[
              { label: 'Total', value: data?.overview.appointments_total ?? 0 },
              { label: 'Confirmes', value: data?.overview.appointments_confirmed ?? 0 },
              { label: 'Annules', value: data?.overview.appointments_cancelled ?? 0 },
              { label: 'Semaine', value: data?.overview.appointments_week ?? 0 },
            ].map((item) => (
              <div key={item.label} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">{item.label}</p>
                <p className="mt-2 text-2xl font-semibold text-[#0b1420]">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#00a8bc] border-t-transparent" />
        </div>
      ) : isError ? (
        <Card hoverable={false} className="border border-rose-200 bg-rose-50 p-6 text-center shadow-none">
          <p className="text-lg font-semibold text-[#0b1420]">Impossible de charger les rendez-vous</p>
          <Button className="mt-4" onClick={() => refetch()}>
            Reessayer
          </Button>
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Card hoverable={false} className="border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">Etat du flux</p>
                <h2 className="mt-2 text-2xl font-semibold text-[#0b1420]">Synthese des statuts</h2>
              </div>
              <Clock3 className="h-10 w-10 text-[#00a8bc]" />
            </div>

            <div className="mt-6 space-y-4">
              {[
                { label: 'Confirmes', value: data?.overview.appointments_confirmed ?? 0 },
                { label: 'Annules', value: data?.overview.appointments_cancelled ?? 0 },
                { label: 'Effectues', value: data?.overview.appointments_effectue ?? 0 },
                { label: 'Manques', value: data?.overview.appointments_manque ?? 0 },
              ].map((item) => (
                <div key={item.label} className="rounded-[24px] bg-slate-50 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">{item.label}</p>
                  <p className="mt-2 text-3xl font-semibold text-[#0b1420]">{item.value}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card hoverable={false} className="border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">Derniers RDV</p>
                <h2 className="mt-2 text-2xl font-semibold text-[#0b1420]">Flux recent</h2>
              </div>
              <Video className="h-10 w-10 text-[#00a8bc]" />
            </div>

            <div className="mt-6 space-y-3">
              {appointments.length === 0 ? (
                <div className="rounded-[24px] bg-slate-50 p-5 text-sm text-slate-500">Aucun rendez-vous recent.</div>
              ) : (
                appointments.map((appointment) => (
                  <div key={appointment.id} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-semibold text-[#0b1420]">{appointment.patient_name || 'Patient inconnu'}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {appointment.doctor_name || 'Medecin inconnu'} | {formatDate(appointment.slot_start)}
                        </p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] ${statusTone(appointment.status)}`}>
                        {statusLabel(appointment.status)}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#e8fbfd] px-3 py-1 text-xs font-semibold text-[#0b6270]">
                        {appointment.type === 'video' ? 'Teleconsultation' : 'Presentiel'}
                      </span>
                      {appointment.reason && (
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600">
                          {appointment.reason}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
