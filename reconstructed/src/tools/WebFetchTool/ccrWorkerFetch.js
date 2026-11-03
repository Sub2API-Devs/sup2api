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
import { ec } from "../../utils/timerDelayClamp.js";
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
import { Dt, isCancel, isAxiosError } from "../../../vendor/axios/dist/esm/axios.js";
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
var Ysn = 300000;
/**
 * WebFetch 抓取截止时间：优先取环境变量 CLAUDE_CODE_WEBFETCH_DEADLINE_MS，否则取特性开关值，均不超过上限。
 */
//@ chunk-e6aww6q8.js:2150817-2151023 placement
function getWebFetchDeadlineMs() {
  let CLAUDE_CODE_WEBFETCH_DEADLINE_MS = env.CLAUDE_CODE_WEBFETCH_DEADLINE_MS;
  if (CLAUDE_CODE_WEBFETCH_DEADLINE_MS !== void 0) return Math.min(CLAUDE_CODE_WEBFETCH_DEADLINE_MS, ec);
  let n = getFeatureValue_CACHED_MAY_BE_STALE("tengu_webfetch_deadline_ms", Ysn);
  return typeof n === "number" && Number.isFinite(n) && n >= 0 ? Math.min(n, ec) : Ysn;
}
/**
 * 云会话 worker 代抓网页的响应结构：url、最终地址、标题、正文、内容类型、抓取时间与错误。
 */
//@ chunk-e6aww6q8.js:2151023-2151435 placement
var ISO_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/,
  WORKER_FETCH_RESPONSE_SCHEMA = DoctorLazy(() =>
    create({
      url: create_2().optional().default(""),
      destination_url: create_2().nullable().optional(),
      title: create_2().optional().default(""),
      text: create_2().optional().default(""),
      content_type: create_2().nullable().optional(),
      retrieved_at: create_2()
        .regex(ISO_TIMESTAMP_PATTERN)
        .nullable()
        .optional()
        .catch(void 0),
      error: create({ error_type: create_2(), error_message: create_2() }).nullable().optional(),
    }),
  );
//@ chunk-e6aww6q8.js:2151435-2151515 placement
function M8e() {
  return getAPIProvider() === "firstParty" && env.CLAUDE_CODE_WEBFETCH_USE_CCR_PROXY;
}
//@ chunk-e6aww6q8.js:2151515-2151565 placement
function qTe(e) {
  if (!M8e()) return !1;
  return !!ccrSessionIdForRefs(e);
}
//@ chunk-e6aww6q8.js:2151565-2151604 placement
var yir = 4,
  _ir = 1000,
  Sir = 75000,
  Xsn = 40000;
//@ chunk-e6aww6q8.js:2151604-2151643 placement
function kir(e) {
  return e === 429 || e >= 500;
}
//@ chunk-e6aww6q8.js:2151643-2151908 placement
function logWorkerPost(e, n, r, s, h, y) {
  logEvent("tengu_ccr_worker_post", {
    toolName: fromEnum(n),
    outcome: fromEnum(e),
    attempt: r,
    httpDurationMs: Date.now() - s,
    error_code: e === "deadline" ? lit_2("EDEADLINE") : sanitizeErrnoForTelemetry(y),
    hasContentEncoding: h?.res?.rawHeaders?.some(
      (S, w) => w % 2 === 0 && S.toLowerCase() === "content-encoding",
    ),
  });
}
/**
 * 云会话中经 worker 接口代为抓取网页。
 */
//@ chunk-e6aww6q8.js:2151908-2155694 placement
async function fetchViaCcrWorker({
  session: session,
  route: route,
  toolName: toolName,
  logLabel: logLabel,
  targetErrorLabel: targetErrorLabel,
  body: body,
  schema: schema,
  signal: signal,
  retryPolicy: retryPolicy,
}) {
  let G = {
      maxAttempts: retryPolicy?.maxAttempts ?? yir,
      baseDelayMs: retryPolicy?.baseDelayMs ?? _ir,
      totalBudgetMs: retryPolicy?.totalBudgetMs ?? Sir,
    },
    replaced = (env.ANTHROPIC_BASE_URL || "https://api.anthropic.com").replace(/\/+$/, ""),
    ccrSessionUrl = session.host.launchOptions.ccrSessionUrl(),
    Se =
      ccrSessionUrl?.replace(/\/+$/, "") ??
      `${replaced}/v1/code/sessions/${encodeURIComponent(ccrSessionIdForRefs(session))}`,
    now = Date.now(),
    we = getWebFetchDeadlineMs(),
    Ee = createCombinedAbortSignal(signal, { timeoutMs: we === 0 ? void 0 : we, refTimer: !0 });
  using Ae = { [Symbol.dispose]: Ee.cleanup };
  let Ie,
    Me = 0;
  for (;;) {
    Me++;
    let ze =
        ccrSessionUrl === void 0
          ? getSessionIngressAuthHeaders()
          : configureApiKeyHeaders(env.CLAUDE_CODE_SESSION_ACCESS_TOKEN),
      now_2 = Date.now();
    try {
      Ie = await Dt.post(`${Se}/worker/${route}`, body, {
        signal: Ee.signal,
        timeout: Xsn,
        maxContentLength: 12582912,
        headers: {
          "User-Agent": claudeCodeUserAgent(),
          ...ze,
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
        },
        validateStatus: () => !0,
        maxRedirects: 0,
      });
    } catch (error) {
      let At = isCancel(error) && Ee.signal.aborted && !signal.aborted,
        It = isCancel(error) && !At;
      if (
        (logWorkerPost(
          It ? "canceled" : At ? "deadline" : "error",
          toolName,
          Me,
          now_2,
          isAxiosError(error) ? error.request : void 0,
          It || At ? void 0 : error,
        ),
        It)
      )
        throw new AbortError_2();
      if (At)
        return (
          logForDebugging(`ccr ${logLabel} hit the ${we / 1000}s deadline`, { level: "warn" }),
          {
            ok: !1,
            source: "proxy",
            statusCode: 504,
            errorType: "PROXY_DEADLINE",
            errorMessage: `The ${toolName} proxy had not finished answering after ${we / 1000}s, so Claude Code stopped the request. This does not mean the ${toolName === "WebFetch" ? "page is unavailable" : "query was wrong"}. Trying again may work, but could take another ${we / 1000}s.`,
          }
        );
      let Yt = error instanceof Error && "code" in error ? String(error.code) : void 0;
      return (
        logForDebugging(`ccr ${logLabel} transport error: ${Yt}`, { level: "warn" }),
        {
          ok: !1,
          source: "proxy",
          statusCode: 502,
          errorType: "PROXY_TRANSPORT",
          errorMessage: `Request to the ${toolName} proxy failed (${Yt ?? "transport error"}).`,
        }
      );
    }
    if ((logWorkerPost("answered", toolName, Me, now_2, Ie.request), Ie.status === 200)) break;
    let Je = Ie.headers?.["retry-after"],
      nt = parseRetryAfterMs_2(typeof Je === "string" ? Je : void 0);
    if (kir(Ie.status) && Me < G.maxAttempts) {
      let At = G.baseDelayMs * 2 ** (Me - 1) * (0.5 + Math.random() * 0.5),
        max = Math.max(At, nt ?? 0),
        Yt = Date.now() - now,
        qt = G.totalBudgetMs - Yt;
      if (max + Xsn <= qt && (we === 0 || max < we - Yt)) {
        if (
          (logForDebugging(
            `ccr ${logLabel} returned HTTP ${Ie.status}; retrying in ${Math.round(max)}ms (attempt ${Me} of ${G.maxAttempts})`,
            { level: "warn" },
          ),
          await sleep(max, Ee.signal),
          signal.aborted)
        )
          throw new AbortError_2();
        if (!Ee.signal.aborted) continue;
        logForDebugging(`ccr ${logLabel} hit the ${we / 1000}s deadline during the backoff wait`, {
          level: "warn",
        });
      }
    }
    let pt = truncateToLength(extractPlainErrorDetail(Ie.data) ?? "", 200),
      Et = Me > 1 ? ` after ${Me} attempts with backoff` : "",
      yt =
        Ie.status === 429 && nt !== void 0
          ? `; rate limited \u2014 the server requests waiting ~${Math.ceil(nt / 1000)}s before retrying`
          : "";
    return (
      logForDebugging(`ccr ${logLabel} returned HTTP ${Ie.status}${Et}${yt}${pt ? `: ${pt}` : ""}`, {
        level: "warn",
      }),
      {
        ok: !1,
        source: "proxy",
        statusCode: Ie.status,
        errorType: "PROXY_REJECTED",
        errorMessage: [301, 302, 303, 307, 308].includes(Ie.status)
          ? `The ${toolName} proxy itself answered with a redirect (HTTP ${Ie.status}), which is not followed. Asking again will not change that.`
          : `The ${toolName} proxy rejected the request (HTTP ${Ie.status}${Et}${yt})${pt ? `: ${pt}` : "."}`,
      }
    );
  }
  let safeParse = schema.safeParse(Ie.data);
  if (!safeParse.success)
    return (
      logForDebugging(`ccr ${logLabel} returned unparseable body: ${safeParse.error.message}`, {
        level: "warn",
      }),
      {
        ok: !1,
        source: "proxy",
        statusCode: 502,
        errorType: "PROXY_BAD_RESPONSE",
        errorMessage: `The ${toolName} proxy returned a malformed response.`,
      }
    );
  if (safeParse.data.error) {
    let ze = safeParse.data.error.error_type || void 0,
      lt = safeParse.data.error.error_message || void 0,
      Je = ze && /^\w{1,64}$/.test(ze) ? ze : void 0,
      nt = lt && isAlreadyPrintable(lt, 1024) ? lt : void 0;
    if (Je !== ze || nt !== lt)
      logEvent("tengu_ccr_proxy_target_error_left_out", {
        type_left_out: Je !== ze,
        type_length: ze?.length ?? 0,
        message_left_out: nt !== lt,
        message_length: lt?.length ?? 0,
      });
    return (
      logForDebugging(
        `ccr ${logLabel} ${targetErrorLabel}: ${Je ?? `no type (${ze?.length ?? 0} UTF-16 units left out)`}${nt !== lt ? `, message left out (${lt?.length})` : ""}`,
        { level: "warn" },
      ),
      { ok: !1, source: "target", statusCode: 502, errorType: Je, errorMessage: nt }
    );
  }
  return { ok: !0, data: safeParse.data };
}

export { fetchViaCcrWorker, WORKER_FETCH_RESPONSE_SCHEMA, getWebFetchDeadlineMs, qTe, M8e };
