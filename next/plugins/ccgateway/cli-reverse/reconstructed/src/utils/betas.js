/**
 * utils/betas.ts
 *
 * anthropic-beta 头的组装：按模型与提供商列出基础 beta（getAllModelBetas 的条件表）、每轮附加 beta（per-turn-control、mid-conversation-tool-changes、inline-tools）、SDK 自带 beta 过滤，以及模型能力判定（交错思考、context management、structured outputs、中途 system 消息、temperature、auto mode）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/betas.ts
 * pieces: chunk-7kayq7nc.js (15), chunk-exfmq47h.js (56)
 * attribution: placement 61, fingerprint 8, affinity 1, layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { OAUTH_BETA_HEADER } from "../constants/oauth.js";
import {
  getAPIProvider,
  isClaudePlatformProvider,
  isActualFirstPartyAnthropicBaseUrl,
  isFirstPartyAnthropicBaseUrl,
  hasFirstPartyCapabilities,
  getProviderForModel,
} from "./model/providers.js";
import { env, antEnv } from "./env.js";
import { hasComplianceTaint } from "../services/policyLimits/complianceTaints.js";
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
import { isClaudeAISubscriber, getApiKeySourceSafe, hasAnthropicApiKey, shouldUseWIFAuth } from "./auth.js";
import { getCapabilityOverrideCached } from "./model/modelSupportOverrides.js";
import { getProviderState, createModelBetaCaches } from "./model/providerCaches.js";
import { strip1mTag, isAntInternalFastModelId } from "./model/model.js";
import { isAutoClassifierActive } from "./permissions/autoModeState.js";
import { parseUserSpecifiedModel } from "./model/modelDisplay.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  getFeatureValue_SESSION_PINNED,
} from "../services/analytics/growthbook.js";
import { has1mSuffix_2, modelHasNative1MContext } from "./model/contextWindow1m.js";
import { programUseCaseIdForWire } from "./programUseCase.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-7kayq7nc.js:151348-151404 placement (2.1.88 match: _temp, 0.697)
function freezeHeaderEntry(q_0, index_0) {
  return Object.freeze({
    name: q_0,
    header: index_0,
  });
}
//@ chunk-7kayq7nc.js:151404-151462 placement
function defineLocalBeta(name) {
  return Object.freeze({
    name,
    header: null,
  });
}
//@ chunk-7kayq7nc.js:151462-154585 placement
/**
 * OAuth 认证 beta（oauth-auth 头）。
 */
var BETA_CLAUDE_CODE; // deferred: uses freezeHeaderEntry of its import cycle while loading; runs once the cycle is complete
var BETA_OAUTH_AUTH;
var BETA_INTERLEAVED_THINKING;
var BETA_LONG_CONTEXT;
var BETA_CONTEXT_MANAGEMENT;
var BETA_STRUCTURED_OUTPUTS;
var BETA_WEB_SEARCH;
var BETA_TOOL_SEARCH_ADVANCED;
var BETA_TOOL_SEARCH;
var BETA_EFFORT;
var BETA_TASK_BUDGETS;
var BETA_PROMPT_CACHING_SCOPE;
var BETA_PROMPT_CACHING_EVICT;
var BETA_CACHE_KEEPALIVE;
var BETA_EXTENDED_CACHE_TTL;
var BETA_SPEED;
var BETA_REDACT_THINKING;
var BETA_THINKING_RESUMPTION;
var BETA_THINKING_TOKEN_COUNT;
var BETA_AFK_MODE;
var BETA_ADVISOR_TOOL;
var BETA_CACHE_DIAGNOSIS;
var BETA_CONTEXT_HINT;
var BETA_MCP_SERVERS;
var BETA_FILES_API;
var BETA_ENVIRONMENTS;
var BETA_CCR_BYOC;
var BETA_CCR_TOOL_PROVENANCE;
var BETA_TOOL_PROVENANCE_SERVER_URL_LATCH;
var BETA_MID_CONVERSATION_SYSTEM;
var MID_CONVERSATION_SYSTEM_2026_04_07;
var BETA_PER_MESSAGE_EFFORT;
var BETA_PER_TURN_TIMING;
var BETA_MID_CONV_TOOL_CHANGE;
var BETA_INLINE_TOOLS;
var BETA_SERVER_SIDE_FALLBACK;
var BETA_PROGRAM_USE_CASE_IDS;
var BETA_SERVER_SIDE_FALLBACK_CATEGORY;
var BETA_FALLBACK_CREDIT;
var BETA_MID_CONV_CACHE_PROMOTION_LATCH;
var BETA_MID_CONV_CACHE_PROMOTION_OK_LATCH;
var BETA_RETIRED_PLACEHOLDER;
var BETA_AUTO_MODE_CLASSIFIER;
var BETA_CLAUDE_CODE_SIDE_QUERY;
var BETA_DANGEROUS_TOOL_USE;
var RETIRED_BETA_PLACEHOLDER;
var BETA_THINKING_DISPLAY_UPDATES;
var THINKING_DISPLAY_NAMED_BETA;
var BETA_THINKING_BINDING_CONTROLS;
var BETA_MESSAGE_THREADS;
var BETA_MID_CONVERSATION_SYSTEM_CLEAR_AT;
var SUPPORTED_BETA_ENTRIES;
var KNOWN_BETAS;
var THIRD_PARTY_SUPPORTED_BETAS;
deferInit("chunk-7kayq7nc.js:151462", () => {
  BETA_CLAUDE_CODE = freezeHeaderEntry("claude_code", "claude-code-20250219");
  BETA_OAUTH_AUTH = freezeHeaderEntry("oauth_auth", OAUTH_BETA_HEADER);
  BETA_INTERLEAVED_THINKING = freezeHeaderEntry("interleaved_thinking", "interleaved-thinking-2025-05-14");
  BETA_LONG_CONTEXT = freezeHeaderEntry("long_context", "context-1m-2025-08-07");
  BETA_CONTEXT_MANAGEMENT = freezeHeaderEntry("context_management", "context-management-2025-06-27");
  BETA_STRUCTURED_OUTPUTS = freezeHeaderEntry("structured_outputs", "structured-outputs-2025-12-15");
  BETA_WEB_SEARCH = freezeHeaderEntry("web_search", "web-search-2025-03-05");
  BETA_TOOL_SEARCH_ADVANCED = freezeHeaderEntry("tool_search", "advanced-tool-use-2025-11-20");
  BETA_TOOL_SEARCH = freezeHeaderEntry("tool_search", "tool-search-tool-2025-10-19");
  BETA_EFFORT = freezeHeaderEntry("effort", "effort-2025-11-24");
  BETA_TASK_BUDGETS = freezeHeaderEntry("task_budgets", "task-budgets-2026-03-13");
  BETA_PROMPT_CACHING_SCOPE = freezeHeaderEntry("prompt_caching_scope", "prompt-caching-scope-2026-01-05");
  BETA_PROMPT_CACHING_EVICT = freezeHeaderEntry("prompt_caching_evict", "prompt-caching-evict-2026-05-12");
  BETA_CACHE_KEEPALIVE = freezeHeaderEntry("cache_keepalive", "cache-keepalive-2026-09-03");
  BETA_EXTENDED_CACHE_TTL = freezeHeaderEntry("extended_cache_ttl", "extended-cache-ttl-2025-04-11");
  BETA_SPEED = freezeHeaderEntry("speed", "fast-mode-2026-02-01");
  BETA_REDACT_THINKING = freezeHeaderEntry("redact_thinking", "redact-thinking-2026-02-12");
  BETA_THINKING_RESUMPTION = freezeHeaderEntry("thinking_resumption", "thinking-resumption-2026-07-17");
  BETA_THINKING_TOKEN_COUNT = freezeHeaderEntry("thinking_token_count", "thinking-token-count-2026-05-13");
  BETA_AFK_MODE = freezeHeaderEntry("afk_mode", "afk-mode-2026-01-31");
  BETA_ADVISOR_TOOL = freezeHeaderEntry("advisor_tool", "advisor-tool-2026-03-01");
  BETA_CACHE_DIAGNOSIS = freezeHeaderEntry("cache_diagnosis", "cache-diagnosis-2026-04-07");
  BETA_CONTEXT_HINT = freezeHeaderEntry("context_hint", "context-hint-2026-04-09");
  BETA_MCP_SERVERS = freezeHeaderEntry("mcp_servers", "mcp-servers-2025-12-04");
  BETA_FILES_API = freezeHeaderEntry("files_api", "files-api-2025-04-14");
  BETA_ENVIRONMENTS = freezeHeaderEntry("environments", "environments-2025-11-01");
  BETA_CCR_BYOC = freezeHeaderEntry("ccr_byoc", "ccr-byoc-2025-07-29");
  BETA_CCR_TOOL_PROVENANCE = freezeHeaderEntry("ccr_tool_provenance", "tool-provenance-2026-10-26");
  BETA_TOOL_PROVENANCE_SERVER_URL_LATCH = freezeHeaderEntry(
    "tool_provenance_server_url_latch",
    "x-cc-internal-tool-provenance-server-url",
  );
  BETA_MID_CONVERSATION_SYSTEM = defineLocalBeta("mid_conversation_system");
  MID_CONVERSATION_SYSTEM_2026_04_07 = "mid-conversation-system-2026-04-07";
  BETA_PER_MESSAGE_EFFORT = freezeHeaderEntry("per_message_effort", "per-turn-control-2026-07-01");
  BETA_PER_TURN_TIMING = freezeHeaderEntry("per_turn_timing", "timing-2026-09-09");
  BETA_MID_CONV_TOOL_CHANGE = freezeHeaderEntry(
    "mid_conv_tool_change",
    "mid-conversation-tool-changes-2026-07-01",
  );
  BETA_INLINE_TOOLS = freezeHeaderEntry("inline_tools", "inline-tools-2026-09-15");
  BETA_SERVER_SIDE_FALLBACK = freezeHeaderEntry("server_side_fallback", "server-side-fallback-2026-06-01");
  BETA_PROGRAM_USE_CASE_IDS = freezeHeaderEntry("program_use_case_ids", "program-use-case-ids-2026-09-17");
  BETA_SERVER_SIDE_FALLBACK_CATEGORY = freezeHeaderEntry(
    "server_side_fallback_category",
    "server-side-fallback-2026-07-01",
  );
  BETA_FALLBACK_CREDIT = freezeHeaderEntry("fallback_credit", "fallback-credit-2026-06-01");
  BETA_MID_CONV_CACHE_PROMOTION_LATCH = freezeHeaderEntry(
    "mid_conv_cache_promotion_latch",
    "x-cc-internal-mid-conv-cache-promotion",
  );
  BETA_MID_CONV_CACHE_PROMOTION_OK_LATCH = freezeHeaderEntry(
    "mid_conv_cache_promotion_ok_latch",
    "x-cc-internal-mid-conv-cache-promotion-ok",
  );
  BETA_RETIRED_PLACEHOLDER = null;
  BETA_AUTO_MODE_CLASSIFIER = freezeHeaderEntry("auto_mode_classifier", "auto-mode-classifier-2026-07-16");
  BETA_CLAUDE_CODE_SIDE_QUERY = freezeHeaderEntry(
    "claude_code_side_query",
    "claude-code-side-query-2026-09-29",
  );
  BETA_DANGEROUS_TOOL_USE = freezeHeaderEntry("dangerous_tool_use", "dangerous-tool-use-2026-09-03");
  RETIRED_BETA_PLACEHOLDER = null;
  BETA_THINKING_DISPLAY_UPDATES = freezeHeaderEntry(
    "thinking_display_updates",
    "thinking-display-updates-2026-08-18",
  );
  THINKING_DISPLAY_NAMED_BETA = defineLocalBeta("thinking_display");
  BETA_THINKING_BINDING_CONTROLS = freezeHeaderEntry(
    "thinking_binding_controls",
    "thinking-binding-controls-2026-08-01",
  );
  BETA_MESSAGE_THREADS = freezeHeaderEntry("message_threads", "message-threads-2026-08-12");
  BETA_MID_CONVERSATION_SYSTEM_CLEAR_AT = freezeHeaderEntry(
    "mid_conversation_system_clear_at",
    "mid-conversation-system-clear-at-2026-08-21",
  );
  SUPPORTED_BETA_ENTRIES = Object.freeze(
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
      BETA_CCR_TOOL_PROVENANCE,
      BETA_MID_CONVERSATION_SYSTEM,
      BETA_PER_MESSAGE_EFFORT,
      BETA_PER_TURN_TIMING,
      BETA_MID_CONV_TOOL_CHANGE,
      BETA_INLINE_TOOLS,
      BETA_SERVER_SIDE_FALLBACK,
      BETA_PROGRAM_USE_CASE_IDS,
      BETA_SERVER_SIDE_FALLBACK_CATEGORY,
      BETA_FALLBACK_CREDIT,
      BETA_RETIRED_PLACEHOLDER,
      BETA_AUTO_MODE_CLASSIFIER,
      BETA_CLAUDE_CODE_SIDE_QUERY,
      BETA_DANGEROUS_TOOL_USE,
      RETIRED_BETA_PLACEHOLDER,
      BETA_THINKING_DISPLAY_UPDATES,
      BETA_MESSAGE_THREADS,
      BETA_MID_CONVERSATION_SYSTEM_CLEAR_AT,
      BETA_THINKING_BINDING_CONTROLS,
    ].filter((entry) => entry !== null),
  );
  KNOWN_BETAS = new Set(
    [
      BETA_OAUTH_AUTH,
      BETA_ADVISOR_TOOL,
      BETA_AFK_MODE,
      BETA_CACHE_KEEPALIVE,
      BETA_CLAUDE_CODE_SIDE_QUERY,
      BETA_LONG_CONTEXT,
      BETA_CONTEXT_HINT,
      BETA_RETIRED_PLACEHOLDER,
      BETA_DANGEROUS_TOOL_USE,
      BETA_FALLBACK_CREDIT,
      BETA_INLINE_TOOLS,
      BETA_MESSAGE_THREADS,
      BETA_MID_CONVERSATION_SYSTEM_CLEAR_AT,
      BETA_MID_CONV_TOOL_CHANGE,
      BETA_PER_MESSAGE_EFFORT,
      BETA_PER_TURN_TIMING,
      BETA_PROGRAM_USE_CASE_IDS,
      RETIRED_BETA_PLACEHOLDER,
      BETA_SERVER_SIDE_FALLBACK,
      BETA_SERVER_SIDE_FALLBACK_CATEGORY,
      BETA_STRUCTURED_OUTPUTS,
      BETA_THINKING_BINDING_CONTROLS,
      BETA_THINKING_RESUMPTION,
      BETA_TOOL_SEARCH_ADVANCED,
      BETA_TOOL_SEARCH,
    ].filter((entry) => entry !== null),
  );
  THIRD_PARTY_SUPPORTED_BETAS = new Map(
    SUPPORTED_BETA_ENTRIES.filter((entry) => entry.header !== null).map((entry) => [entry.header, entry]),
  );
});
//@ chunk-7kayq7nc.js:154585-154618 placement
function getBetaByName(name) {
  return THIRD_PARTY_SUPPORTED_BETAS.get(name);
}
//@ chunk-7kayq7nc.js:154618-154685 placement
/**
 * 按名字查 Beta 定义；未知名字当作头值等于名字的 Beta。
 */
function betaFromName(name) {
  return (
    THIRD_PARTY_SUPPORTED_BETAS.get(name) ??
    Object.freeze({
      name,
      header: name,
    })
  );
}
//@ chunk-7kayq7nc.js:154685-154757 placement
function betaHeaderValues(betas) {
  return betas.filter((beta) => beta.header !== null).map((beta) => beta.header);
}
//@ chunk-7kayq7nc.js:154757-154816 placement
/**
 * 把 Beta 列表转成请求参数 {betas:[…]}，空列表返回 {}。
 */
function betasRequestParam(betas) {
  let headers = betaHeaderValues(betas);
  return headers.length > 0
    ? {
        betas: headers,
      }
    : {};
}
//@ chunk-7kayq7nc.js:154816-154876 placement
function isAfkModeBeta(name) {
  return name.toLowerCase().includes("afk-mode");
}
//@ chunk-7kayq7nc.js:154876-154937 placement
/**
 * 第三方后端也支持的 beta 集合。
 */
var THINKING_CONTEXT_BETAS; // deferred: uses BETA_CLAUDE_CODE of its import cycle while loading; runs once the cycle is complete
var FIRST_PARTY_ONLY_BETAS;
deferInit("chunk-7kayq7nc.js:154876", () => {
  THINKING_CONTEXT_BETAS = new Set([BETA_INTERLEAVED_THINKING, BETA_LONG_CONTEXT, BETA_TOOL_SEARCH]);
  FIRST_PARTY_ONLY_BETAS = new Set([
    BETA_CLAUDE_CODE,
    BETA_INTERLEAVED_THINKING,
    BETA_CONTEXT_MANAGEMENT,
    BETA_OAUTH_AUTH,
  ]);
});
//@ chunk-7kayq7nc.js:154937-155009 fingerprint (2.1.88 match: shouldIncludeFirstPartyOnlyBetas, 0.838)
/**
 * 是否发第一方专属 beta：firstParty、anthropicAws/GoogleCloud、foundry。
 */
function shouldIncludeFirstPartyOnlyBetas() {
  let apiProvider = getAPIProvider();
  return apiProvider === "firstParty" || isClaudePlatformProvider(apiProvider) || apiProvider === "foundry";
}
//@ chunk-7kayq7nc.js:155009-155077 fingerprint (2.1.88 match: shouldUseGlobalCacheScope, 0.634)
/**
 * CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS 或 HIPAA 组织。旧版名 shouldUseGlobalCacheScope 为错配。
 */
function areExperimentalBetasDisabled() {
  return env.CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS || isHipaaOrg();
}
//@ chunk-7kayq7nc.js:155077-155110 placement
/**
 * 组织为 HIPAA（实验 beta、自定义 beta 被禁用）。
 */
function isHipaaOrg() {
  return hasComplianceTaint("hipaa");
}
//@ chunk-7kayq7nc.js:155110-155147 placement
/**
 * HIPAA 组织时返回 undefined，否则原值。
 */
function unlessHipaa(beta) {
  return isHipaaOrg() ? undefined : beta;
}
//@ chunk-7kayq7nc.js:155147-155181 placement
/**
 * 第一方专属 beta 可发且实验 beta 未禁用。
 */
function canSendFirstPartyBetas() {
  return shouldIncludeFirstPartyOnlyBetas() && !areExperimentalBetasDisabled();
}
//@ chunk-7kayq7nc.js:155181-155318 placement
/**
 * 判断能否发第一方 beta：必须第一方、允许 beta，且（本机非 unix socket 或指定租户），未模拟代理用量。
 */
function isFirstPartyBetaTransportAllowed(hasTenant) {
  return (
    getAPIProvider() === "firstParty" &&
    canSendFirstPartyBetas() &&
    ((isActualFirstPartyAnthropicBaseUrl() && env.ANTHROPIC_UNIX_SOCKET === undefined) ||
      (hasTenant && isFirstPartyAnthropicBaseUrl())) &&
    !env.CLAUDE_CODE_SIMULATE_PROXY_USAGE
  );
}
//@ chunk-exfmq47h.js:351653-351799 placement
/**
 * 是否可发送每回合 effort beta。
 */
function supportsPerTurnEffort(model, canonicalName) {
  if (!canSendFirstPartyBetas() || !hasFirstPartyCapabilities(getProviderForModel(model))) return false;
  if (modelSupportsCapability(canonicalName, "per_turn_effort", model) === false) return false;
  return (
    modelDefinitelySupports(canonicalName, "per_turn_effort", model) === true ||
    cachedGateValue?.(canonicalName, model) === true
  );
}
//@ chunk-exfmq47h.js:351799-351940 placement
/**
 * 是否可发送每回合计时 beta。
 */
function supportsPerTurnTiming(model, canonicalName) {
  if (
    !antEnv.CLAUDE_CODE_PER_TURN_TIMING ||
    !canSendFirstPartyBetas() ||
    !hasFirstPartyCapabilities(getProviderForModel(model))
  )
    return false;
  let supported = catalogHasCapability(canonicalName, "per_turn_timing");
  return supported === undefined ? supportsPerTurnEffort(model, canonicalName) : supported;
}
//@ chunk-exfmq47h.js:351940-351982 placement
/**
 * 是否带 1M 上下文 beta。
 */
function hasContextBeta(betas) {
  return (
    isBetaRejected(betas, BETA_PER_MESSAGE_EFFORT) || isBetaRejected(betas, BETA_MID_CONVERSATION_SYSTEM)
  );
}
//@ chunk-exfmq47h.js:351982-352028 placement
/**
 * 支持按轮投入度且没带上下文 beta 时才发该 beta。
 */
function usesPerTurnEffortBeta(model, canonicalName) {
  return supportsPerTurnEffort(model, canonicalName) && !hasContextBeta(getStickyBetas());
}
//@ chunk-exfmq47h.js:352028-352061 placement
/**
 * 判断该模型是否已被后端拒绝 1M 上下文 beta。
 */
function isContextBetaRefused(model) {
  return isContext1mMarkedRefused(stripAnyVersatileSuffix(model));
}
//@ chunk-exfmq47h.js:352061-352380 placement
/**
 * 后端拒绝 beta 后为该模型去掉它并记录。
 */
function rejectContextBetaForModel(model) {
  if (isContextBetaRefused(model)) return;
  markContext1mRefused(stripAnyVersatileSuffix(model));
  logForDebugging(
    `[betas] the backend rejected the ${BETA_LONG_CONTEXT.header} beta for ${model} (HTTP 400) and answered once it was removed. It is left out for this model, whose context window is sized without 1M, and is tried again after /clear, a compaction, a resume or a provider change.`,
    {
      level: "warn",
    },
  );
}
//@ chunk-exfmq47h.js:455687-455801 fingerprint (2.1.88 match: getToolSearchBetaHeader, 0.789)
/**
 * 第三方云（bedrock/vertex/mantle）上该模型是否需要工具搜索 beta 头。
 */
function getToolSearchBetaHeader(envFamily) {
  if (envFamily === null) return false;
  let provider = getAPIProvider();
  if (provider !== "bedrock" && provider !== "vertex" && provider !== "mantle") return false;
  return userConfiguredDefault(envFamily);
}
//@ chunk-exfmq47h.js:486488-486591 placement
/**
 * 模型默认输出 token 上限。
 */
function defaultMaxOutputTokens(model) {
  let antModel = getCanonicalName(model);
  return (
    servedDefaultOutputTokens(model, antModel) ??
    getClientDataDefaultOutputTokens(model, antModel) ??
    getCatalogEntry(antModel)?.max_output_tokens?.default ??
    getModelMaxOutputTokens(model).default
  );
}
//@ chunk-exfmq47h.js:486634-486871 fingerprint (2.1.88 match: modelSupportsStructuredOutputs, 0.717)
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
//@ chunk-exfmq47h.js:487883-488079 affinity
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
//@ chunk-exfmq47h.js:488079-488184 fingerprint (2.1.88 match: modelSupportsAutoMode, 0.378)
/**
 * 模型是否早于参照模型（3.x 一律算更早）。旧版名 modelSupportsAutoMode 为错配。
 */
function isOlderModelThan(model, otherModel) {
  if (model.includes("claude-3-")) return true;
  let index = MODEL_RELEASE_ORDER.indexOf(model);
  return index !== -1 && index < MODEL_RELEASE_ORDER.indexOf(otherModel);
}
//@ chunk-exfmq47h.js:491641-491689 placement
/**
 * beta 头是否允许。
 */
function isBetaHeaderAllowed() {
  if (shouldEnableThinkingByDefault() !== null) return false;
  return true;
}
//@ chunk-exfmq47h.js:491689-491710 layout
/**
 * SDK 自定义 betas 白名单：只有 context-1m。
 */
var SDK_ALLOWED_BETAS; // deferred: uses BETA_CLAUDE_CODE of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:491689", () => {
  SDK_ALLOWED_BETAS = new Set([BETA_LONG_CONTEXT]);
});
//@ chunk-exfmq47h.js:491710-491840 fingerprint (2.1.88 match: partitionBetasByAllowlist, 1)
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
//@ chunk-exfmq47h.js:491840-492202 placement (2.1.88 match: filterAllowedSdkBetas, 1)
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
//@ chunk-exfmq47h.js:492202-492432 placement (2.1.88 match: modelSupportsISP, 0.609)
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
//@ chunk-exfmq47h.js:492432-492480 placement
/**
 * Vertex 上该模型是否支持 web search beta（不早于 opus-4-0）。
 */
function vertexModelSupportsWebSearch(model) {
  return !isOlderModelThan(model, "claude-opus-4-0");
}
//@ chunk-exfmq47h.js:492480-492667 fingerprint (2.1.88 match: modelSupportsContextManagement, 0.428)
/**
 * 模型是否支持 context-management（API 侧 clear_thinking 等编辑）。
 */
function modelSupportsContextManagement(model) {
  let canonical = getCanonicalName(model);
  let supported = modelSupportsCapability(canonical, "context_management", model);
  if (supported === false) return false;
  let provider = getProviderForModel(model);
  if (provider === "foundry") return true;
  if (hasFirstPartyCapabilities(provider)) return !canonical.includes("claude-3-");
  return supported || canonical === "claude-mythos-5";
}
//@ chunk-exfmq47h.js:492667-492824 placement
/**
 * 模型是否支持 structured outputs：仅第一方系提供商、未禁用实验 beta 与 CLAUDE_CODE_DISABLE_STRUCTURED_OUTPUTS、不早于 opus-4-1。
 */
function modelSupportsStructuredOutputs(model) {
  let canonicalName = getCanonicalName(model);
  let providerForModel = getProviderForModel(model);
  if (!hasFirstPartyCapabilities(providerForModel)) return false;
  if (areExperimentalBetasDisabled()) return false;
  if (env.CLAUDE_CODE_DISABLE_STRUCTURED_OUTPUTS) return false;
  return !isOlderModelThan(canonicalName, "claude-opus-4-1");
}
//@ chunk-exfmq47h.js:492824-492889 placement
/**
 * 当前会话的 beta 结果缓存（服务目录被抑制时用 compiledOnly 版）。
 */
function getBetaCacheStore() {
  let providerState = getProviderState();
  return isCatalogSuppressed() ? providerState.betasCompiledOnly : providerState.betas;
}
//@ chunk-exfmq47h.js:492889-493056 placement
/**
 * 按模型缓存 beta 计算结果，并同步写一份不看服务目录的版本。
 */
function memoizeBetaResult(pickStore, model, compute) {
  let store = pickStore(getBetaCacheStore());
  let cached = store.get(model);
  if (cached !== undefined) return cached;
  let result = compute();
  store.set(model, result);
  if (!isCatalogSuppressed()) {
    let compiledStore = pickStore(getProviderState().betasCompiledOnly);
    if (!compiledStore.has(model)) compiledStore.set(model, withCatalogSuppressed(compute));
  }
  return result;
}
//@ chunk-exfmq47h.js:493056-493123 placement
/**
 * 模型是否接受中途 role=system 消息（mid_conversation_system，缓存）。
 */
function shouldUseMidConvSystem(model) {
  return memoizeBetaResult(
    (store) => store.midConversationSystem,
    model,
    () => computeMidConvSystemSupport(model),
  );
}
//@ chunk-exfmq47h.js:493123-493202 placement
/**
 * 工具加载提示文本：目录能力优先，否则按模型名判断。
 */
function modelGetsToolLoadedText(model) {
  let canonical = getCanonicalName(model);
  return (
    modelSupportsCapability(canonical, "tool_loaded_text", model) ?? canonical.includes(CLAUDE_MYTHOS_PREVIEW)
  );
}
//@ chunk-exfmq47h.js:493202-493440 placement
/**
 * 模型是否接受中途工具增减（mid-conversation-tool-changes）：需第一方 beta、接受中途 system；可用 CLAUDE_CODE_FORCE_MID_CONVERSATION_SYSTEM 强制。
 */
function modelTakesToolAdditions(model) {
  if (!canSendFirstPartyBetas() || !shouldUseMidConvSystem(model)) return false;
  if (env.CLAUDE_CODE_FORCE_MID_CONVERSATION_SYSTEM) return true;
  let canonicalName = getCanonicalName(model);
  if (isToolChangeUnsupportedModel(canonicalName)) return false;
  let supported = modelSupportsCapability(canonicalName, "mid_conv_tool_change", model);
  if (supported !== undefined) return supported;
  return canonicalName === "claude-mythos-5" || getCatalogEntry(strip1mTag(canonicalName)) === undefined;
}
//@ chunk-exfmq47h.js:493440-493687 placement
/**
 * 中途 system 消息支持判定：HIPAA 关闭；强制开关；能力覆盖；早于 opus-4-8 的不支持；否则看目录（默认支持）。
 */
function computeMidConvSystemSupport(model) {
  if (hasComplianceTaint("hipaa")) return false;
  if (env.CLAUDE_CODE_FORCE_MID_CONVERSATION_SYSTEM) return true;
  let capabilityOverride = getCapabilityOverrideCached(model, "mid_conversation_system");
  if (capabilityOverride !== undefined) return capabilityOverride;
  let canonicalName = getCanonicalName(model);
  if (isOlderModelThan(strip1mTag(canonicalName), "claude-opus-4-8")) return false;
  return modelSupportsCapability(canonicalName, "mid_conv_system", model) ?? true;
}
//@ chunk-exfmq47h.js:493687-493736 placement
/**
 * sonnet-5 保留中途 system-reminder 标签。
 */
function shouldKeepMidConvSystemReminderTags(model) {
  return getCanonicalName(model) === "claude-sonnet-5";
}
//@ chunk-exfmq47h.js:493736-493838 placement
/**
 * 模型是否接受 temperature 参数（早于 opus-4-7 的才接受）。
 */
function modelSupportsTemperature(model) {
  let capabilityOverride = getCapabilityOverrideCached(model, "temperature");
  if (capabilityOverride !== undefined) return capabilityOverride;
  return isOlderModelThan(getCanonicalName(model), "claude-opus-4-7");
}
//@ chunk-exfmq47h.js:493838-493890 placement
/**
 * 模型默认隐藏思考（不早于 opus-4-7）。
 */
function modelHidesThinkingByDefault(model) {
  return !isOlderModelThan(getCanonicalName(model), "claude-opus-4-7");
}
//@ chunk-exfmq47h.js:493890-493990 placement (2.1.88 match: getToolSearchBetaHeader, 0.789)
/**
 * 第三方云是否接受 thinking-binding-controls beta（vertex 接受；bedrock/mantle 上老模型不接受）。
 */
function thirdPartyAcceptsThinkingBindingBeta(providerForModel, model) {
  if (providerForModel === "vertex") return true;
  if (providerForModel !== "bedrock" && providerForModel !== "mantle") return false;
  return !isLegacyStructuredOutputModel(getCanonicalName(model));
}
//@ chunk-exfmq47h.js:493990-494065 placement
/**
 * 第三方云是否接受 dangerous-tool-use beta。
 */
function thirdPartyAcceptsDangerousToolUseBeta(provider, resolvedModel) {
  if (provider !== "bedrock" && provider !== "mantle") return true;
  return !isLegacyStructuredOutputModel(getCanonicalName(resolvedModel));
}
//@ chunk-exfmq47h.js:494065-494123 placement (2.1.88 match: logEventTo1P, 1)
/**
 * 非第一方、非 anthropicAws/GoogleCloud 的提供商（auto mode 第三方选项）。
 */
function isAutoMode3POptIn() {
  let apiProvider = getAPIProvider();
  return apiProvider !== "firstParty" && !isClaudePlatformProvider(apiProvider);
}
//@ chunk-exfmq47h.js:494123-494157 placement
/**
 * 是否允许发 afk-mode beta：第一方 beta 可用或第三方 auto mode。
 */
function shouldAllowAfkModeBeta() {
  return canSendFirstPartyBetas() || isAutoMode3POptIn();
}
//@ chunk-exfmq47h.js:494157-494204 placement (2.1.88 match: MITIGATION_EXEMPT_MODELS, 1)
/**
 * 模型是否排在 claude-opus-4-6 之前（modelSupportsAutoMode 的排序比较）；被快速模式支持判断使用。归属与旧版名均疑似错误。
 */
function isModelOlderThanOpus46(canonicalName) {
  return isOlderModelThan(canonicalName, "claude-opus-4-6");
}
//@ chunk-exfmq47h.js:494204-494371 placement
/**
 * 模型是否支持 auto mode（第三方上 opus-4-6、sonnet-4-6、haiku（除 5-5）不支持）。
 */
function modelSupportsAutoMode(model) {
  let canonicalName = getCanonicalName(model);
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
//@ chunk-exfmq47h.js:494371-494503 placement
/**
 * auto mode 支持情况：{supported, disableFastModeBreakerFires}。
 */
function getAutoModeModelSupport({ model, fastMode, disableFastMode }) {
  let fastModeBreaker = disableFastMode && (fastMode || isAntInternalFastModelId(model));
  return {
    supported: modelSupportsAutoMode(model) && !fastModeBreaker,
    disableFastModeBreakerFires: fastModeBreaker,
  };
}
//@ chunk-exfmq47h.js:494503-494971 placement
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
//@ chunk-exfmq47h.js:494971-495006 placement
/**
 * 工具搜索 beta：第一方 advanced-tool-use-2025-11-20，第三方 tool-search-tool-2025-10-19。
 */
function getToolSearchBeta() {
  return canSendFirstPartyBetas() ? BETA_TOOL_SEARCH_ADVANCED : BETA_TOOL_SEARCH;
}
//@ chunk-exfmq47h.js:495006-495120 placement
/**
 * 请求是否打到 Anthropic 自己的后端：anthropicAws 未自定义 base URL，或第一方且为官方 API。
 */
function hitsAnthropicBackend(apiProvider = getAPIProvider()) {
  if (apiProvider === "anthropicAws") return env.ANTHROPIC_AWS_BASE_URL === undefined;
  return apiProvider === "firstParty" && isFirstPartyAnthropicBaseUrl();
}
//@ chunk-exfmq47h.js:495120-495225 placement
/**
 * 是否用 cache_control scope:"global"（prompt-caching-scope beta）：第一方 beta 可用、官方 API、提供商为 firstParty/anthropicAws。实测第一方形状多出此 beta 与 system 静态块的 scope:global。
 */
function shouldUseGlobalCacheScope() {
  if (!canSendFirstPartyBetas()) return false;
  if (!isFirstPartyAnthropicBaseUrl()) return false;
  let apiProvider = getAPIProvider();
  return apiProvider === "firstParty" || apiProvider === "anthropicAws";
}
//@ chunk-exfmq47h.js:495225-495303 placement
var TENGU_SNAPPY_NOODLE = "tengu_snappy_noodle";
var TENGU_JAZZY_VALLEY = "tengu_jazzy_valley";
var TENGU_WOVEN_KESTREL = "tengu_woven_kestrel";
//@ chunk-exfmq47h.js:495303-495440 placement
/**
 * 判定是否满足 firstParty + 特定会话条件下才要读的 beta 组合。
 */
function toolProvenancePermitted() {
  return (
    getAPIProvider() === "firstParty" &&
    isFirstPartyAnthropicBaseUrl() &&
    canSendFirstPartyBetas() &&
    (getApiKeySourceSafe() === "none" || isClaudeAISubscriber()) &&
    !env.CCR_SESSION_PROFILE &&
    (!env.CLAUDE_CODE_REMOTE || getFeatureValue_CACHED_MAY_BE_STALE(TENGU_WOVEN_KESTREL, false))
  );
}
//@ chunk-exfmq47h.js:495440-495495 placement (2.1.88 match: logEventTo1P, 1)
function logEventTo1P_2() {
  return (
    toolProvenancePermitted() &&
    getFeatureValue_SESSION_PINNED(TENGU_SNAPPY_NOODLE, getAPIProvider() === "firstParty")
  );
}
//@ chunk-exfmq47h.js:495495-495544 placement (2.1.88 match: logEventTo1P, 1)
/**
 * tengu_jazzy_valley 开关控制的 beta 判定。
 */
function toolProvenanceCoversConfiguredServers() {
  return getFeatureValue_SESSION_PINNED(TENGU_JAZZY_VALLEY, getAPIProvider() === "firstParty");
}
//@ chunk-exfmq47h.js:495544-496457 fingerprint (2.1.88 match: getAllModelBetas, 0.528)
/**
 * 每轮附加 beta 条件表（getMergedBetas 用）：per-turn-control、timing、mid-conversation-tool-changes、inline-tools。
 */
var MODEL_BETA_RULES; // deferred: uses BETA_CLAUDE_CODE of its import cycle while loading; runs once the cycle is complete
var PER_TURN_BETA_RULES;
deferInit("chunk-exfmq47h.js:495544", () => {
  MODEL_BETA_RULES = [
    {
      beta: BETA_CLAUDE_CODE,
      when: (context) => !context.canonical.includes("haiku"),
    },
    {
      beta: BETA_OAUTH_AUTH,
      when: () =>
        isClaudeAISubscriber() ||
        (shouldIncludeFirstPartyOnlyBetas() && !hasAnthropicApiKey() && shouldUseWIFAuth()),
    },
    {
      beta: BETA_LONG_CONTEXT,
      when: (context) =>
        has1mSuffix_2(context.model) &&
        !modelHasNative1MContext(context.model, {
          byItsOwnName: true,
        }),
    },
    {
      beta: BETA_INTERLEAVED_THINKING,
      when: (context) => !env.DISABLE_INTERLEAVED_THINKING && context.interleavedThinking,
    },
    {
      beta: BETA_REDACT_THINKING,
      when: (context) =>
        context.firstPartyOnlyBetas &&
        context.interleavedThinking &&
        !getIsNonInteractiveSession() &&
        !showThinkingSummaries(),
    },
    {
      beta: BETA_CONTEXT_MANAGEMENT,
      when: (context) => {
        let envEnabled = env.USE_API_CONTEXT_MANAGEMENT && false;
        let supported = modelSupportsContextManagement(context.model);
        return context.firstPartyCapabilityBetas && (envEnabled || supported);
      },
    },
    {
      beta: BETA_STRUCTURED_OUTPUTS,
      when: (context) => {
        let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE("tengu_tool_pear", false);
        return (
          context.firstPartyCapabilityBetas &&
          modelSupportsStructuredOutputs(context.model) &&
          featureValue_CACHED_MAY_BE_STALE
        );
      },
    },
    {
      beta: BETA_WEB_SEARCH,
      when: (context) =>
        (context.provider === "vertex" && vertexModelSupportsWebSearch(context.canonical)) ||
        context.provider === "foundry",
    },
    {
      beta: BETA_PROMPT_CACHING_SCOPE,
      when: () => shouldUseGlobalCacheScope(),
    },
    {
      beta: BETA_MID_CONVERSATION_SYSTEM,
      when: (context) => shouldUseMidConvSystem(context.model),
    },
  ];
  PER_TURN_BETA_RULES = [
    {
      beta: BETA_PER_MESSAGE_EFFORT,
      when: (context) => context.perTurnTiming || supportsPerTurnEffort(context.model, context.canonical),
    },
    {
      beta: BETA_PER_TURN_TIMING,
      when: (context) => context.perTurnTiming,
    },
    {
      beta: BETA_MID_CONV_TOOL_CHANGE,
      when: (context) => isFoamySpringGateOn() && modelTakesToolAdditions(context.model),
    },
    {
      beta: BETA_INLINE_TOOLS,
      when: (context) =>
        isFoamySpringGateOn() && modelTakesToolAdditions(context.model) && isInlineToolsEnabled(),
    },
    {
      beta: BETA_CCR_TOOL_PROVENANCE,
      when: () => logEventTo1P_2(),
    },
    ...[],
  ];
});
//@ chunk-exfmq47h.js:496457-496517 placement
/**
 * 模型的基础 beta 列表（缓存）。门面名为准时以门面为准。
 */
function getAllModelBetas(model) {
  return memoizeBetaResult(
    (store) => store.allModelBetas,
    model,
    () => computeAllModelBetas(model),
  );
}
//@ chunk-exfmq47h.js:496517-497079 placement
/**
 * 按 MODEL_BETA_RULES 计算基础 beta，再追加 ANTHROPIC_BETAS（组织禁用实验 beta 时忽略；已 GA 的 mid-conversation-system 不发）。
 */
function computeAllModelBetas(model) {
  let context = {
    model,
    canonical: getCanonicalName(model),
    provider: getAPIProvider(),
    firstPartyOnlyBetas: canSendFirstPartyBetas(),
    firstPartyCapabilityBetas:
      hasFirstPartyCapabilities(getProviderForModel(model)) && !areExperimentalBetasDisabled(),
    interleavedThinking: modelSupportsISP(model),
  };
  let betas = [];
  for (let rule of MODEL_BETA_RULES) if (rule.when(context)) betas.push(rule.beta);
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
      for (let name of ANTHROPIC_BETAS.split(",")
        .map((part) => part.trim())
        .filter((part) => part && !isAfkModeBeta(part))) {
        if (name === MID_CONVERSATION_SYSTEM_2026_04_07) {
          logForDebugging(`ANTHROPIC_BETAS: '${name}' is generally available; the header is not sent`, {
            level: "debug",
          });
          continue;
        }
        betas.push(betaFromName(name));
      }
  return betas;
}
//@ chunk-exfmq47h.js:497079-497318 placement
/**
 * 模型的 beta 列表：Bedrock 去掉放进请求体的那几个；去掉本会话被服务器拒绝过的；1M 原生模型去掉 context-1m。
 */
function getModelBetas(model) {
  let betas = memoizeBetaResult(
    (store) => store.modelBetas,
    model,
    () => {
      let beta = getAllModelBetas(model);
      if (getProviderForModel(model) === "bedrock")
        return beta.filter((beta) => !THINKING_CONTEXT_BETAS.has(beta));
      return beta;
    },
  );
  let refusedBetaHeaders = getRefusedBetaHeaders();
  let withUseCase =
    programUseCaseIdForWire() === null ||
    betas.includes(BETA_PROGRAM_USE_CASE_IDS) ||
    !programUseCaseHeaderAllowed()
      ? betas
      : [...betas, BETA_PROGRAM_USE_CASE_IDS];
  return dropRedundantContext1m(
    model,
    refusedBetaHeaders.size === 0 ? withUseCase : withUseCase.filter((beta) => !refusedBetaHeaders.has(beta)),
  );
}
//@ chunk-exfmq47h.js:497318-497373 placement (2.1.88 match: logEventTo1P, 1)
/**
 * firstParty 且未处于某些条件时可用的一组 beta。
 */
function programUseCaseHeaderAllowed() {
  return (
    getAPIProvider() === "firstParty" && isFirstPartyAnthropicBaseUrl() && !areExperimentalBetasDisabled()
  );
}
//@ chunk-exfmq47h.js:497373-497417 placement
/**
 * qNn 之外还要未被某集合排除；utils/betas 与 services/api/claude 使用。
 */
function programUseCaseHeaderGoesOut() {
  return programUseCaseHeaderAllowed() && !getRefusedBetaHeaders().has(BETA_PROGRAM_USE_CASE_IDS);
}
//@ chunk-exfmq47h.js:497417-497522 placement
/**
 * Bedrock 需要放进请求体 anthropic_beta 的 beta（interleaved-thinking、context-1m、tool-search-tool）。
 */
function getBedrockExtraBodyParamsBetas(model) {
  return dropRedundantContext1m(
    model,
    memoizeBetaResult(
      (store) => store.bedrockExtraBodyParamsBetas,
      model,
      () => getAllModelBetas(model).filter((beta) => THINKING_CONTEXT_BETAS.has(beta)),
    ),
  );
}
//@ chunk-exfmq47h.js:497522-497592 placement
/**
 * 模型本身就是 1M 上下文时去掉 context-1m beta。
 */
function dropRedundantContext1m(model, betas) {
  return betas.includes(BETA_LONG_CONTEXT) && isContextBetaRefused(model)
    ? betas.filter((beta) => beta !== BETA_LONG_CONTEXT)
    : betas;
}
//@ chunk-exfmq47h.js:497592-498161 placement
/**
 * 本次请求的 beta 列表（queryModel 起点）：getModelBetas + 代理式查询补 claude-code + PER_TURN_BETA_RULES + SDK betas（组织禁用时丢弃，第三方只留白名单）。
 */
function getMergedBetas(model, options) {
  let baseBetas = [...getModelBetas(model)];
  if (options?.isAgenticQuery && !baseBetas.includes(BETA_CLAUDE_CODE)) baseBetas.push(BETA_CLAUDE_CODE);
  let canonicalName = getCanonicalName(model);
  let context = {
    model,
    canonical: canonicalName,
    perTurnTiming: supportsPerTurnTiming(model, canonicalName),
  };
  for (let rule of PER_TURN_BETA_RULES)
    if (rule.when(context) && !baseBetas.includes(rule.beta)) baseBetas.push(rule.beta);
  let sdkBetas = getSdkBetas();
  if (!sdkBetas || sdkBetas.length === 0) return baseBetas;
  let sdkBetasAllowed = unlessHipaa(sdkBetas);
  if (!sdkBetasAllowed) {
    logForDebugging("SDK betas dropped: experimental betas are disabled by your organization's policy", {
      level: "debug",
    });
    return baseBetas;
  }
  let mapped = sdkBetasAllowed.map(betaFromName);
  if (!canSendFirstPartyBetas())
    mapped = mapped.filter((beta) => {
      if (THIRD_PARTY_SAFE_BETAS.has(beta)) return true;
      logForDebugging(`SDK beta '${beta.header}' dropped on 3P`, {
        level: "debug",
      });
      return false;
    });
  return dropRedundantContext1m(model, [...baseBetas, ...mapped.filter((beta) => !baseBetas.includes(beta))]);
}
//@ chunk-exfmq47h.js:498161-498204 placement
/**
 * 是否会发 structured-outputs beta。
 */
function willSendStructuredOutputsBeta(model) {
  return getAllModelBetas(model).includes(BETA_STRUCTURED_OUTPUTS);
}
//@ chunk-exfmq47h.js:498204-498269 placement
/**
 * 清空 beta 缓存。
 */
function clearBetasCaches() {
  let providerState = getProviderState();
  providerState.betas = createModelBetaCaches();
  providerState.betasCompiledOnly = createModelBetaCaches();
}
//@ chunk-exfmq47h.js:498269-498339 placement
/**
 * 第三方提供商也会发送的 beta 集合；其余 beta 只发给第一方系提供商。
 */
var THIRD_PARTY_SAFE_BETAS; // deferred: uses BETA_CLAUDE_CODE of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:498269", () => {
  THIRD_PARTY_SAFE_BETAS = new Set([
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
});
//@ chunk-exfmq47h.js:498339-498405 placement
/**
 * 非第一方系提供商时只保留 THIRD_PARTY_SAFE_BETAS 里的 beta。
 */
function filterBetasForProvider(betas) {
  if (shouldIncludeFirstPartyOnlyBetas()) return betas;
  return betas.filter((beta) => THIRD_PARTY_SAFE_BETAS.has(beta));
}
export {
  shouldUseMidConvSystem,
  shouldKeepMidConvSystemReminderTags,
  shouldUseGlobalCacheScope,
  betaHeaderValues,
  getModelBetas,
  usesPerTurnEffortBeta,
  hasContextBeta,
  areExperimentalBetasDisabled,
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
  betasRequestParam,
  hitsAnthropicBackend,
  BETA_LONG_CONTEXT,
  modelTakesToolAdditions,
  BETA_INLINE_TOOLS,
  BETA_PER_MESSAGE_EFFORT,
  supportsPerTurnEffort,
  BETA_PER_TURN_TIMING,
  supportsPerTurnTiming,
  getMergedBetas,
  BETA_PROGRAM_USE_CASE_IDS,
  programUseCaseHeaderGoesOut,
  BETA_ADVISOR_TOOL,
  BETA_THINKING_TOKEN_COUNT,
  BETA_CCR_TOOL_PROVENANCE,
  getToolSearchBeta,
  BETA_PROMPT_CACHING_SCOPE,
  willSendStructuredOutputsBeta,
  BETA_STRUCTURED_OUTPUTS,
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
  BETA_CLAUDE_CODE_SIDE_QUERY,
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
  BETA_MCP_SERVERS,
  modelSupportsAutoMode,
  modelGetsToolLoadedText,
  clearBetasCaches,
  isBetaHeaderAllowed,
  isSkillModelOverrideAllowedInMode,
  isFirstPartyBetaTransportAllowed,
  isOlderModelThan,
  getBetaByName,
  FIRST_PARTY_ONLY_BETAS,
  THINKING_CONTEXT_BETAS,
  getAutoModeModelSupport,
  getAllModelBetas,
  isContextBetaRefused,
  BETA_TOOL_SEARCH_ADVANCED,
  BETA_TOOL_SEARCH,
  SUPPORTED_BETA_ENTRIES,
  MID_CONVERSATION_SYSTEM_2026_04_07,
  modelSupportsTemperature,
  BETA_AUTO_MODE_CLASSIFIER,
  BETA_RETIRED_PLACEHOLDER,
  toolProvenancePermitted,
  toolProvenanceCoversConfiguredServers,
  BETA_TOOL_PROVENANCE_SERVER_URL_LATCH,
  modelSupportsStructuredOutputs,
  BETA_FILES_API,
  BETA_CCR_BYOC,
  filterAllowedSdkBetas,
  defaultMaxOutputTokens,
  getToolSearchBetaHeader,
  unlessHipaa,
  BETA_CONTEXT_HINT,
  vertexModelSupportsWebSearch,
  BETA_ENVIRONMENTS,
  programUseCaseHeaderAllowed,
};
