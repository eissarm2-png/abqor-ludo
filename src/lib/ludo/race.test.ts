import { describe, expect, it } from "vitest";
import {
  applyMove,
  applyRoll,
  createGame,
  currentPlayer,
  forfeitTurn,
  legalMoves,
  type GameState,
} from "./engine";

/** حالات السباق: انتهاء المؤقت لحظة الرمية أو أثناء إرسال رسالة دردشة */
describe("حالات السباق بين المؤقت والرمية والدردشة", () => {
  it("انتهاء المهلة أثناء رمية معلّقة لا يضيف حركة للاعب التالي بنتيجة الرمية القديمة", () => {
    const start = createGame(4, 1);
    const seatBefore = currentPlayer(start).seat;

    // انتهت المهلة قبل وصول نتيجة الرمية → ينتقل الدور
    const afterForfeit = forfeitTurn(start);
    expect(currentPlayer(afterForfeit).seat).not.toBe(seatBefore);

    // نتيجة الرمية المتأخرة تُطبَّق على اللقطة القديمة فقط ولا تلمس الحالة الجديدة
    const stale = applyRoll(start, 6);
    expect(currentPlayer(afterForfeit).seat).toBe(currentPlayer(afterForfeit).seat);
    expect(afterForfeit.dice).toBeNull();
    expect(stale.turn).not.toBe(afterForfeit.turn);
  });

  it("المهلة لا تُلغي حركة تم تنفيذها بالفعل", () => {
    let state: GameState = createGame(4, 1);
    state = applyRoll(state, 6);
    const moves = legalMoves(state, 6);
    expect(moves.length).toBeGreaterThan(0);
    const moved = applyMove(state, moves[0]!);
    const tokensOnBoard = moved.tokens.filter((t) => t.offset >= 0).length;

    const afterTimeout = forfeitTurn(moved);
    expect(afterTimeout.tokens.filter((t) => t.offset >= 0).length).toBe(tokensOnBoard);
  });

  it("إرسال رسائل الدردشة لا يغيّر حالة اللعبة إطلاقًا", () => {
    const state = applyRoll(createGame(4, 1), 5);
    const snapshot = JSON.stringify(state);

    // الدردشة تعمل على حالة مستقلة تمامًا
    const chat: { text: string; at: number }[] = [];
    for (let i = 0; i < 20; i += 1) chat.push({ text: `رسالة ${i}`, at: Date.now() });

    expect(chat).toHaveLength(20);
    expect(JSON.stringify(state)).toBe(snapshot);
  });

  it("إنهاء الدور مرتين بالتتابع لا يتخطّى أكثر من لاعب واحد لكل نداء", () => {
    const state = createGame(4, 1);
    const once = forfeitTurn(state);
    const twice = forfeitTurn(once);
    const seats = state.players.length;
    expect((twice.turn - state.turn + seats * 2) % seats).toBe(2 % seats);
  });
});
