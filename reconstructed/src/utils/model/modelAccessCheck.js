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
import { getCLISyspromptPrefix, getAttributionHeader } from "../../constants/system.js";
import { mainAgentContext } from "../agentContext.js";
import { getAPIMetadata } from "../../services/api/claude.js";
import { errorMessage } from "../errors.js";
import { isWIFDispatchAuth } from "../auth.js";
import { parseAttributionProject } from "../attributionProject.js";

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
function supportsAutoModeIfActive(e) {
  return !isAutoModeActive() || modelSupportsAutoMode(e);
}
//@ chunk-s61vbvea.js:520557-520644 placement
/**
 * 判断模型既未被拒绝，也不在已发送的阶梯中。
 */
function isRefusedOrSentModel(e, n) {
  let r = strip1mSuffix(e) + n.slice(strip1mSuffix(n).length);
  return !isModelRefused(r) && !ladderRungsToSend(n).includes(r);
}
//@ chunk-s61vbvea.js:520644-520718 placement
/**
 * 判断回退会否丢失上下文（模型被拒或阶梯步缩小窗口）。
 */
function wouldLoseContextOnFallback(e, n) {
  return (
    isRefusedOrSentModel(e, n) ||
    ladderStepLosesContext(
      n,
      strip1mSuffix(e) + n.slice(strip1mSuffix(n).length),
      largestSessionContextTokens,
    )
  );
}
//@ chunk-s61vbvea.js:520718-520978 placement
/**
 * 为不可用模型在同族中找较旧、可用、上下文不缩小的模型作为回退（第一方后端且开关开启）。
 */
function findOlderAccessibleModel(e) {
  if (
    !isFirstPartyApiBackend() ||
    isModelFallbackDisabled() ||
    !getFeatureValue_CACHED_MAY_BE_STALE("tengu_nifty_finch", true)
  )
    return;
  let n = strip1mSuffix(e);
  let sliced = e.slice(n.length);
  let s = [n, ...olderFirstPartyIdsInFamily(n)];
  let index = s.findIndex((S) => isModelRemappedOrRetired(S) || isModelDeprecated(S));
  let found = (index < 0 ? s : s.slice(0, index))
    .slice(1)
    .find(
      (S) =>
        (sliced === "" || supports1mBeta(S)) &&
        isModelAllowed(S + sliced) &&
        !swapShrinksContextWindow(e, S + sliced),
    );
  return found === undefined ? undefined : found + sliced;
}
//@ chunk-s61vbvea.js:520978-521023 placement
var MODEL_ACCESS_BACKOFF_MS = 600000;
var MODEL_ACCESS_BACKOFF_SLACK_MS = 60000;
var modelAccessMemo = new HostScoped(() => new Map());
//@ chunk-s61vbvea.js:521023-521674 placement
function classifyModelAccess(e, error, r = "denied", s = Date.now()) {
  if (!mayStepDownOnRefusal(e) || sessionHasOwnFallback()) return;
  let ladderRung = findLadderRung(e);
  if (ladderRung === undefined) return;
  if (r === "refused") markModelRefused(e, error);
  let y = `${ladderRung.provider}:${ladderRung.tier}`;
  let S = modelAccessMemo.of(getRootSession().host);
  let w = S.get(y);
  if (w !== undefined && s - w < MODEL_ACCESS_BACKOFF_MS) return;
  S.set(y, s);
  let R = () => S.set(y, s - MODEL_ACCESS_BACKOFF_MS + MODEL_ACCESS_BACKOFF_SLACK_MS);
  (async () => {
    for (let x of ladderRung.below) {
      if (isModelRefused(x) || wouldLoseContextOnFallback(x, e)) continue;
      if (!supportsAutoModeIfActive(x)) {
        R();
        return;
      }
      let P = await checkProviderModelAccess(x);
      if (P === "accessible") {
        if (
          mayStepDownOnRefusal(e) &&
          !sessionHasOwnFallback() &&
          (modelAnsweredAt(e) ?? 0) < s &&
          !wouldLoseContextOnFallback(x, e) &&
          supportsAutoModeIfActive(x)
        ) {
          markModelRefused(e, error);
          rememberModelAccess(e, "refused");
          advanceFallbackLadders(
            x + e.slice(strip1mSuffix(e).length),
            wouldLoseContextOnFallback,
            supportsAutoModeIfActive,
          );
        }
        return;
      }
      if (P !== "refused") {
        if (P === undefined || P === "temporary") R();
        return;
      }
      markModelRefused(x, modelNotAvailableError(x));
    }
  })().catch((error) => {
    R();
    logForDebugging(`[model-access] background tier check failed: ${error}`);
  });
}
//@ chunk-s61vbvea.js:521674-522202 placement
function checkProviderModelAccess(e, awsAccessKeyId) {
  let r = strip1mSuffix(e);
  let s;
  try {
    s = toProviderWireModelId(r);
  } catch {
    return Promise.resolve(undefined);
  }
  let providerForModel = getProviderForModel(r);
  if (providerForModel !== "bedrock" && providerForModel !== "vertex") return Promise.resolve(undefined);
  let y = primaryRungTier(s);
  return checkModelAccess(
    r,
    async () => {
      let S = {};
      let onVerdict = (verdict) => {
        S.verdict = verdict;
      };
      try {
        if (providerForModel === "bedrock") {
          let { probeBedrockModel } = await import("./chunk-a7mvp1gg.js");
          await probeBedrockModel(s, y, {
            live: true,
            versionTooOld: "unavailable",
            onVerdict,
          });
        } else {
          let { probeVertexModel } = await import("./chunk-5wnerh16.js");
          await probeVertexModel(s, {
            live: true,
            versionTooOld: "unavailable",
            onVerdict,
          });
        }
      } catch {
        return;
      }
      return S.verdict;
    },
    awsAccessKeyId,
  );
}
//@ chunk-s61vbvea.js:522202-522463 placement
/**
 * 把模型访问结论记到 Bedrock 或 Vertex 的访问记忆中。
 */
function rememberModelAccess(model, n) {
  let r = primaryRungProvider(model);
  let s = strip1mSuffix(model);
  if (r === "bedrock")
    import("./chunk-a7mvp1gg.js")
      .then((h) => h.rememberBedrockModelAccess(s, primaryRungTier(model), n))
      .catch(() => {});
  else if (r === "vertex")
    import("./chunk-5wnerh16.js").then((h) => h.rememberVertexModelAccess(s, n)).catch(() => {});
}
//@ chunk-s61vbvea.js:522463-522645 placement
function getFirstUserText(messages) {
  let found = messages.find((h) => h.role === "user");
  if (!found) return "";
  let content = found.content;
  if (typeof content === "string") return content;
  let found_2 = content.find((h) => h.type === "text");
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
function sendStartupModelCheck(e) {
  let messages = [
    {
      role: "user",
      content: ".",
    },
  ];
  let r = {
    model: e,
    max_tokens: 1,
    messages,
  };
  try {
    return {
      ...r,
      system: buildSideQuerySystem({
        messages,
        agentContext: mainAgentContext(),
      }),
      metadata: getAPIMetadata(),
    };
  } catch (error) {
    logForDebugging(
      `[model-check] sending the ${e} start-up check without the Claude Code billing block and metadata: ${errorMessage(error)}`,
      {
        level: "warn",
      },
    );
    return r;
  }
}
//@ chunk-w5ndchqs.js:3418-3633 placement
/**
 * 在内容块前加一个归因头文本块（可强制忽略环境变量的关闭设置），无头时原样返回。
 */
function prependAttributionHeader(e, n) {
  let attributionHeader = getAttributionHeader(
    n.fingerprint,
    n.agentContext,
    undefined,
    undefined,
    undefined,
    undefined,
    {
      ignoreEnvOptOut: n.forceAttributionHeader === true && !isWIFDispatchAuth(),
      attributionProject: parseAttributionProject(),
    },
  );
  if (!attributionHeader) return e;
  return [
    {
      type: "text",
      text: attributionHeader,
    },
    ...e,
  ];
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
