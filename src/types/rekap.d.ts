// Rekap settings and custom period types

export type RekapSettings = {
  id?: string;
  user_id?: string;
  cutoff_day: number;
  akumulasi_saldo: boolean;
  created_at?: string;
  updated_at?: string;
};

export type RekapSettingsUpdate = {
  cutoff_day: number;
  akumulasi_saldo: boolean;
};

export type CustomPeriod = {
  id: string;
  user_id: string;
  nama: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  created_at: string;
  updated_at: string;
};

export type CustomPeriodInput = {
  nama: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
};
