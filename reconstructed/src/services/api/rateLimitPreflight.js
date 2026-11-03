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
import { APIError } from "../../../vendor/@anthropic-ai/sdk/core/error.mjs";
import { RATE_LIMIT_PREFLIGHT_MS } from "../../utils/telemetry/otelRawBodies.js";
import { withDeadline } from "../../utils/sleep.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import { isClaudeAISubscriber } from "../../utils/auth.js";
import { getAPIProvider } from "../../utils/model/providers.js";
import { isLowPriorityActive } from "../lowPriority/lowPriorityMode.js";
import { logForDebugging } from "../../utils/debug.js";
import { logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { getBareCheckModel } from "../../utils/model/smallFastModel.js";
import { logError } from "../../utils/log.js";

//@ chunk-e6aww6q8.js:2509323-2509749 placement
/**
 * 把预检得到的 429 分类：普通 429、超额、其他限额、重置时间不在未来，或真正被拒。
 */
function classifyPreflight429(headers, n) {
  if (
    maybeMockRateLimitHeaders(headers.headers ?? new globalThis.Headers()).get(
      "anthropic-ratelimit-unified-status",
    ) !== "rejected"
  )
    return "bare_429";
  let s = applyMockHeaders(headers);
  if (s.errorCode !== undefined || s.isUsingOverage === true || s.overageInUse === true) return "overage";
  if (s.rateLimitType !== "five_hour" && s.rateLimitType !== "seven_day") return "other_claim";
  if (s.resetsAt === undefined || !Number.isFinite(s.resetsAt) || s.resetsAt * 1000 <= n)
    return "reset_not_ahead";
  return "refused";
}
//@ chunk-e6aww6q8.js:2509749-2510095 placement
/**
 * 执行一次额度预检请求，把结果归类为放行、客户端/网络/HTTP 错误或各类 429。
 */
async function runPreflightProbe(currentModel, credentials, signal) {
  try {
    let s = checkMockRateLimitError(currentModel);
    if (s !== null) throw s;
    await runQuotaProbe(currentModel, credentials, signal);
    return {
      answer: "admitted",
    };
  } catch (error) {
    if (!(error instanceof APIError))
      return {
        answer: "client_error",
      };
    if (error.status === undefined)
      return {
        answer: "network_error",
      };
    if (error.status !== 429)
      return {
        answer: "http_error",
      };
    let h = classifyPreflight429(error, Date.now());
    return h === "refused"
      ? {
          answer: h,
          rejection: error,
        }
      : {
          answer: h,
        };
  }
}
//@ chunk-e6aww6q8.js:2510095-2510278 placement
function stoppedPromise(stop, signal) {
  return new Promise((resolve) => {
    let s = () => resolve("stopped");
    stop.addEventListener("abort", s, {
      once: true,
    });
    signal.addEventListener("abort", () => stop.removeEventListener("abort", s), {
      once: true,
    });
  });
}
//@ chunk-e6aww6q8.js:2510278-2510885 placement
/**
 * 发一次配额探测请求（有截止时间、可外部停止），返回 admitted/refused/deadline/stopped 等；refused 时提供 report 回调把拒绝写入额度状态。
 */
async function preflightRateLimitCore({
  model,
  credentials,
  storageV5,
  stop,
  logFailure,
  deadlineMs = RATE_LIMIT_PREFLIGHT_MS,
}) {
  if (stop.aborted)
    return {
      answer: "stopped",
      waitedMs: 0,
    };
  let now = Date.now();
  let abortController = new AbortController();
  try {
    let accountEpoch = getLimitsAccountEpoch();
    let outcome = await withDeadline(
      Promise.race([
        runPreflightProbe(model, credentials, abortController.signal),
        stoppedPromise(stop, abortController.signal),
      ]),
      deadlineMs,
    );
    let waitedMs = Date.now() - now;
    if (outcome === undefined || outcome === "stopped")
      return {
        answer: outcome ?? "deadline",
        waitedMs,
      };
    if (outcome.answer !== "refused")
      return {
        answer: outcome.answer,
        waitedMs,
      };
    let { rejection } = outcome;
    let now_2 = Date.now();
    return {
      answer: "refused",
      waitedMs,
      report: () => {
        try {
          extractQuotaStatusFromError(rejection, "other", now_2, accountEpoch, storageV5);
        } catch (error) {
          logFailure(error);
        }
      },
    };
  } catch (error) {
    logFailure(error);
    return {
      answer: "threw",
      waitedMs: Date.now() - now,
    };
  } finally {
    abortController.abort();
  }
}
//@ chunk-e6aww6q8.js:2510885-2510905 placement
var weakMap_9 = new WeakMap();
//@ chunk-e6aww6q8.js:2510905-2512232 placement
/**
 * 请求前的限流预检，按开关、必要流量、账号类型等决定是否跳过。
 */
async function preflightRateLimit({ rejection, nowMs, credentials, stop }) {
  let h;
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_bright_wall", true)) h = "skipped_kill_switch_off";
  else if (isEssentialTrafficOnly()) h = "skipped_essential_traffic_only";
  else if (!isClaudeAISubscriber() || getAPIProvider() !== "firstParty") h = "skipped_account";
  else if (isLowPriorityActive()) h = "skipped_low_priority";
  else {
    let S = classifyPreflight429(rejection, nowMs);
    if (S !== "refused") h = `skipped_refusal_${S}`;
  }
  if (h !== undefined) {
    logForDebugging(`[usage limit recheck] no probe sent (${h}): the request sleeps on`);
    let S = weakMap_9.get(rejection) ?? new Set();
    if (!S.has(h)) {
      weakMap_9.set(rejection, S.add(h));
      logFeatureSad("usage_limit_wait_recheck", h);
    }
    return false;
  }
  let y = await preflightRateLimitCore({
    model: getBareCheckModel(),
    credentials,
    storageV5: undefined,
    stop,
    logFailure: logError,
  });
  switch (y.answer) {
    case "admitted":
      logForDebugging("[usage limit recheck] probe admitted: the request is sent again now");
      logFeatureOk("usage_limit_wait_recheck", {
        lifted: true,
        probe_ms: y.waitedMs,
      });
      return true;
    case "refused":
      logForDebugging("[usage limit recheck] probe refused: the request sleeps on");
      logFeatureOk("usage_limit_wait_recheck", {
        lifted: false,
        probe_ms: y.waitedMs,
      });
      return false;
    case "stopped":
      logForDebugging("[usage limit recheck] the request was given up");
      return false;
    case "bare_429":
    case "overage":
    case "other_claim":
    case "reset_not_ahead":
    case "http_error":
    case "network_error":
    case "client_error":
    case "deadline":
    case "threw":
      logForDebugging(
        `[usage limit recheck] probe gave no clear answer (${y.answer}): the request sleeps on`,
      );
      logFeatureSad("usage_limit_wait_recheck", `probe_${y.answer}`, {
        probe_ms: y.waitedMs,
      });
      return false;
  }
}
export { preflightRateLimit, preflightRateLimitCore };
