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
import { oa } from "../../types/ids.js";
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
  Er,
  detachAndCloseConnection_2,
  So_2,
  recordCachedDialFailureV1,
  isLegacyProtocolEra,
  Po,
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
  ir,
  Yz,
  vF,
  truncateDescription_2,
  mapInTurns,
  ET,
  mcpBaseUrlAnalytics,
  shouldNormalizeRootCombinators_2,
  shouldDropInvalidToolSchemas_2,
  isIncludedMcpTool_3,
  logToolCallXmlInDescriptions,
  ln,
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
import { fW, getConnectionCache, memoizeWithLRU, yBt } from "./needsAuthCache.js";
import { fd, isUnresolved } from "./mcpAccountKey.js";
import { normalizeMcpServerName } from "../api/deferredToolsState.js";
import { rY, CCR_NEEDS_APPROVAL_CODE } from "./mcpResultErrors.js";
import { ht, Zl } from "./cliOwnedClients.js";
import {
  lit,
  fromNumber,
  fromEnum,
  fromEnumOpt,
  mcpNameForAnalytics_GATE_EVALUATED,
} from "../analytics/safeMetadata.js";
import { oIt } from "../api/errorUtils.js";
import { hasChannelCapability } from "./channelNotification.js";
import { writeDiscoveryCache, mergeDiscoveryTools, isDiscoveryCacheEligible, cZe } from "./discoveryCache.js";
import { logMCPDebug, logMCPError } from "../../utils/log.js";
import { buildMcpToolName } from "./mcpStringUtils.js";
import { toolUiMeta, describeHiddenMcpTool } from "./toolNameLimits.js";
import { qq, gH } from "./claudeai.js";
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
import { Tle } from "../../constants/outputLimits.js";
import {
  addComputerUseActionSummary,
  addActionSummaryToSchema,
} from "../../utils/permissions/actionSummary.js";
import {
  applyParamDescriptionOverrides,
  officialPluginPromptOverrides,
} from "./officialPluginPromptOverrides.js";
import { SZe } from "./firstPartyDesignConsent.js";
import { DesignGateState } from "./designPlanGate.js";
import { REMOTE_BROWSER_SERVER_NAME } from "./remoteBrowserServer.js";
import { isRemoteBrowserModeFloorOn } from "../../utils/permissions/remoteBrowser.js";
import {
  filterRemoteRepoTools,
  isMcpServerLoggableInAnalytics,
  isRunnerDynamicServer,
  isOwnCcrMcpServer,
  nxn,
  Cgr,
} from "../analytics/metadata.js";
import {
  createStreamingListingSanitizer,
  listingTruncatedNote,
} from "../../tools/WebFetchTool/sanitizeListing.js";
import { normalizeNameForMCP } from "./normalization.js";
import { env } from "../../utils/env.js";
import { l6n } from "./blockedServers.js";
import { logForDebugging } from "../../utils/debug.js";
import { judgeToolSchemaSendability } from "./toolSchemaSendability.js";
import { joinDescription } from "../../remote/tools/inputSchemaFlatten.js";
import { Ji } from "../../../vendor/lodash-es/uniqBy.js";
import { TB } from "./mcpTimeouts.js";
import { buildPluginEventFieldsFromId, recordPluginUsage } from "../../utils/telemetry/pluginTelemetry.js";
import { af } from "../../utils/plugins/pluginPolicy.js";
import { CLAUDE_ARTIFACTS } from "./firstPartyServerIds.js";
import {
  $Pt,
  isMemoryToolServer,
  isMemoryServerConnection,
  isAccountMemoryServer,
  raiseMemoryErrorCap,
} from "../../memdir/memoryTool.js";
import { Sdn, isDocsConnectorServer } from "../../tools/ArtifactTool/docsConnector.js";
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
import { k4n, createSlackSendToolUi } from "../../tools/MCPTool/slackSend.js";
import { u8n } from "../../plugins/bundled/claudeTest/constants.js";
import { claudeTestWriteToolOverrides } from "./claudeTestWriteTool.js";
import { getFirstToolUseId_2 } from "./sdkManifest.js";
import { mYn, gYn } from "../../bridge/bridgePermissionCallbacks.js";
import { consumeMcpApprovalTicket } from "../../bridge/mcpApprovalTickets.js";
import { tor } from "./resultContent.js";
import { isHearthbotRelayServer } from "../projectsRelay/relayConfig.js";
import { ccrTurnEventHeaders } from "../../utils/telemetry/ccrTraceContext.js";
import { Rnr } from "../../utils/telemetry/sessionTracing.js";
import { agentRequestMeta } from "./agentRequestMeta.js";
import { getPermissionPromptToolName } from "../../bootstrap/state.js";
import { parkOnUser } from "../../utils/sessionActivity.js";
import { issuerKey_3 } from "./xaaIdpLogin.js";
import { imageLimitsForModel } from "../../utils/attachmentMedia.js";
import { getBackgroundAgentId } from "../../utils/agentContext.js";
import { isSameOriginAsCcr } from "./ccrMcpUrls.js";
import { INTERRUPTED_CALL_NOTICE } from "./mcpCallConstants.js";
import { logPrCreateOperation, Yqn } from "../../utils/git/gitOperationTelemetry.js";
import { chromeNoBrowserAnswer } from "../../utils/claudeInChrome/chromePermissionRules.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../analytics/featureTelemetry.js";
import { stripAnthropicMeta } from "./anthropicMeta.js";
import { noteHearthDegraded } from "./hearthDegraded.js";
import { describeConnectError, isDesignMcpUrl } from "./auth.js";
import {
  z9,
  GET_TASK,
  UBt,
  FBt,
  findPendingTaskFilesForArgs,
  discardTaskFiles,
  NBt,
  yZe,
  $Bt,
  cYn,
  isToolboxMcpServer,
} from "./agentTaskFiles.js";
import { lt } from "./transportGuards.js";
import { u2 } from "../../tasks/taskLoopRegistry.js";
import { isLiveMemoryTool } from "./memoryServerVerification.js";
import { Q_e } from "../tools/detachedToolCalls.js";
import { I3n } from "../../plugins/functionHooks/inputHold.js";
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
import { hostedDesktopRefusal } from "./mcpWireUtils.js";
import { plural } from "../../utils/stringUtils.js";
import { Uv } from "../compact/keptTools.js";
import { checkCommandListable } from "../../utils/commandPredicates.js";
import { RESERVED_SKILL_NAMESPACE_REASON } from "../../skills/reservedSkillNames.js";

//@ chunk-z1n5m6nf.js:88192-88259 placement
function Yl(e, r) {
  oa(e.client).setNotificationHandler(ToolListChangedNotificationSchema, createListChangedRefetcher(e, r));
}
//@ chunk-z1n5m6nf.js:88259-88326 placement
function Jl(e, r) {
  oa(e.client).setNotificationHandler(PromptListChangedNotificationSchema, createListChangedRefetcher(e, r));
}
//@ chunk-z1n5m6nf.js:88326-88393 placement
function Xl(e, r) {
  oa(e.client).setNotificationHandler(
    ResourceListChangedNotificationSchema,
    createListChangedRefetcher(e, r),
  );
}
//@ chunk-z1n5m6nf.js:88393-88453 placement
function Ql(e, r, n) {
  oa(e.client).setNotificationHandler(r, n);
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
  if (isMcpServerDisabled(e.name) && (await Er(e.name, e.config))?.type !== "connected") {
    if (e.type === "cached") refuseCachedRowV1(e.name, e.config, "disabled");
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `MCP server "${e.name}" is disabled \u2014 re-enable it via /mcp to use its tools`,
      "MCP server disabled",
    );
  }
  let n = identityEpoch(),
    s =
      e.type === "cached" && r?.toolUseId !== void 0 && TOOL_USE_ID_PATTERN.test(r.toolUseId)
        ? { toolUseId: r.toolUseId, withListings: r.toolUseIdWithListingsUntil !== void 0 }
        : void 0,
    h =
      s === void 0
        ? connectToServer_2(e.name, e.config)
        : connectToServer_2(e.name, e.config, void 0, void 0, void 0, s);
  if (s !== void 0) {
    let S = () => {
      s.toolUseId = void 0;
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
          fW.dialNeedsAuth(e.name),
          "MCP server needs authentication",
        ),
        { mcpErrorSource: "user_auth" },
      );
    let S = y.type === "failed" ? y.errorCode : void 0;
    throw Object.assign(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        fW.dialNotConnected(
          e.name,
          fd() && y.type === "failed" && y.error ? `: ${normalizeMcpServerName(y.error)}` : "",
        ),
        "MCP server not connected",
      ),
      {
        mcpErrorSource: rY(
          Object.assign(Error("MCP dial failed"), {
            code: S !== void 0 && /^-?\d+$/.test(S) ? Number(S) : S,
          }),
        ),
        mcpDialCode: S,
      },
    );
  }
  if (isWithdrawnBuiltinPluginServer(e.name, e.config))
    throw (await detachAndCloseConnection_2(y), withdrawnBuiltinPluginServerError(e.name));
  return y;
}
//@ chunk-z1n5m6nf.js:90098-90178 placement
function gt(e, r, n) {
  let cache = connectToServer_2.cache;
  if (!cache?.get) return !1;
  return cache.get(ir(r, n)) !== e;
}
//@ chunk-z1n5m6nf.js:90178-90228 placement
function tt(e) {
  return ht().supersededDials.has(e);
}
/**
 * 缓存首次拨号结束后的处理（v1 副本）：身份变化或被取代时关闭，成功或需认证时记录，失败时删除记忆并上报。
 */
//@ chunk-z1n5m6nf.js:90228-90634 placement
function runCachedFirstDialArms(e, r, n) {
  let cachedFirstDialArmsRan = ht().cachedFirstDialArmsRan;
  if (cachedFirstDialArmsRan.has(e)) return;
  cachedFirstDialArmsRan.add(e);
  let h = ir(e.name, e.config),
    y = getConnectionCache().connections.get(h),
    S = identityEpoch() !== n,
    T = y === void 0 && S;
  if (tt(r) || (y !== void 0 && y !== r) || T) {
    if (!tt(r) && S && e.type === "connected") detachAndCloseConnection_2(e);
    return;
  }
  if (e.type === "connected" || e.type === "needs-auth") {
    So_2(e.name, e.config);
    return;
  }
  if ((getConnectionCache().connections.delete(h), e.type === "failed"))
    recordCachedDialFailureV1(e, !ht().swrRefreshDialsInFlight.has(r));
}
//@ chunk-z1n5m6nf.js:90634-90672 placement
function eu(e, r) {
  return Yz(e) === Yz(r);
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
/**
 * 把连接错误码收敛为可上报值（v1 副本）。
 */
//@ chunk-z1n5m6nf.js:91740-91909 placement
function sanitizeConnectErrorCodeForTelemetry_2(e) {
  if (e === void 0) return lit("missing");
  if (/^-?\d+$/.test(e)) return fromNumber(Number(e));
  let found = OAUTH_ERROR_CODES.find((n) => n === e);
  if (found !== void 0) return fromEnum(found);
  return oIt(e) ?? lit("other");
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
/**
 * 把 MCP 工具输入转换为自动模式分类器的输入文本（v1 副本）。
 */
//@ chunk-z1n5m6nf.js:92203-92386 placement
function mcpToolInputToAutoClassifierInput(e, r) {
  let keys = Object.keys(e);
  if (keys.length === 0) return r;
  return keys
    .map((s) => {
      let h = e[s],
        y = typeof h === "object" && h !== null ? JSON.stringify(h) : String(h);
      return `${s}=${y}`;
    })
    .join(" ");
}
//@ chunk-z1n5m6nf.js:92386-92529 placement
function beginDroppedToolsRoundV1(e) {
  let droppedToolsSeqByConnection = ht().droppedToolsSeqByConnection,
    n = droppedToolsSeqByConnection.get(e) ?? { started: 0, applied: 0 };
  return (droppedToolsSeqByConnection.set(e, n), (n.started += 1), { seq: n.started, state: n });
}
//@ chunk-z1n5m6nf.js:92529-92586 placement
function tu(e) {
  return ht().toolsListErrorByResult.get(e);
}
//@ chunk-z1n5m6nf.js:92586-92641 placement
function To(e) {
  return ht().discoveryFetchErrors.get(e);
}
//@ chunk-z1n5m6nf.js:92641-92701 placement
function Rr() {
  isLegacyProtocolEra();
  let e = getMcpIdentitySnapshot();
  return isUnresolved(e) ? void 0 : e.token;
}
/**
 * 首次时记录 MCP 身份基线（v1 副本）。
 */
//@ chunk-z1n5m6nf.js:92701-92833 placement
function seedMcpIdentityCheck() {
  let e = ht();
  if (e.identitySeedAttempted) return;
  e.identitySeedAttempted = !0;
  let r = Rr();
  if (r !== void 0) e.identityBaseline = r;
}
/**
 * 判断 MCP 身份自上次检查以来是否变化并更新基线（v1 副本）。
 */
//@ chunk-z1n5m6nf.js:92833-93043 placement
function mcpIdentityChangedSinceLastCheck() {
  let e = Rr(),
    r = ht();
  if (e === void 0) return ((r.identityBaseline = void 0), !0);
  if (r.identityBaseline === void 0) return ((r.identityBaseline = e), !0);
  if (r.identityBaseline === e) return !1;
  return ((r.identityBaseline = e), !0);
}
/**
 * 记录原始工具列表与拉取时间（v1 副本）。
 */
//@ chunk-z1n5m6nf.js:93043-93156 placement
function recordRawToolsForResult(e, r) {
  if (!fd()) return;
  let n = ht();
  (n.rawToolsByResult.set(e, r), n.rawFetchedAtByResult.set(e, Date.now()));
}
/**
 * 记录原始命令列表与拉取时间（v1 副本）。
 */
//@ chunk-z1n5m6nf.js:93156-93272 placement
function recordRawCommandsForResult(e, r) {
  if (!fd()) return;
  let n = ht();
  (n.rawCommandsByResult.set(e, r), n.rawFetchedAtByResult.set(e, Date.now()));
}
/**
 * 记录原始资源列表与拉取时间（v1 副本）。
 */
//@ chunk-z1n5m6nf.js:93272-93389 placement
function recordRawResourcesForResult_2(e, r) {
  if (!fd()) return;
  let n = ht();
  (n.rawResourcesByResult.set(e, r), n.rawFetchedAtByResult.set(e, Date.now()));
}
//@ chunk-z1n5m6nf.js:93389-93441 placement
function nu(e, r) {
  ht().discoveryFetchErrors.set(e, r);
}
/**
 * 发现缓存命中但服务器具备频道能力时改为未命中（v1 副本）。
 */
//@ chunk-z1n5m6nf.js:93441-93594 placement
function applyCapabilityServeTimeMiss_2(e) {
  if (e.kind !== "fresh" && e.kind !== "stale") return e;
  let capabilities = e.entry.capabilities;
  if (hasChannelCapability(capabilities)) return { kind: "miss", reason: "channel-capable" };
  return e;
}
//@ chunk-z1n5m6nf.js:93594-95181 placement
async function persistDiscovery(e, r) {
  isLegacyProtocolEra();
  let n = ht();
  if (n.persistedDiscoveryRounds.has(r.tools)) return !0;
  if (!isCurrentIdentityEpoch(r.identityEpoch)) return !0;
  let s = n.rawToolsByResult.get(r.tools),
    h = n.rawCommandsByResult.get(r.commands),
    y = n.rawResourcesByResult.get(r.resources);
  if (s === void 0 || h === void 0 || y === void 0 || r.templates === void 0) return !1;
  let min = Math.min(
    n.rawFetchedAtByResult.get(r.tools) ?? Number.POSITIVE_INFINITY,
    n.rawFetchedAtByResult.get(r.commands) ?? Number.POSITIVE_INFINITY,
    n.rawFetchedAtByResult.get(r.resources) ?? Number.POSITIVE_INFINITY,
  );
  if (!Number.isFinite(min)) return !0;
  let T = min,
    mapped = [r.tools, r.commands, r.resources].map((R) => [R, n.rawFetchedAtByResult.get(R)]);
  (n.rawToolsByResult.delete(r.tools),
    n.rawCommandsByResult.delete(r.commands),
    n.rawResourcesByResult.delete(r.resources),
    n.rawFetchedAtByResult.delete(r.tools),
    n.rawFetchedAtByResult.delete(r.commands),
    n.rawFetchedAtByResult.delete(r.resources),
    n.persistedDiscoveryRounds.add(r.tools));
  let w = await writeDiscoveryCache(
    e.name,
    e.config,
    {
      ...(e.serverInfo && { serverInfo: { name: e.serverInfo.name, version: e.serverInfo.version } }),
      ...(e.protocolEra !== void 0 && { negotiatedEra: e.protocolEra }),
      capabilities: e.capabilities,
      tools: s,
      commands: h,
      resources: y,
      templates: r.templates.map(({ server: server, ...E }) => E),
    },
    { identityEpoch: r.identityEpoch, grantLeg: r.grantLeg, now: T },
  );
  if (w === "terminal") return (n.persistedDiscoveryRounds.delete(r.tools), !1);
  if (w === "transient") {
    (n.rawToolsByResult.set(r.tools, s),
      n.rawCommandsByResult.set(r.commands, h),
      n.rawResourcesByResult.set(r.resources, y));
    for (let [R, E] of mapped) if (E !== void 0) n.rawFetchedAtByResult.set(R, E);
    n.persistedDiscoveryRounds.delete(r.tools);
  }
  return !0;
}
/**
 * 身份未变化时把刷新得到的工具列表合并写入发现缓存（v1 副本）。
 */
//@ chunk-z1n5m6nf.js:95181-95439 placement
async function persistRefreshedToolsIfPresent(e, r, n) {
  if ((isLegacyProtocolEra(), !isCurrentIdentityEpoch(n.identityEpoch))) return;
  let s = ht(),
    h = s.rawToolsByResult.get(r),
    y = s.rawFetchedAtByResult.get(r);
  if (h === void 0 || y === void 0) return;
  await mergeDiscoveryTools(e.name, e.config, h, {
    identityEpoch: n.identityEpoch,
    grantLeg: n.grantLeg,
    fetchedAt: y,
  });
}
/**
 * 把实时连接得到的列表写入发现缓存（v1 副本）。
 */
//@ chunk-z1n5m6nf.js:95439-95824 placement
async function persistLiveListing_2(e, r) {
  if (
    !fd() ||
    !isDiscoveryCacheEligible(e.config) ||
    isMcpServerDisabled(e.name) ||
    isMcpServerBlockedAtConnectTime(e.name, e.config)
  )
    return;
  try {
    let n = !!e.capabilities?.resources;
    if (!n) recordRawResourcesForResult_2(r.resources, []);
    let s = n && cZe(e.config) ? await fetchResourceTemplatesForClient_2(e) : [];
    if (
      (await Er(e.name, e.config)) !== e ||
      isMcpServerDisabled(e.name) ||
      isMcpServerBlockedAtConnectTime(e.name, e.config)
    )
      return;
    await persistDiscovery(e, { ...r, templates: To(s) === void 0 ? s : void 0 });
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
      return !0;
    case "disabled":
    case "key-unavailable":
    case "transport":
    case "live-connection":
    case "skills-capable":
    case "channel-capable":
      return !1;
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
  return typeof r === "number" && Number.isFinite(r) && r > 0 ? r : void 0;
}
/**
 * 把单个 MCP 工具定义包装成 Claude Code 工具：计算工具全名、权限键、延迟加载、描述截断、显示名/图标、账号记忆与首方设计服务器等标记。
 */
//@ chunk-z1n5m6nf.js:96768-101063 placement
function buildMcpTool({
  serverName: serverName,
  scope: scope,
  pluginSource: pluginSource,
  serverType: serverType,
  source: source,
  skipPrefix: skipPrefix,
  standardKey: standardKey,
  denyKey: denyKey,
  legacyGrantRefused: legacyGrantRefused = !1,
  legacyGrantRebindable: legacyGrantRebindable = !1,
  serverAlwaysLoad: serverAlwaysLoad,
  serverDefersAllTools: serverDefersAllTools = !1,
  effectiveMaxPermission: effectiveMaxPermission,
  promptOverrides: promptOverrides,
  isFirstPartyDesignServer: isFirstPartyDesignServer,
  maxDescriptionLength: maxDescriptionLength = vF(),
  maxLoadedDescriptionLength: maxLoadedDescriptionLength = vF(!0),
  pluginTelemetry: pluginTelemetry,
  cliOwned: cliOwned,
  accountMemory: accountMemory = !1,
  accountMemoryServer: accountMemoryServer = !1,
  sdkDocsConnector: sdkDocsConnector = !1,
  displayName: displayName,
  serverId: serverId,
  serverIdStamp: serverIdStamp,
  iconUrl: iconUrl,
  serverInfoName: serverInfoName,
  role: role,
  listed: listed,
  call: ze,
  overrides: overrides,
}) {
  let Le = buildMcpToolName(serverName, listed.name),
    Z = getMaxResultSizeCharsMeta(listed),
    Ne = Z !== void 0,
    Te = listed._meta?.["anthropic/requiresUserInteraction"] === !0,
    we = toolUiMeta(listed._meta),
    Oe = promptOverrides?.tools?.[listed.name] ?? listed.description ?? "",
    De = truncateDescription_2(Oe, `Tool "${listed.name}" description`, serverName, maxDescriptionLength),
    xe = truncateDescription_2(
      Oe,
      `Tool "${listed.name}" description`,
      serverName,
      maxLoadedDescriptionLength,
    ),
    He =
      promptOverrides?.search_hints?.[listed.name] ??
      (typeof listed._meta?.["anthropic/searchHint"] === "string"
        ? listed._meta["anthropic/searchHint"]
        : void 0),
    Fe = withOverlapSlots(serverName, listed.name, ze),
    Ue = qq(serverName, { scope: scope, pluginSource: pluginSource }),
    Ie = Ue || legacyGrantRefused,
    ve =
      legacyGrantRefused &&
      legacyGrantRebindable &&
      !Te &&
      effectiveMaxPermission !== "ask" &&
      overrides?.suppressesAlwaysAllowRule === void 0 &&
      overrides?.requiresUserInteraction === void 0 &&
      !isDesignGatedTool(isFirstPartyDesignServer, listed.name),
    Ee = Ie || isDesignGatedTool(isFirstPartyDesignServer, listed.name),
    B = () =>
      Ue ||
      (legacyGrantRefused &&
        !ownsLegacyKey({ serverName: serverName, serverType: serverType, serverId: serverId })) ||
      isLegacyKeyUnclaimed({ serverName: serverName, serverType: serverType, serverId: serverId }) ||
      mayRecordServerOwner({ serverName: serverName, serverType: serverType, serverId: serverId });
  if (Ie)
    logMCPDebug(
      serverName,
      Ue
        ? "Allow rules do not apply: this server's name starts like a claude.ai connector's. To use allow rules, the server needs another name, and the rules must use that name."
        : "Allow rules do not apply: another MCP server already uses this name, or the name could not be recorded in the config file. Give this server a different name and write the rules for that name, or reconnect if the config file was busy.",
    );
  return {
    ...MCPTool,
    name: skipPrefix ? listed.name : Le,
    mcpInfo: {
      serverName: serverName,
      scope: scope,
      ...(pluginSource !== void 0 && { pluginSource: pluginSource }),
      serverType: serverType,
      ...(source !== void 0 && { source: source }),
      ...(pluginTelemetry && { pluginTelemetry: pluginTelemetry }),
      displayName: displayName,
      serverId: serverId,
      ...(serverIdStamp !== void 0 && { serverIdStamp: serverIdStamp }),
      iconUrl: iconUrl,
      serverInfoName: serverInfoName,
      ...(cliOwned && { cliOwned: !0 }),
      ...(standardKey !== void 0 && { standardKey: standardKey }),
      ...(legacyGrantRefused && { legacyGrantRefused: legacyGrantRefused }),
      ...(ve && { legacyGrantRebindable: legacyGrantRebindable }),
      ...(denyKey !== void 0 && { denyKey: denyKey }),
      ...(accountMemory && { accountMemory: !0 }),
      ...(accountMemoryServer && { accountMemoryServer: !0 }),
      ...(sdkDocsConnector && { sdkDocsConnector: !0 }),
      toolName: listed.name,
      title: listed.annotations?.title?.replace(/\s+/g, " ").trim() || void 0,
      execution: listed.execution,
      role: role,
      effectiveMaxPermission: effectiveMaxPermission,
      ...(we && { uiMeta: we }),
      ...(describeHiddenMcpTool(listed._meta, serverName, listed.name) && { hiddenFromModel: !0 }),
    },
    isMcp: !0,
    searchHint: He?.replace(/\s+/g, " ").trim() || void 0,
    alwaysLoad:
      !serverDefersAllTools &&
      ((serverAlwaysLoad && !(scope === "dynamic" && listed._meta?.["anthropic/alwaysLoad"] === !1)) ||
        listed._meta?.["anthropic/alwaysLoad"] === !0),
    async description() {
      return Oe;
    },
    async prompt({ loadedThroughToolSearch: te }) {
      return te ? xe : De;
    },
    isConcurrencySafe() {
      return Fe.mayOverlap || (listed.annotations?.readOnlyHint ?? !1);
    },
    isReadOnly() {
      return listed.annotations?.readOnlyHint ?? !1;
    },
    readOnlyHint: listed.annotations?.readOnlyHint,
    openWorldHint: listed.annotations?.openWorldHint,
    toAutoClassifierInput(te) {
      return mcpToolInputToAutoClassifierInput(te, listed.name);
    },
    isDestructive() {
      return listed.annotations?.destructiveHint ?? !1;
    },
    isOpenWorld() {
      return listed.annotations?.openWorldHint ?? !1;
    },
    requiresUserInteraction() {
      return Te;
    },
    async validateInput(te, Pe) {
      let ke = refuseNonMainAccountMemoryWrite(accountMemoryServer, listed.name, Pe);
      if (ke === void 0) return { result: !0 };
      return (
        logEvent("tengu_account_memory_spawned_write_refused", {
          caller: fromEnumOpt(Pe.memoryCaller) ?? lit("unmarked"),
        }),
        { result: !1, message: ke, errorCode: 1 }
      );
    },
    suppressesAlwaysAllowRule: (te, Pe) =>
      Te ||
      (effectiveMaxPermission === "ask" && !Pe) ||
      B() ||
      isDesignGatedTool(isFirstPartyDesignServer, listed.name),
    ...((Ie || isServerIdentityActive()) && { ignoresWholeToolAllowRule: B }),
    maxResultSizeChars: Ne ? Math.min(Z, Tle) : MCPTool.maxResultSizeChars,
    persistenceThresholdCeiling: Ne ? Tle : void 0,
    inputJSONSchema: addComputerUseActionSummary(
      addActionSummaryToSchema(
        applyParamDescriptionOverrides(
          listed.inputSchema,
          promptOverrides?.param_descriptions?.[listed.name],
        ),
        Le,
      ),
      Le,
    ),
    async checkPermissions(te, Pe) {
      let ke = gateDesignWriteWithoutPlanToken(isFirstPartyDesignServer, listed.name, te);
      if (ke) return ke;
      if (isFirstPartyDesignServer) {
        let oe = SZe(),
          ye = (await oe?.wouldNeedDesignConsent(Pe.toolState.get(DesignGateState), Pe.credentials)) ?? null;
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
          suppressAlwaysAllowRule: !0,
        };
      return {
        behavior: "passthrough",
        message: "MCPTool requires permission.",
        suggestions: Ee
          ? []
          : [
              {
                type: "addRules",
                rules: [{ toolName: Le, ruleContent: void 0 }],
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
async function buildCachedClientTools_2({
  name: e,
  config: config,
  capabilities: capabilities,
  serverInfo: serverInfo,
  savedAt: savedAt,
  tools: tools,
}) {
  (Po(), await evictStaleFailedConnectMemoForServe(e, config));
  let S = {
    name: e,
    type: "cached",
    config: config,
    capabilities: capabilities,
    ...(serverInfo && { serverInfo: { name: serverInfo.name, version: serverInfo.version } }),
    cacheSavedAt: savedAt,
  };
  return {
    client: S,
    tools: await fetchMcpTools(S, tools, Date.now(), "cache", beginDroppedToolsRoundV1(S)),
  };
}
/**
 * 获取 MCP 服务器工具：调用 tools/list，按权限上限、提示词覆盖、描述长度限制、插件来源等把 MCP 工具转换成 Claude Code 工具定义，失败时记 tengu_mcp_degraded。
 */
//@ chunk-z1n5m6nf.js:101346-117269 placement
async function fetchMcpTools(e, r, n, s, h) {
  r = filterRemoteRepoTools(e.config, r);
  let y = r.length,
    S = createStreamingListingSanitizer(),
    flat = (await mapInTurns(r, (B) => S(B) ?? [])).flat();
  r = [];
  let M = ET(e.config),
    w = mcpBaseUrlAnalytics(e.config, e.name),
    R = mcpNameForAnalytics_GATE_EVALUATED(
      normalizeNameForMCP(e.name),
      isMcpServerLoggableInAnalytics(e.name, e.config),
    ),
    E = y - flat.length;
  if (E > 0)
    (logMCPError(e.name, listingTruncatedNote("tools", E, y)),
      logEvent("tengu_mcp_degraded", {
        reason: lit("tool_listing_over_limit"),
        transportType: fromEnum(e.config.type ?? "stdio"),
        skippedCount: E,
        mcpServerName: R,
        ...w,
      }));
  if (y === 0 && s === "live")
    logEvent("tengu_mcp_degraded", {
      reason: lit("connected_zero_tools"),
      transportType: fromEnum(e.config.type ?? "stdio"),
      mcpServerName: R,
      ...w,
    });
  let Q = e.config.type === "sdk" && env.CLAUDE_AGENT_SDK_MCP_NO_PREFIX,
    H =
      e.config.type === "claudeai-proxy" || e.config.type === "http" || e.config.type === "sse"
        ? e.config.toolPermissions
        : void 0,
    U = isRunnerDynamicServer(e.config) ? l6n(H) : H;
  if (U) {
    let B = Object.keys(U).length;
    if (B > 0 && !flat.some((te) => U[te.name] !== void 0))
      logForDebugging(
        `[claudeai-mcp] ${e.name}: toolPermissions has ${B} entries but none matched upstream tool names \u2014 backend name drift?`,
        { level: "warn" },
      );
  }
  let re = shouldNormalizeRootCombinators_2(e.config),
    he = shouldDropInvalidToolSchemas_2(e.config),
    G = 0,
    q = 0,
    j = 0,
    fe = 0,
    pe = 0,
    ge = [],
    ce = 0,
    le = 0,
    k = await mapInTurns(flat, (B) => {
      let te = judgeToolSchemaSendability(B.inputSchema, { normalizeEnabled: re, apiValidateEnabled: he });
      if (te.verdict === "drop" && te.cause !== "api_invalid") {
        if (te.cause === "normalize_gated") q++;
        else j++;
        return (
          logMCPError(
            e.name,
            `Skipping tool "${B.name}": ${te.reason}. Other tools from this server remain available.`,
          ),
          []
        );
      }
      if (te.normalized)
        (G++,
          logMCPDebug(
            e.name,
            `Normalized input schema for tool "${B.name}" (flattened top-level ${te.normalized.combinators.join("/")})`,
          ));
      if (te.verdict === "drop") {
        if (te.rejection.check === "meta") fe++;
        else pe++;
        if (U?.[B.name] !== "blocked" && isIncludedMcpTool_3(Q ? B.name : buildMcpToolName(e.name, B.name)))
          ge.push({ toolName: B.name, reason: te.rejection.detail });
        return (
          logMCPError(
            e.name,
            `Skipping tool "${B.name}": its input schema would be rejected by the Anthropic API (${te.rejection.detail}). Other tools from this server remain available.`,
          ),
          []
        );
      }
      if (te.apiWouldReject) {
        if (te.apiWouldReject.check === "meta") ce++;
        else le++;
        logMCPDebug(
          e.name,
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
    }),
    L = Ji(k.flat(), "name");
  if (h.seq > h.state.applied) ((h.state.applied = h.seq), (e.droppedTools = Ji(ge, "toolName")));
  if (G > 0)
    logEvent("tengu_mcp_degraded", {
      reason: lit("tool_schema_normalized"),
      transportType: fromEnum(e.config.type ?? "stdio"),
      normalizedCount: G,
      mcpServerName: R,
      ...w,
    });
  if (q > 0)
    logEvent("tengu_mcp_degraded", {
      reason: lit("tool_schema_normalize_gated"),
      transportType: fromEnum(e.config.type ?? "stdio"),
      skippedCount: q,
      mcpServerName: R,
      ...w,
    });
  if (j > 0)
    logEvent("tengu_mcp_degraded", {
      reason: lit("tool_schema_unsupported"),
      transportType: fromEnum(e.config.type ?? "stdio"),
      skippedCount: j,
      mcpServerName: R,
      ...w,
    });
  if (fe > 0)
    logEvent("tengu_mcp_degraded", {
      reason: lit("tool_schema_invalid"),
      transportType: fromEnum(e.config.type ?? "stdio"),
      skippedCount: fe,
      mcpServerName: R,
      ...w,
    });
  if (pe > 0)
    logEvent("tengu_mcp_degraded", {
      reason: lit("tool_property_key_invalid"),
      transportType: fromEnum(e.config.type ?? "stdio"),
      skippedCount: pe,
      mcpServerName: R,
      ...w,
    });
  if (ce > 0)
    logEvent("tengu_mcp_degraded", {
      reason: lit("tool_schema_invalid_gated"),
      transportType: fromEnum(e.config.type ?? "stdio"),
      keptCount: ce,
      mcpServerName: R,
      ...w,
    });
  if (le > 0)
    logEvent("tengu_mcp_degraded", {
      reason: lit("tool_property_key_invalid_gated"),
      transportType: fromEnum(e.config.type ?? "stdio"),
      keptCount: le,
      mcpServerName: R,
      ...w,
    });
  let be = () => isMcpServerLoggableInAnalytics(e.name, e.config),
    W = TB(e.config),
    ze = TB(e.config, !0);
  await logToolCallXmlInDescriptions(L, e.name, be(), M, e.instructions);
  let X = isDesignServerConfig(e.config),
    Le = officialPluginPromptOverrides(e.config),
    Z = e.config.pluginSource ? buildPluginEventFieldsFromId(e.config.pluginSource, af()) : void 0,
    Ne = Zl(e.config),
    Te = Ne && e.name === CLAUDE_ARTIFACTS,
    we = Te || isOwnCcrMcpServer(e.config),
    Oe = !1,
    De = L,
    xe =
      flat.some((B) => $Pt(e, B.name)) || De.some((B) => $Pt(e, B.name)) || (E > 0 && isMemoryToolServer(e)),
    He = {
      serverName: e.name,
      scope: e.config.scope,
      pluginSource: e.config.pluginSource,
      serverType: e.config.type ?? "stdio",
      sdkDocsConnector: Sdn(e),
      source: mcpServerSource(e.name, e.config),
      skipPrefix: Q,
      serverAlwaysLoad: e.config.alwaysLoad === !0,
      serverDefersAllTools: e.config.alwaysLoad === !1,
      promptOverrides: Le,
      isFirstPartyDesignServer: X,
      maxDescriptionLength: W,
      maxLoadedDescriptionLength: ze,
      pluginTelemetry: Z,
      cliOwned: Ne,
      displayName: "displayName" in e.config ? e.config.displayName : void 0,
      standardKey: isStandardKeyActive() ? getServerIdentityKey(e.name, e.config, Ne === !0) : void 0,
      legacyGrantRefused:
        isStandardKeyActive() &&
        (await isLegacyKeyRefused(
          { serverName: e.name, serverType: e.config.type ?? "stdio", serverId: gH(e.config) },
          qq(e.name, e.config),
          isIdentityTrackedServer(e.name, e.config),
        )),
      legacyGrantRebindable:
        isStandardKeyActive() &&
        !qq(e.name, e.config) &&
        isIdentityTrackedServer(e.name, e.config) &&
        isLegacyKeyOwnedElsewhere({
          serverName: e.name,
          serverType: e.config.type ?? "stdio",
          serverId: gH(e.config),
        }),
      denyKey: isStandardKeyActive() ? isRemoteTransport(e.config) : void 0,
      serverId: gH(e.config),
      serverIdStamp: dynamicServerConnectorId(e.name, e.config),
      iconUrl: "iconUrl" in e.config ? e.config.iconUrl : void 0,
      serverInfoName: stripIgnorables(e.serverInfo?.name ?? "") || void 0,
      role: "role" in e.config ? e.config.role : void 0,
    },
    Fe = isClaudeInChromeMCPServer(e.name),
    Ue = isDocsConnectorServer(e),
    filtered = (
      await mapInTurns(De, (B) => {
        let te = buildMcpToolName(e.name, B.name),
          Pe = getMaxResultSizeCharsMeta(B) !== void 0,
          ke = {
            ...(Fe &&
              isStdioConfig(e.config) && {
                ...ln().getClaudeInChromeMCPToolOverrides(B.name),
                builtinRenderFamily: "claude-in-chrome",
              }),
            ...(Fe &&
              isClaudeAiProxyServer(e.config) && {
                ...createChromePermissionHandler(B.name, B._meta, (_e, ee) =>
                  readTabUrl(
                    async (P, x, D) =>
                      (
                        await callMCPTool_2({
                          client: await connectMcpServer(e, { context: "MCP tool call", signal: D }),
                          tool: P,
                          args: x,
                          signal: D,
                          resultNotForModel: !0,
                          imageLimits: IMAGE_LIMITS,
                          storageV5: void 0,
                          credentials: void 0,
                        })
                      ).content,
                    _e,
                    ee,
                  ),
                ),
              }),
            ...(e.name === REMOTE_BROWSER_SERVER_NAME && {
              excludedFromModeBypassAllow: isRemoteBrowserModeFloorOn,
            }),
            ...!1,
            ...(e.config.type === "sdk" && isFileUploadServer(e.name)
              ? buildMcpToolPermissionOverrides(
                  e.name,
                  B.name,
                  B.inputSchema.properties,
                  mcpToolInputToAutoClassifierInput,
                )
              : {}),
            ...(k4n(B.name) ? createSlackSendToolUi() : {}),
            ...(u8n(e.name, e.config.pluginSource, B.name) ? claudeTestWriteToolOverrides() : {}),
            ...{},
            ...(Te ? artifactsMcpLaptopModuleV1()?.artifactsMcpLaptopToolOverridesFor(e.config) : {}),
            ...(isRunnerDynamicServer(e.config) && { skipAggregateToolResultBudget: !0 }),
          },
          oe = buildMcpTool({
            ...He,
            accountMemory: isMemoryServerConnection(e, B.name),
            accountMemoryServer: xe,
            effectiveMaxPermission: U?.[B.name],
            listed: B,
            overrides: ke,
            async call(_e, ee, P, x, D, z) {
              let ie = ee.toolUseId ?? getFirstToolUseId_2(x),
                ue = refuseNonMainAccountMemoryWrite(xe, B.name, ee);
              if (ue !== void 0)
                throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                  ue,
                  "account memory write from a spawned loop",
                );
              let Se = {
                  ...mYn(e.config, ee.mcpRequestMeta),
                  ...z?.mcpCallMeta,
                  ...(ie && { "claudecode/toolUseId": ie }),
                  ...consumeMcpApprovalTicket(ee.session, ee.toolUseId, e.name, e.config),
                  ...(isClaudeInChromeMCPServer(e.name) &&
                    isClaudeAiProxyServer(e.config) &&
                    judgedSiteMeta(ee)),
                  ...((isDocsConnectorServer(e) || nxn(e.name, e.config)) && tor(x.requestId)),
                  ...(isHearthbotRelayServer(e) && ccrTurnEventHeaders(Rnr())),
                  ...agentRequestMeta(e, ee),
                  ...(isAccountMemoryServer(e) && memoryChainMeta(ee.toolState, x.message.id)),
                },
                me = !1;
              function Me(Qe) {
                if (!D || !ie || me) return;
                D({ type: "progress", toolUseID: ie, data: Qe });
              }
              Me({ type: "mcp_progress", status: "started", serverName: e.name, toolName: B.name });
              let now = Date.now(),
                et = e,
                Je = !1,
                Ye,
                We = null,
                it = typeof _e.__consentNonce === "string" ? _e.__consentNonce : void 0;
              if ("__consentNonce" in _e) {
                let { __consentNonce: __consentNonce, ...Et } = _e;
                _e = Et;
              }
              let wt = X ? takeDesignConsentAsk(ie, it) : null;
              if (X) noteDesignProjectId(ee.toolState.get(DesignGateState), X, B.name, _e);
              let Jt = (Qe) => {
                  if (((Je = Qe), Qe)) {
                    if (
                      ((Ye ??= z?.timing?.mark("approval")),
                      !me && oe.name !== getPermissionPromptToolName() && We === null)
                    )
                      We = parkOnUser();
                  } else (Ye?.(), (Ye = void 0), We?.(), (We = null));
                },
                at = !0,
                ct = async (Qe) => {
                  for (let vt = 0; ; vt++)
                    try {
                      let Ve = at ? ie : void 0;
                      at = !1;
                      let Ut = z?.timing?.mark(
                          e.config.type === "http" && issuerKey_3(e.config.url) ? "own" : "external",
                        ),
                        yt = await connectMcpServer(e, { context: "MCP tool call", toolUseId: Ve }).finally(
                          Ut,
                        );
                      ((et = yt), applyMemoryCallerMeta(Se, xe, ee, yt));
                      let je = await callMCPToolWithUrlElicitationRetry_2({
                        client: yt,
                        clientConnection: e,
                        tool: B.name,
                        args: _e,
                        meta: Se,
                        signal: Qe,
                        imageLimits: imageLimitsForModel(ee.options.mainLoopModel),
                        taskRegistry: ee.taskRegistry,
                        toolUseId: ie,
                        onProgress: D && ie ? Me : void 0,
                        requestDialog: ee.requestDialog,
                        storageV5: ee.storageV5,
                        credentials: ee.credentials,
                        hasResultSizeAnnotation: Pe || ee.innerCall === !0,
                        onAwaitingUserInput: Jt,
                        timing: z?.timing,
                        offCriticalPath:
                          (getBackgroundAgentId(ee.agentContext) ??
                            (ee.isBackgroundAgent ? ee.agentId : void 0)) !== void 0,
                        ccrNeedsApprovalRetry:
                          "url" in e.config &&
                          isSameOriginAsCcr(e.config.url) &&
                          canPromptForPermission(ee) &&
                          !(getPermissionPromptToolName() && getPermissionPromptToolName() !== "stdio")
                            ? {
                                canUseTool: P,
                                tool: oe,
                                fullyQualifiedName: te,
                                toolUseContext: ee,
                                parentMessage: x,
                              }
                            : void 0,
                      });
                      if (je.interrupted) throw new AbortError(INTERRUPTED_CALL_NOTICE);
                      if (
                        (Me({
                          type: "mcp_progress",
                          status: "completed",
                          serverName: e.name,
                          toolName: B.name,
                          elapsedTimeMs: Date.now() - now,
                        }),
                        !je.isError)
                      ) {
                        if ((logPrCreateOperation(B.name), isAccountMemoryServer(e)))
                          rememberMemoryChain(ee.toolState, x.message.id, je._meta);
                        if (!me && isClaudeInChromeMCPServer(e.name) && isClaudeAiProxyServer(e.config))
                          je.content = chromeNoBrowserAnswer(je.content, je._meta, ee);
                      }
                      if (vt > 0) logFeatureOk("mcp_session_recovery");
                      let Xt = gYn(e.config, stripAnthropicMeta(je._meta));
                      return {
                        data: je.content,
                        ...(je.urlElicitationDeclined && {
                          urlElicitationDeclined: je.urlElicitationDeclined,
                        }),
                        ...((Xt || je.structuredContent || je.resourceLinks) && {
                          mcpMeta: {
                            ...(Xt && { _meta: Xt }),
                            ...(je.structuredContent && { structuredContent: je.structuredContent }),
                            ...(je.resourceLinks && { resourceLinks: je.resourceLinks }),
                          },
                        }),
                      };
                    } catch (error) {
                      if (
                        error instanceof McpSessionExpiredError &&
                        vt < 1 &&
                        (!error.mayHaveRun ||
                          oe.isConcurrencySafe(_e) ||
                          B.annotations?.idempotentHint === !0)
                      ) {
                        (logFeatureSad("mcp_session_recovery", error.expiryKind),
                          logMCPDebug(e.name, `Retrying tool '${B.name}' after session recovery`));
                        continue;
                      }
                      if (error instanceof McpSessionExpiredError)
                        logFeatureBad(
                          "mcp_session_recovery",
                          vt < 1 ? "may_have_run_no_retry" : "session_retry_exhausted",
                        );
                      else if (vt > 0 && !Qe.aborted)
                        logFeatureBad("mcp_session_recovery", "retry_failed_other");
                      if (
                        (Me({
                          type: "mcp_progress",
                          status: "failed",
                          serverName: e.name,
                          toolName: B.name,
                          elapsedTimeMs: Date.now() - now,
                        }),
                        !Qe.aborted)
                      )
                        noteHearthDegraded(e.name, error);
                      if (
                        error instanceof Error &&
                        !(error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS)
                      ) {
                        let Ut = error.constructor.name,
                          yt = () => (Qe.aborted ? "other" : rY(error));
                        if (Ut === "Error") {
                          let je = describeConnectError(error, e.config);
                          throw Object.assign(
                            new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                              je,
                              je.slice(0, 200),
                            ),
                            { mcpErrorSource: yt() },
                          );
                        }
                        if (Ut === "McpError" && "code" in error && typeof error.code === "number") {
                          let merged = Object.assign(
                            new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                              error.message,
                              `McpError ${error.code}`,
                            ),
                            { mcpErrorSource: yt() },
                          );
                          throw isNeedsApprovalOrExpiredSessionV1(error) ? z9(merged) : merged;
                        }
                      }
                      throw (raiseMemoryErrorCap(error, e, B.name), error);
                    }
                },
                dt = ct;
              if (X)
                dt = wrapCallWithDesignConsent(ct, {
                  designSession: ee.toolState.get(DesignGateState),
                  approvedConsentBit: wt?.bit ?? null,
                  consentAskReachesUser: (wt?.askReachesUser ?? !1) && canAskDesignConsent(ee),
                  credentials: ee.credentials,
                });
              if (B.name === GET_TASK && UBt(e)) {
                let { withTaskFilesRemembered: withTaskFilesRemembered } =
                  await import("./chunk-h33h7b0z.js");
                dt = withTaskFilesRemembered(dt, { client: e, args: _e, session: ee.session });
              }
              if (lt && !ee.agentId && ee.taskRegistry !== u2 && oe.name !== getPermissionPromptToolName()) {
                let mcpAutoBackgroundMs = lt.getMcpAutoBackgroundMs(e.config, {
                    isNonInteractiveSession: ee.options.isNonInteractiveSession,
                  }),
                  Et =
                    mcpAutoBackgroundMs === 0 &&
                    lt.isMcpCallMovableWithoutTimer(e.config, {
                      isNonInteractiveSession: ee.options.isNonInteractiveSession,
                      isInnerCall: ee.innerCall === !0,
                    });
                if (mcpAutoBackgroundMs > 0 || Et)
                  return lt.callMcpToolWithAutoBackground({
                    run: dt,
                    serverName: e.name,
                    toolName: B.name,
                    accountMemoryTool: isLiveMemoryTool(oe),
                    toolUseId: ie,
                    parentAbortController: ee.abortController,
                    taskRegistry: ee.taskRegistry,
                    autoBackgroundMs: Et ? null : mcpAutoBackgroundMs,
                    storageV5: ee.storageV5,
                    credentials: ee.credentials,
                    hasPendingElicitation: () =>
                      Je ||
                      ((et.type === "connected" ? et.transportErrorState?.pendingElicitations : void 0) ??
                        0) > 0,
                    onBackgrounded: () => {
                      me = !0;
                    },
                    foregroundCalls: ee.innerCall ? void 0 : Q_e.of(ee.session),
                    noticeGate: I3n({
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
          let _e = !isStdioConfig(e.config) && !env.CLAUDE_CODE_REMOTE && env.CLAUDE_CODE_IS_COWORK,
            ee = oe.call;
          oe.call = async (P, x, D, z, ie, ue) => {
            let {
                FILE_UPLOAD_MAX_TOTAL_BYTES: FILE_UPLOAD_MAX_TOTAL_BYTES,
                passThroughChromeFileUploadInput: passThroughChromeFileUploadInput,
                prepareChromeFileUploadInput: prepareChromeFileUploadInput,
              } = await import("./chunk-f11kwnvn.js"),
              Be = _e
                ? await passThroughChromeFileUploadInput(B.name, P ?? {}, getToolPermissionContext(x))
                : await prepareChromeFileUploadInput(
                    B.name,
                    P ?? {},
                    getToolPermissionContext(x),
                    isClaudeAiProxyServer(e.config)
                      ? {
                          maxTotalBytes: chromeUploadMaxBytes(B._meta, FILE_UPLOAD_MAX_TOTAL_BYTES),
                          hosted: { session: x.session, signal: x.abortController.signal },
                        }
                      : void 0,
                  );
            if (Be.error)
              throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                Be.error,
                "Claude in Chrome file_upload path rejected",
              );
            return ee(Be.input ?? P, x, D, z, ie, Be.callMeta ? { ...ue, mcpCallMeta: Be.callMeta } : ue);
          };
        }
        if (
          e.config.type === "sdk" &&
          isFileUploadServer(e.name) &&
          FILE_UPLOAD_TOOLS.includes(B.name) &&
          !env.CLAUDE_CODE_REMOTE &&
          !env.CLAUDE_CODE_IS_COWORK &&
          resolveSdkUrl().status === "absent"
        ) {
          let _e = B._meta?.[ANTHROPIC_HOSTASKSPERUPLOADEDFILE] === !0,
            ee = oe.call;
          oe.call = async (P, x, D, z, ie, ue) => {
            let Se = await import("./chunk-v64arqfj.js"),
              paneFileUploadCall = await Se.paneFileUploadCall(
                P,
                getToolPermissionContext(x),
                x.mcpRequestMeta,
                _e,
                x.autoModeClassified === !0,
              );
            return ee(
              paneFileUploadCall.input,
              { ...x, mcpRequestMeta: paneFileUploadCall.mcpRequestMeta },
              D,
              z,
              ie,
              ue && { ...ue, mcpCallMeta: {} },
            );
          };
        }
        if (FBt(B.name)) {
          let _e = B.name,
            validateInput = oe.validateInput;
          oe.validateInput = async (D, z) => {
            let ie = validateInput ? await validateInput(D, z) : { result: !0 };
            if (!ie.result) return ie;
            let { startTaskInputRefusal: startTaskInputRefusal } = await import("./chunk-d40fm320.js"),
              Se = startTaskInputRefusal(e, _e, D, oe.inputJSONSchema, z.session);
            return Se === void 0 ? ie : { result: !1, message: Se, errorCode: 2 };
          };
          let prompt = oe.prompt;
          oe.prompt = async (D) => {
            let z = await prompt(D),
              toolPermissionContext = await D.getToolPermissionContext();
            if (toolPermissionContext.isRemoteMode !== !0) return z;
            let { startTaskFilesPromptNote: startTaskFilesPromptNote } = await import("./chunk-d40fm320.js"),
              Se = startTaskFilesPromptNote(e, _e, toolPermissionContext);
            return Se === void 0
              ? z
              : `${z}

${Se}`;
          };
          let x = oe.call;
          if (
            ((oe.call = async (D, z, ie, ue, Se, me) => {
              let Me = D ?? {};
              if (!Array.isArray(Me.files) || Me.files.length === 0) return x(D, z, ie, ue, Se, me);
              let {
                  prepareStartTaskFileInputs: prepareStartTaskFileInputs,
                  removeStartTaskUploadsFor: removeStartTaskUploadsFor,
                  startTaskInputRefusal: startTaskInputRefusal,
                  startTaskSendRefusal: startTaskSendRefusal,
                } = await import("./chunk-d40fm320.js"),
                toolUseId = z.toolUseId,
                it = findPendingTaskFilesForArgs(z.session, toolUseId, Me.files);
              if (it !== void 0 && toolUseId !== void 0) {
                let ct = startTaskSendRefusal(it.uploadStartedAt, _e);
                if (ct !== void 0)
                  throw (
                    await discardTaskFiles(z.session, it),
                    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                      ct,
                      "start_task files not sent after the approval",
                    )
                  );
                ((it.state = "sending"),
                  NBt(z.session, toolUseId, () => startTaskSendRefusal(it.uploadStartedAt, _e)));
                try {
                  return await x(D, z, ie, ue, Se, me);
                } catch (error) {
                  if (yZe(error)) ((it.state = "pending"), await discardTaskFiles(z.session, it));
                  throw error;
                } finally {
                  ($Bt(z.session, toolUseId), cYn(z.session, it));
                }
              }
              let wt = startTaskInputRefusal(e, _e, Me, oe.inputJSONSchema, z.session);
              if (wt !== void 0)
                throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                  wt,
                  "start_task input refused",
                );
              let now = Date.now(),
                at = await prepareStartTaskFileInputs(
                  e,
                  _e,
                  Me,
                  getToolPermissionContext(z),
                  z.abortController.signal,
                  z.session,
                );
              if (at.error)
                throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                  at.error,
                  "start_task file input rejected",
                );
              if (at.input === void 0 || toolUseId === void 0) return x(at.input ?? D, z, ie, ue, Se, me);
              NBt(z.session, toolUseId, () => startTaskSendRefusal(now, _e));
              try {
                return await x(at.input, z, ie, ue, Se, me);
              } catch (error) {
                if (yZe(error)) await removeStartTaskUploadsFor(e, z.session, at.input.files);
                throw error;
              } finally {
                $Bt(z.session, toolUseId);
              }
            }),
            isToolboxMcpServer(e))
          )
            oe.askInputPreparer = async (D, z, ie) => {
              if (!Array.isArray(D.files) || D.files.length === 0) return;
              let {
                  startTaskAskInputPreparer: startTaskAskInputPreparer,
                  startTaskInputRefusal: startTaskInputRefusal,
                } = await import("./chunk-d40fm320.js"),
                me = startTaskAskInputPreparer(
                  e,
                  _e,
                  D,
                  getToolPermissionContext(z),
                  z.abortController.signal,
                  z.session,
                  ie,
                );
              return (
                me && {
                  prepare: () => {
                    let Me = startTaskInputRefusal(e, _e, D, oe.inputJSONSchema, z.session);
                    return Me === void 0 ? me.prepare() : Promise.resolve({ error: Me });
                  },
                }
              );
            };
        }
        let { validateInput: validateInput, call: Ae, askInputPreparer: askInputPreparer } = oe;
        if (B._meta?.[ANTHROPIC_FILEINPUTS] !== void 0)
          wireFileInputs(
            oe,
            { client: e, name: B.name, meta: B._meta, schema: oe.inputJSONSchema },
            (_e) => async (ee, P) =>
              (
                await callMCPTool_2({
                  client: await connectMcpServer(e, { context: "MCP tool call" }),
                  tool: ee,
                  args: P,
                  signal: _e.abortController.signal,
                  imageLimits: imageLimitsForModel(_e.options.mainLoopModel),
                  hasResultSizeAnnotation: !0,
                  storageV5: _e.storageV5,
                  credentials: _e.credentials,
                })
              ).structuredContent,
          );
        {
          let _e = fileReferenceToolToFill(e, B.name);
          if (_e !== void 0)
            wrapFileReferenceTool(
              oe,
              _e,
              { validateInput: validateInput, call: Ae, askInputPreparer: askInputPreparer },
              getFirstToolUseId_2,
              filledCallRequestMeta(e),
            );
        }
        if (oe.mcpInfo !== void 0 && fileReferenceToolForRecords(e, B.name) !== void 0)
          oe.mcpInfo = { ...oe.mcpInfo, fileReference: !0 };
        if (Te || isRunnerDynamicServer(e.config))
          artifactPermissionRulesModuleV1()?.applyArtifactRules(e.config, oe);
        if (we) artifactsMcpLaptopModuleV1()?.wrapArtifactsMcpLaptopPublishing(e.config, oe);
        if (Ue) claudeDocsWakeModuleV1()?.wrapClaudeDocsCreateWake(oe);
        if (Fe && e.config.type !== "sdk") {
          let _e = oe.call;
          oe.call = async (ee, P, x, D, z, ie) => {
            let ue = policyDeniedReason("allow_claude_browser_extension", "Claude in Chrome", "is");
            if (ue !== null)
              throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                ue,
                "Claude in Chrome call refused by org policy",
              );
            return _e(ee, P, x, D, z, ie);
          };
        }
        let ot = oe.call;
        return (
          (oe.call = async (_e, ee, P, x, D, z) => {
            if (
              ((ee.options.activeMcpServer = e.name),
              (ee.options.activeMcpTool = B.name),
              e.config.pluginSource)
            )
              (recordPluginUsage(e.config.pluginSource),
                recordPluginActivity(e.config.pluginSource, "mcp", { kind: "mcp-server", name: e.name }));
            let ie = be();
            if (ie) Cgr(e.name);
            let ue =
              (FBt(B.name) && findPendingTaskFilesForArgs(ee.session, ee.toolUseId, _e?.files) !== void 0) ||
              (B._meta?.[ANTHROPIC_FILEINPUTS] !== void 0
                ? (await import("./chunk-bk2cbdc2.js")).hasFileGrants(ee.session, ee.toolUseId)
                : !1);
            return ot(
              ue
                ? _e
                : stripTrailingInvokeSuffix(
                    _e,
                    B.name,
                    e.name,
                    ie,
                    getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_strip_trailing_xml_tags", !1),
                    M,
                  ),
              ee,
              P,
              x,
              D,
              z,
            );
          }),
          oe
        );
      })
    ).filter(isIdeServer_2),
    mapped = L.map((B) => (Le?.tools?.[B.name] ?? B.description ?? "").length),
    reduced = mapped.reduce((B, te) => B + te, 0);
  if (
    (logEvent("tengu_mcp_tools_listed", {
      transportType: fromEnum(e.config.type ?? "stdio"),
      listDurationMs: Date.now() - n,
      toolCount: filtered.length,
      alwaysLoadCount: count(filtered, (B) => B.alwaysLoad === !0),
      descriptionTotalLength: reduced,
      descriptionMaxLength: mapped.reduce((B, te) => Math.max(B, te), 0),
      descriptionMeanLength: mapped.length ? Math.round(reduced / mapped.length) : 0,
      descriptionOverLimitCount: count(mapped, (B) => B > W),
      discoverySource: fromEnum(s),
      ...w,
      mcpServerName: mcpNameForAnalytics_GATE_EVALUATED(
        normalizeNameForMCP(e.name),
        isMcpServerLoggableInAnalytics(e.name, e.config),
      ),
    }),
    s === "live")
  )
    logFeatureOk("mcp_list_tools");
  if (isStdioConfig(e.config) && isClaudeInChromeMCPServer(e.name)) logChromeToolsAdded(filtered.length, s);
  if (UBt(e)) {
    let { addTaskFileSaves: addTaskFileSaves } = await import("./chunk-h33h7b0z.js");
    addTaskFileSaves(filtered, {
      client: e,
      listed: De,
      compose: (te, Pe, ke, oe) =>
        buildMcpTool({
          ...He,
          accountMemoryServer: xe,
          effectiveMaxPermission: oe,
          listed: te,
          call: Pe,
          overrides: ke,
        }),
    });
  }
  return filtered;
}
//@ chunk-z1n5m6nf.js:117269-119068 placement
var listMcpTools = memoizeWithLRU(
  async (e, r, n) => {
    if (e.type !== "connected") return [];
    let s = identityEpoch(),
      h = beginDroppedToolsRoundV1(e);
    try {
      if (!e.capabilities?.tools) {
        let w = [];
        return (recordRawToolsForResult(w, []), w);
      }
      let now = Date.now(),
        S = await listAllPages(
          oa(e.client),
          e.name,
          e.config,
          "tools/list",
          ListToolsResultSchema,
          (w) => w.tools,
        );
      if (((e.toolsListError = void 0), (e.discoveryAuthFailure = void 0), n === !0)) {
        let w = [];
        return (recordRawToolsForResult(w, S), w);
      }
      let T = listToolsWithMemo(e, S, s, h, () => ({
        normalizeEnabled: shouldNormalizeRootCombinators_2(e.config),
        apiValidateEnabled: shouldDropInvalidToolSchemas_2(e.config),
      }));
      if (T?.reuse !== void 0) return (recordRawToolsForResult(T.reuse, S), T.reuse);
      let M = await fetchMcpTools(e, S, now, "live", h);
      if (h.seq === h.state.started) ((e.toolsListError = void 0), (e.discoveryAuthFailure = void 0));
      return (recordRawToolsForResult(M, S), settleToolListingMemo(e, T, M, h), M);
    } catch (error) {
      let S = redactMcpErrorDetail(e.name, e.config, describeConnectError(error, e.config));
      if (e.config.type === "claudeai-proxy" && isListAuthError_2(error)) {
        if (
          (logEvent("tengu_mcp_server_needs_auth", {
            transportType: lit("claudeai-proxy"),
            cause: lit("discovery_tools_list"),
            ...mcpBaseUrlAnalytics(e.config, e.name),
          }),
          isCurrentIdentityEpoch(s))
        )
          isMcpAuthCached_3(e.name, e.config.id, void 0, r);
        return (
          logFeatureSad("mcp_list_tools", "mcp_list_tools_needs_auth"),
          logMCPDebug(e.name, "tools/list 401/403 on claude.ai proxy \u2014 flagging needs-auth"),
          (e.discoveryAuthFailure = !0),
          getConnectionCache().toolLists.delete(ir(e.name, e.config)),
          []
        );
      }
      if (isListAuthError_2(error) && yBt(e.name, e.config)) e.discoveryAuthFailure = !0;
      let T = e.config.type === "claudeai-proxy" && isClaudeAiBearerRejectedError_2(error),
        M = T
          ? "mcp_list_tools_claudeai_bearer_rejected"
          : error instanceof McpError
            ? `mcp_list_tools_${LIST_FAILURE_REASONS_V1[error.code] ?? "mcperr_other"}`
            : S.includes("timed out")
              ? "mcp_list_tools_timeout"
              : "mcp_list_tools_failed";
      if (
        (logFeatureSad("mcp_list_tools", M),
        (T ? logMCPDebug : logMCPError)(e.name, `Failed to fetch tools: ${S}`),
        (e.toolsListError = S),
        T)
      )
        e.discoveryBearerRejected = !0;
      let R = [];
      if ((ht().toolsListErrorByResult.set(R, S), !T)) {
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
      return (getConnectionCache().toolLists.delete(ir(e.name, e.config)), R);
    }
  },
  (e) => ir(e.name, e.config),
  () => getConnectionCache().toolLists,
);
/**
 * 记录 MCP 列表请求（资源/命令）失败：区分需要认证、claude.ai bearer 被拒、MCP 错误码、超时与一般失败，报告结果码；非认证类失败还记 tengu_mcp_degraded。
 */
//@ chunk-z1n5m6nf.js:119068-119612 placement
function reportListFailure_2(connection, error, listKind, setOutcome, degradedReason, what) {
  let errorText = describeConnectError(error, connection.config),
    needsAuth = connection.config.type === "claudeai-proxy" && isListAuthError_2(error),
    bearerRejected = connection.config.type === "claudeai-proxy" && isClaudeAiBearerRejectedError_2(error);
  if (bearerRejected) connection.discoveryBearerRejected = !0;
  let w = needsAuth
    ? `${listKind}_needs_auth`
    : bearerRejected
      ? `${listKind}_claudeai_bearer_rejected`
      : error instanceof McpError
        ? `${listKind}_${LIST_FAILURE_REASONS_V1[error.code] ?? "mcperr_other"}`
        : errorText.includes("timed out")
          ? `${listKind}_timeout`
          : `${listKind}_failed`;
  if (
    (setOutcome(w),
    (needsAuth || bearerRejected ? logMCPDebug : logMCPError)(
      connection.name,
      `Failed to fetch ${what}: ${errorText}`,
    ),
    !needsAuth && !bearerRejected)
  )
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
    async (e) => {
      if (e.type !== "connected") return [];
      try {
        if (!e.capabilities?.resources) {
          let s = [];
          return (recordRawResourcesForResult_2(s, []), s);
        }
        let r = await listAllPages(
          oa(e.client),
          e.name,
          e.config,
          "resources/list",
          ListResourcesResultSchema,
          (s) => s.resources,
        );
        logFeatureOk("mcp_list_resources");
        let mapped = r.map((s) => ({ ...s, server: e.name }));
        return (recordRawResourcesForResult_2(mapped, r), mapped);
      } catch (error) {
        (reportListFailure_2(
          e,
          error,
          "mcp_list_resources",
          (s) => logFeatureSad("mcp_list_resources", s),
          lit("resources_list_failed"),
          "resources",
        ),
          getConnectionCache().resourceLists.delete(ir(e.name, e.config)));
        let n = [];
        if (error instanceof McpError && error.code === ErrorCode.MethodNotFound)
          recordRawResourcesForResult_2(n, []);
        else ht().discoveryFetchErrors.set(n, toError(error));
        return n;
      }
    },
    (e) => ir(e.name, e.config),
    () => getConnectionCache().resourceLists,
  ),
  fetchResourceTemplatesForClient_2 = memoizeWithLRU(
    async (e) => {
      if (e.type !== "connected") return [];
      try {
        if (!e.capabilities?.resources) return [];
        let r = await listAllPages(
          oa(e.client),
          e.name,
          e.config,
          "resources/templates/list",
          ListResourceTemplatesResultSchema,
          (n) => n.resourceTemplates,
        );
        return (
          logEvent("tengu_mcp_resource_templates_fetched", { template_count: r.length }),
          logFeatureOk("mcp_list_resource_templates"),
          r.map((n) => ({ ...n, server: e.name }))
        );
      } catch (error) {
        (getConnectionCache().resourceTemplateLists.delete(ir(e.name, e.config)),
          logMCPDebug(
            e.name,
            `Failed to fetch resource templates: ${describeConnectError(error, e.config)}`,
          ));
        let n = [];
        if (!(error instanceof McpError && error.code === ErrorCode.MethodNotFound))
          ht().discoveryFetchErrors.set(n, toError(error));
        return n;
      }
    },
    (e) => ir(e.name, e.config),
    () => getConnectionCache().resourceTemplateLists,
  );
//@ chunk-z1n5m6nf.js:120851-121022 placement
function fetchResourceTemplatesForClients(e, r) {
  let n = [];
  for (let s of e) {
    if (s.type !== "connected") continue;
    if (s.name in r) continue;
    n.push(fetchResourceTemplatesForClient_2(s).then((h) => ({ client: s, templates: h })));
  }
  return Promise.all(n);
}
//@ chunk-z1n5m6nf.js:121022-121472 placement
async function completeResourceTemplateArgument(e, r, n, s, h) {
  if (!e.capabilities?.completions) return [];
  try {
    let complete = await oa(e.client).complete({
      ref: { type: "ref/resource", uri: r },
      argument: { name: n, value: s },
      context: Object.keys(h).length > 0 ? { arguments: h } : void 0,
    });
    return (logFeatureOk("mcp_complete_resource_template"), complete.completion.values);
  } catch (error) {
    return (
      logFeatureBad("mcp_complete_resource_template", "mcp_complete_resource_template_failed"),
      logMCPDebug(e.name, `Failed to complete resource template: ${describeConnectError(error, e.config)}`),
      []
    );
  }
}
//@ chunk-z1n5m6nf.js:121472-122033 placement
var fetchCommandsForClient_2 = memoizeWithLRU(
  async (e) => {
    if (e.type !== "connected") return [];
    try {
      if (!e.capabilities?.prompts) {
        let s = [];
        return (recordRawCommandsForResult(s, []), s);
      }
      let r = await listAllPages(
        oa(e.client),
        e.name,
        e.config,
        "prompts/list",
        ListPromptsResultSchema,
        (s) => s.prompts,
      );
      logFeatureOk("mcp_list_prompts");
      let n = buildMcpPromptCommands_2(e, r);
      return (recordRawCommandsForResult(n, r), n);
    } catch (error) {
      (reportListFailure_2(
        e,
        error,
        "mcp_list_prompts",
        (s) => logFeatureSad("mcp_list_prompts", s),
        lit("prompts_list_failed"),
        "commands",
      ),
        getConnectionCache().commandLists.delete(ir(e.name, e.config)));
      let n = [];
      if (error instanceof McpError && error.code === ErrorCode.MethodNotFound)
        recordRawCommandsForResult(n, []);
      else ht().discoveryFetchErrors.set(n, toError(error));
      return n;
    }
  },
  (e) => ir(e.name, e.config),
  () => getConnectionCache().commandLists,
);
/**
 * 动态生成的 prompt 命令对象（name="mcp__"+Sn(e.name)+"__"+w.name）；描述：Q??""；别名 S?[`${e.name}:${w.name}`,`${e.name}:${w.name} (MCP)`]:void 0；isEnabled: ()=>!0；isHidden: false。
 */
//@ chunk-z1n5m6nf.js:122033-123802 placement
function buildMcpPromptCommands_2(e, r) {
  let n = createStreamingListingSanitizer(),
    flattened = r.flatMap((w) => n(w) ?? []),
    h = r.length - flattened.length;
  if (h > 0) logMCPError(e.name, listingTruncatedNote("prompts", h, r.length));
  let config = e.config,
    S = (config.type === "http" || config.type === "sse") && isDesignMcpUrl(config.url),
    T = officialPluginPromptOverrides(e.config),
    mapped = flattened.map((w) => {
      let values = Object.values(w.arguments ?? {}),
        mapped = values.map((H) => H.name),
        Q = T?.prompts?.[w.name] ?? w.description;
      return {
        type: "prompt",
        name: "mcp__" + normalizeNameForMCP(e.name) + "__" + w.name,
        description: Q ?? "",
        hasUserSpecifiedDescription: !!Q,
        contentLength: 0,
        isEnabled: () => !0,
        isHidden: !1,
        isMcp: !0,
        mcpInfo: getMcpInfoFromConnection(e),
        progressMessage: "running",
        userFacingName() {
          return S ? w.name : `${e.name}:${w.name} (MCP)`;
        },
        aliases: S ? [`${e.name}:${w.name}`, `${e.name}:${w.name} (MCP)`] : void 0,
        argNames: mapped,
        source: "mcp",
        async getPromptForCommand(args, context) {
          let trimmed = args.trim(),
            he = trimmed ? trimmed.split(/\s+/) : [],
            G = hostedDesktopRefusal(e);
          if (G) throw G;
          try {
            let mapped_2 = values.filter((ce, le) => ce.required && he[le] === void 0).map((ce) => ce.name);
            if (mapped_2.length > 0)
              throw Error(
                `Missing required ${plural(mapped_2.length, "argument")}: ${mapped_2.join(", ")}. Usage: /mcp__${normalizeNameForMCP(e.name)}__${w.name} ${mapped.join(" ")}`,
              );
            let j = await connectMcpServer(e, {
                signal: context.abortController.signal,
                context: "MCP prompt command",
              }),
              prompt = await oa(j.client).getPrompt({ name: w.name, arguments: Yqn(mapped, he) }),
              pe = imageLimitsForModel(context.options.mainLoopModel),
              results = await Promise.all(
                prompt.messages.map((message) =>
                  transformResultContent_2(message.content, j.name, pe, context.storageV5),
                ),
              );
            return (logFeatureOk("mcp_get_prompt"), Uv(buildMcpToolName(e.name, w.name)), results.flat());
          } catch (error) {
            if (!isAbortError(error))
              if (e.config.type === "claudeai-proxy" && isClaudeAiBearerRejectedError_2(error))
                (logFeatureSad("mcp_get_prompt", "mcp_get_prompt_claudeai_bearer_rejected"),
                  logMCPDebug(
                    e.name,
                    `Error running command '${w.name}': ${describeConnectError(error, e.config)}`,
                  ));
              else
                (logFeatureBad("mcp_get_prompt", "mcp_get_prompt_failed"),
                  logMCPError(
                    e.name,
                    `Error running command '${w.name}': ${describeConnectError(error, e.config)}`,
                  ));
            throw error;
          }
        },
      };
    });
  return checkCommandListable(mapped, (w) =>
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
  tt,
  To,
  gt,
  persistDiscovery,
  isDiscoveryCacheMissRecoverable_2,
  discoverySourceLabel_2,
  recordRawResourcesForResult_2,
  connectMcpServer,
};
