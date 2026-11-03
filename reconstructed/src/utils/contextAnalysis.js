/**
 * utils/contextAnalysis.ts
 *
 * 上下文构成分析：把规整后的 API 消息按人类/助手/工具请求/工具结果/附件/重复读文件分类计 token，并转成遥测指标。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/contextAnalysis.ts
 * pieces: chunk-e6aww6q8.js (5)
 * attribution: fingerprint 3, layout 1, file-local 1
 */
import { normalizeMessagesForAPI } from "./messages.js";
import { shouldEchoWireToolInputs } from "./wireToolInputEcho.js";
import { isStellarDriftEnabled } from "./api.js";
import { roughTokenCountEstimation, roughTokenCountEstimationForBlock } from "../services/tokenEstimation.js";
import { jsonStringify } from "./slowOperations.js";
import { SKILL_2 } from "../tools/SkillTool/skillToolNames.js";
import { sanitizeToolNameForAnalytics } from "../services/analytics/metadata.js";
import { FILE_READ_TOOL_NAME } from "../tools/FileReadTool/constants.js";
import { isPlainObject as isPlainObject_4 } from "./isPlainObject.js";

/**
 * 按消息类型统计 token：附件计数、规整为 API 消息后逐块分类（人类/助手/本地命令输出/工具请求/工具结果/其他），并计算重复读同一文件的浪费。
 */
//@ chunk-e6aww6q8.js:1653817-1654688 fingerprint = analyzeContext (0.907)
function analyzeContext(messages) {
  let stats = {
      toolRequests: new Map(),
      toolResults: new Map(),
      humanMessages: 0,
      assistantMessages: 0,
      localCommandOutputs: 0,
      other: 0,
      attachments: new Map(),
      duplicateFileReads: new Map(),
      total: 0,
    },
    toolIdsToToolNames = new Map(),
    readToolIdToFilePath = new Map(),
    fileReadStats = new Map();
  return (
    messages.forEach((msg) => {
      if (msg.type === "attachment") {
        let type = msg.attachment.type || "unknown";
        stats.attachments.set(type, (stats.attachments.get(type) || 0) + 1);
      }
    }),
    normalizeMessagesForAPI(messages, void 0, void 0, {
      echoWireToolInputs: shouldEchoWireToolInputs(messages),
      echoApiBlockOrder: isStellarDriftEnabled(),
    }).forEach((msg) => {
      let { content: content } = msg.message;
      if (typeof content === "string") {
        let tokens = roughTokenCountEstimation(content);
        if (
          ((stats.total += tokens),
          msg.type === "user" &&
            (content.includes("local-command-stdout") || content.includes("local-command-stderr")))
        )
          stats.localCommandOutputs += tokens;
        else stats[msg.type === "user" ? "humanMessages" : "assistantMessages"] += tokens;
      } else
        content.forEach((block) =>
          processBlock(block, msg, stats, toolIdsToToolNames, readToolIdToFilePath, fileReadStats),
        );
    }),
    fileReadStats.forEach((data, path) => {
      if (data.count > 1) {
        let duplicateTokens = Math.floor(data.totalTokens / data.count) * (data.count - 1);
        stats.duplicateFileReads.set(path, { count: data.count, tokens: duplicateTokens });
      }
    }),
    stats
  );
}
/**
 * 单个内容块计 token 并归入统计桶；Read 工具记录文件路径用于重复读统计。
 */
//@ chunk-e6aww6q8.js:1654688-1656109 fingerprint = processBlock (0.882)
function processBlock(block, message, stats, toolIds, readToolPaths, fileReads) {
  let S =
    isBase64MediaBlock(block) ||
    (block.type === "tool_result" && Array.isArray(block.content) && block.content.some(isBase64MediaBlock))
      ? roughTokenCountEstimationForBlock(block)
      : roughTokenCountEstimation(jsonStringify(block));
  if (((stats.total += S), block.type === "mid_conv_system")) {
    stats.other += S;
    return;
  }
  switch (block.type) {
    case "text":
      if (
        message.type === "user" &&
        "text" in block &&
        (block.text.includes("local-command-stdout") || block.text.includes("local-command-stderr"))
      )
        stats.localCommandOutputs += S;
      else stats[message.type === "user" ? "humanMessages" : "assistantMessages"] += S;
      break;
    case "tool_use": {
      if ("name" in block && "id" in block) {
        let L = block.name || "unknown",
          G = L.startsWith(SKILL_2) ? "skill_tool" : sanitizeToolNameForAnalytics(L);
        if (
          (increment(stats.toolRequests, G, S),
          toolIds.set(block.id, G),
          G === FILE_READ_TOOL_NAME &&
            "input" in block &&
            block.input &&
            typeof block.input === "object" &&
            "file_path" in block.input)
        ) {
          let path = String(block.input.file_path);
          readToolPaths.set(block.id, path);
        }
      }
      break;
    }
    case "tool_result": {
      if ("tool_use_id" in block) {
        let L = toolIds.get(block.tool_use_id) || "unknown";
        if ((increment(stats.toolResults, L, S), L === FILE_READ_TOOL_NAME)) {
          let path = readToolPaths.get(block.tool_use_id);
          if (path) {
            let q = fileReads.get(path) || { count: 0, totalTokens: 0 };
            fileReads.set(path, { count: q.count + 1, totalTokens: q.totalTokens + S });
          }
        }
      }
      break;
    }
    case "image":
    case "server_tool_use":
    case "web_search_tool_result":
    case "search_result":
    case "document":
    case "thinking":
    case "redacted_thinking":
    case "code_execution_tool_result":
    case "mcp_tool_use":
    case "mcp_tool_result":
    case "mcp_tool_listing":
    case "container_upload":
    case "web_fetch_tool_result":
    case "bash_code_execution_tool_result":
    case "text_editor_code_execution_tool_result":
    case "tool_search_tool_result":
    case "advisor_tool_result":
    case "compaction":
    case "fallback":
      stats.other += S;
      break;
  }
}
/**
 * image/document 且 source.type=base64。
 */
//@ chunk-e6aww6q8.js:1656109-1656217 layout = isMedia (0.815)
function isBase64MediaBlock(block) {
  return (
    isPlainObject_4(block) &&
    (block.type === "image" || block.type === "document") &&
    isPlainObject_4(block.source) &&
    block.source.type === "base64"
  );
}
/**
 * Map 计数累加。
 */
//@ chunk-e6aww6q8.js:1656217-1656262 file-local
function increment(map, key, value) {
  map.set(key, (map.get(key) || 0) + value);
}
/**
 * 把上下文统计转成遥测指标（各类 token、百分比、按工具细分）。
 */
//@ chunk-e6aww6q8.js:1656262-1657467 fingerprint = tokenStatsToStatsigMetrics (1)
function tokenStatsToStatsigMetrics(stats) {
  let metrics = {
    total_tokens: stats.total,
    human_message_tokens: stats.humanMessages,
    assistant_message_tokens: stats.assistantMessages,
    local_command_output_tokens: stats.localCommandOutputs,
    other_tokens: stats.other,
  };
  (stats.attachments.forEach((count, type) => {
    metrics[`attachment_${type}_count`] = count;
  }),
    stats.toolRequests.forEach((tokens, tool) => {
      metrics[`tool_request_${tool}_tokens`] = tokens;
    }),
    stats.toolResults.forEach((tokens, tool) => {
      metrics[`tool_result_${tool}_tokens`] = tokens;
    }));
  let duplicateTotal = [...stats.duplicateFileReads.values()].reduce((sum, h) => sum + h.tokens, 0);
  if (
    ((metrics.duplicate_read_tokens = duplicateTotal),
    (metrics.duplicate_read_file_count = stats.duplicateFileReads.size),
    stats.total > 0)
  ) {
    ((metrics.human_message_percent = Math.round((stats.humanMessages / stats.total) * 100)),
      (metrics.assistant_message_percent = Math.round((stats.assistantMessages / stats.total) * 100)),
      (metrics.local_command_output_percent = Math.round((stats.localCommandOutputs / stats.total) * 100)),
      (metrics.duplicate_read_percent = Math.round((duplicateTotal / stats.total) * 100)));
    let toolRequestTotal = [...stats.toolRequests.values()].reduce((sum, S) => sum + S, 0),
      toolResultTotal = [...stats.toolResults.values()].reduce((sum, S) => sum + S, 0);
    ((metrics.tool_request_percent = Math.round((toolRequestTotal / stats.total) * 100)),
      (metrics.tool_result_percent = Math.round((toolResultTotal / stats.total) * 100)),
      stats.toolRequests.forEach((tokens, tool) => {
        metrics[`tool_request_${tool}_percent`] = Math.round((tokens / stats.total) * 100);
      }),
      stats.toolResults.forEach((tokens, tool) => {
        metrics[`tool_result_${tool}_percent`] = Math.round((tokens / stats.total) * 100);
      }));
  }
  return metrics;
}

export { tokenStatsToStatsigMetrics, analyzeContext };
