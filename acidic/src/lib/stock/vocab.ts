/** What a stock line is. `liqueur` covers the modifiers a cocktail list lives on - vermouth,
 *  amaro, Suze, Campari, crème de cacao - which move at a different rate from base spirits and
 *  are ordered from different suppliers, so they are counted apart. */
export const STOCK_CATEGORIES = ["coffee", "tea", "beer", "wine", "sake", "spirits", "liqueur", "bitters", "mixers", "juice", "syrup", "produce", "milk_dairy", "food", "packaging", "other"] as const;
export type StockCategory = (typeof STOCK_CATEGORIES)[number];
export const STOCK_UNITS = ["each", "bottle", "can", "keg", "kg", "gram", "litre", "carton", "pack"] as const;
export type StockUnit = (typeof STOCK_UNITS)[number];
/** delivery adds stock; waste and adjustment remove it. Sales are never entered per item. */
export const MOVEMENT_KINDS = ["delivery", "waste", "adjustment"] as const;
export type MovementKind = (typeof MOVEMENT_KINDS)[number];
