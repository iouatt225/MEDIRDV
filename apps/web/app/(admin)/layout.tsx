'use client';

import RequireRole from '@/components/auth/RequireRole';
import AdminShell from '@/components/admin/AdminShell';

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <RequireRole allowedRoles={['admin']}>
      <AdminShell>{children}</AdminShell>
    </RequireRole>
  );
}
