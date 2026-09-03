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
