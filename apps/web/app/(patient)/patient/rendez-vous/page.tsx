'use client';

import RequireRole from '@/components/auth/RequireRole';
import { useAuthStore } from '@/stores/useAuthStore';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

export default function PatientDashboardPage() {
  const { user } = useAuthStore();

  return (
    <RequireRole allowedRoles={['patient']}>
      <div className="min-h-screen bg-secondary pt-28 pb-16 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-primary mb-2">
              Bienvenue, {user?.first_name} {user?.last_name}
            </h1>
            <p className="text-text">Espace Patient — Retrouvez et gérez vos rendez-vous médicaux.</p>
          </div>

          {/* Main content grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card hoverable={false} className="md:col-span-2 p-6 bg-white">
              <h2 className="text-xl font-bold text-primary mb-4">Vos rendez-vous à venir</h2>
              <div className="py-12 text-center text-text/60 border border-dashed border-divider rounded-pluxes-sm">
                Aucun rendez-vous planifié pour le moment.
              </div>
              <div className="mt-6 flex justify-end">
                <Button onClick={() => window.location.href = '/recherche'}>
                  Prendre rendez-vous
                </Button>
              </div>
            </Card>

            <Card hoverable={false} className="p-6 bg-white">
              <h2 className="text-xl font-bold text-primary mb-4">Vos informations</h2>
              <div className="space-y-4 text-sm text-text">
                <div>
                  <span className="font-semibold block text-primary">Rôle</span>
                  <span className="capitalize">{user?.role}</span>
                </div>
                <div>
                  <span className="font-semibold block text-primary">ID Utilisateur</span>
                  <span className="font-mono">{user?.id}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </RequireRole>
  );
}
