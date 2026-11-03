/**
 * services/api/withRetry.ts
 *
 * API 调用重试器 withRetry：按错误类型决定重试/退避/换 fallback 模型/放弃（CannotRetryError），处理 401/403 凭证刷新、云厂商认证、429/529 与快速模式冷却、上下文溢出调 max_tokens、onError 返回的 "retry:<原因>" 自愈重发、持久重试（RETRY_WATCHDOG），并向 UI 产出重试状态消息。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/api/withRetry.ts
 * pieces: chunk-aepeg2w5.js (3), chunk-e6aww6q8.js (66), chunk-gr2vfhah.js (8), chunk-sycgf9xs.js (1)
 * attribution: placement 15, fingerprint 16, layout 43, file-local 1, callgraph-witnessed 2, affinity 1
 */
import {
  Ahr,
  extractConnectionErrorDetails,
  LK,
  findProxyTunnelError,
  isStreamSuspendedError,
  isNetworkDownError,
  formatApiErrorType,
  summarizeApiError,
  SSL_CERT_ERROR_CODES,
  hasNestedError,
} from "./errorUtils.js";
import {
  findInCauseChain,
  getErrnoCode,
  errorMessage,
  StreamClosedAbortError,
  isAbortError,
  toError,
} from "../../utils/errors.js";
import { env } from "../../utils/env.js";
import { Ot, Lf, ef, fT } from "../../../vendor/@anthropic-ai/sdk/core/error.mjs";
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
  refreshAndGetAwsCredentials,
  getDefaultAwsProviderChain,
  clearAwsCredentialsCache,
  clearAwsHelperCredentialsCache,
  invalidateDefaultAwsProviderChainDebounced,
  markGcpCredentialsRejected,
  clearApiKeyHelperCache,
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
  adt,
  isPolicyBlockedError,
  isRequestTooLargeError_2,
  isMidConversationSystemRejected,
  isWebSearchContentRejected,
  isCodeExecutionOutputRejected,
  U9t,
  NoApiAttemptsLeftError,
  OAuthRefreshDiskFullError,
  _3e,
  REPEATED_529_MESSAGE,
  getCloudCredentialErrorProvider,
  Moo,
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
import { Tke, RK, AQt, LJ, classifyApiErrorKind } from "./responseDiagnostics.js";
import { Aa, sleep, backoffDelayMs } from "../../utils/sleep.js";
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
  F8r,
  OVERAGE_STATUS_HEADER,
  OVERAGE_DISABLED_REASON_HEADER,
  hasUnifiedRateLimitHeaders,
} from "../lowPriority/headers.js";
import {
  isModelRefused,
  evi,
  clearModelRefusal,
  isModelFallbackDisabled,
  XEi,
  advanceFallbackLadders,
  markModelRefused,
  modelNotAvailableError,
} from "../../utils/model/modelUnavailability.js";
import { withoutHostManagedProviderVars, lvt } from "../../utils/hostCredsFile.js";
import { invalidateWIFToken, getWIFTokenCache } from "../oauth/wifCredentials.js";
import { OAuthAccountOnHoldError } from "../oauth/oauthErrors.js";
import {
  getSdkOAuthTokenRefreshCallback,
  getHostAuthTokenRefreshCallback,
  getLastApiCompletionTimestamp,
} from "../../bootstrap/state.js";
import { emitCredentialChange } from "../../utils/auth/credentialEpoch.js";
import { uRn } from "../gateway/gatewayAuth.js";
import { _st, recordLowPriorityServed, planLowPriorityRetry } from "../lowPriority/lowPriorityMode.js";
import { sessionHasOwnFallback } from "../../utils/model/modelFallback.js";
import {
  ptr,
  fxe,
  rememberModelAccess,
  DKt,
  classifyModelAccess,
  checkProviderModelAccess,
} from "../../utils/model/modelAccessCheck.js";
import { isVerificationRequiredError } from "./verificationRequired.js";
import { U7 } from "./regimeRefusal.js";
import { isRoutedFinalAnswerError } from "./gzipRequestBody.js";
import { logEvent } from "../analytics/index.js";
import { telemetrySafeModelName } from "../../utils/model/telemetryModelName.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { Yxn } from "./streamErrors.js";
import { createSystemAPIErrorMessage } from "../../utils/messages.js";
import { isMainOrAgentQuerySource, classifyQuerySource } from "./requestHeaders.js";
import { agentTypeForTelemetry } from "../analytics/metadata.js";
import { getCanonicalName, strippedCanonicalName } from "../../utils/model/canonicalModelName.js";
import {
  isNonCustomOpusModel,
  isNonCustomFableModel,
  isNonCustomMythosModel,
} from "../../utils/model/smallFastModel.js";
import { rp, getWIFAccountOnHold } from "../../../vendor/@anthropic-ai/sdk/lib/credentials/types.mjs";
import { OAuthRefreshLockTimeoutError } from "../oauth/errors.js";
import { registerCleanup } from "../../utils/cleanupRegistry.js";
import { errorTelemetryFields } from "../../utils/accessibility/screenReader.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { getAwsRegionSync } from "../../utils/awsRegion.js";
import { isModelAllowed } from "../../utils/model/modelAllowlist.js";
import { isAwsCredentialsProviderError, isAwsCredentialError } from "../../utils/aws.js";
import { isWIFUserOAuthDeadError } from "../../utils/wifProfile.js";
import { isMockRateLimit429 } from "./usage.js";
import { Ws } from "./streamFallbackWarning.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { getAutoModeConfigOrDefault } from "../../utils/permissions/permissionSetup.js";
import { tUt } from "../../utils/permissions/classifierHostContext.js";
import { calculateCostFromTokenCounts } from "../../utils/modelCost.js";

/**
 * google-auth-library 凭证加载失败的典型消息片段；f5o 为令牌刷新失败片段。
 */
//@ chunk-e6aww6q8.js:1570337-1570600 fingerprint = isGoogleAuthLibraryCredentialError (0.547)
var GOOGLE_AUTH_CREDENTIAL_ERROR_MESSAGES = [
    "Could not load the default credentials",
    "does not exist, or it is not a file",
    "The incoming JSON object does not",
    "Must pass in a JSON object containing",
    "invalid_grant",
    "invalid_client",
    "unauthorized_client",
  ],
  GOOGLE_AUTH_REFRESH_ERROR_MESSAGES = [Ahr, "Could not refresh access token"];
/**
 * 沿 cause 链找一个 message 含任一片段的错误。
 */
//@ chunk-e6aww6q8.js:1570600-1570680 layout
function errorChainMessageIncludes(e, n) {
  return findInCauseChain(e, (r) => n.some((s) => r.message.includes(s))) !== void 0;
}
/**
 * EACCES/EPERM；g5o 为 open/read 系统调用名。
 */
//@ chunk-e6aww6q8.js:1570680-1570745 layout
var FS_PERMISSION_ERROR_CODES = new Set(["EACCES", "EPERM"]),
  CREDENTIAL_FILE_SYSCALLS = new Set(["open", "read"]);
/**
 * Google 凭证文件加载失败：已知消息片段，或凭证文件解析出 SyntaxError/读文件权限错误。
 */
//@ chunk-e6aww6q8.js:1570745-1570922 layout
function isGoogleCredentialLoadError(e) {
  return (
    errorChainMessageIncludes(e, GOOGLE_AUTH_CREDENTIAL_ERROR_MESSAGES) ||
    (errorChainMessageIncludes(e, [Ahr]) &&
      findInCauseChain(
        e,
        (n) =>
          n.name === "SyntaxError" ||
          (FS_PERMISSION_ERROR_CODES.has(getErrnoCode(n) ?? "") &&
            "syscall" in n &&
            typeof n.syscall === "string" &&
            CREDENTIAL_FILE_SYSCALLS.has(n.syscall)),
      ) !== void 0)
  );
}
/**
 * 使用 Vertex 或 anthropicGoogleCloud。旧版名 isVertexAuthError 不准确。
 */
//@ chunk-e6aww6q8.js:1570922-1571014 fingerprint = isVertexAuthError (0.661)
function isGoogleCloudProvider() {
  return !!(env.CLAUDE_CODE_USE_VERTEX || env.CLAUDE_CODE_USE_ANTHROPIC_GOOGLE_CLOUD);
}
/**
 * Google Cloud 提供商下的凭证加载/刷新失败或 401。覆盖 auto 名 isTransientCapacityError（错误）。
 */
//@ chunk-e6aww6q8.js:1571014-1571107 file-local
function isGoogleCloudAuthError(error) {
  if (!isGoogleCloudProvider()) return !1;
  return (
    isGoogleCredentialLoadError(error) ||
    errorChainMessageIncludes(error, GOOGLE_AUTH_REFRESH_ERROR_MESSAGES) ||
    (error instanceof Ot && error.status === 401)
  );
}
/**
 * 触发模型回退：携带 originalModel、fallbackModel、reason（overloaded/permission_denied/model_not_found/server_error/last_resort/model_blocked）、原始错误、封锁提示。queryLoop 接到后换模型重发。
 */
//@ chunk-e6aww6q8.js:2397728-2398030 fingerprint = FallbackTriggeredError (0.62)
class FallbackTriggeredError extends Error {
  originalModel;
  fallbackModel;
  reason;
  originalError;
  blockMessage;
  constructor(e, n, r = "overloaded", s, h) {
    super(`Model fallback triggered: ${e} -> ${n}`);
    this.originalModel = e;
    this.fallbackModel = n;
    this.reason = r;
    this.originalError = s;
    this.blockMessage = h;
    this.name = "FallbackTriggeredError";
  }
}
//@ chunk-e6aww6q8.js:2616090-2616189 placement
function Xb() {
  return env.CLAUDE_CODE_RETRY_WATCHDOG && env.CLAUDE_CODE_RETRY_WATCHDOG_SCOPE !== "capacity";
}
/**
 * 重试相关常量：中止错误构造、最大重试次数、退避基数与上限、529 连续次数阈值、各类等待时长等。
 */
//@ chunk-e6aww6q8.js:2616189-2616375 placement
var createRetryAbortError = () => new Lf(),
  DEFAULT_MAX_RETRIES = 10,
  UNATTENDED_MAX_RETRIES = 300,
  MAX_RETRIES_CAP = 15,
  FLOOR_OUTPUT_TOKENS = 3000,
  MAX_529_RETRIES = 3,
  MAX_REMOTE_AUTH_RETRIES = 2,
  AUTH_RETRY_DELAY_MS = 1000,
  MAX_OAUTH_REFRESH_FAILURES = 2,
  MAX_HOST_AUTH_RECOVERY_FAILURES = 2,
  MAX_AWS_AUTH_RETRIES = 2,
  MAX_GCP_AUTH_RETRIES = 2,
  MAX_NO_RESPONSE_RETRIES = 1,
  RETRY_DECAY_RATIO = 0.9,
  OUTLASTED_TIMEOUT_RETRIES = 2,
  MAX_API_KEY_HELPER_RETRIES = 2,
  API_KEY_HELPER_FAST_RETRIES = 2,
  API_KEY_HELPER_RETRY_DELAY_MS = 1000,
  MAX_WIF_EXCHANGE_RETRIES = 1,
  MAX_RETRY_AFTER_WAIT_MS = 60000,
  PERSISTENT_RETRY_MAX_DELAY_MS = 300000,
  PERSISTENT_WAIT_CAP_MS = 21600000,
  PERSISTENT_WAIT_CHUNK_MS = 30000;
//@ chunk-e6aww6q8.js:2616375-2616426 placement
function pRe() {
  return env.CLAUDE_CODE_RETRY_WATCHDOG;
}
//@ chunk-e6aww6q8.js:2616426-2616488 placement
function WQe(e) {
  return is529Error(e) || (e instanceof Ot && e.status === 429);
}
//@ chunk-e6aww6q8.js:2616488-2616582 placement
function XB(e) {
  return env.CLAUDE_CODE_REMOTE && e instanceof Ot && (e.status === 401 || e.status === 403);
}
//@ chunk-e6aww6q8.js:2616582-2616647 placement
function g_r(e) {
  let n = getClaudeAIOAuthTokens()?.accessToken;
  return n !== void 0 && n !== e;
}
//@ chunk-e6aww6q8.js:2616647-2616747 placement
function isApiKeyHelperAuthError(e) {
  return (
    !XB(e) &&
    e instanceof Ot &&
    (e.status === 401 || e.status === 403) &&
    isFirstPartyProvider() &&
    !effectiveAuthTokenEnv() &&
    isApiKeyHelperTheActiveCredential()
  );
}
//@ chunk-e6aww6q8.js:2616747-2616869 placement
function isAuthRetryableError(e, n) {
  return (
    (e instanceof Ot && e.status === 401) ||
    isApiKeyHelperAuthError(e) ||
    (proxyAuthRequired(e) !== void 0 && Boolean(getConfiguredProxyAuthHelper())) ||
    isOAuthTokenRevokedError(e) ||
    isAwsAuthError(e, n) ||
    isGoogleCloudAuthError(e)
  );
}
//@ chunk-e6aww6q8.js:2616869-2616971 placement
function shouldOfferReauth(e) {
  let n = classifyAPIError(e);
  return (
    (n === "auth_error" || n === "token_revoked") &&
    isClaudeAISubscriber() &&
    isActualFirstPartyAnthropicBaseUrl() &&
    !hasCustomApiKeyHeader() &&
    !hasCustomAuthorizationHeader()
  );
}
//@ chunk-e6aww6q8.js:2616971-2617062 placement
function shouldRetry529(querySource) {
  if (!(querySource instanceof ef)) return !1;
  let n = extractConnectionErrorDetails(querySource);
  return n !== null && LK.has(n.code);
}
//@ chunk-e6aww6q8.js:2617062-2617266 placement
function isTlsOrSocketError(e) {
  if (!(e instanceof ef)) return !1;
  let n = extractConnectionErrorDetails(e);
  if (n === null) return !1;
  let { code: code } = n;
  return (
    LK.has(code) ||
    code === "EPROTO" ||
    code === "FailedToOpenSocket" ||
    code.startsWith("ERR_OSSL_") ||
    code.startsWith("ERR_SSL_")
  );
}
/**
 * 识别代理认证错误（407，含隧道错误），返回 proxy-authenticate 头。
 */
//@ chunk-e6aww6q8.js:2617266-2617594 placement
function proxyAuthRequired(e) {
  if (e instanceof ef) {
    let n = findProxyTunnelError(e);
    if (n && "status" in n && n.status === 407)
      return {
        proxyAuthenticate:
          ("headers" in n && n.headers instanceof Headers ? n.headers : void 0)?.get("proxy-authenticate") ??
          void 0,
      };
    return;
  }
  if (e instanceof Ot && e.status === 407)
    return { proxyAuthenticate: e.headers?.get("proxy-authenticate") ?? void 0 };
  return;
}
/**
 * 连接失效时重新加载轮换后的 mTLS 客户端证书。
 */
//@ chunk-e6aww6q8.js:2617594-2618174 placement
async function reloadMtlsMaterial(e) {
  if (!env.CLAUDE_CODE_CLIENT_CERT || env.CLAUDE_CODE_DISABLE_MTLS_RELOAD_ON_STALE_CONNECTION)
    return { reportedFailure: !1, attempted: !1 };
  try {
    let { changed: changed, readFailed: readFailed, mismatched: mismatched } = await loadMTLSClientMaterial();
    if (changed) (clearProxyCache(), configureGlobalAgents());
    if (readFailed) {
      if (e)
        logFeatureSad("api_mtls_cert_reload", mismatched ? "material_mismatched" : "material_read_failed");
      return { reportedFailure: e, attempted: !0 };
    }
    if (changed)
      (logForDebugging("Stale connection \u2014 reloaded rotated mTLS client material"),
        logFeatureOk("api_mtls_cert_reload"));
    return { reportedFailure: !1, attempted: !0 };
  } catch (error) {
    if ((logError(error), e)) logFeatureBad("api_mtls_cert_reload", "reload_failed");
    return { reportedFailure: e, attempted: !0 };
  }
}
/**
 * 不可再重试：包装原始错误与 retryContext（model/fastMode/maxTokensOverride），name="RetryError"。
 */
//@ chunk-e6aww6q8.js:2618174-2618376 fingerprint = CannotRetryError (0.725)
class CannotRetryError extends Error {
  originalError;
  retryContext;
  constructor(e, n) {
    let r = errorMessage(e);
    super(r);
    this.originalError = e;
    this.retryContext = n;
    if (((this.name = "RetryError"), e instanceof Error && e.stack)) this.stack = e.stack;
  }
}
/**
 * 一组判定函数（DLP、内容过滤、beta 拒绝、媒体错误……）：命中的错误不触发 last_resort fallback。
 */
//@ chunk-e6aww6q8.js:2618376-2618504 layout
var NON_RETRYABLE_STATUS_CODES = new Set([401, 407, 429, 404, 403, 413]),
  NON_FALLBACK_ERROR_PREDICATES = [
    (e) => isConversationBindingError(e) && !isPrefixLockHealDeclined(e),
    isPromptTooLongError,
    isMaxTokensContextOverflow,
    isInputTooLongError,
    isCreditBalanceTooLow,
    isOrganizationDisabled,
    isFastModeNotEnabledError,
    isAdvisorModelMismatchError,
    adt,
    isPolicyBlockedError,
    isRequestTooLargeError_2,
    isInvalidEffortError,
    Tke,
    RK,
    isMidConversationSystemRejected,
    isWebSearchContentRejected,
    isCodeExecutionOutputRejected,
    U9t,
  ];
/**
 * 任一 NON_FALLBACK_ERROR_PREDICATES 命中。
 */
//@ chunk-e6aww6q8.js:2618504-2618547 layout
function isNonFallbackError(e) {
  return NON_FALLBACK_ERROR_PREDICATES.some((n) => n(e));
}
/**
 * withRetry(getClient, operation, options)：异步生成器，循环最多 maxRetries+1 次。每次：必要时（首次、401/吊销、凭证轮换、陈旧连接、mTLS 重载）刷新 OAuth/主机凭证并重建客户端 → 调 operation(client, attempt, retryContext)。出错：DLP/安全/内容过滤/验证/区域拒绝等直接 CannotRetryError；模型无权/不存在/5xx 且有 fallback → 抛 FallbackTriggeredError；onError 返回新的 "retry:<原因>" 标签则不计次立即重发（每个标签每次调用只用一次）；快速模式 429/529 进入冷却并关 fastMode；529 连续 3 次换 fallback 或报 repeated 529；上下文溢出把 maxTokensOverride 调到 contextLimit-input-1000；可重试错误按指数退避/retry-after 等待并 yield 重试状态系统消息；持久模式（CLAUDE_CODE_RETRY_WATCHDOG）对 429/529 无限等待并可在额度恢复时提前醒。
 */
//@ chunk-e6aww6q8.js:2618547-2633235 callgraph-witnessed = withRetry (0.268)
async function* withRetry(getClient, operation, options) {
  let maxRetries = resolveMaxRetries(options),
    maxAttempts = maxRetries,
    clock = options.clock ?? Aa,
    retryContext = { model: options.model, ...(isFastModeEnabled() && { fastMode: options.fastMode }) },
    client = null,
    consecutive529Errors = options.initialConsecutive529Errors ?? 0,
    lastError,
    persistentRetryCount = 0,
    capacityWait = options.modelCallRetries?.capacityWait ?? { spentMs: 0, usageLimitSpentMs: 0 },
    usageLimitRecheckCount = 0,
    usageLimitLiftedLastCheck = !1,
    remoteAuthRetries = 0,
    reconnectingAfterExhaust = !1,
    unregisterReconnectExitHook,
    Ie = { open: void 0 },
    nonStreamingTimeoutRetries = 0,
    awsAuthRetries = 0,
    gcpAuthRetries = 0,
    noResponseRetryLedger = options.noResponseRetryLedger ?? { count: 0 },
    oauthRefreshFailures = 0,
    hostAuthRecoveryFailures = 0,
    apiKeyHelperRetries = 0,
    apiKeyHelperAuthRetries = 0,
    wifExchangeRetries = 0,
    lastAwsAccessKeyId,
    mtlsReloadFailed = !1,
    clientOAuthAccessToken,
    clientHostAuthToken,
    usedRetryLabels = new Set(),
    retryStatusShown = !1,
    lowPriorityMarkedAtDispatch = !1,
    pn = { count: 0 },
    lowPriorityWait = options.lowPriorityWait ?? F8r(),
    hn = options.lowPriorityWait === void 0,
    ho = gcpSignInFailures(),
    yn = awsSignInFailures();
  try {
    let accessFallbackModel = getAccessFallbackModel(options);
    if (accessFallbackModel !== void 0 && isModelRefused(options.model))
      throw new FallbackTriggeredError(
        options.model,
        accessFallbackModel,
        "permission_denied",
        evi(options.model),
      );
    for (let attempt = 1; attempt <= maxAttempts + 1; attempt++) {
      if (options.signal?.aborted) throw new Lf();
      if (options.modelCallRetries?.takeApiAttempt() === !1)
        throw new CannotRetryError(new NoApiAttemptsLeftError(), retryContext);
      let attemptStartMs = clock.now();
      if (
        ((lowPriorityMarkedAtDispatch = !1),
        retryContext.fastMode && isFallbackModelFastRejected(retryContext.model))
      )
        retryContext.fastMode = !1;
      let fastModeActive = isFastModeEnabled() ? retryContext.fastMode && !isFastModeCooldown() : !1,
        displayAttempt = Math.min(attempt + persistentRetryCount, maxAttempts + 1);
      try {
        let vn = shouldRetry529(lastError);
        if (vn)
          (logForDebugging("Stale connection \u2014 disabling keep-alive for retry"), disableKeepAlive());
        let co = !1;
        if (isTlsOrSocketError(lastError)) {
          let un = await reloadMtlsMaterial(!mtlsReloadFailed);
          if (((co = un.attempted), un.reportedFailure)) mtlsReloadFailed = !0;
        }
        let So =
          clientOAuthAccessToken !== void 0 &&
          Boolean(env.CLAUDE_CODE_REMOTE_SESSION_ID) &&
          g_r(clientOAuthAccessToken);
        if (So)
          logForDebugging("Credential rotated since the client was built \u2014 rebuilding before retry");
        if (client === null || So || isAuthRetryableError(lastError, retryContext.model) || vn || co) {
          if (
            (lastError instanceof Ot && lastError.status === 401) ||
            isOAuthTokenRevokedError(lastError) ||
            (withoutHostManagedProviderVars() &&
              (isAwsCredentialExpiredError(lastError, retryContext.model) ||
                isGoogleCloudAuthError(lastError)))
          ) {
            if (!getAnthropicApiKey() && shouldUseWIFAuth()) await invalidateWIFToken(client?.authToken);
            if (clientOAuthAccessToken) {
              let un;
              await handleOAuth401Error(clientOAuthAccessToken, options.credentials, options.storageV5, {
                onForcedRefreshOutcome: ($o) => {
                  un = $o;
                },
              });
              let ao = getOAuthAccountOnHold();
              if (ao)
                throw (
                  logFeatureBad("api_request", "api_request_account_on_hold"),
                  new CannotRetryError(new OAuthAccountOnHoldError(ao.url), retryContext)
                );
              if (getClaudeAIOAuthTokens()?.accessToken === clientOAuthAccessToken) {
                if (
                  getSdkOAuthTokenRefreshCallback() !== null ||
                  (!XB(lastError) && ++oauthRefreshFailures >= MAX_OAUTH_REFRESH_FAILURES)
                ) {
                  if (un === "lock_disk_full" && shouldOfferReauth(lastError))
                    throw (
                      logFeatureBad("api_request", "api_request_oauth_refresh_disk_full"),
                      new CannotRetryError(new OAuthRefreshDiskFullError(), retryContext)
                    );
                  throw (
                    logFeatureBad("api_request", "api_request_oauth_refresh_exhausted"),
                    new CannotRetryError(lastError, retryContext)
                  );
                }
              } else oauthRefreshFailures = 0;
            } else if (withoutHostManagedProviderVars() && process.env[lvt()] !== clientHostAuthToken)
              logForDebugging("Host credential replaced since the client was built \u2014 retrying with it");
            else if (withoutHostManagedProviderVars()) {
              let un = null,
                ao,
                $o = !1,
                yo = !1;
              try {
                ({ authToken: un, materialUnchanged: ao } = await getHostAuthTokenRefreshCallback()());
              } catch (error) {
                if (
                  (logForDebugging(`host getHostAuthToken callback failed: ${errorMessage(error)}`, {
                    level: "error",
                  }),
                  error instanceof StreamClosedAbortError)
                )
                  throw new CannotRetryError(lastError, retryContext);
                if (isAbortError(error)) yo = !0;
                else (($o = !0), logFeatureBad("host_auth_recovery", "callback_failed"));
              }
              let Ho = (rr) => {
                if (++hostAuthRecoveryFailures >= MAX_HOST_AUTH_RECOVERY_FAILURES)
                  throw (
                    logFeatureBad("host_auth_recovery", rr),
                    logFeatureBad("api_request", "api_request_host_auth_exhausted"),
                    new CannotRetryError(lastError, retryContext)
                  );
              };
              if ($o);
              else if (yo) Ho("callback_aborted");
              else if (typeof un === "string" && un && un !== clientHostAuthToken)
                ((process.env[lvt()] = un),
                  emitCredentialChange(),
                  (hostAuthRecoveryFailures = 0),
                  logFeatureOk("host_auth_recovery"));
              else if (un === null)
                if (ao === !0) Ho("material_unchanged");
                else ((hostAuthRecoveryFailures = 0), logFeatureOk("host_auth_recovery"));
              else Ho("bearer_unchanged");
            } else if (
              ((isHostManagedProviderAuth() && isFirstPartyProvider()) || uRn()) &&
              !shouldUseWIFAuth() &&
              getAuthTokenSource().source !== "apiKeyHelper" &&
              !XB(lastError)
            )
              throw (
                logFeatureBad("api_request", "api_request_host_managed_auth_fail"),
                new CannotRetryError(lastError, retryContext)
              );
          }
          ((clientHostAuthToken = process.env[lvt()]),
            (client = await getClient()),
            (clientOAuthAccessToken = isAnthropicAuthEnabled()
              ? getClaudeAIOAuthTokens()?.accessToken
              : void 0));
        }
        lowPriorityMarkedAtDispatch = isFirstPartyApiBackend() && _st();
        let ko = await operation(client, displayAttempt, retryContext);
        if ((logFeatureOk("api_request"), reconnectingAfterExhaust))
          (logFeatureOk("api_reconnect"), (reconnectingAfterExhaust = !1));
        if (
          (clearModelRefusal(options.model),
          !isModelFallbackDisabled() &&
            !XEi(options.model) &&
            !sessionHasOwnFallback() &&
            advanceFallbackLadders(options.model, ptr, fxe))
        )
          (logForDebugging(
            `[model-access] now using ${options.model} as its tier's default: every newer model of the tier was refused, is not allowed, or was skipped because of its context window`,
          ),
            rememberModelAccess(options.model, "ok"));
        if (hn) recordLowPriorityServed(lowPriorityWait);
        return ko;
      } catch (error) {
        if (error instanceof CannotRetryError) throw error;
        if (error instanceof Lf) throw error;
        if (adt(error))
          throw (
            logFeatureBad("api_request", "api_request_dlp_denied"),
            new CannotRetryError(error, retryContext)
          );
        if (_3e(error))
          throw (
            logFeatureBad("api_request", "api_request_safety_monitor_blocked"),
            new CannotRetryError(error, retryContext)
          );
        if (isRequestTooLargeError_2(error))
          throw (
            logFeatureBad("api_request", "api_request_output_content_filtered"),
            new CannotRetryError(error, retryContext)
          );
        if (isVerificationRequiredError(error))
          throw (
            logFeatureBad("api_request", "api_request_verification_required"),
            new CannotRetryError(error, retryContext)
          );
        if (U7(error))
          throw (
            logFeatureBad("api_request", "api_request_regime_features_refused"),
            new CannotRetryError(error, retryContext)
          );
        if (isRoutedFinalAnswerError(error)) {
          let hr =
            isModelPermissionDeniedError(error) && !options.modelCallRetries?.outOfApiAttempts()
              ? (options.fallbackModel ??
                (getProviderForModel(options.model) === "firstParty"
                  ? getAccessFallbackModel(options)
                  : void 0))
              : void 0;
          if (hr && hr !== options.model)
            throw (
              logEvent("tengu_api_model_not_found_fallback_triggered", {
                original_model: telemetrySafeModelName(options.model),
                fallback_model: telemetrySafeModelName(hr),
                provider: getAPIProviderForAnalytics(),
                reason: fromEnum("permission_denied"),
              }),
              new FallbackTriggeredError(options.model, hr, "permission_denied", error)
            );
          throw (
            logFeatureBad("api_request", "api_request_route_answer_final"),
            new CannotRetryError(error, retryContext)
          );
        }
        if (options.modelCallRetries?.outOfApiAttempts())
          throw (
            logFeatureBad("api_request", "api_request_attempts_exhausted"),
            new CannotRetryError(error, retryContext)
          );
        if (
          ((lastError = error),
          logForDebugging(
            `API error (attempt ${displayAttempt}/${maxAttempts + 1}): ${error instanceof Ot ? `${error.status} ${error.message}` : errorMessage(error)}`,
            { level: "error" },
          ),
          Yxn(error) !== void 0)
        ) {
          if (!Xb() && noResponseRetryLedger.count >= MAX_NO_RESPONSE_RETRIES)
            throw (
              logFeatureBad("api_request", "api_request_no_response_exhausted"),
              new CannotRetryError(error, retryContext)
            );
          noResponseRetryLedger.count++;
        }
        let co,
          So =
            env.CLAUDE_CODE_NONSTREAMING_TIMEOUT_RETRIES ??
            (Xb() && options.failedStreamOutlastedTimeout ? OUTLASTED_TIMEOUT_RETRIES : void 0);
        if (
          So !== void 0 &&
          options.nonStreamingTimeoutMs !== void 0 &&
          error instanceof fT &&
          clock.now() - attemptStartMs >= options.nonStreamingTimeoutMs * RETRY_DECAY_RATIO
        ) {
          if (nonStreamingTimeoutRetries >= So)
            throw (
              logFeatureBad("api_request", "api_request_nonstreaming_timeout_exhausted"),
              new CannotRetryError(error, retryContext)
            );
          (nonStreamingTimeoutRetries++, (co = So - nonStreamingTimeoutRetries));
        }
        let retryLabel = await options.onError?.(error);
        if (retryLabel && !usedRetryLabels.has(retryLabel)) {
          usedRetryLabels.add(retryLabel);
          let mockError = toRetryStatusError(error, retryContext.model);
          if (mockError?.noResponse) {
            retryStatusShown = !0;
            let mi = clampRetryDisplayMax(mockError, attempt, maxAttempts, noResponseRetryLedger.count);
            (options.onRetryStatus?.({
              kind: "retrying",
              error: mockError,
              attempt: attempt,
              maxRetries: mi,
              retryInMs: 0,
              deadline: clock.now(),
            }),
              yield createSystemAPIErrorMessage(mockError, 0, attempt, mi, "request_retry"));
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
          ((retryStatusShown = !0),
            options.onRetryStatus?.({
              kind: "low_priority_waiting",
              attempt: lowPriorityDelay.attempt,
              retryInMs: lowPriorityDelay.delayMs,
              deadline: clock.now() + lowPriorityDelay.delayMs,
            }),
            await sleep(lowPriorityDelay.delayMs, options.signal, {
              abortError: createRetryAbortError,
              clock: clock,
            }),
            attempt--);
          continue;
        }
        if (DKt(options.model, error) === "refused") {
          (markModelRefused(options.model, error), rememberModelAccess(options.model, "refused"));
          let isStaleConnection = getAvailableFallbackModel(options);
          if (isStaleConnection !== void 0)
            throw (
              logEvent("tengu_api_model_not_found_fallback_triggered", {
                original_model: telemetrySafeModelName(options.model),
                fallback_model: telemetrySafeModelName(isStaleConnection),
                provider: getAPIProviderForAnalytics(),
                reason: fromEnum("model_access_refused"),
              }),
              new FallbackTriggeredError(options.model, isStaleConnection, "permission_denied", error)
            );
          throw (
            classifyModelAccess(options.model, error, "refused"),
            new CannotRetryError(error, retryContext)
          );
        }
        if (DKt(options.model, error) === "denied") {
          let hr = await getAwsAccessKeyId(options.signal);
          if (hr !== void 0 && hr === lastAwsAccessKeyId) {
            if (options.signal?.aborted) throw createRetryAbortError();
            let mi = getAvailableFallbackModel(options),
              Ha = mi === void 0 ? void 0 : await checkProviderModelAccess(mi, hr);
            if (mi !== void 0 && Ha === "accessible" && getAvailableFallbackModel(options) === mi)
              throw (
                markModelRefused(options.model, error),
                rememberModelAccess(options.model, "refused"),
                logEvent("tengu_api_model_not_found_fallback_triggered", {
                  original_model: telemetrySafeModelName(options.model),
                  fallback_model: telemetrySafeModelName(mi),
                  provider: getAPIProviderForAnalytics(),
                  reason: fromEnum("model_access_denied"),
                }),
                new FallbackTriggeredError(options.model, mi, "permission_denied", error)
              );
            let $a = mi !== void 0 && Ha === "refused" && options.fallbackModel === void 0;
            if ($a) markModelRefused(mi, modelNotAvailableError(mi));
            if (mi === void 0 || $a) classifyModelAccess(options.model, error, "denied");
            throw new CannotRetryError(error, retryContext);
          }
          lastAwsAccessKeyId = hr;
        } else lastAwsAccessKeyId = void 0;
        let isModelAccessError = isModelNotFoundError(error) || isModelPermissionDeniedError(error),
          fallbackForAccessError =
            options.fallbackModel ??
            (isModelAccessError && getProviderForModel(options.model) === "firstParty"
              ? getAccessFallbackModel(options)
              : void 0);
        if (
          (isModelAccessError || (!Xb() && isNon529ServerError(error))) &&
          fallbackForAccessError &&
          fallbackForAccessError !== options.model
        ) {
          let hr = isModelNotFoundError(error)
            ? "model_not_found"
            : isModelPermissionDeniedError(error)
              ? "permission_denied"
              : "server_error";
          throw (
            logEvent("tengu_api_model_not_found_fallback_triggered", {
              original_model: telemetrySafeModelName(options.model),
              fallback_model: telemetrySafeModelName(fallbackForAccessError),
              provider: getAPIProviderForAnalytics(),
              reason: fromEnum(hr),
            }),
            new FallbackTriggeredError(options.model, fallbackForAccessError, hr, error)
          );
        }
        let isApiKeyHelperAuthError_2 = isApiKeyHelperAuthError(error),
          apiKeyHelperFastRetry =
            isApiKeyHelperAuthError_2 && apiKeyHelperAuthRetries < API_KEY_HELPER_FAST_RETRIES;
        if (
          !isApiKeyHelperAuthError_2 &&
          !XB(error) &&
          error instanceof Ot &&
          (error.status !== void 0 || is529Error(error)) &&
          proxyAuthRequired(error) === void 0
        )
          ((apiKeyHelperAuthRetries = 0), (remoteAuthRetries = 0));
        let persistentWatchdog = pRe();
        if (fastModeActive && error instanceof Ot && (error.status === 429 || is529Error(error))) {
          let overageReason = error.headers?.get("anthropic-ratelimit-unified-overage-disabled-reason");
          if (overageReason !== null && overageReason !== void 0) {
            if (
              (handleFastModeOverageRejection(overageReason, options.storageV5),
              (retryContext.fastMode = !1),
              persistentWatchdog)
            )
              attempt--;
            continue;
          }
          let retryAfterMs = getRetryAfterMs(error),
            Ha = retryAfterMs !== null && retryAfterMs < FAST_MODE_SHORT_RETRY_THRESHOLD_MS;
          if (Ha && !persistentWatchdog) {
            if (attempt <= maxAttempts) {
              let min = Math.min(
                  getRetryDelay(
                    attempt,
                    getRetryAfter(error),
                    FAST_MODE_SHORT_RETRY_THRESHOLD_MS,
                    options.random,
                  ),
                  FAST_MODE_SHORT_RETRY_THRESHOLD_MS,
                ),
                nr = toRetryStatusError(error, retryContext.model);
              if (nr)
                ((retryStatusShown = !0),
                  options.onRetryStatus?.({
                    kind: "retrying",
                    error: nr,
                    attempt: attempt,
                    maxRetries: maxAttempts,
                    retryInMs: min,
                    deadline: clock.now() + min,
                  }),
                  yield createSystemAPIErrorMessage(nr, min, attempt, maxAttempts, "request_retry"));
              await sleepOrWake(min, options);
            }
            continue;
          }
          if (!Ha) {
            let cooldownMs = Math.max(
                retryAfterMs ?? FAST_MODE_DEFAULT_COOLDOWN_MS,
                FAST_MODE_MIN_COOLDOWN_MS,
              ),
              nr = is529Error(error) ? "overloaded" : "rate_limit";
            if ((triggerFastModeCooldown(Date.now() + cooldownMs, nr), isFastModeEnabled()))
              retryContext.fastMode = !1;
            if (persistentWatchdog) attempt--;
            continue;
          }
        }
        if (
          fastModeActive &&
          isSpeedParameterUnsupportedError(error, retryContext.model) &&
          (options.modelIsRefusalFallbackTarget || wasEverFastRejected(retryContext.model))
        ) {
          if ((markFallbackModelFastRejected(retryContext.model), (retryContext.fastMode = !1), Xb()))
            attempt--;
          continue;
        }
        if (fastModeActive && isFastModeNotEnabledError(error)) {
          if ((handleFastModeRejectedByAPI(options.storageV5), (retryContext.fastMode = !1), Xb())) attempt--;
          continue;
        }
        if (AQt(error, { model: retryContext.model, carriesConfigSkips: !0 }, pn)) {
          attempt--;
          continue;
        }
        if (is529Error(error) && !isMainOrAgentQuerySource(options.querySource) && !Xb())
          throw (
            logEvent("tengu_api_529_background_dropped", {
              query_source: agentTypeForTelemetry(options.querySource),
            }),
            logFeatureBad("api_request", "api_request_overload_background_dropped"),
            new CannotRetryError(error, retryContext)
          );
        let br = getCanonicalName(options.model);
        if (
          is529Error(error) &&
          (env.FALLBACK_FOR_ALL_PRIMARY_MODELS ||
            options.fallbackModel !== void 0 ||
            (!isClaudeAISubscriber() &&
              (isNonCustomOpusModel(br) || isNonCustomFableModel(br) || isNonCustomMythosModel(br))))
        ) {
          if ((consecutive529Errors++, consecutive529Errors >= MAX_529_RETRIES)) {
            if (options.fallbackModel)
              throw (
                logEvent("tengu_api_opus_fallback_triggered", {
                  original_model: telemetrySafeModelName(options.model),
                  fallback_model: telemetrySafeModelName(options.fallbackModel),
                  provider: getAPIProviderForAnalytics(),
                }),
                logFeatureSad("api_request", "api_request_fallback_triggered"),
                new FallbackTriggeredError(options.model, options.fallbackModel, "overloaded", error)
              );
            if (!env.IS_SANDBOX && !pRe())
              throw (
                logEvent("tengu_api_custom_529_overloaded_error", {}),
                logFeatureBad("api_request", "api_request_overload_repeated"),
                new CannotRetryError(Error(REPEATED_529_MESSAGE, { cause: error }), retryContext)
              );
          }
        }
        let persistentCapacityRetry = pRe() && WQe(error),
          sleptThroughRetry =
            error instanceof ef &&
            isStreamSuspendedError(error) &&
            (options.modelCallRetries?.sleptThroughLeft() ?? 0) > 0,
          overflowData = isNetworkDownError(error);
        if (overflowData && (options.modelCallRetries?.reconnectsLeft() ?? 0) > 0) maxAttempts++;
        if (attempt > maxAttempts && !persistentCapacityRetry && !sleptThroughRetry) {
          let hr =
            !(error instanceof Ot && error.status === 401) ||
            clientOAuthAccessToken !== void 0 ||
            withoutHostManagedProviderVars() ||
            isApiKeyHelperAuthError(error) ||
            (!getAnthropicApiKey() && shouldUseWIFAuth());
          if (
            !isAuthRetryableError(error, retryContext.model) ||
            !hr ||
            options.modelCallRetries?.takeCredentialRenewal() !== !0
          )
            throw (
              logFeatureBad("api_request", "api_request_retry_exhausted"),
              new CannotRetryError(error, retryContext)
            );
          attempt--;
        }
        if (XB(error)) {
          if (remoteAuthRetries >= MAX_REMOTE_AUTH_RETRIES)
            throw (
              logFeatureBad("api_request", "api_request_ccr_auth_exhausted"),
              new CannotRetryError(error, retryContext)
            );
          remoteAuthRetries++;
        }
        let cloudAuthRetriesLeft,
          cloudCredentialProvider = getCloudCredentialErrorProvider(error);
        if (
          awsSignInFailures() > yn &&
          (cloudCredentialProvider === "AWS" ||
            (!withoutHostManagedProviderVars() && isAwsAuthError(error, retryContext.model)))
        )
          throw (
            logFeatureBad("api_request", "api_request_aws_sign_in_failed"),
            new CannotRetryError(error, retryContext)
          );
        if (
          cloudCredentialProvider === "AWS" ||
          (!withoutHostManagedProviderVars() && isAwsProvider401(error, retryContext.model))
        ) {
          if (awsAuthRetries >= MAX_AWS_AUTH_RETRIES)
            throw (
              logFeatureBad("api_request", "api_request_aws_auth_exhausted"),
              new CannotRetryError(error, retryContext)
            );
          (awsAuthRetries++, (cloudAuthRetriesLeft = MAX_AWS_AUTH_RETRIES - awsAuthRetries));
        }
        if (
          cloudCredentialProvider === "Google Cloud" ||
          (!withoutHostManagedProviderVars() && isGoogleCloudAuthError(error))
        ) {
          if (gcpSignInFailures() > ho)
            throw (
              logFeatureBad("api_request", "api_request_gcp_sign_in_failed"),
              new CannotRetryError(error, retryContext)
            );
          if (gcpAuthRetries >= MAX_GCP_AUTH_RETRIES)
            throw (
              logFeatureBad("api_request", "api_request_gcp_auth_exhausted"),
              new CannotRetryError(error, retryContext)
            );
          (gcpAuthRetries++, (cloudAuthRetriesLeft = MAX_GCP_AUTH_RETRIES - gcpAuthRetries));
        }
        if (
          error instanceof Ot &&
          (error.status === 401 || error.status === 403) &&
          isFirstPartyProvider() &&
          isApiKeyHelperTheActiveCredential() &&
          getApiKeyHelperLastFailure() !== null
        ) {
          if (apiKeyHelperRetries >= MAX_API_KEY_HELPER_RETRIES)
            throw (
              logFeatureBad("api_request", "api_request_api_key_helper_failed"),
              new CannotRetryError(error, retryContext)
            );
          apiKeyHelperRetries++;
        }
        if (isApiKeyHelperAuthError_2) {
          if (apiKeyHelperAuthRetries === API_KEY_HELPER_FAST_RETRIES)
            logFeatureSad("api_request", "api_request_api_key_helper_auth_exhausted");
          apiKeyHelperAuthRetries++;
        }
        if (error instanceof rp && error.statusCode === 401) {
          if (wifExchangeRetries >= MAX_WIF_EXCHANGE_RETRIES)
            throw (
              logFeatureBad("api_request", "api_request_wif_exchange_401"),
              new CannotRetryError(error, retryContext)
            );
          wifExchangeRetries++;
        }
        if (
          !(
            clearAwsCredentialCacheOnAuthError(error, retryContext.model) ||
            clearGcpCredentialCacheOnAuthError(error) ||
            (await invalidateWifTokenOnError(error))
          ) &&
          (!(error instanceof Ot) || !shouldRetry(error))
        ) {
          let hr =
            error instanceof Ot &&
            ((error.status !== void 0 &&
              NON_RETRYABLE_STATUS_CODES.has(error.status) &&
              !(error.status === 404 && options.isNonStreamingRequest)) ||
              error.type === "billing_error" ||
              (options.isResumePrefillRequest === !0 && error.status !== void 0 && Moo(error.status)) ||
              NON_FALLBACK_ERROR_PREDICATES.some((mi) => mi(error)));
          if (
            error instanceof Ot &&
            error.status !== void 0 &&
            !hr &&
            options.fallbackModel &&
            options.fallbackModel !== options.model
          )
            throw (
              logEvent("tengu_api_fallback_last_resort", {
                status: error.status,
                errorType: fromEnum(LJ(error.type)),
                provider: getAPIProviderForAnalytics(),
                fastMode: retryContext.fastMode ?? !1,
              }),
              logFeatureSad("api_request", "api_request_last_resort_fallback"),
              new FallbackTriggeredError(
                options.model,
                options.fallbackModel,
                error.status === 404 && isNotFoundErrorType(error) ? "model_not_found" : "last_resort",
                error,
              )
            );
          throw (
            logFeatureBad(
              "api_request",
              error instanceof OAuthAccountOnHoldError || getWIFAccountOnHold(error) !== null
                ? "api_request_account_on_hold"
                : error instanceof OAuthRefreshLockTimeoutError
                  ? "api_request_oauth_refresh_lock_timeout"
                  : "api_request_non_retryable",
            ),
            new CannotRetryError(error, retryContext)
          );
        }
        if (error instanceof Ot) {
          let hr = parseMaxTokensContextOverflowError(error);
          if (hr) {
            let { inputTokens: inputTokens, contextLimit: contextLimit } = hr,
              safetyBuffer = 1000,
              availableContext = Math.max(0, contextLimit - inputTokens - 1000);
            if (availableContext < FLOOR_OUTPUT_TOKENS)
              throw (
                logError(
                  Error(
                    `availableContext ${availableContext} is less than FLOOR_OUTPUT_TOKENS ${FLOOR_OUTPUT_TOKENS}`,
                  ),
                ),
                error
              );
            let Ti = availableContext;
            if (retryContext.maxTokensOverride !== void 0 && Ti >= retryContext.maxTokensOverride)
              throw (logError(Error("max_tokens overflow adjustment made no progress")), error);
            ((retryContext.maxTokensOverride = Ti),
              logEvent("tengu_max_tokens_context_overflow_adjustment", {
                inputTokens: inputTokens,
                contextLimit: contextLimit,
                adjustedMaxTokens: Ti,
                attempt: attempt,
              }));
            continue;
          }
        }
        let retryAfterHeader = getRetryAfter(error),
          delayMs,
          isPersistentWait = persistentCapacityRetry,
          usageLimitError = null;
        if (persistentCapacityRetry) {
          let hr = (env.CLAUDE_CODE_RETRY_WATCHDOG_MAX_WAIT_MS ?? 1 / 0) - capacityWait.spentMs;
          if (hr <= 0)
            throw (
              logFeatureBad("api_request", "api_request_capacity_wait_exhausted"),
              new CannotRetryError(error, retryContext)
            );
          persistentRetryCount++;
          let mi = null;
          if (error instanceof Ot && error.status === 429) {
            if (
              ((mi = getRateLimitResetDelayMs(error, clock)),
              mi !== null && error.headers?.get?.("anthropic-ratelimit-unified-status") === "rejected")
            ) {
              let Ha =
                (env.CLAUDE_CODE_RETRY_WATCHDOG_MAX_USAGE_LIMIT_WAIT_MS ?? 1 / 0) -
                capacityWait.usageLimitSpentMs;
              if (mi > Ha) {
                let $a = error.headers?.get(OVERAGE_STATUS_HEADER),
                  nr = $a === "allowed" || $a === "allowed_warning";
                if (Ha <= 0 || (!nr && error.headers?.get(OVERAGE_DISABLED_REASON_HEADER) !== "fetch_error"))
                  throw (
                    logFeatureBad("api_request", "api_request_usage_limit_wait_too_long"),
                    new CannotRetryError(error, retryContext)
                  );
                mi = nr
                  ? Math.min(
                      Ha,
                      getRetryDelay(
                        persistentRetryCount,
                        null,
                        PERSISTENT_RETRY_MAX_DELAY_MS,
                        options.random,
                      ),
                    )
                  : Ha;
              }
              usageLimitError = error;
            }
          }
          ((delayMs = Math.min(
            mi ??
              getRetryDelay(
                persistentRetryCount,
                retryAfterHeader,
                PERSISTENT_RETRY_MAX_DELAY_MS,
                options.random,
              ),
            PERSISTENT_WAIT_CAP_MS,
          )),
            (delayMs = Math.min(delayMs, hr)));
        } else if (XB(error)) delayMs = AUTH_RETRY_DELAY_MS;
        else if (apiKeyHelperFastRetry) delayMs = API_KEY_HELPER_RETRY_DELAY_MS;
        else {
          let retryAfter = is529Error(error),
            mi = retryAfter ? env.CLAUDE_CODE_OVERLOADED_RETRY_MAX_DELAY_MS : void 0;
          if (
            ((delayMs = getRetryDelay(
              attempt + persistentRetryCount,
              retryAfterHeader,
              mi,
              options.random,
              retryAfter ? env.CLAUDE_CODE_OVERLOADED_RETRY_BASE_DELAY_MS : void 0,
            )),
            Xb())
          )
            ((delayMs = Math.min(delayMs, PERSISTENT_WAIT_CAP_MS)), (isPersistentWait = !0));
          else if (
            delayMs > Math.max(MAX_RETRY_AFTER_WAIT_MS, Math.ceil((mi ?? 0) * (1 + RETRY_JITTER_RATIO)))
          )
            throw (
              logEvent("tengu_api_retry_after_too_long", {
                delayMs: delayMs,
                status: error.status,
                provider: getAPIProviderForAnalytics(),
              }),
              logFeatureBad("api_request", "api_request_retry_after_too_long"),
              new CannotRetryError(error, retryContext)
            );
        }
        if (
          unregisterReconnectExitHook === void 0 &&
          attempt > maxRetries &&
          !persistentCapacityRetry &&
          !sleptThroughRetry
        )
          ((reconnectingAfterExhaust = !0),
            (unregisterReconnectExitHook = registerCleanup(
              () => ((reconnectingAfterExhaust = !1), logFeatureSadAsync("api_reconnect", "process_exit")),
            )));
        let attemptForTelemetry = persistentCapacityRetry
            ? persistentRetryCount
            : sleptThroughRetry
              ? Math.max(1, Math.min(attempt, maxAttempts))
              : attempt,
          resetDelay = classifyAPIError(error);
        if (
          (options.modelCallRetries?.reportHttpFailure(error, "retry"),
          logEvent("tengu_api_retry", {
            attempt: attemptForTelemetry,
            delayMs: delayMs,
            error: formatApiErrorType(resetDelay, error instanceof Ot ? error.status : void 0),
            errorType: fromEnum(resetDelay),
            ...errorTelemetryFields(error),
            status: error.status,
            provider: getAPIProviderForAnalytics(),
            attempt_duration_ms: clock.now() - attemptStartMs,
          }),
          logForDiagnosticsNoPII("warn", "cli_api_retry", () => ({
            ...classifyApiErrorKind(error, resetDelay),
            attempt: attemptForTelemetry,
            delay_ms: delayMs,
            attempt_duration_ms: clock.now() - attemptStartMs,
            model: telemetrySafeModelName(options.model) ?? null,
            query_source_category: classifyQuerySource(options.querySource) ?? null,
          })),
          isPersistentWait && delayMs > 60000)
        )
          logEvent("tengu_api_persistent_retry_wait", {
            status: error.status,
            delayMs: delayMs,
            attempt: attemptForTelemetry,
            provider: getAPIProviderForAnalytics(),
          });
        let quotaWindowWaitCleanup = void 0;
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
        let Is = () => {
          options.signal?.removeEventListener("abort", Is);
          try {
            quotaWindowWaitCleanup?.();
          } catch (error) {
            logError(error);
          }
          quotaWindowWaitCleanup = void 0;
        };
        if (quotaWindowWaitCleanup) options.signal?.addEventListener("abort", Is, { once: !0 });
        using fs = { [Symbol.dispose]: Is };
        let waitChunkMs = isPersistentWait ? PERSISTENT_WAIT_CHUNK_MS : delayMs,
          Vi = apiKeyHelperFastRetry && !isPersistentWait,
          usageLimitRecheckMs =
            usageLimitError && options.isUsageLimitLifted
              ? env.CLAUDE_CODE_RETRY_WATCHDOG_USAGE_LIMIT_RECHECK_MS
              : void 0;
        if (usageLimitError && usageLimitLiftedLastCheck)
          (usageLimitRecheckCount++, (usageLimitLiftedLastCheck = !1));
        let Wi = usageLimitRecheckMs === void 0 ? 1 / 0 : 0,
          ii = 0,
          remainingWaitMs = delayMs;
        while (remainingWaitMs > 0) {
          if (usageLimitRecheckMs !== void 0 && Wi <= 0)
            Wi = getRetryDelay(
              1 + usageLimitRecheckCount,
              null,
              PERSISTENT_WAIT_CAP_MS / 2,
              options.random,
              usageLimitRecheckMs,
            );
          if (isPersistentWait && options.signal?.aborted) throw new Lf();
          let hr = toRetryStatusError(error, retryContext.model);
          if (Vi && retryStatusShown) (options.onRetryStatus?.(null), (retryStatusShown = !1));
          if (hr && !Vi) {
            retryStatusShown = !0;
            let Ti = clampRetryDisplayMax(
              hr,
              attempt,
              (sleptThroughRetry ? Math.max(1, maxAttempts) : maxAttempts) +
                (overflowData ? (options.modelCallRetries?.reconnectsLeft() ?? 0) : 0),
              noResponseRetryLedger.count,
              cloudAuthRetriesLeft ?? co,
            );
            (options.onRetryStatus?.({
              kind: "retrying",
              error: hr,
              attempt: attemptForTelemetry,
              maxRetries: Ti,
              retryInMs: remainingWaitMs,
              deadline: clock.now() + remainingWaitMs,
            }),
              yield createSystemAPIErrorMessage(
                hr,
                remainingWaitMs,
                attemptForTelemetry,
                Ti,
                "request_retry",
              ));
          }
          let chunk = Math.min(remainingWaitMs, waitChunkMs),
            min = Math.min(chunk, ii);
          ii = 0;
          let monotonicNow = clock.monotonicNow(),
            nr = await sleepOrWake(chunk - min, options);
          if (persistentCapacityRetry) {
            let Ti = nr ? Math.min(chunk, min + Math.round(clock.monotonicNow() - monotonicNow)) : chunk;
            if (((capacityWait.spentMs += Ti), usageLimitError)) capacityWait.usageLimitSpentMs += Ti;
          }
          if (nr) break;
          if (
            ((remainingWaitMs -= chunk),
            (Wi -= chunk),
            Wi <= 0 && remainingWaitMs > waitChunkMs && usageLimitError && options.isUsageLimitLifted)
          ) {
            let Ti = !1,
              Vs = options.subscribeRetryWake?.(() => {
                Ti = !0;
              }),
              monotonicNow = clock.monotonicNow(),
              jo = !1;
            try {
              jo = await options.isUsageLimitLifted(usageLimitError);
            } catch (error) {
              logError(error);
            } finally {
              Vs?.();
            }
            if (((usageLimitLiftedLastCheck = jo), jo || Ti)) break;
            ii = Math.max(0, Math.round(clock.monotonicNow() - monotonicNow));
          }
        }
        if (persistentCapacityRetry || sleptThroughRetry) attempt--;
      }
    }
    throw (
      logFeatureBad("api_request", "api_request_retry_exhausted"),
      new CannotRetryError(lastError, retryContext)
    );
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
      reconnectingAfterExhaust = !1;
    }
    throw error;
  } finally {
    if ((unregisterReconnectExitHook?.(), reconnectingAfterExhaust))
      logFeatureSad("api_reconnect", "aborted");
    if (retryStatusShown) options.onRetryStatus?.(null);
  }
}
/**
 * 等待指定毫秒，可被 subscribeRetryWake 提前唤醒（返回 true）；中止时抛 AbortError。
 */
//@ chunk-e6aww6q8.js:2633235-2633660 layout
async function sleepOrWake(e, n) {
  let r = n.clock ?? Aa;
  if (!n.subscribeRetryWake)
    return (await sleep(e, n.signal, { abortError: createRetryAbortError, clock: r }), !1);
  if (n.signal?.aborted) throw createRetryAbortError();
  let s = !1,
    abortController = new AbortController(),
    subscribeRetryWake = n.subscribeRetryWake(() => {
      ((s = !0), abortController.abort());
    }),
    S = () => abortController.abort();
  n.signal?.addEventListener("abort", S, { once: !0 });
  try {
    if ((await sleep(e, abortController.signal, { clock: r }), n.signal?.aborted))
      throw createRetryAbortError();
    return s;
  } finally {
    (subscribeRetryWake(), n.signal?.removeEventListener("abort", S));
  }
}
/**
 * 取 API 错误响应头 retry-after 原始值。
 */
//@ chunk-e6aww6q8.js:2633660-2633750 fingerprint = getRetryAfter (1)
function getRetryAfter(error) {
  return (error.headers?.["retry-after"] || error.headers?.get?.("retry-after")) ?? null;
}
/**
 * 解析 400 "input length and `max_tokens` exceed context limit: a + b > c"，返回 {inputTokens,maxTokens,contextLimit}。
 */
//@ chunk-e6aww6q8.js:2633750-2634224 fingerprint = parseMaxTokensContextOverflowError (0.818)
function parseMaxTokensContextOverflowError(error) {
  if (error.status !== 400 || !error.message) return;
  if (!isMaxTokensContextOverflow(error)) return;
  let regex = /input length and `max_tokens` exceed context limit: (\d+) \+ (\d+) > (\d+)/,
    match = error.message.match(regex);
  if (!match || match.length !== 4) return;
  if (!match[1] || !match[2] || !match[3]) {
    logError(Error("Unable to parse max_tokens from max_tokens exceed context limit error message"));
    return;
  }
  let inputTokens = parseInt(match[1], 10),
    maxTokens = parseInt(match[2], 10),
    contextLimit = parseInt(match[3], 10);
  if (isNaN(inputTokens) || isNaN(maxTokens) || isNaN(contextLimit)) return;
  return { inputTokens: inputTokens, maxTokens: maxTokens, contextLimit: contextLimit };
}
/**
 * 400 "Fast mode is not enabled"。
 */
//@ chunk-e6aww6q8.js:2634224-2634348 fingerprint = isFastModeNotEnabledError (1)
function isFastModeNotEnabledError(error) {
  if (!(error instanceof Ot)) return !1;
  return error.status === 400 && (error.message?.includes("Fast mode is not enabled") ?? !1);
}
/**
 * 400 "'<model>' does not support the `speed` parameter" 且模型与当前模型同族。
 */
//@ chunk-e6aww6q8.js:2634348-2634558 layout
function isSpeedParameterUnsupportedError(e, n) {
  if (!(e instanceof Ot) || e.status !== 400) return !1;
  try {
    let r = e.message?.match(/'([^']+)' does not support the `speed` parameter/)?.[1];
    return r !== void 0 && strippedCanonicalName(r) === strippedCanonicalName(n);
  } catch (error) {
    return (logError(toError(error)), !1);
  }
}
/**
 * 5xx 但不是 529。
 */
//@ chunk-e6aww6q8.js:2634558-2634661 layout
function isNon529ServerError(e) {
  return e instanceof Ot && e.status !== void 0 && e.status >= 500 && e.status < 600 && e.status !== 529;
}
/**
 * 取当前 AWS 凭证的 accessKeyId（跳过 bearer token/跳过认证/无缓存场景），用于判断凭证是否变化。
 */
//@ chunk-e6aww6q8.js:2634661-2634923 layout
async function getAwsAccessKeyId(e) {
  if (
    env.AWS_BEARER_TOKEN_BEDROCK ||
    env.CLAUDE_CODE_SKIP_BEDROCK_AUTH ||
    env.CLAUDE_CODE_SKIP_AWS_CRED_CACHE ||
    isHostManagedProviderAuth()
  )
    return;
  try {
    let n = await refreshAndGetAwsCredentials(e);
    if (n) return n.accessKeyId;
    if (e?.aborted) return;
    return (await (await getDefaultAwsProviderChain(getAwsRegionSync()))()).accessKeyId;
  } catch {
    return;
  }
}
/**
 * fallbackModel 或可用的 accessFallbackModel，且不同于当前模型。
 */
//@ chunk-e6aww6q8.js:2634923-2635009 layout
function getAvailableFallbackModel(e) {
  let n = e.fallbackModel ?? getAccessFallbackModel(e);
  return n !== void 0 && n !== e.model ? n : void 0;
}
/**
 * accessFallbackModel 在允许、可用且（无工具辅助请求或支持）时返回。
 */
//@ chunk-e6aww6q8.js:2635009-2635124 layout
function getAccessFallbackModel({
  accessFallbackModel: accessFallbackModel,
  toolFreeHelper: toolFreeHelper,
}) {
  return accessFallbackModel !== void 0 &&
    !isModelFallbackDisabled() &&
    isModelAllowed(accessFallbackModel) &&
    (toolFreeHelper === !0 || fxe(accessFallbackModel))
    ? accessFallbackModel
    : void 0;
}
/**
 * Bedrock/anthropicAws/mantle 下的 AWS 凭证错误或 403，或 isAwsProvider401。旧版名 isBedrockAuthError 近似。
 */
//@ chunk-e6aww6q8.js:2635124-2635299 fingerprint = isBedrockAuthError (0.49)
function isAwsAuthError(e, n) {
  if (env.CLAUDE_CODE_USE_BEDROCK || env.CLAUDE_CODE_USE_ANTHROPIC_AWS || env.CLAUDE_CODE_USE_MANTLE) {
    if (isAwsCredentialsProviderError(e) || (e instanceof Ot && e.status === 403)) return !0;
  }
  return isAwsProvider401(e, n);
}
/**
 * anthropicAws/mantle 端点上的 401。
 */
//@ chunk-e6aww6q8.js:2635299-2635416 layout
function isAwsProvider401(e, n) {
  if (!(e instanceof Ot) || e.status !== 401) return !1;
  let r = getProviderForModel(n);
  return r === "anthropicAws" || r === "mantle";
}
/**
 * AWS 凭证错误（SDK 错误、401、x-amzn-errortype 指示过期）。
 */
//@ chunk-e6aww6q8.js:2635416-2635534 layout
function isAwsCredentialExpiredError(e, n) {
  return (
    isAwsCredentialsProviderError(e) ||
    isAwsProvider401(e, n) ||
    (e instanceof Ot && isAwsCredentialError(e.headers?.get("x-amzn-errortype") ?? void 0, e.message))
  );
}
/**
 * 重试提示里的"最大次数"：无响应时受 noResponse 账本限制。
 */
//@ chunk-e6aww6q8.js:2635534-2635652 layout
function clampRetryDisplayMax(e, n, r, s, h) {
  let y = r;
  if (e.noResponse && !Xb()) y = Math.min(y, n + MAX_NO_RESPONSE_RETRIES - s);
  if (h !== void 0) y = Math.min(y, n + h);
  return y;
}
/**
 * 把错误转成重试状态展示对象（formatted、rateLimits、noResponse 等）；云凭证错误标 isCloudCredentialError。
 */
//@ chunk-e6aww6q8.js:2635652-2635921 layout
function toRetryStatusError(e, n) {
  let r =
    e instanceof Ot
      ? summarizeApiError(e)
      : isAwsCredentialExpiredError(e, n) || isGoogleCloudAuthError(e) || e instanceof rp
        ? {
            message: errorMessage(e),
            status: void 0,
            requestId: void 0,
            formatted: errorMessage(e),
            connection: null,
            isNetworkDown: !1,
            rateLimits: null,
            noResponse: null,
          }
        : null;
  return r && getCloudCredentialErrorProvider(e) !== null ? { ...r, isCloudCredentialError: !0 } : r;
}
/**
 * AWS 认证错误时清 AWS 凭证缓存，返回是否处理。
 */
//@ chunk-e6aww6q8.js:2635921-2636010 layout
function clearAwsCredentialCacheOnAuthError(e, n) {
  if (!isAwsAuthError(e, n)) return !1;
  if (isAwsCredentialExpiredError(e, n)) clearAwsCredentialsCache();
  else (clearAwsHelperCredentialsCache(), invalidateDefaultAwsProviderChainDebounced(getAwsRegionSync()));
  return !0;
}
/**
 * Google Cloud 认证错误时清凭证缓存。
 */
//@ chunk-e6aww6q8.js:2636010-2636060 layout
function clearGcpCredentialCacheOnAuthError(e) {
  if (isGoogleCloudAuthError(e)) return (markGcpCredentialsRejected(), !0);
  return !1;
}
/**
 * 工作负载身份联合（WIF）交换出错（无状态码/401/5xx）时让令牌失效以便重试。
 */
//@ chunk-e6aww6q8.js:2636060-2636312 layout
async function invalidateWifTokenOnError(e) {
  if (
    e instanceof rp &&
    !isWIFUserOAuthDeadError(e) &&
    getWIFAccountOnHold(e) === null &&
    (e.statusCode === null || e.statusCode === 401 || e.statusCode >= 500)
  ) {
    let n = await getWIFTokenCache().catch(() => null);
    if (n === null) return !1;
    if (getErrnoCode(e.cause) === "ELOCKED") return !0;
    return (n.invalidate(), !0);
  }
  return !1;
}
/**
 * 响应头 x-should-retry: false。旧版名 shouldRetry 语义相反。
 */
//@ chunk-e6aww6q8.js:2636312-2636431 fingerprint = shouldRetry (0.474)
function isShouldRetryFalse(error) {
  if (error.headers?.get("x-should-retry") !== "false") return !1;
  let is5xxError = error.status !== void 0 && error.status >= 500;
  return !0;
}
/**
 * 判断错误是否可重试：额度/用量上限（credits_required、spend cap）不重试；x-should-retry=false 尊重；持久重试下 429/529 重试；远程 401/403、API key helper、overloaded、上下文溢出、OAuth 401/吊销、代理 407、x-should-retry=true、网络错误（非 SSL）、408/409/429（非订阅或企业）、5xx 重试。旧版同名。
 */
//@ chunk-e6aww6q8.js:2636431-2637870 layout
function shouldRetry(e) {
  if (isMockRateLimit429(e)) return !1;
  if (
    e.status === 429 &&
    (e.error?.error?.details?.error_code === "credits_required" ||
      e.message?.toLowerCase().includes("usage credits are required") ||
      e.message?.toLowerCase().includes("extra usage is required"))
  ) {
    let s = e.headers?.get("anthropic-ratelimit-unified-overage-disabled-reason");
    if (s !== "fetch_error" && s !== "org_level_disabled_until") return !1;
  }
  if (isSpendLimitError(e)) return !1;
  if (
    WQe(e) &&
    e.headers?.get("x-should-retry") === "false" &&
    (e.status === 429 || e.status === 529 || (e.status === 503 && isFirstPartyApiBackend())) &&
    e.headers?.get(OVERAGE_DISABLED_REASON_HEADER) !== "fetch_error" &&
    (pRe() || isShouldRetryFalse(e))
  )
    return !1;
  if (pRe() && WQe(e)) return !0;
  if (XB(e)) return !0;
  if (isApiKeyHelperAuthError(e)) return (clearApiKeyHelperCache(), !0);
  if (e.message?.includes('"type":"overloaded_error"')) return !0;
  if (parseMaxTokensContextOverflowError(e)) return !0;
  if (
    isAnthropicAuthEnabled() &&
    getClaudeAIOAuthTokens()?.accessToken &&
    (e.status === 401 || isOAuthTokenRevokedError(e))
  )
    return !0;
  if (!getAnthropicApiKey() && shouldUseWIFAuth() && (e.status === 401 || isOAuthTokenRevokedError(e)))
    return !0;
  if (withoutHostManagedProviderVars() && (e.status === 401 || isOAuthTokenRevokedError(e))) return !0;
  let n = proxyAuthRequired(e);
  if (n !== void 0) {
    if (!getConfiguredProxyAuthHelper()) return !1;
    return (clearProxyAuthHelperCache(n.proxyAuthenticate), !0);
  }
  if (
    e.headers?.get("x-should-retry") === "true" &&
    (!isClaudeAISubscriber() || isEnterpriseSubscriber() || isRateLimitWithoutQuotaInfo(e))
  )
    return !0;
  if (isShouldRetryFalse(e)) return !1;
  if (e instanceof ef) {
    let s = extractConnectionErrorDetails(e);
    if (s && SSL_CERT_ERROR_CODES.has(s.code)) return !1;
    if (s?.code === "BedrockUnexpectedContentType") return !1;
    if (s?.code === "TestEgressBlocked") return !1;
    return !0;
  }
  if (!e.status) return !1;
  if (e.status === 408) return !0;
  if (e.status === 409) return !0;
  if (e.status === 401) return (clearApiKeyHelperCache(), !0);
  if (isOAuthTokenRevokedError(e)) return !0;
  if (e.status === 429)
    return !isClaudeAISubscriber() || isEnterpriseSubscriber() || isRateLimitWithoutQuotaInfo(e);
  if (e.status && e.status >= 500) return !0;
  return !1;
}
/**
 * 429 且不是订阅额度用尽（无 overage-disabled-reason 头）。
 */
//@ chunk-e6aww6q8.js:2637870-2637941 layout
function isRateLimitWithoutQuotaInfo(e) {
  return (
    e.status === 429 && !hasUnifiedRateLimitHeaders(e) && !e.headers?.get?.(OVERAGE_DISABLED_REASON_HEADER)
  );
}
/**
 * 组织消费上限类 overage 禁用原因；cyn 加上 out_of_credits 等。
 */
//@ chunk-e6aww6q8.js:2637941-2638157 layout
var SPEND_CAP_REASONS = new Set(["org_spend_cap_reached", "org_level_disabled_until"]),
  OVERAGE_EXHAUSTED_REASONS = new Set([
    ...SPEND_CAP_REASONS,
    "out_of_credits",
    "org_level_disabled",
    "org_service_level_disabled",
  ]),
  OVERAGE_DISABLED_REASON_REGEX = /\\?"overageDisabledReason\\?":\s*\\?"([a-z_]+)\\?"/;
/**
 * 429 且是服务/组织消费上限或额度耗尽（头或消息体 overageDisabledReason）。
 */
//@ chunk-e6aww6q8.js:2638157-2638444 layout
function isSpendLimitError(e) {
  if (e.status !== 429) return !1;
  if (e.message.includes("service_spend_limit_reached")) return !0;
  let n = e.headers?.get?.(OVERAGE_DISABLED_REASON_HEADER);
  if (n && (SPEND_CAP_REASONS.has(n) || (!hasUnifiedRateLimitHeaders(e) && OVERAGE_EXHAUSTED_REASONS.has(n))))
    return !0;
  let r = e.message.includes("exceeded_limit") ? OVERAGE_DISABLED_REASON_REGEX.exec(e.message)?.[1] : void 0;
  return r !== void 0 && OVERAGE_EXHAUSTED_REASONS.has(r);
}
/**
 * CLAUDE_CODE_MAX_RETRIES（非持久模式上限 15），默认 10；持久重试模式默认 300。
 */
//@ chunk-e6aww6q8.js:2638444-2638679 layout
function getMaxRetriesFromEnv() {
  let e = Xb(),
    CLAUDE_CODE_MAX_RETRIES = env.CLAUDE_CODE_MAX_RETRIES;
  if (CLAUDE_CODE_MAX_RETRIES !== void 0 && CLAUDE_CODE_MAX_RETRIES >= 0) {
    if (CLAUDE_CODE_MAX_RETRIES > MAX_RETRIES_CAP && !e) {
      if (Ws().once("max_retries_clamp_warning"))
        logForDebugging(`CLAUDE_CODE_MAX_RETRIES=${CLAUDE_CODE_MAX_RETRIES} clamped to ${MAX_RETRIES_CAP}`, {
          level: "warn",
        });
      return MAX_RETRIES_CAP;
    }
    return CLAUDE_CODE_MAX_RETRIES;
  }
  return e ? UNATTENDED_MAX_RETRIES : DEFAULT_MAX_RETRIES;
}
/**
 * options.maxRetries 或 getMaxRetriesFromEnv()。
 */
//@ chunk-e6aww6q8.js:2638679-2638722 layout
function resolveMaxRetries(e) {
  return e.maxRetries ?? getMaxRetriesFromEnv();
}
/**
 * 快速模式 429/529 冷却：缺 retry-after 时 30 分钟；短等待阈值 20 秒；最短冷却 10 分钟。
 */
//@ chunk-e6aww6q8.js:2638722-2638759 layout
var FAST_MODE_DEFAULT_COOLDOWN_MS = 1800000,
  FAST_MODE_SHORT_RETRY_THRESHOLD_MS = 20000,
  FAST_MODE_MIN_COOLDOWN_MS = 600000;
/**
 * retry-after 头（秒）转毫秒。
 */
//@ chunk-e6aww6q8.js:2638759-2638854 layout
function getRetryAfterMs(e) {
  let n = getRetryAfter(e);
  if (n) {
    let r = parseInt(n, 10);
    if (!isNaN(r)) return r * 1000;
  }
  return null;
}
/**
 * 429 时按 anthropic-ratelimit-unified-reset 计算距重置的毫秒数（持久重试等额度窗口用）。
 */
//@ chunk-e6aww6q8.js:2638854-2639052 fingerprint = getRateLimitResetDelayMs (1)
function getRateLimitResetDelayMs(e, n) {
  let resetHeader = e.headers?.get?.("anthropic-ratelimit-unified-reset");
  if (!resetHeader) return null;
  let resetUnixSec = Number(resetHeader);
  if (!Number.isFinite(resetUnixSec)) return null;
  let rounded = Math.round(resetUnixSec * 1000 - n.now());
  return rounded > 0 ? rounded : null;
}
/**
 * 流式请求重试计数初值（retries/sleptThrough/reconnects/overloaded/stalls/truncations/afterThinkingOnly/outputFiltered/triedWithoutStreaming）。
 */
//@ chunk-e6aww6q8.js:2639052-2639204 layout
var EMPTY_RETRY_COUNTS = {
    retries: 0,
    sleptThrough: 0,
    reconnects: 0,
    overloaded: 0,
    stalls: 0,
    truncations: 0,
    afterThinkingOnly: 0,
    outputFiltered: 0,
    triedWithoutStreaming: !1,
  },
  RETRY_POLICY_CONST_1 = 1;
/**
 * 2/1/1/10/300：重试策略常量（输出过滤重试、默认值、睡眠穿越上限 10、patient tide 上限 300）。
 */
//@ chunk-e6aww6q8.js:2639204-2639241 layout
var MAX_OUTPUT_FILTERED_RETRIES = 2,
  RETRY_POLICY_CONST_HYN = 1,
  RETRY_POLICY_CONST_JEE = 1,
  MAX_SLEPT_THROUGH = 10,
  MAX_PATIENT_RETRIES = 300;
/**
 * 流式模型调用重试决策入口：noResponse（休眠/断网）、httpError、streamFailed 三类分派，返回 {decision, counts}（retry/useFallbackModel/retryWithoutStreaming/keepPartial/fail）。
 */
//@ chunk-e6aww6q8.js:2639241-2639518 layout
function decideStreamRetry(e, n, r, s) {
  switch (e.kind) {
    case "noResponse":
      if (e.suspended) return retryAfterSleep(n, r);
      return e.networkDown && n.reconnects < r.maxReconnects
        ? { decision: "retry", counts: { ...n, reconnects: n.reconnects + 1 } }
        : retryIfBudgetLeft(n, r);
    case "httpError":
      return decideHttpErrorRetry(e, n, r);
    case "streamFailed":
      return decideStreamFailureRetry(e, n, r, s);
  }
}
/**
 * HTTP 错误：529→overloaded 逻辑；持久模式 429 重试；fallback 可帮助时换模型；408/409/429/5xx 计次重试；404 改非流式；否则失败。
 */
//@ chunk-e6aww6q8.js:2639518-2639876 layout
function decideHttpErrorRetry({ status: status, fallbackModelCouldHelp: fallbackModelCouldHelp }, r, s) {
  if (status === 529) return decideOverloadedRetry(r, s, void 0);
  if (status === 429 && s.persistent) return { decision: "retry", counts: r };
  if (fallbackModelCouldHelp && s.hasFallbackModel) return { decision: "useFallbackModel", counts: r };
  if (status === 408 || status === 409 || status === 429 || status >= 500) return retryIfBudgetLeft(r, s);
  if (status === 404 && !r.triedWithoutStreaming) return retryWithoutStreaming(r, s, !0);
  return { decision: "fail", counts: r };
}
/**
 * 流中途失败按原因（denied/outputFiltered/stalled/connectionLost/suspended/truncated/malformed/serverError/timedOut/overloaded）与进度（nothing/started/thinkingOnly/partialOutput/output）决定重试、保留部分输出或改非流式。
 */
//@ chunk-e6aww6q8.js:2639876-2641193 layout
function decideStreamFailureRetry(
  {
    cause: cause,
    progress: progress,
    stopReasonReceived: stopReasonReceived,
    outlastedNonStreamingTimeout: outlastedNonStreamingTimeout,
  },
  h,
  y,
  S,
) {
  let w = { decision: "fail", counts: h },
    L = { decision: "keepPartial", counts: h },
    G = retryWithoutStreaming(h, y, S);
  if (cause === "denied") return w;
  if (cause === "outputFiltered")
    return (progress === "nothing" || progress === "started") && !stopReasonReceived
      ? retryWithCounter("outputFiltered", y.maxOutputFiltered, h, y, w)
      : w;
  if (progress === "output") return cause === "badRequest" || cause === "unknown" ? w : L;
  if (progress === "thinkingOnly")
    switch (cause) {
      case "stalled":
        return stopReasonReceived ? L : retryWithCounter("stalls", 1, h, y, L);
      case "connectionLost":
      case "suspended":
      case "truncated":
      case "malformed":
        return stopReasonReceived ? L : retryWithCounter("afterThinkingOnly", 2, h, y, L);
      case "serverError":
      case "timedOut":
        if (stopReasonReceived) return w;
        if (y.hasFallbackModel && !isPersistentForAllErrors(y))
          return { decision: "useFallbackModel", counts: h };
        return retryWithCounter("afterThinkingOnly", cause === "timedOut" ? 1 : 2, h, y, w);
      case "overloaded":
        return stopReasonReceived ? w : decideOverloadedRetry(h, y, S);
      case "badRequest":
      case "unknown":
        return w;
    }
  switch (cause) {
    case "overloaded":
      return progress === "partialOutput"
        ? retryWithoutStreaming({ ...h, overloaded: h.overloaded + 1 }, y, S)
        : decideOverloadedRetry(h, y, S);
    case "stalled":
      return progress === "nothing" ? retryWithCounter("stalls", 1, h, y, G) : G;
    case "truncated":
      return stopReasonReceived ? G : retryWithCounter("truncations", 1, h, y, G);
    case "suspended":
      if (stopReasonReceived) return G;
      return progress === "partialOutput" ? retryIfBudgetLeft(h, y, G) : retryAfterSleep(h, y, G);
    case "connectionLost":
      return stopReasonReceived ? G : retryIfBudgetLeft(h, y, G);
    case "serverError":
      return outlastedNonStreamingTimeout && !stopReasonReceived && progress !== "partialOutput"
        ? retryWithCounter("afterThinkingOnly", 2, h, y, G)
        : G;
    case "timedOut":
    case "malformed":
    case "badRequest":
    case "unknown":
      return G;
  }
}
/**
 * 529 计数 +1：后台查询（非持久）只能换 fallback 或失败；未达上限继续重试；达上限换 fallback 或失败。
 */
//@ chunk-e6aww6q8.js:2641193-2641607 layout
function decideOverloadedRetry(e, n, r) {
  let s = { ...e, overloaded: e.overloaded + 1 },
    h = r !== void 0,
    y = h ? retryWithoutStreaming(s, n, r) : { decision: "fail", counts: s },
    S = { decision: "retry", counts: s };
  if (n.background && !isPersistentForAllErrors(n))
    return h && n.hasFallbackModel ? { decision: "useFallbackModel", counts: s } : y;
  if (s.overloaded < n.maxOverloaded) return n.persistent ? S : retryIfBudgetLeft(s, n, y);
  if (n.hasFallbackModel) return { decision: "useFallbackModel", counts: s };
  if (h) return y;
  return n.persistent ? S : retryIfBudgetLeft(s, n);
}
/**
 * 电脑休眠导致断流：sleptThrough 未达上限则重试。
 */
//@ chunk-e6aww6q8.js:2641607-2641740 layout
function retryAfterSleep(e, n, r) {
  return e.sleptThrough < n.maxSleptThrough
    ? { decision: "retry", counts: { ...e, sleptThrough: e.sleptThrough + 1 } }
    : retryIfBudgetLeft(e, n, r);
}
/**
 * retries 未达 maxRetries 时 retries+1 重试，否则返回给定的失败决策。
 */
//@ chunk-e6aww6q8.js:2641740-2641871 layout
function retryIfBudgetLeft(e, n, r = { decision: "fail", counts: e }) {
  return e.retries < n.maxRetries ? { decision: "retry", counts: { ...e, retries: e.retries + 1 } } : r;
}
/**
 * 指定计数器未达上限时自增并按 retryIfBudgetLeft 决策。
 */
//@ chunk-e6aww6q8.js:2641871-2641936 layout
function retryWithCounter(e, n, r, s, h) {
  return r[e] < n ? retryIfBudgetLeft({ ...r, [e]: r[e] + 1 }, s, h) : h;
}
/**
 * 改用非流式重试（只一次）；已试过且重试用尽则失败。
 */
//@ chunk-e6aww6q8.js:2641936-2642203 layout
function retryWithoutStreaming(e, n, r) {
  if (!r) return { decision: "fail", counts: e };
  if (e.triedWithoutStreaming && e.retries >= n.maxRetries) return { decision: "fail", counts: e };
  return {
    decision: "retryWithoutStreaming",
    counts: { ...e, retries: Math.min(e.retries + 1, n.maxRetries), triedWithoutStreaming: !0 },
  };
}
/**
 * 持久重试且不是只对容量错误持久。
 */
//@ chunk-e6aww6q8.js:2642203-2642270 layout
function isPersistentForAllErrors(e) {
  return e.persistent && e.persistentCapacityOnly !== !0;
}
/**
 * 常量 2（流重试策略）。
 */
//@ chunk-e6aww6q8.js:2642270-2642280 layout
var STREAM_RETRY_CONST_2 = 2;
/**
 * tengu_tidy_cloud（默认开）时允许最多 10 次休眠穿越重试。
 */
//@ chunk-e6aww6q8.js:2642280-2642346 layout
function getMaxSleptThrough(e) {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_tidy_cloud", !0) ? Math.min(e, MAX_SLEPT_THROUGH) : 0;
}
/**
 * 主线程、订阅用户、未设 CLAUDE_CODE_MAX_RETRIES 时按 tengu_patient_tide 允许的断网重连次数（上限 300）。旧版名 getDefaultMaxRetries 不准确。
 */
//@ chunk-e6aww6q8.js:2642346-2642526 fingerprint = getDefaultMaxRetries (0.344)
function getMaxReconnects(e) {
  if (
    env.CLAUDE_CODE_MAX_RETRIES !== void 0 ||
    Xb() ||
    classifyQuerySource(e) !== "main" ||
    getLastApiCompletionTimestamp() === null
  )
    return 0;
  let n = getFeatureValue_CACHED_MAY_BE_STALE("tengu_patient_tide", 0);
  return Number.isInteger(n) && n > 0 ? Math.min(n, MAX_PATIENT_RETRIES) : 0;
}
/**
 * 分类器请求的最大重试次数：GrowthBook 配置的 maxRetries（非负整数）或默认值，并返回来源 gb/default。
 */
//@ chunk-e6aww6q8.js:2945716-2945853 fingerprint = getMaxRetries (0.526)
function resolveClassifierMaxRetries() {
  let n = getAutoModeConfigOrDefault()?.maxRetries;
  return typeof n === "number" && Number.isInteger(n) && n >= 0
    ? { value: n, src: "gb" }
    : { value: tUt, src: "default" };
}
/**
 * 0.25：退避的比例抖动。
 */
//@ chunk-gr2vfhah.js:421-440 affinity
var BASE_RETRY_DELAY_MS = 500,
  RETRY_JITTER_RATIO = 0.25;
/**
 * 重试等待时间：以 500ms 为基数、上限 32s、25% 抖动的指数退避；有 retry-after（秒）时取两者较大值。
 */
//@ chunk-gr2vfhah.js:440-657 callgraph-witnessed = getRetryDelay (0.161)
function getRetryDelay(e, t, r = 32000, s = Math.random, n = BASE_RETRY_DELAY_MS) {
  let rounded = Math.round(
    backoffDelayMs({
      attempt: e,
      baseMs: n,
      capMs: r,
      jitter: { kind: "proportional", ratio: RETRY_JITTER_RATIO },
      random: s,
    }),
  );
  if (t) {
    let seconds = parseInt(t, 10);
    if (!isNaN(seconds)) return Math.max(seconds * 1000, rounded);
  }
  return rounded;
}
/**
 * 403 "OAuth token has been revoked" 或 401 "OAuth access token has been revoked"。
 */
//@ chunk-gr2vfhah.js:1242-1441 fingerprint = isOAuthTokenRevokedError (0.637)
function isOAuthTokenRevokedError(error) {
  if (!(error instanceof Ot)) return !1;
  let t = error.message ?? "";
  return (
    (error.status === 403 && t.includes("OAuth token has been revoked")) ||
    (error.status === 401 && t.includes("OAuth access token has been revoked"))
  );
}
/**
 * 403 permission_error 且消息含 "model:"（模型无权访问）。
 */
//@ chunk-gr2vfhah.js:1441-1623 layout
function isModelPermissionDeniedError(e) {
  if (!(e instanceof Ot) || e.status !== 403) return !1;
  let t = e.message ?? "";
  return (e.type === "permission_error" || t.includes('"type":"permission_error"')) && t.includes("model:");
}
/**
 * 错误类型为 not_found_error。
 */
//@ chunk-gr2vfhah.js:1623-1728 layout
function isNotFoundErrorType(e) {
  return e.type === "not_found_error" || (e.message?.includes('"type":"not_found_error"') ?? !1);
}
/**
 * 404 not_found_error 且消息含 "model:"。
 */
//@ chunk-gr2vfhah.js:1728-1841 layout
function isModelNotFoundError(e) {
  if (!(e instanceof Ot) || e.status !== 404) return !1;
  return isNotFoundErrorType(e) && (e.message ?? "").includes("model:");
}
/**
 * Azure/Foundry 404 DeploymentNotFound。
 */
//@ chunk-gr2vfhah.js:1841-1962 layout
function isAzureDeploymentNotFound(e) {
  if (!(e instanceof Ot) || e.status !== 404 || !hasNestedError(e)) return !1;
  return e.error?.error?.code === "DeploymentNotFound";
}
/**
 * 529 或消息含 overloaded_error。
 */
//@ chunk-gr2vfhah.js:1962-2086 fingerprint = is529Error (1)
function is529Error(error) {
  if (!(error instanceof Ot)) return !1;
  return error.status === 529 || (error.message?.includes('"type":"overloaded_error"') ?? !1);
}
/**
 * 计算回退请求的用量差值。
 */
//@ chunk-aepeg2w5.js:375506-375866 placement
function fallbackUsageDelta(e) {
  let { primaryUsage: primaryUsage, usage: usage, model: model, fallbackFrom: fallbackFrom } = e,
    y =
      primaryUsage && usage
        ? {
            inputTokens: usage.inputTokens - primaryUsage.inputTokens,
            outputTokens: usage.outputTokens - primaryUsage.outputTokens,
            cacheReadInputTokens: usage.cacheReadInputTokens - primaryUsage.cacheReadInputTokens,
            cacheCreationInputTokens: usage.cacheCreationInputTokens - primaryUsage.cacheCreationInputTokens,
          }
        : usage;
  if (!y || !model) return;
  return (
    calculateCostFromTokenCounts(model, y) +
    (primaryUsage && fallbackFrom ? calculateCostFromTokenCounts(fallbackFrom, primaryUsage) : 0)
  );
}
/**
 * withRetry 使用的一组开关名。
 */
//@ chunk-aepeg2w5.js:376032-377675 placement
var MOSSY_SQUID_GATE = "tengu_mossy_squid",
  TENGU_TWINKLY_CLOVER = "tengu_twinkly_clover",
  TENGU_CANDID_JUNIPER = "tengu_candid_juniper",
  TENGU_CHEEKY_TOUCAN = "tengu_cheeky_toucan",
  TENGU_STEADFAST_WREN = "tengu_steadfast_wren",
  TENGU_COBALT_PLINTH_ORPINE = "tengu_cobalt_plinth_orpine",
  TENGU_VALIANT_LANTERN = "tengu_valiant_lantern",
  TENGU_LEVEL_PLOVER = "tengu_level_plover",
  TENGU_SPLENDID_LYNX = "tengu_splendid_lynx",
  TENGU_TENDER_MITTEN = "tengu_tender_mitten",
  TENGU_SNUG_QUILL = "tengu_snug_quill",
  TENGU_MELLOW_RAINBOW = "tengu_mellow_rainbow",
  TENGU_WONDROUS_HAVEN = "tengu_wondrous_haven",
  TENGU_GOOFY_HARE = "tengu_goofy_hare",
  TENGU_MIGHTY_FLASK = "tengu_mighty_flask",
  TENGU_STEADY_SCROLL = "tengu_steady_scroll",
  TENGU_PLAID_KETTLE = "tengu_plaid_kettle",
  TENGU_ZIPPY_HARBOR = "tengu_zippy_harbor",
  TENGU_FALLOW_LANTERN = "tengu_fallow_lantern",
  TENGU_MELLOW_HOLLERITH = "tengu_mellow_hollerith",
  TENGU_WITTY_KAY = "tengu_witty_kay",
  TENGU_STEADY_BITTERN = "tengu_steady_bittern",
  TENGU_KIND_DEWDROP = "tengu_kind_dewdrop",
  TENGU_THISTLE_ORRERY = "tengu_thistle_orrery",
  TENGU_TOASTY_BEACON = "tengu_toasty_beacon",
  TENGU_SNUG_WALL = "tengu_snug_wall",
  TENGU_IMPERATIVE_SPINDLE = "tengu_imperative_spindle",
  TENGU_PROUD_PEARL = "tengu_proud_pearl",
  TENGU_FOAMY_PELICAN = "tengu_foamy_pelican",
  zE = new Set([
    "tengu_steady_bittern",
    "tengu_thistle_orrery",
    "tengu_snug_wall",
    "tengu_imperative_spindle",
    "tengu_foamy_pelican",
    ...[],
  ]),
  Dr = new Set([
    "tengu_steady_bittern",
    ...[],
    "tengu_twinkly_clover",
    "tengu_candid_juniper",
    "tengu_iterative_lightning",
    "tengu_steadfast_wren",
    "tengu_cheeky_toucan",
    "tengu_cobalt_plinth_orpine",
    "tengu_valiant_lantern",
    "tengu_level_plover",
    "tengu_splendid_lynx",
    "tengu_tender_mitten",
    "tengu_snug_quill",
    "tengu_mellow_rainbow",
    "tengu_mellow_heron",
    "tengu_wondrous_haven",
    "tengu_mighty_flask",
    "tengu_goofy_hare",
    "tengu_steady_scroll",
    "tengu_zippy_harbor",
    "tengu_fallow_lantern",
    "tengu_mellow_hollerith",
    "tengu_starry_wall",
    "tengu_groovy_ember",
    "tengu_composed_plum",
    "tengu_witty_kay",
    "tengu_kind_dewdrop",
    "tengu_thistle_orrery",
    "tengu_proud_pearl",
    "tengu_snug_wall",
    "tengu_foamy_pelican",
    ...[],
    "tengu_mossy_squid",
    "tengu_toasty_beacon",
    "tengu_plaid_kettle",
  ]);
/**
 * 529 时允许重试的查询来源集合：前台来源 + agent:*、compact、hook_agent、side_question、web_search_tool、auto_mode 等；isForegroundQuerySource(IIe) 用它判断。
 */
//@ chunk-aepeg2w5.js:377792-378332 fingerprint = FOREGROUND_529_RETRY_SOURCES (0.585)
var FOREGROUND_529_RETRY_SOURCES = {
    repl_main_thread: !0,
    "repl_main_thread:outputStyle:custom": !0,
    "repl_main_thread:outputStyle:Concise": !0,
    "repl_main_thread:outputStyle:Proactive": !0,
    "repl_main_thread:outputStyle:Explanatory": !0,
    "repl_main_thread:outputStyle:Learning": !0,
    sdk: !0,
  },
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
/**
 * EPIPE/ECONNRESET/ENOTCONN/EOF：视为连接已失效、可换新连接重试的错误码。旧版名 isStaleConnectionError 是函数名，这里是集合。
 */
//@ chunk-sycgf9xs.js:17346-17402 fingerprint = isStaleConnectionError (0.632)
var STALE_CONNECTION_ERROR_CODES = new Set(["EPIPE", "ECONNRESET", "ENOTCONN", "EOF"]);

export {
  TENGU_IMPERATIVE_SPINDLE,
  TENGU_KIND_DEWDROP,
  fallbackUsageDelta,
  TENGU_STEADY_SCROLL,
  TENGU_WITTY_KAY,
  pRe,
  TENGU_GOOFY_HARE,
  TENGU_WONDROUS_HAVEN,
  getRetryDelay,
  withRetry,
  CannotRetryError,
  FallbackTriggeredError,
  is529Error,
  isSpeedParameterUnsupportedError,
  isNonFallbackError,
  getMaxRetriesFromEnv,
  getMaxSleptThrough,
  getMaxReconnects,
  MAX_529_RETRIES,
  Xb,
  isFastModeNotEnabledError,
  parseMaxTokensContextOverflowError,
  isNon529ServerError,
  RETRY_POLICY_CONST_1,
  RETRY_POLICY_CONST_HYN,
  MAX_OUTPUT_FILTERED_RETRIES,
  RETRY_POLICY_CONST_JEE,
  FOREGROUND_529_RETRY_SOURCES,
  isModelNotFoundError,
  TENGU_TOASTY_BEACON,
  TENGU_VALIANT_LANTERN,
  isGoogleCloudProvider,
  isGoogleCredentialLoadError,
  isOAuthTokenRevokedError,
  TENGU_MELLOW_HOLLERITH,
  RETRY_ON_529_QUERY_SOURCES,
  isModelPermissionDeniedError,
  Dr,
  zE,
  TENGU_SNUG_WALL,
  TENGU_ZIPPY_HARBOR,
  TENGU_FOAMY_PELICAN,
  TENGU_MIGHTY_FLASK,
  TENGU_PLAID_KETTLE,
  EMPTY_RETRY_COUNTS,
  STREAM_RETRY_CONST_2,
  decideStreamRetry,
  resolveClassifierMaxRetries,
  TENGU_STEADY_BITTERN,
  TENGU_LEVEL_PLOVER,
  TENGU_THISTLE_ORRERY,
  TENGU_COBALT_PLINTH_ORPINE,
  isAzureDeploymentNotFound,
  STALE_CONNECTION_ERROR_CODES,
  TENGU_PROUD_PEARL,
  TENGU_CHEEKY_TOUCAN,
  TENGU_TWINKLY_CLOVER,
  TENGU_TENDER_MITTEN,
  TENGU_STEADFAST_WREN,
  TENGU_SPLENDID_LYNX,
  TENGU_CANDID_JUNIPER,
  TENGU_SNUG_QUILL,
  TENGU_MELLOW_RAINBOW,
  TENGU_FALLOW_LANTERN,
  PERSISTENT_WAIT_CHUNK_MS,
  MOSSY_SQUID_GATE,
};
