'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, CheckCircle2, ChevronLeft, ChevronRight, Sparkles, Users, UserRound } from 'lucide-react';

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
    <div className="space-y-6">
      <section className="rounded-[36px] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-7 lg:p-9">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#00a8bc]/15 bg-[#e8fbfd] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-[#0b6270]">
              <Sparkles className="h-3.5 w-3.5" />
              Gestion des comptes
            </div>
            <h1 className="text-3xl font-semibold leading-tight text-[#0b1420] sm:text-4xl lg:text-5xl">
              Controle fin des utilisateurs et des acces
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
              Recherchez, filtrez et pilotez les comptes avec une presentation plus claire, plus dense et plus
              proche de l experience Orbit.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:min-w-[460px]">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">Admins</p>
              <p className="mt-2 text-2xl font-semibold text-[#0b1420]">{summaryMap.get('admin') ?? 0}</p>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">Medecins</p>
              <p className="mt-2 text-2xl font-semibold text-[#0b1420]">{summaryMap.get('medecin') ?? 0}</p>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">Secretaires</p>
              <p className="mt-2 text-2xl font-semibold text-[#0b1420]">{summaryMap.get('secretaire') ?? 0}</p>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">Patients</p>
              <p className="mt-2 text-2xl font-semibold text-[#0b1420]">{summaryMap.get('patient') ?? 0}</p>
            </div>
          </div>
        </div>
      </section>

      <Card hoverable={false} className="border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
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
              className="w-full !border-slate-200 !text-[#0b1420] hover:!bg-slate-50"
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
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#00a8bc] border-t-transparent" />
        </div>
      ) : isError ? (
        <Card hoverable={false} className="border border-rose-200 bg-rose-50 p-6 text-center shadow-none">
          <p className="text-lg font-semibold text-[#0b1420]">Impossible de charger les comptes</p>
          <Button className="mt-4" onClick={() => refetch()}>
            Reessayer
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card hoverable={false} className="overflow-hidden border border-slate-200 bg-white p-0 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500">
                      Utilisateur
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500">
                      Role
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500">
                      Details
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500">
                      Cree le
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500">
                      Statut
                    </th>
                    <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-500">
                        Aucun utilisateur ne correspond aux filtres actuels.
                      </td>
                    </tr>
                  ) : (
                    users.map((item) => {
                      const isCurrentUser = item.id === user?.id;
                      const locked = item.role === 'admin' && !item.is_active && (summaryMap.get('admin') ?? 0) === 1;

                      return (
                        <tr key={item.id} className="border-t border-slate-100 hover:bg-slate-50/80">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0b1420] font-semibold text-white">
                                {item.first_name.slice(0, 1)}
                                {item.last_name.slice(0, 1)}
                              </div>
                              <div>
                                <p className="font-semibold text-[#0b1420]">
                                  {item.first_name} {item.last_name}
                                </p>
                                <p className="text-sm text-slate-500">{item.email || item.phone}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="inline-flex rounded-full bg-[#e8fbfd] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#0b6270]">
                              {roleLabel(item.role)}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <p className="max-w-[260px] text-sm font-medium text-[#0b1420]">
                              {item.profile_summary || 'Aucun profil detaille'}
                            </p>
                          </td>
                          <td className="px-5 py-3.5 text-sm text-slate-500">{formatDate(item.created_at)}</td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] ${
                                item.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                              }`}
                            >
                              {item.is_active ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                              {item.is_active ? 'Actif' : 'Inactif'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                href={`/admin/users/${item.id}`}
                                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-[#0b1420] transition hover:bg-slate-50"
                              >
                                Detail
                              </Link>
                              <Button
                                variant={item.is_active ? 'secondary' : 'primary'}
                                size="sm"
                                loading={toggleMutation.isPending && toggleMutation.variables?.userId === item.id}
                                disabled={isCurrentUser || locked}
                                className={item.is_active ? '!border-slate-200 !text-[#0b1420] hover:!bg-slate-50' : ''}
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

          <div className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_20px_55px_rgba(15,23,42,0.06)] sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">
              {data?.total ?? 0} compte(s) trouve(s), page {data?.page ?? 1} sur {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                className="!border-slate-200 !text-[#0b1420] hover:!bg-slate-50"
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
                Precedent
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                className="!border-slate-200 !text-[#0b1420] hover:!bg-slate-50"
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
