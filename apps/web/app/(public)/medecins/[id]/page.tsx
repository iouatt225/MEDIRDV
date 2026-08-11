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
      <div className="flex min-h-screen items-center justify-center bg-secondary">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  if (isError || !doctor) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-linear-to-b/oklch from-teal-100 via-white to-white px-4">
        <div className="max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-card">
          <h2 className="mb-4 text-2xl font-bold text-slate-900">Medecin introuvable</h2>
          <p className="mb-6 text-slate-600">Le profil de ce medecin est temporairement indisponible ou inexistant.</p>
          <a href="/recherche" className="inline-flex rounded-lg bg-accent px-5 py-3 font-semibold text-white hover:bg-accent-dark">
            Retour a la recherche
          </a>
        </div>
      </div>
    );
  }

  return (
    <DoctorPublicProfileView
      doctor={doctor}
      backHref="/recherche"
      backLabel="Retour aux resultats"
      primaryAction={{ href: `/medecins/${doctor.user_id}/reserver`, label: 'Prendre rendez-vous' }}
      bannerLabel="Fiche medecin"
      bannerDescription="Profil public et informations de consultation."
      showAvailability
    />
  );
}
