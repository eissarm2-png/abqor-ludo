import { createServerFn } from "@tanstack/react-start";

/**
 * تجهيز حساب الأدمن من أسرار السيرفر (ADMIN_EMAIL + ADMIN_PASSWORD):
 * يُنشئ الحساب إن لم يكن موجودًا، يضبط كلمة المرور، يؤكد البريد،
 * ويمنحه صلاحية الأدمن. لا تُكتب أي بيانات حسّاسة في الواجهة.
 */
/** بُريد المشرفين المعتمدين (تُستخدم كلمة المرور من السر ADMIN_PASSWORD) */
const ADMIN_EMAILS = ["hzamm586@gmail.com", "laswiz71@gmail.com"];

export const bootstrapAdminPassword = createServerFn({ method: "POST" }).handler(async () => {
  const password = process.env["ADMIN_PASSWORD"] ?? "";
  const secretEmail = (process.env["ADMIN_EMAIL"] ?? "").trim().toLowerCase();
  if (password.length < 8) return { ok: false as const };

  const emails = Array.from(
    new Set([...ADMIN_EMAILS, secretEmail].filter((e) => e.includes("@"))),
  );

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });

  let done = 0;
  for (const email of emails) {
    let target = list?.users.find((u) => (u.email ?? "").trim().toLowerCase() === email) ?? null;

    if (!target) {
      const { data: created } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { display_name: email.split("@")[0] },
      });
      if (!created?.user) continue;
      target = created.user;
    } else {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(target.id, {
        password,
        email_confirm: true,
      });
      if (error) continue;
    }

    await supabaseAdmin
      .from("user_roles")
      .upsert(
        { user_id: target.id, role: "admin" },
        { onConflict: "user_id,role", ignoreDuplicates: true },
      );
    done += 1;
  }

  return { ok: done > 0 };
});
