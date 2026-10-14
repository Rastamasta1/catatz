import { SlidersHorizontal } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TIPE_TABS } from "@/constants/transaksi";
import { cn } from "@/lib/utils";
import type { TransaksiSchema } from "@/validations/transaksi-validation";

type TransaksiTipeTabsProps = {
  isCorrection: boolean;
  tipe: TransaksiSchema["tipe"];
  onTipeChange: (tipe: TransaksiSchema["tipe"]) => void;
};

export function TransaksiTipeTabs({
  isCorrection,
  tipe,
  onTipeChange,
}: TransaksiTipeTabsProps) {
  if (isCorrection) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
        <SlidersHorizontal className="h-4 w-4 text-amber-600 shrink-0" />
        <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
          Koreksi Saldo
        </span>
        <span className="text-xs text-amber-600 dark:text-amber-500 ml-auto">
          Tipe tidak dapat diubah
        </span>
      </div>
    );
  }

  return (
    <Tabs
      value={tipe}
      onValueChange={(v) => onTipeChange(v as TransaksiSchema["tipe"])}
    >
      <TabsList className="w-full grid grid-cols-3">
        {TIPE_TABS.map((t) => (
          <TabsTrigger
            key={t.value}
            value={t.value}
            className={cn("text-xs", t.color)}
          >
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
