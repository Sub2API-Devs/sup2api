/**
 * bridge/replBridgeHandle.ts
 *
 * REPL 桥接句柄与向桥接上报的会话元数据（权限模式、模型、上下文用量、摘要、artifact）。旧版同名文件。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/bridge/replBridgeHandle.ts
 * pieces: chunk-5ktj1vf9.js (36)
 * attribution: placement 36
 */
import { bridgeHostState } from "./bridgeHostState.js";
import { clearSenderDropWriter, setSenderDropWriter } from "./deviceAttestation.js";
import { updateSessionBridgeId, adoptSuppliedSessionTitle } from "../utils/concurrentSessions.js";
import { toCompatSessionId, isSelfAddressableSessionId, sessionIdBody } from "./sessionIdCompat.js";
import { toExternalPermissionMode } from "../utils/permissions/PermissionMode.js";
import { logForDebugging } from "../utils/debug.js";
import { logError } from "../utils/log.js";
import { clipTeammateText } from "../utils/swarm/teammateIds.js";
import { isReplBridgeActive } from "../bootstrap/state.js";
import { jsonStringify } from "../utils/slowOperations.js";
import { bridgeAddressFromToken } from "../utils/peerMessageHeaders.js";

//@ chunk-5ktj1vf9.js:502-711 placement
/**
 * 句柄切换时替换丢弃消息的写出器
 */
function swapDropSenderWriter(previousHandle, nextHandle) {
  let dropSenderWriterByHandle = bridgeHostState().dropSenderWriterByHandle;
  if (previousHandle !== null && previousHandle !== nextHandle) {
    let previousWriter = dropSenderWriterByHandle.get(previousHandle);
    if (previousWriter) clearSenderDropWriter(previousWriter);
  }
  if (nextHandle !== null && nextHandle !== previousHandle && !nextHandle.outboundOnly) {
    let senderDropWriter = dropSenderWriterByHandle.get(nextHandle);
    if (!senderDropWriter) {
      senderDropWriter = (event) => {
        nextHandle.writeSdkMessages([event]);
      };
      dropSenderWriterByHandle.set(nextHandle, senderDropWriter);
    }
    setSenderDropWriter(senderDropWriter);
  }
}
//@ chunk-5ktj1vf9.js:711-1357 placement
function setSdkHostedBridgeHandle(handle, storageV5) {
  let hostState = bridgeHostState();
  let visibleHandle = visibleBridgeHandle(handle);
  let sdkHostedHandle = hostState.sdkHostedHandle;
  hostState.sdkHostedHandle = visibleHandle;
  updateSessionBridgeId(
    visibleHandle ? toCompatSessionId(visibleHandle.bridgeSessionId) : null,
    storageV5,
  ).catch(() => {});
  hostState.lastReportedPermissionMode = undefined;
  hostState.lastKnownPermissionMode = undefined;
  hostState.lastReportedEffort = undefined;
  hostState.lastKnownEffort = undefined;
  hostState.lastReportedUltracodeActive = undefined;
  hostState.lastKnownUltracodeActive = undefined;
  hostState.lastKnownEffortRequestId = undefined;
  hostState.lastReportedModel = undefined;
  hostState.lastKnownModel = undefined;
  hostState.contextUsageMirror = undefined;
  hostState.lastReportedArtifacts = undefined;
  hostState.lastKnownArtifacts = undefined;
  hostState.artifactsEgressSuppressed = undefined;
  hostState.lastReportedCrossSessionInbound = undefined;
  hostState.lastKnownCrossSessionInbound = undefined;
  hostState.lastKnownPostTurnSummary = undefined;
  swapDropSenderWriter(sdkHostedHandle, visibleHandle);
}
//@ chunk-5ktj1vf9.js:1357-1399 placement
function getSdkHostedBridgeHandle() {
  return bridgeHostState().sdkHostedHandle;
}
//@ chunk-5ktj1vf9.js:1399-2163 placement
/**
 * 保存当前 REPL 桥接句柄，并向桥接上报权限模式、模型、上下文用量、回合后摘要、artifact 等元数据。
 */
function setReplBridgeHandle(handle, storageV5) {
  let hostState = bridgeHostState();
  let visibleHandle = visibleBridgeHandle(handle);
  let replHandle = hostState.replHandle;
  hostState.replHandle = visibleHandle;
  hostState.lastReportedPermissionMode = undefined;
  hostState.lastKnownPermissionMode = undefined;
  hostState.lastReportedEffort = undefined;
  hostState.lastKnownEffort = undefined;
  hostState.lastReportedUltracodeActive = undefined;
  hostState.lastKnownUltracodeActive = undefined;
  hostState.lastKnownEffortRequestId = undefined;
  hostState.lastReportedModel = undefined;
  hostState.lastKnownModel = undefined;
  hostState.contextUsageMirror = undefined;
  hostState.lastReportedArtifacts = undefined;
  hostState.lastKnownArtifacts = undefined;
  hostState.artifactsEgressSuppressed = undefined;
  hostState.lastReportedCrossSessionInbound = undefined;
  hostState.lastKnownCrossSessionInbound = undefined;
  hostState.lastKnownPostTurnSummary = undefined;
  swapDropSenderWriter(replHandle, visibleHandle);
  let compatSessionId = visibleHandle ? toCompatSessionId(visibleHandle.bridgeSessionId) : undefined;
  if (compatSessionId !== undefined) process.env.CLAUDE_CODE_BRIDGE_SESSION_ID = compatSessionId;
  else delete process.env.CLAUDE_CODE_BRIDGE_SESSION_ID;
  updateSessionBridgeId(compatSessionId ?? null, storageV5).catch(() => {});
}
//@ chunk-5ktj1vf9.js:2163-2200 placement
function getReplBridgeHandle() {
  return bridgeHostState().replHandle;
}
//@ chunk-5ktj1vf9.js:2200-2322 placement
function retireBridgeHandle(handle, storageV5) {
  let hostState = bridgeHostState();
  hostState.retiredHandles.add(handle);
  if (hostState.replHandle === handle) setReplBridgeHandle(null, storageV5);
  if (hostState.sdkHostedHandle === handle) setSdkHostedBridgeHandle(null, storageV5);
}
//@ chunk-5ktj1vf9.js:2322-2637 placement
function reportBridgePermissionMode(mode, isUltraplanMode) {
  let hostState = bridgeHostState();
  let handle = hostState.replHandle ?? hostState.sdkHostedHandle;
  if (!handle || handle.outboundOnly) return;
  hostState.lastKnownPermissionMode = mode;
  if (mode === "bypassPermissions") return;
  let externalPermissionMode = toExternalPermissionMode(mode);
  if (hostState.lastReportedPermissionMode === externalPermissionMode) return;
  hostState.lastReportedPermissionMode = externalPermissionMode;
  handle.reportMetadata({
    permission_mode: externalPermissionMode,
    ...(isUltraplanMode !== undefined && {
      is_ultraplan_mode: isUltraplanMode,
    }),
  });
}
//@ chunk-5ktj1vf9.js:2637-2768 placement
function reseedBridgePermissionMode() {
  let hostState = bridgeHostState();
  hostState.lastReportedPermissionMode = undefined;
  if (hostState.lastKnownPermissionMode !== undefined)
    reportBridgePermissionMode(hostState.lastKnownPermissionMode);
}
//@ chunk-5ktj1vf9.js:2768-2819 placement
function getLastKnownBridgePermissionMode() {
  return bridgeHostState().lastKnownPermissionMode;
}
//@ chunk-5ktj1vf9.js:2819-3136 placement
function setSupervisedBridgeSession(sessionId, storageV5, owner) {
  let isSelfAddressable = isSelfAddressableSessionId(sessionId);
  if (!isSelfAddressable)
    logForDebugging(
      "[bridge] supervised session id refused (not a safe bridge id) \u2014 this child has no Remote Control identity for the peer surface",
      {
        level: "warn",
      },
    );
  bridgeHostState().supervisedBridgeSession = isSelfAddressable
    ? {
        bridgeSessionId: sessionId,
        owner,
        storageV5,
        selfTitle: undefined,
      }
    : null;
  updateSessionBridgeId(isSelfAddressable ? toCompatSessionId(sessionId) : null, storageV5).catch(() => {});
}
//@ chunk-5ktj1vf9.js:3136-3204 placement
function getSupervisedBridgeSessionId() {
  return bridgeHostState().supervisedBridgeSession?.bridgeSessionId;
}
//@ chunk-5ktj1vf9.js:3204-3379 placement
function adoptSelfBridgeTitleFromRoster(title) {
  let supervisedBridgeSession = bridgeHostState().supervisedBridgeSession;
  if (
    supervisedBridgeSession === null ||
    getReplBridgeHandle() !== null ||
    getSdkHostedBridgeHandle() !== null
  )
    return;
  supervisedBridgeSession.selfTitle = safeSelfTitle(title);
  if (supervisedBridgeSession.selfTitle !== undefined)
    adoptSuppliedSessionTitle(supervisedBridgeSession.selfTitle, supervisedBridgeSession.storageV5).catch(
      logError,
    );
}
//@ chunk-5ktj1vf9.js:3379-3441 placement
function safeSelfTitle(title) {
  return typeof title === "string" && clipTeammateText(title) !== "" ? title : undefined;
}
//@ chunk-5ktj1vf9.js:3441-3602 placement
/**
 * 按主机与凭据缓存对端身份键
 */
function getPeerIdentityKey(host) {
  let credentialKey = walkCredentialKey();
  let hostState = bridgeHostState();
  let peerIdentityKey = hostState.peerIdentityKey;
  if (
    peerIdentityKey !== null &&
    peerIdentityKey.host === host &&
    peerIdentityKey.credential === credentialKey
  )
    return peerIdentityKey;
  let key = {
    host,
    credential: credentialKey,
  };
  hostState.peerIdentityKey = key;
  return key;
}
//@ chunk-5ktj1vf9.js:3602-3789 placement
function walkCredentialKey() {
  let { sameOwnerAccount } = require("../utils/auth.js");
  let bridgeCredentialKey = resolveBridgeCredentialKey();
  let hostState = bridgeHostState();
  let walkCredentialKey = hostState.walkCredentialKey;
  if (walkCredentialKey !== null && sameOwnerAccount(walkCredentialKey.owner, bridgeCredentialKey))
    return walkCredentialKey;
  let key = {
    owner: bridgeCredentialKey,
  };
  hostState.walkCredentialKey = key;
  return key;
}
//@ chunk-5ktj1vf9.js:3789-4222 placement
/**
 * 推导桥接凭据键（会话 API bearer 指纹/OAuth/WIF 账号）
 */
function resolveBridgeCredentialKey() {
  let {
    sessionsApiBearerFingerprint,
    isConsoleProfileSessionsCredential,
  } = require("../utils/teleport/api.js");
  let { getStoredOauthAccountInfo } = require("../utils/auth.js");
  let { getWIFAccountInfo } = require("../utils/clearWIFAccountInfoCache.lazy.js");
  let { env } = require("../utils/env.js");
  let bearerFingerprint = sessionsApiBearerFingerprint();
  return {
    accountUuid: bearerFingerprint ? `bearer:${bearerFingerprint}` : undefined,
    organizationUuid: isConsoleProfileSessionsCredential()
      ? getWIFAccountInfo()?.organizationUuid?.trim() || undefined
      : env.CLAUDE_CODE_ORGANIZATION_UUID || getStoredOauthAccountInfo()?.organizationUuid,
  };
}
//@ chunk-5ktj1vf9.js:4222-4684 placement
async function primePeerIdentityOwner({ refresh, credentials }) {
  let { isCrossSessionMessagingEnabled } = require("../utils/crossSessionMessagingGate.js");
  if (!isCrossSessionMessagingEnabled()) return;
  if (!(
    getReplBridgeHandle() !== null ||
    getSdkHostedBridgeHandle() !== null ||
    bridgeHostState().supervisedBridgeSession !== null
  )) {
    let { hasCloudPeerAccess } = require("./hasCloudPeerAccess.lazy.js");
    if (!hasCloudPeerAccess()) return;
  }
  let { primeSessionsApiBearer } = require("../utils/teleport/api.js");
  let primePromise = primeSessionsApiBearer({
    refresh,
    credentials,
  }).catch(() => {});
  if (refresh) {
    await primePromise;
    return;
  }
  let { withDeadline } = require("../utils/sleep.js");
  await withDeadline(primePromise, PEER_IDENTITY_DEADLINE_MS);
}
//@ chunk-5ktj1vf9.js:4684-4694 placement
var PEER_IDENTITY_DEADLINE_MS = 750;
//@ chunk-5ktj1vf9.js:4694-4938 placement
function getPeerBridgeIdentity() {
  let handle = getReplBridgeHandle() ?? getSdkHostedBridgeHandle();
  if (handle)
    return {
      key: getPeerIdentityKey(handle),
      bridgeSessionId: handle.bridgeSessionId,
      selfTitle: handle.selfTitle,
      live: isReplBridgeActive(),
    };
  let supervisedBridgeSession = bridgeHostState().supervisedBridgeSession;
  return supervisedBridgeSession
    ? {
        key: getPeerIdentityKey(supervisedBridgeSession),
        bridgeSessionId: supervisedBridgeSession.bridgeSessionId,
        selfTitle: supervisedBridgeSession.selfTitle,
        live: true,
      }
    : null;
}
//@ chunk-5ktj1vf9.js:4938-5223 placement
function reportBridgeCrossSessionInbound(lastKnownCrossSessionInbound) {
  let hostState = bridgeHostState();
  let handle = hostState.replHandle ?? hostState.sdkHostedHandle;
  if (!handle || handle.outboundOnly) return;
  hostState.lastKnownCrossSessionInbound = lastKnownCrossSessionInbound;
  let value = lastKnownCrossSessionInbound ? "available" : "unavailable";
  if (hostState.lastReportedCrossSessionInbound === value) return;
  hostState.lastReportedCrossSessionInbound = value;
  handle.reportMetadata({
    cross_session_inbound: value,
  });
}
//@ chunk-5ktj1vf9.js:5223-5369 placement
function reseedBridgeCrossSessionInbound() {
  let hostState = bridgeHostState();
  hostState.lastReportedCrossSessionInbound = undefined;
  if (hostState.lastKnownCrossSessionInbound !== undefined)
    reportBridgeCrossSessionInbound(hostState.lastKnownCrossSessionInbound);
}
//@ chunk-5ktj1vf9.js:5369-5589 placement
/**
 * 把回合后摘要上报到桥接句柄元数据
 */
function reportPostTurnSummary(summary) {
  let hostState = bridgeHostState();
  let handle = hostState.replHandle ?? hostState.sdkHostedHandle;
  let remoteEgressSuppressed = hostState.remoteEgressSuppressed;
  if (
    !handle ||
    handle.outboundOnly ||
    handle.noHistoryBackfill ||
    remoteEgressSuppressed === null ||
    remoteEgressSuppressed()
  )
    return;
  hostState.lastKnownPostTurnSummary = summary;
  handle.reportMetadata({
    post_turn_summary: summary,
  });
}
//@ chunk-5ktj1vf9.js:5589-5760 placement
function publishPostTurnSummary(handle, summary, options) {
  let metadata = {
    post_turn_summary: summary,
  };
  if (options) handle?.notifyMetadataChanged(metadata, options);
  else handle?.notifyMetadataChanged(metadata);
  if (handle?.onMetadataChanged) return;
  try {
    reportPostTurnSummary(summary);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-5ktj1vf9.js:5760-5810 placement
function noteBridgePostTurnSummaryWiped() {
  bridgeHostState().lastKnownPostTurnSummary = null;
}
//@ chunk-5ktj1vf9.js:5810-5871 placement
function reseedBridgePostTurnSummary() {
  let lastKnownPostTurnSummary = bridgeHostState().lastKnownPostTurnSummary;
  if (lastKnownPostTurnSummary) reportPostTurnSummary(lastKnownPostTurnSummary);
}
//@ chunk-5ktj1vf9.js:5871-6064 placement
function reportBridgeModel(model) {
  let hostState = bridgeHostState();
  let handle = hostState.replHandle ?? hostState.sdkHostedHandle;
  if (!handle || handle.outboundOnly) return;
  hostState.lastKnownModel = model;
  if (hostState.lastReportedModel === model) return;
  hostState.lastReportedModel = model;
  handle.reportMetadata({
    model,
  });
}
//@ chunk-5ktj1vf9.js:6064-6168 placement
function reseedBridgeModel() {
  let hostState = bridgeHostState();
  hostState.lastReportedModel = undefined;
  if (hostState.lastKnownModel !== undefined) reportBridgeModel(hostState.lastKnownModel);
}
//@ chunk-5ktj1vf9.js:6168-6217 placement
function reseedBridgeContextUsage() {
  bridgeHostState().contextUsageMirror?.resend();
}
//@ chunk-5ktj1vf9.js:6217-6545 placement
function reportBridgeArtifacts(artifacts, isSuppressed) {
  let hostState = bridgeHostState();
  let handle = hostState.replHandle ?? hostState.sdkHostedHandle;
  let serialized = jsonStringify(artifacts);
  if (
    !handle ||
    handle.outboundOnly ||
    handle.noHistoryBackfill ||
    isSuppressed() ||
    hostState.lastReportedArtifacts === serialized ||
    (artifacts.length === 0 && hostState.lastKnownArtifacts === undefined)
  )
    return;
  hostState.lastKnownArtifacts = artifacts;
  hostState.lastReportedArtifacts = serialized;
  hostState.artifactsEgressSuppressed = isSuppressed;
  handle.reportMetadata({
    artifacts: artifacts.length === 0 ? null : artifacts,
  });
}
//@ chunk-5ktj1vf9.js:6545-6709 placement
function reseedBridgeArtifacts() {
  let state = bridgeHostState();
  state.lastReportedArtifacts = undefined;
  if (state.lastKnownArtifacts && state.artifactsEgressSuppressed)
    reportBridgeArtifacts(state.lastKnownArtifacts, state.artifactsEgressSuppressed);
}
//@ chunk-5ktj1vf9.js:6709-6774 placement
function getSelfBridgeCompatId() {
  let peerBridgeIdentity = getPeerBridgeIdentity();
  return peerBridgeIdentity ? toCompatSessionId(peerBridgeIdentity.bridgeSessionId) : undefined;
}
//@ chunk-5ktj1vf9.js:6774-6824 placement
function ownBridgePeerAddress() {
  let selfBridgeCompatId = getSelfBridgeCompatId();
  return selfBridgeCompatId ? bridgeAddressFromToken(selfBridgeCompatId) : undefined;
}
//@ chunk-5ktj1vf9.js:6824-6905 placement = getSelfBridgeCompatId (0.637)
/**
 * 若当前有非 outbound-only 的桥，返回其桥会话 ID 的 session_* 兼容形式，否则 undefined。
 */
function getRemoteControlSessionCompatId() {
  let replBridgeHandle = getReplBridgeHandle();
  return replBridgeHandle && !replBridgeHandle.outboundOnly
    ? toCompatSessionId(replBridgeHandle.bridgeSessionId)
    : undefined;
}
//@ chunk-5ktj1vf9.js:6905-6944 placement
function getSelfBridgeTitle() {
  return getPeerBridgeIdentity()?.selfTitle;
}
//@ chunk-5ktj1vf9.js:6944-7032 placement
function setSelfBridgeTitle(bridgeSessionId, title) {
  let handle = getReplBridgeHandle() ?? getSdkHostedBridgeHandle();
  if (handle && sessionIdBody(handle.bridgeSessionId) === sessionIdBody(bridgeSessionId))
    handle.selfTitle = safeSelfTitle(title);
}
//@ chunk-5ktj1vf9.js:7032-7097 placement
function visibleBridgeHandle(handle) {
  return handle !== null && bridgeHostState().retiredHandles.has(handle) ? null : handle;
}
export {
  getReplBridgeHandle,
  getSdkHostedBridgeHandle,
  ownBridgePeerAddress,
  setSdkHostedBridgeHandle,
  reportBridgeModel,
  reportBridgePermissionMode,
  reportBridgeCrossSessionInbound,
  setSupervisedBridgeSession,
  setReplBridgeHandle,
  getPeerBridgeIdentity,
  primePeerIdentityOwner,
  noteBridgePostTurnSummaryWiped,
  reseedBridgePermissionMode,
  reseedBridgeCrossSessionInbound,
  reseedBridgeModel,
  reseedBridgeArtifacts,
  reseedBridgePostTurnSummary,
  reseedBridgeContextUsage,
  getRemoteControlSessionCompatId,
  reportBridgeArtifacts,
  setSelfBridgeTitle,
  retireBridgeHandle,
  getSelfBridgeCompatId,
  adoptSelfBridgeTitleFromRoster,
  getSelfBridgeTitle,
  publishPostTurnSummary,
  getLastKnownBridgePermissionMode,
  getSupervisedBridgeSessionId,
  walkCredentialKey,
};
