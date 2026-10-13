export type RekapPreferences = {
  rekap_start_day: number;
  rekap_accumulate_balance: boolean;
};

export type RekapKustom = {
  id: string;
  user_id: string;
  nama: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  catatan: string | null;
  created_at: string;
  updated_at: string;
};

export type RekapKustomFormValues = {
  nama: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  catatan?: string | null;
};
