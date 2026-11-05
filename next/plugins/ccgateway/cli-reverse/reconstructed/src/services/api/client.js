/**
 * services/api/client.ts
 *
 * 创建 Anthropic SDK 客户端（第一方/网关/Bedrock/Mantle/Foundry/AnthropicAws/Google Cloud/Vertex）：组装默认请求头、认证、超时与代理，并用 buildFetch 包装 fetch（x-client-request-id、请求体 gzip、首字节与字节流看门狗、Bedrock 内容类型守卫）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/api/client.ts
 * pieces: chunk-7kayq7nc.js (1), chunk-ja0weedh.js (1), chunk-vn3g7zt8.js (42)
 * attribution: fingerprint 5, layout 36, callgraph-fingerprint 1, sole-consumer 2
 */
import { randomUUID } from "crypto";
import { env } from "../../utils/env.js";
import { systemClock } from "../../utils/sleep.js";
import { isCcsCoworkSurface, desktopEntrypointSetting } from "../../utils/entrypointKinds.js";
import { isMainAgent } from "../../utils/agentContext.js";
import { shouldSendGatewayHintHeaders, isLowPriorityActiveSafe } from "../lowPriority/lowPriorityMode.js";
import {
  requestLaneFor,
  agentKindFor,
  isRetryOn529Source,
  buildClientIdentityHeader,
  baseRequestHeaders,
  X_CLAUDE_REMOTE_SESSION_ORIGIN,
  X_CLAUDE_CODE_REQUEST_CLASS,
  X_CLAUDE_CODE_AGENT_TYPE,
  X_CLAUDE_CODE_PROMPT_ID,
  identityHeaders,
  validateAuthHeaders,
  X_COWORK_ENROLLMENT,
  clipSlackMs,
  slackStillFresh,
  attachSenderAddress,
  streamTimerSlackMs,
} from "./requestHeaders.js";
import { envSessionKind } from "../../utils/concurrentSessions.js";
import {
  getTeammateAgentId,
  getGatewayAuth,
  isGatewayServerProcess,
  getIsNonInteractiveSession,
  isGatewayAuthExpired,
  getCoworkEnrollment,
  isDiskless,
  hasRefusalFallbackOccurred,
  hasRefusalFallbackHeaderArmed,
  getRefusalFallbackLatchOriginRequestId,
  getConversationToolsUsed,
} from "../../bootstrap/state.js";
import {
  filteredCustomBetaHeaders,
  CLOUD_AUTH_SLOT,
  clearAuthorizationHeaders,
  apiKeyHeaderFromEnv,
} from "./customHeaders.js";
import { encodeAddressSegment } from "../../utils/swarm/teammateIds.js";
import { normalizeUuidOrNull } from "../../utils/agentId.js";
import { logForDebugging, isDebugToStdErr, getMinDebugLogLevel } from "../../utils/debug.js";
import {
  getAPIProvider,
  getProviderForModel,
  providerReadsClientData,
  getAPIProviderForAnalytics,
  isFirstPartyAnthropicBaseUrl,
  isFirstPartyApiBackend,
} from "../../utils/model/providers.js";
import {
  isHostManagedProviderAuth,
  hostManagedNoCredsError,
  clearOAuthTokenCache,
  checkAndRefreshOAuthTokenIfNeededWithOutcome,
  getClaudeAIOAuthTokens,
  isAnthropicAuthEnabled,
  refreshAndGetAwsCredentials,
  hostManagedAwsSdkCredentials,
  defaultAwsProviderChainResolver,
  refreshGcpCredentialsIfNeeded,
  getConfiguredVertexProjectId,
  getAnthropicApiKey,
  shouldUseWIFAuth,
  isOAuthRefreshKnownDeadAsync,
  storedLoginReachedTimeLimit,
  getOAuthAccountOnHold,
  loginSwitchMemo,
  getAnthropicApiKeyWithSourceSafe,
  getAuthTokenSource,
  getApiKeyFromApiKeyHelper,
} from "../../utils/auth.js";
import { FoundryCapabilityError } from "./foundryCapabilities.js";
import {
  isLauncherStartedProcess,
  takeLauncherHostLoginEnd,
  isLauncherHostLoginRefusedNow,
} from "../../utils/auth/launcherHostLogin.js";
import {
  refreshGrowthBookAfterAuthChange,
  getFeatureValue_CACHED_MAY_BE_STALE,
  getRequestAtis,
  ATIS_REQUEST_HEADER,
} from "../analytics/growthbook.js";
import { hasInferenceScope, getAuthCredentialsForClient } from "../../constants/system.js";
import { getProxyAuthFromHelper, getProxyFetchOptions } from "../../utils/proxy.js";
import { assertProviderAllowed } from "../../utils/model/allowedProviders.js";
import { streamFallbackWarning } from "./streamFallbackWarning.js";
import { logFeatureOk } from "../analytics/featureTelemetry.js";
import { resolveAwsRegion } from "../../utils/awsRegion.js";
import { MAX_TIMER_DELAY_MS } from "../../utils/timerDelayClamp.js";
import { refreshGatewayToken, isProviderManagedUnpinnedGateway } from "../gateway/gatewayAuth.js";
import { GATEWAY_SESSION_EXPIRED_MESSAGE } from "../gateway/constants.js";
import { Anthropic } from "../../../vendor/@anthropic-ai/sdk/client.mjs";
import { normalizeRequestId } from "../requestUserDialog.js";
import {
  assertGcpPathSegment,
  getFoundryBaseUrl,
  SANDY_PLOVER_HEADER,
  toolsUsedHeaderBuilder,
  noteModelRequestSent,
} from "./clientHelpers.js";
import { vertexResidualCredentialPins, suppressVertexAuthRejection } from "./vertexAuth.js";
import {
  getVertexRegionForModel,
  isBareMode,
  isAntBuild,
  getDefaultAwsRegion,
  getVertexBaseUrlForRegion,
  nonEmptyOrUndefined,
  parseNumberWithSeparators,
} from "../../utils/envUtils.js";
import { getWIFTokenCache, getWIFCredentials } from "../oauth/wifCredentials.js";
import { OAuthRefreshDeadError, OAuthRefreshLockTimeoutError } from "../oauth/errors.js";
import { OAuthAccountOnHoldError } from "../oauth/oauthErrors.js";
import {
  settleStoredLoginRefusal,
  isStoredLoginRefused,
  storedLoginRefusalReason,
} from "../../utils/auth/storedLoginRefused.js";
import { StoredLoginHeldBackError } from "../oauth/storedLoginRefusal.js";
import { getOauthConfig } from "../../constants/oauth.js";
import { hasDedicatedSmallFastModel, getSmallFastModel } from "../../utils/model/smallFastModel.js";
import { getMainLoopModel } from "../../utils/model/model.js";
import { getCanonicalName } from "../../utils/model/canonicalModelName.js";
import { isHipaaOrg } from "../../utils/betas.js";
import { getCachedClientData } from "../../utils/config.js";
import {
  isMessagesEndpoint,
  isSerialisedBody,
  fetchWithRequestBodyCompression,
  takeDispatchAt,
  gzipLevelOverride,
  logGzipSent,
  reuseTelemetry,
  recordGzipBlockTelemetry,
  handleGzipRejectedResponse,
  retryRejectedGzipRequest,
} from "./gzipRequestBody.js";
import { MAX_RETRY_WINDOW_MS, retryWindowFor, StreamNoResponseError } from "./streamErrors.js";
import { logEvent } from "../analytics/index.js";
import { logError } from "../../utils/log.js";
import { toError, TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { requestMethodAndUrl, guardTestFetch, guardTestFetchRedirect } from "../../utils/testNetworkGuard.js";
import {
  isSilentFallbackArmed,
  REFUSAL_FALLBACK_HEADERS,
  sanitizeHeaderValue,
  X_CC_FALLBACK_LATCHED_BY,
  markArmedFromResponse,
} from "./refusalFallbackHeaders.js";
import { ANTHROPIC_USAGE_LIMIT, SLOW } from "../lowPriority/headers.js";
import { isOfficialFirstPartyEndpoint } from "../../utils/model/firstPartyBaseUrl.js";
import { isSillyShoreGateOn } from "../../utils/messages/untrustedArtifactContent.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { ANT_KEY_PFX } from "../teamMemorySync/secretScanner.js";
import { appendWatermark, appendWatermarkBuffer } from "../analytics/eventSerialization.js";
import {
  shouldUseFirstPartyFetchOptions,
  isSameUnredirectedUrl,
  markFirstPartyFetch,
} from "./fetchOptions.js";
import {
  mainReplyHoldMs,
  heldReplyHoldMs,
  wrapWithUnwatchedHold_2,
  wrapWithUnwatchedHold,
} from "./unwatchedReplyHold.js";
import { firstLineOf } from "../../utils/stringUtils.js";
import { APIUserAbortError } from "../../../vendor/@anthropic-ai/sdk/core/error.mjs";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-ja0weedh.js:1191-1249 fingerprint (2.1.88 match: configureApiKeyHeaders, 0.626)
/**
 * API key 转 Authorization: Bearer 头（空时返回空对象）。
 */
function configureApiKeyHeaders(apiKey) {
  return apiKey
    ? {
        Authorization: `Bearer ${apiKey}`,
      }
    : {};
}
//@ chunk-7kayq7nc.js:155671-155857 fingerprint (2.1.88 match: getCustomHeaders, 1)
/**
 * 解析 ANTHROPIC_CUSTOM_HEADERS（每行 "名: 值"）为 [名, 值] 数组；无冒号或名为空的行忽略。
 */
function getCustomHeaders(headerText = env.ANTHROPIC_CUSTOM_HEADERS ?? "") {
  let pairs = [];
  for (let headerString of headerText.split(/\r?\n/)) {
    let colonIdx = headerString.indexOf(":");
    let headerName = colonIdx === -1 ? "" : headerString.slice(0, colonIdx).trim();
    if (headerName) pairs.push([headerName, headerString.slice(colonIdx + 1).trim()]);
  }
  return pairs;
}
//@ chunk-vn3g7zt8.js:244576-244606 fingerprint (2.1.88 match: CLIENT_REQUEST_ID_HEADER, 1)
/**
 * 请求头名 x-client-request-id（第一方请求时由 buildFetch 生成 UUID）。
 */
var CLIENT_REQUEST_ID_HEADER = "x-client-request-id";
//@ chunk-vn3g7zt8.js:277036-277302 fingerprint (2.1.88 match: createStderrLogger, 1)
/**
 * SDK 日志器：error/warn/info/debug 都写 stderr 并加 [Anthropic SDK …] 前缀（调试模式 f7() 时传给 SDK）。
 */
function createStderrLogger() {
  return {
    error: (msg, ...args) => console.error("[Anthropic SDK ERROR]", msg, ...args),
    warn: (msg, ...args) => console.error("[Anthropic SDK WARN]", msg, ...args),
    info: (msg, ...args) => console.error("[Anthropic SDK INFO]", msg, ...args),
    debug: (msg, ...args) => console.error("[Anthropic SDK DEBUG]", msg, ...args),
  };
}
//@ chunk-vn3g7zt8.js:277302-277379 layout (2.1.88 match: isSessionContainerCompatible, 1)
/**
 * 工具列表转名字：有 name 用 name，否则 mcp__<type>。旧版名 isSessionContainerCompatible 为错配。
 */
function getToolNameList(tools, messages = []) {
  return tools.map((tool) => ("name" in tool ? tool.name : `mcp__${tool.type}`));
}
//@ chunk-vn3g7zt8.js:277379-287245 fingerprint (2.1.88 match: getAnthropicClient, 0.436)
/**
 * 创建 API 客户端（旧版 getAnthropicClient）。默认头：x-app(cli/cli-bg)、User-Agent、X-Claude-Code-Session-Id、ANTHROPIC_CUSTOM_HEADERS、自定义 anthropic-beta、远程容器/会话 id、x-client-app、子代理 agent-id/parent-agent-id；网关提示头开启时加 x-claude-code-request-class、x-claude-code-agent-type、x-claude-code-prompt-id。随后按提供商分支：gateway（JWT）、bedrock、foundry、anthropicAws、anthropicGoogleCloud、mantle、vertex，最后是第一方（API key 或 OAuth；令牌变化时递归重建）。maxRetries 由调用方传 0，重试全部交给 withRetry；超时取 API_TIMEOUT_MS 或 600s。
 */
async function getAnthropicClient(options) {
  let {
    apiKey,
    maxRetries,
    model,
    fetchOverride,
    source,
    querySource = source,
    requestClass,
    agentContext,
    promptId,
    ccsSender,
    permissionContext,
    toolNames = [],
    classifierJudgesServedCall,
    credentials,
    storageV5,
    signal,
    clock = systemClock,
    noResponseRetryLedger,
  } = options;
  let containerId = process.env.CLAUDE_CODE_CONTAINER_ID;
  let remoteSessionId = process.env.CLAUDE_CODE_REMOTE_SESSION_ID;
  let clientApp = process.env.CLAUDE_AGENT_SDK_CLIENT_APP;
  let sessionOrigin = isCcsCoworkSurface() ? env.CLAUDE_CODE_SESSION_ORIGIN : undefined;
  let subagentContext = isMainAgent(agentContext) ? undefined : agentContext;
  let customHeaders = shouldSendGatewayHintHeaders();
  let requestClassValue = requestLaneFor(source, agentContext, requestClass);
  let requestClassHeader = customHeaders ? requestClassValue : undefined;
  let agentTypeHeader = customHeaders ? agentKindFor(source, agentContext) : undefined;
  let credentialPromptContext = {
    userTurn:
      source !== "side_query" &&
      isRetryOn529Source(querySource) &&
      envSessionKind() === undefined &&
      getTeammateAgentId() === undefined &&
      (agentContext.agentType === "main" || agentContext.isBackgroundAgent === false),
  };
  let customHeaderMap = getCustomHeaderMap();
  let permissionContextHeaderValue = await buildClientIdentityHeader({
    querySource,
    permissionContext,
    toolNames,
    classifierJudgesServedCall,
  });
  let defaultHeaders = {
    ...baseRequestHeaders(),
    ...customHeaderMap,
    ...filteredCustomBetaHeaders(),
    ...(containerId && {
      "x-claude-remote-container-id": containerId,
    }),
    ...(remoteSessionId && {
      "x-claude-remote-session-id": remoteSessionId,
    }),
    ...(sessionOrigin && {
      [X_CLAUDE_REMOTE_SESSION_ORIGIN]: sessionOrigin,
    }),
    ...(clientApp && {
      "x-client-app": clientApp,
    }),
    ...(subagentContext?.agentId && {
      "x-claude-code-agent-id": encodeAddressSegment(subagentContext.agentId),
    }),
    ...(subagentContext?.parentAgentId && {
      "x-claude-code-parent-agent-id": encodeAddressSegment(subagentContext.parentAgentId),
    }),
    ...(requestClassHeader && {
      [X_CLAUDE_CODE_REQUEST_CLASS]: requestClassHeader,
    }),
    ...(agentTypeHeader && {
      [X_CLAUDE_CODE_AGENT_TYPE]: encodeAddressSegment(agentTypeHeader),
    }),
    ...(customHeaders &&
      promptId !== undefined &&
      normalizeUuidOrNull(promptId) !== null && {
        [X_CLAUDE_CODE_PROMPT_ID]: promptId,
      }),
  };
  logForDebugging(
    `[API:request] Creating client, ANTHROPIC_CUSTOM_HEADERS present: ${!!process.env.ANTHROPIC_CUSTOM_HEADERS}, has Authorization header: ${!!customHeaderMap.Authorization}`,
    {
      level: "verbose",
    },
  );
  if (env.CLAUDE_CODE_ADDITIONAL_PROTECTION) defaultHeaders["x-anthropic-additional-protection"] = "true";
  if (getAPIProvider() === "gateway" && !getGatewayAuth() && !isGatewayServerProcess()) {
    if (isHostManagedProviderAuth()) throw hostManagedNoCredsError("Cloud gateway");
    throw new FoundryCapabilityError(
      "Not signed in to the Cloud gateway \u2014 run /login.",
      "signin_required",
    );
  }
  if (isLauncherStartedProcess() && takeLauncherHostLoginEnd()) {
    clearOAuthTokenCache();
    refreshGrowthBookAfterAuthChange();
  }
  let oauthRefreshOutcome = await checkAndRefreshOAuthTokenIfNeededWithOutcome({
    credentials,
    storageV5,
  });
  let oauthTokens = getClaudeAIOAuthTokens();
  let isClaudeAiSubscriber = hasInferenceScope({
    anthropicAuthEnabled: isAnthropicAuthEnabled(),
    oauthScopes: oauthTokens?.scopes,
  });
  let authorizationSource = null;
  if (!isClaudeAiSubscriber && !getGatewayAuth())
    authorizationSource = await applyAuthTokenHeader(defaultHeaders, getIsNonInteractiveSession());
  await getProxyAuthFromHelper();
  let wrappedFetch = buildFetch(
    fetchOverride,
    source,
    querySource,
    getProviderForModel(model),
    storageV5,
    clock,
    noResponseRetryLedger,
    ccsSender,
    requestClassValue,
  );
  let provider = getProviderForModel(model);
  assertProviderAllowed(provider);
  if (streamFallbackWarning().once("provider_route")) logFeatureOk("provider_route");
  let awsRegion = provider === "bedrock" || provider === "mantle" ? await resolveAwsRegion() : undefined;
  let bodyIdleTimeoutSetting = getManagedNetworkConfig()?.body_idle_timeout;
  let apiTimeoutMs = getApiTimeoutMs() ?? 600000;
  let clientOptions = {
    defaultHeaders,
    maxRetries,
    timeout: apiTimeoutMs > 0 ? apiTimeoutMs : MAX_TIMER_DELAY_MS,
    dangerouslyAllowBrowser: true,
    fetchOptions: getProxyFetchOptions({
      forAnthropicAPI: true,
      hasBodyIdleWatchdog: shouldUseBodyIdleWatchdog(provider),
      bodyIdleTimeout: typeof bodyIdleTimeoutSetting === "boolean" ? bodyIdleTimeoutSetting : undefined,
      url: getProviderBaseUrl(provider, model, awsRegion),
    }),
    ...(wrappedFetch && {
      fetch: wrappedFetch,
    }),
    ...CLOUD_AUTH_SLOT,
  };
  if (provider === "gateway") {
    await refreshGatewayToken();
    let gatewayAuth = getGatewayAuth();
    if (!gatewayAuth || (isGatewayAuthExpired() && !isProviderManagedUnpinnedGateway()))
      throw gatewayAuth?.unpinned
        ? new FoundryCapabilityError(
            "Cloud gateway token expired \u2014 refresh ANTHROPIC_AUTH_TOKEN and restart.",
            "token_expired",
          )
        : new FoundryCapabilityError(GATEWAY_SESSION_EXPIRED_MESSAGE, "session_expired");
    let { rest } = splitAuthorizationHeader(clientOptions.defaultHeaders);
    return new Anthropic({
      ...clientOptions,
      defaultHeaders: {
        ...rest,
        ...clearAuthorizationHeaders(),
        Authorization: `Bearer ${gatewayAuth.jwt}`,
      },
      apiKey: null,
      baseURL: gatewayAuth.url,
      authToken: gatewayAuth.jwt,
      ...(isDebugToStdErr() && {
        logger: createStderrLogger(),
      }),
    });
  }
  if (provider === "bedrock") {
    let { AnthropicBedrock } =
      await import("../../../vendor/@anthropic-ai/bedrock-sdk/AnthropicBedrock.lazy.js");
    let resolvedFetch = getAwsRegionForModel(model, awsRegion);
    let CLAUDE_CODE_SKIP_BEDROCK_AUTH = env.CLAUDE_CODE_SKIP_BEDROCK_AUTH;
    let bedrockSplitHeaders = splitAuthorizationHeader(clientOptions.defaultHeaders);
    let any = Object.keys(bedrockSplitHeaders.rest).some((key) => key.toLowerCase() === "x-api-key");
    let bedrockDefaultHeaders = {
      ...bedrockSplitHeaders.rest,
      ...clearAuthorizationHeaders(),
      Authorization: null,
      ...(!CLAUDE_CODE_SKIP_BEDROCK_AUTH &&
        !any && {
          "X-Api-Key": null,
        }),
      ...(process.env.ANTHROPIC_BEDROCK_SERVICE_TIER && {
        "X-Amzn-Bedrock-Service-Tier": process.env.ANTHROPIC_BEDROCK_SERVICE_TIER,
      }),
    };
    let trimmed = process.env.AWS_BEARER_TOKEN_BEDROCK?.trim();
    let bedrockBearerToken = trimmed
      ? `Bearer ${trimmed}`
      : CLAUDE_CODE_SKIP_BEDROCK_AUTH
        ? bedrockSplitHeaders.value
        : undefined;
    let bedrockHostManagedAuth = isHostManagedProviderAuth();
    let bedrockAwsCredentials =
      !bedrockBearerToken && !CLAUDE_CODE_SKIP_BEDROCK_AUTH && !bedrockHostManagedAuth
        ? await awaitUnlessAborted(refreshAndGetAwsCredentials(signal, credentialPromptContext), signal)
        : null;
    let bedrockOptions = {
      ...clientOptions,
      defaultHeaders: bedrockDefaultHeaders,
      awsRegion: resolvedFetch,
      apiKey: null,
      ...(CLAUDE_CODE_SKIP_BEDROCK_AUTH &&
        !bedrockBearerToken && {
          skipAuth: true,
        }),
      ...(bedrockBearerToken && {
        apiKey: bedrockBearerToken.match(/^Bearer (.+)$/i)?.[1] ?? bedrockBearerToken,
        defaultHeaders: {
          ...bedrockDefaultHeaders,
          Authorization: bedrockBearerToken,
          ...(CLAUDE_CODE_SKIP_BEDROCK_AUTH && apiKeyHeaderFromEnv(bedrockSplitHeaders.rest)),
        },
      }),
      ...(bedrockHostManagedAuth &&
        !bedrockBearerToken &&
        !CLAUDE_CODE_SKIP_BEDROCK_AUTH && {
          providerChainResolver: hostManagedAwsSdkCredentials("Bedrock").providerChainResolver,
        }),
      ...(!bedrockHostManagedAuth &&
        !bedrockBearerToken &&
        !CLAUDE_CODE_SKIP_BEDROCK_AUTH && {
          providerChainResolver: defaultAwsProviderChainResolver(resolvedFetch),
        }),
      ...(isDebugToStdErr() && {
        logger: createStderrLogger(),
      }),
    };
    return bedrockAwsCredentials
      ? new AnthropicBedrock({
          ...bedrockOptions,
          awsAccessKey: bedrockAwsCredentials.accessKeyId,
          awsSecretKey: bedrockAwsCredentials.secretAccessKey,
          awsSessionToken: bedrockAwsCredentials.sessionToken,
        })
      : new AnthropicBedrock(bedrockOptions);
  }
  if (provider === "foundry") {
    let { AnthropicFoundry } = await import("../../../vendor/@anthropic-ai/foundry-sdk/client.mjs");
    let azureADTokenProvider;
    let skipFoundryAuth = false;
    if (env.ANTHROPIC_FOUNDRY_AUTH_TOKEN)
      azureADTokenProvider = async () => env.ANTHROPIC_FOUNDRY_AUTH_TOKEN ?? "";
    else if (!process.env.ANTHROPIC_FOUNDRY_API_KEY)
      if (env.CLAUDE_CODE_SKIP_FOUNDRY_AUTH) {
        skipFoundryAuth = true;
        azureADTokenProvider = () => Promise.resolve("skip-foundry-auth");
      } else if (isHostManagedProviderAuth()) throw hostManagedNoCredsError("Foundry");
      else {
        let { DefaultAzureCredential: AzureCredential, getBearerTokenProvider } =
          await import("../../../vendor/@azure/identity/dist/esm/credentials/DefaultAzureCredential.lazy.js");
        azureADTokenProvider = getBearerTokenProvider(
          new AzureCredential(),
          "https://cognitiveservices.azure.com/.default",
        );
      }
    let ANTHROPIC_FOUNDRY_RESOURCE = env.ANTHROPIC_FOUNDRY_RESOURCE;
    if (
      ANTHROPIC_FOUNDRY_RESOURCE !== undefined &&
      env.ANTHROPIC_FOUNDRY_BASE_URL === undefined &&
      normalizeRequestId(ANTHROPIC_FOUNDRY_RESOURCE) === undefined
    )
      throw Error(
        "ANTHROPIC_FOUNDRY_RESOURCE must be a Foundry resource name (2-64 letters, digits and hyphens, not starting or ending with a hyphen, such as my-resource), not a URL or host name. To use a full URL, set ANTHROPIC_FOUNDRY_BASE_URL instead.",
      );
    let foundrySplitHeaders = splitAuthorizationHeader(clientOptions.defaultHeaders);
    let foundryOptions = {
      ...clientOptions,
      ...(ANTHROPIC_FOUNDRY_RESOURCE !== undefined && {
        resource: ANTHROPIC_FOUNDRY_RESOURCE,
      }),
      defaultHeaders: {
        ...foundrySplitHeaders.rest,
        ...clearAuthorizationHeaders(),
        Authorization: null,
      },
      ...(azureADTokenProvider && {
        azureADTokenProvider,
        apiKey: null,
        defaultHeaders: skipFoundryAuth
          ? {
              ...foundrySplitHeaders.rest,
              ...(foundrySplitHeaders.value !== undefined && {
                Authorization: foundrySplitHeaders.value,
              }),
            }
          : {
              ...foundrySplitHeaders.rest,
              ...clearAuthorizationHeaders(),
            },
      }),
      ...(isDebugToStdErr() && {
        logger: createStderrLogger(),
      }),
    };
    return new AnthropicFoundry(foundryOptions);
  }
  if (provider === "anthropicAws") {
    let { AnthropicAws } = await import("../../../vendor/@anthropic-ai/bedrock-sdk/AnthropicAws.lazy.js");
    let CLAUDE_CODE_SKIP_ANTHROPIC_AWS_AUTH = env.CLAUDE_CODE_SKIP_ANTHROPIC_AWS_AUTH;
    let awsRegion = await resolveAwsRegion();
    let anthropicAwsSplitHeaders = splitAuthorizationHeader(clientOptions.defaultHeaders);
    let anthropicAwsBearerToken = CLAUDE_CODE_SKIP_ANTHROPIC_AWS_AUTH
      ? anthropicAwsSplitHeaders.value
      : undefined;
    let workspaceId = Object.entries(anthropicAwsSplitHeaders.rest).findLast(
      ([key]) => key.toLowerCase() === "anthropic-workspace-id",
    )?.[1];
    let anthropicAwsOptions = {
      ...clientOptions,
      awsRegion,
      ...(workspaceId &&
        env.ANTHROPIC_AWS_WORKSPACE_ID && {
          workspaceId,
        }),
      defaultHeaders: {
        ...anthropicAwsSplitHeaders.rest,
        ...clearAuthorizationHeaders(),
        Authorization: null,
      },
      ...(!CLAUDE_CODE_SKIP_ANTHROPIC_AWS_AUTH && {
        authToken: null,
      }),
      ...(CLAUDE_CODE_SKIP_ANTHROPIC_AWS_AUTH &&
        !anthropicAwsBearerToken && {
          skipAuth: true,
        }),
      ...(anthropicAwsBearerToken && {
        apiKey: anthropicAwsBearerToken.match(/^Bearer (.+)$/i)?.[1] ?? anthropicAwsBearerToken,
        defaultHeaders: {
          ...anthropicAwsSplitHeaders.rest,
          ...clearAuthorizationHeaders(),
          Authorization: anthropicAwsBearerToken,
        },
      }),
      ...(isDebugToStdErr() && {
        logger: createStderrLogger(),
      }),
    };
    if (!process.env.ANTHROPIC_AWS_API_KEY && !CLAUDE_CODE_SKIP_ANTHROPIC_AWS_AUTH)
      if (isHostManagedProviderAuth())
        anthropicAwsOptions.providerChainResolver =
          hostManagedAwsSdkCredentials("Anthropic-on-AWS").providerChainResolver;
      else {
        let anthropicAwsCredentials = await awaitUnlessAborted(
          refreshAndGetAwsCredentials(signal, credentialPromptContext),
          signal,
        );
        if (anthropicAwsCredentials) {
          anthropicAwsOptions.awsAccessKey = anthropicAwsCredentials.accessKeyId;
          anthropicAwsOptions.awsSecretAccessKey = anthropicAwsCredentials.secretAccessKey;
          anthropicAwsOptions.awsSessionToken = anthropicAwsCredentials.sessionToken;
        } else anthropicAwsOptions.providerChainResolver = defaultAwsProviderChainResolver(awsRegion);
      }
    return new AnthropicAws(anthropicAwsOptions);
  }
  if (provider === "anthropicGoogleCloud") {
    assertGcpPathSegment("ANTHROPIC_GOOGLE_CLOUD_PROJECT", env.ANTHROPIC_GOOGLE_CLOUD_PROJECT);
    assertGcpPathSegment("ANTHROPIC_GOOGLE_CLOUD_LOCATION", env.ANTHROPIC_GOOGLE_CLOUD_LOCATION);
    assertGcpPathSegment("ANTHROPIC_GOOGLE_CLOUD_WORKSPACE_ID", env.ANTHROPIC_GOOGLE_CLOUD_WORKSPACE_ID);
    assertGcpPathSegment("GCLOUD_PROJECT", env.GCLOUD_PROJECT);
    assertGcpPathSegment("GOOGLE_CLOUD_PROJECT", env.GOOGLE_CLOUD_PROJECT);
    assertGcpPathSegment("gcloud_project", env.gcloud_project);
    assertGcpPathSegment("google_cloud_project", env.google_cloud_project);
    let skipGoogleCloudAuth = env.CLAUDE_CODE_SKIP_ANTHROPIC_GOOGLE_CLOUD_AUTH;
    let googleCloudHostManagedAuth = isHostManagedProviderAuth();
    if (!skipGoogleCloudAuth && !googleCloudHostManagedAuth)
      await awaitUnlessAborted(refreshGcpCredentialsIfNeeded(signal, credentialPromptContext), signal);
    let [
      { AnthropicGoogleCloud: AnthropicGoogleCloudClient },
      { buildVertexGoogleAuth: buildGoogleCloudAuth },
    ] = await Promise.all([
      import("../../../vendor/_unknown/anthropic-google-cloud-client.js"),
      import("./vertexAuth.js"),
    ]);
    let googleCloudSplitHeaders = splitAuthorizationHeader(clientOptions.defaultHeaders);
    let googleCloudBearerToken = skipGoogleCloudAuth ? googleCloudSplitHeaders.value : undefined;
    let googleCloudOptions = {
      ...clientOptions,
      defaultHeaders: {
        ...googleCloudSplitHeaders.rest,
        ...clearAuthorizationHeaders(),
      },
      ...(skipGoogleCloudAuth
        ? {
            skipAuth: true,
          }
        : {
            googleAuth: await buildGoogleCloudAuth(
              {
                kind: "default",
              },
              undefined,
            ),
          }),
      ...(googleCloudBearerToken && {
        defaultHeaders: {
          ...googleCloudSplitHeaders.rest,
          Authorization: googleCloudBearerToken,
        },
      }),
      ...(isDebugToStdErr() && {
        logger: createStderrLogger(),
      }),
    };
    return new AnthropicGoogleCloudClient(googleCloudOptions);
  }
  if (provider === "mantle") {
    let { AnthropicBedrockMantle } =
      await import("../../../vendor/@anthropic-ai/bedrock-sdk/AnthropicBedrock.lazy.js");
    let CLAUDE_CODE_SKIP_MANTLE_AUTH = env.CLAUDE_CODE_SKIP_MANTLE_AUTH;
    let mantleSplitHeaders = splitAuthorizationHeader(clientOptions.defaultHeaders);
    let mantleBearerToken = CLAUDE_CODE_SKIP_MANTLE_AUTH ? mantleSplitHeaders.value : undefined;
    let trimmed = process.env.AWS_BEARER_TOKEN_BEDROCK?.trim();
    let mantleHostManagedAuth = isHostManagedProviderAuth();
    let mantleAwsCredentials =
      !trimmed && !CLAUDE_CODE_SKIP_MANTLE_AUTH && !mantleHostManagedAuth
        ? await awaitUnlessAborted(refreshAndGetAwsCredentials(signal, credentialPromptContext), signal)
        : null;
    let awsRegionForModel = getAwsRegionForModel(model, awsRegion);
    let any = Object.keys(mantleSplitHeaders.rest).some((key) => key.toLowerCase() === "x-api-key");
    return new AnthropicBedrockMantle({
      ...clientOptions,
      defaultHeaders: trimmed
        ? {
            ...mantleSplitHeaders.rest,
            ...clearAuthorizationHeaders(),
            Authorization: `Bearer ${trimmed}`,
            ...(!any && {
              "X-Api-Key": null,
            }),
          }
        : {
            ...mantleSplitHeaders.rest,
            ...clearAuthorizationHeaders(),
            Authorization: null,
            ...(!CLAUDE_CODE_SKIP_MANTLE_AUTH &&
              !any && {
                "X-Api-Key": null,
              }),
          },
      awsRegion: awsRegionForModel,
      ...(!trimmed &&
        !CLAUDE_CODE_SKIP_MANTLE_AUTH && {
          authToken: null,
        }),
      ...(CLAUDE_CODE_SKIP_MANTLE_AUTH &&
        !mantleBearerToken && {
          skipAuth: true,
        }),
      ...(mantleBearerToken && {
        apiKey: mantleBearerToken.match(/^Bearer (.+)$/i)?.[1] ?? mantleBearerToken,
        defaultHeaders: {
          ...mantleSplitHeaders.rest,
          ...clearAuthorizationHeaders(),
          Authorization: mantleBearerToken,
        },
      }),
      ...(mantleAwsCredentials && {
        awsAccessKey: mantleAwsCredentials.accessKeyId,
        awsSecretAccessKey: mantleAwsCredentials.secretAccessKey,
        awsSessionToken: mantleAwsCredentials.sessionToken,
      }),
      ...(mantleHostManagedAuth &&
        !trimmed &&
        !CLAUDE_CODE_SKIP_MANTLE_AUTH && {
          providerChainResolver: hostManagedAwsSdkCredentials("Mantle").providerChainResolver,
        }),
      ...(!mantleHostManagedAuth &&
        !trimmed &&
        !CLAUDE_CODE_SKIP_MANTLE_AUTH && {
          providerChainResolver: defaultAwsProviderChainResolver(awsRegionForModel),
        }),
      ...(isDebugToStdErr() && {
        logger: createStderrLogger(),
      }),
    });
  }
  if (provider === "vertex") {
    let CLAUDE_CODE_SKIP_VERTEX_AUTH = env.CLAUDE_CODE_SKIP_VERTEX_AUTH;
    let vertexHostManagedAuth = isHostManagedProviderAuth();
    if (!CLAUDE_CODE_SKIP_VERTEX_AUTH && !vertexHostManagedAuth)
      await awaitUnlessAborted(refreshGcpCredentialsIfNeeded(signal, credentialPromptContext), signal);
    let [{ AnthropicVertex: AnthropicVertexClient }, { buildVertexGoogleAuth }] = await Promise.all([
      import("../../../vendor/@anthropic-ai/vertex-sdk/client.js"),
      import("./vertexAuth.js"),
    ]);
    let googleAuth = await buildVertexGoogleAuth(
      CLAUDE_CODE_SKIP_VERTEX_AUTH
        ? {
            kind: "skip",
          }
        : {
            kind: "default",
          },
      getConfiguredVertexProjectId(),
    );
    let vertexSplitHeaders = splitAuthorizationHeader(clientOptions.defaultHeaders);
    let wireAuthorization = CLAUDE_CODE_SKIP_VERTEX_AUTH ? vertexSplitHeaders.value : undefined;
    let vertexOptions = {
      ...clientOptions,
      defaultHeaders: {
        ...vertexSplitHeaders.rest,
        ...vertexResidualCredentialPins(
          CLAUDE_CODE_SKIP_VERTEX_AUTH
            ? {
                wireAuthorization,
                headers: vertexSplitHeaders.rest,
              }
            : false,
        ),
      },
      region: getVertexRegionForModel(model),
      googleAuth,
      ...(isDebugToStdErr() && {
        logger: createStderrLogger(),
      }),
    };
    return suppressVertexAuthRejection(new AnthropicVertexClient(vertexOptions));
  }
  let resolvedApiKey = apiKey || getAnthropicApiKey();
  if (!resolvedApiKey && shouldUseWIFAuth()) {
    let wifTokenCache = await getWIFTokenCache();
    if (wifTokenCache !== null) {
      let wifCredentials = await getWIFCredentials();
      let { rest } = splitAuthorizationHeader(defaultHeaders);
      let baseURL = env.ANTHROPIC_BASE_URL || wifCredentials?.baseURL;
      assertProviderAllowed(provider, baseURL);
      let token = await wifTokenCache.getToken();
      return new Anthropic({
        apiKey: null,
        authToken: token,
        baseURL,
        ...clientOptions,
        defaultHeaders: {
          ...rest,
          ...clearAuthorizationHeaders(),
          Authorization: `Bearer ${token}`,
          ...wifCredentials?.extraHeaders,
          ...identityHeaders(permissionContextHeaderValue, rest),
        },
        ...(isDebugToStdErr() && {
          logger: createStderrLogger(),
        }),
      });
    }
  }
  if (
    !resolvedApiKey &&
    !oauthTokens &&
    !splitAuthorizationHeader(defaultHeaders).value &&
    (await isOAuthRefreshKnownDeadAsync(credentials))
  )
    throw new OAuthRefreshDeadError(await storedLoginReachedTimeLimit(credentials));
  if (isClaudeAiSubscriber) {
    let oAuthAccountOnHold = getOAuthAccountOnHold();
    if (oAuthAccountOnHold) throw new OAuthAccountOnHoldError(oAuthAccountOnHold.url);
    if (
      oauthRefreshOutcome === "lock_timeout" &&
      oauthTokens?.expiresAt != null &&
      Date.now() >= oauthTokens.expiresAt &&
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_sharded_beacon", true)
    )
      throw new OAuthRefreshLockTimeoutError();
  }
  if (isClaudeAiSubscriber && splitAuthorizationHeader(defaultHeaders).value === undefined)
    await settleStoredLoginRefusal();
  let claudeAIOAuthTokens = getClaudeAIOAuthTokens();
  if (
    (oauthTokens && claudeAIOAuthTokens?.accessToken !== oauthTokens.accessToken) ||
    isClaudeAiSubscriber !==
      hasInferenceScope({
        anthropicAuthEnabled: isAnthropicAuthEnabled(),
        oauthScopes: claudeAIOAuthTokens?.scopes,
      }) ||
    (splitAuthorizationHeader(defaultHeaders).value === undefined && hasCustomAuthorizationHeader())
  )
    return getAnthropicClient(options);
  if (splitAuthorizationHeader(defaultHeaders).value === undefined) {
    if (isClaudeAiSubscriber && isStoredLoginRefused())
      throw new StoredLoginHeldBackError(storedLoginRefusalReason());
    if (!options.apiKey && loginSwitchMemo().sessionOwnerHold?.())
      throw new StoredLoginHeldBackError("session_owner");
  }
  let authPair = getAuthCredentialsForClient({
    isSubscriber: isClaudeAiSubscriber,
    apiKey: resolvedApiKey,
    oauthAccessToken: oauthTokens?.accessToken,
  });
  let finalHeaders = {
    ...defaultHeaders,
    ...identityHeaders(permissionContextHeaderValue, defaultHeaders),
  };
  validateAuthHeaders({
    apiKey: authPair.apiKey,
    getApiKeySource: () => {
      let { source } = getAnthropicApiKeyWithSourceSafe({
        skipRetrievingKeyFromApiKeyHelper: true,
      });
      return source === "none" ? "unknown" : source;
    },
    authToken: authPair.authToken,
    getAuthTokenSource: () => {
      let { source } = getAuthTokenSource();
      return source === "CLAUDE_CODE_OAUTH_TOKEN" ||
        source === "CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR" ||
        source === "CCR_OAUTH_TOKEN_FILE"
        ? source
        : "claude.ai";
    },
    defaultHeaders: finalHeaders,
    authorizationSource,
    customHeaderNames: Object.keys(customHeaderMap),
    envSuppliedHeaderNames: new Set(
      [
        containerId && "x-claude-remote-container-id",
        remoteSessionId && "x-claude-remote-session-id",
        clientApp && "x-client-app",
      ].filter((value) => Boolean(value)),
    ),
  });
  if (authPair.authToken && isLauncherHostLoginRefusedNow(authPair.authToken))
    return getAnthropicClient(options);
  let firstPartyClientOptions = {
    apiKey: authPair.apiKey,
    authToken: authPair.authToken,
    ...(env.ANTHROPIC_BASE_URL
      ? {
          baseURL: env.ANTHROPIC_BASE_URL,
        }
      : false),
    ...clientOptions,
    defaultHeaders: finalHeaders,
    ...(isDebugToStdErr() && {
      logger: createStderrLogger(),
    }),
  };
  return new Anthropic(firstPartyClientOptions);
}
//@ chunk-vn3g7zt8.js:287245-287492 layout
/**
 * 把 ANTHROPIC_AUTH_TOKEN 或 apiKeyHelper 的令牌写成 Authorization: Bearer，返回来源名；都没有返回 null。
 */
async function applyAuthTokenHeader(defaultHeaders, isNonInteractiveSession) {
  let bareModeNoKey =
    isBareMode() &&
    getAnthropicApiKeyWithSourceSafe({
      skipRetrievingKeyFromApiKeyHelper: true,
    }).source === "none";
  let ANTHROPIC_AUTH_TOKEN = isAntBuild() && !bareModeNoKey ? undefined : env.ANTHROPIC_AUTH_TOKEN;
  let token = ANTHROPIC_AUTH_TOKEN || (await getApiKeyFromApiKeyHelper(isNonInteractiveSession));
  if (token) {
    defaultHeaders.Authorization = `Bearer ${token}`;
    return ANTHROPIC_AUTH_TOKEN ? "ANTHROPIC_AUTH_TOKEN" : "apiKeyHelper";
  }
  return null;
}
//@ chunk-vn3g7zt8.js:287492-288160 layout
/**
 * 各提供商的 base URL：bedrock/mantle/anthropicAws/Google Cloud/vertex/foundry/gateway/firstParty（ANTHROPIC_BASE_URL 或配置的 BASE_API_URL），可用对应 *_BASE_URL 覆盖。
 */
function getProviderBaseUrl(provider, model, awsRegion) {
  switch (provider) {
    case "bedrock":
      return (
        process.env.ANTHROPIC_BEDROCK_BASE_URL ||
        `https://bedrock-runtime.${getAwsRegionForModel(model, awsRegion)}.amazonaws.com`
      );
    case "mantle":
      return (
        process.env.ANTHROPIC_BEDROCK_MANTLE_BASE_URL ||
        `https://bedrock-mantle.${getAwsRegionForModel(model, awsRegion)}.api.aws`
      );
    case "anthropicAws":
      return (
        process.env.ANTHROPIC_AWS_BASE_URL ||
        `https://aws-external-anthropic.${getDefaultAwsRegion()}.api.aws`
      );
    case "anthropicGoogleCloud":
      return env.ANTHROPIC_GOOGLE_CLOUD_BASE_URL || "https://claude.googleapis.com";
    case "vertex":
      return (
        process.env.ANTHROPIC_VERTEX_BASE_URL || getVertexBaseUrlForRegion(getVertexRegionForModel(model))
      );
    case "foundry":
      return getFoundryBaseUrl();
    case "gateway":
      return getGatewayAuth()?.url;
    case "firstParty":
      return process.env.ANTHROPIC_BASE_URL || getOauthConfig().BASE_API_URL;
  }
}
//@ chunk-vn3g7zt8.js:288160-288335 layout
/**
 * 小快模型且设置了 ANTHROPIC_SMALL_FAST_MODEL_AWS_REGION 时用该区域，否则用给定或默认 AWS 区域。
 */
function getAwsRegionForModel(model, awsRegion) {
  let region = nonEmptyOrUndefined(env.ANTHROPIC_SMALL_FAST_MODEL_AWS_REGION);
  if (model && region && hasDedicatedSmallFastModel()) {
    let smallFastModel = getSmallFastModel();
    if (
      smallFastModel !== getMainLoopModel() &&
      getCanonicalName(model, {
        identity: true,
      }) ===
        getCanonicalName(smallFastModel, {
          identity: true,
        })
    )
      return region;
  }
  return awsRegion ?? getDefaultAwsRegion();
}
//@ chunk-vn3g7zt8.js:288335-288470 layout
/**
 * 从头对象里分离出 Authorization（大小写不敏感），返回 {value, rest}。
 */
function splitAuthorizationHeader(defaultHeaders) {
  let rest = {};
  let value;
  for (let [key, value_2] of Object.entries(defaultHeaders))
    if (key.toLowerCase() === "authorization") value = value_2;
    else rest[key] = value_2;
  return {
    value,
    rest,
  };
}
//@ chunk-vn3g7zt8.js:288470-288517 layout
/**
 * ANTHROPIC_CUSTOM_HEADERS 里是否带 Authorization。
 */
function hasCustomAuthorizationHeader() {
  return splitAuthorizationHeader(getCustomHeaderMap()).value !== undefined;
}
//@ chunk-vn3g7zt8.js:288517-288971 layout
/**
 * ANTHROPIC_CUSTOM_HEADERS 转对象（组织禁用实验 beta 时丢弃 anthropic-beta）；桌面版加 anthropic-client-platform/version；cowork 报名时加 x-cowork-enrollment。
 */
function getCustomHeaderMap() {
  let out = {};
  for (let [name, value] of getCustomHeaders()) {
    if (name.toLowerCase() === "anthropic-beta" && isHipaaOrg()) {
      logForDebugging(
        "ANTHROPIC_CUSTOM_HEADERS anthropic-beta ignored: experimental betas are disabled by your organization's policy",
        {
          level: "debug",
        },
      );
      continue;
    }
    out[name] = value;
  }
  let desktopVersion = desktopEntrypointSetting();
  if (desktopVersion && !Object.keys(out).some((key) => /^anthropic-client-(platform|version)$/i.test(key))) {
    out["anthropic-client-platform"] = "desktop_app";
    out["anthropic-client-version"] = desktopVersion;
  }
  let coworkEnrollment = getCoworkEnrollment();
  if (coworkEnrollment !== undefined) out[X_COWORK_ENROLLMENT] = coworkEnrollment;
  return out;
}
//@ chunk-vn3g7zt8.js:288971-289018 layout
/**
 * 流空闲超时：max(配置值, 300s)。
 */
function getStreamIdleTimeoutMs() {
  return Math.max(getConfiguredStreamIdleTimeoutMs() ?? 0, 300000);
}
//@ chunk-vn3g7zt8.js:289018-289175 layout
/**
 * CLAUDE_STREAM_IDLE_TIMEOUT_MS 或托管配置 stream_idle_timeout_ms（上限 30 分钟）。
 */
function getConfiguredStreamIdleTimeoutMs() {
  let numberWithSeparators = parseNumberWithSeparators(process.env.CLAUDE_STREAM_IDLE_TIMEOUT_MS);
  if (numberWithSeparators > 0) return numberWithSeparators;
  let managedTimeoutSetting = getManagedTimeoutSetting("stream_idle_timeout_ms");
  return managedTimeoutSetting === undefined ? undefined : Math.min(managedTimeoutSetting, MAX_TIMEOUT_MS);
}
//@ chunk-vn3g7zt8.js:289175-289236 layout
/**
 * API_TIMEOUT_MS 或托管配置 api_timeout_ms。
 */
function getApiTimeoutMs() {
  return env.API_TIMEOUT_MS ?? getManagedTimeoutSetting("api_timeout_ms");
}
//@ chunk-vn3g7zt8.js:289236-289338 layout
/**
 * 读托管网络配置里的整数超时项（1e4 到 int32 之间才有效）。
 */
function getManagedTimeoutSetting(settingName) {
  let value = getManagedNetworkConfig()?.[settingName];
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= MIN_TIMEOUT_MS &&
    value <= MAX_TIMER_DELAY_MS
    ? value
    : undefined;
}
//@ chunk-vn3g7zt8.js:289338-289375 layout
/**
 * 托管网络配置对象（未启用时 null）。
 */
function getManagedNetworkConfig() {
  return providerReadsClientData() ? getCachedClientData() : null;
}
//@ chunk-vn3g7zt8.js:289375-289407 layout
/**
 * 1e4 / 1800000 / 180000：超时下限、上限、第一方字节流空闲默认。
 */
var MIN_TIMEOUT_MS = 1e4;
var MAX_TIMEOUT_MS = 1800000;
var FIRST_PARTY_BYTE_IDLE_TIMEOUT_MS = 180000;
//@ chunk-vn3g7zt8.js:289407-289704 layout
/**
 * 字节流空闲超时：CLAUDE_BYTE_STREAM_IDLE_TIMEOUT_MS；第一方默认 180s（GrowthBook tengu_byte_stream_idle_timeout_ms），夹在 10s–30min。
 */
function getByteStreamIdleTimeoutMs(provider) {
  let streamIdleTimeoutMs = getStreamIdleTimeoutMs();
  let numberWithSeparators = parseNumberWithSeparators(process.env.CLAUDE_BYTE_STREAM_IDLE_TIMEOUT_MS);
  let configured = getConfiguredStreamIdleTimeoutMs() !== undefined;
  if (Number.isFinite(numberWithSeparators) && numberWithSeparators > 0)
    streamIdleTimeoutMs = numberWithSeparators;
  else if (!configured && provider === "firstParty") {
    streamIdleTimeoutMs = FIRST_PARTY_BYTE_IDLE_TIMEOUT_MS;
    let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
      "tengu_byte_stream_idle_timeout_ms",
      FIRST_PARTY_BYTE_IDLE_TIMEOUT_MS,
    );
    if (
      typeof featureValue_CACHED_MAY_BE_STALE === "number" &&
      Number.isFinite(featureValue_CACHED_MAY_BE_STALE) &&
      featureValue_CACHED_MAY_BE_STALE > 0
    )
      streamIdleTimeoutMs = featureValue_CACHED_MAY_BE_STALE;
  }
  return Math.min(Math.max(streamIdleTimeoutMs, MIN_TIMEOUT_MS), MAX_TIMEOUT_MS);
}
//@ chunk-vn3g7zt8.js:289704-289746 layout
/**
 * 直连 Anthropic 端点时按提供商取字节流空闲超时，否则用通用值。
 */
function getByteIdleTimeoutForProvider(provider) {
  return getByteStreamIdleTimeoutMs(isDirectAnthropicEndpoint(provider) ? provider : undefined);
}
//@ chunk-vn3g7zt8.js:289746-289868 layout
/**
 * 首字节超时：CLAUDE_STREAM_FIRST_BYTE_TIMEOUT_MS（夹在 10s–30min）或字节流空闲超时。
 */
function getFirstByteTimeoutMs(provider) {
  let CLAUDE_STREAM_FIRST_BYTE_TIMEOUT_MS = env.CLAUDE_STREAM_FIRST_BYTE_TIMEOUT_MS;
  if (CLAUDE_STREAM_FIRST_BYTE_TIMEOUT_MS !== undefined)
    return Math.min(Math.max(CLAUDE_STREAM_FIRST_BYTE_TIMEOUT_MS, MIN_TIMEOUT_MS), MAX_TIMEOUT_MS);
  return getByteIdleTimeoutForProvider(provider);
}
//@ chunk-vn3g7zt8.js:289868-289897 layout
/**
 * 32768 / 1000 / 5000：请求体每 32KB 首字节窗口加 1s；心跳间隔 1s；超过 5s 的心跳间隔算作睡眠。
 */
var FIRST_BYTE_BYTES_PER_EXTRA_SECOND = 32768;
var SLEEP_PROBE_INTERVAL_MS = 1000;
var SLEEP_GAP_THRESHOLD_MS = 5000;
//@ chunk-vn3g7zt8.js:289897-289984 layout
/**
 * 记录某 client-request-id 需要首字节看门狗（是否已升级）。
 */
function armFirstByteWatchdog(clientRequestId, { escalated }) {
  streamFallbackWarning().streamFirstByteArmedRequestIds.set(clientRequestId, {
    escalated,
  });
}
//@ chunk-vn3g7zt8.js:289984-290094 layout
/**
 * 取出并删除该请求的首字节看门狗标记。
 */
function takeFirstByteWatchdogArm(clientRequestId) {
  if (clientRequestId === undefined) return;
  let streamFirstByteArmedRequestIds = streamFallbackWarning().streamFirstByteArmedRequestIds;
  let arm = streamFirstByteArmedRequestIds.get(clientRequestId);
  streamFirstByteArmedRequestIds.delete(clientRequestId);
  return arm;
}
//@ chunk-vn3g7zt8.js:290094-290132 layout
/**
 * "/invoke-with-response-stream"。
 */
var BEDROCK_STREAM_PATH = "/invoke-with-response-stream";
//@ chunk-vn3g7zt8.js:290132-290811 layout
/**
 * 计算首字节窗口：基础首字节超时 + 请求体大小附加，受 API 超时约束；返回 {escalated, firstWindowMs, retryWindowMs}，不适用时 undefined。
 */
function getFirstByteWatchdogPlan({
  clientRequestId,
  provider,
  routedProvider,
  method,
  url,
  body,
  noResponseRetryLedger,
}) {
  let isGatewayStream =
    routedProvider === "gateway" &&
    noResponseRetryLedger !== undefined &&
    env.CLAUDE_STREAM_FIRST_BYTE_TIMEOUT_MS !== undefined &&
    isByteWatchdogEnabled() &&
    method === "POST" &&
    isMessagesEndpoint(url);
  let escalation = isGatewayStream
    ? {
        escalated: noResponseRetryLedger.count > 0,
      }
    : takeFirstByteWatchdogArm(clientRequestId);
  let bedrockStream =
    escalation === undefined &&
    provider === "bedrock" &&
    method === "POST" &&
    url.includes(BEDROCK_STREAM_PATH);
  if (
    (escalation === undefined && !bedrockStream) ||
    (!isGatewayStream && !shouldUseBodyIdleWatchdog(routedProvider))
  )
    return;
  let bodyBytes =
    typeof body === "string" ? Buffer.byteLength(body) : isSerialisedBody(body) ? body.length : 0;
  let extraMs = Math.ceil(bodyBytes / FIRST_BYTE_BYTES_PER_EXTRA_SECOND) * 1000;
  let apiTimeout = getApiTimeoutMs() ?? 600000;
  let capped = apiTimeout <= 0 ? 1 / 0 : apiTimeout - 1000;
  if (capped < MIN_TIMEOUT_MS) return;
  let windowMs = getFirstByteTimeoutMs(provider) + extraMs;
  let min = Math.min(windowMs, capped);
  if (escalation === undefined)
    return {
      escalated: false,
      firstWindowMs: min,
      retryWindowMs: min,
    };
  let retryWindowMs = Number.isFinite(capped) ? capped : Math.max(windowMs, MAX_RETRY_WINDOW_MS + extraMs);
  return {
    escalated: escalation.escalated,
    firstWindowMs: min,
    retryWindowMs,
  };
}
//@ chunk-vn3g7zt8.js:290811-291549 layout
/**
 * 包装 fetch：窗口内未收到响应头就中止（检测到系统睡眠则抛 StreamSuspendedError），记 tengu_api_no_response_timeout。
 */
async function fetchWithFirstByteTimeout(fetchImpl, url, init, deadline, clock = systemClock) {
  let timeoutMs = retryWindowFor(deadline);
  let abortController = new AbortController();
  let signal = init.signal ?? undefined;
  let signal_2 = signal ? AbortSignal.any([signal, abortController.signal]) : abortController.signal;
  let timeoutError;
  let lastSampleAt = clock.now();
  let sleptMs = 0;
  let sampleSleepGap = () => {
    let now = clock.now();
    let elapsedMs = now - lastSampleAt;
    lastSampleAt = now;
    if (elapsedMs > SLEEP_GAP_THRESHOLD_MS) sleptMs += elapsedMs;
  };
  let probeTimer = clock.setTimeout(probe, SLEEP_PROBE_INTERVAL_MS, {
    unref: true,
  });
  function probe() {
    sampleSleepGap();
    probeTimer = clock.setTimeout(probe, SLEEP_PROBE_INTERVAL_MS, {
      unref: true,
    });
  }
  let deadlineTimer = clock.setTimeout(() => {
    sampleSleepGap();
    timeoutError =
      sleptMs > timeoutMs / 2
        ? new StreamSuspendedError(sleptMs)
        : new StreamNoResponseError(deadline, sleptMs);
    abortController.abort(timeoutError);
  }, timeoutMs);
  try {
    return await fetchImpl(url, {
      ...init,
      signal: signal_2,
    });
  } catch (error) {
    if (timeoutError !== undefined && !signal?.aborted) {
      try {
        logForDebugging(
          `[first-byte] no response headers ${timeoutMs / 1000}s after dispatch${sleptMs > 0 ? ` (slept ${sleptMs}ms)` : ""} \u2014 aborting request`,
          {
            level: "error",
          },
        );
        logEvent("tengu_api_no_response_timeout", {
          provider: getAPIProviderForAnalytics(),
          timeout_ms: timeoutMs,
          ...(!isDiskless() && {
            slept_ms: sleptMs,
            suspended: timeoutError instanceof StreamSuspendedError,
          }),
          escalated: deadline.escalated,
        });
      } catch (error) {
        logError(error);
      }
      throw timeoutError;
    }
    throw error;
  } finally {
    deadlineTimer();
    probeTimer();
  }
}
//@ chunk-vn3g7zt8.js:291549-291841 layout
/**
 * 字节流空闲超时错误：记录空闲时长、已收字节、TTFB、是否在等读取、cf-ray、睡眠时长。
 */
class StreamIdleTimeoutError extends Error {
  idleMs;
  bytesReceived;
  ttfbMs;
  bodyReadPending;
  cfRay;
  sleptMs;
  constructor(idleMs, bytesReceived = 0, ttfbMs, bodyReadPending = true, cfRay, sleptMs = 0) {
    super(`stream idle: no bytes for ${idleMs}ms`);
    this.name = "StreamIdleTimeoutError";
    this.idleMs = idleMs;
    this.bytesReceived = bytesReceived;
    this.ttfbMs = ttfbMs;
    this.bodyReadPending = bodyReadPending;
    this.cfRay = cfRay;
    this.sleptMs = sleptMs;
  }
}
//@ chunk-vn3g7zt8.js:291841-292050 layout
/**
 * 看门狗检测到系统挂起时的错误（中止后换新连接重试）。
 */
class StreamSuspendedError extends Error {
  sleptMs;
  code = "StreamSuspended";
  constructor(sleptMs) {
    super("Stream watchdog detected system suspend; aborting to retry on a fresh connection");
    this.sleptMs = sleptMs;
    this.name = "StreamSuspendedError";
  }
}
//@ chunk-vn3g7zt8.js:292050-292248 layout
/**
 * 计时器触发的迟到量与墙钟睡眠量，判定是否跨越系统挂起。
 */
function measureTimerLateness(clock, { armedAt, wallArmedAt, idleMs }) {
  let monotonicNow = clock.monotonicNow();
  let wallNow = clock.now();
  let rounded = Math.round(monotonicNow - armedAt - idleMs);
  let max = Math.max(0, Math.round(wallNow - wallArmedAt - (monotonicNow - armedAt)));
  let lateByTimer = rounded < -idleMs / 2;
  let wallAhead = max > idleMs / 2;
  return {
    lateMs: rounded,
    sleptMs: max,
    suspended: lateByTimer && wallAhead,
  };
}
//@ chunk-vn3g7zt8.js:292248-292481 layout
/**
 * 流空闲计时器跨越睡眠触发时返回 StreamSuspendedError。
 */
function checkSuspendedStreamIdle(clock, timing) {
  try {
    let { lateMs, sleptMs, suspended } = measureTimerLateness(clock, timing);
    if (!suspended) return;
    logForDebugging(
      `Streaming idle timer fired across sleep/suspend: late=${lateMs}ms slept=${sleptMs}ms, aborting stream`,
      {
        level: "warn",
      },
    );
    return new StreamSuspendedError(sleptMs);
  } catch (error) {
    logError(toError(error));
    return;
  }
}
//@ chunk-vn3g7zt8.js:292481-293122 layout
/**
 * Bedrock 流式响应 content-type 不是 application/vnd.amazon.eventstream 时抛出（多半有网关改写了响应）。
 */
let BedrockUnexpectedContentTypeError; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (../../utils/errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-vn3g7zt8.js:292481", () => {
  BedrockUnexpectedContentTypeError = class BedrockUnexpectedContentTypeError extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {
    contentType;
    code = "BedrockUnexpectedContentType";
    constructor(contentType) {
      super(
        `Bedrock streaming response has content-type ${JSON.stringify(contentType)}; expected "application/vnd.amazon.eventstream". A gateway or proxy between ` +
          "Claude Code and Bedrock is likely transforming the response body \u2014 Bedrock's " +
          "binary event-stream format must be passed through unmodified. Set CLAUDE_CODE_DISABLE_BEDROCK_CONTENT_TYPE_GUARD=1 to suppress this check while the gateway is being fixed.",
        "Bedrock streaming response content-type is not application/vnd.amazon.eventstream",
      );
      this.contentType = contentType;
      this.name = "BedrockUnexpectedContentTypeError";
    }
  };
});
//@ chunk-vn3g7zt8.js:293122-295002 layout
/**
 * 包装响应体 ReadableStream：每块重置空闲计时，超时报 StreamIdleTimeoutError（或挂起时 StreamSuspendedError），并按 15/30/60/120s 记录部分停顿日志。
 */
function withByteIdleWatchdog(body, idleMs, cfRay, progress, clock = systemClock, slackFloorMs = 0) {
  let slackMs = clipSlackMs(slackFloorMs, idleMs / 100);
  let idleTimer = null;
  let pollTimer = null;
  let checkpointStep = 0;
  let bytesReceived = 0;
  let startedAt = clock.monotonicNow();
  let firstByteAt = null;
  let bodyReadPending = false;
  let stallCheckpointMs = [15000, 30000, 60000, 120000];
  let clearPollTimer = () => {
    if (pollTimer !== null) {
      pollTimer();
      pollTimer = null;
    }
  };
  let clearIdleTimer = () => {
    if (idleTimer !== null) {
      idleTimer();
      idleTimer = null;
    }
  };
  let clearTimers = () => {
    clearIdleTimer();
    clearPollTimer();
  };
  let lastChunkAt = 0;
  let lastChunkWallMs = 0;
  let armPollTimer = (pollController) => {
    clearPollTimer();
    if (checkpointStep >= stallCheckpointMs.length) return;
    let checkpointMs = stallCheckpointMs[checkpointStep];
    let sinceLastChunkMs = clock.monotonicNow() - lastChunkAt;
    pollTimer = clock.setTimeout(
      () => {
        pollTimer = null;
        if (pollController.desiredSize === null) return;
        if (clock.monotonicNow() - lastChunkAt < checkpointMs / 2) {
          armPollTimer(pollController);
          return;
        }
        try {
          logForDebugging(
            `[Stall] stream_idle_partial lastChunkAgeMs=${Math.round(clock.monotonicNow() - lastChunkAt)} bytesTotal=${bytesReceived} idleDeadlineMs=${idleMs}`,
            {
              level: "warn",
            },
          );
        } catch {}
        checkpointStep++;
        armPollTimer(pollController);
      },
      Math.max(0, checkpointMs - sinceLastChunkMs),
      {
        unref: true,
      },
    );
  };
  let armIdleTimer = (streamController) => {
    if (slackMs > 0 && idleTimer !== null && slackStillFresh(clock, lastChunkAt, lastChunkWallMs, slackMs))
      return;
    clearTimers();
    lastChunkAt = clock.monotonicNow();
    lastChunkWallMs = clock.now();
    checkpointStep = 0;
    armPollTimer(streamController);
    idleTimer = clock.setTimeout(() => {
      idleTimer = null;
      let { lateMs, sleptMs, suspended } = measureTimerLateness(clock, {
        armedAt: lastChunkAt,
        wallArmedAt: lastChunkWallMs,
        idleMs,
      });
      let readableErrored = streamController.desiredSize === null;
      if (suspended) {
        logForDebugging(`[byte-watchdog] aborting: late=${lateMs}ms slept=${sleptMs}ms (sleep/suspend)`);
        let suspendedError = new StreamSuspendedError(sleptMs);
        try {
          streamController.error(suspendedError);
        } catch {}
        reader.cancel(suspendedError).catch(() => {});
        return;
      }
      let ttfbMs = firstByteAt !== null ? Math.round(firstByteAt - startedAt) : undefined;
      try {
        logForDebugging(
          `[byte-watchdog] firing: idle=${idleMs}ms late=${lateMs}ms errored=${readableErrored} bodyReadPending=${bodyReadPending}`,
          {
            level: "warn",
          },
        );
        logForDiagnosticsNoPII("warn", "cli_byte_watchdog_fired", {
          idle_ms: idleMs,
          late_ms: lateMs,
          readable_errored: readableErrored,
          body_read_pending: bodyReadPending,
          slept_ms: sleptMs,
          bytes_received: bytesReceived,
          ttfb_ms: ttfbMs ?? null,
          rearm_slack_ms: slackMs,
        });
        if (lateMs >= 1000 && !isDiskless())
          logEvent("tengu_byte_watchdog_fired_late", {
            idle_ms: idleMs,
            late_ms: lateMs,
            readable_errored: readableErrored,
          });
      } catch {}
      let idleTimeoutError = new StreamIdleTimeoutError(
        idleMs,
        bytesReceived,
        ttfbMs,
        bodyReadPending,
        cfRay,
        sleptMs,
      );
      try {
        streamController.error(idleTimeoutError);
      } catch {}
      reader.cancel(idleTimeoutError).catch(() => {});
    }, idleMs);
  };
  let reader = body.getReader();
  return new ReadableStream({
    start(startController) {
      armIdleTimer(startController);
    },
    async pull(pullController) {
      bodyReadPending = true;
      let readResult;
      try {
        readResult = await reader.read();
      } catch (error) {
        bodyReadPending = false;
        clearTimers();
        try {
          pullController.error(error);
        } catch {}
        return;
      }
      bodyReadPending = false;
      if (readResult.done) {
        clearTimers();
        try {
          pullController.close();
        } catch {}
        return;
      }
      let chunk = readResult.value;
      if (firstByteAt === null && chunk.byteLength > 0) firstByteAt = clock.monotonicNow();
      bytesReceived += chunk.byteLength;
      if (progress) {
        progress.lastAt = clock.monotonicNow();
        progress.chunks = (progress.chunks ?? 0) + 1;
      }
      armIdleTimer(pullController);
      try {
        pullController.enqueue(chunk);
      } catch {
        clearTimers();
      }
    },
    cancel(cancelReason) {
      clearTimers();
      return reader.cancel(cancelReason);
    },
  });
}
//@ chunk-vn3g7zt8.js:295002-295123 layout
/**
 * CLAUDE_ENABLE_BYTE_WATCHDOG 或 tengu_stream_watchdog_default_on（默认开）。
 */
function isByteWatchdogEnabled() {
  let CLAUDE_ENABLE_BYTE_WATCHDOG = env.CLAUDE_ENABLE_BYTE_WATCHDOG;
  if (CLAUDE_ENABLE_BYTE_WATCHDOG !== undefined) return CLAUDE_ENABLE_BYTE_WATCHDOG;
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_stream_watchdog_default_on", true);
}
//@ chunk-vn3g7zt8.js:295123-295225 layout
/**
 * 第一方且是 Anthropic 官方 API，或 anthropicAws 未设自定义 base URL。
 */
function isDirectAnthropicEndpoint(provider) {
  return (
    (provider === "firstParty" && isFirstPartyAnthropicBaseUrl()) ||
    (provider === "anthropicAws" && !process.env.ANTHROPIC_AWS_BASE_URL)
  );
}
//@ chunk-vn3g7zt8.js:295225-295299 layout
/**
 * firstParty/gateway/anthropicAws（响应为 text/event-stream）。
 */
function isSseProvider(provider) {
  return provider === "firstParty" || provider === "gateway" || provider === "anthropicAws";
}
//@ chunk-vn3g7zt8.js:295299-295336 layout
/**
 * 字节看门狗开启且当前提供商是 SSE 类（firstParty/gateway/anthropicAws）。
 */
function isStreamWatchdogApplicable() {
  return isByteWatchdogEnabled() && isSseProvider(getAPIProvider());
}
//@ chunk-vn3g7zt8.js:295336-295395 layout
/**
 * CLAUDE_ENABLE_BYTE_WATCHDOG_BEDROCK。
 */
function isBedrockByteWatchdogEnabled() {
  return env.CLAUDE_ENABLE_BYTE_WATCHDOG_BEDROCK;
}
//@ chunk-vn3g7zt8.js:295395-295444 layout
/**
 * 提供商支持字节看门狗：直连 Anthropic 端点，或 Bedrock 且开启了 Bedrock 看门狗。
 */
function supportsByteWatchdog(provider) {
  return isDirectAnthropicEndpoint(provider) || (provider === "bedrock" && isBedrockByteWatchdogEnabled());
}
//@ chunk-vn3g7zt8.js:295444-295501 layout
/**
 * 看门狗开启且路由提供商与当前提供商都支持时为真（传给代理层，避免重复的 body 空闲超时）。
 */
function shouldUseBodyIdleWatchdog(provider) {
  if (!isByteWatchdogEnabled()) return false;
  return supportsByteWatchdog(provider) && supportsByteWatchdog(getAPIProvider());
}
//@ chunk-vn3g7zt8.js:295501-295596 layout (2.1.88 match: getServerUrl, 1)
/**
 * 用新 body 重建 Response 并保留 url。旧版名 getServerUrl 为错配。
 */
function cloneResponseWithBody(response, body) {
  let response_2 = new Response(body, response);
  Object.defineProperty(response_2, "url", {
    value: response.url,
  });
  return response_2;
}
//@ chunk-vn3g7zt8.js:295596-298419 callgraph-fingerprint (2.1.88 match: buildFetch, 0.179)
/**
 * 包装 fetch（旧版 buildFetch）：第一方直连时补 x-client-request-id、拒答回退相关头、anthropic-usage-limit、tools-used 头；打 [API REQUEST] 日志；大请求体 gzip 压缩；按需加首字节看门狗；Bedrock 流缺 content-type 时补默认值、类型不对抛 BedrockUnexpectedContentTypeError；SSE/eventstream 响应体加字节空闲看门狗。
 */
function buildFetch(
  fetchOverride,
  source,
  querySource,
  routedProvider,
  storageV5,
  clock,
  noResponseRetryLedger,
  sender,
  classKey,
) {
  let fetchFn = fetchOverride ?? fetchWithRequestBodyCompression;
  let provider = getAPIProvider();
  let isDirectEndpoint = isDirectAnthropicEndpoint(provider);
  return async (input, init) => {
    let headers = new Headers(init?.headers);
    let requestUrl = input instanceof Request ? input.url : String(input);
    let { method } = requestMethodAndUrl(input, init);
    guardTestFetch(fetchFn, method, requestUrl);
    let incomingRequestId = headers.get(CLIENT_REQUEST_ID_HEADER) ?? undefined;
    if (isDirectEndpoint && !headers.has(CLIENT_REQUEST_ID_HEADER))
      headers.set(CLIENT_REQUEST_ID_HEADER, randomUUID());
    if (
      isDirectEndpoint &&
      ((hasRefusalFallbackOccurred() && isSilentFallbackArmed()) || hasRefusalFallbackHeaderArmed())
    ) {
      headers.set(REFUSAL_FALLBACK_HEADERS, "true");
      let latchOriginRequestId = sanitizeHeaderValue(getRefusalFallbackLatchOriginRequestId());
      if (latchOriginRequestId !== undefined) headers.set(X_CC_FALLBACK_LATCHED_BY, latchOriginRequestId);
    }
    if (isMessagesEndpoint(requestUrl) && isFirstPartyApiBackend() && isLowPriorityActiveSafe())
      headers.set(ANTHROPIC_USAGE_LIMIT, SLOW);
    if (isDirectEndpoint) {
      let requestAtis = getRequestAtis();
      if (requestAtis !== undefined) headers.set(ATIS_REQUEST_HEADER, requestAtis);
    }
    if (isMessagesEndpoint(requestUrl))
      try {
        if (isOfficialFirstPartyEndpoint(provider) && isSillyShoreGateOn()) {
          headers.set(SANDY_PLOVER_HEADER, toolsUsedHeaderBuilder(getConversationToolsUsed()));
          if (streamFallbackWarning().once("tools_used_header")) logFeatureOk("api_tools_used_header");
        }
      } catch {}
    try {
      let id = headers.get(CLIENT_REQUEST_ID_HEADER);
      logForDebugging(
        `[API REQUEST] ${new URL(requestUrl).pathname}${id ? ` ${CLIENT_REQUEST_ID_HEADER}=${id}` : ""} source=${source ?? "unknown"}`,
      );
      if (getMinDebugLogLevel() === "verbose")
        logForDebugging(`[API REQUEST AUTH] ${jsonStringify(summarizeAuthHeadersForLog(headers))}`, {
          level: "verbose",
        });
    } catch {}
    if (sender && isDirectEndpoint && isMessagesEndpoint(requestUrl))
      await attachSenderAddress(headers, sender);
    let requestInit = {
      ...init,
      headers,
    };
    let body = init?.body;
    let dispatchAt = takeDispatchAt(incomingRequestId);
    let gzipPlan = ANT_KEY_PFX(requestUrl, body, storageV5);
    let shouldCompress = gzipPlan?.gzip && (typeof body === "string" || isSerialisedBody(body));
    let gzipLevel = shouldCompress ? gzipLevelOverride() : undefined;
    if (shouldCompress) {
      requestInit.compress =
        gzipLevel === undefined
          ? "gzip"
          : {
              encoding: "gzip",
              level: gzipLevel,
            };
      logGzipSent();
      requestInit.body =
        typeof body === "string" ? appendWatermark(body) : appendWatermarkBuffer(body, "room_after_is_free");
    }
    if (incomingRequestId !== undefined && gzipPlan !== undefined) {
      let timingTelemetry = {
        ...(dispatchAt !== undefined && {
          requestPrepareMs: Math.round(performance.now() - dispatchAt),
        }),
        ...reuseTelemetry(body),
      };
      recordGzipBlockTelemetry(
        incomingRequestId,
        gzipPlan.gzip
          ? {
              requestBodyEncoding: "gzip",
              requestBodyChars: gzipPlan.bodyChars,
              requestBodyGzipLevel: gzipLevel,
              querySource,
              ...timingTelemetry,
            }
          : {
              requestBodyEncoding: "identity",
              requestBodyChars: gzipPlan.bodyChars,
              gzipSkipReason: gzipPlan.reason,
              ...timingTelemetry,
            },
      );
    }
    let firstByteWatchdogPlan = getFirstByteWatchdogPlan({
      clientRequestId: incomingRequestId,
      provider,
      routedProvider,
      method,
      url: requestUrl,
      body,
      noResponseRetryLedger,
    });
    let checkFirstPartyOptions = (init) => {
      try {
        return shouldUseFirstPartyFetchOptions({
          provider,
          routedProvider,
          url: requestUrl,
          init,
        });
      } catch (error) {
        logError(toError(error));
        return false;
      }
    };
    let dispatchState = {
      init: requestInit,
      firstParty: false,
    };
    let dispatch = (init) => {
      dispatchState.init = init;
      dispatchState.firstParty = checkFirstPartyOptions(init);
      return firstByteWatchdogPlan === undefined
        ? fetchFn(input, init)
        : fetchWithFirstByteTimeout(fetchFn, input, init, firstByteWatchdogPlan, clock);
    };
    let isModelRequest = isDirectEndpoint && isMessagesEndpoint(requestUrl);
    if (isModelRequest) noteModelRequestSent(clock.now());
    let response = await dispatch(requestInit);
    guardTestFetchRedirect(fetchFn, method, response);
    if (shouldCompress) {
      response = await handleGzipRejectedResponse(response, () => dispatch(requestInit));
      response = await retryRejectedGzipRequest({
        res: response,
        dispatch,
        finalInit: requestInit,
        identityBody: body,
        clientRequestId: incomingRequestId,
        storageV5,
      });
    }
    let isFirstPartyResponse = dispatchState.firstParty && isSameUnredirectedUrl(response, requestUrl);
    if (isModelRequest)
      markArmedFromResponse(
        response.headers,
        () => provider !== "firstParty" || isOfficialFirstPartyEndpoint(provider),
      );
    let isBedrockStream = provider === "bedrock" && response.ok && requestUrl.includes(BEDROCK_STREAM_PATH);
    if (
      isBedrockStream &&
      response.body &&
      !response.headers.get("content-type") &&
      !env.CLAUDE_CODE_DISABLE_BEDROCK_CONTENT_TYPE_DEFAULT
    ) {
      response = cloneResponseWithBody(response, response.body);
      response.headers.set("content-type", "application/vnd.amazon.eventstream");
    }
    let contentType = response.headers.get("content-type");
    let lower = contentType?.toLowerCase();
    if (
      isBedrockStream &&
      contentType &&
      !lower?.includes("vnd.amazon.eventstream") &&
      !env.CLAUDE_CODE_DISABLE_BEDROCK_CONTENT_TYPE_GUARD
    ) {
      response.body?.cancel().catch(() => {});
      throw new BedrockUnexpectedContentTypeError(contentType);
    }
    let isSse = (isSseProvider(provider) || isDirectEndpoint) && lower?.includes("text/event-stream");
    let isBedrockEventStream =
      provider === "bedrock" && lower?.includes("vnd.amazon.eventstream") && isBedrockByteWatchdogEnabled();
    if ((isSse || isBedrockEventStream) && response.body && isByteWatchdogEnabled()) {
      let byteIdleTimeoutForProvider = getByteIdleTimeoutForProvider(provider);
      let cfRay =
        response.headers.get("cf-ray") ??
        (isBedrockEventStream ? (response.headers.get("x-amzn-requestid") ?? undefined) : undefined);
      let chunkTimes = {
        lastAt: 0,
      };
      let byteChunkTimes = classKey === "main";
      let isMainClass = !isSse ? 0 : byteChunkTimes ? mainReplyHoldMs() : heldReplyHoldMs(classKey);
      let watchedResponse = cloneResponseWithBody(
        response,
        withByteIdleWatchdog(
          isMainClass <= 0
            ? response.body
            : byteChunkTimes
              ? wrapWithUnwatchedHold_2(response.body, isMainClass, clock)
              : wrapWithUnwatchedHold(response.body, isMainClass, clock),
          byteIdleTimeoutForProvider,
          cfRay,
          chunkTimes,
          clock,
          streamTimerSlackMs(),
        ),
      );
      Object.defineProperty(watchedResponse, "_chunkTimes", {
        value: chunkTimes,
      });
      response = watchedResponse;
    }
    if (isFirstPartyResponse && checkFirstPartyOptions(dispatchState.init))
      markFirstPartyFetch(response.headers);
    return response;
  };
}
//@ chunk-vn3g7zt8.js:298419-298632 sole-consumer
/**
 * 调试日志用：Authorization 只保留方案名（"Bearer ***"），并列出 anthropic-beta 与 x-anthropic-* 头。
 */
function summarizeAuthHeadersForLog(headers) {
  let authorization = headers.get("authorization");
  let auth = authorization
    ? `${authorization.includes(" ") ? firstLineOf(authorization, " ") : "<opaque>"} ***`
    : "none";
  let out = {};
  headers.forEach((value, name) => {
    if (name === "anthropic-beta" || name.startsWith("x-anthropic-")) out[name] = value;
  });
  return {
    auth,
    headers: out,
  };
}
//@ chunk-vn3g7zt8.js:298632-298705 sole-consumer
/**
 * 等待 promise，完成后若 signal 已中止则抛 AbortError。
 */
async function awaitUnlessAborted(promise, signal) {
  let value = await promise;
  if (signal?.aborted) throw new APIUserAbortError();
  return value;
}
export {
  getAnthropicClient,
  getApiTimeoutMs,
  CLIENT_REQUEST_ID_HEADER,
  isStreamWatchdogApplicable,
  checkSuspendedStreamIdle,
  armFirstByteWatchdog,
  shouldUseBodyIdleWatchdog,
  getStreamIdleTimeoutMs,
  getByteIdleTimeoutForProvider,
  StreamIdleTimeoutError,
  StreamSuspendedError,
  getToolNameList,
  configureApiKeyHeaders,
  hasCustomAuthorizationHeader,
  getCustomHeaders,
  getCustomHeaderMap,
};
