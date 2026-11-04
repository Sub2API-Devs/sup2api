/**
 * bridge/bridgeHostState.ts
 *
 * 2.1.316 新增。Remote Control 桥接宿主侧状态（入站/宿主两组状态机常量）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s7k22nbx.js (8)
 * attribution: placement 8
 */
import { createMutex } from "../utils/promiseQueue.js";
import { HostScoped } from "../utils/hostScoped.js";
import { getRootSession } from "../bootstrap/state.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-s7k22nbx.js:297-1519 placement
class BridgeInboundState {
  filterPolicy = undefined;
  dropNotifier = undefined;
  senderDropWriter = undefined;
  malformedConfigReported = false;
  knownInboundRequestIds = new Set();
  knownOutboundRequestIds = new Set();
  automatedOutboundRequestIds = new Set();
  deviceOutboundRequestIds = new Set();
  elicitationOutboundRequestIds = new Set();
  hostAskOutboundRequestIds = new Set();
  resolvedPromptRequestIds = new Set();
  recentDropEventIds = new Set();
  commandDropNoticeWindow = {
    start: 0,
    count: 0,
  };
  messageDropNoticeWindow = {
    start: 0,
    count: 0,
  };
  reportedStrayDropCodes = new Set();
  reportedCloudWorkerCodes = new Set();
  clearWindowsForTesting() {
    this.knownInboundRequestIds.clear();
    this.knownOutboundRequestIds.clear();
    this.automatedOutboundRequestIds.clear();
    this.deviceOutboundRequestIds.clear();
    this.elicitationOutboundRequestIds.clear();
    this.hostAskOutboundRequestIds.clear();
    this.resolvedPromptRequestIds.clear();
    this.recentDropEventIds.clear();
    this.commandDropNoticeWindow.start = 0;
    this.commandDropNoticeWindow.count = 0;
    this.messageDropNoticeWindow.start = 0;
    this.messageDropNoticeWindow.count = 0;
  }
  resetForTesting() {
    this.filterPolicy = undefined;
    this.dropNotifier = undefined;
    this.senderDropWriter = undefined;
    this.malformedConfigReported = false;
    this.clearWindowsForTesting();
    this.reportedStrayDropCodes.clear();
    this.reportedCloudWorkerCodes.clear();
  }
}
//@ chunk-s7k22nbx.js:1519-2045 placement
/**
 * Remote Control 跨会话消息宿主状态容器：出站对端/投递、订阅器启停、实时 socket、身份解析、待同意回复、恢复游标等字段，单例 antproto。
 */
class PeerMessagingHostState {
  outboundPeers = new Set();
  outboundPosts = new Set();
  subscriberStarted = false;
  subscriberStopping = false;
  liveSocket = null;
  enqueuePeerMessage = null;
  getCurrentMode = null;
  enqueueReceiveNotice = null;
  connectFailureStreak = null;
  outageWakeSent = false;
  identity = null;
  identityResolved = null;
  identityFailedClosed = null;
  stagedReceiveState = null;
  inboundRefused = null;
  restoredPeers = new Map();
  repliesAwaitingConsent = new Map();
  resumeCursor = null;
  resumeSeedUs = null;
  lastCursor = null;
  entriesInFlight = 0;
  replyAwaitsPublish = false;
  lastArmedSendAtMs = null;
  onReceiveStateChanged = null;
}
//@ chunk-s7k22nbx.js:2045-2212 placement
class InboundReadReceiptsState {
  held = new Map();
  settled = [];
  reporter = undefined;
  sessionId = undefined;
  resetForTesting() {
    this.held.clear();
    this.settled.length = 0;
    this.reporter = undefined;
    this.sessionId = undefined;
  }
}
//@ chunk-s7k22nbx.js:2212-2399 placement
class RepoCheckoutsState {
  checkouts = null;
  baseRefs = null;
  onMetadataChanged = null;
  lastEmittedBranches = {};
  reset() {
    this.checkouts = null;
    this.baseRefs = null;
    this.onMetadataChanged = null;
    this.lastEmittedBranches = {};
  }
}
//@ chunk-s7k22nbx.js:2399-3863 placement
class BridgeHostState {
  attestation = new BridgeInboundState();
  replHandle = null;
  sdkHostedHandle = null;
  projectFilesDoor = null;
  supervisedBridgeSession = null;
  peerIdentityKey = null;
  walkCredentialKey = null;
  retiredHandles = new WeakSet();
  lastReportedPermissionMode = undefined;
  lastKnownPermissionMode = undefined;
  lastReportedEffort = undefined;
  lastKnownEffort = undefined;
  lastReportedUltracodeActive = undefined;
  lastKnownUltracodeActive = undefined;
  lastKnownEffortRequestId = undefined;
  lastReportedModel = undefined;
  lastKnownModel = undefined;
  contextUsageMirror = undefined;
  tokenUsageMirror = undefined;
  lastReportedArtifacts = undefined;
  lastKnownArtifacts = undefined;
  artifactsEgressSuppressed = undefined;
  lastReportedCrossSessionInbound = undefined;
  lastKnownCrossSessionInbound = undefined;
  lastKnownPostTurnSummary = undefined;
  remoteEgressSuppressed = null;
  lastRateLimitMirror = undefined;
  dropSenderWriterByHandle = new WeakMap();
  livePreviewByHandle = new WeakMap();
  isLivePreviewOffByPerson = false;
  livePreviewEndedShares = [];
  antproto = new PeerMessagingHostState();
  bridgeStateFramesGate = undefined;
  cseShimGate = undefined;
  placeholderWriteChain = Promise.resolve();
  placeholderSweepStarted = false;
  rcActiveImpressionRecorded = false;
  verboseRcActive = undefined;
  teleportedSessionIds = new Set();
  nameTagWriteChain = Promise.resolve();
  latestAppliedName = new Map();
  connectTimeName = new Map();
  diagnosticPolicyKick = undefined;
  bearerPlanFetch = undefined;
  remoteControlLockReason = undefined;
  uploadLimitTold = undefined;
  sessionUploadRoute = undefined;
  uploadResends = {
    underWay: 0,
    lastFailedAtMs: undefined,
  };
  imageScaleLock = createMutex();
  historySpoolDir = null;
  historyPrefetchEntries = new Map();
  repoCheckouts = new RepoCheckoutsState();
  inboundReadReceipts = new InboundReadReceiptsState();
}
//@ chunk-s7k22nbx.js:3863-3888 placement
/**
 * 按会话宿主缓存的 BridgeHostState（桥接宿主侧状态机，包含 attestation、已读回执等）。
 */
var BRIDGE_HOST_STATE_SLOT; // deferred: uses BridgeHostState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-s7k22nbx.js:3863", () => {
  BRIDGE_HOST_STATE_SLOT = new HostScoped(() => new BridgeHostState());
});
//@ chunk-s7k22nbx.js:3888-3926 placement
/**
 * 取当前根会话宿主的 BridgeHostState；桥接层 90 多处调用它读写 attestation/回执/占位记录等状态。
 */
function bridgeHostState() {
  return BRIDGE_HOST_STATE_SLOT.of(getRootSession().host);
}
//@ chunk-s7k22nbx.js:3926-4004 placement (2.1.88 match: toCompatSessionId, 1)
/**
 * cse_xxx → session_xxx（其它原样）。
 */
function toCompatSessionId_2(id) {
  if (!id.startsWith("cse_")) return id;
  return "session_" + id.slice(4);
}
export { bridgeHostState, toCompatSessionId_2, BRIDGE_HOST_STATE_SLOT };
