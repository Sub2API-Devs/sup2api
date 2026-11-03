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
import { randomBytes, randomUUID } from "crypto";
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

//@ chunk-aepeg2w5.js:345356-345820 placement
/**
 * 任务错误状态表。
 */
var TASK_ERROR_STATUSES = {
  stalled: true,
  error: true,
  api_error: true,
  "api_error:authentication_failed": true,
  "api_error:oauth_org_not_allowed": true,
  "api_error:account_on_hold": true,
  "api_error:verification_required": true,
  "api_error:billing_error": true,
  "api_error:rate_limit": true,
  "api_error:overloaded": true,
  "api_error:invalid_request": true,
  "api_error:model_not_found": true,
  "api_error:server_error": true,
  "api_error:unknown": true,
  "api_error:max_output_tokens": true,
  "api_error:cloud_credential_error": true,
};
var weakMap_2 = new WeakMap();
//@ chunk-aepeg2w5.js:345820-345873 placement
/**
 * 给任务对象挂上失败类型。
 */
function withFailureKind(e, failureKind) {
  if (failureKind !== undefined) weakMap_2.set(e, failureKind);
  return e;
}
//@ chunk-aepeg2w5.js:345873-345971 placement
/**
 * 取任务挂着的失败类型。
 */
function failureKindOf(e) {
  let n = e === undefined ? undefined : weakMap_2.get(e);
  return n !== undefined && Object.hasOwn(TASK_ERROR_STATUSES, n) ? n : undefined;
}
//@ chunk-aepeg2w5.js:346009-346068 placement
var MAX_BASH_TASK_SNAPSHOTS = 200;
var MAX_BASH_TASK_GETS = 64;
var MAX_EVICTED_RUN_IDS = 64;
var LINKS_INHERITED_BEFORE = Date.now() - process.uptime() * 1000;
//@ chunk-aepeg2w5.js:346068-349666 placement
/**
 * 任务输出目录与链接记录。
 */
class TaskOutputLinks {
  outputDir = undefined;
  linkedOutputs = new Map();
  linksInheritedBefore = LINKS_INHERITED_BEFORE;
  inheritedLinkLines = new Map();
  inheritPredecessorLinks(e, n) {
    if (!Number.isFinite(n)) return;
    this.inheritedLinkLines.set(e, Math.max(LINKS_INHERITED_BEFORE, Math.min(Date.now(), n)));
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
  withdrawShellNotification = undefined;
  onSubagentResume = undefined;
  mainThreadContexts = new Map();
  spawnedByMainThread = new Set();
  parkedTeardowns = new Map();
  killAgentMonitors = undefined;
  autoReactHumanTurnObserver = undefined;
  frameLiveUserStopObserver = undefined;
  liveDocUserStopObserver = undefined;
  autoReactDeliberateStopObserver = undefined;
  artifactRoomStopObserver = undefined;
  artifactPresenceStopObserver = undefined;
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
      this.remoteSessionLogs.delete(e);
      this.retireRunId(e);
    });
  }
  retireRunId(e) {
    let n = this.runIds.get(e);
    if (n === undefined) return;
    this.runIds.delete(e);
    this.evictedRunIds.delete(e);
    this.evictedRunIds.set(e, n);
    if (this.evictedRunIds.size > MAX_EVICTED_RUN_IDS) {
      let r = this.evictedRunIds.keys().next().value;
      if (r !== undefined) this.evictedRunIds.delete(r);
    }
  }
  rememberBashTaskSnapshot(e, snapshot, agentId) {
    this.bashTaskSnapshots.delete(e);
    this.bashTaskSnapshots.set(e, {
      snapshot,
      agentId,
      fetched: false,
    });
    if (this.bashTaskSnapshots.size > MAX_BASH_TASK_SNAPSHOTS) {
      let s = this.bashTaskSnapshots.keys().next().value;
      if (s !== undefined) this.bashTaskSnapshots.delete(s);
    }
  }
  countBashTaskGet(e) {
    let n = (this.bashTaskGetCounts.get(e) ?? 0) + 1;
    this.bashTaskGetCounts.delete(e);
    this.bashTaskGetCounts.set(e, n);
    if (this.bashTaskGetCounts.size > MAX_BASH_TASK_SNAPSHOTS) {
      let r = this.bashTaskGetCounts.keys().next().value;
      if (r !== undefined) this.bashTaskGetCounts.delete(r);
    }
    return n;
  }
  countBashTaskGetInResponse(e, n, r) {
    let s = this.bashTaskGetsByResponse.get(e) ?? new Map();
    this.bashTaskGetsByResponse.delete(e);
    this.bashTaskGetsByResponse.set(e, s);
    if (this.bashTaskGetsByResponse.size > MAX_BASH_TASK_GETS) {
      let S = this.bashTaskGetsByResponse.keys().next().value;
      if (S !== undefined) this.bashTaskGetsByResponse.delete(S);
    }
    let h = s.get(n);
    let y = h?.statusKey === r ? h.count + 1 : 1;
    s.set(n, {
      count: y,
      statusKey: r,
    });
    return y;
  }
  markBashTaskSnapshotFetched(e) {
    let n = this.bashTaskSnapshots.get(e);
    if (n)
      this.bashTaskSnapshots.set(e, {
        ...n,
        fetched: true,
      });
  }
  reset() {
    this.outputDir = undefined;
    this.linkedOutputs.clear();
    this.outputPathBindings.clear();
    for (let diskOutput of this.diskOutputs.values()) diskOutput.cancel();
    this.diskOutputs.clear();
    this.terminalEmitClaims.clear();
    this.runIds.clear();
    this.evictedRunIds.clear();
    this.remoteSessionLogs.clear();
    this.bashTaskSnapshots.clear();
    this.bashTaskGetCounts.clear();
    this.lastPressureReapAt = 0;
    this.quietShellOwners.clear();
    this.bashTaskGetsByResponse.clear();
    this.reportedBashTaskDeliveries.clear();
    this.bashTaskDeliveryOutcomes.clear();
  }
  async drainDiskOutputs() {
    for (let diskOutput of this.diskOutputs.values()) diskOutput.cancel();
    while (this.pendingOutputOps.size > 0) await Promise.allSettled([...this.pendingOutputOps]);
    this.diskOutputs.clear();
  }
}
//@ chunk-aepeg2w5.js:349666-349691 placement
var taskOutputLinksByHost = new HostScoped(() => new TaskOutputLinks());
//@ chunk-aepeg2w5.js:349691-349728 placement
/**
 * 任务运行 id 存储（按 host）。
 */
function getTaskRunState() {
  return taskOutputLinksByHost.of(getRootSession().host);
}
//@ chunk-aepeg2w5.js:349728-349770 placement
var RUN_ID_SEQ_WIDTH = 9;
var RUN_ID_RE = /^([0-9a-z]{9})-[0-9a-f]{8}$/;
//@ chunk-aepeg2w5.js:349770-349846 placement
/**
 * 取任务的运行 id。
 */
function getRunId(e) {
  let { runIds, evictedRunIds } = getTaskRunState();
  return runIds.get(e) ?? evictedRunIds.get(e);
}
//@ chunk-aepeg2w5.js:349846-349905 placement
function previousRunSeq(e) {
  let runId = getRunId(e);
  return runId === undefined ? undefined : runSeqOf(runId);
}
//@ chunk-aepeg2w5.js:349905-349983 placement
/**
 * 从运行 id 解析出 36 进制的序号。
 */
function runSeqOf(runId) {
  let n = RUN_ID_RE.exec(runId)?.[1];
  return n === undefined ? undefined : parseInt(n, 36);
}
//@ chunk-aepeg2w5.js:349983-350028 placement
/**
 * 为任务登记运行 id。
 */
function setTaskRunId(e, runId = makeTimeOrderedId(e)) {
  getTaskRunState().runIds.set(e, runId);
}
//@ chunk-aepeg2w5.js:350028-350144 placement = generatePlaceholders (0.758)
function makeTimeOrderedId(e) {
  return `${Math.max(Date.now(), (previousRunSeq(e) ?? -1) + 1)
    .toString(36)
    .padStart(RUN_ID_SEQ_WIDTH, "0")}-${randomBytes(4).toString("hex")}`;
}
//@ chunk-aepeg2w5.js:350144-350244 placement
/**
 * 认领某任务的终态通知发送权（每个任务只能认领一次）。
 */
function claimTerminalEmit_2(e) {
  if (getTaskRunState().terminalEmitClaims.has(e)) return false;
  getTaskRunState().terminalEmitClaims.add(e);
  return true;
}
//@ chunk-aepeg2w5.js:350244-350301 placement
/**
 * 取消任务的终态通知认领。
 */
function claimTerminalEmit(id) {
  return getTaskRunState().terminalEmitClaims.delete(id);
}
//@ chunk-aepeg2w5.js:350301-350331 placement = getClientSurface (0.78)
var MAX_QUEUED_NOTIFICATIONS = 1000;
var CLIENT_SURFACE_ID = "cli";
var MAX_EVICTED_KEYS = 1000;
//@ chunk-aepeg2w5.js:350331-353341 placement
/**
 * 任务通知队列（按 key 分组、驱逐、级别持有）。
 */
class TaskNotificationQueue {
  queueKey = () => CLIENT_SURFACE_ID;
  queuesByKey = new Map();
  evictedKeys = new Set();
  enqueueListener = null;
  queueUsedReported = false;
  nonbookendEvictionReported = false;
  bookendEvictionReported = false;
  levelHolds = 0;
  heldLevels = new Map();
  redactsPersistedLane = () => false;
  setQueueKey(queueKey) {
    this.queueKey = queueKey;
  }
  currentKey() {
    return this.queueKey();
  }
  setEnqueueListener(enqueueListener) {
    this.enqueueListener = enqueueListener;
  }
  queueCount() {
    return this.queuesByKey.size;
  }
  reset() {
    this.queuesByKey.clear();
    this.evictedKeys.clear();
    this.queueKey = () => CLIENT_SURFACE_ID;
    this.enqueueListener = null;
    this.redactsPersistedLane = () => false;
    this.queueUsedReported = false;
    this.nonbookendEvictionReported = false;
    this.bookendEvictionReported = false;
    this.levelHolds = 0;
    this.heldLevels.clear();
  }
  currentQueueOrCreate(e) {
    if (this.evictedKeys.has(e)) return null;
    let n = this.queuesByKey.get(e);
    if (!n) {
      n = [];
      this.queuesByKey.set(e, n);
    }
    return n;
  }
  currentQueueOrNull() {
    return this.queuesByKey.get(this.queueKey()) ?? null;
  }
  evictKey(e) {
    this.queuesByKey.delete(e);
    this.evictedKeys.add(e);
    if (this.evictedKeys.size > MAX_EVICTED_KEYS) {
      let n = this.evictedKeys.values().next().value;
      if (n !== undefined) this.evictedKeys.delete(n);
    }
  }
  enqueue(e, n = this.queueKey()) {
    if (this.levelHolds > 0 && e.type === "system" && e.subtype === "background_tasks_changed") {
      this.heldLevels.set(n, e);
      return;
    }
    if (!getIsNonInteractiveSession() && !isReplBridgeActive()) return;
    if (e.type === "stream_event" && !getIsNonInteractiveSession() && this.enqueueListener === null) return;
    let r = this.currentQueueOrCreate(n);
    if (!r) return;
    if (r.length >= MAX_QUEUED_NOTIFICATIONS) {
      if (e.type === "stream_event") return;
      let index = r.findIndex(
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
        index = r.findIndex(
          (h) => h.type === "system" && h.subtype === "permission_check_status" && h.status === "done",
        );
      if (index === -1) {
        if (!this.bookendEvictionReported) {
          this.bookendEvictionReported = true;
          logFeatureSad("task_event_queue", "bookend_evicted");
        }
        let index = r.findIndex(
          (y) =>
            y.type !== "conversation_reset" &&
            !(
              y.type === "system" &&
              ((y.subtype === "status" && y.status === null) || y.subtype === "dev_intent")
            ),
        );
        if (index === -1) r.shift();
        else r.splice(index, 1);
      } else {
        if (!this.nonbookendEvictionReported) {
          this.nonbookendEvictionReported = true;
          logFeatureSad("task_event_queue", "nonbookend_evicted");
        }
        r.splice(index, 1);
      }
    }
    r.push(e);
    if (!this.queueUsedReported) {
      this.queueUsedReported = true;
      logFeatureOk("task_event_queue");
    }
    this.enqueueListener?.();
  }
  holdLevels() {
    this.levelHolds++;
    let e = false;
    let n = () => {
      if (e) return;
      e = true;
      this.levelHolds--;
      if (this.levelHolds > 0) return;
      for (let [r, s] of this.heldLevels) {
        this.heldLevels.delete(r);
        this.enqueue(s, r);
      }
    };
    return {
      release: n,
      [Symbol.dispose]: n,
    };
  }
  hasQueued(e) {
    let n = this.currentQueueOrNull();
    return n !== null && n.some(e);
  }
  drain() {
    let e = this.currentQueueOrNull();
    if (!e || e.length === 0) return [];
    return this.stamp(e.splice(0), getSessionId());
  }
  hasQueuedForSession(e) {
    return (this.queuesByKey.get(e)?.length ?? 0) > 0;
  }
  drainForSession(e) {
    let n = this.queuesByKey.get(e);
    if (!n || n.length === 0) return [];
    return this.stamp(n.splice(0), e);
  }
  stamp(e, sessionId) {
    let r = this.redactsPersistedLane();
    return e.map((s) => ({
      ...(r ? redactTaskEventForSdk(s) : s),
      uuid: s.type === "conversation_reset" ? s.uuid : randomUUID(),
      session_id: sessionId,
    }));
  }
}
//@ chunk-aepeg2w5.js:353341-353616 placement
function redactTaskEventForSdk(e) {
  if (e.type !== "system") return e;
  if (e.subtype === "task_notification")
    return {
      ...e,
      output_file: "",
      ...(e.status === "failed" && {
        summary: failureKindOf(e) ?? "error",
      }),
    };
  if (e.subtype === "task_updated" && e.patch.error !== undefined)
    return {
      ...e,
      patch: {
        ...e.patch,
        error: failureKindOf(e) ?? "error",
      },
    };
  return e;
}
//@ chunk-aepeg2w5.js:353616-353641 placement
var taskNotificationQueueByHost = new HostScoped(() => new TaskNotificationQueue());
//@ chunk-aepeg2w5.js:353641-353678 placement
function taskNotificationQueue() {
  return taskNotificationQueueByHost.of(getRootSession().host);
}
//@ chunk-aepeg2w5.js:353678-353717 placement
function currentNotificationKey() {
  return taskNotificationQueue().currentKey();
}
//@ chunk-aepeg2w5.js:353717-353728 placement
/**
 * 取当前通知 key 的别名导出。
 */
var currentNotificationKeyAlias = currentNotificationKey;
//@ chunk-aepeg2w5.js:353728-353771 placement
/**
 * 设置入队监听。
 */
function setTaskNotificationListener(e) {
  taskNotificationQueue().setEnqueueListener(e);
}
//@ chunk-aepeg2w5.js:353771-353802 placement
/**
 * 入队一条任务通知。
 */
function enqueueTaskNotification(e) {
  taskNotificationQueue().enqueue(e);
}
//@ chunk-aepeg2w5.js:353802-353910 placement
/**
 * 暂时保持诊断日志级别不变（诊断范围外时返回空操作句柄）。
 */
function holdDiagLevels() {
  if (isDiagLogging() && !isInDiagScope()) {
    let e = () => {};
    return {
      release: e,
      [Symbol.dispose]: e,
    };
  }
  return taskNotificationQueue().holdLevels();
}
//@ chunk-aepeg2w5.js:353910-353951 placement
/**
 * 是否有排队的任务通知。
 */
function hasQueuedTaskNotification(e) {
  return taskNotificationQueue().hasQueued(e);
}
//@ chunk-aepeg2w5.js:353951-353986 placement
/**
 * 取出全部排队的任务通知。
 */
function drainTaskNotifications() {
  return taskNotificationQueue().drain();
}
//@ chunk-aepeg2w5.js:353986-354033 placement
/**
 * 取出某会话排队中的通知。
 */
function drainNotificationsForSession(sessionId) {
  return taskNotificationQueue().drainForSession(sessionId);
}
//@ chunk-aepeg2w5.js:354033-354084 placement
/**
 * 某会话是否有排队通知。
 */
function hasQueuedNotificationsForSession(sessionId) {
  return taskNotificationQueue().hasQueuedForSession(sessionId);
}
//@ chunk-aepeg2w5.js:354084-354620 placement
/**
 * 发出 task_notification 系统事件（状态、摘要、输出文件）。
 */
function emitTaskNotification(e, status, r) {
  if (!claimTerminalEmit_2(e)) return;
  let s = {
    type: "system",
    subtype: "task_notification",
    task_id: e,
    run_id: getRunId(e),
    tool_use_id: r?.toolUseId,
    status,
    ...(r?.reason !== undefined && {
      reason: r.reason,
    }),
    output_file: r?.outputFile ?? "",
    summary: r?.summary ?? "",
    usage: r?.usage,
    ...(r?.resourceLinks && {
      resource_links: [...r.resourceLinks],
    }),
    ...(r?.handback !== undefined && {
      handback: r.handback,
    }),
    ...(r?.handbackReport && {
      handback_report: r.handbackReport,
    }),
    ...(r?.skipTranscript !== undefined && {
      skip_transcript: r.skipTranscript,
    }),
    ...(r?.ambient && {
      ambient: true,
    }),
  };
  enqueueTaskNotification(withFailureKind(s, r?.failureKind));
}
export {
  getTaskRunState,
  emitTaskNotification,
  getRunId,
  withFailureKind,
  enqueueTaskNotification,
  runSeqOf,
  setTaskRunId,
  claimTerminalEmit_2,
  drainTaskNotifications,
  setTaskNotificationListener,
  hasQueuedTaskNotification,
  holdDiagLevels,
  failureKindOf,
  claimTerminalEmit,
  currentNotificationKeyAlias,
  CLIENT_SURFACE_ID,
  drainNotificationsForSession,
  hasQueuedNotificationsForSession,
};
