/**
 * utils/permissions/toolPermissionContext.ts
 *
 * 2.1.316 新增：工具权限上下文的分层合并与读取。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-agvbmc7h.js (38)
 * attribution: placement 38
 */
import { uniq } from "../collections.js";
import { isAutoClassifierActive } from "./autoModeState.js";
import { formatPermissionRule } from "./disallowedToolsFlag.js";
import { permissionRuleValueFromString } from "./permissionRuleParser.js";
import { createAbortController } from "../abortController.js";
import { launchSnapshotUpdateDialog } from "../../dialogLaunchers.js";
import { isPlanBypass } from "./browserToolNames.js";
import { SKILL, SKILL_2 } from "../../tools/SkillTool/skillToolNames.js";
import { isBypassPermissionsModeDisabled } from "./permissionSetup.js";
import { resolveEffortLevel, isSameModelSettings, resolveEffortWithoutHold } from "../effort.js";
import { isMainConversationContext } from "../agentContext.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-agvbmc7h.js:528-675 placement
function addCommandAllowRules(toolPermissionContext, rules) {
  if (rules.length === 0) return toolPermissionContext;
  return {
    ...toolPermissionContext,
    alwaysAllowRules: {
      ...toolPermissionContext.alwaysAllowRules,
      command: uniq([...(toolPermissionContext.alwaysAllowRules.command || []), ...rules]),
    },
  };
}
//@ chunk-agvbmc7h.js:675-819 placement
function addCommandDenyRules(toolPermissionContext, rules) {
  if (rules.length === 0) return toolPermissionContext;
  return {
    ...toolPermissionContext,
    alwaysDenyRules: {
      ...toolPermissionContext.alwaysDenyRules,
      command: uniq([...(toolPermissionContext.alwaysDenyRules.command || []), ...rules]),
    },
  };
}
//@ chunk-agvbmc7h.js:819-1524 placement
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
              command: uniq([
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
//@ chunk-agvbmc7h.js:1524-1632 placement
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
//@ chunk-agvbmc7h.js:1632-1670 placement
/**
 * modeAtRequestFor：按当前上下文构造模式的按请求快照。
 */
function modeAtRequestFor(mode) {
  return new ModeAtRequest(mode, isAutoClassifierActive(mode));
}
//@ chunk-agvbmc7h.js:1670-1733 placement
/**
 * isPlainModeAtRequest：模式快照且未启用分类器。
 */
function isPlainModeAtRequest(permissionModeAtRequest) {
  return permissionModeAtRequest instanceof ModeAtRequest && !permissionModeAtRequest.autoClassifierActive;
}
//@ chunk-agvbmc7h.js:1733-1951 placement
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
//@ chunk-agvbmc7h.js:1951-1965 placement
var EMPTY_RULE_SET; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-agvbmc7h.js:1951", () => {
  EMPTY_RULE_SET = new Set();
});
//@ chunk-agvbmc7h.js:1965-1998 placement
/**
 * canonicalRuleString：规则的规范字符串。
 */
function canonicalRuleString(ruleString) {
  return formatPermissionRule(permissionRuleValueFromString(ruleString));
}
//@ chunk-agvbmc7h.js:1998-2112 placement
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
//@ chunk-agvbmc7h.js:2112-2409 placement
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
//@ chunk-agvbmc7h.js:2742-2903 placement
function contextAfterTurn(toolUseContext) {
  return {
    ...toolUseContext,
    abortController: createAbortController(),
    toolUseId: undefined,
    permissionPhase: undefined,
    autoModeClassified: undefined,
    ...false,
    permissionLayers: launchSnapshotUpdateDialog(toolUseContext.permissionLayers),
  };
}
//@ chunk-agvbmc7h.js:2903-2982 placement
function getSuppressedClaudeAiConnectors(toolUseContext) {
  return toolUseContext.getAppState?.().mcp?.suppressedClaudeAiConnectors ?? [];
}
//@ chunk-agvbmc7h.js:2982-3093 placement
function consentAskCanReachUser(toolUseContext) {
  let toolPermissionContext = getToolPermissionContext(toolUseContext);
  return (
    toolPermissionContext.mode !== "bypassPermissions" &&
    !isPlanBypass(toolPermissionContext.mode, toolPermissionContext.isBypassPermissionsModeAvailable)
  );
}
//@ chunk-agvbmc7h.js:3093-3153 placement
function planConsentMustDeny(toolUseContext) {
  if (getToolPermissionContext(toolUseContext).mode !== "plan") return false;
  return consentMustDeny(toolUseContext);
}
//@ chunk-agvbmc7h.js:3153-3192 placement
function artifactFilesConsentSlugs(toolUseContext) {
  return toolUseContext.getAppState();
}
//@ chunk-agvbmc7h.js:3192-3261 placement
function consentMustDeny(toolUseContext) {
  return (
    !consentAskCanReachUser(toolUseContext) ||
    getToolPermissionContext(toolUseContext).shouldAvoidPermissionPrompts === true
  );
}
//@ chunk-agvbmc7h.js:3261-3331 placement
function isSkillRule(ruleString) {
  return ruleString === SKILL || ruleString.startsWith(`${SKILL}(`) || ruleString.startsWith(SKILL_2);
}
//@ chunk-agvbmc7h.js:3331-3740 placement
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
//@ chunk-agvbmc7h.js:3740-3801 placement = call (0.777)
function storedToolPermissionContext(toolUseContext) {
  return toolUseContext.getAppState().toolPermissionContext;
}
//@ chunk-agvbmc7h.js:3801-4915 placement
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
//@ chunk-agvbmc7h.js:4915-4955 placement
function relaxContextForExecution(toolUseContext, context) {
  return downgradeAutoForPromptShell(
    toolUseContext,
    relaxForRemoteExecution(toolUseContext, downgradeAutoModeForRequest(toolUseContext, context)),
  );
}
//@ chunk-agvbmc7h.js:4955-5130 placement
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
//@ chunk-agvbmc7h.js:5130-5239 placement
function downgradeAutoForPromptShell(toolUseContext, context) {
  if (toolUseContext.forPromptShellCommand !== true || context === undefined) return context;
  return context.mode === "auto" ? withModeAtRequest("default", context) : context;
}
//@ chunk-agvbmc7h.js:5239-5321 placement
function withModeAtRequest(mode, context) {
  return {
    ...context,
    mode,
    modeBeforeRewrite: context.modeBeforeRewrite ?? context.mode,
  };
}
//@ chunk-agvbmc7h.js:5321-5553 placement
function relaxForRemoteExecution(toolUseContext, context) {
  if (toolUseContext.forRemoteExecution !== true || context === undefined) return context;
  let { blockReadsOutsideWorkingDirectories, blockWritesOutsideWorkingDirectories, ...relaxed } = context;
  return context.mode === "acceptEdits" || context.mode === "bypassPermissions"
    ? withModeAtRequest("default", relaxed)
    : relaxed;
}
//@ chunk-agvbmc7h.js:5553-5645 placement = configureEffortParams (0.608)
/**
 * 在权限层列表里取最后一个 kind=effort 的 effort 值（本轮 effort 覆盖）。旧版名 configureEffortParams 为错配。
 */
function getEffortLayerOverride(permissionLayers) {
  let effort;
  if (!permissionLayers) return effort;
  for (let layer of permissionLayers) if (layer.kind === "effort") effort = layer.effort;
  return effort;
}
//@ chunk-agvbmc7h.js:5645-5734 placement
function getEffortValue(toolUseContext) {
  return (
    getEffortLayerOverride(toolUseContext.permissionLayers) ??
    resolveEffortLevel(toolUseContext.getAppState(), getEffectiveMainLoopModel(toolUseContext), {
      withHold: isSessionHoldFor(toolUseContext),
    })
  );
}
//@ chunk-agvbmc7h.js:5734-5881 placement = _temp (0.427)
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
//@ chunk-agvbmc7h.js:5881-5948 placement
function isSessionHoldFor(toolUseContext) {
  return toolUseContext.agentContext === undefined || isMainConversationContext(toolUseContext.agentContext);
}
//@ chunk-agvbmc7h.js:5948-6032 placement
function getEffortSetAsideByHold(toolUseContext) {
  return getEffortValue(toolUseContext) === undefined
    ? resolveEffortLevel(toolUseContext.getAppState(), getEffectiveMainLoopModel(toolUseContext), {
        withHold: false,
      })
    : undefined;
}
//@ chunk-agvbmc7h.js:6032-6160 placement
function getEffectiveMainLoopModel(toolUseContext) {
  let mainLoopModel = toolUseContext.options?.mainLoopModel;
  for (let layer of toolUseContext.permissionLayers ?? [])
    if (layer.kind === "model") mainLoopModel = layer.mainLoopModel;
  return mainLoopModel;
}
//@ chunk-agvbmc7h.js:6160-6213 placement
function getSessionEffort(toolUseContext) {
  return toolUseContext.getAppState().sessionEffort;
}
//@ chunk-agvbmc7h.js:6213-6265 placement
function getMainLoopModel(toolUseContext) {
  return getEffectiveMainLoopModel(toolUseContext) ?? toolUseContext.options.mainLoopModel;
}
//@ chunk-agvbmc7h.js:6265-6416 placement
function getThinkingConfig(toolUseContext) {
  let thinkingConfig = toolUseContext.options.thinkingConfig;
  for (let layer of toolUseContext.permissionLayers ?? [])
    if (layer.kind === "max_thinking_tokens") thinkingConfig = thinkingBudgetConfig(layer.maxThinkingTokens);
  return thinkingConfig;
}
//@ chunk-agvbmc7h.js:6416-6493 placement
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
//@ chunk-agvbmc7h.js:6493-6547 placement = getNestedMemoryAttachments (0.431)
function getUltracodeRequested(toolUseContext) {
  return toolUseContext.getAppState().ultracode === true;
}
//@ chunk-agvbmc7h.js:6547-7009 placement
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
  getEffortLayerOverride,
  applyContextLayers,
  withCommandRuleOverrides,
  planConsentMustDeny,
  consentAskCanReachUser,
  getSessionEffort,
  contextAfterTurn,
  storedToolPermissionContext,
  syncRemoteBrowserCardAnswers,
  getEffortValue,
  getThinkingConfig,
  getEffortSetAsideByHold,
  isSessionHoldFor,
  getHelperEffort,
  getSuppressedClaudeAiConnectors,
  consentMustDeny,
  getUltracodeRequested,
  getRemoteBrowserCardRules,
  canonicalRuleString,
  isPlainModeAtRequest,
  modeAtRequestFor,
  artifactFilesConsentSlugs,
};
