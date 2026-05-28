require("dotenv/config");

const { startPleskServer } = require("./apps/api/dist/plesk-server.js");

startPleskServer().catch((error) => {
  console.error("[SeatFlow] Fataler Startfehler:", error);
  process.exit(1);
});
