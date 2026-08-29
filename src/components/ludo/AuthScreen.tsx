import { useEffect, useState } from "react";
import { LogIn, LogOut, Mail, ShieldCheck, Trophy, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { sfx } from "@/lib/audio";
import { bootstrapAdminPassword } from "@/lib/admin-bootstrap.functions";

/** ترجمة أخطاء المصادقة إلى رسائل عربية مفهومة بدون تفاصيل تقنية */
function authMessage(raw: string, mode: "login" | "signup"): string {
  const m = raw.toLowerCase();
  if (m.includes("invalid login credentials") || m.includes("invalid credentials")) {
    return "البريد أو كلمة المرور غير صحيحة";
  }
  if (
    m.includes("already registered") ||
    m.includes("already been registered") ||
    m.includes("user already")
  ) {
    return "هذا البريد مستخدم بالفعل";
  }
  if (m.includes("email not confirmed")) return "لم يتم تأكيد البريد بعد، تحقق من رسالة التأكيد";
  if (
    m.includes("password") &&
    (m.includes("least") || m.includes("short") || m.includes("weak"))
  ) {
    return "كلمة المرور قصيرة جدًا، استخدم 6 أحرف على الأقل";
  }
  if (m.includes("invalid email") || (m.includes("email address") && m.includes("invalid"))) {
    return "صيغة البريد الإلكتروني غير صحيحة";
  }
  if (m.includes("rate limit") || m.includes("too many"))
    return "محاولات كثيرة، انتظر قليلًا ثم أعد المحاولة";
  if (m.includes("network") || m.includes("failed to fetch"))
    return "تعذّر الاتصال بالخدمة، تحقق من الإنترنت";
  return mode === "login"
    ? "تعذّر تسجيل الدخول، حاول مرة أخرى"
    : "تعذّر إنشاء الحساب، حاول مرة أخرى";
}

export function AuthPanel() {
  const { user, profile, loading, signOut, refreshProfile } = useAuth();
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** تجهيز حساب الأدمن مرة واحدة من أسرار السيرفر (بدون أي بيانات في الواجهة) */
  useEffect(() => {
    void bootstrapAdminPassword().catch(() => {});
  }, []);

  if (loading) return <p className="py-10 text-center text-ludo-soft">جارٍ التحقق من الحساب…</p>;

  if (user) {
    return (
      <div className="space-y-4">
        <div className="coin-card flex items-center gap-3">
          <span className="avatar-orb bg-ludo-gold text-2xl">{profile?.avatar ?? "👑"}</span>
          <span className="min-w-0 flex-1">
            <b className="block truncate text-lg text-ludo-gold">
              {profile?.display_name ?? "لاعب"}
            </b>
            <small className="block truncate text-ludo-soft">{user.email}</small>
          </span>
          <ShieldCheck className="size-6 text-ludo-palm" />
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          <StatBox label="النقاط" value={profile?.points ?? 0} />
          <StatBox label="فوز" value={profile?.wins ?? 0} />
          <StatBox label="خسارة" value={profile?.losses ?? 0} />
          <StatBox label="لعبات" value={profile?.games ?? 0} />
        </div>
        {profile?.banned && (
          <p className="rounded-lg bg-destructive/20 p-2 text-center text-xs text-destructive-foreground">
            هذا الحساب موقوف حاليًا{profile.banned_reason ? ` — ${profile.banned_reason}` : ""}
          </p>
        )}
        <ProfileNameForm current={profile?.display_name ?? ""} onSaved={refreshProfile} />
        <Button variant="ghostGold" className="w-full" onClick={() => void signOut()}>
          <LogOut /> تسجيل الخروج
        </Button>
      </div>
    );
  }

  const submit = async () => {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      if (mode === "reset") {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/?recovery=1`,
        });
        if (err) throw err;
        setNote("أرسلنا رسالة إلى بريدك تحتوي رابط إعادة تعيين كلمة المرور");
      } else if (mode === "signup") {
        const { error: err } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (err) throw err;
        setNote("تم إنشاء الحساب بنجاح! جارٍ تجهيز ملفك الشخصي…");
        sfx.start();
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        sfx.start();
      }
    } catch (e) {
      setError(
        mode === "reset"
          ? "تعذّر إرسال رسالة إعادة التعيين، تحقق من البريد وحاول مرة أخرى"
          : authMessage(e instanceof Error ? e.message : "", mode),
      );
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) setError("تعذّر تسجيل الدخول بجوجل، حاول مرة أخرى");
  };

  return (
    <div className="space-y-4">
      <p className="text-center text-sm text-ludo-soft">
        سجّل الدخول لحفظ نقاطك وإحصائياتك والمنافسة على لوحة المتصدرين
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Button variant={mode === "login" ? "royal" : "neon"} onClick={() => setMode("login")}>
          <LogIn /> دخول
        </Button>
        <Button variant={mode === "signup" ? "royal" : "neon"} onClick={() => setMode("signup")}>
          <UserPlus /> حساب جديد
        </Button>
      </div>

      <div className="space-y-2">
        {mode === "signup" && (
          <Input
            placeholder="اسمك في اللعبة"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        )}
        <Input
          type="email"
          placeholder="البريد الإلكتروني"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {mode !== "reset" && (
          <Input
            type="password"
            placeholder="كلمة المرور"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        )}
      </div>

      <button
        type="button"
        className="w-full text-center text-xs text-ludo-gold underline"
        onClick={() => {
          setError(null);
          setNote(null);
          setMode(mode === "reset" ? "login" : "reset");
        }}
      >
        {mode === "reset" ? "العودة لتسجيل الدخول" : "نسيت كلمة المرور؟"}
      </button>

      {error && (
        <p className="rounded-lg bg-destructive/20 p-2 text-center text-xs text-destructive-foreground">
          {error}
        </p>
      )}
      {note && (
        <p className="rounded-lg bg-ludo-palm/20 p-2 text-center text-xs text-ludo-soft">{note}</p>
      )}

      <Button
        variant="play"
        size="xl"
        className="w-full"
        disabled={busy || !email || (mode !== "reset" && !password)}
        onClick={() => void submit()}
      >
        <Mail />{" "}
        {mode === "reset"
          ? "أرسل رابط الاستعادة"
          : mode === "login"
            ? "تسجيل الدخول"
            : "إنشاء الحساب"}
      </Button>
      <Button variant="neon" className="w-full" onClick={() => void google()}>
        <Trophy /> المتابعة بحساب جوجل
      </Button>
    </div>
  );
}

function ProfileNameForm({ current, onSaved }: { current: string; onSaved: () => Promise<void> }) {
  const { user } = useAuth();
  const [value, setValue] = useState(current);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!user || !value.trim()) return;
    setSaving(true);
    await supabase
      .from("profiles")
      .update({ display_name: value.trim().slice(0, 40) })
      .eq("id", user.id);
    await onSaved();
    setSaving(false);
  };

  return (
    <div className="flex gap-2">
      <Input
        value={value}
        maxLength={40}
        onChange={(e) => setValue(e.target.value)}
        placeholder="اسمك الظاهر"
      />
      <Button variant="royal" disabled={saving} onClick={() => void save()}>
        حفظ
      </Button>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-ludo-gold/40 bg-ludo-panel/80 p-2">
      <b className="block text-lg text-ludo-gold">{value}</b>
      <small className="text-[10px] text-ludo-soft">{label}</small>
    </div>
  );
}
