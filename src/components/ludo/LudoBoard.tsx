import { SEATS } from "@/lib/ludo/board";
import { UNIT as U, centerFor, tokenPlacements } from "@/lib/ludo/layout";
import type { GameState, Move } from "@/lib/ludo/engine";
import { cn } from "@/lib/utils";
import { BoardCanvas } from "./BoardCanvas";

type Props = {
  state: GameState;
  moves: Move[];
  onTokenClick: (tokenId: string) => void;
};

function CrownGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-[52%] w-[52%]" aria-hidden="true" fill="currentColor">
      <path d="M3 8.2l4.1 3L12 4.8l4.9 6.4 4.1-3L19 19H5L3 8.2zM5.6 20.4h12.8v1.8H5.6v-1.8z" />
    </svg>
  );
}

export function LudoBoard({ state, moves, onTokenClick }: Props) {
  const movableIds = new Set(moves.map((m) => m.tokenId));
  const targets = new Map(moves.map((m) => [m.tokenId, m.to]));

  const placements = new Map(tokenPlacements(state).map((p) => [p.id, p]));

  return (
    <div className="relative aspect-square w-full select-none">
      <BoardCanvas />

      {/* أهداف الحركة */}
      {moves.map((m) => {
        const token = state.tokens.find((t) => t.id === m.tokenId);
        if (!token) return null;
        const c = centerFor(token.seat, m.to, Number(token.id.split("-")[1]));
        return (
          <div
            key={`hint-${m.tokenId}`}
            className="pointer-events-none absolute animate-pulse rounded-full border-2 border-dashed border-ludo-gold"
            style={{
              left: `${c.x * U}%`,
              top: `${c.y * U}%`,
              width: `${U}%`,
              height: `${U}%`,
              transform: "translate(-50%, -50%)",
            }}
          />
        );
      })}

      {/* القطع */}
      {state.tokens.map((t) => {
        const seat = SEATS[t.seat];
        const placement = placements.get(t.id);
        if (!placement) return null;
        const { center, size, finished } = placement;
        const movable = movableIds.has(t.id);

        return (
          <button
            key={t.id}
            type="button"
            disabled={!movable}
            onClick={() => onTokenClick(t.id)}
            aria-label={`قطعة ${seat.label}`}
            className={cn(
              "absolute grid place-items-center transition-[left,top] duration-300 ease-out",
              movable ? "z-20 cursor-pointer" : "z-10 cursor-default",
            )}
            style={{
              left: `${center.x * U}%`,
              top: `${center.y * U}%`,
              width: `${size}%`,
              height: `${size}%`,
              transform: "translate(-50%, -50%)",
            }}
          >

            <span
              className={cn(
                "coin-token",
                movable && "animate-token-ready",
                finished && "scale-[.68]",
                state.lastMovedTokenId === t.id && "animate-token-pop",
              )}
              style={{ ["--seat" as string]: `var(--ludo-${seat.token})` }}
            >
              <CrownGlyph />
            </span>
            {targets.has(t.id) && (
              <span className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-ludo-gold/60" />
            )}
          </button>
        );
      })}
    </div>
  );
}

