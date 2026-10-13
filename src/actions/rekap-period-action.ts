'use server';

import { createClient } from '@/configs/supabase/server';
import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@/types/general';
import type { RekapSettings, CustomPeriod } from '@/types/rekap';
import {
  DEFAULT_REKAP_SETTINGS,
  rekapSettingsSchema,
  customPeriodSchema,
  type RekapSettingsSchema,
  type CustomPeriodSchema,
} from '@/validations/rekap-validation';

/**
 * Mengubah pesan error Supabase/PostgREST menjadi pesan ramah Bahasa Indonesia
 * terutama ketika tabel migrasi belum dieksekusi di database.
 */
function handleDbError(error: { code?: string; message?: string } | null | undefined): string {
  if (!error) return 'Terjadi kesalahan pada database';

  const code = error.code ?? '';
  const message = error.message ?? '';
  const lower = message.toLowerCase();

  // Postgres 42P01: undefined_table, PostgREST PGRST205: table not found
  if (
    code === '42P01' ||
    code === 'PGRST205' ||
    lower.includes('does not exist') ||
    lower.includes('relation') ||
    lower.includes('could not find the table')
  ) {
    return 'Tabel rekap belum tersedia di database. Pastikan migrasi database (014-rekap-periode.sql) sudah dijalankan.';
  }

  return message || 'Terjadi kesalahan pada database';
}

/**
 * Mengambil pengaturan siklus rekap pengguna.
 * Jika belum ada data di database, kembalikan nilai default tanpa melakukan insert.
 */
export async function getRekapSettings(): Promise<ActionResult<RekapSettings>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Tidak terautentikasi' };
    }

    const { data, error } = await supabase
      .from('rekap_settings')
      .select('id, user_id, cutoff_day, akumulasi_saldo, created_at, updated_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: true,
          data: {
            cutoff_day: DEFAULT_REKAP_SETTINGS.cutoff_day,
            akumulasi_saldo: DEFAULT_REKAP_SETTINGS.akumulasi_saldo,
          },
        };
      }
      return { success: false, error: handleDbError(error) };
    }

    if (!data) {
      return {
        success: true,
        data: {
          cutoff_day: DEFAULT_REKAP_SETTINGS.cutoff_day,
          akumulasi_saldo: DEFAULT_REKAP_SETTINGS.akumulasi_saldo,
        },
      };
    }

    return {
      success: true,
      data: {
        id: data.id,
        user_id: data.user_id,
        cutoff_day: data.cutoff_day,
        akumulasi_saldo: data.akumulasi_saldo,
        created_at: data.created_at,
        updated_at: data.updated_at,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan saat memuat pengaturan rekap';
    return { success: false, error: message };
  }
}

/**
 * Memperbarui pengaturan siklus rekap pengguna (upsert berdasarkan user_id).
 */
export async function updateRekapSettings(
  values: RekapSettingsSchema,
): Promise<ActionResult<RekapSettings>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Tidak terautentikasi' };
    }

    const validation = rekapSettingsSchema.safeParse(values);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.issues[0]?.message ?? 'Data pengaturan rekap tidak valid',
      };
    }

    const now = new Date().toISOString();
    const payload = {
      user_id: user.id,
      cutoff_day: validation.data.cutoff_day,
      akumulasi_saldo: validation.data.akumulasi_saldo,
      updated_at: now,
    };

    const { data, error } = await supabase
      .from('rekap_settings')
      .upsert(payload, { onConflict: 'user_id' })
      .select('id, user_id, cutoff_day, akumulasi_saldo, created_at, updated_at')
      .single();

    if (error) {
      return { success: false, error: handleDbError(error) };
    }

    revalidatePath('/reports');

    return {
      success: true,
      data: {
        id: data.id,
        user_id: data.user_id,
        cutoff_day: data.cutoff_day,
        akumulasi_saldo: data.akumulasi_saldo,
        created_at: data.created_at,
        updated_at: data.updated_at,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan pengaturan rekap';
    return { success: false, error: message };
  }
}

/**
 * Mengambil daftar periode custom milik pengguna, diurutkan tanggal_mulai descending.
 */
export async function listCustomPeriods(): Promise<ActionResult<CustomPeriod[]>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Tidak terautentikasi' };
    }

    const { data, error } = await supabase
      .from('rekap_periode_custom')
      .select('id, user_id, nama, tanggal_mulai, tanggal_selesai, created_at, updated_at')
      .eq('user_id', user.id)
      .order('tanggal_mulai', { ascending: false });

    if (error) {
      return { success: false, error: handleDbError(error) };
    }

    return {
      success: true,
      data: data ?? [],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan saat memuat daftar periode custom';
    return { success: false, error: message };
  }
}

/**
 * Mengambil satu periode custom berdasarkan ID.
 */
export async function getCustomPeriod(id: string): Promise<ActionResult<CustomPeriod>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Tidak terautentikasi' };
    }

    if (!id || typeof id !== 'string') {
      return { success: false, error: 'ID periode custom tidak valid' };
    }

    const { data, error } = await supabase
      .from('rekap_periode_custom')
      .select('id, user_id, nama, tanggal_mulai, tanggal_selesai, created_at, updated_at')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      return { success: false, error: handleDbError(error) };
    }

    if (!data) {
      return { success: false, error: 'Periode custom tidak ditemukan' };
    }

    return { success: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan saat memuat periode custom';
    return { success: false, error: message };
  }
}

/**
 * Membuat periode custom baru.
 */
export async function createCustomPeriod(
  values: CustomPeriodSchema,
): Promise<ActionResult<CustomPeriod>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Tidak terautentikasi' };
    }

    const validation = customPeriodSchema.safeParse(values);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.issues[0]?.message ?? 'Data periode custom tidak valid',
      };
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('rekap_periode_custom')
      .insert({
        user_id: user.id,
        nama: validation.data.nama,
        tanggal_mulai: validation.data.tanggal_mulai,
        tanggal_selesai: validation.data.tanggal_selesai,
        created_at: now,
        updated_at: now,
      })
      .select('id, user_id, nama, tanggal_mulai, tanggal_selesai, created_at, updated_at')
      .single();

    if (error) {
      return { success: false, error: handleDbError(error) };
    }

    revalidatePath('/reports');

    return { success: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan saat membuat periode custom';
    return { success: false, error: message };
  }
}

/**
 * Memperbarui periode custom yang sudah ada.
 */
export async function updateCustomPeriod(
  id: string,
  values: CustomPeriodSchema,
): Promise<ActionResult<CustomPeriod>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Tidak terautentikasi' };
    }

    if (!id || typeof id !== 'string') {
      return { success: false, error: 'ID periode custom tidak valid' };
    }

    const validation = customPeriodSchema.safeParse(values);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.issues[0]?.message ?? 'Data periode custom tidak valid',
      };
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('rekap_periode_custom')
      .update({
        nama: validation.data.nama,
        tanggal_mulai: validation.data.tanggal_mulai,
        tanggal_selesai: validation.data.tanggal_selesai,
        updated_at: now,
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id, user_id, nama, tanggal_mulai, tanggal_selesai, created_at, updated_at')
      .maybeSingle();

    if (error) {
      return { success: false, error: handleDbError(error) };
    }

    if (!data) {
      return {
        success: false,
        error: 'Periode custom tidak ditemukan atau tidak memiliki hak akses',
      };
    }

    revalidatePath('/reports');

    return { success: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan saat memperbarui periode custom';
    return { success: false, error: message };
  }
}

/**
 * Menghapus periode custom berdasarkan ID.
 */
export async function deleteCustomPeriod(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Tidak terautentikasi' };
    }

    if (!id || typeof id !== 'string') {
      return { success: false, error: 'ID periode custom tidak valid' };
    }

    const { data, error } = await supabase
      .from('rekap_periode_custom')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id')
      .maybeSingle();

    if (error) {
      return { success: false, error: handleDbError(error) };
    }

    if (!data) {
      return {
        success: false,
        error: 'Periode custom tidak ditemukan atau tidak memiliki hak akses',
      };
    }

    revalidatePath('/reports');

    return { success: true, data: { id: data.id } };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan saat menghapus periode custom';
    return { success: false, error: message };
  }
}
