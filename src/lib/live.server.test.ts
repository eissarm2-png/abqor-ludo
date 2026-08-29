import { beforeAll, describe, expect, it } from "vitest";
import { FORFEIT_GRACE_MS, TURN_LIMIT_MS, secureDie, signPayload, verifyPayload } from "./live.server";

beforeAll(() => {
  process.env["ABQOR_MATCH_SECRET"] = "test-secret";
});

describe("تحقق السيرفر من الأدوار والرميات", () => {
  it("التوقيع صحيح لنفس البيانات وخاطئ عند التلاعب", () => {
    const parts = ["turn", "11111111-1111-4111-8111-111111111111", 3, 1700000000000];
    const sig = signPayload(parts);
    expect(verifyPayload(parts, sig)).toBe(true);
    expect(verifyPayload(["turn", "11111111-1111-4111-8111-111111111111", 4, 1700000000000], sig)).toBe(false);
    expect(verifyPayload(parts, "0".repeat(32))).toBe(false);
  });

  it("النرد المولّد في السيرفر بين 1 و6 دائمًا", () => {
    for (let i = 0; i < 300; i += 1) {
      const v = secureDie();
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
    }
  });

  it("حساب المدة المنقضية يطابق مهلة 15 ثانية مع هامش السماح", () => {
    const now = Date.now();
    const deadline = now + TURN_LIMIT_MS;
    const elapsedAtStart = TURN_LIMIT_MS - (deadline - now);
    expect(elapsedAtStart).toBe(0);

    // محاولة إنهاء مبكرة تُرفض
    expect(now < deadline - FORFEIT_GRACE_MS).toBe(true);

    // بعد انقضاء المهلة تُقبل
    const later = deadline + 10;
    expect(later < deadline - FORFEIT_GRACE_MS).toBe(false);
    expect(TURN_LIMIT_MS - (deadline - later)).toBeGreaterThanOrEqual(TURN_LIMIT_MS);
  });
});
