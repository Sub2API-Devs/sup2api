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
import { LRUCache } from "../../../vendor/lru-cache/dist/esm/index.min.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { getRootSession } from "../../bootstrap/state.js";
import { errorMessage } from "../../utils/errors.js";
import { sleep } from "../../utils/sleep.js";

//@ chunk-enbhzjw4.js:406-804 placement
/**
 * 记录副本分歧条目（有上限）。
 */
class DivergenceNotes {
  #e = new Map();
  #t = new Set();
  note(e, r, n) {
    if (this.#t.has(e)) return;
    let s = this.#e.get(e);
    if (s !== undefined) {
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
      for (let key of this.#e.keys()) {
        this.#n(key);
        if (--l === 0) break;
      }
    }
    this.#e.set(e, new Map([[r, n]]));
  }
  #n(e) {
    this.#e.delete(e);
    this.#t.add(e);
  }
  take(e, r) {
    let n = this.#e.get(e);
    this.#e.delete(e);
    return n?.get(r);
  }
}
//@ chunk-enbhzjw4.js:804-1103 placement
/**
 * 一次实时监听操作的结算票据：只结算一次；若该键仍对应同一记录，减少待处理计数，监听过或已发出取消则标为已确认，全部结束且未确认时删除记录。
 */
class WatchSettleTicket {
  #e;
  #t;
  #n;
  #r = false;
  constructor(e, r, n) {
    this.#e = e;
    this.#t = r;
    this.#n = n;
  }
  settle(e) {
    if (this.#r) return;
    this.#r = true;
    if (this.#e.get(this.#t) !== this.#n) return;
    this.#n.pending--;
    if (e.wasWatching || e.teardown !== "unsent") this.#n.confirmed = true;
    if (this.#n.pending === 0 && !this.#n.confirmed) this.#e.delete(this.#t);
  }
}
//@ chunk-enbhzjw4.js:1103-2097 placement
/**
 * 记录已停止的 artifact slug 与代次。
 */
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
    if (r === undefined) {
      r = {
        pending: 0,
        confirmed: false,
        generation: this.#t++,
      };
      this.#e.set(e, r);
    } else r.generation = this.#t++;
    r.pending++;
    return new WatchSettleTicket(this.#e, e, r);
  }
  reaffirmStop(e) {
    this.#n.delete(e);
    let r = this.#e.get(e);
    if (r === undefined) this.confirmStop(e);
    else r.confirmed = true;
  }
  confirmStop(e) {
    this.#n.delete(e);
    let r = this.#e.get(e);
    if (r === undefined)
      this.#e.set(e, {
        pending: 0,
        confirmed: true,
        generation: this.#t++,
      });
    else {
      r.confirmed = true;
      r.generation = this.#t++;
    }
  }
  noteRelatchAsk(e, r) {
    this.#r.note(e, r, this.latchGeneration(r));
  }
  takeRelatchAsk(e, r) {
    return this.#r.take(e, r);
  }
  clearByApprovedRewatch(e, r) {
    let n = this.#e.get(e);
    if (n === undefined || n.generation !== r) return;
    this.#e.delete(e);
    this.#n.add(e);
  }
  noteApprovedWatch(e) {
    if (!this.#e.has(e)) this.#n.add(e);
  }
  wasClearedByRewatch(e) {
    return this.#n.has(e) && !this.#e.has(e);
  }
}
//@ chunk-enbhzjw4.js:2097-2639 placement
/**
 * 带 keepalive 参数的副本时间参数。
 */
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
};
var ACTIVITY_REFRESH_MS = 30000;
var ACTIVITY_EDGE_DEBOUNCE_MS = 100;
var REPLICA_TIMING = {
  baseMs: 1000,
  capMs: 30000,
  minUptimeMs: 60000,
  stallThresholdMs: 1e4,
  stallMinMs: 60000,
  stallMaxMs: 600000,
  maxConsecutiveRefusals: 10,
  handshakeDeadlineMs: 30000,
};
var PRESENCE_REPLICA_TIMING = {
  ...REPLICA_TIMING,
  presenceMs: 15000,
};
var KEEPALIVE_REPLICA_TIMING = {
  ...REPLICA_TIMING,
  keepaliveMs: 25000,
};
//@ chunk-enbhzjw4.js:2639-2682 placement
/**
 * 生成副本键（代理 id + slug）。
 */
function replicaKey(e, r) {
  return `${e ?? "main"}
${r}`;
}
//@ chunk-enbhzjw4.js:2682-2881 placement
function resetCodeliveredFollowups(e) {
  let r = [...e.codeliveredFollowups.values()];
  e.codeliveredFollowups.clear();
  for (let { revoke } of r) revoke("reset");
  e.coordinatorEditors.clear();
  e.editorSettleWatch?.();
  e.editorSettleWatch = null;
}
//@ chunk-enbhzjw4.js:2881-3067 placement
/**
 * 撤销指定 slug 的共同投递跟进。
 */
function revokeCodeliveredFollowups(e, r, n) {
  let s = getLiveStateHolder().current;
  if (s === undefined) return;
  for (let [l, i] of s.codeliveredFollowups)
    if (i.slug === e && i.agentId !== n?.exceptAgentId) {
      s.codeliveredFollowups.delete(l);
      i.revoke(r);
    }
}
//@ chunk-enbhzjw4.js:3067-3091 placement
/**
 * 拒绝发布容量窗口（3 × FT）。
 */
var MAX_REFUSED_PUBLISHES = 64;
var REFUSED_CAPACITY_HINT = 25;
var REFUSED_CAPACITY_WINDOW = 3 * REFUSED_CAPACITY_HINT;
//@ chunk-enbhzjw4.js:3091-11075 placement
/**
 * 创建 artifact 实时协作的会话状态（订阅、监督者、副本、文档监视、自动回复等）。
 */
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
      heardAheadOfClockReported: false,
      commentCensus: new Map(),
      pendingRegistrations: 0,
      rewatchTiming: {
        ...LIVE_REPLICA_TIMING,
      },
      mostRecentPublishSlug: undefined,
      pendingSubagentArms: new Map(),
      finishedSubagentAdopters: new Set(),
      activitySenders: new Map(),
      agentActivitySinks: new Map(),
      activityRefreshTimer: undefined,
      activityOnsetTimer: undefined,
      activityClearTimer: undefined,
      activityRefreshMs: ACTIVITY_REFRESH_MS,
      activityEdgeDebounceMs: ACTIVITY_EDGE_DEBOUNCE_MS,
      activityUnsubscribe: undefined,
      disposed: false,
      activityOkReported: false,
      summonDeclared: new Map(),
      summonArmOkReported: false,
      armOutcomes: new Map(),
      mcpWriteSlugs: new Map(),
      announcedArmFailures: new Set(),
      nonEditorSlugs: new Set(),
      repliesConsent: {
        outstanding: new Map(),
        declined: new Map(),
        approved: new Set(),
      },
      inFlightGenerations: new Map(),
      lastArtifactToolCallAt: 0,
      endAll: undefined,
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
      stopAll: undefined,
      stop: undefined,
    },
    liveEditOps: {
      lastOwnAck: new Map(),
      unansweredKeys: new Map(),
    },
    liveReplicas: {
      replicas: new Map(),
      unanswered: new Map(),
      unavailable: new Map(),
      tooOld: new Set(),
      cloudUnserved: new Map(),
      opening: new Map(),
      binding: new Map(),
      transport: undefined,
      engine: undefined,
      renderLevel: undefined,
      headMoved: undefined,
      workingCopyPath: undefined,
      settleFileChange: undefined,
      liveFileEnded: undefined,
      pushHeldSaves: undefined,
      heldSavesExitCleanup: undefined,
    },
    autoReact: {
      artifacts: new Map(),
      optIn: null,
      responderDispatchOptIn: null,
      userDisarmed: false,
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
      ledgerLastWriteAccount: undefined,
      ledgerFailureSeqAtWrite: null,
      ledgerDeferredSince: null,
      ledgerLastAppend: null,
      ledgerOwnerSid: null,
      ledgerRetiredSids: new Set(),
      ledgerExitCleanup: undefined,
      ledgerExitReStamp: undefined,
      ledgerTimer: undefined,
      ledgerStorageV5: undefined,
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
    autoEditAttribution: {
      staged: new Map(),
      chainPublishIds: new Set(),
      chainPublishSlots: new Map(),
    },
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
      mcpAdvert: undefined,
      mcpAdvertAsked: undefined,
      mcpNarrower: new Set(),
      botContextNoted: false,
    },
    builtInArtifactHiddenForMcp: false,
    mcpEntryRowNotServed: null,
    routeOnlyMcpEntryLogged: false,
    contentHostEgressDenied: new Set(),
    contentHostEgressProbed: new Map(),
    contentHostEgressUnanswered: new Set(),
    contentHostEgressInFlight: new Map(),
    sessionHintsRefusedAt: undefined,
    leaveOutMissingRefusedAt: undefined,
    sandboxEgress: new Map(),
    roster: undefined,
    rosterHeard: undefined,
    rosterWait: undefined,
    rosterWaitOver: false,
    assetsOnRoster: false,
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
      originatorRefused: false,
      subscribeForbidden: null,
      subscribeUnrelayed: null,
      watchUrlWithheld: null,
      watchUrlGranted: false,
      armsInFlight: new Map(),
      armOutcomes: new Map(),
      announcedArmFailures: new Set(),
      claudeDocSlugs: new Set(),
    },
    room: {
      conns: new Map(),
      nonces: new Map(),
      endedOwners: new Map(),
      timing: {
        ...PRESENCE_REPLICA_TIMING,
      },
    },
    presence: {
      conns: new Map(),
      declined: new Set(),
      timing: {
        ...KEEPALIVE_REPLICA_TIMING,
      },
    },
    commentMonitorIntent: {
      sid: null,
      bySlug: new Map(),
      pendingRestore: null,
      lastWritten: null,
      wroteCurrentLine: false,
      failureSeqAtWrite: 0,
      storageV5: undefined,
      unsubscribeSwitch: undefined,
      unregisterExitDrain: undefined,
      transcriptPath: null,
      parked: new Map(),
      writeChain: Promise.resolve(),
      owedLines: new Map(),
      pendingLines: new Map(),
      exitStamped: false,
      tornStops: new Set(),
      forgottenAt: new Map(),
      leftWith: null,
      unsubscribeMaterialized: undefined,
      earlySeed: undefined,
      onFile: false,
      adoptPendingFor: null,
    },
    approvedRootBases: new Map(),
    commentTargets: new Map(),
    refusedPublishBodies: new Map(),
    approvedSourcePins: new Map(),
    verifiedAttachments: new Map(),
    approvedCopySources: new Map(),
    gatedThumbnailHrefs: new Map(),
    approvalStashEvicted: false,
    publishObservationNonce: randomUUID(),
    consumedPublishApprovals: new Set(),
    crashedPublishChecks: new Set(),
    readDeliveries: new Map(),
    pendingHandoverReads: new Map(),
    frozenWatchRail: undefined,
    frozenArtifactTypes: undefined,
    frozenAssets: undefined,
    frozenCopyFrom: undefined,
    frozenPublishEdits: undefined,
    frozenHotUpdate: undefined,
    frozenPathPin: undefined,
    frozenPathPinAck: undefined,
    pathPinSeq: 0,
    pathPins: new Map(),
    frozenDbStrReplace: undefined,
    frozenArtifactPins: undefined,
    frozenMultiFile: undefined,
    createdFromType: new Map(),
    deferredSurface: new Map(),
    remoteControlSkippedSlugs: new Set(),
    typeInstanceFiles: new Map(),
    publishedSources: new Map(),
    typeCatalogVouch: new Map(),
    typeDescriptions: new Map(),
    attestedTypeArtifacts: new Map(),
    typeCapabilityReads: new Map(),
    verify: {
      lastPublish: undefined,
      reads: new Map(),
    },
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
      kindSaid: false,
      watchCodesSaid: new Set(),
      previewedPaths: new Set(),
      previewHintedPaths: new Set(),
    },
    inheritedTypeGrantLatch: null,
    routineRunTainted: false,
    routineSourceWriteRefused: false,
    quietCapsCardKept: false,
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
    consentCheckScopesEvicted: false,
    designGuardFired: false,
    quickstartGuidanceToolUseId: undefined,
    quickstartRan: new Map(),
    designSystemTypeSlug: undefined,
    artifactDisabledSessionEvaluated: false,
    artifactWithheldReasonsLogged: [],
    artifactWithheldRecoveryLogged: false,
    artifactRegisteredSeen: false,
    artifactWithheldListedLogged: false,
    artifactPolicyFetchAnswer: null,
    heldStartupTelemetry: null,
    anchorSnippets: new Map(),
    marked: {
      plain: undefined,
    },
    bundleEmbedVerdicts: {
      hljs: undefined,
    },
    blockStripVerdicts: {
      hljs: undefined,
      mermaid: undefined,
    },
    rejectBreaker: new LRUCache({
      max: MAX_REFUSED_PUBLISHES,
    }),
  };
}
//@ chunk-enbhzjw4.js:11075-11225 placement
/**
 * 停止副本监督者（中止、清定时器、租约）。
 */
function stopSupervisor(e) {
  e.stopped = true;
  e.abort.abort();
  if (e.timer !== undefined) {
    clearTimeout(e.timer);
    e.timer = undefined;
  }
  delete e.lease;
  delete e.renewable;
  delete e.wake;
}
//@ chunk-enbhzjw4.js:11225-11248 placement
/**
 * 当前实时协作状态容器。
 */
class LiveStateHolder {
  current = undefined;
}
//@ chunk-enbhzjw4.js:11248-11272 placement
/**
 * 按会话根保存的实时协作状态。
 */
var liveStateSlot = new SessionRootSlot(() => new LiveStateHolder());
//@ chunk-enbhzjw4.js:11272-11302 placement
/**
 * 取（必要时创建）当前实时协作状态。
 */
function getLiveStateHolder() {
  return liveStateSlot.of(getRootSession());
}
//@ chunk-enbhzjw4.js:11302-11359 placement
/**
 * 取（必要时创建）当前实时协作状态。
 */
function getLiveState() {
  let liveStateHolder = getLiveStateHolder();
  liveStateHolder.current ??= createLiveState();
  return liveStateHolder.current;
}
//@ chunk-enbhzjw4.js:11359-11482 placement
/**
 * 记录某 artifact 讨论串最近一次自动回复的时间。
 */
function markAutoReplyTime(slug, threadId) {
  let n = getLiveStateHolder().current?.autoReact.artifacts.get(slug)?.threads.get(threadId);
  if (n !== undefined) n.lastAutoReplyAt = Date.now();
}
//@ chunk-enbhzjw4.js:11482-11602 placement
/**
 * 重置文档监视的通知预算。
 */
function resetNoticeBudgets() {
  let e = getLiveStateHolder().current;
  if (e === undefined) return;
  for (let noticeBudget of e.liveDocWatch.noticeBudgets.values()) noticeBudget.disclosed = false;
}
//@ chunk-enbhzjw4.js:11602-11693 placement
/**
 * 清除被拒发布的正文记录。
 */
function clearRefusedPublishBodies() {
  let e = getLiveStateHolder().current;
  if (e === undefined) return;
  e.refusedPublishBodies.clear();
  clearHandoverReadState();
}
//@ chunk-enbhzjw4.js:11693-11915 placement
/**
 * 清空所有待交接读取的已返回/已准备/完成者/重发确认记录，以及读取投递记录。
 */
function clearHandoverReadState() {
  let e = getLiveStateHolder().current;
  if (e === undefined) return;
  for (let pendingHandoverRead of e.pendingHandoverReads.values()) {
    pendingHandoverRead.linesReturned.clear();
    pendingHandoverRead.linesPrepared.clear();
    pendingHandoverRead.completedBy.clear();
    pendingHandoverRead.confirmsResendFor.clear();
  }
  e.readDeliveries.clear();
}
//@ chunk-enbhzjw4.js:11915-12193 placement
/**
 * 按仍保留的批次集合清理被拒发布内容记录：批次已不在的删除，观察来源已不在的去掉该字段。
 */
function pruneRefusedPublishBodies(e) {
  let r = getLiveStateHolder().current;
  if (r === undefined) return;
  let refusedPublishBodies = r.refusedPublishBodies;
  let s = replicaKey(undefined, "");
  for (let [l, i] of refusedPublishBodies) {
    if (!l.startsWith(s)) continue;
    if (!e.has(i.batch)) refusedPublishBodies.delete(l);
    else if (i.observedFrom !== undefined && i.observedFrom !== "" && !e.has(i.observedFrom))
      delete i.observedFrom;
  }
}
//@ chunk-enbhzjw4.js:12193-12233 placement
/**
 * 取当前实时协作房间。
 */
function currentRoom() {
  return getLiveStateHolder().current?.room;
}
//@ chunk-enbhzjw4.js:12233-12277 placement
/**
 * 取当前 presence 状态。
 */
function currentPresence() {
  return getLiveStateHolder().current?.presence;
}
//@ chunk-enbhzjw4.js:12277-12343 placement
/**
 * 释放某 slug 的 presence。
 */
function disposePresenceSlug(e) {
  let presence = getLiveStateHolder().current?.presence;
  presence?.disposeSlug?.(presence, e);
}
//@ chunk-enbhzjw4.js:12343-12408 placement
/**
 * 让某 slug 的 presence 退出。
 */
function retirePresenceSlug(slug) {
  let presence = getLiveStateHolder().current?.presence;
  presence?.retireSlug?.(presence, slug);
}
//@ chunk-enbhzjw4.js:12408-12474 placement
/**
 * 某 slug 是否被拒绝协作。
 */
function isPresenceDeclined(e) {
  return getLiveStateHolder().current?.presence.declined.has(e) === true;
}
//@ chunk-enbhzjw4.js:12474-12516 placement
/**
 * 是否已有实时协作状态。
 */
function hasLiveState() {
  return getLiveStateHolder().current !== undefined;
}
//@ chunk-enbhzjw4.js:12516-12566 placement
/**
 * 通知房间“同意状态变化”。
 */
function notifyRoomConsentChanged() {
  let e = currentRoom();
  e?.consentChanged?.(e);
}
//@ chunk-enbhzjw4.js:12566-12619 placement
/**
 * 通知房间“账号变化”。
 */
function notifyRoomAccountChanged(oauthAccountInfo) {
  let r = currentRoom();
  r?.accountChanged?.(r, oauthAccountInfo);
}
//@ chunk-enbhzjw4.js:12619-12662 placement
/**
 * 释放实时协作资源。
 */
function disposeLiveState() {
  let e = currentRoom();
  e?.dispose?.(e);
}
//@ chunk-enbhzjw4.js:12662-12715 placement
/**
 * 清空所有文档的日志状态。
 */
function clearAllJournals(e) {
  clearJournalPosition(e);
  for (let doc of e.docs.values()) bumpJournalFence(doc);
}
//@ chunk-enbhzjw4.js:12715-12772 placement
/**
 * 清空某状态的日志游标。
 */
function clearJournalPosition(e) {
  e.journalPos = undefined;
  e.journalPosOrd = undefined;
}
//@ chunk-enbhzjw4.js:12772-12824 placement
/**
 * 递增文档的日志代号（使旧日志失效）。
 */
function bumpJournalFence(doc) {
  doc.journalFence = undefined;
  doc.journalGen += 1;
}
//@ chunk-enbhzjw4.js:12824-13094 placement
function stopReplicaJournal(e) {
  let journal = e.journal;
  e.journal = undefined;
  e.journalCap = undefined;
  clearAllJournals(e);
  for (let doc of e.docs.values()) {
    if (doc.batchTimer !== undefined) {
      clearTimeout(doc.batchTimer);
      doc.batchTimer = undefined;
    }
    doc.batch = undefined;
    doc.batchPos = undefined;
    doc.batchHeardAt = undefined;
    doc.settling = undefined;
  }
  journal?.stop({
    killTask: false,
  });
}
//@ chunk-enbhzjw4.js:13094-13198 placement
/**
 * 重置本会话主体令牌缓存（清空令牌、账号置空并递增纪元）。
 */
function resetOwnPrincipalTokens(e) {
  e.ownPrincipalTokens.clear();
  e.ownPrincipalTokenAccount = null;
  e.ownPrincipalTokenEpoch++;
}
//@ chunk-enbhzjw4.js:13198-16084 placement
/**
 * 登出或换账号时重置实时协作状态。
 */
function resetLiveStateOnAccountChange(artifactAccount = "signed_out", incomingIdentity) {
  let n = getLiveStateHolder().current;
  if (n === undefined) return;
  resetOwnPrincipalTokens(n);
  n.profileNames.clear();
  n.profileIdsServed.clear();
  if (artifactAccount !== "same_account") {
    n.frameRelay.mcpAdvert = {
      tools: new Set(),
      until: 0,
    };
    n.frameRelay.mcpNarrower.clear();
    n.roster = undefined;
    n.rosterHeard = undefined;
    n.rosterWait = undefined;
    n.rosterWaitOver = false;
    n.assetsOnRoster = false;
    n.accountEpoch++;
    n.askClassOutsideOrgConsent.clear();
    n.askNamedOtherOrg.clear();
    n.postedReplyIds.clear();
    n.commentTargets.clear();
    n.summonStatus.handOffs.clear();
    n.summonStatus.queuedWakes.clear();
    n.verify.lastPublish = undefined;
    n.verify.reads.clear();
    n.ownPublishedSlugs.clear();
    n.ownCreatedSlugs.clear();
    n.routineTypeInstances.clear();
    n.strandedMints.clear();
    n.reservedMints.clear();
    n.live.heardVersions.clear();
    n.roomJoinArming.clear();
    resetCodeliveredFollowups(n);
    for (let supervisor of n.live.supervisors.values()) {
      delete supervisor.lease;
      delete supervisor.renewable;
    }
    n.live.nonEditorSlugs.clear();
    n.laneNoticeSlugs.clear();
    n.commentReads.clear();
    n.lastOthersCommentReadAt = Date.now();
    n.cleanReplyIds.clear();
    for (let otherComment of n.shareStatus.otherComments.values()) {
      otherComment.judged.clear();
      otherComment.judgedSends.clear();
    }
    n.live.pendingSubagentArms.clear();
    n.live.finishedSubagentAdopters.clear();
    n.live.repliesConsent.outstanding.clear();
    n.live.repliesConsent.declined.clear();
    n.live.repliesConsent.approved.clear();
    for (let artifact of n.autoReact.artifacts.values()) {
      artifact.heldReplyDeclined = false;
      artifact.heldReplyChain = null;
      for (let thread of artifact.threads.values()) {
        thread.ownReplyIds.clear();
        thread.ownReplyIdsIncomplete = false;
      }
    }
    n.liveDocWatch.journalUnavailable.clear();
    for (let journalNegotiation of n.liveDocWatch.journalNegotiations) journalNegotiation.abort();
    n.liveDocWatch.journalNegotiations.clear();
    for (let i of n.liveDocWatch.arming.values()) for (let o of i.reviving) stopReplicaJournal(o);
    n.liveDocWatch.stopAll?.(artifactAccount);
    n.live.endAll?.(artifactAccount);
    for (let i of n.liveReplicas.replicas.values()) {
      i.watcher?.close();
      clearTimeout(i.pushHold?.due);
    }
    n.liveReplicas.replicas.clear();
    n.liveReplicas.unavailable.clear();
    n.liveReplicas.tooOld.clear();
    n.liveReplicas.cloudUnserved.clear();
    n.liveReplicas.opening.clear();
    n.liveReplicas.unanswered.clear();
    n.createdFromType.clear();
    n.deferredSurface.clear();
    n.remoteControlSkippedSlugs.clear();
    n.typeInstanceFiles.clear();
    n.publishedSources.clear();
    n.pathPins.clear();
    n.typeCatalogVouch.clear();
    n.typeDescriptions.clear();
    n.attestedTypeArtifacts.clear();
    n.typeCapabilityReads.clear();
    n.quickstartRan.clear();
    n.anchorSnippets.clear();
    n.shareStatus.accountBoundaryAt = Date.now();
    n.shareStatus.probeBoots.clear();
    for (let [i, o] of n.shareStatus.bySlug)
      if (
        o.probeErrorCode !== undefined ||
        o.role !== undefined ||
        o.outsideOrgReader !== undefined ||
        o.external !== undefined ||
        o.endpointConnectors !== undefined ||
        o.connectorsIssuedAt !== undefined ||
        o.lastConnectorsReadToolUseId !== undefined
      ) {
        let {
          probeErrorCode,
          probeGone,
          role,
          outsideOrgReader,
          external,
          endpointConnectors,
          connectorsIssuedAt,
          lastConnectorsReadToolUseId,
          ...h
        } = o;
        n.shareStatus.bySlug.set(i, h);
      }
  }
  let { room, presence } = n;
  room.accountChanged?.(room, incomingIdentity);
  presence.accountChanged?.(presence, incomingIdentity);
}
//@ chunk-enbhzjw4.js:16084-16708 placement
/**
 * 登出前推送挂起的保存并发送最终分歧报告。
 */
async function flushReplicasBeforeLogout(artifactAccount) {
  if (artifactAccount === "same_account") return;
  let r = getLiveStateHolder().current;
  if (r === undefined || r.liveReplicas.replicas.size === 0) return;
  let n = [];
  let pushHeldSaves = r.liveReplicas.pushHeldSaves;
  if (pushHeldSaves !== undefined)
    n.push(
      pushHeldSaves().then(
        () => logForDebugging("[liveReplica] held saves pushed before logout"),
        (error) =>
          logForDebugging(`[liveReplica] held saves not pushed before logout: ${errorMessage(error)}`),
      ),
    );
  for (let [l, i] of r.liveReplicas.replicas)
    n.push(
      i.replica.sendFinalReport().then(
        (o) =>
          logForDebugging(
            `[liveReplica] final divergence report before logout ${l}: ${o ? "tried" : "nothing due"}`,
          ),
        (error) =>
          logForDebugging(
            `[liveReplica] final divergence report before logout ${l} failed: ${errorMessage(error)}`,
          ),
      ),
    );
  await Promise.race([Promise.all(n), sleep(2000)]);
}
//@ chunk-enbhzjw4.js:16708-17059 placement
/**
 * 对话结束时停止文档监视并发送最终报告。
 */
function retireConversationReplicas() {
  let e = getLiveStateHolder().current;
  e?.liveDocWatch.stopAll?.("clear");
  if (e !== undefined)
    for (let [r, n] of e.liveReplicas.replicas)
      n.replica.sendFinalReport().then(
        (s) =>
          logForDebugging(
            `[liveReplica] final divergence report at conversation retire ${r}: ${s ? "tried" : "nothing due"}`,
          ),
        (error) =>
          logForDebugging(
            `[liveReplica] final divergence report at conversation retire ${r} failed: ${errorMessage(error)}`,
          ),
      );
}
//@ chunk-enbhzjw4.js:17059-18027 placement
/**
 * 新对话时重置会话级集合（自有 slug、实例等）。
 */
function resetForNewConversation(e) {
  let r = getLiveStateHolder().current;
  if (r === undefined) return;
  if (e?.continuesConversation !== true) {
    r.conversationEpoch++;
    r.ownPublishedSlugs.clear();
    r.ownCreatedSlugs.clear();
    r.routineTypeInstances.clear();
    r.strandedMints.clear();
    r.reservedMints.clear();
    r.live.heardVersions.clear();
    r.roomJoinArming.clear();
    r.roomStoppedByUser.clear();
    r.roomArmAsked.clear();
    r.roomArmRefusedByUser.clear();
    resetCodeliveredFollowups(r);
    r.live.nonEditorSlugs.clear();
    r.live.pendingSubagentArms.clear();
    r.live.finishedSubagentAdopters.clear();
    r.live.repliesConsent.outstanding.clear();
    r.live.repliesConsent.declined.clear();
    r.live.repliesConsent.approved.clear();
    r.deferredSurface.clear();
    r.remoteControlSkippedSlugs.clear();
  }
  r.createdFromType.clear();
  r.verify.lastPublish = undefined;
  r.verify.reads.clear();
  if (e?.continuesConversation !== true) {
    r.pathPins.clear();
    r.publishedSources.clear();
    r.resultNotes.kindSaid = false;
    r.resultNotes.watchCodesSaid.clear();
    r.resultNotes.previewedPaths.clear();
    r.resultNotes.previewHintedPaths.clear();
  }
}
export {
  getLiveState,
  hasLiveState,
  replicaKey,
  REFUSED_CAPACITY_HINT,
  REFUSED_CAPACITY_WINDOW,
  disposeLiveState,
  resetNoticeBudgets,
  retireConversationReplicas,
  clearRefusedPublishBodies,
  resetForNewConversation,
  notifyRoomConsentChanged,
  resetLiveStateOnAccountChange,
  markAutoReplyTime,
  revokeCodeliveredFollowups,
  isPresenceDeclined,
  retirePresenceSlug,
  currentPresence,
  stopSupervisor,
  disposePresenceSlug,
  resetOwnPrincipalTokens,
  pruneRefusedPublishBodies,
  clearHandoverReadState,
  flushReplicasBeforeLogout,
  notifyRoomAccountChanged,
  currentRoom,
};
