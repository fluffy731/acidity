export const STOCK_CATEGORIES = ["coffee", "beer", "wine", "sake", "spirits", "mixers", "milk_dairy", "food", "packaging", "other"] as const;
export type StockCategory = (typeof STOCK_CATEGORIES)[number];
export const STOCK_UNITS = ["each", "bottle", "keg", "kg", "litre", "carton", "pack"] as const;
export type StockUnit = (typeof STOCK_UNITS)[number];
/** delivery adds stock; waste and adjustment remove it. Sales are never entered per item. */
export const MOVEMENT_KINDS = ["delivery", "waste", "adjustment"] as const;
export type MovementKind = (typeof MOVEMENT_KINDS)[number];
