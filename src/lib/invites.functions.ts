import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type InviteRow = {
  id: string;
  direction: "incoming" | "outgoing";
  other_name: string | null;
  other_avatar: string | null;
  room_code: string;
  mode: string;
  max_players: number;
  status: "pending" | "accepted" | "declined";
  created_at: string;
};

/** كل دعوات اللعب الواردة والمرسلة خلال 24 ساعة */
export const listInvites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<InviteRow[]> => {
    const { data, error } = await context.supabase.rpc("list_game_invites" as never);
    if (error) throw new Error(error.message);
    return (data as unknown as InviteRow[]) ?? [];
  });

/** إرسال دعوة لصديق إلى غرفة قائمة */
export const sendInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { to: string; roomCode: string }) => data)
  .handler(async ({ data, context }) => {
    const { data: res, error } = await context.supabase.rpc("send_game_invite", {
      _to: data.to,
      _room_code: data.roomCode,
    } as never);
    if (error) throw new Error(error.message);
    return (res as unknown as { ok: boolean; reason?: string }) ?? { ok: false, reason: "unknown" };
  });

/** قبول أو رفض دعوة */
export const respondInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; accept: boolean }) => data)
  .handler(async ({ data, context }) => {
    const { data: res, error } = await context.supabase.rpc("respond_game_invite", {
      _id: data.id,
      _accept: data.accept,
    } as never);
    if (error) throw new Error(error.message);
    return (res as unknown as { ok: boolean; room_code?: string; accepted?: boolean }) ?? {
      ok: false,
    };
  });

/** رفض كل الدعوات المعلّقة */
export const rejectAllInvites = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase.rpc("reject_all_game_invites" as never);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
