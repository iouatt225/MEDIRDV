import Link from 'next/link';

const quickLinks = [
  { label: 'Accueil', href: '/' },
  { label: 'Recherche', href: '/recherche' },
  { label: 'Connexion', href: '/connexion' },
  { label: 'Inscription', href: '/inscription' },
];

const serviceLinks = [
  { label: 'Cardiologie', href: '/recherche?specialty=Cardiologie' },
  { label: 'Pediatrie', href: '/recherche?specialty=Pediatrie' },
  { label: 'Dermatologie', href: '/recherche?specialty=Dermatologie' },
  { label: 'Medecine generale', href: '/recherche?specialty=Medecine%20generale' },
];

const supportLinks = [
  { label: 'Centre aide', href: '/aide' },
  { label: 'Confidentialite', href: '/confidentialite' },
  { label: 'Conditions', href: '/conditions' },
  { label: 'Contact', href: '/contact' },
];

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-[85rem] px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_1.9fr]">
          <div>
            <Link href="/" className="text-2xl font-light text-slate-400">
              <span className="font-semibold text-accent">Medi</span>
              <span className="font-semibold text-slate-900">RDV</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-6 text-slate-600">
              Plateforme medicale pour rechercher des praticiens, reserver des creneaux et suivre les consultations.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 md:grid-cols-3">
            <FooterColumn title="Navigation" links={quickLinks} />
            <FooterColumn title="Specialites" links={serviceLinks} />
            <FooterColumn title="Support" links={supportLinks} />
          </div>
        </div>

        <div className="mt-12 flex flex-col justify-between gap-4 border-t border-slate-200 pt-6 text-sm text-slate-500 md:flex-row">
          <p>Copyright © {currentYear} MediRDV CI. Tous droits reserves.</p>
          <p>Interface inspiree du style data SaaS Datanova.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: Array<{ label: string; href: string }> }) {
  return (
    <div>
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      <ul className="mt-4 space-y-3">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="text-sm text-slate-600 transition-colors hover:text-accent">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
