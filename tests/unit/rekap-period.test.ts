import { describe, expect, it } from "vitest";
import {
  addDays,
  clampCutoffDay,
  compareDates,
  countDaysInPeriod,
  formatDateString,
  formatMonthLabel,
  formatPeriodLabel,
  getCycleForDate,
  getCycleList,
  getCycleRange,
  getDaysInMonth,
  getTodayInJakarta,
  isLeapYear,
  isValidDateRange,
  parseDateString,
  validateCustomPeriodRange,
} from "@/lib/rekap-period";

describe("rekap-period", () => {
  describe("isLeapYear and getDaysInMonth", () => {
    it("identifies leap years correctly", () => {
      expect(isLeapYear(2024)).toBe(true);
      expect(isLeapYear(2026)).toBe(false);
      expect(isLeapYear(2000)).toBe(true);
      expect(isLeapYear(1900)).toBe(false);
    });

    it("returns correct days in month including leap February", () => {
      expect(getDaysInMonth(2026, 1)).toBe(31);
      expect(getDaysInMonth(2026, 2)).toBe(28); // non-leap
      expect(getDaysInMonth(2024, 2)).toBe(29); // leap
      expect(getDaysInMonth(2026, 4)).toBe(30);
      expect(getDaysInMonth(2026, 12)).toBe(31);
    });
  });

  describe("clampCutoffDay", () => {
    it("clamps cutoff day between 1 and 31", () => {
      expect(clampCutoffDay(1)).toBe(1);
      expect(clampCutoffDay(31)).toBe(31);
      expect(clampCutoffDay(0)).toBe(1);
      expect(clampCutoffDay(-5)).toBe(1);
      expect(clampCutoffDay(32)).toBe(31);
      expect(clampCutoffDay(10.8)).toBe(10);
      expect(clampCutoffDay(NaN)).toBe(1);
      expect(clampCutoffDay(Infinity)).toBe(1);
    });
  });

  describe("parseDateString and formatDateString", () => {
    it("formats date strings properly", () => {
      expect(formatDateString(2026, 4, 10)).toBe("2026-04-10");
    });

    it("parses valid date strings and rejects invalid inputs", () => {
      expect(parseDateString("2026-04-10")).toEqual({
        year: 2026,
        month: 4,
        day: 10,
      });
      expect(parseDateString("")).toBeNull();
      expect(parseDateString("2026-13-01")).toBeNull();
      expect(parseDateString("2026-02-29")).toBeNull(); // non-leap
      expect(parseDateString("2024-02-29")).toEqual({
        year: 2024,
        month: 2,
        day: 29,
      }); // leap
      expect(parseDateString(null as unknown as string)).toBeNull();
    });
  });

  describe("addDays and compareDates", () => {
    it("adds days without Date object string parsing", () => {
      expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
      expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
      expect(addDays("2024-02-29", 1)).toBe("2024-03-01");
      expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
      expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
      expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
      expect(addDays("invalid-date", 1)).toBe("invalid-date");
    });

    it("compares YYYY-MM-DD strings lexicographically", () => {
      expect(compareDates("2026-04-10", "2026-04-10")).toBe(0);
      expect(compareDates("2026-04-09", "2026-04-10")).toBe(-1);
      expect(compareDates("2026-04-11", "2026-04-10")).toBe(1);
    });
  });

  describe("Test wajib: (a) Rentang siklus untuk cutoffDay", () => {
    it("cutoff 1 = bulan kalender", () => {
      const apr = getCycleRange(1, 2026, 4);
      expect(apr.startDate).toBe("2026-04-01");
      expect(apr.endDate).toBe("2026-04-30");
      expect(apr.daysCount).toBe(30);
      expect(apr.year).toBe(2026);
      expect(apr.month).toBe(4);

      const feb2026 = getCycleRange(1, 2026, 2);
      expect(feb2026.startDate).toBe("2026-02-01");
      expect(feb2026.endDate).toBe("2026-02-28");
      expect(feb2026.daysCount).toBe(28);

      const feb2024 = getCycleRange(1, 2024, 2);
      expect(feb2024.startDate).toBe("2024-02-01");
      expect(feb2024.endDate).toBe("2024-02-29");
      expect(feb2024.daysCount).toBe(29);
    });

    it("cutoff 10 -> '10 April - 09 Mei'", () => {
      const cycle = getCycleRange(10, 2026, 4);
      expect(cycle.startDate).toBe("2026-04-10");
      expect(cycle.endDate).toBe("2026-05-09");
      expect(cycle.daysCount).toBe(30);

      // Verify label with month format options
      expect(
        formatPeriodLabel(cycle.startDate, cycle.endDate, {
          locale: "id-ID",
          monthFormat: "long",
          includeYear: false,
        }),
      ).toBe("10 April - 09 Mei");

      expect(
        formatPeriodLabel(cycle.startDate, cycle.endDate, {
          locale: "id-ID",
          monthFormat: "short",
          includeYear: true,
        }),
      ).toBe("10 Apr - 09 Mei 2026");

      expect(
        formatPeriodLabel(cycle.startDate, cycle.endDate, {
          locale: "en-US",
          monthFormat: "short",
          includeYear: true,
        }),
      ).toBe("10 Apr - 09 May 2026");

      expect(
        formatPeriodLabel(cycle.startDate, cycle.endDate, "en-US"),
      ).toBe("10 Apr - 09 May 2026");
    });

    it("cutoff 29/30/31 melewati Februari (non-kabisat 2026)", () => {
      // Cutoff 31 in 2026
      const jan31 = getCycleRange(31, 2026, 1);
      expect(jan31.startDate).toBe("2026-01-31");
      expect(jan31.endDate).toBe("2026-02-27");
      expect(addDays(jan31.endDate, 1)).toBe("2026-02-28");

      const feb31 = getCycleRange(31, 2026, 2);
      expect(feb31.startDate).toBe("2026-02-28");
      expect(feb31.endDate).toBe("2026-03-30");
      expect(addDays(feb31.endDate, 1)).toBe("2026-03-31");

      // Cutoff 30 in 2026
      const jan30 = getCycleRange(30, 2026, 1);
      expect(jan30.startDate).toBe("2026-01-30");
      expect(jan30.endDate).toBe("2026-02-27");

      const feb30 = getCycleRange(30, 2026, 2);
      expect(feb30.startDate).toBe("2026-02-28");
      expect(feb30.endDate).toBe("2026-03-29");
      expect(addDays(feb30.endDate, 1)).toBe("2026-03-30");

      // Cutoff 29 in 2026
      const jan29 = getCycleRange(29, 2026, 1);
      expect(jan29.startDate).toBe("2026-01-29");
      expect(jan29.endDate).toBe("2026-02-27");

      const feb29 = getCycleRange(29, 2026, 2);
      expect(feb29.startDate).toBe("2026-02-28");
      expect(feb29.endDate).toBe("2026-03-28");
      expect(addDays(feb29.endDate, 1)).toBe("2026-03-29");
    });

    it("cutoff 29/30/31 melewati Februari (kabisat 2024)", () => {
      // Cutoff 31 in 2024
      const jan31 = getCycleRange(31, 2024, 1);
      expect(jan31.startDate).toBe("2024-01-31");
      expect(jan31.endDate).toBe("2024-02-28");
      expect(addDays(jan31.endDate, 1)).toBe("2024-02-29");

      const feb31 = getCycleRange(31, 2024, 2);
      expect(feb31.startDate).toBe("2024-02-29");
      expect(feb31.endDate).toBe("2024-03-30");
      expect(addDays(feb31.endDate, 1)).toBe("2024-03-31");

      // Cutoff 29 in 2024
      const jan29 = getCycleRange(29, 2024, 1);
      expect(jan29.startDate).toBe("2024-01-29");
      expect(jan29.endDate).toBe("2024-02-28");

      const feb29 = getCycleRange(29, 2024, 2);
      expect(feb29.startDate).toBe("2024-02-29");
      expect(feb29.endDate).toBe("2024-03-28");
      expect(addDays(feb29.endDate, 1)).toBe("2024-03-29");
    });

    it("pergantian tahun Des->Jan", () => {
      const decCycle = getCycleRange(10, 2026, 12);
      expect(decCycle.startDate).toBe("2026-12-10");
      expect(decCycle.endDate).toBe("2027-01-09");
      expect(decCycle.year).toBe(2026);
      expect(decCycle.month).toBe(12);

      const janCycle = getCycleRange(10, 2027, 1);
      expect(janCycle.startDate).toBe("2027-01-10");
      expect(janCycle.endDate).toBe("2027-02-09");

      expect(addDays(decCycle.endDate, 1)).toBe(janCycle.startDate);

      // Format label crossing years includes both years
      expect(
        formatPeriodLabel(decCycle.startDate, decCycle.endDate, {
          locale: "id-ID",
          includeYear: true,
        }),
      ).toBe("10 Des 2026 - 09 Jan 2027");
    });
  });

  describe("formatMonthLabel and formatPeriodLabel edge cases", () => {
    it("formats month label in Indonesian and English", () => {
      expect(formatMonthLabel(2026, 4, { locale: "id-ID", monthFormat: "long" })).toBe("April 2026");
      expect(formatMonthLabel(2026, 4, { locale: "id-ID", monthFormat: "short" })).toBe("Apr 2026");
      expect(formatMonthLabel(2026, 5, { locale: "en-US", monthFormat: "long" })).toBe("May 2026");
      expect(formatMonthLabel(2026, 8, { locale: "en-US", monthFormat: "short" })).toBe("Aug 2026");
    });

    it("handles invalid dates fallback in formatPeriodLabel", () => {
      expect(formatPeriodLabel("invalid-start", "invalid-end")).toBe("invalid-start - invalid-end");
    });
  });

  describe("Test wajib: (b) Siklus yang memuat tanggal tertentu", () => {
    it("hari ini tepat di cutoff", () => {
      const cycle = getCycleForDate(10, "2026-04-10");
      expect(cycle.startDate).toBe("2026-04-10");
      expect(cycle.endDate).toBe("2026-05-09");
      expect(cycle.month).toBe(4);
    });

    it("hari ini sebelum cutoff (masuk siklus sebelumnya)", () => {
      const cycle = getCycleForDate(10, "2026-04-09");
      expect(cycle.startDate).toBe("2026-03-10");
      expect(cycle.endDate).toBe("2026-04-09");
      expect(cycle.month).toBe(3);
    });

    it("hari ini setelah cutoff", () => {
      const cycle = getCycleForDate(10, "2026-04-25");
      expect(cycle.startDate).toBe("2026-04-10");
      expect(cycle.endDate).toBe("2026-05-09");
      expect(cycle.month).toBe(4);
    });

    it("sebelum cutoff di bulan Januari (masuk siklus Desember tahun sebelumnya)", () => {
      const cycle = getCycleForDate(10, "2026-01-05");
      expect(cycle.startDate).toBe("2025-12-10");
      expect(cycle.endDate).toBe("2026-01-09");
      expect(cycle.year).toBe(2025);
      expect(cycle.month).toBe(12);
    });

    it("falls back to today in Jakarta when date string is invalid", () => {
      const cycle = getCycleForDate(10, "invalid-date");
      expect(cycle.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe("Test wajib: Properti kesinambungan siklus (tanpa celah / tumpang tindih)", () => {
    const cutoffsToTest = [1, 5, 10, 20, 28, 29, 30, 31];

    for (const cutoff of cutoffsToTest) {
      it(`property holds for cutoff ${cutoff} across 24 consecutive months`, () => {
        let year = 2024;
        let month = 1;

        for (let i = 0; i < 24; i++) {
          const current = getCycleRange(cutoff, year, month);

          const nextMonth = month === 12 ? 1 : month + 1;
          const nextYear = month === 12 ? year + 1 : year;
          const next = getCycleRange(cutoff, nextYear, nextMonth);

          // Crucial invariant: akhir siklus N + 1 hari = awal siklus N+1
          expect(addDays(current.endDate, 1)).toBe(next.startDate);

          // Crucial invariant: hari inklusif harus match countDaysInPeriod
          expect(current.daysCount).toBe(
            countDaysInPeriod(current.startDate, current.endDate),
          );

          year = nextYear;
          month = nextMonth;
        }
      });
    }
  });

  describe("Test wajib: (g) Helper 'hari ini' Jakarta di sekitar 17:00 UTC", () => {
    it("evaluates before and at 17:00 UTC accurately for Asia/Jakarta (UTC+7)", () => {
      // 16:59:59 UTC on Oct 13 -> 23:59:59 WIB on Oct 13
      const beforeMidnightWib = new Date("2026-10-13T16:59:59.000Z");
      expect(getTodayInJakarta(beforeMidnightWib)).toBe("2026-10-13");

      // 17:00:00 UTC on Oct 13 -> 00:00:00 WIB on Oct 14
      const atMidnightWib = new Date("2026-10-13T17:00:00.000Z");
      expect(getTodayInJakarta(atMidnightWib)).toBe("2026-10-14");

      // 17:00:01 UTC on Oct 13 -> 00:00:01 WIB on Oct 14
      const afterMidnightWib = new Date("2026-10-13T17:00:01.000Z");
      expect(getTodayInJakarta(afterMidnightWib)).toBe("2026-10-14");
    });

    it("defaults to current date in Jakarta when called with no arguments", () => {
      const today = getTodayInJakarta();
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe("(c) Daftar siklus berurutan dari terbaru mundur", () => {
    it("generates N cycles backwards starting from reference date", () => {
      const cycles = getCycleList({
        cutoffDay: 10,
        referenceDate: "2026-04-15",
        count: 4,
      });

      expect(cycles).toHaveLength(4);
      expect(cycles[0].startDate).toBe("2026-04-10");
      expect(cycles[0].endDate).toBe("2026-05-09");

      expect(cycles[1].startDate).toBe("2026-03-10");
      expect(cycles[1].endDate).toBe("2026-04-09");

      expect(cycles[2].startDate).toBe("2026-02-10");
      expect(cycles[2].endDate).toBe("2026-03-09");

      expect(cycles[3].startDate).toBe("2026-01-10");
      expect(cycles[3].endDate).toBe("2026-02-09");
    });

    it("crosses year boundary backwards in getCycleList", () => {
      const cycles = getCycleList({
        cutoffDay: 10,
        referenceDate: "2026-01-15",
        count: 3,
      });

      expect(cycles).toHaveLength(3);
      expect(cycles[0].year).toBe(2026);
      expect(cycles[0].month).toBe(1);
      expect(cycles[1].year).toBe(2025);
      expect(cycles[1].month).toBe(12);
      expect(cycles[2].year).toBe(2025);
      expect(cycles[2].month).toBe(11);
    });

    it("stops generating when reaching earliestDate", () => {
      const cycles = getCycleList({
        cutoffDay: 1,
        referenceDate: "2026-04-15",
        earliestDate: "2026-02-20",
      });

      // Should include Apr, Mar, and Feb (since Feb covers 2026-02-20)
      expect(cycles).toHaveLength(3);
      expect(cycles[0].startDate).toBe("2026-04-01");
      expect(cycles[1].startDate).toBe("2026-03-01");
      expect(cycles[2].startDate).toBe("2026-02-01");
    });
  });

  describe("(e) Jumlah hari dalam periode (inklusif)", () => {
    it("calculates exact inclusive days without Date object string parsing", () => {
      expect(countDaysInPeriod("2026-04-01", "2026-04-30")).toBe(30);
      expect(countDaysInPeriod("2026-02-01", "2026-02-28")).toBe(28);
      expect(countDaysInPeriod("2024-02-01", "2024-02-29")).toBe(29);
      expect(countDaysInPeriod("2026-04-10", "2026-05-09")).toBe(30);
      expect(countDaysInPeriod("2026-04-10", "2026-04-10")).toBe(1);
      expect(countDaysInPeriod("2026-04-10", "2026-04-09")).toBe(0); // invalid/inverted
      expect(countDaysInPeriod("invalid", "2026-04-09")).toBe(0);
    });
  });

  describe("(f) Validasi rentang custom (sampai >= dari)", () => {
    it("validates correct date range", () => {
      const result = validateCustomPeriodRange("2026-01-01", "2026-05-31");
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(isValidDateRange("2026-01-01", "2026-05-31")).toBe(true);
    });

    it("allows equal start and end date (1-day period)", () => {
      const result = validateCustomPeriodRange("2026-05-01", "2026-05-01");
      expect(result.isValid).toBe(true);
      expect(isValidDateRange("2026-05-01", "2026-05-01")).toBe(true);
    });

    it("rejects when end date is earlier than start date", () => {
      const result = validateCustomPeriodRange("2026-05-31", "2026-05-01");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Tanggal selesai tidak boleh lebih awal");
      expect(isValidDateRange("2026-05-31", "2026-05-01")).toBe(false);
    });

    it("rejects malformed date strings", () => {
      expect(validateCustomPeriodRange("invalid", "2026-05-01").isValid).toBe(false);
      expect(validateCustomPeriodRange("2026-05-01", "invalid").isValid).toBe(false);
      expect(validateCustomPeriodRange("2026-02-30", "2026-03-01").isValid).toBe(false);
    });
  });
});
