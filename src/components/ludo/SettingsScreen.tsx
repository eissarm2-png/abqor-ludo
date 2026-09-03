import { Gamepad2, Smartphone, Sparkles, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sfx } from "@/lib/audio";
import type { GameplayPrefs } from "@/lib/prefs";
import { cn } from "@/lib/utils";

export function SettingsPanel({
  muted,
  volume,
  animations,
  haptics,
  gameplay,
  onMuted,
  onVolume,
  onAnimations,
  onHaptics,
  onGameplay,
}: {
  muted: boolean;
  volume: number;
  animations: boolean;
  haptics: boolean;
  gameplay: GameplayPrefs;
  onMuted: (v: boolean) => void;
  onVolume: (v: number) => void;
  onAnimations: (v: boolean) => void;
  onHaptics: (v: boolean) => void;
  onGameplay: (v: GameplayPrefs) => void;
}) {
  return (
    <div className="space-y-3">
      <section className="rounded-xl border border-ludo-gold/35 bg-ludo-panel/70 p-4">
        <h3 className="mb-3 flex items-center gap-2 font-bold text-ludo-gold">
          <Gamepad2 className="size-5" /> إعدادات اللعب
        </h3>
        <span className="text-sm text-ludo-soft">عدد اللاعبين الافتراضي</span>
        <div className="mt-2 flex gap-2">
          {([2, 3, 4] as const).map((n) => (
            <Button
              key={n}
              size="sm"
              variant={gameplay.players === n ? "royal" : "neon"}
              aria-pressed={gameplay.players === n}
              aria-label={`${n} لاعبين`}
              onClick={() => onGameplay({ ...gameplay, players: n })}
            >
              {n}
            </Button>
          ))}
        </div>

        <label className="mt-4 block text-sm text-ludo-soft" htmlFor="turn-seconds">
          وقت كل حركة: <b className="text-ludo-gold">{gameplay.turnSeconds} ثانية</b>
        </label>
        <input
          id="turn-seconds"
          type="range"
          min={5}
          max={60}
          step={5}
          value={gameplay.turnSeconds}
          onChange={(e) => onGameplay({ ...gameplay, turnSeconds: Number(e.target.value) })}
          className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-ludo-deep accent-ludo-gold"
        />

        <label className="mt-4 block text-sm text-ludo-soft" htmlFor="move-speed">
          سرعة تنقل القطع: <b className="text-ludo-gold">{gameplay.moveMs} مللي ثانية</b>
        </label>
        <input
          id="move-speed"
          type="range"
          min={80}
          max={900}
          step={20}
          value={gameplay.moveMs}
          onChange={(e) => onGameplay({ ...gameplay, moveMs: Number(e.target.value) })}
          className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-ludo-deep accent-ludo-gold"
        />
        <p className="mt-3 text-xs text-ludo-soft">
          تُطبَّق هذه الإعدادات على المباريات الفردية ومباريات الغرف الجماعية.
        </p>
      </section>

      <section className="rounded-xl border border-ludo-gold/35 bg-ludo-panel/70 p-4">
        <h3 className="mb-3 flex items-center gap-2 font-bold text-ludo-gold">
          <Volume2 className="size-5" /> الصوت
        </h3>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-ludo-soft">كتم كل المؤثرات</span>
          <Button
            variant={muted ? "neon" : "royal"}
            size="sm"
            onClick={() => onMuted(!muted)}
            aria-pressed={muted}
          >
            {muted ? <VolumeX /> : <Volume2 />}
            {muted ? "مكتوم" : "مفعّل"}
          </Button>
        </div>
        <label className="mt-4 block text-sm text-ludo-soft" htmlFor="sfx-volume">
          مستوى المؤثرات: <b className="text-ludo-gold">{Math.round(volume * 100)}%</b>
        </label>
        <input
          id="sfx-volume"
          type="range"
          min={0}
          max={100}
          step={5}
          value={Math.round(volume * 100)}
          disabled={muted}
          onChange={(e) => onVolume(Number(e.target.value) / 100)}
          onPointerUp={() => !muted && sfx.diceLand(4)}
          className={cn(
            "mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-ludo-deep accent-ludo-gold",
            muted && "opacity-40",
          )}
        />
      </section>

      <section className="rounded-xl border border-ludo-gold/35 bg-ludo-panel/70 p-4">
        <h3 className="mb-3 flex items-center gap-2 font-bold text-ludo-gold">
          <Smartphone className="size-5" /> الاهتزاز
        </h3>
        <div className="flex items-center justify-between gap-3">
          <span className="min-w-0 text-sm text-ludo-soft">اهتزاز النرد والحركة والالتقاط</span>
          <Button
            variant={haptics ? "royal" : "neon"}
            size="sm"
            onClick={() => onHaptics(!haptics)}
            aria-pressed={haptics}
          >
            {haptics ? "مفعّل" : "موقوف"}
          </Button>
        </div>
        <p className="mt-3 text-xs text-ludo-soft">
          يعمل على الأجهزة التي تدعم الاهتزاز فقط، وتوقيته مضبوط على كل انتقال في المباراة.
        </p>
      </section>

      <section className="rounded-xl border border-ludo-gold/35 bg-ludo-panel/70 p-4">
        <h3 className="mb-3 flex items-center gap-2 font-bold text-ludo-gold">
          <Sparkles className="size-5" /> الرسوم والاحتفالات
        </h3>
        <div className="flex items-center justify-between gap-3">
          <span className="min-w-0 text-sm text-ludo-soft">
            الاحتفالات المتحركة والقصاصات الورقية
          </span>
          <Button
            variant={animations ? "royal" : "neon"}
            size="sm"
            onClick={() => onAnimations(!animations)}
            aria-pressed={animations}
          >
            {animations ? "مفعّلة" : "موقوفة"}
          </Button>
        </div>
        <p className="mt-3 text-xs text-ludo-soft">
          إيقاف الاحتفالات يخفّف الحركة ويحسّن الأداء على الأجهزة الضعيفة، ولا يعطّل اللعب أو تسجيل
          النتائج.
        </p>
      </section>
    </div>
  );
}
