'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  ArrowRight,
  Baby,
  Bone,
  Brain,
  Calendar,
  CalendarCheck,
  CheckCircle,
  Clock3,
  Eye,
  Heart,
  LineChart,
  Search,
  ShieldCheck,
  Stethoscope,
  Users,
  Video,
} from 'lucide-react';

import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { apiClient } from '@/lib/api/client';
import { Doctor } from '@/types/doctor';

type PublicHomeResponse = {
  stats: {
    active_doctors: number;
    active_patients: number;
    appointments_total: number;
    video_appointments: number;
    specialties_total: number;
  };
  specialties: Array<{ name: string; count: number }>;
  featured_doctors: Doctor[];
  featured_slots: Array<{
    doctor_id: string;
    doctor_name: string;
    specialty: string | null;
    slot_start: string;
    photo_url: string | null;
  }>;
};

const steps = [
  {
    icon: Search,
    number: '01',
    title: 'Rechercher',
    description: 'Filtrez les praticiens par specialite, disponibilite et localisation.',
  },
  {
    icon: CalendarCheck,
    number: '02',
    title: 'Reserver',
    description: 'Choisissez un creneau disponible et confirmez votre rendez-vous.',
  },
  {
    icon: Video,
    number: '03',
    title: 'Consulter',
    description: 'Consultez en cabinet ou en teleconsultation selon le besoin medical.',
  },
];

const statConfigs = [
  { key: 'active_doctors', label: 'Medecins partenaires', icon: Users },
  { key: 'active_patients', label: 'Patients actifs', icon: CheckCircle },
  { key: 'appointments_total', label: 'Rendez-vous suivis', icon: Calendar },
  { key: 'video_appointments', label: 'Teleconsultations', icon: Video },
] as const;

function getSpecialtyIcon(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes('cardio')) return Heart;
  if (lower.includes('pedi')) return Baby;
  if (lower.includes('neuro')) return Brain;
  if (lower.includes('opht')) return Eye;
  if (lower.includes('ortho')) return Bone;
  return Stethoscope;
}

function formatSlot(isoString: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoString));
}

function HomeSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <Card key={index} className="h-40 animate-pulse border border-slate-200 bg-white" hoverable={false} />
      ))}
    </div>
  );
}

export default function HomePage() {
  const { data, isLoading } = useQuery<PublicHomeResponse>({
    queryKey: ['public-home'],
    queryFn: () => apiClient.get('/api/v1/public/home'),
    staleTime: 60 * 1000,
  });

  const stats = statConfigs.map((item) => ({
    ...item,
    value: data?.stats?.[item.key] ?? 0,
  }));
  const featuredSlots = data?.featured_slots ?? [];
  const maxSpecialty = Math.max(...(data?.specialties ?? []).map((item) => item.count), 1);

  return (
    <>
      <section className="bg-linear-to-b/oklch from-teal-200 via-transparent to-white">
        <div className="mx-auto max-w-[85rem] space-y-8 px-4 pt-44 pb-12 sm:px-6 lg:px-8">
          <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-teal-700/15 bg-white/85 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-md">
            <Activity className="h-4 w-4 text-accent" />
            Plateforme medicale connectee en temps reel
          </div>

          <div className="mx-auto max-w-4xl text-left sm:text-center">
            <h1 className="block text-4xl text-slate-800 sm:text-5xl md:text-6xl lg:text-7xl">
              Votre hub data pour trouver, reserver et suivre les rendez-vous medicaux.
            </h1>
          </div>

          <div className="mx-auto max-w-3xl text-left sm:text-center">
            <p className="text-lg leading-8 text-slate-700">
              MediRDV transforme les disponibilites des praticiens, les creneaux et les consultations en parcours clair,
              rapide et mesurable pour les patients comme pour les equipes medicales.
            </p>
          </div>

          <div className="flex flex-col justify-center gap-5 sm:flex-row">
            <Link href="/recherche">
              <Button size="lg" className="w-full sm:w-auto">
                Rechercher un medecin
              </Button>
            </Link>
            <Link href="/inscription">
              <Button variant="secondary" size="lg" className="w-full border-slate-900! text-slate-900! hover:bg-slate-900! sm:w-auto">
                Creer un compte
              </Button>
            </Link>
          </div>

          <div className="relative m-auto w-full pt-14 sm:w-[92%]">
            <div className="pointer-events-none absolute inset-x-0 -bottom-2 z-10 hidden h-20 w-full bg-linear-to-b/oklch from-transparent via-white to-white sm:block" />

            <div className="absolute -left-4 top-24 z-20 hidden w-64 rounded-xl border border-slate-200 bg-white p-4 shadow-card lg:block">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">Specialites</p>
                  <p className="text-2xl font-bold text-slate-900">{data?.stats.specialties_total ?? 0}</p>
                </div>
                <LineChart className="h-8 w-8 text-accent" />
              </div>
              <div className="space-y-3">
                {(data?.specialties ?? []).slice(0, 4).map((specialty) => (
                  <div key={specialty.name}>
                    <div className="mb-1 flex justify-between text-xs text-slate-600">
                      <span className="truncate">{specialty.name}</span>
                      <span>{specialty.count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(12, (specialty.count / maxSpecialty) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_24px_90px_rgba(15,23,42,0.12)]">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">MediRDV Intelligence</p>
                  <p className="text-xs text-slate-500">Activite medicale live</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span className="text-xs font-semibold text-slate-600">En ligne</span>
                </div>
              </div>

              <div className="grid min-h-[460px] gap-0 lg:grid-cols-[1fr_360px]">
                <div className="p-5 lg:p-8">
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {stats.map((stat) => {
                      const IconComponent = stat.icon;
                      return (
                        <div key={stat.label} className="rounded-xl border border-slate-200 bg-white p-4">
                          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-accent">
                            <IconComponent className="h-5 w-5" />
                          </div>
                          <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
                          <p className="mt-1 text-xs font-medium text-slate-500">{stat.label}</p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
                    <div className="mb-5 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-slate-900">Evolution des rendez-vous</p>
                        <p className="text-xs text-slate-500">Projection visuelle basee sur les donnees live</p>
                      </div>
                      <Badge className="bg-white!">30 jours</Badge>
                    </div>
                    <div className="flex h-52 items-end gap-3">
                      {[42, 58, 46, 72, 64, 86, 78, 92, 68, 84, 96, 74].map((height, index) => (
                        <div key={index} className="flex flex-1 flex-col justify-end gap-2">
                          <div className="rounded-t-lg bg-accent/80" style={{ height: `${height}%` }} />
                          <span className="text-center text-[10px] font-medium text-slate-400">{index + 1}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-200 bg-white p-5 lg:border-l lg:border-t-0">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-900">Creneaux a saisir</p>
                      <p className="text-xs text-slate-500">Disponibilites proches</p>
                    </div>
                    <Clock3 className="h-5 w-5 text-accent" />
                  </div>
                  <div className="space-y-3">
                    {featuredSlots.length ? (
                      featuredSlots.slice(0, 4).map((slot) => (
                        <Link
                          key={`${slot.doctor_id}-${slot.slot_start}`}
                          href={`/medecins/${slot.doctor_id}/reserver`}
                          className="block rounded-xl border border-slate-200 p-4 transition-colors hover:border-accent hover:bg-teal-50"
                        >
                          <p className="truncate text-sm font-bold text-slate-900">{slot.doctor_name}</p>
                          <p className="mt-1 text-xs text-slate-500">{slot.specialty || 'Consultation'}</p>
                          <p className="mt-3 text-xs font-semibold text-accent">{formatSlot(slot.slot_start)}</p>
                        </Link>
                      ))
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                        Aucun creneau mis en avant pour le moment.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[85rem] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <Badge className="mb-4">Workflow patient</Badge>
            <h2 className="text-3xl font-semibold text-slate-900 md:text-5xl">Un parcours clair, inspire des meilleurs dashboards data.</h2>
          </div>
          <Link href="/recherche">
            <Button variant="ghost" className="text-accent!">
              Explorer <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((step) => {
            const IconComponent = step.icon;
            return (
              <Card key={step.number} hoverable className="border border-slate-200 bg-white p-6">
                <div className="mb-8 flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-teal-50 text-accent">
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-bold text-slate-300">{step.number}</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{step.description}</p>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-[85rem] px-4 sm:px-6 lg:px-8">
          <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <Badge className="mb-4 bg-white!">Specialites actives</Badge>
              <h2 className="text-3xl font-semibold text-slate-900 md:text-5xl">Les besoins medicaux visibles en un coup d oeil.</h2>
            </div>
          </div>

          {isLoading ? (
            <HomeSkeleton />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {(data?.specialties ?? []).map((specialty) => {
                const IconComponent = getSpecialtyIcon(specialty.name);
                return (
                  <Link
                    key={specialty.name}
                    href={`/recherche?specialty=${encodeURIComponent(specialty.name)}`}
                    className="rounded-xl border border-slate-200 bg-white p-5 shadow-card transition-colors hover:border-accent hover:bg-teal-50"
                  >
                    <div className="mb-8 flex items-start justify-between">
                      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-teal-50 text-accent">
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <span className="rounded-lg bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700">{specialty.count}</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">{specialty.name}</h3>
                    <p className="mt-3 text-sm text-slate-600">Medecins actifs disponibles dans cette specialite.</p>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-[85rem] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <Badge className="mb-4">Praticiens</Badge>
            <h2 className="text-3xl font-semibold text-slate-900 md:text-5xl">Les medecins mis en avant.</h2>
          </div>
          <Link href="/recherche">
            <Button variant="ghost" className="text-accent!">
              Voir tous les medecins <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <HomeSkeleton />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {(data?.featured_doctors ?? []).map((doctor) => (
              <Card key={doctor.id} padding="sm" className="overflow-hidden border border-slate-200 bg-white">
                <div className="relative mb-4 aspect-[4/3] overflow-hidden rounded-xl bg-slate-100">
                  <Avatar
                    src={doctor.photo_url}
                    alt={`${doctor.first_name} ${doctor.last_name}`}
                    size="lg"
                    className="absolute inset-0 h-full w-full rounded-xl"
                  />
                </div>
                <p className="text-sm font-semibold text-accent">{doctor.specialty || 'Specialite'}</p>
                <h3 className="mt-1 text-lg font-bold text-slate-900">
                  Dr. {doctor.first_name} {doctor.last_name}
                </h3>
                <p className="mt-2 text-sm text-slate-600">{doctor.cabinet_name || 'Cabinet medical'}</p>
                <Link href={`/medecins/${doctor.user_id}`} className="mt-4 block">
                  <Button fullWidth size="sm">
                    Prendre rendez-vous
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
