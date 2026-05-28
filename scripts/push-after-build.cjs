const { execFileSync } = require("node:child_process");

function run(command, args, options = {}) {
  const output = execFileSync(command, args, {
    encoding: "utf8",
    stdio: options.stdio ?? "pipe"
  });
  return typeof output === "string" ? output.trim() : "";
}

function log(message) {
  console.log(`[auto-push] ${message}`);
}

if (process.env.AUTO_PUSH_AFTER_BUILD === "false") {
  log("Uebersprungen, weil AUTO_PUSH_AFTER_BUILD=false gesetzt ist.");
  process.exit(0);
}

try {
  run("git", ["rev-parse", "--is-inside-work-tree"]);
} catch {
  log("Kein Git-Repository gefunden. Push wird uebersprungen.");
  process.exit(0);
}

let branch;
try {
  branch = run("git", ["branch", "--show-current"]);
} catch (error) {
  console.error("[auto-push] Branch konnte nicht ermittelt werden.");
  throw error;
}

if (!branch) {
  log("Detached HEAD erkannt. Push wird uebersprungen.");
  process.exit(0);
}

try {
  run("git", ["remote", "get-url", "origin"]);
} catch {
  log("Remote origin fehlt. Push wird uebersprungen.");
  process.exit(0);
}

run("git", ["add", "-A"], { stdio: "inherit" });

const status = run("git", ["status", "--porcelain"]);
if (status) {
  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  run("git", ["commit", "-m", `chore: automated build snapshot ${timestamp}`], { stdio: "inherit" });
} else {
  log("Keine lokalen Aenderungen zum Committen.");
}

run("git", ["push", "-u", "origin", branch], { stdio: "inherit" });
log(`Branch ${branch} wurde zu origin gepusht.`);
