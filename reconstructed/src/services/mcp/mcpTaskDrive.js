/**
 * services/mcp/mcpTaskDrive.ts
 *
 * 2.1.316 新增。驱动一个 MCP 任务（com.anthropic/agent-task）：轮询 working/input_required/completed/failed 状态，处理输入请求，中止时发 tasks/cancel；能力丢失的 JSON-RPC 错误码按不可用处理。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-01rphnc1.js (13)
 * attribution: placement 13
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { kt, o, U, E, T, M, pe, oe, Ir } from "../../../vendor/zod/v4/classic/schemas.js";
import { MCP_TASK_LABEL_MAX, C2 } from "./mcpTaskCapability.js";
import { describeErrorBrief } from "./auth.js";
import { MCP_TASK_POLL_MS } from "./mcpTaskWorker.js";
import { sleep } from "../../utils/sleep.js";

//@ chunk-01rphnc1.js:429-1390 placement
var MCP_NAME_HEADER = "Mcp-Name",
  y = 250,
  Q = 30000,
  W = 2000,
  x = 5,
  L = 16,
  g = DoctorLazy(() =>
    kt({
      taskId: o().min(1).max(MCP_TASK_LABEL_MAX).regex(C2),
      status: U(["working", "input_required", "completed", "failed", "cancelled"]),
      statusMessage: o()
        .nullish()
        .transform((e) => e ?? void 0)
        .optional(),
      createdAt: o()
        .nullish()
        .transform((e) => e ?? void 0)
        .optional(),
      lastUpdatedAt: o()
        .nullish()
        .transform((e) => e ?? void 0)
        .optional(),
      ttlMs: E()
        .nullish()
        .transform((e) => e ?? void 0)
        .optional(),
      pollIntervalMs: E()
        .nullish()
        .transform((e) => e ?? void 0)
        .optional(),
    }),
  ),
  CreateTaskResultSchema = DoctorLazy(() => g().extend({ resultType: T("task") })),
  AGENT_TASK_META_KEY = "com.anthropic/agent-task",
  B = 20000,
  Y = 64,
  Z = DoctorLazy(() =>
    kt({
      sessionId: o()
        .max(MCP_TASK_LABEL_MAX)
        .regex(C2)
        .nullish()
        .transform((e) => e ?? void 0)
        .optional(),
      modelImmediateResponse: o()
        .max(B)
        .nullish()
        .transform((e) => e ?? void 0)
        .optional(),
      taskId: o()
        .max(MCP_TASK_LABEL_MAX)
        .regex(C2)
        .nullish()
        .transform((e) => e ?? void 0)
        .optional(),
      merged: M()
        .nullish()
        .transform((e) => e ?? void 0)
        .optional(),
      kind: o()
        .max(Y)
        .regex(C2)
        .nullish()
        .transform((e) => e ?? void 0)
        .optional(),
    }),
  );
//@ chunk-01rphnc1.js:1390-1659 placement
function sdkAgentTaskMeta(e) {
  let r = parseAgentTaskMeta(e);
  if (r === void 0) return;
  let a = {
    ...(r.sessionId !== void 0 && { sessionId: r.sessionId }),
    ...(r.taskId !== void 0 && { taskId: r.taskId }),
    ...(r.kind !== void 0 && { kind: r.kind }),
    ...(r.merged !== void 0 && { merged: r.merged }),
  };
  return Object.keys(a).length > 0 ? { [AGENT_TASK_META_KEY]: a } : void 0;
}
//@ chunk-01rphnc1.js:1659-1803 placement
function parseAgentTaskMeta(e) {
  if (typeof e !== "object" || e === null) return;
  let r = e[AGENT_TASK_META_KEY];
  if (r === void 0) return;
  let safeParse = Z().safeParse(r);
  return safeParse.success ? safeParse.data : void 0;
}
/**
 * MCP 任务状态 schema
 */
//@ chunk-01rphnc1.js:1803-2439 placement
var taskStatusSchemas = DoctorLazy(() =>
    kt({
      method: o().min(1).max(MCP_TASK_LABEL_MAX).regex(C2),
      params: pe(o(), oe())
        .nullish()
        .transform((e) => e ?? void 0)
        .optional(),
    }),
  ),
  te = DoctorLazy(() =>
    Ir("status", [
      g().extend({ status: T("working") }),
      g().extend({
        status: T("input_required"),
        inputRequests: pe(o().min(1).max(512), taskStatusSchemas())
          .nullish()
          .transform((e) => e ?? {}),
      }),
      g().extend({
        status: T("completed"),
        result: pe(o(), oe())
          .nullish()
          .transform((e) => e ?? {}),
      }),
      g().extend({
        status: T("failed"),
        error: kt({
          code: E()
            .nullish()
            .transform((e) => e ?? void 0)
            .optional(),
          message: o()
            .nullish()
            .transform((e) => e ?? void 0)
            .optional(),
          data: oe().optional(),
        })
          .nullish()
          .transform((e) => e ?? {}),
      }),
      g().extend({ status: T("cancelled") }),
    ]),
  );
//@ chunk-01rphnc1.js:2439-2525 placement
class TaskInputUnservableError extends Error {
  constructor(e) {
    super(e);
    this.name = "TaskInputUnservableError";
  }
}
//@ chunk-01rphnc1.js:2525-2577 placement
function clampPollInterval(e) {
  return Math.min(Q, Math.max(y, e ?? W));
}
/**
 * 是否为可重试的传输错误
 */
//@ chunk-01rphnc1.js:2577-2959 placement
function isTransientTransportError(e) {
  if (typeof e !== "object" || e === null) return !1;
  if (Object.prototype.toString.call(e) === "[object DOMException]") return !1;
  if (
    e instanceof Error &&
    (e.name === "AbortError" ||
      e.name === "TimeoutError" ||
      e.message.startsWith("SSE error: ") ||
      e.message.startsWith("Streamable HTTP error: "))
  )
    return !1;
  return "code" in e && typeof e.code === "number" && "message" in e && typeof e.message === "string";
}
//@ chunk-01rphnc1.js:2959-3082 placement
function isRetryableTaskPollError(e) {
  return (
    isTransientTransportError(e) ||
    (e instanceof Error &&
      (e.name === "UnauthorizedError" || ("status" in e && typeof e.status === "number")))
  );
}
//@ chunk-01rphnc1.js:3082-3165 placement
function q(e) {
  if (j(e)) return !1;
  return e === -32603 || e === -32700 || (e >= -32099 && e <= -32000);
}
//@ chunk-01rphnc1.js:3165-3209 placement
function j(e) {
  return e === -32021 || e === -32003;
}
//@ chunk-01rphnc1.js:3209-3249 placement
function isCapabilityLossJsonRpcCode(e) {
  return e === -32601 || j(e);
}
//@ chunk-01rphnc1.js:3249-3289 placement
var TASK_DRIVE_QUIET_STOP = Symbol("TASK_DRIVE_QUIET_STOP");
/**
 * 驱动一个 MCP 任务（com.anthropic/agent-task）：轮询 working/input_required/completed/failed 状态，处理输入请求，中止时发 tasks/cancel；能力丢失的 JSON-RPC 错误码按不可用处理。
 */
//@ chunk-01rphnc1.js:3289-8000 placement
async function driveMcpTask({
  task: task,
  request: request,
  signal: signal,
  onStatus: onStatus,
  resolveInputRequest: resolveInputRequest,
  log: log,
  errorText: errorText = describeErrorBrief,
  isSignInRefusal: isSignInRefusal,
  answeredKeys: answeredKeys,
  outstandingInputKeys: outstandingInputKeys,
  endsAtFirstFailedPoll: endsAtFirstFailedPoll,
  isAnswerTooLarge: isAnswerTooLarge,
  holdsProcess: holdsProcess,
}) {
  let { taskId: taskId } = task,
    I = { [MCP_NAME_HEADER]: taskId },
    v = answeredKeys ?? new Set(),
    C = new Set(),
    A = new Map(),
    h = outstandingInputKeys ?? { served: new Set(), capLogged: !1 },
    z = clampPollInterval(task.pollIntervalMs),
    w,
    m = 0,
    k = 0,
    u = () => {
      if (signal.reason === TASK_DRIVE_QUIET_STOP) return;
      request(
        "tasks/cancel",
        { taskId: taskId },
        { headers: I, signal: AbortSignal.timeout(MCP_TASK_POLL_MS) },
      ).then(
        () => log?.(`task ${taskId}: cancel sent`),
        (i) => log?.(`task ${taskId}: cancel failed: ${errorText(i)}`),
      );
    },
    O = !0;
  for (;;) {
    if (O) O = !1;
    else {
      let n = w ?? z;
      ((w = void 0), await sleep(n, signal, { unref: holdsProcess === !1 }));
    }
    if (signal.aborted)
      return (u(), { status: "error", error: { kind: "cancelled", message: "Task cancelled" } });
    let i;
    try {
      let n = await request("tasks/get", { taskId: taskId }, { headers: I, signal: signal }),
        safeParse = te().safeParse(n);
      if (!safeParse.success)
        return (
          u(),
          {
            status: "error",
            error: {
              kind: "malformed",
              message: `Malformed tasks/get response for task ${taskId}: ${safeParse.error.message}`,
            },
          }
        );
      ((i = safeParse.data), (m = 0));
    } catch (error) {
      if (signal.aborted)
        return (u(), { status: "error", error: { kind: "cancelled", message: "Task cancelled" } });
      if (isTransientTransportError(error) && !q(error.code))
        return {
          status: "error",
          error: {
            kind: "poll_failed",
            message: `tasks/get failed for task ${taskId}: ${error.message}`,
            code: error.code,
            data: error.data,
          },
        };
      let d = error instanceof Error && error.name === "HttpBodyOverflowError";
      if (d || isAnswerTooLarge?.(error) === !0)
        return (
          u(),
          {
            status: "error",
            error: {
              kind: "answer_too_large",
              message:
                "The answer to a status request for the task was too large, so it was not read. The tool may have run: check whether it did before running it again, and when you run it again, ask for less data.",
              ...(!d && { connectionClosed: !0 }),
            },
          }
        );
      let R = await isSignInRefusal?.(error).catch(
        (t) => (
          log?.(`task ${taskId}: could not tell whether the server asks for a sign-in: ${errorText(t)}`),
          !1
        ),
      );
      if (signal.aborted)
        return (u(), { status: "error", error: { kind: "cancelled", message: "Task cancelled" } });
      if (R === !0)
        return {
          status: "error",
          error: {
            kind: "poll_failed",
            message: `a poll of task ${taskId} was refused: ${errorText(error)}`,
            signInRefused: !0,
          },
        };
      m += 1;
      let f = endsAtFirstFailedPoll?.() === !0 ? 1 : x;
      if ((log?.(`task ${taskId}: poll failure ${m}/${f}: ${errorText(error)}`), m >= f))
        return {
          status: "error",
          error: {
            kind: "poll_failed",
            ...(isRetryableTaskPollError(error)
              ? {
                  message: `${m} polls of task ${taskId} failed in a row, the last with an error answer: ${errorText(error)}`,
                  answered: !0,
                }
              : { message: `Lost contact with task ${taskId} after ${m} failed polls: ${errorText(error)}` }),
          },
        };
      continue;
    }
    if ((onStatus?.(i), (z = clampPollInterval(i.pollIntervalMs ?? z)), i.status !== "input_required")) k = 0;
    switch (i.status) {
      case "working":
        continue;
      case "completed":
        return { status: "completed", result: i.result };
      case "failed":
        return {
          status: "error",
          error: {
            kind: "failed",
            message: i.error.message ?? i.statusMessage ?? "Task failed",
            code: i.error.code,
            data: i.error.data,
          },
        };
      case "cancelled":
        return {
          status: "error",
          error: { kind: "cancelled", message: i.statusMessage ?? "Task was cancelled by the server" },
        };
      case "input_required": {
        let filtered = Object.entries(i.inputRequests).filter(([t]) => !v.has(t));
        if (filtered.length === 0) continue;
        let filtered_2 = filtered.filter(([t]) => !C.has(t));
        if (filtered_2.length === 0)
          return (
            u(),
            {
              status: "error",
              error: {
                kind: "unsupported_input",
                message: `Task ${taskId}: the server rejected the submitted answer to ${filtered.map(([t]) => t).join(", ")} and still requires input`,
              },
            }
          );
        let filtered_3 = filtered_2.filter(([t]) => {
          if (h.served.has(t)) return !0;
          if (h.served.size >= L) {
            if (!h.capLogged)
              (log?.(`task ${taskId}: reached ${L} distinct input-request keys; ignoring new keys`),
                (h.capLogged = !0));
            return !1;
          }
          return (h.served.add(t), !0);
        });
        if (filtered_3.length === 0) continue;
        let f = {};
        for (let [t, b] of filtered_3) {
          if (signal.aborted) break;
          let _;
          if (A.has(t)) _ = A.get(t);
          else {
            try {
              _ = await resolveInputRequest(t, b);
            } catch (error) {
              if (error instanceof TaskInputUnservableError)
                return (
                  u(),
                  {
                    status: "error",
                    error: {
                      kind: "input_unservable",
                      message:
                        "the task asked the user a question that this session cannot show yet, so Claude Code asked the server to cancel it",
                    },
                  }
                );
              throw error;
            }
            if (_ === void 0)
              return (
                u(),
                {
                  status: "error",
                  error: {
                    kind: "unsupported_input",
                    message: `Task ${taskId} asked for ${b.method}, which this client cannot serve`,
                  },
                }
              );
            A.set(t, _);
          }
          f[t] = _;
        }
        if (signal.aborted)
          return (u(), { status: "error", error: { kind: "cancelled", message: "Task cancelled" } });
        try {
          (await request(
            "tasks/update",
            { taskId: taskId, inputResponses: f },
            { headers: I, signal: signal },
          ),
            (k = 0));
          for (let t of Object.keys(f)) v.add(t);
          log?.(`task ${taskId}: answered ${Object.keys(f).join(", ")}`);
        } catch (error) {
          if (signal.aborted)
            return (u(), { status: "error", error: { kind: "cancelled", message: "Task cancelled" } });
          if (isTransientTransportError(error) && isCapabilityLossJsonRpcCode(error.code))
            return {
              status: "error",
              error: {
                kind: "poll_failed",
                message: `tasks/update failed for task ${taskId}: ${error.message}`,
                code: error.code,
                data: error.data,
              },
            };
          if (isTransientTransportError(error) && !q(error.code)) {
            for (let b of Object.keys(f)) C.add(b);
            (log?.(
              `task ${taskId}: tasks/update JSON-RPC error ${error.code} (${error instanceof Error ? error.message : String(error)}); re-polling for real state`,
            ),
              (w = y));
            continue;
          }
          if (
            ((k += 1), log?.(`task ${taskId}: tasks/update failure ${k}/${x}: ${errorText(error)}`), k >= x)
          )
            return {
              status: "error",
              error: {
                kind: "poll_failed",
                message: `Lost contact with task ${taskId} after ${k} failed tasks/update attempts: ${errorText(error)}`,
                phase: "update",
              },
            };
          w = y;
          continue;
        }
        w = y;
        continue;
      }
    }
  }
}

export {
  clampPollInterval,
  TASK_DRIVE_QUIET_STOP,
  MCP_NAME_HEADER,
  driveMcpTask,
  isCapabilityLossJsonRpcCode,
};
