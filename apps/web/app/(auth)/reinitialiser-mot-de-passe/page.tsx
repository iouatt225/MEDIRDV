'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { apiClient } from '@/lib/api/client';
import { resetPasswordConfirmSchema } from '@/lib/validation/auth';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';

import { Suspense } from 'react';

function ReinitialiserMotDePasseForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setServerError(null);

    if (!token) {
      setServerError('Le jeton de réinitialisation est manquant dans l\'URL.');
      return;
    }

    // Validate using Zod
    const validation = resetPasswordConfirmSchema.safeParse({
      new_password: newPassword,
      confirm_password: confirmPassword,
    });

    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/api/v1/auth/reset-password/confirm', {
        token,
        new_password: newPassword,
      });
      setSuccess(true);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setServerError(error.message || 'Le lien de réinitialisation est invalide ou expiré.');
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
        <h1 className="text-3xl font-bold text-white mb-4">Nouveau mot de passe</h1>

        {success ? (
          <div className="space-y-6">
            <p className="text-white/80 leading-relaxed">
              Votre mot de passe a été réinitialisé avec succès.
            </p>
            <div className="pt-4">
              <Button onClick={() => window.location.href = '/connexion'}>
                Se connecter
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-white/60 mb-8">
              Définissez votre nouveau mot de passe de connexion.
            </p>

            {serverError && (
              <div className="mb-6 p-4 rounded bg-error/10 border border-error text-error text-sm">
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6 text-left">
              <Input
                variant="dark"
                label="Nouveau mot de passe"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                error={errors.new_password}
              />

              <Input
                variant="dark"
                label="Confirmer le mot de passe"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={errors.confirm_password}
              />

              <Button type="submit" fullWidth loading={loading}>
                Enregistrer
              </Button>
            </form>
          </>
        )}
      </Card>
    </div>
  );
}

export default function ReinitialiserMotDePassePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-primary">
          <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ReinitialiserMotDePasseForm />
    </Suspense>
  );
}

