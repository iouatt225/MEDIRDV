'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CalendarCheck2,
  Clock3,
  History,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import { apiClient } from '@/lib/api/client';
import {
  AdminActionHistoryItem,
  AdminUserDetailResponse,
} from '@/types/admin';

function formatDateTime(value: string | null) {
  if (!value) return 'Date inconnue';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function roleLabel(role: string) {
  switch (role) {
    case 'admin':
      return 'Administrateur';
    case 'medecin':
      return 'Médecin';
    case 'secretaire':
      return 'Secrétaire';
    default:
      return 'Patient';
  }
}

function statusTone(status: string) {
  switch (status) {
    case 'confirme':
      return 'bg-success/10 text-success';
    case 'annule':
      return 'bg-error/10 text-error';
    case 'effectue':
      return 'bg-accent/10 text-accent';
    case 'manque':
      return 'bg-warning/10 text-warning';
    default:
      return 'bg-secondary text-primary';
  }
}

function statusLabel(status: string) {
  switch (status) {
    case 'confirme':
      return 'Confirmé';
    case 'annule':
      return 'Annulé';
    case 'effectue':
      return 'Effectué';
    case 'manque':
      return 'Manqué';
    default:
      return status;
  }
}

function actionLabel(action: AdminActionHistoryItem) {
  if (action.previous_is_active === action.new_is_active) {
    return 'Statut inchangé';
  }
  if (action.new_is_active) {
    return 'Réactivation';
  }
  return 'Désactivation';
}

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const userId = params?.id;

  const { data, isLoading, isError, refetch } = useQuery<AdminUserDetailResponse>({
    queryKey: ['admin-user-detail', userId],
    enabled: Boolean(userId),
    queryFn: () => apiClient.get(`/api/v1/admin/users/${userId}`),
  });

  const toggleMutation = useMutation({
    mutationFn: async (nextStatus: boolean) =>
      apiClient.patch(`/api/v1/admin/users/${userId}/status`, { is_active: nextStatus }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-user-detail', userId] });
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      setIsActionModalOpen(false);
    },
  });

  const [isActionModalOpen, setIsActionModalOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card hoverable={false} className="border border-error/20 bg-error/10 p-6 text-center">
        <p className="text-lg font-bold text-primary">Impossible de charger la fiche utilisateur</p>
        <Button className="mt-4" onClick={() => refetch()}>
          Réessayer
        </Button>
      </Card>
    );
  }

  const { user: target, stats, related_appointments, action_history, actions } = data;
  const canToggle = target.is_active ? actions.can_disable : actions.can_enable;
  const nextStatus = !target.is_active;
  const actionLabelText = nextStatus ? 'Réactiver' : 'Désactiver';

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[36px] border border-white/70 bg-white/80 p-6 shadow-[0_24px_80px_rgba(8,54,59,0.12)] backdrop-blur-xl lg:p-8">
        <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-4">
            <Link href="/admin/users" className="inline-flex items-center gap-2 text-sm font-semibold text-accent">
              <ArrowLeft className="h-4 w-4" />
              Retour à la liste
            </Link>
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.35em] text-accent">
              <Sparkles className="h-3.5 w-3.5" />
              Détail utilisateur
            </div>
            <h1 className="text-3xl font-extrabold text-primary lg:text-5xl">
              {target.first_name} {target.last_name}
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-text lg:text-base">
              {target.profile_summary || 'Aucun profil détaillé disponible.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:min-w-[520px]">
            <div className="rounded-3xl border border-divider bg-secondary/70 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-text/55">Rôle</p>
              <p className="mt-2 text-lg font-extrabold text-primary">{roleLabel(target.role)}</p>
            </div>
            <div className="rounded-3xl border border-divider bg-secondary/70 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-text/55">Statut</p>
              <p className="mt-2 text-lg font-extrabold text-primary">{target.is_active ? 'Actif' : 'Inactif'}</p>
            </div>
            <div className="rounded-3xl border border-divider bg-secondary/70 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-text/55">Rendez-vous</p>
              <p className="mt-2 text-lg font-extrabold text-primary">{stats.appointments_total}</p>
            </div>
            <div className="rounded-3xl border border-divider bg-secondary/70 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-text/55">Actions</p>
              <p className="mt-2 text-lg font-extrabold text-primary">{action_history.length}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card hoverable={false} className="border border-white/70 bg-white/80 p-6 shadow-card">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-text/55">Identité</p>
              <h2 className="mt-2 text-2xl font-bold text-primary">Coordonnées et accès</h2>
            </div>
            <UserRound className="h-10 w-10 text-accent" />
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl bg-secondary/60 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-text/55">Téléphone</p>
              <p className="mt-2 text-lg font-bold text-primary">{target.phone}</p>
            </div>
            <div className="rounded-3xl bg-secondary/60 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-text/55">E-mail</p>
              <p className="mt-2 text-lg font-bold text-primary">{target.email || 'Non renseigné'}</p>
            </div>
            <div className="rounded-3xl bg-secondary/60 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-text/55">Créé le</p>
              <p className="mt-2 text-sm font-semibold text-primary">{formatDateTime(target.created_at)}</p>
            </div>
            <div className="rounded-3xl bg-secondary/60 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-text/55">Mis à jour</p>
              <p className="mt-2 text-sm font-semibold text-primary">{formatDateTime(target.updated_at)}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={() => setIsActionModalOpen(true)}>
              <ShieldCheck className="h-4 w-4" />
              Gérer le compte
            </Button>
            <Button variant="secondary" onClick={() => refetch()}>
              Recharger
            </Button>
          </div>
        </Card>

        <Card hoverable={false} className="border border-white/70 bg-white/80 p-6 shadow-card">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-text/55">Activité</p>
              <h2 className="mt-2 text-2xl font-bold text-primary">Statistiques ciblées</h2>
            </div>
            <CalendarCheck2 className="h-10 w-10 text-accent" />
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              { label: 'Total RDV', value: stats.appointments_total },
              { label: 'Confirmés', value: stats.appointments_confirmed },
              { label: 'Annulés', value: stats.appointments_cancelled },
              { label: 'À venir', value: stats.upcoming_appointments },
            ].map((item) => (
              <div key={item.label} className="rounded-3xl bg-secondary/60 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-text/55">{item.label}</p>
                <p className="mt-2 text-3xl font-extrabold text-primary">{item.value}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card hoverable={false} className="border border-white/70 bg-white/80 p-6 shadow-card">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-text/55">Rendez-vous liés</p>
              <h2 className="mt-2 text-2xl font-bold text-primary">Derniers rendez-vous</h2>
            </div>
            <Clock3 className="h-10 w-10 text-accent" />
          </div>

          <div className="mt-6 space-y-3">
            {related_appointments.length === 0 ? (
              <p className="rounded-3xl border border-divider bg-secondary/40 p-5 text-sm text-text/70">
                Aucun rendez-vous lié à ce compte.
              </p>
            ) : (
              related_appointments.map((appointment) => (
                <div key={appointment.id} className="rounded-3xl border border-divider bg-white p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-semibold text-primary">
                        {appointment.patient_name || appointment.doctor_name || 'Rendez-vous'}
                      </p>
                      <p className="mt-1 text-sm text-text/65">
                        {formatDateTime(appointment.slot_start)} | {appointment.type === 'video' ? 'Téléconsultation' : 'Présentiel'}
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] ${statusTone(appointment.status)}`}>
                      {statusLabel(appointment.status)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card hoverable={false} className="border border-white/70 bg-white/80 p-6 shadow-card">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-text/55">Historique</p>
              <h2 className="mt-2 text-2xl font-bold text-primary">Actions administratives</h2>
            </div>
            <History className="h-10 w-10 text-accent" />
          </div>

          <div className="mt-6 space-y-3">
            {action_history.length === 0 ? (
              <p className="rounded-3xl border border-divider bg-secondary/40 p-5 text-sm text-text/70">
                Aucun historique d’action n’est encore disponible.
              </p>
            ) : (
              action_history.map((entry) => (
                <div key={entry.id} className="rounded-3xl border border-divider bg-white p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-semibold text-primary">{actionLabel(entry)}</p>
                      <p className="mt-1 text-sm text-text/65">
                        Par {entry.admin_name || 'admin inconnu'} · {formatDateTime(entry.created_at)}
                      </p>
                    </div>
                    <span className="rounded-full bg-accent/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-accent">
                      {entry.action}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-text/70">
                    {entry.previous_is_active === entry.new_is_active
                      ? 'Aucune variation de statut.'
                      : `${entry.previous_is_active ? 'Actif' : 'Inactif'} → ${entry.new_is_active ? 'Actif' : 'Inactif'}`}
                  </p>
                  {entry.note && <p className="mt-2 text-sm text-text">{entry.note}</p>}
                </div>
              ))
            )}
          </div>
        </Card>
      </section>

      <Modal
        open={isActionModalOpen}
        onClose={() => setIsActionModalOpen(false)}
        title="Gestion du compte"
        size="lg"
      >
        <div className="space-y-6">
          <div className="rounded-3xl border border-divider bg-secondary/40 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-text/55">Compte sélectionné</p>
            <h3 className="mt-2 text-2xl font-bold text-primary">
              {target.first_name} {target.last_name}
            </h3>
            <p className="mt-1 text-sm text-text/70">
              {roleLabel(target.role)} · {target.is_active ? 'Actif' : 'Inactif'}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              { label: 'Historique', value: action_history.length },
              { label: 'RDV', value: stats.appointments_total },
              { label: 'À venir', value: stats.upcoming_appointments },
            ].map((item) => (
              <div key={item.label} className="rounded-3xl bg-secondary/60 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-text/55">{item.label}</p>
                <p className="mt-2 text-3xl font-extrabold text-primary">{item.value}</p>
              </div>
            ))}
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-text/55">Historique récent</p>
              {actions.is_self && (
                <span className="rounded-full bg-warning/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-warning">
                  Votre compte
                </span>
              )}
            </div>
            <div className="max-h-72 space-y-3 overflow-auto pr-1">
              {action_history.length === 0 ? (
                <p className="rounded-2xl border border-divider bg-white p-4 text-sm text-text/70">
                  Aucun changement enregistré pour l’instant.
                </p>
              ) : (
                action_history.map((entry) => (
                  <div key={entry.id} className="rounded-2xl border border-divider bg-white p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-primary">{actionLabel(entry)}</p>
                        <p className="text-sm text-text/65">
                          {entry.admin_name || 'Admin'} | {formatDateTime(entry.created_at)}
                        </p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] ${statusTone(entry.new_is_active ? 'confirme' : 'annule')}`}>
                        {entry.new_is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {!canToggle ? (
            <div className="rounded-3xl border border-warning/20 bg-warning/10 p-4 text-sm text-warning">
              {actions.is_self
                ? 'Vous ne pouvez pas désactiver votre propre compte.'
                : actions.is_last_admin
                  ? 'Impossible de désactiver le dernier administrateur actif.'
                  : 'Action indisponible pour le moment.'}
            </div>
          ) : null}

          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="secondary" onClick={() => setIsActionModalOpen(false)}>
              Fermer
            </Button>
            <Button
              variant={nextStatus ? 'primary' : 'danger'}
              loading={toggleMutation.isPending}
              disabled={!canToggle}
              onClick={() => toggleMutation.mutate(nextStatus)}
            >
              {actionLabelText} le compte
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
