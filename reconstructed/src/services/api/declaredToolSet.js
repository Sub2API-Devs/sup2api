/**
 * services/api/declaredToolSet.ts
 *
 * 2.1.316 新增："已声明工具集"：请求中声明的工具在会话内保持稳定（压缩时丢弃、从记录恢复、late tool additions、inline tools 回退）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-a76knw89.js (58)
 * attribution: placement 58
 */
import { STRUCTUREDOUTPUT } from "../../tools/SyntheticOutputTool/SyntheticOutputTool.js";
import {
  getStickyBetas,
  isToolChangeHeaderRefused,
  isInlineToolsRefused,
  markToolChangeHeaderRefused,
  markBetaHeaderRefused,
  markInlineToolsRefused,
  markToolChangeUnsupportedModel,
} from "../../bootstrap/state.js";
import {
  isFoamySpringEnabled,
  describeToolAvailability,
  isPermanentUnavailabilityFor,
} from "../mcp/mcpToolAvailability.js";
import { mcpInfoFromString, getMcpPrefix } from "../mcp/mcpStringUtils.js";
import { compareToolsByName, getAllBaseToolsFromRegistry, toolMatchesName } from "../../Tool.js";
import {
  TOOL_DEFINITION_BOOLEAN_KEYS,
  anyEagerInputStreaming,
  TOOL_DEFINITION_FLAG_KEYS,
  ownValue,
} from "./toolDefinitionShape.js";
import { TOOL_SEARCH_TOOL_NAME } from "../../tools/ToolSearchTool/prompt.js";
import { getDenyRuleIndex } from "../../utils/permissions/permissions.js";
import { logError } from "../../utils/log.js";
import { toError } from "../../utils/errors.js";
import { hasComplianceTaint } from "../policyLimits/complianceTaints.js";
import {
  markDeclaredToolsDecided,
  setDeclaredTools,
  isBetaSent,
  isBetaRejected,
  markBetaSent,
  markBetaRejected,
  rejectInlineToolsHeader,
} from "../../bootstrap/stateSlices.js";
import { logEvent } from "../analytics/index.js";
import { WAITFORMCPSERVERS } from "../../tools/WaitForMcpServersTool/WaitForMcpServersTool.js";
import { findTool, areDeferredToolsKept } from "./deferredToolsState.js";
import {
  isToolDroppedByDenyRules,
  isToolOmittedByLaunchToolList,
  isOutsideLaunchToolList,
  codeExecutionToolNames,
} from "../../utils/permissions/filterToolsByDenyRules.js";
import { isCodeExecutionTool } from "../mcp/redactMcpErrors.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import {
  modelTakesToolAdditions,
  BETA_MID_CONV_TOOL_CHANGE,
  BETA_MID_CONVERSATION_SYSTEM,
  BETA_INLINE_TOOLS,
} from "../../utils/betas.js";
import { isFoamySpringGateOn, isInlineToolsEnabled } from "../analytics/growthbookGates.js";
import { getCanonicalName } from "../../utils/model/canonicalModelName.js";
import { logForDebugging } from "../../utils/debug.js";
import { logFeatureSad } from "../analytics/featureTelemetry.js";

//@ chunk-a76knw89.js:8006-8070 placement = stripCacheControl (1)
/**
 * 取对象上的 cache_control（没有为 undefined）。旧版名 stripCacheControl 为错配。
 */
function getCacheControl(items) {
  return "cache_control" in items ? items.cache_control : undefined;
}
//@ chunk-a76knw89.js:8070-8157 placement = stripCacheControl (1)
/**
 * 去掉对象的 cache_control 字段。
 */
function stripCacheControl(item) {
  if (!("cache_control" in item)) return item;
  let { cache_control: cacheControl, ...rest } = item;
  return rest;
}
//@ chunk-a76knw89.js:43836-44543 placement
/**
 * 会话已声明工具名集合（含仅记录的条目与顺序）。
 */
class DeclaredToolSet {
  names;
  recordedOnly;
  recordOrder;
  #e;
  constructor(
    e,
    n = {
      only: new Map(),
      order: [],
    },
  ) {
    this.names = n.names ?? [...e.map((o) => o.name), ...n.only.keys()];
    this.recordedOnly = n.only;
    this.recordOrder = n.order;
    this.#e = new Map(e.map((o) => [o.name, o]));
  }
  has(e) {
    return this.#e.has(e) || this.recordedOnly.has(e);
  }
  keeps(e) {
    return this.has(e) && e !== STRUCTUREDOUTPUT;
  }
  toolFor(e) {
    return this.#e.get(e);
  }
  without(e) {
    return new DeclaredToolSet(
      [...this.#e.values()].filter((n) => !e.has(n.name)),
      {
        only: new Map([...this.recordedOnly].filter(([n]) => !e.has(n))),
        order: this.recordOrder.filter((n) => !e.has(n)),
        names: this.names.filter((n) => !e.has(n)),
      },
    );
  }
  sourceFor(e) {
    let n = this.#e.get(e);
    let server = this.recordedOnly.get(e)?.server;
    if (n !== undefined || server === undefined) return n;
    return getToolNameForPermissionCheck(e, server);
  }
}
//@ chunk-a76knw89.js:44543-44574 placement
/**
 * 导出函数 `stickyBetasOr`：参数 e，返回 e ?? getStickyBetas()。
 */
function stickyBetasOr(stickyBetas) {
  return stickyBetas ?? getStickyBetas();
}
//@ chunk-a76knw89.js:44574-44645 placement
/**
 * 导出函数 `asDeclaredToolSet`：参数 e，返回 declaredTools instanceof DeclaredToolSet ? declaredTools : void 0。
 */
function asDeclaredToolSet(e) {
  let declaredTools = e.declaredTools;
  return declaredTools instanceof DeclaredToolSet ? declaredTools : undefined;
}
//@ chunk-a76knw89.js:44645-44717 placement
/**
 * 导出函数 `asScratchDeclaredToolSet`：参数 e，返回 noChannelTools instanceof DeclaredToolSet ? noChannelTools : void 0。
 */
function asScratchDeclaredToolSet(e) {
  let noChannelTools = e.noChannelTools;
  return noChannelTools instanceof DeclaredToolSet ? noChannelTools : undefined;
}
//@ chunk-a76knw89.js:44717-44856 placement
/**
 * 缓存"无通道工具"计算结果：强制刷新时清空，未开启且未缓存时跳过。
 */
function cacheNoChannelTools(conversation, n, o) {
  if (n) {
    conversation.noChannelTools = undefined;
    return;
  }
  if (conversation.noChannelTools === undefined && !isFoamySpringEnabled()) return;
  let r = o();
  conversation.noChannelTools = r;
  return r;
}
//@ chunk-a76knw89.js:44856-45338 placement
function buildDeclaredToolSet(e, tools, o) {
  let r = new Set([...tools, ...e].map((y) => y.name));
  let c = new Map([...(o ?? [])].filter(([y]) => !r.has(y)));
  if (c.size === 0) return new DeclaredToolSet(e);
  let s = (y) => y.isMcp === true || mcpInfoFromString(y.name) !== null;
  let index = e.findIndex(s);
  let p = (y, b) =>
    !s(y) && ((y.name === STRUCTUREDOUTPUT && b === e.length - 1) || (index !== -1 && b > index));
  let sorted = [...e.filter(s).map((y) => y.name), ...c.keys()].sort((name, name_2) =>
    compareToolsByName(
      {
        name,
      },
      {
        name: name_2,
      },
    ),
  );
  let T = [
    ...e.filter((y, b) => !s(y) && !p(y, b)).map((y) => y.name),
    ...sorted,
    ...e.filter(p).map((y) => y.name),
  ];
  return new DeclaredToolSet(e, {
    only: c,
    order: T,
    names: T,
  });
}
//@ chunk-a76knw89.js:45338-45405 placement = buildDiffableContent (0.675)
/**
 * 工具定义比对时关心的键（name/description/input_schema/type 及附加键）。旧版名 buildDiffableContent 为错配；使用方在 chunk-a76knw89 的记录工具比较里。
 */
var TOOL_DIFF_KEYS = new Set([
  "name",
  "description",
  "input_schema",
  "type",
  ...TOOL_DEFINITION_BOOLEAN_KEYS,
]);
//@ chunk-a76knw89.js:45405-46082 placement
async function markReconnectingServers(
  {
    recordedToolDescriptions,
    recordedToolServers,
    recordedToolEntries,
    mcpClients = [],
    getToolPermissionContext,
  },
  tools,
  u,
) {
  if (
    recordedToolDescriptions === undefined ||
    recordedToolDescriptions.has(TOOL_SEARCH_TOOL_NAME) ||
    !isFoamySpringEnabled()
  )
    return;
  let p = new Set(tools.map((k) => k.name));
  let h = [];
  for (let key of recordedToolDescriptions.keys()) {
    let S = recordedToolEntries?.get(key);
    let x = recordedToolServers?.get(key);
    if (
      !p.has(key) &&
      u?.has(key) !== true &&
      S !== undefined &&
      x !== undefined &&
      key.startsWith(getMcpPrefix(x)) &&
      S.name === key &&
      /^[a-zA-Z0-9_-]+$/.test(key) &&
      Object.keys(S).every((key) => TOOL_DIFF_KEYS.has(key))
    )
      h.push({
        name: key,
        entry: S,
        server: x,
      });
  }
  if (h.length === 0) return;
  let toolPermissionContext = await getToolPermissionContext();
  let y = new Map();
  let b;
  for (let { name: k, entry, server } of h)
    try {
      b ??= getDenyRuleIndex(toolPermissionContext);
      if (
        describeToolAvailability(
          k,
          mcpClients,
          toolPermissionContext,
          getToolNameForPermissionCheck(k, server),
          b,
        ).kind === "reconnecting"
      )
        y.set(k, {
          entry,
          server,
        });
    } catch (error) {
      logError(toError(error));
    }
  return y.size === 0 ? undefined : y;
}
//@ chunk-a76knw89.js:46082-46611 placement
async function isHipaaRestricted(e, tools, { mcpClients, getPermissionContext, byValue }) {
  let s = hasDeclaredToolSet(e, tools, true);
  if (s.length === 0)
    return {
      kept: e,
      unread: 0,
    };
  let u = hasComplianceTaint("hipaa");
  let p = (S) => u && !isMcpToolName(S, e.sourceFor(S)?.mcpInfo?.serverName);
  let h = (S) => byValue?.has(S) === true || p(S);
  let T;
  try {
    T = await getPermissionContext();
  } catch (error) {
    logError(toError(error));
    let x = new Set(s.filter(h));
    return {
      kept: x.size === 0 ? e : e.without(x),
      unread: 0,
    };
  }
  let y = 0;
  let b;
  let k = new Set(
    s.filter((S) => {
      if (h(S)) return true;
      try {
        b ??= getDenyRuleIndex(T);
        return isPermanentUnavailabilityFor(describeToolAvailability(S, mcpClients, T, e.sourceFor(S), b));
      } catch (error) {
        logError(toError(error));
        y++;
        return true;
      }
    }),
  );
  return {
    kept: k.size === 0 ? e : e.without(k),
    unread: y,
  };
}
//@ chunk-a76knw89.js:46611-46689 placement
/**
 * 导出函数 `stickyBetasForRequest`：参数 e，返回 OYo(e.stickyBetas)。
 */
function stickyBetasForRequest(toolUseContext) {
  if (toolUseContext.agentId && !toolUseContext.stickyBetas) return;
  return stickyBetasOr(toolUseContext.stickyBetas);
}
//@ chunk-a76knw89.js:46689-46750 placement
/**
 * 导出函数 `cachedDeclaredTools`：参数 e，返回 n === void 0 ? void 0 : DSe(n)。
 */
function cachedDeclaredTools(toolUseContext) {
  let n = stickyBetasForRequest(toolUseContext);
  return n === undefined ? undefined : asDeclaredToolSet(n);
}
//@ chunk-a76knw89.js:46750-46811 placement
/**
 * 导出函数 `cachedNoChannelTools`：参数 e，返回 n === void 0 ? void 0 : kbn(n)。
 */
function cachedNoChannelTools(toolUseContext) {
  let n = stickyBetasForRequest(toolUseContext);
  return n === undefined ? undefined : asScratchDeclaredToolSet(n);
}
//@ chunk-a76knw89.js:46811-46909 placement
/**
 * 导出函数 `recordDeclaredToolsIfMissing`：参数 e, n，返回 !1; return (dLn(e, new DeclaredToolSet(n)), !0)。
 */
function recordDeclaredToolsIfMissing(conversation, n) {
  markDeclaredToolsDecided(conversation);
  if (conversation.declaredTools !== undefined || !isFoamySpringEnabled()) return false;
  setDeclaredTools(conversation, new DeclaredToolSet(n));
  return true;
}
//@ chunk-a76knw89.js:46909-47914 placement
/**
 * 决定本次请求的已声明工具（启动时省略、开关关闭等原因）。
 */
function planDeclaredTools(names, n, { servers: o, entries: r } = EMPTY_PLAN_SOURCES, permissionContext) {
  let s = new Map(n.map((O) => [O.name, O]));
  let u;
  let p = () => {
    u ??= getAllBaseToolsFromRegistry() ?? null;
    return u ?? undefined;
  };
  let h = (O) => {
    let underlyingV1ToolName = p()?.find((I) => toolMatchesName(I, O))?.underlyingV1ToolName;
    return underlyingV1ToolName === undefined ? undefined : s.get(underlyingV1ToolName);
  };
  let T = new Map();
  let y = new Map();
  let b = 0;
  let k = 0;
  let S = 0;
  let x = (O) => {
    return;
  };
  let w = [...names];
  for (let O of w) {
    let M = s.get(O) ?? x(O) ?? h(O);
    if (M === undefined) {
      let P = r?.get(O);
      let j = o?.get(O);
      if (P === undefined || isPinnedUpfrontTool(O, j, p())) continue;
      if (isUndeclarableTool(O, j, p(), n))
        y.set(O, {
          entry: P,
          server: j,
        });
      else {
        let G = describeDeclaredToolsSkipReason(O, p(), permissionContext);
        if (G === "launch_omitted") {
          y.set(O, {
            entry: P,
            server: j,
          });
          S++;
        } else if (G === "gate_off") {
          y.set(O, {
            entry: P,
            server: j,
          });
          b++;
          if (requiresUserInteractionByName(O, p())) k++;
        }
      }
      continue;
    }
    T.set(M.name, M);
    let I = M.underlyingV1ToolName === undefined ? undefined : s.get(M.underlyingV1ToolName);
    if (I !== undefined) T.set(I.name, I);
  }
  for (let O of n)
    if (O.underlyingV1ToolName !== undefined && T.has(O.underlyingV1ToolName)) T.set(O.name, O);
  for (let key of T.keys()) y.delete(key);
  return T.size === 0 && y.size === 0
    ? undefined
    : {
        held: new DeclaredToolSet(
          n.filter((O) => T.has(O.name)),
          {
            only: y,
            order: w,
          },
        ),
        recorded: w.length,
        gateOff: b,
        needsUser: k,
        launchOmitted: S,
      };
}
//@ chunk-a76knw89.js:47914-48419 placement
/**
 * 从记录恢复或首次决定已声明工具集（tengu_declared_tool_set_from_record）。
 */
function resolveDeclaredToolSet(e, n, o, { latch, permissionContext }) {
  let s = asDeclaredToolSet(e);
  if (s !== undefined || e.declaredToolsDecided) return s;
  if (latch) markDeclaredToolsDecided(e);
  if (e.declaredTools !== undefined || !isFoamySpringEnabled()) return;
  let u = n();
  let p = u === undefined ? undefined : planDeclaredTools(u.names, o, u, permissionContext);
  if (p === undefined || !latch) return p?.held;
  setDeclaredTools(e, p.held);
  logEvent("tengu_declared_tool_set_from_record", {
    recorded: p.recorded,
    held: p.held.names.length - p.held.recordedOnly.size,
    heldByName: p.held.recordedOnly.size,
    heldGateOff: p.gateOff,
    heldNeedsUser: p.needsUser,
    heldLaunchOmitted: p.launchOmitted,
  });
  return p.held;
}
//@ chunk-a76knw89.js:48419-48969 placement
function updateDeclaredToolSet(e, n) {
  if (n === undefined)
    return {
      tools: e,
      redeclared: [],
    };
  let o = new Set(e.map((u) => u.name));
  let r = (u) => (o.has(u) || !n.keeps(u) ? undefined : n.toolFor(u));
  if (n.names.every((u) => r(u) === undefined))
    return {
      tools: e,
      redeclared: [],
    };
  let c = [...e];
  let s = [];
  n.names.forEach((u, p) => {
    let h = r(u);
    if (!h) return;
    let T = -1;
    for (let j = p - 1; j >= 0 && T === -1; j--) {
      let b = n.names[j];
      T = c.findIndex((k) => k.name === b);
    }
    if (T !== -1) c.splice(T + 1, 0, h);
    else {
      let index = c.findIndex((b) => n.has(b.name));
      c.splice(index === -1 ? 0 : index, 0, h);
    }
    o.add(u);
    s.push(u);
  });
  return s.length === 0
    ? {
        tools: e,
        redeclared: s,
      }
    : {
        tools: c,
        redeclared: s,
      };
}
//@ chunk-a76knw89.js:48969-49057 placement
/**
 * 导出函数 `turnDeniedTools`：参数 e, n，返回 updateDeclaredToolSet(e, turnDeniedTools instanceof DeclaredToolSet ? turnDeniedTools : void 0) .tools。
 */
function turnDeniedTools(tools, n) {
  let turnDeniedTools = n.turnDeniedTools;
  return updateDeclaredToolSet(
    tools,
    turnDeniedTools instanceof DeclaredToolSet ? turnDeniedTools : undefined,
  ).tools;
}
//@ chunk-a76knw89.js:49057-49249 placement
function logDeclaredToolsDroppedAtCompaction(e, n) {
  let o = asDeclaredToolSet(e);
  if (o === undefined || n.length === 0) return;
  e.declaredTools = o.without(new Set(n));
  logEvent("tengu_declared_tools_dropped_at_compaction", {
    dropped: n.length,
    noDeferredChannel: false,
  });
}
//@ chunk-a76knw89.js:49249-49317 placement
/**
 * 导出函数 `hasScratchToolSet`：参数 e, n，返回 hasDeclaredToolSet(o, n, !0)。
 */
function hasScratchToolSet(e, tools) {
  let o = e === undefined ? undefined : asScratchDeclaredToolSet(e);
  return hasDeclaredToolSet(o, tools, true);
}
//@ chunk-a76knw89.js:49317-49510 placement
function logDeclaredToolsDroppedAtCompaction2(e, n) {
  let o = asScratchDeclaredToolSet(e);
  if (o === undefined || n.length === 0) return;
  e.noChannelTools = o.without(new Set(n));
  logEvent("tengu_declared_tools_dropped_at_compaction", {
    dropped: n.length,
    noDeferredChannel: true,
  });
}
//@ chunk-a76knw89.js:49510-49712 placement
function hasDeclaredToolSet(e, tools, o) {
  if (e === undefined) return [];
  let r = new Set(tools.map((c) => c.name));
  return e.names.filter((c) => {
    if (r.has(c) || !e.keeps(c)) return false;
    let mcpInfo = e.sourceFor(c)?.mcpInfo;
    return o || !isMcpToolName(c, mcpInfo?.serverName);
  });
}
//@ chunk-a76knw89.js:49712-49751 placement
/**
 * 声明工具集合的默认来源（servers/entries 为空），用于 planDeclaredTools 的参数默认值。
 */
var EMPTY_PLAN_SOURCES = {
  servers: undefined,
  entries: undefined,
};
//@ chunk-a76knw89.js:49751-49918 placement
function isUndeclarableTool(e, n, o, r) {
  if (e === STRUCTUREDOUTPUT) return false;
  if (n !== undefined) return true;
  if (mcpInfoFromString(e) !== null) return false;
  if (e === WAITFORMCPSERVERS && !r.some((c) => toolMatchesName(c, TOOL_SEARCH_TOOL_NAME))) return true;
  return o !== undefined && findTool(o, e) === undefined;
}
//@ chunk-a76knw89.js:49918-50326 placement
function describeDeclaredToolsSkipReason(e, n, o) {
  if (o === undefined || n === undefined) return;
  if (e === STRUCTUREDOUTPUT || e === WAITFORMCPSERVERS || mcpInfoFromString(e) !== null) return;
  let found = n.find((c) => c.name === e);
  if (found === undefined || found.isMcp === true) return;
  if (!isGleamingCupcakeEnabled() || hasComplianceTaint("hipaa")) return;
  if (isToolDroppedByDenyRules(o, found))
    return isToolOmittedByLaunchToolList(o, found) ? "launch_omitted" : undefined;
  if (isOutsideLaunchToolList(o, found))
    return o.builtInToolsDisabled === true ||
      (o.restricted === true &&
        isCodeExecutionTool(codeExecutionToolNames([found]), new Set()).includes(found.name))
      ? undefined
      : "launch_omitted";
  if (found.isEnabled()) return;
  return "gate_off";
}
//@ chunk-a76knw89.js:50326-50409 placement
function requiresUserInteractionByName(e, n) {
  return n?.find((o) => o.name === e)?.requiresUserInteraction?.() === true;
}
//@ chunk-a76knw89.js:50409-50441 placement
var TENGU_GLEAMING_CUPCAKE = "tengu_gleaming_cupcake";
//@ chunk-a76knw89.js:50441-50471 placement
function isGleamingCupcakeEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_GLEAMING_CUPCAKE, true);
}
//@ chunk-a76knw89.js:50471-50500 placement
var TENGU_JOYFUL_ANCHOR = "tengu_joyful_anchor";
//@ chunk-a76knw89.js:50500-50698 placement
function isPinnedUpfrontTool(e, n, o) {
  if (isMcpToolName(e, n)) return false;
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_JOYFUL_ANCHOR, null);
  if (!Array.isArray(featureValue_CACHED_MAY_BE_STALE) || featureValue_CACHED_MAY_BE_STALE.length === 0)
    return false;
  let found = o?.find((s) => toolMatchesName(s, e));
  return featureValue_CACHED_MAY_BE_STALE.some(
    (s) => typeof s === "string" && (s === e || (found !== undefined && toolMatchesName(found, s))),
  );
}
//@ chunk-a76knw89.js:50698-50803 placement = getToolNameForPermissionCheck (1)
function getToolNameForPermissionCheck(e, server) {
  let mcpPrefix = getMcpPrefix(server);
  return {
    mcpInfo: {
      serverName: server,
      toolName: e.startsWith(mcpPrefix) ? e.slice(mcpPrefix.length) : e,
    },
  };
}
//@ chunk-a76knw89.js:50803-50852 placement
function isMcpToolName(e, n) {
  return n !== undefined || mcpInfoFromString(e) !== null;
}
//@ chunk-a76knw89.js:50852-51486 placement
function computeLateToolAdditions(
  toolSchemas,
  n,
  {
    pool,
    keptDeferred,
    keepMcp,
    requestCarriesStructuredOutputs,
    requestDeclaresSearchCitations,
    recordedEntries,
  },
) {
  let h = new Set(
    isLateToolAdditionsEnabled(n, {
      pool,
      keptDeferred,
      keepMcp,
    }),
  );
  if (h.size === 0) return [];
  let T = new Set(toolSchemas.map(mergeClients_2));
  let recordOrder = n.recordOrder;
  let b = {
    strict: requestCarriesStructuredOutputs,
    eager: anyEagerInputStreaming(toolSchemas),
    citations: requestDeclaresSearchCitations,
  };
  let k = [];
  recordOrder.forEach((S, x) => {
    let w = n.recordedOnly.get(S);
    if (w === undefined || T.has(S) || !h.has(S)) return;
    let O = recordedEntries?.get(S) ?? w.entry;
    let M = -1;
    for (let idx = x - 1; idx >= 0 && M === -1; idx--) {
      let P = recordOrder[idx];
      if (T.has(P)) M = toolSchemas.findIndex((j) => mergeClients_2(j) === P) + 1;
    }
    if (M === -1) {
      let I = new Set(recordOrder);
      let index = toolSchemas.findIndex((j) => I.has(mergeClients_2(j) ?? ""));
      M = index === -1 ? 0 : index;
    }
    toolSchemas.splice(M, 0, TOOL_DEFINITION_FLAG_KEYS(O, b));
    T.add(S);
    k.push(S);
  });
  return k;
}
//@ chunk-a76knw89.js:51486-51695 placement
function isLateToolAdditionsEnabled(e, { pool, keptDeferred, keepMcp }) {
  let c = new Set([...pool.map((s) => s.name), ...keptDeferred]);
  return e.recordOrder.filter((s) => {
    let u = e.recordedOnly.get(s);
    return u !== undefined && !c.has(s) && (keepMcp || !isMcpToolName(s, u.server));
  });
}
//@ chunk-a76knw89.js:51695-51767 placement = mergeClients (1)
function mergeClients_2(e) {
  return "name" in e && typeof e.name === "string" ? e.name : undefined;
}
//@ chunk-a76knw89.js:51767-51795 placement
/**
 * 导出函数 `deferredToolsEnabled`：返回 l$e()。
 */
function deferredToolsEnabled() {
  return areDeferredToolsKept();
}
//@ chunk-a76knw89.js:51795-51885 placement
/**
 * 导出函数 `clientNames`：参数 e，返回 n。
 */
function clientNames(toolSchemas) {
  let n = new Set();
  for (let o of toolSchemas) {
    let r = mergeClients_2(o);
    if (r !== undefined) n.add(r);
  }
  return n;
}
//@ chunk-a76knw89.js:51885-52282 placement
function logDeclaredToolSetHeld(e) {
  if (e.deferredLate === 0 && e.redeclared === 0 && e.fromRecord === 0 && e.unclassifiedDepartures === 0)
    return;
  logEvent("tengu_declared_tool_set_held", {
    deferredLate: e.deferredLate,
    redeclared: e.redeclared,
    fromRecord: e.fromRecord,
    ...(e.queryDepth !== undefined && {
      queryDepth: e.queryDepth,
    }),
    toolSearchAbsent: e.toolSearchAbsent,
    noDeferredChannel: e.noDeferredChannel,
    unclassifiedDepartures: e.unclassifiedDepartures,
  });
}
//@ chunk-a76knw89.js:52282-52321 placement
function canDeclareToolChange(e, n) {
  return toolChangeHeaderAllowed(e) && modelTakesToolAdditions(n);
}
//@ chunk-a76knw89.js:52321-52361 placement
/**
 * 导出函数 `toolChangeHeaderAllowed`：参数 e，返回 lT(e, Lb) && !we(e)。
 */
function toolChangeHeaderAllowed(e) {
  return isBetaSent(e, BETA_MID_CONV_TOOL_CHANGE) && !isToolChangeHeaderBlocked(e);
}
//@ chunk-a76knw89.js:52361-52407 placement
function isToolChangeHeaderBlocked(e) {
  return (
    isBetaRejected(e, BETA_MID_CONVERSATION_SYSTEM) || isToolChangeHeaderRefused() || !areDeferredToolsKept()
  );
}
//@ chunk-a76knw89.js:52407-52476 placement
/**
 * 导出函数 `canDeclareToolChangeAhead`：参数 e, n，返回 (lT(e, Lb) || (Kpr() && !Lp(e, Lb))) && !we(e) && modelTakesToolAdditions(n)。
 */
function canDeclareToolChangeAhead(e, n) {
  return (
    (isBetaSent(e, BETA_MID_CONV_TOOL_CHANGE) ||
      (isFoamySpringGateOn() && !isBetaRejected(e, BETA_MID_CONV_TOOL_CHANGE))) &&
    !isToolChangeHeaderBlocked(e) &&
    modelTakesToolAdditions(n)
  );
}
//@ chunk-a76knw89.js:52476-52517 placement
/**
 * 导出函数 `canDeclareInlineTools`：参数 e, n，返回 Snr(e) && ae(e, n)。
 */
function canDeclareInlineTools(conversation, effectiveModel) {
  return inlineToolsAllowed(conversation) && canDeclareToolChange(conversation, effectiveModel);
}
//@ chunk-a76knw89.js:52517-52565 placement
/**
 * 导出函数 `inlineToolsAllowed`：参数 e，返回 lT(e, tb) && !isInlineToolsRefused() && Nrt(e)。
 */
function inlineToolsAllowed(e) {
  return isBetaSent(e, BETA_INLINE_TOOLS) && !isInlineToolsRefused() && toolChangeHeaderAllowed(e);
}
//@ chunk-a76knw89.js:52565-52672 placement
/**
 * 判断能否以内联方式追加工具（未被拒绝、相关 beta 可用）。
 */
function canInlineToolAdditions(e, n) {
  if (isInlineToolsRefused() || isBetaRejected(e, BETA_INLINE_TOOLS)) return false;
  if (isBetaSent(e, BETA_INLINE_TOOLS)) return canDeclareToolChangeAhead(e, n);
  return (
    !isBetaSent(e, BETA_MID_CONV_TOOL_CHANGE) && isInlineToolsEnabled() && canDeclareToolChangeAhead(e, n)
  );
}
//@ chunk-a76knw89.js:52672-52817 placement
/**
 * 判断是否需要宣布延迟加载的工具：ToolSearch 被过滤掉、通道可用且有延迟工具或工具池会刷新。
 */
function shouldAnnounceDeferredTools(e, n, { toolSearchToolFilteredOut, toolPoolRefreshes, aheadOfRequest }) {
  return (
    toolSearchToolFilteredOut &&
    (aheadOfRequest ? canDeclareToolChangeAhead(e, n) : canDeclareToolChange(e, n)) &&
    (asDeclaredToolSet(e) !== undefined || (toolPoolRefreshes && isFoamySpringEnabled()))
  );
}
//@ chunk-a76knw89.js:52817-53137 placement
/**
 * 根据工具追加通道是否可用，调整请求的 beta 列表（增删工具追加与内联工具 beta），并必要时登记不可用状态。
 */
function adjustToolBetas(betas, betaList, model) {
  let r = !isBetaSent(betas, BETA_MID_CONV_TOOL_CHANGE);
  if (betaList.includes(BETA_MID_CONV_TOOL_CHANGE) && !isToolChangeHeaderBlocked(betas)) {
    markBetaSent(betas, BETA_MID_CONV_TOOL_CHANGE);
    if (
      r &&
      betaList.includes(BETA_INLINE_TOOLS) &&
      !isInlineToolsRefused() &&
      !isBetaRejected(betas, BETA_INLINE_TOOLS)
    )
      markBetaSent(betas, BETA_INLINE_TOOLS);
  }
  let c = canDeclareToolChange(betas, model);
  let s = c && inlineToolsAllowed(betas);
  let u = betaList;
  if (c && !u.includes(BETA_MID_CONV_TOOL_CHANGE)) u = [...u, BETA_MID_CONV_TOOL_CHANGE];
  if (!c && u.includes(BETA_MID_CONV_TOOL_CHANGE)) u = u.filter((p) => p !== BETA_MID_CONV_TOOL_CHANGE);
  if (s && !u.includes(BETA_INLINE_TOOLS)) u = [...u, BETA_INLINE_TOOLS];
  if (!s && u.includes(BETA_INLINE_TOOLS)) u = u.filter((p) => p !== BETA_INLINE_TOOLS);
  return u;
}
//@ chunk-a76knw89.js:53137-53329 placement
/**
 * 按模型是否支持工具追加，生成包含或去掉相关 beta 的列表。
 */
function toolAdditionBetas(conversation, betaList, creditMintModel, model) {
  if (canDeclareToolChange(conversation, creditMintModel) && modelTakesToolAdditions(model)) {
    let c = betaList.includes(BETA_MID_CONV_TOOL_CHANGE)
      ? betaList
      : [...betaList, BETA_MID_CONV_TOOL_CHANGE];
    let s = inlineToolsAllowed(conversation);
    if (s && !c.includes(BETA_INLINE_TOOLS)) return [...c, BETA_INLINE_TOOLS];
    return s ? c : c.filter((u) => u !== BETA_INLINE_TOOLS);
  }
  return betaList.filter((c) => c !== BETA_MID_CONV_TOOL_CHANGE && c !== BETA_INLINE_TOOLS);
}
//@ chunk-a76knw89.js:53329-53628 placement
/**
 * 重试换用不支持工具追加的模型时，描述哪些内容被移动（advisor 条目、延迟条目、宣布块），无移动返回 undefined。
 */
function describeToolAdditionMoves(
  conversation,
  messages,
  { mintModel, retryModel, advisorEntryMoved, deferredEntriesMoved, hasDeferredChannel },
) {
  try {
    if (!canDeclareToolChange(conversation, mintModel) || modelTakesToolAdditions(retryModel)) return;
    let p = {
      advisor_entry: advisorEntryMoved,
      deferred_entries: deferredEntriesMoved,
      announcement_blocks:
        hasDeferredChannel && messages.some((h) => findDeferredToolsDelta(conversation, h)),
    };
    return Object.values(p).some(Boolean) ? p : undefined;
  } catch (error) {
    logError(toError(error));
    return;
  }
}
//@ chunk-a76knw89.js:53628-53903 placement
function findDeferredToolsDelta(e, n) {
  if (
    n.type !== "attachment" ||
    n.attachment.type !== "deferred_tools_delta" ||
    e.nameOnlyAnnouncements.has(n.uuid)
  )
    return false;
  let surfacedNames = n.attachment.surfacedNames;
  return (
    Array.isArray(surfacedNames) &&
    surfacedNames.some(
      (surfacedName) =>
        typeof surfacedName === "string" &&
        (e.surfacedOnWire.has(surfacedName) || e.definedByValue.has(surfacedName)),
    )
  );
}
//@ chunk-a76knw89.js:53903-54256 placement
function findLatestApiSystemDelta(conversation, messages, o, r, c = new Set()) {
  if (!r) return;
  let s = !toolChangeHeaderAllowed(conversation);
  for (let u of messages) {
    if (
      u.type !== "attachment" ||
      u.attachment.type !== "deferred_tools_delta" ||
      conversation.nameOnlyAnnouncements.has(u.uuid)
    )
      continue;
    let surfacedNames = u.attachment.surfacedNames;
    if (
      Array.isArray(surfacedNames) &&
      surfacedNames.length > 0 &&
      (s ||
        surfacedNames.some(
          (surfacedName) =>
            typeof surfacedName !== "string" || (!o.has(surfacedName) && !c.has(surfacedName)),
        ))
    )
      conversation.nameOnlyAnnouncements.add(u.uuid);
  }
}
//@ chunk-a76knw89.js:54256-55109 placement
/**
 * 决定延迟工具通过 ToolSearch 宣告还是按值内联到 tools[]。
 */
function surfaceDeferredTools(
  conversation,
  messages,
  messagesForAPI,
  { useToolSearch, toolSearchAbsent, blocksEligible, byValueNames = new Set(), byValueStaysOut },
) {
  if (!useToolSearch && !toolSearchAbsent) return;
  if (!blocksEligible) {
    if (!toolChangeHeaderAllowed(conversation)) {
      conversation.surfacedOnWire.clear();
      conversation.definedByValue.clear();
    } else if (byValueStaysOut) conversation.definedByValue.clear();
    return;
  }
  conversation.surfacedOnWire.clear();
  conversation.definedByValue.clear();
  let h = new Set();
  for (let T of messagesForAPI)
    if (T.type === "api_system") {
      for (let y of T.toolRemovals ?? []) conversation.definedByValue.delete(y);
      for (let y of T.toolAdditions ?? [])
        if (ownValue(T.toolDefinitions, y) !== undefined) {
          h.add(y);
          conversation.definedByValue.add(y);
        } else conversation.surfacedOnWire.add(y);
    }
  if (toolSearchAbsent) return;
  for (let T of messages) {
    if (
      T.type !== "attachment" ||
      T.attachment.type !== "deferred_tools_delta" ||
      conversation.nameOnlyAnnouncements.has(T.uuid)
    )
      continue;
    let surfacedNames = T.attachment.surfacedNames;
    if (
      Array.isArray(surfacedNames) &&
      surfacedNames.some(
        (surfacedName) =>
          typeof surfacedName === "string" &&
          !conversation.surfacedOnWire.has(surfacedName) &&
          !h.has(surfacedName) &&
          !byValueNames.has(surfacedName),
      )
    )
      conversation.nameOnlyAnnouncements.add(T.uuid);
  }
}
//@ chunk-a76knw89.js:55109-55563 placement
function classifyToolAdditionRejection(conversation, n, model, r) {
  dropToolChangeState(conversation);
  if (n === "header_rejected" || n === "block_type_unknown") {
    markToolChangeHeaderRefused();
    if (n === "header_rejected") {
      markBetaHeaderRefused(BETA_MID_CONV_TOOL_CHANGE);
      if (r) {
        markInlineToolsRefused();
        markBetaHeaderRefused(BETA_INLINE_TOOLS);
      }
    }
  } else if (n === "model_unsupported") markToolChangeUnsupportedModel(getCanonicalName(model));
  logForDebugging(
    `[late-tool-additions] tool_addition rejected (${n}) \u2014 falling back to the ToolSearch announcement (or to inline tools where there is no ToolSearch), sticky-rejecting the beta until /clear or /compact`,
    {
      level: "warn",
    },
  );
  logFeatureSad("mcp_late_tool_additions", `rejected_${n}`);
}
//@ chunk-a76knw89.js:55563-55631 placement
/**
 * 导出函数 `dropToolChangeState`：参数 e。
 */
function dropToolChangeState(e) {
  if (isBetaSent(e, BETA_MID_CONV_TOOL_CHANGE)) markBetaRejected(e, BETA_MID_CONV_TOOL_CHANGE);
  fallBackToolChangeState(e);
  e.surfacedOnWire.clear();
}
//@ chunk-a76knw89.js:55631-55693 placement
function fallBackToolChangeState(e) {
  if (isBetaSent(e, BETA_INLINE_TOOLS)) rejectInlineToolsHeader(e, BETA_INLINE_TOOLS);
  e.definedByValue.clear();
}
//@ chunk-a76knw89.js:55693-56095 placement
/**
 * inline tools 被 API 拒绝（头被拒、平台不支持）时回退到在 tools[] 中声明。
 */
function handleInlineToolsRejection(conversation, n) {
  fallBackToolChangeState(conversation);
  if (n === "header_rejected" || n === "unsupported_on_platform") {
    markInlineToolsRefused();
    if (n === "header_rejected") markBetaHeaderRefused(BETA_INLINE_TOOLS);
  }
  logForDebugging(
    `[inline-tools] tool_definition rejected (${n}) \u2014 falling back to declaring late tools in tools[] and showing them by reference, off for the rest of this conversation (carried through a compaction; /clear starts afresh)`,
    {
      level: "warn",
    },
  );
  logFeatureSad("mcp_inline_tools", `rejected_${n}`);
}
//@ chunk-a76knw89.js:56095-56486 placement
function buildToolRemovalBlocks(content, n, o, r = [], toolDefinitions = {}) {
  let s = [
    ...(content
      ? [
          {
            type: "text",
            text: content,
          },
        ]
      : []),
    ...r.map((name) => ({
      type: "tool_removal",
      tool: {
        type: "tool_reference",
        name,
      },
    })),
    ...n.map((u) => {
      let p = ownValue(toolDefinitions, u);
      return p === undefined
        ? {
            type: "tool_addition",
            tool: {
              type: "tool_reference",
              name: u,
            },
          }
        : {
            type: "tool_addition",
            tool: {
              type: "tool_definition",
              definition: p,
            },
          };
    }),
  ];
  if (o !== undefined && s.length > 0)
    s.push({
      ...s.pop(),
      cache_control: o,
    });
  return s;
}
export {
  DeclaredToolSet,
  asDeclaredToolSet,
  resolveDeclaredToolSet,
  turnDeniedTools,
  toolChangeHeaderAllowed,
  inlineToolsAllowed,
  stickyBetasOr,
  adjustToolBetas,
  shouldAnnounceDeferredTools,
  canDeclareInlineTools,
  deferredToolsEnabled,
  updateDeclaredToolSet,
  asScratchDeclaredToolSet,
  isHipaaRestricted,
  isLateToolAdditionsEnabled,
  recordDeclaredToolsIfMissing,
  markReconnectingServers,
  cacheNoChannelTools,
  buildDeclaredToolSet,
  computeLateToolAdditions,
  logDeclaredToolSetHeld,
  toolAdditionBetas,
  describeToolAdditionMoves,
  findLatestApiSystemDelta,
  clientNames,
  surfaceDeferredTools,
  handleInlineToolsRejection,
  classifyToolAdditionRejection,
  dropToolChangeState,
  buildToolRemovalBlocks,
  getCacheControl,
  stripCacheControl,
  canDeclareToolChangeAhead,
  stickyBetasForRequest,
  hasScratchToolSet,
  logDeclaredToolsDroppedAtCompaction,
  logDeclaredToolsDroppedAtCompaction2,
  cachedDeclaredTools,
  cachedNoChannelTools,
  hasDeclaredToolSet,
  canInlineToolAdditions,
};
