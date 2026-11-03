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
import { u, E, o, A, M } from "../../../vendor/zod/v4/classic/schemas.js";

/**
 * 用量周期与相关常量：daily/weekly/monthly 周期、对应的显示文案、缓存与请求超时时长，以及按会话保存的上次读取结果。
 */
//@ chunk-e6aww6q8.js:821035-821225 placement
var SPEND_LIMIT_PERIODS = ["daily", "weekly", "monthly"],
  SPEND_PERIOD_LABELS = { daily: "today", weekly: "this week", monthly: "this month" },
  GATEWAY_USAGE_CACHE_TTL_MS = 300000,
  GATEWAY_USAGE_TIMEOUT_MS = 5000,
  gatewayUsageState = new HostScoped(() => ({
    last: void 0,
    signIn: void 0,
    lastReadAt: 0,
    reading: void 0,
  }));
//@ chunk-e6aww6q8.js:821225-821264 placement
function kge() {
  return gatewayUsageState.of(getRootSession().host);
}
//@ chunk-e6aww6q8.js:821264-821354 placement
function V0t(e) {
  if (!e) return;
  let n = gatewayJwtSubject(e) ?? computeContentHash(e.jwt).slice(0, 16);
  return `${e.url}\x00${n}`;
}
//@ chunk-e6aww6q8.js:821354-821429 placement
function LXn() {
  let { last: last, signIn: signIn } = kge();
  return last && signIn === V0t(getGatewayAuth()) ? last : void 0;
}
//@ chunk-e6aww6q8.js:821429-821503 placement
function Y0t(e, n) {
  let { lastReadAt: lastReadAt } = kge();
  if (e > lastReadAt && Date.now() - lastReadAt > GATEWAY_USAGE_CACHE_TTL_MS) iGt(n);
}
//@ chunk-e6aww6q8.js:821503-821599 placement
function iGt(e) {
  let n = kge();
  return (
    (n.reading ??= fetchGatewayUsage(e).finally(() => {
      n.reading = void 0;
    })),
    n.reading
  );
}
/**
 * 读取网关用量接口 /api/oauth/usage，用于 /cost 显示计费周期用量。
 */
//@ chunk-e6aww6q8.js:821599-822251 placement
async function fetchGatewayUsage(e) {
  let n = kge();
  n.lastReadAt = Date.now();
  let r = getGatewayAuth();
  if (!r) {
    n.last = void 0;
    return;
  }
  try {
    await refreshGatewayToken(e);
    let s = getGatewayAuth() ?? r,
      h = `${s.url}/api/oauth/usage`,
      y = isGatewayAuthPinned(s) ? await readGatewayTrust(hostOf(new URL(h)), e) : void 0,
      hostVerdict = s.hostVerdict,
      w =
        pinnedAgentFor(y, h) ??
        (hostVerdict && "verified" in hostVerdict && hostVerdict.verified && !("vouched" in hostVerdict)
          ? createPinnedAgent(h, hostVerdict.network)
          : void 0),
      L = await externalHttp.get(h, {
        headers: { Authorization: `Bearer ${s.jwt}`, "User-Agent": claudeCodeUserAgent() },
        timeout: GATEWAY_USAGE_TIMEOUT_MS,
        signal: AbortSignal.timeout(GATEWAY_USAGE_TIMEOUT_MS),
        maxRedirects: 0,
        ...(w && { httpsAgent: w }),
        validateStatus: (G) => G === 200 || G === 404,
      });
    return ((n.last = L.status === 200 ? parseGatewaySpend(L.data) : void 0), (n.signIn = V0t(s)), n.last);
  } catch (error) {
    if ((logForDebugging(`[gateway-usage] read failed: ${errorMessage(error)}`), !isTransportError(error)))
      n.last = void 0;
    return;
  }
}
/**
 * 网关花费上限接口响应的 zod 结构：extra_usage（月度上限、已用额度、使用率、币种）与 limits[]（分组、重置时间、是否生效），字段解析失败时降级为 undefined。
 */
//@ chunk-e6aww6q8.js:822251-822600 placement
var gatewaySpendResponseSchema = DoctorLazy(() =>
  u({
    extra_usage: u({
      monthly_limit: E().nonnegative(),
      used_credits: E().nonnegative(),
      utilization: E().nonnegative(),
      currency: o()
        .regex(/^[A-Za-z]{3}$/)
        .nullish()
        .catch(void 0),
    }),
    limits: A(
      u({
        group: o()
          .nullish()
          .catch(void 0),
        resets_at: o()
          .nullish()
          .catch(void 0),
        is_active: M()
          .nullish()
          .catch(void 0),
      }).catch({}),
    )
      .nullish()
      .catch(void 0),
  }),
);
/**
 * 解析网关花费响应为 {used, limit, currency, utilization, resetsAt, period}：取生效中的 limit 的重置时间与周期，币种缺省 USD。
 */
//@ chunk-e6aww6q8.js:822600-822970 placement
function parseGatewaySpend(e) {
  let safeParse = gatewaySpendResponseSchema().safeParse(e);
  if (!safeParse.success) return;
  let { extra_usage: extra_usage, limits: limits } = safeParse.data,
    h = limits?.find((y) => y.is_active === !0);
  return {
    used: extra_usage.used_credits,
    limit: extra_usage.monthly_limit,
    currency: extra_usage.currency?.toUpperCase() ?? "USD",
    utilization: extra_usage.utilization,
    resetsAt: h?.resets_at && Number.isFinite(Date.parse(h.resets_at)) ? h.resets_at : null,
    period: SPEND_LIMIT_PERIODS.find((y) => y === h?.group) ?? null,
  };
}

export { Y0t, LXn, iGt, SPEND_PERIOD_LABELS };
