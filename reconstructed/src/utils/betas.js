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
import { _E, Kpr, isInlineToolsEnabled } from "../services/analytics/growthbookGates.js";
import { antEnv, env } from "./env.js";
import { Lp } from "../bootstrap/stateSlices.js";
import {
  getStickyBetas,
  isContext1mMarkedRefused,
  markContext1mRefused,
  isToolChangeUnsupportedModel,
  getIsNonInteractiveSession,
  getRefusedBetaHeaders,
  getSdkBetas,
} from "../bootstrap/state.js";
import { Bn, CLAUDE_MYTHOS_PREVIEW } from "./model/modelIds.js";
import { logForDebugging } from "./debug.js";
import { userConfiguredDefault } from "./model/thirdPartyModelDefaults.js";
import { getCanonicalName } from "./model/canonicalModelName.js";
import { Fc, isCatalogSuppressed, withCatalogSuppressed } from "./model/modelCatalog/servedCatalog.js";
import { getClientDataDefaultOutputTokens, getModelMaxOutputTokens } from "./context.js";
import { shouldEnableThinkingByDefault, nRn } from "./thinking.js";
import { isClaudeAISubscriber, hasAnthropicApiKey, shouldUseWIFAuth } from "./auth.js";
import { getCapabilityOverrideCached } from "./model/modelSupportOverrides.js";
import { getProviderState, createModelBetaCaches } from "./model/providerCaches.js";
import { strip1mTag, isAntInternalFastModelId } from "./model/model.js";
import { hasComplianceTaint } from "../services/policyLimits/complianceTaints.js";
import { isAutoClassifierActive } from "./permissions/autoModeState.js";
import { parseUserSpecifiedModel } from "./model/modelDisplay.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { has1mSuffix, modelHasNative1MContext } from "./model/contextWindow1m.js";
import { k } from "../components/permissions/AskUserQuestionPermissionRequest/QuestionNavigationBar.js";
import { OAUTH_BETA_HEADER } from "../constants/oauth.js";

/**
 * Bedrock 返回模型 id 的跨区域推理配置变体列表，其他提供商返回 [id]。旧版名 getModelBetas 为错配。
 */
//@ chunk-aepeg2w5.js:219037-219085 fingerprint = getModelBetas (1)
function getProviderWireIdVariants(e, n) {
  return n === "bedrock" ? expandBedrockModelIdVariants(e) : [e];
}
/**
 * 是否可发送每回合 effort beta。
 */
//@ chunk-aepeg2w5.js:341166-341312 placement
function supportsPerTurnEffort(e, n) {
  if (!canSendFirstPartyBetas() || !hasFirstPartyCapabilities(getProviderForModel(e))) return !1;
  if (modelSupportsCapability(n, "per_turn_effort", e) === !1) return !1;
  return modelDefinitelySupports(n, "per_turn_effort", e) === !0 || _E?.(n, e) === !0;
}
/**
 * 是否可发送每回合计时 beta。
 */
//@ chunk-aepeg2w5.js:341312-341453 placement
function supportsPerTurnTiming(e, n) {
  if (
    !antEnv.CLAUDE_CODE_PER_TURN_TIMING ||
    !canSendFirstPartyBetas() ||
    !hasFirstPartyCapabilities(getProviderForModel(e))
  )
    return !1;
  let r = catalogHasCapability(n, "per_turn_timing");
  return r === void 0 ? supportsPerTurnEffort(e, n) : r;
}
/**
 * 是否带 1M 上下文 beta。
 */
//@ chunk-aepeg2w5.js:341453-341495 placement
function hasContextBeta(e) {
  return Lp(e, CG) || Lp(e, LO);
}
//@ chunk-aepeg2w5.js:341495-341541 placement
function Vpr(e, n) {
  return supportsPerTurnEffort(e, n) && !hasContextBeta(getStickyBetas());
}
//@ chunk-aepeg2w5.js:341541-341574 placement
function vo(e) {
  return isContext1mMarkedRefused(Bn(e));
}
/**
 * 后端拒绝 beta 后为该模型去掉它并记录。
 */
//@ chunk-aepeg2w5.js:341574-341893 placement
function rejectContextBetaForModel(e) {
  if (vo(e)) return;
  (markContext1mRefused(Bn(e)),
    logForDebugging(
      `[betas] the backend rejected the ${yv.header} beta for ${e} (HTTP 400) and answered once it was removed. It is left out for this model, whose context window is sized without 1M, and is tried again after /clear, a compaction, a resume or a provider change.`,
      { level: "warn" },
    ));
}
/**
 * 第三方云（bedrock/vertex/mantle）上该模型是否需要工具搜索 beta 头。
 */
//@ chunk-aepeg2w5.js:444296-444410 fingerprint = getToolSearchBetaHeader (0.788)
function getToolSearchBetaHeader(e) {
  if (e === null) return !1;
  let provider = getAPIProvider();
  if (provider !== "bedrock" && provider !== "vertex" && provider !== "mantle") return !1;
  return userConfiguredDefault(e);
}
/**
 * 模型默认输出 token 上限。
 */
//@ chunk-aepeg2w5.js:475090-475193 placement
function defaultMaxOutputTokens(e) {
  let n = getCanonicalName(e);
  return (
    Fc(e, n) ??
    getClientDataDefaultOutputTokens(e, n) ??
    getCatalogEntry(n)?.max_output_tokens?.default ??
    getModelMaxOutputTokens(e).default
  );
}
/**
 * 3.x 及 opus-4-0/4-1/4-5/4-6、sonnet-4-0/4-5/4-6、haiku-4-5 这批老模型（第三方云上不接受新 beta）。旧版名错配。
 */
//@ chunk-aepeg2w5.js:475236-475473 fingerprint = modelSupportsStructuredOutputs (0.717)
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
/**
 * 模型发布先后表（opus-4-0 … opus-4-8），isOlderModelThan 用它比较。
 */
//@ chunk-aepeg2w5.js:476485-476681 affinity
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
/**
 * 模型是否早于参照模型（3.x 一律算更早）。旧版名 modelSupportsAutoMode 为错配。
 */
//@ chunk-aepeg2w5.js:476681-476786 fingerprint = modelSupportsAutoMode (0.377)
function isOlderModelThan(e, n) {
  if (e.includes("claude-3-")) return !0;
  let index = MODEL_RELEASE_ORDER.indexOf(e);
  return index !== -1 && index < MODEL_RELEASE_ORDER.indexOf(n);
}
/**
 * beta 头是否允许。
 */
//@ chunk-aepeg2w5.js:480243-480291 placement
function isBetaHeaderAllowed() {
  if (shouldEnableThinkingByDefault() !== null) return !1;
  return !0;
}
/**
 * SDK 自定义 betas 白名单：只有 context-1m。
 */
//@ chunk-aepeg2w5.js:480291-480312 layout
var SDK_ALLOWED_BETAS = new Set([yv]);
/**
 * 把 SDK 传入的 beta 分成白名单内/外两组。
 */
//@ chunk-aepeg2w5.js:480312-480442 fingerprint = partitionBetasByAllowlist (1)
function partitionBetasByAllowlist(betas) {
  let n = [],
    r = [];
  for (let beta of betas) {
    let h = getBetaByName(beta);
    if (h && SDK_ALLOWED_BETAS.has(h)) n.push(beta);
    else r.push(beta);
  }
  return { allowed: n, disallowed: r };
}
/**
 * 过滤 SDK 自定义 betas：订阅用户直接忽略并警告；不在白名单的逐个警告。
 */
//@ chunk-aepeg2w5.js:480442-480804 facade-exports = filterAllowedSdkBetas (1)
function filterAllowedSdkBetas(sdkBetas) {
  if (!sdkBetas || sdkBetas.length === 0) return;
  if (isClaudeAISubscriber()) {
    console.warn("Warning: Custom betas are only available for API key users. Ignoring provided betas.");
    return;
  }
  let { allowed: allowed, disallowed: disallowed } = partitionBetasByAllowlist(sdkBetas);
  for (let beta of disallowed)
    console.warn(
      `Warning: Beta header '${beta}' is not allowed. Only the following betas are supported: ${betaHeaderValues([...SDK_ALLOWED_BETAS]).join(", ")}`,
    );
  return allowed.length > 0 ? allowed : void 0;
}
/**
 * 模型是否支持交错思考（interleaved-thinking beta）：能力覆盖优先；foundry 一律支持；第一方系提供商除 3.x 外都支持；haiku-4-5 与 3.x 不支持。
 */
//@ chunk-aepeg2w5.js:480804-481034 facade-exports = modelSupportsISP (0.609)
function modelSupportsISP(model) {
  let supported3P = getCapabilityOverrideCached(model, "interleaved_thinking");
  if (supported3P !== void 0) return supported3P;
  let canonical = getCanonicalName(model),
    s = getProviderForModel(model);
  if (s === "foundry") return !0;
  if (hasFirstPartyCapabilities(s)) return !canonical.includes("claude-3-");
  if (canonical === "claude-haiku-4-5" || canonical.includes("claude-3-")) return !1;
  return !0;
}
/**
 * Vertex 上该模型是否支持 web search beta（不早于 opus-4-0）。
 */
//@ chunk-aepeg2w5.js:481034-481082 facade-exports
function vertexModelSupportsWebSearch(e) {
  return !isOlderModelThan(e, "claude-opus-4-0");
}
/**
 * 模型是否支持 context-management（API 侧 clear_thinking 等编辑）。
 */
//@ chunk-aepeg2w5.js:481082-481269 fingerprint = modelSupportsContextManagement (0.427)
function modelSupportsContextManagement(model) {
  let canonical = getCanonicalName(model),
    r = modelSupportsCapability(canonical, "context_management", model);
  if (r === !1) return !1;
  let s = getProviderForModel(model);
  if (s === "foundry") return !0;
  if (hasFirstPartyCapabilities(s)) return !canonical.includes("claude-3-");
  return r || canonical === "claude-mythos-5";
}
/**
 * 模型是否支持 structured outputs：仅第一方系提供商、未禁用实验 beta 与 CLAUDE_CODE_DISABLE_STRUCTURED_OUTPUTS、不早于 opus-4-1。
 */
//@ chunk-aepeg2w5.js:481269-481426 facade-exports
function modelSupportsStructuredOutputs(e) {
  let n = getCanonicalName(e),
    r = getProviderForModel(e);
  if (!hasFirstPartyCapabilities(r)) return !1;
  if (areExperimentalBetasDisabled()) return !1;
  if (env.CLAUDE_CODE_DISABLE_STRUCTURED_OUTPUTS) return !1;
  return !isOlderModelThan(n, "claude-opus-4-1");
}
/**
 * 当前会话的 beta 结果缓存（服务目录被抑制时用 compiledOnly 版）。
 */
//@ chunk-aepeg2w5.js:481426-481491 layout
function getBetaCacheStore() {
  let e = getProviderState();
  return isCatalogSuppressed() ? e.betasCompiledOnly : e.betas;
}
/**
 * 按模型缓存 beta 计算结果，并同步写一份不看服务目录的版本。
 */
//@ chunk-aepeg2w5.js:481491-481658 layout
function memoizeBetaResult(e, n, r) {
  let s = e(getBetaCacheStore()),
    h = s.get(n);
  if (h !== void 0) return h;
  let y = r();
  if ((s.set(n, y), !isCatalogSuppressed())) {
    let S = e(getProviderState().betasCompiledOnly);
    if (!S.has(n)) S.set(n, withCatalogSuppressed(r));
  }
  return y;
}
/**
 * 模型是否接受中途 role=system 消息（mid_conversation_system，缓存）。
 */
//@ chunk-aepeg2w5.js:481658-481726 facade-exports
function shouldUseMidConvSystem(e) {
  return memoizeBetaResult(
    (n) => n.midConversationSystem,
    e,
    () => computeMidConvSystemSupport(e),
  );
}
/**
 * 工具加载提示文本：目录能力优先，否则按模型名判断。
 */
//@ chunk-aepeg2w5.js:481726-481805 facade-exports
function modelGetsToolLoadedText(e) {
  let n = getCanonicalName(e);
  return modelSupportsCapability(n, "tool_loaded_text", e) ?? n.includes(CLAUDE_MYTHOS_PREVIEW);
}
/**
 * 模型是否接受中途工具增减（mid-conversation-tool-changes）：需第一方 beta、接受中途 system；可用 CLAUDE_CODE_FORCE_MID_CONVERSATION_SYSTEM 强制。
 */
//@ chunk-aepeg2w5.js:481805-482044 facade-exports
function modelTakesToolAdditions(e) {
  if (!canSendFirstPartyBetas() || !shouldUseMidConvSystem(e)) return !1;
  if (env.CLAUDE_CODE_FORCE_MID_CONVERSATION_SYSTEM) return !0;
  let n = getCanonicalName(e);
  if (isToolChangeUnsupportedModel(n)) return !1;
  let r = modelSupportsCapability(n, "mid_conv_tool_change", e);
  if (r !== void 0) return r;
  return n === "claude-mythos-5" || getCatalogEntry(strip1mTag(n)) === void 0;
}
/**
 * 中途 system 消息支持判定：HIPAA 关闭；强制开关；能力覆盖；早于 opus-4-8 的不支持；否则看目录（默认支持）。
 */
//@ chunk-aepeg2w5.js:482044-482291 layout
function computeMidConvSystemSupport(e) {
  if (hasComplianceTaint("hipaa")) return !1;
  if (env.CLAUDE_CODE_FORCE_MID_CONVERSATION_SYSTEM) return !0;
  let n = getCapabilityOverrideCached(e, "mid_conversation_system");
  if (n !== void 0) return n;
  let r = getCanonicalName(e);
  if (isOlderModelThan(strip1mTag(r), "claude-opus-4-8")) return !1;
  return modelSupportsCapability(r, "mid_conv_system", e) ?? !0;
}
/**
 * sonnet-5 保留中途 system-reminder 标签。
 */
//@ chunk-aepeg2w5.js:482291-482340 facade-exports
function shouldKeepMidConvSystemReminderTags(e) {
  return getCanonicalName(e) === "claude-sonnet-5";
}
/**
 * 模型是否接受 temperature 参数（早于 opus-4-7 的才接受）。
 */
//@ chunk-aepeg2w5.js:482340-482442 facade-exports
function modelSupportsTemperature(e) {
  let n = getCapabilityOverrideCached(e, "temperature");
  if (n !== void 0) return n;
  return isOlderModelThan(getCanonicalName(e), "claude-opus-4-7");
}
/**
 * 模型默认隐藏思考（不早于 opus-4-7）。
 */
//@ chunk-aepeg2w5.js:482442-482494 facade-exports
function modelHidesThinkingByDefault(e) {
  return !isOlderModelThan(getCanonicalName(e), "claude-opus-4-7");
}
/**
 * 第三方云是否接受 thinking-binding-controls beta（vertex 接受；bedrock/mantle 上老模型不接受）。
 */
//@ chunk-aepeg2w5.js:482494-482594 facade-exports = getToolSearchBetaHeader (0.788)
function thirdPartyAcceptsThinkingBindingBeta(e, n) {
  if (e === "vertex") return !0;
  if (e !== "bedrock" && e !== "mantle") return !1;
  return !isLegacyStructuredOutputModel(getCanonicalName(n));
}
/**
 * 第三方云是否接受 dangerous-tool-use beta。
 */
//@ chunk-aepeg2w5.js:482594-482669 facade-exports
function thirdPartyAcceptsDangerousToolUseBeta(e, n) {
  if (e !== "bedrock" && e !== "mantle") return !0;
  return !isLegacyStructuredOutputModel(getCanonicalName(n));
}
/**
 * 非第一方、非 anthropicAws/GoogleCloud 的提供商（auto mode 第三方选项）。
 */
//@ chunk-aepeg2w5.js:482669-482727 facade-exports = logEventTo1P (1)
function isAutoMode3POptIn() {
  let e = getAPIProvider();
  return e !== "firstParty" && !isClaudePlatformProvider(e);
}
/**
 * 是否允许发 afk-mode beta：第一方 beta 可用或第三方 auto mode。
 */
//@ chunk-aepeg2w5.js:482727-482761 facade-exports
function shouldAllowAfkModeBeta() {
  return canSendFirstPartyBetas() || isAutoMode3POptIn();
}
/**
 * 模型是否排在 claude-opus-4-6 之前（modelSupportsAutoMode 的排序比较）；被快速模式支持判断使用。归属与旧版名均疑似错误。
 */
//@ chunk-aepeg2w5.js:482761-482808 placement = MITIGATION_EXEMPT_MODELS (1)
function isModelOlderThanOpus46(e) {
  return isOlderModelThan(e, "claude-opus-4-6");
}
/**
 * 模型是否支持 auto mode（第三方上 opus-4-6、sonnet-4-6、haiku（除 5-5）不支持）。
 */
//@ chunk-aepeg2w5.js:482808-482975 facade-exports
function modelSupportsAutoMode(e) {
  let n = getCanonicalName(e);
  if (isModelOlderThanOpus46(n)) return !1;
  if (
    isAutoMode3POptIn() &&
    (n === "claude-opus-4-6" ||
      n === "claude-sonnet-4-6" ||
      (n.includes("haiku") && n !== "claude-haiku-5-5"))
  )
    return !1;
  return !0;
}
/**
 * auto mode 支持情况：{supported, disableFastModeBreakerFires}。
 */
//@ chunk-aepeg2w5.js:482975-483107 facade-exports
function getAutoModeModelSupport({ model: model, fastMode: fastMode, disableFastMode: disableFastMode }) {
  let s = disableFastMode && (fastMode || isAntInternalFastModelId(model));
  return { supported: modelSupportsAutoMode(model) && !s, disableFastModeBreakerFires: s };
}
/**
 * 当前权限模式下技能/命令指定的模型是否允许（auto mode 不支持时记日志拒绝）。
 */
//@ chunk-aepeg2w5.js:483107-483575 facade-exports
function isSkillModelOverrideAllowedInMode({ skillModel: skillModel, mode: mode, fastMode: fastMode }) {
  if (!isAutoClassifierActive(mode)) return !0;
  let { supported: supported, disableFastModeBreakerFires: disableFastModeBreakerFires } =
    getAutoModeModelSupport({
      model: parseUserSpecifiedModel(skillModel),
      fastMode: fastMode,
      disableFastMode: !!getFeatureValue_CACHED_MAY_BE_STALE("tengu_auto_mode_config", {})?.disableFastMode,
    });
  if (supported) return !0;
  return (
    logForDebugging(
      disableFastModeBreakerFires
        ? `Skill/command model "${skillModel}" skipped: fast mode is disabled for auto mode by config (disableFastMode); keeping the session model`
        : `Skill/command model "${skillModel}" is not supported in auto mode; keeping the session model`,
      { level: "warn" },
    ),
    !1
  );
}
/**
 * 工具搜索 beta：第一方 advanced-tool-use-2025-11-20，第三方 tool-search-tool-2025-10-19。
 */
//@ chunk-aepeg2w5.js:483575-483610 facade-exports
function getToolSearchBeta() {
  return canSendFirstPartyBetas() ? a9t : Vlt;
}
/**
 * 请求是否打到 Anthropic 自己的后端：anthropicAws 未自定义 base URL，或第一方且为官方 API。
 */
//@ chunk-aepeg2w5.js:483610-483724 facade-exports
function hitsAnthropicBackend(e = getAPIProvider()) {
  if (e === "anthropicAws") return env.ANTHROPIC_AWS_BASE_URL === void 0;
  return e === "firstParty" && isFirstPartyAnthropicBaseUrl();
}
/**
 * 是否用 cache_control scope:"global"（prompt-caching-scope beta）：第一方 beta 可用、官方 API、提供商为 firstParty/anthropicAws。实测第一方形状多出此 beta 与 system 静态块的 scope:global。
 */
//@ chunk-aepeg2w5.js:483724-483829 facade-exports
function shouldUseGlobalCacheScope() {
  if (!canSendFirstPartyBetas()) return !1;
  if (!isFirstPartyAnthropicBaseUrl()) return !1;
  let e = getAPIProvider();
  return e === "firstParty" || e === "anthropicAws";
}
/**
 * 每轮附加 beta 条件表（getMergedBetas 用）：per-turn-control、timing、mid-conversation-tool-changes、inline-tools。
 */
//@ chunk-aepeg2w5.js:483829-484719 fingerprint = getAllModelBetas (0.528)
var MODEL_BETA_RULES = [
    { beta: BETA_CLAUDE_CODE, when: (e) => !e.canonical.includes("haiku") },
    {
      beta: UEe,
      when: () =>
        isClaudeAISubscriber() ||
        (shouldIncludeFirstPartyOnlyBetas() && !hasAnthropicApiKey() && shouldUseWIFAuth()),
    },
    {
      beta: yv,
      when: (e) => has1mSuffix(e.model) && !modelHasNative1MContext(e.model, { byItsOwnName: !0 }),
    },
    { beta: kxn, when: (e) => !env.DISABLE_INTERLEAVED_THINKING && e.interleavedThinking },
    {
      beta: Txn,
      when: (e) => e.firstPartyOnlyBetas && e.interleavedThinking && !getIsNonInteractiveSession() && !nRn(),
    },
    {
      beta: sle,
      when: (e) => {
        let n = env.USE_API_CONTEXT_MANAGEMENT && !1,
          r = modelSupportsContextManagement(e.model);
        return e.firstPartyCapabilityBetas && (n || r);
      },
    },
    {
      beta: n8,
      when: (e) => {
        let n = getFeatureValue_CACHED_MAY_BE_STALE("tengu_tool_pear", !1);
        return e.firstPartyCapabilityBetas && modelSupportsStructuredOutputs(e.model) && n;
      },
    },
    {
      beta: doo,
      when: (e) =>
        (e.provider === "vertex" && vertexModelSupportsWebSearch(e.canonical)) || e.provider === "foundry",
    },
    { beta: cOe, when: () => shouldUseGlobalCacheScope() },
    { beta: LO, when: (e) => shouldUseMidConvSystem(e.model) },
  ],
  PER_TURN_BETA_RULES = [
    { beta: CG, when: (e) => e.perTurnTiming || supportsPerTurnEffort(e.model, e.canonical) },
    { beta: Z4, when: (e) => e.perTurnTiming },
    { beta: Lb, when: (e) => Kpr() && modelTakesToolAdditions(e.model) },
    { beta: tb, when: (e) => Kpr() && modelTakesToolAdditions(e.model) && isInlineToolsEnabled() },
    ...[],
  ];
/**
 * 模型的基础 beta 列表（缓存）。门面名为准时以门面为准。
 */
//@ chunk-aepeg2w5.js:484719-484779 facade-exports
function getAllModelBetas(e) {
  return memoizeBetaResult(
    (n) => n.allModelBetas,
    e,
    () => computeAllModelBetas(e),
  );
}
/**
 * 按 MODEL_BETA_RULES 计算基础 beta，再追加 ANTHROPIC_BETAS（组织禁用实验 beta 时忽略；已 GA 的 mid-conversation-system 不发）。
 */
//@ chunk-aepeg2w5.js:484779-485341 layout
function computeAllModelBetas(e) {
  let n = {
      model: e,
      canonical: getCanonicalName(e),
      provider: getAPIProvider(),
      firstPartyOnlyBetas: canSendFirstPartyBetas(),
      firstPartyCapabilityBetas:
        hasFirstPartyCapabilities(getProviderForModel(e)) && !areExperimentalBetasDisabled(),
      interleavedThinking: modelSupportsISP(e),
    },
    r = [];
  for (let h of MODEL_BETA_RULES) if (h.when(n)) r.push(h.beta);
  let ANTHROPIC_BETAS = env.ANTHROPIC_BETAS;
  if (ANTHROPIC_BETAS)
    if (isHipaaOrg())
      logForDebugging(
        "ANTHROPIC_BETAS ignored: experimental betas are disabled by your organization's policy",
        { level: "debug" },
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
/**
 * 模型的 beta 列表：Bedrock 去掉放进请求体的那几个；去掉本会话被服务器拒绝过的；1M 原生模型去掉 context-1m。
 */
//@ chunk-aepeg2w5.js:485341-485529 facade-exports
function getModelBetas(e) {
  let n = memoizeBetaResult(
      (s) => s.modelBetas,
      e,
      () => {
        let s = getAllModelBetas(e);
        if (getProviderForModel(e) === "bedrock") return s.filter((h) => !THINKING_CONTEXT_BETAS.has(h));
        return s;
      },
    ),
    r = getRefusedBetaHeaders();
  return dropRedundantContext1m(e, r.size === 0 ? n : n.filter((s) => !r.has(s)));
}
/**
 * Bedrock 需要放进请求体 anthropic_beta 的 beta（interleaved-thinking、context-1m、tool-search-tool）。
 */
//@ chunk-aepeg2w5.js:485529-485634 facade-exports
function getBedrockExtraBodyParamsBetas(e) {
  return dropRedundantContext1m(
    e,
    memoizeBetaResult(
      (n) => n.bedrockExtraBodyParamsBetas,
      e,
      () => getAllModelBetas(e).filter((n) => THINKING_CONTEXT_BETAS.has(n)),
    ),
  );
}
/**
 * 模型本身就是 1M 上下文时去掉 context-1m beta。
 */
//@ chunk-aepeg2w5.js:485634-485704 layout
function dropRedundantContext1m(e, n) {
  return n.includes(yv) && vo(e) ? n.filter((r) => r !== yv) : n;
}
/**
 * 本次请求的 beta 列表（queryModel 起点）：getModelBetas + 代理式查询补 claude-code + PER_TURN_BETA_RULES + SDK betas（组织禁用时丢弃，第三方只留白名单）。
 */
//@ chunk-aepeg2w5.js:485704-486273 facade-exports
function getMergedBetas(model, options) {
  let baseBetas = [...getModelBetas(model)];
  if (options?.isAgenticQuery && !baseBetas.includes(BETA_CLAUDE_CODE)) baseBetas.push(BETA_CLAUDE_CODE);
  let s = getCanonicalName(model),
    h = { model: model, canonical: s, perTurnTiming: supportsPerTurnTiming(model, s) };
  for (let R of PER_TURN_BETA_RULES) if (R.when(h) && !baseBetas.includes(R.beta)) baseBetas.push(R.beta);
  let sdkBetas = getSdkBetas();
  if (!sdkBetas || sdkBetas.length === 0) return baseBetas;
  let S = unlessHipaa(sdkBetas);
  if (!S)
    return (
      logForDebugging("SDK betas dropped: experimental betas are disabled by your organization's policy", {
        level: "debug",
      }),
      baseBetas
    );
  let mapped = S.map(betaFromName);
  if (!canSendFirstPartyBetas())
    mapped = mapped.filter((R) => {
      if (THIRD_PARTY_SAFE_BETAS.has(R)) return !0;
      return (logForDebugging(`SDK beta '${R.header}' dropped on 3P`, { level: "debug" }), !1);
    });
  return dropRedundantContext1m(model, [...baseBetas, ...mapped.filter((R) => !baseBetas.includes(R))]);
}
/**
 * 是否会发 structured-outputs beta。
 */
//@ chunk-aepeg2w5.js:486273-486316 facade-exports
function willSendStructuredOutputsBeta(e) {
  return getAllModelBetas(e).includes(n8);
}
/**
 * 清空 beta 缓存。
 */
//@ chunk-aepeg2w5.js:486316-486381 facade-exports
function clearBetasCaches() {
  let e = getProviderState();
  ((e.betas = createModelBetaCaches()), (e.betasCompiledOnly = createModelBetaCaches()));
}
/**
 * 第三方提供商也会发送的 beta 集合；其余 beta 只发给第一方系提供商。
 */
//@ chunk-aepeg2w5.js:486381-486451 layout
var THIRD_PARTY_SAFE_BETAS = new Set([
  BETA_CLAUDE_CODE,
  kxn,
  yv,
  sle,
  n8,
  doo,
  Cge,
  Vlt,
  tj,
  qT,
  RG,
  LO,
  AU,
  xG,
  Rge,
]);
/**
 * 非第一方系提供商时只保留 THIRD_PARTY_SAFE_BETAS 里的 beta。
 */
//@ chunk-aepeg2w5.js:486451-486517 facade-exports
function filterBetasForProvider(e) {
  if (shouldIncludeFirstPartyOnlyBetas()) return e;
  return e.filter((n) => THIRD_PARTY_SAFE_BETAS.has(n));
}
//@ chunk-bwbq4xvm.js:152582-152640 placement
function defineLocalBeta(e) {
  return Object.freeze({ name: e, header: null });
}
/**
 * Beta 注册表：k(名, 头值) 定义每个 anthropic-beta 头（claude_code、oauth_auth、interleaved_thinking、context_1m、context_management、structured_outputs、web_search、tool_search …），并汇总成按名查找的 ed 表。
 */
//@ chunk-bwbq4xvm.js:152640-155473 placement
var BETA_CLAUDE_CODE = k("claude_code", "claude-code-20250219"),
  UEe = k("oauth_auth", OAUTH_BETA_HEADER),
  kxn = k("interleaved_thinking", "interleaved-thinking-2025-05-14"),
  yv = k("long_context", "context-1m-2025-08-07"),
  sle = k("context_management", "context-management-2025-06-27"),
  n8 = k("structured_outputs", "structured-outputs-2025-12-15"),
  doo = k("web_search", "web-search-2025-03-05"),
  a9t = k("tool_search", "advanced-tool-use-2025-11-20"),
  Vlt = k("tool_search", "tool-search-tool-2025-10-19"),
  Cge = k("effort", "effort-2025-11-24"),
  Wgr = k("task_budgets", "task-budgets-2026-03-13"),
  cOe = k("prompt_caching_scope", "prompt-caching-scope-2026-01-05"),
  qlt = k("prompt_caching_evict", "prompt-caching-evict-2026-05-12"),
  DO = k("cache_keepalive", "cache-keepalive-2026-09-03"),
  l9t = k("extended_cache_ttl", "extended-cache-ttl-2025-04-11"),
  KPt = k("speed", "fast-mode-2026-02-01"),
  Txn = k("redact_thinking", "redact-thinking-2026-02-12"),
  l3e = k("thinking_resumption", "thinking-resumption-2026-07-17"),
  AU = k("thinking_token_count", "thinking-token-count-2026-05-13"),
  tj = k("afk_mode", "afk-mode-2026-01-31"),
  d3e = k("advisor_tool", "advisor-tool-2026-03-01"),
  VPt = k("cache_diagnosis", "cache-diagnosis-2026-04-07"),
  coo = k("context_hint", "context-hint-2026-04-09"),
  Axn = k("mcp_servers", "mcp-servers-2025-12-04"),
  rls = k("files_api", "files-api-2025-04-14"),
  ols = k("environments", "environments-2025-11-01"),
  Cxn = k("ccr_byoc", "ccr-byoc-2025-07-29"),
  LO = defineLocalBeta("mid_conversation_system"),
  MID_CONVERSATION_SYSTEM_2026_04_07 = "mid-conversation-system-2026-04-07",
  CG = k("per_message_effort", "per-turn-control-2026-07-01"),
  Z4 = k("per_turn_timing", "timing-2026-09-09"),
  Lb = k("mid_conv_tool_change", "mid-conversation-tool-changes-2026-07-01"),
  tb = k("inline_tools", "inline-tools-2026-09-15"),
  nj = k("server_side_fallback", "server-side-fallback-2026-06-01"),
  jw = k("server_side_fallback_category", "server-side-fallback-2026-07-01"),
  RG = k("fallback_credit", "fallback-credit-2026-06-01"),
  Ggr = k("mid_conv_cache_promotion_latch", "x-cc-internal-mid-conv-cache-promotion"),
  sls = k("mid_conv_cache_promotion_ok_latch", "x-cc-internal-mid-conv-cache-promotion-ok"),
  d9t = null,
  ils = k("auto_mode_classifier", "auto-mode-classifier-2026-07-16"),
  qT = k("dangerous_tool_use", "dangerous-tool-use-2026-09-03"),
  Zl = null,
  Rge = k("thinking_display_updates", "thinking-display-updates-2026-08-18"),
  als = defineLocalBeta("thinking_display"),
  xG = k("thinking_binding_controls", "thinking-binding-controls-2026-08-01"),
  PG = k("message_threads", "message-threads-2026-08-12"),
  MK = k("mid_conversation_system_clear_at", "mid-conversation-system-clear-at-2026-08-21"),
  freeze = Object.freeze(
    [
      BETA_CLAUDE_CODE,
      UEe,
      kxn,
      yv,
      sle,
      n8,
      doo,
      a9t,
      Vlt,
      Cge,
      Wgr,
      cOe,
      qlt,
      DO,
      l9t,
      KPt,
      Txn,
      l3e,
      AU,
      tj,
      d3e,
      VPt,
      coo,
      Axn,
      rls,
      ols,
      Cxn,
      LO,
      CG,
      Z4,
      Lb,
      tb,
      nj,
      jw,
      RG,
      d9t,
      ils,
      qT,
      Zl,
      Rge,
      PG,
      MK,
      xG,
    ].filter((e) => e !== null),
  ),
  uoo = new Set(
    [
      UEe,
      d3e,
      tj,
      DO,
      yv,
      coo,
      d9t,
      qT,
      RG,
      tb,
      PG,
      MK,
      Lb,
      CG,
      Z4,
      Zl,
      nj,
      jw,
      n8,
      xG,
      l3e,
      a9t,
      Vlt,
    ].filter((e) => e !== null),
  ),
  ed = new Map(freeze.filter((e) => e.header !== null).map((e) => [e.header, e]));
//@ chunk-bwbq4xvm.js:155473-155506 placement
function getBetaByName(e) {
  return ed.get(e);
}
/**
 * 按名字查 Beta 定义；未知名字当作头值等于名字的 Beta。
 */
//@ chunk-bwbq4xvm.js:155506-155573 placement
function betaFromName(e) {
  return ed.get(e) ?? Object.freeze({ name: e, header: e });
}
//@ chunk-bwbq4xvm.js:155573-155645 placement
function betaHeaderValues(e) {
  return e.filter((s) => s.header !== null).map((s) => s.header);
}
/**
 * 把 Beta 列表转成请求参数 {betas:[…]}，空列表返回 {}。
 */
//@ chunk-bwbq4xvm.js:155645-155704 placement
function betasRequestParam(e) {
  let s = betaHeaderValues(e);
  return s.length > 0 ? { betas: s } : {};
}
//@ chunk-bwbq4xvm.js:155704-155764 placement
function isAfkModeBeta(e) {
  return e.toLowerCase().includes("afk-mode");
}
//@ chunk-bwbq4xvm.js:155764-155825 placement
var THINKING_CONTEXT_BETAS = new Set([kxn, yv, Vlt]),
  u9t = new Set([BETA_CLAUDE_CODE, kxn, sle, UEe]);
/**
 * 是否发第一方专属 beta：firstParty、anthropicAws/GoogleCloud、foundry。
 */
//@ chunk-bwbq4xvm.js:155825-155897 fingerprint = shouldIncludeFirstPartyOnlyBetas (0.838)
function shouldIncludeFirstPartyOnlyBetas() {
  let e = getAPIProvider();
  return e === "firstParty" || isClaudePlatformProvider(e) || e === "foundry";
}
/**
 * CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS 或 HIPAA 组织。旧版名 shouldUseGlobalCacheScope 为错配。
 */
//@ chunk-bwbq4xvm.js:155897-155965 fingerprint = shouldUseGlobalCacheScope (0.633)
function areExperimentalBetasDisabled() {
  return env.CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS || isHipaaOrg();
}
/**
 * 组织为 HIPAA（实验 beta、自定义 beta 被禁用）。
 */
//@ chunk-bwbq4xvm.js:155965-155998 placement
function isHipaaOrg() {
  return hasComplianceTaint("hipaa");
}
/**
 * HIPAA 组织时返回 undefined，否则原值。
 */
//@ chunk-bwbq4xvm.js:155998-156035 placement
function unlessHipaa(e) {
  return isHipaaOrg() ? void 0 : e;
}
/**
 * 第一方专属 beta 可发且实验 beta 未禁用。
 */
//@ chunk-bwbq4xvm.js:156035-156069 placement
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
  Axn,
  areExperimentalBetasDisabled,
  isBetaHeaderAllowed,
  Cxn,
  clearBetasCaches,
  getToolSearchBeta,
  Vpr,
  modelSupportsStructuredOutputs,
  n8,
  isSkillModelOverrideAllowedInMode,
  betaHeaderValues,
  getBetaByName,
  u9t,
  THINKING_CONTEXT_BETAS,
  hasContextBeta,
  modelSupportsISP,
  shouldIncludeFirstPartyOnlyBetas,
  modelHidesThinkingByDefault,
  canSendFirstPartyBetas,
  LO,
  Lb,
  MK,
  isHipaaOrg,
  isAfkModeBeta,
  Cge,
  Wgr,
  hitsAnthropicBackend,
  yv,
  modelTakesToolAdditions,
  tb,
  CG,
  supportsPerTurnEffort,
  Z4,
  supportsPerTurnTiming,
  getMergedBetas,
  d3e,
  AU,
  cOe,
  willSendStructuredOutputsBeta,
  jw,
  shouldAllowAfkModeBeta,
  tj,
  KPt,
  VPt,
  xG,
  thirdPartyAcceptsThinkingBindingBeta,
  qlt,
  DO,
  qT,
  Rge,
  als,
  PG,
  uoo,
  isAutoMode3POptIn,
  getBedrockExtraBodyParamsBetas,
  RG,
  thirdPartyAcceptsDangerousToolUseBeta,
  Txn,
  l3e,
  l9t,
  filterBetasForProvider,
  UEe,
  nj,
  Ggr,
  sle,
  sls,
  rejectContextBetaForModel,
  filterAllowedSdkBetas,
  ils,
  d9t,
  defaultMaxOutputTokens,
  getAutoModeModelSupport,
  a9t,
  Vlt,
  freeze,
  MID_CONVERSATION_SYSTEM_2026_04_07,
  getProviderWireIdVariants,
  getToolSearchBetaHeader,
  unlessHipaa,
  vo,
  ols,
  modelSupportsTemperature,
  getAllModelBetas,
  coo,
  vertexModelSupportsWebSearch,
  rls,
  isOlderModelThan,
};
