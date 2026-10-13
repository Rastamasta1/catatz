"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateRekapSettings } from "@/actions/rekap-period-action";
import type { RekapSettings } from "@/types/rekap";
import { getCycleForDate, getTodayInJakarta } from "@/lib/rekap-period";

export type RekapSettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: RekapSettings;
  onSettingsSaved?: (newSettings: RekapSettings) => void;
};

const CUTOFF_DAYS = Array.from({ length: 31 }, (_, index) => index + 1);

function RekapSettingsForm({
  settings,
  onOpenChange,
  onSettingsSaved,
}: {
  settings: RekapSettings;
  onOpenChange: (open: boolean) => void;
  onSettingsSaved?: (newSettings: RekapSettings) => void;
}) {
  const router = useRouter();
  const [selectedCutoff, setSelectedCutoff] = useState<number>(settings.cutoff_day);
  const [akumulasiSaldo, setAkumulasiSaldo] = useState<boolean>(settings.akumulasi_saldo);
  const [isSaving, setIsSaving] = useState(false);

  // Pratinjau siklus berjalan secara instan berdasarkan pilihan cut-off hari
  const runningCycle = useMemo(() => {
    const today = getTodayInJakarta();
    return getCycleForDate(selectedCutoff, today);
  }, [selectedCutoff]);

  const handleSave = async () => {
    if (isSaving) return;

    const previousSettings = { ...settings };
    const optimisticSettings: RekapSettings = {
      ...settings,
      cutoff_day: selectedCutoff,
      akumulasi_saldo: akumulasiSaldo,
    };

    // Terapkan state optimistik ke callback parent
    onSettingsSaved?.(optimisticSettings);
    setIsSaving(true);

    try {
      const res = await updateRekapSettings({
        cutoff_day: selectedCutoff,
        akumulasi_saldo: akumulasiSaldo,
      });

      if (!res.success || !res.data) {
        // Rollback ke pengaturan sebelumnya bila terjadi kegagalan
        onSettingsSaved?.(previousSettings);
        setSelectedCutoff(previousSettings.cutoff_day);
        setAkumulasiSaldo(previousSettings.akumulasi_saldo);
        toast.error(res.error || "Gagal menyimpan pengaturan rekap");
        return;
      }

      onSettingsSaved?.(res.data);
      toast.success("Pengaturan rekap berhasil disimpan");
      onOpenChange(false);
      router.refresh();
    } catch {
      // Rollback ke pengaturan sebelumnya bila exception tertangkap
      onSettingsSaved?.(previousSettings);
      setSelectedCutoff(previousSettings.cutoff_day);
      setAkumulasiSaldo(previousSettings.akumulasi_saldo);
      toast.error("Terjadi kesalahan saat menyimpan pengaturan");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Pengaturan Rekap</DialogTitle>
        <DialogDescription>
          Sesuaikan tanggal mulai siklus keuangan dan metode perhitungan saldo.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-5">
        {/* Tanggal Cut-off (1-31) */}
        <div className="space-y-2">
          <Label htmlFor="cutoff-select" className="text-sm font-medium">
            Tanggal Mulai Siklus (Cut-off)
          </Label>
          <Select
            value={String(selectedCutoff)}
            onValueChange={(val) => setSelectedCutoff(Number(val))}
          >
            <SelectTrigger
              id="cutoff-select"
              aria-label="Pilih tanggal mulai siklus"
              className="h-12 w-full rounded-input border-hairline"
            >
              <SelectValue placeholder="Pilih tanggal" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {CUTOFF_DAYS.map((day) => (
                <SelectItem key={day} value={String(day)}>
                  {day === 1 ? "Tanggal 1 (Bulan kalender)" : `Tanggal ${day}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Siklus berjalan otomatis berakhir satu hari sebelum tanggal cut-off berikutnya.
          </p>
        </div>

        {/* Pratinjau Siklus Berjalan */}
        <div className="rounded-card border border-hairline bg-surface-soft p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Pratinjau Siklus Berjalan
          </p>
          <p className="mt-1 font-mono text-base font-semibold text-foreground">
            {runningCycle.label}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Rentang aktif: <span className="font-mono">{runningCycle.startDate}</span> s/d{" "}
            <span className="font-mono">{runningCycle.endDate}</span> ({runningCycle.daysCount} hari inklusif)
          </p>
        </div>

        {/* Switch Saldo Akumulasi */}
        <div className="flex items-start justify-between gap-4 rounded-card border border-hairline bg-card p-4">
          <div className="min-w-0 flex-1">
            <Label
              htmlFor="switch-akumulasi"
              className="text-sm font-medium leading-none cursor-pointer"
            >
              Saldo Akumulasi
            </Label>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
              Sertakan sisa saldo dari siklus sebelumnya sebagai saldo awal siklus berjalan.
              Jika dinonaktifkan, saldo awal dimulai dari nol.
            </p>
          </div>
          <Switch
            id="switch-akumulasi"
            checked={akumulasiSaldo}
            onCheckedChange={setAkumulasiSaldo}
            aria-label="Saldo Akumulasi"
            className="mt-0.5"
          />
        </div>
      </div>

      <DialogFooter className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={isSaving}
          className="w-full rounded-full sm:w-auto"
        >
          Batal
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="h-11 w-full rounded-full bg-primary px-5 text-white hover:bg-primary-active sm:w-auto"
        >
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Simpan
        </Button>
      </DialogFooter>
    </>
  );
}

export function RekapSettingsDialog({
  open,
  onOpenChange,
  settings,
  onSettingsSaved,
}: RekapSettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm sm:max-w-md">
        {open && (
          <RekapSettingsForm
            key={`${settings.cutoff_day}-${settings.akumulasi_saldo}`}
            settings={settings}
            onOpenChange={onOpenChange}
            onSettingsSaved={onSettingsSaved}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
