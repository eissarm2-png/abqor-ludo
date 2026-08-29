import { describe, expect, it } from "vitest";
import { applyMove, applyRoll, createGame, legalMoves, type GameState } from "./engine";
import { UNIT, tokenPlacements } from "./layout";

/**
 * اختبار Visual Regression لتمركز الأحجار:
 * الحساب بالنِّسب المئوية، فأي عرض للوحة يعطي نفس النتيجة —
 * ومركز ثقل كل مجموعة متكدّسة يجب أن يطابق مركز الخانة تمامًا.
 */
const WIDTHS = [320, 390, 430, 768, 1100, 1440];

function enterToken(state: GameState): GameState {
  const next = applyRoll(state, 6);
  const move = legalMoves(next, 6)[0];
  if (!move) throw new Error("no entry move");
  return applyMove(next, move);
}

describe("تمركز أحجار اللودو", () => {
  it("كل حجر داخل حدود اللوحة على جميع المقاسات", () => {
    let game = createGame(4, 4);
    game = enterToken(game);
    for (const width of WIDTHS) {
      for (const p of tokenPlacements(game)) {
        const px = (p.center.x / 15) * width;
        const py = (p.center.y / 15) * width;
        const half = (p.size / 100) * width * 0.5;
        expect(px - half).toBeGreaterThanOrEqual(-0.01);
        expect(px + half).toBeLessThanOrEqual(width + 0.01);
        expect(py - half).toBeGreaterThanOrEqual(-0.01);
        expect(py + half).toBeLessThanOrEqual(width + 0.01);
      }
    }
  });

  it("مركز ثقل المجموعة المتكدّسة يطابق مركز الخانة", () => {
    const base = createGame(4, 4);
    // حجران لنفس المقعد على نفس الخانة + ثلاثة لمقعد آخر
    const game: GameState = {
      ...base,
      tokens: base.tokens.map((t) =>
        t.id === "0-0" || t.id === "0-1"
          ? { ...t, offset: 4 }
          : t.id === "1-0" || t.id === "1-1" || t.id === "1-2"
            ? { ...t, offset: 9 }
            : t,
      ),
    };

    const grouped = tokenPlacements(game).filter((p) => p.total > 1);
    expect(grouped.length).toBeGreaterThan(0);

    const byCell = new Map<string, typeof grouped>();
    for (const p of grouped) {
      const key = `${p.cell.x}:${p.cell.y}`;
      byCell.set(key, [...(byCell.get(key) ?? []), p]);
    }
    for (const [, group] of byCell) {
      const cx = group.reduce((sum, p) => sum + p.center.x, 0) / group.length;
      const cy = group.reduce((sum, p) => sum + p.center.y, 0) / group.length;
      expect(cx).toBeCloseTo(group[0]!.cell.x, 6);
      expect(cy).toBeCloseTo(group[0]!.cell.y, 6);
    }
  });

  it("الحجر المنفرد متمركز تمامًا في خانته والحجم لا يتجاوز الخانة كثيرًا", () => {
    let game = createGame(2, 2);
    game = enterToken(game);
    for (const p of tokenPlacements(game)) {
      if (p.total !== 1) continue;
      expect(p.center.x).toBeCloseTo(p.cell.x, 10);
      expect(p.center.y).toBeCloseTo(p.cell.y, 10);
      expect(p.size).toBeLessThanOrEqual(UNIT * 1.05);
    }
  });

  it("أحجار الحوش لا تتكدّس: لكل حجر خانته الخاصة", () => {
    const game = createGame(4, 4);
    const placements = tokenPlacements(game);
    expect(placements.every((p) => p.inYard && p.total === 1)).toBe(true);
    const keys = new Set(placements.map((p) => `${p.center.x}:${p.center.y}`));
    expect(keys.size).toBe(placements.length);
  });
});
