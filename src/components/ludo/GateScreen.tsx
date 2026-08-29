import { Crown, LogIn, UserPlus, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import brandMark from "@/assets/brand-mark.png";

type Props = {
  onSignIn: () => void;
  onSignUp: () => void;
  onGuest: () => void;
};

/** بوابة الحساب: دخول / إنشاء حساب / لعب كضيف */
export function GateScreen({ onSignIn, onSignUp, onGuest }: Props) {
  return (
    <div className="ludo-shell grid min-h-screen place-items-center px-5" dir="rtl">
      <div className="relative w-full max-w-sm space-y-4 text-center">
        <img src={brandMark} alt="شعار عبقور لودو" width={512} height={512} className="asset-shine mx-auto size-24" />
        <h1 className="font-display text-3xl font-black text-ludo-gold text-shadow-glow">ABQOR LUDO</h1>
        <p className="-mt-2 text-sm font-bold text-ludo-pink">عبقور لودو — لودو ودومينو ملكي</p>

        <div className="royal-panel space-y-3 p-4">
          <Button variant="play" size="xl" className="w-full" onClick={onSignIn}>
            <LogIn /> تسجيل الدخول
          </Button>
          <Button variant="royal" size="xl" className="w-full" onClick={onSignUp}>
            <UserPlus /> إنشاء حساب
          </Button>
          <div className="flex items-center gap-2 text-xs text-ludo-soft">
            <span className="h-px flex-1 bg-ludo-gold/40" /> أو <span className="h-px flex-1 bg-ludo-gold/40" />
          </div>
          <Button variant="neon" size="xl" className="w-full" onClick={onGuest}>
            <Play /> اللعب كضيف
          </Button>
          <p className="text-[11px] leading-relaxed text-ludo-soft">
            الضيف يجرّب اللودو والدومينو والنرد والأصوات وواجهة المباراة، لكن الذهب والألماس والنتائج
            والمكافآت لا تُحفظ إلا بحساب كامل.
          </p>
        </div>

        <p className="flex items-center justify-center gap-1 text-[11px] text-ludo-soft">
          <Crown className="size-3.5 text-ludo-gold" /> جميع النتائج تُتحقق من السيرفر
        </p>
      </div>
    </div>
  );
}
