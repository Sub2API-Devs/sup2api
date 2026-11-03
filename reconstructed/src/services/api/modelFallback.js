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
import { isBetaRejected as isBetaRejected_2, markBetaSent, isBetaSent } from "../../bootstrap/stateSlices.js";
import {
  BETA_SERVER_SIDE_FALLBACK,
  BETA_SERVER_SIDE_FALLBACK_CATEGORY,
  BETA_FALLBACK_CREDIT,
} from "../../utils/betas.js";
import {
  isInRefusalLineup,
  walkDownOpusLineup,
  noRefusalFallbackOpusModel,
  isSameModel,
  everyLineupModelAdmitted,
  isRefusalFallbackEnabled,
  shouldSilentlyDeclineFallback,
  canFallBackFrom,
  isAutoSwitchOnFlagEnabled,
  classifyFallbackOrigin,
  normalizeRefusalCategory,
} from "./refusalFallback.js";
import { stripAnyVersatileSuffix } from "../../utils/model/modelIds.js";
import { calculateCostFromTokenCounts } from "../../utils/modelCost.js";
import { withCatalogSuppressed } from "../../utils/model/modelCatalog/servedCatalog.js";
import {
  buildFallbackCompletedNotice,
  buildFallbackGeneratedNotice,
  buildRefusalMessage,
  safeguardsFlaggedMessage,
} from "./safeguardMessages.js";
import { MODEL_NAME_ALLOWED_CHARS } from "../../utils/model/validateModel.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { zodStrictObject, string, array } from "../../../vendor/zod/v4/classic/schemas.js";

//@ chunk-e6aww6q8.js:2398030-2398072 placement
var HTTPS_WWW_ANTHROPIC_COM_NEWS = "https://www.anthropic.com/news/";
//@ chunk-e6aww6q8.js:2398072-2398173 placement
/**
 * 模型不可用时的提示文字（优先使用服务端给出的说明）。
 */
function modelUnavailableMessage(e, n) {
  return (
    e.blockMessage?.trim() || `${n} is currently unavailable. Learn more: ${HTTPS_WWW_ANTHROPIC_COM_NEWS}`
  );
}
//@ chunk-e6aww6q8.js:2398173-2398224 placement
function isFallbackReason(reason) {
  return reason === "refusal" || reason === "sticky";
}
//@ chunk-e6aww6q8.js:2398224-2398285 placement
function asFallbackReason(reason) {
  return reason === "refusal" || reason === "sticky" ? reason : "other";
}
//@ chunk-e6aww6q8.js:2398285-2398623 placement
/**
 * 若服务端回退车道适用于当前模型，锁定对应 beta（默认回退或显式回退），返回请求体里的 fallbacks 字段；否则返回空对象。
 */
function serverFallbackPlan(lane, model, betas, sticky, h = false, y = false) {
  let S =
    lane !== undefined &&
    !y &&
    model === lane.forModel &&
    isFirstPartyApiBackend() &&
    !isBetaRejected_2(sticky, BETA_SERVER_SIDE_FALLBACK);
  let w =
    S &&
    BETA_SERVER_SIDE_FALLBACK_CATEGORY !== null &&
    lane.mode === "default" &&
    !isBetaRejected_2(sticky, BETA_SERVER_SIDE_FALLBACK_CATEGORY);
  let L = S && (w || isInRefusalLineup(model, lane.model));
  if (L)
    markBetaSent(
      sticky,
      w && BETA_SERVER_SIDE_FALLBACK_CATEGORY !== null
        ? BETA_SERVER_SIDE_FALLBACK_CATEGORY
        : BETA_SERVER_SIDE_FALLBACK,
    );
  for (let G of [BETA_SERVER_SIDE_FALLBACK, BETA_SERVER_SIDE_FALLBACK_CATEGORY])
    if (G !== null && isBetaSent(sticky, G) && !h && !betas.includes(G)) betas.push(G);
  if (!L) return {};
  return w
    ? {
        fallbacks: "default",
      }
    : {
        fallbacks: [
          {
            model: stripAnyVersatileSuffix(lane.model),
          },
        ],
      };
}
//@ chunk-e6aww6q8.js:2398623-2398691 placement
function hasNonTextContent(e) {
  return e.message.content.some((n) => n.type !== "text");
}
//@ chunk-e6aww6q8.js:2398691-2398923 placement
function applyRefusalFallbackBeta(e, n, conversation, s = false, h) {
  if (e && !isBetaRejected_2(conversation, BETA_FALLBACK_CREDIT))
    markBetaSent(conversation, BETA_FALLBACK_CREDIT);
  if (isBetaSent(conversation, BETA_FALLBACK_CREDIT) && !s && !n.includes(BETA_FALLBACK_CREDIT))
    n.push(BETA_FALLBACK_CREDIT);
  if (h && n.includes(BETA_FALLBACK_CREDIT)) {
    let anthropicBeta = h.anthropic_beta;
    if (
      Array.isArray(anthropicBeta) &&
      anthropicBeta.length > 0 &&
      !anthropicBeta.includes(BETA_FALLBACK_CREDIT.header)
    )
      h.anthropic_beta = [...anthropicBeta, BETA_FALLBACK_CREDIT.header];
  }
}
//@ chunk-e6aww6q8.js:2398923-2399073 placement
function readFallbackCreditToken(stopDetails) {
  if (typeof stopDetails !== "object" || stopDetails === null) return;
  let fallbackCreditToken = stopDetails.fallback_credit_token;
  return typeof fallbackCreditToken === "string" &&
    fallbackCreditToken.length > 0 &&
    fallbackCreditToken.length <= 2048
    ? fallbackCreditToken
    : undefined;
}
//@ chunk-e6aww6q8.js:2399073-2399157 placement
function fallbackNotification(e) {
  return {
    type: "fallback",
    from: {
      model: e.fromModel,
    },
    to: {
      model: e.model,
    },
  };
}
//@ chunk-e6aww6q8.js:2399157-2399275 placement
function readModelField(from) {
  if (typeof from !== "object" || from === null) return;
  let model = from.model;
  return typeof model === "string" && model.length > 0 ? model : undefined;
}
//@ chunk-e6aww6q8.js:2399275-2399455 placement
function readRefusalCategory(trigger) {
  if (typeof trigger !== "object" || trigger === null) return null;
  let n = trigger;
  if (n.type !== "refusal") return null;
  let category = n.category;
  return typeof category === "string" && category.length > 0 && category.length <= 64 ? category : null;
}
//@ chunk-e6aww6q8.js:2399455-2399831 placement
/**
 * 解析流中的 fallback 内容块开始事件，得到索引、原模型、回退模型、原因与类别。
 */
function parseFallbackBlockStart(e) {
  if (typeof e !== "object" || e === null) return;
  let n = e;
  if (n.type !== "content_block_start" || typeof n.index !== "number") return;
  let contentBlock = n.content_block;
  if (typeof contentBlock !== "object" || contentBlock === null) return;
  let s = contentBlock;
  if (s.type !== "fallback") return;
  let modelField = readModelField(s.from);
  let modelField_2 = readModelField(s.to);
  return modelField !== undefined && modelField_2 !== undefined
    ? {
        index: n.index,
        fromModel: modelField,
        model: modelField_2,
        reason: "refusal",
        category: readRefusalCategory(s.trigger),
      }
    : undefined;
}
//@ chunk-e6aww6q8.js:2399831-2399999 placement
function parseFallbackMessage(e) {
  if (!isFallbackNotification(e)) return;
  let n = e;
  let modelField = readModelField(n.from);
  let modelField_2 = readModelField(n.to);
  return modelField !== undefined && modelField_2 !== undefined
    ? {
        fromModel: modelField,
        model: modelField_2,
        reason: "refusal",
        category: readRefusalCategory(n.trigger),
      }
    : undefined;
}
//@ chunk-e6aww6q8.js:2399999-2400073 placement
function isFallbackNotification(e) {
  return typeof e === "object" && e !== null && e.type === "fallback";
}
//@ chunk-e6aww6q8.js:2400073-2400317 placement
function isUnreadableFallbackBlock(e) {
  if (typeof e !== "object" || e === null) return false;
  let n = e;
  if (n.type !== "content_block_start" || typeof n.index !== "number") return false;
  let contentBlock = n.content_block;
  if (typeof contentBlock !== "object" || contentBlock === null) return false;
  return contentBlock.type === "fallback" && parseFallbackBlockStart(e) === undefined;
}
//@ chunk-e6aww6q8.js:2400317-2400380 placement
var finiteNonNegative = (e) => (typeof e === "number" && Number.isFinite(e) && e >= 0 ? e : 0);
//@ chunk-e6aww6q8.js:2400380-2400901 placement
/**
 * 计算回退过程中各条 fallback 消息的费用（拒绝回退时排除最后一条）以及回退模型的固定附加费用。
 */
function fallbackMessagesCost(messages, pricing, reason) {
  let reduced = messages.reduce((acc, message, Z) => (message.type === "fallback_message" ? Z : acc), -1);
  let h = reason === "refusal" ? reduced : -1;
  let reduced_2 = messages.reduce(
    (acc, message, Z) =>
      message.type === "fallback_message" && message.model !== undefined && Z !== h
        ? acc +
          calculateCostFromTokenCounts(message.model, message, {
            speed: pricing.speed,
            inferenceGeo: pricing.inferenceGeo,
          })
        : acc,
    0,
  );
  let model = messages.find(
    (message) => message.type === "fallback_message" && message.model !== undefined,
  )?.model;
  let w =
    model !== undefined
      ? calculateCostFromTokenCounts(
          model,
          {
            inputTokens: 0,
            outputTokens: 0,
            cacheReadInputTokens: 0,
            cacheCreationInputTokens: 0,
          },
          {
            speed: pricing.speed,
            inferenceGeo: pricing.inferenceGeo,
            serverToolUse: pricing.serverToolUse,
          },
        )
      : 0;
  let L = reduced_2 + w;
  return Number.isFinite(L) ? L : 0;
}
//@ chunk-e6aww6q8.js:2401522-2401577 placement
/**
 * 导出函数 `preferSameModel`：参数 e, n，返回 e !== void 0 && Bn(e) === Bn(n) ? e : n。
 */
function preferSameModel(model, n) {
  return model !== undefined && stripAnyVersatileSuffix(model) === stripAnyVersatileSuffix(n) ? model : n;
}
//@ chunk-e6aww6q8.js:2401577-2401806 placement
function canUseDefaultFallback(e) {
  if (BETA_SERVER_SIDE_FALLBACK_CATEGORY !== null) {
    let n = walkDownOpusLineup(e.primaryModel);
    return (
      n !== undefined &&
      !isBetaRejected_2(e.sticky, BETA_SERVER_SIDE_FALLBACK_CATEGORY) &&
      noRefusalFallbackOpusModel() &&
      (!isSameModel(e.primaryModel, n) ||
        (everyLineupModelAdmitted(e.primaryModel) && e.selfTargetDefaultFallbacksEnabled())) &&
      e.serverDefaultFallbacksEnabled()
    );
  }
  return false;
}
//@ chunk-e6aww6q8.js:2401806-2401860 placement
var TENGU_DASH_FLAME = "tengu_dash_flame";
var TENGU_ELEGANT_POSSUM = "tengu_elegant_possum";
//@ chunk-e6aww6q8.js:2401860-2402173 placement
/**
 * 选择回退使用的 beta 头：已粘滞的优先，否则按是否允许服务端默认回退决定。
 */
function pickFallbackBeta(e) {
  if (BETA_SERVER_SIDE_FALLBACK_CATEGORY !== null) {
    if (isBetaSent(e.sticky, BETA_SERVER_SIDE_FALLBACK_CATEGORY)) return BETA_SERVER_SIDE_FALLBACK_CATEGORY;
    if (isBetaSent(e.sticky, BETA_SERVER_SIDE_FALLBACK)) return BETA_SERVER_SIDE_FALLBACK;
    return e.fromModel !== undefined &&
      canUseDefaultFallback({
        primaryModel: e.fromModel,
        sticky: e.sticky,
        serverDefaultFallbacksEnabled: e.serverDefaultFallbacksEnabled,
        selfTargetDefaultFallbacksEnabled: e.selfTargetDefaultFallbacksEnabled,
      })
      ? BETA_SERVER_SIDE_FALLBACK_CATEGORY
      : BETA_SERVER_SIDE_FALLBACK;
  }
  return BETA_SERVER_SIDE_FALLBACK;
}
//@ chunk-e6aww6q8.js:2402173-2402260 placement
var l8s = Object.freeze({
  visibleModel: undefined,
  serverLane: undefined,
  shouldLogSuppression: false,
});
//@ chunk-e6aww6q8.js:2402260-2403191 placement
/**
 * 计算拒答后的回退：是否启用、是否静默拒绝、按 Opus 阵容向下找（或级联中的下一个）可见回退模型，以及能否交给服务端自动切换（default/explicit 车道）。
 */
function resolveRefusalFallback(options) {
  if (options.compiledTablesOnly)
    return withCatalogSuppressed(() =>
      resolveRefusalFallback({
        ...options,
        compiledTablesOnly: false,
      }),
    );
  let n = isRefusalFallbackEnabled();
  let r = shouldSilentlyDeclineFallback({
    requestDialog: options.requestDialog,
    isMainThread: options.isMainThread,
    consumerLacksDialogCapability: options.consumerLacksDialogCapability,
  });
  let s = options.inCascadeEpisode ? undefined : walkDownOpusLineup(options.currentModel);
  let h = options.inCascadeEpisode
    ? options.cascadeNext
    : (s ?? (canFallBackFrom(options.currentModel) ? options.currentModel : undefined));
  let y = !options.alreadyUsed && !options.declined && n && !r ? h : undefined;
  let S =
    y !== undefined &&
    s !== undefined &&
    !options.inCascadeEpisode &&
    !options.threadedRequest &&
    !options.preferenceQuestionPending &&
    isAutoSwitchOnFlagEnabled() &&
    !isBetaRejected_2(options.sticky, BETA_SERVER_SIDE_FALLBACK);
  let w =
    S &&
    canUseDefaultFallback({
      primaryModel: options.currentModel,
      sticky: options.sticky,
      serverDefaultFallbacksEnabled: options.serverDefaultFallbacksEnabled,
      selfTargetDefaultFallbacksEnabled: options.selfTargetDefaultFallbacksEnabled,
    })
      ? "default"
      : "explicit";
  let serverLane =
    S && (w === "default" || !isSameModel(options.currentModel, y))
      ? {
          forModel: options.currentModel,
          model: y,
          mode: w,
        }
      : undefined;
  return {
    visibleModel: y,
    serverLane,
    shouldLogSuppression: !options.suppressionAlreadyLogged && n && r && h !== undefined,
  };
}
//@ chunk-e6aww6q8.js:2403191-2403771 placement
/**
 * 描述一次服务端模型回退：遥测字段、是否对用户可见、被丢弃内容是否含工具调用、是否切换会话模型与横幅范围。
 */
function describeServerFallback(event, context) {
  let any = event.discardedMessages.some((discardedMessage) =>
    discardedMessage.message.content.some((w) => w.type === "tool_use"),
  );
  let s = isFallbackReason(event.reason);
  let isMainThread = s && context.isMainThread;
  let emitsLocalScope = s && !context.isMainThread && context.emitsLocalScope;
  return {
    telemetry: {
      reason: asFallbackReason(event.reason),
      midStream: event.midStream,
      discardedBlockCount: event.discardedMessages.length,
      tombstonedHadToolUse: any,
      requestId: event.requestId,
      originalModelScope: classifyFallbackOrigin(event.fromModel),
      finalStopReason: event.finalStopReason,
      apiRefusalCategory:
        event.apiRefusalCategory != null ? normalizeRefusalCategory(event.apiRefusalCategory) : undefined,
    },
    userVisible: s,
    tombstonedToolUse: any,
    swapSession: isMainThread,
    showBanner: isMainThread || emitsLocalScope,
    bannerScope: isMainThread ? "session" : "local",
  };
}
//@ chunk-e6aww6q8.js:2403771-2404352 placement
/**
 * 生成模型拒答回退的系统消息（本地或会话范围），说明原模型、回退模型与拒答类别。
 */
function buildRefusalFallbackSystemMessage(event, ids, scope) {
  return {
    type: "system",
    subtype: "model_refusal_fallback",
    direction: "retry",
    scope,
    content:
      scope === "local"
        ? (event.retainedText?.length ?? 0) > 0
          ? buildFallbackCompletedNotice(event.fromModel, event.toModel, event.apiRefusalCategory)
          : buildFallbackGeneratedNotice(event.fromModel, event.toModel, event.apiRefusalCategory)
        : event.reason === "refusal"
          ? buildRefusalMessage(event.fromModel, event.toModel, event.apiRefusalCategory)
          : safeguardsFlaggedMessage(event.fromModel, event.toModel, event.apiRefusalCategory),
    level: "warning",
    trigger: "refusal",
    originalModel: event.fromModel,
    fallbackModel: event.toModel,
    requestId: event.requestId,
    apiRefusalCategory: event.apiRefusalCategory,
    apiRefusalExplanation: null,
    isMeta: false,
    timestamp: ids.timestamp,
    uuid: ids.uuid,
  };
}
//@ chunk-e6aww6q8.js:2404352-2404526 placement
/**
 * accessFallbackModels 客户端数据结构：for（最多 256 字符）与 models（1–3 个安全模型名）的 schema。
 */
var ACCESSFALLBACKMODELS = "accessFallbackModels";
var MAX_FALLBACK_MODELS = 3;
var MAX_FALLBACK_FOR_CHARS = 256;
var regExp_12 = new RegExp(`^[A-Za-z0-9][${MODEL_NAME_ALLOWED_CHARS}]{0,255}$`);
var accessFallbackModelsSchema = DoctorLazy(() =>
  zodStrictObject({
    for: string().min(1).max(MAX_FALLBACK_FOR_CHARS),
    models: array(string().regex(regExp_12)).min(1).max(MAX_FALLBACK_MODELS),
  }),
);
//@ chunk-e6aww6q8.js:2404526-2404565 placement
/**
 * 是否合法 accessFallbackModels 客户端数据。
 */
function isAccessFallbackModelsData(e) {
  return parseAccessFallbackModels(e) !== undefined;
}
//@ chunk-e6aww6q8.js:2404565-2404750 placement
/**
 * 解析客户端数据 accessFallbackModels：{for, models[≤3]} 经 schema 校验。
 */
function parseAccessFallbackModels(e) {
  if (typeof e !== "object" || e === null || !("models" in e)) return;
  if (!Array.isArray(e.models) || e.models.length > MAX_FALLBACK_MODELS) return;
  let n = accessFallbackModelsSchema().safeParse(e);
  return n.success ? n.data : undefined;
}
export {
  finiteNonNegative,
  readFallbackCreditToken,
  pickFallbackBeta,
  TENGU_DASH_FLAME,
  TENGU_ELEGANT_POSSUM,
  serverFallbackPlan,
  applyRefusalFallbackBeta,
  isFallbackNotification,
  parseFallbackMessage,
  fallbackNotification,
  parseFallbackBlockStart,
  isUnreadableFallbackBlock,
  isFallbackReason,
  hasNonTextContent,
  fallbackMessagesCost,
  preferSameModel,
  resolveRefusalFallback,
  l8s,
  describeServerFallback,
  buildRefusalFallbackSystemMessage,
  modelUnavailableMessage,
  parseAccessFallbackModels,
  ACCESSFALLBACKMODELS,
  isAccessFallbackModelsData,
};
