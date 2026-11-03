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

//@ chunk-s7k22nbx.js:297-1519 placement
class BridgeInboundState {
  filterPolicy = void 0;
  dropNotifier = void 0;
  senderDropWriter = void 0;
  malformedConfigReported = !1;
  knownInboundRequestIds = new Set();
  knownOutboundRequestIds = new Set();
  automatedOutboundRequestIds = new Set();
  deviceOutboundRequestIds = new Set();
  elicitationOutboundRequestIds = new Set();
  hostAskOutboundRequestIds = new Set();
  resolvedPromptRequestIds = new Set();
  recentDropEventIds = new Set();
  commandDropNoticeWindow = { start: 0, count: 0 };
  messageDropNoticeWindow = { start: 0, count: 0 };
  reportedStrayDropCodes = new Set();
  reportedCloudWorkerCodes = new Set();
  clearWindowsForTesting() {
    (this.knownInboundRequestIds.clear(),
      this.knownOutboundRequestIds.clear(),
      this.automatedOutboundRequestIds.clear(),
      this.deviceOutboundRequestIds.clear(),
      this.elicitationOutboundRequestIds.clear(),
      this.hostAskOutboundRequestIds.clear(),
      this.resolvedPromptRequestIds.clear(),
      this.recentDropEventIds.clear(),
      (this.commandDropNoticeWindow.start = 0),
      (this.commandDropNoticeWindow.count = 0),
      (this.messageDropNoticeWindow.start = 0),
      (this.messageDropNoticeWindow.count = 0));
  }
  resetForTesting() {
    ((this.filterPolicy = void 0),
      (this.dropNotifier = void 0),
      (this.senderDropWriter = void 0),
      (this.malformedConfigReported = !1),
      this.clearWindowsForTesting(),
      this.reportedStrayDropCodes.clear(),
      this.reportedCloudWorkerCodes.clear());
  }
}
/**
 * Remote Control 跨会话消息宿主状态容器：出站对端/投递、订阅器启停、实时 socket、身份解析、待同意回复、恢复游标等字段，单例 antproto。
 */
//@ chunk-s7k22nbx.js:1519-2045 placement
class PeerMessagingHostState {
  outboundPeers = new Set();
  outboundPosts = new Set();
  subscriberStarted = !1;
  subscriberStopping = !1;
  liveSocket = null;
  enqueuePeerMessage = null;
  getCurrentMode = null;
  enqueueReceiveNotice = null;
  connectFailureStreak = null;
  outageWakeSent = !1;
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
  replyAwaitsPublish = !1;
  lastArmedSendAtMs = null;
  onReceiveStateChanged = null;
}
//@ chunk-s7k22nbx.js:2045-2212 placement
class InboundReadReceiptsState {
  held = new Map();
  settled = [];
  reporter = void 0;
  sessionId = void 0;
  resetForTesting() {
    (this.held.clear(), (this.settled.length = 0), (this.reporter = void 0), (this.sessionId = void 0));
  }
}
//@ chunk-s7k22nbx.js:2212-2399 placement
class RepoCheckoutsState {
  checkouts = null;
  baseRefs = null;
  onMetadataChanged = null;
  lastEmittedBranches = {};
  reset() {
    ((this.checkouts = null),
      (this.baseRefs = null),
      (this.onMetadataChanged = null),
      (this.lastEmittedBranches = {}));
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
  lastReportedPermissionMode = void 0;
  lastKnownPermissionMode = void 0;
  lastReportedEffort = void 0;
  lastKnownEffort = void 0;
  lastReportedUltracodeActive = void 0;
  lastKnownUltracodeActive = void 0;
  lastKnownEffortRequestId = void 0;
  lastReportedModel = void 0;
  lastKnownModel = void 0;
  contextUsageMirror = void 0;
  tokenUsageMirror = void 0;
  lastReportedArtifacts = void 0;
  lastKnownArtifacts = void 0;
  artifactsEgressSuppressed = void 0;
  lastReportedCrossSessionInbound = void 0;
  lastKnownCrossSessionInbound = void 0;
  lastKnownPostTurnSummary = void 0;
  remoteEgressSuppressed = null;
  lastRateLimitMirror = void 0;
  dropSenderWriterByHandle = new WeakMap();
  livePreviewByHandle = new WeakMap();
  isLivePreviewOffByPerson = !1;
  livePreviewEndedShares = [];
  antproto = new PeerMessagingHostState();
  bridgeStateFramesGate = void 0;
  cseShimGate = void 0;
  placeholderWriteChain = Promise.resolve();
  placeholderSweepStarted = !1;
  rcActiveImpressionRecorded = !1;
  verboseRcActive = void 0;
  teleportedSessionIds = new Set();
  nameTagWriteChain = Promise.resolve();
  latestAppliedName = new Map();
  connectTimeName = new Map();
  diagnosticPolicyKick = void 0;
  bearerPlanFetch = void 0;
  remoteControlLockReason = void 0;
  uploadLimitTold = void 0;
  sessionUploadRoute = void 0;
  uploadResends = { underWay: 0, lastFailedAtMs: void 0 };
  imageScaleLock = createMutex();
  historySpoolDir = null;
  historyPrefetchEntries = new Map();
  repoCheckouts = new RepoCheckoutsState();
  inboundReadReceipts = new InboundReadReceiptsState();
}
//@ chunk-s7k22nbx.js:3863-3888 placement
var t_s = new HostScoped(() => new BridgeHostState());
//@ chunk-s7k22nbx.js:3888-3926 placement
function ao() {
  return t_s.of(getRootSession().host);
}
/**
 * cse_xxx → session_xxx（其它原样）。
 */
//@ chunk-s7k22nbx.js:3926-4004 placement = toCompatSessionId (1)
function toCompatSessionId_2(id) {
  if (!id.startsWith("cse_")) return id;
  return "session_" + id.slice(4);
}

export { ao, toCompatSessionId_2, t_s };
