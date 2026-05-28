import type { RepositoryConfig } from "@seatflow/types";
import { resolve } from "node:path";

export interface AppConfig {
  nodeEnv: string;
  port: number;
  appBaseUrl: string;
  publicDir: string;
  exportDir: string;
  repositories: RepositoryConfig;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const storageDriver = env.STORAGE_DRIVER === "mariadb" ? "mariadb" : "memory";
  const database: NonNullable<AppConfig["repositories"]["database"]> = {
    port: Number(env.DATABASE_PORT ?? 3306),
    ssl: env.DATABASE_SSL === "true",
    ...(env.DATABASE_HOST ? { host: env.DATABASE_HOST } : {}),
    ...(env.DATABASE_NAME ? { name: env.DATABASE_NAME } : {}),
    ...(env.DATABASE_USER ? { user: env.DATABASE_USER } : {}),
    ...(env.DATABASE_PASSWORD ? { password: env.DATABASE_PASSWORD } : {})
  };
  return {
    nodeEnv: env.NODE_ENV ?? "development",
    port: Number(env.PORT ?? 3000),
    appBaseUrl: env.APP_BASE_URL ?? `http://localhost:${env.PORT ?? 3000}`,
    publicDir: resolve(env.PUBLIC_DIR ?? "./public"),
    exportDir: resolve(env.EXPORT_DIR ?? "./public/exports"),
    repositories: {
      storageDriver,
      database
    }
  };
}
