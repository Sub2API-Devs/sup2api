/**
 * services/errorTracking/datadogErrorSink.ts
 *
 * 2.1.316 新增。把错误日志排队发往 Datadog 错误跟踪，受合规判定和每进程上限约束。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-f5bay0pe.js (10)
 * attribution: placement 10
 */
import { randomUUID } from "crypto";
import { env } from "../../utils/env.js";
import { ans } from "../errorReportingGate.js";
import { logForDebugging } from "../../utils/debug.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { DATADOG_CLIENT_TOKEN, scheduleFlush } from "../analytics/datadog.js";
import { externalHttp } from "../http/externalHttp.js";
import { isAxiosError } from "../../../vendor/axios/dist/esm/axios.js";
import { errorMessage } from "../../utils/errors.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";

//@ chunk-f5bay0pe.js:554-640 placement
var p = "https://browser-intake-us5-datadoghq.com/api/v2/logs",
  g = 30000,
  u = 25,
  l = 1e4,
  n = 100;
//@ chunk-f5bay0pe.js:640-713 placement
function m() {
  return env.CLAUDE_CODE_DD_ERROR_TRACKING_FLUSH_INTERVAL_MS || g;
}
/**
 * 把错误批次发到 Datadog 日志入口
 */
//@ chunk-f5bay0pe.js:713-1771 placement
async function sendErrorBatch(e) {
  if (!ans()) {
    logForDebugging(
      `dd-error-tracking: compliance verdict now blocks reporting; dropping batch=${e.length}`,
      { level: "warn" },
    );
    return;
  }
  let r = jsonStringify(e),
    uRLSearchParams = new URLSearchParams({
      ddsource: "browser",
      "dd-api-key": DATADOG_CLIENT_TOKEN,
      "dd-evp-origin": "browser",
      "dd-evp-origin-version": {
        ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
        PACKAGE_URL: "@anthropic-ai/claude-code",
        README_URL: "https://code.claude.com/docs/en/overview",
        VERSION: "2.1.316",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-10-30T23:28:13Z",
        GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
        HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
        DD_SOURCEMAP_GROUP: "default",
      }.VERSION,
      "dd-request-id": randomUUID(),
    });
  try {
    await externalHttp.post(`${p}?${uRLSearchParams}`, r, {
      headers: { "Content-Type": "application/json" },
      timeout: l,
    });
  } catch (error) {
    if (isAxiosError(error) && error.response)
      logForDebugging(`dd-error-tracking: intake responded ${error.response.status} (batch=${e.length})`, {
        level: "warn",
      });
    else logForDebugging(`dd-error-tracking: intake failed: ${errorMessage(error)}`, { level: "warn" });
  }
}
//@ chunk-f5bay0pe.js:1771-1897 placement
class DatadogErrorSinkState {
  reportsEnqueued = 0;
  capSentinelSent = !1;
  cachedUserBucket = void 0;
  sender = scheduleFlush({ maxBatchSize: u, getFlushIntervalMs: m, post: sendErrorBatch });
}
//@ chunk-f5bay0pe.js:1897-1920 placement
var E = new HostScoped(() => new DatadogErrorSinkState());
//@ chunk-f5bay0pe.js:1920-1957 placement
function errorTrackingClient() {
  return E.of(getRootSession().host);
}
//@ chunk-f5bay0pe.js:1957-2004 placement
function isErrorTrackingCapReached() {
  return errorTrackingClient().reportsEnqueued >= n;
}
/**
 * 达到每进程上限时的最后一条记录
 */
//@ chunk-f5bay0pe.js:2004-2365 placement
function capReachedEntry(e) {
  return {
    ...e,
    message: `ErrorTrackingCapReached: per-process cap of ${n} hit, dropping further reports`,
    error: {
      kind: "ErrorTrackingCapReached",
      message: `per-process cap of ${n} hit`,
      stack: `ErrorTrackingCapReached
    at enqueueErrorLog (src/services/errorTracking/client.ts)`,
      fingerprint: "cap-reached-sentinel",
      handling: "handled",
    },
    error_frames: void 0,
  };
}
/**
 * 把错误日志排队发往 Datadog 错误跟踪，受合规判定和每进程上限约束。
 */
//@ chunk-f5bay0pe.js:2365-2661 placement
function enqueueErrorLog(e) {
  let r = errorTrackingClient();
  if (r.reportsEnqueued >= n) return;
  if ((r.reportsEnqueued++, r.reportsEnqueued === n && !r.capSentinelSent))
    ((r.capSentinelSent = !0),
      logForDebugging(`dd-error-tracking: per-process report cap reached (${n}); dropping further reports`, {
        level: "warn",
      }),
      r.sender.enqueue(capReachedEntry(e)));
  else r.sender.enqueue(e);
}
//@ chunk-f5bay0pe.js:2661-2712 placement
async function shutdownErrorTracking() {
  await errorTrackingClient().sender.shutdown();
}

export { errorTrackingClient, isErrorTrackingCapReached, enqueueErrorLog };
