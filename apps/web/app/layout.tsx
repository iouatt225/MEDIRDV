import type { Metadata } from 'next';
import { Rethink_Sans } from 'next/font/google';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import './globals.css';

const rethinkSans = Rethink_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'MediRDV CI — Prise de rendez-vous médicaux en Côte d\'Ivoire',
    template: '%s | MediRDV CI',
  },
  description:
    'Prenez rendez-vous avec les meilleurs médecins spécialistes d\'Abidjan. Consultation en cabinet ou téléconsultation vidéo. Simple, rapide et sécurisé.',
  keywords: [
    'rendez-vous médical',
    'médecin Abidjan',
    'spécialiste Côte d\'Ivoire',
    'téléconsultation',
    'MediRDV',
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${rethinkSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
