'use client';

import { FormEvent, Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Activity, ArrowLeft, ArrowRight, Calendar, MapPin, Navigation, Search as SearchIcon, SlidersHorizontal } from 'lucide-react';

import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { apiClient } from '@/lib/api/client';
import { Doctor, SearchDoctorsResponse } from '@/types/doctor';

const specialties = [
  { value: '', label: 'Toutes les specialites' },
  { value: 'Cardiologie', label: 'Cardiologie' },
  { value: 'Pediatrie', label: 'Pediatrie' },
  { value: 'Dermatologie', label: 'Dermatologie' },
  { value: 'Neurologie', label: 'Neurologie' },
  { value: 'Medecine generale', label: 'Medecine generale' },
  { value: 'Gynecologie', label: 'Gynecologie' },
  { value: 'Ophtalmologie', label: 'Ophtalmologie' },
];

function formatSlotTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatSlotDay(isoString: string): string {
  return new Date(isoString).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}

function SearchForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [specialty, setSpecialty] = useState(searchParams.get('specialty') || '');
  const [city, setCity] = useState(searchParams.get('city') || '');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [geoActive, setGeoActive] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setSpecialty(searchParams.get('specialty') || '');
    setCity(searchParams.get('city') || '');
    setPage(Number(searchParams.get('page')) || 1);
  }, [searchParams]);

  const { data, isLoading, isError } = useQuery<SearchDoctorsResponse>({
    queryKey: ['doctors', specialty, city, lat, lng, page],
    queryFn: () => {
      const params: Record<string, string> = {
        page: page.toString(),
        per_page: '6',
      };
      if (specialty) params.specialty = specialty;
      if (city) params.city = city;
      if (lat && lng && geoActive) {
        params.lat = lat.toString();
        params.lng = lng.toString();
        params.radius = '20';
      }
      return apiClient.get('/api/v1/doctors', { params });
    },
    staleTime: 30 * 1000,
  });

  const handleGeolocation = () => {
    if (!navigator.geolocation) {
      alert("La geolocalisation n'est pas supportee par votre navigateur.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude);
        setLng(position.coords.longitude);
        setGeoActive(true);
        setCity('');
      },
      () => {
        alert('Impossible de recuperer votre position. Veuillez saisir une ville manuellement.');
      }
    );
  };

  const handleSearchSubmit = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    const newParams = new URLSearchParams();
    if (specialty) newParams.set('specialty', specialty);
    if (city) newParams.set('city', city);
    newParams.set('page', '1');
    router.push(`/recherche?${newParams.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set('page', newPage.toString());
    router.push(`/recherche?${newParams.toString()}`);
  };

  return (
    <div className="min-h-screen bg-linear-to-b/oklch from-teal-100 via-white to-white pt-32 pb-20">
      <div className="mx-auto max-w-[85rem] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-4xl text-left sm:text-center">
          <Badge className="mb-4 bg-white!">Recherche medicale</Badge>
          <h1 className="text-4xl font-semibold text-slate-900 md:text-6xl">Trouvez le bon praticien avec une lecture data.</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-700">
            Filtrez les medecins, comparez les disponibilites et lancez une reservation depuis une interface plus lisible.
          </p>
        </div>

        <div className="mb-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-accent">
                <SlidersHorizontal className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Filtres de recherche</p>
                <p className="text-xs text-slate-500">Specialite, ville ou position</p>
              </div>
            </div>
            <div className="hidden items-center gap-2 rounded-lg bg-teal-50 px-3 py-2 text-xs font-semibold text-accent md:flex">
              <Activity className="h-4 w-4" />
              {data?.total ?? 0} resultats
            </div>
          </div>

          <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 gap-4 p-5 md:grid-cols-12 md:items-end">
            <div className="md:col-span-4">
              <Select label="Specialite" options={specialties} value={specialty} onChange={(event) => setSpecialty(event.target.value)} name="specialty" />
            </div>
            <div className="md:col-span-4">
              <Input
                label="Ville / Commune"
                placeholder="Ex: Cocody, Abidjan"
                value={city}
                onChange={(event) => {
                  setCity(event.target.value);
                  setGeoActive(false);
                }}
                name="city"
              />
            </div>
            <div className="md:col-span-2">
              <Button type="button" variant={geoActive ? 'primary' : 'secondary'} onClick={handleGeolocation} fullWidth className="h-[58px]">
                <Navigation className={`h-4 w-4 ${geoActive ? 'animate-pulse' : ''}`} />
                {geoActive ? 'Active' : 'Position'}
              </Button>
            </div>
            <div className="md:col-span-2">
              <Button type="submit" fullWidth className="h-[58px]">
                <SearchIcon className="h-4 w-4" />
                Rechercher
              </Button>
            </div>
          </form>
        </div>

        {isLoading && (
          <div className="flex justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-transparent" />
          </div>
        )}

        {isError && (
          <div className="mb-8 rounded-xl border border-error bg-error/10 p-6 text-center text-error">
            Une erreur est survenue lors de la recuperation des medecins. Veuillez reessayer.
          </div>
        )}

        {data && (
          <div>
            {data.doctors.length === 0 ? (
              <Card hoverable={false} className="border border-dashed border-slate-300 bg-white py-16 text-center text-slate-500">
                Aucun medecin ne correspond a vos criteres.
              </Card>
            ) : (
              <div className="mb-8 grid grid-cols-1 gap-4">
                {data.doctors.map((doctor: Doctor) => (
                  <DoctorResult key={doctor.id} doctor={doctor} router={router} />
                ))}
              </div>
            )}

            {data.total > 0 && (
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm text-slate-600">
                  Resultats {(page - 1) * 6 + 1} a {Math.min(page * 6, data.total)} sur {data.total}
                </p>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => handlePageChange(page - 1)}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="secondary" size="sm" disabled={page * 6 >= data.total} onClick={() => handlePageChange(page + 1)}>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DoctorResult({ doctor, router }: { doctor: Doctor; router: ReturnType<typeof useRouter> }) {
  return (
    <Card hoverable={false} className="border border-slate-200 bg-white p-5">
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex gap-4">
          <Avatar src={doctor.photo_url} alt={`${doctor.first_name} ${doctor.last_name}`} size="lg" className="border border-slate-200 shadow-sm" />
          <div>
            <p className="text-sm font-semibold text-accent">{doctor.specialty}</p>
            <h3 className="mt-1 text-xl font-bold text-slate-900">
              Dr. {doctor.first_name} {doctor.last_name}
            </h3>
            <p className="mt-3 flex items-center gap-1.5 text-sm text-slate-600">
              <MapPin className="h-4 w-4 flex-shrink-0 text-accent" />
              {doctor.cabinet_name} - {doctor.address}
            </p>
            <p className="mt-2 text-sm font-medium text-slate-900">
              Tarif : <span className="font-bold text-accent">{parseFloat(doctor.fee).toLocaleString()} FCFA</span>
            </p>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <h4 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-slate-900">
            <Calendar className="h-4 w-4 text-accent" />
            Prochaines disponibilites
          </h4>

          {doctor.upcoming_availabilities?.length ? (
            <div className="mb-4 grid grid-cols-2 gap-2">
              {doctor.upcoming_availabilities.slice(0, 4).map((slot) => (
                <button
                  key={slot}
                  onClick={() => {
                    const endDate = new Date(slot);
                    endDate.setMinutes(endDate.getMinutes() + 30);
                    router.push(
                      `/reservation/confirmation?doctor_id=${doctor.user_id}&slot_start=${encodeURIComponent(slot)}&slot_end=${encodeURIComponent(
                        endDate.toISOString()
                      )}&type=presentiel`
                    );
                  }}
                  className="cursor-pointer rounded-lg border border-slate-200 bg-slate-50 p-2 text-center text-xs font-semibold text-slate-900 transition-colors hover:border-accent hover:bg-teal-50"
                >
                  <span className="mb-0.5 block text-[10px] text-slate-500">{formatSlotDay(slot)}</span>
                  {formatSlotTime(slot)}
                </button>
              ))}
            </div>
          ) : (
            <p className="mb-4 text-xs italic text-slate-500">Pas de disponibilites en ligne actuellement.</p>
          )}

          <Link href={`/medecins/${doctor.user_id}`} className="block">
            <Button fullWidth size="sm">
              Voir la fiche profil
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}

export default function RecherchePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-secondary">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-transparent" />
        </div>
      }
    >
      <SearchForm />
    </Suspense>
  );
}
