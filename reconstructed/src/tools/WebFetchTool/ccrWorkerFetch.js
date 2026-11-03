/**
 * tools/WebFetchTool/ccrWorkerFetch.ts
 *
 * 2.1.316 新增：云会话中经 worker 代为抓取网页
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (9)
 * attribution: placement 9
 */
import { env } from "../../utils/env.js";
import { MAX_TIMER_DELAY_MS } from "../../utils/timerDelayClamp.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { create, create_2 } from "../../../vendor/zod/lib/index.mjs";
import { getAPIProvider } from "../../utils/model/providers.js";
import { ccrSessionIdForRefs } from "../../utils/claudeAiSync/sessionRefsGate.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum, lit as lit_2 } from "../../services/analytics/safeMetadata.js";
import { sanitizeErrnoForTelemetry, AbortError as AbortError_2 } from "../../utils/errors.js";
import { createCombinedAbortSignal } from "../../utils/combinedAbortSignal.js";
import { getSessionIngressAuthHeaders } from "../../utils/sessionIngressAuth.js";
import { configureApiKeyHeaders } from "../../services/api/client.js";
import { axios_default, isCancel, isAxiosError } from "../../../vendor/axios/dist/esm/axios.js";
import { claudeCodeUserAgent } from "../../utils/http.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  parseRetryAfterMs as parseRetryAfterMs_2,
  extractPlainErrorDetail,
} from "../../bridge/debugUtils.js";
import { sleep } from "../../utils/sleep.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { isAlreadyPrintable } from "../../utils/printableName.js";

//@ chunk-e6aww6q8.js:2150802-2150817 placement
/**
 * WebFetch 抓取截止时间的默认值（5 分钟）。
 */
var DEFAULT_WEBFETCH_DEADLINE_MS = 300000;
//@ chunk-e6aww6q8.js:2150817-2151023 placement
/**
 * WebFetch 抓取截止时间：优先取环境变量 CLAUDE_CODE_WEBFETCH_DEADLINE_MS，否则取特性开关值，均不超过上限。
 */
function getWebFetchDeadlineMs() {
  let CLAUDE_CODE_WEBFETCH_DEADLINE_MS = env.CLAUDE_CODE_WEBFETCH_DEADLINE_MS;
  if (CLAUDE_CODE_WEBFETCH_DEADLINE_MS !== undefined)
    return Math.min(CLAUDE_CODE_WEBFETCH_DEADLINE_MS, MAX_TIMER_DELAY_MS);
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
    "tengu_webfetch_deadline_ms",
    DEFAULT_WEBFETCH_DEADLINE_MS,
  );
  return typeof featureValue_CACHED_MAY_BE_STALE === "number" &&
    Number.isFinite(featureValue_CACHED_MAY_BE_STALE) &&
    featureValue_CACHED_MAY_BE_STALE >= 0
    ? Math.min(featureValue_CACHED_MAY_BE_STALE, MAX_TIMER_DELAY_MS)
    : DEFAULT_WEBFETCH_DEADLINE_MS;
}
//@ chunk-e6aww6q8.js:2151023-2151435 placement
/**
 * 云会话 worker 代抓网页的响应结构：url、最终地址、标题、正文、内容类型、抓取时间与错误。
 */
var ISO_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
var WORKER_FETCH_RESPONSE_SCHEMA = DoctorLazy(() =>
  create({
    url: create_2().optional().default(""),
    destination_url: create_2().nullable().optional(),
    title: create_2().optional().default(""),
    text: create_2().optional().default(""),
    content_type: create_2().nullable().optional(),
    retrieved_at: create_2().regex(ISO_TIMESTAMP_PATTERN).nullable().optional().catch(undefined),
    error: create({
      error_type: create_2(),
      error_message: create_2(),
    })
      .nullable()
      .optional(),
  }),
);
//@ chunk-e6aww6q8.js:2151435-2151515 placement
/**
 * 是否使用 CCR worker 代理抓取（首方 API 且设置了环境变量）。
 */
function shouldUseCcrWebFetchProxy() {
  return getAPIProvider() === "firstParty" && env.CLAUDE_CODE_WEBFETCH_USE_CCR_PROXY;
}
//@ chunk-e6aww6q8.js:2151515-2151565 placement
/**
 * 当前请求能否通过 CCR worker 抓取（有此会话的 CCR 会话 id）。
 */
function canFetchViaCcrWorker(session) {
  if (!shouldUseCcrWebFetchProxy()) return false;
  return !!ccrSessionIdForRefs(session);
}
//@ chunk-e6aww6q8.js:2151565-2151604 placement
/**
 * CCR 抓取的最大尝试次数（4）。
 */
var CCR_FETCH_MAX_ATTEMPTS = 4;
var CCR_FETCH_BASE_DELAY_MS = 1000;
var CCR_FETCH_TOTAL_BUDGET_MS = 75000;
var CCR_FETCH_TIMEOUT_MS = 40000;
//@ chunk-e6aww6q8.js:2151604-2151643 placement
/**
 * 判断 HTTP 状态码是否可重试（429 或 5xx）。
 */
function isRetryableFetchStatus(status) {
  return status === 429 || status >= 500;
}
//@ chunk-e6aww6q8.js:2151643-2151908 placement
function logWorkerPost(e, toolName, attempt, s, h, y) {
  logEvent("tengu_ccr_worker_post", {
    toolName: fromEnum(toolName),
    outcome: fromEnum(e),
    attempt,
    httpDurationMs: Date.now() - s,
    error_code: e === "deadline" ? lit_2("EDEADLINE") : sanitizeErrnoForTelemetry(y),
    hasContentEncoding: h?.res?.rawHeaders?.some(
      (rawHeader, w) => w % 2 === 0 && rawHeader.toLowerCase() === "content-encoding",
    ),
  });
}
//@ chunk-e6aww6q8.js:2151908-2155694 placement
/**
 * 云会话中经 worker 接口代为抓取网页。
 */
async function fetchViaCcrWorker({
  session,
  route,
  toolName,
  logLabel,
  targetErrorLabel,
  body,
  schema,
  signal,
  retryPolicy,
}) {
  let G = {
    maxAttempts: retryPolicy?.maxAttempts ?? CCR_FETCH_MAX_ATTEMPTS,
    baseDelayMs: retryPolicy?.baseDelayMs ?? CCR_FETCH_BASE_DELAY_MS,
    totalBudgetMs: retryPolicy?.totalBudgetMs ?? CCR_FETCH_TOTAL_BUDGET_MS,
  };
  let replaced = (env.ANTHROPIC_BASE_URL || "https://api.anthropic.com").replace(/\/+$/, "");
  let Z = session.host.launchOptions.ccrSessionUrl();
  let Se =
    Z?.replace(/\/+$/, "") ??
    `${replaced}/v1/code/sessions/${encodeURIComponent(ccrSessionIdForRefs(session))}`;
  let now = Date.now();
  let webFetchDeadlineMs = getWebFetchDeadlineMs();
  let combinedAbortSignal = createCombinedAbortSignal(signal, {
    timeoutMs: webFetchDeadlineMs === 0 ? undefined : webFetchDeadlineMs,
    refTimer: true,
  });
  using Ae = {
    [Symbol.dispose]: combinedAbortSignal.cleanup,
  };
  let Ie;
  let attempt = 0;
  for (;;) {
    attempt++;
    let ze =
      Z === undefined
        ? getSessionIngressAuthHeaders()
        : configureApiKeyHeaders(env.CLAUDE_CODE_SESSION_ACCESS_TOKEN);
    let now_2 = Date.now();
    try {
      Ie = await axios_default.post(`${Se}/worker/${route}`, body, {
        signal: combinedAbortSignal.signal,
        timeout: CCR_FETCH_TIMEOUT_MS,
        maxContentLength: 12582912,
        headers: {
          "User-Agent": claudeCodeUserAgent(),
          ...ze,
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
        },
        validateStatus: () => true,
        maxRedirects: 0,
      });
    } catch (error) {
      let At = isCancel(error) && combinedAbortSignal.signal.aborted && !signal.aborted;
      let It = isCancel(error) && !At;
      logWorkerPost(
        It ? "canceled" : At ? "deadline" : "error",
        toolName,
        attempt,
        now_2,
        isAxiosError(error) ? error.request : undefined,
        It || At ? undefined : error,
      );
      if (It) throw new AbortError_2();
      if (At) {
        logForDebugging(`ccr ${logLabel} hit the ${webFetchDeadlineMs / 1000}s deadline`, {
          level: "warn",
        });
        return {
          ok: false,
          source: "proxy",
          statusCode: 504,
          errorType: "PROXY_DEADLINE",
          errorMessage: `The ${toolName} proxy had not finished answering after ${webFetchDeadlineMs / 1000}s, so Claude Code stopped the request. This does not mean the ${toolName === "WebFetch" ? "page is unavailable" : "query was wrong"}. Trying again may work, but could take another ${webFetchDeadlineMs / 1000}s.`,
        };
      }
      let Yt = error instanceof Error && "code" in error ? String(error.code) : undefined;
      logForDebugging(`ccr ${logLabel} transport error: ${Yt}`, {
        level: "warn",
      });
      return {
        ok: false,
        source: "proxy",
        statusCode: 502,
        errorType: "PROXY_TRANSPORT",
        errorMessage: `Request to the ${toolName} proxy failed (${Yt ?? "transport error"}).`,
      };
    }
    logWorkerPost("answered", toolName, attempt, now_2, Ie.request);
    if (Ie.status === 200) break;
    let Je = Ie.headers?.["retry-after"];
    let retryAfterMs = parseRetryAfterMs_2(typeof Je === "string" ? Je : undefined);
    if (isRetryableFetchStatus(Ie.status) && attempt < G.maxAttempts) {
      let At = G.baseDelayMs * 2 ** (attempt - 1) * (0.5 + Math.random() * 0.5);
      let max = Math.max(At, retryAfterMs ?? 0);
      let Yt = Date.now() - now;
      let qt = G.totalBudgetMs - Yt;
      if (max + CCR_FETCH_TIMEOUT_MS <= qt && (webFetchDeadlineMs === 0 || max < webFetchDeadlineMs - Yt)) {
        logForDebugging(
          `ccr ${logLabel} returned HTTP ${Ie.status}; retrying in ${Math.round(max)}ms (attempt ${attempt} of ${G.maxAttempts})`,
          {
            level: "warn",
          },
        );
        await sleep(max, combinedAbortSignal.signal);
        if (signal.aborted) throw new AbortError_2();
        if (!combinedAbortSignal.signal.aborted) continue;
        logForDebugging(
          `ccr ${logLabel} hit the ${webFetchDeadlineMs / 1000}s deadline during the backoff wait`,
          {
            level: "warn",
          },
        );
      }
    }
    let pt = truncateToLength(extractPlainErrorDetail(Ie.data) ?? "", 200);
    let Et = attempt > 1 ? ` after ${attempt} attempts with backoff` : "";
    let yt =
      Ie.status === 429 && retryAfterMs !== undefined
        ? `; rate limited \u2014 the server requests waiting ~${Math.ceil(retryAfterMs / 1000)}s before retrying`
        : "";
    logForDebugging(`ccr ${logLabel} returned HTTP ${Ie.status}${Et}${yt}${pt ? `: ${pt}` : ""}`, {
      level: "warn",
    });
    return {
      ok: false,
      source: "proxy",
      statusCode: Ie.status,
      errorType: "PROXY_REJECTED",
      errorMessage: [301, 302, 303, 307, 308].includes(Ie.status)
        ? `The ${toolName} proxy itself answered with a redirect (HTTP ${Ie.status}), which is not followed. Asking again will not change that.`
        : `The ${toolName} proxy rejected the request (HTTP ${Ie.status}${Et}${yt})${pt ? `: ${pt}` : "."}`,
    };
  }
  let We = schema.safeParse(Ie.data);
  if (!We.success) {
    logForDebugging(`ccr ${logLabel} returned unparseable body: ${We.error.message}`, {
      level: "warn",
    });
    return {
      ok: false,
      source: "proxy",
      statusCode: 502,
      errorType: "PROXY_BAD_RESPONSE",
      errorMessage: `The ${toolName} proxy returned a malformed response.`,
    };
  }
  if (We.data.error) {
    let errorType = We.data.error.error_type || undefined;
    let errorMessage = We.data.error.error_message || undefined;
    let Je = errorType && /^\w{1,64}$/.test(errorType) ? errorType : undefined;
    let nt = errorMessage && isAlreadyPrintable(errorMessage, 1024) ? errorMessage : undefined;
    if (Je !== errorType || nt !== errorMessage)
      logEvent("tengu_ccr_proxy_target_error_left_out", {
        type_left_out: Je !== errorType,
        type_length: errorType?.length ?? 0,
        message_left_out: nt !== errorMessage,
        message_length: errorMessage?.length ?? 0,
      });
    logForDebugging(
      `ccr ${logLabel} ${targetErrorLabel}: ${Je ?? `no type (${errorType?.length ?? 0} UTF-16 units left out)`}${nt !== errorMessage ? `, message left out (${errorMessage?.length})` : ""}`,
      {
        level: "warn",
      },
    );
    return {
      ok: false,
      source: "target",
      statusCode: 502,
      errorType: Je,
      errorMessage: nt,
    };
  }
  return {
    ok: true,
    data: We.data,
  };
}
export {
  fetchViaCcrWorker,
  WORKER_FETCH_RESPONSE_SCHEMA,
  getWebFetchDeadlineMs,
  canFetchViaCcrWorker,
  shouldUseCcrWebFetchProxy,
};
