/**
 * services/claudeGateway/store/migrations.ts
 *
 * 2.1.316 新增：网关 Postgres 存储迁移
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-1hnjmk23.js (1)
 * attribution: placement 1
 */
import { gatewayLog } from "../../gateway/gatewayBanner.js";

//@ chunk-1hnjmk23.js:1425722-1431885 placement
/**
 * 获取 Postgres advisory 锁后执行网关存储迁移。
 */
async function runGatewayMigrations(pool) {
  let client = await pool.reserve();
  try {
    gatewayLog(
      "info",
      "waiting for migration lock (another replica may be migrating; check pg_locks for key 6775156 if this persists)",
    );
    await client`SELECT pg_advisory_lock(6775156)`;
    try {
      await client`CREATE TABLE IF NOT EXISTS _migrations (
        version    INTEGER PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
      let maxVersion = await client`SELECT coalesce(max(version), 0) AS v FROM _migrations`;
      let version = Number(maxVersion[0].v);
      while (true) {
        version += 1;
        let applied = false;
        await client.begin(async (tx) => {
          switch (version) {
            case 1:
              await tx`CREATE TABLE kv (
                key        TEXT PRIMARY KEY,
                value      TEXT NOT NULL,
                expires_at TIMESTAMPTZ
              )`;
              await tx`CREATE INDEX kv_expires_at ON kv (expires_at)
                       WHERE expires_at IS NOT NULL`;
              break;
            case 2:
              await tx`CREATE TABLE spend_limits (
                id          TEXT PRIMARY KEY,
                scope_type  TEXT NOT NULL
                            CHECK (scope_type IN ('user', 'rbac_group', 'organization')),
                scope_id    TEXT NOT NULL DEFAULT '',
                amount      BIGINT,
                period      TEXT NOT NULL DEFAULT 'monthly'
                            CHECK (period IN ('daily', 'weekly', 'monthly')),
                currency    TEXT NOT NULL DEFAULT 'USD'
                            CHECK (currency = 'USD'),
                created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
                created_by  TEXT
              )`;
              await tx`CREATE UNIQUE INDEX spend_limits_scope
                       ON spend_limits (scope_type, scope_id, period)`;
              await tx`
                CREATE OR REPLACE FUNCTION caps_by_period(p_principal text, p_groups text[], p_mode text)
                RETURNS TABLE(period text, amount bigint, scope_type text, scope_id text, id text)
                LANGUAGE sql STABLE AS $$
                  SELECT DISTINCT ON (period) period, amount, scope_type, scope_id, id
                  FROM spend_limits
                  WHERE (scope_type = 'user' AND scope_id = p_principal)
                     OR (scope_type = 'rbac_group' AND scope_id = ANY(p_groups))
                     OR scope_type = 'organization'
                  -- The sort order IS the precedence (DISTINCT ON keeps the
                  -- first row). User beats group beats org. Within that, the
                  -- boolean-equals on the next line isn't a typo: it sorts a
                  -- real cap ahead of "unlimited" when mode is 'min', and the
                  -- other way for 'max' (or anything else). Then the smallest
                  -- or largest group cap wins.
                  ORDER BY period,
                    CASE scope_type WHEN 'user' THEN 0 WHEN 'rbac_group' THEN 1 ELSE 2 END,
                    (amount IS NULL) = (p_mode = 'min'),
                    CASE WHEN scope_type = 'rbac_group'
                         THEN CASE WHEN p_mode = 'min' THEN amount ELSE -amount END END,
                    id
                $$`;
              break;
            case 3:
              await tx`CREATE TABLE admin_audit (
                id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                at      TIMESTAMPTZ NOT NULL DEFAULT now(),
                actor   TEXT NOT NULL,
                action  TEXT NOT NULL,
                target  TEXT NOT NULL,
                before  JSONB,
                after   JSONB,
                reason  TEXT
              )`;
              await tx`CREATE INDEX admin_audit_at ON admin_audit (at)`;
              break;
            case 4:
              await tx`CREATE TABLE spend (
                principal  TEXT NOT NULL,
                period     TEXT NOT NULL,  -- bucket key: YYYY-MM | YYYY-MM-DD | YYYY-Www
                cents      DOUBLE PRECISION NOT NULL DEFAULT 0,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                PRIMARY KEY (principal, period)
              )`;
              await tx`CREATE INDEX spend_updated_at ON spend (updated_at)`;
              break;
            case 5:
              await tx`CREATE TABLE principal_emails (
                principal  TEXT PRIMARY KEY,
                email      TEXT,
                name       TEXT,
                groups     JSONB,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
              )`;
              await tx`CREATE INDEX principal_emails_updated_at ON principal_emails (updated_at)`;
              break;
            case 6:
              await tx`CREATE INDEX spend_period_cents
                       ON spend (period, cents DESC, principal)`;
              break;
            case 7:
              await tx`SET LOCAL lock_timeout = '1s'`;
              await tx`ALTER TABLE spend_limits
                ADD COLUMN pooled_limit_enabled BOOLEAN NOT NULL DEFAULT false,
                ADD COLUMN pooled_monthly_credit_limit BIGINT,
                ADD CONSTRAINT spend_limits_pooled_requires_limit
                  CHECK (NOT pooled_limit_enabled OR pooled_monthly_credit_limit IS NOT NULL),
                ADD CONSTRAINT spend_limits_pooled_amount_requires_group
                  CHECK (pooled_monthly_credit_limit IS NULL
                         OR (scope_type = 'rbac_group' AND period = 'monthly'))`.catch((error) => {
                if (error instanceof Error && "errno" in error && error.errno === "55P03")
                  gatewayLog(
                    "error",
                    "migration 7 could not lock the spend_limits table within 1s: another session holds a lock on it (a backup, a long query, or a session idle in a transaction; see pg_locks). Nothing was changed. Start the gateway again once the lock is gone",
                  );
                throw error;
              });
              await tx`CREATE TABLE pooled_spend (
                rbac_group_id TEXT NOT NULL,
                period        TEXT NOT NULL,  -- YYYY-MM
                cents         DOUBLE PRECISION NOT NULL DEFAULT 0,
                updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
                PRIMARY KEY (rbac_group_id, period)
              )`;
              break;
            case 8:
              await tx`CREATE TABLE principal_groups (
                day        TEXT NOT NULL,  -- YYYY-MM-DD
                principal  TEXT NOT NULL,
                groups     JSONB NOT NULL,
                PRIMARY KEY (day, principal)
              )`;
              break;
            default:
              return;
          }
          await tx`INSERT INTO _migrations (version) VALUES (${version})`;
          applied = true;
        });
        if (!applied) break;
        gatewayLog("info", `migration ${version} applied`);
      }
    } finally {
      await client`SELECT pg_advisory_unlock(6775156)`;
    }
  } finally {
    client.release();
  }
}
export { runGatewayMigrations };
