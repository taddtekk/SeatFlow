import { spawnSync } from "node:child_process";

const packagePaths = [
  "packages/types",
  "packages/ui",
  "packages/geometry",
  "packages/planner-core",
  "packages/rules",
  "apps/api",
  "apps/web"
];

export function runWorkspaceScript(scriptName) {
  for (const packagePath of packagePaths) {
    const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
    let result = spawnSync(npmCommand, ["run", scriptName, "--prefix", packagePath], {
      cwd: process.cwd(),
      stdio: "inherit"
    });

    if (result.error) {
      result = spawnSync("npm", ["run", scriptName, "--prefix", packagePath], {
        cwd: process.cwd(),
        stdio: "inherit",
        shell: true
      });
    }

    if (result.status !== 0) {
      process.exit(result.status ?? 1);
    }
  }
}
