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
import { ao } from "./bridgeHostState.js";
import { clearSenderDropWriter, setSenderDropWriter } from "./deviceAttestation.js";
import { updateSessionBridgeId, adoptSuppliedSessionTitle } from "../utils/concurrentSessions.js";
import { toCompatSessionId, isSelfAddressableSessionId, sessionIdBody } from "./sessionIdCompat.js";
import { toExternalPermissionMode } from "../utils/permissions/PermissionMode.js";
import { logForDebugging } from "../utils/debug.js";
import { logError } from "../utils/log.js";
import { Hb } from "../utils/swarm/teammateIds.js";
import { isReplBridgeActive } from "../bootstrap/state.js";
import { jsonStringify } from "../utils/slowOperations.js";
import { DBe } from "../utils/peerMessageHeaders.js";

/**
 * 句柄切换时替换丢弃消息的写出器
 */
//@ chunk-5ktj1vf9.js:502-711 placement
function swapDropSenderWriter(e, r) {
  let dropSenderWriterByHandle = ao().dropSenderWriterByHandle;
  if (e !== null && e !== r) {
    let o = dropSenderWriterByHandle.get(e);
    if (o) clearSenderDropWriter(o);
  }
  if (r !== null && r !== e && !r.outboundOnly) {
    let o = dropSenderWriterByHandle.get(r);
    if (!o)
      ((o = (s) => {
        r.writeSdkMessages([s]);
      }),
        dropSenderWriterByHandle.set(r, o));
    setSenderDropWriter(o);
  }
}
//@ chunk-5ktj1vf9.js:711-1357 placement
function setSdkHostedBridgeHandle(e, r) {
  let n = ao(),
    o = p(e),
    sdkHostedHandle = n.sdkHostedHandle;
  ((n.sdkHostedHandle = o),
    updateSessionBridgeId(o ? toCompatSessionId(o.bridgeSessionId) : null, r).catch(() => {}),
    (n.lastReportedPermissionMode = void 0),
    (n.lastKnownPermissionMode = void 0),
    (n.lastReportedEffort = void 0),
    (n.lastKnownEffort = void 0),
    (n.lastReportedUltracodeActive = void 0),
    (n.lastKnownUltracodeActive = void 0),
    (n.lastKnownEffortRequestId = void 0),
    (n.lastReportedModel = void 0),
    (n.lastKnownModel = void 0),
    (n.contextUsageMirror = void 0),
    (n.lastReportedArtifacts = void 0),
    (n.lastKnownArtifacts = void 0),
    (n.artifactsEgressSuppressed = void 0),
    (n.lastReportedCrossSessionInbound = void 0),
    (n.lastKnownCrossSessionInbound = void 0),
    (n.lastKnownPostTurnSummary = void 0),
    swapDropSenderWriter(sdkHostedHandle, o));
}
//@ chunk-5ktj1vf9.js:1357-1399 placement
function getSdkHostedBridgeHandle() {
  return ao().sdkHostedHandle;
}
/**
 * 保存当前 REPL 桥接句柄，并向桥接上报权限模式、模型、上下文用量、回合后摘要、artifact 等元数据。
 */
//@ chunk-5ktj1vf9.js:1399-2163 placement
function setReplBridgeHandle(e, r) {
  let n = ao(),
    o = p(e),
    replHandle = n.replHandle;
  ((n.replHandle = o),
    (n.lastReportedPermissionMode = void 0),
    (n.lastKnownPermissionMode = void 0),
    (n.lastReportedEffort = void 0),
    (n.lastKnownEffort = void 0),
    (n.lastReportedUltracodeActive = void 0),
    (n.lastKnownUltracodeActive = void 0),
    (n.lastKnownEffortRequestId = void 0),
    (n.lastReportedModel = void 0),
    (n.lastKnownModel = void 0),
    (n.contextUsageMirror = void 0),
    (n.lastReportedArtifacts = void 0),
    (n.lastKnownArtifacts = void 0),
    (n.artifactsEgressSuppressed = void 0),
    (n.lastReportedCrossSessionInbound = void 0),
    (n.lastKnownCrossSessionInbound = void 0),
    (n.lastKnownPostTurnSummary = void 0),
    swapDropSenderWriter(replHandle, o));
  let i = o ? toCompatSessionId(o.bridgeSessionId) : void 0;
  if (i !== void 0) process.env.CLAUDE_CODE_BRIDGE_SESSION_ID = i;
  else delete process.env.CLAUDE_CODE_BRIDGE_SESSION_ID;
  updateSessionBridgeId(i ?? null, r).catch(() => {});
}
//@ chunk-5ktj1vf9.js:2163-2200 placement
function getReplBridgeHandle() {
  return ao().replHandle;
}
//@ chunk-5ktj1vf9.js:2200-2322 placement
function retireBridgeHandle(e, r) {
  let n = ao();
  if ((n.retiredHandles.add(e), n.replHandle === e)) setReplBridgeHandle(null, r);
  if (n.sdkHostedHandle === e) setSdkHostedBridgeHandle(null, r);
}
//@ chunk-5ktj1vf9.js:2322-2637 placement
function reportBridgePermissionMode(e, r) {
  let n = ao(),
    o = n.replHandle ?? n.sdkHostedHandle;
  if (!o || o.outboundOnly) return;
  if (((n.lastKnownPermissionMode = e), e === "bypassPermissions")) return;
  let s = toExternalPermissionMode(e);
  if (n.lastReportedPermissionMode === s) return;
  ((n.lastReportedPermissionMode = s),
    o.reportMetadata({ permission_mode: s, ...(r !== void 0 && { is_ultraplan_mode: r }) }));
}
//@ chunk-5ktj1vf9.js:2637-2768 placement
function reseedBridgePermissionMode() {
  let e = ao();
  if (((e.lastReportedPermissionMode = void 0), e.lastKnownPermissionMode !== void 0))
    reportBridgePermissionMode(e.lastKnownPermissionMode);
}
//@ chunk-5ktj1vf9.js:2768-2819 placement
function getLastKnownBridgePermissionMode() {
  return ao().lastKnownPermissionMode;
}
//@ chunk-5ktj1vf9.js:2819-3136 placement
function setSupervisedBridgeSession(e, r, n) {
  let o = isSelfAddressableSessionId(e);
  if (!o)
    logForDebugging(
      "[bridge] supervised session id refused (not a safe bridge id) \u2014 this child has no Remote Control identity for the peer surface",
      { level: "warn" },
    );
  ((ao().supervisedBridgeSession = o
    ? { bridgeSessionId: e, owner: n, storageV5: r, selfTitle: void 0 }
    : null),
    updateSessionBridgeId(o ? toCompatSessionId(e) : null, r).catch(() => {}));
}
//@ chunk-5ktj1vf9.js:3136-3204 placement
function getSupervisedBridgeSessionId() {
  return ao().supervisedBridgeSession?.bridgeSessionId;
}
//@ chunk-5ktj1vf9.js:3204-3379 placement
function adoptSelfBridgeTitleFromRoster(e) {
  let supervisedBridgeSession = ao().supervisedBridgeSession;
  if (
    supervisedBridgeSession === null ||
    getReplBridgeHandle() !== null ||
    getSdkHostedBridgeHandle() !== null
  )
    return;
  if (((supervisedBridgeSession.selfTitle = a(e)), supervisedBridgeSession.selfTitle !== void 0))
    adoptSuppliedSessionTitle(supervisedBridgeSession.selfTitle, supervisedBridgeSession.storageV5).catch(
      logError,
    );
}
//@ chunk-5ktj1vf9.js:3379-3441 placement
function a(e) {
  return typeof e === "string" && Hb(e) !== "" ? e : void 0;
}
/**
 * 按主机与凭据缓存对端身份键
 */
//@ chunk-5ktj1vf9.js:3441-3602 placement
function getPeerIdentityKey(e) {
  let r = walkCredentialKey(),
    n = ao(),
    peerIdentityKey = n.peerIdentityKey;
  if (peerIdentityKey !== null && peerIdentityKey.host === e && peerIdentityKey.credential === r)
    return peerIdentityKey;
  let s = { host: e, credential: r };
  return ((n.peerIdentityKey = s), s);
}
//@ chunk-5ktj1vf9.js:3602-3789 placement
function walkCredentialKey() {
  let { sameOwnerAccount: sameOwnerAccount } = require("./chunk-7v0gj88m.js"),
    r = resolveBridgeCredentialKey(),
    n = ao(),
    walkCredentialKey = n.walkCredentialKey;
  if (walkCredentialKey !== null && sameOwnerAccount(walkCredentialKey.owner, r)) return walkCredentialKey;
  let s = { owner: r };
  return ((n.walkCredentialKey = s), s);
}
/**
 * 推导桥接凭据键（会话 API bearer 指纹/OAuth/WIF 账号）
 */
//@ chunk-5ktj1vf9.js:3789-4222 placement
function resolveBridgeCredentialKey() {
  let {
      sessionsApiBearerFingerprint: sessionsApiBearerFingerprint,
      isConsoleProfileSessionsCredential: isConsoleProfileSessionsCredential,
    } = require("./chunk-6phxatm7.js"),
    { getStoredOauthAccountInfo: getStoredOauthAccountInfo } = require("./chunk-7v0gj88m.js"),
    { getWIFAccountInfo: getWIFAccountInfo } = require("./chunk-z7cz2amc.js"),
    { env: env } = require("./chunk-sa88k60q.js"),
    i = sessionsApiBearerFingerprint();
  return {
    accountUuid: i ? `bearer:${i}` : void 0,
    organizationUuid: isConsoleProfileSessionsCredential()
      ? getWIFAccountInfo()?.organizationUuid?.trim() || void 0
      : env.CLAUDE_CODE_ORGANIZATION_UUID || getStoredOauthAccountInfo()?.organizationUuid,
  };
}
//@ chunk-5ktj1vf9.js:4222-4684 placement
async function primePeerIdentityOwner({ refresh: refresh, credentials: credentials }) {
  let { isCrossSessionMessagingEnabled: isCrossSessionMessagingEnabled } = require("./chunk-nv1s3402.js");
  if (!isCrossSessionMessagingEnabled()) return;
  if (!(
    getReplBridgeHandle() !== null ||
    getSdkHostedBridgeHandle() !== null ||
    ao().supervisedBridgeSession !== null
  )) {
    let { hasCloudPeerAccess: hasCloudPeerAccess } = require("./chunk-96k5yyba.js");
    if (!hasCloudPeerAccess()) return;
  }
  let { primeSessionsApiBearer: primeSessionsApiBearer } = require("./chunk-6phxatm7.js"),
    i = primeSessionsApiBearer({ refresh: refresh, credentials: credentials }).catch(() => {});
  if (refresh) {
    await i;
    return;
  }
  let { withDeadline: withDeadline } = require("./chunk-c1wxfrj3.js");
  await withDeadline(i, S);
}
//@ chunk-5ktj1vf9.js:4684-4694 placement
var S = 750;
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
  let supervisedBridgeSession = ao().supervisedBridgeSession;
  return supervisedBridgeSession
    ? {
        key: getPeerIdentityKey(supervisedBridgeSession),
        bridgeSessionId: supervisedBridgeSession.bridgeSessionId,
        selfTitle: supervisedBridgeSession.selfTitle,
        live: !0,
      }
    : null;
}
//@ chunk-5ktj1vf9.js:4938-5223 placement
function reportBridgeCrossSessionInbound(e) {
  let r = ao(),
    n = r.replHandle ?? r.sdkHostedHandle;
  if (!n || n.outboundOnly) return;
  r.lastKnownCrossSessionInbound = e;
  let o = e ? "available" : "unavailable";
  if (r.lastReportedCrossSessionInbound === o) return;
  ((r.lastReportedCrossSessionInbound = o), n.reportMetadata({ cross_session_inbound: o }));
}
//@ chunk-5ktj1vf9.js:5223-5369 placement
function reseedBridgeCrossSessionInbound() {
  let e = ao();
  if (((e.lastReportedCrossSessionInbound = void 0), e.lastKnownCrossSessionInbound !== void 0))
    reportBridgeCrossSessionInbound(e.lastKnownCrossSessionInbound);
}
/**
 * 把回合后摘要上报到桥接句柄元数据
 */
//@ chunk-5ktj1vf9.js:5369-5589 placement
function reportPostTurnSummary(e) {
  let r = ao(),
    n = r.replHandle ?? r.sdkHostedHandle,
    remoteEgressSuppressed = r.remoteEgressSuppressed;
  if (
    !n ||
    n.outboundOnly ||
    n.noHistoryBackfill ||
    remoteEgressSuppressed === null ||
    remoteEgressSuppressed()
  )
    return;
  ((r.lastKnownPostTurnSummary = e), n.reportMetadata({ post_turn_summary: e }));
}
//@ chunk-5ktj1vf9.js:5589-5760 placement
function publishPostTurnSummary(e, r, n) {
  let o = { post_turn_summary: r };
  if (n) e?.notifyMetadataChanged(o, n);
  else e?.notifyMetadataChanged(o);
  if (e?.onMetadataChanged) return;
  try {
    reportPostTurnSummary(r);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-5ktj1vf9.js:5760-5810 placement
function noteBridgePostTurnSummaryWiped() {
  ao().lastKnownPostTurnSummary = null;
}
//@ chunk-5ktj1vf9.js:5810-5871 placement
function reseedBridgePostTurnSummary() {
  let lastKnownPostTurnSummary = ao().lastKnownPostTurnSummary;
  if (lastKnownPostTurnSummary) reportPostTurnSummary(lastKnownPostTurnSummary);
}
//@ chunk-5ktj1vf9.js:5871-6064 placement
function reportBridgeModel(e) {
  let r = ao(),
    n = r.replHandle ?? r.sdkHostedHandle;
  if (!n || n.outboundOnly) return;
  if (((r.lastKnownModel = e), r.lastReportedModel === e)) return;
  ((r.lastReportedModel = e), n.reportMetadata({ model: e }));
}
//@ chunk-5ktj1vf9.js:6064-6168 placement
function reseedBridgeModel() {
  let e = ao();
  if (((e.lastReportedModel = void 0), e.lastKnownModel !== void 0)) reportBridgeModel(e.lastKnownModel);
}
//@ chunk-5ktj1vf9.js:6168-6217 placement
function reseedBridgeContextUsage() {
  ao().contextUsageMirror?.resend();
}
//@ chunk-5ktj1vf9.js:6217-6545 placement
function reportBridgeArtifacts(e, r) {
  let n = ao(),
    o = n.replHandle ?? n.sdkHostedHandle,
    s = jsonStringify(e);
  if (
    !o ||
    o.outboundOnly ||
    o.noHistoryBackfill ||
    r() ||
    n.lastReportedArtifacts === s ||
    (e.length === 0 && n.lastKnownArtifacts === void 0)
  )
    return;
  ((n.lastKnownArtifacts = e),
    (n.lastReportedArtifacts = s),
    (n.artifactsEgressSuppressed = r),
    o.reportMetadata({ artifacts: e.length === 0 ? null : e }));
}
//@ chunk-5ktj1vf9.js:6545-6709 placement
function reseedBridgeArtifacts() {
  let e = ao();
  if (((e.lastReportedArtifacts = void 0), e.lastKnownArtifacts && e.artifactsEgressSuppressed))
    reportBridgeArtifacts(e.lastKnownArtifacts, e.artifactsEgressSuppressed);
}
//@ chunk-5ktj1vf9.js:6709-6774 placement
function getSelfBridgeCompatId() {
  let e = getPeerBridgeIdentity();
  return e ? toCompatSessionId(e.bridgeSessionId) : void 0;
}
//@ chunk-5ktj1vf9.js:6774-6824 placement
function ownBridgePeerAddress() {
  let e = getSelfBridgeCompatId();
  return e ? DBe(e) : void 0;
}
/**
 * 若当前有非 outbound-only 的桥，返回其桥会话 ID 的 session_* 兼容形式，否则 undefined。
 */
//@ chunk-5ktj1vf9.js:6824-6905 placement = getSelfBridgeCompatId (0.637)
function getRemoteControlSessionCompatId() {
  let e = getReplBridgeHandle();
  return e && !e.outboundOnly ? toCompatSessionId(e.bridgeSessionId) : void 0;
}
//@ chunk-5ktj1vf9.js:6905-6944 placement
function getSelfBridgeTitle() {
  return getPeerBridgeIdentity()?.selfTitle;
}
//@ chunk-5ktj1vf9.js:6944-7032 placement
function setSelfBridgeTitle(e, r) {
  let n = getReplBridgeHandle() ?? getSdkHostedBridgeHandle();
  if (n && sessionIdBody(n.bridgeSessionId) === sessionIdBody(e)) n.selfTitle = a(r);
}
//@ chunk-5ktj1vf9.js:7032-7097 placement
function p(e) {
  return e !== null && ao().retiredHandles.has(e) ? null : e;
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
