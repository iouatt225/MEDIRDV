'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';

import DoctorPublicProfileView from '@/components/doctors/DoctorPublicProfileView';
import RequireRole from '@/components/auth/RequireRole';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { apiClient } from '@/lib/api/client';
import { Doctor } from '@/types/doctor';

interface DoctorMeResponse {
  id: string;
}

export default function PraticienProfilPublicPage() {
  const { data: me, isLoading: isMeLoading } = useQuery<DoctorMeResponse>({
    queryKey: ['me-profile-public'],
    queryFn: () => apiClient.get('/api/v1/users/me'),
  });

  const { data: doctor, isLoading: isDoctorLoading, isError } = useQuery<Doctor>({
    queryKey: ['public-doctor-preview', me?.id],
    queryFn: () => apiClient.get(`/api/v1/doctors/${me?.id}`),
    enabled: Boolean(me?.id),
    staleTime: 60 * 1000,
  });

  return (
    <RequireRole allowedRoles={['medecin']}>
      {isMeLoading || isDoctorLoading ? (
        <div className="min-h-screen flex items-center justify-center bg-secondary">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-accent border-t-transparent" />
        </div>
      ) : isError || !doctor ? (
        <div className="flex min-h-screen items-center justify-center bg-secondary px-4">
          <Card hoverable={false} className="max-w-md text-center p-8 bg-white border border-divider">
            <h2 className="text-2xl font-bold text-primary mb-4">Aperçu indisponible</h2>
            <p className="text-text mb-6">Nous n’avons pas pu charger la fiche publique de votre profil médecin.</p>
            <Link href="/praticien/profil">
              <Button>Retour au profil</Button>
            </Link>
          </Card>
        </div>
      ) : (
        <DoctorPublicProfileView
          doctor={doctor}
          backHref="/praticien/profil"
          backLabel="Retour au profil"
          showBannerMeta={false}
          showAvailability
        />
      )}
    </RequireRole>
  );
}
