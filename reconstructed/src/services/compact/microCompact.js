/**
 * services/compact/microCompact.ts
 *
 * 工具结果清理（microcompact）：keep-recent 型本地清理（替换为 "[Old tool result content cleared]"）、空闲返回后的服务端 clear_tool_uses 规划与上报估算。另混入若干无关声明（日期解析、MCP 服务器说明），见过程文档。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/compact/microCompact.ts
 * pieces: chunk-e6aww6q8.js (1), chunk-g54kbxqw.js (23)
 * attribution: fingerprint 3, placement 11, callgraph-fingerprint 1, layout 8, affinity 1
 */
import {
  microCompactFlagStore,
  SHELL_TOOL_NAMES,
  notePendingConversationEdit,
} from "../../utils/shell/shellToolUtils.js";
import { ARTIFACT_CONTENT_AUTHORED_TAG_LEAD, ARTIFACT_CONTENT_AUTHORED_TAG } from "../../constants/xml.js";
import { isObjectBlock } from "../../utils/toolResultStorage.js";
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";
import { GREP_TOOL_NAME } from "../../tools/GrepTool/prompt.js";
import { GLOB_TOOL_NAME } from "../../tools/GlobTool/prompt.js";
import { WEBSEARCH } from "../../tools/WebSearchTool/prompt.js";
import { WEBFETCH } from "../../tools/WebFetchTool/prompt.js";
import { FILE_EDIT_TOOL_NAME } from "../../tools/FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import {
  roughTokenCountEstimation,
  roughTokenCountEstimationForBlock,
  roughTokenCountEstimationForContent,
} from "../tokenEstimation.js";
import { classifyQuerySource, isAutoModeQuerySource } from "../api/requestHeaders.js";
import { logEvent } from "../analytics/index.js";
import { lit, fromEnumOpt } from "../analytics/safeMetadata.js";
import { logFeatureOk } from "../analytics/featureTelemetry.js";
import { logForDebugging } from "../../utils/debug.js";
import { suppressCompactWarning } from "./compactWarningState.js";
import { notifyCacheDeletion, getTrackingKey } from "../api/promptCacheBreakDetection.js";
import { GET_TASK_TOOL_TEXT } from "../../remote/tools/nativeToolErrors.js";
import { POLL } from "../../tools/PollTool/prompt.js";
import { SessionRootSlot, isNonConversationMessage } from "../../bootstrap/sessionSlices.js";
import { getRootSession } from "../../bootstrap/state.js";
import {
  idleClearingMode,
  hasAppliedContextEdits,
  supportsContextEditing,
  messagesSince,
  decideIdleClearing,
  logIdleClearingFailure,
  isNewIdlePeriod,
  clearableMessageKind,
  isUserContentMessage,
  hasClearedMarker,
  estimateLargeContentTokens,
} from "./idleToolResultClearing.js";
import { trackedProjectReads } from "../../tools/ProjectsTool/readTracking.js";
import { PROJECTS_TOOL_NAME } from "../../tools/ProjectsTool/prompt.js";
import {
  isToolUseStop,
  totalTokensOf,
  isNonNegativeNumber,
} from "../../utils/messages/usageAndStopReason.js";
import { canonicalToolName } from "../../utils/permissions/permissionRuleParser.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { imageTileCount, PDF_TILE_WIDTH, PDF_TILE_HEIGHT } from "../../utils/mediaLimits.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-g54kbxqw.js:146530-146567 placement
function clearMicroCompactFlag() {
  microCompactFlagStore().setState(() => false);
}
//@ chunk-g54kbxqw.js:146567-146605 placement
function getMicroCompactFlag() {
  return microCompactFlagStore().getState();
}
//@ chunk-g54kbxqw.js:146605-146646 placement
function onMicroCompactFlag(listener) {
  return microCompactFlagStore().subscribe(listener);
}
//@ chunk-g54kbxqw.js:146646-146720 placement
/**
 * 持久化工具结果的标记前缀。
 */
var CLEARED_TOOL_RESULT_TEXT = "[Old tool result content cleared]";
var PERSISTED_OUTPUT_TAG = "<persisted-output>";
var PERSISTED_OUTPUT_PREFIX = ARTIFACT_CONTENT_AUTHORED_TAG_LEAD;
//@ chunk-g54kbxqw.js:146720-146902 placement
/**
 * 内容中是否已有清理标记。
 */
function containsClearedMarker(content) {
  if (typeof content === "string") return content.includes(ARTIFACT_CONTENT_AUTHORED_TAG);
  return (
    Array.isArray(content) &&
    content.some(
      (block) =>
        isObjectBlock(block) &&
        block.type === "text" &&
        "text" in block &&
        typeof block.text === "string" &&
        block.text.includes(ARTIFACT_CONTENT_AUTHORED_TAG),
    )
  );
}
//@ chunk-g54kbxqw.js:146902-146965 placement
/**
 * 可被微压缩清理的工具名单（读、shell、grep、glob、搜索、编辑、写）。
 */
var MICROCOMPACT_LIMITS; // deferred: uses SHELL_TOOL_NAMES (../../utils/shell/shellToolUtils.js) of its import cycle while loading; runs once the cycle is complete
var IMAGE_RESULT_TOKENS;
var CLEARABLE_TOOL_NAMES;
deferInit("chunk-g54kbxqw.js:146902", () => {
  MICROCOMPACT_LIMITS = 20000;
  IMAGE_RESULT_TOKENS = 2000;
  CLEARABLE_TOOL_NAMES = new Set([
    FILE_READ_TOOL_NAME,
    ...SHELL_TOOL_NAMES,
    GREP_TOOL_NAME,
    GLOB_TOOL_NAME,
    WEBSEARCH,
    WEBFETCH,
    FILE_EDIT_TOOL_NAME,
    FILE_WRITE_TOOL_NAME,
  ]);
});
//@ chunk-g54kbxqw.js:146965-147371 callgraph-fingerprint = calculateToolResultTokens (0.748)
/**
 * 估算 tool_result 的 token：文本按字符粗估，图片固定 2000，文档/搜索结果按块估算。
 */
function calculateToolResultTokens(block) {
  if (!block.content) return 0;
  if (typeof block.content === "string") return roughTokenCountEstimation(block.content);
  if (!Array.isArray(block.content)) return 0;
  return block.content.reduce((sum, item) => {
    if (typeof item === "string") return sum + roughTokenCountEstimation(item);
    if (!isObjectBlock(item)) return sum;
    if (item.type === "text") return sum + roughTokenCountEstimation(item.text);
    else if (item.type === "image") return sum + IMAGE_RESULT_TOKENS;
    else if (item.type === "document") return sum + roughTokenCountEstimationForBlock(item);
    else if (item.type === "search_result") return sum + roughTokenCountEstimationForContent(item.content);
    return sum;
  }, 0);
}
//@ chunk-g54kbxqw.js:147371-147568 placement = countToolCallsSince (1)
function countToolCallsSince(messages) {
  let ids = [];
  for (let message of messages)
    if (message.type === "assistant" && Array.isArray(message.message.content)) {
      for (let block of message.message.content)
        if (isObjectBlock(block) && block.type === "tool_use" && CLEARABLE_TOOL_NAMES.has(block.name))
          ids.push(block.id);
    }
  return ids;
}
//@ chunk-g54kbxqw.js:147568-147840 placement = hasMemoryFileRead (1)
function hasMemoryFileRead(messages, toolUseIds) {
  let paths = [];
  for (let message of messages) {
    if (message.type !== "assistant" || !Array.isArray(message.message.content)) continue;
    for (let block of message.message.content)
      if (
        isObjectBlock(block) &&
        block.type === "tool_use" &&
        block.name === FILE_READ_TOOL_NAME &&
        toolUseIds.has(block.id)
      ) {
        let input = (block.input ?? {}).file_path;
        if (typeof input === "string") paths.push(input);
      }
  }
  return paths;
}
//@ chunk-g54kbxqw.js:147840-147963 placement
/**
 * 文本是否为已清理的工具结果占位。
 */
function isClearedResultText(content) {
  if (typeof content !== "string") return false;
  let rest = content.startsWith(PERSISTED_OUTPUT_PREFIX)
    ? content.slice(PERSISTED_OUTPUT_PREFIX.length)
    : content;
  return rest === CLEARED_TOOL_RESULT_TEXT || rest.startsWith(PERSISTED_OUTPUT_TAG);
}
//@ chunk-g54kbxqw.js:147963-148408 placement
function selectClearableToolUses(messages, keepRecent) {
  let allIds = countToolCallsSince(messages);
  let max = Math.max(1, keepRecent);
  let keepSet = new Set(allIds.slice(-max));
  let clearSet = new Set(allIds.filter((id) => !keepSet.has(id)));
  if (clearSet.size === 0)
    return {
      clearSet,
      keepSet,
      tokensSaved: 0,
      candidates: [],
    };
  let tokensSaved = 0;
  let candidates = [];
  for (let message of messages) {
    if (message.type !== "user" || !Array.isArray(message.message.content)) continue;
    for (let block of message.message.content)
      if (
        isObjectBlock(block) &&
        block.type === "tool_result" &&
        clearSet.has(block.tool_use_id) &&
        !isClearedResultText(block.content)
      ) {
        tokensSaved += calculateToolResultTokens(block);
        candidates.push(block);
      }
  }
  return {
    clearSet,
    keepSet,
    tokensSaved,
    candidates,
  };
}
//@ chunk-g54kbxqw.js:148408-148938 placement = isMedia (1)
/**
 * 把指定 tool_use_id 的 tool_result 内容替换成清理文本（hint_clears 用）。
 */
function replaceToolResultContent(messages, clearSet, replacements) {
  if (clearSet.size === 0) return [...messages];
  return messages.map((message) => {
    if (message.type !== "user" || !Array.isArray(message.message.content)) return message;
    let changed = false;
    let content = message.message.content.map((block) => {
      if (!isObjectBlock(block) || block.type !== "tool_result" || !clearSet.has(block.tool_use_id))
        return block;
      let hasMedia =
        Array.isArray(block.content) &&
        block.content.some(
          (inner) => isObjectBlock(inner) && (inner.type === "image" || inner.type === "document"),
        );
      let replacement = hasMedia
        ? CLEARED_TOOL_RESULT_TEXT
        : (replacements?.get(block.tool_use_id) ?? CLEARED_TOOL_RESULT_TEXT);
      let nextContent =
        !hasMedia && !replacement.startsWith(PERSISTED_OUTPUT_PREFIX) && containsClearedMarker(block.content)
          ? `${PERSISTED_OUTPUT_PREFIX}${replacement}`
          : replacement;
      if (block.content === nextContent) return block;
      changed = true;
      return {
        ...block,
        content: nextContent,
      };
    });
    return changed
      ? {
          ...message,
          message: {
            ...message.message,
            content,
          },
        }
      : message;
  });
}
//@ chunk-g54kbxqw.js:148938-149648 fingerprint = maybeTimeBasedMicrocompact (0.588)
/**
 * keep-recent 型 microcompact（context_hint 触发）：保留最近 N 个可清理工具结果，节省 ≥20000 token 时把其余结果替换为清理文本（可先持久化原文），记 tengu_time_based_microcompact，并抑制压缩警告、通知缓存删除。
 */
async function maybeTimeBasedMicrocompact(messages, querySource, options) {
  let { keepSet, tokensSaved, candidates } = selectClearableToolUses(messages, options.keepRecent);
  if (tokensSaved < MICROCOMPACT_LIMITS) return null;
  let keepSet_2 = new Set(candidates.map((id) => id.tool_use_id));
  let clearedContent = new Map();
  for (let candidate of candidates) {
    let persisted = candidate.content
      ? await options.persist?.(candidate.content, candidate.tool_use_id)
      : null;
    clearedContent.set(candidate.tool_use_id, persisted ?? CLEARED_TOOL_RESULT_TEXT);
  }
  let messages_2 = replaceToolResultContent(messages, keepSet_2, clearedContent);
  if (querySource !== undefined && classifyQuerySource(querySource) === "main")
    notePendingConversationEdit("tool_result_clear");
  logEvent("tengu_time_based_microcompact", {
    toolsCleared: keepSet_2.size,
    toolsKept: keepSet.size,
    keepRecent: options.keepRecent,
    tokensSaved,
    trigger: lit("context_hint"),
  });
  logFeatureOk("compact_micro_keep_recent");
  logForDebugging(
    `[KEEP-RECENT MC] context_hint trigger, cleared ${keepSet_2.size} tool results (~${tokensSaved} tokens), kept last ${keepSet.size}`,
  );
  suppressCompactWarning();
  if (querySource) notifyCacheDeletion(querySource, options.agentId);
  return {
    messages: messages_2,
    tokensSaved,
    clearedIds: keepSet_2,
    clearedContent,
  };
}
//@ chunk-g54kbxqw.js:149648-149740 layout
/**
 * 3
 */
var TENGU_JIGGLY_BLOSSOM = "tengu_jiggly_blossom";
var SMALL_RESULT_BYTES = 64;
var BYTES_PER_TOKEN_ESTIMATE = 3;
var TOOL_NAME_RE = /^[a-zA-Z0-9_-]{1,128}$/;
var MCP_CONTAINER = "mcp__container__";
//@ chunk-g54kbxqw.js:149740-149818 layout
/**
 * 工具名（含 mcp__container__ 前缀）在可清理工具集合中（Read/Bash/Grep/WebFetch 等）。
 */
function isClearableToolName(name) {
  return (
    CLEARABLE_TOOL_NAMES.has(name) ||
    (name.startsWith(MCP_CONTAINER) && CLEARABLE_TOOL_NAMES.has(name.slice(MCP_CONTAINER.length)))
  );
}
//@ chunk-g54kbxqw.js:149818-150058 layout
/**
 * 空闲后清理配置：空闲 ≥3900 秒、保留 12 个工具调用、至少清 20000 token、触发阈值等。
 */
var ALWAYS_EXCLUDED_TOOLS; // deferred: uses MICROCOMPACT_LIMITS of its import cycle while loading; runs once the cycle is complete
var MAX_TRACKING_KEYS;
var IDLE_CLEAR_KEEP_TOOL_USES;
var IDLE_CLEARING_CONFIG;
var idleClearingStateSlot;
deferInit("chunk-g54kbxqw.js:149818", () => {
  ALWAYS_EXCLUDED_TOOLS = [GET_TASK_TOOL_TEXT, POLL];
  MAX_TRACKING_KEYS = 64;
  IDLE_CLEAR_KEEP_TOOL_USES = 12;
  IDLE_CLEARING_CONFIG = {
    minIdleSeconds: 3900,
    keepToolUses: IDLE_CLEAR_KEEP_TOOL_USES,
    clearAtLeastTokens: MICROCOMPACT_LIMITS,
    triggerToolUsesBelowCount: 3,
    minTriggerToolUses: IDLE_CLEAR_KEEP_TOOL_USES + 15,
  };
  idleClearingStateSlot = new SessionRootSlot(() => ({
    decidedIdles: new Map(),
    lastClearedByTrackingKey: new Map(),
    failuresLogged: new Set(),
  }));
});
//@ chunk-g54kbxqw.js:150058-150094 layout
/**
 * 取当前会话（默认全局 host）的空闲清理状态：已决定的空闲、按追踪键记录的上次清理、已记录的失败。
 */
function getIdleClearingState(session) {
  return idleClearingStateSlot.of(session ?? getRootSession());
}
//@ chunk-g54kbxqw.js:150094-150662 layout
/**
 * 用户空闲超过约 65 分钟（缓存已失效）返回后，规划服务端 clear_tool_uses_20250919 编辑（trigger/keep/clear_at_least/exclude_tools）；开关 tengu_jiggly_blossom（on/shadow/off）。queryModel 把它作为 context_management 的 toolClearing。
 */
function planToolResultClearingAfterIdle(
  messages,
  querySource,
  capabilities,
  toolUseState,
  thresholds,
  anchorUuid,
) {
  try {
    let rolloutMode = idleClearingMode();
    if (
      rolloutMode === "off" ||
      isAutoModeQuerySource(querySource) ||
      (rolloutMode === "unknown" && !messages.some(hasAppliedContextEdits))
    )
      return;
    if (!supportsContextEditing(capabilities)) return;
    let config = IDLE_CLEARING_CONFIG;
    let idleReturn = analyzeIdleReturn(
      messages,
      config,
      undefined,
      thresholds,
      classifyQuerySource(querySource) === "auxiliary"
        ? messagesSince(messages, anchorUuid).length
        : messages.length,
    );
    if (!idleReturn) return;
    if (
      idleReturn.repliesSinceIdle === 0 &&
      !decideIdleClearing(rolloutMode, querySource, toolUseState, idleReturn, config)
    )
      return;
    if (!isIdleClearingActive(rolloutMode, idleReturn)) return;
    return {
      returnAfterIdle: idleReturn,
      edit: {
        type: "clear_tool_uses_20250919",
        trigger: {
          type: "tool_uses",
          value: idleReturn.triggerToolUses,
        },
        keep: {
          type: "tool_uses",
          value: config.keepToolUses,
        },
        clear_at_least: {
          type: "input_tokens",
          value: config.clearAtLeastTokens,
        },
        exclude_tools: idleReturn.excludeTools,
      },
    };
  } catch (error) {
    logIdleClearingFailure(error, "bad", "planning_threw");
    return;
  }
}
//@ chunk-g54kbxqw.js:150662-150956 layout
/**
 * 空闲清理已生效（或将生效）时为真，供文件附件/记忆预取判断工具结果是否会被清除。
 */
function hasClearedToolResultsAfterIdle(messages, mainLoopModel, config, session) {
  try {
    let mode = idleClearingMode();
    if (mode === "off" || mode === "shadow" || (mode === "unknown" && !messages.some(hasAppliedContextEdits)))
      return false;
    if (!supportsContextEditing(mainLoopModel)) return false;
    let analysis = analyzeIdleReturn(messages, IDLE_CLEARING_CONFIG, config);
    if (!analysis || !isIdleClearingActive(mode, analysis)) return false;
    return !(
      analysis.repliesSinceIdle === 0 &&
      isNewIdlePeriod(getIdleClearingState(session).decidedIdles, analysis, IDLE_CLEARING_CONFIG) === false
    );
  } catch (error) {
    logIdleClearingFailure(error, "sad", "cleared_results_check_threw", session);
    return false;
  }
}
//@ chunk-g54kbxqw.js:150956-153418 layout
/**
 * 扫描消息找“空闲后返回”的位置，统计可清理工具调用及其 token、排除工具、自空闲以来的回复数与服务端已清数量，不满足阈值返回 undefined。
 */
function analyzeIdleReturn(messages, config, extraTimestamp, resolveAlias, endIndex = messages.length) {
  let idleMs = config.minIdleSeconds * 1000;
  let idleBoundary;
  let returnedAtMs = 0;
  let returnGapMs = 0;
  let lastKindMs;
  let batchCapable = false;
  for (let [index, message] of messages.entries()) {
    if (index >= endIndex) break;
    let kindMs = clearableMessageKind(message);
    if (kindMs === undefined) continue;
    if (
      batchCapable &&
      lastKindMs !== undefined &&
      kindMs - lastKindMs > idleMs &&
      isUserContentMessage(message)
    ) {
      idleBoundary = index;
      returnedAtMs = kindMs;
      returnGapMs = kindMs - lastKindMs;
    }
    if (message.type === "assistant") batchCapable = typeof message.apiBlockIndex === "number";
    lastKindMs = lastKindMs === undefined ? kindMs : Math.max(lastKindMs, kindMs);
  }
  let extraMs = extraTimestamp === undefined ? Number.NaN : Date.parse(extraTimestamp);
  if (batchCapable && lastKindMs !== undefined && extraMs - lastKindMs > idleMs) {
    idleBoundary = Math.min(messages.length, endIndex);
    returnedAtMs = extraMs;
    returnGapMs = extraMs - lastKindMs;
  }
  if (idleBoundary === undefined) return;
  let clearableIds = new Set();
  let toolNamesById = new Map();
  let excludeTools = new Set(ALWAYS_EXCLUDED_TOOLS);
  let alreadyCleared = new Set();
  let sizes = [];
  let repliedIds = new Set();
  let serverClearedSinceIdle = false;
  let clearedSinceIdle = 0;
  let serverClearedBeforeIdle = false;
  let contextTokensBeforeIdle;
  for (let [index, message] of messages.entries()) {
    if (
      message.type === "attachment" &&
      message.attachment.type === "project_doc_reads" &&
      (trackedProjectReads(message.attachment)?.length ?? 0) > 0
    )
      excludeTools.add(PROJECTS_TOOL_NAME);
    if (
      (message.type !== "assistant" && message.type !== "user") ||
      isNonConversationMessage(message) ||
      !Array.isArray(message.message.content)
    )
      continue;
    let batchPrefixes = [];
    if (message.type === "assistant") {
      for (let toolUse of message.batchToolUses ?? []) {
        batchPrefixes.push(`${toolUse.id}_`);
        if (typeof toolUse.name !== "string") continue;
        for (let toolName of [toolUse.name, resolveAlias?.(toolUse.name)])
          if (typeof toolName === "string" && TOOL_NAME_RE.test(toolName)) excludeTools.add(toolName);
      }
      if (index < endIndex && message.isUnmetered !== true && clearableMessageKind(message) !== undefined) {
        let hasToolUseStop =
          message.message.stop_reason !== null &&
          !(!message.message.context_management && isToolUseStop(messages, index));
        if (index < idleBoundary) {
          if (message.message.usage) {
            let totalTokens = totalTokensOf(message.message.usage);
            if (totalTokens > 0) contextTokensBeforeIdle = totalTokens;
          }
          if (hasToolUseStop) serverClearedBeforeIdle = hasAppliedContextEdits(message);
        } else if (hasToolUseStop) {
          repliedIds.add(message.message.id);
          serverClearedSinceIdle = hasAppliedContextEdits(message);
          clearedSinceIdle = 0;
          for (let appliedEdit of message.message.context_management?.applied_edits ?? [])
            if (
              appliedEdit?.type === "clear_tool_uses_20250919" &&
              isNonNegativeNumber(appliedEdit.cleared_tool_uses)
            )
              clearedSinceIdle += appliedEdit.cleared_tool_uses;
        }
      }
    }
    for (let block of message.message.content)
      if (block?.type === "tool_use" || block?.type === "server_tool_use" || block?.type === "mcp_tool_use") {
        if (typeof block.name !== "string" || batchPrefixes.some((prefix) => block.id.startsWith(prefix)))
          continue;
        let canonical = canonicalToolName(block.name);
        if (!isClearableToolName(canonical)) {
          for (let candidate of [block.name, canonical, resolveAlias?.(block.name)])
            if (
              typeof candidate === "string" &&
              !isClearableToolName(candidate) &&
              TOOL_NAME_RE.test(candidate)
            )
              excludeTools.add(candidate);
        } else if (block.type === "tool_use" && !toolNamesById.has(block.id)) {
          toolNamesById.set(block.id, canonical);
          if (index < idleBoundary) clearableIds.add(block.id);
        }
      } else if (block?.type === "tool_result") {
        let toolName = toolNamesById.get(block.tool_use_id);
        if (toolName === undefined) continue;
        if (hasClearedMarker(block.content)) alreadyCleared.add(toolName);
        if (index < idleBoundary && clearableIds.delete(block.tool_use_id)) {
          let tokens = estimateLargeContentTokens(block.content);
          if (tokens !== undefined)
            sizes.push({
              sentName: toolName,
              tokens,
            });
        }
      }
  }
  let mapped = sizes.filter((size) => !alreadyCleared.has(size.sentName)).map((size) => size.tokens);
  for (let toolName of alreadyCleared) excludeTools.add(toolName);
  let clearableCount = mapped.length;
  let triggerCount = clearableCount - config.triggerToolUsesBelowCount;
  if (triggerCount <= config.keepToolUses || triggerCount < config.minTriggerToolUses) return;
  let roughTokensToClear = 0;
  for (let size of mapped.slice(0, triggerCount + 1 - config.keepToolUses)) roughTokensToClear += size;
  return {
    returnedAtMs,
    idleStartedAtMs: returnedAtMs - returnGapMs,
    idleSeconds: Math.round(returnGapMs / 1000),
    clearableToolUses: clearableCount,
    triggerToolUses: triggerCount,
    roughTokensToClear,
    excludeTools: [...excludeTools].sort(),
    repliesSinceIdle: repliedIds.size,
    serverClearedSinceIdle,
    toolUsesClearedSinceIdle: clearedSinceIdle,
    serverClearedBeforeIdle,
    contextTokensBeforeIdle,
  };
}
//@ chunk-g54kbxqw.js:153418-154388 layout
/**
 * 读响应的 context_management.applied_edits，记录清掉的工具数并在变化时通知缓存删除、记遥测。
 */
function recordIdleClearingServerReport({ returnAfterIdle, contextManagement, usage, querySource, agentId }) {
  try {
    if (!returnAfterIdle) return;
    let trackingKey = getTrackingKey(querySource, agentId);
    if (trackingKey === null) return;
    let clearedToolUses = 0;
    let clearedInputTokens = 0;
    for (let appliedEdit of contextManagement?.applied_edits ?? [])
      if (appliedEdit.type === "clear_tool_uses_20250919") {
        clearedToolUses = isNonNegativeNumber(appliedEdit.cleared_tool_uses)
          ? appliedEdit.cleared_tool_uses
          : 0;
        clearedInputTokens = isNonNegativeNumber(appliedEdit.cleared_input_tokens)
          ? appliedEdit.cleared_input_tokens
          : 0;
      }
    let { lastClearedByTrackingKey } = getIdleClearingState();
    let previous = lastClearedByTrackingKey.get(trackingKey);
    if (!previous && lastClearedByTrackingKey.size >= MAX_TRACKING_KEYS) lastClearedByTrackingKey.clear();
    lastClearedByTrackingKey.set(trackingKey, {
      returnedAtMs: returnAfterIdle.returnedAtMs,
      clearedToolUses,
    });
    let firstAfterIdle = returnAfterIdle.repliesSinceIdle === 0;
    let changed =
      !firstAfterIdle &&
      previous?.returnedAtMs === returnAfterIdle.returnedAtMs &&
      previous.clearedToolUses !== clearedToolUses;
    if (changed) notifyCacheDeletion(querySource, agentId);
    if (changed || firstAfterIdle)
      logEvent("tengu_tool_result_clearing_after_idle_server_report", {
        cleared_tool_uses: clearedToolUses,
        cleared_input_tokens: clearedInputTokens,
        trigger_tool_uses: returnAfterIdle.triggerToolUses,
        is_first_request_after_idle: firstAfterIdle,
        replies_since_idle: returnAfterIdle.repliesSinceIdle,
        cache_creation_input_tokens: usage.cache_creation_input_tokens ?? 0,
        cache_read_input_tokens: usage.cache_read_input_tokens ?? 0,
        query_source_category: fromEnumOpt(classifyQuerySource(querySource)),
      });
  } catch (error) {
    logIdleClearingFailure(error, "sad", "reading_response_threw");
  }
}
//@ chunk-g54kbxqw.js:154388-155243 fingerprint = estimateMessageTokens (0.375)
/**
 * 根据 applied_edits 中清掉的工具结果，在 context_management 上补 client_estimated_cleared_input_tokens。旧版名 estimateMessageTokens 不准确。
 */
function addClientEstimatedClearedTokens(contextManagement, edit, messages) {
  try {
    if (!edit) return contextManagement;
    let budget = 0;
    for (let appliedEdit of contextManagement.applied_edits)
      if (appliedEdit.type === "clear_tool_uses_20250919")
        budget += isNonNegativeNumber(appliedEdit.cleared_tool_uses)
          ? appliedEdit.cleared_tool_uses
          : Number.POSITIVE_INFINITY;
    let excludeTools = new Set(edit.exclude_tools);
    let toolNamesById = new Map();
    let clientEstimatedClearedInputTokens = 0;
    let anyCleared = false;
    for (let message of messages) {
      if (typeof message.content === "string") continue;
      for (let block of message.content) {
        if (block.type === "tool_use") toolNamesById.set(block.id, block.name);
        if (block.type !== "tool_result" || budget <= 0) continue;
        let toolName = toolNamesById.get(block.tool_use_id);
        if (toolName === undefined || excludeTools.has(toolName)) continue;
        let textBytes = 0;
        let imageCount = 0;
        for (let part of typeof block.content === "string"
          ? [
              {
                type: "text",
                text: block.content,
              },
            ]
          : (block.content ?? [])) {
          if (part.type === "document") return contextManagement;
          if (part.type === "image") imageCount++;
          else textBytes += Buffer.byteLength(part.type === "text" ? part.text : jsonStringify(part));
        }
        clientEstimatedClearedInputTokens +=
          Math.ceil(textBytes / BYTES_PER_TOKEN_ESTIMATE) +
          imageCount * imageTileCount(PDF_TILE_WIDTH, PDF_TILE_HEIGHT);
        anyCleared = true;
        if (imageCount > 0 || textBytes > SMALL_RESULT_BYTES) budget--;
      }
    }
    if (!anyCleared) return contextManagement;
    return {
      ...contextManagement,
      client_estimated_cleared_input_tokens: clientEstimatedClearedInputTokens,
    };
  } catch (error) {
    logIdleClearingFailure(error, "sad", "estimating_cleared_threw");
    return contextManagement;
  }
}
//@ chunk-g54kbxqw.js:155243-155349 affinity
/**
 * 空闲清理是否生效：shadow 模式不生效；空闲后首个请求要求模式为 on，之后看服务端是否已清理过。
 */
function isIdleClearingActive(mode, analysis) {
  if (mode === "shadow") return false;
  return analysis.repliesSinceIdle === 0 ? mode === "on" : analysis.serverClearedSinceIdle;
}
//@ chunk-e6aww6q8.js:4906272-4906316 fingerprint = TIME_BASED_MC_CLEARED_MESSAGE (1)
/**
 * microcompact 清理后的替换文本 "[Old tool result content cleared]"。
 */
var TIME_BASED_MC_CLEARED_MESSAGE = "[Old tool result content cleared]";
export {
  TIME_BASED_MC_CLEARED_MESSAGE,
  onMicroCompactFlag,
  getMicroCompactFlag,
  replaceToolResultContent,
  planToolResultClearingAfterIdle,
  addClientEstimatedClearedTokens,
  recordIdleClearingServerReport,
  clearMicroCompactFlag,
  hasMemoryFileRead,
  hasClearedToolResultsAfterIdle,
  getIdleClearingState,
  MAX_TRACKING_KEYS,
  TENGU_JIGGLY_BLOSSOM,
  SMALL_RESULT_BYTES,
  maybeTimeBasedMicrocompact,
  selectClearableToolUses,
  MICROCOMPACT_LIMITS,
};
