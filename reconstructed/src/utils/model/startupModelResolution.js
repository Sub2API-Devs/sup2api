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
import { MODEL_SELECTION_ENV_VARS } from "../managedEnvConstants.js";
import { parseUserSpecifiedModel } from "./modelDisplay.js";
import { strip1mSuffix } from "./modelIds.js";
import { filterPolicyPredicateEnv } from "../managedEnvApply.js";

//@ chunk-y1dxgk9v.js:454-479 placement
/**
 * 恒返回 false（受限模型始终不允许）。
 */
function isRestrictedModelAllowed(e) {
  return false;
}
//@ chunk-y1dxgk9v.js:479-1332 placement
/**
 * 决定启动模型及来源（默认、强制、允许列表、设置 env、代理继承）。
 */
function resolveStartupModel({
  model,
  modelCli,
  agent,
  agentSelectedByCli,
  agents,
  effectiveModel,
  initialMainLoopModel,
  restrictedModel,
}) {
  let l = modelCli === "default" || (effectiveModel === undefined && initialMainLoopModel === null);
  if (
    hasNonPolicyModelAllowlist() &&
    ((restrictedModel !== undefined && !isRestrictedModelAllowed(restrictedModel)) ||
      (l &&
        (resolveDefaultMainLoopModelSetting().attribution === "enforced" ||
          hasNonPolicyEnforceAvailableModels())))
  )
    return "allowlist";
  if (
    l &&
    resolveDefaultMainLoopModelSetting().attribution === "env" &&
    isModelFromEditableSources("ANTHROPIC_DEFAULT_MODEL", model)
  )
    return "settings_env_default";
  let d = isModelNamedInSettingsOverrides(model) ? "remap" : undefined;
  if (modelCli) return d;
  if (effectiveModel !== undefined && agent?.model && agent.model !== "inherit") {
    let effectiveSettingSource = getEffectiveSettingSource_2("agent");
    let D =
      !agentSelectedByCli &&
      (effectiveSettingSource === null || isApiKeyHelperFromProjectOrLocalSettings(effectiveSettingSource));
    return isProjectOrDefaultedAgentSource(agent) || D ? "agent" : d;
  }
  if (effectiveModel !== undefined) return d;
  let w =
    !agentSelectedByCli &&
    isApiKeyHelperFromProjectOrLocalSettings(getEffectiveSettingSource_2("agent")) &&
    getEnabledSettingSources().some(
      (s) => !isApiKeyHelperFromProjectOrLocalSettings(s) && getSettingsForSource(s)?.agent !== undefined,
    );
  let b =
    agent !== undefined &&
    isProjectOrDefaultedAgentSource(agent) &&
    agents.some(
      (agent_2) =>
        agent_2.agentType === agent.agentType &&
        !isProjectOrDefaultedAgentSource(agent_2) &&
        Boolean(agent_2.model) &&
        agent_2.model !== "inherit",
    );
  if (w || b) return "agent";
  if (isSetOnlyByEditableSources("ANTHROPIC_MODEL")) return "settings_env";
  if (!l && process.env.ANTHROPIC_MODEL) return d;
  return isApiKeyHelperFromProjectOrLocalSettings(getEffectiveSettingSource_2("model")) ? "settings" : d;
}
//@ chunk-y1dxgk9v.js:1332-1361 placement
/**
 * 把值转成布尔（假值转 false）。
 */
function boolFromMaybe(e) {
  return e || false;
}
//@ chunk-y1dxgk9v.js:1361-1960 placement
function describeSelfHostedModeNotice(e) {
  let permissionMode = resolvePermissionMode(e);
  let permissionMode_2 = resolvePermissionMode({
    ...e,
    settingsModeForwardable: false,
  });
  let i = permissionMode.permissionMode !== permissionMode_2.permissionMode;
  let permissionMode_3 = permissionMode.permissionMode;
  let r = permissionMode_3 === "default" ? PERMISSION_MODE_MANUAL_ALIAS : permissionMode_3;
  return {
    decision: permissionMode,
    isModeFromSettings: i,
    ...(i &&
      permissionMode_3 !== undefined && {
        noticeOnRunner: {
          level: permissionMode_3 === "plan" ? "warning" : "notice",
          text: `This session runs on a self-hosted runner, where your settings' default permission mode (${r}) doesn't apply. To start in ${r} mode, relaunch with --permission-mode ${r}.`,
          short:
            permissionMode_3 === "plan"
              ? "Type /plan: your default mode doesn't apply on a self-hosted runner."
              : `Your settings' default mode (${r}) doesn't apply on a self-hosted runner.`,
        },
      }),
  };
}
//@ chunk-y1dxgk9v.js:1960-2328 placement
function resolvePermissionMode({
  model,
  internal,
  explicitMode,
  droppedMode = false,
  pinnedDefault = false,
  settingsMode,
  settingsModeForwardable,
  autoSeedable,
  storedDefaultBar,
  otherChoiceTyped,
  carriedPlanHolds,
  repositoryModel,
  trustedPlanDisplaced,
  settingsNeverForwarded = false,
}) {
  let S = !droppedMode && (explicitMode === undefined || (pinnedDefault && explicitMode === "default"));
  return {
    permissionMode: S ? (settingsModeForwardable ? (S ? settingsMode : undefined) : undefined) : explicitMode,
    action: "none",
  };
}
//@ chunk-y1dxgk9v.js:2328-2394 placement
var filtered = MODEL_SELECTION_ENV_VARS.filter((e) => /^ANTHROPIC_DEFAULT_[A-Z]+_MODEL$/.test(e));
//@ chunk-y1dxgk9v.js:2394-2561 placement = applyModelOverrides (1)
/**
 * 模型是否出现在任一设置源的 modelOverrides 值或 ANTHROPIC_DEFAULT_*_MODEL 环境设置中。
 */
function isModelNamedInSettingsOverrides(ms) {
  return projectLocalSources().some((o) => {
    let settingsForSource = getSettingsForSource(o);
    let i = policyFilteredSettingsEnv(o);
    return [
      ...Object.values(settingsForSource?.modelOverrides ?? {}),
      ...filtered.filter((n) => isSetOnlyByEditableSources(n)).flatMap((n) => envValuesForName(i, n)),
    ].some((n) => _(n, ms));
  });
}
//@ chunk-y1dxgk9v.js:2561-2633 placement
function isModelFromEditableSources(e, model) {
  return (
    isSetOnlyByEditableSources(e) &&
    projectLocalSources().some((t) =>
      envValuesForName(policyFilteredSettingsEnv(t), e).some((i) => _(i, model)),
    )
  );
}
//@ chunk-y1dxgk9v.js:2633-2689 placement
function _(e, o) {
  return (
    normalizeModelKey(e) === normalizeModelKey(o) ||
    normalizeModelKey(parseUserSpecifiedModel(e)) === normalizeModelKey(parseUserSpecifiedModel(o))
  );
}
//@ chunk-y1dxgk9v.js:2689-2744 placement
function normalizeModelKey(userSpecifiedModel) {
  return strip1mSuffix(userSpecifiedModel.trim().toLowerCase()).trim();
}
//@ chunk-y1dxgk9v.js:2744-2837 placement
function hasNonPolicyEnforceAvailableModels() {
  return getEnabledSettingSources().some(
    (e) => e !== "policySettings" && getSettingsForSource(e)?.enforceAvailableModels === true,
  );
}
//@ chunk-y1dxgk9v.js:2837-3005 placement
function hasNonPolicyModelAllowlist() {
  return (
    getSettingsForSource("policySettings")?.availableModels === undefined &&
    projectLocalSources().some((e) => {
      let settingsForSource = getSettingsForSource(e);
      return (
        settingsForSource?.availableModels !== undefined ||
        settingsForSource?.enforceAvailableModels !== undefined
      );
    })
  );
}
//@ chunk-y1dxgk9v.js:3005-3094 placement = getEnabledSettingSources (1)
function isSetOnlyByEditableSources(e) {
  return (
    projectLocalSources().some((o) => isModelInSourceEnv(o, e)) &&
    !isModelInSourceEnv("flagSettings", e) &&
    !isModelInSourceEnv("policySettings", e)
  );
}
//@ chunk-y1dxgk9v.js:3094-3136 placement
function isModelInSourceEnv(e, o) {
  return envValuesForName(policyFilteredSettingsEnv(e), o).length > 0;
}
//@ chunk-y1dxgk9v.js:3136-3174 placement
function policyFilteredSettingsEnv(e) {
  return filterPolicyPredicateEnv(getSettingsForSource(e)?.env, e);
}
//@ chunk-y1dxgk9v.js:3174-3265 placement
function envValuesForName(e, o) {
  return Object.entries(e)
    .filter(([key]) => key.toUpperCase() === o)
    .map(([, value]) => value);
}
//@ chunk-y1dxgk9v.js:3265-3351 placement
function isProjectOrDefaultedAgentSource(agent) {
  return (
    isApiKeyHelperFromProjectOrLocalSettings(agent.source) ||
    agent.source === "plugin" ||
    agent.fromAdditionalDirectory === true
  );
}
//@ chunk-y1dxgk9v.js:3351-3386 placement
function projectLocalSources() {
  return getEnabledSettingSources().filter(isApiKeyHelperFromProjectOrLocalSettings);
}
//@ chunk-y1dxgk9v.js:3386-3457 placement = isApiKeyHelperFromProjectOrLocalSettings (0.831)
function isApiKeyHelperFromProjectOrLocalSettings(effectiveSettingSource) {
  return (
    effectiveSettingSource === "localSettings" ||
    (effectiveSettingSource === "projectSettings" && !projectSettingsAliasesUserSettings())
  );
}
export { boolFromMaybe, isRestrictedModelAllowed, describeSelfHostedModeNotice, resolveStartupModel };
