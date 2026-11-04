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
import { isErrorReportingPolicyAllowed } from "../errorReportingGate.js";
import { logForDebugging } from "../../utils/debug.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { DATADOG_CLIENT_TOKEN, scheduleFlush } from "../analytics/datadog.js";
import { externalHttp } from "../http/externalHttp.js";
import { isAxiosError } from "../../../vendor/axios/dist/esm/axios.js";
import { errorMessage } from "../../utils/errors.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-f5bay0pe.js:554-640 placement
/**
 * 单进程最多上报多少条错误（100）。
 */
var DATADOG_LOGS_URL = "https://browser-intake-us5-datadoghq.com/api/v2/logs";
var DEFAULT_FLUSH_INTERVAL_MS = 30000;
var MAX_BATCH_SIZE = 25;
var POST_TIMEOUT_MS = 1e4;
var PER_PROCESS_CAP = 100;
//@ chunk-f5bay0pe.js:640-713 placement
/**
 * 取错误批次刷新间隔（环境变量可覆盖）。
 */
function getFlushIntervalMs() {
  return env.CLAUDE_CODE_DD_ERROR_TRACKING_FLUSH_INTERVAL_MS || DEFAULT_FLUSH_INTERVAL_MS;
}
//@ chunk-f5bay0pe.js:713-1771 placement
/**
 * 把错误批次发到 Datadog 日志入口
 */
async function sendErrorBatch(batch) {
  if (!isErrorReportingPolicyAllowed()) {
    logForDebugging(
      `dd-error-tracking: compliance verdict now blocks reporting; dropping batch=${batch.length}`,
      {
        level: "warn",
      },
    );
    return;
  }
  let text = jsonStringify(batch);
  let uRLSearchParams = new URLSearchParams({
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
    await externalHttp.post(`${DATADOG_LOGS_URL}?${uRLSearchParams}`, text, {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: POST_TIMEOUT_MS,
    });
  } catch (error) {
    if (isAxiosError(error) && error.response)
      logForDebugging(
        `dd-error-tracking: intake responded ${error.response.status} (batch=${batch.length})`,
        {
          level: "warn",
        },
      );
    else
      logForDebugging(`dd-error-tracking: intake failed: ${errorMessage(error)}`, {
        level: "warn",
      });
  }
}
//@ chunk-f5bay0pe.js:1771-1897 placement
class DatadogErrorSinkState {
  reportsEnqueued = 0;
  capSentinelSent = false;
  cachedUserBucket = undefined;
  sender = scheduleFlush({
    maxBatchSize: MAX_BATCH_SIZE,
    getFlushIntervalMs,
    post: sendErrorBatch,
  });
}
//@ chunk-f5bay0pe.js:1897-1920 placement
/**
 * 按宿主保存的 Datadog 错误收集状态。
 */
var datadogSinkState; // deferred: uses DatadogErrorSinkState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-f5bay0pe.js:1897", () => {
  datadogSinkState = new HostScoped(() => new DatadogErrorSinkState());
});
//@ chunk-f5bay0pe.js:1920-1957 placement
function errorTrackingClient() {
  return datadogSinkState.of(getRootSession().host);
}
//@ chunk-f5bay0pe.js:1957-2004 placement
function isErrorTrackingCapReached() {
  return errorTrackingClient().reportsEnqueued >= PER_PROCESS_CAP;
}
//@ chunk-f5bay0pe.js:2004-2365 placement
/**
 * 达到每进程上限时的最后一条记录
 */
function capReachedEntry(entry) {
  return {
    ...entry,
    message: `ErrorTrackingCapReached: per-process cap of ${PER_PROCESS_CAP} hit, dropping further reports`,
    error: {
      kind: "ErrorTrackingCapReached",
      message: `per-process cap of ${PER_PROCESS_CAP} hit`,
      stack: `ErrorTrackingCapReached
    at enqueueErrorLog (src/services/errorTracking/client.ts)`,
      fingerprint: "cap-reached-sentinel",
      handling: "handled",
    },
    error_frames: undefined,
  };
}
//@ chunk-f5bay0pe.js:2365-2661 placement
/**
 * 把错误日志排队发往 Datadog 错误跟踪，受合规判定和每进程上限约束。
 */
function enqueueErrorLog(entry) {
  let client = errorTrackingClient();
  if (client.reportsEnqueued >= PER_PROCESS_CAP) return;
  client.reportsEnqueued++;
  if (client.reportsEnqueued === PER_PROCESS_CAP && !client.capSentinelSent) {
    client.capSentinelSent = true;
    logForDebugging(
      `dd-error-tracking: per-process report cap reached (${PER_PROCESS_CAP}); dropping further reports`,
      {
        level: "warn",
      },
    );
    client.sender.enqueue(capReachedEntry(entry));
  } else client.sender.enqueue(entry);
}
//@ chunk-f5bay0pe.js:2661-2712 placement
async function shutdownErrorTracking() {
  await errorTrackingClient().sender.shutdown();
}
export { errorTrackingClient, isErrorTrackingCapReached, enqueueErrorLog, shutdownErrorTracking };
