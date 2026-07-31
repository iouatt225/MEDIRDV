'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import {
  registerPatientSchema,
  registerDoctorSchema,
  registerSecretarySchema,
} from '@/lib/validation/auth';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import { User, Stethoscope, Briefcase } from 'lucide-react';

type Role = 'patient' | 'medecin' | 'secretaire';

const specialties = [
  { value: 'Cardiologie', label: 'Cardiologie' },
  { value: 'Pédiatrie', label: 'Pédiatrie' },
  { value: 'Dermatologie', label: 'Dermatologie' },
  { value: 'Neurologie', label: 'Neurologie' },
  { value: 'Médecine générale', label: 'Médecine générale' },
  { value: 'Gynécologie', label: 'Gynécologie' },
  { value: 'Ophtalmologie', label: 'Ophtalmologie' },
];

const availableLanguages = [
  { value: 'Français', label: 'Français' },
  { value: 'Anglais', label: 'Anglais' },
  { value: 'Dioula', label: 'Dioula' },
  { value: 'Baoulé', label: 'Baoulé' },
  { value: 'Sénoufo', label: 'Sénoufo' },
];

export default function InscriptionPage() {
  const router = useRouter();

  // Multi-step state
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<Role>('patient');

  // Form Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Patient Specific
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [phoneSecondary, setPhoneSecondary] = useState('');
  const [address, setAddress] = useState('');
  const [gdprConsent, setGdprConsent] = useState(false);

  // Doctor Specific
  const [specialty, setSpecialty] = useState('');
  const [cabinetName, setCabinetName] = useState('');
  const [doctorAddress, setDoctorAddress] = useState('');
  const [bio, setBio] = useState('');
  const [languages, setLanguages] = useState<string[]>([]);
  const [fee, setFee] = useState('');

  // Secretary Specific
  const [invitationCode, setInvitationCode] = useState('');

  // Error States
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Next Step Action
  const handleNextStep = () => {
    setErrors({});
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      // Validate common fields
      const partialData = { first_name: firstName, last_name: lastName, phone, email, password };
      // Check validation schema depending on role to see if common fields pass
      const fieldErrors: Record<string, string> = {};

      if (role === 'patient') {
        const check = registerPatientSchema.safeParse({
          ...partialData,
          gdpr_consent: true, // Bypass for step 2 check
        });
        if (!check.success) {
          check.error.errors.forEach((err) => {
            if (err.path[0] && ['first_name', 'last_name', 'phone', 'email', 'password'].includes(err.path[0] as string)) {
              fieldErrors[err.path[0] as string] = err.message;
            }
          });
        }
      } else if (role === 'medecin') {
        const check = registerDoctorSchema.safeParse({
          ...partialData,
          specialty: 'Cardiologie', // Mock fields for step 2 check
          cabinet_name: 'Mock Cabinet',
          address: 'Mock Address',
          languages: ['Français'],
          fee: '10000',
        });
        if (!check.success) {
          check.error.errors.forEach((err) => {
            if (err.path[0] && ['first_name', 'last_name', 'phone', 'email', 'password'].includes(err.path[0] as string)) {
              fieldErrors[err.path[0] as string] = err.message;
            }
          });
        }
      } else if (role === 'secretaire') {
        const check = registerSecretarySchema.safeParse(partialData);
        if (!check.success) {
          check.error.errors.forEach((err) => {
            if (err.path[0]) {
              fieldErrors[err.path[0] as string] = err.message;
            }
          });
        }
      }

      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
        return;
      }

      setStep(3);
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setServerError(null);

    const baseData = {
      role,
      first_name: firstName,
      last_name: lastName,
      phone,
      email: email || undefined,
      password,
    };

    let finalPayload: Record<string, unknown> = {};
    let validationResult;

    if (role === 'patient') {
      finalPayload = {
        ...baseData,
        date_of_birth: dateOfBirth || undefined,
        phone_secondary: phoneSecondary || undefined,
        address: address || undefined,
        gdpr_consent: gdprConsent,
      };
      validationResult = registerPatientSchema.safeParse(finalPayload);
    } else if (role === 'medecin') {
      finalPayload = {
        ...baseData,
        specialty,
        cabinet_name: cabinetName,
        address: doctorAddress,
        bio: bio || undefined,
        languages,
        fee,
      };
      validationResult = registerDoctorSchema.safeParse(finalPayload);
    } else if (role === 'secretaire') {
      finalPayload = {
        ...baseData,
        invitation_code: invitationCode || undefined,
      };
      validationResult = registerSecretarySchema.safeParse(finalPayload);
    }

    if (validationResult && !validationResult.success) {
      const fieldErrors: Record<string, string> = {};
      validationResult.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/api/v1/auth/register', finalPayload);
      router.push('/connexion?registered=true');
    } catch (err: unknown) {
      const error = err as { message?: string };
      setServerError(error.message || 'Une erreur est survenue lors de l\'inscription.');
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageToggle = (lang: string) => {
    if (languages.includes(lang)) {
      setLanguages(languages.filter((l) => l !== lang));
    } else {
      setLanguages([...languages, lang]);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-brand-light relative px-4 py-12"
    >
      <div className="absolute inset-0 bg-brand-light/70 backdrop-blur-sm" />

      <Card
        hoverable={false}
        variant="light"
        className="w-full max-w-2xl relative z-10 p-8 lg:p-12 bg-white/60 border border-tertiary/20 backdrop-blur-md rounded-pluxes shadow-card-hover"
      >
        {/* Progress header */}
        <div className="flex justify-between items-center mb-8 border-b border-tertiary/20 pb-4">
          <h1 className="text-2xl lg:text-3xl font-bold text-tertiary">Inscription</h1>
          <Badge variant="info" dot={false}>
            Étape {step} sur 3
          </Badge>
        </div>

        {serverError && (
          <div className="mb-6 p-4 rounded bg-error/10 border border-error text-error text-sm text-center">
            {serverError}
          </div>
        )}

        {/* STEP 1: Role selection */}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-bold text-tertiary text-center mb-6">Choisissez votre profil</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <button
                type="button"
                onClick={() => setRole('patient')}
                className={`flex flex-col items-center justify-center p-6 rounded-pluxes-sm border transition-all duration-300 ${
                  role === 'patient'
                    ? 'border-tertiary bg-tertiary/10 text-tertiary'
                    : 'border-tertiary/20 bg-transparent text-tertiary opacity-70 hover:opacity-100 hover:border-tertiary/40'
                }`}
              >
                <User className="w-10 h-10 mb-3" />
                <span className="font-bold text-base">Patient</span>
              </button>

              <button
                type="button"
                onClick={() => setRole('medecin')}
                className={`flex flex-col items-center justify-center p-6 rounded-pluxes-sm border transition-all duration-300 ${
                  role === 'medecin'
                    ? 'border-tertiary bg-tertiary/10 text-tertiary'
                    : 'border-tertiary/20 bg-transparent text-tertiary opacity-70 hover:opacity-100 hover:border-tertiary/40'
                }`}
              >
                <Stethoscope className="w-10 h-10 mb-3" />
                <span className="font-bold text-base">Médecin</span>
              </button>

              <button
                type="button"
                onClick={() => setRole('secretaire')}
                className={`flex flex-col items-center justify-center p-6 rounded-pluxes-sm border transition-all duration-300 ${
                  role === 'secretaire'
                    ? 'border-tertiary bg-tertiary/10 text-tertiary'
                    : 'border-tertiary/20 bg-transparent text-tertiary opacity-70 hover:opacity-100 hover:border-tertiary/40'
                }`}
              >
                <Briefcase className="w-10 h-10 mb-3" />
                <span className="font-bold text-base">Secrétaire</span>
              </button>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleNextStep}>Continuer</Button>
            </div>
          </div>
        )}

        {/* STEP 2: Common basic fields */}
        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-tertiary mb-4">Informations personnelles</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                variant="light"
                label="Prénom"
                placeholder="Ex: Kouassi"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                error={errors.first_name}
              />
              <Input
                variant="light"
                label="Nom"
                placeholder="Ex: Koffi"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                error={errors.last_name}
              />
            </div>

            <Input
              variant="light"
              label="Téléphone"
              type="tel"
              placeholder="Ex: +225 0708091011"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              error={errors.phone}
            />

            <Input
              variant="light"
              label="Email (optionnel)"
              type="email"
              placeholder="Ex: nom@domaine.ci"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
            />

            <Input
              variant="light"
              label="Mot de passe"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
            />

            <div className="flex justify-between mt-8">
              <Button variant="secondary" className="border-tertiary! text-tertiary! hover:bg-tertiary/10!" onClick={() => setStep(1)}>
                Retour
              </Button>
              <Button onClick={handleNextStep}>Continuer</Button>
            </div>
          </div>
        )}

        {/* STEP 3: Role-specific details */}
        {step === 3 && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <h2 className="text-xl font-bold text-tertiary mb-4">Complétez votre profil</h2>

            {/* Patient Fields */}
            {role === 'patient' && (
              <div className="space-y-6">
                <Input
                  variant="light"
                  label="Date de naissance"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  error={errors.date_of_birth}
                />

                <Input
                  variant="light"
                  label="Téléphone secondaire (optionnel)"
                  type="tel"
                  placeholder="Autre numéro"
                  value={phoneSecondary}
                  onChange={(e) => setPhoneSecondary(e.target.value)}
                  error={errors.phone_secondary}
                />

                <Input
                  variant="light"
                  label="Adresse"
                  placeholder="Ex: Cocody, Abidjan"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  error={errors.address}
                />

                <div className="flex items-start gap-3 mt-4">
                  <input
                    type="checkbox"
                    id="gdpr_consent"
                    checked={gdprConsent}
                    onChange={(e) => setGdprConsent(e.target.checked)}
                    className="w-5 h-5 rounded border-tertiary/20 bg-white/60 text-accent accent-accent mt-0.5 focus:ring-0 focus:outline-none"
                  />
                  <label htmlFor="gdpr_consent" className="text-sm text-tertiary opacity-80 leading-normal">
                    J&apos;accepte la collecte de mes données personnelles nécessaires à la gestion de mes rendez-vous médicaux.
                  </label>
                </div>
                {errors.gdpr_consent && (
                  <p className="text-sm font-medium text-error mt-1">{errors.gdpr_consent}</p>
                )}
              </div>
            )}

            {/* Doctor Fields */}
            {role === 'medecin' && (
              <div className="space-y-6">
                <Select
                  variant="light"
                  label="Spécialité"
                  placeholder="Sélectionner une spécialité"
                  options={specialties}
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  error={errors.specialty}
                />

                <Input
                  variant="light"
                  label="Nom du cabinet"
                  placeholder="Ex: Clinique des Deux Plateaux"
                  value={cabinetName}
                  onChange={(e) => setCabinetName(e.target.value)}
                  error={errors.cabinet_name}
                />

                <Input
                  variant="light"
                  label="Adresse du cabinet"
                  placeholder="Ex: Boulevard Latrille, Cocody"
                  value={doctorAddress}
                  onChange={(e) => setDoctorAddress(e.target.value)}
                  error={errors.address}
                />

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-tertiary">Langues parlées</label>
                  <div className="flex flex-wrap gap-2">
                    {availableLanguages.map((lang) => {
                      const isSelected = languages.includes(lang.value);
                      return (
                        <button
                          key={lang.value}
                          type="button"
                          onClick={() => handleLanguageToggle(lang.value)}
                          className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all duration-200 ${
                            isSelected
                              ? 'bg-accent border-accent text-white'
                              : 'border-tertiary/20 bg-transparent text-tertiary opacity-70 hover:opacity-100 hover:border-tertiary/40'
                          }`}
                        >
                          {lang.label}
                        </button>
                      );
                    })}
                  </div>
                  {errors.languages && (
                    <p className="text-sm font-medium text-error mt-1">{errors.languages}</p>
                  )}
                </div>

                <Input
                  variant="light"
                  label="Tarif consultation (FCFA)"
                  type="number"
                  placeholder="Ex: 15000"
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                  error={errors.fee}
                />

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-tertiary">Biographie courte</label>
                  <textarea
                    rows={4}
                    placeholder="Présentez votre parcours..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full text-base font-normal leading-[1.25em] rounded-pluxes-xs px-5 py-5 bg-white/60 border-tertiary/20 outline-none text-tertiary placeholder:text-tertiary placeholder:opacity-40 focus:ring-accent"
                  />
                  {errors.bio && (
                    <p className="text-sm font-medium text-error mt-1">{errors.bio}</p>
                  )}
                </div>
              </div>
            )}

            {/* Secretary Fields */}
            {role === 'secretaire' && (
              <div className="space-y-6">
                <Input
                  variant="light"
                  label="Code d'invitation médecin (optionnel)"
                  placeholder="Ex: SEC-123456"
                  value={invitationCode}
                  onChange={(e) => setInvitationCode(e.target.value)}
                  error={errors.invitation_code}
                />
                <p className="text-xs text-tertiary opacity-60 leading-relaxed">
                  Le code d&apos;invitation permet de rattacher directement votre compte à l&apos;agenda du médecin. Vous pouvez aussi le renseigner ultérieurement.
                </p>
              </div>
            )}

            <div className="flex justify-between mt-8">
              <Button variant="secondary" className="border-tertiary! text-tertiary! hover:bg-tertiary/10!" onClick={() => setStep(2)}>
                Retour
              </Button>
              <Button type="submit" loading={loading}>
                Finaliser l&apos;inscription
              </Button>
            </div>
          </form>
        )}

        <div className="mt-8 pt-6 border-t border-tertiary/20 text-center">
          <p className="text-tertiary opacity-70 text-sm">
            Déjà inscrit ?{' '}
            <Link
              href="/connexion"
              className="font-semibold text-accent hover:text-accent-light transition-colors"
            >
              Se connecter
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
