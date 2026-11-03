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
import { SYNTHETIC_MESSAGES, UQn } from "./messages.js";
import { SYNTHETIC_MODEL } from "../constants/messages.js";
import {
  totalTokensOf,
  getTokenCountFromUsage as getTokenCountFromUsage_5,
} from "./messages/usageAndStopReason.js";
import { isCompactBoundaryMessage as isCompactBoundaryMessage_3 } from "../services/projects/threadRows.js";
import { jsonStringify } from "./slowOperations.js";
import { calculateContextPercentages } from "./context.js";

/**
 * 返回 assistant 消息的 usage；排除合成占位文本、合成模型消息与 isUnmetered 消息。
 */
//@ chunk-e6aww6q8.js:1534635-1534844 shared-adjacent = getTokenUsage (0.835)
function getTokenUsage(message) {
  if (
    message?.type === "assistant" &&
    "usage" in message.message &&
    !(
      message.message.content[0]?.type === "text" && SYNTHETIC_MESSAGES.has(message.message.content[0].text)
    ) &&
    message.message.model !== SYNTHETIC_MODEL &&
    message.isUnmetered !== !0
  )
    return message.message.usage;
  return;
}
/**
 * 返回 assistant 消息的 API message id（排除合成模型）。
 */
//@ chunk-e6aww6q8.js:1534844-1534952 file-local
function getAssistantMessageApiId(message) {
  if (message?.type === "assistant" && "id" in message.message && message.message.model !== SYNTHETIC_MODEL)
    return message.message.id;
  return;
}
/**
 * input + cache_creation + cache_read + output。
 */
//@ chunk-e6aww6q8.js:1534952-1535072 layout = getTokenCountFromUsage (1)
function getTokenCountFromUsage(usage) {
  return (
    usage.input_tokens +
    (usage.cache_creation_input_tokens ?? 0) +
    (usage.cache_read_input_tokens ?? 0) +
    usage.output_tokens
  );
}
/**
 * 单条消息 usage 对应的上下文 token（最后一次迭代的输入+输出）。
 */
//@ chunk-e6aww6q8.js:1535072-1535122 layout
function getMessageContextTokens(e) {
  let n = getTokenUsage(e);
  return n ? totalTokensOf(n) : void 0;
}
/**
 * 从后往前找最近一条有 usage 的消息，返回其上下文 token；没有返回 0。
 */
//@ chunk-e6aww6q8.js:1535122-1535217 file-local
function tokenCountFromLastAPIResponse(messages) {
  for (let n = messages.length - 1; n >= 0; n--) {
    let r = getMessageContextTokens(messages[n]);
    if (r !== void 0) return r;
  }
  return 0;
}
/**
 * tokenCountWithEstimation 的转发（通知栏等 UI 用）。
 */
//@ chunk-e6aww6q8.js:1535217-1535247 layout
function getContextTokenCount(e) {
  return tokenCountWithEstimation(e);
}
/**
 * 最近一次 API 响应的上下文 token；遇到 compact_boundary 停止（压缩后尚无响应时为 0）。
 */
//@ chunk-e6aww6q8.js:1535247-1535364 file-local
function tokenCountWithEstimation(messages) {
  for (let n = messages.length - 1; n >= 0; n--) {
    let r = messages[n],
      responseId = getMessageContextTokens(r);
    if (responseId !== void 0) return responseId;
    if (isCompactBoundaryMessage_3(r)) return 0;
  }
  return 0;
}
/**
 * 最近一条有 usage 的消息的 input+output（优先 iterations 最后一项），用于 taskBudget 扣减。
 */
//@ chunk-e6aww6q8.js:1535364-1535564 fingerprint = finalContextTokensFromLastResponse (1)
function finalContextTokensFromLastResponse(messages) {
  let n = messages.length - 1;
  while (n >= 0) {
    let message = messages[n],
      usage = message ? getTokenUsage(message) : void 0;
    if (usage) {
      let h = usage.iterations?.at(-1);
      if (h) return h.input_tokens + h.output_tokens;
      return usage.input_tokens + usage.output_tokens;
    }
    n--;
  }
  return 0;
}
/**
 * 最近一次 usage 规整为最后迭代值。
 */
//@ chunk-e6aww6q8.js:1535564-1535670 layout
function getLastApiUsage(e) {
  for (let n = e.length - 1; n >= 0; n--) {
    let r = e[n],
      s = r ? getTokenUsage(r) : void 0;
    if (s) return getTokenCountFromUsage_5(s);
  }
  return null;
}
/**
 * 从某下标起按 message id 去重累计 assistant 的 input+cache_creation+output；缺 usage 的回调通知。
 */
//@ chunk-e6aww6q8.js:1535670-1535960 layout = getTokenCountFromUsage (0.758)
function sumAssistantTokensSince(e, n, r, s) {
  let h = 0;
  for (let y = r; y < e.length; y++) {
    let S = e[y],
      w = getTokenUsage(S);
    if (!w) {
      if (s && S.type === "assistant" && S.message.usage == null && getAssistantMessageApiId(S) !== void 0)
        s(y);
      continue;
    }
    let L = getAssistantMessageApiId(S);
    if (!L || n.has(L)) continue;
    (n.add(L), (h += w.input_tokens + (w.cache_creation_input_tokens ?? 0) + w.output_tokens));
  }
  return h;
}
/**
 * 所有 compact_boundary 中最大的累计丢弃 token。
 */
//@ chunk-e6aww6q8.js:1535960-1536151 layout
function getMaxCumulativeDroppedTokens(e) {
  let n = 0;
  for (let r of e)
    if (r && isCompactBoundaryMessage_3(r) && r.compactMetadata) {
      let {
          cumulativeDroppedTokens: cumulativeDroppedTokens,
          preTokens: preTokens,
          postTokens: postTokens,
        } = r.compactMetadata,
        S = cumulativeDroppedTokens ?? Math.max(0, preTokens - (postTokens ?? 0));
      if (S > n) n = S;
    }
  return n;
}
/**
 * 在新边界上记录累计丢弃 token = 之前最大值 + 本次(pre−post)。
 */
//@ chunk-e6aww6q8.js:1536151-1536291 layout
function setCumulativeDroppedTokens(e, n) {
  let r = getMaxCumulativeDroppedTokens(n),
    { preTokens: preTokens, postTokens: postTokens } = e.compactMetadata;
  e.compactMetadata.cumulativeDroppedTokens = r + Math.max(0, preTokens - (postTokens ?? 0));
}
/**
 * 最近一条 assistant 的上下文是否超过 200k（plan 模式选模型用）。
 */
//@ chunk-e6aww6q8.js:1536291-1536403 callgraph-witnessed = doesMostRecentAssistantMessageExceed200k (1)
function doesMostRecentAssistantMessageExceed200k(messages) {
  let lastAsst = messages.findLast((h) => h.type === "assistant");
  if (!lastAsst) return !1;
  let usage = getTokenUsage(lastAsst);
  return usage ? totalTokensOf(usage) > 200000 : !1;
}
/**
 * assistant 内容长度估算（文本、thinking 签名、redacted、tool_use 输入）。
 */
//@ chunk-e6aww6q8.js:1536403-1536673 fingerprint = getAssistantMessageContentLength (0.833)
function getAssistantMessageContentLength(message) {
  let contentLength = 0;
  for (let block of message.message.content)
    if (block.type === "text") contentLength += block.text?.length ?? 0;
    else if (block.type === "thinking") contentLength += UQn(block.signature?.length ?? 0);
    else if (block.type === "redacted_thinking") contentLength += block.data?.length ?? 0;
    else if (block.type === "tool_use") contentLength += jsonStringify(block.input).length;
  return contentLength;
}
/**
 * 状态栏输入里的 context_window：总输入/输出 token、窗口大小、当前 usage、已用/剩余百分比。
 */
//@ chunk-e6aww6q8.js:3685902-3686171 callgraph-fingerprint = getCurrentUsage (0.407)
function buildContextWindowStatus(e, n) {
  let r = calculateContextPercentages(e, n);
  return {
    total_input_tokens: e ? e.input_tokens + e.cache_creation_input_tokens + e.cache_read_input_tokens : 0,
    total_output_tokens: e?.output_tokens ?? 0,
    context_window_size: n,
    current_usage: e,
    used_percentage: r.used,
    remaining_percentage: r.remaining,
  };
}
/**
 * usage.output_tokens 或 null（流式消息处理用）。
 */
//@ chunk-e6aww6q8.js:4944387-4944439 fingerprint = messageTokenCountFromLastAPIResponse (0.689)
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
