/**
 * services/selfHostedRunner/workOrder.ts
 *
 * 2.1.316 新增：自托管 runner 的工单与轮询：日志转发、工单兑现错误、SSE 工作提示流
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hm0ce8vc.js (13)
 * attribution: placement 13
 */
import { stat, open } from "fs/promises";
import { randomUUID } from "crypto";
import { withFsOpTimeout } from "../../utils/boundedTimeout.js";
import { getHttpStatus, getRunnerErrorFields } from "../../selfHostedRunner/runnerApiErrors.js";
import { redactSecretsInText } from "../../utils/redactSecrets.js";
import { isSnakeCaseReasonCode } from "../../bridge/codeSessionApi.js";
import { isAlreadyPrintable } from "../../utils/printableName.js";
import { isPoolSpawnJwt, decodeSessionJwt } from "./sessionLaunch.js";
import { sleep } from "../../utils/sleep.js";
import { RUNNER_CLIENT_VERSION } from "../../selfHostedRunner/serverAutoMode.js";
import { getProxyFetchOptions } from "../../utils/proxy.js";
import { getTLSFetchOptions } from "../../utils/mtls.js";
import { drainResponseBody, DEFAULT_DRAIN_TIMEOUT_MS } from "../../utils/http.js";
import { errorMessage } from "../../utils/errors.js";

//@ chunk-hm0ce8vc.js:213722-213733 placement
/**
 * 日志转发缓冲区保留行数（只转发最近若干行）。
 */
var MAX_LOG_LINES_BUFFERED = 500;
//@ chunk-hm0ce8vc.js:213733-214473 placement
async function forwardLogFile(e) {
  let { apiClient, apiBaseUrl, sessionId, sessionToken, workerEpoch } = e;
  let l = 262144;
  let u;
  try {
    let y = await withFsOpTimeout(stat(e.debugFile), `stat ${e.debugFile}`);
    let max = Math.max(0, y.size - 262144);
    let w = await withFsOpTimeout(open(e.debugFile, "r"), `open ${e.debugFile}`);
    try {
      let E = Buffer.alloc(Math.min(y.size, 262144));
      let { bytesRead } = await withFsOpTimeout(w.read(E, 0, E.length, max), `read ${e.debugFile}`);
      u = E.toString("utf-8", 0, bytesRead);
    } finally {
      await w.close().catch(() => {});
    }
  } catch {
    return false;
  }
  let sliced = u
    .split(
      `
`,
    )
    .filter((line) => line.length > 0)
    .slice(-MAX_LOG_LINES_BUFFERED);
  if (sliced.length === 0) return false;
  let timestamp = new Date().toISOString();
  let mapped = sliced.map((message) => ({
    timestamp,
    fields: {
      message,
    },
  }));
  await apiClient.forwardDiagnostics(apiBaseUrl, sessionId, sessionToken, workerEpoch, mapped);
  e.onDebug(`[runner:session] forwarded ${sliced.length} debug log lines to /worker/diagnostics`);
  return true;
}
//@ chunk-hm0ce8vc.js:214473-214555 placement
function makeInitMilestoneMessage(message) {
  return {
    type: "system",
    uuid: randomUUID(),
    subtype: "init_milestone",
    message,
  };
}
//@ chunk-hm0ce8vc.js:214555-214756 placement
function logEnvManager(stepId, n, content, s) {
  return {
    type: "env_manager_log",
    uuid: randomUUID(),
    data: {
      level: n === "failed" ? "error" : "info",
      category: "init",
      content,
      timestamp: new Date().toISOString(),
      extra: {
        step_id: stepId,
        step_status: n,
        ...s,
      },
    },
  };
}
//@ chunk-hm0ce8vc.js:214756-214886 placement
function logCloneStep(repo, n, r, s) {
  return logEnvManager("clone", "completed", `${repo} ${n} (${r}ms)`, {
    ...s,
    step_detail: repo,
    clone_phase: n,
    duration_ms: String(r),
  });
}
//@ chunk-hm0ce8vc.js:214886-215506 placement
/**
 * 工单已被使用/被替代等服务器拒绝原因说明。
 */
var WORK_ORDER_REJECTION_REASONS =
  "this work order has already been used, or another runner already has its session";
var WORK_ORDER_REJECTION_TEXT_BY_REASON = new Map([
  ["already_registered", WORK_ORDER_REJECTION_REASONS],
  ["standby_already_redeemed", WORK_ORDER_REJECTION_REASONS],
  ["superseded", "this work order has been superseded, so this runner is not needed"],
  ["session_paused", "the session is paused, so no runner is needed for it right now"],
]);
var WORK_ORDER_USED_MESSAGE = 1024;
var WORK_ORDER_RESTART_EXPLANATION =
  "See https://code.claude.com/docs/en/self-hosted-environments-deploy#troubleshooting";
var WORK_ORDER_SINGLE_USE_TEXT =
  "A work order is single-use and short-lived, so restarting this runner with the same one cannot help. A restarted runner needs a fresh work order, which comes only with a new spawn request.";
//@ chunk-hm0ce8vc.js:215506-216618 placement
/**
 * 描述服务器拒绝（HTTP 状态、令牌是否过期、--api-url、时钟偏差）。
 */
function describeServerAuthRejection(error, n) {
  let httpStatus = getHttpStatus(error);
  let { errorType, errorReason, serverMessage } = getRunnerErrorFields(error);
  let l = redactSecretsInText(
    [
      [errorType, errorReason].filter(isSnakeCaseReasonCode).join(", "),
      serverMessage && isAlreadyPrintable(serverMessage, WORK_ORDER_USED_MESSAGE) ? serverMessage : undefined,
    ]
      .filter(Boolean)
      .join(": "),
  );
  let u = `The server answered (HTTP ${httpStatus}) ${l}`.trimEnd();
  let h;
  if (httpStatus === 401 && isPoolSpawnJwt(n)) {
    let date = new Date((decodeSessionJwt(n) ?? NaN) * 1000);
    let S = !Number.isNaN(date.getTime());
    if (!S || date.getTime() > Date.now())
      return `RegisterRunner refused because the server did not accept this work order${S ? ", which has not expired by this host's clock" : ", which may have expired"}. Check the work order${S ? ", --api-url, and the clock" : " and --api-url"}. A restart alone cannot help. This does not show the environment secret is bad, so do not rotate it. ${WORK_ORDER_RESTART_EXPLANATION} ${u}`;
    h = `this work order expired at ${date.toISOString()}`;
  } else if (httpStatus === 409 && errorType === "work_order_not_redeemable")
    h =
      WORK_ORDER_REJECTION_TEXT_BY_REASON.get(errorReason) ??
      "this work order can no longer be used, so this runner is not needed";
  else if (httpStatus === 409 && errorType === "session_not_active" && isPoolSpawnJwt(n))
    h = "the session is no longer active, so this runner is not needed";
  else return null;
  return `RegisterRunner refused because ${h}. ${WORK_ORDER_SINGLE_USE_TEXT} The environment secret is not at fault, so do not rotate it. ${WORK_ORDER_RESTART_EXPLANATION} ${u}`;
}
//@ chunk-hm0ce8vc.js:216618-216714 placement
var POLL_WAKE_SOURCES = {
  POLL: "POLL_WAKE_SOURCE_POLL",
  SSE: "POLL_WAKE_SOURCE_SSE",
  LOCAL: "POLL_WAKE_SOURCE_LOCAL",
};
//@ chunk-hm0ce8vc.js:216714-217261 placement
/**
 * 轮询唤醒器：SSE、POLL、本地三种唤醒源。
 */
class PollWaker {
  ac = new AbortController();
  pending = null;
  atCapacity = false;
  wake(e) {
    if (e === "SSE" && this.atCapacity) return;
    if (this.pending !== "SSE") this.pending = e;
    this.ac.abort();
  }
  async wait(e, n) {
    if (this.pending !== null || n.aborted) return;
    let abortController = new AbortController();
    let s = () => abortController.abort();
    let signal = this.ac.signal;
    n.addEventListener("abort", s, {
      once: true,
    });
    signal.addEventListener("abort", s, {
      once: true,
    });
    try {
      await sleep(e, abortController.signal);
    } finally {
      n.removeEventListener("abort", s);
      signal.removeEventListener("abort", s);
    }
  }
  consume() {
    let pending = this.pending ?? "POLL";
    this.pending = null;
    this.ac = new AbortController();
    return pending;
  }
}
//@ chunk-hm0ce8vc.js:217261-217298 placement
var MAX_SERVER_MESSAGE_CHARS = 200;
var WORK_HINTS_BACKOFF_BASE_MS = 1000;
var WORK_HINTS_BACKOFF_MAX_MS = 30000;
var WORK_HINTS_CONNECT_TIMEOUT_MS = 45000;
//@ chunk-hm0ce8vc.js:217298-217323 placement
/**
 * 中止工作提示流的请求。
 */
function abortRequest(e) {
  e.abort();
}
//@ chunk-hm0ce8vc.js:217323-218339 placement
/**
 * 订阅 /v1/code/runners/self-hosted/runners/<id>/work-hints/stream SSE，收到 work_available 时唤醒轮询。
 */
function streamWorkHints(e) {
  let { baseUrl, runnerId, tokenState, onWake, onDebug, signal } = e;
  let u = `${baseUrl}/v1/code/runners/self-hosted/runners/${encodeURIComponent(runnerId)}/work-hints/stream`;
  let h = false;
  let p = 0;
  let S = null;
  let T = () => {
    h = true;
    S?.abort();
  };
  signal.addEventListener("abort", T, {
    once: true,
  });
  (async () => {
    while (!h && !signal.aborted) {
      S = new AbortController();
      try {
        let response = await fetch(u, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${tokenState.runnerToken}`,
            Accept: "text/event-stream",
            "anthropic-version": "2023-06-01",
            "x-self-hosted-runner-version": RUNNER_CLIENT_VERSION,
          },
          ...getProxyFetchOptions({
            url: u,
          }),
          ...getTLSFetchOptions(undefined),
          signal: S.signal,
        });
        if (!response.ok || !response.body) {
          onDebug(`[runner:hints] stream HTTP ${response.status} \u2014 degrading to poll, retrying`);
          drainResponseBody(response, {
            timeoutMs: DEFAULT_DRAIN_TIMEOUT_MS,
          });
          throw Error(`HTTP ${response.status}`);
        }
        onDebug("[runner:hints] stream connected");
        if (await parseWorkHintEvent(response.body, onWake, S)) p = 0;
        onDebug("[runner:hints] stream ended \u2014 reconnecting");
      } catch (error) {
        if (h || signal.aborted) break;
        if (p === 0) onDebug(`[runner:hints] stream error: ${errorMessage(error)}`);
      }
      p++;
      let min = Math.min(WORK_HINTS_BACKOFF_MAX_MS, WORK_HINTS_BACKOFF_BASE_MS * 2 ** p);
      let floored = Math.floor(Math.random() * min);
      await sleep(floored, signal);
    }
    signal.removeEventListener("abort", T);
  })();
  return {
    close: T,
  };
}
//@ chunk-hm0ce8vc.js:218339-218854 placement
async function parseWorkHintEvent(body, onWake, r) {
  let reader = body.getReader();
  let textDecoder = new TextDecoder();
  let o = "";
  let l = false;
  let u;
  let h = () => {
    if (u !== undefined) clearTimeout(u);
    u = setTimeout(abortRequest, WORK_HINTS_CONNECT_TIMEOUT_MS, r);
    u.unref?.();
  };
  h();
  try {
    while (!r.signal.aborted) {
      let { done: p, value: S } = await reader.read();
      if (p) return l;
      l = true;
      h();
      o += textDecoder.decode(S, {
        stream: true,
      });
      let T;
      while (
        (T = o.indexOf(`
`)) >= 0
      ) {
        let replaced = o.slice(0, T).replace(/\r$/, "");
        o = o.slice(T + 1);
        if (replaced.startsWith("event:") && replaced.slice(6).trimStart() === "work_available") onWake();
      }
    }
    return l;
  } finally {
    if (u !== undefined) clearTimeout(u);
    reader.releaseLock();
    body.cancel().catch(() => {});
  }
}
export {
  makeInitMilestoneMessage,
  logEnvManager,
  logCloneStep,
  forwardLogFile,
  describeServerAuthRejection,
  WORK_ORDER_SINGLE_USE_TEXT,
  PollWaker,
  streamWorkHints,
  MAX_SERVER_MESSAGE_CHARS,
  POLL_WAKE_SOURCES,
};
