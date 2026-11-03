/**
 * services/claudeGateway/spendLimits.ts
 *
 * 2.1.316 新增：网关花费限额与共享预算
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1ny7cxrt.js (56)
 * attribution: placement 56
 */
import { timingSafeEqual } from "crypto";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  create,
  create_2,
  create_9,
  create_3,
  create_25,
  create_17,
  create_26,
  create_6,
} from "../../../vendor/zod/lib/index.mjs";
import { gatewayLog, gatewayJsonLog } from "../gateway/gatewayBanner.js";
import { errorMessage } from "../../utils/errors.js";
import {
  accumulateSseUsage,
  finishSseUsage,
  parseJsonUsage,
  MIN_ESTIMATE_OUTPUT_CHARS,
} from "./usageMetering.js";
import { withTimeout } from "../../utils/sleep.js";
import { mockLimitsFromSpend, withLimitStatus, mostSevereLimit, roundUtilization } from "./mockRateLimits.js";
import { hasKnownModelCost } from "../../utils/modelCost.js";
import { findPricingOverride, requestCostCents } from "./models.js";

//@ chunk-1ny7cxrt.js:1423402-1423544 placement
/**
 * 管理 API 响应头与 HTTP 状态到错误类型的映射。
 */
var NO_STORE_HEADERS_2 = {
  "Cache-Control": "no-store",
};
var ADMIN_ERROR_TYPE_BY_STATUS = {
  400: "invalid_request_error",
  401: "authentication_error",
  403: "permission_error",
  404: "not_found_error",
};
//@ chunk-1ny7cxrt.js:1423544-1423654 placement
/**
 * 管理 API 错误响应（Anthropic 错误格式）。
 */
function adminErrorResponse(e, message, requestId) {
  return Response.json(
    {
      type: "error",
      error: {
        type: ADMIN_ERROR_TYPE_BY_STATUS[e],
        message,
      },
      request_id: requestId,
    },
    {
      status: e,
    },
  );
}
//@ chunk-1ny7cxrt.js:1423654-1423761 placement
/**
 * 解析 limit 参数（1–1000），非法返回 null。
 */
function parsePageLimit(searchParams, t) {
  let n = Number(searchParams.get("limit") ?? t);
  if (!Number.isInteger(n) || n < 1 || n > 1000) return null;
  return n;
}
//@ chunk-1ny7cxrt.js:1423761-1423797 placement
/**
 * 花费统计的三个周期（daily、weekly、monthly）。
 */
var SPEND_PERIODS = ["daily", "weekly", "monthly"];
//@ chunk-1ny7cxrt.js:1423797-1424192 placement
/**
 * 周期桶键：monthly 为 YYYY-MM，daily 为 YYYY-MM-DD，weekly 为 ISO 周 YYYY-Www。
 */
function periodBucket(e = "monthly", t = new Date()) {
  if (e === "monthly") return t.toISOString().slice(0, 7);
  if (e === "daily") return t.toISOString().slice(0, 10);
  let date = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()));
  let o = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - o);
  let utcFullYear = date.getUTCFullYear();
  let s = Date.UTC(utcFullYear, 0, 1);
  let a = Math.ceil(((date.getTime() - s) / 86400000 + 1) / 7);
  return `${utcFullYear}-W${String(a).padStart(2, "0")}`;
}
//@ chunk-1ny7cxrt.js:1424192-1424442 placement
/**
 * 当前周期的重置时间（下月 1 日、次日或下周一，UTC）。
 */
function periodResetsAt(period, t = new Date()) {
  let utcFullYear = t.getUTCFullYear();
  let utcMonth = t.getUTCMonth();
  let utcDate = t.getUTCDate();
  if (period === "monthly") return new Date(Date.UTC(utcFullYear, utcMonth + 1, 1));
  if (period === "daily") return new Date(Date.UTC(utcFullYear, utcMonth, utcDate + 1));
  let s = 8 - (t.getUTCDay() || 7);
  return new Date(Date.UTC(utcFullYear, utcMonth, utcDate + s));
}
//@ chunk-1ny7cxrt.js:1424442-1424498 placement
/**
 * 把“分”数值格式化成最多三位小数并去掉尾部零。
 */
function formatCents(cents) {
  return cents.toFixed(3).replace(/\.?0+$/, "");
}
//@ chunk-1ny7cxrt.js:1424498-1424657 placement
/**
 * 作用域类型与 id 转为 scope 对象（user/rbac_group/organization）。
 */
function toSpendScope(scopeType, scopeId) {
  if (scopeType === "user")
    return {
      type: "user",
      user_id: scopeId ?? "",
    };
  if (scopeType === "rbac_group")
    return {
      type: "rbac_group",
      rbac_group_id: scopeId ?? "",
    };
  return {
    type: "organization",
  };
}
//@ chunk-1ny7cxrt.js:1424657-1425255 placement
/**
 * SQL：各周期的上限（caps_by_period）与该主体当前花费。
 */
function queryCapsWithSpend(e, t, n, o, r = new Date()) {
  let mapped = SPEND_PERIODS.map((a) => periodBucket(a, r));
  return e`
    WITH pb AS (
      SELECT period, bucket, ordinality AS ord
      FROM unnest(${e.array([...SPEND_PERIODS], "TEXT")}, ${e.array(mapped, "TEXT")})
        WITH ORDINALITY AS t(period, bucket)
    )
    SELECT pb.period, c.amount AS cap_cents, c.scope_type,
           coalesce(s.cents, 0)::float8 AS spent_cents
    FROM pb
    JOIN caps_by_period(${t}, ${e.array([...n], "TEXT")}, ${o}) c
      ON c.period = pb.period
    LEFT JOIN spend s ON s.principal = ${t} AND s.period = pb.bucket
    WHERE c.amount IS NOT NULL
    ORDER BY pb.ord
  `;
}
//@ chunk-1ny7cxrt.js:1425255-1425708 placement
/**
 * SQL：用户所在组启用的月度共享预算与已用额度。
 */
function queryPooledBudgets(e, t, n) {
  return e`
    SELECT l.scope_id AS "group",
           l.pooled_monthly_credit_limit::float8 AS "limit",
           coalesce(s.cents, 0)::float8 AS spent
    FROM spend_limits l
    LEFT JOIN pooled_spend s
      ON s.rbac_group_id = l.scope_id AND s.period = ${periodBucket("monthly", n)}
    WHERE l.scope_type = 'rbac_group' AND l.period = 'monthly'
      AND l.scope_id = ANY(${e.array([...t], "TEXT")})
      AND l.pooled_limit_enabled
  `;
}
//@ chunk-1ny7cxrt.js:1425708-1426207 placement
/**
 * 在一个短超时事务中读取个人上限与组共享预算。
 */
async function readSpendCaps(e, t, n, groupLimitMode, r, signal, groups = []) {
  let l = await e.reserve();
  try {
    signal?.throwIfAborted();
    let [c, u, f, , h, m] = await Promise.allSettled([
      l`BEGIN`,
      l`SET LOCAL statement_timeout = '2s'`,
      queryCapsWithSpend(l, t, n, groupLimitMode, r),
      groups.length > 0 ? l`SET LOCAL statement_timeout = '300ms'` : [],
      groups.length > 0 ? queryPooledBudgets(l, groups, r) : [],
      l`COMMIT`,
    ]);
    for (let y of [c, u]) if (y.status === "rejected") throw y.reason;
    if (f.status === "rejected") throw f.reason;
    if (m.status === "rejected") throw m.reason;
    return {
      caps: f.value,
      pools: h,
    };
  } finally {
    Promise.resolve(l.release()).catch(() => {});
  }
}
//@ chunk-1ny7cxrt.js:1426207-1426727 placement
/**
 * 按各周期桶累加主体花费（语句超时时重试一次）。
 */
async function recordSpend(e, t, n) {
  let mapped = SPEND_PERIODS.map((s) => periodBucket(s));
  let r = () =>
    e.begin(async (s) => {
      await s`SET LOCAL statement_timeout = '2s'`;
      await s`
        INSERT INTO spend (principal, period, cents)
        SELECT DISTINCT ${t}, b, ${n}
        FROM unnest(${e.array(mapped, "TEXT")}) AS t(b)
        ORDER BY 2
        ON CONFLICT (principal, period) DO UPDATE
          SET cents = spend.cents + EXCLUDED.cents, updated_at = now()
      `;
    });
  try {
    await r();
  } catch (error) {
    let a = error ?? {};
    if (a.errno === "57014" || a.code === "57014") {
      await r();
      return;
    }
    throw error;
  }
}
//@ chunk-1ny7cxrt.js:1426727-1427155 placement
/**
 * 累加各组本月共享预算花费。
 */
async function recordPooledSpend(e, t) {
  await e`
    INSERT INTO pooled_spend (rbac_group_id, period, cents)
    SELECT rbac_group_id, ${periodBucket("monthly")}, cents
    FROM unnest(
      ${e.array([...t.keys()], "TEXT")},
      ${e.array([...t.values()], "DOUBLE PRECISION")}
    ) AS t(rbac_group_id, cents)
    ORDER BY 1
    ON CONFLICT (rbac_group_id, period) DO UPDATE
      SET cents = pooled_spend.cents + EXCLUDED.cents, updated_at = now()
  `;
}
//@ chunk-1ny7cxrt.js:1427155-1427601 placement
/**
 * 记录主体的邮箱、姓名与所属组。
 */
async function upsertPrincipalIdentity(e, t) {
  let email = t.email || null;
  let o = t.name || null;
  let groups = t.groups ?? [];
  await e.begin(async (s) => {
    await s`SET LOCAL statement_timeout = '2s'`;
    await s`
      INSERT INTO principal_emails ${e({
        principal: t.sub,
        email,
        name: o,
        groups,
      })}
      ON CONFLICT (principal) DO UPDATE SET
        email = coalesce(${email}, principal_emails.email),
        name = coalesce(${o}, principal_emails.name),
        groups = ${groups},
        updated_at = now()
    `;
  });
}
//@ chunk-1ny7cxrt.js:1427601-1427775 placement
/**
 * 写一条管理审计记录。
 */
async function insertAdminAudit(e, t) {
  await e`INSERT INTO admin_audit ${e({
    actor: t.actor,
    action: t.action,
    target: t.target,
    before: t.before ?? null,
    after: t.after ?? null,
    reason: t.reason ?? null,
  })}`;
}
//@ chunk-1ny7cxrt.js:1427775-1427999 placement
/**
 * SQL 片段：周期与当前桶的列表。
 */
function periodBucketsSql(e, t = SPEND_PERIODS, n = new Date()) {
  let mapped = t.map((r) => periodBucket(r, n));
  return e`
    SELECT period, bucket, ordinality AS ord
    FROM unnest(${e.array([...t], "TEXT")}, ${e.array(mapped, "TEXT")})
      WITH ORDINALITY AS t(period, bucket)
  `;
}
//@ chunk-1ny7cxrt.js:1427999-1428996 placement
/**
 * GET …/effective：按用户（或分页列出）返回各周期的生效上限、来源与已用额度，支持搜索与按花费排序。
 */
async function handleEffectiveLimits({ url, sql, requestId }, groupLimitMode) {
  let searchParams = url.searchParams;
  let pageLimit = parsePageLimit(searchParams, 20);
  if (pageLimit === null) return adminErrorResponse(400, "limit: must be between 1 and 1000", requestId);
  let periods = parsePeriods(searchParams);
  if (periods === null)
    return adminErrorResponse(400, "period[]: must be one of daily, weekly, monthly", requestId);
  let all = searchParams.getAll("user_ids[]");
  if (all.length > 100)
    return adminErrorResponse(400, "user_ids[]: at most 100 entries per request", requestId);
  let c = searchParams.get("q");
  if (c !== null && c.length > 256) return adminErrorResponse(400, "q: too long", requestId);
  let u = searchParams.get("sort");
  if (u !== null && u !== "spend_desc") return adminErrorResponse(400, "sort: must be spend_desc", requestId);
  let f = u === "spend_desc";
  if (f && periods.length !== 1)
    return adminErrorResponse(400, "sort=spend_desc requires exactly one period[]", requestId);
  if (all.length > 0) {
    let data = await queryEffectiveLimits(sql, all, periods, groupLimitMode);
    return Response.json(
      {
        data,
        next_page: null,
      },
      {
        headers: NO_STORE_HEADERS_2,
      },
    );
  }
  let h = searchParams.get("page");
  let m;
  if (h !== null) {
    m = decodePageToken(h, f);
    if (m === undefined) return adminErrorResponse(400, "page: invalid page token", requestId);
  }
  let y = c === null ? null : `%${escapeLikePattern(c)}%`;
  let b = f
    ? await listPrincipalsBySpend(sql, periodBucket(periods[0]), m, y, pageLimit)
    : await listPrincipals(sql, m, y, pageLimit);
  let data = await queryEffectiveLimits(sql, b.subs, periods, groupLimitMode);
  return Response.json(
    {
      data,
      next_page: b.nextToken,
    },
    {
      headers: NO_STORE_HEADERS_2,
    },
  );
}
//@ chunk-1ny7cxrt.js:1428996-1429183 placement
/**
 * 解析 period[] 参数（默认全部，非法返回 null）。
 */
function parsePeriods(searchParams) {
  let all = searchParams.getAll("period[]");
  if (all.length === 0) return SPEND_PERIODS;
  let n = [];
  for (let o of all) {
    if (o !== "daily" && o !== "weekly" && o !== "monthly") return null;
    if (!n.includes(o)) n.push(o);
  }
  return n;
}
//@ chunk-1ny7cxrt.js:1429183-1429270 placement
/**
 * 带累计数的页令牌 schema（主体 + 数 + 已结束标记）。
 */
var spendPageTokenSchema = DoctorLazy(() =>
  create({
    p: create_2(),
    s: create_9().optional(),
  }),
);
var spendPageTokenWithCountSchema = DoctorLazy(() =>
  create({
    p: create_2(),
    c: create_3(),
    s: create_25(true),
  }),
);
//@ chunk-1ny7cxrt.js:1429270-1429345 placement
/**
 * 把分页令牌编码成 base64url JSON。
 */
function encodePageToken(e) {
  return Buffer.from(JSON.stringify(e)).toString("base64url");
}
//@ chunk-1ny7cxrt.js:1429345-1429467 placement
/**
 * 解码分页令牌（base64url JSON）。
 */
function decodePageToken(e, t) {
  let n = t ? spendPageTokenWithCountSchema() : spendPageTokenSchema();
  try {
    return n.parse(JSON.parse(Buffer.from(e, "base64url").toString()));
  } catch {
    return;
  }
}
//@ chunk-1ny7cxrt.js:1429467-1430102 placement
/**
 * 按花费降序分页列出主体（游标）。
 */
async function listPrincipalsBySpend(sql, t, n, o, pageLimit) {
  let s = n?.p ?? null;
  let a = n?.s === true ? n.c : null;
  let l = await sql`
    SELECT s.principal, s.cents FROM spend s
    LEFT JOIN principal_emails e ON e.principal = s.principal
    WHERE s.period = ${t}
      AND (${a}::float8 IS NULL
           OR s.cents < ${a}
           OR (s.cents = ${a} AND s.principal > ${s}))
      AND (${o}::text IS NULL OR s.principal ILIKE ${o}
           OR e.email ILIKE ${o} OR e.name ILIKE ${o})
    ORDER BY s.cents DESC, s.principal LIMIT ${pageLimit + 1}
  `;
  let c = l.length > pageLimit;
  let sliced = l.slice(0, pageLimit);
  let last = sliced.at(-1);
  return {
    subs: sliced.map((h) => h.principal),
    nextToken:
      c && last !== undefined
        ? encodePageToken({
            p: last.principal,
            c: last.cents,
            s: true,
          })
        : null,
  };
}
//@ chunk-1ny7cxrt.js:1430102-1430598 placement
/**
 * 按主体名分页列出（可搜索）。
 */
async function listPrincipals(sql, t, n, pageLimit) {
  let r = t?.p ?? null;
  let s = await sql`
    SELECT s.principal FROM spend s
    LEFT JOIN principal_emails e ON e.principal = s.principal
    WHERE (${r}::text IS NULL OR s.principal > ${r})
      AND (${n}::text IS NULL OR s.principal ILIKE ${n}
           OR e.email ILIKE ${n} OR e.name ILIKE ${n})
    GROUP BY s.principal ORDER BY s.principal LIMIT ${pageLimit + 1}
  `;
  let sliced = s.map((u) => u.principal).slice(0, pageLimit);
  let l = s.length > pageLimit;
  let last = sliced.at(-1);
  return {
    subs: sliced,
    nextToken:
      l && last !== undefined
        ? encodePageToken({
            p: last,
          })
        : null,
  };
}
//@ chunk-1ny7cxrt.js:1430598-1430656 placement
/**
 * 转义 SQL LIKE 里的 \ % _。
 */
function escapeLikePattern(e) {
  return e.replace(/[\\%_]/g, (t) => `\\${t}`);
}
//@ chunk-1ny7cxrt.js:1430656-1431483 placement
/**
 * 查询一批主体在各周期的生效上限与花费。
 */
async function queryEffectiveLimits(sql, t, periods, o) {
  if (t.length === 0) return [];
  return (
    await sql`
    WITH p AS (
      SELECT principal, ordinality AS ord
      FROM unnest(${sql.array(t, "TEXT")}) WITH ORDINALITY AS t(principal)
    ),
    per AS (${periodBucketsSql(sql, periods)})
    SELECT p.principal, per.period, cap.amount, cap.scope_type,
           cap.scope_id, cap.id AS spend_limit_id,
           coalesce(s.cents, 0) AS cents,
           e.email, e.name, e.groups
    FROM p
    CROSS JOIN per
    LEFT JOIN principal_emails e ON e.principal = p.principal
    LEFT JOIN LATERAL caps_by_period(
      p.principal,
      ARRAY(SELECT jsonb_array_elements_text(coalesce(e.groups, '[]'::jsonb))),
      ${o}
    ) cap ON cap.period = per.period
    LEFT JOIN spend s ON s.principal = p.principal AND s.period = per.bucket
    ORDER BY p.ord, per.ord
  `
  ).map((s) => toEffectiveLimit(s));
}
//@ chunk-1ny7cxrt.js:1431483-1431850 placement
/**
 * 查询行转为生效上限 API 对象。
 */
function toEffectiveLimit(e) {
  let source = e.scope_type === null ? null : toSpendScope(e.scope_type, e.scope_id);
  return {
    scope: {
      type: "user",
      user_id: e.principal,
    },
    groups: e.groups ?? [],
    actor: {
      type: "user_actor",
      user_id: e.principal,
      name: e.name ?? null,
      email_address: e.email ?? null,
      deleted: false,
    },
    amount: e.amount,
    currency: "USD",
    period: e.period,
    source,
    spend_limit_id: e.spend_limit_id,
    period_to_date_spend: formatCents(e.cents),
  };
}
//@ chunk-1ny7cxrt.js:1431850-1431890 placement
/**
 * 花费限额管理 API 的路径前缀 /v1/organizations/spend_limits。
 */
var SPEND_LIMITS_PATH = "/v1/organizations/spend_limits";
//@ chunk-1ny7cxrt.js:1431890-1431943 placement
/**
 * 判断路径是否属于花费限额 API。
 */
function isSpendLimitsPath(pathname) {
  return pathname === SPEND_LIMITS_PATH || pathname.startsWith(`${SPEND_LIMITS_PATH}/`);
}
//@ chunk-1ny7cxrt.js:1431943-1432263 placement
/**
 * 处理花费限额管理 API 请求（分配 request-id、记录日志）；路径不匹配返回 null。
 */
async function handleSpendLimitAdmin(e, t, sql, keys, oidcAdmin, clientIp, groupLimitMode = "min") {
  if (!isSpendLimitsPath(t.pathname)) return null;
  let l = `req_${crypto.randomUUID().replace(/-/g, "")}`;
  let c = await routeSpendLimitAdmin({
    req: e,
    url: t,
    sql,
    keys,
    requestId: l,
    oidcAdmin,
    clientIp,
    groupLimitMode,
  });
  c.headers.set("request-id", l);
  gatewayLog("info", `admin ${e.method} ${t.pathname} -> ${c.status} (${l})`);
  return c;
}
//@ chunk-1ny7cxrt.js:1432263-1433100 placement
/**
 * 管理 API 路由：认证（admin key 或 OIDC 管理员）后分发 effective/audit/列表/创建/查询/删除。
 */
async function routeSpendLimitAdmin({ req, url, sql, keys, requestId, oidcAdmin, clientIp, groupLimitMode }) {
  let pathname = url.pathname;
  let method = req.method;
  let f = req.headers.get("x-api-key");
  let h = authenticateAdmin(f, keys, oidcAdmin);
  if (!h) {
    gatewayJsonLog("admin.denied", {
      reason: f ? "invalid_key" : req.headers.get("authorization") ? "bearer_rejected" : "no_credentials",
      method,
      path: pathname,
      client_ip: clientIp ?? null,
    });
    return adminErrorResponse(401, "missing or invalid admin credentials", requestId);
  }
  let m = {
    req,
    url,
    sql,
    requestId,
    auth: h,
  };
  if (pathname === `${SPEND_LIMITS_PATH}/effective` && method === "GET")
    return handleEffectiveLimits(m, groupLimitMode);
  if (pathname === `${SPEND_LIMITS_PATH}/audit` && method === "GET") return handleAuditList(m);
  if (pathname === SPEND_LIMITS_PATH && method === "GET") return handleListSpendLimits(m);
  if (pathname === SPEND_LIMITS_PATH && method === "POST") return handleUpsertSpendLimit(m);
  if (pathname.startsWith(`${SPEND_LIMITS_PATH}/`)) {
    let y;
    try {
      y = decodeURIComponent(pathname.slice(SPEND_LIMITS_PATH.length + 1));
    } catch {
      return adminErrorResponse(400, "malformed spend limit id", requestId);
    }
    if (method === "GET") return handleGetSpendLimit(m, y);
    if (method === "DELETE") return handleDeleteSpendLimit(m, y);
    return adminErrorResponse(404, "not found", requestId);
  }
  return adminErrorResponse(404, "not found", requestId);
}
//@ chunk-1ny7cxrt.js:1433100-1433345 placement
/**
 * 用 x-api-key（读/写密钥）或 OIDC 管理员身份认证，返回 {canWrite, actor}。
 */
function authenticateAdmin(e, keys, oidcAdmin) {
  if (!e)
    return oidcAdmin
      ? {
          canWrite: true,
          actor: `oidc:${oidcAdmin.sub}`,
        }
      : null;
  let o = matchAdminKey(e, keys.writeKeys);
  let r = matchAdminKey(e, keys.readKeys);
  if (o !== undefined)
    return {
      canWrite: true,
      actor: `admin-key:${o}`,
    };
  if (r !== undefined)
    return {
      canWrite: false,
      actor: `admin-key:${r}`,
    };
  return null;
}
//@ chunk-1ny7cxrt.js:1433345-1433475 placement
/**
 * 常数时间比较 API key，返回匹配的密钥 id。
 */
function matchAdminKey(e, t) {
  let buffer = Buffer.from(e);
  let o;
  for (let r of t) {
    let buffer_2 = Buffer.from(r.key);
    if (buffer_2.length === buffer.length && timingSafeEqual(buffer, buffer_2)) o = r.id;
  }
  return o;
}
//@ chunk-1ny7cxrt.js:1433475-1434197 placement
/**
 * GET …/audit：分页列出审计事件。
 */
async function handleAuditList({ url, sql, requestId }) {
  let pageLimit = parsePageLimit(url.searchParams, 100);
  if (pageLimit === null) return adminErrorResponse(400, "limit: must be between 1 and 1000", requestId);
  let r = url.searchParams.get("after_id");
  if (r !== null && !/^\d{1,18}$/.test(r))
    return adminErrorResponse(400, "after_id: must be an audit event id", requestId);
  let s = await sql`
    SELECT id, at, actor, action, target, before, after, reason
    FROM admin_audit
    WHERE (${r}::bigint IS NULL OR id < ${r}::bigint)
    ORDER BY id DESC LIMIT ${pageLimit + 1}
  `;
  let hasMore = s.length > pageLimit;
  return Response.json(
    {
      data: s.slice(0, pageLimit).map((l) => ({
        type: "audit_event",
        id: l.id,
        created_at: l.at.toISOString(),
        actor: l.actor,
        action: l.action,
        target_id: l.target,
        before: l.before ?? null,
        after: l.after ?? null,
        reason: l.reason ?? null,
      })),
      has_more: hasMore,
    },
    {
      headers: NO_STORE_HEADERS_2,
    },
  );
}
//@ chunk-1ny7cxrt.js:1434197-1435599 placement
/**
 * GET 列表：按作用域类型筛选、after_id/before_id 分页。
 */
async function handleListSpendLimits({ url, sql, requestId }) {
  let searchParams = url.searchParams;
  let pageLimit = parsePageLimit(searchParams, 20);
  if (pageLimit === null) return adminErrorResponse(400, "limit: must be between 1 and 1000", requestId);
  let s = searchParams.get("scope_type");
  if (s !== null && s !== "organization" && s !== "rbac_group" && s !== "user")
    return adminErrorResponse(400, "scope_type: must be one of organization, rbac_group, user", requestId);
  let a = searchParams.get("after_id");
  let l = searchParams.get("before_id");
  if (a !== null && l !== null)
    return adminErrorResponse(400, "after_id and before_id are mutually exclusive", requestId);
  let c = a ?? l;
  let u;
  if (c !== null) {
    u = (await sql`SELECT created_at::text AS created_at, id FROM spend_limits WHERE id = ${c}`)[0];
    if (!u)
      return adminErrorResponse(
        400,
        `${a !== null ? "after_id" : "before_id"}: no spend limit with this id`,
        requestId,
      );
  }
  let f = pageLimit + 1;
  let h;
  let m;
  if (l !== null && u) {
    let b = await sql`
      SELECT * FROM spend_limits
      WHERE (created_at, id) < (${u.created_at}::timestamptz, ${u.id})
        AND (${s}::text IS NULL OR scope_type = ${s})
      ORDER BY created_at DESC, id DESC LIMIT ${f}
    `;
    h = b.length > pageLimit;
    m = b.slice(0, pageLimit).reverse().map(toSpendLimit);
  } else {
    let createdAt = u?.created_at ?? null;
    let w = await sql`
      SELECT * FROM spend_limits
      WHERE (${createdAt}::timestamptz IS NULL
             OR (created_at, id) > (${createdAt}::timestamptz, ${u?.id ?? null}))
        AND (${s}::text IS NULL OR scope_type = ${s})
      ORDER BY created_at, id LIMIT ${f}
    `;
    h = w.length > pageLimit;
    m = w.slice(0, pageLimit).map(toSpendLimit);
  }
  let y = await withPooledSpend(sql, m);
  return Response.json(
    {
      data: y,
      has_more: h,
      first_id: y[0]?.id ?? null,
      last_id: y.at(-1)?.id ?? null,
    },
    {
      headers: NO_STORE_HEADERS_2,
    },
  );
}
//@ chunk-1ny7cxrt.js:1435599-1438096 placement
/**
 * POST：创建或更新花费限额（含组共享预算校验），加锁事务内写入并审计。
 */
async function handleUpsertSpendLimit({ req, sql, requestId, auth }) {
  if (!auth.canWrite) return adminErrorResponse(403, "requires write:spend_limits", requestId);
  let upsertBody = await parseUpsertBody(req, requestId);
  if (upsertBody instanceof Response) return upsertBody;
  let { scope, period } = upsertBody;
  if (upsertBody.amount === undefined && !upsertBody.pooled_budget)
    return adminErrorResponse(400, "amount: Required", requestId);
  let pooledBudget = upsertBody.pooled_budget ?? {};
  if (pooledBudget.paused === false || (pooledBudget.amount ?? null) !== null) {
    if (scope.type !== "rbac_group")
      return adminErrorResponse(
        400,
        "Pooled budget fields can only be set on a group-level limit",
        requestId,
      );
    if (period !== "monthly")
      return adminErrorResponse(
        400,
        "Pooled budgets are monthly only. Set pooled fields on the group's monthly limit.",
        requestId,
      );
  }
  let c = scopeId(scope);
  let u = `spend_limits:${scope.type}:${c}:${period}`;
  let f = {
    id: `spl_${crypto.randomUUID().replace(/-/g, "")}`,
    scope_type: scope.type,
    scope_id: c,
    period,
    created_by: auth.actor,
  };
  let h = await sql.begin(async (w) => {
    await w`SELECT pg_advisory_xact_lock(hashtext(${u}))`;
    let [S] = await w`
      SELECT * FROM spend_limits
      WHERE scope_type = ${scope.type} AND scope_id = ${c} AND period = ${period}
      FOR UPDATE
    `;
    let j = S && toSpendLimit(S);
    let amount = upsertBody.amount === undefined ? j?.amount : upsertBody.amount;
    if (amount === undefined)
      return "This spend limit doesn't exist yet, so it needs amount (each member's own limit). Set amount; it may equal pooled_budget.amount.";
    let pooledBudget_2 = j?.pooled_budget;
    let Z = pooledBudget.amount === undefined ? (pooledBudget_2?.amount ?? null) : pooledBudget.amount;
    let F = pooledBudget.paused ?? pooledBudget_2?.paused ?? Z === null;
    if (!F) {
      if (Z === null)
        return "A pooled budget that isn't paused needs an amount. Set pooled_budget.amount, or set pooled_budget.paused to true.";
      if (amount === null)
        return "A pooled budget that isn't paused needs amount (each member's own limit) on the same spend limit. Set amount; it may equal pooled_budget.amount.";
    }
    let X = {
      pooled_limit_enabled: !F,
      pooled_monthly_credit_limit: Z,
    };
    let [he] = await w`
      INSERT INTO spend_limits ${w({
        ...f,
        amount,
        ...X,
      })}
      ON CONFLICT (scope_type, scope_id, period) DO UPDATE
        SET amount = ${amount},
            pooled_limit_enabled = ${X.pooled_limit_enabled},
            pooled_monthly_credit_limit = ${X.pooled_monthly_credit_limit},
            updated_at = now()
      RETURNING *
    `;
    let spendLimit = toSpendLimit(he);
    await insertAdminAudit(w, {
      actor: auth.actor,
      action: "spend_limit.upsert",
      target: spendLimit.id,
      before: j ?? null,
      after: spendLimit,
    });
    return {
      before: j,
      after: spendLimit,
      json: (await withPooledSpend(w, [spendLimit]))[0],
    };
  });
  if (typeof h === "string") return adminErrorResponse(400, h, requestId);
  let { before, after, json } = h;
  gatewayJsonLog("admin.limit.upsert", {
    actor: auth.actor,
    target: after.id,
    scope_type: scope.type,
    scope_id: c,
    period,
    ...(before !== undefined && {
      before_amount: before.amount,
    }),
    amount: after.amount,
    ...(before?.pooled_budget !== undefined && {
      before_pooled_budget: before.pooled_budget,
    }),
    ...(after.pooled_budget !== undefined && {
      pooled_budget: after.pooled_budget,
    }),
  });
  return Response.json(json);
}
//@ chunk-1ny7cxrt.js:1438096-1438429 placement
/**
 * GET 单个花费限额。
 */
async function handleGetSpendLimit({ sql, requestId }, n) {
  let r = (
    await sql`
    SELECT id, scope_type, scope_id, amount, period, currency, pooled_limit_enabled, pooled_monthly_credit_limit, created_at, updated_at FROM spend_limits WHERE id = ${n}
  `
  )[0];
  return r
    ? Response.json((await withPooledSpend(sql, [toSpendLimit(r)]))[0], {
        headers: NO_STORE_HEADERS_2,
      })
    : adminErrorResponse(404, "spend limit not found", requestId);
}
//@ chunk-1ny7cxrt.js:1438429-1439096 placement
/**
 * DELETE 花费限额并审计。
 */
async function handleDeleteSpendLimit({ sql, requestId, auth }, o) {
  if (!auth.canWrite) return adminErrorResponse(403, "requires write:spend_limits", requestId);
  let r = await sql.begin(async (s) => {
    let l = (
      await s`
      DELETE FROM spend_limits WHERE id = ${o} RETURNING id, scope_type, scope_id, amount, period, currency, pooled_limit_enabled, pooled_monthly_credit_limit, created_at, updated_at
    `
    )[0];
    if (!l) return false;
    await insertAdminAudit(s, {
      actor: auth.actor,
      action: "spend_limit.delete",
      target: o,
      before: toSpendLimit(l),
    });
    return l;
  });
  if (r) {
    gatewayJsonLog("admin.limit.delete", {
      actor: auth.actor,
      target: o,
      scope_type: r.scope_type,
      scope_id: r.scope_id,
      period: r.period,
    });
    return Response.json({
      type: "spend_limit_deleted",
      id: o,
    });
  }
  return adminErrorResponse(404, "spend limit not found", requestId);
}
//@ chunk-1ny7cxrt.js:1439096-1439575 placement
/**
 * 金额（分）字符串 schema 与创建请求体 schema。
 */
var CENTS_STRING_SCHEMA = DoctorLazy(() =>
  create_2()
    .regex(/^\d{1,18}$/, "must be a whole-number decimal string of cents")
    .nullable(),
);
var UPSERT_SPEND_LIMIT_SCHEMA = DoctorLazy(() =>
  create({
    scope: create_17("type", [
      create({
        type: create_25("user"),
        user_id: create_2().min(1),
      }),
      create({
        type: create_25("rbac_group"),
        rbac_group_id: create_2().min(1),
      }),
      create({
        type: create_25("organization"),
      }),
    ]),
    amount: CENTS_STRING_SCHEMA().optional(),
    period: create_26(["daily", "weekly", "monthly"]).default("monthly"),
    currency: create_25("USD").optional(),
    pooled_budget: create({
      amount: CENTS_STRING_SCHEMA().optional(),
      paused: create_6().nullish(),
      currency: create_25("USD").optional(),
    }).nullish(),
  }),
);
//@ chunk-1ny7cxrt.js:1439575-1439707 placement
/**
 * 把第一个校验错误格式化为 “路径: 信息”。
 */
function formatZodIssue(error) {
  let t = error.issues[0];
  if (!t) return "invalid request body";
  let joined = t.path.join(".");
  return joined ? `${joined}: ${t.message}` : t.message;
}
//@ chunk-1ny7cxrt.js:1439707-1439873 placement
/**
 * 解析并校验请求体，失败返回错误响应。
 */
async function parseUpsertBody(req, requestId) {
  let n;
  try {
    n = await req.json();
  } catch {
    return adminErrorResponse(400, "invalid JSON body", requestId);
  }
  let o = UPSERT_SPEND_LIMIT_SCHEMA().safeParse(n);
  return o.success ? o.data : adminErrorResponse(400, formatZodIssue(o.error), requestId);
}
//@ chunk-1ny7cxrt.js:1439873-1440000 placement
/**
 * 作用域 id（用户 id、组 id 或空串）。
 */
function scopeId(scope) {
  switch (scope.type) {
    case "user":
      return scope.user_id;
    case "rbac_group":
      return scope.rbac_group_id;
    case "organization":
      return "";
  }
}
//@ chunk-1ny7cxrt.js:1440000-1440375 placement
/**
 * 数据库行转为花费限额对象（组月度限额带共享预算）。
 */
function toSpendLimit(e) {
  return {
    id: e.id,
    scope: toSpendScope(e.scope_type, e.scope_id),
    amount: e.amount,
    period: e.period,
    currency: e.currency,
    ...(e.scope_type === "rbac_group" &&
      e.period === "monthly" && {
        pooled_budget:
          e.pooled_monthly_credit_limit === null
            ? null
            : {
                amount: e.pooled_monthly_credit_limit,
                paused: !e.pooled_limit_enabled,
              },
      }),
    created_at: e.created_at.toISOString(),
    updated_at: e.updated_at.toISOString(),
  };
}
//@ chunk-1ny7cxrt.js:1440375-1441013 placement
/**
 * 为花费限额 API 对象补上共享预算本月已用额度。
 */
async function withPooledSpend(sql, t) {
  let mapped = t.filter((s) => s.pooled_budget).map((s) => scopeId(s.scope));
  let o =
    mapped.length === 0
      ? []
      : await sql`
          SELECT rbac_group_id, cents FROM pooled_spend
          WHERE period = ${periodBucket("monthly")}
            AND rbac_group_id = ANY(${sql.array(mapped, "TEXT")})
        `;
  let r = new Map(o.map((s) => [s.rbac_group_id, s.cents]));
  return t.map((s) => ({
    type: "spend_limit",
    id: s.id,
    created_at: s.created_at,
    updated_at: s.updated_at,
    scope: s.scope,
    amount: s.amount,
    currency: s.currency,
    period: s.period,
    ...(s.pooled_budget !== undefined && {
      pooled_budget: s.pooled_budget && {
        ...s.pooled_budget,
        currency: s.currency,
        period_to_date_spend: formatCents(r.get(scopeId(s.scope)) ?? 0),
      },
    }),
  }));
}
//@ chunk-1ny7cxrt.js:1441013-1441192 placement
/**
 * 从用户所在组的共享预算中选出仍有余额的那个（按上限从大到小），否则返回全部已用尽。
 */
function pickPayingPool(e) {
  let [t, ...n] = e.toSorted((s, a) => a.limit - s.limit || (s.group < a.group ? -1 : 1));
  if (!t) return null;
  let o = [t, ...n];
  let found = o.find((s) => s.spent < s.limit);
  return found
    ? {
        pays: found,
      }
    : {
        usedUp: o,
      };
}
//@ chunk-1ny7cxrt.js:1441192-1441206 placement
/**
 * 花费慢写的提醒间隔（30 秒）。
 */
var SLOW_SPEND_WRITE_MS = 30000;
//@ chunk-1ny7cxrt.js:1441206-1441429 placement
/**
 * 合并累加花费并串行写入；写入耗时过长时回调提醒。
 */
function createSpendFlusher(e, t, n = () => performance.now()) {
  let o = new Map();
  let r;
  return async (s, a) => {
    o.set(s, (o.get(s) ?? 0) + a);
    if (r !== undefined) {
      if (n() - r >= SLOW_SPEND_WRITE_MS) {
        r = n();
        t();
      }
      return;
    }
    try {
      while (o.size > 0) {
        let l = o;
        o = new Map();
        r = n();
        await e(l);
      }
    } finally {
      r = undefined;
    }
  };
}
//@ chunk-1ny7cxrt.js:1441429-1441549 placement
var MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
//@ chunk-1ny7cxrt.js:1441549-1441772 placement
/**
 * 组预算超限的提示（含重置日期）。
 */
function groupBudgetExceededMessage(resetsAt) {
  return `This request exceeds your group's budget. Ask your organization's admins to raise it, or try again after it resets on ${MONTH_NAMES[resetsAt.getUTCMonth()]} ${resetsAt.getUTCDate()} at ${resetsAt.toISOString().slice(11, 16)} UTC.`;
}
//@ chunk-1ny7cxrt.js:1441772-1442381 placement
/**
 * 包装上游响应流：边转发边解析用量，流结束/出错/取消时计算花费并记录。
 */
function meterResponseUsage(e, t, n, o = null, speed, s = () => {}) {
  if (!e.body || e.status >= 400) return e;
  let included = (e.headers.get("content-type") ?? "").includes("text/event-stream");
  let reader = e.body.getReader();
  let usageAccumulator = createUsageAccumulator(included, o, speed);
  let u = false;
  async function f() {
    if (u) return;
    u = true;
    try {
      let m = await usageAccumulator.usage();
      if (m) await n(t(m));
    } catch (error) {
      gatewayLog("warn", `usage metering failed: ${errorMessage(error)}`);
    }
  }
  let readableStream = new ReadableStream({
    async pull(m) {
      try {
        let y = await reader.read();
        if (y.done) {
          s(f());
          m.close();
          return;
        }
        usageAccumulator.push(y.value);
        m.enqueue(y.value);
      } catch (error) {
        s(f());
        m.error(error);
      }
    },
    async cancel(m) {
      s(f());
      await reader.cancel(m);
    },
  });
  return new Response(readableStream, {
    status: e.status,
    statusText: e.statusText,
    headers: e.headers,
  });
}
//@ chunk-1ny7cxrt.js:1442381-1442396 placement
/**
 * SSE 用量解析缓冲区的上限（8 MiB），超出丢弃。
 */
var MAX_SSE_BUFFER_BYTES = 8388608;
//@ chunk-1ny7cxrt.js:1442396-1442912 placement
/**
 * 用量累加器：SSE 按事件解析，非流式解析 JSON；无用量时按输出字节估算。
 */
function createUsageAccumulator(e, t, speed) {
  let textDecoder = new TextDecoder();
  if (e) {
    let l = "";
    let sseUsageState = createSseUsageState();
    return {
      push(u) {
        l += textDecoder.decode(u, {
          stream: true,
        });
        let parts = l.split(SSE_EVENT_SEPARATOR_RE);
        l = parts.pop() ?? "";
        for (let h of parts) accumulateSseUsage(sseUsageState, h);
        if (l.length > MAX_SSE_BUFFER_BYTES) l = "";
      },
      async usage() {
        if (l !== "") {
          accumulateSseUsage(sseUsageState, l);
          l = "";
        }
        return finishSseUsage(sseUsageState);
      },
    };
  }
  let r = "";
  let s = 0;
  let a = false;
  return {
    push(l) {
      let c = textDecoder.decode(l, {
        stream: true,
      });
      s += c.length;
      if (a) return;
      r += c;
      if (r.length > MAX_SSE_BUFFER_BYTES) {
        a = true;
        r = "";
      }
    },
    async usage() {
      let l = a ? null : parseJsonUsage(r);
      if (l) return l;
      if (s === 0) return null;
      return {
        input_tokens: (await t?.().catch(() => null)) ?? 0,
        output_tokens: Math.ceil(s / CHARS_PER_OUTPUT_TOKEN),
        speed,
      };
    },
  };
}
//@ chunk-1ny7cxrt.js:1442912-1442945 placement
/**
 * 找 data: 字段时扣除的前缀长度。
 */
var SSE_EVENT_SEPARATOR_RE = /\r?\n\r?\n/;
var CHARS_PER_OUTPUT_TOKEN = 4;
var DATA_PREFIX_LENGTH = 80;
//@ chunk-1ny7cxrt.js:1442945-1443051 placement = getParentCacheSuppressReason (0.426)
/**
 * SSE 用量解析器的初始状态（usage 0、是否见到、估算输出字符）。旧版名 getParentCacheSuppressReason 为错配，归错文件。
 */
function createSseUsageState() {
  return {
    usage: {
      input_tokens: 0,
      output_tokens: 0,
    },
    seen: false,
    estOutputChars: 0,
    sawOutputTokens: false,
  };
}
//@ chunk-1ny7cxrt.js:1446994-1450809 placement
function createSpendLimitAdmin(sql, gatewayConfig, spendFault) {
  if (!gatewayConfig.admin) return null;
  let admin = gatewayConfig.admin;
  let r = new Set();
  let s = new Map();
  let a = 900000;
  let l = new Map();
  let c = 2000;
  let u = new Set();
  let NEGATIVE_INFINITY = Number.NEGATIVE_INFINITY;
  let spendFlusher = createSpendFlusher(
    (F) =>
      recordPooledSpend(sql, F).catch((error) => {
        gatewayLog(
          "warn",
          `pooled spend record failed, so this spend is missing from group budgets: ${errorMessage(error)}`,
        );
        spendFault?.("write");
      }),
    () =>
      gatewayLog(
        "warn",
        "a write to pooled_spend has not returned after 30 s, so this replica is not counting spend toward group budgets. The unsaved spend is held in memory and lost if the replica stops. Look for a lock on pooled_spend or a dead database connection",
      ),
  );
  function m(F) {
    u.add(F);
    F.finally(() => u.delete(F));
  }
  async function y(F, requestId) {
    let date = new Date();
    let abortController = new AbortController();
    let ce = withTimeout(
      readSpendCaps(
        sql,
        F.sub,
        F.groups ?? [],
        admin.group_limit_mode,
        date,
        abortController.signal,
        F.groups,
      ),
      MIN_ESTIMATE_OUTPUT_CHARS + 500,
      "spend precheck timed out",
    );
    j(F);
    let Ne;
    try {
      Ne = await ce;
    } catch (error) {
      abortController.abort();
      gatewayLog("warn", `spend check failed: ${errorMessage(error)}`);
      spendFault?.("check");
      if (!gatewayConfig.enforcement.fail_closed_on_error)
        return {
          blocked: null,
          headers: {},
          payingGroup: null,
        };
      return {
        blocked: S(F.sub, requestId, null, {
          "anthropic-ratelimit-unified-overage-disabled-reason": "fetch_error",
        }),
      };
    }
    let { binding, headers } = mockLimitsFromSpend(Ne.caps, date);
    if (binding?.exceeded)
      return {
        blocked: S(F.sub, requestId, binding, headers),
      };
    if (Ne.pools.status === "rejected") {
      if (date.getTime() - NEGATIVE_INFINITY >= 60000) {
        NEGATIVE_INFINITY = date.getTime();
        gatewayLog(
          "warn",
          `pooled spend check failed, so group budgets are not enforced (developers' own caps are). Logged at most once a minute: ${errorMessage(Ne.pools.reason)}`,
        );
      }
      spendFault?.("check");
      return {
        blocked: null,
        headers,
        payingGroup: null,
      };
    }
    let Ue = pickPayingPool(Ne.pools.value);
    if (Ue && "usedUp" in Ue) {
      let kt = mockLimitsFromSpend(
        [
          {
            period: "monthly",
            cap_cents: String(Ue.usedUp[0].limit),
            scope_type: "group_pool",
            spent_cents: Ue.usedUp[0].spent,
          },
        ],
        date,
      );
      return {
        blocked: S(
          F.sub,
          requestId,
          kt.binding,
          kt.headers,
          Ue.usedUp.map((je) => je.group),
        ),
      };
    }
    return {
      blocked: null,
      headers,
      payingGroup: Ue?.pays.group ?? null,
    };
  }
  async function b(F, X) {
    let date = new Date();
    let Me;
    try {
      Me = await w(F, date);
    } catch (error) {
      gatewayLog(
        "warn",
        `GET /api/oauth/usage: spend store read failed: ${errorMessage(error)} request_id=${X}`,
      );
      spendFault?.("check");
      return new Response("spend limit unavailable", {
        status: 503,
        headers: NO_STORE_HEADERS_2,
      });
    }
    return Response.json(toSpendRateLimits(Me, date), {
      headers: NO_STORE_HEADERS_2,
    });
  }
  function w(F, date) {
    let he = l.get(F.sub);
    if (he && date.getTime() - he.at < c) return he.caps;
    if (l.size >= 1e4) l.clear();
    let abortController = new AbortController();
    let ce = withTimeout(
      readSpendCaps(sql, F.sub, F.groups ?? [], admin.group_limit_mode, date, abortController.signal),
      MIN_ESTIMATE_OUTPUT_CHARS + 500,
      "spend usage read timed out",
    )
      .then((Ne) => Ne.caps)
      .catch((error) => {
        abortController.abort();
        throw error;
      });
    l.set(F.sub, {
      at: date.getTime(),
      caps: ce,
    });
    return ce;
  }
  function S(sub, requestId, binding, headers, ce) {
    gatewayJsonLog("spend.blocked", {
      request_id: requestId,
      sub,
      cause: binding ? "over_limit" : "store_error",
      ...(binding && {
        cap_cents: binding.cap_cents,
        source: binding.scope_type,
        period: binding.period,
      }),
      ...(ce && {
        groups: ce,
      }),
      ...(gatewayConfig.load_test_mode?.enabled && {
        load_test: true,
      }),
    });
    let Ne = binding
      ? binding.scope_type === "group_pool"
        ? groupBudgetExceededMessage(binding.resetsAt)
        : `spend limit reached (${binding.period}; resets ${binding.resetsAt.toISOString().slice(0, 16).replace("T", " ")} UTC)`
      : "spend limit unavailable";
    return Response.json(
      {
        type: "error",
        error: {
          type: "billing_error",
          message: admin.blocked_message ? `${Ne} \u2014 ${admin.blocked_message}` : Ne,
        },
      },
      {
        status: 429,
        headers: {
          ...headers,
          "x-should-retry": "false",
        },
      },
    );
  }
  function j(F) {
    let X = `${F.sub}\x00${F.email ?? ""}\x00${F.name ?? ""}\x00${(F.groups ?? []).join(",")}`;
    let he = s.get(X) ?? 0;
    if (Date.now() - he >= a) {
      if (s.size >= 1e4) s.clear();
      s.set(X, Date.now());
      m(
        upsertPrincipalIdentity(sql, F).catch((error) =>
          gatewayLog("warn", `identity record failed: ${errorMessage(error)}`),
        ),
      );
    }
  }
  function M(F, X, he, Me, ce, Ne, be, ve) {
    if (
      F.status < 400 &&
      ce !== null &&
      !hasKnownModelCost(Ne ?? "") &&
      !findPricingOverride(gatewayConfig.pricing, Me, ce, Ne)
    )
      N(ce);
    return meterResponseUsage(
      F,
      (Ue) =>
        gatewayConfig.load_test_mode?.enabled ? 0 : requestCostCents(ce, Ue, Ne, gatewayConfig.pricing, Me),
      (Ue) =>
        Promise.all([
          recordSpend(sql, X.sub, Ue).catch((error) => {
            gatewayLog("warn", `spend record failed: ${errorMessage(error)}`);
            spendFault?.("write");
          }),
          he !== null && spendFlusher(he, Ue),
        ]),
      be,
      ve,
      m,
    );
  }
  function N(F) {
    if (hasKnownModelCost(F) || r.has(F) || r.size >= 1000) return;
    r.add(F);
    gatewayLog(
      "warn",
      `spend meter has no exact rates for model '${F}' \u2014 metering at the unknown-model default tier`,
    );
  }
  async function Z() {
    while (u.size > 0) await Promise.all(u);
  }
  return {
    precheck: y,
    usage: b,
    meter: M,
    flush: Z,
  };
}
//@ chunk-1ny7cxrt.js:1451226-1451674 placement
/**
 * 花费状态转为客户端额度显示（extra_usage 与各周期 limits、严重程度）。
 */
function toSpendRateLimits(e, date = new Date()) {
  let mapped = e.map((r) => withLimitStatus(r, date));
  let o = mostSevereLimit(mapped);
  return {
    ...(o && {
      extra_usage: {
        is_enabled: true,
        monthly_limit: Number(o.cap_cents),
        used_credits: Math.floor(o.spent_cents),
        utilization: Math.round(roundUtilization(o) * 100),
        currency: "USD",
      },
    }),
    limits: mapped.map((r) => ({
      kind: "spend",
      group: r.period,
      percent: Math.round(roundUtilization(r) * 100),
      resets_at: r.resetsAt.toISOString(),
      severity: r.exceeded || r.utilization > 0.95 ? "critical" : r.utilization > 0.75 ? "warning" : "normal",
      is_active: r === o,
    })),
  };
}
//@ chunk-1ny7cxrt.js:1451674-1451847 placement
/**
 * 两个限额中取更严重的（超限优先，其次重置更晚或使用率更高）。
 */
function pickMoreSevereLimit(e, t) {
  if (e.exceeded !== t.exceeded) return e.exceeded ? e : t;
  if (e.exceeded) return e.resetsAt.getTime() > t.resetsAt.getTime() ? e : t;
  return e.utilization > t.utilization ? e : t;
}
export {
  DATA_PREFIX_LENGTH,
  CHARS_PER_OUTPUT_TOKEN,
  periodResetsAt,
  pickMoreSevereLimit,
  createSpendLimitAdmin,
  isSpendLimitsPath,
  handleSpendLimitAdmin,
};
