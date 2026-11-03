/**
 * commands/remote-setup/api.ts
 *
 * 并入旧版已有路径：remote-setup 的 API（claude.ai GitHub 连接状态）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/remote-setup/api.ts
 * pieces: chunk-0wa2vg6f.js (14), chunk-3nztfxrw.js (1)
 * attribution: fingerprint 3, layout 4, placement 7, callgraph-witnessed 1
 */
import { logForDebugging } from "../../utils/debug.js";
import { apiClient } from "../../services/routines/routinesApi.js";
import { Cxn } from "../../utils/betas.js";
import { isAxiosError, Dt } from "../../../vendor/axios/dist/esm/axios.js";
import { getSSLErrorHint } from "../../services/api/errorUtils.js";
import { U$, plural } from "../../utils/stringUtils.js";
import { extractErrorDetail } from "../../bridge/debugUtils.js";
import { prepareApiRequest, getOAuthHeaders_2 } from "../../utils/teleport/api.js";
import { logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { getOauthConfig } from "../../constants/oauth.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { logError } from "../../utils/log.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, o, U } from "../../../vendor/zod/v4/classic/schemas.js";
import { getOauthAccountInfo, getClaudeAIOAuthTokenOrigin } from "../../utils/auth.js";
import { env } from "../../utils/env.js";
import {
  Y9e,
  _n,
  NO_ALLOW,
  getOAuthHeaders,
  validateRunnerLabel,
  HHn,
  mvr,
  De,
  RUNNER_CONFIG_SCHEMA,
  UnreadableToolsHostError,
  wn,
} from "../../selfHostedRunner/serverAutoMode.js";
import { formatRunnerApiError } from "../../selfHostedRunner/runnerApiErrors.js";
import { getOAuthHeaders_3 } from "./_new/getOAuthHeaders_3.js";
import { readRequestIdSource } from "../../services/api/requestIdSource.js";
import { claudeCodeUserAgent } from "../../utils/http.js";
import { jsonParse } from "../../utils/slowOperations.js";

//@ chunk-0wa2vg6f.js:713-925 fingerprint = RedactedGithubToken (1)
class GithubWebConnectionStatus {
  #t;
  constructor(e) {
    this.#t = e;
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
async function importGithubToken(e, n) {
  let r;
  try {
    r = await apiClient.post(
      "/v1/code/github/import-token",
      { token: e.reveal() },
      {
        headers: { "anthropic-beta": Cxn.header },
        auth: "teleport-org",
        timeout: 15000,
        validateStatus: () => !0,
        credentials: n,
      },
    );
  } catch (err) {
    if (isAxiosError(err)) {
      logForDebugging(`import-token network error: ${err.code ?? "unknown"}`, { level: "error" });
      let a = getSSLErrorHint(err);
      return { ok: !1, error: { kind: "network", ...(a && { sslHint: a }) } };
    }
    return { ok: !1, error: { kind: "not_signed_in" } };
  }
  if (!r.ok) return { ok: !1, error: { kind: "not_signed_in" } };
  if (r.status === 200) return { ok: !0, result: r.data };
  if (r.status === 400) {
    let s = U$(extractErrorDetail(r.data) ?? "");
    return { ok: !1, error: { kind: "invalid_token", ...(s && { message: s }) } };
  }
  if (r.status === 401) return { ok: !1, error: { kind: "not_signed_in" } };
  return (
    logForDebugging(`import-token returned ${r.status}`, { level: "error" }),
    { ok: !1, error: { kind: "server", status: r.status } }
  );
}
//@ chunk-0wa2vg6f.js:1708-1775 layout
async function hasValidOAuthToken(e) {
  try {
    return (await prepareApiRequest(e, !1), !0);
  } catch {
    return !1;
  }
}
//@ chunk-0wa2vg6f.js:1775-2166 layout
async function fetchGithubAuthStatus(e, { timeout: timeout, isBackground: isBackground }) {
  try {
    let s = await apiClient.get("/api/oauth/organizations/:orgUUID/sync/github/auth", {
      auth: "teleport-org",
      timeout: timeout,
      isBackground: isBackground,
      validateStatus: () => !0,
      credentials: e,
    });
    if (!s.ok || s.status !== 200) return null;
    let a = s.data?.auth_source;
    return {
      isAuthenticated: s.data?.is_authenticated === !0,
      authSource: a === "oauth" || a === "cli_import" ? a : null,
    };
  } catch {
    return null;
  }
}
//@ chunk-0wa2vg6f.js:2166-2279 layout
async function getGithubAuthSource(e) {
  let n = await fetchGithubAuthStatus(e, { timeout: 1e4, isBackground: !1 });
  return n?.isAuthenticated ? n.authSource : null;
}
//@ chunk-0wa2vg6f.js:2279-2514 layout
async function getGithubConnectionStatus(e) {
  let n = await fetchGithubAuthStatus(e, { timeout: 3000, isBackground: !0 });
  if (n === null) return (logFeatureSad("api_github_connection_status", "request_failed"), "unknown");
  return (logFeatureOk("api_github_connection_status"), n.isAuthenticated ? "connected" : "not_connected");
}
//@ chunk-0wa2vg6f.js:2514-2567 fingerprint = getCodeWebUrl (1)
function getCodeWebUrl() {
  return `${getOauthConfig().CLAUDE_AI_ORIGIN}/code`;
}
/**
 * claude.ai GitHub 连接状态缓存：先从全局配置的持久值播种，按代号丢弃过期请求，结果写回持久缓存。
 */
//@ chunk-0wa2vg6f.js:2567-3604 placement
class GithubConnectionStatusCache {
  inFlight = void 0;
  status = void 0;
  generation = 0;
  async read(e, n) {
    if ((this.seedFromPersisted(), this.inFlight)) await this.inFlight;
    else if (!isCheerfulHorizonGateOn()) await this.fetch(e, n);
    return this.status ?? "unknown";
  }
  async readLive(e, n) {
    if ((this.seedFromPersisted(), !this.inFlight && isCheerfulHorizonGateOn())) return "unknown";
    let generation = this.generation,
      s = await (this.inFlight ?? this.fetch(e, n));
    return generation === this.generation ? s : "unknown";
  }
  peek(e, n) {
    if ((this.seedFromPersisted(), this.status === void 0 && !this.inFlight && !isCheerfulHorizonGateOn()))
      this.fetch(e, n);
    return this.status;
  }
  markConnected(e) {
    (this.generation++,
      (this.inFlight = void 0),
      (this.status = "connected"),
      persistGithubStatus("connected", e));
  }
  clear() {
    (this.generation++, (this.inFlight = void 0), (this.status = void 0));
  }
  seedFromPersisted() {
    if (this.status !== void 0 || this.inFlight) return;
    let e = getConnectionCacheAccount();
    if (e) this.status = readPersistedGithubStatus(getGlobalConfig(), e);
  }
  fetch(e, n) {
    let generation = this.generation,
      s = getGithubConnectionStatus(e).then(
        (a) => (this.settle(generation, a, n), a),
        (a) => (logError(a), this.settle(generation, "unknown", n), "unknown"),
      );
    return ((this.inFlight = s), s);
  }
  settle(e, n, r) {
    if (e !== this.generation) return;
    if (((this.inFlight = void 0), n === "unknown")) {
      this.status ??= n;
      return;
    }
    ((this.status = n), persistGithubStatus(n, r));
  }
}
//@ chunk-0wa2vg6f.js:3604-3628 placement
var ZV = new HostScoped(() => new GithubConnectionStatusCache());
//@ chunk-0wa2vg6f.js:3628-3679 placement
function isCheerfulHorizonGateOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_cheerful_horizon", !1);
}
//@ chunk-0wa2vg6f.js:3679-3765 placement
var C = DoctorLazy(() => u({ accountUuid: o(), orgUuid: o(), status: U(["connected", "not_connected"]) }));
//@ chunk-0wa2vg6f.js:3765-3980 placement
function getConnectionCacheAccount() {
  let e = getOauthAccountInfo();
  if (!e?.organizationUuid) return;
  let CLAUDE_CODE_ORGANIZATION_UUID = env.CLAUDE_CODE_ORGANIZATION_UUID;
  if (CLAUDE_CODE_ORGANIZATION_UUID && CLAUDE_CODE_ORGANIZATION_UUID !== e.organizationUuid) return;
  if (getClaudeAIOAuthTokenOrigin() !== "store") return;
  return { accountUuid: e.accountUuid, orgUuid: e.organizationUuid };
}
//@ chunk-0wa2vg6f.js:3980-4156 placement
function readPersistedGithubStatus(e, n) {
  let safeParse = C().safeParse(e.githubWebConnectionStatusCache);
  if (
    !safeParse.success ||
    safeParse.data.accountUuid !== n.accountUuid ||
    safeParse.data.orgUuid !== n.orgUuid
  )
    return;
  return safeParse.data.status;
}
//@ chunk-0wa2vg6f.js:4156-4273 placement
function persistGithubStatus(e, n) {
  let r = getConnectionCacheAccount();
  if (!r) return;
  saveGlobalConfig(
    (s) =>
      readPersistedGithubStatus(s, r) === e
        ? s
        : { ...s, githubWebConnectionStatusCache: { ...r, status: e } },
    n,
  );
}
//@ chunk-3nztfxrw.js:8831-17921 callgraph-witnessed = createDefaultEnvironment (0.009)
function createDefaultEnvironment(e) {
  function n(t) {
    e.onDebug?.(t);
  }
  let r = 0,
    m = 30,
    a = { "x-self-hosted-runner-capabilities": e.capabilities.join(",") || null };
  return {
    async registerRunner(t = {}) {
      let {
        clientLabel: clientLabel,
        lockToAccountId: lockToAccountId,
        useAnthropicGitProxy: useAnthropicGitProxy,
        serverAutoModeLists: serverAutoModeLists,
      } = t;
      n("[runner:api] POST /v1/code/runners/self-hosted/runners/register");
      let b = {
        runner_version: Y9e,
        capabilities: e.capabilities,
        use_anthropic_git_proxy: useAnthropicGitProxy ?? !1,
        server_auto_mode_lists: _n[serverAutoModeLists ?? NO_ALLOW],
      };
      if (clientLabel) b.client_label = clientLabel;
      if (lockToAccountId) b.lock_to_account_id = lockToAccountId;
      let post = await Dt.post(`${e.baseUrl}/v1/code/runners/self-hosted/runners/register`, b, {
        headers: getOAuthHeaders(e.poolSecret),
        timeout: 15000,
        validateStatus: (S) => S < 500,
      });
      return (
        formatRunnerApiError(post.status, post.data, "RegisterRunner"),
        validateRunnerLabel(post.data.runner_id, "runner_id"),
        n(`[runner:api] RegisterRunner -> ${post.status} runner_id=${post.data.runner_id}`),
        post.data
      );
    },
    async pollSpawnHints(t, i) {
      let post = await Dt.post(`${e.baseUrl}/v1/code/runners/self-hosted/spawn-hints/poll`, t, {
        headers: getOAuthHeaders(e.poolSecret),
        timeout: 30000,
        signal: i,
        validateStatus: (S) => S < 500,
      });
      formatRunnerApiError(post.status, post.data, "PollSpawnHints");
      let c = typeof post.headers?.date === "string" ? post.headers.date : null,
        l = (S) => ({
          ...S,
          session_uuid: S.session_uuid ?? "",
          attempt: S.attempt ?? 0,
          work_order_jwt: S.work_order_jwt ?? "",
          sources: S.sources ?? [],
        }),
        slots = post.data.slots,
        w = {
          hints: (post.data.hints ?? []).map(l),
          warm_hints: (post.data.warm_hints ?? []).map(l),
          pending_count: post.data.pending_count ?? 0,
          backing_off_count: post.data.backing_off_count ?? 0,
          circuit_broken_count: post.data.circuit_broken_count ?? 0,
          pool_pending_session_count: post.data.pool_pending_session_count ?? 0,
          pool_active_session_count: post.data.pool_active_session_count ?? 0,
          ...(typeof slots === "number" && Number.isInteger(slots) && slots >= 1 && { slots: slots }),
          server_date: c,
        };
      return (
        n(
          `[runner:api] PollSpawnHints -> ${post.status} hints=${w.hints.length} warm=${w.warm_hints.length} pending=${w.pending_count} backing_off=${w.backing_off_count} circuit_broken=${w.circuit_broken_count} slots=${w.slots ?? "-"}`,
        ),
        w
      );
    },
    async nackSpawnHint(t, i) {
      n(
        `[runner:api] POST /v1/code/runners/self-hosted/spawn-hints/nack session=${t.session_uuid} attempt=${t.attempt} retryable=${t.retryable}${t.failure_kind ? ` cause=${t.failure_kind}` : ""}`,
      );
      let s = t.error.length > 512 ? t.error.slice(0, 512) : t.error,
        post = await Dt.post(
          `${e.baseUrl}/v1/code/runners/self-hosted/spawn-hints/nack`,
          { ...t, error: s },
          { headers: getOAuthHeaders(e.poolSecret), timeout: HHn, signal: i, validateStatus: (l) => l < 500 },
        );
      (formatRunnerApiError(post.status, post.data, "NackSpawnHint"),
        n(`[runner:api] NackSpawnHint -> ${post.status}`));
    },
    async pollWork(t, i, s, c, l) {
      validateRunnerLabel(i, "runnerId");
      let b = r;
      r = 0;
      let post = await Dt.post(
        `${e.baseUrl}/v1/code/runners/self-hosted/runners/${i}/poll`,
        { available_capacity: s, ...(l !== void 0 && { wake_source: l }) },
        { headers: getOAuthHeaders_3(t), timeout: mvr, signal: c, validateStatus: (A) => A < 500 },
      );
      formatRunnerApiError(post.status, post.data, "PollWork");
      let S = post.data;
      if (typeof S !== "object" || S === null || Array.isArray(S))
        throw Error(
          "PollWork: response body is not a JSON object (an intercepting proxy may have answered) \u2014 rejecting the malformed poll response",
        );
      let assignment_ids = post.data.assignment_ids;
      if (assignment_ids !== void 0 && assignment_ids !== null && !Array.isArray(assignment_ids))
        throw Error(
          "PollWork: response assignment_ids is not an array \u2014 rejecting the malformed poll response",
        );
      if (Array.isArray(assignment_ids) && !assignment_ids.every(De))
        throw Error(
          "PollWork: response assignment_ids contains a malformed session id \u2014 rejecting the malformed poll response",
        );
      let N = post.data.assignment_ids ?? [];
      if (N.length === 0) {
        if (((r = b + 1), r === 1 || r % m === 0))
          n(`[runner:api] PollWork -> ${post.status} (no work, ${r} consecutive empty polls)`);
      } else n(`[runner:api] PollWork -> ${post.status} assignments=${N.length}`);
      let lease_expires_at = post.data.lease_expires_at,
        suggested_poll_interval = post.data.suggested_poll_interval;
      return {
        assignment_ids: N,
        lease_expires_at: typeof lease_expires_at === "string" ? lease_expires_at : void 0,
        session_assignments: Array.isArray(post.data.session_assignments)
          ? post.data.session_assignments
          : [],
        suggested_poll_interval:
          typeof suggested_poll_interval === "string" ? suggested_poll_interval : void 0,
      };
    },
    async issueSessionToken(t, i, s) {
      validateRunnerLabel(i, "sessionId");
      let url = `/v1/code/runners/self-hosted/sessions/${encodeURIComponent(i)}/token`;
      n(`[runner:api] POST ${url}`);
      let post = await Dt.post(
        `${e.baseUrl}${url}`,
        {},
        { headers: getOAuthHeaders_3(t), timeout: 15000, signal: s, validateStatus: (T) => T < 500 },
      );
      if ((formatRunnerApiError(post.status, post.data, "IssueSessionToken"), !post.data.session_token))
        throw Error("IssueSessionToken: response missing session_token");
      n(`[runner:api] IssueSessionToken -> ${post.status}`);
      let { session_token: session_token, tools_host: tools_host } = post.data;
      if (tools_host === void 0 || tools_host === null) return { session_token: session_token };
      let safeParse = RUNNER_CONFIG_SCHEMA().safeParse(tools_host);
      if (!safeParse.success) throw new UnreadableToolsHostError();
      return { session_token: session_token, tools_host: safeParse.data };
    },
    async reportSessionFailure(t, i, s, c, l) {
      (validateRunnerLabel(i, "sessionId"),
        n(
          `[runner:api] POST /v1/code/runners/self-hosted/sessions/${i}/report-failure reason=${s}${c ? ` kind=${c}` : ""}${l ? ` cause=${l}` : ""}`,
        ));
      let post = await Dt.post(
        `${e.baseUrl}/v1/code/runners/self-hosted/sessions/${i}/report-failure`,
        { reason: s, ...(c && { setup_failure_kind: c }), ...(l && { failure_kind: l }) },
        { headers: getOAuthHeaders_3(t), timeout: 15000, validateStatus: (w) => w < 500 },
      );
      return (
        formatRunnerApiError(post.status, post.data, "ReportSessionFailure"),
        n(
          `[runner:api] ReportSessionFailure -> ${post.status} excluded_count=${post.data.excluded_count} stuck=${post.data.stuck}`,
        ),
        post.data
      );
    },
    async releaseSession(t, i) {
      (validateRunnerLabel(i, "sessionId"),
        n(`[runner:api] POST /v1/code/runners/self-hosted/sessions/${i}/release`));
      let post = await Dt.post(
        `${e.baseUrl}/v1/code/runners/self-hosted/sessions/${i}/release`,
        {},
        { headers: getOAuthHeaders_3(t), timeout: 15000, validateStatus: (l) => l < 500 },
      );
      formatRunnerApiError(post.status, post.data, "ReleaseSession");
      let c = post.data.released ?? !0;
      return (n(`[runner:api] ReleaseSession -> ${post.status} released=${c}`), { released: c });
    },
    async deregisterRunner(t, i = {}) {
      n(
        `[runner:api] POST /v1/code/runners/self-hosted/deregister reason=${i.reason ?? ""}` +
          (i.drain_hold
            ? ` drain_hold=${i.drain_hold.outcome} held_ms=${i.drain_hold.held_ms} busy_at_release=${i.drain_hold.busy_session_ids_at_release.length}`
            : ""),
      );
      let post = await Dt.post(
        `${e.baseUrl}/v1/code/runners/self-hosted/deregister`,
        { ...(i.reason && { reason: i.reason }), ...(i.drain_hold && { drain_hold: i.drain_hold }) },
        { headers: getOAuthHeaders_3(t), timeout: 1e4, validateStatus: (c) => c < 500 },
      );
      (formatRunnerApiError(post.status, post.data, "DeregisterRunner"),
        n(`[runner:api] DeregisterRunner -> ${post.status}`));
    },
    async refreshToken(t) {
      n("[runner:api] POST /v1/code/auth/refresh");
      let post = await Dt.post(
        `${e.baseUrl}/v1/code/auth/refresh`,
        {},
        { headers: getOAuthHeaders_3(t), timeout: 15000, validateStatus: (s) => s < 500 },
      );
      if (
        (formatRunnerApiError(
          post.status,
          post.data,
          "RefreshToken",
          post.status === 403 && readRequestIdSource((s) => post.headers[s]) === "nonorigin_other",
        ),
        !post.data.token)
      )
        throw Error("RefreshToken: response missing token");
      return (n(`[runner:api] RefreshToken -> ${post.status}`), post.data);
    },
    async getSessionRemoteConfig(t, i, s, c) {
      (validateRunnerLabel(t, "sessionId"), n(`[runner:api] GET /v1/code/sessions/${t}/remote`));
      let l = await Dt.get(`${e.baseUrl}/v1/code/sessions/${t}/remote`, {
        headers: { ...c?.headers, ...getOAuthHeaders_2(i), "User-Agent": claudeCodeUserAgent(), ...a },
        timeout: c?.timeoutMs ?? 15000,
        signal: s,
        validateStatus: (w) => w < 500,
        ...(c?.beforeParsing && {
          maxContentLength: c.beforeParsing.mostBytes,
          responseType: "text",
          transformResponse: (w, S, T) => {
            if (T !== void 0 && T >= 200 && T < 300) c.beforeParsing?.admit(w);
            else if (w.length > wn) return w;
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
    async registerWorker(t, i, s, c) {
      (validateRunnerLabel(i, "sessionId"),
        n(`[runner:api] POST ${t}/v1/code/sessions/${i}/worker/register`));
      let post = await Dt.post(
        `${t}/v1/code/sessions/${i}/worker/register`,
        { session_id: i },
        { headers: getOAuthHeaders_2(s), timeout: 30000, signal: c, validateStatus: (w) => w < 500 },
      );
      formatRunnerApiError(post.status, post.data, "RegisterWorker");
      let b = parseInt(String(post.data.worker_epoch), 10);
      if (isNaN(b))
        throw Error(`RegisterWorker: invalid worker_epoch in response: ${post.data.worker_epoch}`);
      return (n(`[runner:api] RegisterWorker -> ${post.status} worker_epoch=${b}`), b);
    },
    async postWorkerEvents(t, i, s, c, l, b) {
      (validateRunnerLabel(i, "sessionId"),
        n(
          `[runner:api] POST ${t}/v1/code/sessions/${i}/worker/events (${l.length} ${plural(l.length, "event")})`,
        ));
      let post = await Dt.post(
        `${t}/v1/code/sessions/${i}/worker/events`,
        { worker_epoch: c, events: l.map((S) => ({ payload: S })) },
        { headers: getOAuthHeaders_2(s), timeout: 15000, signal: b, validateStatus: (S) => S < 500 },
      );
      (formatRunnerApiError(post.status, post.data, "PostWorkerEvents"),
        n(`[runner:api] PostWorkerEvents -> ${post.status}`));
    },
    async updateSessionWorkerState(t, i, s, c, l, b) {
      (validateRunnerLabel(i, "sessionId"), n(`[runner:api] PUT ${t}/v1/code/sessions/${i}/worker`));
      let put = await Dt.put(
        `${t}/v1/code/sessions/${i}/worker`,
        {
          worker_epoch: c,
          ...(typeof l === "string" && { worker_status: l }),
          ...(typeof l === "object" && { connection_status: l.connectionStatus }),
        },
        { headers: getOAuthHeaders_2(s), timeout: 15000, signal: b, validateStatus: (S) => S < 500 },
      );
      (formatRunnerApiError(put.status, put.data, "UpdateSessionWorkerState"),
        n(`[runner:api] UpdateSessionWorkerState -> ${put.status}`));
    },
    async heartbeat(t, i, s, c, l) {
      validateRunnerLabel(i, "sessionId");
      let post = await Dt.post(
        `${t}/v1/code/sessions/${i}/worker/heartbeat`,
        { worker_epoch: c },
        { headers: getOAuthHeaders_2(s), timeout: 1e4, signal: l, validateStatus: (w) => w < 500 },
      );
      formatRunnerApiError(post.status, post.data, "Heartbeat");
    },
    async forwardDiagnostics(t, i, s, c, l) {
      if ((validateRunnerLabel(i, "sessionId"), l.length === 0)) return;
      n(`[runner:api] POST ${t}/v1/code/sessions/${i}/worker/diagnostics (${l.length} lines)`);
      let response = await Dt.post(
        `${t}/v1/code/sessions/${i}/worker/diagnostics`,
        { worker_epoch: c, lines: l },
        { headers: getOAuthHeaders_2(s), timeout: 30000, validateStatus: (w) => w < 500 },
      );
      (formatRunnerApiError(response.status, response.data, "ForwardDiagnostics"),
        n(`[runner:api] ForwardDiagnostics -> ${response.status}`));
    },
  };
}

export {
  createDefaultEnvironment,
  ZV,
  hasValidOAuthToken,
  GithubWebConnectionStatus,
  getCodeWebUrl,
  getGithubAuthSource,
  importGithubToken,
};
