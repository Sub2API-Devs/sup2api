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

/**
 * 在回退链中找下一个可用模型（支持替换）。
 */
//@ chunk-ha3km179.js:140987-141375 placement
function nextFallbackModel({
  chain: chain,
  from: from,
  failedModel: failedModel,
  reason: reason,
  substituteFor: substituteFor,
}) {
  let y = from,
    S = !1,
    M = !1;
  while (y < chain.length) {
    let T = chain[y],
      w = substituteFor(T),
      P = w !== void 0;
    M ||= P;
    let Q = P ? w : T;
    if (Q === failedModel) S = !0;
    else if (Q !== null) return { chainIndex: y, target: Q, substituted: P, inPlace: !1, anySubstituted: M };
    y++;
  }
  let R = S && (reason === "overloaded" || reason === "server_error");
  return { chainIndex: y, target: R ? failedModel : null, substituted: !1, inPlace: R, anySubstituted: M };
}
/**
 * 采用回退响应中的工具调用。
 */
//@ chunk-ha3km179.js:141375-141728 placement
function adoptFallbackResponse(e, n) {
  if (n === void 0) return !1;
  try {
    e.needsFollowUp = !0;
    for (let r of n) {
      let filtered = r.message.content.filter((h) => h.type === "tool_use");
      (e.assistantMessages.push(r), e.toolUseBlocks.push(...filtered));
      for (let h of filtered) e.streamingToolExecutor.addTool(h, r);
    }
    return !0;
  } catch (error) {
    return (
      logError(withTelemetryMessage(toError(error), "kept first response not taken")),
      e.reset({ clearAssistantMessages: !0 }),
      !1
    );
  }
}
/**
 * 生成移除进行中工具调用 id 的操作。
 */
//@ chunk-ha3km179.js:141728-141926 placement
function clearInProgressToolUses(e) {
  return {
    type: "set_in_progress_tool_use_ids",
    op: {
      action: "remove",
      ids: e.flatMap((n) =>
        Array.isArray(n.message.content)
          ? n.message.content.flatMap((r) => (r.type === "tool_use" ? [r.id] : []))
          : [],
      ),
    },
  };
}
/**
 * 创建流式查询状态（助手消息、工具结果、执行器）。
 */
//@ chunk-ha3km179.js:141926-142768 placement
function createStreamingState({
  createStreamingToolExecutor: createStreamingToolExecutor,
  onReset: onReset,
}) {
  let r = {
    assistantMessages: [],
    toolResults: [],
    toolUseBlocks: [],
    toolDurations: [],
    needsFollowUp: !1,
    toolRequestedEndTurn: !1,
    shouldPreventContinuation: !1,
    toolWasDeferred: !1,
    streamingToolExecutor: createStreamingToolExecutor(),
    reset({ clearAssistantMessages: s }) {
      if (s) r.assistantMessages.length = 0;
      ((r.toolResults.length = 0),
        (r.toolUseBlocks.length = 0),
        (r.toolDurations.length = 0),
        (r.needsFollowUp = !1),
        (r.toolRequestedEndTurn = !1),
        (r.shouldPreventContinuation = !1),
        (r.toolWasDeferred = !1),
        onReset?.());
    },
    rebuildStreamingToolExecutor() {
      r.streamingToolExecutor = createStreamingToolExecutor();
    },
    *abandonAttempt(s, h) {
      for (let assistantMessage of r.assistantMessages)
        yield { type: "tombstone", message: assistantMessage };
      for (let toolResult of r.toolResults) yield { type: "tombstone", message: toolResult };
      r.reset({ clearAssistantMessages: !0 });
      let { removes: removes } = discardInFlightTools(r.streamingToolExecutor, s, h);
      if ((r.rebuildStreamingToolExecutor(), removes)) yield removes;
    },
  };
  return r;
}

export { createStreamingState, adoptFallbackResponse, clearInProgressToolUses, nextFallbackModel };
