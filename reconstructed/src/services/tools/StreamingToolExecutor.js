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
import { findTool } from "../api/deferredToolsState.js";
import {
  shouldWaitForMcpTool,
  explainUnavailableArtifactTool,
  resolveUnknownToolSafe,
  runToolUse,
  hasTypeField,
} from "./toolExecution.js";
import { currentMcpClients } from "../compact/idleToolResultClearing.js";
import {
  getToolPermissionContext,
  applyContextLayers,
} from "../../utils/permissions/toolPermissionContext.js";
import { getAgentSpawnContext } from "../../tools/AgentTool/agentToolUtils.js";
import { cachedDeclaredTools, cachedNoChannelTools } from "../api/declaredToolSet.js";
import {
  createUserMessage,
  TOOL_CALL_ENDED_FOR_DELIVERY,
  withMemoryCorrectionHint,
  CANCEL_MESSAGE,
  REJECT_MESSAGE_AFTER_RUN,
  REJECT_MESSAGE,
  USER_REJECTED_TOOL_USE,
} from "../../utils/messages.js";
import { getAbortKind, getSerializedPetalLimit, isCancelAbort } from "./toolAbort.js";
import { abortScopeOf } from "../../utils/abortReasons.js";
import { errorTelemetryFields } from "../../utils/accessibility/screenReader.js";
import { logError } from "../../utils/log.js";
import { getTaskRunState } from "../../utils/task/taskNotifications.js";
import { isTerminalShutdown } from "../../utils/terminalShutdown.js";
import { sanitizeToolNameForAnalytics } from "../analytics/metadata.js";

//@ chunk-ha3km179.js:58036-58692 placement
/**
 * 丢弃并中止进行中的工具调用，上报统计。
 */
function discardInFlightTools(streamingToolExecutor, n, r) {
  let s = streamingToolExecutor.discardAndAbortInFlight(serverFallbackTombstoneAbortReason());
  let earlierCounts = r?.earlierCounts ?? s;
  if (r?.silent)
    logEvent("tengu_convolute_arcades_tools", {
      aborted: earlierCounts.aborted,
      completed_before_event: earlierCounts.completedBeforeEvent,
      queued_never_started: earlierCounts.queuedNeverStarted,
      compensated_removes: s.toolUseIds.length,
    });
  else
    logEvent("tengu_fallback_sweep_tools", {
      lane: fromEnum(n),
      aborted: earlierCounts.aborted,
      completed_before_event: earlierCounts.completedBeforeEvent,
      queued_never_started: earlierCounts.queuedNeverStarted,
      compensated_removes: s.toolUseIds.length,
    });
  return {
    removes:
      s.toolUseIds.length === 0
        ? undefined
        : {
            type: "set_in_progress_tool_use_ids",
            op: {
              action: "remove",
              ids: s.toolUseIds,
            },
            reason: "fallback_sweep",
          },
    startedToolUseIds: s.startedToolUseIds,
  };
}
//@ chunk-ha3km179.js:58692-58815 layout
/**
 * 工具在中断时是否"正在运行"：callRunning 为真且结果未标记为其它拒绝类型。用于选择取消文案。
 */
function isInterruptedWhileRunning(tracked, message) {
  let toolDenialKind = message?.type === "user" ? message.toolDenialKind : undefined;
  return tracked.callRunning === true && (toolDenialKind === undefined || toolDenialKind === "interrupted");
}
//@ chunk-ha3km179.js:58815-58961 layout
/**
 * 判断 user 消息里是否已有指定 tool_use_id 的 tool_result，避免重复写合成错误。
 */
function messageHasToolResultFor(message, toolUseId) {
  return (
    message.type === "user" &&
    Array.isArray(message.message.content) &&
    message.message.content.some((r) => r.type === "tool_result" && r.tool_use_id === toolUseId)
  );
}
//@ chunk-ha3km179.js:58961-69131 fingerprint = StreamingToolExecutor (0.548)
/**
 * StreamingToolExecutor：流式回答期间边收 tool_use 边执行。addTool 时判定并发安全并排队；processQueue 保证"并发安全的可以同时跑，不安全的独占"；结果按收到顺序产出（getCompletedResults/getRemainingResults），进度消息随时产出；中断/流式回退时生成合成错误结果（interrupted、cancelled、Streaming fallback、Conversation ended）。未知工具直接生成 "No such tool available" 错误，并用 TOOL_CATALOG 给建议。
 */
class StreamingToolExecutor {
  toolDefinitions;
  canUseTool;
  now;
  tools = [];
  toolUseContext;
  discarded = false;
  responseOpen = true;
  progressAvailableResolve;
  drainableResolve;
  drainGeneration = 0;
  appliedLayers = false;
  constructor(toolDefinitions, canUseTool, toolUseContext, toolUseContext_2) {
    this.toolDefinitions = toolDefinitions;
    this.canUseTool = canUseTool;
    this.now = toolUseContext_2;
    this.toolUseContext = toolUseContext;
  }
  discard() {
    this.discarded = true;
    this.wakeWaiters();
  }
  discardAndAbortInFlight(e) {
    this.discard();
    let n = 0;
    let r = 0;
    let s = 0;
    let h = [];
    for (let tool of this.tools) {
      if (tool.status === "completed" || tool.status === "yielded") {
        r++;
        if (tool.status === "completed" && tool.callStarted === true) h.push(tool.id);
        continue;
      }
      if (tool.status === "queued") {
        s++;
        continue;
      }
      if (tool.status === "executing") {
        if (tool.callStarted === true) h.push(tool.id);
        if (tool.abortController && !tool.abortController.signal.aborted) {
          tool.abortController.abort(e);
          n++;
        }
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
      if (tool.status === "completed") {
        tool.status = "yielded";
        e.push(...tool.results);
      }
    return e;
  }
  addTool(block, assistantMessage) {
    let toolDefinition = findTool(this.toolDefinitions, block.name, this.toolUseContext.options.toolAliases);
    if (!toolDefinition && shouldWaitForMcpTool(block.name, this.toolUseContext)) {
      this.tools.push({
        id: block.id,
        block,
        assistantMessage,
        status: "queued",
        isConcurrencySafe: false,
        pendingProgress: [],
        pendingBridgeEvents: [],
        results: [],
      });
      this.processQueue();
      return;
    }
    if (!toolDefinition) {
      let y = explainUnavailableArtifactTool(
        block.name,
        this.toolDefinitions,
        this.toolUseContext.options.toolCatalog.getAllBaseTools(),
        this.toolUseContext.agentId,
        currentMcpClients(this.toolUseContext),
        getToolPermissionContext(this.toolUseContext),
        getAgentSpawnContext(this.toolUseContext),
        block.input,
        cachedDeclaredTools(this.toolUseContext),
        cachedNoChannelTools(this.toolUseContext),
      );
      resolveUnknownToolSafe(block.name, block.id, this.toolUseContext, assistantMessage.requestId);
      this.tools.push({
        id: block.id,
        block,
        assistantMessage,
        status: "completed",
        isConcurrencySafe: true,
        pendingProgress: [],
        pendingBridgeEvents: [],
        results: [
          createUserMessage({
            content: [
              {
                type: "tool_result",
                content: `<tool_use_error>Error: No such tool available: ${block.name}${y}</tool_use_error>`,
                is_error: true,
                tool_use_id: block.id,
              },
            ],
            toolUseResult: `Error: No such tool available: ${block.name}${y}`,
            sourceToolAssistantUUID: assistantMessage.uuid,
            now: this.now,
          }),
        ],
      });
      this.wakeWaiters();
      return;
    }
    let parsedInput = toolDefinition.inputSchema.safeParse(block.input);
    let isConcurrencySafe = parsedInput?.success
      ? (() => {
          try {
            return Boolean(toolDefinition.isConcurrencySafe(parsedInput.data));
          } catch {
            return false;
          }
        })()
      : false;
    this.tools.push({
      id: block.id,
      block,
      assistantMessage,
      status: "queued",
      isConcurrencySafe,
      pendingProgress: [],
      pendingBridgeEvents: [],
      results: [],
    });
    this.processQueue();
  }
  canExecuteTool(isConcurrencySafe) {
    let executingTools = this.tools.filter((t) => t.status === "executing");
    return (
      executingTools.length === 0 || (isConcurrencySafe && executingTools.every((t) => t.isConcurrencySafe))
    );
  }
  async processQueue() {
    for (let tool of this.tools) {
      if (tool.status !== "queued") continue;
      if (this.canExecuteTool(tool.isConcurrencySafe)) {
        this.applyEndedRunLayers();
        await this.executeTool(tool);
      } else if (!tool.isConcurrencySafe) break;
    }
  }
  createSyntheticErrorMessage(toolUseId, n, r, s) {
    if (n === "user_interrupted") {
      let h = unwrapAbortReason(this.toolUseContext.abortController.signal.reason);
      if (h === "turn-abort")
        return createUserMessage({
          content: [
            {
              type: "tool_result",
              content: TOOL_CALL_ENDED_FOR_DELIVERY,
              is_error: true,
              tool_use_id: toolUseId,
            },
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
              is_error: true,
              tool_use_id: toolUseId,
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
            is_error: true,
            tool_use_id: toolUseId,
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
            is_error: true,
            tool_use_id: toolUseId,
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
          is_error: true,
          tool_use_id: toolUseId,
        },
      ],
      toolUseResult: "Streaming fallback - tool execution discarded",
      sourceToolAssistantUUID: r.uuid,
      now: this.now,
    });
  }
  getAbortReason(e, ran, r = false) {
    if (this.discarded) return "streaming_fallback";
    return getAbortKind(
      this.toolUseContext.abortController.signal,
      {
        name: e.block.name,
        ran,
        ...false,
      },
      abortScopeOf(this.toolUseContext),
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
    this.drainGeneration++;
    if (this.progressAvailableResolve) {
      this.progressAvailableResolve();
      this.progressAvailableResolve = undefined;
    }
    if (this.drainableResolve) {
      this.drainableResolve();
      this.drainableResolve = undefined;
    }
  }
  hasWakeSince(e) {
    return this.drainGeneration > e;
  }
  waitForDrainable(e) {
    if (this.drainGeneration > e) return Promise.resolve(this.drainGeneration);
    return new Promise((resolve) => {
      this.drainableResolve = () => resolve(this.drainGeneration);
    });
  }
  buildSameTurnToolUses(e) {
    try {
      let n = new Map();
      for (let tool of this.tools) {
        if (tool === e) break;
        let s = n.get(tool.assistantMessage) ?? [];
        s.push(tool.block);
        n.set(tool.assistantMessage, s);
      }
      return [...n.entries()].map(([r, s]) => ({
        ...r,
        message: {
          ...r.message,
          content: s,
        },
      }));
    } catch (error) {
      logEvent("tengu_auto_mode_sibling_context_error", {
        ...errorTelemetryFields(error),
      });
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
              h.message.content.some((y) => y.type === "tool_result" && y.is_error === true),
          )
        )
          n.add(tool.id);
      }
      return n;
    } catch (error) {
      logError(error);
      logEvent("tengu_same_turn_errored_ids_error", {
        ...errorTelemetryFields(error),
      });
      return;
    }
  }
  async executeTool(tracked) {
    tracked.status = "executing";
    let n = [];
    let contextModifiers = [];
    let h = (async () => {
      let initialAbortReason = this.getAbortReason(tracked, false);
      if (initialAbortReason) {
        n.push(
          this.createSyntheticErrorMessage(tracked.id, initialAbortReason, tracked.assistantMessage, false),
        );
        tracked.results = n;
        tracked.contextLayers = contextModifiers;
        tracked.status = "completed";
        this.wakeWaiters();
        return;
      }
      let toolAbortController = createChildAbortController(this.toolUseContext.abortController);
      toolAbortController.signal.addEventListener(
        "abort",
        () => {
          if (!this.toolUseContext.abortController.signal.aborted && !this.discarded)
            this.toolUseContext.abortController.abort(toolAbortController.signal.reason);
        },
        {
          once: true,
        },
      );
      tracked.abortController = toolAbortController;
      let exclusiveCallQueuedBehind = getTaskRunState().exclusiveCallQueuedBehind;
      let R = {
        isQueued: () =>
          !this.discarded &&
          this.tools
            .slice(this.tools.indexOf(tracked) + 1)
            .some((tool) => tool.status === "queued" && !tool.isConcurrencySafe),
        mayYetBeQueued: () => !this.discarded && this.responseOpen,
        holdLogged: false,
      };
      exclusiveCallQueuedBehind.set(tracked.id, R);
      using T = {
        [Symbol.dispose]: () => {
          if (exclusiveCallQueuedBehind.get(tracked.id) === R) exclusiveCallQueuedBehind.delete(tracked.id);
        },
      };
      let signal = this.toolUseContext.abortController.signal;
      let P = false;
      let Q = () => {};
      let D = undefined;
      let L = undefined;
      let z = false;
      let G;
      let ee = runToolUse(
        tracked.block,
        tracked.assistantMessage,
        this.canUseTool,
        {
          ...this.toolUseContext,
          abortController: toolAbortController,
          markToolCallStarted: (se) => {
            if (se === tracked.id) tracked.callStarted = true;
          },
          markToolCallRunning: (se, callRunning = true) => {
            if (se === tracked.id) tracked.callRunning = callRunning;
          },
          lendToolExecEnd: (se, Te) => {
            if (se === tracked.id) G = Te;
          },
          toolCallAbandoned: (se) => se === tracked.id && z,
          ...false,
          sameTurnToolUses: this.buildSameTurnToolUses(tracked),
          sameTurnErroredToolUseIds: this.buildSameTurnErroredToolUseIds(tracked),
        },
        this.now,
      );
      let V = false;
      let fe = false;
      let ie;
      let Z = (graceMs) => {
        if (tracked.status !== "executing" || isTerminalShutdown()) return;
        z = true;
        try {
          if (!n.some((Te) => messageHasToolResultFor(Te, tracked.id)))
            n.push(
              this.createSyntheticErrorMessage(
                tracked.id,
                "user_interrupted",
                tracked.assistantMessage,
                isInterruptedWhileRunning(tracked),
              ),
            );
          G?.();
          logEvent("tengu_aborted_tool_call_abandoned", {
            toolName: sanitizeToolNameForAnalytics(tracked.block.name),
            abortKind: fromEnum(classifyAbortReasonForTelemetry(signal.reason)),
            graceMs,
          });
        } catch (error) {
          logError(error);
        }
        tracked.results = n;
        tracked.contextLayers = contextModifiers;
        tracked.status = "completed";
        this.wakeWaiters();
      };
      let re = () => {
        let serializedPetalLimit = getSerializedPetalLimit();
        if (serializedPetalLimit > 0 && isCancelAbort(signal))
          ie = setTimeout(Z, serializedPetalLimit, serializedPetalLimit);
      };
      if (D === undefined)
        signal.addEventListener("abort", re, {
          once: true,
        });
      using Re = {
        [Symbol.dispose]: () => {
          signal.removeEventListener("abort", re);
          clearTimeout(ie);
        },
      };
      for await (let se of ee) {
        if (z) break;
        if (hasTypeField(se)) {
          tracked.pendingBridgeEvents.push(se);
          this.wakeWaiters();
          continue;
        }
        let Te = se.message?.type !== "user" || se.message.toolDenialKind === undefined;
        fe ||= false;
        let U = this.getAbortReason(tracked, Te, fe);
        if (U && !V) {
          n.push(
            this.createSyntheticErrorMessage(
              tracked.id,
              U,
              tracked.assistantMessage,
              isInterruptedWhileRunning(tracked, se.message),
            ),
          );
          break;
        }
        if (
          se.message.type === "user" &&
          Array.isArray(se.message.message.content) &&
          se.message.message.content.some((nt) => nt.type === "tool_result" && nt.is_error === true)
        )
          V = true;
        if (se.message) {
          if (se.message.type === "progress") {
            tracked.pendingProgress.push(se.message);
            if (se.message.data.type === "tool_heartbeat") this.wakeWaiters();
            else if (this.progressAvailableResolve) {
              this.progressAvailableResolve();
              this.progressAvailableResolve = undefined;
            }
          } else {
            n.push(se.message);
            if (se.toolDuration) tracked.toolDuration = se.toolDuration;
          }
        }
        if (se.contextLayers) contextModifiers.push(...se.contextLayers.layers);
      }
      if (z) return;
      tracked.results = n;
      tracked.contextLayers = contextModifiers;
      tracked.status = "completed";
      this.wakeWaiters();
      if (!tracked.isConcurrencySafe && contextModifiers.length > 0) {
        this.toolUseContext = applyContextLayers(this.toolUseContext, contextModifiers);
        this.appliedLayers = true;
      }
    })();
    tracked.promise = h;
    h.finally(() => {
      this.processQueue();
    });
  }
  *getCompletedResults() {
    if (this.discarded) return;
    for (let tool of this.tools) {
      while (tool.pendingBridgeEvents.length > 0) yield tool.pendingBridgeEvents.shift();
      while (tool.pendingProgress.length > 0)
        yield {
          message: tool.pendingProgress.shift(),
          newContext: this.toolUseContext,
        };
      if (tool.status === "yielded") continue;
      if (tool.status === "completed") {
        tool.status = "yielded";
        let toolDuration = tool.toolDuration;
        for (let message of tool.results) {
          yield {
            message,
            newContext: this.toolUseContext,
            toolDuration,
          };
          toolDuration = undefined;
        }
        yield {
          type: "set_in_progress_tool_use_ids",
          op: {
            action: "remove",
            ids: [tool.id],
          },
        };
      } else if (tool.status === "executing" && !tool.isConcurrencySafe) break;
    }
  }
  hasPendingProgress() {
    return this.tools.some((t) => t.pendingProgress.length > 0 || t.pendingBridgeEvents.length > 0);
  }
  async *getRemainingResults() {
    this.responseOpen = false;
    if (this.discarded) return;
    while (this.hasUnfinishedTools()) {
      await this.processQueue();
      let e = false;
      for (let result of this.getCompletedResults()) {
        e = true;
        yield result;
      }
      if (this.hasExecutingTools() && !e && !this.hasPendingProgress()) {
        let executingPromises = this.tools
          .filter((t) => t.status === "executing" && t.promise)
          .map((t) => t.promise);
        let progressPromise = new Promise((resolve) => {
          this.progressAvailableResolve = resolve;
        });
        if (executingPromises.length > 0) await Promise.race([...executingPromises, progressPromise]);
      }
    }
    for (let result of this.getCompletedResults()) yield result;
    this.applyEndedRunLayers();
    if (this.appliedLayers)
      yield {
        newContext: this.toolUseContext,
      };
  }
  applyEndedRunLayers() {
    if (this.tools.some((t) => t.status === "executing")) return;
    for (let tool of this.tools)
      if (
        tool.isConcurrencySafe &&
        tool.layersApplied !== true &&
        tool.contextLayers !== undefined &&
        tool.contextLayers.length > 0
      ) {
        this.toolUseContext = applyContextLayers(this.toolUseContext, tool.contextLayers);
        tool.layersApplied = true;
        this.appliedLayers = true;
      }
  }
  hasExecutingTools() {
    return this.tools.some((t) => t.status === "executing");
  }
  hasStartedToolCall() {
    return this.tools.some((tool) => tool.callStarted === true);
  }
  hasUnfinishedTools() {
    return this.tools.some((t) => t.status !== "yielded");
  }
  getUpdatedContext() {
    return this.toolUseContext;
  }
}
export { StreamingToolExecutor, discardInFlightTools };
