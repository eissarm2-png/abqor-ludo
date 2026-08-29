import {
  FINISH_OFFSET,
  LAST_RING_OFFSET,
  SAFE_INDICES,
  SEATS,
  ringIndexForOffset,
  type SeatId,
} from "./board";

export type Player = {
  seat: SeatId;
  name: string;
  isBot: boolean;
};

export type Token = {
  id: string;
  seat: SeatId;
  /** -1 = في الحوش، 0..50 = المسار، 51..55 = الممر المنزلي، 56 = وصل */
  offset: number;
};

export type Phase = "roll" | "move" | "over";

export type GameState = {
  players: Player[];
  tokens: Token[];
  turn: number; // فهرس داخل players
  dice: number | null;
  sixStreak: number;
  phase: Phase;
  winner: SeatId | null;
  lastMovedTokenId: string | null;
  capturedTokenId: string | null;
  message: string;
};

export type Move = {
  tokenId: string;
  from: number;
  to: number;
  captures: string[];
  finishes: boolean;
  entersBoard: boolean;
};

const SEAT_LAYOUTS: Record<number, SeatId[]> = {
  2: [0, 2],
  3: [0, 1, 2],
  4: [0, 1, 2, 3],
};

export function createGame(
  playerCount: 2 | 3 | 4,
  humanCount: number,
  names?: string[],
): GameState {
  const seats = SEAT_LAYOUTS[playerCount] ?? SEAT_LAYOUTS[4] ?? [0, 1, 2, 3];
  const players: Player[] = seats.map((seat, i) => ({
    seat,
    name: names?.[i] ?? (i < humanCount ? `لاعب ${i + 1}` : `روبوت ${i - humanCount + 1}`),
    isBot: i >= humanCount,
  }));

  const tokens: Token[] = players.flatMap((p) =>
    Array.from({ length: 4 }, (_, i) => ({ id: `${p.seat}-${i}`, seat: p.seat, offset: -1 })),
  );
  const firstPlayer = players[0] ?? { seat: 0 as SeatId, name: "لاعب 1", isBot: false };

  return {
    players,
    tokens,
    turn: 0,
    dice: null,
    sixStreak: 0,
    phase: "roll",
    winner: null,
    lastMovedTokenId: null,
    capturedTokenId: null,
    message: `دور ${firstPlayer.name} — ارمِ النرد`,
  };
}

export function currentPlayer(state: GameState): Player {
  return state.players[state.turn] ?? state.players[0] ?? { seat: 0, name: "لاعب 1", isBot: false };
}

export function rollDie(): number {
  return 1 + Math.floor(Math.random() * 6);
}

export function legalMoves(state: GameState, die: number): Move[] {
  const player = currentPlayer(state);
  const moves: Move[] = [];

  for (const token of state.tokens) {
    if (token.seat !== player.seat) continue;

    let to: number;
    if (token.offset < 0) {
      if (die !== 6) continue;
      to = 0;
    } else {
      to = token.offset + die;
      if (to > FINISH_OFFSET) continue;
    }

    const ringIdx = ringIndexForOffset(token.seat, to);
    const captures: string[] = [];
    if (ringIdx !== null && !SAFE_INDICES.has(ringIdx)) {
      for (const other of state.tokens) {
        if (other.seat === player.seat) continue;
        if (other.offset < 0 || other.offset > LAST_RING_OFFSET) continue;
        if (ringIndexForOffset(other.seat, other.offset) === ringIdx) captures.push(other.id);
      }
    }

    moves.push({
      tokenId: token.id,
      from: token.offset,
      to,
      captures,
      finishes: to === FINISH_OFFSET,
      entersBoard: token.offset < 0,
    });
  }

  return moves;
}

export function applyRoll(state: GameState, die: number): GameState {
  const player = currentPlayer(state);
  const streak = die === 6 ? state.sixStreak + 1 : 0;

  if (streak === 3) {
    return {
      ...nextTurn({ ...state, sixStreak: 0 }),
      dice: die,
      message: `${player.name}: ثلاث ستات متتالية، ينتقل الدور!`,
    };
  }

  const moves = legalMoves({ ...state, sixStreak: streak }, die);
  if (moves.length === 0) {
    if (die === 6) {
      return {
        ...state,
        dice: die,
        sixStreak: streak,
        phase: "roll",
        message: `${player.name}: لا حركة ممكنة، ارمِ مرة أخرى`,
      };
    }
    return {
      ...nextTurn({ ...state, sixStreak: 0 }),
      dice: die,
      message: `${player.name}: لا حركة ممكنة بالرقم ${die}`,
    };
  }

  return {
    ...state,
    dice: die,
    sixStreak: streak,
    phase: "move",
    capturedTokenId: null,
    message:
      moves.length === 1
        ? `${player.name}: حرّك قطعتك`
        : `${player.name}: اختر قطعة للتحرك ${die} خانات`,
  };
}

export function applyMove(state: GameState, move: Move): GameState {
  const player = currentPlayer(state);
  const die = state.dice ?? 0;

  const tokens = state.tokens.map((t) => {
    if (t.id === move.tokenId) return { ...t, offset: move.to };
    if (move.captures.includes(t.id)) return { ...t, offset: -1 };
    return t;
  });

  const finishedAll = tokens
    .filter((t) => t.seat === player.seat)
    .every((t) => t.offset === FINISH_OFFSET);

  let message = `${player.name} تحرّك ${die} خانات`;
  if (move.entersBoard) message = `${player.name} أدخل قطعة جديدة للميدان!`;
  if (move.captures.length) message = `${player.name} أطاح بقطعة خصم! 🎯`;
  if (move.finishes) message = `${player.name} أوصل قطعة إلى المنزل! 🏠`;

  const base: GameState = {
    ...state,
    tokens,
    lastMovedTokenId: move.tokenId,
    capturedTokenId: move.captures[0] ?? null,
  };

  if (finishedAll) {
    return {
      ...base,
      phase: "over",
      winner: player.seat,
      dice: die,
      message: `${player.name} فاز باللعبة! 🎉`,
    };
  }

  const extraTurn = die === 6 || move.captures.length > 0 || move.finishes;
  if (extraTurn) {
    return {
      ...base,
      phase: "roll",
      sixStreak: die === 6 ? state.sixStreak : 0,
      message: `${message} — رمية إضافية!`,
    };
  }

  return { ...nextTurn({ ...base, sixStreak: 0 }), message };
}

function nextTurn(state: GameState): GameState {
  const turn = (state.turn + 1) % state.players.length;
  const player = state.players[turn] ?? state.players[0] ?? { seat: 0 as SeatId, name: "لاعب 1", isBot: false };
  return {
    ...state,
    turn,
    phase: "roll",
    dice: null,
    message: `دور ${player.name} — ارمِ النرد`,
  };
}

/** اختيار حركة الروبوت بمنطق بسيط لكن ذكي */
export function pickBotMove(moves: Move[]): Move {
  const score = (m: Move) =>
    (m.captures.length ? 1000 : 0) +
    (m.finishes ? 800 : 0) +
    (m.entersBoard ? 400 : 0) +
    m.to;
  const selected = [...moves].sort((a, b) => score(b) - score(a))[0];
  return selected ?? { tokenId: "", from: -1, to: -1, captures: [], finishes: false, entersBoard: false };
}

export function tokensDone(state: GameState, seat: SeatId): number {
  return state.tokens.filter((t) => t.seat === seat && t.offset === FINISH_OFFSET).length;
}

export function seatLabel(seat: SeatId): string {
  return SEATS[seat].label;
}

/** إنهاء الدور تلقائيًا عند انتهاء مهلة الـ15 ثانية */
export function forfeitTurn(state: GameState): GameState {
  if (state.phase === "over") return state;
  const player = currentPlayer(state);
  return {
    ...nextTurn({ ...state, sixStreak: 0, dice: null }),
    message: `انتهى وقت ${player.name} — انتقل الدور`,
  };
}

