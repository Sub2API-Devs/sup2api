/**
 * utils/task/taskNotifications.ts
 *
 * 2.1.316 新增：任务输出目录与链接记录；任务通知队列（按 key 分组、驱逐、级别持有）等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-exfmq47h.js (30)
 * attribution: placement 30
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-exfmq47h.js:355843-356307 placement
/**
 * 任务错误状态表。
 */
var TASK_ERROR_STATUSES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var weakMap_2;
deferInit("chunk-exfmq47h.js:355843", () => {
  TASK_ERROR_STATUSES = {
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
  weakMap_2 = new WeakMap();
});
//@ chunk-exfmq47h.js:356307-356360 placement
/**
 * 给任务对象挂上失败类型。
 */
function withFailureKind(notification, failureKind) {
  if (failureKind !== undefined) weakMap_2.set(notification, failureKind);
  return notification;
}
//@ chunk-exfmq47h.js:356360-356458 placement
/**
 * 取任务挂着的失败类型。
 */
function failureKindOf(notification) {
  let failureKind = notification === undefined ? undefined : weakMap_2.get(notification);
  return failureKind !== undefined && Object.hasOwn(TASK_ERROR_STATUSES, failureKind)
    ? failureKind
    : undefined;
}
//@ chunk-exfmq47h.js:356496-356555 placement
var MAX_BASH_TASK_SNAPSHOTS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MAX_BASH_TASK_GETS;
var MAX_EVICTED_RUN_IDS;
var LINKS_INHERITED_BEFORE;
deferInit("chunk-exfmq47h.js:356496", () => {
  MAX_BASH_TASK_SNAPSHOTS = 200;
  MAX_BASH_TASK_GETS = 64;
  MAX_EVICTED_RUN_IDS = 64;
  LINKS_INHERITED_BEFORE = Date.now() - process.uptime() * 1000;
});
//@ chunk-exfmq47h.js:356555-360249 placement
/**
 * 任务输出目录与链接记录。
 */
class TaskOutputLinks {
  outputDir = undefined;
  linkedOutputs = new Map();
  linksInheritedBefore = LINKS_INHERITED_BEFORE;
  inheritedLinkLines = new Map();
  inheritPredecessorLinks(taskId, inheritedAt) {
    if (!Number.isFinite(inheritedAt)) return;
    this.inheritedLinkLines.set(taskId, Math.max(LINKS_INHERITED_BEFORE, Math.min(Date.now(), inheritedAt)));
  }
  linksInheritedBeforeFor(taskId_2) {
    return Math.max(this.linksInheritedBefore, this.inheritedLinkLines.get(taskId_2) ?? 0);
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
  limitStops = new Map();
  afterHeavyStops = new Map();
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
    this.taskEvicted.subscribe((taskId_3) => {
      this.remoteSessionLogs.delete(taskId_3);
      this.retireRunId(taskId_3);
    });
  }
  retireRunId(taskId_4) {
    let runId = this.runIds.get(taskId_4);
    if (runId === undefined) return;
    this.runIds.delete(taskId_4);
    this.evictedRunIds.delete(taskId_4);
    this.evictedRunIds.set(taskId_4, runId);
    if (this.evictedRunIds.size > MAX_EVICTED_RUN_IDS) {
      let oldestKey = this.evictedRunIds.keys().next().value;
      if (oldestKey !== undefined) this.evictedRunIds.delete(oldestKey);
    }
  }
  rememberBashTaskSnapshot(taskId_5, snapshot, agentId) {
    this.bashTaskSnapshots.delete(taskId_5);
    this.bashTaskSnapshots.set(taskId_5, {
      snapshot,
      agentId,
      fetched: false,
    });
    if (this.bashTaskSnapshots.size > MAX_BASH_TASK_SNAPSHOTS) {
      let oldestKey_2 = this.bashTaskSnapshots.keys().next().value;
      if (oldestKey_2 !== undefined) this.bashTaskSnapshots.delete(oldestKey_2);
    }
  }
  countBashTaskGet(taskId_6) {
    let getCount = (this.bashTaskGetCounts.get(taskId_6) ?? 0) + 1;
    this.bashTaskGetCounts.delete(taskId_6);
    this.bashTaskGetCounts.set(taskId_6, getCount);
    if (this.bashTaskGetCounts.size > MAX_BASH_TASK_SNAPSHOTS) {
      let oldestKey_3 = this.bashTaskGetCounts.keys().next().value;
      if (oldestKey_3 !== undefined) this.bashTaskGetCounts.delete(oldestKey_3);
    }
    return getCount;
  }
  countBashTaskGetInResponse(responseId, toolUseId, statusKey) {
    let countsByStatus = this.bashTaskGetsByResponse.get(responseId) ?? new Map();
    this.bashTaskGetsByResponse.delete(responseId);
    this.bashTaskGetsByResponse.set(responseId, countsByStatus);
    if (this.bashTaskGetsByResponse.size > MAX_BASH_TASK_GETS) {
      let oldestKey_4 = this.bashTaskGetsByResponse.keys().next().value;
      if (oldestKey_4 !== undefined) this.bashTaskGetsByResponse.delete(oldestKey_4);
    }
    let previous = countsByStatus.get(toolUseId);
    let count = previous?.statusKey === statusKey ? previous.count + 1 : 1;
    countsByStatus.set(toolUseId, {
      count,
      statusKey,
    });
    return count;
  }
  markBashTaskSnapshotFetched(taskId_7) {
    let snapshot = this.bashTaskSnapshots.get(taskId_7);
    if (snapshot)
      this.bashTaskSnapshots.set(taskId_7, {
        ...snapshot,
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
    this.limitStops.clear();
    this.afterHeavyStops.clear();
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
//@ chunk-exfmq47h.js:360249-360274 placement
var taskOutputLinksByHost; // deferred: uses TaskOutputLinks of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:360249", () => {
  taskOutputLinksByHost = new HostScoped(() => new TaskOutputLinks());
});
//@ chunk-exfmq47h.js:360274-360311 placement
/**
 * 任务运行 id 存储（按 host）。
 */
function getTaskRunState() {
  return taskOutputLinksByHost.of(getRootSession().host);
}
//@ chunk-exfmq47h.js:360311-360353 placement
var RUN_ID_SEQ_WIDTH = 9;
var RUN_ID_RE = /^([0-9a-z]{9})-[0-9a-f]{8}$/;
//@ chunk-exfmq47h.js:360353-360429 placement
/**
 * 取任务的运行 id。
 */
function getRunId(taskId) {
  let { runIds, evictedRunIds } = getTaskRunState();
  return runIds.get(taskId) ?? evictedRunIds.get(taskId);
}
//@ chunk-exfmq47h.js:360429-360488 placement
function previousRunSeq(taskId) {
  let runId = getRunId(taskId);
  return runId === undefined ? undefined : runSeqOf(runId);
}
//@ chunk-exfmq47h.js:360488-360566 placement
/**
 * 从运行 id 解析出 36 进制的序号。
 */
function runSeqOf(runId) {
  let seq = RUN_ID_RE.exec(runId)?.[1];
  return seq === undefined ? undefined : parseInt(seq, 36);
}
//@ chunk-exfmq47h.js:360566-360611 placement
/**
 * 为任务登记运行 id。
 */
function setTaskRunId(taskId, runId = makeTimeOrderedId(taskId)) {
  getTaskRunState().runIds.set(taskId, runId);
}
//@ chunk-exfmq47h.js:360611-360727 placement (2.1.88 match: generatePlaceholders, 0.758)
function makeTimeOrderedId(taskId) {
  return `${Math.max(Date.now(), (previousRunSeq(taskId) ?? -1) + 1)
    .toString(36)
    .padStart(RUN_ID_SEQ_WIDTH, "0")}-${randomBytes(4).toString("hex")}`;
}
//@ chunk-exfmq47h.js:360727-360827 placement
/**
 * 认领某任务的终态通知发送权（每个任务只能认领一次）。
 */
function claimTerminalEmit_2(taskId) {
  if (getTaskRunState().terminalEmitClaims.has(taskId)) return false;
  getTaskRunState().terminalEmitClaims.add(taskId);
  return true;
}
//@ chunk-exfmq47h.js:360827-360884 placement
/**
 * 取消任务的终态通知认领。
 */
function claimTerminalEmit(id) {
  return getTaskRunState().terminalEmitClaims.delete(id);
}
//@ chunk-exfmq47h.js:360884-360914 placement (2.1.88 match: getClientSurface, 0.779)
var MAX_QUEUED_NOTIFICATIONS = 1000;
var CLIENT_SURFACE_ID = "cli";
var MAX_EVICTED_KEYS = 1000;
//@ chunk-exfmq47h.js:360914-363924 placement
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
  currentQueueOrCreate(queueKey) {
    if (this.evictedKeys.has(queueKey)) return null;
    let queue = this.queuesByKey.get(queueKey);
    if (!queue) {
      queue = [];
      this.queuesByKey.set(queueKey, queue);
    }
    return queue;
  }
  currentQueueOrNull() {
    return this.queuesByKey.get(this.queueKey()) ?? null;
  }
  evictKey(keyToEvict) {
    this.queuesByKey.delete(keyToEvict);
    this.evictedKeys.add(keyToEvict);
    if (this.evictedKeys.size > MAX_EVICTED_KEYS) {
      let oldestKey = this.evictedKeys.values().next().value;
      if (oldestKey !== undefined) this.evictedKeys.delete(oldestKey);
    }
  }
  enqueue(event, queueKey_2 = this.queueKey()) {
    if (this.levelHolds > 0 && event.type === "system" && event.subtype === "background_tasks_changed") {
      this.heldLevels.set(queueKey_2, event);
      return;
    }
    if (!getIsNonInteractiveSession() && !isReplBridgeActive()) return;
    if (event.type === "stream_event" && !getIsNonInteractiveSession() && this.enqueueListener === null)
      return;
    let queue_2 = this.currentQueueOrCreate(queueKey_2);
    if (!queue_2) return;
    if (queue_2.length >= MAX_QUEUED_NOTIFICATIONS) {
      if (event.type === "stream_event") return;
      let index = queue_2.findIndex(
        (queued) =>
          queued.type !== "conversation_reset" &&
          (queued.type !== "system" ||
            (queued.subtype !== "task_started" &&
              queued.subtype !== "task_notification" &&
              queued.subtype !== "dev_intent" &&
              !(queued.subtype === "status" && queued.status === null) &&
              !(queued.subtype === "permission_check_status" && queued.status === "done"))),
      );
      if (index === -1)
        index = queue_2.findIndex(
          (queued_2) =>
            queued_2.type === "system" &&
            queued_2.subtype === "permission_check_status" &&
            queued_2.status === "done",
        );
      if (index === -1) {
        if (!this.bookendEvictionReported) {
          this.bookendEvictionReported = true;
          logFeatureSad("task_event_queue", "bookend_evicted");
        }
        let index = queue_2.findIndex(
          (queued_3) =>
            queued_3.type !== "conversation_reset" &&
            !(
              queued_3.type === "system" &&
              ((queued_3.subtype === "status" && queued_3.status === null) ||
                queued_3.subtype === "dev_intent")
            ),
        );
        if (index === -1) queue_2.shift();
        else queue_2.splice(index, 1);
      } else {
        if (!this.nonbookendEvictionReported) {
          this.nonbookendEvictionReported = true;
          logFeatureSad("task_event_queue", "nonbookend_evicted");
        }
        queue_2.splice(index, 1);
      }
    }
    queue_2.push(event);
    if (!this.queueUsedReported) {
      this.queueUsedReported = true;
      logFeatureOk("task_event_queue");
    }
    this.enqueueListener?.();
  }
  holdLevels() {
    this.levelHolds++;
    let released = false;
    let release = () => {
      if (released) return;
      released = true;
      this.levelHolds--;
      if (this.levelHolds > 0) return;
      for (let [key, heldEvent] of this.heldLevels) {
        this.heldLevels.delete(key);
        this.enqueue(heldEvent, key);
      }
    };
    return {
      release,
      [Symbol.dispose]: release,
    };
  }
  hasQueued(predicate) {
    let currentQueue = this.currentQueueOrNull();
    return currentQueue !== null && currentQueue.some(predicate);
  }
  drain() {
    let queue_3 = this.currentQueueOrNull();
    if (!queue_3 || queue_3.length === 0) return [];
    return this.stamp(queue_3.splice(0), getSessionId());
  }
  hasQueuedForSession(key_2) {
    return (this.queuesByKey.get(key_2)?.length ?? 0) > 0;
  }
  drainForSession(sessionId) {
    let queue_4 = this.queuesByKey.get(sessionId);
    if (!queue_4 || queue_4.length === 0) return [];
    return this.stamp(queue_4.splice(0), sessionId);
  }
  stamp(events, sessionId) {
    let redacts = this.redactsPersistedLane();
    return events.map((event_2) => ({
      ...(redacts ? redactTaskEventForSdk(event_2) : event_2),
      uuid: event_2.type === "conversation_reset" ? event_2.uuid : randomUUID(),
      session_id: sessionId,
    }));
  }
}
//@ chunk-exfmq47h.js:363924-364199 placement
function redactTaskEventForSdk(event) {
  if (event.type !== "system") return event;
  if (event.subtype === "task_notification")
    return {
      ...event,
      output_file: "",
      ...(event.status === "failed" && {
        summary: failureKindOf(event) ?? "error",
      }),
    };
  if (event.subtype === "task_updated" && event.patch.error !== undefined)
    return {
      ...event,
      patch: {
        ...event.patch,
        error: failureKindOf(event) ?? "error",
      },
    };
  return event;
}
//@ chunk-exfmq47h.js:364199-364224 placement
var taskNotificationQueueByHost; // deferred: uses TaskNotificationQueue of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:364199", () => {
  taskNotificationQueueByHost = new HostScoped(() => new TaskNotificationQueue());
});
//@ chunk-exfmq47h.js:364224-364261 placement
function taskNotificationQueue() {
  return taskNotificationQueueByHost.of(getRootSession().host);
}
//@ chunk-exfmq47h.js:364261-364300 placement
function currentNotificationKey() {
  return taskNotificationQueue().currentKey();
}
//@ chunk-exfmq47h.js:364300-364311 placement
/**
 * 取当前通知 key 的别名导出。
 */
var currentNotificationKeyAlias = currentNotificationKey;
//@ chunk-exfmq47h.js:364311-364354 placement
/**
 * 设置入队监听。
 */
function setTaskNotificationListener(listener) {
  taskNotificationQueue().setEnqueueListener(listener);
}
//@ chunk-exfmq47h.js:364354-364385 placement
/**
 * 入队一条任务通知。
 */
function enqueueTaskNotification(notification) {
  taskNotificationQueue().enqueue(notification);
}
//@ chunk-exfmq47h.js:364385-364492 placement
/**
 * 暂时保持诊断日志级别不变（诊断范围外时返回空操作句柄）。
 */
function holdDiagLevels() {
  if (isDiagLogging() && !isInDiagScope()) {
    let noop = () => {};
    return {
      release: noop,
      [Symbol.dispose]: noop,
    };
  }
  return taskNotificationQueue().holdLevels();
}
//@ chunk-exfmq47h.js:364492-364533 placement
/**
 * 是否有排队的任务通知。
 */
function hasQueuedTaskNotification(predicate) {
  return taskNotificationQueue().hasQueued(predicate);
}
//@ chunk-exfmq47h.js:364533-364568 placement
/**
 * 取出全部排队的任务通知。
 */
function drainTaskNotifications() {
  return taskNotificationQueue().drain();
}
//@ chunk-exfmq47h.js:364568-364615 placement
/**
 * 取出某会话排队中的通知。
 */
function drainNotificationsForSession(sessionId) {
  return taskNotificationQueue().drainForSession(sessionId);
}
//@ chunk-exfmq47h.js:364615-364666 placement
/**
 * 某会话是否有排队通知。
 */
function hasQueuedNotificationsForSession(sessionId) {
  return taskNotificationQueue().hasQueuedForSession(sessionId);
}
//@ chunk-exfmq47h.js:364666-365202 placement
/**
 * 发出 task_notification 系统事件（状态、摘要、输出文件）。
 */
function emitTaskNotification(taskId, status, opts) {
  if (!claimTerminalEmit_2(taskId)) return;
  let notification = {
    type: "system",
    subtype: "task_notification",
    task_id: taskId,
    run_id: getRunId(taskId),
    tool_use_id: opts?.toolUseId,
    status,
    ...(opts?.reason !== undefined && {
      reason: opts.reason,
    }),
    output_file: opts?.outputFile ?? "",
    summary: opts?.summary ?? "",
    usage: opts?.usage,
    ...(opts?.resourceLinks && {
      resource_links: [...opts.resourceLinks],
    }),
    ...(opts?.handback !== undefined && {
      handback: opts.handback,
    }),
    ...(opts?.handbackReport && {
      handback_report: opts.handbackReport,
    }),
    ...(opts?.skipTranscript !== undefined && {
      skip_transcript: opts.skipTranscript,
    }),
    ...(opts?.ambient && {
      ambient: true,
    }),
  };
  enqueueTaskNotification(withFailureKind(notification, opts?.failureKind));
}
export {
  getTaskRunState,
  claimTerminalEmit_2,
  holdDiagLevels,
  failureKindOf,
  getRunId,
  enqueueTaskNotification,
  withFailureKind,
  emitTaskNotification,
  claimTerminalEmit,
  setTaskRunId,
  drainTaskNotifications,
  setTaskNotificationListener,
  hasQueuedTaskNotification,
  runSeqOf,
  currentNotificationKeyAlias,
  CLIENT_SURFACE_ID,
  drainNotificationsForSession,
  hasQueuedNotificationsForSession,
};
