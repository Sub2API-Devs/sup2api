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

//@ chunk-a76knw89.js:19845-19923 sole-consumer
function withPreviewContent(e) {
  return Array.isArray(e.content)
    ? {
        ...e,
        content: getMessagePreview(e.content),
      }
    : e;
}
//@ chunk-a76knw89.js:19923-20079 placement
function logStandardKeyOutcome() {
  let e = executeCloudPersistence.of(getRootSession());
  if (getKeptLegacyNames() > 0 && !e.kept) {
    e.kept = true;
    logFeatureSad("mcp_standard_key", "kept_legacy_names");
  } else if (!e.ok && !e.kept) {
    e.ok = true;
    logFeatureOk("mcp_standard_key");
  }
}
//@ chunk-a76knw89.js:20079-20182 placement
function logStandardKeyFailure(error) {
  logError(error);
  let n = executeCloudPersistence.of(getRootSession());
  if (!n.failed) {
    n.failed = true;
    logFeatureBad("mcp_standard_key", "translate_failed");
  }
}
//@ chunk-a76knw89.js:20182-20294 placement
/**
 * 有 MCP 工具且开关打开时，登记 MCP 标准键并刷新，返回是否成功。
 */
function registerMcpStandardKeys(e) {
  try {
    if (e.some((n) => n.mcpInfo !== undefined) && isStandardKeyActive()) {
      registerToolIdentities_2(compareByName(e));
      logStandardKeyOutcome();
    }
    return true;
  } catch (error) {
    logStandardKeyFailure(error);
    return false;
  }
}
//@ chunk-a76knw89.js:20294-20716 placement
function deferredToolNameOf(e) {
  try {
    if (!isStandardKeyActive()) return e;
    let toolChoice = e.tool_choice;
    noteSentWireNames(
      (e.tools ?? []).flatMap((o) => ("name" in o && typeof o.name === "string" ? [o.name] : [])),
    );
    return {
      ...e,
      messages: e.messages.map(withPreviewContent),
      ...(e.context_management != null && {
        context_management: getMessagePreview(e.context_management),
      }),
      ...(e.tools !== undefined && {
        tools: e.tools.map(mergeClients),
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
    return e;
  }
}
//@ chunk-a76knw89.js:20716-20814 placement = countToolCallsSince (1)
function countToolCallsSince_2(e) {
  for (let n of e.content) if (n.type === "tool_use" && n.name !== undefined) n.name = internalName(n.name);
}
//@ chunk-a76knw89.js:20814-20866 placement
var HOST_ONLY_NATIVE_TOOL = Symbol.for("claude-code.hostOnlyNativeTool");
//@ chunk-a76knw89.js:20866-20944 placement
/**
 * 导出函数 `markHostOnlyNativeTool`：参数 e，返回 (Object.defineProperty(e, Je, { value: !0, enumerable: !0 }), e)。
 */
function markHostOnlyNativeTool(e) {
  Object.defineProperty(e, HOST_ONLY_NATIVE_TOOL, {
    value: true,
    enumerable: true,
  });
  return e;
}
//@ chunk-a76knw89.js:20944-20974 placement
/**
 * 导出函数 `isHostOnlyNativeTool`：参数 e，返回 Je in e。
 */
function isHostOnlyNativeTool(e) {
  return HOST_ONLY_NATIVE_TOOL in e;
}
//@ chunk-a76knw89.js:21016-21060 placement
function resolveToolName(toolName, n) {
  return isReplToolName(toolName) && n(toolName) ? toolName : canonicalToolName_2(toolName);
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
function definitionKey(e) {
  return joinWithNewline(e.toolUseId, e.toolName);
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
  get(e) {
    return this.#e.get(definitionKey(e));
  }
  set(e, n) {
    let o = definitionKey(e);
    if (!this.#e.delete(o) && this.#e.size >= MAX_DEFINITION_CACHE) {
      let r = this.#e.keys().next().value;
      if (r !== undefined) this.#e.delete(r);
    }
    this.#e.set(o, n);
    this.#n.add(e.toolName);
  }
  hasTool(e) {
    return this.#n.has(e);
  }
  get size() {
    return this.#e.size;
  }
  noteSpliced(e, n) {
    this.#t.set(e, n);
  }
  splicedInputSchema(e) {
    return this.#t.get(e);
  }
  telemetrySignatureChanged(e, n) {
    if (n === this.#o.get(e)) return false;
    this.#o.set(e, n);
    return true;
  }
  get generation() {
    return this.#i;
  }
  noteRetractionFailure() {
    let e = !this.#r;
    this.#r = true;
    return e;
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
var deferredToolCacheSlot = new SessionRootSlot(() => new DeferredToolDefinitionCache());
//@ chunk-a76knw89.js:22066-22099 placement
/**
 * 导出函数 `deferredToolCache`：返回 Sbn.of(getRootSession())。
 */
function deferredToolCache() {
  return deferredToolCacheSlot.of(getRootSession());
}
//@ chunk-a76knw89.js:22099-22735 placement
function planDeferredToolDeclarations(e, toolReferences, o, r = true, c) {
  let s = new Set(o.map((y) => y.name));
  let u = new Map();
  for (let y of toolReferences) {
    let b = e.get(y);
    let k = b?.kind === "sent" && "name" in b.entry.schema ? b.entry.schema.name : undefined;
    let toolName = resolveToolName(y.toolName, (x) => s.has(x) || x === k);
    if (u.has(toolName)) continue;
    if (b?.kind === "sent" && (r || !b.entry.isMcp)) u.set(toolName, b.entry);
  }
  let p = new Set();
  let h = [];
  let T = [];
  for (let y of toolReferences) {
    let b = e.get(y);
    if (b?.kind === "stripped") {
      p.add(definitionKey(y));
      continue;
    }
    if (b?.kind === "sent") continue;
    let toolName = resolveToolName(y.toolName, (x) => s.has(x) || u.has(x));
    let S = u.get(toolName);
    if (S)
      h.push({
        reference: y,
        entry: S,
      });
    else if (!s.has(toolName) && !c?.keeps(toolName)) T.push(y);
  }
  return {
    kept: u,
    strippedReferenceKeys: p,
    resolvedAgainstKept: h,
    unrecordedDepartures: T,
  };
}
//@ chunk-a76knw89.js:22735-23295 placement
function logKeptDeferredTools(
  messages,
  tools,
  querySource,
  { keepMcp: r = true, surfacedOnWire: c, declaredInline: s } = {},
) {
  try {
    if (!areDeferredToolsKept()) return;
    let toolReferences = collectToolReferences(messages, {
      surfacedOnWire: c,
    });
    if (toolReferences.length === 0) return;
    let p = deferredToolCache();
    let generation = p.generation;
    let T = classifyQuerySource(querySource);
    let y = shouldTrackDeferredTool(T, querySource);
    let { kept, strippedReferenceKeys, resolvedAgainstKept, unrecordedDepartures } =
      planDeferredToolDeclarations(p, toolReferences, tools, r, s);
    if (y) {
      for (let { reference, entry } of resolvedAgainstKept)
        p.set(reference, {
          kind: "sent",
          entry,
        });
      for (let unrecordedDeparture of unrecordedDepartures)
        p.set(unrecordedDeparture, {
          kind: "stripped",
        });
    }
    return {
      references: toolReferences,
      kept,
      strippedReferenceKeys,
      writes: y,
      category: T,
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
function keptDeferredToolNames(normalizedMessages, tools, { keepMcp: o = true, surfacedOnWire: r } = {}) {
  try {
    let c = deferredToolCache();
    if (!areDeferredToolsKept()) return;
    let { kept } = planDeferredToolDeclarations(
      c,
      collectToolReferences(normalizedMessages, {
        surfacedOnWire: r,
      }),
      tools,
      o,
    );
    let u = new Set(tools.map((p) => p.name));
    return [...kept.keys()].filter((key) => !u.has(key));
  } catch (error) {
    logRetractionFailure(error);
    return;
  }
}
//@ chunk-a76knw89.js:23525-23722 placement
function stripToolReferencesBeforeCompaction(e) {
  let n = deferredToolCache();
  let lastIndex = e.findLastIndex((r) => r.type === "system" && r.subtype === "compact_boundary");
  return new Set(
    collectToolReferences(e.slice(lastIndex + 1))
      .filter((r) => n.get(r)?.kind !== "stripped")
      .map((r) => r.toolName),
  );
}
//@ chunk-a76knw89.js:23722-23842 placement
/**
 * 列出被剥离（stripped）的工具引用名。
 */
function strippedToolReferences(e) {
  let n = deferredToolCache();
  let o = new Set();
  for (let r of e?.references ?? []) if (n.get(r)?.kind === "stripped") o.add(definitionKey(r));
  return o;
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
  e,
  toolSchemas,
  o,
  { requestCarriesStructuredOutputs, requestDeclaresSearchCitations },
) {
  try {
    let max = Math.max(toolSchemas.length - 1, 0);
    let u = deferredToolCache();
    let p = u.generation !== e.generation;
    let h = {
      strict: requestCarriesStructuredOutputs,
      eager: anyEagerInputStreaming(toolSchemas),
      citations: requestDeclaresSearchCitations,
    };
    let T = [];
    let y = [];
    for (let [S, x] of e.kept) {
      let index = toolSchemas.findIndex((M) => "name" in M && toolMatchesName(M, S));
      let O = toolSchemas[index];
      if (O !== undefined) {
        if ("defer_loading" in O && O.defer_loading && !p)
          toolSchemas[index] = TOOL_DEFINITION_FLAG_KEYS(x.schema, h);
        continue;
      }
      y.push([S, x]);
      T.push(TOOL_DEFINITION_FLAG_KEYS(x.schema, h));
    }
    toolSchemas.splice(max, 0, ...T);
    if (!p) {
      for (let [S, { schema: x, isMcp: w }] of y)
        if (!w && "input_schema" in x) u.noteSpliced(S, x.input_schema);
    }
    if (!e.writes || p) return;
    let querySource = e.querySource ?? "";
    if (y.length === 0 && e.strippedReferenceKeys.size === 0) u.telemetrySignatureChanged(querySource, "");
    else {
      logForDebugging(
        `Dynamic tool loading: keeping ${y.length} departed deferred tool(s) declared; ${e.strippedReferenceKeys.size} reference(s) held stripped`,
      );
      let S = `${y
        .map(([x]) => x)
        .sort()
        .join(",")}|${e.strippedReferenceKeys.size}`;
      if (u.telemetrySignatureChanged(querySource, S)) {
        let x = fromEnumOpt(e.category);
        logFeatureOk("mcp_kept_deferred_tools", {
          kept_count: y.length,
          kept_mcp_count: count(y, ([, w]) => w.isMcp),
          stripped_reference_count: e.strippedReferenceKeys.size,
          ...(x !== undefined && {
            query_source_category: x,
          }),
        });
      }
    }
    let k = new Map();
    for (let reference of e.references) {
      if (e.strippedReferenceKeys.has(definitionKey(reference))) continue;
      let toolName = resolveToolName(reference.toolName, (M) => o.has(M) || e.kept.has(M));
      let w = o.get(toolName);
      if (e.kept.has(toolName) || !w || !("defer_loading" in w.schema) || w.schema.defer_loading !== true)
        continue;
      let O = k.get(toolName);
      if (O === undefined) {
        O = {
          schema: w.schema,
          isMcp: w.isMcp,
        };
        k.set(toolName, O);
      }
      u.set(reference, {
        kind: "sent",
        entry: O,
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
function seedDeferredToolReferences(e, n, o) {
  try {
    let r = o?.strippedReferences ?? new Set();
    if ((n.length === 0 && r.size === 0) || !deferredToolsKeptCached()) return 0;
    let c = deferredToolCache();
    let s = new Map();
    for (let T of n)
      if (isDeferredCustomToolDefinition(T) && !s.has(T.name))
        s.set(T.name, {
          schema: T,
          isMcp: T.name.startsWith("mcp__"),
        });
    let u;
    if (o?.surfacedCarrier !== undefined) {
      u = new Set();
      for (let T of e) {
        if (
          T.type !== "attachment" ||
          T.attachment.type !== "deferred_tools_delta" ||
          o.surfacedCarrier.nameOnlyAnnouncements.has(T.uuid)
        )
          continue;
        let surfacedNames = T.attachment.surfacedNames;
        for (let b of Array.isArray(surfacedNames) ? surfacedNames : [])
          if (typeof b === "string" && s.has(b)) u.add(b);
      }
      for (let T of u) o.surfacedCarrier.surfacedOnWire.add(T);
    }
    let p = 0;
    let h = new Set();
    for (let T of collectToolReferences(e, {
      surfacedOnWire: u,
    })) {
      let y = c.get(T);
      if (r.has(definitionKey(T))) {
        if (y?.kind !== "stripped") {
          c.set(T, {
            kind: "stripped",
          });
          p++;
        }
        continue;
      }
      if (y !== undefined) continue;
      let toolName = resolveToolName(T.toolName, (S) => s.has(S));
      let k = s.get(toolName);
      if (k === undefined) continue;
      c.set(T, {
        kind: "sent",
        entry: k,
      });
      h.add(toolName);
      p++;
    }
    if (p > 0)
      logForDebugging(
        `Dynamic tool loading: seeded ${p} tool reference(s) to ${h.size} deferred tool(s) the previous process sent`,
      );
    return p;
  } catch (error) {
    logError(error);
    logFeatureBad("mcp_kept_deferred_tools", "seed_failed");
    return 0;
  }
}
//@ chunk-a76knw89.js:26539-26645 placement
function sameDefinitionIgnoringOptional(schema, n) {
  if (isDeepStrictEqual(schema, n)) return true;
  let o = {
    ...schema,
  };
  for (let r of TOOL_DEFINITION_BOOLEAN_KEYS) if (!(r in n)) delete o[r];
  return isDeepStrictEqual(o, n);
}
//@ chunk-a76knw89.js:26645-27173 placement
function keepDepartedDeferredTools(messages, surfacedOnWire, o, r, querySource, generation) {
  try {
    if (surfacedOnWire.size === 0 || !areDeferredToolsKept()) return;
    let u = deferredToolCache();
    if (u.generation !== generation) return;
    if (!shouldTrackDeferredTool(classifyQuerySource(querySource), querySource)) return;
    let p = new Map();
    for (let h of collectToolReferences(messages, {
      surfacedOnWire,
    })) {
      if (u.get(h) !== undefined) continue;
      let toolName = resolveToolName(h.toolName, (k) => r?.kept.has(k) === true || o.has(k));
      let y = r?.kept.get(toolName) ?? o.get(toolName);
      if (!y || !("defer_loading" in y.schema) || y.schema.defer_loading !== true) continue;
      let b = p.get(toolName);
      if (b === undefined) {
        b = {
          schema: y.schema,
          isMcp: y.isMcp,
        };
        p.set(toolName, b);
      }
      u.set(h, {
        kind: "sent",
        entry: b,
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
function restoreDeferredDefinitions(e, tools) {
  try {
    let o = isDeferredDefinition(tools);
    for (let j = 0; j < e.length; j++) {
      let c = o.get(e[j].name);
      if (c !== undefined && isDeferredCustomToolDefinition(c)) e[j] = c;
    }
  } catch (error) {
    logError(error);
  }
}
//@ chunk-a76knw89.js:27303-27765 placement
function recordDeferredToolsSent(e, tools) {
  try {
    let o = deferredToolCache();
    if (!e.writes || o.generation !== e.generation) return;
    let r = isDeferredDefinition(tools);
    let c = new Map();
    for (let reference of e.references) {
      if (e.strippedReferenceKeys.has(definitionKey(reference))) continue;
      let toolName = resolveToolName(reference.toolName, (y) => r.has(y));
      let p = r.get(toolName);
      let h = o.get(reference);
      if (p === undefined || h?.kind !== "sent" || sameDefinitionIgnoringOptional(h.entry.schema, p))
        continue;
      let T = c.get(toolName);
      if (T === undefined) {
        T = {
          schema: p,
          isMcp: h.entry.isMcp,
        };
        c.set(toolName, T);
      }
      o.set(reference, {
        kind: "sent",
        entry: T,
      });
    }
  } catch (error) {
    logError(error);
    logFeatureBad("mcp_kept_deferred_tools", "record_failed");
  }
}
//@ chunk-a76knw89.js:27765-27825 placement
function shouldTrackDeferredTool(e, n) {
  return e === "main" || (e === "subagent" && n !== FORK_AGENT_BUILTIN_ID);
}
//@ chunk-a76knw89.js:27825-27860 placement
/**
 * 导出函数 `shouldTrackDeferredToolForQuery`：参数 e，返回 xe(classifyQuerySource(e), e)。
 */
function shouldTrackDeferredToolForQuery(querySource) {
  return shouldTrackDeferredTool(classifyQuerySource(querySource), querySource);
}
//@ chunk-a76knw89.js:27860-28085 placement
function isDeferredDefinition(e) {
  let n = new Map();
  for (let o of e)
    if ("defer_loading" in o && o.defer_loading === true && "name" in o && typeof o.name === "string")
      if ("cache_control" in o) {
        let { cache_control: cacheControl, ...c } = o;
        n.set(o.name, c);
      } else n.set(o.name, o);
  return n;
}
//@ chunk-a76knw89.js:28085-28121 placement
/**
 * 导出函数 `findTool`：参数 e, n, o，返回 findToolByName(e, n, o)。
 */
function findTool(e, n, toolAliases) {
  return findToolByName(e, n, toolAliases);
}
//@ chunk-a76knw89.js:28121-28174 placement
var AUTHENTICATE = "authenticate";
var COMPLETE_AUTHENTICATION = "complete_authentication";
//@ chunk-a76knw89.js:28174-28374 placement
function normalizeToolReference(e) {
  if (typeof e !== "object" || e === null) return false;
  let n = e;
  return (
    typeof n.name === "string" &&
    (n.errorCode === undefined || typeof n.errorCode === "string") &&
    (n.error === undefined || typeof n.error === "string")
  );
}
//@ chunk-a76knw89.js:28374-28385 placement
var MAX_SERVER_NAME_CHARS = 200;
//@ chunk-a76knw89.js:28385-28484 placement
/**
 * 导出函数 `normalizeServerNameShort`：参数 e, n = 64，返回 ""; return normalizeMcpServerName(normalizeNfkc(e).replace(/['`]/g, " "), n, "none")。
 */
function normalizeServerNameShort(e, n = 64) {
  if (typeof e !== "string") return "";
  return normalizeMcpServerName(normalizeNfkc(e).replace(/['`]/g, " "), n, "none");
}
//@ chunk-a76knw89.js:28484-28600 placement
var regExp = new RegExp(
  `[<>";\\u2018\\u2019\\u201A\\u201C\\u201D\\u201E\\u00AB\\u00BB${[...BRACKET_CONFUSABLES.keys()].join("")}]`,
  "gu",
);
//@ chunk-a76knw89.js:28600-28638 placement
/**
 * 导出函数 `normalizeServerNameLong`：参数 e, n = 1024，返回 normalizeMcpServerName(e, n)。
 */
function normalizeServerNameLong(e, n = 1024) {
  return normalizeMcpServerName(e, n);
}
//@ chunk-a76knw89.js:28638-28860 placement
function normalizeMcpServerName(e, n = MAX_SERVER_NAME_CHARS, o = "all") {
  if (typeof e !== "string") return "";
  let trimmed = sanitizeLogLine(normalizeNfkc(e)).replaceAll(regExp, " ").replaceAll(/\s+/g, " ").trim();
  let max = Math.max(MAX_ERROR_TEXT_CHARS, n + ERROR_TEXT_SLACK_CHARS);
  let s = trimmed.length > max;
  let u = redactSecrets(s ? truncateToLength(trimmed, max) : trimmed, o);
  return s || u.length > n ? `${truncateToLength(u, n)}\u2026` : u;
}
//@ chunk-a76knw89.js:28860-28871 placement
var MAX_DETAIL_CHARS = 500;
//@ chunk-a76knw89.js:28871-29000 placement
/**
 * 清洗错误详情文本：去控制字符、压缩空白、截断到上限。
 */
function sanitizeErrorDetail(e) {
  let trimmed = sanitizeLogLine(e).replaceAll(/\s+/g, " ").trim();
  let o = redactSecrets(
    trimmed.length > MAX_ERROR_TEXT_CHARS ? truncateToLength(trimmed, MAX_ERROR_TEXT_CHARS) : trimmed,
  );
  return o.length > MAX_DETAIL_CHARS ? `${truncateToLength(o, MAX_DETAIL_CHARS)}\u2026` : o;
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
