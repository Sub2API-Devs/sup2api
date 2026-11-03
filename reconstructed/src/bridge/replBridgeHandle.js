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
function swapDropSenderWriter(e, r) {
  let dropSenderWriterByHandle = bridgeHostState().dropSenderWriterByHandle;
  if (e !== null && e !== r) {
    let o = dropSenderWriterByHandle.get(e);
    if (o) clearSenderDropWriter(o);
  }
  if (r !== null && r !== e && !r.outboundOnly) {
    let senderDropWriter = dropSenderWriterByHandle.get(r);
    if (!senderDropWriter) {
      senderDropWriter = (s) => {
        r.writeSdkMessages([s]);
      };
      dropSenderWriterByHandle.set(r, senderDropWriter);
    }
    setSenderDropWriter(senderDropWriter);
  }
}
//@ chunk-5ktj1vf9.js:711-1357 placement
function setSdkHostedBridgeHandle(e, storageV5) {
  let n = bridgeHostState();
  let o = visibleBridgeHandle(e);
  let sdkHostedHandle = n.sdkHostedHandle;
  n.sdkHostedHandle = o;
  updateSessionBridgeId(o ? toCompatSessionId(o.bridgeSessionId) : null, storageV5).catch(() => {});
  n.lastReportedPermissionMode = undefined;
  n.lastKnownPermissionMode = undefined;
  n.lastReportedEffort = undefined;
  n.lastKnownEffort = undefined;
  n.lastReportedUltracodeActive = undefined;
  n.lastKnownUltracodeActive = undefined;
  n.lastKnownEffortRequestId = undefined;
  n.lastReportedModel = undefined;
  n.lastKnownModel = undefined;
  n.contextUsageMirror = undefined;
  n.lastReportedArtifacts = undefined;
  n.lastKnownArtifacts = undefined;
  n.artifactsEgressSuppressed = undefined;
  n.lastReportedCrossSessionInbound = undefined;
  n.lastKnownCrossSessionInbound = undefined;
  n.lastKnownPostTurnSummary = undefined;
  swapDropSenderWriter(sdkHostedHandle, o);
}
//@ chunk-5ktj1vf9.js:1357-1399 placement
function getSdkHostedBridgeHandle() {
  return bridgeHostState().sdkHostedHandle;
}
//@ chunk-5ktj1vf9.js:1399-2163 placement
/**
 * 保存当前 REPL 桥接句柄，并向桥接上报权限模式、模型、上下文用量、回合后摘要、artifact 等元数据。
 */
function setReplBridgeHandle(e, storageV5) {
  let n = bridgeHostState();
  let o = visibleBridgeHandle(e);
  let replHandle = n.replHandle;
  n.replHandle = o;
  n.lastReportedPermissionMode = undefined;
  n.lastKnownPermissionMode = undefined;
  n.lastReportedEffort = undefined;
  n.lastKnownEffort = undefined;
  n.lastReportedUltracodeActive = undefined;
  n.lastKnownUltracodeActive = undefined;
  n.lastKnownEffortRequestId = undefined;
  n.lastReportedModel = undefined;
  n.lastKnownModel = undefined;
  n.contextUsageMirror = undefined;
  n.lastReportedArtifacts = undefined;
  n.lastKnownArtifacts = undefined;
  n.artifactsEgressSuppressed = undefined;
  n.lastReportedCrossSessionInbound = undefined;
  n.lastKnownCrossSessionInbound = undefined;
  n.lastKnownPostTurnSummary = undefined;
  swapDropSenderWriter(replHandle, o);
  let i = o ? toCompatSessionId(o.bridgeSessionId) : undefined;
  if (i !== undefined) process.env.CLAUDE_CODE_BRIDGE_SESSION_ID = i;
  else delete process.env.CLAUDE_CODE_BRIDGE_SESSION_ID;
  updateSessionBridgeId(i ?? null, storageV5).catch(() => {});
}
//@ chunk-5ktj1vf9.js:2163-2200 placement
function getReplBridgeHandle() {
  return bridgeHostState().replHandle;
}
//@ chunk-5ktj1vf9.js:2200-2322 placement
function retireBridgeHandle(e, storageV5) {
  let n = bridgeHostState();
  n.retiredHandles.add(e);
  if (n.replHandle === e) setReplBridgeHandle(null, storageV5);
  if (n.sdkHostedHandle === e) setSdkHostedBridgeHandle(null, storageV5);
}
//@ chunk-5ktj1vf9.js:2322-2637 placement
function reportBridgePermissionMode(mode, isUltraplanMode) {
  let n = bridgeHostState();
  let o = n.replHandle ?? n.sdkHostedHandle;
  if (!o || o.outboundOnly) return;
  n.lastKnownPermissionMode = mode;
  if (mode === "bypassPermissions") return;
  let externalPermissionMode = toExternalPermissionMode(mode);
  if (n.lastReportedPermissionMode === externalPermissionMode) return;
  n.lastReportedPermissionMode = externalPermissionMode;
  o.reportMetadata({
    permission_mode: externalPermissionMode,
    ...(isUltraplanMode !== undefined && {
      is_ultraplan_mode: isUltraplanMode,
    }),
  });
}
//@ chunk-5ktj1vf9.js:2637-2768 placement
function reseedBridgePermissionMode() {
  let e = bridgeHostState();
  e.lastReportedPermissionMode = undefined;
  if (e.lastKnownPermissionMode !== undefined) reportBridgePermissionMode(e.lastKnownPermissionMode);
}
//@ chunk-5ktj1vf9.js:2768-2819 placement
function getLastKnownBridgePermissionMode() {
  return bridgeHostState().lastKnownPermissionMode;
}
//@ chunk-5ktj1vf9.js:2819-3136 placement
function setSupervisedBridgeSession(e, storageV5, owner) {
  let o = isSelfAddressableSessionId(e);
  if (!o)
    logForDebugging(
      "[bridge] supervised session id refused (not a safe bridge id) \u2014 this child has no Remote Control identity for the peer surface",
      {
        level: "warn",
      },
    );
  bridgeHostState().supervisedBridgeSession = o
    ? {
        bridgeSessionId: e,
        owner,
        storageV5,
        selfTitle: undefined,
      }
    : null;
  updateSessionBridgeId(o ? toCompatSessionId(e) : null, storageV5).catch(() => {});
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
function safeSelfTitle(e) {
  return typeof e === "string" && clipTeammateText(e) !== "" ? e : undefined;
}
//@ chunk-5ktj1vf9.js:3441-3602 placement
/**
 * 按主机与凭据缓存对端身份键
 */
function getPeerIdentityKey(e) {
  let r = walkCredentialKey();
  let n = bridgeHostState();
  let peerIdentityKey = n.peerIdentityKey;
  if (peerIdentityKey !== null && peerIdentityKey.host === e && peerIdentityKey.credential === r)
    return peerIdentityKey;
  let s = {
    host: e,
    credential: r,
  };
  n.peerIdentityKey = s;
  return s;
}
//@ chunk-5ktj1vf9.js:3602-3789 placement
function walkCredentialKey() {
  let { sameOwnerAccount } = require("./chunk-7v0gj88m.js");
  let bridgeCredentialKey = resolveBridgeCredentialKey();
  let n = bridgeHostState();
  let walkCredentialKey = n.walkCredentialKey;
  if (walkCredentialKey !== null && sameOwnerAccount(walkCredentialKey.owner, bridgeCredentialKey))
    return walkCredentialKey;
  let s = {
    owner: bridgeCredentialKey,
  };
  n.walkCredentialKey = s;
  return s;
}
//@ chunk-5ktj1vf9.js:3789-4222 placement
/**
 * 推导桥接凭据键（会话 API bearer 指纹/OAuth/WIF 账号）
 */
function resolveBridgeCredentialKey() {
  let { sessionsApiBearerFingerprint, isConsoleProfileSessionsCredential } = require("./chunk-6phxatm7.js");
  let { getStoredOauthAccountInfo } = require("./chunk-7v0gj88m.js");
  let { getWIFAccountInfo } = require("./chunk-z7cz2amc.js");
  let { env } = require("./chunk-sa88k60q.js");
  let i = sessionsApiBearerFingerprint();
  return {
    accountUuid: i ? `bearer:${i}` : undefined,
    organizationUuid: isConsoleProfileSessionsCredential()
      ? getWIFAccountInfo()?.organizationUuid?.trim() || undefined
      : env.CLAUDE_CODE_ORGANIZATION_UUID || getStoredOauthAccountInfo()?.organizationUuid,
  };
}
//@ chunk-5ktj1vf9.js:4222-4684 placement
async function primePeerIdentityOwner({ refresh, credentials }) {
  let { isCrossSessionMessagingEnabled } = require("./chunk-nv1s3402.js");
  if (!isCrossSessionMessagingEnabled()) return;
  if (!(
    getReplBridgeHandle() !== null ||
    getSdkHostedBridgeHandle() !== null ||
    bridgeHostState().supervisedBridgeSession !== null
  )) {
    let { hasCloudPeerAccess } = require("./chunk-96k5yyba.js");
    if (!hasCloudPeerAccess()) return;
  }
  let { primeSessionsApiBearer } = require("./chunk-6phxatm7.js");
  let i = primeSessionsApiBearer({
    refresh,
    credentials,
  }).catch(() => {});
  if (refresh) {
    await i;
    return;
  }
  let { withDeadline } = require("./chunk-c1wxfrj3.js");
  await withDeadline(i, PEER_IDENTITY_DEADLINE_MS);
}
//@ chunk-5ktj1vf9.js:4684-4694 placement
var PEER_IDENTITY_DEADLINE_MS = 750;
//@ chunk-5ktj1vf9.js:4694-4938 placement
function getPeerBridgeIdentity() {
  let e = getReplBridgeHandle() ?? getSdkHostedBridgeHandle();
  if (e)
    return {
      key: getPeerIdentityKey(e),
      bridgeSessionId: e.bridgeSessionId,
      selfTitle: e.selfTitle,
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
  let r = bridgeHostState();
  let n = r.replHandle ?? r.sdkHostedHandle;
  if (!n || n.outboundOnly) return;
  r.lastKnownCrossSessionInbound = lastKnownCrossSessionInbound;
  let o = lastKnownCrossSessionInbound ? "available" : "unavailable";
  if (r.lastReportedCrossSessionInbound === o) return;
  r.lastReportedCrossSessionInbound = o;
  n.reportMetadata({
    cross_session_inbound: o,
  });
}
//@ chunk-5ktj1vf9.js:5223-5369 placement
function reseedBridgeCrossSessionInbound() {
  let e = bridgeHostState();
  e.lastReportedCrossSessionInbound = undefined;
  if (e.lastKnownCrossSessionInbound !== undefined)
    reportBridgeCrossSessionInbound(e.lastKnownCrossSessionInbound);
}
//@ chunk-5ktj1vf9.js:5369-5589 placement
/**
 * 把回合后摘要上报到桥接句柄元数据
 */
function reportPostTurnSummary(e) {
  let r = bridgeHostState();
  let n = r.replHandle ?? r.sdkHostedHandle;
  let remoteEgressSuppressed = r.remoteEgressSuppressed;
  if (
    !n ||
    n.outboundOnly ||
    n.noHistoryBackfill ||
    remoteEgressSuppressed === null ||
    remoteEgressSuppressed()
  )
    return;
  r.lastKnownPostTurnSummary = e;
  n.reportMetadata({
    post_turn_summary: e,
  });
}
//@ chunk-5ktj1vf9.js:5589-5760 placement
function publishPostTurnSummary(sessionState, r, n) {
  let o = {
    post_turn_summary: r,
  };
  if (n) sessionState?.notifyMetadataChanged(o, n);
  else sessionState?.notifyMetadataChanged(o);
  if (sessionState?.onMetadataChanged) return;
  try {
    reportPostTurnSummary(r);
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
function reportBridgeModel(e) {
  let r = bridgeHostState();
  let n = r.replHandle ?? r.sdkHostedHandle;
  if (!n || n.outboundOnly) return;
  r.lastKnownModel = e;
  if (r.lastReportedModel === e) return;
  r.lastReportedModel = e;
  n.reportMetadata({
    model: e,
  });
}
//@ chunk-5ktj1vf9.js:6064-6168 placement
function reseedBridgeModel() {
  let e = bridgeHostState();
  e.lastReportedModel = undefined;
  if (e.lastKnownModel !== undefined) reportBridgeModel(e.lastKnownModel);
}
//@ chunk-5ktj1vf9.js:6168-6217 placement
function reseedBridgeContextUsage() {
  bridgeHostState().contextUsageMirror?.resend();
}
//@ chunk-5ktj1vf9.js:6217-6545 placement
function reportBridgeArtifacts(e, r) {
  let n = bridgeHostState();
  let o = n.replHandle ?? n.sdkHostedHandle;
  let s = jsonStringify(e);
  if (
    !o ||
    o.outboundOnly ||
    o.noHistoryBackfill ||
    r() ||
    n.lastReportedArtifacts === s ||
    (e.length === 0 && n.lastKnownArtifacts === undefined)
  )
    return;
  n.lastKnownArtifacts = e;
  n.lastReportedArtifacts = s;
  n.artifactsEgressSuppressed = r;
  o.reportMetadata({
    artifacts: e.length === 0 ? null : e,
  });
}
//@ chunk-5ktj1vf9.js:6545-6709 placement
function reseedBridgeArtifacts() {
  let e = bridgeHostState();
  e.lastReportedArtifacts = undefined;
  if (e.lastKnownArtifacts && e.artifactsEgressSuppressed)
    reportBridgeArtifacts(e.lastKnownArtifacts, e.artifactsEgressSuppressed);
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
  let n = getReplBridgeHandle() ?? getSdkHostedBridgeHandle();
  if (n && sessionIdBody(n.bridgeSessionId) === sessionIdBody(bridgeSessionId))
    n.selfTitle = safeSelfTitle(title);
}
//@ chunk-5ktj1vf9.js:7032-7097 placement
function visibleBridgeHandle(e) {
  return e !== null && bridgeHostState().retiredHandles.has(e) ? null : e;
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
};
