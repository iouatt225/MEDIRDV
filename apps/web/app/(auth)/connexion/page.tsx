'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/useAuthStore';
import { apiClient } from '@/lib/api/client';
import { loginSchema } from '@/lib/validation/auth';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';

import { Suspense } from 'react';

function ConnexionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useAuthStore((state) => state.login);

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Checks if redirected due to session expiration
  const expired = searchParams.get('expired') === 'true';
  const redirect = searchParams.get('redirect') || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setServerError(null);

    // Validate inputs with Zod
    const validation = loginSchema.safeParse({ phone, password });
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
          role: 'patient' | 'medecin' | 'secretaire';
          first_name: string;
          last_name: string;
        };
      }
      const res = await apiClient.post<LoginResponse>('/api/v1/auth/login', { phone, password });
      
      // Store credentials in Zustand
      login(res.access_token, {
        id: res.user.id,
        role: res.user.role,
        first_name: res.user.first_name,
        last_name: res.user.last_name,
      });

      // Redirect based on role or search parameter
      if (redirect) {
        router.push(decodeURIComponent(redirect));
      } else if (res.user.role === 'medecin') {
        router.push('/praticien/dashboard');
      } else if (res.user.role === 'secretaire') {
        router.push('/praticien/dashboard'); // Both share the praticien space
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
      className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat relative px-4 py-12"
      style={{ backgroundImage: "url('/images/hero-bg-image.jpg')" }}
    >

      <Card
        hoverable={false}
        variant="light"
        className="w-full max-w-lg relative z-10 p-8 lg:p-12 bg-white/60 border border-tertiary/20 backdrop-blur-md rounded-pluxes shadow-card-hover"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-tertiary mb-2">Connexion</h1>
          <p className="text-tertiary opacity-70">Ravi de vous revoir sur MediRDV CI</p>
        </div>

        {expired && (
          <div className="mb-6 p-4 rounded bg-error/10 border border-error text-error text-sm text-center">
            Votre session a expiré. Veuillez vous reconnecter.
          </div>
        )}

        {serverError && (
          <div className="mb-6 p-4 rounded bg-error/10 border border-error text-error text-sm text-center">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            variant="light"
            label="Numéro de téléphone"
            type="tel"
            placeholder="Ex: +225 0708091011"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            error={errors.phone}
            className="text-tertiary placeholder:text-tertiary placeholder:opacity-40"
          />

          <Input
            variant="light"
            label="Mot de passe"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            className="text-tertiary placeholder:text-tertiary placeholder:opacity-40"
          />

          <div className="flex justify-end">
            <Link
              href="/mot-de-passe-oublie"
              className="text-sm font-semibold text-accent hover:text-accent-light transition-colors"
            >
              Mot de passe oublié ?
            </Link>
          </div>

          <Button type="submit" fullWidth loading={loading}>
            Se connecter
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-tertiary/20 text-center">
          <p className="text-tertiary opacity-70 text-sm">
            Nouveau sur la plateforme ?{' '}
            <Link
              href="/inscription"
              className="font-semibold text-accent hover:text-accent-light transition-colors"
            >
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
        <div className="min-h-screen flex items-center justify-center bg-brand-light">
          <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ConnexionForm />
    </Suspense>
  );
}

