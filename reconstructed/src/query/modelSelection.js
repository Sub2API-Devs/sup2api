/**
 * query/modelSelection.ts
 *
 * 2.1.316 新增：查询循环中的模型选择与切换
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (9)
 * attribution: placement 9
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

//@ chunk-e6aww6q8.js:2404913-2405025 placement
/**
 * 回合实际使用的模型：依次取拒绝覆盖、授权覆盖、实时切换覆盖、链上模型、主模型。
 */
function effectiveTurnModel(e) {
  return e.refusalOverride ?? e.consentOverride ?? e.liveSwitchOverride ?? e.chainModel ?? e.primaryModel;
}
//@ chunk-e6aww6q8.js:2405025-2405052 placement
/**
 * 主循环模型覆盖
 */
function mainLoopModelOverride() {
  return getMainLoopModelOverride();
}
//@ chunk-e6aww6q8.js:2405052-2405716 placement
/**
 * 查询循环中检查是否需要换模型：会话选择变化时采用新选择；当前模型不在可用列表时沿可用性降级链找下一个或回到会话模型。
 */
function checkModelSwitch(e) {
  let { pickSeen, livePick, sessionModel, turn, resolveLiveModel } = e;
  let S = turn.refusalOverride !== undefined || turn.consentOverride !== undefined;
  if (livePick !== pickSeen) {
    let liveModel = resolveLiveModel();
    return {
      pick: livePick,
      adopt:
        liveModel !== sessionModel || S
          ? {
              model: liveModel,
              latch: "session_pick",
            }
          : undefined,
    };
  }
  try {
    let w = turn.chain[turn.chainIndex];
    let L = effectiveTurnModel({
      ...turn,
      chainModel: w,
    });
    if (isModelAdmittedByAvailableModels(L)) return;
    let G = !S && turn.liveSwitchOverride === undefined && turn.chainIndex > 0 && w !== undefined;
    if (G)
      for (let idx = turn.chainIndex + 1; idx < turn.chain.length; idx++) {
        let Se = turn.chain[idx];
        if (Se !== undefined && isModelAdmittedByAvailableModels(Se))
          return {
            pick: livePick,
            adopt: {
              model: Se,
              latch: "availability_chain",
              chainIndex: idx,
            },
          };
      }
    let liveModel = resolveLiveModel();
    if (liveModel === L || (G && liveModel === turn.primaryModel)) return;
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
//@ chunk-e6aww6q8.js:2405716-2405967 placement
/**
 * 采用新模型后的可用性降级链：有配置的降级时保留原链，否则为新模型构建链。
 */
function adoptedFallbackChain(e) {
  try {
    if (configuredAvailabilityFallbacks(e.primaryModel, e.configuredFallbacks).length > 0)
      return {
        chain: e.chain,
        chainIndex: e.chainIndex,
      };
    return {
      chain: buildAvailabilityFallbackChain(e.adoptedModel, e.configuredFallbacks),
      chainIndex: 0,
    };
  } catch (error) {
    logError(error);
    return {
      chain: e.chain,
      chainIndex: e.chainIndex,
    };
  }
}
//@ chunk-e6aww6q8.js:2405967-2406201 placement
/**
 * 为当前降级位置找下一个模型：先找同族降级，否则在宿主提供的访问降级模型中选一个未用过且被策略允许的。
 */
function nextFallbackModel(modelChain, chainIndex, r) {
  let { hostModels, runsHostModel } = hostFallbackModels(chainIndex, r);
  let y = runsHostModel ? undefined : familyFallbackModel(modelChain, chainIndex, r);
  if (y !== undefined || hostModels.length === 0) return y;
  try {
    if (chainIndex !== modelChain.length - 1 || r !== modelChain[chainIndex]) return;
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
//@ chunk-e6aww6q8.js:2406201-2406404 placement
function familyFallbackModel(e, n, r) {
  try {
    let s = e[n - 1];
    if (
      n !== e.length - 1 ||
      r !== e[n] ||
      isExactModelPick(r) ||
      isTierDefaultModelEnv(r) ||
      (s !== undefined && findOlderAccessibleModel(s) === r)
    )
      return;
    let olderAccessibleModel = findOlderAccessibleModel(r);
    return olderAccessibleModel !== undefined &&
      !e.some((y) => strip1mSuffix(y) === strip1mSuffix(olderAccessibleModel))
      ? olderAccessibleModel
      : undefined;
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-e6aww6q8.js:2406404-2406769 placement
/**
 * 宿主提供的访问降级模型，以及当前是否正运行在宿主模型上。
 */
function hostFallbackModels(e, n) {
  try {
    let accessFallbackModels = loadAccessFallbackModels();
    let s = mainLoopModelOverride();
    let h = s === undefined ? getInitialMainLoopModel() : s;
    let models =
      accessFallbackModels !== undefined &&
      typeof h === "string" &&
      sameLowerName(accessFallbackModels.for)(h)
        ? accessFallbackModels.models
        : [];
    if (
      models.length === 0 ||
      isModelFallbackDisabled() ||
      getProviderForModel(n) !== "firstParty" ||
      !getFeatureValue_CACHED_MAY_BE_STALE("tengu_mossy_crown", true)
    )
      return {
        hostModels: [],
        runsHostModel: false,
      };
    let S = sameLowerName(n);
    return {
      hostModels: models,
      runsHostModel: models.some(S) && (e > 0 || !S(getMainLoopModel())),
    };
  } catch (error) {
    logError(error);
    return {
      hostModels: [],
      runsHostModel: false,
    };
  }
}
//@ chunk-e6aww6q8.js:2406769-2406846 placement
/**
 * 小写后同名比较
 */
function sameLowerName(e) {
  let lower = strip1mSuffix(e).toLowerCase();
  return (r) => strip1mSuffix(r).toLowerCase() === lower;
}
//@ chunk-e6aww6q8.js:2406846-2406920 placement
/**
 * 是否回退到该模型
 */
function isFallbackTo(e, n) {
  return e !== undefined && n instanceof FallbackTriggeredError && n.fallbackModel === e;
}
export {
  mainLoopModelOverride,
  effectiveTurnModel,
  checkModelSwitch,
  adoptedFallbackChain,
  nextFallbackModel,
  isFallbackTo,
};
