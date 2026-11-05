/**
 * utils/model/modelUnavailability.ts
 *
 * 2.1.316 新增：尝试阶梯中的一级；检查模型访问（缓存失败结果）等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-exfmq47h.js (41), chunk-wefvmrb3.js (6)
 * attribution: placement 47
 */
import { HostScoped } from "../hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { env } from "../env.js";
import { strip1mSuffix } from "./modelIds.js";
import { userConfiguredDefault, recordProbedDefault } from "./thirdPartyModelDefaults.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../errors.js";
import { parseUserSpecifiedModel } from "./modelDisplay.js";
import { getDefaultMainLoopModelSetting } from "./planModeModel.js";
import { needsConsentCreditsOrOut, needsConsentOrCredits } from "../planTiers.js";
import { isModelDeniedByManagedSettings } from "./modelAllowlist.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-exfmq47h.js:432035-432049 placement
var MODEL_REFUSAL_TTL_MS = 600000;
//@ chunk-exfmq47h.js:432049-432274 placement
class FallbackLadderState {
  ladders = new Map();
  rungIndex = new Map();
  refused = new Map();
  answeredAt = new Map();
  formerHeads = new Set();
  configured = new Set();
  sessionFallbacks = [];
  tierMoveListeners = new Set();
  checks = new Map();
  conversationSizes = new Map();
  failedChecks = new Map();
}
//@ chunk-exfmq47h.js:432274-432299 placement
var fallbackLadderRegistry; // deferred: uses FallbackLadderState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:432274", () => {
  fallbackLadderRegistry = new HostScoped(() => new FallbackLadderState());
});
//@ chunk-exfmq47h.js:432299-432336 placement
/**
 * 取当前宿主的模型回退阶梯状态。
 */
function currentFallbackLadderStates() {
  return fallbackLadderRegistry.of(getRootSession().host);
}
//@ chunk-exfmq47h.js:432336-432445 placement
/**
 * 是否禁用模型回退。
 */
function isModelFallbackDisabled() {
  return env.CLAUDE_CODE_NO_MODEL_FALLBACK === true || env.CLAUDE_CODE_DISABLE_MODEL_ACCESS_FALLBACK === true;
}
//@ chunk-exfmq47h.js:432445-432740 placement
/**
 * 注册某提供商/档位的回退阶梯。
 */
function registerFallbackLadder(provider, tier, envVar, rungs) {
  if (rungs.length === 0) return;
  let states = currentFallbackLadderStates();
  states.ladders.set(`${provider}:${tier}`, {
    provider,
    tier,
    envVar,
    rungs: [...rungs],
  });
  states.rungIndex.clear();
  for (let ladder of states.ladders.values())
    for (let [index, rung] of ladder.rungs.entries()) {
      let references = states.rungIndex.get(rung.id) ?? [];
      references.push({
        ladder,
        index,
      });
      states.rungIndex.set(rung.id, references);
    }
}
//@ chunk-exfmq47h.js:432740-432924 placement
function findPrimaryRung(model) {
  let references = currentFallbackLadderStates().rungIndex.get(strip1mSuffix(model)) ?? [];
  let filtered = references.filter((reference) => reference.ladder.rungs[reference.index].crossTier !== true);
  return (filtered.length > 0 ? filtered : references).reduce(
    (acc, reference) => (acc === undefined || reference.index < acc.index ? reference : acc),
    undefined,
  );
}
//@ chunk-exfmq47h.js:432924-432970 placement
/**
 * 取主阶梯的提供商。
 */
function primaryRungProvider(model) {
  return findPrimaryRung(model)?.ladder.provider;
}
//@ chunk-exfmq47h.js:432970-433012 placement
/**
 * 取主阶梯的档位。
 */
function primaryRungTier(model) {
  return findPrimaryRung(model)?.ladder.tier;
}
//@ chunk-exfmq47h.js:433012-433049 placement
function hasPrimaryRung(model) {
  return findPrimaryRung(model) !== undefined;
}
//@ chunk-exfmq47h.js:433049-433167 placement
function getLadderHead(ladder) {
  let tierEnvVar = readTierEnvVar(ladder.envVar);
  let tierForEnvVar = getTierForEnvVar(ladder.envVar);
  if (tierEnvVar === undefined) return ladder.rungs[0].id;
  return tierForEnvVar !== undefined && userConfiguredDefault(tierForEnvVar) ? tierEnvVar : undefined;
}
//@ chunk-exfmq47h.js:433167-433495 placement
/**
 * 查找模型所在的阶梯位置。
 */
function findLadderRung(model) {
  let stripped = strip1mSuffix(model);
  let found;
  for (let ladder of currentFallbackLadderStates().ladders.values()) {
    let ladderHead = getLadderHead(ladder);
    let index = ladder.rungs.findIndex((rung) => rung.id === ladderHead);
    if (
      index >= 0 &&
      ladder.rungs[index].id === stripped &&
      (found === undefined || ladder.rungs[index].crossTier !== true)
    )
      found = {
        ladder,
        index,
      };
  }
  return found === undefined
    ? undefined
    : {
        provider: found.ladder.provider,
        tier: found.ladder.tier,
        below: found.ladder.rungs.slice(found.index + 1).map((rung) => rung.id),
      };
}
//@ chunk-exfmq47h.js:433495-433562 placement
/**
 * 判断模型是否在某阶梯中或曾是阶梯头。
 */
function isFormerHeadOrInLadder(model) {
  return (
    findLadderRung(model) !== undefined || currentFallbackLadderStates().formerHeads.has(strip1mSuffix(model))
  );
}
//@ chunk-exfmq47h.js:433562-433729 placement
/**
 * 列出阶梯中当前模型之后、未被拒绝的回退模型（保留后缀）。
 */
function getUnrefusedFallbacks(model) {
  let primaryRung = findPrimaryRung(model);
  if (primaryRung === undefined) return [];
  let sliced = model.slice(strip1mSuffix(model).length);
  return primaryRung.ladder.rungs
    .slice(primaryRung.index + 1)
    .map((rung) => rung.id)
    .filter((id) => !isModelRefused(id))
    .map((id) => id + sliced);
}
//@ chunk-exfmq47h.js:433729-433863 placement
function getFallbackModels(model) {
  let primaryRung = findPrimaryRung(model);
  if (primaryRung === undefined) return [];
  let sliced = model.slice(strip1mSuffix(model).length);
  return primaryRung.ladder.rungs.slice(primaryRung.index + 1).map((rung) => rung.id + sliced);
}
//@ chunk-exfmq47h.js:433863-433942 placement
/**
 * 把一批模型标记为已配置（阶梯可管理）。
 */
function markModelsConfigured(models) {
  let states = currentFallbackLadderStates();
  states.configured = new Set([...states.configured, ...models.map(strip1mSuffix)]);
}
//@ chunk-exfmq47h.js:433942-434117 placement
/**
 * 判断某个曾为阶梯头的模型已被拒绝且位于另一模型之前。
 */
function isFormerHeadRefused(model, requested) {
  let states = currentFallbackLadderStates();
  let stripped = strip1mSuffix(model);
  return (
    states.formerHeads.has(stripped) &&
    states.refused.has(stripped) &&
    (states.rungIndex.get(strip1mSuffix(requested)) ?? []).some((reference) =>
      reference.ladder.rungs.slice(0, reference.index).some((rung) => rung.id === stripped),
    )
  );
}
//@ chunk-exfmq47h.js:434117-434167 placement
/**
 * 判断模型是否已被标记为配置过。
 */
function isModelConfigured(model) {
  return currentFallbackLadderStates().configured.has(strip1mSuffix(model));
}
//@ chunk-exfmq47h.js:434167-434207 placement
/**
 * 设置本次会话的回退模型列表。
 */
function setSessionFallbacks(sessionFallbacks) {
  currentFallbackLadderStates().sessionFallbacks = sessionFallbacks;
}
//@ chunk-exfmq47h.js:434207-434250 placement
/**
 * 取本次会话的回退模型列表。
 */
function sessionFallbacks() {
  return currentFallbackLadderStates().sessionFallbacks;
}
//@ chunk-exfmq47h.js:434250-434610 placement
/**
 * 解析回退模型。
 */
function resolveFallbackModel(requested, candidate, isRefusedOrSentModel = () => false) {
  if (candidate === undefined) return {};
  if (currentFallbackLadderStates().configured.has(strip1mSuffix(candidate)) || !hasPrimaryRung(candidate))
    return {
      fallbackModel: candidate,
    };
  if (!getFallbackModels(requested).includes(candidate)) return {};
  let primaryRung = findPrimaryRung(requested);
  let sliced = primaryRung.ladder.rungs.slice(primaryRung.index + 1);
  let index = sliced.findIndex((rung) => rung.id === strip1mSuffix(candidate));
  let any = sliced
    .slice(0, index)
    .some(
      (rung) =>
        rung.crossTier !== true &&
        !currentFallbackLadderStates().refused.has(rung.id) &&
        !isRefusedOrSentModel(rung.id, requested),
    );
  return sliced[index]?.crossTier === true && any
    ? {}
    : {
        accessFallbackModel: candidate,
      };
}
//@ chunk-exfmq47h.js:434610-434779 placement
/**
 * 模型对本账号不可用的错误。
 */
function modelNotAvailableError(model) {
  return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `${model} is not available to this account. Ask your cloud admin to enable it, or choose another model.`,
    "model not available to this account",
  );
}
//@ chunk-exfmq47h.js:434779-434854 placement
/**
 * 标记模型被拒绝（带期限）。
 */
function markModelRefused(model, error, until = Date.now() + MODEL_REFUSAL_TTL_MS) {
  currentFallbackLadderStates().refused.set(strip1mSuffix(model), {
    error,
    until,
  });
}
//@ chunk-exfmq47h.js:434854-435032 placement
/**
 * 清除模型的拒绝记录与失败检查，记录应答时间。
 */
function clearModelRefusal_2(model, now = Date.now()) {
  let stripped = strip1mSuffix(model);
  let states = currentFallbackLadderStates();
  states.refused.delete(stripped);
  for (let key of states.failedChecks.keys())
    if (key.startsWith(`${stripped}\x00`)) states.failedChecks.delete(key);
  states.answeredAt.set(stripped, now);
}
//@ chunk-exfmq47h.js:435032-435075 placement
/**
 * 清除某模型的"拒绝"标记。
 */
function clearModelRefusal(model) {
  currentFallbackLadderStates().refused.delete(strip1mSuffix(model));
}
//@ chunk-exfmq47h.js:435075-435125 placement
/**
 * 取某模型被答复（探测）的时间。
 */
function modelAnsweredAt(model) {
  return currentFallbackLadderStates().answeredAt.get(strip1mSuffix(model));
}
//@ chunk-exfmq47h.js:435125-435210 placement
function activeRefusal(model, now) {
  let refusal = currentFallbackLadderStates().refused.get(strip1mSuffix(model));
  return refusal !== undefined && now < refusal.until ? refusal : undefined;
}
//@ chunk-exfmq47h.js:435210-435263 placement
/**
 * 模型是否处于拒绝状态。
 */
function isModelRefused(model, now = Date.now()) {
  return activeRefusal(model, now) !== undefined;
}
//@ chunk-exfmq47h.js:435263-435314 placement
/**
 * 取模型当前的拒绝错误（未拒绝返回 undefined）。
 */
function modelRefusedError(model, now = Date.now()) {
  return activeRefusal(model, now)?.error;
}
//@ chunk-exfmq47h.js:435314-435728 placement
/**
 * 检查模型访问（缓存失败结果）。
 */
function checkModelAccess(model, probe, cacheKey, now = Date.now()) {
  let states = currentFallbackLadderStates();
  let stripped = strip1mSuffix(model);
  let key = `${stripped}\x00${cacheKey ?? ""}`;
  let failed = states.failedChecks.get(key);
  if (failed !== undefined && now < failed.until) return Promise.resolve(failed.verdict);
  let inFlight = states.checks.get(key);
  if (inFlight !== undefined) return inFlight;
  let promise = probe()
    .then((verdict) => {
      if (
        (verdict === "refused" || verdict === "denied" || verdict === "failed") &&
        (states.answeredAt.get(stripped) ?? 0) < now
      )
        states.failedChecks.set(key, {
          verdict,
          until: now + MODEL_REFUSAL_TTL_MS,
        });
      return verdict;
    })
    .finally(() => {
      states.checks.delete(key);
    });
  states.checks.set(key, promise);
  return promise;
}
//@ chunk-exfmq47h.js:435728-435919 placement
function getTierForEnvVar(envVar) {
  switch (envVar) {
    case "ANTHROPIC_DEFAULT_SONNET_MODEL":
      return "sonnet";
    case "ANTHROPIC_DEFAULT_OPUS_MODEL":
      return "opus";
    case "ANTHROPIC_DEFAULT_HAIKU_MODEL":
      return "haiku";
    default:
      return;
  }
}
//@ chunk-exfmq47h.js:435919-436185 placement
function readTierEnvVar(envVar) {
  switch (envVar) {
    case "ANTHROPIC_DEFAULT_SONNET_MODEL":
      return env.ANTHROPIC_DEFAULT_SONNET_MODEL;
    case "ANTHROPIC_DEFAULT_OPUS_MODEL":
      return env.ANTHROPIC_DEFAULT_OPUS_MODEL;
    case "ANTHROPIC_DEFAULT_HAIKU_MODEL":
      return env.ANTHROPIC_DEFAULT_HAIKU_MODEL;
    default:
      return;
  }
}
//@ chunk-exfmq47h.js:436185-436442 placement
/**
 * 模型不可用时推进所有包含它的回退阶梯（含 Sonnet 跨档），有变化时通知监听者。
 */
function advanceFallbackLadders(model, wouldLoseContext = () => false, supportsAutoMode = () => true) {
  let suffix = model.slice(strip1mSuffix(model).length);
  let advanced = false;
  for (let { ladder, index } of currentFallbackLadderStates().rungIndex.get(strip1mSuffix(model)) ?? []) {
    if (index > 0 && tryLadderRung(ladder, index, suffix, wouldLoseContext, supportsAutoMode))
      advanced = true;
    if (ladder.tier === "sonnet" && crossTierFallback(ladder, index, wouldLoseContext, supportsAutoMode))
      advanced = true;
  }
  if (advanced)
    for (let tierMoveListener of currentFallbackLadderStates().tierMoveListeners)
      try {
        tierMoveListener();
      } catch {}
  return advanced;
}
//@ chunk-exfmq47h.js:436442-436519 placement
/**
 * 订阅档位迁移事件，返回退订函数。
 */
function subscribeTierMoves(listener) {
  let tierMoveListeners = currentFallbackLadderStates().tierMoveListeners;
  tierMoveListeners.add(listener);
  return () => tierMoveListeners.delete(listener);
}
//@ chunk-exfmq47h.js:436519-436559 placement
var OPUS_UNAVAILABLE_PREFIX = "Opus unavailable \u2014 using ";
//@ chunk-exfmq47h.js:436559-437227 placement
/**
 * 尝试阶梯中的一级。
 */
function tryLadderRung(ladder, index, suffix, wouldLoseContext, supportsAutoMode) {
  if (!supportsAutoMode(ladder.rungs[index].id)) return false;
  let tierForEnvVar = getTierForEnvVar(ladder.envVar);
  let tierEnvVar = readTierEnvVar(ladder.envVar);
  if (tierEnvVar !== undefined && (tierForEnvVar === undefined || !userConfiguredDefault(tierForEnvVar)))
    return false;
  let tierEnvValue = tierEnvVar ?? ladder.rungs[0].id;
  let index_2 = ladder.rungs.findIndex((rung) => rung.id === tierEnvValue);
  if (
    index_2 < 0 ||
    index_2 >= index ||
    wouldLoseContext(ladder.rungs[index].id, tierEnvValue + suffix) ||
    ladder.rungs
      .slice(index_2, index)
      .some(
        (rung, rungIndex) =>
          !isModelRefused(rung.id) && (rungIndex === 0 || !wouldLoseContext(rung.id, tierEnvValue + suffix)),
      )
  )
    return false;
  let rung = ladder.rungs[index];
  currentFallbackLadderStates().formerHeads.add(tierEnvValue);
  setTierEnvVar(ladder.envVar, rung.id);
  recordProbedDefault(ladder.envVar, rung.id);
  let ANTHROPIC_DEFAULT_OPUS_MODEL_DESCRIPTION = env.ANTHROPIC_DEFAULT_OPUS_MODEL_DESCRIPTION;
  let descriptionFree =
    ANTHROPIC_DEFAULT_OPUS_MODEL_DESCRIPTION === undefined ||
    ANTHROPIC_DEFAULT_OPUS_MODEL_DESCRIPTION.startsWith(OPUS_UNAVAILABLE_PREFIX);
  if (
    rung.crossTier === true &&
    descriptionFree &&
    (env.ANTHROPIC_DEFAULT_OPUS_MODEL_NAME === undefined ||
      ANTHROPIC_DEFAULT_OPUS_MODEL_DESCRIPTION !== undefined)
  ) {
    env.set("ANTHROPIC_DEFAULT_OPUS_MODEL_NAME", rung.name);
    env.set("ANTHROPIC_DEFAULT_OPUS_MODEL_DESCRIPTION", `${OPUS_UNAVAILABLE_PREFIX}${rung.name}`);
  }
  return true;
}
//@ chunk-exfmq47h.js:437227-437582 placement
/**
 * 跨档位回退。
 */
function crossTierFallback(ladder, index, wouldLoseContext, supportsAutoMode) {
  let opusLadder = currentFallbackLadderStates().ladders.get(`${ladder.provider}:opus`);
  let last = opusLadder?.rungs.at(-1);
  let index_2 = ladder.rungs.findIndex((rung) => rung.id === last?.id);
  if (opusLadder === undefined || last?.crossTier !== true || index_2 < 0 || index_2 >= index) return false;
  let rungs = [
    ...opusLadder.rungs,
    ...ladder.rungs.slice(index_2 + 1, index + 1).map((rung) => ({
      ...rung,
      crossTier: true,
    })),
  ];
  registerFallbackLadder(ladder.provider, "opus", opusLadder.envVar, rungs);
  return tryLadderRung(
    currentFallbackLadderStates().ladders.get(`${ladder.provider}:opus`),
    rungs.length - 1,
    "",
    wouldLoseContext,
    supportsAutoMode,
  );
}
//@ chunk-exfmq47h.js:437582-437778 placement
/**
 * 对第三方提供商的 Sonnet 阶梯应用跨档回退。
 */
function applyThirdPartyCrossTierFallback(provider, model, supportsAutoMode) {
  let sonnetLadder = currentFallbackLadderStates().ladders.get(`${provider}:sonnet`);
  let index = sonnetLadder?.rungs.findIndex((rung) => rung.id === strip1mSuffix(model)) ?? -1;
  if (sonnetLadder !== undefined && index > 0) {
    let above = new Set(sonnetLadder.rungs.slice(0, index).map((rung) => rung.id));
    crossTierFallback(sonnetLadder, index, (id) => above.has(id), supportsAutoMode);
  }
}
//@ chunk-exfmq47h.js:437778-438055 placement
function setTierEnvVar(envVar, id) {
  switch (envVar) {
    case "ANTHROPIC_DEFAULT_SONNET_MODEL":
      env.set("ANTHROPIC_DEFAULT_SONNET_MODEL", id);
      break;
    case "ANTHROPIC_DEFAULT_OPUS_MODEL":
      env.set("ANTHROPIC_DEFAULT_OPUS_MODEL", id);
      break;
    case "ANTHROPIC_DEFAULT_HAIKU_MODEL":
      env.set("ANTHROPIC_DEFAULT_HAIKU_MODEL", id);
      break;
  }
}
//@ chunk-exfmq47h.js:438055-438097 placement
/**
 * 判断是否已有回退阶梯。
 */
function hasFallbackLadders() {
  return currentFallbackLadderStates().ladders.size > 0;
}
//@ chunk-exfmq47h.js:438097-438147 placement
/**
 * 记录某模型的会话上下文大小（用于回退时判断丢上下文）。
 */
function recordConversationSize(sessionId, size) {
  currentFallbackLadderStates().conversationSizes.set(sessionId, size);
}
//@ chunk-wefvmrb3.js:13529-13577 placement
/**
 * 取默认模型对应的回退阶梯。
 */
function ladderForDefaultModel(setting) {
  let userSpecifiedModel = parseUserSpecifiedModel(setting ?? getDefaultMainLoopModelSetting());
  return needsConsentCreditsOrOut(userSpecifiedModel);
}
//@ chunk-wefvmrb3.js:13577-13632 placement
/**
 * 判断某模型设置是否有对应阶梯。
 */
function hasLadderForSetting(setting) {
  if (setting === null) return false;
  return needsConsentOrCredits(parseUserSpecifiedModel(setting));
}
//@ chunk-wefvmrb3.js:13632-13657 placement
/**
 * 恒返回 false（永不拒绝）。
 */
function neverDenied(model, other) {
  return false;
}
//@ chunk-wefvmrb3.js:13657-14017 placement
function classifyModelUnavailability(flags) {
  if (flags.notFound) return "not_found";
  if (flags.permissionDenied) return "unavailable_for_account";
  if (flags.notAllowed) return "restricted_by_org";
  if (flags.authFailed) return "auth_failed";
  if (flags.creditsRequired && flags.serverRefusedModel) return "credits_required";
  if (flags.rateLimited) return "rate_limit";
  if (flags.retryable) return "check_failed";
  return flags.rejected ? "check_rejected" : undefined;
}
//@ chunk-wefvmrb3.js:14017-14061 placement
/**
 * 有错误码时返回 {code}，否则返回空对象。
 */
function codeError(code) {
  return code === undefined
    ? {}
    : {
        code,
      };
}
//@ chunk-wefvmrb3.js:14061-14163 placement
/**
 * 分类模型被拒原因：托管设置拒绝或不允许。
 */
function classifyModelDenial(model) {
  try {
    return isModelDeniedByManagedSettings(model) ? "denied_by_managed_settings" : "not_allowed";
  } catch {
    return "not_allowed";
  }
}
export {
  hasFallbackLadders,
  recordConversationSize,
  resolveFallbackModel,
  isModelRefused,
  modelRefusedError,
  clearModelRefusal_2,
  isModelFallbackDisabled,
  isModelConfigured,
  advanceFallbackLadders,
  markModelRefused,
  modelNotAvailableError,
  findLadderRung,
  modelAnsweredAt,
  primaryRungTier,
  checkModelAccess,
  primaryRungProvider,
  setSessionFallbacks,
  hasLadderForSetting,
  ladderForDefaultModel,
  subscribeTierMoves,
  currentFallbackLadderStates,
  getUnrefusedFallbacks,
  markModelsConfigured,
  sessionFallbacks,
  isFormerHeadOrInLadder,
  isFormerHeadRefused,
  registerFallbackLadder,
  applyThirdPartyCrossTierFallback,
  clearModelRefusal,
  classifyModelDenial,
  neverDenied,
  codeError,
  classifyModelUnavailability,
};
