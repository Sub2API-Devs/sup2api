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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-enbhzjw4.js:406-804 placement
/**
 * 记录副本分歧条目（有上限）。
 */
class DivergenceNotes {
  #e = new Map();
  #t = new Set();
  note(slug, part, generation) {
    if (this.#t.has(slug)) return;
    let parts = this.#e.get(slug);
    if (parts !== undefined) {
      if (parts.has(part)) return;
      if (parts.size >= 4) {
        this.#n(slug);
        return;
      }
      parts.set(part, generation);
      return;
    }
    if (this.#e.size >= 256) {
      let remaining = 128;
      for (let key of this.#e.keys()) {
        this.#n(key);
        if (--remaining === 0) break;
      }
    }
    this.#e.set(slug, new Map([[part, generation]]));
  }
  #n(slug) {
    this.#e.delete(slug);
    this.#t.add(slug);
  }
  take(slug, part) {
    let parts = this.#e.get(slug);
    this.#e.delete(slug);
    return parts?.get(part);
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
  constructor(map, slug, record) {
    this.#e = map;
    this.#t = slug;
    this.#n = record;
  }
  settle(outcome) {
    if (this.#r) return;
    this.#r = true;
    if (this.#e.get(this.#t) !== this.#n) return;
    this.#n.pending--;
    if (outcome.wasWatching || outcome.teardown !== "unsent") this.#n.confirmed = true;
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
  isStopped(slug) {
    return this.#e.has(slug);
  }
  stoppedSlugs() {
    return this.#e.keys();
  }
  latchGeneration(slug) {
    return this.#e.get(slug)?.generation;
  }
  recordStop(slug) {
    this.#n.delete(slug);
    let record = this.#e.get(slug);
    if (record === undefined) {
      record = {
        pending: 0,
        confirmed: false,
        generation: this.#t++,
      };
      this.#e.set(slug, record);
    } else record.generation = this.#t++;
    record.pending++;
    return new WatchSettleTicket(this.#e, slug, record);
  }
  reaffirmStop(slug) {
    this.#n.delete(slug);
    let record = this.#e.get(slug);
    if (record === undefined) this.confirmStop(slug);
    else record.confirmed = true;
  }
  confirmStop(slug) {
    this.#n.delete(slug);
    let record = this.#e.get(slug);
    if (record === undefined)
      this.#e.set(slug, {
        pending: 0,
        confirmed: true,
        generation: this.#t++,
      });
    else {
      record.confirmed = true;
      record.generation = this.#t++;
    }
  }
  noteRelatchAsk(askerSlug, slug) {
    this.#r.note(askerSlug, slug, this.latchGeneration(slug));
  }
  takeRelatchAsk(askerSlug, slug) {
    return this.#r.take(askerSlug, slug);
  }
  clearByApprovedRewatch(slug, generation) {
    let record = this.#e.get(slug);
    if (record === undefined || record.generation !== generation) return;
    this.#e.delete(slug);
    this.#n.add(slug);
  }
  noteApprovedWatch(slug) {
    if (!this.#e.has(slug)) this.#n.add(slug);
  }
  wasClearedByRewatch(slug) {
    return this.#n.has(slug) && !this.#e.has(slug);
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
function replicaKey(key, id) {
  return `${key ?? "main"}
${id}`;
}
//@ chunk-enbhzjw4.js:2682-2881 placement
function resetCodeliveredFollowups(state) {
  let followups = [...state.codeliveredFollowups.values()];
  state.codeliveredFollowups.clear();
  for (let { revoke } of followups) revoke("reset");
  state.coordinatorEditors.clear();
  state.editorSettleWatch?.();
  state.editorSettleWatch = null;
}
//@ chunk-enbhzjw4.js:2881-3067 placement
/**
 * 撤销指定 slug 的共同投递跟进。
 */
function revokeCodeliveredFollowups(slug, reason, options) {
  let liveState = getLiveStateHolder().current;
  if (liveState === undefined) return;
  for (let [key, followup] of liveState.codeliveredFollowups)
    if (followup.slug === slug && followup.agentId !== options?.exceptAgentId) {
      liveState.codeliveredFollowups.delete(key);
      followup.revoke(reason);
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
function stopSupervisor(supervisor) {
  supervisor.stopped = true;
  supervisor.abort.abort();
  if (supervisor.timer !== undefined) {
    clearTimeout(supervisor.timer);
    supervisor.timer = undefined;
  }
  delete supervisor.lease;
  delete supervisor.renewable;
  delete supervisor.wake;
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
var liveStateSlot; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-enbhzjw4.js:11248", () => {
  liveStateSlot = new SessionRootSlot(() => new LiveStateHolder());
});
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
  let artifact = getLiveStateHolder().current?.autoReact.artifacts.get(slug)?.threads.get(threadId);
  if (artifact !== undefined) artifact.lastAutoReplyAt = Date.now();
}
//@ chunk-enbhzjw4.js:11482-11602 placement
/**
 * 重置文档监视的通知预算。
 */
function resetNoticeBudgets() {
  let live = getLiveStateHolder().current;
  if (live === undefined) return;
  for (let noticeBudget of live.liveDocWatch.noticeBudgets.values()) noticeBudget.disclosed = false;
}
//@ chunk-enbhzjw4.js:11602-11693 placement
/**
 * 清除被拒发布的正文记录。
 */
function clearRefusedPublishBodies() {
  let live = getLiveStateHolder().current;
  if (live === undefined) return;
  live.refusedPublishBodies.clear();
  clearHandoverReadState();
}
//@ chunk-enbhzjw4.js:11693-11915 placement
/**
 * 清空所有待交接读取的已返回/已准备/完成者/重发确认记录，以及读取投递记录。
 */
function clearHandoverReadState() {
  let live = getLiveStateHolder().current;
  if (live === undefined) return;
  for (let pendingHandoverRead of live.pendingHandoverReads.values()) {
    pendingHandoverRead.linesReturned.clear();
    pendingHandoverRead.linesPrepared.clear();
    pendingHandoverRead.completedBy.clear();
    pendingHandoverRead.confirmsResendFor.clear();
  }
  live.readDeliveries.clear();
}
//@ chunk-enbhzjw4.js:11915-12193 placement
/**
 * 按仍保留的批次集合清理被拒发布内容记录：批次已不在的删除，观察来源已不在的去掉该字段。
 */
function pruneRefusedPublishBodies(knownBatches) {
  let liveState = getLiveStateHolder().current;
  if (liveState === undefined) return;
  let refusedPublishBodies = liveState.refusedPublishBodies;
  let prefix = replicaKey(undefined, "");
  for (let [key, entry] of refusedPublishBodies) {
    if (!key.startsWith(prefix)) continue;
    if (!knownBatches.has(entry.batch)) refusedPublishBodies.delete(key);
    else if (
      entry.observedFrom !== undefined &&
      entry.observedFrom !== "" &&
      !knownBatches.has(entry.observedFrom)
    )
      delete entry.observedFrom;
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
function disposePresenceSlug(slug) {
  let presence = getLiveStateHolder().current?.presence;
  presence?.disposeSlug?.(presence, slug);
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
function isPresenceDeclined(slug) {
  return getLiveStateHolder().current?.presence.declined.has(slug) === true;
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
  let room = currentRoom();
  room?.consentChanged?.(room);
}
//@ chunk-enbhzjw4.js:12566-12619 placement
/**
 * 通知房间“账号变化”。
 */
function notifyRoomAccountChanged(oauthAccountInfo) {
  let room = currentRoom();
  room?.accountChanged?.(room, oauthAccountInfo);
}
//@ chunk-enbhzjw4.js:12619-12662 placement
/**
 * 释放实时协作资源。
 */
function disposeLiveState() {
  let room = currentRoom();
  room?.dispose?.(room);
}
//@ chunk-enbhzjw4.js:12662-12715 placement
/**
 * 清空所有文档的日志状态。
 */
function clearAllJournals(live) {
  clearJournalPosition(live);
  for (let doc of live.docs.values()) bumpJournalFence(doc);
}
//@ chunk-enbhzjw4.js:12715-12772 placement
/**
 * 清空某状态的日志游标。
 */
function clearJournalPosition(live) {
  live.journalPos = undefined;
  live.journalPosOrd = undefined;
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
function stopReplicaJournal(replica) {
  let journal = replica.journal;
  replica.journal = undefined;
  replica.journalCap = undefined;
  clearAllJournals(replica);
  for (let doc of replica.docs.values()) {
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
function resetOwnPrincipalTokens(replica) {
  replica.ownPrincipalTokens.clear();
  replica.ownPrincipalTokenAccount = null;
  replica.ownPrincipalTokenEpoch++;
}
//@ chunk-enbhzjw4.js:13198-16084 placement
/**
 * 登出或换账号时重置实时协作状态。
 */
function resetLiveStateOnAccountChange(artifactAccount = "signed_out", incomingIdentity) {
  let liveState = getLiveStateHolder().current;
  if (liveState === undefined) return;
  resetOwnPrincipalTokens(liveState);
  liveState.profileNames.clear();
  liveState.profileIdsServed.clear();
  if (artifactAccount !== "same_account") {
    liveState.frameRelay.mcpAdvert = {
      tools: new Set(),
      until: 0,
    };
    liveState.frameRelay.mcpNarrower.clear();
    liveState.roster = undefined;
    liveState.rosterHeard = undefined;
    liveState.rosterWait = undefined;
    liveState.rosterWaitOver = false;
    liveState.assetsOnRoster = false;
    liveState.accountEpoch++;
    liveState.askClassOutsideOrgConsent.clear();
    liveState.askNamedOtherOrg.clear();
    liveState.postedReplyIds.clear();
    liveState.commentTargets.clear();
    liveState.summonStatus.handOffs.clear();
    liveState.summonStatus.queuedWakes.clear();
    liveState.verify.lastPublish = undefined;
    liveState.verify.reads.clear();
    liveState.ownPublishedSlugs.clear();
    liveState.ownCreatedSlugs.clear();
    liveState.routineTypeInstances.clear();
    liveState.strandedMints.clear();
    liveState.reservedMints.clear();
    liveState.live.heardVersions.clear();
    liveState.roomJoinArming.clear();
    resetCodeliveredFollowups(liveState);
    for (let supervisor of liveState.live.supervisors.values()) {
      delete supervisor.lease;
      delete supervisor.renewable;
    }
    liveState.live.nonEditorSlugs.clear();
    liveState.laneNoticeSlugs.clear();
    liveState.commentReads.clear();
    liveState.lastOthersCommentReadAt = Date.now();
    liveState.cleanReplyIds.clear();
    for (let otherComment of liveState.shareStatus.otherComments.values()) {
      otherComment.judged.clear();
      otherComment.judgedSends.clear();
    }
    liveState.live.pendingSubagentArms.clear();
    liveState.live.finishedSubagentAdopters.clear();
    liveState.live.repliesConsent.outstanding.clear();
    liveState.live.repliesConsent.declined.clear();
    liveState.live.repliesConsent.approved.clear();
    for (let artifact of liveState.autoReact.artifacts.values()) {
      artifact.heldReplyDeclined = false;
      artifact.heldReplyChain = null;
      for (let thread of artifact.threads.values()) {
        thread.ownReplyIds.clear();
        thread.ownReplyIdsIncomplete = false;
      }
    }
    liveState.liveDocWatch.journalUnavailable.clear();
    for (let journalNegotiation of liveState.liveDocWatch.journalNegotiations) journalNegotiation.abort();
    liveState.liveDocWatch.journalNegotiations.clear();
    for (let arming of liveState.liveDocWatch.arming.values())
      for (let job of arming.reviving) stopReplicaJournal(job);
    liveState.liveDocWatch.stopAll?.(artifactAccount);
    liveState.live.endAll?.(artifactAccount);
    for (let replica of liveState.liveReplicas.replicas.values()) {
      replica.watcher?.close();
      clearTimeout(replica.pushHold?.due);
    }
    liveState.liveReplicas.replicas.clear();
    liveState.liveReplicas.unavailable.clear();
    liveState.liveReplicas.tooOld.clear();
    liveState.liveReplicas.cloudUnserved.clear();
    liveState.liveReplicas.opening.clear();
    liveState.liveReplicas.unanswered.clear();
    liveState.createdFromType.clear();
    liveState.deferredSurface.clear();
    liveState.remoteControlSkippedSlugs.clear();
    liveState.typeInstanceFiles.clear();
    liveState.publishedSources.clear();
    liveState.pathPins.clear();
    liveState.typeCatalogVouch.clear();
    liveState.typeDescriptions.clear();
    liveState.attestedTypeArtifacts.clear();
    liveState.typeCapabilityReads.clear();
    liveState.quickstartRan.clear();
    liveState.anchorSnippets.clear();
    liveState.shareStatus.accountBoundaryAt = Date.now();
    liveState.shareStatus.probeBoots.clear();
    for (let [slug, shareStatus] of liveState.shareStatus.bySlug)
      if (
        shareStatus.probeErrorCode !== undefined ||
        shareStatus.role !== undefined ||
        shareStatus.outsideOrgReader !== undefined ||
        shareStatus.external !== undefined ||
        shareStatus.endpointConnectors !== undefined ||
        shareStatus.connectorsIssuedAt !== undefined ||
        shareStatus.lastConnectorsReadToolUseId !== undefined
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
          ...rest
        } = shareStatus;
        liveState.shareStatus.bySlug.set(slug, rest);
      }
  }
  let { room, presence } = liveState;
  room.accountChanged?.(room, incomingIdentity);
  presence.accountChanged?.(presence, incomingIdentity);
}
//@ chunk-enbhzjw4.js:16084-16708 placement
/**
 * 登出前推送挂起的保存并发送最终分歧报告。
 */
async function flushReplicasBeforeLogout(artifactAccount) {
  if (artifactAccount === "same_account") return;
  let liveState = getLiveStateHolder().current;
  if (liveState === undefined || liveState.liveReplicas.replicas.size === 0) return;
  let pending = [];
  let pushHeldSaves = liveState.liveReplicas.pushHeldSaves;
  if (pushHeldSaves !== undefined)
    pending.push(
      pushHeldSaves().then(
        () => logForDebugging("[liveReplica] held saves pushed before logout"),
        (error) =>
          logForDebugging(`[liveReplica] held saves not pushed before logout: ${errorMessage(error)}`),
      ),
    );
  for (let [key, replica] of liveState.liveReplicas.replicas)
    pending.push(
      replica.replica.sendFinalReport().then(
        (tried) =>
          logForDebugging(
            `[liveReplica] final divergence report before logout ${key}: ${tried ? "tried" : "nothing due"}`,
          ),
        (error) =>
          logForDebugging(
            `[liveReplica] final divergence report before logout ${key} failed: ${errorMessage(error)}`,
          ),
      ),
    );
  await Promise.race([Promise.all(pending), sleep(2000)]);
}
//@ chunk-enbhzjw4.js:16708-17059 placement
/**
 * 对话结束时停止文档监视并发送最终报告。
 */
function retireConversationReplicas() {
  let liveState = getLiveStateHolder().current;
  liveState?.liveDocWatch.stopAll?.("clear");
  if (liveState !== undefined)
    for (let [key, replica] of liveState.liveReplicas.replicas)
      replica.replica.sendFinalReport().then(
        (tried) =>
          logForDebugging(
            `[liveReplica] final divergence report at conversation retire ${key}: ${tried ? "tried" : "nothing due"}`,
          ),
        (error) =>
          logForDebugging(
            `[liveReplica] final divergence report at conversation retire ${key} failed: ${errorMessage(error)}`,
          ),
      );
}
//@ chunk-enbhzjw4.js:17059-18027 placement
/**
 * 新对话时重置会话级集合（自有 slug、实例等）。
 */
function resetForNewConversation(reason) {
  let live = getLiveStateHolder().current;
  if (live === undefined) return;
  if (reason?.continuesConversation !== true) {
    live.conversationEpoch++;
    live.ownPublishedSlugs.clear();
    live.ownCreatedSlugs.clear();
    live.routineTypeInstances.clear();
    live.strandedMints.clear();
    live.reservedMints.clear();
    live.live.heardVersions.clear();
    live.roomJoinArming.clear();
    live.roomStoppedByUser.clear();
    live.roomArmAsked.clear();
    live.roomArmRefusedByUser.clear();
    resetCodeliveredFollowups(live);
    live.live.nonEditorSlugs.clear();
    live.live.pendingSubagentArms.clear();
    live.live.finishedSubagentAdopters.clear();
    live.live.repliesConsent.outstanding.clear();
    live.live.repliesConsent.declined.clear();
    live.live.repliesConsent.approved.clear();
    live.deferredSurface.clear();
    live.remoteControlSkippedSlugs.clear();
  }
  live.createdFromType.clear();
  live.verify.lastPublish = undefined;
  live.verify.reads.clear();
  if (reason?.continuesConversation !== true) {
    live.pathPins.clear();
    live.publishedSources.clear();
    live.resultNotes.kindSaid = false;
    live.resultNotes.watchCodesSaid.clear();
    live.resultNotes.previewedPaths.clear();
    live.resultNotes.previewHintedPaths.clear();
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
