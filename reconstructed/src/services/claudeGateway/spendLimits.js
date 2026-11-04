/**
 * services/claudeGateway/spendLimits.ts
 *
 * 2.1.316 新增：网关花费限额与共享预算
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1ny7cxrt.js (54)
 * attribution: placement 54
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
  createSseUsageState,
  SSE_EVENT_SEPARATOR_RE,
  accumulateSseUsage,
  finishSseUsage,
  parseJsonUsage,
  CHARS_PER_OUTPUT_TOKEN,
  MIN_ESTIMATE_OUTPUT_CHARS,
} from "./usageMetering.js";
import { withTimeout } from "../../utils/sleep.js";
import { mockLimitsFromSpend, withLimitStatus, mostSevereLimit, roundUtilization } from "./mockRateLimits.js";
import { hasKnownModelCost } from "../../utils/modelCost.js";
import { findPricingOverride, requestCostCents } from "./models.js";
import { deferInit } from "../../../runtime/deferred-init.js";

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
function adminErrorResponse(status, message, requestId) {
  return Response.json(
    {
      type: "error",
      error: {
        type: ADMIN_ERROR_TYPE_BY_STATUS[status],
        message,
      },
      request_id: requestId,
    },
    {
      status,
    },
  );
}
//@ chunk-1ny7cxrt.js:1423654-1423761 placement
/**
 * 解析 limit 参数（1–1000），非法返回 null。
 */
function parsePageLimit(searchParams, defaultValue) {
  let limit = Number(searchParams.get("limit") ?? defaultValue);
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000) return null;
  return limit;
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
function periodBucket(period = "monthly", date = new Date()) {
  if (period === "monthly") return date.toISOString().slice(0, 7);
  if (period === "daily") return date.toISOString().slice(0, 10);
  let date_2 = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  let isoWeekday = date_2.getUTCDay() || 7;
  date_2.setUTCDate(date_2.getUTCDate() + 4 - isoWeekday);
  let utcFullYear = date_2.getUTCFullYear();
  let jan1 = Date.UTC(utcFullYear, 0, 1);
  let week = Math.ceil(((date_2.getTime() - jan1) / 86400000 + 1) / 7);
  return `${utcFullYear}-W${String(week).padStart(2, "0")}`;
}
//@ chunk-1ny7cxrt.js:1424192-1424442 placement
/**
 * 当前周期的重置时间（下月 1 日、次日或下周一，UTC）。
 */
function periodResetsAt(period, date = new Date()) {
  let utcFullYear = date.getUTCFullYear();
  let utcMonth = date.getUTCMonth();
  let utcDate = date.getUTCDate();
  if (period === "monthly") return new Date(Date.UTC(utcFullYear, utcMonth + 1, 1));
  if (period === "daily") return new Date(Date.UTC(utcFullYear, utcMonth, utcDate + 1));
  let daysUntilMonday = 8 - (date.getUTCDay() || 7);
  return new Date(Date.UTC(utcFullYear, utcMonth, utcDate + daysUntilMonday));
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
function queryCapsWithSpend(sql, principals, groupLimitMode, scopeTypes, date = new Date()) {
  let mapped = SPEND_PERIODS.map((period) => periodBucket(period, date));
  return sql`
    WITH pb AS (
      SELECT period, bucket, ordinality AS ord
      FROM unnest(${sql.array([...SPEND_PERIODS], "TEXT")}, ${sql.array(mapped, "TEXT")})
        WITH ORDINALITY AS t(period, bucket)
    )
    SELECT pb.period, c.amount AS cap_cents, c.scope_type,
           coalesce(s.cents, 0)::float8 AS spent_cents
    FROM pb
    JOIN caps_by_period(${principals}, ${sql.array([...groupLimitMode], "TEXT")}, ${scopeTypes}) c
      ON c.period = pb.period
    LEFT JOIN spend s ON s.principal = ${principals} AND s.period = pb.bucket
    WHERE c.amount IS NOT NULL
    ORDER BY pb.ord
  `;
}
//@ chunk-1ny7cxrt.js:1425255-1425708 placement
/**
 * SQL：用户所在组启用的月度共享预算与已用额度。
 */
function queryPooledBudgets(sql, groupIds, now) {
  return sql`
    SELECT l.scope_id AS "group",
           l.pooled_monthly_credit_limit::float8 AS "limit",
           coalesce(s.cents, 0)::float8 AS spent
    FROM spend_limits l
    LEFT JOIN pooled_spend s
      ON s.rbac_group_id = l.scope_id AND s.period = ${periodBucket("monthly", now)}
    WHERE l.scope_type = 'rbac_group' AND l.period = 'monthly'
      AND l.scope_id = ANY(${sql.array([...groupIds], "TEXT")})
      AND l.pooled_limit_enabled
  `;
}
//@ chunk-1ny7cxrt.js:1425708-1426207 placement
/**
 * 在一个短超时事务中读取个人上限与组共享预算。
 */
async function readSpendCaps(sql, sub, groups, scopeTypes, now, signal, groupIds = []) {
  let client = await sql.reserve();
  try {
    signal?.throwIfAborted();
    let [beginResult, timeoutResult, capsResult, , poolsResult, commitResult] = await Promise.allSettled([
      client`BEGIN`,
      client`SET LOCAL statement_timeout = '2s'`,
      queryCapsWithSpend(client, sub, groups, scopeTypes, now),
      groupIds.length > 0 ? client`SET LOCAL statement_timeout = '300ms'` : [],
      groupIds.length > 0 ? queryPooledBudgets(client, groupIds, now) : [],
      client`COMMIT`,
    ]);
    for (let settled of [beginResult, timeoutResult]) if (settled.status === "rejected") throw settled.reason;
    if (capsResult.status === "rejected") throw capsResult.reason;
    if (commitResult.status === "rejected") throw commitResult.reason;
    return {
      caps: capsResult.value,
      pools: poolsResult,
    };
  } finally {
    Promise.resolve(client.release()).catch(() => {});
  }
}
//@ chunk-1ny7cxrt.js:1426207-1426727 placement
/**
 * 按各周期桶累加主体花费（语句超时时重试一次）。
 */
async function recordSpend(sql, entries, options) {
  let mapped = SPEND_PERIODS.map((period) => periodBucket(period));
  let write = () =>
    sql.begin(async (tx) => {
      await tx`SET LOCAL statement_timeout = '2s'`;
      await tx`
        INSERT INTO spend (principal, period, cents)
        SELECT DISTINCT ${entries}, b, ${options}
        FROM unnest(${sql.array(mapped, "TEXT")}) AS t(b)
        ORDER BY 2
        ON CONFLICT (principal, period) DO UPDATE
          SET cents = spend.cents + EXCLUDED.cents, updated_at = now()
      `;
    });
  try {
    await write();
  } catch (error) {
    let err = error ?? {};
    if (err.errno === "57014" || err.code === "57014") {
      await write();
      return;
    }
    throw error;
  }
}
//@ chunk-1ny7cxrt.js:1426727-1427155 placement
/**
 * 累加各组本月共享预算花费。
 */
async function recordPooledSpend(sql, centsByGroup) {
  await sql`
    INSERT INTO pooled_spend (rbac_group_id, period, cents)
    SELECT rbac_group_id, ${periodBucket("monthly")}, cents
    FROM unnest(
      ${sql.array([...centsByGroup.keys()], "TEXT")},
      ${sql.array([...centsByGroup.values()], "DOUBLE PRECISION")}
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
async function upsertPrincipalIdentity(sql, identity) {
  let email = identity.email || null;
  let displayName = identity.name || null;
  let groups = identity.groups ?? [];
  await sql.begin(async (tx) => {
    await tx`SET LOCAL statement_timeout = '2s'`;
    await tx`
      INSERT INTO principal_emails ${sql({
        principal: identity.sub,
        email,
        name: displayName,
        groups,
      })}
      ON CONFLICT (principal) DO UPDATE SET
        email = coalesce(${email}, principal_emails.email),
        name = coalesce(${displayName}, principal_emails.name),
        groups = ${groups},
        updated_at = now()
    `;
  });
}
//@ chunk-1ny7cxrt.js:1427601-1427775 placement
/**
 * 写一条管理审计记录。
 */
async function insertAdminAudit(sql, event) {
  await sql`INSERT INTO admin_audit ${sql({
    actor: event.actor,
    action: event.action,
    target: event.target,
    before: event.before ?? null,
    after: event.after ?? null,
    reason: event.reason ?? null,
  })}`;
}
//@ chunk-1ny7cxrt.js:1427775-1427999 placement
/**
 * SQL 片段：周期与当前桶的列表。
 */
function periodBucketsSql(sql, periods = SPEND_PERIODS, now = new Date()) {
  let mapped = periods.map((period) => periodBucket(period, now));
  return sql`
    SELECT period, bucket, ordinality AS ord
    FROM unnest(${sql.array([...periods], "TEXT")}, ${sql.array(mapped, "TEXT")})
      WITH ORDINALITY AS t(period, bucket)
  `;
}
//@ chunk-1ny7cxrt.js:1427999-1428996 placement
/**
 * GET …/effective：按用户（或分页列出）返回各周期的生效上限、来源与已用额度，支持搜索与按花费排序。
 */
async function handleEffectiveLimits({ url, sql, requestId }, scopeTypes) {
  let searchParams = url.searchParams;
  let pageLimit = parsePageLimit(searchParams, 20);
  if (pageLimit === null) return adminErrorResponse(400, "limit: must be between 1 and 1000", requestId);
  let periods = parsePeriods(searchParams);
  if (periods === null)
    return adminErrorResponse(400, "period[]: must be one of daily, weekly, monthly", requestId);
  let principals = searchParams.getAll("user_ids[]");
  if (principals.length > 100)
    return adminErrorResponse(400, "user_ids[]: at most 100 entries per request", requestId);
  let searchQuery = searchParams.get("q");
  if (searchQuery !== null && searchQuery.length > 256)
    return adminErrorResponse(400, "q: too long", requestId);
  let sort = searchParams.get("sort");
  if (sort !== null && sort !== "spend_desc")
    return adminErrorResponse(400, "sort: must be spend_desc", requestId);
  let sortBySpend = sort === "spend_desc";
  if (sortBySpend && periods.length !== 1)
    return adminErrorResponse(400, "sort=spend_desc requires exactly one period[]", requestId);
  if (principals.length > 0) {
    let data = await queryEffectiveLimits(sql, principals, periods, scopeTypes);
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
  let pageToken = searchParams.get("page");
  let decodedToken;
  if (pageToken !== null) {
    decodedToken = decodePageToken(pageToken, sortBySpend);
    if (decodedToken === undefined) return adminErrorResponse(400, "page: invalid page token", requestId);
  }
  let likePattern = searchQuery === null ? null : `%${escapeLikePattern(searchQuery)}%`;
  let listing = sortBySpend
    ? await listPrincipalsBySpend(sql, periodBucket(periods[0]), decodedToken, likePattern, pageLimit)
    : await listPrincipals(sql, decodedToken, likePattern, pageLimit);
  let data = await queryEffectiveLimits(sql, listing.subs, periods, scopeTypes);
  return Response.json(
    {
      data,
      next_page: listing.nextToken,
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
  let periods = [];
  for (let period of all) {
    if (period !== "daily" && period !== "weekly" && period !== "monthly") return null;
    if (!periods.includes(period)) periods.push(period);
  }
  return periods;
}
//@ chunk-1ny7cxrt.js:1429183-1429270 placement
/**
 * 带累计数的页令牌 schema（主体 + 数 + 已结束标记）。
 */
var spendPageTokenSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var spendPageTokenWithCountSchema;
deferInit("chunk-1ny7cxrt.js:1429183", () => {
  spendPageTokenSchema = DoctorLazy(() =>
    create({
      p: create_2(),
      s: create_9().optional(),
    }),
  );
  spendPageTokenWithCountSchema = DoctorLazy(() =>
    create({
      p: create_2(),
      c: create_3(),
      s: create_25(true),
    }),
  );
});
//@ chunk-1ny7cxrt.js:1429270-1429345 placement
/**
 * 把分页令牌编码成 base64url JSON。
 */
function encodePageToken(token) {
  return Buffer.from(JSON.stringify(token)).toString("base64url");
}
//@ chunk-1ny7cxrt.js:1429345-1429467 placement
/**
 * 解码分页令牌（base64url JSON）。
 */
function decodePageToken(token, withCount) {
  let schema = withCount ? spendPageTokenWithCountSchema() : spendPageTokenSchema();
  try {
    return schema.parse(JSON.parse(Buffer.from(token, "base64url").toString()));
  } catch {
    return;
  }
}
//@ chunk-1ny7cxrt.js:1429467-1430102 placement
/**
 * 按花费降序分页列出主体（游标）。
 */
async function listPrincipalsBySpend(sql, groupLimitMode, query, scopeTypes, pageLimit) {
  let afterPrincipal = query?.p ?? null;
  let afterCents = query?.s === true ? query.c : null;
  let rows = await sql`
    SELECT s.principal, s.cents FROM spend s
    LEFT JOIN principal_emails e ON e.principal = s.principal
    WHERE s.period = ${groupLimitMode}
      AND (${afterCents}::float8 IS NULL
           OR s.cents < ${afterCents}
           OR (s.cents = ${afterCents} AND s.principal > ${afterPrincipal}))
      AND (${scopeTypes}::text IS NULL OR s.principal ILIKE ${scopeTypes}
           OR e.email ILIKE ${scopeTypes} OR e.name ILIKE ${scopeTypes})
    ORDER BY s.cents DESC, s.principal LIMIT ${pageLimit + 1}
  `;
  let hasMore = rows.length > pageLimit;
  let sliced = rows.slice(0, pageLimit);
  let last = sliced.at(-1);
  return {
    subs: sliced.map((row) => row.principal),
    nextToken:
      hasMore && last !== undefined
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
async function listPrincipals(sql, query, pageLimit, pageLimit_2) {
  let afterPrincipal = query?.p ?? null;
  let rows = await sql`
    SELECT s.principal FROM spend s
    LEFT JOIN principal_emails e ON e.principal = s.principal
    WHERE (${afterPrincipal}::text IS NULL OR s.principal > ${afterPrincipal})
      AND (${pageLimit}::text IS NULL OR s.principal ILIKE ${pageLimit}
           OR e.email ILIKE ${pageLimit} OR e.name ILIKE ${pageLimit})
    GROUP BY s.principal ORDER BY s.principal LIMIT ${pageLimit_2 + 1}
  `;
  let sliced = rows.map((row) => row.principal).slice(0, pageLimit_2);
  let hasMore = rows.length > pageLimit_2;
  let last = sliced.at(-1);
  return {
    subs: sliced,
    nextToken:
      hasMore && last !== undefined
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
function escapeLikePattern(pattern) {
  return pattern.replace(/[\\%_]/g, (char) => `\\${char}`);
}
//@ chunk-1ny7cxrt.js:1430656-1431483 placement
/**
 * 查询一批主体在各周期的生效上限与花费。
 */
async function queryEffectiveLimits(sql, principals, periods, scopeTypes) {
  if (principals.length === 0) return [];
  return (
    await sql`
    WITH p AS (
      SELECT principal, ordinality AS ord
      FROM unnest(${sql.array(principals, "TEXT")}) WITH ORDINALITY AS t(principal)
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
      ${scopeTypes}
    ) cap ON cap.period = per.period
    LEFT JOIN spend s ON s.principal = p.principal AND s.period = per.bucket
    ORDER BY p.ord, per.ord
  `
  ).map((row) => toEffectiveLimit(row));
}
//@ chunk-1ny7cxrt.js:1431483-1431850 placement
/**
 * 查询行转为生效上限 API 对象。
 */
function toEffectiveLimit(row) {
  let source = row.scope_type === null ? null : toSpendScope(row.scope_type, row.scope_id);
  return {
    scope: {
      type: "user",
      user_id: row.principal,
    },
    groups: row.groups ?? [],
    actor: {
      type: "user_actor",
      user_id: row.principal,
      name: row.name ?? null,
      email_address: row.email ?? null,
      deleted: false,
    },
    amount: row.amount,
    currency: "USD",
    period: row.period,
    source,
    spend_limit_id: row.spend_limit_id,
    period_to_date_spend: formatCents(row.cents),
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
async function handleSpendLimitAdmin(req, url, sql, keys, oidcAdmin, clientIp, groupLimitMode = "min") {
  if (!isSpendLimitsPath(url.pathname)) return null;
  let requestId = `req_${crypto.randomUUID().replace(/-/g, "")}`;
  let response = await routeSpendLimitAdmin({
    req,
    url,
    sql,
    keys,
    requestId,
    oidcAdmin,
    clientIp,
    groupLimitMode,
  });
  response.headers.set("request-id", requestId);
  gatewayLog("info", `admin ${req.method} ${url.pathname} -> ${response.status} (${requestId})`);
  return response;
}
//@ chunk-1ny7cxrt.js:1432263-1433100 placement
/**
 * 管理 API 路由：认证（admin key 或 OIDC 管理员）后分发 effective/audit/列表/创建/查询/删除。
 */
async function routeSpendLimitAdmin({ req, url, sql, keys, requestId, oidcAdmin, clientIp, groupLimitMode }) {
  let pathname = url.pathname;
  let method = req.method;
  let apiKey = req.headers.get("x-api-key");
  let auth = authenticateAdmin(apiKey, keys, oidcAdmin);
  if (!auth) {
    gatewayJsonLog("admin.denied", {
      reason: apiKey
        ? "invalid_key"
        : req.headers.get("authorization")
          ? "bearer_rejected"
          : "no_credentials",
      method,
      path: pathname,
      client_ip: clientIp ?? null,
    });
    return adminErrorResponse(401, "missing or invalid admin credentials", requestId);
  }
  let ctx = {
    req,
    url,
    sql,
    requestId,
    auth,
  };
  if (pathname === `${SPEND_LIMITS_PATH}/effective` && method === "GET")
    return handleEffectiveLimits(ctx, groupLimitMode);
  if (pathname === `${SPEND_LIMITS_PATH}/audit` && method === "GET") return handleAuditList(ctx);
  if (pathname === SPEND_LIMITS_PATH && method === "GET") return handleListSpendLimits(ctx);
  if (pathname === SPEND_LIMITS_PATH && method === "POST") return handleUpsertSpendLimit(ctx);
  if (pathname.startsWith(`${SPEND_LIMITS_PATH}/`)) {
    let id;
    try {
      id = decodeURIComponent(pathname.slice(SPEND_LIMITS_PATH.length + 1));
    } catch {
      return adminErrorResponse(400, "malformed spend limit id", requestId);
    }
    if (method === "GET") return handleGetSpendLimit(ctx, id);
    if (method === "DELETE") return handleDeleteSpendLimit(ctx, id);
    return adminErrorResponse(404, "not found", requestId);
  }
  return adminErrorResponse(404, "not found", requestId);
}
//@ chunk-1ny7cxrt.js:1433100-1433345 placement
/**
 * 用 x-api-key（读/写密钥）或 OIDC 管理员身份认证，返回 {canWrite, actor}。
 */
function authenticateAdmin(apiKey, keys, oidcAdmin) {
  if (!apiKey)
    return oidcAdmin
      ? {
          canWrite: true,
          actor: `oidc:${oidcAdmin.sub}`,
        }
      : null;
  let writeKeyId = matchAdminKey(apiKey, keys.writeKeys);
  let readKeyId = matchAdminKey(apiKey, keys.readKeys);
  if (writeKeyId !== undefined)
    return {
      canWrite: true,
      actor: `admin-key:${writeKeyId}`,
    };
  if (readKeyId !== undefined)
    return {
      canWrite: false,
      actor: `admin-key:${readKeyId}`,
    };
  return null;
}
//@ chunk-1ny7cxrt.js:1433345-1433475 placement
/**
 * 常数时间比较 API key，返回匹配的密钥 id。
 */
function matchAdminKey(presented, keys) {
  let buffer = Buffer.from(presented);
  let matchedId;
  for (let key of keys) {
    let buffer_2 = Buffer.from(key.key);
    if (buffer_2.length === buffer.length && timingSafeEqual(buffer, buffer_2)) matchedId = key.id;
  }
  return matchedId;
}
//@ chunk-1ny7cxrt.js:1433475-1434197 placement
/**
 * GET …/audit：分页列出审计事件。
 */
async function handleAuditList({ url, sql, requestId }) {
  let pageLimit = parsePageLimit(url.searchParams, 100);
  if (pageLimit === null) return adminErrorResponse(400, "limit: must be between 1 and 1000", requestId);
  let afterId = url.searchParams.get("after_id");
  if (afterId !== null && !/^\d{1,18}$/.test(afterId))
    return adminErrorResponse(400, "after_id: must be an audit event id", requestId);
  let rows = await sql`
    SELECT id, at, actor, action, target, before, after, reason
    FROM admin_audit
    WHERE (${afterId}::bigint IS NULL OR id < ${afterId}::bigint)
    ORDER BY id DESC LIMIT ${pageLimit + 1}
  `;
  let hasMore = rows.length > pageLimit;
  return Response.json(
    {
      data: rows.slice(0, pageLimit).map((row) => ({
        type: "audit_event",
        id: row.id,
        created_at: row.at.toISOString(),
        actor: row.actor,
        action: row.action,
        target_id: row.target,
        before: row.before ?? null,
        after: row.after ?? null,
        reason: row.reason ?? null,
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
  let scopeType = searchParams.get("scope_type");
  if (
    scopeType !== null &&
    scopeType !== "organization" &&
    scopeType !== "rbac_group" &&
    scopeType !== "user"
  )
    return adminErrorResponse(400, "scope_type: must be one of organization, rbac_group, user", requestId);
  let afterId = searchParams.get("after_id");
  let beforeId = searchParams.get("before_id");
  if (afterId !== null && beforeId !== null)
    return adminErrorResponse(400, "after_id and before_id are mutually exclusive", requestId);
  let cursorId = afterId ?? beforeId;
  let cursorRow;
  if (cursorId !== null) {
    cursorRow = (
      await sql`SELECT created_at::text AS created_at, id FROM spend_limits WHERE id = ${cursorId}`
    )[0];
    if (!cursorRow)
      return adminErrorResponse(
        400,
        `${afterId !== null ? "after_id" : "before_id"}: no spend limit with this id`,
        requestId,
      );
  }
  let fetchLimit = pageLimit + 1;
  let hasMore;
  let rows;
  if (beforeId !== null && cursorRow) {
    let batch = await sql`
      SELECT * FROM spend_limits
      WHERE (created_at, id) < (${cursorRow.created_at}::timestamptz, ${cursorRow.id})
        AND (${scopeType}::text IS NULL OR scope_type = ${scopeType})
      ORDER BY created_at DESC, id DESC LIMIT ${fetchLimit}
    `;
    hasMore = batch.length > pageLimit;
    rows = batch.slice(0, pageLimit).reverse().map(toSpendLimit);
  } else {
    let createdAt = cursorRow?.created_at ?? null;
    let batch = await sql`
      SELECT * FROM spend_limits
      WHERE (${createdAt}::timestamptz IS NULL
             OR (created_at, id) > (${createdAt}::timestamptz, ${cursorRow?.id ?? null}))
        AND (${scopeType}::text IS NULL OR scope_type = ${scopeType})
      ORDER BY created_at, id LIMIT ${fetchLimit}
    `;
    hasMore = batch.length > pageLimit;
    rows = batch.slice(0, pageLimit).map(toSpendLimit);
  }
  let data = await withPooledSpend(sql, rows);
  return Response.json(
    {
      data,
      has_more: hasMore,
      first_id: data[0]?.id ?? null,
      last_id: data.at(-1)?.id ?? null,
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
  let scopeId = scopeId_2(scope);
  let lockKey = `spend_limits:${scope.type}:${scopeId}:${period}`;
  let newRow = {
    id: `spl_${crypto.randomUUID().replace(/-/g, "")}`,
    scope_type: scope.type,
    scope_id: scopeId,
    period,
    created_by: auth.actor,
  };
  let txResult = await sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;
    let [existingRow] = await tx`
      SELECT * FROM spend_limits
      WHERE scope_type = ${scope.type} AND scope_id = ${scopeId} AND period = ${period}
      FOR UPDATE
    `;
    let existingLimit = existingRow && toSpendLimit(existingRow);
    let amount = upsertBody.amount === undefined ? existingLimit?.amount : upsertBody.amount;
    if (amount === undefined)
      return "This spend limit doesn't exist yet, so it needs amount (each member's own limit). Set amount; it may equal pooled_budget.amount.";
    let pooledBudget_2 = existingLimit?.pooled_budget;
    let pooledAmount =
      pooledBudget.amount === undefined ? (pooledBudget_2?.amount ?? null) : pooledBudget.amount;
    let pooledPaused = pooledBudget.paused ?? pooledBudget_2?.paused ?? pooledAmount === null;
    if (!pooledPaused) {
      if (pooledAmount === null)
        return "A pooled budget that isn't paused needs an amount. Set pooled_budget.amount, or set pooled_budget.paused to true.";
      if (amount === null)
        return "A pooled budget that isn't paused needs amount (each member's own limit) on the same spend limit. Set amount; it may equal pooled_budget.amount.";
    }
    let pooledFields = {
      pooled_limit_enabled: !pooledPaused,
      pooled_monthly_credit_limit: pooledAmount,
    };
    let [insertedRow] = await tx`
      INSERT INTO spend_limits ${tx({
        ...newRow,
        amount,
        ...pooledFields,
      })}
      ON CONFLICT (scope_type, scope_id, period) DO UPDATE
        SET amount = ${amount},
            pooled_limit_enabled = ${pooledFields.pooled_limit_enabled},
            pooled_monthly_credit_limit = ${pooledFields.pooled_monthly_credit_limit},
            updated_at = now()
      RETURNING *
    `;
    let spendLimit = toSpendLimit(insertedRow);
    await insertAdminAudit(tx, {
      actor: auth.actor,
      action: "spend_limit.upsert",
      target: spendLimit.id,
      before: existingLimit ?? null,
      after: spendLimit,
    });
    return {
      before: existingLimit,
      after: spendLimit,
      json: (await withPooledSpend(tx, [spendLimit]))[0],
    };
  });
  if (typeof txResult === "string") return adminErrorResponse(400, txResult, requestId);
  let { before, after, json } = txResult;
  gatewayJsonLog("admin.limit.upsert", {
    actor: auth.actor,
    target: after.id,
    scope_type: scope.type,
    scope_id: scopeId,
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
async function handleGetSpendLimit({ sql, requestId }, id) {
  let row = (
    await sql`
    SELECT id, scope_type, scope_id, amount, period, currency, pooled_limit_enabled, pooled_monthly_credit_limit, created_at, updated_at FROM spend_limits WHERE id = ${id}
  `
  )[0];
  return row
    ? Response.json((await withPooledSpend(sql, [toSpendLimit(row)]))[0], {
        headers: NO_STORE_HEADERS_2,
      })
    : adminErrorResponse(404, "spend limit not found", requestId);
}
//@ chunk-1ny7cxrt.js:1438429-1439096 placement
/**
 * DELETE 花费限额并审计。
 */
async function handleDeleteSpendLimit({ sql, requestId, auth }, id) {
  if (!auth.canWrite) return adminErrorResponse(403, "requires write:spend_limits", requestId);
  let deleted = await sql.begin(async (tx) => {
    let row = (
      await tx`
      DELETE FROM spend_limits WHERE id = ${id} RETURNING id, scope_type, scope_id, amount, period, currency, pooled_limit_enabled, pooled_monthly_credit_limit, created_at, updated_at
    `
    )[0];
    if (!row) return false;
    await insertAdminAudit(tx, {
      actor: auth.actor,
      action: "spend_limit.delete",
      target: id,
      before: toSpendLimit(row),
    });
    return row;
  });
  if (deleted) {
    gatewayJsonLog("admin.limit.delete", {
      actor: auth.actor,
      target: id,
      scope_type: deleted.scope_type,
      scope_id: deleted.scope_id,
      period: deleted.period,
    });
    return Response.json({
      type: "spend_limit_deleted",
      id,
    });
  }
  return adminErrorResponse(404, "spend limit not found", requestId);
}
//@ chunk-1ny7cxrt.js:1439096-1439575 placement
/**
 * 金额（分）字符串 schema 与创建请求体 schema。
 */
var CENTS_STRING_SCHEMA; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var UPSERT_SPEND_LIMIT_SCHEMA;
deferInit("chunk-1ny7cxrt.js:1439096", () => {
  CENTS_STRING_SCHEMA = DoctorLazy(() =>
    create_2()
      .regex(/^\d{1,18}$/, "must be a whole-number decimal string of cents")
      .nullable(),
  );
  UPSERT_SPEND_LIMIT_SCHEMA = DoctorLazy(() =>
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
});
//@ chunk-1ny7cxrt.js:1439575-1439707 placement
/**
 * 把第一个校验错误格式化为 “路径: 信息”。
 */
function formatZodIssue(error) {
  let issue = error.issues[0];
  if (!issue) return "invalid request body";
  let joined = issue.path.join(".");
  return joined ? `${joined}: ${issue.message}` : issue.message;
}
//@ chunk-1ny7cxrt.js:1439707-1439873 placement
/**
 * 解析并校验请求体，失败返回错误响应。
 */
async function parseUpsertBody(req, requestId) {
  let body;
  try {
    body = await req.json();
  } catch {
    return adminErrorResponse(400, "invalid JSON body", requestId);
  }
  let parsed = UPSERT_SPEND_LIMIT_SCHEMA().safeParse(body);
  return parsed.success ? parsed.data : adminErrorResponse(400, formatZodIssue(parsed.error), requestId);
}
//@ chunk-1ny7cxrt.js:1439873-1440000 placement
/**
 * 作用域 id（用户 id、组 id 或空串）。
 */
function scopeId_2(scope) {
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
function toSpendLimit(row) {
  return {
    id: row.id,
    scope: toSpendScope(row.scope_type, row.scope_id),
    amount: row.amount,
    period: row.period,
    currency: row.currency,
    ...(row.scope_type === "rbac_group" &&
      row.period === "monthly" && {
        pooled_budget:
          row.pooled_monthly_credit_limit === null
            ? null
            : {
                amount: row.pooled_monthly_credit_limit,
                paused: !row.pooled_limit_enabled,
              },
      }),
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}
//@ chunk-1ny7cxrt.js:1440375-1441013 placement
/**
 * 为花费限额 API 对象补上共享预算本月已用额度。
 */
async function withPooledSpend(sql, limits) {
  let mapped = limits.filter((limit) => limit.pooled_budget).map((limit) => scopeId_2(limit.scope));
  let pooled =
    mapped.length === 0
      ? []
      : await sql`
          SELECT rbac_group_id, cents FROM pooled_spend
          WHERE period = ${periodBucket("monthly")}
            AND rbac_group_id = ANY(${sql.array(mapped, "TEXT")})
        `;
  let spendByGroup = new Map(pooled.map((row) => [row.rbac_group_id, row.cents]));
  return limits.map((limit) => ({
    type: "spend_limit",
    id: limit.id,
    created_at: limit.created_at,
    updated_at: limit.updated_at,
    scope: limit.scope,
    amount: limit.amount,
    currency: limit.currency,
    period: limit.period,
    ...(limit.pooled_budget !== undefined && {
      pooled_budget: limit.pooled_budget && {
        ...limit.pooled_budget,
        currency: limit.currency,
        period_to_date_spend: formatCents(spendByGroup.get(scopeId_2(limit.scope)) ?? 0),
      },
    }),
  }));
}
//@ chunk-1ny7cxrt.js:1441013-1441192 placement
/**
 * 从用户所在组的共享预算中选出仍有余额的那个（按上限从大到小），否则返回全部已用尽。
 */
function pickPayingPool(pools) {
  let [best, ...rest] = pools.toSorted(
    (left, right) => right.limit - left.limit || (left.group < right.group ? -1 : 1),
  );
  if (!best) return null;
  let candidates = [best, ...rest];
  let found = candidates.find((pool) => pool.spent < pool.limit);
  return found
    ? {
        pays: found,
      }
    : {
        usedUp: candidates,
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
function createSpendFlusher(sql, options, now = () => performance.now()) {
  let pending = new Map();
  let timer;
  return async (principal, cents) => {
    pending.set(principal, (pending.get(principal) ?? 0) + cents);
    if (timer !== undefined) {
      if (now() - timer >= SLOW_SPEND_WRITE_MS) {
        timer = now();
        options();
      }
      return;
    }
    try {
      while (pending.size > 0) {
        let batch = pending;
        pending = new Map();
        timer = now();
        await sql(batch);
      }
    } finally {
      timer = undefined;
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
function meterResponseUsage(
  response,
  toCost,
  persistUsage,
  inputTokenEstimator = null,
  speed,
  trackWrite = () => {},
) {
  if (!response.body || response.status >= 400) return response;
  let isSse = (response.headers.get("content-type") ?? "").includes("text/event-stream");
  let reader = response.body.getReader();
  let usageAccumulator = createUsageAccumulator(isSse, inputTokenEstimator, speed);
  let finalized = false;
  async function finalizeUsage() {
    if (finalized) return;
    finalized = true;
    try {
      let usage = await usageAccumulator.usage();
      if (usage) await persistUsage(toCost(usage));
    } catch (error) {
      gatewayLog("warn", `usage metering failed: ${errorMessage(error)}`);
    }
  }
  let readableStream = new ReadableStream({
    async pull(controller) {
      try {
        let chunk = await reader.read();
        if (chunk.done) {
          trackWrite(finalizeUsage());
          controller.close();
          return;
        }
        usageAccumulator.push(chunk.value);
        controller.enqueue(chunk.value);
      } catch (error) {
        trackWrite(finalizeUsage());
        controller.error(error);
      }
    },
    async cancel(reason) {
      trackWrite(finalizeUsage());
      await reader.cancel(reason);
    },
  });
  return new Response(readableStream, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
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
function createUsageAccumulator(isSse, inputTokenEstimator, speed) {
  let textDecoder = new TextDecoder();
  if (isSse) {
    let pendingText = "";
    let sseUsageState = createSseUsageState();
    return {
      push(chunk) {
        pendingText += textDecoder.decode(chunk, {
          stream: true,
        });
        let parts = pendingText.split(SSE_EVENT_SEPARATOR_RE);
        pendingText = parts.pop() ?? "";
        for (let eventText of parts) accumulateSseUsage(sseUsageState, eventText);
        if (pendingText.length > MAX_SSE_BUFFER_BYTES) pendingText = "";
      },
      async usage() {
        if (pendingText !== "") {
          accumulateSseUsage(sseUsageState, pendingText);
          pendingText = "";
        }
        return finishSseUsage(sseUsageState);
      },
    };
  }
  let bodyText = "";
  let charCount = 0;
  let overflowed = false;
  return {
    push(chunk) {
      let text = textDecoder.decode(chunk, {
        stream: true,
      });
      charCount += text.length;
      if (overflowed) return;
      bodyText += text;
      if (bodyText.length > MAX_SSE_BUFFER_BYTES) {
        overflowed = true;
        bodyText = "";
      }
    },
    async usage() {
      let parsedUsage = overflowed ? null : parseJsonUsage(bodyText);
      if (parsedUsage) return parsedUsage;
      if (charCount === 0) return null;
      return {
        input_tokens: (await inputTokenEstimator?.().catch(() => null)) ?? 0,
        output_tokens: Math.ceil(charCount / CHARS_PER_OUTPUT_TOKEN),
        speed,
      };
    },
  };
}
//@ chunk-1ny7cxrt.js:1446994-1450809 placement
function createSpendLimitAdmin(sql, gatewayConfig, spendFault) {
  if (!gatewayConfig.admin) return null;
  let admin = gatewayConfig.admin;
  let warnedModels = new Set();
  let identityCache = new Map();
  let IDENTITY_WRITE_INTERVAL_MS = 900000;
  let capsCache = new Map();
  let CAPS_CACHE_MS = 2000;
  let pendingWrites = new Set();
  let NEGATIVE_INFINITY = Number.NEGATIVE_INFINITY;
  let spendFlusher = createSpendFlusher(
    (pendingSpend) =>
      recordPooledSpend(sql, pendingSpend).catch((error) => {
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
  function trackWrite(promise) {
    pendingWrites.add(promise);
    promise.finally(() => pendingWrites.delete(promise));
  }
  async function precheck(principal, requestId) {
    let date = new Date();
    let abortController = new AbortController();
    let capsPromise = withTimeout(
      readSpendCaps(
        sql,
        principal.sub,
        principal.groups ?? [],
        admin.group_limit_mode,
        date,
        abortController.signal,
        principal.groups,
      ),
      MIN_ESTIMATE_OUTPUT_CHARS + 500,
      "spend precheck timed out",
    );
    recordIdentity(principal);
    let caps;
    try {
      caps = await capsPromise;
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
        blocked: blockedResponse(principal.sub, requestId, null, {
          "anthropic-ratelimit-unified-overage-disabled-reason": "fetch_error",
        }),
      };
    }
    let { binding, headers } = mockLimitsFromSpend(caps.caps, date);
    if (binding?.exceeded)
      return {
        blocked: blockedResponse(principal.sub, requestId, binding, headers),
      };
    if (caps.pools.status === "rejected") {
      if (date.getTime() - NEGATIVE_INFINITY >= 60000) {
        NEGATIVE_INFINITY = date.getTime();
        gatewayLog(
          "warn",
          `pooled spend check failed, so group budgets are not enforced (developers' own caps are). Logged at most once a minute: ${errorMessage(caps.pools.reason)}`,
        );
      }
      spendFault?.("check");
      return {
        blocked: null,
        headers,
        payingGroup: null,
      };
    }
    let payingPool = pickPayingPool(caps.pools.value);
    if (payingPool && "usedUp" in payingPool) {
      let poolLimits = mockLimitsFromSpend(
        [
          {
            period: "monthly",
            cap_cents: String(payingPool.usedUp[0].limit),
            scope_type: "group_pool",
            spent_cents: payingPool.usedUp[0].spent,
          },
        ],
        date,
      );
      return {
        blocked: blockedResponse(
          principal.sub,
          requestId,
          poolLimits.binding,
          poolLimits.headers,
          payingPool.usedUp.map((exhausted) => exhausted.group),
        ),
      };
    }
    return {
      blocked: null,
      headers,
      payingGroup: payingPool?.pays.group ?? null,
    };
  }
  async function usage(principal, requestId) {
    let date = new Date();
    let caps;
    try {
      caps = await readCachedCaps(principal, date);
    } catch (error) {
      gatewayLog(
        "warn",
        `GET /api/oauth/usage: spend store read failed: ${errorMessage(error)} request_id=${requestId}`,
      );
      spendFault?.("check");
      return new Response("spend limit unavailable", {
        status: 503,
        headers: NO_STORE_HEADERS_2,
      });
    }
    return Response.json(toSpendRateLimits(caps, date), {
      headers: NO_STORE_HEADERS_2,
    });
  }
  function readCachedCaps(principal, now) {
    let cached = capsCache.get(principal.sub);
    if (cached && now.getTime() - cached.at < CAPS_CACHE_MS) return cached.caps;
    if (capsCache.size >= 1e4) capsCache.clear();
    let abortController = new AbortController();
    let capsPromise = withTimeout(
      readSpendCaps(
        sql,
        principal.sub,
        principal.groups ?? [],
        admin.group_limit_mode,
        now,
        abortController.signal,
      ),
      MIN_ESTIMATE_OUTPUT_CHARS + 500,
      "spend usage read timed out",
    )
      .then((result) => result.caps)
      .catch((error) => {
        abortController.abort();
        throw error;
      });
    capsCache.set(principal.sub, {
      at: now.getTime(),
      caps: capsPromise,
    });
    return capsPromise;
  }
  function blockedResponse(sub, requestId, binding, headers, groups) {
    gatewayJsonLog("spend.blocked", {
      request_id: requestId,
      sub,
      cause: binding ? "over_limit" : "store_error",
      ...(binding && {
        cap_cents: binding.cap_cents,
        source: binding.scope_type,
        period: binding.period,
      }),
      ...(groups && {
        groups,
      }),
      ...(gatewayConfig.load_test_mode?.enabled && {
        load_test: true,
      }),
    });
    let message = binding
      ? binding.scope_type === "group_pool"
        ? groupBudgetExceededMessage(binding.resetsAt)
        : `spend limit reached (${binding.period}; resets ${binding.resetsAt.toISOString().slice(0, 16).replace("T", " ")} UTC)`
      : "spend limit unavailable";
    return Response.json(
      {
        type: "error",
        error: {
          type: "billing_error",
          message: admin.blocked_message ? `${message} \u2014 ${admin.blocked_message}` : message,
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
  function recordIdentity(principal) {
    let identityKey = `${principal.sub}\x00${principal.email ?? ""}\x00${principal.name ?? ""}\x00${(principal.groups ?? []).join(",")}`;
    let lastWriteMs = identityCache.get(identityKey) ?? 0;
    if (Date.now() - lastWriteMs >= IDENTITY_WRITE_INTERVAL_MS) {
      if (identityCache.size >= 1e4) identityCache.clear();
      identityCache.set(identityKey, Date.now());
      trackWrite(
        upsertPrincipalIdentity(sql, principal).catch((error) =>
          gatewayLog("warn", `identity record failed: ${errorMessage(error)}`),
        ),
      );
    }
  }
  function meter(
    response,
    principal,
    pooledPayer,
    upstreamName,
    upstreamModel,
    modelId,
    estimateInputTokens,
    meterTrackWrite,
  ) {
    if (
      response.status < 400 &&
      upstreamModel !== null &&
      !hasKnownModelCost(modelId ?? "") &&
      !findPricingOverride(gatewayConfig.pricing, upstreamName, upstreamModel, modelId)
    )
      warnUnpricedModel(upstreamModel);
    return meterResponseUsage(
      response,
      (usage) =>
        gatewayConfig.load_test_mode?.enabled
          ? 0
          : requestCostCents(upstreamModel, usage, modelId, gatewayConfig.pricing, upstreamName),
      (usage) =>
        Promise.all([
          recordSpend(sql, principal.sub, usage).catch((error) => {
            gatewayLog("warn", `spend record failed: ${errorMessage(error)}`);
            spendFault?.("write");
          }),
          pooledPayer !== null && spendFlusher(pooledPayer, usage),
        ]),
      estimateInputTokens,
      meterTrackWrite,
      trackWrite,
    );
  }
  function warnUnpricedModel(modelId) {
    if (hasKnownModelCost(modelId) || warnedModels.has(modelId) || warnedModels.size >= 1000) return;
    warnedModels.add(modelId);
    gatewayLog(
      "warn",
      `spend meter has no exact rates for model '${modelId}' \u2014 metering at the unknown-model default tier`,
    );
  }
  async function flush() {
    while (pendingWrites.size > 0) await Promise.all(pendingWrites);
  }
  return {
    precheck,
    usage,
    meter,
    flush,
  };
}
//@ chunk-1ny7cxrt.js:1451226-1451674 placement
/**
 * 花费状态转为客户端额度显示（extra_usage 与各周期 limits、严重程度）。
 */
function toSpendRateLimits(limits, date = new Date()) {
  let limits_2 = limits.map((limit) => withLimitStatus(limit, date));
  let binding = mostSevereLimit(limits_2);
  return {
    ...(binding && {
      extra_usage: {
        is_enabled: true,
        monthly_limit: Number(binding.cap_cents),
        used_credits: Math.floor(binding.spent_cents),
        utilization: Math.round(roundUtilization(binding) * 100),
        currency: "USD",
      },
    }),
    limits: limits_2.map((limit) => ({
      kind: "spend",
      group: limit.period,
      percent: Math.round(roundUtilization(limit) * 100),
      resets_at: limit.resetsAt.toISOString(),
      severity:
        limit.exceeded || limit.utilization > 0.95
          ? "critical"
          : limit.utilization > 0.75
            ? "warning"
            : "normal",
      is_active: limit === binding,
    })),
  };
}
//@ chunk-1ny7cxrt.js:1451674-1451847 placement
/**
 * 两个限额中取更严重的（超限优先，其次重置更晚或使用率更高）。
 */
function pickMoreSevereLimit(left, right) {
  if (left.exceeded !== right.exceeded) return left.exceeded ? left : right;
  if (left.exceeded) return left.resetsAt.getTime() > right.resetsAt.getTime() ? left : right;
  return left.utilization > right.utilization ? left : right;
}
export {
  periodResetsAt,
  pickMoreSevereLimit,
  createSpendLimitAdmin,
  isSpendLimitsPath,
  handleSpendLimitAdmin,
};
