/**
 * bridge/titleWrite.ts
 *
 * 2.1.316 新增：会话标题写回服务端的令牌桶合并器（合并、限速、退避重试）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-q8z5dt8p.js (14)
 * attribution: placement 14
 */
import { logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { logForDebugging } from "../utils/debug.js";
import { updateBridgeSessionTitle, getBridgeSession } from "./createSession.js";
import { errorMessage } from "../utils/errors.js";

//@ chunk-q8z5dt8p.js:337-739 placement
/**
 * 会话标题写回服务端的令牌桶合并器：同会话的更新合并、限速、失败退避重试，远端改名后放弃旧写入。
 */
function createTitleWriteCoalescer(i) {
  let n = {
    entries: new Map(),
    burst: i?.burst ?? 3,
    refillMs: i?.refillMs ?? 1e4,
    retryMs: i?.retryMs ?? 60000,
    isOwnTitle: i?.isOwnTitle ?? (() => false),
    onRemoteTitleAdopted: i?.onRemoteTitleAdopted ?? (() => {}),
  };
  return {
    update: (e, r, s) => enqueueTitleWrite(n, e, r, s),
    noteRemoteTitle: (e, r) => noteTitleSent(n, e, r),
    forget: (e) => dropTitleEntry(n, e),
    hasSent: (e, r) => n.entries.get(e)?.sentTitles.has(r) ?? false,
    isKnownTitle: (e, r) => n.entries.get(e)?.knownTitles.has(r) ?? false,
  };
}
//@ chunk-q8z5dt8p.js:739-1014 placement
function titleEntryFor(i, n) {
  let e = i.entries.get(n);
  if (!e) {
    e = {
      lastSentTitle: undefined,
      lastSentOk: false,
      sentTitles: new Set(),
      knownTitles: new Set(),
      tokens: i.burst,
      refilledAt: Date.now(),
      pending: undefined,
      inFlight: false,
      timer: undefined,
      retryTimer: undefined,
      sendingRetry: false,
      suppressed: 0,
    };
    i.entries.set(n, e);
  }
  return e;
}
//@ chunk-q8z5dt8p.js:1014-1327 placement
function enqueueTitleWrite(i, n, e, r) {
  let s = titleEntryFor(i, n);
  if (isTitleAlreadySent(s, e, r)) {
    clearPendingTitleWrite(s);
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    let waiters = [resolve];
    clearRetryTimer(s);
    if (s.pending || s.inFlight) {
      if (s.suppressed === 0) logFeatureSad("bridge_session_patch", "title_write_coalesced");
      s.suppressed += 1;
    }
    runWaiters(s.pending?.waiters);
    s.pending = {
      title: e,
      opts: r,
      waiters,
    };
    s.sendingRetry = false;
    flushTitleWrite(i, n);
  });
}
//@ chunk-q8z5dt8p.js:1327-1500 placement
function refillTitleTokens(i, n, e) {
  let floored = Math.floor((e - n.refilledAt) / i.refillMs);
  if (floored > 0) {
    n.tokens = Math.min(i.burst, n.tokens + floored);
    n.refilledAt += floored * i.refillMs;
  }
  if (n.tokens === i.burst) n.refilledAt = e;
}
//@ chunk-q8z5dt8p.js:1500-2558 placement
function flushTitleWrite(i, n) {
  let e = i.entries.get(n);
  if (!e || e.inFlight || !e.pending) return;
  let now = Date.now();
  refillTitleTokens(i, e, now);
  if (e.tokens <= 0 && !e.pending.opts?.userInitiated) {
    if (!e.timer) {
      let max = Math.max(0, e.refilledAt + i.refillMs - now);
      e.timer = setTimeout(onTitleWriteTimer, max, i, n);
      e.timer.unref?.();
    }
    return;
  }
  let { title, opts, waiters } = e.pending;
  e.pending = undefined;
  if (isTitleAlreadySent(e, title, opts) || (opts?.shouldSend !== undefined && !opts.shouldSend())) {
    clearRetryTimer(e);
    e.sendingRetry = false;
    e.suppressed = 0;
    runWaiters(waiters);
    return;
  }
  e.tokens = Math.max(0, e.tokens - 1);
  e.inFlight = true;
  e.lastSentTitle = title;
  e.lastSentOk = false;
  e.sentTitles.add(title);
  e.knownTitles.add(title);
  clearRetryTimer(e);
  let sendingRetry = e.sendingRetry;
  e.sendingRetry = false;
  if (e.suppressed > 0) {
    logForDebugging(`[bridge] title write: sending latest after coalescing ${e.suppressed} update(s)`);
    e.suppressed = 0;
  }
  updateBridgeSessionTitle(n, title, opts)
    .then(
      (o) => {
        if (o === "landed") {
          e.lastSentTitle = title;
          e.lastSentOk = true;
        } else if (e.lastSentTitle === title) e.lastSentOk = false;
        if (i.entries.get(n) !== e) return;
        if (o === "failed" && !sendingRetry && !e.retryTimer && !e.pending) {
          e.retryTimer = setTimeout(retryTitleWrite, i.retryMs, i, n, title, opts);
          e.retryTimer.unref?.();
        }
      },
      (error) => {
        logForDebugging(`[bridge] title write failed: ${errorMessage(error)}`);
      },
    )
    .finally(() => {
      e.inFlight = false;
      runWaiters(waiters);
      flushTitleWrite(i, n);
    });
}
//@ chunk-q8z5dt8p.js:2558-2624 placement
function onTitleWriteTimer(i, n) {
  let e = i.entries.get(n);
  if (e) {
    e.timer = undefined;
    flushTitleWrite(i, n);
  }
}
//@ chunk-q8z5dt8p.js:2624-3361 placement
function retryTitleWrite(i, n, e, r) {
  let s = i.entries.get(n);
  if (!s) return;
  s.retryTimer = undefined;
  if (!isFailedResendCandidate(i, s, n, e)) return;
  if (r?.shouldSend !== undefined && !r.shouldSend()) {
    logForDebugging("[bridge] title write retry dropped: sending is now barred");
    return;
  }
  getBridgeSession(n, {
    baseUrl: r?.baseUrl,
    getAccessToken: r?.getAccessToken,
    credentials: r?.credentials,
  }).then(
    (bridgeSession) => {
      if (!isFailedResendCandidate(i, s, n, e)) return;
      if (bridgeSession === null) {
        logForDebugging("[bridge] title write retry skipped: server state unreadable");
        return;
      }
      if (
        bridgeSession.title &&
        !s.knownTitles.has(bridgeSession.title) &&
        !i.isOwnTitle(n, bridgeSession.title)
      ) {
        logForDebugging("[bridge] title write retry dropped: the session was renamed elsewhere");
        noteTitleSent(i, n, bridgeSession.title);
        i.onRemoteTitleAdopted(n, bridgeSession.title);
        return;
      }
      s.pending = {
        title: e,
        opts: r,
        waiters: [],
      };
      s.sendingRetry = true;
      flushTitleWrite(i, n);
    },
    (error) => {
      logForDebugging(`[bridge] title write retry skipped: ${errorMessage(error)}`);
    },
  );
}
//@ chunk-q8z5dt8p.js:3361-3485 placement
function isFailedResendCandidate(i, n, e, r) {
  return (
    i.entries.get(e) === n &&
    n.lastSentTitle === r &&
    !n.lastSentOk &&
    !n.inFlight &&
    !n.pending &&
    !n.retryTimer
  );
}
//@ chunk-q8z5dt8p.js:3485-3581 placement
function noteTitleSent(i, n, e) {
  let r = titleEntryFor(i, n);
  r.lastSentTitle = e;
  r.lastSentOk = true;
  r.knownTitles.add(e);
  clearRetryTimer(r);
  clearPendingTitleWrite(r);
}
//@ chunk-q8z5dt8p.js:3581-3696 placement
function dropTitleEntry(i, n) {
  let e = i.entries.get(n);
  if (!e) return;
  if (e.timer) clearTimeout(e.timer);
  clearRetryTimer(e);
  clearPendingTitleWrite(e);
  i.entries.delete(n);
}
//@ chunk-q8z5dt8p.js:3696-3782 placement
function clearPendingTitleWrite(i) {
  runWaiters(i.pending?.waiters);
  i.pending = undefined;
  i.sendingRetry = false;
  i.suppressed = 0;
}
//@ chunk-q8z5dt8p.js:3782-3859 placement
function clearRetryTimer(i) {
  if (i.retryTimer) {
    clearTimeout(i.retryTimer);
    i.retryTimer = undefined;
  }
}
//@ chunk-q8z5dt8p.js:3859-3896 placement
function runWaiters(waiters) {
  for (let n of waiters ?? []) n();
}
//@ chunk-q8z5dt8p.js:3896-4031 placement
function isTitleAlreadySent(i, n, e) {
  if (i.lastSentTitle !== n) return false;
  if (i.inFlight || i.retryTimer !== undefined) return true;
  return i.lastSentOk && !e?.userInitiated;
}
export { createTitleWriteCoalescer };
