-- drive-photo-library D1 schema (free tier).
-- Sessions: the browser holds only the session cookie; no Google token is
-- ever shipped to the browser.
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);

-- One row (id = 'default') for this single-user app. Tokens are AES-GCM
-- encrypted with a key derived from GOOGLE_CLIENT_SECRET before storage.
CREATE TABLE IF NOT EXISTS drive_tokens (
  id TEXT PRIMARY KEY,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);

-- One-time OAuth state values, deleted after the callback consumes them.
CREATE TABLE IF NOT EXISTS oauth_states (
  state TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL
);
