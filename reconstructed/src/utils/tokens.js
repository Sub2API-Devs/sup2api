/**
 * utils/tokens.ts
 *
 * 从消息的 API usage 读取 token：最近一次响应的上下文 token、带估算的 token 计数、累计被压缩丢弃的 token、状态栏上下文窗口信息等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/tokens.ts
 * pieces: chunk-e6aww6q8.js (16)
 * attribution: shared-adjacent 1, file-local 3, layout 7, fingerprint 3, callgraph-witnessed 1, callgraph-fingerprint 1
 */
import { SYNTHETIC_MESSAGES, signatureTokenEstimate } from "./messages.js";
import { SYNTHETIC_MODEL } from "../constants/messages.js";
import {
  totalTokensOf,
  getTokenCountFromUsage as getTokenCountFromUsage_5,
} from "./messages/usageAndStopReason.js";
import { isCompactBoundaryMessage as isCompactBoundaryMessage_3 } from "../services/projects/threadRows.js";
import { jsonStringify } from "./slowOperations.js";
import { calculateContextPercentages } from "./context.js";

//@ chunk-e6aww6q8.js:1534635-1534844 shared-adjacent = getTokenUsage (0.835)
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
//@ chunk-e6aww6q8.js:1534844-1534952 file-local
/**
 * 返回 assistant 消息的 API message id（排除合成模型）。
 */
function getAssistantMessageApiId(message) {
  if (message?.type === "assistant" && "id" in message.message && message.message.model !== SYNTHETIC_MODEL)
    return message.message.id;
  return;
}
//@ chunk-e6aww6q8.js:1534952-1535072 layout = getTokenCountFromUsage (1)
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
//@ chunk-e6aww6q8.js:1535072-1535122 layout
/**
 * 单条消息 usage 对应的上下文 token（最后一次迭代的输入+输出）。
 */
function getMessageContextTokens(message) {
  let tokenUsage = getTokenUsage(message);
  return tokenUsage ? totalTokensOf(tokenUsage) : undefined;
}
//@ chunk-e6aww6q8.js:1535122-1535217 file-local
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
//@ chunk-e6aww6q8.js:1535217-1535247 layout
/**
 * tokenCountWithEstimation 的转发（通知栏等 UI 用）。
 */
function getContextTokenCount(messages) {
  return tokenCountWithEstimation(messages);
}
//@ chunk-e6aww6q8.js:1535247-1535364 file-local
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
//@ chunk-e6aww6q8.js:1535364-1535564 fingerprint = finalContextTokensFromLastResponse (1)
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
//@ chunk-e6aww6q8.js:1535564-1535670 layout
/**
 * 最近一次 usage 规整为最后迭代值。
 */
function getLastApiUsage(e) {
  for (let idx = e.length - 1; idx >= 0; idx--) {
    let r = e[idx];
    let s = r ? getTokenUsage(r) : undefined;
    if (s) return getTokenCountFromUsage_5(s);
  }
  return null;
}
//@ chunk-e6aww6q8.js:1535670-1535960 layout = getTokenCountFromUsage (0.758)
/**
 * 从某下标起按 message id 去重累计 assistant 的 input+cache_creation+output；缺 usage 的回调通知。
 */
function sumAssistantTokensSince(e, n, r, s) {
  let h = 0;
  for (let y = r; y < e.length; y++) {
    let S = e[y];
    let tokenUsage = getTokenUsage(S);
    if (!tokenUsage) {
      if (s && S.type === "assistant" && S.message.usage == null && getAssistantMessageApiId(S) !== undefined)
        s(y);
      continue;
    }
    let assistantMessageApiId = getAssistantMessageApiId(S);
    if (!assistantMessageApiId || n.has(assistantMessageApiId)) continue;
    n.add(assistantMessageApiId);
    h += tokenUsage.input_tokens + (tokenUsage.cache_creation_input_tokens ?? 0) + tokenUsage.output_tokens;
  }
  return h;
}
//@ chunk-e6aww6q8.js:1535960-1536151 layout
/**
 * 所有 compact_boundary 中最大的累计丢弃 token。
 */
function getMaxCumulativeDroppedTokens(e) {
  let n = 0;
  for (let r of e)
    if (r && isCompactBoundaryMessage_3(r) && r.compactMetadata) {
      let { cumulativeDroppedTokens, preTokens, postTokens } = r.compactMetadata;
      let S = cumulativeDroppedTokens ?? Math.max(0, preTokens - (postTokens ?? 0));
      if (S > n) n = S;
    }
  return n;
}
//@ chunk-e6aww6q8.js:1536151-1536291 layout
/**
 * 在新边界上记录累计丢弃 token = 之前最大值 + 本次(pre−post)。
 */
function setCumulativeDroppedTokens(e, n) {
  let maxCumulativeDroppedTokens = getMaxCumulativeDroppedTokens(n);
  let { preTokens, postTokens } = e.compactMetadata;
  e.compactMetadata.cumulativeDroppedTokens =
    maxCumulativeDroppedTokens + Math.max(0, preTokens - (postTokens ?? 0));
}
//@ chunk-e6aww6q8.js:1536291-1536403 callgraph-witnessed = doesMostRecentAssistantMessageExceed200k (1)
/**
 * 最近一条 assistant 的上下文是否超过 200k（plan 模式选模型用）。
 */
function doesMostRecentAssistantMessageExceed200k(messages) {
  let lastAsst = messages.findLast((m) => m.type === "assistant");
  if (!lastAsst) return false;
  let usage = getTokenUsage(lastAsst);
  return usage ? totalTokensOf(usage) > 200000 : false;
}
//@ chunk-e6aww6q8.js:1536403-1536673 fingerprint = getAssistantMessageContentLength (0.833)
/**
 * assistant 内容长度估算（文本、thinking 签名、redacted、tool_use 输入）。
 */
function getAssistantMessageContentLength(message) {
  let contentLength = 0;
  for (let block of message.message.content)
    if (block.type === "text") contentLength += block.text?.length ?? 0;
    else if (block.type === "thinking") contentLength += signatureTokenEstimate(block.signature?.length ?? 0);
    else if (block.type === "redacted_thinking") contentLength += block.data?.length ?? 0;
    else if (block.type === "tool_use") contentLength += jsonStringify(block.input).length;
  return contentLength;
}
//@ chunk-e6aww6q8.js:3685902-3686171 callgraph-fingerprint = getCurrentUsage (0.407)
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
//@ chunk-e6aww6q8.js:4944387-4944439 fingerprint = messageTokenCountFromLastAPIResponse (0.689)
/**
 * usage.output_tokens 或 null（流式消息处理用）。
 */
function getUsageOutputTokens(messages) {
  return messages.usage?.output_tokens ?? null;
}
export {
  getUsageOutputTokens,
  doesMostRecentAssistantMessageExceed200k,
  getTokenUsage,
  getLastApiUsage,
  getAssistantMessageContentLength,
  getContextTokenCount,
  buildContextWindowStatus,
  sumAssistantTokensSince,
  getMaxCumulativeDroppedTokens,
  tokenCountFromLastAPIResponse,
  finalContextTokensFromLastResponse,
  getTokenCountFromUsage,
  getAssistantMessageApiId,
  setCumulativeDroppedTokens,
};
