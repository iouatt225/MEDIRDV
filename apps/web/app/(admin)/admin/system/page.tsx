'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ShieldCheck, Database, ServerCog, Sparkles } from 'lucide-react';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { apiClient } from '@/lib/api/client';
import { AdminDashboardResponse } from '@/types/admin';

function tone(value?: string) {
  return value === 'connected' ? 'bg-success/10 text-success' : 'bg-error/10 text-error';
}

export default function AdminSystemPage() {
  const { data, isLoading, isError, refetch } = useQuery<AdminDashboardResponse>({
    queryKey: ['admin-dashboard'],
    queryFn: () => apiClient.get('/api/v1/admin/dashboard'),
  });

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
              <Sparkles className="h-3.5 w-3.5" />
              Santé système
            </div>
            <h1 className="text-3xl font-extrabold text-primary lg:text-5xl">Infrastructure et signaux opérationnels</h1>
            <p className="max-w-2xl text-sm leading-7 text-text lg:text-base">
              Vérification rapide de la base de données, de Redis et du snapshot de supervision.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:min-w-[430px]">
            {[
              { label: 'Actifs', value: data?.overview.active_users ?? 0 },
              { label: 'Liens', value: data?.overview.active_secretary_links ?? 0 },
              { label: 'Téléconsult.', value: data?.overview.video_appointments_week ?? 0 },
              { label: 'Admins', value: data?.overview.admins ?? 0 },
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
          <p className="text-lg font-bold text-primary">Impossible de charger l’état système</p>
          <Button className="mt-4" onClick={() => refetch()}>
            Réessayer
          </Button>
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Card hoverable={false} className="border border-white/70 bg-white/80 p-6 shadow-card">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-text/55">État</p>
                <h2 className="mt-2 text-2xl font-bold text-primary">Composants critiques</h2>
              </div>
              <ShieldCheck className="h-10 w-10 text-accent" />
            </div>

            <div className="mt-6 space-y-4">
              {[
                { label: 'Base de données', value: data?.system.database, icon: Database },
                { label: 'Redis', value: data?.system.redis, icon: ServerCog },
                { label: 'Snapshot', value: data?.meta.snapshot_at, icon: ShieldCheck },
              ].map((item) => {
                const Icon = item.icon;
                const pillTone = item.label === 'Snapshot' ? 'bg-secondary text-primary' : tone(item.value);
                return (
                  <div key={item.label} className="flex items-center justify-between rounded-2xl border border-divider bg-white px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-primary">{item.label}</p>
                        <p className="text-xs text-text/60">
                          {item.label === 'Snapshot' ? item.value : item.value}
                        </p>
                      </div>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.25em] ${pillTone}`}>
                      Live
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card hoverable={false} className="border border-white/70 bg-white/80 p-6 shadow-card">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-text/55">Résumé</p>
                <h2 className="mt-2 text-2xl font-bold text-primary">Lecture opérationnelle</h2>
              </div>
              <Sparkles className="h-10 w-10 text-accent" />
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {[
                { label: 'Utilisateurs actifs', value: data?.overview.active_users ?? 0 },
                { label: 'Médecins actifs', value: data?.overview.active_doctors ?? 0 },
                { label: 'Rendez-vous semaine', value: data?.overview.appointments_week ?? 0 },
                { label: 'Confirmés semaine', value: data?.overview.appointments_week_confirmed ?? 0 },
              ].map((item) => (
                <div key={item.label} className="rounded-3xl bg-secondary/60 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.3em] text-text/55">{item.label}</p>
                  <p className="mt-2 text-3xl font-extrabold text-primary">{item.value}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
