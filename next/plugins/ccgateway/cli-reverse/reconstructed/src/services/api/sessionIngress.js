/**
 * services/api/sessionIngress.ts
 *
 * 会话持久化接口 session_ingress：追加转录（Last-Uuid 乐观并发、409 重试）、读取会话日志（JWT 或 OAuth）、拉取远程会话 teleport 事件。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/api/sessionIngress.ts
 * pieces: chunk-5xgkngpb.js (11)
 * attribution: affinity 1, fingerprint 7, layout 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { createKeyedQueue } from "../../utils/promiseQueue.js";
import { streamFallbackWarning } from "./streamFallbackWarning.js";
import { axios_default } from "../../../vendor/axios/dist/esm/axios.js";
import { logForDebugging } from "../../utils/debug.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { errorMessage, withTelemetryMessage, TeleportOperationError } from "../../utils/errors.js";
import { backoffDelayMs, sleep } from "../../utils/sleep.js";
import { getSessionIngressAuthToken } from "../../utils/sessionIngressAuth.js";
import { claudeCodeUserAgent } from "../../utils/http.js";
import { getOauthConfig } from "../../constants/oauth.js";
import {
  getOAuthRequestHeaders,
  resendAfterUntrustedDevice,
  prepareApiRequest,
  CloudSessionAccessError,
  isTransientNetworkError,
  axiosGetWithRetry,
} from "../../utils/teleport/api.js";
import { logError } from "../../utils/log.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { isPlainObject as isPlainObject_6 } from "../../utils/isPlainObject.js";
import { cloudErrorMessage } from "../../utils/teleport/cloudErrorMessage.js";
import { normalizeUserToolUseResult } from "../../cli/transports/ccrMessageMapping.js";
import { isEnvTruthy } from "../../utils/envUtils.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:205031-205059 affinity
/**
 * 10 次；Pdo=500ms 基础退避。
 */
var SESSION_INGRESS_MAX_RETRIES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SESSION_INGRESS_BASE_BACKOFF_MS;
var sessionAppendLock;
deferInit("chunk-5xgkngpb.js:205031", () => {
  SESSION_INGRESS_MAX_RETRIES = 10;
  SESSION_INGRESS_BASE_BACKOFF_MS = 500;
  sessionAppendLock = createKeyedQueue();
});
//@ chunk-5xgkngpb.js:205059-206868 fingerprint (2.1.88 match: appendSessionLogImpl, 0.968)
/**
 * PUT 追加会话日志：带 Last-Uuid，409 时按服务器最后 uuid 修正重试，5xx/网络错误退避重试。
 */
async function appendSessionLogImpl(sessionId, entry, url, headers) {
  let lastIngressUuidBySession = streamFallbackWarning().lastIngressUuidBySession;
  for (let attempt = 1; attempt <= SESSION_INGRESS_MAX_RETRIES; attempt++) {
    try {
      let lastUuid = lastIngressUuidBySession.get(sessionId);
      let requestHeaders = {
        ...headers,
      };
      if (lastUuid) requestHeaders["Last-Uuid"] = lastUuid;
      let response = await axios_default.put(url, entry, {
        headers: requestHeaders,
        timeout: 30000,
        validateStatus: (status) => status < 500,
      });
      if (response.status === 200 || response.status === 201) {
        lastIngressUuidBySession.set(sessionId, entry.uuid);
        logForDebugging(`Successfully persisted session log entry for session ${sessionId}`);
        return true;
      }
      if (response.status === 409) {
        let serverLastUuid = response.headers["x-last-uuid"];
        if (serverLastUuid === entry.uuid) {
          lastIngressUuidBySession.set(sessionId, entry.uuid);
          logForDebugging(
            `Session entry ${entry.uuid} already present on server, recovering from stale state`,
          );
          logForDiagnosticsNoPII("info", "session_persist_recovered_from_409");
          return true;
        }
        if (serverLastUuid) {
          lastIngressUuidBySession.set(sessionId, serverLastUuid);
          logForDebugging(
            `Session 409: adopting server lastUuid=${serverLastUuid} from header, retrying entry ${entry.uuid}`,
          );
        } else {
          let logs = await fetchSessionLogsFromUrl(sessionId, url, headers);
          let adoptedUuid = findLastUuid(logs);
          if (adoptedUuid) {
            lastIngressUuidBySession.set(sessionId, adoptedUuid);
            logForDebugging(
              `Session 409: re-fetched ${logs.length} entries, adopting lastUuid=${adoptedUuid}, retrying entry ${entry.uuid}`,
            );
          } else {
            let errorMessage = response.data.error?.message || "Concurrent modification detected";
            logForDebugging(
              `Session persistence conflict: UUID mismatch for session ${sessionId}, entry ${entry.uuid}. ${errorMessage}`,
              {
                level: "error",
              },
            );
            logForDiagnosticsNoPII("error", "session_persist_fail_concurrent_modification");
            return false;
          }
        }
        logForDiagnosticsNoPII("info", "session_persist_409_adopt_server_uuid");
        continue;
      }
      if (response.status === 401) {
        logForDebugging("Session token expired or invalid");
        logForDiagnosticsNoPII("error", "session_persist_fail_bad_token");
        return false;
      }
      logForDebugging(`Failed to persist session log: ${response.status} ${response.statusText}`);
      logForDiagnosticsNoPII("error", "session_persist_fail_status", {
        status: response.status,
        attempt,
      });
    } catch (error) {
      logForDebugging(`Error persisting session log: ${errorMessage(error)}`, {
        level: "error",
      });
      logForDiagnosticsNoPII("error", "session_persist_fail_status", {
        status: axios_default.isAxiosError(error) ? error.status : undefined,
        attempt,
      });
    }
    if (attempt === SESSION_INGRESS_MAX_RETRIES) {
      logForDebugging(`Remote persistence failed after ${SESSION_INGRESS_MAX_RETRIES} attempts`);
      logForDiagnosticsNoPII("error", "session_persist_error_retries_exhausted", {
        attempt,
      });
      return false;
    }
    let delayMs = backoffDelayMs({
      attempt,
      baseMs: SESSION_INGRESS_BASE_BACKOFF_MS,
      capMs: 8000,
    });
    logForDebugging(
      `Remote persistence attempt ${attempt}/${SESSION_INGRESS_MAX_RETRIES} failed, retrying in ${delayMs}ms\u2026`,
    );
    await sleep(delayMs);
  }
  return false;
}
//@ chunk-5xgkngpb.js:206868-207147 fingerprint (2.1.88 match: appendSessionLog, 0.877)
/**
 * 用会话 JWT 追加日志。
 */
async function appendSessionLog(sessionId, entry, url) {
  let sessionToken = getSessionIngressAuthToken();
  if (!sessionToken) {
    logForDebugging("No session token available for session persistence");
    logForDiagnosticsNoPII("error", "session_persist_fail_jwt_no_token");
    return false;
  }
  let headers = {
    "User-Agent": claudeCodeUserAgent(),
    Authorization: `Bearer ${sessionToken}`,
    "Content-Type": "application/json",
  };
  return sessionAppendLock.run(sessionId, () => appendSessionLogImpl(sessionId, entry, url, headers));
}
//@ chunk-5xgkngpb.js:207147-207481 fingerprint (2.1.88 match: getSessionLogs, 0.831)
/**
 * 用会话 JWT 读取日志。
 */
async function getSessionLogs(sessionId, url) {
  let sessionToken = getSessionIngressAuthToken();
  if (!sessionToken) {
    logForDebugging("No session token available for fetching session logs");
    logForDiagnosticsNoPII("error", "session_get_fail_no_token");
    return null;
  }
  let headers = {
    "User-Agent": claudeCodeUserAgent(),
    Authorization: `Bearer ${sessionToken}`,
  };
  let logs = await fetchSessionLogsFromUrl(sessionId, url, headers);
  if (logs && logs.length > 0) {
    let lastEntry = logs.at(-1);
    if (lastEntry && "uuid" in lastEntry && lastEntry.uuid)
      streamFallbackWarning().lastIngressUuidBySession.set(sessionId, lastEntry.uuid);
  }
  return logs;
}
//@ chunk-5xgkngpb.js:207481-207696 fingerprint (2.1.88 match: getSessionLogsViaOAuth, 1)
/**
 * 用 OAuth 读取 /v1/session_ingress/session/<id>。
 */
async function getSessionLogsViaOAuth(sessionId, accessToken, orgUUID, refusesRedirects = false) {
  let url = `${getOauthConfig().BASE_API_URL}/v1/session_ingress/session/${sessionId}`;
  logForDebugging(`[session-ingress] Fetching session logs from: ${url}`);
  let headers = {
    ...getOAuthRequestHeaders(accessToken),
    "x-organization-uuid": orgUUID,
  };
  return await fetchSessionLogsFromUrl(sessionId, url, headers, refusesRedirects);
}
//@ chunk-5xgkngpb.js:207891-212847 fingerprint (2.1.88 match: getTeleportEvents, 0.456)
/**
 * 分页拉取 teleport 事件（每页 1000，最多 100 页）。
 */
async function getTeleportEvents(sessionId, url, headers, options, allowDeviceRenewal) {
  let headers_2 = headers;
  logForDebugging(`[teleport] Fetching events from: ${url}`);
  let events = [];
  let cursor;
  let pages = 0;
  let fromFirstEvent = options.fromFirstEvent;
  let maxPages = 100;
  while (pages < maxPages) {
    let params = {
      limit: 1000,
    };
    if (options.sessionAgentId !== undefined) params.session_agent_id = options.sessionAgentId;
    if (options.subagents) params.subagents = "true";
    if (cursor !== undefined) params.cursor = cursor;
    else if (fromFirstEvent) params.from_first_event = "true";
    let response;
    let renewedDevice = false;
    let loginUnreadable = false;
    try {
      response = await getWithTimeout(url, headers_2, params, options.refusesRedirects);
      if (response.status === 403 && allowDeviceRenewal) {
        let errors = [];
        response = await resendAfterUntrustedDevice(
          response,
          headers_2["X-Trusted-Device-Token"],
          async (status) => {
            renewedDevice = true;
            try {
              let auth = await prepareApiRequest().catch((error) => {
                loginUnreadable = true;
                throw error;
              });
              headers_2 = {
                ...getOAuthRequestHeaders(auth.accessToken),
                "x-organization-uuid": auth.orgUUID,
                ...(auth.profile
                  ? {}
                  : {
                      "X-Trusted-Device-Token": status,
                    }),
              };
              return await getWithTimeout(url, headers_2, params, options.refusesRedirects);
            } catch (error) {
              errors.push(error);
              throw error;
            }
          },
          "cloud_session",
        );
        if (errors.length > 0) throw errors[0];
      }
    } catch (error) {
      logForDiagnosticsNoPII("error", "teleport_events_fetch_fail");
      if (loginUnreadable && error instanceof CloudSessionAccessError)
        logForDebugging(
          `[teleport] Events not asked for again after the enrollment, the sign-in could not be read: ${errorMessage(error)}`,
          {
            level: "error",
          },
        );
      else
        logError(
          withTelemetryMessage(
            Error(`Teleport events fetch failed: ${errorMessage(error)}`),
            "Teleport events fetch failed",
          ),
        );
      logFeatureBad(
        "api_teleport_events_fetch",
        loginUnreadable
          ? "login_unreadable"
          : isTransientNetworkError(error)
            ? "retries_exhausted"
            : "network_error",
      );
      throw sessionLogsFetchError();
    }
    let body = response.data;
    let error = isPlainObject_6(body) ? body.error : undefined;
    if (
      params.from_first_event &&
      (response.status === 400 ||
        (response.status === 403 && isPlainObject_6(error) && error.resource === "from_first_event"))
    ) {
      logForDebugging(`[teleport] from_first_event refused for ${sessionId}`);
      fromFirstEvent = false;
      if (options.seen) options.seen.fromFirstEventRefused = true;
      continue;
    }
    if (response.status === 404) {
      logForDebugging(`[teleport] Session ${sessionId} not found (page ${pages})`);
      logForDiagnosticsNoPII("warn", "teleport_events_not_found");
      if (pages > 0) {
        logFeatureBad("api_teleport_events_fetch", "not_found");
        throw sessionLogsFetchError();
      }
      logFeatureSad("api_teleport_events_fetch", "not_found");
      return null;
    }
    if (response.status === 401) {
      logForDiagnosticsNoPII("error", "teleport_events_bad_token");
      logFeatureSad("api_teleport_events_fetch", "auth_expired");
      let loginMessage = "Your session has expired. Please run /login to sign in again.";
      throw new TeleportOperationError(loginMessage, loginMessage);
    }
    if (response.status === 403) {
      logForDiagnosticsNoPII("error", "teleport_events_forbidden");
      let refusalBody = response.data;
      let { readUntrustedDeviceRefusal } = await import("../../bridge/codeSessionApi.js");
      let tokenRefused = readUntrustedDeviceRefusal(response.data)?.kind === "token_refused";
      let recentEnrollment = false;
      if (tokenRefused && !renewedDevice) {
        let { enrollmentAfterRefusalHold } = await import("../../bridge/trustedDevice.js");
        recentEnrollment =
          (await enrollmentAfterRefusalHold(headers_2["X-Trusted-Device-Token"]).catch(() => "none")) ===
          "recent";
      }
      logFeatureSad(
        "api_teleport_events_fetch",
        renewedDevice
          ? "forbidden_after_device_renewal"
          : recentEnrollment
            ? "forbidden_after_earlier_device_renewal"
            : "forbidden",
      );
      if (tokenRefused) {
        if (renewedDevice || recentEnrollment)
          throw new TeleportOperationError(
            "This session requires a trusted device, and it still refused this computer after its trusted-device enrollment was renewed. Open the session at claude.ai/code or in the Claude app instead.",
            "This session requires a trusted device, and it still refused this computer after its trusted-device enrollment was renewed. Open the session at claude.ai/code or in the Claude app instead.",
          );
        let { loginEnrollmentOnThisComputerSettled } = await import("../../bridge/trustedDevice.js");
        let enrollmentOutcome = await loginEnrollmentOnThisComputerSettled();
        let enrollMessage =
          "This session requires a trusted device, and this computer isn't recognized as one. Sign in with `/login` in Claude Code on this computer to enroll it (`claude auth login` does not enroll), then try again.";
        let message;
        switch (enrollmentOutcome) {
          case "enrolls":
            message = enrollMessage;
            break;
          case "paused":
            message =
              "This session requires a trusted device, and enrolling devices is paused right now. Try again later.";
            break;
          case "no_cloud_container":
          case "no_gate_off":
          case "no_not_required":
            message =
              "This session requires a trusted device, and this computer isn't one. Open it at claude.ai/code or in the Claude app to verify your device and keep using the session.";
            break;
          case "no":
            break;
        }
        if (message !== undefined) throw new TeleportOperationError(message, message);
      }
      if (refusalBody?.error?.resource === "session_stale_relogin")
        throw new TeleportOperationError(
          "Your session has expired for the trusted-device check. Run /login to re-authenticate, then retry.",
          "Your session has expired for the trusted-device check. Run /login to re-authenticate, then retry.",
        );
      let { message, statusLine } = cloudErrorMessage(response, refusalBody?.error?.message);
      let denialMessage = message ?? `Access denied fetching session events: ${statusLine}`;
      throw new TeleportOperationError(denialMessage, denialMessage);
    }
    if (response.status !== 200) {
      logError(Error(`Teleport events returned ${response.status}`));
      logForDiagnosticsNoPII("error", "teleport_events_bad_status");
      logFeatureBad("api_teleport_events_fetch", "bad_status");
      throw noopSessionHook(options.refusesRedirects, response.status) ?? sessionLogsFetchError();
    }
    let { data, next_cursor: nextCursor } = response.data ?? {};
    let rows =
      options.subagents &&
      isPlainObject_6(body) &&
      Object.keys(body).every((key) => key === "data" || key === "next_cursor")
        ? (data ?? [])
        : data;
    if (!Array.isArray(rows)) {
      logError(
        Error(`Teleport events invalid response shape (data is ${rows === null ? "null" : typeof rows})`),
      );
      logForDiagnosticsNoPII("error", "teleport_events_invalid_shape");
      logFeatureBad("api_teleport_events_fetch", "bad_status");
      throw sessionLogsFetchError();
    }
    for (let ev of rows) {
      if (ev.session_agent_id && options.seen) options.seen.agentIds.add(ev.session_agent_id);
      if (ev.payload !== null && ev.payload !== undefined)
        events.push(normalizeUserToolUseResult(ev.payload));
      else if (options.seen) options.seen.rowsWithoutPayload++;
    }
    pages++;
    if (nextCursor == null) break;
    cursor = nextCursor;
  }
  if (pages >= maxPages) {
    if (options.seen) options.seen.stoppedAtPageLimit = true;
    logError(
      withTelemetryMessage(
        Error(`Teleport events hit page cap (${maxPages}) for ${sessionId}`),
        `teleport_events_page_cap ${maxPages}`,
      ),
    );
    logForDiagnosticsNoPII("warn", "teleport_events_page_cap");
    logFeatureSad("api_teleport_events_fetch", "page_cap");
  } else logFeatureOk("api_teleport_events_fetch");
  logForDebugging(`[teleport] Fetched ${events.length} events over ${pages} page(s) for ${sessionId}`);
  return events;
}
//@ chunk-5xgkngpb.js:212847-212982 layout
/**
 * 带 20 秒超时、<500 视为有效响应的 GET（可禁用重定向）。
 */
function getWithTimeout(url, headers, params, refusesRedirects) {
  return axiosGetWithRetry(url, {
    headers,
    params,
    timeout: 20000,
    validateStatus: (status) => status < 500,
    ...(refusesRedirects && {
      maxRedirects: 0,
      adapter: "http",
    }),
  });
}
//@ chunk-5xgkngpb.js:212982-213042 layout
/**
 * "Failed to fetch session logs" 错误。
 */
function sessionLogsFetchError() {
  return Error("Failed to fetch session logs");
}
//@ chunk-5xgkngpb.js:213042-213067 layout
/**
 * 空操作钩子（构建裁剪后的占位）。
 */
function noopSessionHook(refusesRedirects, status) {
  return;
}
//@ chunk-5xgkngpb.js:213067-214436 fingerprint (2.1.88 match: fetchSessionLogsFromUrl, 0.795)
/**
 * GET 会话日志（可 CLAUDE_AFTER_LAST_COMPACT 只取最后一次压缩之后）。
 */
async function fetchSessionLogsFromUrl(sessionId, url, headers, refusesRedirects = false) {
  try {
    let response = await axios_default.get(url, {
      headers,
      timeout: 20000,
      validateStatus: (status) => status < 500,
      params: isEnvTruthy(process.env.CLAUDE_AFTER_LAST_COMPACT)
        ? {
            after_last_compact: true,
          }
        : undefined,
      ...(refusesRedirects && {
        maxRedirects: 0,
        adapter: "http",
      }),
    });
    if (response.status === 200) {
      let data = response.data;
      if (!data || typeof data !== "object" || !Array.isArray(data.loglines)) {
        logError(Error("Invalid session logs response format"));
        logForDiagnosticsNoPII("error", "session_get_fail_invalid_response");
        logFeatureBad("api_session_logs_fetch", "invalid_response");
        return null;
      }
      let logs = data.loglines.map(normalizeUserToolUseResult);
      logForDebugging(`Fetched ${logs.length} session logs for session ${sessionId}`);
      logFeatureOk("api_session_logs_fetch");
      return logs;
    }
    if (response.status === 404) {
      logForDebugging(`No existing logs for session ${sessionId}`);
      logForDiagnosticsNoPII("warn", "session_get_no_logs_for_session");
      logFeatureOk("api_session_logs_fetch");
      return [];
    }
    if (response.status === 401) {
      logForDebugging("Auth token expired or invalid");
      logForDiagnosticsNoPII("error", "session_get_fail_bad_token");
      logFeatureSad("api_session_logs_fetch", "auth_expired");
      throw Error("Your session has expired. Please run /login to sign in again.");
    }
    logForDebugging(`Failed to fetch session logs: ${response.status} ${response.statusText}`);
    logForDiagnosticsNoPII("error", "session_get_fail_status", {
      status: response.status,
    });
    logFeatureBad("api_session_logs_fetch", "bad_status");
    let hookError = noopSessionHook(refusesRedirects, response.status);
    if (hookError !== undefined) throw hookError;
    return null;
  } catch (error) {
    if (!axios_default.isAxiosError(error)) throw error;
    logForDebugging(`Error fetching session logs: ${error.message}`, {
      level: "error",
    });
    logForDiagnosticsNoPII("error", "session_get_fail_status", {
      status: error.status,
    });
    logFeatureBad("api_session_logs_fetch", "network_error");
    return null;
  }
}
//@ chunk-5xgkngpb.js:214436-214544 fingerprint (2.1.88 match: findLastUuid, 1)
/**
 * 日志条目中最后一个 uuid。
 */
function findLastUuid(logs) {
  if (!logs) return;
  let entry = logs.findLast((e) => "uuid" in e && e.uuid);
  return entry && "uuid" in entry ? entry.uuid : undefined;
}
export { appendSessionLog, getSessionLogs, getTeleportEvents, getSessionLogsViaOAuth };
