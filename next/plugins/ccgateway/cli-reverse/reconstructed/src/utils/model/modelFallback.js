/**
 * utils/model/modelFallback.ts
 *
 * 2.1.316 新增：按 Bedrock 模型 id（含区域前缀）查找模型信息。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-exfmq47h.js (15)
 * attribution: placement 14, sole-consumer 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  envDefaultModel_2,
  resolveAvailableModels,
  familyDefaultFor,
  isModelAllowedUnderActiveEnforcement,
} from "./defaultModel.js";
import { parseUserSpecifiedModel, isUsageCreditsOnlyModel } from "./modelDisplay.js";
import { getDefaultMainLoopModelSetting, getDefaultHaikuModel } from "./planModeModel.js";
import { env } from "../env.js";
import {
  isModelKeyAliasOrResolved,
  strip1mSuffix,
  normalizeDottedVersion,
  parseModelId,
  isStandardVersion,
  isSameModelVersion,
} from "./modelIds.js";
import {
  markModelsConfigured,
  sessionFallbacks,
  isModelFallbackDisabled,
  isFormerHeadOrInLadder,
  primaryRungProvider,
  isFormerHeadRefused,
} from "./modelUnavailability.js";
import { ladderRungsToSend, getUserSpecifiedModelSetting } from "./smallFastModel.js";
import { getMainLoopModel, getDefaultOpusModel, getDefaultSonnetModel } from "./model.js";
import { getProviderForModel } from "./providers.js";
import { isModelAllowed } from "./modelAllowlist.js";
import { getCatalogState, catalogIdForProviderModelId, getModelCatalog_2 } from "./modelCatalog.js";
import { BEDROCK_REGION_PREFIXES } from "./bedrock.js";
import { modelClassName } from "./canonicalModelName.js";

//@ chunk-exfmq47h.js:466145-466263 placement
function isDefaultModelEnforced() {
  let envDefault = envDefaultModel_2();
  if (resolveAvailableModels(envDefault.setting, envDefault.envFamily, envDefault.concreteBaseline) !== null)
    return true;
  return familyDefaultFor(envDefault.setting) !== null;
}
//@ chunk-exfmq47h.js:466263-466293 placement
function getDefaultMainLoopModel() {
  return parseUserSpecifiedModel(getDefaultMainLoopModelSetting());
}
//@ chunk-exfmq47h.js:466293-466351 placement
function isNoModelFallbackEnabled() {
  return env.CLAUDE_CODE_NO_MODEL_FALLBACK === true;
}
//@ chunk-exfmq47h.js:466351-466712 placement
function noModelFallbackTripwire() {
  throw Error(
    "CLAUDE_CODE_NO_MODEL_FALLBACK tripwire: a model-fallback pivot was attempted " +
      "while the no-fallback guarantee is active. This branch should be unreachable \u2014 " +
      "the availability chain must be built via buildAvailabilityFallbackChain() so it collapses to [primary] under the env var. The stack trace identifies the call site.",
  );
}
//@ chunk-exfmq47h.js:466712-466961 placement
function isSubagentModelPinned(model) {
  let lower = env.CLAUDE_CODE_SUBAGENT_MODEL?.trim().toLowerCase();
  if (!lower || lower === "inherit" || lower === "default" || isModelKeyAliasOrResolved(lower)) return false;
  let pinned = strip1mSuffix(parseUserSpecifiedModel(env.CLAUDE_CODE_SUBAGENT_MODEL));
  let modelId = strip1mSuffix(model);
  let regionPrefixPattern = /^[a-z-]+\.(?=anthropic\.)/;
  return regionPrefixPattern.test(pinned)
    ? pinned === modelId
    : pinned === modelId.replace(regionPrefixPattern, "");
}
//@ chunk-exfmq47h.js:466961-467100 placement
function buildAvailabilityFallbackChain(model, configured) {
  if (isNoModelFallbackEnabled()) return [model];
  let fallbacks = configuredAvailabilityFallbacks(model, configured);
  markModelsConfigured(fallbacks);
  if (fallbacks.length === 0 && mayStepDownOnRefusal(model)) {
    let rungs = ladderRungsToSend(model);
    if (rungs.length > 0) return [model, ...rungs];
  }
  return [model, ...fallbacks];
}
//@ chunk-exfmq47h.js:467100-467166 placement
function sessionHasOwnFallback() {
  let sessionModels = sessionFallbacks();
  return (
    sessionModels.length > 0 && configuredAvailabilityFallbacks(getMainLoopModel(), sessionModels).length > 0
  );
}
//@ chunk-exfmq47h.js:467166-467227 placement
function mayStepDownOnRefusal(model) {
  return (
    !isModelFallbackDisabled() &&
    isFormerHeadOrInLadder(model) &&
    primaryRungProvider(model) === getProviderForModel(model) &&
    !isExactModelPick(model)
  );
}
//@ chunk-exfmq47h.js:467227-467382 placement
function isExactModelPick(model) {
  if (isSubagentModelPinned(model)) return true;
  let userSpecifiedModelSetting = getUserSpecifiedModelSetting();
  if (
    userSpecifiedModelSetting == null ||
    userSpecifiedModelSetting.trim().toLowerCase() === "default" ||
    isModelKeyAliasOrResolved(userSpecifiedModelSetting.trim().toLowerCase())
  )
    return false;
  return strip1mSuffix(parseUserSpecifiedModel(userSpecifiedModelSetting)) === strip1mSuffix(model);
}
//@ chunk-exfmq47h.js:467382-467478 placement
function configuredAvailabilityFallbacks(head, configured) {
  return [configured]
    .flat()
    .filter((candidate) => candidate !== undefined)
    .filter((candidate) => candidate !== "" && candidate !== head && !isFormerHeadRefused(candidate, head));
}
//@ chunk-exfmq47h.js:467478-467630 placement
function getUsageCreditsOnlyModelConsentDeclineFallback() {
  if (isNoModelFallbackEnabled()) return null;
  let defaultMainLoopModel = getDefaultMainLoopModel();
  if (!isUsageCreditsOnlyModel(defaultMainLoopModel)) return defaultMainLoopModel;
  for (let candidate of [getDefaultOpusModel(), getDefaultSonnetModel(), getDefaultHaikuModel()]) {
    if (isUsageCreditsOnlyModel(candidate)) continue;
    if (isModelAllowedUnderActiveEnforcement(candidate) ?? isModelAllowed(candidate)) return candidate;
  }
  return null;
}
//@ chunk-exfmq47h.js:467630-467806 placement
function firstPartyNameToCanonical(modelId) {
  modelId = normalizeDottedVersion(modelId.toLowerCase());
  let canonicalNameMemo = getCatalogState().canonicalNameMemo;
  let cached = canonicalNameMemo.get(modelId);
  if (cached !== undefined) return cached;
  let canonical = bedrockModelInfo(modelId);
  if (modelId.length <= 256) {
    if (canonicalNameMemo.size >= 256) canonicalNameMemo.clear();
    canonicalNameMemo.set(modelId, canonical);
  }
  return canonical;
}
//@ chunk-exfmq47h.js:467806-469506 placement
/**
 * 按 Bedrock 模型 id（含区域前缀）查找模型信息。
 */
function bedrockModelInfo(modelId) {
  let catalogId = catalogIdForProviderModelId(modelId);
  if (catalogId !== undefined) return catalogId;
  for (let prefix of BEDROCK_REGION_PREFIXES)
    if (prefix !== "us" && modelId.startsWith(`${prefix}.anthropic.`)) {
      let unprefixed = catalogIdForProviderModelId(`us${modelId.slice(prefix.length)}`);
      if (unprefixed !== undefined) return unprefixed;
      break;
    }
  let modelId_2 = parseModelId(modelId);
  if (isStandardVersion(modelId_2))
    return findModelIdWithSameVersion(modelId_2) ?? stripDateSuffix(modelId_2.base);
  if (modelId.includes("claude-fable-5-1")) return "claude-fable-5-1";
  if (modelId.includes("claude-fable-5")) return "claude-fable-5";
  if (modelId.includes("claude-mythos-5-1")) return "claude-mythos-5-1";
  if (modelId.includes("claude-mythos-5")) return "claude-mythos-5";
  if (modelId.includes("claude-opus-5-5")) return "claude-opus-5-5";
  if (modelId.includes("claude-opus-5")) return "claude-opus-5";
  if (modelId.includes("claude-opus-4-8")) return "claude-opus-4-8";
  if (modelId.includes("claude-opus-4-7")) return "claude-opus-4-7";
  if (modelId.includes("claude-opus-4-6")) return "claude-opus-4-6";
  if (modelId.includes("claude-opus-4-5")) return "claude-opus-4-5";
  if (modelId.includes("claude-opus-4-1")) return "claude-opus-4-1";
  if (/claude-opus-4(?!-\d(?!\d))/.test(modelId)) return "claude-opus-4-0";
  if (modelId.includes("claude-sonnet-5-5")) return "claude-sonnet-5-5";
  if (modelId.includes("claude-sonnet-5")) return "claude-sonnet-5";
  if (modelId.includes("claude-sonnet-4-6")) return "claude-sonnet-4-6";
  if (modelId.includes("claude-sonnet-4-5")) return "claude-sonnet-4-5";
  if (/claude-sonnet-4(?!-\d(?!\d))/.test(modelId)) return "claude-sonnet-4-0";
  if (modelId.includes("claude-haiku-5-5")) return "claude-haiku-5-5";
  if (modelId.includes("claude-haiku-4-5")) return "claude-haiku-4-5";
  if (modelId.includes("claude-3-7-sonnet")) return "claude-3-7-sonnet";
  if (modelId.includes("claude-3-5-sonnet")) return "claude-3-5-sonnet";
  if (modelId.includes("claude-3-5-haiku")) return "claude-3-5-haiku";
  if (modelId.includes("claude-3-opus")) return "claude-3-opus";
  if (modelId.includes("claude-3-sonnet")) return "claude-3-sonnet";
  if (modelId.includes("claude-3-haiku")) return "claude-3-haiku";
  return stripDateSuffix(modelId);
}
//@ chunk-exfmq47h.js:469506-469552 placement
function stripDateSuffix(modelId) {
  return modelId.replace(/-\d{8}$/, "");
}
//@ chunk-exfmq47h.js:469552-469677 sole-consumer
/**
 * 在已知模型中查找满足某能力的模型 id（误配名 isPDFExtension）。
 */
function findModelIdWithSameVersion(modelId) {
  let candidates = [...getModelCatalog_2().models.map((model) => model.id), ...modelClassName()];
  for (let candidate of candidates) {
    let modelId_2 = parseModelId(candidate);
    if (isStandardVersion(modelId_2) && isSameModelVersion(modelId_2, modelId)) return candidate;
  }
  return;
}
export {
  sessionHasOwnFallback,
  buildAvailabilityFallbackChain,
  getDefaultMainLoopModel,
  firstPartyNameToCanonical,
  isNoModelFallbackEnabled,
  getUsageCreditsOnlyModelConsentDeclineFallback,
  noModelFallbackTripwire,
  configuredAvailabilityFallbacks,
  isExactModelPick,
  mayStepDownOnRefusal,
  isDefaultModelEnforced,
};
