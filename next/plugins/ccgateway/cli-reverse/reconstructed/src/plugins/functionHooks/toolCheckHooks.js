/**
 * plugins/functionHooks/toolCheckHooks.ts
 *
 * 2.1.316 新增：tool.check 事件钩子接入权限检查（插件只能收紧）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (28)
 * attribution: placement 27, sole-consumer 1
 */
import { getAutoModeConfig } from "../../utils/settings/settings.js";
import { isAutoAllowedInMode, isComputerUseTool } from "../../utils/permissions/browserToolNames.js";
import { isChromeToolName } from "../../utils/claudeInChrome/chromeToolNames.js";
import { getToolNameForPermissionCheck as getToolNameForPermissionCheck_4 } from "../../services/mcp/mcpStringUtils.js";
import { isAutoClassifierActive } from "../../utils/permissions/autoModeState.js";
import { isChainOnAllowActive } from "../../utils/permissions/permissions.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import {
  getPermissionPromptHostKind,
  hasPermissionPromptTool,
  updatedInputOrOriginal,
} from "../../utils/permissions/permissionPromptHost.js";
import { getIsNonInteractiveSession, getPermissionPromptToolName } from "../../bootstrap/state.js";
import { mcpPermissionCeiling, matcherTestTarget } from "../../utils/hooks/matcherGrammar.js";
import {
  findDecidingRule,
  decisionReasonText,
  PermissionDecisionInfoItem,
} from "../../components/permissions/PermissionDecisionDebugInfo.js";
import { permissionRuleValueFromString as permissionRuleValueFromString_2 } from "../../utils/permissions/permissionRuleParser.js";
import { isSandboxOverrideUnderReadBlock } from "../../types/permissions.js";
import { logForDebugging } from "../../utils/debug.js";
import { UI_ENV_SITE_RULES } from "./sites/siteRules.js";
import { subscribe } from "../../../vendor/@growthbook/growthbook/dist/bundles/esm.js";
import { waitForHooksRespawn, pluginsMatchingEvent } from "./hookDispatch.js";
import { hasModuleHookingSite } from "../hooksModules/loadedModuleFilters.js";
import { checkToolReadOnly } from "./toolApi.js";
import { NO_CORE_AT_CHAIN_BOTTOM } from "./eventCatalog.js";
import { isWebToolRestrictedInRelay } from "../../utils/permissions/permissionRulePayload.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:51762-51851 placement
/**
 * 自动模式有无 deny 列表
 */
function hasAutoModeDenyLists() {
  let autoModeConfig = getAutoModeConfig();
  return (autoModeConfig?.soft_deny?.length ?? 0) > 0 || (autoModeConfig?.hard_deny?.length ?? 0) > 0;
}
//@ chunk-5xgkngpb.js:51851-51996 placement
function avoidsPrompt(tool, toolPermissionContext) {
  let autoMode = isAutoAllowedInMode(tool, toolPermissionContext);
  let isChrome = isChromeToolName(getToolNameForPermissionCheck_4(tool));
  return (
    (autoMode === "dontAsk" && !isChrome) ||
    (toolPermissionContext.shouldAvoidPermissionPrompts === true &&
      !(
        (isChrome || isAutoClassifierActive(autoMode, toolPermissionContext.servedCall === true)) &&
        isChainOnAllowActive()
      ))
  );
}
//@ chunk-5xgkngpb.js:51996-52116 placement
function hostApproves(tool, context) {
  let toolPermissionContext = getToolPermissionContext(context);
  let permissionPromptHostKind = getPermissionPromptHostKind(
    toolPermissionContext.servedCall === true ? "served" : "session",
  );
  return (
    context.asksNoHost !== true &&
    permissionPromptHostKind !== null &&
    !avoidsPrompt(tool, toolPermissionContext)
  );
}
//@ chunk-5xgkngpb.js:52116-52327 placement
/**
 * 判断 tool.check 中由谁审批：宿主（SDK 宿主可询问）、无人（不弹询问的模式）或人。
 */
function toolCheckApprover(tool, context) {
  let toolPermissionContext = getToolPermissionContext(context);
  let hostMayApprove = hostApproves(tool, context);
  let hasNoPromptTool =
    getIsNonInteractiveSession() && !hasPermissionPromptTool(getPermissionPromptToolName());
  let goesToPerson =
    context.asksNoHost === true ||
    isAutoAllowedInMode(tool, toolPermissionContext) === "dontAsk" ||
    toolPermissionContext.shouldAvoidPermissionPrompts === true ||
    (toolPermissionContext.servedCall !== true && hasNoPromptTool);
  return hostMayApprove
    ? {
        approver: "host",
      }
    : goesToPerson
      ? {}
      : {
          approver: "person",
        };
}
//@ chunk-5xgkngpb.js:52327-52348 placement
var TOOL_CHECK = "tool.check";
//@ chunk-5xgkngpb.js:52348-52464 placement
/**
 * 从权限决定原因中取钩子插件名。
 */
function hookNameFromDecision(result) {
  let decisionReason = result.decisionReason;
  return decisionReason?.type === "hook" && decisionReason.hookName !== TOOL_CHECK
    ? decisionReason.hookName.split(":").at(0)
    : undefined;
}
//@ chunk-5xgkngpb.js:52464-52574 placement
/**
 * 构造 tool.check 事件：工具名、输入、tool_use_id、agentId 与只读等工具元信息。
 */
var toToolCheckEvent = (tool, toolUseId, { input, agentId }) => ({
  tool: tool.name,
  input,
  tool_use_id: toolUseId,
  ...(agentId !== undefined && {
    agentId,
  }),
  ...mcpPermissionCeiling(tool),
});
//@ chunk-5xgkngpb.js:53072-53217 sole-consumer
function findDecidingRuleForResult(result) {
  let decisionReason = result.decisionReason;
  let matchedAskRule = result.behavior === "deny" ? undefined : result.matchedAskRule;
  return (
    (decisionReason?.type === "rule" ? decisionReason.rule : undefined) ??
    findDecidingRule(decisionReason, result.behavior) ??
    matchedAskRule
  );
}
//@ chunk-5xgkngpb.js:53217-53358 placement
/**
 * 汇总权限决定的调试信息：行为、原因文本、命中的规则与钩子。
 */
function buildDecisionSummary(decided, fallbackHookName) {
  let reasonText = decisionReasonText(decided);
  let decidingRuleForResult = findDecidingRuleForResult(decided);
  let hookName = hookNameFromDecision(decided) || fallbackHookName;
  return {
    decision: decided.behavior,
    ...(reasonText && {
      reason: reasonText,
    }),
    ...(decidingRuleForResult && {
      rule: permissionRuleValueFromString_2(decidingRuleForResult.ruleValue),
    }),
    ...(hookName && {
      hook: hookName,
    }),
  };
}
//@ chunk-5xgkngpb.js:53474-53510 placement
/**
 * 读取块覆盖
 */
var isReadBlockOverride = (decisionReason, context) =>
  PermissionDecisionInfoItem(decisionReason) ||
  isSandboxOverrideUnderReadBlock(decisionReason, getToolPermissionContext(context));
//@ chunk-5xgkngpb.js:53510-53568 placement
/**
 * permissions.blockReadsOutsideWorkingDirectories
 */
var READ_BLOCK_SETTING = "permissions.blockReadsOutsideWorkingDirectories";
//@ chunk-5xgkngpb.js:53568-53654 placement (2.1.88 match: renderToolUseMessage, 1)
/**
 * 附设置来源
 */
function withReadBlockSetting(result, context) {
  return result.behavior === "ask" && isReadBlockOverride(result.decisionReason, context)
    ? {
        setting: READ_BLOCK_SETTING,
      }
    : {};
}
//@ chunk-5xgkngpb.js:53654-53710 placement
/**
 * 工具检查核心步骤
 */
var coreToolCheckStep = (run) => ({
  name: "core",
  isCore: true,
  budgetMs: 0,
  run,
});
//@ chunk-5xgkngpb.js:53710-53805 placement
/**
 * 插件钩子决定来源
 */
function pluginHookDecisionSource(hooked, reason) {
  return {
    type: "hook",
    hookName: TOOL_CHECK,
    hookSource: `plugin:${hooked.join("+")}`,
    reason,
  };
}
//@ chunk-5xgkngpb.js:53805-53913 placement
function withDenialMessage(decided, reason) {
  switch (decided.behavior) {
    case "allow":
      return decided;
    case "ask":
    case "deny":
      return reason
        ? {
            ...decided,
            message: reason,
          }
        : decided;
  }
}
//@ chunk-5xgkngpb.js:53913-54084 placement
/**
 * 把权限结果标为只能由人决定：去掉建议，允许钩子拒绝，禁止"总是允许"。
 */
function personOnlyAsk(result) {
  let { classifierMayAllow, ...rest } = result;
  return {
    ...rest,
    suggestions: undefined,
    personOnly: true,
    hooksMayRefuse: true,
    hooksMayAllow: result.personOnly !== true,
    suppressAlwaysAllowRule: true,
  };
}
//@ chunk-5xgkngpb.js:54084-54868 placement
function describePluginPermissionDenial({ result: outcome, decided, tool, input, toolUseID, hooked }) {
  let isAskByPlugin = outcome.decision === "ask" && outcome.plugin !== undefined;
  if (decided?.behavior === outcome.decision) {
    let decidedResult = withDenialMessage(decided, outcome.reason);
    return isAskByPlugin && decidedResult.behavior === "ask" ? personOnlyAsk(decidedResult) : decidedResult;
  }
  let hookLabel = `${hooked.length === 1 ? "plugin" : "plugins"} ${hooked.join(", ")}`;
  let reasonText = outcome.reason === undefined ? "" : `: ${outcome.reason}`;
  let message =
    outcome.decision === "deny"
      ? `Permission to use ${tool} denied by ${hookLabel}${reasonText}`
      : `${tool} needs approval (asked by ${hookLabel}${reasonText})`;
  let decisionReason = pluginHookDecisionSource(hooked, outcome.reason);
  let updatedInput = updatedInputOrOriginal(decided, input);
  switch (
    (logForDebugging(
      `tool.check ${tool} ${toolUseID}: ${decided?.behavior ?? "unevaluated"} -> ${outcome.decision} by ${hookLabel}` +
        reasonText,
    ),
    outcome.decision)
  ) {
    case "allow":
      return {
        behavior: "allow",
        updatedInput,
        decisionReason,
      };
    case "deny":
      return {
        behavior: "deny",
        message,
        decisionReason,
      };
    case "ask": {
      let askResult = {
        behavior: "ask",
        message,
        updatedInput,
        decisionReason,
      };
      return isAskByPlugin ? personOnlyAsk(askResult) : askResult;
    }
  }
}
//@ chunk-5xgkngpb.js:54868-55001 placement
function denyAskWithoutApprover(result, { tool, context }) {
  return result.decision === "ask" &&
    result.plugin !== undefined &&
    toolCheckApprover(tool, context).approver === undefined
    ? {
        ...result,
        decision: "deny",
      }
    : result;
}
//@ chunk-5xgkngpb.js:55001-55156 placement
/**
 * tool.check 链底核心：执行原权限评估并转为事件结果，记录评估结果供后续使用。
 */
function createToolCheckCore(evaluate, tool, context) {
  let decided;
  return {
    core: coreToolCheckStep(async () => {
      decided = await evaluate();
      return {
        ...buildDecisionSummary(decided, context.hookAskFloor === true ? "PreToolUse" : undefined),
        ...withReadBlockSetting(decided, context),
        ...mcpPermissionCeiling(tool),
      };
    }),
    decided: () => decided,
  };
}
//@ chunk-5xgkngpb.js:55156-55181 placement
/**
 * tool.check 站点规则
 */
var TOOL_CHECK_RULES; // deferred: uses UI_ENV_SITE_RULES (./sites/siteRules.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:55156", () => {
  TOOL_CHECK_RULES = UI_ENV_SITE_RULES["tool.check"];
});
//@ chunk-5xgkngpb.js:55181-55287 placement
var toolCheckEventFor = ({ tool, input, context, toolUseID }) => ({
  ...toToolCheckEvent(tool, toolUseID, {
    input,
    agentId: context.agentId,
  }),
  ...toolCheckApprover(tool, context),
});
//@ chunk-5xgkngpb.js:55287-55397 placement
function createToolCheckSlot() {
  let resolverSlot = subscribe();
  return {
    setToolCheckResolver: resolverSlot.set,
    resolveToolCheck: (request) => resolverSlot.get()?.(request) ?? request.evaluate(),
  };
}
//@ chunk-5xgkngpb.js:55397-55411 placement
/**
 * 工具检查槽
 */
var toolCheckSlot; // deferred: uses createToolCheckSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:55397", () => {
  toolCheckSlot = createToolCheckSlot();
});
//@ chunk-5xgkngpb.js:55411-55440 placement
var resolveToolCheck; // deferred: uses toolCheckSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:55411", () => {
  resolveToolCheck = toolCheckSlot.resolveToolCheck;
});
//@ chunk-5xgkngpb.js:55440-55473 placement
var setToolCheckResolver; // deferred: uses toolCheckSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:55440", () => {
  setToolCheckResolver = toolCheckSlot.setToolCheckResolver;
});
//@ chunk-5xgkngpb.js:55473-55579 placement
function toolCheckRecord({ tool, input, toolUseID }, decided, hooked) {
  return {
    decided,
    tool: tool.name,
    input,
    toolUseID,
    hooked,
  };
}
//@ chunk-5xgkngpb.js:55579-56590 placement
/**
 * 把 tool.check 钩子的裁决并入权限检查：插件只能收紧，放宽的结果被忽略并记录。
 */
var applyToolCheckHookVerdict = (request) => {
  let { tool, input, context, toolUseID, evaluate } = request;
  let event = toolCheckEventFor(request);
  let respawnWait = waitForHooksRespawn(
    {
      event: "tool.check",
      e: event,
      origin: context.hookOrigin,
    },
    context.abortController.signal,
  );
  if (respawnWait !== undefined)
    return respawnWait.then(() => applyToolCheckHookVerdict(request) ?? evaluate());
  let matcherTarget = {
    ...matcherTestTarget(tool),
    agentId: context.agentId,
  };
  if (!hasModuleHookingSite("tool.check", matcherTarget)) return;
  let readOnly = checkToolReadOnly(tool, input, context);
  let toolCheckCore = createToolCheckCore(evaluate, tool, context);
  return NO_CORE_AT_CHAIN_BOTTOM("tool.check", {
    signal: context.abortController.signal,
    origin: context.hookOrigin,
    core: {
      "tool.check": toolCheckCore.core,
    },
  })({
    ...event,
    ...readOnly,
  }).then(async (answer) => {
    let withApprover = denyAskWithoutApprover(answer, request);
    let isTightenable = isWebToolRestrictedInRelay(tool.name) || isComputerUseTool(tool.mcpInfo);
    let isLoosened = withApprover.decision !== "deny" && isTightenable;
    let decided = toolCheckCore.decided();
    if (isLoosened) {
      decided ??= await evaluate();
      if (withApprover.decision === "allow" || decided.behavior === "deny") {
        logForDebugging(
          `tool.check ${tool.name} ${toolUseID}: ignored a plugin's ${withApprover.decision} and kept the permission check's ${decided.behavior}; plugins can only tighten ${tool.name}'s permission in this session`,
        );
        return decided;
      }
    }
    let record = toolCheckRecord(
      request,
      decided,
      pluginsMatchingEvent(
        "tool.check",
        {
          ...matcherTarget,
          isReadOnly: readOnly.isReadOnly,
        },
        context.hookOrigin,
      ),
    );
    let denial = describePluginPermissionDenial({
      ...record,
      result: withApprover,
    });
    if (withApprover === answer || denial.behavior !== "deny" || isTightenable) return denial;
    let coreDenial = describePluginPermissionDenial({
      ...record,
      result: answer,
    });
    return coreDenial.behavior === "ask"
      ? {
          ...coreDenial,
          refusal: denial,
        }
      : denial;
  });
};
//@ chunk-5xgkngpb.js:56590-56599 placement
// deferred: uses setToolCheckResolver of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:56590", () => {
  setToolCheckResolver(applyToolCheckHookVerdict);
});
export {
  hasAutoModeDenyLists,
  resolveToolCheck,
  personOnlyAsk,
  TOOL_CHECK,
  createToolCheckCore,
  toolCheckApprover,
  TOOL_CHECK_RULES,
  toToolCheckEvent,
  describePluginPermissionDenial,
};
