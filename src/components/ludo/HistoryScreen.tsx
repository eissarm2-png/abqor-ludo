import { useEffect, useState } from "react";
import { History, Crown, Skull } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Row = {
  id: string;
  result: string;
  players: number;
  points: number;
  duration_ms: number;
  created_at: string;
};

function formatWhen(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("ar", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(ms: number) {
  if (!ms) return "—";
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m ? `${m}د ${s}ث` : `${s}ث`;
}

export function MatchHistory({ meId }: { meId: string | null }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!meId) {
      setRows([]);
      return;
    }
    let alive = true;
    void supabase
      .from("game_results")
      .select("id, result, players, points, duration_ms, created_at")
      .order("created_at", { ascending: false })
      .limit(25)
      .then(({ data, error: err }) => {
        if (!alive) return;
        if (err) setError("تعذّر تحميل سجل المباريات");
        setRows((data ?? []) as Row[]);
      });
    return () => {
      alive = false;
    };
  }, [meId]);

  if (!meId) {
    return <p className="py-10 text-center text-ludo-soft">سجّل الدخول لعرض سجل مبارياتك</p>;
  }
  if (rows === null) return <p className="py-10 text-center text-ludo-soft">جارٍ تحميل السجل…</p>;
  if (error) return <p className="py-10 text-center text-ludo-ruby">{error}</p>;
  if (!rows.length) {
    return (
      <div className="py-10 text-center">
        <History className="mx-auto size-14 text-ludo-gold/70" />
        <p className="mt-3 text-ludo-soft">لا توجد مباريات بعد — العب أول مباراة وستظهر هنا</p>
      </div>
    );
  }

  const last = rows[0];

  return (
    <div className="space-y-2">
      {last && (
        <p className="mb-3 text-center text-xs text-ludo-soft">
          آخر تحديث: <b className="text-ludo-gold">{formatWhen(last.created_at)}</b>
        </p>
      )}
      {rows.map((row) => {
        const win = row.result === "win";
        return (
          <div key={row.id} className="list-card">
            <span
              className={cn(
                "avatar-orb",
                win ? "bg-ludo-palm text-ludo-deep" : "bg-ludo-ruby text-ludo-soft",
              )}
            >
              {win ? <Crown /> : <Skull />}
            </span>
            <span className="min-w-0 flex-1">
              <b className={cn("block truncate", win ? "text-ludo-palm" : "text-ludo-ruby")}>
                {win ? "فوز" : "خسارة"} · {row.players} لاعبين
              </b>
              <small className="text-ludo-soft">
                {formatWhen(row.created_at)} · المدة {formatDuration(row.duration_ms)}
              </small>
            </span>
            <span className="shrink-0 font-bold text-ludo-gold">+{row.points}</span>
          </div>
        );
      })}
    </div>
  );
}
