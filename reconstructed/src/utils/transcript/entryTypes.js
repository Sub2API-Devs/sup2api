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
import { T4e } from "../../services/artifacts/frameApi.js";
import { jsonParseRaw, jsonStringify } from "../slowOperations.js";
import { Vt } from "../agentId.js";
import { Uwr } from "../../types/logs.js";
import { isCompactBoundaryMessage } from "../messages.js";
import { hasPrefix } from "../sessionStoragePortable.js";
import { uC } from "../remoteEnvironment.js";
import { isBeforeCompactBoundary } from "../../components/tasks/BackgroundTaskStatus.js";

/**
 * 定义转录中 cost-state 条目：费用、耗时、行数与各模型用量的 zod schema（非负有限且不超过上限，模型名不含控制字符）。
 */
//@ chunk-e6aww6q8.js:285760-286555 placement
var MAX_COST_USD = 1e9,
  MODEL_USAGE_TOKEN_KEYS = Object.keys({
    inputTokens: !0,
    outputTokens: !0,
    cacheReadInputTokens: !0,
    cacheCreationInputTokens: !0,
  }),
  MAX_COUNTER_VALUE = 1000000000000000,
  MAX_DURATION_VALUE = MAX_COUNTER_VALUE,
  CostStateEntrySchema = DoctorLazy(() => {
    let max = create_3().nonnegative().finite().max(MAX_COUNTER_VALUE);
    return create({
      type: create_25("cost-state"),
      sessionId: create_2(),
      totalCostUSD: max.max(MAX_COST_USD),
      totalAPIDuration: max,
      totalAPIDurationWithoutRetries: max,
      totalToolDuration: max,
      totalLinesAdded: max,
      totalLinesRemoved: max,
      totalDuration: max,
      startTime: max,
      modelUsage: create_20(
        create_2().regex(/^[^\p{Cc}\p{Cf}]+$/u),
        create({
          inputTokens: max,
          outputTokens: max,
          thinkingTokens: max.optional(),
          cacheReadInputTokens: max,
          cacheCreationInputTokens: max,
          cacheCreationEphemeral5mInputTokens: max.optional(),
          cacheCreationEphemeral1hInputTokens: max.optional(),
          webSearchRequests: max,
          costUSD: max,
        }),
      ).refine((n) => MODEL_USAGE_TOKEN_KEYS.every((r) => T4e(Object.values(n), r) <= MAX_DURATION_VALUE)),
      hasUnknownModelCost: create_6().optional(),
    });
  });
/**
 * 在笔记本端（laptop leg）注入的记忆上下文附件。
 */
//@ chunk-e6aww6q8.js:286555-286721 placement
function isLaptopMemoryAttachment(e) {
  return (
    e.type === "attachment" &&
    (e.attachment.type === "cowork_memory_context" || e.attachment.type === "account_memory_recall") &&
    e.attachment.leg === "laptop"
  );
}
/**
 * 转录条目类型表（transcript、file-history、last-prompt、continued-in 等）。
 */
//@ chunk-e6aww6q8.js:286832-288078 placement
var TRANSCRIPT_ENTRY_TYPES = {
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
  },
  SHe = new Set(["attribution-snapshot", "artifact-autoreact-ledger"]);
//@ chunk-e6aww6q8.js:288078-288122 placement
function Jco(e) {
  return TRANSCRIPT_ENTRY_TYPES[e] ?? "accumulate";
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
var buffer_5 = Buffer.from('{"type":"artifact-autoreact-ledger"'),
  buffer_2 = Buffer.from('{"type":"artifact-autoreact-ledger","v":1,"sessionId":"'),
  txt = 36;
//@ chunk-e6aww6q8.js:288376-288436 placement
function yG(e, n, r) {
  let s = n;
  while (s < r && e[s] === 0) s++;
  return s;
}
//@ chunk-e6aww6q8.js:288553-288706 placement
function readEnvelopeSessionId(e) {
  let n = buffer_2.length;
  if (e.length < n + txt || e.compare(buffer_2, 0, n, 0, n) !== 0) return null;
  let str = e.toString("latin1", n, n + txt);
  return Vt(str) === null ? null : str;
}
//@ chunk-e6aww6q8.js:288706-288913 placement
function resetArtifactLedgerState(e, n) {
  let { artifacts: artifacts } = e;
  if (typeof artifacts !== "object" || artifacts === null || Array.isArray(artifacts)) return e;
  let s = new Map();
  for (let [h, y] of Object.entries(artifacts)) s.set(h, resetArtifactRecord(y, n));
  return { ...e, artifacts: Object.fromEntries(s) };
}
//@ chunk-e6aww6q8.js:288913-289067 placement
function resetArtifactRecord(e, n) {
  return typeof e === "object" && e !== null && !Array.isArray(e)
    ? { ...e, stampHighWater: null, everBaselined: !1, threads: [], ...(n && { interrupted: !0 }) }
    : e;
}
//@ chunk-e6aww6q8.js:289067-289082 placement
var efo = 300000;
//@ chunk-e6aww6q8.js:289082-289185 placement
function savedAtOf(e) {
  let n = e?.savedAt;
  return typeof n === "number" && Number.isFinite(n) && n <= Date.now() + efo ? n : 0;
}
//@ chunk-e6aww6q8.js:289185-289228 placement
function nxt(e) {
  return e?.interrupted === !0;
}
//@ chunk-e6aww6q8.js:289228-289476 placement
function artifactRecordRank(e) {
  if (typeof e !== "object" || e === null || Array.isArray(e)) return 0;
  let n = e;
  if (n.interrupted === !0) return 2;
  let r = n.threads === void 0 || (Array.isArray(n.threads) && n.threads.length === 0);
  return n.stampHighWater === null && r && n.everBaselined === !1 ? 1 : 0;
}
/**
 * 汇总转录中的 artifact-autoreact-ledger 行：按会话分组，账号变化时清空；同一 artifact 取 savedAt 更新（相同时取等级更低）的记录。
 */
//@ chunk-e6aww6q8.js:289476-290803 placement
class ArtifactLedgerCollector {
  sessions = new Map();
  unnamedTornBefore = -1;
  add(e, n) {
    if (typeof e !== "object" || e === null) return;
    let r = e;
    if (r.type !== "artifact-autoreact-ledger" || typeof r.sessionId !== "string") return;
    let s = typeof r.accountUuid === "string" ? r.accountUuid.toLowerCase() : null,
      h = this.sessions.get(r.sessionId);
    if (h === void 0)
      ((h = { envelope: {}, account: null, records: new Map(), tornBefore: -1 }),
        this.sessions.set(r.sessionId, h));
    else if (h.account !== null && s !== null && s !== h.account) h.records.clear();
    let { artifacts: artifacts, ...S } = r;
    if (
      ((h.envelope = S),
      (h.account = s ?? h.account),
      typeof artifacts !== "object" || artifacts === null || Array.isArray(artifacts))
    )
      return;
    for (let [w, L] of Object.entries(artifacts)) {
      let G = h.records.get(w);
      if (G !== void 0) {
        let q = savedAtOf(G.record),
          Z = savedAtOf(L);
        if (Z < q || (Z === q && artifactRecordRank(L) < artifactRecordRank(G.record))) continue;
      }
      h.records.set(w, { record: L, src: n });
    }
  }
  torn(e, n) {
    if (e === null) {
      this.unnamedTornBefore = n;
      return;
    }
    let r = this.sessions.get(e);
    if (r !== void 0) r.tornBefore = n;
  }
  finish(e) {
    let n = new Map();
    for (let [r, s] of this.sessions) {
      let sliced = [...s.records.entries()]
          .sort(
            ([, S], [, w]) =>
              Number(nxt(w.record)) - Number(nxt(S.record)) || savedAtOf(w.record) - savedAtOf(S.record),
          )
          .slice(0, Uwr),
        y = new Map();
      for (let [S, { record: w, src: L }] of sliced) {
        let G = L < Math.max(s.tornBefore, this.unnamedTornBefore);
        y.set(S, G ? resetArtifactRecord(w, !0) : e ? resetArtifactRecord(w, !1) : w);
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
/**
 * 读取转录文件的各类条目（摘要、文件历史快照、增量）。
 */
//@ chunk-e6aww6q8.js:290803-293442 placement
async function readTranscriptEntries(e) {
  let n = 0,
    r = -1,
    s,
    h = -1,
    y = "",
    S = new Map(),
    w = new Map(),
    L = new Map(),
    G = new Set(),
    q = new Map(),
    Z = new Set(),
    Se = (Je) => {
      let nt = Je.type === "summary" ? Je.leafUuid : Je.sessionId;
      return `${Je.type}:${nt ?? ""}`;
    },
    ke = new ArtifactLedgerCollector(),
    we = !1,
    Ee = [];
  for await (let Je of e) {
    Ee.push(Buffer.byteLength(Je, "utf8") + 1);
    let nt = parseJsonSkippingNuls(Je);
    if (nt) {
      if (nt.type === "file-history-snapshot") w.set(nt.messageId, n);
      else if (nt.type === "file-history-delta") {
        let Et = L.get(nt.messageId);
        if (Et) Et.push(n);
        else L.set(nt.messageId, [n]);
      }
      let pt = Jco(nt.type);
      if (pt === "transcript") {
        let Et = nt;
        if (
          (S.set(Et.uuid, { parent: Et.parentUuid, idx: n, isDatedAfterBoundary: Et.timestamp > y }),
          isCompactBoundaryMessage(Et))
        ) {
          if (
            ((r = n),
            (s = Et.compactMetadata),
            (y = Et.timestamp),
            !Et.compactMetadata?.preservedSegment && !Et.compactMetadata?.preservedMessages)
          )
            h = n;
        }
      } else if (pt === "accumulate") G.add(n);
      else if (pt === "last-wins")
        if (nt.type === "cost-state" && !CostStateEntrySchema().safeParse(nt).success) G.add(n);
        else {
          let Et = Se(nt),
            yt = q.get(Et);
          if (yt && SHe.has(nt.type)) Z.add(yt.idx);
          if (nt.type === "artifact-autoreact-ledger") ke.add(nt, n);
          q.set(Et, { idx: n, line: Je, type: nt.type });
        }
    } else if (Je) {
      G.add(n);
      let buffer = Buffer.from(Je),
        chunk = buffer.subarray(yG(buffer, 0, buffer.length)),
        yt = hasPrefix(chunk),
        gt = yt ? readEnvelopeSessionId(chunk) : null;
      if (yt) ke.torn(gt, n);
      we = gt === null;
    }
    if (nt) we = !1;
    n++;
  }
  let Ae = new Map();
  for (let [Je, nt] of ke.finish(we)) {
    let pt = q.get(`artifact-autoreact-ledger:${Je}`);
    if (pt === void 0) continue;
    ((pt.line = jsonStringify(nt)), Ae.set(pt.idx, pt.line));
  }
  if (r < 0) return { kind: "skip" };
  if (s?.preservedMessages)
    for (let uuid of s.preservedMessages.uuids) {
      let nt = S.get(uuid);
      if (!nt) return { kind: "abort", reason: "preserved_uuid_missing" };
      G.add(nt.idx);
      let pt = w.get(uuid);
      if (pt !== void 0) G.add(pt);
      let Et = L.get(uuid);
      if (Et) for (let yt of Et) G.add(yt);
    }
  else if (s?.preservedSegment) {
    let preservedSegment = s.preservedSegment,
      tailUuid = preservedSegment.tailUuid,
      pt = new Set();
    while (tailUuid && !pt.has(tailUuid)) {
      pt.add(tailUuid);
      let Et = S.get(tailUuid);
      if (Et) {
        G.add(Et.idx);
        let yt = w.get(tailUuid);
        if (yt !== void 0) G.add(yt);
        let gt = L.get(tailUuid);
        if (gt) for (let At of gt) G.add(At);
        if (tailUuid === preservedSegment.headUuid) break;
      }
      tailUuid = Et?.parent;
    }
    if (tailUuid !== preservedSegment.headUuid) return { kind: "abort", reason: "preserved_walk_broken" };
  }
  let Ie = !s?.preservedMessages && !s?.preservedSegment && uC(),
    Me = new Set();
  for (let { parent: parent, idx: idx, isDatedAfterBoundary: isDatedAfterBoundary } of S.values()) {
    if (!parent || idx < r) continue;
    if (Ie && isDatedAfterBoundary) continue;
    let Et = S.get(parent);
    if (Et && Et.idx < r && !G.has(Et.idx)) Me.add(Et.idx);
  }
  for (let Je of Me) G.add(Je);
  let We = [];
  for (let [Je, { idx: nt }] of S) if (nt < r && !G.has(nt)) We.push(Je);
  let ze = {
      lastBoundaryIdx: r,
      lastNonPreservedBoundaryIdx: h,
      keepIdx: G,
      supersededLastWins: Z,
      lastMeta: q,
      ledgerSubstitutes: Ae,
      deletedUuids: We,
    },
    lt = 0;
  for (let Je = 0; Je < Ee.length; Je++) if (!lxt(ze, Je)) lt += Ee[Je];
  for (let Je of q.values())
    if (isBeforeCompactBoundary(ze, Je)) lt -= Buffer.byteLength(Je.line, "utf8") + 1;
  return { kind: "plan", plan: ze, reclaimableBytes: lt };
}
//@ chunk-e6aww6q8.js:293442-293537 placement
function lxt(e, n) {
  return (n >= e.lastBoundaryIdx || e.keepIdx.has(n)) && !e.supersededLastWins.has(n);
}

export {
  readTranscriptEntries,
  yG,
  readEnvelopeSessionId,
  ArtifactLedgerCollector,
  CostStateEntrySchema,
  resetArtifactLedgerState,
  isLaptopMemoryAttachment,
  buffer_5,
  lxt,
  SHe,
};
