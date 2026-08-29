import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Play, Send, Settings2, Smile, Square, X, MessageCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { duckFor, sfx } from "@/lib/audio";
import { haptics } from "@/lib/haptics";
import {
  DEFAULT_QUICK_CHAT,
  loadNoiseReduction,
  loadQuickChat,
  saveQuickChat,
  setNoiseReduction,
} from "@/lib/prefs";

const EMOJIS = [
  "👑",
  "🎲",
  "🔥",
  "😂",
  "😮",
  "😭",
  "💎",
  "🎯",
  "👏",
  "🤝",
  "🙈",
  "🍀",
  "💥",
  "🥳",
  "😤",
  "🫡",
];

type ChatMessage = {
  id: string;
  mine: boolean;
  author: string;
  kind: "text" | "quick" | "emoji" | "voice";
  text?: string;
  audioUrl?: string;
  seconds?: number;
  at: number;
};

type Tab = "text" | "quick" | "emoji";

/** سياق المباراة لاقتراح عبارات مناسبة (لا يؤثر على منطق اللعب مطلقًا) */
export type ChatContext = {
  myTurn?: boolean;
  secondsLeft?: number;
  lastEvent?: "capture" | "captured" | "six" | "home" | "win" | "loss" | null;
};

/** اقتراحات عربية حسب حالة المباراة الحالية */
function suggestFor(ctx: ChatContext | undefined): string[] {
  if (!ctx) return [];
  const out: string[] = [];
  if (ctx.lastEvent === "capture") out.push("آسف! ما كان مقصود 😅", "لعبة نظيفة 😎");
  if (ctx.lastEvent === "captured") out.push("لا بأس، راجعة أقوى 💪", "خلّها عليّ 😤");
  if (ctx.lastEvent === "six") out.push("ستة! 🎲🔥");
  if (ctx.lastEvent === "home") out.push("وصلت البيت 🏠✨");
  if (ctx.lastEvent === "win") out.push("لعب ممتاز، شكرًا 🤝");
  if (ctx.lastEvent === "loss") out.push("مبروك، تستاهل 👏");
  if (ctx.myTurn === false) out.push("دورك يا بطل");
  if (typeof ctx.secondsLeft === "number" && ctx.secondsLeft <= 5) out.push("بسرعة لو سمحت ⏱️");
  return Array.from(new Set(out)).slice(0, 4);
}

/**
 * دردشة غرفة المباراة: نصية عربية RTL + دردشة سريعة + إيموجي + رسائل صوتية حقيقية
 * (تسجيل عبر الميكروفون). الدردشة معزولة تمامًا عن منطق اللعبة ولا تؤثر على النتيجة.
 */
export function MatchChat({
  meName,
  context,
  open: openProp,
  onOpenChange,
  tab: tabProp,
  hideFab,
}: {
  meName: string;
  context?: ChatContext | undefined;
  /** فتح/إغلاق مُتحكَّم به من واجهة الغرفة (أزرار «الدردشة» و«إيموجي») */
  open?: boolean;
  onOpenChange?: (value: boolean) => void;
  tab?: Tab;
  hideFab?: boolean;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = useCallback(
    (value: boolean) => {
      setInternalOpen(value);
      onOpenChange?.(value);
    },
    [onOpenChange],
  );
  const [tab, setTab] = useState<Tab>("quick");
  useEffect(() => {
    if (tabProp) setTab(tabProp);
  }, [tabProp]);

  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [recording, setRecording] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const [quick, setQuick] = useState<string[]>(DEFAULT_QUICK_CHAT);
  const [editingQuick, setEditingQuick] = useState(false);
  const [newPhrase, setNewPhrase] = useState("");
  const [noise, setNoise] = useState(true);
  const suggestions = suggestFor(context);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedAt = useRef(0);
  const listRef = useRef<HTMLDivElement | null>(null);
  const urls = useRef<string[]>([]);

  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  useEffect(() => {
    setQuick(loadQuickChat());
    setNoise(loadNoiseReduction());
  }, []);

  useEffect(() => {
    if (open) setUnread(0);
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const push = useCallback((msg: Omit<ChatMessage, "id" | "at">) => {
    setMessages((prev) => [
      ...prev.slice(-60),
      { ...msg, id: crypto.randomUUID(), at: Date.now() },
    ]);
    if (!msg.mine) setUnread((n) => n + 1);
  }, []);

  const send = (kind: ChatMessage["kind"], text: string) => {
    if (!text.trim()) return;
    sfx.chat();
    haptics.tap();
    push({ mine: true, author: meName, kind, text });
    setDraft("");
  };

  const startRecording = async () => {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: noise
          ? {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              channelCount: 1,
            }
          : true,
      });
      const rec = new MediaRecorder(stream);
      chunks.current = [];
      startedAt.current = Date.now();
      rec.ondataavailable = (e) => {
        if (e.data.size) chunks.current.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunks.current, { type: rec.mimeType || "audio/webm" });
        const url = URL.createObjectURL(blob);
        urls.current.push(url);
        push({
          mine: true,
          author: meName,
          kind: "voice",
          audioUrl: url,
          seconds: Math.max(1, Math.round((Date.now() - startedAt.current) / 1000)),
        });
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.current = rec;
      rec.start();
      setRecording(true);
      haptics.tap();
    } catch {
      setMicError("لم يُسمح باستخدام الميكروفون على هذا الجهاز");
    }
  };

  const stopRecording = () => {
    recorder.current?.stop();
    recorder.current = null;
    setRecording(false);
    haptics.tap();
  };

  return (
    <>
      {!hideFab && (
        <button
          type="button"
          className="chat-fab press-3d"
          onClick={() => {
            setOpen(!open);
            sfx.tap();
          }}
          aria-label="دردشة الغرفة"
        >
          {open ? <X className="size-5" /> : <MessageCircle className="size-5" />}
          {!open && unread > 0 && <b className="chat-badge">{unread}</b>}
        </button>
      )}

      {open && (
        <section className="chat-panel glow-rise" dir="rtl" aria-label="دردشة المباراة">
          <header className="chat-head">
            <b>دردشة الغرفة</b>
            <small className="flex-1">لا تؤثر على نتيجة اللعبة</small>
            <button
              type="button"
              className="chat-close press-3d"
              aria-label="إغلاق الدردشة"
              onClick={() => {
                setOpen(false);
                sfx.tap();
              }}
            >
              <X className="size-4" />
            </button>
          </header>

          <div className="chat-list" ref={listRef}>
            {messages.length === 0 && (
              <p className="py-6 text-center text-xs text-ludo-soft">
                ابدأ الدردشة مع خصومك — نص، عبارة سريعة، إيموجي أو رسالة صوتية
              </p>
            )}
            {messages.map((m) => (
              <div key={m.id} className={cn("chat-bubble", m.mine ? "chat-mine" : "chat-theirs")}>
                <small className="chat-author">{m.author}</small>
                {m.kind === "voice" ? (
                  <VoiceNote url={m.audioUrl ?? ""} seconds={m.seconds ?? 1} />
                ) : (
                  <span className={cn(m.kind === "emoji" && "text-3xl leading-none")}>
                    {m.text}
                  </span>
                )}
              </div>
            ))}
          </div>

          <nav className="chat-tabs">
            {(
              [
                ["quick", "سريعة", <Zap key="z" className="size-4" />],
                ["text", "نص", <Send key="s" className="size-4" />],
                ["emoji", "إيموجي", <Smile key="e" className="size-4" />],
              ] as const
            ).map(([id, label, icon]) => (
              <button
                type="button"
                key={id}
                onClick={() => setTab(id as Tab)}
                className={cn("chat-tab press-3d", tab === id && "chat-tab-active")}
              >
                {icon}
                <span>{label}</span>
              </button>
            ))}
          </nav>

          {tab === "quick" && (
            <div className="space-y-2">
              {suggestions.length > 0 && (
                <div className="chat-quick" dir="rtl">
                  {suggestions.map((q) => (
                    <button
                      type="button"
                      key={`s-${q}`}
                      className="chat-quick-btn press-3d ring-1 ring-ludo-gold/70"
                      onClick={() => send("quick", q)}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
              <div className="chat-quick" dir="rtl">
                {quick.map((q) => (
                  <button
                    type="button"
                    key={q}
                    className="chat-quick-btn press-3d"
                    onClick={() => send("quick", q)}
                  >
                    {q}
                    {editingQuick && (
                      <b
                        role="button"
                        aria-label="حذف العبارة"
                        className="ms-1 text-ludo-pink"
                        onClick={(e) => {
                          e.stopPropagation();
                          const next = quick.filter((x) => x !== q);
                          setQuick(next);
                          saveQuickChat(next);
                        }}
                      >
                        ×
                      </b>
                    )}
                  </button>
                ))}
                <button
                  type="button"
                  className="chat-quick-btn press-3d"
                  onClick={() => setEditingQuick((v) => !v)}
                  aria-label="تخصيص العبارات"
                >
                  <Settings2 className="size-3.5" /> تخصيص
                </button>
              </div>
              {editingQuick && (
                <form
                  className="chat-compose"
                  dir="rtl"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const value = newPhrase.trim();
                    if (!value) return;
                    const next = Array.from(new Set([...quick, value])).slice(0, 12);
                    setQuick(next);
                    saveQuickChat(next);
                    setNewPhrase("");
                  }}
                >
                  <input
                    dir="rtl"
                    className="chat-input"
                    maxLength={40}
                    value={newPhrase}
                    onChange={(e) => setNewPhrase(e.target.value)}
                    placeholder="أضف عبارتك السريعة…"
                  />
                  <Button type="submit" variant="royal" size="icon" aria-label="إضافة">
                    <Send />
                  </Button>
                </form>
              )}
            </div>
          )}

          {tab === "emoji" && (
            <div className="chat-emoji">
              {EMOJIS.map((e) => (
                <button
                  type="button"
                  key={e}
                  className="chat-emoji-btn press-3d"
                  onClick={() => send("emoji", e)}
                >
                  {e}
                </button>
              ))}
            </div>
          )}

          {tab === "text" && (
            <form
              className="chat-compose"
              onSubmit={(e) => {
                e.preventDefault();
                send("text", draft);
              }}
            >
              <input
                dir="rtl"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={140}
                placeholder="اكتب رسالتك…"
                className="chat-input"
              />
              <Button type="submit" variant="play" size="icon" aria-label="إرسال">
                <Send />
              </Button>
            </form>
          )}

          <footer className="chat-voice">
            <Button
              type="button"
              variant={recording ? "royal" : "neon"}
              className="flex-1"
              onClick={() => (recording ? stopRecording() : void startRecording())}
            >
              {recording ? (
                <>
                  <Square className="size-4" /> إيقاف وإرسال
                </>
              ) : (
                <>
                  <Mic className="size-4" /> رسالة صوتية
                </>
              )}
            </Button>
            {recording && <span className="rec-dot" aria-hidden="true" />}
            <Button
              type="button"
              variant={noise ? "royal" : "ghostGold"}
              size="sm"
              aria-pressed={noise}
              onClick={() => {
                const next = !noise;
                setNoise(next);
                setNoiseReduction(next);
              }}
            >
              {noise ? "خفض الضوضاء: مُفعّل" : "خفض الضوضاء: موقوف"}
            </Button>
          </footer>
          {micError && (
            <p className="px-3 pb-2 text-center text-[11px] text-ludo-pink">{micError}</p>
          )}
        </section>
      )}
    </>
  );
}

function VoiceNote({ url, seconds }: { url: string; seconds: number }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const releaseRef = useRef<(() => void) | null>(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => () => releaseRef.current?.(), []);
  return (
    <span className="voice-note">
      <button
        type="button"
        className="voice-play press-3d"
        aria-label="تشغيل الرسالة الصوتية"
        onClick={() => {
          const el = audio.current;
          if (!el) return;
          if (playing) {
            el.pause();
            el.currentTime = 0;
            setPlaying(false);
            releaseRef.current?.();
            releaseRef.current = null;
            return;
          }
          const release = duckFor(seconds + 0.4);
          releaseRef.current = release;
          void el.play();
          setPlaying(true);
        }}
      >
        {playing ? <Square className="size-3" /> : <Play className="size-3" />}
      </button>
      <span className="voice-wave" aria-hidden="true">
        {Array.from({ length: 14 }, (_, i) => (
          <i key={i} style={{ animationDelay: `${i * 0.06}s` }} />
        ))}
      </span>
      <small>{seconds}ث</small>
      <audio
        ref={audio}
        src={url}
        onEnded={() => {
          setPlaying(false);
          releaseRef.current?.();
          releaseRef.current = null;
        }}
        preload="metadata"
      />
    </span>
  );
}
