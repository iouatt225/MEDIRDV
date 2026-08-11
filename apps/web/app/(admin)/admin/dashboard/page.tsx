'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  ArrowRight,
  CalendarCheck2,
  ShieldCheck,
  Users,
  Video,
  Building2,
  UserRound,
} from 'lucide-react';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/stores/useAuthStore';
import { AdminDashboardResponse } from '@/types/admin';

const overviewCards = [
  { key: 'total_users', label: 'Utilisateurs', icon: Users },
  { key: 'doctors', label: 'Médecins', icon: Building2 },
  { key: 'patients', label: 'Patients', icon: UserRound },
  { key: 'appointments_total', label: 'Rendez-vous', icon: CalendarCheck2 },
] as const;

const actionCards = [
  {
    title: 'Gérer les utilisateurs',
    desc: 'Ouvrir la liste, les détails et les actions de désactivation.',
    href: '/admin/users',
    icon: Users,
  },
  {
    title: 'Analyser l’activité',
    desc: 'Voir les tendances 30 jours par rôle, jour et consultation.',
    href: '/admin/analytics',
    icon: Activity,
  },
  {
    title: 'Rendez-vous',
    desc: 'Explorer les derniers rendez-vous et leur cycle de vie.',
    href: '/admin/appointments',
    icon: CalendarCheck2,
  },
  {
    title: 'Santé système',
    desc: 'Contrôler la base, Redis et le snapshot d’exploitation.',
    href: '/admin/system',
    icon: ShieldCheck,
  },
];

export default function AdminDashboardPage() {
  const { user } = useAuthStore();

  const { data, isLoading, isError, refetch } = useQuery<AdminDashboardResponse>({
    queryKey: ['admin-dashboard'],
    queryFn: () => apiClient.get('/api/v1/admin/dashboard'),
  });

  const overview = data?.overview;
  const roleDistribution = data?.role_distribution ?? [];

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[36px] border border-white/60 bg-white/75 p-6 shadow-[0_24px_80px_rgba(8,54,59,0.12)] backdrop-blur-xl lg:p-8">
        <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-36 w-36 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.35em] text-accent">
              Cockpit admin
            </div>
            <h1 className="text-3xl font-extrabold text-primary lg:text-5xl">
              Bonjour {user?.first_name}, voici les accès principaux.
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-text lg:text-base">
              Le dashboard ne concentre plus la charge fonctionnelle. Il présente les indicateurs clés
              et redirige vers des pages dédiées pour chaque sujet métier.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:min-w-[430px]">
            {overviewCards.map((metric) => {
              const Icon = metric.icon;
              const value = overview?.[metric.key] ?? 0;
              return (
                <div key={metric.key} className="rounded-3xl border border-divider bg-secondary/60 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-text/55">
                        {metric.label}
                      </p>
                      <p className="mt-2 text-2xl font-extrabold text-primary">{value}</p>
                    </div>
                    <Icon className="h-6 w-6 text-accent" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-accent border-t-transparent" />
        </div>
      ) : isError ? (
        <Card hoverable={false} className="border border-error/20 bg-error/10 p-6 text-center">
          <p className="text-lg font-bold text-primary">Impossible de charger le tableau de bord</p>
          <Button className="mt-4" onClick={() => refetch()}>
            Réessayer
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {actionCards.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="group rounded-[28px] border border-white/70 bg-white/80 p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                        <Icon className="h-6 w-6" />
                      </div>
                      <h2 className="mt-4 text-xl font-bold text-primary">{action.title}</h2>
                      <p className="mt-2 text-sm leading-6 text-text">{action.desc}</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-accent transition-transform duration-300 group-hover:translate-x-1" />
                  </div>
                </Link>
              );
            })}
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <Card hoverable={false} className="border border-white/70 bg-white/80 p-6 shadow-card">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.3em] text-text/55">Répartition</p>
                  <h2 className="mt-2 text-2xl font-bold text-primary">Population de la plateforme</h2>
                </div>
                <Users className="h-10 w-10 text-accent" />
              </div>

              <div className="mt-6 space-y-4">
                {roleDistribution.map((item) => {
                  const total = roleDistribution.reduce((sum, role) => sum + role.count, 0) || 1;
                  const percent = (item.count / total) * 100;
                  return (
                    <div key={item.role} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-primary">{item.label}</span>
                        <span className="text-text">{item.count} | {percent.toFixed(0)}%</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-secondary">
                        <div
                          className={`h-full rounded-full ${
                            item.role === 'admin'
                              ? 'bg-primary'
                              : item.role === 'medecin'
                                ? 'bg-accent'
                                : item.role === 'secretaire'
                                  ? 'bg-warning'
                                  : 'bg-success'
                          }`}
                          style={{ width: `${Math.max(percent, 6)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card hoverable={false} className="border border-white/70 bg-white/80 p-6 shadow-card">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-text/55">Accès rapides</p>
              <h2 className="mt-2 text-2xl font-bold text-primary">Aller droit au sujet</h2>

              <div className="mt-6 space-y-3">
                {[
                  { title: 'Utilisateurs', href: '/admin/users' },
                  { title: 'Activité', href: '/admin/analytics' },
                  { title: 'Rendez-vous', href: '/admin/appointments' },
                  { title: 'Santé système', href: '/admin/system' },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center justify-between rounded-3xl border border-divider bg-white p-4 transition hover:bg-secondary/30"
                  >
                    <span className="font-semibold text-primary">{item.title}</span>
                    <ArrowRight className="h-4 w-4 text-accent" />
                  </Link>
                ))}
              </div>
            </Card>
          </section>
        </div>
      )}
    </div>
  );
}
