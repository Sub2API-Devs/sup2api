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
import { publishFileStoreVerdict } from "./fileStoreVerdicts.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { isSettingsToCloudEnabled } from "../../services/analytics/violinGates.js";
import { backgroundOutputGateSlots } from "../../tasks/LocalShellTask/backgroundNotices.js";
import {
  getRootSession,
  getSessionIngressToken,
  getOauthTokenFromFd,
  setSessionIngressToken,
  setOauthTokenFromFd,
} from "../../bootstrap/state.js";
import {
  CCR_SESSION_INGRESS_TOKEN_PATH,
  CCR_OAUTH_TOKEN_PATH,
  MAX_CREDENTIAL_BYTES,
} from "../../utils/authFileDescriptor.js";
import { readSmallFileOrNull } from "../../utils/readSmallFile.js";
import { logForDebugging } from "../../utils/debug.js";
import { env } from "../../utils/env.js";
import { decodeJwtExpiry } from "../../bridge/jwtUtils.js";
import { getSessionIngressAuthToken_2 } from "../../utils/sessionIngressAuth.js";
import { clearOAuthTokenCache } from "../../utils/auth.js";
import { resetFullCheckMark } from "../../services/api/clientHelpers.js";
import { TOKEN_FILE_READ_BACKOFF_MS } from "../transports/sessionIngressToken.js";
import { sleep } from "../../utils/sleep.js";
import {
  TOOL_CALL_SESSION_ENDED,
  TOOL_RESULT_NOT_IN_COPY,
  APPROVAL_EXPIRED_MESSAGE,
  APPROVAL_UNANSWERED_MESSAGE,
  isSyntheticApiErrorMessage,
} from "../../utils/messages.js";

//@ chunk-z4g2ta8k.js:42671-42747 placement
/**
 * 允许启动 git 凭据引擎的入口点集合（remote / remote_projects / remote_desktop / sdk-cli / 空）。
 */
var GIT_CREDENTIAL_ENTRYPOINTS = new Set(["remote", "remote_projects", "remote_desktop", "sdk-cli", ""]);
//@ chunk-z4g2ta8k.js:42747-42898 placement
/**
 * 判断 worker 是否启动 git 凭据引擎：入口不在允许集合时拒绝，否则按 git 开关启用。
 */
function gitCredentialEngineAdmission(e) {
  if (e.entrypoint !== undefined && !GIT_CREDENTIAL_ENTRYPOINTS.has(e.entrypoint))
    return {
      start: false,
      reason: "entrypoint",
    };
  return {
    start: true,
    engines: {
      git: e.gitSwitch,
      ...{},
    },
  };
}
//@ chunk-z4g2ta8k.js:42898-42909 placement
var GIT_CREDENTIAL_ENTRYPOINTS_ALIAS = GIT_CREDENTIAL_ENTRYPOINTS;
//@ chunk-z4g2ta8k.js:42909-43252 placement
/**
 * 判断托管云 worker 是否启用某项认证能力：需要 sdkUrl 与远程会话、入口在允许集合内、未禁用、非密闭环境。
 */
function ccrAuthRefreshAdmission(e) {
  if (!e.sdkUrl || !e.remoteSessionId || e.environmentKind !== undefined)
    return {
      admitted: false,
      reason: "not_managed_cloud_worker",
    };
  if (e.entrypoint !== undefined && !GIT_CREDENTIAL_ENTRYPOINTS_ALIAS.has(e.entrypoint))
    return {
      admitted: false,
      reason: "entrypoint",
    };
  if (e.disabled)
    return {
      admitted: false,
      reason: "disabled",
    };
  if (e.hermetic)
    return {
      admitted: false,
      reason: "hermetic",
    };
  return {
    admitted: true,
  };
}
//@ chunk-z4g2ta8k.js:43252-43596 placement
/**
 * 与 jPr 同形的准入判断，只是入口白名单不同（WNt）。
 */
function sessionAuthAdmission(e) {
  if (!e.sdkUrl || !e.remoteSessionId || e.environmentKind !== undefined)
    return {
      admitted: false,
      reason: "not_managed_cloud_worker",
    };
  if (e.entrypoint !== undefined && !GIT_CREDENTIAL_ENTRYPOINTS.has(e.entrypoint))
    return {
      admitted: false,
      reason: "entrypoint",
    };
  if (e.disabled)
    return {
      admitted: false,
      reason: "disabled",
    };
  if (e.hermetic)
    return {
      admitted: false,
      reason: "hermetic",
    };
  return {
    admitted: true,
  };
}
//@ chunk-z4g2ta8k.js:43596-44019 placement
/**
 * 下发文件存储写入裁决并记诊断：监听器抛错时记 file_store_verdict_listener_threw，乱序时记 file_store_verdict_out_of_order。
 */
function reportFileStoreVerdict(e) {
  let n = publishFileStoreVerdict(e, (first) => {
    logForDiagnosticsNoPII("error", "file_store_verdict_listener_threw", {
      verdict: e,
      rejected: true,
      first,
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
      logForDiagnosticsNoPII("error", "file_store_verdict_out_of_order", {
        verdict: e,
        basis: n.basis,
      });
      return;
    case "repeat":
    case "queued":
      return;
  }
}
//@ chunk-z4g2ta8k.js:44019-44043 placement
/**
 * 恒返回 false 的构建期开关：设置同步到云没有被强制关闭。
 */
function isSettingsToCloudForcedOff() {
  return false;
}
//@ chunk-z4g2ta8k.js:44043-44089 placement
/**
 * 设置同步到云是否可用（GPr 或 isSettingsToCloudEnabled）。
 */
async function isSettingsToCloudAvailable() {
  return isSettingsToCloudForcedOff() || (await isSettingsToCloudEnabled());
}
//@ chunk-z4g2ta8k.js:44089-44188 placement
/**
 * 设置同步到云的能力：完全可用、仅公告、不可用三态。
 */
async function settingsToCloudCapability(isLaterEpoch) {
  if (!isSettingsToCloudForcedOff()) return isSettingsToCloudEnabled();
  return isLaterEpoch && (await isSettingsToCloudEnabled().catch(() => false)) ? true : "announced_only";
}
//@ chunk-z4g2ta8k.js:44188-44264 placement
/**
 * 可用时打开设置同步闸门并返回是否可用（读取时顺手放行）。
 */
async function openSettingsToCloudGateIfAvailable() {
  let e = await isSettingsToCloudAvailable();
  if (e) backgroundOutputGateSlots.of(getRootSession()).openGate();
  return e;
}
//@ chunk-z4g2ta8k.js:44264-44319 placement
var CCR_TOKEN_FILE_PATHS = {
  sessionIngressTokenPath: CCR_SESSION_INGRESS_TOKEN_PATH,
  oauthTokenPath: CCR_OAUTH_TOKEN_PATH,
};
//@ chunk-z4g2ta8k.js:44319-44637 placement
/**
 * 并行读取会话入口令牌文件与 OAuth 令牌文件；任一缺失或为空时告警并返回 null，保持当前凭证。
 */
async function readCcrTokenFiles(e = CCR_TOKEN_FILE_PATHS) {
  let [smallFileOrNull, smallFileOrNull_2] = await Promise.all([
    readSmallFileOrNull(e.sessionIngressTokenPath, MAX_CREDENTIAL_BYTES),
    readSmallFileOrNull(e.oauthTokenPath, MAX_CREDENTIAL_BYTES),
  ]);
  let s = smallFileOrNull?.trim() ?? "";
  let h = smallFileOrNull_2?.trim() ?? "";
  if (!s || !h) {
    logForDebugging(
      "CCR auth refresh: token-file pair unreadable or incomplete, keeping current credentials",
      {
        level: "warn",
      },
    );
    return null;
  }
  return {
    sessionIngressToken: s,
    oauthToken: h,
  };
}
//@ chunk-z4g2ta8k.js:44637-44697 placement
var CLOCK_SKEW_TOLERANCE_SEC = 300;
var SECRET_PLACEHOLDER_PATTERN = /^ANTHROPIC_SECRET_PLACEHOLDER_[0-9a-f]{32}$/;
//@ chunk-z4g2ta8k.js:44697-44730 placement
function isSecretPlaceholder(e) {
  return SECRET_PLACEHOLDER_PATTERN.test(e);
}
//@ chunk-z4g2ta8k.js:44730-44754 placement
var BEARER_TOKEN_PATTERN = /^[\w.~+/-]+=*$/;
//@ chunk-z4g2ta8k.js:44754-46879 placement
async function refreshCcrAuthFromFiles(e, n = CCR_TOKEN_FILE_PATHS) {
  if (!env.CLAUDE_CODE_REMOTE)
    return {
      adopted: false,
      reason: "not_remote",
    };
  if (typeof e !== "number" || !Number.isFinite(e) || e <= 0)
    return {
      adopted: false,
      reason: "no_advertised_ttl",
    };
  let ccrTokenFiles = await readCcrTokenFiles(n);
  if (!ccrTokenFiles)
    return {
      adopted: false,
      reason: "read_failed",
    };
  if (!BEARER_TOKEN_PATTERN.test(ccrTokenFiles.oauthToken)) {
    logForDebugging(
      "CCR auth refresh: delivered OAuth token is not a well-formed bearer token, keeping current credentials",
      {
        level: "warn",
      },
    );
    return {
      adopted: false,
      reason: "oauth_malformed",
    };
  }
  let s = env.CLAUDE_CODE_SESSION_ACCESS_TOKEN || getSessionIngressToken();
  let h = BEARER_TOKEN_PATTERN.test(ccrTokenFiles.sessionIngressToken)
    ? decodeJwtExpiry(ccrTokenFiles.sessionIngressToken)
    : null;
  let y;
  if (h !== null) {
    if (s === ccrTokenFiles.sessionIngressToken)
      return {
        adopted: false,
        reason: "unchanged",
      };
    let S = Date.now() / 1000 + e;
    if (Math.abs(h - S) > CLOCK_SKEW_TOLERANCE_SEC) {
      logForDebugging(
        "CCR auth refresh: delivered token expiry does not match the advertised lifetime, keeping current credentials",
        {
          level: "warn",
        },
      );
      return {
        adopted: false,
        reason: "exp_mismatch",
      };
    }
    let k = s ? decodeJwtExpiry(s) : null;
    if (k !== null && h <= k) {
      logForDebugging(
        "CCR auth refresh: delivered token does not extend expiry, keeping current credentials",
        {
          level: "warn",
        },
      );
      return {
        adopted: false,
        reason: "not_newer",
      };
    }
    y = "jwt";
  } else if (!isSecretPlaceholder(ccrTokenFiles.sessionIngressToken)) {
    logForDebugging(
      "CCR auth refresh: delivered session token is neither a well-formed decodable JWT nor a gateway placeholder, keeping current credentials",
      {
        level: "warn",
      },
    );
    return {
      adopted: false,
      reason: "not_a_jwt",
    };
  } else if (s === ccrTokenFiles.sessionIngressToken) {
    if (ccrTokenFiles.oauthToken === (env.CLAUDE_CODE_OAUTH_TOKEN || getOauthTokenFromFd()))
      return {
        adopted: false,
        reason: "unchanged",
      };
    y = "placeholder_unchanged";
  } else if (s && decodeJwtExpiry(s) !== null) y = "placeholder_sealed";
  else {
    logForDebugging(
      "CCR auth refresh: delivered gateway placeholder is neither the session token held in process nor replacing a decodable JWT, keeping current credentials",
      {
        level: "warn",
      },
    );
    return {
      adopted: false,
      reason: s && isSecretPlaceholder(s) ? "placeholder_mismatch" : "placeholder_current_unknown",
    };
  }
  if (y !== "placeholder_unchanged") {
    if (env.CLAUDE_CODE_SESSION_ACCESS_TOKEN) getSessionIngressAuthToken_2(ccrTokenFiles.sessionIngressToken);
    setSessionIngressToken(ccrTokenFiles.sessionIngressToken);
  }
  setOauthTokenFromFd(ccrTokenFiles.oauthToken);
  if (env.CLAUDE_CODE_OAUTH_TOKEN) env.set("CLAUDE_CODE_OAUTH_TOKEN", ccrTokenFiles.oauthToken);
  clearOAuthTokenCache();
  resetFullCheckMark();
  logForDiagnosticsNoPII("info", "cli_worker_auth_refresh_adopted", {
    session_token: y,
    seconds_until_expiry: h === null ? undefined : Math.max(0, Math.floor(h - Date.now() / 1000)),
  });
  return {
    adopted: true,
  };
}
//@ chunk-z4g2ta8k.js:46879-46920 placement
function ccrAuthRefresherFor(e) {
  return e === null ? refreshCcrAuthFromFiles : undefined;
}
//@ chunk-z4g2ta8k.js:46920-47794 placement
async function waitForSessionAuthHeaders({
  getAuthHeaders,
  rereadMiss,
  onDiagnostic,
  delaysMs = TOKEN_FILE_READ_BACKOFF_MS,
}) {
  if (Object.keys(getAuthHeaders()).length > 0) return true;
  onDiagnostic?.(
    `no session auth headers yet, re-reading up to ${delaysMs.length} times`,
    "warn",
    "auth_headers_wait_started",
  );
  let h = {};
  for (let [y, S] of delaysMs.entries()) {
    let k = y + 1;
    logForDebugging(`[remote-io] no auth headers, re-reading in ${S}ms (attempt ${k}/${delaysMs.length})`, {
      level: "warn",
    });
    await sleep(S);
    h = rereadMiss().diag;
    if (Object.keys(getAuthHeaders()).length > 0) {
      onDiagnostic?.(`session auth headers present after ${k} re-read(s)`, "info", "auth_headers_arrived");
      logForDiagnosticsNoPII("info", "cli_worker_lifecycle_init_auth_retried", {
        attempts: k,
        ...h,
      });
      return true;
    }
  }
  logForDebugging(`[remote-io] auth headers still missing after ${delaysMs.length} re-reads`, {
    level: "error",
  });
  onDiagnostic?.(
    `session auth headers still missing after ${delaysMs.length} re-reads`,
    "warn",
    "auth_headers_never_arrived",
  );
  logForDiagnosticsNoPII("error", "cli_worker_lifecycle_init_auth_retry_exhausted", {
    attempts: delaysMs.length,
    ...h,
  });
  return false;
}
//@ chunk-z4g2ta8k.js:47794-47893 placement
var AUTH_REFRESH_DEBOUNCE_MS = 15000;
var TRANSCRIPT_COPY_LIMITS = {
  maxEvents: 2000,
  maxBytes: 8388608,
  maxTimestampChars: 32,
};
var SYNTHETIC_TOOL_RESULT_TEXTS = new Set([
  TOOL_CALL_SESSION_ENDED,
  TOOL_RESULT_NOT_IN_COPY,
  APPROVAL_EXPIRED_MESSAGE,
  APPROVAL_UNANSWERED_MESSAGE,
]);
//@ chunk-z4g2ta8k.js:47893-48124 placement
function isHiddenFromCatchUp(e) {
  return (
    isSyntheticApiErrorMessage(e) ||
    ((e.type === "assistant" || e.type === "user") && (e.isVirtual === true || e.handedOff === true)) ||
    (e.type === "user" &&
      Array.isArray(e.message.content) &&
      e.message.content.every((n) => n.type === "tool_result" && SYNTHETIC_TOOL_RESULT_TEXTS.has(n.content)))
  );
}
export {
  gitCredentialEngineAdmission,
  sessionAuthAdmission,
  ccrAuthRefreshAdmission,
  openSettingsToCloudGateIfAvailable,
  reportFileStoreVerdict,
  isSettingsToCloudForcedOff,
  settingsToCloudCapability,
  isSettingsToCloudAvailable,
  GIT_CREDENTIAL_ENTRYPOINTS,
  isHiddenFromCatchUp,
  AUTH_REFRESH_DEBOUNCE_MS,
  TRANSCRIPT_COPY_LIMITS,
  waitForSessionAuthHeaders,
  ccrAuthRefresherFor,
};
