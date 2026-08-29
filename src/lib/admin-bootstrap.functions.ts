import { createServerFn } from "@tanstack/react-start";

/**
 * تعيين كلمة مرور حساب الأدمن مرة واحدة فقط من الأسرار المخزّنة في السيرفر
 * (ADMIN_EMAIL + ADMIN_PASSWORD). لا تُكتب أي بيانات حسّاسة في الكود،
 * ولا تُعاد أي تفاصيل للواجهة سوى حالة عامة.
 */
export const bootstrapAdminPassword = createServerFn({ method: "POST" }).handler(async () => {
  const email = (process.env["ADMIN_EMAIL"] ?? "").trim().toLowerCase();
  const password = process.env["ADMIN_PASSWORD"] ?? "";
  if (!email || password.length < 8) return { ok: false as const };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // تشغيل لمرة واحدة: سجل سابق يعني أن الكلمة مضبوطة مسبقًا
  const { data: done } = await supabaseAdmin
    .from("admin_logs")
    .select("id")
    .eq("action", "admin_password_bootstrap")
    .limit(1)
    .maybeSingle();
  if (done) return { ok: true as const, already: true as const };

  // إيجاد حساب الأدمن عبر ملفه الشخصي المرتبط بالبريد الموثّق
  const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const target = list?.users.find((u) => (u.email ?? "").trim().toLowerCase() === email);
  if (!target) return { ok: false as const };

  const { error } = await supabaseAdmin.auth.admin.updateUserById(target.id, {
    password,
    email_confirm: true,
  });
  if (error) return { ok: false as const };

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

  return { ok: true as const, already: false as const };
});
