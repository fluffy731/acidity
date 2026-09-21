import { describe, expect, it } from "vitest";
import { addGst, fromCents, gstInGross, gstOnSubtotal, money, multiplyMoney, splitGross, splitIsConsistent, sumMoney, toCents } from "../src/lib/money";

describe("money is integer cents", () => {
  it("refuses anything that is not exact money", () => {
    expect(() => toCents(0.005)).toThrow();
    expect(() => toCents(123.455)).toThrow();
    expect(() => toCents(Number.NaN)).toThrow();
    expect(() => toCents(-1)).toThrow();
    expect(toCents(-1, { allowNegative: true })).toBe(-100);
  });
  it("does not drift when adding many amounts, where float addition does", () => {
    const rows = Array.from({ length: 100 }, () => 0.07);
    expect(rows.reduce((sum, value) => sum + value, 0)).not.toBe(7);
    expect(sumMoney(rows)).toBe(7);
  });
  it("normalises what the database hands back as a string", () => {
    expect(money("1760.00")).toBe(1760);
    expect(money(null)).toBe(0);
    expect(fromCents(-55, { allowNegative: true })).toBe(-0.55);
  });
  it("multiplies a unit cost by a fractional quantity exactly", () => {
    expect(multiplyMoney(18.4, 2.5)).toBe(46);
    expect(multiplyMoney(42, 5.5)).toBe(231);
    expect(() => multiplyMoney(1, -1)).toThrow();
  });
});

describe("one GST method", () => {
  it("adds 10% half up", () => {
    expect(1234.55 * 0.1).not.toBe(123.46);
    expect(gstOnSubtotal(1234.55)).toBe(123.46);
    expect(gstOnSubtotal(10.05)).toBe(1.01);
    expect(addGst(100)).toEqual({ subtotal: 100, gst: 10, total: 110 });
  });
  it("extracts one eleventh from a GST-inclusive amount", () => {
    expect(gstInGross(1760)).toBe(160);
    expect(gstInGross(27.27)).toBe(2.48);
    expect(gstInGross(100)).toBe(9.09);
  });
  it("keeps the total untouched when splitting", () => {
    for (const gross of [1760, 27.27, 7.17, 100, 0.05, 2860.5]) {
      const split = splitGross(gross);
      expect(split.total).toBe(gross);
      expect(splitIsConsistent(split)).toBe(true);
    }
    expect(splitGross(20, true)).toEqual({ subtotal: 20, gst: 0, total: 20 });
  });
});
