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
import { js } from "../network.js";
import { runGatewayMigrations } from "./migrations.js";
import { errorMessage } from "../../../utils/errors.js";
import { claimOnce } from "../../api/verificationRequired.js";

//@ chunk-1ny7cxrt.js:1514980-1515048 placement
function z1(e) {
  return "sslMode" in e.options ? e.options.sslMode : void 0;
}
//@ chunk-1ny7cxrt.js:1515048-1515074 placement
var ove = 30000,
  sve = 3600000;
//@ chunk-1ny7cxrt.js:1515074-1517664 placement
async function openGatewayPostgres(e, t) {
  if (typeof Bun > "u") throw Error("claude gateway requires the native binary");
  let n = !1,
    o = () => n,
    r = {
      connectionTimeout: t?.connectTimeoutSeconds ?? 5,
      max: t?.maxConnections ?? 5,
      ...(t?.username !== void 0 && { username: t.username }),
      ...(t?.password !== void 0 && { password: t.password }),
      onclose: (y) => {
        if (y && n) gatewayLog("warn", `postgres connection closed: ${y.message}`);
      },
    },
    { SQL: SQL } = globalThis.Bun,
    a = new SQL(e, r),
    l = new SQL(e, { ...r, tls: { ca: js() } }),
    c = z1(a);
  if (c === void 0)
    throw Error(
      "store: this build cannot tell which sslmode store.postgres_url asks for, so it cannot tell how to verify the database. This is a fault in the build, not in the configuration: use another release of Claude Code",
    );
  let u = c === z1(l) ? l : a;
  try {
    await runGatewayMigrations(u);
  } catch (error) {
    throw (u.close({ timeout: 0 }).catch(() => {}), error);
  }
  ((n = !0),
    u`SHOW server_version_num`
      .then((y) => {
        let b = postgresVersionWarning(Number(y[0]?.server_version_num));
        if (n && b !== void 0) gatewayLog("warn", b);
      })
      .catch(() => {}));
  let f = setInterval(sweepExpiredKv, ove, u, o);
  f.unref?.();
  let h = {
    auditRetentionDays: t?.auditRetentionDays,
    spendRetentionMonths: t?.spendRetentionMonths,
    identityRetentionDays: t?.identityRetentionDays,
  };
  sweepRetention(u, h, o);
  let m = setInterval(sweepRetention, sve, u, h, o);
  return (
    m.unref?.(),
    {
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
        ((n = !1), clearInterval(f), clearInterval(m), u.close().catch(() => {}));
      },
    }
  );
}
/**
 * Postgres 版本低于 11 时的警告文本。
 */
//@ chunk-1ny7cxrt.js:1517664-1517862 placement
function postgresVersionWarning(e) {
  if (!Number.isFinite(e) || e >= 110000) return;
  let floored = Math.floor(e / 1e4);
  return `Postgres ${floored} is below the supported floor (11) \u2014 upgrade; PostgreSQL ${floored} is past upstream end-of-life`;
}
//@ chunk-1ny7cxrt.js:1517862-1517895 placement
var lve = 13,
  cve = 90,
  uve = 365,
  Kd = 1e4;
/**
 * 删除过期 kv 行；只读库时提示无法写入。
 */
//@ chunk-1ny7cxrt.js:1517895-1518415 placement
function sweepExpiredKv(e, t) {
  e`DELETE FROM kv WHERE expires_at IS NOT NULL AND expires_at <= now()`.catch((n) => {
    if (t()) {
      if ((gatewayLog("warn", `kv cleanup failed: ${errorMessage(n)}`), pgErrorCode(n) === "25006"))
        gatewayLog(
          "warn",
          "Postgres is read-only (a standby, or default_transaction_read_only is on), so nothing can be written: new sign-ins fail and spend is not recorded. Make Postgres accept writes, or point store.postgres_url at the node that does. If this line, logged every 30s, goes on after that, restart this gateway replica to drop its old connections",
        );
    }
  });
}
/**
 * 按保留期分批删除过期的审计、花费、共享花费与主体身份记录。
 */
//@ chunk-1ny7cxrt.js:1518415-1519761 placement
function sweepRetention(e, t, n = () => !0) {
  let o = (l, c) =>
      void (async () => {
        for (let u = 0; u < 50 && n(); u++)
          if ((await e.begin(async (h) => (await h`SET LOCAL statement_timeout = '30s'`, c(h)))).length < Kd)
            return;
      })().catch((u) => {
        if (n()) reportSweepFailure(l, u);
      }),
    r = t?.auditRetentionDays ?? uve;
  o(
    "admin_audit",
    (l) => l`DELETE FROM admin_audit WHERE ctid = ANY(ARRAY(
        SELECT ctid FROM admin_audit
        WHERE at < now() - make_interval(days => ${r})
        LIMIT ${Kd}
      )) RETURNING 1`,
  );
  let s = t?.spendRetentionMonths ?? lve;
  (o(
    "spend",
    (l) => l`DELETE FROM spend WHERE ctid = ANY(ARRAY(
        SELECT ctid FROM spend
        WHERE updated_at < now() - make_interval(months => ${s})
        LIMIT ${Kd}
      )) AND updated_at < now() - make_interval(months => ${s})
      RETURNING 1`,
  ),
    o(
      "pooled_spend",
      (l) => l`DELETE FROM pooled_spend WHERE ctid = ANY(ARRAY(
        SELECT ctid FROM pooled_spend
        WHERE updated_at < now() - make_interval(months => ${s})
        LIMIT ${Kd}
      )) AND updated_at < now() - make_interval(months => ${s})
      RETURNING 1`,
    ));
  let a = t?.identityRetentionDays ?? cve;
  o(
    "principal_emails",
    (l) => l`DELETE FROM principal_emails WHERE ctid = ANY(ARRAY(
        SELECT ctid FROM principal_emails
        WHERE updated_at < now() - make_interval(days => ${a})
        LIMIT ${Kd}
      )) AND updated_at < now() - make_interval(days => ${a})
      RETURNING 1`,
  );
}
/**
 * 清理失败日志（缺少 DELETE 权限时只警告一次）。
 */
//@ chunk-1ny7cxrt.js:1519761-1520090 placement
function reportSweepFailure(e, t) {
  if (pgErrorCode(t) === "42501") {
    if (claimOnce().claim(`gateway_sweep_denied:${e}`))
      gatewayLog(
        "warn",
        `${e} retention sweep failed: the database role lacks DELETE on ${e} \u2014 grant it (see the docs' restricted-role grant list) or rows will outlive their retention window. Warning once.`,
      );
    return;
  }
  gatewayLog("warn", `${e} cleanup failed: ${errorMessage(t)}`);
}
/**
 * 取 Postgres 错误码（errno 或 code）。
 */
//@ chunk-1ny7cxrt.js:1520090-1520257 placement
function pgErrorCode(e) {
  if (typeof e === "object" && e !== null) {
    if ("errno" in e && typeof e.errno === "string") return e.errno;
    if ("code" in e && typeof e.code === "string") return e.code;
  }
  return;
}

export { openGatewayPostgres };
