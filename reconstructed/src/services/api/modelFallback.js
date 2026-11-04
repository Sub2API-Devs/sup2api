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
import { zodStrictObject, stringSchema, array } from "../../../vendor/zod/v4/classic/schemas.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:2398030-2398072 placement
var HTTPS_WWW_ANTHROPIC_COM_NEWS = "https://www.anthropic.com/news/";
//@ chunk-e6aww6q8.js:2398072-2398173 placement
/**
 * 模型不可用时的提示文字（优先使用服务端给出的说明）。
 */
function modelUnavailableMessage(model, reason) {
  return (
    model.blockMessage?.trim() ||
    `${reason} is currently unavailable. Learn more: ${HTTPS_WWW_ANTHROPIC_COM_NEWS}`
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
function serverFallbackPlan(lane, model, betas, sticky, refused = false, useCategory = false) {
  let laneArmed =
    lane !== undefined &&
    !useCategory &&
    model === lane.forModel &&
    isFirstPartyApiBackend() &&
    !isBetaRejected_2(sticky, BETA_SERVER_SIDE_FALLBACK);
  let inLineup =
    laneArmed &&
    BETA_SERVER_SIDE_FALLBACK_CATEGORY !== null &&
    lane.mode === "default" &&
    !isBetaRejected_2(sticky, BETA_SERVER_SIDE_FALLBACK_CATEGORY);
  let fallbackOn = laneArmed && (inLineup || isInRefusalLineup(model, lane.model));
  if (fallbackOn)
    markBetaSent(
      sticky,
      inLineup && BETA_SERVER_SIDE_FALLBACK_CATEGORY !== null
        ? BETA_SERVER_SIDE_FALLBACK_CATEGORY
        : BETA_SERVER_SIDE_FALLBACK,
    );
  for (let beta of [BETA_SERVER_SIDE_FALLBACK, BETA_SERVER_SIDE_FALLBACK_CATEGORY])
    if (beta !== null && isBetaSent(sticky, beta) && !refused && !betas.includes(beta)) betas.push(beta);
  if (!fallbackOn) return {};
  return inLineup
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
function hasNonTextContent(message) {
  return message.message.content.some((block) => block.type !== "text");
}
//@ chunk-e6aww6q8.js:2398691-2398923 placement
function applyRefusalFallbackBeta(armed, betas, conversation, silentArm = false, extraBodyParams) {
  if (armed && !isBetaRejected_2(conversation, BETA_FALLBACK_CREDIT))
    markBetaSent(conversation, BETA_FALLBACK_CREDIT);
  if (isBetaSent(conversation, BETA_FALLBACK_CREDIT) && !silentArm && !betas.includes(BETA_FALLBACK_CREDIT))
    betas.push(BETA_FALLBACK_CREDIT);
  if (extraBodyParams && betas.includes(BETA_FALLBACK_CREDIT)) {
    let anthropicBeta = extraBodyParams.anthropic_beta;
    if (
      Array.isArray(anthropicBeta) &&
      anthropicBeta.length > 0 &&
      !anthropicBeta.includes(BETA_FALLBACK_CREDIT.header)
    )
      extraBodyParams.anthropic_beta = [...anthropicBeta, BETA_FALLBACK_CREDIT.header];
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
function fallbackNotification(block) {
  return {
    type: "fallback",
    from: {
      model: block.fromModel,
    },
    to: {
      model: block.model,
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
  let fallbackTrigger = trigger;
  if (fallbackTrigger.type !== "refusal") return null;
  let category = fallbackTrigger.category;
  return typeof category === "string" && category.length > 0 && category.length <= 64 ? category : null;
}
//@ chunk-e6aww6q8.js:2399455-2399831 placement
/**
 * 解析流中的 fallback 内容块开始事件，得到索引、原模型、回退模型、原因与类别。
 */
function parseFallbackBlockStart(block) {
  if (typeof block !== "object" || block === null) return;
  let start = block;
  if (start.type !== "content_block_start" || typeof start.index !== "number") return;
  let contentBlock = start.content_block;
  if (typeof contentBlock !== "object" || contentBlock === null) return;
  let blockStart = contentBlock;
  if (blockStart.type !== "fallback") return;
  let modelField = readModelField(blockStart.from);
  let modelField_2 = readModelField(blockStart.to);
  return modelField !== undefined && modelField_2 !== undefined
    ? {
        index: start.index,
        fromModel: modelField,
        model: modelField_2,
        reason: "refusal",
        category: readRefusalCategory(blockStart.trigger),
      }
    : undefined;
}
//@ chunk-e6aww6q8.js:2399831-2399999 placement
function parseFallbackMessage(block) {
  if (!isFallbackNotification(block)) return;
  let fallbackBlock = block;
  let modelField = readModelField(fallbackBlock.from);
  let modelField_2 = readModelField(fallbackBlock.to);
  return modelField !== undefined && modelField_2 !== undefined
    ? {
        fromModel: modelField,
        model: modelField_2,
        reason: "refusal",
        category: readRefusalCategory(fallbackBlock.trigger),
      }
    : undefined;
}
//@ chunk-e6aww6q8.js:2399999-2400073 placement
function isFallbackNotification(block) {
  return typeof block === "object" && block !== null && block.type === "fallback";
}
//@ chunk-e6aww6q8.js:2400073-2400317 placement
function isUnreadableFallbackBlock(event) {
  if (typeof event !== "object" || event === null) return false;
  let fallbackEvent = event;
  if (fallbackEvent.type !== "content_block_start" || typeof fallbackEvent.index !== "number") return false;
  let contentBlock = fallbackEvent.content_block;
  if (typeof contentBlock !== "object" || contentBlock === null) return false;
  return contentBlock.type === "fallback" && parseFallbackBlockStart(event) === undefined;
}
//@ chunk-e6aww6q8.js:2400317-2400380 placement
var finiteNonNegative = (value) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
//@ chunk-e6aww6q8.js:2400380-2400901 placement
/**
 * 计算回退过程中各条 fallback 消息的费用（拒绝回退时排除最后一条）以及回退模型的固定附加费用。
 */
function fallbackMessagesCost(messages, pricing, reason) {
  let reduced = messages.reduce(
    (acc, message, index) => (message.type === "fallback_message" ? index : acc),
    -1,
  );
  let fromIndex = reason === "refusal" ? reduced : -1;
  let reduced_2 = messages.reduce(
    (acc, message, index) =>
      message.type === "fallback_message" && message.model !== undefined && index !== fromIndex
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
  let dropped =
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
  let limitIndex = reduced_2 + dropped;
  return Number.isFinite(limitIndex) ? limitIndex : 0;
}
//@ chunk-e6aww6q8.js:2401522-2401577 placement
/**
 * 导出函数 `preferSameModel`：参数 e, n，返回 e !== void 0 && Bn(e) === Bn(n) ? e : n。
 */
function preferSameModel(model, otherModel) {
  return model !== undefined && stripAnyVersatileSuffix(model) === stripAnyVersatileSuffix(otherModel)
    ? model
    : otherModel;
}
//@ chunk-e6aww6q8.js:2401577-2401806 placement
function canUseDefaultFallback(reason) {
  if (BETA_SERVER_SIDE_FALLBACK_CATEGORY !== null) {
    let walked = walkDownOpusLineup(reason.primaryModel);
    return (
      walked !== undefined &&
      !isBetaRejected_2(reason.sticky, BETA_SERVER_SIDE_FALLBACK_CATEGORY) &&
      noRefusalFallbackOpusModel() &&
      (!isSameModel(reason.primaryModel, walked) ||
        (everyLineupModelAdmitted(reason.primaryModel) && reason.selfTargetDefaultFallbacksEnabled())) &&
      reason.serverDefaultFallbacksEnabled()
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
function pickFallbackBeta(options) {
  if (BETA_SERVER_SIDE_FALLBACK_CATEGORY !== null) {
    if (isBetaSent(options.sticky, BETA_SERVER_SIDE_FALLBACK_CATEGORY))
      return BETA_SERVER_SIDE_FALLBACK_CATEGORY;
    if (isBetaSent(options.sticky, BETA_SERVER_SIDE_FALLBACK)) return BETA_SERVER_SIDE_FALLBACK;
    return options.fromModel !== undefined &&
      canUseDefaultFallback({
        primaryModel: options.fromModel,
        sticky: options.sticky,
        serverDefaultFallbacksEnabled: options.serverDefaultFallbacksEnabled,
        selfTargetDefaultFallbacksEnabled: options.selfTargetDefaultFallbacksEnabled,
      })
      ? BETA_SERVER_SIDE_FALLBACK_CATEGORY
      : BETA_SERVER_SIDE_FALLBACK;
  }
  return BETA_SERVER_SIDE_FALLBACK;
}
//@ chunk-e6aww6q8.js:2402173-2402260 placement
var NO_SUPPRESSION; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:2402173", () => {
  NO_SUPPRESSION = Object.freeze({
    visibleModel: undefined,
    serverLane: undefined,
    shouldLogSuppression: false,
  });
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
  let enabled = isRefusalFallbackEnabled();
  let shouldDecline = shouldSilentlyDeclineFallback({
    requestDialog: options.requestDialog,
    isMainThread: options.isMainThread,
    consumerLacksDialogCapability: options.consumerLacksDialogCapability,
  });
  let walked = options.inCascadeEpisode ? undefined : walkDownOpusLineup(options.currentModel);
  let candidate = options.inCascadeEpisode
    ? options.cascadeNext
    : (walked ?? (canFallBackFrom(options.currentModel) ? options.currentModel : undefined));
  let chosen = !options.alreadyUsed && !options.declined && enabled && !shouldDecline ? candidate : undefined;
  let out =
    chosen !== undefined &&
    walked !== undefined &&
    !options.inCascadeEpisode &&
    !options.threadedRequest &&
    !options.preferenceQuestionPending &&
    isAutoSwitchOnFlagEnabled() &&
    !isBetaRejected_2(options.sticky, BETA_SERVER_SIDE_FALLBACK);
  let tail =
    out &&
    canUseDefaultFallback({
      primaryModel: options.currentModel,
      sticky: options.sticky,
      serverDefaultFallbacksEnabled: options.serverDefaultFallbacksEnabled,
      selfTargetDefaultFallbacksEnabled: options.selfTargetDefaultFallbacksEnabled,
    })
      ? "default"
      : "explicit";
  let serverLane =
    out && (tail === "default" || !isSameModel(options.currentModel, chosen))
      ? {
          forModel: options.currentModel,
          model: chosen,
          mode: tail,
        }
      : undefined;
  return {
    visibleModel: chosen,
    serverLane,
    shouldLogSuppression:
      !options.suppressionAlreadyLogged && enabled && shouldDecline && candidate !== undefined,
  };
}
//@ chunk-e6aww6q8.js:2403191-2403771 placement
/**
 * 描述一次服务端模型回退：遥测字段、是否对用户可见、被丢弃内容是否含工具调用、是否切换会话模型与横幅范围。
 */
function describeServerFallback(event, context) {
  let any = event.discardedMessages.some((discardedMessage) =>
    discardedMessage.message.content.some((block) => block.type === "tool_use"),
  );
  let reason = isFallbackReason(event.reason);
  let isMainThread = reason && context.isMainThread;
  let emitsLocalScope = reason && !context.isMainThread && context.emitsLocalScope;
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
    userVisible: reason,
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
var ACCESSFALLBACKMODELS; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var MAX_FALLBACK_MODELS;
var MAX_FALLBACK_FOR_CHARS;
var regExp_12;
var accessFallbackModelsSchema;
deferInit("chunk-e6aww6q8.js:2404352", () => {
  ACCESSFALLBACKMODELS = "accessFallbackModels";
  MAX_FALLBACK_MODELS = 3;
  MAX_FALLBACK_FOR_CHARS = 256;
  regExp_12 = new RegExp(`^[A-Za-z0-9][${MODEL_NAME_ALLOWED_CHARS}]{0,255}$`);
  accessFallbackModelsSchema = DoctorLazy(() =>
    zodStrictObject({
      for: stringSchema().min(1).max(MAX_FALLBACK_FOR_CHARS),
      models: array(stringSchema().regex(regExp_12)).min(1).max(MAX_FALLBACK_MODELS),
    }),
  );
});
//@ chunk-e6aww6q8.js:2404526-2404565 placement
/**
 * 是否合法 accessFallbackModels 客户端数据。
 */
function isAccessFallbackModelsData(data) {
  return parseAccessFallbackModels(data) !== undefined;
}
//@ chunk-e6aww6q8.js:2404565-2404750 placement
/**
 * 解析客户端数据 accessFallbackModels：{for, models[≤3]} 经 schema 校验。
 */
function parseAccessFallbackModels(data) {
  if (typeof data !== "object" || data === null || !("models" in data)) return;
  if (!Array.isArray(data.models) || data.models.length > MAX_FALLBACK_MODELS) return;
  let parsed = accessFallbackModelsSchema().safeParse(data);
  return parsed.success ? parsed.data : undefined;
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
  NO_SUPPRESSION,
  describeServerFallback,
  buildRefusalFallbackSystemMessage,
  modelUnavailableMessage,
  parseAccessFallbackModels,
  ACCESSFALLBACKMODELS,
  isAccessFallbackModelsData,
};
