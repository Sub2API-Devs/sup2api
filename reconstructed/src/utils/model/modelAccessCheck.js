/**
 * utils/model/modelAccessCheck.ts
 *
 * 模型访问检查（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (12), chunk-w5ndchqs.js (1)
 * attribution: placement 13
 */
import { getAttributionHeader, getCLISyspromptPrefix } from "../../constants/system.js";
import { isWIFDispatchAuth } from "../auth.js";
import { parseAttributionProject } from "../attributionProject.js";
import { classifyProviderModelError } from "../../services/api/providerModelErrors.js";
import { getProviderForModel, isFirstPartyApiBackend } from "./providers.js";
import { isAutoModeActive } from "../permissions/autoModeState.js";
import { modelSupportsAutoMode } from "../betas.js";
import { strip1mSuffix } from "./modelIds.js";
import {
  isModelRefused,
  isModelFallbackDisabled,
  findLadderRung,
  markModelRefused,
  modelAnsweredAt,
  advanceFallbackLadders,
  modelNotAvailableError,
  primaryRungTier,
  checkModelAccess,
  primaryRungProvider,
} from "./modelUnavailability.js";
import {
  ladderRungsToSend,
  ladderStepLosesContext,
  largestSessionContextTokens,
  swapShrinksContextWindow,
} from "./smallFastModel.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { olderFirstPartyIdsInFamily } from "./stalePins.js";
import { isModelRemappedOrRetired, isModelDeprecated } from "./deprecation.js";
import { supports1mBeta } from "./contextWindow1m.js";
import { isModelAllowed } from "./modelAllowlist.js";
import { HostScoped } from "../hostScoped.js";
import { mayStepDownOnRefusal, sessionHasOwnFallback } from "./modelFallback.js";
import { getRootSession } from "../../bootstrap/state.js";
import { logForDebugging } from "../debug.js";
import { toProviderWireModelId } from "./model.js";
import { computeFingerprint } from "../fingerprint.js";
import { mainAgentContext } from "../agentContext.js";
import { getAPIMetadata } from "../../services/api/claude.js";
import { errorMessage } from "../errors.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-w5ndchqs.js:3418-3633 placement
/**
 * 在内容块前加一个归因头文本块（可强制忽略环境变量的关闭设置），无头时原样返回。
 */
function prependAttributionHeader(content, options) {
  let attributionHeader = getAttributionHeader(
    options.fingerprint,
    options.agentContext,
    undefined,
    undefined,
    undefined,
    undefined,
    {
      ignoreEnvOptOut: options.forceAttributionHeader === true && !isWIFDispatchAuth(),
      attributionProject: parseAttributionProject(),
    },
  );
  if (!attributionHeader) return content;
  return [
    {
      type: "text",
      text: attributionHeader,
    },
    ...content,
  ];
}
//@ chunk-s61vbvea.js:520484-520522 placement
/**
 * 按模型所属提供商分类错误。
 */
function classifyProviderErrorForModel(model, error) {
  return classifyProviderModelError(getProviderForModel(model), error);
}
//@ chunk-s61vbvea.js:520522-520557 placement
/**
 * 自动模式激活时判断模型是否支持自动模式。
 */
function supportsAutoModeIfActive(model) {
  return !isAutoModeActive() || modelSupportsAutoMode(model);
}
//@ chunk-s61vbvea.js:520557-520644 placement
/**
 * 判断模型既未被拒绝，也不在已发送的阶梯中。
 */
function isRefusedOrSentModel(fromModel, toModel) {
  let targetModel = strip1mSuffix(fromModel) + toModel.slice(strip1mSuffix(toModel).length);
  return !isModelRefused(targetModel) && !ladderRungsToSend(toModel).includes(targetModel);
}
//@ chunk-s61vbvea.js:520644-520718 placement
/**
 * 判断回退会否丢失上下文（模型被拒或阶梯步缩小窗口）。
 */
function wouldLoseContextOnFallback(currentModel, fallbackModel) {
  return (
    isRefusedOrSentModel(currentModel, fallbackModel) ||
    ladderStepLosesContext(
      fallbackModel,
      strip1mSuffix(currentModel) + fallbackModel.slice(strip1mSuffix(fallbackModel).length),
      largestSessionContextTokens,
    )
  );
}
//@ chunk-s61vbvea.js:520718-520978 placement
/**
 * 为不可用模型在同族中找较旧、可用、上下文不缩小的模型作为回退（第一方后端且开关开启）。
 */
function findOlderAccessibleModel(model) {
  if (
    !isFirstPartyApiBackend() ||
    isModelFallbackDisabled() ||
    !getFeatureValue_CACHED_MAY_BE_STALE("tengu_nifty_finch", true)
  )
    return;
  let baseModel = strip1mSuffix(model);
  let sliced = model.slice(baseModel.length);
  let candidates = [baseModel, ...olderFirstPartyIdsInFamily(baseModel)];
  let index = candidates.findIndex(
    (candidate) => isModelRemappedOrRetired(candidate) || isModelDeprecated(candidate),
  );
  let found = (index < 0 ? candidates : candidates.slice(0, index))
    .slice(1)
    .find(
      (olderModel) =>
        (sliced === "" || supports1mBeta(olderModel)) &&
        isModelAllowed(olderModel + sliced) &&
        !swapShrinksContextWindow(model, olderModel + sliced),
    );
  return found === undefined ? undefined : found + sliced;
}
//@ chunk-s61vbvea.js:520978-521023 placement
var MODEL_ACCESS_BACKOFF_MS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MODEL_ACCESS_BACKOFF_SLACK_MS;
var modelAccessMemo;
deferInit("chunk-s61vbvea.js:520978", () => {
  MODEL_ACCESS_BACKOFF_MS = 600000;
  MODEL_ACCESS_BACKOFF_SLACK_MS = 60000;
  modelAccessMemo = new HostScoped(() => new Map());
});
//@ chunk-s61vbvea.js:521023-521674 placement
function classifyModelAccess(model, error, kind = "denied", now = Date.now()) {
  if (!mayStepDownOnRefusal(model) || sessionHasOwnFallback()) return;
  let ladderRung = findLadderRung(model);
  if (ladderRung === undefined) return;
  if (kind === "refused") markModelRefused(model, error);
  let ladderKey = `${ladderRung.provider}:${ladderRung.tier}`;
  let lastCheckByLadder = modelAccessMemo.of(getRootSession().host);
  let lastCheck = lastCheckByLadder.get(ladderKey);
  if (lastCheck !== undefined && now - lastCheck < MODEL_ACCESS_BACKOFF_MS) return;
  lastCheckByLadder.set(ladderKey, now);
  let markRateLimited = () =>
    lastCheckByLadder.set(ladderKey, now - MODEL_ACCESS_BACKOFF_MS + MODEL_ACCESS_BACKOFF_SLACK_MS);
  (async () => {
    for (let belowModel of ladderRung.below) {
      if (isModelRefused(belowModel) || wouldLoseContextOnFallback(belowModel, model)) continue;
      if (!supportsAutoModeIfActive(belowModel)) {
        markRateLimited();
        return;
      }
      let access = await checkProviderModelAccess(belowModel);
      if (access === "accessible") {
        if (
          mayStepDownOnRefusal(model) &&
          !sessionHasOwnFallback() &&
          (modelAnsweredAt(model) ?? 0) < now &&
          !wouldLoseContextOnFallback(belowModel, model) &&
          supportsAutoModeIfActive(belowModel)
        ) {
          markModelRefused(model, error);
          rememberModelAccess(model, "refused");
          advanceFallbackLadders(
            belowModel + model.slice(strip1mSuffix(model).length),
            wouldLoseContextOnFallback,
            supportsAutoModeIfActive,
          );
        }
        return;
      }
      if (access !== "refused") {
        if (access === undefined || access === "temporary") markRateLimited();
        return;
      }
      markModelRefused(belowModel, modelNotAvailableError(belowModel));
    }
  })().catch((error) => {
    markRateLimited();
    logForDebugging(`[model-access] background tier check failed: ${error}`);
  });
}
//@ chunk-s61vbvea.js:521674-522202 placement
function checkProviderModelAccess(model, cacheKey) {
  let baseModel = strip1mSuffix(model);
  let wireModelId;
  try {
    wireModelId = toProviderWireModelId(baseModel);
  } catch {
    return Promise.resolve(undefined);
  }
  let providerForModel = getProviderForModel(baseModel);
  if (providerForModel !== "bedrock" && providerForModel !== "vertex") return Promise.resolve(undefined);
  let tier = primaryRungTier(wireModelId);
  return checkModelAccess(
    baseModel,
    async () => {
      let probeState = {};
      let onVerdict = (verdict) => {
        probeState.verdict = verdict;
      };
      try {
        if (providerForModel === "bedrock") {
          let { probeBedrockModel } = await import("./bedrockDefaultCheck.js");
          await probeBedrockModel(wireModelId, tier, {
            live: true,
            versionTooOld: "unavailable",
            onVerdict,
          });
        } else {
          let { probeVertexModel } = await import("./checkVertexDefaultAvailability.lazy.js");
          await probeVertexModel(wireModelId, {
            live: true,
            versionTooOld: "unavailable",
            onVerdict,
          });
        }
      } catch {
        return;
      }
      return probeState.verdict;
    },
    cacheKey,
  );
}
//@ chunk-s61vbvea.js:522202-522463 placement
/**
 * 把模型访问结论记到 Bedrock 或 Vertex 的访问记忆中。
 */
function rememberModelAccess(model, state) {
  let provider = primaryRungProvider(model);
  let baseModel = strip1mSuffix(model);
  if (provider === "bedrock")
    import("./bedrockDefaultCheck.js")
      .then((bedrockModule) =>
        bedrockModule.rememberBedrockModelAccess(baseModel, primaryRungTier(model), state),
      )
      .catch(() => {});
  else if (provider === "vertex")
    import("./checkVertexDefaultAvailability.lazy.js")
      .then((vertexModule) => vertexModule.rememberVertexModelAccess(baseModel, state))
      .catch(() => {});
}
//@ chunk-s61vbvea.js:522463-522645 placement
function getFirstUserText(messages) {
  let found = messages.find((message) => message.role === "user");
  if (!found) return "";
  let content = found.content;
  if (typeof content === "string") return content;
  let found_2 = content.find((block) => block.type === "text");
  return found_2?.type === "text" ? found_2.text : "";
}
//@ chunk-s61vbvea.js:522645-523454 placement
/**
 * 为旁路查询构建 system 块：按首条用户消息计算指纹，可选加 CLI 系统提示前缀，再追加调用方 system，交给计费/归因头组装函数。
 */
function buildSideQuerySystem({
  messages,
  system,
  skipSystemPromptPrefix,
  forceAttributionHeader,
  agentContext,
}) {
  let firstUserText = getFirstUserText(messages);
  let fingerprint = computeFingerprint(
    firstUserText,
    {
      ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
      PACKAGE_URL: "@anthropic-ai/claude-code",
      README_URL: "https://code.claude.com/docs/en/overview",
      VERSION: "2.1.316",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-10-30T23:28:13Z",
      GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    }.VERSION,
  );
  return prependAttributionHeader(
    [
      ...(skipSystemPromptPrefix
        ? []
        : [
            {
              type: "text",
              text: getCLISyspromptPrefix({
                isNonInteractive: false,
                hasAppendSystemPrompt: false,
              }),
            },
          ]),
      ...(Array.isArray(system)
        ? system
        : system
          ? [
              {
                type: "text",
                text: system,
              },
            ]
          : []),
    ],
    {
      fingerprint,
      agentContext,
      forceAttributionHeader,
    },
  );
}
//@ chunk-s61vbvea.js:523454-523760 placement
function sendStartupModelCheck(model) {
  let messages = [
    {
      role: "user",
      content: ".",
    },
  ];
  let request = {
    model,
    max_tokens: 1,
    messages,
  };
  try {
    return {
      ...request,
      system: buildSideQuerySystem({
        messages,
        agentContext: mainAgentContext(),
      }),
      metadata: getAPIMetadata(),
    };
  } catch (error) {
    logForDebugging(
      `[model-check] sending the ${model} start-up check without the Claude Code billing block and metadata: ${errorMessage(error)}`,
      {
        level: "warn",
      },
    );
    return request;
  }
}
export {
  isRefusedOrSentModel,
  classifyProviderErrorForModel,
  supportsAutoModeIfActive,
  sendStartupModelCheck,
  wouldLoseContextOnFallback,
  rememberModelAccess,
  classifyModelAccess,
  checkProviderModelAccess,
  findOlderAccessibleModel,
  buildSideQuerySystem,
};
