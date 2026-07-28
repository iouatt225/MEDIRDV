'use client';

import { useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import { resetPasswordRequestSchema } from '@/lib/validation/auth';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';

export default function MotDePasseOubliePage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate email
    const validation = resetPasswordRequestSchema.safeParse({ email });
    if (!validation.success) {
      setError(validation.error.errors[0]?.message || 'Email invalide.');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/api/v1/auth/reset-password', { email });
      setSuccess(true);
    } catch (err: unknown) {
      const error = err as { message?: string };
      // Show generic success anyway to prevent enumeration, or catch errors
      setError(error.message || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-primary bg-cover bg-center relative px-4 py-12"
      style={{ backgroundImage: "url('/images/hero-bg-image.jpg')" }}
    >
      <div className="absolute inset-0 bg-primary/70 backdrop-blur-sm" />

      <Card
        hoverable={false}
        variant="dark"
        className="w-full max-w-lg relative z-10 p-8 lg:p-12 bg-primary/80 border border-divider-dark backdrop-blur-md rounded-pluxes shadow-card-hover text-center"
      >
        <h1 className="text-3xl font-bold text-white mb-4">Mot de passe oublié</h1>
        
        {success ? (
          <div className="space-y-6">
            <p className="text-white/80 leading-relaxed">
              Si cette adresse e-mail est associée à un compte, un lien de réinitialisation vous a été envoyé.
            </p>
            <p className="text-xs text-white/50">
              Veuillez vérifier votre boîte de réception ainsi que vos courriers indésirables (spams).
            </p>
            <div className="pt-4">
              <Button onClick={() => window.location.href = '/connexion'}>
                Retour à la connexion
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-white/60 mb-8">
              Saisissez votre adresse email pour recevoir un lien de réinitialisation.
            </p>

            {error && (
              <div className="mb-6 p-4 rounded bg-error/10 border border-error text-error text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6 text-left">
              <Input
                variant="dark"
                label="Adresse email"
                type="email"
                placeholder="Ex: nom@domaine.ci"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <Button type="submit" fullWidth loading={loading}>
                Envoyer le lien
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-divider-dark">
              <Link
                href="/connexion"
                className="font-semibold text-accent hover:text-accent-light transition-colors text-sm"
              >
                Retour à la connexion
              </Link>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
