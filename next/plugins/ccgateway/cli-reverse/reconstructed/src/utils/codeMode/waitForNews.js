/**
 * utils/codeMode/waitForNews.ts
 *
 * 等待新内容（news）的防抖/超时 Promise 与可等待条件（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-x60qr24n.js (5)
 * attribution: placement 5
 */
import { codeModeAccepted } from "./accepted.js";
import { isAsyncReplEnabled, isAsyncLaneMode } from "../../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { isDiagLogging } from "../diagLogs.js";

//@ chunk-x60qr24n.js:302-342 placement
/**
 * 是否应该等待新内容（Code 模式且满足条件时）。
 */
function isReplSpliceWaitEnabled() {
  return codeModeAccepted() && isAsyncReplEnabled() && !isDiagLogging();
}
//@ chunk-x60qr24n.js:342-378 placement
/**
 * 给定内容是否值得等（ELe 且 I9 成立）。
 */
function typedMessageJoinsRunningTurn(news) {
  return isReplSpliceWaitEnabled() && isAsyncLaneMode(news);
}
//@ chunk-x60qr24n.js:378-395 placement
var DEFAULT_DEBOUNCE_MS = 750;
var MAX_WAIT_MS = 3000;
//@ chunk-x60qr24n.js:395-443 placement
/**
 * 等待的防抖与最大等待毫秒数。
 */
function replSpliceEventBatching() {
  return {
    debounceMs: DEFAULT_DEBOUNCE_MS,
    maxWaitMs: MAX_WAIT_MS,
  };
}
//@ chunk-x60qr24n.js:443-957 placement
/**
 * 等到有新内容或中止信号的 Promise（防抖 + 最大等待双计时）。
 */
function waitForNews({ news, subscribe, signal, settled, debounceMs, maxWaitMs }) {
  return new Promise((resolve) => {
    let done = false;
    let debounceTimer;
    let maxWaitTimer;
    let unsubscribe = subscribe(check);
    function finish() {
      if (done) return;
      done = true;
      clearTimeout(debounceTimer);
      clearTimeout(maxWaitTimer);
      unsubscribe();
      signal.removeEventListener("abort", finish);
      settled?.removeEventListener("abort", onSettledAbort);
      resolve();
    }
    function onSettledAbort() {
      check();
    }
    function check() {
      if (done || (news().length === 0 && settled?.aborted !== true)) return;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(finish, debounceMs);
      if (maxWaitTimer === undefined) maxWaitTimer = setTimeout(finish, maxWaitMs);
    }
    if (signal.aborted) {
      finish();
      return;
    }
    signal.addEventListener("abort", finish, {
      once: true,
    });
    settled?.addEventListener("abort", onSettledAbort, {
      once: true,
    });
    check();
  });
}
export { isReplSpliceWaitEnabled, replSpliceEventBatching, typedMessageJoinsRunningTurn, waitForNews };
