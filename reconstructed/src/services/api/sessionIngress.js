/**
 * services/api/sessionIngress.ts
 *
 * 会话持久化接口 session_ingress：追加转录（Last-Uuid 乐观并发、409 重试）、读取会话日志（JWT 或 OAuth）、拉取远程会话 teleport 事件。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/api/sessionIngress.ts
 * pieces: chunk-e6aww6q8.js (11)
 * attribution: affinity 1, fingerprint 7, layout 3
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
import { isPlainObject as isPlainObject_5 } from "../../utils/isPlainObject.js";
import { cloudErrorMessage } from "../../utils/teleport/cloudErrorMessage.js";
import { normalizeUserToolUseResult } from "../../cli/transports/ccrMessageMapping.js";
import { isEnvTruthy } from "../../utils/envUtils.js";

//@ chunk-e6aww6q8.js:205981-206009 affinity
/**
 * 10 次；Pdo=500ms 基础退避。
 */
var SESSION_INGRESS_MAX_RETRIES = 10;
var SESSION_INGRESS_BASE_BACKOFF_MS = 500;
var sessionAppendLock = createKeyedQueue();
//@ chunk-e6aww6q8.js:206009-207815 fingerprint = appendSessionLogImpl (0.968)
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
//@ chunk-e6aww6q8.js:207815-208094 fingerprint = appendSessionLog (0.877)
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
//@ chunk-e6aww6q8.js:208094-208428 fingerprint = getSessionLogs (0.831)
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
//@ chunk-e6aww6q8.js:208428-208643 fingerprint = getSessionLogsViaOAuth (1)
/**
 * 用 OAuth 读取 /v1/session_ingress/session/<id>。
 */
async function getSessionLogsViaOAuth(sessionId, accessToken, orgUUID, s = false) {
  let url = `${getOauthConfig().BASE_API_URL}/v1/session_ingress/session/${sessionId}`;
  logForDebugging(`[session-ingress] Fetching session logs from: ${url}`);
  let headers = {
    ...getOAuthRequestHeaders(accessToken),
    "x-organization-uuid": orgUUID,
  };
  return await fetchSessionLogsFromUrl(sessionId, url, headers, s);
}
//@ chunk-e6aww6q8.js:208838-213786 fingerprint = getTeleportEvents (0.456)
/**
 * 分页拉取 teleport 事件（每页 1000，最多 100 页）。
 */
async function getTeleportEvents(e, n, headers, s, h) {
  let headers_2 = headers;
  logForDebugging(`[teleport] Fetching events from: ${n}`);
  let S = [];
  let w;
  let pages = 0;
  let fromFirstEvent = s.fromFirstEvent;
  let maxPages = 100;
  while (pages < maxPages) {
    let params = {
      limit: 1000,
    };
    if (s.sessionAgentId !== undefined) params.session_agent_id = s.sessionAgentId;
    if (s.subagents) params.subagents = "true";
    if (w !== undefined) params.cursor = w;
    else if (fromFirstEvent) params.from_first_event = "true";
    let Se;
    let ke = false;
    let we = false;
    try {
      Se = await getWithTimeout(n, headers_2, params, s.refusesRedirects);
      if (Se.status === 403 && h) {
        let ze = [];
        Se = await resendAfterUntrustedDevice(
          Se,
          headers_2["X-Trusted-Device-Token"],
          async (status) => {
            ke = true;
            try {
              let Je = await prepareApiRequest().catch((error) => {
                we = true;
                throw error;
              });
              headers_2 = {
                ...getOAuthRequestHeaders(Je.accessToken),
                "x-organization-uuid": Je.orgUUID,
                ...(Je.profile
                  ? {}
                  : {
                      "X-Trusted-Device-Token": status,
                    }),
              };
              return await getWithTimeout(n, headers_2, params, s.refusesRedirects);
            } catch (error) {
              ze.push(error);
              throw error;
            }
          },
          "cloud_session",
        );
        if (ze.length > 0) throw ze[0];
      }
    } catch (error) {
      logForDiagnosticsNoPII("error", "teleport_events_fetch_fail");
      if (we && error instanceof CloudSessionAccessError)
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
        we ? "login_unreadable" : isTransientNetworkError(error) ? "retries_exhausted" : "network_error",
      );
      throw sessionLogsFetchError();
    }
    let Ee = Se.data;
    let error = isPlainObject_5(Ee) ? Ee.error : undefined;
    if (
      params.from_first_event &&
      (Se.status === 400 ||
        (Se.status === 403 && isPlainObject_5(error) && error.resource === "from_first_event"))
    ) {
      logForDebugging(`[teleport] from_first_event refused for ${e}`);
      fromFirstEvent = false;
      if (s.seen) s.seen.fromFirstEventRefused = true;
      continue;
    }
    if (Se.status === 404) {
      logForDebugging(`[teleport] Session ${e} not found (page ${pages})`);
      logForDiagnosticsNoPII("warn", "teleport_events_not_found");
      if (pages > 0) {
        logFeatureBad("api_teleport_events_fetch", "not_found");
        throw sessionLogsFetchError();
      }
      logFeatureSad("api_teleport_events_fetch", "not_found");
      return null;
    }
    if (Se.status === 401) {
      logForDiagnosticsNoPII("error", "teleport_events_bad_token");
      logFeatureSad("api_teleport_events_fetch", "auth_expired");
      let ze = "Your session has expired. Please run /login to sign in again.";
      throw new TeleportOperationError(ze, ze);
    }
    if (Se.status === 403) {
      logForDiagnosticsNoPII("error", "teleport_events_forbidden");
      let ze = Se.data;
      let { readUntrustedDeviceRefusal } = await import("./chunk-g9dw262t.js");
      let Je = readUntrustedDeviceRefusal(Se.data)?.kind === "token_refused";
      let nt = false;
      if (Je && !ke) {
        let { enrollmentAfterRefusalHold } = await import("./chunk-3kb57csj.js");
        nt =
          (await enrollmentAfterRefusalHold(headers_2["X-Trusted-Device-Token"]).catch(() => "none")) ===
          "recent";
      }
      logFeatureSad(
        "api_teleport_events_fetch",
        ke ? "forbidden_after_device_renewal" : nt ? "forbidden_after_earlier_device_renewal" : "forbidden",
      );
      if (Je) {
        if (ke || nt)
          throw new TeleportOperationError(
            "This session requires a trusted device, and it still refused this computer after its trusted-device enrollment was renewed. Open the session at claude.ai/code or in the Claude app instead.",
            "This session requires a trusted device, and it still refused this computer after its trusted-device enrollment was renewed. Open the session at claude.ai/code or in the Claude app instead.",
          );
        let { loginEnrollmentOnThisComputerSettled } = await import("./chunk-3kb57csj.js");
        let At = await loginEnrollmentOnThisComputerSettled();
        let It =
          "This session requires a trusted device, and this computer isn't recognized as one. Sign in with `/login` in Claude Code on this computer to enroll it (`claude auth login` does not enroll), then try again.";
        let Yt;
        switch (At) {
          case "enrolls":
            Yt = It;
            break;
          case "paused":
            Yt =
              "This session requires a trusted device, and enrolling devices is paused right now. Try again later.";
            break;
          case "no_cloud_container":
          case "no_gate_off":
          case "no_not_required":
            Yt =
              "This session requires a trusted device, and this computer isn't one. Open it at claude.ai/code or in the Claude app to verify your device and keep using the session.";
            break;
          case "no":
            break;
        }
        if (Yt !== undefined) throw new TeleportOperationError(Yt, Yt);
      }
      if (ze?.error?.resource === "session_stale_relogin")
        throw new TeleportOperationError(
          "Your session has expired for the trusted-device check. Run /login to re-authenticate, then retry.",
          "Your session has expired for the trusted-device check. Run /login to re-authenticate, then retry.",
        );
      let { message, statusLine } = cloudErrorMessage(Se, ze?.error?.message);
      let yt = message ?? `Access denied fetching session events: ${statusLine}`;
      throw new TeleportOperationError(yt, yt);
    }
    if (Se.status !== 200) {
      logError(Error(`Teleport events returned ${Se.status}`));
      logForDiagnosticsNoPII("error", "teleport_events_bad_status");
      logFeatureBad("api_teleport_events_fetch", "bad_status");
      throw noopSessionHook(s.refusesRedirects, Se.status) ?? sessionLogsFetchError();
    }
    let { data: Ie, next_cursor: nextCursor } = Se.data ?? {};
    let We =
      s.subagents &&
      isPlainObject_5(Ee) &&
      Object.keys(Ee).every((key) => key === "data" || key === "next_cursor")
        ? (Ie ?? [])
        : Ie;
    if (!Array.isArray(We)) {
      logError(Error(`Teleport events invalid response shape (data is ${We === null ? "null" : typeof We})`));
      logForDiagnosticsNoPII("error", "teleport_events_invalid_shape");
      logFeatureBad("api_teleport_events_fetch", "bad_status");
      throw sessionLogsFetchError();
    }
    for (let ev of We) {
      if (ev.session_agent_id && s.seen) s.seen.agentIds.add(ev.session_agent_id);
      if (ev.payload !== null && ev.payload !== undefined) S.push(normalizeUserToolUseResult(ev.payload));
      else if (s.seen) s.seen.rowsWithoutPayload++;
    }
    pages++;
    if (nextCursor == null) break;
    w = nextCursor;
  }
  if (pages >= maxPages) {
    if (s.seen) s.seen.stoppedAtPageLimit = true;
    logError(
      withTelemetryMessage(
        Error(`Teleport events hit page cap (${maxPages}) for ${e}`),
        `teleport_events_page_cap ${maxPages}`,
      ),
    );
    logForDiagnosticsNoPII("warn", "teleport_events_page_cap");
    logFeatureSad("api_teleport_events_fetch", "page_cap");
  } else logFeatureOk("api_teleport_events_fetch");
  logForDebugging(`[teleport] Fetched ${S.length} events over ${pages} page(s) for ${e}`);
  return S;
}
//@ chunk-e6aww6q8.js:213786-213921 layout
/**
 * 带 20 秒超时、<500 视为有效响应的 GET（可禁用重定向）。
 */
function getWithTimeout(e, headers, params, refusesRedirects) {
  return axiosGetWithRetry(e, {
    headers,
    params,
    timeout: 20000,
    validateStatus: (h) => h < 500,
    ...(refusesRedirects && {
      maxRedirects: 0,
      adapter: "http",
    }),
  });
}
//@ chunk-e6aww6q8.js:213921-213981 layout
/**
 * "Failed to fetch session logs" 错误。
 */
function sessionLogsFetchError() {
  return Error("Failed to fetch session logs");
}
//@ chunk-e6aww6q8.js:213981-214006 layout
/**
 * 空操作钩子（构建裁剪后的占位）。
 */
function noopSessionHook(e, status) {
  return;
}
//@ chunk-e6aww6q8.js:214006-215375 fingerprint = fetchSessionLogsFromUrl (0.795)
/**
 * GET 会话日志（可 CLAUDE_AFTER_LAST_COMPACT 只取最后一次压缩之后）。
 */
async function fetchSessionLogsFromUrl(sessionId, url, headers, s = false) {
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
      ...(s && {
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
    let y = noopSessionHook(s, response.status);
    if (y !== undefined) throw y;
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
//@ chunk-e6aww6q8.js:215375-215483 fingerprint = findLastUuid (1)
/**
 * 日志条目中最后一个 uuid。
 */
function findLastUuid(logs) {
  if (!logs) return;
  let entry = logs.findLast((e) => "uuid" in e && e.uuid);
  return entry && "uuid" in entry ? entry.uuid : undefined;
}
export { appendSessionLog, getSessionLogs, getSessionLogsViaOAuth, getTeleportEvents };
