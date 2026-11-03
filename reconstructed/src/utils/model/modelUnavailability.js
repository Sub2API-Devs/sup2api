/**
 * utils/model/modelUnavailability.ts
 *
 * 2.1.316 新增：尝试阶梯中的一级；检查模型访问（缓存失败结果）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (41), chunk-d1cgs5na.js (6)
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

//@ chunk-aepeg2w5.js:420644-420658 placement
var MODEL_REFUSAL_TTL_MS = 600000;
//@ chunk-aepeg2w5.js:420658-420883 placement
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
//@ chunk-aepeg2w5.js:420883-420908 placement
var fallbackLadderRegistry = new HostScoped(() => new FallbackLadderState());
//@ chunk-aepeg2w5.js:420908-420945 placement
/**
 * 取当前宿主的模型回退阶梯状态。
 */
function currentFallbackLadderStates() {
  return fallbackLadderRegistry.of(getRootSession().host);
}
//@ chunk-aepeg2w5.js:420945-421054 placement
/**
 * 是否禁用模型回退。
 */
function isModelFallbackDisabled() {
  return env.CLAUDE_CODE_NO_MODEL_FALLBACK === true || env.CLAUDE_CODE_DISABLE_MODEL_ACCESS_FALLBACK === true;
}
//@ chunk-aepeg2w5.js:421054-421349 placement
/**
 * 注册某提供商/档位的回退阶梯。
 */
function registerFallbackLadder(e, tier, envVar, s) {
  if (s.length === 0) return;
  let h = currentFallbackLadderStates();
  h.ladders.set(`${e}:${tier}`, {
    provider: e,
    tier,
    envVar,
    rungs: [...s],
  });
  h.rungIndex.clear();
  for (let ladder of h.ladders.values())
    for (let [S, w] of ladder.rungs.entries()) {
      let R = h.rungIndex.get(w.id) ?? [];
      R.push({
        ladder,
        index: S,
      });
      h.rungIndex.set(w.id, R);
    }
}
//@ chunk-aepeg2w5.js:421349-421533 placement
function findPrimaryRung(e) {
  let n = currentFallbackLadderStates().rungIndex.get(strip1mSuffix(e)) ?? [];
  let filtered = n.filter((s) => s.ladder.rungs[s.index].crossTier !== true);
  return (filtered.length > 0 ? filtered : n).reduce(
    (acc, h) => (acc === undefined || h.index < acc.index ? h : acc),
    undefined,
  );
}
//@ chunk-aepeg2w5.js:421533-421579 placement
/**
 * 取主阶梯的提供商。
 */
function primaryRungProvider(e) {
  return findPrimaryRung(e)?.ladder.provider;
}
//@ chunk-aepeg2w5.js:421579-421621 placement
/**
 * 取主阶梯的档位。
 */
function primaryRungTier(e) {
  return findPrimaryRung(e)?.ladder.tier;
}
//@ chunk-aepeg2w5.js:421621-421658 placement
function hasPrimaryRung(e) {
  return findPrimaryRung(e) !== undefined;
}
//@ chunk-aepeg2w5.js:421658-421776 placement
function getLadderHead(ladder) {
  let tierEnvVar = readTierEnvVar(ladder.envVar);
  let tierForEnvVar = getTierForEnvVar(ladder.envVar);
  if (tierEnvVar === undefined) return ladder.rungs[0].id;
  return tierForEnvVar !== undefined && userConfiguredDefault(tierForEnvVar) ? tierEnvVar : undefined;
}
//@ chunk-aepeg2w5.js:421776-422104 placement
/**
 * 查找模型所在的阶梯位置。
 */
function findLadderRung(e) {
  let n = strip1mSuffix(e);
  let r;
  for (let ladder of currentFallbackLadderStates().ladders.values()) {
    let ladderHead = getLadderHead(ladder);
    let index = ladder.rungs.findIndex((rung) => rung.id === ladderHead);
    if (
      index >= 0 &&
      ladder.rungs[index].id === n &&
      (r === undefined || ladder.rungs[index].crossTier !== true)
    )
      r = {
        ladder,
        index,
      };
  }
  return r === undefined
    ? undefined
    : {
        provider: r.ladder.provider,
        tier: r.ladder.tier,
        below: r.ladder.rungs.slice(r.index + 1).map((rung) => rung.id),
      };
}
//@ chunk-aepeg2w5.js:422104-422171 placement
/**
 * 判断模型是否在某阶梯中或曾是阶梯头。
 */
function isFormerHeadOrInLadder(e) {
  return findLadderRung(e) !== undefined || currentFallbackLadderStates().formerHeads.has(strip1mSuffix(e));
}
//@ chunk-aepeg2w5.js:422171-422338 placement
/**
 * 列出阶梯中当前模型之后、未被拒绝的回退模型（保留后缀）。
 */
function getUnrefusedFallbacks(e) {
  let primaryRung = findPrimaryRung(e);
  if (primaryRung === undefined) return [];
  let sliced = e.slice(strip1mSuffix(e).length);
  return primaryRung.ladder.rungs
    .slice(primaryRung.index + 1)
    .map((rung) => rung.id)
    .filter((s) => !isModelRefused(s))
    .map((s) => s + sliced);
}
//@ chunk-aepeg2w5.js:422338-422472 placement
function getFallbackModels(e) {
  let primaryRung = findPrimaryRung(e);
  if (primaryRung === undefined) return [];
  let sliced = e.slice(strip1mSuffix(e).length);
  return primaryRung.ladder.rungs.slice(primaryRung.index + 1).map((rung) => rung.id + sliced);
}
//@ chunk-aepeg2w5.js:422472-422551 placement
/**
 * 把一批模型标记为已配置（阶梯可管理）。
 */
function markModelsConfigured(e) {
  let n = currentFallbackLadderStates();
  n.configured = new Set([...n.configured, ...e.map(strip1mSuffix)]);
}
//@ chunk-aepeg2w5.js:422551-422726 placement
/**
 * 判断某个曾为阶梯头的模型已被拒绝且位于另一模型之前。
 */
function isFormerHeadRefused(e, n) {
  let r = currentFallbackLadderStates();
  let s = strip1mSuffix(e);
  return (
    r.formerHeads.has(s) &&
    r.refused.has(s) &&
    (r.rungIndex.get(strip1mSuffix(n)) ?? []).some((h) =>
      h.ladder.rungs.slice(0, h.index).some((rung) => rung.id === s),
    )
  );
}
//@ chunk-aepeg2w5.js:422726-422776 placement
/**
 * 判断模型是否已被标记为配置过。
 */
function isModelConfigured(model) {
  return currentFallbackLadderStates().configured.has(strip1mSuffix(model));
}
//@ chunk-aepeg2w5.js:422776-422816 placement
/**
 * 设置本次会话的回退模型列表。
 */
function setSessionFallbacks(sessionFallbacks) {
  currentFallbackLadderStates().sessionFallbacks = sessionFallbacks;
}
//@ chunk-aepeg2w5.js:422816-422859 placement
/**
 * 取本次会话的回退模型列表。
 */
function sessionFallbacks() {
  return currentFallbackLadderStates().sessionFallbacks;
}
//@ chunk-aepeg2w5.js:422859-423219 placement
/**
 * 解析回退模型。
 */
function resolveFallbackModel(e, n, isRefusedOrSentModel = () => false) {
  if (n === undefined) return {};
  if (currentFallbackLadderStates().configured.has(strip1mSuffix(n)) || !hasPrimaryRung(n))
    return {
      fallbackModel: n,
    };
  if (!getFallbackModels(e).includes(n)) return {};
  let primaryRung = findPrimaryRung(e);
  let sliced = primaryRung.ladder.rungs.slice(primaryRung.index + 1);
  let index = sliced.findIndex((w) => w.id === strip1mSuffix(n));
  let any = sliced
    .slice(0, index)
    .some(
      (w) =>
        w.crossTier !== true &&
        !currentFallbackLadderStates().refused.has(w.id) &&
        !isRefusedOrSentModel(w.id, e),
    );
  return sliced[index]?.crossTier === true && any
    ? {}
    : {
        accessFallbackModel: n,
      };
}
//@ chunk-aepeg2w5.js:423219-423388 placement
/**
 * 模型对本账号不可用的错误。
 */
function modelNotAvailableError(e) {
  return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `${e} is not available to this account. Ask your cloud admin to enable it, or choose another model.`,
    "model not available to this account",
  );
}
//@ chunk-aepeg2w5.js:423388-423463 placement
/**
 * 标记模型被拒绝（带期限）。
 */
function markModelRefused(e, error, until = Date.now() + MODEL_REFUSAL_TTL_MS) {
  currentFallbackLadderStates().refused.set(strip1mSuffix(e), {
    error,
    until,
  });
}
//@ chunk-aepeg2w5.js:423463-423641 placement
/**
 * 清除模型的拒绝记录与失败检查，记录应答时间。
 */
function clearModelRefusal_2(model, n = Date.now()) {
  let r = strip1mSuffix(model);
  let s = currentFallbackLadderStates();
  s.refused.delete(r);
  for (let key of s.failedChecks.keys()) if (key.startsWith(`${r}\x00`)) s.failedChecks.delete(key);
  s.answeredAt.set(r, n);
}
//@ chunk-aepeg2w5.js:423641-423684 placement
/**
 * 清除某模型的"拒绝"标记。
 */
function clearModelRefusal(e) {
  currentFallbackLadderStates().refused.delete(strip1mSuffix(e));
}
//@ chunk-aepeg2w5.js:423684-423734 placement
/**
 * 取某模型被答复（探测）的时间。
 */
function modelAnsweredAt(e) {
  return currentFallbackLadderStates().answeredAt.get(strip1mSuffix(e));
}
//@ chunk-aepeg2w5.js:423734-423819 placement
function activeRefusal(e, n) {
  let r = currentFallbackLadderStates().refused.get(strip1mSuffix(e));
  return r !== undefined && n < r.until ? r : undefined;
}
//@ chunk-aepeg2w5.js:423819-423872 placement
/**
 * 模型是否处于拒绝状态。
 */
function isModelRefused(e, n = Date.now()) {
  return activeRefusal(e, n) !== undefined;
}
//@ chunk-aepeg2w5.js:423872-423923 placement
/**
 * 取模型当前的拒绝错误（未拒绝返回 undefined）。
 */
function modelRefusedError(model, n = Date.now()) {
  return activeRefusal(model, n)?.error;
}
//@ chunk-aepeg2w5.js:423923-424337 placement
/**
 * 检查模型访问（缓存失败结果）。
 */
function checkModelAccess(e, n, r, s = Date.now()) {
  let h = currentFallbackLadderStates();
  let y = strip1mSuffix(e);
  let S = `${y}\x00${r ?? ""}`;
  let w = h.failedChecks.get(S);
  if (w !== undefined && s < w.until) return Promise.resolve(w.verdict);
  let R = h.checks.get(S);
  if (R !== undefined) return R;
  let x = n()
    .then((P) => {
      if ((P === "refused" || P === "denied" || P === "failed") && (h.answeredAt.get(y) ?? 0) < s)
        h.failedChecks.set(S, {
          verdict: P,
          until: s + MODEL_REFUSAL_TTL_MS,
        });
      return P;
    })
    .finally(() => {
      h.checks.delete(S);
    });
  h.checks.set(S, x);
  return x;
}
//@ chunk-aepeg2w5.js:424337-424528 placement
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
//@ chunk-aepeg2w5.js:424528-424794 placement
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
//@ chunk-aepeg2w5.js:424794-425051 placement
/**
 * 模型不可用时推进所有包含它的回退阶梯（含 Sonnet 跨档），有变化时通知监听者。
 */
function advanceFallbackLadders(
  e,
  wouldLoseContextOnFallback = () => false,
  supportsAutoModeIfActive = () => true,
) {
  let sliced = e.slice(strip1mSuffix(e).length);
  let h = false;
  for (let { ladder, index } of currentFallbackLadderStates().rungIndex.get(strip1mSuffix(e)) ?? []) {
    if (
      index > 0 &&
      tryLadderRung(ladder, index, sliced, wouldLoseContextOnFallback, supportsAutoModeIfActive)
    )
      h = true;
    if (
      ladder.tier === "sonnet" &&
      crossTierFallback(ladder, index, wouldLoseContextOnFallback, supportsAutoModeIfActive)
    )
      h = true;
  }
  if (h)
    for (let tierMoveListener of currentFallbackLadderStates().tierMoveListeners)
      try {
        tierMoveListener();
      } catch {}
  return h;
}
//@ chunk-aepeg2w5.js:425051-425128 placement
/**
 * 订阅档位迁移事件，返回退订函数。
 */
function subscribeTierMoves(e) {
  let tierMoveListeners = currentFallbackLadderStates().tierMoveListeners;
  tierMoveListeners.add(e);
  return () => tierMoveListeners.delete(e);
}
//@ chunk-aepeg2w5.js:425128-425168 placement
var OPUS_UNAVAILABLE_PREFIX = "Opus unavailable \u2014 using ";
//@ chunk-aepeg2w5.js:425168-425836 placement
/**
 * 尝试阶梯中的一级。
 */
function tryLadderRung(e, n, r, s, h) {
  if (!h(e.rungs[n].id)) return false;
  let tierForEnvVar = getTierForEnvVar(e.envVar);
  let tierEnvVar = readTierEnvVar(e.envVar);
  if (tierEnvVar !== undefined && (tierForEnvVar === undefined || !userConfiguredDefault(tierForEnvVar)))
    return false;
  let w = tierEnvVar ?? e.rungs[0].id;
  let index = e.rungs.findIndex((rung) => rung.id === w);
  if (
    index < 0 ||
    index >= n ||
    s(e.rungs[n].id, w + r) ||
    e.rungs.slice(index, n).some((rung, G) => !isModelRefused(rung.id) && (G === 0 || !s(rung.id, w + r)))
  )
    return false;
  let x = e.rungs[n];
  currentFallbackLadderStates().formerHeads.add(w);
  setTierEnvVar(e.envVar, x.id);
  recordProbedDefault(e.envVar, x.id);
  let ANTHROPIC_DEFAULT_OPUS_MODEL_DESCRIPTION = env.ANTHROPIC_DEFAULT_OPUS_MODEL_DESCRIPTION;
  let F =
    ANTHROPIC_DEFAULT_OPUS_MODEL_DESCRIPTION === undefined ||
    ANTHROPIC_DEFAULT_OPUS_MODEL_DESCRIPTION.startsWith(OPUS_UNAVAILABLE_PREFIX);
  if (
    x.crossTier === true &&
    F &&
    (env.ANTHROPIC_DEFAULT_OPUS_MODEL_NAME === undefined ||
      ANTHROPIC_DEFAULT_OPUS_MODEL_DESCRIPTION !== undefined)
  ) {
    env.set("ANTHROPIC_DEFAULT_OPUS_MODEL_NAME", x.name);
    env.set("ANTHROPIC_DEFAULT_OPUS_MODEL_DESCRIPTION", `${OPUS_UNAVAILABLE_PREFIX}${x.name}`);
  }
  return true;
}
//@ chunk-aepeg2w5.js:425836-426191 placement
/**
 * 跨档位回退。
 */
function crossTierFallback(e, n, r, s) {
  let h = currentFallbackLadderStates().ladders.get(`${e.provider}:opus`);
  let last = h?.rungs.at(-1);
  let index = e.rungs.findIndex((rung) => rung.id === last?.id);
  if (h === undefined || last?.crossTier !== true || index < 0 || index >= n) return false;
  let w = [
    ...h.rungs,
    ...e.rungs.slice(index + 1, n + 1).map((rung) => ({
      ...rung,
      crossTier: true,
    })),
  ];
  registerFallbackLadder(e.provider, "opus", h.envVar, w);
  return tryLadderRung(
    currentFallbackLadderStates().ladders.get(`${e.provider}:opus`),
    w.length - 1,
    "",
    r,
    s,
  );
}
//@ chunk-aepeg2w5.js:426191-426387 placement
/**
 * 对第三方提供商的 Sonnet 阶梯应用跨档回退。
 */
function applyThirdPartyCrossTierFallback(e, n, supportsAutoModeIfActive) {
  let s = currentFallbackLadderStates().ladders.get(`${e}:sonnet`);
  let h = s?.rungs.findIndex((rung) => rung.id === strip1mSuffix(n)) ?? -1;
  if (s !== undefined && h > 0) {
    let y = new Set(s.rungs.slice(0, h).map((rung) => rung.id));
    crossTierFallback(s, h, (S) => y.has(S), supportsAutoModeIfActive);
  }
}
//@ chunk-aepeg2w5.js:426387-426664 placement
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
//@ chunk-aepeg2w5.js:426664-426706 placement
/**
 * 判断是否已有回退阶梯。
 */
function hasFallbackLadders() {
  return currentFallbackLadderStates().ladders.size > 0;
}
//@ chunk-aepeg2w5.js:426706-426756 placement
/**
 * 记录某模型的会话上下文大小（用于回退时判断丢上下文）。
 */
function recordConversationSize(e, n) {
  currentFallbackLadderStates().conversationSizes.set(e, n);
}
//@ chunk-d1cgs5na.js:13461-13509 placement
/**
 * 取默认模型对应的回退阶梯。
 */
function ladderForDefaultModel(e) {
  let userSpecifiedModel = parseUserSpecifiedModel(e ?? getDefaultMainLoopModelSetting());
  return needsConsentCreditsOrOut(userSpecifiedModel);
}
//@ chunk-d1cgs5na.js:13509-13564 placement
/**
 * 判断某模型设置是否有对应阶梯。
 */
function hasLadderForSetting(e) {
  if (e === null) return false;
  return needsConsentOrCredits(parseUserSpecifiedModel(e));
}
//@ chunk-d1cgs5na.js:13564-13589 placement
/**
 * 恒返回 false（永不拒绝）。
 */
function neverDenied(e, o) {
  return false;
}
//@ chunk-d1cgs5na.js:13589-13949 placement
function classifyModelUnavailability(e) {
  if (e.notFound) return "not_found";
  if (e.permissionDenied) return "unavailable_for_account";
  if (e.notAllowed) return "restricted_by_org";
  if (e.authFailed) return "auth_failed";
  if (e.creditsRequired && e.serverRefusedModel) return "credits_required";
  if (e.rateLimited) return "rate_limit";
  if (e.retryable) return "check_failed";
  return e.rejected ? "check_rejected" : undefined;
}
//@ chunk-d1cgs5na.js:13949-13993 placement
/**
 * 有错误码时返回 {code}，否则返回空对象。
 */
function codeError(e) {
  return e === undefined
    ? {}
    : {
        code: e,
      };
}
//@ chunk-d1cgs5na.js:13993-14095 placement
/**
 * 分类模型被拒原因：托管设置拒绝或不允许。
 */
function classifyModelDenial(e) {
  try {
    return isModelDeniedByManagedSettings(e) ? "denied_by_managed_settings" : "not_allowed";
  } catch {
    return "not_allowed";
  }
}
export {
  hasLadderForSetting,
  ladderForDefaultModel,
  hasFallbackLadders,
  recordConversationSize,
  resolveFallbackModel,
  setSessionFallbacks,
  registerFallbackLadder,
  applyThirdPartyCrossTierFallback,
  markModelRefused,
  modelNotAvailableError,
  clearModelRefusal,
  isModelRefused,
  modelRefusedError,
  clearModelRefusal_2,
  isModelFallbackDisabled,
  isModelConfigured,
  advanceFallbackLadders,
  currentFallbackLadderStates,
  getUnrefusedFallbacks,
  markModelsConfigured,
  sessionFallbacks,
  isFormerHeadOrInLadder,
  primaryRungProvider,
  isFormerHeadRefused,
  classifyModelDenial,
  neverDenied,
  codeError,
  classifyModelUnavailability,
  subscribeTierMoves,
  findLadderRung,
  modelAnsweredAt,
  primaryRungTier,
  checkModelAccess,
};
