/**
 * utils/permissions/toolPermissionContext.ts
 *
 * 2.1.316 新增：工具权限上下文的分层合并与读取。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-8899qs36.js (41)
 * attribution: placement 41
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { normalizeCaseForComparison_2 } from "./filesystem.js";
import { isAutoClassifierActive } from "./autoModeState.js";
import { permissionRuleValueFromString, parseRuleString } from "./permissionRuleParser.js";
import { createAbortController } from "../abortController.js";
import { codeModeAccepted } from "../codeMode/accepted.js";
import { stripWideningPermissionLayers } from "../../dialogLaunchers.js";
import { isPlanBypass } from "./browserToolNames.js";
import { SKILL, SKILL_2 } from "../../tools/SkillTool/skillToolNames.js";
import { isBypassPermissionsModeDisabled } from "./permissionSetup.js";
import {
  resolveEffortLevel,
  dropSessionLevelIfModelDiffers,
  isSameModelSettings,
  resolveEffortValue,
  resolveEffortWithoutHold,
} from "../effort.js";
import { resolveRuntimeMainLoopModel } from "../model/planModeModel.js";
import { isMainConversationContext } from "../agentContext.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-8899qs36.js:575-722 placement
function addCommandAllowRules(toolPermissionContext, rules) {
  if (rules.length === 0) return toolPermissionContext;
  return {
    ...toolPermissionContext,
    alwaysAllowRules: {
      ...toolPermissionContext.alwaysAllowRules,
      command: normalizeCaseForComparison_2([
        ...(toolPermissionContext.alwaysAllowRules.command || []),
        ...rules,
      ]),
    },
  };
}
//@ chunk-8899qs36.js:722-866 placement
function addCommandDenyRules(toolPermissionContext, rules) {
  if (rules.length === 0) return toolPermissionContext;
  return {
    ...toolPermissionContext,
    alwaysDenyRules: {
      ...toolPermissionContext.alwaysDenyRules,
      command: normalizeCaseForComparison_2([
        ...(toolPermissionContext.alwaysDenyRules.command || []),
        ...rules,
      ]),
    },
  };
}
//@ chunk-8899qs36.js:866-1571 placement
/**
 * 包装 getAppState，在返回的权限上下文里叠加命令级 allow/deny 规则：可整体替换或追加，冻结的命令 deny 优先，轮次禁用工具并入 deny；pollEventDeliveryGuard 时不改 allow。
 */
function withCommandRuleOverrides(getAppState, allowRules, denyRules, options) {
  if (
    !options?.replaceCommandRules &&
    !options?.replaceDenyRules &&
    options?.frozenCommandDenies === undefined &&
    allowRules.length === 0 &&
    denyRules.length === 0
  )
    return getAppState;
  return () => {
    let state = getAppState();
    let withAllow =
      state.toolPermissionContext.pollEventDeliveryGuard === true
        ? state.toolPermissionContext
        : options?.replaceCommandRules
          ? {
              ...state.toolPermissionContext,
              alwaysAllowRules: {
                ...state.toolPermissionContext.alwaysAllowRules,
                command: allowRules,
              },
            }
          : addCommandAllowRules(state.toolPermissionContext, allowRules);
    let withDeny = options?.replaceDenyRules
      ? {
          ...withAllow,
          alwaysDenyRules: {
            ...withAllow.alwaysDenyRules,
            command: [...denyRules, ...(withAllow.turnDisallowedTools ?? [])],
          },
        }
      : options?.frozenCommandDenies !== undefined
        ? {
            ...withAllow,
            alwaysDenyRules: {
              ...withAllow.alwaysDenyRules,
              command: normalizeCaseForComparison_2([
                ...options.frozenCommandDenies,
                ...(withAllow.alwaysDenyRules.command ?? []),
                ...denyRules,
              ]),
            },
          }
        : addCommandDenyRules(withAllow, denyRules);
    return {
      ...state,
      toolPermissionContext: withDeny,
    };
  };
}
//@ chunk-8899qs36.js:1571-1681 placement
class ModeAtRequest {
  mode;
  autoClassifierActive;
  constructor(mode, autoClassifierActive) {
    this.mode = mode;
    this.autoClassifierActive = autoClassifierActive;
  }
  toJSON() {
    return;
  }
}
//@ chunk-8899qs36.js:1681-1721 placement
/**
 * modeAtRequestFor：按当前上下文构造模式的按请求快照。
 */
function modeAtRequestFor(mode) {
  return new ModeAtRequest(mode, isAutoClassifierActive(mode));
}
//@ chunk-8899qs36.js:1721-1786 placement
/**
 * isPlainModeAtRequest：模式快照且未启用分类器。
 */
function isPlainModeAtRequest(permissionModeAtRequest) {
  return permissionModeAtRequest instanceof ModeAtRequest && !permissionModeAtRequest.autoClassifierActive;
}
//@ chunk-8899qs36.js:1786-2004 placement
function getFallbackModeForRequest(permissionModeAtRequest) {
  if (!isPlainModeAtRequest(permissionModeAtRequest)) return;
  let mode = permissionModeAtRequest.mode;
  switch (mode) {
    case "default":
    case "acceptEdits":
    case "dontAsk":
    case "bubble":
      return mode;
    case "plan":
    case "bypassPermissions":
      return "default";
    case "auto":
      return;
    default: {
      let rawMode = mode;
      return;
    }
  }
}
//@ chunk-8899qs36.js:2004-2018 placement
var EMPTY_RULE_SET; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-8899qs36.js:2004", () => {
  EMPTY_RULE_SET = new Set();
});
//@ chunk-8899qs36.js:2018-2051 placement
/**
 * canonicalRuleString：规则的规范字符串。
 */
function canonicalRuleString(ruleString) {
  return permissionRuleValueFromString(parseRuleString(ruleString));
}
//@ chunk-8899qs36.js:2051-2165 placement
/**
 * 取远程浏览器卡片回答生成的会话规则集合；只在它仍对应当前 session allow 列表时有效。
 */
function getRemoteBrowserCardRules(context) {
  let remoteBrowserCardAnswers = context.remoteBrowserCardAnswers;
  return remoteBrowserCardAnswers !== undefined &&
    remoteBrowserCardAnswers.list === context.alwaysAllowRules.session
    ? remoteBrowserCardAnswers.rules
    : EMPTY_RULE_SET;
}
//@ chunk-8899qs36.js:2165-2462 placement
/**
 * 会话 allow 列表变化后，重算远程浏览器卡片回答：只保留仍在新列表中的规则，为空时清除。
 */
function syncRemoteBrowserCardAnswers(previousContext, nextContext) {
  let session = nextContext.alwaysAllowRules.session;
  if (
    previousContext.remoteBrowserCardAnswers === undefined ||
    session === previousContext.alwaysAllowRules.session
  )
    return nextContext;
  let remoteBrowserCardRules = getRemoteBrowserCardRules(previousContext);
  let currentRuleSet = new Set((session ?? []).map(canonicalRuleString));
  let keptRules = new Set(
    [...remoteBrowserCardRules].filter((remoteBrowserCardRule) => currentRuleSet.has(remoteBrowserCardRule)),
  );
  return {
    ...nextContext,
    remoteBrowserCardAnswers:
      session === undefined || keptRules.size === 0
        ? undefined
        : {
            rules: keptRules,
            list: session,
          },
  };
}
//@ chunk-8899qs36.js:2797-3030 placement
function contextAfterTurn(toolUseContext) {
  return {
    ...toolUseContext,
    abortController: createAbortController(),
    toolUseId: undefined,
    permissionPhase: undefined,
    autoModeClassified: undefined,
    ...(codeModeAccepted() && {
      autoModeDenialLimitRun: undefined,
      autoModeScriptCheckDeferred: undefined,
    }),
    permissionLayers: stripWideningPermissionLayers(toolUseContext.permissionLayers),
  };
}
//@ chunk-8899qs36.js:3030-3109 placement
function getSuppressedClaudeAiConnectors(toolUseContext) {
  return toolUseContext.getAppState?.().mcp?.suppressedClaudeAiConnectors ?? [];
}
//@ chunk-8899qs36.js:3109-3220 placement
function consentAskCanReachUser(toolUseContext) {
  let toolPermissionContext = getToolPermissionContext(toolUseContext);
  return (
    toolPermissionContext.mode !== "bypassPermissions" &&
    !isPlanBypass(toolPermissionContext.mode, toolPermissionContext.isBypassPermissionsModeAvailable)
  );
}
//@ chunk-8899qs36.js:3220-3280 placement
function planConsentMustDeny(toolUseContext) {
  if (getToolPermissionContext(toolUseContext).mode !== "plan") return false;
  return consentMustDeny(toolUseContext);
}
//@ chunk-8899qs36.js:3280-3319 placement
function artifactFilesConsentSlugs(toolUseContext) {
  return toolUseContext.getAppState();
}
//@ chunk-8899qs36.js:3319-3388 placement
function consentMustDeny(toolUseContext) {
  return (
    !consentAskCanReachUser(toolUseContext) ||
    getToolPermissionContext(toolUseContext).shouldAvoidPermissionPrompts === true
  );
}
//@ chunk-8899qs36.js:3388-3458 placement
function isSkillRule(ruleString) {
  return ruleString === SKILL || ruleString.startsWith(`${SKILL}(`) || ruleString.startsWith(SKILL_2);
}
//@ chunk-8899qs36.js:3458-3867 placement
/**
 * 把 allow 规则中被判定为危险的移入 strippedDangerousRules（按来源去重），并同步远程浏览器卡片回答；无变化返回原上下文。
 */
function stripDangerousAllowRules(previousContext) {
  let isDangerousSkillRule = isSkillRule;
  let changed = false;
  let nextAllowRules = {};
  let nextStripped = {};
  for (let [key, value] of Object.entries(previousContext.strippedDangerousRules ?? {}))
    if (value !== undefined) nextStripped[key] = [...value];
  for (let [key, value] of Object.entries(previousContext.alwaysAllowRules)) {
    if (value === undefined) continue;
    let filtered = value.filter((ruleString) => !isDangerousSkillRule(ruleString));
    if (filtered.length !== value.length) {
      changed = true;
      for (let ruleString of value)
        if (isDangerousSkillRule(ruleString)) {
          let stash = (nextStripped[key] ??= []);
          if (!stash.includes(ruleString)) stash.push(ruleString);
        }
    }
    nextAllowRules[key] = filtered;
  }
  if (!changed) return previousContext;
  return syncRemoteBrowserCardAnswers(previousContext, {
    ...previousContext,
    alwaysAllowRules: nextAllowRules,
    strippedDangerousRules: nextStripped,
  });
}
//@ chunk-8899qs36.js:3867-3928 placement (2.1.88 match: call, 0.777)
function storedToolPermissionContext(toolUseContext) {
  return toolUseContext.getAppState().toolPermissionContext;
}
//@ chunk-8899qs36.js:3928-5042 placement
function getToolPermissionContext(toolUseContext) {
  let toolPermissionContext = toolUseContext.getAppState().toolPermissionContext;
  let stripSkills =
    toolPermissionContext !== undefined && toolPermissionContext.pollEventDeliveryGuard === true;
  if (stripSkills) toolPermissionContext = stripDangerousAllowRules(toolPermissionContext);
  let permissionLayers = toolUseContext.permissionLayers;
  if (!permissionLayers) return relaxContextForExecution(toolUseContext, toolPermissionContext);
  let last = permissionLayers.findLast((permissionLayer) => permissionLayer.kind === "working_directory");
  for (let permissionLayer of permissionLayers)
    switch (permissionLayer.kind) {
      case "allowed_tools":
        if (!stripSkills)
          toolPermissionContext = addCommandAllowRules(toolPermissionContext, [
            ...permissionLayer.allowedTools,
          ]);
        break;
      case "disallowed_tools":
        toolPermissionContext = addCommandDenyRules(toolPermissionContext, [
          ...permissionLayer.disallowedTools,
        ]);
        break;
      case "bash_command_clamp":
        toolPermissionContext = {
          ...toolPermissionContext,
          bashCommandClamps: [...(toolPermissionContext.bashCommandClamps ?? []), permissionLayer.rules],
        };
        break;
      case "avoid_prompts":
        if (!toolPermissionContext.shouldAvoidPermissionPrompts)
          toolPermissionContext = {
            ...toolPermissionContext,
            shouldAvoidPermissionPrompts: true,
          };
        break;
      case "sandbox_auto_allow_suspended":
        if (!toolPermissionContext.sandboxAutoAllowSuspended)
          toolPermissionContext = {
            ...toolPermissionContext,
            sandboxAutoAllowSuspended: true,
          };
        break;
      case "permission_mode": {
        if (
          permissionLayer.mode === "bypassPermissions" &&
          (isBypassPermissionsModeDisabled() || !toolPermissionContext.isBypassPermissionsModeAvailable)
        )
          break;
        toolPermissionContext = {
          ...toolPermissionContext,
          mode: permissionLayer.mode,
        };
        break;
      }
      case "working_directory":
        if (
          permissionLayer === last &&
          !toolPermissionContext.additionalWorkingDirectories.has(permissionLayer.directory)
        )
          toolPermissionContext = {
            ...toolPermissionContext,
            additionalWorkingDirectories: new Map([
              ...toolPermissionContext.additionalWorkingDirectories,
              [
                permissionLayer.directory,
                {
                  path: permissionLayer.directory,
                  source: "session",
                },
              ],
            ]),
          };
        break;
      case "effort":
      case "model":
      case "max_thinking_tokens":
      case "flag_settings":
        break;
    }
  return relaxContextForExecution(toolUseContext, toolPermissionContext);
}
//@ chunk-8899qs36.js:5042-5082 placement
function relaxContextForExecution(toolUseContext, context) {
  return downgradeAutoForPromptShell(
    toolUseContext,
    relaxForRemoteExecution(toolUseContext, downgradeAutoModeForRequest(toolUseContext, context)),
  );
}
//@ chunk-8899qs36.js:5082-5257 placement
function downgradeAutoModeForRequest(toolUseContext, context) {
  if (
    context === undefined ||
    context.mode !== "auto" ||
    toolUseContext.forPromptShellCommand === true ||
    toolUseContext.forRemoteExecution === true
  )
    return context;
  let mode = getFallbackModeForRequest(toolUseContext.permissionModeAtRequest);
  return mode === undefined ? context : withModeAtRequest(mode, context);
}
//@ chunk-8899qs36.js:5257-5366 placement
function downgradeAutoForPromptShell(toolUseContext, context) {
  if (toolUseContext.forPromptShellCommand !== true || context === undefined) return context;
  return context.mode === "auto" ? withModeAtRequest("default", context) : context;
}
//@ chunk-8899qs36.js:5366-5448 placement
function withModeAtRequest(mode, context) {
  return {
    ...context,
    mode,
    modeBeforeRewrite: context.modeBeforeRewrite ?? context.mode,
  };
}
//@ chunk-8899qs36.js:5448-5680 placement
function relaxForRemoteExecution(toolUseContext, context) {
  if (toolUseContext.forRemoteExecution !== true || context === undefined) return context;
  let { blockReadsOutsideWorkingDirectories, blockWritesOutsideWorkingDirectories, ...relaxed } = context;
  return context.mode === "acceptEdits" || context.mode === "bypassPermissions"
    ? withModeAtRequest("default", relaxed)
    : relaxed;
}
//@ chunk-8899qs36.js:5680-5772 placement
/**
 * 在权限层列表里取最后一个 kind=effort 的 effort 值（本轮 effort 覆盖）。旧版名 configureEffortParams 为错配。
 */
function getEffortLayerOverride(permissionLayers) {
  let effort;
  if (!permissionLayers) return effort;
  for (let layer of permissionLayers) if (layer.kind === "effort") effort = layer.effort;
  return effort;
}
//@ chunk-8899qs36.js:5772-5881 placement
/**
 * 由应用状态与该会话的模型算出工具权限上下文，可按 withHold 决定是否扣住。
 */
function getBaselineEffort(toolUseContext, withHold = isMainConversation(toolUseContext)) {
  let effectiveMainLoopModel = getEffectiveMainLoopModel(toolUseContext);
  return resolveEffortLevel(
    dropSessionLevelIfModelDiffers(
      toolUseContext.getAppState?.() ?? {},
      effectiveMainLoopModel,
      toolUseContext.pickedEffortModel,
    ),
    effectiveMainLoopModel,
    {
      withHold,
    },
  );
}
//@ chunk-8899qs36.js:5881-5934 placement
function getEffortValue(toolUseContext) {
  return getEffortLayerOverride(toolUseContext.permissionLayers) ?? getBaselineEffort(toolUseContext);
}
//@ chunk-8899qs36.js:5934-6036 placement
/**
 * 取会话选定的 effort 模型，没选则按权限模式与主循环模型推默认模型。
 */
function getPickedEffortModel(toolUseContext) {
  return (
    toolUseContext.pickedEffortModel ??
    resolveRuntimeMainLoopModel({
      permissionMode: getToolPermissionContext(toolUseContext).mode,
      mainLoopModel: getMainLoopModel(toolUseContext),
    }).model
  );
}
//@ chunk-8899qs36.js:6036-6129 placement
/**
 * 模型不可用或被拒时给携带 effort 的权限上下文 overlay，否则 undefined。
 */
function getOwnEffortOffPickedModel(toolUseContext, model, pickedModel) {
  return isSameModelSettings(model, pickedModel)
    ? undefined
    : resolveEffortValue(model, resolveEffortWithoutHold(toolUseContext.getAppState(), model), {
        carriedEffort: null,
      });
}
//@ chunk-8899qs36.js:6129-6276 placement (2.1.88 match: _temp, 0.428)
function getHelperEffort(toolUseContext, model) {
  return isSameModelSettings(model, getMainLoopModel(toolUseContext))
    ? {
        effortValue: getEffortValue(toolUseContext),
        turnEffort: getEffortLayerOverride(toolUseContext.permissionLayers),
      }
    : {
        effortValue: resolveEffortWithoutHold(toolUseContext.getAppState(), model),
        turnEffort: undefined,
      };
}
//@ chunk-8899qs36.js:6276-6341 placement
function isMainConversation(toolUseContext) {
  return toolUseContext.agentContext === undefined || isMainConversationContext(toolUseContext.agentContext);
}
//@ chunk-8899qs36.js:6341-6396 placement
function getEffortSetAsideByHold(toolUseContext) {
  return getEffortValue(toolUseContext) === undefined ? getBaselineEffort(toolUseContext, false) : undefined;
}
//@ chunk-8899qs36.js:6396-6524 placement
function getEffectiveMainLoopModel(toolUseContext) {
  let mainLoopModel = toolUseContext.options?.mainLoopModel;
  for (let layer of toolUseContext.permissionLayers ?? [])
    if (layer.kind === "model") mainLoopModel = layer.mainLoopModel;
  return mainLoopModel;
}
//@ chunk-8899qs36.js:6524-6577 placement
function getSessionEffort(toolUseContext) {
  return toolUseContext.getAppState().sessionEffort;
}
//@ chunk-8899qs36.js:6577-6629 placement
function getMainLoopModel(toolUseContext) {
  return getEffectiveMainLoopModel(toolUseContext) ?? toolUseContext.options.mainLoopModel;
}
//@ chunk-8899qs36.js:6629-6780 placement
function getThinkingConfig(toolUseContext) {
  let thinkingConfig = toolUseContext.options.thinkingConfig;
  for (let layer of toolUseContext.permissionLayers ?? [])
    if (layer.kind === "max_thinking_tokens") thinkingConfig = thinkingBudgetConfig(layer.maxThinkingTokens);
  return thinkingConfig;
}
//@ chunk-8899qs36.js:6780-6857 placement
function thinkingBudgetConfig(maxThinkingTokens) {
  return maxThinkingTokens === 0
    ? {
        type: "disabled",
      }
    : {
        type: "enabled",
        budgetTokens: maxThinkingTokens,
      };
}
//@ chunk-8899qs36.js:6857-6911 placement (2.1.88 match: getNestedMemoryAttachments, 0.431)
function getUltracodeRequested(toolUseContext) {
  return toolUseContext.getAppState().ultracode === true;
}
//@ chunk-8899qs36.js:6911-7373 placement
function applyContextLayers(toolUseContext, newLayers) {
  if (newLayers.length === 0) return toolUseContext;
  let permissionLayers = toolUseContext.permissionLayers
    ? [...toolUseContext.permissionLayers, ...newLayers]
    : [...newLayers];
  let model;
  for (let index = newLayers.length - 1; index >= 0; index--) {
    let layer = newLayers[index];
    if (layer.kind === "model") {
      model = layer.mainLoopModel;
      break;
    }
  }
  let thinkingConfig;
  for (let index = newLayers.length - 1; index >= 0; index--) {
    let layer = newLayers[index];
    if (layer.kind === "max_thinking_tokens") {
      thinkingConfig = thinkingBudgetConfig(layer.maxThinkingTokens);
      break;
    }
  }
  return {
    ...toolUseContext,
    permissionLayers,
    ...((model !== undefined || thinkingConfig !== undefined) && {
      options: {
        ...toolUseContext.options,
        ...(model !== undefined && {
          mainLoopModel: model,
        }),
        ...(thinkingConfig !== undefined && {
          thinkingConfig,
        }),
      },
    }),
  };
}
export {
  getToolPermissionContext,
  getMainLoopModel,
  contextAfterTurn,
  consentMustDeny,
  storedToolPermissionContext,
  getEffortLayerOverride,
  getPickedEffortModel,
  planConsentMustDeny,
  consentAskCanReachUser,
  getEffortValue,
  getUltracodeRequested,
  getHelperEffort,
  getThinkingConfig,
  getOwnEffortOffPickedModel,
  getSuppressedClaudeAiConnectors,
  getSessionEffort,
  getBaselineEffort,
  syncRemoteBrowserCardAnswers,
  getRemoteBrowserCardRules,
  canonicalRuleString,
  isPlainModeAtRequest,
  getEffortSetAsideByHold,
  withCommandRuleOverrides,
  ModeAtRequest,
  applyContextLayers,
  artifactFilesConsentSlugs,
  modeAtRequestFor,
};
