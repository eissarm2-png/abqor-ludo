import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  Copy,
  Crown,
  DoorOpen,
  Layers,
  LogIn,
  Plus,
  RefreshCw,
  RotateCcw,
  Send,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { sfx } from "@/lib/audio";
import { haptics } from "@/lib/haptics";
import { cn } from "@/lib/utils";

export type RoomMode = "ludo" | "domino";

export type RoomLaunch = {
  roomId: string;
  matchId: string;
  mode: RoomMode;
  names: string[];
};

type Room = {
  id: string;
  name: string;
  code: string;
  host_id: string;
  max_players: number;
  mode: string;
  status: string;
  is_public: boolean;
  match_id: string | null;
};

type Member = {
  id: string;
  user_id: string;
  display_name: string;
  avatar: string;
  seat: number;
  ready: boolean;
};

type Message = {
  id: string;
  user_id: string;
  display_name: string;
  body: string;
  created_at: string;
};

type PublicRoom = {
  id: string;
  name: string;
  code: string;
  mode: string;
  max_players: number;
  members: number;
  host_name: string;
};

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" });

/** ردهة الغرف الحقيقية: إنشاء/انضمام/استعداد/دردشة فورية وبدء متزامن */
export function RoomsPanel({
  meId,
  onLaunch,
  initialCode = null,
}: {
  meId: string | null;
  onLaunch: (launch: RoomLaunch) => void;
  initialCode?: string | null;
}) {
  const [room, setRoom] = useState<Room | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [publicRooms, setPublicRooms] = useState<PublicRoom[]>([]);
  const [name, setName] = useState("غرفة عبقور");
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [mode, setMode] = useState<RoomMode>("ludo");
  const [isPublic, setIsPublic] = useState(true);
  const [code, setCode] = useState("");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const launched = useRef<string | null>(null);

  const isHost = Boolean(room && meId && room.host_id === meId);
  const me = members.find((m) => m.user_id === meId);
  const allReady = members.length >= 2 && members.every((m) => m.ready);

  const loadRoom = useCallback(async (roomId: string) => {
    const [r, mem, msg] = await Promise.all([
      supabase.from("rooms").select("*").eq("id", roomId).maybeSingle(),
      supabase.from("room_members").select("*").eq("room_id", roomId).order("seat"),
      supabase
        .from("room_messages")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at")
        .limit(100),
    ]);
    if (!r.data) {
      setRoom(null);
      setMembers([]);
      setMessages([]);
      return;
    }
    setRoom(r.data as Room);
    setMembers((mem.data ?? []) as Member[]);
    setMessages((msg.data ?? []) as Message[]);
  }, []);

  const loadPublic = useCallback(async () => {
    const { data } = await supabase.rpc("list_public_rooms");
    setPublicRooms((data ?? []) as PublicRoom[]);
  }, []);

  useEffect(() => {
    if (!meId) return;
    void (async () => {
      const { data } = await supabase.rpc("my_active_room");
      const active = (data ?? [])[0] as { room_id: string } | undefined;
      if (active?.room_id) await loadRoom(active.room_id);
      else await loadPublic();
    })();
  }, [meId, loadRoom, loadPublic]);

  // مزامنة فورية لكل بيانات الغرفة
  useEffect(() => {
    if (!room?.id) return;
    const roomId = room.id;
    const channel = supabase
      .channel(`room-sync:${roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_members", filter: `room_id=eq.${roomId}` },
        () => void loadRoom(roomId),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooms", filter: `id=eq.${roomId}` },
        () => void loadRoom(roomId),
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "room_messages",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev.slice(-99), payload.new as Message]);
          sfx.chat?.();
        },
      )
      .subscribe();
    return () => void supabase.removeChannel(channel);
  }, [room?.id, loadRoom]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // انتقال متزامن للمباراة عند بدء المضيف
  useEffect(() => {
    if (!room || room.status !== "playing" || !room.match_id) return;
    if (launched.current === room.match_id) return;
    if (members.length < 2) return;
    launched.current = room.match_id;
    onLaunch({
      roomId: room.id,
      matchId: room.match_id,
      mode: room.mode === "domino" ? "domino" : "ludo",
      names: members.map((m) => m.display_name),
    });
  }, [room, members, onLaunch]);

  const guard = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذّر إكمال العملية");
    } finally {
      setBusy(false);
    }
  };

  const createRoom = () =>
    guard(async () => {
      const { data, error: err } = await supabase.rpc("create_room", {
        _name: name,
        _max: maxPlayers,
        _mode: mode,
        _public: isPublic,
      });
      if (err) throw new Error(err.message);
      const created = (data ?? [])[0] as { room_id: string; code: string } | undefined;
      if (!created) throw new Error("تعذّر إنشاء الغرفة");
      sfx.start();
      haptics.tap();
      await loadRoom(created.room_id);
    });

  const joinRoom = (value: string) =>
    guard(async () => {
      const { data, error: err } = await supabase.rpc("join_room", {
        _code: value.trim().toUpperCase(),
      });
      if (err) throw new Error(err.message);
      const res = (data ?? [])[0] as
        { room_id: string | null; ok: boolean; reason: string | null } | undefined;
      if (!res?.ok || !res.room_id) throw new Error(res?.reason ?? "تعذّر الانضمام");
      sfx.tap();
      haptics.tap();
      setCode("");
      await loadRoom(res.room_id);
    });

  const autoJoined = useRef<string | null>(null);
  useEffect(() => {
    if (!initialCode || !meId) return;
    if (autoJoined.current === initialCode) return;
    autoJoined.current = initialCode;
    void joinRoom(initialCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode, meId]);

  const toggleReady = () =>
    guard(async () => {
      if (!room) return;
      const { error: err } = await supabase.rpc("set_room_ready", {
        _room: room.id,
        _ready: !me?.ready,
      });
      if (err) throw new Error(err.message);
      haptics.tap();
    });

  const leave = () =>
    guard(async () => {
      if (!room) return;
      const { error: err } = await supabase.rpc("leave_room", { _room: room.id });
      if (err) throw new Error(err.message);
      setRoom(null);
      setMembers([]);
      setMessages([]);
      launched.current = null;
      await loadPublic();
    });

  const updateSettings = (next: { mode?: RoomMode; max?: number; pub?: boolean }) =>
    guard(async () => {
      if (!room) return;
      const { error: err } = await supabase.rpc("host_update_room", {
        _room: room.id,
        _mode: next.mode ?? (room.mode as RoomMode),
        _max: next.max ?? room.max_players,
        _public: next.pub ?? room.is_public,
      });
      if (err) throw new Error(err.message);
    });

  const startMatch = () =>
    guard(async () => {
      if (!room) return;
      const { data, error: err } = await supabase.rpc("start_room_match", { _room: room.id });
      if (err) throw new Error(err.message);
      const res = (data ?? [])[0] as { ok: boolean; reason: string | null } | undefined;
      if (!res?.ok) throw new Error(res?.reason ?? "تعذّر بدء المباراة");
      sfx.start();
    });

  const resetRoom = () =>
    guard(async () => {
      if (!room) return;
      const { error: err } = await supabase.rpc("reset_room", { _room: room.id });
      if (err) throw new Error(err.message);
      launched.current = null;
      setConfirmReset(false);
    });

  const sendMessage = () =>
    guard(async () => {
      const body = draft.trim();
      if (!room || !meId || !body) return;
      const { error: err } = await supabase.from("room_messages").insert({
        room_id: room.id,
        user_id: meId,
        display_name: me?.display_name ?? "لاعب",
        body: body.slice(0, 200),
      });
      if (err) throw new Error(err.message);
      setDraft("");
    });

  if (!meId) {
    return (
      <p className="rounded-xl border border-ludo-gold/35 bg-ludo-panel/70 p-4 text-center text-sm text-ludo-soft">
        سجّل الدخول لإنشاء غرف لعب حقيقية واللعب مع أصدقائك
      </p>
    );
  }

  if (room) {
    return (
      <div className="space-y-3" dir="rtl">
        <section className="room-hero">
          <span className="room-hero-orb">
            <Users className="size-7" />
          </span>
          <div className="min-w-0 flex-1">
            <b className="block truncate text-lg">{room.name}</b>
            <small className="text-ludo-soft">
              {room.mode === "domino" ? "دومينو" : "لودو"} · {members.length}/{room.max_players}{" "}
              لاعبين · {room.is_public ? "غرفة عامة" : "غرفة خاصة"}
            </small>
          </div>
          <button
            type="button"
            className="room-code press-3d"
            onClick={() => {
              void navigator.clipboard?.writeText(room.code);
              setCopied(true);
              sfx.tap();
              window.setTimeout(() => setCopied(false), 1600);
            }}
            aria-label="نسخ رمز الغرفة"
          >
            <b>{room.code}</b>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          </button>
        </section>

        <section className="rounded-xl border border-ludo-gold/35 bg-ludo-panel/70 p-3">
          <h3 className="mb-2 flex items-center gap-2 font-bold text-ludo-gold">
            <Users className="size-4" /> الأعضاء
          </h3>
          <div className="space-y-2">
            {members.map((m) => (
              <div className="list-card" key={m.id}>
                <span className="avatar-orb bg-ludo-purple text-xl">{m.avatar}</span>
                <span className="min-w-0 flex-1">
                  <b className="flex items-center gap-1 truncate">
                    {m.display_name}
                    {m.user_id === room.host_id && <Crown className="size-4 text-ludo-gold" />}
                    {m.user_id === meId && <small className="text-ludo-soft">(أنت)</small>}
                  </b>
                  <small className={cn(m.ready ? "text-ludo-palm" : "text-ludo-soft")}>
                    {m.ready ? "جاهز ✓" : "في الانتظار…"}
                  </small>
                </span>
                <span className={cn("ready-dot", m.ready && "ready-dot-on")} aria-hidden="true" />
              </div>
            ))}
          </div>
        </section>

        {isHost && room.status === "lobby" && (
          <section className="rounded-xl border border-ludo-gold/35 bg-ludo-panel/70 p-3">
            <h3 className="mb-2 font-bold text-ludo-gold">أدوات المضيف</h3>
            <div className="mb-2 grid grid-cols-2 gap-2">
              {(["ludo", "domino"] as const).map((m) => (
                <Button
                  key={m}
                  variant={room.mode === m ? "royal" : "neon"}
                  size="sm"
                  disabled={busy}
                  onClick={() => void updateSettings({ mode: m })}
                >
                  {m === "ludo" ? <Crown /> : <Layers />}
                  {m === "ludo" ? "لودو" : "دومينو"}
                </Button>
              ))}
            </div>
            <div className="mb-2 grid grid-cols-3 gap-2">
              {[2, 3, 4].map((n) => (
                <Button
                  key={n}
                  variant={room.max_players === n ? "royal" : "neon"}
                  size="sm"
                  disabled={busy || n < members.length}
                  onClick={() => void updateSettings({ max: n })}
                >
                  {n} لاعبين
                </Button>
              ))}
            </div>
            <Button
              variant={room.is_public ? "royal" : "ghostGold"}
              size="sm"
              className="w-full"
              disabled={busy}
              onClick={() => void updateSettings({ pub: !room.is_public })}
            >
              {room.is_public ? "الغرفة معروضة للعامة" : "الغرفة خاصة بالرمز"}
            </Button>
            <Button
              variant="play"
              size="xl"
              className="mt-3 w-full"
              disabled={busy || members.length < 2}
              onClick={() => void startMatch()}
            >
              {members.length < 2 ? "بانتظار لاعب آخر…" : allReady ? "ابدأ المباراة" : "ابدأ الآن"}
              <Crown />
            </Button>
            {confirmReset ? (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Button variant="royal" size="sm" disabled={busy} onClick={() => void resetRoom()}>
                  تأكيد إعادة الضبط
                </Button>
                <Button variant="ghostGold" size="sm" onClick={() => setConfirmReset(false)}>
                  إلغاء
                </Button>
              </div>
            ) : (
              <Button
                variant="neon"
                size="sm"
                className="mt-2 w-full"
                onClick={() => setConfirmReset(true)}
              >
                <RotateCcw /> إعادة ضبط الغرفة
              </Button>
            )}
          </section>
        )}

        <section className="rounded-xl border border-ludo-gold/35 bg-ludo-panel/70 p-3">
          <h3 className="mb-2 font-bold text-ludo-gold">دردشة الغرفة</h3>
          <div className="room-chat-list" ref={listRef}>
            {messages.length === 0 && (
              <p className="py-4 text-center text-xs text-ludo-soft">
                لا رسائل بعد — رحّب بأعضاء الغرفة
              </p>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn("chat-bubble", m.user_id === meId ? "chat-mine" : "chat-theirs")}
              >
                <small className="chat-author">
                  {m.display_name} · {time(m.created_at)}
                </small>
                <span>{m.body}</span>
              </div>
            ))}
          </div>
          <form
            className="chat-compose mt-2"
            onSubmit={(e) => {
              e.preventDefault();
              void sendMessage();
            }}
          >
            <input
              dir="rtl"
              className="chat-input"
              maxLength={200}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="اكتب رسالتك للغرفة…"
            />
            <Button type="submit" variant="play" size="icon" aria-label="إرسال" disabled={busy}>
              <Send />
            </Button>
          </form>
        </section>

        {error && <p className="text-center text-xs text-ludo-pink">{error}</p>}

        <Button variant="ghostGold" className="w-full" disabled={busy} onClick={() => void leave()}>
          <DoorOpen /> {isHost ? "إغلاق الغرفة والخروج" : "الخروج من الغرفة"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3" dir="rtl">
      <section className="rounded-xl border border-ludo-gold/35 bg-ludo-panel/70 p-3">
        <h3 className="mb-2 flex items-center gap-2 font-bold text-ludo-gold">
          <Plus className="size-4" /> إنشاء غرفة
        </h3>
        <input
          dir="rtl"
          className="chat-input mb-2 w-full"
          maxLength={28}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="اسم الغرفة"
        />
        <div className="mb-2 grid grid-cols-2 gap-2">
          {(["ludo", "domino"] as const).map((m) => (
            <Button
              key={m}
              variant={mode === m ? "royal" : "neon"}
              size="sm"
              onClick={() => setMode(m)}
            >
              {m === "ludo" ? <Crown /> : <Layers />}
              {m === "ludo" ? "لودو" : "دومينو"}
            </Button>
          ))}
        </div>
        <div className="mb-2 grid grid-cols-3 gap-2">
          {[2, 3, 4].map((n) => (
            <Button
              key={n}
              variant={maxPlayers === n ? "royal" : "neon"}
              size="sm"
              onClick={() => setMaxPlayers(n)}
            >
              {n} لاعبين
            </Button>
          ))}
        </div>
        <Button
          variant={isPublic ? "royal" : "ghostGold"}
          size="sm"
          className="mb-2 w-full"
          onClick={() => setIsPublic((v) => !v)}
        >
          {isPublic ? "غرفة عامة" : "غرفة خاصة بالرمز"}
        </Button>
        <Button variant="play" className="w-full" disabled={busy} onClick={() => void createRoom()}>
          <Plus /> أنشئ الغرفة
        </Button>
      </section>

      <section className="rounded-xl border border-ludo-gold/35 bg-ludo-panel/70 p-3">
        <h3 className="mb-2 flex items-center gap-2 font-bold text-ludo-gold">
          <LogIn className="size-4" /> الانضمام برمز
        </h3>
        <form
          className="chat-compose"
          onSubmit={(e) => {
            e.preventDefault();
            void joinRoom(code);
          }}
        >
          <input
            dir="ltr"
            className="chat-input text-center font-bold tracking-[.35em]"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
          />
          <Button type="submit" variant="royal" size="icon" aria-label="انضم" disabled={busy}>
            <LogIn />
          </Button>
        </form>
      </section>

      <section className="rounded-xl border border-ludo-gold/35 bg-ludo-panel/70 p-3">
        <h3 className="mb-2 flex items-center justify-between font-bold text-ludo-gold">
          <span className="flex items-center gap-2">
            <Users className="size-4" /> الغرف العامة
          </span>
          <Button
            variant="ghostGold"
            size="icon"
            aria-label="تحديث"
            onClick={() => void loadPublic()}
          >
            <RefreshCw className="size-4" />
          </Button>
        </h3>
        {publicRooms.length === 0 && (
          <p className="py-3 text-center text-xs text-ludo-soft">لا توجد غرف عامة متاحة الآن</p>
        )}
        <div className="space-y-2">
          {publicRooms.map((r) => {
            const full = r.members >= r.max_players;
            return (
              <div className="list-card" key={r.id}>
                <span className="avatar-orb bg-ludo-purple text-ludo-gold">
                  {r.mode === "domino" ? (
                    <Layers className="size-5" />
                  ) : (
                    <Crown className="size-5" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block truncate">{r.name}</b>
                  <small className="text-ludo-soft">
                    {r.host_name} · {r.members}/{r.max_players} {full ? "· ممتلئة" : ""}
                  </small>
                </span>
                <Button
                  variant={full ? "ghostGold" : "play"}
                  size="sm"
                  disabled={busy || full}
                  onClick={() => void joinRoom(r.code)}
                >
                  {full ? "ممتلئة" : "انضم"}
                </Button>
              </div>
            );
          })}
        </div>
      </section>

      {error && <p className="text-center text-xs text-ludo-pink">{error}</p>}
    </div>
  );
}
