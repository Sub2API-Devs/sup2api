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
import { u, o } from "../../../vendor/zod/v4/classic/schemas.js";
import { jYn, JLo, getMcpTaskProjectDir, writeMcpTaskMetadata } from "./mcpTasks.js";
import { t0 } from "./schemaParse.js";
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
import { qSn } from "./mcpTaskWorker.js";
import { getSessionId } from "../../bootstrap/state.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";

/**
 * worker 唤醒接口的常量：请求超时、路径、载荷上限、策略键、请求选项与应答/错误 schema。
 */
//@ chunk-1w450km7.js:3626-3993 placement
var WAKE_REQUEST_TIMEOUT_MS = 1e4,
  WORKER_WAKES_PATH = "/worker/wakes",
  MAX_WAKE_PAYLOAD_BYTES = 1984,
  ALLOW_MCP_TASK_WORKER_WAKE = "allow_mcp_task_worker_wake",
  WAKE_REQUEST_OPTIONS = {
    auth: "session-jwt",
    host: "ccr-session",
    headers: { "anthropic-version": "2023-06-01" },
    timeout: WAKE_REQUEST_TIMEOUT_MS,
    validateStatus: () => !0,
  },
  wakeAnswerSchema = DoctorLazy(() =>
    u({ wake_id: o().regex(jYn), fire_at: t0({ offset: !0 }), expires_at: t0({ offset: !0 }) }),
  ),
  wakeErrorSchema = DoctorLazy(() =>
    u({ error: u({ type: o().optional(), reason: o().optional(), resource_type: o().optional() }) }),
  );
/**
 * 向 CCR 会话申请一次 worker 唤醒（POST /worker/wakes，载荷为任务恢复记录）：被策略或开关挡住时直接返回，载荷不可用或过大时不发，结果解析为 scheduled/refused/failed。
 */
//@ chunk-1w450km7.js:3993-4565 placement
async function scheduleWorkerWake({ task: task, delaySeconds: delaySeconds, onTimer: onTimer = !1 }) {
  let blocked = R("schedule", onTimer) ?? wakePolicyBlock("schedule", onTimer);
  if (blocked !== void 0) return blocked;
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
  if (V(payload) === void 0 || Buffer.byteLength(jsonStringify(payload)) > MAX_WAKE_PAYLOAD_BYTES)
    return wakeFailure("schedule", "not_sent", "unusable_payload", onTimer);
  let answer = await sendWakeRequest(
    "schedule",
    () =>
      apiClient.post(
        WORKER_WAKES_PATH,
        { delay_seconds: O(delaySeconds), payload: payload },
        WAKE_REQUEST_OPTIONS,
      ),
    onTimer,
  );
  return readWakeAnswer("schedule", answer, onTimer);
}
//@ chunk-1w450km7.js:4565-4846 placement
async function retimeWorkerWake({
  workerWakeId: workerWakeId,
  delaySeconds: delaySeconds,
  onTimer: onTimer = !1,
}) {
  let a = R("retime", onTimer) ?? wakePolicyBlock("retime", onTimer);
  if (a !== void 0) return a;
  if (!jYn.test(workerWakeId)) return wakeFailure("retime", "rejected", "malformed_id", onTimer);
  let n = await sendWakeRequest(
    "retime",
    () =>
      apiClient.post(
        WORKER_WAKES_PATH,
        { wake_id: workerWakeId, delay_seconds: O(delaySeconds) },
        WAKE_REQUEST_OPTIONS,
      ),
    onTimer,
  );
  return readWakeAnswer("retime", n, onTimer);
}
/**
 * 取消一个 worker 唤醒（DELETE /worker/wakes/:id），返回 cancelled 或失败。
 */
//@ chunk-1w450km7.js:4846-5265 placement
async function cancelWorkerWake({ workerWakeId: workerWakeId, onTimer: onTimer = !1 }) {
  if (!jYn.test(workerWakeId)) return wakeFailure("cancel", "rejected", "malformed_id", onTimer);
  let s = await sendWakeRequest(
    "cancel",
    () => apiClient.delete(`${WORKER_WAKES_PATH}/${workerWakeId}`, void 0, WAKE_REQUEST_OPTIONS),
    onTimer,
  );
  if (s.kind === "failed") return s;
  if (!L(s.status)) return wakeHttpFailure("cancel", s.status, onTimer);
  if (typeof s.data !== "object" || s.data === null)
    return wakeFailure("cancel", "rejected", "malformed_answer", onTimer);
  if (!onTimer) logFeatureOk("mcp_task_worker_wake", { call: fromEnum("cancel") });
  return { kind: "cancelled" };
}
//@ chunk-1w450km7.js:5265-5352 placement
function V(e) {
  let r = JLo(e);
  return r.success && r.data.protocol === "sep2663" ? r.data : void 0;
}
/**
 * 解析唤醒请求的应答：成功返回唤醒 id 与触发/过期时间，被拒时返回原因，其他状态视为失败。
 */
//@ chunk-1w450km7.js:5352-5877 placement
function readWakeAnswer(call, response, onTimer) {
  if (response.kind === "failed") return response;
  if (L(response.status)) {
    let safeParse = wakeAnswerSchema().safeParse(response.data);
    if (!safeParse.success) return wakeFailure(call, "rejected", "malformed_answer", onTimer);
    if (!onTimer) logFeatureOk("mcp_task_worker_wake", { call: fromEnum(call) });
    return {
      kind: "scheduled",
      workerWakeId: safeParse.data.wake_id,
      fireAtMs: Date.parse(safeParse.data.fire_at),
      expiresAtMs: Date.parse(safeParse.data.expires_at),
    };
  }
  let refusal = wakeRefusalReason(call, response.status, response.data);
  if (refusal === void 0) return wakeHttpFailure(call, response.status, onTimer);
  if (refusal === "wake_off") return wakeFailure(call, "wake_off", void 0, onTimer);
  return (
    logWakeSad(onTimer, refusal, call),
    logForDebugging(`mcpTaskWorkerWake ${call}: refused (${refusal})`),
    { kind: "refused", reason: refusal }
  );
}
/**
 * 从 400/404 错误应答中识别唤醒被拒的原因（不支持的主机或会话、延迟越界、已过期、已取消、关闭、未找到）。
 */
//@ chunk-1w450km7.js:5877-6382 placement
function wakeRefusalReason(call, status, body) {
  let safeParse = wakeErrorSchema().safeParse(body),
    n = safeParse.success ? safeParse.data.error : void 0;
  switch (status === 400 ? n?.reason : void 0) {
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
    n?.type === "not_found_error" &&
    n.resource_type === "worker_wake"
    ? "not_found"
    : void 0;
}
/**
 * 发送唤醒请求并把异常归类为未授权、超时、网络或拒绝，未发出时返回 not_sent。
 */
//@ chunk-1w450km7.js:6382-6822 placement
async function sendWakeRequest(e, r, s) {
  let a = R(e, s);
  if (a !== void 0) return a;
  let n;
  try {
    n = await r();
  } catch (error) {
    let { kind: kind } = classifyAxiosError(error);
    switch (kind) {
      case "auth":
        return wakeFailure(e, "unauthorized", void 0, s);
      case "timeout":
        return wakeFailure(e, "timeout", void 0, s);
      case "network":
        return wakeFailure(e, "network", void 0, s);
      case "http":
        return wakeFailure(e, "network", "other", s);
      case "other":
        return wakeFailure(e, "rejected", "threw", s);
    }
  }
  if (!n.ok) return wakeFailure(e, "not_sent", n.reason, s);
  return { kind: "answered", status: n.status, data: n.data };
}
//@ chunk-1w450km7.js:6822-6857 placement
function L(e) {
  return e >= 200 && e < 300;
}
//@ chunk-1w450km7.js:6857-7155 placement
function wakeHttpFailure(e, r, s) {
  if (r === 404 || r === 405 || r === 501) return wakeFailure(e, "not_deployed", `http_${r}`, s);
  if (r === 401 || r === 403) return wakeFailure(e, "unauthorized", `http_${r}`, s);
  if (r === 429) return wakeFailure(e, "rate_limited", void 0, s);
  if (r === 409) return wakeFailure(e, "conflict", void 0, s);
  return wakeFailure(e, r >= 500 ? "server_error" : "rejected", `http_${r}`, s);
}
/**
 * 生成唤醒失败结果并记录特性状态（可重试的失败按定时器场景区别记录）。
 */
//@ chunk-1w450km7.js:7155-7463 placement
function wakeFailure(e, r, s, a) {
  let n = s === void 0 ? r : `${r}_${s}`,
    d = isRetryableWakeFailure(r);
  if (d || r === "not_sent" || r === "not_deployed") {
    if (!(d && a)) logWakeSad(a, n, e);
  } else if (a) logFeatureBad("mcp_task_worker_wake_timer", n, { call: fromEnum(e) });
  else logFeatureBad("mcp_task_worker_wake", n, { call: fromEnum(e) });
  return (
    logForDebugging(`mcpTaskWorkerWake ${e}: failed (${n})`),
    { kind: "failed", reason: r, retryable: d }
  );
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
      return !0;
    case "not_sent":
    case "not_deployed":
    case "unauthorized":
    case "rejected":
      return !1;
  }
}
//@ chunk-1w450km7.js:7691-7737 placement
function O(e) {
  return Math.max(1, Math.ceil(e));
}
//@ chunk-1w450km7.js:7737-7803 placement
function R(e, r) {
  return hasRemoteSdkUrl() ? void 0 : wakeFailure(e, "not_sent", "no_session", r);
}
/**
 * 检查组织策略是否允许 MCP 任务 worker 唤醒，被拒时返回 refused，策略未决时返回失败。
 */
//@ chunk-1w450km7.js:7803-8160 placement
function wakePolicyBlock(e, r) {
  let s;
  try {
    if (commandPolicyGateAllows(ALLOW_MCP_TASK_WORKER_WAKE)) return;
    s = policyDenyKind(ALLOW_MCP_TASK_WORKER_WAKE);
  } catch (error) {
    return (logError(error), wakeFailure(e, "policy_pending", "threw", r));
  }
  if (s === "org_denied" || s === "latched" || s === "unregistered")
    return (
      logWakeSad(r, `policy_denied_${s}`, e),
      logForDebugging(`mcpTaskWorkerWake ${e}: withheld by the organization's policy (${s})`),
      { kind: "refused", reason: "policy_denied" }
    );
  return wakeFailure(e, "policy_pending", s ?? "no_deny_kind", r);
}
//@ chunk-1w450km7.js:8160-8274 placement
function logWakeSad(e, r, s) {
  if (e) logFeatureSad("mcp_task_worker_wake_timer", r, { call: fromEnum(s) });
  else logFeatureSad("mcp_task_worker_wake", r, { call: fromEnum(s) });
}
//@ chunk-1w450km7.js:8274-8311 placement
var h = 900000,
  S = h / 3,
  G = 60000,
  Q = 3,
  X = h / S;
//@ chunk-1w450km7.js:8311-8373 placement
function w(e) {
  return e.wake?.moving === !0 && e.state === "driving";
}
/**
 * 后台 MCP 任务的 worker 唤醒维护器：任务转入后台时申请唤醒，在任务仍被驱动时周期性推迟唤醒时间，任务结束或暂停时取消或保留唤醒，并把唤醒 id 写入任务恢复记录。
 */
//@ chunk-1w450km7.js:8373-12905 placement
class WorkerWakeKeeper {
  #e = new Map();
  #o = new Set();
  #a = !1;
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
  #c({ taskRegistry: e, record: r, storageV5: s }) {
    if (this.#a || this.#e.has(r.taskId) || !hasRemoteSdkUrl()) return;
    if (isEssentialTrafficOnly()) {
      this.#a = !0;
      return;
    }
    let a = e.get(r.taskId);
    if (a?.type !== "mcp_task" || a.notified || a.status !== "running" || a.holdCapped === !0) return;
    let n = {
      record: r,
      taskRegistry: e,
      storageV5: s,
      wake: void 0,
      busy: !1,
      scheduleRetriesLeft: 0,
      retimeSoon: !1,
      state: "driving",
    };
    (this.#e.set(r.taskId, n),
      e.update(r.taskId, (d) => ({ ...d, onWorkerWakeOutcome: (y) => this.taskLeftDrive(r.taskId, y) })),
      this.#i(n, !1));
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
    if (s === void 0 || (s.state !== "driving" && s.state !== "left_to_fire")) return;
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
    if (((s.scheduleRetriesLeft = 0), !w(s))) s.retimeSoon = !1;
    if (!s.busy) this.#s(s);
  }
  async tick() {
    let e = [];
    for (let r of this.#e.values()) {
      if (r.busy) continue;
      if (r.state === "cancelling") e.push(this.#s(r, !0));
      else if (!qSn()) continue;
      else if (r.wake !== void 0 && w(r)) e.push(this.#d(r, r.wake, !0));
      else if (r.wake === void 0 && r.scheduleRetriesLeft > 0)
        ((r.scheduleRetriesLeft -= 1), e.push(this.#i(r, !0)));
    }
    await Promise.all(e);
  }
  async #i(e, r) {
    (await this.#n(e, async () => {
      let s = !r,
        a = await scheduleWorkerWake({ task: e.record, delaySeconds: h / 1000, onTimer: r });
      switch (a.kind) {
        case "scheduled":
          ((e.wake = {
            id: a.workerWakeId,
            fireAtMs: a.fireAtMs,
            expiresAtMs: a.expiresAtMs,
            moving: !0,
            notRetryableRounds: 0,
          }),
            (e.scheduleRetriesLeft = 0),
            this.#l(e, a.workerWakeId));
          break;
        case "refused":
          ((this.#a ||=
            a.reason === "unsupported_host" ||
            a.reason === "unsupported_session" ||
            a.reason === "delay_out_of_range"),
            (e.scheduleRetriesLeft = 0));
          break;
        case "failed":
          if (e.state !== "driving") e.scheduleRetriesLeft = 0;
          else if (a.reason === "policy_pending") e.scheduleRetriesLeft = 1;
          else if (a.reason !== "rate_limited") e.scheduleRetriesLeft = 0;
          else if (s) e.scheduleRetriesLeft = Q;
          break;
      }
    }),
      await this.#s(e));
  }
  async #d(e, r, s) {
    (await this.#n(e, async () => {
      let a = { kind: "refused", reason: "expired" },
        n =
          Date.now() + h > r.expiresAtMs
            ? a
            : await retimeWorkerWake({ workerWakeId: r.id, delaySeconds: h / 1000, onTimer: !0 });
      if (((e.retimeSoon = !1), e.wake !== r || !r.moving)) return;
      switch (n.kind) {
        case "scheduled":
          ((r.fireAtMs = n.fireAtMs), (r.expiresAtMs = n.expiresAtMs), (r.notRetryableRounds = 0));
          break;
        case "refused":
          if (n.reason === "expired") {
            if (((r.moving = !1), e.state === "driving")) e.state = "cancelling";
          } else if (n.reason === "policy_denied") ((r.moving = !1), (e.state = "cancelling"));
          else if (n.reason === "cancelled" || n.reason === "not_found") e.wake = void 0;
          else if (((r.moving = !1), e.state === "driving")) e.state = "left_to_fire";
          break;
        case "failed":
          if (n.retryable) {
            e.retimeSoon = s;
            break;
          }
          if (s && n.reason !== "not_sent") r.notRetryableRounds += 1;
          if (n.reason === "not_sent" || r.notRetryableRounds >= X) {
            if (((r.moving = !1), e.state === "driving")) e.state = "left_to_fire";
          }
          break;
      }
    }),
      await this.#s(e));
  }
  async #s(e, r = !1) {
    if (e.busy) return;
    let wake = e.wake;
    if (e.state === "cancelling" && wake !== void 0)
      await this.#n(e, async () => {
        let d = await cancelWorkerWake({ workerWakeId: wake.id, onTimer: r });
        if (d.kind === "cancelled" || d.reason === "not_deployed" || Date.now() >= wake.fireAtMs + S)
          e.wake = void 0;
      });
    let taskId = e.record.taskId;
    if (
      e.wake === void 0 &&
      (e.scheduleRetriesLeft === 0 || e.state !== "driving") &&
      this.#e.get(taskId) === e
    )
      this.#e.delete(taskId);
    this.#f();
  }
  async #n(e, r) {
    e.busy = !0;
    try {
      await r();
    } catch (error) {
      logError(error);
    } finally {
      e.busy = !1;
    }
  }
  #l(e, r) {
    let { record: record, taskRegistry: taskRegistry, storageV5: storageV5 } = e,
      d = taskRegistry.get(record.taskId);
    if (d?.type !== "mcp_task" || d.notified || d.status !== "running") return;
    let y = () => {
        let k = taskRegistry.get(record.taskId);
        return (
          k?.type === "mcp_task" &&
          k.sidecarSessionId === getSessionId() &&
          k.sidecarProjectDir === getMcpTaskProjectDir()
        );
      },
      sidecarWrite = d.sidecarWrite,
      C = y()
        ? (async () => {
            if ((await sidecarWrite, !y())) return;
            await writeMcpTaskMetadata(
              record.taskId,
              { ...record, protocol: "sep2663", workerWakeId: r },
              storageV5,
            );
          })().catch((k) => {
            (logForDebugging(
              `MCP task ${record.taskId}: could not save its worker wake id to the task's record (${String(k)}); a restarted worker will not be able to cancel that wake`,
            ),
              logFeatureSad("mcp_task_worker_wake", "wake_id_not_saved"));
          })
        : sidecarWrite;
    taskRegistry.update(record.taskId, (k) => ({ ...k, workerWakeId: r, sidecarWrite: C }));
  }
  #f() {
    let e = !1,
      r = !1;
    for (let s of this.#e.values())
      ((e ||= s.state === "cancelling" || w(s) || s.scheduleRetriesLeft > 0), (r ||= s.retimeSoon));
    if (e && this.#t === void 0) ((this.#t = setInterval(() => void this.tick(), S)), this.#t.unref());
    else if (!e && this.#t !== void 0) (clearInterval(this.#t), (this.#t = void 0));
    if (r && this.#r === void 0)
      ((this.#r = setTimeout(() => {
        ((this.#r = void 0), this.#k());
      }, G)),
        this.#r.unref());
  }
  async #k() {
    let e = [];
    for (let r of this.#e.values())
      if (r.retimeSoon && !r.busy && r.wake !== void 0 && w(r) && qSn()) e.push(this.#d(r, r.wake, !1));
    await Promise.all(e);
  }
}
//@ chunk-1w450km7.js:12905-12930 placement
var mcpTaskWorkerWakeKeepers = new SessionRootSlot(() => new WorkerWakeKeeper());
