import { useCallback, useEffect, useState } from "react";
import { Loader2, Check, X, Send, Inbox, Copy } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { listInvites, respondInvite, rejectAllInvites, type InviteRow } from "@/lib/invites.functions";
import { arabicTime } from "./economy-visuals";
import { cn } from "@/lib/utils";

const MODE_LABEL: Record<string, string> = { ludo: "كلاسيكي", classic: "كلاسيكي", domino: "فرق" };

export function InvitesScreen({ onJoin }: { onJoin: (code: string) => void }) {
  const load = useServerFn(listInvites);
  const respond = useServerFn(respondInvite);
  const rejectAll = useServerFn(rejectAllInvites);

  const [tab, setTab] = useState<"incoming" | "outgoing">("incoming");
  const [rows, setRows] = useState<InviteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await load({}));
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [load]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const act = async (id: string, accept: boolean) => {
    setBusy(id);
    try {
      const res = await respond({ data: { id, accept } });
      if (res.ok && accept && res.room_code) {
        toast.success(`تم قبول الدعوة — انضمام إلى ${res.room_code}`);
        onJoin(res.room_code);
        return;
      }
      if (res.ok) toast.success("تم رفض الدعوة");
      await refresh();
    } catch {
      toast.error("تعذّر تنفيذ العملية");
    } finally {
      setBusy(null);
    }
  };

  const list = rows.filter((r) => r.direction === tab);
  const pendingIncoming = rows.some((r) => r.direction === "incoming" && r.status === "pending");

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 rounded-xl border border-ludo-gold/30 bg-ludo-panel/60 p-1">
        {(["incoming", "outgoing"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-bold transition",
              tab === t ? "bg-ludo-gold text-ludo-deep" : "text-ludo-soft",
            )}
          >
            {t === "incoming" ? "الدعوات الواردة" : "الدعوات المرسلة"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid place-items-center py-10 text-ludo-gold">
          <Loader2 className="size-8 animate-spin" />
        </div>
      ) : list.length === 0 ? (
        <div className="glossy-card py-8 text-center text-sm text-ludo-soft">
          {tab === "incoming" ? <Inbox className="mx-auto mb-2 size-10 text-ludo-gold/70" /> : <Send className="mx-auto mb-2 size-10 text-ludo-gold/70" />}
          لا توجد دعوات هنا
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((inv) => (
            <article key={inv.id} className="list-card items-start">
              <span className="avatar-orb shrink-0">{inv.other_avatar || "🎲"}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <b className="truncate text-ludo-gold">{inv.other_name ?? "لاعب"}</b>
                  <small className="shrink-0 text-[11px] text-ludo-soft">{arabicTime(inv.created_at)}</small>
                </div>
                <p className="text-xs text-ludo-soft">
                  {tab === "incoming" ? "دعوتك للانضمام إلى غرفة" : "دعوة مرسلة إلى غرفة"}{" "}
                  {MODE_LABEL[inv.mode] ?? inv.mode} — {inv.max_players} لاعبين
                </p>
                <p className="mt-1 font-mono text-sm font-bold tracking-widest text-ludo-pink">{inv.room_code}</p>
                {inv.status !== "pending" ? (
                  <p className="mt-1 text-xs text-ludo-soft">
                    {inv.status === "accepted" ? "تم القبول" : "تم الرفض"}
                  </p>
                ) : tab === "incoming" ? (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Button variant="destructive" disabled={busy === inv.id} onClick={() => void act(inv.id, false)}>
                      <X className="size-4" /> رفض
                    </Button>
                    <Button variant="play" disabled={busy === inv.id} onClick={() => void act(inv.id, true)}>
                      <Check className="size-4" /> قبول
                    </Button>
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-ludo-soft">بانتظار الرد…</p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {tab === "incoming" && pendingIncoming && (
        <Button
          variant="destructive"
          className="w-full"
          onClick={async () => {
            await rejectAll({});
            toast.success("تم رفض كل الدعوات");
            await refresh();
          }}
        >
          رفض الكل
        </Button>
      )}
    </div>
  );
}
