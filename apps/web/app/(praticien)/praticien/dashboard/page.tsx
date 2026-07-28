'use client';

import RequireRole from '@/components/auth/RequireRole';
import { useAuthStore } from '@/stores/useAuthStore';
import Card from '@/components/ui/Card';
import InviteSecretaryCard from '@/components/auth/InviteSecretaryCard';
import JoinDoctorForm from '@/components/auth/JoinDoctorForm';

export default function PraticienDashboardPage() {
  const { user } = useAuthStore();

  return (
    <RequireRole allowedRoles={['medecin', 'secretaire']}>
      <div className="min-h-screen bg-secondary pt-28 pb-16 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-primary mb-2">
              Espace Praticien — {user?.role === 'medecin' ? 'Médecin' : 'Secrétaire'}
            </h1>
            <p className="text-text">
              Bienvenue, {user?.first_name} {user?.last_name}. Gérez votre agenda et vos consultations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Main agenda preview placeholder */}
            <Card hoverable={false} className="md:col-span-2 p-6 bg-white">
              <h2 className="text-xl font-bold text-primary mb-4">Aperçu de l&apos;agenda</h2>
              <div className="py-16 text-center text-text/60 border border-dashed border-divider rounded-pluxes-sm">
                L&apos;agenda et les rendez-vous seront intégrés ici dans le BLOC 3.
              </div>
            </Card>

            {/* Sidebar actions: Invite or Join */}
            <div className="space-y-6">
              {user?.role === 'medecin' && <InviteSecretaryCard />}
              {user?.role === 'secretaire' && <JoinDoctorForm />}

              <Card hoverable={false} className="p-6 bg-white">
                <h3 className="font-bold text-primary mb-3">Informations de connexion</h3>
                <div className="space-y-3 text-sm text-text">
                  <div>
                    <span className="font-semibold block text-primary font-mono text-xs">Identifiant</span>
                    <span className="font-mono text-xs">{user?.id}</span>
                  </div>
                  <div>
                    <span className="font-semibold block text-primary font-mono text-xs">Rôle</span>
                    <span className="capitalize">{user?.role}</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </RequireRole>
  );
}
