import { z } from "zod";
import { basQuarter } from "@/lib/dates";
import { splitGross, sumMoney, type MoneySplit } from "@/lib/money";
import { INCOME_CATEGORIES, LEDGER_CATEGORIES, LEDGER_KINDS, PAYMENT_METHODS, type LedgerCategory, type LedgerKind } from "./vocab";

/** What is entered: a GST-inclusive total and whether it is GST-free. The split is computed
 * here, once, and stored - the screen, the P&L and the BAS all read the same three numbers. */
export const ledgerInputSchema = z.object({
  entryDate: z.iso.date(),
  kind: z.enum(LEDGER_KINDS),
  category: z.enum(LEDGER_CATEGORIES),
  description: z.string().trim().min(1).max(300),
  total: z.number().min(0).max(10_000_000),
  gstFree: z.boolean().default(false),
  paymentMethod: z.enum(PAYMENT_METHODS).nullable().default(null),
  eventId: z.uuid().nullable().default(null),
  reference: z.string().trim().max(120).nullable().default(null),
}).strict().superRefine((value, ctx) => {
  const income = (INCOME_CATEGORIES as readonly string[]).includes(value.category);
  if (value.kind === "income" && !income) ctx.addIssue({ code: "custom", path: ["category"], message: "Income needs an income category." });
  if (value.kind === "expense" && (income || value.category === "wages_payment")) ctx.addIssue({ code: "custom", path: ["category"], message: "Expenses need an expense category (wages have their own kind)." });
  if (value.kind === "wages" && value.category !== "wages_payment") ctx.addIssue({ code: "custom", path: ["category"], message: "Wages are always the wages_payment category." });
  if (value.kind === "wages" && !value.gstFree) ctx.addIssue({ code: "custom", path: ["gstFree"], message: "Wages carry no GST." });
});
export type LedgerInput = z.infer<typeof ledgerInputSchema>;

/** The stored split for an entry - wages and GST-free entries have zero GST. */
export function ledgerSplit(input: Pick<LedgerInput, "total" | "gstFree" | "kind">): MoneySplit {
  return splitGross(input.total, input.gstFree || input.kind === "wages");
}

export type LedgerEntry = { entryDate: string; kind: LedgerKind; category: LedgerCategory | string; total: number; gst: number; subtotal: number; voidedAt?: string | null };

const live = (entries: readonly LedgerEntry[]) => entries.filter((entry) => !entry.voidedAt);
const inRange = (entries: readonly LedgerEntry[], start: string, end: string) => live(entries).filter((entry) => entry.entryDate >= start && entry.entryDate <= end);

export type ProfitAndLoss = {
  start: string; end: string;
  income: number; costOfGoods: number; wages: number; otherExpenses: number;
  grossProfit: number; netProfit: number;
  byCategory: { category: string; kind: LedgerKind; total: number }[];
};

/** Cash-basis P&L for a period, GST-exclusive (the money that is the venue's, not the ATO's).
 * Stock purchases are the cost of goods; wages are labour; the rest is overhead. */
export function profitAndLoss(entries: readonly LedgerEntry[], start: string, end: string): ProfitAndLoss {
  const rows = inRange(entries, start, end);
  const total = (predicate: (entry: LedgerEntry) => boolean) => sumMoney(rows.filter(predicate).map((entry) => entry.subtotal));
  const income = total((entry) => entry.kind === "income");
  const costOfGoods = total((entry) => entry.kind === "expense" && entry.category === "stock_purchase");
  const wages = total((entry) => entry.kind === "wages");
  const otherExpenses = total((entry) => entry.kind === "expense" && entry.category !== "stock_purchase");
  const grossProfit = sumMoney([income, -costOfGoods]);
  const categories = new Map<string, { category: string; kind: LedgerKind; total: number }>();
  for (const entry of rows) {
    const key = `${entry.kind}:${entry.category}`;
    const current = categories.get(key) ?? { category: entry.category, kind: entry.kind, total: 0 };
    categories.set(key, { ...current, total: sumMoney([current.total, entry.subtotal]) });
  }
  return { start, end, income, costOfGoods, wages, otherExpenses, grossProfit, netProfit: sumMoney([grossProfit, -wages, -otherExpenses]), byCategory: [...categories.values()].sort((a, b) => b.total - a.total) };
}

export type BasSummary = { label: string; start: string; end: string; g1TotalSales: number; g11NonCapitalPurchases: number; oneAGstOnSales: number; oneBGstOnPurchases: number; netGst: number; wagesW1: number };

/** Working BAS figures on a cash basis for the quarter containing `date`: G1 total sales
 * (GST-inclusive), G11 purchases, 1A GST collected, 1B GST paid, and W1 total wages.
 * A working figure for the bookkeeper's lodgement, not tax advice. */
export function basSummary(entries: readonly LedgerEntry[], date: string): BasSummary {
  const quarter = basQuarter(date);
  const rows = inRange(entries, quarter.start, quarter.end);
  const sales = rows.filter((entry) => entry.kind === "income");
  const purchases = rows.filter((entry) => entry.kind === "expense");
  const wages = rows.filter((entry) => entry.kind === "wages");
  const oneA = sumMoney(sales.map((entry) => entry.gst)), oneB = sumMoney(purchases.map((entry) => entry.gst));
  return { label: quarter.label, start: quarter.start, end: quarter.end, g1TotalSales: sumMoney(sales.map((entry) => entry.total)), g11NonCapitalPurchases: sumMoney(purchases.map((entry) => entry.total)), oneAGstOnSales: oneA, oneBGstOnPurchases: oneB, netGst: sumMoney([oneA, -oneB]), wagesW1: sumMoney(wages.map((entry) => entry.total)) };
}

/** Takings for one trading day, by payment method - what to reconcile against the till. */
export function dailyTakings(entries: readonly LedgerEntry[], date: string): { total: number; gst: number } {
  const rows = inRange(entries, date, date).filter((entry) => entry.kind === "income");
  return { total: sumMoney(rows.map((entry) => entry.total)), gst: sumMoney(rows.map((entry) => entry.gst)) };
}
