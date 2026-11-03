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
var wEo = [250, 500, 500, 750, 1000];
//@ chunk-bdmhadbm.js:487-548 placement
function g() {
  return env.CLAUDE_SESSION_INGRESS_TOKEN_FILE ?? CCR_SESSION_INGRESS_TOKEN_PATH;
}
//@ chunk-bdmhadbm.js:548-739 placement
function shouldWaitForSessionIngressToken(r) {
  return (
    env.CLAUDE_CODE_REMOTE &&
    !env.CLAUDE_CODE_SESSION_ACCESS_TOKEN &&
    !env.CLAUDE_CODE_WEBSOCKET_AUTH_FILE_DESCRIPTOR &&
    r.some((e) => e === "--sdk-url" || e.startsWith("--sdk-url=")) &&
    !isReviewSession()
  );
}
//@ chunk-bdmhadbm.js:739-754 placement
var I = 250,
  w = 50;
//@ chunk-bdmhadbm.js:754-842 placement
function d() {
  return (
    readWellKnownCredentialFile(CCR_OAUTH_TOKEN_PATH, "OAuth token").token !== null ||
    readWellKnownCredentialFile(CCR_API_KEY_PATH, "API key").token !== null
  );
}
/**
 * 轮询读取 session ingress 令牌文件，未就绪时间隔重试
 */
//@ chunk-bdmhadbm.js:842-1721 placement
async function waitForSessionIngressToken(
  r,
  { delaysMs: e = wEo, siblingGraceMs: o = I, siblingStepMs: f = w } = {},
) {
  if (!shouldWaitForSessionIngressToken(r)) return;
  let startTime = performance.now(),
    reduced = e.reduce((s, k) => s + k, 0),
    E = g(),
    { token: token, miss: miss } = readWellKnownCredentialFile(E, "session ingress token"),
    n = 0;
  while (!token && n < e.length) {
    let s = e[n];
    (logForDebugging(
      `[spare-claim] session ingress token file not readable yet (${miss}), re-checking in ${s}ms (${n + 1}/${e.length})`,
      { level: "warn" },
    ),
      await sleep(s),
      n++,
      ({ token: token, miss: miss } = readWellKnownCredentialFile(E, "session ingress token")));
  }
  if (!token) {
    logForDiagnosticsNoPII("error", "cli_worker_lifecycle_claim_token_wait", {
      attempts: n,
      recovered: !1,
      last_miss: miss ?? "other",
      waited_ms: Math.round(performance.now() - startTime),
    });
    return;
  }
  let u = n > 0 ? Math.max(reduced - (performance.now() - startTime), o) : o,
    startTime_2 = performance.now(),
    c = 0,
    m = d();
  while (!m && performance.now() - startTime_2 < u) (await sleep(f), c++, (m = d()));
  if (n > 0 || c > 0)
    logForDiagnosticsNoPII("info", "cli_worker_lifecycle_claim_token_wait", {
      attempts: n,
      recovered: !0,
      sibling_attempts: c,
      sibling_present: m,
      waited_ms: Math.round(performance.now() - startTime),
    });
}
//@ chunk-bdmhadbm.js:1721-2072 placement
function rereadSessionIngressToken() {
  let r = !!env.CLAUDE_CODE_WEBSOCKET_AUTH_FILE_DESCRIPTOR;
  if (getSessionIngressToken() !== null) return { recovered: !1, diag: { fd_env_set: r } };
  let { token: token, miss: miss } = readWellKnownCredentialFile(g(), "session ingress token");
  if (!token) return { recovered: !1, diag: { fd_env_set: r, last_miss: miss ?? "other" } };
  return (
    setSessionIngressToken(token),
    logForDebugging("Session ingress token re-read from well-known file"),
    { recovered: !0, diag: { fd_env_set: r } }
  );
}

export { rereadSessionIngressToken, waitForSessionIngressToken, wEo };
