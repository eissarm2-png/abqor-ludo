import { useCallback, useEffect, useState } from "react";
import { Loader2, ShieldCheck, Lock, Mail } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  getPlayerSettings,
  savePlayerSettings,
  type PlayerSettings,
} from "@/lib/player-settings.functions";

const VISIBILITY: { code: PlayerSettings["profile_visibility"]; label: string }[] = [
  { code: "public", label: "الجميع" },
  { code: "friends", label: "الأصدقاء فقط" },
  { code: "private", label: "لا أحد" },
];

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-ludo-gold/25 bg-ludo-panel/60 px-3 py-2">
      <span className="min-w-0">
        <b className="block text-sm text-ludo-soft">{label}</b>
        {hint && <small className="block text-[11px] text-ludo-soft/70">{hint}</small>}
      </span>
      <span className="shrink-0">{children}</span>
    </div>
  );
}

export function SecurityScreen() {
  const { user } = useAuth();
  const load = useServerFn(getPlayerSettings);
  const save = useServerFn(savePlayerSettings);
  const [settings, setSettings] = useState<PlayerSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      setSettings(await load({}));
    } finally {
      setLoading(false);
    }
  }, [load, user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const patch = async (next: Partial<PlayerSettings>) => {
    if (!settings) return;
    const merged = { ...settings, ...next };
    setSettings(merged);
    try {
      setSettings(await save({ data: next }));
    } catch {
      toast.error("تعذّر حفظ الإعداد");
      await refresh();
    }
  };

  if (!user) {
    return <p className="glossy-card text-center text-sm text-ludo-soft">سجّل الدخول لإدارة الحماية والأمان.</p>;
  }
  if (loading || !settings) {
    return (
      <div className="grid place-items-center py-10 text-ludo-gold">
        <Loader2 className="size-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="space-y-2">
        <h4 className="text-sm font-bold text-ludo-gold">حماية الحساب</h4>
        <Row label="البريد المرتبط" hint={user.email ?? "—"}>
          <Mail className="size-5 text-ludo-gold" />
        </Row>
        <Row
          label="تأكيد البريد"
          hint={user.email_confirmed_at ? "مؤكَّد" : "غير مؤكَّد"}
        >
          <ShieldCheck className={user.email_confirmed_at ? "size-5 text-ludo-palm" : "size-5 text-ludo-soft/60"} />
        </Row>
        <Button
          variant="royal"
          className="w-full"
          disabled={sending || !user.email}
          onClick={async () => {
            setSending(true);
            const { error } = await supabase.auth.resetPasswordForEmail(user.email!, {
              redirectTo: `${window.location.origin}/?recovery=1`,
            });
            setSending(false);
            if (error) toast.error("تعذّر إرسال رابط تغيير كلمة المرور");
            else toast.success("أُرسل رابط تغيير كلمة المرور إلى بريدك");
          }}
        >
          <Lock className="size-4" /> تغيير كلمة المرور
        </Button>
      </section>

      <section className="space-y-2">
        <h4 className="text-sm font-bold text-ludo-gold">إعدادات الخصوصية</h4>
        <Row label="من يمكنه رؤية ملفك">
          <select
            value={settings.profile_visibility}
            onChange={(e) => void patch({ profile_visibility: e.target.value as PlayerSettings["profile_visibility"] })}
            className="rounded-lg border border-ludo-gold/40 bg-ludo-deep px-2 py-1 text-sm text-ludo-soft"
          >
            {VISIBILITY.map((v) => (
              <option key={v.code} value={v.code}>{v.label}</option>
            ))}
          </select>
        </Row>
        <Row label="السماح بدعوات اللعب" hint="استقبال دعوات الغرف من اللاعبين">
          <Switch checked={settings.allow_invites} onCheckedChange={(v) => void patch({ allow_invites: v })} />
        </Row>
        <Row label="إظهار حالة الاتصال" hint="ظهورك كمتصل للأصدقاء">
          <Switch checked={settings.show_online} onCheckedChange={(v) => void patch({ show_online: v })} />
        </Row>
      </section>

      <section className="space-y-2">
        <h4 className="text-sm font-bold text-ludo-gold">حماية اللعب</h4>
        <Row label="التحقق من الحركات" hint="كل رمية نرد موقّعة من الخادم">
          <ShieldCheck className="size-5 text-ludo-palm" />
        </Row>
        <Row label="حماية الغرف" hint="الانضمام بالكود فقط للغرف الخاصة">
          <ShieldCheck className="size-5 text-ludo-palm" />
        </Row>
        <Row label="حماية المعاملات" hint="كل عملية شراء تُنفَّذ وتُسجَّل في الخادم">
          <ShieldCheck className="size-5 text-ludo-palm" />
        </Row>
      </section>
    </div>
  );
}
