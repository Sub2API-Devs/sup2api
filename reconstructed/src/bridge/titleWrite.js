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

/**
 * 会话标题写回服务端的令牌桶合并器：同会话的更新合并、限速、失败退避重试，远端改名后放弃旧写入。
 */
//@ chunk-q8z5dt8p.js:337-739 placement
function createTitleWriteCoalescer(i) {
  let n = {
    entries: new Map(),
    burst: i?.burst ?? 3,
    refillMs: i?.refillMs ?? 1e4,
    retryMs: i?.retryMs ?? 60000,
    isOwnTitle: i?.isOwnTitle ?? (() => !1),
    onRemoteTitleAdopted: i?.onRemoteTitleAdopted ?? (() => {}),
  };
  return {
    update: (e, r, s) => enqueueTitleWrite(n, e, r, s),
    noteRemoteTitle: (e, r) => S(n, e, r),
    forget: (e) => dropTitleEntry(n, e),
    hasSent: (e, r) => n.entries.get(e)?.sentTitles.has(r) ?? !1,
    isKnownTitle: (e, r) => n.entries.get(e)?.knownTitles.has(r) ?? !1,
  };
}
//@ chunk-q8z5dt8p.js:739-1014 placement
function titleEntryFor(i, n) {
  let e = i.entries.get(n);
  if (!e)
    ((e = {
      lastSentTitle: void 0,
      lastSentOk: !1,
      sentTitles: new Set(),
      knownTitles: new Set(),
      tokens: i.burst,
      refilledAt: Date.now(),
      pending: void 0,
      inFlight: !1,
      timer: void 0,
      retryTimer: void 0,
      sendingRetry: !1,
      suppressed: 0,
    }),
      i.entries.set(n, e));
  return e;
}
//@ chunk-q8z5dt8p.js:1014-1327 placement
function enqueueTitleWrite(i, n, e, r) {
  let s = titleEntryFor(i, n);
  if (isTitleAlreadySent(s, e, r)) return (p(s), Promise.resolve());
  return new Promise((l) => {
    let u = [l];
    if ((a(s), s.pending || s.inFlight)) {
      if (s.suppressed === 0) logFeatureSad("bridge_session_patch", "title_write_coalesced");
      s.suppressed += 1;
    }
    (g(s.pending?.waiters),
      (s.pending = { title: e, opts: r, waiters: u }),
      (s.sendingRetry = !1),
      flushTitleWrite(i, n));
  });
}
//@ chunk-q8z5dt8p.js:1327-1500 placement
function refillTitleTokens(i, n, e) {
  let floored = Math.floor((e - n.refilledAt) / i.refillMs);
  if (floored > 0)
    ((n.tokens = Math.min(i.burst, n.tokens + floored)), (n.refilledAt += floored * i.refillMs));
  if (n.tokens === i.burst) n.refilledAt = e;
}
//@ chunk-q8z5dt8p.js:1500-2558 placement
function flushTitleWrite(i, n) {
  let e = i.entries.get(n);
  if (!e || e.inFlight || !e.pending) return;
  let now = Date.now();
  if ((refillTitleTokens(i, e, now), e.tokens <= 0 && !e.pending.opts?.userInitiated)) {
    if (!e.timer) {
      let max = Math.max(0, e.refilledAt + i.refillMs - now);
      ((e.timer = setTimeout(W, max, i, n)), e.timer.unref?.());
    }
    return;
  }
  let { title: title, opts: opts, waiters: waiters } = e.pending;
  if (
    ((e.pending = void 0),
    isTitleAlreadySent(e, title, opts) || (opts?.shouldSend !== void 0 && !opts.shouldSend()))
  ) {
    (a(e), (e.sendingRetry = !1), (e.suppressed = 0), g(waiters));
    return;
  }
  ((e.tokens = Math.max(0, e.tokens - 1)),
    (e.inFlight = !0),
    (e.lastSentTitle = title),
    (e.lastSentOk = !1),
    e.sentTitles.add(title),
    e.knownTitles.add(title),
    a(e));
  let sendingRetry = e.sendingRetry;
  if (((e.sendingRetry = !1), e.suppressed > 0))
    (logForDebugging(`[bridge] title write: sending latest after coalescing ${e.suppressed} update(s)`),
      (e.suppressed = 0));
  updateBridgeSessionTitle(n, title, opts)
    .then(
      (o) => {
        if (o === "landed") ((e.lastSentTitle = title), (e.lastSentOk = !0));
        else if (e.lastSentTitle === title) e.lastSentOk = !1;
        if (i.entries.get(n) !== e) return;
        if (o === "failed" && !sendingRetry && !e.retryTimer && !e.pending)
          ((e.retryTimer = setTimeout(retryTitleWrite, i.retryMs, i, n, title, opts)),
            e.retryTimer.unref?.());
      },
      (o) => {
        logForDebugging(`[bridge] title write failed: ${errorMessage(o)}`);
      },
    )
    .finally(() => {
      ((e.inFlight = !1), g(waiters), flushTitleWrite(i, n));
    });
}
//@ chunk-q8z5dt8p.js:2558-2624 placement
function W(i, n) {
  let e = i.entries.get(n);
  if (e) ((e.timer = void 0), flushTitleWrite(i, n));
}
//@ chunk-q8z5dt8p.js:2624-3361 placement
function retryTitleWrite(i, n, e, r) {
  let s = i.entries.get(n);
  if (!s) return;
  if (((s.retryTimer = void 0), !isFailedResendCandidate(i, s, n, e))) return;
  if (r?.shouldSend !== void 0 && !r.shouldSend()) {
    logForDebugging("[bridge] title write retry dropped: sending is now barred");
    return;
  }
  getBridgeSession(n, {
    baseUrl: r?.baseUrl,
    getAccessToken: r?.getAccessToken,
    credentials: r?.credentials,
  }).then(
    (l) => {
      if (!isFailedResendCandidate(i, s, n, e)) return;
      if (l === null) {
        logForDebugging("[bridge] title write retry skipped: server state unreadable");
        return;
      }
      if (l.title && !s.knownTitles.has(l.title) && !i.isOwnTitle(n, l.title)) {
        (logForDebugging("[bridge] title write retry dropped: the session was renamed elsewhere"),
          S(i, n, l.title),
          i.onRemoteTitleAdopted(n, l.title));
        return;
      }
      ((s.pending = { title: e, opts: r, waiters: [] }), (s.sendingRetry = !0), flushTitleWrite(i, n));
    },
    (l) => {
      logForDebugging(`[bridge] title write retry skipped: ${errorMessage(l)}`);
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
function S(i, n, e) {
  let r = titleEntryFor(i, n);
  ((r.lastSentTitle = e), (r.lastSentOk = !0), r.knownTitles.add(e), a(r), p(r));
}
//@ chunk-q8z5dt8p.js:3581-3696 placement
function dropTitleEntry(i, n) {
  let e = i.entries.get(n);
  if (!e) return;
  if (e.timer) clearTimeout(e.timer);
  (a(e), p(e), i.entries.delete(n));
}
//@ chunk-q8z5dt8p.js:3696-3782 placement
function p(i) {
  (g(i.pending?.waiters), (i.pending = void 0), (i.sendingRetry = !1), (i.suppressed = 0));
}
//@ chunk-q8z5dt8p.js:3782-3859 placement
function a(i) {
  if (i.retryTimer) (clearTimeout(i.retryTimer), (i.retryTimer = void 0));
}
//@ chunk-q8z5dt8p.js:3859-3896 placement
function g(i) {
  for (let n of i ?? []) n();
}
//@ chunk-q8z5dt8p.js:3896-4031 placement
function isTitleAlreadySent(i, n, e) {
  if (i.lastSentTitle !== n) return !1;
  if (i.inFlight || i.retryTimer !== void 0) return !0;
  return i.lastSentOk && !e?.userInitiated;
}

export { createTitleWriteCoalescer };
