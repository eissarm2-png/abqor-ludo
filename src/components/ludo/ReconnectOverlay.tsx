import { useCallback, useEffect, useRef, useState } from "react";
import { WifiOff, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

/**
 * إعادة اتصال ذكية: يكتشف انقطاع الشبكة، يعيد المحاولة تلقائيًا،
 * وعند عودة الإنترنت يعيد مزامنة حالة الغرفة/الجلسة تلقائيًا.
 */
export function ReconnectOverlay({ onResync }: { onResync?: () => void | Promise<void> }) {
  const [offline, setOffline] = useState(false);
  const [seconds, setSeconds] = useState(5);
  const [attempts, setAttempts] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const resyncRef = useRef(onResync);
  resyncRef.current = onResync;

  /** فحص حقيقي للاتصال بالخادم (لا يكفي navigator.onLine) */
  const probe = useCallback(async () => {
    if (typeof navigator !== "undefined" && navigator.onLine === false) return false;
    try {
      const { error } = await supabase.rpc("my_active_room" as never);
      return !error;
    } catch {
      return false;
    }
  }, []);

  const recover = useCallback(async () => {
    setSyncing(true);
    try {
      await supabase.auth.getSession();
      supabase.realtime.connect();
      await resyncRef.current?.();
      setOffline(false);
      setAttempts(0);
      toast.success("عاد الاتصال — تمت مزامنة حالة الغرفة");
    } finally {
      setSyncing(false);
    }
  }, []);

  const attempt = useCallback(async () => {
    setAttempts((a) => a + 1);
    const ok = await probe();
    if (ok) await recover();
    else setSeconds(5);
  }, [probe, recover]);

  useEffect(() => {
    const down = () => {
      setOffline(true);
      setSeconds(5);
      setDismissed(false);
    };
    const up = () => void attempt();
    if (typeof navigator !== "undefined" && navigator.onLine === false) down();
    window.addEventListener("offline", down);
    window.addEventListener("online", up);
    return () => {
      window.removeEventListener("offline", down);
      window.removeEventListener("online", up);
    };
  }, [attempt]);

  useEffect(() => {
    if (!offline || dismissed) return;
    const id = window.setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          void attempt();
          return 5;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [offline, dismissed, attempt]);

  if (!offline || dismissed) return null;

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-ludo-deep/90 p-4 backdrop-blur-sm" dir="rtl">
      <div className="royal-panel w-full max-w-xs p-6 text-center">
        <WifiOff className="mx-auto size-20 text-ludo-soft" />
        <h2 className="title-ribbon mt-3 text-lg">فقد الاتصال بالإنترنت</h2>
        <p className="mt-1 text-sm text-ludo-soft">
          {syncing ? "جارٍ إعادة مزامنة حالة الغرفة…" : "إعادة المحاولة تلقائيًا…"}
        </p>
        <p className="my-3 font-mono text-2xl font-bold text-ludo-gold">
          00:{String(seconds).padStart(2, "0")}
        </p>
        <p className="text-[11px] text-ludo-soft/70">عدد المحاولات: {attempts}</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="destructive" onClick={() => setDismissed(true)}>
            متابعة دون اتصال
          </Button>
          <Button variant="royal" disabled={syncing} onClick={() => void attempt()}>
            <RefreshCw className="size-4" /> إعادة المحاولة
          </Button>
        </div>
      </div>
    </div>
  );
}
