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
import { Lt } from "./modelIds.js";
import {
  isModelRefused,
  isModelFallbackDisabled,
  findLadderRung,
  markModelRefused,
  ZEi,
  advanceFallbackLadders,
  modelNotAvailableError,
  mss,
  checkModelAccess,
  tno,
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
function DKt(e, n) {
  return classifyProviderModelError(getProviderForModel(e), n);
}
//@ chunk-s61vbvea.js:520522-520557 placement
function fxe(e) {
  return !isAutoModeActive() || modelSupportsAutoMode(e);
}
//@ chunk-s61vbvea.js:520557-520644 placement
function B4r(e, n) {
  let r = Lt(e) + n.slice(Lt(n).length);
  return !isModelRefused(r) && !ladderRungsToSend(n).includes(r);
}
//@ chunk-s61vbvea.js:520644-520718 placement
function ptr(e, n) {
  return B4r(e, n) || ladderStepLosesContext(n, Lt(e) + n.slice(Lt(n).length), largestSessionContextTokens);
}
/**
 * 为不可用模型在同族中找较旧、可用、上下文不缩小的模型作为回退（第一方后端且开关开启）。
 */
//@ chunk-s61vbvea.js:520718-520978 placement
function findOlderAccessibleModel(e) {
  if (
    !isFirstPartyApiBackend() ||
    isModelFallbackDisabled() ||
    !getFeatureValue_CACHED_MAY_BE_STALE("tengu_nifty_finch", !0)
  )
    return;
  let n = Lt(e),
    sliced = e.slice(n.length),
    s = [n, ...olderFirstPartyIdsInFamily(n)],
    index = s.findIndex((S) => isModelRemappedOrRetired(S) || isModelDeprecated(S)),
    found = (index < 0 ? s : s.slice(0, index))
      .slice(1)
      .find(
        (S) =>
          (sliced === "" || supports1mBeta(S)) &&
          isModelAllowed(S + sliced) &&
          !swapShrinksContextWindow(e, S + sliced),
      );
  return found === void 0 ? void 0 : found + sliced;
}
//@ chunk-s61vbvea.js:520978-521023 placement
var Zw = 600000,
  y$ = 60000,
  S$ = new HostScoped(() => new Map());
//@ chunk-s61vbvea.js:521023-521674 placement
function classifyModelAccess(e, n, r = "denied", s = Date.now()) {
  if (!mayStepDownOnRefusal(e) || sessionHasOwnFallback()) return;
  let h = findLadderRung(e);
  if (h === void 0) return;
  if (r === "refused") markModelRefused(e, n);
  let y = `${h.provider}:${h.tier}`,
    of = S$.of(getRootSession().host),
    w = of.get(y);
  if (w !== void 0 && s - w < Zw) return;
  of.set(y, s);
  let R = () => of.set(y, s - Zw + y$);
  (async () => {
    for (let x of h.below) {
      if (isModelRefused(x) || ptr(x, e)) continue;
      if (!fxe(x)) {
        R();
        return;
      }
      let P = await checkProviderModelAccess(x);
      if (P === "accessible") {
        if (mayStepDownOnRefusal(e) && !sessionHasOwnFallback() && (ZEi(e) ?? 0) < s && !ptr(x, e) && fxe(x))
          (markModelRefused(e, n),
            rememberModelAccess(e, "refused"),
            advanceFallbackLadders(x + e.slice(Lt(e).length), ptr, fxe));
        return;
      }
      if (P !== "refused") {
        if (P === void 0 || P === "temporary") R();
        return;
      }
      markModelRefused(x, modelNotAvailableError(x));
    }
  })().catch((x) => {
    (R(), logForDebugging(`[model-access] background tier check failed: ${x}`));
  });
}
//@ chunk-s61vbvea.js:521674-522202 placement
function checkProviderModelAccess(e, n) {
  let r = Lt(e),
    s;
  try {
    s = toProviderWireModelId(r);
  } catch {
    return Promise.resolve(void 0);
  }
  let h = getProviderForModel(r);
  if (h !== "bedrock" && h !== "vertex") return Promise.resolve(void 0);
  let y = mss(s);
  return checkModelAccess(
    r,
    async () => {
      let S = {},
        w = (R) => {
          S.verdict = R;
        };
      try {
        if (h === "bedrock") {
          let { probeBedrockModel: probeBedrockModel } = await import("./chunk-a7mvp1gg.js");
          await probeBedrockModel(s, y, { live: !0, versionTooOld: "unavailable", onVerdict: w });
        } else {
          let { probeVertexModel: probeVertexModel } = await import("./chunk-5wnerh16.js");
          await probeVertexModel(s, { live: !0, versionTooOld: "unavailable", onVerdict: w });
        }
      } catch {
        return;
      }
      return S.verdict;
    },
    n,
  );
}
/**
 * 把模型访问结论记到 Bedrock 或 Vertex 的访问记忆中。
 */
//@ chunk-s61vbvea.js:522202-522463 placement
function rememberModelAccess(e, n) {
  let r = tno(e),
    s = Lt(e);
  if (r === "bedrock")
    import("./chunk-a7mvp1gg.js").then((h) => h.rememberBedrockModelAccess(s, mss(e), n)).catch(() => {});
  else if (r === "vertex")
    import("./chunk-5wnerh16.js").then((h) => h.rememberVertexModelAccess(s, n)).catch(() => {});
}
//@ chunk-s61vbvea.js:522463-522645 placement
function getFirstUserText(e) {
  let found = e.find((h) => h.role === "user");
  if (!found) return "";
  let content = found.content;
  if (typeof content === "string") return content;
  let found_2 = content.find((h) => h.type === "text");
  return found_2?.type === "text" ? found_2.text : "";
}
/**
 * 为旁路查询构建 system 块：按首条用户消息计算指纹，可选加 CLI 系统提示前缀，再追加调用方 system，交给计费/归因头组装函数。
 */
//@ chunk-s61vbvea.js:522645-523454 placement
function buildSideQuerySystem({
  messages: messages,
  system: system,
  skipSystemPromptPrefix: skipSystemPromptPrefix,
  forceAttributionHeader: forceAttributionHeader,
  agentContext: agentContext,
}) {
  let firstUserText = getFirstUserText(messages),
    fingerprint = computeFingerprint(
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
              text: getCLISyspromptPrefix({ isNonInteractive: !1, hasAppendSystemPrompt: !1 }),
            },
          ]),
      ...(Array.isArray(system) ? system : system ? [{ type: "text", text: system }] : []),
    ],
    { fingerprint: fingerprint, agentContext: agentContext, forceAttributionHeader: forceAttributionHeader },
  );
}
//@ chunk-s61vbvea.js:523454-523760 placement
function sendStartupModelCheck(e) {
  let n = [{ role: "user", content: "." }],
    r = { model: e, max_tokens: 1, messages: n };
  try {
    return {
      ...r,
      system: buildSideQuerySystem({ messages: n, agentContext: mainAgentContext() }),
      metadata: getAPIMetadata(),
    };
  } catch (error) {
    return (
      logForDebugging(
        `[model-check] sending the ${e} start-up check without the Claude Code billing block and metadata: ${errorMessage(error)}`,
        { level: "warn" },
      ),
      r
    );
  }
}
/**
 * 在内容块前加一个归因头文本块（可强制忽略环境变量的关闭设置），无头时原样返回。
 */
//@ chunk-w5ndchqs.js:3418-3633 placement
function prependAttributionHeader(e, n) {
  let r = getAttributionHeader(n.fingerprint, n.agentContext, void 0, void 0, void 0, void 0, {
    ignoreEnvOptOut: n.forceAttributionHeader === !0 && !isWIFDispatchAuth(),
    attributionProject: parseAttributionProject(),
  });
  if (!r) return e;
  return [{ type: "text", text: r }, ...e];
}

export {
  B4r,
  DKt,
  fxe,
  sendStartupModelCheck,
  ptr,
  rememberModelAccess,
  classifyModelAccess,
  checkProviderModelAccess,
  findOlderAccessibleModel,
  buildSideQuerySystem,
};
