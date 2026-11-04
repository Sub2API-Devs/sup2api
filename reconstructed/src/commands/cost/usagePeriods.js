/**
 * commands/cost/usagePeriods.ts
 *
 * 2.1.316 新增：/cost 与用量视图的计费周期计算和文案
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (9)
 * attribution: placement 9
 */
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession, getGatewayAuth, isGatewayAuthPinned } from "../../bootstrap/state.js";
import { gatewayJwtSubject } from "../../utils/telemetry/gatewayIdentityAttributes.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { refreshGatewayToken } from "../../services/gateway/gatewayAuth.js";
import { readGatewayTrust, pinnedAgentFor, createPinnedAgent } from "../../services/gateway/vouching.js";
import { hostOf } from "../../services/gateway/internalNetworks.js";
import { externalHttp, isTransportError } from "../../services/http/externalHttp.js";
import { claudeCodeUserAgent } from "../../utils/http.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  objectSchema,
  numberSchema,
  stringSchema,
  array,
  booleanSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:821035-821225 placement
/**
 * 用量周期与相关常量：daily/weekly/monthly 周期、对应的显示文案、缓存与请求超时时长，以及按会话保存的上次读取结果。
 */
var SPEND_LIMIT_PERIODS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SPEND_PERIOD_LABELS;
var GATEWAY_USAGE_CACHE_TTL_MS;
var GATEWAY_USAGE_TIMEOUT_MS;
var gatewayUsageState;
deferInit("chunk-e6aww6q8.js:821035", () => {
  SPEND_LIMIT_PERIODS = ["daily", "weekly", "monthly"];
  SPEND_PERIOD_LABELS = {
    daily: "today",
    weekly: "this week",
    monthly: "this month",
  };
  GATEWAY_USAGE_CACHE_TTL_MS = 300000;
  GATEWAY_USAGE_TIMEOUT_MS = 5000;
  gatewayUsageState = new HostScoped(() => ({
    last: undefined,
    signIn: undefined,
    lastReadAt: 0,
    reading: undefined,
  }));
});
//@ chunk-e6aww6q8.js:821225-821264 placement
function gatewayUsageStore() {
  return gatewayUsageState.of(getRootSession().host);
}
//@ chunk-e6aww6q8.js:821264-821354 placement
function gatewaySignInKey(auth) {
  if (!auth) return;
  let subject = gatewayJwtSubject(auth) ?? computeContentHash(auth.jwt).slice(0, 16);
  return `${auth.url}\x00${subject}`;
}
//@ chunk-e6aww6q8.js:821354-821429 placement
/**
 * 取网关用量缓存：缓存里的登录标识与当前网关认证一致时返回，否则 undefined。
 */
function cachedGatewayUsage() {
  let { last, signIn } = gatewayUsageStore();
  return last && signIn === gatewaySignInKey(getGatewayAuth()) ? last : undefined;
}
//@ chunk-e6aww6q8.js:821429-821503 placement
function maybeRefreshGatewayUsage(auth, credentials) {
  let { lastReadAt } = gatewayUsageStore();
  if (auth > lastReadAt && Date.now() - lastReadAt > GATEWAY_USAGE_CACHE_TTL_MS)
    refreshGatewayUsage(credentials);
}
//@ chunk-e6aww6q8.js:821503-821599 placement
/**
 * 主动刷新网关用量（读接口并写入按宿主缓存）。
 */
function refreshGatewayUsage(auth) {
  let store = gatewayUsageStore();
  store.reading ??= fetchGatewayUsage(auth).finally(() => {
    store.reading = undefined;
  });
  return store.reading;
}
//@ chunk-e6aww6q8.js:821599-822251 placement
/**
 * 读取网关用量接口 /api/oauth/usage，用于 /cost 显示计费周期用量。
 */
async function fetchGatewayUsage(auth) {
  let store = gatewayUsageStore();
  store.lastReadAt = Date.now();
  let gatewayAuth = getGatewayAuth();
  if (!gatewayAuth) {
    store.last = undefined;
    return;
  }
  try {
    await refreshGatewayToken(auth);
    let resolvedAuth = getGatewayAuth() ?? gatewayAuth;
    let usageUrl = `${resolvedAuth.url}/api/oauth/usage`;
    let isPinned = isGatewayAuthPinned(resolvedAuth)
      ? await readGatewayTrust(hostOf(new URL(usageUrl)), auth)
      : undefined;
    let hostVerdict = resolvedAuth.hostVerdict;
    let headers =
      pinnedAgentFor(isPinned, usageUrl) ??
      (hostVerdict && "verified" in hostVerdict && hostVerdict.verified && !("vouched" in hostVerdict)
        ? createPinnedAgent(usageUrl, hostVerdict.network)
        : undefined);
    let response = await externalHttp.get(usageUrl, {
      headers: {
        Authorization: `Bearer ${resolvedAuth.jwt}`,
        "User-Agent": claudeCodeUserAgent(),
      },
      timeout: GATEWAY_USAGE_TIMEOUT_MS,
      signal: AbortSignal.timeout(GATEWAY_USAGE_TIMEOUT_MS),
      maxRedirects: 0,
      ...(headers && {
        httpsAgent: headers,
      }),
      validateStatus: (status) => status === 200 || status === 404,
    });
    store.last = response.status === 200 ? parseGatewaySpend(response.data) : undefined;
    store.signIn = gatewaySignInKey(resolvedAuth);
    return store.last;
  } catch (error) {
    logForDebugging(`[gateway-usage] read failed: ${errorMessage(error)}`);
    if (!isTransportError(error)) store.last = undefined;
    return;
  }
}
//@ chunk-e6aww6q8.js:822251-822600 placement
/**
 * 网关花费上限接口响应的 zod 结构：extra_usage（月度上限、已用额度、使用率、币种）与 limits[]（分组、重置时间、是否生效），字段解析失败时降级为 undefined。
 */
var gatewaySpendResponseSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:822251", () => {
  gatewaySpendResponseSchema = DoctorLazy(() =>
    objectSchema({
      extra_usage: objectSchema({
        monthly_limit: numberSchema().nonnegative(),
        used_credits: numberSchema().nonnegative(),
        utilization: numberSchema().nonnegative(),
        currency: stringSchema()
          .regex(/^[A-Za-z]{3}$/)
          .nullish()
          .catch(undefined),
      }),
      limits: array(
        objectSchema({
          group: stringSchema().nullish().catch(undefined),
          resets_at: stringSchema().nullish().catch(undefined),
          is_active: booleanSchema().nullish().catch(undefined),
        }).catch({}),
      )
        .nullish()
        .catch(undefined),
    }),
  );
});
//@ chunk-e6aww6q8.js:822600-822970 placement
/**
 * 解析网关花费响应为 {used, limit, currency, utilization, resetsAt, period}：取生效中的 limit 的重置时间与周期，币种缺省 USD。
 */
function parseGatewaySpend(body) {
  let parsed = gatewaySpendResponseSchema().safeParse(body);
  if (!parsed.success) return;
  let { extra_usage: extraUsage, limits } = parsed.data;
  let found = limits?.find((limit) => limit.is_active === true);
  return {
    used: extraUsage.used_credits,
    limit: extraUsage.monthly_limit,
    currency: extraUsage.currency?.toUpperCase() ?? "USD",
    utilization: extraUsage.utilization,
    resetsAt: found?.resets_at && Number.isFinite(Date.parse(found.resets_at)) ? found.resets_at : null,
    period: SPEND_LIMIT_PERIODS.find((period) => period === found?.group) ?? null,
  };
}
export { maybeRefreshGatewayUsage, cachedGatewayUsage, refreshGatewayUsage, SPEND_PERIOD_LABELS };
