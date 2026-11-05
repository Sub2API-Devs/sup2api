/**
 * services/api/withRetry.ts
 *
 * API 调用重试器 withRetry：按错误类型决定重试/退避/换 fallback 模型/放弃（CannotRetryError），处理 401/403 凭证刷新、云厂商认证、429/529 与快速模式冷却、上下文溢出调 max_tokens、onError 返回的 "retry:<原因>" 自愈重发、持久重试（RETRY_WATCHDOG），并向 UI 产出重试状态消息。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/api/withRetry.ts
 * pieces: chunk-5xgkngpb.js (69), chunk-exfmq47h.js (3), chunk-hb44av3w.js (1), chunk-k1t1w9mg.js (9)
 * attribution: fingerprint 15, layout 48, file-local 1, placement 15, callgraph-witnessed 2, affinity 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { backoffDelayMs, systemClock, sleep } from "../../utils/sleep.js";
import {
  APIError,
  APIUserAbortError,
  APIConnectionError,
  APIConnectionTimeoutError,
} from "../../../vendor/@anthropic-ai/sdk/core/error.mjs";
import {
  hasNestedError,
  GOOGLE_CREDENTIAL_ERROR_TEXT,
  extractConnectionErrorDetails,
  TRANSIENT_SOCKET_CODES,
  findProxyTunnelError,
  isStreamSuspendedError,
  isNetworkDownError,
  formatApiErrorType,
  summarizeApiError,
  SSL_CERT_ERROR_CODES,
} from "./errorUtils.js";
import { calculateCostFromTokenCounts } from "../../utils/modelCost.js";
import {
  findInCauseChain,
  getErrnoCode,
  errorMessage,
  StreamClosedAbortError,
  isAbortError,
  toError,
  withTelemetryMessage,
} from "../../utils/errors.js";
import { env } from "../../utils/env.js";
import { findRouteTurnError, isRoutedFinalAnswerError } from "./gzipRequestBody.js";
import {
  getClaudeAIOAuthTokens,
  effectiveAuthTokenEnv,
  isApiKeyHelperTheActiveCredential,
  isClaudeAISubscriber,
  gcpSignInFailures,
  awsSignInFailures,
  getAnthropicApiKey,
  shouldUseWIFAuth,
  handleOAuth401Error,
  getOAuthAccountOnHold,
  isHostManagedProviderAuth,
  getAuthTokenSource,
  isAnthropicAuthEnabled,
  getApiKeyHelperLastFailure,
  clearApiKeyHelperCache,
  refreshAndGetAwsCredentials,
  getDefaultAwsProviderChain,
  clearAwsCredentialsCache,
  clearAwsHelperCredentialsCache,
  invalidateDefaultAwsProviderChainDebounced,
  markGcpCredentialsRejected,
  isEnterpriseSubscriber,
} from "../../utils/auth.js";
import {
  isFirstPartyProvider,
  isActualFirstPartyAnthropicBaseUrl,
  isFirstPartyApiBackend,
  getProviderForModel,
  getAPIProviderForAnalytics,
} from "../../utils/model/providers.js";
import {
  getConfiguredProxyAuthHelper,
  clearProxyCache,
  configureGlobalAgents,
  disableKeepAlive,
  clearProxyAuthHelperCache,
} from "../../utils/proxy.js";
import {
  classifyAPIError,
  isConversationBindingError,
  isPrefixLockHealDeclined,
  isPromptTooLongError,
  isMaxTokensContextOverflow,
  isInputTooLongError,
  isCreditBalanceTooLow,
  isOrganizationDisabled,
  isAdvisorModelMismatchError,
  isDlpRequestDenied,
  isPolicyBlockedError,
  isRequestTooLargeError_2,
  isMidConversationSystemRejected,
  isWebSearchContentRejected,
  isCodeExecutionOutputRejected,
  alwaysFalseB as alwaysFalseB_2,
  isBetaRejected,
  NoApiAttemptsLeftError,
  OAuthRefreshDiskFullError,
  alwaysFalseErrors,
  isToolUseBlockCutOffError,
  REPEATED_529_MESSAGE,
  getCloudCredentialErrorProvider,
  isNonRetryable4xx,
} from "./errors.js";
import { hasCustomApiKeyHeader } from "./customHeaders.js";
import { hasCustomAuthorizationHeader } from "./client.js";
import { loadMTLSClientMaterial } from "../../utils/mtls.js";
import {
  logFeatureSad,
  logFeatureOk,
  logFeatureBad,
  logFeatureSadAsync,
} from "../analytics/featureTelemetry.js";
import { logForDebugging } from "../../utils/debug.js";
import { logError } from "../../utils/log.js";
import { isInvalidEffortError } from "./claude.js";
import {
  alwaysFalseB,
  alwaysFalseD,
  alwaysFalseE,
  normalizeApiErrorTypeDiag,
  classifyApiErrorKind,
} from "./responseDiagnostics.js";
import { BETA_CLAUDE_CODE_SIDE_QUERY } from "../../utils/betas.js";
import {
  isFastModeEnabled,
  isFallbackModelFastRejected,
  isFastModeCooldown,
  handleFastModeOverageRejection,
  triggerFastModeCooldown,
  wasEverFastRejected,
  markFallbackModelFastRejected,
  handleFastModeRejectedByAPI,
} from "../../utils/fastMode.js";
import {
  emptySuspendState,
  OVERAGE_STATUS_HEADER,
  OVERAGE_DISABLED_REASON_HEADER,
  hasUnifiedRateLimitHeaders,
  REPRESENTATIVE_CLAIM_HEADER,
} from "../lowPriority/headers.js";
import {
  isModelRefused,
  modelRefusedError,
  clearModelRefusal_2,
  isModelFallbackDisabled,
  isModelConfigured,
  advanceFallbackLadders,
  markModelRefused,
  modelNotAvailableError,
} from "../../utils/model/modelUnavailability.js";
import { withoutHostManagedProviderVars, hostAuthEnvVarName } from "../../utils/hostCredsFile.js";
import { invalidateWIFToken, getWIFTokenCache } from "../oauth/wifCredentials.js";
import { OAuthAccountOnHoldError } from "../oauth/oauthErrors.js";
import {
  getSdkOAuthTokenRefreshCallback,
  getHostAuthTokenRefreshCallback,
  getLastApiCompletionTimestamp,
} from "../../bootstrap/state.js";
import { emitCredentialChange } from "../../utils/auth/credentialEpoch.js";
import { isProviderManagedUnpinnedGateway } from "../gateway/gatewayAuth.js";
import { peekCACertificates, getCACertificates } from "../../utils/caCerts.js";
import {
  isLowPriorityActiveSafe,
  recordLowPriorityServed,
  planLowPriorityRetry,
} from "../lowPriority/lowPriorityMode.js";
import { sessionHasOwnFallback } from "../../utils/model/modelFallback.js";
import {
  wouldLoseContextOnFallback,
  supportsAutoModeIfActive,
  rememberModelAccess,
  classifyProviderErrorForModel,
  classifyModelAccess,
  checkProviderModelAccess,
} from "../../utils/model/modelAccessCheck.js";
import { isVerificationRequiredError } from "./verificationRequired.js";
import { isRegimeRefusal } from "./regimeRefusal.js";
import { logEvent } from "../analytics/index.js";
import { telemetrySafeModelName } from "../../utils/model/telemetryModelName.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { isMainOrAgentQuerySource, classifyQuerySource } from "./requestHeaders.js";
import { CA_CERT_ERROR_CODES, restoreServedChainIfNeeded } from "./tether.js";
import { findStreamNoResponseError } from "./streamErrors.js";
import { createSystemAPIErrorMessage } from "../../utils/messages.js";
import { agentTypeForTelemetry } from "../analytics/metadata.js";
import { getCanonicalName, strippedCanonicalName } from "../../utils/model/canonicalModelName.js";
import {
  isNonCustomOpusModel,
  isNonCustomFableModel,
  isNonCustomMythosModel,
} from "../../utils/model/smallFastModel.js";
import {
  WorkloadIdentityError,
  getWIFAccountOnHold,
} from "../../../vendor/@anthropic-ai/sdk/lib/credentials/types.mjs";
import { OAuthRefreshLockTimeoutError } from "../oauth/errors.js";
import { registerCleanup } from "../../utils/cleanupRegistry.js";
import { errorTelemetryFields } from "../../utils/accessibility/screenReader.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { getAwsRegionSync } from "../../utils/awsRegion.js";
import { isModelAllowed } from "../../utils/model/modelAllowlist.js";
import { isAwsCredentialsProviderError, isAwsCredentialError } from "../../utils/aws.js";
import { isWIFUserOAuthDeadError } from "../../utils/wifProfile.js";
import { isMockRateLimit429 } from "./usage.js";
import { streamFallbackWarning } from "./streamFallbackWarning.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { getAutoModeConfigOrDefault } from "../../utils/permissions/permissionSetup.js";
import { CLASSIFIER_MAX_RETRIES } from "../../utils/permissions/classifierHostContext.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-hb44av3w.js:17380-17436 fingerprint (2.1.88 match: isStaleConnectionError, 0.633)
/**
 * EPIPE/ECONNRESET/ENOTCONN/EOF：视为连接已失效、可换新连接重试的错误码。旧版名 isStaleConnectionError 是函数名，这里是集合。
 */
var STALE_CONNECTION_ERROR_CODES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hb44av3w.js:17380", () => {
  STALE_CONNECTION_ERROR_CODES = new Set(["EPIPE", "ECONNRESET", "ENOTCONN", "EOF"]);
});
//@ chunk-k1t1w9mg.js:1728-1747 affinity
/**
 * 0.25：退避的比例抖动。
 */
var BASE_RETRY_DELAY_MS = 500;
var RETRY_JITTER_RATIO = 0.25;
//@ chunk-k1t1w9mg.js:1747-1964 callgraph-witnessed (2.1.88 match: getRetryDelay, 0.161)
/**
 * 重试等待时间：以 500ms 为基数、上限 32s、25% 抖动的指数退避；有 retry-after（秒）时取两者较大值。
 */
function getRetryDelay(
  attempt,
  serverDelayMs,
  capMs = 32000,
  random = Math.random,
  baseMs = BASE_RETRY_DELAY_MS,
) {
  let rounded = Math.round(
    backoffDelayMs({
      attempt,
      baseMs,
      capMs,
      jitter: {
        kind: "proportional",
        ratio: RETRY_JITTER_RATIO,
      },
      random,
    }),
  );
  if (serverDelayMs) {
    let seconds = parseInt(serverDelayMs, 10);
    if (!isNaN(seconds)) return Math.max(seconds * 1000, rounded);
  }
  return rounded;
}
//@ chunk-k1t1w9mg.js:2549-2748 fingerprint (2.1.88 match: isOAuthTokenRevokedError, 0.637)
/**
 * 403 "OAuth token has been revoked" 或 401 "OAuth access token has been revoked"。
 */
function isOAuthTokenRevokedError(error) {
  if (!(error instanceof APIError)) return false;
  let message = error.message ?? "";
  return (
    (error.status === 403 && message.includes("OAuth token has been revoked")) ||
    (error.status === 401 && message.includes("OAuth access token has been revoked"))
  );
}
//@ chunk-k1t1w9mg.js:2748-2930 layout
/**
 * 403 permission_error 且消息含 "model:"（模型无权访问）。
 */
function isModelPermissionDeniedError(error) {
  if (!(error instanceof APIError) || error.status !== 403) return false;
  let message = error.message ?? "";
  return (
    (error.type === "permission_error" || message.includes('"type":"permission_error"')) &&
    message.includes("model:")
  );
}
//@ chunk-k1t1w9mg.js:2930-3035 layout
/**
 * 错误类型为 not_found_error。
 */
function isNotFoundErrorType(error) {
  return error.type === "not_found_error" || (error.message?.includes('"type":"not_found_error"') ?? false);
}
//@ chunk-k1t1w9mg.js:3035-3098 layout
function isNotFoundApiError(error) {
  return error instanceof APIError && error.status === 404 && isNotFoundErrorType(error);
}
//@ chunk-k1t1w9mg.js:3098-3211 layout
/**
 * 404 not_found_error 且消息含 "model:"。
 */
function isModelNotFoundError(error) {
  if (!(error instanceof APIError) || error.status !== 404) return false;
  return isNotFoundErrorType(error) && (error.message ?? "").includes("model:");
}
//@ chunk-k1t1w9mg.js:3211-3332 layout
/**
 * Azure/Foundry 404 DeploymentNotFound。
 */
function isAzureDeploymentNotFound(error) {
  if (!(error instanceof APIError) || error.status !== 404 || !hasNestedError(error)) return false;
  return error.error?.error?.code === "DeploymentNotFound";
}
//@ chunk-k1t1w9mg.js:3332-3456 fingerprint (2.1.88 match: is529Error, 1)
/**
 * 529 或消息含 overloaded_error。
 */
function is529Error(error) {
  if (!(error instanceof APIError)) return false;
  return error.status === 529 || (error.message?.includes('"type":"overloaded_error"') ?? false);
}
//@ chunk-exfmq47h.js:386126-386486 placement
/**
 * 计算回退请求的用量差值。
 */
function fallbackUsageDelta(usage) {
  let { primaryUsage, usage: usage_2, model, fallbackFrom } = usage;
  let delta =
    primaryUsage && usage_2
      ? {
          inputTokens: usage_2.inputTokens - primaryUsage.inputTokens,
          outputTokens: usage_2.outputTokens - primaryUsage.outputTokens,
          cacheReadInputTokens: usage_2.cacheReadInputTokens - primaryUsage.cacheReadInputTokens,
          cacheCreationInputTokens: usage_2.cacheCreationInputTokens - primaryUsage.cacheCreationInputTokens,
        }
      : usage_2;
  if (!delta || !model) return;
  return (
    calculateCostFromTokenCounts(model, delta) +
    (primaryUsage && fallbackFrom ? calculateCostFromTokenCounts(fallbackFrom, primaryUsage) : 0)
  );
}
//@ chunk-exfmq47h.js:386652-388916 placement
/**
 * withRetry 使用的一组开关名。
 */
var MOSSY_SQUID_GATE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var TENGU_TWINKLY_CLOVER;
var TENGU_SHINY_HAMMING;
var TENGU_CANDID_JUNIPER;
var TENGU_CHEEKY_TOUCAN;
var TENGU_STEADFAST_WREN;
var TENGU_COBALT_PLINTH_ORPINE;
var TENGU_VALIANT_LANTERN;
var TENGU_LEVEL_PLOVER;
var TENGU_SPLENDID_LYNX;
var TENGU_WOBBLY_FOG;
var TENGU_LIMBER_FINCH;
var TENGU_TENDER_MITTEN;
var TENGU_SNUG_QUILL;
var TENGU_MELLOW_RAINBOW;
var TENGU_HUMBLE_BUMBLEBEE;
var TENGU_WONDROUS_HAVEN;
var TENGU_GOOFY_HARE;
var TENGU_SQUISHY_ULLMAN;
var TENGU_PLUMB_MARTEN;
var TENGU_MIGHTY_FLASK;
var TENGU_STEADY_SCROLL;
var TENGU_PLAID_KETTLE;
var TENGU_ZIPPY_HARBOR;
var TENGU_FALLOW_LANTERN;
var TENGU_MELLOW_HOLLERITH;
var TENGU_WITTY_KAY;
var TENGU_STEADY_BITTERN;
var TENGU_KIND_DEWDROP;
var TENGU_THISTLE_ORRERY;
var TENGU_TOASTY_BEACON;
var TENGU_SNUG_WALL;
var TENGU_DEEP_TWILIGHT;
var TENGU_IMPERATIVE_SPINDLE;
var TENGU_PROUD_PEARL;
var TENGU_PATIENT_WALNUT;
var TENGU_FOAMY_PELICAN;
var TENGU_LEXICAL_DRAGONFLY;
var TENGU_FLAG_SET;
var RETRY_FLAG_NAMES;
deferInit("chunk-exfmq47h.js:386652", () => {
  MOSSY_SQUID_GATE = "tengu_mossy_squid";
  TENGU_TWINKLY_CLOVER = "tengu_twinkly_clover";
  TENGU_SHINY_HAMMING = "tengu_shiny_hamming";
  TENGU_CANDID_JUNIPER = "tengu_candid_juniper";
  TENGU_CHEEKY_TOUCAN = "tengu_cheeky_toucan";
  TENGU_STEADFAST_WREN = "tengu_steadfast_wren";
  TENGU_COBALT_PLINTH_ORPINE = "tengu_cobalt_plinth_orpine";
  TENGU_VALIANT_LANTERN = "tengu_valiant_lantern";
  TENGU_LEVEL_PLOVER = "tengu_level_plover";
  TENGU_SPLENDID_LYNX = "tengu_splendid_lynx";
  TENGU_WOBBLY_FOG = "tengu_wobbly_fog";
  TENGU_LIMBER_FINCH = "tengu_limber_finch";
  TENGU_TENDER_MITTEN = "tengu_tender_mitten";
  TENGU_SNUG_QUILL = "tengu_snug_quill";
  TENGU_MELLOW_RAINBOW = "tengu_mellow_rainbow";
  TENGU_HUMBLE_BUMBLEBEE = "tengu_humble_bumblebee";
  TENGU_WONDROUS_HAVEN = "tengu_wondrous_haven";
  TENGU_GOOFY_HARE = "tengu_goofy_hare";
  TENGU_SQUISHY_ULLMAN = "tengu_squishy_ullman";
  TENGU_PLUMB_MARTEN = "tengu_plumb_marten";
  TENGU_MIGHTY_FLASK = "tengu_mighty_flask";
  TENGU_STEADY_SCROLL = "tengu_steady_scroll";
  TENGU_PLAID_KETTLE = "tengu_plaid_kettle";
  TENGU_ZIPPY_HARBOR = "tengu_zippy_harbor";
  TENGU_FALLOW_LANTERN = "tengu_fallow_lantern";
  TENGU_MELLOW_HOLLERITH = "tengu_mellow_hollerith";
  TENGU_WITTY_KAY = "tengu_witty_kay";
  TENGU_STEADY_BITTERN = "tengu_steady_bittern";
  TENGU_KIND_DEWDROP = "tengu_kind_dewdrop";
  TENGU_THISTLE_ORRERY = "tengu_thistle_orrery";
  TENGU_TOASTY_BEACON = "tengu_toasty_beacon";
  TENGU_SNUG_WALL = "tengu_snug_wall";
  TENGU_DEEP_TWILIGHT = "tengu_deep_twilight";
  TENGU_IMPERATIVE_SPINDLE = "tengu_imperative_spindle";
  TENGU_PROUD_PEARL = "tengu_proud_pearl";
  TENGU_PATIENT_WALNUT = "tengu_patient_walnut";
  TENGU_FOAMY_PELICAN = "tengu_foamy_pelican";
  TENGU_LEXICAL_DRAGONFLY = "tengu_lexical_dragonfly";
  TENGU_FLAG_SET = new Set([
    "tengu_steady_bittern",
    "tengu_thistle_orrery",
    "tengu_snug_wall",
    "tengu_imperative_spindle",
    "tengu_foamy_pelican",
    "tengu_deep_twilight",
    ...[],
    "tengu_curried_trinket",
  ]);
  RETRY_FLAG_NAMES = new Set([
    "tengu_steady_bittern",
    ...[],
    "tengu_twinkly_clover",
    "tengu_shiny_hamming",
    "tengu_candid_juniper",
    "tengu_wobbly_fog",
    "tengu_cozy_hamming",
    "tengu_mossy_kepler",
    "tengu_iterative_lightning",
    "tengu_steadfast_wren",
    "tengu_cheeky_toucan",
    "tengu_cobalt_plinth_orpine",
    "tengu_valiant_lantern",
    "tengu_level_plover",
    "tengu_splendid_lynx",
    "tengu_limber_finch",
    "tengu_tender_mitten",
    "tengu_snug_quill",
    "tengu_mellow_rainbow",
    "tengu_humble_bumblebee",
    "tengu_mellow_heron",
    "tengu_staged_frost",
    "tengu_crinkled_scarecrow",
    "tengu_wondrous_haven",
    "tengu_mighty_flask",
    "tengu_goofy_hare",
    "tengu_squishy_ullman",
    "tengu_steady_scroll",
    "tengu_plumb_marten",
    "tengu_zippy_harbor",
    "tengu_fallow_lantern",
    "tengu_mellow_hollerith",
    "tengu_starry_wall",
    "tengu_groovy_ember",
    "tengu_composed_plum",
    "tengu_witty_kay",
    "tengu_kind_dewdrop",
    "tengu_thistle_orrery",
    "tengu_lexical_dragonfly",
    "tengu_proud_pearl",
    "tengu_patient_walnut",
    "tengu_steady_quail",
    "tengu_snug_wall",
    "tengu_deep_twilight",
    "tengu_foamy_pelican",
    ...[],
    "tengu_curried_trinket",
    "tengu_mossy_squid",
    "tengu_toasty_beacon",
    "tengu_plaid_kettle",
  ]);
});
//@ chunk-exfmq47h.js:389033-389573 fingerprint (2.1.88 match: FOREGROUND_529_RETRY_SOURCES, 0.585)
/**
 * 529 时允许重试的查询来源集合：前台来源 + agent:*、compact、hook_agent、side_question、web_search_tool、auto_mode 等；isForegroundQuerySource(IIe) 用它判断。
 */
var FOREGROUND_529_RETRY_SOURCES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var RETRY_ON_529_QUERY_SOURCES;
deferInit("chunk-exfmq47h.js:389033", () => {
  FOREGROUND_529_RETRY_SOURCES = {
    repl_main_thread: true,
    "repl_main_thread:outputStyle:custom": true,
    "repl_main_thread:outputStyle:Concise": true,
    "repl_main_thread:outputStyle:Proactive": true,
    "repl_main_thread:outputStyle:Explanatory": true,
    "repl_main_thread:outputStyle:Learning": true,
    sdk: true,
  };
  RETRY_ON_529_QUERY_SOURCES = new Set([
    ...Object.keys(FOREGROUND_529_RETRY_SOURCES),
    "agent:custom",
    "agent:default",
    "agent:builtin",
    "compact",
    "hook_agent",
    "hook_prompt",
    "side_question",
    "web_search_tool",
    "web_fetch_apply",
    "auto_mode",
    "compact_fab_check",
    "auto_mode_critique",
    "auto_mode_setup_propose",
    "chrome_mcp",
    "artifact_comment_reply",
  ]);
});
//@ chunk-5xgkngpb.js:1635931-1636194 fingerprint (2.1.88 match: isGoogleAuthLibraryCredentialError, 0.547)
/**
 * google-auth-library 凭证加载失败的典型消息片段；f5o 为令牌刷新失败片段。
 */
var GOOGLE_AUTH_CREDENTIAL_ERROR_MESSAGES; // deferred: uses CREDENTIAL_PROVIDER_ERRORS (./errorUtils.js) of its import cycle while loading; runs once the cycle is complete
var GOOGLE_AUTH_REFRESH_ERROR_MESSAGES;
deferInit("chunk-5xgkngpb.js:1635931", () => {
  GOOGLE_AUTH_CREDENTIAL_ERROR_MESSAGES = [
    "Could not load the default credentials",
    "does not exist, or it is not a file",
    "The incoming JSON object does not",
    "Must pass in a JSON object containing",
    "invalid_grant",
    "invalid_client",
    "unauthorized_client",
  ];
  GOOGLE_AUTH_REFRESH_ERROR_MESSAGES = [GOOGLE_CREDENTIAL_ERROR_TEXT, "Could not refresh access token"];
});
//@ chunk-5xgkngpb.js:1636194-1636274 layout
/**
 * 沿 cause 链找一个 message 含任一片段的错误。
 */
function errorChainMessageIncludes(error, needles) {
  return (
    findInCauseChain(error, (cause) => needles.some((needle) => cause.message.includes(needle))) !== undefined
  );
}
//@ chunk-5xgkngpb.js:1636274-1636339 layout
/**
 * EACCES/EPERM；g5o 为 open/read 系统调用名。
 */
var FS_PERMISSION_ERROR_CODES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var CREDENTIAL_FILE_SYSCALLS;
deferInit("chunk-5xgkngpb.js:1636274", () => {
  FS_PERMISSION_ERROR_CODES = new Set(["EACCES", "EPERM"]);
  CREDENTIAL_FILE_SYSCALLS = new Set(["open", "read"]);
});
//@ chunk-5xgkngpb.js:1636339-1636516 layout
/**
 * Google 凭证文件加载失败：已知消息片段，或凭证文件解析出 SyntaxError/读文件权限错误。
 */
function isGoogleCredentialLoadError(error) {
  return (
    errorChainMessageIncludes(error, GOOGLE_AUTH_CREDENTIAL_ERROR_MESSAGES) ||
    (errorChainMessageIncludes(error, [GOOGLE_CREDENTIAL_ERROR_TEXT]) &&
      findInCauseChain(
        error,
        (cause) =>
          cause.name === "SyntaxError" ||
          (FS_PERMISSION_ERROR_CODES.has(getErrnoCode(cause) ?? "") &&
            "syscall" in cause &&
            typeof cause.syscall === "string" &&
            CREDENTIAL_FILE_SYSCALLS.has(cause.syscall)),
      ) !== undefined)
  );
}
//@ chunk-5xgkngpb.js:1636516-1636608 fingerprint (2.1.88 match: isVertexAuthError, 0.661)
/**
 * 使用 Vertex 或 anthropicGoogleCloud。旧版名 isVertexAuthError 不准确。
 */
function isGoogleCloudProvider() {
  return !!(env.CLAUDE_CODE_USE_VERTEX || env.CLAUDE_CODE_USE_ANTHROPIC_GOOGLE_CLOUD);
}
//@ chunk-5xgkngpb.js:1636608-1636701 file-local
/**
 * Google Cloud 提供商下的凭证加载/刷新失败或 401。覆盖 auto 名 isTransientCapacityError（错误）。
 */
function isGoogleCloudAuthError(error) {
  if (!isGoogleCloudProvider()) return false;
  return (
    isGoogleCredentialLoadError(error) ||
    errorChainMessageIncludes(error, GOOGLE_AUTH_REFRESH_ERROR_MESSAGES) ||
    (error instanceof APIError && error.status === 401)
  );
}
//@ chunk-5xgkngpb.js:2453301-2453603 fingerprint (2.1.88 match: FallbackTriggeredError, 0.62)
/**
 * 触发模型回退：携带 originalModel、fallbackModel、reason（overloaded/permission_denied/model_not_found/server_error/last_resort/model_blocked）、原始错误、封锁提示。queryLoop 接到后换模型重发。
 */
class FallbackTriggeredError extends Error {
  originalModel;
  fallbackModel;
  reason;
  originalError;
  blockMessage;
  constructor(model, retryContext, reason = "overloaded", originalError, blockMessage) {
    super(`Model fallback triggered: ${model} -> ${retryContext}`);
    this.originalModel = model;
    this.fallbackModel = retryContext;
    this.reason = reason;
    this.originalError = originalError;
    this.blockMessage = blockMessage;
    this.name = "FallbackTriggeredError";
  }
}
//@ chunk-5xgkngpb.js:2675240-2675339 placement
function isRetryWatchdogOn() {
  return env.CLAUDE_CODE_RETRY_WATCHDOG && env.CLAUDE_CODE_RETRY_WATCHDOG_SCOPE !== "capacity";
}
//@ chunk-5xgkngpb.js:2675339-2675525 placement
/**
 * 重试相关常量：中止错误构造、最大重试次数、退避基数与上限、529 连续次数阈值、各类等待时长等。
 */
var createRetryAbortError = () => new APIUserAbortError();
var DEFAULT_MAX_RETRIES = 10;
var UNATTENDED_MAX_RETRIES = 300;
var MAX_RETRIES_CAP = 15;
var FLOOR_OUTPUT_TOKENS = 3000;
var MAX_529_RETRIES = 3;
var MAX_REMOTE_AUTH_RETRIES = 2;
var AUTH_RETRY_DELAY_MS = 1000;
var MAX_OAUTH_REFRESH_FAILURES = 2;
var MAX_HOST_AUTH_RECOVERY_FAILURES = 2;
var MAX_AWS_AUTH_RETRIES = 2;
var MAX_GCP_AUTH_RETRIES = 2;
var MAX_NO_RESPONSE_RETRIES = 1;
var RETRY_DECAY_RATIO = 0.9;
var OUTLASTED_TIMEOUT_RETRIES = 2;
var MAX_API_KEY_HELPER_RETRIES = 2;
var API_KEY_HELPER_FAST_RETRIES = 2;
var API_KEY_HELPER_RETRY_DELAY_MS = 1000;
var MAX_WIF_EXCHANGE_RETRIES = 1;
var MAX_RETRY_AFTER_WAIT_MS = 60000;
var PERSISTENT_RETRY_MAX_DELAY_MS = 300000;
var PERSISTENT_WAIT_CAP_MS = 21600000;
var PERSISTENT_WAIT_CHUNK_MS = 30000;
//@ chunk-5xgkngpb.js:2675525-2675576 placement
/**
 * 导出函数 `retryWatchdogEnv`：返回 env.CLAUDE_CODE_RETRY_WATCHDOG。
 */
function retryWatchdogEnv() {
  return env.CLAUDE_CODE_RETRY_WATCHDOG;
}
//@ chunk-5xgkngpb.js:2675576-2675660 placement
function isCapacityError(error) {
  return (
    is529Error(error) ||
    (error instanceof APIError && error.status === 429) ||
    findRouteTurnError(error)?.status === 529
  );
}
//@ chunk-5xgkngpb.js:2675660-2675754 placement
function isRemoteAuthError(error) {
  return (
    env.CLAUDE_CODE_REMOTE && error instanceof APIError && (error.status === 401 || error.status === 403)
  );
}
//@ chunk-5xgkngpb.js:2675754-2675819 placement
function oauthTokenRotated(clientOAuthAccessToken) {
  let accessToken = getClaudeAIOAuthTokens()?.accessToken;
  return accessToken !== undefined && accessToken !== clientOAuthAccessToken;
}
//@ chunk-5xgkngpb.js:2675819-2675919 placement
function isApiKeyHelperAuthError(error) {
  return (
    !isRemoteAuthError(error) &&
    error instanceof APIError &&
    (error.status === 401 || error.status === 403) &&
    isFirstPartyProvider() &&
    !effectiveAuthTokenEnv() &&
    isApiKeyHelperTheActiveCredential()
  );
}
//@ chunk-5xgkngpb.js:2675919-2676041 placement
function isAuthRetryableError(error, model) {
  return (
    (error instanceof APIError && error.status === 401) ||
    isApiKeyHelperAuthError(error) ||
    (proxyAuthRequired(error) !== undefined && Boolean(getConfiguredProxyAuthHelper())) ||
    isOAuthTokenRevokedError(error) ||
    isAwsAuthError(error, model) ||
    isGoogleCloudAuthError(error)
  );
}
//@ chunk-5xgkngpb.js:2676041-2676143 placement
function shouldOfferReauth(lastError) {
  let kind = classifyAPIError(lastError);
  return (
    (kind === "auth_error" || kind === "token_revoked") &&
    isClaudeAISubscriber() &&
    isActualFirstPartyAnthropicBaseUrl() &&
    !hasCustomApiKeyHeader() &&
    !hasCustomAuthorizationHeader()
  );
}
//@ chunk-5xgkngpb.js:2676143-2676234 placement
function shouldRetry529(error) {
  if (!(error instanceof APIConnectionError)) return false;
  let details = extractConnectionErrorDetails(error);
  return details !== null && TRANSIENT_SOCKET_CODES.has(details.code);
}
//@ chunk-5xgkngpb.js:2676234-2676438 placement
function isTlsOrSocketError(lastError) {
  if (!(lastError instanceof APIConnectionError)) return false;
  let connectionErrorDetails = extractConnectionErrorDetails(lastError);
  if (connectionErrorDetails === null) return false;
  let { code } = connectionErrorDetails;
  return (
    TRANSIENT_SOCKET_CODES.has(code) ||
    code === "EPROTO" ||
    code === "FailedToOpenSocket" ||
    code.startsWith("ERR_OSSL_") ||
    code.startsWith("ERR_SSL_")
  );
}
//@ chunk-5xgkngpb.js:2676438-2676766 placement
/**
 * 识别代理认证错误（407，含隧道错误），返回 proxy-authenticate 头。
 */
function proxyAuthRequired(errorMessage) {
  if (errorMessage instanceof APIConnectionError) {
    let proxyTunnelError = findProxyTunnelError(errorMessage);
    if (proxyTunnelError && "status" in proxyTunnelError && proxyTunnelError.status === 407)
      return {
        proxyAuthenticate:
          ("headers" in proxyTunnelError && proxyTunnelError.headers instanceof Headers
            ? proxyTunnelError.headers
            : undefined
          )?.get("proxy-authenticate") ?? undefined,
      };
    return;
  }
  if (errorMessage instanceof APIError && errorMessage.status === 407)
    return {
      proxyAuthenticate: errorMessage.headers?.get("proxy-authenticate") ?? undefined,
    };
  return;
}
//@ chunk-5xgkngpb.js:2676766-2677346 placement
/**
 * 连接失效时重新加载轮换后的 mTLS 客户端证书。
 */
async function reloadMtlsMaterial(reason) {
  if (!env.CLAUDE_CODE_CLIENT_CERT || env.CLAUDE_CODE_DISABLE_MTLS_RELOAD_ON_STALE_CONNECTION)
    return {
      reportedFailure: false,
      attempted: false,
    };
  try {
    let { changed, readFailed, mismatched } = await loadMTLSClientMaterial();
    if (changed) {
      clearProxyCache();
      configureGlobalAgents();
    }
    if (readFailed) {
      if (reason)
        logFeatureSad("api_mtls_cert_reload", mismatched ? "material_mismatched" : "material_read_failed");
      return {
        reportedFailure: reason,
        attempted: true,
      };
    }
    if (changed) {
      logForDebugging("Stale connection \u2014 reloaded rotated mTLS client material");
      logFeatureOk("api_mtls_cert_reload");
    }
    return {
      reportedFailure: false,
      attempted: true,
    };
  } catch (error) {
    logError(error);
    if (reason) logFeatureBad("api_mtls_cert_reload", "reload_failed");
    return {
      reportedFailure: reason,
      attempted: true,
    };
  }
}
//@ chunk-5xgkngpb.js:2677346-2677548 fingerprint (2.1.88 match: CannotRetryError, 0.725)
/**
 * 不可再重试：包装原始错误与 retryContext（model/fastMode/maxTokensOverride），name="RetryError"。
 */
class CannotRetryError extends Error {
  originalError;
  retryContext;
  constructor(error, retryContext) {
    let message = errorMessage(error);
    super(message);
    this.originalError = error;
    this.retryContext = retryContext;
    this.name = "RetryError";
    if (error instanceof Error && error.stack) this.stack = error.stack;
  }
}
//@ chunk-5xgkngpb.js:2677548-2677693 layout
/**
 * 一组判定函数（DLP、内容过滤、beta 拒绝、媒体错误……）：命中的错误不触发 last_resort fallback。
 */
var NON_RETRYABLE_STATUS_CODES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var NON_FALLBACK_ERROR_PREDICATES;
deferInit("chunk-5xgkngpb.js:2677548", () => {
  NON_RETRYABLE_STATUS_CODES = new Set([401, 407, 429, 404, 403, 413]);
  NON_FALLBACK_ERROR_PREDICATES = [
    (error) => isConversationBindingError(error) && !isPrefixLockHealDeclined(error),
    isPromptTooLongError,
    isMaxTokensContextOverflow,
    isInputTooLongError,
    isCreditBalanceTooLow,
    isOrganizationDisabled,
    isFastModeNotEnabledError,
    isAdvisorModelMismatchError,
    isDlpRequestDenied,
    isPolicyBlockedError,
    isRequestTooLargeError_2,
    isInvalidEffortError,
    alwaysFalseB,
    alwaysFalseD,
    isMidConversationSystemRejected,
    isWebSearchContentRejected,
    isCodeExecutionOutputRejected,
    alwaysFalseB_2,
    (error) => isBetaRejected(error, BETA_CLAUDE_CODE_SIDE_QUERY),
  ];
});
//@ chunk-5xgkngpb.js:2677693-2677736 layout
/**
 * 任一 NON_FALLBACK_ERROR_PREDICATES 命中。
 */
function isNonFallbackError(error) {
  return NON_FALLBACK_ERROR_PREDICATES.some((predicate) => predicate(error));
}
//@ chunk-5xgkngpb.js:2677736-2693320 callgraph-witnessed (2.1.88 match: withRetry, 0.252)
/**
 * withRetry(getClient, operation, options)：异步生成器，循环最多 maxRetries+1 次。每次：必要时（首次、401/吊销、凭证轮换、陈旧连接、mTLS 重载）刷新 OAuth/主机凭证并重建客户端 → 调 operation(client, attempt, retryContext)。出错：DLP/安全/内容过滤/验证/区域拒绝等直接 CannotRetryError；模型无权/不存在/5xx 且有 fallback → 抛 FallbackTriggeredError；onError 返回新的 "retry:<原因>" 标签则不计次立即重发（每个标签每次调用只用一次）；快速模式 429/529 进入冷却并关 fastMode；529 连续 3 次换 fallback 或报 repeated 529；上下文溢出把 maxTokensOverride 调到 contextLimit-input-1000；可重试错误按指数退避/retry-after 等待并 yield 重试状态系统消息；持久模式（CLAUDE_CODE_RETRY_WATCHDOG）对 429/529 无限等待并可在额度恢复时提前醒。
 */
async function* withRetry(getClient, operation, options) {
  let maxRetries = resolveMaxRetries(options);
  let maxAttempts = maxRetries;
  let clock = options.clock ?? systemClock;
  let retryContext = {
    model: options.model,
    ...(isFastModeEnabled() && {
      fastMode: options.fastMode,
    }),
  };
  let client = null;
  let consecutive529Errors = options.initialConsecutive529Errors ?? 0;
  let lastError;
  let persistentRetryCount = 0;
  let capacityWait = options.modelCallRetries?.capacityWait ?? {
    spentMs: 0,
    usageLimitSpentMs: 0,
  };
  let usageLimitRecheckCount = 0;
  let usageLimitLiftedLastCheck = false;
  let remoteAuthRetries = 0;
  let reconnectingAfterExhaust = false;
  let unregisterReconnectExitHook;
  let reconnectSlot = {
    open: undefined,
  };
  let nonStreamingTimeoutRetries = 0;
  let awsAuthRetries = 0;
  let gcpAuthRetries = 0;
  let noResponseRetryLedger = options.noResponseRetryLedger ?? {
    count: 0,
  };
  let oauthRefreshFailures = 0;
  let hostAuthRecoveryFailures = 0;
  let apiKeyHelperRetries = 0;
  let apiKeyHelperAuthRetries = 0;
  let wifExchangeRetries = 0;
  let lastAwsAccessKeyId;
  let mtlsReloadFailed = false;
  let chainReadTried = false;
  let chainWasRestored = false;
  let previousCACerts;
  let clientOAuthAccessToken;
  let clientHostAuthToken;
  let droppedBetaSet = new Set();
  let retryStatusShown = false;
  let lowPriorityMarkedAtDispatch = false;
  let noResponseLedgerLocal = {
    count: 0,
  };
  let lowPriorityWait = options.lowPriorityWait ?? emptySuspendState();
  let ownsLowPriorityWait = options.lowPriorityWait === undefined;
  let gcpSignInFailuresBefore = gcpSignInFailures();
  let awsSignInFailuresBefore = awsSignInFailures();
  try {
    let accessFallbackModel = getAccessFallbackModel(options);
    if (accessFallbackModel !== undefined && isModelRefused(options.model))
      throw new FallbackTriggeredError(
        options.model,
        accessFallbackModel,
        "permission_denied",
        modelRefusedError(options.model),
      );
    for (let attempt = 1; attempt <= maxAttempts + 1; attempt++) {
      if (options.signal?.aborted) throw new APIUserAbortError();
      if (options.modelCallRetries?.takeApiAttempt() === false)
        throw new CannotRetryError(new NoApiAttemptsLeftError(), retryContext);
      let attemptStartMs = clock.now();
      lowPriorityMarkedAtDispatch = false;
      if (retryContext.fastMode && isFallbackModelFastRejected(retryContext.model))
        retryContext.fastMode = false;
      let fastModeActive = isFastModeEnabled() ? retryContext.fastMode && !isFastModeCooldown() : false;
      let displayAttempt = Math.min(attempt + persistentRetryCount, maxAttempts + 1);
      try {
        let staleConnection = shouldRetry529(lastError);
        if (staleConnection) {
          logForDebugging("Stale connection \u2014 disabling keep-alive for retry");
          disableKeepAlive();
        }
        let mtlsReloaded = false;
        if (isTlsOrSocketError(lastError)) {
          let mtlsOutcome = await reloadMtlsMaterial(!mtlsReloadFailed);
          mtlsReloaded = mtlsOutcome.attempted;
          if (mtlsOutcome.reportedFailure) mtlsReloadFailed = true;
        }
        let oauthRotated =
          clientOAuthAccessToken !== undefined &&
          Boolean(env.CLAUDE_CODE_REMOTE_SESSION_ID) &&
          oauthTokenRotated(clientOAuthAccessToken);
        if (oauthRotated)
          logForDebugging("Credential rotated since the client was built \u2014 rebuilding before retry");
        if (
          client === null ||
          oauthRotated ||
          isAuthRetryableError(lastError, retryContext.model) ||
          staleConnection ||
          mtlsReloaded
        ) {
          if (
            (lastError instanceof APIError && lastError.status === 401) ||
            isOAuthTokenRevokedError(lastError) ||
            (withoutHostManagedProviderVars() &&
              (isAwsCredentialExpiredError(lastError, retryContext.model) ||
                isGoogleCloudAuthError(lastError)))
          ) {
            if (!getAnthropicApiKey() && shouldUseWIFAuth()) await invalidateWIFToken(client?.authToken);
            if (clientOAuthAccessToken) {
              let refreshOutcome;
              await handleOAuth401Error(clientOAuthAccessToken, options.credentials, options.storageV5, {
                onForcedRefreshOutcome: (outcome) => {
                  refreshOutcome = outcome;
                },
              });
              let oAuthAccountOnHold = getOAuthAccountOnHold();
              if (oAuthAccountOnHold) {
                logFeatureBad("api_request", "api_request_account_on_hold");
                throw new CannotRetryError(new OAuthAccountOnHoldError(oAuthAccountOnHold.url), retryContext);
              }
              if (getClaudeAIOAuthTokens()?.accessToken === clientOAuthAccessToken) {
                if (
                  getSdkOAuthTokenRefreshCallback() !== null ||
                  (!isRemoteAuthError(lastError) && ++oauthRefreshFailures >= MAX_OAUTH_REFRESH_FAILURES)
                ) {
                  if (refreshOutcome === "lock_disk_full" && shouldOfferReauth(lastError)) {
                    logFeatureBad("api_request", "api_request_oauth_refresh_disk_full");
                    throw new CannotRetryError(new OAuthRefreshDiskFullError(), retryContext);
                  }
                  logFeatureBad("api_request", "api_request_oauth_refresh_exhausted");
                  throw new CannotRetryError(lastError, retryContext);
                }
              } else oauthRefreshFailures = 0;
            } else if (
              withoutHostManagedProviderVars() &&
              process.env[hostAuthEnvVarName()] !== clientHostAuthToken
            )
              logForDebugging("Host credential replaced since the client was built \u2014 retrying with it");
            else if (withoutHostManagedProviderVars()) {
              let authRetryOutcome = null;
              let hostAuthRetry;
              let hostAuthDone = false;
              let awsCredsRetried = false;
              try {
                ({ authToken: authRetryOutcome, materialUnchanged: hostAuthRetry } =
                  await getHostAuthTokenRefreshCallback()());
              } catch (error) {
                logForDebugging(`host getHostAuthToken callback failed: ${errorMessage(error)}`, {
                  level: "error",
                });
                if (error instanceof StreamClosedAbortError)
                  throw new CannotRetryError(lastError, retryContext);
                if (isAbortError(error)) awsCredsRetried = true;
                else {
                  hostAuthDone = true;
                  logFeatureBad("host_auth_recovery", "callback_failed");
                }
              }
              let retryAuth = (attemptNumber) => {
                if (++hostAuthRecoveryFailures >= MAX_HOST_AUTH_RECOVERY_FAILURES) {
                  logFeatureBad("host_auth_recovery", attemptNumber);
                  logFeatureBad("api_request", "api_request_host_auth_exhausted");
                  throw new CannotRetryError(lastError, retryContext);
                }
              };
              if (hostAuthDone);
              else if (awsCredsRetried) retryAuth("callback_aborted");
              else if (
                typeof authRetryOutcome === "string" &&
                authRetryOutcome &&
                authRetryOutcome !== clientHostAuthToken
              ) {
                process.env[hostAuthEnvVarName()] = authRetryOutcome;
                emitCredentialChange();
                hostAuthRecoveryFailures = 0;
                logFeatureOk("host_auth_recovery");
              } else if (authRetryOutcome === null) {
                if (hostAuthRetry === true) retryAuth("material_unchanged");
                else {
                  hostAuthRecoveryFailures = 0;
                  logFeatureOk("host_auth_recovery");
                }
              } else retryAuth("bearer_unchanged");
            } else if (
              ((isHostManagedProviderAuth() && isFirstPartyProvider()) ||
                isProviderManagedUnpinnedGateway()) &&
              !shouldUseWIFAuth() &&
              getAuthTokenSource().source !== "apiKeyHelper" &&
              !isRemoteAuthError(lastError)
            ) {
              logFeatureBad("api_request", "api_request_host_managed_auth_fail");
              throw new CannotRetryError(lastError, retryContext);
            }
          }
          clientHostAuthToken = process.env[hostAuthEnvVarName()];
          previousCACerts = peekCACertificates();
          client = await getClient();
          clientOAuthAccessToken = isAnthropicAuthEnabled()
            ? getClaudeAIOAuthTokens()?.accessToken
            : undefined;
        }
        lowPriorityMarkedAtDispatch = isFirstPartyApiBackend() && isLowPriorityActiveSafe();
        let result = await operation(client, displayAttempt, retryContext);
        logFeatureOk("api_request");
        if (reconnectingAfterExhaust) {
          logFeatureOk("api_reconnect");
          reconnectingAfterExhaust = false;
        }
        clearModelRefusal_2(options.model);
        if (
          !isModelFallbackDisabled() &&
          !isModelConfigured(options.model) &&
          !sessionHasOwnFallback() &&
          advanceFallbackLadders(options.model, wouldLoseContextOnFallback, supportsAutoModeIfActive)
        ) {
          logForDebugging(
            `[model-access] now using ${options.model} as its tier's default: every newer model of the tier was refused, is not allowed, or was skipped because of its context window`,
          );
          rememberModelAccess(options.model, "ok");
        }
        if (ownsLowPriorityWait) recordLowPriorityServed(lowPriorityWait);
        return result;
      } catch (error) {
        if (error instanceof CannotRetryError) throw error;
        if (error instanceof APIUserAbortError) throw error;
        if (isDlpRequestDenied(error)) {
          logFeatureBad("api_request", "api_request_dlp_denied");
          throw new CannotRetryError(error, retryContext);
        }
        if (alwaysFalseErrors(error)) {
          logFeatureBad("api_request", "api_request_safety_monitor_blocked");
          throw new CannotRetryError(error, retryContext);
        }
        if (isToolUseBlockCutOffError(error)) {
          logFeatureSad("api_request", "api_request_tool_use_block_cut_off");
          throw new CannotRetryError(error, retryContext);
        }
        if (isRequestTooLargeError_2(error)) {
          logFeatureBad("api_request", "api_request_output_content_filtered");
          throw new CannotRetryError(error, retryContext);
        }
        if (isVerificationRequiredError(error)) {
          logFeatureBad("api_request", "api_request_verification_required");
          throw new CannotRetryError(error, retryContext);
        }
        if (isRegimeRefusal(error)) {
          logFeatureBad("api_request", "api_request_regime_features_refused");
          throw new CannotRetryError(error, retryContext);
        }
        if (isRoutedFinalAnswerError(error)) {
          let retryError =
            isModelPermissionDeniedError(error) && !options.modelCallRetries?.outOfApiAttempts()
              ? (options.fallbackModel ??
                (getProviderForModel(options.model) === "firstParty"
                  ? getAccessFallbackModel(options)
                  : undefined))
              : undefined;
          if (retryError && retryError !== options.model) {
            logEvent("tengu_api_model_not_found_fallback_triggered", {
              original_model: telemetrySafeModelName(options.model),
              fallback_model: telemetrySafeModelName(retryError),
              provider: getAPIProviderForAnalytics(),
              reason: fromEnum("permission_denied"),
            });
            throw new FallbackTriggeredError(options.model, retryError, "permission_denied", error);
          }
          logFeatureBad("api_request", "api_request_route_answer_final");
          throw new CannotRetryError(error, retryContext);
        }
        if (
          findRouteTurnError(error) !== undefined &&
          !isMainOrAgentQuerySource(options.querySource) &&
          !isRetryWatchdogOn()
        ) {
          logFeatureBad("api_request", "api_request_route_turned_away_background_dropped");
          throw new CannotRetryError(error, retryContext);
        }
        if (options.modelCallRetries?.outOfApiAttempts()) {
          logFeatureBad("api_request", "api_request_attempts_exhausted");
          throw new CannotRetryError(error, retryContext);
        }
        lastError = error;
        logForDebugging(
          `API error (attempt ${displayAttempt}/${maxAttempts + 1}): ${error instanceof APIError ? `${error.status} ${error.message}` : errorMessage(error)}`,
          {
            level: "error",
          },
        );
        let previousRestored = chainWasRestored;
        chainWasRestored = false;
        if (
          error instanceof APIConnectionError &&
          CA_CERT_ERROR_CODES.has(extractConnectionErrorDetails(error)?.code ?? "")
        ) {
          if (previousRestored) logFeatureSad("api_served_chain_read", "retry_failed_again");
          else if (!chainReadTried) {
            chainReadTried = true;
            let caCertificates = getCACertificates();
            let restored =
              (previousCACerts !== undefined &&
                caCertificates !== undefined &&
                (caCertificates.length !== previousCACerts.length ||
                  caCertificates.some((caCertificate, cert) => caCertificate !== previousCACerts?.[cert]))) ||
              (await restoreServedChainIfNeeded(client?.baseURL, options.signal));
            if (options.signal?.aborted) throw new APIUserAbortError();
            if (restored) {
              chainWasRestored = true;
              client = null;
              attempt--;
              continue;
            }
          }
        }
        if (findStreamNoResponseError(error) !== undefined) {
          if (!isRetryWatchdogOn() && noResponseRetryLedger.count >= MAX_NO_RESPONSE_RETRIES) {
            logFeatureBad("api_request", "api_request_no_response_exhausted");
            throw new CannotRetryError(error, retryContext);
          }
          noResponseRetryLedger.count++;
        }
        let timeoutRetry;
        let backoffMs =
          env.CLAUDE_CODE_NONSTREAMING_TIMEOUT_RETRIES ??
          (isRetryWatchdogOn() && options.failedStreamOutlastedTimeout
            ? OUTLASTED_TIMEOUT_RETRIES
            : undefined);
        if (
          backoffMs !== undefined &&
          options.nonStreamingTimeoutMs !== undefined &&
          error instanceof APIConnectionTimeoutError &&
          clock.now() - attemptStartMs >= options.nonStreamingTimeoutMs * RETRY_DECAY_RATIO
        ) {
          if (nonStreamingTimeoutRetries >= backoffMs) {
            logFeatureBad("api_request", "api_request_nonstreaming_timeout_exhausted");
            throw new CannotRetryError(error, retryContext);
          }
          nonStreamingTimeoutRetries++;
          timeoutRetry = backoffMs - nonStreamingTimeoutRetries;
        }
        let retryLabel = await options.onError?.(error);
        if (retryLabel && !droppedBetaSet.has(retryLabel)) {
          droppedBetaSet.add(retryLabel);
          let mockError = toRetryStatusError(error, retryContext.model);
          if (mockError?.noResponse) {
            retryStatusShown = true;
            let displayMax = clampRetryDisplayMax(
              mockError,
              attempt,
              maxAttempts,
              noResponseRetryLedger.count,
            );
            options.onRetryStatus?.({
              kind: "retrying",
              error: mockError,
              attempt,
              maxRetries: displayMax,
              retryInMs: 0,
              deadline: clock.now(),
            });
            yield createSystemAPIErrorMessage(mockError, 0, attempt, displayMax, "request_retry");
          }
          attempt--;
          continue;
        }
        let lowPriorityDelay = planLowPriorityRetry(error, {
          markedAtDispatch: lowPriorityMarkedAtDispatch,
          querySource: options.querySource,
          wait: lowPriorityWait,
        });
        if (lowPriorityDelay !== null) {
          retryStatusShown = true;
          options.onRetryStatus?.({
            kind: "low_priority_waiting",
            attempt: lowPriorityDelay.attempt,
            retryInMs: lowPriorityDelay.delayMs,
            deadline: clock.now() + lowPriorityDelay.delayMs,
          });
          await sleep(lowPriorityDelay.delayMs, options.signal, {
            abortError: createRetryAbortError,
            clock,
          });
          attempt--;
          continue;
        }
        if (classifyProviderErrorForModel(options.model, error) === "refused") {
          markModelRefused(options.model, error);
          rememberModelAccess(options.model, "refused");
          let isStaleConnection = getAvailableFallbackModel(options);
          if (isStaleConnection !== undefined) {
            logEvent("tengu_api_model_not_found_fallback_triggered", {
              original_model: telemetrySafeModelName(options.model),
              fallback_model: telemetrySafeModelName(isStaleConnection),
              provider: getAPIProviderForAnalytics(),
              reason: fromEnum("model_access_refused"),
            });
            throw new FallbackTriggeredError(options.model, isStaleConnection, "permission_denied", error);
          }
          classifyModelAccess(options.model, error, "refused");
          throw new CannotRetryError(error, retryContext);
        }
        if (classifyProviderErrorForModel(options.model, error) === "denied") {
          let awsAccessKeyId = await getAwsAccessKeyId(options.signal);
          if (awsAccessKeyId !== undefined && awsAccessKeyId === lastAwsAccessKeyId) {
            if (options.signal?.aborted) throw createRetryAbortError();
            let model = getAvailableFallbackModel(options);
            let capacityWaitMs =
              model === undefined ? undefined : await checkProviderModelAccess(model, awsAccessKeyId);
            if (
              model !== undefined &&
              capacityWaitMs === "accessible" &&
              getAvailableFallbackModel(options) === model
            ) {
              markModelRefused(options.model, error);
              rememberModelAccess(options.model, "refused");
              logEvent("tengu_api_model_not_found_fallback_triggered", {
                original_model: telemetrySafeModelName(options.model),
                fallback_model: telemetrySafeModelName(model),
                provider: getAPIProviderForAnalytics(),
                reason: fromEnum("model_access_denied"),
              });
              throw new FallbackTriggeredError(options.model, model, "permission_denied", error);
            }
            let statusInfo =
              model !== undefined && capacityWaitMs === "refused" && options.fallbackModel === undefined;
            if (statusInfo) markModelRefused(model, modelNotAvailableError(model));
            if (model === undefined || statusInfo) classifyModelAccess(options.model, error, "denied");
            throw new CannotRetryError(error, retryContext);
          }
          lastAwsAccessKeyId = awsAccessKeyId;
        } else lastAwsAccessKeyId = undefined;
        let isModelAccessError = isModelNotFoundError(error) || isModelPermissionDeniedError(error);
        let fallbackForAccessError =
          options.fallbackModel ??
          (isModelAccessError && getProviderForModel(options.model) === "firstParty"
            ? getAccessFallbackModel(options)
            : undefined);
        if (
          (isModelAccessError || (!isRetryWatchdogOn() && isNon529ServerError(error))) &&
          fallbackForAccessError &&
          fallbackForAccessError !== options.model
        ) {
          let modelNotFound = isModelNotFoundError(error)
            ? "model_not_found"
            : isModelPermissionDeniedError(error)
              ? "permission_denied"
              : "server_error";
          logEvent("tengu_api_model_not_found_fallback_triggered", {
            original_model: telemetrySafeModelName(options.model),
            fallback_model: telemetrySafeModelName(fallbackForAccessError),
            provider: getAPIProviderForAnalytics(),
            reason: fromEnum(modelNotFound),
          });
          throw new FallbackTriggeredError(options.model, fallbackForAccessError, modelNotFound, error);
        }
        let isApiKeyHelperAuthError_2 = isApiKeyHelperAuthError(error);
        let apiKeyHelperFastRetry =
          isApiKeyHelperAuthError_2 && apiKeyHelperAuthRetries < API_KEY_HELPER_FAST_RETRIES;
        if (
          !isApiKeyHelperAuthError_2 &&
          !isRemoteAuthError(error) &&
          error instanceof APIError &&
          (error.status !== undefined || is529Error(error)) &&
          proxyAuthRequired(error) === undefined
        ) {
          apiKeyHelperAuthRetries = 0;
          remoteAuthRetries = 0;
        }
        let persistentWatchdog = retryWatchdogEnv();
        if (fastModeActive && error instanceof APIError && (error.status === 429 || is529Error(error))) {
          let overageReason = error.headers?.get("anthropic-ratelimit-unified-overage-disabled-reason");
          if (overageReason !== null && overageReason !== undefined) {
            handleFastModeOverageRejection(overageReason, options.storageV5);
            retryContext.fastMode = false;
            if (persistentWatchdog) attempt--;
            continue;
          }
          let retryAfterMs = getRetryAfterMs(error);
          let shortRetry = retryAfterMs !== null && retryAfterMs < FAST_MODE_SHORT_RETRY_THRESHOLD_MS;
          if (shortRetry && !persistentWatchdog) {
            if (attempt <= maxAttempts) {
              let min = Math.min(
                getRetryDelay(
                  attempt,
                  getRetryAfter(error),
                  FAST_MODE_SHORT_RETRY_THRESHOLD_MS,
                  options.random,
                ),
                FAST_MODE_SHORT_RETRY_THRESHOLD_MS,
              );
              let retryStatusError = toRetryStatusError(error, retryContext.model);
              if (retryStatusError) {
                retryStatusShown = true;
                options.onRetryStatus?.({
                  kind: "retrying",
                  error: retryStatusError,
                  attempt,
                  maxRetries: maxAttempts,
                  retryInMs: min,
                  deadline: clock.now() + min,
                });
                yield createSystemAPIErrorMessage(
                  retryStatusError,
                  min,
                  attempt,
                  maxAttempts,
                  "request_retry",
                );
              }
              await sleepOrWake(min, options);
            }
            continue;
          }
          if (!shortRetry) {
            let cooldownMs = Math.max(
              retryAfterMs ?? FAST_MODE_DEFAULT_COOLDOWN_MS,
              FAST_MODE_MIN_COOLDOWN_MS,
            );
            let reason = is529Error(error) ? "overloaded" : "rate_limit";
            triggerFastModeCooldown(Date.now() + cooldownMs, reason);
            if (isFastModeEnabled()) retryContext.fastMode = false;
            if (persistentWatchdog) attempt--;
            continue;
          }
        }
        if (
          fastModeActive &&
          isSpeedParameterUnsupportedError(error, retryContext.model) &&
          (options.modelIsRefusalFallbackTarget || wasEverFastRejected(retryContext.model))
        ) {
          markFallbackModelFastRejected(retryContext.model);
          retryContext.fastMode = false;
          if (isRetryWatchdogOn()) attempt--;
          continue;
        }
        if (fastModeActive && isFastModeNotEnabledError(error)) {
          handleFastModeRejectedByAPI(options.storageV5);
          retryContext.fastMode = false;
          if (isRetryWatchdogOn()) attempt--;
          continue;
        }
        if (
          alwaysFalseE(
            error,
            {
              model: retryContext.model,
              carriesConfigSkips: true,
            },
            noResponseLedgerLocal,
          )
        ) {
          attempt--;
          continue;
        }
        if (is529Error(error) && !isMainOrAgentQuerySource(options.querySource) && !isRetryWatchdogOn()) {
          logEvent("tengu_api_529_background_dropped", {
            query_source: agentTypeForTelemetry(options.querySource),
          });
          logFeatureBad("api_request", "api_request_overload_background_dropped");
          throw new CannotRetryError(error, retryContext);
        }
        let canonicalName = getCanonicalName(options.model);
        if (
          is529Error(error) &&
          (env.FALLBACK_FOR_ALL_PRIMARY_MODELS ||
            options.fallbackModel !== undefined ||
            (!isClaudeAISubscriber() &&
              (isNonCustomOpusModel(canonicalName) ||
                isNonCustomFableModel(canonicalName) ||
                isNonCustomMythosModel(canonicalName))))
        ) {
          consecutive529Errors++;
          if (consecutive529Errors >= MAX_529_RETRIES) {
            if (options.fallbackModel) {
              logEvent("tengu_api_opus_fallback_triggered", {
                original_model: telemetrySafeModelName(options.model),
                fallback_model: telemetrySafeModelName(options.fallbackModel),
                provider: getAPIProviderForAnalytics(),
              });
              logFeatureSad("api_request", "api_request_fallback_triggered");
              throw new FallbackTriggeredError(options.model, options.fallbackModel, "overloaded", error);
            }
            if (!env.IS_SANDBOX && !retryWatchdogEnv()) {
              logEvent("tengu_api_custom_529_overloaded_error", {});
              logFeatureBad("api_request", "api_request_overload_repeated");
              throw new CannotRetryError(
                Error(REPEATED_529_MESSAGE, {
                  cause: error,
                }),
                retryContext,
              );
            }
          }
        }
        let persistentCapacityRetry = retryWatchdogEnv() && isCapacityError(error);
        let sleptThroughRetry =
          error instanceof APIConnectionError &&
          isStreamSuspendedError(error) &&
          (options.modelCallRetries?.sleptThroughLeft() ?? 0) > 0;
        let overflowData = isNetworkDownError(error);
        if (overflowData && (options.modelCallRetries?.reconnectsLeft() ?? 0) > 0) maxAttempts++;
        if (attempt > maxAttempts && !persistentCapacityRetry && !sleptThroughRetry) {
          let errorKind =
            !(error instanceof APIError && error.status === 401) ||
            clientOAuthAccessToken !== undefined ||
            withoutHostManagedProviderVars() ||
            isApiKeyHelperAuthError(error) ||
            (!getAnthropicApiKey() && shouldUseWIFAuth());
          if (
            !isAuthRetryableError(error, retryContext.model) ||
            !errorKind ||
            options.modelCallRetries?.takeCredentialRenewal() !== true
          ) {
            logFeatureBad("api_request", "api_request_retry_exhausted");
            throw new CannotRetryError(error, retryContext);
          }
          attempt--;
        }
        if (isRemoteAuthError(error)) {
          if (remoteAuthRetries >= MAX_REMOTE_AUTH_RETRIES) {
            logFeatureBad("api_request", "api_request_ccr_auth_exhausted");
            throw new CannotRetryError(error, retryContext);
          }
          remoteAuthRetries++;
        }
        let cloudAuthRetriesLeft;
        let cloudCredentialProvider = getCloudCredentialErrorProvider(error);
        if (
          awsSignInFailures() > awsSignInFailuresBefore &&
          (cloudCredentialProvider === "AWS" ||
            (!withoutHostManagedProviderVars() && isAwsAuthError(error, retryContext.model)))
        ) {
          logFeatureBad("api_request", "api_request_aws_sign_in_failed");
          throw new CannotRetryError(error, retryContext);
        }
        if (
          cloudCredentialProvider === "AWS" ||
          (!withoutHostManagedProviderVars() && isAwsProvider401(error, retryContext.model))
        ) {
          if (awsAuthRetries >= MAX_AWS_AUTH_RETRIES) {
            logFeatureBad("api_request", "api_request_aws_auth_exhausted");
            throw new CannotRetryError(error, retryContext);
          }
          awsAuthRetries++;
          cloudAuthRetriesLeft = MAX_AWS_AUTH_RETRIES - awsAuthRetries;
        }
        if (
          cloudCredentialProvider === "Google Cloud" ||
          (!withoutHostManagedProviderVars() && isGoogleCloudAuthError(error))
        ) {
          if (gcpSignInFailures() > gcpSignInFailuresBefore) {
            logFeatureBad("api_request", "api_request_gcp_sign_in_failed");
            throw new CannotRetryError(error, retryContext);
          }
          if (gcpAuthRetries >= MAX_GCP_AUTH_RETRIES) {
            logFeatureBad("api_request", "api_request_gcp_auth_exhausted");
            throw new CannotRetryError(error, retryContext);
          }
          gcpAuthRetries++;
          cloudAuthRetriesLeft = MAX_GCP_AUTH_RETRIES - gcpAuthRetries;
        }
        if (
          error instanceof APIError &&
          (error.status === 401 || error.status === 403) &&
          isFirstPartyProvider() &&
          isApiKeyHelperTheActiveCredential() &&
          getApiKeyHelperLastFailure() !== null
        ) {
          if (apiKeyHelperRetries >= MAX_API_KEY_HELPER_RETRIES) {
            logFeatureBad("api_request", "api_request_api_key_helper_failed");
            throw new CannotRetryError(error, retryContext);
          }
          apiKeyHelperRetries++;
        }
        if (isApiKeyHelperAuthError_2) {
          if (apiKeyHelperAuthRetries === API_KEY_HELPER_FAST_RETRIES)
            logFeatureSad("api_request", "api_request_api_key_helper_auth_exhausted");
          apiKeyHelperAuthRetries++;
        }
        if (error instanceof WorkloadIdentityError && error.statusCode === 401) {
          if (wifExchangeRetries >= MAX_WIF_EXCHANGE_RETRIES) {
            logFeatureBad("api_request", "api_request_wif_exchange_401");
            throw new CannotRetryError(error, retryContext);
          }
          wifExchangeRetries++;
        }
        let wifExchangeAttempt =
          clearAwsCredentialCacheOnAuthError(error, retryContext.model) ||
          clearGcpCredentialCacheOnAuthError(error) ||
          (await invalidateWifTokenOnError(error));
        let providerForModel = getProviderForModel(retryContext.model);
        if (
          wifExchangeAttempt &&
          error instanceof APIError &&
          error.status === 401 &&
          !effectiveAuthTokenEnv() &&
          ((providerForModel === "vertex" && env.CLAUDE_CODE_SKIP_VERTEX_AUTH) ||
            (providerForModel === "anthropicGoogleCloud" &&
              env.CLAUDE_CODE_SKIP_ANTHROPIC_GOOGLE_CLOUD_AUTH) ||
            (providerForModel === "anthropicAws" && env.CLAUDE_CODE_SKIP_ANTHROPIC_AWS_AUTH) ||
            (providerForModel === "mantle" && env.CLAUDE_CODE_SKIP_MANTLE_AUTH))
        )
          clearApiKeyHelperCache();
        if (!wifExchangeAttempt && (!(error instanceof APIError) || !shouldRetry(error))) {
          let nonFallback =
            error instanceof APIError &&
            ((error.status !== undefined &&
              NON_RETRYABLE_STATUS_CODES.has(error.status) &&
              !(error.status === 404 && options.isNonStreamingRequest)) ||
              error.type === "billing_error" ||
              (options.isResumePrefillRequest === true &&
                error.status !== undefined &&
                isNonRetryable4xx(error.status)) ||
              NON_FALLBACK_ERROR_PREDICATES.some((predicate) => predicate(error)));
          if (
            error instanceof APIError &&
            error.status !== undefined &&
            !nonFallback &&
            options.fallbackModel &&
            options.fallbackModel !== options.model
          ) {
            logEvent("tengu_api_fallback_last_resort", {
              status: error.status,
              errorType: fromEnum(normalizeApiErrorTypeDiag(error.type)),
              provider: getAPIProviderForAnalytics(),
              fastMode: retryContext.fastMode ?? false,
            });
            logFeatureSad("api_request", "api_request_last_resort_fallback");
            throw new FallbackTriggeredError(
              options.model,
              options.fallbackModel,
              error.status === 404 && isNotFoundErrorType(error) ? "model_not_found" : "last_resort",
              error,
            );
          }
          logFeatureBad(
            "api_request",
            error instanceof OAuthAccountOnHoldError || getWIFAccountOnHold(error) !== null
              ? "api_request_account_on_hold"
              : error instanceof OAuthRefreshLockTimeoutError
                ? "api_request_oauth_refresh_lock_timeout"
                : "api_request_non_retryable",
          );
          throw new CannotRetryError(error, retryContext);
        }
        if (error instanceof APIError) {
          let maxTokensContextOverflowError = parseMaxTokensContextOverflowError(error);
          if (maxTokensContextOverflowError) {
            let { inputTokens, contextLimit } = maxTokensContextOverflowError;
            let safetyBuffer = 1000;
            let availableContext = Math.max(0, contextLimit - inputTokens - 1000);
            if (availableContext < FLOOR_OUTPUT_TOKENS) {
              logError(
                Error(
                  `availableContext ${availableContext} is less than FLOOR_OUTPUT_TOKENS ${FLOOR_OUTPUT_TOKENS}`,
                ),
              );
              throw error;
            }
            let contextBefore = availableContext;
            if (
              retryContext.maxTokensOverride !== undefined &&
              contextBefore >= retryContext.maxTokensOverride
            ) {
              logError(Error("max_tokens overflow adjustment made no progress"));
              throw error;
            }
            retryContext.maxTokensOverride = contextBefore;
            logEvent("tengu_max_tokens_context_overflow_adjustment", {
              inputTokens,
              contextLimit,
              adjustedMaxTokens: contextBefore,
              attempt,
            });
            continue;
          }
        }
        let retryAfterHeader = getRetryAfter(error);
        let delayMs;
        let isPersistentWait = persistentCapacityRetry;
        let usageLimitError = null;
        if (persistentCapacityRetry) {
          let waitBudgetMs = (env.CLAUDE_CODE_RETRY_WATCHDOG_MAX_WAIT_MS ?? 1 / 0) - capacityWait.spentMs;
          if (waitBudgetMs <= 0) {
            logFeatureBad("api_request", "api_request_capacity_wait_exhausted");
            throw new CannotRetryError(error, retryContext);
          }
          persistentRetryCount++;
          let rateLimitType = null;
          if (error instanceof APIError && error.status === 429) {
            rateLimitType = getRateLimitResetDelayMs(error, clock);
            if (
              rateLimitType !== null &&
              error.headers?.get?.("anthropic-ratelimit-unified-status") === "rejected"
            ) {
              let retryDelay =
                (env.CLAUDE_CODE_RETRY_WATCHDOG_MAX_USAGE_LIMIT_WAIT_MS ?? 1 / 0) -
                capacityWait.usageLimitSpentMs;
              if (rateLimitType > retryDelay) {
                let overageStatus = error.headers?.get(OVERAGE_STATUS_HEADER);
                let overageAllowed = overageStatus === "allowed" || overageStatus === "allowed_warning";
                if (
                  retryDelay <= 0 ||
                  (!overageAllowed && error.headers?.get(OVERAGE_DISABLED_REASON_HEADER) !== "fetch_error")
                ) {
                  logFeatureBad("api_request", "api_request_usage_limit_wait_too_long");
                  throw new CannotRetryError(error, retryContext);
                }
                rateLimitType = overageAllowed
                  ? Math.min(
                      retryDelay,
                      getRetryDelay(
                        persistentRetryCount,
                        null,
                        PERSISTENT_RETRY_MAX_DELAY_MS,
                        options.random,
                      ),
                    )
                  : retryDelay;
              }
              usageLimitError = error;
            }
          }
          delayMs = Math.min(
            rateLimitType ??
              getRetryDelay(
                persistentRetryCount,
                retryAfterHeader,
                PERSISTENT_RETRY_MAX_DELAY_MS,
                options.random,
              ),
            PERSISTENT_WAIT_CAP_MS,
          );
          delayMs = Math.min(delayMs, waitBudgetMs);
        } else if (isRemoteAuthError(error)) delayMs = AUTH_RETRY_DELAY_MS;
        else if (apiKeyHelperFastRetry) delayMs = API_KEY_HELPER_RETRY_DELAY_MS;
        else {
          let retryAfter = is529Error(error);
          let overloadedCap = retryAfter ? env.CLAUDE_CODE_OVERLOADED_RETRY_MAX_DELAY_MS : undefined;
          delayMs = getRetryDelay(
            attempt + persistentRetryCount,
            retryAfterHeader,
            overloadedCap,
            options.random,
            retryAfter ? env.CLAUDE_CODE_OVERLOADED_RETRY_BASE_DELAY_MS : undefined,
          );
          if (isRetryWatchdogOn()) {
            delayMs = Math.min(delayMs, PERSISTENT_WAIT_CAP_MS);
            isPersistentWait = true;
          } else if (
            delayMs >
            Math.max(MAX_RETRY_AFTER_WAIT_MS, Math.ceil((overloadedCap ?? 0) * (1 + RETRY_JITTER_RATIO)))
          ) {
            logEvent("tengu_api_retry_after_too_long", {
              delayMs,
              status: error.status,
              provider: getAPIProviderForAnalytics(),
            });
            logFeatureBad("api_request", "api_request_retry_after_too_long");
            throw new CannotRetryError(error, retryContext);
          }
        }
        if (
          unregisterReconnectExitHook === undefined &&
          attempt > maxRetries &&
          !persistentCapacityRetry &&
          !sleptThroughRetry
        ) {
          reconnectingAfterExhaust = true;
          unregisterReconnectExitHook = registerCleanup(() => {
            reconnectingAfterExhaust = false;
            return logFeatureSadAsync("api_reconnect", "process_exit");
          });
        }
        let attemptForTelemetry = persistentCapacityRetry
          ? persistentRetryCount
          : sleptThroughRetry
            ? Math.max(1, Math.min(attempt, maxAttempts))
            : attempt;
        let resetDelay = classifyAPIError(error);
        options.modelCallRetries?.reportHttpFailure(error, "retry");
        logEvent("tengu_api_retry", {
          attempt: attemptForTelemetry,
          delayMs,
          error: formatApiErrorType(resetDelay, error instanceof APIError ? error.status : undefined),
          errorType: fromEnum(resetDelay),
          ...errorTelemetryFields(error),
          status: error.status,
          provider: getAPIProviderForAnalytics(),
          attempt_duration_ms: clock.now() - attemptStartMs,
        });
        logForDiagnosticsNoPII("warn", "cli_api_retry", () => ({
          ...classifyApiErrorKind(error, resetDelay),
          attempt: attemptForTelemetry,
          delay_ms: delayMs,
          attempt_duration_ms: clock.now() - attemptStartMs,
          model: telemetrySafeModelName(options.model) ?? null,
          query_source_category: classifyQuerySource(options.querySource) ?? null,
        }));
        if (isPersistentWait && delayMs > 60000)
          logEvent("tengu_api_persistent_retry_wait", {
            status: error.status,
            delayMs,
            attempt: attemptForTelemetry,
            provider: getAPIProviderForAnalytics(),
          });
        let quotaWindowWaitCleanup = undefined;
        if (usageLimitError && !options.signal?.aborted)
          try {
            quotaWindowWaitCleanup = options.onQuotaWindowWait?.(usageLimitError, {
              retryAtMs: clock.now() + delayMs,
              attempt: attemptForTelemetry,
              maxRetries: maxAttempts,
            });
          } catch (error) {
            logError(error);
          }
        let dispose = () => {
          options.signal?.removeEventListener("abort", dispose);
          try {
            quotaWindowWaitCleanup?.();
          } catch (error) {
            logError(error);
          }
          quotaWindowWaitCleanup = undefined;
        };
        if (quotaWindowWaitCleanup)
          options.signal?.addEventListener("abort", dispose, {
            once: true,
          });
        using disposable = {
          [Symbol.dispose]: dispose,
        };
        let waitChunkMs = isPersistentWait ? PERSISTENT_WAIT_CHUNK_MS : delayMs;
        let fastRetry = apiKeyHelperFastRetry && !isPersistentWait;
        let usageLimitRecheckMs =
          usageLimitError && options.isUsageLimitLifted
            ? env.CLAUDE_CODE_RETRY_WATCHDOG_USAGE_LIMIT_RECHECK_MS
            : undefined;
        if (usageLimitError && usageLimitLiftedLastCheck) {
          usageLimitRecheckCount++;
          usageLimitLiftedLastCheck = false;
        }
        let usageLimitRecheckCap = usageLimitRecheckMs === undefined ? 1 / 0 : 0;
        let usageLimitWaits = 0;
        let remainingWaitMs = delayMs;
        while (remainingWaitMs > 0) {
          if (usageLimitRecheckMs !== undefined && usageLimitRecheckCap <= 0)
            usageLimitRecheckCap = getRetryDelay(
              1 + usageLimitRecheckCount,
              null,
              PERSISTENT_WAIT_CAP_MS / 2,
              options.random,
              usageLimitRecheckMs,
            );
          if (isPersistentWait && options.signal?.aborted) throw new APIUserAbortError();
          let baseMs = toRetryStatusError(error, retryContext.model);
          if (fastRetry && retryStatusShown) {
            options.onRetryStatus?.(null);
            retryStatusShown = false;
          }
          if (baseMs && !fastRetry) {
            retryStatusShown = true;
            let displayMax2 = clampRetryDisplayMax(
              baseMs,
              attempt,
              (sleptThroughRetry ? Math.max(1, maxAttempts) : maxAttempts) +
                (overflowData ? (options.modelCallRetries?.reconnectsLeft() ?? 0) : 0),
              noResponseRetryLedger.count,
              cloudAuthRetriesLeft ?? timeoutRetry,
            );
            options.onRetryStatus?.({
              kind: "retrying",
              error: baseMs,
              attempt: attemptForTelemetry,
              maxRetries: displayMax2,
              retryInMs: remainingWaitMs,
              deadline: clock.now() + remainingWaitMs,
            });
            yield createSystemAPIErrorMessage(
              baseMs,
              remainingWaitMs,
              attemptForTelemetry,
              displayMax2,
              "request_retry",
            );
          }
          let chunk = Math.min(remainingWaitMs, waitChunkMs);
          let min = Math.min(chunk, usageLimitWaits);
          usageLimitWaits = 0;
          let waitStartedAt = clock.monotonicNow();
          let woke = await sleepOrWake(chunk - min, options);
          if (persistentCapacityRetry) {
            let wokenResult = woke
              ? Math.min(chunk, min + Math.round(clock.monotonicNow() - waitStartedAt))
              : chunk;
            capacityWait.spentMs += wokenResult;
            if (usageLimitError) capacityWait.usageLimitSpentMs += wokenResult;
          }
          if (woke) break;
          remainingWaitMs -= chunk;
          usageLimitRecheckCap -= chunk;
          if (
            usageLimitRecheckCap <= 0 &&
            remainingWaitMs > waitChunkMs &&
            usageLimitError &&
            options.isUsageLimitLifted
          ) {
            let retryStatusCleared = false;
            let unsubscribe = options.subscribeRetryWake?.(() => {
              retryStatusCleared = true;
            });
            let wokeAt = clock.monotonicNow();
            let aborted = false;
            try {
              aborted = await options.isUsageLimitLifted(usageLimitError);
            } catch (error) {
              logError(error);
            } finally {
              unsubscribe?.();
            }
            usageLimitLiftedLastCheck = aborted;
            if (aborted || retryStatusCleared) break;
            usageLimitWaits = Math.max(0, Math.round(clock.monotonicNow() - wokeAt));
          }
        }
        if (persistentCapacityRetry || sleptThroughRetry) attempt--;
      }
    }
    logFeatureBad("api_request", "api_request_retry_exhausted");
    throw new CannotRetryError(lastError, retryContext);
  } catch (error) {
    if (reconnectingAfterExhaust && !options.signal?.aborted) {
      if (error instanceof FallbackTriggeredError) logFeatureSad("api_reconnect", "fallback_triggered");
      else
        logFeatureBad(
          "api_reconnect",
          error instanceof CannotRetryError && isNetworkDownError(error.originalError)
            ? "still_down"
            : "other_failure",
        );
      reconnectingAfterExhaust = false;
    }
    throw error;
  } finally {
    unregisterReconnectExitHook?.();
    if (reconnectingAfterExhaust) logFeatureSad("api_reconnect", "aborted");
    if (retryStatusShown) options.onRetryStatus?.(null);
  }
}
//@ chunk-5xgkngpb.js:2693320-2693745 layout
/**
 * 等待指定毫秒，可被 subscribeRetryWake 提前唤醒（返回 true）；中止时抛 AbortError。
 */
async function sleepOrWake(delayMs, options) {
  let clock = options.clock ?? systemClock;
  if (!options.subscribeRetryWake) {
    await sleep(delayMs, options.signal, {
      abortError: createRetryAbortError,
      clock,
    });
    return false;
  }
  if (options.signal?.aborted) throw createRetryAbortError();
  let woken = false;
  let abortController = new AbortController();
  let unsubscribe = options.subscribeRetryWake(() => {
    woken = true;
    abortController.abort();
  });
  let abort = () => abortController.abort();
  options.signal?.addEventListener("abort", abort, {
    once: true,
  });
  try {
    await sleep(delayMs, abortController.signal, {
      clock,
    });
    if (options.signal?.aborted) throw createRetryAbortError();
    return woken;
  } finally {
    unsubscribe();
    options.signal?.removeEventListener("abort", abort);
  }
}
//@ chunk-5xgkngpb.js:2693745-2693855 layout (2.1.88 match: getRetryAfter, 0.832)
/**
 * 取 API 错误响应头 retry-after 原始值。
 */
function getRetryAfter(error) {
  return (
    (error.headers?.["retry-after"] || error.headers?.get?.("retry-after")) ??
    findRouteTurnError(error)?.retryAfter ??
    null
  );
}
//@ chunk-5xgkngpb.js:2693855-2694329 fingerprint (2.1.88 match: parseMaxTokensContextOverflowError, 0.817)
/**
 * 解析 400 "input length and `max_tokens` exceed context limit: a + b > c"，返回 {inputTokens,maxTokens,contextLimit}。
 */
function parseMaxTokensContextOverflowError(error) {
  if (error.status !== 400 || !error.message) return;
  if (!isMaxTokensContextOverflow(error)) return;
  let regex = /input length and `max_tokens` exceed context limit: (\d+) \+ (\d+) > (\d+)/;
  let match = error.message.match(regex);
  if (!match || match.length !== 4) return;
  if (!match[1] || !match[2] || !match[3]) {
    logError(Error("Unable to parse max_tokens from max_tokens exceed context limit error message"));
    return;
  }
  let inputTokens = parseInt(match[1], 10);
  let maxTokens = parseInt(match[2], 10);
  let contextLimit = parseInt(match[3], 10);
  if (isNaN(inputTokens) || isNaN(maxTokens) || isNaN(contextLimit)) return;
  return {
    inputTokens,
    maxTokens,
    contextLimit,
  };
}
//@ chunk-5xgkngpb.js:2694329-2694453 fingerprint (2.1.88 match: isFastModeNotEnabledError, 1)
/**
 * 400 "Fast mode is not enabled"。
 */
function isFastModeNotEnabledError(error) {
  if (!(error instanceof APIError)) return false;
  return error.status === 400 && (error.message?.includes("Fast mode is not enabled") ?? false);
}
//@ chunk-5xgkngpb.js:2694453-2694663 layout
/**
 * 400 "'<model>' does not support the `speed` parameter" 且模型与当前模型同族。
 */
function isSpeedParameterUnsupportedError(error, model) {
  if (!(error instanceof APIError) || error.status !== 400) return false;
  try {
    let paramName = error.message?.match(/'([^']+)' does not support the `speed` parameter/)?.[1];
    return paramName !== undefined && strippedCanonicalName(paramName) === strippedCanonicalName(model);
  } catch (error) {
    logError(toError(error));
    return false;
  }
}
//@ chunk-5xgkngpb.js:2694663-2694766 layout
/**
 * 5xx 但不是 529。
 */
function isNon529ServerError(error) {
  return (
    error instanceof APIError &&
    error.status !== undefined &&
    error.status >= 500 &&
    error.status < 600 &&
    error.status !== 529
  );
}
//@ chunk-5xgkngpb.js:2694766-2695028 layout
/**
 * 取当前 AWS 凭证的 accessKeyId（跳过 bearer token/跳过认证/无缓存场景），用于判断凭证是否变化。
 */
async function getAwsAccessKeyId(signal) {
  if (
    env.AWS_BEARER_TOKEN_BEDROCK ||
    env.CLAUDE_CODE_SKIP_BEDROCK_AUTH ||
    env.CLAUDE_CODE_SKIP_AWS_CRED_CACHE ||
    isHostManagedProviderAuth()
  )
    return;
  try {
    let creds = await refreshAndGetAwsCredentials(signal);
    if (creds) return creds.accessKeyId;
    if (signal?.aborted) return;
    return (await (await getDefaultAwsProviderChain(getAwsRegionSync()))()).accessKeyId;
  } catch {
    return;
  }
}
//@ chunk-5xgkngpb.js:2695028-2695114 layout
/**
 * fallbackModel 或可用的 accessFallbackModel，且不同于当前模型。
 */
function getAvailableFallbackModel(options) {
  let fallback = options.fallbackModel ?? getAccessFallbackModel(options);
  return fallback !== undefined && fallback !== options.model ? fallback : undefined;
}
//@ chunk-5xgkngpb.js:2695114-2695229 layout
/**
 * accessFallbackModel 在允许、可用且（无工具辅助请求或支持）时返回。
 */
function getAccessFallbackModel({ accessFallbackModel, toolFreeHelper }) {
  return accessFallbackModel !== undefined &&
    !isModelFallbackDisabled() &&
    isModelAllowed(accessFallbackModel) &&
    (toolFreeHelper === true || supportsAutoModeIfActive(accessFallbackModel))
    ? accessFallbackModel
    : undefined;
}
//@ chunk-5xgkngpb.js:2695229-2695404 fingerprint (2.1.88 match: isBedrockAuthError, 0.49)
/**
 * Bedrock/anthropicAws/mantle 下的 AWS 凭证错误或 403，或 isAwsProvider401。旧版名 isBedrockAuthError 近似。
 */
function isAwsAuthError(error, authError) {
  if (env.CLAUDE_CODE_USE_BEDROCK || env.CLAUDE_CODE_USE_ANTHROPIC_AWS || env.CLAUDE_CODE_USE_MANTLE) {
    if (isAwsCredentialsProviderError(error) || (error instanceof APIError && error.status === 403))
      return true;
  }
  return isAwsProvider401(error, authError);
}
//@ chunk-5xgkngpb.js:2695404-2695521 layout
/**
 * anthropicAws/mantle 端点上的 401。
 */
function isAwsProvider401(error, providerError) {
  if (!(error instanceof APIError) || error.status !== 401) return false;
  let providerForModel = getProviderForModel(providerError);
  return providerForModel === "anthropicAws" || providerForModel === "mantle";
}
//@ chunk-5xgkngpb.js:2695521-2695639 layout
/**
 * AWS 凭证错误（SDK 错误、401、x-amzn-errortype 指示过期）。
 */
function isAwsCredentialExpiredError(error, message) {
  return (
    isAwsCredentialsProviderError(error) ||
    isAwsProvider401(error, message) ||
    (error instanceof APIError &&
      isAwsCredentialError(error.headers?.get("x-amzn-errortype") ?? undefined, error.message))
  );
}
//@ chunk-5xgkngpb.js:2695639-2695757 layout
/**
 * 重试提示里的"最大次数"：无响应时受 noResponse 账本限制。
 */
function clampRetryDisplayMax(baseMs, attempt, displayMax, count, attemptCount) {
  let current = displayMax;
  if (baseMs.noResponse && !isRetryWatchdogOn())
    current = Math.min(current, attempt + MAX_NO_RESPONSE_RETRIES - count);
  if (attemptCount !== undefined) current = Math.min(current, attempt + attemptCount);
  return current;
}
//@ chunk-5xgkngpb.js:2695757-2696026 layout
/**
 * 把错误转成重试状态展示对象（formatted、rateLimits、noResponse 等）；云凭证错误标 isCloudCredentialError。
 */
function toRetryStatusError(error, model) {
  let quotaInfo =
    error instanceof APIError
      ? summarizeApiError(error)
      : isAwsCredentialExpiredError(error, model) ||
          isGoogleCloudAuthError(error) ||
          error instanceof WorkloadIdentityError
        ? {
            message: errorMessage(error),
            status: undefined,
            requestId: undefined,
            formatted: errorMessage(error),
            connection: null,
            isNetworkDown: false,
            rateLimits: null,
            noResponse: null,
          }
        : null;
  return quotaInfo && getCloudCredentialErrorProvider(error) !== null
    ? {
        ...quotaInfo,
        isCloudCredentialError: true,
      }
    : quotaInfo;
}
//@ chunk-5xgkngpb.js:2696026-2696115 layout
/**
 * AWS 认证错误时清 AWS 凭证缓存，返回是否处理。
 */
function clearAwsCredentialCacheOnAuthError(error, model) {
  if (!isAwsAuthError(error, model)) return false;
  if (isAwsCredentialExpiredError(error, model)) clearAwsCredentialsCache();
  else {
    clearAwsHelperCredentialsCache();
    invalidateDefaultAwsProviderChainDebounced(getAwsRegionSync());
  }
  return true;
}
//@ chunk-5xgkngpb.js:2696115-2696165 layout
/**
 * Google Cloud 认证错误时清凭证缓存。
 */
function clearGcpCredentialCacheOnAuthError(error) {
  if (isGoogleCloudAuthError(error)) {
    markGcpCredentialsRejected();
    return true;
  }
  return false;
}
//@ chunk-5xgkngpb.js:2696165-2696417 layout
/**
 * 工作负载身份联合（WIF）交换出错（无状态码/401/5xx）时让令牌失效以便重试。
 */
async function invalidateWifTokenOnError(error) {
  if (
    error instanceof WorkloadIdentityError &&
    !isWIFUserOAuthDeadError(error) &&
    getWIFAccountOnHold(error) === null &&
    (error.statusCode === null || error.statusCode === 401 || error.statusCode >= 500)
  ) {
    let cache = await getWIFTokenCache().catch(() => null);
    if (cache === null) return false;
    if (getErrnoCode(error.cause) === "ELOCKED") return true;
    cache.invalidate();
    return true;
  }
  return false;
}
//@ chunk-5xgkngpb.js:2696417-2696536 fingerprint (2.1.88 match: shouldRetry, 0.473)
/**
 * 响应头 x-should-retry: false。旧版名 shouldRetry 语义相反。
 */
function isShouldRetryFalse(error) {
  if (error.headers?.get("x-should-retry") !== "false") return false;
  let is5xxError = error.status !== undefined && error.status >= 500;
  return true;
}
//@ chunk-5xgkngpb.js:2696536-2697975 layout
/**
 * 判断错误是否可重试：额度/用量上限（credits_required、spend cap）不重试；x-should-retry=false 尊重；持久重试下 429/529 重试；远程 401/403、API key helper、overloaded、上下文溢出、OAuth 401/吊销、代理 407、x-should-retry=true、网络错误（非 SSL）、408/409/429（非订阅或企业）、5xx 重试。旧版同名。
 */
function shouldRetry(error) {
  if (isMockRateLimit429(error)) return false;
  if (
    error.status === 429 &&
    (error.error?.error?.details?.error_code === "credits_required" ||
      error.message?.toLowerCase().includes("usage credits are required") ||
      error.message?.toLowerCase().includes("extra usage is required"))
  ) {
    let reason = error.headers?.get("anthropic-ratelimit-unified-overage-disabled-reason");
    if (reason !== "fetch_error" && reason !== "org_level_disabled_until") return false;
  }
  if (isSpendLimitError(error)) return false;
  if (
    isCapacityError(error) &&
    error.headers?.get("x-should-retry") === "false" &&
    (error.status === 429 || error.status === 529 || (error.status === 503 && isFirstPartyApiBackend())) &&
    error.headers?.get(OVERAGE_DISABLED_REASON_HEADER) !== "fetch_error" &&
    (retryWatchdogEnv() || isShouldRetryFalse(error))
  )
    return false;
  if (retryWatchdogEnv() && isCapacityError(error)) return true;
  if (isRemoteAuthError(error)) return true;
  if (isApiKeyHelperAuthError(error)) {
    clearApiKeyHelperCache();
    return true;
  }
  if (error.message?.includes('"type":"overloaded_error"')) return true;
  if (parseMaxTokensContextOverflowError(error)) return true;
  if (
    isAnthropicAuthEnabled() &&
    getClaudeAIOAuthTokens()?.accessToken &&
    (error.status === 401 || isOAuthTokenRevokedError(error))
  )
    return true;
  if (
    !getAnthropicApiKey() &&
    shouldUseWIFAuth() &&
    (error.status === 401 || isOAuthTokenRevokedError(error))
  )
    return true;
  if (withoutHostManagedProviderVars() && (error.status === 401 || isOAuthTokenRevokedError(error)))
    return true;
  let needsAuth = proxyAuthRequired(error);
  if (needsAuth !== undefined) {
    if (!getConfiguredProxyAuthHelper()) return false;
    clearProxyAuthHelperCache(needsAuth.proxyAuthenticate);
    return true;
  }
  if (
    error.headers?.get("x-should-retry") === "true" &&
    (!isClaudeAISubscriber() || isEnterpriseSubscriber() || isRateLimitWithoutQuotaInfo(error))
  )
    return true;
  if (isShouldRetryFalse(error)) return false;
  if (error instanceof APIConnectionError) {
    let connectionErrorDetails = extractConnectionErrorDetails(error);
    if (connectionErrorDetails && SSL_CERT_ERROR_CODES.has(connectionErrorDetails.code)) return false;
    if (connectionErrorDetails?.code === "BedrockUnexpectedContentType") return false;
    if (connectionErrorDetails?.code === "TestEgressBlocked") return false;
    return true;
  }
  if (!error.status) return false;
  if (error.status === 408) return true;
  if (error.status === 409) return true;
  if (error.status === 401) {
    clearApiKeyHelperCache();
    return true;
  }
  if (isOAuthTokenRevokedError(error)) return true;
  if (error.status === 429)
    return !isClaudeAISubscriber() || isEnterpriseSubscriber() || isRateLimitWithoutQuotaInfo(error);
  if (error.status && error.status >= 500) return true;
  return false;
}
//@ chunk-5xgkngpb.js:2697975-2698046 layout
/**
 * 429 且不是订阅额度用尽（无 overage-disabled-reason 头）。
 */
function isRateLimitWithoutQuotaInfo(error) {
  return (
    error.status === 429 &&
    !hasUnifiedRateLimitHeaders(error) &&
    !error.headers?.get?.(OVERAGE_DISABLED_REASON_HEADER)
  );
}
//@ chunk-5xgkngpb.js:2698046-2698262 layout
/**
 * 组织消费上限类 overage 禁用原因；cyn 加上 out_of_credits 等。
 */
var SPEND_CAP_REASONS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var OVERAGE_EXHAUSTED_REASONS;
var OVERAGE_DISABLED_REASON_REGEX;
deferInit("chunk-5xgkngpb.js:2698046", () => {
  SPEND_CAP_REASONS = new Set(["org_spend_cap_reached", "org_level_disabled_until"]);
  OVERAGE_EXHAUSTED_REASONS = new Set([
    ...SPEND_CAP_REASONS,
    "out_of_credits",
    "org_level_disabled",
    "org_service_level_disabled",
  ]);
  OVERAGE_DISABLED_REASON_REGEX = /\\?"overageDisabledReason\\?":\s*\\?"([a-z_]+)\\?"/;
});
//@ chunk-5xgkngpb.js:2698262-2698549 layout
/**
 * 429 且是服务/组织消费上限或额度耗尽（头或消息体 overageDisabledReason）。
 */
function isSpendLimitError(error) {
  if (error.status !== 429) return false;
  if (error.message.includes("service_spend_limit_reached")) return true;
  let reasonHeader = error.headers?.get?.(OVERAGE_DISABLED_REASON_HEADER);
  if (
    reasonHeader &&
    (SPEND_CAP_REASONS.has(reasonHeader) ||
      (!hasUnifiedRateLimitHeaders(error) && OVERAGE_EXHAUSTED_REASONS.has(reasonHeader)))
  )
    return true;
  let mentionsLimit = error.message.includes("exceeded_limit")
    ? OVERAGE_DISABLED_REASON_REGEX.exec(error.message)?.[1]
    : undefined;
  return mentionsLimit !== undefined && OVERAGE_EXHAUSTED_REASONS.has(mentionsLimit);
}
//@ chunk-5xgkngpb.js:2698549-2698784 layout
/**
 * CLAUDE_CODE_MAX_RETRIES（非持久模式上限 15），默认 10；持久重试模式默认 300。
 */
function getMaxRetriesFromEnv() {
  let watchdogOn = isRetryWatchdogOn();
  let CLAUDE_CODE_MAX_RETRIES = env.CLAUDE_CODE_MAX_RETRIES;
  if (CLAUDE_CODE_MAX_RETRIES !== undefined && CLAUDE_CODE_MAX_RETRIES >= 0) {
    if (CLAUDE_CODE_MAX_RETRIES > MAX_RETRIES_CAP && !watchdogOn) {
      if (streamFallbackWarning().once("max_retries_clamp_warning"))
        logForDebugging(`CLAUDE_CODE_MAX_RETRIES=${CLAUDE_CODE_MAX_RETRIES} clamped to ${MAX_RETRIES_CAP}`, {
          level: "warn",
        });
      return MAX_RETRIES_CAP;
    }
    return CLAUDE_CODE_MAX_RETRIES;
  }
  return watchdogOn ? UNATTENDED_MAX_RETRIES : DEFAULT_MAX_RETRIES;
}
//@ chunk-5xgkngpb.js:2698784-2698827 layout
/**
 * options.maxRetries 或 getMaxRetriesFromEnv()。
 */
function resolveMaxRetries(options) {
  return options.maxRetries ?? getMaxRetriesFromEnv();
}
//@ chunk-5xgkngpb.js:2698827-2698864 layout
/**
 * 快速模式 429/529 冷却：缺 retry-after 时 30 分钟；短等待阈值 20 秒；最短冷却 10 分钟。
 */
var FAST_MODE_DEFAULT_COOLDOWN_MS = 1800000;
var FAST_MODE_SHORT_RETRY_THRESHOLD_MS = 20000;
var FAST_MODE_MIN_COOLDOWN_MS = 600000;
//@ chunk-5xgkngpb.js:2698864-2698959 layout
/**
 * retry-after 头（秒）转毫秒。
 */
function getRetryAfterMs(error) {
  let retryAfter = getRetryAfter(error);
  if (retryAfter) {
    let seconds = parseInt(retryAfter, 10);
    if (!isNaN(seconds)) return seconds * 1000;
  }
  return null;
}
//@ chunk-5xgkngpb.js:2698959-2699157 fingerprint (2.1.88 match: getRateLimitResetDelayMs, 1)
/**
 * 429 时按 anthropic-ratelimit-unified-reset 计算距重置的毫秒数（持久重试等额度窗口用）。
 */
function getRateLimitResetDelayMs(error, clock) {
  let resetHeader = error.headers?.get?.("anthropic-ratelimit-unified-reset");
  if (!resetHeader) return null;
  let resetUnixSec = Number(resetHeader);
  if (!Number.isFinite(resetUnixSec)) return null;
  let delayMs = Math.round(resetUnixSec * 1000 - clock.now());
  return delayMs > 0 ? delayMs : null;
}
//@ chunk-5xgkngpb.js:2699157-2699199 layout
var TENGU_GLITTERY_TOWER_KILLSWITCH = "tengu_glittery_tower_killswitch";
//@ chunk-5xgkngpb.js:2699199-2699236 layout
function isGraceResendKillswitchOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_GLITTERY_TOWER_KILLSWITCH, false) === true;
}
//@ chunk-5xgkngpb.js:2699236-2699908 layout
class GraceResend {
  #e = "none";
  #t;
  constructor(enabled) {
    this.#t = enabled;
  }
  get asks() {
    return this.#e !== "none";
  }
  takeAfter(error, isAllowed) {
    try {
      if (
        !this.#t ||
        !(error instanceof APIError) ||
        error.status !== 429 ||
        error.headers?.get?.("anthropic-ratelimit-unified-status") !== "rejected"
      )
        return false;
      if (this.#e !== "none") {
        if (this.#e === "sent") {
          this.#e = "settled";
          logFeatureBad("usage_limit_grace_resend", "refused_again");
        }
        return false;
      }
      let claim = error.headers?.get?.(REPRESENTATIVE_CLAIM_HEADER);
      let overageDisabledReason = error.headers?.get?.(OVERAGE_DISABLED_REASON_HEADER) ?? null;
      if (
        (claim !== "five_hour" && claim !== "seven_day") ||
        overageDisabledReason === null ||
        overageDisabledReason === "fetch_error" ||
        overageDisabledReason === "unknown" ||
        !isAllowed() ||
        isGraceResendKillswitchOn()
      )
        return false;
      this.#e = "sent";
      return true;
    } catch (error) {
      logError(withTelemetryMessage(toError(error), "GraceResend.takeAfter failed"));
      return false;
    }
  }
  noteServed() {
    if (this.#e === "sent") {
      this.#e = "settled";
      logFeatureOk("usage_limit_grace_resend");
    }
  }
}
//@ chunk-5xgkngpb.js:2699908-2700060 layout
/**
 * 流式请求重试计数初值（retries/sleptThrough/reconnects/overloaded/stalls/truncations/afterThinkingOnly/outputFiltered/triedWithoutStreaming）。
 */
var EMPTY_RETRY_COUNTS = {
  retries: 0,
  sleptThrough: 0,
  reconnects: 0,
  overloaded: 0,
  stalls: 0,
  truncations: 0,
  afterThinkingOnly: 0,
  outputFiltered: 0,
  triedWithoutStreaming: false,
};
var RETRY_POLICY_CONST_1 = 1;
//@ chunk-5xgkngpb.js:2700060-2700097 layout
/**
 * 2/1/1/10/300：重试策略常量（输出过滤重试、默认值、睡眠穿越上限 10、patient tide 上限 300）。
 */
var MAX_OUTPUT_FILTERED_RETRIES = 2;
var RETRY_POLICY_CONST_HYN = 1;
var RETRY_POLICY_CONST_JEE = 1;
var MAX_SLEPT_THROUGH = 10;
var MAX_PATIENT_RETRIES = 300;
//@ chunk-5xgkngpb.js:2700097-2700509 layout
/**
 * 流式模型调用重试决策入口：noResponse（休眠/断网）、httpError、streamFailed 三类分派，返回 {decision, counts}（retry/useFallbackModel/retryWithoutStreaming/keepPartial/fail）。
 */
function decideStreamRetry(failure, counts, limits, fallbackCouldHelp) {
  switch (failure.kind) {
    case "noResponse":
      if (failure.suspended) return retryAfterSleep(counts, limits);
      if (failure.turnedAwayOverloaded) {
        if (limits.background && !isPersistentForAllErrors(limits))
          return {
            decision: "fail",
            counts,
          };
        if (limits.persistent)
          return {
            decision: "retry",
            counts,
          };
      }
      return failure.networkDown && counts.reconnects < limits.maxReconnects
        ? {
            decision: "retry",
            counts: {
              ...counts,
              reconnects: counts.reconnects + 1,
            },
          }
        : retryIfBudgetLeft(counts, limits);
    case "httpError":
      return decideHttpErrorRetry(failure, counts, limits);
    case "streamFailed":
      return decideStreamFailureRetry(failure, counts, limits, fallbackCouldHelp);
  }
}
//@ chunk-5xgkngpb.js:2700509-2700867 layout
/**
 * HTTP 错误：529→overloaded 逻辑；持久模式 429 重试；fallback 可帮助时换模型；408/409/429/5xx 计次重试；404 改非流式；否则失败。
 */
function decideHttpErrorRetry({ status, fallbackModelCouldHelp }, none, firstSlot) {
  if (status === 529) return decideOverloadedRetry(none, firstSlot, undefined);
  if (status === 429 && firstSlot.persistent)
    return {
      decision: "retry",
      counts: none,
    };
  if (fallbackModelCouldHelp && firstSlot.hasFallbackModel)
    return {
      decision: "useFallbackModel",
      counts: none,
    };
  if (status === 408 || status === 409 || status === 429 || status >= 500)
    return retryIfBudgetLeft(none, firstSlot);
  if (status === 404 && !none.triedWithoutStreaming) return retryWithoutStreaming(none, firstSlot, true);
  return {
    decision: "fail",
    counts: none,
  };
}
//@ chunk-5xgkngpb.js:2700867-2702184 layout
/**
 * 流中途失败按原因（denied/outputFiltered/stalled/connectionLost/suspended/truncated/malformed/serverError/timedOut/overloaded）与进度（nothing/started/thinkingOnly/partialOutput/output）决定重试、保留部分输出或改非流式。
 */
function decideStreamFailureRetry(
  { cause, progress, stopReasonReceived, outlastedNonStreamingTimeout },
  counts,
  failure,
  limits,
) {
  let failResult = {
    decision: "fail",
    counts,
  };
  let partialResult = {
    decision: "keepPartial",
    counts,
  };
  let withoutStreaming = retryWithoutStreaming(counts, failure, limits);
  if (cause === "denied") return failResult;
  if (cause === "outputFiltered")
    return (progress === "nothing" || progress === "started") && !stopReasonReceived
      ? retryWithCounter("outputFiltered", failure.maxOutputFiltered, counts, failure, failResult)
      : failResult;
  if (progress === "output")
    return cause === "badRequest" || cause === "unknown" ? failResult : partialResult;
  if (progress === "thinkingOnly")
    switch (cause) {
      case "stalled":
        return stopReasonReceived
          ? partialResult
          : retryWithCounter("stalls", 1, counts, failure, partialResult);
      case "connectionLost":
      case "suspended":
      case "truncated":
      case "malformed":
        return stopReasonReceived
          ? partialResult
          : retryWithCounter("afterThinkingOnly", 2, counts, failure, partialResult);
      case "serverError":
      case "timedOut":
        if (stopReasonReceived) return failResult;
        if (failure.hasFallbackModel && !isPersistentForAllErrors(failure))
          return {
            decision: "useFallbackModel",
            counts,
          };
        return retryWithCounter(
          "afterThinkingOnly",
          cause === "timedOut" ? 1 : 2,
          counts,
          failure,
          failResult,
        );
      case "overloaded":
        return stopReasonReceived ? failResult : decideOverloadedRetry(counts, failure, limits);
      case "badRequest":
      case "unknown":
        return failResult;
    }
  switch (cause) {
    case "overloaded":
      return progress === "partialOutput"
        ? retryWithoutStreaming(
            {
              ...counts,
              overloaded: counts.overloaded + 1,
            },
            failure,
            limits,
          )
        : decideOverloadedRetry(counts, failure, limits);
    case "stalled":
      return progress === "nothing"
        ? retryWithCounter("stalls", 1, counts, failure, withoutStreaming)
        : withoutStreaming;
    case "truncated":
      return stopReasonReceived
        ? withoutStreaming
        : retryWithCounter("truncations", 1, counts, failure, withoutStreaming);
    case "suspended":
      if (stopReasonReceived) return withoutStreaming;
      return progress === "partialOutput"
        ? retryIfBudgetLeft(counts, failure, withoutStreaming)
        : retryAfterSleep(counts, failure, withoutStreaming);
    case "connectionLost":
      return stopReasonReceived ? withoutStreaming : retryIfBudgetLeft(counts, failure, withoutStreaming);
    case "serverError":
      return outlastedNonStreamingTimeout && !stopReasonReceived && progress !== "partialOutput"
        ? retryWithCounter("afterThinkingOnly", 2, counts, failure, withoutStreaming)
        : withoutStreaming;
    case "timedOut":
    case "malformed":
    case "badRequest":
    case "unknown":
      return withoutStreaming;
  }
}
//@ chunk-5xgkngpb.js:2702184-2702598 layout
/**
 * 529 计数 +1：后台查询（非持久）只能换 fallback 或失败；未达上限继续重试；达上限换 fallback 或失败。
 */
function decideOverloadedRetry(counts, failure, limit) {
  let nextCounts = {
    ...counts,
    overloaded: counts.overloaded + 1,
  };
  let hasLimit = limit !== undefined;
  let decision = hasLimit
    ? retryWithoutStreaming(nextCounts, failure, limit)
    : {
        decision: "fail",
        counts: nextCounts,
      };
  let retryResult = {
    decision: "retry",
    counts: nextCounts,
  };
  if (failure.background && !isPersistentForAllErrors(failure))
    return hasLimit && failure.hasFallbackModel
      ? {
          decision: "useFallbackModel",
          counts: nextCounts,
        }
      : decision;
  if (nextCounts.overloaded < failure.maxOverloaded)
    return failure.persistent ? retryResult : retryIfBudgetLeft(nextCounts, failure, decision);
  if (failure.hasFallbackModel)
    return {
      decision: "useFallbackModel",
      counts: nextCounts,
    };
  if (hasLimit) return decision;
  return failure.persistent ? retryResult : retryIfBudgetLeft(nextCounts, failure);
}
//@ chunk-5xgkngpb.js:2702598-2702731 layout
/**
 * 电脑休眠导致断流：sleptThrough 未达上限则重试。
 */
function retryAfterSleep(state, error, attempt) {
  return state.sleptThrough < error.maxSleptThrough
    ? {
        decision: "retry",
        counts: {
          ...state,
          sleptThrough: state.sleptThrough + 1,
        },
      }
    : retryIfBudgetLeft(state, error, attempt);
}
//@ chunk-5xgkngpb.js:2702731-2702862 layout
/**
 * retries 未达 maxRetries 时 retries+1 重试，否则返回给定的失败决策。
 */
function retryIfBudgetLeft(
  budget,
  outcome,
  fallback = {
    decision: "fail",
    counts: budget,
  },
) {
  return budget.retries < outcome.maxRetries
    ? {
        decision: "retry",
        counts: {
          ...budget,
          retries: budget.retries + 1,
        },
      }
    : fallback;
}
//@ chunk-5xgkngpb.js:2702862-2702927 layout
/**
 * 指定计数器未达上限时自增并按 retryIfBudgetLeft 决策。
 */
function retryWithCounter(counts, failure, key, limit, fallback) {
  return key[counts] < failure
    ? retryIfBudgetLeft(
        {
          ...key,
          [counts]: key[counts] + 1,
        },
        limit,
        fallback,
      )
    : fallback;
}
//@ chunk-5xgkngpb.js:2702927-2703194 layout
/**
 * 改用非流式重试（只一次）；已试过且重试用尽则失败。
 */
function retryWithoutStreaming(budget, error, counts) {
  if (!counts)
    return {
      decision: "fail",
      counts: budget,
    };
  if (budget.triedWithoutStreaming && budget.retries >= error.maxRetries)
    return {
      decision: "fail",
      counts: budget,
    };
  return {
    decision: "retryWithoutStreaming",
    counts: {
      ...budget,
      retries: Math.min(budget.retries + 1, error.maxRetries),
      triedWithoutStreaming: true,
    },
  };
}
//@ chunk-5xgkngpb.js:2703194-2703261 layout
/**
 * 持久重试且不是只对容量错误持久。
 */
function isPersistentForAllErrors(error) {
  return error.persistent && error.persistentCapacityOnly !== true;
}
//@ chunk-5xgkngpb.js:2703261-2703271 layout
/**
 * 常量 2（流重试策略）。
 */
var STREAM_RETRY_CONST_2 = 2;
//@ chunk-5xgkngpb.js:2703271-2703337 layout
/**
 * tengu_tidy_cloud（默认开）时允许最多 10 次休眠穿越重试。
 */
function getMaxSleptThrough(maxRetriesFromEnv) {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_tidy_cloud", true)
    ? Math.min(maxRetriesFromEnv, MAX_SLEPT_THROUGH)
    : 0;
}
//@ chunk-5xgkngpb.js:2703337-2703518 fingerprint (2.1.88 match: getDefaultMaxRetries, 0.344)
/**
 * 主线程、订阅用户、未设 CLAUDE_CODE_MAX_RETRIES 时按 tengu_patient_tide 允许的断网重连次数（上限 300）。旧版名 getDefaultMaxRetries 不准确。
 */
function getMaxReconnects(querySource) {
  if (
    env.CLAUDE_CODE_MAX_RETRIES !== undefined ||
    isRetryWatchdogOn() ||
    classifyQuerySource(querySource) !== "main" ||
    getLastApiCompletionTimestamp() === null
  )
    return 0;
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE("tengu_patient_tide", 0);
  return Number.isInteger(featureValue_CACHED_MAY_BE_STALE) && featureValue_CACHED_MAY_BE_STALE > 0
    ? Math.min(featureValue_CACHED_MAY_BE_STALE, MAX_PATIENT_RETRIES)
    : 0;
}
//@ chunk-5xgkngpb.js:3015317-3015454 fingerprint (2.1.88 match: getMaxRetries, 0.525)
/**
 * 分类器请求的最大重试次数：GrowthBook 配置的 maxRetries（非负整数）或默认值，并返回来源 gb/default。
 */
function resolveClassifierMaxRetries() {
  let maxRetries = getAutoModeConfigOrDefault()?.maxRetries;
  return typeof maxRetries === "number" && Number.isInteger(maxRetries) && maxRetries >= 0
    ? {
        value: maxRetries,
        src: "gb",
      }
    : {
        value: CLASSIFIER_MAX_RETRIES,
        src: "default",
      };
}
export {
  fallbackUsageDelta,
  withRetry,
  CannotRetryError,
  FallbackTriggeredError,
  GraceResend,
  is529Error,
  isSpeedParameterUnsupportedError,
  isNonFallbackError,
  isAuthRetryableError,
  isRemoteAuthError,
  getMaxRetriesFromEnv,
  getMaxSleptThrough,
  getMaxReconnects,
  MAX_529_RETRIES,
  retryWatchdogEnv,
  isRetryWatchdogOn,
  isFastModeNotEnabledError,
  parseMaxTokensContextOverflowError,
  isNotFoundApiError,
  isNon529ServerError,
  RETRY_POLICY_CONST_1,
  RETRY_POLICY_CONST_HYN,
  MAX_OUTPUT_FILTERED_RETRIES,
  getRetryDelay,
  RETRY_POLICY_CONST_JEE,
  FOREGROUND_529_RETRY_SOURCES,
  TENGU_GOOFY_HARE,
  TENGU_SQUISHY_ULLMAN,
  TENGU_WONDROUS_HAVEN,
  TENGU_WITTY_KAY,
  TENGU_DEEP_TWILIGHT,
  TENGU_IMPERATIVE_SPINDLE,
  TENGU_PROUD_PEARL,
  TENGU_PATIENT_WALNUT,
  TENGU_HUMBLE_BUMBLEBEE,
  TENGU_SNUG_QUILL,
  TENGU_SPLENDID_LYNX,
  TENGU_MELLOW_RAINBOW,
  TENGU_LEXICAL_DRAGONFLY,
  TENGU_CHEEKY_TOUCAN,
  TENGU_TWINKLY_CLOVER,
  TENGU_SHINY_HAMMING,
  TENGU_TENDER_MITTEN,
  TENGU_WOBBLY_FOG,
  TENGU_STEADFAST_WREN,
  TENGU_LIMBER_FINCH,
  TENGU_STEADY_SCROLL,
  isGraceResendKillswitchOn,
  TENGU_CANDID_JUNIPER,
  TENGU_FALLOW_LANTERN,
  PERSISTENT_WAIT_CHUNK_MS,
  MOSSY_SQUID_GATE,
  TENGU_TOASTY_BEACON,
  TENGU_ZIPPY_HARBOR,
  TENGU_VALIANT_LANTERN,
  TENGU_STEADY_BITTERN,
  isGoogleCloudProvider,
  isGoogleCredentialLoadError,
  isOAuthTokenRevokedError,
  isModelPermissionDeniedError,
  TENGU_SNUG_WALL,
  TENGU_FOAMY_PELICAN,
  TENGU_KIND_DEWDROP,
  TENGU_MIGHTY_FLASK,
  TENGU_PLUMB_MARTEN,
  TENGU_PLAID_KETTLE,
  EMPTY_RETRY_COUNTS,
  STREAM_RETRY_CONST_2,
  decideStreamRetry,
  resolveClassifierMaxRetries,
  isModelNotFoundError,
  isAzureDeploymentNotFound,
  STALE_CONNECTION_ERROR_CODES,
  TENGU_THISTLE_ORRERY,
  RETRY_ON_529_QUERY_SOURCES,
  RETRY_FLAG_NAMES,
  TENGU_FLAG_SET,
  TENGU_MELLOW_HOLLERITH,
  TENGU_COBALT_PLINTH_ORPINE,
  TENGU_LEVEL_PLOVER,
};
