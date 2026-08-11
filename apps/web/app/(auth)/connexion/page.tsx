'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { Activity, ArrowRight, LockKeyhole, ShieldCheck } from 'lucide-react';

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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrors({});
    setServerError(null);

    const validation = loginSchema.safeParse({ identifier, password });
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.errors.forEach((error) => {
        if (error.path[0]) fieldErrors[error.path[0] as string] = error.message;
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

      const normalizedIdentifier = identifier.trim();
      const response = await apiClient.post<LoginResponse>('/api/v1/auth/login', {
        identifier: normalizedIdentifier,
        phone: normalizedIdentifier,
        email: normalizedIdentifier.includes('@') ? normalizedIdentifier : undefined,
        password,
      });
      login(response.access_token, {
        id: response.user.id,
        role: response.user.role,
        first_name: response.user.first_name,
        last_name: response.user.last_name,
      });

      if (redirect) {
        router.push(decodeURIComponent(redirect));
      } else if (response.user.role === 'admin') {
        router.push('/admin/dashboard');
      } else if (response.user.role === 'medecin' || response.user.role === 'secretaire') {
        router.push('/praticien/dashboard');
      } else {
        router.push('/patient/rendez-vous');
      }
    } catch (error: unknown) {
      const typedError = error as { message?: string };
      setServerError(typedError.message || 'Une erreur est survenue lors de la connexion.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-b/oklch from-teal-100 via-white to-white pt-32 pb-16">
      <div className="mx-auto grid max-w-[85rem] gap-8 px-4 sm:px-6 lg:grid-cols-[1fr_520px] lg:px-8">
        <div className="flex items-center">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-teal-700/15 bg-white/85 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
              <ShieldCheck className="h-4 w-4 text-accent" />
              Acces securise MediRDV
            </div>
            <h1 className="text-4xl font-semibold text-slate-900 md:text-6xl">
              Connectez-vous a votre espace medical.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-700">
              Retrouvez vos rendez-vous, vos disponibilites, vos patients ou votre tableau de bord depuis une interface claire.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                { label: 'Roles', value: '4' },
                { label: 'Canal', value: 'Email' },
                { label: 'Securite', value: 'JWT' },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
                  <p className="text-xs font-semibold uppercase text-slate-500">{item.label}</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Card hoverable={false} className="border border-slate-200 bg-white p-6 shadow-card lg:p-8">
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-accent">Authentification</p>
              <h2 className="mt-2 text-3xl font-bold text-slate-900">Connexion</h2>
              <p className="mt-2 text-sm text-slate-600">Telephone ou e-mail, selon votre compte.</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-teal-50 text-accent">
              <LockKeyhole className="h-5 w-5" />
            </div>
          </div>

          {expired ? <Alert message="Votre session a expire. Veuillez vous reconnecter." /> : null}
          {serverError ? <Alert message={serverError} /> : null}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Telephone ou e-mail"
              type="text"
              placeholder="Ex: +2250708091011 ou nom@domaine.com"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              error={errors.identifier}
            />
            <Input
              label="Mot de passe"
              type="password"
              placeholder="********"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              error={errors.password}
            />

            <div className="flex justify-end">
              <Link href="/mot-de-passe-oublie" className="text-sm font-semibold text-accent hover:text-accent-dark">
                Mot de passe oublie ?
              </Link>
            </div>

            <Button type="submit" fullWidth loading={loading}>
              Se connecter
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <div className="mt-8 border-t border-slate-200 pt-6 text-center">
            <p className="text-sm text-slate-600">
              Nouveau sur la plateforme ?{' '}
              <Link href="/inscription" className="font-semibold text-accent hover:text-accent-dark">
                Creer un compte
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Alert({ message }: { message: string }) {
  return <div className="mb-6 rounded-lg border border-error bg-error/10 p-4 text-center text-sm text-error">{message}</div>;
}

export default function ConnexionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-secondary">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-transparent" />
        </div>
      }
    >
      <ConnexionForm />
    </Suspense>
  );
}
