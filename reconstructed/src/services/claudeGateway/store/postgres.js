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
function getSslMode(e) {
  return "sslMode" in e.options ? e.options.sslMode : undefined;
}
//@ chunk-1ny7cxrt.js:1515048-1515074 placement
/**
 * 清理过期审计/身份数据的定时间隔（1 小时）。
 */
var KV_SWEEP_INTERVAL_MS = 30000;
var RETENTION_SWEEP_INTERVAL_MS = 3600000;
//@ chunk-1ny7cxrt.js:1515074-1517664 placement
async function openGatewayPostgres(postgresUrl, t) {
  if (typeof Bun === "undefined") throw Error("claude gateway requires the native binary");
  let n = false;
  let o = () => n;
  let r = {
    connectionTimeout: t?.connectTimeoutSeconds ?? 5,
    max: t?.maxConnections ?? 5,
    ...(t?.username !== undefined && {
      username: t.username,
    }),
    ...(t?.password !== undefined && {
      password: t.password,
    }),
    onclose: (y) => {
      if (y && n) gatewayLog("warn", `postgres connection closed: ${y.message}`);
    },
  };
  let { SQL } = globalThis.Bun;
  let a = new SQL(postgresUrl, r);
  let l = new SQL(postgresUrl, {
    ...r,
    tls: {
      ca: getNativeCaBlocks(),
    },
  });
  let sslMode = getSslMode(a);
  if (sslMode === undefined)
    throw Error(
      "store: this build cannot tell which sslmode store.postgres_url asks for, so it cannot tell how to verify the database. This is a fault in the build, not in the configuration: use another release of Claude Code",
    );
  let u = sslMode === getSslMode(l) ? l : a;
  try {
    await runGatewayMigrations(u);
  } catch (error) {
    u.close({
      timeout: 0,
    }).catch(() => {});
    throw error;
  }
  n = true;
  u`SHOW server_version_num`
    .then((y) => {
      let b = postgresVersionWarning(Number(y[0]?.server_version_num));
      if (n && b !== undefined) gatewayLog("warn", b);
    })
    .catch(() => {});
  let interval = setInterval(sweepExpiredKv, KV_SWEEP_INTERVAL_MS, u, o);
  interval.unref?.();
  let h = {
    auditRetentionDays: t?.auditRetentionDays,
    spendRetentionMonths: t?.spendRetentionMonths,
    identityRetentionDays: t?.identityRetentionDays,
  };
  sweepRetention(u, h, o);
  let interval_2 = setInterval(sweepRetention, RETENTION_SWEEP_INTERVAL_MS, u, h, o);
  interval_2.unref?.();
  return {
    sql: u,
    async set(y, b, w) {
      await u`
        INSERT INTO kv (key, value, expires_at)
        VALUES (${y}, ${b}, now() + make_interval(secs => ${w}))
        ON CONFLICT (key) DO UPDATE
        SET value = ${b}, expires_at = now() + make_interval(secs => ${w})
      `;
    },
    async get(y) {
      let b = await u`
        SELECT value FROM kv
        WHERE key = ${y} AND (expires_at IS NULL OR expires_at > now())
      `;
      return b.length > 0 ? b[0].value : null;
    },
    async setIfUnchanged(y, b, w, S) {
      return (
        (
          await u`
        UPDATE kv
        SET value = ${w}, expires_at = now() + make_interval(secs => ${S})
        WHERE key = ${y} AND value = ${b}
          AND (expires_at IS NULL OR expires_at > now())
        RETURNING key
      `
        ).length > 0
      );
    },
    async del(y) {
      await u`DELETE FROM kv WHERE key = ${y}`;
    },
    async incr(y, b) {
      let w = await u`
        INSERT INTO kv (key, value, expires_at)
        VALUES (${y}, '1', now() + make_interval(secs => ${b}))
        ON CONFLICT (key) DO UPDATE SET
          value = CASE
            WHEN kv.expires_at IS NOT NULL AND kv.expires_at <= now() THEN '1'
            ELSE (kv.value::bigint + 1)::text
          END,
          expires_at = CASE
            WHEN kv.expires_at IS NOT NULL AND kv.expires_at <= now()
              THEN now() + make_interval(secs => ${b})
            ELSE kv.expires_at
          END
        RETURNING value
      `;
      return Number(w[0].value);
    },
    close() {
      n = false;
      clearInterval(interval);
      clearInterval(interval_2);
      u.close().catch(() => {});
    },
  };
}
//@ chunk-1ny7cxrt.js:1517664-1517862 placement
/**
 * Postgres 版本低于 11 时的警告文本。
 */
function postgresVersionWarning(e) {
  if (!Number.isFinite(e) || e >= 110000) return;
  let floored = Math.floor(e / 1e4);
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
function sweepExpiredKv(e, t) {
  e`DELETE FROM kv WHERE expires_at IS NOT NULL AND expires_at <= now()`.catch((error) => {
    if (t()) {
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
function sweepRetention(e, t, n = () => true) {
  let o = (l, c) =>
    void (async () => {
      for (let j = 0; j < 50 && n(); j++)
        if (
          (
            await e.begin(async (h) => {
              await h`SET LOCAL statement_timeout = '30s'`;
              return c(h);
            })
          ).length < SWEEP_BATCH_ROWS
        )
          return;
    })().catch((error) => {
      if (n()) reportSweepFailure(l, error);
    });
  let auditRetentionDays = t?.auditRetentionDays ?? DEFAULT_AUDIT_RETENTION_DAYS;
  o(
    "admin_audit",
    (l) => l`DELETE FROM admin_audit WHERE ctid = ANY(ARRAY(
        SELECT ctid FROM admin_audit
        WHERE at < now() - make_interval(days => ${auditRetentionDays})
        LIMIT ${SWEEP_BATCH_ROWS}
      )) RETURNING 1`,
  );
  let spendRetentionMonths = t?.spendRetentionMonths ?? DEFAULT_SPEND_RETENTION_MONTHS;
  o(
    "spend",
    (l) => l`DELETE FROM spend WHERE ctid = ANY(ARRAY(
        SELECT ctid FROM spend
        WHERE updated_at < now() - make_interval(months => ${spendRetentionMonths})
        LIMIT ${SWEEP_BATCH_ROWS}
      )) AND updated_at < now() - make_interval(months => ${spendRetentionMonths})
      RETURNING 1`,
  );
  o(
    "pooled_spend",
    (l) => l`DELETE FROM pooled_spend WHERE ctid = ANY(ARRAY(
        SELECT ctid FROM pooled_spend
        WHERE updated_at < now() - make_interval(months => ${spendRetentionMonths})
        LIMIT ${SWEEP_BATCH_ROWS}
      )) AND updated_at < now() - make_interval(months => ${spendRetentionMonths})
      RETURNING 1`,
  );
  let identityRetentionDays = t?.identityRetentionDays ?? DEFAULT_IDENTITY_RETENTION_DAYS;
  o(
    "principal_emails",
    (l) => l`DELETE FROM principal_emails WHERE ctid = ANY(ARRAY(
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
function reportSweepFailure(e, error) {
  if (pgErrorCode(error) === "42501") {
    if (claimOnce().claim(`gateway_sweep_denied:${e}`))
      gatewayLog(
        "warn",
        `${e} retention sweep failed: the database role lacks DELETE on ${e} \u2014 grant it (see the docs' restricted-role grant list) or rows will outlive their retention window. Warning once.`,
      );
    return;
  }
  gatewayLog("warn", `${e} cleanup failed: ${errorMessage(error)}`);
}
//@ chunk-1ny7cxrt.js:1520090-1520257 placement
/**
 * 取 Postgres 错误码（errno 或 code）。
 */
function pgErrorCode(e) {
  if (typeof e === "object" && e !== null) {
    if ("errno" in e && typeof e.errno === "string") return e.errno;
    if ("code" in e && typeof e.code === "string") return e.code;
  }
  return;
}
export { openGatewayPostgres };
