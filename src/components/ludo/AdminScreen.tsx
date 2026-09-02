import { useCallback, useEffect, useState } from "react";
import {
  Ban,
  BarChart3,
  Coins,
  Gem,
  Gift,
  ListOrdered,
  Megaphone,
  Trash2,
  Search,
  ShieldCheck,
  ShieldX,
  Sparkles,
  Store,
  Target,
  Timer,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { sfx } from "@/lib/audio";
import {
  adminAdjustEconomy,
  adminCatalog,
  adminGrantItem,
  adminListUsers,
  adminLogs,
  adminRecentMatches,
  adminSaveStoreItem,
  adminSetBan,
  adminSetRole,
  adminStats,
  adminToggleChest,
  adminToggleMission,
  adminTurnEvents,
  adminUpdateProfile,
  type AdminStats,
  type AdminUser,
} from "@/lib/admin.functions";
import {
  adminDeleteAnnouncement,
  adminDeleteRoom,
  adminListAnnouncements,
  adminListRooms,
  adminSaveAnnouncement,
  type AdminRoom,
  type Announcement,
} from "@/lib/announcements.functions";

type Tab = "overview" | "users" | "matches" | "rooms" | "ads" | "catalog" | "logs" | "turns";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "نظرة عامة", icon: <BarChart3 className="size-4" /> },
  { id: "users", label: "اللاعبون", icon: <Users className="size-4" /> },
  { id: "matches", label: "المباريات", icon: <ListOrdered className="size-4" /> },
  { id: "rooms", label: "الغرف", icon: <Users className="size-4" /> },
  { id: "ads", label: "الإعلانات", icon: <Megaphone className="size-4" /> },
  { id: "catalog", label: "الكتالوج", icon: <Store className="size-4" /> },
  { id: "logs", label: "سجل الأدمن", icon: <ShieldCheck className="size-4" /> },
  { id: "turns", label: "أحداث الأدوار", icon: <Timer className="size-4" /> },
];

function timeAr(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ar", { dateStyle: "short", timeStyle: "short" });
}

/** لوحة تحكم الأدمن — كل عملية تتحقق من الصلاحية داخل السيرفر وقاعدة البيانات */
export function AdminPanel() {
  const { isAdmin, loading, user } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");

  if (loading) return <p className="py-10 text-center text-ludo-soft">جارٍ التحقق من الصلاحيات…</p>;

  if (!user || !isAdmin) {
    return (
      <div className="coin-card space-y-2 text-center">
        <ShieldX className="mx-auto size-10 text-ludo-pink" />
        <b className="block text-ludo-gold">هذه المنطقة للمشرفين فقط</b>
        <p className="text-xs text-ludo-soft">
          سجّل الدخول بحساب لديه صلاحية إدارية. الصلاحية تُمنح وتُتحقق في السيرفر ولا يمكن تجاوزها من المتصفح.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <nav className="chat-tabs flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => { setTab(t.id); sfx.tap(); }}
            className={cn("chat-tab press-3d", tab === t.id && "chat-tab-active")}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      {tab === "overview" && <Overview />}
      {tab === "users" && <UsersTab />}
      {tab === "matches" && <MatchesTab />}
      {tab === "rooms" && <RoomsTab />}
      {tab === "ads" && <AdsTab />}
      {tab === "catalog" && <CatalogTab />}
      {tab === "logs" && <LogsTab />}
      {tab === "turns" && <TurnsTab />}
    </div>
  );
}

function Overview() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    void adminStats().then((r) => {
      if (r.ok && r.stats) setStats(r.stats);
      else { setError(true); console.error("stats", r.reason); }
    }).catch(() => setError(true));
  }, []);

  if (error) return <p className="coin-card text-center text-xs text-ludo-pink">تعذّر تحميل الإحصائيات</p>;
  if (!stats) return <p className="py-6 text-center text-ludo-soft">جارٍ التحميل…</p>;

  const cells: [string, number | string][] = [
    ["اللاعبون", stats.users],
    ["الموقوفون", stats.banned],
    ["المشرفون", stats.admins],
    ["كل المباريات", stats.matches],
    ["آخر ٢٤ ساعة", stats.matches_24h],
    ["مباريات لودو", stats.ludo_matches],
    ["مباريات دومينو", stats.domino_matches],
    ["إجمالي الذهب", stats.gold],
    ["إجمالي الألماس", stats.diamonds],
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {cells.map(([label, value]) => (
        <div key={label} className="coin-card p-3 text-center">
          <b className="block text-lg text-ludo-gold">{value}</b>
          <small className="text-[10px] text-ludo-soft">{label}</small>
        </div>
      ))}
    </div>
  );
}

function UsersTab() {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<AdminUser | null>(null);

  const load = useCallback(async (q: string) => {
    setBusy(true);
    const r = await adminListUsers({ data: { search: q, limit: 40, offset: 0 } });
    setUsers(r.ok ? r.users : []);
    setBusy(false);
  }, []);

  useEffect(() => { void load(""); }, [load]);

  return (
    <div className="space-y-3">
      <form
        className="flex gap-2"
        onSubmit={(e) => { e.preventDefault(); void load(search); }}
      >
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث بالاسم أو البريد" />
        <Button type="submit" variant="royal" size="icon" aria-label="بحث"><Search /></Button>
      </form>

      {busy && <p className="text-center text-xs text-ludo-soft">جارٍ التحميل…</p>}

      <div className="space-y-2">
        {users.map((u) => (
          <button
            key={u.id}
            type="button"
            onClick={() => setSelected(u)}
            className={cn("coin-card w-full text-right press-3d", selected?.id === u.id && "ring-2 ring-ludo-gold")}
          >
            <span className="flex items-center gap-2">
              <span className="avatar-orb bg-ludo-gold text-xl">{u.avatar}</span>
              <span className="min-w-0 flex-1">
                <b className="block truncate text-ludo-gold">{u.display_name}</b>
                <small className="block truncate text-[10px] text-ludo-soft">{u.email}</small>
              </span>
              <span className="text-[10px] text-ludo-soft">
                <span className="block">لفل {u.level} · {u.points} نقطة</span>
                <span className="block">{u.gold} ذهب · {u.diamonds} ألماس</span>
              </span>
            </span>
            <span className="mt-1 flex flex-wrap gap-1 text-[10px]">
              {u.is_admin && <b className="rounded bg-ludo-gold/20 px-2 py-0.5 text-ludo-gold">أدمن</b>}
              {u.banned && <b className="rounded bg-destructive/25 px-2 py-0.5 text-destructive-foreground">موقوف</b>}
              <span className="text-ludo-soft">انضم {timeAr(u.created_at)}</span>
            </span>
          </button>
        ))}
        {!busy && users.length === 0 && <p className="text-center text-xs text-ludo-soft">لا نتائج</p>}
      </div>

      {selected && <UserActions user={selected} onDone={() => void load(search)} />}
    </div>
  );
}

function UserActions({ user, onDone }: { user: AdminUser; onDone: () => void }) {
  const [gold, setGold] = useState("0");
  const [diamonds, setDiamonds] = useState("0");
  const [xp, setXp] = useState("0");
  const [name, setName] = useState(user.display_name);
  const [avatar, setAvatar] = useState(user.avatar);
  const [reason, setReason] = useState(user.banned_reason ?? "");
  const [itemKind, setItemKind] = useState<"avatar" | "banner" | "frame">("frame");
  const [itemCode, setItemCode] = useState("diamond-elite");
  const [msg, setMsg] = useState<string | null>(null);

  const run = async (fn: () => Promise<{ ok: boolean }>, okText: string) => {
    setMsg(null);
    try {
      const r = await fn();
      setMsg(r.ok ? okText : "العملية مرفوضة — تحقق من صلاحياتك");
      if (r.ok) { sfx.tap(); onDone(); }
    } catch {
      setMsg("العملية مرفوضة");
    }
  };

  return (
    <div className="coin-card space-y-3">
      <b className="block text-ludo-gold">إدارة: {user.display_name}</b>

      <div className="grid grid-cols-3 gap-2">
        <label className="text-[10px] text-ludo-soft">
          ذهب
          <Input value={gold} onChange={(e) => setGold(e.target.value)} inputMode="numeric" />
        </label>
        <label className="text-[10px] text-ludo-soft">
          ألماس
          <Input value={diamonds} onChange={(e) => setDiamonds(e.target.value)} inputMode="numeric" />
        </label>
        <label className="text-[10px] text-ludo-soft">
          XP
          <Input value={xp} onChange={(e) => setXp(e.target.value)} inputMode="numeric" />
        </label>
      </div>
      <Button
        variant="play"
        className="w-full"
        onClick={() =>
          void run(
            () => adminAdjustEconomy({
              data: {
                userId: user.id,
                gold: Number(gold) || 0,
                diamonds: Number(diamonds) || 0,
                xp: Number(xp) || 0,
                note: "تعديل إداري",
              },
            }),
            "تم تحديث الرصيد",
          )
        }
      >
        <Coins /> تطبيق تعديل الرصيد
      </Button>

      <div className="grid grid-cols-2 gap-2">
        <Input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="الاسم الظاهر" />
        <Input value={avatar} maxLength={4} onChange={(e) => setAvatar(e.target.value)} placeholder="الأفاتار" />
      </div>
      <Button
        variant="royal"
        className="w-full"
        onClick={() => void run(() => adminUpdateProfile({ data: { userId: user.id, displayName: name, avatar } }), "تم تحديث الملف")}
      >
        <Sparkles /> حفظ الملف الشخصي
      </Button>

      <div className="grid grid-cols-3 gap-2">
        <select
          className="chat-input"
          value={itemKind}
          onChange={(e) => setItemKind(e.target.value as "avatar" | "banner" | "frame")}
        >
          <option value="avatar">أفاتار</option>
          <option value="banner">بنر</option>
          <option value="frame">إطار</option>
        </select>
        <Input className="col-span-2" value={itemCode} onChange={(e) => setItemCode(e.target.value)} placeholder="رمز العنصر" />
      </div>
      <Button
        variant="neon"
        className="w-full"
        onClick={() => void run(() => adminGrantItem({ data: { userId: user.id, kind: itemKind, code: itemCode, rarity: "legendary" } }), "تم منح العنصر")}
      >
        <Gift /> منح عنصر ملكي
      </Button>

      <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="سبب الإيقاف (اختياري)" />
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant={user.banned ? "royal" : "ghostGold"}
          onClick={() => void run(() => adminSetBan({ data: { userId: user.id, banned: !user.banned, reason } }), user.banned ? "تم فك الإيقاف" : "تم إيقاف الحساب")}
        >
          <Ban /> {user.banned ? "فك الإيقاف" : "إيقاف الحساب"}
        </Button>
        <Button
          variant="neon"
          onClick={() => void run(() => adminSetRole({ data: { userId: user.id, role: "admin", grant: !user.is_admin } }), user.is_admin ? "تم سحب صلاحية الأدمن" : "تم منح صلاحية الأدمن")}
        >
          <ShieldCheck /> {user.is_admin ? "سحب الأدمن" : "منح الأدمن"}
        </Button>
      </div>

      {msg && <p className="text-center text-xs text-ludo-soft">{msg}</p>}
    </div>
  );
}

type MatchRow = {
  id: string;
  display_name: string | null;
  mode: string;
  result: string;
  players: number;
  points: number;
  moves: number;
  duration_ms: number;
  created_at: string;
};

function MatchesTab() {
  const [rows, setRows] = useState<MatchRow[]>([]);
  useEffect(() => {
    void adminRecentMatches({ data: { limit: 60 } }).then((r) => setRows((r.matches ?? []) as MatchRow[]));
  }, []);
  return (
    <div className="space-y-2">
      {rows.map((m) => (
        <div key={m.id} className="coin-card flex items-center gap-2 text-xs">
          <b className={cn("rounded px-2 py-1", m.result === "win" ? "bg-ludo-palm/25 text-ludo-palm" : "bg-destructive/20 text-destructive-foreground")}>
            {m.result === "win" ? "فوز" : "خسارة"}
          </b>
          <span className="min-w-0 flex-1">
            <b className="block truncate text-ludo-gold">{m.display_name ?? "لاعب"}</b>
            <small className="text-ludo-soft">{m.mode === "domino" ? "دومينو" : "لودو"} · {m.players} لاعبين · {m.moves} حركة</small>
          </span>
          <span className="text-left text-[10px] text-ludo-soft">
            <span className="block">{m.points} نقطة</span>
            <span className="block">{timeAr(m.created_at)}</span>
          </span>
        </div>
      ))}
      {rows.length === 0 && <p className="text-center text-xs text-ludo-soft">لا مباريات بعد</p>}
    </div>
  );
}

type CatalogState = {
  chests: { code: string; title: string; cost_gold: number; cost_diamonds: number; active: boolean }[];
  missions: { code: string; title: string; period: string; goal: number; reward_gold: number; active: boolean }[];
  store: { code: string; title: string; kind: string; cost_gold: number; cost_diamonds: number; active: boolean }[];
};

function CatalogTab() {
  const [data, setData] = useState<CatalogState | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({ code: "", title: "", kind: "frame", value: "", gold: "0", diamonds: "0" });

  const load = useCallback(async () => {
    const r = await adminCatalog();
    setData(r as unknown as CatalogState);
  }, []);
  useEffect(() => { void load(); }, [load]);

  if (!data) return <p className="py-6 text-center text-ludo-soft">جارٍ التحميل…</p>;

  return (
    <div className="space-y-4">
      <section className="space-y-2">
        <h3 className="text-sm text-ludo-gold">الصناديق</h3>
        {data.chests.map((c) => (
          <div key={c.code} className="coin-card flex items-center gap-2 text-xs">
            <span className="min-w-0 flex-1">
              <b className="block truncate text-ludo-gold">{c.title}</b>
              <small className="text-ludo-soft">{c.cost_gold} ذهب · {c.cost_diamonds} ألماس</small>
            </span>
            <Button
              variant={c.active ? "royal" : "ghostGold"}
              size="sm"
              onClick={async () => {
                const r = await adminToggleChest({ data: { code: c.code, active: !c.active, costGold: c.cost_gold, costDiamonds: c.cost_diamonds } });
                setMsg(r.ok ? "تم التحديث" : "مرفوض");
                if (r.ok) void load();
              }}
            >
              {c.active ? "مُفعّل" : "موقوف"}
            </Button>
          </div>
        ))}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm text-ludo-gold">المهام</h3>
        {data.missions.map((m) => (
          <div key={m.code} className="coin-card flex items-center gap-2 text-xs">
            <Target className="size-4 text-ludo-pink" />
            <span className="min-w-0 flex-1">
              <b className="block truncate text-ludo-gold">{m.title}</b>
              <small className="text-ludo-soft">{m.period === "weekly" ? "أسبوعية" : "يومية"} · الهدف {m.goal} · {m.reward_gold} ذهب</small>
            </span>
            <Button
              variant={m.active ? "royal" : "ghostGold"}
              size="sm"
              onClick={async () => {
                const r = await adminToggleMission({ data: { code: m.code, active: !m.active, goal: m.goal, rewardGold: m.reward_gold } });
                setMsg(r.ok ? "تم التحديث" : "مرفوض");
                if (r.ok) void load();
              }}
            >
              {m.active ? "مُفعّلة" : "موقوفة"}
            </Button>
          </div>
        ))}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm text-ludo-gold">المتجر</h3>
        {data.store.map((s) => (
          <div key={s.code} className="coin-card flex items-center gap-2 text-xs">
            <Gem className="size-4 text-ludo-lagoon" />
            <span className="min-w-0 flex-1">
              <b className="block truncate text-ludo-gold">{s.title}</b>
              <small className="text-ludo-soft">{s.kind} · {s.cost_gold} ذهب · {s.cost_diamonds} ألماس</small>
            </span>
            <Button
              variant={s.active ? "royal" : "ghostGold"}
              size="sm"
              onClick={async () => {
                const r = await adminSaveStoreItem({
                  data: { code: s.code, title: s.title, kind: s.kind as "avatar" | "banner" | "frame", costGold: s.cost_gold, costDiamonds: s.cost_diamonds, active: !s.active },
                });
                setMsg(r.ok ? "تم التحديث" : "مرفوض");
                if (r.ok) void load();
              }}
            >
              {s.active ? "معروض" : "مخفي"}
            </Button>
          </div>
        ))}

        <div className="coin-card space-y-2">
          <b className="block text-xs text-ludo-gold">إضافة عنصر متجر</b>
          <div className="grid grid-cols-2 gap-2">
            <Input value={newItem.code} onChange={(e) => setNewItem({ ...newItem, code: e.target.value })} placeholder="الرمز (حروف صغيرة)" />
            <Input value={newItem.title} onChange={(e) => setNewItem({ ...newItem, title: e.target.value })} placeholder="العنوان" />
            <select className="chat-input" value={newItem.kind} onChange={(e) => setNewItem({ ...newItem, kind: e.target.value })}>
              <option value="avatar">أفاتار</option>
              <option value="banner">بنر</option>
              <option value="frame">إطار</option>
            </select>
            <Input value={newItem.value} onChange={(e) => setNewItem({ ...newItem, value: e.target.value })} placeholder="القيمة" />
            <Input value={newItem.gold} onChange={(e) => setNewItem({ ...newItem, gold: e.target.value })} placeholder="ذهب" inputMode="numeric" />
            <Input value={newItem.diamonds} onChange={(e) => setNewItem({ ...newItem, diamonds: e.target.value })} placeholder="ألماس" inputMode="numeric" />
          </div>
          <Button
            variant="play"
            className="w-full"
            onClick={async () => {
              try {
                const r = await adminSaveStoreItem({
                  data: {
                    code: newItem.code.trim().toLowerCase(),
                    title: newItem.title,
                    kind: newItem.kind as "avatar" | "banner" | "frame",
                    value: newItem.value,
                    costGold: Number(newItem.gold) || 0,
                    costDiamonds: Number(newItem.diamonds) || 0,
                    active: true,
                  },
                });
                setMsg(r.ok ? "تمت الإضافة" : "مرفوض");
                if (r.ok) void load();
              } catch {
                setMsg("تحقق من صحة الرمز (a-z و - فقط)");
              }
            }}
          >
            <Store /> حفظ العنصر
          </Button>
        </div>
      </section>

      {msg && <p className="text-center text-xs text-ludo-soft">{msg}</p>}
    </div>
  );
}

type LogRow = { id: string; admin_name: string | null; action: string; target_name: string | null; detail: unknown; created_at: string };

function LogsTab() {
  const [rows, setRows] = useState<LogRow[]>([]);
  useEffect(() => {
    void adminLogs({ data: { limit: 80 } }).then((r) => setRows((r.logs ?? []) as LogRow[]));
  }, []);
  return (
    <div className="space-y-2">
      {rows.map((l) => (
        <div key={l.id} className="coin-card text-xs">
          <b className="text-ludo-gold">{l.action}</b>
          <p className="text-ludo-soft">
            بواسطة {l.admin_name ?? "أدمن"} {l.target_name ? `— الهدف: ${l.target_name}` : ""}
          </p>
          <small className="text-[10px] text-ludo-soft">{timeAr(l.created_at)}</small>
        </div>
      ))}
      {rows.length === 0 && <p className="text-center text-xs text-ludo-soft">لا عمليات مسجّلة</p>}
    </div>
  );
}

type TurnRow = {
  id: string; display_name: string | null; match_id: string; turn: number; kind: string;
  elapsed_ms: number; limit_ms: number; accepted: boolean; reason: string | null; created_at: string;
};

function TurnsTab() {
  const [rows, setRows] = useState<TurnRow[]>([]);
  useEffect(() => {
    void adminTurnEvents({ data: { limit: 80 } }).then((r) => setRows((r.events ?? []) as TurnRow[]));
  }, []);
  return (
    <div className="space-y-2">
      {rows.map((e) => (
        <div key={e.id} className="coin-card flex items-center gap-2 text-xs">
          <Timer className={cn("size-4", e.accepted ? "text-ludo-palm" : "text-ludo-pink")} />
          <span className="min-w-0 flex-1">
            <b className="block truncate text-ludo-gold">{e.display_name ?? "لاعب"} · دور {e.turn}</b>
            <small className="text-ludo-soft">
              {e.kind} · {(e.elapsed_ms / 1000).toFixed(1)}ث من {(e.limit_ms / 1000).toFixed(0)}ث
              {e.reason ? ` · ${e.reason}` : ""}
            </small>
          </span>
          <small className="text-[10px] text-ludo-soft">{timeAr(e.created_at)}</small>
        </div>
      ))}
      {rows.length === 0 && <p className="text-center text-xs text-ludo-soft">لا أحداث مسجّلة</p>}
    </div>
  );
}


/** إدارة الغرف: عرض الغرف الحيّة وحذف أي غرفة */
function RoomsTab() {
  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await adminListRooms();
    setRooms(r.rooms);
  }, []);
  useEffect(() => { void load(); }, [load]);

  return (
    <div className="space-y-2">
      {rooms.map((r) => (
        <div key={r.id} className="coin-card flex items-center gap-2 text-xs">
          <span className="min-w-0 flex-1">
            <b className="block truncate text-ludo-gold">{r.name}</b>
            <small className="block text-ludo-soft">
              كود {r.code} · {r.mode === "domino" ? "دومينو" : "لودو"} · {r.members}/{r.max_players} لاعب
            </small>
            <small className="block text-[10px] text-ludo-soft">
              المضيف {r.host_name ?? "—"} · {r.status === "lobby" ? "انتظار" : "جارية"} · {r.is_public ? "عامة" : "خاصة"}
            </small>
          </span>
          <Button
            variant="ghostGold"
            size="sm"
            onClick={async () => {
              const res = await adminDeleteRoom({ data: { id: r.id } });
              setMsg(res.ok ? "تم حذف الغرفة" : "مرفوض");
              if (res.ok) void load();
            }}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
      {rooms.length === 0 && <p className="text-center text-xs text-ludo-soft">لا غرف حاليًا</p>}
      {msg && <p className="text-center text-xs text-ludo-soft">{msg}</p>}
    </div>
  );
}

/** إدارة الإعلانات: تظهر مباشرة في الواجهة الرئيسية لكل اللاعبين */
function AdsTab() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await adminListAnnouncements();
    setItems(r.items);
  }, []);
  useEffect(() => { void load(); }, [load]);

  return (
    <div className="space-y-3">
      <div className="coin-card space-y-2">
        <b className="block text-xs text-ludo-gold">إعلان جديد</b>
        <Input value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} placeholder="العنوان" />
        <Input value={body} maxLength={300} onChange={(e) => setBody(e.target.value)} placeholder="النص" />
        <Input value={link} maxLength={200} onChange={(e) => setLink(e.target.value)} placeholder="رابط (اختياري)" />
        <Button
          variant="play"
          className="w-full"
          onClick={async () => {
            if (!title.trim()) { setMsg("اكتب عنوانًا"); return; }
            const r = await adminSaveAnnouncement({ data: { title, body, link, kind: "banner", active: true } });
            setMsg(r.ok ? "تم نشر الإعلان" : "مرفوض");
            if (r.ok) { setTitle(""); setBody(""); setLink(""); sfx.tap(); void load(); }
          }}
        >
          <Sparkles /> نشر الإعلان
        </Button>
      </div>

      {items.map((a) => (
        <div key={a.id} className="coin-card flex items-start gap-2 text-xs">
          <span className="min-w-0 flex-1">
            <b className="block truncate text-ludo-gold">{a.title}</b>
            <small className="block text-ludo-soft">{a.body}</small>
            <small className="block text-[10px] text-ludo-soft">{timeAr(a.created_at)}</small>
          </span>
          <Button
            variant={a.active ? "royal" : "ghostGold"}
            size="sm"
            onClick={async () => {
              const r = await adminSaveAnnouncement({
                data: { id: a.id, title: a.title, body: a.body, link: a.link, kind: a.kind, active: !a.active },
              });
              setMsg(r.ok ? "تم التحديث" : "مرفوض");
              if (r.ok) void load();
            }}
          >
            {a.active ? "ظاهر" : "مخفي"}
          </Button>
          <Button
            variant="ghostGold"
            size="sm"
            onClick={async () => {
              const r = await adminDeleteAnnouncement({ data: { id: a.id } });
              setMsg(r.ok ? "تم الحذف" : "مرفوض");
              if (r.ok) void load();
            }}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
      {items.length === 0 && <p className="text-center text-xs text-ludo-soft">لا إعلانات</p>}
      {msg && <p className="text-center text-xs text-ludo-soft">{msg}</p>}
    </div>
  );
}
