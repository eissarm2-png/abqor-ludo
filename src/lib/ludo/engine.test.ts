import { describe, expect, it } from "vitest";
import { FINISH_OFFSET, SEATS } from "./board";
import { applyMove, applyRoll, createGame, currentPlayer, legalMoves, type GameState } from "./engine";

const game = (): GameState => ({ ...createGame(4, 4) });

describe("قواعد اللودو", () => {
  it("الدخول للميدان يتطلب 6 فقط", () => {
    const s = game();
    expect(legalMoves(s, 3)).toHaveLength(0);
    const six = legalMoves(s, 6);
    expect(six).toHaveLength(4);
    expect(six.every((m) => m.entersBoard && m.to === 0)).toBe(true);
  });

  it("رمي 6 يمنح رمية إضافية بعد الحركة", () => {
    let s = applyRoll(game(), 6);
    expect(s.phase).toBe("move");
    const move = legalMoves(s, 6)[0]!;
    s = applyMove(s, move);
    expect(s.phase).toBe("roll");
    expect(s.turn).toBe(0);
  });

  it("عدم وجود حركة ينقل الدور", () => {
    const s = applyRoll(game(), 4);
    expect(s.turn).toBe(1);
    expect(s.phase).toBe("roll");
  });

  it("التقاط قطعة الخصم يعيدها للحوش ويمنح رمية إضافية", () => {
    const base = game();
    // قطعة الخصم (المقعد 1) على خانة غير آمنة يصلها المقعد 0
    const victimOffset = 3; // فهرس الحلقة 16
    const attackerOffset = 16 - SEATS[0].start - 2; // يحتاج 2 للوصول
    const s: GameState = {
      ...base,
      tokens: base.tokens.map((t) =>
        t.id === "1-0" ? { ...t, offset: victimOffset } : t.id === "0-0" ? { ...t, offset: attackerOffset } : t,
      ),
      dice: 2,
      phase: "move",
    };
    const move = legalMoves(s, 2).find((m) => m.tokenId === "0-0")!;
    expect(move.captures).toContain("1-0");
    const after = applyMove(s, move);
    expect(after.tokens.find((t) => t.id === "1-0")!.offset).toBe(-1);
    expect(after.turn).toBe(0);
    expect(after.phase).toBe("roll");
  });

  it("لا يمكن تجاوز خانة النهاية", () => {
    const base = game();
    const s: GameState = { ...base, tokens: base.tokens.map((t) => (t.id === "0-0" ? { ...t, offset: FINISH_OFFSET - 2 } : t)) };
    expect(legalMoves(s, 3).some((m) => m.tokenId === "0-0")).toBe(false);
    expect(legalMoves(s, 2).find((m) => m.tokenId === "0-0")!.finishes).toBe(true);
  });

  it("وصول جميع القطع للمنزل يعلن الفوز", () => {
    const base = game();
    const s: GameState = {
      ...base,
      dice: 1,
      phase: "move",
      tokens: base.tokens.map((t) =>
        t.seat === 0 ? { ...t, offset: t.id === "0-3" ? FINISH_OFFSET - 1 : FINISH_OFFSET } : t,
      ),
    };
    const move = legalMoves(s, 1).find((m) => m.tokenId === "0-3")!;
    const after = applyMove(s, move);
    expect(after.phase).toBe("over");
    expect(after.winner).toBe(0);
  });

  it("تبديل الأدوار يمر على كل اللاعبين بالترتيب", () => {
    let s = game();
    const seats: number[] = [];
    for (let i = 0; i < 4; i++) {
      seats.push(currentPlayer(s).seat);
      s = applyRoll(s, 1); // لا حركة ممكنة => ينتقل الدور
    }
    expect(seats).toEqual([0, 1, 2, 3]);
  });
});
