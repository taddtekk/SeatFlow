import cors from "@fastify/cors";
import Fastify from "fastify";
import next from "next";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { registerApiRoutes } from "../apps/api/src/routes";

const currentDir = dirname(fileURLToPath(import.meta.url));
const rootDir = join(currentDir, "..");
const webDir = join(rootDir, "apps", "web");
const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";

const nextApp = next({
  dev: false,
  dir: webDir
});
const nextHandler = nextApp.getRequestHandler();

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

async function main() {
  await nextApp.prepare();

  const server = Fastify({ logger: true });

  await server.register(cors, {
    origin: true
  });

  await registerApiRoutes(server);
  await registerApiRoutes(server, "/api");

  server.setNotFoundHandler(async (request, reply) => {
    reply.hijack();
    await nextHandler(request.raw, reply.raw);
  });

  await server.listen({ port, host });
}
