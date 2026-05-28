import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const skipValue = process.env.SEATFLOW_SKIP_AUTO_PUSH;

if (skipValue === "1" || skipValue === "true") {
  console.log("[auto-push] Übersprungen, weil SEATFLOW_SKIP_AUTO_PUSH gesetzt ist.");
  process.exit(0);
}

const git = resolveGitBinary();
const branch = runGit(["rev-parse", "--abbrev-ref", "HEAD"], { capture: true }).stdout.trim();

if (!branch || branch === "HEAD") {
  console.error("[auto-push] Kein aktiver Branch gefunden. Push wird abgebrochen.");
  process.exit(1);
}

runGit(["remote", "get-url", "origin"], { capture: true });

const statusBefore = runGit(["status", "--porcelain"], { capture: true }).stdout.trim();

if (statusBefore.length > 0) {
  runGit(["add", "-A"]);

  const diffResult = spawnSync(git, ["diff", "--cached", "--quiet"], {
    cwd: process.cwd(),
    stdio: "ignore"
  });

  if (diffResult.status === 1) {
    const message = process.env.SEATFLOW_AUTO_PUSH_MESSAGE ?? "chore: auto-push nach erfolgreichem build";
    runGit(["commit", "-m", message]);
  }
}

runGit(["push", "-u", "origin", branch]);
console.log(`[auto-push] Build erfolgreich gepusht nach origin/${branch}.`);

function resolveGitBinary() {
  const direct = spawnSync("git", ["--version"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  if (direct.status === 0) {
    return "git";
  }

  const windowsGit = "C:\\Program Files\\Git\\cmd\\git.exe";
  if (existsSync(windowsGit)) {
    return windowsGit;
  }

  console.error("[auto-push] Git wurde nicht gefunden.");
  process.exit(1);
}

function runGit(args, options = {}) {
  const result = spawnSync(git, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit"
  });

  if (result.status !== 0) {
    const command = `git ${args.join(" ")}`;
    const stderr = result.stderr?.trim();
    console.error(`[auto-push] Fehler bei: ${command}`);
    if (stderr) {
      console.error(stderr);
    }
    process.exit(result.status ?? 1);
  }

  return result;
}
