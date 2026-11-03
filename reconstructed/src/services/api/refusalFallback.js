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
  pb,
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
import { isModelCapabilityEnabled, OZo } from "../../utils/model/promptBundles.js";
import { e5e, needsFableMitigations, Thi, ycr } from "../../utils/model/fableMitigations.js";
import { isPinnedFableModel, isOpus5FamilyModel, strip1mTag } from "../../utils/model/model.js";
import { getCatalogEntry, modelSupportsCapability } from "../../utils/model/modelCatalog.js";
import { getEnabledModelOptions, Qt } from "../../utils/model/modelOptions.js";
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
import { Lt } from "../../utils/model/modelIds.js";
import { isCatalogSuppressed } from "../../utils/model/modelCatalog/servedCatalog.js";
import { logEvent } from "../analytics/index.js";
import { ye } from "../../utils/startupMarks.js";
import { telemetrySafeModelName } from "../../utils/model/telemetryModelName.js";
import { fromEnum, lit } from "../analytics/safeMetadata.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { pe, o, Ue, A } from "../../../vendor/zod/v4/classic/schemas.js";
import { isFeedbackAllowed } from "../../commands/feedback/feedbackPolicy.js";
import { gn } from "../../utils/shortHash.js";
import { logFeatureBad } from "../analytics/featureTelemetry.js";

//@ chunk-hwmsct5x.js:225071-225095 placement
function yi(e) {
  return !1;
}
//@ chunk-hwmsct5x.js:225095-225141 placement
function isHardRefusalCategory(e) {
  return e === "cyber" || e === "bio";
}
//@ chunk-hwmsct5x.js:225141-225210 placement
function ob(e) {
  return e === "frontier_llm" || e === "reasoning_extraction";
}
//@ chunk-hwmsct5x.js:225210-225257 placement
function normalizeRefusalCategory(e) {
  return isHardRefusalCategory(e) || ob(e) ? e : "other";
}
//@ chunk-hwmsct5x.js:225257-225562 placement
var REFUSAL_FALLBACK_ROUTES = 3,
  ib = { bio: "claude-opus-5", cyber: "claude-opus-4-8", frontier_llm: "claude-opus-5" },
  ab = { cyber: "claude-opus-4-8" },
  lb = { bio: "claude-opus-5", cyber: "claude-opus-4-8", frontier_llm: "claude-opus-5" },
  ub = { cyber: "claude-sonnet-5", frontier_llm: "claude-sonnet-5" },
  db = { bio: "claude-opus-4-8", cyber: "claude-opus-4-8" };
//@ chunk-hwmsct5x.js:225562-225792 placement
function refusalLineupFor(e) {
  if (yi(e)) return db;
  if (e === "claude-opus-5-5" || e === "claude-opus-5-5[1m]") return lb;
  if (e === "claude-opus-5" || e === "claude-opus-5[1m]") return ab;
  if (e === "claude-sonnet-5-5" || e === "claude-sonnet-5-5[1m]") return ub;
  return ib;
}
//@ chunk-hwmsct5x.js:225792-225855 placement
function Si(e) {
  return Object.values(refusalLineupFor(e)).flatMap((n) => Tc(n));
}
//@ chunk-hwmsct5x.js:225855-225865 placement
var cb = !1;
//@ chunk-hwmsct5x.js:225865-225971 placement
function isRefusalCatchAllEnabled() {
  let envClaudeCodeRefusalFallbackCatchAll = process.env.CLAUDE_CODE_REFUSAL_FALLBACK_CATCH_ALL;
  if (isEnvDefinedFalsy(envClaudeCodeRefusalFallbackCatchAll)) return !1;
  return isEnvTruthy(envClaudeCodeRefusalFallbackCatchAll) || cb;
}
//@ chunk-hwmsct5x.js:225971-226390 placement
function describeFallbackRoute(e, n) {
  if (n !== void 0) return { routeMatched: "chain", cascadeHopIndex: n.index, cascadeChainLength: n.length };
  if (e === void 0) return { routeMatched: null };
  if (e.matched === "category")
    return {
      routeMatched: "category",
      remainingChain: e.remainingChain,
      cascadeHopIndex: 1,
      cascadeChainLength: e.chainLength,
    };
  if (e.matched === "catch_all")
    return { routeMatched: "catch_all", cascadeHopIndex: 1, cascadeChainLength: 1 };
  return { routeMatched: null };
}
//@ chunk-hwmsct5x.js:226390-226451 placement
function Tc(e) {
  return (typeof e === "string" ? [e] : e).slice(0, REFUSAL_FALLBACK_ROUTES);
}
//@ chunk-hwmsct5x.js:226451-226628 placement
function findFirstResolvableStage(e, n) {
  return e.reduce(
    (r, s, h) => {
      if (r !== void 0) return r;
      let y = n(s);
      return y === void 0
        ? void 0
        : { model: y, skippedStages: e.slice(0, h), remainingChain: e.slice(h + 1) };
    },
    void 0,
  );
}
/**
 * 按拒绝类别（cyber/bio/frontier_llm…）查找备用模型链，返回匹配方式（category/catch_all/unmapped）与剩余链。
 */
//@ chunk-hwmsct5x.js:226628-227224 placement
function resolveRefusalFallbackRoute(e) {
  let { originalModelCanonical: originalModelCanonical, apiRefusalCategory: apiRefusalCategory } = e,
    s = e.routesOverride ?? refusalLineupFor(originalModelCanonical),
    h = apiRefusalCategory != null && Object.hasOwn(s, apiRefusalCategory) ? s[apiRefusalCategory] : void 0;
  if (h !== void 0) {
    let y = Tc(h),
      w = findFirstResolvableStage(y, e.resolveTarget);
    if (w !== void 0)
      return {
        matched: "category",
        model: w.model,
        remainingChain: w.remainingChain,
        skippedStages: w.skippedStages,
        chainLength: y.length,
      };
    return {
      matched: "none",
      model: void 0,
      reason: "mapped_target_unresolvable",
      skippedStages: y.slice(0, -1),
      chainLength: y.length,
    };
  }
  if (isRefusalCatchAllEnabled() && !e.armedTargetIsRefusingModel)
    return { matched: "catch_all", model: e.armedFallbackModel };
  return { matched: "none", model: void 0, reason: "unmapped" };
}
//@ chunk-hwmsct5x.js:227506-227580 placement
function getUserDialogTimeoutMs() {
  return env.CLAUDE_CODE_USER_DIALOG_TIMEOUT_MS ?? getTimeoutMsForChoice(getDialogExpiry()) ?? pb;
}
//@ chunk-hwmsct5x.js:227580-227647 placement
function isRefusalFallbackEnabled() {
  return !env.CLAUDE_CODE_DISABLE_REFUSAL_FALLBACK && !isNoModelFallbackEnabled();
}
//@ chunk-hwmsct5x.js:227647-227722 placement
function isAutoSwitchOnFlagEnabled() {
  return (
    isRefusalFallbackEnabled() &&
    resolveSetting("switchModelsOnFlag", !0).value &&
    isFirstPartyApiBackend() &&
    !gb()
  );
}
//@ chunk-hwmsct5x.js:227722-227745 placement
function gb() {
  return !1;
}
//@ chunk-hwmsct5x.js:227745-227778 placement
function cci() {
  return isModelAdmittedByAvailableModels(enforcementRefusalFallbackOpusModel());
}
//@ chunk-hwmsct5x.js:227778-227830 placement
function uci(e) {
  return Si(strippedCanonicalName(e)).every((n) => isModelAdmittedByAvailableModels(n));
}
//@ chunk-hwmsct5x.js:227830-227891 placement
function fci(e, n) {
  return !isSameModel(e, n) && Si(strippedCanonicalName(e)).includes(strippedCanonicalName(n));
}
//@ chunk-hwmsct5x.js:227891-228040 placement
function classifyFallbackOrigin(e) {
  let n = getCanonicalName(e);
  if (
    isModelCapabilityEnabled("refusal_fallback", n, e) &&
    !e5e(n) &&
    !needsFableMitigations(n, e) &&
    !isPinnedFableModel(e)
  )
    return "catalog_flag";
  if (OZo(e)) return "gb_listed";
  return "other";
}
//@ chunk-hwmsct5x.js:228040-228468 placement
function resolveFamilyDefaultModel(e) {
  let n = getCatalogEntry(e)?.family,
    r = {
      opus: env.ANTHROPIC_DEFAULT_OPUS_MODEL,
      sonnet: env.ANTHROPIC_DEFAULT_SONNET_MODEL,
      haiku: env.ANTHROPIC_DEFAULT_HAIKU_MODEL,
    },
    s = n !== void 0 && Object.hasOwn(r, n) ? r[n] : void 0;
  if (s) {
    let h = getCanonicalName(s);
    return h.startsWith("claude-") && getCatalogEntry(h)?.family !== n ? void 0 : s;
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
  if (n === void 0) return;
  return preserve1mContextForRefusalFallback(e, n);
}
//@ chunk-hwmsct5x.js:228561-228570 placement
var _b = 2;
//@ chunk-hwmsct5x.js:228570-228595 placement
function RXo() {
  return _b;
}
//@ chunk-hwmsct5x.js:228595-228633 placement
function hasRefusalFallbackTarget(e) {
  return getRefusalFallbackChain(e) !== void 0;
}
//@ chunk-hwmsct5x.js:228633-228677 placement
var CLAUDE_OPUS_4_8 = "claude-opus-4-8",
  CLAUDE_OPUS_5 = "claude-opus-5";
//@ chunk-hwmsct5x.js:228677-228728 placement
function setRemoteFallbackLatch(e) {
  setAvailabilityFallbackChain(env.CLAUDE_CODE_REMOTE ? e : void 0);
}
//@ chunk-hwmsct5x.js:228728-228795 placement
function Uc(e) {
  return (
    isEntitlementOverlayUnavailable() &&
    isOpus5FamilyModel(e) &&
    !getAvailabilityFallbackChain()?.some((n) => Lt(n) === CLAUDE_OPUS_5)
  );
}
//@ chunk-hwmsct5x.js:228795-228828 placement
function Nc(e) {
  return Uc(e) ? CLAUDE_OPUS_4_8 : e;
}
/**
 * 计算当前模型被安全机制拒绝时可换用的备用模型链（受目录标志、设置与 provider 限制）。
 */
//@ chunk-hwmsct5x.js:228828-229164 placement
function getRefusalFallbackChain(e) {
  let n = getCanonicalName(e);
  if ((Thi(n) || ycr(n)) && !Mc(e)) return;
  if (modelSupportsCapability(n, "refusal_fallback", e) === !1 || Oc("no_refusal_fallback", n, e)) return;
  if (
    !Oc("refusal_fallback", n, e) &&
    (isCatalogSuppressed() || isRecognizedCanonical(n)) &&
    !e5e(n) &&
    !needsFableMitigations(n, e) &&
    !yi(n) &&
    !isPinnedFableModel(e) &&
    !Mc(e)
  )
    return;
  if (!usesFirstPartyModelIds()) return resolveFamilyDefaultModel(CLAUDE_OPUS_4_8);
  let s = Nc(getRefusalFallbackOpusModel());
  if (!isNonCustomOpusModel(getCanonicalName(s))) return;
  if (/\[1m\]/i.test(e)) return s;
  return strip1mTag(s);
}
//@ chunk-hwmsct5x.js:229164-229199 placement
function Mc(e) {
  return !isCatalogSuppressed() && OZo(e);
}
//@ chunk-hwmsct5x.js:229199-229255 placement
function Oc(e, n, r) {
  return isCatalogSuppressed() ? modelSupportsCapability(n, e, r) === !0 : isModelCapabilityEnabled(e, n, r);
}
//@ chunk-hwmsct5x.js:229255-229412 placement
function admittedFallbackModel(e, n) {
  if (e === void 0) return;
  let r = (s) => !isModelDenied(s, getModelEntitlementDenySet()) && isModelAdmittedByAvailableModels(s);
  if (r(e)) return e;
  if (n === "exact") return;
  return getRefusalFallbackOpusLineupIds().find(
    (s) => isNonCustomOpusModel(getCanonicalName(s)) && !Uc(s) && r(s),
  );
}
//@ chunk-hwmsct5x.js:229412-229684 placement
function pickFallbackModel(e) {
  let armedFallbackModel = e.armedFallbackModel;
  if (
    armedFallbackModel !== void 0 &&
    strippedCanonicalName(armedFallbackModel) === strippedCanonicalName(e.mappedTarget) &&
    !Pc(e.triedModels, armedFallbackModel)
  )
    return armedFallbackModel;
  let r = getCatalogEntry(e.mappedTarget);
  if (r === void 0) return;
  let s = admittedFallbackModel(
    usesFirstPartyModelIds() ? Nc(r.id) : resolveFamilyDefaultModel(r.id),
    "exact",
  );
  return s === void 0 || Pc(e.triedModels, s)
    ? void 0
    : preserve1mContextForRefusalFallback(e.refusingModel, s);
}
//@ chunk-hwmsct5x.js:229684-229829 placement
function canFallBackFrom(e) {
  return (
    hasRefusalFallbackTarget(e) &&
    findFirstResolvableStage(Si(getCanonicalName(e)), (n) =>
      pickFallbackModel({
        mappedTarget: n,
        armedFallbackModel: void 0,
        refusingModel: e,
        triedModels: [canonicalModelKey(e)],
      }),
    ) !== void 0
  );
}
//@ chunk-hwmsct5x.js:229829-230245 placement
function logFallbackRouteDeclined({
  model: model,
  armedFallbackModel: armedFallbackModel,
  apiRefusalCategory: apiRefusalCategory,
  requestId: requestId,
  decline: decline,
}) {
  logEvent("tengu_refusal_fallback_route_declined", {
    request_id: ye(requestId),
    model: telemetrySafeModelName(model),
    armed_fallback_model: telemetrySafeModelName(armedFallbackModel),
    reason: fromEnum(decline.reason),
    ...(decline.reason !== "unmapped" && { chain_length: decline.chainLength }),
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
  stages: stages,
  chainLength: chainLength,
  firstStageIndex: firstStageIndex,
  model: model,
  armedFallbackModel: armedFallbackModel,
  apiRefusalCategory: apiRefusalCategory,
  requestId: requestId,
}) {
  stages.forEach((S, E) =>
    logFallbackRouteDeclined({
      model: model,
      armedFallbackModel: armedFallbackModel,
      apiRefusalCategory: apiRefusalCategory,
      requestId: requestId,
      decline: {
        reason: "chain_entry_unresolvable",
        chainLength: chainLength,
        chainEntryIndex: firstStageIndex + E,
        chainEntry: S,
      },
    }),
  );
}
//@ chunk-hwmsct5x.js:230541-231092 placement
function logFallbackRouteOutcome({
  route: route,
  model: model,
  armedFallbackModel: armedFallbackModel,
  apiRefusalCategory: apiRefusalCategory,
  requestId: requestId,
}) {
  let y = {
    model: model,
    armedFallbackModel: armedFallbackModel,
    apiRefusalCategory: apiRefusalCategory,
    requestId: requestId,
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
        logFallbackRouteDeclined({ ...y, decline: { reason: "unmapped" } });
        return;
      }
      (logSkippedChainStages({
        ...y,
        stages: route.skippedStages,
        chainLength: route.chainLength,
        firstStageIndex: 1,
      }),
        logFallbackRouteDeclined({
          ...y,
          decline: { reason: "mapped_target_unresolvable", chainLength: route.chainLength },
        }));
      return;
  }
}
//@ chunk-hwmsct5x.js:231092-231152 placement
var EC = DoctorLazy(() => pe(o(), Ue([o().min(1), A(o().min(1)).min(1)])));
//@ chunk-hwmsct5x.js:231152-231245 placement
class qc {
  parsed = void 0;
  remember(e, n) {
    this.parsed = { raw: e, value: n };
  }
  reset() {
    this.parsed = void 0;
  }
}
//@ chunk-hwmsct5x.js:231245-231259 placement
var vC = new qc();
//@ chunk-hwmsct5x.js:231259-231281 placement
function Y8r() {
  return;
}
//@ chunk-hwmsct5x.js:231281-231320 placement
function isSameModel(e, n) {
  return strippedCanonicalName(e) === strippedCanonicalName(n);
}
//@ chunk-hwmsct5x.js:231320-231349 placement
function canonicalModelKey(e) {
  return strippedCanonicalName(e);
}
//@ chunk-hwmsct5x.js:231349-231391 placement
function Pc(e, n) {
  return e.includes(strippedCanonicalName(n));
}
//@ chunk-hwmsct5x.js:231391-231556 placement
var CYBER_SAFEGUARDS_ARTICLE_URL = "https://support.claude.com/en/articles/16049681",
  PXo = "https://support.claude.com/en/articles/15363606",
  X8r = "https://support.claude.com/en/articles/8106465";
//@ chunk-hwmsct5x.js:231556-231616 placement
function hl(e) {
  let n = getCanonicalName(e);
  return e5e(n) || Qt(e) || isPinnedFableModel(e) || !1;
}
//@ chunk-hwmsct5x.js:231616-231681 placement
function yb(e) {
  let n = strip1mTag(getCanonicalName(e));
  return n === "claude-opus-5" || yi(n);
}
//@ chunk-hwmsct5x.js:231681-231770 placement
function getSafeguardsArticleUrl(e) {
  if (e == null) return X8r;
  if (yb(e)) return CYBER_SAFEGUARDS_ARTICLE_URL;
  if (hl(e)) return PXo;
  return X8r;
}
//@ chunk-hwmsct5x.js:231770-231889 placement
function buildSafeguardsLearnMore(e) {
  let n = getSafeguardsArticleUrl(e);
  return isFeedbackAllowed()
    ? `Send feedback with /feedback or learn more: ${n}`
    : `You can learn more: ${n}`;
}
//@ chunk-hwmsct5x.js:239172-239231 placement
function canShowRefusalDialog() {
  return (
    isSdkDialogHostActive() && !(getSdkSupportedDialogKinds() ?? []).includes(REFUSAL_FALLBACK_DIALOG.kind)
  );
}
//@ chunk-hwmsct5x.js:239231-239296 placement
function getSwitchModelsOnFlagSetting() {
  return Boolean(resolveSetting("switchModelsOnFlag", !0).value);
}
//@ chunk-hwmsct5x.js:239296-239562 placement
function getFallbackDialogSkipReason(e) {
  if (e.silentAttempt) return "silent_ab";
  if (!e.isMainThread) return "subagent";
  if (e.requestDialog === void 0) return "no_dialog_host";
  if (resolveSetting("switchModelsOnFlag", !0).value) return "setting";
  if (e.consumerLacksDialogCapability) return "no_consumer_capability";
  return;
}
//@ chunk-hwmsct5x.js:239562-239701 placement
function shouldSilentlyDeclineFallback(e) {
  return (
    e.isMainThread &&
    (e.requestDialog === void 0 || e.consumerLacksDialogCapability) &&
    resolveSetting("switchModelsOnFlag", !0).value === !1
  );
}
//@ chunk-hwmsct5x.js:239701-239762 placement
function Z8r() {
  return resolveSetting("switchModelsOnFlag", !0).value === !1;
}
//@ chunk-hwmsct5x.js:239762-239968 placement
function getThirdPartyFallbackHint() {
  if (usesFirstPartyModelIds()) return;
  return "To enable automatic fallback on this provider, set `ANTHROPIC_DEFAULT_FABLE_MODEL` to your Fable model ID and `ANTHROPIC_DEFAULT_OPUS_MODEL` to your Opus 4.8 model ID.";
}
//@ chunk-hwmsct5x.js:239968-240048 placement
function Rci(e, n) {
  if (e === void 0 || !e.supportsKind(REFUSAL_FALLBACK_DIALOG.kind) || !n()) return;
  return e;
}
/**
 * 弹出（或经 Remote Control 转发）"消息被安全机制标记，是否换用备用模型/编辑重试"的对话框并等待选择，处理超时与排队取消。
 */
//@ chunk-hwmsct5x.js:240048-240940 placement
async function requestRefusalFallbackChoice(e) {
  let {
    requestDialog: requestDialog,
    signal: signal,
    bridgeDialog: bridgeDialog,
    payload: payload,
    telemetry: telemetry,
  } = e;
  if (bridgeDialog && e.hasQueuedPrompts())
    return (
      logEvent("tengu_request_user_dialog_implicit_cancel", {
        dialog_kind: gn(REFUSAL_FALLBACK_DIALOG.kind),
        reason: fromEnum("queued_at_park"),
        lane: lit("repl_bridge"),
      }),
      logFeatureBad("refusal_fallback", "dialog_queued_at_park"),
      "cancelled"
    );
  logEvent("tengu_refusal_fallback_prompt_shown", { ...telemetry, ...e.shownExtras });
  let w = bridgeDialog
    ? await requestUserDialogRaced({
        requestDialog: requestDialog,
        dialog: REFUSAL_FALLBACK_DIALOG,
        payload: payload,
        signal: signal,
        bridge: bridgeDialog,
        parkTimeoutMs: getUserDialogTimeoutMs(),
        onForwarded: (S) =>
          logEvent("tengu_refusal_fallback_bridge_forwarded", { ...telemetry, bridge_request_id: ye(S) }),
      })
    : {
        result: await requestDialog(REFUSAL_FALLBACK_DIALOG, payload, { signal: signal, localOnly: !0 }),
        source: "local",
      };
  if (w.source === "timeout")
    (logEvent("tengu_refusal_fallback_bridge_timeout", telemetry),
      logFeatureBad("refusal_fallback", "dialog_bridge_timeout"));
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
  Y8r,
  logFallbackRouteOutcome,
  describeFallbackRoute,
  hasRefusalFallbackTarget,
  Z8r,
  setRemoteFallbackLatch,
  findFirstResolvableStage,
  logSkippedChainStages,
  canShowRefusalDialog,
  Rci,
  RXo,
  getFallbackDialogSkipReason,
  normalizeRefusalCategory,
  requestRefusalFallbackChoice,
  getThirdPartyFallbackHint,
  getSwitchModelsOnFlagSetting,
  getSafeguardsArticleUrl,
  isHardRefusalCategory,
  fci,
  walkDownOpusLineup,
  cci,
  uci,
  shouldSilentlyDeclineFallback,
  canFallBackFrom,
  isAutoSwitchOnFlagEnabled,
  PXo,
  X8r,
  CYBER_SAFEGUARDS_ARTICLE_URL,
  hl,
};
