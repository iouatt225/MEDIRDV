'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Activity,
  Bell,
  CalendarDays,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Sparkles,
  Stethoscope,
  Users,
} from 'lucide-react';

import Button from '@/components/ui/Button';
import { useAuthStore } from '@/stores/useAuthStore';

const adminNav = [
  { label: "Vue d'ensemble", href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Utilisateurs', href: '/admin/users', icon: Users },
  { label: 'Activite', href: '/admin/analytics', icon: Activity },
  { label: 'Rendez-vous', href: '/admin/appointments', icon: CalendarDays },
];

interface AdminShellProps {
  children: React.ReactNode;
}

function isActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function getSectionLabel(pathname: string | null) {
  if (!pathname) return "Vue d'ensemble";
  if (pathname.startsWith('/admin/users')) return 'Utilisateurs';
  if (pathname.startsWith('/admin/analytics')) return 'Activite';
  if (pathname.startsWith('/admin/appointments')) return 'Rendez-vous';
  return "Vue d'ensemble";
}

export default function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const today = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).format(new Date());

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(0,168,188,0.16),_transparent_24%),radial-gradient(circle_at_top_right,_rgba(11,20,32,0.08),_transparent_28%),linear-gradient(180deg,_#eef3f8_0%,_#f7fafc_44%,_#ffffff_100%)] text-primary">
      <div className="mx-auto grid min-h-screen max-w-[1680px] lg:grid-cols-[278px_minmax(0,1fr)]">
        <aside className="hidden border-r border-slate-200/80 bg-[linear-gradient(180deg,_#f8fbff_0%,_#eef5fb_100%)] text-[#0b1420] lg:flex lg:flex-col">
          <div className="px-5 pt-5">
            <div className="flex items-center gap-3 rounded-[28px] border border-slate-200 bg-white px-4 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8fbfd] text-[#00a8bc] ring-1 ring-[#00a8bc]/10">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.45em] text-slate-500">MediRDV</p>
                <h1 className="text-lg font-semibold text-[#0b1420]">Admin Orbit</h1>
              </div>
            </div>
          </div>

          <div className="px-5 pt-5">
            <div className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e8fbfd] text-[#00a8bc]">
                  <Stethoscope className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Session</p>
                  <p className="truncate text-sm font-semibold text-[#0b1420]">
                    {user?.first_name} {user?.last_name}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Pilotage global des comptes, des rendez-vous et des indicateurs plateforme.
              </p>
            </div>
          </div>

          <nav className="mt-5 flex-1 px-3">
            <p className="px-3 pb-3 text-[11px] font-semibold uppercase tracking-[0.45em] text-slate-500">
              Navigation
            </p>
            <div className="space-y-1">
              {adminNav.map((item) => {
                const Icon = item.icon;
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={[
                      'group flex items-center gap-3 rounded-[22px] px-4 py-3 text-sm font-medium transition-all duration-300',
                      active
                        ? 'bg-white text-[#0b1420] shadow-[0_18px_45px_rgba(15,23,42,0.08)] ring-1 ring-slate-200'
                        : 'text-slate-600 hover:bg-white hover:text-[#0b1420]',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'flex h-9 w-9 items-center justify-center rounded-2xl transition-colors',
                        active ? 'bg-[#e8fbfd] text-[#00a8bc]' : 'bg-slate-100 text-slate-500',
                      ].join(' ')}
                    >
                      <Icon className="h-4.5 w-4.5" />
                    </span>
                    {item.label}
                    {active && <span className="ml-auto h-2 w-2 rounded-full bg-[#00a8bc]" />}
                  </Link>
                );
              })}
            </div>
          </nav>

          <div className="px-5 pb-5">
            <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-slate-500">
                Supervision
              </p>
              <p className="mt-3 text-xl font-semibold text-[#0b1420]">Vue d'ensemble temps reel</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Un cockpit plus dense, plus lisible et plus rapide pour suivre l'activite.
              </p>
            </div>

            <Button
              variant="secondary"
              fullWidth
              className="mt-4 !border-slate-200 !bg-white !text-[#0b1420] hover:!bg-slate-50"
              onClick={() => {
                logout();
                router.push('/connexion');
              }}
            >
              <LogOut className="h-4 w-4" />
              Deconnexion
            </Button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-col">
          <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-[0_10px_24px_rgba(15,23,42,0.05)] lg:hidden"
                  aria-label="Ouvrir la navigation"
                >
                  <Menu className="h-5 w-5" />
                </button>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0b1420] text-[#7ddfe7] shadow-[0_12px_24px_rgba(11,20,32,0.18)] lg:hidden">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-500">
                    {getSectionLabel(pathname)}
                  </p>
                  <h2 className="text-xl font-semibold text-[#0b1420] sm:text-2xl">MediRDV Control Center</h2>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3 rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                  <Search className="h-4 w-4 text-slate-400" />
                  <input
                    aria-label="Rechercher"
                    placeholder="Rechercher un utilisateur, un RDV..."
                    className="w-52 bg-transparent text-sm outline-none placeholder:text-slate-400 sm:w-60"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <div className="hidden items-center gap-2 rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-[0_10px_30px_rgba(15,23,42,0.05)] sm:flex">
                    <CalendarDays className="h-4 w-4 text-[#00a8bc]" />
                    {today}
                  </div>
                  <div className="flex items-center gap-2 rounded-[18px] border border-[#00a8bc]/15 bg-[#e8fbfd] px-4 py-3 text-sm font-medium text-[#0b6270]">
                    <Bell className="h-4 w-4" />
                    {user?.role ?? 'admin'}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
              {adminNav.map((item) => {
                const Icon = item.icon;
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={[
                      'inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                      active
                        ? 'border-[#0b1420] bg-[#0b1420] text-white'
                        : 'border-slate-200 bg-white text-slate-700',
                    ].join(' ')}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
