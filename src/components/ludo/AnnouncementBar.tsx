import { useEffect, useState } from "react";
import { Megaphone, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Row = {
  id: string;
  title: string;
  body: string;
  kind: string;
  link: string;
  active: boolean;
  expires_at: string | null;
  created_at: string;
};

/**
 * شريط إعلانات ديناميكي: يقرأ الإعلانات النشطة ويحدّثها لحظيًا
 * فور إضافتها أو إخفائها من لوحة الأدمن.
 */
export function AnnouncementBar() {
  const [items, setItems] = useState<Row[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      const { data } = await supabase
        .from("announcements")
        .select("id,title,body,kind,link,active,expires_at,created_at")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(5);
      if (!alive) return;
      const now = Date.now();
      setItems(
        ((data ?? []) as Row[]).filter(
          (r) => !r.expires_at || new Date(r.expires_at).getTime() > now,
        ),
      );
    };

    void load();

    const channel = supabase
      .channel("announcements-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, () => {
        void load();
      })
      .subscribe();

    return () => {
      alive = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  const visible = items.filter((i) => !dismissed.includes(i.id));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-2">
      {visible.map((a) => (
        <div key={a.id} className="coin-card flex items-start gap-2 border border-ludo-gold/40 p-3">
          <Megaphone className="mt-0.5 size-4 shrink-0 text-ludo-gold" />
          <div className="min-w-0 flex-1">
            <b className="block truncate text-sm text-ludo-gold">{a.title}</b>
            {a.body && <p className="text-[11px] leading-relaxed text-ludo-soft">{a.body}</p>}
            {a.link && (
              <a
                href={a.link}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-bold text-ludo-pink underline"
              >
                التفاصيل
              </a>
            )}
          </div>
          <button
            type="button"
            aria-label="إخفاء الإعلان"
            className="press-3d text-ludo-soft"
            onClick={() => setDismissed((d) => [...d, a.id])}
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
