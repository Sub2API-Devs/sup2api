/**
 * query/modelSelection.ts
 *
 * 2.1.316 新增：查询循环中的模型选择与切换
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (9)
 * attribution: placement 9
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getMainLoopModelOverride, getInitialMainLoopModel } from "../bootstrap/state.js";
import {
  isModelAdmittedByAvailableModels,
  isPermittedByOrgModelPolicy,
} from "../utils/model/defaultModel.js";
import { logError } from "../utils/log.js";
import {
  configuredAvailabilityFallbacks,
  buildAvailabilityFallbackChain,
  isExactModelPick,
} from "../utils/model/modelFallback.js";
import { supportsAutoModeIfActive, findOlderAccessibleModel } from "../utils/model/modelAccessCheck.js";
import { isTierDefaultModelEnv, getMainLoopModel } from "../utils/model/model.js";
import { strip1mSuffix } from "../utils/model/modelIds.js";
import { loadAccessFallbackModels } from "../utils/model/modelCapabilities.js";
import { isModelFallbackDisabled } from "../utils/model/modelUnavailability.js";
import { getProviderForModel } from "../utils/model/providers.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { FallbackTriggeredError } from "../services/api/withRetry.js";

//@ chunk-5xgkngpb.js:2460569-2460681 placement
/**
 * 回合实际使用的模型：依次取拒绝覆盖、授权覆盖、实时切换覆盖、链上模型、主模型。
 */
function effectiveTurnModel(selection) {
  return (
    selection.refusalOverride ??
    selection.consentOverride ??
    selection.liveSwitchOverride ??
    selection.chainModel ??
    selection.primaryModel
  );
}
//@ chunk-5xgkngpb.js:2460681-2460708 placement
/**
 * 主循环模型覆盖
 */
function mainLoopModelOverride() {
  return getMainLoopModelOverride();
}
//@ chunk-5xgkngpb.js:2460708-2461377 placement
/**
 * 查询循环中检查是否需要换模型：会话选择变化时采用新选择；当前模型不在可用列表时沿可用性降级链找下一个或回到会话模型。
 */
function checkModelSwitch(options) {
  let { pickSeen, livePick, sessionModel, turn, resolveLiveModel } = options;
  let overrideLatched = turn.refusalOverride !== undefined || turn.consentOverride !== undefined;
  if (livePick !== pickSeen) {
    let liveModel = resolveLiveModel();
    return {
      pick: livePick,
      adopt:
        liveModel !== sessionModel || overrideLatched
          ? {
              model: liveModel,
              latch: "session_pick",
            }
          : undefined,
    };
  }
  try {
    let chainModel = turn.chain[turn.chainIndex];
    let effectiveModel = effectiveTurnModel({
      ...turn,
      chainModel,
    });
    if (isModelAdmittedByAvailableModels(effectiveModel)) return;
    let canAdvanceChain =
      !overrideLatched &&
      turn.liveSwitchOverride === undefined &&
      turn.chainIndex > 0 &&
      chainModel !== undefined;
    if (canAdvanceChain)
      for (let idx = turn.chainIndex + 1; idx < turn.chain.length; idx++) {
        let candidateModel = turn.chain[idx];
        if (candidateModel !== undefined && isModelAdmittedByAvailableModels(candidateModel))
          return {
            pick: livePick,
            adopt: {
              model: candidateModel,
              latch: "availability_chain",
              chainIndex: idx,
            },
          };
      }
    let liveModel = resolveLiveModel();
    if (liveModel === effectiveModel || (canAdvanceChain && liveModel === turn.primaryModel)) return;
    return {
      pick: livePick,
      adopt: {
        model: liveModel,
        latch: "session_pick",
      },
    };
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-5xgkngpb.js:2461377-2461628 placement
/**
 * 采用新模型后的可用性降级链：有配置的降级时保留原链，否则为新模型构建链。
 */
function adoptedFallbackChain(options) {
  try {
    if (configuredAvailabilityFallbacks(options.primaryModel, options.configuredFallbacks).length > 0)
      return {
        chain: options.chain,
        chainIndex: options.chainIndex,
      };
    return {
      chain: buildAvailabilityFallbackChain(options.adoptedModel, options.configuredFallbacks),
      chainIndex: 0,
    };
  } catch (error) {
    logError(error);
    return {
      chain: options.chain,
      chainIndex: options.chainIndex,
    };
  }
}
//@ chunk-5xgkngpb.js:2461628-2461862 placement
/**
 * 为当前降级位置找下一个模型：先找同族降级，否则在宿主提供的访问降级模型中选一个未用过且被策略允许的。
 */
function nextFallbackModel(modelChain, chainIndex, currentModel) {
  let { hostModels, runsHostModel } = hostFallbackModels(chainIndex, currentModel);
  let familyModel = runsHostModel ? undefined : familyFallbackModel(modelChain, chainIndex, currentModel);
  if (familyModel !== undefined || hostModels.length === 0) return familyModel;
  try {
    if (chainIndex !== modelChain.length - 1 || currentModel !== modelChain[chainIndex]) return;
    return hostModels.find(
      (hostModel) =>
        !modelChain.some(sameLowerName(hostModel)) &&
        isPermittedByOrgModelPolicy(hostModel) &&
        supportsAutoModeIfActive(hostModel),
    );
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-5xgkngpb.js:2461862-2462065 placement
function familyFallbackModel(modelChain, chainIndex, currentModel) {
  try {
    let previousModel = modelChain[chainIndex - 1];
    if (
      chainIndex !== modelChain.length - 1 ||
      currentModel !== modelChain[chainIndex] ||
      isExactModelPick(currentModel) ||
      isTierDefaultModelEnv(currentModel) ||
      (previousModel !== undefined && findOlderAccessibleModel(previousModel) === currentModel)
    )
      return;
    let olderAccessibleModel = findOlderAccessibleModel(currentModel);
    return olderAccessibleModel !== undefined &&
      !modelChain.some((model) => strip1mSuffix(model) === strip1mSuffix(olderAccessibleModel))
      ? olderAccessibleModel
      : undefined;
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-5xgkngpb.js:2462065-2462430 placement
/**
 * 宿主提供的访问降级模型，以及当前是否正运行在宿主模型上。
 */
function hostFallbackModels(chainIndex, currentModel) {
  try {
    let accessFallbackModels = loadAccessFallbackModels();
    let modelOverride = mainLoopModelOverride();
    let baseModel = modelOverride === undefined ? getInitialMainLoopModel() : modelOverride;
    let models =
      accessFallbackModels !== undefined &&
      typeof baseModel === "string" &&
      sameLowerName(accessFallbackModels.for)(baseModel)
        ? accessFallbackModels.models
        : [];
    if (
      models.length === 0 ||
      isModelFallbackDisabled() ||
      getProviderForModel(currentModel) !== "firstParty" ||
      !getFeatureValue_CACHED_MAY_BE_STALE("tengu_mossy_crown", true)
    )
      return {
        hostModels: [],
        runsHostModel: false,
      };
    let sameAsCurrent = sameLowerName(currentModel);
    return {
      hostModels: models,
      runsHostModel: models.some(sameAsCurrent) && (chainIndex > 0 || !sameAsCurrent(getMainLoopModel())),
    };
  } catch (error) {
    logError(error);
    return {
      hostModels: [],
      runsHostModel: false,
    };
  }
}
//@ chunk-5xgkngpb.js:2462430-2462507 placement
/**
 * 小写后同名比较
 */
function sameLowerName(modelName) {
  let lower = strip1mSuffix(modelName).toLowerCase();
  return (otherModel) => strip1mSuffix(otherModel).toLowerCase() === lower;
}
//@ chunk-5xgkngpb.js:2462507-2462581 placement
/**
 * 是否回退到该模型
 */
function isFallbackTo(accessFallbackModel, error) {
  return (
    accessFallbackModel !== undefined &&
    error instanceof FallbackTriggeredError &&
    error.fallbackModel === accessFallbackModel
  );
}
export {
  nextFallbackModel,
  isFallbackTo,
  mainLoopModelOverride,
  effectiveTurnModel,
  checkModelSwitch,
  adoptedFallbackChain,
};
