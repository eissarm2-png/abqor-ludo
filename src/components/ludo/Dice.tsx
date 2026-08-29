import { cn } from "@/lib/utils";
import { ShieldCheck } from "lucide-react";

const PIPS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
};

/** الدوران المطلوب لإظهار كل وجه من مكعّب النرد */
const FACE_ROTATION: Record<number, string> = {
  1: "rotateX(0deg) rotateY(0deg)",
  2: "rotateX(-90deg) rotateY(0deg)",
  3: "rotateX(0deg) rotateY(-90deg)",
  4: "rotateX(0deg) rotateY(90deg)",
  5: "rotateX(90deg) rotateY(0deg)",
  6: "rotateX(0deg) rotateY(180deg)",
};

const FACE_CLASS: Record<number, string> = {
  1: "dice-face-front",
  2: "dice-face-top",
  3: "dice-face-right",
  4: "dice-face-left",
  5: "dice-face-bottom",
  6: "dice-face-back",
};

type Props = {
  value: number | null;
  rolling: boolean;
  disabled: boolean;
  onRoll: () => void;
  seatToken: string;
  /** الرمية تم توليدها والتحقّق منها في السيرفر */
  verified?: boolean;
};

function Face({ face }: { face: number }) {
  return (
    <span className={cn("dice-face", FACE_CLASS[face])}>
      <span className="dice-grid">
        {Array.from({ length: 9 }, (_, i) => {
          const col = i % 3;
          const row = Math.floor(i / 3);
          const on = (PIPS[face] ?? []).some(([r, c]) => r === row && c === col);
          return <span key={i} className={on ? "dice-pip" : "opacity-0"} />;
        })}
      </span>
    </span>
  );
}

export function Dice({ value, rolling, disabled, onRoll, seatToken, verified = false }: Props) {
  const face = value ?? 1;
  return (
    <button
      type="button"
      onClick={onRoll}
      disabled={disabled}
      aria-label="ارمِ النرد"
      className={cn(
        "dice-stage press-3d group relative grid h-[6.2rem] w-[6.2rem] shrink-0 place-items-center",
        disabled && "opacity-80",
      )}
      style={{ ["--seat" as string]: `var(--ludo-${seatToken})` }}
    >
      <span className="dice-shadow" aria-hidden="true" />
      <span
        className={cn("dice-cube", rolling && "dice-cube-rolling")}
        style={rolling ? undefined : { transform: `${FACE_ROTATION[face]} translateZ(0)` }}
      >
        {[1, 2, 3, 4, 5, 6].map((f) => (
          <Face key={f} face={f} />
        ))}
      </span>
      {verified && !rolling && (
        <span className="dice-verified" title="نتيجة موثّقة من السيرفر">
          <ShieldCheck className="size-3" />
        </span>
      )}
      {!disabled && !rolling && (
        <span className="absolute -bottom-4 whitespace-nowrap text-[10px] font-bold text-ludo-gold">اضغط للرمي</span>
      )}
    </button>
  );
}
