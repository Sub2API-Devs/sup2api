/**
 * services/artifacts/comments/autoreactLedger.ts
 *
 * 2.1.316 新增：评论自动响应台账的读写
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-9tgt55am.js (32)
 * attribution: placement 32
 */
import { Uwr } from "../../../types/logs.js";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import { o, zodStrictObject, M, A, xE, T, E, pe, oe } from "../../../../vendor/zod/v4/classic/schemas.js";
import { parseTimestamp } from "./commentState.js";
import { getLiveState } from "../../liveReplica/liveReplica.js";
import { getGatewayAccountInfo } from "../../../utils/gatewayCredential.js";
import { getSessionId } from "../../../bootstrap/state.js";
import { logFeatureSad } from "../../analytics/featureTelemetry.js";
import { ARTIFACT_SLUG_RE } from "../../../tools/ArtifactTool/constants.js";
import {
  peekResumedArtifactAutoReactLedger,
  takeResumedArtifactAutoReactLedger,
  getTranscriptWriteFailureSeq,
  registerTranscriptExitReStamp,
  recordArtifactAutoReactLedger,
  flushSessionStorage,
} from "../../../utils/sessionStorage.js";
import {
  isSlugSwept,
  sweepSlug,
  markLatchChanged,
  isSlugStopped,
  latchChangedAt,
  sweptSlugs,
  isSlugOrphaned,
  isSlugYielded,
  orphanSweptSlugs,
} from "../summonArms.js";
import { jsonStringify } from "../../../utils/slowOperations.js";
import { logError } from "../../../utils/log.js";
import { registerCleanup } from "../../../utils/cleanupRegistry.js";

//@ chunk-9tgt55am.js:3469-4182 placement
var AUTOREACT_LEDGER_LIMITS = 86400000,
  jo = 3600000,
  Vo = 1e4,
  Yo = 300000,
  ri = 32768,
  Rn = 163840,
  zo = Uwr,
  Xo = 2000,
  Cn = 500,
  qo = 128,
  Jo = 600,
  Zo = DoctorLazy(() => {
    let refine = o()
        .max(qo)
        .refine((d) => parseTimestamp(d) !== null),
      max = o().min(1).max(qo),
      n = zodStrictObject({
        id: max,
        activatedAt: refine.nullable(),
        activatedAtObserved: M(),
        seen: A(max).max(Cn),
        sent: A(xE([max, refine.nullable()])).max(Cn),
        ownReplyIds: A(max).max(Cn),
        ownReplyIdsIncomplete: T(!0).optional(),
      }),
      refine_2 = E().refine(Number.isFinite),
      r = zodStrictObject({
        savedAt: refine_2,
        stampHighWater: refine.nullable(),
        everBaselined: M(),
        everHadThreads: M(),
        turnTimestamps: A(refine_2).max(Jo),
        threads: A(n).max(Xo).optional(),
        interrupted: T(!0).optional(),
      }),
      s = zodStrictObject({
        type: T("artifact-autoreact-ledger"),
        v: T(1),
        sessionId: o(),
        accountUuid: o().nullable(),
        artifacts: pe(o(), oe()),
      });
    return { thread: n, artifact: r, envelope: s };
  });
//@ chunk-9tgt55am.js:4182-4245 placement
function er() {
  return getLiveState().autoReact.ledgerMaxAgeMsOverride ?? AUTOREACT_LEDGER_LIMITS;
}
//@ chunk-9tgt55am.js:4245-4306 placement
function ze() {
  return getGatewayAccountInfo()?.accountUuid?.toLowerCase() ?? null;
}
/**
 * 读取会话的评论自动响应台账（已见评论、激活时间、自己的回复），校验会话与账号。
 */
//@ chunk-9tgt55am.js:4306-4874 placement
function parseAutoreactLedger(e) {
  let t = new Map(),
    n = Zo(),
    safeParse = n.envelope.safeParse(e);
  if (!safeParse.success || safeParse.data.sessionId !== getSessionId())
    return (logFeatureSad("artifact_comments_autoreact", "ledger_invalid"), t);
  let r = (safeParse.data.accountUuid?.toLowerCase() ?? null) !== ze();
  if (r) logFeatureSad("artifact_comments_autoreact", "ledger_foreign_account");
  let entries = Object.entries(safeParse.data.artifacts);
  if (entries.length > zo) return (logFeatureSad("artifact_comments_autoreact", "ledger_invalid"), t);
  for (let [d, h] of entries) {
    let safeParse = n.artifact.safeParse(h);
    if (!ARTIFACT_SLUG_RE.test(d) || !safeParse.success) {
      logFeatureSad("artifact_comments_autoreact", "ledger_slug_invalid");
      continue;
    }
    t.set(d, r ? En(safeParse.data) : safeParse.data);
  }
  return t;
}
//@ chunk-9tgt55am.js:4874-5295 placement
function loadAutoreactLedger() {
  let { autoReact: autoReact } = getLiveState(),
    t = getSessionId(),
    n = si(peekResumedArtifactAutoReactLedger()) === t ? takeResumedArtifactAutoReactLedger() : void 0,
    a = ze();
  if (n !== void 0) {
    (autoReact.ledgerRetiredSids.delete(t),
      (autoReact.ledgerOwnerSid ??= t),
      (autoReact.pendingLedger = { sid: t, accountUuid: a, slugs: parseAutoreactLedger(n) }));
    for (let [s, d] of autoReact.pendingLedger.slugs)
      if (d.interrupted === !0) {
        let h = isSlugSwept(s);
        if ((sweepSlug(s), !h)) markLatchChanged(s, d.savedAt);
      }
  }
  let pendingLedger = autoReact.pendingLedger;
  if (pendingLedger?.sid === t && pendingLedger.accountUuid === null) pendingLedger.accountUuid = a;
  return pendingLedger?.sid === t && pendingLedger.accountUuid === a ? pendingLedger.slugs : null;
}
//@ chunk-9tgt55am.js:5295-5452 placement
function getPendingLedgerFor(e = getSessionId()) {
  if (e === getSessionId()) loadAutoreactLedger();
  let { pendingLedger: pendingLedger } = getLiveState().autoReact;
  return pendingLedger?.sid === e
    ? {
        slugs: pendingLedger.slugs,
        own: pendingLedger.accountUuid === null || pendingLedger.accountUuid === ze(),
      }
    : null;
}
//@ chunk-9tgt55am.js:5452-5570 placement
function listLedgerSlugs(e) {
  let t = getPendingLedgerFor(e);
  if (t === null) return [];
  let n = [...t.slugs.entries()];
  return t.own ? n : n.map(([a, r]) => [a, En(r)]);
}
//@ chunk-9tgt55am.js:5570-5658 placement
function si(e) {
  return typeof e === "object" && e !== null && "sessionId" in e ? e.sessionId : void 0;
}
//@ chunk-9tgt55am.js:5658-5678 placement
function initAutoreactLedger() {
  loadAutoreactLedger();
}
//@ chunk-9tgt55am.js:5678-5984 placement
function takeLedgerEntry(e, t = Date.now()) {
  let n = getPendingLedgerFor(),
    a = n?.slugs.get(e);
  if (a === void 0) return null;
  n.slugs.delete(e);
  let r = n.own ? a : En(a),
    s = t - r.savedAt;
  if (s > er() || s < -Yo) return (logFeatureSad("artifact_comments_autoreact", "ledger_stale"), null);
  return {
    ...r,
    turnTimestamps: r.turnTimestamps
      .filter((turnTimestamp) => t - turnTimestamp < 3600000)
      .map((d) => Math.min(d, t)),
  };
}
//@ chunk-9tgt55am.js:5984-6137 placement
function resetLedgerEntry(e) {
  return {
    savedAt: e.savedAt,
    stampHighWater: null,
    everBaselined: !1,
    everHadThreads: e.everHadThreads,
    turnTimestamps: e.turnTimestamps,
    threads: [],
  };
}
//@ chunk-9tgt55am.js:6137-6209 placement
function En(e) {
  return { ...resetLedgerEntry(e), ...(e.interrupted === !0 && { interrupted: !0 }) };
}
/**
 * 把台账里某个 slug 的自动回复记录重置为空线程（保留保存时间与回合时间戳），并标记锁存已变化。
 */
//@ chunk-9tgt55am.js:6209-6324 placement
function resetLedgerSlug(e) {
  loadAutoreactLedger();
  let pendingLedger = getLiveState().autoReact.pendingLedger,
    n = pendingLedger?.slugs.get(e);
  if (n !== void 0) (pendingLedger.slugs.set(e, resetLedgerEntry(n)), markLatchChanged(e));
}
/**
 * 把台账里所有 slug 的自动回复记录重置为空线程，并标记锁存已变化。
 */
//@ chunk-9tgt55am.js:6324-6434 placement
function resetAllLedgerSlugs() {
  loadAutoreactLedger();
  let pendingLedger = getLiveState().autoReact.pendingLedger;
  for (let [t, n] of pendingLedger?.slugs ?? [])
    (pendingLedger.slugs.set(t, resetLedgerEntry(n)), markLatchChanged(t));
}
//@ chunk-9tgt55am.js:6434-6762 placement
function serializeThreadStates(e) {
  return [...e.threads.entries()]
    .map(([t, n]) => ({
      id: t,
      activatedAt: n.activatedAt,
      activatedAtObserved: n.activatedAtObserved,
      seen: [...n.seen],
      sent: [...n.sentToClaudeAt.entries()],
      ownReplyIds: [...n.ownReplyIds],
      ...(n.ownReplyIdsIncomplete === !0 && { ownReplyIdsIncomplete: !0 }),
    }))
    .filter((t) => Zo().thread.safeParse(t).success);
}
//@ chunk-9tgt55am.js:6762-7167 placement
function buildLedgerArtifactEntry(e, t, n, a) {
  let { autoReact: autoReact } = getLiveState(),
    s = !autoReact.userDisarmed && isSlugSwept(e),
    d = autoReact.userDisarmed || (t.accountUuid !== null && t.accountUuid !== a) || (isSlugStopped(e) && !s);
  return {
    savedAt: Math.max(t.lastScanAt ?? n, latchChangedAt(e) ?? 0),
    stampHighWater: d ? null : t.stampHighWater,
    everBaselined: d ? !1 : t.everBaselined,
    everHadThreads: t.everHadThreads,
    turnTimestamps: t.turnTimestamps.filter((turnTimestamp) => n - turnTimestamp < 3600000).slice(-Jo),
    threads: d ? [] : serializeThreadStates(t),
    ...(s && { interrupted: !0 }),
  };
}
//@ chunk-9tgt55am.js:7167-7299 placement
function makeInterruptedLedgerEntry(e) {
  return {
    savedAt: e,
    stampHighWater: null,
    everBaselined: !1,
    everHadThreads: !1,
    turnTimestamps: [],
    threads: [],
    interrupted: !0,
  };
}
//@ chunk-9tgt55am.js:7299-7442 placement
function markLedgerEntryInterrupted(e) {
  return {
    savedAt: e.savedAt,
    stampHighWater: null,
    everBaselined: !1,
    everHadThreads: e.everHadThreads,
    turnTimestamps: [],
    interrupted: !0,
  };
}
//@ chunk-9tgt55am.js:7442-8840 placement
function buildLedgerSnapshot(e, t, n) {
  let { autoReact: autoReact } = getLiveState(),
    r = listLedgerSlugs(e),
    s = new Set([...autoReact.artifacts.keys(), ...(getPendingLedgerFor(e)?.slugs.keys() ?? [])]),
    d = autoReact.userDisarmed
      ? []
      : [...sweptSlugs()]
          .filter((S) => {
            if (s.has(S)) return !1;
            return !isSlugOrphaned(S);
          })
          .map((S) => [S, makeInterruptedLedgerEntry(t)]),
    h = [
      ...[...autoReact.artifacts.entries()]
        .reverse()
        .map(([S, w]) => [S, buildLedgerArtifactEntry(S, w, t, n)]),
      ...[...r, ...d]
        .filter(([S]) => !autoReact.artifacts.has(S))
        .flatMap(([S, { interrupted: w, ...L }]) => {
          let P = !autoReact.userDisarmed && isSlugSwept(S),
            D = !P && isSlugStopped(S),
            G = L.savedAt - t > Yo,
            V = t - L.savedAt <= er() && !G;
          if (!V && !P && w !== !0) return [];
          return [
            [
              S,
              {
                ...(V && !D ? L : resetLedgerEntry(L)),
                savedAt: Math.max(G ? t : L.savedAt, latchChangedAt(S) ?? 0),
                turnTimestamps: L.turnTimestamps
                  .filter((turnTimestamp) => t - turnTimestamp < 3600000)
                  .map((q) => Math.min(q, t)),
                ...(P && { interrupted: !0 }),
              },
            ],
          ];
        })
        .sort(([, S], [, w]) => w.savedAt - S.savedAt),
    ];
  for (let S = h.length - 1; S >= 0; S--) if (isSlugYielded(h[S][0])) h.splice(S, 1);
  h.sort(([, S], [, w]) => Number(w.interrupted === !0) - Number(S.interrupted === !0));
  let y = {},
    C = new Map(),
    sliced = h.slice(0, zo),
    max = Math.max(ri, Math.floor(Rn / Math.max(1, sliced.length)) - 1024),
    N = 2;
  for (let [S, w] of sliced) {
    let { threads: threads, ...P } = w,
      D = threads === void 0 ? 0 : jsonStringify(threads).length,
      G = threads !== void 0 && threads.length <= Xo && D <= max;
    if (((y[S] = G ? { ...P, threads: threads } : P), (N += jsonStringify(P).length + S.length + 4), G))
      (C.set(S, D), (N += D + 12));
  }
  for (let [S, w] of [...C].sort(([, L], [, P]) => P - L)) {
    if (N <= Rn) break;
    let { threads: threads, ...P } = y[S];
    ((y[S] = P), (N -= w + 12));
  }
  for (let [S] of [...sliced].reverse()) {
    if (N <= Rn) break;
    let w = y[S],
      L = jsonStringify(w).length;
    if (w.interrupted === !0) {
      let P = markLedgerEntryInterrupted(w),
        D = jsonStringify(P).length;
      if (D < L) ((y[S] = P), (N -= L - D));
    } else (delete y[S], (N -= L + S.length + 4));
  }
  return { artifacts: y };
}
//@ chunk-9tgt55am.js:8840-9014 placement
function ledgerFingerprint(e) {
  return jsonStringify(
    Object.entries(e).map(([t, n]) => [
      t,
      {
        ...n,
        savedAt: 0,
        threads: n.threads?.map((a) => ({
          ...a,
          seen: a.seen.length > 0,
          sent: a.sent.filter(([, r]) => r !== null),
        })),
      },
    ]),
  );
}
//@ chunk-9tgt55am.js:9014-9112 placement
function Mn(e = {}) {
  try {
    scheduleLedgerWrite(e);
  } catch (error) {
    (logError(error), logFeatureSad("artifact_comments_autoreact", "ledger_write_failed"));
  }
}
//@ chunk-9tgt55am.js:9112-9288 placement
function buildLedgerEntry(e, t) {
  let n = ze(),
    { artifacts: artifacts } = buildLedgerSnapshot(e, t, n);
  if (Object.keys(artifacts).length === 0) return null;
  return { type: "artifact-autoreact-ledger", v: 1, sessionId: e, accountUuid: n, artifacts: artifacts };
}
//@ chunk-9tgt55am.js:9288-9606 placement
function scheduleLedgerWrite({ force: force = !1, urgent: urgent = !1 }) {
  let { autoReact: autoReact } = getLiveState();
  if (autoReact.ledgerTimer !== void 0)
    (clearTimeout(autoReact.ledgerTimer), (autoReact.ledgerTimer = void 0));
  let a = getSessionId(),
    r = autoReact.ledgerOwnerSid ?? a,
    now = Date.now();
  if (r !== a && !urgent) {
    if (((autoReact.ledgerDeferredSince ??= now), now - autoReact.ledgerDeferredSince < jo))
      scheduleLedgerFlush();
    return;
  }
  if (((autoReact.ledgerDeferredSince = null), writeAutoreactLedger(r, now, force), r !== a))
    writeAutoreactLedger(a, now, force);
}
//@ chunk-9tgt55am.js:9606-10380 placement
function writeAutoreactLedger(e, t, n) {
  let { autoReact: autoReact } = getLiveState();
  if (autoReact.ledgerRetiredSids.has(e)) return;
  let r = buildLedgerEntry(e, t);
  if (r === null) return;
  let s = ledgerFingerprint(r.artifacts),
    d = getTranscriptWriteFailureSeq();
  if (
    !n &&
    s === autoReact.ledgerLastWritten &&
    e === autoReact.ledgerLastWriteSid &&
    r.accountUuid === autoReact.ledgerLastWriteAccount &&
    d === autoReact.ledgerFailureSeqAtWrite &&
    t - (autoReact.ledgerLastWriteAt ?? 0) < jo
  )
    return;
  ((autoReact.ledgerLastWritten = s),
    (autoReact.ledgerLastWriteAt = t),
    (autoReact.ledgerLastWriteSid = e),
    (autoReact.ledgerOwnerSid ??= e),
    (autoReact.ledgerLastWriteAccount = r.accountUuid),
    (autoReact.ledgerFailureSeqAtWrite = d),
    (autoReact.ledgerExitReStamp ??= registerTranscriptExitReStamp(buildExitLedgerEntry)));
  let h = recordArtifactAutoReactLedger(
    r,
    autoReact.ledgerStorageV5 ?? getLiveState().commentMonitorIntent.storageV5,
  ).catch(() => {
    if (autoReact.ledgerLastWritten === s)
      ((autoReact.ledgerLastWritten = null), (autoReact.ledgerLastWriteAt = null));
    logFeatureSad("artifact_comments_autoreact", "ledger_write_failed");
  });
  autoReact.ledgerLastAppend = Promise.all([autoReact.ledgerLastAppend, h]).then(() => {});
}
//@ chunk-9tgt55am.js:10380-10443 placement
function setLedgerStorage(e) {
  if (e !== void 0) getLiveState().autoReact.ledgerStorageV5 = e;
}
/**
 * 记下台账使用的存储，并在当前会话未被退役时把它设为台账所属会话。
 */
//@ chunk-9tgt55am.js:10443-10568 placement
function claimLedgerOwnership(e) {
  let { autoReact: autoReact } = getLiveState();
  if (e !== void 0) autoReact.ledgerStorageV5 = e;
  if (!autoReact.ledgerRetiredSids.has(getSessionId())) autoReact.ledgerOwnerSid = getSessionId();
}
//@ chunk-9tgt55am.js:10568-10831 placement
function flushAutoreactLedger(e) {
  let { autoReact: autoReact } = getLiveState();
  (setLedgerStorage(e?.storageV5), (autoReact.ledgerExitCleanup ??= registerCleanup(pi)));
  let n = autoReact.ledgerDebounceMsOverride ?? Vo;
  if (autoReact.ledgerOwnerSid === null || autoReact.ledgerOwnerSid === getSessionId())
    autoReact.ledgerDeferredSince = null;
  if (e?.flush === !0 || n <= 0) {
    Mn({ urgent: e?.flush === !0 });
    return;
  }
  scheduleLedgerFlush();
}
//@ chunk-9tgt55am.js:10831-10992 placement
function scheduleLedgerFlush() {
  let { autoReact: autoReact } = getLiveState(),
    t = autoReact.ledgerDebounceMsOverride ?? Vo;
  if (autoReact.ledgerTimer === void 0 && t > 0)
    ((autoReact.ledgerTimer = setTimeout(() => Mn(), t)), autoReact.ledgerTimer.unref?.());
}
//@ chunk-9tgt55am.js:10992-11086 placement
async function pi() {
  (Mn({ force: !0, urgent: !0 }),
    await getLiveState().autoReact.ledgerLastAppend,
    await flushSessionStorage());
}
//@ chunk-9tgt55am.js:11086-11284 placement
function buildExitLedgerEntry() {
  let { autoReact: autoReact } = getLiveState(),
    t = getSessionId();
  if (
    autoReact.ledgerFailureSeqAtWrite === null ||
    getTranscriptWriteFailureSeq() === autoReact.ledgerFailureSeqAtWrite ||
    (autoReact.ledgerOwnerSid !== null && t !== autoReact.ledgerOwnerSid)
  )
    return;
  return buildLedgerEntry(t, Date.now()) ?? void 0;
}
//@ chunk-9tgt55am.js:11284-11806 placement
function retireAutoreactLedger(e) {
  let { autoReact: autoReact } = getLiveState();
  if (e?.stillCurrent !== !1) {
    if (autoReact.ledgerOwnerSid !== null) autoReact.ledgerRetiredSids.add(autoReact.ledgerOwnerSid);
    autoReact.ledgerRetiredSids.add(getSessionId());
  }
  if (
    (autoReact.artifacts.clear(),
    (autoReact.pendingLedger = null),
    orphanSweptSlugs(),
    autoReact.ledgerTimer !== void 0)
  )
    (clearTimeout(autoReact.ledgerTimer), (autoReact.ledgerTimer = void 0));
  (autoReact.ledgerExitReStamp?.(),
    (autoReact.ledgerExitReStamp = void 0),
    (autoReact.ledgerLastWritten = null),
    (autoReact.ledgerLastWriteAt = null),
    (autoReact.ledgerLastWriteSid = null),
    (autoReact.ledgerLastWriteAccount = void 0),
    (autoReact.ledgerFailureSeqAtWrite = null),
    (autoReact.ledgerDeferredSince = null),
    (autoReact.ledgerOwnerSid = null));
}
//@ chunk-9tgt55am.js:11806-11844 placement
function forgetArtifactAndFlush(e) {
  (resetLedgerSlug(e), flushAutoreactLedger({ flush: !0 }));
}

export {
  initAutoreactLedger,
  resetAllLedgerSlugs,
  flushAutoreactLedger,
  resetLedgerSlug,
  ze,
  takeLedgerEntry,
  claimLedgerOwnership,
  setLedgerStorage,
  retireAutoreactLedger,
  forgetArtifactAndFlush,
};
