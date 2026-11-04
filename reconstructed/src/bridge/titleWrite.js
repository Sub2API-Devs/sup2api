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
function createTitleWriteCoalescer(options) {
  let state = {
    entries: new Map(),
    burst: options?.burst ?? 3,
    refillMs: options?.refillMs ?? 1e4,
    retryMs: options?.retryMs ?? 60000,
    isOwnTitle: options?.isOwnTitle ?? (() => false),
    onRemoteTitleAdopted: options?.onRemoteTitleAdopted ?? (() => {}),
  };
  return {
    update: (sessionId, title, options) => enqueueTitleWrite(state, sessionId, title, options),
    noteRemoteTitle: (sessionId, title) => noteTitleSent(state, sessionId, title),
    forget: (sessionId) => dropTitleEntry(state, sessionId),
    hasSent: (sessionId, title) => state.entries.get(sessionId)?.sentTitles.has(title) ?? false,
    isKnownTitle: (sessionId, title) => state.entries.get(sessionId)?.knownTitles.has(title) ?? false,
  };
}
//@ chunk-q8z5dt8p.js:739-1014 placement
function titleEntryFor(coalescer, sessionId) {
  let entry = coalescer.entries.get(sessionId);
  if (!entry) {
    entry = {
      lastSentTitle: undefined,
      lastSentOk: false,
      sentTitles: new Set(),
      knownTitles: new Set(),
      tokens: coalescer.burst,
      refilledAt: Date.now(),
      pending: undefined,
      inFlight: false,
      timer: undefined,
      retryTimer: undefined,
      sendingRetry: false,
      suppressed: 0,
    };
    coalescer.entries.set(sessionId, entry);
  }
  return entry;
}
//@ chunk-q8z5dt8p.js:1014-1327 placement
function enqueueTitleWrite(coalescer, sessionId, title, options) {
  let entry = titleEntryFor(coalescer, sessionId);
  if (isTitleAlreadySent(entry, title, options)) {
    clearPendingTitleWrite(entry);
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    let waiters = [resolve];
    clearRetryTimer(entry);
    if (entry.pending || entry.inFlight) {
      if (entry.suppressed === 0) logFeatureSad("bridge_session_patch", "title_write_coalesced");
      entry.suppressed += 1;
    }
    runWaiters(entry.pending?.waiters);
    entry.pending = {
      title,
      opts: options,
      waiters,
    };
    entry.sendingRetry = false;
    flushTitleWrite(coalescer, sessionId);
  });
}
//@ chunk-q8z5dt8p.js:1327-1500 placement
function refillTitleTokens(coalescer, entry, now) {
  let floored = Math.floor((now - entry.refilledAt) / coalescer.refillMs);
  if (floored > 0) {
    entry.tokens = Math.min(coalescer.burst, entry.tokens + floored);
    entry.refilledAt += floored * coalescer.refillMs;
  }
  if (entry.tokens === coalescer.burst) entry.refilledAt = now;
}
//@ chunk-q8z5dt8p.js:1500-2558 placement
function flushTitleWrite(coalescer, sessionId) {
  let entry = coalescer.entries.get(sessionId);
  if (!entry || entry.inFlight || !entry.pending) return;
  let now = Date.now();
  refillTitleTokens(coalescer, entry, now);
  if (entry.tokens <= 0 && !entry.pending.opts?.userInitiated) {
    if (!entry.timer) {
      let max = Math.max(0, entry.refilledAt + coalescer.refillMs - now);
      entry.timer = setTimeout(onTitleWriteTimer, max, coalescer, sessionId);
      entry.timer.unref?.();
    }
    return;
  }
  let { title, opts, waiters } = entry.pending;
  entry.pending = undefined;
  if (isTitleAlreadySent(entry, title, opts) || (opts?.shouldSend !== undefined && !opts.shouldSend())) {
    clearRetryTimer(entry);
    entry.sendingRetry = false;
    entry.suppressed = 0;
    runWaiters(waiters);
    return;
  }
  entry.tokens = Math.max(0, entry.tokens - 1);
  entry.inFlight = true;
  entry.lastSentTitle = title;
  entry.lastSentOk = false;
  entry.sentTitles.add(title);
  entry.knownTitles.add(title);
  clearRetryTimer(entry);
  let sendingRetry = entry.sendingRetry;
  entry.sendingRetry = false;
  if (entry.suppressed > 0) {
    logForDebugging(`[bridge] title write: sending latest after coalescing ${entry.suppressed} update(s)`);
    entry.suppressed = 0;
  }
  updateBridgeSessionTitle(sessionId, title, opts)
    .then(
      (outcome) => {
        if (outcome === "landed") {
          entry.lastSentTitle = title;
          entry.lastSentOk = true;
        } else if (entry.lastSentTitle === title) entry.lastSentOk = false;
        if (coalescer.entries.get(sessionId) !== entry) return;
        if (outcome === "failed" && !sendingRetry && !entry.retryTimer && !entry.pending) {
          entry.retryTimer = setTimeout(
            retryTitleWrite,
            coalescer.retryMs,
            coalescer,
            sessionId,
            title,
            opts,
          );
          entry.retryTimer.unref?.();
        }
      },
      (error) => {
        logForDebugging(`[bridge] title write failed: ${errorMessage(error)}`);
      },
    )
    .finally(() => {
      entry.inFlight = false;
      runWaiters(waiters);
      flushTitleWrite(coalescer, sessionId);
    });
}
//@ chunk-q8z5dt8p.js:2558-2624 placement
function onTitleWriteTimer(coalescer, sessionId) {
  let entry = coalescer.entries.get(sessionId);
  if (entry) {
    entry.timer = undefined;
    flushTitleWrite(coalescer, sessionId);
  }
}
//@ chunk-q8z5dt8p.js:2624-3361 placement
function retryTitleWrite(coalescer, sessionId, title, options) {
  let entry = coalescer.entries.get(sessionId);
  if (!entry) return;
  entry.retryTimer = undefined;
  if (!isFailedResendCandidate(coalescer, entry, sessionId, title)) return;
  if (options?.shouldSend !== undefined && !options.shouldSend()) {
    logForDebugging("[bridge] title write retry dropped: sending is now barred");
    return;
  }
  getBridgeSession(sessionId, {
    baseUrl: options?.baseUrl,
    getAccessToken: options?.getAccessToken,
    credentials: options?.credentials,
  }).then(
    (bridgeSession) => {
      if (!isFailedResendCandidate(coalescer, entry, sessionId, title)) return;
      if (bridgeSession === null) {
        logForDebugging("[bridge] title write retry skipped: server state unreadable");
        return;
      }
      if (
        bridgeSession.title &&
        !entry.knownTitles.has(bridgeSession.title) &&
        !coalescer.isOwnTitle(sessionId, bridgeSession.title)
      ) {
        logForDebugging("[bridge] title write retry dropped: the session was renamed elsewhere");
        noteTitleSent(coalescer, sessionId, bridgeSession.title);
        coalescer.onRemoteTitleAdopted(sessionId, bridgeSession.title);
        return;
      }
      entry.pending = {
        title,
        opts: options,
        waiters: [],
      };
      entry.sendingRetry = true;
      flushTitleWrite(coalescer, sessionId);
    },
    (error) => {
      logForDebugging(`[bridge] title write retry skipped: ${errorMessage(error)}`);
    },
  );
}
//@ chunk-q8z5dt8p.js:3361-3485 placement
function isFailedResendCandidate(coalescer, entry, sessionId, title) {
  return (
    coalescer.entries.get(sessionId) === entry &&
    entry.lastSentTitle === title &&
    !entry.lastSentOk &&
    !entry.inFlight &&
    !entry.pending &&
    !entry.retryTimer
  );
}
//@ chunk-q8z5dt8p.js:3485-3581 placement
function noteTitleSent(coalescer, sessionId, title) {
  let entry = titleEntryFor(coalescer, sessionId);
  entry.lastSentTitle = title;
  entry.lastSentOk = true;
  entry.knownTitles.add(title);
  clearRetryTimer(entry);
  clearPendingTitleWrite(entry);
}
//@ chunk-q8z5dt8p.js:3581-3696 placement
function dropTitleEntry(coalescer, sessionId) {
  let entry = coalescer.entries.get(sessionId);
  if (!entry) return;
  if (entry.timer) clearTimeout(entry.timer);
  clearRetryTimer(entry);
  clearPendingTitleWrite(entry);
  coalescer.entries.delete(sessionId);
}
//@ chunk-q8z5dt8p.js:3696-3782 placement
function clearPendingTitleWrite(entry) {
  runWaiters(entry.pending?.waiters);
  entry.pending = undefined;
  entry.sendingRetry = false;
  entry.suppressed = 0;
}
//@ chunk-q8z5dt8p.js:3782-3859 placement
function clearRetryTimer(entry) {
  if (entry.retryTimer) {
    clearTimeout(entry.retryTimer);
    entry.retryTimer = undefined;
  }
}
//@ chunk-q8z5dt8p.js:3859-3896 placement
function runWaiters(waiters) {
  for (let waiter of waiters ?? []) waiter();
}
//@ chunk-q8z5dt8p.js:3896-4031 placement
function isTitleAlreadySent(entry, title, options) {
  if (entry.lastSentTitle !== title) return false;
  if (entry.inFlight || entry.retryTimer !== undefined) return true;
  return entry.lastSentOk && !options?.userInitiated;
}
export { createTitleWriteCoalescer };
