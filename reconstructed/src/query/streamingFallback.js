/**
 * query/streamingFallback.ts
 *
 * 2.1.316 新增：创建流式查询状态（助手消息、工具结果、执行器）；在回退链中找下一个可用模型（支持替换）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ha3km179.js (4)
 * attribution: placement 4
 */
import { logError } from "../utils/log.js";
import { withTelemetryMessage, toError } from "../utils/errors.js";
import { discardInFlightTools } from "../services/tools/StreamingToolExecutor.js";

//@ chunk-ha3km179.js:140987-141375 placement
/**
 * 在回退链中找下一个可用模型（支持替换）。
 */
function nextFallbackModel({ chain, from, failedModel, reason, substituteFor }) {
  let index = from;
  let sawFailed = false;
  let anySubstituted = false;
  while (index < chain.length) {
    let chainModel = chain[index];
    let substitute = substituteFor(chainModel);
    let wasSubstituted = substitute !== undefined;
    anySubstituted ||= wasSubstituted;
    let candidate = wasSubstituted ? substitute : chainModel;
    if (candidate === failedModel) sawFailed = true;
    else if (candidate !== null)
      return {
        chainIndex: index,
        target: candidate,
        substituted: wasSubstituted,
        inPlace: false,
        anySubstituted,
      };
    index++;
  }
  let retryInPlace = sawFailed && (reason === "overloaded" || reason === "server_error");
  return {
    chainIndex: index,
    target: retryInPlace ? failedModel : null,
    substituted: false,
    inPlace: retryInPlace,
    anySubstituted,
  };
}
//@ chunk-ha3km179.js:141375-141728 placement
/**
 * 采用回退响应中的工具调用。
 */
function adoptFallbackResponse(attemptState, keptFirstResponse) {
  if (keptFirstResponse === undefined) return false;
  try {
    attemptState.needsFollowUp = true;
    for (let message of keptFirstResponse) {
      let filtered = message.message.content.filter((block) => block.type === "tool_use");
      attemptState.assistantMessages.push(message);
      attemptState.toolUseBlocks.push(...filtered);
      for (let block of filtered) attemptState.streamingToolExecutor.addTool(block, message);
    }
    return true;
  } catch (error) {
    logError(withTelemetryMessage(toError(error), "kept first response not taken"));
    attemptState.reset({
      clearAssistantMessages: true,
    });
    return false;
  }
}
//@ chunk-ha3km179.js:141728-141926 placement
/**
 * 生成移除进行中工具调用 id 的操作。
 */
function clearInProgressToolUses(keptFirstResponse) {
  return {
    type: "set_in_progress_tool_use_ids",
    op: {
      action: "remove",
      ids: keptFirstResponse.flatMap((message) =>
        Array.isArray(message.message.content)
          ? message.message.content.flatMap((block) => (block.type === "tool_use" ? [block.id] : []))
          : [],
      ),
    },
  };
}
//@ chunk-ha3km179.js:141926-142768 placement
/**
 * 创建流式查询状态（助手消息、工具结果、执行器）。
 */
function createStreamingState({ createStreamingToolExecutor, onReset }) {
  let state = {
    assistantMessages: [],
    toolResults: [],
    toolUseBlocks: [],
    toolDurations: [],
    needsFollowUp: false,
    toolRequestedEndTurn: false,
    shouldPreventContinuation: false,
    toolWasDeferred: false,
    streamingToolExecutor: createStreamingToolExecutor(),
    reset({ clearAssistantMessages }) {
      if (clearAssistantMessages) state.assistantMessages.length = 0;
      state.toolResults.length = 0;
      state.toolUseBlocks.length = 0;
      state.toolDurations.length = 0;
      state.needsFollowUp = false;
      state.toolRequestedEndTurn = false;
      state.shouldPreventContinuation = false;
      state.toolWasDeferred = false;
      onReset?.();
    },
    rebuildStreamingToolExecutor() {
      state.streamingToolExecutor = createStreamingToolExecutor();
    },
    *abandonAttempt(reason, details) {
      for (let message of state.assistantMessages)
        yield {
          type: "tombstone",
          message,
        };
      for (let message of state.toolResults)
        yield {
          type: "tombstone",
          message,
        };
      state.reset({
        clearAssistantMessages: true,
      });
      let { removes } = discardInFlightTools(state.streamingToolExecutor, reason, details);
      state.rebuildStreamingToolExecutor();
      if (removes) yield removes;
    },
  };
  return state;
}
export { createStreamingState, adoptFallbackResponse, clearInProgressToolUses, nextFallbackModel };
