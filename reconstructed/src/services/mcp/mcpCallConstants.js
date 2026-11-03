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

/**
 * MCP 调用相关常量：最新与下一版协议日期、重开补拉与处理器前事件标记、调用标记长度、结构化结果上限、中断与结果未知提示、应答流宽限时间。
 */
//@ chunk-dg4taswx.js:227-686 placement
var MCP_PROTOCOL_LATEST = "2025-11-25",
  MCP_PROTOCOL_NEXT = "2026-07-28",
  REOPEN_REFETCH = "reopen_refetch",
  BEFORE_HANDLER = "before_handler",
  MAX_CALL_MARK_CHARS = 4096,
  MAX_STRUCTURED_RESULT_CHARS = 16384,
  INTERRUPTED_CALL_NOTICE =
    "The tool call was interrupted before a result was received. It may or may not have completed on the server \u2014 verify before assuming it succeeded, and retry if needed.",
  ANSWER_STREAM_GRACE_MS = 1000,
  CLAUDECODE_CALLMARK = "claudecode/callMark",
  CALL_OUTCOME_UNKNOWN_NOTICE =
    "The outcome is unknown: the call may have finished, may still be running, or may never have started. Check what it did before you repeat it.";
//@ chunk-dg4taswx.js:686-765 placement
function olr(e, t) {
  return `MCP server "${e}" never answered tool "${t}". ${CALL_OUTCOME_UNKNOWN_NOTICE}`;
}
//@ chunk-dg4taswx.js:765-1136 placement
var MCP_ANSWER_STREAM_ENDED = "mcp_answer_stream_ended",
  MCP_CALL_NOT_SENT_AGAIN = "mcp_call_not_sent_again",
  MCP_CALL_UNANSWERED = "mcp_call_unanswered",
  bfi =
    "The server asked the user a question, and no answer came before the time limit. Do not call this tool again in this turn. Tell the user that the server's question got no answer, and wait for their reply.",
  MCP_QUESTION_UNANSWERED = "mcp_question_unanswered",
  z2 = 16777216,
  eae = 5,
  _ = 1000,
  o = 30000,
  wfi = 1e4;
//@ chunk-dg4taswx.js:1136-1192 placement
function cCt(e) {
  return backoffDelayMs({ attempt: e, baseMs: _, capMs: o });
}
//@ chunk-dg4taswx.js:1192-1253 placement
var ilr = 8,
  WQo = 30000,
  Efi = 300000,
  alr = 1e4,
  INODE_DIRECTORY = "inode/directory";
//@ chunk-dg4taswx.js:1253-1318 placement
function HPe(e) {
  return e.replace(/[^\x20-\x7e]/g, "").slice(0, 32);
}

export {
  MCP_PROTOCOL_LATEST,
  MCP_PROTOCOL_NEXT,
  CLAUDECODE_CALLMARK,
  BEFORE_HANDLER,
  HPe,
  INTERRUPTED_CALL_NOTICE,
  olr,
  MCP_ANSWER_STREAM_ENDED,
  ANSWER_STREAM_GRACE_MS,
  MCP_CALL_UNANSWERED,
  CALL_OUTCOME_UNKNOWN_NOTICE,
  bfi,
  MCP_QUESTION_UNANSWERED,
  MCP_CALL_NOT_SENT_AGAIN,
  MAX_STRUCTURED_RESULT_CHARS,
  MAX_CALL_MARK_CHARS,
  alr,
  eae,
  cCt,
  REOPEN_REFETCH,
  z2,
  INODE_DIRECTORY,
  wfi,
  ilr,
  WQo,
  Efi,
};
