import { LogOut, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/** تأكيد الخروج من المباراة */
export function ExitConfirm({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[95] grid place-items-center bg-ludo-deep/85 p-4 backdrop-blur-sm" dir="rtl">
      <div className="royal-panel w-full max-w-xs p-6 text-center">
        <LogOut className="mx-auto size-16 text-ludo-gold" />
        <h2 className="title-ribbon mt-3 text-lg">الخروج من المباراة؟</h2>
        <p className="mt-1 text-sm text-ludo-soft">
          إن خرجت الآن ستُحتسب المباراة خسارة ولن تحصل على المكافآت.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="royal" onClick={onCancel}>
            <X className="size-4" /> متابعة اللعب
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            <LogOut className="size-4" /> خروج
          </Button>
        </div>
      </div>
    </div>
  );
}
