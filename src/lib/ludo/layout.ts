import { SEATS, cellForOffset, FINISH_OFFSET } from "./board";
import type { GameState } from "./engine";

/** وحدة الخانة كنسبة مئوية من عرض اللوحة (شبكة 15×15) */
export const UNIT = 100 / 15;

export type TokenPlacement = {
  id: string;
  /** مركز الخانة بإحداثيات الشبكة */
  cell: { x: number; y: number };
  /** مركز القطعة بعد إزاحة التكدّس (إحداثيات الشبكة) */
  center: { x: number; y: number };
  /** حجم القطعة كنسبة من عرض اللوحة */
  size: number;
  stack: number;
  total: number;
  inYard: boolean;
  finished: boolean;
};

/** مركز الخانة لقطعة بحسب المقعد والإزاحة */
export function centerFor(seat: 0 | 1 | 2 | 3, offset: number, yardIndex: number) {
  if (offset < 0) {
    const slot = SEATS[seat].yard[yardIndex] ?? SEATS[seat].yard[0];
    return slot ?? { x: 7.5, y: 7.5 };
  }
  const cell = cellForOffset(seat, offset);
  return { x: cell.x + 0.5, y: cell.y + 0.5 };
}

function cellKey(seat: number, offset: number) {
  const c = cellForOffset(seat as 0 | 1 | 2 | 3, offset);
  return `${c.x}:${c.y}`;
}

/**
 * توزيع كل القطع على اللوحة بشكل حسابي بحت.
 * القطع المتكدّسة على نفس الخانة تُوزّع بإزاحة متناظرة حول مركز الخانة،
 * فيبقى مركز ثقل المجموعة مطابقًا لمركز الخانة تمامًا على كل المقاسات.
 */
export function tokenPlacements(state: GameState): TokenPlacement[] {
  const counts = new Map<string, number>();
  const keys = new Map<string, string>();
  const stacks = new Map<string, number>();

  for (const t of state.tokens) {
    const key = t.offset < 0 ? `yard-${t.id}` : cellKey(t.seat, t.offset);
    keys.set(t.id, key);
    const n = counts.get(key) ?? 0;
    stacks.set(t.id, n);
    counts.set(key, n + 1);
  }

  return state.tokens.map((t) => {
    const yardIndex = Number(t.id.split("-")[1]);
    const cell = centerFor(t.seat, t.offset, yardIndex);
    const total = counts.get(keys.get(t.id) ?? "") ?? 1;
    const stack = stacks.get(t.id) ?? 0;
    const inYard = t.offset < 0;
    const spread = inYard || total < 2 ? 0 : 0.17;
    const shift = spread === 0 ? 0 : (stack - (total - 1) / 2) * spread;
    return {
      id: t.id,
      cell,
      center: { x: cell.x + shift, y: cell.y - shift * 0.5 },
      size: total > 1 ? UNIT * 0.86 : UNIT * 1.02,
      stack,
      total,
      inYard,
      finished: t.offset === FINISH_OFFSET,
    };
  });
}
