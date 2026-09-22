import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { hash } from "bcryptjs";
import postgres from "postgres";
import { z } from "zod";

// Creates a sign-in profile, or resets the passcode of one that already exists (matched by
// name). Run interactively with DATABASE_URL set:
//   npm run profile:create -- --role owner        (Solomon)
//   npm run profile:create -- --role manager      (Manager 1, Manager 2, ...)
// Passcodes are 6 digits (decision D12); the five-failure lockout defends them.
if (!process.stdin.isTTY || !process.env.DATABASE_URL) {
  console.error("Run this command in an interactive terminal with DATABASE_URL configured.");
  process.exit(1);
}
const roleArg = process.argv.indexOf("--role");
const role = z.enum(["owner", "manager", "staff"]).parse(roleArg >= 0 ? process.argv[roleArg + 1] : "manager");
let muted = false;
const output = new Writable({ write(chunk, _encoding, callback) { if (!muted) process.stdout.write(chunk); callback(); } });
const prompt = createInterface({ input: process.stdin, output, terminal: true });
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
const PASSCODE = /^\d{6}$/;
try {
  const name = z.string().trim().min(1).max(60).parse(await prompt.question(`Profile name (shown on the sign-in tile, ${role}): `));
  const passcodePromise = prompt.question("Passcode (6 digits, hidden): ");
  muted = true; const passcode = (await passcodePromise).trim(); muted = false; process.stdout.write("\n");
  if (!PASSCODE.test(passcode)) throw new Error("Passcode must be exactly 6 digits.");
  const confirmPromise = prompt.question("Confirm passcode (hidden): ");
  muted = true; const confirmation = (await confirmPromise).trim(); muted = false; process.stdout.write("\n");
  if (passcode !== confirmation) throw new Error("Passcodes do not match.");
  const passwordHash = await hash(passcode, 12);
  const [existing] = await sql`select id, role from users where lower(name) = lower(${name}) limit 1`;
  if (existing) {
    await sql`update users set password_hash = ${passwordHash}, role = ${role}, failed_login_attempts = 0, locked_until = null where id = ${existing.id}`;
    console.log(`Passcode reset for existing profile "${name}" (${role}${existing.role !== role ? `, was ${existing.role}` : ""}).`);
  } else {
    await sql`insert into users (name, password_hash, role) values (${name}, ${passwordHash}, ${role})`;
    console.log(`Profile "${name}" created as ${role}. It now appears on the sign-in page.`);
  }
} catch (error) {
  muted = false;
  console.error(error instanceof z.ZodError ? "Check the entered name and role." : ["Passcode must be exactly 6 digits.", "Passcodes do not match."].includes(error?.message) ? error.message : "Could not save the profile. Check the database connection and apply migrations first.");
  process.exitCode = 1;
} finally { prompt.close(); await sql.end(); }
