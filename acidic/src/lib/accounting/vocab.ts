/** income comes in through the till or a booking; expense goes out; wages are the roster's cost
 * once shifts are marked worked. Wages are recorded as their own kind so the P&L can show
 * labour separately and the BAS can leave them out of G11 (wages are not a GST purchase). */
export const LEDGER_KINDS = ["income", "expense", "wages"] as const;
export type LedgerKind = (typeof LEDGER_KINDS)[number];

export const LEDGER_CATEGORIES = [
  // income
  "bar_takings", "coffee_takings", "ticket_sales", "venue_hire", "other_income",
  // expense
  "stock_purchase", "rent", "utilities", "wages_payment", "artist_fee", "marketing", "equipment", "cleaning", "fees_and_charges", "other_expense",
] as const;
export type LedgerCategory = (typeof LEDGER_CATEGORIES)[number];

export const INCOME_CATEGORIES: readonly LedgerCategory[] = ["bar_takings", "coffee_takings", "ticket_sales", "venue_hire", "other_income"];
export const PAYMENT_METHODS = ["card", "cash", "bank_transfer", "ticket_platform"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
