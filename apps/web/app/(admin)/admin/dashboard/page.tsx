'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  ArrowRight,
  CalendarCheck2,
  Clock3,
  TrendingUp,
  Users,
  Video,
  Building2,
  UserRound,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/stores/useAuthStore';
import { AdminDashboardResponse } from '@/types/admin';

const overviewCards = [
  { key: 'total_users', label: 'Comptes', icon: Users },
  { key: 'doctors', label: 'Medecins', icon: Building2 },
  { key: 'patients', label: 'Patients', icon: UserRound },
  { key: 'appointments_total', label: 'Rendez-vous', icon: CalendarCheck2 },
] as const;

const quickActions = [
  {
    title: 'Utilisateurs',
    desc: 'Ouvrir la liste complete et les filtres de comptes.',
    href: '/admin/users',
    icon: Users,
  },
  {
    title: 'Activite',
    desc: 'Voir les courbes de 30 jours et les tendances metier.',
    href: '/admin/analytics',
    icon: Activity,
  },
  {
    title: 'Rendez-vous',
    desc: 'Suivre les derniers RDV, statuts et canaux.',
    href: '/admin/appointments',
    icon: CalendarCheck2,
  },
];

const pieColors = ['#00a8bc', '#08363b', '#0f766e', '#22c55e'] as const;

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

export default function AdminDashboardPage() {
  const { user } = useAuthStore();

  const { data, isLoading, isError, refetch } = useQuery<AdminDashboardResponse>({
    queryKey: ['admin-dashboard'],
    queryFn: () => apiClient.get('/api/v1/admin/dashboard'),
  });

  const overview = data?.overview;
  const roleDistribution = data?.role_distribution ?? [];
  const activitySeries = data?.activity_series ?? [];
  const recentUsers = data?.recent_users ?? [];
  const recentAppointments = data?.recent_appointments ?? [];
  const totalRoles = roleDistribution.reduce((sum, item) => sum + item.count, 0) || 1;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[36px] border border-slate-200 bg-white px-6 py-7 text-[#0b1420] shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:px-8 lg:px-10 lg:py-9">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(0,168,188,0.16),_transparent_28%),radial-gradient(circle_at_bottom_left,_rgba(15,23,42,0.04),_transparent_36%)]" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#00a8bc]/15 bg-[#e8fbfd] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-[#0b6270]">
              <TrendingUp className="h-3.5 w-3.5 text-[#00a8bc]" />
              Orbit style dashboard
            </div>
            <h1 className="text-3xl font-semibold leading-tight text-[#0b1420] sm:text-4xl lg:text-6xl">
              Bonjour {user?.first_name}, voici le cockpit de supervision.
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
              Une vue plus dense, plus nette et plus orientee action pour suivre les comptes, les rendez-vous
              et les roles de la plateforme sans changer la palette MediRDV.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/admin/users"
                className="inline-flex items-center gap-2 rounded-full bg-[#0b1420] px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5"
              >
                Gerer les comptes
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/admin/analytics"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#0b1420] transition hover:bg-slate-50"
              >
                Voir les analytics
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:min-w-[460px]">
            {overviewCards.map((metric) => {
              const Icon = metric.icon;
              const value = overview?.[metric.key] ?? 0;
              return (
                <div key={metric.key} className="rounded-[24px] border border-slate-200 bg-white/90 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">
                        {metric.label}
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-[#0b1420]">{value}</p>
                    </div>
                    <Icon className="h-5 w-5 text-[#00a8bc]" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#00a8bc] border-t-transparent" />
        </div>
      ) : isError ? (
        <Card hoverable={false} className="border border-rose-200 bg-rose-50 p-6 text-center shadow-none">
          <p className="text-lg font-semibold text-[#0b1420]">Impossible de charger le tableau de bord</p>
          <Button className="mt-4" onClick={() => refetch()}>
            Reessayer
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
            <Card hoverable={false} className="overflow-hidden border border-slate-200/80 bg-white p-0 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">
                    Activite 30 jours
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-[#0b1420]">Rendez-vous et nouveaux comptes</h2>
                </div>
                <div className="rounded-2xl bg-[#e8fbfd] p-3 text-[#00a8bc]">
                  <Activity className="h-6 w-6" />
                </div>
              </div>
              <div className="h-[360px] px-4 py-4 sm:px-6">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={activitySeries}>
                    <defs>
                      <linearGradient id="dashboardAppointments" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00a8bc" stopOpacity={0.32} />
                        <stop offset="95%" stopColor="#00a8bc" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="dashboardUsers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#08363b" stopOpacity={0.28} />
                        <stop offset="95%" stopColor="#08363b" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(15, 23, 42, 0.08)" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} stroke="#64748b" />
                    <YAxis tickLine={false} axisLine={false} stroke="#64748b" />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '18px',
                        border: '1px solid rgba(15, 23, 42, 0.08)',
                        background: 'rgba(255, 255, 255, 0.96)',
                      }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="appointments"
                      name="Rendez-vous"
                      stroke="#00a8bc"
                      fill="url(#dashboardAppointments)"
                      strokeWidth={3}
                    />
                    <Area
                      type="monotone"
                      dataKey="new_users"
                      name="Nouveaux comptes"
                      stroke="#08363b"
                      fill="url(#dashboardUsers)"
                      strokeWidth={3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <div className="space-y-6">
              <Card hoverable={false} className="border border-slate-200/80 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">
                      Repartition
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-[#0b1420]">Population de la plateforme</h2>
                  </div>
                  <Users className="h-10 w-10 text-[#00a8bc]" />
                </div>

                <div className="mt-6 h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip
                        contentStyle={{
                          borderRadius: '18px',
                          border: '1px solid rgba(15, 23, 42, 0.08)',
                          background: 'rgba(255, 255, 255, 0.96)',
                        }}
                      />
                      <Legend />
                      <Pie data={roleDistribution} dataKey="count" nameKey="label" innerRadius={55} outerRadius={95} paddingAngle={4}>
                        {roleDistribution.map((entry, index) => (
                          <Cell key={entry.role} fill={pieColors[index % pieColors.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-4 space-y-3">
                  {roleDistribution.map((item, index) => {
                    const percent = (item.count / totalRoles) * 100;
                    return (
                      <div key={item.role} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-[#0b1420]">{item.label}</span>
                          <span className="text-slate-500">
                            {item.count} | {percent.toFixed(0)}%
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.max(percent, 5)}%`,
                              backgroundColor: pieColors[index % pieColors.length],
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              <Card hoverable={false} className="border border-slate-200/80 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">
                      Temps reel
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-[#0b1420]">Dernier snapshot</h2>
                  </div>
                  <Clock3 className="h-10 w-10 text-[#00a8bc]" />
                </div>

                <div className="mt-6 rounded-[24px] bg-slate-50 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">Capture</p>
                  <p className="mt-2 text-lg font-semibold text-[#0b1420]">{formatDate(data?.meta.snapshot_at ?? null)}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {data?.meta.role_total ?? 0} comptes pris en compte dans le calcul des indicateurs.
                  </p>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-[20px] bg-[#e8fbfd] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#0b6270]">Confirmes</p>
                    <p className="mt-2 text-3xl font-semibold text-[#0b1420]">
                      {overview?.appointments_confirmed ?? 0}
                    </p>
                  </div>
                  <div className="rounded-[20px] bg-slate-100 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">Semaine</p>
                    <p className="mt-2 text-3xl font-semibold text-[#0b1420]">{overview?.appointments_week ?? 0}</p>
                  </div>
                </div>
              </Card>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <Card hoverable={false} className="overflow-hidden border border-slate-200/80 bg-white p-0 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">Derniers comptes</p>
                  <h2 className="mt-2 text-2xl font-semibold text-[#0b1420]">Activite utilisateur recente</h2>
                </div>
                <Users className="h-9 w-9 text-[#00a8bc]" />
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                      <th className="px-5 py-3">Utilisateur</th>
                      <th className="px-5 py-3">Role</th>
                      <th className="px-5 py-3">Statut</th>
                      <th className="px-5 py-3">Cree le</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentUsers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-8 text-center text-sm text-slate-500">
                          Aucun utilisateur recent.
                        </td>
                      </tr>
                    ) : (
                      recentUsers.slice(0, 5).map((item) => (
                        <tr key={item.id} className="border-t border-slate-100 hover:bg-slate-50/70">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#0b1420] text-sm font-semibold text-white">
                                {item.first_name.slice(0, 1)}
                                {item.last_name.slice(0, 1)}
                              </div>
                              <div>
                                <p className="font-medium text-[#0b1420]">
                                  {item.first_name} {item.last_name}
                                </p>
                                <p className="text-sm text-slate-500">{item.email || item.phone}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-sm text-slate-600">{item.role}</td>
                          <td className="px-5 py-3.5">
                            <span
                              className={[
                                'inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em]',
                                item.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700',
                              ].join(' ')}
                            >
                              {item.is_active ? 'Actif' : 'Inactif'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-sm text-slate-500">{formatDate(item.created_at)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card hoverable={false} className="border border-slate-200/80 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">Rendez-vous recents</p>
                  <h2 className="mt-2 text-2xl font-semibold text-[#0b1420]">Flux de supervision</h2>
                </div>
                <Video className="h-10 w-10 text-[#00a8bc]" />
              </div>

              <div className="mt-6 space-y-3">
                {recentAppointments.length === 0 ? (
                  <div className="rounded-[24px] bg-slate-50 p-5 text-sm text-slate-500">Aucun rendez-vous recent.</div>
                ) : (
                  recentAppointments.slice(0, 5).map((appointment) => (
                    <div key={appointment.id} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-[#0b1420]">{appointment.patient_name || 'Patient inconnu'}</p>
                          <p className="mt-1 text-sm text-slate-500">
                            {appointment.doctor_name || 'Medecin inconnu'} | {formatDate(appointment.slot_start)}
                          </p>
                        </div>
                        <span className="rounded-full bg-[#0b1420] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-white">
                          {appointment.type === 'video' ? 'Video' : 'Cabinet'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="group rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_20px_55px_rgba(15,23,42,0.06)] transition hover:-translate-y-1 hover:border-[#00a8bc]/25 hover:shadow-[0_28px_60px_rgba(15,23,42,0.1)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8fbfd] text-[#00a8bc]">
                        <Icon className="h-6 w-6" />
                      </div>
                      <h3 className="mt-4 text-lg font-semibold text-[#0b1420]">{action.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-500">{action.desc}</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-[#00a8bc]" />
                  </div>
                </Link>
              );
            })}
          </section>
        </div>
      )}
    </div>
  );
}
