// Helper script to create a user in Cloudflare D1 via CLI
// Usage: node scripts/create-user.mjs <username> <password> [role]

import crypto from "node:crypto";
import { execSync } from "node:child_process";

const [username, password, role = "user"] = process.argv.slice(2);

if (!username || !password) {
  console.log("Usage: node scripts/create-user.mjs <username> <password> [role]");
  console.log("Example: node scripts/create-user.mjs alice secret123 admin");
  process.exit(1);
}

const saltBytes = crypto.randomBytes(16);
const salt = saltBytes.toString("hex");

const keyMaterial = await crypto.subtle.importKey(
  "raw",
  Buffer.from(password),
  { name: "PBKDF2" },
  false,
  ["deriveBits"]
);

const derivedBits = await crypto.subtle.deriveBits(
  {
    name: "PBKDF2",
    salt: saltBytes,
    iterations: 100000,
    hash: "SHA-256",
  },
  keyMaterial,
  256
);

const hash = Buffer.from(derivedBits).toString("hex");
const now = Math.floor(Date.now() / 1000);
const cleanRole = role === "admin" ? "admin" : "user";
const cleanUser = username.trim().replace(/'/g, "''");

const sql = `INSERT INTO users (username, password_hash, salt, role, created_at) VALUES ('${cleanUser}', '${hash}', '${salt}', '${cleanRole}', ${now}) ON CONFLICT(username) DO UPDATE SET password_hash = excluded.password_hash, salt = excluded.salt, role = excluded.role;`;

console.log(`Executing user registration in D1 for '${username}' (${cleanRole})...`);
try {
  execSync(`npx wrangler d1 execute drive-photo-library-db --remote --command "${sql}"`, { stdio: "inherit" });
  console.log(`\nSuccessfully created/updated user '${username}' in D1!`);
} catch (err) {
  console.error("Failed to execute D1 command:", err.message);
}
