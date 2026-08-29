/** محرّك دومينو كلاسيكي (Block Domino) بحجارة 0-6 وأدوار متعاقبة وروبوتات */

export type Tile = { id: string; a: number; b: number };
export type Side = "left" | "right";

export type DominoPlayer = {
  seat: number;
  name: string;
  isBot: boolean;
  hand: Tile[];
};

export type PlacedTile = { tile: Tile; left: number; right: number };

export type DominoState = {
  players: DominoPlayer[];
  turn: number;
  board: PlacedTile[];
  stock: Tile[];
  winner: number | null;
  phase: "play" | "over";
  message: string;
  passes: number;
  lastPlacedId: string | null;
};

export type DominoMove = { tileId: string; side: Side; flip: boolean };

const SEAT_NAMES = ["أنت", "خصم ١", "خصم ٢", "خصم ٣"];

function fullSet(): Tile[] {
  const tiles: Tile[] = [];
  for (let a = 0; a <= 6; a += 1) {
    for (let b = a; b <= 6; b += 1) tiles.push({ id: `${a}-${b}`, a, b });
  }
  return tiles;
}

function shuffle<T>(items: T[]): T[] {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = list[i]!;
    const b = list[j]!;
    list[i] = b;
    list[j] = a;
  }
  return list;
}

export function pips(tile: Tile): number {
  return tile.a + tile.b;
}

export function handPips(player: DominoPlayer): number {
  return player.hand.reduce((sum, tile) => sum + pips(tile), 0);
}

export function boardEnds(state: DominoState): [number, number] | null {
  if (!state.board.length) return null;
  const first = state.board[0]!;
  const last = state.board[state.board.length - 1]!;
  return [first.left, last.right];
}

export function createDomino(playerCount: 2 | 3 | 4, humans = 1): DominoState {
  const deck = shuffle(fullSet());
  const handSize = playerCount === 2 ? 7 : 5;
  const players: DominoPlayer[] = Array.from({ length: playerCount }, (_, seat) => ({
    seat,
    name: SEAT_NAMES[seat] ?? `لاعب ${seat + 1}`,
    isBot: seat >= Math.max(1, Math.min(humans, playerCount)),
    hand: deck.splice(0, handSize),
  }));

  // يبدأ صاحب أعلى دوبل، وإن لم يوجد فصاحب أعلى مجموع
  let starter = 0;
  let best = -1;
  players.forEach((p) => {
    p.hand.forEach((tile) => {
      const score = (tile.a === tile.b ? 100 : 0) + pips(tile);
      if (score > best) {
        best = score;
        starter = p.seat;
      }
    });
  });

  const first = players[starter]!;
  return {
    players,
    turn: starter,
    board: [],
    stock: deck,
    winner: null,
    phase: "play",
    message: `${first.name} يبدأ الجولة`,
    passes: 0,
    lastPlacedId: null,
  };
}

export function currentDominoPlayer(state: DominoState): DominoPlayer {
  return state.players[state.turn] ?? state.players[0]!;
}

export function legalPlays(state: DominoState, seat = state.turn): DominoMove[] {
  const player = state.players.find((p) => p.seat === seat);
  if (!player || state.phase === "over") return [];
  const ends = boardEnds(state);
  if (!ends) return player.hand.map((tile) => ({ tileId: tile.id, side: "right" as Side, flip: false }));

  const [leftEnd, rightEnd] = ends;
  const moves: DominoMove[] = [];
  player.hand.forEach((tile) => {
    // اليسار: يجب أن تنتهي الحجرة بالرقم الموجود في الطرف الأيسر
    if (tile.b === leftEnd) moves.push({ tileId: tile.id, side: "left", flip: false });
    else if (tile.a === leftEnd) moves.push({ tileId: tile.id, side: "left", flip: true });
    if (tile.a === rightEnd) moves.push({ tileId: tile.id, side: "right", flip: false });
    else if (tile.b === rightEnd) moves.push({ tileId: tile.id, side: "right", flip: true });
  });
  return moves;
}

function nextSeat(state: DominoState): number {
  return (state.turn + 1) % state.players.length;
}

function finish(state: DominoState, winner: number, message: string): DominoState {
  return { ...state, winner, phase: "over", message };
}

function closeBlocked(state: DominoState): DominoState {
  let winner = state.players[0]!.seat;
  let bestPips = Number.POSITIVE_INFINITY;
  state.players.forEach((p) => {
    const total = handPips(p);
    if (total < bestPips) {
      bestPips = total;
      winner = p.seat;
    }
  });
  const name = state.players.find((p) => p.seat === winner)?.name ?? "لاعب";
  return finish(state, winner, `اللعبة مغلقة — ${name} يفوز بأقل النقاط (${bestPips})`);
}

export function playTile(state: DominoState, move: DominoMove): DominoState {
  const player = currentDominoPlayer(state);
  const tile = player.hand.find((t) => t.id === move.tileId);
  if (!tile || state.phase === "over") return state;

  const oriented: PlacedTile =
    move.side === "left"
      ? move.flip
        ? { tile, left: tile.b, right: tile.a }
        : { tile, left: tile.a, right: tile.b }
      : move.flip
        ? { tile, left: tile.b, right: tile.a }
        : { tile, left: tile.a, right: tile.b };

  const board =
    move.side === "left" ? [oriented, ...state.board] : [...state.board, oriented];
  const hand = player.hand.filter((t) => t.id !== tile.id);
  const players = state.players.map((p) => (p.seat === player.seat ? { ...p, hand } : p));

  const next: DominoState = {
    ...state,
    players,
    board,
    passes: 0,
    lastPlacedId: tile.id,
  };

  if (!hand.length) {
    return finish(next, player.seat, `${player.name} أنهى كل حجارته وفاز!`);
  }

  const advanced: DominoState = { ...next, turn: nextSeat(next) };
  const upcoming = currentDominoPlayer(advanced);
  return { ...advanced, message: `دور ${upcoming.name}` };
}

/** سحب حجرة من المخزون عندما لا توجد حركة قانونية */
export function drawTile(state: DominoState): DominoState {
  if (state.phase === "over" || !state.stock.length) return state;
  const player = currentDominoPlayer(state);
  const stock = [...state.stock];
  const tile = stock.shift()!;
  const players = state.players.map((p) =>
    p.seat === player.seat ? { ...p, hand: [...p.hand, tile] } : p,
  );
  return { ...state, players, stock, message: `${player.name} سحب حجرة` };
}

/** تمرير الدور، وإذا مرّ الجميع تُحسم اللعبة بأقل النقاط */
export function passTurn(state: DominoState): DominoState {
  if (state.phase === "over") return state;
  const player = currentDominoPlayer(state);
  const passes = state.passes + 1;
  if (passes >= state.players.length) {
    return closeBlocked({ ...state, passes });
  }
  const advanced: DominoState = { ...state, passes, turn: nextSeat(state) };
  const upcoming = currentDominoPlayer(advanced);
  return { ...advanced, message: `${player.name} مرّر — دور ${upcoming.name}` };
}

export function pickDominoMove(moves: DominoMove[], state: DominoState): DominoMove {
  const player = currentDominoPlayer(state);
  const score = (move: DominoMove) => {
    const tile = player.hand.find((t) => t.id === move.tileId);
    if (!tile) return -1;
    return pips(tile) + (tile.a === tile.b ? 4 : 0);
  };
  return [...moves].sort((a, b) => score(b) - score(a))[0]!;
}

export function tilesLeft(state: DominoState, seat: number): number {
  return state.players.find((p) => p.seat === seat)?.hand.length ?? 0;
}
