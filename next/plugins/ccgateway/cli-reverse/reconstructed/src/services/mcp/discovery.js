/**
 * services/mcp/discovery.ts
 *
 * 2.1.316 新增。MCP 服务器发现与工具获取。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-h44h5gdv.js (40)
 * attribution: placement 40
 */
import { identityId2 } from "../../types/ids.js";
import {
  ToolListChangedNotificationSchema,
  PromptListChangedNotificationSchema,
  ResourceListChangedNotificationSchema,
  ErrorCode,
  ListToolsResultSchema,
  McpError,
  ListResourcesResultSchema,
  ListResourceTemplatesResultSchema,
  ListPromptsResultSchema,
} from "../../../vendor/@modelcontextprotocol/sdk/dist/esm/types.js";
import {
  createListChangedRefetcher,
  withOverlapSlots,
  memoryChainMeta,
  rememberMemoryChain,
  wireFileInputs,
} from "./connectionLifecycle.js";
import {
  isWithdrawnBuiltinPluginServer,
  withdrawnBuiltinPluginServerError,
  isMcpServerBlockedAtConnectTime,
  isMcpServerDisabled,
} from "./config.js";
import {
  refuseCachedRowV1,
  getCachedConnectResult,
  detachAndCloseConnection_2,
  emitCachedAdoptSignal,
  recordCachedDialFailureV1,
  isLegacyProtocolEra,
  primeEnsureConnectedClient,
  evictStaleFailedConnectMemoForServe,
} from "./connectionRegistry.js";
import { judgeGate } from "../analytics/growthbookGates.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  errorMessage,
  AbortError,
  toError,
  isAbortError,
} from "../../utils/errors.js";
import { reservedAddressRefusalText } from "./mcpToggleMessages.js";
import { identityEpoch, getMcpIdentitySnapshot, isCurrentIdentityEpoch } from "./identityChange.js";
import {
  TOOL_USE_ID_PATTERN,
  isDesignGatedTool,
  gateDesignWriteWithoutPlanToken,
  rememberDesignConsentAsk,
  canAskDesignConsent,
  askDesignConsent,
  isDesignServerConfig,
  takeDesignConsentAsk,
  noteDesignProjectId,
  canPromptForPermission,
  wrapCallWithDesignConsent,
} from "./connectAuth.js";
import {
  connectToServer_2,
  serverCacheKey,
  configHash,
  maxDescriptionLength,
  truncateDescription,
  mapInTurns,
  loggingSafeOrigin,
  mcpBaseUrlAnalytics,
  shouldNormalizeRootCombinators,
  shouldDropInvalidToolSchemas,
  isIncludedMcpTool_2,
  logToolCallXmlInDescriptions,
  needsAuthCacheModuleV1,
  callMCPTool_2,
  artifactsMcpLaptopModuleV1,
  callMCPToolWithUrlElicitationRetry_2,
  McpSessionExpiredError,
  isNeedsApprovalOrExpiredSessionV1,
  artifactPermissionRulesModuleV1,
  claudeDocsWakeModuleV1,
  stripTrailingInvokeSuffix,
  isIdeServer,
  listAllPages,
  setMcpAuthCacheEntry,
  transformResultContent,
} from "./client.js";
import { boundDial } from "./dialFailureLatch.js";
import { AUTH_MESSAGES, getConnectionCache, memoizeWithLRU, hasLapsedCcrSignIn } from "./needsAuthCache.js";
import { isDiscoveryCacheOn, isUnresolved } from "./mcpAccountKey.js";
import { normalizeMcpServerName } from "../api/deferredToolsState.js";
import { classifyMcpErrorSourceCategory, CCR_NEEDS_APPROVAL_CODE } from "./mcpResultErrors.js";
import { getCliOwnedState, isCliOwnedConfig } from "./cliOwnedClients.js";
import {
  lit,
  fromNumber,
  fromEnum,
  fromEnumOpt,
  mcpNameForAnalytics_GATE_EVALUATED,
} from "../analytics/safeMetadata.js";
import { sanitizableErrorCode } from "../api/errorUtils.js";
import { hasChannelCapability } from "./channelNotification.js";
import {
  writeDiscoveryCache,
  mergeDiscoveryTools,
  isDiscoveryCacheEligible,
  isCacheableServer,
} from "./discoveryCache.js";
import { logMCPDebug, logMCPError } from "../../utils/log.js";
import { buildMcpToolName } from "./mcpStringUtils.js";
import { toolUiMeta, describeHiddenMcpTool } from "./toolNameLimits.js";
import { requiresConnectorGrant, connectorServerId } from "./claudeai.js";
import {
  ownsLegacyKey,
  isLegacyKeyUnclaimed,
  mayRecordServerOwner,
  isServerIdentityActive,
  isLegacyKeyRefused,
  isLegacyKeyOwnedElsewhere,
  enforcesGrants,
} from "./serverIdentity.js";
import { MCPTool } from "../../tools/MCPTool/MCPTool.js";
import {
  refuseNonMainAccountMemoryWrite,
  applyMemoryCallerMeta,
} from "../accountMemory/accountMemoryServer.js";
import { logEvent } from "../analytics/index.js";
import { MAX_MCP_RESULT_CHARS } from "../../constants/outputLimits.js";
import {
  addComputerUseActionSummary,
  addActionSummaryToSchema,
} from "../../utils/permissions/actionSummary.js";
import {
  applyParamDescriptionOverrides,
  officialPluginPromptOverrides,
} from "./officialPluginPromptOverrides.js";
import { peekScopeExpansionNotice } from "./firstPartyDesignConsent.js";
import { DesignGateState } from "./designPlanGate.js";
import { REMOTE_BROWSER_SERVER_NAME } from "./remoteBrowserServer.js";
import { isRemoteBrowserModeFloorOn } from "../../utils/permissions/remoteBrowser.js";
import {
  filterRemoteRepoTools,
  isMcpServerLoggableInAnalytics,
  isRunnerDynamicServer,
  isOwnCcrMcpServer,
  isOwnArtifactMcpTool,
  markMcpServerLoggable,
} from "../analytics/metadata.js";
import {
  createStreamingListingSanitizer,
  listingTruncatedNote,
} from "../../tools/WebFetchTool/sanitizeListing.js";
import { CLAUDEAI_SERVER_PREFIX } from "./normalization.js";
import { env } from "../../utils/env.js";
import { applyBlockedToolPolicy } from "./blockedServers.js";
import { logForDebugging } from "../../utils/debug.js";
import { judgeToolSchemaSendability } from "./toolSchemaSendability.js";
import { joinDescription } from "../../remote/tools/inputSchemaFlatten.js";
import { uniqByExport } from "../../../vendor/lodash-es/uniqBy.js";
import { countByAlias } from "../../../vendor/lodash-es/countBy.js";
import { toolTimeoutForServer } from "./mcpTimeouts.js";
import { buildPluginEventFieldsFromId, recordPluginUsage } from "../../utils/telemetry/pluginTelemetry.js";
import { policyEnabledPluginNameSet } from "../../utils/plugins/pluginPolicy.js";
import { CLAUDE_ARTIFACTS } from "./firstPartyServerIds.js";
import {
  isMemoryToolServer,
  isMemoryToolServer_2,
  isMemoryServerConnection,
  isAccountMemoryServer,
  raiseMemoryErrorCap,
} from "../../memdir/memoryTool.js";
import { isDocsConnectorClient, isDocsConnectorServer } from "../../tools/ArtifactTool/docsConnector.js";
import { mcpServerSource, chromeUploadMaxBytes } from "./fileReference/fileReferencePolicy.js";
import { withDisplayName, dynamicServerConnectorId } from "./mcpToolDecoration.js";
import {
  isStandardKeyActive,
  getServerIdentityKey,
  isIdentityTrackedServer,
  isRemoteTransport,
} from "./mcpStandardKeys.js";
import { serverProvenanceOf } from "../api/toolProvenance.js";
import { stripIgnorables } from "../../utils/sanitization.js";
import { isClaudeInChromeMCPServer } from "../../utils/claudeInChrome/common.js";
import {
  proxyFillsListing,
  fileReferenceToolToFill,
  wrapFileReferenceTool,
  filledCallRequestMeta,
  fileReferenceToolForRecords,
} from "./fileReference/wrapFileReferenceTool.js";
import { isStdioConfig, isClaudeAiProxyServer } from "./builtinServerNames.js";
import {
  createChromePermissionHandler,
  readTabUrl,
  judgedSiteMeta,
} from "../../utils/claudeInChrome/chromePermissions.js";
import { IMAGE_LIMITS } from "../../utils/mediaLimits.js";
import {
  isFileUploadServer,
  buildMcpToolPermissionOverrides,
  FILE_UPLOAD_TOOLS,
  ANTHROPIC_HOSTASKSPERUPLOADEDFILE,
} from "./utils.js";
import { isSlackSendToolName, createSlackSendToolUi } from "../../tools/MCPTool/slackSend.js";
import { isClaudeTestWriteCall } from "../../plugins/bundled/claudeTest/constants.js";
import { claudeTestWriteToolOverrides } from "./claudeTestWriteTool.js";
import { getFirstToolUseId_2 } from "./sdkManifest.js";
import {
  stripHostMetaUnlessCcrScoped,
  rewriteAnthropicSourcesForCcr,
} from "../../bridge/bridgePermissionCallbacks.js";
import { consumeMcpApprovalTicket } from "../../bridge/mcpApprovalTickets.js";
import { requestIdMeta } from "./resultContent.js";
import { isHearthbotRelayServer } from "../projectsRelay/relayConfig.js";
import { ccrTurnEventHeaders } from "../../utils/telemetry/ccrTraceContext.js";
import { turnTraceContextsOf } from "../../utils/telemetry/sessionTracing.js";
import { agentRequestMeta } from "./agentRequestMeta.js";
import { getPermissionPromptToolName } from "../../bootstrap/state.js";
import { parkOnUser } from "../../utils/sessionActivity.js";
import { issuerKey_3 } from "./xaaIdpLogin.js";
import { imageLimitsForModel } from "../../utils/attachmentMedia.js";
import { getBackgroundAgentId } from "../../utils/agentContext.js";
import { isSameOriginAsCcr } from "./ccrMcpUrls.js";
import { INTERRUPTED_CALL_NOTICE } from "./mcpCallConstants.js";
import { logPrCreateOperation, zipOperationFields } from "../../utils/git/gitOperationTelemetry.js";
import { chromeNoBrowserAnswer } from "../../utils/claudeInChrome/chromePermissionRules.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../analytics/featureTelemetry.js";
import { stripAnthropicMeta } from "./anthropicMeta.js";
import { noteHearthDegraded } from "./hearthDegraded.js";
import { describeConnectError, isDesignMcpUrl } from "./auth.js";
import {
  markRefusedByCcrProxy,
  GET_TASK,
  isToolboxServer,
  isTaskWriteMethod,
  findPendingTaskFilesForArgs,
  discardTaskFiles,
  registerDiscarder,
  isRefusedByCcrProxy,
  unregisterDiscarder,
  markTaskFilesSent,
  isToolboxMcpServer,
} from "./agentTaskFiles.js";
import { netModule } from "./transportGuards.js";
import { UNLIMITED_RATE_LIMITER } from "../../tasks/taskLoopRegistry.js";
import { isLiveMemoryTool } from "./memoryServerVerification.js";
import { foregroundCallRegistrySlots } from "../tools/detachedToolCalls.js";
import { wrapHoldAware } from "../../plugins/functionHooks/inputHold.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import { resolveSdkUrl } from "../../cli/transports/sdkUrlValidation.js";
import { ANTHROPIC_FILEINPUTS } from "../mcpServe/fileInputs.js";
import { policyDeniedReason } from "../policyLimits/policyVerdicts.js";
import { recordPluginActivity } from "../../utils/pluginActivity.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { countWhere } from "../../utils/collections.js";
import { logChromeToolsAdded } from "../../utils/claudeInChrome/telemetry.js";
import { listToolsWithMemo, settleToolListingMemo } from "./toolSchemaValidation.js";
import { redactMcpErrorDetail } from "./mcpServerOrigin.js";
import { isListAuthError, isClaudeAiBearerRejectedError } from "./listAuthError.js";
import { getMcpInfoFromConnection } from "./types.js";
import { hostedDesktopRefusal_2 } from "./mcpWireUtils.js";
import { plural } from "../../utils/stringUtils.js";
import { recordToolUsed } from "../compact/keptTools.js";
import { checkCommandListable } from "../../utils/commandPredicates.js";
import { RESERVED_SKILL_NAMESPACE_REASON } from "../../skills/reservedSkillNames.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-h44h5gdv.js:89839-89906 placement
/**
 * 监听工具列表变化并按需重新拉取。
 */
function watchToolListChanges(connection, refetch) {
  identityId2(connection.client).setNotificationHandler(
    ToolListChangedNotificationSchema,
    createListChangedRefetcher(connection, refetch),
  );
}
//@ chunk-h44h5gdv.js:89906-89973 placement
/**
 * 监听提示列表变化。
 */
function watchPromptListChanges(connection, refetch) {
  identityId2(connection.client).setNotificationHandler(
    PromptListChangedNotificationSchema,
    createListChangedRefetcher(connection, refetch),
  );
}
//@ chunk-h44h5gdv.js:89973-90040 placement
/**
 * 监听资源列表变化。
 */
function watchResourceListChanges(connection, refetch) {
  identityId2(connection.client).setNotificationHandler(
    ResourceListChangedNotificationSchema,
    createListChangedRefetcher(connection, refetch),
  );
}
//@ chunk-h44h5gdv.js:90040-90100 placement
/**
 * 设置任意通知处理器。
 */
function watchNotification(connection, schema, handler) {
  identityId2(connection.client).setNotificationHandler(schema, handler);
}
//@ chunk-h44h5gdv.js:90100-91821 placement
async function connectMcpServer(server, options) {
  if (server.type === "connected" && server.config.type === "sdk") return server;
  if (isWithdrawnBuiltinPluginServer(server.name, server.config))
    throw withdrawnBuiltinPluginServerError(server.name);
  if (isMcpServerBlockedAtConnectTime(server.name, server.config)) {
    if (server.type === "cached") refuseCachedRowV1(server.name, server.config, "policy");
    if (judgeGate(server.name, server.config))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        reservedAddressRefusalText(server.name),
        "MCP server refused at a reserved address",
      );
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `MCP server "${server.name}" is blocked by managed policy`,
      "MCP server blocked by policy",
    );
  }
  if (
    isMcpServerDisabled(server.name) &&
    (await getCachedConnectResult(server.name, server.config))?.type !== "connected"
  ) {
    if (server.type === "cached") refuseCachedRowV1(server.name, server.config, "disabled");
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `MCP server "${server.name}" is disabled \u2014 re-enable it via /mcp to use its tools`,
      "MCP server disabled",
    );
  }
  let epochAtDial = identityEpoch();
  let toolUseBinding =
    server.type === "cached" &&
    options?.toolUseId !== undefined &&
    TOOL_USE_ID_PATTERN.test(options.toolUseId)
      ? {
          toolUseId: options.toolUseId,
          withListings: options.toolUseIdWithListingsUntil !== undefined,
        }
      : undefined;
  let dial =
    toolUseBinding === undefined
      ? connectToServer_2(server.name, server.config)
      : connectToServer_2(server.name, server.config, undefined, undefined, undefined, toolUseBinding);
  if (toolUseBinding !== undefined) {
    let clearBinding = () => {
      toolUseBinding.toolUseId = undefined;
    };
    (options?.toolUseIdWithListingsUntil ?? dial).then(clearBinding, clearBinding);
  }
  if (server.type === "cached")
    dial.then(
      (connected) => runCachedFirstDialArms(connected, dial, epochAtDial),
      () => {},
    );
  let connection = await boundDial(dial, {
    signal: options?.signal,
    timeoutMs: options?.timeoutMs,
    serverName: server.name,
    context: options?.context ?? "MCP connection",
  });
  if (connection.type !== "connected") {
    if (connection.type === "needs-auth")
      throw Object.assign(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          AUTH_MESSAGES.dialNeedsAuth(server.name, server.config),
          "MCP server needs authentication",
        ),
        {
          mcpErrorSource: "user_auth",
        },
      );
    let errorCode = connection.type === "failed" ? connection.errorCode : undefined;
    throw Object.assign(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        AUTH_MESSAGES.dialNotConnected(
          server.name,
          isDiscoveryCacheOn() && connection.type === "failed" && connection.error
            ? `: ${normalizeMcpServerName(connection.error)}`
            : "",
        ),
        "MCP server not connected",
      ),
      {
        mcpErrorSource: classifyMcpErrorSourceCategory(
          Object.assign(Error("MCP dial failed"), {
            code: errorCode !== undefined && /^-?\d+$/.test(errorCode) ? Number(errorCode) : errorCode,
          }),
        ),
        mcpDialCode: errorCode,
        mcpDialNotForwarded: connection.type === "failed" ? connection.notForwardedMessage : undefined,
      },
    );
  }
  if (isWithdrawnBuiltinPluginServer(server.name, server.config)) {
    await detachAndCloseConnection_2(connection);
    throw withdrawnBuiltinPluginServerError(server.name);
  }
  return connection;
}
//@ chunk-h44h5gdv.js:91821-91901 placement
/**
 * 判断缓存条目是否已被取代。
 */
function isSupersededCacheEntry_2(cacheEntry, name, config) {
  let cache = connectToServer_2.cache;
  if (!cache?.get) return false;
  return cache.get(serverCacheKey(name, config)) !== cacheEntry;
}
//@ chunk-h44h5gdv.js:91901-91951 placement
/**
 * 判断该次拨号是否已被取代。
 */
function isSupersededDial_2(dial) {
  return getCliOwnedState().supersededDials.has(dial);
}
//@ chunk-h44h5gdv.js:91951-92357 placement
/**
 * 缓存首次拨号结束后的处理（v1 副本）：身份变化或被取代时关闭，成功或需认证时记录，失败时删除记忆并上报。
 */
function runCachedFirstDialArms(result, dial, epochAtDial) {
  let cachedFirstDialArmsRan = getCliOwnedState().cachedFirstDialArmsRan;
  if (cachedFirstDialArmsRan.has(result)) return;
  cachedFirstDialArmsRan.add(result);
  let cacheKey = serverCacheKey(result.name, result.config);
  let currentDial = getConnectionCache().connections.get(cacheKey);
  let identityChanged = identityEpoch() !== epochAtDial;
  let isStaleAdopt = currentDial === undefined && identityChanged;
  if (isSupersededDial_2(dial) || (currentDial !== undefined && currentDial !== dial) || isStaleAdopt) {
    if (!isSupersededDial_2(dial) && identityChanged && result.type === "connected")
      detachAndCloseConnection_2(result);
    return;
  }
  if (result.type === "connected" || result.type === "needs-auth") {
    emitCachedAdoptSignal(result.name, result.config);
    return;
  }
  getConnectionCache().connections.delete(cacheKey);
  if (result.type === "failed")
    recordCachedDialFailureV1(result, !getCliOwnedState().swrRefreshDialsInFlight.has(dial));
}
//@ chunk-h44h5gdv.js:92357-92395 placement
/**
 * 判断两个配置哈希是否相同。
 */
function sameConfigHash(configA, configB) {
  return configHash(configA) === configHash(configB);
}
//@ chunk-h44h5gdv.js:92395-93463 placement
var OAUTH_ERROR_CODES = [
  "invalid_request",
  "invalid_client",
  "invalid_grant",
  "unauthorized_client",
  "access_denied",
  "unsupported_grant_type",
  "invalid_scope",
  "server_error",
  "temporarily_unavailable",
  "ENDPOINT_NOT_FOUND",
  "AUTH_HEADER_REJECTED",
  "HEADERS_HELPER_AUTH_REJECTED",
  "CONNECT_TIMEOUT",
  "CONNECT_SUSPENDED",
  "CREDENTIAL_STORE_UNAVAILABLE",
  "ISSUER_ECHO_DENIED",
  "CLAUDEAI_BEARER_REJECTED",
  "CLI_OWNED_BEARER_REJECTED",
  "FIRST_PARTY_AUTH_REJECTED",
  "INVALID_CONFIG",
  "UNCONFIGURED",
  "ENOENT",
  "EACCES",
  "EPERM",
  "EADDRINUSE",
  "ERR_INVALID_URL",
  "ABORT_ERR",
  "UNKNOWN_CERTIFICATE_VERIFICATION_ERROR",
  "NOT_CONNECTED",
  "ALREADY_CONNECTED",
  "NOT_INITIALIZED",
  "CAPABILITY_NOT_SUPPORTED",
  "REQUEST_TIMEOUT",
  "CONNECTION_CLOSED",
  "SEND_FAILED",
  "INVALID_RESULT",
  "UNSUPPORTED_RESULT_TYPE",
  "INPUT_REQUIRED_ROUNDS_EXCEEDED",
  "LIST_PAGINATION_EXCEEDED",
  "METHOD_NOT_SUPPORTED_BY_PROTOCOL_VERSION",
  "ERA_NEGOTIATION_FAILED",
  "CLIENT_HTTP_NOT_IMPLEMENTED",
  "CLIENT_HTTP_AUTHENTICATION",
  "CLIENT_HTTP_FORBIDDEN",
  "CLIENT_HTTP_UNEXPECTED_CONTENT",
  "CLIENT_HTTP_FAILED_TO_OPEN_STREAM",
  "CLIENT_HTTP_FAILED_TO_TERMINATE_SESSION",
];
//@ chunk-h44h5gdv.js:93463-93632 placement
/**
 * 把连接错误码收敛为可上报值（v1 副本）。
 */
function sanitizeConnectErrorCodeForTelemetry_2(code) {
  if (code === undefined) return lit("missing");
  if (/^-?\d+$/.test(code)) return fromNumber(Number(code));
  let found = OAUTH_ERROR_CODES.find((knownCode) => knownCode === code);
  if (found !== undefined) return fromEnum(found);
  return sanitizableErrorCode(code) ?? lit("other");
}
//@ chunk-h44h5gdv.js:93632-93926 placement
var LIST_FAILURE_REASONS_V1; // deferred: uses ErrorCode (../../../vendor/@modelcontextprotocol/sdk/dist/esm/types.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-h44h5gdv.js:93632", () => {
  LIST_FAILURE_REASONS_V1 = {
    [ErrorCode.ConnectionClosed]: "connection_closed",
    [ErrorCode.RequestTimeout]: "request_timeout",
    [CCR_NEEDS_APPROVAL_CODE]: "ccr_needs_approval",
    [ErrorCode.ParseError]: "parse_error",
    [ErrorCode.InvalidRequest]: "invalid_request",
    [ErrorCode.MethodNotFound]: "method_not_found",
    [ErrorCode.InvalidParams]: "invalid_params",
    [ErrorCode.InternalError]: "internal_error",
  };
});
//@ chunk-h44h5gdv.js:93926-94109 placement
/**
 * 把 MCP 工具输入转换为自动模式分类器的输入文本（v1 副本）。
 */
function mcpToolInputToAutoClassifierInput(input, name) {
  let keys = Object.keys(input);
  if (keys.length === 0) return name;
  return keys
    .map((key) => {
      let value = input[key];
      let text = typeof value === "object" && value !== null ? JSON.stringify(value) : String(value);
      return `${key}=${text}`;
    })
    .join(" ");
}
//@ chunk-h44h5gdv.js:94109-94252 placement
function beginDroppedToolsRoundV1(connection) {
  let droppedToolsSeqByConnection = getCliOwnedState().droppedToolsSeqByConnection;
  let sequence = droppedToolsSeqByConnection.get(connection) ?? {
    started: 0,
    applied: 0,
  };
  droppedToolsSeqByConnection.set(connection, sequence);
  sequence.started += 1;
  return {
    seq: sequence.started,
    state: sequence,
  };
}
//@ chunk-h44h5gdv.js:94252-94309 placement
/**
 * 取服务器的 tools/list 错误。
 */
function getToolsListError(toolsResult) {
  return getCliOwnedState().toolsListErrorByResult.get(toolsResult);
}
//@ chunk-h44h5gdv.js:94309-94364 placement
/**
 * 取服务器的发现阶段请求错误。
 */
function getDiscoveryFetchError_2(templatesResult) {
  return getCliOwnedState().discoveryFetchErrors.get(templatesResult);
}
//@ chunk-h44h5gdv.js:94364-94424 placement
/**
 * 当前身份令牌。
 */
function currentIdentityToken() {
  isLegacyProtocolEra();
  let target = getMcpIdentitySnapshot();
  return isUnresolved(target) ? undefined : target.token;
}
//@ chunk-h44h5gdv.js:94424-94556 placement
/**
 * 首次时记录 MCP 身份基线（v1 副本）。
 */
function seedMcpIdentityCheck() {
  let cliOwnedState = getCliOwnedState();
  if (cliOwnedState.identitySeedAttempted) return;
  cliOwnedState.identitySeedAttempted = true;
  let identityToken = currentIdentityToken();
  if (identityToken !== undefined) cliOwnedState.identityBaseline = identityToken;
}
//@ chunk-h44h5gdv.js:94556-94766 placement
/**
 * 判断 MCP 身份自上次检查以来是否变化并更新基线（v1 副本）。
 */
function mcpIdentityChangedSinceLastCheck() {
  let identityToken = currentIdentityToken();
  let cliOwnedState = getCliOwnedState();
  if (identityToken === undefined) {
    cliOwnedState.identityBaseline = undefined;
    return true;
  }
  if (cliOwnedState.identityBaseline === undefined) {
    cliOwnedState.identityBaseline = identityToken;
    return true;
  }
  if (cliOwnedState.identityBaseline === identityToken) return false;
  cliOwnedState.identityBaseline = identityToken;
  return true;
}
//@ chunk-h44h5gdv.js:94766-94879 placement
/**
 * 记录原始工具列表与拉取时间（v1 副本）。
 */
function recordRawToolsForResult(result, rawTools) {
  if (!isDiscoveryCacheOn()) return;
  let cliOwnedState = getCliOwnedState();
  cliOwnedState.rawToolsByResult.set(result, rawTools);
  cliOwnedState.rawFetchedAtByResult.set(result, Date.now());
}
//@ chunk-h44h5gdv.js:94879-94995 placement
/**
 * 记录原始命令列表与拉取时间（v1 副本）。
 */
function recordRawCommandsForResult(result, rawCommands) {
  if (!isDiscoveryCacheOn()) return;
  let cliOwnedState = getCliOwnedState();
  cliOwnedState.rawCommandsByResult.set(result, rawCommands);
  cliOwnedState.rawFetchedAtByResult.set(result, Date.now());
}
//@ chunk-h44h5gdv.js:94995-95112 placement
/**
 * 记录原始资源列表与拉取时间（v1 副本）。
 */
function recordRawResourcesForResult_2(result, rawResources) {
  if (!isDiscoveryCacheOn()) return;
  let cliOwnedState = getCliOwnedState();
  cliOwnedState.rawResourcesByResult.set(result, rawResources);
  cliOwnedState.rawFetchedAtByResult.set(result, Date.now());
}
//@ chunk-h44h5gdv.js:95112-95164 placement
/**
 * 记录服务器的发现阶段请求错误。
 */
function setDiscoveryFetchError(result, error) {
  getCliOwnedState().discoveryFetchErrors.set(result, error);
}
//@ chunk-h44h5gdv.js:95164-95317 placement
/**
 * 发现缓存命中但服务器具备频道能力时改为未命中（v1 副本）。
 */
function applyCapabilityServeTimeMiss_2(probe) {
  if (probe.kind !== "fresh" && probe.kind !== "stale") return probe;
  let capabilities = probe.entry.capabilities;
  if (hasChannelCapability(capabilities))
    return {
      kind: "miss",
      reason: "channel-capable",
    };
  return probe;
}
//@ chunk-h44h5gdv.js:95317-96904 placement
async function persistDiscovery(connection, listing) {
  isLegacyProtocolEra();
  let cliOwnedState = getCliOwnedState();
  if (cliOwnedState.persistedDiscoveryRounds.has(listing.tools)) return true;
  if (!isCurrentIdentityEpoch(listing.identityEpoch)) return true;
  let rawTools = cliOwnedState.rawToolsByResult.get(listing.tools);
  let rawCommands = cliOwnedState.rawCommandsByResult.get(listing.commands);
  let rawResources = cliOwnedState.rawResourcesByResult.get(listing.resources);
  if (
    rawTools === undefined ||
    rawCommands === undefined ||
    rawResources === undefined ||
    listing.templates === undefined
  )
    return false;
  let min = Math.min(
    cliOwnedState.rawFetchedAtByResult.get(listing.tools) ?? Number.POSITIVE_INFINITY,
    cliOwnedState.rawFetchedAtByResult.get(listing.commands) ?? Number.POSITIVE_INFINITY,
    cliOwnedState.rawFetchedAtByResult.get(listing.resources) ?? Number.POSITIVE_INFINITY,
  );
  if (!Number.isFinite(min)) return true;
  let now = min;
  let mapped = [listing.tools, listing.commands, listing.resources].map((resultKey) => [
    resultKey,
    cliOwnedState.rawFetchedAtByResult.get(resultKey),
  ]);
  cliOwnedState.rawToolsByResult.delete(listing.tools);
  cliOwnedState.rawCommandsByResult.delete(listing.commands);
  cliOwnedState.rawResourcesByResult.delete(listing.resources);
  cliOwnedState.rawFetchedAtByResult.delete(listing.tools);
  cliOwnedState.rawFetchedAtByResult.delete(listing.commands);
  cliOwnedState.rawFetchedAtByResult.delete(listing.resources);
  cliOwnedState.persistedDiscoveryRounds.add(listing.tools);
  let writeOutcome = await writeDiscoveryCache(
    connection.name,
    connection.config,
    {
      ...(connection.serverInfo && {
        serverInfo: {
          name: connection.serverInfo.name,
          version: connection.serverInfo.version,
        },
      }),
      ...(connection.protocolEra !== undefined && {
        negotiatedEra: connection.protocolEra,
      }),
      capabilities: connection.capabilities,
      tools: rawTools,
      commands: rawCommands,
      resources: rawResources,
      templates: listing.templates.map(({ server, ...template }) => template),
    },
    {
      identityEpoch: listing.identityEpoch,
      grantLeg: listing.grantLeg,
      now,
    },
  );
  if (writeOutcome === "terminal") {
    cliOwnedState.persistedDiscoveryRounds.delete(listing.tools);
    return false;
  }
  if (writeOutcome === "transient") {
    cliOwnedState.rawToolsByResult.set(listing.tools, rawTools);
    cliOwnedState.rawCommandsByResult.set(listing.commands, rawCommands);
    cliOwnedState.rawResourcesByResult.set(listing.resources, rawResources);
    for (let [resultKey, fetchedAt] of mapped)
      if (fetchedAt !== undefined) cliOwnedState.rawFetchedAtByResult.set(resultKey, fetchedAt);
    cliOwnedState.persistedDiscoveryRounds.delete(listing.tools);
  }
  return true;
}
//@ chunk-h44h5gdv.js:96904-97162 placement
/**
 * 身份未变化时把刷新得到的工具列表合并写入发现缓存（v1 副本）。
 */
async function persistRefreshedToolsIfPresent(server, toolsResult, options) {
  isLegacyProtocolEra();
  if (!isCurrentIdentityEpoch(options.identityEpoch)) return;
  let cliOwnedState = getCliOwnedState();
  let tools = cliOwnedState.rawToolsByResult.get(toolsResult);
  let fetchedAt = cliOwnedState.rawFetchedAtByResult.get(toolsResult);
  if (tools === undefined || fetchedAt === undefined) return;
  await mergeDiscoveryTools(server.name, server.config, tools, {
    identityEpoch: options.identityEpoch,
    grantLeg: options.grantLeg,
    fetchedAt,
  });
}
//@ chunk-h44h5gdv.js:97162-97547 placement
/**
 * 把实时连接得到的列表写入发现缓存（v1 副本）。
 */
async function persistLiveListing_2(connection, listing) {
  if (
    !isDiscoveryCacheOn() ||
    !isDiscoveryCacheEligible(connection.config) ||
    isMcpServerDisabled(connection.name) ||
    isMcpServerBlockedAtConnectTime(connection.name, connection.config)
  )
    return;
  try {
    let hasResources = !!connection.capabilities?.resources;
    if (!hasResources) recordRawResourcesForResult_2(listing.resources, []);
    let templates =
      hasResources && isCacheableServer(connection.config)
        ? await fetchResourceTemplatesForClient_2(connection)
        : [];
    if (
      (await getCachedConnectResult(connection.name, connection.config)) !== connection ||
      isMcpServerDisabled(connection.name) ||
      isMcpServerBlockedAtConnectTime(connection.name, connection.config)
    )
      return;
    await persistDiscovery(connection, {
      ...listing,
      templates: getDiscoveryFetchError_2(templates) === undefined ? templates : undefined,
    });
  } catch (error) {
    logMCPDebug(connection.name, `Discovery cache write-through skipped: ${errorMessage(error)}`);
  }
}
//@ chunk-h44h5gdv.js:97547-97840 placement
function isDiscoveryCacheMissRecoverable_2(probe) {
  switch (probe.reason) {
    case "absent":
    case "expired":
    case "corrupt":
    case "strike-threshold":
    case "no-fingerprint":
    case "unsealed":
      return true;
    case "disabled":
    case "key-unavailable":
    case "transport":
    case "live-connection":
    case "skills-capable":
    case "channel-capable":
      return false;
    default:
      return probe.reason;
  }
}
//@ chunk-h44h5gdv.js:97840-98367 placement
function discoverySourceLabel_2(probe) {
  if (probe.kind !== "miss") return "live";
  switch (probe.reason) {
    case "disabled":
      return "miss_disabled";
    case "key-unavailable":
      return "miss_disabled";
    case "unsealed":
      return "miss_corrupt";
    case "transport":
      return "live";
    case "absent":
      return "live";
    case "expired":
      return "miss_expired";
    case "corrupt":
      return "miss_corrupt";
    case "strike-threshold":
      return "miss_strike";
    case "no-fingerprint":
      return "miss_no_fingerprint";
    case "live-connection":
      return "live";
    case "skills-capable":
      return "live";
    case "channel-capable":
      return "live";
    default:
      return probe.reason;
  }
}
//@ chunk-h44h5gdv.js:98367-98491 placement
function getMaxResultSizeCharsMeta(tool) {
  let maxResultSizeChars = tool._meta?.["anthropic/maxResultSizeChars"];
  return typeof maxResultSizeChars === "number" &&
    Number.isFinite(maxResultSizeChars) &&
    maxResultSizeChars > 0
    ? maxResultSizeChars
    : undefined;
}
//@ chunk-h44h5gdv.js:98491-103151 placement (2.1.88 match: fetchToolsForClient, 0.371)
/**
 * 把单个 MCP 工具定义包装成 Claude Code 工具：计算工具全名、权限键、延迟加载、描述截断、显示名/图标、账号记忆与首方设计服务器等标记。
 */
function buildMcpTool({
  serverName,
  scope,
  pluginSource,
  serverType,
  source,
  skipPrefix,
  standardKey,
  denyKey,
  legacyGrantRefused = false,
  toolNameShared = false,
  legacyGrantRebindable = false,
  serverAlwaysLoad,
  serverDefersAllTools = false,
  effectiveMaxPermission,
  promptOverrides,
  isFirstPartyDesignServer,
  maxDescriptionLength: maxDescriptionLength_2 = maxDescriptionLength(),
  maxLoadedDescriptionLength = maxDescriptionLength(true),
  pluginTelemetry,
  cliOwned,
  accountMemory = false,
  accountMemoryServer = false,
  sdkDocsConnector = false,
  displayName,
  serverId,
  serverIdStamp,
  serverProvenance,
  serverUrl,
  iconUrl,
  serverInfoName,
  role,
  listed,
  call,
  overrides,
}) {
  let mcpToolName = buildMcpToolName(serverName, listed.name);
  let maxResultSizeCharsMeta = getMaxResultSizeCharsMeta(listed);
  let hasMaxResultSizeCap = maxResultSizeCharsMeta !== undefined;
  let requiresUserInteraction = listed._meta?.["anthropic/requiresUserInteraction"] === true;
  let uiMeta = toolUiMeta(listed._meta);
  let descriptionText = promptOverrides?.tools?.[listed.name] ?? listed.description ?? "";
  let truncatedDescription = truncateDescription(
    descriptionText,
    `Tool "${listed.name}" description`,
    serverName,
    maxDescriptionLength_2,
  );
  let truncatedLoadedDescription = truncateDescription(
    descriptionText,
    `Tool "${listed.name}" description`,
    serverName,
    maxLoadedDescriptionLength,
  );
  let searchHint =
    promptOverrides?.search_hints?.[listed.name] ??
    (typeof listed._meta?.["anthropic/searchHint"] === "string"
      ? listed._meta["anthropic/searchHint"]
      : undefined);
  let callWithOverlapSlots = withOverlapSlots(serverName, listed.name, call);
  let requiresConnectorGrant_2 = requiresConnectorGrant(serverName, {
    scope,
    pluginSource,
  });
  let requiresGrant = requiresConnectorGrant_2 || legacyGrantRefused || toolNameShared;
  let canRebindLegacyGrant =
    legacyGrantRefused &&
    !toolNameShared &&
    legacyGrantRebindable &&
    !requiresUserInteraction &&
    effectiveMaxPermission !== "ask" &&
    overrides?.suppressesAlwaysAllowRule === undefined &&
    overrides?.requiresUserInteraction === undefined &&
    !isDesignGatedTool(isFirstPartyDesignServer, listed.name);
  let suppressesAllowRules = requiresGrant || isDesignGatedTool(isFirstPartyDesignServer, listed.name);
  let ignoresWholeToolAllowRule = () =>
    requiresConnectorGrant_2 ||
    toolNameShared ||
    (legacyGrantRefused &&
      !ownsLegacyKey({
        serverName,
        serverType,
        serverId,
      })) ||
    isLegacyKeyUnclaimed({
      serverName,
      serverType,
      serverId,
    }) ||
    mayRecordServerOwner({
      serverName,
      serverType,
      serverId,
    });
  if (requiresGrant)
    logMCPDebug(
      serverName,
      requiresConnectorGrant_2
        ? "Allow rules do not apply: this server's name starts like a claude.ai connector's. To use allow rules, the server needs another name, and the rules must use that name."
        : legacyGrantRefused
          ? "Allow rules do not apply: another MCP server already uses this name, or the name could not be recorded in the config file. Give this server a different name and write the rules for that name, or reconnect if the config file was busy."
          : `Allow rules do not apply to "${listed.name}": another tool of this server gets the same name in Claude Code. To use allow rules, the server must rename one of them.`,
    );
  return {
    ...MCPTool,
    name: skipPrefix ? listed.name : mcpToolName,
    mcpInfo: {
      serverName,
      scope,
      ...(pluginSource !== undefined && {
        pluginSource,
      }),
      serverType,
      ...(source !== undefined && {
        source,
      }),
      ...(pluginTelemetry && {
        pluginTelemetry,
      }),
      displayName,
      serverId,
      ...(serverIdStamp !== undefined && {
        serverIdStamp,
      }),
      ...(serverProvenance !== undefined && {
        serverProvenance,
      }),
      ...(serverUrl !== undefined && {
        serverUrl,
      }),
      iconUrl,
      serverInfoName,
      ...(cliOwned && {
        cliOwned: true,
      }),
      ...(standardKey !== undefined && {
        standardKey,
      }),
      ...(legacyGrantRefused && {
        legacyGrantRefused,
      }),
      ...(toolNameShared && {
        toolNameShared,
      }),
      ...(canRebindLegacyGrant && {
        legacyGrantRebindable,
      }),
      ...(denyKey !== undefined && {
        denyKey,
      }),
      ...(accountMemory && {
        accountMemory: true,
      }),
      ...(accountMemoryServer && {
        accountMemoryServer: true,
      }),
      ...(sdkDocsConnector && {
        sdkDocsConnector: true,
      }),
      toolName: listed.name,
      title: listed.annotations?.title?.replace(/\s+/g, " ").trim() || undefined,
      execution: listed.execution,
      role,
      effectiveMaxPermission,
      ...(uiMeta && {
        uiMeta,
      }),
      ...(describeHiddenMcpTool(listed._meta, serverName, listed.name) && {
        hiddenFromModel: true,
      }),
    },
    isMcp: true,
    searchHint: searchHint?.replace(/\s+/g, " ").trim() || undefined,
    alwaysLoad:
      !serverDefersAllTools &&
      ((serverAlwaysLoad && !(scope === "dynamic" && listed._meta?.["anthropic/alwaysLoad"] === false)) ||
        listed._meta?.["anthropic/alwaysLoad"] === true),
    async description() {
      return descriptionText;
    },
    async prompt({ loadedThroughToolSearch }) {
      return loadedThroughToolSearch ? truncatedLoadedDescription : truncatedDescription;
    },
    isConcurrencySafe() {
      return callWithOverlapSlots.mayOverlap || (listed.annotations?.readOnlyHint ?? false);
    },
    isReadOnly() {
      return listed.annotations?.readOnlyHint ?? false;
    },
    readOnlyHint: listed.annotations?.readOnlyHint,
    openWorldHint: listed.annotations?.openWorldHint,
    toAutoClassifierInput(input) {
      return mcpToolInputToAutoClassifierInput(input, listed.name);
    },
    isDestructive() {
      return listed.annotations?.destructiveHint ?? false;
    },
    isOpenWorld() {
      return listed.annotations?.openWorldHint ?? false;
    },
    requiresUserInteraction() {
      return requiresUserInteraction;
    },
    async validateInput(input, context) {
      let refusal = refuseNonMainAccountMemoryWrite(accountMemoryServer, listed.name, context);
      if (refusal === undefined)
        return {
          result: true,
        };
      logEvent("tengu_account_memory_spawned_write_refused", {
        caller: fromEnumOpt(context.memoryCaller) ?? lit("unmarked"),
      });
      return {
        result: false,
        message: refusal,
        errorCode: 1,
      };
    },
    suppressesAlwaysAllowRule: (input, hasAlwaysAllowRule) =>
      requiresUserInteraction ||
      (effectiveMaxPermission === "ask" && !hasAlwaysAllowRule) ||
      ignoresWholeToolAllowRule() ||
      isDesignGatedTool(isFirstPartyDesignServer, listed.name),
    ...((requiresGrant || isServerIdentityActive()) && {
      ignoresWholeToolAllowRule,
    }),
    maxResultSizeChars: hasMaxResultSizeCap
      ? Math.min(maxResultSizeCharsMeta, MAX_MCP_RESULT_CHARS)
      : MCPTool.maxResultSizeChars,
    persistenceThresholdCeiling: hasMaxResultSizeCap ? MAX_MCP_RESULT_CHARS : undefined,
    inputJSONSchema: addComputerUseActionSummary(
      addActionSummaryToSchema(
        applyParamDescriptionOverrides(
          listed.inputSchema,
          promptOverrides?.param_descriptions?.[listed.name],
        ),
        mcpToolName,
      ),
      mcpToolName,
    ),
    async checkPermissions(input, context) {
      let planTokenDenial = gateDesignWriteWithoutPlanToken(isFirstPartyDesignServer, listed.name, input);
      if (planTokenDenial) return planTokenDenial;
      if (isFirstPartyDesignServer) {
        let notice = peekScopeExpansionNotice();
        let neededConsentBit =
          (await notice?.wouldNeedDesignConsent(
            context.toolState.get(DesignGateState),
            context.credentials,
          )) ?? null;
        if (neededConsentBit !== null && notice && context.toolUseId) {
          let consentNonce = rememberDesignConsentAsk(
            context.toolUseId,
            neededConsentBit,
            canAskDesignConsent(context),
          );
          return askDesignConsent(notice.consentPromptFor(neededConsentBit), input, consentNonce);
        }
      }
      if (requiresUserInteraction)
        return {
          behavior: "ask",
          message: "MCPTool requires permission.",
          suggestions: [],
          suppressAlwaysAllowRule: true,
        };
      return {
        behavior: "passthrough",
        message: "MCPTool requires permission.",
        suggestions: suppressesAllowRules
          ? []
          : [
              {
                type: "addRules",
                rules: [
                  {
                    toolName: mcpToolName,
                    ruleContent: undefined,
                  },
                ],
                behavior: "allow",
                destination:
                  serverName === REMOTE_BROWSER_SERVER_NAME && isRemoteBrowserModeFloorOn()
                    ? "session"
                    : "localSettings",
              },
            ],
      };
    },
    call: callWithOverlapSlots.call,
    userFacingName() {
      let trimmed = (listed.annotations?.title || listed.name).replace(/\s+/g, " ").trim();
      return `${serverName} - ${trimmed} (MCP)`;
    },
    ...overrides,
  };
}
//@ chunk-h44h5gdv.js:103151-103434 placement
async function buildCachedClientTools_2({ name, config, capabilities, serverInfo, savedAt, tools }) {
  primeEnsureConnectedClient();
  await evictStaleFailedConnectMemoForServe(name, config);
  let client = {
    name,
    type: "cached",
    config,
    capabilities,
    ...(serverInfo && {
      serverInfo: {
        name: serverInfo.name,
        version: serverInfo.version,
      },
    }),
    cacheSavedAt: savedAt,
  };
  return {
    client,
    tools: await fetchMcpTools(client, tools, Date.now(), "cache", beginDroppedToolsRoundV1(client)),
  };
}
//@ chunk-h44h5gdv.js:103434-119383 placement
/**
 * 获取 MCP 服务器工具：调用 tools/list，按权限上限、提示词覆盖、描述长度限制、插件来源等把 MCP 工具转换成 Claude Code 工具定义，失败时记 tengu_mcp_degraded。
 */
async function fetchMcpTools(client, listedTools, startMs, discoverySource, listingState) {
  listedTools = filterRemoteRepoTools(client.config, listedTools);
  let originalCount = listedTools.length;
  let streamingListingSanitizer = createStreamingListingSanitizer();
  let sanitizedTools = (
    await mapInTurns(listedTools, (tool) => streamingListingSanitizer(tool) ?? [])
  ).flat();
  listedTools = [];
  let loggableOrigin = loggingSafeOrigin(client.config);
  let baseAnalytics = mcpBaseUrlAnalytics(client.config, client.name);
  let mcpServerName = mcpNameForAnalytics_GATE_EVALUATED(
    CLAUDEAI_SERVER_PREFIX(client.name),
    isMcpServerLoggableInAnalytics(client.name, client.config),
  );
  let truncatedCount = originalCount - sanitizedTools.length;
  if (truncatedCount > 0) {
    logMCPError(client.name, listingTruncatedNote("tools", truncatedCount, originalCount));
    logEvent("tengu_mcp_degraded", {
      reason: lit("tool_listing_over_limit"),
      transportType: fromEnum(client.config.type ?? "stdio"),
      skippedCount: truncatedCount,
      mcpServerName,
      ...baseAnalytics,
    });
  }
  if (originalCount === 0 && discoverySource === "live")
    logEvent("tengu_mcp_degraded", {
      reason: lit("connected_zero_tools"),
      transportType: fromEnum(client.config.type ?? "stdio"),
      mcpServerName,
      ...baseAnalytics,
    });
  let CLAUDE_AGENT_SDK_MCP_NO_PREFIX = client.config.type === "sdk" && env.CLAUDE_AGENT_SDK_MCP_NO_PREFIX;
  let toolPermissions =
    client.config.type === "claudeai-proxy" || client.config.type === "http" || client.config.type === "sse"
      ? client.config.toolPermissions
      : undefined;
  let effectiveToolPermissions = isRunnerDynamicServer(client.config)
    ? applyBlockedToolPolicy(toolPermissions)
    : toolPermissions;
  if (effectiveToolPermissions) {
    let permissionCount = Object.keys(effectiveToolPermissions).length;
    if (
      permissionCount > 0 &&
      !sanitizedTools.some((tool) => effectiveToolPermissions[tool.name] !== undefined)
    )
      logForDebugging(
        `[claudeai-mcp] ${client.name}: toolPermissions has ${permissionCount} entries but none matched upstream tool names \u2014 backend name drift?`,
        {
          level: "warn",
        },
      );
  }
  let normalizeEnabled = shouldNormalizeRootCombinators(client.config);
  let apiValidateEnabled = shouldDropInvalidToolSchemas(client.config);
  let normalizedCount = 0;
  let normalizeGatedCount = 0;
  let unsupportedCount = 0;
  let invalidMetaCount = 0;
  let invalidPropKeyCount = 0;
  let droppedTools = [];
  let invalidGatedCount = 0;
  let propKeyGatedCount = 0;
  let judgedTools = await mapInTurns(sanitizedTools, (tool) => {
    let judgment = judgeToolSchemaSendability(tool.inputSchema, {
      normalizeEnabled,
      apiValidateEnabled,
    });
    if (judgment.verdict === "drop" && judgment.cause !== "api_invalid") {
      if (judgment.cause === "normalize_gated") normalizeGatedCount++;
      else unsupportedCount++;
      logMCPError(
        client.name,
        `Skipping tool "${tool.name}": ${judgment.reason}. Other tools from this server remain available.`,
      );
      return [];
    }
    if (judgment.normalized) {
      normalizedCount++;
      logMCPDebug(
        client.name,
        `Normalized input schema for tool "${tool.name}" (flattened top-level ${judgment.normalized.combinators.join("/")})`,
      );
    }
    if (judgment.verdict === "drop") {
      if (judgment.rejection.check === "meta") invalidMetaCount++;
      else invalidPropKeyCount++;
      if (
        effectiveToolPermissions?.[tool.name] !== "blocked" &&
        isIncludedMcpTool_2(
          CLAUDE_AGENT_SDK_MCP_NO_PREFIX ? tool.name : buildMcpToolName(client.name, tool.name),
        )
      )
        droppedTools.push({
          toolName: tool.name,
          reason: judgment.rejection.detail,
        });
      logMCPError(
        client.name,
        `Skipping tool "${tool.name}": its input schema would be rejected by the Anthropic API (${judgment.rejection.detail}). Other tools from this server remain available.`,
      );
      return [];
    }
    if (judgment.apiWouldReject) {
      if (judgment.apiWouldReject.check === "meta") invalidGatedCount++;
      else propKeyGatedCount++;
      logMCPDebug(
        client.name,
        `Tool "${tool.name}" input schema would be rejected by the Anthropic API (${judgment.apiWouldReject.detail}); requests that include it may fail`,
      );
    }
    return judgment.normalized
      ? [
          {
            ...tool,
            inputSchema: judgment.normalized.schema,
            description: joinDescription(judgment.normalized.note, tool.description),
          },
        ]
      : [tool];
  });
  let keptTools = uniqByExport(judgedTools.flat(), "name");
  let schema = countByAlias(uniqByExport(sanitizedTools, "name"), (tool) =>
    buildMcpToolName(client.name, tool.name),
  );
  if (listingState.seq > listingState.state.applied) {
    listingState.state.applied = listingState.seq;
    client.droppedTools = uniqByExport(droppedTools, "toolName");
  }
  if (normalizedCount > 0)
    logEvent("tengu_mcp_degraded", {
      reason: lit("tool_schema_normalized"),
      transportType: fromEnum(client.config.type ?? "stdio"),
      normalizedCount,
      mcpServerName,
      ...baseAnalytics,
    });
  if (normalizeGatedCount > 0)
    logEvent("tengu_mcp_degraded", {
      reason: lit("tool_schema_normalize_gated"),
      transportType: fromEnum(client.config.type ?? "stdio"),
      skippedCount: normalizeGatedCount,
      mcpServerName,
      ...baseAnalytics,
    });
  if (unsupportedCount > 0)
    logEvent("tengu_mcp_degraded", {
      reason: lit("tool_schema_unsupported"),
      transportType: fromEnum(client.config.type ?? "stdio"),
      skippedCount: unsupportedCount,
      mcpServerName,
      ...baseAnalytics,
    });
  if (invalidMetaCount > 0)
    logEvent("tengu_mcp_degraded", {
      reason: lit("tool_schema_invalid"),
      transportType: fromEnum(client.config.type ?? "stdio"),
      skippedCount: invalidMetaCount,
      mcpServerName,
      ...baseAnalytics,
    });
  if (invalidPropKeyCount > 0)
    logEvent("tengu_mcp_degraded", {
      reason: lit("tool_property_key_invalid"),
      transportType: fromEnum(client.config.type ?? "stdio"),
      skippedCount: invalidPropKeyCount,
      mcpServerName,
      ...baseAnalytics,
    });
  if (invalidGatedCount > 0)
    logEvent("tengu_mcp_degraded", {
      reason: lit("tool_schema_invalid_gated"),
      transportType: fromEnum(client.config.type ?? "stdio"),
      keptCount: invalidGatedCount,
      mcpServerName,
      ...baseAnalytics,
    });
  if (propKeyGatedCount > 0)
    logEvent("tengu_mcp_degraded", {
      reason: lit("tool_property_key_invalid_gated"),
      transportType: fromEnum(client.config.type ?? "stdio"),
      keptCount: propKeyGatedCount,
      mcpServerName,
      ...baseAnalytics,
    });
  let isLoggable = () => isMcpServerLoggableInAnalytics(client.name, client.config);
  let maxDescriptionLength = toolTimeoutForServer(client.config);
  let maxLoadedDescriptionLength = toolTimeoutForServer(client.config, true);
  await logToolCallXmlInDescriptions(
    keptTools,
    client.name,
    isLoggable(),
    loggableOrigin,
    client.instructions,
  );
  let isDesignServer = isDesignServerConfig(client.config);
  let promptOverrides = officialPluginPromptOverrides(client.config);
  let pluginTelemetry = client.config.pluginSource
    ? buildPluginEventFieldsFromId(client.config.pluginSource, policyEnabledPluginNameSet())
    : undefined;
  let cliOwned = isCliOwnedConfig(client.config);
  let isArtifactsServer = cliOwned && client.name === CLAUDE_ARTIFACTS;
  let wrapArtifactsPublishing = isArtifactsServer || isOwnCcrMcpServer(client.config);
  let unusedFlag = false;
  let toolsForBuild = keptTools;
  let memoryServer =
    sanitizedTools.some((tool) => isMemoryToolServer(client, tool.name)) ||
    toolsForBuild.some((tool) => isMemoryToolServer(client, tool.name)) ||
    (truncatedCount > 0 && isMemoryToolServer_2(client));
  let toolOptions = {
    serverName: client.name,
    scope: client.config.scope,
    pluginSource: client.config.pluginSource,
    serverType: client.config.type ?? "stdio",
    sdkDocsConnector: isDocsConnectorClient(client),
    source: mcpServerSource(client.name, client.config),
    skipPrefix: CLAUDE_AGENT_SDK_MCP_NO_PREFIX,
    serverAlwaysLoad: client.config.alwaysLoad === true,
    serverDefersAllTools: client.config.alwaysLoad === false,
    promptOverrides,
    isFirstPartyDesignServer: isDesignServer,
    maxDescriptionLength,
    maxLoadedDescriptionLength,
    pluginTelemetry,
    cliOwned,
    displayName: withDisplayName(client.config),
    standardKey: isStandardKeyActive()
      ? getServerIdentityKey(client.name, client.config, cliOwned === true)
      : undefined,
    legacyGrantRefused:
      isStandardKeyActive() &&
      (await isLegacyKeyRefused(
        {
          serverName: client.name,
          serverType: client.config.type ?? "stdio",
          serverId: connectorServerId(client.config),
        },
        requiresConnectorGrant(client.name, client.config),
        isIdentityTrackedServer(client.name, client.config),
      )),
    legacyGrantRebindable:
      isStandardKeyActive() &&
      !requiresConnectorGrant(client.name, client.config) &&
      isIdentityTrackedServer(client.name, client.config) &&
      isLegacyKeyOwnedElsewhere({
        serverName: client.name,
        serverType: client.config.type ?? "stdio",
        serverId: connectorServerId(client.config),
      }),
    denyKey: isStandardKeyActive() ? isRemoteTransport(client.config) : undefined,
    serverId: connectorServerId(client.config),
    serverIdStamp: dynamicServerConnectorId(client.name, client.config),
    ...serverProvenanceOf(client),
    iconUrl: "iconUrl" in client.config ? client.config.iconUrl : undefined,
    serverInfoName: stripIgnorables(client.serverInfo?.name ?? "") || undefined,
    role: "role" in client.config ? client.config.role : undefined,
  };
  let isClaudeInChrome = isClaudeInChromeMCPServer(client.name);
  let isDocsConnector = isDocsConnectorServer(client);
  let entry = proxyFillsListing(sanitizedTools);
  let filtered = (
    await mapInTurns(toolsForBuild, (listedTool) => {
      let mcpToolName = buildMcpToolName(client.name, listedTool.name);
      let hasResultSizeAnnotation = getMaxResultSizeCharsMeta(listedTool) !== undefined;
      let overrides = {
        ...(isClaudeInChrome &&
          isStdioConfig(client.config) && {
            ...needsAuthCacheModuleV1().getClaudeInChromeMCPToolOverrides(listedTool.name),
            builtinRenderFamily: "claude-in-chrome",
          }),
        ...(isClaudeInChrome &&
          isClaudeAiProxyServer(client.config) && {
            ...createChromePermissionHandler(listedTool.name, listedTool._meta, (tool, args) =>
              readTabUrl(
                async (tool, args, signal) =>
                  (
                    await callMCPTool_2({
                      client: await connectMcpServer(client, {
                        context: "MCP tool call",
                        signal,
                      }),
                      tool,
                      args,
                      signal,
                      resultNotForModel: true,
                      imageLimits: IMAGE_LIMITS,
                      storageV5: undefined,
                      credentials: undefined,
                    })
                  ).content,
                tool,
                args,
              ),
            ),
          }),
        ...(client.name === REMOTE_BROWSER_SERVER_NAME && {
          excludedFromModeBypassAllow: isRemoteBrowserModeFloorOn,
        }),
        ...false,
        ...(client.config.type === "sdk" && isFileUploadServer(client.name)
          ? buildMcpToolPermissionOverrides(
              client.name,
              listedTool.name,
              listedTool.inputSchema.properties,
              mcpToolInputToAutoClassifierInput,
            )
          : {}),
        ...(isSlackSendToolName(listedTool.name) ? createSlackSendToolUi() : {}),
        ...(isClaudeTestWriteCall(client.name, client.config.pluginSource, listedTool.name)
          ? claudeTestWriteToolOverrides()
          : {}),
        ...{},
        ...(isArtifactsServer
          ? artifactsMcpLaptopModuleV1()?.artifactsMcpLaptopToolOverridesFor(client.config)
          : {}),
        ...(isRunnerDynamicServer(client.config) && {
          skipAggregateToolResultBudget: true,
        }),
      };
      let tool = buildMcpTool({
        ...toolOptions,
        accountMemory: isMemoryServerConnection(client, listedTool.name),
        accountMemoryServer: memoryServer,
        effectiveMaxPermission: effectiveToolPermissions?.[listedTool.name],
        toolNameShared: enforcesGrants() && (schema[mcpToolName] ?? 0) > 1,
        listed: listedTool,
        overrides,
        async call(args, context, canUseTool, parentMessage, onProgress, callOptions) {
          let toolUseId = context.toolUseId ?? getFirstToolUseId_2(parentMessage);
          let refusal = refuseNonMainAccountMemoryWrite(memoryServer, listedTool.name, context);
          if (refusal !== undefined)
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              refusal,
              "account memory write from a spawned loop",
            );
          let callMeta = {
            ...stripHostMetaUnlessCcrScoped(client.config, context.mcpRequestMeta),
            ...callOptions?.mcpCallMeta,
            ...(toolUseId && {
              "claudecode/toolUseId": toolUseId,
            }),
            ...consumeMcpApprovalTicket(context.session, context.toolUseId, client.name, client.config),
            ...(isClaudeInChromeMCPServer(client.name) &&
              isClaudeAiProxyServer(client.config) &&
              judgedSiteMeta(context)),
            ...((isDocsConnectorServer(client) || isOwnArtifactMcpTool(client.name, client.config)) &&
              requestIdMeta(parentMessage.requestId)),
            ...(isHearthbotRelayServer(client) && ccrTurnEventHeaders(turnTraceContextsOf())),
            ...agentRequestMeta(client, context),
            ...(isAccountMemoryServer(client) &&
              memoryChainMeta(context.toolState, parentMessage.message.id)),
          };
          let backgrounded = false;
          function reportProgress(data) {
            if (!onProgress || !toolUseId || backgrounded) return;
            onProgress({
              type: "progress",
              toolUseID: toolUseId,
              data,
            });
          }
          reportProgress({
            type: "mcp_progress",
            status: "started",
            serverName: client.name,
            toolName: listedTool.name,
          });
          let now = Date.now();
          let currentClient = client;
          let awaitingUserInput = false;
          let stopApprovalTiming;
          let releasePark = null;
          let __consentNonce = typeof args.__consentNonce === "string" ? args.__consentNonce : undefined;
          if ("__consentNonce" in args) {
            let { __consentNonce, ...restArgs } = args;
            args = restArgs;
          }
          let consentAsk = isDesignServer ? takeDesignConsentAsk(toolUseId, __consentNonce) : null;
          if (isDesignServer)
            noteDesignProjectId(
              context.toolState.get(DesignGateState),
              isDesignServer,
              listedTool.name,
              args,
            );
          let onAwaitingUserInput = (waiting) => {
            awaitingUserInput = waiting;
            if (waiting) {
              stopApprovalTiming ??= callOptions?.timing?.mark("approval");
              if (!backgrounded && tool.name !== getPermissionPromptToolName() && releasePark === null)
                releasePark = parkOnUser();
            } else {
              stopApprovalTiming?.();
              stopApprovalTiming = undefined;
              releasePark?.();
              releasePark = null;
            }
          };
          let firstAttempt = true;
          let invokeTool = async (signal) => {
            for (let idx = 0; ; idx++)
              try {
                let toolUseId_2 = firstAttempt ? toolUseId : undefined;
                firstAttempt = false;
                let stopTiming = callOptions?.timing?.mark(
                  client.config.type === "http" && issuerKey_3(client.config.url) ? "own" : "external",
                );
                let client_2 = await connectMcpServer(client, {
                  context: "MCP tool call",
                  toolUseId: toolUseId_2,
                }).finally(stopTiming);
                currentClient = client_2;
                applyMemoryCallerMeta(callMeta, memoryServer, context, client_2);
                let result = await callMCPToolWithUrlElicitationRetry_2({
                  client: client_2,
                  clientConnection: client,
                  tool: listedTool.name,
                  args,
                  meta: callMeta,
                  signal,
                  imageLimits: imageLimitsForModel(context.options.mainLoopModel),
                  taskRegistry: context.taskRegistry,
                  toolUseId,
                  onProgress: onProgress && toolUseId ? reportProgress : undefined,
                  requestDialog: context.requestDialog,
                  storageV5: context.storageV5,
                  credentials: context.credentials,
                  hasResultSizeAnnotation: hasResultSizeAnnotation || context.innerCall === true,
                  onAwaitingUserInput,
                  timing: callOptions?.timing,
                  offCriticalPath:
                    (getBackgroundAgentId(context.agentContext) ??
                      (context.isBackgroundAgent ? context.agentId : undefined)) !== undefined,
                  ccrNeedsApprovalRetry:
                    "url" in client.config &&
                    isSameOriginAsCcr(client.config.url) &&
                    canPromptForPermission(context) &&
                    !(getPermissionPromptToolName() && getPermissionPromptToolName() !== "stdio")
                      ? {
                          canUseTool,
                          tool,
                          fullyQualifiedName: mcpToolName,
                          toolUseContext: context,
                          parentMessage,
                        }
                      : undefined,
                });
                if (result.interrupted) throw new AbortError(INTERRUPTED_CALL_NOTICE);
                reportProgress({
                  type: "mcp_progress",
                  status: "completed",
                  serverName: client.name,
                  toolName: listedTool.name,
                  elapsedTimeMs: Date.now() - now,
                });
                if (!result.isError) {
                  logPrCreateOperation(listedTool.name);
                  if (isAccountMemoryServer(client))
                    rememberMemoryChain(context.toolState, parentMessage.message.id, result._meta);
                  if (
                    !backgrounded &&
                    isClaudeInChromeMCPServer(client.name) &&
                    isClaudeAiProxyServer(client.config)
                  )
                    result.content = chromeNoBrowserAnswer(result.content, result._meta, context);
                }
                if (idx > 0) logFeatureOk("mcp_session_recovery");
                let rewrittenMeta = rewriteAnthropicSourcesForCcr(
                  client.config,
                  stripAnthropicMeta(result._meta),
                );
                return {
                  data: result.content,
                  ...(result.urlElicitationDeclined && {
                    urlElicitationDeclined: result.urlElicitationDeclined,
                  }),
                  ...((rewrittenMeta || result.structuredContent || result.resourceLinks) && {
                    mcpMeta: {
                      ...(rewrittenMeta && {
                        _meta: rewrittenMeta,
                      }),
                      ...(result.structuredContent && {
                        structuredContent: result.structuredContent,
                      }),
                      ...(result.resourceLinks && {
                        resourceLinks: result.resourceLinks,
                      }),
                    },
                  }),
                };
              } catch (error) {
                if (
                  error instanceof McpSessionExpiredError &&
                  idx < 1 &&
                  (!error.mayHaveRun ||
                    tool.isConcurrencySafe(args) ||
                    listedTool.annotations?.idempotentHint === true)
                ) {
                  logFeatureSad("mcp_session_recovery", error.expiryKind);
                  logMCPDebug(client.name, `Retrying tool '${listedTool.name}' after session recovery`);
                  continue;
                }
                if (error instanceof McpSessionExpiredError)
                  logFeatureBad(
                    "mcp_session_recovery",
                    idx < 1 ? "may_have_run_no_retry" : "session_retry_exhausted",
                  );
                else if (idx > 0 && !signal.aborted)
                  logFeatureBad("mcp_session_recovery", "retry_failed_other");
                reportProgress({
                  type: "mcp_progress",
                  status: "failed",
                  serverName: client.name,
                  toolName: listedTool.name,
                  elapsedTimeMs: Date.now() - now,
                });
                if (!signal.aborted) noteHearthDegraded(client.name, error);
                if (
                  error instanceof Error &&
                  !(error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS)
                ) {
                  let errorName = error.constructor.name;
                  let sourceCategory = () =>
                    signal.aborted ? "other" : classifyMcpErrorSourceCategory(error);
                  if (errorName === "Error") {
                    let message = describeConnectError(error, client.config);
                    throw Object.assign(
                      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                        message,
                        message.slice(0, 200),
                      ),
                      {
                        mcpErrorSource: sourceCategory(),
                      },
                    );
                  }
                  if (errorName === "McpError" && "code" in error && typeof error.code === "number") {
                    let merged = Object.assign(
                      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                        error.message,
                        `McpError ${error.code}`,
                      ),
                      {
                        mcpErrorSource: sourceCategory(),
                      },
                    );
                    throw isNeedsApprovalOrExpiredSessionV1(error) ? markRefusedByCcrProxy(merged) : merged;
                  }
                }
                raiseMemoryErrorCap(error, client, listedTool.name);
                throw error;
              }
          };
          let callImpl = invokeTool;
          if (isDesignServer)
            callImpl = wrapCallWithDesignConsent(invokeTool, {
              designSession: context.toolState.get(DesignGateState),
              approvedConsentBit: consentAsk?.bit ?? null,
              consentAskReachesUser: (consentAsk?.askReachesUser ?? false) && canAskDesignConsent(context),
              credentials: context.credentials,
            });
          if (listedTool.name === GET_TASK && isToolboxServer(client)) {
            let { withTaskFilesRemembered } =
              await import("../../tools/SaveTaskFilesTool/addTaskFileSaves.lazy.js");
            callImpl = withTaskFilesRemembered(callImpl, {
              client,
              args,
              session: context.session,
            });
          }
          if (
            netModule &&
            !context.agentId &&
            context.taskRegistry !== UNLIMITED_RATE_LIMITER &&
            tool.name !== getPermissionPromptToolName()
          ) {
            let mcpAutoBackgroundMs = netModule.getMcpAutoBackgroundMs(client.config, {
              isNonInteractiveSession: context.options.isNonInteractiveSession,
            });
            let movableWithoutTimer =
              mcpAutoBackgroundMs === 0 &&
              netModule.isMcpCallMovableWithoutTimer(client.config, {
                isNonInteractiveSession: context.options.isNonInteractiveSession,
                isInnerCall: context.innerCall === true,
              });
            if (mcpAutoBackgroundMs > 0 || movableWithoutTimer)
              return netModule.callMcpToolWithAutoBackground({
                run: callImpl,
                serverName: client.name,
                toolName: listedTool.name,
                accountMemoryTool: isLiveMemoryTool(tool),
                toolUseId,
                parentAbortController: context.abortController,
                taskRegistry: context.taskRegistry,
                autoBackgroundMs: movableWithoutTimer ? null : mcpAutoBackgroundMs,
                storageV5: context.storageV5,
                credentials: context.credentials,
                hasPendingElicitation: () =>
                  awaitingUserInput ||
                  ((currentClient.type === "connected"
                    ? currentClient.transportErrorState?.pendingElicitations
                    : undefined) ?? 0) > 0,
                onBackgrounded: () => {
                  backgrounded = true;
                },
                foregroundCalls: context.innerCall
                  ? undefined
                  : foregroundCallRegistrySlots.of(context.session),
                noticeGate: wrapHoldAware({
                  hookCaller: context.hookCaller,
                  hookServesModel: context.hookServesModel,
                  pluginUnnamed: context.pluginUnnamed,
                }),
              });
          }
          return callImpl(context.abortController.signal);
        },
      });
      if (isClaudeInChrome && (listedTool.name === "file_upload" || listedTool.name === "browser_batch")) {
        let CLAUDE_CODE_IS_COWORK =
          !isStdioConfig(client.config) && !env.CLAUDE_CODE_REMOTE && env.CLAUDE_CODE_IS_COWORK;
        let originalCall = tool.call;
        tool.call = async (input, context, canUseTool, parentMessage, onProgress, callOptions) => {
          let {
            FILE_UPLOAD_MAX_TOTAL_BYTES,
            passThroughChromeFileUploadInput,
            prepareChromeFileUploadInput,
          } = await import("../../utils/claudeInChrome/fileUpload.js");
          let prepared = CLAUDE_CODE_IS_COWORK
            ? await passThroughChromeFileUploadInput(
                listedTool.name,
                input ?? {},
                getToolPermissionContext(context),
              )
            : await prepareChromeFileUploadInput(
                listedTool.name,
                input ?? {},
                getToolPermissionContext(context),
                isClaudeAiProxyServer(client.config)
                  ? {
                      maxTotalBytes: chromeUploadMaxBytes(listedTool._meta, FILE_UPLOAD_MAX_TOTAL_BYTES),
                      hosted: {
                        session: context.session,
                        signal: context.abortController.signal,
                      },
                    }
                  : undefined,
              );
          if (prepared.error)
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              prepared.error,
              "Claude in Chrome file_upload path rejected",
            );
          return originalCall(
            prepared.input ?? input,
            context,
            canUseTool,
            parentMessage,
            onProgress,
            prepared.callMeta
              ? {
                  ...callOptions,
                  mcpCallMeta: prepared.callMeta,
                }
              : callOptions,
          );
        };
      }
      if (
        client.config.type === "sdk" &&
        isFileUploadServer(client.name) &&
        FILE_UPLOAD_TOOLS.includes(listedTool.name) &&
        !env.CLAUDE_CODE_REMOTE &&
        !env.CLAUDE_CODE_IS_COWORK &&
        resolveSdkUrl().status === "absent"
      ) {
        let hostAsksUpload = listedTool._meta?.[ANTHROPIC_HOSTASKSPERUPLOADEDFILE] === true;
        let originalCall = tool.call;
        tool.call = async (input, context, canUseTool, parentMessage, onProgress, callOptions) => {
          let paneModule = await import("../../utils/claudeInChrome/paneFileUploadCall.lazy.js");
          let prepared = await paneModule.paneFileUploadCall(
            input,
            getToolPermissionContext(context),
            context.mcpRequestMeta,
            hostAsksUpload,
            context.autoModeClassified === true,
          );
          return originalCall(
            prepared.input,
            {
              ...context,
              mcpRequestMeta: prepared.mcpRequestMeta,
            },
            canUseTool,
            parentMessage,
            onProgress,
            callOptions && {
              ...callOptions,
              mcpCallMeta: {},
            },
          );
        };
      }
      if (isTaskWriteMethod(listedTool.name)) {
        let toolName = listedTool.name;
        let validateInput = tool.validateInput;
        tool.validateInput = async (input, context) => {
          let validation = validateInput
            ? await validateInput(input, context)
            : {
                result: true,
              };
          if (!validation.result) return validation;
          let { startTaskInputRefusal } = await import("../taskFiles/startTaskFiles.js");
          let taskInputRefusal = startTaskInputRefusal(
            client,
            toolName,
            input,
            tool.inputJSONSchema,
            context.session,
          );
          return taskInputRefusal === undefined
            ? validation
            : {
                result: false,
                message: taskInputRefusal,
                errorCode: 2,
              };
        };
        let prompt = tool.prompt;
        tool.prompt = async (input) => {
          let basePrompt = await prompt(input);
          let toolPermissionContext = await input.getToolPermissionContext();
          if (toolPermissionContext.isRemoteMode !== true) return basePrompt;
          let { startTaskFilesPromptNote } = await import("../taskFiles/startTaskFiles.js");
          let taskFilesPromptNote = startTaskFilesPromptNote(client, toolName, toolPermissionContext);
          return taskFilesPromptNote === undefined
            ? basePrompt
            : `${basePrompt}

${taskFilesPromptNote}`;
        };
        let originalCall = tool.call;
        tool.call = async (input, context, canUseTool, parentMessage, onProgress, callOptions) => {
          let args = input ?? {};
          if (!Array.isArray(args.files) || args.files.length === 0)
            return originalCall(input, context, canUseTool, parentMessage, onProgress, callOptions);
          let {
            prepareStartTaskFileInputs,
            removeStartTaskUploadsFor,
            startTaskInputRefusal,
            startTaskSendRefusal,
          } = await import("../taskFiles/startTaskFiles.js");
          let toolUseId = context.toolUseId;
          let pendingTaskFilesForArgs = findPendingTaskFilesForArgs(context.session, toolUseId, args.files);
          if (pendingTaskFilesForArgs !== undefined && toolUseId !== undefined) {
            let taskSendRefusal = startTaskSendRefusal(pendingTaskFilesForArgs.uploadStartedAt, toolName);
            if (taskSendRefusal !== undefined) {
              await discardTaskFiles(context.session, pendingTaskFilesForArgs);
              throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                taskSendRefusal,
                "start_task files not sent after the approval",
              );
            }
            pendingTaskFilesForArgs.state = "sending";
            registerDiscarder(context.session, toolUseId, () =>
              startTaskSendRefusal(pendingTaskFilesForArgs.uploadStartedAt, toolName),
            );
            try {
              return await originalCall(input, context, canUseTool, parentMessage, onProgress, callOptions);
            } catch (error) {
              if (isRefusedByCcrProxy(error)) {
                pendingTaskFilesForArgs.state = "pending";
                await discardTaskFiles(context.session, pendingTaskFilesForArgs);
              }
              throw error;
            } finally {
              unregisterDiscarder(context.session, toolUseId);
              markTaskFilesSent(context.session, pendingTaskFilesForArgs);
            }
          }
          let taskInputRefusal = startTaskInputRefusal(
            client,
            toolName,
            args,
            tool.inputJSONSchema,
            context.session,
          );
          if (taskInputRefusal !== undefined)
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              taskInputRefusal,
              "start_task input refused",
            );
          let now = Date.now();
          let startTaskFileInputs = await prepareStartTaskFileInputs(
            client,
            toolName,
            args,
            getToolPermissionContext(context),
            context.abortController.signal,
            context.session,
          );
          if (startTaskFileInputs.error)
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              startTaskFileInputs.error,
              "start_task file input rejected",
            );
          if (startTaskFileInputs.input === undefined || toolUseId === undefined)
            return originalCall(
              startTaskFileInputs.input ?? input,
              context,
              canUseTool,
              parentMessage,
              onProgress,
              callOptions,
            );
          registerDiscarder(context.session, toolUseId, () => startTaskSendRefusal(now, toolName));
          try {
            return await originalCall(
              startTaskFileInputs.input,
              context,
              canUseTool,
              parentMessage,
              onProgress,
              callOptions,
            );
          } catch (error) {
            if (isRefusedByCcrProxy(error))
              await removeStartTaskUploadsFor(client, context.session, startTaskFileInputs.input.files);
            throw error;
          } finally {
            unregisterDiscarder(context.session, toolUseId);
          }
        };
        if (isToolboxMcpServer(client))
          tool.askInputPreparer = async (input, context, overrides) => {
            if (!Array.isArray(input.files) || input.files.length === 0) return;
            let { startTaskAskInputPreparer, startTaskInputRefusal } =
              await import("../taskFiles/startTaskFiles.js");
            let taskAskInputPreparer = startTaskAskInputPreparer(
              client,
              toolName,
              input,
              getToolPermissionContext(context),
              context.abortController.signal,
              context.session,
              overrides,
            );
            return (
              taskAskInputPreparer && {
                prepare: () => {
                  let taskInputRefusal = startTaskInputRefusal(
                    client,
                    toolName,
                    input,
                    tool.inputJSONSchema,
                    context.session,
                  );
                  return taskInputRefusal === undefined
                    ? taskAskInputPreparer.prepare()
                    : Promise.resolve({
                        error: taskInputRefusal,
                      });
                },
              }
            );
          };
      }
      let { validateInput, call: originalCall, askInputPreparer } = tool;
      if (listedTool._meta?.[ANTHROPIC_FILEINPUTS] !== undefined)
        wireFileInputs(
          tool,
          {
            client,
            name: listedTool.name,
            meta: listedTool._meta,
            schema: tool.inputJSONSchema,
          },
          (context) => async (tool, args) =>
            (
              await callMCPTool_2({
                client: await connectMcpServer(client, {
                  context: "MCP tool call",
                }),
                tool,
                args,
                signal: context.abortController.signal,
                imageLimits: imageLimitsForModel(context.options.mainLoopModel),
                hasResultSizeAnnotation: true,
                storageV5: context.storageV5,
                credentials: context.credentials,
              })
            ).structuredContent,
        );
      {
        let refToolName = fileReferenceToolToFill(client, listedTool.name, entry);
        if (refToolName !== undefined)
          wrapFileReferenceTool(
            tool,
            refToolName,
            {
              validateInput,
              call: originalCall,
              askInputPreparer,
            },
            getFirstToolUseId_2,
            filledCallRequestMeta(client),
          );
      }
      if (tool.mcpInfo !== undefined && fileReferenceToolForRecords(client, listedTool.name) !== undefined)
        tool.mcpInfo = {
          ...tool.mcpInfo,
          fileReference: true,
        };
      if (isArtifactsServer || isRunnerDynamicServer(client.config))
        artifactPermissionRulesModuleV1()?.applyArtifactRules(client.config, tool);
      if (wrapArtifactsPublishing)
        artifactsMcpLaptopModuleV1()?.wrapArtifactsMcpLaptopPublishing(client.config, tool);
      if (isDocsConnector) claudeDocsWakeModuleV1()?.wrapClaudeDocsCreateWake(tool);
      if (isClaudeInChrome && client.config.type !== "sdk") {
        let originalCall = tool.call;
        tool.call = async (input, context, canUseTool, parentMessage, onProgress, callOptions) => {
          let deniedReason = policyDeniedReason("allow_claude_browser_extension", "Claude in Chrome", "is");
          if (deniedReason !== null)
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              deniedReason,
              "Claude in Chrome call refused by org policy",
            );
          return originalCall(input, context, canUseTool, parentMessage, onProgress, callOptions);
        };
      }
      let finalOriginalCall = tool.call;
      tool.call = async (input, context, canUseTool, parentMessage, onProgress, callOptions) => {
        context.options.activeMcpServer = client.name;
        context.options.activeMcpTool = listedTool.name;
        if (client.config.pluginSource) {
          recordPluginUsage(client.config.pluginSource);
          recordPluginActivity(client.config.pluginSource, "mcp", {
            kind: "mcp-server",
            name: client.name,
          });
        }
        let loggable = isLoggable();
        if (loggable) markMcpServerLoggable(client.name);
        let keepInput =
          (isTaskWriteMethod(listedTool.name) &&
            findPendingTaskFilesForArgs(context.session, context.toolUseId, input?.files) !== undefined) ||
          (listedTool._meta?.[ANTHROPIC_FILEINPUTS] !== undefined
            ? (await import("./fileGrants.js")).hasFileGrants(context.session, context.toolUseId)
            : false);
        return finalOriginalCall(
          keepInput
            ? input
            : stripTrailingInvokeSuffix(
                input,
                listedTool.name,
                client.name,
                loggable,
                getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_strip_trailing_xml_tags", false),
                loggableOrigin,
              ),
          context,
          canUseTool,
          parentMessage,
          onProgress,
          callOptions,
        );
      };
      return tool;
    })
  ).filter(isIdeServer);
  let mapped = keptTools.map(
    (tool) => (promptOverrides?.tools?.[tool.name] ?? tool.description ?? "").length,
  );
  let reduced = mapped.reduce((acc, length) => acc + length, 0);
  logEvent("tengu_mcp_tools_listed", {
    transportType: fromEnum(client.config.type ?? "stdio"),
    listDurationMs: Date.now() - startMs,
    toolCount: filtered.length,
    alwaysLoadCount: countWhere(filtered, (tool) => tool.alwaysLoad === true),
    descriptionTotalLength: reduced,
    descriptionMaxLength: mapped.reduce((acc, length) => Math.max(acc, length), 0),
    descriptionMeanLength: mapped.length ? Math.round(reduced / mapped.length) : 0,
    descriptionOverLimitCount: countWhere(mapped, (length) => length > maxDescriptionLength),
    discoverySource: fromEnum(discoverySource),
    ...baseAnalytics,
    mcpServerName: mcpNameForAnalytics_GATE_EVALUATED(
      CLAUDEAI_SERVER_PREFIX(client.name),
      isMcpServerLoggableInAnalytics(client.name, client.config),
    ),
  });
  if (discoverySource === "live") logFeatureOk("mcp_list_tools");
  if (isStdioConfig(client.config) && isClaudeInChromeMCPServer(client.name))
    logChromeToolsAdded(filtered.length, discoverySource);
  if (isToolboxServer(client)) {
    let { addTaskFileSaves } = await import("../../tools/SaveTaskFilesTool/addTaskFileSaves.lazy.js");
    addTaskFileSaves(filtered, {
      client,
      listed: toolsForBuild,
      compose: (listed, call, overrides, effectiveMaxPermission) =>
        buildMcpTool({
          ...toolOptions,
          accountMemoryServer: memoryServer,
          effectiveMaxPermission,
          listed,
          call,
          overrides,
        }),
    });
  }
  return filtered;
}
//@ chunk-h44h5gdv.js:119383-121182 placement
var listMcpTools; // deferred: uses memoizeWithLRU (./needsAuthCache.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-h44h5gdv.js:119383", () => {
  listMcpTools = memoizeWithLRU(
    async (client, storageV5, rawOnly) => {
      if (client.type !== "connected") return [];
      let epochAtStart = identityEpoch();
      let droppedToolsRound = beginDroppedToolsRoundV1(client);
      try {
        if (!client.capabilities?.tools) {
          let rawTools = [];
          recordRawToolsForResult(rawTools, []);
          return rawTools;
        }
        let now = Date.now();
        let listedTools = await listAllPages(
          identityId2(client.client),
          client.name,
          client.config,
          "tools/list",
          ListToolsResultSchema,
          (page) => page.tools,
        );
        client.toolsListError = undefined;
        client.discoveryAuthFailure = undefined;
        if (rawOnly === true) {
          let rawTools = [];
          recordRawToolsForResult(rawTools, listedTools);
          return rawTools;
        }
        let memoResult = listToolsWithMemo(client, listedTools, epochAtStart, droppedToolsRound, () => ({
          normalizeEnabled: shouldNormalizeRootCombinators(client.config),
          apiValidateEnabled: shouldDropInvalidToolSchemas(client.config),
        }));
        if (memoResult?.reuse !== undefined) {
          recordRawToolsForResult(memoResult.reuse, listedTools);
          return memoResult.reuse;
        }
        let tools = await fetchMcpTools(client, listedTools, now, "live", droppedToolsRound);
        if (droppedToolsRound.seq === droppedToolsRound.state.started) {
          client.toolsListError = undefined;
          client.discoveryAuthFailure = undefined;
        }
        recordRawToolsForResult(tools, listedTools);
        settleToolListingMemo(client, memoResult, tools, droppedToolsRound);
        return tools;
      } catch (error) {
        let errorDetail = redactMcpErrorDetail(
          client.name,
          client.config,
          describeConnectError(error, client.config),
        );
        if (client.config.type === "claudeai-proxy" && isListAuthError(error)) {
          logEvent("tengu_mcp_server_needs_auth", {
            transportType: lit("claudeai-proxy"),
            cause: lit("discovery_tools_list"),
            ...mcpBaseUrlAnalytics(client.config, client.name),
          });
          if (isCurrentIdentityEpoch(epochAtStart))
            setMcpAuthCacheEntry(client.name, client.config.id, undefined, storageV5);
          logFeatureSad("mcp_list_tools", "mcp_list_tools_needs_auth");
          logMCPDebug(client.name, "tools/list 401/403 on claude.ai proxy \u2014 flagging needs-auth");
          client.discoveryAuthFailure = true;
          getConnectionCache().toolLists.delete(serverCacheKey(client.name, client.config));
          return [];
        }
        if (isListAuthError(error) && hasLapsedCcrSignIn(client.name, client.config))
          client.discoveryAuthFailure = true;
        let isBearerRejected =
          client.config.type === "claudeai-proxy" && isClaudeAiBearerRejectedError(error);
        let failureMetric = isBearerRejected
          ? "mcp_list_tools_claudeai_bearer_rejected"
          : error instanceof McpError
            ? `mcp_list_tools_${LIST_FAILURE_REASONS_V1[error.code] ?? "mcperr_other"}`
            : errorDetail.includes("timed out")
              ? "mcp_list_tools_timeout"
              : "mcp_list_tools_failed";
        logFeatureSad("mcp_list_tools", failureMetric);
        (isBearerRejected ? logMCPDebug : logMCPError)(client.name, `Failed to fetch tools: ${errorDetail}`);
        client.toolsListError = errorDetail;
        if (isBearerRejected) client.discoveryBearerRejected = true;
        let emptyTools = [];
        getCliOwnedState().toolsListErrorByResult.set(emptyTools, errorDetail);
        if (!isBearerRejected) {
          let serverFields = mcpBaseUrlAnalytics(client.config, client.name);
          logEvent("tengu_mcp_degraded", {
            reason: lit("tools_list_failed"),
            transportType: fromEnum(client.config.type ?? "stdio"),
            ...serverFields,
            mcpServerName: mcpNameForAnalytics_GATE_EVALUATED(
              CLAUDEAI_SERVER_PREFIX(client.name),
              isMcpServerLoggableInAnalytics(client.name, client.config),
            ),
          });
        }
        getConnectionCache().toolLists.delete(serverCacheKey(client.name, client.config));
        return emptyTools;
      }
    },
    (client) => serverCacheKey(client.name, client.config),
    () => getConnectionCache().toolLists,
  );
});
//@ chunk-h44h5gdv.js:121182-121726 placement
/**
 * 记录 MCP 列表请求（资源/命令）失败：区分需要认证、claude.ai bearer 被拒、MCP 错误码、超时与一般失败，报告结果码；非认证类失败还记 tengu_mcp_degraded。
 */
function reportListFailure_2(connection, error, listKind, setOutcome, degradedReason, what) {
  let errorText = describeConnectError(error, connection.config);
  let needsAuth = connection.config.type === "claudeai-proxy" && isListAuthError(error);
  let bearerRejected = connection.config.type === "claudeai-proxy" && isClaudeAiBearerRejectedError(error);
  if (bearerRejected) connection.discoveryBearerRejected = true;
  let failureMetric = needsAuth
    ? `${listKind}_needs_auth`
    : bearerRejected
      ? `${listKind}_claudeai_bearer_rejected`
      : error instanceof McpError
        ? `${listKind}_${LIST_FAILURE_REASONS_V1[error.code] ?? "mcperr_other"}`
        : errorText.includes("timed out")
          ? `${listKind}_timeout`
          : `${listKind}_failed`;
  setOutcome(failureMetric);
  (needsAuth || bearerRejected ? logMCPDebug : logMCPError)(
    connection.name,
    `Failed to fetch ${what}: ${errorText}`,
  );
  if (!needsAuth && !bearerRejected)
    logEvent("tengu_mcp_degraded", {
      reason: degradedReason,
      transportType: fromEnum(connection.config.type ?? "stdio"),
      ...mcpBaseUrlAnalytics(connection.config, connection.name),
      mcpServerName: mcpNameForAnalytics_GATE_EVALUATED(
        CLAUDEAI_SERVER_PREFIX(connection.name),
        isMcpServerLoggableInAnalytics(connection.name, connection.config),
      ),
    });
}
//@ chunk-h44h5gdv.js:121726-122965 placement (2.1.88 match: fetchResourcesForClient, 0.347)
var fetchResourcesForClient_2; // deferred: uses memoizeWithLRU (./needsAuthCache.js) of its import cycle while loading; runs once the cycle is complete
var fetchResourceTemplatesForClient_2;
deferInit("chunk-h44h5gdv.js:121726", () => {
  fetchResourcesForClient_2 = memoizeWithLRU(
    async (connection) => {
      if (connection.type !== "connected") return [];
      try {
        if (!connection.capabilities?.resources) {
          let rawResources = [];
          recordRawResourcesForResult_2(rawResources, []);
          return rawResources;
        }
        let listedResources = await listAllPages(
          identityId2(connection.client),
          connection.name,
          connection.config,
          "resources/list",
          ListResourcesResultSchema,
          (page) => page.resources,
        );
        logFeatureOk("mcp_list_resources");
        let mapped = listedResources.map((resource) => ({
          ...resource,
          server: connection.name,
        }));
        recordRawResourcesForResult_2(mapped, listedResources);
        return mapped;
      } catch (error) {
        reportListFailure_2(
          connection,
          error,
          "mcp_list_resources",
          (metric) => logFeatureSad("mcp_list_resources", metric),
          lit("resources_list_failed"),
          "resources",
        );
        getConnectionCache().resourceLists.delete(serverCacheKey(connection.name, connection.config));
        let errorHolder = [];
        if (error instanceof McpError && error.code === ErrorCode.MethodNotFound)
          recordRawResourcesForResult_2(errorHolder, []);
        else getCliOwnedState().discoveryFetchErrors.set(errorHolder, toError(error));
        return errorHolder;
      }
    },
    (client) => serverCacheKey(client.name, client.config),
    () => getConnectionCache().resourceLists,
  );
  fetchResourceTemplatesForClient_2 = memoizeWithLRU(
    async (client) => {
      if (client.type !== "connected") return [];
      try {
        if (!client.capabilities?.resources) return [];
        let listedTemplates = await listAllPages(
          identityId2(client.client),
          client.name,
          client.config,
          "resources/templates/list",
          ListResourceTemplatesResultSchema,
          (page) => page.resourceTemplates,
        );
        logEvent("tengu_mcp_resource_templates_fetched", {
          template_count: listedTemplates.length,
        });
        logFeatureOk("mcp_list_resource_templates");
        return listedTemplates.map((template) => ({
          ...template,
          server: client.name,
        }));
      } catch (error) {
        getConnectionCache().resourceTemplateLists.delete(serverCacheKey(client.name, client.config));
        logMCPDebug(
          client.name,
          `Failed to fetch resource templates: ${describeConnectError(error, client.config)}`,
        );
        let errorHolder = [];
        if (!(error instanceof McpError && error.code === ErrorCode.MethodNotFound))
          getCliOwnedState().discoveryFetchErrors.set(errorHolder, toError(error));
        return errorHolder;
      }
    },
    (client) => serverCacheKey(client.name, client.config),
    () => getConnectionCache().resourceTemplateLists,
  );
});
//@ chunk-h44h5gdv.js:122965-123136 placement
function fetchResourceTemplatesForClients(clients, alreadyFetched) {
  let pending = [];
  for (let client of clients) {
    if (client.type !== "connected") continue;
    if (client.name in alreadyFetched) continue;
    pending.push(
      fetchResourceTemplatesForClient_2(client).then((templates) => ({
        client,
        templates,
      })),
    );
  }
  return Promise.all(pending);
}
//@ chunk-h44h5gdv.js:123136-123586 placement
async function completeResourceTemplateArgument(client, uri, name, value, contextArguments) {
  if (!client.capabilities?.completions) return [];
  try {
    let result = await identityId2(client.client).complete({
      ref: {
        type: "ref/resource",
        uri,
      },
      argument: {
        name,
        value,
      },
      context:
        Object.keys(contextArguments).length > 0
          ? {
              arguments: contextArguments,
            }
          : undefined,
    });
    logFeatureOk("mcp_complete_resource_template");
    return result.completion.values;
  } catch (error) {
    logFeatureBad("mcp_complete_resource_template", "mcp_complete_resource_template_failed");
    logMCPDebug(
      client.name,
      `Failed to complete resource template: ${describeConnectError(error, client.config)}`,
    );
    return [];
  }
}
//@ chunk-h44h5gdv.js:123586-124147 placement
var fetchCommandsForClient_2; // deferred: uses memoizeWithLRU (./needsAuthCache.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-h44h5gdv.js:123586", () => {
  fetchCommandsForClient_2 = memoizeWithLRU(
    async (client) => {
      if (client.type !== "connected") return [];
      try {
        if (!client.capabilities?.prompts) {
          let rawCommands = [];
          recordRawCommandsForResult(rawCommands, []);
          return rawCommands;
        }
        let prompts = await listAllPages(
          identityId2(client.client),
          client.name,
          client.config,
          "prompts/list",
          ListPromptsResultSchema,
          (page) => page.prompts,
        );
        logFeatureOk("mcp_list_prompts");
        let result = buildMcpPromptCommands_2(client, prompts);
        recordRawCommandsForResult(result, prompts);
        return result;
      } catch (error) {
        reportListFailure_2(
          client,
          error,
          "mcp_list_prompts",
          (metric) => logFeatureSad("mcp_list_prompts", metric),
          lit("prompts_list_failed"),
          "commands",
        );
        getConnectionCache().commandLists.delete(serverCacheKey(client.name, client.config));
        let errorHolder = [];
        if (error instanceof McpError && error.code === ErrorCode.MethodNotFound)
          recordRawCommandsForResult(errorHolder, []);
        else getCliOwnedState().discoveryFetchErrors.set(errorHolder, toError(error));
        return errorHolder;
      }
    },
    (client) => serverCacheKey(client.name, client.config),
    () => getConnectionCache().commandLists,
  );
});
//@ chunk-h44h5gdv.js:124147-125916 placement (2.1.88 match: fetchCommandsForClient, 0.543)
/**
 * 动态生成的 prompt 命令对象（name="mcp__"+Sn(e.name)+"__"+w.name）；描述：Q??""；别名 S?[`${e.name}:${w.name}`,`${e.name}:${w.name} (MCP)`]:void 0；isEnabled: ()=>!0；isHidden: false。
 */
function buildMcpPromptCommands_2(client, prompts) {
  let streamingListingSanitizer = createStreamingListingSanitizer();
  let flattened = prompts.flatMap((prompt) => streamingListingSanitizer(prompt) ?? []);
  let droppedCount = prompts.length - flattened.length;
  if (droppedCount > 0)
    logMCPError(client.name, listingTruncatedNote("prompts", droppedCount, prompts.length));
  let config = client.config;
  let isDesignServer = (config.type === "http" || config.type === "sse") && isDesignMcpUrl(config.url);
  let overrides = officialPluginPromptOverrides(client.config);
  let commands = flattened.map((prompt) => {
    let values = Object.values(prompt.arguments ?? {});
    let argNames = values.map((argument) => argument.name);
    let description = overrides?.prompts?.[prompt.name] ?? prompt.description;
    return {
      type: "prompt",
      name: "mcp__" + CLAUDEAI_SERVER_PREFIX(client.name) + "__" + prompt.name,
      description: description ?? "",
      hasUserSpecifiedDescription: !!description,
      contentLength: 0,
      isEnabled: () => true,
      isHidden: false,
      isMcp: true,
      mcpInfo: getMcpInfoFromConnection(client),
      progressMessage: "running",
      userFacingName() {
        return isDesignServer ? prompt.name : `${client.name}:${prompt.name} (MCP)`;
      },
      aliases: isDesignServer
        ? [`${client.name}:${prompt.name}`, `${client.name}:${prompt.name} (MCP)`]
        : undefined,
      argNames,
      source: "mcp",
      async getPromptForCommand(args, context) {
        let trimmed = args.trim();
        let argValues = trimmed ? trimmed.split(/\s+/) : [];
        let refusal = hostedDesktopRefusal_2(client);
        if (refusal) throw refusal;
        try {
          let mapped = values
            .filter((argument, index) => argument.required && argValues[index] === undefined)
            .map((argument) => argument.name);
          if (mapped.length > 0)
            throw Error(
              `Missing required ${plural(mapped.length, "argument")}: ${mapped.join(", ")}. Usage: /mcp__${CLAUDEAI_SERVER_PREFIX(client.name)}__${prompt.name} ${argNames.join(" ")}`,
            );
          let connectedClient = await connectMcpServer(client, {
            signal: context.abortController.signal,
            context: "MCP prompt command",
          });
          let result = await identityId2(connectedClient.client).getPrompt({
            name: prompt.name,
            arguments: zipOperationFields(argNames, argValues),
          });
          let tool = imageLimitsForModel(context.options.mainLoopModel);
          let transformed = await Promise.all(
            result.messages.map((message) =>
              transformResultContent(message.content, connectedClient.name, tool, context.storageV5),
            ),
          );
          logFeatureOk("mcp_get_prompt");
          recordToolUsed(buildMcpToolName(client.name, prompt.name));
          return transformed.flat();
        } catch (error) {
          if (!isAbortError(error))
            if (client.config.type === "claudeai-proxy" && isClaudeAiBearerRejectedError(error)) {
              logFeatureSad("mcp_get_prompt", "mcp_get_prompt_claudeai_bearer_rejected");
              logMCPDebug(
                client.name,
                `Error running command '${prompt.name}': ${describeConnectError(error, client.config)}`,
              );
            } else {
              logFeatureBad("mcp_get_prompt", "mcp_get_prompt_failed");
              logMCPError(
                client.name,
                `Error running command '${prompt.name}': ${describeConnectError(error, client.config)}`,
              );
            }
          throw error;
        }
      },
    };
  });
  return checkCommandListable(commands, (command) =>
    logMCPDebug(
      client.name,
      `Prompt '${command.name}' not listed: the server name ${RESERVED_SKILL_NAMESPACE_REASON}. Rename the server in your MCP configuration to list its prompts.`,
    ),
  );
}
export {
  listMcpTools,
  fetchCommandsForClient_2,
  fetchResourcesForClient_2,
  fetchResourceTemplatesForClient_2,
  sanitizeConnectErrorCodeForTelemetry_2,
  persistLiveListing_2,
  buildCachedClientTools_2,
  applyCapabilityServeTimeMiss_2,
  buildMcpPromptCommands_2,
  isSupersededDial_2,
  getDiscoveryFetchError_2,
  isSupersededCacheEntry_2,
  persistDiscovery,
  isDiscoveryCacheMissRecoverable_2,
  discoverySourceLabel_2,
  recordRawResourcesForResult_2,
  connectMcpServer,
  sameConfigHash,
  completeResourceTemplateArgument,
  buildMcpTool,
  getToolsListError,
  fetchMcpTools,
  mcpIdentityChangedSinceLastCheck,
  mcpToolInputToAutoClassifierInput,
  watchNotification,
  watchPromptListChanges,
  watchResourceListChanges,
  watchToolListChanges,
  persistRefreshedToolsIfPresent,
  setDiscoveryFetchError,
  recordRawCommandsForResult,
  recordRawToolsForResult,
  fetchResourceTemplatesForClients,
  runCachedFirstDialArms,
  seedMcpIdentityCheck,
};
