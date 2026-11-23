/** Minimal Pages Functions / D1 shapes, so the backend does not depend on
 *  @cloudflare/workers-types. Cloudflare supplies the real objects at runtime. */

export interface D1PreparedStatement {
  bind(...args: unknown[]): D1PreparedStatement;
  first<T>(): Promise<T | null>;
  run(): Promise<unknown>;
  all<T>(): Promise<{ results: T[] }>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

export interface Env {
  DB: D1Database;
  APP_USER?: string;
  APP_PASS?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  DRIVE_ROOT_FOLDER_ID?: string;
}

export interface Breadcrumb {
  id: string;
  name: string;
}

export interface DriveFolderOut {
  id: string;
  name: string;
  parentId?: string;
  itemCount?: number;
  syncStatus: "not-sync" | "synced" | "unknown";
}

export interface PagesContext {
  request: Request;
  env: Env;
  params: Record<string, string | string[]>;
}

export type Handler = (context: PagesContext) => Promise<Response> | Response;
