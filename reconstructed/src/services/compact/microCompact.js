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
import { imageTileCount, PDF_TILE_WIDTH, PDF_TILE_HEIGHT } from "../../utils/truncateGraphemes.js";

//@ chunk-g54kbxqw.js:146530-146567 placement
function clearMicroCompactFlag() {
  microCompactFlagStore().setState(() => false);
}
//@ chunk-g54kbxqw.js:146567-146605 placement
function getMicroCompactFlag() {
  return microCompactFlagStore().getState();
}
//@ chunk-g54kbxqw.js:146605-146646 placement
function onMicroCompactFlag(e) {
  return microCompactFlagStore().subscribe(e);
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
      (n) =>
        isObjectBlock(n) &&
        n.type === "text" &&
        "text" in n &&
        typeof n.text === "string" &&
        n.text.includes(ARTIFACT_CONTENT_AUTHORED_TAG),
    )
  );
}
//@ chunk-g54kbxqw.js:146902-146965 placement
/**
 * 可被微压缩清理的工具名单（读、shell、grep、glob、搜索、编辑、写）。
 */
var MICROCOMPACT_LIMITS = 20000;
var IMAGE_RESULT_TOKENS = 2000;
var CLEARABLE_TOOL_NAMES = new Set([
  FILE_READ_TOOL_NAME,
  ...SHELL_TOOL_NAMES,
  GREP_TOOL_NAME,
  GLOB_TOOL_NAME,
  WEBSEARCH,
  WEBFETCH,
  FILE_EDIT_TOOL_NAME,
  FILE_WRITE_TOOL_NAME,
]);
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
function countToolCallsSince(e) {
  let n = [];
  for (let message of e)
    if (message.type === "assistant" && Array.isArray(message.message.content)) {
      for (let r of message.message.content)
        if (isObjectBlock(r) && r.type === "tool_use" && CLEARABLE_TOOL_NAMES.has(r.name)) n.push(r.id);
    }
  return n;
}
//@ chunk-g54kbxqw.js:147568-147840 placement = hasMemoryFileRead (1)
function hasMemoryFileRead(messages, n) {
  let s = [];
  for (let message of messages) {
    if (message.type !== "assistant" || !Array.isArray(message.message.content)) continue;
    for (let block of message.message.content)
      if (
        isObjectBlock(block) &&
        block.type === "tool_use" &&
        block.name === FILE_READ_TOOL_NAME &&
        n.has(block.id)
      ) {
        let input = (block.input ?? {}).file_path;
        if (typeof input === "string") s.push(input);
      }
  }
  return s;
}
//@ chunk-g54kbxqw.js:147840-147963 placement
/**
 * 文本是否为已清理的工具结果占位。
 */
function isClearedResultText(content) {
  if (typeof content !== "string") return false;
  let n = content.startsWith(PERSISTED_OUTPUT_PREFIX)
    ? content.slice(PERSISTED_OUTPUT_PREFIX.length)
    : content;
  return n === CLEARED_TOOL_RESULT_TEXT || n.startsWith(PERSISTED_OUTPUT_TAG);
}
//@ chunk-g54kbxqw.js:147963-148408 placement
function selectClearableToolUses(e, n) {
  let s = countToolCallsSince(e);
  let max = Math.max(1, n);
  let h = new Set(s.slice(-max));
  let y = new Set(s.filter((R) => !h.has(R)));
  if (y.size === 0)
    return {
      clearSet: y,
      keepSet: h,
      tokensSaved: 0,
      candidates: [],
    };
  let tokensSaved = 0;
  let C = [];
  for (let R of e) {
    if (R.type !== "user" || !Array.isArray(R.message.content)) continue;
    for (let S of R.message.content)
      if (
        isObjectBlock(S) &&
        S.type === "tool_result" &&
        y.has(S.tool_use_id) &&
        !isClearedResultText(S.content)
      ) {
        tokensSaved += calculateToolResultTokens(S);
        C.push(S);
      }
  }
  return {
    clearSet: y,
    keepSet: h,
    tokensSaved,
    candidates: C,
  };
}
//@ chunk-g54kbxqw.js:148408-148938 placement = isMedia (1)
/**
 * 把指定 tool_use_id 的 tool_result 内容替换成清理文本（hint_clears 用）。
 */
function replaceToolResultContent(e, n, s) {
  if (n.size === 0) return [...e];
  return e.map((r) => {
    if (r.type !== "user" || !Array.isArray(r.message.content)) return r;
    let h = false;
    let content = r.message.content.map((k) => {
      if (!isObjectBlock(k) || k.type !== "tool_result" || !n.has(k.tool_use_id)) return k;
      let C =
        Array.isArray(k.content) &&
        k.content.some((w) => isObjectBlock(w) && (w.type === "image" || w.type === "document"));
      let R = C ? CLEARED_TOOL_RESULT_TEXT : (s?.get(k.tool_use_id) ?? CLEARED_TOOL_RESULT_TEXT);
      let S =
        !C && !R.startsWith(PERSISTED_OUTPUT_PREFIX) && containsClearedMarker(k.content)
          ? `${PERSISTED_OUTPUT_PREFIX}${R}`
          : R;
      if (k.content === S) return k;
      h = true;
      return {
        ...k,
        content: S,
      };
    });
    return h
      ? {
          ...r,
          message: {
            ...r.message,
            content,
          },
        }
      : r;
  });
}
//@ chunk-g54kbxqw.js:148938-149648 fingerprint = maybeTimeBasedMicrocompact (0.588)
/**
 * keep-recent 型 microcompact（context_hint 触发）：保留最近 N 个可清理工具结果，节省 ≥20000 token 时把其余结果替换为清理文本（可先持久化原文），记 tengu_time_based_microcompact，并抑制压缩警告、通知缓存删除。
 */
async function maybeTimeBasedMicrocompact(e, querySource, s) {
  let { keepSet, tokensSaved, candidates } = selectClearableToolUses(e, s.keepRecent);
  if (tokensSaved < MICROCOMPACT_LIMITS) return null;
  let keepSet_2 = new Set(candidates.map((id) => id.tool_use_id));
  let C = new Map();
  for (let candidate of candidates) {
    let w = candidate.content ? await s.persist?.(candidate.content, candidate.tool_use_id) : null;
    C.set(candidate.tool_use_id, w ?? CLEARED_TOOL_RESULT_TEXT);
  }
  let messages = replaceToolResultContent(e, keepSet_2, C);
  if (querySource !== undefined && classifyQuerySource(querySource) === "main")
    notePendingConversationEdit("tool_result_clear");
  logEvent("tengu_time_based_microcompact", {
    toolsCleared: keepSet_2.size,
    toolsKept: keepSet.size,
    keepRecent: s.keepRecent,
    tokensSaved,
    trigger: lit("context_hint"),
  });
  logFeatureOk("compact_micro_keep_recent");
  logForDebugging(
    `[KEEP-RECENT MC] context_hint trigger, cleared ${keepSet_2.size} tool results (~${tokensSaved} tokens), kept last ${keepSet.size}`,
  );
  suppressCompactWarning();
  if (querySource) notifyCacheDeletion(querySource, s.agentId);
  return {
    messages,
    tokensSaved,
    clearedIds: keepSet_2,
    clearedContent: C,
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
function isClearableToolName(e) {
  return (
    CLEARABLE_TOOL_NAMES.has(e) ||
    (e.startsWith(MCP_CONTAINER) && CLEARABLE_TOOL_NAMES.has(e.slice(MCP_CONTAINER.length)))
  );
}
//@ chunk-g54kbxqw.js:149818-150058 layout
/**
 * 空闲后清理配置：空闲 ≥3900 秒、保留 12 个工具调用、至少清 20000 token、触发阈值等。
 */
var ALWAYS_EXCLUDED_TOOLS = [GET_TASK_TOOL_TEXT, POLL];
var MAX_TRACKING_KEYS = 64;
var IDLE_CLEAR_KEEP_TOOL_USES = 12;
var IDLE_CLEARING_CONFIG = {
  minIdleSeconds: 3900,
  keepToolUses: IDLE_CLEAR_KEEP_TOOL_USES,
  clearAtLeastTokens: MICROCOMPACT_LIMITS,
  triggerToolUsesBelowCount: 3,
  minTriggerToolUses: IDLE_CLEAR_KEEP_TOOL_USES + 15,
};
var idleClearingStateSlot = new SessionRootSlot(() => ({
  decidedIdles: new Map(),
  lastClearedByTrackingKey: new Map(),
  failuresLogged: new Set(),
}));
//@ chunk-g54kbxqw.js:150058-150094 layout
/**
 * 取当前会话（默认全局 host）的空闲清理状态：已决定的空闲、按追踪键记录的上次清理、已记录的失败。
 */
function getIdleClearingState(e) {
  return idleClearingStateSlot.of(e ?? getRootSession());
}
//@ chunk-g54kbxqw.js:150094-150662 layout
/**
 * 用户空闲超过约 65 分钟（缓存已失效）返回后，规划服务端 clear_tool_uses_20250919 编辑（trigger/keep/clear_at_least/exclude_tools）；开关 tengu_jiggly_blossom（on/shadow/off）。queryModel 把它作为 context_management 的 toolClearing。
 */
function planToolResultClearingAfterIdle(messages, querySource, s, r, h, y) {
  try {
    let rolloutMode = idleClearingMode();
    if (
      rolloutMode === "off" ||
      isAutoModeQuerySource(querySource) ||
      (rolloutMode === "unknown" && !messages.some(hasAppliedContextEdits))
    )
      return;
    if (!supportsContextEditing(s)) return;
    let C = IDLE_CLEARING_CONFIG;
    let idleReturn = analyzeIdleReturn(
      messages,
      C,
      undefined,
      h,
      classifyQuerySource(querySource) === "auxiliary" ? messagesSince(messages, y).length : messages.length,
    );
    if (!idleReturn) return;
    if (idleReturn.repliesSinceIdle === 0 && !decideIdleClearing(rolloutMode, querySource, r, idleReturn, C))
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
          value: C.keepToolUses,
        },
        clear_at_least: {
          type: "input_tokens",
          value: C.clearAtLeastTokens,
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
function hasClearedToolResultsAfterIdle(messages, mainLoopModel, s, session) {
  try {
    let h = idleClearingMode();
    if (h === "off" || h === "shadow" || (h === "unknown" && !messages.some(hasAppliedContextEdits)))
      return false;
    if (!supportsContextEditing(mainLoopModel)) return false;
    let y = analyzeIdleReturn(messages, IDLE_CLEARING_CONFIG, s);
    if (!y || !isIdleClearingActive(h, y)) return false;
    return !(
      y.repliesSinceIdle === 0 &&
      isNewIdlePeriod(getIdleClearingState(session).decidedIdles, y, IDLE_CLEARING_CONFIG) === false
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
function analyzeIdleReturn(e, n, s, r, h = e.length) {
  let y = n.minIdleSeconds * 1000;
  let k;
  let C = 0;
  let R = 0;
  let S;
  let w = false;
  for (let [Z, x] of e.entries()) {
    if (Z >= h) break;
    let ce = clearableMessageKind(x);
    if (ce === undefined) continue;
    if (w && S !== undefined && ce - S > y && isUserContentMessage(x)) {
      k = Z;
      C = ce;
      R = ce - S;
    }
    if (x.type === "assistant") w = typeof x.apiBlockIndex === "number";
    S = S === undefined ? ce : Math.max(S, ce);
  }
  let P = s === undefined ? Number.NaN : Date.parse(s);
  if (w && S !== undefined && P - S > y) {
    k = Math.min(e.length, h);
    C = P;
    R = P - S;
  }
  if (k === undefined) return;
  let L = new Set();
  let j = new Map();
  let Q = new Set(ALWAYS_EXCLUDED_TOOLS);
  let q = new Set();
  let G = [];
  let se = new Set();
  let serverClearedSinceIdle = false;
  let ie = 0;
  let serverClearedBeforeIdle = false;
  let contextTokensBeforeIdle;
  for (let [Z, x] of e.entries()) {
    if (
      x.type === "attachment" &&
      x.attachment.type === "project_doc_reads" &&
      (trackedProjectReads(x.attachment)?.length ?? 0) > 0
    )
      Q.add(PROJECTS_TOOL_NAME);
    if (
      (x.type !== "assistant" && x.type !== "user") ||
      isNonConversationMessage(x) ||
      !Array.isArray(x.message.content)
    )
      continue;
    let ce = [];
    if (x.type === "assistant") {
      for (let V of x.batchToolUses ?? []) {
        ce.push(`${V.id}_`);
        if (typeof V.name !== "string") continue;
        for (let Y of [V.name, r?.(V.name)]) if (typeof Y === "string" && TOOL_NAME_RE.test(Y)) Q.add(Y);
      }
      if (Z < h && x.isUnmetered !== true && clearableMessageKind(x) !== undefined) {
        let V = x.message.stop_reason !== null && !(!x.message.context_management && isToolUseStop(e, Z));
        if (Z < k) {
          if (x.message.usage) {
            let Y = totalTokensOf(x.message.usage);
            if (Y > 0) contextTokensBeforeIdle = Y;
          }
          if (V) serverClearedBeforeIdle = hasAppliedContextEdits(x);
        } else if (V) {
          se.add(x.message.id);
          serverClearedSinceIdle = hasAppliedContextEdits(x);
          ie = 0;
          for (let Y of x.message.context_management?.applied_edits ?? [])
            if (Y?.type === "clear_tool_uses_20250919" && isNonNegativeNumber(Y.cleared_tool_uses))
              ie += Y.cleared_tool_uses;
        }
      }
    }
    for (let V of x.message.content)
      if (V?.type === "tool_use" || V?.type === "server_tool_use" || V?.type === "mcp_tool_use") {
        if (typeof V.name !== "string" || ce.some((fe) => V.id.startsWith(fe))) continue;
        let Y = canonicalToolName(V.name);
        if (!isClearableToolName(Y)) {
          for (let fe of [V.name, Y, r?.(V.name)])
            if (typeof fe === "string" && !isClearableToolName(fe) && TOOL_NAME_RE.test(fe)) Q.add(fe);
        } else if (V.type === "tool_use" && !j.has(V.id)) {
          j.set(V.id, Y);
          if (Z < k) L.add(V.id);
        }
      } else if (V?.type === "tool_result") {
        let Y = j.get(V.tool_use_id);
        if (Y === undefined) continue;
        if (hasClearedMarker(V.content)) q.add(Y);
        if (Z < k && L.delete(V.tool_use_id)) {
          let fe = estimateLargeContentTokens(V.content);
          if (fe !== undefined)
            G.push({
              sentName: Y,
              tokens: fe,
            });
        }
      }
  }
  let mapped = G.filter((Z) => !q.has(Z.sentName)).map((Z) => Z.tokens);
  for (let Z of q) Q.add(Z);
  let ge = mapped.length;
  let z = ge - n.triggerToolUsesBelowCount;
  if (z <= n.keepToolUses || z < n.minTriggerToolUses) return;
  let roughTokensToClear = 0;
  for (let Z of mapped.slice(0, z + 1 - n.keepToolUses)) roughTokensToClear += Z;
  return {
    returnedAtMs: C,
    idleStartedAtMs: C - R,
    idleSeconds: Math.round(R / 1000),
    clearableToolUses: ge,
    triggerToolUses: z,
    roughTokensToClear,
    excludeTools: [...Q].sort(),
    repliesSinceIdle: se.size,
    serverClearedSinceIdle,
    toolUsesClearedSinceIdle: ie,
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
    let k = 0;
    let clearedInputTokens = 0;
    for (let L of contextManagement?.applied_edits ?? [])
      if (L.type === "clear_tool_uses_20250919") {
        k = isNonNegativeNumber(L.cleared_tool_uses) ? L.cleared_tool_uses : 0;
        clearedInputTokens = isNonNegativeNumber(L.cleared_input_tokens) ? L.cleared_input_tokens : 0;
      }
    let { lastClearedByTrackingKey } = getIdleClearingState();
    let S = lastClearedByTrackingKey.get(trackingKey);
    if (!S && lastClearedByTrackingKey.size >= MAX_TRACKING_KEYS) lastClearedByTrackingKey.clear();
    lastClearedByTrackingKey.set(trackingKey, {
      returnedAtMs: returnAfterIdle.returnedAtMs,
      clearedToolUses: k,
    });
    let w = returnAfterIdle.repliesSinceIdle === 0;
    let P = !w && S?.returnedAtMs === returnAfterIdle.returnedAtMs && S.clearedToolUses !== k;
    if (P) notifyCacheDeletion(querySource, agentId);
    if (P || w)
      logEvent("tengu_tool_result_clearing_after_idle_server_report", {
        cleared_tool_uses: k,
        cleared_input_tokens: clearedInputTokens,
        trigger_tool_uses: returnAfterIdle.triggerToolUses,
        is_first_request_after_idle: w,
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
function addClientEstimatedClearedTokens(e, edit, s) {
  try {
    if (!edit) return e;
    let r = 0;
    for (let appliedEdit of e.applied_edits)
      if (appliedEdit.type === "clear_tool_uses_20250919")
        r += isNonNegativeNumber(appliedEdit.cleared_tool_uses)
          ? appliedEdit.cleared_tool_uses
          : Number.POSITIVE_INFINITY;
    let h = new Set(edit.exclude_tools);
    let y = new Map();
    let clientEstimatedClearedInputTokens = 0;
    let C = false;
    for (let message of s) {
      if (typeof message.content === "string") continue;
      for (let block of message.content) {
        if (block.type === "tool_use") y.set(block.id, block.name);
        if (block.type !== "tool_result" || r <= 0) continue;
        let w = y.get(block.tool_use_id);
        if (w === undefined || h.has(w)) continue;
        let P = 0;
        let L = 0;
        for (let j of typeof block.content === "string"
          ? [
              {
                type: "text",
                text: block.content,
              },
            ]
          : (block.content ?? [])) {
          if (j.type === "document") return e;
          if (j.type === "image") L++;
          else P += Buffer.byteLength(j.type === "text" ? j.text : jsonStringify(j));
        }
        clientEstimatedClearedInputTokens +=
          Math.ceil(P / BYTES_PER_TOKEN_ESTIMATE) + L * imageTileCount(PDF_TILE_WIDTH, PDF_TILE_HEIGHT);
        C = true;
        if (L > 0 || P > SMALL_RESULT_BYTES) r--;
      }
    }
    if (!C) return e;
    return {
      ...e,
      client_estimated_cleared_input_tokens: clientEstimatedClearedInputTokens,
    };
  } catch (error) {
    logIdleClearingFailure(error, "sad", "estimating_cleared_threw");
    return e;
  }
}
//@ chunk-g54kbxqw.js:155243-155349 affinity
/**
 * 空闲清理是否生效：shadow 模式不生效；空闲后首个请求要求模式为 on，之后看服务端是否已清理过。
 */
function isIdleClearingActive(e, n) {
  if (e === "shadow") return false;
  return n.repliesSinceIdle === 0 ? e === "on" : n.serverClearedSinceIdle;
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
