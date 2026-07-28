'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { MapPin, Stethoscope, Languages, Landmark, Clock, ArrowLeft } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { Doctor } from '@/types/doctor';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';

export default function DoctorProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  // Fetch doctor data
  const { data: doctor, isLoading, isError } = useQuery<Doctor>({
    queryKey: ['doctor', id],
    queryFn: () => apiClient.get(`/api/v1/doctors/${id}`),
    staleTime: 60 * 1000, // 1 minute staleTime is fine for info
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary">
        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isError || !doctor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary px-4">
        <Card hoverable={false} className="max-w-md text-center p-8 bg-white border border-divider">
          <h2 className="text-2xl font-bold text-primary mb-4">Médecin introuvable</h2>
          <p className="text-text mb-6">Le profil de ce médecin est temporairement indisponible ou inexistant.</p>
          <Link href="/recherche">
            <Button>Retour à la recherche</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="pt-28 pb-16 min-h-screen bg-secondary">
      <div className="max-w-[1000px] mx-auto px-4">
        {/* Back Link */}
        <Link
          href="/recherche"
          className="inline-flex items-center gap-2 text-primary hover:text-accent font-semibold mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour aux résultats
        </Link>

        {/* Doctor Main Header Card */}
        <Card hoverable={false} className="mb-6 p-8 bg-white border border-divider">
          <div className="flex flex-col md:flex-row gap-6 items-start justify-between">
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <Avatar
                src={doctor.photo_url}
                alt={`${doctor.first_name} ${doctor.last_name}`}
                size="lg"
                className="w-24 h-24 sm:w-32 sm:h-32 border border-divider"
              />
              <div>
                <Badge variant="info" dot={false} className="mb-2">
                  {doctor.specialty}
                </Badge>
                <h1 className="text-3xl font-bold text-primary mb-2">
                  Dr. {doctor.first_name} {doctor.last_name}
                </h1>
                <p className="text-text/80 flex items-center gap-1.5 mb-3 text-base">
                  <MapPin className="w-5 h-5 text-accent flex-shrink-0" />
                  {doctor.cabinet_name} — {doctor.address}
                </p>
                <div className="flex flex-wrap gap-4 text-sm text-text font-medium">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4 text-accent" />
                    Annulation : max {doctor.cancellation_delay_hours}h à l&apos;avance
                  </span>
                </div>
              </div>
            </div>

            <div className="w-full md:w-auto text-left md:text-right border-t md:border-t-0 border-divider pt-4 md:pt-0">
              <p className="text-sm text-text">Tarif consultation</p>
              <p className="text-3xl font-bold text-accent mb-4">
                {parseFloat(doctor.fee).toLocaleString()} FCFA
              </p>
              <Link href={`/medecins/${doctor.user_id}/reserver`}>
                <Button fullWidth size="lg">
                  Prendre rendez-vous
                </Button>
              </Link>
            </div>
          </div>
        </Card>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            {/* Bio Card */}
            <Card hoverable={false} className="p-6 bg-white border border-divider">
              <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-accent" />
                Présentation
              </h2>
              {doctor.bio ? (
                <p className="text-text leading-relaxed whitespace-pre-line">{doctor.bio}</p>
              ) : (
                <p className="text-text/50 italic">Aucune biographie fournie.</p>
              )}
            </Card>
          </div>

          <div className="space-y-6">
            {/* Info Card */}
            <Card hoverable={false} className="p-6 bg-white border border-divider">
              <h3 className="font-bold text-primary text-lg mb-4 flex items-center gap-2 border-b border-divider pb-3">
                <Languages className="w-5 h-5 text-accent" />
                Langues parlées
              </h3>
              <div className="flex flex-wrap gap-2">
                {doctor.languages.map((lang) => (
                  <Badge key={lang} variant="default" dot={false} className="text-xs! px-3! py-1.5!">
                    {lang}
                  </Badge>
                ))}
              </div>
            </Card>

            {/* Cabinet Location details */}
            <Card hoverable={false} className="p-6 bg-white border border-divider">
              <h3 className="font-bold text-primary text-lg mb-4 flex items-center gap-2 border-b border-divider pb-3">
                <Landmark className="w-5 h-5 text-accent" />
                Le cabinet
              </h3>
              <p className="text-sm text-text leading-relaxed mb-4">
                Le cabinet est situé à l&apos;adresse suivante :
                <br />
                <strong className="text-primary">{doctor.address}</strong>
              </p>
              {doctor.latitude && doctor.longitude && (
                <div className="mt-4 p-3 rounded-pluxes-sm bg-secondary border border-divider text-xs text-text text-center">
                  Coordonnées GPS : {doctor.latitude.toFixed(4)}, {doctor.longitude.toFixed(4)}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
