/** اهتزاز الجهاز (Vibration API) مع تفضيل محلي قابل للإيقاف */

const KEY = "abqor-haptics";
let enabled = true;

export function loadHaptics(): boolean {
  if (typeof window === "undefined") return true;
  enabled = window.localStorage.getItem(KEY) !== "0";
  return enabled;
}

export function setHaptics(value: boolean) {
  enabled = value;
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, value ? "1" : "0");
}

function buzz(pattern: number | number[]) {
  if (!enabled || typeof navigator === "undefined") return;
  const vib = (navigator as Navigator & { vibrate?: (p: number | number[]) => boolean }).vibrate;
  if (typeof vib !== "function") return;
  try {
    vib.call(navigator, pattern as never);
  } catch {
    /* الجهاز لا يدعم الاهتزاز */
  }
}

/** أنماط الاهتزاز مضبوطة على توقيت كل انتقال في المباراة */
export const haptics = {
  tap: () => buzz(10),
  /** طول اللف 620ms: نبضات متسارعة ثم نبضة استقرار */
  diceRoll: () => buzz([0, 26, 70, 22, 70, 18, 70, 14, 90, 34]),
  diceLand: () => buzz(22),
  /** دخول قطعة عند 6 */
  enter: () => buzz([0, 18, 60, 40]),
  move: () => buzz(14),
  capture: () => buzz([0, 46, 60, 90]),
  home: () => buzz([0, 30, 50, 30, 50, 70]),
  turnPass: () => buzz(12),
  win: () => buzz([0, 90, 90, 90, 90, 200]),
};
