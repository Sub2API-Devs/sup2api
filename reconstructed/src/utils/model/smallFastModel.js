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
import { We, getUnrefusedFallbacks } from "./modelUnavailability.js";
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
  em,
  Bu,
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
import { nI } from "./bedrock.js";
import {
  getDefaultSonnetModel,
  getMainLoopModel,
  isModelOverrideTarget,
  toProviderWireModelId,
  strip1mTag,
  isUnservedModelSpelling,
} from "./model.js";
import { getModelStrings } from "./modelStrings.js";
import { Bn, parseModelId } from "./modelIds.js";
import { logForDebugging } from "../debug.js";
import { hasProviderModelPrefix } from "./deniedModels.js";
import { getCatalogEntry } from "./modelCatalog.js";
import { getContextWindow } from "./configs.js";
import { has1mSuffix } from "./contextWindow1m.js";

//@ chunk-aepeg2w5.js:426756-426824 placement
function hw() {
  return Math.max(0, ...We().conversationSizes.values());
}
/**
 * 返回管理员第三方模型引导状态（是否设置了 Sonnet/Opus 默认值，排除探测写入的值）。
 */
//@ chunk-aepeg2w5.js:426824-427104 placement
function getAdminSteering() {
  return (
    getAdmin3PSteeringSnapshot() ?? {
      sonnet:
        env.ANTHROPIC_DEFAULT_SONNET_MODEL !== void 0 &&
        env.ANTHROPIC_DEFAULT_SONNET_MODEL !== env.CLAUDE_CODE_3P_PROBE_WROTE_SONNET_DEFAULT,
      opus:
        env.ANTHROPIC_DEFAULT_OPUS_MODEL !== void 0 &&
        env.ANTHROPIC_DEFAULT_OPUS_MODEL !== env.CLAUDE_CODE_3P_PROBE_WROTE_OPUS_DEFAULT,
    }
  );
}
//@ chunk-aepeg2w5.js:427104-427136 placement
function isDefaultOpusModelAdminSteered() {
  return getAdminSteering().opus;
}
/**
 * 判断是否只设置了 Sonnet 默认值（无 Opus、未强制模型）。
 */
//@ chunk-aepeg2w5.js:427136-427251 placement
function isSonnetOnlySteering() {
  let e = getAdminSteering(),
    n =
      getModelEnforcementState().state !== "inactive" ||
      getSettings_DEPRECATED()?.enforceAvailableModels === !0;
  return e.sonnet && !e.opus && !n;
}
//@ chunk-aepeg2w5.js:427251-427399 placement
function hasDedicatedSmallFastModel() {
  if (env.ANTHROPIC_SMALL_FAST_MODEL !== void 0) return !0;
  return (
    env.ANTHROPIC_DEFAULT_HAIKU_MODEL !== void 0 ||
    areBuiltinModelsKnownHosted() ||
    (getAPIProvider() === "gateway" && isModelAllowed(getDefaultHaikuModel()))
  );
}
//@ chunk-aepeg2w5.js:427399-427471 placement = logEventTo1P (1)
function areBuiltinModelsKnownHosted() {
  let e = getAPIProvider();
  return (
    (e === "firstParty" && (isFirstPartyAnthropicBaseUrl() || hasAnthropicDirectApiKey())) ||
    isClaudePlatformProvider(e)
  );
}
//@ chunk-aepeg2w5.js:427471-427790 placement
function getSmallFastModel() {
  let ANTHROPIC_SMALL_FAST_MODEL = env.ANTHROPIC_SMALL_FAST_MODEL;
  if (ANTHROPIC_SMALL_FAST_MODEL !== void 0) return resolveSmallFastModel(nI(ANTHROPIC_SMALL_FAST_MODEL));
  if (!hasDedicatedSmallFastModel()) {
    let n = getAPIProvider();
    if (
      (n === "bedrock" || n === "vertex") &&
      getUserSpecifiedModelSetting() == null &&
      !isEnvDefaultModelGoverning()
    ) {
      let r = getAdminSteering();
      if (!r.opus || r.sonnet) {
        let s = getDefaultSonnetModel();
        if (
          (isModelAllowedUnderActiveEnforcement(s) ?? isModelAllowed(s)) &&
          !isModelDenied(s, getModelEntitlementDenySet())
        )
          return s;
      }
    }
    return getMainLoopModel();
  }
  return env.ANTHROPIC_DEFAULT_HAIKU_MODEL !== void 0
    ? resolveSmallFastModel(getDefaultHaikuModel())
    : Tw(getDefaultHaikuModel());
}
//@ chunk-aepeg2w5.js:427790-427886 placement
function getBareCheckModel() {
  if (getAPIProvider() === "firstParty" && areBuiltinModelsKnownHosted()) {
    let haiku45 = getModelStrings().haiku45;
    if (!em(haiku45)) return haiku45;
  }
  return getSmallFastModel();
}
//@ chunk-aepeg2w5.js:427886-428079 placement
function getHostedDefaultSmallFastModel() {
  if (
    env.ANTHROPIC_SMALL_FAST_MODEL !== void 0 ||
    env.ANTHROPIC_DEFAULT_HAIKU_MODEL !== void 0 ||
    getAPIProvider() !== "firstParty" ||
    !areBuiltinModelsKnownHosted()
  )
    return;
  let e = getDefaultHaikuModel();
  return getSmallFastModel() === e && !isModelOverrideTarget(e) && toProviderWireModelId(e) === Bn(e)
    ? e
    : void 0;
}
//@ chunk-aepeg2w5.js:428079-428114 placement
function Tw(e) {
  return em(e) ? getMainLoopModel() : e;
}
//@ chunk-aepeg2w5.js:428114-428226 placement
function unlessManagedDeniedModel(e) {
  if (!em(e)) return e;
  let n = getMainLoopModel();
  return (logForDebugging(`[deniedModels] helper request for ${e} sent as ${n}`), n);
}
//@ chunk-aepeg2w5.js:428226-428339 placement
function resolveSmallFastModel(e) {
  let n = parseModelId(e);
  if (n?.family === "haiku" && n.trailer === void 0 && hasProviderModelPrefix(e, n)) return Tw(e);
  return Bu(e) ? getMainLoopModel() : e;
}
//@ chunk-aepeg2w5.js:428339-428381 placement
function Wu(e, n) {
  return getCatalogEntry(e)?.family === n;
}
//@ chunk-aepeg2w5.js:428381-428418 placement
function isNonCustomFableModel(e) {
  return Wu(e, "fable");
}
//@ chunk-aepeg2w5.js:428418-428456 placement
function isNonCustomMythosModel(e) {
  return Wu(e, "mythos");
}
//@ chunk-aepeg2w5.js:428456-428508 placement
function swapShrinksContextWindow(e, n) {
  let r = getSdkBetas();
  return getContextWindow(n, r) < getContextWindow(e, r);
}
//@ chunk-aepeg2w5.js:428508-428521 placement
var yK = 20000;
//@ chunk-aepeg2w5.js:428521-428576 placement
function ladderStepLosesContext(e, n, r) {
  return swapShrinksContextWindow(e, n) && r() > getContextWindow(n, getSdkBetas()) - yK;
}
//@ chunk-aepeg2w5.js:428576-428759 placement
function ladderRungsToSend(e) {
  let n = getSdkBetas(),
    r = getContextWindow(e, n),
    filtered = getUnrefusedFallbacks(e).filter((S) => isModelAllowed(S)),
    h = [],
    y = 0;
  for (let S = filtered.length - 1; S >= 0; S--) {
    let w = getContextWindow(filtered[S], n);
    if (w >= r || w >= y) h.push(filtered[S]);
    y = Math.max(y, w);
  }
  return h.reverse();
}
//@ chunk-aepeg2w5.js:428759-428805 placement
function largestSessionContextTokens() {
  return Math.max(getLastMainThreadContextTokens() ?? 0, hw());
}
//@ chunk-aepeg2w5.js:428805-429009 placement
function preserve1mContextForRefusalFallback(e, n) {
  let r = getSdkBetas(),
    s = getContextWindow(e, r);
  if (getContextWindow(n, r) >= s) {
    if (has1mSuffix(n)) {
      if (!has1mSuffix(e)) {
        let y = strip1mTag(n);
        return getContextWindow(y, r) >= s ? y : void 0;
      }
      if (isKnownNon1mTarget(n)) return;
    }
    return n;
  }
  if (!has1mSuffix(e)) return;
  let h = append1mSuffixIfMissing(n);
  return eligible1mSuffixTarget(h) && getContextWindow(h, r) >= s ? h : void 0;
}
//@ chunk-aepeg2w5.js:429009-429045 placement
function isNonCustomOpusModel(e) {
  return Wu(e, "opus");
}
//@ chunk-aepeg2w5.js:429045-429083 placement
function isNonCustomSonnetModel(e) {
  return Wu(e, "sonnet");
}
//@ chunk-aepeg2w5.js:429083-429160 placement
function getUserSpecifiedModelSetting() {
  let e = getMainLoopModelOverride();
  if (e !== void 0) return vetUserSpecifiedModel(e, "explicit");
  return getBaselineModelSetting();
}
/**
 * 用户指定的主模型设置：启动时的初始模型（--model）优先，否则 ANTHROPIC_MODEL，再否则 settings.model；经 normalizeModelSetting 过滤（不在白名单则尝试替代、未解析的拒绝）。
 */
//@ chunk-aepeg2w5.js:429160-429302 placement = getUserSpecifiedModelSetting (0.36)
function getBaselineModelSetting() {
  let modelOverride = getInitialMainLoopModel(),
    envAnthropicModel = process.env.ANTHROPIC_MODEL,
    r =
      modelOverride !== void 0
        ? modelOverride
        : envAnthropicModel || getSettings_DEPRECATED()?.model || void 0;
  return vetUserSpecifiedModel(r, modelOverride !== void 0 ? "explicit" : "persisted");
}
/**
 * 模型不被允许且未复核时返回白名单替代（Hk）；未解析的别名（persisted 来源）丢弃；否则登记并原样返回。
 */
//@ chunk-aepeg2w5.js:429302-429417 placement
function vetUserSpecifiedModel(e, n = "explicit") {
  if (e && !isModelAllowed(e) && !keepsHonoredModelOnCachedDeny(e))
    return stepDownRestrictedFamilyAliasPick(e) ?? void 0;
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
