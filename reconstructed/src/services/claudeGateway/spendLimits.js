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
import { timingSafeEqual, timingSafeEqual as timingSafeEqual_2 } from "crypto";
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
import { accumulateSseUsage, finishSseUsage, parseJsonUsage, A1 } from "./usageMetering.js";
import { withTimeout } from "../../utils/sleep.js";
import { I1, withLimitStatus, $1, J0 } from "./mockRateLimits.js";
import { hasKnownModelCost } from "../../utils/modelCost.js";
import { findPricingOverride, requestCostCents } from "./models.js";

/**
 * 管理 API 响应头与 HTTP 状态到错误类型的映射。
 */
//@ chunk-1ny7cxrt.js:1423402-1423544 placement
var NO_STORE_HEADERS = { "Cache-Control": "no-store" },
  ADMIN_ERROR_TYPE_BY_STATUS = {
    400: "invalid_request_error",
    401: "authentication_error",
    403: "permission_error",
    404: "not_found_error",
  };
/**
 * 管理 API 错误响应（Anthropic 错误格式）。
 */
//@ chunk-1ny7cxrt.js:1423544-1423654 placement
function adminErrorResponse(e, t, n) {
  return Response.json(
    { type: "error", error: { type: ADMIN_ERROR_TYPE_BY_STATUS[e], message: t }, request_id: n },
    { status: e },
  );
}
/**
 * 解析 limit 参数（1–1000），非法返回 null。
 */
//@ chunk-1ny7cxrt.js:1423654-1423761 placement
function parsePageLimit(e, t) {
  let n = Number(e.get("limit") ?? t);
  if (!Number.isInteger(n) || n < 1 || n > 1000) return null;
  return n;
}
//@ chunk-1ny7cxrt.js:1423761-1423797 placement
var yl = ["daily", "weekly", "monthly"];
/**
 * 周期桶键：monthly 为 YYYY-MM，daily 为 YYYY-MM-DD，weekly 为 ISO 周 YYYY-Www。
 */
//@ chunk-1ny7cxrt.js:1423797-1424192 placement
function periodBucket(e = "monthly", t = new Date()) {
  if (e === "monthly") return t.toISOString().slice(0, 7);
  if (e === "daily") return t.toISOString().slice(0, 10);
  let date = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate())),
    o = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - o);
  let uTCFullYear = date.getUTCFullYear(),
    UTC = Date.UTC(uTCFullYear, 0, 1),
    ceil = Math.ceil(((date.getTime() - UTC) / 86400000 + 1) / 7);
  return `${uTCFullYear}-W${String(ceil).padStart(2, "0")}`;
}
/**
 * 当前周期的重置时间（下月 1 日、次日或下周一，UTC）。
 */
//@ chunk-1ny7cxrt.js:1424192-1424442 placement
function periodResetsAt(e, t = new Date()) {
  let uTCFullYear = t.getUTCFullYear(),
    uTCMonth = t.getUTCMonth(),
    uTCDate = t.getUTCDate();
  if (e === "monthly") return new Date(Date.UTC(uTCFullYear, uTCMonth + 1, 1));
  if (e === "daily") return new Date(Date.UTC(uTCFullYear, uTCMonth, uTCDate + 1));
  let s = 8 - (t.getUTCDay() || 7);
  return new Date(Date.UTC(uTCFullYear, uTCMonth, uTCDate + s));
}
//@ chunk-1ny7cxrt.js:1424442-1424498 placement
function Wg(e) {
  return e.toFixed(3).replace(/\.?0+$/, "");
}
/**
 * 作用域类型与 id 转为 scope 对象（user/rbac_group/organization）。
 */
//@ chunk-1ny7cxrt.js:1424498-1424657 placement
function toSpendScope(e, t) {
  if (e === "user") return { type: "user", user_id: t ?? "" };
  if (e === "rbac_group") return { type: "rbac_group", rbac_group_id: t ?? "" };
  return { type: "organization" };
}
/**
 * SQL：各周期的上限（caps_by_period）与该主体当前花费。
 */
//@ chunk-1ny7cxrt.js:1424657-1425255 placement
function queryCapsWithSpend(e, t, n, o, r = new Date()) {
  let mapped = yl.map((a) => periodBucket(a, r));
  return e`
    WITH pb AS (
      SELECT period, bucket, ordinality AS ord
      FROM unnest(${e.array([...yl], "TEXT")}, ${e.array(mapped, "TEXT")})
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
/**
 * SQL：用户所在组启用的月度共享预算与已用额度。
 */
//@ chunk-1ny7cxrt.js:1425255-1425708 placement
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
/**
 * 在一个短超时事务中读取个人上限与组共享预算。
 */
//@ chunk-1ny7cxrt.js:1425708-1426207 placement
async function readSpendCaps(e, t, n, o, r, s, a = []) {
  let reserve = await e.reserve();
  try {
    s?.throwIfAborted();
    let [c, u, f, , h, m] = await Promise.allSettled([
      reserve`BEGIN`,
      reserve`SET LOCAL statement_timeout = '2s'`,
      queryCapsWithSpend(reserve, t, n, o, r),
      a.length > 0 ? reserve`SET LOCAL statement_timeout = '300ms'` : [],
      a.length > 0 ? queryPooledBudgets(reserve, a, r) : [],
      reserve`COMMIT`,
    ]);
    for (let y of [c, u]) if (y.status === "rejected") throw y.reason;
    if (f.status === "rejected") throw f.reason;
    if (m.status === "rejected") throw m.reason;
    return { caps: f.value, pools: h };
  } finally {
    Promise.resolve(reserve.release()).catch(() => {});
  }
}
/**
 * 按各周期桶累加主体花费（语句超时时重试一次）。
 */
//@ chunk-1ny7cxrt.js:1426207-1426727 placement
async function recordSpend(e, t, n) {
  let mapped = yl.map((s) => periodBucket(s)),
    r = () =>
      e.begin(async (s) => {
        (await s`SET LOCAL statement_timeout = '2s'`,
          await s`
        INSERT INTO spend (principal, period, cents)
        SELECT DISTINCT ${t}, b, ${n}
        FROM unnest(${e.array(mapped, "TEXT")}) AS t(b)
        ORDER BY 2
        ON CONFLICT (principal, period) DO UPDATE
          SET cents = spend.cents + EXCLUDED.cents, updated_at = now()
      `);
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
/**
 * 累加各组本月共享预算花费。
 */
//@ chunk-1ny7cxrt.js:1426727-1427155 placement
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
/**
 * 记录主体的邮箱、姓名与所属组。
 */
//@ chunk-1ny7cxrt.js:1427155-1427601 placement
async function upsertPrincipalIdentity(e, t) {
  let n = t.email || null,
    o = t.name || null,
    r = t.groups ?? [];
  await e.begin(async (s) => {
    (await s`SET LOCAL statement_timeout = '2s'`,
      await s`
      INSERT INTO principal_emails ${e({ principal: t.sub, email: n, name: o, groups: r })}
      ON CONFLICT (principal) DO UPDATE SET
        email = coalesce(${n}, principal_emails.email),
        name = coalesce(${o}, principal_emails.name),
        groups = ${r},
        updated_at = now()
    `);
  });
}
/**
 * 写一条管理审计记录。
 */
//@ chunk-1ny7cxrt.js:1427601-1427775 placement
async function insertAdminAudit(e, t) {
  await e`INSERT INTO admin_audit ${e({ actor: t.actor, action: t.action, target: t.target, before: t.before ?? null, after: t.after ?? null, reason: t.reason ?? null })}`;
}
/**
 * SQL 片段：周期与当前桶的列表。
 */
//@ chunk-1ny7cxrt.js:1427775-1427999 placement
function periodBucketsSql(e, t = yl, n = new Date()) {
  let mapped = t.map((r) => periodBucket(r, n));
  return e`
    SELECT period, bucket, ordinality AS ord
    FROM unnest(${e.array([...t], "TEXT")}, ${e.array(mapped, "TEXT")})
      WITH ORDINALITY AS t(period, bucket)
  `;
}
/**
 * GET …/effective：按用户（或分页列出）返回各周期的生效上限、来源与已用额度，支持搜索与按花费排序。
 */
//@ chunk-1ny7cxrt.js:1427999-1428996 placement
async function handleEffectiveLimits({ url: url, sql: sql, requestId: requestId }, o) {
  let searchParams = url.searchParams,
    s = parsePageLimit(searchParams, 20);
  if (s === null) return adminErrorResponse(400, "limit: must be between 1 and 1000", requestId);
  let a = parsePeriods(searchParams);
  if (a === null)
    return adminErrorResponse(400, "period[]: must be one of daily, weekly, monthly", requestId);
  let all = searchParams.getAll("user_ids[]");
  if (all.length > 100)
    return adminErrorResponse(400, "user_ids[]: at most 100 entries per request", requestId);
  let c = searchParams.get("q");
  if (c !== null && c.length > 256) return adminErrorResponse(400, "q: too long", requestId);
  let u = searchParams.get("sort");
  if (u !== null && u !== "spend_desc") return adminErrorResponse(400, "sort: must be spend_desc", requestId);
  let f = u === "spend_desc";
  if (f && a.length !== 1)
    return adminErrorResponse(400, "sort=spend_desc requires exactly one period[]", requestId);
  if (all.length > 0) {
    let S = await queryEffectiveLimits(sql, all, a, o);
    return Response.json({ data: S, next_page: null }, { headers: NO_STORE_HEADERS });
  }
  let h = searchParams.get("page"),
    m;
  if (h !== null) {
    if (((m = decodePageToken(h, f)), m === void 0))
      return adminErrorResponse(400, "page: invalid page token", requestId);
  }
  let y = c === null ? null : `%${Pbe(c)}%`,
    b = f
      ? await listPrincipalsBySpend(sql, periodBucket(a[0]), m, y, s)
      : await listPrincipals(sql, m, y, s),
    w = await queryEffectiveLimits(sql, b.subs, a, o);
  return Response.json({ data: w, next_page: b.nextToken }, { headers: NO_STORE_HEADERS });
}
/**
 * 解析 period[] 参数（默认全部，非法返回 null）。
 */
//@ chunk-1ny7cxrt.js:1428996-1429183 placement
function parsePeriods(e) {
  let all = e.getAll("period[]");
  if (all.length === 0) return yl;
  let n = [];
  for (let o of all) {
    if (o !== "daily" && o !== "weekly" && o !== "monthly") return null;
    if (!n.includes(o)) n.push(o);
  }
  return n;
}
//@ chunk-1ny7cxrt.js:1429183-1429270 placement
var wbe = DoctorLazy(() => create({ p: create_2(), s: create_9().optional() })),
  Obe = DoctorLazy(() => create({ p: create_2(), c: create_3(), s: create_25(!0) }));
//@ chunk-1ny7cxrt.js:1429270-1429345 placement
function d1(e) {
  return Buffer.from(JSON.stringify(e)).toString("base64url");
}
/**
 * 解码分页令牌（base64url JSON）。
 */
//@ chunk-1ny7cxrt.js:1429345-1429467 placement
function decodePageToken(e, t) {
  let n = t ? Obe() : wbe();
  try {
    return n.parse(JSON.parse(Buffer.from(e, "base64url").toString()));
  } catch {
    return;
  }
}
/**
 * 按花费降序分页列出主体（游标）。
 */
//@ chunk-1ny7cxrt.js:1429467-1430102 placement
async function listPrincipalsBySpend(e, t, n, o, r) {
  let s = n?.p ?? null,
    a = n?.s === !0 ? n.c : null,
    l = await e`
    SELECT s.principal, s.cents FROM spend s
    LEFT JOIN principal_emails e ON e.principal = s.principal
    WHERE s.period = ${t}
      AND (${a}::float8 IS NULL
           OR s.cents < ${a}
           OR (s.cents = ${a} AND s.principal > ${s}))
      AND (${o}::text IS NULL OR s.principal ILIKE ${o}
           OR e.email ILIKE ${o} OR e.name ILIKE ${o})
    ORDER BY s.cents DESC, s.principal LIMIT ${r + 1}
  `,
    c = l.length > r,
    sliced = l.slice(0, r),
    at = sliced.at(-1);
  return {
    subs: sliced.map((h) => h.principal),
    nextToken: c && at !== void 0 ? d1({ p: at.principal, c: at.cents, s: !0 }) : null,
  };
}
/**
 * 按主体名分页列出（可搜索）。
 */
//@ chunk-1ny7cxrt.js:1430102-1430598 placement
async function listPrincipals(e, t, n, o) {
  let r = t?.p ?? null,
    s = await e`
    SELECT s.principal FROM spend s
    LEFT JOIN principal_emails e ON e.principal = s.principal
    WHERE (${r}::text IS NULL OR s.principal > ${r})
      AND (${n}::text IS NULL OR s.principal ILIKE ${n}
           OR e.email ILIKE ${n} OR e.name ILIKE ${n})
    GROUP BY s.principal ORDER BY s.principal LIMIT ${o + 1}
  `,
    sliced = s.map((u) => u.principal).slice(0, o),
    l = s.length > o,
    at = sliced.at(-1);
  return { subs: sliced, nextToken: l && at !== void 0 ? d1({ p: at }) : null };
}
//@ chunk-1ny7cxrt.js:1430598-1430656 placement
function Pbe(e) {
  return e.replace(/[\\%_]/g, (t) => `\\${t}`);
}
/**
 * 查询一批主体在各周期的生效上限与花费。
 */
//@ chunk-1ny7cxrt.js:1430656-1431483 placement
async function queryEffectiveLimits(e, t, n, o) {
  if (t.length === 0) return [];
  return (
    await e`
    WITH p AS (
      SELECT principal, ordinality AS ord
      FROM unnest(${e.array(t, "TEXT")}) WITH ORDINALITY AS t(principal)
    ),
    per AS (${periodBucketsSql(e, n)})
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
/**
 * 查询行转为生效上限 API 对象。
 */
//@ chunk-1ny7cxrt.js:1431483-1431850 placement
function toEffectiveLimit(e) {
  let t = e.scope_type === null ? null : toSpendScope(e.scope_type, e.scope_id);
  return {
    scope: { type: "user", user_id: e.principal },
    groups: e.groups ?? [],
    actor: {
      type: "user_actor",
      user_id: e.principal,
      name: e.name ?? null,
      email_address: e.email ?? null,
      deleted: !1,
    },
    amount: e.amount,
    currency: "USD",
    period: e.period,
    source: t,
    spend_limit_id: e.spend_limit_id,
    period_to_date_spend: Wg(e.cents),
  };
}
//@ chunk-1ny7cxrt.js:1431850-1431890 placement
var Na = "/v1/organizations/spend_limits";
//@ chunk-1ny7cxrt.js:1431890-1431943 placement
function q0(e) {
  return e === Na || e.startsWith(`${Na}/`);
}
/**
 * 处理花费限额管理 API 请求（分配 request-id、记录日志）；路径不匹配返回 null。
 */
//@ chunk-1ny7cxrt.js:1431943-1432263 placement
async function handleSpendLimitAdmin(e, t, n, o, r, s, a = "min") {
  if (!q0(t.pathname)) return null;
  let l = `req_${crypto.randomUUID().replace(/-/g, "")}`,
    c = await routeSpendLimitAdmin({
      req: e,
      url: t,
      sql: n,
      keys: o,
      requestId: l,
      oidcAdmin: r,
      clientIp: s,
      groupLimitMode: a,
    });
  return (
    c.headers.set("request-id", l),
    gatewayLog("info", `admin ${e.method} ${t.pathname} -> ${c.status} (${l})`),
    c
  );
}
/**
 * 管理 API 路由：认证（admin key 或 OIDC 管理员）后分发 effective/audit/列表/创建/查询/删除。
 */
//@ chunk-1ny7cxrt.js:1432263-1433100 placement
async function routeSpendLimitAdmin({
  req: req,
  url: url,
  sql: sql,
  keys: keys,
  requestId: requestId,
  oidcAdmin: oidcAdmin,
  clientIp: clientIp,
  groupLimitMode: groupLimitMode,
}) {
  let pathname = url.pathname,
    method = req.method,
    f = req.headers.get("x-api-key"),
    h = authenticateAdmin(f, keys, oidcAdmin);
  if (!h)
    return (
      gatewayJsonLog("admin.denied", {
        reason: f ? "invalid_key" : req.headers.get("authorization") ? "bearer_rejected" : "no_credentials",
        method: method,
        path: pathname,
        client_ip: clientIp ?? null,
      }),
      adminErrorResponse(401, "missing or invalid admin credentials", requestId)
    );
  let m = { req: req, url: url, sql: sql, requestId: requestId, auth: h };
  if (pathname === `${Na}/effective` && method === "GET") return handleEffectiveLimits(m, groupLimitMode);
  if (pathname === `${Na}/audit` && method === "GET") return handleAuditList(m);
  if (pathname === Na && method === "GET") return handleListSpendLimits(m);
  if (pathname === Na && method === "POST") return handleUpsertSpendLimit(m);
  if (pathname.startsWith(`${Na}/`)) {
    let y;
    try {
      y = decodeURIComponent(pathname.slice(Na.length + 1));
    } catch {
      return adminErrorResponse(400, "malformed spend limit id", requestId);
    }
    if (method === "GET") return handleGetSpendLimit(m, y);
    if (method === "DELETE") return handleDeleteSpendLimit(m, y);
    return adminErrorResponse(404, "not found", requestId);
  }
  return adminErrorResponse(404, "not found", requestId);
}
/**
 * 用 x-api-key（读/写密钥）或 OIDC 管理员身份认证，返回 {canWrite, actor}。
 */
//@ chunk-1ny7cxrt.js:1433100-1433345 placement
function authenticateAdmin(e, t, n) {
  if (!e) return n ? { canWrite: !0, actor: `oidc:${n.sub}` } : null;
  let o = matchAdminKey(e, t.writeKeys),
    r = matchAdminKey(e, t.readKeys);
  if (o !== void 0) return { canWrite: !0, actor: `admin-key:${o}` };
  if (r !== void 0) return { canWrite: !1, actor: `admin-key:${r}` };
  return null;
}
/**
 * 常数时间比较 API key，返回匹配的密钥 id。
 */
//@ chunk-1ny7cxrt.js:1433345-1433475 placement
function matchAdminKey(e, t) {
  let buffer = Buffer.from(e),
    o;
  for (let r of t) {
    let buffer_2 = Buffer.from(r.key);
    if (buffer_2.length === buffer.length && timingSafeEqual_2(buffer, buffer_2)) o = r.id;
  }
  return o;
}
/**
 * GET …/audit：分页列出审计事件。
 */
//@ chunk-1ny7cxrt.js:1433475-1434197 placement
async function handleAuditList({ url: url, sql: sql, requestId: requestId }) {
  let o = parsePageLimit(url.searchParams, 100);
  if (o === null) return adminErrorResponse(400, "limit: must be between 1 and 1000", requestId);
  let r = url.searchParams.get("after_id");
  if (r !== null && !/^\d{1,18}$/.test(r))
    return adminErrorResponse(400, "after_id: must be an audit event id", requestId);
  let s = await sql`
    SELECT id, at, actor, action, target, before, after, reason
    FROM admin_audit
    WHERE (${r}::bigint IS NULL OR id < ${r}::bigint)
    ORDER BY id DESC LIMIT ${o + 1}
  `,
    a = s.length > o;
  return Response.json(
    {
      data: s
        .slice(0, o)
        .map((l) => ({
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
      has_more: a,
    },
    { headers: NO_STORE_HEADERS },
  );
}
/**
 * GET 列表：按作用域类型筛选、after_id/before_id 分页。
 */
//@ chunk-1ny7cxrt.js:1434197-1435599 placement
async function handleListSpendLimits({ url: url, sql: sql, requestId: requestId }) {
  let searchParams = url.searchParams,
    r = parsePageLimit(searchParams, 20);
  if (r === null) return adminErrorResponse(400, "limit: must be between 1 and 1000", requestId);
  let s = searchParams.get("scope_type");
  if (s !== null && s !== "organization" && s !== "rbac_group" && s !== "user")
    return adminErrorResponse(400, "scope_type: must be one of organization, rbac_group, user", requestId);
  let a = searchParams.get("after_id"),
    l = searchParams.get("before_id");
  if (a !== null && l !== null)
    return adminErrorResponse(400, "after_id and before_id are mutually exclusive", requestId);
  let c = a ?? l,
    u;
  if (c !== null) {
    if (
      ((u = (await sql`SELECT created_at::text AS created_at, id FROM spend_limits WHERE id = ${c}`)[0]), !u)
    )
      return adminErrorResponse(
        400,
        `${a !== null ? "after_id" : "before_id"}: no spend limit with this id`,
        requestId,
      );
  }
  let f = r + 1,
    h,
    m;
  if (l !== null && u) {
    let b = await sql`
      SELECT * FROM spend_limits
      WHERE (created_at, id) < (${u.created_at}::timestamptz, ${u.id})
        AND (${s}::text IS NULL OR scope_type = ${s})
      ORDER BY created_at DESC, id DESC LIMIT ${f}
    `;
    ((h = b.length > r), (m = b.slice(0, r).reverse().map(toSpendLimit)));
  } else {
    let b = u?.created_at ?? null,
      w = await sql`
      SELECT * FROM spend_limits
      WHERE (${b}::timestamptz IS NULL
             OR (created_at, id) > (${b}::timestamptz, ${u?.id ?? null}))
        AND (${s}::text IS NULL OR scope_type = ${s})
      ORDER BY created_at, id LIMIT ${f}
    `;
    ((h = w.length > r), (m = w.slice(0, r).map(toSpendLimit)));
  }
  let y = await withPooledSpend(sql, m);
  return Response.json(
    { data: y, has_more: h, first_id: y[0]?.id ?? null, last_id: y.at(-1)?.id ?? null },
    { headers: NO_STORE_HEADERS },
  );
}
/**
 * POST：创建或更新花费限额（含组共享预算校验），加锁事务内写入并审计。
 */
//@ chunk-1ny7cxrt.js:1435599-1438096 placement
async function handleUpsertSpendLimit({ req: req, sql: sql, requestId: requestId, auth: auth }) {
  if (!auth.canWrite) return adminErrorResponse(403, "requires write:spend_limits", requestId);
  let r = await parseUpsertBody(req, requestId);
  if (r instanceof Response) return r;
  let { scope: scope, period: period } = r;
  if (r.amount === void 0 && !r.pooled_budget) return adminErrorResponse(400, "amount: Required", requestId);
  let l = r.pooled_budget ?? {};
  if (l.paused === !1 || (l.amount ?? null) !== null) {
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
  let c = scopeId(scope),
    u = `spend_limits:${scope.type}:${c}:${period}`,
    f = {
      id: `spl_${crypto.randomUUID().replace(/-/g, "")}`,
      scope_type: scope.type,
      scope_id: c,
      period: period,
      created_by: auth.actor,
    },
    begin = await sql.begin(async (w) => {
      await w`SELECT pg_advisory_xact_lock(hashtext(${u}))`;
      let [S] = await w`
      SELECT * FROM spend_limits
      WHERE scope_type = ${scope.type} AND scope_id = ${c} AND period = ${period}
      FOR UPDATE
    `,
        j = S && toSpendLimit(S),
        M = r.amount === void 0 ? j?.amount : r.amount;
      if (M === void 0)
        return "This spend limit doesn't exist yet, so it needs amount (each member's own limit). Set amount; it may equal pooled_budget.amount.";
      let N = j?.pooled_budget,
        Z = l.amount === void 0 ? (N?.amount ?? null) : l.amount,
        F = l.paused ?? N?.paused ?? Z === null;
      if (!F) {
        if (Z === null)
          return "A pooled budget that isn't paused needs an amount. Set pooled_budget.amount, or set pooled_budget.paused to true.";
        if (M === null)
          return "A pooled budget that isn't paused needs amount (each member's own limit) on the same spend limit. Set amount; it may equal pooled_budget.amount.";
      }
      let X = { pooled_limit_enabled: !F, pooled_monthly_credit_limit: Z },
        [he] = await w`
      INSERT INTO spend_limits ${w({ ...f, amount: M, ...X })}
      ON CONFLICT (scope_type, scope_id, period) DO UPDATE
        SET amount = ${M},
            pooled_limit_enabled = ${X.pooled_limit_enabled},
            pooled_monthly_credit_limit = ${X.pooled_monthly_credit_limit},
            updated_at = now()
      RETURNING *
    `,
        Me = toSpendLimit(he);
      return (
        await insertAdminAudit(w, {
          actor: auth.actor,
          action: "spend_limit.upsert",
          target: Me.id,
          before: j ?? null,
          after: Me,
        }),
        { before: j, after: Me, json: (await withPooledSpend(w, [Me]))[0] }
      );
    });
  if (typeof begin === "string") return adminErrorResponse(400, begin, requestId);
  let { before: before, after: after, json: json } = begin;
  return (
    gatewayJsonLog("admin.limit.upsert", {
      actor: auth.actor,
      target: after.id,
      scope_type: scope.type,
      scope_id: c,
      period: period,
      ...(before !== void 0 && { before_amount: before.amount }),
      amount: after.amount,
      ...(before?.pooled_budget !== void 0 && { before_pooled_budget: before.pooled_budget }),
      ...(after.pooled_budget !== void 0 && { pooled_budget: after.pooled_budget }),
    }),
    Response.json(json)
  );
}
/**
 * GET 单个花费限额。
 */
//@ chunk-1ny7cxrt.js:1438096-1438429 placement
async function handleGetSpendLimit({ sql: sql, requestId: requestId }, n) {
  let r = (
    await sql`
    SELECT id, scope_type, scope_id, amount, period, currency, pooled_limit_enabled, pooled_monthly_credit_limit, created_at, updated_at FROM spend_limits WHERE id = ${n}
  `
  )[0];
  return r
    ? Response.json((await withPooledSpend(sql, [toSpendLimit(r)]))[0], { headers: NO_STORE_HEADERS })
    : adminErrorResponse(404, "spend limit not found", requestId);
}
/**
 * DELETE 花费限额并审计。
 */
//@ chunk-1ny7cxrt.js:1438429-1439096 placement
async function handleDeleteSpendLimit({ sql: sql, requestId: requestId, auth: auth }, o) {
  if (!auth.canWrite) return adminErrorResponse(403, "requires write:spend_limits", requestId);
  let begin = await sql.begin(async (s) => {
    let l = (
      await s`
      DELETE FROM spend_limits WHERE id = ${o} RETURNING id, scope_type, scope_id, amount, period, currency, pooled_limit_enabled, pooled_monthly_credit_limit, created_at, updated_at
    `
    )[0];
    if (!l) return !1;
    return (
      await insertAdminAudit(s, {
        actor: auth.actor,
        action: "spend_limit.delete",
        target: o,
        before: toSpendLimit(l),
      }),
      l
    );
  });
  if (begin)
    return (
      gatewayJsonLog("admin.limit.delete", {
        actor: auth.actor,
        target: o,
        scope_type: begin.scope_type,
        scope_id: begin.scope_id,
        period: begin.period,
      }),
      Response.json({ type: "spend_limit_deleted", id: o })
    );
  return adminErrorResponse(404, "spend limit not found", requestId);
}
/**
 * 金额（分）字符串 schema 与创建请求体 schema。
 */
//@ chunk-1ny7cxrt.js:1439096-1439575 placement
var CENTS_STRING_SCHEMA = DoctorLazy(() =>
    create_2()
      .regex(/^\d{1,18}$/, "must be a whole-number decimal string of cents")
      .nullable(),
  ),
  UPSERT_SPEND_LIMIT_SCHEMA = DoctorLazy(() =>
    create({
      scope: create_17("type", [
        create({ type: create_25("user"), user_id: create_2().min(1) }),
        create({ type: create_25("rbac_group"), rbac_group_id: create_2().min(1) }),
        create({ type: create_25("organization") }),
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
/**
 * 把第一个校验错误格式化为 “路径: 信息”。
 */
//@ chunk-1ny7cxrt.js:1439575-1439707 placement
function formatZodIssue(e) {
  let t = e.issues[0];
  if (!t) return "invalid request body";
  let joined = t.path.join(".");
  return joined ? `${joined}: ${t.message}` : t.message;
}
/**
 * 解析并校验请求体，失败返回错误响应。
 */
//@ chunk-1ny7cxrt.js:1439707-1439873 placement
async function parseUpsertBody(e, t) {
  let n;
  try {
    n = await e.json();
  } catch {
    return adminErrorResponse(400, "invalid JSON body", t);
  }
  let safeParse = UPSERT_SPEND_LIMIT_SCHEMA().safeParse(n);
  return safeParse.success ? safeParse.data : adminErrorResponse(400, formatZodIssue(safeParse.error), t);
}
/**
 * 作用域 id（用户 id、组 id 或空串）。
 */
//@ chunk-1ny7cxrt.js:1439873-1440000 placement
function scopeId(e) {
  switch (e.type) {
    case "user":
      return e.user_id;
    case "rbac_group":
      return e.rbac_group_id;
    case "organization":
      return "";
  }
}
/**
 * 数据库行转为花费限额对象（组月度限额带共享预算）。
 */
//@ chunk-1ny7cxrt.js:1440000-1440375 placement
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
            : { amount: e.pooled_monthly_credit_limit, paused: !e.pooled_limit_enabled },
      }),
    created_at: e.created_at.toISOString(),
    updated_at: e.updated_at.toISOString(),
  };
}
/**
 * 为花费限额 API 对象补上共享预算本月已用额度。
 */
//@ chunk-1ny7cxrt.js:1440375-1441013 placement
async function withPooledSpend(e, t) {
  let mapped = t.filter((s) => s.pooled_budget).map((s) => scopeId(s.scope)),
    o =
      mapped.length === 0
        ? []
        : await e`
          SELECT rbac_group_id, cents FROM pooled_spend
          WHERE period = ${periodBucket("monthly")}
            AND rbac_group_id = ANY(${e.array(mapped, "TEXT")})
        `,
    r = new Map(o.map((s) => [s.rbac_group_id, s.cents]));
  return t.map((s) => ({
    type: "spend_limit",
    id: s.id,
    created_at: s.created_at,
    updated_at: s.updated_at,
    scope: s.scope,
    amount: s.amount,
    currency: s.currency,
    period: s.period,
    ...(s.pooled_budget !== void 0 && {
      pooled_budget: s.pooled_budget && {
        ...s.pooled_budget,
        currency: s.currency,
        period_to_date_spend: Wg(r.get(scopeId(s.scope)) ?? 0),
      },
    }),
  }));
}
/**
 * 从用户所在组的共享预算中选出仍有余额的那个（按上限从大到小），否则返回全部已用尽。
 */
//@ chunk-1ny7cxrt.js:1441013-1441192 placement
function pickPayingPool(e) {
  let [t, ...n] = e.toSorted((s, a) => a.limit - s.limit || (s.group < a.group ? -1 : 1));
  if (!t) return null;
  let o = [t, ...n],
    found = o.find((s) => s.spent < s.limit);
  return found ? { pays: found } : { usedUp: o };
}
//@ chunk-1ny7cxrt.js:1441192-1441206 placement
var Ube = 30000;
/**
 * 合并累加花费并串行写入；写入耗时过长时回调提醒。
 */
//@ chunk-1ny7cxrt.js:1441206-1441429 placement
function createSpendFlusher(e, t, n = () => performance.now()) {
  let o = new Map(),
    r;
  return async (s, a) => {
    if ((o.set(s, (o.get(s) ?? 0) + a), r !== void 0)) {
      if (n() - r >= Ube) ((r = n()), t());
      return;
    }
    try {
      while (o.size > 0) {
        let l = o;
        ((o = new Map()), (r = n()), await e(l));
      }
    } finally {
      r = void 0;
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
/**
 * 组预算超限的提示（含重置日期）。
 */
//@ chunk-1ny7cxrt.js:1441549-1441772 placement
function groupBudgetExceededMessage(e) {
  return `This request exceeds your group's budget. Ask your organization's admins to raise it, or try again after it resets on ${MONTH_NAMES[e.getUTCMonth()]} ${e.getUTCDate()} at ${e.toISOString().slice(11, 16)} UTC.`;
}
/**
 * 包装上游响应流：边转发边解析用量，流结束/出错/取消时计算花费并记录。
 */
//@ chunk-1ny7cxrt.js:1441772-1442381 placement
function meterResponseUsage(e, t, n, o = null, r, s = () => {}) {
  if (!e.body || e.status >= 400) return e;
  let included = (e.headers.get("content-type") ?? "").includes("text/event-stream"),
    reader = e.body.getReader(),
    c = createUsageAccumulator(included, o, r),
    u = !1;
  async function f() {
    if (u) return;
    u = !0;
    try {
      let usage = await c.usage();
      if (usage) await n(t(usage));
    } catch (error) {
      gatewayLog("warn", `usage metering failed: ${errorMessage(error)}`);
    }
  }
  let readableStream = new ReadableStream({
    async pull(m) {
      try {
        let read = await reader.read();
        if (read.done) {
          (s(f()), m.close());
          return;
        }
        (c.push(read.value), m.enqueue(read.value));
      } catch (error) {
        (s(f()), m.error(error));
      }
    },
    async cancel(m) {
      (s(f()), await reader.cancel(m));
    },
  });
  return new Response(readableStream, { status: e.status, statusText: e.statusText, headers: e.headers });
}
//@ chunk-1ny7cxrt.js:1442381-1442396 placement
var _1 = 8388608;
/**
 * 用量累加器：SSE 按事件解析，非流式解析 JSON；无用量时按输出字节估算。
 */
//@ chunk-1ny7cxrt.js:1442396-1442912 placement
function createUsageAccumulator(e, t, n) {
  let textDecoder = new TextDecoder();
  if (e) {
    let l = "",
      c = createSseUsageState();
    return {
      push(u) {
        l += textDecoder.decode(u, { stream: !0 });
        let parts = l.split(Bbe);
        l = parts.pop() ?? "";
        for (let h of parts) accumulateSseUsage(c, h);
        if (l.length > _1) l = "";
      },
      async usage() {
        if (l !== "") (accumulateSseUsage(c, l), (l = ""));
        return finishSseUsage(c);
      },
    };
  }
  let r = "",
    s = 0,
    a = !1;
  return {
    push(l) {
      let decode = textDecoder.decode(l, { stream: !0 });
      if (((s += decode.length), a)) return;
      if (((r += decode), r.length > _1)) ((a = !0), (r = ""));
    },
    async usage() {
      let l = a ? null : parseJsonUsage(r);
      if (l) return l;
      if (s === 0) return null;
      return {
        input_tokens: (await t?.().catch(() => null)) ?? 0,
        output_tokens: Math.ceil(s / S1),
        speed: n,
      };
    },
  };
}
//@ chunk-1ny7cxrt.js:1442912-1442945 placement
var Bbe = /\r?\n\r?\n/,
  S1 = 4,
  Hbe = 80;
/**
 * SSE 用量解析器的初始状态（usage 0、是否见到、估算输出字符）。旧版名 getParentCacheSuppressReason 为错配，归错文件。
 */
//@ chunk-1ny7cxrt.js:1442945-1443051 placement = getParentCacheSuppressReason (0.426)
function createSseUsageState() {
  return { usage: { input_tokens: 0, output_tokens: 0 }, seen: !1, estOutputChars: 0, sawOutputTokens: !1 };
}
//@ chunk-1ny7cxrt.js:1446994-1450809 placement
function createSpendLimitAdmin(e, t, n) {
  if (!t.admin) return null;
  let admin = t.admin,
    r = new Set(),
    s = new Map(),
    a = 900000,
    l = new Map(),
    c = 2000,
    u = new Set(),
    NEGATIVE_INFINITY = Number.NEGATIVE_INFINITY,
    h = createSpendFlusher(
      (F) =>
        recordPooledSpend(e, F).catch((X) => {
          (gatewayLog(
            "warn",
            `pooled spend record failed, so this spend is missing from group budgets: ${errorMessage(X)}`,
          ),
            n?.("write"));
        }),
      () =>
        gatewayLog(
          "warn",
          "a write to pooled_spend has not returned after 30 s, so this replica is not counting spend toward group budgets. The unsaved spend is held in memory and lost if the replica stops. Look for a lock on pooled_spend or a dead database connection",
        ),
    );
  function m(F) {
    (u.add(F), F.finally(() => u.delete(F)));
  }
  async function y(F, X) {
    let date = new Date(),
      abortController = new AbortController(),
      ce = withTimeout(
        readSpendCaps(
          e,
          F.sub,
          F.groups ?? [],
          admin.group_limit_mode,
          date,
          abortController.signal,
          F.groups,
        ),
        A1 + 500,
        "spend precheck timed out",
      );
    j(F);
    let Ne;
    try {
      Ne = await ce;
    } catch (error) {
      if (
        (abortController.abort(),
        gatewayLog("warn", `spend check failed: ${errorMessage(error)}`),
        n?.("check"),
        !t.enforcement.fail_closed_on_error)
      )
        return { blocked: null, headers: {}, payingGroup: null };
      return {
        blocked: S(F.sub, X, null, { "anthropic-ratelimit-unified-overage-disabled-reason": "fetch_error" }),
      };
    }
    let { binding: binding, headers: headers } = I1(Ne.caps, date);
    if (binding?.exceeded) return { blocked: S(F.sub, X, binding, headers) };
    if (Ne.pools.status === "rejected") {
      if (date.getTime() - NEGATIVE_INFINITY >= 60000)
        ((NEGATIVE_INFINITY = date.getTime()),
          gatewayLog(
            "warn",
            `pooled spend check failed, so group budgets are not enforced (developers' own caps are). Logged at most once a minute: ${errorMessage(Ne.pools.reason)}`,
          ));
      return (n?.("check"), { blocked: null, headers: headers, payingGroup: null });
    }
    let Ue = pickPayingPool(Ne.pools.value);
    if (Ue && "usedUp" in Ue) {
      let kt = I1(
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
          X,
          kt.binding,
          kt.headers,
          Ue.usedUp.map((je) => je.group),
        ),
      };
    }
    return { blocked: null, headers: headers, payingGroup: Ue?.pays.group ?? null };
  }
  async function b(F, X) {
    let date = new Date(),
      Me;
    try {
      Me = await w(F, date);
    } catch (error) {
      return (
        gatewayLog(
          "warn",
          `GET /api/oauth/usage: spend store read failed: ${errorMessage(error)} request_id=${X}`,
        ),
        n?.("check"),
        new Response("spend limit unavailable", { status: 503, headers: NO_STORE_HEADERS })
      );
    }
    return Response.json(toSpendRateLimits(Me, date), { headers: NO_STORE_HEADERS });
  }
  function w(F, X) {
    let he = l.get(F.sub);
    if (he && X.getTime() - he.at < c) return he.caps;
    if (l.size >= 1e4) l.clear();
    let abortController = new AbortController(),
      ce = withTimeout(
        readSpendCaps(e, F.sub, F.groups ?? [], admin.group_limit_mode, X, abortController.signal),
        A1 + 500,
        "spend usage read timed out",
      )
        .then((Ne) => Ne.caps)
        .catch((Ne) => {
          throw (abortController.abort(), Ne);
        });
    return (l.set(F.sub, { at: X.getTime(), caps: ce }), ce);
  }
  function S(F, X, he, Me, ce) {
    gatewayJsonLog("spend.blocked", {
      request_id: X,
      sub: F,
      cause: he ? "over_limit" : "store_error",
      ...(he && { cap_cents: he.cap_cents, source: he.scope_type, period: he.period }),
      ...(ce && { groups: ce }),
      ...(t.load_test_mode?.enabled && { load_test: !0 }),
    });
    let Ne = he
      ? he.scope_type === "group_pool"
        ? groupBudgetExceededMessage(he.resetsAt)
        : `spend limit reached (${he.period}; resets ${he.resetsAt.toISOString().slice(0, 16).replace("T", " ")} UTC)`
      : "spend limit unavailable";
    return Response.json(
      {
        type: "error",
        error: {
          type: "billing_error",
          message: admin.blocked_message ? `${Ne} \u2014 ${admin.blocked_message}` : Ne,
        },
      },
      { status: 429, headers: { ...Me, "x-should-retry": "false" } },
    );
  }
  function j(F) {
    let X = `${F.sub}\x00${F.email ?? ""}\x00${F.name ?? ""}\x00${(F.groups ?? []).join(",")}`,
      he = s.get(X) ?? 0;
    if (Date.now() - he >= a) {
      if (s.size >= 1e4) s.clear();
      (s.set(X, Date.now()),
        m(
          upsertPrincipalIdentity(e, F).catch((Me) =>
            gatewayLog("warn", `identity record failed: ${errorMessage(Me)}`),
          ),
        ));
    }
  }
  function M(F, X, he, Me, ce, Ne, be, ve) {
    if (
      F.status < 400 &&
      ce !== null &&
      !hasKnownModelCost(Ne ?? "") &&
      !findPricingOverride(t.pricing, Me, ce, Ne)
    )
      N(ce);
    return meterResponseUsage(
      F,
      (Ue) => (t.load_test_mode?.enabled ? 0 : requestCostCents(ce, Ue, Ne, t.pricing, Me)),
      (Ue) =>
        Promise.all([
          recordSpend(e, X.sub, Ue).catch((kt) => {
            (gatewayLog("warn", `spend record failed: ${errorMessage(kt)}`), n?.("write"));
          }),
          he !== null && h(he, Ue),
        ]),
      be,
      ve,
      m,
    );
  }
  function N(F) {
    if (hasKnownModelCost(F) || r.has(F) || r.size >= 1000) return;
    (r.add(F),
      gatewayLog(
        "warn",
        `spend meter has no exact rates for model '${F}' \u2014 metering at the unknown-model default tier`,
      ));
  }
  async function Z() {
    while (u.size > 0) await Promise.all(u);
  }
  return { precheck: y, usage: b, meter: M, flush: Z };
}
/**
 * 花费状态转为客户端额度显示（extra_usage 与各周期 limits、严重程度）。
 */
//@ chunk-1ny7cxrt.js:1451226-1451674 placement
function toSpendRateLimits(e, t = new Date()) {
  let mapped = e.map((r) => withLimitStatus(r, t)),
    o = $1(mapped);
  return {
    ...(o && {
      extra_usage: {
        is_enabled: !0,
        monthly_limit: Number(o.cap_cents),
        used_credits: Math.floor(o.spent_cents),
        utilization: Math.round(J0(o) * 100),
        currency: "USD",
      },
    }),
    limits: mapped.map((r) => ({
      kind: "spend",
      group: r.period,
      percent: Math.round(J0(r) * 100),
      resets_at: r.resetsAt.toISOString(),
      severity: r.exceeded || r.utilization > 0.95 ? "critical" : r.utilization > 0.75 ? "warning" : "normal",
      is_active: r === o,
    })),
  };
}
/**
 * 两个限额中取更严重的（超限优先，其次重置更晚或使用率更高）。
 */
//@ chunk-1ny7cxrt.js:1451674-1451847 placement
function pickMoreSevereLimit(e, t) {
  if (e.exceeded !== t.exceeded) return e.exceeded ? e : t;
  if (e.exceeded) return e.resetsAt.getTime() > t.resetsAt.getTime() ? e : t;
  return e.utilization > t.utilization ? e : t;
}

export { Hbe, S1, periodResetsAt, pickMoreSevereLimit, createSpendLimitAdmin, q0, handleSpendLimitAdmin };
