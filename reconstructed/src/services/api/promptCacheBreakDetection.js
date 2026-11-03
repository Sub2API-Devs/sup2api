/**
 * services/api/promptCacheBreakDetection.ts
 *
 * 提示词缓存断裂检测：每次请求前按来源（主线程/SDK/代理/压缩分叉）记录 system、工具 schema、模型、beta、effort、thinking 等的哈希与消息哈希，响应后若 cache_read 明显下降则对比找出变化原因并上报（tengu_prompt_cache_break 一类），也处理服务器 cache-diagnosis 与压缩/缓存删除通知。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/api/promptCacheBreakDetection.ts
 * pieces: chunk-1t61stbc.js (26), chunk-a76knw89.js (19), chunk-g54kbxqw.js (82)
 * attribution: placement 88, layout 26, fingerprint 10, sole-consumer 1, file-local 2
 */
import { join as join_2, join as join_3, join as join_4 } from "path";
import { rm, mkdir } from "fs/promises";
import { randomUUID, randomUUID as randomUUID_2 } from "crypto";
import { isDeepStrictEqual, isDeepStrictEqual as isDeepStrictEqual_2 } from "util";
import {
  messageRoleBucket,
  je_2,
  PREFIX_BREAK_EVENT,
  foldedAttachmentText,
  contentBlockTypeBucket,
  stripCacheControl_2,
  classifyUserText,
  MESSAGE_ROLE_BUCKETS,
  CONTENT_BLOCK_TYPE_BUCKETS,
  TEXT_KIND_BUCKETS,
  MAX_DIFF_ENTRIES,
  changedPartIndexes,
  isPrefixBreakSampled,
  ss,
  rs,
  os,
  is,
  getPromptCacheHashSalt,
  adoptPromptCacheHashSalt,
  foldedAttachmentIndex,
  diffSystemParts,
  diffPromptParts,
  prefixBreakSampleRate,
  isSampledIn,
} from "./promptCacheBreakParts.js";
import { messageContentBlocks } from "./_new/messageContentBlocks.js";
import { sanitizePath_3 } from "../../utils/sessionStoragePortable.js";
import { gn, kXt } from "../../utils/shortHash.js";
import {
  lit,
  concatSafe,
  fromNumber,
  joinSafe,
  fromEnum,
  fromEnumArr,
  fromEnumOpt,
  fromNumberArr,
} from "../analytics/safeMetadata.js";
import { count, arraysEqual } from "../../utils/collections.js";
import { logEvent } from "../analytics/index.js";
import { ye } from "../../utils/startupMarks.js";
import { telemetrySafeModelName } from "../../utils/model/telemetryModelName.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { A, u, U, xE, E, o } from "../../../vendor/zod/v4/classic/schemas.js";
import { env } from "../../utils/env.js";
import { isManagedOAuthContext_2 } from "../../utils/auth.js";
import { Ws } from "./streamFallbackWarning.js";
import { isDiskless, getSessionId, getRootSession, onSessionSwitch } from "../../bootstrap/state.js";
import { Vt } from "../../utils/agentId.js";
import { getClaudeTempDirRealpath } from "../../utils/tempDirRealpaths.js";
import { FOREGROUND_529_RETRY_SOURCES } from "./withRetry.js";
import {
  create_20,
  create_2,
  create,
  create_3,
  create_15,
  create_6,
  create_26,
  create_19,
  create_25,
  create_12,
} from "../../../vendor/zod/lib/index.mjs";
import { nIn } from "../../../vendor/zod/v3/types.js";
import { onceExport } from "../../../vendor/lodash-es/once.js";
import { verifyTempDirOwnership } from "../../utils/tempDir.js";
import { readSmallFileOrNullSync } from "../../utils/readSmallFile.js";
import { jsonParse, jsonStringify } from "../../utils/slowOperations.js";
import { writeFileAtomic } from "../../utils/atomicPublishWrite.js";
import { isPlainObject } from "../../utils/objectUtils.js";
import { logError } from "../../utils/log.js";
import { logForDebugging } from "../../utils/debug.js";
import { sanitizeToolNameForTelemetry, hashToolNames } from "../../utils/model/modelCatalog/maskedIds.js";
import { agentTypeForTelemetry } from "../analytics/metadata.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { toolKeyOf, On, lO } from "./toolDefinitionShape.js";
import { getCacheControl, stripCacheControl } from "./declaredToolSet.js";
import { canonicalToolName } from "../../utils/permissions/permissionRuleParser.js";
import { isToolResultBlockWithContent, isToolReferenceWithName } from "../../utils/toolSearch.js";

//@ chunk-g54kbxqw.js:54510-54678 sole-consumer
function messageFingerprint(e) {
  return {
    role: messageRoleBucket(e.message.role),
    blocks: messageContentBlocks(e).map(sanitizePath_3),
    systemAttachments:
      e.type === "api_system" && e.foldedAttachmentTypes ? e.foldedAttachmentTypes.map(gn) : [],
  };
}
//@ chunk-g54kbxqw.js:54678-54758 placement
var ka = 4 * je_2,
  ys = { blocks: lit(""), systemAttachments: lit(""), blockCount: 0, truncated: !1 };
//@ chunk-g54kbxqw.js:54758-55197 placement
function scanChangedMessages(e, n, s, r) {
  let h = [],
    y = [],
    k = 0,
    C = !1;
  e: for (let max = Math.max(0, n); max < s; max++) {
    let S = e(max);
    if (S === void 0) {
      C = !0;
      break;
    }
    if (((k += S.systemAttachments.length), S.systemAttachments.length > 0 && h.length < r && k <= ka))
      y.push(concatSafe(fromNumber(max), lit("="), joinSafe(S.systemAttachments, "+")));
    let w = fromEnum(S.role);
    for (let block of S.blocks) {
      if (h.length >= r) {
        C = !0;
        break e;
      }
      h.push(joinSafe([fromNumber(max), w, fromEnum(block.type), block.hash], ":"));
    }
  }
  return { blocks: joinSafe(h), systemAttachments: joinSafe(y), blockCount: h.length, truncated: C };
}
//@ chunk-g54kbxqw.js:55197-55389 placement
function blockSummary(e, n) {
  if (e === void 0) return { blocks: lit(""), blockCount: 0 };
  let sliced = e.blocks.slice(0, n);
  return {
    blocks: joinSafe(
      sliced.map((r) => joinSafe([fromEnum(r.type), fromNumber(r.length), fromEnum(r.prefixClass)], ":")),
    ),
    blockCount: sliced.length,
  };
}
//@ chunk-g54kbxqw.js:55389-55540 placement
function isPrefixOf(e, n) {
  return (
    e.role === n.role &&
    e.blocks.length <= n.blocks.length &&
    e.blocks.every((block, r) => block.hash === n.blocks[r].hash && block.type === n.blocks[r].type)
  );
}
//@ chunk-g54kbxqw.js:55540-56031 placement
function classifyFirstChange(e, n, s, r, h) {
  if (e < 0) return "none";
  if (n === void 0 || r === void 0) return "unknown";
  let y = n(e);
  if (y === void 0) return "unknown";
  let k = r[e];
  if (k === void 0) return "rewrite";
  let C = h ?? messageFingerprint(k);
  if (C.blocks.length === y.blocks.length || !isPrefixOf(y, C)) return "rewrite";
  for (let R = e + 1; R < s; R++) {
    let S = n(R);
    if (S === void 0) return "unknown";
    let w = r[R];
    if (S.role !== "system" || w === void 0 || w.message.role !== "system") return "rewrite";
    let P = messageFingerprint(w);
    if (P.blocks.length !== S.blocks.length || !isPrefixOf(S, P)) return "rewrite";
  }
  return "tail_append";
}
//@ chunk-g54kbxqw.js:56031-56168 placement
function countSystemRows(e) {
  if (e === void 0) return -1;
  return "messages" in e
    ? count(e.messages, (n) => n.message.role === "system")
    : count(e.rows, (n) => n.role === "system");
}
//@ chunk-g54kbxqw.js:56168-56206 placement
function ks(e) {
  return gn(e.join(","));
}
/**
 * 根据前后两次请求的差异（系统、工具、首个变化的消息等）推断提示缓存失效的原因。
 */
//@ chunk-g54kbxqw.js:56206-58038 placement
function explainCacheBreak(e) {
  let firstChangedMessageIndex = e.firstChangedMessageIndex,
    s = ys,
    r,
    h;
  if (firstChangedMessageIndex >= 0)
    switch (e.prev.source) {
      case "memory": {
        let messages = e.prev.messages,
          P =
            firstChangedMessageIndex < messages.length
              ? messageFingerprint(messages[firstChangedMessageIndex])
              : void 0;
        ((r = P),
          (h = (L) =>
            L === firstChangedMessageIndex
              ? P
              : L < messages.length
                ? messageFingerprint(messages[L])
                : void 0),
          (s = scanChangedMessages(h, firstChangedMessageIndex, messages.length, je_2)));
        break;
      }
      case "disk": {
        let rows = e.prev.rows;
        ((s = scanChangedMessages(
          (P) => rows[P],
          firstChangedMessageIndex,
          Math.max(rows.length, e.prevMessageCount),
          je_2,
        )),
          (r = rows[firstChangedMessageIndex]),
          (h = (P) => rows[P]));
        break;
      }
      case "none":
        break;
    }
  let newMessages = e.newMessages,
    k =
      firstChangedMessageIndex >= 0 && newMessages !== void 0 && firstChangedMessageIndex < newMessages.length
        ? messageFingerprint(newMessages[firstChangedMessageIndex])
        : void 0,
    C =
      firstChangedMessageIndex >= 0 && newMessages !== void 0
        ? scanChangedMessages(
            (w) => (w === firstChangedMessageIndex ? k : messageFingerprint(newMessages[w])),
            firstChangedMessageIndex,
            newMessages.length,
            je_2,
          )
        : ys,
    R = blockSummary(r, je_2),
    S = blockSummary(k, je_2);
  logEvent(PREFIX_BREAK_EVENT, {
    requestId: ye(e.requestId) ?? lit(""),
    model: telemetrySafeModelName(e.model),
    cacheBroke: e.cacheBroke,
    changeKinds: e.changeKinds,
    firstChangedMessageIndex: firstChangedMessageIndex,
    prevMessageCount: e.prevMessageCount,
    newMessageCount: e.newMessageCount,
    callNumber: e.callNumber,
    baselineFromDisk: e.baselineFromDisk,
    is1hCacheTTL: e.is1hCacheTTL,
    lastAssistantMsgOver5minAgo: e.lastAssistantMsgOver5minAgo,
    lastAssistantMsgOver1hAgo: e.lastAssistantMsgOver1hAgo,
    querySource: e.querySource,
    prevCacheReadTokens: e.prevCacheReadTokens,
    cacheReadTokens: e.cacheReadTokens,
    cacheCreationTokens: e.cacheCreationTokens,
    prevBlocks: s.blocks,
    prevBlockCount: s.blockCount,
    prevTruncated: s.truncated,
    prevSystemAttachments: s.systemAttachments,
    newBlocks: C.blocks,
    newBlockCount: C.blockCount,
    newTruncated: C.truncated,
    newSystemAttachments: C.systemAttachments,
    sampleRate: e.sampleRate,
    prevSource: fromEnum(e.prevSource),
    baselineKind: fromEnum(e.baselineKind),
    prevFirstMessageBlocks: R.blocks,
    prevFirstMessageBlockCount: R.blockCount,
    newFirstMessageBlocks: S.blocks,
    newFirstMessageBlockCount: S.blockCount,
    prevModel: telemetrySafeModelName(e.prevModel),
    prevBetasHash: ks(e.prevBetas),
    newBetasHash: ks(e.newBetas),
    prevSystemTurns: countSystemRows(
      e.prev.source === "memory"
        ? { messages: e.prev.messages }
        : e.prev.source === "disk"
          ? { rows: e.prev.rows }
          : void 0,
    ),
    newSystemTurns: countSystemRows(e.newMessages && { messages: e.newMessages }),
    changeScope: fromEnum(
      classifyFirstChange(firstChangedMessageIndex, h, e.prevMessageCount, e.newMessages, k),
    ),
  });
}
//@ chunk-g54kbxqw.js:58038-58339 placement
function messageOutline(e) {
  let n = foldedAttachmentText(e, 0);
  return {
    role: messageRoleBucket(e.message.role),
    blocks: messageContentBlocks(e).map((s) => {
      let r = contentBlockTypeBucket(s),
        h = stripCacheControl_2(s),
        y = "text" in s ? s.text : void 0,
        hash = Bun.hash(h);
      return {
        type: r,
        length: h.length,
        prefixClass: r === "text" && typeof y === "string" ? classifyUserText(y) : r,
        hash: typeof hash === "bigint" ? Number(hash & 0xffffffffn) : hash,
      };
    }),
    ...(n && { parts: n.parts }),
  };
}
//@ chunk-g54kbxqw.js:58339-58356 placement
var Cs = 16,
  Tn = 1e4;
//@ chunk-g54kbxqw.js:58356-58577 placement
function compactBaseline(e) {
  let n = [],
    s = 0;
  for (let r of e) {
    if (((s += r.blocks.length), s > Tn)) break;
    n.push({
      r: r.role,
      b: r.blocks.map((block) => [block.type, block.length, block.prefixClass, block.hash]),
      ...(r.parts && { p: r.parts.map((part) => [part.type, part.len, part.hash]) }),
    });
  }
  return n;
}
//@ chunk-g54kbxqw.js:58577-58774 placement
var BASELINE_SCHEMA = DoctorLazy(() =>
  A(
    u({
      r: U(MESSAGE_ROLE_BUCKETS),
      b: A(xE([U(CONTENT_BLOCK_TYPE_BUCKETS), Rs(), U(TEXT_KIND_BUCKETS), E()])).max(Tn),
      p: A(xE([o().regex(/^[0-9a-f]{12}$/), Rs(), E()]))
        .max(MAX_DIFF_ENTRIES)
        .optional(),
    }),
  )
    .max(20000)
    .refine((e) => e.reduce((n, s) => n + s.b.length, 0) <= Tn),
);
//@ chunk-g54kbxqw.js:58774-59001 placement
function restoreBaseline(e) {
  let safeParse = BASELINE_SCHEMA().safeParse(e);
  if (!safeParse.success) return;
  return safeParse.data.map((s) => ({
    role: s.r,
    blocks: s.b.map(([r, h, y, k]) => ({ type: r, length: h, prefixClass: y, hash: k })),
    ...(s.p && { parts: s.p.map(([r, h, y]) => ({ type: r, len: h, hash: y })) }),
  }));
}
//@ chunk-g54kbxqw.js:59001-59109 placement
function blockOutlineKey(e) {
  return joinSafe(
    e.flatMap((n) => {
      let s = kXt(n.type);
      return s === void 0 ? [] : [concatSafe(s, lit(":"), fromNumber(n.len))];
    }),
  );
}
//@ chunk-g54kbxqw.js:59109-59241 placement
function positionedOutlineKey(e) {
  return joinSafe(
    e.flatMap((n) => {
      let s = kXt(n.type);
      return s === void 0
        ? []
        : [concatSafe(fromNumber(n.position), lit(":"), s, lit(":"), fromNumber(n.delta))];
    }),
  );
}
//@ chunk-g54kbxqw.js:59241-59959 placement
function changedMessageFields(e, n) {
  let s = {
    ...(e && {
      changedMessagePrevRole: fromEnum(e.role),
      changedMessagePrevBlocks: blockSummary(e, Cs).blocks,
      changedMessagePrevBlockCount: e.blocks.length,
      ...(e.parts && { changedMessagePrevParts: blockOutlineKey(e.parts) }),
    }),
    ...(n && {
      changedMessageRole: fromEnum(n.role),
      changedMessageBlocks: blockSummary(n, Cs).blocks,
      changedMessageBlockCount: n.blocks.length,
      ...(n.parts && { changedMessageParts: blockOutlineKey(n.parts) }),
    }),
  };
  if (!e || !n) return s;
  let min = Math.min(e.blocks.length, n.blocks.length),
    h = 0;
  while (h < min && e.blocks[h].type === n.blocks[h].type && e.blocks[h].hash === n.blocks[h].hash) h++;
  return {
    ...s,
    changedMessageFirstBlock: h === e.blocks.length && h === n.blocks.length ? -1 : h,
    changedMessageLengthDelta: ws(n) - ws(e),
    ...(e.parts &&
      n.parts && { changedMessageChangedParts: positionedOutlineKey(changedPartIndexes(e.parts, n.parts)) }),
  };
}
//@ chunk-g54kbxqw.js:59959-60026 placement
function Rs() {
  return E().int().min(0).max(Number.MAX_SAFE_INTEGER);
}
//@ chunk-g54kbxqw.js:60026-60085 placement
function ws(e) {
  return e.blocks.reduce((n, s) => n + s.length, 0);
}
/**
 * 缓存断裂状态文件名前缀 "cache-break-"（cache-break-state-<会话>.json）。
 */
//@ chunk-g54kbxqw.js:60085-60108 fingerprint = getCacheBreakDiffPath (0.618)
var getCacheBreakDiffPath = "cache-break-";
//@ chunk-g54kbxqw.js:60183-61176 placement
var CACHE_BREAK_HINTS =
  typeof {
    ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
    PACKAGE_URL: "@anthropic-ai/claude-code",
    README_URL: "https://code.claude.com/docs/en/overview",
    VERSION: "2.1.316",
    FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
    BUILD_TIME: "2026-10-30T23:28:13Z",
    GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
    HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
    DD_SOURCEMAP_GROUP: "default",
  } < "u"
    ? {
        ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
        PACKAGE_URL: "@anthropic-ai/claude-code",
        README_URL: "https://code.claude.com/docs/en/overview",
        VERSION: "2.1.316",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-10-30T23:28:13Z",
        GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
        HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
        DD_SOURCEMAP_GROUP: "default",
      }.VERSION
    : "unknown";
//@ chunk-g54kbxqw.js:61176-61245 placement
function isCacheBreakOutlineEnabled() {
  if (env.CLAUDE_CODE_IS_COWORK) return !0;
  return isManagedOAuthContext_2() || Bs();
}
//@ chunk-g54kbxqw.js:61245-61292 placement
function Bs() {
  return env.CLAUDE_CODE_REMOTE === !0;
}
//@ chunk-g54kbxqw.js:61292-61303 placement
var En_g54k = 1e4;
//@ chunk-g54kbxqw.js:61303-61346 placement
function promptCacheBreakState() {
  return Ws().promptCacheBreak;
}
//@ chunk-g54kbxqw.js:61346-61368 placement
function Hs(e) {
  return;
}
//@ chunk-g54kbxqw.js:61368-61442 placement
function Mn() {
  if (env.CLAUDE_CODE_IS_COWORK || isManagedOAuthContext_2()) return !0;
  return Bs() && !isDiskless();
}
//@ chunk-g54kbxqw.js:61442-61480 placement
function isCacheBreakPersistenceEnabled() {
  return Mn() || (isPrefixBreakSampled() && !isDiskless());
}
//@ chunk-g54kbxqw.js:61480-61534 placement
function needsResumeBaseline(e) {
  return !Mn() && e.resumeBaseline === void 0;
}
//@ chunk-g54kbxqw.js:61534-61573 placement
function canPersistCacheBreakState() {
  return isCacheBreakPersistenceEnabled() && cacheBreakStatePath() !== null;
}
//@ chunk-g54kbxqw.js:61573-61665 placement
function cacheBreakStatePath() {
  let e = Vt(getSessionId());
  if (e === null) return null;
  return join_2(getClaudeTempDirRealpath(), `${getCacheBreakDiffPath}state-${e}.json`);
}
//@ chunk-g54kbxqw.js:61665-61804 placement
var TOOL_CHOICE_VALUES = { "": !0, none: !0, tool_based: !0, system_prompt: !0 },
  SPEED_VALUES = { "": !0, on: !0, off: !0 },
  THINKING_DISPLAY_VALUES = { "": !0, summarized: !0, omitted: !0, highlights: !0 },
  MAX_BASELINE_BYTES = 4000000;
//@ chunk-g54kbxqw.js:61804-61847 placement
function xe(e) {
  return Object.hasOwn(FOREGROUND_529_RETRY_SOURCES, e);
}
/**
 * 提示缓存失效检测的持久化状态结构：系统/工具/cache_control 哈希、工具名、消息哈希等。
 */
//@ chunk-g54kbxqw.js:61847-63589 placement
var cacheBreakStateSchema = DoctorLazy(() =>
    create_20(
      create_2().max(200),
      create({
        systemHash: create_3(),
        toolsHash: create_3(),
        cacheControlHash: create_3(),
        toolNames: create_15(create_2().max(200)).max(2000),
        perToolHashes: create_20(create_2().max(200), create_3()).refine(
          (e) => Object.keys(e).length <= 2000,
        ),
        perBlockHashes: create_15(create_3()).max(5000),
        perBlockLengths: create_15(create_3()).max(5000),
        systemCharCount: create_3(),
        model: create_2().max(200),
        fastMode: create_6(),
        globalCacheStrategy: nIn((e) => typeof e === "string" && Object.hasOwn(TOOL_CHOICE_VALUES, e)),
        betas: create_15(create_2().max(200)).max(100),
        autoModeActive: create_6(),
        isUsingOverage: create_6(),
        anyDeferLoading: create_6().default(!1),
        is1hCacheTTL: create_6().default(!1),
        queryDepth: create_3().optional(),
        cacheDiagnosis: create_6().default(!1),
        effortValue: create_2().max(200),
        thinkingMode: nIn((e) => typeof e === "string" && Object.hasOwn(SPEED_VALUES, e)).default(""),
        thinkingDisplay: nIn(
          (e) => typeof e === "string" && Object.hasOwn(THINKING_DISPLAY_VALUES, e),
        ).default(""),
        extraBodyHash: create_3(),
        callCount: create_3(),
        prevCacheReadTokens: create_3().nullable(),
        cacheDeletionsPending: create_6(),
        messageHashes: create_15(create_3()).max(20000),
        buildVersion: create_2().max(128).default(""),
        msg0Shape: create({
          blockCount: create_3(),
          blocks: create_15(create({ kind: create_26(ss), len: create_3(), hash: create_3() })).max(rs),
          sections: create_15(create({ name: create_26(os), len: create_3(), hash: create_3() })).max(is),
          workerTools: create({ toolCount: create_3(), mcpServerCount: create_3() }).optional(),
        }).optional(),
        sysFoldShape: create({
          index: create_3().int().min(0),
          len: create_3().int().min(0),
          partCount: create_3().int().min(0),
          parts: create_15(
            create({
              type: create_2().regex(/^[0-9a-f]{12}$/),
              len: create_3().int().min(0),
              hash: create_3(),
            }),
          ).max(MAX_DIFF_ENTRIES),
        })
          .optional()
          .catch(void 0),
        prefixBreakHash: Pa()
          .optional()
          .catch(void 0),
      }),
    ),
  ),
  Pa = DoctorLazy(() =>
    create({
      salt: nIn((e) => typeof e === "string" && Vt(e) !== null),
      messages: create_15(
        create({
          r: create_26(MESSAGE_ROLE_BUCKETS),
          b: create_15(
            create_19([
              create_26(CONTENT_BLOCK_TYPE_BUCKETS),
              create_2().regex(/^[0-9a-f]{12}$/),
              create_3().int().min(0).max(Number.MAX_SAFE_INTEGER),
              create_26(TEXT_KIND_BUCKETS),
            ]),
          ).max(En_g54k),
          a: create_15(create_2().regex(/^[0-9a-f]{12}$/))
            .max(200)
            .optional(),
        }),
      )
        .max(20000)
        .refine((e) => e.reduce((n, s) => n + s.b.length, 0) <= En_g54k),
    }),
  );
//@ chunk-g54kbxqw.js:63589-63884 placement
function outlinesFromState(e) {
  let n = [];
  for (let message of e.messages) {
    let r = [];
    for (let [y, k, C, R] of message.b) {
      let S = kXt(k);
      if (S === void 0) return;
      r.push({ type: y, hash: S, length: C, prefixClass: R });
    }
    let h = [];
    for (let y of message.a ?? []) {
      let k = kXt(y);
      if (k === void 0) return;
      h.push(k);
    }
    n.push({ role: message.r, blocks: r, systemAttachments: h });
  }
  return n;
}
//@ chunk-g54kbxqw.js:63884-64314 placement
function hashMessages(e, n, s) {
  let r = getPromptCacheHashSalt(),
    h = s !== void 0 && s.rows.salt === r ? s : void 0,
    y = [],
    k = 0;
  for (let C = 0; C < e.length; C++) {
    let R = n[C],
      S =
        h !== void 0 && R !== void 0 && R !== EPHEMERAL_MESSAGE_MARK && h.messageHashes[C] === R
          ? h.rows.messages[C]
          : void 0;
    if (S === void 0) {
      let w = messageFingerprint(e[C]);
      S = {
        r: w.role,
        b: w.blocks.map((block) => [block.type, block.hash, block.length, block.prefixClass]),
        ...(w.systemAttachments.length > 0 && { a: [...w.systemAttachments] }),
      };
    }
    if (((k += S.b.length), k > En_g54k)) break;
    y.push(S);
  }
  return { salt: r, messages: y };
}
//@ chunk-g54kbxqw.js:64314-64530 placement
function messageHashesFor(e, n, s) {
  if (e === void 0 || !isCacheBreakOutlineEnabled()) return;
  let r = s?.messageHashes,
    h = s?.messageOutlines;
  return onceExport(() => {
    let y = h?.();
    return e.map((k, C) => {
      let R = n[C];
      return (
        (R !== void 0 && R !== EPHEMERAL_MESSAGE_MARK && r?.[C] === R ? y?.[C] : void 0) ?? messageOutline(k)
      );
    });
  });
}
/**
 * 会话恢复时从磁盘读回上次的提示缓存状态，作为失效检测的基线。
 */
//@ chunk-g54kbxqw.js:64530-65323 placement
function hydrateCacheBreakState() {
  let e = promptCacheBreakState();
  if (e.hydrationAttempted || !isCacheBreakPersistenceEnabled()) return;
  e.hydrationAttempted = !0;
  let previousStateBySource = e.previousStateBySource;
  try {
    verifyTempDirOwnership(getClaudeTempDirRealpath());
    let s = cacheBreakStatePath();
    if (s === null) return;
    let r = readSmallFileOrNullSync(s, MAX_BASELINE_BYTES);
    if (r === null) return;
    let safeParse = cacheBreakStateSchema().safeParse(jsonParse(r));
    if (!safeParse.success) return;
    let y = count(Object.keys(safeParse.data), (C) => xe(C) && C.startsWith("repl_main_thread")),
      k = !Mn();
    for (let [C, R] of Object.entries(safeParse.data)) {
      if (previousStateBySource.size >= MAX_TRACKED_SOURCES) break;
      if (!xe(C)) continue;
      let S = C.startsWith("repl_main_thread:") ? "repl_main_thread" : C;
      if (S === "repl_main_thread" && y > 1) continue;
      if (previousStateBySource.has(S)) continue;
      previousStateBySource.set(S, {
        ...R,
        ...(k && { callCount: 0, cacheDeletionsPending: !1 }),
        pendingChanges: null,
        baselineFromDisk: !0,
        baselineBuildVersion: R.buildVersion,
        content: Ln(R.model),
        hydratedHashRows:
          R.prefixBreakHash !== void 0 && adoptPromptCacheHashSalt(R.prefixBreakHash.salt)
            ? outlinesFromState(R.prefixBreakHash)
            : void 0,
      });
    }
  } catch {}
}
/**
 * 去掉持久化快照里的大字段（哈希前缀、内容、基线等），只留元数据。与团队无关。
 */
//@ chunk-g54kbxqw.js:65323-65579 placement
function stripSnapshotPayload(e) {
  let {
    hashedPrefix: hashedPrefix,
    content: content,
    pendingChanges: pendingChanges,
    baselineFromDisk: baselineFromDisk,
    diffedAgainst: diffedAgainst,
    baselineMessageHashes: baselineMessageHashes,
    baselineBuildVersion: baselineBuildVersion,
    hashSampleMessages: hashSampleMessages,
    hydratedHashRows: hydratedHashRows,
    baselineHashSource: baselineHashSource,
    messageOutlines: messageOutlines,
    resumeBaseline: resumeBaseline,
    ...j
  } = e;
  return j;
}
/**
 * 把各来源的上一状态（去掉大字段）排队持久化到磁盘，空则删除文件。与团队/worktree 无关。
 */
//@ chunk-g54kbxqw.js:65579-66075 placement = destroyWorktree (0.326)
function persistPreviousStates() {
  if (!isCacheBreakPersistenceEnabled()) return;
  try {
    let e = promptCacheBreakState(),
      n = {};
    for (let [h, y] of e.previousStateBySource) {
      if (!xe(h)) continue;
      n[h] = stripSnapshotPayload(y);
    }
    let s = cacheBreakStatePath();
    if (s === null) return;
    let r =
      Object.keys(n).length === 0 ? { action: "remove" } : { action: "write", payload: jsonStringify(n) };
    ((e.latestQueuedPersist = r),
      (e.pendingPersist = e.pendingPersist
        .then(async () => {
          if (r.action === "remove") {
            (verifyTempDirOwnership(getClaudeTempDirRealpath()), await rm(s, { force: !0 }));
            return;
          }
          if (e.latestQueuedPersist !== r) return;
          (await mkdir(getClaudeTempDirRealpath(), { recursive: !0, mode: 448 }),
            verifyTempDirOwnership(getClaudeTempDirRealpath()),
            await writeFileAtomic(s, r.payload));
        })
        .catch(() => {})));
  } catch {}
}
/**
 * 参与跟踪的 querySource 前缀：repl_main_thread、sdk、agent:custom/default/builtin。
 */
//@ chunk-g54kbxqw.js:66075-66231 fingerprint = TRACKED_SOURCE_PREFIXES (0.811)
var MAX_TRACKED_SOURCES = 10,
  MAX_TRACKED_SOURCES_ANT = 64,
  AGENT_SUMMARY = "agent_summary",
  MAX_SUMMARY_FORKS = 8,
  TRACKED_SOURCE_PREFIXES = ["repl_main_thread", "sdk", "agent:custom", "agent:default", "agent:builtin"],
  COMPACT_FORK = "compact_fork",
  MIN_CACHE_MISS_TOKENS = 2000,
  MAX_COMPACTION_TIMESTAMPS = 8,
  MAX_CLASSIFIER_COMPACTION_KEYS = 128;
/**
 * 本次 cache_read 低于上次 95% 且少了至少 2000 token 即视为缓存断裂。
 */
//@ chunk-g54kbxqw.js:66231-66275 layout
function isCacheReadDrop(e, n) {
  return n < e * 0.95 && e - n >= MIN_CACHE_MISS_TOKENS;
}
/**
 * 模型名含 haiku 的不做断裂检测。
 */
//@ chunk-g54kbxqw.js:66275-66318 fingerprint = isExcludedModel (1)
function isExcludedModel(model) {
  return model.includes("haiku");
}
/**
 * querySource → 跟踪键：compact 归到 compact_fork；主线程归 repl_main_thread；代理按 agentId；其他来源不跟踪（null）。
 */
//@ chunk-g54kbxqw.js:66318-66487 fingerprint = getTrackingKey (1)
function getTrackingKey(querySource, agentId) {
  if (querySource === "compact") return COMPACT_FORK;
  if (!agentId && querySource.startsWith("repl_main_thread")) return "repl_main_thread";
  for (let prefix of TRACKED_SOURCE_PREFIXES)
    if (querySource.startsWith(prefix)) return agentId || querySource;
  return null;
}
/**
 * 数组每项去掉 cache_control。
 */
//@ chunk-g54kbxqw.js:66487-66595 layout = stripCacheControl (1)
function stripCacheControlAll(items) {
  return items.map((item) => {
    if (!("cache_control" in item)) return item;
    let { cache_control: cache_control, ...r } = item;
    return r;
  });
}
/**
 * 块的 text 字段（字符串时）。
 */
//@ chunk-g54kbxqw.js:66595-66659 layout
function getBlockText(e) {
  let text = e.text;
  return typeof text === "string" ? text : void 0;
}
/**
 * 每个工具 schema 的哈希表（按工具名）。
 */
//@ chunk-g54kbxqw.js:66659-66752 fingerprint = computePerToolHashes (1)
function computePerToolHashes(strippedTools, names) {
  let hashes = {};
  for (let r = 0; r < strippedTools.length; r++)
    hashes[names[r] ?? `__idx_${r}`] = computeHash(strippedTools[r]);
  return hashes;
}
/**
 * 两个对象键集相同、值全等且除指定键外都是原始值。
 */
//@ chunk-g54kbxqw.js:66752-66985 layout
function isShallowEqualExcept(e, n, s) {
  if (!isPlainObject(e) || !isPlainObject(n)) return !1;
  let keys = Object.keys(e);
  if (!arraysEqual(keys, Object.keys(n))) return !1;
  for (let h of keys) {
    let y = e[h];
    if (y !== n[h]) return !1;
    if (!(y === null || (typeof y !== "object" && typeof y !== "function")) && h !== s) return !1;
  }
  return !0;
}
/**
 * 计算条目数组哈希；与上次条目浅相等时复用上次哈希。
 */
//@ chunk-g54kbxqw.js:66985-67151 layout
function hashEntriesReusing(e, n, s) {
  let r =
    n !== void 0 &&
    n.entries.length === e.length &&
    e.every((h, y) => isShallowEqualExcept(h, n.entries[y], s));
  return { entries: e.map((h) => (isPlainObject(h) ? { ...h } : h)), hash: r ? n.hash : computeHash(e) };
}
/**
 * system 块文本总字符数。
 */
//@ chunk-g54kbxqw.js:67151-67218 file-local
function getSystemCharCount(system) {
  let total = 0;
  for (let block of system) total += getBlockText(block)?.length ?? 0;
  return total;
}
/**
 * 比较前后两次请求的标量：system/工具/模型/fast/cache_control/全局缓存策略/beta/auto mode/超额/诊断/effort/thinking/额外 body/defer_loading 是否变化。
 */
//@ chunk-g54kbxqw.js:67218-68153 layout
function diffPromptScalars(e, n) {
  return {
    systemPromptChanged: n.systemHash !== e.systemHash,
    toolSchemasChanged: n.toolsHash !== e.toolsHash,
    modelChanged: n.model !== e.model,
    fastModeChanged: n.fastMode !== e.fastMode,
    cacheControlChanged: n.cacheControlHash !== e.cacheControlHash,
    globalCacheStrategyChanged: n.globalCacheStrategy !== e.globalCacheStrategy,
    betasChanged: n.betas.length !== e.betas.length || n.betas.some((beta, r) => beta !== e.betas[r]),
    autoModeChanged: n.autoModeActive !== e.autoModeActive,
    overageChanged: n.isUsingOverage !== e.isUsingOverage,
    cacheDiagnosisChanged: n.cacheDiagnosis !== e.cacheDiagnosis,
    effortChanged: n.effortValue !== e.effortValue,
    thinkingModeChanged: e.thinkingMode !== "" && n.thinkingMode !== "" && n.thinkingMode !== e.thinkingMode,
    thinkingDisplayChanged:
      e.thinkingMode !== "" && n.thinkingMode === e.thinkingMode && n.thinkingDisplay !== e.thinkingDisplay,
    extraBodyChanged: n.extraBodyHash !== e.extraBodyHash,
    deferLoadingPresenceChanged: n.anyDeferLoading !== e.anyDeferLoading,
  };
}
/**
 * 跟踪来源数超过上限时淘汰旧条目（优先淘汰非主线程）。
 */
//@ chunk-g54kbxqw.js:68153-68283 file-local
function cleanupAgentTracking(agentId) {
  let n = isPrefixBreakSampled() ? MAX_TRACKED_SOURCES_ANT : MAX_TRACKED_SOURCES;
  while (agentId.size >= n) {
    let s = [...agentId.keys()],
      r = s.find((h) => !xe(h)) ?? s[0];
    if (r === void 0) break;
    agentId.delete(r);
  }
}
/**
 * 请求前记录本次提示词状态（各项哈希、消息哈希），与上次对比得到 pendingChanges。
 */
//@ chunk-g54kbxqw.js:68283-73678 fingerprint = recordPromptState (0.62)
function recordPromptState(snapshot) {
  try {
    let {
        system: system,
        toolSchemas: toolSchemas,
        anyDeferLoading: anyDeferLoading = !1,
        querySource: querySource,
        model: model,
        agentId: agentId,
        fastMode: fastMode,
        globalCacheStrategy: globalCacheStrategy = "",
        betas: betas = [],
        autoModeActive: autoModeActive = !1,
        isUsingOverage: isUsingOverage = !1,
        is1hCacheTTL: is1hCacheTTL = !1,
        queryDepth: queryDepth,
        cacheDiagnosis: cacheDiagnosis = !1,
        effortValue: effortValue,
        thinkingConfig: thinkingConfig,
        extraBodyParams: extraBodyParams,
        getMessageHashes: getMessageHashes,
        messages: messages,
        baselineAgentId: baselineAgentId,
      } = snapshot,
      key = getTrackingKey(querySource, agentId),
      Me =
        key === null &&
        querySource === AGENT_SUMMARY &&
        agentId !== void 0 &&
        baselineAgentId !== void 0 &&
        isPrefixBreakSampled()
          ? { forkAgentId: agentId, parentKey: baselineAgentId }
          : void 0;
    if (key === null && Me === void 0) return;
    let ge = getMessageHashes(),
      filtered = stripCacheControlAll(system).filter((ue) => !isUncachedSystemBlock(ue)),
      strippedSystem = stripCacheControlAll(toolSchemas);
    hydrateCacheBreakState();
    let previousStateBySource = promptCacheBreakState().previousStateBySource,
      x = key === null ? void 0 : previousStateBySource.get(key),
      ce = {
        system: hashEntriesReusing(filtered, x?.hashedPrefix?.system),
        tools: hashEntriesReusing(strippedSystem, x?.hashedPrefix?.tools, "input_schema"),
      },
      hash = ce.system.hash,
      hash_2 = ce.tools.hash,
      strippedTools = computeHash(
        system
          .filter((ue) => !isUncachedSystemBlock(ue))
          .map((ue) => ("cache_control" in ue ? ue.cache_control : null)),
      ),
      toolNames = toolSchemas.map((ue) => ("name" in ue ? ue.name : "unknown")),
      computeToolHashes = () => computePerToolHashes(strippedSystem, toolNames),
      Wn = () => filtered.map((ue) => computeHash(ue)),
      $n = () => filtered.map((ue) => getBlockText(ue)?.length ?? 0),
      systemCharCount = getSystemCharCount(filtered),
      wr = void 0,
      lazyDiffableContent = () => ({ model: model, system: system, tools: toolSchemas, messages: wr }),
      Gn = messages ? Hs(messages) : void 0,
      Vn = messages && isCacheBreakOutlineEnabled() ? foldedAttachmentIndex(messages) : void 0,
      De = isPrefixBreakSampled() ? messages : void 0,
      It = fastMode ?? !1,
      sortedBetas = [...betas].sort(),
      Ze = effortValue === void 0 ? "" : String(effortValue),
      Je = thinkingConfig === void 0 ? "" : thinkingConfig.type === "disabled" ? "off" : "on",
      et =
        thinkingConfig === void 0 || thinkingConfig.type === "disabled" ? "" : (thinkingConfig.display ?? ""),
      Nt = extraBodyParams === void 0 ? 0 : computeHash(extraBodyParams),
      qn = {
        systemHash: hash,
        toolsHash: hash_2,
        cacheControlHash: strippedTools,
        model: model,
        fastMode: It,
        globalCacheStrategy: globalCacheStrategy,
        betas: sortedBetas,
        autoModeActive: autoModeActive,
        isUsingOverage: isUsingOverage,
        cacheDiagnosis: cacheDiagnosis,
        effortValue: Ze,
        thinkingMode: Je,
        thinkingDisplay: et,
        extraBodyHash: Nt,
        anyDeferLoading: anyDeferLoading,
      };
    if (key === null) {
      if (Me !== void 0) recordSummaryFork_2({ ...Me, scalars: qn, messageHashes: ge, messages: De });
      return;
    }
    let Yn = messageHashesFor(messages, ge, x),
      Xn = De !== void 0 && xe(key) && canPersistCacheBreakState();
    if (!x) {
      (cleanupAgentTracking(previousStateBySource),
        previousStateBySource.set(key, {
          systemHash: hash,
          toolsHash: hash_2,
          hashedPrefix: ce,
          cacheControlHash: strippedTools,
          toolNames: toolNames,
          systemCharCount: systemCharCount,
          model: model,
          fastMode: It,
          globalCacheStrategy: globalCacheStrategy,
          betas: sortedBetas,
          autoModeActive: autoModeActive,
          isUsingOverage: isUsingOverage,
          anyDeferLoading: anyDeferLoading,
          is1hCacheTTL: is1hCacheTTL,
          queryDepth: queryDepth,
          cacheDiagnosis: cacheDiagnosis,
          effortValue: Ze,
          thinkingMode: Je,
          thinkingDisplay: et,
          extraBodyHash: Nt,
          callCount: 1,
          pendingChanges: null,
          prevCacheReadTokens: null,
          cacheDeletionsPending: !1,
          buildVersion: CACHE_BREAK_HINTS,
          baselineFromDisk: !1,
          messageHashes: ge,
          msg0Shape: Gn,
          sysFoldShape: Vn,
          messageOutlines: Yn,
          content: lazyDiffableContent,
          hashSampleMessages: De,
          perToolHashes: computeToolHashes(),
          perBlockHashes: Wn(),
          perBlockLengths: $n(),
          prefixBreakHash: Xn ? hashMessages(De, ge, void 0) : void 0,
        }),
        persistPreviousStates());
      return;
    }
    (x.callCount++,
      (x.baselineHashSource =
        x.hashSampleMessages !== void 0 ? "memory" : x.hydratedHashRows !== void 0 ? "disk" : "none"),
      (x.diffedAgainst = x.diffedAgainst === void 0 && x.baselineFromDisk ? "disk" : "memory"));
    let {
        systemPromptChanged: systemPromptChanged,
        toolSchemasChanged: toolSchemasChanged,
        modelChanged: modelChanged,
        fastModeChanged: fastModeChanged,
        cacheControlChanged: cacheControlChanged,
        globalCacheStrategyChanged: globalCacheStrategyChanged,
        betasChanged: betasChanged,
        autoModeChanged: autoModeChanged,
        overageChanged: overageChanged,
        cacheDiagnosisChanged: cacheDiagnosisChanged,
        effortChanged: effortChanged,
        thinkingModeChanged: thinkingModeChanged,
        thinkingDisplayChanged: thinkingDisplayChanged,
        extraBodyChanged: extraBodyChanged,
        deferLoadingPresenceChanged: deferLoadingPresenceChanged,
      } = diffPromptScalars(x, qn),
      po = findFirstChangedHash(x.messageHashes, ge),
      mo = po !== -1;
    if (
      systemPromptChanged ||
      toolSchemasChanged ||
      modelChanged ||
      fastModeChanged ||
      cacheControlChanged ||
      globalCacheStrategyChanged ||
      betasChanged ||
      autoModeChanged ||
      overageChanged ||
      cacheDiagnosisChanged ||
      effortChanged ||
      thinkingModeChanged ||
      thinkingDisplayChanged ||
      extraBodyChanged ||
      deferLoadingPresenceChanged ||
      mo
    ) {
      let prevToolSet = new Set(x.toolNames),
        newToolSet = new Set(toolNames),
        prevBetaSet = new Set(x.betas),
        newBetaSet = new Set(sortedBetas),
        addedTools = toolNames.filter((he) => !prevToolSet.has(he)),
        removedTools = x.toolNames.filter((toolName) => !newToolSet.has(toolName)),
        ho = [];
      if (toolSchemasChanged) {
        let newHashes = computeToolHashes();
        for (let name of toolNames) {
          if (!prevToolSet.has(name)) continue;
          if (newHashes[name] !== x.perToolHashes[name]) ho.push(name);
        }
        x.perToolHashes = newHashes;
      }
      let yo = x.perBlockHashes.length,
        Ft = filtered.length,
        _o = [],
        bo = [];
      if (systemPromptChanged) {
        let he = Wn(),
          Pe = $n();
        if (Ft === yo) {
          for (let Oe = 0; Oe < Ft; Oe++)
            if (he[Oe] !== x.perBlockHashes[Oe]) (_o.push(Oe), bo.push(Pe[Oe] - x.perBlockLengths[Oe]));
        }
        ((x.perBlockHashes = he), (x.perBlockLengths = Pe));
      }
      x.pendingChanges = {
        systemPromptChanged: systemPromptChanged,
        toolSchemasChanged: toolSchemasChanged,
        modelChanged: modelChanged,
        fastModeChanged: fastModeChanged,
        cacheControlChanged: cacheControlChanged,
        globalCacheStrategyChanged: globalCacheStrategyChanged,
        betasChanged: betasChanged,
        autoModeChanged: autoModeChanged,
        overageChanged: overageChanged,
        cacheDiagnosisChanged: cacheDiagnosisChanged,
        effortChanged: effortChanged,
        thinkingModeChanged: thinkingModeChanged,
        thinkingDisplayChanged: thinkingDisplayChanged,
        extraBodyChanged: extraBodyChanged,
        deferLoadingPresenceChanged: deferLoadingPresenceChanged,
        messagesHistoryChanged: mo,
        firstChangedMessageIndex: po,
        prevMessageCount: x.messageHashes.length,
        addedToolCount: addedTools.length,
        removedToolCount: removedTools.length,
        addedTools: addedTools,
        removedTools: removedTools,
        changedToolSchemas: ho,
        prevBlockCount: yo,
        newBlockCount: Ft,
        changedBlockIndices: _o,
        changedBlockLengthDeltas: bo,
        systemCharDelta: systemCharCount - x.systemCharCount,
        previousModel: x.model,
        newModel: model,
        previousBetas: x.betas,
        prevGlobalCacheStrategy: x.globalCacheStrategy,
        newGlobalCacheStrategy: globalCacheStrategy,
        addedBetas: sortedBetas.filter((he) => !prevBetaSet.has(he)),
        removedBetas: x.betas.filter((beta) => !newBetaSet.has(beta)),
        prevEffortValue: x.effortValue,
        newEffortValue: Ze,
        prevThinkingMode: x.thinkingMode,
        newThinkingMode: Je,
        prevThinkingDisplay: x.thinkingDisplay,
        newThinkingDisplay: et,
        prevContent: x.content,
        prevMsg0Shape: x.msg0Shape,
        prevSysFoldShape: x.sysFoldShape,
        prevMessageOutlines: x.messageOutlines,
        prevHashSampleMessages: x.hashSampleMessages,
        prevHydratedHashRows: x.hydratedHashRows,
      };
    } else x.pendingChanges = null;
    let Ar = Xn
      ? hashMessages(De, ge, x.prefixBreakHash && { rows: x.prefixBreakHash, messageHashes: x.messageHashes })
      : void 0;
    ((x.systemHash = hash),
      (x.toolsHash = hash_2),
      (x.hashedPrefix = ce),
      (x.cacheControlHash = strippedTools),
      (x.toolNames = toolNames),
      (x.systemCharCount = systemCharCount),
      (x.model = model),
      (x.fastMode = It),
      (x.globalCacheStrategy = globalCacheStrategy),
      (x.betas = sortedBetas),
      (x.autoModeActive = autoModeActive),
      (x.isUsingOverage = isUsingOverage),
      (x.is1hCacheTTL = is1hCacheTTL),
      (x.queryDepth = queryDepth),
      (x.cacheDiagnosis = cacheDiagnosis),
      (x.effortValue = Ze),
      (x.thinkingMode = Je),
      (x.thinkingDisplay = et),
      (x.extraBodyHash = Nt),
      (x.anyDeferLoading = anyDeferLoading),
      (x.buildVersion = CACHE_BREAK_HINTS),
      (x.baselineMessageHashes = x.messageHashes),
      (x.messageHashes = ge),
      (x.msg0Shape = Gn),
      (x.sysFoldShape = Vn),
      (x.messageOutlines = Yn),
      (x.content = lazyDiffableContent),
      (x.hashSampleMessages = De),
      (x.prefixBreakHash = Ar),
      (x.hydratedHashRows = void 0),
      persistPreviousStates());
  } catch (error) {
    logError(error);
  }
}
/**
 * 所有变化类型键名（含 messagesHistoryChanged）。
 */
//@ chunk-g54kbxqw.js:73678-74025 layout
var CHANGE_KINDS = [
  "systemPromptChanged",
  "toolSchemasChanged",
  "modelChanged",
  "fastModeChanged",
  "cacheControlChanged",
  "globalCacheStrategyChanged",
  "betasChanged",
  "autoModeChanged",
  "overageChanged",
  "cacheDiagnosisChanged",
  "effortChanged",
  "thinkingModeChanged",
  "thinkingDisplayChanged",
  "extraBodyChanged",
  "deferLoadingPresenceChanged",
  "messagesHistoryChanged",
];
/**
 * 记录本次消息哈希与形状，算出首个变化的消息下标并并入 pendingChanges；摘要代理走分叉记录。
 */
//@ chunk-g54kbxqw.js:74025-76178 layout
function recordMessageHistory({
  querySource: querySource,
  agentId: agentId,
  messages: messages,
  getMessageHashes: getMessageHashes,
}) {
  try {
    let h = getTrackingKey(querySource, agentId);
    if (h === null) {
      if (querySource === AGENT_SUMMARY && agentId !== void 0)
        updateSummaryForkMessages(agentId, messages, getMessageHashes);
      return;
    }
    let y = promptCacheBreakState().previousStateBySource.get(h);
    if (!y) return;
    let k = getMessageHashes();
    y.baselineMessageHashes ??= y.messageHashes;
    let { baselineMessageHashes: baselineMessageHashes, content: content } = y,
      { model: model, system: system, tools: tools } = content(),
      L = void 0,
      {
        msg0Shape: msg0Shape,
        sysFoldShape: sysFoldShape,
        messageOutlines: messageOutlines,
        hashSampleMessages: hashSampleMessages,
      } = y,
      se = y.prefixBreakHash && { rows: y.prefixBreakHash, messageHashes: y.messageHashes };
    ((y.messageOutlines = messageHashesFor(messages, k, y)),
      (y.messageHashes = k),
      (y.msg0Shape = Hs(messages)),
      (y.sysFoldShape = isCacheBreakOutlineEnabled() ? foldedAttachmentIndex(messages) : void 0),
      (y.content = () => ({ model: model, system: system, tools: tools, messages: L })),
      (y.hashSampleMessages = isPrefixBreakSampled() ? messages : void 0),
      (y.prefixBreakHash =
        y.hashSampleMessages !== void 0 && xe(h) && canPersistCacheBreakState()
          ? hashMessages(y.hashSampleMessages, k, se)
          : void 0));
    let N = findFirstChangedHash(baselineMessageHashes, k),
      pendingChanges = y.pendingChanges;
    if (pendingChanges) {
      let _e = { ...pendingChanges, messagesHistoryChanged: N !== -1, firstChangedMessageIndex: N };
      y.pendingChanges = CHANGE_KINDS.some((re) => _e[re]) ? _e : null;
    } else if (N !== -1)
      ((y.baselineHashSource = hashSampleMessages !== void 0 ? "memory" : "none"),
        (y.pendingChanges = {
          systemPromptChanged: !1,
          toolSchemasChanged: !1,
          modelChanged: !1,
          fastModeChanged: !1,
          cacheControlChanged: !1,
          globalCacheStrategyChanged: !1,
          betasChanged: !1,
          autoModeChanged: !1,
          overageChanged: !1,
          cacheDiagnosisChanged: !1,
          effortChanged: !1,
          thinkingModeChanged: !1,
          thinkingDisplayChanged: !1,
          extraBodyChanged: !1,
          deferLoadingPresenceChanged: !1,
          messagesHistoryChanged: !0,
          firstChangedMessageIndex: N,
          prevMessageCount: baselineMessageHashes.length,
          addedToolCount: 0,
          removedToolCount: 0,
          systemCharDelta: 0,
          addedTools: [],
          removedTools: [],
          changedToolSchemas: [],
          prevBlockCount: y.perBlockHashes.length,
          newBlockCount: y.perBlockHashes.length,
          changedBlockIndices: [],
          changedBlockLengthDeltas: [],
          previousModel: model,
          newModel: model,
          previousBetas: y.betas,
          prevGlobalCacheStrategy: y.globalCacheStrategy,
          newGlobalCacheStrategy: y.globalCacheStrategy,
          addedBetas: [],
          removedBetas: [],
          prevEffortValue: y.effortValue,
          newEffortValue: y.effortValue,
          prevThinkingMode: y.thinkingMode,
          newThinkingMode: y.thinkingMode,
          prevThinkingDisplay: y.thinkingDisplay,
          newThinkingDisplay: y.thinkingDisplay,
          prevContent: content,
          prevMsg0Shape: msg0Shape,
          prevSysFoldShape: sysFoldShape,
          prevMessageOutlines: messageOutlines,
          prevHashSampleMessages: hashSampleMessages,
          prevHydratedHashRows: void 0,
        }));
    persistPreviousStates();
  } catch (error) {
    logError(error);
  }
}
/**
 * 触发该来源记录的 messageOutlines 惰性计算。
 */
//@ chunk-g54kbxqw.js:76178-76297 layout
function flushMessageOutlines(e, n) {
  try {
    let s = getTrackingKey(e, n);
    if (s !== null) promptCacheBreakState().previousStateBySource.get(s)?.messageOutlines?.();
  } catch (error) {
    logError(error);
  }
}
/**
 * 两个哈希数组首个不同的下标（-1 表示相同）。
 */
//@ chunk-g54kbxqw.js:76297-76359 layout
function findFirstChangedHash(e, n) {
  return e.findIndex((s, r) => s !== EPHEMERAL_MESSAGE_MARK && n[r] !== s);
}
/**
 * 本来源待定变化的类型列表、首个变化消息下标、基线来源、调用次数（遥测用）。
 */
//@ chunk-g54kbxqw.js:76359-76665 layout
function getPendingChangeSummary(e, n) {
  try {
    let { changes: changes, baseline: baseline, callNumber: callNumber } = getPendingChangesForSource(e, n);
    return {
      kinds: changes ? fromEnumArr(CHANGE_KINDS.filter((y) => changes[y])) : lit("none"),
      firstChangedMessageIndex: changes?.firstChangedMessageIndex ?? -1,
      baseline: baseline,
      callNumber: callNumber,
    };
  } catch (error) {
    return (
      logError(error),
      { kinds: lit("none"), firstChangedMessageIndex: -1, baseline: lit("none"), callNumber: void 0 }
    );
  }
}
/**
 * 取来源状态、待定变化与基线类型（磁盘基线未比对时不报变化）。
 */
//@ chunk-g54kbxqw.js:76665-76966 layout
function getPendingChangesForSource(e, n) {
  let s = getTrackingKey(e, n),
    r = s ? promptCacheBreakState().previousStateBySource.get(s) : void 0;
  if (r?.diffedAgainst === "disk" && needsResumeBaseline(r))
    return { state: r, changes: void 0, baseline: lit("none"), callNumber: r.callCount };
  return {
    state: r,
    changes: r?.pendingChanges ?? void 0,
    baseline: fromEnumOpt(r?.diffedAgainst) ?? lit("none"),
    callNumber: r?.callCount,
  };
}
/**
 * 把变化标志转成人可读的原因列表（model changed、system prompt changed (+N chars) 等）。
 */
//@ chunk-g54kbxqw.js:76966-78865 fingerprint = checkResponseForCacheBreak (0.586)
function checkResponseForCacheBreak_2(e, n) {
  let parts = [];
  if (e.modelChanged)
    parts.push(`model changed (${n ? "hydrated baseline" : e.previousModel} \u2192 ${e.newModel})`);
  if (e.systemPromptChanged) {
    let charDelta = e.systemCharDelta,
      h = charDelta === 0 ? "" : charDelta > 0 ? ` (+${charDelta} chars)` : ` (${charDelta} chars)`;
    parts.push(`system prompt changed${h}`);
  }
  if (e.toolSchemasChanged) {
    let r =
      e.addedToolCount > 0 || e.removedToolCount > 0
        ? ` (+${e.addedToolCount}/-${e.removedToolCount} tools)`
        : " (tool prompt/schema changed, same tool set)";
    parts.push(`tools changed${r}`);
  }
  if (e.fastModeChanged) parts.push("fast mode toggled");
  if (e.globalCacheStrategyChanged)
    parts.push(
      `global cache strategy changed (${e.prevGlobalCacheStrategy || "none"} \u2192 ${e.newGlobalCacheStrategy || "none"})`,
    );
  if (e.cacheControlChanged && !e.globalCacheStrategyChanged && !e.systemPromptChanged)
    parts.push("cache_control changed (scope or TTL)");
  if (e.betasChanged) {
    let r = e.addedBetas.length ? `+${e.addedBetas.join(",")}` : "",
      h = e.removedBetas.length ? `-${n ? "hydrated baseline" : e.removedBetas.join(",")}` : "",
      diff = [r, h].filter(Boolean).join(" ");
    parts.push(`betas changed${diff ? ` (${diff})` : ""}`);
  }
  if (e.autoModeChanged) parts.push("auto mode toggled");
  if (e.overageChanged) parts.push("overage state changed (TTL flip expected)");
  if (e.cacheDiagnosisChanged) parts.push("cache diagnosis toggled");
  if (e.effortChanged)
    parts.push(
      `effort changed (${n ? "hydrated baseline" : e.prevEffortValue || "default"} \u2192 ${e.newEffortValue || "default"})`,
    );
  if (e.thinkingModeChanged)
    parts.push(`thinking mode changed (${e.prevThinkingMode} \u2192 ${e.newThinkingMode})`);
  if (e.thinkingDisplayChanged)
    parts.push(
      `thinking display changed (${e.prevThinkingDisplay || "none"} \u2192 ${e.newThinkingDisplay || "none"})`,
    );
  if (e.extraBodyChanged) parts.push("extra body params changed");
  if (e.deferLoadingPresenceChanged)
    parts.push("defer_loading presence flipped (deferred-tool hint section, inc-5316)");
  if (e.messagesHistoryChanged)
    parts.push(`message history mutated at index ${e.firstChangedMessageIndex}/${e.prevMessageCount}`);
  return parts;
}
/**
 * 段列表格式化为 "名:长度" 脱敏串。
 */
//@ chunk-g54kbxqw.js:78865-78943 layout
function formatSectionLengths(e) {
  return joinSafe(
    e.sections.map((section) => concatSafe(fromEnum(section.name), lit(":"), fromNumber(section.len))),
  );
}
/**
 * 首条消息变化时比较其分段形状（工作者工具数等）给出变化段。
 */
//@ chunk-g54kbxqw.js:78943-79534 layout
function describeFirstMessageChange(e, n) {
  if (!e?.messagesHistoryChanged || e.firstChangedMessageIndex !== 0 || !n) return {};
  let prevMsg0Shape = e.prevMsg0Shape,
    r = (k) => (k?.workerTools ? [k.workerTools.toolCount, k.workerTools.mcpServerCount] : [-1, -1]),
    h = {
      msg0Sections: formatSectionLengths(n),
      msg0WorkerTools: fromNumberArr([...r(prevMsg0Shape), ...r(n)]),
    };
  if (!prevMsg0Shape) return h;
  let y = diffSystemParts(prevMsg0Shape, n);
  return {
    ...h,
    msg0PrevSections: formatSectionLengths(prevMsg0Shape),
    msg0ChangedSections: joinSafe(
      y.changedSections.map((changedSection) =>
        concatSafe(fromEnum(changedSection.name), lit(":"), fromNumber(changedSection.delta)),
      ),
    ),
    msg0AddedSections: fromEnumArr(y.addedSections),
    msg0RemovedSections: fromEnumArr(y.removedSections),
    msg0ChangedBlocks: joinSafe(
      y.changedBlocks.map((changedBlock) =>
        concatSafe(
          fromNumber(changedBlock.index),
          lit(":"),
          fromEnum(changedBlock.kind),
          lit(":"),
          fromNumber(changedBlock.delta),
        ),
      ),
    ),
  };
}
/**
 * 形状各部分展开后格式化（遥测）。
 */
//@ chunk-g54kbxqw.js:79534-79587 layout
function formatShapeParts(e) {
  return joinSafe(e.flatMap((n) => kXt(n) ?? []));
}
/**
 * system 折叠段位置变化时给出前后段差异。
 */
//@ chunk-g54kbxqw.js:79587-80140 layout
function describeSystemFoldChange(e, n) {
  let s = e?.prevSysFoldShape,
    r = e?.firstChangedMessageIndex;
  if (!e?.messagesHistoryChanged || (r !== n?.index && r !== s?.index)) return {};
  let h = {
    sysFoldIndex: n?.index ?? -1,
    ...(n && { sysFoldParts: blockOutlineKey(n.parts), sysFoldPartCount: n.partCount }),
    ...(s && { sysFoldPrevParts: blockOutlineKey(s.parts), sysFoldPrevPartCount: s.partCount }),
  };
  if (!s || !n) return h;
  let y = diffPromptParts(s, n);
  return {
    ...h,
    sysFoldChangedParts: positionedOutlineKey(y.changedParts),
    sysFoldAddedTypes: formatShapeParts(y.addedTypes),
    sysFoldRemovedTypes: formatShapeParts(y.removedTypes),
    sysFoldReordered: y.reordered,
    sysFoldOtherDelta: y.otherDelta,
    sysFoldLenDelta: n.len - s.len,
  };
}
/**
 * 响应后检查：按 cache_read 降幅与 pendingChanges 判断是否断裂，结合距上次回答是否超过 5 分钟/1 小时（TTL 过期）上报原因。
 */
//@ chunk-g54kbxqw.js:80140-85530 layout
async function checkResponseForCacheBreak(e, n, s, r, h, y, k, C) {
  let R = getTrackingKey(e, h);
  if (!R) {
    if (e === AGENT_SUMMARY && h !== void 0)
      checkSummaryForkCacheBreak(h, { requestId: y, cacheReadTokens: n, cacheCreationTokens: s });
    return;
  }
  let S = promptCacheBreakState().previousStateBySource.get(R);
  if (!S) return;
  if (isExcludedModel(S.model)) return;
  try {
    let prevCacheReadTokens = S.prevCacheReadTokens;
    S.prevCacheReadTokens = n;
    let baselineFromDisk = S.baselineFromDisk;
    S.baselineFromDisk = !1;
    let L = baselineFromDisk && needsResumeBaseline(S),
      resumeBaseline = S.resumeBaseline;
    S.resumeBaseline = void 0;
    let last = r.findLast((z) => z.type === "assistant"),
      q = last ? Date.now() - new Date(last.timestamp).getTime() : null,
      G = q !== null && q > CACHE_TTL_5M_MS,
      se = q !== null && q > oR;
    if (prevCacheReadTokens === null) {
      S.pendingChanges = null;
      return;
    }
    let pendingChanges = S.pendingChanges;
    if (L) {
      if (!S.cacheDeletionsPending) {
        let z = isCacheReadDrop(prevCacheReadTokens, n);
        if (pendingChanges || z)
          reportCacheBreak(S, pendingChanges, {
            requestId: y,
            querySource: e,
            cacheBroke: z,
            baselineFromDisk: baselineFromDisk,
            prevCacheReadTokens: prevCacheReadTokens,
            cacheReadTokens: n,
            cacheCreationTokens: s,
            lastAssistantMsgOver5minAgo: G,
            lastAssistantMsgOver1hAgo: se,
          });
      }
      S.pendingChanges = null;
      return;
    }
    if (S.cacheDeletionsPending) {
      ((S.cacheDeletionsPending = !1),
        logForDebugging(
          `[PROMPT CACHE] cache deletion applied, cache read: ${prevCacheReadTokens} \u2192 ${n} (expected drop)`,
        ),
        (S.pendingChanges = null));
      return;
    }
    let ie = isCacheReadDrop(prevCacheReadTokens, n);
    if (pendingChanges || ie)
      reportCacheBreak(S, pendingChanges, {
        requestId: y,
        querySource: e,
        cacheBroke: ie,
        baselineFromDisk: baselineFromDisk,
        prevCacheReadTokens: prevCacheReadTokens,
        cacheReadTokens: n,
        cacheCreationTokens: s,
        lastAssistantMsgOver5minAgo: G,
        lastAssistantMsgOver1hAgo: se,
      });
    if (!ie) {
      S.pendingChanges = null;
      return;
    }
    let _e = pendingChanges ? checkResponseForCacheBreak_2(pendingChanges, baselineFromDisk) : [],
      re;
    if (_e.length > 0) re = _e.join(", ");
    else if (se) re = "possible 1h TTL expiry (prompt unchanged)";
    else if (G) re = "possible 5min TTL expiry (prompt unchanged)";
    else if (q !== null) re = "likely server-side (prompt unchanged, <5min gap)";
    else re = "unknown cause";
    if (C ?? (isCacheBreakTrackedSource(e, h) && e !== "compact")) {
      let z = [];
      if (pendingChanges?.systemPromptChanged) z.push("system_prompt_changed");
      if (pendingChanges?.toolSchemasChanged) z.push("tools_changed");
      if (pendingChanges?.modelChanged) z.push("model_changed");
      if (pendingChanges?.fastModeChanged) z.push("fast_mode_changed");
      if (
        pendingChanges &&
        (pendingChanges.globalCacheStrategyChanged ||
          (pendingChanges.cacheControlChanged && !pendingChanges.systemPromptChanged))
      )
        z.push("cache_scope_or_ttl_changed");
      if (pendingChanges?.betasChanged) z.push("betas_changed");
      if (pendingChanges?.effortChanged) z.push("effort_changed");
      if (pendingChanges?.thinkingModeChanged) z.push("thinking_mode_changed");
      if (pendingChanges?.thinkingDisplayChanged) z.push("thinking_display_changed");
      if (pendingChanges?.autoModeChanged) z.push("auto_mode_changed");
      if (pendingChanges?.overageChanged) z.push("overage_changed");
      if (pendingChanges?.extraBodyChanged || pendingChanges?.cacheDiagnosisChanged)
        z.push("extra_body_changed");
      if (pendingChanges?.deferLoadingPresenceChanged) z.push("defer_loading_changed");
      if (pendingChanges?.messagesHistoryChanged) z.push("messages_rewritten");
      if (z.length === 0) {
        let Re = S.is1hCacheTTL ? se : G;
        z.push(
          Re
            ? S.is1hCacheTTL
              ? "ttl_expired_1h"
              : "ttl_expired_5m"
            : q !== null
              ? "likely_server_side"
              : "unknown",
        );
      }
      attributePromptCacheMiss(MAIN, {
        causes: z,
        ...(pendingChanges?.toolSchemasChanged &&
          (pendingChanges.addedToolCount > 0 || pendingChanges.removedToolCount > 0) && {
            toolsAdded: pendingChanges.addedToolCount,
            toolsRemoved: pendingChanges.removedToolCount,
          }),
        ...(pendingChanges?.systemPromptChanged && { systemCharDelta: pendingChanges.systemCharDelta }),
      });
    }
    if (isCacheBreakOutlineEnabled())
      logEvent("tengu_prompt_cache_break", {
        systemPromptChanged: pendingChanges?.systemPromptChanged ?? !1,
        toolSchemasChanged: pendingChanges?.toolSchemasChanged ?? !1,
        modelChanged: pendingChanges?.modelChanged ?? !1,
        fastModeChanged: pendingChanges?.fastModeChanged ?? !1,
        cacheControlChanged: pendingChanges?.cacheControlChanged ?? !1,
        globalCacheStrategyChanged: pendingChanges?.globalCacheStrategyChanged ?? !1,
        betasChanged: pendingChanges?.betasChanged ?? !1,
        autoModeChanged: pendingChanges?.autoModeChanged ?? !1,
        overageChanged: pendingChanges?.overageChanged ?? !1,
        cacheDiagnosisChanged: pendingChanges?.cacheDiagnosisChanged ?? !1,
        effortChanged: pendingChanges?.effortChanged ?? !1,
        thinkingModeChanged: pendingChanges?.thinkingModeChanged ?? !1,
        thinkingDisplayChanged: pendingChanges?.thinkingDisplayChanged ?? !1,
        extraBodyChanged: pendingChanges?.extraBodyChanged ?? !1,
        deferLoadingPresenceChanged: pendingChanges?.deferLoadingPresenceChanged ?? !1,
        messagesHistoryChanged: pendingChanges?.messagesHistoryChanged ?? !1,
        firstChangedMessageIndex: pendingChanges?.firstChangedMessageIndex ?? -1,
        addedToolCount: pendingChanges?.addedToolCount ?? 0,
        removedToolCount: pendingChanges?.removedToolCount ?? 0,
        systemCharDelta: pendingChanges?.systemCharDelta ?? 0,
        prevBlockCount: pendingChanges?.prevBlockCount ?? 0,
        newBlockCount: pendingChanges?.newBlockCount ?? 0,
        changedBlockIndices: fromNumberArr(pendingChanges?.changedBlockIndices ?? []),
        changedBlockLengthDeltas: fromNumberArr(pendingChanges?.changedBlockLengthDeltas ?? []),
        addedTools: joinSafe((pendingChanges?.addedTools ?? []).map(sanitizeToolNameForTelemetry)),
        removedTools: joinSafe(
          (baselineFromDisk ? [] : (pendingChanges?.removedTools ?? [])).map(sanitizeToolNameForTelemetry),
        ),
        changedToolSchemas: joinSafe(
          (pendingChanges?.changedToolSchemas ?? []).map(sanitizeToolNameForTelemetry),
        ),
        addedBetas: hashToolNames(pendingChanges?.addedBetas ?? []),
        removedBetas: hashToolNames(baselineFromDisk ? [] : (pendingChanges?.removedBetas ?? [])),
        prevGlobalCacheStrategy: fromEnumOpt(pendingChanges?.prevGlobalCacheStrategy),
        newGlobalCacheStrategy: fromEnumOpt(pendingChanges?.newGlobalCacheStrategy),
        systemHash: S.systemHash,
        toolsHash: S.toolsHash,
        is1hCacheTTL: S.is1hCacheTTL,
        queryDepth: S.queryDepth,
        querySource: agentTypeForTelemetry(e),
        model: telemetrySafeModelName(S.model),
        globalCacheStrategy: fromEnum(S.globalCacheStrategy),
        callNumber: S.callCount,
        prevCacheReadTokens: prevCacheReadTokens,
        cacheReadTokens: n,
        cacheCreationTokens: s,
        timeSinceLastAssistantMsg: q ?? -1,
        lastAssistantMsgOver5minAgo: G,
        lastAssistantMsgOver1hAgo: se,
        isCowork: env.CLAUDE_CODE_IS_COWORK,
        isDesktop: isManagedOAuthContext_2(),
        baselineFromDisk: baselineFromDisk,
        versionChanged: !baselineFromDisk
          ? !1
          : !S.baselineBuildVersion
            ? void 0
            : S.baselineBuildVersion !== CACHE_BREAK_HINTS,
        ...describeFirstMessageChange(pendingChanges, S.msg0Shape),
        ...describeSystemFoldChange(pendingChanges, S.sysFoldShape),
        ...(pendingChanges?.messagesHistoryChanged &&
          changedMessageFields(
            pendingChanges.prevMessageOutlines?.()?.[pendingChanges.firstChangedMessageIndex],
            S.messageOutlines?.()?.[pendingChanges.firstChangedMessageIndex],
          )),
        isSubagent: h !== void 0,
        isResume: resumeBaseline !== void 0,
        resumedInNewProcess: resumeBaseline?.newProcess === !0,
        prevMessageCount: S.baselineMessageHashes?.length ?? -1,
        newMessageCount: S.messageHashes.length,
        requestId: ye(y) ?? lit(""),
        previousMessageId: ye(k) ?? lit(""),
      });
    let ge;
    if (isCacheBreakOutlineEnabled()) {
      let z = ge ? `, diff: ${ge}` : "",
        Re = `[PROMPT CACHE BREAK] ${re} [source=${e}, call #${S.callCount}, cache read: ${prevCacheReadTokens} \u2192 ${n}, creation: ${s}${z}]`;
      logForDebugging(Re, { level: "warn" });
    }
    S.pendingChanges = null;
  } catch (error) {
    logError(error);
  } finally {
    persistPreviousStates();
  }
}
/**
 * 上报一次缓存断裂（模型、beta、变化类型、cache read/creation、TTL 是否过期）。
 */
//@ chunk-g54kbxqw.js:85530-86621 layout
function reportCacheBreak(
  e,
  n,
  {
    requestId: requestId,
    querySource: querySource,
    cacheBroke: cacheBroke,
    baselineFromDisk: baselineFromDisk,
    prevCacheReadTokens: prevCacheReadTokens,
    cacheReadTokens: cacheReadTokens,
    cacheCreationTokens: cacheCreationTokens,
    lastAssistantMsgOver5minAgo: lastAssistantMsgOver5minAgo,
    lastAssistantMsgOver1hAgo: lastAssistantMsgOver1hAgo,
  },
) {
  try {
    let P = prefixBreakSampleRate();
    if (!isSampledIn(getSessionId(), P)) return;
    explainCacheBreak({
      requestId: requestId,
      model: e.model,
      prevModel: n?.previousModel ?? e.model,
      prevBetas: n?.previousBetas ?? e.betas,
      newBetas: e.betas,
      cacheBroke: cacheBroke,
      changeKinds: n ? fromEnumArr(CHANGE_KINDS.filter((L) => n[L])) : lit("none"),
      firstChangedMessageIndex: n?.firstChangedMessageIndex ?? -1,
      prev:
        n?.prevHashSampleMessages !== void 0
          ? { source: "memory", messages: n.prevHashSampleMessages }
          : n?.prevHydratedHashRows !== void 0
            ? { source: "disk", rows: n.prevHydratedHashRows }
            : { source: "none" },
      prevSource: e.baselineHashSource ?? "none",
      newMessages: e.hashSampleMessages,
      prevMessageCount: e.baselineMessageHashes?.length ?? -1,
      newMessageCount: e.messageHashes.length,
      callNumber: e.callCount,
      baselineFromDisk: baselineFromDisk,
      baselineKind: "previous_request",
      prevCacheReadTokens: prevCacheReadTokens,
      cacheReadTokens: cacheReadTokens,
      cacheCreationTokens: cacheCreationTokens,
      sampleRate: P,
      is1hCacheTTL: e.is1hCacheTTL,
      lastAssistantMsgOver5minAgo: lastAssistantMsgOver5minAgo,
      lastAssistantMsgOver1hAgo: lastAssistantMsgOver1hAgo,
      querySource: agentTypeForTelemetry(querySource),
    });
  } catch (error) {
    logError(error);
  }
}
/**
 * 去掉 messagesHistoryChanged 的变化类型。
 */
//@ chunk-g54kbxqw.js:86621-86673 layout
var SCALAR_CHANGE_KINDS = CHANGE_KINDS.filter((e) => e !== "messagesHistoryChanged");
/**
 * 摘要代理分叉：记录相对父来源的标量变化与消息基线。
 */
//@ chunk-g54kbxqw.js:86673-87322 layout
function recordSummaryFork_2({
  forkAgentId: forkAgentId,
  parentKey: parentKey,
  scalars: scalars,
  messageHashes: messageHashes,
  messages: messages,
}) {
  let { previousStateBySource: previousStateBySource, summaryForks: summaryForks } = promptCacheBreakState(),
    C = previousStateBySource.get(parentKey),
    R = C ? diffPromptScalars(C, scalars) : void 0;
  summaryForks.delete(forkAgentId);
  while (summaryForks.size >= MAX_SUMMARY_FORKS) {
    let S = summaryForks.keys().next().value;
    if (S === void 0) break;
    summaryForks.delete(S);
  }
  summaryForks.set(forkAgentId, {
    parentFound: C !== void 0,
    parentMessageHashes: C?.messageHashes ?? [],
    prevMessages: C?.hashSampleMessages,
    prevCacheReadTokens: C?.prevCacheReadTokens ?? null,
    callNumber: C?.callCount ?? 0,
    model: scalars.model,
    prevModel: C?.model ?? scalars.model,
    prevBetas: C?.betas ?? scalars.betas,
    newBetas: scalars.betas,
    scalarFlags: R ? SCALAR_CHANGE_KINDS.filter((S) => R[S]) : [],
    firstChangedMessageIndex: C ? findFirstChangedHash(C.messageHashes, messageHashes) : -1,
    newMessages: messages,
    newMessageCount: messageHashes.length,
  });
}
/**
 * 摘要分叉补记本次消息与首个变化下标。
 */
//@ chunk-g54kbxqw.js:87322-87522 layout
function updateSummaryForkMessages(e, n, s) {
  let r = promptCacheBreakState().summaryForks.get(e);
  if (!r) return;
  let h = s();
  ((r.newMessages = isPrefixBreakSampled() ? n : void 0),
    (r.newMessageCount = h.length),
    (r.firstChangedMessageIndex = r.parentFound ? findFirstChangedHash(r.parentMessageHashes, h) : -1));
}
/**
 * 摘要分叉响应后的断裂检查与上报。
 */
//@ chunk-g54kbxqw.js:87522-88683 layout
function checkSummaryForkCacheBreak(
  e,
  { requestId: requestId, cacheReadTokens: cacheReadTokens, cacheCreationTokens: cacheCreationTokens },
) {
  try {
    let { summaryForks: summaryForks } = promptCacheBreakState(),
      y = summaryForks.get(e);
    if (!y) return;
    if ((summaryForks.delete(e), isExcludedModel(y.model))) return;
    let k = prefixBreakSampleRate();
    if (!isSampledIn(getSessionId(), k)) return;
    let prevCacheReadTokens = y.prevCacheReadTokens,
      R = prevCacheReadTokens !== null && isCacheReadDrop(prevCacheReadTokens, cacheReadTokens),
      S = y.firstChangedMessageIndex !== -1;
    if (y.parentFound && y.scalarFlags.length === 0 && !S && !R) return;
    let w = [...y.scalarFlags, ...(S ? ["messagesHistoryChanged"] : [])];
    explainCacheBreak({
      requestId: requestId,
      model: y.model,
      prevModel: y.prevModel,
      prevBetas: y.prevBetas,
      newBetas: y.newBetas,
      cacheBroke: R,
      changeKinds: w.length > 0 ? fromEnumArr(w) : lit("none"),
      firstChangedMessageIndex: y.firstChangedMessageIndex,
      prev: y.prevMessages !== void 0 ? { source: "memory", messages: y.prevMessages } : { source: "none" },
      prevSource: y.prevMessages !== void 0 ? "memory" : "none",
      newMessages: y.newMessages,
      prevMessageCount: y.parentFound ? y.parentMessageHashes.length : -1,
      newMessageCount: y.newMessageCount,
      callNumber: y.callNumber,
      baselineFromDisk: !1,
      baselineKind: y.parentFound ? "parent_agent" : "parent_agent_missing",
      prevCacheReadTokens: prevCacheReadTokens ?? -1,
      cacheReadTokens: cacheReadTokens,
      cacheCreationTokens: cacheCreationTokens,
      sampleRate: k,
      is1hCacheTTL: void 0,
      lastAssistantMsgOver5minAgo: void 0,
      lastAssistantMsgOver1hAgo: void 0,
      querySource: agentTypeForTelemetry(AGENT_SUMMARY),
    });
  } catch (error) {
    logError(error);
  }
}
/**
 * 服务器 cache diagnosis 类型：model/system/tools/messages_changed、previous_message_not_found、unavailable。
 */
//@ chunk-g54kbxqw.js:88683-88809 layout
var KNOWN_CACHE_DIAGNOSIS_TYPES = {
  model_changed: !0,
  system_changed: !0,
  tools_changed: !0,
  messages_changed: !0,
  previous_message_not_found: !0,
  unavailable: !0,
};
/**
 * 诊断类型是否已知。
 */
//@ chunk-g54kbxqw.js:88809-88851 layout
function isKnownCacheDiagnosisType(e) {
  return Object.hasOwn(KNOWN_CACHE_DIAGNOSIS_TYPES, e);
}
/**
 * 记 tengu_prompt_cache_diagnosis_received（诊断类型、缺失 token 等）。
 */
//@ chunk-g54kbxqw.js:88851-89316 layout
function logCacheDiagnosisReceived(e, n) {
  try {
    logEvent("tengu_prompt_cache_diagnosis_received", {
      diagnosisType:
        typeof e.type !== "string"
          ? void 0
          : isKnownCacheDiagnosisType(e.type)
            ? fromEnum(e.type)
            : lit("other"),
      tokensMissed: typeof e.cache_missed_input_tokens === "number" ? e.cache_missed_input_tokens : -1,
      requestId: ye(n.requestId) ?? lit(""),
      previousMessageId: ye(n.previousMessageId) ?? lit(""),
      model: telemetrySafeModelName(n.model),
      isCowork: env.CLAUDE_CODE_IS_COWORK,
      is1hCacheTTL: n.is1hCacheTTL,
      querySource: agentTypeForTelemetry(n.querySource),
      queryDepth: n.queryDepth,
    });
  } catch (error) {
    logError(error);
  }
}
/**
 * 通知缓存被有意删除（如工具结果清除），下一次 cache_read 下降不算意外断裂。
 */
//@ chunk-g54kbxqw.js:89316-89585 fingerprint = notifyCacheDeletion (0.413)
function notifyCacheDeletion(querySource, agentId) {
  if (isCacheBreakTrackedSource(querySource, agentId)) expectPromptCacheDrop(MAIN);
  hydrateCacheBreakState();
  let key = getTrackingKey(querySource, agentId),
    previousStateBySource = promptCacheBreakState().previousStateBySource,
    state = key ? previousStateBySource.get(key) : void 0;
  if (state && !(state.baselineFromDisk && state.diffedAgainst === void 0 && needsResumeBaseline(state)))
    ((state.cacheDeletionsPending = !0), persistPreviousStates());
  if (key !== null && xe(key)) {
    let y = previousStateBySource.get(COMPACT_FORK);
    if (y) y.cacheDeletionsPending = !0;
  }
}
/**
 * 通知发生压缩：重置相关来源的上次 cache_read，避免误报。
 */
//@ chunk-g54kbxqw.js:89585-90016 fingerprint = notifyCompaction (0.499)
function notifyCompaction(e) {
  if (isCacheBreakOutlineEnabled()) {
    let classifierCompactions = promptCacheBreakState().classifierCompactions,
      y = classifierCompactions.get(e) ?? [];
    if (
      (classifierCompactions.delete(e),
      classifierCompactions.set(e, [...y, Date.now()].slice(-MAX_COMPACTION_TIMESTAMPS)),
      classifierCompactions.size > MAX_CLASSIFIER_COMPACTION_KEYS)
    ) {
      let found = [...classifierCompactions.keys()].find((C) => C !== void 0);
      if (found !== void 0) classifierCompactions.delete(found);
    }
  }
  hydrateCacheBreakState();
  let previousStateBySource = promptCacheBreakState().previousStateBySource,
    s = previousStateBySource.get(COMPACT_FORK);
  if (s) s.prevCacheReadTokens = null;
  if (e) {
    let h = previousStateBySource.get(e);
    if (h) ((h.prevCacheReadTokens = null), persistPreviousStates());
    return;
  }
  let r = !1;
  for (let [h, y] of previousStateBySource) if (xe(h)) ((y.prevCacheReadTokens = null), (r = !0));
  if (r) persistPreviousStates();
}
//@ chunk-g54kbxqw.js:90016-90187 placement
function forgetClassifierCompaction(e) {
  promptCacheBreakState().classifierCompactions.delete(e);
  let classifierLines = promptCacheBreakState().classifierLines;
  for (let [s, r] of classifierLines) if (r.agentId === e) classifierLines.delete(s);
  if (promptCacheBreakState().previousStateBySource.delete(e)) persistPreviousStates();
}
//@ chunk-g54kbxqw.js:90187-90286 placement
var CACHE_STATE_LIMITS = 32,
  Mlr = 2000000,
  Za = DoctorLazy(() =>
    create({
      v: create_25(1),
      by: create_2().max(64),
      state: cacheBreakStateSchema().valueSchema,
      outlines: create_12(),
    }),
  );
//@ chunk-g54kbxqw.js:90286-90898 placement
function parkAgentBaseline(e) {
  try {
    let n = promptCacheBreakState(),
      s = n.previousStateBySource.get(e);
    if ((forgetClassifierCompaction(e), s === void 0)) return;
    let { prefixBreakHash: prefixBreakHash, ...h } = stripSnapshotPayload(s),
      { messageOutlines: messageOutlines } = s;
    messageOutlines?.();
    let { parkedAgentBaselines: parkedAgentBaselines } = n;
    parkedAgentBaselines.delete(e);
    while (parkedAgentBaselines.size >= CACHE_STATE_LIMITS) {
      let R = parkedAgentBaselines.keys().next().value;
      if (R === void 0) break;
      parkedAgentBaselines.delete(R);
    }
    if (
      (parkedAgentBaselines.set(e, {
        ...h,
        messageOutlines: messageOutlines,
        pendingChanges: null,
        baselineFromDisk: s.baselineFromDisk,
        baselineBuildVersion: s.baselineBuildVersion,
        resumeBaseline: s.resumeBaseline,
        content: Ln(h.model),
      }),
      !isCacheBreakOutlineEnabled() || isDiskless())
    )
      return;
    n.parkedBy ??= randomUUID();
    let C = jsonStringify({
      v: 1,
      by: n.parkedBy,
      state: h,
      outlines: compactBaseline(messageOutlines?.() ?? []),
    });
    return C.length <= Mlr ? C : void 0;
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-g54kbxqw.js:90898-90954 placement
function Ln(e) {
  return () => ({ model: e, system: [], tools: [] });
}
//@ chunk-g54kbxqw.js:90954-91010 placement
function hasParkedAgentBaseline(e) {
  return promptCacheBreakState().parkedAgentBaselines.has(e);
}
//@ chunk-g54kbxqw.js:91010-91615 placement
function restoreAgentBaseline(e, n) {
  try {
    let s = promptCacheBreakState(),
      { previousStateBySource: previousStateBySource, parkedAgentBaselines: parkedAgentBaselines } = s,
      y = parkedAgentBaselines.get(e);
    if ((parkedAgentBaselines.delete(e), previousStateBySource.has(e))) return;
    let k;
    if (y !== void 0) k = { ...y, resumeBaseline: y.resumeBaseline ?? { source: "memory", newProcess: !1 } };
    else {
      if (n === null) return;
      let C;
      try {
        C = Za().safeParse(jsonParse(n));
      } catch {
        return;
      }
      if (!C.success) return;
      let { by: by, state: state, outlines: outlines } = C.data,
        P = restoreBaseline(outlines);
      k = {
        ...state,
        prefixBreakHash: void 0,
        messageOutlines: P && (() => P),
        pendingChanges: null,
        baselineFromDisk: !0,
        baselineBuildVersion: state.buildVersion,
        resumeBaseline: { source: "disk", newProcess: by !== s.parkedBy },
        content: Ln(state.model),
      };
    }
    (hydrateCacheBreakState(), cleanupAgentTracking(previousStateBySource), previousStateBySource.set(e, k));
  } catch (error) {
    logError(error);
  }
}
//@ chunk-g54kbxqw.js:91615-92203 placement
function recordSummaryFork(e) {
  let n = promptCacheBreakState(),
    s = n.previousStateBySource.size === 0 && !n.hydrationAttempted;
  n.summaryForks.clear();
  for (let r of [...n.parkedAgentBaselines.keys()]) if (!e?.has(r)) n.parkedAgentBaselines.delete(r);
  for (let [r, h] of n.classifierLines)
    if (h.agentId === void 0 || !e?.has(h.agentId)) n.classifierLines.delete(r);
  for (let r of n.classifierCompactions.keys())
    if (r === void 0 || !e?.has(r)) n.classifierCompactions.delete(r);
  if (e?.size) {
    for (let r of [...n.previousStateBySource.keys()]) if (!e.has(r)) n.previousStateBySource.delete(r);
  } else (n.previousStateBySource.clear(), (n.hydrationAttempted = !1));
  if (!s) persistPreviousStates();
}
/**
 * 系统提示词"# Reporting outcomes"段：要求只报告在本会话中观察到的结果。
 */
//@ chunk-1t61stbc.js:302-1230 placement
var REPORTING_OUTCOMES_SECTION = `# Reporting outcomes

Report what actually happened, not what you intended. When you say something is done, sent, saved, fixed, or verified, that claim must rest on a result you observed in this session \u2014 tool output, the file as it now reads, the page as it now loads \u2014 not on what the step should have produced. If you did not check, say you did not check. If any step failed, was skipped, or came back different from what you expected, say so in the first sentence of your report, before anything else, even when the rest of the work succeeded. Never quietly work around a failure in a way that makes it look resolved; a problem the user can see is recoverable, one your summary hides is not. When you stop before the task is complete, your first line says so plainly and names what is left. Do not describe partial work as done, and do not let a summary read as more certain than the evidence behind it.`;
//@ chunk-1t61stbc.js:1230-1268 placement
var X_ANTHROPIC_BILLING_HEADER = "x-anthropic-billing-header:";
//@ chunk-1t61stbc.js:1268-1343 placement
function isBillingHeaderBlock(e) {
  let text = e.text;
  return typeof text === "string" && text.startsWith(X_ANTHROPIC_BILLING_HEADER);
}
/**
 * system 块是计费头（x-anthropic-billing-header:）或 "# Reporting outcomes" 段（不参与缓存比对）。
 */
//@ chunk-1t61stbc.js:1343-1428 layout
function isUncachedSystemBlock(e) {
  let text = e.text;
  return (
    typeof text === "string" &&
    (text.startsWith(X_ANTHROPIC_BILLING_HEADER) || text === REPORTING_OUTCOMES_SECTION)
  );
}
/**
 * 对象 JSON 序列化后用 Bun.hash 取 32 位哈希。
 */
//@ chunk-1t61stbc.js:1428-1515 fingerprint = computeHash (0.745)
function computeHash(data) {
  let hash = Bun.hash(jsonStringify(data));
  return typeof hash === "bigint" ? Number(hash & 0xffffffffn) : hash;
}
//@ chunk-1t61stbc.js:1515-1626 placement
var FINGERPRINT_BLOCK_KEYS = new Set([
  "type",
  "text",
  "thinking",
  "id",
  "tool_use_id",
  "name",
  "input",
  "source",
  "content",
  "cache_control",
]);
//@ chunk-1t61stbc.js:1626-3308 placement
function fingerprintContentBlock(e, t) {
  if (typeof e === "string") {
    t.push("s", String(e.length), e.slice(0, 32), e.slice(-32));
    return;
  }
  switch (e.type) {
    case "text":
    case "image":
    case "document":
    case "search_result":
    case "thinking":
    case "redacted_thinking":
    case "tool_use":
    case "tool_result":
    case "tool_reference":
    case "server_tool_use":
    case "web_search_tool_result":
    case "web_fetch_tool_result":
    case "advisor_tool_result":
    case "code_execution_tool_result":
    case "bash_code_execution_tool_result":
    case "text_editor_code_execution_tool_result":
    case "tool_search_tool_result":
    case "mcp_tool_use":
    case "mcp_tool_result":
    case "mcp_tool_listing":
    case "container_upload":
    case "compaction":
    case "fallback":
    case "browser_state":
      break;
    default: {
      let n = e;
      break;
    }
  }
  if ((t.push(e.type), "text" in e && typeof e.text === "string"))
    t.push("t", String(e.text.length), e.text.slice(0, 32), e.text.slice(-32));
  if ("thinking" in e && typeof e.thinking === "string") t.push("k", String(e.thinking.length));
  if ("id" in e && typeof e.id === "string") t.push("i", e.id);
  if ("tool_use_id" in e && typeof e.tool_use_id === "string") t.push("u", e.tool_use_id);
  if ("name" in e && typeof e.name === "string") t.push("n", e.name);
  if ("input" in e && e.input !== void 0) t.push("p", jsonStringify(e.input));
  if ("source" in e && e.source && typeof e.source === "object") {
    let source = e.source;
    if (
      (t.push("m", String(source.type ?? ""), String(source.media_type ?? "")),
      typeof source.data === "string")
    )
      t.push(String(source.data.length));
  }
  let s = "content" in e ? e.content : void 0;
  if (Array.isArray(s)) {
    t.push("[", String(s.length));
    for (let n of s) fingerprintContentBlock(n, t);
    t.push("]");
  } else if (typeof s === "string") t.push("c", String(s.length), s.slice(0, 32), s.slice(-32));
  for (let [n, r] of Object.entries(e)) {
    if (FINGERPRINT_BLOCK_KEYS.has(n) || r === void 0) continue;
    let o = typeof r === "string" ? r : jsonStringify(r);
    t.push(n, o.length > 256 ? `len:${o.length}` : o);
  }
}
//@ chunk-1t61stbc.js:3308-3319 placement
var EPHEMERAL_MESSAGE_MARK = -1;
/**
 * 为每条消息计算缓存指纹（角色、内容块摘要），临时消息记为 -1，用于判断提示缓存是否被打破。
 */
//@ chunk-1t61stbc.js:3319-3770 placement
function fingerprintMessagesForCache(e) {
  return e.map((t) => {
    if ((t.type === "api_system" || t.type === "user") && t.ephemeral) return EPHEMERAL_MESSAGE_MARK;
    let s = [t.message.role];
    if (t.type === "api_system" && t.outputConfig !== void 0) {
      let timing = t.outputConfig.timing;
      s.push(`oc:${t.outputConfig.effort ?? ""}${timing ? `:${timing.now}` : ""}`);
    }
    let content = t.message.content;
    if (Array.isArray(content)) {
      s.push(String(content.length));
      for (let o of content) fingerprintContentBlock(o, s);
    } else fingerprintContentBlock(content, s);
    let hash = Bun.hash(s.join("|"));
    return typeof hash === "bigint" ? Number(hash & 0xffffffffn) : hash;
  });
}
//@ chunk-1t61stbc.js:3770-3795 placement
var CACHE_TTL_5M_MS = 300000,
  oR = 3600000;
//@ chunk-1t61stbc.js:3795-3947 placement
function getCacheCreationTtl(e) {
  if ((e?.cache_creation?.ephemeral_5m_input_tokens ?? 0) > 0) return "5m";
  return (e?.cache_creation?.ephemeral_1h_input_tokens ?? 0) > 0 ? "1h" : void 0;
}
//@ chunk-1t61stbc.js:3947-3961 placement
var MAIN = "main";
/**
 * 第二个参数为假（非代理请求）且 querySource 为 repl_main_thread*、sdk、compact 时为真，供提示缓存断裂检测决定是否跟踪；不是压缩后清理。
 */
//@ chunk-1t61stbc.js:3961-4050 placement = runPostCompactCleanup (0.926)
function isCacheBreakTrackedSource(e, t) {
  return !t && (e.startsWith("repl_main_thread") || e === "sdk" || e === "compact");
}
//@ chunk-1t61stbc.js:4050-4087 placement
var y = 2000,
  x = 200,
  g = { "5m": CACHE_TTL_5M_MS, "1h": oR };
//@ chunk-1t61stbc.js:4087-4860 placement
var CACHE_BREAK_REASONS = {
  system_prompt_changed: "system prompt changed",
  tools_changed: "tool definitions changed",
  model_changed: "model changed",
  fast_mode_changed: "fast mode toggled",
  cache_scope_or_ttl_changed: "cache scope or TTL changed",
  betas_changed: "beta headers changed",
  effort_changed: "effort changed",
  thinking_mode_changed: "thinking toggled",
  thinking_display_changed: "thinking display changed",
  auto_mode_changed: "auto mode toggled",
  overage_changed: "usage-limit state changed",
  extra_body_changed: "extra request fields changed",
  defer_loading_changed: "deferred tool loading changed",
  messages_rewritten: "earlier messages changed",
  ttl_expired_5m: "idle past the 5m TTL",
  ttl_expired_1h: "idle past the 1h TTL",
  likely_server_side: "prompt unchanged \u2014 likely server-side",
  unknown: "unknown",
};
/**
 * 单个查询源的提示缓存命中统计：请求数、命中/未命中、冷启动、预期重建、未命中原因归因与重缓存 token 估计。
 */
//@ chunk-1t61stbc.js:4860-7402 placement
class PromptCacheTracker {
  entries = [];
  requests = 0;
  hits = 0;
  misses = 0;
  expectedRebuilds = 0;
  coldStarts = 0;
  cacheReadTokens = 0;
  cacheCreationTokens = 0;
  inputTokens = 0;
  missRecacheTokens = 0;
  lastMissAt = null;
  lastMissAttribution = null;
  missCauses = {};
  pendingAttribution = null;
  dropExpectedAt = null;
  touchedAt = null;
  touch(e) {
    if (this.entries.length > 0) this.touchedAt = Math.max(this.touchedAt ?? 0, e);
  }
  expectDrop(e) {
    this.dropExpectedAt = e;
  }
  attribute(e) {
    this.pendingAttribution = e;
  }
  record(e) {
    let t = this.entries.at(-1) ?? null,
      dropExpectedAt = this.dropExpectedAt;
    this.dropExpectedAt = null;
    let pendingAttribution = this.pendingAttribution;
    this.pendingAttribution = null;
    let r = dropExpectedAt !== null && t !== null && e.at - Math.max(t.at, this.touchedAt ?? 0) < g[t.ttl],
      o,
      a =
        this.cacheReadTokens + this.cacheCreationTokens > 0 || e.cacheReadTokens + e.cacheCreationTokens > 0;
    if (t === null) o = "cold";
    else if (!a) o = "uncached";
    else if (t.cacheReadTokens + t.cacheCreationTokens === 0 && e.cacheReadTokens + e.cacheCreationTokens > 0)
      o = "cold";
    else {
      let c = t.inputTokens + t.cacheReadTokens + t.cacheCreationTokens,
        C = e.inputTokens + e.cacheReadTokens + e.cacheCreationTokens,
        min = Math.min(c, C),
        T = min - e.cacheReadTokens;
      o = e.cacheReadTokens < min * 0.95 && T >= y ? (r ? "expected" : "miss") : "hit";
    }
    let d = e.cacheCreationTokens === 0 && t !== null ? t.ttl : e.ttl,
      p =
        o === "miss" && pendingAttribution !== null
          ? { ...e, ttl: d, outcome: o, attribution: pendingAttribution }
          : { ...e, ttl: d, outcome: o };
    if ((this.entries.push(p), this.entries.length > x)) this.entries.shift();
    switch (
      (this.requests++,
      (this.cacheReadTokens += e.cacheReadTokens),
      (this.cacheCreationTokens += e.cacheCreationTokens),
      (this.inputTokens += e.inputTokens),
      o)
    ) {
      case "hit":
        this.hits++;
        break;
      case "miss":
        (this.misses++,
          (this.missRecacheTokens += e.cacheCreationTokens),
          (this.lastMissAt = e.at),
          (this.lastMissAttribution = pendingAttribution));
        for (let c of pendingAttribution?.causes ?? []) this.missCauses[c] = (this.missCauses[c] ?? 0) + 1;
        break;
      case "expected":
        this.expectedRebuilds++;
        break;
      case "cold":
        this.coldStarts++;
        break;
      case "uncached":
        break;
    }
    return p;
  }
  summary(e) {
    let t = this.cacheReadTokens + this.cacheCreationTokens + this.inputTokens,
      s = this.entries.at(-1) ?? null,
      n = g[s?.ttl ?? "5m"],
      r = this.cacheReadTokens + this.cacheCreationTokens > 0,
      o = s !== null && s.cacheReadTokens + s.cacheCreationTokens > 0,
      a = s !== null ? Math.max(s.at, this.touchedAt ?? 0) : 0;
    return {
      requests: this.requests,
      hits: this.hits,
      misses: this.misses,
      expectedRebuilds: this.expectedRebuilds,
      coldStarts: this.coldStarts,
      hitRatio: t > 0 ? this.cacheReadTokens / t : null,
      cacheWriteTokens: this.cacheCreationTokens,
      missRecacheTokens: this.missRecacheTokens,
      lastMissAt: this.lastMissAt,
      lastMissAttribution: this.lastMissAttribution,
      missCauses: { ...this.missCauses },
      lastRequest: s,
      cachingObserved: r,
      lastActivityAt: s !== null ? a : null,
      expiresAt: s !== null && o ? a + n : null,
      warm: s !== null && o && e - a < n,
    };
  }
}
//@ chunk-1t61stbc.js:7402-7936 placement
class PromptCacheTrackerRegistry {
  #e = new Map();
  record(e, t) {
    let s = this.#e.get(e);
    if (s === void 0) ((s = new PromptCacheTracker()), this.#e.set(e, s));
    return s.record(t);
  }
  expectDrop(e, t) {
    this.#e.get(e)?.expectDrop(t);
  }
  attribute(e, t) {
    this.#e.get(e)?.attribute(t);
  }
  touch(e, t) {
    this.#e.get(e)?.touch(t);
  }
  summary(e, t) {
    return (this.#e.get(e) ?? new PromptCacheTracker()).summary(t);
  }
  estimateRecacheTokens(e) {
    let t = this.#e.get(e),
      s = t?.entries.at(-1);
    if (!s) return 0;
    if (t?.dropExpectedAt != null) return null;
    return s.inputTokens + s.cacheReadTokens + s.cacheCreationTokens;
  }
  clear(e) {
    if (e === void 0) this.#e.clear();
    else this.#e.delete(e);
  }
}
//@ chunk-1t61stbc.js:7936-7962 placement
var promptCacheTrackers = new SessionRootSlot(() => new PromptCacheTrackerRegistry());
//@ chunk-1t61stbc.js:7962-7994 placement
function i() {
  return promptCacheTrackers.of(getRootSession());
}
//@ chunk-1t61stbc.js:7994-8066 placement
function recordPromptCacheUsage(e, t) {
  try {
    return i().record(e, t);
  } catch (error) {
    return (logError(error), null);
  }
}
//@ chunk-1t61stbc.js:8066-8122 placement
function attributePromptCacheMiss(e, t) {
  try {
    i().attribute(e, t);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-1t61stbc.js:8122-8174 placement
function touchPromptCache(e, t) {
  try {
    i().touch(e, t);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-1t61stbc.js:8174-8245 placement
function expectPromptCacheDrop(e = MAIN, t = Date.now()) {
  try {
    i().expectDrop(e, t);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-1t61stbc.js:8245-8301 placement
function getPromptCacheSummary(e = MAIN, t = Date.now()) {
  return i().summary(e, t);
}
//@ chunk-1t61stbc.js:8301-8356 placement
function estimateRecacheTokens(e = MAIN) {
  return i().estimateRecacheTokens(e);
}
//@ chunk-1t61stbc.js:8356-8437 placement
function clearPromptCacheOnSessionSwitch() {
  return onSessionSwitch((e, t) => {
    if (t === "cd" || t === "hydrate") return;
    i().clear();
  });
}
//@ chunk-a76knw89.js:2168-2282 placement
var ENVELOPE_DIFF_FIELDS = [
  "betas",
  "tool_choice",
  "thinking",
  "context_management",
  "output_config",
  "speed",
  "temperature",
  "max_tokens",
];
/**
 * 由已知的模型、工具和 system 生成提示前缀账本的初始快照（标记为播种）。
 */
//@ chunk-a76knw89.js:2282-2521 placement
function seedLedgerSnapshot(e) {
  return {
    model: e.model,
    tools: e.tools.map((tool, o) => ({
      key: toolKeyOf(tool, o),
      deferred: dbn(tool),
      bound: dbn(tool),
      cacheControl: void 0,
      body: tool,
    })),
    system: e.system.map((n) => ({ preamble: !1, cacheControl: void 0, body: n })),
    messages: [],
    envelope: {},
    seeded: !0,
  };
}
/**
 * 把请求转换为可比较的快照（system 块、工具、betas、参数），可绑定引用到的延迟工具。
 */
//@ chunk-a76knw89.js:2521-3389 placement
function snapshotRequestForCacheDiff(e, n = {}) {
  let o =
      n.boundDeferredToolNames ??
      (n.bindReferencedDeferredTools === !0 ? collectReferencedDeferredTools(e.messages) : void 0),
    r = typeof e.system === "string" ? [{ type: "text", text: e.system }] : (e.system ?? []),
    c = {};
  for (let s of ENVELOPE_DIFF_FIELDS) {
    let u = s === "betas" ? kn(e.betas) : e[s];
    if (u !== void 0) c[s] = u;
  }
  return {
    model: e.model,
    envelope: c,
    tools: (e.tools ?? []).map((s, u) => ({
      key: toolKeyOf(s, u),
      deferred: s.defer_loading === !0,
      bound: s.defer_loading === !0 && typeof s.name === "string" && o?.has(s.name) === !0,
      cacheControl: getCacheControl(s),
      body: stripCacheControl(s),
    })),
    system: r.map((s) => ({
      preamble: isUncachedSystemBlock(s),
      cacheControl: getCacheControl(s),
      body: stripCacheControl(s),
    })),
    messages: e.messages.map((message, u, p) => ({
      role: message.role,
      turnScopedSystem: message.role === "system" && u === p.length - 1,
      blocks:
        typeof message.content === "string"
          ? [{ thinking: !1, cacheControl: void 0, body: { type: "text", text: message.content } }]
          : message.content.map((h) => ({
              thinking: h.type === "thinking" || h.type === "redacted_thinking",
              cacheControl: getCacheControl(h),
              body: On(stripCacheControl(h)),
            })),
    })),
  };
}
/**
 * 把提示前缀账本转成可比较的视图：去掉前导 system、回合内 system 消息和 thinking 块。
 */
//@ chunk-a76knw89.js:3389-3665 placement
function ledgerComparableView(e) {
  return {
    model: e.model,
    tools: e.tools.filter(En).map((n) => n.body),
    system: e.system.filter((n) => !n.preamble).map((n) => n.body),
    messages: e.messages
      .filter((message) => !message.turnScopedSystem)
      .map((n) => ({
        role: n.role,
        content: n.blocks.filter((block) => !block.thinking).map((o) => o.body),
      })),
  };
}
//@ chunk-a76knw89.js:3665-3743 placement
function Dri(e) {
  return e.part === "tool" || e.part === "system" || e.part === "message";
}
//@ chunk-a76knw89.js:3743-3753 placement
var pe = 16;
//@ chunk-a76knw89.js:3753-3841 placement
function AYo(e, n) {
  return e.seeded
    ? diffToolLists(e, n)
    : [
        ...diffToolLists(e, n),
        ...diffThinkingBlocks(e, n),
        ...diffCacheMarkers(e, n),
        ...describeRequestDifferences(e, n),
      ];
}
/**
 * 比较两次请求的工具列表（新增、移除、变化、重排），延迟工具单独处理。
 */
//@ chunk-a76knw89.js:3841-5399 placement
function diffToolLists(e, n) {
  let o = ledgerComparableView(e),
    r = ledgerComparableView(n),
    c = [],
    s = (k) => (c.push(k), c.length < pe),
    u = (k) => new Map([...k.filter((S) => !S.deferred), ...k.filter((S) => S.bound)].map((S) => [S.key, S])),
    p = u(e.tools),
    h = u(n.tools),
    T = [],
    y = !1;
  for (let [k, S] of p) {
    let body = S.body,
      w = h.get(k);
    if (w === void 0) {
      if (S.deferred) {
        if (!e.seeded) T.push({ part: "tool", id: k, kind: "removed", prev: body });
        continue;
      }
      if (((y = !0), !s({ part: "tool", id: k, kind: "removed", prev: body }))) return c;
    } else if (S.deferred !== w.deferred) {
      y = !0;
      let O = S.deferred
        ? { part: "tool", id: k, kind: "added", next: w.body }
        : { part: "tool", id: k, kind: "removed", prev: body };
      if (!s(O)) return c;
    } else if (!isDeepStrictEqual(body, w.body)) {
      y ||= !S.deferred;
      let body_2 = w.body,
        M =
          [...Object.keys(body), ...Object.keys(body_2)].find(
            (I) => !isDeepStrictEqual(lO(body, I), lO(body_2, I)),
          ) ?? "?";
      if (!s({ part: "tool", id: k, kind: "changed", field: M, prev: body, next: body_2 })) return c;
    }
  }
  for (let [k, S] of h)
    if (!p.has(k) && !S.deferred) {
      if (((y = !0), !s({ part: "tool", id: k, kind: "added", next: S.body }))) return c;
    }
  if (!y) {
    let k = (O) => [...O.values()].flatMap((M) => (M.deferred ? [] : [M.key])),
      S = k(p),
      found = k(h)
        .filter((O) => p.has(O))
        .find((O, M) => S[M] !== O);
    if (found !== void 0) s({ part: "tool", id: found, kind: "reordered" });
  }
  let max = Math.max(o.system.length, r.system.length);
  for (let k = 0; k < max; k++) {
    let S = o.system[k],
      x = r.system[k],
      w = S === void 0 ? "added" : x === void 0 ? "removed" : "changed";
    if (w !== "changed" || !isDeepStrictEqual(S, x)) {
      if (!s({ part: "system", index: k, kind: w, prev: S, next: x })) return c;
    }
  }
  for (let k = 0; k < o.messages.length; k++) {
    let S = o.messages[k],
      x = r.messages[k];
    if (x !== void 0 && isDeepStrictEqual(S, x)) continue;
    let w = {
      part: "message",
      index: k,
      role: S.role,
      kind: x === void 0 ? "removed" : "changed",
      prev: S,
      next: x,
    };
    if (!s(w)) return c;
  }
  for (let k of T) if (!s(k)) break;
  return c;
}
//@ chunk-a76knw89.js:5399-5876 placement
function diffThinkingBlocks(e, n) {
  let o = [],
    min = Math.min(e.messages.length, n.messages.length);
  for (let c = 0; c < min && o.length < pe; c++) {
    let s = describeSignatureField(e.messages[c]),
      u = describeSignatureField(n.messages[c]);
    if (s.length === 0 && u.length === 0) continue;
    if (s.length === u.length && s.every((h, T) => h === u[T])) continue;
    let p =
      s.slice(0, u.length).every((h, T) => h === u[T]) || u.slice(0, s.length).every((h, T) => h === s[T]);
    o.push({
      part: "thinking",
      index: c,
      kind: !p ? "changed" : u.length < s.length ? "dropped" : "added",
      prevCount: s.length,
      nextCount: u.length,
    });
  }
  return o;
}
//@ chunk-a76knw89.js:5876-6052 placement
function describeSignatureField(e) {
  return e.blocks.flatMap((block) => {
    if (!block.thinking) return [];
    let o = lO(block.body, "signature"),
      r = lO(block.body, "data");
    return [typeof o === "string" ? o : typeof r === "string" ? r : "?"];
  });
}
//@ chunk-a76knw89.js:6052-6505 placement
function diffCacheMarkers(e, n) {
  let o = collectCacheControlMarkers(e, e.messages.length),
    r = collectCacheControlMarkers(n, e.messages.length),
    c = [];
  for (let [s, { at: u, marker: p }] of o) {
    if (c.length >= pe) return c;
    let h = r.get(s);
    if (h === void 0) c.push({ part: "cache", at: u, kind: "dropped", prev: p, next: void 0 });
    else if (!isDeepStrictEqual(p, h.marker))
      c.push({ part: "cache", at: u, kind: "changed", prev: p, next: h.marker });
  }
  for (let [s, { at: u, marker: p }] of r) {
    if (c.length >= pe) return c;
    if (!o.has(s)) c.push({ part: "cache", at: u, kind: "added", prev: void 0, next: p });
  }
  return c;
}
//@ chunk-a76knw89.js:6505-6987 placement
function collectCacheControlMarkers(e, n) {
  let o = new Map();
  for (let tool of e.tools)
    if (tool.cacheControl !== void 0)
      o.set(`tools:${tool.key}`, { at: { segment: "tools", key: tool.key }, marker: tool.cacheControl });
  return (
    e.system.forEach((r, c) => {
      if (r.cacheControl !== void 0)
        o.set(`system:${c}`, { at: { segment: "system", index: c }, marker: r.cacheControl });
    }),
    e.messages.slice(0, n).forEach((r, c) => {
      r.blocks.forEach((block, u) => {
        if (block.cacheControl !== void 0)
          o.set(`messages:${c}.${u}`, {
            at: { segment: "messages", index: c, block: u },
            marker: block.cacheControl,
          });
      });
    }),
    o
  );
}
//@ chunk-a76knw89.js:6987-7249 placement
function describeRequestDifferences(e, n) {
  return [
    ["model", e.model, n.model],
    ["attribution_header", billingHeaderText(e), billingHeaderText(n)],
    ["deferred_tools", je(e), je(n)],
    ...ENVELOPE_DIFF_FIELDS.map((r) => [r, e.envelope[r], n.envelope[r]]),
  ]
    .filter(([, r, c]) => !isDeepStrictEqual(r, c))
    .map(([r, c, s]) => ({ part: "envelope", id: r, kind: "changed", prev: c, next: s }));
}
//@ chunk-a76knw89.js:7249-7288 placement
function kn(e) {
  return e && [...e].sort();
}
//@ chunk-a76knw89.js:7288-7410 placement
function billingHeaderText(e) {
  for (let n of e.system) {
    let o = lO(n.body, "text");
    if (typeof o === "string" && o.startsWith(X_ANTHROPIC_BILLING_HEADER)) return o;
  }
  return "";
}
//@ chunk-a76knw89.js:7410-7497 placement
function je(e) {
  return e.tools
    .filter((tool) => tool.deferred)
    .map((n) => n.key)
    .sort()
    .join(",");
}
//@ chunk-a76knw89.js:7497-7539 placement
function En(e) {
  return !e.deferred || e.bound;
}
//@ chunk-a76knw89.js:7539-7589 placement
function dbn(e) {
  return lO(e, "defer_loading") === !0;
}
//@ chunk-a76knw89.js:7589-8006 placement
function collectReferencedDeferredTools(e) {
  let n = new Set();
  for (let o of e) {
    if (typeof o.content === "string") continue;
    if (o.role === "system") {
      for (let c of o.content) {
        let s = lO(c, "tool"),
          u =
            lO(c, "type") === "tool_addition" && typeof s === "object" && s !== null ? lO(s, "name") : void 0;
        if (typeof u === "string") n.add(canonicalToolName(u));
      }
      continue;
    }
    if (o.role !== "user") continue;
    for (let c of o.content) {
      if (!isToolResultBlockWithContent(c)) continue;
      for (let s of c.content) if (isToolReferenceWithName(s)) n.add(canonicalToolName(s.tool_name));
    }
  }
  return n;
}

export {
  parkAgentBaseline,
  hasParkedAgentBaseline,
  Mlr,
  restoreAgentBaseline,
  forgetClassifierCompaction,
  oR,
  CACHE_TTL_5M_MS,
  getPromptCacheSummary,
  estimateRecacheTokens,
  notifyCacheDeletion,
  isBillingHeaderBlock,
  recordPromptCacheUsage,
  MAIN,
  getCacheCreationTtl,
  touchPromptCache,
  fingerprintMessagesForCache,
  recordPromptState,
  recordMessageHistory,
  getPendingChangeSummary,
  flushMessageOutlines,
  checkResponseForCacheBreak,
  logCacheDiagnosisReceived,
  getCacheBreakDiffPath,
  isUncachedSystemBlock,
  expectPromptCacheDrop,
  recordSummaryFork,
  promptCacheTrackers,
  clearPromptCacheOnSessionSwitch,
  notifyCompaction,
  X_ANTHROPIC_BILLING_HEADER,
  REPORTING_OUTCOMES_SECTION,
  CACHE_BREAK_REASONS,
  snapshotRequestForCacheDiff,
  AYo,
  Dri,
  ledgerComparableView,
  seedLedgerSnapshot,
  dbn,
  getTrackingKey,
  computeHash,
  EPHEMERAL_MESSAGE_MARK,
  isCacheBreakOutlineEnabled,
  isExcludedModel,
  MIN_CACHE_MISS_TOKENS,
  isCacheReadDrop,
};
