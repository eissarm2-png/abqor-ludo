import { Crown, Home, Swords, Route } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEATS } from "@/lib/ludo/board";

export type MatchEvent = {
  kind: "enter" | "move" | "capture" | "home";
  seat: 0 | 1 | 2 | 3;
  seatLabel: string;
  from: number;
  to: number;
  die: number;
  at: number;
};

type Props = {
  winnerName: string;
  events: MatchEvent[];
  onRestart: () => void;
  onHome: () => void;
};

const LABEL: Record<MatchEvent["kind"], string> = {
  enter: "دخول عند 6",
  move: "حركة",
  capture: "التقاط خصم",
  home: "وصول للمنزل",
};

function pathLabel(offset: number) {
  if (offset < 0) return "الحوش";
  if (offset >= 56) return "المنزل";
  if (offset > 50) return `الممر ${offset - 50}`;
  return `الخانة ${offset + 1}`;
}

/** ملخص بعد إعلان الفوز: مسار آخر حركة + أهم لقطات الالتقاط والوصول */
export function MatchSummary({ winnerName, events, onRestart, onHome }: Props) {
  const last = events[events.length - 1];
  const captures = events.filter((e) => e.kind === "capture").slice(-4);
  const homes = events.filter((e) => e.kind === "home").slice(-4);

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-ludo-deep/85 p-4 backdrop-blur-sm" dir="rtl">
      <div className="royal-panel celebrate-pop max-h-[92vh] w-full max-w-sm overflow-y-auto p-5 text-center">
        <Crown className="mx-auto size-16 text-ludo-gold" fill="currentColor" />
        <h2 className="title-ribbon text-xl">مبروك الفوز!</h2>
        <p className="my-3 text-base">{winnerName} هو ملك الطاولة</p>

        {last && (
          <section className="mb-3 rounded-xl border border-ludo-gold/35 bg-ludo-panel/70 p-3 text-right">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-ludo-gold">
              <Route className="size-4" /> مسار آخر حركة
            </h3>
            <p className="text-xs text-ludo-soft">
              {last.seatLabel} — {LABEL[last.kind]} بنرد {last.die}:{" "}
              <b className="text-ludo-pink">{pathLabel(last.from)}</b> ← <b className="text-ludo-gold">{pathLabel(last.to)}</b>
            </p>
          </section>
        )}

        <Highlights title="أهم لقطات الالتقاط" icon={<Swords className="size-4" />} rows={captures} empty="لا التقاط في هذه المباراة" />
        <Highlights title="الوصول للمنزل" icon={<Home className="size-4" />} rows={homes} empty="لا وصول مسجّل" />

        <Button variant="play" size="xl" className="mt-4 w-full" onClick={onRestart}>لعبة جديدة</Button>
        <Button variant="ghostGold" className="mt-2 w-full" onClick={onHome}>العودة للرئيسية</Button>
      </div>
    </div>
  );
}

function Highlights({ title, icon, rows, empty }: { title: string; icon: React.ReactNode; rows: MatchEvent[]; empty: string }) {
  return (
    <section className="mb-3 rounded-xl border border-ludo-gold/35 bg-ludo-panel/70 p-3 text-right">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-ludo-gold">{icon} {title}</h3>
      {rows.length === 0 ? (
        <p className="text-xs text-ludo-soft">{empty}</p>
      ) : (
        <ul className="space-y-1">
          {rows.map((e, i) => (
            <li key={i} className="flex items-center gap-2 text-xs">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: `var(--ludo-${SEATS[e.seat].token})` }}
              />
              <span className="min-w-0 flex-1 truncate text-ludo-soft">
                {e.seatLabel} — {pathLabel(e.from)} ← {pathLabel(e.to)}
              </span>
              <b className="shrink-0 text-ludo-gold">نرد {e.die}</b>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
