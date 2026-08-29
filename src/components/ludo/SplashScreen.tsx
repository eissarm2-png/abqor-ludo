import { useEffect } from "react";
import brandMark from "@/assets/brand-mark.png";
import diceRoyal from "@/assets/dice-royal.png";

/** شاشة افتتاحية ملكية داكنة: الشعار 3D + نرد 3D ثم انتقال تلقائي */
export function SplashScreen({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, 2200);
    return () => window.clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="splash-stage" dir="rtl">
      <div className="splash-halo" aria-hidden="true" />
      <div className="relative grid place-items-center gap-4">
        <img src={diceRoyal} alt="" width={512} height={512} className="splash-dice size-28" />
        <img src={brandMark} alt="شعار عبقور لودو" width={512} height={512} className="splash-logo size-28" />
        <div className="text-center">
          <h1 className="font-display text-4xl font-black text-ludo-gold text-shadow-glow">ABQOR LUDO</h1>
          <p className="mt-1 text-lg font-bold text-ludo-pink">عبقور لودو</p>
        </div>
        <div className="splash-track"><span /></div>
      </div>
    </div>
  );
}
