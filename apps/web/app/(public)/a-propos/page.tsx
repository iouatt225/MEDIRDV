import Link from 'next/link';
import { Activity, ArrowRight, CalendarCheck, CheckCircle, Database, ShieldCheck, Stethoscope, Users, Video } from 'lucide-react';

import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

const metrics = [
  { label: 'Espaces connectes', value: '4', icon: Users },
  { label: 'Parcours patient', value: '24/7', icon: CalendarCheck },
  { label: 'Teleconsultation', value: 'Live', icon: Video },
  { label: 'Donnees medicales', value: 'Secure', icon: ShieldCheck },
];

const pillars = [
  {
    title: 'Une recherche plus claire',
    description: 'Les patients trouvent rapidement les medecins actifs, leurs specialites et les prochains creneaux disponibles.',
    icon: Stethoscope,
  },
  {
    title: 'Des donnees utiles',
    description: 'Chaque espace remonte les indicateurs essentiels pour piloter les rendez-vous, la disponibilite et le suivi.',
    icon: Database,
  },
  {
    title: 'Un parcours plus fiable',
    description: 'Connexion par telephone ou e-mail, roles dedies, espace praticien, espace patient et administration centralisee.',
    icon: CheckCircle,
  },
];

const timeline = [
  { step: '01', title: 'Identifier', text: 'Verifier le besoin medical et trouver le bon praticien.' },
  { step: '02', title: 'Planifier', text: 'Choisir un creneau disponible en cabinet ou en teleconsultation.' },
  { step: '03', title: 'Suivre', text: 'Centraliser les rendez-vous, notifications et historiques.' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <section className="bg-linear-to-b/oklch from-teal-100 via-white to-white pt-36 pb-16">
        <div className="mx-auto max-w-[85rem] px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-left sm:text-center">
            <Badge className="mb-5 bg-white!">A propos de MediRDV</Badge>
            <h1 className="text-4xl font-semibold text-slate-900 md:text-6xl">
              Une plateforme medicale pensee comme un dashboard de decision.
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-700">
              MediRDV CI aide les patients, praticiens, secretaires et administrateurs a transformer la prise de rendez-vous
              en un parcours lisible, mesurable et rapide.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
              <Link href="/recherche">
                <Button size="lg" className="w-full sm:w-auto">
                  Trouver un medecin
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/inscription">
                <Button variant="secondary" size="lg" className="w-full border-slate-900! text-slate-900! hover:bg-slate-900! sm:w-auto">
                  Rejoindre MediRDV
                </Button>
              </Link>
            </div>
          </div>

          <div className="mt-14 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
              <div>
                <p className="text-sm font-bold text-slate-900">MediRDV Operating System</p>
                <p className="text-xs text-slate-500">Vision, roles et activite medicale</p>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-teal-50 px-3 py-2 text-xs font-semibold text-accent">
                <Activity className="h-4 w-4" />
                Live
              </div>
            </div>
            <div className="grid gap-0 md:grid-cols-4">
              {metrics.map((metric) => {
                const Icon = metric.icon;
                return (
                  <div key={metric.label} className="border-b border-slate-200 p-5 md:border-b-0 md:border-r md:last:border-r-0">
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-accent">
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="text-3xl font-bold text-slate-900">{metric.value}</p>
                    <p className="mt-1 text-sm text-slate-500">{metric.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[85rem] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-12 max-w-2xl">
          <Badge className="mb-4">Notre approche</Badge>
          <h2 className="text-3xl font-semibold text-slate-900 md:text-5xl">Une experience medicale structuree par la donnee.</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <Card key={pillar.title} className="border border-slate-200 bg-white p-6" hoverable>
                <div className="mb-8 flex h-11 w-11 items-center justify-center rounded-lg bg-teal-50 text-accent">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">{pillar.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{pillar.description}</p>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-[85rem] px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <Badge className="mb-4 bg-white!">Workflow</Badge>
              <h2 className="text-3xl font-semibold text-slate-900 md:text-5xl">Du besoin patient au suivi du rendez-vous.</h2>
              <p className="mt-5 text-lg leading-8 text-slate-700">
                La plateforme organise les informations medicales autour d actions simples: rechercher, reserver, consulter et suivre.
              </p>
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
              {timeline.map((item) => (
                <div key={item.step} className="flex gap-5 border-b border-slate-200 p-5 last:border-b-0">
                  <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-teal-50 text-sm font-bold text-accent">
                    {item.step}
                  </span>
                  <div>
                    <h3 className="font-bold text-slate-900">{item.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
