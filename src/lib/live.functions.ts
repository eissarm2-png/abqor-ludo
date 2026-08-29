import { createServerFn } from "@tanstack/react-start";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ServerRoll = {
  value: number;
  seq: number;
  at: number;
  sig: string;
};

export type ServerTurn = {
  serverNow: number;
  deadline: number;
  limitMs: number;
  turn: number;
  sig: string;
};

/**
 * رمية نرد موثوقة: القيمة تُولّد داخل السيرفر بمولّد عشوائي آمن
 * وتُوقَّع رقميًا مع رقم الرمية ومعرّف المباراة حتى لا يمكن تعديلها من العميل.
 */
export const rollServerDie = createServerFn({ method: "POST" })
  .inputValidator((input: { matchId: string; seq: number }) => {
    if (!input || !UUID_RE.test(input.matchId)) throw new Error("invalid match id");
    const seq = Math.round(Number(input.seq));
    if (!Number.isFinite(seq) || seq < 0 || seq > 100_000) throw new Error("invalid seq");
    return { matchId: input.matchId, seq };
  })
  .handler(async ({ data }): Promise<ServerRoll> => {
    const { secureDie, signPayload } = await import("./live.server");
    const value = secureDie();
    const at = Date.now();
    return {
      value,
      seq: data.seq,
      at,
      sig: signPayload(["roll", data.matchId, data.seq, value, at]),
    };
  });

/**
 * بداية دور جديدة بتوقيت السيرفر: مهلة 15 ثانية موقّعة رقميًا،
 * فيُحسب المؤقت على ساعة السيرفر لا على ساعة الجهاز.
 */
export const startServerTurn = createServerFn({ method: "POST" })
  .inputValidator((input: { matchId: string; turn: number }) => {
    if (!input || !UUID_RE.test(input.matchId)) throw new Error("invalid match id");
    const turn = Math.round(Number(input.turn));
    if (!Number.isFinite(turn) || turn < 0 || turn > 100_000) throw new Error("invalid turn");
    return { matchId: input.matchId, turn };
  })
  .handler(async ({ data }): Promise<ServerTurn> => {
    const { signPayload, TURN_LIMIT_MS } = await import("./live.server");
    const serverNow = Date.now();
    const deadline = serverNow + TURN_LIMIT_MS;
    return {
      serverNow,
      deadline,
      limitMs: TURN_LIMIT_MS,
      turn: data.turn,
      sig: signPayload(["turn", data.matchId, data.turn, deadline]),
    };
  });

export type ForfeitVerdict = {
  ok: boolean;
  reason: "ok" | "bad_signature" | "too_early" | "invalid";
  elapsedMs: number;
  limitMs: number;
};

/**
 * إنهاء الدور (Forfeit) بتحقق صارم في السيرفر:
 * - يجب أن يكون المؤقت مُوقَّعًا من السيرفر لنفس المباراة ونفس رقم الدور.
 * - لا يُقبل الإنهاء قبل انتهاء 15 ثانية فعليًا على ساعة السيرفر.
 * - يُسجَّل كل حدث في سجل الأدوار لمطابقة المدة لاحقًا.
 */
export const forfeitServerTurn = createServerFn({ method: "POST" })
  .inputValidator((input: { matchId: string; turn: number; deadline: number; sig: string }) => {
    if (!input || !UUID_RE.test(input.matchId)) throw new Error("invalid match id");
    const turn = Math.round(Number(input.turn));
    const deadline = Math.round(Number(input.deadline));
    const sig = String(input.sig ?? "");
    if (!Number.isFinite(turn) || turn < 0 || turn > 100_000) throw new Error("invalid turn");
    if (!Number.isFinite(deadline) || deadline <= 0) throw new Error("invalid deadline");
    if (!/^[0-9a-f]{32}$/i.test(sig)) throw new Error("invalid signature");
    return { matchId: input.matchId, turn, deadline, sig };
  })
  .handler(async ({ data }): Promise<ForfeitVerdict> => {
    const { verifyPayload, recordTurnEvent, TURN_LIMIT_MS, FORFEIT_GRACE_MS } = await import("./live.server");
    const { getRequestHeader } = await import("@tanstack/react-start/server");
    const bearer = getRequestHeader("authorization") ?? null;

    const now = Date.now();
    const elapsedMs = TURN_LIMIT_MS - (data.deadline - now);

    if (!verifyPayload(["turn", data.matchId, data.turn, data.deadline], data.sig)) {
      await recordTurnEvent(bearer, {
        matchId: data.matchId, turn: data.turn, kind: "reject",
        elapsedMs, limitMs: TURN_LIMIT_MS, accepted: false, reason: "bad_signature",
      });
      return { ok: false, reason: "bad_signature", elapsedMs, limitMs: TURN_LIMIT_MS };
    }

    if (now < data.deadline - FORFEIT_GRACE_MS) {
      await recordTurnEvent(bearer, {
        matchId: data.matchId, turn: data.turn, kind: "reject",
        elapsedMs, limitMs: TURN_LIMIT_MS, accepted: false, reason: "too_early",
      });
      return { ok: false, reason: "too_early", elapsedMs, limitMs: TURN_LIMIT_MS };
    }

    await recordTurnEvent(bearer, {
      matchId: data.matchId, turn: data.turn, kind: "timeout",
      elapsedMs, limitMs: TURN_LIMIT_MS, accepted: true, reason: null,
    });
    return { ok: true, reason: "ok", elapsedMs, limitMs: TURN_LIMIT_MS };
  });
