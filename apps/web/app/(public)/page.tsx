'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Baby,
  Brain,
  Calendar,
  CalendarCheck,
  CheckCircle,
  Eye,
  Heart,
  Clock3,
  Search,
  ShieldCheck,
  Stethoscope,
  Users,
  Video,
  Bone,
  Sparkles,
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
    title: 'Recherchez',
    description: 'Trouvez le spécialiste qu’il vous faut par spécialité, localisation ou nom.',
  },
  {
    icon: CalendarCheck,
    number: '02',
    title: 'Réservez',
    description: 'Choisissez le créneau qui vous convient et confirmez votre rendez-vous en un clic.',
  },
  {
    icon: Video,
    number: '03',
    title: 'Consultez',
    description: 'Rendez-vous en cabinet ou par téléconsultation vidéo, selon votre préférence.',
  },
];

const statConfigs = [
  { key: 'active_doctors', label: 'Médecins partenaires', icon: Users },
  { key: 'active_patients', label: 'Patients actifs', icon: CheckCircle },
  { key: 'appointments_total', label: 'Rendez-vous enregistrés', icon: Calendar },
  { key: 'video_appointments', label: 'Téléconsultations', icon: Video },
] as const;

function getSpecialtyIcon(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes('cardio')) return Heart;
  if (lower.includes('pédi') || lower.includes('pedi')) return Baby;
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
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="h-28 animate-pulse bg-white/80" hoverable={false} />
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="h-40 animate-pulse bg-white/80" hoverable={false} />
        ))}
      </div>
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

  return (
    <>
      <section
        className="relative overflow-hidden rounded-b-pluxes bg-secondary bg-cover bg-center bg-no-repeat pt-24 pb-20 lg:pt-0 lg:pb-0"
        style={{ backgroundImage: "url('/images/hero-bg-image.jpg')" }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,168,188,0.12),transparent_22%),linear-gradient(180deg,rgba(248,252,253,0.88),rgba(238,249,252,0.92))]" />
        <div className="absolute inset-0 bg-white/8 backdrop-blur-[1px]" />
        <div className="absolute inset-x-0 top-0 h-px bg-white/50" />
        <div className="relative z-10 mx-auto grid w-full max-w-[1300px] gap-10 px-4 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:px-[15px] lg:py-20">
          <div className="max-w-3xl rounded-[36px] border border-divider bg-white/88 p-8 shadow-[0_30px_120px_rgba(8,54,59,0.08)] backdrop-blur-xl lg:p-10">
            <Badge variant="default" className="mb-6 bg-accent/10 text-accent backdrop-blur-[30px]">
              Votre santé, entre de bonnes mains
            </Badge>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-accent/15 bg-accent/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.3em] text-accent backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              Accueil live, médecins réels, créneaux disponibles
            </div>
            <h1 className="mb-6 text-4xl font-semibold leading-[1.08em] tracking-[-0.03em] text-primary md:text-5xl lg:text-[72px]">
              La prise de rendez-vous médicale, plus rapide, plus élégante, plus simple.
            </h1>
            <p className="mb-10 max-w-xl text-lg leading-relaxed text-text/80">
              MediRDV vous connecte avec des médecins de confiance, des spécialités actives et des créneaux en temps réel. Cabinet ou téléconsultation, tout est pensé pour aller vite.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/recherche">
                <Button size="lg">Trouver un médecin</Button>
              </Link>
              <Link href="/inscription">
                <Button variant="secondary" size="lg" className="border-divider! text-primary! hover:bg-secondary! hover:text-primary!">
                  S&apos;inscrire gratuitement
                </Button>
              </Link>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {[
                { label: 'Médecins actifs', value: stats[0]?.value ?? 0 },
                { label: 'Spécialités', value: data?.stats.specialties_total ?? 0 },
                { label: 'Téléconsultations', value: stats[3]?.value ?? 0 },
              ].map((item) => (
                <div key={item.label} className="rounded-3xl border border-divider bg-white/70 p-4 backdrop-blur-md">
                  <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-text/50">{item.label}</p>
                  <p className="mt-2 text-2xl font-bold text-primary">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 self-end lg:justify-self-end">
            <Card hoverable={false} className="border border-divider bg-white/90 p-5 text-primary shadow-[0_24px_80px_rgba(8,54,59,0.08)] backdrop-blur-xl">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.3em] text-text/50">Vue live</p>
                  <h2 className="mt-2 text-2xl font-bold text-primary">Recherche en temps réel</h2>
                </div>
                <ShieldCheck className="h-10 w-10 text-accent" />
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {[
                  { label: 'Médecins disponibles', value: data?.stats.active_doctors ?? 0 },
                  { label: 'Patients actifs', value: data?.stats.active_patients ?? 0 },
                  { label: 'RDV enregistrés', value: data?.stats.appointments_total ?? 0 },
                  { label: 'Spécialités actives', value: data?.stats.specialties_total ?? 0 },
                ].map((item) => (
                  <div key={item.label} className="rounded-3xl border border-divider bg-secondary/50 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-text/50">{item.label}</p>
                    <p className="mt-2 text-2xl font-bold text-primary">{item.value}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card hoverable={false} className="border border-divider bg-white/95 p-5 shadow-[0_24px_80px_rgba(8,54,59,0.08)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.3em] text-text/50">Prochaines dispo</p>
                  <h2 className="mt-2 text-2xl font-bold text-primary">Créneaux mis en avant</h2>
                </div>
                <Clock3 className="h-10 w-10 text-accent" />
              </div>
              <div className="mt-5 space-y-3">
                {featuredSlots.length ? (
                  featuredSlots.slice(0, 3).map((slot) => (
                    <Link
                      key={`${slot.doctor_id}-${slot.slot_start}`}
                      href={`/medecins/${slot.doctor_id}/reserver`}
                      className="flex items-center gap-4 rounded-3xl border border-divider bg-secondary/40 p-4 transition hover:-translate-y-0.5 hover:border-accent/40 hover:bg-accent/10"
                    >
                      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white">
                        <span className="px-2 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-accent">
                          {slot.specialty || 'Consultation'}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-primary">{slot.doctor_name}</p>
                        <p className="mt-1 text-xs text-text/65">{formatSlot(slot.slot_start)}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 flex-shrink-0 text-accent" />
                    </Link>
                  ))
                ) : (
                  <div className="rounded-3xl bg-secondary/50 p-4 text-sm text-text/65">
                    Aucun créneau mis en avant pour le moment.
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1300px] px-4 py-20 lg:px-[15px] lg:py-[120px]">
        <div className="mb-16 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-xl">
            <Badge className="mb-4">Nos spécialités</Badge>
            <h2 className="text-3xl font-semibold tracking-[-0.01em] leading-[1.2em] md:text-[48px]">
              Des experts pour chaque besoin médical
            </h2>
          </div>
          <Link href="/recherche">
            <Button variant="ghost" className="text-accent!">
              Voir tous les médecins →
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <HomeSkeleton />
        ) : (
          <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
            {(data?.specialties ?? []).map((specialty) => {
              const IconComponent = getSpecialtyIcon(specialty.name);
              return (
                <Card key={specialty.name} className="flex min-h-[270px] flex-col justify-between gap-6" hoverable>
                  <div className="flex h-[60px] w-[60px] items-center justify-center rounded-full bg-accent transition-colors duration-400 group-hover:bg-primary">
                    <IconComponent className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h3 className="mb-2 text-xl font-bold text-primary">{specialty.name}</h3>
                    <p className="leading-relaxed text-text">{specialty.count} médecins actifs dans cette spécialité</p>
                  </div>
                  <div className="border-t border-divider pt-5">
                    <Link
                      href={`/recherche?specialty=${encodeURIComponent(specialty.name)}`}
                      className="inline-flex items-center gap-2 font-bold text-primary transition-colors duration-300 hover:text-accent"
                    >
                      Voir les médecins
                      <span className="text-accent">→</span>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-[1820px] rounded-pluxes bg-secondary py-20 lg:py-[120px]">
        <div className="mx-auto max-w-[1300px] px-4 lg:px-[15px]">
          <div className="mx-auto mb-16 max-w-[700px] text-center">
            <Badge className="mb-4 bg-white!">Comment ça marche</Badge>
            <h2 className="text-3xl font-semibold tracking-[-0.01em] leading-[1.2em] md:text-[48px]">
              Votre rendez-vous en 3 étapes simples
            </h2>
            <p className="mt-5 leading-relaxed text-text">
              Plus besoin de faire la queue ou de passer des heures au téléphone. Réservez votre consultation en quelques clics.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {steps.map((step) => {
              const IconComponent = step.icon;
              return (
                <div key={step.number} className="text-center">
                  <div className="relative mb-8 inline-flex items-center justify-center">
                    <span className="text-[80px] font-extrabold leading-none text-accent/10">{step.number}</span>
                    <div className="absolute flex h-16 w-16 items-center justify-center rounded-full bg-accent shadow-card">
                      <IconComponent className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <h3 className="mb-3 text-2xl font-bold text-primary">{step.title}</h3>
                  <p className="mx-auto max-w-xs leading-relaxed text-text">{step.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1300px] px-4 py-20 lg:px-[15px] lg:py-[120px]">
        <div className="mb-16 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-xl">
            <Badge className="mb-4">Nos praticiens</Badge>
            <h2 className="text-3xl font-semibold tracking-[-0.01em] leading-[1.2em] md:text-[48px]">
              Des médecins de confiance à votre service
            </h2>
          </div>
          <Link href="/recherche">
            <Button variant="ghost" className="text-accent!">
              Voir tous les médecins →
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <HomeSkeleton />
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-4">
            {(data?.featured_doctors ?? []).map((doctor) => (
              <Card key={doctor.id} padding="sm" className="overflow-hidden">
                <div className="relative mb-5 aspect-[3/4] overflow-hidden rounded-[20px] bg-secondary/50">
                  <Avatar
                    src={doctor.photo_url}
                    alt={`${doctor.first_name} ${doctor.last_name}`}
                    size="lg"
                    className="absolute inset-0 h-full w-full rounded-[20px]"
                  />
                  <div className="absolute right-3 top-3">
                    <Badge variant="info" dot={false} className="px-3! py-1.5! text-xs!">
                      Disponible
                    </Badge>
                  </div>
                </div>
                <div className="px-2 pb-2">
                  <p className="mb-1 text-sm font-medium text-accent">{doctor.specialty || 'Spécialité'}</p>
                  <h3 className="mb-2 text-lg font-bold text-primary">
                    Dr. {doctor.first_name} {doctor.last_name}
                  </h3>
                  <p className="mb-1 flex items-center gap-1.5 text-sm text-text/80">
                    <Stethoscope className="h-4 w-4 flex-shrink-0 text-accent" />
                    {doctor.cabinet_name || 'Cabinet médical'}
                  </p>
                  <p className="text-sm font-medium text-primary">
                    Tarif :{' '}
                    <span className="font-bold text-accent">
                      {doctor.fee ? Number.parseFloat(doctor.fee).toLocaleString('fr-FR') : 'Sur demande'} FCFA
                    </span>
                  </p>
                  <Link href={`/medecins/${doctor.user_id}`} className="mt-4 block">
                    <Button fullWidth size="sm">
                      Prendre rendez-vous
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-[1300px] px-4 pb-20 lg:px-[15px] lg:pb-[120px]">
        <div className="mb-10 flex items-end justify-between gap-6">
          <div>
            <Badge className="mb-4">Rendez-vous live</Badge>
            <h2 className="text-3xl font-semibold tracking-[-0.01em] leading-[1.2em] md:text-[48px]">
              Les prochains créneaux à saisir
            </h2>
          </div>
          <Link href="/recherche" className="hidden md:block">
            <Button variant="ghost" className="text-accent!">
              Explorer tous les créneaux
            </Button>
          </Link>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {featuredSlots.length ? (
            featuredSlots.map((slot) => (
              <Link
                key={`${slot.doctor_id}-${slot.slot_start}-grid`}
                href={`/medecins/${slot.doctor_id}/reserver`}
                className="group rounded-[28px] border border-divider bg-white p-5 shadow-card transition duration-300 hover:-translate-y-1 hover:border-accent/30 hover:shadow-[0_24px_70px_rgba(0,168,188,0.12)]"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                    <Video className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="info" dot={false} className="px-3! py-1.5! text-xs!">
                        Disponible
                      </Badge>
                      <span className="text-xs font-semibold uppercase tracking-[0.24em] text-text/45">
                        {slot.specialty || 'Créneau'}
                      </span>
                    </div>
                    <h3 className="mt-3 text-lg font-bold text-primary">{slot.doctor_name}</h3>
                    <p className="mt-2 text-sm text-text/70">{formatSlot(slot.slot_start)}</p>
                    <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-accent">
                      Réserver maintenant
                      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <Card hoverable={false} className="lg:col-span-3 p-8 text-center text-text/60">
              Les créneaux en temps réel s’afficheront ici dès qu’ils seront disponibles.
            </Card>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-[1820px] rounded-pluxes bg-secondary bg-cover bg-center bg-no-repeat py-20 lg:py-[100px]" style={{ backgroundImage: "linear-gradient(180deg, rgba(248,252,253,0.96), rgba(238,249,252,0.92))" }}>
        <div className="mx-auto max-w-[1300px] px-4 lg:px-[15px]">
          <div className="mb-16 text-center">
            <Badge className="mb-4 bg-accent/10 text-accent backdrop-blur-[30px]">Nos chiffres</Badge>
            <h2 className="text-3xl font-semibold tracking-[-0.01em] leading-[1.2em] text-primary md:text-[48px]">
              La confiance de nos utilisateurs
            </h2>
          </div>

          <div className="grid gap-8 grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => {
              const IconComponent = stat.icon;
              return (
                <div key={stat.label} className="text-center">
                  <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
                    <IconComponent className="h-8 w-8 text-accent" />
                  </div>
                  <p className="mb-2 text-4xl font-bold text-primary md:text-5xl">{stat.value}</p>
                  <p className="text-text/65">{stat.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1300px] px-4 py-20 lg:px-[15px] lg:py-[120px]">
        <div className="relative overflow-hidden rounded-pluxes bg-accent p-10 text-center lg:p-16">
          <div className="absolute right-0 top-0 h-64 w-64 -translate-y-1/2 translate-x-1/2 rounded-full bg-white/5" />
          <div className="absolute bottom-0 left-0 h-48 w-48 translate-y-1/2 -translate-x-1/2 rounded-full bg-white/5" />
          <div className="relative z-10">
            <div className="mb-8 inline-flex h-20 w-20 items-center justify-center rounded-full bg-white/20">
              <Video className="h-10 w-10 text-white" />
            </div>
            <h2 className="mb-6 text-3xl font-semibold leading-[1.2em] tracking-[-0.01em] text-white md:text-[48px]">
              Consultez depuis chez vous
            </h2>
            <p className="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-white/80">
              Grâce à la téléconsultation vidéo, consultez un spécialiste sans vous déplacer. Disponible depuis votre téléphone ou votre ordinateur.
            </p>
            <Link href="/inscription">
              <Button size="lg" className="bg-white! text-accent! hover:bg-primary! hover:text-white!">
                Commencer maintenant
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
