import { hashPassword, verifyPassword } from "./crypto";
import type { D1Database } from "./types";

export interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  salt: string;
  role: string;
  created_at: number;
}

export interface UserSummary {
  id: number;
  username: string;
  role: string;
  createdAt: number;
}

export async function findUserByUsername(
  db: D1Database,
  username: string,
): Promise<UserRow | null> {
  if (!username.trim()) return null;
  return db
    .prepare(
      "SELECT id, username, password_hash, salt, role, created_at FROM users WHERE username = ? COLLATE NOCASE",
    )
    .bind(username.trim())
    .first<UserRow>();
}

export async function hasAnyUsers(db: D1Database): Promise<boolean> {
  const row = await db.prepare("SELECT COUNT(*) as count FROM users").first<{ count: number }>();
  return (row?.count ?? 0) > 0;
}

export async function countAdminUsers(db: D1Database): Promise<number> {
  const row = await db
    .prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'")
    .first<{ count: number }>();
  return row?.count ?? 0;
}

export async function listUsers(db: D1Database): Promise<UserSummary[]> {
  const { results } = await db
    .prepare("SELECT id, username, role, created_at FROM users ORDER BY created_at ASC")
    .all<{ id: number; username: string; role: string; created_at: number }>();
  return (results ?? []).map((u) => ({
    id: u.id,
    username: u.username,
    role: u.role,
    createdAt: u.created_at,
  }));
}

export async function createUser(
  db: D1Database,
  username: string,
  pass: string,
  role: string = "user",
): Promise<UserSummary> {
  const cleanUser = username.trim();
  const cleanPass = pass.trim();
  if (cleanUser.length < 2) throw new Error("Username must be at least 2 characters.");
  if (cleanPass.length < 6) throw new Error("Password must be at least 6 characters.");
  const cleanRole = role === "admin" ? "admin" : "user";

  const { hash, salt } = await hashPassword(cleanPass);
  const now = Math.floor(Date.now() / 1000);

  const res = (await db
    .prepare(
      "INSERT INTO users (username, password_hash, salt, role, created_at) VALUES (?, ?, ?, ?, ?)",
    )
    .bind(cleanUser, hash, salt, cleanRole, now)
    .run()) as { meta?: { last_row_id?: number } };

  const id = res?.meta?.last_row_id ?? 0;
  return {
    id,
    username: cleanUser,
    role: cleanRole,
    createdAt: now,
  };
}

export async function deleteUser(db: D1Database, id: number): Promise<boolean> {
  const user = await db
    .prepare("SELECT id, role FROM users WHERE id = ?")
    .bind(id)
    .first<{ id: number; role: string }>();

  if (!user) return false;

  if (user.role === "admin") {
    const adminCount = await countAdminUsers(db);
    if (adminCount <= 1) {
      throw new Error("Cannot delete the only admin user.");
    }
  }

  await db.prepare("DELETE FROM users WHERE id = ?").bind(id).run();
  return true;
}

export async function updateUserPassword(
  db: D1Database,
  username: string,
  newPass: string,
): Promise<boolean> {
  const cleanPass = newPass.trim();
  if (cleanPass.length < 6) throw new Error("New password must be at least 6 characters.");

  const { hash, salt } = await hashPassword(cleanPass);
  await db
    .prepare("UPDATE users SET password_hash = ?, salt = ? WHERE username = ? COLLATE NOCASE")
    .bind(hash, salt, username.trim())
    .run();
  return true;
}
