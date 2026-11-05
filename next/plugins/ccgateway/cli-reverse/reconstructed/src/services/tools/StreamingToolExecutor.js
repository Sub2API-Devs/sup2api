/**
 * services/tools/StreamingToolExecutor.ts
 *
 * 流式工具执行器：回答流式到达时边收 tool_use 边执行，并发安全的并行、不安全的独占，按收到顺序产出结果与进度，中断/流式回退时生成合成错误结果
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/tools/StreamingToolExecutor.ts
 * pieces: chunk-w3ch4xq2.js (8)
 * attribution: placement 1, layout 6, fingerprint 1
 */
import {
  serverFallbackTombstoneAbortReason,
  unwrapAbortReason,
  shutdownInterruptStamp,
  createAbortController,
  createChildAbortController,
  classifyAbortReasonForTelemetry,
} from "../../utils/abortController.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { codeModeAccepted } from "../../utils/codeMode/accepted.js";
import { STOP_INSTRUCTION } from "./streamingStopNotice.js";
import { findTool } from "../api/deferredToolsState.js";
import {
  shouldWaitForMcpTool,
  describeUnknownTool,
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
import {
  getAbortKind,
  isStoppedResultWait,
  getFileUnchangedMessage,
  isStoppedReplTool,
  getSerializedPetalLimit,
  isCancelAbort,
} from "./toolAbort.js";
import { abortScopeOf } from "../../utils/abortReasons.js";
import { errorTelemetryFields } from "../../utils/accessibility/screenReader.js";
import { logError } from "../../utils/log.js";
import { getTaskRunState } from "../../utils/task/taskNotifications.js";
import { isTerminalShutdown } from "../../utils/terminalShutdown.js";
import { sanitizeToolNameForAnalytics } from "../analytics/metadata.js";

//@ chunk-w3ch4xq2.js:62615-63271 placement
/**
 * 丢弃并中止进行中的工具调用，上报统计。
 */
function discardInFlightTools(streamingToolExecutor, lane, options) {
  let discardResult = streamingToolExecutor.discardAndAbortInFlight(serverFallbackTombstoneAbortReason());
  let earlierCounts = options?.earlierCounts ?? discardResult;
  if (options?.silent)
    logEvent("tengu_convolute_arcades_tools", {
      aborted: earlierCounts.aborted,
      completed_before_event: earlierCounts.completedBeforeEvent,
      queued_never_started: earlierCounts.queuedNeverStarted,
      compensated_removes: discardResult.toolUseIds.length,
    });
  else
    logEvent("tengu_fallback_sweep_tools", {
      lane: fromEnum(lane),
      aborted: earlierCounts.aborted,
      completed_before_event: earlierCounts.completedBeforeEvent,
      queued_never_started: earlierCounts.queuedNeverStarted,
      compensated_removes: discardResult.toolUseIds.length,
    });
  return {
    removes:
      discardResult.toolUseIds.length === 0
        ? undefined
        : {
            type: "set_in_progress_tool_use_ids",
            op: {
              action: "remove",
              ids: discardResult.toolUseIds,
            },
            reason: "fallback_sweep",
          },
    startedToolUseIds: discardResult.startedToolUseIds,
  };
}
//@ chunk-w3ch4xq2.js:63271-63381 layout
function countsAsStoppedWait(tool, message, abortReason) {
  let stopWait = tool.stopWait;
  return (
    abortReason === "user_interrupted" &&
    stopWait !== undefined &&
    (stopWait.kept || message?.type === "progress")
  );
}
//@ chunk-w3ch4xq2.js:63381-63504 layout
/**
 * 工具在中断时是否"正在运行"：callRunning 为真且结果未标记为其它拒绝类型。用于选择取消文案。
 */
function isInterruptedWhileRunning(tracked, message) {
  let toolDenialKind = message?.type === "user" ? message.toolDenialKind : undefined;
  return tracked.callRunning === true && (toolDenialKind === undefined || toolDenialKind === "interrupted");
}
//@ chunk-w3ch4xq2.js:63504-63675 layout
function markUserRejected(kept, toolUseId) {
  if (kept.type !== "user" || kept.toolDenialKind !== undefined) return kept;
  return {
    ...kept,
    toolDenialKind: "user-rejected",
    message: {
      ...kept.message,
      content: appendStoppedText(kept.message.content, toolUseId),
    },
  };
}
//@ chunk-w3ch4xq2.js:63675-63742 layout
function stoppedResultText() {
  return codeModeAccepted() ? `The user stopped this call. ${STOP_INSTRUCTION}` : STOP_INSTRUCTION;
}
//@ chunk-w3ch4xq2.js:63742-64015 layout
function appendStoppedText(content, toolUseId) {
  if (typeof content === "string") return content;
  return content.map((block) => {
    if (block.type !== "tool_result" || block.tool_use_id !== toolUseId) return block;
    let parts =
      typeof block.content === "string"
        ? block.content === ""
          ? []
          : [
              {
                type: "text",
                text: block.content,
              },
            ]
        : (block.content ?? []);
    return {
      ...block,
      content: [
        ...parts,
        {
          type: "text",
          text: stoppedResultText(),
        },
      ],
    };
  });
}
//@ chunk-w3ch4xq2.js:64015-64161 layout
/**
 * 判断 user 消息里是否已有指定 tool_use_id 的 tool_result，避免重复写合成错误。
 */
function messageHasToolResultFor(message, toolUseId) {
  return (
    message.type === "user" &&
    Array.isArray(message.message.content) &&
    message.message.content.some((block) => block.type === "tool_result" && block.tool_use_id === toolUseId)
  );
}
//@ chunk-w3ch4xq2.js:64161-76217 fingerprint (2.1.88 match: StreamingToolExecutor, 0.507)
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
  constructor(toolDefinitions, canUseTool, toolUseContext, now) {
    this.toolDefinitions = toolDefinitions;
    this.canUseTool = canUseTool;
    this.now = now;
    this.toolUseContext = toolUseContext;
  }
  discard() {
    this.discarded = true;
    this.wakeWaiters();
  }
  discardAndAbortInFlight(reason) {
    this.discard();
    let abortedCount = 0;
    let completedCount = 0;
    let queuedCount = 0;
    let startedIds = [];
    for (let tool of this.tools) {
      if (tool.status === "completed" || tool.status === "yielded") {
        completedCount++;
        if (tool.status === "completed" && tool.callStarted === true) startedIds.push(tool.id);
        continue;
      }
      if (tool.status === "queued") {
        queuedCount++;
        continue;
      }
      if (tool.status === "executing") {
        if (tool.callStarted === true) startedIds.push(tool.id);
        if (tool.abortController && !tool.abortController.signal.aborted) {
          tool.abortController.abort(reason);
          abortedCount++;
        }
      }
    }
    return {
      aborted: abortedCount,
      completedBeforeEvent: completedCount,
      queuedNeverStarted: queuedCount,
      toolUseIds: this.tools.map((tool) => tool.id),
      startedToolUseIds: startedIds,
    };
  }
  takeFinishedResults() {
    if (this.discarded) return [];
    let finished = [];
    for (let tool of this.tools)
      if (tool.status === "completed") {
        tool.status = "yielded";
        finished.push(...tool.results);
      }
    return finished;
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
      let unavailableNote = describeUnknownTool(
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
                content: `<tool_use_error>Error: No such tool available: ${block.name}${unavailableNote}</tool_use_error>`,
                is_error: true,
                tool_use_id: block.id,
              },
            ],
            toolUseResult: `Error: No such tool available: ${block.name}${unavailableNote}`,
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
  createSyntheticErrorMessage(toolUseId, reason, assistantMessage, canRetry) {
    if (reason === "user_interrupted") {
      let abortKind = unwrapAbortReason(this.toolUseContext.abortController.signal.reason);
      if (abortKind === "turn-abort")
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
          sourceToolAssistantUUID: assistantMessage.uuid,
          now: this.now,
        });
      if (abortKind === "background")
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
          sourceToolAssistantUUID: assistantMessage.uuid,
          now: this.now,
        });
      return createUserMessage({
        content: [
          {
            type: "tool_result",
            content: withMemoryCorrectionHint(
              canRetry && abortKind === "remote-cancel" ? REJECT_MESSAGE_AFTER_RUN : REJECT_MESSAGE,
            ),
            is_error: true,
            tool_use_id: toolUseId,
          },
        ],
        toolUseResult: USER_REJECTED_TOOL_USE,
        toolDenialKind: "user-rejected",
        interruptedByShutdown: shutdownInterruptStamp(this.toolUseContext.abortController.signal),
        sourceToolAssistantUUID: assistantMessage.uuid,
        now: this.now,
      });
    }
    if (reason === "conversation_ended")
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
        sourceToolAssistantUUID: assistantMessage.uuid,
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
      sourceToolAssistantUUID: assistantMessage.uuid,
      now: this.now,
    });
  }
  getAbortReason(tracked, ran, didRun = false) {
    if (this.discarded) return "streaming_fallback";
    return getAbortKind(
      this.toolUseContext.abortController.signal,
      {
        name: tracked.block.name,
        ran,
        ...(codeModeAccepted() && {
          asyncReplReceipt: didRun,
        }),
      },
      abortScopeOf(this.toolUseContext),
    );
  }
  armStoppedResultWait(toolDefinitions, canUseTool) {
    if (codeModeAccepted()) {
      if (
        toolDefinitions.status !== "executing" ||
        toolDefinitions.stopWait !== undefined ||
        !isStoppedResultWait(this.toolUseContext.abortController.signal, toolDefinitions.block.name)
      )
        return;
      let stoppedWait = {
        kept: false,
        taken: false,
        withdrawn: false,
        timedOut: false,
        hookController: createAbortController(),
      };
      stoppedWait.timer = setTimeout(
        (timer, tool, wait, args) => {
          if (timer.status !== "executing") return;
          tool.timedOut = true;
          tool.commit = undefined;
          tool.hookController.abort(args);
          wait();
        },
        getFileUnchangedMessage(),
        toolDefinitions,
        stoppedWait,
        canUseTool,
        this.toolUseContext.abortController.signal.reason,
      );
      toolDefinitions.stopWait = stoppedWait;
    }
  }
  takeKeptResult(tracked, kept) {
    if (codeModeAccepted()) {
      let stopWait = tracked.stopWait;
      if (stopWait === undefined || !messageHasToolResultFor(kept, tracked.id)) return kept;
      clearTimeout(stopWait.timer);
      stopWait.taken = true;
      let commit = stopWait.commit;
      stopWait.commit = undefined;
      commit?.();
      return markUserRejected(kept, tracked.id);
    }
    return kept;
  }
  stoppedResultWaitOf(tracked) {
    if (codeModeAccepted()) {
      let stopWait = tracked.stopWait;
      if (stopWait === undefined) return;
      return {
        hookController: stopWait.hookController,
        get kept() {
          return stopWait.kept;
        },
        keep: (commit) => {
          if (stopWait.timedOut || stopWait.withdrawn || stopWait.taken) return false;
          stopWait.kept = true;
          stopWait.commit = commit;
          return true;
        },
        withdraw: () => {
          if (!stopWait.taken) {
            stopWait.withdrawn = true;
            stopWait.kept = false;
            stopWait.commit = undefined;
          }
        },
      };
    }
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
  hasWakeSince(generation) {
    return this.drainGeneration > generation;
  }
  waitForDrainable(generation) {
    if (this.drainGeneration > generation) return Promise.resolve(this.drainGeneration);
    return new Promise((resolve) => {
      this.drainableResolve = () => resolve(this.drainGeneration);
    });
  }
  buildSameTurnToolUses(tracked) {
    try {
      let byMessage = new Map();
      for (let tool of this.tools) {
        if (tool === tracked) break;
        let blocks = byMessage.get(tool.assistantMessage) ?? [];
        blocks.push(tool.block);
        byMessage.set(tool.assistantMessage, blocks);
      }
      return [...byMessage.entries()].map(([message, blocksArr]) => ({
        ...message,
        message: {
          ...message.message,
          content: blocksArr,
        },
      }));
    } catch (error) {
      logEvent("tengu_auto_mode_sibling_context_error", {
        ...errorTelemetryFields(error),
      });
      return;
    }
  }
  buildSameTurnErroredToolUseIds(tracked) {
    try {
      let errored = new Set();
      for (let tool of this.tools) {
        if (tool === tracked) break;
        if (
          tool.results.some(
            (result) =>
              result.type === "user" &&
              Array.isArray(result.message.content) &&
              result.message.content.some((block) => block.type === "tool_result" && block.is_error === true),
          )
        )
          errored.add(tool.id);
      }
      return errored;
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
    let results = [];
    let yieldedResults = [];
    let runPromise = (async () => {
      let initialAbortReason = this.getAbortReason(tracked, false);
      if (initialAbortReason) {
        results.push(
          this.createSyntheticErrorMessage(tracked.id, initialAbortReason, tracked.assistantMessage, false),
        );
        tracked.results = results;
        tracked.contextLayers = yieldedResults;
        tracked.status = "completed";
        this.wakeWaiters();
        return;
      }
      let childAbortController = createChildAbortController(this.toolUseContext.abortController);
      childAbortController.signal.addEventListener(
        "abort",
        () => {
          if (!this.toolUseContext.abortController.signal.aborted && !this.discarded)
            this.toolUseContext.abortController.abort(childAbortController.signal.reason);
        },
        {
          once: true,
        },
      );
      tracked.abortController = childAbortController;
      let exclusiveCallQueuedBehind = getTaskRunState().exclusiveCallQueuedBehind;
      let exclusiveState = {
        isQueued: () =>
          !this.discarded &&
          this.tools
            .slice(this.tools.indexOf(tracked) + 1)
            .some((tool) => tool.status === "queued" && !tool.isConcurrencySafe),
        mayYetBeQueued: () => !this.discarded && this.responseOpen,
        holdLogged: false,
      };
      exclusiveCallQueuedBehind.set(tracked.id, exclusiveState);
      using dispose = {
        [Symbol.dispose]: () => {
          if (exclusiveCallQueuedBehind.get(tracked.id) === exclusiveState)
            exclusiveCallQueuedBehind.delete(tracked.id);
        },
      };
      let signal = this.toolUseContext.abortController.signal;
      let stopAfterCall = false;
      let noop = () => {
        if (codeModeAccepted() && stopAfterCall) {
          stopAfterCall = false;
          this.toolUseContext.onStopWaitChange?.(-1);
        }
      };
      let stopHookError =
        codeModeAccepted() && isStoppedReplTool(tracked.block.name)
          ? () => {
              let onStopped = () => {
                results.push(
                  this.createSyntheticErrorMessage(
                    tracked.id,
                    "user_interrupted",
                    tracked.assistantMessage,
                    isInterruptedWhileRunning(tracked),
                  ),
                );
                tracked.results = results;
                tracked.contextLayers = yieldedResults;
                tracked.status = "completed";
                this.wakeWaiters();
              };
              this.armStoppedResultWait(tracked, onStopped);
              if (tracked.stopWait === undefined) noop();
            }
          : undefined;
      if (codeModeAccepted() && stopHookError !== undefined) {
        signal.addEventListener("abort", stopHookError, {
          once: true,
        });
        stopAfterCall = true;
        this.toolUseContext.onStopWaitChange?.(1);
      }
      using progressError = codeModeAccepted()
        ? {
            [Symbol.dispose]: () => {
              if (stopHookError !== undefined) signal.removeEventListener("abort", stopHookError);
              noop();
              clearTimeout(tracked.stopWait?.timer);
            },
          }
        : undefined;
      let abandoned = false;
      let progress;
      let execution = runToolUse(
        tracked.block,
        tracked.assistantMessage,
        this.canUseTool,
        {
          ...this.toolUseContext,
          abortController: childAbortController,
          markToolCallStarted: (callId) => {
            if (callId === tracked.id) tracked.callStarted = true;
          },
          markToolCallRunning: (callId, callRunning = true) => {
            if (callId === tracked.id) tracked.callRunning = callRunning;
          },
          lendToolExecEnd: (callId, endFn) => {
            if (callId === tracked.id) progress = endFn;
          },
          toolCallAbandoned: (callId) => callId === tracked.id && abandoned,
          ...(codeModeAccepted() &&
            stopHookError !== undefined && {
              stoppedResultWait: (toolUseId) =>
                toolUseId === tracked.id ? this.stoppedResultWaitOf(tracked) : undefined,
            }),
          sameTurnToolUses: this.buildSameTurnToolUses(tracked),
          sameTurnErroredToolUseIds: this.buildSameTurnErroredToolUseIds(tracked),
        },
        this.now,
      );
      let sawResult = false;
      let interruptedDuringRun = false;
      let yieldCount;
      let afterGrace = (graceMs) => {
        if (tracked.status !== "executing" || isTerminalShutdown()) return;
        abandoned = true;
        try {
          if (!results.some((msg) => messageHasToolResultFor(msg, tracked.id)))
            results.push(
              this.createSyntheticErrorMessage(
                tracked.id,
                "user_interrupted",
                tracked.assistantMessage,
                isInterruptedWhileRunning(tracked),
              ),
            );
          progress?.();
          logEvent("tengu_aborted_tool_call_abandoned", {
            toolName: sanitizeToolNameForAnalytics(tracked.block.name),
            abortKind: fromEnum(classifyAbortReasonForTelemetry(signal.reason)),
            graceMs,
          });
        } catch (error) {
          logError(error);
        }
        tracked.results = results;
        tracked.contextLayers = yieldedResults;
        tracked.status = "completed";
        this.wakeWaiters();
      };
      let armAbortGrace = () => {
        let serializedPetalLimit = getSerializedPetalLimit();
        if (serializedPetalLimit > 0 && isCancelAbort(signal))
          yieldCount = setTimeout(afterGrace, serializedPetalLimit, serializedPetalLimit);
      };
      if (stopHookError === undefined)
        signal.addEventListener("abort", armAbortGrace, {
          once: true,
        });
      using disposeAbortGrace = {
        [Symbol.dispose]: () => {
          signal.removeEventListener("abort", armAbortGrace);
          clearTimeout(yieldCount);
        },
      };
      for await (let result of execution) {
        if (abandoned) break;
        if (codeModeAccepted() && tracked.stopWait?.timedOut) break;
        if (
          codeModeAccepted() &&
          tracked.stopWait?.kept === true &&
          !tracked.stopWait.taken &&
          isTerminalShutdown()
        ) {
          tracked.stopWait.kept = false;
          tracked.stopWait.commit = undefined;
        }
        if (hasTypeField(result)) {
          tracked.pendingBridgeEvents.push(result);
          this.wakeWaiters();
          continue;
        }
        let isResultRun = result.message?.type !== "user" || result.message.toolDenialKind === undefined;
        interruptedDuringRun ||=
          codeModeAccepted() &&
          result.message?.type === "user" &&
          require("../../utils/codeMode/asyncReplReceipt.js").isAsyncReplReceipt(
            result.message.toolUseResult,
          );
        let abortReason = this.getAbortReason(tracked, isResultRun, interruptedDuringRun);
        if (
          abortReason &&
          !sawResult &&
          !(codeModeAccepted() && countsAsStoppedWait(tracked, result.message, abortReason))
        ) {
          if (codeModeAccepted()) clearTimeout(tracked.stopWait?.timer);
          results.push(
            this.createSyntheticErrorMessage(
              tracked.id,
              abortReason,
              tracked.assistantMessage,
              isInterruptedWhileRunning(tracked, result.message),
            ),
          );
          break;
        }
        if (
          result.message.type === "user" &&
          Array.isArray(result.message.message.content) &&
          result.message.message.content.some(
            (block) => block.type === "tool_result" && block.is_error === true,
          )
        )
          sawResult = true;
        if (result.message) {
          if (result.message.type === "progress") {
            tracked.pendingProgress.push(result.message);
            if (result.message.data.type === "tool_heartbeat") this.wakeWaiters();
            else if (this.progressAvailableResolve) {
              this.progressAvailableResolve();
              this.progressAvailableResolve = undefined;
            }
          } else {
            results.push(
              codeModeAccepted() && tracked.stopWait?.kept
                ? this.takeKeptResult(tracked, result.message)
                : result.message,
            );
            if (result.toolDuration) tracked.toolDuration = result.toolDuration;
          }
        }
        if (result.contextLayers) yieldedResults.push(...result.contextLayers.layers);
      }
      if (codeModeAccepted() && tracked.stopWait?.timedOut) return;
      if (abandoned) return;
      tracked.results = results;
      tracked.contextLayers = yieldedResults;
      tracked.status = "completed";
      this.wakeWaiters();
      if (!tracked.isConcurrencySafe && yieldedResults.length > 0) {
        this.toolUseContext = applyContextLayers(this.toolUseContext, yieldedResults);
        this.appliedLayers = true;
      }
    })();
    tracked.promise = runPromise;
    runPromise.finally(() => {
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
    return this.tools.some((tool) => tool.pendingProgress.length > 0 || tool.pendingBridgeEvents.length > 0);
  }
  async *getRemainingResults() {
    this.responseOpen = false;
    if (this.discarded) return;
    while (this.hasUnfinishedTools()) {
      await this.processQueue();
      let didYield = false;
      for (let result of this.getCompletedResults()) {
        didYield = true;
        yield result;
      }
      if (this.hasExecutingTools() && !didYield && !this.hasPendingProgress()) {
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
