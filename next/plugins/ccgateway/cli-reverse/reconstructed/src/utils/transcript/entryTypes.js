/**
 * utils/transcript/entryTypes.ts
 *
 * 2.1.316 新增：转录条目类型
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (18)
 * attribution: placement 17, layout 1
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  create_3,
  create,
  create_25,
  create_2,
  create_20,
  create_6,
} from "../../../vendor/zod/lib/index.mjs";
import { sumByAliasField } from "../../services/artifacts/frameApi.js";
import { codeModeAccepted } from "../codeMode/accepted.js";
import { jsonParseRaw, jsonStringify } from "../slowOperations.js";
import { normalizeUuidOrNull } from "../agentId.js";
import { MAX_LOG_LINE_CHARS } from "../../types/logs.js";
import { isCompactBoundaryMessage } from "../messages.js";
import { hasPrefix } from "../sessionStoragePortable.js";
import { isRemoteEnvironmentAny } from "../remoteEnvironment.js";
import { isBeforeCompactBoundary } from "../../components/tasks/BackgroundTaskStatus.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:285765-286560 placement
/**
 * 定义转录中 cost-state 条目：费用、耗时、行数与各模型用量的 zod schema（非负有限且不超过上限，模型名不含控制字符）。
 */
var MAX_COST_USD; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var MODEL_USAGE_TOKEN_KEYS;
var MAX_COUNTER_VALUE;
var MAX_DURATION_VALUE;
var CostStateEntrySchema;
deferInit("chunk-5xgkngpb.js:285765", () => {
  MAX_COST_USD = 1e9;
  MODEL_USAGE_TOKEN_KEYS = Object.keys({
    inputTokens: true,
    outputTokens: true,
    cacheReadInputTokens: true,
    cacheCreationInputTokens: true,
  });
  MAX_COUNTER_VALUE = 1000000000000000;
  MAX_DURATION_VALUE = MAX_COUNTER_VALUE;
  CostStateEntrySchema = DoctorLazy(() => {
    let counter = create_3().nonnegative().finite().max(MAX_COUNTER_VALUE);
    return create({
      type: create_25("cost-state"),
      sessionId: create_2(),
      totalCostUSD: counter.max(MAX_COST_USD),
      totalAPIDuration: counter,
      totalAPIDurationWithoutRetries: counter,
      totalToolDuration: counter,
      totalLinesAdded: counter,
      totalLinesRemoved: counter,
      totalDuration: counter,
      startTime: counter,
      modelUsage: create_20(
        create_2().regex(/^[^\p{Cc}\p{Cf}]+$/u),
        create({
          inputTokens: counter,
          outputTokens: counter,
          thinkingTokens: counter.optional(),
          cacheReadInputTokens: counter,
          cacheCreationInputTokens: counter,
          cacheCreationEphemeral5mInputTokens: counter.optional(),
          cacheCreationEphemeral1hInputTokens: counter.optional(),
          webSearchRequests: counter,
          costUSD: counter,
        }),
      ).refine((modelUsage) =>
        MODEL_USAGE_TOKEN_KEYS.every(
          (field) => sumByAliasField(Object.values(modelUsage), field) <= MAX_DURATION_VALUE,
        ),
      ),
      hasUnknownModelCost: create_6().optional(),
    });
  });
});
//@ chunk-5xgkngpb.js:286560-286688 layout
function stripToolUseIdBookkeeping(message) {
  if (codeModeAccepted() && message.type === "user") {
    delete message.hiddenToolUseIds;
    delete message.detachedToolUseIds;
    delete message.withheldScriptToolUseId;
  }
}
//@ chunk-5xgkngpb.js:286688-286854 placement
/**
 * 在笔记本端（laptop leg）注入的记忆上下文附件。
 */
function isLaptopMemoryAttachment(message) {
  return (
    message.type === "attachment" &&
    (message.attachment.type === "cowork_memory_context" ||
      message.attachment.type === "account_memory_recall") &&
    message.attachment.leg === "laptop"
  );
}
//@ chunk-5xgkngpb.js:287459-288733 placement
/**
 * 转录条目类型表：哪些算转录行、哪些是边界清除或累积/末次覆盖。
 */
var TRANSCRIPT_ENTRY_TYPES_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var TRANSCRIPT_ENTRY_TYPES;
deferInit("chunk-5xgkngpb.js:287459", () => {
  TRANSCRIPT_ENTRY_TYPES_2 = {
    user: "transcript",
    assistant: "transcript",
    system: "transcript",
    attachment: "transcript",
    progress: "boundary-cleared",
    "file-history-snapshot": "boundary-cleared",
    "file-history-delta": "boundary-cleared",
    "last-prompt": "boundary-cleared",
    "continued-in": "boundary-cleared",
    "content-replacement": "accumulate",
    "api-request-shape": "boundary-cleared",
    "api-request-blob": "boundary-cleared",
    "api-request": "boundary-cleared",
    "fork-context-ref": "accumulate",
    "frame-link": "accumulate",
    summary: "last-wins",
    "custom-title": "last-wins",
    "ended-by-model": "last-wins",
    "ai-title": "last-wins",
    tag: "last-wins",
    relocated: "last-wins",
    "agent-name": "last-wins",
    "agent-color": "last-wins",
    "agent-setting": "last-wins",
    "pr-link": "last-wins",
    "artifact-comment-monitor": "accumulate",
    "artifact-autoreact-ledger": "last-wins",
    "bridge-session": "last-wins",
    "history-suppression": "last-wins",
    "attribution-snapshot": "last-wins",
    mode: "last-wins",
    "permission-mode": "last-wins",
    "isolation-latch": "last-wins",
    "session-owner": "last-wins",
    "dev-mods": "last-wins",
    "memory-mode": "accumulate",
    "atis-latch": "last-wins",
    "tools-used": "last-wins",
    "worktree-state": "last-wins",
    "cost-state": "last-wins",
    "queue-operation": "last-wins",
    "observer-ref": "last-wins",
  };
  TRANSCRIPT_ENTRY_TYPES = new Set(["attribution-snapshot", "artifact-autoreact-ledger"]);
});
//@ chunk-5xgkngpb.js:288733-288805 placement
function accumulateKindOf(type) {
  return type === "repl-mode" ? "last-wins" : (TRANSCRIPT_ENTRY_TYPES_2[type] ?? "accumulate");
}
//@ chunk-5xgkngpb.js:288805-288918 placement
function parseJsonSkippingNuls(text) {
  if (!text) return;
  let start = 0;
  while (text.charCodeAt(start) === 0) start++;
  try {
    return jsonParseRaw(start > 0 ? text.slice(start) : text);
  } catch {
    return;
  }
}
//@ chunk-5xgkngpb.js:288918-289059 placement
var buffer_5; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var buffer_2;
var ARTIFACT_LEDGER_PREFIX_LEN;
deferInit("chunk-5xgkngpb.js:288918", () => {
  buffer_5 = Buffer.from('{"type":"artifact-autoreact-ledger"');
  buffer_2 = Buffer.from('{"type":"artifact-autoreact-ledger","v":1,"sessionId":"');
  ARTIFACT_LEDGER_PREFIX_LEN = 36;
});
//@ chunk-5xgkngpb.js:289059-289119 placement
function skipNuls(buffer, start, end) {
  let index = start;
  while (index < end && buffer[index] === 0) index++;
  return index;
}
//@ chunk-5xgkngpb.js:289236-289389 placement
function readEnvelopeSessionId(envelope) {
  let prefixLength = buffer_2.length;
  if (
    envelope.length < prefixLength + ARTIFACT_LEDGER_PREFIX_LEN ||
    envelope.compare(buffer_2, 0, prefixLength, 0, prefixLength) !== 0
  )
    return null;
  let str = envelope.toString("latin1", prefixLength, prefixLength + ARTIFACT_LEDGER_PREFIX_LEN);
  return normalizeUuidOrNull(str) === null ? null : str;
}
//@ chunk-5xgkngpb.js:289389-289596 placement
function resetArtifactLedgerState(record, source) {
  let { artifacts } = record;
  if (typeof artifacts !== "object" || artifacts === null || Array.isArray(artifacts)) return record;
  let resetArtifacts = new Map();
  for (let [key, value] of Object.entries(artifacts))
    resetArtifacts.set(key, resetArtifactRecord(value, source));
  return {
    ...record,
    artifacts: Object.fromEntries(resetArtifacts),
  };
}
//@ chunk-5xgkngpb.js:289596-289750 placement
function resetArtifactRecord(record, source) {
  return typeof record === "object" && record !== null && !Array.isArray(record)
    ? {
        ...record,
        stampHighWater: null,
        everBaselined: false,
        threads: [],
        ...(source && {
          interrupted: true,
        }),
      }
    : record;
}
//@ chunk-5xgkngpb.js:289750-289765 placement
var MAX_FUTURE_SAVED_AT_MS = 300000;
//@ chunk-5xgkngpb.js:289765-289868 placement
function savedAtOf(record) {
  let savedAt = record?.savedAt;
  return typeof savedAt === "number" &&
    Number.isFinite(savedAt) &&
    savedAt <= Date.now() + MAX_FUTURE_SAVED_AT_MS
    ? savedAt
    : 0;
}
//@ chunk-5xgkngpb.js:289868-289911 placement
function interruptedFlag(record) {
  return record?.interrupted === true;
}
//@ chunk-5xgkngpb.js:289911-290159 placement
function artifactRecordRank(record) {
  if (typeof record !== "object" || record === null || Array.isArray(record)) return 0;
  let artifactRecord = record;
  if (artifactRecord.interrupted === true) return 2;
  let hasNoThreads =
    artifactRecord.threads === undefined ||
    (Array.isArray(artifactRecord.threads) && artifactRecord.threads.length === 0);
  return artifactRecord.stampHighWater === null && hasNoThreads && artifactRecord.everBaselined === false
    ? 1
    : 0;
}
//@ chunk-5xgkngpb.js:290159-291489 placement
/**
 * 汇总转录中的 artifact-autoreact-ledger 行：按会话分组，账号变化时清空；同一 artifact 取 savedAt 更新（相同时取等级更低）的记录。
 */
class ArtifactLedgerCollector {
  sessions = new Map();
  unnamedTornBefore = -1;
  add(a, src) {
    if (typeof a !== "object" || a === null) return;
    let envelope = a;
    if (envelope.type !== "artifact-autoreact-ledger" || typeof envelope.sessionId !== "string") return;
    let accountUuid = typeof envelope.accountUuid === "string" ? envelope.accountUuid.toLowerCase() : null;
    let session = this.sessions.get(envelope.sessionId);
    if (session === undefined) {
      session = {
        envelope: {},
        account: null,
        records: new Map(),
        tornBefore: -1,
      };
      this.sessions.set(envelope.sessionId, session);
    } else if (session.account !== null && accountUuid !== null && accountUuid !== session.account)
      session.records.clear();
    let { artifacts, ...rest } = envelope;
    session.envelope = rest;
    session.account = accountUuid ?? session.account;
    if (typeof artifacts !== "object" || artifacts === null || Array.isArray(artifacts)) return;
    for (let [key, value] of Object.entries(artifacts)) {
      let existing = session.records.get(key);
      if (existing !== undefined) {
        let existingSavedAt = savedAtOf(existing.record);
        let savedAt = savedAtOf(value);
        if (
          savedAt < existingSavedAt ||
          (savedAt === existingSavedAt && artifactRecordRank(value) < artifactRecordRank(existing.record))
        )
          continue;
      }
      session.records.set(key, {
        record: value,
        src,
      });
    }
  }
  torn(sessionId, offset) {
    if (sessionId === null) {
      this.unnamedTornBefore = offset;
      return;
    }
    let session = this.sessions.get(sessionId);
    if (session !== undefined) session.tornBefore = offset;
  }
  finish(dropTorn) {
    let ledgers = new Map();
    for (let [sessionId, session] of this.sessions) {
      let sliced = [...session.records.entries()]
        .sort(
          ([, leftEntry], [, rightEntry]) =>
            Number(interruptedFlag(rightEntry.record)) - Number(interruptedFlag(leftEntry.record)) ||
            savedAtOf(rightEntry.record) - savedAtOf(leftEntry.record),
        )
        .slice(0, MAX_LOG_LINE_CHARS);
      let records = new Map();
      for (let [key, { record, src }] of sliced) {
        let torn = src < Math.max(session.tornBefore, this.unnamedTornBefore);
        records.set(
          key,
          torn ? resetArtifactRecord(record, true) : dropTorn ? resetArtifactRecord(record, false) : record,
        );
      }
      ledgers.set(sessionId, {
        ...session.envelope,
        type: "artifact-autoreact-ledger",
        sessionId,
        accountUuid: session.account,
        artifacts: Object.fromEntries(records),
      });
    }
    return ledgers;
  }
}
//@ chunk-5xgkngpb.js:291489-294131 placement
/**
 * 读取转录文件的各类条目（摘要、文件历史快照、增量）。
 */
async function readTranscriptEntries(lines) {
  let index = 0;
  let lastBoundaryIdx = -1;
  let boundaryMeta;
  let lastNonPreservedBoundaryIdx = -1;
  let lastBoundaryTimestamp = "";
  let byUuid = new Map();
  let snapshotIdxByMessage = new Map();
  let deltaIdxsByMessage = new Map();
  let keepIdx = new Set();
  let lastWinsByKey = new Map();
  let supersededIdx = new Set();
  let keyOf = (jsonSkippingNuls) => {
    let idValue =
      jsonSkippingNuls.type === "summary" ? jsonSkippingNuls.leafUuid : jsonSkippingNuls.sessionId;
    return `${jsonSkippingNuls.type}:${idValue ?? ""}`;
  };
  let ledger = new ArtifactLedgerCollector();
  let tornLast = false;
  let lineSizes = [];
  for await (let line of lines) {
    lineSizes.push(Buffer.byteLength(line, "utf8") + 1);
    let jsonSkippingNuls = parseJsonSkippingNuls(line);
    if (jsonSkippingNuls) {
      if (jsonSkippingNuls.type === "file-history-snapshot")
        snapshotIdxByMessage.set(jsonSkippingNuls.messageId, index);
      else if (jsonSkippingNuls.type === "file-history-delta") {
        let kindIdx = deltaIdxsByMessage.get(jsonSkippingNuls.messageId);
        if (kindIdx) kindIdx.push(index);
        else deltaIdxsByMessage.set(jsonSkippingNuls.messageId, [index]);
      }
      let kind = accumulateKindOf(jsonSkippingNuls.type);
      if (kind === "transcript") {
        let message = jsonSkippingNuls;
        byUuid.set(message.uuid, {
          parent: message.parentUuid,
          idx: index,
          isDatedAfterBoundary: message.timestamp > lastBoundaryTimestamp,
        });
        if (isCompactBoundaryMessage(message)) {
          lastBoundaryIdx = index;
          boundaryMeta = message.compactMetadata;
          lastBoundaryTimestamp = message.timestamp;
          if (!message.compactMetadata?.preservedSegment && !message.compactMetadata?.preservedMessages)
            lastNonPreservedBoundaryIdx = index;
        }
      } else if (kind === "accumulate") keepIdx.add(index);
      else if (kind === "last-wins")
        if (
          jsonSkippingNuls.type === "cost-state" &&
          !CostStateEntrySchema().safeParse(jsonSkippingNuls).success
        )
          keepIdx.add(index);
        else {
          let key = keyOf(jsonSkippingNuls);
          let previous = lastWinsByKey.get(key);
          if (previous && TRANSCRIPT_ENTRY_TYPES.has(jsonSkippingNuls.type)) supersededIdx.add(previous.idx);
          if (jsonSkippingNuls.type === "artifact-autoreact-ledger") ledger.add(jsonSkippingNuls, index);
          lastWinsByKey.set(key, {
            idx: index,
            line,
            type: jsonSkippingNuls.type,
          });
        }
    } else if (line) {
      keepIdx.add(index);
      let buffer = Buffer.from(line);
      let envelope = buffer.subarray(skipNuls(buffer, 0, buffer.length));
      let hasEnvelope = hasPrefix(envelope);
      let tornSessionId = hasEnvelope ? readEnvelopeSessionId(envelope) : null;
      if (hasEnvelope) ledger.torn(tornSessionId, index);
      tornLast = tornSessionId === null;
    }
    if (jsonSkippingNuls) tornLast = false;
    index++;
  }
  let idxMap = new Map();
  for (let [uuid, record] of ledger.finish(tornLast)) {
    let entry = lastWinsByKey.get(`artifact-autoreact-ledger:${uuid}`);
    if (entry === undefined) continue;
    entry.line = jsonStringify(record);
    idxMap.set(entry.idx, entry.line);
  }
  if (lastBoundaryIdx < 0)
    return {
      kind: "skip",
    };
  if (boundaryMeta?.preservedMessages)
    for (let uuid of boundaryMeta.preservedMessages.uuids) {
      let entryByUuid = byUuid.get(uuid);
      if (!entryByUuid)
        return {
          kind: "abort",
          reason: "preserved_uuid_missing",
        };
      keepIdx.add(entryByUuid.idx);
      let snapshotIdx = snapshotIdxByMessage.get(uuid);
      if (snapshotIdx !== undefined) keepIdx.add(snapshotIdx);
      let deltaIdxs = deltaIdxsByMessage.get(uuid);
      if (deltaIdxs) for (let deltaIdx of deltaIdxs) keepIdx.add(deltaIdx);
    }
  else if (boundaryMeta?.preservedSegment) {
    let preservedSegment = boundaryMeta.preservedSegment;
    let tailUuid = preservedSegment.tailUuid;
    let walked = new Set();
    while (tailUuid && !walked.has(tailUuid)) {
      walked.add(tailUuid);
      let entry_2 = byUuid.get(tailUuid);
      if (entry_2) {
        keepIdx.add(entry_2.idx);
        let snapshotIdx_2 = snapshotIdxByMessage.get(tailUuid);
        if (snapshotIdx_2 !== undefined) keepIdx.add(snapshotIdx_2);
        let deltaIdxs_2 = deltaIdxsByMessage.get(tailUuid);
        if (deltaIdxs_2) for (let deltaIdx_2 of deltaIdxs_2) keepIdx.add(deltaIdx_2);
        if (tailUuid === preservedSegment.headUuid) break;
      }
      tailUuid = entry_2?.parent;
    }
    if (tailUuid !== preservedSegment.headUuid)
      return {
        kind: "abort",
        reason: "preserved_walk_broken",
      };
  }
  let dropDatedAfterBoundary =
    !boundaryMeta?.preservedMessages && !boundaryMeta?.preservedSegment && isRemoteEnvironmentAny();
  let parentsToKeep = new Set();
  for (let { parent, idx, isDatedAfterBoundary } of byUuid.values()) {
    if (!parent || idx < lastBoundaryIdx) continue;
    if (dropDatedAfterBoundary && isDatedAfterBoundary) continue;
    let parentEntry = byUuid.get(parent);
    if (parentEntry && parentEntry.idx < lastBoundaryIdx && !keepIdx.has(parentEntry.idx))
      parentsToKeep.add(parentEntry.idx);
  }
  for (let index of parentsToKeep) keepIdx.add(index);
  let lostUuids = [];
  for (let [uuid, { idx }] of byUuid) if (idx < lastBoundaryIdx && !keepIdx.has(idx)) lostUuids.push(uuid);
  let keepPlan = {
    lastBoundaryIdx,
    lastNonPreservedBoundaryIdx,
    keepIdx,
    supersededLastWins: supersededIdx,
    lastMeta: lastWinsByKey,
    ledgerSubstitutes: idxMap,
    deletedUuids: lostUuids,
  };
  let reclaimableBytes = 0;
  for (let idx = 0; idx < lineSizes.length; idx++)
    if (!shouldKeepLine(keepPlan, idx)) reclaimableBytes += lineSizes[idx];
  for (let entry of lastWinsByKey.values())
    if (isBeforeCompactBoundary(keepPlan, entry))
      reclaimableBytes -= Buffer.byteLength(entry.line, "utf8") + 1;
  return {
    kind: "plan",
    plan: keepPlan,
    reclaimableBytes,
  };
}
//@ chunk-5xgkngpb.js:294131-294226 placement
function shouldKeepLine(state, index) {
  return (index >= state.lastBoundaryIdx || state.keepIdx.has(index)) && !state.supersededLastWins.has(index);
}
export {
  readTranscriptEntries,
  skipNuls,
  readEnvelopeSessionId,
  ArtifactLedgerCollector,
  stripToolUseIdBookkeeping,
  CostStateEntrySchema,
  resetArtifactLedgerState,
  isLaptopMemoryAttachment,
  buffer_5,
  shouldKeepLine,
  TRANSCRIPT_ENTRY_TYPES,
};
