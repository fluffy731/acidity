import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { hash } from "bcryptjs";
import postgres from "postgres";
import { z } from "zod";

// Creates a sign-in account. Run interactively with DATABASE_URL set (npm run owner:create,
// or through the tools container). Role defaults to owner; pass --role manager|staff.
if (!process.stdin.isTTY || !process.env.DATABASE_URL) {
  console.error("Run this command in an interactive terminal with DATABASE_URL configured.");
  process.exit(1);
}
const roleArg = process.argv.indexOf("--role");
const role = z.enum(["owner", "manager", "staff"]).parse(roleArg >= 0 ? process.argv[roleArg + 1] : "owner");
let muted = false;
const output = new Writable({ write(chunk, _encoding, callback) { if (!muted) process.stdout.write(chunk); callback(); } });
const prompt = createInterface({ input: process.stdin, output, terminal: true });
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
try {
  const name = z.string().trim().min(1).max(200).parse(await prompt.question(`${role} name: `));
  const email = z.email().parse((await prompt.question("Email: ")).trim().toLowerCase());
  const passwordPromise = prompt.question("Password (14+ characters, hidden): ");
  muted = true; const password = await passwordPromise; muted = false; process.stdout.write("\n");
  if (password.length < 14 || Buffer.byteLength(password, "utf8") > 72) throw new Error("Password must be at least 14 characters and at most 72 UTF-8 bytes.");
  const confirmPromise = prompt.question("Confirm password (hidden): ");
  muted = true; const confirmation = await confirmPromise; muted = false; process.stdout.write("\n");
  if (password !== confirmation) throw new Error("Passwords do not match.");
  const passwordHash = await hash(password, 12);
  const rows = await sql`insert into users (name, email, password_hash, role) values (${name}, ${email}, ${passwordHash}, ${role}) on conflict (email) do nothing returning id`;
  console.log(rows.length ? `${role} account created. You can now sign in to Acidic.` : "An account already exists for this email. It has not been modified.");
} catch (error) {
  muted = false;
  console.error(error instanceof z.ZodError ? "Check the entered name, email and role." : ["Password must be at least 14 characters and at most 72 UTF-8 bytes.", "Passwords do not match."].includes(error?.message) ? error.message : "Could not create the account. Check the database connection and apply migrations first.");
  process.exitCode = 1;
} finally { prompt.close(); await sql.end(); }
