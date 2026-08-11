export interface AdminDashboardOverview {
  total_users: number;
  active_users: number;
  doctors: number;
  active_doctors: number;
  patients: number;
  secretaries: number;
  admins: number;
  active_secretary_links: number;
  appointments_total: number;
  appointments_confirmed: number;
  appointments_cancelled: number;
  appointments_effectue: number;
  appointments_manque: number;
  appointments_week: number;
  appointments_week_confirmed: number;
  appointments_week_cancelled: number;
  video_appointments_week: number;
}

export interface AdminRoleDistributionItem {
  role: 'admin' | 'medecin' | 'secretaire' | 'patient';
  label: string;
  count: number;
}

export interface AdminActivitySeriesPoint {
  date: string;
  label: string;
  appointments: number;
  presentiel_appointments: number;
  video_appointments: number;
  confirmed: number;
  cancelled: number;
  completed: number;
  missed: number;
  new_users: number;
  new_doctors: number;
  new_patients: number;
  new_secretaries: number;
  new_admins: number;
}

export interface AdminAppointmentStatusBreakdownItem {
  status: 'confirme' | 'annule' | 'effectue' | 'manque';
  label: string;
  count: number;
}

export interface AdminDashboardUser {
  id: string;
  role: 'admin' | 'medecin' | 'secretaire' | 'patient';
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
  profile_summary: string | null;
}

export interface AdminDashboardAppointment {
  id: string;
  doctor_id: string;
  doctor_name: string | null;
  patient_id: string;
  patient_name: string | null;
  slot_start: string;
  slot_end: string;
  type: 'presentiel' | 'video';
  status: 'confirme' | 'annule' | 'effectue' | 'manque';
  reason: string | null;
  created_at: string | null;
}

export interface AdminDashboardResponse {
  overview: AdminDashboardOverview;
  role_distribution: AdminRoleDistributionItem[];
  activity_series: AdminActivitySeriesPoint[];
  appointment_status_breakdown: AdminAppointmentStatusBreakdownItem[];
  recent_users: AdminDashboardUser[];
  recent_appointments: AdminDashboardAppointment[];
  system: {
    database: 'connected' | 'disconnected' | 'not_configured';
    redis: 'connected' | 'disconnected' | 'not_configured';
  };
  meta: {
    snapshot_at: string;
    role_total: number;
  };
}

export interface AdminUsersResponse {
  users: AdminDashboardUser[];
  total: number;
  page: number;
  per_page: number;
  summary: AdminRoleDistributionItem[];
}

export interface AdminActionHistoryItem {
  id: string;
  action: string;
  admin_id: string;
  admin_name: string | null;
  target_user_id: string;
  target_user_name: string | null;
  previous_is_active: boolean | null;
  new_is_active: boolean | null;
  note: string | null;
  created_at: string | null;
}

export interface AdminUserDetailResponse {
  user: AdminDashboardUser;
  stats: {
    appointments_total: number;
    appointments_confirmed: number;
    appointments_cancelled: number;
    appointments_effectue: number;
    appointments_manque: number;
    upcoming_appointments: number;
  };
  related_appointments: AdminDashboardAppointment[];
  action_history: AdminActionHistoryItem[];
  actions: {
    is_self: boolean;
    can_disable: boolean;
    can_enable: boolean;
    is_last_admin: boolean;
  };
}
