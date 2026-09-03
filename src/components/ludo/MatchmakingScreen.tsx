import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Radar, Users, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type PublicRoom = {
  id: string;
  name: string;
  code: string;
  mode: string;
  max_players: number;
  members: number;
  host_name: string;
};

/**
 * البحث عن لاعب: بحث حقيقي في الغرف العامة، ينضم لأول غرفة فيها مكان،
 * وإن لم يجد ينشئ غرفة عامة وينتقل إلى ردهة "انتظار اللاعبين".
 */
export function MatchmakingScreen({
  mode = "ludo",
  maxPlayers = 4,
  onJoined,
  onCancel,
}: {
  mode?: "ludo" | "domino";
  maxPlayers?: 2 | 3 | 4;
  onJoined: (code: string) => void;
  onCancel: () => void;
}) {
  const [seconds, setSeconds] = useState(0);
  const [found, setFound] = useState<PublicRoom[]>([]);
  const [busy, setBusy] = useState(false);
  const done = useRef(false);

  const join = useCallback(
    async (code: string) => {
      if (done.current) return;
      done.current = true;
      setBusy(true);
      const { data, error } = await supabase.rpc("join_room", { _code: code } as never);
      const row = Array.isArray(data) ? (data[0] as { ok: boolean; reason: string } | undefined) : undefined;
      if (error || !row?.ok) {
        done.current = false;
        setBusy(false);
        toast.error(row?.reason ?? "تعذّر الانضمام، نواصل البحث");
        return;
      }
      toast.success("تم العثور على غرفة — جارٍ الدخول");
      onJoined(code);
    },
    [onJoined],
  );

  const createOwn = useCallback(async () => {
    if (done.current) return;
    done.current = true;
    setBusy(true);
    const { data, error } = await supabase.rpc("create_room", {
      _name: "مباراة سريعة",
      _max: maxPlayers,
      _mode: mode,
      _public: true,
    } as never);
    const row = Array.isArray(data) ? (data[0] as { code: string } | undefined) : undefined;
    if (error || !row?.code) {
      done.current = false;
      setBusy(false);
      toast.error("تعذّر إنشاء غرفة المباراة");
      return;
    }
    toast.success("أنشأنا غرفة — بانتظار اللاعبين");
    onJoined(row.code);
  }, [maxPlayers, mode, onJoined]);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      const { data } = await supabase.rpc("list_public_rooms" as never);
      if (cancelled) return;
      const rooms = ((data as PublicRoom[] | null) ?? []).filter(
        (r) => r.mode === mode && r.members < r.max_players,
      );
      setFound(rooms);
      if (rooms[0]) void join(rooms[0].code);
    };
    void tick();
    const poll = window.setInterval(() => void tick(), 2500);
    const clock = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => {
      cancelled = true;
      window.clearInterval(poll);
      window.clearInterval(clock);
    };
  }, [join, mode]);

  useEffect(() => {
    if (seconds === 20 && !done.current) void createOwn();
  }, [seconds, createOwn]);

  return (
    <div className="space-y-4" dir="rtl">
      <section className="royal-panel grid place-items-center p-6 text-center">
        <span className={cn("relative grid size-28 place-items-center rounded-full border-2 border-ludo-gold/70 bg-ludo-plum")}>
          <Radar className="size-14 animate-pulse text-ludo-gold" />
        </span>
        <h2 className="title-ribbon mt-4 text-lg">البحث عن لاعب…</h2>
        <p className="mt-1 text-sm text-ludo-soft">
          {mode === "domino" ? "دومينو" : "لودو"} · {maxPlayers} لاعبين
        </p>
        <p className="my-2 font-mono text-2xl font-black text-ludo-gold">
          {String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}
        </p>
        <p className="text-xs text-ludo-soft/80">
          {seconds < 20
            ? "نبحث عن غرف عامة فيها مكان شاغر"
            : "لم نجد غرفة — أنشأنا غرفة وننتظر انضمام اللاعبين"}
        </p>
        {busy && <Loader2 className="mt-2 size-6 animate-spin text-ludo-gold" />}
      </section>

      <section className="rounded-xl border border-ludo-gold/35 bg-ludo-panel/70 p-3">
        <h3 className="mb-2 flex items-center gap-2 font-bold text-ludo-gold">
          <Users className="size-4" /> غرف متاحة الآن ({found.length})
        </h3>
        {found.length === 0 ? (
          <p className="py-3 text-center text-sm text-ludo-soft">لا توجد غرف متاحة حاليًا…</p>
        ) : (
          <div className="space-y-2">
            {found.slice(0, 5).map((r) => (
              <button
                key={r.id}
                type="button"
                className="list-card w-full press-3d text-start"
                onClick={() => void join(r.code)}
              >
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-ludo-gold">{r.name}</b>
                  <small className="text-ludo-soft">
                    {r.host_name} · {r.members}/{r.max_players}
                  </small>
                </span>
                <span className="room-code">{r.code}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <Button variant="destructive" className="w-full" onClick={onCancel}>
        <X className="size-4" /> إلغاء البحث
      </Button>
    </div>
  );
}
