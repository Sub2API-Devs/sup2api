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
import { ols, Cxn } from "../utils/betas.js";
import { claudeCodeUserAgent, getClientPlatform } from "../utils/http.js";
import { BRIDGE_LOGIN_INSTRUCTION, FOLDER_ALREADY_SERVED_ERROR_TYPE } from "./types.js";
import { withFeatureTelemetry } from "../services/analytics/featureTelemetry.js";
import { redactGitRemoteCredentials } from "../utils/git.js";
import { Dt } from "../../vendor/axios/dist/esm/axios.js";
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

/**
 * Remote Control 致命错误：带 HTTP 状态、服务端 error.type、是否可静默（suppressible）。
 */
//@ chunk-b30925fy.js:925-1092 fingerprint = BridgeFatalError (0.843)
class BridgeFatalError extends Error {
  status;
  errorType;
  suppressible;
  constructor(e, n, p, y = !1) {
    super(e);
    ((this.name = "BridgeFatalError"), (this.status = n), (this.errorType = p), (this.suppressible = y));
  }
}
/**
 * 403 untrusted_device 时注册本机为可信设备并重试一次；仍被拒则抛带提示的 BridgeFatalError。
 */
//@ chunk-b30925fy.js:1092-1535 layout
async function recoverUntrustedDevice(
  untrustedDevice,
  getAccessToken,
  debug,
  response,
  deviceToken,
  sendRequest,
  context,
) {
  let h = readUntrustedDeviceRefusal(response.data);
  if (h === void 0) return response;
  let R = !1;
  if (shouldRemoteControlEnroll(h)) {
    debug(`[bridge:api] ${context}: 403 untrusted_device, enrolling this computer and retrying`);
    let recover = await untrustedDevice.recover(deviceToken);
    if (recover) {
      let S = await sendRequest(getAccessToken(), recover),
        r = S.status === 403 ? readUntrustedDeviceRefusal(S.data) : void 0;
      if (r === void 0) return S;
      ((h = r), (R = !0), debug(`[bridge:api] ${context}: retry after enrollment also got untrusted_device`));
    }
  }
  throw new BridgeFatalError(
    `${context}: ${untrustedDevice.hint(h, { justEnrolled: R })}`,
    403,
    "untrusted_device",
  );
}
/**
 * 创建 Environments API 客户端：统一头（OAuth Bearer、anthropic-version、beta、x-environment-runner-version、X-Trusted-Device-Token），401 时刷新 token 重试，403 untrusted_device 注册设备重试；
 * 方法：registerBridgeEnvironment、pollForWork、acknowledgeWork、stopWork、deregisterEnvironment、markEnvironmentOffline、archiveSession、reconnectSession、heartbeatWork、refuseToolHost，以及 sessionsWatch（mintResumeToken、open SSE）。
 */
//@ chunk-b30925fy.js:1535-9755 fingerprint = createBridgeApiClient (0.727)
function createBridgeApiClient(deps) {
  function debug(msg) {
    deps.onDebug?.(msg);
  }
  let consecutiveEmptyPolls = 0,
    EMPTY_POLL_LOG_INTERVAL = 100;
  async function withOAuthRetry(fn, context) {
    let o = {
        Authorization: `Bearer ${fn}`,
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
        "anthropic-beta": ols.header,
        "x-environment-runner-version": deps.runnerVersion,
        "User-Agent": claudeCodeUserAgent(),
      },
      s = context ?? (await deps.getTrustedDeviceToken?.());
    if (s) o["X-Trusted-Device-Token"] = s;
    return o;
  }
  function requireAccessToken() {
    let accessToken = deps.getAccessToken();
    if (!accessToken) throw Error(BRIDGE_LOGIN_INSTRUCTION);
    return accessToken;
  }
  async function withAuthRecovery(r, i, o) {
    let s = o === "enroll_and_retry" ? deps.untrustedDevice : void 0,
      g = s ? await deps.getTrustedDeviceToken?.() : void 0,
      accessToken = requireAccessToken(),
      E = await r(accessToken, g);
    if (E.status === 403 && s) return recoverUntrustedDevice(s, requireAccessToken, debug, E, g, r, i);
    if (E.status !== 401) return E;
    if (!deps.onAuth401) return (debug(`[bridge:api] ${i}: 401 received, no refresh handler`), E);
    if (
      (debug(`[bridge:api] ${i}: 401 received, attempting token refresh`), await deps.onAuth401(accessToken))
    ) {
      debug(`[bridge:api] ${i}: Token refreshed, retrying request`);
      let newToken = requireAccessToken(),
        P = await r(newToken, g);
      if (P.status === 403 && s) return recoverUntrustedDevice(s, requireAccessToken, debug, P, g, r, i);
      if (P.status !== 401) return P;
      debug(`[bridge:api] ${i}: Retry after refresh also got 401`);
    } else debug(`[bridge:api] ${i}: Token refresh failed`);
    return E;
  }
  let client = {
    async registerBridgeEnvironment(r, i) {
      return withFeatureTelemetry(
        "bridge_environment_register",
        async () => {
          debug(`[bridge:api] POST /v1/environments/bridge bridgeId=${r.bridgeId}`);
          let o,
            s = r.getToolHostAdvert?.() ?? { kind: "withdraw" };
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
              ...(r.machineId != null && { machine_id: r.machineId }),
              directory: r.dir,
              branch: r.branch,
              git_repo_url: redactGitRemoteCredentials(r.gitRepoUrl),
              max_sessions: r.maxSessions,
              metadata: {
                worker_type: r.workerType,
                ...(r.machineId != null && { machine_id: r.machineId }),
                ...o,
              },
              ...(r.hostProfile && { host: r.hostProfile }),
              ...(r.reuseEnvironmentId && { environment_id: r.reuseEnvironmentId }),
            },
            _ = await withAuthRecovery(
              async (E, w) =>
                Dt.post(`${deps.baseUrl}/v1/environments/bridge`, g, {
                  headers: await withOAuthRetry(E, w),
                  timeout: 15000,
                  signal: i,
                  validateStatus: (token) => token < 500,
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
          return (
            handleErrorStatus(_.status, _.data, "Registration", _.headers),
            debug(
              `[bridge:api] POST /v1/environments/bridge -> ${_.status} environment_id=${_.data.environment_id}`,
            ),
            debug(
              `[bridge:api] >>> ${debugBody({ ...g, ...(g.host && { host: { tools: g.host.tools.length, mcp: g.host.mcp_servers?.length ?? 0 } }) })}`,
            ),
            debug(`[bridge:api] <<< ${debugBody(_.data)}`),
            _.data
          );
        },
        classifyApiError,
      );
    },
    async pollForWork(r, i, o, s, g) {
      validateBridgeId(r, "environmentId");
      let prevEmptyPolls = consecutiveEmptyPolls;
      consecutiveEmptyPolls = 0;
      let E = {};
      if (s !== void 0) E.reclaim_older_than_ms = s;
      if (g !== void 0) E.poll_interval_ms = g;
      let response = await Dt.get(`${deps.baseUrl}/v1/environments/${r}/work/poll`, {
        headers: await withOAuthRetry(i),
        params: Object.keys(E).length > 0 ? E : void 0,
        timeout: 1e4,
        signal: o,
        validateStatus: (status) => status < 500,
      });
      if ((handleErrorStatus(response.status, response.data, "Poll", response.headers), !response.data)) {
        if (
          ((consecutiveEmptyPolls = prevEmptyPolls + 1),
          consecutiveEmptyPolls === 1 || consecutiveEmptyPolls % EMPTY_POLL_LOG_INTERVAL === 0)
        )
          debug(
            `[bridge:api] GET .../work/poll -> ${response.status} (no work, ${consecutiveEmptyPolls} consecutive empty polls)`,
          );
        return null;
      }
      let D = response.data.data?.mode;
      if (D != null) {
        let { id: id, data: O } = response.data;
        return (
          debug(
            `[bridge:api] GET .../work/poll -> ${response.status} workId=${hashIdForLog(id)} type=${safeLogToken(O.type)} mode=${safeLogToken(D)} sessionId=${hashIdForLog(O.id)}`,
          ),
          response.data
        );
      }
      return (
        debug(
          `[bridge:api] GET .../work/poll -> ${response.status} workId=${response.data.id} type=${response.data.data?.type}${response.data.data?.id ? ` sessionId=${response.data.data.id}` : ""}`,
        ),
        debug(`[bridge:api] <<< ${debugBody(response.data)}`),
        response.data
      );
    },
    async acknowledgeWork(r, i, o, s = i) {
      (validateBridgeId(r, "environmentId"),
        validateBridgeId(i, "workId"),
        debug(`[bridge:api] POST .../work/${s}/ack`));
      let response = await Dt.post(
        `${deps.baseUrl}/v1/environments/${r}/work/${i}/ack`,
        {},
        { headers: await withOAuthRetry(o), timeout: 1e4, validateStatus: (_) => _ < 500 },
      );
      (handleErrorStatus(response.status, response.data, "Acknowledge", response.headers),
        debug(`[bridge:api] POST .../work/${s}/ack -> ${response.status}`));
    },
    async stopWork(r, i, o, s, g = i) {
      (validateBridgeId(r, "environmentId"),
        validateBridgeId(i, "workId"),
        debug(`[bridge:api] POST .../work/${g}/stop force=${s}`));
      let post = await Dt.post(
        `${deps.baseUrl}/v1/environments/${r}/work/${i}/stop`,
        { force: s },
        { headers: await withOAuthRetry(o), timeout: 1e4, validateStatus: (token) => token < 500 },
      );
      (handleErrorStatus(post.status, post.data, "StopWork"),
        debug(`[bridge:api] POST .../work/${g}/stop -> ${post.status}`));
    },
    async deregisterEnvironment(r) {
      (validateBridgeId(r, "environmentId"), debug(`[bridge:api] DELETE /v1/environments/bridge/${r}`));
      let i = await withAuthRecovery(
        async (o, s) =>
          Dt.delete(`${deps.baseUrl}/v1/environments/bridge/${r}`, {
            headers: await withOAuthRetry(o, s),
            timeout: 1e4,
            validateStatus: (g) => g < 500,
          }),
        "Deregister",
        "pass_through",
      );
      (handleErrorStatus(i.status, i.data, "Deregister"),
        debug(`[bridge:api] DELETE /v1/environments/bridge/${r} -> ${i.status}`));
    },
    async markEnvironmentOffline(r, i) {
      validateBridgeId(r, "environmentId");
      let o = `/v1/environments/bridge/${r}/offline`;
      debug(`[bridge:api] POST ${o}`);
      let post = await Dt.post(`${deps.baseUrl}${o}`, void 0, {
        headers: await withOAuthRetry(i),
        timeout: 5000,
        validateStatus: (token) => token < 500,
      });
      (handleErrorStatus(post.status, post.data, "MarkOffline"),
        debug(`[bridge:api] POST ${o} -> ${post.status}`));
    },
    async archiveSession(r) {
      validateBridgeId(r, "sessionId");
      let i = deps.useCcrV2SessionCrud?.()
        ? `/v1/code/sessions/${toInfraSessionId(r)}/archive`
        : `/v1/sessions/${toCompatSessionId(r)}/archive`;
      debug(`[bridge:api] POST ${i}`);
      let o = await withAuthRecovery(
        async (s, g) =>
          Dt.post(
            `${deps.baseUrl}${i}`,
            {},
            { headers: await withOAuthRetry(s, g), timeout: 1e4, validateStatus: (_) => _ < 500 },
          ),
        "ArchiveSession",
        "pass_through",
      );
      if (o.status === 409) {
        debug(`[bridge:api] POST ${i} -> 409 (already archived)`);
        return;
      }
      (handleErrorStatus(o.status, o.data, "ArchiveSession"), debug(`[bridge:api] POST ${i} -> ${o.status}`));
    },
    async reconnectSession(r, i, o) {
      return withFeatureTelemetry(
        "bridge_session_reconnect",
        async () => {
          (validateBridgeId(r, "environmentId"),
            validateBridgeId(i, "sessionId"),
            debug(`[bridge:api] POST /v1/environments/${r}/bridge/reconnect session_id=${i}`));
          let s = await withAuthRecovery(
            async (g, _) =>
              Dt.post(
                `${deps.baseUrl}/v1/environments/${r}/bridge/reconnect`,
                { session_id: i },
                {
                  headers: await withOAuthRetry(g, _),
                  timeout: 1e4,
                  signal: o,
                  validateStatus: (token) => token < 500,
                },
              ),
            "ReconnectSession",
            "enroll_and_retry",
          );
          (handleErrorStatus(s.status, s.data, "ReconnectSession"),
            debug(`[bridge:api] POST .../bridge/reconnect -> ${s.status}`));
        },
        classifyApiError,
      );
    },
    async heartbeatWork(r, i, o) {
      (validateBridgeId(r, "environmentId"),
        validateBridgeId(i, "workId"),
        debug(`[bridge:api] POST .../work/${i}/heartbeat`));
      let post = await Dt.post(
        `${deps.baseUrl}/v1/environments/${r}/work/${i}/heartbeat`,
        {},
        { headers: await withOAuthRetry(o), timeout: 1e4, validateStatus: (g) => g < 500 },
      );
      return (
        handleErrorStatus(post.status, post.data, "Heartbeat"),
        debug(
          `[bridge:api] POST .../work/${i}/heartbeat -> ${post.status} lease_extended=${post.data.lease_extended} state=${post.data.state}`,
        ),
        post.data
      );
    },
  };
  function classifyRefuseError(token) {
    return token instanceof Error && "status" in token && typeof token.status === "number"
      ? `http_${token.status}`
      : classifyApiError(token);
  }
  client.refuseToolHost = async (r, i, o, s) => {
    let g = `[bridge:api] POST /v1/code/sessions/${hashIdForLog(r)}/tool_hosts/refuse workId=${hashIdForLog(i)} code=${o}`;
    try {
      if (
        getAPIProvider() !== "firstParty" ||
        isEssentialTrafficOnly() ||
        !isPolicyAllowed("allow_remote_control")
      ) {
        debug(`${g} not sent`);
        return;
      }
      await withFeatureTelemetry(
        "bridge_tool_host_refuse",
        async () => {
          (validateBridgeId(r, "sessionId"), debug(g));
          let post = await Dt.post(
            `${deps.baseUrl}/v1/code/sessions/${toInfraSessionId(r)}/tool_hosts/refuse`,
            { work_id: i, code: o },
            {
              headers: {
                ...(await withOAuthRetry(requireAccessToken())),
                "anthropic-beta": Cxn.header,
                "anthropic-client-feature": "ccr",
              },
              timeout: 5000,
              signal: s,
              maxRedirects: 0,
              validateStatus: (E) => E < 500,
            },
          );
          (handleErrorStatus(post.status, post.data, "RefuseToolHost"), debug(`${g} -> ${post.status}`));
        },
        classifyRefuseError,
      );
    } catch (error) {
      debug(`${g} failed (${classifyRefuseError(error)}); not retried`);
    }
  };
  async function watchHeaders(r) {
    let { "anthropic-beta": i, ...o } = await withOAuthRetry(r);
    return {
      ...o,
      "anthropic-client-platform": getClientPlatform(),
      "anthropic-client-version": deps.runnerVersion,
    };
  }
  function parseRetryAfter(r) {
    let i = r["retry-after"];
    return typeof i === "string" ? parseRetryAfterMs(i) : void 0;
  }
  return (
    (client.sessionsWatch = {
      async mintResumeToken(r, i) {
        let {
          status: status,
          data: s,
          headers: headers,
        } = await Dt.get(`${deps.baseUrl}/v1/code/sessions?limit=1`, {
          headers: await watchHeaders(r),
          timeout: 1e4,
          signal: i,
          maxRedirects: 0,
          validateStatus: () => !0,
        });
        debug(`[bridge:api] GET /v1/code/sessions?limit=1 -> ${status}`);
        let _ = s !== null && typeof s === "object" && "resume_token" in s ? s.resume_token : void 0;
        return {
          status: status,
          retryAfterMs: parseRetryAfter(headers),
          ...(typeof _ === "string" && { resumeToken: _ }),
        };
      },
      async open(r, i, o) {
        let {
          status: status,
          data: g,
          headers: headers,
        } = await Dt.get(
          `${deps.baseUrl}/v1/code/sessions/watch?include_trigger_sessions=true&exclude_tags=-`,
          {
            headers: { ...(await watchHeaders(r)), Accept: "text/event-stream", "Last-Event-ID": i },
            responseType: "stream",
            timeout: 0,
            signal: o,
            maxRedirects: 0,
            validateStatus: () => !0,
          },
        );
        debug(`[bridge:api] GET /v1/code/sessions/watch -> ${status}`);
        let E = headers["content-type"];
        if (status === 200 && typeof E === "string" && E.includes("text/event-stream"))
          return { status: status, body: g };
        return (g.destroy(), { status: status, retryAfterMs: parseRetryAfter(headers) });
      },
    }),
    client
  );
}
/**
 * 非 200/204 状态转错误：401 认证失败、403（过期类型→会话过期；external_poll_sessions 可静默）、404 不可用、410 过期、429 带 retryAfterMs，其余带状态码。
 */
//@ chunk-b30925fy.js:9755-10647 fingerprint = handleErrorStatus (0.798)
function handleErrorStatus(e, n, p, y) {
  if (e === 200 || e === 204) return;
  let detail = extractPlainErrorDetail(n),
    errorType = extractErrorTypeFromData(n);
  switch (e) {
    case 401:
      throw new BridgeFatalError(
        `${p}: Authentication failed (401)${detail ? `: ${detail}` : ""}. ${BRIDGE_LOGIN_INSTRUCTION}`,
        401,
        errorType,
      );
    case 403:
      if (isExpiredErrorType(errorType))
        throw new BridgeFatalError("Remote Control session expired.", 403, errorType);
      throw new BridgeFatalError(
        `${p}: Access denied (403)${detail ? `: ${detail}` : ""}. Check your organization permissions.`,
        403,
        errorType,
        extractErrorDetail(n)?.includes("external_poll_sessions"),
      );
    case 404:
      throw new BridgeFatalError(
        detail ?? `${p}: Not found (404). Remote Control may not be available for this organization.`,
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
      let T = parseRetryAfterMs(typeof y?.["retry-after"] === "string" ? y["retry-after"] : void 0);
      throw Object.assign(
        Error(`${p}: Rate limited (429). Polling too frequently.`),
        T !== void 0 ? { status: e, retryAfterMs: T } : { status: e },
      );
    }
    default:
      throw Object.assign(Error(`${p}: Failed with status ${e}${detail ? `: ${detail}` : ""}`), {
        status: e,
      });
  }
}
/**
 * 错误类型是否表示会话过期（含 expired 或 lifetime）。
 */
//@ chunk-b30925fy.js:10647-10731 fingerprint = isExpiredErrorType (1)
function isExpiredErrorType(errorType) {
  if (!errorType) return !1;
  return errorType.includes("expired") || errorType.includes("lifetime");
}

export { BridgeFatalError, isExpiredErrorType, createBridgeApiClient };
