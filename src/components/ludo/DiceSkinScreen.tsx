import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { DICE_SKINS, loadDiceSkin, saveDiceSkin } from "@/lib/prefs";
import { cn } from "@/lib/utils";

/** معاينة وجه نرد بالألوان المختارة */
function DiceFace({ face, pip }: { face: string; pip: string }) {
  const dots = [
    [30, 30],
    [70, 30],
    [30, 70],
    [70, 70],
    [50, 50],
  ];
  return (
    <svg viewBox="0 0 100 100" className="size-14 drop-shadow-[0_4px_8px_rgb(0_0_0/.5)]">
      <rect x="4" y="4" width="92" height="92" rx="18" fill={face} stroke="rgb(0 0 0 / .35)" strokeWidth="3" />
      {dots.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="8" fill={pip} />
      ))}
    </svg>
  );
}

export function DiceSkinScreen() {
  const { profile } = useAuth();
  const wins = profile?.wins ?? 0;
  const [selected, setSelected] = useState("classic");

  useEffect(() => setSelected(loadDiceSkin()), []);

  const choose = (code: string, locked: boolean, needWins: number) => {
    if (locked) {
      toast.error(`يُفتح بعد ${needWins} فوز`);
      return;
    }
    setSelected(code);
    saveDiceSkin(code);
    toast.success("تم تغيير شكل النرد");
  };

  return (
    <div className="space-y-3">
      <p className="rounded-xl border border-ludo-gold/25 bg-ludo-panel/60 p-3 text-center text-xs text-ludo-soft/80">
        انتصاراتك: <span className="font-bold text-ludo-gold">{wins}</span> — بعض الأشكال تُفتح بالفوز
      </p>
      <div className="grid grid-cols-3 gap-2">
        {DICE_SKINS.map((skin) => {
          const locked = wins < skin.needWins;
          return (
            <button
              key={skin.code}
              type="button"
              onClick={() => choose(skin.code, locked, skin.needWins)}
              className={cn(
                "relative grid place-items-center gap-1 rounded-xl border p-3 transition",
                selected === skin.code
                  ? "border-ludo-gold bg-ludo-gold/15"
                  : "border-ludo-gold/25 bg-ludo-panel/60",
                locked && "opacity-60",
              )}
            >
              <DiceFace face={skin.face} pip={skin.pip} />
              <span className="text-[11px] font-bold text-ludo-soft">{skin.label}</span>
              {locked && (
                <span className="absolute inset-x-1 bottom-1 flex items-center justify-center gap-1 rounded-md bg-ludo-deep/80 py-0.5 text-[10px] text-ludo-soft/80">
                  <Lock className="size-3" /> {skin.needWins} فوز
                </span>
              )}
            </button>
          );
        })}
      </div>
      <Button variant="neon" className="w-full" onClick={() => toast.success("تم الحفظ")}>
        تحديد
      </Button>
    </div>
  );
}
