/**
 * services/api/modelFallback.ts
 *
 * 2.1.316 新增：模型不可用时的回退选择与提示
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (28)
 * attribution: placement 28
 */
import { isFirstPartyApiBackend } from "../../utils/model/providers.js";
import { Lp, eB, lT } from "../../bootstrap/stateSlices.js";
import { nj, jw, RG } from "../../utils/betas.js";
import {
  fci,
  walkDownOpusLineup,
  cci,
  isSameModel,
  uci,
  isRefusalFallbackEnabled,
  shouldSilentlyDeclineFallback,
  canFallBackFrom,
  isAutoSwitchOnFlagEnabled,
  classifyFallbackOrigin,
  normalizeRefusalCategory,
} from "./refusalFallback.js";
import { Bn } from "../../utils/model/modelIds.js";
import { calculateCostFromTokenCounts } from "../../utils/modelCost.js";
import { withCatalogSuppressed } from "../../utils/model/modelCatalog/servedCatalog.js";
import {
  buildFallbackCompletedNotice,
  buildFallbackGeneratedNotice,
  buildRefusalMessage,
  bci,
} from "./safeguardMessages.js";
import { Yto } from "../../utils/model/validateModel.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { zodStrictObject, o, A } from "../../../vendor/zod/v4/classic/schemas.js";

//@ chunk-e6aww6q8.js:2398030-2398072 placement
var HTTPS_WWW_ANTHROPIC_COM_NEWS = "https://www.anthropic.com/news/";
/**
 * 模型不可用时的提示文字（优先使用服务端给出的说明）。
 */
//@ chunk-e6aww6q8.js:2398072-2398173 placement
function modelUnavailableMessage(e, n) {
  return (
    e.blockMessage?.trim() || `${n} is currently unavailable. Learn more: ${HTTPS_WWW_ANTHROPIC_COM_NEWS}`
  );
}
//@ chunk-e6aww6q8.js:2398173-2398224 placement
function gve(e) {
  return e === "refusal" || e === "sticky";
}
//@ chunk-e6aww6q8.js:2398224-2398285 placement
function Sfr(e) {
  return e === "refusal" || e === "sticky" ? e : "other";
}
/**
 * 若服务端回退车道适用于当前模型，锁定对应 beta（默认回退或显式回退），返回请求体里的 fallbacks 字段；否则返回空对象。
 */
//@ chunk-e6aww6q8.js:2398285-2398623 placement
function serverFallbackPlan(lane, model, betas, sticky, h = !1, y = !1) {
  let S = lane !== void 0 && !y && model === lane.forModel && isFirstPartyApiBackend() && !Lp(sticky, nj),
    w = S && jw !== null && lane.mode === "default" && !Lp(sticky, jw),
    L = S && (w || fci(model, lane.model));
  if (L) eB(sticky, w && jw !== null ? jw : nj);
  for (let G of [nj, jw]) if (G !== null && lT(sticky, G) && !h && !betas.includes(G)) betas.push(G);
  if (!L) return {};
  return w ? { fallbacks: "default" } : { fallbacks: [{ model: Bn(lane.model) }] };
}
//@ chunk-e6aww6q8.js:2398623-2398691 placement
function cln(e) {
  return e.message.content.some((n) => n.type !== "text");
}
//@ chunk-e6aww6q8.js:2398691-2398923 placement
function applyRefusalFallbackBeta(e, n, r, s = !1, h) {
  if (e && !Lp(r, RG)) eB(r, RG);
  if (lT(r, RG) && !s && !n.includes(RG)) n.push(RG);
  if (h && n.includes(RG)) {
    let anthropic_beta = h.anthropic_beta;
    if (Array.isArray(anthropic_beta) && anthropic_beta.length > 0 && !anthropic_beta.includes(RG.header))
      h.anthropic_beta = [...anthropic_beta, RG.header];
  }
}
//@ chunk-e6aww6q8.js:2398923-2399073 placement
function readFallbackCreditToken(e) {
  if (typeof e !== "object" || e === null) return;
  let fallback_credit_token = e.fallback_credit_token;
  return typeof fallback_credit_token === "string" &&
    fallback_credit_token.length > 0 &&
    fallback_credit_token.length <= 2048
    ? fallback_credit_token
    : void 0;
}
//@ chunk-e6aww6q8.js:2399073-2399157 placement
function _7e(e) {
  return { type: "fallback", from: { model: e.fromModel }, to: { model: e.model } };
}
//@ chunk-e6aww6q8.js:2399157-2399275 placement
function readModelField(e) {
  if (typeof e !== "object" || e === null) return;
  let model = e.model;
  return typeof model === "string" && model.length > 0 ? model : void 0;
}
//@ chunk-e6aww6q8.js:2399275-2399455 placement
function readRefusalCategory(e) {
  if (typeof e !== "object" || e === null) return null;
  let n = e;
  if (n.type !== "refusal") return null;
  let category = n.category;
  return typeof category === "string" && category.length > 0 && category.length <= 64 ? category : null;
}
/**
 * 解析流中的 fallback 内容块开始事件，得到索引、原模型、回退模型、原因与类别。
 */
//@ chunk-e6aww6q8.js:2399455-2399831 placement
function parseFallbackBlockStart(e) {
  if (typeof e !== "object" || e === null) return;
  let n = e;
  if (n.type !== "content_block_start" || typeof n.index !== "number") return;
  let content_block = n.content_block;
  if (typeof content_block !== "object" || content_block === null) return;
  let s = content_block;
  if (s.type !== "fallback") return;
  let h = readModelField(s.from),
    y = readModelField(s.to);
  return h !== void 0 && y !== void 0
    ? { index: n.index, fromModel: h, model: y, reason: "refusal", category: readRefusalCategory(s.trigger) }
    : void 0;
}
//@ chunk-e6aww6q8.js:2399831-2399999 placement
function parseFallbackMessage(e) {
  if (!hve(e)) return;
  let n = e,
    r = readModelField(n.from),
    s = readModelField(n.to);
  return r !== void 0 && s !== void 0
    ? { fromModel: r, model: s, reason: "refusal", category: readRefusalCategory(n.trigger) }
    : void 0;
}
//@ chunk-e6aww6q8.js:2399999-2400073 placement
function hve(e) {
  return typeof e === "object" && e !== null && e.type === "fallback";
}
//@ chunk-e6aww6q8.js:2400073-2400317 placement
function isUnreadableFallbackBlock(e) {
  if (typeof e !== "object" || e === null) return !1;
  let n = e;
  if (n.type !== "content_block_start" || typeof n.index !== "number") return !1;
  let content_block = n.content_block;
  if (typeof content_block !== "object" || content_block === null) return !1;
  return content_block.type === "fallback" && parseFallbackBlockStart(e) === void 0;
}
//@ chunk-e6aww6q8.js:2400317-2400380 placement
var ave = (e) => (typeof e === "number" && Number.isFinite(e) && e >= 0 ? e : 0);
/**
 * 计算回退过程中各条 fallback 消息的费用（拒绝回退时排除最后一条）以及回退模型的固定附加费用。
 */
//@ chunk-e6aww6q8.js:2400380-2400901 placement
function fallbackMessagesCost(messages, pricing, reason) {
  let reduced = messages.reduce((G, q, Z) => (q.type === "fallback_message" ? Z : G), -1),
    h = reason === "refusal" ? reduced : -1,
    reduced_2 = messages.reduce(
      (G, q, Z) =>
        q.type === "fallback_message" && q.model !== void 0 && Z !== h
          ? G +
            calculateCostFromTokenCounts(q.model, q, {
              speed: pricing.speed,
              inferenceGeo: pricing.inferenceGeo,
            })
          : G,
      0,
    ),
    S = messages.find((G) => G.type === "fallback_message" && G.model !== void 0)?.model,
    w =
      S !== void 0
        ? calculateCostFromTokenCounts(
            S,
            { inputTokens: 0, outputTokens: 0, cacheReadInputTokens: 0, cacheCreationInputTokens: 0 },
            {
              speed: pricing.speed,
              inferenceGeo: pricing.inferenceGeo,
              serverToolUse: pricing.serverToolUse,
            },
          )
        : 0,
    L = reduced_2 + w;
  return Number.isFinite(L) ? L : 0;
}
//@ chunk-e6aww6q8.js:2401522-2401577 placement
function uJn(e, n) {
  return e !== void 0 && Bn(e) === Bn(n) ? e : n;
}
//@ chunk-e6aww6q8.js:2401577-2401806 placement
function canUseDefaultFallback(e) {
  if (jw !== null) {
    let n = walkDownOpusLineup(e.primaryModel);
    return (
      n !== void 0 &&
      !Lp(e.sticky, jw) &&
      cci() &&
      (!isSameModel(e.primaryModel, n) || (uci(e.primaryModel) && e.selfTargetDefaultFallbacksEnabled())) &&
      e.serverDefaultFallbacksEnabled()
    );
  }
  return !1;
}
//@ chunk-e6aww6q8.js:2401806-2401860 placement
var TENGU_DASH_FLAME = "tengu_dash_flame",
  TENGU_ELEGANT_POSSUM = "tengu_elegant_possum";
/**
 * 选择回退使用的 beta 头：已粘滞的优先，否则按是否允许服务端默认回退决定。
 */
//@ chunk-e6aww6q8.js:2401860-2402173 placement
function pickFallbackBeta(e) {
  if (jw !== null) {
    if (lT(e.sticky, jw)) return jw;
    if (lT(e.sticky, nj)) return nj;
    return e.fromModel !== void 0 &&
      canUseDefaultFallback({
        primaryModel: e.fromModel,
        sticky: e.sticky,
        serverDefaultFallbacksEnabled: e.serverDefaultFallbacksEnabled,
        selfTargetDefaultFallbacksEnabled: e.selfTargetDefaultFallbacksEnabled,
      })
      ? jw
      : nj;
  }
  return nj;
}
//@ chunk-e6aww6q8.js:2402173-2402260 placement
var freeze_13 = Object.freeze({ visibleModel: void 0, serverLane: void 0, shouldLogSuppression: !1 });
/**
 * 计算拒答后的回退：是否启用、是否静默拒绝、按 Opus 阵容向下找（或级联中的下一个）可见回退模型，以及能否交给服务端自动切换（default/explicit 车道）。
 */
//@ chunk-e6aww6q8.js:2402260-2403191 placement
function resolveRefusalFallback(options) {
  if (options.compiledTablesOnly)
    return withCatalogSuppressed(() => resolveRefusalFallback({ ...options, compiledTablesOnly: !1 }));
  let n = isRefusalFallbackEnabled(),
    r = shouldSilentlyDeclineFallback({
      requestDialog: options.requestDialog,
      isMainThread: options.isMainThread,
      consumerLacksDialogCapability: options.consumerLacksDialogCapability,
    }),
    s = options.inCascadeEpisode ? void 0 : walkDownOpusLineup(options.currentModel),
    h = options.inCascadeEpisode
      ? options.cascadeNext
      : (s ?? (canFallBackFrom(options.currentModel) ? options.currentModel : void 0)),
    y = !options.alreadyUsed && !options.declined && n && !r ? h : void 0,
    S =
      y !== void 0 &&
      s !== void 0 &&
      !options.inCascadeEpisode &&
      !options.threadedRequest &&
      !options.preferenceQuestionPending &&
      isAutoSwitchOnFlagEnabled() &&
      !Lp(options.sticky, nj),
    w =
      S &&
      canUseDefaultFallback({
        primaryModel: options.currentModel,
        sticky: options.sticky,
        serverDefaultFallbacksEnabled: options.serverDefaultFallbacksEnabled,
        selfTargetDefaultFallbacksEnabled: options.selfTargetDefaultFallbacksEnabled,
      })
        ? "default"
        : "explicit",
    L =
      S && (w === "default" || !isSameModel(options.currentModel, y))
        ? { forModel: options.currentModel, model: y, mode: w }
        : void 0;
  return {
    visibleModel: y,
    serverLane: L,
    shouldLogSuppression: !options.suppressionAlreadyLogged && n && r && h !== void 0,
  };
}
/**
 * 描述一次服务端模型回退：遥测字段、是否对用户可见、被丢弃内容是否含工具调用、是否切换会话模型与横幅范围。
 */
//@ chunk-e6aww6q8.js:2403191-2403771 placement
function describeServerFallback(event, context) {
  let any = event.discardedMessages.some((discardedMessage) =>
      discardedMessage.message.content.some((w) => w.type === "tool_use"),
    ),
    s = gve(event.reason),
    h = s && context.isMainThread,
    y = s && !context.isMainThread && context.emitsLocalScope;
  return {
    telemetry: {
      reason: Sfr(event.reason),
      midStream: event.midStream,
      discardedBlockCount: event.discardedMessages.length,
      tombstonedHadToolUse: any,
      requestId: event.requestId,
      originalModelScope: classifyFallbackOrigin(event.fromModel),
      finalStopReason: event.finalStopReason,
      apiRefusalCategory:
        event.apiRefusalCategory != null ? normalizeRefusalCategory(event.apiRefusalCategory) : void 0,
    },
    userVisible: s,
    tombstonedToolUse: any,
    swapSession: h,
    showBanner: h || y,
    bannerScope: h ? "session" : "local",
  };
}
/**
 * 生成模型拒答回退的系统消息（本地或会话范围），说明原模型、回退模型与拒答类别。
 */
//@ chunk-e6aww6q8.js:2403771-2404352 placement
function buildRefusalFallbackSystemMessage(event, ids, scope) {
  return {
    type: "system",
    subtype: "model_refusal_fallback",
    direction: "retry",
    scope: scope,
    content:
      scope === "local"
        ? (event.retainedText?.length ?? 0) > 0
          ? buildFallbackCompletedNotice(event.fromModel, event.toModel, event.apiRefusalCategory)
          : buildFallbackGeneratedNotice(event.fromModel, event.toModel, event.apiRefusalCategory)
        : event.reason === "refusal"
          ? buildRefusalMessage(event.fromModel, event.toModel, event.apiRefusalCategory)
          : bci(event.fromModel, event.toModel, event.apiRefusalCategory),
    level: "warning",
    trigger: "refusal",
    originalModel: event.fromModel,
    fallbackModel: event.toModel,
    requestId: event.requestId,
    apiRefusalCategory: event.apiRefusalCategory,
    apiRefusalExplanation: null,
    isMeta: !1,
    timestamp: ids.timestamp,
    uuid: ids.uuid,
  };
}
//@ chunk-e6aww6q8.js:2404352-2404526 placement
var ACCESSFALLBACKMODELS = "accessFallbackModels",
  _ln = 3,
  kfr = 256,
  regExp_12 = new RegExp(`^[A-Za-z0-9][${Yto}]{0,255}$`),
  Tfr = DoctorLazy(() =>
    zodStrictObject({ for: o().min(1).max(kfr), models: A(o().regex(regExp_12)).min(1).max(_ln) }),
  );
/**
 * 是否合法 accessFallbackModels 客户端数据。
 */
//@ chunk-e6aww6q8.js:2404526-2404565 placement
function isAccessFallbackModelsData(e) {
  return parseAccessFallbackModels(e) !== void 0;
}
/**
 * 解析客户端数据 accessFallbackModels：{for, models[≤3]} 经 schema 校验。
 */
//@ chunk-e6aww6q8.js:2404565-2404750 placement
function parseAccessFallbackModels(e) {
  if (typeof e !== "object" || e === null || !("models" in e)) return;
  if (!Array.isArray(e.models) || e.models.length > _ln) return;
  let safeParse = Tfr().safeParse(e);
  return safeParse.success ? safeParse.data : void 0;
}

export {
  ave,
  readFallbackCreditToken,
  pickFallbackBeta,
  TENGU_DASH_FLAME,
  TENGU_ELEGANT_POSSUM,
  serverFallbackPlan,
  applyRefusalFallbackBeta,
  hve,
  parseFallbackMessage,
  _7e,
  parseFallbackBlockStart,
  isUnreadableFallbackBlock,
  gve,
  cln,
  fallbackMessagesCost,
  uJn,
  resolveRefusalFallback,
  freeze_13,
  describeServerFallback,
  buildRefusalFallbackSystemMessage,
  modelUnavailableMessage,
  parseAccessFallbackModels,
  ACCESSFALLBACKMODELS,
  isAccessFallbackModelsData,
};
