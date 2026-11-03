/**
 * services/mcp/discovery.ts
 *
 * 2.1.316 新增。MCP 服务器发现与工具获取。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-z1n5m6nf.js (40)
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
  truncateDescription_2,
  mapInTurns,
  loggingSafeOrigin,
  mcpBaseUrlAnalytics,
  shouldNormalizeRootCombinators_2,
  shouldDropInvalidToolSchemas_2,
  isIncludedMcpTool_3,
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
  isIdeServer_2,
  listAllPages,
  isMcpAuthCached_3,
  transformResultContent_2,
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
import { normalizeNameForMCP } from "./normalization.js";
import { env } from "../../utils/env.js";
import { applyBlockedToolPolicy } from "./blockedServers.js";
import { logForDebugging } from "../../utils/debug.js";
import { judgeToolSchemaSendability } from "./toolSchemaSendability.js";
import { joinDescription } from "../../remote/tools/inputSchemaFlatten.js";
import { Ji } from "../../../vendor/lodash-es/uniqBy.js";
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
import {
  isStandardKeyActive,
  getServerIdentityKey,
  isIdentityTrackedServer,
  isRemoteTransport,
} from "./mcpStandardKeys.js";
import { dynamicServerConnectorId } from "./mcpToolDecoration.js";
import { stripIgnorables } from "../../utils/sanitization.js";
import { isClaudeInChromeMCPServer } from "../../utils/claudeInChrome/common.js";
import { isStdioConfig, isClaudeAiProxyServer } from "./builtinServerNames.js";
import {
  createChromePermissionHandler,
  readTabUrl,
  judgedSiteMeta,
} from "../../utils/claudeInChrome/chromePermissions.js";
import { IMAGE_LIMITS } from "../../utils/truncateGraphemes.js";
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
import {
  fileReferenceToolToFill,
  wrapFileReferenceTool,
  filledCallRequestMeta,
  fileReferenceToolForRecords,
} from "./fileReference/wrapFileReferenceTool.js";
import { policyDeniedReason } from "../policyLimits/policyVerdicts.js";
import { recordPluginActivity } from "../../utils/pluginActivity.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { count } from "../../utils/collections.js";
import { logChromeToolsAdded } from "../../utils/claudeInChrome/telemetry.js";
import { listToolsWithMemo, settleToolListingMemo } from "./toolSchemaValidation.js";
import { redactMcpErrorDetail } from "./mcpServerOrigin.js";
import { isListAuthError_2, isClaudeAiBearerRejectedError_2 } from "./listAuthError.js";
import { getMcpInfoFromConnection } from "./types.js";
import { hostedDesktopRefusal_2 } from "./mcpWireUtils.js";
import { plural } from "../../utils/stringUtils.js";
import { recordToolUsed } from "../compact/keptTools.js";
import { checkCommandListable } from "../../utils/commandPredicates.js";
import { RESERVED_SKILL_NAMESPACE_REASON } from "../../skills/reservedSkillNames.js";

//@ chunk-z1n5m6nf.js:88192-88259 placement
/**
 * 监听工具列表变化并按需重新拉取。
 */
function watchToolListChanges(e, r) {
  identityId2(e.client).setNotificationHandler(
    ToolListChangedNotificationSchema,
    createListChangedRefetcher(e, r),
  );
}
//@ chunk-z1n5m6nf.js:88259-88326 placement
/**
 * 监听提示列表变化。
 */
function watchPromptListChanges(e, r) {
  identityId2(e.client).setNotificationHandler(
    PromptListChangedNotificationSchema,
    createListChangedRefetcher(e, r),
  );
}
//@ chunk-z1n5m6nf.js:88326-88393 placement
/**
 * 监听资源列表变化。
 */
function watchResourceListChanges(e, r) {
  identityId2(e.client).setNotificationHandler(
    ResourceListChangedNotificationSchema,
    createListChangedRefetcher(e, r),
  );
}
//@ chunk-z1n5m6nf.js:88393-88453 placement
/**
 * 设置任意通知处理器。
 */
function watchNotification(e, r, n) {
  identityId2(e.client).setNotificationHandler(r, n);
}
//@ chunk-z1n5m6nf.js:88453-90098 placement
async function connectMcpServer(e, r) {
  if (e.type === "connected" && e.config.type === "sdk") return e;
  if (isWithdrawnBuiltinPluginServer(e.name, e.config)) throw withdrawnBuiltinPluginServerError(e.name);
  if (isMcpServerBlockedAtConnectTime(e.name, e.config)) {
    if (e.type === "cached") refuseCachedRowV1(e.name, e.config, "policy");
    if (judgeGate(e.name, e.config))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        reservedAddressRefusalText(e.name),
        "MCP server refused at a reserved address",
      );
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `MCP server "${e.name}" is blocked by managed policy`,
      "MCP server blocked by policy",
    );
  }
  if (isMcpServerDisabled(e.name) && (await getCachedConnectResult(e.name, e.config))?.type !== "connected") {
    if (e.type === "cached") refuseCachedRowV1(e.name, e.config, "disabled");
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `MCP server "${e.name}" is disabled \u2014 re-enable it via /mcp to use its tools`,
      "MCP server disabled",
    );
  }
  let n = identityEpoch();
  let s =
    e.type === "cached" && r?.toolUseId !== undefined && TOOL_USE_ID_PATTERN.test(r.toolUseId)
      ? {
          toolUseId: r.toolUseId,
          withListings: r.toolUseIdWithListingsUntil !== undefined,
        }
      : undefined;
  let h =
    s === undefined
      ? connectToServer_2(e.name, e.config)
      : connectToServer_2(e.name, e.config, undefined, undefined, undefined, s);
  if (s !== undefined) {
    let S = () => {
      s.toolUseId = undefined;
    };
    (r?.toolUseIdWithListingsUntil ?? h).then(S, S);
  }
  if (e.type === "cached")
    h.then(
      (S) => runCachedFirstDialArms(S, h, n),
      () => {},
    );
  let y = await boundDial(h, {
    signal: r?.signal,
    timeoutMs: r?.timeoutMs,
    serverName: e.name,
    context: r?.context ?? "MCP connection",
  });
  if (y.type !== "connected") {
    if (y.type === "needs-auth")
      throw Object.assign(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          AUTH_MESSAGES.dialNeedsAuth(e.name),
          "MCP server needs authentication",
        ),
        {
          mcpErrorSource: "user_auth",
        },
      );
    let errorCode = y.type === "failed" ? y.errorCode : undefined;
    throw Object.assign(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        AUTH_MESSAGES.dialNotConnected(
          e.name,
          isDiscoveryCacheOn() && y.type === "failed" && y.error
            ? `: ${normalizeMcpServerName(y.error)}`
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
      },
    );
  }
  if (isWithdrawnBuiltinPluginServer(e.name, e.config)) {
    await detachAndCloseConnection_2(y);
    throw withdrawnBuiltinPluginServerError(e.name);
  }
  return y;
}
//@ chunk-z1n5m6nf.js:90098-90178 placement
/**
 * 判断缓存条目是否已被取代。
 */
function isSupersededCacheEntry_2(e, r, n) {
  let cache = connectToServer_2.cache;
  if (!cache?.get) return false;
  return cache.get(serverCacheKey(r, n)) !== e;
}
//@ chunk-z1n5m6nf.js:90178-90228 placement
/**
 * 判断该次拨号是否已被取代。
 */
function isSupersededDial_2(e) {
  return getCliOwnedState().supersededDials.has(e);
}
//@ chunk-z1n5m6nf.js:90228-90634 placement
/**
 * 缓存首次拨号结束后的处理（v1 副本）：身份变化或被取代时关闭，成功或需认证时记录，失败时删除记忆并上报。
 */
function runCachedFirstDialArms(e, r, n) {
  let cachedFirstDialArmsRan = getCliOwnedState().cachedFirstDialArmsRan;
  if (cachedFirstDialArmsRan.has(e)) return;
  cachedFirstDialArmsRan.add(e);
  let h = serverCacheKey(e.name, e.config);
  let y = getConnectionCache().connections.get(h);
  let S = identityEpoch() !== n;
  let T = y === undefined && S;
  if (isSupersededDial_2(r) || (y !== undefined && y !== r) || T) {
    if (!isSupersededDial_2(r) && S && e.type === "connected") detachAndCloseConnection_2(e);
    return;
  }
  if (e.type === "connected" || e.type === "needs-auth") {
    emitCachedAdoptSignal(e.name, e.config);
    return;
  }
  getConnectionCache().connections.delete(h);
  if (e.type === "failed") recordCachedDialFailureV1(e, !getCliOwnedState().swrRefreshDialsInFlight.has(r));
}
//@ chunk-z1n5m6nf.js:90634-90672 placement
/**
 * 判断两个配置哈希是否相同。
 */
function sameConfigHash(e, r) {
  return configHash(e) === configHash(r);
}
//@ chunk-z1n5m6nf.js:90672-91740 placement
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
//@ chunk-z1n5m6nf.js:91740-91909 placement
/**
 * 把连接错误码收敛为可上报值（v1 副本）。
 */
function sanitizeConnectErrorCodeForTelemetry_2(e) {
  if (e === undefined) return lit("missing");
  if (/^-?\d+$/.test(e)) return fromNumber(Number(e));
  let found = OAUTH_ERROR_CODES.find((n) => n === e);
  if (found !== undefined) return fromEnum(found);
  return sanitizableErrorCode(e) ?? lit("other");
}
//@ chunk-z1n5m6nf.js:91909-92203 placement
var LIST_FAILURE_REASONS_V1 = {
  [ErrorCode.ConnectionClosed]: "connection_closed",
  [ErrorCode.RequestTimeout]: "request_timeout",
  [CCR_NEEDS_APPROVAL_CODE]: "ccr_needs_approval",
  [ErrorCode.ParseError]: "parse_error",
  [ErrorCode.InvalidRequest]: "invalid_request",
  [ErrorCode.MethodNotFound]: "method_not_found",
  [ErrorCode.InvalidParams]: "invalid_params",
  [ErrorCode.InternalError]: "internal_error",
};
//@ chunk-z1n5m6nf.js:92203-92386 placement
/**
 * 把 MCP 工具输入转换为自动模式分类器的输入文本（v1 副本）。
 */
function mcpToolInputToAutoClassifierInput(e, name) {
  let keys = Object.keys(e);
  if (keys.length === 0) return name;
  return keys
    .map((s) => {
      let h = e[s];
      let y = typeof h === "object" && h !== null ? JSON.stringify(h) : String(h);
      return `${s}=${y}`;
    })
    .join(" ");
}
//@ chunk-z1n5m6nf.js:92386-92529 placement
function beginDroppedToolsRoundV1(e) {
  let droppedToolsSeqByConnection = getCliOwnedState().droppedToolsSeqByConnection;
  let n = droppedToolsSeqByConnection.get(e) ?? {
    started: 0,
    applied: 0,
  };
  droppedToolsSeqByConnection.set(e, n);
  n.started += 1;
  return {
    seq: n.started,
    state: n,
  };
}
//@ chunk-z1n5m6nf.js:92529-92586 placement
/**
 * 取服务器的 tools/list 错误。
 */
function getToolsListError(e) {
  return getCliOwnedState().toolsListErrorByResult.get(e);
}
//@ chunk-z1n5m6nf.js:92586-92641 placement
/**
 * 取服务器的发现阶段请求错误。
 */
function getDiscoveryFetchError_2(e) {
  return getCliOwnedState().discoveryFetchErrors.get(e);
}
//@ chunk-z1n5m6nf.js:92641-92701 placement
/**
 * 当前身份令牌。
 */
function currentIdentityToken() {
  isLegacyProtocolEra();
  let target = getMcpIdentitySnapshot();
  return isUnresolved(target) ? undefined : target.token;
}
//@ chunk-z1n5m6nf.js:92701-92833 placement
/**
 * 首次时记录 MCP 身份基线（v1 副本）。
 */
function seedMcpIdentityCheck() {
  let cliOwnedState = getCliOwnedState();
  if (cliOwnedState.identitySeedAttempted) return;
  cliOwnedState.identitySeedAttempted = true;
  let r = currentIdentityToken();
  if (r !== undefined) cliOwnedState.identityBaseline = r;
}
//@ chunk-z1n5m6nf.js:92833-93043 placement
/**
 * 判断 MCP 身份自上次检查以来是否变化并更新基线（v1 副本）。
 */
function mcpIdentityChangedSinceLastCheck() {
  let e = currentIdentityToken();
  let cliOwnedState = getCliOwnedState();
  if (e === undefined) {
    cliOwnedState.identityBaseline = undefined;
    return true;
  }
  if (cliOwnedState.identityBaseline === undefined) {
    cliOwnedState.identityBaseline = e;
    return true;
  }
  if (cliOwnedState.identityBaseline === e) return false;
  cliOwnedState.identityBaseline = e;
  return true;
}
//@ chunk-z1n5m6nf.js:93043-93156 placement
/**
 * 记录原始工具列表与拉取时间（v1 副本）。
 */
function recordRawToolsForResult(e, r) {
  if (!isDiscoveryCacheOn()) return;
  let cliOwnedState = getCliOwnedState();
  cliOwnedState.rawToolsByResult.set(e, r);
  cliOwnedState.rawFetchedAtByResult.set(e, Date.now());
}
//@ chunk-z1n5m6nf.js:93156-93272 placement
/**
 * 记录原始命令列表与拉取时间（v1 副本）。
 */
function recordRawCommandsForResult(e, r) {
  if (!isDiscoveryCacheOn()) return;
  let cliOwnedState = getCliOwnedState();
  cliOwnedState.rawCommandsByResult.set(e, r);
  cliOwnedState.rawFetchedAtByResult.set(e, Date.now());
}
//@ chunk-z1n5m6nf.js:93272-93389 placement
/**
 * 记录原始资源列表与拉取时间（v1 副本）。
 */
function recordRawResourcesForResult_2(e, r) {
  if (!isDiscoveryCacheOn()) return;
  let cliOwnedState = getCliOwnedState();
  cliOwnedState.rawResourcesByResult.set(e, r);
  cliOwnedState.rawFetchedAtByResult.set(e, Date.now());
}
//@ chunk-z1n5m6nf.js:93389-93441 placement
/**
 * 记录服务器的发现阶段请求错误。
 */
function setDiscoveryFetchError(e, r) {
  getCliOwnedState().discoveryFetchErrors.set(e, r);
}
//@ chunk-z1n5m6nf.js:93441-93594 placement
/**
 * 发现缓存命中但服务器具备频道能力时改为未命中（v1 副本）。
 */
function applyCapabilityServeTimeMiss_2(e) {
  if (e.kind !== "fresh" && e.kind !== "stale") return e;
  let capabilities = e.entry.capabilities;
  if (hasChannelCapability(capabilities))
    return {
      kind: "miss",
      reason: "channel-capable",
    };
  return e;
}
//@ chunk-z1n5m6nf.js:93594-95181 placement
async function persistDiscovery(e, r) {
  isLegacyProtocolEra();
  let cliOwnedState = getCliOwnedState();
  if (cliOwnedState.persistedDiscoveryRounds.has(r.tools)) return true;
  if (!isCurrentIdentityEpoch(r.identityEpoch)) return true;
  let s = cliOwnedState.rawToolsByResult.get(r.tools);
  let h = cliOwnedState.rawCommandsByResult.get(r.commands);
  let y = cliOwnedState.rawResourcesByResult.get(r.resources);
  if (s === undefined || h === undefined || y === undefined || r.templates === undefined) return false;
  let min = Math.min(
    cliOwnedState.rawFetchedAtByResult.get(r.tools) ?? Number.POSITIVE_INFINITY,
    cliOwnedState.rawFetchedAtByResult.get(r.commands) ?? Number.POSITIVE_INFINITY,
    cliOwnedState.rawFetchedAtByResult.get(r.resources) ?? Number.POSITIVE_INFINITY,
  );
  if (!Number.isFinite(min)) return true;
  let now = min;
  let mapped = [r.tools, r.commands, r.resources].map((R) => [R, cliOwnedState.rawFetchedAtByResult.get(R)]);
  cliOwnedState.rawToolsByResult.delete(r.tools);
  cliOwnedState.rawCommandsByResult.delete(r.commands);
  cliOwnedState.rawResourcesByResult.delete(r.resources);
  cliOwnedState.rawFetchedAtByResult.delete(r.tools);
  cliOwnedState.rawFetchedAtByResult.delete(r.commands);
  cliOwnedState.rawFetchedAtByResult.delete(r.resources);
  cliOwnedState.persistedDiscoveryRounds.add(r.tools);
  let w = await writeDiscoveryCache(
    e.name,
    e.config,
    {
      ...(e.serverInfo && {
        serverInfo: {
          name: e.serverInfo.name,
          version: e.serverInfo.version,
        },
      }),
      ...(e.protocolEra !== undefined && {
        negotiatedEra: e.protocolEra,
      }),
      capabilities: e.capabilities,
      tools: s,
      commands: h,
      resources: y,
      templates: r.templates.map(({ server, ...E }) => E),
    },
    {
      identityEpoch: r.identityEpoch,
      grantLeg: r.grantLeg,
      now,
    },
  );
  if (w === "terminal") {
    cliOwnedState.persistedDiscoveryRounds.delete(r.tools);
    return false;
  }
  if (w === "transient") {
    cliOwnedState.rawToolsByResult.set(r.tools, s);
    cliOwnedState.rawCommandsByResult.set(r.commands, h);
    cliOwnedState.rawResourcesByResult.set(r.resources, y);
    for (let [R, E] of mapped) if (E !== undefined) cliOwnedState.rawFetchedAtByResult.set(R, E);
    cliOwnedState.persistedDiscoveryRounds.delete(r.tools);
  }
  return true;
}
//@ chunk-z1n5m6nf.js:95181-95439 placement
/**
 * 身份未变化时把刷新得到的工具列表合并写入发现缓存（v1 副本）。
 */
async function persistRefreshedToolsIfPresent(e, r, n) {
  isLegacyProtocolEra();
  if (!isCurrentIdentityEpoch(n.identityEpoch)) return;
  let cliOwnedState = getCliOwnedState();
  let tools = cliOwnedState.rawToolsByResult.get(r);
  let y = cliOwnedState.rawFetchedAtByResult.get(r);
  if (tools === undefined || y === undefined) return;
  await mergeDiscoveryTools(e.name, e.config, tools, {
    identityEpoch: n.identityEpoch,
    grantLeg: n.grantLeg,
    fetchedAt: y,
  });
}
//@ chunk-z1n5m6nf.js:95439-95824 placement
/**
 * 把实时连接得到的列表写入发现缓存（v1 副本）。
 */
async function persistLiveListing_2(e, r) {
  if (
    !isDiscoveryCacheOn() ||
    !isDiscoveryCacheEligible(e.config) ||
    isMcpServerDisabled(e.name) ||
    isMcpServerBlockedAtConnectTime(e.name, e.config)
  )
    return;
  try {
    let n = !!e.capabilities?.resources;
    if (!n) recordRawResourcesForResult_2(r.resources, []);
    let s = n && isCacheableServer(e.config) ? await fetchResourceTemplatesForClient_2(e) : [];
    if (
      (await getCachedConnectResult(e.name, e.config)) !== e ||
      isMcpServerDisabled(e.name) ||
      isMcpServerBlockedAtConnectTime(e.name, e.config)
    )
      return;
    await persistDiscovery(e, {
      ...r,
      templates: getDiscoveryFetchError_2(s) === undefined ? s : undefined,
    });
  } catch (error) {
    logMCPDebug(e.name, `Discovery cache write-through skipped: ${errorMessage(error)}`);
  }
}
//@ chunk-z1n5m6nf.js:95824-96117 placement
function isDiscoveryCacheMissRecoverable_2(e) {
  switch (e.reason) {
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
      return e.reason;
  }
}
//@ chunk-z1n5m6nf.js:96117-96644 placement
function discoverySourceLabel_2(e) {
  if (e.kind !== "miss") return "live";
  switch (e.reason) {
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
      return e.reason;
  }
}
//@ chunk-z1n5m6nf.js:96644-96768 placement
function getMaxResultSizeCharsMeta(e) {
  let r = e._meta?.["anthropic/maxResultSizeChars"];
  return typeof r === "number" && Number.isFinite(r) && r > 0 ? r : undefined;
}
//@ chunk-z1n5m6nf.js:96768-101063 placement
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
  iconUrl,
  serverInfoName,
  role,
  listed,
  call: ze,
  overrides,
}) {
  let mcpToolName = buildMcpToolName(serverName, listed.name);
  let maxResultSizeCharsMeta = getMaxResultSizeCharsMeta(listed);
  let Ne = maxResultSizeCharsMeta !== undefined;
  let Te = listed._meta?.["anthropic/requiresUserInteraction"] === true;
  let we = toolUiMeta(listed._meta);
  let Oe = promptOverrides?.tools?.[listed.name] ?? listed.description ?? "";
  let De = truncateDescription_2(Oe, `Tool "${listed.name}" description`, serverName, maxDescriptionLength_2);
  let xe = truncateDescription_2(
    Oe,
    `Tool "${listed.name}" description`,
    serverName,
    maxLoadedDescriptionLength,
  );
  let He =
    promptOverrides?.search_hints?.[listed.name] ??
    (typeof listed._meta?.["anthropic/searchHint"] === "string"
      ? listed._meta["anthropic/searchHint"]
      : undefined);
  let Fe = withOverlapSlots(serverName, listed.name, ze);
  let Ue = requiresConnectorGrant(serverName, {
    scope,
    pluginSource,
  });
  let Ie = Ue || legacyGrantRefused;
  let ve =
    legacyGrantRefused &&
    legacyGrantRebindable &&
    !Te &&
    effectiveMaxPermission !== "ask" &&
    overrides?.suppressesAlwaysAllowRule === undefined &&
    overrides?.requiresUserInteraction === undefined &&
    !isDesignGatedTool(isFirstPartyDesignServer, listed.name);
  let Ee = Ie || isDesignGatedTool(isFirstPartyDesignServer, listed.name);
  let B = () =>
    Ue ||
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
  if (Ie)
    logMCPDebug(
      serverName,
      Ue
        ? "Allow rules do not apply: this server's name starts like a claude.ai connector's. To use allow rules, the server needs another name, and the rules must use that name."
        : "Allow rules do not apply: another MCP server already uses this name, or the name could not be recorded in the config file. Give this server a different name and write the rules for that name, or reconnect if the config file was busy.",
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
      ...(ve && {
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
      ...(we && {
        uiMeta: we,
      }),
      ...(describeHiddenMcpTool(listed._meta, serverName, listed.name) && {
        hiddenFromModel: true,
      }),
    },
    isMcp: true,
    searchHint: He?.replace(/\s+/g, " ").trim() || undefined,
    alwaysLoad:
      !serverDefersAllTools &&
      ((serverAlwaysLoad && !(scope === "dynamic" && listed._meta?.["anthropic/alwaysLoad"] === false)) ||
        listed._meta?.["anthropic/alwaysLoad"] === true),
    async description() {
      return Oe;
    },
    async prompt({ loadedThroughToolSearch }) {
      return loadedThroughToolSearch ? xe : De;
    },
    isConcurrencySafe() {
      return Fe.mayOverlap || (listed.annotations?.readOnlyHint ?? false);
    },
    isReadOnly() {
      return listed.annotations?.readOnlyHint ?? false;
    },
    readOnlyHint: listed.annotations?.readOnlyHint,
    openWorldHint: listed.annotations?.openWorldHint,
    toAutoClassifierInput(te) {
      return mcpToolInputToAutoClassifierInput(te, listed.name);
    },
    isDestructive() {
      return listed.annotations?.destructiveHint ?? false;
    },
    isOpenWorld() {
      return listed.annotations?.openWorldHint ?? false;
    },
    requiresUserInteraction() {
      return Te;
    },
    async validateInput(te, Pe) {
      let ke = refuseNonMainAccountMemoryWrite(accountMemoryServer, listed.name, Pe);
      if (ke === undefined)
        return {
          result: true,
        };
      logEvent("tengu_account_memory_spawned_write_refused", {
        caller: fromEnumOpt(Pe.memoryCaller) ?? lit("unmarked"),
      });
      return {
        result: false,
        message: ke,
        errorCode: 1,
      };
    },
    suppressesAlwaysAllowRule: (te, Pe) =>
      Te ||
      (effectiveMaxPermission === "ask" && !Pe) ||
      B() ||
      isDesignGatedTool(isFirstPartyDesignServer, listed.name),
    ...((Ie || isServerIdentityActive()) && {
      ignoresWholeToolAllowRule: B,
    }),
    maxResultSizeChars: Ne
      ? Math.min(maxResultSizeCharsMeta, MAX_MCP_RESULT_CHARS)
      : MCPTool.maxResultSizeChars,
    persistenceThresholdCeiling: Ne ? MAX_MCP_RESULT_CHARS : undefined,
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
    async checkPermissions(te, Pe) {
      let ke = gateDesignWriteWithoutPlanToken(isFirstPartyDesignServer, listed.name, te);
      if (ke) return ke;
      if (isFirstPartyDesignServer) {
        let oe = peekScopeExpansionNotice();
        let ye =
          (await oe?.wouldNeedDesignConsent(Pe.toolState.get(DesignGateState), Pe.credentials)) ?? null;
        if (ye !== null && oe && Pe.toolUseId) {
          let Ae = rememberDesignConsentAsk(Pe.toolUseId, ye, canAskDesignConsent(Pe));
          return askDesignConsent(oe.consentPromptFor(ye), te, Ae);
        }
      }
      if (Te)
        return {
          behavior: "ask",
          message: "MCPTool requires permission.",
          suggestions: [],
          suppressAlwaysAllowRule: true,
        };
      return {
        behavior: "passthrough",
        message: "MCPTool requires permission.",
        suggestions: Ee
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
    call: Fe.call,
    userFacingName() {
      let trimmed = (listed.annotations?.title || listed.name).replace(/\s+/g, " ").trim();
      return `${serverName} - ${trimmed} (MCP)`;
    },
    ...overrides,
  };
}
//@ chunk-z1n5m6nf.js:101063-101346 placement
async function buildCachedClientTools_2({ name: e, config, capabilities, serverInfo, savedAt, tools }) {
  primeEnsureConnectedClient();
  await evictStaleFailedConnectMemoForServe(e, config);
  let S = {
    name: e,
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
    client: S,
    tools: await fetchMcpTools(S, tools, Date.now(), "cache", beginDroppedToolsRoundV1(S)),
  };
}
//@ chunk-z1n5m6nf.js:101346-117269 placement
/**
 * 获取 MCP 服务器工具：调用 tools/list，按权限上限、提示词覆盖、描述长度限制、插件来源等把 MCP 工具转换成 Claude Code 工具定义，失败时记 tengu_mcp_degraded。
 */
async function fetchMcpTools(config, r, n, s, h) {
  r = filterRemoteRepoTools(config.config, r);
  let y = r.length;
  let streamingListingSanitizer = createStreamingListingSanitizer();
  let T = (await mapInTurns(r, (B) => streamingListingSanitizer(B) ?? [])).flat();
  r = [];
  let M = loggingSafeOrigin(config.config);
  let w = mcpBaseUrlAnalytics(config.config, config.name);
  let mcpServerName = mcpNameForAnalytics_GATE_EVALUATED(
    normalizeNameForMCP(config.name),
    isMcpServerLoggableInAnalytics(config.name, config.config),
  );
  let E = y - T.length;
  if (E > 0) {
    logMCPError(config.name, listingTruncatedNote("tools", E, y));
    logEvent("tengu_mcp_degraded", {
      reason: lit("tool_listing_over_limit"),
      transportType: fromEnum(config.config.type ?? "stdio"),
      skippedCount: E,
      mcpServerName,
      ...w,
    });
  }
  if (y === 0 && s === "live")
    logEvent("tengu_mcp_degraded", {
      reason: lit("connected_zero_tools"),
      transportType: fromEnum(config.config.type ?? "stdio"),
      mcpServerName,
      ...w,
    });
  let CLAUDE_AGENT_SDK_MCP_NO_PREFIX = config.config.type === "sdk" && env.CLAUDE_AGENT_SDK_MCP_NO_PREFIX;
  let toolPermissions =
    config.config.type === "claudeai-proxy" || config.config.type === "http" || config.config.type === "sse"
      ? config.config.toolPermissions
      : undefined;
  let U = isRunnerDynamicServer(config.config) ? applyBlockedToolPolicy(toolPermissions) : toolPermissions;
  if (U) {
    let B = Object.keys(U).length;
    if (B > 0 && !T.some((te) => U[te.name] !== undefined))
      logForDebugging(
        `[claudeai-mcp] ${config.name}: toolPermissions has ${B} entries but none matched upstream tool names \u2014 backend name drift?`,
        {
          level: "warn",
        },
      );
  }
  let normalizeEnabled = shouldNormalizeRootCombinators_2(config.config);
  let apiValidateEnabled = shouldDropInvalidToolSchemas_2(config.config);
  let G = 0;
  let q = 0;
  let j = 0;
  let fe = 0;
  let pe = 0;
  let ge = [];
  let ce = 0;
  let le = 0;
  let k = await mapInTurns(T, (B) => {
    let te = judgeToolSchemaSendability(B.inputSchema, {
      normalizeEnabled,
      apiValidateEnabled,
    });
    if (te.verdict === "drop" && te.cause !== "api_invalid") {
      if (te.cause === "normalize_gated") q++;
      else j++;
      logMCPError(
        config.name,
        `Skipping tool "${B.name}": ${te.reason}. Other tools from this server remain available.`,
      );
      return [];
    }
    if (te.normalized) {
      G++;
      logMCPDebug(
        config.name,
        `Normalized input schema for tool "${B.name}" (flattened top-level ${te.normalized.combinators.join("/")})`,
      );
    }
    if (te.verdict === "drop") {
      if (te.rejection.check === "meta") fe++;
      else pe++;
      if (
        U?.[B.name] !== "blocked" &&
        isIncludedMcpTool_3(CLAUDE_AGENT_SDK_MCP_NO_PREFIX ? B.name : buildMcpToolName(config.name, B.name))
      )
        ge.push({
          toolName: B.name,
          reason: te.rejection.detail,
        });
      logMCPError(
        config.name,
        `Skipping tool "${B.name}": its input schema would be rejected by the Anthropic API (${te.rejection.detail}). Other tools from this server remain available.`,
      );
      return [];
    }
    if (te.apiWouldReject) {
      if (te.apiWouldReject.check === "meta") ce++;
      else le++;
      logMCPDebug(
        config.name,
        `Tool "${B.name}" input schema would be rejected by the Anthropic API (${te.apiWouldReject.detail}); requests that include it may fail`,
      );
    }
    return te.normalized
      ? [
          {
            ...B,
            inputSchema: te.normalized.schema,
            description: joinDescription(te.normalized.note, B.description),
          },
        ]
      : [B];
  });
  let L = Ji(k.flat(), "name");
  if (h.seq > h.state.applied) {
    h.state.applied = h.seq;
    config.droppedTools = Ji(ge, "toolName");
  }
  if (G > 0)
    logEvent("tengu_mcp_degraded", {
      reason: lit("tool_schema_normalized"),
      transportType: fromEnum(config.config.type ?? "stdio"),
      normalizedCount: G,
      mcpServerName,
      ...w,
    });
  if (q > 0)
    logEvent("tengu_mcp_degraded", {
      reason: lit("tool_schema_normalize_gated"),
      transportType: fromEnum(config.config.type ?? "stdio"),
      skippedCount: q,
      mcpServerName,
      ...w,
    });
  if (j > 0)
    logEvent("tengu_mcp_degraded", {
      reason: lit("tool_schema_unsupported"),
      transportType: fromEnum(config.config.type ?? "stdio"),
      skippedCount: j,
      mcpServerName,
      ...w,
    });
  if (fe > 0)
    logEvent("tengu_mcp_degraded", {
      reason: lit("tool_schema_invalid"),
      transportType: fromEnum(config.config.type ?? "stdio"),
      skippedCount: fe,
      mcpServerName,
      ...w,
    });
  if (pe > 0)
    logEvent("tengu_mcp_degraded", {
      reason: lit("tool_property_key_invalid"),
      transportType: fromEnum(config.config.type ?? "stdio"),
      skippedCount: pe,
      mcpServerName,
      ...w,
    });
  if (ce > 0)
    logEvent("tengu_mcp_degraded", {
      reason: lit("tool_schema_invalid_gated"),
      transportType: fromEnum(config.config.type ?? "stdio"),
      keptCount: ce,
      mcpServerName,
      ...w,
    });
  if (le > 0)
    logEvent("tengu_mcp_degraded", {
      reason: lit("tool_property_key_invalid_gated"),
      transportType: fromEnum(config.config.type ?? "stdio"),
      keptCount: le,
      mcpServerName,
      ...w,
    });
  let be = () => isMcpServerLoggableInAnalytics(config.name, config.config);
  let W = toolTimeoutForServer(config.config);
  let maxLoadedDescriptionLength = toolTimeoutForServer(config.config, true);
  await logToolCallXmlInDescriptions(L, config.name, be(), M, config.instructions);
  let X = isDesignServerConfig(config.config);
  let Le = officialPluginPromptOverrides(config.config);
  let pluginTelemetry = config.config.pluginSource
    ? buildPluginEventFieldsFromId(config.config.pluginSource, policyEnabledPluginNameSet())
    : undefined;
  let Ne = isCliOwnedConfig(config.config);
  let Te = Ne && config.name === CLAUDE_ARTIFACTS;
  let we = Te || isOwnCcrMcpServer(config.config);
  let Oe = false;
  let De = L;
  let xe =
    T.some((B) => isMemoryToolServer(config, B.name)) ||
    De.some((B) => isMemoryToolServer(config, B.name)) ||
    (E > 0 && isMemoryToolServer_2(config));
  let He = {
    serverName: config.name,
    scope: config.config.scope,
    pluginSource: config.config.pluginSource,
    serverType: config.config.type ?? "stdio",
    sdkDocsConnector: isDocsConnectorClient(config),
    source: mcpServerSource(config.name, config.config),
    skipPrefix: CLAUDE_AGENT_SDK_MCP_NO_PREFIX,
    serverAlwaysLoad: config.config.alwaysLoad === true,
    serverDefersAllTools: config.config.alwaysLoad === false,
    promptOverrides: Le,
    isFirstPartyDesignServer: X,
    maxDescriptionLength: W,
    maxLoadedDescriptionLength,
    pluginTelemetry,
    cliOwned: Ne,
    displayName: "displayName" in config.config ? config.config.displayName : undefined,
    standardKey: isStandardKeyActive()
      ? getServerIdentityKey(config.name, config.config, Ne === true)
      : undefined,
    legacyGrantRefused:
      isStandardKeyActive() &&
      (await isLegacyKeyRefused(
        {
          serverName: config.name,
          serverType: config.config.type ?? "stdio",
          serverId: connectorServerId(config.config),
        },
        requiresConnectorGrant(config.name, config.config),
        isIdentityTrackedServer(config.name, config.config),
      )),
    legacyGrantRebindable:
      isStandardKeyActive() &&
      !requiresConnectorGrant(config.name, config.config) &&
      isIdentityTrackedServer(config.name, config.config) &&
      isLegacyKeyOwnedElsewhere({
        serverName: config.name,
        serverType: config.config.type ?? "stdio",
        serverId: connectorServerId(config.config),
      }),
    denyKey: isStandardKeyActive() ? isRemoteTransport(config.config) : undefined,
    serverId: connectorServerId(config.config),
    serverIdStamp: dynamicServerConnectorId(config.name, config.config),
    iconUrl: "iconUrl" in config.config ? config.config.iconUrl : undefined,
    serverInfoName: stripIgnorables(config.serverInfo?.name ?? "") || undefined,
    role: "role" in config.config ? config.config.role : undefined,
  };
  let Fe = isClaudeInChromeMCPServer(config.name);
  let Ue = isDocsConnectorServer(config);
  let filtered = (
    await mapInTurns(De, (B) => {
      let fullyQualifiedName = buildMcpToolName(config.name, B.name);
      let Pe = getMaxResultSizeCharsMeta(B) !== undefined;
      let overrides = {
        ...(Fe &&
          isStdioConfig(config.config) && {
            ...needsAuthCacheModuleV1().getClaudeInChromeMCPToolOverrides(B.name),
            builtinRenderFamily: "claude-in-chrome",
          }),
        ...(Fe &&
          isClaudeAiProxyServer(config.config) && {
            ...createChromePermissionHandler(B.name, B._meta, (_e, ee) =>
              readTabUrl(
                async (tool, args, signal) =>
                  (
                    await callMCPTool_2({
                      client: await connectMcpServer(config, {
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
                _e,
                ee,
              ),
            ),
          }),
        ...(config.name === REMOTE_BROWSER_SERVER_NAME && {
          excludedFromModeBypassAllow: isRemoteBrowserModeFloorOn,
        }),
        ...false,
        ...(config.config.type === "sdk" && isFileUploadServer(config.name)
          ? buildMcpToolPermissionOverrides(
              config.name,
              B.name,
              B.inputSchema.properties,
              mcpToolInputToAutoClassifierInput,
            )
          : {}),
        ...(isSlackSendToolName(B.name) ? createSlackSendToolUi() : {}),
        ...(isClaudeTestWriteCall(config.name, config.config.pluginSource, B.name)
          ? claudeTestWriteToolOverrides()
          : {}),
        ...{},
        ...(Te ? artifactsMcpLaptopModuleV1()?.artifactsMcpLaptopToolOverridesFor(config.config) : {}),
        ...(isRunnerDynamicServer(config.config) && {
          skipAggregateToolResultBudget: true,
        }),
      };
      let tool = buildMcpTool({
        ...He,
        accountMemory: isMemoryServerConnection(config, B.name),
        accountMemoryServer: xe,
        effectiveMaxPermission: U?.[B.name],
        listed: B,
        overrides,
        async call(_e, ee, canUseTool, x, D, z) {
          let ie = ee.toolUseId ?? getFirstToolUseId_2(x);
          let ue = refuseNonMainAccountMemoryWrite(xe, B.name, ee);
          if (ue !== undefined)
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              ue,
              "account memory write from a spawned loop",
            );
          let Se = {
            ...stripHostMetaUnlessCcrScoped(config.config, ee.mcpRequestMeta),
            ...z?.mcpCallMeta,
            ...(ie && {
              "claudecode/toolUseId": ie,
            }),
            ...consumeMcpApprovalTicket(ee.session, ee.toolUseId, config.name, config.config),
            ...(isClaudeInChromeMCPServer(config.name) &&
              isClaudeAiProxyServer(config.config) &&
              judgedSiteMeta(ee)),
            ...((isDocsConnectorServer(config) || isOwnArtifactMcpTool(config.name, config.config)) &&
              requestIdMeta(x.requestId)),
            ...(isHearthbotRelayServer(config) && ccrTurnEventHeaders(turnTraceContextsOf())),
            ...agentRequestMeta(config, ee),
            ...(isAccountMemoryServer(config) && memoryChainMeta(ee.toolState, x.message.id)),
          };
          let me = false;
          function Me(data) {
            if (!D || !ie || me) return;
            D({
              type: "progress",
              toolUseID: ie,
              data,
            });
          }
          Me({
            type: "mcp_progress",
            status: "started",
            serverName: config.name,
            toolName: B.name,
          });
          let now = Date.now();
          let et = config;
          let Je = false;
          let Ye;
          let We = null;
          let __consentNonce = typeof _e.__consentNonce === "string" ? _e.__consentNonce : undefined;
          if ("__consentNonce" in _e) {
            let { __consentNonce, ...Et } = _e;
            _e = Et;
          }
          let wt = X ? takeDesignConsentAsk(ie, __consentNonce) : null;
          if (X) noteDesignProjectId(ee.toolState.get(DesignGateState), X, B.name, _e);
          let onAwaitingUserInput = (Qe) => {
            Je = Qe;
            if (Qe) {
              Ye ??= z?.timing?.mark("approval");
              if (!me && tool.name !== getPermissionPromptToolName() && We === null) We = parkOnUser();
            } else {
              Ye?.();
              Ye = undefined;
              We?.();
              We = null;
            }
          };
          let at = true;
          let ct = async (Qe) => {
            for (let idx = 0; ; idx++)
              try {
                let toolUseId = at ? ie : undefined;
                at = false;
                let Ut = z?.timing?.mark(
                  config.config.type === "http" && issuerKey_3(config.config.url) ? "own" : "external",
                );
                let yt = await connectMcpServer(config, {
                  context: "MCP tool call",
                  toolUseId,
                }).finally(Ut);
                et = yt;
                applyMemoryCallerMeta(Se, xe, ee, yt);
                let je = await callMCPToolWithUrlElicitationRetry_2({
                  client: yt,
                  clientConnection: config,
                  tool: B.name,
                  args: _e,
                  meta: Se,
                  signal: Qe,
                  imageLimits: imageLimitsForModel(ee.options.mainLoopModel),
                  taskRegistry: ee.taskRegistry,
                  toolUseId: ie,
                  onProgress: D && ie ? Me : undefined,
                  requestDialog: ee.requestDialog,
                  storageV5: ee.storageV5,
                  credentials: ee.credentials,
                  hasResultSizeAnnotation: Pe || ee.innerCall === true,
                  onAwaitingUserInput,
                  timing: z?.timing,
                  offCriticalPath:
                    (getBackgroundAgentId(ee.agentContext) ??
                      (ee.isBackgroundAgent ? ee.agentId : undefined)) !== undefined,
                  ccrNeedsApprovalRetry:
                    "url" in config.config &&
                    isSameOriginAsCcr(config.config.url) &&
                    canPromptForPermission(ee) &&
                    !(getPermissionPromptToolName() && getPermissionPromptToolName() !== "stdio")
                      ? {
                          canUseTool,
                          tool,
                          fullyQualifiedName,
                          toolUseContext: ee,
                          parentMessage: x,
                        }
                      : undefined,
                });
                if (je.interrupted) throw new AbortError(INTERRUPTED_CALL_NOTICE);
                Me({
                  type: "mcp_progress",
                  status: "completed",
                  serverName: config.name,
                  toolName: B.name,
                  elapsedTimeMs: Date.now() - now,
                });
                if (!je.isError) {
                  logPrCreateOperation(B.name);
                  if (isAccountMemoryServer(config))
                    rememberMemoryChain(ee.toolState, x.message.id, je._meta);
                  if (!me && isClaudeInChromeMCPServer(config.name) && isClaudeAiProxyServer(config.config))
                    je.content = chromeNoBrowserAnswer(je.content, je._meta, ee);
                }
                if (idx > 0) logFeatureOk("mcp_session_recovery");
                let Xt = rewriteAnthropicSourcesForCcr(config.config, stripAnthropicMeta(je._meta));
                return {
                  data: je.content,
                  ...(je.urlElicitationDeclined && {
                    urlElicitationDeclined: je.urlElicitationDeclined,
                  }),
                  ...((Xt || je.structuredContent || je.resourceLinks) && {
                    mcpMeta: {
                      ...(Xt && {
                        _meta: Xt,
                      }),
                      ...(je.structuredContent && {
                        structuredContent: je.structuredContent,
                      }),
                      ...(je.resourceLinks && {
                        resourceLinks: je.resourceLinks,
                      }),
                    },
                  }),
                };
              } catch (error) {
                if (
                  error instanceof McpSessionExpiredError &&
                  idx < 1 &&
                  (!error.mayHaveRun || tool.isConcurrencySafe(_e) || B.annotations?.idempotentHint === true)
                ) {
                  logFeatureSad("mcp_session_recovery", error.expiryKind);
                  logMCPDebug(config.name, `Retrying tool '${B.name}' after session recovery`);
                  continue;
                }
                if (error instanceof McpSessionExpiredError)
                  logFeatureBad(
                    "mcp_session_recovery",
                    idx < 1 ? "may_have_run_no_retry" : "session_retry_exhausted",
                  );
                else if (idx > 0 && !Qe.aborted) logFeatureBad("mcp_session_recovery", "retry_failed_other");
                Me({
                  type: "mcp_progress",
                  status: "failed",
                  serverName: config.name,
                  toolName: B.name,
                  elapsedTimeMs: Date.now() - now,
                });
                if (!Qe.aborted) noteHearthDegraded(config.name, error);
                if (
                  error instanceof Error &&
                  !(error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS)
                ) {
                  let Ut = error.constructor.name;
                  let yt = () => (Qe.aborted ? "other" : classifyMcpErrorSourceCategory(error));
                  if (Ut === "Error") {
                    let je = describeConnectError(error, config.config);
                    throw Object.assign(
                      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(je, je.slice(0, 200)),
                      {
                        mcpErrorSource: yt(),
                      },
                    );
                  }
                  if (Ut === "McpError" && "code" in error && typeof error.code === "number") {
                    let merged = Object.assign(
                      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                        error.message,
                        `McpError ${error.code}`,
                      ),
                      {
                        mcpErrorSource: yt(),
                      },
                    );
                    throw isNeedsApprovalOrExpiredSessionV1(error) ? markRefusedByCcrProxy(merged) : merged;
                  }
                }
                raiseMemoryErrorCap(error, config, B.name);
                throw error;
              }
          };
          let dt = ct;
          if (X)
            dt = wrapCallWithDesignConsent(ct, {
              designSession: ee.toolState.get(DesignGateState),
              approvedConsentBit: wt?.bit ?? null,
              consentAskReachesUser: (wt?.askReachesUser ?? false) && canAskDesignConsent(ee),
              credentials: ee.credentials,
            });
          if (B.name === GET_TASK && isToolboxServer(config)) {
            let { withTaskFilesRemembered } = await import("./chunk-h33h7b0z.js");
            dt = withTaskFilesRemembered(dt, {
              client: config,
              args: _e,
              session: ee.session,
            });
          }
          if (
            netModule &&
            !ee.agentId &&
            ee.taskRegistry !== UNLIMITED_RATE_LIMITER &&
            tool.name !== getPermissionPromptToolName()
          ) {
            let mcpAutoBackgroundMs = netModule.getMcpAutoBackgroundMs(config.config, {
              isNonInteractiveSession: ee.options.isNonInteractiveSession,
            });
            let Et =
              mcpAutoBackgroundMs === 0 &&
              netModule.isMcpCallMovableWithoutTimer(config.config, {
                isNonInteractiveSession: ee.options.isNonInteractiveSession,
                isInnerCall: ee.innerCall === true,
              });
            if (mcpAutoBackgroundMs > 0 || Et)
              return netModule.callMcpToolWithAutoBackground({
                run: dt,
                serverName: config.name,
                toolName: B.name,
                accountMemoryTool: isLiveMemoryTool(tool),
                toolUseId: ie,
                parentAbortController: ee.abortController,
                taskRegistry: ee.taskRegistry,
                autoBackgroundMs: Et ? null : mcpAutoBackgroundMs,
                storageV5: ee.storageV5,
                credentials: ee.credentials,
                hasPendingElicitation: () =>
                  Je ||
                  ((et.type === "connected" ? et.transportErrorState?.pendingElicitations : undefined) ?? 0) >
                    0,
                onBackgrounded: () => {
                  me = true;
                },
                foregroundCalls: ee.innerCall ? undefined : foregroundCallRegistrySlots.of(ee.session),
                noticeGate: wrapHoldAware({
                  hookCaller: ee.hookCaller,
                  hookServesModel: ee.hookServesModel,
                  pluginUnnamed: ee.pluginUnnamed,
                }),
              });
          }
          return dt(ee.abortController.signal);
        },
      });
      if (Fe && (B.name === "file_upload" || B.name === "browser_batch")) {
        let CLAUDE_CODE_IS_COWORK =
          !isStdioConfig(config.config) && !env.CLAUDE_CODE_REMOTE && env.CLAUDE_CODE_IS_COWORK;
        let ee = tool.call;
        tool.call = async (P, x, D, z, ie, ue) => {
          let {
            FILE_UPLOAD_MAX_TOTAL_BYTES,
            passThroughChromeFileUploadInput,
            prepareChromeFileUploadInput,
          } = await import("./chunk-f11kwnvn.js");
          let Be = CLAUDE_CODE_IS_COWORK
            ? await passThroughChromeFileUploadInput(B.name, P ?? {}, getToolPermissionContext(x))
            : await prepareChromeFileUploadInput(
                B.name,
                P ?? {},
                getToolPermissionContext(x),
                isClaudeAiProxyServer(config.config)
                  ? {
                      maxTotalBytes: chromeUploadMaxBytes(B._meta, FILE_UPLOAD_MAX_TOTAL_BYTES),
                      hosted: {
                        session: x.session,
                        signal: x.abortController.signal,
                      },
                    }
                  : undefined,
              );
          if (Be.error)
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              Be.error,
              "Claude in Chrome file_upload path rejected",
            );
          return ee(
            Be.input ?? P,
            x,
            D,
            z,
            ie,
            Be.callMeta
              ? {
                  ...ue,
                  mcpCallMeta: Be.callMeta,
                }
              : ue,
          );
        };
      }
      if (
        config.config.type === "sdk" &&
        isFileUploadServer(config.name) &&
        FILE_UPLOAD_TOOLS.includes(B.name) &&
        !env.CLAUDE_CODE_REMOTE &&
        !env.CLAUDE_CODE_IS_COWORK &&
        resolveSdkUrl().status === "absent"
      ) {
        let _e = B._meta?.[ANTHROPIC_HOSTASKSPERUPLOADEDFILE] === true;
        let ee = tool.call;
        tool.call = async (P, x, D, z, ie, ue) => {
          let Se = await import("./chunk-v64arqfj.js");
          let me = await Se.paneFileUploadCall(
            P,
            getToolPermissionContext(x),
            x.mcpRequestMeta,
            _e,
            x.autoModeClassified === true,
          );
          return ee(
            me.input,
            {
              ...x,
              mcpRequestMeta: me.mcpRequestMeta,
            },
            D,
            z,
            ie,
            ue && {
              ...ue,
              mcpCallMeta: {},
            },
          );
        };
      }
      if (isTaskWriteMethod(B.name)) {
        let _e = B.name;
        let validateInput = tool.validateInput;
        tool.validateInput = async (D, z) => {
          let ie = validateInput
            ? await validateInput(D, z)
            : {
                result: true,
              };
          if (!ie.result) return ie;
          let { startTaskInputRefusal } = await import("./chunk-d40fm320.js");
          let taskInputRefusal = startTaskInputRefusal(config, _e, D, tool.inputJSONSchema, z.session);
          return taskInputRefusal === undefined
            ? ie
            : {
                result: false,
                message: taskInputRefusal,
                errorCode: 2,
              };
        };
        let prompt = tool.prompt;
        tool.prompt = async (D) => {
          let z = await prompt(D);
          let toolPermissionContext = await D.getToolPermissionContext();
          if (toolPermissionContext.isRemoteMode !== true) return z;
          let { startTaskFilesPromptNote } = await import("./chunk-d40fm320.js");
          let taskFilesPromptNote = startTaskFilesPromptNote(config, _e, toolPermissionContext);
          return taskFilesPromptNote === undefined
            ? z
            : `${z}

${taskFilesPromptNote}`;
        };
        let x = tool.call;
        tool.call = async (D, z, ie, ue, Se, me) => {
          let Me = D ?? {};
          if (!Array.isArray(Me.files) || Me.files.length === 0) return x(D, z, ie, ue, Se, me);
          let {
            prepareStartTaskFileInputs,
            removeStartTaskUploadsFor,
            startTaskInputRefusal,
            startTaskSendRefusal,
          } = await import("./chunk-d40fm320.js");
          let toolUseId = z.toolUseId;
          let pendingTaskFilesForArgs = findPendingTaskFilesForArgs(z.session, toolUseId, Me.files);
          if (pendingTaskFilesForArgs !== undefined && toolUseId !== undefined) {
            let taskSendRefusal = startTaskSendRefusal(pendingTaskFilesForArgs.uploadStartedAt, _e);
            if (taskSendRefusal !== undefined) {
              await discardTaskFiles(z.session, pendingTaskFilesForArgs);
              throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                taskSendRefusal,
                "start_task files not sent after the approval",
              );
            }
            pendingTaskFilesForArgs.state = "sending";
            registerDiscarder(z.session, toolUseId, () =>
              startTaskSendRefusal(pendingTaskFilesForArgs.uploadStartedAt, _e),
            );
            try {
              return await x(D, z, ie, ue, Se, me);
            } catch (error) {
              if (isRefusedByCcrProxy(error)) {
                pendingTaskFilesForArgs.state = "pending";
                await discardTaskFiles(z.session, pendingTaskFilesForArgs);
              }
              throw error;
            } finally {
              unregisterDiscarder(z.session, toolUseId);
              markTaskFilesSent(z.session, pendingTaskFilesForArgs);
            }
          }
          let taskInputRefusal = startTaskInputRefusal(config, _e, Me, tool.inputJSONSchema, z.session);
          if (taskInputRefusal !== undefined)
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              taskInputRefusal,
              "start_task input refused",
            );
          let now = Date.now();
          let startTaskFileInputs = await prepareStartTaskFileInputs(
            config,
            _e,
            Me,
            getToolPermissionContext(z),
            z.abortController.signal,
            z.session,
          );
          if (startTaskFileInputs.error)
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              startTaskFileInputs.error,
              "start_task file input rejected",
            );
          if (startTaskFileInputs.input === undefined || toolUseId === undefined)
            return x(startTaskFileInputs.input ?? D, z, ie, ue, Se, me);
          registerDiscarder(z.session, toolUseId, () => startTaskSendRefusal(now, _e));
          try {
            return await x(startTaskFileInputs.input, z, ie, ue, Se, me);
          } catch (error) {
            if (isRefusedByCcrProxy(error))
              await removeStartTaskUploadsFor(config, z.session, startTaskFileInputs.input.files);
            throw error;
          } finally {
            unregisterDiscarder(z.session, toolUseId);
          }
        };
        if (isToolboxMcpServer(config))
          tool.askInputPreparer = async (D, z, ie) => {
            if (!Array.isArray(D.files) || D.files.length === 0) return;
            let { startTaskAskInputPreparer, startTaskInputRefusal } = await import("./chunk-d40fm320.js");
            let taskAskInputPreparer = startTaskAskInputPreparer(
              config,
              _e,
              D,
              getToolPermissionContext(z),
              z.abortController.signal,
              z.session,
              ie,
            );
            return (
              taskAskInputPreparer && {
                prepare: () => {
                  let taskInputRefusal = startTaskInputRefusal(
                    config,
                    _e,
                    D,
                    tool.inputJSONSchema,
                    z.session,
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
      let { validateInput, call: Ae, askInputPreparer } = tool;
      if (B._meta?.[ANTHROPIC_FILEINPUTS] !== undefined)
        wireFileInputs(
          tool,
          {
            client: config,
            name: B.name,
            meta: B._meta,
            schema: tool.inputJSONSchema,
          },
          (_e) => async (tool, args) =>
            (
              await callMCPTool_2({
                client: await connectMcpServer(config, {
                  context: "MCP tool call",
                }),
                tool,
                args,
                signal: _e.abortController.signal,
                imageLimits: imageLimitsForModel(_e.options.mainLoopModel),
                hasResultSizeAnnotation: true,
                storageV5: _e.storageV5,
                credentials: _e.credentials,
              })
            ).structuredContent,
        );
      {
        let _e = fileReferenceToolToFill(config, B.name);
        if (_e !== undefined)
          wrapFileReferenceTool(
            tool,
            _e,
            {
              validateInput,
              call: Ae,
              askInputPreparer,
            },
            getFirstToolUseId_2,
            filledCallRequestMeta(config),
          );
      }
      if (tool.mcpInfo !== undefined && fileReferenceToolForRecords(config, B.name) !== undefined)
        tool.mcpInfo = {
          ...tool.mcpInfo,
          fileReference: true,
        };
      if (Te || isRunnerDynamicServer(config.config))
        artifactPermissionRulesModuleV1()?.applyArtifactRules(config.config, tool);
      if (we) artifactsMcpLaptopModuleV1()?.wrapArtifactsMcpLaptopPublishing(config.config, tool);
      if (Ue) claudeDocsWakeModuleV1()?.wrapClaudeDocsCreateWake(tool);
      if (Fe && config.config.type !== "sdk") {
        let _e = tool.call;
        tool.call = async (ee, P, x, D, z, ie) => {
          let ue = policyDeniedReason("allow_claude_browser_extension", "Claude in Chrome", "is");
          if (ue !== null)
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              ue,
              "Claude in Chrome call refused by org policy",
            );
          return _e(ee, P, x, D, z, ie);
        };
      }
      let ot = tool.call;
      tool.call = async (_e, ee, P, x, D, z) => {
        ee.options.activeMcpServer = config.name;
        ee.options.activeMcpTool = B.name;
        if (config.config.pluginSource) {
          recordPluginUsage(config.config.pluginSource);
          recordPluginActivity(config.config.pluginSource, "mcp", {
            kind: "mcp-server",
            name: config.name,
          });
        }
        let ie = be();
        if (ie) markMcpServerLoggable(config.name);
        let ue =
          (isTaskWriteMethod(B.name) &&
            findPendingTaskFilesForArgs(ee.session, ee.toolUseId, _e?.files) !== undefined) ||
          (B._meta?.[ANTHROPIC_FILEINPUTS] !== undefined
            ? (await import("./chunk-bk2cbdc2.js")).hasFileGrants(ee.session, ee.toolUseId)
            : false);
        return ot(
          ue
            ? _e
            : stripTrailingInvokeSuffix(
                _e,
                B.name,
                config.name,
                ie,
                getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_strip_trailing_xml_tags", false),
                M,
              ),
          ee,
          P,
          x,
          D,
          z,
        );
      };
      return tool;
    })
  ).filter(isIdeServer_2);
  let mapped = L.map((B) => (Le?.tools?.[B.name] ?? B.description ?? "").length);
  let reduced = mapped.reduce((acc, te) => acc + te, 0);
  logEvent("tengu_mcp_tools_listed", {
    transportType: fromEnum(config.config.type ?? "stdio"),
    listDurationMs: Date.now() - n,
    toolCount: filtered.length,
    alwaysLoadCount: count(filtered, (B) => B.alwaysLoad === true),
    descriptionTotalLength: reduced,
    descriptionMaxLength: mapped.reduce((acc, te) => Math.max(acc, te), 0),
    descriptionMeanLength: mapped.length ? Math.round(reduced / mapped.length) : 0,
    descriptionOverLimitCount: count(mapped, (B) => B > W),
    discoverySource: fromEnum(s),
    ...w,
    mcpServerName: mcpNameForAnalytics_GATE_EVALUATED(
      normalizeNameForMCP(config.name),
      isMcpServerLoggableInAnalytics(config.name, config.config),
    ),
  });
  if (s === "live") logFeatureOk("mcp_list_tools");
  if (isStdioConfig(config.config) && isClaudeInChromeMCPServer(config.name))
    logChromeToolsAdded(filtered.length, s);
  if (isToolboxServer(config)) {
    let { addTaskFileSaves } = await import("./chunk-h33h7b0z.js");
    addTaskFileSaves(filtered, {
      client: config,
      listed: De,
      compose: (listed, call, overrides, effectiveMaxPermission) =>
        buildMcpTool({
          ...He,
          accountMemoryServer: xe,
          effectiveMaxPermission,
          listed,
          call,
          overrides,
        }),
    });
  }
  return filtered;
}
//@ chunk-z1n5m6nf.js:117269-119068 placement
var listMcpTools = memoizeWithLRU(
  async (e, r, n) => {
    if (e.type !== "connected") return [];
    let s = identityEpoch();
    let h = beginDroppedToolsRoundV1(e);
    try {
      if (!e.capabilities?.tools) {
        let w = [];
        recordRawToolsForResult(w, []);
        return w;
      }
      let now = Date.now();
      let S = await listAllPages(
        identityId2(e.client),
        e.name,
        e.config,
        "tools/list",
        ListToolsResultSchema,
        (w) => w.tools,
      );
      e.toolsListError = undefined;
      e.discoveryAuthFailure = undefined;
      if (n === true) {
        let w = [];
        recordRawToolsForResult(w, S);
        return w;
      }
      let T = listToolsWithMemo(e, S, s, h, () => ({
        normalizeEnabled: shouldNormalizeRootCombinators_2(e.config),
        apiValidateEnabled: shouldDropInvalidToolSchemas_2(e.config),
      }));
      if (T?.reuse !== undefined) {
        recordRawToolsForResult(T.reuse, S);
        return T.reuse;
      }
      let mcpTools = await fetchMcpTools(e, S, now, "live", h);
      if (h.seq === h.state.started) {
        e.toolsListError = undefined;
        e.discoveryAuthFailure = undefined;
      }
      recordRawToolsForResult(mcpTools, S);
      settleToolListingMemo(e, T, mcpTools, h);
      return mcpTools;
    } catch (error) {
      let S = redactMcpErrorDetail(e.name, e.config, describeConnectError(error, e.config));
      if (e.config.type === "claudeai-proxy" && isListAuthError_2(error)) {
        logEvent("tengu_mcp_server_needs_auth", {
          transportType: lit("claudeai-proxy"),
          cause: lit("discovery_tools_list"),
          ...mcpBaseUrlAnalytics(e.config, e.name),
        });
        if (isCurrentIdentityEpoch(s)) isMcpAuthCached_3(e.name, e.config.id, undefined, r);
        logFeatureSad("mcp_list_tools", "mcp_list_tools_needs_auth");
        logMCPDebug(e.name, "tools/list 401/403 on claude.ai proxy \u2014 flagging needs-auth");
        e.discoveryAuthFailure = true;
        getConnectionCache().toolLists.delete(serverCacheKey(e.name, e.config));
        return [];
      }
      if (isListAuthError_2(error) && hasLapsedCcrSignIn(e.name, e.config)) e.discoveryAuthFailure = true;
      let T = e.config.type === "claudeai-proxy" && isClaudeAiBearerRejectedError_2(error);
      let M = T
        ? "mcp_list_tools_claudeai_bearer_rejected"
        : error instanceof McpError
          ? `mcp_list_tools_${LIST_FAILURE_REASONS_V1[error.code] ?? "mcperr_other"}`
          : S.includes("timed out")
            ? "mcp_list_tools_timeout"
            : "mcp_list_tools_failed";
      logFeatureSad("mcp_list_tools", M);
      (T ? logMCPDebug : logMCPError)(e.name, `Failed to fetch tools: ${S}`);
      e.toolsListError = S;
      if (T) e.discoveryBearerRejected = true;
      let R = [];
      getCliOwnedState().toolsListErrorByResult.set(R, S);
      if (!T) {
        let E = mcpBaseUrlAnalytics(e.config, e.name);
        logEvent("tengu_mcp_degraded", {
          reason: lit("tools_list_failed"),
          transportType: fromEnum(e.config.type ?? "stdio"),
          ...E,
          mcpServerName: mcpNameForAnalytics_GATE_EVALUATED(
            normalizeNameForMCP(e.name),
            isMcpServerLoggableInAnalytics(e.name, e.config),
          ),
        });
      }
      getConnectionCache().toolLists.delete(serverCacheKey(e.name, e.config));
      return R;
    }
  },
  (e) => serverCacheKey(e.name, e.config),
  () => getConnectionCache().toolLists,
);
//@ chunk-z1n5m6nf.js:119068-119612 placement
/**
 * 记录 MCP 列表请求（资源/命令）失败：区分需要认证、claude.ai bearer 被拒、MCP 错误码、超时与一般失败，报告结果码；非认证类失败还记 tengu_mcp_degraded。
 */
function reportListFailure_2(connection, error, listKind, setOutcome, degradedReason, what) {
  let errorText = describeConnectError(error, connection.config);
  let needsAuth = connection.config.type === "claudeai-proxy" && isListAuthError_2(error);
  let bearerRejected = connection.config.type === "claudeai-proxy" && isClaudeAiBearerRejectedError_2(error);
  if (bearerRejected) connection.discoveryBearerRejected = true;
  let w = needsAuth
    ? `${listKind}_needs_auth`
    : bearerRejected
      ? `${listKind}_claudeai_bearer_rejected`
      : error instanceof McpError
        ? `${listKind}_${LIST_FAILURE_REASONS_V1[error.code] ?? "mcperr_other"}`
        : errorText.includes("timed out")
          ? `${listKind}_timeout`
          : `${listKind}_failed`;
  setOutcome(w);
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
        normalizeNameForMCP(connection.name),
        isMcpServerLoggableInAnalytics(connection.name, connection.config),
      ),
    });
}
//@ chunk-z1n5m6nf.js:119612-120851 placement
var fetchResourcesForClient_2 = memoizeWithLRU(
  async (connection) => {
    if (connection.type !== "connected") return [];
    try {
      if (!connection.capabilities?.resources) {
        let s = [];
        recordRawResourcesForResult_2(s, []);
        return s;
      }
      let r = await listAllPages(
        identityId2(connection.client),
        connection.name,
        connection.config,
        "resources/list",
        ListResourcesResultSchema,
        (s) => s.resources,
      );
      logFeatureOk("mcp_list_resources");
      let mapped = r.map((s) => ({
        ...s,
        server: connection.name,
      }));
      recordRawResourcesForResult_2(mapped, r);
      return mapped;
    } catch (error) {
      reportListFailure_2(
        connection,
        error,
        "mcp_list_resources",
        (s) => logFeatureSad("mcp_list_resources", s),
        lit("resources_list_failed"),
        "resources",
      );
      getConnectionCache().resourceLists.delete(serverCacheKey(connection.name, connection.config));
      let n = [];
      if (error instanceof McpError && error.code === ErrorCode.MethodNotFound)
        recordRawResourcesForResult_2(n, []);
      else getCliOwnedState().discoveryFetchErrors.set(n, toError(error));
      return n;
    }
  },
  (e) => serverCacheKey(e.name, e.config),
  () => getConnectionCache().resourceLists,
);
var fetchResourceTemplatesForClient_2 = memoizeWithLRU(
  async (e) => {
    if (e.type !== "connected") return [];
    try {
      if (!e.capabilities?.resources) return [];
      let r = await listAllPages(
        identityId2(e.client),
        e.name,
        e.config,
        "resources/templates/list",
        ListResourceTemplatesResultSchema,
        (n) => n.resourceTemplates,
      );
      logEvent("tengu_mcp_resource_templates_fetched", {
        template_count: r.length,
      });
      logFeatureOk("mcp_list_resource_templates");
      return r.map((n) => ({
        ...n,
        server: e.name,
      }));
    } catch (error) {
      getConnectionCache().resourceTemplateLists.delete(serverCacheKey(e.name, e.config));
      logMCPDebug(e.name, `Failed to fetch resource templates: ${describeConnectError(error, e.config)}`);
      let n = [];
      if (!(error instanceof McpError && error.code === ErrorCode.MethodNotFound))
        getCliOwnedState().discoveryFetchErrors.set(n, toError(error));
      return n;
    }
  },
  (e) => serverCacheKey(e.name, e.config),
  () => getConnectionCache().resourceTemplateLists,
);
//@ chunk-z1n5m6nf.js:120851-121022 placement
function fetchResourceTemplatesForClients(e, r) {
  let n = [];
  for (let s of e) {
    if (s.type !== "connected") continue;
    if (s.name in r) continue;
    n.push(
      fetchResourceTemplatesForClient_2(s).then((templates) => ({
        client: s,
        templates,
      })),
    );
  }
  return Promise.all(n);
}
//@ chunk-z1n5m6nf.js:121022-121472 placement
async function completeResourceTemplateArgument(e, uri, name, value, h) {
  if (!e.capabilities?.completions) return [];
  try {
    let y = await identityId2(e.client).complete({
      ref: {
        type: "ref/resource",
        uri,
      },
      argument: {
        name,
        value,
      },
      context:
        Object.keys(h).length > 0
          ? {
              arguments: h,
            }
          : undefined,
    });
    logFeatureOk("mcp_complete_resource_template");
    return y.completion.values;
  } catch (error) {
    logFeatureBad("mcp_complete_resource_template", "mcp_complete_resource_template_failed");
    logMCPDebug(e.name, `Failed to complete resource template: ${describeConnectError(error, e.config)}`);
    return [];
  }
}
//@ chunk-z1n5m6nf.js:121472-122033 placement
var fetchCommandsForClient_2 = memoizeWithLRU(
  async (connection) => {
    if (connection.type !== "connected") return [];
    try {
      if (!connection.capabilities?.prompts) {
        let s = [];
        recordRawCommandsForResult(s, []);
        return s;
      }
      let r = await listAllPages(
        identityId2(connection.client),
        connection.name,
        connection.config,
        "prompts/list",
        ListPromptsResultSchema,
        (s) => s.prompts,
      );
      logFeatureOk("mcp_list_prompts");
      let mcpPromptCommands = buildMcpPromptCommands_2(connection, r);
      recordRawCommandsForResult(mcpPromptCommands, r);
      return mcpPromptCommands;
    } catch (error) {
      reportListFailure_2(
        connection,
        error,
        "mcp_list_prompts",
        (s) => logFeatureSad("mcp_list_prompts", s),
        lit("prompts_list_failed"),
        "commands",
      );
      getConnectionCache().commandLists.delete(serverCacheKey(connection.name, connection.config));
      let n = [];
      if (error instanceof McpError && error.code === ErrorCode.MethodNotFound)
        recordRawCommandsForResult(n, []);
      else getCliOwnedState().discoveryFetchErrors.set(n, toError(error));
      return n;
    }
  },
  (e) => serverCacheKey(e.name, e.config),
  () => getConnectionCache().commandLists,
);
//@ chunk-z1n5m6nf.js:122033-123802 placement
/**
 * 动态生成的 prompt 命令对象（name="mcp__"+Sn(e.name)+"__"+w.name）；描述：Q??""；别名 S?[`${e.name}:${w.name}`,`${e.name}:${w.name} (MCP)`]:void 0；isEnabled: ()=>!0；isHidden: false。
 */
function buildMcpPromptCommands_2(e, r) {
  let streamingListingSanitizer = createStreamingListingSanitizer();
  let flattened = r.flatMap((w) => streamingListingSanitizer(w) ?? []);
  let h = r.length - flattened.length;
  if (h > 0) logMCPError(e.name, listingTruncatedNote("prompts", h, r.length));
  let config = e.config;
  let S = (config.type === "http" || config.type === "sse") && isDesignMcpUrl(config.url);
  let T = officialPluginPromptOverrides(e.config);
  let commands = flattened.map((w) => {
    let values = Object.values(w.arguments ?? {});
    let mapped = values.map((H) => H.name);
    let Q = T?.prompts?.[w.name] ?? w.description;
    return {
      type: "prompt",
      name: "mcp__" + normalizeNameForMCP(e.name) + "__" + w.name,
      description: Q ?? "",
      hasUserSpecifiedDescription: !!Q,
      contentLength: 0,
      isEnabled: () => true,
      isHidden: false,
      isMcp: true,
      mcpInfo: getMcpInfoFromConnection(e),
      progressMessage: "running",
      userFacingName() {
        return S ? w.name : `${e.name}:${w.name} (MCP)`;
      },
      aliases: S ? [`${e.name}:${w.name}`, `${e.name}:${w.name} (MCP)`] : undefined,
      argNames: mapped,
      source: "mcp",
      async getPromptForCommand(args, context) {
        let trimmed = args.trim();
        let he = trimmed ? trimmed.split(/\s+/) : [];
        let G = hostedDesktopRefusal_2(e);
        if (G) throw G;
        try {
          let mapped_2 = values.filter((ce, le) => ce.required && he[le] === undefined).map((ce) => ce.name);
          if (mapped_2.length > 0)
            throw Error(
              `Missing required ${plural(mapped_2.length, "argument")}: ${mapped_2.join(", ")}. Usage: /mcp__${normalizeNameForMCP(e.name)}__${w.name} ${mapped.join(" ")}`,
            );
          let mcpServer = await connectMcpServer(e, {
            signal: context.abortController.signal,
            context: "MCP prompt command",
          });
          let prompt = await identityId2(mcpServer.client).getPrompt({
            name: w.name,
            arguments: zipOperationFields(mapped, he),
          });
          let imageBuffer = imageLimitsForModel(context.options.mainLoopModel);
          let results = await Promise.all(
            prompt.messages.map((message) =>
              transformResultContent_2(message.content, mcpServer.name, imageBuffer, context.storageV5),
            ),
          );
          logFeatureOk("mcp_get_prompt");
          recordToolUsed(buildMcpToolName(e.name, w.name));
          return results.flat();
        } catch (error) {
          if (!isAbortError(error))
            if (e.config.type === "claudeai-proxy" && isClaudeAiBearerRejectedError_2(error)) {
              logFeatureSad("mcp_get_prompt", "mcp_get_prompt_claudeai_bearer_rejected");
              logMCPDebug(
                e.name,
                `Error running command '${w.name}': ${describeConnectError(error, e.config)}`,
              );
            } else {
              logFeatureBad("mcp_get_prompt", "mcp_get_prompt_failed");
              logMCPError(
                e.name,
                `Error running command '${w.name}': ${describeConnectError(error, e.config)}`,
              );
            }
          throw error;
        }
      },
    };
  });
  return checkCommandListable(commands, (w) =>
    logMCPDebug(
      e.name,
      `Prompt '${w.name}' not listed: the server name ${RESERVED_SKILL_NAMESPACE_REASON}. Rename the server in your MCP configuration to list its prompts.`,
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
};
