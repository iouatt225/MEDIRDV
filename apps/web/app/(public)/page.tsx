import Image from 'next/image';
import Link from 'next/link';
import {
  Heart,
  Baby,
  Brain,
  Eye,
  Stethoscope,
  Bone,
  Search,
  CalendarCheck,
  Video,
  Star,
  Users,
  Calendar,
  CheckCircle,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';

/* ============================================
   Données statiques (remplacées par API plus tard)
   ============================================ */
const specialties = [
  { icon: Heart, name: 'Cardiologie', description: 'Maladies du cœur et du système cardiovasculaire', count: 12 },
  { icon: Baby, name: 'Pédiatrie', description: 'Soins médicaux pour nourrissons, enfants et adolescents', count: 18 },
  { icon: Brain, name: 'Neurologie', description: 'Troubles du système nerveux et du cerveau', count: 8 },
  { icon: Eye, name: 'Ophtalmologie', description: 'Diagnostic et traitement des maladies des yeux', count: 15 },
  { icon: Stethoscope, name: 'Médecine générale', description: 'Consultations de premier recours et suivi médical', count: 25 },
  { icon: Bone, name: 'Orthopédie', description: 'Pathologies de l\'appareil locomoteur', count: 10 },
];

const steps = [
  {
    icon: Search,
    number: '01',
    title: 'Recherchez',
    description: 'Trouvez le spécialiste qu\'il vous faut par spécialité, localisation ou nom.',
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

const featuredDoctors = [
  {
    name: 'Dr. Kouamé Aya',
    specialty: 'Cardiologie',
    image: '/images/team-1.jpg',
    rating: 4.9,
    reviews: 127,
  },
  {
    name: 'Dr. Traoré Ibrahim',
    specialty: 'Pédiatrie',
    image: '/images/team-2.jpg',
    rating: 4.8,
    reviews: 89,
  },
  {
    name: 'Dr. Bamba Fatoumata',
    specialty: 'Dermatologie',
    image: '/images/team-3.jpg',
    rating: 4.9,
    reviews: 156,
  },
  {
    name: 'Dr. Koné Moussa',
    specialty: 'Neurologie',
    image: '/images/team-4.jpg',
    rating: 4.7,
    reviews: 73,
  },
];

const stats = [
  { label: 'Médecins partenaires', value: '50+', icon: Users },
  { label: 'Rendez-vous réservés', value: '2 000+', icon: Calendar },
  { label: 'Patients satisfaits', value: '98%', icon: CheckCircle },
  { label: 'Spécialités', value: '15+', icon: Stethoscope },
];

/* ============================================
   Page d'accueil
   ============================================ */
export default function HomePage() {
  return (
    <>
      {/* ===== Hero Section ===== */}
      <section
        className="
          relative min-h-screen flex items-center
          bg-primary bg-cover bg-center bg-no-repeat
          rounded-b-pluxes overflow-hidden
          pt-24 pb-20 lg:pt-0 lg:pb-0
        "
        style={{ backgroundImage: "url('/images/hero-bg-image.jpg')" }}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-primary/50" />

        <div className="relative z-10 max-w-[1300px] mx-auto px-4 lg:px-[15px] w-full">
          <div className="max-w-3xl">
            {/* Sub-title badge */}
            <Badge variant="default" className="bg-divider-dark! text-white! backdrop-blur-[30px] mb-6">
              Votre santé, entre de bonnes mains
            </Badge>

            {/* Main heading */}
            <h1 className="text-4xl md:text-5xl lg:text-[66px] font-semibold text-white leading-[1.1em] tracking-[-0.01em] mb-6">
              Prenez rendez-vous avec les meilleurs spécialistes d&apos;Abidjan
            </h1>

            {/* Description */}
            <p className="text-lg text-white/80 leading-relaxed mb-10 max-w-xl">
              MediRDV vous connecte avec des médecins spécialistes de confiance.
              Consultation en cabinet ou par téléconsultation vidéo, en quelques clics.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/recherche">
                <Button size="lg">
                  Trouver un médecin
                </Button>
              </Link>
              <Link href="/inscription">
                <Button variant="secondary" size="lg" className="border-white! text-white! hover:bg-white! hover:text-primary!">
                  S&apos;inscrire gratuitement
                </Button>
              </Link>
            </div>

            {/* Social proof */}
            <div className="flex items-center gap-4 mt-12">
              <div className="flex -space-x-3">
                {['/images/author-1.jpg', '/images/author-2.jpg', '/images/author-3.jpg'].map((src, i) => (
                  <Avatar key={i} src={src} alt="Patient" size="sm" className="border-2 border-white" />
                ))}
              </div>
              <div>
                <div className="flex items-center gap-1 mb-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-warning text-warning" />
                  ))}
                </div>
                <p className="text-sm text-white/70">
                  Plus de <strong className="text-white">2 000</strong> patients nous font confiance
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Specialties Section ===== */}
      <section className="py-20 lg:py-[120px]">
        <div className="max-w-[1300px] mx-auto px-4 lg:px-[15px]">
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
            <div className="max-w-xl">
              <Badge className="mb-4">Nos spécialités</Badge>
              <h2 className="text-3xl md:text-[48px] font-semibold tracking-[-0.01em] leading-[1.2em]">
                Des experts pour chaque besoin médical
              </h2>
            </div>
            <Link href="/recherche">
              <Button variant="ghost" className="text-accent!">
                Voir toutes les spécialités →
              </Button>
            </Link>
          </div>

          {/* Specialty Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {specialties.map((specialty) => {
              const IconComponent = specialty.icon;
              return (
                <Card key={specialty.name} className="flex flex-col justify-between gap-6 min-h-[280px]">
                  {/* Icon */}
                  <div className="w-[60px] h-[60px] rounded-full bg-accent flex items-center justify-center group-hover:bg-primary transition-colors duration-400">
                    <IconComponent className="w-7 h-7 text-white" />
                  </div>

                  {/* Content */}
                  <div>
                    <h3 className="text-xl font-bold text-primary mb-2">{specialty.name}</h3>
                    <p className="text-text leading-relaxed">{specialty.description}</p>
                  </div>

                  {/* Footer */}
                  <div className="border-t border-divider pt-5">
                    <Link
                      href={`/recherche?specialite=${specialty.name.toLowerCase()}`}
                      className="inline-flex items-center gap-2 font-bold text-primary hover:text-accent transition-colors duration-300"
                    >
                      {specialty.count} médecins disponibles
                      <span className="text-accent">→</span>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== How It Works Section ===== */}
      <section className="py-20 lg:py-[120px] bg-secondary rounded-pluxes max-w-[1820px] mx-auto">
        <div className="max-w-[1300px] mx-auto px-4 lg:px-[15px]">
          {/* Section Header */}
          <div className="text-center max-w-[700px] mx-auto mb-16">
            <Badge className="mb-4 bg-white!">Comment ça marche</Badge>
            <h2 className="text-3xl md:text-[48px] font-semibold tracking-[-0.01em] leading-[1.2em]">
              Votre rendez-vous en 3 étapes simples
            </h2>
            <p className="mt-5 text-text leading-relaxed">
              Plus besoin de faire la queue ou de passer des heures au téléphone.
              Réservez votre consultation en quelques clics.
            </p>
          </div>

          {/* Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step) => {
              const IconComponent = step.icon;
              return (
                <div key={step.number} className="text-center">
                  {/* Step Number + Icon */}
                  <div className="relative inline-flex items-center justify-center mb-8">
                    <span className="text-[80px] font-extrabold text-accent/10 leading-none">
                      {step.number}
                    </span>
                    <div className="absolute w-16 h-16 rounded-full bg-accent flex items-center justify-center shadow-card">
                      <IconComponent className="w-8 h-8 text-white" />
                    </div>
                  </div>

                  {/* Text */}
                  <h3 className="text-2xl font-bold text-primary mb-3">{step.title}</h3>
                  <p className="text-text leading-relaxed max-w-xs mx-auto">{step.description}</p>
                </div>
              );
            })}
          </div>

          {/* CTA */}
          <div className="text-center mt-14">
            <Link href="/recherche">
              <Button size="lg">
                Prendre rendez-vous maintenant
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ===== Featured Doctors Section ===== */}
      <section className="py-20 lg:py-[120px]">
        <div className="max-w-[1300px] mx-auto px-4 lg:px-[15px]">
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
            <div className="max-w-xl">
              <Badge className="mb-4">Nos praticiens</Badge>
              <h2 className="text-3xl md:text-[48px] font-semibold tracking-[-0.01em] leading-[1.2em]">
                Des médecins de confiance à votre service
              </h2>
            </div>
            <Link href="/recherche">
              <Button variant="ghost" className="text-accent!">
                Voir tous les médecins →
              </Button>
            </Link>
          </div>

          {/* Doctor Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-8">
            {featuredDoctors.map((doctor) => (
              <Card key={doctor.name} padding="sm" className="overflow-hidden">
                {/* Image */}
                <div className="relative aspect-[3/4] rounded-[20px] overflow-hidden mb-5">
                  <Image
                    src={doctor.image}
                    alt={doctor.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
                  />
                  <div className="absolute top-3 right-3">
                    <Badge variant="info" dot={false} className="text-xs! px-3! py-1.5!">
                      Disponible
                    </Badge>
                  </div>
                </div>

                {/* Info */}
                <div className="px-2 pb-2">
                  <p className="text-sm font-medium text-accent mb-1">{doctor.specialty}</p>
                  <h3 className="text-lg font-bold text-primary mb-2">{doctor.name}</h3>

                  {/* Rating */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      <Star className="w-4 h-4 fill-warning text-warning" />
                      <span className="text-sm font-bold text-primary">{doctor.rating}</span>
                    </div>
                    <span className="text-sm text-text">({doctor.reviews} avis)</span>
                  </div>

                  {/* CTA */}
                  <Link href="/recherche" className="mt-4 block">
                    <Button fullWidth size="sm">
                      Prendre rendez-vous
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Stats Section ===== */}
      <section
        className="
          py-20 lg:py-[100px]
          bg-primary bg-cover bg-center bg-no-repeat
          rounded-pluxes max-w-[1820px] mx-auto
        "
        style={{ backgroundImage: "url('/images/dark-section-bg-image.png')" }}
      >
        <div className="max-w-[1300px] mx-auto px-4 lg:px-[15px]">
          <div className="text-center mb-16">
            <Badge className="bg-divider-dark! text-white! backdrop-blur-[30px] mb-4">
              Nos chiffres
            </Badge>
            <h2 className="text-3xl md:text-[48px] font-semibold text-white tracking-[-0.01em] leading-[1.2em]">
              La confiance de nos utilisateurs
            </h2>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat) => {
              const IconComponent = stat.icon;
              return (
                <div key={stat.label} className="text-center">
                  <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-5">
                    <IconComponent className="w-8 h-8 text-accent" />
                  </div>
                  <p className="text-4xl md:text-5xl font-bold text-white mb-2">{stat.value}</p>
                  <p className="text-white/60">{stat.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== Teleconsultation CTA Section ===== */}
      <section className="py-20 lg:py-[120px]">
        <div className="max-w-[1300px] mx-auto px-4 lg:px-[15px]">
          <div className="bg-accent rounded-pluxes p-10 lg:p-16 text-center relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

            <div className="relative z-10">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 mb-8">
                <Video className="w-10 h-10 text-white" />
              </div>

              <h2 className="text-3xl md:text-[48px] font-semibold text-white tracking-[-0.01em] leading-[1.2em] mb-6">
                Consultez depuis chez vous
              </h2>
              <p className="text-lg text-white/80 max-w-xl mx-auto mb-10 leading-relaxed">
                Grâce à la téléconsultation vidéo, consultez un spécialiste sans vous déplacer.
                Disponible depuis votre téléphone ou votre ordinateur.
              </p>

              <Link href="/inscription">
                <Button
                  size="lg"
                  className="bg-white! text-accent! hover:bg-primary! hover:text-white!"
                >
                  Commencer maintenant
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
