'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Settings, Shield, Clock, Landmark, BadgeCheck } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import RequireRole from '@/components/auth/RequireRole';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';

interface DoctorMeResponse {
  id: string;
  role: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
  doctor_profile?: {
    specialty: string;
    cabinet_name: string;
    address: string;
    bio: string | null;
    languages: string[];
    fee: number | null;
    photo_url: string | null;
    cancellation_delay_hours: number;
    latitude: number | null;
    longitude: number | null;
  };
}

export default function PraticienParametresPage() {
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [cabinetName, setCabinetName] = useState('');
  const [address, setAddress] = useState('');
  const [fee, setFee] = useState('');
  const [bio, setBio] = useState('');
  const [delay, setDelay] = useState(24);

  // Fetch current user details
  const { data: me, isLoading } = useQuery<DoctorMeResponse>({
    queryKey: ['me-settings'],
    queryFn: () => apiClient.get('/api/v1/users/me'),
  });

  // Sync form state
  useEffect(() => {
    if (me) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFirstName(me.first_name || '');
      setLastName(me.last_name || '');
      setEmail(me.email || '');
      if (me.doctor_profile) {
        setSpecialty(me.doctor_profile.specialty || '');
        setCabinetName(me.doctor_profile.cabinet_name || '');
        setAddress(me.doctor_profile.address || '');
        setFee(me.doctor_profile.fee?.toString() || '');
        setBio(me.doctor_profile.bio || '');
        setDelay(me.doctor_profile.cancellation_delay_hours ?? 24);
      }
    }
  }, [me]);

  // Mutations to save changes
  const saveMutation = useMutation({
    mutationFn: async () => {
      // 1. Save general settings & profile
      await apiClient.put('/api/v1/users/me', {
        first_name: firstName,
        last_name: lastName,
        email: email || undefined,
        specialty,
        cabinet_name: cabinetName,
        address,
        fee: parseFloat(fee) || undefined,
        bio: bio || undefined,
      });

      // 2. Save cancellation settings
      if (me?.doctor_profile) {
        await apiClient.put(`/api/v1/doctors/${me.id}/settings`, {
          cancellation_delay_hours: Number(delay),
        });
      }
    },
    onSuccess: () => {
      setSuccessMsg('Paramètres mis à jour avec succès.');
      window.scrollTo(0, 0);
    },
    onError: (err: unknown) => {
      const error = err as { message?: string };
      setErrorMsg(error.message || 'Impossible d\'enregistrer les modifications.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);
    saveMutation.mutate();
  };

  return (
    <RequireRole allowedRoles={['medecin']}>
      <div className="pt-28 pb-16 min-h-screen bg-secondary">
        <div className="max-w-[800px] mx-auto px-4">
          
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
              <Settings className="w-8 h-8 text-accent" />
              Paramètres du compte
            </h1>
            <p className="text-text mt-1">Gérez vos disponibilités, informations de cabinet et règles de prise de rendez-vous.</p>
          </div>

          {successMsg && (
            <div className="mb-6 p-4 rounded bg-success/10 border border-success text-success text-sm flex items-center gap-2">
              <BadgeCheck className="w-5 h-5" />
              {successMsg}
            </div>
          )}

          {errorMsg && (
            <div className="mb-6 p-4 rounded bg-error/10 border border-error text-error text-sm">
              {errorMsg}
            </div>
          )}

          {isLoading ? (
            <div className="py-20 flex justify-center">
              <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Profile Card */}
              <Card hoverable={false} className="p-6 bg-white border border-divider">
                <h2 className="text-lg font-bold text-primary mb-4 flex items-center gap-2 border-b border-divider pb-3">
                  <Shield className="w-5 h-5 text-accent" />
                  Informations personnelles
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Prénom"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    name="firstName"
                    required
                  />
                  <Input
                    label="Nom"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    name="lastName"
                    required
                  />
                </div>
                <div className="mt-4">
                  <Input
                    label="E-mail"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    name="email"
                  />
                </div>
              </Card>

              {/* Cabinet Settings */}
              <Card hoverable={false} className="p-6 bg-white border border-divider">
                <h2 className="text-lg font-bold text-primary mb-4 flex items-center gap-2 border-b border-divider pb-3">
                  <Landmark className="w-5 h-5 text-accent" />
                  Mon Cabinet & Consultation
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Nom du cabinet"
                    value={cabinetName}
                    onChange={(e) => setCabinetName(e.target.value)}
                    name="cabinetName"
                    required
                  />
                  <Input
                    label="Spécialité"
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    name="specialty"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <Input
                    label="Tarif consultation (FCFA)"
                    type="number"
                    value={fee}
                    onChange={(e) => setFee(e.target.value)}
                    name="fee"
                    required
                  />
                  <Input
                    label="Adresse complète"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    name="address"
                    required
                  />
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-semibold text-primary mb-2">Présentation / Biographie</label>
                  <textarea
                    rows={4}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full text-base font-normal leading-[1.25em] rounded-pluxes-xs px-5 py-5 border border-divider focus:border-accent outline-none text-primary placeholder:text-text/40 focus:ring-0"
                  />
                </div>
              </Card>

              {/* Rules & Policy */}
              <Card hoverable={false} className="p-6 bg-white border border-divider">
                <h2 className="text-lg font-bold text-primary mb-4 flex items-center gap-2 border-b border-divider pb-3">
                  <Clock className="w-5 h-5 text-accent" />
                  Règles d&apos;annulation
                </h2>
                <div>
                  <Select
                    label="Délai d'annulation minimum autorisé pour le patient"
                    options={[
                      { value: '2', label: '2 heures avant la consultation' },
                      { value: '4', label: '4 heures avant' },
                      { value: '12', label: '12 heures avant' },
                      { value: '24', label: '24 heures avant (recommandé)' },
                      { value: '48', label: '48 heures avant' },
                    ]}
                    value={delay.toString()}
                    onChange={(e) => setDelay(Number(e.target.value))}
                    name="delay"
                  />
                  <p className="text-xs text-text/60 mt-2 leading-relaxed">
                    Les patients ne pourront pas annuler ni modifier eux-mêmes leur rendez-vous passé ce délai.
                  </p>
                </div>
              </Card>

              <Button type="submit" fullWidth size="lg" loading={saveMutation.isPending}>
                Enregistrer les paramètres
              </Button>
            </form>
          )}
        </div>
      </div>
    </RequireRole>
  );
}
