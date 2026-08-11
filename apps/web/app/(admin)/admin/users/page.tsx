'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, CheckCircle2, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/stores/useAuthStore';
import {
  AdminDashboardUser,
  AdminRoleDistributionItem,
  AdminUsersResponse,
} from '@/types/admin';

const roleOptions = [
  { value: '', label: 'Tous les roles' },
  { value: 'admin', label: 'Admin' },
  { value: 'medecin', label: 'Medecin' },
  { value: 'secretaire', label: 'Secretaire' },
  { value: 'patient', label: 'Patient' },
];

const activeOptions = [
  { value: '', label: 'Tous les statuts' },
  { value: 'true', label: 'Actifs' },
  { value: 'false', label: 'Inactifs' },
];

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function roleLabel(role: AdminDashboardUser['role']) {
  switch (role) {
    case 'admin':
      return 'Admin';
    case 'medecin':
      return 'Medecin';
    case 'secretaire':
      return 'Secretaire';
    default:
      return 'Patient';
  }
}

export default function AdminUsersPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 10;

  useEffect(() => {
    setPage(1);
  }, [search, roleFilter, statusFilter]);

  const { data, isLoading, isError, refetch } = useQuery<AdminUsersResponse>({
    queryKey: ['admin-users', page, perPage, search, roleFilter, statusFilter],
    queryFn: () =>
      apiClient.get('/api/v1/admin/users', {
        params: {
          page: String(page),
          per_page: String(perPage),
          search,
          role: roleFilter,
          is_active: statusFilter,
        },
      }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      apiClient.patch(`/api/v1/admin/users/${userId}/status`, { is_active: isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
  });

  const users = data?.users ?? [];
  const totalPages = data ? Math.max(Math.ceil(data.total / data.per_page), 1) : 1;
  const summaryMap = new Map<AdminRoleDistributionItem['role'], number>(
    (data?.summary ?? []).map((item) => [item.role, item.count])
  );

  const handleToggle = async (target: AdminDashboardUser) => {
    const nextStatus = !target.is_active;
    const action = nextStatus ? 'reactiver' : 'desactiver';
    const confirmed = window.confirm(
      `Voulez-vous vraiment ${action} ${target.first_name} ${target.last_name} (${roleLabel(target.role)}) ?`
    );
    if (!confirmed) return;

    try {
      await toggleMutation.mutateAsync({ userId: target.id, isActive: nextStatus });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Action impossible.';
      window.alert(message);
    }
  };

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[34px] border border-white/70 bg-white/80 p-6 shadow-[0_24px_80px_rgba(8,54,59,0.12)] backdrop-blur-xl lg:p-8">
        <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.35em] text-accent">
              <Sparkles className="h-3.5 w-3.5" />
              Gestion des comptes
            </div>
            <h1 className="text-3xl font-extrabold text-primary lg:text-5xl">
              Controle fin des utilisateurs et des acces
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-text lg:text-base">
              Recherchez, filtrez et desactivez les comptes en gardant la main sur les roles
              sensibles. La regle est simple: visibilite maximale, action minimale, securite forte.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:min-w-[420px]">
            <div className="rounded-3xl border border-divider bg-secondary/70 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-text/55">Admins</p>
              <p className="mt-2 text-2xl font-extrabold text-primary">{summaryMap.get('admin') ?? 0}</p>
            </div>
            <div className="rounded-3xl border border-divider bg-secondary/70 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-text/55">Medecins</p>
              <p className="mt-2 text-2xl font-extrabold text-primary">{summaryMap.get('medecin') ?? 0}</p>
            </div>
            <div className="rounded-3xl border border-divider bg-secondary/70 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-text/55">Secretaires</p>
              <p className="mt-2 text-2xl font-extrabold text-primary">{summaryMap.get('secretaire') ?? 0}</p>
            </div>
            <div className="rounded-3xl border border-divider bg-secondary/70 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-text/55">Patients</p>
              <p className="mt-2 text-2xl font-extrabold text-primary">{summaryMap.get('patient') ?? 0}</p>
            </div>
          </div>
        </div>
      </section>

      <Card hoverable={false} className="border border-white/70 bg-white/80 p-6 shadow-card">
        <div className="grid gap-4 xl:grid-cols-[1.6fr_0.7fr_0.7fr_auto]">
          <Input
            label="Rechercher un utilisateur"
            placeholder="Nom, telephone ou e-mail"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            label="Role"
            options={roleOptions}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          />
          <Select
            label="Statut"
            options={activeOptions}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
          <div className="flex items-end">
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => {
                setSearch('');
                setRoleFilter('');
                setStatusFilter('');
              }}
            >
              Reinitialiser
            </Button>
          </div>
        </div>
      </Card>

      {isLoading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-accent border-t-transparent" />
        </div>
      ) : isError ? (
        <Card hoverable={false} className="border border-error/20 bg-error/10 p-6 text-center">
          <p className="text-lg font-bold text-primary">Impossible de charger les comptes</p>
          <Button className="mt-4" onClick={() => refetch()}>
            Reessayer
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card hoverable={false} className="overflow-hidden border border-white/70 bg-white/80 p-0 shadow-card">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-divider">
                <thead className="bg-secondary/60">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-[0.25em] text-text/55">
                      Utilisateur
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-[0.25em] text-text/55">
                      Role
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-[0.25em] text-text/55">
                      Details
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-[0.25em] text-text/55">
                      Cree le
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-[0.25em] text-text/55">
                      Statut
                    </th>
                    <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-[0.25em] text-text/55">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-divider bg-white">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-14 text-center text-sm text-text/65">
                        Aucun utilisateur ne correspond aux filtres actuels.
                      </td>
                    </tr>
                  ) : (
                    users.map((item) => {
                      const isCurrentUser = item.id === user?.id;
                      const locked = item.role === 'admin' && !item.is_active && (summaryMap.get('admin') ?? 0) === 1;

                      return (
                        <tr key={item.id} className="hover:bg-secondary/30">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 font-bold text-primary">
                                {item.first_name.slice(0, 1)}
                                {item.last_name.slice(0, 1)}
                              </div>
                              <div>
                                <p className="font-semibold text-primary">
                                  {item.first_name} {item.last_name}
                                </p>
                                <p className="text-sm text-text/65">{item.email || item.phone}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="inline-flex rounded-full bg-accent/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.25em] text-accent">
                              {roleLabel(item.role)}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <p className="max-w-[240px] text-sm font-medium text-primary">
                              {item.profile_summary || 'Aucun profil detaille'}
                            </p>
                          </td>
                          <td className="px-5 py-4 text-sm text-text">{formatDate(item.created_at)}</td>
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.25em] ${
                                item.is_active ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                              }`}
                            >
                              {item.is_active ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                              {item.is_active ? 'Actif' : 'Inactif'}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                href={`/admin/users/${item.id}`}
                                className="rounded-pluxes-btn border border-divider bg-white px-4 py-2 text-sm font-bold text-primary transition hover:bg-secondary"
                              >
                                Detail
                              </Link>
                              <Button
                                variant={item.is_active ? 'secondary' : 'primary'}
                                size="sm"
                                loading={toggleMutation.isPending && toggleMutation.variables?.userId === item.id}
                                disabled={isCurrentUser || locked}
                                onClick={() => handleToggle(item)}
                              >
                                {item.is_active ? 'Desactiver' : 'Reactiver'}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="flex flex-col gap-4 rounded-[28px] border border-white/70 bg-white/80 p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-text">
              {data?.total ?? 0} compte(s) trouve(s), page {data?.page ?? 1} sur {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
                Precedent
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((prev) => prev + 1)}
              >
                Suivant
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
