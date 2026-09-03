import { useMemo } from "react";
import { Coins, Crown, Gem, Gift } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const TIERS = 20;
const XP_PER_TIER = 100;

export function SeasonScreen({ onRewards }: { onRewards?: () => void }) {
  const { profile } = useAuth();
  const xp = profile?.xp ?? 0;

  const { level, progress, pct } = useMemo(() => {
    const lvl = Math.min(TIERS, Math.floor(xp / XP_PER_TIER));
    return {
      level: lvl,
      progress: xp % XP_PER_TIER,
      pct: Math.min(100, Math.round(((xp % XP_PER_TIER) / XP_PER_TIER) * 100)),
    };
  }, [xp]);

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-ludo-gold/35 bg-ludo-panel/70 p-4 text-center">
        <p className="flex items-center justify-center gap-2 text-lg font-bold text-ludo-gold">
          <Crown className="size-5" /> الموسم 3
        </p>
        <p className="text-xs text-ludo-soft/80">المستوى {level} من {TIERS}</p>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-ludo-deep/70">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,#f6c32c,#f59e0b)]"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-1 text-[11px] text-ludo-soft/70">{progress}/{XP_PER_TIER} نقطة خبرة</p>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 8 }, (_, i) => level + i - 1).map((tier) => {
          const unlocked = tier >= 0 && tier <= level;
          return (
            <button
              key={tier}
              type="button"
              disabled={tier < 0}
              onClick={() =>
                toast[unlocked ? "success" : "error"](
                  unlocked ? `مكافأة المستوى ${tier} متاحة` : `يُفتح عند المستوى ${tier}`,
                )
              }
              className={cn(
                "grid place-items-center gap-1 rounded-xl border p-2 transition",
                unlocked
                  ? "border-ludo-gold bg-ludo-gold/15"
                  : "border-ludo-gold/20 bg-ludo-panel/50 opacity-70",
                tier < 0 && "invisible",
              )}
            >
              <Gift className={cn("size-6", unlocked ? "text-ludo-gold" : "text-ludo-soft/60")} />
              <span className="text-[10px] font-bold text-ludo-soft">{tier}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-4 rounded-xl border border-ludo-gold/25 bg-ludo-panel/60 p-3 text-sm">
        <span className="flex items-center gap-1 text-ludo-gold">
          <Coins className="size-4" /> {(profile?.gold ?? 0).toLocaleString("en-US")}
        </span>
        <span className="flex items-center gap-1 text-ludo-soft">
          <Gem className="size-4" /> {profile?.diamonds ?? 0}
        </span>
      </div>

      <Button variant="royal" className="w-full" onClick={() => onRewards?.()}>
        عرض المكافآت
      </Button>
    </div>
  );
}
