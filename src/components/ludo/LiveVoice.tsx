import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { duckFor, sfx } from "@/lib/audio";
import { haptics } from "@/lib/haptics";
import { loadNoiseReduction } from "@/lib/prefs";
import { cn } from "@/lib/utils";

/**
 * دردشة صوتية حيّة داخل غرفة المباراة (مايك مباشر بدون تسجيل مقاطع):
 * يُبثّ الصوت على شكل شرائح قصيرة عبر قناة الغرفة الحيّة، ويُشغَّل صوت
 * اللاعبين الآخرين فورًا مع خفض مؤقّت لمؤثرات اللعبة لتزامن أفضل.
 * لا تؤثر على منطق اللعبة أو نتيجتها إطلاقًا.
 */
export function LiveVoiceButton({ roomId, meName }: { roomId: string; meName: string }) {
  const [live, setLive] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [speakers, setSpeakers] = useState<string[]>([]);

  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const channel = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const raf = useRef(0);
  const audioCtx = useRef<AudioContext | null>(null);

  const stop = useCallback(() => {
    if (recorder.current?.state === "recording") recorder.current.stop();
    recorder.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = 0;
    analyser.current = null;
    void audioCtx.current?.close();
    audioCtx.current = null;
    if (channel.current) void supabase.removeChannel(channel.current);
    channel.current = null;
    setLive(false);
    setLevel(0);
    setSpeakers([]);
  }, []);

  useEffect(() => () => stop(), [stop]);

  /**
   * تشغيل شرائح الصوت القادمة بالتتابع وبأقل تأخير ممكن:
   * طابور قصير يمنع التقطيع والتراكب، مع خفض مؤثرات اللعبة والتنبيهات
   * أثناء الحديث فقط (مزامنة الصوت الحي مع تنبيهات الغرفة).
   */
  const queue = useRef<Promise<void>>(Promise.resolve());
  const playChunk = useCallback((b64: string, author: string, mime: string) => {
    queue.current = queue.current.then(
      () =>
        new Promise<void>((resolve) => {
          try {
            const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
            const blob = new Blob([bytes], { type: mime || "audio/webm" });
            const url = URL.createObjectURL(blob);
            const el = new Audio(url);
            el.preload = "auto";
            const release = duckFor(0.35);
            setSpeakers((s) => (s.includes(author) ? s : [...s, author]));
            const done = () => {
              release();
              URL.revokeObjectURL(url);
              setSpeakers((s) => s.filter((x) => x !== author));
              resolve();
            };
            el.onended = done;
            el.onerror = done;
            void el.play().catch(done);
          } catch {
            resolve();
          }
        }),
    );
  }, []);

  const start = useCallback(async () => {
    setError(null);
    try {
      const noise = loadNoiseReduction();
      const media = await navigator.mediaDevices.getUserMedia({
        audio: noise
          ? {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              channelCount: 1,
            }
          : true,
      });
      stream.current = media;

      const ch = supabase.channel(`voice:${roomId}`, { config: { broadcast: { self: false } } });
      ch.on("broadcast", { event: "chunk" }, (payload) => {
        const data = payload["payload"] as { b64?: string; author?: string; mime?: string };
        if (data?.b64) void playChunk(data.b64, data.author ?? "لاعب", data.mime ?? "audio/webm");
      });
      await ch.subscribe();
      channel.current = ch;

      // مؤشر مستوى الصوت الحي
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctor) {
        const ctx = new Ctor();
        audioCtx.current = ctx;
        const node = ctx.createAnalyser();
        node.fftSize = 512;
        ctx.createMediaStreamSource(media).connect(node);
        analyser.current = node;
        const buf = new Uint8Array(node.frequencyBinCount);
        const tick = () => {
          if (!analyser.current) return;
          analyser.current.getByteTimeDomainData(buf);
          let sum = 0;
          for (const v of buf) sum += (v - 128) ** 2;
          setLevel(Math.min(1, Math.sqrt(sum / buf.length) / 24));
          raf.current = requestAnimationFrame(tick);
        };
        raf.current = requestAnimationFrame(tick);
      }

      const rec = new MediaRecorder(media, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
        // معدل بت منخفض ⇒ شرائح أصغر وبثّ أسرع بجودة كلام واضحة
        audioBitsPerSecond: 24_000,
      });
      rec.ondataavailable = async (e) => {
        if (!e.data.size || !micOnRef.current || !channel.current) return;
        const buffer = new Uint8Array(await e.data.arrayBuffer());
        let binary = "";
        for (const byte of buffer) binary += String.fromCharCode(byte);
        void channel.current.send({
          type: "broadcast",
          event: "chunk",
          payload: { b64: btoa(binary), author: meName, mime: rec.mimeType },
        });
      };
      rec.start(600);
      recorder.current = rec;
      setLive(true);
      setMicOn(true);
      sfx.micToggle(true);
      haptics.tap();
    } catch {
      setError("لم يُسمح باستخدام الميكروفون");
      stop();
    }
  }, [meName, playChunk, roomId, stop]);

  /** كتم المايك فورًا مع إبقاء الاتصال بالغرفة */
  const micOnRef = useRef(true);
  useEffect(() => {
    micOnRef.current = micOn;
    stream.current?.getAudioTracks().forEach((t) => (t.enabled = micOn));
  }, [micOn]);

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        className={cn("room-pill press-3d", live && "ring-2 ring-ludo-palm")}
        aria-label={live ? "إيقاف الصوت الحي" : "تشغيل الصوت الحي"}
        aria-pressed={live}
        onClick={() => (live ? stop() : void start())}
      >
        <Radio className="size-4" />
        {live && (
          <span className="live-level" style={{ ["--lvl" as string]: level }} aria-hidden="true" />
        )}
      </button>
      {live && (
        <button
          type="button"
          className={cn("room-pill press-3d", !micOn && "text-ludo-pink")}
          aria-label={micOn ? "كتم المايك" : "تشغيل المايك"}
          aria-pressed={!micOn}
          onClick={() => {
            setMicOn((v) => !v);
            sfx.micToggle(!micOn);
            haptics.tap();
          }}
        >
          {micOn ? <Mic className="size-4" /> : <MicOff className="size-4" />}
        </button>
      )}
      {speakers.length > 0 && (
        <small className="text-[10px] font-bold text-ludo-palm">{speakers[0]} يتحدث…</small>
      )}
      {error && <small className="text-[10px] text-ludo-pink">{error}</small>}
    </div>
  );
}
