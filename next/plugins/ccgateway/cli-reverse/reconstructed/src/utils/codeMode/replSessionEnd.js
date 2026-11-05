/**
 * utils/codeMode/replSessionEnd.ts
 *
 * 会话结束时的 REPL 清理：按 eval 过滤清掉未结算令牌与轮次台账（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-jz4c39m8.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { codeModeAccepted } from "./accepted.js";
import { ReplSessions } from "../../state/replSessions.js";
import { REPL_MAIN_THREAD_KEY } from "../../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { discardPollEvent, isPollEventForAgent } from "../pollEvents.js";
import { isEvalSettleCommand, EVAL_LOST_STATUS } from "../pollEvents/evalSettleKind.js";
import { isMainAgentCommand } from "../messageQueueManager.js";
import { TurnRegistry } from "../../query/replTurnLedger.js";
import { ReplCallNoteBuffer } from "../../tools/REPLTool/replCallNotes.js";
import { parseSettleEvent } from "../pollEvents/replEvalEvents.js";

//@ chunk-jz4c39m8.js:5175-5416 placement
/**
 * 主线程会话结束时清掉其 REPL 令牌与轮次台账，并把未结算 eval 收掉。
 */
function endMainThreadConversation(toolState, messageQueue, reason, droppedToolUseIds = []) {
  if (codeModeAccepted()) {
    let replSessions = toolState.get(ReplSessions);
    let keptEvalIds = replSessions.evalIdsOf(REPL_MAIN_THREAD_KEY, droppedToolUseIds);
    let isKeptEvalId = keptEvalIds.size === 0 ? undefined : (evalId) => keptEvalIds.has(evalId);
    replSessions.clear([REPL_MAIN_THREAD_KEY], isKeptEvalId);
    replSessions.release(REPL_MAIN_THREAD_KEY);
    discardPollEvent(
      messageQueue.removeByFilter(
        (command) =>
          isEvalSettleCommand(command) &&
          isMainAgentCommand(command) &&
          !isKeptSettleCommand(command, isKeptEvalId),
      ),
      reason,
    );
    toolState.get(TurnRegistry).endedLoops.delete(undefined);
    toolState.get(ReplCallNoteBuffer).clear();
  }
}
//@ chunk-jz4c39m8.js:5416-5584 placement
/**
 * 子代理结束时清掉其 REPL 状态与未结算 eval。
 */
function endSubagentRepl(toolState, messageQueue, agentId) {
  if (codeModeAccepted()) {
    let replSessions = toolState.get(ReplSessions);
    replSessions.clear([agentId]);
    replSessions.release(agentId);
    replSessions.forget(agentId);
    discardPollEvent(
      messageQueue.removeByFilter((pollEvent) => isPollEventForAgent(pollEvent, agentId)),
      "the subagent that ran the script ended its run",
    );
  }
}
//@ chunk-jz4c39m8.js:5584-5793 placement
function isKeptSettleCommand(command, isKeptEvalId) {
  if (isKeptEvalId === undefined) return false;
  let settle = parseSettleEvent(
    command.pollEvent?.envelope ?? "",
    command.pollEvent?.declared === undefined
      ? undefined
      : {
          kind: command.pollEvent.kind,
          ...command.pollEvent.declared,
        },
  );
  return settle !== undefined && settle.status !== EVAL_LOST_STATUS && isKeptEvalId(settle.evalId);
}
export { endMainThreadConversation, endSubagentRepl };
