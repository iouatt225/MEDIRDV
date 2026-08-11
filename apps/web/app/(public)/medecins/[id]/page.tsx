'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';

import DoctorPublicProfileView from '@/components/doctors/DoctorPublicProfileView';
import { apiClient } from '@/lib/api/client';
import { Doctor } from '@/types/doctor';

export default function DoctorProfilePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const { data: doctor, isLoading, isError } = useQuery<Doctor>({
    queryKey: ['doctor', id],
    queryFn: () => apiClient.get(`/api/v1/doctors/${id}`),
    enabled: Boolean(id),
    staleTime: 60 * 1000,
  });

  if (!id || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary">
        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isError || !doctor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary px-4">
        <div className="max-w-md text-center p-8 bg-white border border-divider rounded-pluxes shadow-card">
          <h2 className="text-2xl font-bold text-primary mb-4">Médecin introuvable</h2>
          <p className="text-text mb-6">Le profil de ce médecin est temporairement indisponible ou inexistant.</p>
          <a href="/recherche" className="inline-flex">
            <button className="rounded-pluxes-btn bg-accent px-5 py-3 font-semibold text-white">
              Retour à la recherche
            </button>
          </a>
        </div>
      </div>
    );
  }

  return (
    <DoctorPublicProfileView
      doctor={doctor}
      backHref="/recherche"
      backLabel="Retour aux résultats"
      primaryAction={{ href: `/medecins/${doctor.user_id}/reserver`, label: 'Prendre rendez-vous' }}
      bannerLabel="Fiche médecin"
      bannerDescription="Profil public et informations de consultation."
      showAvailability
    />
  );
}
