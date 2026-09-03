import { useState } from "react";
import { LogIn, LogOut, RefreshCw, UserCircle2, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

/**
 * ربط الحساب وتحديث الواجهة بالبيانات الحقيقية فورًا (بدون إعادة تثبيت التطبيق).
 */
export function AccountLinkCard({ onOpenAccount }: { onOpenAccount: () => void }) {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const [busy, setBusy] = useState(false);

  const hardRefresh = async () => {
    setBusy(true);
    try {
      await supabase.auth.refreshSession();
      await refreshProfile();
      toast.success("تم تحديث بيانات حسابك في الواجهة");
    } catch {
      toast.error("تعذّر تحديث البيانات");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-xl border border-ludo-gold/35 bg-ludo-panel/70 p-3">
      <h3 className="mb-2 flex items-center gap-2 font-bold text-ludo-gold">
        <Link2 className="size-4" /> حسابي
      </h3>

      <div className="list-card items-center">
        <span className="avatar-orb shrink-0 text-xl">{profile?.avatar || "🎲"}</span>
        <span className="min-w-0 flex-1">
          <b className="block truncate text-ludo-gold">
            {profile?.display_name ?? (user ? "لاعب" : "وضع الضيف")}
          </b>
          <small className="block truncate text-[11px] text-ludo-soft">
            {user?.email ?? "غير مرتبط بأي بريد — تقدّمك محفوظ على هذا الجهاز فقط"}
          </small>
        </span>
        {user && (
          <span className="shrink-0 rounded-full border border-ludo-gold/40 px-2 py-0.5 text-[11px] font-bold text-ludo-gold">
            مستوى {profile?.level ?? 1}
          </span>
        )}
      </div>

      <div className="mt-2 grid gap-2">
        {user ? (
          <>
            <Button variant="royal" className="w-full" disabled={busy} onClick={() => void hardRefresh()}>
              <RefreshCw className="size-4" /> تحديث بيانات حسابي الآن
            </Button>
            <Button variant="royal" className="w-full" onClick={onOpenAccount}>
              <UserCircle2 className="size-4" /> إدارة الحساب
            </Button>
            <Button
              variant="destructive"
              className="w-full"
              onClick={async () => {
                await signOut();
                toast.success("تم تسجيل الخروج");
              }}
            >
              <LogOut className="size-4" /> تسجيل الخروج
            </Button>
          </>
        ) : (
          <Button variant="play" className="w-full" onClick={onOpenAccount}>
            <LogIn className="size-4" /> ربط حسابي (تسجيل دخول / إنشاء حساب)
          </Button>
        )}
      </div>
    </section>
  );
}
