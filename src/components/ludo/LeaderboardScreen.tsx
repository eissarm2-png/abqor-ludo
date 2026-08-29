import { useEffect, useState } from "react";
import { Crown, Medal, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Row = {
  id: string;
  display_name: string;
  avatar: string;
  points: number;
  wins: number;
  updated_at: string;
};

export function Leaderboard({ meId }: { meId?: string | null }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, avatar, points, wins, updated_at")
      .order("points", { ascending: false })
      .order("wins", { ascending: false })
      .limit(50);
    setRows((data as Row[] | null) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  if (loading && !rows) return <p className="py-10 text-center text-ludo-soft">جارٍ تحميل المتصدرين…</p>;

  if (!rows?.length) {
    return (
      <div className="reward-hero">
        <Medal className="size-16 text-ludo-gold" />
        <b>لا يوجد متصدرون بعد</b>
        <span className="text-sm text-ludo-soft">أنشئ حسابًا واربح أول لعبة لتكون في القمة!</span>
        <Button variant="neon" size="sm" className="mt-3" onClick={() => void load()}>
          <RefreshCw /> تحديث
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-ludo-soft">الترتيب حسب النقاط ثم عدد الفوزات</p>
        <Button variant="ghostGold" size="sm" onClick={() => void load()}><RefreshCw className="size-4" /></Button>
      </div>
      {rows.map((row, i) => (
        <div key={row.id} className={cn("list-card", row.id === meId && "ring-2 ring-ludo-gold")}>
          <span className={cn("rank-badge", i === 0 && "rank-gold", i === 1 && "rank-silver", i === 2 && "rank-bronze")}>
            {i < 3 ? <Crown className="size-4" /> : i + 1}
          </span>
          <span className="avatar-orb bg-ludo-purple text-lg">{row.avatar || "👑"}</span>
          <span className="min-w-0 flex-1">
            <b className="block truncate text-sm">{row.display_name}</b>
            <small className="text-ludo-soft">{row.wins} فوز · آخر تحديث {formatDate(row.updated_at)}</small>
          </span>
          <b className="text-ludo-gold">{row.points}</b>
        </div>
      ))}
    </div>
  );
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("ar", { day: "numeric", month: "short" }).format(new Date(value));
  } catch {
    return "—";
  }
}
