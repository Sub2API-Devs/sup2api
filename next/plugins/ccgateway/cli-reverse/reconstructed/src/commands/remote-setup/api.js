/**
 * commands/remote-setup/api.ts
 *
 * 并入旧版已有路径：remote-setup 的 API（claude.ai GitHub 连接状态）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/remote-setup/api.ts
 * pieces: chunk-a3r2kq46.js (2), chunk-kkdpfy3w.js (14)
 * attribution: placement 8, callgraph-witnessed 1, fingerprint 3, layout 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { claudeCodeUserAgent } from "../../utils/http.js";
import {
  RUNNER_CLIENT_VERSION,
  LIST_MODE_ENV_VARS,
  NO_ALLOW,
  getOAuthHeaders,
  validateRunnerLabel,
  ENV_MAX_TIMEOUT_MS,
  ENV_DEFAULT_TIMEOUT_MS,
  isSafeEnvToken,
  RUNNER_CONFIG_SCHEMA,
  UnreadableToolsHostError,
  MAX_ENV_VALUE_BYTES,
} from "../../selfHostedRunner/serverAutoMode.js";
import { axios_default, isAxiosError } from "../../../vendor/axios/dist/esm/axios.js";
import { formatRunnerApiError } from "../../selfHostedRunner/runnerApiErrors.js";
import { readRequestIdSource } from "../../services/api/requestIdSource.js";
import { getOAuthHeaders_2, prepareApiRequest } from "../../utils/teleport/api.js";
import { jsonParse } from "../../utils/slowOperations.js";
import { plural, oneLineClipped } from "../../utils/stringUtils.js";
import { logForDebugging } from "../../utils/debug.js";
import { apiClient } from "../../services/routines/routinesApi.js";
import { BETA_CCR_BYOC } from "../../utils/betas.js";
import { getSSLErrorHint } from "../../services/api/errorUtils.js";
import { extractErrorDetail } from "../../bridge/debugUtils.js";
import { logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { getOauthConfig } from "../../constants/oauth.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { logError } from "../../utils/log.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, stringSchema, _enum } from "../../../vendor/zod/v4/classic/schemas.js";
import { getOauthAccountInfo, getClaudeAIOAuthTokenOrigin } from "../../utils/auth.js";
import { env } from "../../utils/env.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-a3r2kq46.js:5177-5348 placement (2.1.88 match: getOAuthHeaders, 0.779)
function getOAuthHeaders_3(accessToken) {
  return {
    "User-Agent": claudeCodeUserAgent(),
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "anthropic-version": "2023-06-01",
    "x-self-hosted-runner-version": RUNNER_CLIENT_VERSION,
  };
}
//@ chunk-a3r2kq46.js:8831-17995 callgraph-witnessed (2.1.88 match: createDefaultEnvironment, 0.009)
function createDefaultEnvironment(config) {
  function debugLog(message) {
    config.onDebug?.(message);
  }
  let consecutiveEmptyPolls = 0;
  let emptyPollLogInterval = 30;
  let capabilityHeaders = {
    "x-self-hosted-runner-capabilities": config.capabilities.join(",") || null,
  };
  return {
    async registerRunner(options = {}) {
      let { clientLabel, lockToAccountId, useAnthropicGitProxy, serverAutoModeLists } = options;
      debugLog("[runner:api] POST /v1/code/runners/self-hosted/runners/register");
      let body = {
        runner_version: RUNNER_CLIENT_VERSION,
        capabilities: config.capabilities,
        use_anthropic_git_proxy: useAnthropicGitProxy ?? false,
        server_auto_mode_lists: LIST_MODE_ENV_VARS[serverAutoModeLists ?? NO_ALLOW],
      };
      if (clientLabel) body.client_label = clientLabel;
      if (lockToAccountId) body.lock_to_account_id = lockToAccountId;
      let response = await axios_default.post(
        `${config.baseUrl}/v1/code/runners/self-hosted/runners/register`,
        body,
        {
          headers: getOAuthHeaders(config.poolSecret),
          timeout: 15000,
          validateStatus: (status) => status < 500,
        },
      );
      formatRunnerApiError(response.status, response.data, "RegisterRunner");
      validateRunnerLabel(response.data.runner_id, "runner_id");
      debugLog(`[runner:api] RegisterRunner -> ${response.status} runner_id=${response.data.runner_id}`);
      return response.data;
    },
    async pollSpawnHints(requestBody, signal) {
      let response = await axios_default.post(
        `${config.baseUrl}/v1/code/runners/self-hosted/spawn-hints/poll`,
        requestBody,
        {
          headers: getOAuthHeaders(config.poolSecret),
          timeout: 30000,
          signal,
          validateStatus: (status) => status < 500,
        },
      );
      formatRunnerApiError(response.status, response.data, "PollSpawnHints");
      let serverDate = typeof response.headers?.date === "string" ? response.headers.date : null;
      let normalizeHint = (hint) => ({
        ...hint,
        session_uuid: hint.session_uuid ?? "",
        attempt: hint.attempt ?? 0,
        work_order_jwt: hint.work_order_jwt ?? "",
        sources: hint.sources ?? [],
      });
      let slots = response.data.slots;
      let result = {
        hints: (response.data.hints ?? []).map(normalizeHint),
        warm_hints: (response.data.warm_hints ?? []).map(normalizeHint),
        pending_count: response.data.pending_count ?? 0,
        backing_off_count: response.data.backing_off_count ?? 0,
        circuit_broken_count: response.data.circuit_broken_count ?? 0,
        pool_pending_session_count: response.data.pool_pending_session_count ?? 0,
        pool_active_session_count: response.data.pool_active_session_count ?? 0,
        ...(typeof slots === "number" &&
          Number.isInteger(slots) &&
          slots >= 1 && {
            slots,
          }),
        server_date: serverDate,
      };
      debugLog(
        `[runner:api] PollSpawnHints -> ${response.status} hints=${result.hints.length} warm=${result.warm_hints.length} pending=${result.pending_count} backing_off=${result.backing_off_count} circuit_broken=${result.circuit_broken_count} slots=${result.slots ?? "-"}`,
      );
      return result;
    },
    async nackSpawnHint(nack, signal) {
      debugLog(
        `[runner:api] POST /v1/code/runners/self-hosted/spawn-hints/nack session=${nack.session_uuid} attempt=${nack.attempt} retryable=${nack.retryable}${nack.failure_kind ? ` cause=${nack.failure_kind}` : ""}`,
      );
      let error = nack.error.length > 512 ? nack.error.slice(0, 512) : nack.error;
      let response = await axios_default.post(
        `${config.baseUrl}/v1/code/runners/self-hosted/spawn-hints/nack`,
        {
          ...nack,
          error,
        },
        {
          headers: getOAuthHeaders(config.poolSecret),
          timeout: ENV_MAX_TIMEOUT_MS,
          signal,
          validateStatus: (status) => status < 500,
        },
      );
      formatRunnerApiError(response.status, response.data, "NackSpawnHint");
      debugLog(`[runner:api] NackSpawnHint -> ${response.status}`);
    },
    async pollWork(credentials, runnerId, availableCapacity, signal, wakeSource) {
      validateRunnerLabel(runnerId, "runnerId");
      let priorEmptyPolls = consecutiveEmptyPolls;
      consecutiveEmptyPolls = 0;
      let response = await axios_default.post(
        `${config.baseUrl}/v1/code/runners/self-hosted/runners/${runnerId}/poll`,
        {
          available_capacity: availableCapacity,
          ...(wakeSource !== undefined && {
            wake_source: wakeSource,
          }),
        },
        {
          headers: getOAuthHeaders_3(credentials),
          timeout: ENV_DEFAULT_TIMEOUT_MS,
          signal,
          validateStatus: (status) => status < 500,
        },
      );
      formatRunnerApiError(response.status, response.data, "PollWork");
      let data = response.data;
      if (typeof data !== "object" || data === null || Array.isArray(data))
        throw Error(
          "PollWork: response body is not a JSON object (an intercepting proxy may have answered) \u2014 rejecting the malformed poll response",
        );
      let assignmentIds = response.data.assignment_ids;
      if (assignmentIds !== undefined && assignmentIds !== null && !Array.isArray(assignmentIds))
        throw Error(
          "PollWork: response assignment_ids is not an array \u2014 rejecting the malformed poll response",
        );
      if (Array.isArray(assignmentIds) && !assignmentIds.every(isSafeEnvToken))
        throw Error(
          "PollWork: response assignment_ids contains a malformed session id \u2014 rejecting the malformed poll response",
        );
      let assignmentIds_2 = response.data.assignment_ids ?? [];
      if (assignmentIds_2.length === 0) {
        consecutiveEmptyPolls = priorEmptyPolls + 1;
        if (consecutiveEmptyPolls === 1 || consecutiveEmptyPolls % emptyPollLogInterval === 0)
          debugLog(
            `[runner:api] PollWork -> ${response.status} (no work, ${consecutiveEmptyPolls} consecutive empty polls)`,
          );
      } else debugLog(`[runner:api] PollWork -> ${response.status} assignments=${assignmentIds_2.length}`);
      let leaseExpiresAt = response.data.lease_expires_at;
      let suggestedPollInterval = response.data.suggested_poll_interval;
      return {
        assignment_ids: assignmentIds_2,
        lease_expires_at: typeof leaseExpiresAt === "string" ? leaseExpiresAt : undefined,
        session_assignments: Array.isArray(response.data.session_assignments)
          ? response.data.session_assignments
          : [],
        suggested_poll_interval:
          typeof suggestedPollInterval === "string" ? suggestedPollInterval : undefined,
      };
    },
    async issueSessionToken(credentials, sessionId, signal) {
      validateRunnerLabel(sessionId, "sessionId");
      let url = `/v1/code/runners/self-hosted/sessions/${encodeURIComponent(sessionId)}/token`;
      debugLog(`[runner:api] POST ${url}`);
      let response = await axios_default.post(
        `${config.baseUrl}${url}`,
        {},
        {
          headers: getOAuthHeaders_3(credentials),
          timeout: 15000,
          signal,
          validateStatus: (status) => status < 500,
        },
      );
      formatRunnerApiError(response.status, response.data, "IssueSessionToken");
      if (!response.data.session_token) throw Error("IssueSessionToken: response missing session_token");
      debugLog(`[runner:api] IssueSessionToken -> ${response.status}`);
      let { session_token: sessionToken, tools_host: toolsHost } = response.data;
      if (toolsHost === undefined || toolsHost === null)
        return {
          session_token: sessionToken,
        };
      let parsed = RUNNER_CONFIG_SCHEMA().safeParse(toolsHost);
      if (!parsed.success) throw new UnreadableToolsHostError();
      return {
        session_token: sessionToken,
        tools_host: parsed.data,
      };
    },
    async reportSessionFailure(credentials, sessionId, reason, setupFailureKind, failureKind) {
      validateRunnerLabel(sessionId, "sessionId");
      debugLog(
        `[runner:api] POST /v1/code/runners/self-hosted/sessions/${sessionId}/report-failure reason=${reason}${setupFailureKind ? ` kind=${setupFailureKind}` : ""}${failureKind ? ` cause=${failureKind}` : ""}`,
      );
      let response = await axios_default.post(
        `${config.baseUrl}/v1/code/runners/self-hosted/sessions/${sessionId}/report-failure`,
        {
          reason,
          ...(setupFailureKind && {
            setup_failure_kind: setupFailureKind,
          }),
          ...(failureKind && {
            failure_kind: failureKind,
          }),
        },
        {
          headers: getOAuthHeaders_3(credentials),
          timeout: 15000,
          validateStatus: (status) => status < 500,
        },
      );
      formatRunnerApiError(response.status, response.data, "ReportSessionFailure");
      debugLog(
        `[runner:api] ReportSessionFailure -> ${response.status} excluded_count=${response.data.excluded_count} stuck=${response.data.stuck}`,
      );
      return response.data;
    },
    async releaseSession(credentials, sessionId) {
      validateRunnerLabel(sessionId, "sessionId");
      debugLog(`[runner:api] POST /v1/code/runners/self-hosted/sessions/${sessionId}/release`);
      let response = await axios_default.post(
        `${config.baseUrl}/v1/code/runners/self-hosted/sessions/${sessionId}/release`,
        {},
        {
          headers: getOAuthHeaders_3(credentials),
          timeout: 15000,
          validateStatus: (status) => status < 500,
        },
      );
      formatRunnerApiError(response.status, response.data, "ReleaseSession");
      let released = response.data.released ?? true;
      debugLog(`[runner:api] ReleaseSession -> ${response.status} released=${released}`);
      return {
        released,
      };
    },
    async deregisterRunner(credentials, deregisterOptions = {}) {
      debugLog(
        `[runner:api] POST /v1/code/runners/self-hosted/deregister reason=${deregisterOptions.reason ?? ""}` +
          (deregisterOptions.drain_hold
            ? ` drain_hold=${deregisterOptions.drain_hold.outcome} held_ms=${deregisterOptions.drain_hold.held_ms} busy_at_release=${deregisterOptions.drain_hold.busy_session_ids_at_release.length}`
            : ""),
      );
      let response = await axios_default.post(
        `${config.baseUrl}/v1/code/runners/self-hosted/deregister`,
        {
          ...(deregisterOptions.reason && {
            reason: deregisterOptions.reason,
          }),
          ...(deregisterOptions.drain_hold && {
            drain_hold: deregisterOptions.drain_hold,
          }),
        },
        {
          headers: getOAuthHeaders_3(credentials),
          timeout: 1e4,
          validateStatus: (status) => status < 500,
        },
      );
      formatRunnerApiError(response.status, response.data, "DeregisterRunner");
      debugLog(`[runner:api] DeregisterRunner -> ${response.status}`);
    },
    async refreshToken(credentials) {
      debugLog("[runner:api] POST /v1/code/auth/refresh");
      let response = await axios_default.post(
        `${config.baseUrl}/v1/code/auth/refresh`,
        {},
        {
          headers: getOAuthHeaders_3(credentials),
          timeout: 15000,
          validateStatus: (status) => status < 500,
        },
      );
      formatRunnerApiError(
        response.status,
        response.data,
        "RefreshToken",
        response.status === 403 &&
          readRequestIdSource((headerName) => response.headers[headerName]) === "nonorigin_other",
      );
      if (!response.data.token) throw Error("RefreshToken: response missing token");
      debugLog(`[runner:api] RefreshToken -> ${response.status}`);
      return response.data;
    },
    async getSessionRemoteConfig(sessionId, credentials, signal, requestOptions) {
      validateRunnerLabel(sessionId, "sessionId");
      debugLog(`[runner:api] GET /v1/code/sessions/${sessionId}/remote`);
      let response = await axios_default.get(`${config.baseUrl}/v1/code/sessions/${sessionId}/remote`, {
        headers: {
          ...requestOptions?.headers,
          ...getOAuthHeaders_2(credentials),
          "User-Agent": claudeCodeUserAgent(),
          ...capabilityHeaders,
        },
        ...(config.agentProxyUrl && {
          params: {
            agent_proxy_url: config.agentProxyUrl,
          },
        }),
        timeout: requestOptions?.timeoutMs ?? 15000,
        signal,
        validateStatus: (status) => status < 500,
        ...(requestOptions?.beforeParsing && {
          maxContentLength: requestOptions.beforeParsing.mostBytes,
          responseType: "text",
          transformResponse: (text, headers, httpStatus) => {
            if (httpStatus !== undefined && httpStatus >= 200 && httpStatus < 300)
              requestOptions.beforeParsing?.admit(text);
            else if (text.length > MAX_ENV_VALUE_BYTES) return text;
            try {
              return jsonParse(text);
            } catch {
              return text;
            }
          },
        }),
      });
      formatRunnerApiError(response.status, response.data, "GetSessionRemoteConfig");
      let data = response.data;
      return {
        ...data,
        sources: data.sources ?? [],
        push_targets: data.push_targets ?? [],
        claude_code_args: data.claude_code_args ?? {},
        environment_variables: data.environment_variables ?? {},
      };
    },
    async registerWorker(baseUrl, sessionId, credentials, signal) {
      validateRunnerLabel(sessionId, "sessionId");
      debugLog(`[runner:api] POST ${baseUrl}/v1/code/sessions/${sessionId}/worker/register`);
      let response = await axios_default.post(
        `${baseUrl}/v1/code/sessions/${sessionId}/worker/register`,
        {
          session_id: sessionId,
        },
        {
          headers: getOAuthHeaders_2(credentials),
          timeout: 30000,
          signal,
          validateStatus: (status) => status < 500,
        },
      );
      formatRunnerApiError(response.status, response.data, "RegisterWorker");
      let workerEpoch = parseInt(String(response.data.worker_epoch), 10);
      if (isNaN(workerEpoch))
        throw Error(`RegisterWorker: invalid worker_epoch in response: ${response.data.worker_epoch}`);
      debugLog(`[runner:api] RegisterWorker -> ${response.status} worker_epoch=${workerEpoch}`);
      return workerEpoch;
    },
    async postWorkerEvents(baseUrl, sessionId, credentials, workerEpoch, events, signal) {
      validateRunnerLabel(sessionId, "sessionId");
      debugLog(
        `[runner:api] POST ${baseUrl}/v1/code/sessions/${sessionId}/worker/events (${events.length} ${plural(events.length, "event")})`,
      );
      let response = await axios_default.post(
        `${baseUrl}/v1/code/sessions/${sessionId}/worker/events`,
        {
          worker_epoch: workerEpoch,
          events: events.map((payload) => ({
            payload,
          })),
        },
        {
          headers: getOAuthHeaders_2(credentials),
          timeout: 15000,
          signal,
          validateStatus: (status) => status < 500,
        },
      );
      formatRunnerApiError(response.status, response.data, "PostWorkerEvents");
      debugLog(`[runner:api] PostWorkerEvents -> ${response.status}`);
    },
    async updateSessionWorkerState(baseUrl, sessionId, credentials, workerEpoch, workerState, signal) {
      validateRunnerLabel(sessionId, "sessionId");
      debugLog(`[runner:api] PUT ${baseUrl}/v1/code/sessions/${sessionId}/worker`);
      let response = await axios_default.put(
        `${baseUrl}/v1/code/sessions/${sessionId}/worker`,
        {
          worker_epoch: workerEpoch,
          ...(typeof workerState === "string" && {
            worker_status: workerState,
          }),
          ...(typeof workerState === "object" && {
            connection_status: workerState.connectionStatus,
          }),
        },
        {
          headers: getOAuthHeaders_2(credentials),
          timeout: 15000,
          signal,
          validateStatus: (status) => status < 500,
        },
      );
      formatRunnerApiError(response.status, response.data, "UpdateSessionWorkerState");
      debugLog(`[runner:api] UpdateSessionWorkerState -> ${response.status}`);
    },
    async heartbeat(baseUrl, sessionId, credentials, workerEpoch, signal) {
      validateRunnerLabel(sessionId, "sessionId");
      let response = await axios_default.post(
        `${baseUrl}/v1/code/sessions/${sessionId}/worker/heartbeat`,
        {
          worker_epoch: workerEpoch,
        },
        {
          headers: getOAuthHeaders_2(credentials),
          timeout: 1e4,
          signal,
          validateStatus: (status) => status < 500,
        },
      );
      formatRunnerApiError(response.status, response.data, "Heartbeat");
    },
    async forwardDiagnostics(baseUrl, sessionId, credentials, workerEpoch, lines) {
      validateRunnerLabel(sessionId, "sessionId");
      if (lines.length === 0) return;
      debugLog(
        `[runner:api] POST ${baseUrl}/v1/code/sessions/${sessionId}/worker/diagnostics (${lines.length} lines)`,
      );
      let response = await axios_default.post(
        `${baseUrl}/v1/code/sessions/${sessionId}/worker/diagnostics`,
        {
          worker_epoch: workerEpoch,
          lines,
        },
        {
          headers: getOAuthHeaders_2(credentials),
          timeout: 30000,
          validateStatus: (status) => status < 500,
        },
      );
      formatRunnerApiError(response.status, response.data, "ForwardDiagnostics");
      debugLog(`[runner:api] ForwardDiagnostics -> ${response.status}`);
    },
  };
}
//@ chunk-kkdpfy3w.js:713-925 fingerprint (2.1.88 match: RedactedGithubToken, 1)
let GithubWebConnectionStatus; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-kkdpfy3w.js:713", () => {
  GithubWebConnectionStatus = class GithubWebConnectionStatus {
    #t;
    constructor(raw) {
      this.#t = raw;
    }
    reveal() {
      return this.#t;
    }
    toString() {
      return "[REDACTED:gh-token]";
    }
    toJSON() {
      return "[REDACTED:gh-token]";
    }
    [Symbol.for("nodejs.util.inspect.custom")]() {
      return "[REDACTED:gh-token]";
    }
  };
});
//@ chunk-kkdpfy3w.js:925-1708 fingerprint (2.1.88 match: importGithubToken, 0.79)
async function importGithubToken(token, credentials) {
  let response;
  try {
    response = await apiClient.post(
      "/v1/code/github/import-token",
      {
        token: token.reveal(),
      },
      {
        headers: {
          "anthropic-beta": BETA_CCR_BYOC.header,
        },
        auth: "teleport-org",
        timeout: 15000,
        validateStatus: () => true,
        credentials,
      },
    );
  } catch (err) {
    if (isAxiosError(err)) {
      logForDebugging(`import-token network error: ${err.code ?? "unknown"}`, {
        level: "error",
      });
      let sslErrorHint = getSSLErrorHint(err);
      return {
        ok: false,
        error: {
          kind: "network",
          ...(sslErrorHint && {
            sslHint: sslErrorHint,
          }),
        },
      };
    }
    return {
      ok: false,
      error: {
        kind: "not_signed_in",
      },
    };
  }
  if (!response.ok)
    return {
      ok: false,
      error: {
        kind: "not_signed_in",
      },
    };
  if (response.status === 200)
    return {
      ok: true,
      result: response.data,
    };
  if (response.status === 400) {
    let message = oneLineClipped(extractErrorDetail(response.data) ?? "");
    return {
      ok: false,
      error: {
        kind: "invalid_token",
        ...(message && {
          message,
        }),
      },
    };
  }
  if (response.status === 401)
    return {
      ok: false,
      error: {
        kind: "not_signed_in",
      },
    };
  logForDebugging(`import-token returned ${response.status}`, {
    level: "error",
  });
  return {
    ok: false,
    error: {
      kind: "server",
      status: response.status,
    },
  };
}
//@ chunk-kkdpfy3w.js:1708-1775 layout
async function hasValidOAuthToken(credentials) {
  try {
    await prepareApiRequest(credentials, false);
    return true;
  } catch {
    return false;
  }
}
//@ chunk-kkdpfy3w.js:1775-2166 layout
async function fetchGithubAuthStatus(credentials, { timeout, isBackground }) {
  try {
    let response = await apiClient.get("/api/oauth/organizations/:orgUUID/sync/github/auth", {
      auth: "teleport-org",
      timeout,
      isBackground,
      validateStatus: () => true,
      credentials,
    });
    if (!response.ok || response.status !== 200) return null;
    let authSource = response.data?.auth_source;
    return {
      isAuthenticated: response.data?.is_authenticated === true,
      authSource: authSource === "oauth" || authSource === "cli_import" ? authSource : null,
    };
  } catch {
    return null;
  }
}
//@ chunk-kkdpfy3w.js:2166-2279 layout
async function getGithubAuthSource(credentials) {
  let githubAuthStatus = await fetchGithubAuthStatus(credentials, {
    timeout: 1e4,
    isBackground: false,
  });
  return githubAuthStatus?.isAuthenticated ? githubAuthStatus.authSource : null;
}
//@ chunk-kkdpfy3w.js:2279-2514 layout
async function getGithubConnectionStatus(credentials) {
  let githubAuthStatus = await fetchGithubAuthStatus(credentials, {
    timeout: 3000,
    isBackground: true,
  });
  if (githubAuthStatus === null) {
    logFeatureSad("api_github_connection_status", "request_failed");
    return "unknown";
  }
  logFeatureOk("api_github_connection_status");
  return githubAuthStatus.isAuthenticated ? "connected" : "not_connected";
}
//@ chunk-kkdpfy3w.js:2514-2567 fingerprint (2.1.88 match: getCodeWebUrl, 1)
function getCodeWebUrl() {
  return `${getOauthConfig().CLAUDE_AI_ORIGIN}/code`;
}
//@ chunk-kkdpfy3w.js:2567-3604 placement
/**
 * claude.ai GitHub 连接状态缓存：先从全局配置的持久值播种，按代号丢弃过期请求，结果写回持久缓存。
 */
class GithubConnectionStatusCache {
  inFlight = undefined;
  status = undefined;
  generation = 0;
  async read(credentials, timeoutOptions) {
    this.seedFromPersisted();
    if (this.inFlight) await this.inFlight;
    else if (!isCheerfulHorizonGateOn()) await this.fetch(credentials, timeoutOptions);
    return this.status ?? "unknown";
  }
  async readLive(credentials, timeoutOptions) {
    this.seedFromPersisted();
    if (!this.inFlight && isCheerfulHorizonGateOn()) return "unknown";
    let generation = this.generation;
    let fetchedStatus = await (this.inFlight ?? this.fetch(credentials, timeoutOptions));
    return generation === this.generation ? fetchedStatus : "unknown";
  }
  peek(credentials, timeoutOptions) {
    this.seedFromPersisted();
    if (this.status === undefined && !this.inFlight && !isCheerfulHorizonGateOn())
      this.fetch(credentials, timeoutOptions);
    return this.status;
  }
  markConnected(timeoutOptions) {
    this.generation++;
    this.inFlight = undefined;
    this.status = "connected";
    persistGithubStatus("connected", timeoutOptions);
  }
  clear() {
    this.generation++;
    this.inFlight = undefined;
    this.status = undefined;
  }
  seedFromPersisted() {
    if (this.status !== undefined || this.inFlight) return;
    let connectionCacheAccount = getConnectionCacheAccount();
    if (connectionCacheAccount)
      this.status = readPersistedGithubStatus(getGlobalConfig(), connectionCacheAccount);
  }
  fetch(credentials, timeoutOptions) {
    let generation = this.generation;
    let statusPromise = getGithubConnectionStatus(credentials).then(
      (githubConnectionStatus) => {
        this.settle(generation, githubConnectionStatus, timeoutOptions);
        return githubConnectionStatus;
      },
      (error) => {
        logError(error);
        this.settle(generation, "unknown", timeoutOptions);
        return "unknown";
      },
    );
    this.inFlight = statusPromise;
    return statusPromise;
  }
  settle(generation, status, timeoutOptions) {
    if (generation !== this.generation) return;
    this.inFlight = undefined;
    if (status === "unknown") {
      this.status ??= status;
      return;
    }
    this.status = status;
    persistGithubStatus(status, timeoutOptions);
  }
}
//@ chunk-kkdpfy3w.js:3604-3628 placement
/**
 * 按宿主缓存的 GitHub 连接状态缓存（remote-setup/promo/auth 共用）。
 */
var GITHUB_CONNECTION_STATUS_CACHE; // deferred: uses GithubConnectionStatusCache of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-kkdpfy3w.js:3604", () => {
  GITHUB_CONNECTION_STATUS_CACHE = new HostScoped(() => new GithubConnectionStatusCache());
});
//@ chunk-kkdpfy3w.js:3628-3679 placement
function isCheerfulHorizonGateOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_cheerful_horizon", false);
}
//@ chunk-kkdpfy3w.js:3679-3765 placement
var githubConnectionStatusSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-kkdpfy3w.js:3679", () => {
  githubConnectionStatusSchema = DoctorLazy(() =>
    objectSchema({
      accountUuid: stringSchema(),
      orgUuid: stringSchema(),
      status: _enum(["connected", "not_connected"]),
    }),
  );
});
//@ chunk-kkdpfy3w.js:3765-3980 placement
function getConnectionCacheAccount() {
  let oauthAccountInfo = getOauthAccountInfo();
  if (!oauthAccountInfo?.organizationUuid) return;
  let CLAUDE_CODE_ORGANIZATION_UUID = env.CLAUDE_CODE_ORGANIZATION_UUID;
  if (CLAUDE_CODE_ORGANIZATION_UUID && CLAUDE_CODE_ORGANIZATION_UUID !== oauthAccountInfo.organizationUuid)
    return;
  if (getClaudeAIOAuthTokenOrigin() !== "store") return;
  return {
    accountUuid: oauthAccountInfo.accountUuid,
    orgUuid: oauthAccountInfo.organizationUuid,
  };
}
//@ chunk-kkdpfy3w.js:3980-4156 placement
function readPersistedGithubStatus(config, connectionCacheAccount) {
  let parsed = githubConnectionStatusSchema().safeParse(config.githubWebConnectionStatusCache);
  if (
    !parsed.success ||
    parsed.data.accountUuid !== connectionCacheAccount.accountUuid ||
    parsed.data.orgUuid !== connectionCacheAccount.orgUuid
  )
    return;
  return parsed.data.status;
}
//@ chunk-kkdpfy3w.js:4156-4273 placement
function persistGithubStatus(status, storage) {
  let connectionCacheAccount = getConnectionCacheAccount();
  if (!connectionCacheAccount) return;
  saveGlobalConfig(
    (config) =>
      readPersistedGithubStatus(config, connectionCacheAccount) === status
        ? config
        : {
            ...config,
            githubWebConnectionStatusCache: {
              ...connectionCacheAccount,
              status,
            },
          },
    storage,
  );
}
export {
  GITHUB_CONNECTION_STATUS_CACHE,
  createDefaultEnvironment,
  hasValidOAuthToken,
  GithubWebConnectionStatus,
  getCodeWebUrl,
  getGithubAuthSource,
  importGithubToken,
};
