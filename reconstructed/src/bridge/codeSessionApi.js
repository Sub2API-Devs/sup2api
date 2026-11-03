/**
 * bridge/codeSessionApi.ts
 *
 * 已有模块；g2 补充放置一个辅助函数
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/bridge/codeSessionApi.ts
 * pieces: chunk-jt8zq468.js (1), chunk-kgtpkbhq.js (23)
 * attribution: placement 2, fingerprint 1, facade-majority 17, layout 4
 */
import { getClientPlatform, claudeCodeUserAgent } from "../utils/http.js";
import { getCwd } from "../utils/cwd.js";
import { logForDebugging } from "../utils/debug.js";
import { Dt } from "../../vendor/axios/dist/esm/axios.js";
import { errorMessage } from "../utils/errors.js";
import { extractErrorDetail, extractPlainErrorDetail } from "./debugUtils.js";
import { lacksAuthorizationHeader } from "../services/oauth/sessionsBearerHooks.js";
import { isUsableCreatedSessionId, validateBridgeId } from "./sessionIdCompat.js";
import { jsonStringify } from "../utils/slowOperations.js";
import { printableName } from "../utils/printableName.js";
import { toSafeInteger, extractMcpConfigContent } from "./_new/extractMcpConfigContent.js";
import { readRequestIdSource } from "../services/api/requestIdSource.js";
import { buildSessionEndpoint } from "../assistant/sessionHistory.js";
import { postSessionAction } from "./remoteBridgeCore.js";

//@ chunk-kgtpkbhq.js:605-624 fingerprint = ANTHROPIC_VERSION (1)
var ANTHROPIC_VERSION = "2023-06-01";
/**
 * code sessions API 请求头：Bearer、JSON、anthropic-version、client-platform、User-Agent。
 */
//@ chunk-kgtpkbhq.js:624-783 facade-majority = oauthHeaders (0.762)
function oauthHeaders(accessToken) {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "anthropic-version": ANTHROPIC_VERSION,
    "anthropic-client-platform": getClientPlatform(),
    "User-Agent": claudeCodeUserAgent(),
  };
}
/**
 * 错误结果是否为终止性（terminal===true）。
 */
//@ chunk-kgtpkbhq.js:783-869 facade-majority
function isCreateSessionFailure(e) {
  return e !== null && typeof e === "object" && "terminal" in e && e.terminal === !0;
}
/**
 * 创建失败是否是 Project（session_grouping）不可用。
 */
//@ chunk-kgtpkbhq.js:869-1213 layout
function isGroupingRejection(body) {
  if (
    body === null ||
    typeof body !== "object" ||
    !("error" in body) ||
    body.error === null ||
    typeof body.error !== "object"
  )
    return !1;
  let error = body.error,
    r = "type" in error ? error.type : void 0,
    f = "resource_type" in error ? error.resource_type : void 0,
    o = "reason" in error ? error.reason : void 0;
  return (
    (r === "not_found_error" && f === "session_grouping") ||
    o === "public_grouping_hosted_only" ||
    o === "feature_disabled"
  );
}
/**
 * HTTP 状态分类：401 oauth_rejected；408/429/5xx transient；其余 rejected。
 */
//@ chunk-kgtpkbhq.js:1213-1324 layout
function classifyHttpStatus(status) {
  if (status === 401) return "oauth_rejected";
  if (status === 408 || status === 429 || status >= 500) return "transient";
  return "rejected";
}
/**
 * 创建 Code Session：POST {base}/v1/code/sessions，body {title, bridge:{}, tags?, session_grouping_id?, config:{cwd, model?, sources?, outcomes?}}；成功返回 cse_* 会话 ID，失败返回 {terminal, reason}，瞬时失败返回 null。
 */
//@ chunk-kgtpkbhq.js:1324-3006 facade-majority = createCodeSession (0.441)
async function createCodeSession(
  baseUrl,
  accessToken,
  title,
  timeoutMs,
  tags,
  gitContext,
  cwd,
  model,
  groupingId,
  warnState,
  onAuth401,
) {
  let url = `${baseUrl}/v1/code/sessions`,
    sessionConfig = { cwd: cwd ?? getCwd(), ...(model && { model: model }) };
  if (gitContext && "gitRepoUrl" in gitContext) {
    let { buildGitSessionContext: buildGitSessionContext } = await import("./chunk-wx4f8343.js"),
      {
        sources: sources,
        outcomes: outcomes,
        report: report,
      } = await buildGitSessionContext(gitContext.gitRepoUrl, gitContext.branch, gitContext.defaultBranch);
    if (report.branchDropped && report.warnMessage) {
      let j = `${report.branchDropped}:${gitContext.gitRepoUrl}:${gitContext.branch}`;
      if (!warnState || warnState.lastKey !== j) {
        if (warnState) warnState.lastKey = j;
        logForDebugging(`[code-session] ${report.warnMessage}`);
      }
    } else if (warnState) warnState.lastKey = null;
    if (sources.length > 0 || outcomes.length > 0)
      ((sessionConfig.sources = sources),
        (sessionConfig.outcomes = outcomes),
        (sessionConfig.reuse_outcome_branches = !0));
  }
  let response;
  try {
    response = await Dt.post(
      url,
      {
        title: title,
        bridge: {},
        ...(tags?.length && { tags: tags }),
        ...(groupingId && { session_grouping_id: groupingId }),
        config: sessionConfig,
      },
      { headers: oauthHeaders(accessToken), timeout: timeoutMs, validateStatus: (h) => h < 500 },
    );
  } catch (err) {
    return (logForDebugging(`[code-session] Session create request failed: ${errorMessage(err)}`), null);
  }
  if (response.status !== 200 && response.status !== 201) {
    let detail = extractErrorDetail(response.data);
    logForDebugging(`[code-session] Session create failed ${response.status}${detail ? `: ${detail}` : ""}`);
    let y = extractPlainErrorDetail(response.data);
    if (response.status === 401) {
      if (lacksAuthorizationHeader(response.config)) return null;
      onAuth401?.();
    }
    if (response.status >= 400 && response.status < 500 && isGroupingRejection(response.data))
      return { terminal: !0, reason: "grouping_rejected", status: response.status, detail: y };
    switch (classifyHttpStatus(response.status)) {
      case "oauth_rejected":
        return { terminal: !1, reason: "oauth_rejected" };
      case "transient":
        return null;
      case "rejected":
        return { terminal: !0, reason: "request_rejected", status: response.status, detail: y };
    }
  }
  let data = response.data;
  if (
    !data ||
    typeof data !== "object" ||
    !("session" in data) ||
    !data.session ||
    typeof data.session !== "object" ||
    !("id" in data.session) ||
    typeof data.session.id !== "string" ||
    !data.session.id.startsWith("cse_") ||
    !isUsableCreatedSessionId(data.session.id)
  )
    return (
      logForDebugging(
        `[code-session] No usable session.id (cse_*) in response: ${jsonStringify(data).slice(0, 200)}`,
      ),
      { terminal: !0, reason: "malformed_response", status: response.status, detail: void 0 }
    );
  return data.session.id;
}
/**
 * 结果是否为终止性。
 */
//@ chunk-kgtpkbhq.js:3006-3071 facade-majority
function isCredentialsFailure(e) {
  return e !== null && "terminal" in e && e.terminal === !0;
}
/**
 * 结果是否为非终止的 OAuth 拒绝（terminal===false）。
 */
//@ chunk-kgtpkbhq.js:3071-3156 facade-majority
function isCredentialsRejection(e) {
  return typeof e === "object" && e !== null && "terminal" in e && e.terminal === !1;
}
/**
 * 403 响应体里的 resource：untrusted_device 或 session_stale_relogin。
 */
//@ chunk-kgtpkbhq.js:3156-3302 facade-majority
function classifyElevatedAuthError(body) {
  let n = getErrorObject(body);
  if (n !== void 0 && "resource" in n) {
    let resource = n.resource;
    if (resource === "untrusted_device" || resource === "session_stale_relogin") return resource;
  }
  return;
}
//@ chunk-kgtpkbhq.js:3302-3475 facade-majority
function classifyElevatedAuthSubReason(e) {
  let n = getErrorObject(e);
  return n !== void 0 &&
    "resource" in n &&
    n.resource === "untrusted_device" &&
    "sub_reason" in n &&
    n.sub_reason === "bound_unattested"
    ? "bound_unattested"
    : void 0;
}
/**
 * 分类 untrusted_device 拒绝的 sub_reason：缺省/bound_unattested → token_refused；served_call_unsigned → signature_wanted；其它 → unrecognized。
 */
//@ chunk-kgtpkbhq.js:3475-4179 facade-majority
function readUntrustedDeviceRefusal(body) {
  if (classifyElevatedAuthError(body) === "untrusted_device") {
    let n = getErrorObject(body),
      r = n !== void 0 && "sub_reason" in n ? n.sub_reason : void 0;
    if (r === void 0 || r === null || r === "") return { kind: "token_refused" };
    if (typeof r !== "string") return { kind: "unrecognized", subReason: `(${typeof r}, not a string)` };
    switch (r) {
      case "bound_unattested":
        return { kind: "token_refused" };
      case "served_call_unsigned":
        return { kind: "signature_wanted", subReason: r };
      default:
        if (xme(r)) return { kind: "unrecognized", subReason: r };
        return (
          logForDebugging(
            `[code-session] a 403's sub_reason is too long or not snake_case, so a placeholder is passed on. As sent (${r.length} characters; cleaned, first 64): ${printableName(r, 64)}`,
          ),
          { kind: "unrecognized", subReason: "(string, too long or not snake_case)" }
        );
    }
  }
  return;
}
/**
 * 拒绝类型是否为 token_refused。
 */
//@ chunk-kgtpkbhq.js:4179-4227 facade-majority
function shouldCloudSessionEnroll(e) {
  return e.kind === "token_refused";
}
/**
 * 拒绝类型是否不是 signature_wanted（可以走注册设备流程）。
 */
//@ chunk-kgtpkbhq.js:4227-4278 facade-majority
function shouldRemoteControlEnroll(e) {
  return e.kind !== "signature_wanted";
}
/**
 * 固定的拒绝描述：{kind: signature_wanted, subReason: served_call_unsigned}。
 */
//@ chunk-kgtpkbhq.js:4278-4345 facade-majority
var REFUSAL_BEHIND_NO_ENROLL = { kind: "signature_wanted", subReason: "served_call_unsigned" };
/**
 * 从错误响应中取 reason / resource / sub_reason。
 */
//@ chunk-kgtpkbhq.js:4345-4482 facade-majority
function refusalCodes(e) {
  let n = getErrorObject(e);
  if (n === void 0) return;
  let r = { ...n };
  return {
    reason: sanitizeSnakeField(r.reason),
    resource: sanitizeSnakeField(r.resource),
    subReason: sanitizeSnakeField(r.sub_reason),
  };
}
//@ chunk-kgtpkbhq.js:4482-4581 layout
function sanitizeSnakeField(e) {
  if (e === void 0 || e === null || e === "") return "";
  return typeof e === "string" && xme(e) ? e : void 0;
}
//@ chunk-kgtpkbhq.js:4581-4703 layout
function getErrorObject(body) {
  return body !== null &&
    typeof body === "object" &&
    "error" in body &&
    body.error !== null &&
    typeof body.error === "object"
    ? body.error
    : void 0;
}
/**
 * 取桥凭证：POST {base}/v1/code/sessions/{id}/bridge（可带 X-Trusted-Device-Token、expected_epoch）；200 返回 {worker_jwt, api_base_url, expires_in, worker_epoch, mcp_config}；409 报告 epoch 冲突；403 区分 untrusted_device/session_stale_relogin/非源站拒绝。
 */
//@ chunk-kgtpkbhq.js:4703-6643 facade-majority = fetchRemoteCredentials (0.686)
async function attachBridgeWorker(
  sessionId,
  baseUrl,
  accessToken,
  timeoutMs,
  deviceToken,
  onAuth401,
  epochGuard,
) {
  if (!isValidSessionId(sessionId, "/bridge")) return { terminal: !0, reason: "invalid_session_id" };
  let url = `${baseUrl}/v1/code/sessions/${sessionId}/bridge`,
    headers = oauthHeaders(accessToken);
  if (deviceToken) headers["X-Trusted-Device-Token"] = deviceToken;
  let s;
  try {
    s = await Dt.post(url, epochGuard === void 0 ? {} : { expected_epoch: epochGuard.expectedEpoch }, {
      headers: headers,
      timeout: timeoutMs,
      validateStatus: (i) => i < 500,
    });
  } catch (err) {
    return (logForDebugging(`[code-session] /bridge request failed: ${errorMessage(err)}`), null);
  }
  if (s.status !== 200) {
    let detail = extractErrorDetail(s.data);
    if (
      (logForDebugging(`[code-session] /bridge failed ${s.status}${detail ? `: ${detail}` : ""}`),
      s.status === 401)
    ) {
      if (lacksAuthorizationHeader(s.config)) return null;
      onAuth401?.();
    }
    if (epochGuard !== void 0 && s.status === 409) {
      let l = getErrorObject(s.data),
        expectedEpoch = epochGuard.expectedEpoch,
        y = [
          toSafeInteger(l !== void 0 && "expected_epoch" in l ? l.expected_epoch : void 0),
          toSafeInteger(l !== void 0 && "actual_epoch" in l ? l.actual_epoch : void 0),
        ];
      epochGuard.onRefused(
        y.includes(expectedEpoch) ? y.find((v) => v !== void 0 && v > expectedEpoch) : void 0,
      );
    }
    let a;
    if (s.status === 403) {
      let l = classifyElevatedAuthError(s.data);
      if (l === "untrusted_device") {
        let h = readUntrustedDeviceRefusal(s.data);
        return { terminal: !0, reason: l, ...(h && { refusal: h }) };
      }
      if (l) return { terminal: !0, reason: l };
      ((a = readRequestIdSource((h) => s.headers?.[h])),
        logForDebugging(`[code-session] /bridge 403 source=${a}`));
    }
    switch (classifyHttpStatus(s.status)) {
      case "oauth_rejected":
        return { terminal: !1, reason: "oauth_rejected" };
      case "transient":
        return null;
      case "rejected":
        return { terminal: !0, reason: "request_rejected", status: s.status, ...(a && { source: a }) };
    }
  }
  let data = s.data;
  if (
    data === null ||
    typeof data !== "object" ||
    !("worker_jwt" in data) ||
    typeof data.worker_jwt !== "string" ||
    !("expires_in" in data) ||
    typeof data.expires_in !== "number" ||
    !("api_base_url" in data) ||
    typeof data.api_base_url !== "string" ||
    !("worker_epoch" in data)
  )
    return (
      logForDebugging(
        `[code-session] /bridge response malformed (need worker_jwt, expires_in, api_base_url, worker_epoch): ${jsonStringify(data).slice(0, 200)}`,
      ),
      { terminal: !0, reason: "malformed_response", status: 200 }
    );
  let c = toSafeInteger(data.worker_epoch);
  if (c === void 0)
    return (
      logForDebugging(`[code-session] /bridge worker_epoch invalid: ${jsonStringify(data.worker_epoch)}`),
      { terminal: !0, reason: "malformed_response", status: 200 }
    );
  return {
    worker_jwt: data.worker_jwt,
    api_base_url: data.api_base_url,
    expires_in: data.expires_in,
    worker_epoch: c,
    mcp_config: extractMcpConfigContent(data),
    ...{},
  };
}
//@ chunk-kgtpkbhq.js:6643-6745 placement
function isValidSessionId(e, n) {
  try {
    return (validateBridgeId(e, "sessionId"), !0);
  } catch (error) {
    return (logForDebugging(`[code-session] ${n}: ${errorMessage(error)}`), !1);
  }
}
//@ chunk-kgtpkbhq.js:7196-8005 facade-majority
async function getCodeSession(e, n, r, f, o) {
  if (!isValidSessionId(r, "Get")) return "invalid";
  let p = buildSessionEndpoint("Get", e, n, r, o);
  if (!p) return "invalid";
  let { url: url, headers: headers, id: id } = p;
  try {
    let s = await Dt.get(url, { headers: headers, timeout: f, validateStatus: (i) => i < 500 });
    if (s.status !== 200) {
      let i = extractErrorDetail(s.data);
      return (logForDebugging(`[code-session] Get ${id} failed ${s.status}${i ? `: ${i}` : ""}`), s.status);
    }
    if (!o.useV2) {
      let i = s.data;
      return { ...i, status: i?.status ?? i?.session_status, id: typeof i?.id === "string" ? i.id : id };
    }
    let u = s.data,
      c = u?.response_shape ?? u?.session;
    if (c && typeof c.id === "string")
      return {
        ...c,
        updated_at: "last_event_at" in c && typeof c.last_event_at === "string" ? c.last_event_at : void 0,
      };
    return (logForDebugging(`[code-session] Get ${id}: no session.id in 200 response`), s.status);
  } catch (error) {
    return (
      logForDebugging(`[code-session] Get ${id} failed: ${errorMessage(error)}`),
      Dt.isAxiosError(error) && error.code === "ECONNABORTED" ? "timeout" : "error"
    );
  }
}
//@ chunk-kgtpkbhq.js:8005-8499 facade-majority
async function updateCodeSession(e, n, r, f, o, p) {
  if (!isValidSessionId(r, "Update")) return "invalid";
  let m = buildSessionEndpoint("Update", e, n, r, p);
  if (!m) return "invalid";
  let { url: url, headers: headers, id: id } = m,
    u = { headers: headers, timeout: o, validateStatus: () => !0 };
  try {
    let c = p.useV2 ? await Dt.put(url, f, u) : await Dt.patch(url, f, u);
    if (c.status !== 200) {
      let i = extractErrorDetail(c.data);
      logForDebugging(`[code-session] Update ${id} failed ${c.status}${i ? `: ${i}` : ""}`);
    }
    return c.status;
  } catch (error) {
    return (
      logForDebugging(`[code-session] Update ${id} failed: ${errorMessage(error)}`),
      Dt.isAxiosError(error) && error.code === "ECONNABORTED" ? "timeout" : "error"
    );
  }
}
//@ chunk-kgtpkbhq.js:8499-8589 facade-majority
async function archiveCodeSession(e, n, r, f, o) {
  return postSessionAction("Archive", "/archive", e, n, r, f, o, "untrusted_device");
}
/**
 * 解除会话归档（POST …/unarchive，403 时区分 untrusted_device / session_stale_relogin）。
 */
//@ chunk-kgtpkbhq.js:8589-8680 facade-majority
async function unarchiveCodeSession(e, n, r, f, o) {
  return postSessionAction("Unarchive", "/unarchive", e, n, r, f, o, "elevated_auth");
}
//@ chunk-jt8zq468.js:191-263 placement
function xme(n) {
  return typeof n === "string" && /^[a-z0-9_]{1,64}$/.test(n);
}

export {
  shouldCloudSessionEnroll,
  readUntrustedDeviceRefusal,
  classifyElevatedAuthError,
  oauthHeaders,
  xme,
  createCodeSession,
  isCreateSessionFailure,
  isCredentialsRejection,
  isCredentialsFailure,
  attachBridgeWorker,
  shouldRemoteControlEnroll,
  isValidSessionId,
  archiveCodeSession,
  unarchiveCodeSession,
  REFUSAL_BEHIND_NO_ENROLL,
  refusalCodes,
};
