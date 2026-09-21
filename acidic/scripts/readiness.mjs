// Is this installation ready for the mode it is set to? Prints one line per check.
const results = [];
const report = (level, check, detail) => results.push({ level, check, detail });
const live = process.env.ACIDIC_MODE === "live";
const nodeMajor = Number(process.versions.node.split(".")[0]);
report([22, 24].includes(nodeMajor) ? "OK" : "WARN", "Node.js", `${process.versions.node}; use Node 22 or 24`);
report(live ? "OK" : "WARN", "Mode", live ? "live records requested" : "preview mode; real records remain disabled");
for (const [name, required] of [["DATABASE_URL", live], ["AUTH_SECRET", live], ["APP_URL", live], ["AUTH_URL", live], ["ACIDIC_LEGAL_NAME", false], ["ACIDIC_ABN", false]]) {
  const present = Boolean(process.env[name]?.trim());
  report(present ? "OK" : required ? "ERROR" : "WARN", name, present ? "configured" : required ? "required for live mode" : "not configured yet");
}
if ((process.env.AUTH_SECRET?.length ?? 0) > 0 && (process.env.AUTH_SECRET?.length ?? 0) < 32) report("ERROR", "AUTH_SECRET", "must be at least 32 characters");
if (process.env.APP_URL && process.env.AUTH_URL && process.env.APP_URL !== process.env.AUTH_URL) report("ERROR", "APP_URL / AUTH_URL", "must be the same exact origin");
console.log("Acidic readiness\n");
for (const item of results) console.log(`${item.level.padEnd(5)} ${item.check}: ${item.detail}`);
const errors = results.filter((item) => item.level === "ERROR").length;
console.log(`\n${errors ? `${errors} blocking issue${errors === 1 ? "" : "s"}` : "No blocking issues for the selected mode"}.`);
process.exitCode = errors ? 1 : 0;
