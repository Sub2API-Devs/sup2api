/**
 * bridge/bridgeApi.ts
 *
 * Environments API 客户端（注册/轮询/ack/stop/heartbeat/注销/重连/归档、sessions watch）与 HTTP 错误分类；混入了大量各 chunk 的内容块/消息小助手
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/bridge/bridgeApi.ts
 * pieces: chunk-b30925fy.js (5)
 * attribution: fingerprint 4, layout 1
 */
import { readUntrustedDeviceRefusal, shouldRemoteControlEnroll } from "./codeSessionApi.js";
import { BETA_ENVIRONMENTS, BETA_CCR_BYOC } from "../utils/betas.js";
import { claudeCodeUserAgent, getClientPlatform } from "../utils/http.js";
import { BRIDGE_LOGIN_INSTRUCTION, FOLDER_ALREADY_SERVED_ERROR_TYPE } from "./types.js";
import { withFeatureTelemetry } from "../services/analytics/featureTelemetry.js";
import { redactGitRemoteCredentials } from "../utils/git.js";
import { axios_default } from "../../vendor/axios/dist/esm/axios.js";
import {
  extractErrorCode,
  extractPlainErrorDetail,
  debugBody,
  hashIdForLog,
  safeLogToken,
  parseRetryAfterMs,
  extractErrorDetail,
} from "./debugUtils.js";
import { classifyApiError, extractErrorTypeFromData } from "./bridgeMain.js";
import { validateBridgeId, toInfraSessionId, toCompatSessionId } from "./sessionIdCompat.js";
import { getAPIProvider } from "../utils/model/providers.js";
import { isEssentialTrafficOnly } from "../utils/privacyLevel.js";
import { isPolicyAllowed } from "../services/policyLimits/policyVerdicts.js";

//@ chunk-b30925fy.js:925-1092 fingerprint = BridgeFatalError (0.843)
/**
 * Remote Control 致命错误：带 HTTP 状态、服务端 error.type、是否可静默（suppressible）。
 */
class BridgeFatalError extends Error {
  status;
  errorType;
  suppressible;
  constructor(message, status, errorType, suppressible = false) {
    super(message);
    this.name = "BridgeFatalError";
    this.status = status;
    this.errorType = errorType;
    this.suppressible = suppressible;
  }
}
//@ chunk-b30925fy.js:1092-1535 layout
/**
 * 403 untrusted_device 时注册本机为可信设备并重试一次；仍被拒则抛带提示的 BridgeFatalError。
 */
async function recoverUntrustedDevice(
  untrustedDevice,
  getAccessToken,
  debug,
  response,
  deviceToken,
  sendRequest,
  context,
) {
  let untrustedDeviceRefusal = readUntrustedDeviceRefusal(response.data);
  if (untrustedDeviceRefusal === undefined) return response;
  let justEnrolled = false;
  if (shouldRemoteControlEnroll(untrustedDeviceRefusal)) {
    debug(`[bridge:api] ${context}: 403 untrusted_device, enrolling this computer and retrying`);
    let k = await untrustedDevice.recover(deviceToken);
    if (k) {
      let S = await sendRequest(getAccessToken(), k);
      let r = S.status === 403 ? readUntrustedDeviceRefusal(S.data) : undefined;
      if (r === undefined) return S;
      untrustedDeviceRefusal = r;
      justEnrolled = true;
      debug(`[bridge:api] ${context}: retry after enrollment also got untrusted_device`);
    }
  }
  throw new BridgeFatalError(
    `${context}: ${untrustedDevice.hint(untrustedDeviceRefusal, {
      justEnrolled,
    })}`,
    403,
    "untrusted_device",
  );
}
//@ chunk-b30925fy.js:1535-9755 fingerprint = createBridgeApiClient (0.727)
/**
 * 创建 Environments API 客户端：统一头（OAuth Bearer、anthropic-version、beta、x-environment-runner-version、X-Trusted-Device-Token），401 时刷新 token 重试，403 untrusted_device 注册设备重试；
 * 方法：registerBridgeEnvironment、pollForWork、acknowledgeWork、stopWork、deregisterEnvironment、markEnvironmentOffline、archiveSession、reconnectSession、heartbeatWork、refuseToolHost，以及 sessionsWatch（mintResumeToken、open SSE）。
 */
function createBridgeApiClient(deps) {
  function debug(msg) {
    deps.onDebug?.(msg);
  }
  let consecutiveEmptyPolls = 0;
  let EMPTY_POLL_LOG_INTERVAL = 100;
  async function getHeaders(accessToken, context) {
    let headers = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
      "anthropic-beta": BETA_ENVIRONMENTS.header,
      "x-environment-runner-version": deps.runnerVersion,
      "User-Agent": claudeCodeUserAgent(),
    };
    let deviceToken = context ?? (await deps.getTrustedDeviceToken?.());
    if (deviceToken) headers["X-Trusted-Device-Token"] = deviceToken;
    return headers;
  }
  function requireAccessToken() {
    let accessToken = deps.getAccessToken();
    if (!accessToken) throw Error(BRIDGE_LOGIN_INSTRUCTION);
    return accessToken;
  }
  async function withAuthRecovery(fn, context, o) {
    let untrustedDevice = o === "enroll_and_retry" ? deps.untrustedDevice : undefined;
    let deviceToken = untrustedDevice ? await deps.getTrustedDeviceToken?.() : undefined;
    let accessToken = requireAccessToken();
    let response = await fn(accessToken, deviceToken);
    if (response.status === 403 && untrustedDevice)
      return recoverUntrustedDevice(
        untrustedDevice,
        requireAccessToken,
        debug,
        response,
        deviceToken,
        fn,
        context,
      );
    if (response.status !== 401) return response;
    if (!deps.onAuth401) {
      debug(`[bridge:api] ${context}: 401 received, no refresh handler`);
      return response;
    }
    debug(`[bridge:api] ${context}: 401 received, attempting token refresh`);
    if (await deps.onAuth401(accessToken)) {
      debug(`[bridge:api] ${context}: Token refreshed, retrying request`);
      let newToken = requireAccessToken();
      let retryResponse = await fn(newToken, deviceToken);
      if (retryResponse.status === 403 && untrustedDevice)
        return recoverUntrustedDevice(
          untrustedDevice,
          requireAccessToken,
          debug,
          retryResponse,
          deviceToken,
          fn,
          context,
        );
      if (retryResponse.status !== 401) return retryResponse;
      debug(`[bridge:api] ${context}: Retry after refresh also got 401`);
    } else debug(`[bridge:api] ${context}: Token refresh failed`);
    return response;
  }
  let client = {
    async registerBridgeEnvironment(r, signal) {
      return withFeatureTelemetry(
        "bridge_environment_register",
        async () => {
          debug(`[bridge:api] POST /v1/environments/bridge bridgeId=${r.bridgeId}`);
          let o;
          let s = r.getToolHostAdvert?.() ?? {
            kind: "withdraw",
          };
          switch (s.kind) {
            case "advertise":
              o = {
                tool_host: "2",
                tool_host_cc_version: s.advert.cliVersion,
                tool_host_platform: s.advert.platform,
              };
              break;
            case "withdraw":
              if (r.reuseEnvironmentId)
                o = {
                  tool_host: "",
                  tool_host_cc_version: "",
                  tool_host_platform: "",
                  tool_host_blocker: "",
                };
              break;
            case "unknown":
              break;
          }
          let g = {
            machine_name: r.machineName,
            ...(r.machineId != null && {
              machine_id: r.machineId,
            }),
            directory: r.dir,
            branch: r.branch,
            git_repo_url: redactGitRemoteCredentials(r.gitRepoUrl),
            max_sessions: r.maxSessions,
            metadata: {
              worker_type: r.workerType,
              ...(r.machineId != null && {
                machine_id: r.machineId,
              }),
              ...o,
            },
            ...(r.hostProfile && {
              host: r.hostProfile,
            }),
            ...(r.reuseEnvironmentId && {
              environment_id: r.reuseEnvironmentId,
            }),
          };
          let _ = await withAuthRecovery(
            async (E, w) =>
              axios_default.post(`${deps.baseUrl}/v1/environments/bridge`, g, {
                headers: await getHeaders(E, w),
                timeout: 15000,
                signal,
                validateStatus: (status) => status < 500,
              }),
            "Registration",
            "enroll_and_retry",
          );
          if (_.status === 409 && extractErrorCode(_.data) === FOLDER_ALREADY_SERVED_ERROR_TYPE)
            throw new BridgeFatalError(
              extractPlainErrorDetail(_.data) ??
                "This folder is already served by another Claude Code on this device. Stop it first.",
              409,
              FOLDER_ALREADY_SERVED_ERROR_TYPE,
            );
          handleErrorStatus(_.status, _.data, "Registration", _.headers);
          debug(
            `[bridge:api] POST /v1/environments/bridge -> ${_.status} environment_id=${_.data.environment_id}`,
          );
          debug(
            `[bridge:api] >>> ${debugBody({
              ...g,
              ...(g.host && {
                host: {
                  tools: g.host.tools.length,
                  mcp: g.host.mcp_servers?.length ?? 0,
                },
              }),
            })}`,
          );
          debug(`[bridge:api] <<< ${debugBody(_.data)}`);
          return _.data;
        },
        classifyApiError,
      );
    },
    async pollForWork(environmentId, environmentSecret, signal, s, g) {
      validateBridgeId(environmentId, "environmentId");
      let prevEmptyPolls = consecutiveEmptyPolls;
      consecutiveEmptyPolls = 0;
      let E = {};
      if (s !== undefined) E.reclaim_older_than_ms = s;
      if (g !== undefined) E.poll_interval_ms = g;
      let response = await axios_default.get(`${deps.baseUrl}/v1/environments/${environmentId}/work/poll`, {
        headers: await getHeaders(environmentSecret),
        params: Object.keys(E).length > 0 ? E : undefined,
        timeout: 1e4,
        signal,
        validateStatus: (status) => status < 500,
      });
      handleErrorStatus(response.status, response.data, "Poll", response.headers);
      if (!response.data) {
        consecutiveEmptyPolls = prevEmptyPolls + 1;
        if (consecutiveEmptyPolls === 1 || consecutiveEmptyPolls % EMPTY_POLL_LOG_INTERVAL === 0)
          debug(
            `[bridge:api] GET .../work/poll -> ${response.status} (no work, ${consecutiveEmptyPolls} consecutive empty polls)`,
          );
        return null;
      }
      let mode = response.data.data?.mode;
      if (mode != null) {
        let { id, data: O } = response.data;
        debug(
          `[bridge:api] GET .../work/poll -> ${response.status} workId=${hashIdForLog(id)} type=${safeLogToken(O.type)} mode=${safeLogToken(mode)} sessionId=${hashIdForLog(O.id)}`,
        );
        return response.data;
      }
      debug(
        `[bridge:api] GET .../work/poll -> ${response.status} workId=${response.data.id} type=${response.data.data?.type}${response.data.data?.id ? ` sessionId=${response.data.data.id}` : ""}`,
      );
      debug(`[bridge:api] <<< ${debugBody(response.data)}`);
      return response.data;
    },
    async acknowledgeWork(environmentId, workId, sessionToken, s = workId) {
      validateBridgeId(environmentId, "environmentId");
      validateBridgeId(workId, "workId");
      debug(`[bridge:api] POST .../work/${s}/ack`);
      let response = await axios_default.post(
        `${deps.baseUrl}/v1/environments/${environmentId}/work/${workId}/ack`,
        {},
        {
          headers: await getHeaders(sessionToken),
          timeout: 1e4,
          validateStatus: (_) => _ < 500,
        },
      );
      handleErrorStatus(response.status, response.data, "Acknowledge", response.headers);
      debug(`[bridge:api] POST .../work/${s}/ack -> ${response.status}`);
    },
    async stopWork(environmentId, workId, o, s, g = workId) {
      validateBridgeId(environmentId, "environmentId");
      validateBridgeId(workId, "workId");
      debug(`[bridge:api] POST .../work/${g}/stop force=${s}`);
      let response = await axios_default.post(
        `${deps.baseUrl}/v1/environments/${environmentId}/work/${workId}/stop`,
        {
          force: s,
        },
        {
          headers: await getHeaders(o),
          timeout: 1e4,
          validateStatus: (token) => token < 500,
        },
      );
      handleErrorStatus(response.status, response.data, "StopWork");
      debug(`[bridge:api] POST .../work/${g}/stop -> ${response.status}`);
    },
    async deregisterEnvironment(environmentId) {
      validateBridgeId(environmentId, "environmentId");
      debug(`[bridge:api] DELETE /v1/environments/bridge/${environmentId}`);
      let response = await withAuthRecovery(
        async (token, s) =>
          axios_default.delete(`${deps.baseUrl}/v1/environments/bridge/${environmentId}`, {
            headers: await getHeaders(token, s),
            timeout: 1e4,
            validateStatus: (g) => g < 500,
          }),
        "Deregister",
        "pass_through",
      );
      handleErrorStatus(response.status, response.data, "Deregister");
      debug(`[bridge:api] DELETE /v1/environments/bridge/${environmentId} -> ${response.status}`);
    },
    async markEnvironmentOffline(r, i) {
      validateBridgeId(r, "environmentId");
      let o = `/v1/environments/bridge/${r}/offline`;
      debug(`[bridge:api] POST ${o}`);
      let s = await axios_default.post(`${deps.baseUrl}${o}`, undefined, {
        headers: await getHeaders(i),
        timeout: 5000,
        validateStatus: (token) => token < 500,
      });
      handleErrorStatus(s.status, s.data, "MarkOffline");
      debug(`[bridge:api] POST ${o} -> ${s.status}`);
    },
    async archiveSession(sessionId) {
      validateBridgeId(sessionId, "sessionId");
      let i = deps.useCcrV2SessionCrud?.()
        ? `/v1/code/sessions/${toInfraSessionId(sessionId)}/archive`
        : `/v1/sessions/${toCompatSessionId(sessionId)}/archive`;
      debug(`[bridge:api] POST ${i}`);
      let response = await withAuthRecovery(
        async (token, g) =>
          axios_default.post(
            `${deps.baseUrl}${i}`,
            {},
            {
              headers: await getHeaders(token, g),
              timeout: 1e4,
              validateStatus: (_) => _ < 500,
            },
          ),
        "ArchiveSession",
        "pass_through",
      );
      if (response.status === 409) {
        debug(`[bridge:api] POST ${i} -> 409 (already archived)`);
        return;
      }
      handleErrorStatus(response.status, response.data, "ArchiveSession");
      debug(`[bridge:api] POST ${i} -> ${response.status}`);
    },
    async reconnectSession(environmentId, sessionId, signal) {
      return withFeatureTelemetry(
        "bridge_session_reconnect",
        async () => {
          validateBridgeId(environmentId, "environmentId");
          validateBridgeId(sessionId, "sessionId");
          debug(
            `[bridge:api] POST /v1/environments/${environmentId}/bridge/reconnect session_id=${sessionId}`,
          );
          let response = await withAuthRecovery(
            async (token, _) =>
              axios_default.post(
                `${deps.baseUrl}/v1/environments/${environmentId}/bridge/reconnect`,
                {
                  session_id: sessionId,
                },
                {
                  headers: await getHeaders(token, _),
                  timeout: 1e4,
                  signal,
                  validateStatus: (token) => token < 500,
                },
              ),
            "ReconnectSession",
            "enroll_and_retry",
          );
          handleErrorStatus(response.status, response.data, "ReconnectSession");
          debug(`[bridge:api] POST .../bridge/reconnect -> ${response.status}`);
        },
        classifyApiError,
      );
    },
    async heartbeatWork(environmentId, workId, sessionToken) {
      validateBridgeId(environmentId, "environmentId");
      validateBridgeId(workId, "workId");
      debug(`[bridge:api] POST .../work/${workId}/heartbeat`);
      let response = await axios_default.post(
        `${deps.baseUrl}/v1/environments/${environmentId}/work/${workId}/heartbeat`,
        {},
        {
          headers: await getHeaders(sessionToken),
          timeout: 1e4,
          validateStatus: (g) => g < 500,
        },
      );
      handleErrorStatus(response.status, response.data, "Heartbeat");
      debug(
        `[bridge:api] POST .../work/${workId}/heartbeat -> ${response.status} lease_extended=${response.data.lease_extended} state=${response.data.state}`,
      );
      return response.data;
    },
  };
  function classifyRefuseError(token) {
    return token instanceof Error && "status" in token && typeof token.status === "number"
      ? `http_${token.status}`
      : classifyApiError(token);
  }
  client.refuseToolHost = async (r, i, o, signal) => {
    let msg = `[bridge:api] POST /v1/code/sessions/${hashIdForLog(r)}/tool_hosts/refuse workId=${hashIdForLog(i)} code=${o}`;
    try {
      if (
        getAPIProvider() !== "firstParty" ||
        isEssentialTrafficOnly() ||
        !isPolicyAllowed("allow_remote_control")
      ) {
        debug(`${msg} not sent`);
        return;
      }
      await withFeatureTelemetry(
        "bridge_tool_host_refuse",
        async () => {
          validateBridgeId(r, "sessionId");
          debug(msg);
          let response = await axios_default.post(
            `${deps.baseUrl}/v1/code/sessions/${toInfraSessionId(r)}/tool_hosts/refuse`,
            {
              work_id: i,
              code: o,
            },
            {
              headers: {
                ...(await getHeaders(requireAccessToken())),
                "anthropic-beta": BETA_CCR_BYOC.header,
                "anthropic-client-feature": "ccr",
              },
              timeout: 5000,
              signal,
              maxRedirects: 0,
              validateStatus: (E) => E < 500,
            },
          );
          handleErrorStatus(response.status, response.data, "RefuseToolHost");
          debug(`${msg} -> ${response.status}`);
        },
        classifyRefuseError,
      );
    } catch (error) {
      debug(`${msg} failed (${classifyRefuseError(error)}); not retried`);
    }
  };
  async function watchHeaders(r) {
    let { "anthropic-beta": i, ...o } = await getHeaders(r);
    return {
      ...o,
      "anthropic-client-platform": getClientPlatform(),
      "anthropic-client-version": deps.runnerVersion,
    };
  }
  function parseRetryAfter(headers) {
    let i = headers["retry-after"];
    return typeof i === "string" ? parseRetryAfterMs(i) : undefined;
  }
  client.sessionsWatch = {
    async mintResumeToken(r, signal) {
      let {
        status,
        data: s,
        headers,
      } = await axios_default.get(`${deps.baseUrl}/v1/code/sessions?limit=1`, {
        headers: await watchHeaders(r),
        timeout: 1e4,
        signal,
        maxRedirects: 0,
        validateStatus: () => true,
      });
      debug(`[bridge:api] GET /v1/code/sessions?limit=1 -> ${status}`);
      let resumeToken =
        s !== null && typeof s === "object" && "resume_token" in s ? s.resume_token : undefined;
      return {
        status,
        retryAfterMs: parseRetryAfter(headers),
        ...(typeof resumeToken === "string" && {
          resumeToken,
        }),
      };
    },
    async open(r, i, signal) {
      let {
        status,
        data: g,
        headers,
      } = await axios_default.get(
        `${deps.baseUrl}/v1/code/sessions/watch?include_trigger_sessions=true&exclude_tags=-`,
        {
          headers: {
            ...(await watchHeaders(r)),
            Accept: "text/event-stream",
            "Last-Event-ID": i,
          },
          responseType: "stream",
          timeout: 0,
          signal,
          maxRedirects: 0,
          validateStatus: () => true,
        },
      );
      debug(`[bridge:api] GET /v1/code/sessions/watch -> ${status}`);
      let E = headers["content-type"];
      if (status === 200 && typeof E === "string" && E.includes("text/event-stream"))
        return {
          status,
          body: g,
        };
      g.destroy();
      return {
        status,
        retryAfterMs: parseRetryAfter(headers),
      };
    },
  };
  return client;
}
//@ chunk-b30925fy.js:9755-10647 fingerprint = handleErrorStatus (0.798)
/**
 * 非 200/204 状态转错误：401 认证失败、403（过期类型→会话过期；external_poll_sessions 可静默）、404 不可用、410 过期、429 带 retryAfterMs，其余带状态码。
 */
function handleErrorStatus(status, data, context, headers) {
  if (status === 200 || status === 204) return;
  let detail = extractPlainErrorDetail(data);
  let errorType = extractErrorTypeFromData(data);
  switch (status) {
    case 401:
      throw new BridgeFatalError(
        `${context}: Authentication failed (401)${detail ? `: ${detail}` : ""}. ${BRIDGE_LOGIN_INSTRUCTION}`,
        401,
        errorType,
      );
    case 403:
      if (isExpiredErrorType(errorType))
        throw new BridgeFatalError("Remote Control session expired.", 403, errorType);
      throw new BridgeFatalError(
        `${context}: Access denied (403)${detail ? `: ${detail}` : ""}. Check your organization permissions.`,
        403,
        errorType,
        extractErrorDetail(data)?.includes("external_poll_sessions"),
      );
    case 404:
      throw new BridgeFatalError(
        detail ?? `${context}: Not found (404). Remote Control may not be available for this organization.`,
        404,
        errorType,
      );
    case 410:
      throw new BridgeFatalError(
        detail ?? "Remote Control session expired.",
        410,
        errorType ?? "environment_expired",
      );
    case 429: {
      let retryAfterMs = parseRetryAfterMs(
        typeof headers?.["retry-after"] === "string" ? headers["retry-after"] : undefined,
      );
      throw Object.assign(
        Error(`${context}: Rate limited (429). Polling too frequently.`),
        retryAfterMs !== undefined
          ? {
              status,
              retryAfterMs,
            }
          : {
              status,
            },
      );
    }
    default:
      throw Object.assign(Error(`${context}: Failed with status ${status}${detail ? `: ${detail}` : ""}`), {
        status,
      });
  }
}
//@ chunk-b30925fy.js:10647-10731 fingerprint = isExpiredErrorType (1)
/**
 * 错误类型是否表示会话过期（含 expired 或 lifetime）。
 */
function isExpiredErrorType(errorType) {
  if (!errorType) return false;
  return errorType.includes("expired") || errorType.includes("lifetime");
}
export { BridgeFatalError, isExpiredErrorType, createBridgeApiClient };
