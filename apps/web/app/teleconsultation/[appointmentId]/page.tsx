'use client';

import { useParams } from 'next/navigation';

import RequireRole from '@/components/auth/RequireRole';
import TeleconsultRoom from '@/components/teleconsult/TeleconsultRoom';
import { useAuthStore } from '@/stores/useAuthStore';

export default function TeleconsultationPage() {
  const params = useParams<{ appointmentId: string }>();
  const appointmentId = params?.appointmentId;
  const { user } = useAuthStore();

  if (!appointmentId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  const role = user?.role === 'medecin' ? 'medecin' : 'patient';
  const backHref = role === 'medecin' ? '/praticien/agenda' : '/mes-rendez-vous';
  const backLabel = role === 'medecin' ? "Retour a l'agenda" : 'Retour a mes rendez-vous';

  return (
    <RequireRole allowedRoles={['patient', 'medecin']}>
      <TeleconsultRoom
        appointmentId={appointmentId}
        role={role}
        backHref={backHref}
        backLabel={backLabel}
        exitHref={backHref}
      />
    </RequireRole>
  );
}
