/**
 * utils/codeMode/lostEvals.ts
 *
 * Code 模式丢失的异步 eval：从 transcript 找出未结算的 eval，恢复时补一条“结果丢失”事件，子代理场景按跟踪集合跳过（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-fb0zsxh0.js (9)
 * attribution: placement 9
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { codeModeAccepted } from "./accepted.js";
import { parseSettleEvent, parseSettleEvents } from "../pollEvents/replEvalEvents.js";
import {
  isPollEventDeliveryText,
  parseDeliveredPollEvents,
  isPollEventIngressActive,
  isPollEventForAgent,
  EVAL_SETTLE_EVENT_KIND,
  validatePollEvent,
} from "../pollEvents.js";
import { isEvalToolName } from "../../tools/REPLTool/constants.js";
import { POLL } from "../../tools/PollTool/prompt.js";
import { receiptEvalIdOf } from "./receiptEvalId.js";
import { logForDebugging } from "../debug.js";
import { ReplSessions } from "../../state/replSessions.js";
import { getCommandQueueSnapshot, enqueuePollEvent } from "../messageQueueManager.js";
import { clientsDrawScriptCalls } from "./vscodeExtensionStream.js";
import { isReplTypedEventsOn } from "./typedEvents.js";
import { EVAL_LOST_STATUS } from "../pollEvents/evalSettleKind.js";
import { replErrorMessages } from "./scriptErrorMessages.js";
import { isHostError } from "../errors/hostError.js";

//@ chunk-fb0zsxh0.js:729-935 placement
/**
 * “eval 因进程退出而未结算”的事件文案。
 */
function lostEvalText(evalId) {
  if (!codeModeAccepted()) return "";
  return `eval #${evalId} never settled: the process that was running it exited. Its result is lost and the script is no longer running; a command it had started may have run on.`;
}
//@ chunk-fb0zsxh0.js:935-1223 placement
function lostEvalTextForResume(evalId) {
  if (!codeModeAccepted()) return "";
  return `eval #${evalId} never reported back: your earlier run ended or was stopped, or Claude Code exited, before its result reached you. Its result is lost and the script is no longer running. A command the script had started may still have run to completion.`;
}
//@ chunk-fb0zsxh0.js:1223-1462 placement
function evalIdsOfEnvelopes(envelopes, declared) {
  if (!codeModeAccepted()) return [];
  let declaredList = Array.isArray(declared) && declared.length === envelopes.length ? declared : [];
  let evalIds = [];
  for (let [envelopeIndex, envelope] of envelopes.entries()) {
    let delivered =
      declaredList[envelopeIndex] == null
        ? undefined
        : parseSettleEvent(envelope, declaredList[envelopeIndex]);
    if (delivered !== undefined) {
      evalIds.push(delivered.evalId);
      continue;
    }
    for (let settleEvent of parseSettleEvents(envelope)) evalIds.push(settleEvent.evalId);
  }
  return evalIds;
}
//@ chunk-fb0zsxh0.js:1462-1617 placement
function pollDeliveryText(toolUseResult) {
  if (!codeModeAccepted()) return "";
  if (toolUseResult === null || typeof toolUseResult !== "object") return "";
  let result = toolUseResult;
  let content = "content" in result ? result.content : undefined;
  return typeof content === "string" && isPollEventDeliveryText(content) ? content : "";
}
//@ chunk-fb0zsxh0.js:1617-1806 placement
function evalIdsOfToolUseResult(toolUseResult) {
  if (!codeModeAccepted()) return [];
  let text = pollDeliveryText(toolUseResult);
  let declared =
    text !== "" && typeof toolUseResult === "object" && toolUseResult !== null && "declared" in toolUseResult
      ? toolUseResult.declared
      : undefined;
  let polls = Array.isArray(declared) ? parseDeliveredPollEvents(text) : undefined;
  return polls === undefined ? evalIdsOfEnvelopes([text], undefined) : evalIdsOfEnvelopes(polls, declared);
}
//@ chunk-fb0zsxh0.js:1806-2608 placement
/**
 * 从消息里扫出未结算的异步 REPL eval（按 evalId 去重，丢掉已被后续 poll_events 声明的）。
 */
function danglingReceipts(messages) {
  if (!codeModeAccepted()) return [];
  let evalToolUseIds = new Set();
  let pollToolUseIds = new Set();
  let openReceipts = [];
  let settle = (evalId) => {
    let lastIndex = openReceipts.findLastIndex((receipt) => receipt.evalId === evalId);
    if (lastIndex !== -1) openReceipts.splice(lastIndex, 1);
  };
  for (let message of messages) {
    if (message.type === "attachment") {
      if (message.attachment.type === "poll_events")
        evalIdsOfEnvelopes(message.attachment.envelopes, message.attachment.declared).forEach(settle);
      continue;
    }
    if (message.type === "assistant" && !message.isVirtual) {
      for (let block of message.message.content) {
        if (block.type !== "tool_use") continue;
        if (isEvalToolName(block.name)) evalToolUseIds.add(block.id);
        else if (block.name === POLL) pollToolUseIds.add(block.id);
      }
      continue;
    }
    if (message.type !== "user" || message.isVirtual) continue;
    let content = message.message.content;
    if (!Array.isArray(content)) continue;
    for (let block of content) {
      if (block.type !== "tool_result") continue;
      if (pollToolUseIds.has(block.tool_use_id))
        evalIdsOfToolUseResult(message.toolUseResult).forEach(settle);
      else if (evalToolUseIds.has(block.tool_use_id)) {
        let evalId = receiptEvalIdOf(message.toolUseResult);
        if (evalId !== undefined)
          openReceipts.push({
            toolUseId: block.tool_use_id,
            evalId,
            recordedAt: message.timestamp,
          });
      }
    }
  }
  return openReceipts;
}
//@ chunk-fb0zsxh0.js:2608-3094 placement
/**
 * 恢复主会话时给未结算的 async eval 补“结果丢失”事件，poll-event 关闭时只打警告。
 */
function reportLostReplEvals(messages) {
  if (!codeModeAccepted()) return;
  let staleReceipts = danglingReceipts(messages).filter(
    (receipt) => Date.parse(receipt.recordedAt) < performance.timeOrigin,
  );
  if (staleReceipts.length === 0) return;
  if (!isPollEventIngressActive()) {
    logForDebugging(
      `resume: ${staleReceipts.length} async REPL eval(s) never settled, and poll-event delivery is off, so no lost event is queued`,
      {
        level: "warn",
      },
    );
    return;
  }
  logForDebugging(
    `resume: ${staleReceipts.length} async REPL eval(s) never settled (${staleReceipts.map((receipt) => `#${receipt.evalId}`).join(", ")}); answering each with a lost event`,
  );
  answerWithLostEvents(staleReceipts, {
    text: lostEvalText,
    rowText: "Lost: Claude Code exited before this finished",
  });
}
//@ chunk-fb0zsxh0.js:3094-3600 placement
/**
 * 子代理恢复时给未结算且未被跟踪的 async eval 补丢失事件。
 */
function reportLostSubagentReplEvals(messages, agentId, services) {
  if (!codeModeAccepted() || !isPollEventIngressActive()) return;
  let sessions = services.get(ReplSessions);
  let queuedEvalIds = new Set(
    getCommandQueueSnapshot()
      .filter((queuedCommand) => isPollEventForAgent(queuedCommand, agentId))
      .flatMap((queuedCommand) =>
        queuedCommand.pollEvent === undefined
          ? []
          : evalIdsOfEnvelopes(
              [queuedCommand.pollEvent.envelope],
              queuedCommand.pollEvent.declared === undefined
                ? undefined
                : [
                    {
                      kind: queuedCommand.pollEvent.kind,
                      ...queuedCommand.pollEvent.declared,
                    },
                  ],
            ),
      ),
  );
  let filtered = danglingReceipts(messages).filter(
    ({ evalId: receipt }) => !sessions.tracks(agentId, receipt) && !queuedEvalIds.has(receipt),
  );
  if (filtered.length === 0) return;
  logForDebugging(
    `subagent resume: ${filtered.length} async REPL eval(s) never settled; answering each with a lost event`,
  );
  answerWithLostEvents(filtered, {
    text: lostEvalTextForResume,
    rowText: "Lost: the result never reached the agent",
    agentId,
  });
}
//@ chunk-fb0zsxh0.js:3600-4137 placement
/**
 * 把丢失的 eval 作为 attachment 事件入队（typed 或普通两种形状）。
 */
function answerWithLostEvents(receipts, { text, rowText, agentId }) {
  if (!codeModeAccepted()) return;
  let clientsDrawCalls = clientsDrawScriptCalls();
  let typedEventsOn = isReplTypedEventsOn();
  for (let { evalId } of receipts) {
    let at = new Date().toISOString();
    enqueuePollEvent({
      kind: EVAL_SETTLE_EVENT_KIND,
      ...(typedEventsOn
        ? {
            typed: {
              at,
              fields: {
                eval: evalId,
                status: EVAL_LOST_STATUS,
                text: text(evalId),
              },
            },
          }
        : {
            element: validatePollEvent({
              kind: EVAL_SETTLE_EVENT_KIND,
              at,
              content: text(evalId),
              attributes: {
                eval: String(evalId),
                status: EVAL_LOST_STATUS,
              },
            }),
          }),
      ...(agentId !== undefined && {
        agentId,
      }),
      allowReservedKind: true,
      ...(clientsDrawCalls
        ? {
            displayRows: replErrorMessages(rowText, {
              clientsDrawCalls: true,
              shownOnCall: true,
            }),
          }
        : {
            keepsRow: true,
          }),
    }).catch((error) => {
      logForDebugging(
        `async REPL lost event for eval #${evalId} not queued: ${isHostError(error) ? error.message : "non-Error rejection"}`,
        {
          level: "warn",
        },
      );
    });
  }
}
export { danglingReceipts, lostEvalText, reportLostReplEvals, reportLostSubagentReplEvals };
