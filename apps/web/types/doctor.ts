export interface Doctor {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
  specialty: string;
  cabinet_name: string;
  address: string;
  bio: string | null;
  languages: string[];
  fee: string; // Decimal is returned as string from JSON
  photo_url: string | null;
  cancellation_delay_hours: number;
  latitude: number | null;
  longitude: number | null;
  upcoming_availabilities?: string[];
}

export interface SearchDoctorsResponse {
  doctors: Doctor[];
  total: number;
  page: number;
  per_page: number;
}
