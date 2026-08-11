'use client';

import Link from 'next/link';
import { ArrowLeft, CalendarCheck2, Clock, Languages, Landmark, Mail, MapPin, Phone, Stethoscope } from 'lucide-react';

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
  bannerLabel = 'Fiche medecin',
  bannerDescription = 'Profil public et informations de consultation.',
  showBannerMeta = true,
  showAvailability = true,
}: DoctorPublicProfileViewProps) {
  const languages = doctor.languages?.length ? doctor.languages : ['Non renseigne'];
  const availabilityCount = doctor.upcoming_availabilities?.length ?? 0;

  return (
    <div className="min-h-screen bg-linear-to-b/oklch from-teal-100 via-white to-white pt-32 pb-20">
      <div className="mx-auto max-w-[85rem] px-4 sm:px-6 lg:px-8">
        <Link href={backHref} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-700 transition-colors hover:text-accent">
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <Avatar
                  src={doctor.photo_url}
                  alt={`${doctor.first_name} ${doctor.last_name}`}
                  size="lg"
                  className="h-28 w-28 rounded-xl border border-slate-200 bg-white shadow-sm"
                />
                <div>
                  <Badge variant="info" dot={false} className="mb-3">
                    {doctor.specialty}
                  </Badge>
                  {showBannerMeta ? (
                    <div className="mb-3">
                      <p className="text-xs font-bold uppercase text-accent">{bannerLabel}</p>
                      <p className="mt-1 text-xs text-slate-500">{bannerDescription}</p>
                    </div>
                  ) : null}
                  <h1 className="text-3xl font-bold text-slate-900 md:text-4xl">
                    Dr. {doctor.first_name} {doctor.last_name}
                  </h1>
                  <p className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                    <MapPin className="h-4 w-4 flex-shrink-0 text-accent" />
                    {doctor.cabinet_name} - {doctor.address}
                  </p>
                </div>
              </div>

              <div className="w-full rounded-xl border border-slate-200 bg-white p-5 lg:w-80">
                <p className="text-sm text-slate-500">Tarif consultation</p>
                <p className="mt-1 text-3xl font-bold text-accent">
                  {doctor.fee ? Number.parseFloat(doctor.fee).toLocaleString('fr-FR') : 'Sur demande'} FCFA
                </p>
                {primaryAction ? (
                  <Link href={primaryAction.href} className="mt-4 block">
                    <Button fullWidth size="lg">
                      {primaryAction.label}
                    </Button>
                  </Link>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid gap-0 lg:grid-cols-[1fr_360px]">
            <main className="space-y-5 p-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <Metric icon={CalendarCheck2} label="Disponibilites" value={availabilityCount.toString()} />
                <Metric icon={Clock} label="Annulation" value={`${doctor.cancellation_delay_hours}h`} />
                <Metric icon={Stethoscope} label="Mode" value="Cabinet / video" />
              </div>

              <Card hoverable={false} className="border border-slate-200 bg-white p-5 shadow-none">
                <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-slate-900">
                  <Stethoscope className="h-5 w-5 text-accent" />
                  Presentation
                </h2>
                {doctor.bio ? (
                  <p className="whitespace-pre-line text-sm leading-7 text-slate-700">{doctor.bio}</p>
                ) : (
                  <p className="text-sm italic text-slate-500">Aucune biographie fournie.</p>
                )}
              </Card>

              <Card hoverable={false} className="border border-slate-200 bg-white p-5 shadow-none">
                <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-slate-900">
                  <CalendarCheck2 className="h-5 w-5 text-accent" />
                  Contact et acces
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoBox icon={Phone} label="Telephone" value={doctor.phone || 'Non renseigne'} />
                  <InfoBox icon={Mail} label="E-mail" value={doctor.email || 'Non renseigne'} />
                </div>
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase text-slate-500">Fenetre video</p>
                  <p className="mt-2 text-sm text-slate-700">
                    Annulation max {doctor.cancellation_delay_hours}h avant la consultation. {availabilityCount} creneaux publics detectes.
                  </p>
                </div>
              </Card>
            </main>

            <aside className="space-y-5 border-t border-slate-200 bg-slate-50 p-6 lg:border-l lg:border-t-0">
              <Card hoverable={false} className="border border-slate-200 bg-white p-5 shadow-none">
                <h3 className="mb-4 flex items-center gap-2 border-b border-slate-200 pb-3 text-lg font-bold text-slate-900">
                  <Languages className="h-5 w-5 text-accent" />
                  Langues parlees
                </h3>
                <div className="flex flex-wrap gap-2">
                  {languages.map((language) => (
                    <Badge key={language} variant="default" dot={false} className="px-3! py-1.5! text-xs!">
                      {language}
                    </Badge>
                  ))}
                </div>
              </Card>

              <Card hoverable={false} className="border border-slate-200 bg-white p-5 shadow-none">
                <h3 className="mb-4 flex items-center gap-2 border-b border-slate-200 pb-3 text-lg font-bold text-slate-900">
                  <Landmark className="h-5 w-5 text-accent" />
                  Cabinet
                </h3>
                <p className="text-sm leading-6 text-slate-700">
                  <strong className="text-slate-900">{doctor.cabinet_name || 'Cabinet medical'}</strong>
                  <br />
                  {doctor.address || 'Adresse non renseignee'}
                </p>
                {doctor.latitude && doctor.longitude ? (
                  <div className="mt-4 rounded-lg bg-slate-50 p-3 text-center text-xs text-slate-500">
                    GPS: {doctor.latitude.toFixed(4)}, {doctor.longitude.toFixed(4)}
                  </div>
                ) : null}
              </Card>

              {showAvailability && availabilityCount ? (
                <Card hoverable={false} className="border border-slate-200 bg-white p-5 shadow-none">
                  <h3 className="mb-4 flex items-center gap-2 border-b border-slate-200 pb-3 text-lg font-bold text-slate-900">
                    <CalendarCheck2 className="h-5 w-5 text-accent" />
                    Creneaux disponibles
                  </h3>
                  <div className="space-y-2">
                    {doctor.upcoming_availabilities?.slice(0, 4).map((slot) => (
                      <div key={slot} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
                        {formatAvailability(slot)}
                      </div>
                    ))}
                  </div>
                </Card>
              ) : null}
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof CalendarCheck2; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-accent">
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-xs font-medium text-slate-500">{label}</p>
    </div>
  );
}

function InfoBox({ icon: Icon, label, value }: { icon: typeof Phone; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-2 flex items-center gap-2 break-all text-sm font-semibold text-slate-900">
        <Icon className="h-4 w-4 flex-shrink-0 text-accent" />
        {value}
      </p>
    </div>
  );
}
