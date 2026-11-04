/**
 * services/mcp/mcpCallConstants.ts
 *
 * 2.1.316 新增：MCP 调用常量（协议版本、中断/未答说明、重连退避）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dg4taswx.js (6)
 * attribution: placement 6
 */
import { backoffDelayMs } from "../../utils/sleep.js";

//@ chunk-dg4taswx.js:227-686 placement
/**
 * MCP 调用相关常量：最新与下一版协议日期、重开补拉与处理器前事件标记、调用标记长度、结构化结果上限、中断与结果未知提示、应答流宽限时间。
 */
var MCP_PROTOCOL_LATEST = "2025-11-25";
var MCP_PROTOCOL_NEXT = "2026-07-28";
var REOPEN_REFETCH = "reopen_refetch";
var BEFORE_HANDLER = "before_handler";
var MAX_CALL_MARK_CHARS = 4096;
var MAX_STRUCTURED_RESULT_CHARS = 16384;
var INTERRUPTED_CALL_NOTICE =
  "The tool call was interrupted before a result was received. It may or may not have completed on the server \u2014 verify before assuming it succeeded, and retry if needed.";
var ANSWER_STREAM_GRACE_MS_2 = 1000;
var CLAUDECODE_CALLMARK = "claudecode/callMark";
var CALL_OUTCOME_UNKNOWN_NOTICE =
  "The outcome is unknown: the call may have finished, may still be running, or may never have started. Check what it did before you repeat it.";
//@ chunk-dg4taswx.js:686-765 placement
/**
 * 服务器始终未回应工具调用时的说明。
 */
function describeUnansweredCall(serverName, tool) {
  return `MCP server "${serverName}" never answered tool "${tool}". ${CALL_OUTCOME_UNKNOWN_NOTICE}`;
}
//@ chunk-dg4taswx.js:765-1136 placement
/**
 * 调用标记的最大字符数（10000）。
 */
var MCP_ANSWER_STREAM_ENDED = "mcp_answer_stream_ended";
var MCP_CALL_NOT_SENT_AGAIN = "mcp_call_not_sent_again";
var MCP_CALL_UNANSWERED = "mcp_call_unanswered";
var QUESTION_UNANSWERED_TEXT =
  "The server asked the user a question, and no answer came before the time limit. Do not call this tool again in this turn. Tell the user that the server's question got no answer, and wait for their reply.";
var MCP_QUESTION_UNANSWERED = "mcp_question_unanswered";
var MAX_STRUCTURED_RESULT_BYTES = 16777216;
var ANSWER_STREAM_GRACE_MS = 5;
var _ = 1000;
var RETRY_CAP_MS = 30000;
var CALL_MARK_MAX_CHARS = 1e4;
//@ chunk-dg4taswx.js:1136-1192 placement
/**
 * 按尝试次数计算重试等待。
 */
function retryDelayMs(attempt) {
  return backoffDelayMs({
    attempt,
    baseMs: _,
    capMs: RETRY_CAP_MS,
  });
}
//@ chunk-dg4taswx.js:1192-1253 placement
/**
 * 重新拉取的基础间隔（10 秒）。
 */
var MAX_REOPEN_ATTEMPTS = 8;
var REOPEN_REFETCH_MS = 30000;
var MAX_REOPEN_REFETCH_MS = 300000;
var REOPEN_REFETCH_BASE_MS = 1e4;
var INODE_DIRECTORY = "inode/directory";
//@ chunk-dg4taswx.js:1253-1318 placement
/**
 * 把调用标记清洗成可打印 ASCII 并截断 32 字符。
 */
function sanitizeCallMark(mark) {
  return mark.replace(/[^\x20-\x7e]/g, "").slice(0, 32);
}
export {
  MCP_PROTOCOL_LATEST,
  MCP_PROTOCOL_NEXT,
  MAX_STRUCTURED_RESULT_CHARS,
  MAX_CALL_MARK_CHARS,
  CLAUDECODE_CALLMARK,
  BEFORE_HANDLER,
  sanitizeCallMark,
  INTERRUPTED_CALL_NOTICE,
  describeUnansweredCall,
  MCP_ANSWER_STREAM_ENDED,
  ANSWER_STREAM_GRACE_MS_2,
  MCP_CALL_UNANSWERED,
  CALL_OUTCOME_UNKNOWN_NOTICE,
  QUESTION_UNANSWERED_TEXT,
  MCP_QUESTION_UNANSWERED,
  MCP_CALL_NOT_SENT_AGAIN,
  REOPEN_REFETCH_BASE_MS,
  ANSWER_STREAM_GRACE_MS,
  retryDelayMs,
  REOPEN_REFETCH,
  MAX_STRUCTURED_RESULT_BYTES,
  INODE_DIRECTORY,
  CALL_MARK_MAX_CHARS,
  MAX_REOPEN_ATTEMPTS,
  REOPEN_REFETCH_MS,
  MAX_REOPEN_REFETCH_MS,
};
