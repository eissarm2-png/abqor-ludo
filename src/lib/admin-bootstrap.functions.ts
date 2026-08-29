import { createServerFn } from "@tanstack/react-start";

/**
 * تجهيز حساب الأدمن من أسرار السيرفر (ADMIN_EMAIL + ADMIN_PASSWORD):
 * يُنشئ الحساب إن لم يكن موجودًا، يضبط كلمة المرور، يؤكد البريد،
 * ويمنحه صلاحية الأدمن. لا تُكتب أي بيانات حسّاسة في الواجهة.
 */
export const bootstrapAdminPassword = createServerFn({ method: "POST" }).handler(async () => {
  const email = (process.env["ADMIN_EMAIL"] ?? "").trim().toLowerCase();
  const password = process.env["ADMIN_PASSWORD"] ?? "";
  if (!email || password.length < 8) return { ok: false as const };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
  let target = list?.users.find((u) => (u.email ?? "").trim().toLowerCase() === email) ?? null;

  if (!target) {
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: "الأدمن" },
    });
    if (createError || !created?.user) return { ok: false as const };
    target = created.user;
  } else {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(target.id, {
      password,
      email_confirm: true,
    });
    if (error) return { ok: false as const };
  }

  await supabaseAdmin
    .from("user_roles")
    .upsert(
      { user_id: target.id, role: "admin" },
      { onConflict: "user_id,role", ignoreDuplicates: true },
    );

  await supabaseAdmin.from("admin_logs").insert({
    admin_id: target.id,
    action: "admin_password_bootstrap",
    detail: { source: "server_secret" },
  });

  return { ok: true as const };
});
