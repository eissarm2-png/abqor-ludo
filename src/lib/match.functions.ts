import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type MatchSubmission = {
  matchId: string;
  result: "win" | "loss";
  players: number;
  moves: number;
  durationMs: number;
  mode?: "ludo" | "domino";
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * تسجيل نتيجة مباراة بعد التحقق منها في السيرفر:
 * الهوية تأتي من التوكن، والنقاط تُحسب داخل قاعدة البيانات،
 * والمباراة نفسها لا يمكن تسجيلها أكثر من مرة.
 */
export const submitMatchResult = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: MatchSubmission) => {
    if (!input || typeof input !== "object") throw new Error("invalid payload");
    if (!UUID_RE.test(input.matchId)) throw new Error("invalid match id");
    if (input.result !== "win" && input.result !== "loss") throw new Error("invalid result");
    const players = Math.round(Number(input.players));
    const moves = Math.round(Number(input.moves));
    const durationMs = Math.round(Number(input.durationMs));
    if (!Number.isFinite(players) || players < 2 || players > 4) throw new Error("invalid players");
    if (!Number.isFinite(moves) || moves < 0 || moves > 5000) throw new Error("invalid moves");
    if (!Number.isFinite(durationMs) || durationMs < 0 || durationMs > 6 * 60 * 60 * 1000) {
      throw new Error("invalid duration");
    }
    const mode = input.mode === "domino" ? "domino" : "ludo";
    return { matchId: input.matchId, result: input.result, players, moves, durationMs, mode };
  })
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.rpc("record_game_result", {
      _result: data.result,
      _players: data.players,
      _match_id: data.matchId,
      _moves: data.moves,
      _duration_ms: data.durationMs,
      _mode: data.mode,
    });
    if (error) return { ok: false as const, reason: error.message };
    const row = Array.isArray(rows) ? rows[0] : rows;
    return {
      ok: true as const,
      points: (row as { points?: number } | null)?.points ?? 0,
      gold: (row as { gold?: number } | null)?.gold ?? 0,
      xp: (row as { xp?: number } | null)?.xp ?? 0,
      duplicate: (row as { duplicate?: boolean } | null)?.duplicate ?? false,
    };
  });
