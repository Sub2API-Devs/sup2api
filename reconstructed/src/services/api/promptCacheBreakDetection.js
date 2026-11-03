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
import { join as join_2 } from "path";
import { rm, mkdir } from "fs/promises";
import { randomUUID } from "crypto";
import { isDeepStrictEqual } from "util";
import {
  messageRoleBucket,
  messageContentBlocks,
  PREFIX_HASH_CHUNK,
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
  CONTEXT_BLOCK_KINDS,
  MAX_REPORTED_MESSAGE_PARTS,
  USER_CONTEXT_PART_NAMES,
  MAX_REPORTED_BLOCK_HASHES,
  getPromptCacheHashSalt,
  adoptPromptCacheHashSalt,
  foldedAttachmentIndex,
  diffSystemParts,
  diffPromptParts,
  prefixBreakSampleRate,
  isSampledIn,
} from "./promptCacheBreakParts.js";
import { sanitizePath_3 } from "../../utils/sessionStoragePortable.js";
import { shortHash, normalizeShortHash } from "../../utils/shortHash.js";
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
import { sanitizeMarkName } from "../../utils/startupMarks.js";
import { telemetrySafeModelName } from "../../utils/model/telemetryModelName.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { array, u, _enum, tuple, E, string } from "../../../vendor/zod/v4/classic/schemas.js";
import { env } from "../../utils/env.js";
import { isManagedOAuthContext_2 } from "../../utils/auth.js";
import { streamFallbackWarning } from "./streamFallbackWarning.js";
import { isDiskless, getSessionId, getRootSession, onSessionSwitch } from "../../bootstrap/state.js";
import { normalizeUuidOrNull } from "../../utils/agentId.js";
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
import { custom } from "../../../vendor/zod/v3/types.js";
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
import { toolKeyOf, stripSafeguardsField, exactKeyValue } from "./toolDefinitionShape.js";
import { getCacheControl, stripCacheControl } from "./declaredToolSet.js";
import { canonicalToolName as canonicalToolName_2 } from "../../utils/permissions/permissionRuleParser.js";
import { isToolResultBlockWithContent, isToolReferenceWithName } from "../../utils/toolSearch.js";

//@ chunk-g54kbxqw.js:54510-54678 sole-consumer
function messageFingerprint(e) {
  return {
    role: messageRoleBucket(e.message.role),
    blocks: messageContentBlocks(e).map(sanitizePath_3),
    systemAttachments:
      e.type === "api_system" && e.foldedAttachmentTypes ? e.foldedAttachmentTypes.map(shortHash) : [],
  };
}
//@ chunk-g54kbxqw.js:54678-54758 placement
/**
 * 提示缓存失效检测的输出上限：摘要块数 16、散列块 10000、系统附件字符 4 倍块上限，空摘要结构。
 */
var MAX_SYSTEM_ATTACHMENT_CHARS = 4 * PREFIX_HASH_CHUNK;
var EMPTY_BLOCK_SUMMARY = {
  blocks: lit(""),
  systemAttachments: lit(""),
  blockCount: 0,
  truncated: false,
};
//@ chunk-g54kbxqw.js:54758-55197 placement
function scanChangedMessages(e, firstChangedMessageIndex, s, r) {
  let h = [];
  let y = [];
  let k = 0;
  let C = false;
  e: for (let max = Math.max(0, firstChangedMessageIndex); max < s; max++) {
    let S = e(max);
    if (S === undefined) {
      C = true;
      break;
    }
    k += S.systemAttachments.length;
    if (S.systemAttachments.length > 0 && h.length < r && k <= MAX_SYSTEM_ATTACHMENT_CHARS)
      y.push(concatSafe(fromNumber(max), lit("="), joinSafe(S.systemAttachments, "+")));
    let w = fromEnum(S.role);
    for (let block of S.blocks) {
      if (h.length >= r) {
        C = true;
        break e;
      }
      h.push(joinSafe([fromNumber(max), w, fromEnum(block.type), block.hash], ":"));
    }
  }
  return {
    blocks: joinSafe(h),
    systemAttachments: joinSafe(y),
    blockCount: h.length,
    truncated: C,
  };
}
//@ chunk-g54kbxqw.js:55197-55389 placement
function blockSummary(e, n) {
  if (e === undefined)
    return {
      blocks: lit(""),
      blockCount: 0,
    };
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
function classifyFirstChange(firstChangedMessageIndex, n, prevMessageCount, newMessages, h) {
  if (firstChangedMessageIndex < 0) return "none";
  if (n === undefined || newMessages === undefined) return "unknown";
  let y = n(firstChangedMessageIndex);
  if (y === undefined) return "unknown";
  let k = newMessages[firstChangedMessageIndex];
  if (k === undefined) return "rewrite";
  let C = h ?? messageFingerprint(k);
  if (C.blocks.length === y.blocks.length || !isPrefixOf(y, C)) return "rewrite";
  for (let j = firstChangedMessageIndex + 1; j < prevMessageCount; j++) {
    let S = n(j);
    if (S === undefined) return "unknown";
    let w = newMessages[j];
    if (S.role !== "system" || w === undefined || w.message.role !== "system") return "rewrite";
    let P = messageFingerprint(w);
    if (P.blocks.length !== S.blocks.length || !isPrefixOf(S, P)) return "rewrite";
  }
  return "tail_append";
}
//@ chunk-g54kbxqw.js:56031-56168 placement
function countSystemRows(e) {
  if (e === undefined) return -1;
  return "messages" in e
    ? count(e.messages, (n) => n.message.role === "system")
    : count(e.rows, (n) => n.role === "system");
}
//@ chunk-g54kbxqw.js:56168-56206 placement
function hashJoined(e) {
  return shortHash(e.join(","));
}
//@ chunk-g54kbxqw.js:56206-58038 placement
/**
 * 根据前后两次请求的差异（系统、工具、首个变化的消息等）推断提示缓存失效的原因。
 */
function explainCacheBreak(e) {
  let firstChangedMessageIndex = e.firstChangedMessageIndex;
  let s = EMPTY_BLOCK_SUMMARY;
  let r;
  let h;
  if (firstChangedMessageIndex >= 0)
    switch (e.prev.source) {
      case "memory": {
        let messages = e.prev.messages;
        let P =
          firstChangedMessageIndex < messages.length
            ? messageFingerprint(messages[firstChangedMessageIndex])
            : undefined;
        r = P;
        h = (L) =>
          L === firstChangedMessageIndex
            ? P
            : L < messages.length
              ? messageFingerprint(messages[L])
              : undefined;
        s = scanChangedMessages(h, firstChangedMessageIndex, messages.length, PREFIX_HASH_CHUNK);
        break;
      }
      case "disk": {
        let rows = e.prev.rows;
        s = scanChangedMessages(
          (P) => rows[P],
          firstChangedMessageIndex,
          Math.max(rows.length, e.prevMessageCount),
          PREFIX_HASH_CHUNK,
        );
        r = rows[firstChangedMessageIndex];
        h = (P) => rows[P];
        break;
      }
      case "none":
        break;
    }
  let newMessages = e.newMessages;
  let k =
    firstChangedMessageIndex >= 0 &&
    newMessages !== undefined &&
    firstChangedMessageIndex < newMessages.length
      ? messageFingerprint(newMessages[firstChangedMessageIndex])
      : undefined;
  let C =
    firstChangedMessageIndex >= 0 && newMessages !== undefined
      ? scanChangedMessages(
          (w) => (w === firstChangedMessageIndex ? k : messageFingerprint(newMessages[w])),
          firstChangedMessageIndex,
          newMessages.length,
          PREFIX_HASH_CHUNK,
        )
      : EMPTY_BLOCK_SUMMARY;
  let R = blockSummary(r, PREFIX_HASH_CHUNK);
  let S = blockSummary(k, PREFIX_HASH_CHUNK);
  logEvent(PREFIX_BREAK_EVENT, {
    requestId: sanitizeMarkName(e.requestId) ?? lit(""),
    model: telemetrySafeModelName(e.model),
    cacheBroke: e.cacheBroke,
    changeKinds: e.changeKinds,
    firstChangedMessageIndex,
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
    prevBetasHash: hashJoined(e.prevBetas),
    newBetasHash: hashJoined(e.newBetas),
    prevSystemTurns: countSystemRows(
      e.prev.source === "memory"
        ? {
            messages: e.prev.messages,
          }
        : e.prev.source === "disk"
          ? {
              rows: e.prev.rows,
            }
          : undefined,
    ),
    newSystemTurns: countSystemRows(
      e.newMessages && {
        messages: e.newMessages,
      },
    ),
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
      let r = contentBlockTypeBucket(s);
      let h = stripCacheControl_2(s);
      let text = "text" in s ? s.text : undefined;
      let k = Bun.hash(h);
      return {
        type: r,
        length: h.length,
        prefixClass: r === "text" && typeof text === "string" ? classifyUserText(text) : r,
        hash: typeof k === "bigint" ? Number(k & 0xffffffffn) : k,
      };
    }),
    ...(n && {
      parts: n.parts,
    }),
  };
}
//@ chunk-g54kbxqw.js:58339-58356 placement
var MAX_CHANGED_MESSAGE_BLOCKS = 16;
var MAX_HASHED_BLOCKS = 1e4;
//@ chunk-g54kbxqw.js:58356-58577 placement
function compactBaseline(e) {
  let n = [];
  let s = 0;
  for (let r of e) {
    s += r.blocks.length;
    if (s > MAX_HASHED_BLOCKS) break;
    n.push({
      r: r.role,
      b: r.blocks.map((block) => [block.type, block.length, block.prefixClass, block.hash]),
      ...(r.parts && {
        p: r.parts.map((part) => [part.type, part.len, part.hash]),
      }),
    });
  }
  return n;
}
//@ chunk-g54kbxqw.js:58577-58774 placement
var BASELINE_SCHEMA = DoctorLazy(() =>
  array(
    u({
      r: _enum(MESSAGE_ROLE_BUCKETS),
      b: array(
        tuple([_enum(CONTENT_BLOCK_TYPE_BUCKETS), maxSafeIntSchema(), _enum(TEXT_KIND_BUCKETS), E()]),
      ).max(MAX_HASHED_BLOCKS),
      p: array(tuple([string().regex(/^[0-9a-f]{12}$/), maxSafeIntSchema(), E()]))
        .max(MAX_DIFF_ENTRIES)
        .optional(),
    }),
  )
    .max(20000)
    .refine((e) => e.reduce((acc, s) => acc + s.b.length, 0) <= MAX_HASHED_BLOCKS),
);
//@ chunk-g54kbxqw.js:58774-59001 placement
function restoreBaseline(outlines) {
  let n = BASELINE_SCHEMA().safeParse(outlines);
  if (!n.success) return;
  return n.data.map((s) => ({
    role: s.r,
    blocks: s.b.map(([r, h, y, k]) => ({
      type: r,
      length: h,
      prefixClass: y,
      hash: k,
    })),
    ...(s.p && {
      parts: s.p.map(([r, h, y]) => ({
        type: r,
        len: h,
        hash: y,
      })),
    }),
  }));
}
//@ chunk-g54kbxqw.js:59001-59109 placement
function blockOutlineKey(parts) {
  return joinSafe(
    parts.flatMap((n) => {
      let s = normalizeShortHash(n.type);
      return s === undefined ? [] : [concatSafe(s, lit(":"), fromNumber(n.len))];
    }),
  );
}
//@ chunk-g54kbxqw.js:59109-59241 placement
function positionedOutlineKey(e) {
  return joinSafe(
    e.flatMap((n) => {
      let s = normalizeShortHash(n.type);
      return s === undefined
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
      changedMessagePrevBlocks: blockSummary(e, MAX_CHANGED_MESSAGE_BLOCKS).blocks,
      changedMessagePrevBlockCount: e.blocks.length,
      ...(e.parts && {
        changedMessagePrevParts: blockOutlineKey(e.parts),
      }),
    }),
    ...(n && {
      changedMessageRole: fromEnum(n.role),
      changedMessageBlocks: blockSummary(n, MAX_CHANGED_MESSAGE_BLOCKS).blocks,
      changedMessageBlockCount: n.blocks.length,
      ...(n.parts && {
        changedMessageParts: blockOutlineKey(n.parts),
      }),
    }),
  };
  if (!e || !n) return s;
  let min = Math.min(e.blocks.length, n.blocks.length);
  let h = 0;
  while (h < min && e.blocks[h].type === n.blocks[h].type && e.blocks[h].hash === n.blocks[h].hash) h++;
  return {
    ...s,
    changedMessageFirstBlock: h === e.blocks.length && h === n.blocks.length ? -1 : h,
    changedMessageLengthDelta: blocksTotalLength(n) - blocksTotalLength(e),
    ...(e.parts &&
      n.parts && {
        changedMessageChangedParts: positionedOutlineKey(changedPartIndexes(e.parts, n.parts)),
      }),
  };
}
//@ chunk-g54kbxqw.js:59959-60026 placement
function maxSafeIntSchema() {
  return E().int().min(0).max(Number.MAX_SAFE_INTEGER);
}
//@ chunk-g54kbxqw.js:60026-60085 placement
function blocksTotalLength(e) {
  return e.blocks.reduce((acc, block) => acc + block.length, 0);
}
//@ chunk-g54kbxqw.js:60085-60108 fingerprint = getCacheBreakDiffPath (0.618)
/**
 * 缓存断裂状态文件名前缀 "cache-break-"（cache-break-state-<会话>.json）。
 */
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
  } !== "undefined"
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
  if (env.CLAUDE_CODE_IS_COWORK) return true;
  return isManagedOAuthContext_2() || isRemoteEnv();
}
//@ chunk-g54kbxqw.js:61245-61292 placement
function isRemoteEnv() {
  return env.CLAUDE_CODE_REMOTE === true;
}
//@ chunk-g54kbxqw.js:61292-61303 placement
var En = 1e4;
//@ chunk-g54kbxqw.js:61303-61346 placement
function promptCacheBreakState() {
  return streamFallbackWarning().promptCacheBreak;
}
//@ chunk-g54kbxqw.js:61346-61368 placement
function noopShape(messages) {
  return;
}
//@ chunk-g54kbxqw.js:61368-61442 placement
function isCacheBreakPersisted() {
  if (env.CLAUDE_CODE_IS_COWORK || isManagedOAuthContext_2()) return true;
  return isRemoteEnv() && !isDiskless();
}
//@ chunk-g54kbxqw.js:61442-61480 placement
function isCacheBreakPersistenceEnabled() {
  return isCacheBreakPersisted() || (isPrefixBreakSampled() && !isDiskless());
}
//@ chunk-g54kbxqw.js:61480-61534 placement
function needsResumeBaseline(e) {
  return !isCacheBreakPersisted() && e.resumeBaseline === undefined;
}
//@ chunk-g54kbxqw.js:61534-61573 placement
function canPersistCacheBreakState() {
  return isCacheBreakPersistenceEnabled() && cacheBreakStatePath() !== null;
}
//@ chunk-g54kbxqw.js:61573-61665 placement
function cacheBreakStatePath() {
  let e = normalizeUuidOrNull(getSessionId());
  if (e === null) return null;
  return join_2(getClaudeTempDirRealpath(), `${getCacheBreakDiffPath}state-${e}.json`);
}
//@ chunk-g54kbxqw.js:61665-61804 placement
var TOOL_CHOICE_VALUES = {
  "": true,
  none: true,
  tool_based: true,
  system_prompt: true,
};
var SPEED_VALUES = {
  "": true,
  on: true,
  off: true,
};
var THINKING_DISPLAY_VALUES = {
  "": true,
  summarized: true,
  omitted: true,
  highlights: true,
};
var MAX_BASELINE_BYTES = 4000000;
//@ chunk-g54kbxqw.js:61804-61847 placement
function isTrackedQuerySource(e) {
  return Object.hasOwn(FOREGROUND_529_RETRY_SOURCES, e);
}
//@ chunk-g54kbxqw.js:61847-63589 placement
/**
 * 提示缓存失效检测的持久化状态结构：系统/工具/cache_control 哈希、工具名、消息哈希等。
 */
var cacheBreakStateSchema = DoctorLazy(() =>
  create_20(
    create_2().max(200),
    create({
      systemHash: create_3(),
      toolsHash: create_3(),
      cacheControlHash: create_3(),
      toolNames: create_15(create_2().max(200)).max(2000),
      perToolHashes: create_20(create_2().max(200), create_3()).refine((e) => Object.keys(e).length <= 2000),
      perBlockHashes: create_15(create_3()).max(5000),
      perBlockLengths: create_15(create_3()).max(5000),
      systemCharCount: create_3(),
      model: create_2().max(200),
      fastMode: create_6(),
      globalCacheStrategy: custom((e) => typeof e === "string" && Object.hasOwn(TOOL_CHOICE_VALUES, e)),
      betas: create_15(create_2().max(200)).max(100),
      autoModeActive: create_6(),
      isUsingOverage: create_6(),
      anyDeferLoading: create_6().default(false),
      is1hCacheTTL: create_6().default(false),
      queryDepth: create_3().optional(),
      cacheDiagnosis: create_6().default(false),
      effortValue: create_2().max(200),
      thinkingMode: custom((e) => typeof e === "string" && Object.hasOwn(SPEED_VALUES, e)).default(""),
      thinkingDisplay: custom(
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
        blocks: create_15(
          create({
            kind: create_26(CONTEXT_BLOCK_KINDS),
            len: create_3(),
            hash: create_3(),
          }),
        ).max(MAX_REPORTED_MESSAGE_PARTS),
        sections: create_15(
          create({
            name: create_26(USER_CONTEXT_PART_NAMES),
            len: create_3(),
            hash: create_3(),
          }),
        ).max(MAX_REPORTED_BLOCK_HASHES),
        workerTools: create({
          toolCount: create_3(),
          mcpServerCount: create_3(),
        }).optional(),
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
        .catch(undefined),
      prefixBreakHash: cacheBreakSnapshotSchema().optional().catch(undefined),
    }),
  ),
);
var cacheBreakSnapshotSchema = DoctorLazy(() =>
  create({
    salt: custom((e) => typeof e === "string" && normalizeUuidOrNull(e) !== null),
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
        ).max(En),
        a: create_15(create_2().regex(/^[0-9a-f]{12}$/))
          .max(200)
          .optional(),
      }),
    )
      .max(20000)
      .refine((e) => e.reduce((acc, s) => acc + s.b.length, 0) <= En),
  }),
);
//@ chunk-g54kbxqw.js:63589-63884 placement
function outlinesFromState(prefixBreakHash) {
  let n = [];
  for (let message of prefixBreakHash.messages) {
    let r = [];
    for (let [y, k, C, R] of message.b) {
      let S = normalizeShortHash(k);
      if (S === undefined) return;
      r.push({
        type: y,
        hash: S,
        length: C,
        prefixClass: R,
      });
    }
    let h = [];
    for (let y of message.a ?? []) {
      let k = normalizeShortHash(y);
      if (k === undefined) return;
      h.push(k);
    }
    n.push({
      role: message.r,
      blocks: r,
      systemAttachments: h,
    });
  }
  return n;
}
//@ chunk-g54kbxqw.js:63884-64314 placement
function hashMessages(e, messageHashes, s) {
  let promptCacheHashSalt = getPromptCacheHashSalt();
  let h = s !== undefined && s.rows.salt === promptCacheHashSalt ? s : undefined;
  let y = [];
  let k = 0;
  for (let j = 0; j < e.length; j++) {
    let R = messageHashes[j];
    let S =
      h !== undefined && R !== undefined && R !== EPHEMERAL_MESSAGE_MARK && h.messageHashes[j] === R
        ? h.rows.messages[j]
        : undefined;
    if (S === undefined) {
      let w = messageFingerprint(e[j]);
      S = {
        r: w.role,
        b: w.blocks.map((block) => [block.type, block.hash, block.length, block.prefixClass]),
        ...(w.systemAttachments.length > 0 && {
          a: [...w.systemAttachments],
        }),
      };
    }
    k += S.b.length;
    if (k > En) break;
    y.push(S);
  }
  return {
    salt: promptCacheHashSalt,
    messages: y,
  };
}
//@ chunk-g54kbxqw.js:64314-64530 placement
function messageHashesFor(messages, messageHashes, s) {
  if (messages === undefined || !isCacheBreakOutlineEnabled()) return;
  let messageHashes_2 = s?.messageHashes;
  let messageOutlines = s?.messageOutlines;
  return onceExport(() => {
    let y = messageOutlines?.();
    return messages.map((k, C) => {
      let R = messageHashes[C];
      return (
        (R !== undefined && R !== EPHEMERAL_MESSAGE_MARK && messageHashes_2?.[C] === R
          ? y?.[C]
          : undefined) ?? messageOutline(k)
      );
    });
  });
}
//@ chunk-g54kbxqw.js:64530-65323 placement
/**
 * 会话恢复时从磁盘读回上次的提示缓存状态，作为失效检测的基线。
 */
function hydrateCacheBreakState() {
  let e = promptCacheBreakState();
  if (e.hydrationAttempted || !isCacheBreakPersistenceEnabled()) return;
  e.hydrationAttempted = true;
  let previousStateBySource = e.previousStateBySource;
  try {
    verifyTempDirOwnership(getClaudeTempDirRealpath());
    let s = cacheBreakStatePath();
    if (s === null) return;
    let smallFileOrNull = readSmallFileOrNullSync(s, MAX_BASELINE_BYTES);
    if (smallFileOrNull === null) return;
    let h = cacheBreakStateSchema().safeParse(jsonParse(smallFileOrNull));
    if (!h.success) return;
    let y = count(Object.keys(h.data), (C) => isTrackedQuerySource(C) && C.startsWith("repl_main_thread"));
    let k = !isCacheBreakPersisted();
    for (let [key, value] of Object.entries(h.data)) {
      if (previousStateBySource.size >= MAX_TRACKED_SOURCES) break;
      if (!isTrackedQuerySource(key)) continue;
      let S = key.startsWith("repl_main_thread:") ? "repl_main_thread" : key;
      if (S === "repl_main_thread" && y > 1) continue;
      if (previousStateBySource.has(S)) continue;
      previousStateBySource.set(S, {
        ...value,
        ...(k && {
          callCount: 0,
          cacheDeletionsPending: false,
        }),
        pendingChanges: null,
        baselineFromDisk: true,
        baselineBuildVersion: value.buildVersion,
        content: modelWithEmptySystem(value.model),
        hydratedHashRows:
          value.prefixBreakHash !== undefined && adoptPromptCacheHashSalt(value.prefixBreakHash.salt)
            ? outlinesFromState(value.prefixBreakHash)
            : undefined,
      });
    }
  } catch {}
}
//@ chunk-g54kbxqw.js:65323-65579 placement
/**
 * 去掉持久化快照里的大字段（哈希前缀、内容、基线等），只留元数据。与团队无关。
 */
function stripSnapshotPayload(e) {
  let {
    hashedPrefix,
    content,
    pendingChanges,
    baselineFromDisk,
    diffedAgainst,
    baselineMessageHashes,
    baselineBuildVersion,
    hashSampleMessages,
    hydratedHashRows,
    baselineHashSource,
    messageOutlines,
    resumeBaseline,
    ...j
  } = e;
  return j;
}
//@ chunk-g54kbxqw.js:65579-66075 placement = destroyWorktree (0.326)
/**
 * 把各来源的上一状态（去掉大字段）排队持久化到磁盘，空则删除文件。与团队/worktree 无关。
 */
function persistPreviousStates() {
  if (!isCacheBreakPersistenceEnabled()) return;
  try {
    let e = promptCacheBreakState();
    let n = {};
    for (let [h, y] of e.previousStateBySource) {
      if (!isTrackedQuerySource(h)) continue;
      n[h] = stripSnapshotPayload(y);
    }
    let s = cacheBreakStatePath();
    if (s === null) return;
    let r =
      Object.keys(n).length === 0
        ? {
            action: "remove",
          }
        : {
            action: "write",
            payload: jsonStringify(n),
          };
    e.latestQueuedPersist = r;
    e.pendingPersist = e.pendingPersist
      .then(async () => {
        if (r.action === "remove") {
          verifyTempDirOwnership(getClaudeTempDirRealpath());
          await rm(s, {
            force: true,
          });
          return;
        }
        if (e.latestQueuedPersist !== r) return;
        await mkdir(getClaudeTempDirRealpath(), {
          recursive: true,
          mode: 448,
        });
        verifyTempDirOwnership(getClaudeTempDirRealpath());
        await writeFileAtomic(s, r.payload);
      })
      .catch(() => {});
  } catch {}
}
//@ chunk-g54kbxqw.js:66075-66231 fingerprint = TRACKED_SOURCE_PREFIXES (0.811)
/**
 * 参与跟踪的 querySource 前缀：repl_main_thread、sdk、agent:custom/default/builtin。
 */
var MAX_TRACKED_SOURCES = 10;
var MAX_TRACKED_SOURCES_ANT = 64;
var AGENT_SUMMARY = "agent_summary";
var MAX_SUMMARY_FORKS = 8;
var TRACKED_SOURCE_PREFIXES = ["repl_main_thread", "sdk", "agent:custom", "agent:default", "agent:builtin"];
var COMPACT_FORK = "compact_fork";
var MIN_CACHE_MISS_TOKENS = 2000;
var MAX_COMPACTION_TIMESTAMPS = 8;
var MAX_CLASSIFIER_COMPACTION_KEYS = 128;
//@ chunk-g54kbxqw.js:66231-66275 layout
/**
 * 本次 cache_read 低于上次 95% 且少了至少 2000 token 即视为缓存断裂。
 */
function isCacheReadDrop(prevCacheReadTokens, cacheReadTokens) {
  return (
    cacheReadTokens < prevCacheReadTokens * 0.95 &&
    prevCacheReadTokens - cacheReadTokens >= MIN_CACHE_MISS_TOKENS
  );
}
//@ chunk-g54kbxqw.js:66275-66318 fingerprint = isExcludedModel (1)
/**
 * 模型名含 haiku 的不做断裂检测。
 */
function isExcludedModel(model) {
  return model.includes("haiku");
}
//@ chunk-g54kbxqw.js:66318-66487 fingerprint = getTrackingKey (1)
/**
 * querySource → 跟踪键：compact 归到 compact_fork；主线程归 repl_main_thread；代理按 agentId；其他来源不跟踪（null）。
 */
function getTrackingKey(querySource, agentId) {
  if (querySource === "compact") return COMPACT_FORK;
  if (!agentId && querySource.startsWith("repl_main_thread")) return "repl_main_thread";
  for (let prefix of TRACKED_SOURCE_PREFIXES)
    if (querySource.startsWith(prefix)) return agentId || querySource;
  return null;
}
//@ chunk-g54kbxqw.js:66487-66595 layout = stripCacheControl (1)
/**
 * 数组每项去掉 cache_control。
 */
function stripCacheControlAll(items) {
  return items.map((item) => {
    if (!("cache_control" in item)) return item;
    let { cache_control: cacheControl, ...rest } = item;
    return rest;
  });
}
//@ chunk-g54kbxqw.js:66595-66659 layout
/**
 * 块的 text 字段（字符串时）。
 */
function getBlockText(e) {
  let text = e.text;
  return typeof text === "string" ? text : undefined;
}
//@ chunk-g54kbxqw.js:66659-66752 fingerprint = computePerToolHashes (1)
/**
 * 每个工具 schema 的哈希表（按工具名）。
 */
function computePerToolHashes(strippedTools, names) {
  let hashes = {};
  for (let i = 0; i < strippedTools.length; i++)
    hashes[names[i] ?? `__idx_${i}`] = computeHash(strippedTools[i]);
  return hashes;
}
//@ chunk-g54kbxqw.js:66752-66985 layout
/**
 * 两个对象键集相同、值全等且除指定键外都是原始值。
 */
function isShallowEqualExcept(e, n, s) {
  if (!isPlainObject(e) || !isPlainObject(n)) return false;
  let keys = Object.keys(e);
  if (!arraysEqual(keys, Object.keys(n))) return false;
  for (let h of keys) {
    let y = e[h];
    if (y !== n[h]) return false;
    if (!(y === null || (typeof y !== "object" && typeof y !== "function")) && h !== s) return false;
  }
  return true;
}
//@ chunk-g54kbxqw.js:66985-67151 layout
/**
 * 计算条目数组哈希；与上次条目浅相等时复用上次哈希。
 */
function hashEntriesReusing(e, n, s) {
  let r =
    n !== undefined &&
    n.entries.length === e.length &&
    e.every((h, y) => isShallowEqualExcept(h, n.entries[y], s));
  return {
    entries: e.map((h) =>
      isPlainObject(h)
        ? {
            ...h,
          }
        : h,
    ),
    hash: r ? n.hash : computeHash(e),
  };
}
//@ chunk-g54kbxqw.js:67151-67218 file-local
/**
 * system 块文本总字符数。
 */
function getSystemCharCount(system) {
  let total = 0;
  for (let block of system) total += getBlockText(block)?.length ?? 0;
  return total;
}
//@ chunk-g54kbxqw.js:67218-68153 layout
/**
 * 比较前后两次请求的标量：system/工具/模型/fast/cache_control/全局缓存策略/beta/auto mode/超额/诊断/effort/thinking/额外 body/defer_loading 是否变化。
 */
function diffPromptScalars(e, n) {
  return {
    systemPromptChanged: n.systemHash !== e.systemHash,
    toolSchemasChanged: n.toolsHash !== e.toolsHash,
    modelChanged: n.model !== e.model,
    fastModeChanged: n.fastMode !== e.fastMode,
    cacheControlChanged: n.cacheControlHash !== e.cacheControlHash,
    globalCacheStrategyChanged: n.globalCacheStrategy !== e.globalCacheStrategy,
    betasChanged: n.betas.length !== e.betas.length || n.betas.some((s, r) => s !== e.betas[r]),
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
//@ chunk-g54kbxqw.js:68153-68283 file-local
/**
 * 跟踪来源数超过上限时淘汰旧条目（优先淘汰非主线程）。
 */
function cleanupAgentTracking(agentId) {
  let n = isPrefixBreakSampled() ? MAX_TRACKED_SOURCES_ANT : MAX_TRACKED_SOURCES;
  while (agentId.size >= n) {
    let s = [...agentId.keys()];
    let r = s.find((h) => !isTrackedQuerySource(h)) ?? s[0];
    if (r === undefined) break;
    agentId.delete(r);
  }
}
//@ chunk-g54kbxqw.js:68283-73678 fingerprint = recordPromptState (0.62)
/**
 * 请求前记录本次提示词状态（各项哈希、消息哈希），与上次对比得到 pendingChanges。
 */
function recordPromptState(snapshot) {
  try {
    let {
      system,
      toolSchemas,
      anyDeferLoading = false,
      querySource,
      model,
      agentId,
      fastMode,
      globalCacheStrategy = "",
      betas = [],
      autoModeActive = false,
      isUsingOverage = false,
      is1hCacheTTL = false,
      queryDepth,
      cacheDiagnosis = false,
      effortValue,
      thinkingConfig,
      extraBodyParams,
      getMessageHashes,
      messages,
      baselineAgentId,
    } = snapshot;
    let key = getTrackingKey(querySource, agentId);
    let Me =
      key === null &&
      querySource === AGENT_SUMMARY &&
      agentId !== undefined &&
      baselineAgentId !== undefined &&
      isPrefixBreakSampled()
        ? {
            forkAgentId: agentId,
            parentKey: baselineAgentId,
          }
        : undefined;
    if (key === null && Me === undefined) return;
    let messageHashes = getMessageHashes();
    let system_2 = stripCacheControlAll(system).filter((ue) => !isUncachedSystemBlock(ue));
    let strippedSystem = stripCacheControlAll(toolSchemas);
    hydrateCacheBreakState();
    let previousStateBySource = promptCacheBreakState().previousStateBySource;
    let x = key === null ? undefined : previousStateBySource.get(key);
    let ce = {
      system: hashEntriesReusing(system_2, x?.hashedPrefix?.system),
      tools: hashEntriesReusing(strippedSystem, x?.hashedPrefix?.tools, "input_schema"),
    };
    let systemHash = ce.system.hash;
    let toolsHash = ce.tools.hash;
    let cacheControlHash = computeHash(
      system
        .filter((ue) => !isUncachedSystemBlock(ue))
        .map((ue) => ("cache_control" in ue ? ue.cache_control : null)),
    );
    let toolNames = toolSchemas.map((t) => ("name" in t ? t.name : "unknown"));
    let computeToolHashes = () => computePerToolHashes(strippedSystem, toolNames);
    let Wn = () => system_2.map((ue) => computeHash(ue));
    let $n = () => system_2.map((ue) => getBlockText(ue)?.length ?? 0);
    let systemCharCount = getSystemCharCount(system_2);
    let messages_2 = undefined;
    let lazyDiffableContent = () => ({
      model,
      system,
      tools: toolSchemas,
      messages: messages_2,
    });
    let msg0Shape = messages ? noopShape(messages) : undefined;
    let sysFoldShape = messages && isCacheBreakOutlineEnabled() ? foldedAttachmentIndex(messages) : undefined;
    let De = isPrefixBreakSampled() ? messages : undefined;
    let isFastMode = fastMode ?? false;
    let sortedBetas = [...betas].sort();
    let effortStr = effortValue === undefined ? "" : String(effortValue);
    let Je = thinkingConfig === undefined ? "" : thinkingConfig.type === "disabled" ? "off" : "on";
    let et =
      thinkingConfig === undefined || thinkingConfig.type === "disabled"
        ? ""
        : (thinkingConfig.display ?? "");
    let extraBodyHash = extraBodyParams === undefined ? 0 : computeHash(extraBodyParams);
    let qn = {
      systemHash,
      toolsHash,
      cacheControlHash,
      model,
      fastMode: isFastMode,
      globalCacheStrategy,
      betas: sortedBetas,
      autoModeActive,
      isUsingOverage,
      cacheDiagnosis,
      effortValue: effortStr,
      thinkingMode: Je,
      thinkingDisplay: et,
      extraBodyHash,
      anyDeferLoading,
    };
    if (key === null) {
      if (Me !== undefined)
        recordSummaryFork_2({
          ...Me,
          scalars: qn,
          messageHashes,
          messages: De,
        });
      return;
    }
    let messageOutlines = messageHashesFor(messages, messageHashes, x);
    let Xn = De !== undefined && isTrackedQuerySource(key) && canPersistCacheBreakState();
    if (!x) {
      cleanupAgentTracking(previousStateBySource);
      previousStateBySource.set(key, {
        systemHash,
        toolsHash,
        hashedPrefix: ce,
        cacheControlHash,
        toolNames,
        systemCharCount,
        model,
        fastMode: isFastMode,
        globalCacheStrategy,
        betas: sortedBetas,
        autoModeActive,
        isUsingOverage,
        anyDeferLoading,
        is1hCacheTTL,
        queryDepth,
        cacheDiagnosis,
        effortValue: effortStr,
        thinkingMode: Je,
        thinkingDisplay: et,
        extraBodyHash,
        callCount: 1,
        pendingChanges: null,
        prevCacheReadTokens: null,
        cacheDeletionsPending: false,
        buildVersion: CACHE_BREAK_HINTS,
        baselineFromDisk: false,
        messageHashes,
        msg0Shape,
        sysFoldShape,
        messageOutlines,
        content: lazyDiffableContent,
        hashSampleMessages: De,
        perToolHashes: computeToolHashes(),
        perBlockHashes: Wn(),
        perBlockLengths: $n(),
        prefixBreakHash: Xn ? hashMessages(De, messageHashes, undefined) : undefined,
      });
      persistPreviousStates();
      return;
    }
    x.callCount++;
    x.baselineHashSource =
      x.hashSampleMessages !== undefined ? "memory" : x.hydratedHashRows !== undefined ? "disk" : "none";
    x.diffedAgainst = x.diffedAgainst === undefined && x.baselineFromDisk ? "disk" : "memory";
    let {
      systemPromptChanged,
      toolSchemasChanged,
      modelChanged,
      fastModeChanged,
      cacheControlChanged,
      globalCacheStrategyChanged,
      betasChanged,
      autoModeChanged,
      overageChanged,
      cacheDiagnosisChanged,
      effortChanged,
      thinkingModeChanged,
      thinkingDisplayChanged,
      extraBodyChanged,
      deferLoadingPresenceChanged,
    } = diffPromptScalars(x, qn);
    let firstChangedHash = findFirstChangedHash(x.messageHashes, messageHashes);
    let mo = firstChangedHash !== -1;
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
      let prevToolSet = new Set(x.toolNames);
      let newToolSet = new Set(toolNames);
      let prevBetaSet = new Set(x.betas);
      let newBetaSet = new Set(sortedBetas);
      let addedTools = toolNames.filter((n) => !prevToolSet.has(n));
      let removedTools = x.toolNames.filter((n) => !newToolSet.has(n));
      let changedToolSchemas = [];
      if (toolSchemasChanged) {
        let newHashes = computeToolHashes();
        for (let name of toolNames) {
          if (!prevToolSet.has(name)) continue;
          if (newHashes[name] !== x.perToolHashes[name]) changedToolSchemas.push(name);
        }
        x.perToolHashes = newHashes;
      }
      let yo = x.perBlockHashes.length;
      let Ft = system_2.length;
      let _o = [];
      let bo = [];
      if (systemPromptChanged) {
        let he = Wn();
        let Pe = $n();
        if (Ft === yo) {
          for (let idx = 0; idx < Ft; idx++)
            if (he[idx] !== x.perBlockHashes[idx]) {
              _o.push(idx);
              bo.push(Pe[idx] - x.perBlockLengths[idx]);
            }
        }
        x.perBlockHashes = he;
        x.perBlockLengths = Pe;
      }
      x.pendingChanges = {
        systemPromptChanged,
        toolSchemasChanged,
        modelChanged,
        fastModeChanged,
        cacheControlChanged,
        globalCacheStrategyChanged,
        betasChanged,
        autoModeChanged,
        overageChanged,
        cacheDiagnosisChanged,
        effortChanged,
        thinkingModeChanged,
        thinkingDisplayChanged,
        extraBodyChanged,
        deferLoadingPresenceChanged,
        messagesHistoryChanged: mo,
        firstChangedMessageIndex: firstChangedHash,
        prevMessageCount: x.messageHashes.length,
        addedToolCount: addedTools.length,
        removedToolCount: removedTools.length,
        addedTools,
        removedTools,
        changedToolSchemas,
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
        removedBetas: x.betas.filter((he) => !newBetaSet.has(he)),
        prevEffortValue: x.effortValue,
        newEffortValue: effortStr,
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
    let prefixBreakHash = Xn
      ? hashMessages(
          De,
          messageHashes,
          x.prefixBreakHash && {
            rows: x.prefixBreakHash,
            messageHashes: x.messageHashes,
          },
        )
      : undefined;
    x.systemHash = systemHash;
    x.toolsHash = toolsHash;
    x.hashedPrefix = ce;
    x.cacheControlHash = cacheControlHash;
    x.toolNames = toolNames;
    x.systemCharCount = systemCharCount;
    x.model = model;
    x.fastMode = isFastMode;
    x.globalCacheStrategy = globalCacheStrategy;
    x.betas = sortedBetas;
    x.autoModeActive = autoModeActive;
    x.isUsingOverage = isUsingOverage;
    x.is1hCacheTTL = is1hCacheTTL;
    x.queryDepth = queryDepth;
    x.cacheDiagnosis = cacheDiagnosis;
    x.effortValue = effortStr;
    x.thinkingMode = Je;
    x.thinkingDisplay = et;
    x.extraBodyHash = extraBodyHash;
    x.anyDeferLoading = anyDeferLoading;
    x.buildVersion = CACHE_BREAK_HINTS;
    x.baselineMessageHashes = x.messageHashes;
    x.messageHashes = messageHashes;
    x.msg0Shape = msg0Shape;
    x.sysFoldShape = sysFoldShape;
    x.messageOutlines = messageOutlines;
    x.content = lazyDiffableContent;
    x.hashSampleMessages = De;
    x.prefixBreakHash = prefixBreakHash;
    x.hydratedHashRows = undefined;
    persistPreviousStates();
  } catch (e) {
    logError(e);
  }
}
//@ chunk-g54kbxqw.js:73678-74025 layout
/**
 * 所有变化类型键名（含 messagesHistoryChanged）。
 */
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
//@ chunk-g54kbxqw.js:74025-76178 layout
/**
 * 记录本次消息哈希与形状，算出首个变化的消息下标并并入 pendingChanges；摘要代理走分叉记录。
 */
function recordMessageHistory({ querySource, agentId, messages, getMessageHashes }) {
  try {
    let trackingKey = getTrackingKey(querySource, agentId);
    if (trackingKey === null) {
      if (querySource === AGENT_SUMMARY && agentId !== undefined)
        updateSummaryForkMessages(agentId, messages, getMessageHashes);
      return;
    }
    let y = promptCacheBreakState().previousStateBySource.get(trackingKey);
    if (!y) return;
    let messageHashes = getMessageHashes();
    y.baselineMessageHashes ??= y.messageHashes;
    let { baselineMessageHashes, content } = y;
    let { model, system, tools } = content();
    let messages_2 = undefined;
    let { msg0Shape, sysFoldShape, messageOutlines, hashSampleMessages } = y;
    let se = y.prefixBreakHash && {
      rows: y.prefixBreakHash,
      messageHashes: y.messageHashes,
    };
    y.messageOutlines = messageHashesFor(messages, messageHashes, y);
    y.messageHashes = messageHashes;
    y.msg0Shape = noopShape(messages);
    y.sysFoldShape = isCacheBreakOutlineEnabled() ? foldedAttachmentIndex(messages) : undefined;
    y.content = () => ({
      model,
      system,
      tools,
      messages: messages_2,
    });
    y.hashSampleMessages = isPrefixBreakSampled() ? messages : undefined;
    y.prefixBreakHash =
      y.hashSampleMessages !== undefined && isTrackedQuerySource(trackingKey) && canPersistCacheBreakState()
        ? hashMessages(y.hashSampleMessages, messageHashes, se)
        : undefined;
    let firstChangedHash = findFirstChangedHash(baselineMessageHashes, messageHashes);
    let pendingChanges = y.pendingChanges;
    if (pendingChanges) {
      let _e = {
        ...pendingChanges,
        messagesHistoryChanged: firstChangedHash !== -1,
        firstChangedMessageIndex: firstChangedHash,
      };
      y.pendingChanges = CHANGE_KINDS.some((re) => _e[re]) ? _e : null;
    } else if (firstChangedHash !== -1) {
      y.baselineHashSource = hashSampleMessages !== undefined ? "memory" : "none";
      y.pendingChanges = {
        systemPromptChanged: false,
        toolSchemasChanged: false,
        modelChanged: false,
        fastModeChanged: false,
        cacheControlChanged: false,
        globalCacheStrategyChanged: false,
        betasChanged: false,
        autoModeChanged: false,
        overageChanged: false,
        cacheDiagnosisChanged: false,
        effortChanged: false,
        thinkingModeChanged: false,
        thinkingDisplayChanged: false,
        extraBodyChanged: false,
        deferLoadingPresenceChanged: false,
        messagesHistoryChanged: true,
        firstChangedMessageIndex: firstChangedHash,
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
        prevHydratedHashRows: undefined,
      };
    }
    persistPreviousStates();
  } catch (error) {
    logError(error);
  }
}
//@ chunk-g54kbxqw.js:76178-76297 layout
/**
 * 触发该来源记录的 messageOutlines 惰性计算。
 */
function flushMessageOutlines(querySource, agentId) {
  try {
    let trackingKey = getTrackingKey(querySource, agentId);
    if (trackingKey !== null)
      promptCacheBreakState().previousStateBySource.get(trackingKey)?.messageOutlines?.();
  } catch (error) {
    logError(error);
  }
}
//@ chunk-g54kbxqw.js:76297-76359 layout
/**
 * 两个哈希数组首个不同的下标（-1 表示相同）。
 */
function findFirstChangedHash(e, messageHashes) {
  return e.findIndex((s, r) => s !== EPHEMERAL_MESSAGE_MARK && messageHashes[r] !== s);
}
//@ chunk-g54kbxqw.js:76359-76665 layout
/**
 * 本来源待定变化的类型列表、首个变化消息下标、基线来源、调用次数（遥测用）。
 */
function getPendingChangeSummary(querySource, agentId) {
  try {
    let { changes, baseline, callNumber } = getPendingChangesForSource(querySource, agentId);
    return {
      kinds: changes ? fromEnumArr(CHANGE_KINDS.filter((y) => changes[y])) : lit("none"),
      firstChangedMessageIndex: changes?.firstChangedMessageIndex ?? -1,
      baseline,
      callNumber,
    };
  } catch (error) {
    logError(error);
    return {
      kinds: lit("none"),
      firstChangedMessageIndex: -1,
      baseline: lit("none"),
      callNumber: undefined,
    };
  }
}
//@ chunk-g54kbxqw.js:76665-76966 layout
/**
 * 取来源状态、待定变化与基线类型（磁盘基线未比对时不报变化）。
 */
function getPendingChangesForSource(e, n) {
  let trackingKey = getTrackingKey(e, n);
  let r = trackingKey ? promptCacheBreakState().previousStateBySource.get(trackingKey) : undefined;
  if (r?.diffedAgainst === "disk" && needsResumeBaseline(r))
    return {
      state: r,
      changes: undefined,
      baseline: lit("none"),
      callNumber: r.callCount,
    };
  return {
    state: r,
    changes: r?.pendingChanges ?? undefined,
    baseline: fromEnumOpt(r?.diffedAgainst) ?? lit("none"),
    callNumber: r?.callCount,
  };
}
//@ chunk-g54kbxqw.js:76966-78865 fingerprint = checkResponseForCacheBreak (0.586)
/**
 * 把变化标志转成人可读的原因列表（model changed、system prompt changed (+N chars) 等）。
 */
function checkResponseForCacheBreak_2(pendingChanges, baselineFromDisk) {
  let parts = [];
  if (pendingChanges.modelChanged)
    parts.push(
      `model changed (${baselineFromDisk ? "hydrated baseline" : pendingChanges.previousModel} \u2192 ${pendingChanges.newModel})`,
    );
  if (pendingChanges.systemPromptChanged) {
    let charDelta = pendingChanges.systemCharDelta;
    let charInfo = charDelta === 0 ? "" : charDelta > 0 ? ` (+${charDelta} chars)` : ` (${charDelta} chars)`;
    parts.push(`system prompt changed${charInfo}`);
  }
  if (pendingChanges.toolSchemasChanged) {
    let toolDiff =
      pendingChanges.addedToolCount > 0 || pendingChanges.removedToolCount > 0
        ? ` (+${pendingChanges.addedToolCount}/-${pendingChanges.removedToolCount} tools)`
        : " (tool prompt/schema changed, same tool set)";
    parts.push(`tools changed${toolDiff}`);
  }
  if (pendingChanges.fastModeChanged) parts.push("fast mode toggled");
  if (pendingChanges.globalCacheStrategyChanged)
    parts.push(
      `global cache strategy changed (${pendingChanges.prevGlobalCacheStrategy || "none"} \u2192 ${pendingChanges.newGlobalCacheStrategy || "none"})`,
    );
  if (
    pendingChanges.cacheControlChanged &&
    !pendingChanges.globalCacheStrategyChanged &&
    !pendingChanges.systemPromptChanged
  )
    parts.push("cache_control changed (scope or TTL)");
  if (pendingChanges.betasChanged) {
    let added = pendingChanges.addedBetas.length ? `+${pendingChanges.addedBetas.join(",")}` : "";
    let removed = pendingChanges.removedBetas.length
      ? `-${baselineFromDisk ? "hydrated baseline" : pendingChanges.removedBetas.join(",")}`
      : "";
    let diff = [added, removed].filter(Boolean).join(" ");
    parts.push(`betas changed${diff ? ` (${diff})` : ""}`);
  }
  if (pendingChanges.autoModeChanged) parts.push("auto mode toggled");
  if (pendingChanges.overageChanged) parts.push("overage state changed (TTL flip expected)");
  if (pendingChanges.cacheDiagnosisChanged) parts.push("cache diagnosis toggled");
  if (pendingChanges.effortChanged)
    parts.push(
      `effort changed (${baselineFromDisk ? "hydrated baseline" : pendingChanges.prevEffortValue || "default"} \u2192 ${pendingChanges.newEffortValue || "default"})`,
    );
  if (pendingChanges.thinkingModeChanged)
    parts.push(
      `thinking mode changed (${pendingChanges.prevThinkingMode} \u2192 ${pendingChanges.newThinkingMode})`,
    );
  if (pendingChanges.thinkingDisplayChanged)
    parts.push(
      `thinking display changed (${pendingChanges.prevThinkingDisplay || "none"} \u2192 ${pendingChanges.newThinkingDisplay || "none"})`,
    );
  if (pendingChanges.extraBodyChanged) parts.push("extra body params changed");
  if (pendingChanges.deferLoadingPresenceChanged)
    parts.push("defer_loading presence flipped (deferred-tool hint section, inc-5316)");
  if (pendingChanges.messagesHistoryChanged)
    parts.push(
      `message history mutated at index ${pendingChanges.firstChangedMessageIndex}/${pendingChanges.prevMessageCount}`,
    );
  return parts;
}
//@ chunk-g54kbxqw.js:78865-78943 layout
/**
 * 段列表格式化为 "名:长度" 脱敏串。
 */
function formatSectionLengths(e) {
  return joinSafe(
    e.sections.map((section) => concatSafe(fromEnum(section.name), lit(":"), fromNumber(section.len))),
  );
}
//@ chunk-g54kbxqw.js:78943-79534 layout
/**
 * 首条消息变化时比较其分段形状（工作者工具数等）给出变化段。
 */
function describeFirstMessageChange(pendingChanges, msg0Shape) {
  if (!pendingChanges?.messagesHistoryChanged || pendingChanges.firstChangedMessageIndex !== 0 || !msg0Shape)
    return {};
  let prevMsg0Shape = pendingChanges.prevMsg0Shape;
  let r = (k) => (k?.workerTools ? [k.workerTools.toolCount, k.workerTools.mcpServerCount] : [-1, -1]);
  let h = {
    msg0Sections: formatSectionLengths(msg0Shape),
    msg0WorkerTools: fromNumberArr([...r(prevMsg0Shape), ...r(msg0Shape)]),
  };
  if (!prevMsg0Shape) return h;
  let y = diffSystemParts(prevMsg0Shape, msg0Shape);
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
//@ chunk-g54kbxqw.js:79534-79587 layout
/**
 * 形状各部分展开后格式化（遥测）。
 */
function formatShapeParts(e) {
  return joinSafe(e.flatMap((n) => normalizeShortHash(n) ?? []));
}
//@ chunk-g54kbxqw.js:79587-80140 layout
/**
 * system 折叠段位置变化时给出前后段差异。
 */
function describeSystemFoldChange(pendingChanges, sysFoldShape) {
  let prevSysFoldShape = pendingChanges?.prevSysFoldShape;
  let firstChangedMessageIndex = pendingChanges?.firstChangedMessageIndex;
  if (
    !pendingChanges?.messagesHistoryChanged ||
    (firstChangedMessageIndex !== sysFoldShape?.index && firstChangedMessageIndex !== prevSysFoldShape?.index)
  )
    return {};
  let h = {
    sysFoldIndex: sysFoldShape?.index ?? -1,
    ...(sysFoldShape && {
      sysFoldParts: blockOutlineKey(sysFoldShape.parts),
      sysFoldPartCount: sysFoldShape.partCount,
    }),
    ...(prevSysFoldShape && {
      sysFoldPrevParts: blockOutlineKey(prevSysFoldShape.parts),
      sysFoldPrevPartCount: prevSysFoldShape.partCount,
    }),
  };
  if (!prevSysFoldShape || !sysFoldShape) return h;
  let y = diffPromptParts(prevSysFoldShape, sysFoldShape);
  return {
    ...h,
    sysFoldChangedParts: positionedOutlineKey(y.changedParts),
    sysFoldAddedTypes: formatShapeParts(y.addedTypes),
    sysFoldRemovedTypes: formatShapeParts(y.removedTypes),
    sysFoldReordered: y.reordered,
    sysFoldOtherDelta: y.otherDelta,
    sysFoldLenDelta: sysFoldShape.len - prevSysFoldShape.len,
  };
}
//@ chunk-g54kbxqw.js:80140-85530 layout
/**
 * 响应后检查：按 cache_read 降幅与 pendingChanges 判断是否断裂，结合距上次回答是否超过 5 分钟/1 小时（TTL 过期）上报原因。
 */
async function checkResponseForCacheBreak(
  querySource,
  cacheReadInputTokens,
  cacheCreationInputTokens,
  messages,
  agentId,
  y,
  k,
  C,
) {
  let key = getTrackingKey(querySource, agentId);
  if (!key) {
    if (querySource === AGENT_SUMMARY && agentId !== undefined)
      checkSummaryForkCacheBreak(agentId, {
        requestId: y,
        cacheReadTokens: cacheReadInputTokens,
        cacheCreationTokens: cacheCreationInputTokens,
      });
    return;
  }
  let S = promptCacheBreakState().previousStateBySource.get(key);
  if (!S) return;
  if (isExcludedModel(S.model)) return;
  try {
    let prevCacheReadTokens = S.prevCacheReadTokens;
    S.prevCacheReadTokens = cacheReadInputTokens;
    let baselineFromDisk = S.baselineFromDisk;
    S.baselineFromDisk = false;
    let L = baselineFromDisk && needsResumeBaseline(S);
    let resumeBaseline = S.resumeBaseline;
    S.resumeBaseline = undefined;
    let last = messages.findLast((m) => m.type === "assistant");
    let q = last ? Date.now() - new Date(last.timestamp).getTime() : null;
    let G = q !== null && q > CACHE_TTL_5M_MS;
    let se = q !== null && q > CACHE_TTL_1H_MS;
    if (prevCacheReadTokens === null) {
      S.pendingChanges = null;
      return;
    }
    let pendingChanges = S.pendingChanges;
    if (L) {
      if (!S.cacheDeletionsPending) {
        let z = isCacheReadDrop(prevCacheReadTokens, cacheReadInputTokens);
        if (pendingChanges || z)
          reportCacheBreak(S, pendingChanges, {
            requestId: y,
            querySource,
            cacheBroke: z,
            baselineFromDisk,
            prevCacheReadTokens,
            cacheReadTokens: cacheReadInputTokens,
            cacheCreationTokens: cacheCreationInputTokens,
            lastAssistantMsgOver5minAgo: G,
            lastAssistantMsgOver1hAgo: se,
          });
      }
      S.pendingChanges = null;
      return;
    }
    if (S.cacheDeletionsPending) {
      S.cacheDeletionsPending = false;
      logForDebugging(
        `[PROMPT CACHE] cache deletion applied, cache read: ${prevCacheReadTokens} \u2192 ${cacheReadInputTokens} (expected drop)`,
      );
      S.pendingChanges = null;
      return;
    }
    let ie = isCacheReadDrop(prevCacheReadTokens, cacheReadInputTokens);
    if (pendingChanges || ie)
      reportCacheBreak(S, pendingChanges, {
        requestId: y,
        querySource,
        cacheBroke: ie,
        baselineFromDisk,
        prevCacheReadTokens,
        cacheReadTokens: cacheReadInputTokens,
        cacheCreationTokens: cacheCreationInputTokens,
        lastAssistantMsgOver5minAgo: G,
        lastAssistantMsgOver1hAgo: se,
      });
    if (!ie) {
      S.pendingChanges = null;
      return;
    }
    let _e = pendingChanges ? checkResponseForCacheBreak_2(pendingChanges, baselineFromDisk) : [];
    let re;
    if (_e.length > 0) re = _e.join(", ");
    else if (se) re = "possible 1h TTL expiry (prompt unchanged)";
    else if (G) re = "possible 5min TTL expiry (prompt unchanged)";
    else if (q !== null) re = "likely server-side (prompt unchanged, <5min gap)";
    else re = "unknown cause";
    if (C ?? (isCacheBreakTrackedSource(querySource, agentId) && querySource !== "compact")) {
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
        ...(pendingChanges?.systemPromptChanged && {
          systemCharDelta: pendingChanges.systemCharDelta,
        }),
      });
    }
    if (isCacheBreakOutlineEnabled())
      logEvent("tengu_prompt_cache_break", {
        systemPromptChanged: pendingChanges?.systemPromptChanged ?? false,
        toolSchemasChanged: pendingChanges?.toolSchemasChanged ?? false,
        modelChanged: pendingChanges?.modelChanged ?? false,
        fastModeChanged: pendingChanges?.fastModeChanged ?? false,
        cacheControlChanged: pendingChanges?.cacheControlChanged ?? false,
        globalCacheStrategyChanged: pendingChanges?.globalCacheStrategyChanged ?? false,
        betasChanged: pendingChanges?.betasChanged ?? false,
        autoModeChanged: pendingChanges?.autoModeChanged ?? false,
        overageChanged: pendingChanges?.overageChanged ?? false,
        cacheDiagnosisChanged: pendingChanges?.cacheDiagnosisChanged ?? false,
        effortChanged: pendingChanges?.effortChanged ?? false,
        thinkingModeChanged: pendingChanges?.thinkingModeChanged ?? false,
        thinkingDisplayChanged: pendingChanges?.thinkingDisplayChanged ?? false,
        extraBodyChanged: pendingChanges?.extraBodyChanged ?? false,
        deferLoadingPresenceChanged: pendingChanges?.deferLoadingPresenceChanged ?? false,
        messagesHistoryChanged: pendingChanges?.messagesHistoryChanged ?? false,
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
        querySource: agentTypeForTelemetry(querySource),
        model: telemetrySafeModelName(S.model),
        globalCacheStrategy: fromEnum(S.globalCacheStrategy),
        callNumber: S.callCount,
        prevCacheReadTokens,
        cacheReadTokens: cacheReadInputTokens,
        cacheCreationTokens: cacheCreationInputTokens,
        timeSinceLastAssistantMsg: q ?? -1,
        lastAssistantMsgOver5minAgo: G,
        lastAssistantMsgOver1hAgo: se,
        isCowork: env.CLAUDE_CODE_IS_COWORK,
        isDesktop: isManagedOAuthContext_2(),
        baselineFromDisk,
        versionChanged: !baselineFromDisk
          ? false
          : !S.baselineBuildVersion
            ? undefined
            : S.baselineBuildVersion !== CACHE_BREAK_HINTS,
        ...describeFirstMessageChange(pendingChanges, S.msg0Shape),
        ...describeSystemFoldChange(pendingChanges, S.sysFoldShape),
        ...(pendingChanges?.messagesHistoryChanged &&
          changedMessageFields(
            pendingChanges.prevMessageOutlines?.()?.[pendingChanges.firstChangedMessageIndex],
            S.messageOutlines?.()?.[pendingChanges.firstChangedMessageIndex],
          )),
        isSubagent: agentId !== undefined,
        isResume: resumeBaseline !== undefined,
        resumedInNewProcess: resumeBaseline?.newProcess === true,
        prevMessageCount: S.baselineMessageHashes?.length ?? -1,
        newMessageCount: S.messageHashes.length,
        requestId: sanitizeMarkName(y) ?? lit(""),
        previousMessageId: sanitizeMarkName(k) ?? lit(""),
      });
    let ge;
    if (isCacheBreakOutlineEnabled()) {
      let z = ge ? `, diff: ${ge}` : "";
      let summary = `[PROMPT CACHE BREAK] ${re} [source=${querySource}, call #${S.callCount}, cache read: ${prevCacheReadTokens} \u2192 ${cacheReadInputTokens}, creation: ${cacheCreationInputTokens}${z}]`;
      logForDebugging(summary, {
        level: "warn",
      });
    }
    S.pendingChanges = null;
  } catch (e) {
    logError(e);
  } finally {
    persistPreviousStates();
  }
}
//@ chunk-g54kbxqw.js:85530-86621 layout
/**
 * 上报一次缓存断裂（模型、beta、变化类型、cache read/creation、TTL 是否过期）。
 */
function reportCacheBreak(
  e,
  pendingChanges,
  {
    requestId,
    querySource,
    cacheBroke,
    baselineFromDisk,
    prevCacheReadTokens,
    cacheReadTokens,
    cacheCreationTokens,
    lastAssistantMsgOver5minAgo,
    lastAssistantMsgOver1hAgo,
  },
) {
  try {
    let P = prefixBreakSampleRate();
    if (!isSampledIn(getSessionId(), P)) return;
    explainCacheBreak({
      requestId,
      model: e.model,
      prevModel: pendingChanges?.previousModel ?? e.model,
      prevBetas: pendingChanges?.previousBetas ?? e.betas,
      newBetas: e.betas,
      cacheBroke,
      changeKinds: pendingChanges ? fromEnumArr(CHANGE_KINDS.filter((L) => pendingChanges[L])) : lit("none"),
      firstChangedMessageIndex: pendingChanges?.firstChangedMessageIndex ?? -1,
      prev:
        pendingChanges?.prevHashSampleMessages !== undefined
          ? {
              source: "memory",
              messages: pendingChanges.prevHashSampleMessages,
            }
          : pendingChanges?.prevHydratedHashRows !== undefined
            ? {
                source: "disk",
                rows: pendingChanges.prevHydratedHashRows,
              }
            : {
                source: "none",
              },
      prevSource: e.baselineHashSource ?? "none",
      newMessages: e.hashSampleMessages,
      prevMessageCount: e.baselineMessageHashes?.length ?? -1,
      newMessageCount: e.messageHashes.length,
      callNumber: e.callCount,
      baselineFromDisk,
      baselineKind: "previous_request",
      prevCacheReadTokens,
      cacheReadTokens,
      cacheCreationTokens,
      sampleRate: P,
      is1hCacheTTL: e.is1hCacheTTL,
      lastAssistantMsgOver5minAgo,
      lastAssistantMsgOver1hAgo,
      querySource: agentTypeForTelemetry(querySource),
    });
  } catch (error) {
    logError(error);
  }
}
//@ chunk-g54kbxqw.js:86621-86673 layout
/**
 * 去掉 messagesHistoryChanged 的变化类型。
 */
var SCALAR_CHANGE_KINDS = CHANGE_KINDS.filter((e) => e !== "messagesHistoryChanged");
//@ chunk-g54kbxqw.js:86673-87322 layout
/**
 * 摘要代理分叉：记录相对父来源的标量变化与消息基线。
 */
function recordSummaryFork_2({ forkAgentId, parentKey, scalars, messageHashes, messages }) {
  let { previousStateBySource, summaryForks } = promptCacheBreakState();
  let C = previousStateBySource.get(parentKey);
  let R = C ? diffPromptScalars(C, scalars) : undefined;
  summaryForks.delete(forkAgentId);
  while (summaryForks.size >= MAX_SUMMARY_FORKS) {
    let S = summaryForks.keys().next().value;
    if (S === undefined) break;
    summaryForks.delete(S);
  }
  summaryForks.set(forkAgentId, {
    parentFound: C !== undefined,
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
//@ chunk-g54kbxqw.js:87322-87522 layout
/**
 * 摘要分叉补记本次消息与首个变化下标。
 */
function updateSummaryForkMessages(agentId, messages, getMessageHashes) {
  let r = promptCacheBreakState().summaryForks.get(agentId);
  if (!r) return;
  let h = getMessageHashes();
  r.newMessages = isPrefixBreakSampled() ? messages : undefined;
  r.newMessageCount = h.length;
  r.firstChangedMessageIndex = r.parentFound ? findFirstChangedHash(r.parentMessageHashes, h) : -1;
}
//@ chunk-g54kbxqw.js:87522-88683 layout
/**
 * 摘要分叉响应后的断裂检查与上报。
 */
function checkSummaryForkCacheBreak(e, { requestId, cacheReadTokens, cacheCreationTokens }) {
  try {
    let { summaryForks } = promptCacheBreakState();
    let y = summaryForks.get(e);
    if (!y) return;
    summaryForks.delete(e);
    if (isExcludedModel(y.model)) return;
    let k = prefixBreakSampleRate();
    if (!isSampledIn(getSessionId(), k)) return;
    let prevCacheReadTokens = y.prevCacheReadTokens;
    let R = prevCacheReadTokens !== null && isCacheReadDrop(prevCacheReadTokens, cacheReadTokens);
    let S = y.firstChangedMessageIndex !== -1;
    if (y.parentFound && y.scalarFlags.length === 0 && !S && !R) return;
    let w = [...y.scalarFlags, ...(S ? ["messagesHistoryChanged"] : [])];
    explainCacheBreak({
      requestId,
      model: y.model,
      prevModel: y.prevModel,
      prevBetas: y.prevBetas,
      newBetas: y.newBetas,
      cacheBroke: R,
      changeKinds: w.length > 0 ? fromEnumArr(w) : lit("none"),
      firstChangedMessageIndex: y.firstChangedMessageIndex,
      prev:
        y.prevMessages !== undefined
          ? {
              source: "memory",
              messages: y.prevMessages,
            }
          : {
              source: "none",
            },
      prevSource: y.prevMessages !== undefined ? "memory" : "none",
      newMessages: y.newMessages,
      prevMessageCount: y.parentFound ? y.parentMessageHashes.length : -1,
      newMessageCount: y.newMessageCount,
      callNumber: y.callNumber,
      baselineFromDisk: false,
      baselineKind: y.parentFound ? "parent_agent" : "parent_agent_missing",
      prevCacheReadTokens: prevCacheReadTokens ?? -1,
      cacheReadTokens,
      cacheCreationTokens,
      sampleRate: k,
      is1hCacheTTL: undefined,
      lastAssistantMsgOver5minAgo: undefined,
      lastAssistantMsgOver1hAgo: undefined,
      querySource: agentTypeForTelemetry(AGENT_SUMMARY),
    });
  } catch (error) {
    logError(error);
  }
}
//@ chunk-g54kbxqw.js:88683-88809 layout
/**
 * 服务器 cache diagnosis 类型：model/system/tools/messages_changed、previous_message_not_found、unavailable。
 */
var KNOWN_CACHE_DIAGNOSIS_TYPES = {
  model_changed: true,
  system_changed: true,
  tools_changed: true,
  messages_changed: true,
  previous_message_not_found: true,
  unavailable: true,
};
//@ chunk-g54kbxqw.js:88809-88851 layout
/**
 * 诊断类型是否已知。
 */
function isKnownCacheDiagnosisType(type) {
  return Object.hasOwn(KNOWN_CACHE_DIAGNOSIS_TYPES, type);
}
//@ chunk-g54kbxqw.js:88851-89316 layout
/**
 * 记 tengu_prompt_cache_diagnosis_received（诊断类型、缺失 token 等）。
 */
function logCacheDiagnosisReceived(e, n) {
  try {
    logEvent("tengu_prompt_cache_diagnosis_received", {
      diagnosisType:
        typeof e.type !== "string"
          ? undefined
          : isKnownCacheDiagnosisType(e.type)
            ? fromEnum(e.type)
            : lit("other"),
      tokensMissed: typeof e.cache_missed_input_tokens === "number" ? e.cache_missed_input_tokens : -1,
      requestId: sanitizeMarkName(n.requestId) ?? lit(""),
      previousMessageId: sanitizeMarkName(n.previousMessageId) ?? lit(""),
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
//@ chunk-g54kbxqw.js:89316-89585 fingerprint = notifyCacheDeletion (0.413)
/**
 * 通知缓存被有意删除（如工具结果清除），下一次 cache_read 下降不算意外断裂。
 */
function notifyCacheDeletion(querySource, agentId) {
  if (isCacheBreakTrackedSource(querySource, agentId)) expectPromptCacheDrop(MAIN);
  hydrateCacheBreakState();
  let key = getTrackingKey(querySource, agentId);
  let previousStateBySource = promptCacheBreakState().previousStateBySource;
  let state = key ? previousStateBySource.get(key) : undefined;
  if (state && !(state.baselineFromDisk && state.diffedAgainst === undefined && needsResumeBaseline(state))) {
    state.cacheDeletionsPending = true;
    persistPreviousStates();
  }
  if (key !== null && isTrackedQuerySource(key)) {
    let y = previousStateBySource.get(COMPACT_FORK);
    if (y) y.cacheDeletionsPending = true;
  }
}
//@ chunk-g54kbxqw.js:89585-90016 fingerprint = notifyCompaction (0.499)
/**
 * 通知发生压缩：重置相关来源的上次 cache_read，避免误报。
 */
function notifyCompaction(agentId) {
  if (isCacheBreakOutlineEnabled()) {
    let classifierCompactions = promptCacheBreakState().classifierCompactions;
    let y = classifierCompactions.get(agentId) ?? [];
    classifierCompactions.delete(agentId);
    classifierCompactions.set(agentId, [...y, Date.now()].slice(-MAX_COMPACTION_TIMESTAMPS));
    if (classifierCompactions.size > MAX_CLASSIFIER_COMPACTION_KEYS) {
      let found = [...classifierCompactions.keys()].find((key) => key !== undefined);
      if (found !== undefined) classifierCompactions.delete(found);
    }
  }
  hydrateCacheBreakState();
  let previousStateBySource = promptCacheBreakState().previousStateBySource;
  let s = previousStateBySource.get(COMPACT_FORK);
  if (s) s.prevCacheReadTokens = null;
  if (agentId) {
    let h = previousStateBySource.get(agentId);
    if (h) {
      h.prevCacheReadTokens = null;
      persistPreviousStates();
    }
    return;
  }
  let r = false;
  for (let [h, y] of previousStateBySource)
    if (isTrackedQuerySource(h)) {
      y.prevCacheReadTokens = null;
      r = true;
    }
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
/**
 * 缓存断裂状态文件的限额：最多 32 个状态、文件 2 MB、版本号 1 与 outlines 结构。
 */
var CACHE_STATE_LIMITS = 32;
var MAX_CACHE_STATE_BYTES = 2000000;
var cacheBreakStateFileSchema = DoctorLazy(() =>
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
    let n = promptCacheBreakState();
    let s = n.previousStateBySource.get(e);
    forgetClassifierCompaction(e);
    if (s === undefined) return;
    let { prefixBreakHash, ...h } = stripSnapshotPayload(s);
    let { messageOutlines } = s;
    messageOutlines?.();
    let { parkedAgentBaselines } = n;
    parkedAgentBaselines.delete(e);
    while (parkedAgentBaselines.size >= CACHE_STATE_LIMITS) {
      let R = parkedAgentBaselines.keys().next().value;
      if (R === undefined) break;
      parkedAgentBaselines.delete(R);
    }
    parkedAgentBaselines.set(e, {
      ...h,
      messageOutlines,
      pendingChanges: null,
      baselineFromDisk: s.baselineFromDisk,
      baselineBuildVersion: s.baselineBuildVersion,
      resumeBaseline: s.resumeBaseline,
      content: modelWithEmptySystem(h.model),
    });
    if (!isCacheBreakOutlineEnabled() || isDiskless()) return;
    n.parkedBy ??= randomUUID();
    let C = jsonStringify({
      v: 1,
      by: n.parkedBy,
      state: h,
      outlines: compactBaseline(messageOutlines?.() ?? []),
    });
    return C.length <= MAX_CACHE_STATE_BYTES ? C : undefined;
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-g54kbxqw.js:90898-90954 placement
function modelWithEmptySystem(model) {
  return () => ({
    model,
    system: [],
    tools: [],
  });
}
//@ chunk-g54kbxqw.js:90954-91010 placement
function hasParkedAgentBaseline(e) {
  return promptCacheBreakState().parkedAgentBaselines.has(e);
}
//@ chunk-g54kbxqw.js:91010-91615 placement
function restoreAgentBaseline(e, n) {
  try {
    let s = promptCacheBreakState();
    let { previousStateBySource, parkedAgentBaselines } = s;
    let y = parkedAgentBaselines.get(e);
    parkedAgentBaselines.delete(e);
    if (previousStateBySource.has(e)) return;
    let k;
    if (y !== undefined)
      k = {
        ...y,
        resumeBaseline: y.resumeBaseline ?? {
          source: "memory",
          newProcess: false,
        },
      };
    else {
      if (n === null) return;
      let C;
      try {
        C = cacheBreakStateFileSchema().safeParse(jsonParse(n));
      } catch {
        return;
      }
      if (!C.success) return;
      let { by, state, outlines } = C.data;
      let P = restoreBaseline(outlines);
      k = {
        ...state,
        prefixBreakHash: undefined,
        messageOutlines: P && (() => P),
        pendingChanges: null,
        baselineFromDisk: true,
        baselineBuildVersion: state.buildVersion,
        resumeBaseline: {
          source: "disk",
          newProcess: by !== s.parkedBy,
        },
        content: modelWithEmptySystem(state.model),
      };
    }
    hydrateCacheBreakState();
    cleanupAgentTracking(previousStateBySource);
    previousStateBySource.set(e, k);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-g54kbxqw.js:91615-92203 placement
function recordSummaryFork(e) {
  let n = promptCacheBreakState();
  let s = n.previousStateBySource.size === 0 && !n.hydrationAttempted;
  n.summaryForks.clear();
  for (let key of [...n.parkedAgentBaselines.keys()]) if (!e?.has(key)) n.parkedAgentBaselines.delete(key);
  for (let [r, h] of n.classifierLines)
    if (h.agentId === undefined || !e?.has(h.agentId)) n.classifierLines.delete(r);
  for (let key of n.classifierCompactions.keys())
    if (key === undefined || !e?.has(key)) n.classifierCompactions.delete(key);
  if (e?.size) {
    for (let key of [...n.previousStateBySource.keys()]) if (!e.has(key)) n.previousStateBySource.delete(key);
  } else {
    n.previousStateBySource.clear();
    n.hydrationAttempted = false;
  }
  if (!s) persistPreviousStates();
}
//@ chunk-1t61stbc.js:302-1230 placement
/**
 * 系统提示词"# Reporting outcomes"段：要求只报告在本会话中观察到的结果。
 */
var REPORTING_OUTCOMES_SECTION = `# Reporting outcomes

Report what actually happened, not what you intended. When you say something is done, sent, saved, fixed, or verified, that claim must rest on a result you observed in this session \u2014 tool output, the file as it now reads, the page as it now loads \u2014 not on what the step should have produced. If you did not check, say you did not check. If any step failed, was skipped, or came back different from what you expected, say so in the first sentence of your report, before anything else, even when the rest of the work succeeded. Never quietly work around a failure in a way that makes it look resolved; a problem the user can see is recoverable, one your summary hides is not. When you stop before the task is complete, your first line says so plainly and names what is left. Do not describe partial work as done, and do not let a summary read as more certain than the evidence behind it.`;
//@ chunk-1t61stbc.js:1230-1268 placement
var X_ANTHROPIC_BILLING_HEADER = "x-anthropic-billing-header:";
//@ chunk-1t61stbc.js:1268-1343 placement
function isBillingHeaderBlock(e) {
  let text = e.text;
  return typeof text === "string" && text.startsWith(X_ANTHROPIC_BILLING_HEADER);
}
//@ chunk-1t61stbc.js:1343-1428 layout
/**
 * system 块是计费头（x-anthropic-billing-header:）或 "# Reporting outcomes" 段（不参与缓存比对）。
 */
function isUncachedSystemBlock(e) {
  let text = e.text;
  return (
    typeof text === "string" &&
    (text.startsWith(X_ANTHROPIC_BILLING_HEADER) || text === REPORTING_OUTCOMES_SECTION)
  );
}
//@ chunk-1t61stbc.js:1428-1515 fingerprint = computeHash (0.745)
/**
 * 对象 JSON 序列化后用 Bun.hash 取 32 位哈希。
 */
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
  t.push(e.type);
  if ("text" in e && typeof e.text === "string")
    t.push("t", String(e.text.length), e.text.slice(0, 32), e.text.slice(-32));
  if ("thinking" in e && typeof e.thinking === "string") t.push("k", String(e.thinking.length));
  if ("id" in e && typeof e.id === "string") t.push("i", e.id);
  if ("tool_use_id" in e && typeof e.tool_use_id === "string") t.push("u", e.tool_use_id);
  if ("name" in e && typeof e.name === "string") t.push("n", e.name);
  if ("input" in e && e.input !== undefined) t.push("p", jsonStringify(e.input));
  if ("source" in e && e.source && typeof e.source === "object") {
    let source = e.source;
    t.push("m", String(source.type ?? ""), String(source.media_type ?? ""));
    if (typeof source.data === "string") t.push(String(source.data.length));
  }
  let content = "content" in e ? e.content : undefined;
  if (Array.isArray(content)) {
    t.push("[", String(content.length));
    for (let n of content) fingerprintContentBlock(n, t);
    t.push("]");
  } else if (typeof content === "string")
    t.push("c", String(content.length), content.slice(0, 32), content.slice(-32));
  for (let [key, value] of Object.entries(e)) {
    if (FINGERPRINT_BLOCK_KEYS.has(key) || value === undefined) continue;
    let o = typeof value === "string" ? value : jsonStringify(value);
    t.push(key, o.length > 256 ? `len:${o.length}` : o);
  }
}
//@ chunk-1t61stbc.js:3308-3319 placement
var EPHEMERAL_MESSAGE_MARK = -1;
//@ chunk-1t61stbc.js:3319-3770 placement
/**
 * 为每条消息计算缓存指纹（角色、内容块摘要），临时消息记为 -1，用于判断提示缓存是否被打破。
 */
function fingerprintMessagesForCache(messagesForAPI) {
  return messagesForAPI.map((t) => {
    if ((t.type === "api_system" || t.type === "user") && t.ephemeral) return EPHEMERAL_MESSAGE_MARK;
    let s = [t.message.role];
    if (t.type === "api_system" && t.outputConfig !== undefined) {
      let timing = t.outputConfig.timing;
      s.push(`oc:${t.outputConfig.effort ?? ""}${timing ? `:${timing.now}` : ""}`);
    }
    let content = t.message.content;
    if (Array.isArray(content)) {
      s.push(String(content.length));
      for (let o of content) fingerprintContentBlock(o, s);
    } else fingerprintContentBlock(content, s);
    let r = Bun.hash(s.join("|"));
    return typeof r === "bigint" ? Number(r & 0xffffffffn) : r;
  });
}
//@ chunk-1t61stbc.js:3770-3795 placement
/**
 * 导出常量或表 `CACHE_TTL_5M_MS`：值为 300000, oR = 3600000。
 */
var CACHE_TTL_5M_MS = 300000;
var CACHE_TTL_1H_MS = 3600000;
//@ chunk-1t61stbc.js:3795-3947 placement
function getCacheCreationTtl(usage) {
  if ((usage?.cache_creation?.ephemeral_5m_input_tokens ?? 0) > 0) return "5m";
  return (usage?.cache_creation?.ephemeral_1h_input_tokens ?? 0) > 0 ? "1h" : undefined;
}
//@ chunk-1t61stbc.js:3947-3961 placement
var MAIN = "main";
//@ chunk-1t61stbc.js:3961-4050 placement = runPostCompactCleanup (0.926)
/**
 * 第二个参数为假（非代理请求）且 querySource 为 repl_main_thread*、sdk、compact 时为真，供提示缓存断裂检测决定是否跟踪；不是压缩后清理。
 */
function isCacheBreakTrackedSource(e, t) {
  return !t && (e.startsWith("repl_main_thread") || e === "sdk" || e === "compact");
}
//@ chunk-1t61stbc.js:4050-4087 placement
var MAX_CHANGED_MESSAGE_ENTRIES = 2000;
var MAX_PREVIOUS_STATE_ENTRIES = 200;
var CACHE_TTL_BY_KIND = {
  "5m": CACHE_TTL_5M_MS,
  "1h": CACHE_TTL_1H_MS,
};
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
//@ chunk-1t61stbc.js:4860-7402 placement
/**
 * 单个查询源的提示缓存命中统计：请求数、命中/未命中、冷启动、预期重建、未命中原因归因与重缓存 token 估计。
 */
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
  expectDrop(dropExpectedAt) {
    this.dropExpectedAt = dropExpectedAt;
  }
  attribute(pendingAttribution) {
    this.pendingAttribution = pendingAttribution;
  }
  record(e) {
    let t = this.entries.at(-1) ?? null;
    let dropExpectedAt = this.dropExpectedAt;
    this.dropExpectedAt = null;
    let pendingAttribution = this.pendingAttribution;
    this.pendingAttribution = null;
    let r =
      dropExpectedAt !== null &&
      t !== null &&
      e.at - Math.max(t.at, this.touchedAt ?? 0) < CACHE_TTL_BY_KIND[t.ttl];
    let o;
    let a =
      this.cacheReadTokens + this.cacheCreationTokens > 0 || e.cacheReadTokens + e.cacheCreationTokens > 0;
    if (t === null) o = "cold";
    else if (!a) o = "uncached";
    else if (t.cacheReadTokens + t.cacheCreationTokens === 0 && e.cacheReadTokens + e.cacheCreationTokens > 0)
      o = "cold";
    else {
      let c = t.inputTokens + t.cacheReadTokens + t.cacheCreationTokens;
      let C = e.inputTokens + e.cacheReadTokens + e.cacheCreationTokens;
      let min = Math.min(c, C);
      let T = min - e.cacheReadTokens;
      o =
        e.cacheReadTokens < min * 0.95 && T >= MAX_CHANGED_MESSAGE_ENTRIES
          ? r
            ? "expected"
            : "miss"
          : "hit";
    }
    let ttl = e.cacheCreationTokens === 0 && t !== null ? t.ttl : e.ttl;
    let p =
      o === "miss" && pendingAttribution !== null
        ? {
            ...e,
            ttl,
            outcome: o,
            attribution: pendingAttribution,
          }
        : {
            ...e,
            ttl,
            outcome: o,
          };
    this.entries.push(p);
    if (this.entries.length > MAX_PREVIOUS_STATE_ENTRIES) this.entries.shift();
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
        this.misses++;
        this.missRecacheTokens += e.cacheCreationTokens;
        this.lastMissAt = e.at;
        this.lastMissAttribution = pendingAttribution;
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
    let t = this.cacheReadTokens + this.cacheCreationTokens + this.inputTokens;
    let s = this.entries.at(-1) ?? null;
    let n = CACHE_TTL_BY_KIND[s?.ttl ?? "5m"];
    let cachingObserved = this.cacheReadTokens + this.cacheCreationTokens > 0;
    let o = s !== null && s.cacheReadTokens + s.cacheCreationTokens > 0;
    let a = s !== null ? Math.max(s.at, this.touchedAt ?? 0) : 0;
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
      missCauses: {
        ...this.missCauses,
      },
      lastRequest: s,
      cachingObserved,
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
    if (s === undefined) {
      s = new PromptCacheTracker();
      this.#e.set(e, s);
    }
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
    let t = this.#e.get(e);
    let last = t?.entries.at(-1);
    if (!last) return 0;
    if (t?.dropExpectedAt != null) return null;
    return last.inputTokens + last.cacheReadTokens + last.cacheCreationTokens;
  }
  clear(e) {
    if (e === undefined) this.#e.clear();
    else this.#e.delete(e);
  }
}
//@ chunk-1t61stbc.js:7936-7962 placement
var promptCacheTrackers = new SessionRootSlot(() => new PromptCacheTrackerRegistry());
//@ chunk-1t61stbc.js:7962-7994 placement
function promptCacheTrackersForSession() {
  return promptCacheTrackers.of(getRootSession());
}
//@ chunk-1t61stbc.js:7994-8066 placement
function recordPromptCacheUsage(e, t) {
  try {
    return promptCacheTrackersForSession().record(e, t);
  } catch (error) {
    logError(error);
    return null;
  }
}
//@ chunk-1t61stbc.js:8066-8122 placement
function attributePromptCacheMiss(e, t) {
  try {
    promptCacheTrackersForSession().attribute(e, t);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-1t61stbc.js:8122-8174 placement
function touchPromptCache(e, t) {
  try {
    promptCacheTrackersForSession().touch(e, t);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-1t61stbc.js:8174-8245 placement
function expectPromptCacheDrop(e = MAIN, t = Date.now()) {
  try {
    promptCacheTrackersForSession().expectDrop(e, t);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-1t61stbc.js:8245-8301 placement
function getPromptCacheSummary(e = MAIN, t = Date.now()) {
  return promptCacheTrackersForSession().summary(e, t);
}
//@ chunk-1t61stbc.js:8301-8356 placement
function estimateRecacheTokens(e = MAIN) {
  return promptCacheTrackersForSession().estimateRecacheTokens(e);
}
//@ chunk-1t61stbc.js:8356-8437 placement
function clearPromptCacheOnSessionSwitch() {
  return onSessionSwitch((e, t) => {
    if (t === "cd" || t === "hydrate") return;
    promptCacheTrackersForSession().clear();
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
//@ chunk-a76knw89.js:2282-2521 placement
/**
 * 由已知的模型、工具和 system 生成提示前缀账本的初始快照（标记为播种）。
 */
function seedLedgerSnapshot(e) {
  return {
    model: e.model,
    tools: e.tools.map((tool, o) => ({
      key: toolKeyOf(tool, o),
      deferred: isDeferredTool(tool),
      bound: isDeferredTool(tool),
      cacheControl: undefined,
      body: tool,
    })),
    system: e.system.map((body) => ({
      preamble: false,
      cacheControl: undefined,
      body,
    })),
    messages: [],
    envelope: {},
    seeded: true,
  };
}
//@ chunk-a76knw89.js:2521-3389 placement
/**
 * 把请求转换为可比较的快照（system 块、工具、betas、参数），可绑定引用到的延迟工具。
 */
function snapshotRequestForCacheDiff(e, n = {}) {
  let o =
    n.boundDeferredToolNames ??
    (n.bindReferencedDeferredTools === true ? collectReferencedDeferredTools(e.messages) : undefined);
  let r =
    typeof e.system === "string"
      ? [
          {
            type: "text",
            text: e.system,
          },
        ]
      : (e.system ?? []);
  let c = {};
  for (let s of ENVELOPE_DIFF_FIELDS) {
    let u = s === "betas" ? sortedList(e.betas) : e[s];
    if (u !== undefined) c[s] = u;
  }
  return {
    model: e.model,
    envelope: c,
    tools: (e.tools ?? []).map((s, u) => ({
      key: toolKeyOf(s, u),
      deferred: s.defer_loading === true,
      bound: s.defer_loading === true && typeof s.name === "string" && o?.has(s.name) === true,
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
          ? [
              {
                thinking: false,
                cacheControl: undefined,
                body: {
                  type: "text",
                  text: message.content,
                },
              },
            ]
          : message.content.map((h) => ({
              thinking: h.type === "thinking" || h.type === "redacted_thinking",
              cacheControl: getCacheControl(h),
              body: stripSafeguardsField(stripCacheControl(h)),
            })),
    })),
  };
}
//@ chunk-a76knw89.js:3389-3665 placement
/**
 * 把提示前缀账本转成可比较的视图：去掉前导 system、回合内 system 消息和 thinking 块。
 */
function ledgerComparableView(e) {
  return {
    model: e.model,
    tools: e.tools.filter(isBoundTool).map((tool) => tool.body),
    system: e.system.filter((n) => !n.preamble).map((n) => n.body),
    messages: e.messages
      .filter((message) => !message.turnScopedSystem)
      .map((message) => ({
        role: message.role,
        content: message.blocks.filter((block) => !block.thinking).map((block) => block.body),
      })),
  };
}
//@ chunk-a76knw89.js:3665-3743 placement
/**
 * 导出函数 `isCacheFingerprintPart`：参数 e，返回 e.part === "tool" || e.part === "system" || e.part === "message"。
 */
function isCacheFingerprintPart(e) {
  return e.part === "tool" || e.part === "system" || e.part === "message";
}
//@ chunk-a76knw89.js:3743-3753 placement
var MAX_LEDGER_ENTRIES = 16;
//@ chunk-a76knw89.js:3753-3841 placement
/**
 * 导出函数 `describeSnapshotDiff`：参数 e, n，返回 e.seeded ? diffToolLists(e, n) : [ ...diffToolLists(e, n), ...diffThinkingBlocks(e, n), ...diffCacheMarkers(e,…。
 */
function describeSnapshotDiff(committed, n) {
  return committed.seeded
    ? diffToolLists(committed, n)
    : [
        ...diffToolLists(committed, n),
        ...diffThinkingBlocks(committed, n),
        ...diffCacheMarkers(committed, n),
        ...describeRequestDifferences(committed, n),
      ];
}
//@ chunk-a76knw89.js:3841-5399 placement
/**
 * 比较两次请求的工具列表（新增、移除、变化、重排），延迟工具单独处理。
 */
function diffToolLists(e, n) {
  let o = ledgerComparableView(e);
  let r = ledgerComparableView(n);
  let c = [];
  let s = (k) => {
    c.push(k);
    return c.length < MAX_LEDGER_ENTRIES;
  };
  let u = (tools) =>
    new Map([...tools.filter((S) => !S.deferred), ...tools.filter((S) => S.bound)].map((S) => [S.key, S]));
  let p = u(e.tools);
  let h = u(n.tools);
  let T = [];
  let y = false;
  for (let [k, S] of p) {
    let body = S.body;
    let w = h.get(k);
    if (w === undefined) {
      if (S.deferred) {
        if (!e.seeded)
          T.push({
            part: "tool",
            id: k,
            kind: "removed",
            prev: body,
          });
        continue;
      }
      y = true;
      if (
        !s({
          part: "tool",
          id: k,
          kind: "removed",
          prev: body,
        })
      )
        return c;
    } else if (S.deferred !== w.deferred) {
      y = true;
      let O = S.deferred
        ? {
            part: "tool",
            id: k,
            kind: "added",
            next: w.body,
          }
        : {
            part: "tool",
            id: k,
            kind: "removed",
            prev: body,
          };
      if (!s(O)) return c;
    } else if (!isDeepStrictEqual(body, w.body)) {
      y ||= !S.deferred;
      let body_2 = w.body;
      let field =
        [...Object.keys(body), ...Object.keys(body_2)].find(
          (I) => !isDeepStrictEqual(exactKeyValue(body, I), exactKeyValue(body_2, I)),
        ) ?? "?";
      if (
        !s({
          part: "tool",
          id: k,
          kind: "changed",
          field,
          prev: body,
          next: body_2,
        })
      )
        return c;
    }
  }
  for (let [k, S] of h)
    if (!p.has(k) && !S.deferred) {
      y = true;
      if (
        !s({
          part: "tool",
          id: k,
          kind: "added",
          next: S.body,
        })
      )
        return c;
    }
  if (!y) {
    let k = (O) => [...O.values()].flatMap((M) => (M.deferred ? [] : [M.key]));
    let S = k(p);
    let found = k(h)
      .filter((O) => p.has(O))
      .find((O, M) => S[M] !== O);
    if (found !== undefined)
      s({
        part: "tool",
        id: found,
        kind: "reordered",
      });
  }
  let max = Math.max(o.system.length, r.system.length);
  for (let j = 0; j < max; j++) {
    let S = o.system[j];
    let x = r.system[j];
    let w = S === undefined ? "added" : x === undefined ? "removed" : "changed";
    if (w !== "changed" || !isDeepStrictEqual(S, x)) {
      if (
        !s({
          part: "system",
          index: j,
          kind: w,
          prev: S,
          next: x,
        })
      )
        return c;
    }
  }
  for (let j = 0; j < o.messages.length; j++) {
    let S = o.messages[j];
    let x = r.messages[j];
    if (x !== undefined && isDeepStrictEqual(S, x)) continue;
    let w = {
      part: "message",
      index: j,
      role: S.role,
      kind: x === undefined ? "removed" : "changed",
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
  let o = [];
  let min = Math.min(e.messages.length, n.messages.length);
  for (let j = 0; j < min && o.length < MAX_LEDGER_ENTRIES; j++) {
    let s = describeSignatureField(e.messages[j]);
    let u = describeSignatureField(n.messages[j]);
    if (s.length === 0 && u.length === 0) continue;
    if (s.length === u.length && s.every((h, T) => h === u[T])) continue;
    let p =
      s.slice(0, u.length).every((h, T) => h === u[T]) || u.slice(0, s.length).every((h, T) => h === s[T]);
    o.push({
      part: "thinking",
      index: j,
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
    let o = exactKeyValue(block.body, "signature");
    let r = exactKeyValue(block.body, "data");
    return [typeof o === "string" ? o : typeof r === "string" ? r : "?"];
  });
}
//@ chunk-a76knw89.js:6052-6505 placement
function diffCacheMarkers(e, n) {
  let cacheControlMarkers = collectCacheControlMarkers(e, e.messages.length);
  let cacheControlMarkers_2 = collectCacheControlMarkers(n, e.messages.length);
  let c = [];
  for (let [s, { at: u, marker: p }] of cacheControlMarkers) {
    if (c.length >= MAX_LEDGER_ENTRIES) return c;
    let h = cacheControlMarkers_2.get(s);
    if (h === undefined)
      c.push({
        part: "cache",
        at: u,
        kind: "dropped",
        prev: p,
        next: undefined,
      });
    else if (!isDeepStrictEqual(p, h.marker))
      c.push({
        part: "cache",
        at: u,
        kind: "changed",
        prev: p,
        next: h.marker,
      });
  }
  for (let [s, { at: u, marker: p }] of cacheControlMarkers_2) {
    if (c.length >= MAX_LEDGER_ENTRIES) return c;
    if (!cacheControlMarkers.has(s))
      c.push({
        part: "cache",
        at: u,
        kind: "added",
        prev: undefined,
        next: p,
      });
  }
  return c;
}
//@ chunk-a76knw89.js:6505-6987 placement
function collectCacheControlMarkers(e, n) {
  let o = new Map();
  for (let tool of e.tools)
    if (tool.cacheControl !== undefined)
      o.set(`tools:${tool.key}`, {
        at: {
          segment: "tools",
          key: tool.key,
        },
        marker: tool.cacheControl,
      });
  e.system.forEach((r, c) => {
    if (r.cacheControl !== undefined)
      o.set(`system:${c}`, {
        at: {
          segment: "system",
          index: c,
        },
        marker: r.cacheControl,
      });
  });
  e.messages.slice(0, n).forEach((message, c) => {
    message.blocks.forEach((block, u) => {
      if (block.cacheControl !== undefined)
        o.set(`messages:${c}.${u}`, {
          at: {
            segment: "messages",
            index: c,
            block: u,
          },
          marker: block.cacheControl,
        });
    });
  });
  return o;
}
//@ chunk-a76knw89.js:6987-7249 placement
function describeRequestDifferences(e, n) {
  return [
    ["model", e.model, n.model],
    ["attribution_header", billingHeaderText(e), billingHeaderText(n)],
    ["deferred_tools", deferredToolKeys(e), deferredToolKeys(n)],
    ...ENVELOPE_DIFF_FIELDS.map((r) => [r, e.envelope[r], n.envelope[r]]),
  ]
    .filter(([, r, c]) => !isDeepStrictEqual(r, c))
    .map(([r, c, s]) => ({
      part: "envelope",
      id: r,
      kind: "changed",
      prev: c,
      next: s,
    }));
}
//@ chunk-a76knw89.js:7249-7288 placement
function sortedList(betas) {
  return betas && [...betas].sort();
}
//@ chunk-a76knw89.js:7288-7410 placement
function billingHeaderText(e) {
  for (let n of e.system) {
    let o = exactKeyValue(n.body, "text");
    if (typeof o === "string" && o.startsWith(X_ANTHROPIC_BILLING_HEADER)) return o;
  }
  return "";
}
//@ chunk-a76knw89.js:7410-7497 placement
function deferredToolKeys(e) {
  return e.tools
    .filter((tool) => tool.deferred)
    .map((tool) => tool.key)
    .sort()
    .join(",");
}
//@ chunk-a76knw89.js:7497-7539 placement
function isBoundTool(e) {
  return !e.deferred || e.bound;
}
//@ chunk-a76knw89.js:7539-7589 placement
/**
 * 导出函数 `isDeferredTool`：参数 e，返回 lO(e, "defer_loading") === !0。
 */
function isDeferredTool(e) {
  return exactKeyValue(e, "defer_loading") === true;
}
//@ chunk-a76knw89.js:7589-8006 placement
function collectReferencedDeferredTools(messages) {
  let n = new Set();
  for (let o of messages) {
    if (typeof o.content === "string") continue;
    if (o.role === "system") {
      for (let c of o.content) {
        let s = exactKeyValue(c, "tool");
        let u =
          exactKeyValue(c, "type") === "tool_addition" && typeof s === "object" && s !== null
            ? exactKeyValue(s, "name")
            : undefined;
        if (typeof u === "string") n.add(canonicalToolName_2(u));
      }
      continue;
    }
    if (o.role !== "user") continue;
    for (let c of o.content) {
      if (!isToolResultBlockWithContent(c)) continue;
      for (let s of c.content) if (isToolReferenceWithName(s)) n.add(canonicalToolName_2(s.tool_name));
    }
  }
  return n;
}
export {
  parkAgentBaseline,
  hasParkedAgentBaseline,
  MAX_CACHE_STATE_BYTES,
  restoreAgentBaseline,
  forgetClassifierCompaction,
  CACHE_TTL_1H_MS,
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
  describeSnapshotDiff,
  isCacheFingerprintPart,
  ledgerComparableView,
  seedLedgerSnapshot,
  isDeferredTool,
  getTrackingKey,
  computeHash,
  EPHEMERAL_MESSAGE_MARK,
  isCacheBreakOutlineEnabled,
  isExcludedModel,
  MIN_CACHE_MISS_TOKENS,
  isCacheReadDrop,
};
