/**
 * Pure Rekap Period Engine
 *
 * Mengelola kalkulasi periode siklus cut-off dinamis, bucketing string YYYY-MM-DD,
 * perhitungan hari inklusif, penentuan zona Asia/Jakarta, dan pelabelan periode.
 *
 * Murni komputasi tanggal kalender integer tanpa import server, DB, atau instansiasi
 * `new Date(string)` yang rawan pergeseran timezone UTC/lokal.
 */

export type RekapLocale = "id-ID" | "en-US";

export type RekapCycleRange = {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  year: number; // Base year awal siklus
  month: number; // Base month awal siklus (1..12)
  daysCount: number; // Jumlah hari inklusif
  label: string; // Label periode terformat (mis. "10 Apr - 09 Mei 2026")
};

export type FormatPeriodLabelOptions = {
  locale?: RekapLocale;
  monthFormat?: "short" | "long";
  includeYear?: boolean;
};

export type GetCycleListOptions = {
  cutoffDay: number;
  referenceDate?: string; // Default: hari ini berzona Asia/Jakarta
  count?: number; // Default: 12 periode
  earliestDate?: string; // Batas bawah: berhenti jika siklus mencakup/sebelum tanggal ini
  locale?: RekapLocale;
};

export type DateRangeValidationResult = {
  isValid: boolean;
  error?: string;
};

const ID_MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
] as const;

const ID_MONTHS_LONG = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
] as const;

const EN_MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const EN_MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/**
 * Validasi apakah tahun kabisat (leap year)
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Mengembalikan jumlah hari dalam bulan tertentu (1..12)
 */
export function getDaysInMonth(year: number, month: number): number {
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }
  if (month === 4 || month === 6 || month === 9 || month === 11) {
    return 30;
  }
  return 31;
}

/**
 * Format komponen tahun, bulan, hari menjadi string ISO YYYY-MM-DD
 */
export function formatDateString(
  year: number,
  month: number,
  day: number,
): string {
  const y = String(year).padStart(4, "0");
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Parse string YYYY-MM-DD ke komponen numerik tahun, bulan, hari dengan validasi kalender.
 * Mengembalikan null jika format string atau tanggal tidak valid.
 */
export function parseDateString(
  dateStr: string,
): { year: number; month: number; day: number } | null {
  if (typeof dateStr !== "string") return null;
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (month < 1 || month > 12) return null;
  const maxDay = getDaysInMonth(year, month);
  if (day < 1 || day > maxDay) return null;

  return { year, month, day };
}

/**
 * Perbandingan dua string tanggal ISO YYYY-MM-DD secara leksikografis
 */
export function compareDates(dateA: string, dateB: string): number {
  if (dateA < dateB) return -1;
  if (dateA > dateB) return 1;
  return 0;
}

/**
 * Hitung jumlah hari absolut dari 0001-01-01 untuk kalkulasi selisih hari integer murni
 */
function daysFromEpoch(year: number, month: number, day: number): number {
  const y = year - 1;
  const leapYears =
    Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400);
  let days = y * 365 + leapYears;
  for (let m = 1; m < month; m++) {
    days += getDaysInMonth(year, m);
  }
  days += day;
  return days;
}

/**
 * (e) Jumlah hari dalam periode secara inklusif (inklusif start dan end date)
 */
export function countDaysInPeriod(startDate: string, endDate: string): number {
  const start = parseDateString(startDate);
  const end = parseDateString(endDate);
  if (!start || !end) return 0;

  const startDays = daysFromEpoch(start.year, start.month, start.day);
  const endDays = daysFromEpoch(end.year, end.month, end.day);

  if (endDays < startDays) return 0;
  return endDays - startDays + 1;
}

/**
 * Tambah / kurangi sejumlah hari pada string YYYY-MM-DD tanpa new Date(string)
 */
export function addDays(dateStr: string, deltaDays: number): string {
  const parsed = parseDateString(dateStr);
  if (!parsed) return dateStr;
  let { year, month, day } = parsed;

  if (deltaDays > 0) {
    let remaining = deltaDays;
    while (remaining > 0) {
      const dim = getDaysInMonth(year, month);
      const daysLeftInMonth = dim - day;
      if (remaining <= daysLeftInMonth) {
        day += remaining;
        remaining = 0;
      } else {
        remaining -= daysLeftInMonth + 1;
        day = 1;
        if (month === 12) {
          month = 1;
          year += 1;
        } else {
          month += 1;
        }
      }
    }
  } else if (deltaDays < 0) {
    let remaining = -deltaDays;
    while (remaining > 0) {
      if (remaining < day) {
        day -= remaining;
        remaining = 0;
      } else {
        remaining -= day;
        if (month === 1) {
          month = 12;
          year -= 1;
        } else {
          month -= 1;
        }
        day = getDaysInMonth(year, month);
      }
    }
  }

  return formatDateString(year, month, day);
}

/**
 * Pastikan cutoffDay berada dalam batas 1..31
 */
export function clampCutoffDay(cutoffDay: number): number {
  if (!Number.isFinite(cutoffDay)) return 1;
  return Math.max(1, Math.min(31, Math.floor(cutoffDay)));
}

/**
 * (d) Label periode (mis. "10 Apr - 09 Mei 2026") mengikuti locale id-ID/en-US
 */
export function formatPeriodLabel(
  startDate: string,
  endDate: string,
  options?: FormatPeriodLabelOptions | RekapLocale,
): string {
  const resolvedOptions: FormatPeriodLabelOptions =
    typeof options === "string" ? { locale: options } : (options ?? {});

  const locale = resolvedOptions.locale ?? "id-ID";
  const monthFormat = resolvedOptions.monthFormat ?? "short";
  const includeYear = resolvedOptions.includeYear ?? true;

  const start = parseDateString(startDate);
  const end = parseDateString(endDate);

  if (!start || !end) return `${startDate} - ${endDate}`;

  const monthsList =
    locale === "en-US"
      ? monthFormat === "long"
        ? EN_MONTHS_LONG
        : EN_MONTHS_SHORT
      : monthFormat === "long"
        ? ID_MONTHS_LONG
        : ID_MONTHS_SHORT;

  const startDay = String(start.day).padStart(2, "0");
  const endDay = String(end.day).padStart(2, "0");
  const startMonthName = monthsList[start.month - 1];
  const endMonthName = monthsList[end.month - 1];

  if (!includeYear) {
    return `${startDay} ${startMonthName} - ${endDay} ${endMonthName}`;
  }

  if (start.year === end.year) {
    return `${startDay} ${startMonthName} - ${endDay} ${endMonthName} ${start.year}`;
  }

  return `${startDay} ${startMonthName} ${start.year} - ${endDay} ${endMonthName} ${end.year}`;
}

/**
 * Label bulan kalender sederhana (mis. "April 2026" atau "Apr 2026")
 */
export function formatMonthLabel(
  year: number,
  month: number,
  options?: { locale?: RekapLocale; monthFormat?: "short" | "long" },
): string {
  const locale = options?.locale ?? "id-ID";
  const monthFormat = options?.monthFormat ?? "long";
  const monthsList =
    locale === "en-US"
      ? monthFormat === "long"
        ? EN_MONTHS_LONG
        : EN_MONTHS_SHORT
      : monthFormat === "long"
        ? ID_MONTHS_LONG
        : ID_MONTHS_SHORT;

  const monthName = monthsList[Math.max(1, Math.min(12, month)) - 1];
  return `${monthName} ${year}`;
}

/**
 * (a) Rentang siklus untuk cutoffDay + (tahun, bulan awal)
 *
 * Menerapkan Keputusan D3:
 * - Cut-off hari ke-D (1–31).
 * - Bulan yang lebih pendek di-clamp ke hari terakhir bulan.
 * - Siklus berakhir sehari sebelum siklus berikutnya mulai.
 * - Cut-off 1 berarti bulan kalender.
 * - Siklus selalu bersambung tanpa celah dan tanpa tumpang tindih.
 */
export function getCycleRange(
  cutoffDay: number,
  year: number,
  month: number,
  locale?: RekapLocale,
): RekapCycleRange {
  const d = clampCutoffDay(cutoffDay);

  // Tanggal mulai siklus pada bulan ini
  const startDay = Math.min(d, getDaysInMonth(year, month));
  const startDate = formatDateString(year, month, startDay);

  let endDate: string;
  if (d === 1) {
    // Cut-off 1: tepat bulan kalender
    endDate = formatDateString(year, month, getDaysInMonth(year, month));
  } else {
    // Cut-off > 1: cari hari mulai siklus berikutnya, lalu ambil H-1
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const nextStartDay = Math.min(d, getDaysInMonth(nextYear, nextMonth));
    // Karena d >= 2 dan setiap bulan >= 28 hari, nextStartDay >= 2,
    // sehingga H-1 pasti berada pada bulan berikutnya (nextStartDay - 1).
    endDate = formatDateString(nextYear, nextMonth, nextStartDay - 1);
  }

  const daysCount = countDaysInPeriod(startDate, endDate);
  const label = formatPeriodLabel(startDate, endDate, { locale });

  return {
    startDate,
    endDate,
    year,
    month,
    daysCount,
    label,
  };
}

/**
 * (b) Siklus yang memuat tanggal tertentu (YYYY-MM-DD)
 */
export function getCycleForDate(
  cutoffDay: number,
  date: string,
  locale?: RekapLocale,
): RekapCycleRange {
  const parsed = parseDateString(date);
  if (!parsed) {
    // Fallback jika string tidak valid: gunakan hari ini di Jakarta
    return getCycleForDate(cutoffDay, getTodayInJakarta(), locale);
  }

  const d = clampCutoffDay(cutoffDay);
  const { year, month, day } = parsed;

  const startDayThisMonth = Math.min(d, getDaysInMonth(year, month));

  if (day >= startDayThisMonth) {
    // Tanggal berada pada atau setelah cut-off bulan ini -> siklus dimulai bulan ini
    return getCycleRange(d, year, month, locale);
  }

  // Tanggal berada sebelum cut-off bulan ini -> siklus dimulai bulan sebelumnya
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  return getCycleRange(d, prevYear, prevMonth, locale);
}

/**
 * Alias untuk getCycleForDate: mengambil siklus yang memuat tanggal tertentu
 */
export const getCycleContaining = getCycleForDate;

/**
 * Alias untuk getCycleList: mengambil daftar siklus berurutan mundur
 */
export const listCycles = getCycleList;

/**
 * (c) Daftar siklus berurutan dari terbaru mundur sampai tanggal paling awal / sejumlah N
 */
export function getCycleList(options: GetCycleListOptions): RekapCycleRange[] {
  const cutoffDay = clampCutoffDay(options.cutoffDay);
  const referenceDate = options.referenceDate ?? getTodayInJakarta();
  const maxCount = Math.max(1, options.count ?? 12);
  const earliestDate = options.earliestDate;
  const locale = options.locale;

  const current = getCycleForDate(cutoffDay, referenceDate, locale);
  const result: RekapCycleRange[] = [];

  let curYear = current.year;
  let curMonth = current.month;

  // Batas pengaman maksimum 240 siklus (20 tahun) untuk mencegah loop tak terbatas
  const safetyLimit = Math.min(maxCount, 240);

  for (let i = 0; i < safetyLimit; i++) {
    const cycle = getCycleRange(cutoffDay, curYear, curMonth, locale);
    result.push(cycle);

    if (result.length >= maxCount) {
      break;
    }

    if (earliestDate && compareDates(cycle.startDate, earliestDate) <= 0) {
      break;
    }

    // Mundur 1 bulan
    if (curMonth === 1) {
      curMonth = 12;
      curYear -= 1;
    } else {
      curMonth -= 1;
    }
  }

  return result;
}

/**
 * (f) Validasi rentang custom (sampai >= dari)
 */
export function validateCustomPeriodRange(
  startDate: string,
  endDate: string,
): DateRangeValidationResult {
  const start = parseDateString(startDate);
  if (!start) {
    return {
      isValid: false,
      error: "Format tanggal mulai tidak valid (gunakan YYYY-MM-DD)",
    };
  }

  const end = parseDateString(endDate);
  if (!end) {
    return {
      isValid: false,
      error: "Format tanggal selesai tidak valid (gunakan YYYY-MM-DD)",
    };
  }

  if (compareDates(endDate, startDate) < 0) {
    return {
      isValid: false,
      error: "Tanggal selesai tidak boleh lebih awal dari tanggal mulai",
    };
  }

  return { isValid: true };
}

/**
 * Boolean shorthand untuk pengecekan validitas rentang tanggal
 */
export function isValidDateRange(startDate: string, endDate: string): boolean {
  return validateCustomPeriodRange(startDate, endDate).isValid;
}

/**
 * (g) Helper "hari ini" berzona Asia/Jakarta dalam format YYYY-MM-DD
 *
 * Menerapkan Keputusan D6:
 * - Menghitung hari ini berzona Asia/Jakarta (WIB), bukan new Date() server (UTC).
 * - Tepat berganti tanggal pada pukul 17:00:00 UTC (00:00:00 WIB).
 */
export function getTodayInJakarta(now: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(now);
}
