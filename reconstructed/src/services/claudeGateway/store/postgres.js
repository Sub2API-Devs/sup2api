/**
 * services/claudeGateway/store/postgres.ts
 *
 * 2.1.316 新增：网关 Postgres 存储
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1ny7cxrt.js (9)
 * attribution: placement 9
 */
import { gatewayLog } from "../../gateway/gatewayBanner.js";
import { getNativeCaBlocks } from "../network.js";
import { runGatewayMigrations } from "./migrations.js";
import { errorMessage } from "../../../utils/errors.js";
import { claimOnce } from "../../api/verificationRequired.js";

//@ chunk-1ny7cxrt.js:1514980-1515048 placement
/**
 * 取连接串里的 sslMode 选项（没有返回 undefined）。
 */
function getSslMode(pool) {
  return "sslMode" in pool.options ? pool.options.sslMode : undefined;
}
//@ chunk-1ny7cxrt.js:1515048-1515074 placement
/**
 * 清理过期审计/身份数据的定时间隔（1 小时）。
 */
var KV_SWEEP_INTERVAL_MS = 30000;
var RETENTION_SWEEP_INTERVAL_MS = 3600000;
//@ chunk-1ny7cxrt.js:1515074-1517664 placement
async function openGatewayPostgres(postgresUrl, options) {
  if (typeof Bun === "undefined") throw Error("claude gateway requires the native binary");
  let isActive = false;
  let activeGetter = () => isActive;
  let poolOptions = {
    connectionTimeout: options?.connectTimeoutSeconds ?? 5,
    max: options?.maxConnections ?? 5,
    ...(options?.username !== undefined && {
      username: options.username,
    }),
    ...(options?.password !== undefined && {
      password: options.password,
    }),
    onclose: (closeError) => {
      if (closeError && isActive) gatewayLog("warn", `postgres connection closed: ${closeError.message}`);
    },
  };
  let { SQL } = globalThis.Bun;
  let plainSql = new SQL(postgresUrl, poolOptions);
  let tlsSql = new SQL(postgresUrl, {
    ...poolOptions,
    tls: {
      ca: getNativeCaBlocks(),
    },
  });
  let sslMode = getSslMode(plainSql);
  if (sslMode === undefined)
    throw Error(
      "store: this build cannot tell which sslmode store.postgres_url asks for, so it cannot tell how to verify the database. This is a fault in the build, not in the configuration: use another release of Claude Code",
    );
  let sql = sslMode === getSslMode(tlsSql) ? tlsSql : plainSql;
  try {
    await runGatewayMigrations(sql);
  } catch (error) {
    sql
      .close({
        timeout: 0,
      })
      .catch(() => {});
    throw error;
  }
  isActive = true;
  sql`SHOW server_version_num`
    .then((versionRow) => {
      let warning = postgresVersionWarning(Number(versionRow[0]?.server_version_num));
      if (isActive && warning !== undefined) gatewayLog("warn", warning);
    })
    .catch(() => {});
  let interval = setInterval(sweepExpiredKv, KV_SWEEP_INTERVAL_MS, sql, activeGetter);
  interval.unref?.();
  let retentionConfig = {
    auditRetentionDays: options?.auditRetentionDays,
    spendRetentionMonths: options?.spendRetentionMonths,
    identityRetentionDays: options?.identityRetentionDays,
  };
  sweepRetention(sql, retentionConfig, activeGetter);
  let interval_2 = setInterval(
    sweepRetention,
    RETENTION_SWEEP_INTERVAL_MS,
    sql,
    retentionConfig,
    activeGetter,
  );
  interval_2.unref?.();
  return {
    sql,
    async set(key, value, ttlSeconds) {
      await sql`
        INSERT INTO kv (key, value, expires_at)
        VALUES (${key}, ${value}, now() + make_interval(secs => ${ttlSeconds}))
        ON CONFLICT (key) DO UPDATE
        SET value = ${value}, expires_at = now() + make_interval(secs => ${ttlSeconds})
      `;
    },
    async get(lookupKey) {
      let rows = await sql`
        SELECT value FROM kv
        WHERE key = ${lookupKey} AND (expires_at IS NULL OR expires_at > now())
      `;
      return rows.length > 0 ? rows[0].value : null;
    },
    async setIfUnchanged(key, expectedValue, nextValue, ttlSeconds) {
      return (
        (
          await sql`
        UPDATE kv
        SET value = ${nextValue}, expires_at = now() + make_interval(secs => ${ttlSeconds})
        WHERE key = ${key} AND value = ${expectedValue}
          AND (expires_at IS NULL OR expires_at > now())
        RETURNING key
      `
        ).length > 0
      );
    },
    async del(deleteKey) {
      await sql`DELETE FROM kv WHERE key = ${deleteKey}`;
    },
    async incr(counterKey, ttlSeconds) {
      let rows = await sql`
        INSERT INTO kv (key, value, expires_at)
        VALUES (${counterKey}, '1', now() + make_interval(secs => ${ttlSeconds}))
        ON CONFLICT (key) DO UPDATE SET
          value = CASE
            WHEN kv.expires_at IS NOT NULL AND kv.expires_at <= now() THEN '1'
            ELSE (kv.value::bigint + 1)::text
          END,
          expires_at = CASE
            WHEN kv.expires_at IS NOT NULL AND kv.expires_at <= now()
              THEN now() + make_interval(secs => ${ttlSeconds})
            ELSE kv.expires_at
          END
        RETURNING value
      `;
      return Number(rows[0].value);
    },
    close() {
      isActive = false;
      clearInterval(interval);
      clearInterval(interval_2);
      sql.close().catch(() => {});
    },
  };
}
//@ chunk-1ny7cxrt.js:1517664-1517862 placement
/**
 * Postgres 版本低于 11 时的警告文本。
 */
function postgresVersionWarning(version) {
  if (!Number.isFinite(version) || version >= 110000) return;
  let floored = Math.floor(version / 1e4);
  return `Postgres ${floored} is below the supported floor (11) \u2014 upgrade; PostgreSQL ${floored} is past upstream end-of-life`;
}
//@ chunk-1ny7cxrt.js:1517862-1517895 placement
/**
 * 每批清理/查询的行数上限（10000）。
 */
var DEFAULT_SPEND_RETENTION_MONTHS = 13;
var DEFAULT_IDENTITY_RETENTION_DAYS = 90;
var DEFAULT_AUDIT_RETENTION_DAYS = 365;
var SWEEP_BATCH_ROWS = 1e4;
//@ chunk-1ny7cxrt.js:1517895-1518415 placement
/**
 * 删除过期 kv 行；只读库时提示无法写入。
 */
function sweepExpiredKv(sql, isPrimary) {
  sql`DELETE FROM kv WHERE expires_at IS NOT NULL AND expires_at <= now()`.catch((error) => {
    if (isPrimary()) {
      gatewayLog("warn", `kv cleanup failed: ${errorMessage(error)}`);
      if (pgErrorCode(error) === "25006")
        gatewayLog(
          "warn",
          "Postgres is read-only (a standby, or default_transaction_read_only is on), so nothing can be written: new sign-ins fail and spend is not recorded. Make Postgres accept writes, or point store.postgres_url at the node that does. If this line, logged every 30s, goes on after that, restart this gateway replica to drop its old connections",
        );
    }
  });
}
//@ chunk-1ny7cxrt.js:1518415-1519761 placement
/**
 * 按保留期分批删除过期的审计、花费、共享花费与主体身份记录。
 */
function sweepRetention(sql, options, isActive = () => true) {
  let runSweep = (table, deleteBatch) =>
    void (async () => {
      for (let j = 0; j < 50 && isActive(); j++)
        if (
          (
            await sql.begin(async (tx) => {
              await tx`SET LOCAL statement_timeout = '30s'`;
              return deleteBatch(tx);
            })
          ).length < SWEEP_BATCH_ROWS
        )
          return;
    })().catch((error) => {
      if (isActive()) reportSweepFailure(table, error);
    });
  let auditRetentionDays = options?.auditRetentionDays ?? DEFAULT_AUDIT_RETENTION_DAYS;
  runSweep(
    "admin_audit",
    (tx) => tx`DELETE FROM admin_audit WHERE ctid = ANY(ARRAY(
        SELECT ctid FROM admin_audit
        WHERE at < now() - make_interval(days => ${auditRetentionDays})
        LIMIT ${SWEEP_BATCH_ROWS}
      )) RETURNING 1`,
  );
  let spendRetentionMonths = options?.spendRetentionMonths ?? DEFAULT_SPEND_RETENTION_MONTHS;
  runSweep(
    "spend",
    (tx) => tx`DELETE FROM spend WHERE ctid = ANY(ARRAY(
        SELECT ctid FROM spend
        WHERE updated_at < now() - make_interval(months => ${spendRetentionMonths})
        LIMIT ${SWEEP_BATCH_ROWS}
      )) AND updated_at < now() - make_interval(months => ${spendRetentionMonths})
      RETURNING 1`,
  );
  runSweep(
    "pooled_spend",
    (tx) => tx`DELETE FROM pooled_spend WHERE ctid = ANY(ARRAY(
        SELECT ctid FROM pooled_spend
        WHERE updated_at < now() - make_interval(months => ${spendRetentionMonths})
        LIMIT ${SWEEP_BATCH_ROWS}
      )) AND updated_at < now() - make_interval(months => ${spendRetentionMonths})
      RETURNING 1`,
  );
  let identityRetentionDays = options?.identityRetentionDays ?? DEFAULT_IDENTITY_RETENTION_DAYS;
  runSweep(
    "principal_emails",
    (tx) => tx`DELETE FROM principal_emails WHERE ctid = ANY(ARRAY(
        SELECT ctid FROM principal_emails
        WHERE updated_at < now() - make_interval(days => ${identityRetentionDays})
        LIMIT ${SWEEP_BATCH_ROWS}
      )) AND updated_at < now() - make_interval(days => ${identityRetentionDays})
      RETURNING 1`,
  );
}
//@ chunk-1ny7cxrt.js:1519761-1520090 placement
/**
 * 清理失败日志（缺少 DELETE 权限时只警告一次）。
 */
function reportSweepFailure(key, error) {
  if (pgErrorCode(error) === "42501") {
    if (claimOnce().claim(`gateway_sweep_denied:${key}`))
      gatewayLog(
        "warn",
        `${key} retention sweep failed: the database role lacks DELETE on ${key} \u2014 grant it (see the docs' restricted-role grant list) or rows will outlive their retention window. Warning once.`,
      );
    return;
  }
  gatewayLog("warn", `${key} cleanup failed: ${errorMessage(error)}`);
}
//@ chunk-1ny7cxrt.js:1520090-1520257 placement
/**
 * 取 Postgres 错误码（errno 或 code）。
 */
function pgErrorCode(error) {
  if (typeof error === "object" && error !== null) {
    if ("errno" in error && typeof error.errno === "string") return error.errno;
    if ("code" in error && typeof error.code === "string") return error.code;
  }
  return;
}
export { openGatewayPostgres };
