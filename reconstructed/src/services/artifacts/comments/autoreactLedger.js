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
import { MAX_LOG_LINE_CHARS } from "../../../types/logs.js";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import {
  string,
  zodStrictObject,
  M,
  array,
  tuple,
  literal,
  E,
  record,
  unknown,
} from "../../../../vendor/zod/v4/classic/schemas.js";
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
/**
 * 自动回复台账（autoreact ledger）的限额与 schema：最长 1 天、最短写入间隔 1 小时、防抖 10 s、未来偏差 5 分钟、每部分 160 KB、2000 线程、每线程 500 条、600 个回合时间戳。
 */
var AUTOREACT_LEDGER_LIMITS = 86400000;
var LEDGER_MIN_WRITE_INTERVAL_MS = 3600000;
var LEDGER_DEBOUNCE_MS = 1e4;
var LEDGER_MAX_FUTURE_SKEW_MS = 300000;
var MIN_PART_BUDGET_CHARS = 32768;
var LEDGER_PART_BUDGET_BYTES = 163840;
var MAX_LEDGER_ARTIFACTS = MAX_LOG_LINE_CHARS;
var MAX_LEDGER_THREADS = 2000;
var MAX_THREAD_ENTRIES = 500;
var MAX_ENTRY_ID_CHARS = 128;
var MAX_TURN_TIMESTAMPS = 600;
var autoreactLedgerSchema = DoctorLazy(() => {
  let e = string()
    .max(MAX_ENTRY_ID_CHARS)
    .refine((d) => parseTimestamp(d) !== null);
  let t = string().min(1).max(MAX_ENTRY_ID_CHARS);
  let n = zodStrictObject({
    id: t,
    activatedAt: e.nullable(),
    activatedAtObserved: M(),
    seen: array(t).max(MAX_THREAD_ENTRIES),
    sent: array(tuple([t, e.nullable()])).max(MAX_THREAD_ENTRIES),
    ownReplyIds: array(t).max(MAX_THREAD_ENTRIES),
    ownReplyIdsIncomplete: literal(true).optional(),
  });
  let a = E().refine(Number.isFinite);
  let artifact = zodStrictObject({
    savedAt: a,
    stampHighWater: e.nullable(),
    everBaselined: M(),
    everHadThreads: M(),
    turnTimestamps: array(a).max(MAX_TURN_TIMESTAMPS),
    threads: array(n).max(MAX_LEDGER_THREADS).optional(),
    interrupted: literal(true).optional(),
  });
  let envelope = zodStrictObject({
    type: literal("artifact-autoreact-ledger"),
    v: literal(1),
    sessionId: string(),
    accountUuid: string().nullable(),
    artifacts: record(string(), unknown()),
  });
  return {
    thread: n,
    artifact,
    envelope,
  };
});
//@ chunk-9tgt55am.js:4182-4245 placement
function ledgerMaxAgeMs() {
  return getLiveState().autoReact.ledgerMaxAgeMsOverride ?? AUTOREACT_LEDGER_LIMITS;
}
//@ chunk-9tgt55am.js:4245-4306 placement
function gatewayAccountUuidLower() {
  return getGatewayAccountInfo()?.accountUuid?.toLowerCase() ?? null;
}
//@ chunk-9tgt55am.js:4306-4874 placement
/**
 * 读取会话的评论自动响应台账（已见评论、激活时间、自己的回复），校验会话与账号。
 */
function parseAutoreactLedger(e) {
  let t = new Map();
  let n = autoreactLedgerSchema();
  let a = n.envelope.safeParse(e);
  if (!a.success || a.data.sessionId !== getSessionId()) {
    logFeatureSad("artifact_comments_autoreact", "ledger_invalid");
    return t;
  }
  let r = (a.data.accountUuid?.toLowerCase() ?? null) !== gatewayAccountUuidLower();
  if (r) logFeatureSad("artifact_comments_autoreact", "ledger_foreign_account");
  let entries = Object.entries(a.data.artifacts);
  if (entries.length > MAX_LEDGER_ARTIFACTS) {
    logFeatureSad("artifact_comments_autoreact", "ledger_invalid");
    return t;
  }
  for (let [d, h] of entries) {
    let y = n.artifact.safeParse(h);
    if (!ARTIFACT_SLUG_RE.test(d) || !y.success) {
      logFeatureSad("artifact_comments_autoreact", "ledger_slug_invalid");
      continue;
    }
    t.set(d, r ? resetLedgerEntryKeepingTimes(y.data) : y.data);
  }
  return t;
}
//@ chunk-9tgt55am.js:4874-5295 placement
function loadAutoreactLedger() {
  let { autoReact } = getLiveState();
  let sessionId = getSessionId();
  let n =
    ledgerSessionId(peekResumedArtifactAutoReactLedger()) === sessionId
      ? takeResumedArtifactAutoReactLedger()
      : undefined;
  let a = gatewayAccountUuidLower();
  if (n !== undefined) {
    autoReact.ledgerRetiredSids.delete(sessionId);
    autoReact.ledgerOwnerSid ??= sessionId;
    autoReact.pendingLedger = {
      sid: sessionId,
      accountUuid: a,
      slugs: parseAutoreactLedger(n),
    };
    for (let [s, d] of autoReact.pendingLedger.slugs)
      if (d.interrupted === true) {
        let h = isSlugSwept(s);
        sweepSlug(s);
        if (!h) markLatchChanged(s, d.savedAt);
      }
  }
  let pendingLedger = autoReact.pendingLedger;
  if (pendingLedger?.sid === sessionId && pendingLedger.accountUuid === null) pendingLedger.accountUuid = a;
  return pendingLedger?.sid === sessionId && pendingLedger.accountUuid === a ? pendingLedger.slugs : null;
}
//@ chunk-9tgt55am.js:5295-5452 placement
function getPendingLedgerFor(e = getSessionId()) {
  if (e === getSessionId()) loadAutoreactLedger();
  let { pendingLedger } = getLiveState().autoReact;
  return pendingLedger?.sid === e
    ? {
        slugs: pendingLedger.slugs,
        own: pendingLedger.accountUuid === null || pendingLedger.accountUuid === gatewayAccountUuidLower(),
      }
    : null;
}
//@ chunk-9tgt55am.js:5452-5570 placement
function listLedgerSlugs(e) {
  let pendingLedgerFor = getPendingLedgerFor(e);
  if (pendingLedgerFor === null) return [];
  let n = [...pendingLedgerFor.slugs.entries()];
  return pendingLedgerFor.own ? n : n.map(([a, r]) => [a, resetLedgerEntryKeepingTimes(r)]);
}
//@ chunk-9tgt55am.js:5570-5658 placement
function ledgerSessionId(e) {
  return typeof e === "object" && e !== null && "sessionId" in e ? e.sessionId : undefined;
}
//@ chunk-9tgt55am.js:5658-5678 placement
function initAutoreactLedger() {
  loadAutoreactLedger();
}
//@ chunk-9tgt55am.js:5678-5984 placement
function takeLedgerEntry(slug, t = Date.now()) {
  let pendingLedgerFor = getPendingLedgerFor();
  let a = pendingLedgerFor?.slugs.get(slug);
  if (a === undefined) return null;
  pendingLedgerFor.slugs.delete(slug);
  let r = pendingLedgerFor.own ? a : resetLedgerEntryKeepingTimes(a);
  let s = t - r.savedAt;
  if (s > ledgerMaxAgeMs() || s < -LEDGER_MAX_FUTURE_SKEW_MS) {
    logFeatureSad("artifact_comments_autoreact", "ledger_stale");
    return null;
  }
  return {
    ...r,
    turnTimestamps: r.turnTimestamps
      .filter((turnTimestamp) => t - turnTimestamp < 3600000)
      .map((turnTimestamp) => Math.min(turnTimestamp, t)),
  };
}
//@ chunk-9tgt55am.js:5984-6137 placement
function resetLedgerEntry(e) {
  return {
    savedAt: e.savedAt,
    stampHighWater: null,
    everBaselined: false,
    everHadThreads: e.everHadThreads,
    turnTimestamps: e.turnTimestamps,
    threads: [],
  };
}
//@ chunk-9tgt55am.js:6137-6209 placement
function resetLedgerEntryKeepingTimes(e) {
  return {
    ...resetLedgerEntry(e),
    ...(e.interrupted === true && {
      interrupted: true,
    }),
  };
}
//@ chunk-9tgt55am.js:6209-6324 placement
/**
 * 把台账里某个 slug 的自动回复记录重置为空线程（保留保存时间与回合时间戳），并标记锁存已变化。
 */
function resetLedgerSlug(e) {
  loadAutoreactLedger();
  let pendingLedger = getLiveState().autoReact.pendingLedger;
  let n = pendingLedger?.slugs.get(e);
  if (n !== undefined) {
    pendingLedger.slugs.set(e, resetLedgerEntry(n));
    markLatchChanged(e);
  }
}
//@ chunk-9tgt55am.js:6324-6434 placement
/**
 * 把台账里所有 slug 的自动回复记录重置为空线程，并标记锁存已变化。
 */
function resetAllLedgerSlugs() {
  loadAutoreactLedger();
  let pendingLedger = getLiveState().autoReact.pendingLedger;
  for (let [t, n] of pendingLedger?.slugs ?? []) {
    pendingLedger.slugs.set(t, resetLedgerEntry(n));
    markLatchChanged(t);
  }
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
      ...(n.ownReplyIdsIncomplete === true && {
        ownReplyIdsIncomplete: true,
      }),
    }))
    .filter((t) => autoreactLedgerSchema().thread.safeParse(t).success);
}
//@ chunk-9tgt55am.js:6762-7167 placement
function buildLedgerArtifactEntry(e, t, n, a) {
  let { autoReact } = getLiveState();
  let s = !autoReact.userDisarmed && isSlugSwept(e);
  let d =
    autoReact.userDisarmed || (t.accountUuid !== null && t.accountUuid !== a) || (isSlugStopped(e) && !s);
  return {
    savedAt: Math.max(t.lastScanAt ?? n, latchChangedAt(e) ?? 0),
    stampHighWater: d ? null : t.stampHighWater,
    everBaselined: d ? false : t.everBaselined,
    everHadThreads: t.everHadThreads,
    turnTimestamps: t.turnTimestamps
      .filter((turnTimestamp) => n - turnTimestamp < 3600000)
      .slice(-MAX_TURN_TIMESTAMPS),
    threads: d ? [] : serializeThreadStates(t),
    ...(s && {
      interrupted: true,
    }),
  };
}
//@ chunk-9tgt55am.js:7167-7299 placement
function makeInterruptedLedgerEntry(savedAt) {
  return {
    savedAt,
    stampHighWater: null,
    everBaselined: false,
    everHadThreads: false,
    turnTimestamps: [],
    threads: [],
    interrupted: true,
  };
}
//@ chunk-9tgt55am.js:7299-7442 placement
function markLedgerEntryInterrupted(e) {
  return {
    savedAt: e.savedAt,
    stampHighWater: null,
    everBaselined: false,
    everHadThreads: e.everHadThreads,
    turnTimestamps: [],
    interrupted: true,
  };
}
//@ chunk-9tgt55am.js:7442-8840 placement
function buildLedgerSnapshot(e, savedAt, n) {
  let { autoReact } = getLiveState();
  let r = listLedgerSlugs(e);
  let s = new Set([...autoReact.artifacts.keys(), ...(getPendingLedgerFor(e)?.slugs.keys() ?? [])]);
  let d = autoReact.userDisarmed
    ? []
    : [...sweptSlugs()]
        .filter((S) => {
          if (s.has(S)) return false;
          return !isSlugOrphaned(S);
        })
        .map((S) => [S, makeInterruptedLedgerEntry(savedAt)]);
  let h = [
    ...[...autoReact.artifacts.entries()]
      .reverse()
      .map(([S, w]) => [S, buildLedgerArtifactEntry(S, w, savedAt, n)]),
    ...[...r, ...d]
      .filter(([S]) => !autoReact.artifacts.has(S))
      .flatMap(([S, { interrupted: w, ...L }]) => {
        let P = !autoReact.userDisarmed && isSlugSwept(S);
        let D = !P && isSlugStopped(S);
        let G = L.savedAt - savedAt > LEDGER_MAX_FUTURE_SKEW_MS;
        let V = savedAt - L.savedAt <= ledgerMaxAgeMs() && !G;
        if (!V && !P && w !== true) return [];
        return [
          [
            S,
            {
              ...(V && !D ? L : resetLedgerEntry(L)),
              savedAt: Math.max(G ? savedAt : L.savedAt, latchChangedAt(S) ?? 0),
              turnTimestamps: L.turnTimestamps
                .filter((turnTimestamp) => savedAt - turnTimestamp < 3600000)
                .map((turnTimestamp) => Math.min(turnTimestamp, savedAt)),
              ...(P && {
                interrupted: true,
              }),
            },
          ],
        ];
      })
      .sort(([, S], [, w]) => w.savedAt - S.savedAt),
  ];
  for (let j = h.length - 1; j >= 0; j--) if (isSlugYielded(h[j][0])) h.splice(j, 1);
  h.sort(([, S], [, w]) => Number(w.interrupted === true) - Number(S.interrupted === true));
  let y = {};
  let C = new Map();
  let sliced = h.slice(0, MAX_LEDGER_ARTIFACTS);
  let max = Math.max(
    MIN_PART_BUDGET_CHARS,
    Math.floor(LEDGER_PART_BUDGET_BYTES / Math.max(1, sliced.length)) - 1024,
  );
  let N = 2;
  for (let [S, w] of sliced) {
    let { threads, ...P } = w;
    let D = threads === undefined ? 0 : jsonStringify(threads).length;
    let G = threads !== undefined && threads.length <= MAX_LEDGER_THREADS && D <= max;
    y[S] = G
      ? {
          ...P,
          threads,
        }
      : P;
    N += jsonStringify(P).length + S.length + 4;
    if (G) {
      C.set(S, D);
      N += D + 12;
    }
  }
  for (let [S, w] of [...C].sort(([, L], [, P]) => P - L)) {
    if (N <= LEDGER_PART_BUDGET_BYTES) break;
    let { threads, ...P } = y[S];
    y[S] = P;
    N -= w + 12;
  }
  for (let [S] of [...sliced].reverse()) {
    if (N <= LEDGER_PART_BUDGET_BYTES) break;
    let w = y[S];
    let L = jsonStringify(w).length;
    if (w.interrupted === true) {
      let P = markLedgerEntryInterrupted(w);
      let D = jsonStringify(P).length;
      if (D < L) {
        y[S] = P;
        N -= L - D;
      }
    } else {
      delete y[S];
      N -= L + S.length + 4;
    }
  }
  return {
    artifacts: y,
  };
}
//@ chunk-9tgt55am.js:8840-9014 placement
function ledgerFingerprint(artifacts) {
  return jsonStringify(
    Object.entries(artifacts).map(([key, value]) => [
      key,
      {
        ...value,
        savedAt: 0,
        threads: value.threads?.map((thread) => ({
          ...thread,
          seen: thread.seen.length > 0,
          sent: thread.sent.filter(([, r]) => r !== null),
        })),
      },
    ]),
  );
}
//@ chunk-9tgt55am.js:9014-9112 placement
function scheduleLedgerWriteSafely(e = {}) {
  try {
    scheduleLedgerWrite(e);
  } catch (error) {
    logError(error);
    logFeatureSad("artifact_comments_autoreact", "ledger_write_failed");
  }
}
//@ chunk-9tgt55am.js:9112-9288 placement
function buildLedgerEntry(e, t) {
  let n = gatewayAccountUuidLower();
  let { artifacts } = buildLedgerSnapshot(e, t, n);
  if (Object.keys(artifacts).length === 0) return null;
  return {
    type: "artifact-autoreact-ledger",
    v: 1,
    sessionId: e,
    accountUuid: n,
    artifacts,
  };
}
//@ chunk-9tgt55am.js:9288-9606 placement
function scheduleLedgerWrite({ force = false, urgent = false }) {
  let { autoReact } = getLiveState();
  if (autoReact.ledgerTimer !== undefined) {
    clearTimeout(autoReact.ledgerTimer);
    autoReact.ledgerTimer = undefined;
  }
  let sessionId = getSessionId();
  let ledgerOwnerSid = autoReact.ledgerOwnerSid ?? sessionId;
  let now = Date.now();
  if (ledgerOwnerSid !== sessionId && !urgent) {
    autoReact.ledgerDeferredSince ??= now;
    if (now - autoReact.ledgerDeferredSince < LEDGER_MIN_WRITE_INTERVAL_MS) scheduleLedgerFlush();
    return;
  }
  autoReact.ledgerDeferredSince = null;
  writeAutoreactLedger(ledgerOwnerSid, now, force);
  if (ledgerOwnerSid !== sessionId) writeAutoreactLedger(sessionId, now, force);
}
//@ chunk-9tgt55am.js:9606-10380 placement
function writeAutoreactLedger(e, t, force) {
  let { autoReact } = getLiveState();
  if (autoReact.ledgerRetiredSids.has(e)) return;
  let ledgerEntry = buildLedgerEntry(e, t);
  if (ledgerEntry === null) return;
  let s = ledgerFingerprint(ledgerEntry.artifacts);
  let transcriptWriteFailureSeq = getTranscriptWriteFailureSeq();
  if (
    !force &&
    s === autoReact.ledgerLastWritten &&
    e === autoReact.ledgerLastWriteSid &&
    ledgerEntry.accountUuid === autoReact.ledgerLastWriteAccount &&
    transcriptWriteFailureSeq === autoReact.ledgerFailureSeqAtWrite &&
    t - (autoReact.ledgerLastWriteAt ?? 0) < LEDGER_MIN_WRITE_INTERVAL_MS
  )
    return;
  autoReact.ledgerLastWritten = s;
  autoReact.ledgerLastWriteAt = t;
  autoReact.ledgerLastWriteSid = e;
  autoReact.ledgerOwnerSid ??= e;
  autoReact.ledgerLastWriteAccount = ledgerEntry.accountUuid;
  autoReact.ledgerFailureSeqAtWrite = transcriptWriteFailureSeq;
  autoReact.ledgerExitReStamp ??= registerTranscriptExitReStamp(buildExitLedgerEntry);
  let h = recordArtifactAutoReactLedger(
    ledgerEntry,
    autoReact.ledgerStorageV5 ?? getLiveState().commentMonitorIntent.storageV5,
  ).catch(() => {
    if (autoReact.ledgerLastWritten === s) {
      autoReact.ledgerLastWritten = null;
      autoReact.ledgerLastWriteAt = null;
    }
    logFeatureSad("artifact_comments_autoreact", "ledger_write_failed");
  });
  autoReact.ledgerLastAppend = Promise.all([autoReact.ledgerLastAppend, h]).then(() => {});
}
//@ chunk-9tgt55am.js:10380-10443 placement
function setLedgerStorage(storageV5) {
  if (storageV5 !== undefined) getLiveState().autoReact.ledgerStorageV5 = storageV5;
}
//@ chunk-9tgt55am.js:10443-10568 placement
/**
 * 记下台账使用的存储，并在当前会话未被退役时把它设为台账所属会话。
 */
function claimLedgerOwnership(storageV5) {
  let { autoReact } = getLiveState();
  if (storageV5 !== undefined) autoReact.ledgerStorageV5 = storageV5;
  if (!autoReact.ledgerRetiredSids.has(getSessionId())) autoReact.ledgerOwnerSid = getSessionId();
}
//@ chunk-9tgt55am.js:10568-10831 placement
function flushAutoreactLedger(e) {
  let { autoReact } = getLiveState();
  setLedgerStorage(e?.storageV5);
  autoReact.ledgerExitCleanup ??= registerCleanup(flushLedgerOnExit);
  let ledgerDebounceMsOverride = autoReact.ledgerDebounceMsOverride ?? LEDGER_DEBOUNCE_MS;
  if (autoReact.ledgerOwnerSid === null || autoReact.ledgerOwnerSid === getSessionId())
    autoReact.ledgerDeferredSince = null;
  if (e?.flush === true || ledgerDebounceMsOverride <= 0) {
    scheduleLedgerWriteSafely({
      urgent: e?.flush === true,
    });
    return;
  }
  scheduleLedgerFlush();
}
//@ chunk-9tgt55am.js:10831-10992 placement
function scheduleLedgerFlush() {
  let { autoReact } = getLiveState();
  let ledgerDebounceMsOverride = autoReact.ledgerDebounceMsOverride ?? LEDGER_DEBOUNCE_MS;
  if (autoReact.ledgerTimer === undefined && ledgerDebounceMsOverride > 0) {
    autoReact.ledgerTimer = setTimeout(() => scheduleLedgerWriteSafely(), ledgerDebounceMsOverride);
    autoReact.ledgerTimer.unref?.();
  }
}
//@ chunk-9tgt55am.js:10992-11086 placement
async function flushLedgerOnExit() {
  scheduleLedgerWriteSafely({
    force: true,
    urgent: true,
  });
  await getLiveState().autoReact.ledgerLastAppend;
  await flushSessionStorage();
}
//@ chunk-9tgt55am.js:11086-11284 placement
function buildExitLedgerEntry() {
  let { autoReact } = getLiveState();
  let sessionId = getSessionId();
  if (
    autoReact.ledgerFailureSeqAtWrite === null ||
    getTranscriptWriteFailureSeq() === autoReact.ledgerFailureSeqAtWrite ||
    (autoReact.ledgerOwnerSid !== null && sessionId !== autoReact.ledgerOwnerSid)
  )
    return;
  return buildLedgerEntry(sessionId, Date.now()) ?? undefined;
}
//@ chunk-9tgt55am.js:11284-11806 placement
function retireAutoreactLedger(e) {
  let { autoReact } = getLiveState();
  if (e?.stillCurrent !== false) {
    if (autoReact.ledgerOwnerSid !== null) autoReact.ledgerRetiredSids.add(autoReact.ledgerOwnerSid);
    autoReact.ledgerRetiredSids.add(getSessionId());
  }
  autoReact.artifacts.clear();
  autoReact.pendingLedger = null;
  orphanSweptSlugs();
  if (autoReact.ledgerTimer !== undefined) {
    clearTimeout(autoReact.ledgerTimer);
    autoReact.ledgerTimer = undefined;
  }
  autoReact.ledgerExitReStamp?.();
  autoReact.ledgerExitReStamp = undefined;
  autoReact.ledgerLastWritten = null;
  autoReact.ledgerLastWriteAt = null;
  autoReact.ledgerLastWriteSid = null;
  autoReact.ledgerLastWriteAccount = undefined;
  autoReact.ledgerFailureSeqAtWrite = null;
  autoReact.ledgerDeferredSince = null;
  autoReact.ledgerOwnerSid = null;
}
//@ chunk-9tgt55am.js:11806-11844 placement
function forgetArtifactAndFlush(slug) {
  resetLedgerSlug(slug);
  flushAutoreactLedger({
    flush: true,
  });
}
export {
  initAutoreactLedger,
  resetAllLedgerSlugs,
  flushAutoreactLedger,
  resetLedgerSlug,
  gatewayAccountUuidLower,
  takeLedgerEntry,
  claimLedgerOwnership,
  setLedgerStorage,
  retireAutoreactLedger,
  forgetArtifactAndFlush,
};
