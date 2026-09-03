import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type StoreItem = {
  code: string;
  title: string;
  description: string;
  kind: "avatar" | "banner" | "frame";
  value: string;
  rarity: string;
  cost_gold: number;
  cost_diamonds: number;
  sort: number;
  owned: boolean;
};

/** قائمة عناصر المتجر مع تحديد ما يملكه اللاعب */
export const listStore = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StoreItem[]> => {
    const [{ data: items, error }, { data: mine }] = await Promise.all([
      context.supabase.from("store_items").select("*").eq("active", true).order("sort"),
      context.supabase.from("user_items").select("kind, code").eq("user_id", context.userId),
    ]);
    if (error) throw new Error(error.message);
    const owned = new Set((mine ?? []).map((i) => `${i.kind}:${i.code}`));
    return (items ?? []).map((i) => ({
      code: i.code,
      title: i.title,
      description: i.description,
      kind: i.kind as StoreItem["kind"],
      value: i.value,
      rarity: i.rarity,
      cost_gold: i.cost_gold,
      cost_diamonds: i.cost_diamonds,
      sort: i.sort,
      owned: owned.has(`${i.kind}:${i.code}`),
    }));
  });

/** شراء عنصر بخصم الذهب أو الجواهر من الرصيد الحقيقي */
export const buyStoreItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { code: string }) => data)
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.rpc("purchase_store_item", {
      _code: data.code,
    } as never);
    if (error) throw new Error(error.message);
    const row = (rows as unknown as Array<{ ok: boolean; reason: string }> | null)?.[0];
    return { ok: row?.ok ?? false, reason: row?.reason ?? "unknown" };
  });

/** ارتداء عنصر مملوك */
export const equipItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { kind: string; code: string }) => data)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("equip_item", {
      _kind: data.kind,
      _code: data.code,
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
