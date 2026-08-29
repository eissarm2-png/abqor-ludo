import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { fetchTransactions, type LedgerEntry } from "@/lib/economy.functions";
import { ART, Amount, arabicTime, kindArt, kindLabel } from "./economy-visuals";

export function LedgerPanel({ signedIn }: { signedIn: boolean }) {
  const load = useServerFn(fetchTransactions);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!signedIn) {
      setEntries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await load({});
      setEntries(res.entries ?? []);
    } finally {
      setLoading(false);
    }
  }, [load, signedIn]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!signedIn) {
    return (
      <p className="glossy-card text-center text-sm text-ludo-soft">
        سجّل الدخول لعرض كل معاملاتك من الصناديق والمهام والمباريات.
      </p>
    );
  }

  if (loading) {
    return (
      <div className="grid place-items-center py-10 text-ludo-gold">
        <Loader2 className="size-8 animate-spin" />
      </div>
    );
  }

  if (!entries.length) {
    return (
      <div className="glossy-card text-center">
        <img
          src={ART.gift}
          alt=""
          width={512}
          height={512}
          loading="lazy"
          className="asset-shine relative mx-auto size-20"
        />
        <p className="relative mt-2 text-sm text-ludo-soft">لا توجد معاملات بعد — افتح صندوقًا أو أكمل مهمة.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="ribbon-title mb-4">سجل المعاملات</h3>
      {entries.map((e) => (
        <article key={e.id} className="ledger-row">
          <img src={kindArt(e.kind)} alt="" width={512} height={512} loading="lazy" />
          <div className="min-w-0 flex-1">
            <b className="block text-sm text-ludo-gold">{kindLabel(e.kind)}</b>
            <small className="block text-[11px] text-ludo-soft">{arabicTime(e.created_at)}</small>
            <small className="block font-mono text-[10px] text-ludo-soft/70">#{e.id.slice(0, 8)}</small>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
            {e.gold_delta !== 0 && <Amount art={ART.gold} value={e.gold_delta} tone="var(--ludo-gold)" />}
            {e.diamonds_delta !== 0 && (
              <Amount art={ART.diamonds} value={e.diamonds_delta} tone="var(--ludo-lagoon)" />
            )}
            {e.xp_delta !== 0 && <Amount art={ART.xp} value={e.xp_delta} tone="var(--ludo-pink)" />}
            <span className="ledger-amount text-ludo-palm">مؤكدة</span>
          </div>
        </article>
      ))}
    </div>
  );
}
