'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Menu, X, ChevronDown, User as UserIcon, LogOut, Bell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import Button from '@/components/ui/Button';
import { useAuthStore } from '@/stores/useAuthStore';

type NavRole = 'visitor' | 'patient' | 'praticien';

interface NavItem {
  label: string;
  href: string;
  children?: NavItem[];
}

const navByRole: Record<NavRole, NavItem[]> = {
  visitor: [
    { label: 'Accueil', href: '/' },
    { label: 'Rechercher un médecin', href: '/recherche' },
    { label: 'À propos', href: '/a-propos' },
    { label: 'Contact', href: '/contact' },
  ],
  patient: [
    { label: 'Accueil', href: '/' },
    { label: 'Mes rendez-vous', href: '/mes-rendez-vous' },
    { label: 'Rechercher', href: '/recherche' },
  ],
  praticien: [
    { label: 'Tableau de bord', href: '/praticien/dashboard' },
    { label: 'Agenda', href: '/praticien/agenda' },
    { label: 'Patients', href: '/praticien/patients' },
  ],
};

interface InAppNotification {
  id: string;
  appointment_id: string;
  type: string;
  trigger: string;
  status: string;
  created_at: string | null;
}

export default function Navbar() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const { user, isAuthenticated, logout } = useAuthStore();

  const [notifsOpen, setNotifsOpen] = useState(false);

  // Fetch notifications with auto-refresh every 15s
  const { data: notifications } = useQuery<InAppNotification[]>({
    queryKey: ['navbar-notifications'],
    queryFn: () => apiClient.get('/api/v1/notifications'),
    enabled: mounted && isAuthenticated,
    refetchInterval: 15000,
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const handleLogout = () => {
    logout();
    setMobileOpen(false);
    router.push('/');
  };

  // Safe SSR check for active role and name
  const activeRole: NavRole =
    mounted && isAuthenticated && user
      ? user.role === 'patient'
        ? 'patient'
        : 'praticien'
      : 'visitor';

  const userName =
    mounted && isAuthenticated && user
      ? `${user.first_name} ${user.last_name}`
      : '';

  const items = navByRole[activeRole];

  return (
    <header
      className={`
        fixed top-0 left-0 right-0 z-[100]
        transition-all duration-300 ease-in-out
        ${scrolled
          ? 'bg-primary/95 backdrop-blur-md shadow-nav border-b border-divider-dark'
          : 'bg-transparent'
        }
      `}
    >
      <nav className="max-w-[1300px] mx-auto px-4 lg:px-[15px]">
        <div className="flex items-center justify-between h-20 lg:h-[90px]">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <Image
              src="/images/logo.svg"
              alt="MediRDV"
              width={140}
              height={40}
              priority
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-2">
            {items.map((item) => (
              <div key={item.href} className="relative group">
                <Link
                  href={item.href}
                  className="
                    flex items-center gap-1
                    px-3 py-3
                    text-base font-medium capitalize
                    text-white opacity-90 hover:opacity-100 hover:text-accent
                    transition-colors duration-300
                  "
                >
                  {item.label}
                  {item.children && <ChevronDown className="w-3.5 h-3.5" />}
                </Link>

                {/* Dropdown */}
                {item.children && (
                  <div
                    className="
                      absolute left-0 top-full pt-1
                      opacity-0 invisible
                      group-hover:opacity-100 group-hover:visible
                      transition-all duration-300
                    "
                  >
                    <div className="bg-accent rounded-pluxes-sm py-1 min-w-[235px]">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className="
                            block px-5 py-2
                            text-base font-medium text-white
                            hover:text-primary hover:pl-6
                            transition-all duration-300
                          "
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden lg:flex items-center gap-3">
            {activeRole === 'visitor' ? (
              <>
                <Link
                  href="/connexion"
                  className="
                    px-4 py-2.5
                    text-base font-medium text-white opacity-90 hover:opacity-100
                    hover:text-accent
                    transition-colors duration-300
                  "
                >
                  Connexion
                </Link>
                <Link href="/inscription">
                  <Button variant="primary" size="sm">
                    S&apos;inscrire
                  </Button>
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-3">
                {/* Notifications Bell Cloche */}
                <div className="relative mr-2">
                  <button
                    onClick={() => setNotifsOpen(!notifsOpen)}
                    className="
                      p-2 rounded-full
                      text-white opacity-70 hover:opacity-100 hover:bg-divider-dark
                      transition-colors duration-200
                      cursor-pointer relative
                    "
                    title="Notifications"
                  >
                    <Bell className="w-5 h-5" />
                    {notifications && notifications.length > 0 && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent animate-pulse" />
                    )}
                  </button>

                  {notifsOpen && (
                    <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-divider shadow-lg py-2 z-50 text-primary">
                      <div className="px-4 py-2 border-b border-divider font-bold text-sm text-primary flex justify-between items-center bg-secondary/30">
                        <span>Notifications</span>
                        <span className="text-[10px] text-accent uppercase font-bold">in-app</span>
                      </div>
                      <div className="max-h-[300px] overflow-y-auto">
                        {(!notifications || notifications.length === 0) ? (
                          <div className="p-4 text-center text-xs text-text/60 italic">
                            Aucune notification récente.
                          </div>
                        ) : (
                          notifications.map((notif) => {
                            const dateStr = notif.created_at
                              ? new Date(notif.created_at).toLocaleDateString('fr-FR', {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '';
                            
                            let iconColor = 'bg-secondary text-text';
                            let text = 'Notification';
                            if (notif.trigger === 'confirm') {
                              iconColor = 'bg-success/10 text-success border-success/20';
                              text = 'Rendez-vous confirmé';
                            } else if (notif.trigger === 'cancellation') {
                              iconColor = 'bg-error/10 text-error border-error/20';
                              text = 'Rendez-vous annulé';
                            } else if (notif.trigger === 'h1' || notif.trigger === 'j1') {
                              iconColor = 'bg-info/10 text-info border-info/20';
                              text = 'Rappel de consultation';
                            } else if (notif.trigger === 'post_consultation') {
                              iconColor = 'bg-accent/10 text-accent border-accent/20';
                              text = 'Récapitulatif disponible';
                            }

                            return (
                              <div key={notif.id} className="p-3 hover:bg-secondary/40 border-b border-divider last:border-0 text-left flex gap-3 items-start transition-colors">
                                <div className={`w-8 h-8 rounded-full border flex items-center justify-center flex-shrink-0 ${iconColor}`}>
                                  <Bell className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-primary truncate">{text}</p>
                                  <p className="text-[10px] text-text/70 mt-0.5 truncate">
                                    Canal : {notif.type === 'email' ? 'E-mail' : 'SMS'} — {notif.status === 'sent' ? 'envoyé' : 'échec'}
                                  </p>
                                  <p className="text-[9px] text-text/50 mt-1">{dateStr}</p>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 text-white opacity-90">
                  <UserIcon className="w-4 h-4" />
                  <span className="text-sm font-medium">{userName}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="
                    p-2 rounded-full
                    text-white opacity-70 hover:opacity-100 hover:bg-divider-dark
                    transition-colors duration-200
                    cursor-pointer
                  "
                  aria-label="Déconnexion"
                  title="Déconnexion"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="
              lg:hidden
              w-10 h-10
              flex items-center justify-center
              bg-accent rounded-pluxes-btn
              text-white
              cursor-pointer
            "
            aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div
        className={`
          lg:hidden
          overflow-hidden
          transition-all duration-300 ease-in-out
          bg-accent
          ${mobileOpen ? 'max-h-screen py-4' : 'max-h-0'}
        `}
      >
        <div className="max-w-[1300px] mx-auto px-4">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="
                block px-4 py-3
                text-base font-medium text-white
                hover:text-primary
                transition-colors duration-300
              "
            >
              {item.label}
            </Link>
          ))}
          <div className="border-t border-white/20 mt-3 pt-3">
            {activeRole === 'visitor' ? (
              <>
                <Link
                  href="/connexion"
                  onClick={() => setMobileOpen(false)}
                  className="block px-4 py-3 text-white font-medium"
                >
                  Connexion
                </Link>
                <Link
                  href="/inscription"
                  onClick={() => setMobileOpen(false)}
                  className="block px-4 py-3 text-white font-bold"
                >
                  S&apos;inscrire
                </Link>
              </>
            ) : (
              <button
                onClick={handleLogout}
                className="
                  flex items-center gap-2 px-4 py-3
                  text-white font-medium
                  cursor-pointer
                "
              >
                <LogOut className="w-4 h-4" />
                Déconnexion
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
