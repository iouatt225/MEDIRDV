'use client';

import Link from 'next/link';
import {
  ArrowLeft,
  CalendarCheck2,
  Clock,
  Languages,
  Landmark,
  Mail,
  MapPin,
  Phone,
  Stethoscope,
} from 'lucide-react';

import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { Doctor } from '@/types/doctor';

interface DoctorPublicProfileViewProps {
  doctor: Doctor;
  backHref: string;
  backLabel: string;
  primaryAction?: {
    href: string;
    label: string;
  };
  bannerLabel?: string;
  bannerDescription?: string;
  showBannerMeta?: boolean;
  showAvailability?: boolean;
}

function formatAvailability(slot: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(slot));
}

export default function DoctorPublicProfileView({
  doctor,
  backHref,
  backLabel,
  primaryAction,
  bannerLabel = 'Fiche médecin',
  bannerDescription = 'Profil public et informations de consultation.',
  showBannerMeta = true,
  showAvailability = true,
}: DoctorPublicProfileViewProps) {
  const languages = doctor.languages?.length ? doctor.languages : ['Non renseigné'];

  return (
    <div className="pt-28 pb-16 min-h-screen bg-secondary">
      <div className="max-w-[1000px] mx-auto px-4">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-primary hover:text-accent font-semibold mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {backLabel}
        </Link>

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
                {showBannerMeta ? (
                  <>
                    <div className="inline-flex items-center gap-2 rounded-full border border-accent/15 bg-accent/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.25em] text-accent">
                      {bannerLabel}
                    </div>
                    <p className="text-xs font-medium uppercase tracking-[0.25em] text-text/45">
                      {bannerDescription}
                    </p>
                  </>
                ) : null}
                <h1 className="mt-3 text-3xl font-bold text-primary mb-2">
                  Dr. {doctor.first_name} {doctor.last_name}
                </h1>
                <p className="text-text/80 flex items-center gap-1.5 mb-3 text-base">
                  <MapPin className="w-5 h-5 text-accent flex-shrink-0" />
                  {doctor.cabinet_name} - {doctor.address}
                </p>
                <div className="flex flex-wrap gap-4 text-sm text-text font-medium">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4 text-accent" />
                    Annulation : max {doctor.cancellation_delay_hours}h à l'avance
                  </span>
                </div>
              </div>
            </div>

            <div className="w-full md:w-auto text-left md:text-right border-t md:border-t-0 border-divider pt-4 md:pt-0">
              <p className="text-sm text-text">Tarif consultation</p>
              <p className="text-3xl font-bold text-accent mb-4">
                {doctor.fee ? Number.parseFloat(doctor.fee).toLocaleString('fr-FR') : 'Sur demande'} FCFA
              </p>
              {primaryAction ? (
                <Link href={primaryAction.href}>
                  <Button fullWidth size="lg">
                    {primaryAction.label}
                  </Button>
                </Link>
              ) : null}
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
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

            <Card hoverable={false} className="p-6 bg-white border border-divider">
              <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                <CalendarCheck2 className="w-5 h-5 text-accent" />
                Disponibilités et contact
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-pluxes-sm border border-divider bg-secondary/40 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-text/50">Téléphone</p>
                  <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-primary">
                    <Phone className="h-4 w-4 text-accent" />
                    {doctor.phone || 'Non renseigné'}
                  </p>
                </div>
                <div className="rounded-pluxes-sm border border-divider bg-secondary/40 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-text/50">E-mail</p>
                  <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-primary break-all">
                    <Mail className="h-4 w-4 text-accent" />
                    {doctor.email || 'Non renseigné'}
                  </p>
                </div>
              </div>
              <div className="mt-4 rounded-pluxes-sm border border-divider bg-white p-4">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-text/50">Fenêtre d'accès vidéo</p>
                <p className="mt-2 text-sm text-text">
                  Annulation: max {doctor.cancellation_delay_hours}h à l'avance
                </p>
                <p className="mt-2 text-sm text-text">
                  Prochaines disponibilités:{' '}
                  {doctor.upcoming_availabilities?.length
                    ? `${doctor.upcoming_availabilities.length} créneaux détectés`
                    : 'Aucune disponibilité publique détectée'}
                </p>
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card hoverable={false} className="p-6 bg-white border border-divider">
              <h3 className="font-bold text-primary text-lg mb-4 flex items-center gap-2 border-b border-divider pb-3">
                <Languages className="w-5 h-5 text-accent" />
                Langues parlées
              </h3>
              <div className="flex flex-wrap gap-2">
                {languages.map((lang) => (
                  <Badge key={lang} variant="default" dot={false} className="text-xs! px-3! py-1.5!">
                    {lang}
                  </Badge>
                ))}
              </div>
            </Card>

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

            {showAvailability && doctor.upcoming_availabilities?.length ? (
              <Card hoverable={false} className="p-6 bg-white border border-divider">
                <h3 className="font-bold text-primary text-lg mb-4 flex items-center gap-2 border-b border-divider pb-3">
                  <CalendarCheck2 className="w-5 h-5 text-accent" />
                  Créneaux disponibles
                </h3>
                <div className="space-y-2">
                  {doctor.upcoming_availabilities.slice(0, 3).map((slot) => (
                    <div key={slot} className="rounded-2xl bg-secondary/60 px-3 py-2 text-sm text-primary">
                      {formatAvailability(slot)}
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
