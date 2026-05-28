import fastifyStatic from "@fastify/static";
import { createRepositories } from "@seatflow/repositories";
import Fastify from "fastify";
import next from "next";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "./config";
import { registerApiRoutes } from "./routes";

export async function startPleskServer() {
  const config = loadConfig();
  const repositories = createRepositories(config.repositories);
  const server = Fastify({ logger: true });
  const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
  const webDir = join(rootDir, "apps", "web");
  const nextApp = next({ dev: false, dir: webDir });
  const nextHandler = nextApp.getRequestHandler();

  await server.register(fastifyStatic, {
    root: config.publicDir,
    prefix: "/"
  });
  await registerApiRoutes(server, repositories, config);
  await nextApp.prepare();

  server.setNotFoundHandler(async (request, reply) => {
    reply.hijack();
    await nextHandler(request.raw, reply.raw);
  });

  await server.listen({ port: config.port, host: "0.0.0.0" });
}
