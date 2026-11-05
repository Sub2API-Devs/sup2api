/**
 * utils/tokens.ts
 *
 * 从消息的 API usage 读取 token：最近一次响应的上下文 token、带估算的 token 计数、累计被压缩丢弃的 token、状态栏上下文窗口信息等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/tokens.ts
 * pieces: chunk-5xgkngpb.js (16)
 * attribution: placement 3, fingerprint 3, layout 6, file-local 2, callgraph-witnessed 1, callgraph-fingerprint 1
 */
import { SYNTHETIC_MESSAGES, SYNTHETIC_MODEL, signatureTokenEstimate } from "./messages.js";
import { totalTokensOf, getTokenCountFromUsage_2 } from "./messages/usageAndStopReason.js";
import { isCompactBoundaryMessage as isCompactBoundaryMessage_3 } from "../services/projects/threadRows.js";
import { jsonStringify } from "./slowOperations.js";
import { calculateContextPercentages } from "./context.js";

//@ chunk-5xgkngpb.js:1542893-1543102 placement (2.1.88 match: getTokenUsage, 0.834)
/**
 * 返回 assistant 消息的 usage；排除合成占位文本、合成模型消息与 isUnmetered 消息。
 */
function getTokenUsage(message) {
  if (
    message?.type === "assistant" &&
    "usage" in message.message &&
    !(
      message.message.content[0]?.type === "text" && SYNTHETIC_MESSAGES.has(message.message.content[0].text)
    ) &&
    message.message.model !== SYNTHETIC_MODEL &&
    message.isUnmetered !== true
  )
    return message.message.usage;
  return;
}
//@ chunk-5xgkngpb.js:1543102-1543209 placement
/**
 * 返回 assistant 消息的 API message id（排除合成模型）。
 */
function getAssistantMessageApiId(message) {
  if (message?.type === "assistant" && "id" in message.message && message.message.model !== SYNTHETIC_MODEL)
    return message.message.id;
  return;
}
//@ chunk-5xgkngpb.js:1543209-1543329 fingerprint (2.1.88 match: getTokenCountFromUsage, 1)
/**
 * input + cache_creation + cache_read + output。
 */
function getTokenCountFromUsage(usage) {
  return (
    usage.input_tokens +
    (usage.cache_creation_input_tokens ?? 0) +
    (usage.cache_read_input_tokens ?? 0) +
    usage.output_tokens
  );
}
//@ chunk-5xgkngpb.js:1543329-1543379 layout
/**
 * 单条消息 usage 对应的上下文 token（最后一次迭代的输入+输出）。
 */
function getMessageContextTokens(message) {
  let tokenUsage = getTokenUsage(message);
  return tokenUsage ? totalTokensOf(tokenUsage) : undefined;
}
//@ chunk-5xgkngpb.js:1543379-1543473 file-local
/**
 * 从后往前找最近一条有 usage 的消息，返回其上下文 token；没有返回 0。
 */
function tokenCountFromLastAPIResponse(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    let messageContextTokens = getMessageContextTokens(messages[i]);
    if (messageContextTokens !== undefined) return messageContextTokens;
  }
  return 0;
}
//@ chunk-5xgkngpb.js:1543473-1543503 layout
/**
 * tokenCountWithEstimation 的转发（通知栏等 UI 用）。
 */
function getContextTokenCount(messages) {
  return tokenCountWithEstimation(messages);
}
//@ chunk-5xgkngpb.js:1543503-1543620 file-local
/**
 * 最近一次 API 响应的上下文 token；遇到 compact_boundary 停止（压缩后尚无响应时为 0）。
 */
function tokenCountWithEstimation(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    let message = messages[i];
    let usage = getMessageContextTokens(message);
    if (usage !== undefined) return usage;
    if (isCompactBoundaryMessage_3(message)) return 0;
  }
  return 0;
}
//@ chunk-5xgkngpb.js:1543620-1543820 fingerprint (2.1.88 match: finalContextTokensFromLastResponse, 1)
/**
 * 最近一条有 usage 的消息的 input+output（优先 iterations 最后一项），用于 taskBudget 扣减。
 */
function finalContextTokensFromLastResponse(messages) {
  let i = messages.length - 1;
  while (i >= 0) {
    let message = messages[i];
    let usage = message ? getTokenUsage(message) : undefined;
    if (usage) {
      let last = usage.iterations?.at(-1);
      if (last) return last.input_tokens + last.output_tokens;
      return usage.input_tokens + usage.output_tokens;
    }
    i--;
  }
  return 0;
}
//@ chunk-5xgkngpb.js:1543820-1543926 layout
/**
 * 最近一次 usage 规整为最后迭代值。
 */
function getLastApiUsage(messages) {
  for (let idx = messages.length - 1; idx >= 0; idx--) {
    let message = messages[idx];
    let usage = message ? getTokenUsage(message) : undefined;
    if (usage) return getTokenCountFromUsage_2(usage);
  }
  return null;
}
//@ chunk-5xgkngpb.js:1543926-1544214 layout (2.1.88 match: getTokenCountFromUsage, 0.758)
/**
 * 从某下标起按 message id 去重累计 assistant 的 input+cache_creation+output；缺 usage 的回调通知。
 */
function sumAssistantTokensSince(messages, start, end, onUsageMissing) {
  let total = 0;
  for (let index = end; index < messages.length; index++) {
    let message = messages[index];
    let tokenUsage = getTokenUsage(message);
    if (!tokenUsage) {
      if (
        onUsageMissing &&
        message.type === "assistant" &&
        message.message.usage == null &&
        getAssistantMessageApiId(message) !== undefined
      )
        onUsageMissing(index);
      continue;
    }
    let assistantMessageApiId = getAssistantMessageApiId(message);
    if (!assistantMessageApiId || start.has(assistantMessageApiId)) continue;
    start.add(assistantMessageApiId);
    total +=
      tokenUsage.input_tokens + (tokenUsage.cache_creation_input_tokens ?? 0) + tokenUsage.output_tokens;
  }
  return total;
}
//@ chunk-5xgkngpb.js:1544214-1544405 layout
/**
 * 所有 compact_boundary 中最大的累计丢弃 token。
 */
function getMaxCumulativeDroppedTokens(messages) {
  let total = 0;
  for (let message of messages)
    if (message && isCompactBoundaryMessage_3(message) && message.compactMetadata) {
      let { cumulativeDroppedTokens, preTokens, postTokens } = message.compactMetadata;
      let currentMessage = cumulativeDroppedTokens ?? Math.max(0, preTokens - (postTokens ?? 0));
      if (currentMessage > total) total = currentMessage;
    }
  return total;
}
//@ chunk-5xgkngpb.js:1544405-1544545 layout
/**
 * 在新边界上记录累计丢弃 token = 之前最大值 + 本次(pre−post)。
 */
function setCumulativeDroppedTokens(messages, value) {
  let maxCumulativeDroppedTokens = getMaxCumulativeDroppedTokens(value);
  let { preTokens, postTokens } = messages.compactMetadata;
  messages.compactMetadata.cumulativeDroppedTokens =
    maxCumulativeDroppedTokens + Math.max(0, preTokens - (postTokens ?? 0));
}
//@ chunk-5xgkngpb.js:1544545-1544657 callgraph-witnessed (2.1.88 match: doesMostRecentAssistantMessageExceed200k, 1)
/**
 * 最近一条 assistant 的上下文是否超过 200k（plan 模式选模型用）。
 */
function doesMostRecentAssistantMessageExceed200k(messages) {
  let lastAsst = messages.findLast((m) => m.type === "assistant");
  if (!lastAsst) return false;
  let usage = getTokenUsage(lastAsst);
  return usage ? totalTokensOf(usage) > 200000 : false;
}
//@ chunk-5xgkngpb.js:1544657-1544927 placement (2.1.88 match: hasThinkingContent, 0.875)
/**
 * assistant 内容长度估算（文本、thinking 签名、redacted、tool_use 输入）。
 */
function hasThinkingContent(m) {
  let chars = 0;
  for (let block of m.message.content)
    if (block.type === "text") chars += block.text?.length ?? 0;
    else if (block.type === "thinking") chars += signatureTokenEstimate(block.signature?.length ?? 0);
    else if (block.type === "redacted_thinking") chars += block.data?.length ?? 0;
    else if (block.type === "tool_use") chars += jsonStringify(block.input).length;
  return chars;
}
//@ chunk-5xgkngpb.js:3781325-3781594 callgraph-fingerprint (2.1.88 match: getCurrentUsage, 0.407)
/**
 * 状态栏输入里的 context_window：总输入/输出 token、窗口大小、当前 usage、已用/剩余百分比。
 */
function buildContextWindowStatus(currentUsage, contextWindowSize) {
  let contextPercentages = calculateContextPercentages(currentUsage, contextWindowSize);
  return {
    total_input_tokens: currentUsage
      ? currentUsage.input_tokens +
        currentUsage.cache_creation_input_tokens +
        currentUsage.cache_read_input_tokens
      : 0,
    total_output_tokens: currentUsage?.output_tokens ?? 0,
    context_window_size: contextWindowSize,
    current_usage: currentUsage,
    used_percentage: contextPercentages.used,
    remaining_percentage: contextPercentages.remaining,
  };
}
//@ chunk-5xgkngpb.js:5093453-5093505 fingerprint (2.1.88 match: messageTokenCountFromLastAPIResponse, 0.691)
/**
 * usage.output_tokens 或 null（流式消息处理用）。
 */
function getUsageOutputTokens(messages) {
  return messages.usage?.output_tokens ?? null;
}
export {
  tokenCountFromLastAPIResponse,
  getUsageOutputTokens,
  getTokenUsage,
  buildContextWindowStatus,
  getLastApiUsage,
  doesMostRecentAssistantMessageExceed200k,
  getAssistantMessageApiId,
  setCumulativeDroppedTokens,
  getContextTokenCount,
  hasThinkingContent,
  sumAssistantTokensSince,
  getMaxCumulativeDroppedTokens,
  getTokenCountFromUsage,
  finalContextTokensFromLastResponse,
};
