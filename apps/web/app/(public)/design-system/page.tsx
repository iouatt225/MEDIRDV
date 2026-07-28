'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import Avatar from '@/components/ui/Avatar';
import { Tabs, TabList, Tab, TabPanel } from '@/components/ui/Tabs';
import { Heart } from 'lucide-react';

/* ============================================
   Palette de couleurs
   ============================================ */
const colors = [
  { name: 'Primary', value: '#08363B', css: '--color-primary', usage: 'Titres, header, footer, fond sombre' },
  { name: 'Primary Light', value: '#0A4A51', css: '--color-primary-light', usage: 'Hover sur primary' },
  { name: 'Secondary', value: '#EDF9FC', css: '--color-secondary', usage: 'Fonds doux, sections alternées' },
  { name: 'Accent', value: '#00A8BC', css: '--color-accent', usage: 'Boutons, liens, éléments actifs' },
  { name: 'Accent Dark', value: '#008A9A', css: '--color-accent-dark', usage: 'Hover sur accent' },
  { name: 'Text', value: '#67787A', css: '--color-text', usage: 'Texte courant' },
  { name: 'Error', value: 'rgb(230,87,87)', css: '--color-error', usage: 'Erreurs, RDV annulé' },
  { name: 'Success', value: '#22C55E', css: '--color-success', usage: 'RDV confirmé, validations' },
  { name: 'Warning', value: '#F59E0B', css: '--color-warning', usage: 'RDV en attente, alertes' },
];

const typography = [
  { tag: 'h1', size: '66px', weight: '600', sample: 'Titre principal (Hero)' },
  { tag: 'h2', size: '48px', weight: '600', sample: 'Titre de section' },
  { tag: 'h3', size: '20px', weight: '700', sample: 'Titre de carte' },
  { tag: 'p', size: '16px', weight: '400', sample: 'Texte courant — body' },
  { tag: 'small', size: '14px', weight: '500', sample: 'Sous-titre, badge' },
];

export default function DesignSystemPage() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="pt-28 pb-20">
      <div className="max-w-[1300px] mx-auto px-4 lg:px-[15px]">
        {/* Header */}
        <div className="mb-16">
          <Badge className="mb-4">Design System</Badge>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-[-0.01em] leading-[1.1em] mb-4">
            MediRDV — Design System
          </h1>
          <p className="text-lg text-text max-w-2xl leading-relaxed">
            Composants UI dérivés du template Pluxes, adaptés à l&apos;identité MediRDV CI.
            Police : <strong>Rethink Sans</strong>. Tous les composants sont dans{' '}
            <code className="bg-secondary px-2 py-1 rounded text-sm font-mono">components/ui/</code>.
          </p>
        </div>

        {/* ===== Colors ===== */}
        <section className="mb-20">
          <h2 className="text-3xl font-semibold mb-8">Palette de couleurs</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {colors.map((color) => (
              <div key={color.name} className="rounded-pluxes-sm overflow-hidden shadow-card">
                <div
                  className="h-24"
                  style={{ backgroundColor: color.value }}
                />
                <div className="p-4 bg-white">
                  <p className="font-bold text-primary text-sm">{color.name}</p>
                  <p className="text-xs text-text mt-1 font-mono">{color.value}</p>
                  <p className="text-xs text-text/60 mt-1">{color.usage}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ===== Typography ===== */}
        <section className="mb-20">
          <h2 className="text-3xl font-semibold mb-8">Typographie</h2>
          <Card hoverable={false}>
            <div className="space-y-6">
              {typography.map((item) => (
                <div key={item.tag} className="flex flex-col md:flex-row md:items-baseline gap-4 pb-6 border-b border-divider last:border-0 last:pb-0">
                  <div className="md:w-32 flex-shrink-0">
                    <code className="text-sm font-mono bg-secondary px-2 py-1 rounded">&lt;{item.tag}&gt;</code>
                    <p className="text-xs text-text mt-1">{item.size} / {item.weight}</p>
                  </div>
                  <div style={{ fontSize: item.size, fontWeight: Number(item.weight), lineHeight: '1.2em' }} className="text-primary">
                    {item.sample}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>

        {/* ===== Buttons ===== */}
        <section className="mb-20">
          <h2 className="text-3xl font-semibold mb-8">Button</h2>
          <Card hoverable={false}>
            <h3 className="text-lg font-bold text-primary mb-4">Variantes</h3>
            <div className="flex flex-wrap items-center gap-4 mb-8">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
            </div>

            <h3 className="text-lg font-bold text-primary mb-4">Tailles</h3>
            <div className="flex flex-wrap items-center gap-4 mb-8">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
            </div>

            <h3 className="text-lg font-bold text-primary mb-4">États</h3>
            <div className="flex flex-wrap items-center gap-4">
              <Button loading>Chargement...</Button>
              <Button disabled>Désactivé</Button>
              <Button fullWidth>Pleine largeur</Button>
            </div>
          </Card>
        </section>

        {/* ===== Cards ===== */}
        <section className="mb-20">
          <h2 className="text-3xl font-semibold mb-8">Card</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card variant="default">
              <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center mb-4">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-primary mb-2">Variante default</h3>
              <p className="text-text">Fond blanc avec ombre et effet hover lift.</p>
            </Card>
            <Card variant="secondary">
              <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center mb-4">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-primary mb-2">Variante secondary</h3>
              <p className="text-text">Fond bleu clair (#EDF9FC).</p>
            </Card>
            <Card variant="dark">
              <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center mb-4">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold mb-2">Variante dark</h3>
              <p className="text-white/70">Fond primary sombre.</p>
            </Card>
          </div>
        </section>

        {/* ===== Badges ===== */}
        <section className="mb-20">
          <h2 className="text-3xl font-semibold mb-8">Badge</h2>
          <Card hoverable={false}>
            <div className="flex flex-wrap gap-4">
              <Badge variant="default">Par défaut</Badge>
              <Badge variant="confirmed">Confirmé</Badge>
              <Badge variant="pending">En attente</Badge>
              <Badge variant="cancelled">Annulé</Badge>
              <Badge variant="info">Information</Badge>
              <Badge variant="default" dot={false}>Sans point</Badge>
            </div>
          </Card>
        </section>

        {/* ===== Inputs & Select ===== */}
        <section className="mb-20">
          <h2 className="text-3xl font-semibold mb-8">Input & Select</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card hoverable={false}>
              <h3 className="text-lg font-bold text-primary mb-4">Input (light)</h3>
              <div className="space-y-4">
                <Input label="Nom complet" placeholder="Entrez votre nom" name="name" />
                <Input label="Email" placeholder="votre@email.com" name="email" type="email" />
                <Input label="Avec erreur" placeholder="Champ invalide" error="Ce champ est obligatoire" name="error-demo" />
              </div>
            </Card>
            <Card variant="dark" hoverable={false}>
              <h3 className="text-lg font-bold mb-4">Input (dark)</h3>
              <div className="space-y-4">
                <Input label="Nom complet" placeholder="Entrez votre nom" variant="dark" name="name-dark" className="text-white" />
                <Select
                  label="Spécialité"
                  variant="dark"
                  placeholder="Choisir une spécialité"
                  options={[
                    { value: 'cardio', label: 'Cardiologie' },
                    { value: 'pediatrie', label: 'Pédiatrie' },
                    { value: 'dermato', label: 'Dermatologie' },
                  ]}
                  name="specialty-dark"
                  className="text-white"
                />
              </div>
            </Card>
          </div>
        </section>

        {/* ===== Avatar ===== */}
        <section className="mb-20">
          <h2 className="text-3xl font-semibold mb-8">Avatar</h2>
          <Card hoverable={false}>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <Avatar size="sm" src="/images/author-1.jpg" alt="Petit" />
                <p className="text-xs text-text mt-2">sm (32px)</p>
              </div>
              <div className="text-center">
                <Avatar size="md" src="/images/author-2.jpg" alt="Moyen" />
                <p className="text-xs text-text mt-2">md (48px)</p>
              </div>
              <div className="text-center">
                <Avatar size="lg" src="/images/author-3.jpg" alt="Grand" />
                <p className="text-xs text-text mt-2">lg (80px)</p>
              </div>
              <div className="text-center">
                <Avatar size="md" alt="Dr Kouamé" />
                <p className="text-xs text-text mt-2">Initiales</p>
              </div>
            </div>
          </Card>
        </section>

        {/* ===== Tabs ===== */}
        <section className="mb-20">
          <h2 className="text-3xl font-semibold mb-8">Tabs</h2>
          <Card hoverable={false}>
            <Tabs defaultTab="jour">
              <TabList>
                <Tab id="jour">Jour</Tab>
                <Tab id="semaine">Semaine</Tab>
                <Tab id="mois">Mois</Tab>
              </TabList>
              <TabPanel id="jour" className="pt-6">
                <p className="text-text">Vue agenda du jour — FullCalendar sera intégré ici dans le BLOC 3.</p>
              </TabPanel>
              <TabPanel id="semaine" className="pt-6">
                <p className="text-text">Vue agenda de la semaine.</p>
              </TabPanel>
              <TabPanel id="mois" className="pt-6">
                <p className="text-text">Vue agenda du mois.</p>
              </TabPanel>
            </Tabs>
          </Card>
        </section>

        {/* ===== Modal ===== */}
        <section className="mb-20">
          <h2 className="text-3xl font-semibold mb-8">Modal</h2>
          <Card hoverable={false}>
            <Button onClick={() => setModalOpen(true)}>
              Ouvrir la modale
            </Button>
            <Modal
              open={modalOpen}
              onClose={() => setModalOpen(false)}
              title="Confirmer le rendez-vous"
              size="md"
            >
              <p className="text-text leading-relaxed mb-6">
                Vous êtes sur le point de confirmer votre rendez-vous avec le{' '}
                <strong className="text-primary">Dr. Kouamé Aya</strong> le{' '}
                <strong className="text-primary">15 août 2026 à 10h00</strong>.
              </p>
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setModalOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={() => setModalOpen(false)}>
                  Confirmer
                </Button>
              </div>
            </Modal>
          </Card>
        </section>

        {/* ===== Border Radius ===== */}
        <section className="mb-20">
          <h2 className="text-3xl font-semibold mb-8">Border Radius</h2>
          <Card hoverable={false}>
            <div className="flex flex-wrap gap-6">
              {[
                { name: 'pluxes (30px)', cls: 'rounded-pluxes' },
                { name: 'pluxes-sm (14px)', cls: 'rounded-pluxes-sm' },
                { name: 'pluxes-xs (10px)', cls: 'rounded-pluxes-xs' },
                { name: 'pluxes-btn (5px)', cls: 'rounded-pluxes-btn' },
              ].map((r) => (
                <div key={r.name} className="text-center">
                  <div className={`w-24 h-24 bg-accent ${r.cls}`} />
                  <p className="text-xs text-text mt-2 font-mono">{r.name}</p>
                </div>
              ))}
            </div>
          </Card>
        </section>

        {/* ===== Shadows ===== */}
        <section className="mb-10">
          <h2 className="text-3xl font-semibold mb-8">Ombres</h2>
          <div className="flex flex-wrap gap-8">
            <div className="w-40 h-40 bg-white rounded-pluxes-sm shadow-card flex items-center justify-center">
              <span className="text-xs text-text font-mono">shadow-card</span>
            </div>
            <div className="w-40 h-40 bg-white rounded-pluxes-sm shadow-card-hover flex items-center justify-center">
              <span className="text-xs text-text font-mono">shadow-card-hover</span>
            </div>
            <div className="w-40 h-40 bg-white rounded-pluxes-sm shadow-nav flex items-center justify-center">
              <span className="text-xs text-text font-mono">shadow-nav</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
