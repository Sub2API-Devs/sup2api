/**
 * services/mcp/workerWakes.ts
 *
 * 2.1.316 新增：MCP worker 唤醒调度：按事件唤醒后台连接的计时与去重。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1w450km7.js (20)
 * attribution: placement 20
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  WORKER_WAKE_ID_RE,
  taskMetadataSchema,
  getMcpTaskProjectDir,
  writeMcpTaskMetadata,
} from "./mcpTasks.js";
import { parseToolOutputSchema } from "./schemaParse.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { apiClient } from "../routines/routinesApi.js";
import { logFeatureOk, logFeatureBad, logFeatureSad } from "../analytics/featureTelemetry.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { logForDebugging } from "../../utils/debug.js";
import { classifyAxiosError } from "../../utils/errors.js";
import { hasRemoteSdkUrl } from "../ccrAgentProxy/agentProxy.js";
import { commandPolicyGateAllows, policyDenyKind } from "../policyLimits/policyVerdicts.js";
import { logError } from "../../utils/log.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import { isTaskWorkerWakeEnabled } from "./mcpTaskWorker.js";
import { getSessionId } from "../../bootstrap/state.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";

//@ chunk-1w450km7.js:3626-3993 placement
/**
 * worker 唤醒接口的常量：请求超时、路径、载荷上限、策略键、请求选项与应答/错误 schema。
 */
var WAKE_REQUEST_TIMEOUT_MS = 1e4;
var WORKER_WAKES_PATH = "/worker/wakes";
var MAX_WAKE_PAYLOAD_BYTES = 1984;
var ALLOW_MCP_TASK_WORKER_WAKE = "allow_mcp_task_worker_wake";
var WAKE_REQUEST_OPTIONS = {
  auth: "session-jwt",
  host: "ccr-session",
  headers: {
    "anthropic-version": "2023-06-01",
  },
  timeout: WAKE_REQUEST_TIMEOUT_MS,
  validateStatus: () => true,
};
var wakeAnswerSchema = DoctorLazy(() =>
  objectSchema({
    wake_id: stringSchema().regex(WORKER_WAKE_ID_RE),
    fire_at: parseToolOutputSchema({
      offset: true,
    }),
    expires_at: parseToolOutputSchema({
      offset: true,
    }),
  }),
);
var wakeErrorSchema = DoctorLazy(() =>
  objectSchema({
    error: objectSchema({
      type: stringSchema().optional(),
      reason: stringSchema().optional(),
      resource_type: stringSchema().optional(),
    }),
  }),
);
//@ chunk-1w450km7.js:3993-4565 placement
/**
 * 向 CCR 会话申请一次 worker 唤醒（POST /worker/wakes，载荷为任务恢复记录）：被策略或开关挡住时直接返回，载荷不可用或过大时不发，结果解析为 scheduled/refused/failed。
 */
async function scheduleWorkerWake({ task, delaySeconds, onTimer = false }) {
  let blocked = wakePreconditionFailure("schedule", onTimer) ?? wakePolicyBlock("schedule", onTimer);
  if (blocked !== undefined) return blocked;
  let payload = {
    taskId: task.taskId,
    serverName: task.serverName,
    toolName: task.toolName,
    mcpTaskId: task.mcpTaskId,
    pollIntervalMs: task.pollIntervalMs,
    spawnedAt: task.spawnedAt,
    toolUseId: task.toolUseId,
    protocol: "sep2663",
    ttlExpiresAt: task.ttlExpiresAt,
    transportFingerprint: task.transportFingerprint,
  };
  if (
    parseTaskWorkerWake(payload) === undefined ||
    Buffer.byteLength(jsonStringify(payload)) > MAX_WAKE_PAYLOAD_BYTES
  )
    return wakeFailure("schedule", "not_sent", "unusable_payload", onTimer);
  let answer = await sendWakeRequest(
    "schedule",
    () =>
      apiClient.post(
        WORKER_WAKES_PATH,
        {
          delay_seconds: ceilAtLeastOne(delaySeconds),
          payload,
        },
        WAKE_REQUEST_OPTIONS,
      ),
    onTimer,
  );
  return readWakeAnswer("schedule", answer, onTimer);
}
//@ chunk-1w450km7.js:4565-4846 placement
async function retimeWorkerWake({ workerWakeId, delaySeconds, onTimer = false }) {
  let refusal = wakePreconditionFailure("retime", onTimer) ?? wakePolicyBlock("retime", onTimer);
  if (refusal !== undefined) return refusal;
  if (!WORKER_WAKE_ID_RE.test(workerWakeId))
    return wakeFailure("retime", "rejected", "malformed_id", onTimer);
  let response = await sendWakeRequest(
    "retime",
    () =>
      apiClient.post(
        WORKER_WAKES_PATH,
        {
          wake_id: workerWakeId,
          delay_seconds: ceilAtLeastOne(delaySeconds),
        },
        WAKE_REQUEST_OPTIONS,
      ),
    onTimer,
  );
  return readWakeAnswer("retime", response, onTimer);
}
//@ chunk-1w450km7.js:4846-5265 placement
/**
 * 取消一个 worker 唤醒（DELETE /worker/wakes/:id），返回 cancelled 或失败。
 */
async function cancelWorkerWake({ workerWakeId, onTimer = false }) {
  if (!WORKER_WAKE_ID_RE.test(workerWakeId))
    return wakeFailure("cancel", "rejected", "malformed_id", onTimer);
  let response = await sendWakeRequest(
    "cancel",
    () => apiClient.delete(`${WORKER_WAKES_PATH}/${workerWakeId}`, undefined, WAKE_REQUEST_OPTIONS),
    onTimer,
  );
  if (response.kind === "failed") return response;
  if (!isHttpSuccess(response.status)) return wakeHttpFailure("cancel", response.status, onTimer);
  if (typeof response.data !== "object" || response.data === null)
    return wakeFailure("cancel", "rejected", "malformed_answer", onTimer);
  if (!onTimer)
    logFeatureOk("mcp_task_worker_wake", {
      call: fromEnum("cancel"),
    });
  return {
    kind: "cancelled",
  };
}
//@ chunk-1w450km7.js:5265-5352 placement
/**
 * 解析任务 worker 的唤醒记录（协议不符返回 undefined）。
 */
function parseTaskWorkerWake(payload) {
  let parseResult = taskMetadataSchema(payload);
  return parseResult.success && parseResult.data.protocol === "sep2663" ? parseResult.data : undefined;
}
//@ chunk-1w450km7.js:5352-5877 placement
/**
 * 解析唤醒请求的应答：成功返回唤醒 id 与触发/过期时间，被拒时返回原因，其他状态视为失败。
 */
function readWakeAnswer(call, response, onTimer) {
  if (response.kind === "failed") return response;
  if (isHttpSuccess(response.status)) {
    let parsed = wakeAnswerSchema().safeParse(response.data);
    if (!parsed.success) return wakeFailure(call, "rejected", "malformed_answer", onTimer);
    if (!onTimer)
      logFeatureOk("mcp_task_worker_wake", {
        call: fromEnum(call),
      });
    return {
      kind: "scheduled",
      workerWakeId: parsed.data.wake_id,
      fireAtMs: Date.parse(parsed.data.fire_at),
      expiresAtMs: Date.parse(parsed.data.expires_at),
    };
  }
  let refusal = wakeRefusalReason(call, response.status, response.data);
  if (refusal === undefined) return wakeHttpFailure(call, response.status, onTimer);
  if (refusal === "wake_off") return wakeFailure(call, "wake_off", undefined, onTimer);
  logWakeSad(onTimer, refusal, call);
  logForDebugging(`mcpTaskWorkerWake ${call}: refused (${refusal})`);
  return {
    kind: "refused",
    reason: refusal,
  };
}
//@ chunk-1w450km7.js:5877-6382 placement
/**
 * 从 400/404 错误应答中识别唤醒被拒的原因（不支持的主机或会话、延迟越界、已过期、已取消、关闭、未找到）。
 */
function wakeRefusalReason(call, status, body) {
  let parseResult = wakeErrorSchema().safeParse(body);
  let error = parseResult.success ? parseResult.data.error : undefined;
  switch (status === 400 ? error?.reason : undefined) {
    case "wake_unsupported_host":
      return "unsupported_host";
    case "wake_unsupported_session":
      return "unsupported_session";
    case "wake_delay_out_of_range":
      return "delay_out_of_range";
    case "wake_expired":
      return "expired";
    case "wake_cancelled":
      return "cancelled";
    case "wake_off":
      return "wake_off";
    default:
      break;
  }
  return call === "retime" &&
    status === 404 &&
    error?.type === "not_found_error" &&
    error.resource_type === "worker_wake"
    ? "not_found"
    : undefined;
}
//@ chunk-1w450km7.js:6382-6822 placement
/**
 * 发送唤醒请求并把异常归类为未授权、超时、网络或拒绝，未发出时返回 not_sent。
 */
async function sendWakeRequest(call, send, onTimer) {
  let refusal = wakePreconditionFailure(call, onTimer);
  if (refusal !== undefined) return refusal;
  let response;
  try {
    response = await send();
  } catch (error) {
    let { kind } = classifyAxiosError(error);
    switch (kind) {
      case "auth":
        return wakeFailure(call, "unauthorized", undefined, onTimer);
      case "timeout":
        return wakeFailure(call, "timeout", undefined, onTimer);
      case "network":
        return wakeFailure(call, "network", undefined, onTimer);
      case "http":
        return wakeFailure(call, "network", "other", onTimer);
      case "other":
        return wakeFailure(call, "rejected", "threw", onTimer);
    }
  }
  if (!response.ok) return wakeFailure(call, "not_sent", response.reason, onTimer);
  return {
    kind: "answered",
    status: response.status,
    data: response.data,
  };
}
//@ chunk-1w450km7.js:6822-6857 placement
/**
 * 判断 HTTP 状态码是否成功（2xx）。
 */
function isHttpSuccess(status) {
  return status >= 200 && status < 300;
}
//@ chunk-1w450km7.js:6857-7155 placement
function wakeHttpFailure(call, status, onTimer) {
  if (status === 404 || status === 405 || status === 501)
    return wakeFailure(call, "not_deployed", `http_${status}`, onTimer);
  if (status === 401 || status === 403) return wakeFailure(call, "unauthorized", `http_${status}`, onTimer);
  if (status === 429) return wakeFailure(call, "rate_limited", undefined, onTimer);
  if (status === 409) return wakeFailure(call, "conflict", undefined, onTimer);
  return wakeFailure(call, status >= 500 ? "server_error" : "rejected", `http_${status}`, onTimer);
}
//@ chunk-1w450km7.js:7155-7463 placement
/**
 * 生成唤醒失败结果并记录特性状态（可重试的失败按定时器场景区别记录）。
 */
function wakeFailure(call, reason, detail, onTimer) {
  let reasonText = detail === undefined ? reason : `${reason}_${detail}`;
  let retryable = isRetryableWakeFailure(reason);
  if (retryable || reason === "not_sent" || reason === "not_deployed") {
    if (!(retryable && onTimer)) logWakeSad(onTimer, reasonText, call);
  } else if (onTimer)
    logFeatureBad("mcp_task_worker_wake_timer", reasonText, {
      call: fromEnum(call),
    });
  else
    logFeatureBad("mcp_task_worker_wake", reasonText, {
      call: fromEnum(call),
    });
  logForDebugging(`mcpTaskWorkerWake ${call}: failed (${reasonText})`);
  return {
    kind: "failed",
    reason,
    retryable,
  };
}
//@ chunk-1w450km7.js:7463-7691 placement
function isRetryableWakeFailure(reason) {
  switch (reason) {
    case "rate_limited":
    case "conflict":
    case "wake_off":
    case "policy_pending":
    case "server_error":
    case "timeout":
    case "network":
      return true;
    case "not_sent":
    case "not_deployed":
    case "unauthorized":
    case "rejected":
      return false;
  }
}
//@ chunk-1w450km7.js:7691-7737 placement
/**
 * 向上取整且至少为 1。
 */
function ceilAtLeastOne(delaySeconds) {
  return Math.max(1, Math.ceil(delaySeconds));
}
//@ chunk-1w450km7.js:7737-7803 placement
/**
 * 缺会话地址时的唤醒失败。
 */
function wakePreconditionFailure(call, onTimer) {
  return hasRemoteSdkUrl() ? undefined : wakeFailure(call, "not_sent", "no_session", onTimer);
}
//@ chunk-1w450km7.js:7803-8160 placement
/**
 * 检查组织策略是否允许 MCP 任务 worker 唤醒，被拒时返回 refused，策略未决时返回失败。
 */
function wakePolicyBlock(call, onTimer) {
  let denyKind;
  try {
    if (commandPolicyGateAllows(ALLOW_MCP_TASK_WORKER_WAKE)) return;
    denyKind = policyDenyKind(ALLOW_MCP_TASK_WORKER_WAKE);
  } catch (error) {
    logError(error);
    return wakeFailure(call, "policy_pending", "threw", onTimer);
  }
  if (denyKind === "org_denied" || denyKind === "latched" || denyKind === "unregistered") {
    logWakeSad(onTimer, `policy_denied_${denyKind}`, call);
    logForDebugging(`mcpTaskWorkerWake ${call}: withheld by the organization's policy (${denyKind})`);
    return {
      kind: "refused",
      reason: "policy_denied",
    };
  }
  return wakeFailure(call, "policy_pending", denyKind ?? "no_deny_kind", onTimer);
}
//@ chunk-1w450km7.js:8160-8274 placement
function logWakeSad(onTimer, reason, call) {
  if (onTimer)
    logFeatureSad("mcp_task_worker_wake_timer", reason, {
      call: fromEnum(call),
    });
  else
    logFeatureSad("mcp_task_worker_wake", reason, {
      call: fromEnum(call),
    });
}
//@ chunk-1w450km7.js:8274-8311 placement
/**
 * 最多重试轮数（h / S）。
 */
var DEFAULT_WAKE_HORIZON_MS = 900000;
var TICK_INTERVAL_MS = DEFAULT_WAKE_HORIZON_MS / 3;
var TICK_IDLE_MS = 60000;
var MAX_SCHEDULE_RETRIES = 3;
var MAX_RETRY_ROUNDS = DEFAULT_WAKE_HORIZON_MS / TICK_INTERVAL_MS;
//@ chunk-1w450km7.js:8311-8373 placement
/**
 * 判断唤醒是否仍在推进（moving 且状态为 driving）。
 */
function isMovingWake(task) {
  return task.wake?.moving === true && task.state === "driving";
}
//@ chunk-1w450km7.js:8373-12905 placement
/**
 * 后台 MCP 任务的 worker 唤醒维护器：任务转入后台时申请唤醒，在任务仍被驱动时周期性推迟唤醒时间，任务结束或暂停时取消或保留唤醒，并把唤醒 id 写入任务恢复记录。
 */
class WorkerWakeKeeper {
  #e = new Map();
  #o = new Set();
  #a = false;
  #t;
  #r;
  hasConcluded(taskId) {
    return this.#o.has(taskId);
  }
  taskBackgrounded(input) {
    try {
      this.#c(input);
    } catch (error) {
      logError(error);
    }
  }
  #c({ taskRegistry, record, storageV5 }) {
    if (this.#a || this.#e.has(record.taskId) || !hasRemoteSdkUrl()) return;
    if (isEssentialTrafficOnly()) {
      this.#a = true;
      return;
    }
    let task = taskRegistry.get(record.taskId);
    if (task?.type !== "mcp_task" || task.notified || task.status !== "running" || task.holdCapped === true)
      return;
    let entry = {
      record,
      taskRegistry,
      storageV5,
      wake: undefined,
      busy: false,
      scheduleRetriesLeft: 0,
      retimeSoon: false,
      state: "driving",
    };
    this.#e.set(record.taskId, entry);
    taskRegistry.update(record.taskId, (task) => ({
      ...task,
      onWorkerWakeOutcome: (outcome) => this.taskLeftDrive(record.taskId, outcome),
    }));
    this.#i(entry, false);
  }
  taskLeftDrive(taskId, outcome) {
    try {
      this.#u(taskId, outcome);
    } catch (error) {
      logError(error);
    }
  }
  #u(taskId, outcome) {
    if (outcome.kind !== "parked" && outcome.kind !== "capped") this.#o.add(taskId);
    let entry = this.#e.get(taskId);
    if (entry === undefined || (entry.state !== "driving" && entry.state !== "left_to_fire")) return;
    switch (outcome.kind) {
      case "told":
      case "stopped":
      case "capped":
        entry.state = "cancelling";
        break;
      case "parked":
        entry.state = outcome.code === "ttl_expired" ? "cancelling" : "left_to_fire";
        break;
    }
    entry.scheduleRetriesLeft = 0;
    if (!isMovingWake(entry)) entry.retimeSoon = false;
    if (!entry.busy) this.#s(entry);
  }
  async tick() {
    let pending = [];
    for (let entry of this.#e.values()) {
      if (entry.busy) continue;
      if (entry.state === "cancelling") pending.push(this.#s(entry, true));
      else if (!isTaskWorkerWakeEnabled()) continue;
      else if (entry.wake !== undefined && isMovingWake(entry))
        pending.push(this.#d(entry, entry.wake, true));
      else if (entry.wake === undefined && entry.scheduleRetriesLeft > 0) {
        entry.scheduleRetriesLeft -= 1;
        pending.push(this.#i(entry, true));
      }
    }
    await Promise.all(pending);
  }
  async #i(entry, onTimer) {
    await this.#n(entry, async () => {
      let isReset = !onTimer;
      let result = await scheduleWorkerWake({
        task: entry.record,
        delaySeconds: DEFAULT_WAKE_HORIZON_MS / 1000,
        onTimer,
      });
      switch (result.kind) {
        case "scheduled":
          entry.wake = {
            id: result.workerWakeId,
            fireAtMs: result.fireAtMs,
            expiresAtMs: result.expiresAtMs,
            moving: true,
            notRetryableRounds: 0,
          };
          entry.scheduleRetriesLeft = 0;
          this.#l(entry, result.workerWakeId);
          break;
        case "refused":
          this.#a ||=
            result.reason === "unsupported_host" ||
            result.reason === "unsupported_session" ||
            result.reason === "delay_out_of_range";
          entry.scheduleRetriesLeft = 0;
          break;
        case "failed":
          if (entry.state !== "driving") entry.scheduleRetriesLeft = 0;
          else if (result.reason === "policy_pending") entry.scheduleRetriesLeft = 1;
          else if (result.reason !== "rate_limited") entry.scheduleRetriesLeft = 0;
          else if (isReset) entry.scheduleRetriesLeft = MAX_SCHEDULE_RETRIES;
          break;
      }
    });
    await this.#s(entry);
  }
  async #d(entry, wake, onTimer) {
    await this.#n(entry, async () => {
      let expiredResult = {
        kind: "refused",
        reason: "expired",
      };
      let result =
        Date.now() + DEFAULT_WAKE_HORIZON_MS > wake.expiresAtMs
          ? expiredResult
          : await retimeWorkerWake({
              workerWakeId: wake.id,
              delaySeconds: DEFAULT_WAKE_HORIZON_MS / 1000,
              onTimer: true,
            });
      entry.retimeSoon = false;
      if (entry.wake !== wake || !wake.moving) return;
      switch (result.kind) {
        case "scheduled":
          wake.fireAtMs = result.fireAtMs;
          wake.expiresAtMs = result.expiresAtMs;
          wake.notRetryableRounds = 0;
          break;
        case "refused":
          if (result.reason === "expired") {
            wake.moving = false;
            if (entry.state === "driving") entry.state = "cancelling";
          } else if (result.reason === "policy_denied") {
            wake.moving = false;
            entry.state = "cancelling";
          } else if (result.reason === "cancelled" || result.reason === "not_found") entry.wake = undefined;
          else {
            wake.moving = false;
            if (entry.state === "driving") entry.state = "left_to_fire";
          }
          break;
        case "failed":
          if (result.retryable) {
            entry.retimeSoon = onTimer;
            break;
          }
          if (onTimer && result.reason !== "not_sent") wake.notRetryableRounds += 1;
          if (result.reason === "not_sent" || wake.notRetryableRounds >= MAX_RETRY_ROUNDS) {
            wake.moving = false;
            if (entry.state === "driving") entry.state = "left_to_fire";
          }
          break;
      }
    });
    await this.#s(entry);
  }
  async #s(entry, onTimer = false) {
    if (entry.busy) return;
    let wake = entry.wake;
    if (entry.state === "cancelling" && wake !== undefined)
      await this.#n(entry, async () => {
        let result = await cancelWorkerWake({
          workerWakeId: wake.id,
          onTimer,
        });
        if (
          result.kind === "cancelled" ||
          result.reason === "not_deployed" ||
          Date.now() >= wake.fireAtMs + TICK_INTERVAL_MS
        )
          entry.wake = undefined;
      });
    let taskId = entry.record.taskId;
    if (
      entry.wake === undefined &&
      (entry.scheduleRetriesLeft === 0 || entry.state !== "driving") &&
      this.#e.get(taskId) === entry
    )
      this.#e.delete(taskId);
    this.#f();
  }
  async #n(entry, work) {
    entry.busy = true;
    try {
      await work();
    } catch (error) {
      logError(error);
    } finally {
      entry.busy = false;
    }
  }
  #l(entry, workerWakeId) {
    let { record, taskRegistry, storageV5 } = entry;
    let task = taskRegistry.get(record.taskId);
    if (task?.type !== "mcp_task" || task.notified || task.status !== "running") return;
    let isSameSession = () => {
      let task = taskRegistry.get(record.taskId);
      return (
        task?.type === "mcp_task" &&
        task.sidecarSessionId === getSessionId() &&
        task.sidecarProjectDir === getMcpTaskProjectDir()
      );
    };
    let sidecarWrite = task.sidecarWrite;
    let sidecarWrite_2 = isSameSession()
      ? (async () => {
          await sidecarWrite;
          if (!isSameSession()) return;
          await writeMcpTaskMetadata(
            record.taskId,
            {
              ...record,
              protocol: "sep2663",
              workerWakeId,
            },
            storageV5,
          );
        })().catch((error) => {
          logForDebugging(
            `MCP task ${record.taskId}: could not save its worker wake id to the task's record (${String(error)}); a restarted worker will not be able to cancel that wake`,
          );
          logFeatureSad("mcp_task_worker_wake", "wake_id_not_saved");
        })
      : sidecarWrite;
    taskRegistry.update(record.taskId, (task) => ({
      ...task,
      workerWakeId,
      sidecarWrite: sidecarWrite_2,
    }));
  }
  #f() {
    let needsTick = false;
    let needsRetime = false;
    for (let entry of this.#e.values()) {
      needsTick ||= entry.state === "cancelling" || isMovingWake(entry) || entry.scheduleRetriesLeft > 0;
      needsRetime ||= entry.retimeSoon;
    }
    if (needsTick && this.#t === undefined) {
      this.#t = setInterval(() => void this.tick(), TICK_INTERVAL_MS);
      this.#t.unref();
    } else if (!needsTick && this.#t !== undefined) {
      clearInterval(this.#t);
      this.#t = undefined;
    }
    if (needsRetime && this.#r === undefined) {
      this.#r = setTimeout(() => {
        this.#r = undefined;
        this.#k();
      }, TICK_IDLE_MS);
      this.#r.unref();
    }
  }
  async #k() {
    let pending = [];
    for (let entry of this.#e.values())
      if (
        entry.retimeSoon &&
        !entry.busy &&
        entry.wake !== undefined &&
        isMovingWake(entry) &&
        isTaskWorkerWakeEnabled()
      )
        pending.push(this.#d(entry, entry.wake, false));
    await Promise.all(pending);
  }
}
//@ chunk-1w450km7.js:12905-12930 placement
var mcpTaskWorkerWakeKeepers = new SessionRootSlot(() => new WorkerWakeKeeper());
export { mcpTaskWorkerWakeKeepers };
