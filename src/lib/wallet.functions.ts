import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type RollCharge = {
  ok: boolean;
  reason: string;
  gold: number;
  diamonds: number;
};

/**
 * خصم رسوم رمية النرد من المحفظة — الخصم والتحقق يحدثان في قاعدة البيانات
 * ويُسجَّلان في سجل العمليات، ثم تتحدث المحفظة لحظيًا عبر Realtime.
 */
export const chargeDiceRoll = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { cost?: number; matchId?: string }) => {
    const cost = Math.round(Number(input?.cost ?? 2));
    if (!Number.isFinite(cost) || cost < 0 || cost > 50) throw new Error("invalid cost");
    const matchId = typeof input?.matchId === "string" && UUID_RE.test(input.matchId) ? input.matchId : null;
    return { cost, matchId };
  })
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.rpc("charge_dice_roll", {
      _cost: data.cost,
      _match_id: data.matchId ?? undefined,
    });
    if (error) return { ok: false, reason: error.message, gold: 0, diamonds: 0 } satisfies RollCharge;
    const row = (Array.isArray(rows) ? rows[0] : rows) as RollCharge | null;
    return row ?? ({ ok: false, reason: "unknown", gold: 0, diamonds: 0 } satisfies RollCharge);
  });
