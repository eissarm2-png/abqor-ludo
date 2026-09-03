/** تفضيلات العرض المحلية (الرسوم المتحركة والاحتفالات) */

const ANIM_KEY = "abqor-animations";

export function loadAnimations(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(ANIM_KEY) !== "0";
}

export function setAnimations(value: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ANIM_KEY, value ? "1" : "0");
  document.documentElement.classList.toggle("no-anim", !value);
}

export function applyAnimations(value: boolean) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("no-anim", !value);
}

/* ===== عبارات الدردشة السريعة القابلة للتخصيص ===== */

const QUICK_KEY = "abqor-quick-chat";

export const DEFAULT_QUICK_CHAT = [
  "يا سلام! 👏",
  "دورك يا بطل",
  "حظ موفّق 🍀",
  "بسرعة لو سمحت ⏱️",
  "لعبة قوية!",
  "سامحني 😅",
  "شوف هذي 😎",
  "الحق عليّ",
];

export function loadQuickChat(): string[] {
  if (typeof window === "undefined") return DEFAULT_QUICK_CHAT;
  try {
    const raw = window.localStorage.getItem(QUICK_KEY);
    if (!raw) return DEFAULT_QUICK_CHAT;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return DEFAULT_QUICK_CHAT;
    const list = parsed.filter((v): v is string => typeof v === "string" && v.trim().length > 0).slice(0, 12);
    return list.length ? list : DEFAULT_QUICK_CHAT;
  } catch {
    return DEFAULT_QUICK_CHAT;
  }
}

export function saveQuickChat(list: string[]) {
  if (typeof window === "undefined") return;
  const clean = list.map((s) => s.trim().slice(0, 40)).filter(Boolean).slice(0, 12);
  window.localStorage.setItem(QUICK_KEY, JSON.stringify(clean));
}

/* ===== إعدادات الصوت داخل الغرفة ===== */

const NOISE_KEY = "abqor-noise-reduction";

export function loadNoiseReduction(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(NOISE_KEY) !== "0";
}

export function setNoiseReduction(value: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(NOISE_KEY, value ? "1" : "0");
}

/* ===== إعدادات اللعب (عدد اللاعبين، وقت الدور، سرعة القطع) ===== */

const PLAY_KEY = "abqor-gameplay";

export type GameplayPrefs = {
  players: 2 | 3 | 4;
  turnSeconds: number;
  moveMs: number;
};

export const DEFAULT_GAMEPLAY: GameplayPrefs = { players: 4, turnSeconds: 15, moveMs: 300 };

export function loadGameplay(): GameplayPrefs {
  if (typeof window === "undefined") return DEFAULT_GAMEPLAY;
  try {
    const raw = window.localStorage.getItem(PLAY_KEY);
    if (!raw) return DEFAULT_GAMEPLAY;
    const p = JSON.parse(raw) as Partial<GameplayPrefs>;
    const players = ([2, 3, 4] as const).includes(p.players as 2) ? (p.players as 2 | 3 | 4) : 4;
    const turnSeconds = Math.min(60, Math.max(5, Number(p.turnSeconds) || 15));
    const moveMs = Math.min(900, Math.max(80, Number(p.moveMs) || 300));
    return { players, turnSeconds, moveMs };
  } catch {
    return DEFAULT_GAMEPLAY;
  }
}

export function saveGameplay(value: GameplayPrefs) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PLAY_KEY, JSON.stringify(value));
  applyGameplay(value);
}

export function applyGameplay(value: GameplayPrefs) {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty("--token-move", `${value.moveMs}ms`);
}

/* ===== شكل النرد المختار ===== */

const DICE_KEY = "abqor-dice-skin";

export type DiceSkin = {
  code: string;
  label: string;
  face: string;
  pip: string;
  needWins: number;
};

export const DICE_SKINS: DiceSkin[] = [
  { code: "classic", label: "كلاسيكي", face: "#f8fafc", pip: "#0f172a", needWins: 0 },
  { code: "ruby", label: "ياقوت", face: "#dc2626", pip: "#fff1f2", needWins: 0 },
  { code: "lagoon", label: "أزرق", face: "#2563eb", pip: "#eff6ff", needWins: 0 },
  { code: "gold", label: "ذهبي", face: "#f6c32c", pip: "#3b2600", needWins: 5 },
  { code: "royal", label: "بنفسجي", face: "#7c3aed", pip: "#f5f3ff", needWins: 15 },
  { code: "palm", label: "أخضر", face: "#16a34a", pip: "#ecfdf5", needWins: 30 },
];

export function loadDiceSkin(): string {
  if (typeof window === "undefined") return "classic";
  return window.localStorage.getItem(DICE_KEY) ?? "classic";
}

export function saveDiceSkin(code: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DICE_KEY, code);
  applyDiceSkin(code);
}

export function applyDiceSkin(code: string) {
  if (typeof document === "undefined") return;
  const skin = DICE_SKINS.find((s) => s.code === code) ?? DICE_SKINS[0]!;
  document.documentElement.style.setProperty("--dice-face", skin.face);
  document.documentElement.style.setProperty("--dice-pip", skin.pip);
}
