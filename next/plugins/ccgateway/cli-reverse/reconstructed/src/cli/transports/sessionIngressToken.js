/**
 * cli/transports/sessionIngressToken.ts
 *
 * 读取/重读 session ingress 令牌文件（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bdmhadbm.js (7)
 * attribution: placement 7
 */
import { env } from "../../utils/env.js";
import {
  CCR_SESSION_INGRESS_TOKEN_PATH,
  readWellKnownCredentialFile,
  CCR_OAUTH_TOKEN_PATH,
  CCR_API_KEY_PATH,
} from "../../utils/authFileDescriptor.js";
import { isReviewSession } from "../../utils/sessionAccessToken.js";
import { logForDebugging } from "../../utils/debug.js";
import { sleep } from "../../utils/sleep.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { getSessionIngressToken, setSessionIngressToken } from "../../bootstrap/state.js";

//@ chunk-bdmhadbm.js:456-487 placement
/**
 * 读取 session ingress 令牌文件的退避重试间隔 [250,500,500,750,1000] ms。
 */
var TOKEN_FILE_READ_BACKOFF_MS = [250, 500, 500, 750, 1000];
//@ chunk-bdmhadbm.js:487-548 placement
function sessionIngressTokenPath() {
  return env.CLAUDE_SESSION_INGRESS_TOKEN_FILE ?? CCR_SESSION_INGRESS_TOKEN_PATH;
}
//@ chunk-bdmhadbm.js:548-739 placement
function shouldWaitForSessionIngressToken(argv) {
  return (
    env.CLAUDE_CODE_REMOTE &&
    !env.CLAUDE_CODE_SESSION_ACCESS_TOKEN &&
    !env.CLAUDE_CODE_WEBSOCKET_AUTH_FILE_DESCRIPTOR &&
    argv.some((arg) => arg === "--sdk-url" || arg.startsWith("--sdk-url=")) &&
    !isReviewSession()
  );
}
//@ chunk-bdmhadbm.js:739-754 placement
var SIBLING_CREDENTIAL_GRACE_MS = 250;
var SIBLING_CREDENTIAL_STEP_MS = 50;
//@ chunk-bdmhadbm.js:754-842 placement
function hasAnyCredentialFile() {
  return (
    readWellKnownCredentialFile(CCR_OAUTH_TOKEN_PATH, "OAuth token").token !== null ||
    readWellKnownCredentialFile(CCR_API_KEY_PATH, "API key").token !== null
  );
}
//@ chunk-bdmhadbm.js:842-1721 placement
/**
 * 轮询读取 session ingress 令牌文件，未就绪时间隔重试
 */
async function waitForSessionIngressToken(
  argv,
  {
    delaysMs = TOKEN_FILE_READ_BACKOFF_MS,
    siblingGraceMs = SIBLING_CREDENTIAL_GRACE_MS,
    siblingStepMs = SIBLING_CREDENTIAL_STEP_MS,
  } = {},
) {
  if (!shouldWaitForSessionIngressToken(argv)) return;
  let startTime = performance.now();
  let reduced = delaysMs.reduce((acc, delay) => acc + delay, 0);
  let path = sessionIngressTokenPath();
  let { token, miss } = readWellKnownCredentialFile(path, "session ingress token");
  let attempts = 0;
  while (!token && attempts < delaysMs.length) {
    let delay = delaysMs[attempts];
    logForDebugging(
      `[spare-claim] session ingress token file not readable yet (${miss}), re-checking in ${delay}ms (${attempts + 1}/${delaysMs.length})`,
      {
        level: "warn",
      },
    );
    await sleep(delay);
    attempts++;
    ({ token, miss } = readWellKnownCredentialFile(path, "session ingress token"));
  }
  if (!token) {
    logForDiagnosticsNoPII("error", "cli_worker_lifecycle_claim_token_wait", {
      attempts,
      recovered: false,
      last_miss: miss ?? "other",
      waited_ms: Math.round(performance.now() - startTime),
    });
    return;
  }
  let graceMs =
    attempts > 0 ? Math.max(reduced - (performance.now() - startTime), siblingGraceMs) : siblingGraceMs;
  let startTime_2 = performance.now();
  let siblingAttempts = 0;
  let present = hasAnyCredentialFile();
  while (!present && performance.now() - startTime_2 < graceMs) {
    await sleep(siblingStepMs);
    siblingAttempts++;
    present = hasAnyCredentialFile();
  }
  if (attempts > 0 || siblingAttempts > 0)
    logForDiagnosticsNoPII("info", "cli_worker_lifecycle_claim_token_wait", {
      attempts,
      recovered: true,
      sibling_attempts: siblingAttempts,
      sibling_present: present,
      waited_ms: Math.round(performance.now() - startTime),
    });
}
//@ chunk-bdmhadbm.js:1721-2072 placement
function rereadSessionIngressToken() {
  let fdEnvSet = !!env.CLAUDE_CODE_WEBSOCKET_AUTH_FILE_DESCRIPTOR;
  if (getSessionIngressToken() !== null)
    return {
      recovered: false,
      diag: {
        fd_env_set: fdEnvSet,
      },
    };
  let { token, miss } = readWellKnownCredentialFile(sessionIngressTokenPath(), "session ingress token");
  if (!token)
    return {
      recovered: false,
      diag: {
        fd_env_set: fdEnvSet,
        last_miss: miss ?? "other",
      },
    };
  setSessionIngressToken(token);
  logForDebugging("Session ingress token re-read from well-known file");
  return {
    recovered: true,
    diag: {
      fd_env_set: fdEnvSet,
    },
  };
}
export { rereadSessionIngressToken, waitForSessionIngressToken, TOKEN_FILE_READ_BACKOFF_MS };
