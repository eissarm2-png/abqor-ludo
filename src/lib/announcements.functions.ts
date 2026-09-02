import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type Announcement = {
  id: string;
  title: string;
  body: string;
  kind: string;
  link: string;
  active: boolean;
  expires_at: string | null;
  created_at: string;
};

function text(value: unknown, max: number) {
  return String(value ?? "").slice(0, max);
}

/** قائمة الإعلانات كاملة (للأدمن فقط) */
export const adminListAnnouncements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("admin_list_announcements");
    if (error) return { ok: false as const, items: [] as Announcement[] };
    return { ok: true as const, items: (data ?? []) as unknown as Announcement[] };
  });

/** إضافة أو تعديل إعلان */
export const adminSaveAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    id?: string | null; title: string; body?: string; kind?: string; link?: string;
    active?: boolean; expiresAt?: string | null;
  }) => {
    const id = input?.id ? (UUID_RE.test(input.id) ? input.id : null) : null;
    const title = text(input?.title, 80).trim();
    if (!title) throw new Error("invalid title");
    const kind = input?.kind === "notice" || input?.kind === "popup" ? input.kind : "banner";
    return {
      id,
      title,
      body: text(input?.body ?? "", 300),
      kind,
      link: text(input?.link ?? "", 200),
      active: input?.active === undefined ? true : Boolean(input.active),
      expiresAt: input?.expiresAt ? String(input.expiresAt) : null,
    };
  })
  .handler(async ({ data, context }) => {
    const args = {
      _id: data.id,
      _title: data.title,
      _body: data.body,
      _kind: data.kind,
      _link: data.link,
      _active: data.active,
      _expires_at: data.expiresAt,
    } as unknown as { _title: string };
    const { error } = await context.supabase.rpc("admin_save_announcement", args);
    return error ? { ok: false as const, reason: "forbidden" } : { ok: true as const, reason: "ok" };
  });

export const adminDeleteAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!UUID_RE.test(String(input?.id ?? ""))) throw new Error("invalid id");
    return { id: input.id };
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_delete_announcement", { _id: data.id });
    return error ? { ok: false as const, reason: "forbidden" } : { ok: true as const, reason: "ok" };
  });

export type AdminRoom = {
  id: string;
  name: string;
  code: string;
  mode: string;
  status: string;
  is_public: boolean;
  max_players: number;
  members: number;
  host_name: string | null;
  created_at: string;
};

export const adminListRooms = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("admin_rooms_list", { _limit: 60 });
    if (error) return { ok: false as const, rooms: [] as AdminRoom[] };
    return { ok: true as const, rooms: (data ?? []) as unknown as AdminRoom[] };
  });

export const adminDeleteRoom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!UUID_RE.test(String(input?.id ?? ""))) throw new Error("invalid id");
    return { id: input.id };
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_delete_room", { _room: data.id });
    return error ? { ok: false as const, reason: "forbidden" } : { ok: true as const, reason: "ok" };
  });
