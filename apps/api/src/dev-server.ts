import "dotenv/config";
import { createRepositories } from "@seatflow/repositories";
import Fastify from "fastify";
import { loadConfig } from "./config";
import { registerApiRoutes } from "./routes";

const config = loadConfig();
const devPort = process.env.PORT ? config.port : 4000;
const repositories = createRepositories(config.repositories);
const server = Fastify({ logger: true });

async function startDevServer() {
  await registerApiRoutes(server, repositories, config);
  await server.listen({ port: devPort, host: "0.0.0.0" });
}

startDevServer().catch((error) => {
  server.log.error(error);
  process.exit(1);
});
