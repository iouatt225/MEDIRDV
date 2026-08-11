'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Activity,
  CalendarDays,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';

import RequireRole from '@/components/auth/RequireRole';
import Button from '@/components/ui/Button';
import { useAuthStore } from '@/stores/useAuthStore';

const adminNav = [
  { label: "Vue d'ensemble", href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Utilisateurs', href: '/admin/users', icon: Users },
  { label: 'Activite', href: '/admin/analytics', icon: Activity },
  { label: 'Rendez-vous', href: '/admin/appointments', icon: CalendarDays },
  { label: 'Sante', href: '/admin/system', icon: ShieldCheck },
];

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  return (
    <RequireRole allowedRoles={['admin']}>
      <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(0,168,188,0.16),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(8,54,59,0.18),_transparent_26%),linear-gradient(180deg,_#081e21_0%,_#eef9fc_20%,_#f8fcfd_100%)]">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 right-0 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
          <div className="absolute top-1/3 left-0 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 h-64 w-64 rounded-full bg-brand-light/20 blur-3xl" />
        </div>

        <div className="relative mx-auto flex min-h-screen max-w-[1600px]">
          <aside className="hidden xl:flex w-80 flex-col border-r border-white/20 bg-primary/90 px-6 py-8 text-white backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-accent">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-white/55">MediRDV</p>
                <h1 className="text-xl font-bold text-white">Admin Center</h1>
              </div>
            </div>

            <div className="mt-10 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/45">
                Navigation
              </p>
              {adminNav.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-white/80 transition-all duration-300 hover:bg-white/10 hover:text-white"
                  >
                    <Icon className="h-4 w-4 text-accent transition-transform duration-300 group-hover:scale-110" />
                    {item.label}
                  </Link>
                );
              })}
            </div>

            <div className="mt-10 rounded-3xl border border-white/10 bg-white/6 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-white">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/45">Session</p>
                  <p className="text-sm font-semibold text-white">
                    {user?.first_name} {user?.last_name}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-white/70">
                Supervision globale de la plateforme, des acces et des indicateurs cles.
              </p>
            </div>

            <div className="mt-auto pt-8">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => {
                  logout();
                  router.push('/connexion');
                }}
                className="!border-white/20 !text-white hover:!bg-white hover:!text-primary"
              >
                <LogOut className="h-4 w-4" />
                Deconnexion
              </Button>
            </div>
          </aside>

          <div className="flex min-h-screen flex-1 flex-col">
            <header className="border-b border-white/30 bg-white/70 px-4 py-4 backdrop-blur-xl lg:px-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.35em] text-text/60">
                    Espace administrateur
                  </p>
                  <h2 className="text-2xl font-bold text-primary lg:text-3xl">
                    Tableau de bord ultra moderne
                  </h2>
                </div>
                <div className="flex items-center gap-3">
                  <div className="rounded-full border border-accent/20 bg-accent/10 px-4 py-2 text-sm font-semibold text-accent">
                    {user?.role ?? 'admin'}
                  </div>
                  <div className="hidden sm:flex items-center gap-2 rounded-full border border-divider bg-white px-4 py-2 text-sm font-medium text-text shadow-card">
                    <CalendarDays className="h-4 w-4 text-accent" />
                    {new Date().toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex gap-2 overflow-x-auto pb-1 xl:hidden">
                {adminNav.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-divider bg-white px-4 py-2 text-sm font-semibold text-primary shadow-card"
                    >
                      <Icon className="h-4 w-4 text-accent" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </header>

            <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
          </div>
        </div>
      </div>
    </RequireRole>
  );
}
