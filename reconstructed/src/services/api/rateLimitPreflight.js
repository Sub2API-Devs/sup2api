/**
 * services/api/rateLimitPreflight.ts
 *
 * 2.1.316 新增：请求前的限流预检
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (6)
 * attribution: placement 6
 */
import {
  maybeMockRateLimitHeaders,
  runQuotaProbe,
  getLimitsAccountEpoch,
  extractQuotaStatusFromError,
} from "../claudeAiLimits.js";
import { applyMockHeaders } from "../mockRateLimits.js";
import { checkMockRateLimitError } from "../rateLimitMocking.js";
import { Ot } from "../../../vendor/@anthropic-ai/sdk/core/error.mjs";
import { Vmr } from "../../utils/telemetry/otelRawBodies.js";
import { withDeadline } from "../../utils/sleep.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import { isClaudeAISubscriber } from "../../utils/auth.js";
import { getAPIProvider } from "../../utils/model/providers.js";
import { dD } from "../lowPriority/lowPriorityMode.js";
import { logForDebugging } from "../../utils/debug.js";
import { logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { getBareCheckModel } from "../../utils/model/smallFastModel.js";
import { logError } from "../../utils/log.js";

/**
 * 把预检得到的 429 分类：普通 429、超额、其他限额、重置时间不在未来，或真正被拒。
 */
//@ chunk-e6aww6q8.js:2509323-2509749 placement
function classifyPreflight429(e, n) {
  if (
    maybeMockRateLimitHeaders(e.headers ?? new globalThis.Headers()).get(
      "anthropic-ratelimit-unified-status",
    ) !== "rejected"
  )
    return "bare_429";
  let s = applyMockHeaders(e);
  if (s.errorCode !== void 0 || s.isUsingOverage === !0 || s.overageInUse === !0) return "overage";
  if (s.rateLimitType !== "five_hour" && s.rateLimitType !== "seven_day") return "other_claim";
  if (s.resetsAt === void 0 || !Number.isFinite(s.resetsAt) || s.resetsAt * 1000 <= n)
    return "reset_not_ahead";
  return "refused";
}
/**
 * 执行一次额度预检请求，把结果归类为放行、客户端/网络/HTTP 错误或各类 429。
 */
//@ chunk-e6aww6q8.js:2509749-2510095 placement
async function runPreflightProbe(e, n, r) {
  try {
    let s = checkMockRateLimitError(e);
    if (s !== null) throw s;
    return (await runQuotaProbe(e, n, r), { answer: "admitted" });
  } catch (error) {
    if (!(error instanceof Ot)) return { answer: "client_error" };
    if (error.status === void 0) return { answer: "network_error" };
    if (error.status !== 429) return { answer: "http_error" };
    let h = classifyPreflight429(error, Date.now());
    return h === "refused" ? { answer: h, rejection: error } : { answer: h };
  }
}
//@ chunk-e6aww6q8.js:2510095-2510278 placement
function stoppedPromise(e, n) {
  return new Promise((r) => {
    let s = () => r("stopped");
    (e.addEventListener("abort", s, { once: !0 }),
      n.addEventListener("abort", () => e.removeEventListener("abort", s), { once: !0 }));
  });
}
/**
 * 发一次配额探测请求（有截止时间、可外部停止），返回 admitted/refused/deadline/stopped 等；refused 时提供 report 回调把拒绝写入额度状态。
 */
//@ chunk-e6aww6q8.js:2510278-2510885 placement
async function preflightRateLimitCore({
  model: model,
  credentials: credentials,
  storageV5: storageV5,
  stop: stop,
  logFailure: logFailure,
  deadlineMs: deadlineMs = Vmr,
}) {
  if (stop.aborted) return { answer: "stopped", waitedMs: 0 };
  let now = Date.now(),
    abortController = new AbortController();
  try {
    let accountEpoch = getLimitsAccountEpoch(),
      outcome = await withDeadline(
        Promise.race([
          runPreflightProbe(model, credentials, abortController.signal),
          stoppedPromise(stop, abortController.signal),
        ]),
        deadlineMs,
      ),
      waitedMs = Date.now() - now;
    if (outcome === void 0 || outcome === "stopped")
      return { answer: outcome ?? "deadline", waitedMs: waitedMs };
    if (outcome.answer !== "refused") return { answer: outcome.answer, waitedMs: waitedMs };
    let { rejection: rejection } = outcome,
      now_2 = Date.now();
    return {
      answer: "refused",
      waitedMs: waitedMs,
      report: () => {
        try {
          extractQuotaStatusFromError(rejection, "other", now_2, accountEpoch, storageV5);
        } catch (error) {
          logFailure(error);
        }
      },
    };
  } catch (error) {
    return (logFailure(error), { answer: "threw", waitedMs: Date.now() - now });
  } finally {
    abortController.abort();
  }
}
//@ chunk-e6aww6q8.js:2510885-2510905 placement
var weakMap_9 = new WeakMap();
/**
 * 请求前的限流预检，按开关、必要流量、账号类型等决定是否跳过。
 */
//@ chunk-e6aww6q8.js:2510905-2512232 placement
async function preflightRateLimit({
  rejection: rejection,
  nowMs: nowMs,
  credentials: credentials,
  stop: stop,
}) {
  let h;
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_bright_wall", !0)) h = "skipped_kill_switch_off";
  else if (isEssentialTrafficOnly()) h = "skipped_essential_traffic_only";
  else if (!isClaudeAISubscriber() || getAPIProvider() !== "firstParty") h = "skipped_account";
  else if (dD()) h = "skipped_low_priority";
  else {
    let S = classifyPreflight429(rejection, nowMs);
    if (S !== "refused") h = `skipped_refusal_${S}`;
  }
  if (h !== void 0) {
    logForDebugging(`[usage limit recheck] no probe sent (${h}): the request sleeps on`);
    let S = weakMap_9.get(rejection) ?? new Set();
    if (!S.has(h)) (weakMap_9.set(rejection, S.add(h)), logFeatureSad("usage_limit_wait_recheck", h));
    return !1;
  }
  let y = await preflightRateLimitCore({
    model: getBareCheckModel(),
    credentials: credentials,
    storageV5: void 0,
    stop: stop,
    logFailure: logError,
  });
  switch (y.answer) {
    case "admitted":
      return (
        logForDebugging("[usage limit recheck] probe admitted: the request is sent again now"),
        logFeatureOk("usage_limit_wait_recheck", { lifted: !0, probe_ms: y.waitedMs }),
        !0
      );
    case "refused":
      return (
        logForDebugging("[usage limit recheck] probe refused: the request sleeps on"),
        logFeatureOk("usage_limit_wait_recheck", { lifted: !1, probe_ms: y.waitedMs }),
        !1
      );
    case "stopped":
      return (logForDebugging("[usage limit recheck] the request was given up"), !1);
    case "bare_429":
    case "overage":
    case "other_claim":
    case "reset_not_ahead":
    case "http_error":
    case "network_error":
    case "client_error":
    case "deadline":
    case "threw":
      return (
        logForDebugging(
          `[usage limit recheck] probe gave no clear answer (${y.answer}): the request sleeps on`,
        ),
        logFeatureSad("usage_limit_wait_recheck", `probe_${y.answer}`, { probe_ms: y.waitedMs }),
        !1
      );
  }
}

export { preflightRateLimit, preflightRateLimitCore };
