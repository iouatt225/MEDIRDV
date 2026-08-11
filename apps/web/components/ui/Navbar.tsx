'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, LogOut, Menu, User as UserIcon, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import Button from '@/components/ui/Button';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/stores/useAuthStore';

type NavRole = 'visitor' | 'patient' | 'praticien' | 'admin';

interface NavItem {
  label: string;
  href: string;
}

interface InAppNotification {
  id: string;
  type: string;
  trigger: string;
  status: string;
  created_at: string | null;
}

const navByRole: Record<NavRole, NavItem[]> = {
  visitor: [
    { label: 'Accueil', href: '/' },
    { label: 'Rechercher', href: '/recherche' },
    { label: 'A propos', href: '/a-propos' },
    { label: 'Contact', href: '/contact' },
  ],
  patient: [
    { label: 'Accueil', href: '/' },
    { label: 'Mes rendez-vous', href: '/mes-rendez-vous' },
    { label: 'Rechercher', href: '/recherche' },
  ],
  praticien: [
    { label: 'Dashboard', href: '/praticien/dashboard' },
    { label: 'Profil', href: '/praticien/profil' },
    { label: 'Agenda', href: '/praticien/agenda' },
    { label: 'Patients', href: '/praticien/patients' },
    { label: 'Parametres', href: '/praticien/parametres' },
  ],
  admin: [
    { label: 'Dashboard', href: '/admin/dashboard' },
    { label: 'Utilisateurs', href: '/admin/users' },
    { label: 'Rendez-vous', href: '/admin/appointments' },
    { label: 'Analytics', href: '/admin/analytics' },
  ],
};

function getNotificationText(notification: InAppNotification) {
  if (notification.trigger === 'confirm') return 'Rendez-vous confirme';
  if (notification.trigger === 'cancellation') return 'Rendez-vous annule';
  if (notification.trigger === 'h1' || notification.trigger === 'j1') return 'Rappel de consultation';
  if (notification.trigger === 'post_consultation') return 'Recapitulatif disponible';
  return 'Notification';
}

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [notifsOpen, setNotifsOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuthStore();

  const activeRole: NavRole =
    mounted && isAuthenticated && user
      ? user.role === 'patient'
        ? 'patient'
        : user.role === 'admin'
          ? 'admin'
          : 'praticien'
      : 'visitor';

  const { data: notifications } = useQuery<InAppNotification[]>({
    queryKey: ['navbar-notifications'],
    queryFn: () => apiClient.get('/api/v1/notifications'),
    enabled: mounted && isAuthenticated && activeRole !== 'admin',
    refetchInterval: 15000,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const handleLogout = () => {
    logout();
    setMobileOpen(false);
    router.push('/');
  };

  const userName = mounted && isAuthenticated && user ? `${user.first_name} ${user.last_name}` : '';
  const items = navByRole[activeRole];

  return (
    <header className="fixed inset-x-0 top-0 z-[100] border-b border-slate-200/80 bg-white/92 shadow-nav backdrop-blur-xl">
      <nav className="mx-auto max-w-[85rem] px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between gap-4">
          <Link
            href="/"
            className="flex-none text-2xl font-light text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/80 focus-visible:ring-offset-2"
            aria-label="MediRDV"
          >
            <span className="font-semibold text-accent">Medi</span>
            <span className="font-semibold text-slate-900">RDV</span>
          </Link>

          <div className="hidden flex-1 items-center justify-center xl:flex">
            <div className="flex items-center gap-1">
              {items.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      active ? 'bg-slate-100 text-slate-950 underline underline-offset-4' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="hidden items-center gap-3 xl:flex">
            {activeRole === 'visitor' ? (
              <>
                <Link href="/connexion" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
                  Connexion
                </Link>
                <Link href="/inscription">
                  <Button size="sm">S&apos;inscrire</Button>
                </Link>
              </>
            ) : (
              <>
                {activeRole !== 'admin' && (
                  <div className="relative">
                    <button
                      onClick={() => setNotifsOpen((open) => !open)}
                      className="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100"
                      aria-label="Notifications"
                    >
                      <Bell className="h-4 w-4" />
                      {!!notifications?.length && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent" />}
                    </button>

                    {notifsOpen && (
                      <div className="absolute right-0 top-full mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
                        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                          <span className="text-sm font-bold text-slate-900">Notifications</span>
                          <span className="text-[10px] font-bold uppercase text-accent">live</span>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto">
                          {!notifications?.length ? (
                            <div className="p-4 text-center text-xs text-slate-500">Aucune notification recente.</div>
                          ) : (
                            notifications.map((notification) => (
                              <div key={notification.id} className="border-b border-slate-100 p-3 last:border-0">
                                <p className="truncate text-xs font-semibold text-slate-900">{getNotificationText(notification)}</p>
                                <p className="mt-1 text-[10px] text-slate-500">
                                  {notification.type === 'email' ? 'E-mail' : 'SMS'} - {notification.status === 'sent' ? 'envoye' : 'echec'}
                                </p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700">
                  <UserIcon className="h-4 w-4 text-accent" />
                  <span>{userName}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100"
                  aria-label="Deconnexion"
                  title="Deconnexion"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            )}
          </div>

          <button
            onClick={() => setMobileOpen((open) => !open)}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-800 hover:bg-slate-100 xl:hidden"
            aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </nav>

      <div className={`overflow-hidden border-t border-slate-200 bg-white transition-all duration-300 xl:hidden ${mobileOpen ? 'max-h-screen py-3' : 'max-h-0'}`}>
        <div className="mx-auto max-w-[85rem] space-y-1 px-4 sm:px-6 lg:px-8">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              {item.label}
            </Link>
          ))}
          <div className="border-t border-slate-200 pt-2">
            {activeRole === 'visitor' ? (
              <>
                <Link href="/connexion" onClick={() => setMobileOpen(false)} className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
                  Connexion
                </Link>
                <Link href="/inscription" onClick={() => setMobileOpen(false)} className="block rounded-lg px-3 py-2 text-sm font-bold text-accent hover:bg-teal-50">
                  S&apos;inscrire
                </Link>
              </>
            ) : (
              <button onClick={handleLogout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
                <LogOut className="h-4 w-4" />
                Deconnexion
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
