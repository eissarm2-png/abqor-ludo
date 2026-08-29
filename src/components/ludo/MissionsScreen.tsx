import { useCallback, useEffect, useState } from "react";
import { CalendarClock, CheckCircle2, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { claimMission, fetchMissions, type Mission } from "@/lib/economy.functions";
import { sfx } from "@/lib/audio";
import { cn } from "@/lib/utils";
import { ART } from "./economy-visuals";

const REASONS: Record<string, string> = {
  not_claimable: "المهمة غير مكتملة أو تم استلامها مسبقًا",
  unknown_mission: "هذه المهمة غير متاحة الآن",
};

function resetLabel(iso: string | null) {
  if (!iso) return "";
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "يتجدد الآن";
  const hours = Math.floor(ms / 3_600_000);
  if (hours >= 24) return `يتجدد بعد ${Math.floor(hours / 24)} يوم`;
  if (hours >= 1) return `يتجدد بعد ${hours} ساعة`;
  return `يتجدد بعد ${Math.max(1, Math.round(ms / 60_000))} دقيقة`;
}

export function MissionsPanel({
  signedIn,
  onWalletChange,
}: {
  signedIn: boolean;
  onWalletChange: () => void;
}) {
  const load = useServerFn(fetchMissions);
  const claim = useServerFn(claimMission);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!signedIn) {
      setMissions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await load({});
      setMissions(res.missions ?? []);
    } finally {
      setLoading(false);
    }
  }, [load, signedIn]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onClaim = async (code: string) => {
    setBusy(code);
    setNote(null);
    try {
      const res = await claim({ data: { code } });
      if (res.ok) {
        sfx.home();
        setNote(`تم الاستلام: ${res.gold} ذهب${res.diamonds ? ` و ${res.diamonds} جوهرة` : ""} و ${res.xp} خبرة`);
        onWalletChange();
      } else {
        setNote(REASONS[res.reason] ?? "لم يتم الاستلام، حاول لاحقًا");
      }
      await refresh();
    } finally {
      setBusy(null);
    }
  };

  if (!signedIn) {
    return (
      <p className="glossy-card text-center text-sm text-ludo-soft">
        سجّل الدخول لتتبّع مهامك اليومية والأسبوعية واستلام مكافآتها.
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

  const groups: [string, "daily" | "weekly", string][] = [
    ["مهام اليوم", "daily", "تتصفّر كل يوم"],
    ["مهام الأسبوع", "weekly", "تتصفّر كل أسبوع"],
  ];

  return (
    <div className="space-y-4">
      {note && (
        <p className="ledger-row justify-center text-center text-xs text-ludo-gold">{note}</p>
      )}
      {groups.map(([title, period, hint]) => {
        const items = missions.filter((m) => m.period === period);
        if (!items.length) return null;
        return (
          <section key={period}>
            <header className="mb-2 flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 font-display font-black text-ludo-gold">
                <img
                  src={period === "daily" ? ART.mission : ART.gift}
                  alt=""
                  width={512}
                  height={512}
                  loading="lazy"
                  className="asset-shine size-8"
                />
                {title}
              </h3>
              <small className="flex items-center gap-1 text-ludo-soft">
                <CalendarClock className="size-4" />
                {resetLabel(items[0]?.resets_at ?? null) || hint}
              </small>
            </header>
            <div className="space-y-2">
              {items.map((m) => {
                const pct = Math.min(100, Math.round((m.progress / m.goal) * 100));
                return (
                  <article
                    key={m.code}
                    className={cn("mission-card", m.claimed && "mission-card-claimed")}
                  >
                    <div className="relative flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <b className="block text-sm text-ludo-gold">{m.title}</b>
                        <small className="text-ludo-soft">{m.description}</small>
                      </div>
                      <div className="flex shrink-0 items-center gap-2 text-xs">
                        <span className="ledger-amount text-ludo-gold">
                          <img src={ART.gold} alt="" width={512} height={512} loading="lazy" className="size-4" />
                          {m.reward_gold}
                        </span>
                        {m.reward_diamonds > 0 && (
                          <span className="ledger-amount text-ludo-lagoon">
                            <img src={ART.diamonds} alt="" width={512} height={512} loading="lazy" className="size-4" />
                            {m.reward_diamonds}
                          </span>
                        )}
                        <span className="ledger-amount text-ludo-pink">+{m.reward_xp} XP</span>
                      </div>
                    </div>

                    <div className="relative mt-3 flex items-center gap-3">
                      <div className="mission-track min-w-0 flex-1">
                        <span
                          className={cn("mission-fill", pct >= 100 && "mission-fill-done")}
                          style={{ width: `${pct}%` }}
                        />
                        <b>{pct}%</b>
                      </div>
                      <small className="shrink-0 tabular-nums text-ludo-soft">
                        {m.progress}/{m.goal}
                      </small>
                      {m.claimed ? (
                        <span className="flex shrink-0 items-center gap-1 text-xs text-ludo-palm">
                          <CheckCircle2 className="size-4" /> مستلمة
                        </span>
                      ) : (
                        <Button
                          variant={m.claimable ? "play" : "neon"}
                          size="sm"
                          disabled={!m.claimable || busy === m.code}
                          onClick={() => void onClaim(m.code)}
                        >
                          {busy === m.code ? <Loader2 className="size-4 animate-spin" /> : "استلم"}
                        </Button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
