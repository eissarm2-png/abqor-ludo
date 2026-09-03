import { useMemo, useState } from "react";
import { Gem, Trophy } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

type Achievement = {
  code: string;
  title: string;
  target: number;
  current: number;
  reward: number;
};

const TABS = [
  { id: "all", label: "الكل" },
  { id: "done", label: "مكتملة" },
  { id: "open", label: "غير مكتملة" },
] as const;

export function AchievementsScreen() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("all");

  const list = useMemo<Achievement[]>(() => {
    const wins = profile?.wins ?? 0;
    const games = profile?.games ?? 0;
    const gold = profile?.gold ?? 0;
    return [
      { code: "w10", title: "اربح 10 مباريات", target: 10, current: wins, reward: 20 },
      { code: "g50", title: "العب 50 مباراة", target: 50, current: games, reward: 30 },
      { code: "gold100k", title: "اجمع 100,000 عملة", target: 100000, current: gold, reward: 50 },
      { code: "w50", title: "اربح 50 مباراة", target: 50, current: wins, reward: 80 },
    ];
  }, [profile]);

  const visible = list.filter((a) =>
    tab === "all" ? true : tab === "done" ? a.current >= a.target : a.current < a.target,
  );

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-bold transition",
              tab === t.id
                ? "border-ludo-gold bg-ludo-gold/20 text-ludo-gold"
                : "border-ludo-gold/25 bg-ludo-panel/60 text-ludo-soft",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <ul className="space-y-2">
        {visible.map((a) => {
          const pct = Math.min(100, Math.round((a.current / a.target) * 100));
          return (
            <li
              key={a.code}
              className="flex items-center gap-3 rounded-xl border border-ludo-gold/25 bg-ludo-panel/60 p-3"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-ludo-deep/70 text-ludo-gold">
                <Trophy className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-ludo-soft">{a.title}</span>
                <span className="mt-1 block h-2 overflow-hidden rounded-full bg-ludo-deep/70">
                  <span
                    className="block h-full rounded-full bg-[linear-gradient(90deg,#f6c32c,#f59e0b)]"
                    style={{ width: `${pct}%` }}
                  />
                </span>
                <span className="mt-0.5 block text-[10px] text-ludo-soft/70">
                  {Math.min(a.current, a.target).toLocaleString("en-US")}/
                  {a.target.toLocaleString("en-US")}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-ludo-soft">
                <Gem className="size-4" /> {a.reward}
              </span>
            </li>
          );
        })}
        {!visible.length && (
          <li className="rounded-xl border border-ludo-gold/25 bg-ludo-panel/60 p-6 text-center text-sm text-ludo-soft/80">
            لا توجد إنجازات في هذا التصنيف
          </li>
        )}
      </ul>
    </div>
  );
}
