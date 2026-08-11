'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import { apiClient } from '@/lib/api/client';
import { loginSchema } from '@/lib/validation/auth';
import { useAuthStore } from '@/stores/useAuthStore';

function ConnexionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useAuthStore((state) => state.login);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const expired = searchParams.get('expired') === 'true';
  const redirect = searchParams.get('redirect') || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setServerError(null);

    const validation = loginSchema.safeParse({ identifier, password });
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
      interface LoginResponse {
        access_token: string;
        user: {
          id: string;
          role: 'patient' | 'medecin' | 'secretaire' | 'admin';
          first_name: string;
          last_name: string;
          email: string | null;
        };
      }

      const res = await apiClient.post<LoginResponse>('/api/v1/auth/login', { identifier, password });

      login(res.access_token, {
        id: res.user.id,
        role: res.user.role,
        first_name: res.user.first_name,
        last_name: res.user.last_name,
      });

      if (redirect) {
        router.push(decodeURIComponent(redirect));
      } else if (res.user.role === 'admin') {
        router.push('/admin/dashboard');
      } else if (res.user.role === 'medecin' || res.user.role === 'secretaire') {
        router.push('/praticien/dashboard');
      } else {
        router.push('/patient/rendez-vous');
      }
    } catch (err: unknown) {
      const error = err as { message?: string };
      setServerError(error.message || 'Une erreur est survenue lors de la connexion.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative flex min-h-screen items-center justify-center bg-cover bg-center bg-no-repeat px-4 py-12"
      style={{ backgroundImage: "url('/images/hero-bg-image.jpg')" }}
    >
      <Card
        hoverable={false}
        variant="secondary"
        className="relative z-10 w-full max-w-lg rounded-pluxes border border-tertiary/20 bg-white/60 p-8 shadow-card-hover backdrop-blur-md lg:p-12"
      >
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold text-tertiary lg:text-4xl">Connexion</h1>
          <p className="text-tertiary/70">Ravi de vous revoir sur MediRDV CI</p>
        </div>

        {expired ? (
          <div className="mb-6 rounded border border-error bg-error/10 p-4 text-center text-sm text-error">
            Votre session a expiré. Veuillez vous reconnecter.
          </div>
        ) : null}

        {serverError ? (
          <div className="mb-6 rounded border border-error bg-error/10 p-4 text-center text-sm text-error">
            {serverError}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            variant="light"
            label="Téléphone ou e-mail"
            type="text"
            placeholder="Ex: +225 0708091011 ou nom@domaine.com"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            error={errors.identifier}
            className="text-tertiary placeholder:text-tertiary placeholder:opacity-40"
          />

          <Input
            variant="light"
            label="Mot de passe"
            type="password"
            placeholder="********"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            className="text-tertiary placeholder:text-tertiary placeholder:opacity-40"
          />

          <div className="flex justify-end">
            <Link
              href="/mot-de-passe-oublie"
              className="text-sm font-semibold text-accent transition-colors hover:text-accent-light"
            >
              Mot de passe oublié ?
            </Link>
          </div>

          <Button type="submit" fullWidth loading={loading}>
            Se connecter
          </Button>
        </form>

        <div className="mt-8 border-t border-tertiary/20 pt-6 text-center">
          <p className="text-sm text-tertiary/70">
            Nouveau sur la plateforme ?{' '}
            <Link href="/inscription" className="font-semibold text-accent transition-colors hover:text-accent-light">
              Créer un compte
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}

export default function ConnexionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-brand-light">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-transparent" />
        </div>
      }
    >
      <ConnexionForm />
    </Suspense>
  );
}
