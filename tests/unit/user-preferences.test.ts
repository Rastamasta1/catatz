import { describe, expect, it } from "vitest";
import {
  DEFAULT_USER_PREFERENCES,
  normalizeUserPreferences,
  validateUserPreferenceUpdate,
} from "@/lib/user-preferences";

describe("user preferences helpers and validation", () => {
  it("provides sensible default preferences including rekap configuration", () => {
    expect(DEFAULT_USER_PREFERENCES.theme).toBe("system");
    expect(DEFAULT_USER_PREFERENCES.currency).toBe("IDR");
    expect(DEFAULT_USER_PREFERENCES.default_landing_page).toBe("/transactions");
    expect(DEFAULT_USER_PREFERENCES.rekap_start_day).toBe(1);
    expect(DEFAULT_USER_PREFERENCES.rekap_accumulate_balance).toBe(true);
  });

  describe("normalizeUserPreferences", () => {
    it("returns default values when input is null, undefined, or empty", () => {
      expect(normalizeUserPreferences()).toEqual(DEFAULT_USER_PREFERENCES);
      expect(normalizeUserPreferences(null)).toEqual(DEFAULT_USER_PREFERENCES);
      expect(normalizeUserPreferences({})).toEqual(DEFAULT_USER_PREFERENCES);
    });

    it("normalizes valid rekap_start_day and rekap_accumulate_balance", () => {
      const normalized = normalizeUserPreferences({
        rekap_start_day: 15,
        rekap_accumulate_balance: false,
      });

      expect(normalized.rekap_start_day).toBe(15);
      expect(normalized.rekap_accumulate_balance).toBe(false);
    });

    it("falls back to defaults for invalid rekap_start_day and rekap_accumulate_balance", () => {
      expect(normalizeUserPreferences({ rekap_start_day: 0 }).rekap_start_day).toBe(1);
      expect(normalizeUserPreferences({ rekap_start_day: 32 }).rekap_start_day).toBe(1);
      expect(normalizeUserPreferences({ rekap_start_day: 15.5 }).rekap_start_day).toBe(1);
      expect(normalizeUserPreferences({ rekap_start_day: "15" as unknown as number }).rekap_start_day).toBe(1);
      expect(normalizeUserPreferences({ rekap_accumulate_balance: "true" as unknown as boolean }).rekap_accumulate_balance).toBe(true);
    });
  });

  describe("validateUserPreferenceUpdate", () => {
    it("validates and accepts valid rekap_start_day", () => {
      const result = validateUserPreferenceUpdate({ rekap_start_day: 25 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.rekap_start_day).toBe(25);
      }

      const stringResult = validateUserPreferenceUpdate({ rekap_start_day: "10" });
      expect(stringResult.success).toBe(true);
      if (stringResult.success) {
        expect(stringResult.data.rekap_start_day).toBe(10);
      }
    });

    it("rejects out-of-range or non-integer rekap_start_day", () => {
      expect(validateUserPreferenceUpdate({ rekap_start_day: 0 })).toEqual({
        success: false,
        error: "Tanggal mulai rekap harus antara 1 dan 31",
      });
      expect(validateUserPreferenceUpdate({ rekap_start_day: 32 })).toEqual({
        success: false,
        error: "Tanggal mulai rekap harus antara 1 dan 31",
      });
      expect(validateUserPreferenceUpdate({ rekap_start_day: 12.3 })).toEqual({
        success: false,
        error: "Tanggal mulai rekap harus antara 1 dan 31",
      });
      expect(validateUserPreferenceUpdate({ rekap_start_day: "abc" })).toEqual({
        success: false,
        error: "Tanggal mulai rekap harus antara 1 dan 31",
      });
    });

    it("validates and accepts valid rekap_accumulate_balance", () => {
      const resultFalse = validateUserPreferenceUpdate({ rekap_accumulate_balance: false });
      expect(resultFalse.success).toBe(true);
      if (resultFalse.success) {
        expect(resultFalse.data.rekap_accumulate_balance).toBe(false);
      }

      const resultTrue = validateUserPreferenceUpdate({ rekap_accumulate_balance: true });
      expect(resultTrue.success).toBe(true);
      if (resultTrue.success) {
        expect(resultTrue.data.rekap_accumulate_balance).toBe(true);
      }
    });

    it("rejects non-boolean rekap_accumulate_balance", () => {
      expect(validateUserPreferenceUpdate({ rekap_accumulate_balance: "false" })).toEqual({
        success: false,
        error: "Preferensi akumulasi saldo tidak valid",
      });
    });

    it("rejects unknown keys and empty updates", () => {
      expect(validateUserPreferenceUpdate({ unknown_key: "value" })).toEqual({
        success: false,
        error: "Preferensi unknown_key tidak valid",
      });
      expect(validateUserPreferenceUpdate({})).toEqual({
        success: false,
        error: "Tidak ada preferensi yang diperbarui",
      });
    });
  });
});
