/**
 * commands/remote-setup/api.ts
 *
 * 并入旧版已有路径：remote-setup 的 API（claude.ai GitHub 连接状态）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/remote-setup/api.ts
 * pieces: chunk-0wa2vg6f.js (14), chunk-3nztfxrw.js (2)
 * attribution: fingerprint 3, layout 4, placement 8, callgraph-witnessed 1
 */
import { logForDebugging } from "../../utils/debug.js";
import { apiClient } from "../../services/routines/routinesApi.js";
import { BETA_CCR_BYOC } from "../../utils/betas.js";
import { isAxiosError, axios_default } from "../../../vendor/axios/dist/esm/axios.js";
import { getSSLErrorHint } from "../../services/api/errorUtils.js";
import { oneLineClipped, plural } from "../../utils/stringUtils.js";
import { extractErrorDetail } from "../../bridge/debugUtils.js";
import { prepareApiRequest, getOAuthHeaders_2 } from "../../utils/teleport/api.js";
import { logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { getOauthConfig } from "../../constants/oauth.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { logError } from "../../utils/log.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, string, _enum } from "../../../vendor/zod/v4/classic/schemas.js";
import { getOauthAccountInfo, getClaudeAIOAuthTokenOrigin } from "../../utils/auth.js";
import { env } from "../../utils/env.js";
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
import { formatRunnerApiError } from "../../selfHostedRunner/runnerApiErrors.js";
import { readRequestIdSource } from "../../services/api/requestIdSource.js";
import { jsonParse } from "../../utils/slowOperations.js";

//@ chunk-0wa2vg6f.js:713-925 fingerprint = RedactedGithubToken (1)
class GithubWebConnectionStatus {
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
}
//@ chunk-0wa2vg6f.js:925-1708 fingerprint = importGithubToken (0.79)
async function importGithubToken(token, credentials) {
  let r;
  try {
    r = await apiClient.post(
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
  if (!r.ok)
    return {
      ok: false,
      error: {
        kind: "not_signed_in",
      },
    };
  if (r.status === 200)
    return {
      ok: true,
      result: r.data,
    };
  if (r.status === 400) {
    let s = oneLineClipped(extractErrorDetail(r.data) ?? "");
    return {
      ok: false,
      error: {
        kind: "invalid_token",
        ...(s && {
          message: s,
        }),
      },
    };
  }
  if (r.status === 401)
    return {
      ok: false,
      error: {
        kind: "not_signed_in",
      },
    };
  logForDebugging(`import-token returned ${r.status}`, {
    level: "error",
  });
  return {
    ok: false,
    error: {
      kind: "server",
      status: r.status,
    },
  };
}
//@ chunk-0wa2vg6f.js:1708-1775 layout
async function hasValidOAuthToken(e) {
  try {
    await prepareApiRequest(e, false);
    return true;
  } catch {
    return false;
  }
}
//@ chunk-0wa2vg6f.js:1775-2166 layout
async function fetchGithubAuthStatus(credentials, { timeout, isBackground }) {
  try {
    let s = await apiClient.get("/api/oauth/organizations/:orgUUID/sync/github/auth", {
      auth: "teleport-org",
      timeout,
      isBackground,
      validateStatus: () => true,
      credentials,
    });
    if (!s.ok || s.status !== 200) return null;
    let authSource = s.data?.auth_source;
    return {
      isAuthenticated: s.data?.is_authenticated === true,
      authSource: authSource === "oauth" || authSource === "cli_import" ? authSource : null,
    };
  } catch {
    return null;
  }
}
//@ chunk-0wa2vg6f.js:2166-2279 layout
async function getGithubAuthSource(credentials) {
  let githubAuthStatus = await fetchGithubAuthStatus(credentials, {
    timeout: 1e4,
    isBackground: false,
  });
  return githubAuthStatus?.isAuthenticated ? githubAuthStatus.authSource : null;
}
//@ chunk-0wa2vg6f.js:2279-2514 layout
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
//@ chunk-0wa2vg6f.js:2514-2567 fingerprint = getCodeWebUrl (1)
function getCodeWebUrl() {
  return `${getOauthConfig().CLAUDE_AI_ORIGIN}/code`;
}
//@ chunk-0wa2vg6f.js:2567-3604 placement
/**
 * claude.ai GitHub 连接状态缓存：先从全局配置的持久值播种，按代号丢弃过期请求，结果写回持久缓存。
 */
class GithubConnectionStatusCache {
  inFlight = undefined;
  status = undefined;
  generation = 0;
  async read(e, n) {
    this.seedFromPersisted();
    if (this.inFlight) await this.inFlight;
    else if (!isCheerfulHorizonGateOn()) await this.fetch(e, n);
    return this.status ?? "unknown";
  }
  async readLive(e, n) {
    this.seedFromPersisted();
    if (!this.inFlight && isCheerfulHorizonGateOn()) return "unknown";
    let generation = this.generation;
    let s = await (this.inFlight ?? this.fetch(e, n));
    return generation === this.generation ? s : "unknown";
  }
  peek(e, n) {
    this.seedFromPersisted();
    if (this.status === undefined && !this.inFlight && !isCheerfulHorizonGateOn()) this.fetch(e, n);
    return this.status;
  }
  markConnected(e) {
    this.generation++;
    this.inFlight = undefined;
    this.status = "connected";
    persistGithubStatus("connected", e);
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
  fetch(e, n) {
    let generation = this.generation;
    let s = getGithubConnectionStatus(e).then(
      (githubConnectionStatus) => {
        this.settle(generation, githubConnectionStatus, n);
        return githubConnectionStatus;
      },
      (error) => {
        logError(error);
        this.settle(generation, "unknown", n);
        return "unknown";
      },
    );
    this.inFlight = s;
    return s;
  }
  settle(e, n, r) {
    if (e !== this.generation) return;
    this.inFlight = undefined;
    if (n === "unknown") {
      this.status ??= n;
      return;
    }
    this.status = n;
    persistGithubStatus(n, r);
  }
}
//@ chunk-0wa2vg6f.js:3604-3628 placement
/**
 * 按宿主缓存的 GitHub 连接状态缓存（remote-setup/promo/auth 共用）。
 */
var GITHUB_CONNECTION_STATUS_CACHE = new HostScoped(() => new GithubConnectionStatusCache());
//@ chunk-0wa2vg6f.js:3628-3679 placement
function isCheerfulHorizonGateOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_cheerful_horizon", false);
}
//@ chunk-0wa2vg6f.js:3679-3765 placement
var githubConnectionStatusSchema = DoctorLazy(() =>
  u({
    accountUuid: string(),
    orgUuid: string(),
    status: _enum(["connected", "not_connected"]),
  }),
);
//@ chunk-0wa2vg6f.js:3765-3980 placement
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
//@ chunk-0wa2vg6f.js:3980-4156 placement
function readPersistedGithubStatus(e, connectionCacheAccount) {
  let r = githubConnectionStatusSchema().safeParse(e.githubWebConnectionStatusCache);
  if (
    !r.success ||
    r.data.accountUuid !== connectionCacheAccount.accountUuid ||
    r.data.orgUuid !== connectionCacheAccount.orgUuid
  )
    return;
  return r.data.status;
}
//@ chunk-0wa2vg6f.js:4156-4273 placement
function persistGithubStatus(e, n) {
  let connectionCacheAccount = getConnectionCacheAccount();
  if (!connectionCacheAccount) return;
  saveGlobalConfig(
    (s) =>
      readPersistedGithubStatus(s, connectionCacheAccount) === e
        ? s
        : {
            ...s,
            githubWebConnectionStatusCache: {
              ...connectionCacheAccount,
              status: e,
            },
          },
    n,
  );
}
//@ chunk-3nztfxrw.js:5177-5348 placement = getOAuthHeaders (0.778)
function getOAuthHeaders_3(accessToken) {
  return {
    "User-Agent": claudeCodeUserAgent(),
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "anthropic-version": "2023-06-01",
    "x-self-hosted-runner-version": RUNNER_CLIENT_VERSION,
  };
}
//@ chunk-3nztfxrw.js:8831-17921 callgraph-witnessed = createDefaultEnvironment (0.009)
function createDefaultEnvironment(e) {
  function n(t) {
    e.onDebug?.(t);
  }
  let r = 0;
  let m = 30;
  let a = {
    "x-self-hosted-runner-capabilities": e.capabilities.join(",") || null,
  };
  return {
    async registerRunner(t = {}) {
      let { clientLabel, lockToAccountId, useAnthropicGitProxy, serverAutoModeLists } = t;
      n("[runner:api] POST /v1/code/runners/self-hosted/runners/register");
      let b = {
        runner_version: RUNNER_CLIENT_VERSION,
        capabilities: e.capabilities,
        use_anthropic_git_proxy: useAnthropicGitProxy ?? false,
        server_auto_mode_lists: LIST_MODE_ENV_VARS[serverAutoModeLists ?? NO_ALLOW],
      };
      if (clientLabel) b.client_label = clientLabel;
      if (lockToAccountId) b.lock_to_account_id = lockToAccountId;
      let w = await axios_default.post(`${e.baseUrl}/v1/code/runners/self-hosted/runners/register`, b, {
        headers: getOAuthHeaders(e.poolSecret),
        timeout: 15000,
        validateStatus: (S) => S < 500,
      });
      formatRunnerApiError(w.status, w.data, "RegisterRunner");
      validateRunnerLabel(w.data.runner_id, "runner_id");
      n(`[runner:api] RegisterRunner -> ${w.status} runner_id=${w.data.runner_id}`);
      return w.data;
    },
    async pollSpawnHints(t, signal) {
      let s = await axios_default.post(`${e.baseUrl}/v1/code/runners/self-hosted/spawn-hints/poll`, t, {
        headers: getOAuthHeaders(e.poolSecret),
        timeout: 30000,
        signal,
        validateStatus: (S) => S < 500,
      });
      formatRunnerApiError(s.status, s.data, "PollSpawnHints");
      let serverDate = typeof s.headers?.date === "string" ? s.headers.date : null;
      let l = (S) => ({
        ...S,
        session_uuid: S.session_uuid ?? "",
        attempt: S.attempt ?? 0,
        work_order_jwt: S.work_order_jwt ?? "",
        sources: S.sources ?? [],
      });
      let slots = s.data.slots;
      let w = {
        hints: (s.data.hints ?? []).map(l),
        warm_hints: (s.data.warm_hints ?? []).map(l),
        pending_count: s.data.pending_count ?? 0,
        backing_off_count: s.data.backing_off_count ?? 0,
        circuit_broken_count: s.data.circuit_broken_count ?? 0,
        pool_pending_session_count: s.data.pool_pending_session_count ?? 0,
        pool_active_session_count: s.data.pool_active_session_count ?? 0,
        ...(typeof slots === "number" &&
          Number.isInteger(slots) &&
          slots >= 1 && {
            slots,
          }),
        server_date: serverDate,
      };
      n(
        `[runner:api] PollSpawnHints -> ${s.status} hints=${w.hints.length} warm=${w.warm_hints.length} pending=${w.pending_count} backing_off=${w.backing_off_count} circuit_broken=${w.circuit_broken_count} slots=${w.slots ?? "-"}`,
      );
      return w;
    },
    async nackSpawnHint(t, signal) {
      n(
        `[runner:api] POST /v1/code/runners/self-hosted/spawn-hints/nack session=${t.session_uuid} attempt=${t.attempt} retryable=${t.retryable}${t.failure_kind ? ` cause=${t.failure_kind}` : ""}`,
      );
      let error = t.error.length > 512 ? t.error.slice(0, 512) : t.error;
      let c = await axios_default.post(
        `${e.baseUrl}/v1/code/runners/self-hosted/spawn-hints/nack`,
        {
          ...t,
          error,
        },
        {
          headers: getOAuthHeaders(e.poolSecret),
          timeout: ENV_MAX_TIMEOUT_MS,
          signal,
          validateStatus: (l) => l < 500,
        },
      );
      formatRunnerApiError(c.status, c.data, "NackSpawnHint");
      n(`[runner:api] NackSpawnHint -> ${c.status}`);
    },
    async pollWork(t, i, availableCapacity, signal, l) {
      validateRunnerLabel(i, "runnerId");
      let b = r;
      r = 0;
      let w = await axios_default.post(
        `${e.baseUrl}/v1/code/runners/self-hosted/runners/${i}/poll`,
        {
          available_capacity: availableCapacity,
          ...(l !== undefined && {
            wake_source: l,
          }),
        },
        {
          headers: getOAuthHeaders_3(t),
          timeout: ENV_DEFAULT_TIMEOUT_MS,
          signal,
          validateStatus: (A) => A < 500,
        },
      );
      formatRunnerApiError(w.status, w.data, "PollWork");
      let S = w.data;
      if (typeof S !== "object" || S === null || Array.isArray(S))
        throw Error(
          "PollWork: response body is not a JSON object (an intercepting proxy may have answered) \u2014 rejecting the malformed poll response",
        );
      let assignmentIds = w.data.assignment_ids;
      if (assignmentIds !== undefined && assignmentIds !== null && !Array.isArray(assignmentIds))
        throw Error(
          "PollWork: response assignment_ids is not an array \u2014 rejecting the malformed poll response",
        );
      if (Array.isArray(assignmentIds) && !assignmentIds.every(isSafeEnvToken))
        throw Error(
          "PollWork: response assignment_ids contains a malformed session id \u2014 rejecting the malformed poll response",
        );
      let assignmentIds_2 = w.data.assignment_ids ?? [];
      if (assignmentIds_2.length === 0) {
        r = b + 1;
        if (r === 1 || r % m === 0)
          n(`[runner:api] PollWork -> ${w.status} (no work, ${r} consecutive empty polls)`);
      } else n(`[runner:api] PollWork -> ${w.status} assignments=${assignmentIds_2.length}`);
      let leaseExpiresAt = w.data.lease_expires_at;
      let suggestedPollInterval = w.data.suggested_poll_interval;
      return {
        assignment_ids: assignmentIds_2,
        lease_expires_at: typeof leaseExpiresAt === "string" ? leaseExpiresAt : undefined,
        session_assignments: Array.isArray(w.data.session_assignments) ? w.data.session_assignments : [],
        suggested_poll_interval:
          typeof suggestedPollInterval === "string" ? suggestedPollInterval : undefined,
      };
    },
    async issueSessionToken(t, i, signal) {
      validateRunnerLabel(i, "sessionId");
      let url = `/v1/code/runners/self-hosted/sessions/${encodeURIComponent(i)}/token`;
      n(`[runner:api] POST ${url}`);
      let l = await axios_default.post(
        `${e.baseUrl}${url}`,
        {},
        {
          headers: getOAuthHeaders_3(t),
          timeout: 15000,
          signal,
          validateStatus: (T) => T < 500,
        },
      );
      formatRunnerApiError(l.status, l.data, "IssueSessionToken");
      if (!l.data.session_token) throw Error("IssueSessionToken: response missing session_token");
      n(`[runner:api] IssueSessionToken -> ${l.status}`);
      let { session_token: sessionToken, tools_host: toolsHost } = l.data;
      if (toolsHost === undefined || toolsHost === null)
        return {
          session_token: sessionToken,
        };
      let S = RUNNER_CONFIG_SCHEMA().safeParse(toolsHost);
      if (!S.success) throw new UnreadableToolsHostError();
      return {
        session_token: sessionToken,
        tools_host: S.data,
      };
    },
    async reportSessionFailure(t, i, s, c, l) {
      validateRunnerLabel(i, "sessionId");
      n(
        `[runner:api] POST /v1/code/runners/self-hosted/sessions/${i}/report-failure reason=${s}${c ? ` kind=${c}` : ""}${l ? ` cause=${l}` : ""}`,
      );
      let b = await axios_default.post(
        `${e.baseUrl}/v1/code/runners/self-hosted/sessions/${i}/report-failure`,
        {
          reason: s,
          ...(c && {
            setup_failure_kind: c,
          }),
          ...(l && {
            failure_kind: l,
          }),
        },
        {
          headers: getOAuthHeaders_3(t),
          timeout: 15000,
          validateStatus: (w) => w < 500,
        },
      );
      formatRunnerApiError(b.status, b.data, "ReportSessionFailure");
      n(
        `[runner:api] ReportSessionFailure -> ${b.status} excluded_count=${b.data.excluded_count} stuck=${b.data.stuck}`,
      );
      return b.data;
    },
    async releaseSession(t, i) {
      validateRunnerLabel(i, "sessionId");
      n(`[runner:api] POST /v1/code/runners/self-hosted/sessions/${i}/release`);
      let s = await axios_default.post(
        `${e.baseUrl}/v1/code/runners/self-hosted/sessions/${i}/release`,
        {},
        {
          headers: getOAuthHeaders_3(t),
          timeout: 15000,
          validateStatus: (l) => l < 500,
        },
      );
      formatRunnerApiError(s.status, s.data, "ReleaseSession");
      let released = s.data.released ?? true;
      n(`[runner:api] ReleaseSession -> ${s.status} released=${released}`);
      return {
        released,
      };
    },
    async deregisterRunner(t, i = {}) {
      n(
        `[runner:api] POST /v1/code/runners/self-hosted/deregister reason=${i.reason ?? ""}` +
          (i.drain_hold
            ? ` drain_hold=${i.drain_hold.outcome} held_ms=${i.drain_hold.held_ms} busy_at_release=${i.drain_hold.busy_session_ids_at_release.length}`
            : ""),
      );
      let s = await axios_default.post(
        `${e.baseUrl}/v1/code/runners/self-hosted/deregister`,
        {
          ...(i.reason && {
            reason: i.reason,
          }),
          ...(i.drain_hold && {
            drain_hold: i.drain_hold,
          }),
        },
        {
          headers: getOAuthHeaders_3(t),
          timeout: 1e4,
          validateStatus: (c) => c < 500,
        },
      );
      formatRunnerApiError(s.status, s.data, "DeregisterRunner");
      n(`[runner:api] DeregisterRunner -> ${s.status}`);
    },
    async refreshToken(t) {
      n("[runner:api] POST /v1/code/auth/refresh");
      let i = await axios_default.post(
        `${e.baseUrl}/v1/code/auth/refresh`,
        {},
        {
          headers: getOAuthHeaders_3(t),
          timeout: 15000,
          validateStatus: (s) => s < 500,
        },
      );
      formatRunnerApiError(
        i.status,
        i.data,
        "RefreshToken",
        i.status === 403 && readRequestIdSource((s) => i.headers[s]) === "nonorigin_other",
      );
      if (!i.data.token) throw Error("RefreshToken: response missing token");
      n(`[runner:api] RefreshToken -> ${i.status}`);
      return i.data;
    },
    async getSessionRemoteConfig(t, i, signal, c) {
      validateRunnerLabel(t, "sessionId");
      n(`[runner:api] GET /v1/code/sessions/${t}/remote`);
      let l = await axios_default.get(`${e.baseUrl}/v1/code/sessions/${t}/remote`, {
        headers: {
          ...c?.headers,
          ...getOAuthHeaders_2(i),
          "User-Agent": claudeCodeUserAgent(),
          ...a,
        },
        timeout: c?.timeoutMs ?? 15000,
        signal,
        validateStatus: (w) => w < 500,
        ...(c?.beforeParsing && {
          maxContentLength: c.beforeParsing.mostBytes,
          responseType: "text",
          transformResponse: (w, S, T) => {
            if (T !== undefined && T >= 200 && T < 300) c.beforeParsing?.admit(w);
            else if (w.length > MAX_ENV_VALUE_BYTES) return w;
            try {
              return jsonParse(w);
            } catch {
              return w;
            }
          },
        }),
      });
      formatRunnerApiError(l.status, l.data, "GetSessionRemoteConfig");
      let b = l.data;
      return {
        ...b,
        sources: b.sources ?? [],
        push_targets: b.push_targets ?? [],
        claude_code_args: b.claude_code_args ?? {},
        environment_variables: b.environment_variables ?? {},
      };
    },
    async registerWorker(t, i, s, signal) {
      validateRunnerLabel(i, "sessionId");
      n(`[runner:api] POST ${t}/v1/code/sessions/${i}/worker/register`);
      let l = await axios_default.post(
        `${t}/v1/code/sessions/${i}/worker/register`,
        {
          session_id: i,
        },
        {
          headers: getOAuthHeaders_2(s),
          timeout: 30000,
          signal,
          validateStatus: (w) => w < 500,
        },
      );
      formatRunnerApiError(l.status, l.data, "RegisterWorker");
      let b = parseInt(String(l.data.worker_epoch), 10);
      if (isNaN(b)) throw Error(`RegisterWorker: invalid worker_epoch in response: ${l.data.worker_epoch}`);
      n(`[runner:api] RegisterWorker -> ${l.status} worker_epoch=${b}`);
      return b;
    },
    async postWorkerEvents(t, i, s, workerEpoch, l, signal) {
      validateRunnerLabel(i, "sessionId");
      n(
        `[runner:api] POST ${t}/v1/code/sessions/${i}/worker/events (${l.length} ${plural(l.length, "event")})`,
      );
      let w = await axios_default.post(
        `${t}/v1/code/sessions/${i}/worker/events`,
        {
          worker_epoch: workerEpoch,
          events: l.map((payload) => ({
            payload,
          })),
        },
        {
          headers: getOAuthHeaders_2(s),
          timeout: 15000,
          signal,
          validateStatus: (S) => S < 500,
        },
      );
      formatRunnerApiError(w.status, w.data, "PostWorkerEvents");
      n(`[runner:api] PostWorkerEvents -> ${w.status}`);
    },
    async updateSessionWorkerState(t, i, s, workerEpoch, l, signal) {
      validateRunnerLabel(i, "sessionId");
      n(`[runner:api] PUT ${t}/v1/code/sessions/${i}/worker`);
      let w = await axios_default.put(
        `${t}/v1/code/sessions/${i}/worker`,
        {
          worker_epoch: workerEpoch,
          ...(typeof l === "string" && {
            worker_status: l,
          }),
          ...(typeof l === "object" && {
            connection_status: l.connectionStatus,
          }),
        },
        {
          headers: getOAuthHeaders_2(s),
          timeout: 15000,
          signal,
          validateStatus: (S) => S < 500,
        },
      );
      formatRunnerApiError(w.status, w.data, "UpdateSessionWorkerState");
      n(`[runner:api] UpdateSessionWorkerState -> ${w.status}`);
    },
    async heartbeat(t, i, s, workerEpoch, signal) {
      validateRunnerLabel(i, "sessionId");
      let b = await axios_default.post(
        `${t}/v1/code/sessions/${i}/worker/heartbeat`,
        {
          worker_epoch: workerEpoch,
        },
        {
          headers: getOAuthHeaders_2(s),
          timeout: 1e4,
          signal,
          validateStatus: (w) => w < 500,
        },
      );
      formatRunnerApiError(b.status, b.data, "Heartbeat");
    },
    async forwardDiagnostics(t, i, s, workerEpoch, l) {
      validateRunnerLabel(i, "sessionId");
      if (l.length === 0) return;
      n(`[runner:api] POST ${t}/v1/code/sessions/${i}/worker/diagnostics (${l.length} lines)`);
      let response = await axios_default.post(
        `${t}/v1/code/sessions/${i}/worker/diagnostics`,
        {
          worker_epoch: workerEpoch,
          lines: l,
        },
        {
          headers: getOAuthHeaders_2(s),
          timeout: 30000,
          validateStatus: (w) => w < 500,
        },
      );
      formatRunnerApiError(response.status, response.data, "ForwardDiagnostics");
      n(`[runner:api] ForwardDiagnostics -> ${response.status}`);
    },
  };
}
export {
  createDefaultEnvironment,
  GITHUB_CONNECTION_STATUS_CACHE,
  hasValidOAuthToken,
  GithubWebConnectionStatus,
  getCodeWebUrl,
  getGithubAuthSource,
  importGithubToken,
};
