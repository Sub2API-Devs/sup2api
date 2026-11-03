/**
 * services/liveReplica/liveReplica.ts
 *
 * 2.1.316 新增：创建 artifact 实时协作的会话状态（订阅、监督者、副本、文档监视、自动回复等）；登出或换账号时重置实时协作状态等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-enbhzjw4.js (37)
 * attribution: placement 37
 */
import { randomUUID } from "crypto";
import { logForDebugging } from "../../utils/debug.js";
import { Dc } from "../../../vendor/lru-cache/dist/esm/index.min.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { getRootSession } from "../../bootstrap/state.js";
import { errorMessage } from "../../utils/errors.js";
import { sleep } from "../../utils/sleep.js";

/**
 * 记录副本分歧条目（有上限）。
 */
//@ chunk-enbhzjw4.js:406-804 placement
class DivergenceNotes {
  #e = new Map();
  #t = new Set();
  note(e, r, n) {
    if (this.#t.has(e)) return;
    let s = this.#e.get(e);
    if (s !== void 0) {
      if (s.has(r)) return;
      if (s.size >= 4) {
        this.#n(e);
        return;
      }
      s.set(r, n);
      return;
    }
    if (this.#e.size >= 256) {
      let l = 128;
      for (let i of this.#e.keys()) if ((this.#n(i), --l === 0)) break;
    }
    this.#e.set(e, new Map([[r, n]]));
  }
  #n(e) {
    (this.#e.delete(e), this.#t.add(e));
  }
  take(e, r) {
    let n = this.#e.get(e);
    return (this.#e.delete(e), n?.get(r));
  }
}
/**
 * 一次实时监听操作的结算票据：只结算一次；若该键仍对应同一记录，减少待处理计数，监听过或已发出取消则标为已确认，全部结束且未确认时删除记录。
 */
//@ chunk-enbhzjw4.js:804-1103 placement
class WatchSettleTicket {
  #e;
  #t;
  #n;
  #r = !1;
  constructor(e, r, n) {
    ((this.#e = e), (this.#t = r), (this.#n = n));
  }
  settle(e) {
    if (this.#r) return;
    if (((this.#r = !0), this.#e.get(this.#t) !== this.#n)) return;
    if ((this.#n.pending--, e.wasWatching || e.teardown !== "unsent")) this.#n.confirmed = !0;
    if (this.#n.pending === 0 && !this.#n.confirmed) this.#e.delete(this.#t);
  }
}
/**
 * 记录已停止的 artifact slug 与代次。
 */
//@ chunk-enbhzjw4.js:1103-2097 placement
class StoppedSlugLatch {
  #e = new Map();
  #t = 1;
  #n = new Set();
  #r = new DivergenceNotes();
  isStopped(e) {
    return this.#e.has(e);
  }
  stoppedSlugs() {
    return this.#e.keys();
  }
  latchGeneration(e) {
    return this.#e.get(e)?.generation;
  }
  recordStop(e) {
    this.#n.delete(e);
    let r = this.#e.get(e);
    if (r === void 0) ((r = { pending: 0, confirmed: !1, generation: this.#t++ }), this.#e.set(e, r));
    else r.generation = this.#t++;
    return (r.pending++, new WatchSettleTicket(this.#e, e, r));
  }
  reaffirmStop(e) {
    this.#n.delete(e);
    let r = this.#e.get(e);
    if (r === void 0) this.confirmStop(e);
    else r.confirmed = !0;
  }
  confirmStop(e) {
    this.#n.delete(e);
    let r = this.#e.get(e);
    if (r === void 0) this.#e.set(e, { pending: 0, confirmed: !0, generation: this.#t++ });
    else ((r.confirmed = !0), (r.generation = this.#t++));
  }
  noteRelatchAsk(e, r) {
    this.#r.note(e, r, this.latchGeneration(r));
  }
  takeRelatchAsk(e, r) {
    return this.#r.take(e, r);
  }
  clearByApprovedRewatch(e, r) {
    let n = this.#e.get(e);
    if (n === void 0 || n.generation !== r) return;
    (this.#e.delete(e), this.#n.add(e));
  }
  noteApprovedWatch(e) {
    if (!this.#e.has(e)) this.#n.add(e);
  }
  wasClearedByRewatch(e) {
    return this.#n.has(e) && !this.#e.has(e);
  }
}
/**
 * 实时副本的重连、空闲、握手、停滞等时间参数。
 */
//@ chunk-enbhzjw4.js:2097-2639 placement
var LIVE_REPLICA_TIMING = {
    baseMs: 1000,
    capMs: 30000,
    minUptimeMs: 60000,
    maxConsecutiveFailures: 10,
    spreadMinMs: 1000,
    spreadMaxMs: 20000,
    seedDeferMaxMs: 180000,
    idleTtlMs: 12600000,
    handshakeDeadlineMs: 150000,
    stallThresholdMs: 1e4,
    stallMinMs: 30000,
    stallMaxMs: 60000,
    longStallMinMs: 120000,
    longStallMaxMs: 240000,
    maxStallMs: 1800000,
    stallOutJitterMs: 900000,
  },
  v = 30000,
  M = 100,
  g = {
    baseMs: 1000,
    capMs: 30000,
    minUptimeMs: 60000,
    stallThresholdMs: 1e4,
    stallMinMs: 60000,
    stallMaxMs: 600000,
    maxConsecutiveRefusals: 10,
    handshakeDeadlineMs: 30000,
  },
  w = { ...g, presenceMs: 15000 },
  y = { ...g, keepaliveMs: 25000 };
/**
 * 生成副本键（代理 id + slug）。
 */
//@ chunk-enbhzjw4.js:2639-2682 placement
function replicaKey(e, r) {
  return `${e ?? "main"}
${r}`;
}
//@ chunk-enbhzjw4.js:2682-2881 placement
function resetCodeliveredFollowups(e) {
  let r = [...e.codeliveredFollowups.values()];
  e.codeliveredFollowups.clear();
  for (let { revoke: revoke } of r) revoke("reset");
  (e.coordinatorEditors.clear(), e.editorSettleWatch?.(), (e.editorSettleWatch = null));
}
/**
 * 撤销指定 slug 的共同投递跟进。
 */
//@ chunk-enbhzjw4.js:2881-3067 placement
function revokeCodeliveredFollowups(e, r, n) {
  let s = a().current;
  if (s === void 0) return;
  for (let [l, i] of s.codeliveredFollowups)
    if (i.slug === e && i.agentId !== n?.exceptAgentId) (s.codeliveredFollowups.delete(l), i.revoke(r));
}
//@ chunk-enbhzjw4.js:3067-3091 placement
var R = 64,
  FT = 25,
  sIe = 3 * FT;
/**
 * 创建 artifact 实时协作的会话状态（订阅、监督者、副本、文档监视、自动回复等）。
 */
//@ chunk-enbhzjw4.js:3091-11075 placement
function createLiveState() {
  return {
    live: {
      handoffGeneration: 0,
      inFlightSubscribes: new Set(),
      inFlightWiredIntent: new Set(),
      retiredInFlightArms: new Set(),
      armSettleWaiters: new Map(),
      bootingWiredArms: new Map(),
      pendingInFlightWiring: new Map(),
      supervisors: new Map(),
      heardVersions: new Map(),
      heardAheadOfClockReported: !1,
      commentCensus: new Map(),
      pendingRegistrations: 0,
      rewatchTiming: { ...LIVE_REPLICA_TIMING },
      mostRecentPublishSlug: void 0,
      pendingSubagentArms: new Map(),
      finishedSubagentAdopters: new Set(),
      activitySenders: new Map(),
      agentActivitySinks: new Map(),
      activityRefreshTimer: void 0,
      activityOnsetTimer: void 0,
      activityClearTimer: void 0,
      activityRefreshMs: v,
      activityEdgeDebounceMs: M,
      activityUnsubscribe: void 0,
      disposed: !1,
      activityOkReported: !1,
      summonDeclared: new Map(),
      summonArmOkReported: !1,
      armOutcomes: new Map(),
      mcpWriteSlugs: new Map(),
      announcedArmFailures: new Set(),
      nonEditorSlugs: new Set(),
      repliesConsent: { outstanding: new Map(), declined: new Map(), approved: new Set() },
      inFlightGenerations: new Map(),
      lastArtifactToolCallAt: 0,
      endAll: void 0,
    },
    liveDocWatch: {
      ownSeqs: new Map(),
      rebases: new Map(),
      pendingOwnEdits: new Map(),
      watches: new Map(),
      stopCounts: new Map(),
      retiredWatches: new Map(),
      arming: new Map(),
      notLiveDoc: new Set(),
      noticeBudgets: new Map(),
      journalUnavailable: new Set(),
      journalNegotiations: new Set(),
      headSinks: new Map(),
      stopAll: void 0,
      stop: void 0,
    },
    liveEditOps: { lastOwnAck: new Map(), unansweredKeys: new Map() },
    liveReplicas: {
      replicas: new Map(),
      unanswered: new Map(),
      unavailable: new Map(),
      tooOld: new Set(),
      cloudUnserved: new Map(),
      opening: new Map(),
      binding: new Map(),
      transport: void 0,
      engine: void 0,
      renderLevel: void 0,
      headMoved: void 0,
      workingCopyPath: void 0,
      settleFileChange: void 0,
      liveFileEnded: void 0,
      pushHeldSaves: void 0,
      heldSavesExitCleanup: void 0,
    },
    autoReact: {
      artifacts: new Map(),
      optIn: null,
      responderDispatchOptIn: null,
      userDisarmed: !1,
      enabledMemo: null,
      wakeEnabledMemo: null,
      unattendedReplies: new Map(),
      postSeq: 0,
      probeSeq: 0,
      coalesceMsOverride: null,
      maxAutoTurnsOverride: null,
      confirmDwellMsOverride: null,
      readRetryDelaysMsOverride: null,
      fastAckFlagRefresh: null,
      fastAckFlagRefreshDeadlineMsOverride: null,
      fastAckSelectDeadlineMsOverride: null,
      pendingLedger: null,
      ledgerLastWritten: null,
      ledgerLastWriteAt: null,
      ledgerLastWriteSid: null,
      ledgerLastWriteAccount: void 0,
      ledgerFailureSeqAtWrite: null,
      ledgerDeferredSince: null,
      ledgerLastAppend: null,
      ledgerOwnerSid: null,
      ledgerRetiredSids: new Set(),
      ledgerExitCleanup: void 0,
      ledgerExitReStamp: void 0,
      ledgerTimer: void 0,
      ledgerStorageV5: void 0,
      ledgerMaxAgeMsOverride: null,
      ledgerDebounceMsOverride: null,
      composeDeadlineMsOverride: null,
    },
    summonSeeds: {
      claims: new Set(),
      readClaims: new Set(),
      graceMsOverride: null,
      open: new Map(),
      settled: new Set(),
    },
    wakes: {
      wakes: new Map(),
      stoppedSlugs: new Set(),
      sweptSlugs: new Set(),
      orphanedSweptSlugs: new Set(),
      yieldedSlugs: new Map(),
      takenFrom: new Map(),
      latchChangedAt: new Map(),
      liftedAtScanGeneration: new Map(),
      humanTurnAtScanGeneration: null,
      pendingResumeDisclosure: new Set(),
      scanGeneration: 0,
      slugEpochs: new Map(),
      stopGenerations: new Map(),
      resumeSights: new DivergenceNotes(),
    },
    autoEditAttribution: { staged: new Map(), chainPublishIds: new Set(), chainPublishSlots: new Map() },
    summonAnswers: new Map(),
    pipelineReplyOrigins: new Map(),
    summonStatus: {
      sidBySlug: new Map(),
      seqBySid: new Map(),
      routeAbsentSince: null,
      handOffs: new Map(),
      queuedWakes: new Map(),
    },
    noticeCoalesce: new Map(),
    shareStatus: {
      bySlug: new Map(),
      probeBoots: new Map(),
      filePathToSlug: new Map(),
      pendingNoticeSlugs: new Map(),
      otherComments: new Map(),
      otherCommentSeq: 0,
      noticeReadSights: {
        comments: new DivergenceNotes(),
        read_db: new DivergenceNotes(),
        read: new DivergenceNotes(),
        verify: new DivergenceNotes(),
        webfetch: new DivergenceNotes(),
      },
      shareProbesInFlight: new Map(),
      capsReadsInFlight: new Map(),
      checkProbesInFlight: new Map(),
    },
    postedReplyIds: new Set(),
    cleanReplyIds: new Set(),
    frameRelay: {
      declinedUntil: new Map(),
      tunnelDeclinedUntil: new Map(),
      hopFailedUntil: new Map(),
      servedUntil: new Map(),
      vouched: new Set(),
      directRefusedUntil: new Map(),
      mcpAdvert: void 0,
      mcpAdvertAsked: void 0,
      mcpNarrower: new Set(),
      botContextNoted: !1,
    },
    builtInArtifactHiddenForMcp: !1,
    mcpEntryRowNotServed: null,
    routeOnlyMcpEntryLogged: !1,
    contentHostEgressDenied: new Set(),
    contentHostEgressProbed: new Map(),
    contentHostEgressUnanswered: new Set(),
    contentHostEgressInFlight: new Map(),
    sessionHintsRefusedAt: void 0,
    leaveOutMissingRefusedAt: void 0,
    sandboxEgress: new Map(),
    roster: void 0,
    rosterHeard: void 0,
    rosterWait: void 0,
    rosterWaitOver: !1,
    assetsOnRoster: !1,
    accountEpoch: 0,
    conversationEpoch: 0,
    ownPrincipalTokens: new Map(),
    ownPrincipalTokenAccount: null,
    ownPrincipalTokenEpoch: 0,
    profileNames: new Map(),
    profileIdsServed: new Map(),
    profileIdsForgets: new Map(),
    strandedMints: new Map(),
    reservedMints: new Set(),
    mintedRoundTripPublishSignals: new WeakSet(),
    durable: {
      rows: new Map(),
      registrySink: null,
      registryPublished: "null",
      unwatchedSlugs: new Set(),
      orphanTriggers: new Set(),
      pendingRestoredRows: new Map(),
      slugOps: new Map(),
      stopLatches: new StoppedSlugLatch(),
      liveDocArmDeclined: new Set(),
      liveDocRegrantSights: new DivergenceNotes(),
      firstWatchAskSights: new DivergenceNotes(),
      pendingOps: new Set(),
      originatorRefused: !1,
      subscribeForbidden: null,
      subscribeUnrelayed: null,
      watchUrlWithheld: null,
      watchUrlGranted: !1,
      armsInFlight: new Map(),
      armOutcomes: new Map(),
      announcedArmFailures: new Set(),
      claudeDocSlugs: new Set(),
    },
    room: { conns: new Map(), nonces: new Map(), endedOwners: new Map(), timing: { ...w } },
    presence: { conns: new Map(), declined: new Set(), timing: { ...y } },
    commentMonitorIntent: {
      sid: null,
      bySlug: new Map(),
      pendingRestore: null,
      lastWritten: null,
      wroteCurrentLine: !1,
      failureSeqAtWrite: 0,
      storageV5: void 0,
      unsubscribeSwitch: void 0,
      unregisterExitDrain: void 0,
      transcriptPath: null,
      parked: new Map(),
      writeChain: Promise.resolve(),
      owedLines: new Map(),
      pendingLines: new Map(),
      exitStamped: !1,
      tornStops: new Set(),
      forgottenAt: new Map(),
      leftWith: null,
      unsubscribeMaterialized: void 0,
      earlySeed: void 0,
      onFile: !1,
      adoptPendingFor: null,
    },
    approvedRootBases: new Map(),
    commentTargets: new Map(),
    refusedPublishBodies: new Map(),
    approvedSourcePins: new Map(),
    verifiedAttachments: new Map(),
    approvedCopySources: new Map(),
    gatedThumbnailHrefs: new Map(),
    approvalStashEvicted: !1,
    publishObservationNonce: randomUUID(),
    consumedPublishApprovals: new Set(),
    crashedPublishChecks: new Set(),
    readDeliveries: new Map(),
    pendingHandoverReads: new Map(),
    frozenWatchRail: void 0,
    frozenArtifactTypes: void 0,
    frozenAssets: void 0,
    frozenCopyFrom: void 0,
    frozenPublishEdits: void 0,
    frozenHotUpdate: void 0,
    frozenPathPin: void 0,
    frozenPathPinAck: void 0,
    pathPinSeq: 0,
    pathPins: new Map(),
    frozenDbStrReplace: void 0,
    frozenArtifactPins: void 0,
    frozenMultiFile: void 0,
    createdFromType: new Map(),
    deferredSurface: new Map(),
    remoteControlSkippedSlugs: new Set(),
    typeInstanceFiles: new Map(),
    publishedSources: new Map(),
    typeCatalogVouch: new Map(),
    typeDescriptions: new Map(),
    attestedTypeArtifacts: new Map(),
    typeCapabilityReads: new Map(),
    verify: { lastPublish: void 0, reads: new Map() },
    ownPublishedSlugs: new Map(),
    ownCreatedSlugs: new Map(),
    roomJoinArming: new Set(),
    roomStoppedByUser: new Set(),
    roomArmAsked: new Map(),
    roomArmRefusedByUser: new Set(),
    coordinatorEditors: new Map(),
    editorSettleWatch: null,
    codeliveredFollowups: new Map(),
    liveEditGateLatch: null,
    livePathsGateLatch: null,
    toolsetLatch: null,
    resultNotes: {
      kindSaid: !1,
      watchCodesSaid: new Set(),
      previewedPaths: new Set(),
      previewHintedPaths: new Set(),
    },
    inheritedTypeGrantLatch: null,
    routineRunTainted: !1,
    routineSourceWriteRefused: !1,
    quietCapsCardKept: !1,
    routineTypeInstances: new Map(),
    routineRelayNotCarried: null,
    routineRepublishedPaths: new Set(),
    laneNoticeSlugs: new Map(),
    commentReads: new Map(),
    commentReadAtBySlug: new Map(),
    commentRepublishedPaths: new Set(),
    askClassConsent: new Set(),
    askClassPersonConsent: new Set(),
    askClassOutsideOrgConsent: new Set(),
    askNamedOtherOrg: new Map(),
    askClassRequestShown: new Map(),
    askConnectorsShown: new Map(),
    askClassPending: new Map(),
    notedUnreadRefusals: new Map(),
    askCards: new Map(),
    askClassCards: new Map(),
    askCardFacts: new Map(),
    dbWriteOpSights: new DivergenceNotes(),
    askClassTaken: new Map(),
    askClassPersonAsked: new Map(),
    askClassNoClassifier: new Map(),
    askClassTakenByPerson: new Map(),
    askTelemetry: new Map(),
    consentCheckScopes: new Map(),
    consentCheckScopesEvicted: !1,
    designGuardFired: !1,
    quickstartGuidanceToolUseId: void 0,
    quickstartRan: new Map(),
    designSystemTypeSlug: void 0,
    artifactDisabledSessionEvaluated: !1,
    artifactWithheldReasonsLogged: [],
    artifactWithheldRecoveryLogged: !1,
    artifactRegisteredSeen: !1,
    artifactWithheldListedLogged: !1,
    artifactPolicyFetchAnswer: null,
    heldStartupTelemetry: null,
    anchorSnippets: new Map(),
    marked: { plain: void 0 },
    bundleEmbedVerdicts: { hljs: void 0 },
    blockStripVerdicts: { hljs: void 0, mermaid: void 0 },
    rejectBreaker: new Dc({ max: R }),
  };
}
/**
 * 停止副本监督者（中止、清定时器、租约）。
 */
//@ chunk-enbhzjw4.js:11075-11225 placement
function stopSupervisor(e) {
  if (((e.stopped = !0), e.abort.abort(), e.timer !== void 0)) (clearTimeout(e.timer), (e.timer = void 0));
  (delete e.lease, delete e.renewable, delete e.wake);
}
//@ chunk-enbhzjw4.js:11225-11248 placement
class f {
  current = void 0;
}
//@ chunk-enbhzjw4.js:11248-11272 placement
var C = new SessionRootSlot(() => new f());
//@ chunk-enbhzjw4.js:11272-11302 placement
function a() {
  return C.of(getRootSession());
}
/**
 * 取（必要时创建）当前实时协作状态。
 */
//@ chunk-enbhzjw4.js:11302-11359 placement
function getLiveState() {
  let e = a();
  return ((e.current ??= createLiveState()), e.current);
}
/**
 * 记录某 artifact 讨论串最近一次自动回复的时间。
 */
//@ chunk-enbhzjw4.js:11359-11482 placement
function markAutoReplyTime(e, r) {
  let n = a().current?.autoReact.artifacts.get(e)?.threads.get(r);
  if (n !== void 0) n.lastAutoReplyAt = Date.now();
}
/**
 * 重置文档监视的通知预算。
 */
//@ chunk-enbhzjw4.js:11482-11602 placement
function resetNoticeBudgets() {
  let e = a().current;
  if (e === void 0) return;
  for (let r of e.liveDocWatch.noticeBudgets.values()) r.disclosed = !1;
}
/**
 * 清除被拒发布的正文记录。
 */
//@ chunk-enbhzjw4.js:11602-11693 placement
function clearRefusedPublishBodies() {
  let e = a().current;
  if (e === void 0) return;
  (e.refusedPublishBodies.clear(), clearHandoverReadState());
}
/**
 * 清空所有待交接读取的已返回/已准备/完成者/重发确认记录，以及读取投递记录。
 */
//@ chunk-enbhzjw4.js:11693-11915 placement
function clearHandoverReadState() {
  let e = a().current;
  if (e === void 0) return;
  for (let r of e.pendingHandoverReads.values())
    (r.linesReturned.clear(), r.linesPrepared.clear(), r.completedBy.clear(), r.confirmsResendFor.clear());
  e.readDeliveries.clear();
}
/**
 * 按仍保留的批次集合清理被拒发布内容记录：批次已不在的删除，观察来源已不在的去掉该字段。
 */
//@ chunk-enbhzjw4.js:11915-12193 placement
function pruneRefusedPublishBodies(e) {
  let r = a().current;
  if (r === void 0) return;
  let refusedPublishBodies = r.refusedPublishBodies,
    s = replicaKey(void 0, "");
  for (let [l, i] of refusedPublishBodies) {
    if (!l.startsWith(s)) continue;
    if (!e.has(i.batch)) refusedPublishBodies.delete(l);
    else if (i.observedFrom !== void 0 && i.observedFrom !== "" && !e.has(i.observedFrom))
      delete i.observedFrom;
  }
}
//@ chunk-enbhzjw4.js:12193-12233 placement
function ITn() {
  return a().current?.room;
}
//@ chunk-enbhzjw4.js:12233-12277 placement
function Vyi() {
  return a().current?.presence;
}
//@ chunk-enbhzjw4.js:12277-12343 placement
function Qcr(e) {
  let r = a().current?.presence;
  r?.disposeSlug?.(r, e);
}
//@ chunk-enbhzjw4.js:12343-12408 placement
function qyi(e) {
  let r = a().current?.presence;
  r?.retireSlug?.(r, e);
}
//@ chunk-enbhzjw4.js:12408-12474 placement
function Yyi(e) {
  return a().current?.presence.declined.has(e) === !0;
}
/**
 * 是否已有实时协作状态。
 */
//@ chunk-enbhzjw4.js:12474-12516 placement
function hasLiveState() {
  return a().current !== void 0;
}
//@ chunk-enbhzjw4.js:12516-12566 placement
function Xyi() {
  let e = ITn();
  e?.consentChanged?.(e);
}
//@ chunk-enbhzjw4.js:12566-12619 placement
function Jyi(e) {
  let r = ITn();
  r?.accountChanged?.(r, e);
}
/**
 * 释放实时协作资源。
 */
//@ chunk-enbhzjw4.js:12619-12662 placement
function disposeLiveState() {
  let e = ITn();
  e?.dispose?.(e);
}
//@ chunk-enbhzjw4.js:12662-12715 placement
function P(e) {
  k(e);
  for (let r of e.docs.values()) T(r);
}
//@ chunk-enbhzjw4.js:12715-12772 placement
function k(e) {
  ((e.journalPos = void 0), (e.journalPosOrd = void 0));
}
//@ chunk-enbhzjw4.js:12772-12824 placement
function T(e) {
  ((e.journalFence = void 0), (e.journalGen += 1));
}
//@ chunk-enbhzjw4.js:12824-13094 placement
function stopReplicaJournal(e) {
  let journal = e.journal;
  ((e.journal = void 0), (e.journalCap = void 0), P(e));
  for (let n of e.docs.values()) {
    if (n.batchTimer !== void 0) (clearTimeout(n.batchTimer), (n.batchTimer = void 0));
    ((n.batch = void 0), (n.batchPos = void 0), (n.batchHeardAt = void 0), (n.settling = void 0));
  }
  journal?.stop({ killTask: !1 });
}
/**
 * 重置本会话主体令牌缓存（清空令牌、账号置空并递增纪元）。
 */
//@ chunk-enbhzjw4.js:13094-13198 placement
function resetOwnPrincipalTokens(e) {
  (e.ownPrincipalTokens.clear(), (e.ownPrincipalTokenAccount = null), e.ownPrincipalTokenEpoch++);
}
/**
 * 登出或换账号时重置实时协作状态。
 */
//@ chunk-enbhzjw4.js:13198-16084 placement
function resetLiveStateOnAccountChange(e = "signed_out", r) {
  let n = a().current;
  if (n === void 0) return;
  if (
    (resetOwnPrincipalTokens(n), n.profileNames.clear(), n.profileIdsServed.clear(), e !== "same_account")
  ) {
    ((n.frameRelay.mcpAdvert = { tools: new Set(), until: 0 }),
      n.frameRelay.mcpNarrower.clear(),
      (n.roster = void 0),
      (n.rosterHeard = void 0),
      (n.rosterWait = void 0),
      (n.rosterWaitOver = !1),
      (n.assetsOnRoster = !1),
      n.accountEpoch++,
      n.askClassOutsideOrgConsent.clear(),
      n.askNamedOtherOrg.clear(),
      n.postedReplyIds.clear(),
      n.commentTargets.clear(),
      n.summonStatus.handOffs.clear(),
      n.summonStatus.queuedWakes.clear(),
      (n.verify.lastPublish = void 0),
      n.verify.reads.clear(),
      n.ownPublishedSlugs.clear(),
      n.ownCreatedSlugs.clear(),
      n.routineTypeInstances.clear(),
      n.strandedMints.clear(),
      n.reservedMints.clear(),
      n.live.heardVersions.clear(),
      n.roomJoinArming.clear(),
      resetCodeliveredFollowups(n));
    for (let i of n.live.supervisors.values()) (delete i.lease, delete i.renewable);
    (n.live.nonEditorSlugs.clear(),
      n.laneNoticeSlugs.clear(),
      n.commentReads.clear(),
      (n.lastOthersCommentReadAt = Date.now()),
      n.cleanReplyIds.clear());
    for (let i of n.shareStatus.otherComments.values()) (i.judged.clear(), i.judgedSends.clear());
    (n.live.pendingSubagentArms.clear(),
      n.live.finishedSubagentAdopters.clear(),
      n.live.repliesConsent.outstanding.clear(),
      n.live.repliesConsent.declined.clear(),
      n.live.repliesConsent.approved.clear());
    for (let i of n.autoReact.artifacts.values()) {
      ((i.heldReplyDeclined = !1), (i.heldReplyChain = null));
      for (let o of i.threads.values()) (o.ownReplyIds.clear(), (o.ownReplyIdsIncomplete = !1));
    }
    n.liveDocWatch.journalUnavailable.clear();
    for (let journalNegotiation of n.liveDocWatch.journalNegotiations) journalNegotiation.abort();
    n.liveDocWatch.journalNegotiations.clear();
    for (let i of n.liveDocWatch.arming.values()) for (let o of i.reviving) stopReplicaJournal(o);
    (n.liveDocWatch.stopAll?.(e), n.live.endAll?.(e));
    for (let i of n.liveReplicas.replicas.values()) (i.watcher?.close(), clearTimeout(i.pushHold?.due));
    (n.liveReplicas.replicas.clear(),
      n.liveReplicas.unavailable.clear(),
      n.liveReplicas.tooOld.clear(),
      n.liveReplicas.cloudUnserved.clear(),
      n.liveReplicas.opening.clear(),
      n.liveReplicas.unanswered.clear(),
      n.createdFromType.clear(),
      n.deferredSurface.clear(),
      n.remoteControlSkippedSlugs.clear(),
      n.typeInstanceFiles.clear(),
      n.publishedSources.clear(),
      n.pathPins.clear(),
      n.typeCatalogVouch.clear(),
      n.typeDescriptions.clear(),
      n.attestedTypeArtifacts.clear(),
      n.typeCapabilityReads.clear(),
      n.quickstartRan.clear(),
      n.anchorSnippets.clear(),
      (n.shareStatus.accountBoundaryAt = Date.now()),
      n.shareStatus.probeBoots.clear());
    for (let [i, o] of n.shareStatus.bySlug)
      if (
        o.probeErrorCode !== void 0 ||
        o.role !== void 0 ||
        o.outsideOrgReader !== void 0 ||
        o.external !== void 0 ||
        o.endpointConnectors !== void 0 ||
        o.connectorsIssuedAt !== void 0 ||
        o.lastConnectorsReadToolUseId !== void 0
      ) {
        let {
          probeErrorCode: probeErrorCode,
          probeGone: probeGone,
          role: role,
          outsideOrgReader: outsideOrgReader,
          external: external,
          endpointConnectors: endpointConnectors,
          connectorsIssuedAt: connectorsIssuedAt,
          lastConnectorsReadToolUseId: lastConnectorsReadToolUseId,
          ...h
        } = o;
        n.shareStatus.bySlug.set(i, h);
      }
  }
  let { room: room, presence: presence } = n;
  (room.accountChanged?.(room, r), presence.accountChanged?.(presence, r));
}
/**
 * 登出前推送挂起的保存并发送最终分歧报告。
 */
//@ chunk-enbhzjw4.js:16084-16708 placement
async function flushReplicasBeforeLogout(e) {
  if (e === "same_account") return;
  let r = a().current;
  if (r === void 0 || r.liveReplicas.replicas.size === 0) return;
  let n = [],
    pushHeldSaves = r.liveReplicas.pushHeldSaves;
  if (pushHeldSaves !== void 0)
    n.push(
      pushHeldSaves().then(
        () => logForDebugging("[liveReplica] held saves pushed before logout"),
        (l) => logForDebugging(`[liveReplica] held saves not pushed before logout: ${errorMessage(l)}`),
      ),
    );
  for (let [l, i] of r.liveReplicas.replicas)
    n.push(
      i.replica.sendFinalReport().then(
        (o) =>
          logForDebugging(
            `[liveReplica] final divergence report before logout ${l}: ${o ? "tried" : "nothing due"}`,
          ),
        (o) =>
          logForDebugging(
            `[liveReplica] final divergence report before logout ${l} failed: ${errorMessage(o)}`,
          ),
      ),
    );
  await Promise.race([Promise.all(n), sleep(2000)]);
}
/**
 * 对话结束时停止文档监视并发送最终报告。
 */
//@ chunk-enbhzjw4.js:16708-17059 placement
function retireConversationReplicas() {
  let e = a().current;
  if ((e?.liveDocWatch.stopAll?.("clear"), e !== void 0))
    for (let [r, n] of e.liveReplicas.replicas)
      n.replica.sendFinalReport().then(
        (s) =>
          logForDebugging(
            `[liveReplica] final divergence report at conversation retire ${r}: ${s ? "tried" : "nothing due"}`,
          ),
        (s) =>
          logForDebugging(
            `[liveReplica] final divergence report at conversation retire ${r} failed: ${errorMessage(s)}`,
          ),
      );
}
/**
 * 新对话时重置会话级集合（自有 slug、实例等）。
 */
//@ chunk-enbhzjw4.js:17059-18027 placement
function resetForNewConversation(e) {
  let r = a().current;
  if (r === void 0) return;
  if (e?.continuesConversation !== !0)
    (r.conversationEpoch++,
      r.ownPublishedSlugs.clear(),
      r.ownCreatedSlugs.clear(),
      r.routineTypeInstances.clear(),
      r.strandedMints.clear(),
      r.reservedMints.clear(),
      r.live.heardVersions.clear(),
      r.roomJoinArming.clear(),
      r.roomStoppedByUser.clear(),
      r.roomArmAsked.clear(),
      r.roomArmRefusedByUser.clear(),
      resetCodeliveredFollowups(r),
      r.live.nonEditorSlugs.clear(),
      r.live.pendingSubagentArms.clear(),
      r.live.finishedSubagentAdopters.clear(),
      r.live.repliesConsent.outstanding.clear(),
      r.live.repliesConsent.declined.clear(),
      r.live.repliesConsent.approved.clear(),
      r.deferredSurface.clear(),
      r.remoteControlSkippedSlugs.clear());
  if (
    (r.createdFromType.clear(),
    (r.verify.lastPublish = void 0),
    r.verify.reads.clear(),
    e?.continuesConversation !== !0)
  )
    (r.pathPins.clear(),
      r.publishedSources.clear(),
      (r.resultNotes.kindSaid = !1),
      r.resultNotes.watchCodesSaid.clear(),
      r.resultNotes.previewedPaths.clear(),
      r.resultNotes.previewHintedPaths.clear());
}

export {
  getLiveState,
  hasLiveState,
  replicaKey,
  FT,
  sIe,
  disposeLiveState,
  resetNoticeBudgets,
  retireConversationReplicas,
  clearRefusedPublishBodies,
  resetForNewConversation,
  Xyi,
  resetLiveStateOnAccountChange,
  markAutoReplyTime,
  revokeCodeliveredFollowups,
  Yyi,
  qyi,
  Vyi,
  stopSupervisor,
  Qcr,
  resetOwnPrincipalTokens,
  pruneRefusedPublishBodies,
  clearHandoverReadState,
  flushReplicasBeforeLogout,
  Jyi,
  ITn,
};
