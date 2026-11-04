/**
 * services/api/deferredToolsState.ts
 *
 * 2.1.316 新增：延迟加载工具（defer_loading / tool_reference）的会话状态：已发送的定义、剥离的引用、MCP 保留旧名
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-a76knw89.js (43)
 * attribution: sole-consumer 1, placement 42
 */
import { isDeepStrictEqual } from "util";
import { getMessagePreview } from "../../components/Spinner/TeammateSpinnerLine.js";
import { executeCloudPersistence } from "../../utils/filePersistence/filePersistence.js";
import { getRootSession } from "../../bootstrap/state.js";
import {
  getKeptLegacyNames,
  registerToolIdentities_2,
  noteSentWireNames,
  wireName,
  internalName,
} from "../mcp/serverIdentity.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../analytics/featureTelemetry.js";
import { logError } from "../../utils/log.js";
import { isStandardKeyActive, compareByName, mergeClients } from "../mcp/mcpStandardKeys.js";
import { isReplToolName } from "../../tools/REPLTool/constants.js";
import { canonicalToolName as canonicalToolName_2 } from "../../utils/permissions/permissionRuleParser.js";
import { isFoamySpringEnabled as isFoamySpringEnabled_2 } from "../analytics/growthbookGates.js";
import { env } from "../../utils/env.js";
import { getSessionFeatureValues } from "../../bootstrap/sessionFeatureValues.js";
import { joinWithNewline, collectToolReferences } from "../../utils/toolSearch.js";
import { logForDebugging } from "../../utils/debug.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { classifyQuerySource } from "./requestHeaders.js";
import {
  anyEagerInputStreaming,
  TOOL_DEFINITION_FLAG_KEYS,
  isDeferredCustomToolDefinition,
  TOOL_DEFINITION_BOOLEAN_KEYS,
} from "./toolDefinitionShape.js";
import { toolMatchesName, findToolByName } from "../../Tool.js";
import { fromEnumOpt } from "../analytics/safeMetadata.js";
import { count } from "../../utils/collections.js";
import { FORK_AGENT_BUILTIN_ID } from "../../tools/AgentTool/constants.js";
import { normalizeNfkc, BRACKET_CONFUSABLES, sanitizeLogLine } from "../../utils/sanitization.js";
import { MAX_ERROR_TEXT_CHARS, ERROR_TEXT_SLACK_CHARS, redactSecrets } from "../mcp/redactMcpErrors.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-a76knw89.js:19845-19923 sole-consumer
function withPreviewContent(message) {
  return Array.isArray(message.content)
    ? {
        ...message,
        content: getMessagePreview(message.content),
      }
    : message;
}
//@ chunk-a76knw89.js:19923-20079 placement
function logStandardKeyOutcome() {
  let state = executeCloudPersistence.of(getRootSession());
  if (getKeptLegacyNames() > 0 && !state.kept) {
    state.kept = true;
    logFeatureSad("mcp_standard_key", "kept_legacy_names");
  } else if (!state.ok && !state.kept) {
    state.ok = true;
    logFeatureOk("mcp_standard_key");
  }
}
//@ chunk-a76knw89.js:20079-20182 placement
function logStandardKeyFailure(error) {
  logError(error);
  let state = executeCloudPersistence.of(getRootSession());
  if (!state.failed) {
    state.failed = true;
    logFeatureBad("mcp_standard_key", "translate_failed");
  }
}
//@ chunk-a76knw89.js:20182-20294 placement
/**
 * 有 MCP 工具且开关打开时，登记 MCP 标准键并刷新，返回是否成功。
 */
function registerMcpStandardKeys(tools) {
  try {
    if (tools.some((tool) => tool.mcpInfo !== undefined) && isStandardKeyActive()) {
      registerToolIdentities_2(compareByName(tools));
      logStandardKeyOutcome();
    }
    return true;
  } catch (error) {
    logStandardKeyFailure(error);
    return false;
  }
}
//@ chunk-a76knw89.js:20294-20716 placement
function deferredToolNameOf(params) {
  try {
    if (!isStandardKeyActive()) return params;
    let toolChoice = params.tool_choice;
    noteSentWireNames(
      (params.tools ?? []).flatMap((tool) =>
        "name" in tool && typeof tool.name === "string" ? [tool.name] : [],
      ),
    );
    return {
      ...params,
      messages: params.messages.map(withPreviewContent),
      ...(params.context_management != null && {
        context_management: getMessagePreview(params.context_management),
      }),
      ...(params.tools !== undefined && {
        tools: params.tools.map(mergeClients),
      }),
      ...(toolChoice !== undefined &&
        "name" in toolChoice &&
        typeof toolChoice.name === "string" && {
          tool_choice: {
            ...toolChoice,
            name: wireName(toolChoice.name),
          },
        }),
    };
  } catch (error) {
    logStandardKeyFailure(error);
    return params;
  }
}
//@ chunk-a76knw89.js:20716-20814 placement = countToolCallsSince (1)
function countToolCallsSince_2(message) {
  for (let block of message.content)
    if (block.type === "tool_use" && block.name !== undefined) block.name = internalName(block.name);
}
//@ chunk-a76knw89.js:20814-20866 placement
var HOST_ONLY_NATIVE_TOOL; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-a76knw89.js:20814", () => {
  HOST_ONLY_NATIVE_TOOL = Symbol.for("claude-code.hostOnlyNativeTool");
});
//@ chunk-a76knw89.js:20866-20944 placement
/**
 * 导出函数 `markHostOnlyNativeTool`：参数 e，返回 (Object.defineProperty(e, Je, { value: !0, enumerable: !0 }), e)。
 */
function markHostOnlyNativeTool(tool) {
  Object.defineProperty(tool, HOST_ONLY_NATIVE_TOOL, {
    value: true,
    enumerable: true,
  });
  return tool;
}
//@ chunk-a76knw89.js:20944-20974 placement
/**
 * 导出函数 `isHostOnlyNativeTool`：参数 e，返回 Je in e。
 */
function isHostOnlyNativeTool(tool) {
  return HOST_ONLY_NATIVE_TOOL in tool;
}
//@ chunk-a76knw89.js:21016-21060 placement
function resolveToolName(toolName, isKnownName) {
  return isReplToolName(toolName) && isKnownName(toolName) ? toolName : canonicalToolName_2(toolName);
}
//@ chunk-a76knw89.js:21060-21157 placement
function keptDeferredToolsAllowed() {
  if (!isFoamySpringEnabled_2()) return false;
  return !(env.CLAUDE_CODE_SIMPLE || env.CLAUDE_CODE_DISABLE_ATTACHMENTS);
}
//@ chunk-a76knw89.js:21157-21251 placement
/**
 * 导出函数 `areDeferredToolsKept`：返回 ((e.keptDeferredToolsEnabled ??= on()), e.keptDeferredToolsEnabled)。
 */
function areDeferredToolsKept() {
  let sessionFeatureValues = getSessionFeatureValues();
  sessionFeatureValues.keptDeferredToolsEnabled ??= keptDeferredToolsAllowed();
  return sessionFeatureValues.keptDeferredToolsEnabled;
}
//@ chunk-a76knw89.js:21251-21309 placement
/**
 * 导出函数 `deferredToolsKeptCached`：返回 Ao().keptDeferredToolsEnabled ?? on()。
 */
function deferredToolsKeptCached() {
  return getSessionFeatureValues().keptDeferredToolsEnabled ?? keptDeferredToolsAllowed();
}
//@ chunk-a76knw89.js:21309-21321 placement
var MAX_DEFINITION_CACHE = 5000;
//@ chunk-a76knw89.js:21321-21370 placement
function definitionKey(reference) {
  return joinWithNewline(reference.toolUseId, reference.toolName);
}
//@ chunk-a76knw89.js:21370-22039 placement
/**
 * 记录已向 API 发送过的延迟工具定义（LRU），用于判断是否需要再次声明。
 */
class DeferredToolDefinitionCache {
  #e = new Map();
  #n = new Set();
  #o = new Map();
  #t = new Map();
  #r = false;
  #i = 0;
  get(reference) {
    return this.#e.get(definitionKey(reference));
  }
  set(reference, entry) {
    let key = definitionKey(reference);
    if (!this.#e.delete(key) && this.#e.size >= MAX_DEFINITION_CACHE) {
      let oldestKey = this.#e.keys().next().value;
      if (oldestKey !== undefined) this.#e.delete(oldestKey);
    }
    this.#e.set(key, entry);
    this.#n.add(reference.toolName);
  }
  hasTool(toolName) {
    return this.#n.has(toolName);
  }
  get size() {
    return this.#e.size;
  }
  noteSpliced(toolName, inputSchema) {
    this.#t.set(toolName, inputSchema);
  }
  splicedInputSchema(toolName) {
    return this.#t.get(toolName);
  }
  telemetrySignatureChanged(querySource, signature) {
    if (signature === this.#o.get(querySource)) return false;
    this.#o.set(querySource, signature);
    return true;
  }
  get generation() {
    return this.#i;
  }
  noteRetractionFailure() {
    let firstOutcome = !this.#r;
    this.#r = true;
    return firstOutcome;
  }
  clear() {
    this.#e.clear();
    this.#n.clear();
    this.#o.clear();
    this.#t.clear();
    this.#i++;
  }
}
//@ chunk-a76knw89.js:22039-22066 placement
/**
 * 导出函数 `deferredToolCacheSlot`。
 */
var deferredToolCacheSlot; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-a76knw89.js:22039", () => {
  deferredToolCacheSlot = new SessionRootSlot(() => new DeferredToolDefinitionCache());
});
//@ chunk-a76knw89.js:22066-22099 placement
/**
 * 导出函数 `deferredToolCache`：返回 Sbn.of(getRootSession())。
 */
function deferredToolCache() {
  return deferredToolCacheSlot.of(getRootSession());
}
//@ chunk-a76knw89.js:22099-22735 placement
function planDeferredToolDeclarations(cache, toolReferences, tools, keepMcp = true, declaredSet) {
  let presentNames = new Set(tools.map((tool) => tool.name));
  let kept = new Map();
  for (let reference of toolReferences) {
    let record = cache.get(reference);
    let sentName =
      record?.kind === "sent" && "name" in record.entry.schema ? record.entry.schema.name : undefined;
    let toolName = resolveToolName(reference.toolName, (name) => presentNames.has(name) || name === sentName);
    if (kept.has(toolName)) continue;
    if (record?.kind === "sent" && (keepMcp || !record.entry.isMcp)) kept.set(toolName, record.entry);
  }
  let strippedKeys = new Set();
  let resolved = [];
  let unrecorded = [];
  for (let reference of toolReferences) {
    let record = cache.get(reference);
    if (record?.kind === "stripped") {
      strippedKeys.add(definitionKey(reference));
      continue;
    }
    if (record?.kind === "sent") continue;
    let toolName = resolveToolName(reference.toolName, (name) => presentNames.has(name) || kept.has(name));
    let entry = kept.get(toolName);
    if (entry)
      resolved.push({
        reference,
        entry,
      });
    else if (!presentNames.has(toolName) && !declaredSet?.keeps(toolName)) unrecorded.push(reference);
  }
  return {
    kept,
    strippedReferenceKeys: strippedKeys,
    resolvedAgainstKept: resolved,
    unrecordedDepartures: unrecorded,
  };
}
//@ chunk-a76knw89.js:22735-23295 placement
function logKeptDeferredTools(
  messages,
  tools,
  querySource,
  { keepMcp = true, surfacedOnWire, declaredInline } = {},
) {
  try {
    if (!areDeferredToolsKept()) return;
    let toolReferences = collectToolReferences(messages, {
      surfacedOnWire,
    });
    if (toolReferences.length === 0) return;
    let cache = deferredToolCache();
    let generation = cache.generation;
    let category = classifyQuerySource(querySource);
    let shouldWrite = shouldTrackDeferredTool(category, querySource);
    let { kept, strippedReferenceKeys, resolvedAgainstKept, unrecordedDepartures } =
      planDeferredToolDeclarations(cache, toolReferences, tools, keepMcp, declaredInline);
    if (shouldWrite) {
      for (let { reference, entry } of resolvedAgainstKept)
        cache.set(reference, {
          kind: "sent",
          entry,
        });
      for (let unrecordedDeparture of unrecordedDepartures)
        cache.set(unrecordedDeparture, {
          kind: "stripped",
        });
    }
    return {
      references: toolReferences,
      kept,
      strippedReferenceKeys,
      writes: shouldWrite,
      category,
      querySource,
      generation,
    };
  } catch (error) {
    logError(error);
    logFeatureBad("mcp_kept_deferred_tools", "plan_failed");
    return;
  }
}
//@ chunk-a76knw89.js:23295-23525 placement
/**
 * 计算保留的延迟工具名中不在当前工具列表里的那些（可选择不保留 MCP）。
 */
function keptDeferredToolNames(normalizedMessages, tools, { keepMcp = true, surfacedOnWire } = {}) {
  try {
    let cache = deferredToolCache();
    if (!areDeferredToolsKept()) return;
    let { kept } = planDeferredToolDeclarations(
      cache,
      collectToolReferences(normalizedMessages, {
        surfacedOnWire,
      }),
      tools,
      keepMcp,
    );
    let presentNames = new Set(tools.map((tool) => tool.name));
    return [...kept.keys()].filter((key) => !presentNames.has(key));
  } catch (error) {
    logRetractionFailure(error);
    return;
  }
}
//@ chunk-a76knw89.js:23525-23722 placement
function stripToolReferencesBeforeCompaction(messages) {
  let cache = deferredToolCache();
  let lastIndex = messages.findLastIndex(
    (message) => message.type === "system" && message.subtype === "compact_boundary",
  );
  return new Set(
    collectToolReferences(messages.slice(lastIndex + 1))
      .filter((reference) => cache.get(reference)?.kind !== "stripped")
      .map((reference) => reference.toolName),
  );
}
//@ chunk-a76knw89.js:23722-23842 placement
/**
 * 列出被剥离（stripped）的工具引用名。
 */
function strippedToolReferences(plan) {
  let cache = deferredToolCache();
  let keys = new Set();
  for (let reference of plan?.references ?? [])
    if (cache.get(reference)?.kind === "stripped") keys.add(definitionKey(reference));
  return keys;
}
//@ chunk-a76knw89.js:23842-23944 placement
/**
 * 记录工具撤回失败，并在首次失败时记特性遥测。
 */
function logRetractionFailure(error) {
  logError(error);
  if (deferredToolCache().noteRetractionFailure())
    logFeatureBad("mcp_kept_deferred_tools", "retraction_failed");
}
//@ chunk-a76knw89.js:23944-25468 placement
/**
 * 为本次请求决定延迟工具的声明方式（全量、引用、剥离），兼顾结构化输出与搜索引用（约 1.5 KB）。
 */
function buildDeferredToolsForRequest(
  plan,
  messageText,
  toolByName,
  { requestCarriesStructuredOutputs, requestDeclaresSearchCitations },
) {
  try {
    let max = Math.max(messageText.length - 1, 0);
    let cache = deferredToolCache();
    let generationChanged = cache.generation !== plan.generation;
    let definitionFlags = {
      strict: requestCarriesStructuredOutputs,
      eager: anyEagerInputStreaming(messageText),
      citations: requestDeclaresSearchCitations,
    };
    let toSplice = [];
    let departed = [];
    for (let [toolName, entry] of plan.kept) {
      let index = messageText.findIndex((schema) => "name" in schema && toolMatchesName(schema, toolName));
      let existing = messageText[index];
      if (existing !== undefined) {
        if ("defer_loading" in existing && existing.defer_loading && !generationChanged)
          messageText[index] = TOOL_DEFINITION_FLAG_KEYS(entry.schema, definitionFlags);
        continue;
      }
      departed.push([toolName, entry]);
      toSplice.push(TOOL_DEFINITION_FLAG_KEYS(entry.schema, definitionFlags));
    }
    messageText.splice(max, 0, ...toSplice);
    if (!generationChanged) {
      for (let [toolName, { schema, isMcp }] of departed)
        if (!isMcp && "input_schema" in schema) cache.noteSpliced(toolName, schema.input_schema);
    }
    if (!plan.writes || generationChanged) return;
    let querySource = plan.querySource ?? "";
    if (departed.length === 0 && plan.strippedReferenceKeys.size === 0)
      cache.telemetrySignatureChanged(querySource, "");
    else {
      logForDebugging(
        `Dynamic tool loading: keeping ${departed.length} departed deferred tool(s) declared; ${plan.strippedReferenceKeys.size} reference(s) held stripped`,
      );
      let signature = `${departed
        .map(([name]) => name)
        .sort()
        .join(",")}|${plan.strippedReferenceKeys.size}`;
      if (cache.telemetrySignatureChanged(querySource, signature)) {
        let category = fromEnumOpt(plan.category);
        logFeatureOk("mcp_kept_deferred_tools", {
          kept_count: departed.length,
          kept_mcp_count: count(departed, ([, entry]) => entry.isMcp),
          stripped_reference_count: plan.strippedReferenceKeys.size,
          ...(category !== undefined && {
            query_source_category: category,
          }),
        });
      }
    }
    let sentEntries = new Map();
    for (let reference of plan.references) {
      if (plan.strippedReferenceKeys.has(definitionKey(reference))) continue;
      let toolName = resolveToolName(
        reference.toolName,
        (name) => toolByName.has(name) || plan.kept.has(name),
      );
      let entry = toolByName.get(toolName);
      if (
        plan.kept.has(toolName) ||
        !entry ||
        !("defer_loading" in entry.schema) ||
        entry.schema.defer_loading !== true
      )
        continue;
      let sentEntry = sentEntries.get(toolName);
      if (sentEntry === undefined) {
        sentEntry = {
          schema: entry.schema,
          isMcp: entry.isMcp,
        };
        sentEntries.set(toolName, sentEntry);
      }
      cache.set(reference, {
        kind: "sent",
        entry: sentEntry,
      });
    }
  } catch (error) {
    logError(error);
    logFeatureBad("mcp_kept_deferred_tools", "record_failed");
  }
}
//@ chunk-a76knw89.js:25468-26539 placement
/**
 * 从附件中的 deferred_tools_delta 预置已知工具引用。
 */
function seedDeferredToolReferences(messages, definitions, options) {
  try {
    let strippedKeys = options?.strippedReferences ?? new Set();
    if ((definitions.length === 0 && strippedKeys.size === 0) || !deferredToolsKeptCached()) return 0;
    let cache = deferredToolCache();
    let byName = new Map();
    for (let definition of definitions)
      if (isDeferredCustomToolDefinition(definition) && !byName.has(definition.name))
        byName.set(definition.name, {
          schema: definition,
          isMcp: definition.name.startsWith("mcp__"),
        });
    let surfacedNames;
    if (options?.surfacedCarrier !== undefined) {
      surfacedNames = new Set();
      for (let message of messages) {
        if (
          message.type !== "attachment" ||
          message.attachment.type !== "deferred_tools_delta" ||
          options.surfacedCarrier.nameOnlyAnnouncements.has(message.uuid)
        )
          continue;
        let surfacedNames_2 = message.attachment.surfacedNames;
        for (let name of Array.isArray(surfacedNames_2) ? surfacedNames_2 : [])
          if (typeof name === "string" && byName.has(name)) surfacedNames.add(name);
      }
      for (let name of surfacedNames) options.surfacedCarrier.surfacedOnWire.add(name);
    }
    let seededCount = 0;
    let toolNames = new Set();
    for (let reference of collectToolReferences(messages, {
      surfacedOnWire: surfacedNames,
    })) {
      let record = cache.get(reference);
      if (strippedKeys.has(definitionKey(reference))) {
        if (record?.kind !== "stripped") {
          cache.set(reference, {
            kind: "stripped",
          });
          seededCount++;
        }
        continue;
      }
      if (record !== undefined) continue;
      let toolName = resolveToolName(reference.toolName, (name) => byName.has(name));
      let entry = byName.get(toolName);
      if (entry === undefined) continue;
      cache.set(reference, {
        kind: "sent",
        entry,
      });
      toolNames.add(toolName);
      seededCount++;
    }
    if (seededCount > 0)
      logForDebugging(
        `Dynamic tool loading: seeded ${seededCount} tool reference(s) to ${toolNames.size} deferred tool(s) the previous process sent`,
      );
    return seededCount;
  } catch (error) {
    logError(error);
    logFeatureBad("mcp_kept_deferred_tools", "seed_failed");
    return 0;
  }
}
//@ chunk-a76knw89.js:26539-26645 placement
function sameDefinitionIgnoringOptional(schema, other) {
  if (isDeepStrictEqual(schema, other)) return true;
  let copy = {
    ...schema,
  };
  for (let key of TOOL_DEFINITION_BOOLEAN_KEYS) if (!(key in other)) delete copy[key];
  return isDeepStrictEqual(copy, other);
}
//@ chunk-a76knw89.js:26645-27173 placement
function keepDepartedDeferredTools(messages, surfacedOnWire, toolByName, plan, querySource, generation) {
  try {
    if (surfacedOnWire.size === 0 || !areDeferredToolsKept()) return;
    let cache = deferredToolCache();
    if (cache.generation !== generation) return;
    if (!shouldTrackDeferredTool(classifyQuerySource(querySource), querySource)) return;
    let sentEntries = new Map();
    for (let reference of collectToolReferences(messages, {
      surfacedOnWire,
    })) {
      if (cache.get(reference) !== undefined) continue;
      let toolName = resolveToolName(
        reference.toolName,
        (name) => plan?.kept.has(name) === true || toolByName.has(name),
      );
      let entry = plan?.kept.get(toolName) ?? toolByName.get(toolName);
      if (!entry || !("defer_loading" in entry.schema) || entry.schema.defer_loading !== true) continue;
      let sentEntry = sentEntries.get(toolName);
      if (sentEntry === undefined) {
        sentEntry = {
          schema: entry.schema,
          isMcp: entry.isMcp,
        };
        sentEntries.set(toolName, sentEntry);
      }
      cache.set(reference, {
        kind: "sent",
        entry: sentEntry,
      });
    }
  } catch (error) {
    logError(error);
    logFeatureBad("mcp_kept_deferred_tools", "record_failed");
  }
}
//@ chunk-a76knw89.js:27173-27303 placement
/**
 * 把工具列表中的定义替换为延迟加载的自定义定义（若存在）。
 */
function restoreDeferredDefinitions(schemas, tools) {
  try {
    let byName = isDeferredDefinition(tools);
    for (let j = 0; j < schemas.length; j++) {
      let definition = byName.get(schemas[j].name);
      if (definition !== undefined && isDeferredCustomToolDefinition(definition)) schemas[j] = definition;
    }
  } catch (error) {
    logError(error);
  }
}
//@ chunk-a76knw89.js:27303-27765 placement
function recordDeferredToolsSent(plan, tools) {
  try {
    let cache = deferredToolCache();
    if (!plan.writes || cache.generation !== plan.generation) return;
    let byName = isDeferredDefinition(tools);
    let sentEntries = new Map();
    for (let reference of plan.references) {
      if (plan.strippedReferenceKeys.has(definitionKey(reference))) continue;
      let toolName = resolveToolName(reference.toolName, (name) => byName.has(name));
      let schema = byName.get(toolName);
      let record = cache.get(reference);
      if (
        schema === undefined ||
        record?.kind !== "sent" ||
        sameDefinitionIgnoringOptional(record.entry.schema, schema)
      )
        continue;
      let entry = sentEntries.get(toolName);
      if (entry === undefined) {
        entry = {
          schema,
          isMcp: record.entry.isMcp,
        };
        sentEntries.set(toolName, entry);
      }
      cache.set(reference, {
        kind: "sent",
        entry,
      });
    }
  } catch (error) {
    logError(error);
    logFeatureBad("mcp_kept_deferred_tools", "record_failed");
  }
}
//@ chunk-a76knw89.js:27765-27825 placement
function shouldTrackDeferredTool(category, querySource) {
  return category === "main" || (category === "subagent" && querySource !== FORK_AGENT_BUILTIN_ID);
}
//@ chunk-a76knw89.js:27825-27860 placement
/**
 * 导出函数 `shouldTrackDeferredToolForQuery`：参数 e，返回 xe(classifyQuerySource(e), e)。
 */
function shouldTrackDeferredToolForQuery(querySource) {
  return shouldTrackDeferredTool(classifyQuerySource(querySource), querySource);
}
//@ chunk-a76knw89.js:27860-28085 placement
function isDeferredDefinition(tools) {
  let byName = new Map();
  for (let tool of tools)
    if (
      "defer_loading" in tool &&
      tool.defer_loading === true &&
      "name" in tool &&
      typeof tool.name === "string"
    )
      if ("cache_control" in tool) {
        let { cache_control: cacheControl, ...rest } = tool;
        byName.set(tool.name, rest);
      } else byName.set(tool.name, tool);
  return byName;
}
//@ chunk-a76knw89.js:28085-28121 placement
/**
 * 导出函数 `findTool`：参数 e, n, o，返回 findToolByName(e, n, o)。
 */
function findTool(tools, name, toolAliases) {
  return findToolByName(tools, name, toolAliases);
}
//@ chunk-a76knw89.js:28121-28174 placement
var AUTHENTICATE = "authenticate";
var COMPLETE_AUTHENTICATION = "complete_authentication";
//@ chunk-a76knw89.js:28174-28374 placement
function normalizeToolReference(reference) {
  if (typeof reference !== "object" || reference === null) return false;
  let refRecord = reference;
  return (
    typeof refRecord.name === "string" &&
    (refRecord.errorCode === undefined || typeof refRecord.errorCode === "string") &&
    (refRecord.error === undefined || typeof refRecord.error === "string")
  );
}
//@ chunk-a76knw89.js:28374-28385 placement
var MAX_SERVER_NAME_CHARS = 200;
//@ chunk-a76knw89.js:28385-28484 placement
/**
 * 导出函数 `normalizeServerNameShort`：参数 e, n = 64，返回 ""; return normalizeMcpServerName(normalizeNfkc(e).replace(/['`]/g, " "), n, "none")。
 */
function normalizeServerNameShort(name, maxChars = 64) {
  if (typeof name !== "string") return "";
  return normalizeMcpServerName(normalizeNfkc(name).replace(/['`]/g, " "), maxChars, "none");
}
//@ chunk-a76knw89.js:28484-28600 placement
var regExp; // deferred: uses BRACKET_CONFUSABLES_2 (../../utils/sanitization.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-a76knw89.js:28484", () => {
  regExp = new RegExp(
    `[<>";\\u2018\\u2019\\u201A\\u201C\\u201D\\u201E\\u00AB\\u00BB${[...BRACKET_CONFUSABLES.keys()].join("")}]`,
    "gu",
  );
});
//@ chunk-a76knw89.js:28600-28638 placement
/**
 * 导出函数 `normalizeServerNameLong`：参数 e, n = 1024，返回 normalizeMcpServerName(e, n)。
 */
function normalizeServerNameLong(name, maxChars = 1024) {
  return normalizeMcpServerName(name, maxChars);
}
//@ chunk-a76knw89.js:28638-28860 placement
function normalizeMcpServerName(name, maxChars = MAX_SERVER_NAME_CHARS, redactionMode = "all") {
  if (typeof name !== "string") return "";
  let trimmed = sanitizeLogLine(normalizeNfkc(name)).replaceAll(regExp, " ").replaceAll(/\s+/g, " ").trim();
  let max = Math.max(MAX_ERROR_TEXT_CHARS, maxChars + ERROR_TEXT_SLACK_CHARS);
  let truncated = trimmed.length > max;
  let redacted = redactSecrets(truncated ? truncateToLength(trimmed, max) : trimmed, redactionMode);
  return truncated || redacted.length > maxChars ? `${truncateToLength(redacted, maxChars)}\u2026` : redacted;
}
//@ chunk-a76knw89.js:28860-28871 placement
var MAX_DETAIL_CHARS = 500;
//@ chunk-a76knw89.js:28871-29000 placement
/**
 * 清洗错误详情文本：去控制字符、压缩空白、截断到上限。
 */
function sanitizeErrorDetail(detail) {
  let trimmed = sanitizeLogLine(detail).replaceAll(/\s+/g, " ").trim();
  let redacted = redactSecrets(
    trimmed.length > MAX_ERROR_TEXT_CHARS ? truncateToLength(trimmed, MAX_ERROR_TEXT_CHARS) : trimmed,
  );
  return redacted.length > MAX_DETAIL_CHARS
    ? `${truncateToLength(redacted, MAX_DETAIL_CHARS)}\u2026`
    : redacted;
}
export {
  normalizeToolReference,
  findTool,
  isHostOnlyNativeTool,
  sanitizeErrorDetail,
  normalizeMcpServerName,
  deferredToolsKeptCached,
  normalizeServerNameShort,
  deferredToolCache,
  deferredToolNameOf,
  countToolCallsSince_2,
  registerMcpStandardKeys,
  seedDeferredToolReferences,
  shouldTrackDeferredToolForQuery,
  logKeptDeferredTools,
  buildDeferredToolsForRequest,
  recordDeferredToolsSent,
  restoreDeferredDefinitions,
  areDeferredToolsKept,
  strippedToolReferences,
  keepDepartedDeferredTools,
  stripToolReferencesBeforeCompaction,
  deferredToolCacheSlot,
  AUTHENTICATE,
  COMPLETE_AUTHENTICATION,
  markHostOnlyNativeTool,
  keptDeferredToolNames,
  logRetractionFailure,
  normalizeServerNameLong,
};
