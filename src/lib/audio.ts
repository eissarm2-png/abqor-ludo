/** محرك مؤثرات صوتية بسيط بالكامل عبر Web Audio API (بدون ملفات خارجية) */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;

const STORAGE_KEY = "abqor-muted";
const VOLUME_KEY = "abqor-sfx-volume";
let volume = 0.6;

export function initAudio() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : volume;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function loadMuted(): boolean {
  if (typeof window === "undefined") return false;
  muted = window.localStorage.getItem(STORAGE_KEY) === "1";
  return muted;
}

export function setMuted(value: boolean) {
  muted = value;
  if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  if (master && ctx) master.gain.value = value ? 0 : volume;
}

/** مستوى المؤثرات من 0 إلى 1 */
export function loadVolume(): number {
  if (typeof window === "undefined") return volume;
  const stored = window.localStorage.getItem(VOLUME_KEY);
  if (stored !== null) {
    const raw = Number(stored);
    if (Number.isFinite(raw) && raw >= 0 && raw <= 1) volume = raw;
  }
  return volume;
}

export function setVolume(value: number) {
  volume = Math.min(1, Math.max(0, value));
  if (typeof window !== "undefined") window.localStorage.setItem(VOLUME_KEY, String(volume));
  if (master && ctx && !muted) master.gain.value = volume;
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = "sine", gain = 0.25) {
  const audio = initAudio();
  if (!audio || !master || muted) return;
  const t0 = audio.currentTime + start;
  const osc = audio.createOscillator();
  const env = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(env).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noiseBurst(start: number, dur: number, gain = 0.3, filterFreq = 2600) {
  const audio = initAudio();
  if (!audio || !master || muted) return;
  const t0 = audio.currentTime + start;
  const frames = Math.max(1, Math.floor(audio.sampleRate * dur));
  const buffer = audio.createBuffer(1, frames, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
  }
  const src = audio.createBufferSource();
  src.buffer = buffer;
  const filter = audio.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = filterFreq;
  filter.Q.value = 0.9;
  const env = audio.createGain();
  env.gain.setValueAtTime(gain, t0);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter).connect(env).connect(master);
  src.start(t0);
}

export const sfx = {
  tap() {
    tone(520, 0, 0.07, "triangle", 0.16);
  },
  /** صوت لف النرد: ارتطام خشبي متسارع ثم استقرار */
  diceRoll() {
    const hits = [0, 0.055, 0.1, 0.15, 0.21, 0.28, 0.36, 0.45];
    hits.forEach((t, i) => {
      noiseBurst(t, 0.05, 0.34 - i * 0.03, 1500 + i * 260);
      tone(150 + i * 22, t, 0.05, "square", 0.07);
    });
    noiseBurst(0.52, 0.12, 0.26, 1200);
    tone(220, 0.54, 0.12, "triangle", 0.12);
  },
  diceLand(value: number) {
    tone(440 + value * 55, 0, 0.13, "triangle", 0.2);
  },
  /** دخول قطعة للمسار عند 6 */
  enter() {
    tone(392, 0, 0.1, "triangle", 0.16);
    tone(587, 0.09, 0.14, "triangle", 0.18);
    noiseBurst(0, 0.09, 0.12, 2400);
  },
  /** انتقال الدور للاعب التالي */
  turnPass() {
    tone(340, 0, 0.09, "sine", 0.1);
    tone(260, 0.08, 0.1, "sine", 0.09);
  },
  move() {
    tone(680, 0, 0.06, "sine", 0.14);
    tone(920, 0.06, 0.07, "sine", 0.12);
  },
  capture() {
    tone(300, 0, 0.1, "sawtooth", 0.2);
    tone(180, 0.09, 0.18, "sawtooth", 0.18);
    noiseBurst(0, 0.18, 0.22, 900);
  },
  home() {
    [523, 659, 784].forEach((f, i) => tone(f, i * 0.08, 0.16, "triangle", 0.18));
  },
  start() {
    [392, 523, 659, 784].forEach((f, i) => tone(f, i * 0.09, 0.22, "triangle", 0.18));
  },
  /** نبضة عدّاد الوقت */
  tick() {
    tone(880, 0, 0.05, "square", 0.09);
  },
  /** تحذير آخر 5 ثوانٍ */
  warn() {
    tone(1180, 0, 0.07, "square", 0.14);
    tone(880, 0.08, 0.08, "square", 0.12);
  },
  /** انتهاء المهلة */
  timeout() {
    tone(300, 0, 0.16, "sawtooth", 0.2);
    tone(190, 0.14, 0.24, "sawtooth", 0.18);
    noiseBurst(0, 0.2, 0.18, 800);
  },
  win() {
    [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, i * 0.12, 0.42, "triangle", 0.2));
    noiseBurst(0.1, 0.5, 0.14, 3800);
  },
  /** طقطقة وضع حجرة دومينو على اللباد — نقرة عاجية قصيرة + رنين خفيف */
  dominoPlace(index = 0) {
    noiseBurst(0, 0.045, 0.3, 2200 + (index % 4) * 180);
    tone(300 + (index % 5) * 26, 0, 0.06, "square", 0.11);
    tone(1240 + (index % 3) * 90, 0.02, 0.09, "triangle", 0.07);
  },
  /** تجاوب/تأكيد صحة الوصلة بعد الوضع */
  dominoSnap() {
    tone(880, 0, 0.07, "triangle", 0.12);
    tone(1320, 0.06, 0.1, "triangle", 0.1);
  },
  /** تأكيد تشكيل الجولة قبل بدء الحركة */
  dominoConfirm() {
    [523, 784, 1046].forEach((f, i) => tone(f, i * 0.07, 0.2, "triangle", 0.16));
    noiseBurst(0.02, 0.2, 0.1, 3200);
  },
  /** فتح/كتم المايك الحي */
  micToggle(on: boolean) {
    tone(on ? 660 : 420, 0, 0.07, "sine", 0.12);
    tone(on ? 990 : 300, 0.06, 0.09, "sine", 0.1);
  },
  /** إشعار رسالة دردشة — نغمة قصيرة لا تتعارض مع أصوات اللعب */

  chat() {
    tone(760, 0, 0.06, "sine", 0.12);
    tone(1010, 0.07, 0.08, "sine", 0.1);
  },
};

/**
 * خفض مؤقّت لمستوى المؤثرات (Ducking) أثناء تشغيل صوت لاعب،
 * حتى لا تتزامن نغمات الإشعارات مع الرسالة الصوتية.
 */
export function duckFor(seconds: number) {
  const audio = initAudio();
  if (!audio || !master || muted) return () => {};
  const t = audio.currentTime;
  const low = Math.max(0.05, volume * 0.25);
  master.gain.cancelScheduledValues(t);
  master.gain.setTargetAtTime(low, t, 0.05);
  const restore = () => {
    if (!master || !ctx) return;
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setTargetAtTime(muted ? 0 : volume, now, 0.08);
  };
  const timer = typeof window !== "undefined"
    ? window.setTimeout(restore, Math.max(200, seconds * 1000))
    : 0;
  return () => {
    if (timer) window.clearTimeout(timer);
    restore();
  };
}
