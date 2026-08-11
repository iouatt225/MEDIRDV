'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { Activity, ArrowLeft, Users, Video } from 'lucide-react';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { apiClient } from '@/lib/api/client';
import { AdminDashboardResponse } from '@/types/admin';

const pieColors = {
  confirme: '#22C55E',
  annule: '#E65757',
  effectue: '#00A8BC',
  manque: '#F59E0B',
} as const;

export default function AdminAnalyticsPage() {
  const { data, isLoading, isError, refetch } = useQuery<AdminDashboardResponse>({
    queryKey: ['admin-dashboard'],
    queryFn: () => apiClient.get('/api/v1/admin/dashboard'),
  });

  const activitySeries = data?.activity_series ?? [];
  const roleDistribution = data?.role_distribution ?? [];
  const appointmentStatusBreakdown = data?.appointment_status_breakdown ?? [];
  const totalRoles = roleDistribution.reduce((sum, item) => sum + item.count, 0);

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
              <Activity className="h-3.5 w-3.5" />
              Analytics 30 jours
            </div>
            <h1 className="text-3xl font-extrabold text-primary lg:text-5xl">Activité médicale et flux des rendez-vous</h1>
            <p className="max-w-2xl text-sm leading-7 text-text lg:text-base">
              Cette page concentre l’analyse de la plateforme: tendance des inscriptions, volume des rendez-vous,
              répartition des rôles et consultation du mix présentiel / téléconsultation.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:min-w-[430px]">
            {[
              { label: 'Comptes', value: data?.overview.total_users ?? 0 },
              { label: 'RDV', value: data?.overview.appointments_total ?? 0 },
              { label: 'Confirmés', value: data?.overview.appointments_confirmed ?? 0 },
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
          <p className="text-lg font-bold text-primary">Impossible de charger les graphiques</p>
          <Button className="mt-4" onClick={() => refetch()}>
            Réessayer
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
            <Card hoverable={false} className="border border-white/70 bg-white/80 p-6 shadow-card">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.3em] text-text/55">Activité quotidienne</p>
                  <h2 className="mt-2 text-2xl font-bold text-primary">Rendez-vous et nouvelles inscriptions</h2>
                </div>
                <Users className="h-10 w-10 text-accent" />
              </div>
              <div className="mt-6 h-[340px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={activitySeries}>
                    <defs>
                      <linearGradient id="analyticsAppointments" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00A8BC" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#00A8BC" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="analyticsUsers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#08363B" stopOpacity={0.28} />
                        <stop offset="95%" stopColor="#08363B" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(8, 54, 59, 0.08)" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} stroke="#6B7280" />
                    <YAxis tickLine={false} axisLine={false} stroke="#6B7280" />
                    <Tooltip contentStyle={{ borderRadius: '20px', border: '1px solid rgba(8, 54, 59, 0.12)', background: 'rgba(255, 255, 255, 0.95)' }} />
                    <Legend />
                    <Area type="monotone" dataKey="appointments" name="RDV" stroke="#00A8BC" fill="url(#analyticsAppointments)" strokeWidth={3} />
                    <Area type="monotone" dataKey="new_users" name="Nouveaux comptes" stroke="#08363B" fill="url(#analyticsUsers)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card hoverable={false} className="border border-white/70 bg-white/80 p-6 shadow-card">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-text/55">Statuts</p>
                <h2 className="mt-2 text-2xl font-bold text-primary">Cycle de vie des rendez-vous</h2>
              </div>
              <div className="mt-6 h-[340px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip contentStyle={{ borderRadius: '20px', border: '1px solid rgba(8, 54, 59, 0.12)', background: 'rgba(255, 255, 255, 0.95)' }} />
                    <Legend />
                    <Pie data={appointmentStatusBreakdown} dataKey="count" nameKey="label" innerRadius={70} outerRadius={120} paddingAngle={3}>
                      {appointmentStatusBreakdown.map((entry) => (
                        <Cell key={entry.status} fill={pieColors[entry.status]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <Card hoverable={false} className="border border-white/70 bg-white/80 p-6 shadow-card">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.3em] text-text/55">Rôles</p>
                  <h2 className="mt-2 text-2xl font-bold text-primary">Nouvelles inscriptions par rôle</h2>
                </div>
                <Users className="h-10 w-10 text-accent" />
              </div>
              <div className="mt-6 h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activitySeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(8, 54, 59, 0.08)" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} stroke="#6B7280" />
                    <YAxis tickLine={false} axisLine={false} stroke="#6B7280" />
                    <Tooltip contentStyle={{ borderRadius: '20px', border: '1px solid rgba(8, 54, 59, 0.12)', background: 'rgba(255, 255, 255, 0.95)' }} />
                    <Legend />
                    <Bar dataKey="new_doctors" name="Médecins" stackId="roles" fill="#00A8BC" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="new_secretaries" name="Secrétaires" stackId="roles" fill="#F59E0B" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="new_patients" name="Patients" stackId="roles" fill="#22C55E" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="new_admins" name="Admins" stackId="roles" fill="#08363B" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card hoverable={false} className="border border-white/70 bg-white/80 p-6 shadow-card">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.3em] text-text/55">Consultations</p>
                  <h2 className="mt-2 text-2xl font-bold text-primary">Présentiel vs téléconsultation</h2>
                </div>
                <Video className="h-10 w-10 text-accent" />
              </div>
              <div className="mt-6 space-y-4">
                {[
                  { label: 'Présentiel', value: activitySeries.reduce((sum, item) => sum + item.presentiel_appointments, 0) },
                  { label: 'Téléconsultation', value: activitySeries.reduce((sum, item) => sum + item.video_appointments, 0) },
                ].map((item) => (
                  <div key={item.label} className="rounded-3xl bg-secondary/60 p-5">
                    <p className="text-xs font-bold uppercase tracking-[0.3em] text-text/55">{item.label}</p>
                    <p className="mt-2 text-3xl font-extrabold text-primary">{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activitySeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(8, 54, 59, 0.08)" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} stroke="#6B7280" />
                    <YAxis tickLine={false} axisLine={false} stroke="#6B7280" />
                    <Tooltip contentStyle={{ borderRadius: '20px', border: '1px solid rgba(8, 54, 59, 0.12)', background: 'rgba(255, 255, 255, 0.95)' }} />
                    <Legend />
                    <Bar dataKey="presentiel_appointments" name="Présentiel" stackId="consultations" fill="#08363B" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="video_appointments" name="Téléconsultation" stackId="consultations" fill="#00A8BC" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {roleDistribution.map((item) => {
              const percent = totalRoles > 0 ? (item.count / totalRoles) * 100 : 0;
              return (
                <div key={item.role} className="rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-card">
                  <p className="text-xs font-bold uppercase tracking-[0.3em] text-text/55">{item.label}</p>
                  <p className="mt-3 text-4xl font-extrabold text-primary">{item.count}</p>
                  <p className="mt-2 text-sm text-text">{percent.toFixed(0)}% du total</p>
                </div>
              );
            })}
          </section>
        </div>
      )}
    </div>
  );
}
