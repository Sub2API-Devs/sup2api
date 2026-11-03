/**
 * utils/task/taskNotifications.ts
 *
 * 2.1.316 新增：任务输出目录与链接记录；任务通知队列（按 key 分组、驱逐、级别持有）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (30)
 * attribution: placement 30
 */
import {
  randomBytes,
  randomBytes as randomBytes_2,
  randomBytes as randomBytes_3,
  randomBytes as randomBytes_4,
  randomBytes as randomBytes_5,
  randomBytes as randomBytes_6,
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
  randomUUID as randomUUID_6,
  randomUUID as randomUUID_7,
  randomUUID as randomUUID_8,
  randomUUID as randomUUID_9,
  randomUUID as randomUUID_10,
} from "crypto";
import { createSignal } from "../signal.js";
import { HostScoped } from "../hostScoped.js";
import {
  getRootSession,
  getIsNonInteractiveSession,
  isReplBridgeActive,
  getSessionId,
} from "../../bootstrap/state.js";
import { logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { isDiagLogging, isInDiagScope } from "../diagLogs.js";

/**
 * 任务错误状态表。
 */
//@ chunk-aepeg2w5.js:345356-345820 placement
var TASK_ERROR_STATUSES = {
    stalled: !0,
    error: !0,
    api_error: !0,
    "api_error:authentication_failed": !0,
    "api_error:oauth_org_not_allowed": !0,
    "api_error:account_on_hold": !0,
    "api_error:verification_required": !0,
    "api_error:billing_error": !0,
    "api_error:rate_limit": !0,
    "api_error:overloaded": !0,
    "api_error:invalid_request": !0,
    "api_error:model_not_found": !0,
    "api_error:server_error": !0,
    "api_error:unknown": !0,
    "api_error:max_output_tokens": !0,
    "api_error:cloud_credential_error": !0,
  },
  weakMap_2 = new WeakMap();
//@ chunk-aepeg2w5.js:345820-345873 placement
function Uxt(e, n) {
  if (n !== void 0) weakMap_2.set(e, n);
  return e;
}
//@ chunk-aepeg2w5.js:345873-345971 placement
function Jpr(e) {
  let n = e === void 0 ? void 0 : weakMap_2.get(e);
  return n !== void 0 && Object.hasOwn(TASK_ERROR_STATUSES, n) ? n : void 0;
}
//@ chunk-aepeg2w5.js:346009-346068 placement
var TE = 200,
  KU = 64,
  GU = 64,
  CE = Date.now() - process.uptime() * 1000;
/**
 * 任务输出目录与链接记录。
 */
//@ chunk-aepeg2w5.js:346068-349666 placement
class TaskOutputLinks {
  outputDir = void 0;
  linkedOutputs = new Map();
  linksInheritedBefore = CE;
  inheritedLinkLines = new Map();
  inheritPredecessorLinks(e, n) {
    if (!Number.isFinite(n)) return;
    this.inheritedLinkLines.set(e, Math.max(CE, Math.min(Date.now(), n)));
  }
  linksInheritedBeforeFor(e) {
    return Math.max(this.linksInheritedBefore, this.inheritedLinkLines.get(e) ?? 0);
  }
  outputPathBindings = new Map();
  pendingOutputOps = new Set();
  diskOutputs = new Map();
  terminalEmitClaims = new Set();
  runIds = new Map();
  evictedRunIds = new Map();
  monitorSockets = new Map();
  streamedMonitorStops = new Map();
  mcpCallProgress = new WeakMap();
  remoteSessionLogs = new Map();
  reportedBashTaskDeliveries = new Set();
  bashTaskDeliveryOutcomes = new Map();
  bashTaskSnapshots = new Map();
  bashTaskGetCounts = new Map();
  lastPressureReapAt = 0;
  quietShellOwners = new Map();
  bashTaskGetsByResponse = new Map();
  withdrawShellNotification = void 0;
  onSubagentResume = void 0;
  mainThreadContexts = new Map();
  spawnedByMainThread = new Set();
  parkedTeardowns = new Map();
  killAgentMonitors = void 0;
  autoReactHumanTurnObserver = void 0;
  frameLiveUserStopObserver = void 0;
  liveDocUserStopObserver = void 0;
  autoReactDeliberateStopObserver = void 0;
  artifactRoomStopObserver = void 0;
  artifactPresenceStopObserver = void 0;
  agentIdleWindowTimers = new Map();
  agentBackgroundSignalResolvers = new Map();
  exclusiveCallQueuedBehind = new Map();
  resumesInFlight = new Set();
  chatPinForfeitedAgentIds = new Set();
  canUseToolNarrowings = new Map();
  taskEvicted = createSignal();
  agentStrandedMessages = createSignal();
  agentSpawned = createSignal();
  agentSettled = createSignal();
  agentResumeFailed = createSignal();
  cascadeStopExemptions = new Set();
  heldShellReleases = new Map();
  cascadeSpared = createSignal();
  constructor() {
    this.taskEvicted.subscribe((e) => {
      (this.remoteSessionLogs.delete(e), this.retireRunId(e));
    });
  }
  retireRunId(e) {
    let n = this.runIds.get(e);
    if (n === void 0) return;
    if (
      (this.runIds.delete(e),
      this.evictedRunIds.delete(e),
      this.evictedRunIds.set(e, n),
      this.evictedRunIds.size > GU)
    ) {
      let r = this.evictedRunIds.keys().next().value;
      if (r !== void 0) this.evictedRunIds.delete(r);
    }
  }
  rememberBashTaskSnapshot(e, n, r) {
    if (
      (this.bashTaskSnapshots.delete(e),
      this.bashTaskSnapshots.set(e, { snapshot: n, agentId: r, fetched: !1 }),
      this.bashTaskSnapshots.size > TE)
    ) {
      let s = this.bashTaskSnapshots.keys().next().value;
      if (s !== void 0) this.bashTaskSnapshots.delete(s);
    }
  }
  countBashTaskGet(e) {
    let n = (this.bashTaskGetCounts.get(e) ?? 0) + 1;
    if (
      (this.bashTaskGetCounts.delete(e), this.bashTaskGetCounts.set(e, n), this.bashTaskGetCounts.size > TE)
    ) {
      let r = this.bashTaskGetCounts.keys().next().value;
      if (r !== void 0) this.bashTaskGetCounts.delete(r);
    }
    return n;
  }
  countBashTaskGetInResponse(e, n, r) {
    let s = this.bashTaskGetsByResponse.get(e) ?? new Map();
    if (
      (this.bashTaskGetsByResponse.delete(e),
      this.bashTaskGetsByResponse.set(e, s),
      this.bashTaskGetsByResponse.size > KU)
    ) {
      let S = this.bashTaskGetsByResponse.keys().next().value;
      if (S !== void 0) this.bashTaskGetsByResponse.delete(S);
    }
    let h = s.get(n),
      y = h?.statusKey === r ? h.count + 1 : 1;
    return (s.set(n, { count: y, statusKey: r }), y);
  }
  markBashTaskSnapshotFetched(e) {
    let n = this.bashTaskSnapshots.get(e);
    if (n) this.bashTaskSnapshots.set(e, { ...n, fetched: !0 });
  }
  reset() {
    ((this.outputDir = void 0), this.linkedOutputs.clear(), this.outputPathBindings.clear());
    for (let e of this.diskOutputs.values()) e.cancel();
    (this.diskOutputs.clear(),
      this.terminalEmitClaims.clear(),
      this.runIds.clear(),
      this.evictedRunIds.clear(),
      this.remoteSessionLogs.clear(),
      this.bashTaskSnapshots.clear(),
      this.bashTaskGetCounts.clear(),
      (this.lastPressureReapAt = 0),
      this.quietShellOwners.clear(),
      this.bashTaskGetsByResponse.clear(),
      this.reportedBashTaskDeliveries.clear(),
      this.bashTaskDeliveryOutcomes.clear());
  }
  async drainDiskOutputs() {
    for (let e of this.diskOutputs.values()) e.cancel();
    while (this.pendingOutputOps.size > 0) await Promise.allSettled([...this.pendingOutputOps]);
    this.diskOutputs.clear();
  }
}
//@ chunk-aepeg2w5.js:349666-349691 placement
var $U = new HostScoped(() => new TaskOutputLinks());
/**
 * 任务运行 id 存储（按 host）。
 */
//@ chunk-aepeg2w5.js:349691-349728 placement
function getTaskRunState() {
  return $U.of(getRootSession().host);
}
//@ chunk-aepeg2w5.js:349728-349770 placement
var VU = 9,
  YU = /^([0-9a-z]{9})-[0-9a-f]{8}$/;
/**
 * 取任务的运行 id。
 */
//@ chunk-aepeg2w5.js:349770-349846 placement
function getRunId(e) {
  let { runIds: runIds, evictedRunIds: evictedRunIds } = getTaskRunState();
  return runIds.get(e) ?? evictedRunIds.get(e);
}
//@ chunk-aepeg2w5.js:349846-349905 placement
function qU(e) {
  let n = getRunId(e);
  return n === void 0 ? void 0 : nss(n);
}
//@ chunk-aepeg2w5.js:349905-349983 placement
function nss(e) {
  let n = YU.exec(e)?.[1];
  return n === void 0 ? void 0 : parseInt(n, 36);
}
//@ chunk-aepeg2w5.js:349983-350028 placement
function Qpr(e, n = makeTimeOrderedId(e)) {
  getTaskRunState().runIds.set(e, n);
}
//@ chunk-aepeg2w5.js:350028-350144 placement = generatePlaceholders (0.758)
function makeTimeOrderedId(e) {
  return `${Math.max(Date.now(), (qU(e) ?? -1) + 1)
    .toString(36)
    .padStart(VU, "0")}-${randomBytes_2(4).toString("hex")}`;
}
/**
 * 认领某任务的终态通知发送权（每个任务只能认领一次）。
 */
//@ chunk-aepeg2w5.js:350144-350244 placement
function claimTerminalEmit(e) {
  if (getTaskRunState().terminalEmitClaims.has(e)) return !1;
  return (getTaskRunState().terminalEmitClaims.add(e), !0);
}
//@ chunk-aepeg2w5.js:350244-350301 placement
function rss(e) {
  return getTaskRunState().terminalEmitClaims.delete(e);
}
//@ chunk-aepeg2w5.js:350301-350331 placement = getClientSurface (0.78)
var QU = 1000,
  CLI = "cli",
  ZU = 1000;
/**
 * 任务通知队列（按 key 分组、驱逐、级别持有）。
 */
//@ chunk-aepeg2w5.js:350331-353341 placement
class TaskNotificationQueue {
  queueKey = () => CLI;
  queuesByKey = new Map();
  evictedKeys = new Set();
  enqueueListener = null;
  queueUsedReported = !1;
  nonbookendEvictionReported = !1;
  bookendEvictionReported = !1;
  levelHolds = 0;
  heldLevels = new Map();
  redactsPersistedLane = () => !1;
  setQueueKey(e) {
    this.queueKey = e;
  }
  currentKey() {
    return this.queueKey();
  }
  setEnqueueListener(e) {
    this.enqueueListener = e;
  }
  queueCount() {
    return this.queuesByKey.size;
  }
  reset() {
    (this.queuesByKey.clear(),
      this.evictedKeys.clear(),
      (this.queueKey = () => CLI),
      (this.enqueueListener = null),
      (this.redactsPersistedLane = () => !1),
      (this.queueUsedReported = !1),
      (this.nonbookendEvictionReported = !1),
      (this.bookendEvictionReported = !1),
      (this.levelHolds = 0),
      this.heldLevels.clear());
  }
  currentQueueOrCreate(e) {
    if (this.evictedKeys.has(e)) return null;
    let n = this.queuesByKey.get(e);
    if (!n) ((n = []), this.queuesByKey.set(e, n));
    return n;
  }
  currentQueueOrNull() {
    return this.queuesByKey.get(this.queueKey()) ?? null;
  }
  evictKey(e) {
    if ((this.queuesByKey.delete(e), this.evictedKeys.add(e), this.evictedKeys.size > ZU)) {
      let n = this.evictedKeys.values().next().value;
      if (n !== void 0) this.evictedKeys.delete(n);
    }
  }
  enqueue(e, n = this.queueKey()) {
    if (this.levelHolds > 0 && e.type === "system" && e.subtype === "background_tasks_changed") {
      this.heldLevels.set(n, e);
      return;
    }
    if (!getIsNonInteractiveSession() && !isReplBridgeActive()) return;
    if (e.type === "stream_event" && !getIsNonInteractiveSession() && this.enqueueListener === null) return;
    let currentQueueOrCreate = this.currentQueueOrCreate(n);
    if (!currentQueueOrCreate) return;
    if (currentQueueOrCreate.length >= QU) {
      if (e.type === "stream_event") return;
      let index = currentQueueOrCreate.findIndex(
        (h) =>
          h.type !== "conversation_reset" &&
          (h.type !== "system" ||
            (h.subtype !== "task_started" &&
              h.subtype !== "task_notification" &&
              h.subtype !== "dev_intent" &&
              !(h.subtype === "status" && h.status === null) &&
              !(h.subtype === "permission_check_status" && h.status === "done"))),
      );
      if (index === -1)
        index = currentQueueOrCreate.findIndex(
          (h) => h.type === "system" && h.subtype === "permission_check_status" && h.status === "done",
        );
      if (index === -1) {
        if (!this.bookendEvictionReported)
          ((this.bookendEvictionReported = !0), logFeatureSad("task_event_queue", "bookend_evicted"));
        let index = currentQueueOrCreate.findIndex(
          (y) =>
            y.type !== "conversation_reset" &&
            !(
              y.type === "system" &&
              ((y.subtype === "status" && y.status === null) || y.subtype === "dev_intent")
            ),
        );
        if (index === -1) currentQueueOrCreate.shift();
        else currentQueueOrCreate.splice(index, 1);
      } else {
        if (!this.nonbookendEvictionReported)
          ((this.nonbookendEvictionReported = !0), logFeatureSad("task_event_queue", "nonbookend_evicted"));
        currentQueueOrCreate.splice(index, 1);
      }
    }
    if ((currentQueueOrCreate.push(e), !this.queueUsedReported))
      ((this.queueUsedReported = !0), logFeatureOk("task_event_queue"));
    this.enqueueListener?.();
  }
  holdLevels() {
    this.levelHolds++;
    let e = !1,
      n = () => {
        if (e) return;
        if (((e = !0), this.levelHolds--, this.levelHolds > 0)) return;
        for (let [r, s] of this.heldLevels) (this.heldLevels.delete(r), this.enqueue(s, r));
      };
    return { release: n, [Symbol.dispose]: n };
  }
  hasQueued(e) {
    let currentQueueOrNull = this.currentQueueOrNull();
    return currentQueueOrNull !== null && currentQueueOrNull.some(e);
  }
  drain() {
    let currentQueueOrNull = this.currentQueueOrNull();
    if (!currentQueueOrNull || currentQueueOrNull.length === 0) return [];
    return this.stamp(currentQueueOrNull.splice(0), getSessionId());
  }
  hasQueuedForSession(e) {
    return (this.queuesByKey.get(e)?.length ?? 0) > 0;
  }
  drainForSession(e) {
    let n = this.queuesByKey.get(e);
    if (!n || n.length === 0) return [];
    return this.stamp(n.splice(0), e);
  }
  stamp(e, n) {
    let redactsPersistedLane = this.redactsPersistedLane();
    return e.map((s) => ({
      ...(redactsPersistedLane ? redactTaskEventForSdk(s) : s),
      uuid: s.type === "conversation_reset" ? s.uuid : randomUUID_5(),
      session_id: n,
    }));
  }
}
//@ chunk-aepeg2w5.js:353341-353616 placement
function redactTaskEventForSdk(e) {
  if (e.type !== "system") return e;
  if (e.subtype === "task_notification")
    return { ...e, output_file: "", ...(e.status === "failed" && { summary: Jpr(e) ?? "error" }) };
  if (e.subtype === "task_updated" && e.patch.error !== void 0)
    return { ...e, patch: { ...e.patch, error: Jpr(e) ?? "error" } };
  return e;
}
//@ chunk-aepeg2w5.js:353616-353641 placement
var t0 = new HostScoped(() => new TaskNotificationQueue());
//@ chunk-aepeg2w5.js:353641-353678 placement
function nr() {
  return t0.of(getRootSession().host);
}
//@ chunk-aepeg2w5.js:353678-353717 placement
function n0() {
  return nr().currentKey();
}
//@ chunk-aepeg2w5.js:353717-353728 placement
var Ywi = n0;
/**
 * 设置入队监听。
 */
//@ chunk-aepeg2w5.js:353728-353771 placement
function setTaskNotificationListener(e) {
  nr().setEnqueueListener(e);
}
/**
 * 入队一条任务通知。
 */
//@ chunk-aepeg2w5.js:353771-353802 placement
function enqueueTaskNotification(e) {
  nr().enqueue(e);
}
/**
 * 暂时保持诊断日志级别不变（诊断范围外时返回空操作句柄）。
 */
//@ chunk-aepeg2w5.js:353802-353910 placement
function holdDiagLevels() {
  if (isDiagLogging() && !isInDiagScope()) {
    let e = () => {};
    return { release: e, [Symbol.dispose]: e };
  }
  return nr().holdLevels();
}
/**
 * 是否有排队的任务通知。
 */
//@ chunk-aepeg2w5.js:353910-353951 placement
function hasQueuedTaskNotification(e) {
  return nr().hasQueued(e);
}
/**
 * 取出全部排队的任务通知。
 */
//@ chunk-aepeg2w5.js:353951-353986 placement
function drainTaskNotifications() {
  return nr().drain();
}
//@ chunk-aepeg2w5.js:353986-354033 placement
function oss(e) {
  return nr().drainForSession(e);
}
//@ chunk-aepeg2w5.js:354033-354084 placement
function Jwi(e) {
  return nr().hasQueuedForSession(e);
}
/**
 * 发出 task_notification 系统事件（状态、摘要、输出文件）。
 */
//@ chunk-aepeg2w5.js:354084-354620 placement
function emitTaskNotification(e, n, r) {
  if (!claimTerminalEmit(e)) return;
  let s = {
    type: "system",
    subtype: "task_notification",
    task_id: e,
    run_id: getRunId(e),
    tool_use_id: r?.toolUseId,
    status: n,
    ...(r?.reason !== void 0 && { reason: r.reason }),
    output_file: r?.outputFile ?? "",
    summary: r?.summary ?? "",
    usage: r?.usage,
    ...(r?.resourceLinks && { resource_links: [...r.resourceLinks] }),
    ...(r?.handback !== void 0 && { handback: r.handback }),
    ...(r?.handbackReport && { handback_report: r.handbackReport }),
    ...(r?.skipTranscript !== void 0 && { skip_transcript: r.skipTranscript }),
    ...(r?.ambient && { ambient: !0 }),
  };
  enqueueTaskNotification(Uxt(s, r?.failureKind));
}

export {
  getTaskRunState,
  emitTaskNotification,
  getRunId,
  Uxt,
  enqueueTaskNotification,
  nss,
  Qpr,
  claimTerminalEmit,
  drainTaskNotifications,
  setTaskNotificationListener,
  hasQueuedTaskNotification,
  holdDiagLevels,
  Jpr,
  rss,
  Ywi,
  CLI,
  oss,
  Jwi,
};
