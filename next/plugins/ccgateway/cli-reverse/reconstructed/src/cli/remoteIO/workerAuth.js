/**
 * cli/remoteIO/workerAuth.ts
 *
 * 2.1.316 新增。云 worker 的 CCR 认证刷新与会话认证头等待。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-1kk50rk6.js (20)
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
  isNoResponseRequestedMessage,
} from "../../utils/messages.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-1kk50rk6.js:45575-45651 placement
/**
 * 允许启动 git 凭据引擎的入口点集合（remote / remote_projects / remote_desktop / sdk-cli / 空）。
 */
var GIT_CREDENTIAL_ENTRYPOINTS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-1kk50rk6.js:45575", () => {
  GIT_CREDENTIAL_ENTRYPOINTS = new Set(["remote", "remote_projects", "remote_desktop", "sdk-cli", ""]);
});
//@ chunk-1kk50rk6.js:45651-45802 placement
/**
 * 判断 worker 是否启动 git 凭据引擎：入口不在允许集合时拒绝，否则按 git 开关启用。
 */
function gitCredentialEngineAdmission(options) {
  if (options.entrypoint !== undefined && !GIT_CREDENTIAL_ENTRYPOINTS.has(options.entrypoint))
    return {
      start: false,
      reason: "entrypoint",
    };
  return {
    start: true,
    engines: {
      git: options.gitSwitch,
      ...{},
    },
  };
}
//@ chunk-1kk50rk6.js:45802-45813 placement
var GIT_CREDENTIAL_ENTRYPOINTS_ALIAS; // deferred: uses GIT_CREDENTIAL_ENTRYPOINTS of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-1kk50rk6.js:45802", () => {
  GIT_CREDENTIAL_ENTRYPOINTS_ALIAS = GIT_CREDENTIAL_ENTRYPOINTS;
});
//@ chunk-1kk50rk6.js:45813-46156 placement
/**
 * 判断托管云 worker 是否启用某项认证能力：需要 sdkUrl 与远程会话、入口在允许集合内、未禁用、非密闭环境。
 */
function ccrAuthRefreshAdmission(options) {
  if (!options.sdkUrl || !options.remoteSessionId || options.environmentKind !== undefined)
    return {
      admitted: false,
      reason: "not_managed_cloud_worker",
    };
  if (options.entrypoint !== undefined && !GIT_CREDENTIAL_ENTRYPOINTS_ALIAS.has(options.entrypoint))
    return {
      admitted: false,
      reason: "entrypoint",
    };
  if (options.disabled)
    return {
      admitted: false,
      reason: "disabled",
    };
  if (options.hermetic)
    return {
      admitted: false,
      reason: "hermetic",
    };
  return {
    admitted: true,
  };
}
//@ chunk-1kk50rk6.js:46156-46500 placement
/**
 * 与 jPr 同形的准入判断，只是入口白名单不同（WNt）。
 */
function sessionAuthAdmission(options) {
  if (!options.sdkUrl || !options.remoteSessionId || options.environmentKind !== undefined)
    return {
      admitted: false,
      reason: "not_managed_cloud_worker",
    };
  if (options.entrypoint !== undefined && !GIT_CREDENTIAL_ENTRYPOINTS.has(options.entrypoint))
    return {
      admitted: false,
      reason: "entrypoint",
    };
  if (options.disabled)
    return {
      admitted: false,
      reason: "disabled",
    };
  if (options.hermetic)
    return {
      admitted: false,
      reason: "hermetic",
    };
  return {
    admitted: true,
  };
}
//@ chunk-1kk50rk6.js:46500-46923 placement
/**
 * 下发文件存储写入裁决并记诊断：监听器抛错时记 file_store_verdict_listener_threw，乱序时记 file_store_verdict_out_of_order。
 */
function reportFileStoreVerdict(verdict) {
  let result = publishFileStoreVerdict(verdict, (first) => {
    logForDiagnosticsNoPII("error", "file_store_verdict_listener_threw", {
      verdict,
      rejected: true,
      first,
    });
  });
  switch (result.kind) {
    case "delivered":
      if (result.threw.length > 0)
        logForDiagnosticsNoPII("error", "file_store_verdict_listener_threw", {
          verdict,
          listeners: result.listeners,
          threw: result.threw.length,
          first: result.threw[0],
        });
      return;
    case "out_of_order":
      logForDiagnosticsNoPII("error", "file_store_verdict_out_of_order", {
        verdict,
        basis: result.basis,
      });
      return;
    case "repeat":
    case "queued":
      return;
  }
}
//@ chunk-1kk50rk6.js:46923-46947 placement
/**
 * 恒返回 false 的构建期开关：设置同步到云没有被强制关闭。
 */
function isSettingsToCloudForcedOff() {
  return false;
}
//@ chunk-1kk50rk6.js:46947-46993 placement
/**
 * 设置同步到云是否可用（GPr 或 isSettingsToCloudEnabled）。
 */
async function isSettingsToCloudAvailable() {
  return isSettingsToCloudForcedOff() || (await isSettingsToCloudEnabled());
}
//@ chunk-1kk50rk6.js:46993-47092 placement
/**
 * 设置同步到云的能力：完全可用、仅公告、不可用三态。
 */
async function settingsToCloudCapability(isLaterEpoch) {
  if (!isSettingsToCloudForcedOff()) return isSettingsToCloudEnabled();
  return isLaterEpoch && (await isSettingsToCloudEnabled().catch(() => false)) ? true : "announced_only";
}
//@ chunk-1kk50rk6.js:47092-47168 placement
/**
 * 可用时打开设置同步闸门并返回是否可用（读取时顺手放行）。
 */
async function openSettingsToCloudGateIfAvailable() {
  let available = await isSettingsToCloudAvailable();
  if (available) backgroundOutputGateSlots.of(getRootSession()).openGate();
  return available;
}
//@ chunk-1kk50rk6.js:47168-47224 placement
var CCR_TOKEN_FILE_PATHS = {
  sessionIngressTokenPath: CCR_SESSION_INGRESS_TOKEN_PATH,
  oauthTokenPath: CCR_OAUTH_TOKEN_PATH,
};
//@ chunk-1kk50rk6.js:47224-47542 placement
/**
 * 并行读取会话入口令牌文件与 OAuth 令牌文件；任一缺失或为空时告警并返回 null，保持当前凭证。
 */
async function readCcrTokenFiles(paths = CCR_TOKEN_FILE_PATHS) {
  let [smallFileOrNull, smallFileOrNull_2] = await Promise.all([
    readSmallFileOrNull(paths.sessionIngressTokenPath, MAX_CREDENTIAL_BYTES),
    readSmallFileOrNull(paths.oauthTokenPath, MAX_CREDENTIAL_BYTES),
  ]);
  let sessionToken = smallFileOrNull?.trim() ?? "";
  let oauthToken = smallFileOrNull_2?.trim() ?? "";
  if (!sessionToken || !oauthToken) {
    logForDebugging(
      "CCR auth refresh: token-file pair unreadable or incomplete, keeping current credentials",
      {
        level: "warn",
      },
    );
    return null;
  }
  return {
    sessionIngressToken: sessionToken,
    oauthToken,
  };
}
//@ chunk-1kk50rk6.js:47542-47602 placement
var CLOCK_SKEW_TOLERANCE_SEC = 300;
var SECRET_PLACEHOLDER_PATTERN = /^ANTHROPIC_SECRET_PLACEHOLDER_[0-9a-f]{32}$/;
//@ chunk-1kk50rk6.js:47602-47635 placement
function isSecretPlaceholder(value) {
  return SECRET_PLACEHOLDER_PATTERN.test(value);
}
//@ chunk-1kk50rk6.js:47635-47659 placement
var BEARER_TOKEN_PATTERN = /^[\w.~+/-]+=*$/;
//@ chunk-1kk50rk6.js:47659-49784 placement
async function refreshCcrAuthFromFiles(ttl, paths = CCR_TOKEN_FILE_PATHS) {
  if (!env.CLAUDE_CODE_REMOTE)
    return {
      adopted: false,
      reason: "not_remote",
    };
  if (typeof ttl !== "number" || !Number.isFinite(ttl) || ttl <= 0)
    return {
      adopted: false,
      reason: "no_advertised_ttl",
    };
  let ccrTokenFiles = await readCcrTokenFiles(paths);
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
  let current = env.CLAUDE_CODE_SESSION_ACCESS_TOKEN || getSessionIngressToken();
  let expiry = BEARER_TOKEN_PATTERN.test(ccrTokenFiles.sessionIngressToken)
    ? decodeJwtExpiry(ccrTokenFiles.sessionIngressToken)
    : null;
  let tokenKind;
  if (expiry !== null) {
    if (current === ccrTokenFiles.sessionIngressToken)
      return {
        adopted: false,
        reason: "unchanged",
      };
    let expected = Date.now() / 1000 + ttl;
    if (Math.abs(expiry - expected) > CLOCK_SKEW_TOLERANCE_SEC) {
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
    let currentExpiry = current ? decodeJwtExpiry(current) : null;
    if (currentExpiry !== null && expiry <= currentExpiry) {
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
    tokenKind = "jwt";
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
  } else if (current === ccrTokenFiles.sessionIngressToken) {
    if (ccrTokenFiles.oauthToken === (env.CLAUDE_CODE_OAUTH_TOKEN || getOauthTokenFromFd()))
      return {
        adopted: false,
        reason: "unchanged",
      };
    tokenKind = "placeholder_unchanged";
  } else if (current && decodeJwtExpiry(current) !== null) tokenKind = "placeholder_sealed";
  else {
    logForDebugging(
      "CCR auth refresh: delivered gateway placeholder is neither the session token held in process nor replacing a decodable JWT, keeping current credentials",
      {
        level: "warn",
      },
    );
    return {
      adopted: false,
      reason:
        current && isSecretPlaceholder(current) ? "placeholder_mismatch" : "placeholder_current_unknown",
    };
  }
  if (tokenKind !== "placeholder_unchanged") {
    if (env.CLAUDE_CODE_SESSION_ACCESS_TOKEN) getSessionIngressAuthToken_2(ccrTokenFiles.sessionIngressToken);
    setSessionIngressToken(ccrTokenFiles.sessionIngressToken);
  }
  setOauthTokenFromFd(ccrTokenFiles.oauthToken);
  if (env.CLAUDE_CODE_OAUTH_TOKEN) env.set("CLAUDE_CODE_OAUTH_TOKEN", ccrTokenFiles.oauthToken);
  clearOAuthTokenCache();
  resetFullCheckMark();
  logForDiagnosticsNoPII("info", "cli_worker_auth_refresh_adopted", {
    session_token: tokenKind,
    seconds_until_expiry: expiry === null ? undefined : Math.max(0, Math.floor(expiry - Date.now() / 1000)),
  });
  return {
    adopted: true,
  };
}
//@ chunk-1kk50rk6.js:49784-49825 placement
function ccrAuthRefresherFor(config) {
  return config === null ? refreshCcrAuthFromFiles : undefined;
}
//@ chunk-1kk50rk6.js:49825-50699 placement
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
  let diag = {};
  for (let [index, delay] of delaysMs.entries()) {
    let attempt = index + 1;
    logForDebugging(
      `[remote-io] no auth headers, re-reading in ${delay}ms (attempt ${attempt}/${delaysMs.length})`,
      {
        level: "warn",
      },
    );
    await sleep(delay);
    diag = rereadMiss().diag;
    if (Object.keys(getAuthHeaders()).length > 0) {
      onDiagnostic?.(
        `session auth headers present after ${attempt} re-read(s)`,
        "info",
        "auth_headers_arrived",
      );
      logForDiagnosticsNoPII("info", "cli_worker_lifecycle_init_auth_retried", {
        attempts: attempt,
        ...diag,
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
    ...diag,
  });
  return false;
}
//@ chunk-1kk50rk6.js:50699-50798 placement
var AUTH_REFRESH_DEBOUNCE_MS; // deferred: uses INTERRUPT_MESSAGE (../../utils/messages.js) of its import cycle while loading; runs once the cycle is complete
var TRANSCRIPT_COPY_LIMITS;
var SYNTHETIC_TOOL_RESULT_TEXTS;
deferInit("chunk-1kk50rk6.js:50699", () => {
  AUTH_REFRESH_DEBOUNCE_MS = 15000;
  TRANSCRIPT_COPY_LIMITS = {
    maxEvents: 2000,
    maxBytes: 8388608,
    maxTimestampChars: 32,
  };
  SYNTHETIC_TOOL_RESULT_TEXTS = new Set([
    TOOL_CALL_SESSION_ENDED,
    TOOL_RESULT_NOT_IN_COPY,
    APPROVAL_EXPIRED_MESSAGE,
    APPROVAL_UNANSWERED_MESSAGE,
  ]);
});
//@ chunk-1kk50rk6.js:50798-51029 placement
function isHiddenFromCatchUp(row) {
  return (
    isNoResponseRequestedMessage(row) ||
    ((row.type === "assistant" || row.type === "user") &&
      (row.isVirtual === true || row.handedOff === true)) ||
    (row.type === "user" &&
      Array.isArray(row.message.content) &&
      row.message.content.every(
        (block) => block.type === "tool_result" && SYNTHETIC_TOOL_RESULT_TEXTS.has(block.content),
      ))
  );
}
export {
  gitCredentialEngineAdmission,
  sessionAuthAdmission,
  ccrAuthRefreshAdmission,
  GIT_CREDENTIAL_ENTRYPOINTS,
  settingsToCloudCapability,
  isHiddenFromCatchUp,
  AUTH_REFRESH_DEBOUNCE_MS,
  TRANSCRIPT_COPY_LIMITS,
  waitForSessionAuthHeaders,
  ccrAuthRefresherFor,
  isSettingsToCloudAvailable,
  openSettingsToCloudGateIfAvailable,
  reportFileStoreVerdict,
  isSettingsToCloudForcedOff,
};
