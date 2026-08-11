import Link from 'next/link';
import { ArrowRight, Building2, Clock3, Mail, MapPin, MessageSquare, Phone, Send, ShieldCheck } from 'lucide-react';

import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';

const contactCards = [
  {
    title: 'Telephone',
    value: '+225 07 00 00 00 00',
    detail: 'Support patient et praticien',
    icon: Phone,
  },
  {
    title: 'E-mail',
    value: 'contact@medirdv.ci',
    detail: 'Reponse sous 24h ouvrables',
    icon: Mail,
  },
  {
    title: 'Localisation',
    value: 'Abidjan, Cote d Ivoire',
    detail: 'Equipe operationnelle locale',
    icon: MapPin,
  },
];

const supportTracks = [
  { label: 'Patients', text: 'Aide a la reservation, connexion, suivi de rendez-vous.' },
  { label: 'Praticiens', text: 'Profil public, agenda, disponibilites et teleconsultation.' },
  { label: 'Administrateurs', text: 'Gestion des utilisateurs, activite et indicateurs plateforme.' },
];

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white">
      <section className="bg-linear-to-b/oklch from-teal-100 via-white to-white pt-36 pb-16">
        <div className="mx-auto max-w-[85rem] px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <Badge className="mb-5 bg-white!">Contact</Badge>
              <h1 className="text-4xl font-semibold text-slate-900 md:text-6xl">
                Parlons de votre parcours medical ou de votre espace praticien.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-700">
                Une question, un blocage ou une demande d accompagnement ? L equipe MediRDV vous aide a garder le parcours simple.
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Link href="/recherche">
                  <Button size="lg" className="w-full sm:w-auto">
                    Trouver un medecin
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/connexion">
                  <Button variant="secondary" size="lg" className="w-full border-slate-900! text-slate-900! hover:bg-slate-900! sm:w-auto">
                    Se connecter
                  </Button>
                </Link>
              </div>
            </div>

            <Card hoverable={false} className="border border-slate-200 bg-white p-6 shadow-card lg:p-8">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-accent">Message</p>
                  <h2 className="mt-1 text-3xl font-bold text-slate-900">Envoyer une demande</h2>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-teal-50 text-accent">
                  <MessageSquare className="h-5 w-5" />
                </div>
              </div>

              <form action="mailto:contact@medirdv.ci" method="post" encType="text/plain" className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <Input label="Nom complet" name="name" placeholder="Votre nom" required />
                  <Input label="E-mail" name="email" type="email" placeholder="nom@domaine.com" required />
                </div>
                <Input label="Objet" name="subject" placeholder="Ex: Probleme de reservation" required />
                <div>
                  <label htmlFor="message" className="mb-2 block text-sm font-semibold text-primary">
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={6}
                    required
                    placeholder="Decrivez votre demande..."
                    className="w-full rounded-pluxes-xs border border-divider bg-white px-5 py-4 text-base text-primary outline-none transition-all duration-300 placeholder:text-text/50 focus:border-accent"
                  />
                </div>
                <Button type="submit" fullWidth>
                  Envoyer
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </Card>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[85rem] px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          {contactCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.title} className="border border-slate-200 bg-white p-6" hoverable>
                <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-lg bg-teal-50 text-accent">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">{card.title}</h3>
                <p className="mt-2 font-semibold text-accent">{card.value}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{card.detail}</p>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-[85rem] px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <Badge className="mb-4 bg-white!">Support</Badge>
              <h2 className="text-3xl font-semibold text-slate-900 md:text-5xl">Un canal pour chaque profil.</h2>
              <p className="mt-5 text-lg leading-8 text-slate-700">
                Les demandes sont classees par role pour repondre plus vite et mieux suivre les actions.
              </p>
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-accent">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Files de traitement</p>
                    <p className="text-xs text-slate-500">Priorisation par espace utilisateur</p>
                  </div>
                </div>
                <Clock3 className="h-5 w-5 text-accent" />
              </div>
              {supportTracks.map((track) => (
                <div key={track.label} className="flex gap-4 border-b border-slate-200 p-5 last:border-b-0">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{track.label}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{track.text}</p>
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
