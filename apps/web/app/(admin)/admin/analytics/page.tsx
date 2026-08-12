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
import { Activity, ArrowLeft, BarChart3, Users, Video } from 'lucide-react';

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
  const totalRoles = roleDistribution.reduce((sum, item) => sum + item.count, 0) || 1;

  return (
    <div className="space-y-6">
      <section className="rounded-[36px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-8 lg:p-10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <Link href="/admin/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-[#00a8bc]">
              <ArrowLeft className="h-4 w-4" />
              Retour au dashboard
            </Link>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#00a8bc]/15 bg-[#e8fbfd] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-[#0b6270]">
              <Activity className="h-3.5 w-3.5" />
              Analytics 30 jours
            </div>
            <h1 className="text-3xl font-semibold leading-tight text-[#0b1420] sm:text-4xl lg:text-5xl">
              Activite medicale, courbes et repartition des flux
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
              Un espace plus analytique pour lire la tendance des inscriptions, le volume des rendez-vous, les
              statuts et le mix presentiel / teleconsultation.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:min-w-[460px]">
            {[
              { label: 'Comptes', value: data?.overview.total_users ?? 0 },
              { label: 'Rendez-vous', value: data?.overview.appointments_total ?? 0 },
              { label: 'Confirmes', value: data?.overview.appointments_confirmed ?? 0 },
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
          <p className="text-lg font-semibold text-[#0b1420]">Impossible de charger les graphiques</p>
          <Button className="mt-4" onClick={() => refetch()}>
            Reessayer
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
            <Card hoverable={false} className="border border-slate-200 bg-white p-0 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">Activite</p>
                  <h2 className="mt-2 text-2xl font-semibold text-[#0b1420]">Rendez-vous et nouvelles inscriptions</h2>
                </div>
                <div className="rounded-2xl bg-[#e8fbfd] p-3 text-[#00a8bc]">
                  <BarChart3 className="h-6 w-6" />
                </div>
              </div>
              <div className="h-[340px] px-4 py-4 sm:px-6">
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
                    <Area type="monotone" dataKey="appointments" name="RDV" stroke="#00A8BC" fill="url(#analyticsAppointments)" strokeWidth={3} />
                    <Area type="monotone" dataKey="new_users" name="Nouveaux comptes" stroke="#08363B" fill="url(#analyticsUsers)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card hoverable={false} className="border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">Statuts</p>
                <h2 className="mt-2 text-2xl font-semibold text-[#0b1420]">Cycle de vie des rendez-vous</h2>
              </div>
              <div className="mt-6 h-[280px]">
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
                    <Pie data={appointmentStatusBreakdown} dataKey="count" nameKey="label" innerRadius={70} outerRadius={110} paddingAngle={3}>
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
            <Card hoverable={false} className="border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">Repartition</p>
                  <h2 className="mt-2 text-2xl font-semibold text-[#0b1420]">Nouvelles inscriptions par role</h2>
                </div>
                <Users className="h-10 w-10 text-[#00a8bc]" />
              </div>
              <div className="mt-6 h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activitySeries}>
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
                    <Bar dataKey="new_doctors" name="Medecins" stackId="roles" fill="#00A8BC" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="new_secretaries" name="Secretaires" stackId="roles" fill="#F59E0B" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="new_patients" name="Patients" stackId="roles" fill="#22C55E" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="new_admins" name="Admins" stackId="roles" fill="#08363B" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card hoverable={false} className="border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">Consultations</p>
                  <h2 className="mt-2 text-2xl font-semibold text-[#0b1420]">Presentiel vs teleconsultation</h2>
                </div>
                <Video className="h-10 w-10 text-[#00a8bc]" />
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {[
                  { label: 'Presentiel', value: activitySeries.reduce((sum, item) => sum + item.presentiel_appointments, 0) },
                  { label: 'Teleconsultation', value: activitySeries.reduce((sum, item) => sum + item.video_appointments, 0) },
                ].map((item) => (
                  <div key={item.label} className="rounded-[24px] bg-slate-50 p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">{item.label}</p>
                    <p className="mt-2 text-3xl font-semibold text-[#0b1420]">{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activitySeries}>
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
                    <Bar dataKey="presentiel_appointments" name="Presentiel" stackId="consultations" fill="#08363B" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="video_appointments" name="Teleconsultation" stackId="consultations" fill="#00A8BC" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {roleDistribution.map((item) => {
              const percent = totalRoles > 0 ? (item.count / totalRoles) * 100 : 0;
              return (
                <div key={item.role} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_55px_rgba(15,23,42,0.06)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">{item.label}</p>
                  <p className="mt-3 text-4xl font-semibold text-[#0b1420]">{item.count}</p>
                  <p className="mt-2 text-sm text-slate-500">{percent.toFixed(0)}% du total</p>
                </div>
              );
            })}
          </section>
        </div>
      )}
    </div>
  );
}
