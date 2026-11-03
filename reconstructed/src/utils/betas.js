/**
 * utils/betas.ts
 *
 * anthropic-beta 头的组装：按模型与提供商列出基础 beta（getAllModelBetas 的条件表）、每轮附加 beta（per-turn-control、mid-conversation-tool-changes、inline-tools）、SDK 自带 beta 过滤，以及模型能力判定（交错思考、context management、structured outputs、中途 system 消息、temperature、auto mode）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/betas.ts
 * pieces: chunk-aepeg2w5.js (51), chunk-bwbq4xvm.js (13)
 * attribution: fingerprint 9, placement 20, affinity 1, layout 7, facade-exports 27
 */
import { expandBedrockModelIdVariants } from "./model/modelCatalog/catalogSeed.js";
import {
  hasFirstPartyCapabilities,
  getProviderForModel,
  getAPIProvider,
  isClaudePlatformProvider,
  isFirstPartyAnthropicBaseUrl,
} from "./model/providers.js";
import {
  modelSupportsCapability,
  modelDefinitelySupports,
  catalogHasCapability,
  getCatalogEntry,
} from "./model/modelCatalog.js";
import {
  cachedGateValue,
  isFoamySpringGateOn,
  isInlineToolsEnabled,
} from "../services/analytics/growthbookGates.js";
import { antEnv, env } from "./env.js";
import { isBetaRejected } from "../bootstrap/stateSlices.js";
import {
  getStickyBetas,
  isContext1mMarkedRefused,
  markContext1mRefused,
  isToolChangeUnsupportedModel,
  getIsNonInteractiveSession,
  getRefusedBetaHeaders,
  getSdkBetas,
} from "../bootstrap/state.js";
import { stripAnyVersatileSuffix, CLAUDE_MYTHOS_PREVIEW } from "./model/modelIds.js";
import { logForDebugging } from "./debug.js";
import { userConfiguredDefault } from "./model/thirdPartyModelDefaults.js";
import { getCanonicalName } from "./model/canonicalModelName.js";
import {
  servedDefaultOutputTokens,
  isCatalogSuppressed,
  withCatalogSuppressed,
} from "./model/modelCatalog/servedCatalog.js";
import { getClientDataDefaultOutputTokens, getModelMaxOutputTokens } from "./context.js";
import { shouldEnableThinkingByDefault, showThinkingSummaries } from "./thinking.js";
import { isClaudeAISubscriber, hasAnthropicApiKey, shouldUseWIFAuth } from "./auth.js";
import { getCapabilityOverrideCached } from "./model/modelSupportOverrides.js";
import { getProviderState, createModelBetaCaches } from "./model/providerCaches.js";
import { strip1mTag, isAntInternalFastModelId } from "./model/model.js";
import { hasComplianceTaint } from "../services/policyLimits/complianceTaints.js";
import { isAutoClassifierActive } from "./permissions/autoModeState.js";
import { parseUserSpecifiedModel } from "./model/modelDisplay.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { has1mSuffix_2, modelHasNative1MContext } from "./model/contextWindow1m.js";
import { freezeHeaderEntry } from "../components/permissions/AskUserQuestionPermissionRequest/QuestionNavigationBar.js";
import { OAUTH_BETA_HEADER } from "../constants/oauth.js";

//@ chunk-aepeg2w5.js:219037-219085 fingerprint = getModelBetas (1)
/**
 * Bedrock 返回模型 id 的跨区域推理配置变体列表，其他提供商返回 [id]。旧版名 getModelBetas 为错配。
 */
function getProviderWireIdVariants(e, n) {
  return n === "bedrock" ? expandBedrockModelIdVariants(e) : [e];
}
//@ chunk-aepeg2w5.js:341166-341312 placement
/**
 * 是否可发送每回合 effort beta。
 */
function supportsPerTurnEffort(e, n) {
  if (!canSendFirstPartyBetas() || !hasFirstPartyCapabilities(getProviderForModel(e))) return false;
  if (modelSupportsCapability(n, "per_turn_effort", e) === false) return false;
  return modelDefinitelySupports(n, "per_turn_effort", e) === true || cachedGateValue?.(n, e) === true;
}
//@ chunk-aepeg2w5.js:341312-341453 placement
/**
 * 是否可发送每回合计时 beta。
 */
function supportsPerTurnTiming(e, canonicalName) {
  if (
    !antEnv.CLAUDE_CODE_PER_TURN_TIMING ||
    !canSendFirstPartyBetas() ||
    !hasFirstPartyCapabilities(getProviderForModel(e))
  )
    return false;
  let r = catalogHasCapability(canonicalName, "per_turn_timing");
  return r === undefined ? supportsPerTurnEffort(e, canonicalName) : r;
}
//@ chunk-aepeg2w5.js:341453-341495 placement
/**
 * 是否带 1M 上下文 beta。
 */
function hasContextBeta(e) {
  return isBetaRejected(e, BETA_PER_MESSAGE_EFFORT) || isBetaRejected(e, BETA_MID_CONVERSATION_SYSTEM);
}
//@ chunk-aepeg2w5.js:341495-341541 placement
/**
 * 支持按轮投入度且没带上下文 beta 时才发该 beta。
 */
function usesPerTurnEffortBeta(e, canonicalName) {
  return supportsPerTurnEffort(e, canonicalName) && !hasContextBeta(getStickyBetas());
}
//@ chunk-aepeg2w5.js:341541-341574 placement
/**
 * 判断该模型是否已被后端拒绝 1M 上下文 beta。
 */
function isContextBetaRefused(e) {
  return isContext1mMarkedRefused(stripAnyVersatileSuffix(e));
}
//@ chunk-aepeg2w5.js:341574-341893 placement
/**
 * 后端拒绝 beta 后为该模型去掉它并记录。
 */
function rejectContextBetaForModel(e) {
  if (isContextBetaRefused(e)) return;
  markContext1mRefused(stripAnyVersatileSuffix(e));
  logForDebugging(
    `[betas] the backend rejected the ${BETA_LONG_CONTEXT.header} beta for ${e} (HTTP 400) and answered once it was removed. It is left out for this model, whose context window is sized without 1M, and is tried again after /clear, a compaction, a resume or a provider change.`,
    {
      level: "warn",
    },
  );
}
//@ chunk-aepeg2w5.js:444296-444410 fingerprint = getToolSearchBetaHeader (0.788)
/**
 * 第三方云（bedrock/vertex/mantle）上该模型是否需要工具搜索 beta 头。
 */
function getToolSearchBetaHeader(envFamily) {
  if (envFamily === null) return false;
  let provider = getAPIProvider();
  if (provider !== "bedrock" && provider !== "vertex" && provider !== "mantle") return false;
  return userConfiguredDefault(envFamily);
}
//@ chunk-aepeg2w5.js:475090-475193 placement
/**
 * 模型默认输出 token 上限。
 */
function defaultMaxOutputTokens(mainLoopModel) {
  let canonicalName = getCanonicalName(mainLoopModel);
  return (
    servedDefaultOutputTokens(mainLoopModel, canonicalName) ??
    getClientDataDefaultOutputTokens(mainLoopModel, canonicalName) ??
    getCatalogEntry(canonicalName)?.max_output_tokens?.default ??
    getModelMaxOutputTokens(mainLoopModel).default
  );
}
//@ chunk-aepeg2w5.js:475236-475473 fingerprint = modelSupportsStructuredOutputs (0.717)
/**
 * 3.x 及 opus-4-0/4-1/4-5/4-6、sonnet-4-0/4-5/4-6、haiku-4-5 这批老模型（第三方云上不接受新 beta）。旧版名错配。
 */
function isLegacyStructuredOutputModel(model) {
  return (
    model.includes("claude-3-") ||
    model === "claude-opus-4-0" ||
    model === "claude-opus-4-1" ||
    model === "claude-opus-4-5" ||
    model === "claude-opus-4-6" ||
    model === "claude-sonnet-4-0" ||
    model === "claude-sonnet-4-5" ||
    model === "claude-sonnet-4-6" ||
    model === "claude-haiku-4-5"
  );
}
//@ chunk-aepeg2w5.js:476485-476681 affinity
/**
 * 模型发布先后表（opus-4-0 … opus-4-8），isOlderModelThan 用它比较。
 */
var MODEL_RELEASE_ORDER = [
  "claude-opus-4-0",
  "claude-sonnet-4-0",
  "claude-opus-4-1",
  "claude-sonnet-4-5",
  "claude-haiku-4-5",
  "claude-opus-4-5",
  "claude-opus-4-6",
  "claude-sonnet-4-6",
  "claude-opus-4-7",
  "claude-opus-4-8",
];
//@ chunk-aepeg2w5.js:476681-476786 fingerprint = modelSupportsAutoMode (0.377)
/**
 * 模型是否早于参照模型（3.x 一律算更早）。旧版名 modelSupportsAutoMode 为错配。
 */
function isOlderModelThan(e, n) {
  if (e.includes("claude-3-")) return true;
  let index = MODEL_RELEASE_ORDER.indexOf(e);
  return index !== -1 && index < MODEL_RELEASE_ORDER.indexOf(n);
}
//@ chunk-aepeg2w5.js:480243-480291 placement
/**
 * beta 头是否允许。
 */
function isBetaHeaderAllowed() {
  if (shouldEnableThinkingByDefault() !== null) return false;
  return true;
}
//@ chunk-aepeg2w5.js:480291-480312 layout
/**
 * SDK 自定义 betas 白名单：只有 context-1m。
 */
var SDK_ALLOWED_BETAS = new Set([BETA_LONG_CONTEXT]);
//@ chunk-aepeg2w5.js:480312-480442 fingerprint = partitionBetasByAllowlist (1)
/**
 * 把 SDK 传入的 beta 分成白名单内/外两组。
 */
function partitionBetasByAllowlist(betas) {
  let allowed = [];
  let disallowed = [];
  for (let beta of betas) {
    let betaByName = getBetaByName(beta);
    if (betaByName && SDK_ALLOWED_BETAS.has(betaByName)) allowed.push(beta);
    else disallowed.push(beta);
  }
  return {
    allowed,
    disallowed,
  };
}
//@ chunk-aepeg2w5.js:480442-480804 facade-exports = filterAllowedSdkBetas (1)
/**
 * 过滤 SDK 自定义 betas：订阅用户直接忽略并警告；不在白名单的逐个警告。
 */
function filterAllowedSdkBetas(sdkBetas) {
  if (!sdkBetas || sdkBetas.length === 0) return;
  if (isClaudeAISubscriber()) {
    console.warn("Warning: Custom betas are only available for API key users. Ignoring provided betas.");
    return;
  }
  let { allowed, disallowed } = partitionBetasByAllowlist(sdkBetas);
  for (let beta of disallowed)
    console.warn(
      `Warning: Beta header '${beta}' is not allowed. Only the following betas are supported: ${betaHeaderValues([...SDK_ALLOWED_BETAS]).join(", ")}`,
    );
  return allowed.length > 0 ? allowed : undefined;
}
//@ chunk-aepeg2w5.js:480804-481034 facade-exports = modelSupportsISP (0.609)
/**
 * 模型是否支持交错思考（interleaved-thinking beta）：能力覆盖优先；foundry 一律支持；第一方系提供商除 3.x 外都支持；haiku-4-5 与 3.x 不支持。
 */
function modelSupportsISP(model) {
  let supported3P = getCapabilityOverrideCached(model, "interleaved_thinking");
  if (supported3P !== undefined) return supported3P;
  let canonical = getCanonicalName(model);
  let provider = getProviderForModel(model);
  if (provider === "foundry") return true;
  if (hasFirstPartyCapabilities(provider)) return !canonical.includes("claude-3-");
  if (canonical === "claude-haiku-4-5" || canonical.includes("claude-3-")) return false;
  return true;
}
//@ chunk-aepeg2w5.js:481034-481082 facade-exports
/**
 * Vertex 上该模型是否支持 web search beta（不早于 opus-4-0）。
 */
function vertexModelSupportsWebSearch(e) {
  return !isOlderModelThan(e, "claude-opus-4-0");
}
//@ chunk-aepeg2w5.js:481082-481269 fingerprint = modelSupportsContextManagement (0.427)
/**
 * 模型是否支持 context-management（API 侧 clear_thinking 等编辑）。
 */
function modelSupportsContextManagement(model) {
  let canonical = getCanonicalName(model);
  let r = modelSupportsCapability(canonical, "context_management", model);
  if (r === false) return false;
  let provider = getProviderForModel(model);
  if (provider === "foundry") return true;
  if (hasFirstPartyCapabilities(provider)) return !canonical.includes("claude-3-");
  return r || canonical === "claude-mythos-5";
}
//@ chunk-aepeg2w5.js:481269-481426 facade-exports
/**
 * 模型是否支持 structured outputs：仅第一方系提供商、未禁用实验 beta 与 CLAUDE_CODE_DISABLE_STRUCTURED_OUTPUTS、不早于 opus-4-1。
 */
function modelSupportsStructuredOutputs(e) {
  let canonicalName = getCanonicalName(e);
  let providerForModel = getProviderForModel(e);
  if (!hasFirstPartyCapabilities(providerForModel)) return false;
  if (areExperimentalBetasDisabled()) return false;
  if (env.CLAUDE_CODE_DISABLE_STRUCTURED_OUTPUTS) return false;
  return !isOlderModelThan(canonicalName, "claude-opus-4-1");
}
//@ chunk-aepeg2w5.js:481426-481491 layout
/**
 * 当前会话的 beta 结果缓存（服务目录被抑制时用 compiledOnly 版）。
 */
function getBetaCacheStore() {
  let providerState = getProviderState();
  return isCatalogSuppressed() ? providerState.betasCompiledOnly : providerState.betas;
}
//@ chunk-aepeg2w5.js:481491-481658 layout
/**
 * 按模型缓存 beta 计算结果，并同步写一份不看服务目录的版本。
 */
function memoizeBetaResult(e, n, r) {
  let s = e(getBetaCacheStore());
  let h = s.get(n);
  if (h !== undefined) return h;
  let y = r();
  s.set(n, y);
  if (!isCatalogSuppressed()) {
    let S = e(getProviderState().betasCompiledOnly);
    if (!S.has(n)) S.set(n, withCatalogSuppressed(r));
  }
  return y;
}
//@ chunk-aepeg2w5.js:481658-481726 facade-exports
/**
 * 模型是否接受中途 role=system 消息（mid_conversation_system，缓存）。
 */
function shouldUseMidConvSystem(e) {
  return memoizeBetaResult(
    (n) => n.midConversationSystem,
    e,
    () => computeMidConvSystemSupport(e),
  );
}
//@ chunk-aepeg2w5.js:481726-481805 facade-exports
/**
 * 工具加载提示文本：目录能力优先，否则按模型名判断。
 */
function modelGetsToolLoadedText(model) {
  let canonical = getCanonicalName(model);
  return (
    modelSupportsCapability(canonical, "tool_loaded_text", model) ?? canonical.includes(CLAUDE_MYTHOS_PREVIEW)
  );
}
//@ chunk-aepeg2w5.js:481805-482044 facade-exports
/**
 * 模型是否接受中途工具增减（mid-conversation-tool-changes）：需第一方 beta、接受中途 system；可用 CLAUDE_CODE_FORCE_MID_CONVERSATION_SYSTEM 强制。
 */
function modelTakesToolAdditions(e) {
  if (!canSendFirstPartyBetas() || !shouldUseMidConvSystem(e)) return false;
  if (env.CLAUDE_CODE_FORCE_MID_CONVERSATION_SYSTEM) return true;
  let canonicalName = getCanonicalName(e);
  if (isToolChangeUnsupportedModel(canonicalName)) return false;
  let r = modelSupportsCapability(canonicalName, "mid_conv_tool_change", e);
  if (r !== undefined) return r;
  return canonicalName === "claude-mythos-5" || getCatalogEntry(strip1mTag(canonicalName)) === undefined;
}
//@ chunk-aepeg2w5.js:482044-482291 layout
/**
 * 中途 system 消息支持判定：HIPAA 关闭；强制开关；能力覆盖；早于 opus-4-8 的不支持；否则看目录（默认支持）。
 */
function computeMidConvSystemSupport(e) {
  if (hasComplianceTaint("hipaa")) return false;
  if (env.CLAUDE_CODE_FORCE_MID_CONVERSATION_SYSTEM) return true;
  let capabilityOverride = getCapabilityOverrideCached(e, "mid_conversation_system");
  if (capabilityOverride !== undefined) return capabilityOverride;
  let canonicalName = getCanonicalName(e);
  if (isOlderModelThan(strip1mTag(canonicalName), "claude-opus-4-8")) return false;
  return modelSupportsCapability(canonicalName, "mid_conv_system", e) ?? true;
}
//@ chunk-aepeg2w5.js:482291-482340 facade-exports
/**
 * sonnet-5 保留中途 system-reminder 标签。
 */
function shouldKeepMidConvSystemReminderTags(e) {
  return getCanonicalName(e) === "claude-sonnet-5";
}
//@ chunk-aepeg2w5.js:482340-482442 facade-exports
/**
 * 模型是否接受 temperature 参数（早于 opus-4-7 的才接受）。
 */
function modelSupportsTemperature(e) {
  let capabilityOverride = getCapabilityOverrideCached(e, "temperature");
  if (capabilityOverride !== undefined) return capabilityOverride;
  return isOlderModelThan(getCanonicalName(e), "claude-opus-4-7");
}
//@ chunk-aepeg2w5.js:482442-482494 facade-exports
/**
 * 模型默认隐藏思考（不早于 opus-4-7）。
 */
function modelHidesThinkingByDefault(e) {
  return !isOlderModelThan(getCanonicalName(e), "claude-opus-4-7");
}
//@ chunk-aepeg2w5.js:482494-482594 facade-exports = getToolSearchBetaHeader (0.788)
/**
 * 第三方云是否接受 thinking-binding-controls beta（vertex 接受；bedrock/mantle 上老模型不接受）。
 */
function thirdPartyAcceptsThinkingBindingBeta(providerForModel, model) {
  if (providerForModel === "vertex") return true;
  if (providerForModel !== "bedrock" && providerForModel !== "mantle") return false;
  return !isLegacyStructuredOutputModel(getCanonicalName(model));
}
//@ chunk-aepeg2w5.js:482594-482669 facade-exports
/**
 * 第三方云是否接受 dangerous-tool-use beta。
 */
function thirdPartyAcceptsDangerousToolUseBeta(provider, resolvedModel) {
  if (provider !== "bedrock" && provider !== "mantle") return true;
  return !isLegacyStructuredOutputModel(getCanonicalName(resolvedModel));
}
//@ chunk-aepeg2w5.js:482669-482727 facade-exports = logEventTo1P (1)
/**
 * 非第一方、非 anthropicAws/GoogleCloud 的提供商（auto mode 第三方选项）。
 */
function isAutoMode3POptIn() {
  let apiProvider = getAPIProvider();
  return apiProvider !== "firstParty" && !isClaudePlatformProvider(apiProvider);
}
//@ chunk-aepeg2w5.js:482727-482761 facade-exports
/**
 * 是否允许发 afk-mode beta：第一方 beta 可用或第三方 auto mode。
 */
function shouldAllowAfkModeBeta() {
  return canSendFirstPartyBetas() || isAutoMode3POptIn();
}
//@ chunk-aepeg2w5.js:482761-482808 placement = MITIGATION_EXEMPT_MODELS (1)
/**
 * 模型是否排在 claude-opus-4-6 之前（modelSupportsAutoMode 的排序比较）；被快速模式支持判断使用。归属与旧版名均疑似错误。
 */
function isModelOlderThanOpus46(canonicalName) {
  return isOlderModelThan(canonicalName, "claude-opus-4-6");
}
//@ chunk-aepeg2w5.js:482808-482975 facade-exports
/**
 * 模型是否支持 auto mode（第三方上 opus-4-6、sonnet-4-6、haiku（除 5-5）不支持）。
 */
function modelSupportsAutoMode(e) {
  let canonicalName = getCanonicalName(e);
  if (isModelOlderThanOpus46(canonicalName)) return false;
  if (
    isAutoMode3POptIn() &&
    (canonicalName === "claude-opus-4-6" ||
      canonicalName === "claude-sonnet-4-6" ||
      (canonicalName.includes("haiku") && canonicalName !== "claude-haiku-5-5"))
  )
    return false;
  return true;
}
//@ chunk-aepeg2w5.js:482975-483107 facade-exports
/**
 * auto mode 支持情况：{supported, disableFastModeBreakerFires}。
 */
function getAutoModeModelSupport({ model, fastMode, disableFastMode }) {
  let s = disableFastMode && (fastMode || isAntInternalFastModelId(model));
  return {
    supported: modelSupportsAutoMode(model) && !s,
    disableFastModeBreakerFires: s,
  };
}
//@ chunk-aepeg2w5.js:483107-483575 facade-exports
/**
 * 当前权限模式下技能/命令指定的模型是否允许（auto mode 不支持时记日志拒绝）。
 */
function isSkillModelOverrideAllowedInMode({ skillModel, mode, fastMode }) {
  if (!isAutoClassifierActive(mode)) return true;
  let { supported, disableFastModeBreakerFires } = getAutoModeModelSupport({
    model: parseUserSpecifiedModel(skillModel),
    fastMode,
    disableFastMode: !!getFeatureValue_CACHED_MAY_BE_STALE("tengu_auto_mode_config", {})?.disableFastMode,
  });
  if (supported) return true;
  logForDebugging(
    disableFastModeBreakerFires
      ? `Skill/command model "${skillModel}" skipped: fast mode is disabled for auto mode by config (disableFastMode); keeping the session model`
      : `Skill/command model "${skillModel}" is not supported in auto mode; keeping the session model`,
    {
      level: "warn",
    },
  );
  return false;
}
//@ chunk-aepeg2w5.js:483575-483610 facade-exports
/**
 * 工具搜索 beta：第一方 advanced-tool-use-2025-11-20，第三方 tool-search-tool-2025-10-19。
 */
function getToolSearchBeta() {
  return canSendFirstPartyBetas() ? BETA_TOOL_SEARCH_ADVANCED : BETA_TOOL_SEARCH;
}
//@ chunk-aepeg2w5.js:483610-483724 facade-exports
/**
 * 请求是否打到 Anthropic 自己的后端：anthropicAws 未自定义 base URL，或第一方且为官方 API。
 */
function hitsAnthropicBackend(providerForModel = getAPIProvider()) {
  if (providerForModel === "anthropicAws") return env.ANTHROPIC_AWS_BASE_URL === undefined;
  return providerForModel === "firstParty" && isFirstPartyAnthropicBaseUrl();
}
//@ chunk-aepeg2w5.js:483724-483829 facade-exports
/**
 * 是否用 cache_control scope:"global"（prompt-caching-scope beta）：第一方 beta 可用、官方 API、提供商为 firstParty/anthropicAws。实测第一方形状多出此 beta 与 system 静态块的 scope:global。
 */
function shouldUseGlobalCacheScope() {
  if (!canSendFirstPartyBetas()) return false;
  if (!isFirstPartyAnthropicBaseUrl()) return false;
  let apiProvider = getAPIProvider();
  return apiProvider === "firstParty" || apiProvider === "anthropicAws";
}
//@ chunk-aepeg2w5.js:483829-484719 fingerprint = getAllModelBetas (0.528)
/**
 * 每轮附加 beta 条件表（getMergedBetas 用）：per-turn-control、timing、mid-conversation-tool-changes、inline-tools。
 */
var MODEL_BETA_RULES = [
  {
    beta: BETA_CLAUDE_CODE,
    when: (e) => !e.canonical.includes("haiku"),
  },
  {
    beta: BETA_OAUTH_AUTH,
    when: () =>
      isClaudeAISubscriber() ||
      (shouldIncludeFirstPartyOnlyBetas() && !hasAnthropicApiKey() && shouldUseWIFAuth()),
  },
  {
    beta: BETA_LONG_CONTEXT,
    when: (e) =>
      has1mSuffix_2(e.model) &&
      !modelHasNative1MContext(e.model, {
        byItsOwnName: true,
      }),
  },
  {
    beta: BETA_INTERLEAVED_THINKING,
    when: (e) => !env.DISABLE_INTERLEAVED_THINKING && e.interleavedThinking,
  },
  {
    beta: BETA_REDACT_THINKING,
    when: (e) =>
      e.firstPartyOnlyBetas &&
      e.interleavedThinking &&
      !getIsNonInteractiveSession() &&
      !showThinkingSummaries(),
  },
  {
    beta: BETA_CONTEXT_MANAGEMENT,
    when: (e) => {
      let n = env.USE_API_CONTEXT_MANAGEMENT && false;
      let r = modelSupportsContextManagement(e.model);
      return e.firstPartyCapabilityBetas && (n || r);
    },
  },
  {
    beta: BETA_STRUCTURED_OUTPUTS,
    when: (e) => {
      let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE("tengu_tool_pear", false);
      return (
        e.firstPartyCapabilityBetas &&
        modelSupportsStructuredOutputs(e.model) &&
        featureValue_CACHED_MAY_BE_STALE
      );
    },
  },
  {
    beta: BETA_WEB_SEARCH,
    when: (e) =>
      (e.provider === "vertex" && vertexModelSupportsWebSearch(e.canonical)) || e.provider === "foundry",
  },
  {
    beta: BETA_PROMPT_CACHING_SCOPE,
    when: () => shouldUseGlobalCacheScope(),
  },
  {
    beta: BETA_MID_CONVERSATION_SYSTEM,
    when: (e) => shouldUseMidConvSystem(e.model),
  },
];
var PER_TURN_BETA_RULES = [
  {
    beta: BETA_PER_MESSAGE_EFFORT,
    when: (e) => e.perTurnTiming || supportsPerTurnEffort(e.model, e.canonical),
  },
  {
    beta: BETA_PER_TURN_TIMING,
    when: (e) => e.perTurnTiming,
  },
  {
    beta: BETA_MID_CONV_TOOL_CHANGE,
    when: (e) => isFoamySpringGateOn() && modelTakesToolAdditions(e.model),
  },
  {
    beta: BETA_INLINE_TOOLS,
    when: (e) => isFoamySpringGateOn() && modelTakesToolAdditions(e.model) && isInlineToolsEnabled(),
  },
  ...[],
];
//@ chunk-aepeg2w5.js:484719-484779 facade-exports
/**
 * 模型的基础 beta 列表（缓存）。门面名为准时以门面为准。
 */
function getAllModelBetas(e) {
  return memoizeBetaResult(
    (n) => n.allModelBetas,
    e,
    () => computeAllModelBetas(e),
  );
}
//@ chunk-aepeg2w5.js:484779-485341 layout
/**
 * 按 MODEL_BETA_RULES 计算基础 beta，再追加 ANTHROPIC_BETAS（组织禁用实验 beta 时忽略；已 GA 的 mid-conversation-system 不发）。
 */
function computeAllModelBetas(model) {
  let n = {
    model,
    canonical: getCanonicalName(model),
    provider: getAPIProvider(),
    firstPartyOnlyBetas: canSendFirstPartyBetas(),
    firstPartyCapabilityBetas:
      hasFirstPartyCapabilities(getProviderForModel(model)) && !areExperimentalBetasDisabled(),
    interleavedThinking: modelSupportsISP(model),
  };
  let r = [];
  for (let h of MODEL_BETA_RULES) if (h.when(n)) r.push(h.beta);
  let ANTHROPIC_BETAS = env.ANTHROPIC_BETAS;
  if (ANTHROPIC_BETAS)
    if (isHipaaOrg())
      logForDebugging(
        "ANTHROPIC_BETAS ignored: experimental betas are disabled by your organization's policy",
        {
          level: "debug",
        },
      );
    else
      for (let h of ANTHROPIC_BETAS.split(",")
        .map((y) => y.trim())
        .filter((y) => y && !isAfkModeBeta(y))) {
        if (h === MID_CONVERSATION_SYSTEM_2026_04_07) {
          logForDebugging(`ANTHROPIC_BETAS: '${h}' is generally available; the header is not sent`, {
            level: "debug",
          });
          continue;
        }
        r.push(betaFromName(h));
      }
  return r;
}
//@ chunk-aepeg2w5.js:485341-485529 facade-exports
/**
 * 模型的 beta 列表：Bedrock 去掉放进请求体的那几个；去掉本会话被服务器拒绝过的；1M 原生模型去掉 context-1m。
 */
function getModelBetas(model) {
  let n = memoizeBetaResult(
    (s) => s.modelBetas,
    model,
    () => {
      let allModelBetas = getAllModelBetas(model);
      if (getProviderForModel(model) === "bedrock")
        return allModelBetas.filter((h) => !THINKING_CONTEXT_BETAS.has(h));
      return allModelBetas;
    },
  );
  let refusedBetaHeaders = getRefusedBetaHeaders();
  return dropRedundantContext1m(
    model,
    refusedBetaHeaders.size === 0 ? n : n.filter((s) => !refusedBetaHeaders.has(s)),
  );
}
//@ chunk-aepeg2w5.js:485529-485634 facade-exports
/**
 * Bedrock 需要放进请求体 anthropic_beta 的 beta（interleaved-thinking、context-1m、tool-search-tool）。
 */
function getBedrockExtraBodyParamsBetas(model) {
  return dropRedundantContext1m(
    model,
    memoizeBetaResult(
      (n) => n.bedrockExtraBodyParamsBetas,
      model,
      () => getAllModelBetas(model).filter((n) => THINKING_CONTEXT_BETAS.has(n)),
    ),
  );
}
//@ chunk-aepeg2w5.js:485634-485704 layout
/**
 * 模型本身就是 1M 上下文时去掉 context-1m beta。
 */
function dropRedundantContext1m(e, n) {
  return n.includes(BETA_LONG_CONTEXT) && isContextBetaRefused(e)
    ? n.filter((r) => r !== BETA_LONG_CONTEXT)
    : n;
}
//@ chunk-aepeg2w5.js:485704-486273 facade-exports
/**
 * 本次请求的 beta 列表（queryModel 起点）：getModelBetas + 代理式查询补 claude-code + PER_TURN_BETA_RULES + SDK betas（组织禁用时丢弃，第三方只留白名单）。
 */
function getMergedBetas(model, options) {
  let baseBetas = [...getModelBetas(model)];
  if (options?.isAgenticQuery && !baseBetas.includes(BETA_CLAUDE_CODE)) baseBetas.push(BETA_CLAUDE_CODE);
  let canonicalName = getCanonicalName(model);
  let h = {
    model,
    canonical: canonicalName,
    perTurnTiming: supportsPerTurnTiming(model, canonicalName),
  };
  for (let R of PER_TURN_BETA_RULES) if (R.when(h) && !baseBetas.includes(R.beta)) baseBetas.push(R.beta);
  let sdkBetas = getSdkBetas();
  if (!sdkBetas || sdkBetas.length === 0) return baseBetas;
  let S = unlessHipaa(sdkBetas);
  if (!S) {
    logForDebugging("SDK betas dropped: experimental betas are disabled by your organization's policy", {
      level: "debug",
    });
    return baseBetas;
  }
  let mapped = S.map(betaFromName);
  if (!canSendFirstPartyBetas())
    mapped = mapped.filter((R) => {
      if (THIRD_PARTY_SAFE_BETAS.has(R)) return true;
      logForDebugging(`SDK beta '${R.header}' dropped on 3P`, {
        level: "debug",
      });
      return false;
    });
  return dropRedundantContext1m(model, [...baseBetas, ...mapped.filter((R) => !baseBetas.includes(R))]);
}
//@ chunk-aepeg2w5.js:486273-486316 facade-exports
/**
 * 是否会发 structured-outputs beta。
 */
function willSendStructuredOutputsBeta(e) {
  return getAllModelBetas(e).includes(BETA_STRUCTURED_OUTPUTS);
}
//@ chunk-aepeg2w5.js:486316-486381 facade-exports
/**
 * 清空 beta 缓存。
 */
function clearBetasCaches() {
  let providerState = getProviderState();
  providerState.betas = createModelBetaCaches();
  providerState.betasCompiledOnly = createModelBetaCaches();
}
//@ chunk-aepeg2w5.js:486381-486451 layout
/**
 * 第三方提供商也会发送的 beta 集合；其余 beta 只发给第一方系提供商。
 */
var THIRD_PARTY_SAFE_BETAS = new Set([
  BETA_CLAUDE_CODE,
  BETA_INTERLEAVED_THINKING,
  BETA_LONG_CONTEXT,
  BETA_CONTEXT_MANAGEMENT,
  BETA_STRUCTURED_OUTPUTS,
  BETA_WEB_SEARCH,
  BETA_EFFORT,
  BETA_TOOL_SEARCH,
  BETA_AFK_MODE,
  BETA_DANGEROUS_TOOL_USE,
  BETA_FALLBACK_CREDIT,
  BETA_MID_CONVERSATION_SYSTEM,
  BETA_THINKING_TOKEN_COUNT,
  BETA_THINKING_BINDING_CONTROLS,
  BETA_THINKING_DISPLAY_UPDATES,
]);
//@ chunk-aepeg2w5.js:486451-486517 facade-exports
/**
 * 非第一方系提供商时只保留 THIRD_PARTY_SAFE_BETAS 里的 beta。
 */
function filterBetasForProvider(e) {
  if (shouldIncludeFirstPartyOnlyBetas()) return e;
  return e.filter((n) => THIRD_PARTY_SAFE_BETAS.has(n));
}
//@ chunk-bwbq4xvm.js:152582-152640 placement
function defineLocalBeta(name) {
  return Object.freeze({
    name,
    header: null,
  });
}
//@ chunk-bwbq4xvm.js:152640-155473 placement
/**
 * OAuth 认证 beta（oauth-auth 头）。
 */
var BETA_CLAUDE_CODE = freezeHeaderEntry("claude_code", "claude-code-20250219");
var BETA_OAUTH_AUTH = freezeHeaderEntry("oauth_auth", OAUTH_BETA_HEADER);
var BETA_INTERLEAVED_THINKING = freezeHeaderEntry("interleaved_thinking", "interleaved-thinking-2025-05-14");
var BETA_LONG_CONTEXT = freezeHeaderEntry("long_context", "context-1m-2025-08-07");
var BETA_CONTEXT_MANAGEMENT = freezeHeaderEntry("context_management", "context-management-2025-06-27");
var BETA_STRUCTURED_OUTPUTS = freezeHeaderEntry("structured_outputs", "structured-outputs-2025-12-15");
var BETA_WEB_SEARCH = freezeHeaderEntry("web_search", "web-search-2025-03-05");
var BETA_TOOL_SEARCH_ADVANCED = freezeHeaderEntry("tool_search", "advanced-tool-use-2025-11-20");
var BETA_TOOL_SEARCH = freezeHeaderEntry("tool_search", "tool-search-tool-2025-10-19");
var BETA_EFFORT = freezeHeaderEntry("effort", "effort-2025-11-24");
var BETA_TASK_BUDGETS = freezeHeaderEntry("task_budgets", "task-budgets-2026-03-13");
var BETA_PROMPT_CACHING_SCOPE = freezeHeaderEntry("prompt_caching_scope", "prompt-caching-scope-2026-01-05");
var BETA_PROMPT_CACHING_EVICT = freezeHeaderEntry("prompt_caching_evict", "prompt-caching-evict-2026-05-12");
var BETA_CACHE_KEEPALIVE = freezeHeaderEntry("cache_keepalive", "cache-keepalive-2026-09-03");
var BETA_EXTENDED_CACHE_TTL = freezeHeaderEntry("extended_cache_ttl", "extended-cache-ttl-2025-04-11");
var BETA_SPEED = freezeHeaderEntry("speed", "fast-mode-2026-02-01");
var BETA_REDACT_THINKING = freezeHeaderEntry("redact_thinking", "redact-thinking-2026-02-12");
var BETA_THINKING_RESUMPTION = freezeHeaderEntry("thinking_resumption", "thinking-resumption-2026-07-17");
var BETA_THINKING_TOKEN_COUNT = freezeHeaderEntry("thinking_token_count", "thinking-token-count-2026-05-13");
var BETA_AFK_MODE = freezeHeaderEntry("afk_mode", "afk-mode-2026-01-31");
var BETA_ADVISOR_TOOL = freezeHeaderEntry("advisor_tool", "advisor-tool-2026-03-01");
var BETA_CACHE_DIAGNOSIS = freezeHeaderEntry("cache_diagnosis", "cache-diagnosis-2026-04-07");
var BETA_CONTEXT_HINT = freezeHeaderEntry("context_hint", "context-hint-2026-04-09");
var BETA_MCP_SERVERS = freezeHeaderEntry("mcp_servers", "mcp-servers-2025-12-04");
var BETA_FILES_API = freezeHeaderEntry("files_api", "files-api-2025-04-14");
var BETA_ENVIRONMENTS = freezeHeaderEntry("environments", "environments-2025-11-01");
var BETA_CCR_BYOC = freezeHeaderEntry("ccr_byoc", "ccr-byoc-2025-07-29");
var BETA_MID_CONVERSATION_SYSTEM = defineLocalBeta("mid_conversation_system");
var MID_CONVERSATION_SYSTEM_2026_04_07 = "mid-conversation-system-2026-04-07";
var BETA_PER_MESSAGE_EFFORT = freezeHeaderEntry("per_message_effort", "per-turn-control-2026-07-01");
var BETA_PER_TURN_TIMING = freezeHeaderEntry("per_turn_timing", "timing-2026-09-09");
var BETA_MID_CONV_TOOL_CHANGE = freezeHeaderEntry(
  "mid_conv_tool_change",
  "mid-conversation-tool-changes-2026-07-01",
);
var BETA_INLINE_TOOLS = freezeHeaderEntry("inline_tools", "inline-tools-2026-09-15");
var BETA_SERVER_SIDE_FALLBACK = freezeHeaderEntry("server_side_fallback", "server-side-fallback-2026-06-01");
var BETA_SERVER_SIDE_FALLBACK_CATEGORY = freezeHeaderEntry(
  "server_side_fallback_category",
  "server-side-fallback-2026-07-01",
);
var BETA_FALLBACK_CREDIT = freezeHeaderEntry("fallback_credit", "fallback-credit-2026-06-01");
var BETA_MID_CONV_CACHE_PROMOTION_LATCH = freezeHeaderEntry(
  "mid_conv_cache_promotion_latch",
  "x-cc-internal-mid-conv-cache-promotion",
);
var BETA_MID_CONV_CACHE_PROMOTION_OK_LATCH = freezeHeaderEntry(
  "mid_conv_cache_promotion_ok_latch",
  "x-cc-internal-mid-conv-cache-promotion-ok",
);
var BETA_AUTO_MODE_CLASSIFIER = null;
var THINKING_DISPLAY_BETA = freezeHeaderEntry("auto_mode_classifier", "auto-mode-classifier-2026-07-16");
var BETA_DANGEROUS_TOOL_USE = freezeHeaderEntry("dangerous_tool_use", "dangerous-tool-use-2026-09-03");
var RETIRED_BETA_PLACEHOLDER = null;
var BETA_THINKING_DISPLAY_UPDATES = freezeHeaderEntry(
  "thinking_display_updates",
  "thinking-display-updates-2026-08-18",
);
var THINKING_DISPLAY_NAMED_BETA = defineLocalBeta("thinking_display");
var BETA_THINKING_BINDING_CONTROLS = freezeHeaderEntry(
  "thinking_binding_controls",
  "thinking-binding-controls-2026-08-01",
);
var BETA_MESSAGE_THREADS = freezeHeaderEntry("message_threads", "message-threads-2026-08-12");
var BETA_MID_CONVERSATION_SYSTEM_CLEAR_AT = freezeHeaderEntry(
  "mid_conversation_system_clear_at",
  "mid-conversation-system-clear-at-2026-08-21",
);
var lls = Object.freeze(
  [
    BETA_CLAUDE_CODE,
    BETA_OAUTH_AUTH,
    BETA_INTERLEAVED_THINKING,
    BETA_LONG_CONTEXT,
    BETA_CONTEXT_MANAGEMENT,
    BETA_STRUCTURED_OUTPUTS,
    BETA_WEB_SEARCH,
    BETA_TOOL_SEARCH_ADVANCED,
    BETA_TOOL_SEARCH,
    BETA_EFFORT,
    BETA_TASK_BUDGETS,
    BETA_PROMPT_CACHING_SCOPE,
    BETA_PROMPT_CACHING_EVICT,
    BETA_CACHE_KEEPALIVE,
    BETA_EXTENDED_CACHE_TTL,
    BETA_SPEED,
    BETA_REDACT_THINKING,
    BETA_THINKING_RESUMPTION,
    BETA_THINKING_TOKEN_COUNT,
    BETA_AFK_MODE,
    BETA_ADVISOR_TOOL,
    BETA_CACHE_DIAGNOSIS,
    BETA_CONTEXT_HINT,
    BETA_MCP_SERVERS,
    BETA_FILES_API,
    BETA_ENVIRONMENTS,
    BETA_CCR_BYOC,
    BETA_MID_CONVERSATION_SYSTEM,
    BETA_PER_MESSAGE_EFFORT,
    BETA_PER_TURN_TIMING,
    BETA_MID_CONV_TOOL_CHANGE,
    BETA_INLINE_TOOLS,
    BETA_SERVER_SIDE_FALLBACK,
    BETA_SERVER_SIDE_FALLBACK_CATEGORY,
    BETA_FALLBACK_CREDIT,
    BETA_AUTO_MODE_CLASSIFIER,
    THINKING_DISPLAY_BETA,
    BETA_DANGEROUS_TOOL_USE,
    RETIRED_BETA_PLACEHOLDER,
    BETA_THINKING_DISPLAY_UPDATES,
    BETA_MESSAGE_THREADS,
    BETA_MID_CONVERSATION_SYSTEM_CLEAR_AT,
    BETA_THINKING_BINDING_CONTROLS,
  ].filter((e) => e !== null),
);
var KNOWN_BETAS = new Set(
  [
    BETA_OAUTH_AUTH,
    BETA_ADVISOR_TOOL,
    BETA_AFK_MODE,
    BETA_CACHE_KEEPALIVE,
    BETA_LONG_CONTEXT,
    BETA_CONTEXT_HINT,
    BETA_AUTO_MODE_CLASSIFIER,
    BETA_DANGEROUS_TOOL_USE,
    BETA_FALLBACK_CREDIT,
    BETA_INLINE_TOOLS,
    BETA_MESSAGE_THREADS,
    BETA_MID_CONVERSATION_SYSTEM_CLEAR_AT,
    BETA_MID_CONV_TOOL_CHANGE,
    BETA_PER_MESSAGE_EFFORT,
    BETA_PER_TURN_TIMING,
    RETIRED_BETA_PLACEHOLDER,
    BETA_SERVER_SIDE_FALLBACK,
    BETA_SERVER_SIDE_FALLBACK_CATEGORY,
    BETA_STRUCTURED_OUTPUTS,
    BETA_THINKING_BINDING_CONTROLS,
    BETA_THINKING_RESUMPTION,
    BETA_TOOL_SEARCH_ADVANCED,
    BETA_TOOL_SEARCH,
  ].filter((e) => e !== null),
);
var THIRD_PARTY_SUPPORTED_BETAS = new Map(lls.filter((e) => e.header !== null).map((e) => [e.header, e]));
//@ chunk-bwbq4xvm.js:155473-155506 placement
function getBetaByName(e) {
  return THIRD_PARTY_SUPPORTED_BETAS.get(e);
}
//@ chunk-bwbq4xvm.js:155506-155573 placement
/**
 * 按名字查 Beta 定义；未知名字当作头值等于名字的 Beta。
 */
function betaFromName(e) {
  return (
    THIRD_PARTY_SUPPORTED_BETAS.get(e) ??
    Object.freeze({
      name: e,
      header: e,
    })
  );
}
//@ chunk-bwbq4xvm.js:155573-155645 placement
function betaHeaderValues(e) {
  return e.filter((s) => s.header !== null).map((s) => s.header);
}
//@ chunk-bwbq4xvm.js:155645-155704 placement
/**
 * 把 Beta 列表转成请求参数 {betas:[…]}，空列表返回 {}。
 */
function betasRequestParam(e) {
  let s = betaHeaderValues(e);
  return s.length > 0
    ? {
        betas: s,
      }
    : {};
}
//@ chunk-bwbq4xvm.js:155704-155764 placement
function isAfkModeBeta(e) {
  return e.toLowerCase().includes("afk-mode");
}
//@ chunk-bwbq4xvm.js:155764-155825 placement
/**
 * 第三方后端也支持的 beta 集合。
 */
var THINKING_CONTEXT_BETAS = new Set([BETA_INTERLEAVED_THINKING, BETA_LONG_CONTEXT, BETA_TOOL_SEARCH]);
var FIRST_PARTY_ONLY_BETAS = new Set([
  BETA_CLAUDE_CODE,
  BETA_INTERLEAVED_THINKING,
  BETA_CONTEXT_MANAGEMENT,
  BETA_OAUTH_AUTH,
]);
//@ chunk-bwbq4xvm.js:155825-155897 fingerprint = shouldIncludeFirstPartyOnlyBetas (0.838)
/**
 * 是否发第一方专属 beta：firstParty、anthropicAws/GoogleCloud、foundry。
 */
function shouldIncludeFirstPartyOnlyBetas() {
  let apiProvider = getAPIProvider();
  return apiProvider === "firstParty" || isClaudePlatformProvider(apiProvider) || apiProvider === "foundry";
}
//@ chunk-bwbq4xvm.js:155897-155965 fingerprint = shouldUseGlobalCacheScope (0.633)
/**
 * CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS 或 HIPAA 组织。旧版名 shouldUseGlobalCacheScope 为错配。
 */
function areExperimentalBetasDisabled() {
  return env.CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS || isHipaaOrg();
}
//@ chunk-bwbq4xvm.js:155965-155998 placement
/**
 * 组织为 HIPAA（实验 beta、自定义 beta 被禁用）。
 */
function isHipaaOrg() {
  return hasComplianceTaint("hipaa");
}
//@ chunk-bwbq4xvm.js:155998-156035 placement
/**
 * HIPAA 组织时返回 undefined，否则原值。
 */
function unlessHipaa(e) {
  return isHipaaOrg() ? undefined : e;
}
//@ chunk-bwbq4xvm.js:156035-156069 placement
/**
 * 第一方专属 beta 可发且实验 beta 未禁用。
 */
function canSendFirstPartyBetas() {
  return shouldIncludeFirstPartyOnlyBetas() && !areExperimentalBetasDisabled();
}
export {
  shouldUseMidConvSystem,
  shouldKeepMidConvSystemReminderTags,
  shouldUseGlobalCacheScope,
  modelGetsToolLoadedText,
  modelSupportsAutoMode,
  getModelBetas,
  betasRequestParam,
  BETA_MCP_SERVERS,
  areExperimentalBetasDisabled,
  isBetaHeaderAllowed,
  BETA_CCR_BYOC,
  clearBetasCaches,
  getToolSearchBeta,
  usesPerTurnEffortBeta,
  modelSupportsStructuredOutputs,
  BETA_STRUCTURED_OUTPUTS,
  isSkillModelOverrideAllowedInMode,
  betaHeaderValues,
  getBetaByName,
  FIRST_PARTY_ONLY_BETAS,
  THINKING_CONTEXT_BETAS,
  hasContextBeta,
  modelSupportsISP,
  shouldIncludeFirstPartyOnlyBetas,
  modelHidesThinkingByDefault,
  canSendFirstPartyBetas,
  BETA_MID_CONVERSATION_SYSTEM,
  BETA_MID_CONV_TOOL_CHANGE,
  BETA_MID_CONVERSATION_SYSTEM_CLEAR_AT,
  isHipaaOrg,
  isAfkModeBeta,
  BETA_EFFORT,
  BETA_TASK_BUDGETS,
  hitsAnthropicBackend,
  BETA_LONG_CONTEXT,
  modelTakesToolAdditions,
  BETA_INLINE_TOOLS,
  BETA_PER_MESSAGE_EFFORT,
  supportsPerTurnEffort,
  BETA_PER_TURN_TIMING,
  supportsPerTurnTiming,
  getMergedBetas,
  BETA_ADVISOR_TOOL,
  BETA_THINKING_TOKEN_COUNT,
  BETA_PROMPT_CACHING_SCOPE,
  willSendStructuredOutputsBeta,
  BETA_SERVER_SIDE_FALLBACK_CATEGORY,
  shouldAllowAfkModeBeta,
  BETA_AFK_MODE,
  BETA_SPEED,
  BETA_CACHE_DIAGNOSIS,
  BETA_THINKING_BINDING_CONTROLS,
  thirdPartyAcceptsThinkingBindingBeta,
  BETA_PROMPT_CACHING_EVICT,
  BETA_CACHE_KEEPALIVE,
  BETA_DANGEROUS_TOOL_USE,
  BETA_THINKING_DISPLAY_UPDATES,
  THINKING_DISPLAY_NAMED_BETA,
  BETA_MESSAGE_THREADS,
  KNOWN_BETAS,
  isAutoMode3POptIn,
  getBedrockExtraBodyParamsBetas,
  BETA_FALLBACK_CREDIT,
  thirdPartyAcceptsDangerousToolUseBeta,
  BETA_REDACT_THINKING,
  BETA_THINKING_RESUMPTION,
  BETA_EXTENDED_CACHE_TTL,
  filterBetasForProvider,
  BETA_OAUTH_AUTH,
  BETA_SERVER_SIDE_FALLBACK,
  BETA_MID_CONV_CACHE_PROMOTION_LATCH,
  BETA_CONTEXT_MANAGEMENT,
  BETA_MID_CONV_CACHE_PROMOTION_OK_LATCH,
  rejectContextBetaForModel,
  filterAllowedSdkBetas,
  THINKING_DISPLAY_BETA,
  BETA_AUTO_MODE_CLASSIFIER,
  defaultMaxOutputTokens,
  getAutoModeModelSupport,
  BETA_TOOL_SEARCH_ADVANCED,
  BETA_TOOL_SEARCH,
  lls,
  MID_CONVERSATION_SYSTEM_2026_04_07,
  getProviderWireIdVariants,
  getToolSearchBetaHeader,
  unlessHipaa,
  isContextBetaRefused,
  BETA_ENVIRONMENTS,
  modelSupportsTemperature,
  getAllModelBetas,
  BETA_CONTEXT_HINT,
  vertexModelSupportsWebSearch,
  BETA_FILES_API,
  isOlderModelThan,
};
