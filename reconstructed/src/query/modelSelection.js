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
import { fxe, findOlderAccessibleModel } from "../utils/model/modelAccessCheck.js";
import { isTierDefaultModelEnv, getMainLoopModel } from "../utils/model/model.js";
import { Lt } from "../utils/model/modelIds.js";
import { loadAccessFallbackModels } from "../utils/model/modelCapabilities.js";
import { isModelFallbackDisabled } from "../utils/model/modelUnavailability.js";
import { getProviderForModel } from "../utils/model/providers.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { FallbackTriggeredError } from "../services/api/withRetry.js";

/**
 * 回合实际使用的模型：依次取拒绝覆盖、授权覆盖、实时切换覆盖、链上模型、主模型。
 */
//@ chunk-e6aww6q8.js:2404913-2405025 placement
function effectiveTurnModel(e) {
  return e.refusalOverride ?? e.consentOverride ?? e.liveSwitchOverride ?? e.chainModel ?? e.primaryModel;
}
//@ chunk-e6aww6q8.js:2405025-2405052 placement
function Vwt() {
  return getMainLoopModelOverride();
}
/**
 * 查询循环中检查是否需要换模型：会话选择变化时采用新选择；当前模型不在可用列表时沿可用性降级链找下一个或回到会话模型。
 */
//@ chunk-e6aww6q8.js:2405052-2405716 placement
function checkModelSwitch(e) {
  let {
      pickSeen: pickSeen,
      livePick: livePick,
      sessionModel: sessionModel,
      turn: turn,
      resolveLiveModel: resolveLiveModel,
    } = e,
    S = turn.refusalOverride !== void 0 || turn.consentOverride !== void 0;
  if (livePick !== pickSeen) {
    let w = resolveLiveModel();
    return { pick: livePick, adopt: w !== sessionModel || S ? { model: w, latch: "session_pick" } : void 0 };
  }
  try {
    let w = turn.chain[turn.chainIndex],
      L = effectiveTurnModel({ ...turn, chainModel: w });
    if (isModelAdmittedByAvailableModels(L)) return;
    let G = !S && turn.liveSwitchOverride === void 0 && turn.chainIndex > 0 && w !== void 0;
    if (G)
      for (let Z = turn.chainIndex + 1; Z < turn.chain.length; Z++) {
        let Se = turn.chain[Z];
        if (Se !== void 0 && isModelAdmittedByAvailableModels(Se))
          return { pick: livePick, adopt: { model: Se, latch: "availability_chain", chainIndex: Z } };
      }
    let q = resolveLiveModel();
    if (q === L || (G && q === turn.primaryModel)) return;
    return { pick: livePick, adopt: { model: q, latch: "session_pick" } };
  } catch (error) {
    logError(error);
    return;
  }
}
/**
 * 采用新模型后的可用性降级链：有配置的降级时保留原链，否则为新模型构建链。
 */
//@ chunk-e6aww6q8.js:2405716-2405967 placement
function adoptedFallbackChain(e) {
  try {
    if (configuredAvailabilityFallbacks(e.primaryModel, e.configuredFallbacks).length > 0)
      return { chain: e.chain, chainIndex: e.chainIndex };
    return { chain: buildAvailabilityFallbackChain(e.adoptedModel, e.configuredFallbacks), chainIndex: 0 };
  } catch (error) {
    return (logError(error), { chain: e.chain, chainIndex: e.chainIndex });
  }
}
/**
 * 为当前降级位置找下一个模型：先找同族降级，否则在宿主提供的访问降级模型中选一个未用过且被策略允许的。
 */
//@ chunk-e6aww6q8.js:2405967-2406201 placement
function nextFallbackModel(e, n, r) {
  let { hostModels: hostModels, runsHostModel: runsHostModel } = hostFallbackModels(n, r),
    y = runsHostModel ? void 0 : familyFallbackModel(e, n, r);
  if (y !== void 0 || hostModels.length === 0) return y;
  try {
    if (n !== e.length - 1 || r !== e[n]) return;
    return hostModels.find((S) => !e.some(b7e(S)) && isPermittedByOrgModelPolicy(S) && fxe(S));
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
      (s !== void 0 && findOlderAccessibleModel(s) === r)
    )
      return;
    let h = findOlderAccessibleModel(r);
    return h !== void 0 && !e.some((y) => Lt(y) === Lt(h)) ? h : void 0;
  } catch (error) {
    logError(error);
    return;
  }
}
/**
 * 宿主提供的访问降级模型，以及当前是否正运行在宿主模型上。
 */
//@ chunk-e6aww6q8.js:2406404-2406769 placement
function hostFallbackModels(e, n) {
  try {
    let r = loadAccessFallbackModels(),
      s = Vwt(),
      h = s === void 0 ? getInitialMainLoopModel() : s,
      y = r !== void 0 && typeof h === "string" && b7e(r.for)(h) ? r.models : [];
    if (
      y.length === 0 ||
      isModelFallbackDisabled() ||
      getProviderForModel(n) !== "firstParty" ||
      !getFeatureValue_CACHED_MAY_BE_STALE("tengu_mossy_crown", !0)
    )
      return { hostModels: [], runsHostModel: !1 };
    let S = b7e(n);
    return { hostModels: y, runsHostModel: y.some(S) && (e > 0 || !S(getMainLoopModel())) };
  } catch (error) {
    return (logError(error), { hostModels: [], runsHostModel: !1 });
  }
}
//@ chunk-e6aww6q8.js:2406769-2406846 placement
function b7e(e) {
  let lower = Lt(e).toLowerCase();
  return (r) => Lt(r).toLowerCase() === lower;
}
//@ chunk-e6aww6q8.js:2406846-2406920 placement
function pzr(e, n) {
  return e !== void 0 && n instanceof FallbackTriggeredError && n.fallbackModel === e;
}

export { Vwt, effectiveTurnModel, checkModelSwitch, adoptedFallbackChain, nextFallbackModel, pzr };
