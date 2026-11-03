/**
 * cli/remoteIO/workerAuth.ts
 *
 * 2.1.316 新增。云 worker 的 CCR 认证刷新与会话认证头等待。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-z4g2ta8k.js (20)
 * attribution: placement 20
 */
import { xWs } from "./fileStoreVerdicts.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { isSettingsToCloudEnabled } from "../../services/analytics/violinGates.js";
import { $vt } from "../../tasks/LocalShellTask/backgroundNotices.js";
import {
  getRootSession,
  getSessionIngressToken,
  getOauthTokenFromFd,
  setSessionIngressToken,
  setOauthTokenFromFd,
} from "../../bootstrap/state.js";
import { CCR_SESSION_INGRESS_TOKEN_PATH, CCR_OAUTH_TOKEN_PATH, z1e } from "../../utils/authFileDescriptor.js";
import { readSmallFileOrNull } from "../../utils/readSmallFile.js";
import { logForDebugging } from "../../utils/debug.js";
import { env } from "../../utils/env.js";
import { decodeJwtExpiry } from "../../bridge/jwtUtils.js";
import { getSessionIngressAuthToken_2 } from "../../utils/sessionIngressAuth.js";
import { clearOAuthTokenCache } from "../../utils/auth.js";
import { resetFullCheckMark } from "../../services/api/clientHelpers.js";
import { wEo } from "../transports/sessionIngressToken.js";
import { sleep } from "../../utils/sleep.js";
import {
  TOOL_CALL_SESSION_ENDED,
  TOOL_RESULT_NOT_IN_COPY,
  APPROVAL_EXPIRED_MESSAGE,
  APPROVAL_UNANSWERED_MESSAGE,
  isSyntheticApiErrorMessage,
} from "../../utils/messages.js";

//@ chunk-z4g2ta8k.js:42671-42747 placement
var WNt = new Set(["remote", "remote_projects", "remote_desktop", "sdk-cli", ""]);
/**
 * 判断 worker 是否启动 git 凭据引擎：入口不在允许集合时拒绝，否则按 git 开关启用。
 */
//@ chunk-z4g2ta8k.js:42747-42898 placement
function gitCredentialEngineAdmission(e) {
  if (e.entrypoint !== void 0 && !WNt.has(e.entrypoint)) return { start: !1, reason: "entrypoint" };
  return { start: !0, engines: { git: e.gitSwitch, ...{} } };
}
//@ chunk-z4g2ta8k.js:42898-42909 placement
var rs = WNt;
/**
 * 判断托管云 worker 是否启用某项认证能力：需要 sdkUrl 与远程会话、入口在允许集合内、未禁用、非密闭环境。
 */
//@ chunk-z4g2ta8k.js:42909-43252 placement
function ccrAuthRefreshAdmission(e) {
  if (!e.sdkUrl || !e.remoteSessionId || e.environmentKind !== void 0)
    return { admitted: !1, reason: "not_managed_cloud_worker" };
  if (e.entrypoint !== void 0 && !rs.has(e.entrypoint)) return { admitted: !1, reason: "entrypoint" };
  if (e.disabled) return { admitted: !1, reason: "disabled" };
  if (e.hermetic) return { admitted: !1, reason: "hermetic" };
  return { admitted: !0 };
}
/**
 * 与 jPr 同形的准入判断，只是入口白名单不同（WNt）。
 */
//@ chunk-z4g2ta8k.js:43252-43596 placement
function sessionAuthAdmission(e) {
  if (!e.sdkUrl || !e.remoteSessionId || e.environmentKind !== void 0)
    return { admitted: !1, reason: "not_managed_cloud_worker" };
  if (e.entrypoint !== void 0 && !WNt.has(e.entrypoint)) return { admitted: !1, reason: "entrypoint" };
  if (e.disabled) return { admitted: !1, reason: "disabled" };
  if (e.hermetic) return { admitted: !1, reason: "hermetic" };
  return { admitted: !0 };
}
/**
 * 下发文件存储写入裁决并记诊断：监听器抛错时记 file_store_verdict_listener_threw，乱序时记 file_store_verdict_out_of_order。
 */
//@ chunk-z4g2ta8k.js:43596-44019 placement
function reportFileStoreVerdict(e) {
  let n = xWs(e, (r) => {
    logForDiagnosticsNoPII("error", "file_store_verdict_listener_threw", {
      verdict: e,
      rejected: !0,
      first: r,
    });
  });
  switch (n.kind) {
    case "delivered":
      if (n.threw.length > 0)
        logForDiagnosticsNoPII("error", "file_store_verdict_listener_threw", {
          verdict: e,
          listeners: n.listeners,
          threw: n.threw.length,
          first: n.threw[0],
        });
      return;
    case "out_of_order":
      logForDiagnosticsNoPII("error", "file_store_verdict_out_of_order", { verdict: e, basis: n.basis });
      return;
    case "repeat":
    case "queued":
      return;
  }
}
//@ chunk-z4g2ta8k.js:44019-44043 placement
function GPr() {
  return !1;
}
//@ chunk-z4g2ta8k.js:44043-44089 placement
async function K1n() {
  return GPr() || (await isSettingsToCloudEnabled());
}
//@ chunk-z4g2ta8k.js:44089-44188 placement
async function YDs(e) {
  if (!GPr()) return isSettingsToCloudEnabled();
  return e && (await isSettingsToCloudEnabled().catch(() => !1)) ? !0 : "announced_only";
}
//@ chunk-z4g2ta8k.js:44188-44264 placement
async function XDs() {
  let e = await K1n();
  if (e) $vt.of(getRootSession()).openGate();
  return e;
}
//@ chunk-z4g2ta8k.js:44264-44319 placement
var Pn = { sessionIngressTokenPath: CCR_SESSION_INGRESS_TOKEN_PATH, oauthTokenPath: CCR_OAUTH_TOKEN_PATH };
/**
 * 并行读取会话入口令牌文件与 OAuth 令牌文件；任一缺失或为空时告警并返回 null，保持当前凭证。
 */
//@ chunk-z4g2ta8k.js:44319-44637 placement
async function readCcrTokenFiles(e = Pn) {
  let [n, r] = await Promise.all([
      readSmallFileOrNull(e.sessionIngressTokenPath, z1e),
      readSmallFileOrNull(e.oauthTokenPath, z1e),
    ]),
    s = n?.trim() ?? "",
    h = r?.trim() ?? "";
  if (!s || !h)
    return (
      logForDebugging(
        "CCR auth refresh: token-file pair unreadable or incomplete, keeping current credentials",
        { level: "warn" },
      ),
      null
    );
  return { sessionIngressToken: s, oauthToken: h };
}
//@ chunk-z4g2ta8k.js:44637-44697 placement
var is = 300,
  as = /^ANTHROPIC_SECRET_PLACEHOLDER_[0-9a-f]{32}$/;
//@ chunk-z4g2ta8k.js:44697-44730 placement
function In(e) {
  return as.test(e);
}
//@ chunk-z4g2ta8k.js:44730-44754 placement
var Fn = /^[\w.~+/-]+=*$/;
//@ chunk-z4g2ta8k.js:44754-46879 placement
async function refreshCcrAuthFromFiles(e, n = Pn) {
  if (!env.CLAUDE_CODE_REMOTE) return { adopted: !1, reason: "not_remote" };
  if (typeof e !== "number" || !Number.isFinite(e) || e <= 0)
    return { adopted: !1, reason: "no_advertised_ttl" };
  let r = await readCcrTokenFiles(n);
  if (!r) return { adopted: !1, reason: "read_failed" };
  if (!Fn.test(r.oauthToken))
    return (
      logForDebugging(
        "CCR auth refresh: delivered OAuth token is not a well-formed bearer token, keeping current credentials",
        { level: "warn" },
      ),
      { adopted: !1, reason: "oauth_malformed" }
    );
  let s = env.CLAUDE_CODE_SESSION_ACCESS_TOKEN || getSessionIngressToken(),
    h = Fn.test(r.sessionIngressToken) ? decodeJwtExpiry(r.sessionIngressToken) : null,
    y;
  if (h !== null) {
    if (s === r.sessionIngressToken) return { adopted: !1, reason: "unchanged" };
    let S = Date.now() / 1000 + e;
    if (Math.abs(h - S) > is)
      return (
        logForDebugging(
          "CCR auth refresh: delivered token expiry does not match the advertised lifetime, keeping current credentials",
          { level: "warn" },
        ),
        { adopted: !1, reason: "exp_mismatch" }
      );
    let k = s ? decodeJwtExpiry(s) : null;
    if (k !== null && h <= k)
      return (
        logForDebugging(
          "CCR auth refresh: delivered token does not extend expiry, keeping current credentials",
          { level: "warn" },
        ),
        { adopted: !1, reason: "not_newer" }
      );
    y = "jwt";
  } else if (!In(r.sessionIngressToken))
    return (
      logForDebugging(
        "CCR auth refresh: delivered session token is neither a well-formed decodable JWT nor a gateway placeholder, keeping current credentials",
        { level: "warn" },
      ),
      { adopted: !1, reason: "not_a_jwt" }
    );
  else if (s === r.sessionIngressToken) {
    if (r.oauthToken === (env.CLAUDE_CODE_OAUTH_TOKEN || getOauthTokenFromFd()))
      return { adopted: !1, reason: "unchanged" };
    y = "placeholder_unchanged";
  } else if (s && decodeJwtExpiry(s) !== null) y = "placeholder_sealed";
  else
    return (
      logForDebugging(
        "CCR auth refresh: delivered gateway placeholder is neither the session token held in process nor replacing a decodable JWT, keeping current credentials",
        { level: "warn" },
      ),
      { adopted: !1, reason: s && In(s) ? "placeholder_mismatch" : "placeholder_current_unknown" }
    );
  if (y !== "placeholder_unchanged") {
    if (env.CLAUDE_CODE_SESSION_ACCESS_TOKEN) getSessionIngressAuthToken_2(r.sessionIngressToken);
    setSessionIngressToken(r.sessionIngressToken);
  }
  if ((setOauthTokenFromFd(r.oauthToken), env.CLAUDE_CODE_OAUTH_TOKEN))
    env.set("CLAUDE_CODE_OAUTH_TOKEN", r.oauthToken);
  return (
    clearOAuthTokenCache(),
    resetFullCheckMark(),
    logForDiagnosticsNoPII("info", "cli_worker_auth_refresh_adopted", {
      session_token: y,
      seconds_until_expiry: h === null ? void 0 : Math.max(0, Math.floor(h - Date.now() / 1000)),
    }),
    { adopted: !0 }
  );
}
//@ chunk-z4g2ta8k.js:46879-46920 placement
function Mn(e) {
  return e === null ? refreshCcrAuthFromFiles : void 0;
}
//@ chunk-z4g2ta8k.js:46920-47794 placement
async function waitForSessionAuthHeaders({
  getAuthHeaders: getAuthHeaders,
  rereadMiss: rereadMiss,
  onDiagnostic: onDiagnostic,
  delaysMs: delaysMs = wEo,
}) {
  if (Object.keys(getAuthHeaders()).length > 0) return !0;
  onDiagnostic?.(
    `no session auth headers yet, re-reading up to ${delaysMs.length} times`,
    "warn",
    "auth_headers_wait_started",
  );
  let h = {};
  for (let [y, S] of delaysMs.entries()) {
    let k = y + 1;
    if (
      (logForDebugging(
        `[remote-io] no auth headers, re-reading in ${S}ms (attempt ${k}/${delaysMs.length})`,
        { level: "warn" },
      ),
      await sleep(S),
      (h = rereadMiss().diag),
      Object.keys(getAuthHeaders()).length > 0)
    )
      return (
        onDiagnostic?.(`session auth headers present after ${k} re-read(s)`, "info", "auth_headers_arrived"),
        logForDiagnosticsNoPII("info", "cli_worker_lifecycle_init_auth_retried", { attempts: k, ...h }),
        !0
      );
  }
  return (
    logForDebugging(`[remote-io] auth headers still missing after ${delaysMs.length} re-reads`, {
      level: "error",
    }),
    onDiagnostic?.(
      `session auth headers still missing after ${delaysMs.length} re-reads`,
      "warn",
      "auth_headers_never_arrived",
    ),
    logForDiagnosticsNoPII("error", "cli_worker_lifecycle_init_auth_retry_exhausted", {
      attempts: delaysMs.length,
      ...h,
    }),
    !1
  );
}
//@ chunk-z4g2ta8k.js:47794-47893 placement
var us = 15000,
  ls = { maxEvents: 2000, maxBytes: 8388608, maxTimestampChars: 32 },
  cs = new Set([
    TOOL_CALL_SESSION_ENDED,
    TOOL_RESULT_NOT_IN_COPY,
    APPROVAL_EXPIRED_MESSAGE,
    APPROVAL_UNANSWERED_MESSAGE,
  ]);
//@ chunk-z4g2ta8k.js:47893-48124 placement
function isHiddenFromCatchUp(e) {
  return (
    isSyntheticApiErrorMessage(e) ||
    ((e.type === "assistant" || e.type === "user") && (e.isVirtual === !0 || e.handedOff === !0)) ||
    (e.type === "user" &&
      Array.isArray(e.message.content) &&
      e.message.content.every((n) => n.type === "tool_result" && cs.has(n.content)))
  );
}

export {
  gitCredentialEngineAdmission,
  sessionAuthAdmission,
  ccrAuthRefreshAdmission,
  XDs,
  reportFileStoreVerdict,
  GPr,
  YDs,
  K1n,
  WNt,
  isHiddenFromCatchUp,
  us,
  ls,
  waitForSessionAuthHeaders,
  Mn,
};
