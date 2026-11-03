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
import { u, string } from "../../../vendor/zod/v4/classic/schemas.js";
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
  u({
    wake_id: string().regex(WORKER_WAKE_ID_RE),
    fire_at: parseToolOutputSchema({
      offset: true,
    }),
    expires_at: parseToolOutputSchema({
      offset: true,
    }),
  }),
);
var wakeErrorSchema = DoctorLazy(() =>
  u({
    error: u({
      type: string().optional(),
      reason: string().optional(),
      resource_type: string().optional(),
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
  let a = wakePreconditionFailure("retime", onTimer) ?? wakePolicyBlock("retime", onTimer);
  if (a !== undefined) return a;
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
  let s = await sendWakeRequest(
    "cancel",
    () => apiClient.delete(`${WORKER_WAKES_PATH}/${workerWakeId}`, undefined, WAKE_REQUEST_OPTIONS),
    onTimer,
  );
  if (s.kind === "failed") return s;
  if (!isHttpSuccess(s.status)) return wakeHttpFailure("cancel", s.status, onTimer);
  if (typeof s.data !== "object" || s.data === null)
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
  let r = taskMetadataSchema(payload);
  return r.success && r.data.protocol === "sep2663" ? r.data : undefined;
}
//@ chunk-1w450km7.js:5352-5877 placement
/**
 * 解析唤醒请求的应答：成功返回唤醒 id 与触发/过期时间，被拒时返回原因，其他状态视为失败。
 */
function readWakeAnswer(call, response, onTimer) {
  if (response.kind === "failed") return response;
  if (isHttpSuccess(response.status)) {
    let n = wakeAnswerSchema().safeParse(response.data);
    if (!n.success) return wakeFailure(call, "rejected", "malformed_answer", onTimer);
    if (!onTimer)
      logFeatureOk("mcp_task_worker_wake", {
        call: fromEnum(call),
      });
    return {
      kind: "scheduled",
      workerWakeId: n.data.wake_id,
      fireAtMs: Date.parse(n.data.fire_at),
      expiresAtMs: Date.parse(n.data.expires_at),
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
  let a = wakeErrorSchema().safeParse(body);
  let error = a.success ? a.data.error : undefined;
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
async function sendWakeRequest(e, r, onTimer) {
  let a = wakePreconditionFailure(e, onTimer);
  if (a !== undefined) return a;
  let n;
  try {
    n = await r();
  } catch (error) {
    let { kind } = classifyAxiosError(error);
    switch (kind) {
      case "auth":
        return wakeFailure(e, "unauthorized", undefined, onTimer);
      case "timeout":
        return wakeFailure(e, "timeout", undefined, onTimer);
      case "network":
        return wakeFailure(e, "network", undefined, onTimer);
      case "http":
        return wakeFailure(e, "network", "other", onTimer);
      case "other":
        return wakeFailure(e, "rejected", "threw", onTimer);
    }
  }
  if (!n.ok) return wakeFailure(e, "not_sent", n.reason, onTimer);
  return {
    kind: "answered",
    status: n.status,
    data: n.data,
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
function wakeHttpFailure(e, status, onTimer) {
  if (status === 404 || status === 405 || status === 501)
    return wakeFailure(e, "not_deployed", `http_${status}`, onTimer);
  if (status === 401 || status === 403) return wakeFailure(e, "unauthorized", `http_${status}`, onTimer);
  if (status === 429) return wakeFailure(e, "rate_limited", undefined, onTimer);
  if (status === 409) return wakeFailure(e, "conflict", undefined, onTimer);
  return wakeFailure(e, status >= 500 ? "server_error" : "rejected", `http_${status}`, onTimer);
}
//@ chunk-1w450km7.js:7155-7463 placement
/**
 * 生成唤醒失败结果并记录特性状态（可重试的失败按定时器场景区别记录）。
 */
function wakeFailure(e, r, s, a) {
  let n = s === undefined ? r : `${r}_${s}`;
  let d = isRetryableWakeFailure(r);
  if (d || r === "not_sent" || r === "not_deployed") {
    if (!(d && a)) logWakeSad(a, n, e);
  } else if (a)
    logFeatureBad("mcp_task_worker_wake_timer", n, {
      call: fromEnum(e),
    });
  else
    logFeatureBad("mcp_task_worker_wake", n, {
      call: fromEnum(e),
    });
  logForDebugging(`mcpTaskWorkerWake ${e}: failed (${n})`);
  return {
    kind: "failed",
    reason: r,
    retryable: d,
  };
}
//@ chunk-1w450km7.js:7463-7691 placement
function isRetryableWakeFailure(e) {
  switch (e) {
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
function wakePreconditionFailure(e, onTimer) {
  return hasRemoteSdkUrl() ? undefined : wakeFailure(e, "not_sent", "no_session", onTimer);
}
//@ chunk-1w450km7.js:7803-8160 placement
/**
 * 检查组织策略是否允许 MCP 任务 worker 唤醒，被拒时返回 refused，策略未决时返回失败。
 */
function wakePolicyBlock(e, onTimer) {
  let s;
  try {
    if (commandPolicyGateAllows(ALLOW_MCP_TASK_WORKER_WAKE)) return;
    s = policyDenyKind(ALLOW_MCP_TASK_WORKER_WAKE);
  } catch (error) {
    logError(error);
    return wakeFailure(e, "policy_pending", "threw", onTimer);
  }
  if (s === "org_denied" || s === "latched" || s === "unregistered") {
    logWakeSad(onTimer, `policy_denied_${s}`, e);
    logForDebugging(`mcpTaskWorkerWake ${e}: withheld by the organization's policy (${s})`);
    return {
      kind: "refused",
      reason: "policy_denied",
    };
  }
  return wakeFailure(e, "policy_pending", s ?? "no_deny_kind", onTimer);
}
//@ chunk-1w450km7.js:8160-8274 placement
function logWakeSad(e, r, s) {
  if (e)
    logFeatureSad("mcp_task_worker_wake_timer", r, {
      call: fromEnum(s),
    });
  else
    logFeatureSad("mcp_task_worker_wake", r, {
      call: fromEnum(s),
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
function isMovingWake(e) {
  return e.wake?.moving === true && e.state === "driving";
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
  hasConcluded(e) {
    return this.#o.has(e);
  }
  taskBackgrounded(e) {
    try {
      this.#c(e);
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
    let a = taskRegistry.get(record.taskId);
    if (a?.type !== "mcp_task" || a.notified || a.status !== "running" || a.holdCapped === true) return;
    let n = {
      record,
      taskRegistry,
      storageV5,
      wake: undefined,
      busy: false,
      scheduleRetriesLeft: 0,
      retimeSoon: false,
      state: "driving",
    };
    this.#e.set(record.taskId, n);
    taskRegistry.update(record.taskId, (d) => ({
      ...d,
      onWorkerWakeOutcome: (y) => this.taskLeftDrive(record.taskId, y),
    }));
    this.#i(n, false);
  }
  taskLeftDrive(e, r) {
    try {
      this.#u(e, r);
    } catch (error) {
      logError(error);
    }
  }
  #u(e, r) {
    if (r.kind !== "parked" && r.kind !== "capped") this.#o.add(e);
    let s = this.#e.get(e);
    if (s === undefined || (s.state !== "driving" && s.state !== "left_to_fire")) return;
    switch (r.kind) {
      case "told":
      case "stopped":
      case "capped":
        s.state = "cancelling";
        break;
      case "parked":
        s.state = r.code === "ttl_expired" ? "cancelling" : "left_to_fire";
        break;
    }
    s.scheduleRetriesLeft = 0;
    if (!isMovingWake(s)) s.retimeSoon = false;
    if (!s.busy) this.#s(s);
  }
  async tick() {
    let e = [];
    for (let r of this.#e.values()) {
      if (r.busy) continue;
      if (r.state === "cancelling") e.push(this.#s(r, true));
      else if (!isTaskWorkerWakeEnabled()) continue;
      else if (r.wake !== undefined && isMovingWake(r)) e.push(this.#d(r, r.wake, true));
      else if (r.wake === undefined && r.scheduleRetriesLeft > 0) {
        r.scheduleRetriesLeft -= 1;
        e.push(this.#i(r, true));
      }
    }
    await Promise.all(e);
  }
  async #i(e, r) {
    await this.#n(e, async () => {
      let s = !r;
      let a = await scheduleWorkerWake({
        task: e.record,
        delaySeconds: DEFAULT_WAKE_HORIZON_MS / 1000,
        onTimer: r,
      });
      switch (a.kind) {
        case "scheduled":
          e.wake = {
            id: a.workerWakeId,
            fireAtMs: a.fireAtMs,
            expiresAtMs: a.expiresAtMs,
            moving: true,
            notRetryableRounds: 0,
          };
          e.scheduleRetriesLeft = 0;
          this.#l(e, a.workerWakeId);
          break;
        case "refused":
          this.#a ||=
            a.reason === "unsupported_host" ||
            a.reason === "unsupported_session" ||
            a.reason === "delay_out_of_range";
          e.scheduleRetriesLeft = 0;
          break;
        case "failed":
          if (e.state !== "driving") e.scheduleRetriesLeft = 0;
          else if (a.reason === "policy_pending") e.scheduleRetriesLeft = 1;
          else if (a.reason !== "rate_limited") e.scheduleRetriesLeft = 0;
          else if (s) e.scheduleRetriesLeft = MAX_SCHEDULE_RETRIES;
          break;
      }
    });
    await this.#s(e);
  }
  async #d(e, r, s) {
    await this.#n(e, async () => {
      let a = {
        kind: "refused",
        reason: "expired",
      };
      let n =
        Date.now() + DEFAULT_WAKE_HORIZON_MS > r.expiresAtMs
          ? a
          : await retimeWorkerWake({
              workerWakeId: r.id,
              delaySeconds: DEFAULT_WAKE_HORIZON_MS / 1000,
              onTimer: true,
            });
      e.retimeSoon = false;
      if (e.wake !== r || !r.moving) return;
      switch (n.kind) {
        case "scheduled":
          r.fireAtMs = n.fireAtMs;
          r.expiresAtMs = n.expiresAtMs;
          r.notRetryableRounds = 0;
          break;
        case "refused":
          if (n.reason === "expired") {
            r.moving = false;
            if (e.state === "driving") e.state = "cancelling";
          } else if (n.reason === "policy_denied") {
            r.moving = false;
            e.state = "cancelling";
          } else if (n.reason === "cancelled" || n.reason === "not_found") e.wake = undefined;
          else {
            r.moving = false;
            if (e.state === "driving") e.state = "left_to_fire";
          }
          break;
        case "failed":
          if (n.retryable) {
            e.retimeSoon = s;
            break;
          }
          if (s && n.reason !== "not_sent") r.notRetryableRounds += 1;
          if (n.reason === "not_sent" || r.notRetryableRounds >= MAX_RETRY_ROUNDS) {
            r.moving = false;
            if (e.state === "driving") e.state = "left_to_fire";
          }
          break;
      }
    });
    await this.#s(e);
  }
  async #s(e, onTimer = false) {
    if (e.busy) return;
    let wake = e.wake;
    if (e.state === "cancelling" && wake !== undefined)
      await this.#n(e, async () => {
        let d = await cancelWorkerWake({
          workerWakeId: wake.id,
          onTimer,
        });
        if (
          d.kind === "cancelled" ||
          d.reason === "not_deployed" ||
          Date.now() >= wake.fireAtMs + TICK_INTERVAL_MS
        )
          e.wake = undefined;
      });
    let taskId = e.record.taskId;
    if (
      e.wake === undefined &&
      (e.scheduleRetriesLeft === 0 || e.state !== "driving") &&
      this.#e.get(taskId) === e
    )
      this.#e.delete(taskId);
    this.#f();
  }
  async #n(e, r) {
    e.busy = true;
    try {
      await r();
    } catch (error) {
      logError(error);
    } finally {
      e.busy = false;
    }
  }
  #l(e, workerWakeId) {
    let { record, taskRegistry, storageV5 } = e;
    let d = taskRegistry.get(record.taskId);
    if (d?.type !== "mcp_task" || d.notified || d.status !== "running") return;
    let y = () => {
      let k = taskRegistry.get(record.taskId);
      return (
        k?.type === "mcp_task" &&
        k.sidecarSessionId === getSessionId() &&
        k.sidecarProjectDir === getMcpTaskProjectDir()
      );
    };
    let sidecarWrite = d.sidecarWrite;
    let sidecarWrite_2 = y()
      ? (async () => {
          await sidecarWrite;
          if (!y()) return;
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
    taskRegistry.update(record.taskId, (k) => ({
      ...k,
      workerWakeId,
      sidecarWrite: sidecarWrite_2,
    }));
  }
  #f() {
    let e = false;
    let r = false;
    for (let s of this.#e.values()) {
      e ||= s.state === "cancelling" || isMovingWake(s) || s.scheduleRetriesLeft > 0;
      r ||= s.retimeSoon;
    }
    if (e && this.#t === undefined) {
      this.#t = setInterval(() => void this.tick(), TICK_INTERVAL_MS);
      this.#t.unref();
    } else if (!e && this.#t !== undefined) {
      clearInterval(this.#t);
      this.#t = undefined;
    }
    if (r && this.#r === undefined) {
      this.#r = setTimeout(() => {
        this.#r = undefined;
        this.#k();
      }, TICK_IDLE_MS);
      this.#r.unref();
    }
  }
  async #k() {
    let e = [];
    for (let r of this.#e.values())
      if (r.retimeSoon && !r.busy && r.wake !== undefined && isMovingWake(r) && isTaskWorkerWakeEnabled())
        e.push(this.#d(r, r.wake, false));
    await Promise.all(e);
  }
}
//@ chunk-1w450km7.js:12905-12930 placement
var mcpTaskWorkerWakeKeepers = new SessionRootSlot(() => new WorkerWakeKeeper());
