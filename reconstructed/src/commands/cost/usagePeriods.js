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
import { u, E, string, array, M } from "../../../vendor/zod/v4/classic/schemas.js";

//@ chunk-e6aww6q8.js:821035-821225 placement
/**
 * 用量周期与相关常量：daily/weekly/monthly 周期、对应的显示文案、缓存与请求超时时长，以及按会话保存的上次读取结果。
 */
var SPEND_LIMIT_PERIODS = ["daily", "weekly", "monthly"];
var SPEND_PERIOD_LABELS = {
  daily: "today",
  weekly: "this week",
  monthly: "this month",
};
var GATEWAY_USAGE_CACHE_TTL_MS = 300000;
var GATEWAY_USAGE_TIMEOUT_MS = 5000;
var gatewayUsageState = new HostScoped(() => ({
  last: undefined,
  signIn: undefined,
  lastReadAt: 0,
  reading: undefined,
}));
//@ chunk-e6aww6q8.js:821225-821264 placement
function gatewayUsageStore() {
  return gatewayUsageState.of(getRootSession().host);
}
//@ chunk-e6aww6q8.js:821264-821354 placement
function gatewaySignInKey(e) {
  if (!e) return;
  let n = gatewayJwtSubject(e) ?? computeContentHash(e.jwt).slice(0, 16);
  return `${e.url}\x00${n}`;
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
function maybeRefreshGatewayUsage(e, credentials) {
  let { lastReadAt } = gatewayUsageStore();
  if (e > lastReadAt && Date.now() - lastReadAt > GATEWAY_USAGE_CACHE_TTL_MS)
    refreshGatewayUsage(credentials);
}
//@ chunk-e6aww6q8.js:821503-821599 placement
/**
 * 主动刷新网关用量（读接口并写入按宿主缓存）。
 */
function refreshGatewayUsage(credentials) {
  let n = gatewayUsageStore();
  n.reading ??= fetchGatewayUsage(credentials).finally(() => {
    n.reading = undefined;
  });
  return n.reading;
}
//@ chunk-e6aww6q8.js:821599-822251 placement
/**
 * 读取网关用量接口 /api/oauth/usage，用于 /cost 显示计费周期用量。
 */
async function fetchGatewayUsage(e) {
  let n = gatewayUsageStore();
  n.lastReadAt = Date.now();
  let gatewayAuth = getGatewayAuth();
  if (!gatewayAuth) {
    n.last = undefined;
    return;
  }
  try {
    await refreshGatewayToken(e);
    let s = getGatewayAuth() ?? gatewayAuth;
    let h = `${s.url}/api/oauth/usage`;
    let y = isGatewayAuthPinned(s) ? await readGatewayTrust(hostOf(new URL(h)), e) : undefined;
    let hostVerdict = s.hostVerdict;
    let w =
      pinnedAgentFor(y, h) ??
      (hostVerdict && "verified" in hostVerdict && hostVerdict.verified && !("vouched" in hostVerdict)
        ? createPinnedAgent(h, hostVerdict.network)
        : undefined);
    let L = await externalHttp.get(h, {
      headers: {
        Authorization: `Bearer ${s.jwt}`,
        "User-Agent": claudeCodeUserAgent(),
      },
      timeout: GATEWAY_USAGE_TIMEOUT_MS,
      signal: AbortSignal.timeout(GATEWAY_USAGE_TIMEOUT_MS),
      maxRedirects: 0,
      ...(w && {
        httpsAgent: w,
      }),
      validateStatus: (G) => G === 200 || G === 404,
    });
    n.last = L.status === 200 ? parseGatewaySpend(L.data) : undefined;
    n.signIn = gatewaySignInKey(s);
    return n.last;
  } catch (error) {
    logForDebugging(`[gateway-usage] read failed: ${errorMessage(error)}`);
    if (!isTransportError(error)) n.last = undefined;
    return;
  }
}
//@ chunk-e6aww6q8.js:822251-822600 placement
/**
 * 网关花费上限接口响应的 zod 结构：extra_usage（月度上限、已用额度、使用率、币种）与 limits[]（分组、重置时间、是否生效），字段解析失败时降级为 undefined。
 */
var gatewaySpendResponseSchema = DoctorLazy(() =>
  u({
    extra_usage: u({
      monthly_limit: E().nonnegative(),
      used_credits: E().nonnegative(),
      utilization: E().nonnegative(),
      currency: string()
        .regex(/^[A-Za-z]{3}$/)
        .nullish()
        .catch(undefined),
    }),
    limits: array(
      u({
        group: string().nullish().catch(undefined),
        resets_at: string().nullish().catch(undefined),
        is_active: M().nullish().catch(undefined),
      }).catch({}),
    )
      .nullish()
      .catch(undefined),
  }),
);
//@ chunk-e6aww6q8.js:822600-822970 placement
/**
 * 解析网关花费响应为 {used, limit, currency, utilization, resetsAt, period}：取生效中的 limit 的重置时间与周期，币种缺省 USD。
 */
function parseGatewaySpend(e) {
  let n = gatewaySpendResponseSchema().safeParse(e);
  if (!n.success) return;
  let { extra_usage: extraUsage, limits } = n.data;
  let found = limits?.find((limit) => limit.is_active === true);
  return {
    used: extraUsage.used_credits,
    limit: extraUsage.monthly_limit,
    currency: extraUsage.currency?.toUpperCase() ?? "USD",
    utilization: extraUsage.utilization,
    resetsAt: found?.resets_at && Number.isFinite(Date.parse(found.resets_at)) ? found.resets_at : null,
    period: SPEND_LIMIT_PERIODS.find((y) => y === found?.group) ?? null,
  };
}
export { maybeRefreshGatewayUsage, cachedGatewayUsage, refreshGatewayUsage, SPEND_PERIOD_LABELS };
