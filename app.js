require("dotenv/config");
require("tsx/cjs");

const { startPleskServer } = require("./apps/api/src/plesk-server.ts");

startPleskServer().catch((error) => {
  console.error("[SeatFlow] Fataler Startfehler:", error);
  process.exit(1);
});
