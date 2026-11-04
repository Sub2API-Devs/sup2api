/**
 * utils/model/providerAttribution.ts
 *
 * 2.1.316 新增：提供方与模型设置来源归因
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3wek6r2k.js (14)
 * attribution: placement 14
 */
import { executeConfigChangeHooks, hasBlockingResult } from "../hooks.js";
import { PROVIDER_ENV_FLAGS, strip1mSuffix, sameModelSpelling } from "./modelIds.js";
import { isEnvTruthy } from "../envUtils.js";
import { isFirstPartyAnthropicHost } from "./providers.js";
import { getEveryMachineAdminTierSettings, getSettingsForSource } from "../settings/settings.js";
import { env } from "../env.js";
import {
  getEligibilityMemo,
  getIneligibleReason,
} from "../../services/remoteManagedSettings/remoteSettingsState.js";
import { getPreSettingsEnvSnapshot } from "../managedEnvApply.js";
import { getCanonicalName, isRecognizedCanonical } from "./canonicalModelName.js";
import { getCatalogEntry } from "./modelCatalog.js";
import { anyModelDescribed } from "./modelCatalog/catalogCapabilities.js";
import { findEffectiveServedEntry } from "./modelCatalog/servedCatalog.js";
import { getAdditionalModelOptionsCache } from "../auth.js";
import { isTierDefaultModelEnv, getMainLoopModel } from "./model.js";
import { getGatewayModelOptions } from "../../services/gateway/gatewayDiscovery.js";
import { getInitialModelSettingLayer, getSkillsSyncVetoed } from "../../bootstrap/state.js";
import { isTeammate } from "../teammate.js";
import { getEntrypointKind } from "../entrypointKinds.js";
import { resolveDefaultMainLoopModelSetting } from "./planModeModel.js";
import { fromEnum, lit } from "../../services/analytics/safeMetadata.js";
import { onPolicyVerdictChanged } from "../../services/policyLimits/policyState.js";
import { refreshSkillsSyncVeto } from "../claudeAiSync/skillsSync.js";
import { resetSkillSyncState } from "../../services/skillsSync/skillsSync.js";
import { logError } from "../log.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-3wek6r2k.js:71354-71436 placement
function configChangeBlocker(session, storageV5, credentials) {
  return (change, filePath) =>
    executeConfigChangeHooks(session, change, filePath, {
      storageV5,
      credentials,
    }).then(hasBlockingResult);
}
//@ chunk-3wek6r2k.js:71436-71894 placement
function providerEnvAttribution({ eligible, reason, machineTiers, launchEnv, flagEnv, servedEnv, liveEnv }) {
  if (eligible === undefined) return "undecided";
  if (eligible) return "not_applicable";
  let matcher = reason === undefined ? undefined : providerEnvMatcher(reason);
  if (matcher === undefined) return "not_attributed";
  if (
    machineTiers.some(
      (machineTier) => machineTier.allowedProviders !== undefined || matcher(machineTier.env ?? {}),
    )
  )
    return "machine_admin";
  if (matcher(launchEnv)) return "process_env";
  if (flagEnv !== undefined && matcher(flagEnv)) return "launch_flag";
  if (servedEnv !== undefined && matcher(servedEnv)) return "served_settings";
  return matcher(liveEnv) ? "settings_file" : "not_attributed";
}
//@ chunk-3wek6r2k.js:71894-72431 placement
function providerEnvMatcher(reason) {
  switch (reason) {
    case "third_party_provider":
      return (tupleEnv) => PROVIDER_ENV_FLAGS.some((flag) => isEnvTruthy(tupleEnv[flag]));
    case "custom_base_url":
      return (tupleEnv) =>
        !!tupleEnv.ANTHROPIC_BASE_URL && !isFirstPartyAnthropicHost(tupleEnv.ANTHROPIC_BASE_URL);
    case "unpinned_gateway":
      return (tupleEnv) => isEnvTruthy(tupleEnv.CLAUDE_CODE_USE_GATEWAY);
    case "hybrid_yields_to_device_policy":
      return (tupleEnv) =>
        ["third_party_provider", "custom_base_url"].some((otherReason) =>
          providerEnvMatcher(otherReason)?.(tupleEnv),
        );
    case "profile_base_url_mismatch":
    case "sandboxed_entrypoint":
    case "claude_tag":
    case "hermetic_remote_session":
    case "host_gateway_not_accepted":
    case "unsupported_subscription":
    case "no_auth":
      return;
  }
}
//@ chunk-3wek6r2k.js:72431-72809 placement
function machineProviderEnv() {
  let everyMachineAdminTierSettings = getEveryMachineAdminTierSettings();
  let liveEnv = {};
  for (let name of [...PROVIDER_ENV_FLAGS, "CLAUDE_CODE_USE_GATEWAY", "ANTHROPIC_BASE_URL"]) {
    let value = env[name];
    liveEnv[name] = value === undefined || value === false ? undefined : String(value);
  }
  return {
    author: providerEnvAttribution({
      eligible: getEligibilityMemo(),
      reason: getIneligibleReason(),
      machineTiers: everyMachineAdminTierSettings,
      launchEnv: getPreSettingsEnvSnapshot(),
      flagEnv: getSettingsForSource("flagSettings")?.env,
      servedEnv: getSettingsForSource("policySettings")?.env,
      liveEnv,
    }),
    forcedRefreshFromMachine: everyMachineAdminTierSettings.some(
      (everyMachineAdminTierSetting) => everyMachineAdminTierSetting.forceRemoteSettingsRefresh === true,
    ),
  };
}
//@ chunk-3wek6r2k.js:72809-72832 placement
function isProviderAttributionEnabled() {
  return false;
}
//@ chunk-3wek6r2k.js:72832-73499 placement
function forcedRefreshAttribution({ author, forcedRefreshFromMachine }) {
  if (!forcedRefreshFromMachine) return;
  switch (author) {
    case "settings_file":
      return 'A settings file on this machine selects an API provider or endpoint that turns them off. Remove the provider or base URL from the "env" block of your settings files, or contact your administrator.';
    case "served_settings":
      return "The settings served to this machine select an API provider or endpoint that turns them off. Contact your administrator.";
    case "undecided":
      return "Whether this session can receive them could not be decided. Contact your administrator.";
    case "not_applicable":
    case "not_attributed":
    case "machine_admin":
    case "process_env":
    case "launch_flag":
      return;
  }
}
//@ chunk-3wek6r2k.js:73499-73546 placement
function machineForcedRefresh() {
  if (!isProviderAttributionEnabled()) return;
  return forcedRefreshAttribution(machineProviderEnv());
}
//@ chunk-3wek6r2k.js:73546-74062 placement
function modelDefinitionSource(mainLoopModel) {
  let canonicalName = getCanonicalName(mainLoopModel, {
    identity: true,
  });
  if (getCatalogEntry(strip1mSuffix(canonicalName)) !== undefined) return "compiled_catalog";
  if (isRecognizedCanonical(canonicalName)) return "compiled_legacy";
  if (anyModelDescribed(mainLoopModel, canonicalName)) return "self_described_row";
  if (findEffectiveServedEntry(mainLoopModel, canonicalName) !== undefined) return "served_catalog";
  if (
    getAdditionalModelOptionsCache().some(
      (option) => typeof option.value === "string" && sameModelSpelling(option.value, mainLoopModel),
    )
  )
    return "bootstrap_additional_option";
  let ANTHROPIC_CUSTOM_MODEL_OPTION = env.ANTHROPIC_CUSTOM_MODEL_OPTION;
  if (ANTHROPIC_CUSTOM_MODEL_OPTION && sameModelSpelling(ANTHROPIC_CUSTOM_MODEL_OPTION, mainLoopModel))
    return "custom_option_env";
  if (isTierDefaultModelEnv(mainLoopModel)) return "tier_pin_env";
  if (
    getGatewayModelOptions().some(
      (option) => typeof option.value === "string" && sameModelSpelling(option.value, mainLoopModel),
    )
  )
    return "gateway_discovery";
  return "unrecognized";
}
//@ chunk-3wek6r2k.js:74062-74172 placement (2.1.88 match: getClientSurface, 0.78)
function getClientSurface() {
  let initialModelSettingLayer = getInitialModelSettingLayer();
  switch (initialModelSettingLayer) {
    case undefined:
    case null:
      return modelSettingSource();
    case "cli":
      return getModelPickSource();
    default:
      return initialModelSettingLayer;
  }
}
//@ chunk-3wek6r2k.js:74172-74336 placement
function getModelPickSource() {
  if (env.CLAUDE_CODE_SESSION_KIND === "bg" || isTeammate()) return "forwarded_pick";
  switch (getEntrypointKind()) {
    case "sdk-ts":
    case "sdk-py":
      return "sdk_option";
    default:
      return "cli_flag";
  }
}
//@ chunk-3wek6r2k.js:74336-74634 placement
function modelSettingSource() {
  switch (resolveDefaultMainLoopModelSetting().attribution) {
    case "org":
      return "org_default";
    case "enforced":
      return "enforced_default";
    case "entitlement":
      return "entitlement_default";
    case "managed_deny":
      return "managed_deny_default";
    case "env":
      return "env_default";
    case "served":
      return "served_default";
    case "tier":
      return "default";
  }
}
//@ chunk-3wek6r2k.js:74634-74721 placement
function modelAttributionFields() {
  return {
    model_definition_source: fromEnum(modelDefinitionSource(getMainLoopModel())),
    model_setting_source: fromEnum(getClientSurface()),
  };
}
//@ chunk-3wek6r2k.js:74721-74815 placement
var RESUME_MODEL_ATTRIBUTION; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-3wek6r2k.js:74721", () => {
  RESUME_MODEL_ATTRIBUTION = {
    model_definition_source: lit("omitted_resume"),
    model_setting_source: lit("omitted_resume"),
  };
});
//@ chunk-3wek6r2k.js:74815-74928 placement
function onSkillsSyncVetoChange() {
  return onPolicyVerdictChanged(() => {
    let skillsSyncVetoed = getSkillsSyncVetoed();
    refreshSkillsSyncVeto();
    if (getSkillsSyncVetoed() === skillsSyncVetoed) return;
    queueMicrotask(() => {
      try {
        resetSkillSyncState();
      } catch (error) {
        logError(error);
      }
    });
  });
}
export {
  configChangeBlocker,
  machineForcedRefresh,
  machineProviderEnv,
  onSkillsSyncVetoChange,
  modelAttributionFields,
  RESUME_MODEL_ATTRIBUTION,
};
