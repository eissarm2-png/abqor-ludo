import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { LedgerPanel } from "./LedgerScreen";
import { cn } from "@/lib/utils";

/** نظام الاقتصاد: المحفظة وسجل العمليات */
export function WalletScreen({ onStore }: { onStore: () => void }) {
  const { user, profile } = useAuth();
  const [tab, setTab] = useState<"wallet" | "ledger">("wallet");

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 rounded-xl border border-ludo-gold/30 bg-ludo-panel/60 p-1">
        {(["wallet", "ledger"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-bold transition",
              tab === t ? "bg-ludo-gold text-ludo-deep" : "text-ludo-soft",
            )}
          >
            {t === "wallet" ? "المحفظة" : "سجل العمليات"}
          </button>
        ))}
      </div>

      {tab === "wallet" ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div className="glossy-card flex items-center justify-center gap-2 p-3 text-lg font-bold text-ludo-gold">
              🪙 {(profile?.gold ?? 0).toLocaleString("en-US")}
            </div>
            <div className="glossy-card flex items-center justify-center gap-2 p-3 text-lg font-bold text-ludo-lagoon">
              💎 {(profile?.diamonds ?? 0).toLocaleString("en-US")}
            </div>
          </div>

          <section className="glossy-card space-y-2 p-3">
            <h4 className="relative text-center text-sm font-bold text-ludo-gold">كيف تكسب العملات والجواهر</h4>
            <ul className="relative space-y-1 text-xs text-ludo-soft">
              <li>• الفوز بالمباريات يمنحك ذهبًا ونقاط خبرة.</li>
              <li>• إكمال المهام اليومية والأسبوعية يمنح ذهبًا وجواهر.</li>
              <li>• فتح الصناديق المجانية كل فترة يمنح مكافآت وعناصر.</li>
            </ul>
            <Button variant="royal" className="relative w-full" onClick={onStore}>
              اذهب إلى المتجر
            </Button>
          </section>

          {!user && (
            <p className="glossy-card text-center text-xs text-ludo-soft">سجّل الدخول لعرض رصيدك وسجل عملياتك.</p>
          )}
        </>
      ) : (
        <LedgerPanel signedIn={Boolean(user)} />
      )}
    </div>
  );
}
