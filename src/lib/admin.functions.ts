import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function uuid(value: unknown): string {
  const id = String(value ?? "");
  if (!UUID_RE.test(id)) throw new Error("invalid id");
  return id;
}

function int(value: unknown, min: number, max: number): number {
  const n = Math.round(Number(value ?? 0));
  if (!Number.isFinite(n)) throw new Error("invalid number");
  return Math.min(Math.max(n, min), max);
}

function text(value: unknown, max = 160): string {
  return String(value ?? "").slice(0, max);
}

export type AdminUser = {
  id: string;
  email: string;
  display_name: string;
  avatar: string;
  gold: number;
  diamonds: number;
  xp: number;
  level: number;
  points: number;
  games: number;
  wins: number;
  losses: number;
  banned: boolean;
  banned_reason: string | null;
  is_admin: boolean;
  created_at: string;
};

export type AdminStats = {
  users: number;
  banned: number;
  matches: number;
  matches_24h: number;
  gold: number;
  diamonds: number;
  ludo_matches: number;
  domino_matches: number;
  admins: number;
};

/**
 * تفعيل حساب الأدمن بطريقة آمنة:
 * يُقارن بريد الحساب الموثّق من التوكن مع السر ADMIN_EMAIL داخل السيرفر فقط.
 * لا تُخزَّن بيانات الأدمن في الكود ولا تُعاد في أي رسالة.
 */
export const syncAdminRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const claims = context.claims as { email?: string; email_verified?: boolean } | null;
    const email = String(claims?.email ?? "").trim().toLowerCase();
    const expected = (process.env["ADMIN_EMAIL"] ?? "").trim().toLowerCase();

    if (expected && email && email === expected) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("user_roles").upsert(
        { user_id: context.userId, role: "admin" },
        { onConflict: "user_id,role", ignoreDuplicates: true },
      );
    }

    const { data, error } = await context.supabase.rpc("is_admin");
    if (error) return { isAdmin: false, reason: "role_check_failed" as const };
    return { isAdmin: Boolean(data), reason: "ok" as const };
  });

/** هل الحساب الحالي أدمن؟ التحقق يجري في قاعدة البيانات */
export const checkAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("is_admin");
    return { isAdmin: Boolean(data) };
  });

export const adminStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("admin_stats");
    if (error) return { ok: false as const, reason: error.message, stats: null };
    const stats = (Array.isArray(data) ? data[0] : data) as AdminStats | undefined;
    return { ok: true as const, reason: "ok", stats: stats ?? null };
  });

export const adminListUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { search?: string; limit?: number; offset?: number }) => ({
    search: text(input?.search ?? "", 60),
    limit: int(input?.limit ?? 30, 1, 100),
    offset: int(input?.offset ?? 0, 0, 100_000),
  }))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.rpc("admin_list_users", {
      _search: data.search,
      _limit: data.limit,
      _offset: data.offset,
    });
    if (error) return { ok: false as const, reason: "forbidden", users: [] as AdminUser[] };
    return { ok: true as const, reason: "ok", users: (rows ?? []) as unknown as AdminUser[] };
  });

export const adminAdjustEconomy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; gold?: number; diamonds?: number; xp?: number; note?: string }) => ({
    userId: uuid(input?.userId),
    gold: int(input?.gold ?? 0, -1_000_000, 1_000_000),
    diamonds: int(input?.diamonds ?? 0, -100_000, 100_000),
    xp: int(input?.xp ?? 0, -1_000_000, 1_000_000),
    note: text(input?.note ?? "", 120),
  }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_adjust_economy", {
      _uid: data.userId,
      _gold: data.gold,
      _diamonds: data.diamonds,
      _xp: data.xp,
      _note: data.note,
    });
    return error ? { ok: false as const, reason: "forbidden" } : { ok: true as const, reason: "ok" };
  });

export const adminUpdateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    userId: string; displayName?: string; avatar?: string; banner?: string; frame?: string; level?: number;
  }) => ({
    userId: uuid(input?.userId),
    displayName: text(input?.displayName ?? "", 40),
    avatar: text(input?.avatar ?? "", 8),
    banner: text(input?.banner ?? "", 40),
    frame: text(input?.frame ?? "", 40),
    level: int(input?.level ?? 0, 0, 999),
  }))
  .handler(async ({ data, context }) => {
    const args = {
      _uid: data.userId,
      _display_name: data.displayName,
      _avatar: data.avatar,
      _banner: data.banner,
      _frame: data.frame,
      ...(data.level > 0 ? { _level: data.level } : {}),
    };
    const { error } = await context.supabase.rpc("admin_update_profile", args);
    return error ? { ok: false as const, reason: "forbidden" } : { ok: true as const, reason: "ok" };
  });

export const adminSetBan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; banned: boolean; reason?: string }) => ({
    userId: uuid(input?.userId),
    banned: Boolean(input?.banned),
    reason: text(input?.reason ?? "", 160),
  }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_set_ban", {
      _uid: data.userId,
      _banned: data.banned,
      _reason: data.reason,
    });
    return error ? { ok: false as const, reason: "forbidden" } : { ok: true as const, reason: "ok" };
  });

export const adminSetRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; role: "admin" | "moderator" | "user"; grant: boolean }) => {
    const role = input?.role;
    if (role !== "admin" && role !== "moderator" && role !== "user") throw new Error("invalid role");
    return { userId: uuid(input?.userId), role, grant: Boolean(input?.grant) };
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_set_role", {
      _uid: data.userId,
      _role: data.role,
      _grant: data.grant,
    });
    return error ? { ok: false as const, reason: "forbidden" } : { ok: true as const, reason: "ok" };
  });

export const adminGrantItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; kind: "avatar" | "banner" | "frame"; code: string; rarity?: string }) => {
    const kind = input?.kind;
    if (kind !== "avatar" && kind !== "banner" && kind !== "frame") throw new Error("invalid kind");
    return { userId: uuid(input?.userId), kind, code: text(input?.code, 40), rarity: text(input?.rarity ?? "rare", 20) };
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_grant_item", {
      _uid: data.userId,
      _kind: data.kind,
      _code: data.code,
      _rarity: data.rarity,
    });
    return error ? { ok: false as const, reason: "forbidden" } : { ok: true as const, reason: "ok" };
  });

export const adminRecentMatches = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { limit?: number }) => ({ limit: int(input?.limit ?? 40, 1, 200) }))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.rpc("admin_recent_matches", { _limit: data.limit });
    if (error) return { ok: false as const, reason: "forbidden", matches: [] };
    return { ok: true as const, reason: "ok", matches: rows ?? [] };
  });

export const adminLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { limit?: number }) => ({ limit: int(input?.limit ?? 50, 1, 200) }))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.rpc("admin_logs_list", { _limit: data.limit });
    if (error) return { ok: false as const, reason: "forbidden", logs: [] };
    return { ok: true as const, reason: "ok", logs: rows ?? [] };
  });

export const adminTurnEvents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { limit?: number }) => ({ limit: int(input?.limit ?? 50, 1, 200) }))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.rpc("admin_turn_events", { _limit: data.limit });
    if (error) return { ok: false as const, reason: "forbidden", events: [] };
    return { ok: true as const, reason: "ok", events: rows ?? [] };
  });

/** كتالوجات اللعبة (صناديق/مهام/متجر) للوحة الأدمن */
export const adminCatalog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [chests, missions, store] = await Promise.all([
      context.supabase.from("chest_defs").select("*").order("sort"),
      context.supabase.from("mission_defs").select("*").order("sort"),
      context.supabase.from("store_items").select("*").order("sort"),
    ]);
    return {
      chests: chests.data ?? [],
      missions: missions.data ?? [],
      store: store.data ?? [],
    };
  });

export const adminToggleChest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { code: string; active: boolean; costGold?: number; costDiamonds?: number }) => ({
    code: text(input?.code, 40),
    active: Boolean(input?.active),
    costGold: int(input?.costGold ?? 0, 0, 1_000_000),
    costDiamonds: int(input?.costDiamonds ?? 0, 0, 100_000),
  }))
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase.from("chest_defs").select("*").eq("code", data.code).maybeSingle();
    if (!row) return { ok: false as const, reason: "not_found" };
    const { error } = await context.supabase.rpc("admin_upsert_chest", {
      _code: row.code,
      _title: row.title,
      _description: row.description,
      _tier: row.tier,
      _cost_gold: data.costGold,
      _cost_diamonds: data.costDiamonds,
      _cooldown_minutes: row.cooldown_minutes,
      _sort: row.sort,
      _active: data.active,
    });
    return error ? { ok: false as const, reason: "forbidden" } : { ok: true as const, reason: "ok" };
  });

export const adminToggleMission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { code: string; active: boolean; goal?: number; rewardGold?: number }) => ({
    code: text(input?.code, 40),
    active: Boolean(input?.active),
    goal: int(input?.goal ?? 1, 1, 100_000),
    rewardGold: int(input?.rewardGold ?? 0, 0, 1_000_000),
  }))
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase.from("mission_defs").select("*").eq("code", data.code).maybeSingle();
    if (!row) return { ok: false as const, reason: "not_found" };
    const { error } = await context.supabase.rpc("admin_upsert_mission", {
      _code: row.code,
      _title: row.title,
      _description: row.description,
      _period: row.period,
      _metric: row.metric,
      _goal: data.goal,
      _reward_gold: data.rewardGold,
      _reward_diamonds: row.reward_diamonds,
      _reward_xp: row.reward_xp,
      _sort: row.sort,
      _active: data.active,
    });
    return error ? { ok: false as const, reason: "forbidden" } : { ok: true as const, reason: "ok" };
  });

export const adminSaveStoreItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    code: string; title: string; description?: string; kind: "avatar" | "banner" | "frame";
    value?: string; rarity?: string; costGold?: number; costDiamonds?: number; sort?: number; active?: boolean;
  }) => {
    const kind = input?.kind;
    if (kind !== "avatar" && kind !== "banner" && kind !== "frame") throw new Error("invalid kind");
    const code = text(input?.code, 40);
    if (!/^[a-z0-9-]{2,40}$/.test(code)) throw new Error("invalid code");
    return {
      code,
      title: text(input?.title, 60) || code,
      description: text(input?.description ?? "", 160),
      kind,
      value: text(input?.value ?? "", 40),
      rarity: text(input?.rarity ?? "common", 20),
      costGold: int(input?.costGold ?? 0, 0, 1_000_000),
      costDiamonds: int(input?.costDiamonds ?? 0, 0, 100_000),
      sort: int(input?.sort ?? 0, 0, 9999),
      active: input?.active === undefined ? true : Boolean(input.active),
    };
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_upsert_store_item", {
      _code: data.code,
      _title: data.title,
      _description: data.description,
      _kind: data.kind,
      _value: data.value,
      _rarity: data.rarity,
      _cost_gold: data.costGold,
      _cost_diamonds: data.costDiamonds,
      _sort: data.sort,
      _active: data.active,
    });
    return error ? { ok: false as const, reason: "forbidden" } : { ok: true as const, reason: "ok" };
  });
