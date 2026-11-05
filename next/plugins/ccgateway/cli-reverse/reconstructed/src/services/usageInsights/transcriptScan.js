/**
 * services/usageInsights/transcriptScan.ts
 *
 * 2.1.316 新增。扫描转录统计用量行为。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-xefjhmwx.js (53)
 * attribution: placement 53
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { sep, join, extname } from "path";
import { readdir, stat } from "fs/promises";
import {
  isPolicyAllowed,
  policyDenyKind,
  policyKeyLabel,
  policyDeniedReason,
} from "../policyLimits/policyEvidence.js";
import { getCurrentTaints } from "../policyLimits/complianceTaints.js";
import { WORKFLOW_TRANSCRIPT_SUBDIR } from "../../tools/WorkflowTool/constants.js";
import {
  INTERRUPT_MESSAGE,
  HOOK_FEEDBACK_EVENTS,
  HOOK_FEEDBACK_SEPARATOR,
  STRUCTURED_OUTPUT_ENFORCE_PREFIX,
  EMPTY_SENTINEL,
  PROJECTS_REPLY_GATE_PREFIX,
  LINKED_BUT_NOT_SENT_PREFIX,
  GOAL_CHECK_IN_PREFIX,
  MALFORMED_TOOL_CALL_RETRY,
  MALFORMED_TOOL_CALL_TEXT,
  NO_VISIBLE_OUTPUT_TEXT,
  PERMISSION_DENIED_RETRY_TEXT,
  TURN_NOT_ENDED_NOTICE,
  OUTPUT_LIMIT_RESUME,
  OUTPUT_LIMIT_REASONING_RESUME_TEXT,
  OUTPUT_LIMIT_NO_VISIBLE_TEXT,
  OUTPUT_LIMIT_CUT_TEXT,
  STREAM_CUT_RESUME,
  STREAM_CUT_REWRITE,
} from "../../utils/messages.js";
import {
  LOCAL_COMMAND_CAVEAT,
  LOCAL_COMMAND_STDOUT,
  LOCAL_COMMAND_STDERR,
  BASH_STDOUT,
  BASH_STDERR,
} from "../../constants/xml.js";
import { jsonStringify, jsonParseRaw } from "../../utils/slowOperations.js";
import { HOOK_STOPPED_MESSAGE } from "../compact/compact.js";
import { BRIEF_ENFORCE_SENTINEL } from "../../tools/BriefTool/prompt.js";
import { getProjectsDir, listedProjectKey } from "../../utils/sessionStoragePortable.js";
import { isFsInaccessible } from "../../utils/errors.js";
import {
  createPageBudget,
  readAllPages,
  cappedPagesBeyondFirst,
  DEFAULT_MAX_PAGES,
  noteValidationIssue,
} from "../../utils/pagedRead.js";
import { isValidKeySegment } from "../../utils/storage/storageSpaces.js";
import { logForDebugging } from "../../utils/debug.js";
import { readLines } from "../../utils/fsOperations.js";
import { logError } from "../../utils/log.js";
import { clippedMessage } from "../../utils/stringUtils.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-xefjhmwx.js:753-1314 placement
/**
 * 三类「扫描本机会话转录」功能的策略键与 HIPAA 下的说明文案。
 */
var ALLOW_USAGE_TRANSCRIPT_SCAN = "allow_usage_transcript_scan";
var ALLOW_SKILL_DOCTOR_TRANSCRIPT_SCAN = "allow_skill_doctor_transcript_scan";
var ALLOW_STATS_TRANSCRIPT_SCAN = "allow_stats_transcript_scan";
var USAGE_SCAN_POLICY = {
  policy: ALLOW_USAGE_TRANSCRIPT_SCAN,
  hipaaReason:
    "Not shown under your organization's policy: this breakdown is built by scanning the session transcripts saved on this machine.",
};
var SKILL_DOCTOR_SCAN_POLICY = {
  policy: ALLOW_SKILL_DOCTOR_TRANSCRIPT_SCAN,
  hipaaReason:
    "Not shown under your organization's policy: measured by scanning the session transcripts saved on this machine.",
};
var STATS_SCAN_POLICY = {
  policy: ALLOW_STATS_TRANSCRIPT_SCAN,
  hipaaReason:
    "Not shown under your organization's policy: these stats are built by scanning the session transcripts saved on this machine.",
};
//@ chunk-xefjhmwx.js:1314-1579 placement
function checkUsagePolicy(request) {
  if (isPolicyAllowed(request.policy))
    return {
      allowed: true,
    };
  if (policyDenyKind(request.policy) === "org_denied" && getCurrentTaints().includes("hipaa"))
    return {
      allowed: false,
      reason: request.hipaaReason,
    };
  let { featureLabel, verb } = policyKeyLabel(request.policy);
  return {
    allowed: false,
    reason:
      policyDeniedReason(request.policy, featureLabel, verb) ??
      `${featureLabel} ${verb} unavailable right now.`,
  };
}
//@ chunk-xefjhmwx.js:1579-1607 placement
/**
 * 是否允许扫描 /usage 用量。
 */
function isUsageScanAllowed() {
  return checkUsagePolicy(USAGE_SCAN_POLICY);
}
//@ chunk-xefjhmwx.js:1607-1635 placement
/**
 * 是否允许扫描技能体检数据。
 */
function isSkillDoctorScanAllowed() {
  return checkUsagePolicy(SKILL_DOCTOR_SCAN_POLICY);
}
//@ chunk-xefjhmwx.js:1635-1663 placement
/**
 * 是否允许扫描统计信息。
 */
function isStatsScanAllowed() {
  return checkUsagePolicy(STATS_SCAN_POLICY);
}
//@ chunk-xefjhmwx.js:1762-1774 placement
/**
 * 每百万 token 金额的换算比例。
 */
var USD_PER_MTOK_SCALE = 2.5;
//@ chunk-xefjhmwx.js:1774-1926 placement
function createContextTracker() {
  return {
    lastRequest: undefined,
    lastContext: 0,
    carriedTokens: 0,
    firstPromptBytes: 0,
    startTokens: 0,
    pendingToolResultBytes: 0,
    largeToolResultTokens: 0,
  };
}
//@ chunk-xefjhmwx.js:1926-1990 placement
/**
 * 会话尚未发出请求时，把当前内容计入首条提示的字节数。
 */
function addFirstPromptBytes(scanState, bytes) {
  if (scanState.lastRequest === undefined) scanState.firstPromptBytes += bytes;
}
//@ chunk-xefjhmwx.js:1990-2023 placement
/**
 * 判断工具结果是否属于大体积。
 */
function isLargeToolResultBytes(bytes) {
  return bytes / 2.5 > 1e4;
}
//@ chunk-xefjhmwx.js:2023-2077 placement
/**
 * 工具结果足够大时才把字节数计入待处理大结果。
 */
function addLargeToolResultBytes(scanState, bytes) {
  if (isLargeToolResultBytes(bytes)) scanState.pendingToolResultBytes += bytes;
}
//@ chunk-xefjhmwx.js:2077-2747 placement
/**
 * 按请求跟踪上下文增长：估算会话起始常驻 token、累计大工具结果带来的 token，并把常驻 token（主线程且超 40k）与大结果 token 写入记录。
 */
function trackContextGrowth(tracker, record) {
  let contextTokens = record.cached + record.cacheCreate + record.uncached;
  if (record.uuid === tracker.lastRequest)
    tracker.carriedTokens = Math.max(tracker.carriedTokens, contextTokens + record.output);
  else {
    if (tracker.lastRequest === undefined)
      tracker.startTokens = contextTokens - Math.round(tracker.firstPromptBytes / 2.5);
    else if (contextTokens < tracker.lastContext)
      tracker.largeToolResultTokens = Math.max(
        0,
        tracker.largeToolResultTokens - (tracker.lastContext - contextTokens),
      );
    else {
      let min = Math.min(contextTokens - tracker.carriedTokens, tracker.pendingToolResultBytes / 2.5);
      if (min > 1e4) tracker.largeToolResultTokens += min;
    }
    tracker.startTokens = Math.min(tracker.startTokens, contextTokens);
    tracker.lastRequest = record.uuid;
    tracker.lastContext = contextTokens;
    tracker.carriedTokens = contextTokens + record.output;
    tracker.pendingToolResultBytes = 0;
  }
  record.largeToolResultTokens = tracker.largeToolResultTokens;
  record.alwaysOnTokens = !record.isSubagent && tracker.startTokens > 40000 ? tracker.startTokens : 0;
}
//@ chunk-xefjhmwx.js:2747-5100 placement
/**
 * 转录扫描的常量：读取分块、统计窗口、各种「行为」阈值（缓存未命中、长上下文、子代理、高并行、cron）与扫描用的字节标记。
 */
var TRANSCRIPT_SCAN_MARKERS; // deferred: uses INTERRUPT_MESSAGE (../../utils/messages.js) of its import cycle while loading; runs once the cycle is complete
var TRANSCRIPT_READ_CHUNK_BYTES;
var TRANSCRIPT_READ_CHUNK_BYTES_2;
var USAGE_WINDOW_MS;
var CACHE_MISS_TOKEN_THRESHOLD;
var LONG_CONTEXT_THRESHOLD;
var SUBAGENT_HEAVY_COUNT;
var SUBAGENT_HEAVY_COST_RATIO;
var PARALLEL_BUCKET_MS;
var HIGH_PARALLEL_SESSIONS;
var CRON_SESSION_HOURS;
var SUBAGENT_TRANSCRIPT_MARK;
var textEncoder;
var ASSISTANT_RECORD_MARKER;
var USAGE_FIELD_MARKER;
var TIMESTAMP_FIELD_MARKER;
var SESSION_ID_FIELD_MARKER;
var MODEL_FIELD_MARKER;
var REQUEST_ID_FIELD_MARKER;
var ID_FIELD_MARKER;
var MESSAGE_ID_PREFIX;
var UUID_FIELD_MARKER;
var INPUT_TOKENS_FIELD_MARKER;
var OUTPUT_TOKENS_FIELD_MARKER;
var CACHE_CREATION_TOKENS_FIELD_MARKER;
var CACHE_READ_TOKENS_FIELD_MARKER;
var SIDECHAIN_TIGHT_MARKER;
var SIDECHAIN_SPACED_MARKER;
var MAX_EFFORT_MARKER;
var ATTRIBUTION_MARKER;
var ATTRIBUTION_AGENT_FIELD_MARKER;
var ATTRIBUTION_SKILL_FIELD_MARKER;
var ATTRIBUTION_PLUGIN_FIELD_MARKER;
var ATTRIBUTION_MCP_SERVER_FIELD_MARKER;
var USER_RECORD_MARKER;
var META_RECORD_MARKER;
var SCHEDULED_FIRE_MARKER;
var TASK_ID_FIELD_MARKER;
var SCHEDULED_TASK_ID_FIELD_MARKER;
var SCHEDULED_FIRE_ID_FIELD_MARKER;
var TOOL_RESULT_RECORD_MARKER;
var TOOL_USE_RESULT_FIELD_MARKER;
var TURN_COMPANION_MARKER;
var INTERRUPT_TEXT_MARKER;
var CONTENT_ARRAY_MARKER;
var LOOP_WAKEUP_SUFFIX_MARKER;
var COMPACT_SUMMARY_MARKER;
var COMPACT_BOUNDARY_BYTES;
var ATTACHMENT_RECORD_MARKER;
var FILE_ATTACHMENT_MARKER;
var QUEUED_COMMAND_RECORD_MARKER;
var ORIGIN_FIELD_MARKER;
var HUMAN_ORIGIN_MARKER;
var PROMPT_SOURCE_FIELD_MARKER;
var SYSTEM_RECORD_MARKER;
var LOCAL_COMMAND_MARKER;
var contentOrTextMarker;
var COMMAND_MESSAGE_MARKERS;
var LOCAL_COMMAND_CAVEAT_MARKERS;
var LOCAL_COMMAND_OUTPUT_MARKERS;
var BASH_OUTPUT_MARKERS;
var containsAnyMarker;
var HOOK_STOPPED_MARKERS;
var messageMarkerPair;
var flattened;
var flattened_2;
var CRON_FIELD_MARKER;
var PROMPT_FIELD_MARKER;
var LOOP_TASK_KIND_MARKER;
var CONTENT_FIELD_MARKER;
var TEXT_FIELD_MARKER;
var QUOTE_BYTE;
var BACKSLASH_BYTE;
var OPEN_BRACE_BYTE;
var CLOSE_BRACE_BYTE;
var OPEN_BRACKET_BYTE;
var CLOSE_BRACKET_BYTE;
var DIGIT_ZERO_BYTE;
var DIGIT_NINE_BYTE;
deferInit("chunk-xefjhmwx.js:2747", () => {
  TRANSCRIPT_SCAN_MARKERS = 4;
  TRANSCRIPT_READ_CHUNK_BYTES = 4194304;
  TRANSCRIPT_READ_CHUNK_BYTES_2 = TRANSCRIPT_READ_CHUNK_BYTES;
  USAGE_WINDOW_MS = 604800000;
  CACHE_MISS_TOKEN_THRESHOLD = 1e5;
  LONG_CONTEXT_THRESHOLD = 150000;
  SUBAGENT_HEAVY_COUNT = 3;
  SUBAGENT_HEAVY_COST_RATIO = 0.5;
  PARALLEL_BUCKET_MS = 300000;
  HIGH_PARALLEL_SESSIONS = 4;
  CRON_SESSION_HOURS = 8;
  SUBAGENT_TRANSCRIPT_MARK = `${sep}subagents${sep}${WORKFLOW_TRANSCRIPT_SUBDIR}${sep}`;
  textEncoder = new TextEncoder();
  ASSISTANT_RECORD_MARKER = textEncoder.encode('"type":"assistant"');
  USAGE_FIELD_MARKER = textEncoder.encode('"usage":{');
  TIMESTAMP_FIELD_MARKER = textEncoder.encode('"timestamp":"');
  SESSION_ID_FIELD_MARKER = textEncoder.encode('"sessionId":"');
  MODEL_FIELD_MARKER = textEncoder.encode('"model":"');
  REQUEST_ID_FIELD_MARKER = textEncoder.encode('"requestId":"');
  ID_FIELD_MARKER = textEncoder.encode('"id":"');
  MESSAGE_ID_PREFIX = textEncoder.encode("msg_");
  UUID_FIELD_MARKER = textEncoder.encode('"uuid":"');
  INPUT_TOKENS_FIELD_MARKER = textEncoder.encode('"input_tokens":');
  OUTPUT_TOKENS_FIELD_MARKER = textEncoder.encode('"output_tokens":');
  CACHE_CREATION_TOKENS_FIELD_MARKER = textEncoder.encode('"cache_creation_input_tokens":');
  CACHE_READ_TOKENS_FIELD_MARKER = textEncoder.encode('"cache_read_input_tokens":');
  SIDECHAIN_TIGHT_MARKER = textEncoder.encode('"isSidechain":true');
  SIDECHAIN_SPACED_MARKER = textEncoder.encode('"isSidechain": true');
  MAX_EFFORT_MARKER = textEncoder.encode('"effort":"max"');
  ATTRIBUTION_MARKER = textEncoder.encode('"attribution');
  ATTRIBUTION_AGENT_FIELD_MARKER = textEncoder.encode('"attributionAgent":"');
  ATTRIBUTION_SKILL_FIELD_MARKER = textEncoder.encode('"attributionSkill":"');
  ATTRIBUTION_PLUGIN_FIELD_MARKER = textEncoder.encode('"attributionPlugin":"');
  ATTRIBUTION_MCP_SERVER_FIELD_MARKER = textEncoder.encode('"attributionMcpServer":"');
  USER_RECORD_MARKER = textEncoder.encode('"type":"user"');
  META_RECORD_MARKER = textEncoder.encode('"isMeta":true');
  SCHEDULED_FIRE_MARKER = textEncoder.encode('"subtype":"scheduled_task_fire"');
  TASK_ID_FIELD_MARKER = textEncoder.encode('"taskId":"');
  SCHEDULED_TASK_ID_FIELD_MARKER = textEncoder.encode('"scheduledTaskId":"');
  SCHEDULED_FIRE_ID_FIELD_MARKER = textEncoder.encode('"scheduledFireId":"');
  TOOL_RESULT_RECORD_MARKER = textEncoder.encode('"type":"tool_result"');
  TOOL_USE_RESULT_FIELD_MARKER = textEncoder.encode('"toolUseResult":');
  TURN_COMPANION_MARKER = textEncoder.encode('"turnCompanion":true');
  INTERRUPT_TEXT_MARKER = textEncoder.encode(`"text":"${INTERRUPT_MESSAGE.slice(0, -1)}`);
  CONTENT_ARRAY_MARKER = textEncoder.encode('"content":"[');
  LOOP_WAKEUP_SUFFIX_MARKER = textEncoder.encode(" prior /loop wakeup");
  COMPACT_SUMMARY_MARKER = textEncoder.encode('"isCompactSummary":true');
  COMPACT_BOUNDARY_BYTES = [textEncoder.encode('"subtype":"compact_boundary"'), ...[]];
  ATTACHMENT_RECORD_MARKER = textEncoder.encode('"type":"attachment"');
  FILE_ATTACHMENT_MARKER = textEncoder.encode('"attachment":{"type":"file"');
  QUEUED_COMMAND_RECORD_MARKER = textEncoder.encode('"type":"queued_command"');
  ORIGIN_FIELD_MARKER = textEncoder.encode('"origin":{');
  HUMAN_ORIGIN_MARKER = textEncoder.encode('"origin":{"kind":"human"');
  PROMPT_SOURCE_FIELD_MARKER = textEncoder.encode('"promptSource":"');
  SYSTEM_RECORD_MARKER = textEncoder.encode('"type":"system"');
  LOCAL_COMMAND_MARKER = textEncoder.encode('"subtype":"local_command"');
  contentOrTextMarker = (tag) => [
    textEncoder.encode(`"content":"<${tag}>`),
    textEncoder.encode(`"text":"<${tag}>`),
  ];
  COMMAND_MESSAGE_MARKERS = [
    ...contentOrTextMarker("command-message"),
    ...contentOrTextMarker("command-name"),
  ];
  LOCAL_COMMAND_CAVEAT_MARKERS = contentOrTextMarker(LOCAL_COMMAND_CAVEAT);
  LOCAL_COMMAND_OUTPUT_MARKERS = [
    ...contentOrTextMarker(LOCAL_COMMAND_STDOUT),
    ...contentOrTextMarker(LOCAL_COMMAND_STDERR),
  ];
  BASH_OUTPUT_MARKERS = [...contentOrTextMarker(BASH_STDOUT), ...contentOrTextMarker(BASH_STDERR)];
  containsAnyMarker = (buffer, markers, end) =>
    markers.some((marker) => indexOfBytes(buffer, marker, 0, end) >= 0);
  HOOK_STOPPED_MARKERS = [
    textEncoder.encode(`"content":${jsonStringify(HOOK_STOPPED_MESSAGE).slice(0, -1)}`),
    textEncoder.encode(`"text":${jsonStringify(HOOK_STOPPED_MESSAGE).slice(0, -1)}`),
  ];
  messageMarkerPair = (value, keepClosingBrace = false) => {
    let json = keepClosingBrace ? jsonStringify(value) : jsonStringify(value).slice(0, -1);
    return [textEncoder.encode(`"content":${json}`), textEncoder.encode(`"text":${json}`)];
  };
  flattened = [
    ...HOOK_FEEDBACK_EVENTS.map((event) => `${event}${HOOK_FEEDBACK_SEPARATOR}`),
    STRUCTURED_OUTPUT_ENFORCE_PREFIX,
    EMPTY_SENTINEL,
    PROJECTS_REPLY_GATE_PREFIX,
    BRIEF_ENFORCE_SENTINEL,
    LINKED_BUT_NOT_SENT_PREFIX,
    GOAL_CHECK_IN_PREFIX,
  ]
    .filter((text) => text.length > 0)
    .flatMap((text) => messageMarkerPair(text));
  flattened_2 = [
    MALFORMED_TOOL_CALL_RETRY,
    MALFORMED_TOOL_CALL_TEXT,
    NO_VISIBLE_OUTPUT_TEXT,
    PERMISSION_DENIED_RETRY_TEXT,
    TURN_NOT_ENDED_NOTICE,
    OUTPUT_LIMIT_RESUME,
    OUTPUT_LIMIT_REASONING_RESUME_TEXT,
    OUTPUT_LIMIT_NO_VISIBLE_TEXT,
    OUTPUT_LIMIT_CUT_TEXT,
    STREAM_CUT_RESUME,
    STREAM_CUT_REWRITE,
  ].flatMap((text) => messageMarkerPair(text, true));
  CRON_FIELD_MARKER = textEncoder.encode('"cron":"');
  PROMPT_FIELD_MARKER = textEncoder.encode('"prompt":"');
  LOOP_TASK_KIND_MARKER = textEncoder.encode('"taskKind":"loop"');
  CONTENT_FIELD_MARKER = textEncoder.encode('"content":"');
  TEXT_FIELD_MARKER = textEncoder.encode('"text":"');
  QUOTE_BYTE = 34;
  BACKSLASH_BYTE = 92;
  OPEN_BRACE_BYTE = 123;
  CLOSE_BRACE_BYTE = 125;
  OPEN_BRACKET_BYTE = 91;
  CLOSE_BRACKET_BYTE = 93;
  DIGIT_ZERO_BYTE = 48;
  DIGIT_NINE_BYTE = 57;
});
//@ chunk-xefjhmwx.js:5100-5172 placement
/**
 * 在字节缓冲里查找子串位置。
 */
function indexOfBytes(buffer, needle, start, end) {
  let index = buffer.subarray(start, end).indexOf(needle);
  return index < 0 ? -1 : start + index;
}
//@ chunk-xefjhmwx.js:5172-5300 placement
/**
 * 在缓冲区内找到指定 JSON 字段后读出其字符串值（到下一个引号为止）。
 */
function readJsonStringField(buffer, key, start, end) {
  let keyIndex = indexOfBytes(buffer, key, start, end);
  if (keyIndex < 0) return;
  let valueStart = keyIndex + key.length;
  let cursor = valueStart;
  while (cursor < end && buffer[cursor] !== QUOTE_BYTE) cursor++;
  return buffer.toString("utf8", valueStart, cursor);
}
//@ chunk-xefjhmwx.js:5300-5648 placement
/**
 * 从原始 JSON 行字节中读取某键的字符串值（有长度上限，截断时修正 UTF-8 与半个 \u 转义），按 JSON 字符串解码。
 */
function readJsonStringFieldBounded(buffer, key, start, end, maxBytes) {
  let keyIndex = indexOfBytes(buffer, key, start, end);
  if (keyIndex < 0) return;
  let valueStart = keyIndex + key.length;
  let cursor = valueStart;
  let min = Math.min(end, valueStart + maxBytes);
  while (cursor < min && buffer[cursor] !== QUOTE_BYTE) {
    if (buffer[cursor] === BACKSLASH_BYTE) cursor++;
    cursor++;
  }
  let wasTrimmed = cursor >= min;
  if (cursor > min) cursor = min - 1;
  if (wasTrimmed) cursor = trimPartialUtf8(buffer, valueStart, cursor);
  let str = buffer.toString("utf8", valueStart, cursor);
  if (wasTrimmed) str = str.replace(/(^|[^\\])((?:\\\\)*)\\u[0-9a-fA-F]{0,3}$/, "$1$2");
  try {
    let parsed = jsonParseRaw(`"${str}"`);
    return typeof parsed === "string" ? parsed : undefined;
  } catch {
    return;
  }
}
//@ chunk-xefjhmwx.js:5648-5794 placement
function trimPartialUtf8(buffer, start, end) {
  let cursor = end;
  while (cursor > start && (buffer[cursor - 1] & 192) === 128) cursor--;
  if (cursor === start) return start;
  let leadByte = buffer[cursor - 1];
  let seqLength = leadByte >= 240 ? 4 : leadByte >= 224 ? 3 : leadByte >= 192 ? 2 : 1;
  return end - (cursor - 1) < seqLength ? cursor - 1 : end;
}
//@ chunk-xefjhmwx.js:5794-5970 placement
function findCommandField(buffer, start, end) {
  let cursor = start;
  while (true) {
    cursor = indexOfBytes(buffer, ID_FIELD_MARKER, cursor, end);
    if (cursor < 0) return;
    let idStart = cursor + ID_FIELD_MARKER.length;
    if (indexOfBytes(buffer, MESSAGE_ID_PREFIX, idStart, idStart + 4) === idStart) {
      let valueEnd = idStart;
      while (valueEnd < end && buffer[valueEnd] !== QUOTE_BYTE) valueEnd++;
      return buffer.toString("utf8", idStart, valueEnd);
    }
    cursor = idStart;
  }
}
//@ chunk-xefjhmwx.js:5970-6103 placement
function readJsonIntField(buffer, key, start, end) {
  let keyIndex = indexOfBytes(buffer, key, start, end);
  if (keyIndex < 0) return 0;
  let cursor = keyIndex + key.length;
  let value = 0;
  while (cursor < end && buffer[cursor] >= DIGIT_ZERO_BYTE && buffer[cursor] <= DIGIT_NINE_BYTE) {
    value = value * 10 + (buffer[cursor] - DIGIT_ZERO_BYTE);
    cursor++;
  }
  return value;
}
//@ chunk-xefjhmwx.js:6103-6260 placement
function getModelCostWeight(model) {
  if (!model) return 3;
  let lower = model.toLowerCase();
  if (lower.includes("fable")) return 10;
  if (lower.includes("opus")) return 5;
  if (lower.includes("haiku")) return 1;
  return 3;
}
//@ chunk-xefjhmwx.js:6260-6350 placement
/**
 * 按模型价格加权的 token 数。
 */
function costWeightedTokens(record) {
  return (
    (record.cached + record.uncached * 10 + record.cacheCreate * 12.5 + record.output * 50) * record.modelTier
  );
}
//@ chunk-xefjhmwx.js:6350-6546 placement
/**
 * 汇总最近 7 天与 1 天的转录用量：按行为聚合记录并统计 loop 运行，返回日/周的分桶结果。
 */
async function aggregateRecentUsage_2(storage, foldOptions) {
  let weekStartMs = Date.now() - USAGE_WINDOW_MS;
  let dayStartMs = Date.now() - 86400000;
  let usageAggregate = createUsageAggregate();
  let usageAggregate_2 = createUsageAggregate();
  await scanTranscripts(
    weekStartMs,
    (record) => {
      aggregateUsageByBehavior(usageAggregate_2, record);
      if (record.ts >= dayStartMs) aggregateUsageByBehavior(usageAggregate, record, dayStartMs);
    },
    storage,
    (fire) => {
      recordLoopRun(usageAggregate_2, fire);
      if (fire.ts >= dayStartMs) recordLoopRun(usageAggregate, fire);
    },
    foldOptions,
  );
  return {
    day: usageBuckets(usageAggregate),
    week: usageBuckets(usageAggregate_2),
  };
}
//@ chunk-xefjhmwx.js:6546-6890 placement
/**
 * 扫描转录：存储 v5 可用时走存储；否则读取各项目目录的全部转录（含子代理），分批解析并回调记录与 loop 触发。
 */
async function scanTranscripts(minMtimeMs, foldSpec, storage, foldOptions, startSpan) {
  if (storage) return scanStoredTranscripts(storage, minMtimeMs, foldSpec, foldOptions, startSpan);
  let projectsDir = getProjectsDir();
  let projectDirs;
  try {
    projectDirs = await readdir(projectsDir);
  } catch (error) {
    if (isFsInaccessible(error)) return;
    throw error;
  }
  let transcripts = (
    await Promise.all(
      projectDirs.map((projectDir) => loadAllSubagentTranscriptsFromDisk(join(projectsDir, projectDir))),
    )
  ).flat();
  let dedupingSink = makeDedupingSink(foldSpec, foldOptions);
  for (let offset = 0; offset < transcripts.length; offset += TRANSCRIPT_SCAN_MARKERS) {
    let sliced = transcripts.slice(offset, offset + TRANSCRIPT_SCAN_MARKERS);
    let mapped = sliced.map(() => startSpan && safeLineSink(startSpan()));
    (
      await Promise.all(
        sliced.map((transcript, index) => scanTranscriptIntoUsage(transcript, minMtimeMs, mapped[index])),
      )
    ).forEach((partial, index) => {
      dedupingSink(partial);
      mapped[index]?.end(partial);
    });
  }
}
//@ chunk-xefjhmwx.js:6890-7085 placement
function makeDedupingSink(foldSpec, foldOptions) {
  let seenIds = new Set();
  let isFirst = (uuid) => {
    if (!uuid) return true;
    if (seenIds.has(uuid)) return false;
    seenIds.add(uuid);
    return true;
  };
  return (partial) => {
    for (let record of partial.records) if (isFirst(record.uuid)) foldSpec(record);
    if (foldOptions) {
      for (let fire of partial.fires) if (isFirst(fire.uuid)) foldOptions(fire);
    }
  };
}
//@ chunk-xefjhmwx.js:7085-7678 placement
/**
 * 通过存储 v5 分页列出各项目的转录（受页数预算限制），分批读取解析并回调，被截断时记日志。
 */
async function scanStoredTranscripts(storage, minMtimeMs, foldSpec, foldOptions, startSpan) {
  let projectKeys = [];
  let budget = createPageBudget();
  let pages = await readAllPages(
    (cursor) =>
      storage.listEntries(
        {
          namespace: "transcript",
        },
        {
          skipScopeStats: true,
          ...(cursor !== undefined && {
            cursor,
          }),
        },
      ),
    (entries) => {
      for (let entry of entries) {
        let projectKey = listedProjectKey(entry, isValidKeySegment);
        if (projectKey !== undefined) projectKeys.push(projectKey);
      }
    },
    {
      budget,
    },
  );
  logListingOutcome("project", pages, budget);
  let transcriptKeys = (
    await Promise.all(
      projectKeys.map((projectKey) => listProjectTranscriptKeys(storage, projectKey, minMtimeMs, budget)),
    )
  ).flat();
  let fold = makeDedupingSink(foldSpec, foldOptions);
  for (let offset = 0; offset < transcriptKeys.length; offset += TRANSCRIPT_SCAN_MARKERS) {
    let sliced = transcriptKeys.slice(offset, offset + TRANSCRIPT_SCAN_MARKERS);
    let mapped = sliced.map(() => startSpan && safeLineSink(startSpan()));
    (
      await Promise.all(
        sliced.map((key, index) => readStoredTranscript(storage, key, minMtimeMs, mapped[index])),
      )
    ).forEach((partial, index) => {
      fold(partial);
      mapped[index]?.end(partial);
    });
  }
  let cappedPages = cappedPagesBeyondFirst(budget);
  if (cappedPages > 0)
    logForDebugging(
      `foldRecentRecords: ${cappedPages} more v5 listings were cut short after the scan's ${DEFAULT_MAX_PAGES}-page budget ran out`,
    );
}
//@ chunk-xefjhmwx.js:7678-8280 placement
/**
 * 列出项目下的会话转录键：分页读取主转录键与会话目录，按修改时间过滤会话，再并行列出各会话的子代理转录键。
 */
async function listProjectTranscriptKeys(storage, projectKey, minMtimeMs, budget) {
  let keys = [];
  let sessionIds = [];
  let pages = await readAllPages(
    (cursor) =>
      storage.listEntries(
        {
          namespace: "transcript",
          projectKey,
        },
        {
          skipScopeStats: true,
          ...(cursor !== undefined && {
            cursor,
          }),
        },
      ),
    (entries) => {
      for (let entry of entries)
        if (entry.kind === "key") pushTranscriptKey(keys, entry);
        else if (
          entry.scope.namespace === "transcript" &&
          entry.scope.sessionId !== undefined &&
          isValidKeySegment(entry.scope.sessionId)
        )
          sessionIds.push(entry.scope.sessionId);
    },
    {
      budget,
    },
  );
  logListingOutcome("session", pages, budget);
  let mtimeBySession = new Map();
  for (let key of keys)
    if (key.key.namespace === "transcript" && key.key.agentId === undefined && key.key.journal !== true)
      mtimeBySession.set(key.key.sessionId, key.mtimeMs);
  let filtered = sessionIds.filter((sessionId) => (mtimeBySession.get(sessionId) ?? 1 / 0) >= minMtimeMs);
  let results = await Promise.all(
    filtered.map((sessionId) => listSessionTranscriptKeys(storage, projectKey, sessionId, budget)),
  );
  return keys.concat(results.flat());
}
//@ chunk-xefjhmwx.js:8280-8863 placement
/**
 * 递归列出某会话（或子代理路径）下的子代理与日志转录键。
 */
async function listSessionTranscriptKeys(storage, projectKey, sessionId, budget, agentRelPath) {
  let keys = [];
  let childPaths = [];
  let pages = await readAllPages(
    (cursor) =>
      storage.listEntries(
        {
          namespace: "transcript",
          projectKey,
          sessionId,
          ...(agentRelPath !== undefined && {
            agentRelPath,
          }),
        },
        {
          skipScopeStats: true,
          ...(cursor !== undefined && {
            cursor,
          }),
        },
      ),
    (entries) => {
      for (let entry of entries)
        if (entry.kind === "key") {
          if (
            entry.key.namespace === "transcript" &&
            (entry.key.agentId !== undefined || entry.key.journal === true)
          )
            pushTranscriptKey(keys, entry);
        } else if (
          entry.scope.namespace === "transcript" &&
          entry.scope.agentRelPath !== undefined &&
          entry.scope.agentRelPath.length > (agentRelPath?.length ?? 0)
        )
          childPaths.push(entry.scope.agentRelPath);
    },
    {
      budget,
    },
  );
  logListingOutcome("subagent", pages, budget);
  let results = await Promise.all(
    childPaths.map((childPath) =>
      listSessionTranscriptKeys(storage, projectKey, sessionId, budget, childPath),
    ),
  );
  return keys.concat(results.flat());
}
//@ chunk-xefjhmwx.js:8863-9128 placement
function logListingOutcome(kind, pages, budget) {
  let issue = noteValidationIssue(pages, budget);
  if (pages.status === "error")
    logForDebugging(`foldRecentRecords: v5 ${kind} listing failed: ${pages.error.code}`);
  else if (issue === "first-truncation")
    logForDebugging(
      `foldRecentRecords: v5 ${kind} listing cut short (the scan's ${DEFAULT_MAX_PAGES}-page budget is spent); keeping what was listed`,
    );
}
//@ chunk-xefjhmwx.js:9128-9282 placement
function pushTranscriptKey(keys, entry) {
  if (
    entry.kind === "key" &&
    entry.key.namespace === "transcript" &&
    entry.size !== undefined &&
    entry.mtimeMs !== undefined
  )
    keys.push({
      key: entry.key,
      size: entry.size,
      mtimeMs: entry.mtimeMs,
    });
}
//@ chunk-xefjhmwx.js:9282-9431 placement
async function readStoredTranscript(storage, entry, sinceTs, span) {
  let usageTotals = newUsageTotals();
  if (entry.mtimeMs >= sinceTs)
    await readStoredTranscriptLines(
      storage,
      entry,
      transcriptReadPlan(
        usageTotals,
        sinceTs,
        entry.key.namespace === "transcript" && entry.key.agentRelPath?.[0] === WORKFLOW_TRANSCRIPT_SUBDIR,
        span,
      ),
    );
  return usageTotals;
}
//@ chunk-xefjhmwx.js:9431-10077 placement
/**
 * 按块从存储读取转录并按换行切分逐行回调（跨块拼接不完整的行）。
 */
async function readStoredTranscriptLines(storage, entry, onLine) {
  let { key } = entry;
  let readWhole = entry.size <= TRANSCRIPT_READ_CHUNK_BYTES;
  let offset = 0;
  let pendingChunks = [];
  let pendingBytes = 0;
  while (true) {
    let readResult = await storage.read([
      readWhole
        ? key
        : {
            key,
            offset,
            length: TRANSCRIPT_READ_CHUNK_BYTES_2,
          },
    ]);
    if (!readResult.ok) {
      logForDebugging(`readRecordsFromStream: v5 read failed: ${readResult.error.code}`);
      return;
    }
    let item = readResult.value.items[0];
    if (!item.found) return;
    let buffer = Buffer.from(item.value.buffer, item.value.byteOffset, item.value.byteLength);
    let lineStart = 0;
    while (lineStart < buffer.length) {
      let index = buffer.indexOf(10, lineStart);
      if (index === -1) {
        pendingChunks.push(Buffer.from(buffer.subarray(lineStart)));
        pendingBytes += buffer.length - lineStart;
        break;
      }
      if (pendingBytes === 0) onLine(buffer.subarray(lineStart, index));
      else {
        onLine(
          Buffer.concat(
            [...pendingChunks, buffer.subarray(lineStart, index)],
            pendingBytes + (index - lineStart),
          ),
        );
        pendingChunks = [];
        pendingBytes = 0;
      }
      lineStart = index + 1;
    }
    offset += item.value.byteLength;
    if (readWhole || item.value.byteLength === 0 || offset >= item.totalBytes) break;
  }
  if (pendingBytes > 0)
    onLine(pendingChunks.length === 1 ? pendingChunks[0] : Buffer.concat(pendingChunks, pendingBytes));
}
//@ chunk-xefjhmwx.js:10077-10224 placement
function addSkillAttribution(skillTokens, record) {
  if (!record.attributionSkill) return;
  skillTokens.set(
    record.attributionSkill,
    (skillTokens.get(record.attributionSkill) ?? 0) +
      record.cached +
      record.cacheCreate +
      record.uncached +
      record.output,
  );
}
//@ chunk-xefjhmwx.js:10224-10312 placement
/**
 * 汇总最近的用量记录。
 */
async function aggregateRecentUsage(storageV5) {
  let minMtimeMs = Date.now() - USAGE_WINDOW_MS;
  let skillTokens = new Map();
  await scanTranscripts(minMtimeMs, (record) => addSkillAttribution(skillTokens, record), storageV5);
  return skillTokens;
}
//@ chunk-xefjhmwx.js:10312-10772 placement (2.1.88 match: loadAllSubagentTranscriptsFromDisk, 0.769)
async function loadAllSubagentTranscriptsFromDisk(projectDir) {
  let entries;
  try {
    entries = await readdir(projectDir, {
      withFileTypes: true,
    });
  } catch (error) {
    if (isFsInaccessible(error)) return [];
    throw error;
  }
  let paths = [];
  let dirNames = [];
  for (let entry of entries)
    if (entry.isFile() && extname(entry.name) === ".jsonl") paths.push(join(projectDir, entry.name));
    else if (entry.isDirectory()) dirNames.push(entry.name);
  let results = await Promise.all(
    dirNames.map(async (dirName) => {
      let subagentsDir = join(projectDir, dirName, "subagents");
      try {
        return (
          await readdir(subagentsDir, {
            recursive: true,
          })
        )
          .filter((nestedPath) => extname(nestedPath) === ".jsonl")
          .map((nestedPath) => join(subagentsDir, nestedPath));
      } catch (error) {
        if (isFsInaccessible(error)) return [];
        throw error;
      }
    }),
  );
  for (let nestedPaths of results) for (let nestedPath of nestedPaths) paths.push(nestedPath);
  return paths;
}
//@ chunk-xefjhmwx.js:10772-10856 placement
async function scanTranscriptIntoUsage(filePath, minMtimeMs, span) {
  let usageTotals = newUsageTotals();
  await readTranscriptFileLines(
    filePath,
    minMtimeMs,
    transcriptReadPlan(usageTotals, minMtimeMs, filePath.includes(SUBAGENT_TRANSCRIPT_MARK), span),
  );
  return usageTotals;
}
//@ chunk-xefjhmwx.js:10856-11042 placement
async function readTranscriptFileLines(filePath, minMtimeMs, onLine) {
  let stats;
  try {
    stats = await stat(filePath);
  } catch (error) {
    if (isFsInaccessible(error)) return;
    throw error;
  }
  if (!stats.isFile() || stats.mtimeMs < minMtimeMs) return;
  try {
    for await (let line of readLines(filePath)) onLine(line);
  } catch (error) {
    if (isFsInaccessible(error)) return;
    throw error;
  }
}
//@ chunk-xefjhmwx.js:11042-11084 placement
function newUsageTotals() {
  return {
    records: [],
    fires: [],
  };
}
//@ chunk-xefjhmwx.js:11084-11166 placement
function transcriptReadPlan(sink, sinceTs, isWorkflow, span) {
  let lineSink = attributeLoopRuns(sink, sinceTs, isWorkflow);
  if (!span) return lineSink;
  return (line) => {
    lineSink(line);
    span.line(line, sink);
  };
}
//@ chunk-xefjhmwx.js:11166-11304 placement
function safeLineSink(inner) {
  let isAlive = true;
  let guarded = (fn) => {
    if (!isAlive) return;
    try {
      fn();
    } catch (error) {
      isAlive = false;
      logError(error);
    }
  };
  return {
    line: (line, sink) => guarded(() => inner.line(line, sink)),
    end: (sink) => guarded(() => inner.end(sink)),
  };
}
//@ chunk-xefjhmwx.js:11304-11369 placement
var COMMAND_NAME_REGEX = /<command-name>([^<]{1,200})<\/command-name>/;
var MAX_COMMAND_NAME_CHARS = 200;
var MAX_COMMAND_NAME_BOUND = 6 * MAX_COMMAND_NAME_CHARS;
//@ chunk-xefjhmwx.js:11369-13867 placement
function attributeLoopRuns(sink, sinceTs, isWorkflow) {
  let phaseSeq = 0;
  let loopQueue = [];
  let activeFires = [];
  let fireDepth = 0;
  let tracker = createContextTracker();
  let sawUsage = true;
  let currentFire;
  let lastBySubagent = new Map();
  let startFire = () => {
    phaseSeq++;
    activeFires = [];
    fireDepth = 0;
    sawUsage = false;
  };
  let endFire = () => {
    phaseSeq++;
    activeFires = [];
    fireDepth = 0;
    sawUsage = true;
    pendingReuse = undefined;
    currentFire = undefined;
  };
  let popFire = () => {
    if (!currentFire) return;
    fireDepth = Math.max(0, fireDepth - 1);
    if (currentFire.run) {
      sink.fires.pop();
      activeFires.pop();
    }
    if (currentFire.fire && currentFire.fire.taskId === undefined) loopQueue.unshift(currentFire.fire);
    currentFire = undefined;
  };
  let onCommandRecord = () => {
    if (currentFire?.isCommandRecord) {
      popFire();
      endFire();
    }
  };
  let pendingReuse;
  let takeLoopRecord = (text, len) => {
    let jsonStringField = readJsonStringField(text, SCHEDULED_FIRE_ID_FIELD_MARKER, 0, len);
    if (jsonStringField !== undefined) {
      let index = loopQueue.findIndex((entry) => entry.uuid === jsonStringField);
      return index < 0 ? undefined : loopQueue.splice(index, 1)[0];
    }
    let jsonStringField_2 = readJsonStringField(text, SCHEDULED_TASK_ID_FIELD_MARKER, 0, len);
    if (jsonStringField_2 !== undefined) {
      let lastIndex = loopQueue.findLastIndex((entry) => entry.taskId === jsonStringField_2);
      if (lastIndex < 0) return;
      let entry = loopQueue[lastIndex];
      loopQueue = loopQueue.filter((entry) => entry.taskId !== jsonStringField_2);
      return entry;
    }
    if (!(
      indexOfBytes(text, ORIGIN_FIELD_MARKER, 0, len) < 0 &&
      (indexOfBytes(text, META_RECORD_MARKER, 0, len) >= 0 ||
        containsAnyMarker(text, COMMAND_MESSAGE_MARKERS, len))
    )) {
      loopQueue = loopQueue.filter((entry) => entry.taskId !== undefined);
      return;
    }
    if (loopQueue[0]?.taskId === undefined) return loopQueue.shift();
    return;
  };
  let isToolLine = (text, len) =>
    indexOfBytes(text, META_RECORD_MARKER, 0, len) >= 0 &&
    (flattened.some((marker) => indexOfBytes(text, marker, 0, len) >= 0) ||
      flattened_2.some((marker) => indexOfBytes(text, marker, 0, len) >= 0));
  return (text) => {
    let len = text.length;
    if (indexOfBytes(text, ASSISTANT_RECORD_MARKER, 0, len) >= 0) {
      let record = parseUsageRecord(text, 0, len, isWorkflow);
      sawUsage = true;
      currentFire = undefined;
      if (record) {
        trackContextGrowth(tracker, record);
        let previous = lastBySubagent.get(record.isSubagent);
        if (
          previous?.cached === record.cached &&
          previous.cacheCreate === record.cacheCreate &&
          previous.uncached === record.uncached
        )
          record.recached = previous.recached;
        else if (previous)
          record.recached = Math.min(
            record.cacheCreate,
            Math.max(0, previous.cached + previous.cacheCreate - record.cached),
          );
        lastBySubagent.set(record.isSubagent, record);
      }
      if (record && record.ts >= sinceTs) {
        if (fireDepth > 1 && activeFires.length > 0) {
          let share = 1 / fireDepth;
          record.loopShares = activeFires.map((fire) => ({
            ...fire,
            share,
          }));
        } else if (activeFires[0]) {
          record.loop = activeFires[0].loop;
          record.loopFireTs = activeFires[0].fireTs;
        }
        sink.records.push(record);
      }
      return;
    }
    if (indexOfBytes(text, USER_RECORD_MARKER, 0, len) >= 0) {
      let promptStart = indexOfBytes(text, TOOL_RESULT_RECORD_MARKER, 0, len);
      if (promptStart < 0) addFirstPromptBytes(tracker, len);
      else if (isLargeToolResultBytes(len - promptStart)) {
        let resultEnd = indexOfBytes(text, TOOL_USE_RESULT_FIELD_MARKER, promptStart, len);
        addLargeToolResultBytes(tracker, (resultEnd < 0 ? len : resultEnd) - promptStart);
      }
      if (
        promptStart >= 0 ||
        indexOfBytes(text, TURN_COMPANION_MARKER, 0, len) >= 0 ||
        indexOfBytes(text, COMPACT_SUMMARY_MARKER, 0, len) >= 0 ||
        containsAnyMarker(text, BASH_OUTPUT_MARKERS, len) ||
        hasNumericTurnField(text, len) ||
        isToolLine(text, len)
      )
        return;
      if (indexOfBytes(text, INTERRUPT_TEXT_MARKER, 0, len) >= 0) {
        endFire();
        return;
      }
      let hasKMarker = indexOfBytes(text, META_RECORD_MARKER, 0, len) >= 0;
      if (hasKMarker && containsAnyMarker(text, HOOK_STOPPED_MARKERS, len)) {
        popFire();
        if (fireDepth === 0) endFire();
        return;
      }
      if (containsAnyMarker(text, LOCAL_COMMAND_OUTPUT_MARKERS, len)) {
        onCommandRecord();
        return;
      }
      let hasCommandMarker = containsAnyMarker(text, COMMAND_MESSAGE_MARKERS, len);
      if (
        containsAnyMarker(text, LOCAL_COMMAND_CAVEAT_MARKERS, len) ||
        (hasKMarker &&
          !hasCommandMarker &&
          indexOfBytes(text, PROMPT_SOURCE_FIELD_MARKER, 0, len) < 0 &&
          indexOfBytes(text, SCHEDULED_TASK_ID_FIELD_MARKER, 0, len) < 0)
      )
        return;
      let toolLine =
        indexOfBytes(text, HUMAN_ORIGIN_MARKER, 0, len) >= 0 ||
        (!hasKMarker && !hasCommandMarker && indexOfBytes(text, SCHEDULED_TASK_ID_FIELD_MARKER, 0, len) < 0);
      let taken = takeLoopRecord(text, len);
      if (taken?.openBatch === phaseSeq && !sawUsage && fireDepth > 0) endFire();
      if (sawUsage || toolLine) startFire();
      fireDepth++;
      currentFire = {
        fire: taken,
        run: false,
        isCommandRecord: hasCommandMarker,
      };
      if (!taken) {
        pendingReuse = undefined;
        return;
      }
      let loopRecord = taken.loop ?? parseLoopRecord(text, len);
      if (!loopRecord) return;
      if (!loopRecord.isDynamic) pendingReuse = undefined;
      if (taken.ts < sinceTs) return;
      sink.fires.push({
        ts: taken.ts,
        uuid: taken.uuid,
        loop: loopRecord,
      });
      activeFires.push({
        loop: loopRecord,
        fireTs: taken.ts,
      });
      currentFire.run = true;
      return;
    }
    if (containsAnyMarker(text, COMPACT_BOUNDARY_BYTES, len)) {
      lastBySubagent.clear();
      return;
    }
    if (tracker.lastRequest === undefined && indexOfBytes(text, FILE_ATTACHMENT_MARKER, 0, len) >= 0) {
      addFirstPromptBytes(tracker, len);
      return;
    }
    if (
      indexOfBytes(text, SYSTEM_RECORD_MARKER, 0, len) >= 0 &&
      indexOfBytes(text, LOCAL_COMMAND_MARKER, 0, len) >= 0 &&
      containsAnyMarker(text, LOCAL_COMMAND_OUTPUT_MARKERS, len)
    ) {
      onCommandRecord();
      return;
    }
    if (
      indexOfBytes(text, ATTACHMENT_RECORD_MARKER, 0, len) >= 0 &&
      indexOfBytes(text, QUEUED_COMMAND_RECORD_MARKER, 0, len) >= 0
    ) {
      endFire();
      return;
    }
    if (indexOfBytes(text, SCHEDULED_FIRE_MARKER, 0, len) >= 0) {
      let jsonStringField = readJsonStringField(text, TIMESTAMP_FIELD_MARKER, 0, len);
      let ts = jsonStringField ? Date.parse(jsonStringField) : NaN;
      if (Number.isNaN(ts)) return;
      let jsonStringFieldBounded = readJsonStringFieldBounded(
        text,
        PROMPT_FIELD_MARKER,
        0,
        len,
        MAX_COMMAND_NAME_BOUND,
      );
      let boundedField = jsonStringFieldBounded
        ? clippedMessage(jsonStringFieldBounded, MAX_COMMAND_NAME_CHARS)
        : undefined;
      let isDynamic = indexOfBytes(text, LOOP_TASK_KIND_MARKER, 0, len) >= 0;
      if (boundedField && isDynamic) {
        pendingReuse ??= boundedField;
        boundedField = pendingReuse;
      }
      loopQueue.push({
        ts,
        openBatch: fireDepth > 0 && !sawUsage ? phaseSeq : undefined,
        uuid: readJsonStringField(text, UUID_FIELD_MARKER, 0, len) ?? "",
        taskId: readJsonStringField(text, TASK_ID_FIELD_MARKER, 0, len),
        loop: boundedField
          ? {
              prompt: boundedField,
              cron: normalizeCronExpression(
                readJsonStringFieldBounded(text, CRON_FIELD_MARKER, 0, len, MAX_CRON_FIELD_BOUND),
              ),
              isDynamic,
            }
          : null,
      });
    }
  };
}
//@ chunk-xefjhmwx.js:13867-14003 placement
function hasNumericTurnField(text, length) {
  let markerIndex = indexOfBytes(text, CONTENT_ARRAY_MARKER, 0, length);
  if (markerIndex < 0) return false;
  let cursor = markerIndex + CONTENT_ARRAY_MARKER.length;
  let digitsStart = cursor;
  while (cursor < length && text[cursor] >= DIGIT_ZERO_BYTE && text[cursor] <= DIGIT_NINE_BYTE) cursor++;
  return cursor > digitsStart && indexOfBytes(text, LOOP_WAKEUP_SUFFIX_MARKER, cursor, length) === cursor;
}
//@ chunk-xefjhmwx.js:14003-14021 placement
var MAX_CRON_FIELD_CHARS = 64;
var MAX_CRON_FIELD_BOUND = 6 * MAX_CRON_FIELD_CHARS;
//@ chunk-xefjhmwx.js:14021-14070 placement
function normalizeCronExpression(jsonStringFieldBounded) {
  return jsonStringFieldBounded === undefined
    ? undefined
    : clippedMessage(jsonStringFieldBounded, MAX_CRON_FIELD_CHARS);
}
//@ chunk-xefjhmwx.js:14070-14230 placement
function parseLoopRecord(text, length) {
  let rawPrompt =
    readJsonStringFieldBounded(text, CONTENT_FIELD_MARKER, 0, length, MAX_COMMAND_NAME_BOUND) ??
    readJsonStringFieldBounded(text, TEXT_FIELD_MARKER, 0, length, MAX_COMMAND_NAME_BOUND);
  if (!rawPrompt) return null;
  let commandName = rawPrompt.match(COMMAND_NAME_REGEX)?.[1];
  let prompt = clippedMessage(commandName ?? rawPrompt, MAX_COMMAND_NAME_CHARS);
  return prompt
    ? {
        prompt,
        cron: undefined,
        isDynamic: false,
      }
    : null;
}
//@ chunk-xefjhmwx.js:14230-14934 placement
/**
 * 从转录行字节中解析用量记录：时间戳、会话、各类 token、是否子代理/最大 effort/工作流、模型档位、uuid 及归属（代理、技能、插件、MCP 服务器）。
 */
function parseUsageRecord(text, start, length, isWorkflow) {
  if (indexOfBytes(text, ASSISTANT_RECORD_MARKER, start, length) < 0) return;
  if (indexOfBytes(text, USAGE_FIELD_MARKER, start, length) < 0) return;
  let timestamp = readJsonStringField(text, TIMESTAMP_FIELD_MARKER, start, length);
  let sessionId = readJsonStringField(text, SESSION_ID_FIELD_MARKER, start, length);
  if (!timestamp || !sessionId) return;
  let timestamp_2 = Date.parse(timestamp);
  if (Number.isNaN(timestamp_2)) return;
  let uncached = readJsonIntField(text, INPUT_TOKENS_FIELD_MARKER, start, length);
  let output = readJsonIntField(text, OUTPUT_TOKENS_FIELD_MARKER, start, length);
  let cacheCreate = readJsonIntField(text, CACHE_CREATION_TOKENS_FIELD_MARKER, start, length);
  let cached = readJsonIntField(text, CACHE_READ_TOKENS_FIELD_MARKER, start, length);
  if (uncached + output + cacheCreate + cached === 0) return;
  let hasAttribution = indexOfBytes(text, ATTRIBUTION_MARKER, start, length) >= 0;
  let model = readJsonStringField(text, MODEL_FIELD_MARKER, start, length);
  return {
    ts: timestamp_2,
    sessionId,
    cached,
    cacheCreate,
    recached: 0,
    uncached,
    output,
    isSubagent:
      indexOfBytes(text, SIDECHAIN_TIGHT_MARKER, start, length) >= 0 ||
      indexOfBytes(text, SIDECHAIN_SPACED_MARKER, start, length) >= 0,
    isMaxEffort: isTrailingFieldOf(text.subarray(start, length), MAX_EFFORT_MARKER),
    isWorkflow,
    alwaysOnTokens: 0,
    largeToolResultTokens: 0,
    modelTier: getModelCostWeight(model),
    model,
    uuid:
      readJsonStringField(text, REQUEST_ID_FIELD_MARKER, start, length) ??
      findCommandField(text, start, length) ??
      readJsonStringField(text, UUID_FIELD_MARKER, start, length) ??
      "",
    ...(hasAttribution && {
      attributionAgent: readJsonStringField(text, ATTRIBUTION_AGENT_FIELD_MARKER, start, length),
      attributionSkill: readJsonStringField(text, ATTRIBUTION_SKILL_FIELD_MARKER, start, length),
      attributionPlugin: readJsonStringField(text, ATTRIBUTION_PLUGIN_FIELD_MARKER, start, length),
      attributionMcpServer: readJsonStringField(text, ATTRIBUTION_MCP_SERVER_FIELD_MARKER, start, length),
    }),
  };
}
//@ chunk-xefjhmwx.js:14934-15251 placement
/**
 * 判断文本末尾的闭合括号是否正好闭合某个字段的值（跳过字符串与转义，配对括号）。
 */
function isTrailingFieldOf(buffer, marker) {
  let index = buffer.lastIndexOf(CLOSE_BRACE_BYTE);
  for (
    let index_2 = buffer.lastIndexOf(marker);
    index_2 >= 0;
    index_2 = index_2 === 0 ? -1 : buffer.lastIndexOf(marker, index_2 - 1)
  ) {
    let depth = 1;
    let isInString = false;
    let cursor = index_2 + marker.length;
    for (; cursor < buffer.length && depth > 0; cursor++) {
      let byte = buffer[cursor];
      if (isInString) {
        if (byte === BACKSLASH_BYTE) cursor++;
        else if (byte === QUOTE_BYTE) isInString = false;
      } else if (byte === QUOTE_BYTE) isInString = true;
      else if (byte === OPEN_BRACE_BYTE || byte === OPEN_BRACKET_BYTE) depth++;
      else if (byte === CLOSE_BRACE_BYTE || byte === CLOSE_BRACKET_BYTE) depth--;
    }
    if (depth === 0 && cursor - 1 === index) return true;
  }
  return false;
}
//@ chunk-xefjhmwx.js:15251-15618 placement
/**
 * 创建用量聚合对象：总成本与请求数、各类附加成本计数，以及按会话、时间桶、代理、技能、插件、MCP 服务器与循环的映射。
 */
function createUsageAggregate() {
  return {
    totalCost: 0,
    requestCount: 0,
    cacheMissCost: 0,
    cacheMissCount: 0,
    longCtxCost: 0,
    longCtxCount: 0,
    maxEffortCost: 0,
    maxEffortCount: 0,
    workflowCost: 0,
    workflowCount: 0,
    alwaysOnCost: 0,
    alwaysOnCount: 0,
    largeToolResultCost: 0,
    largeToolResultCount: 0,
    sessions: new Map(),
    buckets: new Map(),
    byAgent: new Map(),
    bySkill: new Map(),
    byPlugin: new Map(),
    byMcpServer: new Map(),
    loops: new Map(),
  };
}
//@ chunk-xefjhmwx.js:15618-15784 placement
function getLoopEntry(aggregate, loop) {
  let entry = aggregate.loops.get(loop.prompt);
  if (!entry) {
    entry = {
      prompt: loop.prompt,
      cron: loop.cron,
      isDynamic: loop.isDynamic,
      runs: 0,
      tokens: 0,
      lastRunMs: 0,
    };
    aggregate.loops.set(loop.prompt, entry);
  }
  return entry;
}
//@ chunk-xefjhmwx.js:15784-15923 placement
function recordLoopRun(aggregate, fire) {
  let loopEntry = getLoopEntry(aggregate, fire.loop);
  loopEntry.runs++;
  if (fire.ts >= loopEntry.lastRunMs) {
    loopEntry.lastRunMs = fire.ts;
    loopEntry.cron = fire.loop.cron ?? loopEntry.cron;
    loopEntry.isDynamic = fire.loop.isDynamic;
  }
}
//@ chunk-xefjhmwx.js:15923-15971 placement
/**
 * 把一次请求的费用按名字累加到占比统计里。
 */
function addToShare(target, name, tokens) {
  if (name) target.set(name, (target.get(name) ?? 0) + tokens);
}
//@ chunk-xefjhmwx.js:15971-17303 placement
function aggregateUsageByBehavior(aggregate, record, sinceTs = -1 / 0) {
  let cost = costWeightedTokens(record);
  aggregate.totalCost += cost;
  aggregate.requestCount++;
  if (record.attributionAgent)
    addToShare(aggregate.byAgent, record.attributionSkill ?? record.attributionAgent, cost);
  else addToShare(aggregate.bySkill, record.attributionSkill, cost);
  addToShare(aggregate.byPlugin, record.attributionPlugin, cost);
  addToShare(aggregate.byMcpServer, record.attributionMcpServer, cost);
  if (record.loop || record.loopShares) {
    let inputTokens = record.cached + record.cacheCreate + record.uncached + record.output;
    for (let { loop, fireTs, share } of record.loopShares ?? [
      {
        loop: record.loop,
        fireTs: record.loopFireTs ?? record.ts,
        share: 1,
      },
    ])
      if (fireTs >= sinceTs) getLoopEntry(aggregate, loop).tokens += inputTokens * share;
  }
  let contextTokens = record.cached + record.cacheCreate + record.uncached;
  if (record.uncached + record.recached > CACHE_MISS_TOKEN_THRESHOLD) {
    aggregate.cacheMissCost += cost;
    aggregate.cacheMissCount++;
  }
  if (contextTokens > LONG_CONTEXT_THRESHOLD) {
    aggregate.longCtxCost += cost;
    aggregate.longCtxCount++;
  }
  if (record.isMaxEffort) {
    aggregate.maxEffortCost += cost;
    aggregate.maxEffortCount++;
  }
  if (record.isWorkflow) {
    aggregate.workflowCost += cost;
    aggregate.workflowCount++;
  }
  let contextCost = cost - record.output * 50 * record.modelTier;
  if (record.alwaysOnTokens > 0) {
    aggregate.alwaysOnCost += contextCost * Math.min(1, record.alwaysOnTokens / contextTokens);
    aggregate.alwaysOnCount++;
  }
  if (record.largeToolResultTokens > 0) {
    aggregate.largeToolResultCost += contextCost * Math.min(1, record.largeToolResultTokens / contextTokens);
    aggregate.largeToolResultCount++;
  }
  let session = aggregate.sessions.get(record.sessionId);
  if (!session) {
    session = {
      cost: 0,
      requests: 0,
      subCost: 0,
      subCount: 0,
      hours: new Set(),
    };
    aggregate.sessions.set(record.sessionId, session);
  }
  session.cost += cost;
  session.requests++;
  if (record.isSubagent) {
    session.subCost += cost;
    session.subCount++;
  }
  session.hours.add(Math.floor(record.ts / 3600000));
  let floored = Math.floor(record.ts / PARALLEL_BUCKET_MS);
  let bucket = aggregate.buckets.get(floored);
  if (!bucket) {
    bucket = {
      sids: new Set(),
      cost: 0,
      count: 0,
    };
    aggregate.buckets.set(floored, bucket);
  }
  bucket.sids.add(record.sessionId);
  bucket.cost += cost;
  bucket.count++;
}
//@ chunk-xefjhmwx.js:17303-18479 placement
function usageBuckets(usageAggregate) {
  let cost = 0;
  let count = 0;
  let peakParallel = 0;
  for (let bucket of usageAggregate.buckets.values()) {
    peakParallel = Math.max(peakParallel, bucket.sids.size);
    if (bucket.sids.size >= HIGH_PARALLEL_SESSIONS) {
      cost += bucket.cost;
      count += bucket.count;
    }
  }
  let cost_2 = 0;
  let subagentSessionCount = 0;
  let cost_3 = 0;
  let cronSessionCount = 0;
  for (let session of usageAggregate.sessions.values()) {
    if (
      session.subCount >= SUBAGENT_HEAVY_COUNT ||
      (session.cost > 0 && session.subCost / session.cost > SUBAGENT_HEAVY_COST_RATIO)
    ) {
      cost_2 += session.cost;
      subagentSessionCount++;
    }
    if (session.hours.size >= CRON_SESSION_HOURS) {
      cost_3 += session.cost;
      cronSessionCount++;
    }
  }
  let behaviors = [
    {
      key: "cache_miss",
      cost: usageAggregate.cacheMissCost,
      count: usageAggregate.cacheMissCount,
    },
    {
      key: "long_context",
      cost: usageAggregate.longCtxCost,
      count: usageAggregate.longCtxCount,
    },
    {
      key: "subagent_heavy",
      cost: cost_2,
      count: subagentSessionCount,
    },
    {
      key: "high_parallel",
      cost,
      count,
    },
    {
      key: "cron",
      cost: cost_3,
      count: cronSessionCount,
    },
    {
      key: "max_effort",
      cost: usageAggregate.maxEffortCost,
      count: usageAggregate.maxEffortCount,
    },
    {
      key: "workflow",
      cost: usageAggregate.workflowCost,
      count: usageAggregate.workflowCount,
    },
    {
      key: "always_on_context",
      cost: usageAggregate.alwaysOnCost,
      count: usageAggregate.alwaysOnCount,
    },
    {
      key: "large_tool_results",
      cost: usageAggregate.largeToolResultCost,
      count: usageAggregate.largeToolResultCount,
    },
  ];
  behaviors.sort((left, right) => right.cost - left.cost);
  return {
    totalCost: usageAggregate.totalCost,
    requestCount: usageAggregate.requestCount,
    sessionCount: usageAggregate.sessions.size,
    behaviors,
    agents: rankShares(usageAggregate.byAgent, usageAggregate.totalCost),
    skills: rankShares(usageAggregate.bySkill, usageAggregate.totalCost),
    plugins: rankShares(usageAggregate.byPlugin, usageAggregate.totalCost),
    mcpServers: rankShares(usageAggregate.byMcpServer, usageAggregate.totalCost),
    loops: [...usageAggregate.loops.values()]
      .map((loop) => ({
        ...loop,
        tokens: Math.round(loop.tokens),
      }))
      .sort((left, right) => right.tokens - left.tokens),
    peakParallel,
  };
}
//@ chunk-xefjhmwx.js:18479-18641 placement
function rankShares(shares, totalCost) {
  if (shares.size === 0 || totalCost === 0) return [];
  return [...shares.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([name, tokens]) => ({
      name,
      pct: Math.round((tokens / totalCost) * 100),
    }))
    .filter((share) => share.pct > 0);
}
export {
  isUsageScanAllowed,
  isSkillDoctorScanAllowed,
  aggregateRecentUsage,
  isStatsScanAllowed,
  readJsonStringField,
  indexOfBytes,
  ASSISTANT_RECORD_MARKER,
  readJsonStringFieldBounded,
  isLargeToolResultBytes,
  USER_RECORD_MARKER,
  TOOL_RESULT_RECORD_MARKER,
  TOOL_USE_RESULT_FIELD_MARKER,
  USD_PER_MTOK_SCALE,
  costWeightedTokens,
  ID_FIELD_MARKER,
  aggregateRecentUsage_2,
};
