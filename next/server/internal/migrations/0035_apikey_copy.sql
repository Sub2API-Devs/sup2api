-- Keep authentication hashes and optionally retain encrypted keys for explicit copy.
-- Older hash-only keys cannot be reconstructed.
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS key_cipher bytea;
