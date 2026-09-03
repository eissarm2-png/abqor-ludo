import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PlayerSettings = {
  user_id: string;
  profile_visibility: "public" | "friends" | "private";
  allow_invites: boolean;
  show_online: boolean;
  language: string;
  graphics: "high" | "medium" | "low";
  battery_saver: boolean;
  updated_at: string;
};

/** إعدادات الخصوصية والحماية الخاصة باللاعب */
export const getPlayerSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PlayerSettings> => {
    const { data, error } = await context.supabase.rpc("get_player_settings" as never);
    if (error) throw new Error(error.message);
    return data as unknown as PlayerSettings;
  });

/** حفظ إعدادات الخصوصية والحماية */
export const savePlayerSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: Partial<PlayerSettings>) => data)
  .handler(async ({ data, context }): Promise<PlayerSettings> => {
    const { data: res, error } = await context.supabase.rpc("save_player_settings", {
      _settings: data,
    } as never);
    if (error) throw new Error(error.message);
    return res as unknown as PlayerSettings;
  });

export type SecurityEvent = {
  id: string;
  action: string;
  detail: Record<string, unknown>;
  created_at: string;
};

/** سجل عمليات الأمان الخاصة باللاعب */
export const listSecurityEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SecurityEvent[]> => {
    const { data, error } = await context.supabase.rpc("list_security_events", { _limit: 50 } as never);
    if (error) throw new Error(error.message);
    return (data as unknown as SecurityEvent[]) ?? [];
  });

/** تسجيل عملية أمان (تغيير كلمة المرور مثلًا) */
export const logSecurityEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { action: string; detail?: Record<string, unknown> }) => data)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("log_security_event", {
      _action: data.action,
      _detail: data.detail ?? {},
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
