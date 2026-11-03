/**
 * utils/model/smallFastModel.ts
 *
 * 2.1.316 新增：小快模型选择（deniedModels helper、按提供商回退）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (26)
 * attribution: placement 26
 */
import { currentFallbackLadderStates, getUnrefusedFallbacks } from "./modelUnavailability.js";
import {
  getAdmin3PSteeringSnapshot,
  getSdkBetas,
  getLastMainThreadContextTokens,
  getMainLoopModelOverride,
  getInitialMainLoopModel,
} from "../../bootstrap/state.js";
import { env } from "../env.js";
import {
  getModelEnforcementState,
  isEnvDefaultModelGoverning,
  isModelAllowedUnderActiveEnforcement,
  isModelDeniedByManagedSafe,
  isBlockedByManagedModelPolicySafe,
  isKnownNon1mTarget,
  eligible1mSuffixTarget,
} from "./defaultModel.js";
import { getSettings_DEPRECATED } from "../settings/settings.js";
import { getAPIProvider, isFirstPartyAnthropicBaseUrl, isClaudePlatformProvider } from "./providers.js";
import {
  isModelAllowed,
  isModelDenied,
  getModelEntitlementDenySet,
  keepsHonoredModelOnCachedDeny,
  noteHonoredSessionModel,
} from "./modelAllowlist.js";
import {
  getDefaultHaikuModel,
  append1mSuffixIfMissing,
  stepDownRestrictedFamilyAliasPick,
} from "./planModeModel.js";
import { hasAnthropicDirectApiKey } from "../auth.js";
import { identityModelId } from "./bedrock.js";
import {
  getDefaultSonnetModel,
  getMainLoopModel,
  isModelOverrideTarget,
  toProviderWireModelId,
  strip1mTag,
  isUnservedModelSpelling,
} from "./model.js";
import { getModelStrings } from "./modelStrings.js";
import { stripAnyVersatileSuffix, parseModelId } from "./modelIds.js";
import { logForDebugging } from "../debug.js";
import { hasProviderModelPrefix } from "./deniedModels.js";
import { getCatalogEntry } from "./modelCatalog.js";
import { getContextWindow } from "./configs.js";
import { has1mSuffix_2 } from "./contextWindow1m.js";

//@ chunk-aepeg2w5.js:426756-426824 placement
function maxConversationSize() {
  return Math.max(0, ...currentFallbackLadderStates().conversationSizes.values());
}
//@ chunk-aepeg2w5.js:426824-427104 placement
/**
 * 返回管理员第三方模型引导状态（是否设置了 Sonnet/Opus 默认值，排除探测写入的值）。
 */
function getAdminSteering() {
  return (
    getAdmin3PSteeringSnapshot() ?? {
      sonnet:
        env.ANTHROPIC_DEFAULT_SONNET_MODEL !== undefined &&
        env.ANTHROPIC_DEFAULT_SONNET_MODEL !== env.CLAUDE_CODE_3P_PROBE_WROTE_SONNET_DEFAULT,
      opus:
        env.ANTHROPIC_DEFAULT_OPUS_MODEL !== undefined &&
        env.ANTHROPIC_DEFAULT_OPUS_MODEL !== env.CLAUDE_CODE_3P_PROBE_WROTE_OPUS_DEFAULT,
    }
  );
}
//@ chunk-aepeg2w5.js:427104-427136 placement
function isDefaultOpusModelAdminSteered() {
  return getAdminSteering().opus;
}
//@ chunk-aepeg2w5.js:427136-427251 placement
/**
 * 判断是否只设置了 Sonnet 默认值（无 Opus、未强制模型）。
 */
function isSonnetOnlySteering() {
  let adminSteering = getAdminSteering();
  let n =
    getModelEnforcementState().state !== "inactive" ||
    getSettings_DEPRECATED()?.enforceAvailableModels === true;
  return adminSteering.sonnet && !adminSteering.opus && !n;
}
//@ chunk-aepeg2w5.js:427251-427399 placement
function hasDedicatedSmallFastModel() {
  if (env.ANTHROPIC_SMALL_FAST_MODEL !== undefined) return true;
  return (
    env.ANTHROPIC_DEFAULT_HAIKU_MODEL !== undefined ||
    areBuiltinModelsKnownHosted() ||
    (getAPIProvider() === "gateway" && isModelAllowed(getDefaultHaikuModel()))
  );
}
//@ chunk-aepeg2w5.js:427399-427471 placement = logEventTo1P (1)
function areBuiltinModelsKnownHosted() {
  let apiProvider = getAPIProvider();
  return (
    (apiProvider === "firstParty" && (isFirstPartyAnthropicBaseUrl() || hasAnthropicDirectApiKey())) ||
    isClaudePlatformProvider(apiProvider)
  );
}
//@ chunk-aepeg2w5.js:427471-427790 placement
function getSmallFastModel() {
  let ANTHROPIC_SMALL_FAST_MODEL = env.ANTHROPIC_SMALL_FAST_MODEL;
  if (ANTHROPIC_SMALL_FAST_MODEL !== undefined)
    return resolveSmallFastModel(identityModelId(ANTHROPIC_SMALL_FAST_MODEL));
  if (!hasDedicatedSmallFastModel()) {
    let apiProvider = getAPIProvider();
    if (
      (apiProvider === "bedrock" || apiProvider === "vertex") &&
      getUserSpecifiedModelSetting() == null &&
      !isEnvDefaultModelGoverning()
    ) {
      let adminSteering = getAdminSteering();
      if (!adminSteering.opus || adminSteering.sonnet) {
        let defaultSonnetModel = getDefaultSonnetModel();
        if (
          (isModelAllowedUnderActiveEnforcement(defaultSonnetModel) ?? isModelAllowed(defaultSonnetModel)) &&
          !isModelDenied(defaultSonnetModel, getModelEntitlementDenySet())
        )
          return defaultSonnetModel;
      }
    }
    return getMainLoopModel();
  }
  return env.ANTHROPIC_DEFAULT_HAIKU_MODEL !== undefined
    ? resolveSmallFastModel(getDefaultHaikuModel())
    : mainLoopIfDenied(getDefaultHaikuModel());
}
//@ chunk-aepeg2w5.js:427790-427886 placement
function getBareCheckModel() {
  if (getAPIProvider() === "firstParty" && areBuiltinModelsKnownHosted()) {
    let haiku45 = getModelStrings().haiku45;
    if (!isModelDeniedByManagedSafe(haiku45)) return haiku45;
  }
  return getSmallFastModel();
}
//@ chunk-aepeg2w5.js:427886-428079 placement
function getHostedDefaultSmallFastModel() {
  if (
    env.ANTHROPIC_SMALL_FAST_MODEL !== undefined ||
    env.ANTHROPIC_DEFAULT_HAIKU_MODEL !== undefined ||
    getAPIProvider() !== "firstParty" ||
    !areBuiltinModelsKnownHosted()
  )
    return;
  let defaultHaikuModel = getDefaultHaikuModel();
  return getSmallFastModel() === defaultHaikuModel &&
    !isModelOverrideTarget(defaultHaikuModel) &&
    toProviderWireModelId(defaultHaikuModel) === stripAnyVersatileSuffix(defaultHaikuModel)
    ? defaultHaikuModel
    : undefined;
}
//@ chunk-aepeg2w5.js:428079-428114 placement
function mainLoopIfDenied(e) {
  return isModelDeniedByManagedSafe(e) ? getMainLoopModel() : e;
}
//@ chunk-aepeg2w5.js:428114-428226 placement
function unlessManagedDeniedModel(e) {
  if (!isModelDeniedByManagedSafe(e)) return e;
  let mainLoopModel = getMainLoopModel();
  logForDebugging(`[deniedModels] helper request for ${e} sent as ${mainLoopModel}`);
  return mainLoopModel;
}
//@ chunk-aepeg2w5.js:428226-428339 placement
function resolveSmallFastModel(e) {
  let modelId = parseModelId(e);
  if (modelId?.family === "haiku" && modelId.trailer === undefined && hasProviderModelPrefix(e, modelId))
    return mainLoopIfDenied(e);
  return isBlockedByManagedModelPolicySafe(e) ? getMainLoopModel() : e;
}
//@ chunk-aepeg2w5.js:428339-428381 placement
function catalogFamilyIs(e, n) {
  return getCatalogEntry(e)?.family === n;
}
//@ chunk-aepeg2w5.js:428381-428418 placement
function isNonCustomFableModel(e) {
  return catalogFamilyIs(e, "fable");
}
//@ chunk-aepeg2w5.js:428418-428456 placement
function isNonCustomMythosModel(e) {
  return catalogFamilyIs(e, "mythos");
}
//@ chunk-aepeg2w5.js:428456-428508 placement
function swapShrinksContextWindow(e, n) {
  let sdkBetas = getSdkBetas();
  return getContextWindow(n, sdkBetas) < getContextWindow(e, sdkBetas);
}
//@ chunk-aepeg2w5.js:428508-428521 placement
var CONTEXT_SWAP_SLACK = 20000;
//@ chunk-aepeg2w5.js:428521-428576 placement
function ladderStepLosesContext(e, n, r) {
  return swapShrinksContextWindow(e, n) && r() > getContextWindow(n, getSdkBetas()) - CONTEXT_SWAP_SLACK;
}
//@ chunk-aepeg2w5.js:428576-428759 placement
function ladderRungsToSend(e) {
  let sdkBetas = getSdkBetas();
  let contextWindow = getContextWindow(e, sdkBetas);
  let filtered = getUnrefusedFallbacks(e).filter((S) => isModelAllowed(S));
  let h = [];
  let y = 0;
  for (let j = filtered.length - 1; j >= 0; j--) {
    let contextWindow_2 = getContextWindow(filtered[j], sdkBetas);
    if (contextWindow_2 >= contextWindow || contextWindow_2 >= y) h.push(filtered[j]);
    y = Math.max(y, contextWindow_2);
  }
  return h.reverse();
}
//@ chunk-aepeg2w5.js:428759-428805 placement
function largestSessionContextTokens() {
  return Math.max(getLastMainThreadContextTokens() ?? 0, maxConversationSize());
}
//@ chunk-aepeg2w5.js:428805-429009 placement
function preserve1mContextForRefusalFallback(e, n) {
  let sdkBetas = getSdkBetas();
  let contextWindow = getContextWindow(e, sdkBetas);
  if (getContextWindow(n, sdkBetas) >= contextWindow) {
    if (has1mSuffix_2(n)) {
      if (!has1mSuffix_2(e)) {
        let y = strip1mTag(n);
        return getContextWindow(y, sdkBetas) >= contextWindow ? y : undefined;
      }
      if (isKnownNon1mTarget(n)) return;
    }
    return n;
  }
  if (!has1mSuffix_2(e)) return;
  let h = append1mSuffixIfMissing(n);
  return eligible1mSuffixTarget(h) && getContextWindow(h, sdkBetas) >= contextWindow ? h : undefined;
}
//@ chunk-aepeg2w5.js:429009-429045 placement
function isNonCustomOpusModel(canonicalName) {
  return catalogFamilyIs(canonicalName, "opus");
}
//@ chunk-aepeg2w5.js:429045-429083 placement
function isNonCustomSonnetModel(canonicalName) {
  return catalogFamilyIs(canonicalName, "sonnet");
}
//@ chunk-aepeg2w5.js:429083-429160 placement
function getUserSpecifiedModelSetting() {
  let mainLoopModelOverride = getMainLoopModelOverride();
  if (mainLoopModelOverride !== undefined) return vetUserSpecifiedModel(mainLoopModelOverride, "explicit");
  return getBaselineModelSetting();
}
//@ chunk-aepeg2w5.js:429160-429302 placement = getUserSpecifiedModelSetting (0.36)
/**
 * 用户指定的主模型设置：启动时的初始模型（--model）优先，否则 ANTHROPIC_MODEL，再否则 settings.model；经 normalizeModelSetting 过滤（不在白名单则尝试替代、未解析的拒绝）。
 */
function getBaselineModelSetting() {
  let modelOverride = getInitialMainLoopModel();
  let envAnthropicModel = process.env.ANTHROPIC_MODEL;
  let r =
    modelOverride !== undefined
      ? modelOverride
      : envAnthropicModel || getSettings_DEPRECATED()?.model || undefined;
  return vetUserSpecifiedModel(r, modelOverride !== undefined ? "explicit" : "persisted");
}
//@ chunk-aepeg2w5.js:429302-429417 placement
/**
 * 模型不被允许且未复核时返回白名单替代（Hk）；未解析的别名（persisted 来源）丢弃；否则登记并原样返回。
 */
function vetUserSpecifiedModel(e, n = "explicit") {
  if (e && !isModelAllowed(e) && !keepsHonoredModelOnCachedDeny(e))
    return stepDownRestrictedFamilyAliasPick(e) ?? undefined;
  if (e && isUnservedModelSpelling(e, n)) return;
  if (e) noteHonoredSessionModel(e);
  return e;
}
export {
  areBuiltinModelsKnownHosted,
  getUserSpecifiedModelSetting,
  isNonCustomMythosModel,
  getBareCheckModel,
  getHostedDefaultSmallFastModel,
  getBaselineModelSetting,
  preserve1mContextForRefusalFallback,
  hasDedicatedSmallFastModel,
  getSmallFastModel,
  unlessManagedDeniedModel,
  ladderStepLosesContext,
  isNonCustomOpusModel,
  isNonCustomFableModel,
  swapShrinksContextWindow,
  isNonCustomSonnetModel,
  isDefaultOpusModelAdminSteered,
  vetUserSpecifiedModel,
  isSonnetOnlySteering,
  getAdminSteering,
  ladderRungsToSend,
  largestSessionContextTokens,
};
