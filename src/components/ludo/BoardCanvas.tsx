import { RING, SEATS, SEAT_ORDER, type SeatId } from "@/lib/ludo/board";

/**
 * لوحة اللودو مرسومة كـ SVG على شبكة 15×15 بالضبط،
 * فتتطابق مواضع الأحجار مع الخانات على كل المقاسات ولا تعتمد على أي صورة خارجية.
 */

const SEAT_COLOR: Record<SeatId, string> = {
  0: "var(--ludo-ruby)",
  1: "var(--ludo-palm)",
  2: "var(--ludo-amber)",
  3: "var(--ludo-lagoon)",
};

/** خانة المسار التي يبدأ منها كل لاعب (تُلوَّن بلونه) */
const startCells = new Map<string, SeatId>(
  SEAT_ORDER.map((id) => {
    const c = RING[SEATS[id].start]!;
    return [`${c.x}:${c.y}`, id];
  }),
);

/** الخانات الآمنة (نجمة) */
const safeCells = new Set<string>(
  SEAT_ORDER.map((id) => {
    const c = RING[(SEATS[id].start + 8) % 52]!;
    return `${c.x}:${c.y}`;
  }),
);

function Star({ x, y }: { x: number; y: number }) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i += 1) {
    const r = i % 2 === 0 ? 0.36 : 0.16;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${x + 0.5 + r * Math.cos(a)},${y + 0.5 + r * Math.sin(a)}`);
  }
  return <polygon points={pts.join(" ")} fill="rgba(0,0,0,.28)" />;
}

export function BoardCanvas() {
  return (
    <svg
      viewBox="0 0 15 15"
      className="absolute inset-0 h-full w-full rounded-[0.35rem]"
      aria-hidden="true"
      shapeRendering="geometricPrecision"
    >
      <defs>
        <linearGradient id="board-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fffdf6" />
          <stop offset="100%" stopColor="#f1e6cd" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width="15" height="15" fill="url(#board-bg)" rx="0.35" />

      {/* مربعات الحوش الأربعة */}
      {SEAT_ORDER.map((id) => {
        const b = SEATS[id].yardBox;
        return (
          <g key={`yard-${id}`}>
            <rect x={b.x} y={b.y} width="6" height="6" fill={SEAT_COLOR[id]} rx="0.5" />
            <rect
              x={b.x + 0.9}
              y={b.y + 0.9}
              width="4.2"
              height="4.2"
              fill="#fffdf6"
              rx="0.45"
            />
            {SEATS[id].yard.map((s, i) => (
              <circle
                key={i}
                cx={s.x}
                cy={s.y}
                r="0.62"
                fill="none"
                stroke={SEAT_COLOR[id]}
                strokeWidth="0.12"
              />
            ))}
          </g>
        );
      })}

      {/* خانات المسار الدائري */}
      {RING.map((c) => {
        const key = `${c.x}:${c.y}`;
        const owner = startCells.get(key);
        return (
          <g key={`ring-${key}`}>
            <rect
              x={c.x + 0.03}
              y={c.y + 0.03}
              width="0.94"
              height="0.94"
              fill={owner !== undefined ? SEAT_COLOR[owner] : "#fffdf6"}
              stroke="rgba(0,0,0,.32)"
              strokeWidth="0.05"
              rx="0.1"
            />
            {safeCells.has(key) && <Star x={c.x} y={c.y} />}
          </g>
        );
      })}

      {/* الممرات المنزلية */}
      {SEAT_ORDER.map((id) =>
        SEATS[id].home.slice(0, 5).map((c, i) => (
          <rect
            key={`home-${id}-${i}`}
            x={c.x + 0.03}
            y={c.y + 0.03}
            width="0.94"
            height="0.94"
            fill={SEAT_COLOR[id]}
            stroke="rgba(0,0,0,.28)"
            strokeWidth="0.05"
            rx="0.1"
          />
        )),
      )}

      {/* المركز: أربع مثلثات بألوان اللاعبين */}
      <g stroke="rgba(0,0,0,.3)" strokeWidth="0.05">
        <polygon points="6,9 9,9 7.5,7.5" fill={SEAT_COLOR[0]} />
        <polygon points="6,6 6,9 7.5,7.5" fill={SEAT_COLOR[1]} />
        <polygon points="6,6 9,6 7.5,7.5" fill={SEAT_COLOR[2]} />
        <polygon points="9,6 9,9 7.5,7.5" fill={SEAT_COLOR[3]} />
      </g>

      {/* إطار خارجي */}
      <rect
        x="0.06"
        y="0.06"
        width="14.88"
        height="14.88"
        fill="none"
        stroke="rgba(0,0,0,.35)"
        strokeWidth="0.12"
        rx="0.35"
      />
    </svg>
  );
}
