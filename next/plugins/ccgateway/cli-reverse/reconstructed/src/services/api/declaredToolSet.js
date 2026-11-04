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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-a76knw89.js:8006-8070 placement (2.1.88 match: stripCacheControl, 1)
/**
 * 取对象上的 cache_control（没有为 undefined）。旧版名 stripCacheControl 为错配。
 */
function getCacheControl(items) {
  return "cache_control" in items ? items.cache_control : undefined;
}
//@ chunk-a76knw89.js:8070-8157 placement (2.1.88 match: stripCacheControl, 1)
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
function asDeclaredToolSet(conversation) {
  let declaredTools = conversation.declaredTools;
  return declaredTools instanceof DeclaredToolSet ? declaredTools : undefined;
}
//@ chunk-a76knw89.js:44645-44717 placement
/**
 * 导出函数 `asScratchDeclaredToolSet`：参数 e，返回 noChannelTools instanceof DeclaredToolSet ? noChannelTools : void 0。
 */
function asScratchDeclaredToolSet(conversation) {
  let noChannelTools = conversation.noChannelTools;
  return noChannelTools instanceof DeclaredToolSet ? noChannelTools : undefined;
}
//@ chunk-a76knw89.js:44717-44856 placement
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
//@ chunk-a76knw89.js:44856-45338 placement
function buildDeclaredToolSet(tools, tools_2, recordedOnly) {
  let presentNames = new Set([...tools_2, ...tools].map((tool) => tool.name));
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
//@ chunk-a76knw89.js:45338-45405 placement (2.1.88 match: buildDiffableContent, 0.675)
/**
 * 工具定义比对时关心的键（name/description/input_schema/type 及附加键）。旧版名 buildDiffableContent 为错配；使用方在 chunk-a76knw89 的记录工具比较里。
 */
var TOOL_DIFF_KEYS; // deferred: uses TOOL_DEFINITION_BOOLEAN_KEYS (./toolDefinitionShape.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-a76knw89.js:45338", () => {
  TOOL_DIFF_KEYS = new Set(["name", "description", "input_schema", "type", ...TOOL_DEFINITION_BOOLEAN_KEYS]);
});
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
//@ chunk-a76knw89.js:46082-46611 placement
async function isHipaaRestricted(declaredSet, tools, { mcpClients, getPermissionContext, byValue }) {
  let heldNames = hasDeclaredToolSet(declaredSet, tools, true);
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
  let betas = stickyBetasForRequest(toolUseContext);
  return betas === undefined ? undefined : asDeclaredToolSet(betas);
}
//@ chunk-a76knw89.js:46750-46811 placement
/**
 * 导出函数 `cachedNoChannelTools`：参数 e，返回 n === void 0 ? void 0 : kbn(n)。
 */
function cachedNoChannelTools(toolUseContext) {
  let betas = stickyBetasForRequest(toolUseContext);
  return betas === undefined ? undefined : asScratchDeclaredToolSet(betas);
}
//@ chunk-a76knw89.js:46811-46909 placement
/**
 * 导出函数 `recordDeclaredToolsIfMissing`：参数 e, n，返回 !1; return (dLn(e, new DeclaredToolSet(n)), !0)。
 */
function recordDeclaredToolsIfMissing(stickyBetas, tools) {
  markDeclaredToolsDecided(stickyBetas);
  if (stickyBetas.declaredTools !== undefined || !isFoamySpringEnabled()) return false;
  setDeclaredTools(stickyBetas, new DeclaredToolSet(tools));
  return true;
}
//@ chunk-a76knw89.js:46909-47914 placement
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
      toolMatchesName(tool, name),
    )?.underlyingV1ToolName;
    return underlyingV1ToolName === undefined ? undefined : toolByName.get(underlyingV1ToolName);
  };
  let held = new Map();
  let only = new Map();
  let gateOffCount = 0;
  let needsUserCount = 0;
  let launchOmittedCount = 0;
  let lookupStub = (name) => {
    return;
  };
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
//@ chunk-a76knw89.js:47914-48419 placement
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
//@ chunk-a76knw89.js:48419-48969 placement
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
    for (let j = position - 1; j >= 0 && insertAt === -1; j--) {
      let precedingName = declaredSet.names[j];
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
//@ chunk-a76knw89.js:48969-49057 placement
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
//@ chunk-a76knw89.js:49057-49249 placement
function logDeclaredToolsDroppedAtCompaction(conversation, droppedNames) {
  let declaredSet = asDeclaredToolSet(conversation);
  if (declaredSet === undefined || droppedNames.length === 0) return;
  conversation.declaredTools = declaredSet.without(new Set(droppedNames));
  logEvent("tengu_declared_tools_dropped_at_compaction", {
    dropped: droppedNames.length,
    noDeferredChannel: false,
  });
}
//@ chunk-a76knw89.js:49249-49317 placement
/**
 * 导出函数 `hasScratchToolSet`：参数 e, n，返回 hasDeclaredToolSet(o, n, !0)。
 */
function hasScratchToolSet(conversation, tools) {
  let set = conversation === undefined ? undefined : asScratchDeclaredToolSet(conversation);
  return hasDeclaredToolSet(set, tools, true);
}
//@ chunk-a76knw89.js:49317-49510 placement
function logDeclaredToolsDroppedAtCompaction2(conversation, droppedNames) {
  let set = asScratchDeclaredToolSet(conversation);
  if (set === undefined || droppedNames.length === 0) return;
  conversation.noChannelTools = set.without(new Set(droppedNames));
  logEvent("tengu_declared_tools_dropped_at_compaction", {
    dropped: droppedNames.length,
    noDeferredChannel: true,
  });
}
//@ chunk-a76knw89.js:49510-49712 placement
function hasDeclaredToolSet(declaredSet, tools, keepMcp) {
  if (declaredSet === undefined) return [];
  let presentNames = new Set(tools.map((tool) => tool.name));
  return declaredSet.names.filter((name) => {
    if (presentNames.has(name) || !declaredSet.keeps(name)) return false;
    let mcpInfo = declaredSet.sourceFor(name)?.mcpInfo;
    return keepMcp || !isMcpToolName(name, mcpInfo?.serverName);
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
function isUndeclarableTool(name, server, baseTools, tools) {
  if (name === STRUCTUREDOUTPUT) return false;
  if (server !== undefined) return true;
  if (mcpInfoFromString(name) !== null) return false;
  if (name === WAITFORMCPSERVERS && !tools.some((tool) => toolMatchesName(tool, TOOL_SEARCH_TOOL_NAME)))
    return true;
  return baseTools !== undefined && findTool(baseTools, name) === undefined;
}
//@ chunk-a76knw89.js:49918-50326 placement
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
//@ chunk-a76knw89.js:50326-50409 placement
function requiresUserInteractionByName(name, baseTools) {
  return baseTools?.find((tool) => tool.name === name)?.requiresUserInteraction?.() === true;
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
function isPinnedUpfrontTool(name, server, baseTools) {
  if (isMcpToolName(name, server)) return false;
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_JOYFUL_ANCHOR, null);
  if (!Array.isArray(featureValue_CACHED_MAY_BE_STALE) || featureValue_CACHED_MAY_BE_STALE.length === 0)
    return false;
  let found = baseTools?.find((tool) => toolMatchesName(tool, name));
  return featureValue_CACHED_MAY_BE_STALE.some(
    (pinnedName) =>
      typeof pinnedName === "string" &&
      (pinnedName === name || (found !== undefined && toolMatchesName(found, pinnedName))),
  );
}
//@ chunk-a76knw89.js:50698-50803 placement (2.1.88 match: getToolNameForPermissionCheck, 1)
function getToolNameForPermissionCheck(toolName, server) {
  let mcpPrefix = getMcpPrefix(server);
  return {
    mcpInfo: {
      serverName: server,
      toolName: toolName.startsWith(mcpPrefix) ? toolName.slice(mcpPrefix.length) : toolName,
    },
  };
}
//@ chunk-a76knw89.js:50803-50852 placement
function isMcpToolName(name, server) {
  return server !== undefined || mcpInfoFromString(name) !== null;
}
//@ chunk-a76knw89.js:50852-51486 placement
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
//@ chunk-a76knw89.js:51486-51695 placement
function isLateToolAdditionsEnabled(declaredSet, { pool, keptDeferred, keepMcp }) {
  let presentNames = new Set([...pool.map((tool) => tool.name), ...keptDeferred]);
  return declaredSet.recordOrder.filter((name) => {
    let recorded = declaredSet.recordedOnly.get(name);
    return (
      recorded !== undefined && !presentNames.has(name) && (keepMcp || !isMcpToolName(name, recorded.server))
    );
  });
}
//@ chunk-a76knw89.js:51695-51767 placement (2.1.88 match: mergeClients, 1)
function mergeClients_2(schema) {
  return "name" in schema && typeof schema.name === "string" ? schema.name : undefined;
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
  let names = new Set();
  for (let schema of toolSchemas) {
    let name = mergeClients_2(schema);
    if (name !== undefined) names.add(name);
  }
  return names;
}
//@ chunk-a76knw89.js:51885-52282 placement
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
//@ chunk-a76knw89.js:52282-52321 placement
function canDeclareToolChange(conversation, model) {
  return toolChangeHeaderAllowed(conversation) && modelTakesToolAdditions(model);
}
//@ chunk-a76knw89.js:52321-52361 placement
/**
 * 导出函数 `toolChangeHeaderAllowed`：参数 e，返回 lT(e, Lb) && !we(e)。
 */
function toolChangeHeaderAllowed(conversation) {
  return isBetaSent(conversation, BETA_MID_CONV_TOOL_CHANGE) && !isToolChangeHeaderBlocked(conversation);
}
//@ chunk-a76knw89.js:52361-52407 placement
function isToolChangeHeaderBlocked(conversation) {
  return (
    isBetaRejected(conversation, BETA_MID_CONVERSATION_SYSTEM) ||
    isToolChangeHeaderRefused() ||
    !areDeferredToolsKept()
  );
}
//@ chunk-a76knw89.js:52407-52476 placement
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
function inlineToolsAllowed(conversation) {
  return (
    isBetaSent(conversation, BETA_INLINE_TOOLS) &&
    !isInlineToolsRefused() &&
    toolChangeHeaderAllowed(conversation)
  );
}
//@ chunk-a76knw89.js:52565-52672 placement
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
//@ chunk-a76knw89.js:52672-52817 placement
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
//@ chunk-a76knw89.js:52817-53137 placement
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
//@ chunk-a76knw89.js:53137-53329 placement
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
//@ chunk-a76knw89.js:53628-53903 placement
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
//@ chunk-a76knw89.js:53903-54256 placement
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
//@ chunk-a76knw89.js:55109-55563 placement
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
//@ chunk-a76knw89.js:55563-55631 placement
/**
 * 导出函数 `dropToolChangeState`：参数 e。
 */
function dropToolChangeState(conversation) {
  if (isBetaSent(conversation, BETA_MID_CONV_TOOL_CHANGE))
    markBetaRejected(conversation, BETA_MID_CONV_TOOL_CHANGE);
  fallBackToolChangeState(conversation);
  conversation.surfacedOnWire.clear();
}
//@ chunk-a76knw89.js:55631-55693 placement
function fallBackToolChangeState(conversation) {
  if (isBetaSent(conversation, BETA_INLINE_TOOLS)) rejectInlineToolsHeader(conversation, BETA_INLINE_TOOLS);
  conversation.definedByValue.clear();
}
//@ chunk-a76knw89.js:55693-56095 placement
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
//@ chunk-a76knw89.js:56095-56486 placement
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
