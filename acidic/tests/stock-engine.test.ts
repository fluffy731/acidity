import { describe, expect, it } from "vitest";
import { costOfGoods, reorderList, stockCountInputSchema, stockValue, usageBetweenCounts } from "../src/lib/stock/engine";
import { items, latestCount, movements, previousCount } from "../src/lib/data/fixtures";

describe("stocktake engine", () => {
  it("values the shelf at cost in exact cents", () => {
    // 5.5kg beans @42 = 231; 14 oat @3.2 = 44.8; 21 milk @3.6 = 75.6; 1 lager keg = 290; 0 pale;
    // 11 red @14.5 = 159.5; 13 white @13 = 169; 5 sake @28 = 140; 3 gin @58 = 174; 6 matcha @24 = 144
    expect(stockValue(items, latestCount.lines)).toBe(1427.9);
    expect(stockValue(items, [])).toBe(0);
  });
  it("works out usage as opening + deliveries - waste - closing, and flags impossible counts", () => {
    const usage = usageBetweenCounts(items, previousCount.lines, latestCount.lines, movements);
    const oat = usage.find((row) => row.item.id === "i2")!;
    expect(oat).toMatchObject({ opening: 30, delivered: 12, wasted: 0, closing: 14, used: 28, usedValue: 89.6 });
    const milk = usage.find((row) => row.item.id === "i3")!;
    expect(milk).toMatchObject({ opening: 22, wasted: 2, closing: 21, used: -1 });
    expect(milk.usedValue).toBe(0);
    const pale = usage.find((row) => row.item.id === "i5")!;
    expect(pale).toMatchObject({ opening: 2, delivered: 1, closing: 0, used: 3, usedValue: 930 });
  });
  it("totals cost of goods and waste at cost", () => {
    const cogs = costOfGoods(usageBetweenCounts(items, previousCount.lines, latestCount.lines, movements));
    expect(cogs.wasteValue).toBe(7.2);
    expect(cogs.usedValue).toBeGreaterThan(1000);
  });
  it("lists what is below par, most expensive gap first", () => {
    const reorder = reorderList(items, latestCount.lines);
    expect(reorder[0]).toMatchObject({ item: { name: "Pale ale keg (50L)" }, onHand: 0, shortBy: 2, orderValue: 620 });
    expect(reorder.map((row) => row.item.id)).toContain("i2");
    expect(reorder.some((row) => row.item.id === "i3")).toBe(false); // 21 on hand, par 20 - above par
  });
  it("rejects a count that lists the same item twice", () => {
    expect(stockCountInputSchema.safeParse({ countDate: "2026-08-10", lines: [{ itemId: "6b1f2f3e-1111-4a5b-8c9d-000000000001", quantity: 1 }, { itemId: "6b1f2f3e-1111-4a5b-8c9d-000000000001", quantity: 2 }] }).success).toBe(false);
  });
});
