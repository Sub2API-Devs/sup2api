/**
 * services/api/refusalFallback.ts
 *
 * 2.1.316 新增：安全拒绝后的备用模型链解析、切换对话框与遥测
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-vn3g7zt8.js (59)
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
import { record, stringSchema, union, array } from "../../../vendor/zod/v4/classic/schemas.js";
import { isFeedbackAllowed } from "../../commands/feedback/feedbackPolicy.js";
import { shortHash } from "../../utils/shortHash.js";
import { logFeatureBad } from "../analytics/featureTelemetry.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-vn3g7zt8.js:225479-225503 placement
function isClaudeOpus5Alias(model) {
  return false;
}
//@ chunk-vn3g7zt8.js:225503-225549 placement
function isHardRefusalCategory(category) {
  return category === "cyber" || category === "bio";
}
//@ chunk-vn3g7zt8.js:225549-225618 placement
function isExtraHardRefusalCategory(category) {
  return category === "frontier_llm" || category === "reasoning_extraction";
}
//@ chunk-vn3g7zt8.js:225618-225665 placement
function normalizeRefusalCategory(category) {
  return isHardRefusalCategory(category) || isExtraHardRefusalCategory(category) ? category : "other";
}
//@ chunk-vn3g7zt8.js:225665-225970 placement
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
//@ chunk-vn3g7zt8.js:225970-226200 placement
function refusalLineupFor(primaryModel) {
  if (isClaudeOpus5Alias(primaryModel)) return OPUS5_ALIAS_ROUTES;
  if (primaryModel === "claude-opus-5-5" || primaryModel === "claude-opus-5-5[1m]") return OPUS55_ROUTES;
  if (primaryModel === "claude-opus-5" || primaryModel === "claude-opus-5[1m]") return OPUS5_ROUTES;
  if (primaryModel === "claude-sonnet-5-5" || primaryModel === "claude-sonnet-5-5[1m]")
    return SONNET55_ROUTES;
  return TWO_LANE_ROUTES;
}
//@ chunk-vn3g7zt8.js:226200-226263 placement
function refusalLineupModels(primaryModel) {
  return Object.values(refusalLineupFor(primaryModel)).flatMap((model) => limitRouteModels(model));
}
//@ chunk-vn3g7zt8.js:226263-226273 placement
var CATCH_ALL_REFUSAL_FALLBACK = false;
//@ chunk-vn3g7zt8.js:226273-226379 placement
function isRefusalCatchAllEnabled() {
  let envClaudeCodeRefusalFallbackCatchAll = process.env.CLAUDE_CODE_REFUSAL_FALLBACK_CATCH_ALL;
  if (isEnvDefinedFalsy(envClaudeCodeRefusalFallbackCatchAll)) return false;
  return isEnvTruthy(envClaudeCodeRefusalFallbackCatchAll) || CATCH_ALL_REFUSAL_FALLBACK;
}
//@ chunk-vn3g7zt8.js:226379-226798 placement
function describeFallbackRoute(route, refusalFallbackCascadeHop) {
  if (refusalFallbackCascadeHop !== undefined)
    return {
      routeMatched: "chain",
      cascadeHopIndex: refusalFallbackCascadeHop.index,
      cascadeChainLength: refusalFallbackCascadeHop.length,
    };
  if (route === undefined)
    return {
      routeMatched: null,
    };
  if (route.matched === "category")
    return {
      routeMatched: "category",
      remainingChain: route.remainingChain,
      cascadeHopIndex: 1,
      cascadeChainLength: route.chainLength,
    };
  if (route.matched === "catch_all")
    return {
      routeMatched: "catch_all",
      cascadeHopIndex: 1,
      cascadeChainLength: 1,
    };
  return {
    routeMatched: null,
  };
}
//@ chunk-vn3g7zt8.js:226798-226859 placement
function limitRouteModels(models) {
  return (typeof models === "string" ? [models] : models).slice(0, REFUSAL_FALLBACK_ROUTES);
}
//@ chunk-vn3g7zt8.js:226859-227036 placement
function findFirstResolvableStage(chain, resolveStage) {
  return chain.reduce((acc, acc2, index) => {
    if (acc !== undefined) return acc;
    let models = resolveStage(acc2);
    return models === undefined
      ? undefined
      : {
          model: models,
          skippedStages: chain.slice(0, index),
          remainingChain: chain.slice(index + 1),
        };
  }, undefined);
}
//@ chunk-vn3g7zt8.js:227036-227632 placement
/**
 * 按拒绝类别（cyber/bio/frontier_llm…）查找备用模型链，返回匹配方式（category/catch_all/unmapped）与剩余链。
 */
function resolveRefusalFallbackRoute(options) {
  let { originalModelCanonical, apiRefusalCategory } = options;
  let chain = options.routesOverride ?? refusalLineupFor(originalModelCanonical);
  let picked =
    apiRefusalCategory != null && Object.hasOwn(chain, apiRefusalCategory)
      ? chain[apiRefusalCategory]
      : undefined;
  if (picked !== undefined) {
    let limited = limitRouteModels(picked);
    let firstResolvableStage = findFirstResolvableStage(limited, options.resolveTarget);
    if (firstResolvableStage !== undefined)
      return {
        matched: "category",
        model: firstResolvableStage.model,
        remainingChain: firstResolvableStage.remainingChain,
        skippedStages: firstResolvableStage.skippedStages,
        chainLength: limited.length,
      };
    return {
      matched: "none",
      model: undefined,
      reason: "mapped_target_unresolvable",
      skippedStages: limited.slice(0, -1),
      chainLength: limited.length,
    };
  }
  if (isRefusalCatchAllEnabled() && !options.armedTargetIsRefusingModel)
    return {
      matched: "catch_all",
      model: options.armedFallbackModel,
    };
  return {
    matched: "none",
    model: undefined,
    reason: "unmapped",
  };
}
//@ chunk-vn3g7zt8.js:231019-231093 placement
function getUserDialogTimeoutMs() {
  return (
    env.CLAUDE_CODE_USER_DIALOG_TIMEOUT_MS ??
    getTimeoutMsForChoice(getDialogExpiry()) ??
    DEFAULT_DIALOG_TIMEOUT_MS
  );
}
//@ chunk-vn3g7zt8.js:231093-231160 placement
function isRefusalFallbackEnabled() {
  return !env.CLAUDE_CODE_DISABLE_REFUSAL_FALLBACK && !isNoModelFallbackEnabled();
}
//@ chunk-vn3g7zt8.js:231160-231235 placement
function isAutoSwitchOnFlagEnabled() {
  return (
    isRefusalFallbackEnabled() &&
    resolveSetting("switchModelsOnFlag", true).value &&
    isFirstPartyApiBackend() &&
    !alwaysFalseRefusalFallback()
  );
}
//@ chunk-vn3g7zt8.js:231235-231258 placement
function alwaysFalseRefusalFallback() {
  return false;
}
//@ chunk-vn3g7zt8.js:231258-231291 placement
/**
 * 导出函数 `noRefusalFallbackOpusModel`：返回 isModelAdmittedByAvailableModels(enforcementRefusalFallbackOpusModel())。
 */
function noRefusalFallbackOpusModel() {
  return isModelAdmittedByAvailableModels(enforcementRefusalFallbackOpusModel());
}
//@ chunk-vn3g7zt8.js:231291-231343 placement
/**
 * 导出函数 `everyLineupModelAdmitted`：参数 e，返回 Si(strippedCanonicalName(e)).every((n) => isModelAdmittedByAvailableModels(n))。
 */
function everyLineupModelAdmitted(primaryModel) {
  return refusalLineupModels(strippedCanonicalName(primaryModel)).every((model) =>
    isModelAdmittedByAvailableModels(model),
  );
}
//@ chunk-vn3g7zt8.js:231343-231404 placement
/**
 * 导出函数 `isInRefusalLineup`：参数 e, n，返回 !isSameModel(e, n) && Si(strippedCanonicalName(e)).includes(strippedCanonicalName(n))。
 */
function isInRefusalLineup(model, model_2) {
  return (
    !isSameModel(model, model_2) &&
    refusalLineupModels(strippedCanonicalName(model)).includes(strippedCanonicalName(model_2))
  );
}
//@ chunk-vn3g7zt8.js:231404-231553 placement
function classifyFallbackOrigin(model) {
  let canonicalName = getCanonicalName(model);
  if (
    isModelCapabilityEnabled("refusal_fallback", canonicalName, model) &&
    !isFableModel(canonicalName) &&
    !needsFableMitigations(canonicalName, model) &&
    !isPinnedFableModel(model)
  )
    return "catalog_flag";
  if (isInLoggiaRoster(model)) return "gb_listed";
  return "other";
}
//@ chunk-vn3g7zt8.js:231553-231981 placement
function resolveFamilyDefaultModel(canonical) {
  let family = getCatalogEntry(canonical)?.family;
  let defaults = {
    opus: env.ANTHROPIC_DEFAULT_OPUS_MODEL,
    sonnet: env.ANTHROPIC_DEFAULT_SONNET_MODEL,
    haiku: env.ANTHROPIC_DEFAULT_HAIKU_MODEL,
  };
  let fallback = family !== undefined && Object.hasOwn(defaults, family) ? defaults[family] : undefined;
  if (fallback) {
    let canonicalName = getCanonicalName(fallback);
    return canonicalName.startsWith("claude-") && getCatalogEntry(canonicalName)?.family !== family
      ? undefined
      : fallback;
  }
  return getEnabledModelOptions()
    .map((entry) => entry.value)
    .filter((value) => typeof value === "string" && value.length > 0)
    .map((value) => value.replace(/\[1m\]$/, ""))
    .find((model) => getCanonicalName(model).replace(/\[1m\]$/, "") === canonical);
}
//@ chunk-vn3g7zt8.js:231981-232074 placement
function walkDownOpusLineup(model) {
  let walked = admittedFallbackModel(getRefusalFallbackChain(model), "walk_down_opus_lineup");
  if (walked === undefined) return;
  return preserve1mContextForRefusalFallback(model, walked);
}
//@ chunk-vn3g7zt8.js:232074-232083 placement
var DEFAULT_REFUSAL_ROUTES = 2;
//@ chunk-vn3g7zt8.js:232083-232108 placement
/**
 * 导出函数 `refusalRouteLimit`：返回 _b。
 */
function refusalRouteLimit() {
  return DEFAULT_REFUSAL_ROUTES;
}
//@ chunk-vn3g7zt8.js:232108-232146 placement
function hasRefusalFallbackTarget(model) {
  return getRefusalFallbackChain(model) !== undefined;
}
//@ chunk-vn3g7zt8.js:232146-232190 placement
var CLAUDE_OPUS_4_8 = "claude-opus-4-8";
var CLAUDE_OPUS_5 = "claude-opus-5";
//@ chunk-vn3g7zt8.js:232190-232241 placement
function setRemoteFallbackLatch(latch) {
  setAvailabilityFallbackChain(env.CLAUDE_CODE_REMOTE ? latch : undefined);
}
//@ chunk-vn3g7zt8.js:232241-232308 placement
function needsOpus48Fallback(model) {
  return (
    isEntitlementOverlayUnavailable() &&
    isOpus5FamilyModel(model) &&
    !getAvailabilityFallbackChain()?.some((model) => strip1mSuffix(model) === CLAUDE_OPUS_5)
  );
}
//@ chunk-vn3g7zt8.js:232308-232341 placement
function normalizeRefusalModel(model) {
  return needsOpus48Fallback(model) ? CLAUDE_OPUS_4_8 : model;
}
//@ chunk-vn3g7zt8.js:232341-232677 placement
/**
 * 计算当前模型被安全机制拒绝时可换用的备用模型链（受目录标志、设置与 provider 限制）。
 */
function getRefusalFallbackChain(model) {
  let canonicalName = getCanonicalName(model);
  if ((isMythosModel(canonicalName) || neverMitigated(canonicalName)) && !isCatalogModelEnabled(model))
    return;
  if (
    modelSupportsCapability(canonicalName, "refusal_fallback", model) === false ||
    isCapabilityEnabled("no_refusal_fallback", canonicalName, model)
  )
    return;
  if (
    !isCapabilityEnabled("refusal_fallback", canonicalName, model) &&
    (isCatalogSuppressed() || isRecognizedCanonical(canonicalName)) &&
    !isFableModel(canonicalName) &&
    !needsFableMitigations(canonicalName, model) &&
    !isClaudeOpus5Alias(canonicalName) &&
    !isPinnedFableModel(model) &&
    !isCatalogModelEnabled(model)
  )
    return;
  if (!usesFirstPartyModelIds()) return resolveFamilyDefaultModel(CLAUDE_OPUS_4_8);
  let opus = normalizeRefusalModel(getRefusalFallbackOpusModel());
  if (!isNonCustomOpusModel(getCanonicalName(opus))) return;
  if (/\[1m\]/i.test(model)) return opus;
  return strip1mTag(opus);
}
//@ chunk-vn3g7zt8.js:232677-232712 placement
function isCatalogModelEnabled(model) {
  return !isCatalogSuppressed() && isInLoggiaRoster(model);
}
//@ chunk-vn3g7zt8.js:232712-232768 placement
function isCapabilityEnabled(model, capability, option) {
  return isCatalogSuppressed()
    ? modelSupportsCapability(capability, model, option) === true
    : isModelCapabilityEnabled(model, capability, option);
}
//@ chunk-vn3g7zt8.js:232768-232925 placement
function admittedFallbackModel(model, reason) {
  if (model === undefined) return;
  let admit = (model) =>
    !isModelDenied(model, getModelEntitlementDenySet()) && isModelAdmittedByAvailableModels(model);
  if (admit(model)) return model;
  if (reason === "exact") return;
  return getRefusalFallbackOpusLineupIds().find(
    (model) => isNonCustomOpusModel(getCanonicalName(model)) && !needsOpus48Fallback(model) && admit(model),
  );
}
//@ chunk-vn3g7zt8.js:232925-233197 placement
function pickFallbackModel(options) {
  let armedFallbackModel = options.armedFallbackModel;
  if (
    armedFallbackModel !== undefined &&
    strippedCanonicalName(armedFallbackModel) === strippedCanonicalName(options.mappedTarget) &&
    !triedModelIncludes(options.triedModels, armedFallbackModel)
  )
    return armedFallbackModel;
  let catalogEntry = getCatalogEntry(options.mappedTarget);
  if (catalogEntry === undefined) return;
  let admitted = admittedFallbackModel(
    usesFirstPartyModelIds()
      ? normalizeRefusalModel(catalogEntry.id)
      : resolveFamilyDefaultModel(catalogEntry.id),
    "exact",
  );
  return admitted === undefined || triedModelIncludes(options.triedModels, admitted)
    ? undefined
    : preserve1mContextForRefusalFallback(options.refusingModel, admitted);
}
//@ chunk-vn3g7zt8.js:233197-233342 placement
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
//@ chunk-vn3g7zt8.js:233342-233758 placement
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
//@ chunk-vn3g7zt8.js:233758-234054 placement
function logSkippedChainStages({
  stages,
  chainLength,
  firstStageIndex,
  model,
  armedFallbackModel,
  apiRefusalCategory,
  requestId,
}) {
  stages.forEach((chainEntry, index) =>
    logFallbackRouteDeclined({
      model,
      armedFallbackModel,
      apiRefusalCategory,
      requestId,
      decline: {
        reason: "chain_entry_unresolvable",
        chainLength,
        chainEntryIndex: firstStageIndex + index,
        chainEntry,
      },
    }),
  );
}
//@ chunk-vn3g7zt8.js:234054-234605 placement
function logFallbackRouteOutcome({ route, model, armedFallbackModel, apiRefusalCategory, requestId }) {
  let stage = {
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
        ...stage,
        stages: route.skippedStages,
        chainLength: route.chainLength,
        firstStageIndex: 1,
      });
      return;
    case "none":
      if (route.reason === "unmapped") {
        logFallbackRouteDeclined({
          ...stage,
          decline: {
            reason: "unmapped",
          },
        });
        return;
      }
      logSkippedChainStages({
        ...stage,
        stages: route.skippedStages,
        chainLength: route.chainLength,
        firstStageIndex: 1,
      });
      logFallbackRouteDeclined({
        ...stage,
        decline: {
          reason: "mapped_target_unresolvable",
          chainLength: route.chainLength,
        },
      });
      return;
  }
}
//@ chunk-vn3g7zt8.js:234605-234665 placement
var modelOrModelListSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-vn3g7zt8.js:234605", () => {
  modelOrModelListSchema = DoctorLazy(() =>
    record(stringSchema(), union([stringSchema().min(1), array(stringSchema().min(1)).min(1)])),
  );
});
//@ chunk-vn3g7zt8.js:234665-234758 placement
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
//@ chunk-vn3g7zt8.js:234758-234772 placement
var parsedModelCache; // deferred: uses ParsedModelCache of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-vn3g7zt8.js:234758", () => {
  parsedModelCache = new ParsedModelCache();
});
//@ chunk-vn3g7zt8.js:234772-234794 placement
/**
 * 导出函数 `noopDialogHost`。
 */
function noopDialogHost() {
  return;
}
//@ chunk-vn3g7zt8.js:234794-234833 placement
function isSameModel(a, b) {
  return strippedCanonicalName(a) === strippedCanonicalName(b);
}
//@ chunk-vn3g7zt8.js:234833-234862 placement
function canonicalModelKey(model) {
  return strippedCanonicalName(model);
}
//@ chunk-vn3g7zt8.js:234862-234904 placement
function triedModelIncludes(triedModels, tried) {
  return triedModels.includes(strippedCanonicalName(tried));
}
//@ chunk-vn3g7zt8.js:234904-235069 placement
/**
 * 安全拒绝时展示的帮助文章 URL：网络风险（cyber）专用、模型相关与通用三种。
 */
var CYBER_SAFEGUARDS_ARTICLE_URL = "https://support.claude.com/en/articles/16049681";
var SAFEGUARDS_MODEL_ARTICLE_URL = "https://support.claude.com/en/articles/15363606";
var SAFEGUARDS_DEFAULT_ARTICLE_URL = "https://support.claude.com/en/articles/8106465";
//@ chunk-vn3g7zt8.js:235069-235129 placement
function usesSecondSafeguardsArticle(model) {
  let canonicalName = getCanonicalName(model);
  return isFableModel(canonicalName) || isFableFamilyValue(model) || isPinnedFableModel(model) || false;
}
//@ chunk-vn3g7zt8.js:235129-235194 placement
function usesCyberSafeguardsArticle(model) {
  let canonical = strip1mTag(getCanonicalName(model));
  return canonical === "claude-opus-5" || isClaudeOpus5Alias(canonical);
}
//@ chunk-vn3g7zt8.js:235194-235283 placement
function getSafeguardsArticleUrl(model) {
  if (model == null) return SAFEGUARDS_DEFAULT_ARTICLE_URL;
  if (usesCyberSafeguardsArticle(model)) return CYBER_SAFEGUARDS_ARTICLE_URL;
  if (usesSecondSafeguardsArticle(model)) return SAFEGUARDS_MODEL_ARTICLE_URL;
  return SAFEGUARDS_DEFAULT_ARTICLE_URL;
}
//@ chunk-vn3g7zt8.js:235283-235402 placement
function buildSafeguardsLearnMore(model) {
  let safeguardsArticleUrl = getSafeguardsArticleUrl(model);
  return isFeedbackAllowed()
    ? `Send feedback with /feedback or learn more: ${safeguardsArticleUrl}`
    : `You can learn more: ${safeguardsArticleUrl}`;
}
//@ chunk-vn3g7zt8.js:242725-242784 placement
function canShowRefusalDialog() {
  return (
    isSdkDialogHostActive() && !(getSdkSupportedDialogKinds() ?? []).includes(REFUSAL_FALLBACK_DIALOG.kind)
  );
}
//@ chunk-vn3g7zt8.js:242784-242849 placement
function getSwitchModelsOnFlagSetting() {
  return Boolean(resolveSetting("switchModelsOnFlag", true).value);
}
//@ chunk-vn3g7zt8.js:242849-243115 placement
function getFallbackDialogSkipReason(reason) {
  if (reason.silentAttempt) return "silent_ab";
  if (!reason.isMainThread) return "subagent";
  if (reason.requestDialog === undefined) return "no_dialog_host";
  if (resolveSetting("switchModelsOnFlag", true).value) return "setting";
  if (reason.consumerLacksDialogCapability) return "no_consumer_capability";
  return;
}
//@ chunk-vn3g7zt8.js:243115-243272 placement
function shouldSilentlyDeclineFallback(options) {
  return (
    (options.isAgentThread ||
      (options.isMainThread &&
        (options.requestDialog === undefined || options.consumerLacksDialogCapability))) &&
    resolveSetting("switchModelsOnFlag", true).value === false
  );
}
//@ chunk-vn3g7zt8.js:243272-243333 placement
/**
 * 导出函数 `isSwitchModelsOnFlagDisabled`：返回 resolveSetting("switchModelsOnFlag", !0).value === !1。
 */
function isSwitchModelsOnFlagDisabled() {
  return resolveSetting("switchModelsOnFlag", true).value === false;
}
//@ chunk-vn3g7zt8.js:243333-243539 placement
function getThirdPartyFallbackHint() {
  if (usesFirstPartyModelIds()) return;
  return "To enable automatic fallback on this provider, set `ANTHROPIC_DEFAULT_FABLE_MODEL` to your Fable model ID and `ANTHROPIC_DEFAULT_OPUS_MODEL` to your Opus 4.8 model ID.";
}
//@ chunk-vn3g7zt8.js:243539-243619 placement
/**
 * 导出函数 `refusalFallbackDialog`：参数 e, n，返回 e。
 */
function refusalFallbackDialog(dialog, sourceDialog) {
  if (dialog === undefined || !dialog.supportsKind(REFUSAL_FALLBACK_DIALOG.kind) || !sourceDialog()) return;
  return dialog;
}
//@ chunk-vn3g7zt8.js:243619-244511 placement
/**
 * 弹出（或经 Remote Control 转发）"消息被安全机制标记，是否换用备用模型/编辑重试"的对话框并等待选择，处理超时与排队取消。
 */
async function requestRefusalFallbackChoice(options) {
  let { requestDialog, signal, bridgeDialog, payload, telemetry } = options;
  if (bridgeDialog && options.hasQueuedPrompts()) {
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
    ...options.shownExtras,
  });
  let dialog = bridgeDialog
    ? await requestUserDialogRaced({
        requestDialog,
        dialog: REFUSAL_FALLBACK_DIALOG,
        payload,
        signal,
        bridge: bridgeDialog,
        parkTimeoutMs: getUserDialogTimeoutMs(),
        onForwarded: (result) =>
          logEvent("tengu_refusal_fallback_bridge_forwarded", {
            ...telemetry,
            bridge_request_id: sanitizeMarkName(result),
          }),
      })
    : {
        result: await requestDialog(REFUSAL_FALLBACK_DIALOG, payload, {
          signal,
          localOnly: true,
        }),
        source: "local",
      };
  if (dialog.source === "timeout") {
    logEvent("tengu_refusal_fallback_bridge_timeout", telemetry);
    logFeatureBad("refusal_fallback", "dialog_bridge_timeout");
  }
  if (dialog.result !== "cancelled")
    logEvent("tengu_refusal_fallback_prompt_choice", {
      ...telemetry,
      choice: fromEnum(dialog.result),
      source: fromEnum(dialog.source === "bridge" ? "bridge" : "local"),
    });
  return dialog.result;
}
export {
  resolveRefusalFallbackRoute,
  isSameModel,
  pickFallbackModel,
  canonicalModelKey,
  noopDialogHost,
  logFallbackRouteOutcome,
  describeFallbackRoute,
  hasRefusalFallbackTarget,
  isRefusalFallbackEnabled,
  isSwitchModelsOnFlagDisabled,
  classifyFallbackOrigin,
  getUserDialogTimeoutMs,
  normalizeRefusalCategory,
  getSafeguardsArticleUrl,
  buildSafeguardsLearnMore,
  isHardRefusalCategory,
  getFallbackDialogSkipReason,
  isInRefusalLineup,
  walkDownOpusLineup,
  noRefusalFallbackOpusModel,
  everyLineupModelAdmitted,
  shouldSilentlyDeclineFallback,
  canFallBackFrom,
  isAutoSwitchOnFlagEnabled,
  setRemoteFallbackLatch,
  getSwitchModelsOnFlagSetting,
  findFirstResolvableStage,
  logSkippedChainStages,
  canShowRefusalDialog,
  refusalFallbackDialog,
  refusalRouteLimit,
  requestRefusalFallbackChoice,
  getThirdPartyFallbackHint,
  SAFEGUARDS_MODEL_ARTICLE_URL,
  SAFEGUARDS_DEFAULT_ARTICLE_URL,
  CYBER_SAFEGUARDS_ARTICLE_URL,
  usesSecondSafeguardsArticle,
};
