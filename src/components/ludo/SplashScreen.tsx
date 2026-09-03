import { useEffect, useState } from "react";
import heroBg from "@/assets/hero-bg.jpg.asset.json";

/** شاشة التحميل بتصميم اللوحة المرجعية: خلفية اللعبة + شريط تقدم حقيقي */
export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [pct, setPct] = useState(6);

  useEffect(() => {
    const tick = window.setInterval(() => {
      setPct((p) => (p >= 100 ? 100 : p + Math.max(2, Math.round((100 - p) / 8))));
    }, 90);
    const timer = window.setTimeout(onDone, 2200);
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(timer);
    };
  }, [onDone]);

  return (
    <div className="hero-stage" dir="rtl" style={{ backgroundImage: `url(${heroBg.url})` }}>
      <div className="hero-loader">
        <div className="hero-bar">
          <span style={{ width: `${pct}%` }} />
        </div>
        <b>{pct}%</b>
      </div>
    </div>
  );
}
