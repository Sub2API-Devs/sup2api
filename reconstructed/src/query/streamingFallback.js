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
  let y = from;
  let S = false;
  let anySubstituted = false;
  while (y < chain.length) {
    let T = chain[y];
    let w = substituteFor(T);
    let P = w !== undefined;
    anySubstituted ||= P;
    let Q = P ? w : T;
    if (Q === failedModel) S = true;
    else if (Q !== null)
      return {
        chainIndex: y,
        target: Q,
        substituted: P,
        inPlace: false,
        anySubstituted,
      };
    y++;
  }
  let R = S && (reason === "overloaded" || reason === "server_error");
  return {
    chainIndex: y,
    target: R ? failedModel : null,
    substituted: false,
    inPlace: R,
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
    for (let r of keptFirstResponse) {
      let filtered = r.message.content.filter((h) => h.type === "tool_use");
      attemptState.assistantMessages.push(r);
      attemptState.toolUseBlocks.push(...filtered);
      for (let h of filtered) attemptState.streamingToolExecutor.addTool(h, r);
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
      ids: keptFirstResponse.flatMap((n) =>
        Array.isArray(n.message.content)
          ? n.message.content.flatMap((r) => (r.type === "tool_use" ? [r.id] : []))
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
  let r = {
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
      if (clearAssistantMessages) r.assistantMessages.length = 0;
      r.toolResults.length = 0;
      r.toolUseBlocks.length = 0;
      r.toolDurations.length = 0;
      r.needsFollowUp = false;
      r.toolRequestedEndTurn = false;
      r.shouldPreventContinuation = false;
      r.toolWasDeferred = false;
      onReset?.();
    },
    rebuildStreamingToolExecutor() {
      r.streamingToolExecutor = createStreamingToolExecutor();
    },
    *abandonAttempt(s, h) {
      for (let message of r.assistantMessages)
        yield {
          type: "tombstone",
          message,
        };
      for (let message of r.toolResults)
        yield {
          type: "tombstone",
          message,
        };
      r.reset({
        clearAssistantMessages: true,
      });
      let { removes } = discardInFlightTools(r.streamingToolExecutor, s, h);
      r.rebuildStreamingToolExecutor();
      if (removes) yield removes;
    },
  };
  return r;
}
export { createStreamingState, adoptFallbackResponse, clearInProgressToolUses, nextFallbackModel };
