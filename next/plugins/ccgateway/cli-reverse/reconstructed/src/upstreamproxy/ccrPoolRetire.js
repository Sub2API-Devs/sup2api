/**
 * upstreamproxy/ccrPoolRetire.ts
 *
 * Anthropic 会话服务器的连接池退役：无响应或指定状态码时关闭本 worker 的旧连接并重连（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-9xh6zw2q.js (4)
 * attribution: placement 4
 */
import { isCcsTenant } from "../bootstrap/state.js";
import { getProxyUrl } from "../utils/proxy.js";
import { env } from "../utils/env.js";
import {
  ccrLeavesSharedPool,
  heldTLSFetchSession,
  ccrActsOnNoAnswer,
  retireTLSFetchSession,
} from "../utils/mtls.js";
import { logForDebugging } from "../utils/debug.js";
import { logForDiagnosticsNoPII } from "../utils/diagLogs.js";
import { logError } from "../utils/log.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-9xh6zw2q.js:1324-1641 placement
/**
 * http URL 的 fetch 包装：需要时先手动跳转判定 30x，再决定是否重发。
 */
function fetchFollowingCcsRedirect(url, options) {
  if (
    options.proxy !== undefined ||
    options.unix !== undefined ||
    !/^http:/i.test(url) ||
    !isCcsTenant() ||
    getProxyUrl() !== undefined ||
    env.ALL_PROXY ||
    env.all_proxy
  )
    return fetch(url, options);
  let { tls, ...rest } = options;
  return fetch(url, {
    ...rest,
    redirect: "manual",
  }).then((response) => {
    if (!REDIRECT_STATUSES.has(response.status) || !response.headers.has("location")) return response;
    response.body?.cancel().catch(() => {});
    return fetch(url, options);
  });
}
//@ chunk-9xh6zw2q.js:1641-1686 placement
var REDIRECT_STATUSES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var NO_ANSWER_MS;
deferInit("chunk-9xh6zw2q.js:1641", () => {
  REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
  NO_ANSWER_MS = 60000;
});
//@ chunk-9xh6zw2q.js:1686-2366 placement
/**
 * 请求超时后退役到 Anthropic 会话服务器的连接（共享池或本 worker 池），失败只告警。
 */
function retirePoolAfterNoAnswer() {
  try {
    if (ccrLeavesSharedPool()) {
      logForDebugging(
        "A request to Anthropic's sessions server got no answer in time: this worker stops using the connections it had open to that server and opens new ones",
      );
      logForDiagnosticsNoPII("info", "cli_ccr_shared_pool_left", {
        after: "no_answer",
      });
      return;
    }
    let session = heldTLSFetchSession("ccr");
    if (session !== undefined && ccrActsOnNoAnswer(NO_ANSWER_MS) && retireTLSFetchSession("ccr", session)) {
      logForDebugging(
        "A request to Anthropic's sessions server got no answer in time: this worker closed its idle connections to that server and opens new ones",
      );
      logForDiagnosticsNoPII("info", "cli_ccr_own_pool_retired", {
        after: "no_answer",
      });
    }
  } catch (error) {
    logForDebugging(
      "Could not close this worker's connections to Anthropic's sessions server after a request got no answer in time; it goes on with the ones it has",
      {
        level: "warn",
      },
    );
    logError(error);
  }
}
//@ chunk-9xh6zw2q.js:2366-2583 placement
/**
 * 按响应状态码退役会话服务器连接并记 cli_ccr_shared_pool_left。
 */
function logServerStatus(status) {
  if (ccrLeavesSharedPool()) {
    logForDebugging(
      `A request to Anthropic's sessions server got a ${status}: this worker stops using the connections it had open to that server and opens new ones`,
    );
    logForDiagnosticsNoPII("info", "cli_ccr_shared_pool_left", {
      status,
    });
  }
}
export { fetchFollowingCcsRedirect, logServerStatus, retirePoolAfterNoAnswer };
