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
async function forwardLogFile(options) {
  let { apiClient, apiBaseUrl, sessionId, sessionToken, workerEpoch } = options;
  let windowBytes = 262144;
  let text;
  try {
    let stats = await withFsOpTimeout(stat(options.debugFile), `stat ${options.debugFile}`);
    let max = Math.max(0, stats.size - 262144);
    let handle = await withFsOpTimeout(open(options.debugFile, "r"), `open ${options.debugFile}`);
    try {
      let buffer = Buffer.alloc(Math.min(stats.size, 262144));
      let { bytesRead } = await withFsOpTimeout(
        handle.read(buffer, 0, buffer.length, max),
        `read ${options.debugFile}`,
      );
      text = buffer.toString("utf-8", 0, bytesRead);
    } finally {
      await handle.close().catch(() => {});
    }
  } catch {
    return false;
  }
  let sliced = text
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
  options.onDebug(`[runner:session] forwarded ${sliced.length} debug log lines to /worker/diagnostics`);
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
function logEnvManager(stepId, status, content, extraFields) {
  return {
    type: "env_manager_log",
    uuid: randomUUID(),
    data: {
      level: status === "failed" ? "error" : "info",
      category: "init",
      content,
      timestamp: new Date().toISOString(),
      extra: {
        step_id: stepId,
        step_status: status,
        ...extraFields,
      },
    },
  };
}
//@ chunk-hm0ce8vc.js:214756-214886 placement
function logCloneStep(repo, phase, durationMs, extraFields) {
  return logEnvManager("clone", "completed", `${repo} ${phase} (${durationMs}ms)`, {
    ...extraFields,
    step_detail: repo,
    clone_phase: phase,
    duration_ms: String(durationMs),
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
var MAX_WORK_ORDER_MESSAGE_CHARS = 1024;
var WORK_ORDER_RESTART_EXPLANATION =
  "See https://code.claude.com/docs/en/self-hosted-environments-deploy#troubleshooting";
var WORK_ORDER_SINGLE_USE_TEXT =
  "A work order is single-use and short-lived, so restarting this runner with the same one cannot help. A restarted runner needs a fresh work order, which comes only with a new spawn request.";
//@ chunk-hm0ce8vc.js:215506-216618 placement
/**
 * 描述服务器拒绝（HTTP 状态、令牌是否过期、--api-url、时钟偏差）。
 */
function describeServerAuthRejection(error, workOrderSecret) {
  let httpStatus = getHttpStatus(error);
  let { errorType, errorReason, serverMessage } = getRunnerErrorFields(error);
  let serverDetail = redactSecretsInText(
    [
      [errorType, errorReason].filter(isSnakeCaseReasonCode).join(", "),
      serverMessage && isAlreadyPrintable(serverMessage, MAX_WORK_ORDER_MESSAGE_CHARS)
        ? serverMessage
        : undefined,
    ]
      .filter(Boolean)
      .join(": "),
  );
  let serverLine = `The server answered (HTTP ${httpStatus}) ${serverDetail}`.trimEnd();
  let reason;
  if (httpStatus === 401 && isPoolSpawnJwt(workOrderSecret)) {
    let date = new Date((decodeSessionJwt(workOrderSecret) ?? NaN) * 1000);
    let isExpiryKnown = !Number.isNaN(date.getTime());
    if (!isExpiryKnown || date.getTime() > Date.now())
      return `RegisterRunner refused because the server did not accept this work order${isExpiryKnown ? ", which has not expired by this host's clock" : ", which may have expired"}. Check the work order${isExpiryKnown ? ", --api-url, and the clock" : " and --api-url"}. A restart alone cannot help. This does not show the environment secret is bad, so do not rotate it. ${WORK_ORDER_RESTART_EXPLANATION} ${serverLine}`;
    reason = `this work order expired at ${date.toISOString()}`;
  } else if (httpStatus === 409 && errorType === "work_order_not_redeemable")
    reason =
      WORK_ORDER_REJECTION_TEXT_BY_REASON.get(errorReason) ??
      "this work order can no longer be used, so this runner is not needed";
  else if (httpStatus === 409 && errorType === "session_not_active" && isPoolSpawnJwt(workOrderSecret))
    reason = "the session is no longer active, so this runner is not needed";
  else return null;
  return `RegisterRunner refused because ${reason}. ${WORK_ORDER_SINGLE_USE_TEXT} The environment secret is not at fault, so do not rotate it. ${WORK_ORDER_RESTART_EXPLANATION} ${serverLine}`;
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
  wake(source) {
    if (source === "SSE" && this.atCapacity) return;
    if (this.pending !== "SSE") this.pending = source;
    this.ac.abort();
  }
  async wait(delayMs, signal) {
    if (this.pending !== null || signal.aborted) return;
    let abortController = new AbortController();
    let abort = () => abortController.abort();
    let signal_2 = this.ac.signal;
    signal.addEventListener("abort", abort, {
      once: true,
    });
    signal_2.addEventListener("abort", abort, {
      once: true,
    });
    try {
      await sleep(delayMs, abortController.signal);
    } finally {
      signal.removeEventListener("abort", abort);
      signal_2.removeEventListener("abort", abort);
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
function abortRequest(controller) {
  controller.abort();
}
//@ chunk-hm0ce8vc.js:217323-218339 placement
/**
 * 订阅 /v1/code/runners/self-hosted/runners/<id>/work-hints/stream SSE，收到 work_available 时唤醒轮询。
 */
function streamWorkHints(options) {
  let { baseUrl, runnerId, tokenState, onWake, onDebug, signal } = options;
  let streamUrl = `${baseUrl}/v1/code/runners/self-hosted/runners/${encodeURIComponent(runnerId)}/work-hints/stream`;
  let isClosed = false;
  let attempt = 0;
  let controller = null;
  let close = () => {
    isClosed = true;
    controller?.abort();
  };
  signal.addEventListener("abort", close, {
    once: true,
  });
  (async () => {
    while (!isClosed && !signal.aborted) {
      controller = new AbortController();
      try {
        let response = await fetch(streamUrl, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${tokenState.runnerToken}`,
            Accept: "text/event-stream",
            "anthropic-version": "2023-06-01",
            "x-self-hosted-runner-version": RUNNER_CLIENT_VERSION,
          },
          ...getProxyFetchOptions({
            url: streamUrl,
          }),
          ...getTLSFetchOptions(undefined),
          signal: controller.signal,
        });
        if (!response.ok || !response.body) {
          onDebug(`[runner:hints] stream HTTP ${response.status} \u2014 degrading to poll, retrying`);
          drainResponseBody(response, {
            timeoutMs: DEFAULT_DRAIN_TIMEOUT_MS,
          });
          throw Error(`HTTP ${response.status}`);
        }
        onDebug("[runner:hints] stream connected");
        if (await parseWorkHintEvent(response.body, onWake, controller)) attempt = 0;
        onDebug("[runner:hints] stream ended \u2014 reconnecting");
      } catch (error) {
        if (isClosed || signal.aborted) break;
        if (attempt === 0) onDebug(`[runner:hints] stream error: ${errorMessage(error)}`);
      }
      attempt++;
      let min = Math.min(WORK_HINTS_BACKOFF_MAX_MS, WORK_HINTS_BACKOFF_BASE_MS * 2 ** attempt);
      let floored = Math.floor(Math.random() * min);
      await sleep(floored, signal);
    }
    signal.removeEventListener("abort", close);
  })();
  return {
    close,
  };
}
//@ chunk-hm0ce8vc.js:218339-218854 placement
async function parseWorkHintEvent(body, onWake, controller) {
  let reader = body.getReader();
  let textDecoder = new TextDecoder();
  let buffer = "";
  let sawWorkEvent = false;
  let timeoutTimer;
  let armTimeout = () => {
    if (timeoutTimer !== undefined) clearTimeout(timeoutTimer);
    timeoutTimer = setTimeout(abortRequest, WORK_HINTS_CONNECT_TIMEOUT_MS, controller);
    timeoutTimer.unref?.();
  };
  armTimeout();
  try {
    while (!controller.signal.aborted) {
      let { done, value } = await reader.read();
      if (done) return sawWorkEvent;
      sawWorkEvent = true;
      armTimeout();
      buffer += textDecoder.decode(value, {
        stream: true,
      });
      let lineEndIndex;
      while (
        (lineEndIndex = buffer.indexOf(`
`)) >= 0
      ) {
        let replaced = buffer.slice(0, lineEndIndex).replace(/\r$/, "");
        buffer = buffer.slice(lineEndIndex + 1);
        if (replaced.startsWith("event:") && replaced.slice(6).trimStart() === "work_available") onWake();
      }
    }
    return sawWorkEvent;
  } finally {
    if (timeoutTimer !== undefined) clearTimeout(timeoutTimer);
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
