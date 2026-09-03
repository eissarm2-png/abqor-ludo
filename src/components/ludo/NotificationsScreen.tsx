import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { listNotifications, readNotifications, type NotificationRow } from "@/lib/social.functions";
import { cn } from "@/lib/utils";

const FILTERS = [
  { id: "all", label: "الكل" },
  { id: "system", label: "اجتماعية" },
  { id: "friend", label: "اجتماعية" },
] as const;

const ICONS: Record<string, string> = {
  friend: "🧑‍🤝‍🧑",
  system: "🎁",
  match: "🎲",
  store: "🛒",
};

function since(iso: string) {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return "الآن";
  if (m < 60) return `منذ ${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return `منذ ${h} ساعة`;
  return `منذ ${Math.floor(h / 24)} يوم`;
}

export function NotificationsScreen() {
  const load = useServerFn(listNotifications);
  const markRead = useServerFn(readNotifications);
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const refresh = useCallback(() => {
    setLoading(true);
    void load()
      .then(setRows)
      .catch(() => toast.error("تعذّر تحميل الإشعارات"))
      .finally(() => setLoading(false));
  }, [load]);

  useEffect(refresh, [refresh]);

  const visible = useMemo(
    () => (filter === "all" ? rows : rows.filter((r) => r.kind === filter)),
    [rows, filter],
  );

  const markAll = async () => {
    try {
      await markRead({ data: {} });
      toast.success("تم تحديد كل الإشعارات كمقروءة");
      refresh();
    } catch {
      toast.error("تعذّر التحديث");
    }
  };

  const openOne = async (row: NotificationRow) => {
    if (row.read_at) return;
    try {
      await markRead({ data: { id: row.id } });
      setRows((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, read_at: new Date().toISOString() } : r)),
      );
    } catch {
      /* تجاهل */
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {FILTERS.filter((f, i) => FILTERS.findIndex((x) => x.label === f.label) === i || i === 0).map(
          (f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-xs font-bold transition",
                filter === f.id
                  ? "border-ludo-gold bg-ludo-gold/20 text-ludo-gold"
                  : "border-ludo-gold/25 bg-ludo-panel/60 text-ludo-soft",
              )}
            >
              {f.label}
            </button>
          ),
        )}
      </div>

      {loading && (
        <div className="flex justify-center py-10 text-ludo-soft">
          <Loader2 className="size-6 animate-spin" />
        </div>
      )}

      {!loading && !visible.length && (
        <p className="rounded-xl border border-ludo-gold/25 bg-ludo-panel/60 p-6 text-center text-sm text-ludo-soft/80">
          <Bell className="mx-auto mb-2 size-6 opacity-70" />
          لا توجد إشعارات حتى الآن
        </p>
      )}

      <ul className="space-y-2">
        {visible.map((row) => (
          <li key={row.id}>
            <button
              type="button"
              onClick={() => void openOne(row)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border p-3 text-right transition",
                row.read_at
                  ? "border-ludo-gold/20 bg-ludo-panel/50"
                  : "border-ludo-gold/60 bg-ludo-panel/80",
              )}
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-ludo-deep/70 text-xl">
                {ICONS[row.kind] ?? "🔔"}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-ludo-soft">{row.title}</span>
                <span className="block truncate text-[11px] text-ludo-soft/70">{row.body}</span>
              </span>
              <span className="shrink-0 text-[10px] text-ludo-soft/60">{since(row.created_at)}</span>
            </button>
          </li>
        ))}
      </ul>

      <Button variant="neon" className="w-full" onClick={() => void markAll()}>
        <CheckCheck className="size-4" /> تحديد الكل كمقروء
      </Button>
    </div>
  );
}
