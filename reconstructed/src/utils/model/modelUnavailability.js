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
import { Lt } from "./modelIds.js";
import { userConfiguredDefault, recordProbedDefault } from "./thirdPartyModelDefaults.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../errors.js";
import { parseUserSpecifiedModel } from "./modelDisplay.js";
import { getDefaultMainLoopModelSetting } from "./planModeModel.js";
import { zdi, fPe } from "../planTiers.js";
import { isModelDeniedByManagedSettings } from "./modelAllowlist.js";

//@ chunk-aepeg2w5.js:420644-420658 placement
var Qk = 600000;
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
var pK = new HostScoped(() => new FallbackLadderState());
//@ chunk-aepeg2w5.js:420908-420945 placement
function We() {
  return pK.of(getRootSession().host);
}
/**
 * 是否禁用模型回退。
 */
//@ chunk-aepeg2w5.js:420945-421054 placement
function isModelFallbackDisabled() {
  return env.CLAUDE_CODE_NO_MODEL_FALLBACK === !0 || env.CLAUDE_CODE_DISABLE_MODEL_ACCESS_FALLBACK === !0;
}
/**
 * 注册某提供商/档位的回退阶梯。
 */
//@ chunk-aepeg2w5.js:421054-421349 placement
function registerFallbackLadder(e, n, r, s) {
  if (s.length === 0) return;
  let h = We();
  (h.ladders.set(`${e}:${n}`, { provider: e, tier: n, envVar: r, rungs: [...s] }), h.rungIndex.clear());
  for (let y of h.ladders.values())
    for (let [S, w] of y.rungs.entries()) {
      let R = h.rungIndex.get(w.id) ?? [];
      (R.push({ ladder: y, index: S }), h.rungIndex.set(w.id, R));
    }
}
//@ chunk-aepeg2w5.js:421349-421533 placement
function findPrimaryRung(e) {
  let n = We().rungIndex.get(Lt(e)) ?? [],
    filtered = n.filter((s) => s.ladder.rungs[s.index].crossTier !== !0);
  return (filtered.length > 0 ? filtered : n).reduce(
    (s, h) => (s === void 0 || h.index < s.index ? h : s),
    void 0,
  );
}
//@ chunk-aepeg2w5.js:421533-421579 placement
function tno(e) {
  return findPrimaryRung(e)?.ladder.provider;
}
//@ chunk-aepeg2w5.js:421579-421621 placement
function mss(e) {
  return findPrimaryRung(e)?.ladder.tier;
}
//@ chunk-aepeg2w5.js:421621-421658 placement
function mK(e) {
  return findPrimaryRung(e) !== void 0;
}
//@ chunk-aepeg2w5.js:421658-421776 placement
function getLadderHead(e) {
  let n = readTierEnvVar(e.envVar),
    r = getTierForEnvVar(e.envVar);
  if (n === void 0) return e.rungs[0].id;
  return r !== void 0 && userConfiguredDefault(r) ? n : void 0;
}
/**
 * 查找模型所在的阶梯位置。
 */
//@ chunk-aepeg2w5.js:421776-422104 placement
function findLadderRung(e) {
  let n = Lt(e),
    r;
  for (let s of We().ladders.values()) {
    let h = getLadderHead(s),
      index = s.rungs.findIndex((rung) => rung.id === h);
    if (index >= 0 && s.rungs[index].id === n && (r === void 0 || s.rungs[index].crossTier !== !0))
      r = { ladder: s, index: index };
  }
  return r === void 0
    ? void 0
    : {
        provider: r.ladder.provider,
        tier: r.ladder.tier,
        below: r.ladder.rungs.slice(r.index + 1).map((s) => s.id),
      };
}
//@ chunk-aepeg2w5.js:422104-422171 placement
function ew(e) {
  return findLadderRung(e) !== void 0 || We().formerHeads.has(Lt(e));
}
/**
 * 列出阶梯中当前模型之后、未被拒绝的回退模型（保留后缀）。
 */
//@ chunk-aepeg2w5.js:422171-422338 placement
function getUnrefusedFallbacks(e) {
  let n = findPrimaryRung(e);
  if (n === void 0) return [];
  let sliced = e.slice(Lt(e).length);
  return n.ladder.rungs
    .slice(n.index + 1)
    .map((s) => s.id)
    .filter((s) => !isModelRefused(s))
    .map((s) => s + sliced);
}
//@ chunk-aepeg2w5.js:422338-422472 placement
function getFallbackModels(e) {
  let n = findPrimaryRung(e);
  if (n === void 0) return [];
  let sliced = e.slice(Lt(e).length);
  return n.ladder.rungs.slice(n.index + 1).map((s) => s.id + sliced);
}
//@ chunk-aepeg2w5.js:422472-422551 placement
function nw(e) {
  let n = We();
  n.configured = new Set([...n.configured, ...e.map(Lt)]);
}
/**
 * 判断某个曾为阶梯头的模型已被拒绝且位于另一模型之前。
 */
//@ chunk-aepeg2w5.js:422551-422726 placement
function isFormerHeadRefused(e, n) {
  let r = We(),
    s = Lt(e);
  return (
    r.formerHeads.has(s) &&
    r.refused.has(s) &&
    (r.rungIndex.get(Lt(n)) ?? []).some((h) => h.ladder.rungs.slice(0, h.index).some((y) => y.id === s))
  );
}
//@ chunk-aepeg2w5.js:422726-422776 placement
function XEi(e) {
  return We().configured.has(Lt(e));
}
//@ chunk-aepeg2w5.js:422776-422816 placement
function JEi(e) {
  We().sessionFallbacks = e;
}
//@ chunk-aepeg2w5.js:422816-422859 placement
function ow() {
  return We().sessionFallbacks;
}
/**
 * 解析回退模型。
 */
//@ chunk-aepeg2w5.js:422859-423219 placement
function resolveFallbackModel(e, n, r = () => !1) {
  if (n === void 0) return {};
  if (We().configured.has(Lt(n)) || !mK(n)) return { fallbackModel: n };
  if (!getFallbackModels(e).includes(n)) return {};
  let s = findPrimaryRung(e),
    sliced = s.ladder.rungs.slice(s.index + 1),
    index = sliced.findIndex((w) => w.id === Lt(n)),
    any = sliced.slice(0, index).some((w) => w.crossTier !== !0 && !We().refused.has(w.id) && !r(w.id, e));
  return sliced[index]?.crossTier === !0 && any ? {} : { accessFallbackModel: n };
}
/**
 * 模型对本账号不可用的错误。
 */
//@ chunk-aepeg2w5.js:423219-423388 placement
function modelNotAvailableError(e) {
  return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `${e} is not available to this account. Ask your cloud admin to enable it, or choose another model.`,
    "model not available to this account",
  );
}
/**
 * 标记模型被拒绝（带期限）。
 */
//@ chunk-aepeg2w5.js:423388-423463 placement
function markModelRefused(e, n, r = Date.now() + Qk) {
  We().refused.set(Lt(e), { error: n, until: r });
}
/**
 * 清除模型的拒绝记录与失败检查，记录应答时间。
 */
//@ chunk-aepeg2w5.js:423463-423641 placement
function clearModelRefusal(e, n = Date.now()) {
  let r = Lt(e),
    s = We();
  s.refused.delete(r);
  for (let h of s.failedChecks.keys()) if (h.startsWith(`${r}\x00`)) s.failedChecks.delete(h);
  s.answeredAt.set(r, n);
}
//@ chunk-aepeg2w5.js:423641-423684 placement
function cmr(e) {
  We().refused.delete(Lt(e));
}
//@ chunk-aepeg2w5.js:423684-423734 placement
function ZEi(e) {
  return We().answeredAt.get(Lt(e));
}
//@ chunk-aepeg2w5.js:423734-423819 placement
function uw(e, n) {
  let r = We().refused.get(Lt(e));
  return r !== void 0 && n < r.until ? r : void 0;
}
/**
 * 模型是否处于拒绝状态。
 */
//@ chunk-aepeg2w5.js:423819-423872 placement
function isModelRefused(e, n = Date.now()) {
  return uw(e, n) !== void 0;
}
//@ chunk-aepeg2w5.js:423872-423923 placement
function evi(e, n = Date.now()) {
  return uw(e, n)?.error;
}
/**
 * 检查模型访问（缓存失败结果）。
 */
//@ chunk-aepeg2w5.js:423923-424337 placement
function checkModelAccess(e, n, r, s = Date.now()) {
  let h = We(),
    y = Lt(e),
    S = `${y}\x00${r ?? ""}`,
    w = h.failedChecks.get(S);
  if (w !== void 0 && s < w.until) return Promise.resolve(w.verdict);
  let R = h.checks.get(S);
  if (R !== void 0) return R;
  let x = n()
    .then((P) => {
      if ((P === "refused" || P === "denied" || P === "failed") && (h.answeredAt.get(y) ?? 0) < s)
        h.failedChecks.set(S, { verdict: P, until: s + Qk });
      return P;
    })
    .finally(() => {
      h.checks.delete(S);
    });
  return (h.checks.set(S, x), x);
}
//@ chunk-aepeg2w5.js:424337-424528 placement
function getTierForEnvVar(e) {
  switch (e) {
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
function readTierEnvVar(e) {
  switch (e) {
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
/**
 * 模型不可用时推进所有包含它的回退阶梯（含 Sonnet 跨档），有变化时通知监听者。
 */
//@ chunk-aepeg2w5.js:424794-425051 placement
function advanceFallbackLadders(e, n = () => !1, r = () => !0) {
  let sliced = e.slice(Lt(e).length),
    h = !1;
  for (let { ladder: ladder, index: index } of We().rungIndex.get(Lt(e)) ?? []) {
    if (index > 0 && tryLadderRung(ladder, index, sliced, n, r)) h = !0;
    if (ladder.tier === "sonnet" && crossTierFallback(ladder, index, n, r)) h = !0;
  }
  if (h)
    for (let tierMoveListener of We().tierMoveListeners)
      try {
        tierMoveListener();
      } catch {}
  return h;
}
//@ chunk-aepeg2w5.js:425051-425128 placement
function nvi(e) {
  let tierMoveListeners = We().tierMoveListeners;
  return (tierMoveListeners.add(e), () => tierMoveListeners.delete(e));
}
//@ chunk-aepeg2w5.js:425128-425168 placement
var Jk = "Opus unavailable \u2014 using ";
/**
 * 尝试阶梯中的一级。
 */
//@ chunk-aepeg2w5.js:425168-425836 placement
function tryLadderRung(e, n, r, s, h) {
  if (!h(e.rungs[n].id)) return !1;
  let y = getTierForEnvVar(e.envVar),
    S = readTierEnvVar(e.envVar);
  if (S !== void 0 && (y === void 0 || !userConfiguredDefault(y))) return !1;
  let w = S ?? e.rungs[0].id,
    index = e.rungs.findIndex((rung) => rung.id === w);
  if (
    index < 0 ||
    index >= n ||
    s(e.rungs[n].id, w + r) ||
    e.rungs.slice(index, n).some((L, G) => !isModelRefused(L.id) && (G === 0 || !s(L.id, w + r)))
  )
    return !1;
  let x = e.rungs[n];
  (We().formerHeads.add(w), setTierEnvVar(e.envVar, x.id), recordProbedDefault(e.envVar, x.id));
  let ANTHROPIC_DEFAULT_OPUS_MODEL_DESCRIPTION = env.ANTHROPIC_DEFAULT_OPUS_MODEL_DESCRIPTION,
    F =
      ANTHROPIC_DEFAULT_OPUS_MODEL_DESCRIPTION === void 0 ||
      ANTHROPIC_DEFAULT_OPUS_MODEL_DESCRIPTION.startsWith(Jk);
  if (
    x.crossTier === !0 &&
    F &&
    (env.ANTHROPIC_DEFAULT_OPUS_MODEL_NAME === void 0 || ANTHROPIC_DEFAULT_OPUS_MODEL_DESCRIPTION !== void 0)
  )
    (env.set("ANTHROPIC_DEFAULT_OPUS_MODEL_NAME", x.name),
      env.set("ANTHROPIC_DEFAULT_OPUS_MODEL_DESCRIPTION", `${Jk}${x.name}`));
  return !0;
}
/**
 * 跨档位回退。
 */
//@ chunk-aepeg2w5.js:425836-426191 placement
function crossTierFallback(e, n, r, s) {
  let h = We().ladders.get(`${e.provider}:opus`),
    y = h?.rungs.at(-1),
    index = e.rungs.findIndex((rung) => rung.id === y?.id);
  if (h === void 0 || y?.crossTier !== !0 || index < 0 || index >= n) return !1;
  let w = [...h.rungs, ...e.rungs.slice(index + 1, n + 1).map((R) => ({ ...R, crossTier: !0 }))];
  return (
    registerFallbackLadder(e.provider, "opus", h.envVar, w),
    tryLadderRung(We().ladders.get(`${e.provider}:opus`), w.length - 1, "", r, s)
  );
}
/**
 * 对第三方提供商的 Sonnet 阶梯应用跨档回退。
 */
//@ chunk-aepeg2w5.js:426191-426387 placement
function applyThirdPartyCrossTierFallback(e, n, r) {
  let s = We().ladders.get(`${e}:sonnet`),
    h = s?.rungs.findIndex((y) => y.id === Lt(n)) ?? -1;
  if (s !== void 0 && h > 0) {
    let y = new Set(s.rungs.slice(0, h).map((S) => S.id));
    crossTierFallback(s, h, (S) => y.has(S), r);
  }
}
//@ chunk-aepeg2w5.js:426387-426664 placement
function setTierEnvVar(e, n) {
  switch (e) {
    case "ANTHROPIC_DEFAULT_SONNET_MODEL":
      env.set("ANTHROPIC_DEFAULT_SONNET_MODEL", n);
      break;
    case "ANTHROPIC_DEFAULT_OPUS_MODEL":
      env.set("ANTHROPIC_DEFAULT_OPUS_MODEL", n);
      break;
    case "ANTHROPIC_DEFAULT_HAIKU_MODEL":
      env.set("ANTHROPIC_DEFAULT_HAIKU_MODEL", n);
      break;
  }
}
//@ chunk-aepeg2w5.js:426664-426706 placement
function rvi() {
  return We().ladders.size > 0;
}
//@ chunk-aepeg2w5.js:426706-426756 placement
function ovi(e, n) {
  We().conversationSizes.set(e, n);
}
//@ chunk-d1cgs5na.js:13461-13509 placement
function WKn(e) {
  let o = parseUserSpecifiedModel(e ?? getDefaultMainLoopModelSetting());
  return zdi(o);
}
//@ chunk-d1cgs5na.js:13509-13564 placement
function lue(e) {
  if (e === null) return !1;
  return fPe(parseUserSpecifiedModel(e));
}
//@ chunk-d1cgs5na.js:13564-13589 placement
function D(e, o) {
  return !1;
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
  return e.rejected ? "check_rejected" : void 0;
}
//@ chunk-d1cgs5na.js:13949-13993 placement
function P(e) {
  return e === void 0 ? {} : { code: e };
}
/**
 * 分类模型被拒原因：托管设置拒绝或不允许。
 */
//@ chunk-d1cgs5na.js:13993-14095 placement
function classifyModelDenial(e) {
  try {
    return isModelDeniedByManagedSettings(e) ? "denied_by_managed_settings" : "not_allowed";
  } catch {
    return "not_allowed";
  }
}

export {
  lue,
  WKn,
  rvi,
  ovi,
  resolveFallbackModel,
  JEi,
  registerFallbackLadder,
  applyThirdPartyCrossTierFallback,
  markModelRefused,
  modelNotAvailableError,
  cmr,
  isModelRefused,
  evi,
  clearModelRefusal,
  isModelFallbackDisabled,
  XEi,
  advanceFallbackLadders,
  We,
  getUnrefusedFallbacks,
  nw,
  ow,
  ew,
  tno,
  isFormerHeadRefused,
  classifyModelDenial,
  D,
  P,
  classifyModelUnavailability,
  nvi,
  findLadderRung,
  ZEi,
  mss,
  checkModelAccess,
};
