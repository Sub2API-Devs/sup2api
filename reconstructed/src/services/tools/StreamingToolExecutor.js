/**
 * services/tools/StreamingToolExecutor.ts
 *
 * 流式工具执行器：回答流式到达时边收 tool_use 边执行，并发安全的并行、不安全的独占，按收到顺序产出结果与进度，中断/流式回退时生成合成错误结果
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/tools/StreamingToolExecutor.ts
 * pieces: chunk-ha3km179.js (4)
 * attribution: placement 1, layout 2, fingerprint 1
 */
import {
  serverFallbackTombstoneAbortReason,
  unwrapAbortReason,
  shutdownInterruptStamp,
  createChildAbortController,
  classifyAbortReasonForTelemetry,
} from "../../utils/abortController.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { qS } from "../api/deferredToolsState.js";
import {
  shouldWaitForMcpTool,
  explainUnavailableArtifactTool,
  q1o,
  runToolUse,
  hasTypeField,
} from "./toolExecution.js";
import { currentMcpClients } from "../compact/idleToolResultClearing.js";
import {
  getToolPermissionContext,
  applyContextLayers,
} from "../../utils/permissions/toolPermissionContext.js";
import { getAgentSpawnContext } from "../../tools/AgentTool/agentToolUtils.js";
import { Hrt, Tbn } from "../api/declaredToolSet.js";
import {
  createUserMessage,
  TOOL_CALL_ENDED_FOR_DELIVERY,
  withMemoryCorrectionHint,
  CANCEL_MESSAGE,
  REJECT_MESSAGE_AFTER_RUN,
  REJECT_MESSAGE,
  USER_REJECTED_TOOL_USE,
} from "../../utils/messages.js";
import { getAbortKind, getSerializedPetalLimit, wYs } from "./toolAbort.js";
import { Vun } from "../../utils/abortReasons.js";
import { errorTelemetryFields } from "../../utils/accessibility/screenReader.js";
import { logError } from "../../utils/log.js";
import { getTaskRunState } from "../../utils/task/taskNotifications.js";
import { isTerminalShutdown } from "../../utils/terminalShutdown.js";
import { sanitizeToolNameForAnalytics } from "../analytics/metadata.js";

/**
 * 丢弃并中止进行中的工具调用，上报统计。
 */
//@ chunk-ha3km179.js:58036-58692 placement
function discardInFlightTools(e, n, r) {
  let discardAndAbortInFlight = e.discardAndAbortInFlight(serverFallbackTombstoneAbortReason()),
    h = r?.earlierCounts ?? discardAndAbortInFlight;
  if (r?.silent)
    logEvent("tengu_convolute_arcades_tools", {
      aborted: h.aborted,
      completed_before_event: h.completedBeforeEvent,
      queued_never_started: h.queuedNeverStarted,
      compensated_removes: discardAndAbortInFlight.toolUseIds.length,
    });
  else
    logEvent("tengu_fallback_sweep_tools", {
      lane: fromEnum(n),
      aborted: h.aborted,
      completed_before_event: h.completedBeforeEvent,
      queued_never_started: h.queuedNeverStarted,
      compensated_removes: discardAndAbortInFlight.toolUseIds.length,
    });
  return {
    removes:
      discardAndAbortInFlight.toolUseIds.length === 0
        ? void 0
        : {
            type: "set_in_progress_tool_use_ids",
            op: { action: "remove", ids: discardAndAbortInFlight.toolUseIds },
            reason: "fallback_sweep",
          },
    startedToolUseIds: discardAndAbortInFlight.startedToolUseIds,
  };
}
/**
 * 工具在中断时是否"正在运行"：callRunning 为真且结果未标记为其它拒绝类型。用于选择取消文案。
 */
//@ chunk-ha3km179.js:58692-58815 layout
function isInterruptedWhileRunning(tracked, message) {
  let r = message?.type === "user" ? message.toolDenialKind : void 0;
  return tracked.callRunning === !0 && (r === void 0 || r === "interrupted");
}
/**
 * 判断 user 消息里是否已有指定 tool_use_id 的 tool_result，避免重复写合成错误。
 */
//@ chunk-ha3km179.js:58815-58961 layout
function messageHasToolResultFor(message, toolUseId) {
  return (
    message.type === "user" &&
    Array.isArray(message.message.content) &&
    message.message.content.some((r) => r.type === "tool_result" && r.tool_use_id === toolUseId)
  );
}
/**
 * StreamingToolExecutor：流式回答期间边收 tool_use 边执行。addTool 时判定并发安全并排队；processQueue 保证"并发安全的可以同时跑，不安全的独占"；结果按收到顺序产出（getCompletedResults/getRemainingResults），进度消息随时产出；中断/流式回退时生成合成错误结果（interrupted、cancelled、Streaming fallback、Conversation ended）。未知工具直接生成 "No such tool available" 错误，并用 TOOL_CATALOG 给建议。
 */
//@ chunk-ha3km179.js:58961-69131 fingerprint = StreamingToolExecutor (0.548)
class StreamingToolExecutor {
  toolDefinitions;
  canUseTool;
  now;
  tools = [];
  toolUseContext;
  discarded = !1;
  responseOpen = !0;
  progressAvailableResolve;
  drainableResolve;
  drainGeneration = 0;
  appliedLayers = !1;
  constructor(e, n, r, s) {
    this.toolDefinitions = e;
    this.canUseTool = n;
    this.now = s;
    this.toolUseContext = r;
  }
  discard() {
    ((this.discarded = !0), this.wakeWaiters());
  }
  discardAndAbortInFlight(e) {
    this.discard();
    let n = 0,
      r = 0,
      s = 0,
      h = [];
    for (let tool of this.tools) {
      if (tool.status === "completed" || tool.status === "yielded") {
        if ((r++, tool.status === "completed" && tool.callStarted === !0)) h.push(tool.id);
        continue;
      }
      if (tool.status === "queued") {
        s++;
        continue;
      }
      if (tool.status === "executing") {
        if (tool.callStarted === !0) h.push(tool.id);
        if (tool.abortController && !tool.abortController.signal.aborted)
          (tool.abortController.abort(e), n++);
      }
    }
    return {
      aborted: n,
      completedBeforeEvent: r,
      queuedNeverStarted: s,
      toolUseIds: this.tools.map((tool) => tool.id),
      startedToolUseIds: h,
    };
  }
  takeFinishedResults() {
    if (this.discarded) return [];
    let e = [];
    for (let tool of this.tools)
      if (tool.status === "completed") ((tool.status = "yielded"), e.push(...tool.results));
    return e;
  }
  addTool(e, n) {
    let r = qS(this.toolDefinitions, e.name, this.toolUseContext.options.toolAliases);
    if (!r && shouldWaitForMcpTool(e.name, this.toolUseContext)) {
      (this.tools.push({
        id: e.id,
        block: e,
        assistantMessage: n,
        status: "queued",
        isConcurrencySafe: !1,
        pendingProgress: [],
        pendingBridgeEvents: [],
        results: [],
      }),
        this.processQueue());
      return;
    }
    if (!r) {
      let y = explainUnavailableArtifactTool(
        e.name,
        this.toolDefinitions,
        this.toolUseContext.options.toolCatalog.getAllBaseTools(),
        this.toolUseContext.agentId,
        currentMcpClients(this.toolUseContext),
        getToolPermissionContext(this.toolUseContext),
        getAgentSpawnContext(this.toolUseContext),
        e.input,
        Hrt(this.toolUseContext),
        Tbn(this.toolUseContext),
      );
      (q1o(e.name, e.id, this.toolUseContext, n.requestId),
        this.tools.push({
          id: e.id,
          block: e,
          assistantMessage: n,
          status: "completed",
          isConcurrencySafe: !0,
          pendingProgress: [],
          pendingBridgeEvents: [],
          results: [
            createUserMessage({
              content: [
                {
                  type: "tool_result",
                  content: `<tool_use_error>Error: No such tool available: ${e.name}${y}</tool_use_error>`,
                  is_error: !0,
                  tool_use_id: e.id,
                },
              ],
              toolUseResult: `Error: No such tool available: ${e.name}${y}`,
              sourceToolAssistantUUID: n.uuid,
              now: this.now,
            }),
          ],
        }),
        this.wakeWaiters());
      return;
    }
    let safeParse = r.inputSchema.safeParse(e.input),
      h = safeParse?.success
        ? (() => {
            try {
              return Boolean(r.isConcurrencySafe(safeParse.data));
            } catch {
              return !1;
            }
          })()
        : !1;
    (this.tools.push({
      id: e.id,
      block: e,
      assistantMessage: n,
      status: "queued",
      isConcurrencySafe: h,
      pendingProgress: [],
      pendingBridgeEvents: [],
      results: [],
    }),
      this.processQueue());
  }
  canExecuteTool(e) {
    let filtered = this.tools.filter((tool) => tool.status === "executing");
    return filtered.length === 0 || (e && filtered.every((r) => r.isConcurrencySafe));
  }
  async processQueue() {
    for (let tool of this.tools) {
      if (tool.status !== "queued") continue;
      if (this.canExecuteTool(tool.isConcurrencySafe))
        (this.applyEndedRunLayers(), await this.executeTool(tool));
      else if (!tool.isConcurrencySafe) break;
    }
  }
  createSyntheticErrorMessage(e, n, r, s) {
    if (n === "user_interrupted") {
      let h = unwrapAbortReason(this.toolUseContext.abortController.signal.reason);
      if (h === "turn-abort")
        return createUserMessage({
          content: [
            { type: "tool_result", content: TOOL_CALL_ENDED_FOR_DELIVERY, is_error: !0, tool_use_id: e },
          ],
          toolUseResult: TOOL_CALL_ENDED_FOR_DELIVERY,
          toolDenialKind: "interrupted",
          sourceToolAssistantUUID: r.uuid,
          now: this.now,
        });
      if (h === "background")
        return createUserMessage({
          content: [
            {
              type: "tool_result",
              content: withMemoryCorrectionHint(CANCEL_MESSAGE),
              is_error: !0,
              tool_use_id: e,
            },
          ],
          toolUseResult: CANCEL_MESSAGE,
          toolDenialKind: "cancelled",
          sourceToolAssistantUUID: r.uuid,
          now: this.now,
        });
      return createUserMessage({
        content: [
          {
            type: "tool_result",
            content: withMemoryCorrectionHint(
              s && h === "remote-cancel" ? REJECT_MESSAGE_AFTER_RUN : REJECT_MESSAGE,
            ),
            is_error: !0,
            tool_use_id: e,
          },
        ],
        toolUseResult: USER_REJECTED_TOOL_USE,
        toolDenialKind: "user-rejected",
        interruptedByShutdown: shutdownInterruptStamp(this.toolUseContext.abortController.signal),
        sourceToolAssistantUUID: r.uuid,
        now: this.now,
      });
    }
    if (n === "conversation_ended")
      return createUserMessage({
        content: [
          {
            type: "tool_result",
            content: "<tool_use_error>Cancelled: Claude ended the conversation</tool_use_error>",
            is_error: !0,
            tool_use_id: e,
          },
        ],
        toolUseResult: "Conversation ended by model",
        sourceToolAssistantUUID: r.uuid,
        now: this.now,
      });
    return createUserMessage({
      content: [
        {
          type: "tool_result",
          content: "<tool_use_error>Error: Streaming fallback - tool execution discarded</tool_use_error>",
          is_error: !0,
          tool_use_id: e,
        },
      ],
      toolUseResult: "Streaming fallback - tool execution discarded",
      sourceToolAssistantUUID: r.uuid,
      now: this.now,
    });
  }
  getAbortReason(e, n, r = !1) {
    if (this.discarded) return "streaming_fallback";
    return getAbortKind(
      this.toolUseContext.abortController.signal,
      { name: e.block.name, ran: n, ...!1 },
      Vun(this.toolUseContext),
    );
  }
  armStoppedResultWait(e, n) {}
  takeKeptResult(e, n) {
    return n;
  }
  stoppedResultWaitOf(e) {
    return;
  }
  wakeWaiters() {
    if ((this.drainGeneration++, this.progressAvailableResolve))
      (this.progressAvailableResolve(), (this.progressAvailableResolve = void 0));
    if (this.drainableResolve) (this.drainableResolve(), (this.drainableResolve = void 0));
  }
  hasWakeSince(e) {
    return this.drainGeneration > e;
  }
  waitForDrainable(e) {
    if (this.drainGeneration > e) return Promise.resolve(this.drainGeneration);
    return new Promise((n) => {
      this.drainableResolve = () => n(this.drainGeneration);
    });
  }
  buildSameTurnToolUses(e) {
    try {
      let n = new Map();
      for (let tool of this.tools) {
        if (tool === e) break;
        let s = n.get(tool.assistantMessage) ?? [];
        (s.push(tool.block), n.set(tool.assistantMessage, s));
      }
      return [...n.entries()].map(([r, s]) => ({ ...r, message: { ...r.message, content: s } }));
    } catch (error) {
      logEvent("tengu_auto_mode_sibling_context_error", { ...errorTelemetryFields(error) });
      return;
    }
  }
  buildSameTurnErroredToolUseIds(e) {
    try {
      let n = new Set();
      for (let tool of this.tools) {
        if (tool === e) break;
        if (
          tool.results.some(
            (h) =>
              h.type === "user" &&
              Array.isArray(h.message.content) &&
              h.message.content.some((y) => y.type === "tool_result" && y.is_error === !0),
          )
        )
          n.add(tool.id);
      }
      return n;
    } catch (error) {
      (logError(error), logEvent("tengu_same_turn_errored_ids_error", { ...errorTelemetryFields(error) }));
      return;
    }
  }
  async executeTool(e) {
    e.status = "executing";
    let n = [],
      r = [],
      h = (async () => {
        let abortReason = this.getAbortReason(e, !1);
        if (abortReason) {
          (n.push(this.createSyntheticErrorMessage(e.id, abortReason, e.assistantMessage, !1)),
            (e.results = n),
            (e.contextLayers = r),
            (e.status = "completed"),
            this.wakeWaiters());
          return;
        }
        let S = createChildAbortController(this.toolUseContext.abortController);
        (S.signal.addEventListener(
          "abort",
          () => {
            if (!this.toolUseContext.abortController.signal.aborted && !this.discarded)
              this.toolUseContext.abortController.abort(S.signal.reason);
          },
          { once: !0 },
        ),
          (e.abortController = S));
        let exclusiveCallQueuedBehind = getTaskRunState().exclusiveCallQueuedBehind,
          R = {
            isQueued: () =>
              !this.discarded &&
              this.tools
                .slice(this.tools.indexOf(e) + 1)
                .some((se) => se.status === "queued" && !se.isConcurrencySafe),
            mayYetBeQueued: () => !this.discarded && this.responseOpen,
            holdLogged: !1,
          };
        exclusiveCallQueuedBehind.set(e.id, R);
        using T = {
          [Symbol.dispose]: () => {
            if (exclusiveCallQueuedBehind.get(e.id) === R) exclusiveCallQueuedBehind.delete(e.id);
          },
        };
        let signal = this.toolUseContext.abortController.signal,
          P = !1,
          Q = () => {},
          D = void 0,
          L = void 0,
          z = !1,
          G,
          ee = runToolUse(
            e.block,
            e.assistantMessage,
            this.canUseTool,
            {
              ...this.toolUseContext,
              abortController: S,
              markToolCallStarted: (se) => {
                if (se === e.id) e.callStarted = !0;
              },
              markToolCallRunning: (se, Te = !0) => {
                if (se === e.id) e.callRunning = Te;
              },
              lendToolExecEnd: (se, Te) => {
                if (se === e.id) G = Te;
              },
              toolCallAbandoned: (se) => se === e.id && z,
              ...!1,
              sameTurnToolUses: this.buildSameTurnToolUses(e),
              sameTurnErroredToolUseIds: this.buildSameTurnErroredToolUseIds(e),
            },
            this.now,
          ),
          V = !1,
          fe = !1,
          ie,
          Z = (se) => {
            if (e.status !== "executing" || isTerminalShutdown()) return;
            z = !0;
            try {
              if (!n.some((Te) => messageHasToolResultFor(Te, e.id)))
                n.push(
                  this.createSyntheticErrorMessage(
                    e.id,
                    "user_interrupted",
                    e.assistantMessage,
                    isInterruptedWhileRunning(e),
                  ),
                );
              (G?.(),
                logEvent("tengu_aborted_tool_call_abandoned", {
                  toolName: sanitizeToolNameForAnalytics(e.block.name),
                  abortKind: fromEnum(classifyAbortReasonForTelemetry(signal.reason)),
                  graceMs: se,
                }));
            } catch (error) {
              logError(error);
            }
            ((e.results = n), (e.contextLayers = r), (e.status = "completed"), this.wakeWaiters());
          },
          re = () => {
            let se = getSerializedPetalLimit();
            if (se > 0 && wYs(signal)) ie = setTimeout(Z, se, se);
          };
        if (D === void 0) signal.addEventListener("abort", re, { once: !0 });
        using Re = {
          [Symbol.dispose]: () => {
            (signal.removeEventListener("abort", re), clearTimeout(ie));
          },
        };
        for await (let se of ee) {
          if (z) break;
          if (hasTypeField(se)) {
            (e.pendingBridgeEvents.push(se), this.wakeWaiters());
            continue;
          }
          let Te = se.message?.type !== "user" || se.message.toolDenialKind === void 0;
          fe ||= !1;
          let abortReason = this.getAbortReason(e, Te, fe);
          if (abortReason && !V) {
            n.push(
              this.createSyntheticErrorMessage(
                e.id,
                abortReason,
                e.assistantMessage,
                isInterruptedWhileRunning(e, se.message),
              ),
            );
            break;
          }
          if (
            se.message.type === "user" &&
            Array.isArray(se.message.message.content) &&
            se.message.message.content.some((nt) => nt.type === "tool_result" && nt.is_error === !0)
          )
            V = !0;
          if (se.message) {
            if (se.message.type === "progress") {
              if ((e.pendingProgress.push(se.message), se.message.data.type === "tool_heartbeat"))
                this.wakeWaiters();
              else if (this.progressAvailableResolve)
                (this.progressAvailableResolve(), (this.progressAvailableResolve = void 0));
            } else if ((n.push(se.message), se.toolDuration)) e.toolDuration = se.toolDuration;
          }
          if (se.contextLayers) r.push(...se.contextLayers.layers);
        }
        if (z) return;
        if (
          ((e.results = n),
          (e.contextLayers = r),
          (e.status = "completed"),
          this.wakeWaiters(),
          !e.isConcurrencySafe && r.length > 0)
        )
          ((this.toolUseContext = applyContextLayers(this.toolUseContext, r)), (this.appliedLayers = !0));
      })();
    ((e.promise = h),
      h.finally(() => {
        this.processQueue();
      }));
  }
  *getCompletedResults() {
    if (this.discarded) return;
    for (let tool of this.tools) {
      while (tool.pendingBridgeEvents.length > 0) yield tool.pendingBridgeEvents.shift();
      while (tool.pendingProgress.length > 0)
        yield { message: tool.pendingProgress.shift(), newContext: this.toolUseContext };
      if (tool.status === "yielded") continue;
      if (tool.status === "completed") {
        tool.status = "yielded";
        let toolDuration = tool.toolDuration;
        for (let r of tool.results)
          (yield { message: r, newContext: this.toolUseContext, toolDuration: toolDuration },
            (toolDuration = void 0));
        yield { type: "set_in_progress_tool_use_ids", op: { action: "remove", ids: [tool.id] } };
      } else if (tool.status === "executing" && !tool.isConcurrencySafe) break;
    }
  }
  hasPendingProgress() {
    return this.tools.some((tool) => tool.pendingProgress.length > 0 || tool.pendingBridgeEvents.length > 0);
  }
  async *getRemainingResults() {
    if (((this.responseOpen = !1), this.discarded)) return;
    while (this.hasUnfinishedTools()) {
      await this.processQueue();
      let e = !1;
      for (let n of this.getCompletedResults()) ((e = !0), yield n);
      if (this.hasExecutingTools() && !e && !this.hasPendingProgress()) {
        let mapped = this.tools
            .filter((tool) => tool.status === "executing" && tool.promise)
            .map((s) => s.promise),
          promise = new Promise((s) => {
            this.progressAvailableResolve = s;
          });
        if (mapped.length > 0) await Promise.race([...mapped, promise]);
      }
    }
    for (let e of this.getCompletedResults()) yield e;
    if ((this.applyEndedRunLayers(), this.appliedLayers)) yield { newContext: this.toolUseContext };
  }
  applyEndedRunLayers() {
    if (this.tools.some((tool) => tool.status === "executing")) return;
    for (let tool of this.tools)
      if (
        tool.isConcurrencySafe &&
        tool.layersApplied !== !0 &&
        tool.contextLayers !== void 0 &&
        tool.contextLayers.length > 0
      )
        ((this.toolUseContext = applyContextLayers(this.toolUseContext, tool.contextLayers)),
          (tool.layersApplied = !0),
          (this.appliedLayers = !0));
  }
  hasExecutingTools() {
    return this.tools.some((tool) => tool.status === "executing");
  }
  hasStartedToolCall() {
    return this.tools.some((tool) => tool.callStarted === !0);
  }
  hasUnfinishedTools() {
    return this.tools.some((tool) => tool.status !== "yielded");
  }
  getUpdatedContext() {
    return this.toolUseContext;
  }
}

export { StreamingToolExecutor, discardInFlightTools };
