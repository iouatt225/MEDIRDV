'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Briefcase, CheckCircle, ShieldCheck, Stethoscope, User } from 'lucide-react';

import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { apiClient } from '@/lib/api/client';
import { registerDoctorSchema, registerPatientSchema, registerSecretarySchema } from '@/lib/validation/auth';

type Role = 'patient' | 'medecin' | 'secretaire';

const specialties = [
  { value: 'Cardiologie', label: 'Cardiologie' },
  { value: 'Pediatrie', label: 'Pediatrie' },
  { value: 'Dermatologie', label: 'Dermatologie' },
  { value: 'Neurologie', label: 'Neurologie' },
  { value: 'Medecine generale', label: 'Medecine generale' },
  { value: 'Gynecologie', label: 'Gynecologie' },
  { value: 'Ophtalmologie', label: 'Ophtalmologie' },
];

const availableLanguages = [
  { value: 'Francais', label: 'Francais' },
  { value: 'Anglais', label: 'Anglais' },
  { value: 'Dioula', label: 'Dioula' },
  { value: 'Baoule', label: 'Baoule' },
  { value: 'Senoufo', label: 'Senoufo' },
];

const roles = [
  { value: 'patient' as Role, label: 'Patient', description: 'Reserver et suivre mes consultations', icon: User },
  { value: 'medecin' as Role, label: 'Medecin', description: 'Publier mon profil et gerer mon agenda', icon: Stethoscope },
  { value: 'secretaire' as Role, label: 'Secretaire', description: 'Assister un praticien et organiser les RDV', icon: Briefcase },
];

export default function InscriptionPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<Role>('patient');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [phoneSecondary, setPhoneSecondary] = useState('');
  const [address, setAddress] = useState('');
  const [gdprConsent, setGdprConsent] = useState(false);
  const [specialty, setSpecialty] = useState('');
  const [cabinetName, setCabinetName] = useState('');
  const [doctorAddress, setDoctorAddress] = useState('');
  const [bio, setBio] = useState('');
  const [languages, setLanguages] = useState<string[]>([]);
  const [fee, setFee] = useState('');
  const [invitationCode, setInvitationCode] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const baseData = { first_name: firstName, last_name: lastName, phone, email, password };

  const handleNextStep = () => {
    setErrors({});
    if (step === 1) {
      setStep(2);
      return;
    }

    const fieldErrors: Record<string, string> = {};
    const result =
      role === 'patient'
        ? registerPatientSchema.safeParse({ ...baseData, gdpr_consent: true })
        : role === 'medecin'
          ? registerDoctorSchema.safeParse({
              ...baseData,
              specialty: 'Cardiologie',
              cabinet_name: 'Cabinet test',
              address: 'Adresse test',
              languages: ['Francais'],
              fee: '10000',
            })
          : registerSecretarySchema.safeParse(baseData);

    if (!result.success) {
      result.error.errors.forEach((error) => {
        const key = error.path[0] as string | undefined;
        if (key && ['first_name', 'last_name', 'phone', 'email', 'password'].includes(key)) {
          fieldErrors[key] = error.message;
        }
      });
    }

    if (Object.keys(fieldErrors).length) {
      setErrors(fieldErrors);
      return;
    }

    setStep(3);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrors({});
    setServerError(null);

    const payload =
      role === 'patient'
        ? {
            role,
            ...baseData,
            email: email || undefined,
            date_of_birth: dateOfBirth || undefined,
            phone_secondary: phoneSecondary || undefined,
            address: address || undefined,
            gdpr_consent: gdprConsent,
          }
        : role === 'medecin'
          ? {
              role,
              ...baseData,
              email: email || undefined,
              specialty,
              cabinet_name: cabinetName,
              address: doctorAddress,
              bio: bio || undefined,
              languages,
              fee,
            }
          : {
              role,
              ...baseData,
              email: email || undefined,
              invitation_code: invitationCode || undefined,
            };

    const validation =
      role === 'patient'
        ? registerPatientSchema.safeParse(payload)
        : role === 'medecin'
          ? registerDoctorSchema.safeParse(payload)
          : registerSecretarySchema.safeParse(payload);

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
      await apiClient.post('/api/v1/auth/register', payload);
      router.push('/connexion?registered=true');
    } catch (error: unknown) {
      const typedError = error as { message?: string };
      setServerError(typedError.message || "Une erreur est survenue lors de l'inscription.");
    } finally {
      setLoading(false);
    }
  };

  const toggleLanguage = (language: string) => {
    setLanguages((current) => (current.includes(language) ? current.filter((item) => item !== language) : [...current, language]));
  };

  return (
    <div className="min-h-screen bg-linear-to-b/oklch from-teal-100 via-white to-white pt-32 pb-16">
      <div className="mx-auto grid max-w-[85rem] gap-8 px-4 sm:px-6 lg:grid-cols-[420px_1fr] lg:px-8">
        <aside className="space-y-5">
          <Badge className="bg-white!">Creation de compte</Badge>
          <h1 className="text-4xl font-semibold text-slate-900 md:text-5xl">Un espace adapte a chaque role.</h1>
          <p className="text-lg leading-8 text-slate-700">
            Patient, medecin ou secretaire: l'inscription garde les donnees propres et directement exploitables par le back.
          </p>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-accent">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Progression</p>
                <p className="text-xs text-slate-500">Etape {step} sur 3</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((item) => (
                <div key={item} className={`h-2 rounded-full ${item <= step ? 'bg-accent' : 'bg-slate-100'}`} />
              ))}
            </div>
          </div>
        </aside>

        <Card hoverable={false} className="border border-slate-200 bg-white p-6 shadow-card lg:p-8">
          <div className="mb-8 flex items-center justify-between border-b border-slate-200 pb-5">
            <div>
              <p className="text-sm font-semibold text-accent">MediRDV CI</p>
              <h2 className="mt-1 text-3xl font-bold text-slate-900">Inscription</h2>
            </div>
            <Badge variant="info" dot={false}>
              Etape {step}/3
            </Badge>
          </div>

          {serverError ? <div className="mb-6 rounded-lg border border-error bg-error/10 p-4 text-center text-sm text-error">{serverError}</div> : null}

          {step === 1 && (
            <div>
              <h3 className="mb-5 text-xl font-bold text-slate-900">Choisissez votre profil</h3>
              <div className="grid gap-4 md:grid-cols-3">
                {roles.map((item) => {
                  const IconComponent = item.icon;
                  const active = role === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setRole(item.value)}
                      className={`cursor-pointer rounded-xl border p-5 text-left transition-colors ${
                        active ? 'border-accent bg-teal-50 text-slate-900' : 'border-slate-200 bg-white text-slate-700 hover:border-accent hover:bg-teal-50'
                      }`}
                    >
                      <IconComponent className={`mb-5 h-8 w-8 ${active ? 'text-accent' : 'text-slate-500'}`} />
                      <span className="block font-bold">{item.label}</span>
                      <span className="mt-2 block text-sm leading-5 text-slate-600">{item.description}</span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-8 flex justify-end">
                <Button onClick={handleNextStep}>Continuer</Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <h3 className="text-xl font-bold text-slate-900">Informations personnelles</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="Prenom" placeholder="Ex: Kouassi" value={firstName} onChange={(event) => setFirstName(event.target.value)} error={errors.first_name} />
                <Input label="Nom" placeholder="Ex: Koffi" value={lastName} onChange={(event) => setLastName(event.target.value)} error={errors.last_name} />
              </div>
              <Input label="Telephone" type="tel" placeholder="Ex: +2250708091011" value={phone} onChange={(event) => setPhone(event.target.value)} error={errors.phone} />
              <Input label="Email optionnel" type="email" placeholder="Ex: nom@domaine.ci" value={email} onChange={(event) => setEmail(event.target.value)} error={errors.email} />
              <Input label="Mot de passe" type="password" placeholder="********" value={password} onChange={(event) => setPassword(event.target.value)} error={errors.password} />
              <StepActions back={() => setStep(1)} next={handleNextStep} />
            </div>
          )}

          {step === 3 && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <h3 className="text-xl font-bold text-slate-900">Completer le profil</h3>
              {role === 'patient' && (
                <>
                  <Input label="Date de naissance" type="date" value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} error={errors.date_of_birth} />
                  <Input label="Telephone secondaire" type="tel" placeholder="Autre numero" value={phoneSecondary} onChange={(event) => setPhoneSecondary(event.target.value)} error={errors.phone_secondary} />
                  <Input label="Adresse" placeholder="Ex: Cocody, Abidjan" value={address} onChange={(event) => setAddress(event.target.value)} error={errors.address} />
                  <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                    <input type="checkbox" checked={gdprConsent} onChange={(event) => setGdprConsent(event.target.checked)} className="mt-0.5 h-5 w-5 accent-accent" />
                    <span>J'accepte la collecte des donnees necessaires a la gestion de mes rendez-vous medicaux.</span>
                  </label>
                  {errors.gdpr_consent ? <p className="text-sm font-medium text-error">{errors.gdpr_consent}</p> : null}
                </>
              )}

              {role === 'medecin' && (
                <>
                  <Select label="Specialite" options={specialties} value={specialty} onChange={(event) => setSpecialty(event.target.value)} error={errors.specialty} />
                  <Input label="Nom du cabinet" placeholder="Ex: Clinique des Deux Plateaux" value={cabinetName} onChange={(event) => setCabinetName(event.target.value)} error={errors.cabinet_name} />
                  <Input label="Adresse du cabinet" placeholder="Ex: Boulevard Latrille, Cocody" value={doctorAddress} onChange={(event) => setDoctorAddress(event.target.value)} error={errors.address} />
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-900">Langues parlees</label>
                    <div className="flex flex-wrap gap-2">
                      {availableLanguages.map((language) => {
                        const active = languages.includes(language.value);
                        return (
                          <button
                            key={language.value}
                            type="button"
                            onClick={() => toggleLanguage(language.value)}
                            className={`cursor-pointer rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                              active ? 'border-accent bg-accent text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-accent hover:bg-teal-50'
                            }`}
                          >
                            {active ? <CheckCircle className="mr-1 inline h-3.5 w-3.5" /> : null}
                            {language.label}
                          </button>
                        );
                      })}
                    </div>
                    {errors.languages ? <p className="mt-1 text-sm font-medium text-error">{errors.languages}</p> : null}
                  </div>
                  <Input label="Tarif consultation FCFA" type="number" placeholder="Ex: 15000" value={fee} onChange={(event) => setFee(event.target.value)} error={errors.fee} />
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-900">Biographie courte</label>
                    <textarea
                      rows={4}
                      placeholder="Presentez votre parcours..."
                      value={bio}
                      onChange={(event) => setBio(event.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                    />
                    {errors.bio ? <p className="mt-1 text-sm font-medium text-error">{errors.bio}</p> : null}
                  </div>
                </>
              )}

              {role === 'secretaire' && (
                <>
                  <Input label="Code invitation medecin" placeholder="Ex: SEC-123456" value={invitationCode} onChange={(event) => setInvitationCode(event.target.value)} error={errors.invitation_code} />
                  <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                    Le code invitation permet de rattacher directement votre compte a l'agenda du medecin. Vous pouvez aussi le renseigner plus tard.
                  </p>
                </>
              )}

              <div className="flex justify-between pt-4">
                <Button type="button" variant="secondary" onClick={() => setStep(2)}>
                  Retour
                </Button>
                <Button type="submit" loading={loading}>
                  Finaliser
                </Button>
              </div>
            </form>
          )}

          <div className="mt-8 border-t border-slate-200 pt-6 text-center">
            <p className="text-sm text-slate-600">
              Deja inscrit ?{' '}
              <Link href="/connexion" className="font-semibold text-accent hover:text-accent-dark">
                Se connecter
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

function StepActions({ back, next }: { back: () => void; next: () => void }) {
  return (
    <div className="flex justify-between pt-4">
      <Button variant="secondary" onClick={back}>
        Retour
      </Button>
      <Button onClick={next}>Continuer</Button>
    </div>
  );
}
