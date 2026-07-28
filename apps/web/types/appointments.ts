export type ConsultationType = 'presentiel' | 'video';

export type AppointmentStatus = 'confirme' | 'annule' | 'effectue' | 'manque';

export interface Appointment {
  id: string;
  doctor_id: string;
  patient_id: string;
  slot_start: string; // ISO datetime
  slot_end: string; // ISO datetime
  type: ConsultationType;
  status: AppointmentStatus;
  reason: string | null;
  video_url: string | null;
  version_token: number;
  created_at: string | null;
  updated_at: string | null;
  doctor?: {
    first_name: string;
    last_name: string;
    phone: string;
    email: string | null;
    specialty: string;
    cabinet_name: string;
    address: string;
    fee: number | null;
  };
  patient?: {
    first_name: string;
    last_name: string;
    phone: string;
    email: string | null;
    date_of_birth?: string | null;
    address?: string | null;
    phone_secondary?: string | null;
  };
}
