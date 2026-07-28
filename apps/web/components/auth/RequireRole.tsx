'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore, UserRole } from '@/stores/useAuthStore';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

interface RequireRoleProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

export default function RequireRole({ allowedRoles, children }: RequireRoleProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.push(`/connexion?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [mounted, isAuthenticated, router, pathname]);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  if (user && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary p-4">
        <Card hoverable={false} className="max-w-md text-center p-8 bg-white">
          <h2 className="text-2xl font-bold text-primary mb-4">Accès refusé</h2>
          <p className="text-text mb-6">
            Votre profil ({user.role}) ne vous permet pas d&apos;accéder à cette page.
          </p>
          <div className="flex justify-center gap-4">
            <Button variant="secondary" onClick={() => router.push('/')}>
              Retour à l&apos;accueil
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                useAuthStore.getState().logout();
                router.push('/connexion');
              }}
            >
              Se connecter
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
