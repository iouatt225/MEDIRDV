import Link from 'next/link';
import Image from 'next/image';

const quickLinks = [
  { label: 'Accueil', href: '/' },
  { label: 'À propos', href: '/a-propos' },
  { label: 'Nos spécialités', href: '/recherche' },
  { label: 'Contact', href: '/contact' },
];

const serviceLinks = [
  { label: 'Cardiologie', href: '/recherche?specialite=cardiologie' },
  { label: 'Pédiatrie', href: '/recherche?specialite=pediatrie' },
  { label: 'Dermatologie', href: '/recherche?specialite=dermatologie' },
  { label: 'Médecine générale', href: '/recherche?specialite=generaliste' },
];

const supportLinks = [
  { label: 'Centre d\'aide', href: '/aide' },
  { label: 'Politique de confidentialité', href: '/confidentialite' },
  { label: 'Conditions d\'utilisation', href: '/conditions' },
  { label: 'Nous contacter', href: '/contact' },
];

const socialLinks = [
  { icon: 'facebook', href: '#', label: 'Facebook' },
  { icon: 'instagram', href: '#', label: 'Instagram' },
];

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className="
        bg-primary bg-[url('/images/dark-section-bg-image.png')]
        bg-no-repeat bg-top bg-cover
        rounded-t-pluxes
        mt-auto
      "
    >
      <div className="max-w-[1300px] mx-auto px-4 lg:px-[15px]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 py-16 lg:py-24">
          {/* CTA Section */}
          <div className="lg:col-span-5">
            <div>
              <span
                className="
                  inline-flex items-center gap-2
                  text-sm font-medium text-white
                  bg-divider-dark backdrop-blur-[30px]
                  rounded-full px-5 py-2.5 pl-9
                  relative mb-4
                "
              >
                <span className="absolute left-5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-accent" />
                Votre santé, notre priorité
              </span>
              <h2 className="text-5xl lg:text-6xl font-semibold text-white mt-4">
                <Link href="/contact" className="hover:text-accent transition-colors duration-300">
                  Prenez rendez-vous
                </Link>
              </h2>
            </div>
          </div>

          {/* Links Section */}
          <div className="lg:col-span-7">
            {/* Footer Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-8 border-b border-divider-dark">
              <Image
                src="/images/logo.svg"
                alt="MediRDV"
                width={140}
                height={40}
              />
              <div className="flex gap-3">
                {socialLinks.map((social) => (
                  <a
                    key={social.icon}
                    href={social.href}
                    aria-label={social.label}
                    className="
                      w-10 h-10
                      flex items-center justify-center
                      rounded-full
                      border border-divider-dark
                      text-white opacity-70 hover:opacity-100 hover:border-accent hover:bg-accent
                      transition-all duration-300
                    "
                  >
                    {social.icon === 'facebook' ? (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 1.092.044 1.545.103v3.243h-1.1c-1.653 0-2.165.831-2.165 2.385v1.827h3.117l-.535 3.667h-2.582v7.98" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                      </svg>
                    )}
                  </a>
                ))}
              </div>
            </div>

            {/* Footer Links Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8 pt-8">
              <div>
                <h3 className="text-lg font-bold text-white mb-4">Liens rapides</h3>
                <ul className="space-y-3">
                  {quickLinks.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-white opacity-80 hover:opacity-100 hover:text-accent transition-all duration-300"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-4">Spécialités</h3>
                <ul className="space-y-3">
                  {serviceLinks.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-white opacity-80 hover:opacity-100 hover:text-accent transition-all duration-300"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-4">Support</h3>
                <ul className="space-y-3">
                  {supportLinks.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-white opacity-80 hover:opacity-100 hover:text-accent transition-all duration-300"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-divider-dark">
        <div className="max-w-[1300px] mx-auto px-4 lg:px-[15px] py-6">
          <p className="text-center text-white opacity-60 text-sm">
            Copyright © {currentYear} MediRDV CI. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
}
