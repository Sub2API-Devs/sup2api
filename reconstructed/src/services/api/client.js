/**
 * services/api/client.ts
 *
 * 创建 Anthropic SDK 客户端（第一方/网关/Bedrock/Mantle/Foundry/AnthropicAws/Google Cloud/Vertex）：组装默认请求头、认证、超时与代理，并用 buildFetch 包装 fetch（x-client-request-id、请求体 gzip、首字节与字节流看门狗、Bedrock 内容类型守卫）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/api/client.ts
 * pieces: chunk-bwbq4xvm.js (1), chunk-hwmsct5x.js (42), chunk-vv0zxx69.js (1)
 * attribution: fingerprint 5, layout 36, callgraph-fingerprint 1, sole-consumer 2
 */
import { randomUUID } from "crypto";
import { systemClock } from "../../utils/sleep.js";
import { isCcsCoworkSurface, desktopEntrypointSetting } from "../../utils/entrypointKinds.js";
import { env } from "../../utils/env.js";
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
  attachSenderAddress,
  heldReplyHoldMs,
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
  getOAuthAccountOnHold,
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
  isSnugMittenAndSillyShoreOn,
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
import { jsonStringify } from "../../utils/slowOperations.js";
import { ANT_KEY_PFX } from "../teamMemorySync/secretScanner.js";
import { appendWatermark, appendWatermarkBuffer } from "../analytics/eventSerialization.js";
import {
  shouldUseFirstPartyFetchOptions,
  isSameUnredirectedUrl,
  markFirstPartyFetch,
} from "./fetchOptions.js";
import { wrapWithUnwatchedHold } from "./unwatchedReplyHold.js";
import { firstLineOf } from "../../utils/stringUtils.js";
import { APIUserAbortError } from "../../../vendor/@anthropic-ai/sdk/core/error.mjs";

//@ chunk-hwmsct5x.js:241005-241035 fingerprint = CLIENT_REQUEST_ID_HEADER (1)
/**
 * 请求头名 x-client-request-id（第一方请求时由 buildFetch 生成 UUID）。
 */
var CLIENT_REQUEST_ID_HEADER = "x-client-request-id";
//@ chunk-hwmsct5x.js:270380-270646 fingerprint = createStderrLogger (1)
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
//@ chunk-hwmsct5x.js:270646-270723 layout = isSessionContainerCompatible (0.828)
/**
 * 工具列表转名字：有 name 用 name，否则 mcp__<type>。旧版名 isSessionContainerCompatible 为错配。
 */
function getToolNameList(e, messages = []) {
  return e.map((s) => ("name" in s ? s.name : `mcp__${s.type}`));
}
//@ chunk-hwmsct5x.js:270723-280488 fingerprint = getAnthropicClient (0.44)
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
    let { AnthropicBedrock } = await import("./chunk-h87x8cg3.js");
    let resolvedFetch = getAwsRegionForModel(model, awsRegion);
    let CLAUDE_CODE_SKIP_BEDROCK_AUTH = env.CLAUDE_CODE_SKIP_BEDROCK_AUTH;
    let he = splitAuthorizationHeader(clientOptions.defaultHeaders);
    let any = Object.keys(he.rest).some((key) => key.toLowerCase() === "x-api-key");
    let He = {
      ...he.rest,
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
    let Ee = trimmed ? `Bearer ${trimmed}` : CLAUDE_CODE_SKIP_BEDROCK_AUTH ? he.value : undefined;
    let Sn = isHostManagedProviderAuth();
    let En =
      !Ee && !CLAUDE_CODE_SKIP_BEDROCK_AUTH && !Sn
        ? await awaitUnlessAborted(refreshAndGetAwsCredentials(signal, credentialPromptContext), signal)
        : null;
    let $l = {
      ...clientOptions,
      defaultHeaders: He,
      awsRegion: resolvedFetch,
      apiKey: null,
      ...(CLAUDE_CODE_SKIP_BEDROCK_AUTH &&
        !Ee && {
          skipAuth: true,
        }),
      ...(Ee && {
        apiKey: Ee.match(/^Bearer (.+)$/i)?.[1] ?? Ee,
        defaultHeaders: {
          ...He,
          Authorization: Ee,
          ...(CLAUDE_CODE_SKIP_BEDROCK_AUTH && apiKeyHeaderFromEnv(he.rest)),
        },
      }),
      ...(Sn &&
        !Ee &&
        !CLAUDE_CODE_SKIP_BEDROCK_AUTH && {
          providerChainResolver: hostManagedAwsSdkCredentials("Bedrock").providerChainResolver,
        }),
      ...(!Sn &&
        !Ee &&
        !CLAUDE_CODE_SKIP_BEDROCK_AUTH && {
          providerChainResolver: defaultAwsProviderChainResolver(resolvedFetch),
        }),
      ...(isDebugToStdErr() && {
        logger: createStderrLogger(),
      }),
    };
    return En
      ? new AnthropicBedrock({
          ...$l,
          awsAccessKey: En.accessKeyId,
          awsSecretKey: En.secretAccessKey,
          awsSessionToken: En.sessionToken,
        })
      : new AnthropicBedrock($l);
  }
  if (provider === "foundry") {
    let { AnthropicFoundry } = await import("./chunk-q01xm7xp.js");
    let azureADTokenProvider;
    let we = false;
    if (env.ANTHROPIC_FOUNDRY_AUTH_TOKEN)
      azureADTokenProvider = async () => env.ANTHROPIC_FOUNDRY_AUTH_TOKEN ?? "";
    else if (!process.env.ANTHROPIC_FOUNDRY_API_KEY)
      if (env.CLAUDE_CODE_SKIP_FOUNDRY_AUTH) {
        we = true;
        azureADTokenProvider = () => Promise.resolve("skip-foundry-auth");
      } else if (isHostManagedProviderAuth()) throw hostManagedNoCredsError("Foundry");
      else {
        let { DefaultAzureCredential: AzureCredential, getBearerTokenProvider } =
          await import("./chunk-mrx6y2r5.js");
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
    let ce = splitAuthorizationHeader(clientOptions.defaultHeaders);
    let He = {
      ...clientOptions,
      ...(ANTHROPIC_FOUNDRY_RESOURCE !== undefined && {
        resource: ANTHROPIC_FOUNDRY_RESOURCE,
      }),
      defaultHeaders: {
        ...ce.rest,
        ...clearAuthorizationHeaders(),
        Authorization: null,
      },
      ...(azureADTokenProvider && {
        azureADTokenProvider,
        apiKey: null,
        defaultHeaders: we
          ? {
              ...ce.rest,
              ...(ce.value !== undefined && {
                Authorization: ce.value,
              }),
            }
          : {
              ...ce.rest,
              ...clearAuthorizationHeaders(),
            },
      }),
      ...(isDebugToStdErr() && {
        logger: createStderrLogger(),
      }),
    };
    return new AnthropicFoundry(He);
  }
  if (provider === "anthropicAws") {
    let { AnthropicAws } = await import("./chunk-qhhcfyds.js");
    let CLAUDE_CODE_SKIP_ANTHROPIC_AWS_AUTH = env.CLAUDE_CODE_SKIP_ANTHROPIC_AWS_AUTH;
    let awsRegion = await resolveAwsRegion();
    let he = splitAuthorizationHeader(clientOptions.defaultHeaders);
    let ce = CLAUDE_CODE_SKIP_ANTHROPIC_AWS_AUTH ? he.value : undefined;
    let He = Object.entries(he.rest).findLast(([key]) => key.toLowerCase() === "anthropic-workspace-id")?.[1];
    let Me = {
      ...clientOptions,
      awsRegion,
      ...(He &&
        env.ANTHROPIC_AWS_WORKSPACE_ID && {
          workspaceId: He,
        }),
      defaultHeaders: {
        ...he.rest,
        ...clearAuthorizationHeaders(),
        Authorization: null,
      },
      ...(!CLAUDE_CODE_SKIP_ANTHROPIC_AWS_AUTH && {
        authToken: null,
      }),
      ...(CLAUDE_CODE_SKIP_ANTHROPIC_AWS_AUTH &&
        !ce && {
          skipAuth: true,
        }),
      ...(ce && {
        apiKey: ce.match(/^Bearer (.+)$/i)?.[1] ?? ce,
        defaultHeaders: {
          ...he.rest,
          ...clearAuthorizationHeaders(),
          Authorization: ce,
        },
      }),
      ...(isDebugToStdErr() && {
        logger: createStderrLogger(),
      }),
    };
    if (!process.env.ANTHROPIC_AWS_API_KEY && !CLAUDE_CODE_SKIP_ANTHROPIC_AWS_AUTH)
      if (isHostManagedProviderAuth())
        Me.providerChainResolver = hostManagedAwsSdkCredentials("Anthropic-on-AWS").providerChainResolver;
      else {
        let Ee = await awaitUnlessAborted(
          refreshAndGetAwsCredentials(signal, credentialPromptContext),
          signal,
        );
        if (Ee) {
          Me.awsAccessKey = Ee.accessKeyId;
          Me.awsSecretAccessKey = Ee.secretAccessKey;
          Me.awsSessionToken = Ee.sessionToken;
        } else Me.providerChainResolver = defaultAwsProviderChainResolver(awsRegion);
      }
    return new AnthropicAws(Me);
  }
  if (provider === "anthropicGoogleCloud") {
    assertGcpPathSegment("ANTHROPIC_GOOGLE_CLOUD_PROJECT", env.ANTHROPIC_GOOGLE_CLOUD_PROJECT);
    assertGcpPathSegment("ANTHROPIC_GOOGLE_CLOUD_LOCATION", env.ANTHROPIC_GOOGLE_CLOUD_LOCATION);
    assertGcpPathSegment("ANTHROPIC_GOOGLE_CLOUD_WORKSPACE_ID", env.ANTHROPIC_GOOGLE_CLOUD_WORKSPACE_ID);
    assertGcpPathSegment("GCLOUD_PROJECT", env.GCLOUD_PROJECT);
    assertGcpPathSegment("GOOGLE_CLOUD_PROJECT", env.GOOGLE_CLOUD_PROJECT);
    assertGcpPathSegment("gcloud_project", env.gcloud_project);
    assertGcpPathSegment("google_cloud_project", env.google_cloud_project);
    let re = env.CLAUDE_CODE_SKIP_ANTHROPIC_GOOGLE_CLOUD_AUTH;
    let le = isHostManagedProviderAuth();
    if (!re && !le)
      await awaitUnlessAborted(refreshGcpCredentialsIfNeeded(signal, credentialPromptContext), signal);
    let [{ AnthropicGoogleCloud: we }, { buildVertexGoogleAuth: he }] = await Promise.all([
      import("./chunk-e7naa6k8.js"),
      import("./chunk-hdpbq2vw.js"),
    ]);
    let ce = splitAuthorizationHeader(clientOptions.defaultHeaders);
    let He = re ? ce.value : undefined;
    let Me = {
      ...clientOptions,
      defaultHeaders: {
        ...ce.rest,
        ...clearAuthorizationHeaders(),
      },
      ...(re
        ? {
            skipAuth: true,
          }
        : {
            googleAuth: await he(
              {
                kind: "default",
              },
              undefined,
            ),
          }),
      ...(He && {
        defaultHeaders: {
          ...ce.rest,
          Authorization: He,
        },
      }),
      ...(isDebugToStdErr() && {
        logger: createStderrLogger(),
      }),
    };
    return new we(Me);
  }
  if (provider === "mantle") {
    let { AnthropicBedrockMantle } = await import("./chunk-h87x8cg3.js");
    let CLAUDE_CODE_SKIP_MANTLE_AUTH = env.CLAUDE_CODE_SKIP_MANTLE_AUTH;
    let we = splitAuthorizationHeader(clientOptions.defaultHeaders);
    let he = CLAUDE_CODE_SKIP_MANTLE_AUTH ? we.value : undefined;
    let trimmed = process.env.AWS_BEARER_TOKEN_BEDROCK?.trim();
    let He = isHostManagedProviderAuth();
    let Me =
      !trimmed && !CLAUDE_CODE_SKIP_MANTLE_AUTH && !He
        ? await awaitUnlessAborted(refreshAndGetAwsCredentials(signal, credentialPromptContext), signal)
        : null;
    let awsRegionForModel = getAwsRegionForModel(model, awsRegion);
    let any = Object.keys(we.rest).some((key) => key.toLowerCase() === "x-api-key");
    return new AnthropicBedrockMantle({
      ...clientOptions,
      defaultHeaders: trimmed
        ? {
            ...we.rest,
            ...clearAuthorizationHeaders(),
            Authorization: `Bearer ${trimmed}`,
            ...(!any && {
              "X-Api-Key": null,
            }),
          }
        : {
            ...we.rest,
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
        !he && {
          skipAuth: true,
        }),
      ...(he && {
        apiKey: he.match(/^Bearer (.+)$/i)?.[1] ?? he,
        defaultHeaders: {
          ...we.rest,
          ...clearAuthorizationHeaders(),
          Authorization: he,
        },
      }),
      ...(Me && {
        awsAccessKey: Me.accessKeyId,
        awsSecretAccessKey: Me.secretAccessKey,
        awsSessionToken: Me.sessionToken,
      }),
      ...(He &&
        !trimmed &&
        !CLAUDE_CODE_SKIP_MANTLE_AUTH && {
          providerChainResolver: hostManagedAwsSdkCredentials("Mantle").providerChainResolver,
        }),
      ...(!He &&
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
    let le = isHostManagedProviderAuth();
    if (!CLAUDE_CODE_SKIP_VERTEX_AUTH && !le)
      await awaitUnlessAborted(refreshGcpCredentialsIfNeeded(signal, credentialPromptContext), signal);
    let [{ AnthropicVertex: we }, { buildVertexGoogleAuth: he }] = await Promise.all([
      import("./chunk-xa96axyz.js"),
      import("./chunk-hdpbq2vw.js"),
    ]);
    let googleAuth = await he(
      CLAUDE_CODE_SKIP_VERTEX_AUTH
        ? {
            kind: "skip",
          }
        : {
            kind: "default",
          },
      getConfiguredVertexProjectId(),
    );
    let He = splitAuthorizationHeader(clientOptions.defaultHeaders);
    let wireAuthorization = CLAUDE_CODE_SKIP_VERTEX_AUTH ? He.value : undefined;
    let Ee = {
      ...clientOptions,
      defaultHeaders: {
        ...He.rest,
        ...vertexResidualCredentialPins(
          CLAUDE_CODE_SKIP_VERTEX_AUTH
            ? {
                wireAuthorization,
                headers: He.rest,
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
    return suppressVertexAuthRejection(new we(Ee));
  }
  let resolvedApiKey = apiKey || getAnthropicApiKey();
  if (!resolvedApiKey && shouldUseWIFAuth()) {
    let wifTokenCache = await getWIFTokenCache();
    if (wifTokenCache !== null) {
      let wifCredentials = await getWIFCredentials();
      let { rest } = splitAuthorizationHeader(defaultHeaders);
      let he = env.ANTHROPIC_BASE_URL || wifCredentials?.baseURL;
      assertProviderAllowed(provider, he);
      let token = await wifTokenCache.getToken();
      return new Anthropic({
        apiKey: null,
        authToken: token,
        baseURL: he,
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
    throw new OAuthRefreshDeadError();
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
  if (
    isClaudeAiSubscriber &&
    splitAuthorizationHeader(defaultHeaders).value === undefined &&
    isStoredLoginRefused()
  )
    throw new StoredLoginHeldBackError(storedLoginRefusalReason());
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
      ].filter((re) => Boolean(re)),
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
//@ chunk-hwmsct5x.js:280488-280735 layout
/**
 * 把 ANTHROPIC_AUTH_TOKEN 或 apiKeyHelper 的令牌写成 Authorization: Bearer，返回来源名；都没有返回 null。
 */
async function applyAuthTokenHeader(defaultHeaders, isNonInteractiveSession) {
  let r =
    isBareMode() &&
    getAnthropicApiKeyWithSourceSafe({
      skipRetrievingKeyFromApiKeyHelper: true,
    }).source === "none";
  let ANTHROPIC_AUTH_TOKEN = isAntBuild() && !r ? undefined : env.ANTHROPIC_AUTH_TOKEN;
  let y = ANTHROPIC_AUTH_TOKEN || (await getApiKeyFromApiKeyHelper(isNonInteractiveSession));
  if (y) {
    defaultHeaders.Authorization = `Bearer ${y}`;
    return ANTHROPIC_AUTH_TOKEN ? "ANTHROPIC_AUTH_TOKEN" : "apiKeyHelper";
  }
  return null;
}
//@ chunk-hwmsct5x.js:280735-281403 layout
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
//@ chunk-hwmsct5x.js:281403-281578 layout
/**
 * 小快模型且设置了 ANTHROPIC_SMALL_FAST_MODEL_AWS_REGION 时用该区域，否则用给定或默认 AWS 区域。
 */
function getAwsRegionForModel(model, awsRegion) {
  let r = nonEmptyOrUndefined(env.ANTHROPIC_SMALL_FAST_MODEL_AWS_REGION);
  if (model && r && hasDedicatedSmallFastModel()) {
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
      return r;
  }
  return awsRegion ?? getDefaultAwsRegion();
}
//@ chunk-hwmsct5x.js:281578-281713 layout
/**
 * 从头对象里分离出 Authorization（大小写不敏感），返回 {value, rest}。
 */
function splitAuthorizationHeader(defaultHeaders) {
  let n = {};
  let value;
  for (let [key, value_2] of Object.entries(defaultHeaders))
    if (key.toLowerCase() === "authorization") value = value_2;
    else n[key] = value_2;
  return {
    value,
    rest: n,
  };
}
//@ chunk-hwmsct5x.js:281713-281760 layout
/**
 * ANTHROPIC_CUSTOM_HEADERS 里是否带 Authorization。
 */
function hasCustomAuthorizationHeader() {
  return splitAuthorizationHeader(getCustomHeaderMap()).value !== undefined;
}
//@ chunk-hwmsct5x.js:281760-282214 layout
/**
 * ANTHROPIC_CUSTOM_HEADERS 转对象（组织禁用实验 beta 时丢弃 anthropic-beta）；桌面版加 anthropic-client-platform/version；cowork 报名时加 x-cowork-enrollment。
 */
function getCustomHeaderMap() {
  let e = {};
  for (let [s, h] of getCustomHeaders()) {
    if (s.toLowerCase() === "anthropic-beta" && isHipaaOrg()) {
      logForDebugging(
        "ANTHROPIC_CUSTOM_HEADERS anthropic-beta ignored: experimental betas are disabled by your organization's policy",
        {
          level: "debug",
        },
      );
      continue;
    }
    e[s] = h;
  }
  let n = desktopEntrypointSetting();
  if (n && !Object.keys(e).some((key) => /^anthropic-client-(platform|version)$/i.test(key))) {
    e["anthropic-client-platform"] = "desktop_app";
    e["anthropic-client-version"] = n;
  }
  let coworkEnrollment = getCoworkEnrollment();
  if (coworkEnrollment !== undefined) e[X_COWORK_ENROLLMENT] = coworkEnrollment;
  return e;
}
//@ chunk-hwmsct5x.js:282214-282261 layout
/**
 * 流空闲超时：max(配置值, 300s)。
 */
function getStreamIdleTimeoutMs() {
  return Math.max(getConfiguredStreamIdleTimeoutMs() ?? 0, 300000);
}
//@ chunk-hwmsct5x.js:282261-282418 layout
/**
 * CLAUDE_STREAM_IDLE_TIMEOUT_MS 或托管配置 stream_idle_timeout_ms（上限 30 分钟）。
 */
function getConfiguredStreamIdleTimeoutMs() {
  let numberWithSeparators = parseNumberWithSeparators(process.env.CLAUDE_STREAM_IDLE_TIMEOUT_MS);
  if (numberWithSeparators > 0) return numberWithSeparators;
  let managedTimeoutSetting = getManagedTimeoutSetting("stream_idle_timeout_ms");
  return managedTimeoutSetting === undefined ? undefined : Math.min(managedTimeoutSetting, MAX_TIMEOUT_MS);
}
//@ chunk-hwmsct5x.js:282418-282479 layout
/**
 * API_TIMEOUT_MS 或托管配置 api_timeout_ms。
 */
function getApiTimeoutMs() {
  return env.API_TIMEOUT_MS ?? getManagedTimeoutSetting("api_timeout_ms");
}
//@ chunk-hwmsct5x.js:282479-282581 layout
/**
 * 读托管网络配置里的整数超时项（1e4 到 int32 之间才有效）。
 */
function getManagedTimeoutSetting(e) {
  let n = getManagedNetworkConfig()?.[e];
  return typeof n === "number" && Number.isInteger(n) && n >= MIN_TIMEOUT_MS && n <= MAX_TIMER_DELAY_MS
    ? n
    : undefined;
}
//@ chunk-hwmsct5x.js:282581-282618 layout
/**
 * 托管网络配置对象（未启用时 null）。
 */
function getManagedNetworkConfig() {
  return providerReadsClientData() ? getCachedClientData() : null;
}
//@ chunk-hwmsct5x.js:282618-282650 layout
/**
 * 1e4 / 1800000 / 180000：超时下限、上限、第一方字节流空闲默认。
 */
var MIN_TIMEOUT_MS = 1e4;
var MAX_TIMEOUT_MS = 1800000;
var FIRST_PARTY_BYTE_IDLE_TIMEOUT_MS = 180000;
//@ chunk-hwmsct5x.js:282650-282947 layout
/**
 * 字节流空闲超时：CLAUDE_BYTE_STREAM_IDLE_TIMEOUT_MS；第一方默认 180s（GrowthBook tengu_byte_stream_idle_timeout_ms），夹在 10s–30min。
 */
function getByteStreamIdleTimeoutMs(e) {
  let streamIdleTimeoutMs = getStreamIdleTimeoutMs();
  let numberWithSeparators = parseNumberWithSeparators(process.env.CLAUDE_BYTE_STREAM_IDLE_TIMEOUT_MS);
  let h = getConfiguredStreamIdleTimeoutMs() !== undefined;
  if (Number.isFinite(numberWithSeparators) && numberWithSeparators > 0)
    streamIdleTimeoutMs = numberWithSeparators;
  else if (!h && e === "firstParty") {
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
//@ chunk-hwmsct5x.js:282947-282989 layout
/**
 * 直连 Anthropic 端点时按提供商取字节流空闲超时，否则用通用值。
 */
function getByteIdleTimeoutForProvider(apiProvider) {
  return getByteStreamIdleTimeoutMs(isDirectAnthropicEndpoint(apiProvider) ? apiProvider : undefined);
}
//@ chunk-hwmsct5x.js:282989-283111 layout
/**
 * 首字节超时：CLAUDE_STREAM_FIRST_BYTE_TIMEOUT_MS（夹在 10s–30min）或字节流空闲超时。
 */
function getFirstByteTimeoutMs(provider) {
  let CLAUDE_STREAM_FIRST_BYTE_TIMEOUT_MS = env.CLAUDE_STREAM_FIRST_BYTE_TIMEOUT_MS;
  if (CLAUDE_STREAM_FIRST_BYTE_TIMEOUT_MS !== undefined)
    return Math.min(Math.max(CLAUDE_STREAM_FIRST_BYTE_TIMEOUT_MS, MIN_TIMEOUT_MS), MAX_TIMEOUT_MS);
  return getByteIdleTimeoutForProvider(provider);
}
//@ chunk-hwmsct5x.js:283111-283140 layout
/**
 * 32768 / 1000 / 5000：请求体每 32KB 首字节窗口加 1s；心跳间隔 1s；超过 5s 的心跳间隔算作睡眠。
 */
var FIRST_BYTE_BYTES_PER_EXTRA_SECOND = 32768;
var SLEEP_PROBE_INTERVAL_MS = 1000;
var SLEEP_GAP_THRESHOLD_MS = 5000;
//@ chunk-hwmsct5x.js:283140-283227 layout
/**
 * 记录某 client-request-id 需要首字节看门狗（是否已升级）。
 */
function armFirstByteWatchdog(e, { escalated }) {
  streamFallbackWarning().streamFirstByteArmedRequestIds.set(e, {
    escalated,
  });
}
//@ chunk-hwmsct5x.js:283227-283337 layout
/**
 * 取出并删除该请求的首字节看门狗标记。
 */
function takeFirstByteWatchdogArm(clientRequestId) {
  if (clientRequestId === undefined) return;
  let streamFirstByteArmedRequestIds = streamFallbackWarning().streamFirstByteArmedRequestIds;
  let r = streamFirstByteArmedRequestIds.get(clientRequestId);
  streamFirstByteArmedRequestIds.delete(clientRequestId);
  return r;
}
//@ chunk-hwmsct5x.js:283337-283375 layout
/**
 * "/invoke-with-response-stream"。
 */
var BEDROCK_STREAM_PATH = "/invoke-with-response-stream";
//@ chunk-hwmsct5x.js:283375-284054 layout
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
  let S =
    routedProvider === "gateway" &&
    noResponseRetryLedger !== undefined &&
    env.CLAUDE_STREAM_FIRST_BYTE_TIMEOUT_MS !== undefined &&
    isByteWatchdogEnabled() &&
    method === "POST" &&
    isMessagesEndpoint(url);
  let E = S
    ? {
        escalated: noResponseRetryLedger.count > 0,
      }
    : takeFirstByteWatchdogArm(clientRequestId);
  let R = E === undefined && provider === "bedrock" && method === "POST" && url.includes(BEDROCK_STREAM_PATH);
  if ((E === undefined && !R) || (!S && !shouldUseBodyIdleWatchdog(routedProvider))) return;
  let L = typeof body === "string" ? Buffer.byteLength(body) : isSerialisedBody(body) ? body.length : 0;
  let O = Math.ceil(L / FIRST_BYTE_BYTES_PER_EXTRA_SECOND) * 1000;
  let M = getApiTimeoutMs() ?? 600000;
  let P = M <= 0 ? 1 / 0 : M - 1000;
  if (P < MIN_TIMEOUT_MS) return;
  let H = getFirstByteTimeoutMs(provider) + O;
  let min = Math.min(H, P);
  if (E === undefined)
    return {
      escalated: false,
      firstWindowMs: min,
      retryWindowMs: min,
    };
  let retryWindowMs = Number.isFinite(P) ? P : Math.max(H, MAX_RETRY_WINDOW_MS + O);
  return {
    escalated: E.escalated,
    firstWindowMs: min,
    retryWindowMs,
  };
}
//@ chunk-hwmsct5x.js:284054-284792 layout
/**
 * 包装 fetch：窗口内未收到响应头就中止（检测到系统睡眠则抛 StreamSuspendedError），记 tengu_api_no_response_timeout。
 */
async function fetchWithFirstByteTimeout(e, n, r, deadline, h = systemClock) {
  let y = retryWindowFor(deadline);
  let abortController = new AbortController();
  let signal = r.signal ?? undefined;
  let signal_2 = signal ? AbortSignal.any([signal, abortController.signal]) : abortController.signal;
  let R;
  let L = h.now();
  let sleptMs = 0;
  let M = () => {
    let z = h.now();
    let G = z - L;
    L = z;
    if (G > SLEEP_GAP_THRESHOLD_MS) sleptMs += G;
  };
  let P = h.setTimeout(H, SLEEP_PROBE_INTERVAL_MS, {
    unref: true,
  });
  function H() {
    M();
    P = h.setTimeout(H, SLEEP_PROBE_INTERVAL_MS, {
      unref: true,
    });
  }
  let j = h.setTimeout(() => {
    M();
    R = sleptMs > y / 2 ? new StreamSuspendedError(sleptMs) : new StreamNoResponseError(deadline, sleptMs);
    abortController.abort(R);
  }, y);
  try {
    return await e(n, {
      ...r,
      signal: signal_2,
    });
  } catch (error) {
    if (R !== undefined && !signal?.aborted) {
      try {
        logForDebugging(
          `[first-byte] no response headers ${y / 1000}s after dispatch${sleptMs > 0 ? ` (slept ${sleptMs}ms)` : ""} \u2014 aborting request`,
          {
            level: "error",
          },
        );
        logEvent("tengu_api_no_response_timeout", {
          provider: getAPIProviderForAnalytics(),
          timeout_ms: y,
          ...(!isDiskless() && {
            slept_ms: sleptMs,
            suspended: R instanceof StreamSuspendedError,
          }),
          escalated: deadline.escalated,
        });
      } catch (error) {
        logError(error);
      }
      throw R;
    }
    throw error;
  } finally {
    j();
    P();
  }
}
//@ chunk-hwmsct5x.js:284792-285084 layout
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
  constructor(e, bytesReceived = 0, ttfbMs, bodyReadPending = true, cfRay, sleptMs = 0) {
    super(`stream idle: no bytes for ${e}ms`);
    this.name = "StreamIdleTimeoutError";
    this.idleMs = e;
    this.bytesReceived = bytesReceived;
    this.ttfbMs = ttfbMs;
    this.bodyReadPending = bodyReadPending;
    this.cfRay = cfRay;
    this.sleptMs = sleptMs;
  }
}
//@ chunk-hwmsct5x.js:285084-285293 layout
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
//@ chunk-hwmsct5x.js:285293-285491 layout
/**
 * 计时器触发的迟到量与墙钟睡眠量，判定是否跨越系统挂起。
 */
function measureTimerLateness(e, { armedAt, wallArmedAt, idleMs }) {
  let h = e.monotonicNow();
  let y = e.now();
  let rounded = Math.round(h - armedAt - idleMs);
  let max = Math.max(0, Math.round(y - wallArmedAt - (h - armedAt)));
  let E = rounded < -idleMs / 2;
  let R = max > idleMs / 2;
  return {
    lateMs: rounded,
    sleptMs: max,
    suspended: E && R,
  };
}
//@ chunk-hwmsct5x.js:285491-285724 layout
/**
 * 流空闲计时器跨越睡眠触发时返回 StreamSuspendedError。
 */
function checkSuspendedStreamIdle(clock, n) {
  try {
    let { lateMs, sleptMs, suspended } = measureTimerLateness(clock, n);
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
//@ chunk-hwmsct5x.js:285724-286365 layout
/**
 * Bedrock 流式响应 content-type 不是 application/vnd.amazon.eventstream 时抛出（多半有网关改写了响应）。
 */
class BedrockUnexpectedContentTypeError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  contentType;
  code = "BedrockUnexpectedContentType";
  constructor(e) {
    super(
      `Bedrock streaming response has content-type ${JSON.stringify(e)}; expected "application/vnd.amazon.eventstream". A gateway or proxy between ` +
        "Claude Code and Bedrock is likely transforming the response body \u2014 Bedrock's " +
        "binary event-stream format must be passed through unmodified. Set CLAUDE_CODE_DISABLE_BEDROCK_CONTENT_TYPE_GUARD=1 to suppress this check while the gateway is being fixed.",
      "Bedrock streaming response content-type is not application/vnd.amazon.eventstream",
    );
    this.contentType = e;
    this.name = "BedrockUnexpectedContentTypeError";
  }
}
//@ chunk-hwmsct5x.js:286365-288145 layout
/**
 * 包装响应体 ReadableStream：每块重置空闲计时，超时报 StreamIdleTimeoutError（或挂起时 StreamSuspendedError），并按 15/30/60/120s 记录部分停顿日志。
 */
function withByteIdleWatchdog(e, byteIdleTimeoutForProvider, cfRay, s, h = systemClock) {
  let y = null;
  let w = null;
  let S = 0;
  let bytesReceived = 0;
  let R = h.monotonicNow();
  let L = null;
  let bodyReadPending = false;
  let M = [15000, 30000, 60000, 120000];
  let P = () => {
    if (w !== null) {
      w();
      w = null;
    }
  };
  let H = () => {
    if (y !== null) {
      y();
      y = null;
    }
  };
  let j = () => {
    H();
    P();
  };
  let z = 0;
  let wallArmedAt = 0;
  let q = (Q) => {
    P();
    if (S >= M.length) return;
    let ne = M[S];
    let te = h.monotonicNow() - z;
    w = h.setTimeout(
      () => {
        w = null;
        if (Q.desiredSize === null) return;
        if (h.monotonicNow() - z < ne / 2) {
          q(Q);
          return;
        }
        try {
          logForDebugging(
            `[Stall] stream_idle_partial lastChunkAgeMs=${Math.round(h.monotonicNow() - z)} bytesTotal=${bytesReceived} idleDeadlineMs=${byteIdleTimeoutForProvider}`,
            {
              level: "warn",
            },
          );
        } catch {}
        S++;
        q(Q);
      },
      Math.max(0, ne - te),
      {
        unref: true,
      },
    );
  };
  let J = (Q) => {
    j();
    z = h.monotonicNow();
    wallArmedAt = h.now();
    S = 0;
    q(Q);
    y = h.setTimeout(() => {
      y = null;
      let { lateMs, sleptMs, suspended } = measureTimerLateness(h, {
        armedAt: z,
        wallArmedAt,
        idleMs: byteIdleTimeoutForProvider,
      });
      let oe = Q.desiredSize === null;
      if (suspended) {
        logForDebugging(`[byte-watchdog] aborting: late=${lateMs}ms slept=${sleptMs}ms (sleep/suspend)`);
        let De = new StreamSuspendedError(sleptMs);
        try {
          Q.error(De);
        } catch {}
        reader.cancel(De).catch(() => {});
        return;
      }
      let ttfbMs = L !== null ? Math.round(L - R) : undefined;
      try {
        logForDebugging(
          `[byte-watchdog] firing: idle=${byteIdleTimeoutForProvider}ms late=${lateMs}ms errored=${oe} bodyReadPending=${bodyReadPending}`,
          {
            level: "warn",
          },
        );
        logForDiagnosticsNoPII("warn", "cli_byte_watchdog_fired", {
          idle_ms: byteIdleTimeoutForProvider,
          late_ms: lateMs,
          readable_errored: oe,
          body_read_pending: bodyReadPending,
          slept_ms: sleptMs,
          bytes_received: bytesReceived,
          ttfb_ms: ttfbMs ?? null,
        });
        if (lateMs >= 1000 && !isDiskless())
          logEvent("tengu_byte_watchdog_fired_late", {
            idle_ms: byteIdleTimeoutForProvider,
            late_ms: lateMs,
            readable_errored: oe,
          });
      } catch {}
      let Se = new StreamIdleTimeoutError(
        byteIdleTimeoutForProvider,
        bytesReceived,
        ttfbMs,
        bodyReadPending,
        cfRay,
        sleptMs,
      );
      try {
        Q.error(Se);
      } catch {}
      reader.cancel(Se).catch(() => {});
    }, byteIdleTimeoutForProvider);
  };
  let reader = e.getReader();
  return new ReadableStream({
    start(Q) {
      J(Q);
    },
    async pull(Q) {
      bodyReadPending = true;
      let ne;
      try {
        ne = await reader.read();
      } catch (error) {
        bodyReadPending = false;
        j();
        try {
          Q.error(error);
        } catch {}
        return;
      }
      bodyReadPending = false;
      if (ne.done) {
        j();
        try {
          Q.close();
        } catch {}
        return;
      }
      let te = ne.value;
      if (L === null && te.byteLength > 0) L = h.monotonicNow();
      bytesReceived += te.byteLength;
      if (s) {
        s.lastAt = h.monotonicNow();
        s.chunks = (s.chunks ?? 0) + 1;
      }
      J(Q);
      try {
        Q.enqueue(te);
      } catch {
        j();
      }
    },
    cancel(Q) {
      j();
      return reader.cancel(Q);
    },
  });
}
//@ chunk-hwmsct5x.js:288145-288266 layout
/**
 * CLAUDE_ENABLE_BYTE_WATCHDOG 或 tengu_stream_watchdog_default_on（默认开）。
 */
function isByteWatchdogEnabled() {
  let CLAUDE_ENABLE_BYTE_WATCHDOG = env.CLAUDE_ENABLE_BYTE_WATCHDOG;
  if (CLAUDE_ENABLE_BYTE_WATCHDOG !== undefined) return CLAUDE_ENABLE_BYTE_WATCHDOG;
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_stream_watchdog_default_on", true);
}
//@ chunk-hwmsct5x.js:288266-288368 layout
/**
 * 第一方且是 Anthropic 官方 API，或 anthropicAws 未设自定义 base URL。
 */
function isDirectAnthropicEndpoint(e) {
  return (
    (e === "firstParty" && isFirstPartyAnthropicBaseUrl()) ||
    (e === "anthropicAws" && !process.env.ANTHROPIC_AWS_BASE_URL)
  );
}
//@ chunk-hwmsct5x.js:288368-288442 layout
/**
 * firstParty/gateway/anthropicAws（响应为 text/event-stream）。
 */
function isSseProvider(apiProvider) {
  return apiProvider === "firstParty" || apiProvider === "gateway" || apiProvider === "anthropicAws";
}
//@ chunk-hwmsct5x.js:288442-288479 layout
/**
 * 字节看门狗开启且当前提供商是 SSE 类（firstParty/gateway/anthropicAws）。
 */
function isStreamWatchdogApplicable() {
  return isByteWatchdogEnabled() && isSseProvider(getAPIProvider());
}
//@ chunk-hwmsct5x.js:288479-288538 layout
/**
 * CLAUDE_ENABLE_BYTE_WATCHDOG_BEDROCK。
 */
function isBedrockByteWatchdogEnabled() {
  return env.CLAUDE_ENABLE_BYTE_WATCHDOG_BEDROCK;
}
//@ chunk-hwmsct5x.js:288538-288587 layout
/**
 * 提供商支持字节看门狗：直连 Anthropic 端点，或 Bedrock 且开启了 Bedrock 看门狗。
 */
function supportsByteWatchdog(e) {
  return isDirectAnthropicEndpoint(e) || (e === "bedrock" && isBedrockByteWatchdogEnabled());
}
//@ chunk-hwmsct5x.js:288587-288644 layout
/**
 * 看门狗开启且路由提供商与当前提供商都支持时为真（传给代理层，避免重复的 body 空闲超时）。
 */
function shouldUseBodyIdleWatchdog(e) {
  if (!isByteWatchdogEnabled()) return false;
  return supportsByteWatchdog(e) && supportsByteWatchdog(getAPIProvider());
}
//@ chunk-hwmsct5x.js:288644-288739 layout = getServerUrl (1)
/**
 * 用新 body 重建 Response 并保留 url。旧版名 getServerUrl 为错配。
 */
function cloneResponseWithBody(e, n) {
  let response = new Response(n, e);
  Object.defineProperty(response, "url", {
    value: e.url,
  });
  return response;
}
//@ chunk-hwmsct5x.js:288739-291521 callgraph-fingerprint = buildFetch (0.183)
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
  ccsSender,
  requestClassValue,
) {
  let R = fetchOverride ?? fetchWithRequestBodyCompression;
  let apiProvider = getAPIProvider();
  let O = isDirectAnthropicEndpoint(apiProvider);
  return async (input, init) => {
    let headers = new Headers(init?.headers);
    let j = input instanceof Request ? input.url : String(input);
    let { method } = requestMethodAndUrl(input, init);
    guardTestFetch(R, method, j);
    let G = headers.get(CLIENT_REQUEST_ID_HEADER) ?? undefined;
    if (O && !headers.has(CLIENT_REQUEST_ID_HEADER)) headers.set(CLIENT_REQUEST_ID_HEADER, randomUUID());
    if (O && ((hasRefusalFallbackOccurred() && isSilentFallbackArmed()) || hasRefusalFallbackHeaderArmed())) {
      headers.set(REFUSAL_FALLBACK_HEADERS, "true");
      let be = sanitizeHeaderValue(getRefusalFallbackLatchOriginRequestId());
      if (be !== undefined) headers.set(X_CC_FALLBACK_LATCHED_BY, be);
    }
    if (isMessagesEndpoint(j) && isFirstPartyApiBackend() && isLowPriorityActiveSafe())
      headers.set(ANTHROPIC_USAGE_LIMIT, SLOW);
    if (O) {
      let requestAtis = getRequestAtis();
      if (requestAtis !== undefined) headers.set(ATIS_REQUEST_HEADER, requestAtis);
    }
    if (isMessagesEndpoint(j) && isSnugMittenAndSillyShoreOn()) {
      let be = false;
      try {
        be = isOfficialFirstPartyEndpoint(apiProvider);
      } catch {}
      if (be) {
        headers.set(SANDY_PLOVER_HEADER, toolsUsedHeaderBuilder(getConversationToolsUsed()));
        if (streamFallbackWarning().once("tools_used_header")) logFeatureOk("api_tools_used_header");
      }
    }
    try {
      let id = headers.get(CLIENT_REQUEST_ID_HEADER);
      logForDebugging(
        `[API REQUEST] ${new URL(j).pathname}${id ? ` ${CLIENT_REQUEST_ID_HEADER}=${id}` : ""} source=${source ?? "unknown"}`,
      );
      if (getMinDebugLogLevel() === "verbose")
        logForDebugging(`[API REQUEST AUTH] ${jsonStringify(summarizeAuthHeadersForLog(headers))}`, {
          level: "verbose",
        });
    } catch {}
    if (ccsSender && O && isMessagesEndpoint(j)) await attachSenderAddress(headers, ccsSender);
    let q = {
      ...init,
      headers,
    };
    let body = init?.body;
    let Z = takeDispatchAt(G);
    let Q = ANT_KEY_PFX(j, body, storageV5);
    let ne = Q?.gzip && (typeof body === "string" || isSerialisedBody(body));
    let te = ne ? gzipLevelOverride() : undefined;
    if (ne) {
      q.compress =
        te === undefined
          ? "gzip"
          : {
              encoding: "gzip",
              level: te,
            };
      logGzipSent();
      q.body =
        typeof body === "string" ? appendWatermark(body) : appendWatermarkBuffer(body, "room_after_is_free");
    }
    if (G !== undefined && Q !== undefined) {
      let be = {
        ...(Z !== undefined && {
          requestPrepareMs: Math.round(performance.now() - Z),
        }),
        ...reuseTelemetry(body),
      };
      recordGzipBlockTelemetry(
        G,
        Q.gzip
          ? {
              requestBodyEncoding: "gzip",
              requestBodyChars: Q.bodyChars,
              requestBodyGzipLevel: te,
              querySource,
              ...be,
            }
          : {
              requestBodyEncoding: "identity",
              requestBodyChars: Q.bodyChars,
              gzipSkipReason: Q.reason,
              ...be,
            },
      );
    }
    let firstByteWatchdogPlan = getFirstByteWatchdogPlan({
      clientRequestId: G,
      provider: apiProvider,
      routedProvider,
      method,
      url: j,
      body,
      noResponseRetryLedger,
    });
    let oe = (init) => {
      try {
        return shouldUseFirstPartyFetchOptions({
          provider: apiProvider,
          routedProvider,
          url: j,
          init,
        });
      } catch (error) {
        logError(toError(error));
        return false;
      }
    };
    let ie = {
      init: q,
      firstParty: false,
    };
    let Se = (init) => {
      ie.init = init;
      ie.firstParty = oe(init);
      return firstByteWatchdogPlan === undefined
        ? R(input, init)
        : fetchWithFirstByteTimeout(R, input, init, firstByteWatchdogPlan, clock);
    };
    let De = O && isMessagesEndpoint(j);
    if (De) noteModelRequestSent(clock.now());
    let se = await Se(q);
    guardTestFetchRedirect(R, method, se);
    if (ne) {
      se = await handleGzipRejectedResponse(se, () => Se(q));
      se = await retryRejectedGzipRequest({
        res: se,
        dispatch: Se,
        finalInit: q,
        identityBody: body,
        clientRequestId: G,
        storageV5,
      });
    }
    let bn = ie.firstParty && isSameUnredirectedUrl(se, j);
    if (De)
      markArmedFromResponse(
        se.headers,
        () => apiProvider !== "firstParty" || isOfficialFirstPartyEndpoint(apiProvider),
      );
    let ze = apiProvider === "bedrock" && se.ok && j.includes(BEDROCK_STREAM_PATH);
    if (
      ze &&
      se.body &&
      !se.headers.get("content-type") &&
      !env.CLAUDE_CODE_DISABLE_BEDROCK_CONTENT_TYPE_DEFAULT
    ) {
      se = cloneResponseWithBody(se, se.body);
      se.headers.set("content-type", "application/vnd.amazon.eventstream");
    }
    let Qn = se.headers.get("content-type");
    let lower = Qn?.toLowerCase();
    if (
      ze &&
      Qn &&
      !lower?.includes("vnd.amazon.eventstream") &&
      !env.CLAUDE_CODE_DISABLE_BEDROCK_CONTENT_TYPE_GUARD
    ) {
      se.body?.cancel().catch(() => {});
      throw new BedrockUnexpectedContentTypeError(Qn);
    }
    let kt = (isSseProvider(apiProvider) || O) && lower?.includes("text/event-stream");
    let Zn =
      apiProvider === "bedrock" &&
      lower?.includes("vnd.amazon.eventstream") &&
      isBedrockByteWatchdogEnabled();
    if ((kt || Zn) && se.body && isByteWatchdogEnabled()) {
      let byteIdleTimeoutForProvider = getByteIdleTimeoutForProvider(apiProvider);
      let $e =
        se.headers.get("cf-ray") ?? (Zn ? (se.headers.get("x-amzn-requestid") ?? undefined) : undefined);
      let yn = {
        lastAt: 0,
      };
      let er = kt ? heldReplyHoldMs(requestClassValue) : 0;
      let tr = cloneResponseWithBody(
        se,
        withByteIdleWatchdog(
          er > 0 ? wrapWithUnwatchedHold(se.body, er, clock) : se.body,
          byteIdleTimeoutForProvider,
          $e,
          yn,
          clock,
        ),
      );
      Object.defineProperty(tr, "_chunkTimes", {
        value: yn,
      });
      se = tr;
    }
    if (bn && oe(ie.init)) markFirstPartyFetch(se.headers);
    return se;
  };
}
//@ chunk-hwmsct5x.js:291521-291734 sole-consumer
/**
 * 调试日志用：Authorization 只保留方案名（"Bearer ***"），并列出 anthropic-beta 与 x-anthropic-* 头。
 */
function summarizeAuthHeadersForLog(headers) {
  let n = headers.get("authorization");
  let auth = n ? `${n.includes(" ") ? firstLineOf(n, " ") : "<opaque>"} ***` : "none";
  let s = {};
  headers.forEach((h, y) => {
    if (y === "anthropic-beta" || y.startsWith("x-anthropic-")) s[y] = h;
  });
  return {
    auth,
    headers: s,
  };
}
//@ chunk-hwmsct5x.js:291734-291807 sole-consumer
/**
 * 等待 promise，完成后若 signal 已中止则抛 AbortError。
 */
async function awaitUnlessAborted(e, signal) {
  let r = await e;
  if (signal?.aborted) throw new APIUserAbortError();
  return r;
}
//@ chunk-bwbq4xvm.js:156422-156608 fingerprint = getCustomHeaders (1)
/**
 * 解析 ANTHROPIC_CUSTOM_HEADERS（每行 "名: 值"）为 [名, 值] 数组；无冒号或名为空的行忽略。
 */
function getCustomHeaders(e = env.ANTHROPIC_CUSTOM_HEADERS ?? "") {
  let s = [];
  for (let headerString of e.split(/\r?\n/)) {
    let colonIdx = headerString.indexOf(":");
    let a = colonIdx === -1 ? "" : headerString.slice(0, colonIdx).trim();
    if (a) s.push([a, headerString.slice(colonIdx + 1).trim()]);
  }
  return s;
}
//@ chunk-vv0zxx69.js:1191-1249 fingerprint = configureApiKeyHeaders (0.627)
/**
 * API key 转 Authorization: Bearer 头（空时返回空对象）。
 */
function configureApiKeyHeaders(e) {
  return e
    ? {
        Authorization: `Bearer ${e}`,
      }
    : {};
}
export {
  getStreamIdleTimeoutMs,
  getAnthropicClient,
  getApiTimeoutMs,
  CLIENT_REQUEST_ID_HEADER,
  isStreamWatchdogApplicable,
  checkSuspendedStreamIdle,
  armFirstByteWatchdog,
  shouldUseBodyIdleWatchdog,
  getByteIdleTimeoutForProvider,
  StreamIdleTimeoutError,
  StreamSuspendedError,
  configureApiKeyHeaders,
  getCustomHeaderMap,
  getToolNameList,
  hasCustomAuthorizationHeader,
  getCustomHeaders,
};
