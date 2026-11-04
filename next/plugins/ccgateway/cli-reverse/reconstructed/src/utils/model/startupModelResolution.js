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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-y1dxgk9v.js:454-479 placement
/**
 * 恒返回 false（受限模型始终不允许）。
 */
function isRestrictedModelAllowed(model) {
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
  let isModelFromDefault =
    modelCli === "default" || (effectiveModel === undefined && initialMainLoopModel === null);
  if (
    hasNonPolicyModelAllowlist() &&
    ((restrictedModel !== undefined && !isRestrictedModelAllowed(restrictedModel)) ||
      (isModelFromDefault &&
        (resolveDefaultMainLoopModelSetting().attribution === "enforced" ||
          hasNonPolicyEnforceAvailableModels())))
  )
    return "allowlist";
  if (
    isModelFromDefault &&
    resolveDefaultMainLoopModelSetting().attribution === "env" &&
    isModelFromEditableSources("ANTHROPIC_DEFAULT_MODEL", model)
  )
    return "settings_env_default";
  let isRemapped = isModelNamedInSettingsOverrides(model) ? "remap" : undefined;
  if (modelCli) return isRemapped;
  if (effectiveModel !== undefined && agent?.model && agent.model !== "inherit") {
    let effectiveSettingSource = getEffectiveSettingSource_2("agent");
    let isAgentSourceDowngraded =
      !agentSelectedByCli &&
      (effectiveSettingSource === null || isApiKeyHelperFromProjectOrLocalSettings(effectiveSettingSource));
    return isProjectOrDefaultedAgentSource(agent) || isAgentSourceDowngraded ? "agent" : isRemapped;
  }
  if (effectiveModel !== undefined) return isRemapped;
  let hasBetterAgentSource =
    !agentSelectedByCli &&
    isApiKeyHelperFromProjectOrLocalSettings(getEffectiveSettingSource_2("agent")) &&
    getEnabledSettingSources().some(
      (source) =>
        !isApiKeyHelperFromProjectOrLocalSettings(source) &&
        getSettingsForSource(source)?.agent !== undefined,
    );
  let hasNonDroppedAgentModel =
    agent !== undefined &&
    isProjectOrDefaultedAgentSource(agent) &&
    agents.some(
      (agent_2) =>
        agent_2.agentType === agent.agentType &&
        !isProjectOrDefaultedAgentSource(agent_2) &&
        Boolean(agent_2.model) &&
        agent_2.model !== "inherit",
    );
  if (hasBetterAgentSource || hasNonDroppedAgentModel) return "agent";
  if (isSetOnlyByEditableSources("ANTHROPIC_MODEL")) return "settings_env";
  if (!isModelFromDefault && process.env.ANTHROPIC_MODEL) return isRemapped;
  return isApiKeyHelperFromProjectOrLocalSettings(getEffectiveSettingSource_2("model"))
    ? "settings"
    : isRemapped;
}
//@ chunk-y1dxgk9v.js:1332-1361 placement
/**
 * 把值转成布尔（假值转 false）。
 */
function boolFromMaybe(value) {
  return value || false;
}
//@ chunk-y1dxgk9v.js:1361-1960 placement
function describeSelfHostedModeNotice(options) {
  let permissionMode = resolvePermissionMode(options);
  let permissionMode_2 = resolvePermissionMode({
    ...options,
    settingsModeForwardable: false,
  });
  let isModeFromSettings = permissionMode.permissionMode !== permissionMode_2.permissionMode;
  let permissionMode_3 = permissionMode.permissionMode;
  let displayMode = permissionMode_3 === "default" ? PERMISSION_MODE_MANUAL_ALIAS : permissionMode_3;
  return {
    decision: permissionMode,
    isModeFromSettings,
    ...(isModeFromSettings &&
      permissionMode_3 !== undefined && {
        noticeOnRunner: {
          level: permissionMode_3 === "plan" ? "warning" : "notice",
          text: `This session runs on a self-hosted runner, where your settings' default permission mode (${displayMode}) doesn't apply. To start in ${displayMode} mode, relaunch with --permission-mode ${displayMode}.`,
          short:
            permissionMode_3 === "plan"
              ? "Type /plan: your default mode doesn't apply on a self-hosted runner."
              : `Your settings' default mode (${displayMode}) doesn't apply on a self-hosted runner.`,
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
  let useSettingsMode =
    !droppedMode && (explicitMode === undefined || (pinnedDefault && explicitMode === "default"));
  return {
    permissionMode: useSettingsMode
      ? settingsModeForwardable
        ? useSettingsMode
          ? settingsMode
          : undefined
        : undefined
      : explicitMode,
    action: "none",
  };
}
//@ chunk-y1dxgk9v.js:2328-2394 placement
var filtered; // deferred: uses ARTIFACT_PROVIDER_ENV_VARS (../managedEnvConstants.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-y1dxgk9v.js:2328", () => {
  filtered = MODEL_SELECTION_ENV_VARS.filter((envName) => /^ANTHROPIC_DEFAULT_[A-Z]+_MODEL$/.test(envName));
});
//@ chunk-y1dxgk9v.js:2394-2561 placement (2.1.88 match: applyModelOverrides, 1)
/**
 * 模型是否出现在任一设置源的 modelOverrides 值或 ANTHROPIC_DEFAULT_*_MODEL 环境设置中。
 */
function isModelNamedInSettingsOverrides(ms) {
  return projectLocalSources().some((source) => {
    let settingsForSource = getSettingsForSource(source);
    let filteredEnv = policyFilteredSettingsEnv(source);
    return [
      ...Object.values(settingsForSource?.modelOverrides ?? {}),
      ...filtered
        .filter((envName) => isSetOnlyByEditableSources(envName))
        .flatMap((envName) => envValuesForName(filteredEnv, envName)),
    ].some((modelId) => isSameModel(modelId, ms));
  });
}
//@ chunk-y1dxgk9v.js:2561-2633 placement
function isModelFromEditableSources(envName, modelB) {
  return (
    isSetOnlyByEditableSources(envName) &&
    projectLocalSources().some((sourceName) =>
      envValuesForName(policyFilteredSettingsEnv(sourceName), envName).some((modelId) =>
        isSameModel(modelId, modelB),
      ),
    )
  );
}
//@ chunk-y1dxgk9v.js:2633-2689 placement
function isSameModel(modelA, modelB) {
  return (
    normalizeModelKey(modelA) === normalizeModelKey(modelB) ||
    normalizeModelKey(parseUserSpecifiedModel(modelA)) === normalizeModelKey(parseUserSpecifiedModel(modelB))
  );
}
//@ chunk-y1dxgk9v.js:2689-2744 placement
function normalizeModelKey(modelName) {
  return strip1mSuffix(modelName.trim().toLowerCase()).trim();
}
//@ chunk-y1dxgk9v.js:2744-2837 placement
function hasNonPolicyEnforceAvailableModels() {
  return getEnabledSettingSources().some(
    (sourceName) =>
      sourceName !== "policySettings" && getSettingsForSource(sourceName)?.enforceAvailableModels === true,
  );
}
//@ chunk-y1dxgk9v.js:2837-3005 placement
function hasNonPolicyModelAllowlist() {
  return (
    getSettingsForSource("policySettings")?.availableModels === undefined &&
    projectLocalSources().some((sourceName) => {
      let settingsForSource = getSettingsForSource(sourceName);
      return (
        settingsForSource?.availableModels !== undefined ||
        settingsForSource?.enforceAvailableModels !== undefined
      );
    })
  );
}
//@ chunk-y1dxgk9v.js:3005-3094 placement (2.1.88 match: getEnabledSettingSources, 1)
function isSetOnlyByEditableSources(envName) {
  return (
    projectLocalSources().some((sourceName) => isModelInSourceEnv(sourceName, envName)) &&
    !isModelInSourceEnv("flagSettings", envName) &&
    !isModelInSourceEnv("policySettings", envName)
  );
}
//@ chunk-y1dxgk9v.js:3094-3136 placement
function isModelInSourceEnv(sourceName, envName) {
  return envValuesForName(policyFilteredSettingsEnv(sourceName), envName).length > 0;
}
//@ chunk-y1dxgk9v.js:3136-3174 placement
function policyFilteredSettingsEnv(sourceName) {
  return filterPolicyPredicateEnv(getSettingsForSource(sourceName)?.env, sourceName);
}
//@ chunk-y1dxgk9v.js:3174-3265 placement
function envValuesForName(env, envName) {
  return Object.entries(env)
    .filter(([key]) => key.toUpperCase() === envName)
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
//@ chunk-y1dxgk9v.js:3386-3457 placement (2.1.88 match: isApiKeyHelperFromProjectOrLocalSettings, 0.831)
function isApiKeyHelperFromProjectOrLocalSettings(source) {
  return (
    source === "localSettings" || (source === "projectSettings" && !projectSettingsAliasesUserSettings())
  );
}
export { boolFromMaybe, isRestrictedModelAllowed, describeSelfHostedModeNotice, resolveStartupModel };
