'use client';

import Link from 'next/link';
import { useState, useEffect, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { MapPin, Navigation, Search as SearchIcon, Calendar, ArrowLeft, ArrowRight } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { SearchDoctorsResponse, Doctor } from '@/types/doctor';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';

const specialties = [
  { value: '', label: 'Toutes les spécialités' },
  { value: 'Cardiologie', label: 'Cardiologie' },
  { value: 'Pédiatrie', label: 'Pédiatrie' },
  { value: 'Dermatologie', label: 'Dermatologie' },
  { value: 'Neurologie', label: 'Neurologie' },
  { value: 'Médecine générale', label: 'Médecine générale' },
  { value: 'Gynécologie', label: 'Gynécologie' },
  { value: 'Ophtalmologie', label: 'Ophtalmologie' },
];

function formatSlotTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatSlotDay(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}

function SearchForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Search state
  const [specialty, setSpecialty] = useState(searchParams.get('specialty') || '');
  const [city, setCity] = useState(searchParams.get('city') || '');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [geoActive, setGeoActive] = useState(false);
  const [page, setPage] = useState(1);

  // Sync state with URL params
  useEffect(() => {
    const newSpecialty = searchParams.get('specialty') || '';
    const newCity = searchParams.get('city') || '';
    const newPage = Number(searchParams.get('page')) || 1;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSpecialty((prev) => (prev !== newSpecialty ? newSpecialty : prev));
    setCity((prev) => (prev !== newCity ? newCity : prev));
    setPage((prev) => (prev !== newPage ? newPage : prev));
  }, [searchParams]);

  // Geolocation Handler
  const handleGeolocation = () => {
    if (!navigator.geolocation) {
      alert('La géolocalisation n\'est pas supportée par votre navigateur.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude);
        setLng(position.coords.longitude);
        setGeoActive(true);
        setCity(''); // Clear city manual input when geolocated
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Impossible de récupérer votre position. Veuillez saisir une ville manuellement.');
      }
    );
  };

  // Fetch doctors list
  const { data, isLoading, isError } = useQuery<SearchDoctorsResponse>({
    queryKey: ['doctors', specialty, city, lat, lng, page],
    queryFn: async () => {
      const params: Record<string, string> = {
        page: page.toString(),
        per_page: '6',
      };
      if (specialty) params.specialty = specialty;
      if (city) params.city = city;
      if (lat && lng && geoActive) {
        params.lat = lat.toString();
        params.lng = lng.toString();
        params.radius = '20'; // 20km radius default
      }
      return apiClient.get('/api/v1/doctors', { params });
    },
    staleTime: 30 * 1000, // 30 seconds staleTime for slots freshness
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
    <div className="pt-28 pb-16 min-h-screen bg-secondary">
      <div className="max-w-[1300px] mx-auto px-4 lg:px-[15px]">
        {/* Page Title */}
        <div className="mb-8">
          <Badge className="mb-4">Prendre RDV</Badge>
          <h1 className="text-3xl lg:text-4xl font-bold text-primary">
            Trouver un médecin spécialiste
          </h1>
          <p className="text-text mt-1">Recherchez parmi nos praticiens partenaires en Côte d&apos;Ivoire.</p>
        </div>

        {/* Filters Card */}
        <Card hoverable={false} className="mb-8 p-6 bg-white border border-divider">
          <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-4">
              <Select
                label="Spécialité"
                options={specialties}
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                name="specialty"
              />
            </div>
            <div className="md:col-span-4">
              <Input
                label="Ville / Commune"
                placeholder="Ex: Cocody, Abidjan"
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  setGeoActive(false); // Disable geolocation search if text changes
                }}
                name="city"
              />
            </div>
            <div className="md:col-span-2 flex flex-col justify-end">
              <Button
                type="button"
                variant={geoActive ? 'primary' : 'secondary'}
                onClick={handleGeolocation}
                className="w-full flex items-center justify-center gap-2 h-[58px]"
                title="Utiliser ma position"
              >
                <Navigation className={`w-4 h-4 ${geoActive ? 'animate-pulse' : ''}`} />
                {geoActive ? 'Position active' : 'Géolocaliser'}
              </Button>
            </div>
            <div className="md:col-span-2">
              <Button type="submit" fullWidth className="h-[58px] flex items-center justify-center gap-2">
                <SearchIcon className="w-4 h-4" />
                Rechercher
              </Button>
            </div>
          </form>
        </Card>

        {/* Loading / Error States */}
        {isLoading && (
          <div className="py-20 flex justify-center">
            <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {isError && (
          <div className="p-6 rounded bg-error/10 border border-error text-error text-center mb-8">
            Une erreur est survenue lors de la récupération des médecins. Veuillez réessayer.
          </div>
        )}

        {/* Doctor Results */}
        {data && (
          <div>
            {data.doctors.length === 0 ? (
              <Card hoverable={false} className="py-16 text-center text-text/60 bg-white border border-divider">
                Aucun médecin trouvé correspondant à vos critères de recherche.
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-6 mb-8">
                {data.doctors.map((doctor: Doctor) => (
                  <Card key={doctor.id} hoverable={false} className="p-6 bg-white border border-divider">
                    <div className="flex flex-col lg:flex-row gap-6 justify-between">
                      {/* Doctor Info */}
                      <div className="flex gap-4 items-start">
                        <Avatar
                          src={doctor.photo_url}
                          alt={`${doctor.first_name} ${doctor.last_name}`}
                          size="lg"
                          className="border border-divider shadow-sm"
                        />
                        <div>
                          <p className="text-sm font-semibold text-accent mb-0.5">{doctor.specialty}</p>
                          <h3 className="text-xl font-bold text-primary mb-2">
                            Dr. {doctor.first_name} {doctor.last_name}
                          </h3>
                          <p className="text-sm text-text/80 flex items-center gap-1.5 mb-1">
                            <MapPin className="w-4 h-4 text-accent flex-shrink-0" />
                            {doctor.cabinet_name} — {doctor.address}
                          </p>
                          <p className="text-sm font-medium text-primary">
                            Tarif : <span className="text-accent font-bold">{parseFloat(doctor.fee).toLocaleString()} FCFA</span>
                          </p>
                        </div>
                      </div>

                      {/* Availabilities preview */}
                      <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-divider pt-4 lg:pt-0 lg:pl-6">
                        <h4 className="text-sm font-bold text-primary flex items-center gap-1.5 mb-3">
                          <Calendar className="w-4 h-4 text-accent" />
                          Prochaines disponibilités
                        </h4>

                        {doctor.upcoming_availabilities && doctor.upcoming_availabilities.length > 0 ? (
                          <div className="grid grid-cols-2 gap-2 mb-4">
                            {doctor.upcoming_availabilities.slice(0, 4).map((slot) => (
                              <button
                                key={slot}
                                onClick={() => {
                                  // Set slot end automatically to +30min
                                  const endDate = new Date(slot);
                                  endDate.setMinutes(endDate.getMinutes() + 30);
                                  router.push(
                                    `/reservation/confirmation?doctor_id=${doctor.user_id}&slot_start=${encodeURIComponent(
                                      slot
                                    )}&slot_end=${encodeURIComponent(
                                      endDate.toISOString()
                                    )}&type=presentiel`
                                  );
                                }}
                                className="p-2 text-center text-xs font-semibold rounded bg-secondary border border-divider hover:border-accent hover:bg-accent/10 transition-all text-primary cursor-pointer"
                              >
                                <span className="block text-[10px] text-text mb-0.5">
                                  {formatSlotDay(slot)}
                                </span>
                                {formatSlotTime(slot)}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-text/60 italic mb-4">
                            Pas de disponibilités en ligne actuellement.
                          </p>
                        )}

                        <Link href={`/medecins/${doctor.user_id}`} className="block">
                          <Button fullWidth size="sm">
                            Voir la fiche profil
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Pagination Controls */}
            {data.total > 0 && (
              <div className="flex justify-between items-center mt-6">
                <p className="text-sm text-text">
                  Résultats {(page - 1) * 6 + 1} à {Math.min(page * 6, data.total)} sur {data.total}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => handlePageChange(page - 1)}
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page * 6 >= data.total}
                    onClick={() => handlePageChange(page + 1)}
                  >
                    <ArrowRight className="w-4 h-4" />
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

export default function RecherchePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-secondary">
          <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <SearchForm />
    </Suspense>
  );
}
