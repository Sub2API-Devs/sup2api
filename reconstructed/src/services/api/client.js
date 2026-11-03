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
import { randomUUID, randomUUID as randomUUID_2 } from "crypto";
import { Aa } from "../../utils/sleep.js";
import { isCcsCoworkSurface, desktopEntrypointSetting } from "../../utils/entrypointKinds.js";
import { env } from "../../utils/env.js";
import { isMainAgent } from "../../utils/agentContext.js";
import { shouldSendGatewayHintHeaders, _st } from "../lowPriority/lowPriorityMode.js";
import {
  requestLaneFor,
  agentKindFor,
  MEi,
  buildClientIdentityHeader,
  Fl,
  X_CLAUDE_REMOTE_SESSION_ORIGIN,
  X_CLAUDE_CODE_REQUEST_CLASS,
  X_CLAUDE_CODE_AGENT_TYPE,
  X_CLAUDE_CODE_PROMPT_ID,
  identityHeaders,
  validateAuthHeaders,
  X_COWORK_ENROLLMENT,
  attachSenderAddress,
  fh,
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
import { Koo } from "../../utils/swarm/teammateIds.js";
import { Vt } from "../../utils/agentId.js";
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
import { Ws } from "./streamFallbackWarning.js";
import { logFeatureOk } from "../analytics/featureTelemetry.js";
import { resolveAwsRegion } from "../../utils/awsRegion.js";
import { ec } from "../../utils/timerDelayClamp.js";
import { refreshGatewayToken, uRn } from "../gateway/gatewayAuth.js";
import { R3t } from "../gateway/constants.js";
import { uPe } from "../../../vendor/@anthropic-ai/sdk/client.mjs";
import { hi } from "../requestUserDialog.js";
import {
  assertGcpPathSegment,
  getFoundryBaseUrl,
  pf,
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
  Ast,
  fetchWithRequestBodyCompression,
  takeDispatchAt,
  gzipLevelOverride,
  PEn,
  reuseTelemetry,
  ZXo,
  handleGzipRejectedResponse,
  retryRejectedGzipRequest,
} from "./gzipRequestBody.js";
import { hAi, Poo, StreamNoResponseError } from "./streamErrors.js";
import { logEvent } from "../analytics/index.js";
import { logError } from "../../utils/log.js";
import { toError, TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { requestMethodAndUrl, guardTestFetch, guardTestFetchRedirect } from "../../utils/testNetworkGuard.js";
import {
  Kc,
  REFUSAL_FALLBACK_HEADERS,
  sanitizeHeaderValue,
  X_CC_FALLBACK_LATCHED_BY,
  Gc,
} from "./refusalFallbackHeaders.js";
import { ANTHROPIC_USAGE_LIMIT, SLOW } from "../lowPriority/headers.js";
import { isOfficialFirstPartyEndpoint } from "../../utils/model/firstPartyBaseUrl.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { ANT_KEY_PFX } from "../teamMemorySync/secretScanner.js";
import { appendWatermark, appendWatermarkBuffer } from "../analytics/eventSerialization.js";
import { shouldUseFirstPartyFetchOptions, Nd, Bd } from "./fetchOptions.js";
import { hh } from "./unwatchedReplyHold.js";
import { firstLineOf } from "../../utils/stringUtils.js";
import { Lf } from "../../../vendor/@anthropic-ai/sdk/core/error.mjs";

/**
 * 请求头名 x-client-request-id（第一方请求时由 buildFetch 生成 UUID）。
 */
//@ chunk-hwmsct5x.js:241005-241035 fingerprint = CLIENT_REQUEST_ID_HEADER (1)
var CLIENT_REQUEST_ID_HEADER = "x-client-request-id";
/**
 * SDK 日志器：error/warn/info/debug 都写 stderr 并加 [Anthropic SDK …] 前缀（调试模式 f7() 时传给 SDK）。
 */
//@ chunk-hwmsct5x.js:270380-270646 fingerprint = createStderrLogger (1)
function createStderrLogger() {
  return {
    error: (msg, ...n) => console.error("[Anthropic SDK ERROR]", msg, ...n),
    warn: (msg, ...n) => console.error("[Anthropic SDK WARN]", msg, ...n),
    info: (msg, ...n) => console.error("[Anthropic SDK INFO]", msg, ...n),
    debug: (msg, ...n) => console.error("[Anthropic SDK DEBUG]", msg, ...n),
  };
}
/**
 * 工具列表转名字：有 name 用 name，否则 mcp__<type>。旧版名 isSessionContainerCompatible 为错配。
 */
//@ chunk-hwmsct5x.js:270646-270723 layout = isSessionContainerCompatible (0.828)
function getToolNameList(e, n = []) {
  return e.map((s) => ("name" in s ? s.name : `mcp__${s.type}`));
}
/**
 * 创建 API 客户端（旧版 getAnthropicClient）。默认头：x-app(cli/cli-bg)、User-Agent、X-Claude-Code-Session-Id、ANTHROPIC_CUSTOM_HEADERS、自定义 anthropic-beta、远程容器/会话 id、x-client-app、子代理 agent-id/parent-agent-id；网关提示头开启时加 x-claude-code-request-class、x-claude-code-agent-type、x-claude-code-prompt-id。随后按提供商分支：gateway（JWT）、bedrock、foundry、anthropicAws、anthropicGoogleCloud、mantle、vertex，最后是第一方（API key 或 OAuth；令牌变化时递归重建）。maxRetries 由调用方传 0，重试全部交给 withRetry；超时取 API_TIMEOUT_MS 或 600s。
 */
//@ chunk-hwmsct5x.js:270723-280488 fingerprint = getAnthropicClient (0.44)
async function getAnthropicClient(options) {
  let {
      apiKey: apiKey,
      maxRetries: maxRetries,
      model: model,
      fetchOverride: fetchOverride,
      source: source,
      querySource: querySource = source,
      requestClass: requestClass,
      agentContext: agentContext,
      promptId: promptId,
      ccsSender: ccsSender,
      permissionContext: permissionContext,
      toolNames: toolNames = [],
      classifierJudgesServedCall: classifierJudgesServedCall,
      credentials: credentials,
      storageV5: storageV5,
      signal: signal,
      clock: clock = Aa,
      noResponseRetryLedger: noResponseRetryLedger,
    } = options,
    containerId = process.env.CLAUDE_CODE_CONTAINER_ID,
    remoteSessionId = process.env.CLAUDE_CODE_REMOTE_SESSION_ID,
    clientApp = process.env.CLAUDE_AGENT_SDK_CLIENT_APP,
    sessionOrigin = isCcsCoworkSurface() ? env.CLAUDE_CODE_SESSION_ORIGIN : void 0,
    subagentContext = isMainAgent(agentContext) ? void 0 : agentContext,
    customHeaders = shouldSendGatewayHintHeaders(),
    requestClassValue = requestLaneFor(source, agentContext, requestClass),
    requestClassHeader = customHeaders ? requestClassValue : void 0,
    agentTypeHeader = customHeaders ? agentKindFor(source, agentContext) : void 0,
    credentialPromptContext = {
      userTurn:
        source !== "side_query" &&
        MEi(querySource) &&
        envSessionKind() === void 0 &&
        getTeammateAgentId() === void 0 &&
        (agentContext.agentType === "main" || agentContext.isBackgroundAgent === !1),
    },
    customHeaderMap = getCustomHeaderMap(),
    permissionContextHeaderValue = await buildClientIdentityHeader({
      querySource: querySource,
      permissionContext: permissionContext,
      toolNames: toolNames,
      classifierJudgesServedCall: classifierJudgesServedCall,
    }),
    defaultHeaders = {
      ...Fl(),
      ...customHeaderMap,
      ...filteredCustomBetaHeaders(),
      ...(containerId && { "x-claude-remote-container-id": containerId }),
      ...(remoteSessionId && { "x-claude-remote-session-id": remoteSessionId }),
      ...(sessionOrigin && { [X_CLAUDE_REMOTE_SESSION_ORIGIN]: sessionOrigin }),
      ...(clientApp && { "x-client-app": clientApp }),
      ...(subagentContext?.agentId && { "x-claude-code-agent-id": Koo(subagentContext.agentId) }),
      ...(subagentContext?.parentAgentId && {
        "x-claude-code-parent-agent-id": Koo(subagentContext.parentAgentId),
      }),
      ...(requestClassHeader && { [X_CLAUDE_CODE_REQUEST_CLASS]: requestClassHeader }),
      ...(agentTypeHeader && { [X_CLAUDE_CODE_AGENT_TYPE]: Koo(agentTypeHeader) }),
      ...(customHeaders &&
        promptId !== void 0 &&
        Vt(promptId) !== null && { [X_CLAUDE_CODE_PROMPT_ID]: promptId }),
    };
  if (
    (logForDebugging(
      `[API:request] Creating client, ANTHROPIC_CUSTOM_HEADERS present: ${!!process.env.ANTHROPIC_CUSTOM_HEADERS}, has Authorization header: ${!!customHeaderMap.Authorization}`,
      { level: "verbose" },
    ),
    env.CLAUDE_CODE_ADDITIONAL_PROTECTION)
  )
    defaultHeaders["x-anthropic-additional-protection"] = "true";
  if (getAPIProvider() === "gateway" && !getGatewayAuth() && !isGatewayServerProcess()) {
    if (isHostManagedProviderAuth()) throw hostManagedNoCredsError("Cloud gateway");
    throw new FoundryCapabilityError(
      "Not signed in to the Cloud gateway \u2014 run /login.",
      "signin_required",
    );
  }
  if (isLauncherStartedProcess() && takeLauncherHostLoginEnd())
    (clearOAuthTokenCache(), refreshGrowthBookAfterAuthChange());
  let oauthRefreshOutcome = await checkAndRefreshOAuthTokenIfNeededWithOutcome({
      credentials: credentials,
      storageV5: storageV5,
    }),
    oauthTokens = getClaudeAIOAuthTokens(),
    isClaudeAiSubscriber = hasInferenceScope({
      anthropicAuthEnabled: isAnthropicAuthEnabled(),
      oauthScopes: oauthTokens?.scopes,
    }),
    authorizationSource = null;
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
    ),
    provider = getProviderForModel(model);
  if ((assertProviderAllowed(provider), Ws().once("provider_route"))) logFeatureOk("provider_route");
  let awsRegion = provider === "bedrock" || provider === "mantle" ? await resolveAwsRegion() : void 0,
    bodyIdleTimeoutSetting = getManagedNetworkConfig()?.body_idle_timeout,
    apiTimeoutMs = getApiTimeoutMs() ?? 600000,
    clientOptions = {
      defaultHeaders: defaultHeaders,
      maxRetries: maxRetries,
      timeout: apiTimeoutMs > 0 ? apiTimeoutMs : ec,
      dangerouslyAllowBrowser: !0,
      fetchOptions: getProxyFetchOptions({
        forAnthropicAPI: !0,
        hasBodyIdleWatchdog: shouldUseBodyIdleWatchdog(provider),
        bodyIdleTimeout: typeof bodyIdleTimeoutSetting === "boolean" ? bodyIdleTimeoutSetting : void 0,
        url: getProviderBaseUrl(provider, model, awsRegion),
      }),
      ...(wrappedFetch && { fetch: wrappedFetch }),
      ...CLOUD_AUTH_SLOT,
    };
  if (provider === "gateway") {
    await refreshGatewayToken();
    let re = getGatewayAuth();
    if (!re || (isGatewayAuthExpired() && !uRn()))
      throw re?.unpinned
        ? new FoundryCapabilityError(
            "Cloud gateway token expired \u2014 refresh ANTHROPIC_AUTH_TOKEN and restart.",
            "token_expired",
          )
        : new FoundryCapabilityError(R3t, "session_expired");
    let { rest: rest } = splitAuthorizationHeader(clientOptions.defaultHeaders);
    return new uPe({
      ...clientOptions,
      defaultHeaders: { ...rest, ...clearAuthorizationHeaders(), Authorization: `Bearer ${re.jwt}` },
      apiKey: null,
      baseURL: re.url,
      authToken: re.jwt,
      ...(isDebugToStdErr() && { logger: createStderrLogger() }),
    });
  }
  if (provider === "bedrock") {
    let { AnthropicBedrock: AnthropicBedrock } = await import("./chunk-h87x8cg3.js"),
      resolvedFetch = getAwsRegionForModel(model, awsRegion),
      CLAUDE_CODE_SKIP_BEDROCK_AUTH = env.CLAUDE_CODE_SKIP_BEDROCK_AUTH,
      he = splitAuthorizationHeader(clientOptions.defaultHeaders),
      any = Object.keys(he.rest).some((Th) => Th.toLowerCase() === "x-api-key"),
      He = {
        ...he.rest,
        ...clearAuthorizationHeaders(),
        Authorization: null,
        ...(!CLAUDE_CODE_SKIP_BEDROCK_AUTH && !any && { "X-Api-Key": null }),
        ...(process.env.ANTHROPIC_BEDROCK_SERVICE_TIER && {
          "X-Amzn-Bedrock-Service-Tier": process.env.ANTHROPIC_BEDROCK_SERVICE_TIER,
        }),
      },
      Me = process.env.AWS_BEARER_TOKEN_BEDROCK?.trim(),
      Ee = Me ? `Bearer ${Me}` : CLAUDE_CODE_SKIP_BEDROCK_AUTH ? he.value : void 0,
      Sn = isHostManagedProviderAuth(),
      En =
        !Ee && !CLAUDE_CODE_SKIP_BEDROCK_AUTH && !Sn
          ? await awaitUnlessAborted(refreshAndGetAwsCredentials(signal, credentialPromptContext), signal)
          : null,
      $l = {
        ...clientOptions,
        defaultHeaders: He,
        awsRegion: resolvedFetch,
        apiKey: null,
        ...(CLAUDE_CODE_SKIP_BEDROCK_AUTH && !Ee && { skipAuth: !0 }),
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
        ...(isDebugToStdErr() && { logger: createStderrLogger() }),
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
    let { AnthropicFoundry: AnthropicFoundry } = await import("./chunk-q01xm7xp.js"),
      azureADTokenProvider,
      we = !1;
    if (env.ANTHROPIC_FOUNDRY_AUTH_TOKEN)
      azureADTokenProvider = async () => env.ANTHROPIC_FOUNDRY_AUTH_TOKEN ?? "";
    else if (!process.env.ANTHROPIC_FOUNDRY_API_KEY)
      if (env.CLAUDE_CODE_SKIP_FOUNDRY_AUTH)
        ((we = !0), (azureADTokenProvider = () => Promise.resolve("skip-foundry-auth")));
      else if (isHostManagedProviderAuth()) throw hostManagedNoCredsError("Foundry");
      else {
        let { DefaultAzureCredential: AzureCredential, getBearerTokenProvider: getBearerTokenProvider } =
          await import("./chunk-mrx6y2r5.js");
        azureADTokenProvider = getBearerTokenProvider(
          new AzureCredential(),
          "https://cognitiveservices.azure.com/.default",
        );
      }
    let ANTHROPIC_FOUNDRY_RESOURCE = env.ANTHROPIC_FOUNDRY_RESOURCE;
    if (
      ANTHROPIC_FOUNDRY_RESOURCE !== void 0 &&
      env.ANTHROPIC_FOUNDRY_BASE_URL === void 0 &&
      hi(ANTHROPIC_FOUNDRY_RESOURCE) === void 0
    )
      throw Error(
        "ANTHROPIC_FOUNDRY_RESOURCE must be a Foundry resource name (2-64 letters, digits and hyphens, not starting or ending with a hyphen, such as my-resource), not a URL or host name. To use a full URL, set ANTHROPIC_FOUNDRY_BASE_URL instead.",
      );
    let ce = splitAuthorizationHeader(clientOptions.defaultHeaders),
      He = {
        ...clientOptions,
        ...(ANTHROPIC_FOUNDRY_RESOURCE !== void 0 && { resource: ANTHROPIC_FOUNDRY_RESOURCE }),
        defaultHeaders: { ...ce.rest, ...clearAuthorizationHeaders(), Authorization: null },
        ...(azureADTokenProvider && {
          azureADTokenProvider: azureADTokenProvider,
          apiKey: null,
          defaultHeaders: we
            ? { ...ce.rest, ...(ce.value !== void 0 && { Authorization: ce.value }) }
            : { ...ce.rest, ...clearAuthorizationHeaders() },
        }),
        ...(isDebugToStdErr() && { logger: createStderrLogger() }),
      };
    return new AnthropicFoundry(He);
  }
  if (provider === "anthropicAws") {
    let { AnthropicAws: AnthropicAws } = await import("./chunk-qhhcfyds.js"),
      CLAUDE_CODE_SKIP_ANTHROPIC_AWS_AUTH = env.CLAUDE_CODE_SKIP_ANTHROPIC_AWS_AUTH,
      we = await resolveAwsRegion(),
      he = splitAuthorizationHeader(clientOptions.defaultHeaders),
      ce = CLAUDE_CODE_SKIP_ANTHROPIC_AWS_AUTH ? he.value : void 0,
      He = Object.entries(he.rest).findLast(([Ee]) => Ee.toLowerCase() === "anthropic-workspace-id")?.[1],
      Me = {
        ...clientOptions,
        awsRegion: we,
        ...(He && env.ANTHROPIC_AWS_WORKSPACE_ID && { workspaceId: He }),
        defaultHeaders: { ...he.rest, ...clearAuthorizationHeaders(), Authorization: null },
        ...(!CLAUDE_CODE_SKIP_ANTHROPIC_AWS_AUTH && { authToken: null }),
        ...(CLAUDE_CODE_SKIP_ANTHROPIC_AWS_AUTH && !ce && { skipAuth: !0 }),
        ...(ce && {
          apiKey: ce.match(/^Bearer (.+)$/i)?.[1] ?? ce,
          defaultHeaders: { ...he.rest, ...clearAuthorizationHeaders(), Authorization: ce },
        }),
        ...(isDebugToStdErr() && { logger: createStderrLogger() }),
      };
    if (!process.env.ANTHROPIC_AWS_API_KEY && !CLAUDE_CODE_SKIP_ANTHROPIC_AWS_AUTH)
      if (isHostManagedProviderAuth())
        Me.providerChainResolver = hostManagedAwsSdkCredentials("Anthropic-on-AWS").providerChainResolver;
      else {
        let Ee = await awaitUnlessAborted(
          refreshAndGetAwsCredentials(signal, credentialPromptContext),
          signal,
        );
        if (Ee)
          ((Me.awsAccessKey = Ee.accessKeyId),
            (Me.awsSecretAccessKey = Ee.secretAccessKey),
            (Me.awsSessionToken = Ee.sessionToken));
        else Me.providerChainResolver = defaultAwsProviderChainResolver(we);
      }
    return new AnthropicAws(Me);
  }
  if (provider === "anthropicGoogleCloud") {
    (assertGcpPathSegment("ANTHROPIC_GOOGLE_CLOUD_PROJECT", env.ANTHROPIC_GOOGLE_CLOUD_PROJECT),
      assertGcpPathSegment("ANTHROPIC_GOOGLE_CLOUD_LOCATION", env.ANTHROPIC_GOOGLE_CLOUD_LOCATION),
      assertGcpPathSegment("ANTHROPIC_GOOGLE_CLOUD_WORKSPACE_ID", env.ANTHROPIC_GOOGLE_CLOUD_WORKSPACE_ID),
      assertGcpPathSegment("GCLOUD_PROJECT", env.GCLOUD_PROJECT),
      assertGcpPathSegment("GOOGLE_CLOUD_PROJECT", env.GOOGLE_CLOUD_PROJECT),
      assertGcpPathSegment("gcloud_project", env.gcloud_project),
      assertGcpPathSegment("google_cloud_project", env.google_cloud_project));
    let re = env.CLAUDE_CODE_SKIP_ANTHROPIC_GOOGLE_CLOUD_AUTH,
      le = isHostManagedProviderAuth();
    if (!re && !le)
      await awaitUnlessAborted(refreshGcpCredentialsIfNeeded(signal, credentialPromptContext), signal);
    let [{ AnthropicGoogleCloud: we }, { buildVertexGoogleAuth: he }] = await Promise.all([
        import("./chunk-e7naa6k8.js"),
        import("./chunk-hdpbq2vw.js"),
      ]),
      ce = splitAuthorizationHeader(clientOptions.defaultHeaders),
      He = re ? ce.value : void 0,
      Me = {
        ...clientOptions,
        defaultHeaders: { ...ce.rest, ...clearAuthorizationHeaders() },
        ...(re ? { skipAuth: !0 } : { googleAuth: await he({ kind: "default" }, void 0) }),
        ...(He && { defaultHeaders: { ...ce.rest, Authorization: He } }),
        ...(isDebugToStdErr() && { logger: createStderrLogger() }),
      };
    return new we(Me);
  }
  if (provider === "mantle") {
    let { AnthropicBedrockMantle: AnthropicBedrockMantle } = await import("./chunk-h87x8cg3.js"),
      CLAUDE_CODE_SKIP_MANTLE_AUTH = env.CLAUDE_CODE_SKIP_MANTLE_AUTH,
      we = splitAuthorizationHeader(clientOptions.defaultHeaders),
      he = CLAUDE_CODE_SKIP_MANTLE_AUTH ? we.value : void 0,
      ce = process.env.AWS_BEARER_TOKEN_BEDROCK?.trim(),
      He = isHostManagedProviderAuth(),
      Me =
        !ce && !CLAUDE_CODE_SKIP_MANTLE_AUTH && !He
          ? await awaitUnlessAborted(refreshAndGetAwsCredentials(signal, credentialPromptContext), signal)
          : null,
      Ee = getAwsRegionForModel(model, awsRegion),
      any = Object.keys(we.rest).some((En) => En.toLowerCase() === "x-api-key");
    return new AnthropicBedrockMantle({
      ...clientOptions,
      defaultHeaders: ce
        ? {
            ...we.rest,
            ...clearAuthorizationHeaders(),
            Authorization: `Bearer ${ce}`,
            ...(!any && { "X-Api-Key": null }),
          }
        : {
            ...we.rest,
            ...clearAuthorizationHeaders(),
            Authorization: null,
            ...(!CLAUDE_CODE_SKIP_MANTLE_AUTH && !any && { "X-Api-Key": null }),
          },
      awsRegion: Ee,
      ...(!ce && !CLAUDE_CODE_SKIP_MANTLE_AUTH && { authToken: null }),
      ...(CLAUDE_CODE_SKIP_MANTLE_AUTH && !he && { skipAuth: !0 }),
      ...(he && {
        apiKey: he.match(/^Bearer (.+)$/i)?.[1] ?? he,
        defaultHeaders: { ...we.rest, ...clearAuthorizationHeaders(), Authorization: he },
      }),
      ...(Me && {
        awsAccessKey: Me.accessKeyId,
        awsSecretAccessKey: Me.secretAccessKey,
        awsSessionToken: Me.sessionToken,
      }),
      ...(He &&
        !ce &&
        !CLAUDE_CODE_SKIP_MANTLE_AUTH && {
          providerChainResolver: hostManagedAwsSdkCredentials("Mantle").providerChainResolver,
        }),
      ...(!He &&
        !ce &&
        !CLAUDE_CODE_SKIP_MANTLE_AUTH && { providerChainResolver: defaultAwsProviderChainResolver(Ee) }),
      ...(isDebugToStdErr() && { logger: createStderrLogger() }),
    });
  }
  if (provider === "vertex") {
    let CLAUDE_CODE_SKIP_VERTEX_AUTH = env.CLAUDE_CODE_SKIP_VERTEX_AUTH,
      le = isHostManagedProviderAuth();
    if (!CLAUDE_CODE_SKIP_VERTEX_AUTH && !le)
      await awaitUnlessAborted(refreshGcpCredentialsIfNeeded(signal, credentialPromptContext), signal);
    let [{ AnthropicVertex: we }, { buildVertexGoogleAuth: he }] = await Promise.all([
        import("./chunk-xa96axyz.js"),
        import("./chunk-hdpbq2vw.js"),
      ]),
      ce = await he(
        CLAUDE_CODE_SKIP_VERTEX_AUTH ? { kind: "skip" } : { kind: "default" },
        getConfiguredVertexProjectId(),
      ),
      He = splitAuthorizationHeader(clientOptions.defaultHeaders),
      Me = CLAUDE_CODE_SKIP_VERTEX_AUTH ? He.value : void 0,
      Ee = {
        ...clientOptions,
        defaultHeaders: {
          ...He.rest,
          ...vertexResidualCredentialPins(
            CLAUDE_CODE_SKIP_VERTEX_AUTH ? { wireAuthorization: Me, headers: He.rest } : !1,
          ),
        },
        region: getVertexRegionForModel(model),
        googleAuth: ce,
        ...(isDebugToStdErr() && { logger: createStderrLogger() }),
      };
    return suppressVertexAuthRejection(new we(Ee));
  }
  let resolvedApiKey = apiKey || getAnthropicApiKey();
  if (!resolvedApiKey && shouldUseWIFAuth()) {
    let re = await getWIFTokenCache();
    if (re !== null) {
      let le = await getWIFCredentials(),
        { rest: rest } = splitAuthorizationHeader(defaultHeaders),
        he = env.ANTHROPIC_BASE_URL || le?.baseURL;
      assertProviderAllowed(provider, he);
      let token = await re.getToken();
      return new uPe({
        apiKey: null,
        authToken: token,
        baseURL: he,
        ...clientOptions,
        defaultHeaders: {
          ...rest,
          ...clearAuthorizationHeaders(),
          Authorization: `Bearer ${token}`,
          ...le?.extraHeaders,
          ...identityHeaders(permissionContextHeaderValue, rest),
        },
        ...(isDebugToStdErr() && { logger: createStderrLogger() }),
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
    let re = getOAuthAccountOnHold();
    if (re) throw new OAuthAccountOnHoldError(re.url);
    if (
      oauthRefreshOutcome === "lock_timeout" &&
      oauthTokens?.expiresAt != null &&
      Date.now() >= oauthTokens.expiresAt &&
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_sharded_beacon", !0)
    )
      throw new OAuthRefreshLockTimeoutError();
  }
  if (isClaudeAiSubscriber && splitAuthorizationHeader(defaultHeaders).value === void 0)
    await settleStoredLoginRefusal();
  let Bl = getClaudeAIOAuthTokens();
  if (
    (oauthTokens && Bl?.accessToken !== oauthTokens.accessToken) ||
    isClaudeAiSubscriber !==
      hasInferenceScope({ anthropicAuthEnabled: isAnthropicAuthEnabled(), oauthScopes: Bl?.scopes }) ||
    (splitAuthorizationHeader(defaultHeaders).value === void 0 && hasCustomAuthorizationHeader())
  )
    return getAnthropicClient(options);
  if (
    isClaudeAiSubscriber &&
    splitAuthorizationHeader(defaultHeaders).value === void 0 &&
    isStoredLoginRefused()
  )
    throw new StoredLoginHeldBackError(storedLoginRefusalReason());
  let authPair = getAuthCredentialsForClient({
      isSubscriber: isClaudeAiSubscriber,
      apiKey: resolvedApiKey,
      oauthAccessToken: oauthTokens?.accessToken,
    }),
    finalHeaders = { ...defaultHeaders, ...identityHeaders(permissionContextHeaderValue, defaultHeaders) };
  if (
    (validateAuthHeaders({
      apiKey: authPair.apiKey,
      getApiKeySource: () => {
        let { source: source } = getAnthropicApiKeyWithSourceSafe({ skipRetrievingKeyFromApiKeyHelper: !0 });
        return source === "none" ? "unknown" : source;
      },
      authToken: authPair.authToken,
      getAuthTokenSource: () => {
        let { source: source } = getAuthTokenSource();
        return source === "CLAUDE_CODE_OAUTH_TOKEN" ||
          source === "CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR" ||
          source === "CCR_OAUTH_TOKEN_FILE"
          ? source
          : "claude.ai";
      },
      defaultHeaders: finalHeaders,
      authorizationSource: authorizationSource,
      customHeaderNames: Object.keys(customHeaderMap),
      envSuppliedHeaderNames: new Set(
        [
          containerId && "x-claude-remote-container-id",
          remoteSessionId && "x-claude-remote-session-id",
          clientApp && "x-client-app",
        ].filter((re) => Boolean(re)),
      ),
    }),
    authPair.authToken && isLauncherHostLoginRefusedNow(authPair.authToken))
  )
    return getAnthropicClient(options);
  let firstPartyClientOptions = {
    apiKey: authPair.apiKey,
    authToken: authPair.authToken,
    ...(env.ANTHROPIC_BASE_URL ? { baseURL: env.ANTHROPIC_BASE_URL } : !1),
    ...clientOptions,
    defaultHeaders: finalHeaders,
    ...(isDebugToStdErr() && { logger: createStderrLogger() }),
  };
  return new uPe(firstPartyClientOptions);
}
/**
 * 把 ANTHROPIC_AUTH_TOKEN 或 apiKeyHelper 的令牌写成 Authorization: Bearer，返回来源名；都没有返回 null。
 */
//@ chunk-hwmsct5x.js:280488-280735 layout
async function applyAuthTokenHeader(e, n) {
  let r =
      isBareMode() &&
      getAnthropicApiKeyWithSourceSafe({ skipRetrievingKeyFromApiKeyHelper: !0 }).source === "none",
    h = isAntBuild() && !r ? void 0 : env.ANTHROPIC_AUTH_TOKEN,
    y = h || (await getApiKeyFromApiKeyHelper(n));
  if (y) return ((e.Authorization = `Bearer ${y}`), h ? "ANTHROPIC_AUTH_TOKEN" : "apiKeyHelper");
  return null;
}
/**
 * 各提供商的 base URL：bedrock/mantle/anthropicAws/Google Cloud/vertex/foundry/gateway/firstParty（ANTHROPIC_BASE_URL 或配置的 BASE_API_URL），可用对应 *_BASE_URL 覆盖。
 */
//@ chunk-hwmsct5x.js:280735-281403 layout
function getProviderBaseUrl(e, n, r) {
  switch (e) {
    case "bedrock":
      return (
        process.env.ANTHROPIC_BEDROCK_BASE_URL ||
        `https://bedrock-runtime.${getAwsRegionForModel(n, r)}.amazonaws.com`
      );
    case "mantle":
      return (
        process.env.ANTHROPIC_BEDROCK_MANTLE_BASE_URL ||
        `https://bedrock-mantle.${getAwsRegionForModel(n, r)}.api.aws`
      );
    case "anthropicAws":
      return (
        process.env.ANTHROPIC_AWS_BASE_URL ||
        `https://aws-external-anthropic.${getDefaultAwsRegion()}.api.aws`
      );
    case "anthropicGoogleCloud":
      return env.ANTHROPIC_GOOGLE_CLOUD_BASE_URL || "https://claude.googleapis.com";
    case "vertex":
      return process.env.ANTHROPIC_VERTEX_BASE_URL || getVertexBaseUrlForRegion(getVertexRegionForModel(n));
    case "foundry":
      return getFoundryBaseUrl();
    case "gateway":
      return getGatewayAuth()?.url;
    case "firstParty":
      return process.env.ANTHROPIC_BASE_URL || getOauthConfig().BASE_API_URL;
  }
}
/**
 * 小快模型且设置了 ANTHROPIC_SMALL_FAST_MODEL_AWS_REGION 时用该区域，否则用给定或默认 AWS 区域。
 */
//@ chunk-hwmsct5x.js:281403-281578 layout
function getAwsRegionForModel(e, n) {
  let r = nonEmptyOrUndefined(env.ANTHROPIC_SMALL_FAST_MODEL_AWS_REGION);
  if (e && r && hasDedicatedSmallFastModel()) {
    let s = getSmallFastModel();
    if (
      s !== getMainLoopModel() &&
      getCanonicalName(e, { identity: !0 }) === getCanonicalName(s, { identity: !0 })
    )
      return r;
  }
  return n ?? getDefaultAwsRegion();
}
/**
 * 从头对象里分离出 Authorization（大小写不敏感），返回 {value, rest}。
 */
//@ chunk-hwmsct5x.js:281578-281713 layout
function splitAuthorizationHeader(e) {
  let n = {},
    r;
  for (let [s, h] of Object.entries(e))
    if (s.toLowerCase() === "authorization") r = h;
    else n[s] = h;
  return { value: r, rest: n };
}
/**
 * ANTHROPIC_CUSTOM_HEADERS 里是否带 Authorization。
 */
//@ chunk-hwmsct5x.js:281713-281760 layout
function hasCustomAuthorizationHeader() {
  return splitAuthorizationHeader(getCustomHeaderMap()).value !== void 0;
}
/**
 * ANTHROPIC_CUSTOM_HEADERS 转对象（组织禁用实验 beta 时丢弃 anthropic-beta）；桌面版加 anthropic-client-platform/version；cowork 报名时加 x-cowork-enrollment。
 */
//@ chunk-hwmsct5x.js:281760-282214 layout
function getCustomHeaderMap() {
  let e = {};
  for (let [s, h] of getCustomHeaders_3()) {
    if (s.toLowerCase() === "anthropic-beta" && isHipaaOrg()) {
      logForDebugging(
        "ANTHROPIC_CUSTOM_HEADERS anthropic-beta ignored: experimental betas are disabled by your organization's policy",
        { level: "debug" },
      );
      continue;
    }
    e[s] = h;
  }
  let n = desktopEntrypointSetting();
  if (n && !Object.keys(e).some((s) => /^anthropic-client-(platform|version)$/i.test(s)))
    ((e["anthropic-client-platform"] = "desktop_app"), (e["anthropic-client-version"] = n));
  let r = getCoworkEnrollment();
  if (r !== void 0) e[X_COWORK_ENROLLMENT] = r;
  return e;
}
/**
 * 流空闲超时：max(配置值, 300s)。
 */
//@ chunk-hwmsct5x.js:282214-282261 layout
function getStreamIdleTimeoutMs() {
  return Math.max(getConfiguredStreamIdleTimeoutMs() ?? 0, 300000);
}
/**
 * CLAUDE_STREAM_IDLE_TIMEOUT_MS 或托管配置 stream_idle_timeout_ms（上限 30 分钟）。
 */
//@ chunk-hwmsct5x.js:282261-282418 layout
function getConfiguredStreamIdleTimeoutMs() {
  let e = parseNumberWithSeparators(process.env.CLAUDE_STREAM_IDLE_TIMEOUT_MS);
  if (e > 0) return e;
  let n = getManagedTimeoutSetting("stream_idle_timeout_ms");
  return n === void 0 ? void 0 : Math.min(n, MAX_TIMEOUT_MS);
}
/**
 * API_TIMEOUT_MS 或托管配置 api_timeout_ms。
 */
//@ chunk-hwmsct5x.js:282418-282479 layout
function getApiTimeoutMs() {
  return env.API_TIMEOUT_MS ?? getManagedTimeoutSetting("api_timeout_ms");
}
/**
 * 读托管网络配置里的整数超时项（1e4 到 int32 之间才有效）。
 */
//@ chunk-hwmsct5x.js:282479-282581 layout
function getManagedTimeoutSetting(e) {
  let n = getManagedNetworkConfig()?.[e];
  return typeof n === "number" && Number.isInteger(n) && n >= MIN_TIMEOUT_MS && n <= ec ? n : void 0;
}
/**
 * 托管网络配置对象（未启用时 null）。
 */
//@ chunk-hwmsct5x.js:282581-282618 layout
function getManagedNetworkConfig() {
  return providerReadsClientData() ? getCachedClientData() : null;
}
/**
 * 1e4 / 1800000 / 180000：超时下限、上限、第一方字节流空闲默认。
 */
//@ chunk-hwmsct5x.js:282618-282650 layout
var MIN_TIMEOUT_MS = 1e4,
  MAX_TIMEOUT_MS = 1800000,
  FIRST_PARTY_BYTE_IDLE_TIMEOUT_MS = 180000;
/**
 * 字节流空闲超时：CLAUDE_BYTE_STREAM_IDLE_TIMEOUT_MS；第一方默认 180s（GrowthBook tengu_byte_stream_idle_timeout_ms），夹在 10s–30min。
 */
//@ chunk-hwmsct5x.js:282650-282947 layout
function getByteStreamIdleTimeoutMs(e) {
  let r = getStreamIdleTimeoutMs(),
    s = parseNumberWithSeparators(process.env.CLAUDE_BYTE_STREAM_IDLE_TIMEOUT_MS),
    h = getConfiguredStreamIdleTimeoutMs() !== void 0;
  if (Number.isFinite(s) && s > 0) r = s;
  else if (!h && e === "firstParty") {
    r = FIRST_PARTY_BYTE_IDLE_TIMEOUT_MS;
    let y = getFeatureValue_CACHED_MAY_BE_STALE(
      "tengu_byte_stream_idle_timeout_ms",
      FIRST_PARTY_BYTE_IDLE_TIMEOUT_MS,
    );
    if (typeof y === "number" && Number.isFinite(y) && y > 0) r = y;
  }
  return Math.min(Math.max(r, MIN_TIMEOUT_MS), MAX_TIMEOUT_MS);
}
/**
 * 直连 Anthropic 端点时按提供商取字节流空闲超时，否则用通用值。
 */
//@ chunk-hwmsct5x.js:282947-282989 layout
function getByteIdleTimeoutForProvider(e) {
  return getByteStreamIdleTimeoutMs(isDirectAnthropicEndpoint(e) ? e : void 0);
}
/**
 * 首字节超时：CLAUDE_STREAM_FIRST_BYTE_TIMEOUT_MS（夹在 10s–30min）或字节流空闲超时。
 */
//@ chunk-hwmsct5x.js:282989-283111 layout
function getFirstByteTimeoutMs(e) {
  let CLAUDE_STREAM_FIRST_BYTE_TIMEOUT_MS = env.CLAUDE_STREAM_FIRST_BYTE_TIMEOUT_MS;
  if (CLAUDE_STREAM_FIRST_BYTE_TIMEOUT_MS !== void 0)
    return Math.min(Math.max(CLAUDE_STREAM_FIRST_BYTE_TIMEOUT_MS, MIN_TIMEOUT_MS), MAX_TIMEOUT_MS);
  return getByteIdleTimeoutForProvider(e);
}
/**
 * 32768 / 1000 / 5000：请求体每 32KB 首字节窗口加 1s；心跳间隔 1s；超过 5s 的心跳间隔算作睡眠。
 */
//@ chunk-hwmsct5x.js:283111-283140 layout
var FIRST_BYTE_BYTES_PER_EXTRA_SECOND = 32768,
  SLEEP_PROBE_INTERVAL_MS = 1000,
  SLEEP_GAP_THRESHOLD_MS = 5000;
/**
 * 记录某 client-request-id 需要首字节看门狗（是否已升级）。
 */
//@ chunk-hwmsct5x.js:283140-283227 layout
function armFirstByteWatchdog(e, { escalated: escalated }) {
  Ws().streamFirstByteArmedRequestIds.set(e, { escalated: escalated });
}
/**
 * 取出并删除该请求的首字节看门狗标记。
 */
//@ chunk-hwmsct5x.js:283227-283337 layout
function takeFirstByteWatchdogArm(e) {
  if (e === void 0) return;
  let streamFirstByteArmedRequestIds = Ws().streamFirstByteArmedRequestIds,
    r = streamFirstByteArmedRequestIds.get(e);
  return (streamFirstByteArmedRequestIds.delete(e), r);
}
/**
 * "/invoke-with-response-stream"。
 */
//@ chunk-hwmsct5x.js:283337-283375 layout
var BEDROCK_STREAM_PATH = "/invoke-with-response-stream";
/**
 * 计算首字节窗口：基础首字节超时 + 请求体大小附加，受 API 超时约束；返回 {escalated, firstWindowMs, retryWindowMs}，不适用时 undefined。
 */
//@ chunk-hwmsct5x.js:283375-284054 layout
function getFirstByteWatchdogPlan({
  clientRequestId: clientRequestId,
  provider: provider,
  routedProvider: routedProvider,
  method: method,
  url: url,
  body: body,
  noResponseRetryLedger: noResponseRetryLedger,
}) {
  let S =
      routedProvider === "gateway" &&
      noResponseRetryLedger !== void 0 &&
      env.CLAUDE_STREAM_FIRST_BYTE_TIMEOUT_MS !== void 0 &&
      isByteWatchdogEnabled() &&
      method === "POST" &&
      isMessagesEndpoint(url),
    E = S ? { escalated: noResponseRetryLedger.count > 0 } : takeFirstByteWatchdogArm(clientRequestId),
    R = E === void 0 && provider === "bedrock" && method === "POST" && url.includes(BEDROCK_STREAM_PATH);
  if ((E === void 0 && !R) || (!S && !shouldUseBodyIdleWatchdog(routedProvider))) return;
  let L = typeof body === "string" ? Buffer.byteLength(body) : Ast(body) ? body.length : 0,
    O = Math.ceil(L / FIRST_BYTE_BYTES_PER_EXTRA_SECOND) * 1000,
    M = getApiTimeoutMs() ?? 600000,
    P = M <= 0 ? 1 / 0 : M - 1000;
  if (P < MIN_TIMEOUT_MS) return;
  let H = getFirstByteTimeoutMs(provider) + O,
    min = Math.min(H, P);
  if (E === void 0) return { escalated: !1, firstWindowMs: min, retryWindowMs: min };
  let z = Number.isFinite(P) ? P : Math.max(H, hAi + O);
  return { escalated: E.escalated, firstWindowMs: min, retryWindowMs: z };
}
/**
 * 包装 fetch：窗口内未收到响应头就中止（检测到系统睡眠则抛 StreamSuspendedError），记 tengu_api_no_response_timeout。
 */
//@ chunk-hwmsct5x.js:284054-284792 layout
async function fetchWithFirstByteTimeout(e, n, r, s, h = Aa) {
  let y = Poo(s),
    abortController = new AbortController(),
    S = r.signal ?? void 0,
    E = S ? AbortSignal.any([S, abortController.signal]) : abortController.signal,
    R,
    now = h.now(),
    O = 0,
    M = () => {
      let now_2 = h.now(),
        G = now_2 - now;
      if (((now = now_2), G > SLEEP_GAP_THRESHOLD_MS)) O += G;
    },
    P = h.setTimeout(H, SLEEP_PROBE_INTERVAL_MS, { unref: !0 });
  function H() {
    (M(), (P = h.setTimeout(H, SLEEP_PROBE_INTERVAL_MS, { unref: !0 })));
  }
  let j = h.setTimeout(() => {
    (M(),
      (R = O > y / 2 ? new StreamSuspendedError(O) : new StreamNoResponseError(s, O)),
      abortController.abort(R));
  }, y);
  try {
    return await e(n, { ...r, signal: E });
  } catch (error) {
    if (R !== void 0 && !S?.aborted) {
      try {
        (logForDebugging(
          `[first-byte] no response headers ${y / 1000}s after dispatch${O > 0 ? ` (slept ${O}ms)` : ""} \u2014 aborting request`,
          { level: "error" },
        ),
          logEvent("tengu_api_no_response_timeout", {
            provider: getAPIProviderForAnalytics(),
            timeout_ms: y,
            ...(!isDiskless() && { slept_ms: O, suspended: R instanceof StreamSuspendedError }),
            escalated: s.escalated,
          }));
      } catch (error) {
        logError(error);
      }
      throw R;
    }
    throw error;
  } finally {
    (j(), P());
  }
}
/**
 * 字节流空闲超时错误：记录空闲时长、已收字节、TTFB、是否在等读取、cf-ray、睡眠时长。
 */
//@ chunk-hwmsct5x.js:284792-285084 layout
class StreamIdleTimeoutError extends Error {
  idleMs;
  bytesReceived;
  ttfbMs;
  bodyReadPending;
  cfRay;
  sleptMs;
  constructor(e, n = 0, r, s = !0, h, y = 0) {
    super(`stream idle: no bytes for ${e}ms`);
    ((this.name = "StreamIdleTimeoutError"),
      (this.idleMs = e),
      (this.bytesReceived = n),
      (this.ttfbMs = r),
      (this.bodyReadPending = s),
      (this.cfRay = h),
      (this.sleptMs = y));
  }
}
/**
 * 看门狗检测到系统挂起时的错误（中止后换新连接重试）。
 */
//@ chunk-hwmsct5x.js:285084-285293 layout
class StreamSuspendedError extends Error {
  sleptMs;
  code = "StreamSuspended";
  constructor(e) {
    super("Stream watchdog detected system suspend; aborting to retry on a fresh connection");
    this.sleptMs = e;
    this.name = "StreamSuspendedError";
  }
}
/**
 * 计时器触发的迟到量与墙钟睡眠量，判定是否跨越系统挂起。
 */
//@ chunk-hwmsct5x.js:285293-285491 layout
function measureTimerLateness(e, { armedAt: armedAt, wallArmedAt: wallArmedAt, idleMs: idleMs }) {
  let monotonicNow = e.monotonicNow(),
    now = e.now(),
    rounded = Math.round(monotonicNow - armedAt - idleMs),
    max = Math.max(0, Math.round(now - wallArmedAt - (monotonicNow - armedAt))),
    E = rounded < -idleMs / 2,
    R = max > idleMs / 2;
  return { lateMs: rounded, sleptMs: max, suspended: E && R };
}
/**
 * 流空闲计时器跨越睡眠触发时返回 StreamSuspendedError。
 */
//@ chunk-hwmsct5x.js:285491-285724 layout
function checkSuspendedStreamIdle(e, n) {
  try {
    let { lateMs: lateMs, sleptMs: sleptMs, suspended: suspended } = measureTimerLateness(e, n);
    if (!suspended) return;
    return (
      logForDebugging(
        `Streaming idle timer fired across sleep/suspend: late=${lateMs}ms slept=${sleptMs}ms, aborting stream`,
        { level: "warn" },
      ),
      new StreamSuspendedError(sleptMs)
    );
  } catch (error) {
    logError(toError(error));
    return;
  }
}
/**
 * Bedrock 流式响应 content-type 不是 application/vnd.amazon.eventstream 时抛出（多半有网关改写了响应）。
 */
//@ chunk-hwmsct5x.js:285724-286365 layout
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
/**
 * 包装响应体 ReadableStream：每块重置空闲计时，超时报 StreamIdleTimeoutError（或挂起时 StreamSuspendedError），并按 15/30/60/120s 记录部分停顿日志。
 */
//@ chunk-hwmsct5x.js:286365-288145 layout
function withByteIdleWatchdog(e, n, r, s, h = Aa) {
  let y = null,
    w = null,
    S = 0,
    E = 0,
    monotonicNow = h.monotonicNow(),
    L = null,
    O = !1,
    M = [15000, 30000, 60000, 120000],
    P = () => {
      if (w !== null) (w(), (w = null));
    },
    H = () => {
      if (y !== null) (y(), (y = null));
    },
    j = () => {
      (H(), P());
    },
    z = 0,
    G = 0,
    q = (Q) => {
      if ((P(), S >= M.length)) return;
      let ne = M[S],
        te = h.monotonicNow() - z;
      w = h.setTimeout(
        () => {
          if (((w = null), Q.desiredSize === null)) return;
          if (h.monotonicNow() - z < ne / 2) {
            q(Q);
            return;
          }
          try {
            logForDebugging(
              `[Stall] stream_idle_partial lastChunkAgeMs=${Math.round(h.monotonicNow() - z)} bytesTotal=${E} idleDeadlineMs=${n}`,
              { level: "warn" },
            );
          } catch {}
          (S++, q(Q));
        },
        Math.max(0, ne - te),
        { unref: !0 },
      );
    },
    J = (Q) => {
      (j(),
        (z = h.monotonicNow()),
        (G = h.now()),
        (S = 0),
        q(Q),
        (y = h.setTimeout(() => {
          y = null;
          let {
              lateMs: lateMs,
              sleptMs: sleptMs,
              suspended: suspended,
            } = measureTimerLateness(h, { armedAt: z, wallArmedAt: G, idleMs: n }),
            oe = Q.desiredSize === null;
          if (suspended) {
            logForDebugging(`[byte-watchdog] aborting: late=${lateMs}ms slept=${sleptMs}ms (sleep/suspend)`);
            let De = new StreamSuspendedError(sleptMs);
            try {
              Q.error(De);
            } catch {}
            reader.cancel(De).catch(() => {});
            return;
          }
          let ie = L !== null ? Math.round(L - monotonicNow) : void 0;
          try {
            if (
              (logForDebugging(
                `[byte-watchdog] firing: idle=${n}ms late=${lateMs}ms errored=${oe} bodyReadPending=${O}`,
                { level: "warn" },
              ),
              logForDiagnosticsNoPII("warn", "cli_byte_watchdog_fired", {
                idle_ms: n,
                late_ms: lateMs,
                readable_errored: oe,
                body_read_pending: O,
                slept_ms: sleptMs,
                bytes_received: E,
                ttfb_ms: ie ?? null,
              }),
              lateMs >= 1000 && !isDiskless())
            )
              logEvent("tengu_byte_watchdog_fired_late", {
                idle_ms: n,
                late_ms: lateMs,
                readable_errored: oe,
              });
          } catch {}
          let Se = new StreamIdleTimeoutError(n, E, ie, O, r, sleptMs);
          try {
            Q.error(Se);
          } catch {}
          reader.cancel(Se).catch(() => {});
        }, n)));
    },
    reader = e.getReader();
  return new ReadableStream({
    start(Q) {
      J(Q);
    },
    async pull(Q) {
      O = !0;
      let ne;
      try {
        ne = await reader.read();
      } catch (error) {
        ((O = !1), j());
        try {
          Q.error(error);
        } catch {}
        return;
      }
      if (((O = !1), ne.done)) {
        j();
        try {
          Q.close();
        } catch {}
        return;
      }
      let te = ne.value;
      if (L === null && te.byteLength > 0) L = h.monotonicNow();
      if (((E += te.byteLength), s)) ((s.lastAt = h.monotonicNow()), (s.chunks = (s.chunks ?? 0) + 1));
      J(Q);
      try {
        Q.enqueue(te);
      } catch {
        j();
      }
    },
    cancel(Q) {
      return (j(), reader.cancel(Q));
    },
  });
}
/**
 * CLAUDE_ENABLE_BYTE_WATCHDOG 或 tengu_stream_watchdog_default_on（默认开）。
 */
//@ chunk-hwmsct5x.js:288145-288266 layout
function isByteWatchdogEnabled() {
  let CLAUDE_ENABLE_BYTE_WATCHDOG = env.CLAUDE_ENABLE_BYTE_WATCHDOG;
  if (CLAUDE_ENABLE_BYTE_WATCHDOG !== void 0) return CLAUDE_ENABLE_BYTE_WATCHDOG;
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_stream_watchdog_default_on", !0);
}
/**
 * 第一方且是 Anthropic 官方 API，或 anthropicAws 未设自定义 base URL。
 */
//@ chunk-hwmsct5x.js:288266-288368 layout
function isDirectAnthropicEndpoint(e) {
  return (
    (e === "firstParty" && isFirstPartyAnthropicBaseUrl()) ||
    (e === "anthropicAws" && !process.env.ANTHROPIC_AWS_BASE_URL)
  );
}
/**
 * firstParty/gateway/anthropicAws（响应为 text/event-stream）。
 */
//@ chunk-hwmsct5x.js:288368-288442 layout
function isSseProvider(e) {
  return e === "firstParty" || e === "gateway" || e === "anthropicAws";
}
/**
 * 字节看门狗开启且当前提供商是 SSE 类（firstParty/gateway/anthropicAws）。
 */
//@ chunk-hwmsct5x.js:288442-288479 layout
function isStreamWatchdogApplicable() {
  return isByteWatchdogEnabled() && isSseProvider(getAPIProvider());
}
/**
 * CLAUDE_ENABLE_BYTE_WATCHDOG_BEDROCK。
 */
//@ chunk-hwmsct5x.js:288479-288538 layout
function isBedrockByteWatchdogEnabled() {
  return env.CLAUDE_ENABLE_BYTE_WATCHDOG_BEDROCK;
}
/**
 * 提供商支持字节看门狗：直连 Anthropic 端点，或 Bedrock 且开启了 Bedrock 看门狗。
 */
//@ chunk-hwmsct5x.js:288538-288587 layout
function supportsByteWatchdog(e) {
  return isDirectAnthropicEndpoint(e) || (e === "bedrock" && isBedrockByteWatchdogEnabled());
}
/**
 * 看门狗开启且路由提供商与当前提供商都支持时为真（传给代理层，避免重复的 body 空闲超时）。
 */
//@ chunk-hwmsct5x.js:288587-288644 layout
function shouldUseBodyIdleWatchdog(e) {
  if (!isByteWatchdogEnabled()) return !1;
  return supportsByteWatchdog(e) && supportsByteWatchdog(getAPIProvider());
}
/**
 * 用新 body 重建 Response 并保留 url。旧版名 getServerUrl 为错配。
 */
//@ chunk-hwmsct5x.js:288644-288739 layout = getServerUrl (1)
function cloneResponseWithBody(e, n) {
  let response = new Response(n, e);
  return (Object.defineProperty(response, "url", { value: e.url }), response);
}
/**
 * 包装 fetch（旧版 buildFetch）：第一方直连时补 x-client-request-id、拒答回退相关头、anthropic-usage-limit、tools-used 头；打 [API REQUEST] 日志；大请求体 gzip 压缩；按需加首字节看门狗；Bedrock 流缺 content-type 时补默认值、类型不对抛 BedrockUnexpectedContentTypeError；SSE/eventstream 响应体加字节空闲看门狗。
 */
//@ chunk-hwmsct5x.js:288739-291521 callgraph-fingerprint = buildFetch (0.183)
function buildFetch(e, n, r, s, h, y, w, S, E) {
  let R = e ?? fetchWithRequestBodyCompression,
    L = getAPIProvider(),
    O = isDirectAnthropicEndpoint(L);
  return async (input, init) => {
    let headers = new Headers(init?.headers),
      j = input instanceof Request ? input.url : String(input),
      { method: method } = requestMethodAndUrl(input, init);
    guardTestFetch(R, method, j);
    let G = headers.get(CLIENT_REQUEST_ID_HEADER) ?? void 0;
    if (O && !headers.has(CLIENT_REQUEST_ID_HEADER)) headers.set(CLIENT_REQUEST_ID_HEADER, randomUUID());
    if (O && ((hasRefusalFallbackOccurred() && Kc()) || hasRefusalFallbackHeaderArmed())) {
      headers.set(REFUSAL_FALLBACK_HEADERS, "true");
      let be = sanitizeHeaderValue(getRefusalFallbackLatchOriginRequestId());
      if (be !== void 0) headers.set(X_CC_FALLBACK_LATCHED_BY, be);
    }
    if (isMessagesEndpoint(j) && isFirstPartyApiBackend() && _st()) headers.set(ANTHROPIC_USAGE_LIMIT, SLOW);
    if (O) {
      let be = getRequestAtis();
      if (be !== void 0) headers.set(ATIS_REQUEST_HEADER, be);
    }
    if (isMessagesEndpoint(j) && pf()) {
      let be = !1;
      try {
        be = isOfficialFirstPartyEndpoint(L);
      } catch {}
      if (be) {
        if (
          (headers.set(SANDY_PLOVER_HEADER, toolsUsedHeaderBuilder(getConversationToolsUsed())),
          Ws().once("tools_used_header"))
        )
          logFeatureOk("api_tools_used_header");
      }
    }
    try {
      let id = headers.get(CLIENT_REQUEST_ID_HEADER);
      if (
        (logForDebugging(
          `[API REQUEST] ${new URL(j).pathname}${id ? ` ${CLIENT_REQUEST_ID_HEADER}=${id}` : ""} source=${n ?? "unknown"}`,
        ),
        getMinDebugLogLevel() === "verbose")
      )
        logForDebugging(`[API REQUEST AUTH] ${jsonStringify(summarizeAuthHeadersForLog(headers))}`, {
          level: "verbose",
        });
    } catch {}
    if (S && O && isMessagesEndpoint(j)) await attachSenderAddress(headers, S);
    let q = { ...init, headers: headers },
      J = init?.body,
      Z = takeDispatchAt(G),
      Q = ANT_KEY_PFX(j, J, h),
      ne = Q?.gzip && (typeof J === "string" || Ast(J)),
      te = ne ? gzipLevelOverride() : void 0;
    if (ne)
      ((q.compress = te === void 0 ? "gzip" : { encoding: "gzip", level: te }),
        PEn(),
        (q.body =
          typeof J === "string" ? appendWatermark(J) : appendWatermarkBuffer(J, "room_after_is_free")));
    if (G !== void 0 && Q !== void 0) {
      let be = {
        ...(Z !== void 0 && { requestPrepareMs: Math.round(performance.now() - Z) }),
        ...reuseTelemetry(J),
      };
      ZXo(
        G,
        Q.gzip
          ? {
              requestBodyEncoding: "gzip",
              requestBodyChars: Q.bodyChars,
              requestBodyGzipLevel: te,
              querySource: r,
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
    let ae = getFirstByteWatchdogPlan({
        clientRequestId: G,
        provider: L,
        routedProvider: s,
        method: method,
        url: j,
        body: J,
        noResponseRetryLedger: w,
      }),
      oe = (be) => {
        try {
          return shouldUseFirstPartyFetchOptions({ provider: L, routedProvider: s, url: j, init: be });
        } catch (error) {
          return (logError(toError(error)), !1);
        }
      },
      ie = { init: q, firstParty: !1 },
      Se = (be) => (
        (ie.init = be),
        (ie.firstParty = oe(be)),
        ae === void 0 ? R(input, be) : fetchWithFirstByteTimeout(R, input, be, ae, y)
      ),
      De = O && isMessagesEndpoint(j);
    if (De) noteModelRequestSent(y.now());
    let se = await Se(q);
    if ((guardTestFetchRedirect(R, method, se), ne))
      ((se = await handleGzipRejectedResponse(se, () => Se(q))),
        (se = await retryRejectedGzipRequest({
          res: se,
          dispatch: Se,
          finalInit: q,
          identityBody: J,
          clientRequestId: G,
          storageV5: h,
        })));
    let bn = ie.firstParty && Nd(se, j);
    if (De) Gc(se.headers, () => L !== "firstParty" || isOfficialFirstPartyEndpoint(L));
    let ze = L === "bedrock" && se.ok && j.includes(BEDROCK_STREAM_PATH);
    if (
      ze &&
      se.body &&
      !se.headers.get("content-type") &&
      !env.CLAUDE_CODE_DISABLE_BEDROCK_CONTENT_TYPE_DEFAULT
    )
      ((se = cloneResponseWithBody(se, se.body)),
        se.headers.set("content-type", "application/vnd.amazon.eventstream"));
    let Qn = se.headers.get("content-type"),
      pt = Qn?.toLowerCase();
    if (
      ze &&
      Qn &&
      !pt?.includes("vnd.amazon.eventstream") &&
      !env.CLAUDE_CODE_DISABLE_BEDROCK_CONTENT_TYPE_GUARD
    )
      throw (se.body?.cancel().catch(() => {}), new BedrockUnexpectedContentTypeError(Qn));
    let kt = (isSseProvider(L) || O) && pt?.includes("text/event-stream"),
      Zn = L === "bedrock" && pt?.includes("vnd.amazon.eventstream") && isBedrockByteWatchdogEnabled();
    if ((kt || Zn) && se.body && isByteWatchdogEnabled()) {
      let be = getByteIdleTimeoutForProvider(L),
        $e = se.headers.get("cf-ray") ?? (Zn ? (se.headers.get("x-amzn-requestid") ?? void 0) : void 0),
        yn = { lastAt: 0 },
        er = kt ? fh(E) : 0,
        tr = cloneResponseWithBody(
          se,
          withByteIdleWatchdog(er > 0 ? hh(se.body, er, y) : se.body, be, $e, yn, y),
        );
      (Object.defineProperty(tr, "_chunkTimes", { value: yn }), (se = tr));
    }
    if (bn && oe(ie.init)) Bd(se.headers);
    return se;
  };
}
/**
 * 调试日志用：Authorization 只保留方案名（"Bearer ***"），并列出 anthropic-beta 与 x-anthropic-* 头。
 */
//@ chunk-hwmsct5x.js:291521-291734 sole-consumer
function summarizeAuthHeadersForLog(e) {
  let n = e.get("authorization"),
    r = n ? `${n.includes(" ") ? firstLineOf(n, " ") : "<opaque>"} ***` : "none",
    s = {};
  return (
    e.forEach((h, y) => {
      if (y === "anthropic-beta" || y.startsWith("x-anthropic-")) s[y] = h;
    }),
    { auth: r, headers: s }
  );
}
/**
 * 等待 promise，完成后若 signal 已中止则抛 AbortError。
 */
//@ chunk-hwmsct5x.js:291734-291807 sole-consumer
async function awaitUnlessAborted(e, n) {
  let r = await e;
  if (n?.aborted) throw new Lf();
  return r;
}
/**
 * 解析 ANTHROPIC_CUSTOM_HEADERS（每行 "名: 值"）为 [名, 值] 数组；无冒号或名为空的行忽略。
 */
//@ chunk-bwbq4xvm.js:156422-156608 fingerprint = getCustomHeaders (1)
function getCustomHeaders(e = env.ANTHROPIC_CUSTOM_HEADERS ?? "") {
  let s = [];
  for (let n of e.split(/\r?\n/)) {
    let colonIdx = n.indexOf(":"),
      a = colonIdx === -1 ? "" : n.slice(0, colonIdx).trim();
    if (a) s.push([a, n.slice(colonIdx + 1).trim()]);
  }
  return s;
}
/**
 * API key 转 Authorization: Bearer 头（空时返回空对象）。
 */
//@ chunk-vv0zxx69.js:1191-1249 fingerprint = configureApiKeyHeaders (0.627)
function configureApiKeyHeaders(e) {
  return e ? { Authorization: `Bearer ${e}` } : {};
}
const getCustomHeaders_3 = getCustomHeaders; //@ cross-chunk alias

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
