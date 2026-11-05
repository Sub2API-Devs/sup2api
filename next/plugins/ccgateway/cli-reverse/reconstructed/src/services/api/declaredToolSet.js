/**
 * services/api/declaredToolSet.ts
 *
 * 2.1.316 新增："已声明工具集"：请求中声明的工具在会话内保持稳定（压缩时丢弃、从记录恢复、late tool additions、inline tools 回退）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-03tec5k5.js (58)
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
import { compareToolsByName, getAllBaseToolsFromRegistry, matchesToolName } from "../../Tool.js";
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
import { isEvalToolName, REPL_TOOL_NAME } from "../../tools/REPLTool/constants.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-03tec5k5.js:8444-8507 placement (2.1.88 match: stripCacheControl, 1)
/**
 * 取对象上的 cache_control（没有为 undefined）。旧版名 stripCacheControl 为错配。
 */
function getCacheControl(items) {
  return "cache_control" in items ? items.cache_control : undefined;
}
//@ chunk-03tec5k5.js:8507-8593 placement (2.1.88 match: stripCacheControl, 1)
/**
 * 去掉对象的 cache_control 字段。
 */
function stripCacheControl(item) {
  if (!("cache_control" in item)) return item;
  let { cache_control: cacheControl, ...rest } = item;
  return rest;
}
//@ chunk-03tec5k5.js:29830-30537 placement
/**
 * 会话已声明工具名集合（含仅记录的条目与顺序）。
 */
class DeclaredToolSet {
  names;
  recordedOnly;
  recordOrder;
  #e;
  constructor(
    tools,
    options = {
      only: new Map(),
      order: [],
    },
  ) {
    this.names = options.names ?? [...tools.map((tool) => tool.name), ...options.only.keys()];
    this.recordedOnly = options.only;
    this.recordOrder = options.order;
    this.#e = new Map(tools.map((tool) => [tool.name, tool]));
  }
  has(toolName) {
    return this.#e.has(toolName) || this.recordedOnly.has(toolName);
  }
  keeps(toolName) {
    return this.has(toolName) && toolName !== STRUCTUREDOUTPUT;
  }
  toolFor(toolName) {
    return this.#e.get(toolName);
  }
  without(removedNames) {
    return new DeclaredToolSet(
      [...this.#e.values()].filter((tool) => !removedNames.has(tool.name)),
      {
        only: new Map([...this.recordedOnly].filter(([name]) => !removedNames.has(name))),
        order: this.recordOrder.filter((name) => !removedNames.has(name)),
        names: this.names.filter((name) => !removedNames.has(name)),
      },
    );
  }
  sourceFor(toolName) {
    let tool = this.#e.get(toolName);
    let server = this.recordedOnly.get(toolName)?.server;
    if (tool !== undefined || server === undefined) return tool;
    return getToolNameForPermissionCheck(toolName, server);
  }
}
//@ chunk-03tec5k5.js:30537-30568 placement
/**
 * 导出函数 `stickyBetasOr`：参数 e，返回 e ?? getStickyBetas()。
 */
function stickyBetasOr(stickyBetas) {
  return stickyBetas ?? getStickyBetas();
}
//@ chunk-03tec5k5.js:30568-30639 placement
/**
 * 导出函数 `asDeclaredToolSet`：参数 e，返回 declaredTools instanceof DeclaredToolSet ? declaredTools : void 0。
 */
function asDeclaredToolSet(conversation) {
  let declaredTools = conversation.declaredTools;
  return declaredTools instanceof DeclaredToolSet ? declaredTools : undefined;
}
//@ chunk-03tec5k5.js:30639-30711 placement
/**
 * 导出函数 `asScratchDeclaredToolSet`：参数 e，返回 noChannelTools instanceof DeclaredToolSet ? noChannelTools : void 0。
 */
function asScratchDeclaredToolSet(conversation) {
  let noChannelTools = conversation.noChannelTools;
  return noChannelTools instanceof DeclaredToolSet ? noChannelTools : undefined;
}
//@ chunk-03tec5k5.js:30711-30850 placement
/**
 * 缓存"无通道工具"计算结果：强制刷新时清空，未开启且未缓存时跳过。
 */
function cacheNoChannelTools(conversation, skipCache, buildTools) {
  if (skipCache) {
    conversation.noChannelTools = undefined;
    return;
  }
  if (conversation.noChannelTools === undefined && !isFoamySpringEnabled()) return;
  let built = buildTools();
  conversation.noChannelTools = built;
  return built;
}
//@ chunk-03tec5k5.js:30850-31332 placement
function buildDeclaredToolSet(tools, recordedNames, recordedOnly) {
  let presentNames = new Set([...recordedNames, ...tools].map((tool) => tool.name));
  let name = new Map([...(recordedOnly ?? [])].filter(([name]) => !presentNames.has(name)));
  if (name.size === 0) return new DeclaredToolSet(tools);
  let isMcpLike = (tool) => tool.isMcp === true || mcpInfoFromString(tool.name) !== null;
  let index = tools.findIndex(isMcpLike);
  let isTrailingGroup = (tool, toolPos) =>
    !isMcpLike(tool) &&
    ((tool.name === STRUCTUREDOUTPUT && toolPos === tools.length - 1) || (index !== -1 && toolPos > index));
  let sorted = [...tools.filter(isMcpLike).map((tool) => tool.name), ...name.keys()].sort((name, name_2) =>
    compareToolsByName(
      {
        name,
      },
      {
        name: name_2,
      },
    ),
  );
  let order = [
    ...tools
      .filter((tool, index) => !isMcpLike(tool) && !isTrailingGroup(tool, index))
      .map((tool) => tool.name),
    ...sorted,
    ...tools.filter(isTrailingGroup).map((tool) => tool.name),
  ];
  return new DeclaredToolSet(tools, {
    only: name,
    order,
    names: order,
  });
}
//@ chunk-03tec5k5.js:31332-31398 placement (2.1.88 match: buildDiffableContent, 0.673)
/**
 * 工具定义比对时关心的键（name/description/input_schema/type 及附加键）。旧版名 buildDiffableContent 为错配；使用方在 chunk-a76knw89 的记录工具比较里。
 */
var TOOL_DIFF_KEYS; // deferred: uses TOOL_DEFINITION_BOOLEAN_KEYS (./toolDefinitionShape.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-03tec5k5.js:31332", () => {
  TOOL_DIFF_KEYS = new Set(["name", "description", "input_schema", "type", ...TOOL_DEFINITION_BOOLEAN_KEYS]);
});
//@ chunk-03tec5k5.js:31398-32075 placement
async function markReconnectingServers(
  {
    recordedToolDescriptions,
    recordedToolServers,
    recordedToolEntries,
    mcpClients = [],
    getToolPermissionContext,
  },
  tools,
  byValueNames,
) {
  if (
    recordedToolDescriptions === undefined ||
    recordedToolDescriptions.has(TOOL_SEARCH_TOOL_NAME) ||
    !isFoamySpringEnabled()
  )
    return;
  let presentNames = new Set(tools.map((tool) => tool.name));
  let candidates = [];
  for (let key of recordedToolDescriptions.keys()) {
    let entry = recordedToolEntries?.get(key);
    let server = recordedToolServers?.get(key);
    if (
      !presentNames.has(key) &&
      byValueNames?.has(key) !== true &&
      entry !== undefined &&
      server !== undefined &&
      key.startsWith(getMcpPrefix(server)) &&
      entry.name === key &&
      /^[a-zA-Z0-9_-]+$/.test(key) &&
      Object.keys(entry).every((key) => TOOL_DIFF_KEYS.has(key))
    )
      candidates.push({
        name: key,
        entry,
        server,
      });
  }
  if (candidates.length === 0) return;
  let toolPermissionContext = await getToolPermissionContext();
  let reconnecting = new Map();
  let denyIndex;
  for (let { name: toolName, entry, server } of candidates)
    try {
      denyIndex ??= getDenyRuleIndex(toolPermissionContext);
      if (
        describeToolAvailability(
          toolName,
          mcpClients,
          toolPermissionContext,
          getToolNameForPermissionCheck(toolName, server),
          denyIndex,
        ).kind === "reconnecting"
      )
        reconnecting.set(toolName, {
          entry,
          server,
        });
    } catch (error) {
      logError(toError(error));
    }
  return reconnecting.size === 0 ? undefined : reconnecting;
}
//@ chunk-03tec5k5.js:32075-32603 placement
async function isHipaaRestricted(declaredSet, byValueNames, { mcpClients, getPermissionContext, byValue }) {
  let heldNames = hasDeclaredToolSet(declaredSet, byValueNames, true);
  if (heldNames.length === 0)
    return {
      kept: declaredSet,
      unread: 0,
    };
  let hipaa = hasComplianceTaint("hipaa");
  let isMcpExempt = (toolName) =>
    hipaa && !isMcpToolName(toolName, declaredSet.sourceFor(toolName)?.mcpInfo?.serverName);
  let mustDrop = (toolName) => byValue?.has(toolName) === true || isMcpExempt(toolName);
  let permissionContext;
  try {
    permissionContext = await getPermissionContext();
  } catch (error) {
    logError(toError(error));
    let dropped = new Set(heldNames.filter(mustDrop));
    return {
      kept: dropped.size === 0 ? declaredSet : declaredSet.without(dropped),
      unread: 0,
    };
  }
  let unreadCount = 0;
  let denyIndex;
  let dropped = new Set(
    heldNames.filter((toolName) => {
      if (mustDrop(toolName)) return true;
      try {
        denyIndex ??= getDenyRuleIndex(permissionContext);
        return isPermanentUnavailabilityFor(
          describeToolAvailability(
            toolName,
            mcpClients,
            permissionContext,
            declaredSet.sourceFor(toolName),
            denyIndex,
          ),
        );
      } catch (error) {
        logError(toError(error));
        unreadCount++;
        return true;
      }
    }),
  );
  return {
    kept: dropped.size === 0 ? declaredSet : declaredSet.without(dropped),
    unread: unreadCount,
  };
}
//@ chunk-03tec5k5.js:32603-32681 placement
/**
 * 导出函数 `stickyBetasForRequest`：参数 e，返回 OYo(e.stickyBetas)。
 */
function stickyBetasForRequest(queryOptions) {
  if (queryOptions.agentId && !queryOptions.stickyBetas) return;
  return stickyBetasOr(queryOptions.stickyBetas);
}
//@ chunk-03tec5k5.js:32681-32742 placement
/**
 * 导出函数 `cachedDeclaredTools`：参数 e，返回 n === void 0 ? void 0 : DSe(n)。
 */
function cachedDeclaredTools(toolUseContext) {
  let betas = stickyBetasForRequest(toolUseContext);
  return betas === undefined ? undefined : asDeclaredToolSet(betas);
}
//@ chunk-03tec5k5.js:32742-32803 placement
/**
 * 导出函数 `cachedNoChannelTools`：参数 e，返回 n === void 0 ? void 0 : kbn(n)。
 */
function cachedNoChannelTools(cachedDeclaredToolSet) {
  let betas = stickyBetasForRequest(cachedDeclaredToolSet);
  return betas === undefined ? undefined : asScratchDeclaredToolSet(betas);
}
//@ chunk-03tec5k5.js:32803-32901 placement
/**
 * 导出函数 `recordDeclaredToolsIfMissing`：参数 e, n，返回 !1; return (dLn(e, new DeclaredToolSet(n)), !0)。
 */
function recordDeclaredToolsIfMissing(stickyBetas, tools) {
  markDeclaredToolsDecided(stickyBetas);
  if (stickyBetas.declaredTools !== undefined || !isFoamySpringEnabled()) return false;
  setDeclaredTools(stickyBetas, new DeclaredToolSet(tools));
  return true;
}
//@ chunk-03tec5k5.js:32901-33923 placement
/**
 * 决定本次请求的已声明工具（启动时省略、开关关闭等原因）。
 */
function planDeclaredTools(names, tools, { servers, entries } = EMPTY_PLAN_SOURCES, context) {
  let toolByName = new Map(tools.map((tool) => [tool.name, tool]));
  let baseTools;
  let getBaseTools = () => {
    baseTools ??= getAllBaseToolsFromRegistry() ?? null;
    return baseTools ?? undefined;
  };
  let toolForV1Name = (name) => {
    let underlyingV1ToolName = getBaseTools()?.find((tool) =>
      matchesToolName(tool, name),
    )?.underlyingV1ToolName;
    return underlyingV1ToolName === undefined ? undefined : toolByName.get(underlyingV1ToolName);
  };
  let held = new Map();
  let only = new Map();
  let gateOffCount = 0;
  let needsUserCount = 0;
  let launchOmittedCount = 0;
  let lookupStub = (name) => (isEvalToolName(name) ? toolByName.get(REPL_TOOL_NAME) : undefined);
  let order = [...names];
  for (let name of order) {
    let tool = toolByName.get(name) ?? lookupStub(name) ?? toolForV1Name(name);
    if (tool === undefined) {
      let entry = entries?.get(name);
      let server = servers?.get(name);
      if (entry === undefined || isPinnedUpfrontTool(name, server, getBaseTools())) continue;
      if (isUndeclarableTool(name, server, getBaseTools(), tools))
        only.set(name, {
          entry,
          server,
        });
      else {
        let skipReason = describeDeclaredToolsSkipReason(name, getBaseTools(), context);
        if (skipReason === "launch_omitted") {
          only.set(name, {
            entry,
            server,
          });
          launchOmittedCount++;
        } else if (skipReason === "gate_off") {
          only.set(name, {
            entry,
            server,
          });
          gateOffCount++;
          if (requiresUserInteractionByName(name, getBaseTools())) needsUserCount++;
        }
      }
      continue;
    }
    held.set(tool.name, tool);
    let v1Tool =
      tool.underlyingV1ToolName === undefined ? undefined : toolByName.get(tool.underlyingV1ToolName);
    if (v1Tool !== undefined) held.set(v1Tool.name, v1Tool);
  }
  for (let tool of tools)
    if (tool.underlyingV1ToolName !== undefined && held.has(tool.underlyingV1ToolName))
      held.set(tool.name, tool);
  for (let key of held.keys()) only.delete(key);
  return held.size === 0 && only.size === 0
    ? undefined
    : {
        held: new DeclaredToolSet(
          tools.filter((tool) => held.has(tool.name)),
          {
            only,
            order,
          },
        ),
        recorded: order.length,
        gateOff: gateOffCount,
        needsUser: needsUserCount,
        launchOmitted: launchOmittedCount,
      };
}
//@ chunk-03tec5k5.js:33923-34428 placement
/**
 * 从记录恢复或首次决定已声明工具集（tengu_declared_tool_set_from_record）。
 */
function resolveDeclaredToolSet(conversation, getRecorded, tools, { latch, permissionContext }) {
  let existing = asDeclaredToolSet(conversation);
  if (existing !== undefined || conversation.declaredToolsDecided) return existing;
  if (latch) markDeclaredToolsDecided(conversation);
  if (conversation.declaredTools !== undefined || !isFoamySpringEnabled()) return;
  let recorded = getRecorded();
  let plan =
    recorded === undefined
      ? undefined
      : planDeclaredTools(recorded.names, tools, recorded, permissionContext);
  if (plan === undefined || !latch) return plan?.held;
  setDeclaredTools(conversation, plan.held);
  logEvent("tengu_declared_tool_set_from_record", {
    recorded: plan.recorded,
    held: plan.held.names.length - plan.held.recordedOnly.size,
    heldByName: plan.held.recordedOnly.size,
    heldGateOff: plan.gateOff,
    heldNeedsUser: plan.needsUser,
    heldLaunchOmitted: plan.launchOmitted,
  });
  return plan.held;
}
//@ chunk-03tec5k5.js:34428-34978 placement
function updateDeclaredToolSet(tools, declaredSet) {
  if (declaredSet === undefined)
    return {
      tools,
      redeclared: [],
    };
  let presentNames = new Set(tools.map((tool) => tool.name));
  let toolToAdd = (name) =>
    presentNames.has(name) || !declaredSet.keeps(name) ? undefined : declaredSet.toolFor(name);
  if (declaredSet.names.every((name) => toolToAdd(name) === undefined))
    return {
      tools,
      redeclared: [],
    };
  let out = [...tools];
  let redeclared = [];
  declaredSet.names.forEach((name, position) => {
    let tool = toolToAdd(name);
    if (!tool) return;
    let insertAt = -1;
    for (let idx = position - 1; idx >= 0 && insertAt === -1; idx--) {
      let precedingName = declaredSet.names[idx];
      insertAt = out.findIndex((tool) => tool.name === precedingName);
    }
    if (insertAt !== -1) out.splice(insertAt + 1, 0, tool);
    else {
      let index = out.findIndex((tool) => declaredSet.has(tool.name));
      out.splice(index === -1 ? 0 : index, 0, tool);
    }
    presentNames.add(name);
    redeclared.push(name);
  });
  return redeclared.length === 0
    ? {
        tools,
        redeclared,
      }
    : {
        tools: out,
        redeclared,
      };
}
//@ chunk-03tec5k5.js:34978-35066 placement
/**
 * 导出函数 `turnDeniedTools`：参数 e, n，返回 updateDeclaredToolSet(e, turnDeniedTools instanceof DeclaredToolSet ? turnDeniedTools : void 0) .tools。
 */
function turnDeniedTools(tools, conversation) {
  let turnDeniedTools = conversation.turnDeniedTools;
  return updateDeclaredToolSet(
    tools,
    turnDeniedTools instanceof DeclaredToolSet ? turnDeniedTools : undefined,
  ).tools;
}
//@ chunk-03tec5k5.js:35066-35258 placement
function logDeclaredToolsDroppedAtCompaction(conversation, droppedNames) {
  let declaredSet = asDeclaredToolSet(conversation);
  if (declaredSet === undefined || droppedNames.length === 0) return;
  conversation.declaredTools = declaredSet.without(new Set(droppedNames));
  logEvent("tengu_declared_tools_dropped_at_compaction", {
    dropped: droppedNames.length,
    noDeferredChannel: false,
  });
}
//@ chunk-03tec5k5.js:35258-35326 placement
/**
 * 导出函数 `hasScratchToolSet`：参数 e, n，返回 hasDeclaredToolSet(o, n, !0)。
 */
function hasScratchToolSet(conversation, tools) {
  let set = conversation === undefined ? undefined : asScratchDeclaredToolSet(conversation);
  return hasDeclaredToolSet(set, tools, true);
}
//@ chunk-03tec5k5.js:35326-35519 placement
function logDeclaredToolsDroppedAtCompaction2(conversation, droppedNames) {
  let set = asScratchDeclaredToolSet(conversation);
  if (set === undefined || droppedNames.length === 0) return;
  conversation.noChannelTools = set.without(new Set(droppedNames));
  logEvent("tengu_declared_tools_dropped_at_compaction", {
    dropped: droppedNames.length,
    noDeferredChannel: true,
  });
}
//@ chunk-03tec5k5.js:35519-35720 placement
function hasDeclaredToolSet(declaredSet, presentTools, keepMcp) {
  if (declaredSet === undefined) return [];
  let presentNames = new Set(presentTools.map((tool) => tool.name));
  return declaredSet.names.filter((name) => {
    if (presentNames.has(name) || !declaredSet.keeps(name)) return false;
    let mcpInfo = declaredSet.sourceFor(name)?.mcpInfo;
    return keepMcp || !isMcpToolName(name, mcpInfo?.serverName);
  });
}
//@ chunk-03tec5k5.js:35720-35759 placement
/**
 * 声明工具集合的默认来源（servers/entries 为空），用于 planDeclaredTools 的参数默认值。
 */
var EMPTY_PLAN_SOURCES = {
  servers: undefined,
  entries: undefined,
};
//@ chunk-03tec5k5.js:35759-35926 placement
function isUndeclarableTool(name, server, baseTools, tools) {
  if (name === STRUCTUREDOUTPUT) return false;
  if (server !== undefined) return true;
  if (mcpInfoFromString(name) !== null) return false;
  if (name === WAITFORMCPSERVERS && !tools.some((tool) => matchesToolName(tool, TOOL_SEARCH_TOOL_NAME)))
    return true;
  return baseTools !== undefined && findTool(baseTools, name) === undefined;
}
//@ chunk-03tec5k5.js:35926-36334 placement
function describeDeclaredToolsSkipReason(name, baseTools, context) {
  if (context === undefined || baseTools === undefined) return;
  if (name === STRUCTUREDOUTPUT || name === WAITFORMCPSERVERS || mcpInfoFromString(name) !== null) return;
  let tool = baseTools.find((tool) => tool.name === name);
  if (tool === undefined || tool.isMcp === true) return;
  if (!isGleamingCupcakeEnabled() || hasComplianceTaint("hipaa")) return;
  if (isToolDroppedByDenyRules(context, tool))
    return isToolOmittedByLaunchToolList(context, tool) ? "launch_omitted" : undefined;
  if (isOutsideLaunchToolList(context, tool))
    return context.builtInToolsDisabled === true ||
      (context.restricted === true &&
        isCodeExecutionTool(codeExecutionToolNames([tool]), new Set()).includes(tool.name))
      ? undefined
      : "launch_omitted";
  if (tool.isEnabled()) return;
  return "gate_off";
}
//@ chunk-03tec5k5.js:36334-36417 placement
function requiresUserInteractionByName(name, baseTools) {
  return baseTools?.find((tool) => tool.name === name)?.requiresUserInteraction?.() === true;
}
//@ chunk-03tec5k5.js:36417-36449 placement
var TENGU_GLEAMING_CUPCAKE = "tengu_gleaming_cupcake";
//@ chunk-03tec5k5.js:36449-36479 placement
function isGleamingCupcakeEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_GLEAMING_CUPCAKE, true);
}
//@ chunk-03tec5k5.js:36479-36508 placement
var TENGU_JOYFUL_ANCHOR = "tengu_joyful_anchor";
//@ chunk-03tec5k5.js:36508-36705 placement
function isPinnedUpfrontTool(name, server, baseTools) {
  if (isMcpToolName(name, server)) return false;
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_JOYFUL_ANCHOR, null);
  if (!Array.isArray(featureValue_CACHED_MAY_BE_STALE) || featureValue_CACHED_MAY_BE_STALE.length === 0)
    return false;
  let found = baseTools?.find((tool) => matchesToolName(tool, name));
  return featureValue_CACHED_MAY_BE_STALE.some(
    (pinnedName) =>
      typeof pinnedName === "string" &&
      (pinnedName === name || (found !== undefined && matchesToolName(found, pinnedName))),
  );
}
//@ chunk-03tec5k5.js:36705-36810 placement (2.1.88 match: getToolNameForPermissionCheck, 1)
function getToolNameForPermissionCheck(toolName, server) {
  let mcpPrefix = getMcpPrefix(server);
  return {
    mcpInfo: {
      serverName: server,
      toolName: toolName.startsWith(mcpPrefix) ? toolName.slice(mcpPrefix.length) : toolName,
    },
  };
}
//@ chunk-03tec5k5.js:36810-36858 placement
function isMcpToolName(name, server) {
  return server !== undefined || mcpInfoFromString(name) !== null;
}
//@ chunk-03tec5k5.js:36858-37487 placement
function computeLateToolAdditions(
  messageText,
  declaredSet,
  {
    pool,
    keptDeferred,
    keepMcp,
    requestCarriesStructuredOutputs,
    requestDeclaresSearchCitations,
    recordedEntries,
  },
) {
  let lateNames = new Set(
    isLateToolAdditionsEnabled(declaredSet, {
      pool,
      keptDeferred,
      keepMcp,
    }),
  );
  if (lateNames.size === 0) return [];
  let presentNames = new Set(messageText.map(mergeClients_2));
  let recordOrder = declaredSet.recordOrder;
  let definitionFlags = {
    strict: requestCarriesStructuredOutputs,
    eager: anyEagerInputStreaming(messageText),
    citations: requestDeclaresSearchCitations,
  };
  let added = [];
  recordOrder.forEach((name, position) => {
    let recorded = declaredSet.recordedOnly.get(name);
    if (recorded === undefined || presentNames.has(name) || !lateNames.has(name)) return;
    let entry = recordedEntries?.get(name) ?? recorded.entry;
    let insertAt = -1;
    for (let idx = position - 1; idx >= 0 && insertAt === -1; idx--) {
      let precedingName = recordOrder[idx];
      if (presentNames.has(precedingName))
        insertAt = messageText.findIndex((schema) => mergeClients_2(schema) === precedingName) + 1;
    }
    if (insertAt === -1) {
      let orderSet = new Set(recordOrder);
      let index = messageText.findIndex((schema) => orderSet.has(mergeClients_2(schema) ?? ""));
      insertAt = index === -1 ? 0 : index;
    }
    messageText.splice(insertAt, 0, TOOL_DEFINITION_FLAG_KEYS(entry, definitionFlags));
    presentNames.add(name);
    added.push(name);
  });
  return added;
}
//@ chunk-03tec5k5.js:37487-37695 placement
function isLateToolAdditionsEnabled(declaredSet, { pool, keptDeferred, keepMcp }) {
  let presentNames = new Set([...pool.map((tool) => tool.name), ...keptDeferred]);
  return declaredSet.recordOrder.filter((name) => {
    let recorded = declaredSet.recordedOnly.get(name);
    return (
      recorded !== undefined && !presentNames.has(name) && (keepMcp || !isMcpToolName(name, recorded.server))
    );
  });
}
//@ chunk-03tec5k5.js:37695-37766 placement (2.1.88 match: mergeClients, 1)
function mergeClients_2(schema) {
  return "name" in schema && typeof schema.name === "string" ? schema.name : undefined;
}
//@ chunk-03tec5k5.js:37766-37794 placement
/**
 * 导出函数 `deferredToolsEnabled`：返回 l$e()。
 */
function deferredToolsEnabled() {
  return areDeferredToolsKept();
}
//@ chunk-03tec5k5.js:37794-37883 placement
/**
 * 导出函数 `clientNames`：参数 e，返回 n。
 */
function clientNames(schemas) {
  let names = new Set();
  for (let schema of schemas) {
    let name = mergeClients_2(schema);
    if (name !== undefined) names.add(name);
  }
  return names;
}
//@ chunk-03tec5k5.js:37883-38280 placement
function logDeclaredToolSetHeld(info) {
  if (
    info.deferredLate === 0 &&
    info.redeclared === 0 &&
    info.fromRecord === 0 &&
    info.unclassifiedDepartures === 0
  )
    return;
  logEvent("tengu_declared_tool_set_held", {
    deferredLate: info.deferredLate,
    redeclared: info.redeclared,
    fromRecord: info.fromRecord,
    ...(info.queryDepth !== undefined && {
      queryDepth: info.queryDepth,
    }),
    toolSearchAbsent: info.toolSearchAbsent,
    noDeferredChannel: info.noDeferredChannel,
    unclassifiedDepartures: info.unclassifiedDepartures,
  });
}
//@ chunk-03tec5k5.js:38280-38320 placement
function canDeclareToolChange(conversation, model) {
  return toolChangeHeaderAllowed(conversation) && modelTakesToolAdditions(model);
}
//@ chunk-03tec5k5.js:38320-38360 placement
/**
 * 导出函数 `toolChangeHeaderAllowed`：参数 e，返回 lT(e, Lb) && !we(e)。
 */
function toolChangeHeaderAllowed(conversation) {
  return isBetaSent(conversation, BETA_MID_CONV_TOOL_CHANGE) && !isToolChangeHeaderBlocked(conversation);
}
//@ chunk-03tec5k5.js:38360-38406 placement
function isToolChangeHeaderBlocked(conversation) {
  return (
    isBetaRejected(conversation, BETA_MID_CONVERSATION_SYSTEM) ||
    isToolChangeHeaderRefused() ||
    !areDeferredToolsKept()
  );
}
//@ chunk-03tec5k5.js:38406-38475 placement
/**
 * 导出函数 `canDeclareToolChangeAhead`：参数 e, n，返回 (lT(e, Lb) || (Kpr() && !Lp(e, Lb))) && !we(e) && modelTakesToolAdditions(n)。
 */
function canDeclareToolChangeAhead(conversation, model) {
  return (
    (isBetaSent(conversation, BETA_MID_CONV_TOOL_CHANGE) ||
      (isFoamySpringGateOn() && !isBetaRejected(conversation, BETA_MID_CONV_TOOL_CHANGE))) &&
    !isToolChangeHeaderBlocked(conversation) &&
    modelTakesToolAdditions(model)
  );
}
//@ chunk-03tec5k5.js:38475-38517 placement
/**
 * 导出函数 `canDeclareInlineTools`：参数 e, n，返回 Snr(e) && ae(e, n)。
 */
function canDeclareInlineTools(conversation, effectiveModel) {
  return inlineToolsAllowed(conversation) && canDeclareToolChange(conversation, effectiveModel);
}
//@ chunk-03tec5k5.js:38517-38565 placement
/**
 * 导出函数 `inlineToolsAllowed`：参数 e，返回 lT(e, tb) && !isInlineToolsRefused() && Nrt(e)。
 */
function inlineToolsAllowed(conversation) {
  return (
    isBetaSent(conversation, BETA_INLINE_TOOLS) &&
    !isInlineToolsRefused() &&
    toolChangeHeaderAllowed(conversation)
  );
}
//@ chunk-03tec5k5.js:38565-38672 placement
/**
 * 判断能否以内联方式追加工具（未被拒绝、相关 beta 可用）。
 */
function canInlineToolAdditions(conversation, model) {
  if (isInlineToolsRefused() || isBetaRejected(conversation, BETA_INLINE_TOOLS)) return false;
  if (isBetaSent(conversation, BETA_INLINE_TOOLS)) return canDeclareToolChangeAhead(conversation, model);
  return (
    !isBetaSent(conversation, BETA_MID_CONV_TOOL_CHANGE) &&
    isInlineToolsEnabled() &&
    canDeclareToolChangeAhead(conversation, model)
  );
}
//@ chunk-03tec5k5.js:38672-38818 placement
/**
 * 判断是否需要宣布延迟加载的工具：ToolSearch 被过滤掉、通道可用且有延迟工具或工具池会刷新。
 */
function shouldAnnounceDeferredTools(
  conversation,
  model,
  { toolSearchToolFilteredOut, toolPoolRefreshes, aheadOfRequest },
) {
  return (
    toolSearchToolFilteredOut &&
    (aheadOfRequest
      ? canDeclareToolChangeAhead(conversation, model)
      : canDeclareToolChange(conversation, model)) &&
    (asDeclaredToolSet(conversation) !== undefined || (toolPoolRefreshes && isFoamySpringEnabled()))
  );
}
//@ chunk-03tec5k5.js:38818-39139 placement
/**
 * 根据工具追加通道是否可用，调整请求的 beta 列表（增删工具追加与内联工具 beta），并必要时登记不可用状态。
 */
function adjustToolBetas(betas, betaList, model) {
  let firstTurnWithToolChange = !isBetaSent(betas, BETA_MID_CONV_TOOL_CHANGE);
  if (betaList.includes(BETA_MID_CONV_TOOL_CHANGE) && !isToolChangeHeaderBlocked(betas)) {
    markBetaSent(betas, BETA_MID_CONV_TOOL_CHANGE);
    if (
      firstTurnWithToolChange &&
      betaList.includes(BETA_INLINE_TOOLS) &&
      !isInlineToolsRefused() &&
      !isBetaRejected(betas, BETA_INLINE_TOOLS)
    )
      markBetaSent(betas, BETA_INLINE_TOOLS);
  }
  let canDeclare = canDeclareToolChange(betas, model);
  let inlineOn = canDeclare && inlineToolsAllowed(betas);
  let out = betaList;
  if (canDeclare && !out.includes(BETA_MID_CONV_TOOL_CHANGE)) out = [...out, BETA_MID_CONV_TOOL_CHANGE];
  if (!canDeclare && out.includes(BETA_MID_CONV_TOOL_CHANGE))
    out = out.filter((beta) => beta !== BETA_MID_CONV_TOOL_CHANGE);
  if (inlineOn && !out.includes(BETA_INLINE_TOOLS)) out = [...out, BETA_INLINE_TOOLS];
  if (!inlineOn && out.includes(BETA_INLINE_TOOLS)) out = out.filter((beta) => beta !== BETA_INLINE_TOOLS);
  return out;
}
//@ chunk-03tec5k5.js:39139-39332 placement
/**
 * 按模型是否支持工具追加，生成包含或去掉相关 beta 的列表。
 */
function toolAdditionBetas(conversation, betaList, creditMintModel, model) {
  if (canDeclareToolChange(conversation, creditMintModel) && modelTakesToolAdditions(model)) {
    let base = betaList.includes(BETA_MID_CONV_TOOL_CHANGE)
      ? betaList
      : [...betaList, BETA_MID_CONV_TOOL_CHANGE];
    let inlineOn = inlineToolsAllowed(conversation);
    if (inlineOn && !base.includes(BETA_INLINE_TOOLS)) return [...base, BETA_INLINE_TOOLS];
    return inlineOn ? base : base.filter((beta) => beta !== BETA_INLINE_TOOLS);
  }
  return betaList.filter((beta) => beta !== BETA_MID_CONV_TOOL_CHANGE && beta !== BETA_INLINE_TOOLS);
}
//@ chunk-03tec5k5.js:39332-39632 placement
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
    let moves = {
      advisor_entry: advisorEntryMoved,
      deferred_entries: deferredEntriesMoved,
      announcement_blocks:
        hasDeferredChannel && messages.some((message) => findDeferredToolsDelta(conversation, message)),
    };
    return Object.values(moves).some(Boolean) ? moves : undefined;
  } catch (error) {
    logError(toError(error));
    return;
  }
}
//@ chunk-03tec5k5.js:39632-39907 placement
function findDeferredToolsDelta(conversation, message) {
  if (
    message.type !== "attachment" ||
    message.attachment.type !== "deferred_tools_delta" ||
    conversation.nameOnlyAnnouncements.has(message.uuid)
  )
    return false;
  let surfacedNames = message.attachment.surfacedNames;
  return (
    Array.isArray(surfacedNames) &&
    surfacedNames.some(
      (surfacedName) =>
        typeof surfacedName === "string" &&
        (conversation.surfacedOnWire.has(surfacedName) || conversation.definedByValue.has(surfacedName)),
    )
  );
}
//@ chunk-03tec5k5.js:39907-40260 placement
function findLatestApiSystemDelta(
  conversation,
  messages,
  deferredNames,
  useToolSearch,
  byValueNames = new Set(),
) {
  if (!useToolSearch) return;
  let headerBlocked = !toolChangeHeaderAllowed(conversation);
  for (let message of messages) {
    if (
      message.type !== "attachment" ||
      message.attachment.type !== "deferred_tools_delta" ||
      conversation.nameOnlyAnnouncements.has(message.uuid)
    )
      continue;
    let surfacedNames = message.attachment.surfacedNames;
    if (
      Array.isArray(surfacedNames) &&
      surfacedNames.length > 0 &&
      (headerBlocked ||
        surfacedNames.some(
          (surfacedName) =>
            typeof surfacedName !== "string" ||
            (!deferredNames.has(surfacedName) && !byValueNames.has(surfacedName)),
        ))
    )
      conversation.nameOnlyAnnouncements.add(message.uuid);
  }
}
//@ chunk-03tec5k5.js:40260-41113 placement
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
  let definedByValue = new Set();
  for (let message of messagesForAPI)
    if (message.type === "api_system") {
      for (let name of message.toolRemovals ?? []) conversation.definedByValue.delete(name);
      for (let name of message.toolAdditions ?? [])
        if (ownValue(message.toolDefinitions, name) !== undefined) {
          definedByValue.add(name);
          conversation.definedByValue.add(name);
        } else conversation.surfacedOnWire.add(name);
    }
  if (toolSearchAbsent) return;
  for (let message of messages) {
    if (
      message.type !== "attachment" ||
      message.attachment.type !== "deferred_tools_delta" ||
      conversation.nameOnlyAnnouncements.has(message.uuid)
    )
      continue;
    let surfacedNames = message.attachment.surfacedNames;
    if (
      Array.isArray(surfacedNames) &&
      surfacedNames.some(
        (surfacedName) =>
          typeof surfacedName === "string" &&
          !conversation.surfacedOnWire.has(surfacedName) &&
          !definedByValue.has(surfacedName) &&
          !byValueNames.has(surfacedName),
      )
    )
      conversation.nameOnlyAnnouncements.add(message.uuid);
  }
}
//@ chunk-03tec5k5.js:41113-41567 placement
function classifyToolAdditionRejection(conversation, cause, model, inlineAlsoRefused) {
  dropToolChangeState(conversation);
  if (cause === "header_rejected" || cause === "block_type_unknown") {
    markToolChangeHeaderRefused();
    if (cause === "header_rejected") {
      markBetaHeaderRefused(BETA_MID_CONV_TOOL_CHANGE);
      if (inlineAlsoRefused) {
        markInlineToolsRefused();
        markBetaHeaderRefused(BETA_INLINE_TOOLS);
      }
    }
  } else if (cause === "model_unsupported") markToolChangeUnsupportedModel(getCanonicalName(model));
  logForDebugging(
    `[late-tool-additions] tool_addition rejected (${cause}) \u2014 falling back to the ToolSearch announcement (or to inline tools where there is no ToolSearch), sticky-rejecting the beta until /clear or /compact`,
    {
      level: "warn",
    },
  );
  logFeatureSad("mcp_late_tool_additions", `rejected_${cause}`);
}
//@ chunk-03tec5k5.js:41567-41635 placement
/**
 * 导出函数 `dropToolChangeState`：参数 e。
 */
function dropToolChangeState(conversation) {
  if (isBetaSent(conversation, BETA_MID_CONV_TOOL_CHANGE))
    markBetaRejected(conversation, BETA_MID_CONV_TOOL_CHANGE);
  fallBackToolChangeState(conversation);
  conversation.surfacedOnWire.clear();
}
//@ chunk-03tec5k5.js:41635-41697 placement
function fallBackToolChangeState(conversation) {
  if (isBetaSent(conversation, BETA_INLINE_TOOLS)) rejectInlineToolsHeader(conversation, BETA_INLINE_TOOLS);
  conversation.definedByValue.clear();
}
//@ chunk-03tec5k5.js:41697-42099 placement
/**
 * inline tools 被 API 拒绝（头被拒、平台不支持）时回退到在 tools[] 中声明。
 */
function handleInlineToolsRejection(conversation, cause) {
  fallBackToolChangeState(conversation);
  if (cause === "header_rejected" || cause === "unsupported_on_platform") {
    markInlineToolsRefused();
    if (cause === "header_rejected") markBetaHeaderRefused(BETA_INLINE_TOOLS);
  }
  logForDebugging(
    `[inline-tools] tool_definition rejected (${cause}) \u2014 falling back to declaring late tools in tools[] and showing them by reference, off for the rest of this conversation (carried through a compaction; /clear starts afresh)`,
    {
      level: "warn",
    },
  );
  logFeatureSad("mcp_inline_tools", `rejected_${cause}`);
}
//@ chunk-03tec5k5.js:42099-42490 placement
function buildToolRemovalBlocks(content, additions, cacheControl, removals = [], toolDefinitions = {}) {
  let blocks = [
    ...(content
      ? [
          {
            type: "text",
            text: content,
          },
        ]
      : []),
    ...removals.map((name) => ({
      type: "tool_removal",
      tool: {
        type: "tool_reference",
        name,
      },
    })),
    ...additions.map((name) => {
      let definition = ownValue(toolDefinitions, name);
      return definition === undefined
        ? {
            type: "tool_addition",
            tool: {
              type: "tool_reference",
              name,
            },
          }
        : {
            type: "tool_addition",
            tool: {
              type: "tool_definition",
              definition,
            },
          };
    }),
  ];
  if (cacheControl !== undefined && blocks.length > 0)
    blocks.push({
      ...blocks.pop(),
      cache_control: cacheControl,
    });
  return blocks;
}
export {
  turnDeniedTools,
  DeclaredToolSet,
  toolChangeHeaderAllowed,
  inlineToolsAllowed,
  stickyBetasOr,
  adjustToolBetas,
  shouldAnnounceDeferredTools,
  canDeclareInlineTools,
  deferredToolsEnabled,
  resolveDeclaredToolSet,
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
  asDeclaredToolSet,
  cachedDeclaredTools,
  stickyBetasForRequest,
  hasDeclaredToolSet,
  canInlineToolAdditions,
  hasScratchToolSet,
  logDeclaredToolsDroppedAtCompaction,
  logDeclaredToolsDroppedAtCompaction2,
  canDeclareToolChange,
  cachedNoChannelTools,
  canDeclareToolChangeAhead,
};
