'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Database, ServerCog, ShieldCheck, Sparkles } from 'lucide-react';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { apiClient } from '@/lib/api/client';
import { AdminDashboardResponse } from '@/types/admin';

function statusTone(value?: string) {
  return value === 'connected' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700';
}

function statusLabel(value?: string) {
  switch (value) {
    case 'connected':
      return 'Connecte';
    case 'disconnected':
      return 'Deconnecte';
    case 'not_configured':
      return 'Non configure';
    default:
      return 'Inconnu';
  }
}

export default function AdminSystemPage() {
  const { data, isLoading, isError, refetch } = useQuery<AdminDashboardResponse>({
    queryKey: ['admin-dashboard'],
    queryFn: () => apiClient.get('/api/v1/admin/dashboard'),
  });

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
              <Sparkles className="h-3.5 w-3.5" />
              Configuration technique
            </div>
            <h1 className="text-3xl font-semibold leading-tight text-[#0b1420] sm:text-4xl lg:text-5xl">
              Infrastructure et signaux operationnels
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
              Une vue simple pour verifier la base, Redis et le snapshot technique sans surcharger l interface.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:min-w-[460px]">
            {[
              { label: 'Actifs', value: data?.overview.active_users ?? 0 },
              { label: 'Liens', value: data?.overview.active_secretary_links ?? 0 },
              { label: 'Teleconsult.', value: data?.overview.video_appointments_week ?? 0 },
              { label: 'Admins', value: data?.overview.admins ?? 0 },
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
          <p className="text-lg font-semibold text-[#0b1420]">Impossible de charger l etat systeme</p>
          <Button className="mt-4" onClick={() => refetch()}>
            Reessayer
          </Button>
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <Card hoverable={false} className="border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">Technique</p>
                <h2 className="mt-2 text-2xl font-semibold text-[#0b1420]">Composants critiques</h2>
              </div>
              <ShieldCheck className="h-10 w-10 text-[#00a8bc]" />
            </div>

            <div className="mt-6 space-y-4">
              {[
                { label: 'Base de donnees', value: data?.system.database, icon: Database },
                { label: 'Redis', value: data?.system.redis, icon: ServerCog },
                { label: 'Snapshot', value: data?.meta.snapshot_at, icon: ShieldCheck },
              ].map((item) => {
                const Icon = item.icon;
                const pillTone = item.label === 'Snapshot' ? 'bg-slate-100 text-slate-700' : statusTone(item.value);

                return (
                  <div key={item.label} className="flex items-center justify-between rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#e8fbfd] text-[#00a8bc]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#0b1420]">{item.label}</p>
                        <p className="text-xs text-slate-500">{item.label === 'Snapshot' ? item.value : statusLabel(item.value)}</p>
                      </div>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] ${pillTone}`}>
                      {item.label === 'Snapshot' ? 'Info' : 'Live'}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card hoverable={false} className="border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">Resume</p>
                <h2 className="mt-2 text-2xl font-semibold text-[#0b1420]">Lecture technique</h2>
              </div>
              <Sparkles className="h-10 w-10 text-[#00a8bc]" />
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {[
                { label: 'Utilisateurs actifs', value: data?.overview.active_users ?? 0 },
                { label: 'Medecins actifs', value: data?.overview.active_doctors ?? 0 },
                { label: 'Rendez-vous semaine', value: data?.overview.appointments_week ?? 0 },
                { label: 'Confirmes semaine', value: data?.overview.appointments_week_confirmed ?? 0 },
              ].map((item) => (
                <div key={item.label} className="rounded-[24px] bg-slate-50 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">{item.label}</p>
                  <p className="mt-2 text-3xl font-semibold text-[#0b1420]">{item.value}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
