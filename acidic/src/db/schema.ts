import { sql } from "drizzle-orm";
import { check, date, index, integer, jsonb, numeric, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { EVENT_KINDS, EVENT_STATUSES } from "../lib/programme/vocab";
import { MOVEMENT_KINDS, STOCK_CATEGORIES, STOCK_UNITS } from "../lib/stock/vocab";
import { SHIFT_ROLES, SHIFT_STATUSES, EMPLOYMENT_TYPES } from "../lib/staffing/vocab";
import { LEDGER_KINDS, LEDGER_CATEGORIES, PAYMENT_METHODS } from "../lib/accounting/vocab";

/** A SQL list of allowed values for a check constraint, from a vocabulary. */
const inList = (values: readonly string[]) => sql.raw(values.map((value) => `'${value}'`).join(", "));
const createdAt = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).defaultNow().notNull();
const moneyColumn = (name: string) => numeric(name, { precision: 12, scale: 2 });

/** Profiles that can sign in: pick a tile, type a 6-digit passcode (D12). Owner runs the
 * venue; managers run shifts and stock; staff see the roster. Staff who never sign in are
 * still `staffMembers` rows - the two are separate on purpose. */
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  /** Optional - a shared "Manager 2" profile has no email. Unique where present. */
  email: text("email").unique(),
  /** bcrypt hash of the 6-digit passcode (column name kept from the password era). */
  passwordHash: text("password_hash"),
  role: text("role").default("staff").notNull(),
  failedLoginAttempts: integer("failed_login_attempts").default(0).notNull(),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  createdAt: createdAt(),
}, (table) => [check("users_role_valid", sql`${table.role} IN ('owner', 'manager', 'staff')`)]);

/* ---------------- Programme: gigs, day sessions, private bookings ---------------- */
export const events = pgTable("events", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventDate: date("event_date").notNull(),
  title: text("title").notNull(),
  artist: text("artist"),
  genre: text("genre"),
  kind: text("kind").default("night_session").notNull(),
  status: text("status").default("placeholder").notNull(),
  /** "HH:MM" doors or start; null while details are TBA. */
  startTime: text("start_time"),
  endTime: text("end_time"),
  ticketUrl: text("ticket_url"),
  priceFrom: moneyColumn("price_from"),
  priceTo: moneyColumn("price_to"),
  description: text("description"),
  /** Bar staff the night needs on the floor - what the roster is checked against. */
  staffRequired: integer("staff_required").default(2).notNull(),
  createdBy: uuid("created_by").notNull().references(() => users.id, { onDelete: "restrict" }),
  createdAt: createdAt(), updatedAt: updatedAt(),
}, (table) => [
  index("events_date_idx").on(table.eventDate),
  check("events_kind_valid", sql`${table.kind} IN (${inList(EVENT_KINDS)})`),
  check("events_status_valid", sql`${table.status} IN (${inList(EVENT_STATUSES)})`),
  check("events_staff_required_valid", sql`${table.staffRequired} >= 0`),
  check("events_price_valid", sql`(${table.priceFrom} IS NULL OR ${table.priceFrom} >= 0) AND (${table.priceTo} IS NULL OR ${table.priceTo} >= 0)`),
  // A ticket link is only ever shown for a ticketed or free-RSVP event - the website rule.
  check("events_ticket_link_consistent", sql`${table.ticketUrl} IS NULL OR ${table.status} IN ('ticketed', 'free_rsvp')`),
]);

/* ---------------- Stocktake: bar stock, counts, deliveries and waste ---------------- */
export const stockItems = pgTable("stock_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  unit: text("unit").notNull(),
  /** Cost per unit, GST-inclusive as billed by the supplier. */
  unitCost: moneyColumn("unit_cost").notNull(),
  parLevel: numeric("par_level", { precision: 10, scale: 2 }).default("0").notNull(),
  supplier: text("supplier"),
  active: integer("active").default(1).notNull(),
  createdAt: createdAt(), updatedAt: updatedAt(),
}, (table) => [
  uniqueIndex("stock_items_name_unique").on(table.name),
  check("stock_items_category_valid", sql`${table.category} IN (${inList(STOCK_CATEGORIES)})`),
  check("stock_items_unit_valid", sql`${table.unit} IN (${inList(STOCK_UNITS)})`),
  check("stock_items_cost_valid", sql`${table.unitCost} >= 0 AND ${table.parLevel} >= 0`),
]);

/** One physical count of the whole bar, usually Monday morning. */
export const stockCounts = pgTable("stock_counts", {
  id: uuid("id").defaultRandom().primaryKey(),
  countDate: date("count_date").notNull(),
  note: text("note"),
  countedBy: uuid("counted_by").notNull().references(() => users.id, { onDelete: "restrict" }),
  createdAt: createdAt(),
}, (table) => [index("stock_counts_date_idx").on(table.countDate)]);

export const stockCountLines = pgTable("stock_count_lines", {
  id: uuid("id").defaultRandom().primaryKey(),
  countId: uuid("count_id").notNull().references(() => stockCounts.id, { onDelete: "cascade" }),
  itemId: uuid("item_id").notNull().references(() => stockItems.id, { onDelete: "restrict" }),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull(),
}, (table) => [uniqueIndex("stock_count_lines_unique").on(table.countId, table.itemId), check("stock_count_lines_quantity_valid", sql`${table.quantity} >= 0`)]);

/** Deliveries in, waste and adjustments out, between counts. Sales are not recorded per
 * item - the difference between counts, deliveries and waste IS the usage figure. */
export const stockMovements = pgTable("stock_movements", {
  id: uuid("id").defaultRandom().primaryKey(),
  itemId: uuid("item_id").notNull().references(() => stockItems.id, { onDelete: "restrict" }),
  movementDate: date("movement_date").notNull(),
  kind: text("kind").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull(),
  note: text("note"),
  recordedBy: uuid("recorded_by").notNull().references(() => users.id, { onDelete: "restrict" }),
  createdAt: createdAt(),
}, (table) => [index("stock_movements_item_date_idx").on(table.itemId, table.movementDate), check("stock_movements_kind_valid", sql`${table.kind} IN (${inList(MOVEMENT_KINDS)})`), check("stock_movements_quantity_valid", sql`${table.quantity} > 0`)]);

/* ---------------- Staffing: people and shifts ---------------- */
export const staffMembers = pgTable("staff_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  defaultRole: text("default_role").notNull(),
  employmentType: text("employment_type").notNull(),
  /** Base hourly rate. Penalty rates and award loadings are NOT computed - see ACIDIC_DECISIONS. */
  hourlyRate: moneyColumn("hourly_rate").notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  active: integer("active").default(1).notNull(),
  createdAt: createdAt(), updatedAt: updatedAt(),
}, (table) => [check("staff_members_role_valid", sql`${table.defaultRole} IN (${inList(SHIFT_ROLES)})`), check("staff_members_employment_valid", sql`${table.employmentType} IN (${inList(EMPLOYMENT_TYPES)})`), check("staff_members_rate_valid", sql`${table.hourlyRate} >= 0`)]);

export const shifts = pgTable("shifts", {
  id: uuid("id").defaultRandom().primaryKey(),
  staffId: uuid("staff_id").notNull().references(() => staffMembers.id, { onDelete: "restrict" }),
  shiftDate: date("shift_date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  role: text("role").notNull(),
  status: text("status").default("rostered").notNull(),
  /** Unpaid break, minutes. */
  breakMinutes: integer("break_minutes").default(0).notNull(),
  note: text("note"),
  createdBy: uuid("created_by").notNull().references(() => users.id, { onDelete: "restrict" }),
  createdAt: createdAt(), updatedAt: updatedAt(),
}, (table) => [index("shifts_date_idx").on(table.shiftDate), index("shifts_staff_date_idx").on(table.staffId, table.shiftDate), check("shifts_role_valid", sql`${table.role} IN (${inList(SHIFT_ROLES)})`), check("shifts_status_valid", sql`${table.status} IN (${inList(SHIFT_STATUSES)})`), check("shifts_break_valid", sql`${table.breakMinutes} >= 0`)]);

/* ---------------- Accounting: takings, purchases, wages, one ledger ---------------- */
export const ledgerEntries = pgTable("ledger_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  entryDate: date("entry_date").notNull(),
  kind: text("kind").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  /** GST-inclusive total as it went through the till or left the bank. */
  total: moneyColumn("total").notNull(),
  gst: moneyColumn("gst").notNull(),
  subtotal: moneyColumn("subtotal").notNull(),
  gstFree: integer("gst_free").default(0).notNull(),
  paymentMethod: text("payment_method"),
  /** A takings entry may point at the event it belongs to, so a gig night's revenue is visible. */
  eventId: uuid("event_id").references(() => events.id, { onDelete: "set null" }),
  reference: text("reference"),
  voidedAt: timestamp("voided_at", { withTimezone: true }),
  voidReason: text("void_reason"),
  recordedBy: uuid("recorded_by").notNull().references(() => users.id, { onDelete: "restrict" }),
  createdAt: createdAt(), updatedAt: updatedAt(),
}, (table) => [
  index("ledger_entries_date_idx").on(table.entryDate),
  index("ledger_entries_kind_date_idx").on(table.kind, table.entryDate),
  check("ledger_entries_kind_valid", sql`${table.kind} IN (${inList(LEDGER_KINDS)})`),
  check("ledger_entries_category_valid", sql`${table.category} IN (${inList(LEDGER_CATEGORIES)})`),
  check("ledger_entries_payment_valid", sql`${table.paymentMethod} IS NULL OR ${table.paymentMethod} IN (${inList(PAYMENT_METHODS)})`),
  check("ledger_entries_nonnegative", sql`${table.total} >= 0 AND ${table.gst} >= 0 AND ${table.subtotal} >= 0`),
  check("ledger_entries_split_consistent", sql`${table.subtotal} + ${table.gst} = ${table.total}`),
  check("ledger_entries_gst_free_consistent", sql`(${table.gstFree} = 1 AND ${table.gst} = 0) OR ${table.gstFree} = 0`),
  check("ledger_entries_void_consistent", sql`(${table.voidedAt} IS NULL AND ${table.voidReason} IS NULL) OR (${table.voidedAt} IS NOT NULL AND ${table.voidReason} IS NOT NULL)`),
]);

/** Append-only record of who changed what. Every service writes here inside its transaction. */
export const auditLog = pgTable("audit_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorId: uuid("actor_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  entity: text("entity").notNull(),
  entityId: uuid("entity_id").notNull(),
  action: text("action").notNull(),
  detailJson: jsonb("detail_json").$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: createdAt(),
}, (table) => [index("audit_log_entity_idx").on(table.entity, table.entityId, table.createdAt)]);
