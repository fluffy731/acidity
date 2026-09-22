import { readFileSync } from "node:fs";
import postgres from "postgres";
import { z } from "zod";

// Loads data/programme.json into the live database. Safe to run as often as you like: an event
// is identified by its date and title, so re-running after an edit updates that event instead of
// creating a second one. Nothing is ever deleted - an event that leaves the file stays in the
// database, because the programme is a record of what was on, not a mirror of one file.
//
//   node scripts/seed-programme.mjs            report what would change, then roll back
//   node scripts/seed-programme.mjs --apply    write it
//   ... --as "Solomon"                         attribute the audit entries to that profile
//   ... --file data/spring.json                load a different list
//
// What counts as a valid event is decided in src/lib/programme/workflow.ts and applied to this
// file by tests/programme-seed.test.ts in CI. This container has no TypeScript, so the schema
// below repeats the shape only - after editing the programme, run `npm test`.

const argument = (flag) => { const index = process.argv.indexOf(flag); return index >= 0 ? process.argv[index + 1] : null; };
const apply = process.argv.includes("--apply");
const actorName = argument("--as");
const file = argument("--file");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Run this through the tools container, which has it.");
  process.exit(1);
}

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM, 24-hour");
const eventSchema = z.object({
  eventDate: z.iso.date(),
  title: z.string().trim().min(1).max(200),
  artist: z.string().trim().max(200).nullable().default(null),
  genre: z.string().trim().max(120).nullable().default(null),
  kind: z.enum(["night_session", "day_programme", "private_booking"]).default("night_session"),
  status: z.enum(["placeholder", "confirmed", "ticketed", "free_rsvp", "private", "cancelled"]).default("placeholder"),
  startTime: time.nullable().default(null),
  endTime: time.nullable().default(null),
  ticketUrl: z.union([z.url().max(500), z.literal("")]).nullable().default(null),
  priceFrom: z.number().min(0).max(100_000).nullable().default(null),
  priceTo: z.number().min(0).max(100_000).nullable().default(null),
  description: z.string().trim().max(2000).nullable().default(null),
  staffRequired: z.number().int().min(0).max(30).default(2),
}).strict().superRefine((value, ctx) => {
  const bookable = ["ticketed", "free_rsvp"].includes(value.status);
  if (value.ticketUrl && !bookable) ctx.addIssue({ code: "custom", path: ["ticketUrl"], message: "A booking link is only shown for a ticketed or RSVP event." });
  if (bookable && !value.ticketUrl) ctx.addIssue({ code: "custom", path: ["ticketUrl"], message: "A ticketed or RSVP event needs its booking link." });
  if (value.kind === "private_booking" && !["private", "cancelled"].includes(value.status)) ctx.addIssue({ code: "custom", path: ["status"], message: "A private booking is always status private." });
});
const fileSchema = z.object({ $comment: z.array(z.string()).optional(), events: z.array(eventSchema).min(1) }).strict();

const path = file ? new URL(file, `file://${process.cwd()}/`) : new URL("../data/programme.json", import.meta.url);
let raw;
let programme;
try {
  raw = JSON.parse(readFileSync(path, "utf8"));
  programme = fileSchema.parse(raw);
} catch (error) {
  console.error(`Could not read the programme from ${file ?? "data/programme.json"}.\n`);
  // Name the row the way the file does, so the line to fix is obvious.
  const label = (index) => {
    const row = raw?.events?.[index];
    const date = typeof row?.eventDate === "string" ? row.eventDate : `row ${index + 1}`;
    return typeof row?.title === "string" ? `${date} "${row.title}"` : date;
  };
  for (const issue of error?.issues ?? []) {
    const [root, index, ...rest] = issue.path;
    if (root === "events" && typeof index === "number") console.error(`  ${label(index)} - ${rest.length ? `${rest.join(".")}: ` : ""}${issue.message}`);
    else console.error(`  ${issue.path.join(".") || "the file"}: ${issue.message}`);
  }
  if (!error?.issues) console.error(`  ${error.message}`);
  process.exit(1);
}

/** The database's own words for an event, so a file row and a stored row can be compared. */
const desiredRow = (event) => ({
  title: event.title, artist: event.artist, genre: event.genre, kind: event.kind, status: event.status,
  startTime: event.startTime, endTime: event.endTime, ticketUrl: event.ticketUrl || null,
  priceFrom: event.priceFrom === null ? null : event.priceFrom.toFixed(2),
  priceTo: event.priceTo === null ? null : event.priceTo.toFixed(2),
  description: event.description, staffRequired: event.staffRequired,
});

const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
const ROLLBACK = Symbol("dry run");
const plan = [];
const note = (action, event, detail = "") => plan.push({ action, date: event.eventDate, title: event.title, detail });

try {
  const [actor] = actorName
    ? await sql`select id, name, role from users where lower(name) = lower(${actorName}) limit 1`
    : await sql`select id, name, role from users where role = 'owner' order by created_at limit 1`;
  if (!actor) {
    console.error(actorName
      ? `No sign-in profile called "${actorName}". Check the name on the sign-in page.`
      : "No owner profile exists yet. Create one first with scripts/create-profile.mjs --role owner.");
    process.exit(1);
  }

  try {
    await sql.begin(async (tx) => {
      for (const event of programme.events) {
        const row = desiredRow(event);
        const [existing] = await tx`
          select id, title, artist, genre, kind, status, start_time as "startTime", end_time as "endTime",
                 ticket_url as "ticketUrl", price_from as "priceFrom", price_to as "priceTo", description,
                 staff_required as "staffRequired"
          from events where event_date = ${event.eventDate} and lower(title) = lower(${event.title}) limit 1`;

        if (existing) {
          if (existing.status === "cancelled" && event.status !== "cancelled") {
            note("skip", event, "cancelled in the app; make a new event rather than reviving this one");
            continue;
          }
          const changed = Object.keys(row).filter((key) => (existing[key] ?? null) !== row[key]);
          if (!changed.length) { note("same", event); continue; }
          await tx`
            update events set title = ${row.title}, artist = ${row.artist}, genre = ${row.genre}, kind = ${row.kind},
              status = ${row.status}, start_time = ${row.startTime}, end_time = ${row.endTime}, ticket_url = ${row.ticketUrl},
              price_from = ${row.priceFrom}, price_to = ${row.priceTo}, description = ${row.description},
              staff_required = ${row.staffRequired}, updated_at = now()
            where id = ${existing.id}`;
          await tx`insert into audit_log (actor_id, entity, entity_id, action, detail_json) values (${actor.id}, 'event', ${existing.id},
            ${existing.status === row.status ? "edited" : `status:${existing.status}->${row.status}`},
            ${sql.json({ title: row.title, eventDate: event.eventDate, source: "programme.json", fields: changed })})`;
          note("update", event, changed.join(", "));
          continue;
        }

        // The venue cannot be two things at once: a private hire never joins a public night.
        const others = await tx`select title, status, kind from events where event_date = ${event.eventDate} and status <> 'cancelled' and lower(title) <> lower(${event.title})`;
        let sharing = "";
        if (others.length && event.status !== "cancelled") {
          const privateHire = event.kind === "private_booking" || others.some((other) => other.kind === "private_booking");
          if (privateHire) { note("skip", event, `${others[0].title} already holds this date`); continue; }
          sharing = `also on this date: ${others.map((other) => other.title).join(", ")}`;
        }

        const [created] = await tx`
          insert into events (event_date, title, artist, genre, kind, status, start_time, end_time, ticket_url,
            price_from, price_to, description, staff_required, created_by)
          values (${event.eventDate}, ${row.title}, ${row.artist}, ${row.genre}, ${row.kind}, ${row.status},
            ${row.startTime}, ${row.endTime}, ${row.ticketUrl}, ${row.priceFrom}, ${row.priceTo}, ${row.description},
            ${row.staffRequired}, ${actor.id})
          returning id`;
        await tx`insert into audit_log (actor_id, entity, entity_id, action, detail_json) values (${actor.id}, 'event', ${created.id}, 'created',
          ${sql.json({ title: row.title, eventDate: event.eventDate, status: row.status, source: "programme.json" })})`;
        note("create", event, sharing);
      }
      // A dry run does the real work and then undoes it, so what it reports is what would happen.
      if (!apply) throw ROLLBACK;
    });
  } catch (error) {
    if (error !== ROLLBACK) throw error;
  }

  const WORD = { create: "create", update: "update", same: "unchanged", skip: "SKIPPED" };
  console.log(`Programme seed - ${programme.events.length} events in the file, attributed to ${actor.name} (${actor.role}).\n`);
  for (const entry of plan) {
    if (entry.action === "same") continue;
    console.log(`  ${WORD[entry.action].padEnd(9)} ${entry.date}  ${entry.title}${entry.detail ? `  - ${entry.detail}` : ""}`);
  }
  const count = (action) => plan.filter((entry) => entry.action === action).length;
  const skipped = count("skip");
  console.log(`\n${count("create")} to create, ${count("update")} to update, ${count("same")} already correct, ${skipped} skipped.`);
  console.log(apply ? "\nWritten. Open Programme in the app, then Programme -> Website export." : "\nNothing was written. Re-run with --apply to keep it.");
  if (skipped) process.exitCode = 1;
} catch (error) {
  console.error(`\nThe programme was not loaded: ${error.message}`);
  console.error("Nothing was written - the whole load runs in one transaction. Check that the migrations are applied.");
  process.exitCode = 1;
} finally {
  await sql.end();
}
