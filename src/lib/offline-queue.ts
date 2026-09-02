/**
 * طابور اللعب دون اتصال:
 * يحفظ نتائج المباريات محليًا عند انقطاع الإنترنت ويرسلها تلقائيًا عند عودة الاتصال.
 */
export type QueuedResult = {
  matchId: string;
  result: "win" | "loss";
  players: number;
  moves: number;
  durationMs: number;
  mode: "ludo" | "domino";
  queuedAt: number;
};

const KEY = "ludu.offline.results.v1";
const MAX = 60;

function safeParse(raw: string | null): QueuedResult[] {
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? (list as QueuedResult[]) : [];
  } catch {
    return [];
  }
}

export function readQueue(): QueuedResult[] {
  if (typeof window === "undefined") return [];
  return safeParse(window.localStorage.getItem(KEY));
}

function writeQueue(list: QueuedResult[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(-MAX)));
  } catch {
    /* تجاهل امتلاء التخزين */
  }
}

export function enqueueResult(item: Omit<QueuedResult, "queuedAt">) {
  const list = readQueue();
  if (list.some((q) => q.matchId === item.matchId && q.mode === item.mode)) return;
  list.push({ ...item, queuedAt: Date.now() });
  writeQueue(list);
}

export function queueSize(): number {
  return readQueue().length;
}

export function isOnline(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine !== false;
}

/** يرسل كل النتائج المؤجّلة؛ يبقي في الطابور ما فشل إرساله بسبب الشبكة */
export async function flushQueue(
  send: (data: Omit<QueuedResult, "queuedAt">) => Promise<unknown>,
): Promise<number> {
  if (!isOnline()) return 0;
  const list = readQueue();
  if (list.length === 0) return 0;

  const remaining: QueuedResult[] = [];
  let sent = 0;
  for (const item of list) {
    try {
      await send({
        matchId: item.matchId,
        result: item.result,
        players: item.players,
        moves: item.moves,
        durationMs: item.durationMs,
        mode: item.mode,
      });
      sent += 1;
    } catch {
      remaining.push(item);
    }
  }
  writeQueue(remaining);
  return sent;
}

/** يستمع لعودة الاتصال ويطلب التفريغ */
export function onReconnect(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("online", handler);
  return () => window.removeEventListener("online", handler);
}
