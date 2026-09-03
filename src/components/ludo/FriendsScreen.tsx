import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addFriend, listFriends, respondFriend, type FriendRow } from "@/lib/social.functions";
import { cn } from "@/lib/utils";

const REASONS: Record<string, string> = {
  player_not_found: "لا يوجد لاعب بهذا الاسم",
  already_exists: "الطلب موجود بالفعل أو أنتما صديقان",
  "not authenticated": "سجّل الدخول أولًا",
};

export function FriendsScreen({ onInvite }: { onInvite?: () => void }) {
  const load = useServerFn(listFriends);
  const send = useServerFn(addFriend);
  const respond = useServerFn(respondFriend);
  const [rows, setRows] = useState<FriendRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"friends" | "requests">("friends");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    void load()
      .then(setRows)
      .catch(() => toast.error("تعذّر تحميل الأصدقاء"))
      .finally(() => setLoading(false));
  }, [load]);

  useEffect(refresh, [refresh]);

  const friends = useMemo(() => rows.filter((r) => r.status === "accepted"), [rows]);
  const requests = useMemo(
    () => rows.filter((r) => r.status === "pending" && r.direction === "incoming"),
    [rows],
  );
  const outgoing = useMemo(
    () => rows.filter((r) => r.status === "pending" && r.direction === "outgoing"),
    [rows],
  );

  const onAdd = async () => {
    const value = name.trim();
    if (!value) return;
    setBusy("add");
    try {
      const res = await send({ data: { name: value } });
      if (res.ok) {
        toast.success("تم إرسال طلب الصداقة");
        setName("");
        refresh();
      } else {
        toast.error(REASONS[res.reason ?? ""] ?? "تعذّر إرسال الطلب");
      }
    } catch {
      toast.error("تعذّر إرسال الطلب");
    } finally {
      setBusy(null);
    }
  };

  const onRespond = async (row: FriendRow, accept: boolean) => {
    setBusy(row.friendship_id);
    try {
      await respond({ data: { id: row.friendship_id, accept } });
      toast.success(accept ? `تمت إضافة ${row.display_name}` : "تم رفض الطلب");
      refresh();
    } catch {
      toast.error("تعذّر تنفيذ الطلب");
    } finally {
      setBusy(null);
    }
  };

  const respondAll = async (accept: boolean) => {
    setBusy("all");
    try {
      for (const r of requests) await respond({ data: { id: r.friendship_id, accept } });
      toast.success(accept ? "تم قبول كل الطلبات" : "تم رفض كل الطلبات");
      refresh();
    } catch {
      toast.error("تعذّر تنفيذ العملية");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {(
          [
            ["friends", `الأصدقاء (${friends.length})`],
            ["requests", `الطلبات (${requests.length})`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "rounded-full border px-3 py-2 text-xs font-bold transition",
              tab === id
                ? "border-ludo-gold bg-ludo-gold/20 text-ludo-gold"
                : "border-ludo-gold/25 bg-ludo-panel/60 text-ludo-soft",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-10 text-ludo-soft">
          <Loader2 className="size-6 animate-spin" />
        </div>
      )}

      {!loading && tab === "friends" && (
        <>
          <ul className="space-y-2">
            {friends.map((f) => (
              <li
                key={f.friendship_id}
                className="flex items-center gap-3 rounded-xl border border-ludo-gold/25 bg-ludo-panel/60 p-3"
              >
                <span className="grid size-10 place-items-center rounded-lg bg-ludo-deep/70 text-xl">
                  {f.avatar}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-ludo-soft">
                    {f.display_name}
                  </span>
                  <span className="block text-[11px] text-ludo-palm">صديق</span>
                </span>
                <span className="size-3 rounded-full bg-ludo-palm" aria-hidden />
              </li>
            ))}
            {outgoing.map((f) => (
              <li
                key={f.friendship_id}
                className="flex items-center gap-3 rounded-xl border border-ludo-gold/15 bg-ludo-panel/40 p-3"
              >
                <span className="grid size-10 place-items-center rounded-lg bg-ludo-deep/70 text-xl">
                  {f.avatar}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-ludo-soft">
                  {f.display_name}
                </span>
                <span className="text-[11px] text-ludo-soft/60">بانتظار القبول</span>
              </li>
            ))}
            {!friends.length && !outgoing.length && (
              <li className="rounded-xl border border-ludo-gold/25 bg-ludo-panel/60 p-6 text-center text-sm text-ludo-soft/80">
                لا يوجد أصدقاء بعد — أضف صديقًا بالاسم
              </li>
            )}
          </ul>

          <div className="flex gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="اسم اللاعب"
              className="flex-1"
            />
            <Button variant="royal" disabled={busy === "add"} onClick={() => void onAdd()}>
              <UserPlus className="size-4" /> إضافة صديق
            </Button>
          </div>

          {onInvite && (
            <Button variant="neon" className="w-full" onClick={onInvite}>
              دعوة صديق إلى غرفة
            </Button>
          )}
        </>
      )}

      {!loading && tab === "requests" && (
        <>
          <ul className="space-y-2">
            {requests.map((r) => (
              <li
                key={r.friendship_id}
                className="flex items-center gap-3 rounded-xl border border-ludo-gold/25 bg-ludo-panel/60 p-3"
              >
                <span className="grid size-10 place-items-center rounded-lg bg-ludo-deep/70 text-xl">
                  {r.avatar}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-ludo-soft">
                    {r.display_name}
                  </span>
                  <span className="block text-[11px] text-ludo-soft/70">يريد أن يكون صديقك</span>
                </span>
                <span className="flex shrink-0 gap-1">
                  <Button
                    size="sm"
                    variant="neon"
                    disabled={busy === r.friendship_id}
                    onClick={() => void onRespond(r, true)}
                  >
                    قبول
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={busy === r.friendship_id}
                    onClick={() => void onRespond(r, false)}
                  >
                    رفض
                  </Button>
                </span>
              </li>
            ))}
            {!requests.length && (
              <li className="rounded-xl border border-ludo-gold/25 bg-ludo-panel/60 p-6 text-center text-sm text-ludo-soft/80">
                لا توجد طلبات صداقة
              </li>
            )}
          </ul>
          {requests.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="neon" disabled={busy === "all"} onClick={() => void respondAll(true)}>
                قبول الكل
              </Button>
              <Button
                variant="destructive"
                disabled={busy === "all"}
                onClick={() => void respondAll(false)}
              >
                رفض الكل
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
