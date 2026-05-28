const { execSync } = require("node:child_process");

const steps = [
  "npm run build -w @seatflow/types",
  "npm run build -w @seatflow/geometry",
  "npm run build -w @seatflow/planner-core",
  "npm run build -w @seatflow/rules",
  "npm run build -w @seatflow/repositories",
  "npm run build -w @seatflow/export",
  "npm run build -w @seatflow/api",
  "npm run build -w @seatflow/web"
];

for (const command of steps) {
  execSync(command, { stdio: "inherit", shell: true });
}
