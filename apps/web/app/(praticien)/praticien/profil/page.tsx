'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BadgeCheck,
  Clock3,
  Globe2,
  Landmark,
  Mail,
  MapPin,
  PenLine,
  Phone,
  Sparkles,
  Stethoscope,
  UserRound,
  Upload,
  X,
} from 'lucide-react';

import RequireRole from '@/components/auth/RequireRole';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import { apiClient } from '@/lib/api/client';
import { Doctor } from '@/types/doctor';

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

function splitLanguages(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function PraticienProfilPage() {
  const queryClient = useQueryClient();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [cabinetName, setCabinetName] = useState('');
  const [address, setAddress] = useState('');
  const [bio, setBio] = useState('');
  const [languages, setLanguages] = useState('');
  const [fee, setFee] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [delay, setDelay] = useState(24);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const { data: me, isLoading: isMeLoading } = useQuery<DoctorMeResponse>({
    queryKey: ['me-profile'],
    queryFn: () => apiClient.get('/api/v1/users/me'),
  });

  const { data: publicDoctor, isLoading: isPublicLoading } = useQuery<Doctor>({
    queryKey: ['public-doctor-profile', me?.id],
    queryFn: () => apiClient.get(`/api/v1/doctors/${me?.id}`),
    enabled: Boolean(me?.id),
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    if (!me) return;

    setFirstName(me.first_name || '');
    setLastName(me.last_name || '');
    setEmail(me.email || '');
    setPhone(me.phone || '');

    if (me.doctor_profile) {
      setSpecialty(me.doctor_profile.specialty || '');
      setCabinetName(me.doctor_profile.cabinet_name || '');
      setAddress(me.doctor_profile.address || '');
      setBio(me.doctor_profile.bio || '');
      setLanguages(me.doctor_profile.languages?.join(', ') || '');
      setFee(me.doctor_profile.fee?.toString() || '');
      setPhotoUrl(me.doctor_profile.photo_url || '');
      setLatitude(me.doctor_profile.latitude?.toString() || '');
      setLongitude(me.doctor_profile.longitude?.toString() || '');
      setDelay(me.doctor_profile.cancellation_delay_hours ?? 24);
    }
  }, [me]);

  useEffect(() => {
    return () => {
      if (photoPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      let finalPhotoUrl = photoUrl || undefined;

      if (photoFile) {
        const formData = new FormData();
        formData.append('photo', photoFile);
        const uploadRes = await apiClient.post<{ photo_url: string }>('/api/v1/users/me/photo', formData);
        finalPhotoUrl = uploadRes.photo_url;
        setPhotoUrl(uploadRes.photo_url);
        setPhotoPreview(uploadRes.photo_url);
        setPhotoFile(null);
      }

      await apiClient.put('/api/v1/users/me', {
        first_name: firstName,
        last_name: lastName,
        email: email || undefined,
        phone: phone || undefined,
        specialty,
        cabinet_name: cabinetName,
        address,
        bio: bio || undefined,
        languages: splitLanguages(languages),
        fee: fee ? Number.parseFloat(fee) : undefined,
        photo_url: finalPhotoUrl,
        latitude: latitude ? Number.parseFloat(latitude) : undefined,
        longitude: longitude ? Number.parseFloat(longitude) : undefined,
      });

      if (me?.doctor_profile) {
        await apiClient.put(`/api/v1/doctors/${me.id}/settings`, {
          cancellation_delay_hours: Number(delay),
        });
      }
    },
    onSuccess: async () => {
      setSuccessMsg('Profil mis à jour avec succès.');
      setErrorMsg(null);
      await queryClient.invalidateQueries({ queryKey: ['me-profile'] });
      await queryClient.invalidateQueries({ queryKey: ['public-doctor-profile', me?.id] });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    onError: (err: unknown) => {
      const error = err as { message?: string };
      setErrorMsg(error.message || 'Impossible d’enregistrer les modifications.');
      setSuccessMsg(null);
    },
  });

  const removeAvatarMutation = useMutation({
    mutationFn: async () => apiClient.delete('/api/v1/users/me/photo'),
    onSuccess: async () => {
      if (photoPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(photoPreview);
      }
      setPhotoUrl('');
      setPhotoFile(null);
      setPhotoPreview(null);
      if (photoInputRef.current) {
        photoInputRef.current.value = '';
      }
      setSuccessMsg('Photo de profil supprimée avec succès.');
      setErrorMsg(null);
      await queryClient.invalidateQueries({ queryKey: ['me-profile'] });
      await queryClient.invalidateQueries({ queryKey: ['public-doctor-profile', me?.id] });
      await queryClient.invalidateQueries({ queryKey: ['doctor', me?.id] });
    },
    onError: (err: unknown) => {
      const error = err as { message?: string };
      setErrorMsg(error.message || 'Impossible de supprimer la photo de profil.');
      setSuccessMsg(null);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate();
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (!file) {
      return;
    }

    if (photoPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreview);
    }

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const clearPhotoSelection = () => {
    if (photoPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoFile(null);
    setPhotoPreview(null);
    if (photoInputRef.current) {
      photoInputRef.current.value = '';
    }
  };

  const languagesPreview = useMemo(
    () => splitLanguages(languages).slice(0, 6),
    [languages]
  );

  const isLoading = isMeLoading || isPublicLoading;

  return (
    <RequireRole allowedRoles={['medecin']}>
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(0,168,188,0.14),_transparent_26%),linear-gradient(180deg,_#eef9fc_0%,_#f8fcfd_100%)] px-4 pb-16 pt-28 lg:px-8">
        <div className="mx-auto max-w-[1440px] space-y-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.35em] text-accent">
                <Sparkles className="h-3.5 w-3.5" />
                Espace médecin
              </div>
              <h1 className="mt-4 text-3xl font-extrabold text-primary lg:text-5xl">
                Gérer mon profil
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-text lg:text-base">
                Modifiez vos informations publiques, votre cabinet et votre présentation. Les changements sont repris sur votre fiche médecin.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/praticien/parametres">
                <Button variant="secondary">Paramètres de consultation</Button>
              </Link>
              <Link href="/praticien/profil/public">
                <Button variant="secondary">Voir ma fiche publique</Button>
              </Link>
            </div>
          </div>

          {successMsg && (
            <div className="rounded-3xl border border-success/20 bg-success/10 p-4 text-sm font-medium text-success">
              <BadgeCheck className="mr-2 inline h-4 w-4" />
              {successMsg}
            </div>
          )}

          {errorMsg && (
            <div className="rounded-3xl border border-error/20 bg-error/10 p-4 text-sm font-medium text-error">
              {errorMsg}
            </div>
          )}

          {isLoading ? (
            <div className="flex min-h-[45vh] items-center justify-center">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-accent border-t-transparent" />
            </div>
          ) : (
            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <Card hoverable={false} className="border border-white/70 bg-white/85 p-8 shadow-[0_24px_80px_rgba(8,54,59,0.12)]">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <section className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
                        <UserRound className="h-6 w-6" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-primary">Identité du compte</h2>
                        <p className="text-sm text-text/70">Ces informations servent pour vos patients et vos notifications.</p>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <Input label="Prénom" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                      <Input label="Nom" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <Input
                        label="E-mail"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                      <Input
                        label="Téléphone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                  </section>

                  <section className="space-y-4 rounded-[28px] border border-divider bg-secondary/30 p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Landmark className="h-6 w-6" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-primary">Cabinet et consultation</h2>
                        <p className="text-sm text-text/70">Les informations visibles dans la fiche publique et la réservation.</p>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <Input label="Spécialité" value={specialty} onChange={(e) => setSpecialty(e.target.value)} required />
                      <Input label="Nom du cabinet" value={cabinetName} onChange={(e) => setCabinetName(e.target.value)} required />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <Input label="Tarif consultation (FCFA)" type="number" value={fee} onChange={(e) => setFee(e.target.value)} />
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-primary">Photo de profil</label>
                        <div className="rounded-pluxes-xs border border-divider bg-white p-4">
                          <div className="flex items-center gap-4">
                            <Avatar
                              src={photoPreview || photoUrl || publicDoctor?.photo_url}
                              alt={`${firstName || me?.first_name || ''} ${lastName || me?.last_name || ''}`}
                              size="md"
                              className="border border-divider shadow-sm"
                            />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-primary">Téléverser une image réelle</p>
                              <p className="text-xs text-text/65">PNG, JPG, JPEG ou WEBP. L’aperçu se met à jour avant l’enregistrement.</p>
                            </div>
                          </div>
                          <div className="mt-4 flex flex-wrap gap-3">
                            <button
                              type="button"
                              onClick={() => photoInputRef.current?.click()}
                              className="inline-flex items-center gap-2 rounded-pluxes-btn bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-95"
                            >
                              <Upload className="h-4 w-4" />
                              Choisir un fichier
                            </button>
                            <button
                              type="button"
                              onClick={clearPhotoSelection}
                              className="inline-flex items-center gap-2 rounded-pluxes-btn border border-divider bg-white px-4 py-2.5 text-sm font-semibold text-primary transition hover:bg-secondary"
                            >
                              <X className="h-4 w-4" />
                              Effacer
                            </button>
                            <button
                              type="button"
                              onClick={() => removeAvatarMutation.mutate()}
                              disabled={removeAvatarMutation.isPending || (!photoUrl && !photoPreview && !publicDoctor?.photo_url)}
                              className="inline-flex items-center gap-2 rounded-pluxes-btn border border-error/30 bg-error/10 px-4 py-2.5 text-sm font-semibold text-error transition hover:bg-error/15 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Supprimer l'avatar
                            </button>
                          </div>
                          <input
                            ref={photoInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/webp"
                            onChange={handlePhotoChange}
                            className="hidden"
                          />
                          {photoFile ? (
                            <p className="mt-3 text-xs text-text/60">
                              Fichier sélectionné: <span className="font-semibold text-primary">{photoFile.name}</span>
                            </p>
                          ) : null}
                        </div>
                        <div className="mt-3">
                          <Input
                            label="URL publique de secours (optionnelle)"
                            value={photoUrl}
                            onChange={(e) => setPhotoUrl(e.target.value)}
                            placeholder="https://..."
                          />
                        </div>
                      </div>
                    </div>

                    <Input label="Adresse complète" value={address} onChange={(e) => setAddress(e.target.value)} required />

                    <div className="grid gap-4 md:grid-cols-2">
                      <Input label="Latitude" value={latitude} onChange={(e) => setLatitude(e.target.value)} />
                      <Input label="Longitude" value={longitude} onChange={(e) => setLongitude(e.target.value)} />
                    </div>
                  </section>

                  <section className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-info/10 text-info">
                        <PenLine className="h-6 w-6" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-primary">Présentation publique</h2>
                        <p className="text-sm text-text/70">Décrivez votre pratique, votre approche et vos langues de consultation.</p>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-primary">Langues parlées</label>
                        <Input
                          value={languages}
                          onChange={(e) => setLanguages(e.target.value)}
                          placeholder="Français, Anglais, Dioula"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-primary">Délai d&apos;annulation</label>
                        <select
                          value={delay}
                          onChange={(e) => setDelay(Number(e.target.value))}
                          className="h-[58px] w-full rounded-pluxes-xs border border-divider bg-white px-5 text-base text-primary outline-none focus:border-accent"
                        >
                          <option value={2}>2 heures</option>
                          <option value={4}>4 heures</option>
                          <option value={12}>12 heures</option>
                          <option value={24}>24 heures</option>
                          <option value={48}>48 heures</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-primary">Biographie</label>
                      <textarea
                        rows={6}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        className="w-full rounded-pluxes-xs border border-divider px-5 py-4 text-base leading-6 text-primary outline-none focus:border-accent"
                        placeholder="Parlez de votre expertise, de votre approche et de votre expérience..."
                      />
                    </div>
                  </section>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button type="submit" loading={saveMutation.isPending} fullWidth>
                      Enregistrer le profil
                    </Button>
                    <Link href="/praticien/parametres" className="sm:w-auto">
                      <Button variant="secondary" fullWidth>
                        Ajuster les règles
                      </Button>
                    </Link>
                  </div>
                </form>
              </Card>

              <div className="space-y-6">
                <Card hoverable={false} className="overflow-hidden border border-white/70 bg-white/85 p-0 shadow-[0_24px_80px_rgba(8,54,59,0.12)]">
                  <div className="bg-[linear-gradient(135deg,_rgba(8,145,178,0.18),_rgba(34,211,238,0.10))] p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-white/75 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.25em] text-accent">
                          Aperçu public
                        </div>
                        <h2 className="text-2xl font-extrabold text-primary">
                          {firstName || me?.first_name} {lastName || me?.last_name}
                        </h2>
                        <p className="text-sm text-text/75">
                          {specialty || me?.doctor_profile?.specialty || 'Spécialité non renseignée'}
                        </p>
                      </div>
                        <Avatar
                          src={photoPreview || photoUrl || publicDoctor?.photo_url}
                          alt={`${firstName || me?.first_name || ''} ${lastName || me?.last_name || ''}`}
                          size="lg"
                          className="h-20 w-20 border border-white/80 shadow-lg"
                        />
                    </div>
                  </div>

                  <div className="space-y-4 p-6">
                    <div className="rounded-3xl bg-secondary/50 p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.3em] text-text/50">Cabinet</p>
                      <p className="mt-2 text-base font-semibold text-primary">{cabinetName || 'Cabinet non renseigné'}</p>
                      <p className="mt-1 flex items-start gap-2 text-sm text-text/75">
                        <MapPin className="mt-0.5 h-4 w-4 text-accent" />
                        {address || 'Adresse non renseignée'}
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-3xl border border-divider bg-white p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.3em] text-text/50">Tarif</p>
                        <p className="mt-2 text-lg font-bold text-primary">
                          {fee ? `${Number.parseFloat(fee).toLocaleString('fr-FR')} FCFA` : 'Sur demande'}
                        </p>
                      </div>
                      <div className="rounded-3xl border border-divider bg-white p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.3em] text-text/50">Annulation</p>
                        <p className="mt-2 text-lg font-bold text-primary">{delay}h à l&apos;avance</p>
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-bold uppercase tracking-[0.3em] text-text/50">Langues</p>
                      <div className="flex flex-wrap gap-2">
                        {(languagesPreview.length ? languagesPreview : ['Non renseigné']).map((lang) => (
                          <Badge key={lang} variant="default" dot={false}>
                            {lang}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-3xl border border-divider bg-white p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                        <Stethoscope className="h-4 w-4 text-accent" />
                        Biographie
                      </div>
                      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-text/75">
                        {bio || 'Ajoutez une biographie pour rassurer vos patients et mieux expliquer votre pratique.'}
                      </p>
                    </div>

                    {publicDoctor?.upcoming_availabilities?.length ? (
                      <div className="rounded-3xl border border-divider bg-white p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.3em] text-text/50">Prochains créneaux</p>
                        <div className="mt-3 space-y-2">
                          {publicDoctor.upcoming_availabilities.slice(0, 3).map((slot) => (
                            <div key={slot} className="flex items-center gap-2 rounded-2xl bg-secondary/60 px-3 py-2 text-sm text-primary">
                              <Clock3 className="h-4 w-4 text-accent" />
                              {new Intl.DateTimeFormat('fr-FR', {
                                weekday: 'short',
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              }).format(new Date(slot))}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-3xl border border-divider bg-white p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.3em] text-text/50">E-mail</p>
                        <p className="mt-2 flex items-center gap-2 text-sm text-primary">
                          <Mail className="h-4 w-4 text-accent" />
                          {email || 'Non renseigné'}
                        </p>
                      </div>
                      <div className="rounded-3xl border border-divider bg-white p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.3em] text-text/50">Téléphone</p>
                        <p className="mt-2 flex items-center gap-2 text-sm text-primary">
                          <Phone className="h-4 w-4 text-accent" />
                          {phone || 'Non renseigné'}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card hoverable={false} className="border border-white/70 bg-white/85 p-6 shadow-card">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-info/10 text-info">
                      <Globe2 className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-primary">Visibilité publique</h3>
                      <p className="text-sm text-text/70">Ce que les patients verront sur votre fiche.</p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2 text-sm text-text/75">
                    <p>• Nom affiché: {firstName || me?.first_name} {lastName || me?.last_name}</p>
                    <p>• Spécialité: {specialty || 'Non renseignée'}</p>
                    <p>• Cabinet: {cabinetName || 'Non renseigné'}</p>
                    <p>• Adresse: {address || 'Non renseignée'}</p>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
    </RequireRole>
  );
}
