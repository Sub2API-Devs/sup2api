/**
 * utils/model/startupModelResolution.ts
 *
 * 2.1.316 新增：启动时解析主循环模型与权限模式的来源（CLI、代理、设置环境、托管强制、自托管 runner 提示）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-y1dxgk9v.js (19)
 * attribution: placement 19
 */
import { resolveDefaultMainLoopModelSetting } from "./planModeModel.js";
import {
  getEffectiveSettingSource_2,
  getSettingsForSource,
  projectSettingsAliasesUserSettings,
} from "../settings/settings.js";
import { getEnabledSettingSources } from "../settings/constants.js";
import { PERMISSION_MODE_MANUAL_ALIAS } from "../../types/permissions.js";
import { HOt } from "../managedEnvConstants.js";
import { parseUserSpecifiedModel } from "./modelDisplay.js";
import { Lt } from "./modelIds.js";
import { filterPolicyPredicateEnv } from "../managedEnvApply.js";

//@ chunk-y1dxgk9v.js:454-479 placement
function RZt(e) {
  return !1;
}
/**
 * 决定启动模型及来源（默认、强制、允许列表、设置 env、代理继承）。
 */
//@ chunk-y1dxgk9v.js:479-1332 placement
function resolveStartupModel({
  model: model,
  modelCli: modelCli,
  agent: agent,
  agentSelectedByCli: agentSelectedByCli,
  agents: agents,
  effectiveModel: effectiveModel,
  initialMainLoopModel: initialMainLoopModel,
  restrictedModel: restrictedModel,
}) {
  let l = modelCli === "default" || (effectiveModel === void 0 && initialMainLoopModel === null);
  if (
    hasNonPolicyModelAllowlist() &&
    ((restrictedModel !== void 0 && !RZt(restrictedModel)) ||
      (l && (resolveDefaultMainLoopModelSetting().attribution === "enforced" || O())))
  )
    return "allowlist";
  if (l && resolveDefaultMainLoopModelSetting().attribution === "env" && R("ANTHROPIC_DEFAULT_MODEL", model))
    return "settings_env_default";
  let d = isModelNamedInSettingsOverrides(model) ? "remap" : void 0;
  if (modelCli) return d;
  if (effectiveModel !== void 0 && agent?.model && agent.model !== "inherit") {
    let s = getEffectiveSettingSource_2("agent"),
      D = !agentSelectedByCli && (s === null || isApiKeyHelperFromProjectOrLocalSettings(s));
    return g(agent) || D ? "agent" : d;
  }
  if (effectiveModel !== void 0) return d;
  let w =
      !agentSelectedByCli &&
      isApiKeyHelperFromProjectOrLocalSettings(getEffectiveSettingSource_2("agent")) &&
      getEnabledSettingSources().some(
        (s) => !isApiKeyHelperFromProjectOrLocalSettings(s) && getSettingsForSource(s)?.agent !== void 0,
      ),
    b =
      agent !== void 0 &&
      g(agent) &&
      agents.some(
        (s) => s.agentType === agent.agentType && !g(s) && Boolean(s.model) && s.model !== "inherit",
      );
  if (w || b) return "agent";
  if (isSetOnlyByEditableSources("ANTHROPIC_MODEL")) return "settings_env";
  if (!l && process.env.ANTHROPIC_MODEL) return d;
  return isApiKeyHelperFromProjectOrLocalSettings(getEffectiveSettingSource_2("model")) ? "settings" : d;
}
//@ chunk-y1dxgk9v.js:1332-1361 placement
function BTs(e) {
  return e || !1;
}
//@ chunk-y1dxgk9v.js:1361-1960 placement
function describeSelfHostedModeNotice(e) {
  let o = resolvePermissionMode(e),
    t = resolvePermissionMode({ ...e, settingsModeForwardable: !1 }),
    i = o.permissionMode !== t.permissionMode,
    permissionMode = o.permissionMode,
    r = permissionMode === "default" ? PERMISSION_MODE_MANUAL_ALIAS : permissionMode;
  return {
    decision: o,
    isModeFromSettings: i,
    ...(i &&
      permissionMode !== void 0 && {
        noticeOnRunner: {
          level: permissionMode === "plan" ? "warning" : "notice",
          text: `This session runs on a self-hosted runner, where your settings' default permission mode (${r}) doesn't apply. To start in ${r} mode, relaunch with --permission-mode ${r}.`,
          short:
            permissionMode === "plan"
              ? "Type /plan: your default mode doesn't apply on a self-hosted runner."
              : `Your settings' default mode (${r}) doesn't apply on a self-hosted runner.`,
        },
      }),
  };
}
//@ chunk-y1dxgk9v.js:1960-2328 placement
function resolvePermissionMode({
  model: model,
  internal: internal,
  explicitMode: explicitMode,
  droppedMode: droppedMode = !1,
  pinnedDefault: pinnedDefault = !1,
  settingsMode: settingsMode,
  settingsModeForwardable: settingsModeForwardable,
  autoSeedable: autoSeedable,
  storedDefaultBar: storedDefaultBar,
  otherChoiceTyped: otherChoiceTyped,
  carriedPlanHolds: carriedPlanHolds,
  repositoryModel: repositoryModel,
  trustedPlanDisplaced: trustedPlanDisplaced,
  settingsNeverForwarded: settingsNeverForwarded = !1,
}) {
  let S = !droppedMode && (explicitMode === void 0 || (pinnedDefault && explicitMode === "default"));
  return {
    permissionMode: S ? (settingsModeForwardable ? (S ? settingsMode : void 0) : void 0) : explicitMode,
    action: "none",
  };
}
//@ chunk-y1dxgk9v.js:2328-2394 placement
var filtered = HOt.filter((e) => /^ANTHROPIC_DEFAULT_[A-Z]+_MODEL$/.test(e));
/**
 * 模型是否出现在任一设置源的 modelOverrides 值或 ANTHROPIC_DEFAULT_*_MODEL 环境设置中。
 */
//@ chunk-y1dxgk9v.js:2394-2561 placement = applyModelOverrides (1)
function isModelNamedInSettingsOverrides(ms) {
  return f().some((o) => {
    let t = getSettingsForSource(o),
      i = M(o);
    return [
      ...Object.values(t?.modelOverrides ?? {}),
      ...filtered.filter((n) => isSetOnlyByEditableSources(n)).flatMap((n) => y(i, n)),
    ].some((n) => _(n, ms));
  });
}
//@ chunk-y1dxgk9v.js:2561-2633 placement
function R(e, o) {
  return isSetOnlyByEditableSources(e) && f().some((t) => y(M(t), e).some((i) => _(i, o)));
}
//@ chunk-y1dxgk9v.js:2633-2689 placement
function _(e, o) {
  return u(e) === u(o) || u(parseUserSpecifiedModel(e)) === u(parseUserSpecifiedModel(o));
}
//@ chunk-y1dxgk9v.js:2689-2744 placement
function u(e) {
  return Lt(e.trim().toLowerCase()).trim();
}
//@ chunk-y1dxgk9v.js:2744-2837 placement
function O() {
  return getEnabledSettingSources().some(
    (e) => e !== "policySettings" && getSettingsForSource(e)?.enforceAvailableModels === !0,
  );
}
//@ chunk-y1dxgk9v.js:2837-3005 placement
function hasNonPolicyModelAllowlist() {
  return (
    getSettingsForSource("policySettings")?.availableModels === void 0 &&
    f().some((e) => {
      let o = getSettingsForSource(e);
      return o?.availableModels !== void 0 || o?.enforceAvailableModels !== void 0;
    })
  );
}
//@ chunk-y1dxgk9v.js:3005-3094 placement = getEnabledSettingSources (1)
function isSetOnlyByEditableSources(e) {
  return f().some((o) => m(o, e)) && !m("flagSettings", e) && !m("policySettings", e);
}
//@ chunk-y1dxgk9v.js:3094-3136 placement
function m(e, o) {
  return y(M(e), o).length > 0;
}
//@ chunk-y1dxgk9v.js:3136-3174 placement
function M(e) {
  return filterPolicyPredicateEnv(getSettingsForSource(e)?.env, e);
}
//@ chunk-y1dxgk9v.js:3174-3265 placement
function y(e, o) {
  return Object.entries(e)
    .filter(([t]) => t.toUpperCase() === o)
    .map(([, t]) => t);
}
//@ chunk-y1dxgk9v.js:3265-3351 placement
function g(e) {
  return (
    isApiKeyHelperFromProjectOrLocalSettings(e.source) ||
    e.source === "plugin" ||
    e.fromAdditionalDirectory === !0
  );
}
//@ chunk-y1dxgk9v.js:3351-3386 placement
function f() {
  return getEnabledSettingSources().filter(isApiKeyHelperFromProjectOrLocalSettings);
}
//@ chunk-y1dxgk9v.js:3386-3457 placement = isApiKeyHelperFromProjectOrLocalSettings (0.831)
function isApiKeyHelperFromProjectOrLocalSettings(e) {
  return e === "localSettings" || (e === "projectSettings" && !projectSettingsAliasesUserSettings());
}

export { BTs, RZt, describeSelfHostedModeNotice, resolveStartupModel };
