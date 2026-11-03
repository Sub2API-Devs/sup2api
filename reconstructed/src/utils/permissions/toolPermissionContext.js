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
import { resolveEffortLevel, pcr, Ehi } from "../effort.js";
import { isMainConversationContext } from "../agentContext.js";

//@ chunk-agvbmc7h.js:528-675 placement
function addCommandAllowRules(e, o) {
  if (o.length === 0) return e;
  return {
    ...e,
    alwaysAllowRules: { ...e.alwaysAllowRules, command: uniq([...(e.alwaysAllowRules.command || []), ...o]) },
  };
}
//@ chunk-agvbmc7h.js:675-819 placement
function addCommandDenyRules(e, o) {
  if (o.length === 0) return e;
  return {
    ...e,
    alwaysDenyRules: { ...e.alwaysDenyRules, command: uniq([...(e.alwaysDenyRules.command || []), ...o]) },
  };
}
/**
 * 包装 getAppState，在返回的权限上下文里叠加命令级 allow/deny 规则：可整体替换或追加，冻结的命令 deny 优先，轮次禁用工具并入 deny；pollEventDeliveryGuard 时不改 allow。
 */
//@ chunk-agvbmc7h.js:819-1524 placement
function withCommandRuleOverrides(getAppState, allowRules, denyRules, options) {
  if (
    !options?.replaceCommandRules &&
    !options?.replaceDenyRules &&
    options?.frozenCommandDenies === void 0 &&
    allowRules.length === 0 &&
    denyRules.length === 0
  )
    return getAppState;
  return () => {
    let state = getAppState(),
      withAllow =
        state.toolPermissionContext.pollEventDeliveryGuard === !0
          ? state.toolPermissionContext
          : options?.replaceCommandRules
            ? {
                ...state.toolPermissionContext,
                alwaysAllowRules: { ...state.toolPermissionContext.alwaysAllowRules, command: allowRules },
              }
            : addCommandAllowRules(state.toolPermissionContext, allowRules),
      withDeny = options?.replaceDenyRules
        ? {
            ...withAllow,
            alwaysDenyRules: {
              ...withAllow.alwaysDenyRules,
              command: [...denyRules, ...(withAllow.turnDisallowedTools ?? [])],
            },
          }
        : options?.frozenCommandDenies !== void 0
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
    return { ...state, toolPermissionContext: withDeny };
  };
}
//@ chunk-agvbmc7h.js:1524-1632 placement
class ModeAtRequest {
  mode;
  autoClassifierActive;
  constructor(e, o) {
    ((this.mode = e), (this.autoClassifierActive = o));
  }
  toJSON() {
    return;
  }
}
//@ chunk-agvbmc7h.js:1632-1670 placement
function Nmi(e) {
  return new ModeAtRequest(e, isAutoClassifierActive(e));
}
//@ chunk-agvbmc7h.js:1670-1733 placement
function B7o(e) {
  return e instanceof ModeAtRequest && !e.autoClassifierActive;
}
//@ chunk-agvbmc7h.js:1733-1951 placement
function getFallbackModeForRequest(e) {
  if (!B7o(e)) return;
  let mode = e.mode;
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
var R = new Set();
//@ chunk-agvbmc7h.js:1965-1998 placement
function j7o(e) {
  return formatPermissionRule(permissionRuleValueFromString(e));
}
/**
 * 取远程浏览器卡片回答生成的会话规则集合；只在它仍对应当前 session allow 列表时有效。
 */
//@ chunk-agvbmc7h.js:1998-2112 placement
function getRemoteBrowserCardRules(e) {
  let remoteBrowserCardAnswers = e.remoteBrowserCardAnswers;
  return remoteBrowserCardAnswers !== void 0 && remoteBrowserCardAnswers.list === e.alwaysAllowRules.session
    ? remoteBrowserCardAnswers.rules
    : R;
}
/**
 * 会话 allow 列表变化后，重算远程浏览器卡片回答：只保留仍在新列表中的规则，为空时清除。
 */
//@ chunk-agvbmc7h.js:2112-2409 placement
function syncRemoteBrowserCardAnswers(e, o) {
  let session = o.alwaysAllowRules.session;
  if (e.remoteBrowserCardAnswers === void 0 || session === e.alwaysAllowRules.session) return o;
  let r = getRemoteBrowserCardRules(e),
    s = new Set((session ?? []).map(j7o)),
    t = new Set([...r].filter((i) => s.has(i)));
  return {
    ...o,
    remoteBrowserCardAnswers: session === void 0 || t.size === 0 ? void 0 : { rules: t, list: session },
  };
}
//@ chunk-agvbmc7h.js:2742-2903 placement
function contextAfterTurn(e) {
  return {
    ...e,
    abortController: createAbortController(),
    toolUseId: void 0,
    permissionPhase: void 0,
    autoModeClassified: void 0,
    ...!1,
    permissionLayers: launchSnapshotUpdateDialog(e.permissionLayers),
  };
}
//@ chunk-agvbmc7h.js:2903-2982 placement
function getSuppressedClaudeAiConnectors(e) {
  return e.getAppState?.().mcp?.suppressedClaudeAiConnectors ?? [];
}
//@ chunk-agvbmc7h.js:2982-3093 placement
function consentAskCanReachUser(e) {
  let o = getToolPermissionContext(e);
  return o.mode !== "bypassPermissions" && !isPlanBypass(o.mode, o.isBypassPermissionsModeAvailable);
}
//@ chunk-agvbmc7h.js:3093-3153 placement
function planConsentMustDeny(e) {
  if (getToolPermissionContext(e).mode !== "plan") return !1;
  return consentMustDeny(e);
}
//@ chunk-agvbmc7h.js:3153-3192 placement
function artifactFilesConsentSlugs(e) {
  return e.getAppState();
}
//@ chunk-agvbmc7h.js:3192-3261 placement
function consentMustDeny(e) {
  return !consentAskCanReachUser(e) || getToolPermissionContext(e).shouldAvoidPermissionPrompts === !0;
}
//@ chunk-agvbmc7h.js:3261-3331 placement
function w(e) {
  return e === SKILL || e.startsWith(`${SKILL}(`) || e.startsWith(SKILL_2);
}
/**
 * 把 allow 规则中被判定为危险的移入 strippedDangerousRules（按来源去重），并同步远程浏览器卡片回答；无变化返回原上下文。
 */
//@ chunk-agvbmc7h.js:3331-3740 placement
function stripDangerousAllowRules(e) {
  let o = w,
    n = !1,
    r = {},
    s = {};
  for (let [t, i] of Object.entries(e.strippedDangerousRules ?? {})) if (i !== void 0) s[t] = [...i];
  for (let [t, i] of Object.entries(e.alwaysAllowRules)) {
    if (i === void 0) continue;
    let filtered = i.filter((l) => !o(l));
    if (filtered.length !== i.length) {
      n = !0;
      for (let l of i)
        if (o(l)) {
          let c = (s[t] ??= []);
          if (!c.includes(l)) c.push(l);
        }
    }
    r[t] = filtered;
  }
  if (!n) return e;
  return syncRemoteBrowserCardAnswers(e, { ...e, alwaysAllowRules: r, strippedDangerousRules: s });
}
//@ chunk-agvbmc7h.js:3740-3801 placement = call (0.777)
function storedToolPermissionContext(e) {
  return e.getAppState().toolPermissionContext;
}
//@ chunk-agvbmc7h.js:3801-4915 placement
function getToolPermissionContext(e) {
  let toolPermissionContext = e.getAppState().toolPermissionContext,
    n = toolPermissionContext !== void 0 && toolPermissionContext.pollEventDeliveryGuard === !0;
  if (n) toolPermissionContext = stripDangerousAllowRules(toolPermissionContext);
  let permissionLayers = e.permissionLayers;
  if (!permissionLayers) return y(e, toolPermissionContext);
  let last = permissionLayers.findLast((t) => t.kind === "working_directory");
  for (let t of permissionLayers)
    switch (t.kind) {
      case "allowed_tools":
        if (!n) toolPermissionContext = addCommandAllowRules(toolPermissionContext, [...t.allowedTools]);
        break;
      case "disallowed_tools":
        toolPermissionContext = addCommandDenyRules(toolPermissionContext, [...t.disallowedTools]);
        break;
      case "bash_command_clamp":
        toolPermissionContext = {
          ...toolPermissionContext,
          bashCommandClamps: [...(toolPermissionContext.bashCommandClamps ?? []), t.rules],
        };
        break;
      case "avoid_prompts":
        if (!toolPermissionContext.shouldAvoidPermissionPrompts)
          toolPermissionContext = { ...toolPermissionContext, shouldAvoidPermissionPrompts: !0 };
        break;
      case "sandbox_auto_allow_suspended":
        if (!toolPermissionContext.sandboxAutoAllowSuspended)
          toolPermissionContext = { ...toolPermissionContext, sandboxAutoAllowSuspended: !0 };
        break;
      case "permission_mode": {
        if (
          t.mode === "bypassPermissions" &&
          (isBypassPermissionsModeDisabled() || !toolPermissionContext.isBypassPermissionsModeAvailable)
        )
          break;
        toolPermissionContext = { ...toolPermissionContext, mode: t.mode };
        break;
      }
      case "working_directory":
        if (t === last && !toolPermissionContext.additionalWorkingDirectories.has(t.directory))
          toolPermissionContext = {
            ...toolPermissionContext,
            additionalWorkingDirectories: new Map([
              ...toolPermissionContext.additionalWorkingDirectories,
              [t.directory, { path: t.directory, source: "session" }],
            ]),
          };
        break;
      case "effort":
      case "model":
      case "max_thinking_tokens":
      case "flag_settings":
        break;
    }
  return y(e, toolPermissionContext);
}
//@ chunk-agvbmc7h.js:4915-4955 placement
function y(e, o) {
  return downgradeAutoForPromptShell(e, relaxForRemoteExecution(e, downgradeAutoModeForRequest(e, o)));
}
//@ chunk-agvbmc7h.js:4955-5130 placement
function downgradeAutoModeForRequest(e, o) {
  if (o === void 0 || o.mode !== "auto" || e.forPromptShellCommand === !0 || e.forRemoteExecution === !0)
    return o;
  let n = getFallbackModeForRequest(e.permissionModeAtRequest);
  return n === void 0 ? o : m(n, o);
}
//@ chunk-agvbmc7h.js:5130-5239 placement
function downgradeAutoForPromptShell(e, o) {
  if (e.forPromptShellCommand !== !0 || o === void 0) return o;
  return o.mode === "auto" ? m("default", o) : o;
}
//@ chunk-agvbmc7h.js:5239-5321 placement
function m(e, o) {
  return { ...o, mode: e, modeBeforeRewrite: o.modeBeforeRewrite ?? o.mode };
}
//@ chunk-agvbmc7h.js:5321-5553 placement
function relaxForRemoteExecution(e, o) {
  if (e.forRemoteExecution !== !0 || o === void 0) return o;
  let {
    blockReadsOutsideWorkingDirectories: blockReadsOutsideWorkingDirectories,
    blockWritesOutsideWorkingDirectories: blockWritesOutsideWorkingDirectories,
    ...s
  } = o;
  return o.mode === "acceptEdits" || o.mode === "bypassPermissions" ? m("default", s) : s;
}
/**
 * 在权限层列表里取最后一个 kind=effort 的 effort 值（本轮 effort 覆盖）。旧版名 configureEffortParams 为错配。
 */
//@ chunk-agvbmc7h.js:5553-5645 placement = configureEffortParams (0.608)
function getEffortLayerOverride(e) {
  let o;
  if (!e) return o;
  for (let n of e) if (n.kind === "effort") o = n.effort;
  return o;
}
//@ chunk-agvbmc7h.js:5645-5734 placement
function getEffortValue(e) {
  return (
    getEffortLayerOverride(e.permissionLayers) ??
    resolveEffortLevel(e.getAppState(), getEffectiveMainLoopModel(e), { withHold: isSessionHoldFor(e) })
  );
}
//@ chunk-agvbmc7h.js:5734-5881 placement = _temp (0.427)
function getHelperEffort(e, o) {
  return pcr(o, getMainLoopModel(e))
    ? { effortValue: getEffortValue(e), turnEffort: getEffortLayerOverride(e.permissionLayers) }
    : { effortValue: Ehi(e.getAppState(), o), turnEffort: void 0 };
}
//@ chunk-agvbmc7h.js:5881-5948 placement
function isSessionHoldFor(e) {
  return e.agentContext === void 0 || isMainConversationContext(e.agentContext);
}
//@ chunk-agvbmc7h.js:5948-6032 placement
function getEffortSetAsideByHold(e) {
  return getEffortValue(e) === void 0
    ? resolveEffortLevel(e.getAppState(), getEffectiveMainLoopModel(e), { withHold: !1 })
    : void 0;
}
//@ chunk-agvbmc7h.js:6032-6160 placement
function getEffectiveMainLoopModel(e) {
  let o = e.options?.mainLoopModel;
  for (let n of e.permissionLayers ?? []) if (n.kind === "model") o = n.mainLoopModel;
  return o;
}
//@ chunk-agvbmc7h.js:6160-6213 placement
function getSessionEffort(e) {
  return e.getAppState().sessionEffort;
}
//@ chunk-agvbmc7h.js:6213-6265 placement
function getMainLoopModel(e) {
  return getEffectiveMainLoopModel(e) ?? e.options.mainLoopModel;
}
//@ chunk-agvbmc7h.js:6265-6416 placement
function getThinkingConfig(e) {
  let thinkingConfig = e.options.thinkingConfig;
  for (let n of e.permissionLayers ?? [])
    if (n.kind === "max_thinking_tokens") thinkingConfig = C(n.maxThinkingTokens);
  return thinkingConfig;
}
//@ chunk-agvbmc7h.js:6416-6493 placement
function C(e) {
  return e === 0 ? { type: "disabled" } : { type: "enabled", budgetTokens: e };
}
//@ chunk-agvbmc7h.js:6493-6547 placement = getNestedMemoryAttachments (0.431)
function getUltracodeRequested(toolUseContext) {
  return toolUseContext.getAppState().ultracode === !0;
}
//@ chunk-agvbmc7h.js:6547-7009 placement
function applyContextLayers(e, o) {
  if (o.length === 0) return e;
  let n = e.permissionLayers ? [...e.permissionLayers, ...o] : [...o],
    r;
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
      s = C(a.maxThinkingTokens);
      break;
    }
  }
  return {
    ...e,
    permissionLayers: n,
    ...((r !== void 0 || s !== void 0) && {
      options: {
        ...e.options,
        ...(r !== void 0 && { mainLoopModel: r }),
        ...(s !== void 0 && { thinkingConfig: s }),
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
  j7o,
  B7o,
  Nmi,
  artifactFilesConsentSlugs,
};
