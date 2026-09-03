import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

/** نظام إعادة الاتصال: يظهر عند فقد الإنترنت مع عدّاد ومحاولة إعادة الاتصال */
export function ReconnectOverlay() {
  const [offline, setOffline] = useState(false);
  const [seconds, setSeconds] = useState(15);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const sync = () => {
      const down = typeof navigator !== "undefined" && navigator.onLine === false;
      setOffline(down);
      if (down) {
        setSeconds(15);
        setDismissed(false);
      }
    };
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  useEffect(() => {
    if (!offline || dismissed) return;
    const id = window.setInterval(() => {
      setSeconds((s) => (s > 0 ? s - 1 : 15));
    }, 1000);
    return () => window.clearInterval(id);
  }, [offline, dismissed]);

  if (!offline || dismissed) return null;

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-ludo-deep/90 p-4 backdrop-blur-sm" dir="rtl">
      <div className="royal-panel w-full max-w-xs p-6 text-center">
        <WifiOff className="mx-auto size-20 text-ludo-soft" />
        <h2 className="title-ribbon mt-3 text-lg">فقد الاتصال بالإنترنت</h2>
        <p className="mt-1 text-sm text-ludo-soft">جاري محاولة إعادة الاتصال…</p>
        <p className="my-3 font-mono text-2xl font-bold text-ludo-gold">
          00:{String(seconds).padStart(2, "0")}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="destructive" onClick={() => setDismissed(true)}>
            إلغاء
          </Button>
          <Button
            variant="royal"
            onClick={() => {
              if (navigator.onLine) {
                setOffline(false);
                return;
              }
              setSeconds(15);
            }}
          >
            إعادة المحاولة
          </Button>
        </div>
      </div>
    </div>
  );
}
