import { z } from "zod";
import { parseDateString, compareDates } from "@/lib/rekap-period";

/**
 * Nilai default pengaturan rekapitulasi keuangan
 */
export const DEFAULT_REKAP_SETTINGS = {
  cutoff_day: 1,
  akumulasi_saldo: false,
} as const;

/**
 * Schema validasi pengaturan siklus dan akumulasi saldo rekap
 */
export const rekapSettingsSchema = z.object({
  cutoff_day: z
    .number({
      error: "Cut-off hari harus berupa angka",
    })
    .int("Cut-off hari harus berupa bilangan bulat")
    .min(1, "Cut-off hari minimal 1")
    .max(31, "Cut-off hari maksimal 31"),
  akumulasi_saldo: z.boolean({
    error: "Akumulasi saldo harus bernilai boolean",
  }),
});

export type RekapSettingsSchema = z.infer<typeof rekapSettingsSchema>;

/**
 * Helper schema untuk string tanggal ISO YYYY-MM-DD yang valid kalendernya
 */
const dateStringSchema = z
  .string({
    error: "Tanggal wajib diisi",
  })
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD")
  .refine((val) => parseDateString(val) !== null, {
    message: "Format tanggal tidak valid",
  });

/**
 * Schema validasi periode kustom rekap
 */
export const customPeriodSchema = z
  .object({
    nama: z
      .string({
        error: "Nama periode wajib diisi",
      })
      .trim()
      .min(1, "Nama periode wajib diisi")
      .max(100, "Nama periode maksimal 100 karakter"),
    tanggal_mulai: dateStringSchema,
    tanggal_selesai: dateStringSchema,
  })
  .refine(
    (data) => {
      // Jika salah satu tanggal formatnya salah, biarkan validator field yang melapor
      if (
        !parseDateString(data.tanggal_mulai) ||
        !parseDateString(data.tanggal_selesai)
      ) {
        return true;
      }
      return compareDates(data.tanggal_selesai, data.tanggal_mulai) >= 0;
    },
    {
      message: "Tanggal selesai tidak boleh lebih awal dari tanggal mulai",
      path: ["tanggal_selesai"],
    },
  );

export type CustomPeriodSchema = z.infer<typeof customPeriodSchema>;
