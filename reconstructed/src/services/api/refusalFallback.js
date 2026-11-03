/**
 * services/api/refusalFallback.ts
 *
 * 2.1.316 新增：安全拒绝后的备用模型链解析、切换对话框与遥测
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hwmsct5x.js (59)
 * attribution: placement 59
 */
import { isEnvDefinedFalsy, isEnvTruthy } from "../../utils/envUtils.js";
import { env } from "../../utils/env.js";
import {
  getTimeoutMsForChoice,
  DEFAULT_DIALOG_TIMEOUT_MS,
  REFUSAL_FALLBACK_DIALOG,
  requestUserDialogRaced,
} from "../requestUserDialog.js";
import { getDialogExpiry } from "../../utils/settings/settings.js";
import { isNoModelFallbackEnabled } from "../../utils/model/modelFallback.js";
import { resolveSetting } from "../../utils/settings/userIntentSettings.js";
import { isFirstPartyApiBackend, usesFirstPartyModelIds } from "../../utils/model/providers.js";
import { isModelAdmittedByAvailableModels } from "../../utils/model/defaultModel.js";
import {
  enforcementRefusalFallbackOpusModel,
  getRefusalFallbackOpusModel,
  getRefusalFallbackOpusLineupIds,
} from "../../utils/model/classifierModel.js";
import {
  strippedCanonicalName,
  getCanonicalName,
  isRecognizedCanonical,
} from "../../utils/model/canonicalModelName.js";
import { isModelCapabilityEnabled, isInLoggiaRoster } from "../../utils/model/promptBundles.js";
import {
  isFableModel,
  needsFableMitigations,
  isMythosModel,
  neverMitigated,
} from "../../utils/model/fableMitigations.js";
import { isPinnedFableModel, isOpus5FamilyModel, strip1mTag } from "../../utils/model/model.js";
import { getCatalogEntry, modelSupportsCapability } from "../../utils/model/modelCatalog.js";
import { getEnabledModelOptions, isFableFamilyValue } from "../../utils/model/modelOptions.js";
import {
  preserve1mContextForRefusalFallback,
  isNonCustomOpusModel,
} from "../../utils/model/smallFastModel.js";
import {
  setAvailabilityFallbackChain,
  getAvailabilityFallbackChain,
  isSdkDialogHostActive,
  getSdkSupportedDialogKinds,
} from "../../bootstrap/state.js";
import {
  isEntitlementOverlayUnavailable,
  isModelDenied,
  getModelEntitlementDenySet,
} from "../../utils/model/modelAllowlist.js";
import { strip1mSuffix } from "../../utils/model/modelIds.js";
import { isCatalogSuppressed } from "../../utils/model/modelCatalog/servedCatalog.js";
import { logEvent } from "../analytics/index.js";
import { sanitizeMarkName } from "../../utils/startupMarks.js";
import { telemetrySafeModelName } from "../../utils/model/telemetryModelName.js";
import { fromEnum, lit } from "../analytics/safeMetadata.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { record, string, union, array } from "../../../vendor/zod/v4/classic/schemas.js";
import { isFeedbackAllowed } from "../../commands/feedback/feedbackPolicy.js";
import { shortHash } from "../../utils/shortHash.js";
import { logFeatureBad } from "../analytics/featureTelemetry.js";

//@ chunk-hwmsct5x.js:225071-225095 placement
function isClaudeOpus5Alias(e) {
  return false;
}
//@ chunk-hwmsct5x.js:225095-225141 placement
function isHardRefusalCategory(e) {
  return e === "cyber" || e === "bio";
}
//@ chunk-hwmsct5x.js:225141-225210 placement
function isExtraHardRefusalCategory(e) {
  return e === "frontier_llm" || e === "reasoning_extraction";
}
//@ chunk-hwmsct5x.js:225210-225257 placement
function normalizeRefusalCategory(e) {
  return isHardRefusalCategory(e) || isExtraHardRefusalCategory(e) ? e : "other";
}
//@ chunk-hwmsct5x.js:225257-225562 placement
/**
 * 安全拒绝回退的线路表：按类别（bio/cyber/frontier_llm）给出可换用的 Opus/Sonnet 模型，以及每条路线最多 3 个候选。
 */
var REFUSAL_FALLBACK_ROUTES = 3;
var TWO_LANE_ROUTES = {
  bio: "claude-opus-5",
  cyber: "claude-opus-4-8",
  frontier_llm: "claude-opus-5",
};
var OPUS5_ROUTES = {
  cyber: "claude-opus-4-8",
};
var OPUS55_ROUTES = {
  bio: "claude-opus-5",
  cyber: "claude-opus-4-8",
  frontier_llm: "claude-opus-5",
};
var SONNET55_ROUTES = {
  cyber: "claude-sonnet-5",
  frontier_llm: "claude-sonnet-5",
};
var OPUS5_ALIAS_ROUTES = {
  bio: "claude-opus-4-8",
  cyber: "claude-opus-4-8",
};
//@ chunk-hwmsct5x.js:225562-225792 placement
function refusalLineupFor(e) {
  if (isClaudeOpus5Alias(e)) return OPUS5_ALIAS_ROUTES;
  if (e === "claude-opus-5-5" || e === "claude-opus-5-5[1m]") return OPUS55_ROUTES;
  if (e === "claude-opus-5" || e === "claude-opus-5[1m]") return OPUS5_ROUTES;
  if (e === "claude-sonnet-5-5" || e === "claude-sonnet-5-5[1m]") return SONNET55_ROUTES;
  return TWO_LANE_ROUTES;
}
//@ chunk-hwmsct5x.js:225792-225855 placement
function refusalLineupModels(e) {
  return Object.values(refusalLineupFor(e)).flatMap((n) => limitRouteModels(n));
}
//@ chunk-hwmsct5x.js:225855-225865 placement
var CATCH_ALL_REFUSAL_FALLBACK = false;
//@ chunk-hwmsct5x.js:225865-225971 placement
function isRefusalCatchAllEnabled() {
  let envClaudeCodeRefusalFallbackCatchAll = process.env.CLAUDE_CODE_REFUSAL_FALLBACK_CATCH_ALL;
  if (isEnvDefinedFalsy(envClaudeCodeRefusalFallbackCatchAll)) return false;
  return isEnvTruthy(envClaudeCodeRefusalFallbackCatchAll) || CATCH_ALL_REFUSAL_FALLBACK;
}
//@ chunk-hwmsct5x.js:225971-226390 placement
function describeFallbackRoute(e, refusalFallbackCascadeHop) {
  if (refusalFallbackCascadeHop !== undefined)
    return {
      routeMatched: "chain",
      cascadeHopIndex: refusalFallbackCascadeHop.index,
      cascadeChainLength: refusalFallbackCascadeHop.length,
    };
  if (e === undefined)
    return {
      routeMatched: null,
    };
  if (e.matched === "category")
    return {
      routeMatched: "category",
      remainingChain: e.remainingChain,
      cascadeHopIndex: 1,
      cascadeChainLength: e.chainLength,
    };
  if (e.matched === "catch_all")
    return {
      routeMatched: "catch_all",
      cascadeHopIndex: 1,
      cascadeChainLength: 1,
    };
  return {
    routeMatched: null,
  };
}
//@ chunk-hwmsct5x.js:226390-226451 placement
function limitRouteModels(e) {
  return (typeof e === "string" ? [e] : e).slice(0, REFUSAL_FALLBACK_ROUTES);
}
//@ chunk-hwmsct5x.js:226451-226628 placement
function findFirstResolvableStage(e, n) {
  return e.reduce((acc, s, h) => {
    if (acc !== undefined) return acc;
    let y = n(s);
    return y === undefined
      ? undefined
      : {
          model: y,
          skippedStages: e.slice(0, h),
          remainingChain: e.slice(h + 1),
        };
  }, undefined);
}
//@ chunk-hwmsct5x.js:226628-227224 placement
/**
 * 按拒绝类别（cyber/bio/frontier_llm…）查找备用模型链，返回匹配方式（category/catch_all/unmapped）与剩余链。
 */
function resolveRefusalFallbackRoute(e) {
  let { originalModelCanonical, apiRefusalCategory } = e;
  let s = e.routesOverride ?? refusalLineupFor(originalModelCanonical);
  let h =
    apiRefusalCategory != null && Object.hasOwn(s, apiRefusalCategory) ? s[apiRefusalCategory] : undefined;
  if (h !== undefined) {
    let y = limitRouteModels(h);
    let firstResolvableStage = findFirstResolvableStage(y, e.resolveTarget);
    if (firstResolvableStage !== undefined)
      return {
        matched: "category",
        model: firstResolvableStage.model,
        remainingChain: firstResolvableStage.remainingChain,
        skippedStages: firstResolvableStage.skippedStages,
        chainLength: y.length,
      };
    return {
      matched: "none",
      model: undefined,
      reason: "mapped_target_unresolvable",
      skippedStages: y.slice(0, -1),
      chainLength: y.length,
    };
  }
  if (isRefusalCatchAllEnabled() && !e.armedTargetIsRefusingModel)
    return {
      matched: "catch_all",
      model: e.armedFallbackModel,
    };
  return {
    matched: "none",
    model: undefined,
    reason: "unmapped",
  };
}
//@ chunk-hwmsct5x.js:227506-227580 placement
function getUserDialogTimeoutMs() {
  return (
    env.CLAUDE_CODE_USER_DIALOG_TIMEOUT_MS ??
    getTimeoutMsForChoice(getDialogExpiry()) ??
    DEFAULT_DIALOG_TIMEOUT_MS
  );
}
//@ chunk-hwmsct5x.js:227580-227647 placement
function isRefusalFallbackEnabled() {
  return !env.CLAUDE_CODE_DISABLE_REFUSAL_FALLBACK && !isNoModelFallbackEnabled();
}
//@ chunk-hwmsct5x.js:227647-227722 placement
function isAutoSwitchOnFlagEnabled() {
  return (
    isRefusalFallbackEnabled() &&
    resolveSetting("switchModelsOnFlag", true).value &&
    isFirstPartyApiBackend() &&
    !alwaysFalseRefusalFallback()
  );
}
//@ chunk-hwmsct5x.js:227722-227745 placement
function alwaysFalseRefusalFallback() {
  return false;
}
//@ chunk-hwmsct5x.js:227745-227778 placement
/**
 * 导出函数 `noRefusalFallbackOpusModel`：返回 isModelAdmittedByAvailableModels(enforcementRefusalFallbackOpusModel())。
 */
function noRefusalFallbackOpusModel() {
  return isModelAdmittedByAvailableModels(enforcementRefusalFallbackOpusModel());
}
//@ chunk-hwmsct5x.js:227778-227830 placement
/**
 * 导出函数 `everyLineupModelAdmitted`：参数 e，返回 Si(strippedCanonicalName(e)).every((n) => isModelAdmittedByAvailableModels(n))。
 */
function everyLineupModelAdmitted(primaryModel) {
  return refusalLineupModels(strippedCanonicalName(primaryModel)).every((n) =>
    isModelAdmittedByAvailableModels(n),
  );
}
//@ chunk-hwmsct5x.js:227830-227891 placement
/**
 * 导出函数 `isInRefusalLineup`：参数 e, n，返回 !isSameModel(e, n) && Si(strippedCanonicalName(e)).includes(strippedCanonicalName(n))。
 */
function isInRefusalLineup(model, model_2) {
  return (
    !isSameModel(model, model_2) &&
    refusalLineupModels(strippedCanonicalName(model)).includes(strippedCanonicalName(model_2))
  );
}
//@ chunk-hwmsct5x.js:227891-228040 placement
function classifyFallbackOrigin(e) {
  let canonicalName = getCanonicalName(e);
  if (
    isModelCapabilityEnabled("refusal_fallback", canonicalName, e) &&
    !isFableModel(canonicalName) &&
    !needsFableMitigations(canonicalName, e) &&
    !isPinnedFableModel(e)
  )
    return "catalog_flag";
  if (isInLoggiaRoster(e)) return "gb_listed";
  return "other";
}
//@ chunk-hwmsct5x.js:228040-228468 placement
function resolveFamilyDefaultModel(e) {
  let family = getCatalogEntry(e)?.family;
  let r = {
    opus: env.ANTHROPIC_DEFAULT_OPUS_MODEL,
    sonnet: env.ANTHROPIC_DEFAULT_SONNET_MODEL,
    haiku: env.ANTHROPIC_DEFAULT_HAIKU_MODEL,
  };
  let s = family !== undefined && Object.hasOwn(r, family) ? r[family] : undefined;
  if (s) {
    let canonicalName = getCanonicalName(s);
    return canonicalName.startsWith("claude-") && getCatalogEntry(canonicalName)?.family !== family
      ? undefined
      : s;
  }
  return getEnabledModelOptions()
    .map((h) => h.value)
    .filter((h) => typeof h === "string" && h.length > 0)
    .map((h) => h.replace(/\[1m\]$/, ""))
    .find((h) => getCanonicalName(h).replace(/\[1m\]$/, "") === e);
}
//@ chunk-hwmsct5x.js:228468-228561 placement
function walkDownOpusLineup(e) {
  let n = admittedFallbackModel(getRefusalFallbackChain(e), "walk_down_opus_lineup");
  if (n === undefined) return;
  return preserve1mContextForRefusalFallback(e, n);
}
//@ chunk-hwmsct5x.js:228561-228570 placement
var DEFAULT_REFUSAL_ROUTES = 2;
//@ chunk-hwmsct5x.js:228570-228595 placement
/**
 * 导出函数 `refusalRouteLimit`：返回 _b。
 */
function refusalRouteLimit() {
  return DEFAULT_REFUSAL_ROUTES;
}
//@ chunk-hwmsct5x.js:228595-228633 placement
function hasRefusalFallbackTarget(model) {
  return getRefusalFallbackChain(model) !== undefined;
}
//@ chunk-hwmsct5x.js:228633-228677 placement
var CLAUDE_OPUS_4_8 = "claude-opus-4-8";
var CLAUDE_OPUS_5 = "claude-opus-5";
//@ chunk-hwmsct5x.js:228677-228728 placement
function setRemoteFallbackLatch(e) {
  setAvailabilityFallbackChain(env.CLAUDE_CODE_REMOTE ? e : undefined);
}
//@ chunk-hwmsct5x.js:228728-228795 placement
function needsOpus48Fallback(e) {
  return (
    isEntitlementOverlayUnavailable() &&
    isOpus5FamilyModel(e) &&
    !getAvailabilityFallbackChain()?.some((n) => strip1mSuffix(n) === CLAUDE_OPUS_5)
  );
}
//@ chunk-hwmsct5x.js:228795-228828 placement
function normalizeRefusalModel(e) {
  return needsOpus48Fallback(e) ? CLAUDE_OPUS_4_8 : e;
}
//@ chunk-hwmsct5x.js:228828-229164 placement
/**
 * 计算当前模型被安全机制拒绝时可换用的备用模型链（受目录标志、设置与 provider 限制）。
 */
function getRefusalFallbackChain(e) {
  let canonicalName = getCanonicalName(e);
  if ((isMythosModel(canonicalName) || neverMitigated(canonicalName)) && !isCatalogModelEnabled(e)) return;
  if (
    modelSupportsCapability(canonicalName, "refusal_fallback", e) === false ||
    isCapabilityEnabled("no_refusal_fallback", canonicalName, e)
  )
    return;
  if (
    !isCapabilityEnabled("refusal_fallback", canonicalName, e) &&
    (isCatalogSuppressed() || isRecognizedCanonical(canonicalName)) &&
    !isFableModel(canonicalName) &&
    !needsFableMitigations(canonicalName, e) &&
    !isClaudeOpus5Alias(canonicalName) &&
    !isPinnedFableModel(e) &&
    !isCatalogModelEnabled(e)
  )
    return;
  if (!usesFirstPartyModelIds()) return resolveFamilyDefaultModel(CLAUDE_OPUS_4_8);
  let s = normalizeRefusalModel(getRefusalFallbackOpusModel());
  if (!isNonCustomOpusModel(getCanonicalName(s))) return;
  if (/\[1m\]/i.test(e)) return s;
  return strip1mTag(s);
}
//@ chunk-hwmsct5x.js:229164-229199 placement
function isCatalogModelEnabled(e) {
  return !isCatalogSuppressed() && isInLoggiaRoster(e);
}
//@ chunk-hwmsct5x.js:229199-229255 placement
function isCapabilityEnabled(e, canonicalName, r) {
  return isCatalogSuppressed()
    ? modelSupportsCapability(canonicalName, e, r) === true
    : isModelCapabilityEnabled(e, canonicalName, r);
}
//@ chunk-hwmsct5x.js:229255-229412 placement
function admittedFallbackModel(refusalFallbackChain, n) {
  if (refusalFallbackChain === undefined) return;
  let r = (s) => !isModelDenied(s, getModelEntitlementDenySet()) && isModelAdmittedByAvailableModels(s);
  if (r(refusalFallbackChain)) return refusalFallbackChain;
  if (n === "exact") return;
  return getRefusalFallbackOpusLineupIds().find(
    (s) => isNonCustomOpusModel(getCanonicalName(s)) && !needsOpus48Fallback(s) && r(s),
  );
}
//@ chunk-hwmsct5x.js:229412-229684 placement
function pickFallbackModel(e) {
  let armedFallbackModel = e.armedFallbackModel;
  if (
    armedFallbackModel !== undefined &&
    strippedCanonicalName(armedFallbackModel) === strippedCanonicalName(e.mappedTarget) &&
    !triedModelIncludes(e.triedModels, armedFallbackModel)
  )
    return armedFallbackModel;
  let catalogEntry = getCatalogEntry(e.mappedTarget);
  if (catalogEntry === undefined) return;
  let s = admittedFallbackModel(
    usesFirstPartyModelIds()
      ? normalizeRefusalModel(catalogEntry.id)
      : resolveFamilyDefaultModel(catalogEntry.id),
    "exact",
  );
  return s === undefined || triedModelIncludes(e.triedModels, s)
    ? undefined
    : preserve1mContextForRefusalFallback(e.refusingModel, s);
}
//@ chunk-hwmsct5x.js:229684-229829 placement
function canFallBackFrom(currentModel) {
  return (
    hasRefusalFallbackTarget(currentModel) &&
    findFirstResolvableStage(refusalLineupModels(getCanonicalName(currentModel)), (mappedTarget) =>
      pickFallbackModel({
        mappedTarget,
        armedFallbackModel: undefined,
        refusingModel: currentModel,
        triedModels: [canonicalModelKey(currentModel)],
      }),
    ) !== undefined
  );
}
//@ chunk-hwmsct5x.js:229829-230245 placement
function logFallbackRouteDeclined({ model, armedFallbackModel, apiRefusalCategory, requestId, decline }) {
  logEvent("tengu_refusal_fallback_route_declined", {
    request_id: sanitizeMarkName(requestId),
    model: telemetrySafeModelName(model),
    armed_fallback_model: telemetrySafeModelName(armedFallbackModel),
    reason: fromEnum(decline.reason),
    ...(decline.reason !== "unmapped" && {
      chain_length: decline.chainLength,
    }),
    ...(decline.reason === "chain_entry_unresolvable" && {
      chain_entry_index: decline.chainEntryIndex,
      chain_entry: telemetrySafeModelName(decline.chainEntry),
    }),
    ...(apiRefusalCategory != null && {
      api_refusal_category: fromEnum(normalizeRefusalCategory(apiRefusalCategory)),
    }),
  });
}
//@ chunk-hwmsct5x.js:230245-230541 placement
function logSkippedChainStages({
  stages,
  chainLength,
  firstStageIndex,
  model,
  armedFallbackModel,
  apiRefusalCategory,
  requestId,
}) {
  stages.forEach((chainEntry, E) =>
    logFallbackRouteDeclined({
      model,
      armedFallbackModel,
      apiRefusalCategory,
      requestId,
      decline: {
        reason: "chain_entry_unresolvable",
        chainLength,
        chainEntryIndex: firstStageIndex + E,
        chainEntry,
      },
    }),
  );
}
//@ chunk-hwmsct5x.js:230541-231092 placement
function logFallbackRouteOutcome({ route, model, armedFallbackModel, apiRefusalCategory, requestId }) {
  let y = {
    model,
    armedFallbackModel,
    apiRefusalCategory,
    requestId,
  };
  switch (route.matched) {
    case "catch_all":
      return;
    case "category":
      logSkippedChainStages({
        ...y,
        stages: route.skippedStages,
        chainLength: route.chainLength,
        firstStageIndex: 1,
      });
      return;
    case "none":
      if (route.reason === "unmapped") {
        logFallbackRouteDeclined({
          ...y,
          decline: {
            reason: "unmapped",
          },
        });
        return;
      }
      logSkippedChainStages({
        ...y,
        stages: route.skippedStages,
        chainLength: route.chainLength,
        firstStageIndex: 1,
      });
      logFallbackRouteDeclined({
        ...y,
        decline: {
          reason: "mapped_target_unresolvable",
          chainLength: route.chainLength,
        },
      });
      return;
  }
}
//@ chunk-hwmsct5x.js:231092-231152 placement
var modelOrModelListSchema = DoctorLazy(() =>
  record(string(), union([string().min(1), array(string().min(1)).min(1)])),
);
//@ chunk-hwmsct5x.js:231152-231245 placement
class ParsedModelCache {
  parsed = undefined;
  remember(raw, value) {
    this.parsed = {
      raw,
      value,
    };
  }
  reset() {
    this.parsed = undefined;
  }
}
//@ chunk-hwmsct5x.js:231245-231259 placement
var parsedModelCache = new ParsedModelCache();
//@ chunk-hwmsct5x.js:231259-231281 placement
/**
 * 导出函数 `noopDialogHost`。
 */
function noopDialogHost() {
  return;
}
//@ chunk-hwmsct5x.js:231281-231320 placement
function isSameModel(e, n) {
  return strippedCanonicalName(e) === strippedCanonicalName(n);
}
//@ chunk-hwmsct5x.js:231320-231349 placement
function canonicalModelKey(model) {
  return strippedCanonicalName(model);
}
//@ chunk-hwmsct5x.js:231349-231391 placement
function triedModelIncludes(triedModels, n) {
  return triedModels.includes(strippedCanonicalName(n));
}
//@ chunk-hwmsct5x.js:231391-231556 placement
/**
 * 安全拒绝时展示的帮助文章 URL：网络风险（cyber）专用、模型相关与通用三种。
 */
var CYBER_SAFEGUARDS_ARTICLE_URL = "https://support.claude.com/en/articles/16049681";
var SAFEGUARDS_MODEL_ARTICLE_URL = "https://support.claude.com/en/articles/15363606";
var SAFEGUARDS_DEFAULT_ARTICLE_URL = "https://support.claude.com/en/articles/8106465";
//@ chunk-hwmsct5x.js:231556-231616 placement
function usesSecondSafeguardsArticle(e) {
  let canonicalName = getCanonicalName(e);
  return isFableModel(canonicalName) || isFableFamilyValue(e) || isPinnedFableModel(e) || false;
}
//@ chunk-hwmsct5x.js:231616-231681 placement
function usesCyberSafeguardsArticle(e) {
  let n = strip1mTag(getCanonicalName(e));
  return n === "claude-opus-5" || isClaudeOpus5Alias(n);
}
//@ chunk-hwmsct5x.js:231681-231770 placement
function getSafeguardsArticleUrl(e) {
  if (e == null) return SAFEGUARDS_DEFAULT_ARTICLE_URL;
  if (usesCyberSafeguardsArticle(e)) return CYBER_SAFEGUARDS_ARTICLE_URL;
  if (usesSecondSafeguardsArticle(e)) return SAFEGUARDS_MODEL_ARTICLE_URL;
  return SAFEGUARDS_DEFAULT_ARTICLE_URL;
}
//@ chunk-hwmsct5x.js:231770-231889 placement
function buildSafeguardsLearnMore(e) {
  let safeguardsArticleUrl = getSafeguardsArticleUrl(e);
  return isFeedbackAllowed()
    ? `Send feedback with /feedback or learn more: ${safeguardsArticleUrl}`
    : `You can learn more: ${safeguardsArticleUrl}`;
}
//@ chunk-hwmsct5x.js:239172-239231 placement
function canShowRefusalDialog() {
  return (
    isSdkDialogHostActive() && !(getSdkSupportedDialogKinds() ?? []).includes(REFUSAL_FALLBACK_DIALOG.kind)
  );
}
//@ chunk-hwmsct5x.js:239231-239296 placement
function getSwitchModelsOnFlagSetting() {
  return Boolean(resolveSetting("switchModelsOnFlag", true).value);
}
//@ chunk-hwmsct5x.js:239296-239562 placement
function getFallbackDialogSkipReason(e) {
  if (e.silentAttempt) return "silent_ab";
  if (!e.isMainThread) return "subagent";
  if (e.requestDialog === undefined) return "no_dialog_host";
  if (resolveSetting("switchModelsOnFlag", true).value) return "setting";
  if (e.consumerLacksDialogCapability) return "no_consumer_capability";
  return;
}
//@ chunk-hwmsct5x.js:239562-239701 placement
function shouldSilentlyDeclineFallback(e) {
  return (
    e.isMainThread &&
    (e.requestDialog === undefined || e.consumerLacksDialogCapability) &&
    resolveSetting("switchModelsOnFlag", true).value === false
  );
}
//@ chunk-hwmsct5x.js:239701-239762 placement
/**
 * 导出函数 `isSwitchModelsOnFlagDisabled`：返回 resolveSetting("switchModelsOnFlag", !0).value === !1。
 */
function isSwitchModelsOnFlagDisabled() {
  return resolveSetting("switchModelsOnFlag", true).value === false;
}
//@ chunk-hwmsct5x.js:239762-239968 placement
function getThirdPartyFallbackHint() {
  if (usesFirstPartyModelIds()) return;
  return "To enable automatic fallback on this provider, set `ANTHROPIC_DEFAULT_FABLE_MODEL` to your Fable model ID and `ANTHROPIC_DEFAULT_OPUS_MODEL` to your Opus 4.8 model ID.";
}
//@ chunk-hwmsct5x.js:239968-240048 placement
/**
 * 导出函数 `refusalFallbackDialog`：参数 e, n，返回 e。
 */
function refusalFallbackDialog(dialog, n) {
  if (dialog === undefined || !dialog.supportsKind(REFUSAL_FALLBACK_DIALOG.kind) || !n()) return;
  return dialog;
}
//@ chunk-hwmsct5x.js:240048-240940 placement
/**
 * 弹出（或经 Remote Control 转发）"消息被安全机制标记，是否换用备用模型/编辑重试"的对话框并等待选择，处理超时与排队取消。
 */
async function requestRefusalFallbackChoice(e) {
  let { requestDialog, signal, bridgeDialog, payload, telemetry } = e;
  if (bridgeDialog && e.hasQueuedPrompts()) {
    logEvent("tengu_request_user_dialog_implicit_cancel", {
      dialog_kind: shortHash(REFUSAL_FALLBACK_DIALOG.kind),
      reason: fromEnum("queued_at_park"),
      lane: lit("repl_bridge"),
    });
    logFeatureBad("refusal_fallback", "dialog_queued_at_park");
    return "cancelled";
  }
  logEvent("tengu_refusal_fallback_prompt_shown", {
    ...telemetry,
    ...e.shownExtras,
  });
  let w = bridgeDialog
    ? await requestUserDialogRaced({
        requestDialog,
        dialog: REFUSAL_FALLBACK_DIALOG,
        payload,
        signal,
        bridge: bridgeDialog,
        parkTimeoutMs: getUserDialogTimeoutMs(),
        onForwarded: (S) =>
          logEvent("tengu_refusal_fallback_bridge_forwarded", {
            ...telemetry,
            bridge_request_id: sanitizeMarkName(S),
          }),
      })
    : {
        result: await requestDialog(REFUSAL_FALLBACK_DIALOG, payload, {
          signal,
          localOnly: true,
        }),
        source: "local",
      };
  if (w.source === "timeout") {
    logEvent("tengu_refusal_fallback_bridge_timeout", telemetry);
    logFeatureBad("refusal_fallback", "dialog_bridge_timeout");
  }
  if (w.result !== "cancelled")
    logEvent("tengu_refusal_fallback_prompt_choice", {
      ...telemetry,
      choice: fromEnum(w.result),
      source: fromEnum(w.source === "bridge" ? "bridge" : "local"),
    });
  return w.result;
}
export {
  classifyFallbackOrigin,
  getUserDialogTimeoutMs,
  isRefusalFallbackEnabled,
  buildSafeguardsLearnMore,
  resolveRefusalFallbackRoute,
  isSameModel,
  pickFallbackModel,
  canonicalModelKey,
  noopDialogHost,
  logFallbackRouteOutcome,
  describeFallbackRoute,
  hasRefusalFallbackTarget,
  isSwitchModelsOnFlagDisabled,
  setRemoteFallbackLatch,
  findFirstResolvableStage,
  logSkippedChainStages,
  canShowRefusalDialog,
  refusalFallbackDialog,
  refusalRouteLimit,
  getFallbackDialogSkipReason,
  normalizeRefusalCategory,
  requestRefusalFallbackChoice,
  getThirdPartyFallbackHint,
  getSwitchModelsOnFlagSetting,
  getSafeguardsArticleUrl,
  isHardRefusalCategory,
  isInRefusalLineup,
  walkDownOpusLineup,
  noRefusalFallbackOpusModel,
  everyLineupModelAdmitted,
  shouldSilentlyDeclineFallback,
  canFallBackFrom,
  isAutoSwitchOnFlagEnabled,
  SAFEGUARDS_MODEL_ARTICLE_URL,
  SAFEGUARDS_DEFAULT_ARTICLE_URL,
  CYBER_SAFEGUARDS_ARTICLE_URL,
  usesSecondSafeguardsArticle,
};
