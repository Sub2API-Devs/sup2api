/**
 * services/api/promptCacheBreakDetection.ts
 *
 * 提示词缓存断裂检测：每次请求前按来源（主线程/SDK/代理/压缩分叉）记录 system、工具 schema、模型、beta、effort、thinking 等的哈希与消息哈希，响应后若 cache_read 明显下降则对比找出变化原因并上报（tengu_prompt_cache_break 一类），也处理服务器 cache-diagnosis 与压缩/缓存删除通知。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/api/promptCacheBreakDetection.ts
 * pieces: chunk-03tec5k5.js (20), chunk-5xgkngpb.js (83), chunk-7pwjpdkw.js (15), chunk-8tk33yy7.js (9), chunk-ac0ps64w.js (2)
 * attribution: placement 88, layout 28, sole-consumer 1, fingerprint 10, file-local 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isDeepStrictEqual } from "util";
import { join } from "path";
import { rm, mkdir } from "fs/promises";
import { randomUUID } from "crypto";
import { jsonStringify, jsonParse } from "../../utils/slowOperations.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { getRootSession, onSessionSwitch, isDiskless, getSessionId } from "../../bootstrap/state.js";
import { logError } from "../../utils/log.js";
import { toolKeyOf, withToolOwnership, stripSafeguardsField, exactKeyValue } from "./toolDefinitionShape.js";
import { getCacheControl, stripCacheControl } from "./declaredToolSet.js";
import { isPlainObject } from "../../utils/objectUtils.js";
import { canonicalToolName } from "../../utils/permissions/permissionRuleParser.js";
import { isToolResultBlockWithContent, isToolReferenceWithName } from "../../utils/toolSearch.js";
import {
  messageRoleBucket,
  messageContentBlocks,
  PREFIX_HASH_CHUNK,
  PREFIX_BREAK_EVENT,
  foldedAttachmentText,
  contentBlockTypeBucket,
  stripCacheControl_2_2,
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
  lit as lit_2,
  concatSafe,
  fromNumber,
  joinSafe,
  fromEnum,
  fromEnumArr,
  fromEnumOpt,
  fromNumberArr,
} from "../analytics/safeMetadata.js";
import { countWhere, arraysEqual as arraysEqual_2 } from "../../utils/collections.js";
import { logEvent } from "../analytics/index.js";
import { sanitizeMarkName } from "../../utils/startupMarks.js";
import { telemetrySafeModelName } from "../../utils/model/telemetryModelName.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  array,
  objectSchema,
  _enum,
  tuple,
  numberSchema,
  stringSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { env } from "../../utils/env.js";
import { isManagedOAuthContext_2 } from "../../utils/auth.js";
import { streamFallbackWarning } from "./streamFallbackWarning.js";
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
import { writeFileAtomic as writeFileAtomic_2 } from "../../utils/atomicPublishWrite.js";
import { logForDebugging } from "../../utils/debug.js";
import { sanitizeToolNameForTelemetry, hashToolNames } from "../../utils/model/modelCatalog/maskedIds.js";
import { agentTypeForTelemetry } from "../analytics/metadata.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-ac0ps64w.js:191-216 placement
/**
 * 导出常量或表 `CACHE_TTL_5M_MS`：值为 300000, oR = 3600000。
 */
var CACHE_TTL_5M_MS = 300000;
var CACHE_TTL_1H_MS = 3600000;
//@ chunk-ac0ps64w.js:216-368 placement
function getCacheCreationTtl(usage) {
  if ((usage?.cache_creation?.ephemeral_5m_input_tokens ?? 0) > 0) return "5m";
  return (usage?.cache_creation?.ephemeral_1h_input_tokens ?? 0) > 0 ? "1h" : undefined;
}
//@ chunk-8tk33yy7.js:226-1154 placement
/**
 * 系统提示词"# Reporting outcomes"段：要求只报告在本会话中观察到的结果。
 */
var REPORTING_OUTCOMES_SECTION = `# Reporting outcomes

Report what actually happened, not what you intended. When you say something is done, sent, saved, fixed, or verified, that claim must rest on a result you observed in this session \u2014 tool output, the file as it now reads, the page as it now loads \u2014 not on what the step should have produced. If you did not check, say you did not check. If any step failed, was skipped, or came back different from what you expected, say so in the first sentence of your report, before anything else, even when the rest of the work succeeded. Never quietly work around a failure in a way that makes it look resolved; a problem the user can see is recoverable, one your summary hides is not. When you stop before the task is complete, your first line says so plainly and names what is left. Do not describe partial work as done, and do not let a summary read as more certain than the evidence behind it.`;
//@ chunk-8tk33yy7.js:1154-1192 placement
var X_ANTHROPIC_BILLING_HEADER = "x-anthropic-billing-header:";
//@ chunk-8tk33yy7.js:1192-1267 placement
function isBillingHeaderBlock(block) {
  let text = block.text;
  return typeof text === "string" && text.startsWith(X_ANTHROPIC_BILLING_HEADER);
}
//@ chunk-8tk33yy7.js:1267-1352 layout
/**
 * system 块是计费头（x-anthropic-billing-header:）或 "# Reporting outcomes" 段（不参与缓存比对）。
 */
function isUncachedSystemBlock(block) {
  let text = block.text;
  return (
    typeof text === "string" &&
    (text.startsWith(X_ANTHROPIC_BILLING_HEADER) || text === REPORTING_OUTCOMES_SECTION)
  );
}
//@ chunk-8tk33yy7.js:1352-1439 fingerprint (2.1.88 match: computeHash, 0.745)
/**
 * 对象 JSON 序列化后用 Bun.hash 取 32 位哈希。
 */
function computeHash(data) {
  let hash = Bun.hash(jsonStringify(data));
  return typeof hash === "bigint" ? Number(hash & 0xffffffffn) : hash;
}
//@ chunk-8tk33yy7.js:1439-1550 placement
var FINGERPRINT_BLOCK_KEYS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-8tk33yy7.js:1439", () => {
  FINGERPRINT_BLOCK_KEYS = new Set([
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
});
//@ chunk-8tk33yy7.js:1550-3232 placement
function fingerprintContentBlock(block, parts) {
  if (typeof block === "string") {
    parts.push("s", String(block.length), block.slice(0, 32), block.slice(-32));
    return;
  }
  switch (block.type) {
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
      let blockValue = block;
      break;
    }
  }
  parts.push(block.type);
  if ("text" in block && typeof block.text === "string")
    parts.push("t", String(block.text.length), block.text.slice(0, 32), block.text.slice(-32));
  if ("thinking" in block && typeof block.thinking === "string")
    parts.push("k", String(block.thinking.length));
  if ("id" in block && typeof block.id === "string") parts.push("i", block.id);
  if ("tool_use_id" in block && typeof block.tool_use_id === "string") parts.push("u", block.tool_use_id);
  if ("name" in block && typeof block.name === "string") parts.push("n", block.name);
  if ("input" in block && block.input !== undefined) parts.push("p", jsonStringify(block.input));
  if ("source" in block && block.source && typeof block.source === "object") {
    let source = block.source;
    parts.push("m", String(source.type ?? ""), String(source.media_type ?? ""));
    if (typeof source.data === "string") parts.push(String(source.data.length));
  }
  let content = "content" in block ? block.content : undefined;
  if (Array.isArray(content)) {
    parts.push("[", String(content.length));
    for (let block of content) fingerprintContentBlock(block, parts);
    parts.push("]");
  } else if (typeof content === "string")
    parts.push("c", String(content.length), content.slice(0, 32), content.slice(-32));
  for (let [key, value] of Object.entries(block)) {
    if (FINGERPRINT_BLOCK_KEYS.has(key) || value === undefined) continue;
    let text = typeof value === "string" ? value : jsonStringify(value);
    parts.push(key, text.length > 256 ? `len:${text.length}` : text);
  }
}
//@ chunk-8tk33yy7.js:3232-3243 placement
var EPHEMERAL_MESSAGE_MARK = -1;
//@ chunk-8tk33yy7.js:3243-3694 placement
/**
 * 为每条消息计算缓存指纹（角色、内容块摘要），临时消息记为 -1，用于判断提示缓存是否被打破。
 */
function fingerprintMessagesForCache(messagesForAPI) {
  return messagesForAPI.map((message) => {
    if ((message.type === "api_system" || message.type === "user") && message.ephemeral)
      return EPHEMERAL_MESSAGE_MARK;
    let parts = [message.message.role];
    if (message.type === "api_system" && message.outputConfig !== undefined) {
      let timing = message.outputConfig.timing;
      parts.push(`oc:${message.outputConfig.effort ?? ""}${timing ? `:${timing.now}` : ""}`);
    }
    let content = message.message.content;
    if (Array.isArray(content)) {
      parts.push(String(content.length));
      for (let block of content) fingerprintContentBlock(block, parts);
    } else fingerprintContentBlock(content, parts);
    let hash = Bun.hash(parts.join("|"));
    return typeof hash === "bigint" ? Number(hash & 0xffffffffn) : hash;
  });
}
//@ chunk-7pwjpdkw.js:50016-50030 placement
var MAIN = "main";
//@ chunk-7pwjpdkw.js:50030-50119 placement (2.1.88 match: runPostCompactCleanup, 0.925)
/**
 * 第二个参数为假（非代理请求）且 querySource 为 repl_main_thread*、sdk、compact 时为真，供提示缓存断裂检测决定是否跟踪；不是压缩后清理。
 */
function isCacheBreakTrackedSource(querySource, sourceCategory) {
  return (
    !sourceCategory &&
    (querySource.startsWith("repl_main_thread") || querySource === "sdk" || querySource === "compact")
  );
}
//@ chunk-7pwjpdkw.js:50119-50159 placement
var MAX_CHANGED_MESSAGE_ENTRIES = 2000;
var MAX_PREVIOUS_STATE_ENTRIES = 200;
var CACHE_TTL_BY_KIND = {
  "5m": CACHE_TTL_5M_MS,
  "1h": CACHE_TTL_1H_MS,
};
//@ chunk-7pwjpdkw.js:50159-50932 placement
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
//@ chunk-7pwjpdkw.js:50932-53479 placement
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
  touch(touchedAt) {
    if (this.entries.length > 0) this.touchedAt = Math.max(this.touchedAt ?? 0, touchedAt);
  }
  expectDrop(dropExpectedAt) {
    this.dropExpectedAt = dropExpectedAt;
  }
  attribute(pendingAttribution) {
    this.pendingAttribution = pendingAttribution;
  }
  record(sample) {
    let previousSample = this.entries.at(-1) ?? null;
    let dropExpectedAt = this.dropExpectedAt;
    this.dropExpectedAt = null;
    let pendingAttribution = this.pendingAttribution;
    this.pendingAttribution = null;
    let dropWasExpected =
      dropExpectedAt !== null &&
      previousSample !== null &&
      sample.at - Math.max(previousSample.at, this.touchedAt ?? 0) < CACHE_TTL_BY_KIND[previousSample.ttl];
    let outcome;
    let hasCacheEvidence =
      this.cacheReadTokens + this.cacheCreationTokens > 0 ||
      sample.cacheReadTokens + sample.cacheCreationTokens > 0;
    if (previousSample === null) outcome = "cold";
    else if (!hasCacheEvidence) outcome = "uncached";
    else if (
      previousSample.cacheReadTokens + previousSample.cacheCreationTokens === 0 &&
      sample.cacheReadTokens + sample.cacheCreationTokens > 0
    )
      outcome = "cold";
    else {
      let previousTokens =
        previousSample.inputTokens + previousSample.cacheReadTokens + previousSample.cacheCreationTokens;
      let currentTokens = sample.inputTokens + sample.cacheReadTokens + sample.cacheCreationTokens;
      let min = Math.min(previousTokens, currentTokens);
      let changedMessageEntries = min - sample.cacheReadTokens;
      outcome =
        sample.cacheReadTokens < min * 0.95 && changedMessageEntries >= MAX_CHANGED_MESSAGE_ENTRIES
          ? dropWasExpected
            ? "expected"
            : "miss"
          : "hit";
    }
    let ttl = sample.cacheCreationTokens === 0 && previousSample !== null ? previousSample.ttl : sample.ttl;
    let entry =
      outcome === "miss" && pendingAttribution !== null
        ? {
            ...sample,
            ttl,
            outcome,
            attribution: pendingAttribution,
          }
        : {
            ...sample,
            ttl,
            outcome,
          };
    this.entries.push(entry);
    if (this.entries.length > MAX_PREVIOUS_STATE_ENTRIES) this.entries.shift();
    switch (
      (this.requests++,
      (this.cacheReadTokens += sample.cacheReadTokens),
      (this.cacheCreationTokens += sample.cacheCreationTokens),
      (this.inputTokens += sample.inputTokens),
      outcome)
    ) {
      case "hit":
        this.hits++;
        break;
      case "miss":
        this.misses++;
        this.missRecacheTokens += sample.cacheCreationTokens;
        this.lastMissAt = sample.at;
        this.lastMissAttribution = pendingAttribution;
        for (let cause of pendingAttribution?.causes ?? [])
          this.missCauses[cause] = (this.missCauses[cause] ?? 0) + 1;
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
    return entry;
  }
  summary(now) {
    let totalTokens = this.cacheReadTokens + this.cacheCreationTokens + this.inputTokens;
    let latestEntry = this.entries.at(-1) ?? null;
    let ttlMs = CACHE_TTL_BY_KIND[latestEntry?.ttl ?? "5m"];
    let cachingObserved = this.cacheReadTokens + this.cacheCreationTokens > 0;
    let latestCachingObserved =
      latestEntry !== null && latestEntry.cacheReadTokens + latestEntry.cacheCreationTokens > 0;
    let lastActivityAt = latestEntry !== null ? Math.max(latestEntry.at, this.touchedAt ?? 0) : 0;
    return {
      requests: this.requests,
      hits: this.hits,
      misses: this.misses,
      expectedRebuilds: this.expectedRebuilds,
      coldStarts: this.coldStarts,
      hitRatio: totalTokens > 0 ? this.cacheReadTokens / totalTokens : null,
      cacheWriteTokens: this.cacheCreationTokens,
      missRecacheTokens: this.missRecacheTokens,
      lastMissAt: this.lastMissAt,
      lastMissAttribution: this.lastMissAttribution,
      missCauses: {
        ...this.missCauses,
      },
      lastRequest: latestEntry,
      cachingObserved,
      lastActivityAt: latestEntry !== null ? lastActivityAt : null,
      expiresAt: latestEntry !== null && latestCachingObserved ? lastActivityAt + ttlMs : null,
      warm: latestEntry !== null && latestCachingObserved && now - lastActivityAt < ttlMs,
    };
  }
}
//@ chunk-7pwjpdkw.js:53479-54016 placement
class PromptCacheTrackerRegistry {
  #e = new Map();
  record(conversationKey, sample) {
    let tracker = this.#e.get(conversationKey);
    if (tracker === undefined) {
      tracker = new PromptCacheTracker();
      this.#e.set(conversationKey, tracker);
    }
    return tracker.record(sample);
  }
  expectDrop(conversationKey, dropExpectedAt) {
    this.#e.get(conversationKey)?.expectDrop(dropExpectedAt);
  }
  attribute(conversationKey, attribution) {
    this.#e.get(conversationKey)?.attribute(attribution);
  }
  touch(conversationKey, touchedAt) {
    this.#e.get(conversationKey)?.touch(touchedAt);
  }
  summary(conversationKey, now) {
    return (this.#e.get(conversationKey) ?? new PromptCacheTracker()).summary(now);
  }
  estimateRecacheTokens(conversationKey) {
    let tracker = this.#e.get(conversationKey);
    let last = tracker?.entries.at(-1);
    if (!last) return 0;
    if (tracker?.dropExpectedAt != null) return null;
    return last.inputTokens + last.cacheReadTokens + last.cacheCreationTokens;
  }
  clear(conversationKey) {
    if (conversationKey === undefined) this.#e.clear();
    else this.#e.delete(conversationKey);
  }
}
//@ chunk-7pwjpdkw.js:54016-54043 placement
var promptCacheTrackers; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-7pwjpdkw.js:54016", () => {
  promptCacheTrackers = new SessionRootSlot(() => new PromptCacheTrackerRegistry());
});
//@ chunk-7pwjpdkw.js:54043-54075 placement
function promptCacheTrackersForSession() {
  return promptCacheTrackers.of(getRootSession());
}
//@ chunk-7pwjpdkw.js:54075-54147 placement
function recordPromptCacheUsage(mainKey, usage) {
  try {
    return promptCacheTrackersForSession().record(mainKey, usage);
  } catch (error) {
    logError(error);
    return null;
  }
}
//@ chunk-7pwjpdkw.js:54147-54203 placement
function attributePromptCacheMiss(mainKey, detail) {
  try {
    promptCacheTrackersForSession().attribute(mainKey, detail);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-7pwjpdkw.js:54203-54255 placement
function touchPromptCache(mainKey, at) {
  try {
    promptCacheTrackersForSession().touch(mainKey, at);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-7pwjpdkw.js:54255-54326 placement
function expectPromptCacheDrop(mainKey = MAIN, now = Date.now()) {
  try {
    promptCacheTrackersForSession().expectDrop(mainKey, now);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-7pwjpdkw.js:54326-54382 placement
function getPromptCacheSummary(mainKey = MAIN, now = Date.now()) {
  return promptCacheTrackersForSession().summary(mainKey, now);
}
//@ chunk-7pwjpdkw.js:54382-54437 placement
function estimateRecacheTokens(mainKey = MAIN) {
  return promptCacheTrackersForSession().estimateRecacheTokens(mainKey);
}
//@ chunk-7pwjpdkw.js:54437-54518 placement
function clearPromptCacheOnSessionSwitch() {
  return onSessionSwitch((sessionId, kind) => {
    if (kind === "cd" || kind === "hydrate") return;
    promptCacheTrackersForSession().clear();
  });
}
//@ chunk-03tec5k5.js:2119-2233 placement
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
//@ chunk-03tec5k5.js:2233-2472 placement
/**
 * 由已知的模型、工具和 system 生成提示前缀账本的初始快照（标记为播种）。
 */
function seedLedgerSnapshot(snapshot) {
  return {
    model: snapshot.model,
    tools: snapshot.tools.map((tool, index) => ({
      key: toolKeyOf(tool, index),
      deferred: isDeferredTool(tool),
      bound: isDeferredTool(tool),
      cacheControl: undefined,
      body: tool,
    })),
    system: snapshot.system.map((body) => ({
      preamble: false,
      cacheControl: undefined,
      body,
    })),
    messages: [],
    envelope: {},
    seeded: true,
  };
}
//@ chunk-03tec5k5.js:2472-3476 placement
/**
 * 把请求转换为可比较的快照（system 块、工具、betas、参数），可绑定引用到的延迟工具。
 */
function snapshotRequestForCacheDiff(request, options = {}) {
  let boundDeferredToolNames =
    options.boundDeferredToolNames ??
    (options.bindReferencedDeferredTools === true
      ? collectReferencedDeferredTools(request.messages)
      : undefined);
  let systemBlocks =
    typeof request.system === "string"
      ? [
          {
            type: "text",
            text: request.system,
          },
        ]
      : (request.system ?? []);
  let envelope = {};
  for (let fieldName of ENVELOPE_DIFF_FIELDS) {
    let fieldValue =
      fieldName === "betas"
        ? sortedList(request.betas)
        : fieldName === "context_management"
          ? normalizeContextManagement(request.context_management)
          : request[fieldName];
    if (fieldValue !== undefined) envelope[fieldName] = fieldValue;
  }
  return {
    model: request.model,
    envelope,
    tools: (request.tools ?? []).map((tool, toolIndex) => {
      let toolBody = tool;
      if ("ownership_metadata" in tool) {
        let { ownership_metadata: ownershipMetadata, ...toolWithoutOwnership } = tool;
        toolBody = toolWithoutOwnership;
      }
      return {
        key: toolKeyOf(tool, toolIndex),
        deferred: tool.defer_loading === true,
        bound:
          tool.defer_loading === true &&
          typeof tool.name === "string" &&
          boundDeferredToolNames?.has(tool.name) === true,
        cacheControl: getCacheControl(tool),
        body: stripCacheControl(toolBody),
      };
    }),
    system: systemBlocks.map((block) => ({
      preamble: isUncachedSystemBlock(block),
      cacheControl: getCacheControl(block),
      body: stripCacheControl(block),
    })),
    messages: request.messages.map((message, messageIndex, messages) => ({
      role: message.role,
      turnScopedSystem: message.role === "system" && messageIndex === messages.length - 1,
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
          : message.content.map((block) => ({
              thinking: block.type === "thinking" || block.type === "redacted_thinking",
              cacheControl: getCacheControl(block),
              body: withToolOwnership(stripSafeguardsField(stripCacheControl(block)), undefined),
            })),
    })),
  };
}
//@ chunk-03tec5k5.js:3476-3752 placement
/**
 * 把提示前缀账本转成可比较的视图：去掉前导 system、回合内 system 消息和 thinking 块。
 */
function ledgerComparableView(ledger) {
  return {
    model: ledger.model,
    tools: ledger.tools.filter(isBoundTool).map((tool) => tool.body),
    system: ledger.system.filter((row) => !row.preamble).map((row) => row.body),
    messages: ledger.messages
      .filter((message) => !message.turnScopedSystem)
      .map((message) => ({
        role: message.role,
        content: message.blocks.filter((block) => !block.thinking).map((block) => block.body),
      })),
  };
}
//@ chunk-03tec5k5.js:3752-3830 placement
/**
 * 导出函数 `isCacheFingerprintPart`：参数 e，返回 e.part === "tool" || e.part === "system" || e.part === "message"。
 */
function isCacheFingerprintPart(part) {
  return part.part === "tool" || part.part === "system" || part.part === "message";
}
//@ chunk-03tec5k5.js:3830-3839 placement
var MAX_LEDGER_ENTRIES = 16;
//@ chunk-03tec5k5.js:3839-3927 placement
/**
 * 导出函数 `describeSnapshotDiff`：参数 e, n，返回 e.seeded ? diffToolLists(e, n) : [ ...diffToolLists(e, n), ...diffThinkingBlocks(e, n), ...diffCacheMarkers(e,…。
 */
function describeSnapshotDiff(previous, diff) {
  return previous.seeded
    ? diffToolLists(previous, diff)
    : [
        ...diffToolLists(previous, diff),
        ...diffThinkingBlocks(previous, diff),
        ...diffCacheMarkers(previous, diff),
        ...describeRequestDifferences(previous, diff),
      ];
}
//@ chunk-03tec5k5.js:3927-5480 placement
/**
 * 比较两次请求的工具列表（新增、移除、变化、重排），延迟工具单独处理。
 */
function diffToolLists(previous, next) {
  let previousView = ledgerComparableView(previous);
  let nextView = ledgerComparableView(next);
  let entries = [];
  let pushEntry = (entry) => {
    entries.push(entry);
    return entries.length < MAX_LEDGER_ENTRIES;
  };
  let indexTools = (tools) =>
    new Map(
      [...tools.filter((tool) => !tool.deferred), ...tools.filter((tool) => tool.bound)].map((tool) => [
        tool.key,
        tool,
      ]),
    );
  let previousTools = indexTools(previous.tools);
  let nextTools = indexTools(next.tools);
  let seededRemovals = [];
  let hasRealChange = false;
  for (let [toolKey, previousTool] of previousTools) {
    let body = previousTool.body;
    let nextTool = nextTools.get(toolKey);
    if (nextTool === undefined) {
      if (previousTool.deferred) {
        if (!previous.seeded)
          seededRemovals.push({
            part: "tool",
            id: toolKey,
            kind: "removed",
            prev: body,
          });
        continue;
      }
      hasRealChange = true;
      if (
        !pushEntry({
          part: "tool",
          id: toolKey,
          kind: "removed",
          prev: body,
        })
      )
        return entries;
    } else if (previousTool.deferred !== nextTool.deferred) {
      hasRealChange = true;
      let deferralEntry = previousTool.deferred
        ? {
            part: "tool",
            id: toolKey,
            kind: "added",
            next: nextTool.body,
          }
        : {
            part: "tool",
            id: toolKey,
            kind: "removed",
            prev: body,
          };
      if (!pushEntry(deferralEntry)) return entries;
    } else if (!isDeepStrictEqual(body, nextTool.body)) {
      hasRealChange ||= !previousTool.deferred;
      let body_2 = nextTool.body;
      let field =
        [...Object.keys(body), ...Object.keys(body_2)].find(
          (fieldName) => !isDeepStrictEqual(exactKeyValue(body, fieldName), exactKeyValue(body_2, fieldName)),
        ) ?? "?";
      if (
        !pushEntry({
          part: "tool",
          id: toolKey,
          kind: "changed",
          field,
          prev: body,
          next: body_2,
        })
      )
        return entries;
    }
  }
  for (let [toolKey, nextTool] of nextTools)
    if (!previousTools.has(toolKey) && !nextTool.deferred) {
      hasRealChange = true;
      if (
        !pushEntry({
          part: "tool",
          id: toolKey,
          kind: "added",
          next: nextTool.body,
        })
      )
        return entries;
    }
  if (!hasRealChange) {
    let activeToolKeys = (toolMap) =>
      [...toolMap.values()].flatMap((tool) => (tool.deferred ? [] : [tool.key]));
    let previousKeys = activeToolKeys(previousTools);
    let found = activeToolKeys(nextTools)
      .filter((toolKey) => previousTools.has(toolKey))
      .find((nextKey, keyIndex) => previousKeys[keyIndex] !== nextKey);
    if (found !== undefined)
      pushEntry({
        part: "tool",
        id: found,
        kind: "reordered",
      });
  }
  let max = Math.max(previousView.system.length, nextView.system.length);
  for (let idx = 0; idx < max; idx++) {
    let previousPart = previousView.system[idx];
    let nextPart = nextView.system[idx];
    let changeKind = previousPart === undefined ? "added" : nextPart === undefined ? "removed" : "changed";
    if (changeKind !== "changed" || !isDeepStrictEqual(previousPart, nextPart)) {
      if (
        !pushEntry({
          part: "system",
          index: idx,
          kind: changeKind,
          prev: previousPart,
          next: nextPart,
        })
      )
        return entries;
    }
  }
  for (let idx = 0; idx < previousView.messages.length; idx++) {
    let previousMessage = previousView.messages[idx];
    let nextMessage = nextView.messages[idx];
    if (nextMessage !== undefined && isDeepStrictEqual(previousMessage, nextMessage)) continue;
    let messageEntry = {
      part: "message",
      index: idx,
      role: previousMessage.role,
      kind: nextMessage === undefined ? "removed" : "changed",
      prev: previousMessage,
      next: nextMessage,
    };
    if (!pushEntry(messageEntry)) return entries;
  }
  for (let entry of seededRemovals) if (!pushEntry(entry)) break;
  return entries;
}
//@ chunk-03tec5k5.js:5480-5956 placement
function diffThinkingBlocks(previous, next) {
  let entries = [];
  let min = Math.min(previous.messages.length, next.messages.length);
  for (let idx = 0; idx < min && entries.length < MAX_LEDGER_ENTRIES; idx++) {
    let previousSignatures = describeSignatureField(previous.messages[idx]);
    let nextSignatures = describeSignatureField(next.messages[idx]);
    if (previousSignatures.length === 0 && nextSignatures.length === 0) continue;
    if (
      previousSignatures.length === nextSignatures.length &&
      previousSignatures.every((signature, signatureIndex) => signature === nextSignatures[signatureIndex])
    )
      continue;
    let sharesPrefix =
      previousSignatures
        .slice(0, nextSignatures.length)
        .every((signature, signatureIndex) => signature === nextSignatures[signatureIndex]) ||
      nextSignatures
        .slice(0, previousSignatures.length)
        .every((signature, signatureIndex) => signature === previousSignatures[signatureIndex]);
    entries.push({
      part: "thinking",
      index: idx,
      kind: !sharesPrefix
        ? "changed"
        : nextSignatures.length < previousSignatures.length
          ? "dropped"
          : "added",
      prevCount: previousSignatures.length,
      nextCount: nextSignatures.length,
    });
  }
  return entries;
}
//@ chunk-03tec5k5.js:5956-6132 placement
function describeSignatureField(block) {
  return block.blocks.flatMap((block) => {
    if (!block.thinking) return [];
    let signature = exactKeyValue(block.body, "signature");
    let data = exactKeyValue(block.body, "data");
    return [typeof signature === "string" ? signature : typeof data === "string" ? data : "?"];
  });
}
//@ chunk-03tec5k5.js:6132-6582 placement
function diffCacheMarkers(previous, next) {
  let cacheControlMarkers = collectCacheControlMarkers(previous, previous.messages.length);
  let cacheControlMarkers_2 = collectCacheControlMarkers(next, previous.messages.length);
  let entries = [];
  for (let [markerKey, { at, marker }] of cacheControlMarkers) {
    if (entries.length >= MAX_LEDGER_ENTRIES) return entries;
    let nextMarkerInfo = cacheControlMarkers_2.get(markerKey);
    if (nextMarkerInfo === undefined)
      entries.push({
        part: "cache",
        at,
        kind: "dropped",
        prev: marker,
        next: undefined,
      });
    else if (!isDeepStrictEqual(marker, nextMarkerInfo.marker))
      entries.push({
        part: "cache",
        at,
        kind: "changed",
        prev: marker,
        next: nextMarkerInfo.marker,
      });
  }
  for (let [markerKey, { at, marker }] of cacheControlMarkers_2) {
    if (entries.length >= MAX_LEDGER_ENTRIES) return entries;
    if (!cacheControlMarkers.has(markerKey))
      entries.push({
        part: "cache",
        at,
        kind: "added",
        prev: undefined,
        next: marker,
      });
  }
  return entries;
}
//@ chunk-03tec5k5.js:6582-7064 placement
function collectCacheControlMarkers(request, limit) {
  let markers = new Map();
  for (let tool of request.tools)
    if (tool.cacheControl !== undefined)
      markers.set(`tools:${tool.key}`, {
        at: {
          segment: "tools",
          key: tool.key,
        },
        marker: tool.cacheControl,
      });
  request.system.forEach((section, index) => {
    if (section.cacheControl !== undefined)
      markers.set(`system:${index}`, {
        at: {
          segment: "system",
          index,
        },
        marker: section.cacheControl,
      });
  });
  request.messages.slice(0, limit).forEach((message, index) => {
    message.blocks.forEach((block, blockItem) => {
      if (block.cacheControl !== undefined)
        markers.set(`messages:${index}.${blockItem}`, {
          at: {
            segment: "messages",
            index,
            block: blockItem,
          },
          marker: block.cacheControl,
        });
    });
  });
  return markers;
}
//@ chunk-03tec5k5.js:7064-7325 placement
function describeRequestDifferences(left, right) {
  return [
    ["model", left.model, right.model],
    ["attribution_header", billingHeaderText(left), billingHeaderText(right)],
    ["deferred_tools", deferredToolKeys(left), deferredToolKeys(right)],
    ...ENVELOPE_DIFF_FIELDS.map((field) => [field, left.envelope[field], right.envelope[field]]),
  ]
    .filter(([, leftValue, rightValue]) => !isDeepStrictEqual(leftValue, rightValue))
    .map(([field, leftValue, rightValue]) => ({
      part: "envelope",
      id: field,
      kind: "changed",
      prev: leftValue,
      next: rightValue,
    }));
}
//@ chunk-03tec5k5.js:7325-7364 placement
function sortedList(betas) {
  return betas && [...betas].sort();
}
//@ chunk-03tec5k5.js:7364-7726 layout
function normalizeContextManagement(contextManagement) {
  if (!isPlainObject(contextManagement) || !Array.isArray(contextManagement.edits)) return contextManagement;
  return {
    ...contextManagement,
    edits: contextManagement.edits.map((edit) => {
      if (
        !isPlainObject(edit) ||
        !isPlainObject(edit.trigger) ||
        !isPlainObject(edit.keep) ||
        edit.trigger.type !== "tool_uses" ||
        edit.keep.type !== "tool_uses" ||
        typeof edit.trigger.value !== "number" ||
        typeof edit.keep.value !== "number"
      )
        return edit;
      let triggerLessKeep = edit.trigger.value - edit.keep.value;
      let { trigger, keep, ...editRest } = edit;
      return {
        ...editRest,
        triggerLessKeep,
      };
    }),
  };
}
//@ chunk-03tec5k5.js:7726-7848 placement
function billingHeaderText(row) {
  for (let systemRow of row.system) {
    let text = exactKeyValue(systemRow.body, "text");
    if (typeof text === "string" && text.startsWith(X_ANTHROPIC_BILLING_HEADER)) return text;
  }
  return "";
}
//@ chunk-03tec5k5.js:7848-7935 placement
function deferredToolKeys(reference) {
  return reference.tools
    .filter((tool) => tool.deferred)
    .map((tool) => tool.key)
    .sort()
    .join(",");
}
//@ chunk-03tec5k5.js:7935-7977 placement
function isBoundTool(tool) {
  return !tool.deferred || tool.bound;
}
//@ chunk-03tec5k5.js:7977-8027 placement
/**
 * 导出函数 `isDeferredTool`：参数 e，返回 lO(e, "defer_loading") === !0。
 */
function isDeferredTool(tool) {
  return exactKeyValue(tool, "defer_loading") === true;
}
//@ chunk-03tec5k5.js:8027-8444 placement
function collectReferencedDeferredTools(messages) {
  let seen = new Set();
  for (let message of messages) {
    if (typeof message.content === "string") continue;
    if (message.role === "system") {
      for (let block of message.content) {
        let tool = exactKeyValue(block, "tool");
        let out =
          exactKeyValue(block, "type") === "tool_addition" && typeof tool === "object" && tool !== null
            ? exactKeyValue(tool, "name")
            : undefined;
        if (typeof out === "string") seen.add(canonicalToolName(out));
      }
      continue;
    }
    if (message.role !== "user") continue;
    for (let block of message.content) {
      if (!isToolResultBlockWithContent(block)) continue;
      for (let inner of block.content)
        if (isToolReferenceWithName(inner)) seen.add(canonicalToolName(inner.tool_name));
    }
  }
  return seen;
}
//@ chunk-5xgkngpb.js:1551633-1551804 sole-consumer
function messageFingerprint(message) {
  return {
    role: messageRoleBucket(message.message.role),
    blocks: messageContentBlocks(message).map(sanitizePath_3),
    systemAttachments:
      message.type === "api_system" && message.foldedAttachmentTypes
        ? message.foldedAttachmentTypes.map(shortHash)
        : [],
  };
}
//@ chunk-5xgkngpb.js:1551804-1551886 placement
/**
 * 提示缓存失效检测的输出上限：摘要块数 16、散列块 10000、系统附件字符 4 倍块上限，空摘要结构。
 */
var MAX_SYSTEM_ATTACHMENT_CHARS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var EMPTY_BLOCK_SUMMARY;
deferInit("chunk-5xgkngpb.js:1551804", () => {
  MAX_SYSTEM_ATTACHMENT_CHARS = 4 * PREFIX_HASH_CHUNK;
  EMPTY_BLOCK_SUMMARY = {
    blocks: lit_2(""),
    systemAttachments: lit_2(""),
    blockCount: 0,
    truncated: false,
  };
});
//@ chunk-5xgkngpb.js:1551886-1552330 placement
function scanChangedMessages(describeMessage, firstChangedMessageIndex, messageCount, maxEntries) {
  let blockParts = [];
  let attachmentParts = [];
  let attachmentChars = 0;
  let truncated = false;
  e: for (let max = Math.max(0, firstChangedMessageIndex); max < messageCount; max++) {
    let messageInfo = describeMessage(max);
    if (messageInfo === undefined) {
      truncated = true;
      break;
    }
    attachmentChars += messageInfo.systemAttachments.length;
    if (
      messageInfo.systemAttachments.length > 0 &&
      blockParts.length < maxEntries &&
      attachmentChars <= MAX_SYSTEM_ATTACHMENT_CHARS
    )
      attachmentParts.push(
        concatSafe(fromNumber(max), lit_2("="), joinSafe(messageInfo.systemAttachments, "+")),
      );
    let roleLabel = fromEnum(messageInfo.role);
    for (let block of messageInfo.blocks) {
      if (blockParts.length >= maxEntries) {
        truncated = true;
        break e;
      }
      blockParts.push(joinSafe([fromNumber(max), roleLabel, fromEnum(block.type), block.hash], ":"));
    }
  }
  return {
    blocks: joinSafe(blockParts),
    systemAttachments: joinSafe(attachmentParts),
    blockCount: blockParts.length,
    truncated,
  };
}
//@ chunk-5xgkngpb.js:1552330-1552523 placement
function blockSummary(block, limit) {
  if (block === undefined)
    return {
      blocks: lit_2(""),
      blockCount: 0,
    };
  let sliced = block.blocks.slice(0, limit);
  return {
    blocks: joinSafe(
      sliced.map((block) =>
        joinSafe([fromEnum(block.type), fromNumber(block.length), fromEnum(block.prefixClass)], ":"),
      ),
    ),
    blockCount: sliced.length,
  };
}
//@ chunk-5xgkngpb.js:1552523-1552675 placement
function isPrefixOf(prev, next) {
  return (
    prev.role === next.role &&
    prev.blocks.length <= next.blocks.length &&
    prev.blocks.every(
      (block, part) => block.hash === next.blocks[part].hash && block.type === next.blocks[part].type,
    )
  );
}
//@ chunk-5xgkngpb.js:1552675-1553172 placement
function classifyFirstChange(firstChangedMessageIndex, hashAt, prevMessageCount, newMessages, knownHash) {
  if (firstChangedMessageIndex < 0) return "none";
  if (hashAt === undefined || newMessages === undefined) return "unknown";
  let hash = hashAt(firstChangedMessageIndex);
  if (hash === undefined) return "unknown";
  let message = newMessages[firstChangedMessageIndex];
  if (message === undefined) return "rewrite";
  let fingerprint = knownHash ?? messageFingerprint(message);
  if (fingerprint.blocks.length === hash.blocks.length || !isPrefixOf(hash, fingerprint)) return "rewrite";
  for (let idx = firstChangedMessageIndex + 1; idx < prevMessageCount; idx++) {
    let hash2 = hashAt(idx);
    if (hash2 === undefined) return "unknown";
    let message2 = newMessages[idx];
    if (hash2.role !== "system" || message2 === undefined || message2.message.role !== "system")
      return "rewrite";
    let fingerprint2 = messageFingerprint(message2);
    if (fingerprint2.blocks.length !== hash2.blocks.length || !isPrefixOf(hash2, fingerprint2))
      return "rewrite";
  }
  return "tail_append";
}
//@ chunk-5xgkngpb.js:1553172-1553310 placement
function countSystemRows(state) {
  if (state === undefined) return -1;
  return "messages" in state
    ? countWhere(state.messages, (message) => message.message.role === "system")
    : countWhere(state.rows, (row) => row.role === "system");
}
//@ chunk-5xgkngpb.js:1553310-1553349 placement
function hashJoined(parts) {
  return shortHash(parts.join(","));
}
//@ chunk-5xgkngpb.js:1553349-1555206 placement
/**
 * 根据前后两次请求的差异（系统、工具、首个变化的消息等）推断提示缓存失效的原因。
 */
function explainCacheBreak(context) {
  let firstChangedMessageIndex = context.firstChangedMessageIndex;
  let previousSummary = EMPTY_BLOCK_SUMMARY;
  let previousFirstMessage;
  let previousMessageAt;
  if (firstChangedMessageIndex >= 0)
    switch (context.prev.source) {
      case "memory": {
        let messages = context.prev.messages;
        let firstChangedFingerprint =
          firstChangedMessageIndex < messages.length
            ? messageFingerprint(messages[firstChangedMessageIndex])
            : undefined;
        previousFirstMessage = firstChangedFingerprint;
        previousMessageAt = (messageIndex) =>
          messageIndex === firstChangedMessageIndex
            ? firstChangedFingerprint
            : messageIndex < messages.length
              ? messageFingerprint(messages[messageIndex])
              : undefined;
        previousSummary = scanChangedMessages(
          previousMessageAt,
          firstChangedMessageIndex,
          messages.length,
          PREFIX_HASH_CHUNK,
        );
        break;
      }
      case "disk": {
        let rows = context.prev.rows;
        previousSummary = scanChangedMessages(
          (messageIndex) => rows[messageIndex],
          firstChangedMessageIndex,
          Math.max(rows.length, context.prevMessageCount),
          PREFIX_HASH_CHUNK,
        );
        previousFirstMessage = rows[firstChangedMessageIndex];
        previousMessageAt = (messageIndex) => rows[messageIndex];
        break;
      }
      case "none":
        break;
    }
  let newMessages = context.newMessages;
  let newFirstMessage =
    firstChangedMessageIndex >= 0 &&
    newMessages !== undefined &&
    firstChangedMessageIndex < newMessages.length
      ? messageFingerprint(newMessages[firstChangedMessageIndex])
      : undefined;
  let newSummary =
    firstChangedMessageIndex >= 0 && newMessages !== undefined
      ? scanChangedMessages(
          (messageIndex) =>
            messageIndex === firstChangedMessageIndex
              ? newFirstMessage
              : messageFingerprint(newMessages[messageIndex]),
          firstChangedMessageIndex,
          newMessages.length,
          PREFIX_HASH_CHUNK,
        )
      : EMPTY_BLOCK_SUMMARY;
  let previousFirstBlocks = blockSummary(previousFirstMessage, PREFIX_HASH_CHUNK);
  let newFirstBlocks = blockSummary(newFirstMessage, PREFIX_HASH_CHUNK);
  logEvent(PREFIX_BREAK_EVENT, {
    requestId: sanitizeMarkName(context.requestId) ?? lit_2(""),
    model: telemetrySafeModelName(context.model),
    cacheBroke: context.cacheBroke,
    changeKinds: context.changeKinds,
    firstChangedMessageIndex,
    prevMessageCount: context.prevMessageCount,
    newMessageCount: context.newMessageCount,
    callNumber: context.callNumber,
    baselineFromDisk: context.baselineFromDisk,
    is1hCacheTTL: context.is1hCacheTTL,
    lastAssistantMsgOver5minAgo: context.lastAssistantMsgOver5minAgo,
    lastAssistantMsgOver1hAgo: context.lastAssistantMsgOver1hAgo,
    querySource: context.querySource,
    prevCacheReadTokens: context.prevCacheReadTokens,
    cacheReadTokens: context.cacheReadTokens,
    cacheCreationTokens: context.cacheCreationTokens,
    prevBlocks: previousSummary.blocks,
    prevBlockCount: previousSummary.blockCount,
    prevTruncated: previousSummary.truncated,
    prevSystemAttachments: previousSummary.systemAttachments,
    newBlocks: newSummary.blocks,
    newBlockCount: newSummary.blockCount,
    newTruncated: newSummary.truncated,
    newSystemAttachments: newSummary.systemAttachments,
    sampleRate: context.sampleRate,
    prevSource: fromEnum(context.prevSource),
    baselineKind: fromEnum(context.baselineKind),
    prevFirstMessageBlocks: previousFirstBlocks.blocks,
    prevFirstMessageBlockCount: previousFirstBlocks.blockCount,
    newFirstMessageBlocks: newFirstBlocks.blocks,
    newFirstMessageBlockCount: newFirstBlocks.blockCount,
    prevModel: telemetrySafeModelName(context.prevModel),
    prevBetasHash: hashJoined(context.prevBetas),
    newBetasHash: hashJoined(context.newBetas),
    prevSystemTurns: countSystemRows(
      context.prev.source === "memory"
        ? {
            messages: context.prev.messages,
          }
        : context.prev.source === "disk"
          ? {
              rows: context.prev.rows,
            }
          : undefined,
    ),
    newSystemTurns: countSystemRows(
      context.newMessages && {
        messages: context.newMessages,
      },
    ),
    changeScope: fromEnum(
      classifyFirstChange(
        firstChangedMessageIndex,
        previousMessageAt,
        context.prevMessageCount,
        context.newMessages,
        newFirstMessage,
      ),
    ),
  });
}
//@ chunk-5xgkngpb.js:1555206-1555514 placement
function messageOutline(message) {
  let text = foldedAttachmentText(message, 0);
  return {
    role: messageRoleBucket(message.message.role),
    blocks: messageContentBlocks(message).map((block) => {
      let bucket = contentBlockTypeBucket(block);
      let stripped = stripCacheControl_2_2(block);
      let text = "text" in block ? block.text : undefined;
      let hash = Bun.hash(stripped);
      return {
        type: bucket,
        length: stripped.length,
        prefixClass: bucket === "text" && typeof text === "string" ? classifyUserText(text) : bucket,
        hash: typeof hash === "bigint" ? Number(hash & 0xffffffffn) : hash,
      };
    }),
    ...(text && {
      parts: text.parts,
    }),
  };
}
//@ chunk-5xgkngpb.js:1555514-1555533 placement
var MAX_CHANGED_MESSAGE_BLOCKS = 16;
var MAX_HASHED_BLOCKS = 1e4;
//@ chunk-5xgkngpb.js:1555533-1555756 placement
function compactBaseline(parts) {
  let rows = [];
  let total = 0;
  for (let part of parts) {
    total += part.blocks.length;
    if (total > MAX_HASHED_BLOCKS) break;
    rows.push({
      r: part.role,
      b: part.blocks.map((block) => [block.type, block.length, block.prefixClass, block.hash]),
      ...(part.parts && {
        p: part.parts.map((part) => [part.type, part.len, part.hash]),
      }),
    });
  }
  return rows;
}
//@ chunk-5xgkngpb.js:1555756-1555961 placement
var BASELINE_SCHEMA; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:1555756", () => {
  BASELINE_SCHEMA = DoctorLazy(() =>
    array(
      objectSchema({
        r: _enum(MESSAGE_ROLE_BUCKETS),
        b: array(
          tuple([
            _enum(CONTENT_BLOCK_TYPE_BUCKETS),
            maxSafeIntSchema(),
            _enum(TEXT_KIND_BUCKETS),
            numberSchema(),
          ]),
        ).max(MAX_HASHED_BLOCKS),
        p: array(tuple([stringSchema().regex(/^[0-9a-f]{12}$/), maxSafeIntSchema(), numberSchema()]))
          .max(MAX_DIFF_ENTRIES)
          .optional(),
      }),
    )
      .max(20000)
      .refine((parts) => parts.reduce((acc, part) => acc + part.b.length, 0) <= MAX_HASHED_BLOCKS),
  );
});
//@ chunk-5xgkngpb.js:1555961-1556190 placement
function restoreBaseline(outlines) {
  let parsed = BASELINE_SCHEMA().safeParse(outlines);
  if (!parsed.success) return;
  return parsed.data.map((outline) => ({
    role: outline.r,
    blocks: outline.b.map(([type, length, prefixClass, hash]) => ({
      type,
      length,
      prefixClass,
      hash,
    })),
    ...(outline.p && {
      parts: outline.p.map(([type, len, hash]) => ({
        type,
        len,
        hash,
      })),
    }),
  }));
}
//@ chunk-5xgkngpb.js:1556190-1556299 placement
function blockOutlineKey(parts) {
  return joinSafe(
    parts.flatMap((part) => {
      let type = normalizeShortHash(part.type);
      return type === undefined ? [] : [concatSafe(type, lit_2(":"), fromNumber(part.len))];
    }),
  );
}
//@ chunk-5xgkngpb.js:1556299-1556432 placement
function positionedOutlineKey(parts) {
  return joinSafe(
    parts.flatMap((part) => {
      let type = normalizeShortHash(part.type);
      return type === undefined
        ? []
        : [concatSafe(fromNumber(part.position), lit_2(":"), type, lit_2(":"), fromNumber(part.delta))];
    }),
  );
}
//@ chunk-5xgkngpb.js:1556432-1557161 placement
function changedMessageFields(prev, next) {
  let changed = {
    ...(prev && {
      changedMessagePrevRole: fromEnum(prev.role),
      changedMessagePrevBlocks: blockSummary(prev, MAX_CHANGED_MESSAGE_BLOCKS).blocks,
      changedMessagePrevBlockCount: prev.blocks.length,
      ...(prev.parts && {
        changedMessagePrevParts: blockOutlineKey(prev.parts),
      }),
    }),
    ...(next && {
      changedMessageRole: fromEnum(next.role),
      changedMessageBlocks: blockSummary(next, MAX_CHANGED_MESSAGE_BLOCKS).blocks,
      changedMessageBlockCount: next.blocks.length,
      ...(next.parts && {
        changedMessageParts: blockOutlineKey(next.parts),
      }),
    }),
  };
  if (!prev || !next) return changed;
  let min = Math.min(prev.blocks.length, next.blocks.length);
  let count = 0;
  while (
    count < min &&
    prev.blocks[count].type === next.blocks[count].type &&
    prev.blocks[count].hash === next.blocks[count].hash
  )
    count++;
  return {
    ...changed,
    changedMessageFirstBlock: count === prev.blocks.length && count === next.blocks.length ? -1 : count,
    changedMessageLengthDelta: blocksTotalLength(next) - blocksTotalLength(prev),
    ...(prev.parts &&
      next.parts && {
        changedMessageChangedParts: positionedOutlineKey(changedPartIndexes(prev.parts, next.parts)),
      }),
  };
}
//@ chunk-5xgkngpb.js:1557161-1557229 placement
function maxSafeIntSchema() {
  return numberSchema().int().min(0).max(Number.MAX_SAFE_INTEGER);
}
//@ chunk-5xgkngpb.js:1557229-1557289 placement
function blocksTotalLength(parts) {
  return parts.blocks.reduce((acc, block) => acc + block.length, 0);
}
//@ chunk-5xgkngpb.js:1557289-1557312 fingerprint (2.1.88 match: getCacheBreakDiffPath, 0.618)
/**
 * 缓存断裂状态文件名前缀 "cache-break-"（cache-break-state-<会话>.json）。
 */
var cacheBreakStatePrefix = "cache-break-";
//@ chunk-5xgkngpb.js:1557388-1558382 placement
var CACHE_BREAK_HINTS =
  typeof {
    ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
    PACKAGE_URL: "@anthropic-ai/claude-code",
    README_URL: "https://code.claude.com/docs/en/overview",
    VERSION: "2.1.318",
    FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
    BUILD_TIME: "2026-11-03T18:52:53Z",
    GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
    HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
    DD_SOURCEMAP_GROUP: "default",
  } !== "undefined"
    ? {
        ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
        PACKAGE_URL: "@anthropic-ai/claude-code",
        README_URL: "https://code.claude.com/docs/en/overview",
        VERSION: "2.1.318",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-11-03T18:52:53Z",
        GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
        HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
        DD_SOURCEMAP_GROUP: "default",
      }.VERSION
    : "unknown";
//@ chunk-5xgkngpb.js:1558382-1558452 placement
function isCacheBreakOutlineEnabled() {
  if (env.CLAUDE_CODE_IS_COWORK) return true;
  return isManagedOAuthContext_2() || isRemoteEnv();
}
//@ chunk-5xgkngpb.js:1558452-1558500 placement
function isRemoteEnv() {
  return env.CLAUDE_CODE_REMOTE === true;
}
//@ chunk-5xgkngpb.js:1558500-1558512 placement
var CACHE_TTL_MS_2 = 1e4;
//@ chunk-5xgkngpb.js:1558512-1558555 placement
function promptCacheBreakState() {
  return streamFallbackWarning().promptCacheBreak;
}
//@ chunk-5xgkngpb.js:1558555-1558578 placement
function noopShape(messages) {
  return;
}
//@ chunk-5xgkngpb.js:1558578-1558655 placement
function isCacheBreakPersisted() {
  if (env.CLAUDE_CODE_IS_COWORK || isManagedOAuthContext_2()) return true;
  return isRemoteEnv() && !isDiskless();
}
//@ chunk-5xgkngpb.js:1558655-1558695 placement
function isCacheBreakPersistenceEnabled() {
  return isCacheBreakPersisted() || (isPrefixBreakSampled() && !isDiskless());
}
//@ chunk-5xgkngpb.js:1558695-1558767 layout
function isNarrationClassifierExcludedModel(model) {
  return isRemoteEnv() && !env.CLAUDE_CODE_IS_COWORK && !isManagedOAuthContext_2() && !isExcludedModel(model);
}
//@ chunk-5xgkngpb.js:1558767-1558823 placement
function needsResumeBaseline(state) {
  return !isCacheBreakPersisted() && state.resumeBaseline === undefined;
}
//@ chunk-5xgkngpb.js:1558823-1558865 placement
function canPersistCacheBreakState() {
  return isCacheBreakPersistenceEnabled() && cacheBreakStatePath() !== null;
}
//@ chunk-5xgkngpb.js:1558865-1558959 placement
function cacheBreakStatePath() {
  let sessionId = normalizeUuidOrNull(getSessionId());
  if (sessionId === null) return null;
  return join(getClaudeTempDirRealpath(), `${cacheBreakStatePrefix}state-${sessionId}.json`);
}
//@ chunk-5xgkngpb.js:1558959-1559102 placement
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
//@ chunk-5xgkngpb.js:1559102-1559145 placement
function isTrackedQuerySource(querySource) {
  return Object.hasOwn(FOREGROUND_529_RETRY_SOURCES, querySource);
}
//@ chunk-5xgkngpb.js:1559145-1560902 placement
/**
 * 提示缓存失效检测的持久化状态结构：系统/工具/cache_control 哈希、工具名、消息哈希等。
 */
var cacheBreakStateSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var cacheBreakSnapshotSchema;
deferInit("chunk-5xgkngpb.js:1559145", () => {
  cacheBreakStateSchema = DoctorLazy(() =>
    create_20(
      create_2().max(200),
      create({
        systemHash: create_3(),
        toolsHash: create_3(),
        cacheControlHash: create_3(),
        toolNames: create_15(create_2().max(200)).max(2000),
        perToolHashes: create_20(create_2().max(200), create_3()).refine(
          (obj) => Object.keys(obj).length <= 2000,
        ),
        perBlockHashes: create_15(create_3()).max(5000),
        perBlockLengths: create_15(create_3()).max(5000),
        systemCharCount: create_3(),
        model: create_2().max(200),
        fastMode: create_6(),
        globalCacheStrategy: custom(
          (value) => typeof value === "string" && Object.hasOwn(TOOL_CHOICE_VALUES, value),
        ),
        betas: create_15(create_2().max(200)).max(100),
        autoModeActive: create_6(),
        isUsingOverage: create_6(),
        anyDeferLoading: create_6().default(false),
        is1hCacheTTL: create_6().default(false),
        queryDepth: create_3().optional(),
        cacheDiagnosis: create_6().default(false),
        effortValue: create_2().max(200),
        thinkingMode: custom(
          (value) => typeof value === "string" && Object.hasOwn(SPEED_VALUES, value),
        ).default(""),
        thinkingDisplay: custom(
          (value) => typeof value === "string" && Object.hasOwn(THINKING_DISPLAY_VALUES, value),
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
  cacheBreakSnapshotSchema = DoctorLazy(() =>
    create({
      salt: custom((value) => typeof value === "string" && normalizeUuidOrNull(value) !== null),
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
          ).max(CACHE_TTL_MS_2),
          a: create_15(create_2().regex(/^[0-9a-f]{12}$/))
            .max(200)
            .optional(),
        }),
      )
        .max(20000)
        .refine((blocks) => blocks.reduce((acc, block) => acc + block.b.length, 0) <= CACHE_TTL_MS_2),
    }),
  );
});
//@ chunk-5xgkngpb.js:1560902-1561198 placement
function outlinesFromState(prefixBreakHash) {
  let outlines = [];
  for (let message of prefixBreakHash.messages) {
    let blocks = [];
    for (let [type, rawHash, length, prefixClass] of message.b) {
      let hash = normalizeShortHash(rawHash);
      if (hash === undefined) return;
      blocks.push({
        type,
        hash,
        length,
        prefixClass,
      });
    }
    let systemAttachments = [];
    for (let rawHash of message.a ?? []) {
      let hash = normalizeShortHash(rawHash);
      if (hash === undefined) return;
      systemAttachments.push(hash);
    }
    outlines.push({
      role: message.r,
      blocks,
      systemAttachments,
    });
  }
  return outlines;
}
//@ chunk-5xgkngpb.js:1561198-1561636 placement
function hashMessages(messages, messageHashes, previous) {
  let promptCacheHashSalt = getPromptCacheHashSalt();
  let reusable = previous !== undefined && previous.rows.salt === promptCacheHashSalt ? previous : undefined;
  let hashes = [];
  let total = 0;
  for (let idx = 0; idx < messages.length; idx++) {
    let previousHash = messageHashes[idx];
    let hash =
      reusable !== undefined &&
      previousHash !== undefined &&
      previousHash !== EPHEMERAL_MESSAGE_MARK &&
      reusable.messageHashes[idx] === previousHash
        ? reusable.rows.messages[idx]
        : undefined;
    if (hash === undefined) {
      let fingerprint = messageFingerprint(messages[idx]);
      hash = {
        r: fingerprint.role,
        b: fingerprint.blocks.map((block) => [block.type, block.hash, block.length, block.prefixClass]),
        ...(fingerprint.systemAttachments.length > 0 && {
          a: [...fingerprint.systemAttachments],
        }),
      };
    }
    total += hash.b.length;
    if (total > CACHE_TTL_MS_2) break;
    hashes.push(hash);
  }
  return {
    salt: promptCacheHashSalt,
    messages: hashes,
  };
}
//@ chunk-5xgkngpb.js:1561636-1561853 placement
function messageHashesFor(messages, messageHashes, key) {
  if (messages === undefined || !isCacheBreakOutlineEnabled()) return;
  let messageHashes_2 = key?.messageHashes;
  let messageOutlines = key?.messageOutlines;
  return onceExport(() => {
    let outlines = messageOutlines?.();
    return messages.map((message, index) => {
      let previous = messageHashes[index];
      return (
        (previous !== undefined &&
        previous !== EPHEMERAL_MESSAGE_MARK &&
        messageHashes_2?.[index] === previous
          ? outlines?.[index]
          : undefined) ?? messageOutline(message)
      );
    });
  });
}
//@ chunk-5xgkngpb.js:1561853-1562656 placement
/**
 * 会话恢复时从磁盘读回上次的提示缓存状态，作为失效检测的基线。
 */
function hydrateCacheBreakState() {
  let state = promptCacheBreakState();
  if (state.hydrationAttempted || !isCacheBreakPersistenceEnabled()) return;
  state.hydrationAttempted = true;
  let previousStateBySource = state.previousStateBySource;
  try {
    verifyTempDirOwnership(getClaudeTempDirRealpath());
    let path = cacheBreakStatePath();
    if (path === null) return;
    let smallFileOrNull = readSmallFileOrNullSync(path, MAX_BASELINE_BYTES);
    if (smallFileOrNull === null) return;
    let parsed = cacheBreakStateSchema().safeParse(jsonParse(smallFileOrNull));
    if (!parsed.success) return;
    let trackedCount = countWhere(
      Object.keys(parsed.data),
      (key) => isTrackedQuerySource(key) && key.startsWith("repl_main_thread"),
    );
    let canPersist = !isCacheBreakPersisted();
    for (let [key, value] of Object.entries(parsed.data)) {
      if (previousStateBySource.size >= MAX_TRACKED_SOURCES) break;
      if (!isTrackedQuerySource(key)) continue;
      let baseKey = key.startsWith("repl_main_thread:") ? "repl_main_thread" : key;
      if (baseKey === "repl_main_thread" && trackedCount > 1) continue;
      if (previousStateBySource.has(baseKey)) continue;
      previousStateBySource.set(baseKey, {
        ...value,
        ...(canPersist && {
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
//@ chunk-5xgkngpb.js:1562656-1562917 placement
/**
 * 去掉持久化快照里的大字段（哈希前缀、内容、基线等），只留元数据。与团队无关。
 */
function stripSnapshotPayload(payload) {
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
    ...rest
  } = payload;
  return rest;
}
//@ chunk-5xgkngpb.js:1562917-1563418 placement (2.1.88 match: destroyWorktree, 0.326)
/**
 * 把各来源的上一状态（去掉大字段）排队持久化到磁盘，空则删除文件。与团队/worktree 无关。
 */
function persistPreviousStates() {
  if (!isCacheBreakPersistenceEnabled()) return;
  try {
    let state = promptCacheBreakState();
    let out = {};
    for (let [key, entry] of state.previousStateBySource) {
      if (!isTrackedQuerySource(key)) continue;
      out[key] = stripSnapshotPayload(entry);
    }
    let path = cacheBreakStatePath();
    if (path === null) return;
    let record =
      Object.keys(out).length === 0
        ? {
            action: "remove",
          }
        : {
            action: "write",
            payload: jsonStringify(out),
          };
    state.latestQueuedPersist = record;
    state.pendingPersist = state.pendingPersist
      .then(async () => {
        if (record.action === "remove") {
          verifyTempDirOwnership(getClaudeTempDirRealpath());
          await rm(path, {
            force: true,
          });
          return;
        }
        if (state.latestQueuedPersist !== record) return;
        await mkdir(getClaudeTempDirRealpath(), {
          recursive: true,
          mode: 448,
        });
        verifyTempDirOwnership(getClaudeTempDirRealpath());
        await writeFileAtomic_2(path, record.payload);
      })
      .catch(() => {});
  } catch {}
}
//@ chunk-5xgkngpb.js:1563418-1563582 fingerprint (2.1.88 match: TRACKED_SOURCE_PREFIXES, 0.811)
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
//@ chunk-5xgkngpb.js:1563582-1563626 layout
/**
 * 本次 cache_read 低于上次 95% 且少了至少 2000 token 即视为缓存断裂。
 */
function isCacheReadDrop(prevCacheReadTokens, cacheReadTokens) {
  return (
    cacheReadTokens < prevCacheReadTokens * 0.95 &&
    prevCacheReadTokens - cacheReadTokens >= MIN_CACHE_MISS_TOKENS
  );
}
//@ chunk-5xgkngpb.js:1563626-1563669 fingerprint (2.1.88 match: isExcludedModel, 1)
/**
 * 模型名含 haiku 的不做断裂检测。
 */
function isExcludedModel(model) {
  return model.includes("haiku");
}
//@ chunk-5xgkngpb.js:1563669-1563839 fingerprint (2.1.88 match: getTrackingKey, 1)
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
//@ chunk-5xgkngpb.js:1563839-1563948 layout (2.1.88 match: stripCacheControl, 1)
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
//@ chunk-5xgkngpb.js:1563948-1564013 layout
/**
 * 块的 text 字段（字符串时）。
 */
function getBlockText(block) {
  let text = block.text;
  return typeof text === "string" ? text : undefined;
}
//@ chunk-5xgkngpb.js:1564013-1564107 fingerprint (2.1.88 match: computePerToolHashes, 1)
/**
 * 每个工具 schema 的哈希表（按工具名）。
 */
function computePerToolHashes(strippedTools, names) {
  let hashes = {};
  for (let i = 0; i < strippedTools.length; i++)
    hashes[names[i] ?? `__idx_${i}`] = computeHash(strippedTools[i]);
  return hashes;
}
//@ chunk-5xgkngpb.js:1564107-1564341 layout
/**
 * 两个对象键集相同、值全等且除指定键外都是原始值。
 */
function isShallowEqualExcept(a, b, keys) {
  if (!isPlainObject(a) || !isPlainObject(b)) return false;
  let keys_2 = Object.keys(a);
  if (!arraysEqual_2(keys_2, Object.keys(b))) return false;
  for (let key of keys_2) {
    let value = a[key];
    if (value !== b[key]) return false;
    if (!(value === null || (typeof value !== "object" && typeof value !== "function")) && key !== keys)
      return false;
  }
  return true;
}
//@ chunk-5xgkngpb.js:1564341-1564509 layout
/**
 * 计算条目数组哈希；与上次条目浅相等时复用上次哈希。
 */
function hashEntriesReusing(entries, hashes, previous) {
  let reusable =
    hashes !== undefined &&
    hashes.entries.length === entries.length &&
    entries.every((entry, index) => isShallowEqualExcept(entry, hashes.entries[index], previous));
  return {
    entries: entries.map((entry) =>
      isPlainObject(entry)
        ? {
            ...entry,
          }
        : entry,
    ),
    hash: reusable ? hashes.hash : computeHash(entries),
  };
}
//@ chunk-5xgkngpb.js:1564509-1564578 file-local
/**
 * system 块文本总字符数。
 */
function getSystemCharCount(system) {
  let total = 0;
  for (let block of system) total += getBlockText(block)?.length ?? 0;
  return total;
}
//@ chunk-5xgkngpb.js:1564578-1565514 layout
/**
 * 比较前后两次请求的标量：system/工具/模型/fast/cache_control/全局缓存策略/beta/auto mode/超额/诊断/effort/thinking/额外 body/defer_loading 是否变化。
 */
function diffPromptScalars(prev, next) {
  return {
    systemPromptChanged: next.systemHash !== prev.systemHash,
    toolSchemasChanged: next.toolsHash !== prev.toolsHash,
    modelChanged: next.model !== prev.model,
    fastModeChanged: next.fastMode !== prev.fastMode,
    cacheControlChanged: next.cacheControlHash !== prev.cacheControlHash,
    globalCacheStrategyChanged: next.globalCacheStrategy !== prev.globalCacheStrategy,
    betasChanged:
      next.betas.length !== prev.betas.length || next.betas.some((beta, index) => beta !== prev.betas[index]),
    autoModeChanged: next.autoModeActive !== prev.autoModeActive,
    overageChanged: next.isUsingOverage !== prev.isUsingOverage,
    cacheDiagnosisChanged: next.cacheDiagnosis !== prev.cacheDiagnosis,
    effortChanged: next.effortValue !== prev.effortValue,
    thinkingModeChanged:
      prev.thinkingMode !== "" && next.thinkingMode !== "" && next.thinkingMode !== prev.thinkingMode,
    thinkingDisplayChanged:
      prev.thinkingMode !== "" &&
      next.thinkingMode === prev.thinkingMode &&
      next.thinkingDisplay !== prev.thinkingDisplay,
    extraBodyChanged: next.extraBodyHash !== prev.extraBodyHash,
    deferLoadingPresenceChanged: next.anyDeferLoading !== prev.anyDeferLoading,
  };
}
//@ chunk-5xgkngpb.js:1565514-1565647 file-local
/**
 * 跟踪来源数超过上限时淘汰旧条目（优先淘汰非主线程）。
 */
function cleanupAgentTracking(agentId) {
  let maxSources = isPrefixBreakSampled() ? MAX_TRACKED_SOURCES_ANT : MAX_TRACKED_SOURCES;
  while (agentId.size >= maxSources) {
    let keys = [...agentId.keys()];
    let evictable = keys.find((key) => !isTrackedQuerySource(key)) ?? keys[0];
    if (evictable === undefined) break;
    agentId.delete(evictable);
  }
}
//@ chunk-5xgkngpb.js:1565647-1571201 fingerprint (2.1.88 match: recordPromptState, 0.62)
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
    let forkKeyOverride =
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
    if (key === null && forkKeyOverride === undefined) return;
    let messageHashes = getMessageHashes();
    let filtered = stripCacheControlAll(system).filter((block) => !isUncachedSystemBlock(block));
    let strippedSystem = stripCacheControlAll(toolSchemas);
    hydrateCacheBreakState();
    let previousStateBySource = promptCacheBreakState().previousStateBySource;
    let previousState = key === null ? undefined : previousStateBySource.get(key);
    let hashedPrefix = {
      system: hashEntriesReusing(filtered, previousState?.hashedPrefix?.system),
      tools: hashEntriesReusing(strippedSystem, previousState?.hashedPrefix?.tools, "input_schema"),
    };
    let systemHash = hashedPrefix.system.hash;
    let toolsHash = hashedPrefix.tools.hash;
    let cacheControlHash = computeHash(
      system
        .filter((block) => !isUncachedSystemBlock(block))
        .map((block) => ("cache_control" in block ? block.cache_control : null)),
    );
    let toolNames = toolSchemas.map((t) => ("name" in t ? t.name : "unknown"));
    let computeToolHashes = () => computePerToolHashes(strippedSystem, toolNames);
    let perBlockHashes = () => filtered.map((block) => computeHash(block));
    let perBlockLengths = () => filtered.map((block) => getBlockText(block)?.length ?? 0);
    let systemCharCount = getSystemCharCount(filtered);
    let messages_2 = undefined;
    let lazyDiffableContent = () => ({
      model,
      system,
      tools: toolSchemas,
      messages: messages_2,
    });
    let msg0Shape = messages ? noopShape(messages) : undefined;
    let sysFoldShape = messages && isCacheBreakOutlineEnabled() ? foldedAttachmentIndex(messages) : undefined;
    let sampledMessages = isPrefixBreakSampled() ? messages : undefined;
    let isFastMode = fastMode ?? false;
    let sortedBetas = [...betas].sort();
    let effortStr = effortValue === undefined ? "" : String(effortValue);
    let thinkingMode = thinkingConfig === undefined ? "" : thinkingConfig.type === "disabled" ? "off" : "on";
    let thinkingDisplay =
      thinkingConfig === undefined || thinkingConfig.type === "disabled"
        ? ""
        : (thinkingConfig.display ?? "");
    let extraBodyHash = extraBodyParams === undefined ? 0 : computeHash(extraBodyParams);
    let scalars = {
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
      thinkingMode,
      thinkingDisplay,
      extraBodyHash,
      anyDeferLoading,
    };
    if (key === null) {
      if (forkKeyOverride !== undefined)
        recordSummaryFork_2({
          ...forkKeyOverride,
          scalars,
          messageHashes,
          messages: sampledMessages,
        });
      return;
    }
    let messageOutlines = messageHashesFor(messages, messageHashes, previousState);
    let hashPrefixBreak =
      sampledMessages !== undefined && isTrackedQuerySource(key) && canPersistCacheBreakState();
    if (!previousState) {
      cleanupAgentTracking(previousStateBySource);
      previousStateBySource.set(key, {
        systemHash,
        toolsHash,
        hashedPrefix,
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
        thinkingMode,
        thinkingDisplay,
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
        hashSampleMessages: sampledMessages,
        perToolHashes: computeToolHashes(),
        perBlockHashes: perBlockHashes(),
        perBlockLengths: perBlockLengths(),
        prefixBreakHash: hashPrefixBreak
          ? hashMessages(sampledMessages, messageHashes, undefined)
          : undefined,
      });
      if (!isNarrationClassifierExcludedModel(model)) persistPreviousStates();
      return;
    }
    previousState.callCount++;
    previousState.baselineHashSource =
      previousState.hashSampleMessages !== undefined
        ? "memory"
        : previousState.hydratedHashRows !== undefined
          ? "disk"
          : "none";
    previousState.diffedAgainst =
      previousState.diffedAgainst === undefined && previousState.baselineFromDisk ? "disk" : "memory";
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
    } = diffPromptScalars(previousState, scalars);
    let firstChangedHash = findFirstChangedHash(previousState.messageHashes, messageHashes);
    let messagesHistoryChanged = firstChangedHash !== -1;
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
      messagesHistoryChanged
    ) {
      let prevToolSet = new Set(previousState.toolNames);
      let newToolSet = new Set(toolNames);
      let prevBetaSet = new Set(previousState.betas);
      let newBetaSet = new Set(sortedBetas);
      let addedTools = toolNames.filter((n) => !prevToolSet.has(n));
      let removedTools = previousState.toolNames.filter((n) => !newToolSet.has(n));
      let changedToolSchemas = [];
      if (toolSchemasChanged) {
        let newHashes = computeToolHashes();
        for (let name of toolNames) {
          if (!prevToolSet.has(name)) continue;
          if (newHashes[name] !== previousState.perToolHashes[name]) changedToolSchemas.push(name);
        }
        previousState.perToolHashes = newHashes;
      }
      let previousBlockCount = previousState.perBlockHashes.length;
      let newBlockCount = filtered.length;
      let changedBlockIndices = [];
      let changedBlockLengthDeltas = [];
      if (systemPromptChanged) {
        let newBlockHashes = perBlockHashes();
        let newBlockLengths = perBlockLengths();
        if (newBlockCount === previousBlockCount) {
          for (let idx = 0; idx < newBlockCount; idx++)
            if (newBlockHashes[idx] !== previousState.perBlockHashes[idx]) {
              changedBlockIndices.push(idx);
              changedBlockLengthDeltas.push(newBlockLengths[idx] - previousState.perBlockLengths[idx]);
            }
        }
        previousState.perBlockHashes = newBlockHashes;
        previousState.perBlockLengths = newBlockLengths;
      }
      previousState.pendingChanges = {
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
        messagesHistoryChanged,
        firstChangedMessageIndex: firstChangedHash,
        prevMessageCount: previousState.messageHashes.length,
        addedToolCount: addedTools.length,
        removedToolCount: removedTools.length,
        addedTools,
        removedTools,
        changedToolSchemas,
        prevBlockCount: previousBlockCount,
        newBlockCount,
        changedBlockIndices,
        changedBlockLengthDeltas,
        systemCharDelta: systemCharCount - previousState.systemCharCount,
        previousModel: previousState.model,
        newModel: model,
        previousBetas: previousState.betas,
        prevGlobalCacheStrategy: previousState.globalCacheStrategy,
        newGlobalCacheStrategy: globalCacheStrategy,
        addedBetas: sortedBetas.filter((beta) => !prevBetaSet.has(beta)),
        removedBetas: previousState.betas.filter((beta) => !newBetaSet.has(beta)),
        prevEffortValue: previousState.effortValue,
        newEffortValue: effortStr,
        prevThinkingMode: previousState.thinkingMode,
        newThinkingMode: thinkingMode,
        prevThinkingDisplay: previousState.thinkingDisplay,
        newThinkingDisplay: thinkingDisplay,
        prevContent: previousState.content,
        prevMsg0Shape: previousState.msg0Shape,
        prevSysFoldShape: previousState.sysFoldShape,
        prevMessageOutlines: previousState.messageOutlines,
        prevHashSampleMessages: previousState.hashSampleMessages,
        prevHydratedHashRows: previousState.hydratedHashRows,
      };
    } else previousState.pendingChanges = null;
    let prefixBreakHash = hashPrefixBreak
      ? hashMessages(
          sampledMessages,
          messageHashes,
          previousState.prefixBreakHash && {
            rows: previousState.prefixBreakHash,
            messageHashes: previousState.messageHashes,
          },
        )
      : undefined;
    previousState.systemHash = systemHash;
    previousState.toolsHash = toolsHash;
    previousState.hashedPrefix = hashedPrefix;
    previousState.cacheControlHash = cacheControlHash;
    previousState.toolNames = toolNames;
    previousState.systemCharCount = systemCharCount;
    previousState.model = model;
    previousState.fastMode = isFastMode;
    previousState.globalCacheStrategy = globalCacheStrategy;
    previousState.betas = sortedBetas;
    previousState.autoModeActive = autoModeActive;
    previousState.isUsingOverage = isUsingOverage;
    previousState.is1hCacheTTL = is1hCacheTTL;
    previousState.queryDepth = queryDepth;
    previousState.cacheDiagnosis = cacheDiagnosis;
    previousState.effortValue = effortStr;
    previousState.thinkingMode = thinkingMode;
    previousState.thinkingDisplay = thinkingDisplay;
    previousState.extraBodyHash = extraBodyHash;
    previousState.anyDeferLoading = anyDeferLoading;
    previousState.buildVersion = CACHE_BREAK_HINTS;
    previousState.baselineMessageHashes = previousState.messageHashes;
    previousState.messageHashes = messageHashes;
    previousState.msg0Shape = msg0Shape;
    previousState.sysFoldShape = sysFoldShape;
    previousState.messageOutlines = messageOutlines;
    previousState.content = lazyDiffableContent;
    previousState.hashSampleMessages = sampledMessages;
    previousState.prefixBreakHash = prefixBreakHash;
    previousState.hydratedHashRows = undefined;
    if (!isNarrationClassifierExcludedModel(model)) persistPreviousStates();
  } catch (e) {
    logError(e);
  }
}
//@ chunk-5xgkngpb.js:1571201-1571549 layout
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
//@ chunk-5xgkngpb.js:1571549-1573727 layout
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
    let previous = promptCacheBreakState().previousStateBySource.get(trackingKey);
    if (!previous) return;
    let messageHashes = getMessageHashes();
    previous.baselineMessageHashes ??= previous.messageHashes;
    let { baselineMessageHashes, content } = previous;
    let { model, system, tools } = content();
    let messages_2 = undefined;
    let { msg0Shape, sysFoldShape, messageOutlines, hashSampleMessages } = previous;
    let prefixBreak = previous.prefixBreakHash && {
      rows: previous.prefixBreakHash,
      messageHashes: previous.messageHashes,
    };
    previous.messageOutlines = messageHashesFor(messages, messageHashes, previous);
    previous.messageHashes = messageHashes;
    previous.msg0Shape = noopShape(messages);
    previous.sysFoldShape = isCacheBreakOutlineEnabled() ? foldedAttachmentIndex(messages) : undefined;
    previous.content = () => ({
      model,
      system,
      tools,
      messages: messages_2,
    });
    previous.hashSampleMessages = isPrefixBreakSampled() ? messages : undefined;
    previous.prefixBreakHash =
      previous.hashSampleMessages !== undefined &&
      isTrackedQuerySource(trackingKey) &&
      canPersistCacheBreakState()
        ? hashMessages(previous.hashSampleMessages, messageHashes, prefixBreak)
        : undefined;
    let firstChangedHash = findFirstChangedHash(baselineMessageHashes, messageHashes);
    let pendingChanges = previous.pendingChanges;
    if (pendingChanges) {
      let changes = {
        ...pendingChanges,
        messagesHistoryChanged: firstChangedHash !== -1,
        firstChangedMessageIndex: firstChangedHash,
      };
      previous.pendingChanges = CHANGE_KINDS.some((kind) => changes[kind]) ? changes : null;
    } else if (firstChangedHash !== -1) {
      previous.baselineHashSource = hashSampleMessages !== undefined ? "memory" : "none";
      previous.pendingChanges = {
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
        prevBlockCount: previous.perBlockHashes.length,
        newBlockCount: previous.perBlockHashes.length,
        changedBlockIndices: [],
        changedBlockLengthDeltas: [],
        previousModel: model,
        newModel: model,
        previousBetas: previous.betas,
        prevGlobalCacheStrategy: previous.globalCacheStrategy,
        newGlobalCacheStrategy: previous.globalCacheStrategy,
        addedBetas: [],
        removedBetas: [],
        prevEffortValue: previous.effortValue,
        newEffortValue: previous.effortValue,
        prevThinkingMode: previous.thinkingMode,
        newThinkingMode: previous.thinkingMode,
        prevThinkingDisplay: previous.thinkingDisplay,
        newThinkingDisplay: previous.thinkingDisplay,
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
//@ chunk-5xgkngpb.js:1573727-1573845 layout
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
//@ chunk-5xgkngpb.js:1573845-1573908 layout
/**
 * 两个哈希数组首个不同的下标（-1 表示相同）。
 */
function findFirstChangedHash(hashes, messageHashes) {
  return hashes.findIndex((hash, index) => hash !== EPHEMERAL_MESSAGE_MARK && messageHashes[index] !== hash);
}
//@ chunk-5xgkngpb.js:1573908-1574216 layout
/**
 * 本来源待定变化的类型列表、首个变化消息下标、基线来源、调用次数（遥测用）。
 */
function getPendingChangeSummary(source, trackingKey) {
  try {
    let { changes, baseline, callNumber } = getPendingChangesForSource(source, trackingKey);
    return {
      kinds: changes ? fromEnumArr(CHANGE_KINDS.filter((kind) => changes[kind])) : lit_2("none"),
      firstChangedMessageIndex: changes?.firstChangedMessageIndex ?? -1,
      baseline,
      callNumber,
    };
  } catch (error) {
    logError(error);
    return {
      kinds: lit_2("none"),
      firstChangedMessageIndex: -1,
      baseline: lit_2("none"),
      callNumber: undefined,
    };
  }
}
//@ chunk-5xgkngpb.js:1574216-1574518 layout
/**
 * 取来源状态、待定变化与基线类型（磁盘基线未比对时不报变化）。
 */
function getPendingChangesForSource(source, trackingKey) {
  let trackingKey_2 = getTrackingKey(source, trackingKey);
  let previous = trackingKey_2 ? promptCacheBreakState().previousStateBySource.get(trackingKey_2) : undefined;
  if (previous?.diffedAgainst === "disk" && needsResumeBaseline(previous))
    return {
      state: previous,
      changes: undefined,
      baseline: lit_2("none"),
      callNumber: previous.callCount,
    };
  return {
    state: previous,
    changes: previous?.pendingChanges ?? undefined,
    baseline: fromEnumOpt(previous?.diffedAgainst) ?? lit_2("none"),
    callNumber: previous?.callCount,
  };
}
//@ chunk-5xgkngpb.js:1574518-1576418 fingerprint (2.1.88 match: checkResponseForCacheBreak, 0.586)
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
//@ chunk-5xgkngpb.js:1576418-1576497 layout
/**
 * 段列表格式化为 "名:长度" 脱敏串。
 */
function formatSectionLengths(lengths) {
  return joinSafe(
    lengths.sections.map((section) =>
      concatSafe(fromEnum(section.name), lit_2(":"), fromNumber(section.len)),
    ),
  );
}
//@ chunk-5xgkngpb.js:1576497-1577092 layout
/**
 * 首条消息变化时比较其分段形状（工作者工具数等）给出变化段。
 */
function describeFirstMessageChange(pendingChanges, msg0Shape) {
  if (!pendingChanges?.messagesHistoryChanged || pendingChanges.firstChangedMessageIndex !== 0 || !msg0Shape)
    return {};
  let prevMsg0Shape = pendingChanges.prevMsg0Shape;
  let compare = (block) =>
    block?.workerTools ? [block.workerTools.toolCount, block.workerTools.mcpServerCount] : [-1, -1];
  let result = {
    msg0Sections: formatSectionLengths(msg0Shape),
    msg0WorkerTools: fromNumberArr([...compare(prevMsg0Shape), ...compare(msg0Shape)]),
  };
  if (!prevMsg0Shape) return result;
  let diff = diffSystemParts(prevMsg0Shape, msg0Shape);
  return {
    ...result,
    msg0PrevSections: formatSectionLengths(prevMsg0Shape),
    msg0ChangedSections: joinSafe(
      diff.changedSections.map((changedSection) =>
        concatSafe(fromEnum(changedSection.name), lit_2(":"), fromNumber(changedSection.delta)),
      ),
    ),
    msg0AddedSections: fromEnumArr(diff.addedSections),
    msg0RemovedSections: fromEnumArr(diff.removedSections),
    msg0ChangedBlocks: joinSafe(
      diff.changedBlocks.map((changedBlock) =>
        concatSafe(
          fromNumber(changedBlock.index),
          lit_2(":"),
          fromEnum(changedBlock.kind),
          lit_2(":"),
          fromNumber(changedBlock.delta),
        ),
      ),
    ),
  };
}
//@ chunk-5xgkngpb.js:1577092-1577146 layout
/**
 * 形状各部分展开后格式化（遥测）。
 */
function formatShapeParts(parts) {
  return joinSafe(parts.flatMap((part) => normalizeShortHash(part) ?? []));
}
//@ chunk-5xgkngpb.js:1577146-1577706 layout
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
  let step = {
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
  if (!prevSysFoldShape || !sysFoldShape) return step;
  let diff = diffPromptParts(prevSysFoldShape, sysFoldShape);
  return {
    ...step,
    sysFoldChangedParts: positionedOutlineKey(diff.changedParts),
    sysFoldAddedTypes: formatShapeParts(diff.addedTypes),
    sysFoldRemovedTypes: formatShapeParts(diff.removedTypes),
    sysFoldReordered: diff.reordered,
    sysFoldOtherDelta: diff.otherDelta,
    sysFoldLenDelta: sysFoldShape.len - prevSysFoldShape.len,
  };
}
//@ chunk-5xgkngpb.js:1577706-1583229 layout
/**
 * 响应后检查：按 cache_read 降幅与 pendingChanges 判断是否断裂，结合距上次回答是否超过 5 分钟/1 小时（TTL 过期）上报原因。
 */
async function checkResponseForCacheBreak(
  querySource,
  cacheReadInputTokens,
  cacheCreationInputTokens,
  messages,
  agentId,
  requestId,
  previousMessageId,
  forceCheck,
) {
  let key = getTrackingKey(querySource, agentId);
  if (!key) {
    if (querySource === AGENT_SUMMARY && agentId !== undefined)
      checkSummaryForkCacheBreak(agentId, {
        requestId,
        cacheReadTokens: cacheReadInputTokens,
        cacheCreationTokens: cacheCreationInputTokens,
      });
    return;
  }
  let state = promptCacheBreakState().previousStateBySource.get(key);
  if (!state) return;
  if (isExcludedModel(state.model)) return;
  try {
    let prevCacheReadTokens = state.prevCacheReadTokens;
    state.prevCacheReadTokens = cacheReadInputTokens;
    let baselineFromDisk = state.baselineFromDisk;
    state.baselineFromDisk = false;
    let shouldUseResumeBaseline = baselineFromDisk && needsResumeBaseline(state);
    let resumeBaseline = state.resumeBaseline;
    state.resumeBaseline = undefined;
    let last = messages.findLast((m) => m.type === "assistant");
    let sinceLastAssistantMs = last ? Date.now() - new Date(last.timestamp).getTime() : null;
    let lastAssistantOver5min = sinceLastAssistantMs !== null && sinceLastAssistantMs > CACHE_TTL_5M_MS;
    let lastAssistantOver1h = sinceLastAssistantMs !== null && sinceLastAssistantMs > CACHE_TTL_1H_MS;
    if (prevCacheReadTokens === null) {
      state.pendingChanges = null;
      return;
    }
    let pendingChanges = state.pendingChanges;
    if (shouldUseResumeBaseline) {
      if (!state.cacheDeletionsPending) {
        let cacheReadDropped = isCacheReadDrop(prevCacheReadTokens, cacheReadInputTokens);
        if (pendingChanges || cacheReadDropped)
          reportCacheBreak(state, pendingChanges, {
            requestId,
            querySource,
            cacheBroke: cacheReadDropped,
            baselineFromDisk,
            prevCacheReadTokens,
            cacheReadTokens: cacheReadInputTokens,
            cacheCreationTokens: cacheCreationInputTokens,
            lastAssistantMsgOver5minAgo: lastAssistantOver5min,
            lastAssistantMsgOver1hAgo: lastAssistantOver1h,
          });
      }
      state.pendingChanges = null;
      return;
    }
    if (state.cacheDeletionsPending) {
      state.cacheDeletionsPending = false;
      logForDebugging(
        `[PROMPT CACHE] cache deletion applied, cache read: ${prevCacheReadTokens} \u2192 ${cacheReadInputTokens} (expected drop)`,
      );
      state.pendingChanges = null;
      return;
    }
    let cacheBroke = isCacheReadDrop(prevCacheReadTokens, cacheReadInputTokens);
    if (pendingChanges || cacheBroke)
      reportCacheBreak(state, pendingChanges, {
        requestId,
        querySource,
        cacheBroke,
        baselineFromDisk,
        prevCacheReadTokens,
        cacheReadTokens: cacheReadInputTokens,
        cacheCreationTokens: cacheCreationInputTokens,
        lastAssistantMsgOver5minAgo: lastAssistantOver5min,
        lastAssistantMsgOver1hAgo: lastAssistantOver1h,
      });
    if (!cacheBroke) {
      state.pendingChanges = null;
      return;
    }
    let breakReasons = pendingChanges ? checkResponseForCacheBreak_2(pendingChanges, baselineFromDisk) : [];
    let reasonsText;
    if (breakReasons.length > 0) reasonsText = breakReasons.join(", ");
    else if (lastAssistantOver1h) reasonsText = "possible 1h TTL expiry (prompt unchanged)";
    else if (lastAssistantOver5min) reasonsText = "possible 5min TTL expiry (prompt unchanged)";
    else if (sinceLastAssistantMs !== null) reasonsText = "likely server-side (prompt unchanged, <5min gap)";
    else reasonsText = "unknown cause";
    if (forceCheck ?? (isCacheBreakTrackedSource(querySource, agentId) && querySource !== "compact")) {
      let causes = [];
      if (pendingChanges?.systemPromptChanged) causes.push("system_prompt_changed");
      if (pendingChanges?.toolSchemasChanged) causes.push("tools_changed");
      if (pendingChanges?.modelChanged) causes.push("model_changed");
      if (pendingChanges?.fastModeChanged) causes.push("fast_mode_changed");
      if (
        pendingChanges &&
        (pendingChanges.globalCacheStrategyChanged ||
          (pendingChanges.cacheControlChanged && !pendingChanges.systemPromptChanged))
      )
        causes.push("cache_scope_or_ttl_changed");
      if (pendingChanges?.betasChanged) causes.push("betas_changed");
      if (pendingChanges?.effortChanged) causes.push("effort_changed");
      if (pendingChanges?.thinkingModeChanged) causes.push("thinking_mode_changed");
      if (pendingChanges?.thinkingDisplayChanged) causes.push("thinking_display_changed");
      if (pendingChanges?.autoModeChanged) causes.push("auto_mode_changed");
      if (pendingChanges?.overageChanged) causes.push("overage_changed");
      if (pendingChanges?.extraBodyChanged || pendingChanges?.cacheDiagnosisChanged)
        causes.push("extra_body_changed");
      if (pendingChanges?.deferLoadingPresenceChanged) causes.push("defer_loading_changed");
      if (pendingChanges?.messagesHistoryChanged) causes.push("messages_rewritten");
      if (causes.length === 0) {
        let ttlExpired = state.is1hCacheTTL ? lastAssistantOver1h : lastAssistantOver5min;
        causes.push(
          ttlExpired
            ? state.is1hCacheTTL
              ? "ttl_expired_1h"
              : "ttl_expired_5m"
            : sinceLastAssistantMs !== null
              ? "likely_server_side"
              : "unknown",
        );
      }
      attributePromptCacheMiss(MAIN, {
        causes,
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
        systemHash: state.systemHash,
        toolsHash: state.toolsHash,
        is1hCacheTTL: state.is1hCacheTTL,
        queryDepth: state.queryDepth,
        querySource: agentTypeForTelemetry(querySource),
        model: telemetrySafeModelName(state.model),
        globalCacheStrategy: fromEnum(state.globalCacheStrategy),
        callNumber: state.callCount,
        prevCacheReadTokens,
        cacheReadTokens: cacheReadInputTokens,
        cacheCreationTokens: cacheCreationInputTokens,
        timeSinceLastAssistantMsg: sinceLastAssistantMs ?? -1,
        lastAssistantMsgOver5minAgo: lastAssistantOver5min,
        lastAssistantMsgOver1hAgo: lastAssistantOver1h,
        isCowork: env.CLAUDE_CODE_IS_COWORK,
        isDesktop: isManagedOAuthContext_2(),
        baselineFromDisk,
        versionChanged: !baselineFromDisk
          ? false
          : !state.baselineBuildVersion
            ? undefined
            : state.baselineBuildVersion !== CACHE_BREAK_HINTS,
        ...describeFirstMessageChange(pendingChanges, state.msg0Shape),
        ...describeSystemFoldChange(pendingChanges, state.sysFoldShape),
        ...(pendingChanges?.messagesHistoryChanged &&
          changedMessageFields(
            pendingChanges.prevMessageOutlines?.()?.[pendingChanges.firstChangedMessageIndex],
            state.messageOutlines?.()?.[pendingChanges.firstChangedMessageIndex],
          )),
        isSubagent: agentId !== undefined,
        isResume: resumeBaseline !== undefined,
        resumedInNewProcess: resumeBaseline?.newProcess === true,
        prevMessageCount: state.baselineMessageHashes?.length ?? -1,
        newMessageCount: state.messageHashes.length,
        requestId: sanitizeMarkName(requestId) ?? lit_2(""),
        previousMessageId: sanitizeMarkName(previousMessageId) ?? lit_2(""),
      });
    let outlineDiff;
    if (isCacheBreakOutlineEnabled()) {
      let diffSuffix = outlineDiff ? `, diff: ${outlineDiff}` : "";
      let summary = `[PROMPT CACHE BREAK] ${reasonsText} [source=${querySource}, call #${state.callCount}, cache read: ${prevCacheReadTokens} \u2192 ${cacheReadInputTokens}, creation: ${cacheCreationInputTokens}${diffSuffix}]`;
      logForDebugging(summary, {
        level: "warn",
      });
    }
    state.pendingChanges = null;
  } catch (e) {
    logError(e);
  } finally {
    persistPreviousStates();
  }
}
//@ chunk-5xgkngpb.js:1583229-1584332 layout
/**
 * 上报一次缓存断裂（模型、beta、变化类型、cache read/creation、TTL 是否过期）。
 */
function reportCacheBreak(
  input,
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
    let sampleRate = prefixBreakSampleRate();
    if (!isSampledIn(getSessionId(), sampleRate)) return;
    explainCacheBreak({
      requestId,
      model: input.model,
      prevModel: pendingChanges?.previousModel ?? input.model,
      prevBetas: pendingChanges?.previousBetas ?? input.betas,
      newBetas: input.betas,
      cacheBroke,
      changeKinds: pendingChanges
        ? fromEnumArr(CHANGE_KINDS.filter((kind) => pendingChanges[kind]))
        : lit_2("none"),
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
      prevSource: input.baselineHashSource ?? "none",
      newMessages: input.hashSampleMessages,
      prevMessageCount: input.baselineMessageHashes?.length ?? -1,
      newMessageCount: input.messageHashes.length,
      callNumber: input.callCount,
      baselineFromDisk,
      baselineKind: "previous_request",
      prevCacheReadTokens,
      cacheReadTokens,
      cacheCreationTokens,
      sampleRate,
      is1hCacheTTL: input.is1hCacheTTL,
      lastAssistantMsgOver5minAgo,
      lastAssistantMsgOver1hAgo,
      querySource: agentTypeForTelemetry(querySource),
    });
  } catch (error) {
    logError(error);
  }
}
//@ chunk-5xgkngpb.js:1584332-1584386 layout
/**
 * 去掉 messagesHistoryChanged 的变化类型。
 */
var SCALAR_CHANGE_KINDS; // deferred: uses CHANGE_KINDS of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:1584332", () => {
  SCALAR_CHANGE_KINDS = CHANGE_KINDS.filter((kind) => kind !== "messagesHistoryChanged");
});
//@ chunk-5xgkngpb.js:1584386-1585040 layout
/**
 * 摘要代理分叉：记录相对父来源的标量变化与消息基线。
 */
function recordSummaryFork_2({ forkAgentId, parentKey, scalars, messageHashes, messages }) {
  let { previousStateBySource, summaryForks } = promptCacheBreakState();
  let parent = previousStateBySource.get(parentKey);
  let diff = parent ? diffPromptScalars(parent, scalars) : undefined;
  summaryForks.delete(forkAgentId);
  while (summaryForks.size >= MAX_SUMMARY_FORKS) {
    let oldestFork = summaryForks.keys().next().value;
    if (oldestFork === undefined) break;
    summaryForks.delete(oldestFork);
  }
  summaryForks.set(forkAgentId, {
    parentFound: parent !== undefined,
    parentMessageHashes: parent?.messageHashes ?? [],
    prevMessages: parent?.hashSampleMessages,
    prevCacheReadTokens: parent?.prevCacheReadTokens ?? null,
    callNumber: parent?.callCount ?? 0,
    model: scalars.model,
    prevModel: parent?.model ?? scalars.model,
    prevBetas: parent?.betas ?? scalars.betas,
    newBetas: scalars.betas,
    scalarFlags: diff ? SCALAR_CHANGE_KINDS.filter((kind) => diff[kind]) : [],
    firstChangedMessageIndex: parent ? findFirstChangedHash(parent.messageHashes, messageHashes) : -1,
    newMessages: messages,
    newMessageCount: messageHashes.length,
  });
}
//@ chunk-5xgkngpb.js:1585040-1585242 layout
/**
 * 摘要分叉补记本次消息与首个变化下标。
 */
function updateSummaryForkMessages(agentId, messages, getMessageHashes) {
  let fork = promptCacheBreakState().summaryForks.get(agentId);
  if (!fork) return;
  let hashes = getMessageHashes();
  fork.newMessages = isPrefixBreakSampled() ? messages : undefined;
  fork.newMessageCount = hashes.length;
  fork.firstChangedMessageIndex = fork.parentFound
    ? findFirstChangedHash(fork.parentMessageHashes, hashes)
    : -1;
}
//@ chunk-5xgkngpb.js:1585242-1586408 layout
/**
 * 摘要分叉响应后的断裂检查与上报。
 */
function checkSummaryForkCacheBreak(agentId, { requestId, cacheReadTokens, cacheCreationTokens }) {
  try {
    let { summaryForks } = promptCacheBreakState();
    let fork = summaryForks.get(agentId);
    if (!fork) return;
    summaryForks.delete(agentId);
    if (isExcludedModel(fork.model)) return;
    let sampleRate = prefixBreakSampleRate();
    if (!isSampledIn(getSessionId(), sampleRate)) return;
    let prevCacheReadTokens = fork.prevCacheReadTokens;
    let cacheReadDropped =
      prevCacheReadTokens !== null && isCacheReadDrop(prevCacheReadTokens, cacheReadTokens);
    let hasFirstChange = fork.firstChangedMessageIndex !== -1;
    if (fork.parentFound && fork.scalarFlags.length === 0 && !hasFirstChange && !cacheReadDropped) return;
    let flags = [...fork.scalarFlags, ...(hasFirstChange ? ["messagesHistoryChanged"] : [])];
    explainCacheBreak({
      requestId,
      model: fork.model,
      prevModel: fork.prevModel,
      prevBetas: fork.prevBetas,
      newBetas: fork.newBetas,
      cacheBroke: cacheReadDropped,
      changeKinds: flags.length > 0 ? fromEnumArr(flags) : lit_2("none"),
      firstChangedMessageIndex: fork.firstChangedMessageIndex,
      prev:
        fork.prevMessages !== undefined
          ? {
              source: "memory",
              messages: fork.prevMessages,
            }
          : {
              source: "none",
            },
      prevSource: fork.prevMessages !== undefined ? "memory" : "none",
      newMessages: fork.newMessages,
      prevMessageCount: fork.parentFound ? fork.parentMessageHashes.length : -1,
      newMessageCount: fork.newMessageCount,
      callNumber: fork.callNumber,
      baselineFromDisk: false,
      baselineKind: fork.parentFound ? "parent_agent" : "parent_agent_missing",
      prevCacheReadTokens: prevCacheReadTokens ?? -1,
      cacheReadTokens,
      cacheCreationTokens,
      sampleRate,
      is1hCacheTTL: undefined,
      lastAssistantMsgOver5minAgo: undefined,
      lastAssistantMsgOver1hAgo: undefined,
      querySource: agentTypeForTelemetry(AGENT_SUMMARY),
    });
  } catch (error) {
    logError(error);
  }
}
//@ chunk-5xgkngpb.js:1586408-1586535 layout
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
//@ chunk-5xgkngpb.js:1586535-1586579 layout
/**
 * 诊断类型是否已知。
 */
function isKnownCacheDiagnosisType(type) {
  return Object.hasOwn(KNOWN_CACHE_DIAGNOSIS_TYPES, type);
}
//@ chunk-5xgkngpb.js:1586579-1587045 layout
/**
 * 记 tengu_prompt_cache_diagnosis_received（诊断类型、缺失 token 等）。
 */
function logCacheDiagnosisReceived(info, detail) {
  try {
    logEvent("tengu_prompt_cache_diagnosis_received", {
      diagnosisType:
        typeof info.type !== "string"
          ? undefined
          : isKnownCacheDiagnosisType(info.type)
            ? fromEnum(info.type)
            : lit_2("other"),
      tokensMissed: typeof info.cache_missed_input_tokens === "number" ? info.cache_missed_input_tokens : -1,
      requestId: sanitizeMarkName(detail.requestId) ?? lit_2(""),
      previousMessageId: sanitizeMarkName(detail.previousMessageId) ?? lit_2(""),
      model: telemetrySafeModelName(detail.model),
      isCowork: env.CLAUDE_CODE_IS_COWORK,
      is1hCacheTTL: detail.is1hCacheTTL,
      querySource: agentTypeForTelemetry(detail.querySource),
      queryDepth: detail.queryDepth,
    });
  } catch (error) {
    logError(error);
  }
}
//@ chunk-5xgkngpb.js:1587045-1587316 fingerprint (2.1.88 match: notifyCacheDeletion, 0.413)
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
    let previous = previousStateBySource.get(COMPACT_FORK);
    if (previous) previous.cacheDeletionsPending = true;
  }
}
//@ chunk-5xgkngpb.js:1587316-1587749 fingerprint (2.1.88 match: notifyCompaction, 0.499)
/**
 * 通知发生压缩：重置相关来源的上次 cache_read，避免误报。
 */
function notifyCompaction(agentId) {
  if (isCacheBreakOutlineEnabled()) {
    let classifierCompactions = promptCacheBreakState().classifierCompactions;
    let compactions = classifierCompactions.get(agentId) ?? [];
    classifierCompactions.delete(agentId);
    classifierCompactions.set(agentId, [...compactions, Date.now()].slice(-MAX_COMPACTION_TIMESTAMPS));
    if (classifierCompactions.size > MAX_CLASSIFIER_COMPACTION_KEYS) {
      let found = [...classifierCompactions.keys()].find((key) => key !== undefined);
      if (found !== undefined) classifierCompactions.delete(found);
    }
  }
  hydrateCacheBreakState();
  let previousStateBySource = promptCacheBreakState().previousStateBySource;
  let compactFork = previousStateBySource.get(COMPACT_FORK);
  if (compactFork) compactFork.prevCacheReadTokens = null;
  if (agentId) {
    let previous = previousStateBySource.get(agentId);
    if (previous) {
      previous.prevCacheReadTokens = null;
      persistPreviousStates();
    }
    return;
  }
  let changed = false;
  for (let [key, entry] of previousStateBySource)
    if (isTrackedQuerySource(key)) {
      entry.prevCacheReadTokens = null;
      changed = true;
    }
  if (changed) persistPreviousStates();
}
//@ chunk-5xgkngpb.js:1587749-1587920 placement
function forgetClassifierCompaction(agentId) {
  promptCacheBreakState().classifierCompactions.delete(agentId);
  let classifierLines = promptCacheBreakState().classifierLines;
  for (let [key, line] of classifierLines) if (line.agentId === agentId) classifierLines.delete(key);
  if (promptCacheBreakState().previousStateBySource.delete(agentId)) persistPreviousStates();
}
//@ chunk-5xgkngpb.js:1587920-1588022 placement
/**
 * 缓存断裂状态文件的限额：最多 32 个状态、文件 2 MB、版本号 1 与 outlines 结构。
 */
var CACHE_STATE_LIMITS; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var MAX_CACHE_STATE_BYTES;
var cacheBreakStateFileSchema;
deferInit("chunk-5xgkngpb.js:1587920", () => {
  CACHE_STATE_LIMITS = 32;
  MAX_CACHE_STATE_BYTES = 2000000;
  cacheBreakStateFileSchema = DoctorLazy(() =>
    create({
      v: create_25(1),
      by: create_2().max(64),
      state: cacheBreakStateSchema().valueSchema,
      outlines: create_12(),
    }),
  );
});
//@ chunk-5xgkngpb.js:1588022-1588638 placement
function parkAgentBaseline(agentId) {
  try {
    let state = promptCacheBreakState();
    let previous = state.previousStateBySource.get(agentId);
    forgetClassifierCompaction(agentId);
    if (previous === undefined) return;
    let { prefixBreakHash, ...rest } = stripSnapshotPayload(previous);
    let { messageOutlines } = previous;
    messageOutlines?.();
    let { parkedAgentBaselines } = state;
    parkedAgentBaselines.delete(agentId);
    while (parkedAgentBaselines.size >= CACHE_STATE_LIMITS) {
      let oldest = parkedAgentBaselines.keys().next().value;
      if (oldest === undefined) break;
      parkedAgentBaselines.delete(oldest);
    }
    parkedAgentBaselines.set(agentId, {
      ...rest,
      messageOutlines,
      pendingChanges: null,
      baselineFromDisk: previous.baselineFromDisk,
      baselineBuildVersion: previous.baselineBuildVersion,
      resumeBaseline: previous.resumeBaseline,
      content: modelWithEmptySystem(rest.model),
    });
    if (!isCacheBreakOutlineEnabled() || isDiskless()) return;
    state.parkedBy ??= randomUUID();
    let json = jsonStringify({
      v: 1,
      by: state.parkedBy,
      state: rest,
      outlines: compactBaseline(messageOutlines?.() ?? []),
    });
    return json.length <= MAX_CACHE_STATE_BYTES ? json : undefined;
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-5xgkngpb.js:1588638-1588695 placement
function modelWithEmptySystem(model) {
  return () => ({
    model,
    system: [],
    tools: [],
  });
}
//@ chunk-5xgkngpb.js:1588695-1588751 placement
function hasParkedAgentBaseline(agentId) {
  return promptCacheBreakState().parkedAgentBaselines.has(agentId);
}
//@ chunk-5xgkngpb.js:1588751-1589364 placement
function restoreAgentBaseline(agentId, outlines) {
  try {
    let state = promptCacheBreakState();
    let { previousStateBySource, parkedAgentBaselines } = state;
    let parked = parkedAgentBaselines.get(agentId);
    parkedAgentBaselines.delete(agentId);
    if (previousStateBySource.has(agentId)) return;
    let result;
    if (parked !== undefined)
      result = {
        ...parked,
        resumeBaseline: parked.resumeBaseline ?? {
          source: "memory",
          newProcess: false,
        },
      };
    else {
      if (outlines === null) return;
      let merged;
      try {
        merged = cacheBreakStateFileSchema().safeParse(jsonParse(outlines));
      } catch {
        return;
      }
      if (!merged.success) return;
      let { by, state: state_2, outlines: outlines_2 } = merged.data;
      let restored = restoreBaseline(outlines_2);
      result = {
        ...state_2,
        prefixBreakHash: undefined,
        messageOutlines: restored && (() => restored),
        pendingChanges: null,
        baselineFromDisk: true,
        baselineBuildVersion: state_2.buildVersion,
        resumeBaseline: {
          source: "disk",
          newProcess: by !== state.parkedBy,
        },
        content: modelWithEmptySystem(state_2.model),
      };
    }
    hydrateCacheBreakState();
    cleanupAgentTracking(previousStateBySource);
    previousStateBySource.set(agentId, result);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-5xgkngpb.js:1589364-1589952 placement
function recordSummaryFork(fork) {
  let state = promptCacheBreakState();
  let neededHydration = state.previousStateBySource.size === 0 && !state.hydrationAttempted;
  state.summaryForks.clear();
  for (let key of [...state.parkedAgentBaselines.keys()])
    if (!fork?.has(key)) state.parkedAgentBaselines.delete(key);
  for (let [key, line] of state.classifierLines)
    if (line.agentId === undefined || !fork?.has(line.agentId)) state.classifierLines.delete(key);
  for (let key of state.classifierCompactions.keys())
    if (key === undefined || !fork?.has(key)) state.classifierCompactions.delete(key);
  if (fork?.size) {
    for (let key of [...state.previousStateBySource.keys()])
      if (!fork.has(key)) state.previousStateBySource.delete(key);
  } else {
    state.previousStateBySource.clear();
    state.hydrationAttempted = false;
  }
  if (!neededHydration) persistPreviousStates();
}
export {
  CACHE_TTL_5M_MS,
  CACHE_TTL_1H_MS,
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
  notifyCacheDeletion,
  getPromptCacheSummary,
  cacheBreakStatePrefix,
  computeHash,
  isBillingHeaderBlock,
  X_ANTHROPIC_BILLING_HEADER,
  REPORTING_OUTCOMES_SECTION,
  getTrackingKey,
  isUncachedSystemBlock,
  EPHEMERAL_MESSAGE_MARK,
  estimateRecacheTokens,
  CACHE_BREAK_REASONS,
  snapshotRequestForCacheDiff,
  describeSnapshotDiff,
  isCacheFingerprintPart,
  ledgerComparableView,
  seedLedgerSnapshot,
  isDeferredTool,
  expectPromptCacheDrop,
  notifyCompaction,
  isCacheBreakOutlineEnabled,
  isExcludedModel,
  MIN_CACHE_MISS_TOKENS,
  isCacheReadDrop,
  recordSummaryFork,
  promptCacheTrackers,
  clearPromptCacheOnSessionSwitch,
  parkAgentBaseline,
  hasParkedAgentBaseline,
  MAX_CACHE_STATE_BYTES,
  restoreAgentBaseline,
  forgetClassifierCompaction,
};
