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
  stringSchema,
  zodStrictObject,
  booleanSchema,
  array,
  tuple,
  literal,
  numberSchema,
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
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-9tgt55am.js:3469-4182 placement
/**
 * 自动回复台账（autoreact ledger）的限额与 schema：最长 1 天、最短写入间隔 1 小时、防抖 10 s、未来偏差 5 分钟、每部分 160 KB、2000 线程、每线程 500 条、600 个回合时间戳。
 */
var AUTOREACT_LEDGER_LIMITS; // deferred: uses DoctorLazy (../../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var LEDGER_MIN_WRITE_INTERVAL_MS;
var LEDGER_DEBOUNCE_MS;
var LEDGER_MAX_FUTURE_SKEW_MS;
var MIN_PART_BUDGET_CHARS;
var LEDGER_PART_BUDGET_BYTES;
var MAX_LEDGER_ARTIFACTS;
var MAX_LEDGER_THREADS;
var MAX_THREAD_ENTRIES;
var MAX_ENTRY_ID_CHARS;
var MAX_TURN_TIMESTAMPS;
var autoreactLedgerSchema;
deferInit("chunk-9tgt55am.js:3469", () => {
  AUTOREACT_LEDGER_LIMITS = 86400000;
  LEDGER_MIN_WRITE_INTERVAL_MS = 3600000;
  LEDGER_DEBOUNCE_MS = 1e4;
  LEDGER_MAX_FUTURE_SKEW_MS = 300000;
  MIN_PART_BUDGET_CHARS = 32768;
  LEDGER_PART_BUDGET_BYTES = 163840;
  MAX_LEDGER_ARTIFACTS = MAX_LOG_LINE_CHARS;
  MAX_LEDGER_THREADS = 2000;
  MAX_THREAD_ENTRIES = 500;
  MAX_ENTRY_ID_CHARS = 128;
  MAX_TURN_TIMESTAMPS = 600;
  autoreactLedgerSchema = DoctorLazy(() => {
    let updatedAt = stringSchema()
      .max(MAX_ENTRY_ID_CHARS)
      .refine((value) => parseTimestamp(value) !== null);
    let threadId = stringSchema().min(1).max(MAX_ENTRY_ID_CHARS);
    let artifactSchema = zodStrictObject({
      id: threadId,
      activatedAt: updatedAt.nullable(),
      activatedAtObserved: booleanSchema(),
      seen: array(threadId).max(MAX_THREAD_ENTRIES),
      sent: array(tuple([threadId, updatedAt.nullable()])).max(MAX_THREAD_ENTRIES),
      ownReplyIds: array(threadId).max(MAX_THREAD_ENTRIES),
      ownReplyIdsIncomplete: literal(true).optional(),
    });
    let finite = numberSchema().refine(Number.isFinite);
    let artifact = zodStrictObject({
      savedAt: finite,
      stampHighWater: updatedAt.nullable(),
      everBaselined: booleanSchema(),
      everHadThreads: booleanSchema(),
      turnTimestamps: array(finite).max(MAX_TURN_TIMESTAMPS),
      threads: array(artifactSchema).max(MAX_LEDGER_THREADS).optional(),
      interrupted: literal(true).optional(),
    });
    let envelope = zodStrictObject({
      type: literal("artifact-autoreact-ledger"),
      v: literal(1),
      sessionId: stringSchema(),
      accountUuid: stringSchema().nullable(),
      artifacts: record(stringSchema(), unknown()),
    });
    return {
      thread: artifactSchema,
      artifact,
      envelope,
    };
  });
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
function parseAutoreactLedger(raw) {
  let out = new Map();
  let schema = autoreactLedgerSchema();
  let envelope = schema.envelope.safeParse(raw);
  if (!envelope.success || envelope.data.sessionId !== getSessionId()) {
    logFeatureSad("artifact_comments_autoreact", "ledger_invalid");
    return out;
  }
  let accountChanged = (envelope.data.accountUuid?.toLowerCase() ?? null) !== gatewayAccountUuidLower();
  if (accountChanged) logFeatureSad("artifact_comments_autoreact", "ledger_foreign_account");
  let entries = Object.entries(envelope.data.artifacts);
  if (entries.length > MAX_LEDGER_ARTIFACTS) {
    logFeatureSad("artifact_comments_autoreact", "ledger_invalid");
    return out;
  }
  for (let [slug, entry] of entries) {
    let parsed = schema.artifact.safeParse(entry);
    if (!ARTIFACT_SLUG_RE.test(slug) || !parsed.success) {
      logFeatureSad("artifact_comments_autoreact", "ledger_slug_invalid");
      continue;
    }
    out.set(slug, accountChanged ? resetLedgerEntryKeepingTimes(parsed.data) : parsed.data);
  }
  return out;
}
//@ chunk-9tgt55am.js:4874-5295 placement
function loadAutoreactLedger() {
  let { autoReact } = getLiveState();
  let sessionId = getSessionId();
  let state =
    ledgerSessionId(peekResumedArtifactAutoReactLedger()) === sessionId
      ? takeResumedArtifactAutoReactLedger()
      : undefined;
  let gatewayUuid = gatewayAccountUuidLower();
  if (state !== undefined) {
    autoReact.ledgerRetiredSids.delete(sessionId);
    autoReact.ledgerOwnerSid ??= sessionId;
    autoReact.pendingLedger = {
      sid: sessionId,
      accountUuid: gatewayUuid,
      slugs: parseAutoreactLedger(state),
    };
    for (let [slug, entry] of autoReact.pendingLedger.slugs)
      if (entry.interrupted === true) {
        let swept = isSlugSwept(slug);
        sweepSlug(slug);
        if (!swept) markLatchChanged(slug, entry.savedAt);
      }
  }
  let pendingLedger = autoReact.pendingLedger;
  if (pendingLedger?.sid === sessionId && pendingLedger.accountUuid === null)
    pendingLedger.accountUuid = gatewayUuid;
  return pendingLedger?.sid === sessionId && pendingLedger.accountUuid === gatewayUuid
    ? pendingLedger.slugs
    : null;
}
//@ chunk-9tgt55am.js:5295-5452 placement
function getPendingLedgerFor(sessionId = getSessionId()) {
  if (sessionId === getSessionId()) loadAutoreactLedger();
  let { pendingLedger } = getLiveState().autoReact;
  return pendingLedger?.sid === sessionId
    ? {
        slugs: pendingLedger.slugs,
        own: pendingLedger.accountUuid === null || pendingLedger.accountUuid === gatewayAccountUuidLower(),
      }
    : null;
}
//@ chunk-9tgt55am.js:5452-5570 placement
function listLedgerSlugs(options) {
  let pendingLedgerFor = getPendingLedgerFor(options);
  if (pendingLedgerFor === null) return [];
  let entries = [...pendingLedgerFor.slugs.entries()];
  return pendingLedgerFor.own
    ? entries
    : entries.map(([slug, entry]) => [slug, resetLedgerEntryKeepingTimes(entry)]);
}
//@ chunk-9tgt55am.js:5570-5658 placement
function ledgerSessionId(sessionId) {
  return typeof sessionId === "object" && sessionId !== null && "sessionId" in sessionId
    ? sessionId.sessionId
    : undefined;
}
//@ chunk-9tgt55am.js:5658-5678 placement
function initAutoreactLedger() {
  loadAutoreactLedger();
}
//@ chunk-9tgt55am.js:5678-5984 placement
function takeLedgerEntry(slug, now = Date.now()) {
  let pendingLedgerFor = getPendingLedgerFor();
  let entry = pendingLedgerFor?.slugs.get(slug);
  if (entry === undefined) return null;
  pendingLedgerFor.slugs.delete(slug);
  let kept = pendingLedgerFor.own ? entry : resetLedgerEntryKeepingTimes(entry);
  let ageMs = now - kept.savedAt;
  if (ageMs > ledgerMaxAgeMs() || ageMs < -LEDGER_MAX_FUTURE_SKEW_MS) {
    logFeatureSad("artifact_comments_autoreact", "ledger_stale");
    return null;
  }
  return {
    ...kept,
    turnTimestamps: kept.turnTimestamps
      .filter((turnTimestamp) => now - turnTimestamp < 3600000)
      .map((turnTimestamp) => Math.min(turnTimestamp, now)),
  };
}
//@ chunk-9tgt55am.js:5984-6137 placement
function resetLedgerEntry(slug) {
  return {
    savedAt: slug.savedAt,
    stampHighWater: null,
    everBaselined: false,
    everHadThreads: slug.everHadThreads,
    turnTimestamps: slug.turnTimestamps,
    threads: [],
  };
}
//@ chunk-9tgt55am.js:6137-6209 placement
function resetLedgerEntryKeepingTimes(slug) {
  return {
    ...resetLedgerEntry(slug),
    ...(slug.interrupted === true && {
      interrupted: true,
    }),
  };
}
//@ chunk-9tgt55am.js:6209-6324 placement
/**
 * 把台账里某个 slug 的自动回复记录重置为空线程（保留保存时间与回合时间戳），并标记锁存已变化。
 */
function resetLedgerSlug(slug) {
  loadAutoreactLedger();
  let pendingLedger = getLiveState().autoReact.pendingLedger;
  let entry = pendingLedger?.slugs.get(slug);
  if (entry !== undefined) {
    pendingLedger.slugs.set(slug, resetLedgerEntry(entry));
    markLatchChanged(slug);
  }
}
//@ chunk-9tgt55am.js:6324-6434 placement
/**
 * 把台账里所有 slug 的自动回复记录重置为空线程，并标记锁存已变化。
 */
function resetAllLedgerSlugs() {
  loadAutoreactLedger();
  let pendingLedger = getLiveState().autoReact.pendingLedger;
  for (let [slug, entry] of pendingLedger?.slugs ?? []) {
    pendingLedger.slugs.set(slug, resetLedgerEntry(entry));
    markLatchChanged(slug);
  }
}
//@ chunk-9tgt55am.js:6434-6762 placement
function serializeThreadStates(state) {
  return [...state.threads.entries()]
    .map(([key, value]) => ({
      id: key,
      activatedAt: value.activatedAt,
      activatedAtObserved: value.activatedAtObserved,
      seen: [...value.seen],
      sent: [...value.sentToClaudeAt.entries()],
      ownReplyIds: [...value.ownReplyIds],
      ...(value.ownReplyIdsIncomplete === true && {
        ownReplyIdsIncomplete: true,
      }),
    }))
    .filter((thread) => autoreactLedgerSchema().thread.safeParse(thread).success);
}
//@ chunk-9tgt55am.js:6762-7167 placement
function buildLedgerArtifactEntry(slug, entry, thread, savedAt) {
  let { autoReact } = getLiveState();
  let swept = !autoReact.userDisarmed && isSlugSwept(slug);
  let ledgerEntry =
    autoReact.userDisarmed ||
    (entry.accountUuid !== null && entry.accountUuid !== savedAt) ||
    (isSlugStopped(slug) && !swept);
  return {
    savedAt: Math.max(entry.lastScanAt ?? thread, latchChangedAt(slug) ?? 0),
    stampHighWater: ledgerEntry ? null : entry.stampHighWater,
    everBaselined: ledgerEntry ? false : entry.everBaselined,
    everHadThreads: entry.everHadThreads,
    turnTimestamps: entry.turnTimestamps
      .filter((turnTimestamp) => thread - turnTimestamp < 3600000)
      .slice(-MAX_TURN_TIMESTAMPS),
    threads: ledgerEntry ? [] : serializeThreadStates(entry),
    ...(swept && {
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
function markLedgerEntryInterrupted(systemRow) {
  return {
    savedAt: systemRow.savedAt,
    stampHighWater: null,
    everBaselined: false,
    everHadThreads: systemRow.everHadThreads,
    turnTimestamps: [],
    interrupted: true,
  };
}
//@ chunk-9tgt55am.js:7442-8840 placement
function buildLedgerSnapshot(store, entry, options) {
  let { autoReact } = getLiveState();
  let ledgerSlugs = listLedgerSlugs(store);
  let liveSlugs = new Set([
    ...autoReact.artifacts.keys(),
    ...(getPendingLedgerFor(store)?.slugs.keys() ?? []),
  ]);
  let interruptedEntries = autoReact.userDisarmed
    ? []
    : [...sweptSlugs()]
        .filter((slug) => {
          if (liveSlugs.has(slug)) return false;
          return !isSlugOrphaned(slug);
        })
        .map((slug) => [slug, makeInterruptedLedgerEntry(entry)]);
  let entries = [
    ...[...autoReact.artifacts.entries()]
      .reverse()
      .map(([slug, state]) => [slug, buildLedgerArtifactEntry(slug, state, entry, options)]),
    ...[...ledgerSlugs, ...interruptedEntries]
      .filter(([slug]) => !autoReact.artifacts.has(slug))
      .flatMap(([slug, { interrupted, ...entry_2 }]) => {
        let swept = !autoReact.userDisarmed && isSlugSwept(slug);
        let stopped = !swept && isSlugStopped(slug);
        let futureSkew = entry_2.savedAt - entry > LEDGER_MAX_FUTURE_SKEW_MS;
        let fresh = entry - entry_2.savedAt <= ledgerMaxAgeMs() && !futureSkew;
        if (!fresh && !swept && interrupted !== true) return [];
        return [
          [
            slug,
            {
              ...(fresh && !stopped ? entry_2 : resetLedgerEntry(entry_2)),
              savedAt: Math.max(futureSkew ? entry : entry_2.savedAt, latchChangedAt(slug) ?? 0),
              turnTimestamps: entry_2.turnTimestamps
                .filter((turnTimestamp) => entry - turnTimestamp < 3600000)
                .map((turnTimestamp) => Math.min(turnTimestamp, entry)),
              ...(swept && {
                interrupted: true,
              }),
            },
          ],
        ];
      })
      .sort(([, entryA], [, entryB]) => entryB.savedAt - entryA.savedAt),
  ];
  for (let j = entries.length - 1; j >= 0; j--) if (isSlugYielded(entries[j][0])) entries.splice(j, 1);
  entries.sort(
    ([, entryA], [, entryB]) => Number(entryB.interrupted === true) - Number(entryA.interrupted === true),
  );
  let artifacts = {};
  let threadSizes = new Map();
  let sliced = entries.slice(0, MAX_LEDGER_ARTIFACTS);
  let max = Math.max(
    MIN_PART_BUDGET_CHARS,
    Math.floor(LEDGER_PART_BUDGET_BYTES / Math.max(1, sliced.length)) - 1024,
  );
  let bytes = 2;
  for (let [slug, entry] of sliced) {
    let { threads, ...withoutThreads } = entry;
    let threadsSize = threads === undefined ? 0 : jsonStringify(threads).length;
    let keepThreads = threads !== undefined && threads.length <= MAX_LEDGER_THREADS && threadsSize <= max;
    artifacts[slug] = keepThreads
      ? {
          ...withoutThreads,
          threads,
        }
      : withoutThreads;
    bytes += jsonStringify(withoutThreads).length + slug.length + 4;
    if (keepThreads) {
      threadSizes.set(slug, threadsSize);
      bytes += threadsSize + 12;
    }
  }
  for (let [slug, size] of [...threadSizes].sort(([, sizeA], [, sizeB]) => sizeB - sizeA)) {
    if (bytes <= LEDGER_PART_BUDGET_BYTES) break;
    let { threads, ...withoutThreads } = artifacts[slug];
    artifacts[slug] = withoutThreads;
    bytes -= size + 12;
  }
  for (let [slug] of [...sliced].reverse()) {
    if (bytes <= LEDGER_PART_BUDGET_BYTES) break;
    let entry = artifacts[slug];
    let size = jsonStringify(entry).length;
    if (entry.interrupted === true) {
      let marked = markLedgerEntryInterrupted(entry);
      let markedSize = jsonStringify(marked).length;
      if (markedSize < size) {
        artifacts[slug] = marked;
        bytes -= size - markedSize;
      }
    } else {
      delete artifacts[slug];
      bytes -= size + slug.length + 4;
    }
  }
  return {
    artifacts,
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
          sent: thread.sent.filter(([, entry]) => entry !== null),
        })),
      },
    ]),
  );
}
//@ chunk-9tgt55am.js:9014-9112 placement
function scheduleLedgerWriteSafely(options = {}) {
  try {
    scheduleLedgerWrite(options);
  } catch (error) {
    logError(error);
    logFeatureSad("artifact_comments_autoreact", "ledger_write_failed");
  }
}
//@ chunk-9tgt55am.js:9112-9288 placement
function buildLedgerEntry(slug, entry) {
  let account = gatewayAccountUuidLower();
  let { artifacts } = buildLedgerSnapshot(slug, entry, account);
  if (Object.keys(artifacts).length === 0) return null;
  return {
    type: "artifact-autoreact-ledger",
    v: 1,
    sessionId: slug,
    accountUuid: account,
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
function writeAutoreactLedger(sessionId, force, force_2) {
  let { autoReact } = getLiveState();
  if (autoReact.ledgerRetiredSids.has(sessionId)) return;
  let ledgerEntry = buildLedgerEntry(sessionId, force);
  if (ledgerEntry === null) return;
  let fingerprint = ledgerFingerprint(ledgerEntry.artifacts);
  let transcriptWriteFailureSeq = getTranscriptWriteFailureSeq();
  if (
    !force_2 &&
    fingerprint === autoReact.ledgerLastWritten &&
    sessionId === autoReact.ledgerLastWriteSid &&
    ledgerEntry.accountUuid === autoReact.ledgerLastWriteAccount &&
    transcriptWriteFailureSeq === autoReact.ledgerFailureSeqAtWrite &&
    force - (autoReact.ledgerLastWriteAt ?? 0) < LEDGER_MIN_WRITE_INTERVAL_MS
  )
    return;
  autoReact.ledgerLastWritten = fingerprint;
  autoReact.ledgerLastWriteAt = force;
  autoReact.ledgerLastWriteSid = sessionId;
  autoReact.ledgerOwnerSid ??= sessionId;
  autoReact.ledgerLastWriteAccount = ledgerEntry.accountUuid;
  autoReact.ledgerFailureSeqAtWrite = transcriptWriteFailureSeq;
  autoReact.ledgerExitReStamp ??= registerTranscriptExitReStamp(buildExitLedgerEntry);
  let written = recordArtifactAutoReactLedger(
    ledgerEntry,
    autoReact.ledgerStorageV5 ?? getLiveState().commentMonitorIntent.storageV5,
  ).catch(() => {
    if (autoReact.ledgerLastWritten === fingerprint) {
      autoReact.ledgerLastWritten = null;
      autoReact.ledgerLastWriteAt = null;
    }
    logFeatureSad("artifact_comments_autoreact", "ledger_write_failed");
  });
  autoReact.ledgerLastAppend = Promise.all([autoReact.ledgerLastAppend, written]).then(() => {});
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
function flushAutoreactLedger(options) {
  let { autoReact } = getLiveState();
  setLedgerStorage(options?.storageV5);
  autoReact.ledgerExitCleanup ??= registerCleanup(flushLedgerOnExit);
  let ledgerDebounceMsOverride = autoReact.ledgerDebounceMsOverride ?? LEDGER_DEBOUNCE_MS;
  if (autoReact.ledgerOwnerSid === null || autoReact.ledgerOwnerSid === getSessionId())
    autoReact.ledgerDeferredSince = null;
  if (options?.flush === true || ledgerDebounceMsOverride <= 0) {
    scheduleLedgerWriteSafely({
      urgent: options?.flush === true,
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
  let slug = getSessionId();
  if (
    autoReact.ledgerFailureSeqAtWrite === null ||
    getTranscriptWriteFailureSeq() === autoReact.ledgerFailureSeqAtWrite ||
    (autoReact.ledgerOwnerSid !== null && slug !== autoReact.ledgerOwnerSid)
  )
    return;
  return buildLedgerEntry(slug, Date.now()) ?? undefined;
}
//@ chunk-9tgt55am.js:11284-11806 placement
function retireAutoreactLedger(reason) {
  let { autoReact } = getLiveState();
  if (reason?.stillCurrent !== false) {
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
