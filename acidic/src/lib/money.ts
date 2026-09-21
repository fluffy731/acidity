/** The one place money arithmetic happens - carried over from Monnie's engineering standard.
 *
 * Every amount is stored as PostgreSQL `numeric(_,2)` and every calculation runs in integer
 * cents. Dollars are a display and boundary format only: the moment a figure is computed in
 * floating point it acquires an error that compounds silently across a month of takings and
 * surfaces later as a cent-level mismatch nobody can explain.
 *
 * GST METHOD: GST is 10% of the SUBTOTAL, rounded half up to the nearest cent. GST contained
 * in a GST-inclusive amount (a bar sale, a supplier bill) is one eleventh of the gross, same
 * rounding. Acidic does not determine whether a sale or purchase is taxable - the person
 * recording it marks it GST-free where it is (fresh food inputs, for example), and the BAS
 * summary is a working figure for the bookkeeper, not lodgement advice.
 */

/** numeric(12,2) maximum, in cents. */
const MAX_CENTS = 999_999_999_999;

export type CentsOptions = { allowNegative?: boolean };

/** Dollars to integer cents, refusing anything that is not exact money. */
export function toCents(value: number, options: CentsOptions = {}): number {
  if (!Number.isFinite(value)) throw new Error("Money must be a finite amount.");
  if (!options.allowNegative && value < 0) throw new Error("Money must be a non-negative amount.");
  const scaled = value * 100;
  const cents = Math.round(scaled);
  if (Math.abs(scaled - cents) > 0.00001 || Math.abs(cents) > MAX_CENTS) throw new Error("Money must fit two decimal places within the supported range.");
  return cents;
}

export function fromCents(cents: number, options: CentsOptions = {}): number {
  if (!Number.isSafeInteger(cents)) throw new Error("Cents must be a whole number.");
  if (!options.allowNegative && cents < 0) throw new Error("Money must be a non-negative amount.");
  if (Math.abs(cents) > MAX_CENTS) throw new Error("Calculated amount exceeds the supported money range.");
  return cents / 100;
}

/** Normalises a database string or a float from elsewhere to an exact two-decimal number. */
export function money(value: unknown): number {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) return 0;
  return fromCents(Math.round(parsed * 100), { allowNegative: true });
}

/** Adds a list of amounts in cents, so a hundred till rows cannot drift. */
export function sumMoney(values: readonly unknown[]): number {
  return fromCents(values.reduce<number>((sum, value) => sum + Math.round(Number(value ?? 0) * 100), 0), { allowNegative: true });
}

/** Rounds half up on integers, symmetrically for negatives. */
function divideHalfUp(cents: number, divisor: number): number {
  const sign = cents < 0 ? -1 : 1;
  return sign * Math.floor((Math.abs(cents) * 2 + divisor) / (divisor * 2));
}

/** GST to ADD to a GST-exclusive subtotal: 10%, half up. */
export function gstOnSubtotal(subtotal: number): number {
  return fromCents(divideHalfUp(toCents(subtotal, { allowNegative: true }), 10), { allowNegative: true });
}

/** GST CONTAINED IN a GST-inclusive amount: one eleventh, half up. */
export function gstInGross(gross: number): number {
  return fromCents(divideHalfUp(toCents(gross, { allowNegative: true }), 11), { allowNegative: true });
}

export type MoneySplit = { subtotal: number; gst: number; total: number };

/** Splits a GST-inclusive amount into its parts. The total is never changed - it is what
 * went through the till or left the bank; only the split is computed. */
export function splitGross(gross: number, gstFree = false): MoneySplit {
  const grossCents = toCents(gross, { allowNegative: true });
  if (gstFree) return { subtotal: fromCents(grossCents, { allowNegative: true }), gst: 0, total: fromCents(grossCents, { allowNegative: true }) };
  const gstCents = divideHalfUp(grossCents, 11);
  return { subtotal: fromCents(grossCents - gstCents, { allowNegative: true }), gst: fromCents(gstCents, { allowNegative: true }), total: fromCents(grossCents, { allowNegative: true }) };
}

/** Builds the parts from a GST-exclusive subtotal, adding GST (or none). */
export function addGst(subtotal: number, gstFree = false): MoneySplit {
  const subtotalCents = toCents(subtotal, { allowNegative: true });
  const gstCents = gstFree ? 0 : divideHalfUp(subtotalCents, 10);
  return { subtotal: fromCents(subtotalCents, { allowNegative: true }), gst: fromCents(gstCents, { allowNegative: true }), total: fromCents(subtotalCents + gstCents, { allowNegative: true }) };
}

/** True when a stored (subtotal, gst, total) triple is internally consistent. */
export function splitIsConsistent(split: { subtotal: unknown; gst: unknown; total: unknown }): boolean {
  return Math.round(Number(split.subtotal) * 100) + Math.round(Number(split.gst) * 100) === Math.round(Number(split.total) * 100);
}

/** Multiplies a unit price by a (possibly fractional) quantity in cents, half up - the stock
 * valuation case: 2.5 kg at $18.40 must be $46.00, not 45.99999. */
export function multiplyMoney(unitPrice: number, quantity: number): number {
  if (!Number.isFinite(quantity) || quantity < 0) throw new Error("Quantity must be a non-negative number.");
  const unitCents = toCents(unitPrice);
  return fromCents(Math.round(unitCents * quantity));
}
