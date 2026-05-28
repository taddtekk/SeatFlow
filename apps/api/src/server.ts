import cors from "@fastify/cors";
import Fastify from "fastify";
import { registerApiRoutes } from "./routes";

const server = Fastify({ logger: true });

await server.register(cors, {
  origin: true
});

await registerApiRoutes(server);

const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? "0.0.0.0";

await server.listen({ port, host });
