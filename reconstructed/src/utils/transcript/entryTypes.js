/**
 * utils/transcript/entryTypes.ts
 *
 * 2.1.316 新增：转录条目类型
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (17)
 * attribution: placement 17
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
import { jsonParseRaw, jsonStringify } from "../slowOperations.js";
import { normalizeUuidOrNull } from "../agentId.js";
import { MAX_LOG_LINE_CHARS } from "../../types/logs.js";
import { isCompactBoundaryMessage } from "../messages.js";
import { hasPrefix } from "../sessionStoragePortable.js";
import { isRemoteEnvironmentAny } from "../remoteEnvironment.js";
import { isBeforeCompactBoundary } from "../../components/tasks/BackgroundTaskStatus.js";

//@ chunk-e6aww6q8.js:285760-286555 placement
/**
 * 定义转录中 cost-state 条目：费用、耗时、行数与各模型用量的 zod schema（非负有限且不超过上限，模型名不含控制字符）。
 */
var MAX_COST_USD = 1e9;
var MODEL_USAGE_TOKEN_KEYS = Object.keys({
  inputTokens: true,
  outputTokens: true,
  cacheReadInputTokens: true,
  cacheCreationInputTokens: true,
});
var MAX_COUNTER_VALUE = 1000000000000000;
var MAX_DURATION_VALUE = MAX_COUNTER_VALUE;
var CostStateEntrySchema = DoctorLazy(() => {
  let e = create_3().nonnegative().finite().max(MAX_COUNTER_VALUE);
  return create({
    type: create_25("cost-state"),
    sessionId: create_2(),
    totalCostUSD: e.max(MAX_COST_USD),
    totalAPIDuration: e,
    totalAPIDurationWithoutRetries: e,
    totalToolDuration: e,
    totalLinesAdded: e,
    totalLinesRemoved: e,
    totalDuration: e,
    startTime: e,
    modelUsage: create_20(
      create_2().regex(/^[^\p{Cc}\p{Cf}]+$/u),
      create({
        inputTokens: e,
        outputTokens: e,
        thinkingTokens: e.optional(),
        cacheReadInputTokens: e,
        cacheCreationInputTokens: e,
        cacheCreationEphemeral5mInputTokens: e.optional(),
        cacheCreationEphemeral1hInputTokens: e.optional(),
        webSearchRequests: e,
        costUSD: e,
      }),
    ).refine((n) =>
      MODEL_USAGE_TOKEN_KEYS.every((r) => sumByAliasField(Object.values(n), r) <= MAX_DURATION_VALUE),
    ),
    hasUnknownModelCost: create_6().optional(),
  });
});
//@ chunk-e6aww6q8.js:286555-286721 placement
/**
 * 在笔记本端（laptop leg）注入的记忆上下文附件。
 */
function isLaptopMemoryAttachment(e) {
  return (
    e.type === "attachment" &&
    (e.attachment.type === "cowork_memory_context" || e.attachment.type === "account_memory_recall") &&
    e.attachment.leg === "laptop"
  );
}
//@ chunk-e6aww6q8.js:286832-288078 placement
/**
 * 转录条目类型表：哪些算转录行、哪些是边界清除或累积/末次覆盖。
 */
var TRANSCRIPT_ENTRY_TYPES_2 = {
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
  "dev-mods": "last-wins",
  "memory-mode": "accumulate",
  "atis-latch": "last-wins",
  "tools-used": "last-wins",
  "worktree-state": "last-wins",
  "cost-state": "last-wins",
  "queue-operation": "last-wins",
  "observer-ref": "last-wins",
};
var TRANSCRIPT_ENTRY_TYPES = new Set(["attribution-snapshot", "artifact-autoreact-ledger"]);
//@ chunk-e6aww6q8.js:288078-288122 placement
function accumulateKindOf(type) {
  return TRANSCRIPT_ENTRY_TYPES_2[type] ?? "accumulate";
}
//@ chunk-e6aww6q8.js:288122-288235 placement
function parseJsonSkippingNuls(e) {
  if (!e) return;
  let n = 0;
  while (e.charCodeAt(n) === 0) n++;
  try {
    return jsonParseRaw(n > 0 ? e.slice(n) : e);
  } catch {
    return;
  }
}
//@ chunk-e6aww6q8.js:288235-288376 placement
var buffer_5 = Buffer.from('{"type":"artifact-autoreact-ledger"');
var buffer_2 = Buffer.from('{"type":"artifact-autoreact-ledger","v":1,"sessionId":"');
var ARTIFACT_LEDGER_PREFIX_LEN = 36;
//@ chunk-e6aww6q8.js:288376-288436 placement
function skipNuls(e, n, r) {
  let s = n;
  while (s < r && e[s] === 0) s++;
  return s;
}
//@ chunk-e6aww6q8.js:288553-288706 placement
function readEnvelopeSessionId(e) {
  let n = buffer_2.length;
  if (e.length < n + ARTIFACT_LEDGER_PREFIX_LEN || e.compare(buffer_2, 0, n, 0, n) !== 0) return null;
  let str = e.toString("latin1", n, n + ARTIFACT_LEDGER_PREFIX_LEN);
  return normalizeUuidOrNull(str) === null ? null : str;
}
//@ chunk-e6aww6q8.js:288706-288913 placement
function resetArtifactLedgerState(e, n) {
  let { artifacts } = e;
  if (typeof artifacts !== "object" || artifacts === null || Array.isArray(artifacts)) return e;
  let s = new Map();
  for (let [key, value] of Object.entries(artifacts)) s.set(key, resetArtifactRecord(value, n));
  return {
    ...e,
    artifacts: Object.fromEntries(s),
  };
}
//@ chunk-e6aww6q8.js:288913-289067 placement
function resetArtifactRecord(e, n) {
  return typeof e === "object" && e !== null && !Array.isArray(e)
    ? {
        ...e,
        stampHighWater: null,
        everBaselined: false,
        threads: [],
        ...(n && {
          interrupted: true,
        }),
      }
    : e;
}
//@ chunk-e6aww6q8.js:289067-289082 placement
var MAX_FUTURE_SAVED_AT_MS = 300000;
//@ chunk-e6aww6q8.js:289082-289185 placement
function savedAtOf(record) {
  let savedAt = record?.savedAt;
  return typeof savedAt === "number" &&
    Number.isFinite(savedAt) &&
    savedAt <= Date.now() + MAX_FUTURE_SAVED_AT_MS
    ? savedAt
    : 0;
}
//@ chunk-e6aww6q8.js:289185-289228 placement
function interruptedFlag(record) {
  return record?.interrupted === true;
}
//@ chunk-e6aww6q8.js:289228-289476 placement
function artifactRecordRank(e) {
  if (typeof e !== "object" || e === null || Array.isArray(e)) return 0;
  let n = e;
  if (n.interrupted === true) return 2;
  let r = n.threads === undefined || (Array.isArray(n.threads) && n.threads.length === 0);
  return n.stampHighWater === null && r && n.everBaselined === false ? 1 : 0;
}
//@ chunk-e6aww6q8.js:289476-290803 placement
/**
 * 汇总转录中的 artifact-autoreact-ledger 行：按会话分组，账号变化时清空；同一 artifact 取 savedAt 更新（相同时取等级更低）的记录。
 */
class ArtifactLedgerCollector {
  sessions = new Map();
  unnamedTornBefore = -1;
  add(e, src) {
    if (typeof e !== "object" || e === null) return;
    let r = e;
    if (r.type !== "artifact-autoreact-ledger" || typeof r.sessionId !== "string") return;
    let s = typeof r.accountUuid === "string" ? r.accountUuid.toLowerCase() : null;
    let h = this.sessions.get(r.sessionId);
    if (h === undefined) {
      h = {
        envelope: {},
        account: null,
        records: new Map(),
        tornBefore: -1,
      };
      this.sessions.set(r.sessionId, h);
    } else if (h.account !== null && s !== null && s !== h.account) h.records.clear();
    let { artifacts, ...S } = r;
    h.envelope = S;
    h.account = s ?? h.account;
    if (typeof artifacts !== "object" || artifacts === null || Array.isArray(artifacts)) return;
    for (let [key, value] of Object.entries(artifacts)) {
      let G = h.records.get(key);
      if (G !== undefined) {
        let q = savedAtOf(G.record);
        let Z = savedAtOf(value);
        if (Z < q || (Z === q && artifactRecordRank(value) < artifactRecordRank(G.record))) continue;
      }
      h.records.set(key, {
        record: value,
        src,
      });
    }
  }
  torn(e, n) {
    if (e === null) {
      this.unnamedTornBefore = n;
      return;
    }
    let r = this.sessions.get(e);
    if (r !== undefined) r.tornBefore = n;
  }
  finish(e) {
    let n = new Map();
    for (let [r, s] of this.sessions) {
      let sliced = [...s.records.entries()]
        .sort(
          ([, S], [, w]) =>
            Number(interruptedFlag(w.record)) - Number(interruptedFlag(S.record)) ||
            savedAtOf(w.record) - savedAtOf(S.record),
        )
        .slice(0, MAX_LOG_LINE_CHARS);
      let y = new Map();
      for (let [S, { record: w, src: L }] of sliced) {
        let G = L < Math.max(s.tornBefore, this.unnamedTornBefore);
        y.set(S, G ? resetArtifactRecord(w, true) : e ? resetArtifactRecord(w, false) : w);
      }
      n.set(r, {
        ...s.envelope,
        type: "artifact-autoreact-ledger",
        sessionId: r,
        accountUuid: s.account,
        artifacts: Object.fromEntries(y),
      });
    }
    return n;
  }
}
//@ chunk-e6aww6q8.js:290803-293442 placement
/**
 * 读取转录文件的各类条目（摘要、文件历史快照、增量）。
 */
async function readTranscriptEntries(e) {
  let n = 0;
  let r = -1;
  let s;
  let lastNonPreservedBoundaryIdx = -1;
  let y = "";
  let S = new Map();
  let w = new Map();
  let L = new Map();
  let G = new Set();
  let q = new Map();
  let Z = new Set();
  let Se = (jsonSkippingNuls) => {
    let nt = jsonSkippingNuls.type === "summary" ? jsonSkippingNuls.leafUuid : jsonSkippingNuls.sessionId;
    return `${jsonSkippingNuls.type}:${nt ?? ""}`;
  };
  let ke = new ArtifactLedgerCollector();
  let we = false;
  let Ee = [];
  for await (let Je of e) {
    Ee.push(Buffer.byteLength(Je, "utf8") + 1);
    let jsonSkippingNuls = parseJsonSkippingNuls(Je);
    if (jsonSkippingNuls) {
      if (jsonSkippingNuls.type === "file-history-snapshot") w.set(jsonSkippingNuls.messageId, n);
      else if (jsonSkippingNuls.type === "file-history-delta") {
        let Et = L.get(jsonSkippingNuls.messageId);
        if (Et) Et.push(n);
        else L.set(jsonSkippingNuls.messageId, [n]);
      }
      let pt = accumulateKindOf(jsonSkippingNuls.type);
      if (pt === "transcript") {
        let message = jsonSkippingNuls;
        S.set(message.uuid, {
          parent: message.parentUuid,
          idx: n,
          isDatedAfterBoundary: message.timestamp > y,
        });
        if (isCompactBoundaryMessage(message)) {
          r = n;
          s = message.compactMetadata;
          y = message.timestamp;
          if (!message.compactMetadata?.preservedSegment && !message.compactMetadata?.preservedMessages)
            lastNonPreservedBoundaryIdx = n;
        }
      } else if (pt === "accumulate") G.add(n);
      else if (pt === "last-wins")
        if (
          jsonSkippingNuls.type === "cost-state" &&
          !CostStateEntrySchema().safeParse(jsonSkippingNuls).success
        )
          G.add(n);
        else {
          let Et = Se(jsonSkippingNuls);
          let yt = q.get(Et);
          if (yt && TRANSCRIPT_ENTRY_TYPES.has(jsonSkippingNuls.type)) Z.add(yt.idx);
          if (jsonSkippingNuls.type === "artifact-autoreact-ledger") ke.add(jsonSkippingNuls, n);
          q.set(Et, {
            idx: n,
            line: Je,
            type: jsonSkippingNuls.type,
          });
        }
    } else if (Je) {
      G.add(n);
      let buffer = Buffer.from(Je);
      let chunk = buffer.subarray(skipNuls(buffer, 0, buffer.length));
      let yt = hasPrefix(chunk);
      let gt = yt ? readEnvelopeSessionId(chunk) : null;
      if (yt) ke.torn(gt, n);
      we = gt === null;
    }
    if (jsonSkippingNuls) we = false;
    n++;
  }
  let Ae = new Map();
  for (let [Je, nt] of ke.finish(we)) {
    let pt = q.get(`artifact-autoreact-ledger:${Je}`);
    if (pt === undefined) continue;
    pt.line = jsonStringify(nt);
    Ae.set(pt.idx, pt.line);
  }
  if (r < 0)
    return {
      kind: "skip",
    };
  if (s?.preservedMessages)
    for (let uuid of s.preservedMessages.uuids) {
      let nt = S.get(uuid);
      if (!nt)
        return {
          kind: "abort",
          reason: "preserved_uuid_missing",
        };
      G.add(nt.idx);
      let pt = w.get(uuid);
      if (pt !== undefined) G.add(pt);
      let Et = L.get(uuid);
      if (Et) for (let yt of Et) G.add(yt);
    }
  else if (s?.preservedSegment) {
    let preservedSegment = s.preservedSegment;
    let tailUuid = preservedSegment.tailUuid;
    let pt = new Set();
    while (tailUuid && !pt.has(tailUuid)) {
      pt.add(tailUuid);
      let Et = S.get(tailUuid);
      if (Et) {
        G.add(Et.idx);
        let yt = w.get(tailUuid);
        if (yt !== undefined) G.add(yt);
        let gt = L.get(tailUuid);
        if (gt) for (let At of gt) G.add(At);
        if (tailUuid === preservedSegment.headUuid) break;
      }
      tailUuid = Et?.parent;
    }
    if (tailUuid !== preservedSegment.headUuid)
      return {
        kind: "abort",
        reason: "preserved_walk_broken",
      };
  }
  let Ie = !s?.preservedMessages && !s?.preservedSegment && isRemoteEnvironmentAny();
  let Me = new Set();
  for (let { parent, idx, isDatedAfterBoundary } of S.values()) {
    if (!parent || idx < r) continue;
    if (Ie && isDatedAfterBoundary) continue;
    let Et = S.get(parent);
    if (Et && Et.idx < r && !G.has(Et.idx)) Me.add(Et.idx);
  }
  for (let Je of Me) G.add(Je);
  let We = [];
  for (let [Je, { idx: nt }] of S) if (nt < r && !G.has(nt)) We.push(Je);
  let pill = {
    lastBoundaryIdx: r,
    lastNonPreservedBoundaryIdx,
    keepIdx: G,
    supersededLastWins: Z,
    lastMeta: q,
    ledgerSubstitutes: Ae,
    deletedUuids: We,
  };
  let lt = 0;
  for (let idx = 0; idx < Ee.length; idx++) if (!shouldKeepLine(pill, idx)) lt += Ee[idx];
  for (let Je of q.values())
    if (isBeforeCompactBoundary(pill, Je)) lt -= Buffer.byteLength(Je.line, "utf8") + 1;
  return {
    kind: "plan",
    plan: pill,
    reclaimableBytes: lt,
  };
}
//@ chunk-e6aww6q8.js:293442-293537 placement
function shouldKeepLine(e, n) {
  return (n >= e.lastBoundaryIdx || e.keepIdx.has(n)) && !e.supersededLastWins.has(n);
}
export {
  readTranscriptEntries,
  skipNuls,
  readEnvelopeSessionId,
  ArtifactLedgerCollector,
  CostStateEntrySchema,
  resetArtifactLedgerState,
  isLaptopMemoryAttachment,
  buffer_5,
  shouldKeepLine,
  TRANSCRIPT_ENTRY_TYPES,
};
