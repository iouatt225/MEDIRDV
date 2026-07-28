'use client';

import { use, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Calendar as CalendarIcon, Clock, ArrowLeft, Video, Building } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { Doctor } from '@/types/doctor';
import { ConsultationType } from '@/types/appointments';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import { Tabs } from '@/components/ui/Tabs';

export default function DoctorReserverPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  // Selected consultation type
  const [type, setType] = useState<ConsultationType>('presentiel');

  // Compute date range for 7 days
  const dateRange = useMemo(() => {
    const fromDate = new Date();
    // Midnight today
    fromDate.setHours(0, 0, 0, 0);

    const toDate = new Date();
    toDate.setDate(fromDate.getDate() + 7);
    toDate.setHours(23, 59, 59, 999);

    return {
      fromStr: fromDate.toISOString(),
      toStr: toDate.toISOString(),
    };
  }, []);

  // Fetch doctor profile details
  const { data: doctor, isLoading: isDoctorLoading } = useQuery<Doctor>({
    queryKey: ['doctor', id],
    queryFn: () => apiClient.get(`/api/v1/doctors/${id}`),
  });

  // Fetch available slots from backend
  const { data: slots, isLoading: isSlotsLoading, refetch } = useQuery<string[]>({
    queryKey: ['availability', id, dateRange.fromStr, dateRange.toStr],
    queryFn: () =>
      apiClient.get(`/api/v1/doctors/${id}/availability`, {
        params: {
          from: dateRange.fromStr,
          to: dateRange.toStr,
        },
      }),
    staleTime: 30 * 1000, // Strict 30s TTL cache for slots freshness
    refetchOnMount: true,
  });

  // Group slots by day
  const groupedSlots = useMemo(() => {
    if (!slots) return {};
    const groups: Record<string, string[]> = {};
    
    slots.forEach((slotStr) => {
      const dateKey = slotStr.split('T')[0];
      if (dateKey) {
        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(slotStr);
      }
    });

    return groups;
  }, [slots]);

  // Generate date tabs array
  const dayTabs = useMemo(() => {
    const tabs = [];
    const current = new Date();
    
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(current.getDate() + i);
      const dateStr = date.toISOString().split('T')[0] || '';
      
      const labelDay = date.toLocaleDateString('fr-FR', { weekday: 'short' });
      const labelDate = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
      
      tabs.push({
        dateStr,
        label: `${labelDay} ${labelDate}`,
      });
    }

    return tabs;
  }, []);

  const [activeTabDate, setActiveTabDate] = useState(dayTabs[0]?.dateStr || '');

  const activeDaySlots = activeTabDate ? groupedSlots[activeTabDate] || [] : [];

  const handleSlotSelect = (slotStart: string) => {
    const startDate = new Date(slotStart);
    const endDate = new Date(startDate.getTime() + 30 * 60000); // 30 minutes duration

    router.push(
      `/reservation/confirmation?doctor_id=${id}&slot_start=${encodeURIComponent(
        slotStart
      )}&slot_end=${encodeURIComponent(endDate.toISOString())}&type=${type}`
    );
  };

  const isLoading = isDoctorLoading || isSlotsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary">
        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="pt-28 pb-16 min-h-screen bg-secondary">
      <div className="max-w-[1000px] mx-auto px-4">
        {/* Back link */}
        <Link
          href={`/medecins/${id}`}
          className="inline-flex items-center gap-2 text-primary hover:text-accent font-semibold mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Fiche du médecin
        </Link>

        {/* Doctor Header Card */}
        {doctor && (
          <Card hoverable={false} className="mb-6 p-6 bg-white border border-divider">
            <div className="flex gap-4 items-center">
              <Avatar
                src={doctor.photo_url}
                alt={`${doctor.first_name} ${doctor.last_name}`}
                size="md"
                className="border border-divider shadow-xs"
              />
              <div>
                <span className="text-xs font-bold text-accent uppercase">{doctor.specialty}</span>
                <h1 className="text-xl font-bold text-primary">
                  Prendre RDV avec le Dr. {doctor.first_name} {doctor.last_name}
                </h1>
                <p className="text-sm text-text/80">{doctor.cabinet_name} — {doctor.address}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Type Selection & Refresh */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Consultation Type Selector */}
          <Card hoverable={false} className="md:col-span-2 p-6 bg-white border border-divider flex items-center justify-between">
            <span className="font-bold text-primary">Type de consultation :</span>
            <div className="flex gap-2">
              <button
                onClick={() => setType('presentiel')}
                className={`px-4 py-2.5 rounded-pluxes-sm text-sm font-semibold flex items-center gap-2 border transition-all cursor-pointer ${
                  type === 'presentiel'
                    ? 'bg-accent border-accent text-white'
                    : 'border-divider bg-transparent text-text hover:text-primary'
                }`}
              >
                <Building className="w-4 h-4" />
                Cabinet
              </button>
              <button
                onClick={() => setType('video')}
                className={`px-4 py-2.5 rounded-pluxes-sm text-sm font-semibold flex items-center gap-2 border transition-all cursor-pointer ${
                  type === 'video'
                    ? 'bg-accent border-accent text-white'
                    : 'border-divider bg-transparent text-text hover:text-primary'
                }`}
              >
                <Video className="w-4 h-4" />
                Vidéo
              </button>
            </div>
          </Card>

          {/* Refresh Info */}
          <Card hoverable={false} className="p-6 bg-white border border-divider flex items-center justify-between md:justify-center gap-3">
            <span className="text-xs text-text/60 text-center">
              Mise à jour automatique des créneaux
            </span>
            <Button size="sm" variant="ghost" className="text-accent!" onClick={() => refetch()}>
              Actualiser
            </Button>
          </Card>
        </div>

        {/* Available slots picker */}
        <Card hoverable={false} className="p-6 bg-white border border-divider">
          <div className="flex items-center gap-2 border-b border-divider pb-4 mb-6">
            <CalendarIcon className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-bold text-primary">Sélectionnez un créneau horaire</h2>
          </div>

          {/* Day selection tabs */}
          <Tabs defaultTab={activeTabDate}>
            <div className="border-b border-divider overflow-x-auto">
              <div className="flex gap-1 min-w-max pb-2">
                {dayTabs.map((tab) => {
                  const isActive = activeTabDate === tab.dateStr;
                  const hasSlots = groupedSlots[tab.dateStr]?.length > 0;

                  return (
                    <button
                      key={tab.dateStr}
                      onClick={() => setActiveTabDate(tab.dateStr)}
                      className={`px-4 py-3 text-sm font-bold flex flex-col items-center rounded-pluxes-sm border transition-all cursor-pointer ${
                        isActive
                          ? 'border-accent bg-accent/10 text-accent'
                          : 'border-transparent bg-transparent text-text hover:text-primary'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span className={`text-[10px] mt-1 font-semibold ${hasSlots ? 'text-success' : 'text-text/40'}`}>
                        {hasSlots ? `${groupedSlots[tab.dateStr]?.length} créneaux` : 'Indisponible'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Slots Grid */}
            <div className="pt-6">
              {activeDaySlots.length === 0 ? (
                <div className="py-12 text-center text-text/60 italic border border-dashed border-divider rounded-pluxes-sm bg-secondary/30">
                  Aucune disponibilité en ligne pour cette journée.
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {activeDaySlots.map((slot) => {
                    const timeStr = formatSlotTime(slot);

                    return (
                      <button
                        key={slot}
                        onClick={() => handleSlotSelect(slot)}
                        className="py-3 px-2 text-center border border-divider rounded-pluxes-sm hover:border-accent hover:bg-accent/10 hover:text-accent font-semibold transition-all text-primary flex flex-col items-center justify-center gap-1 cursor-pointer"
                      >
                        <Clock className="w-3.5 h-3.5 text-text/40" />
                        {timeStr}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}

function formatSlotTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
