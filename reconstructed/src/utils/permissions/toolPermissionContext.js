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

//@ chunk-agvbmc7h.js:528-675 placement
function addCommandAllowRules(toolPermissionContext, o) {
  if (o.length === 0) return toolPermissionContext;
  return {
    ...toolPermissionContext,
    alwaysAllowRules: {
      ...toolPermissionContext.alwaysAllowRules,
      command: uniq([...(toolPermissionContext.alwaysAllowRules.command || []), ...o]),
    },
  };
}
//@ chunk-agvbmc7h.js:675-819 placement
function addCommandDenyRules(e, o) {
  if (o.length === 0) return e;
  return {
    ...e,
    alwaysDenyRules: {
      ...e.alwaysDenyRules,
      command: uniq([...(e.alwaysDenyRules.command || []), ...o]),
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
function isPlainModeAtRequest(e) {
  return e instanceof ModeAtRequest && !e.autoClassifierActive;
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
      let n = mode;
      return;
    }
  }
}
//@ chunk-agvbmc7h.js:1951-1965 placement
var EMPTY_RULE_SET = new Set();
//@ chunk-agvbmc7h.js:1965-1998 placement
/**
 * canonicalRuleString：规则的规范字符串。
 */
function canonicalRuleString(e) {
  return formatPermissionRule(permissionRuleValueFromString(e));
}
//@ chunk-agvbmc7h.js:1998-2112 placement
/**
 * 取远程浏览器卡片回答生成的会话规则集合；只在它仍对应当前 session allow 列表时有效。
 */
function getRemoteBrowserCardRules(e) {
  let remoteBrowserCardAnswers = e.remoteBrowserCardAnswers;
  return remoteBrowserCardAnswers !== undefined &&
    remoteBrowserCardAnswers.list === e.alwaysAllowRules.session
    ? remoteBrowserCardAnswers.rules
    : EMPTY_RULE_SET;
}
//@ chunk-agvbmc7h.js:2112-2409 placement
/**
 * 会话 allow 列表变化后，重算远程浏览器卡片回答：只保留仍在新列表中的规则，为空时清除。
 */
function syncRemoteBrowserCardAnswers(e, o) {
  let session = o.alwaysAllowRules.session;
  if (e.remoteBrowserCardAnswers === undefined || session === e.alwaysAllowRules.session) return o;
  let remoteBrowserCardRules = getRemoteBrowserCardRules(e);
  let s = new Set((session ?? []).map(canonicalRuleString));
  let t = new Set(
    [...remoteBrowserCardRules].filter((remoteBrowserCardRule) => s.has(remoteBrowserCardRule)),
  );
  return {
    ...o,
    remoteBrowserCardAnswers:
      session === undefined || t.size === 0
        ? undefined
        : {
            rules: t,
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
function getSuppressedClaudeAiConnectors(e) {
  return e.getAppState?.().mcp?.suppressedClaudeAiConnectors ?? [];
}
//@ chunk-agvbmc7h.js:2982-3093 placement
function consentAskCanReachUser(e) {
  let toolPermissionContext = getToolPermissionContext(e);
  return (
    toolPermissionContext.mode !== "bypassPermissions" &&
    !isPlanBypass(toolPermissionContext.mode, toolPermissionContext.isBypassPermissionsModeAvailable)
  );
}
//@ chunk-agvbmc7h.js:3093-3153 placement
function planConsentMustDeny(e) {
  if (getToolPermissionContext(e).mode !== "plan") return false;
  return consentMustDeny(e);
}
//@ chunk-agvbmc7h.js:3153-3192 placement
function artifactFilesConsentSlugs(e) {
  return e.getAppState();
}
//@ chunk-agvbmc7h.js:3192-3261 placement
function consentMustDeny(e) {
  return !consentAskCanReachUser(e) || getToolPermissionContext(e).shouldAvoidPermissionPrompts === true;
}
//@ chunk-agvbmc7h.js:3261-3331 placement
function isSkillRule(e) {
  return e === SKILL || e.startsWith(`${SKILL}(`) || e.startsWith(SKILL_2);
}
//@ chunk-agvbmc7h.js:3331-3740 placement
/**
 * 把 allow 规则中被判定为危险的移入 strippedDangerousRules（按来源去重），并同步远程浏览器卡片回答；无变化返回原上下文。
 */
function stripDangerousAllowRules(toolPermissionContext) {
  let o = isSkillRule;
  let n = false;
  let r = {};
  let s = {};
  for (let [key, value] of Object.entries(toolPermissionContext.strippedDangerousRules ?? {}))
    if (value !== undefined) s[key] = [...value];
  for (let [key, value] of Object.entries(toolPermissionContext.alwaysAllowRules)) {
    if (value === undefined) continue;
    let filtered = value.filter((l) => !o(l));
    if (filtered.length !== value.length) {
      n = true;
      for (let l of value)
        if (o(l)) {
          let c = (s[key] ??= []);
          if (!c.includes(l)) c.push(l);
        }
    }
    r[key] = filtered;
  }
  if (!n) return toolPermissionContext;
  return syncRemoteBrowserCardAnswers(toolPermissionContext, {
    ...toolPermissionContext,
    alwaysAllowRules: r,
    strippedDangerousRules: s,
  });
}
//@ chunk-agvbmc7h.js:3740-3801 placement = call (0.777)
function storedToolPermissionContext(toolUseContext) {
  return toolUseContext.getAppState().toolPermissionContext;
}
//@ chunk-agvbmc7h.js:3801-4915 placement
function getToolPermissionContext(e) {
  let toolPermissionContext = e.getAppState().toolPermissionContext;
  let n = toolPermissionContext !== undefined && toolPermissionContext.pollEventDeliveryGuard === true;
  if (n) toolPermissionContext = stripDangerousAllowRules(toolPermissionContext);
  let permissionLayers = e.permissionLayers;
  if (!permissionLayers) return relaxContextForExecution(e, toolPermissionContext);
  let last = permissionLayers.findLast((permissionLayer) => permissionLayer.kind === "working_directory");
  for (let permissionLayer of permissionLayers)
    switch (permissionLayer.kind) {
      case "allowed_tools":
        if (!n)
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
  return relaxContextForExecution(e, toolPermissionContext);
}
//@ chunk-agvbmc7h.js:4915-4955 placement
function relaxContextForExecution(e, toolPermissionContext) {
  return downgradeAutoForPromptShell(
    e,
    relaxForRemoteExecution(e, downgradeAutoModeForRequest(e, toolPermissionContext)),
  );
}
//@ chunk-agvbmc7h.js:4955-5130 placement
function downgradeAutoModeForRequest(e, o) {
  if (
    o === undefined ||
    o.mode !== "auto" ||
    e.forPromptShellCommand === true ||
    e.forRemoteExecution === true
  )
    return o;
  let mode = getFallbackModeForRequest(e.permissionModeAtRequest);
  return mode === undefined ? o : withModeAtRequest(mode, o);
}
//@ chunk-agvbmc7h.js:5130-5239 placement
function downgradeAutoForPromptShell(e, o) {
  if (e.forPromptShellCommand !== true || o === undefined) return o;
  return o.mode === "auto" ? withModeAtRequest("default", o) : o;
}
//@ chunk-agvbmc7h.js:5239-5321 placement
function withModeAtRequest(mode, o) {
  return {
    ...o,
    mode,
    modeBeforeRewrite: o.modeBeforeRewrite ?? o.mode,
  };
}
//@ chunk-agvbmc7h.js:5321-5553 placement
function relaxForRemoteExecution(e, o) {
  if (e.forRemoteExecution !== true || o === undefined) return o;
  let { blockReadsOutsideWorkingDirectories, blockWritesOutsideWorkingDirectories, ...s } = o;
  return o.mode === "acceptEdits" || o.mode === "bypassPermissions" ? withModeAtRequest("default", s) : s;
}
//@ chunk-agvbmc7h.js:5553-5645 placement = configureEffortParams (0.608)
/**
 * 在权限层列表里取最后一个 kind=effort 的 effort 值（本轮 effort 覆盖）。旧版名 configureEffortParams 为错配。
 */
function getEffortLayerOverride(permissionLayers) {
  let o;
  if (!permissionLayers) return o;
  for (let n of permissionLayers) if (n.kind === "effort") o = n.effort;
  return o;
}
//@ chunk-agvbmc7h.js:5645-5734 placement
function getEffortValue(e) {
  return (
    getEffortLayerOverride(e.permissionLayers) ??
    resolveEffortLevel(e.getAppState(), getEffectiveMainLoopModel(e), {
      withHold: isSessionHoldFor(e),
    })
  );
}
//@ chunk-agvbmc7h.js:5734-5881 placement = _temp (0.427)
function getHelperEffort(e, o) {
  return isSameModelSettings(o, getMainLoopModel(e))
    ? {
        effortValue: getEffortValue(e),
        turnEffort: getEffortLayerOverride(e.permissionLayers),
      }
    : {
        effortValue: resolveEffortWithoutHold(e.getAppState(), o),
        turnEffort: undefined,
      };
}
//@ chunk-agvbmc7h.js:5881-5948 placement
function isSessionHoldFor(e) {
  return e.agentContext === undefined || isMainConversationContext(e.agentContext);
}
//@ chunk-agvbmc7h.js:5948-6032 placement
function getEffortSetAsideByHold(e) {
  return getEffortValue(e) === undefined
    ? resolveEffortLevel(e.getAppState(), getEffectiveMainLoopModel(e), {
        withHold: false,
      })
    : undefined;
}
//@ chunk-agvbmc7h.js:6032-6160 placement
function getEffectiveMainLoopModel(e) {
  let mainLoopModel = e.options?.mainLoopModel;
  for (let n of e.permissionLayers ?? []) if (n.kind === "model") mainLoopModel = n.mainLoopModel;
  return mainLoopModel;
}
//@ chunk-agvbmc7h.js:6160-6213 placement
function getSessionEffort(context) {
  return context.getAppState().sessionEffort;
}
//@ chunk-agvbmc7h.js:6213-6265 placement
function getMainLoopModel(e) {
  return getEffectiveMainLoopModel(e) ?? e.options.mainLoopModel;
}
//@ chunk-agvbmc7h.js:6265-6416 placement
function getThinkingConfig(e) {
  let thinkingConfig = e.options.thinkingConfig;
  for (let n of e.permissionLayers ?? [])
    if (n.kind === "max_thinking_tokens") thinkingConfig = thinkingBudgetConfig(n.maxThinkingTokens);
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
function applyContextLayers(e, o) {
  if (o.length === 0) return e;
  let permissionLayers = e.permissionLayers ? [...e.permissionLayers, ...o] : [...o];
  let r;
  for (let i = o.length - 1; i >= 0; i--) {
    let a = o[i];
    if (a.kind === "model") {
      r = a.mainLoopModel;
      break;
    }
  }
  let s;
  for (let i = o.length - 1; i >= 0; i--) {
    let a = o[i];
    if (a.kind === "max_thinking_tokens") {
      s = thinkingBudgetConfig(a.maxThinkingTokens);
      break;
    }
  }
  return {
    ...e,
    permissionLayers,
    ...((r !== undefined || s !== undefined) && {
      options: {
        ...e.options,
        ...(r !== undefined && {
          mainLoopModel: r,
        }),
        ...(s !== undefined && {
          thinkingConfig: s,
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
