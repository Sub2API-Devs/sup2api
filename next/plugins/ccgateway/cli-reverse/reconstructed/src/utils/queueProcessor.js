/**
 * utils/queueProcessor.ts
 *
 * 命令队列处理：主循环空闲时取出下一批排队输入执行。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/queueProcessor.ts
 * pieces: chunk-czq1j3j2.js (10)
 * attribution: placement 7, layout 2, fingerprint 1
 */
import { init_react_production } from "../../vendor/react/cjs/react.production.js";
import {
  isIdleDrainableMainThreadCommand,
  isMainAgentCommand,
  sameSchedulingPlugin,
  isDrainableMainThreadCommand,
} from "./messageQueueManager.js";
import { peekNextQueued } from "../cli/print/rewindStandIn.js";
import { isPeerOrSlackPing } from "./messageProvenance.js";
import { looksLikeSlashInput, findCommand, isCommandEnabled } from "../commands.js";
import { getActiveMessageQueue } from "../query/presenceCheck.js";
import { isGoalIdleCheckinPaused } from "../query/goalCheckIn.js";
import { reportQueuedSubmissions } from "./hooks/postSamplingHooks.js";
import { markMessagesRead } from "../bridge/readReceipts.js";
import { codeModeAccepted } from "./codeMode/accepted.js";
import { isHumanOrigin } from "./turnOrigin.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { parseSlashCommand } from "./slashCommandParsing.js";
import { lastTextBlockText } from "./historyFile.js";
import { resolveSlashCommand } from "../screens/repl/PromptSubmitController.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:1702443-1702447 placement
/**
 * 惰性模块初始化调用 j()。
 */
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1702443", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1706882-1706976 placement
/**
 * 队首可处理命令仍在审查（screeningPending）时不取，否则按优先级取下一个。
 */
function peekNextProcessableCommand(queue) {
  if (queue.getCommandQueue().find(isIdleDrainableMainThreadCommand)?.screeningPending === true) return;
  return peekNextQueued(queue, isIdleDrainableMainThreadCommand);
}
//@ chunk-czq1j3j2.js:1706976-1707057 layout (2.1.88 match: isSlashCommand, 1)
/**
 * 值以 / 开头的命令；peer/slack 来源且 skipSlashCommands 时不算。
 */
function isSlashCommand(cmd) {
  if (cmd.skipSlashCommands && isPeerOrSlackPing(cmd.origin)) return false;
  return looksLikeSlashInput(cmd.value);
}
//@ chunk-czq1j3j2.js:1707057-1708283 fingerprint (2.1.88 match: processQueueIfReady, 0.335)
/**
 * 主循环空闲时从命令队列取出下一批（同类 prompt 可合并、bash 单独）并执行。
 */
function processQueueIfReady({ queue, executeInput, waitsOnSessionStart = () => true, screeningStale }) {
  if (getActiveMessageQueue() !== undefined) {
    let pausedCheckin = queue.peek(
      (cmd) => isIdleDrainableMainThreadCommand(cmd) && isGoalIdleCheckinPaused(cmd.uuid),
    );
    let next = pausedCheckin ?? peekNextProcessableCommand(queue);
    if (!next || (pausedCheckin === undefined && waitsOnSessionStart(next)))
      return {
        processed: false,
      };
    drainOneQueuedCommand(queue, next, executeInput);
    return {
      processed: true,
    };
  }
  let next = peekNextProcessableCommand(queue);
  if (!next)
    return {
      processed: false,
    };
  if (isSlashCommand(next) || next.mode === "bash") {
    drainOneQueuedCommand(queue, next, executeInput);
    return {
      processed: true,
    };
  }
  let targetMode = next.mode;
  let noQuery = next.shouldQuery === false;
  let stop = false;
  let selected = 0;
  let allowNoQuery = true;
  let sawNext = false;
  let blockedByStale = false;
  let batch = queue.dequeueAllMatching((cmd) => {
    if (stop) return false;
    if (isMainAgentCommand(cmd) && cmd.screeningPending === true) {
      stop = true;
      return false;
    }
    if (isMainAgentCommand(cmd)) {
      if (!sameSchedulingPlugin(cmd, next)) {
        stop = sawNext;
        blockedByStale = true;
        return false;
      }
      if (blockedByStale && cmd !== next) return false;
    }
    let submittedNoQuery =
      allowNoQuery &&
      isMainAgentCommand(cmd) &&
      cmd.drainOnly !== true &&
      cmd.promptSubmitted !== undefined &&
      cmd.promptSubmitted.stopped === undefined &&
      screeningStale !== undefined &&
      !screeningStale(cmd.promptSubmitted);
    if (
      isMainAgentCommand(cmd) &&
      (cmd.promptSubmitted !== undefined || cmd.drainOnly === true) &&
      !submittedNoQuery
    ) {
      stop = true;
      if (selected > 0) return false;
    }
    let drainable =
      isDrainableMainThreadCommand(cmd) &&
      !isSlashCommand(cmd) &&
      cmd.mode === targetMode &&
      (cmd.shouldQuery === false) === noQuery;
    if (selected > 0 && cmd.ideSelection?.text) {
      stop = true;
      return false;
    }
    if (
      selected > 0 &&
      allowNoQuery &&
      isMainAgentCommand(cmd) &&
      !(submittedNoQuery && drainable && typeof cmd.value === "string" && !cmd.value.includes("@"))
    ) {
      stop = true;
      return false;
    }
    if (drainable) {
      selected++;
      allowNoQuery = submittedNoQuery;
      sawNext ||= cmd === next;
    }
    return drainable;
  });
  if (batch.length === 0)
    return {
      processed: false,
    };
  reportQueuedSubmissions(batch, "turn_end");
  markMessagesRead(batch);
  queue.setInFlightDrainBatch(batch);
  executeInput(batch).finally(() => queue.clearInFlightDrainBatch(batch));
  return {
    processed: true,
  };
}
//@ chunk-czq1j3j2.js:1708283-1708434 placement
function drainOneQueuedCommand(queue, command, executeInput) {
  let drained = [queue.dequeue((candidate) => candidate === command)];
  reportQueuedSubmissions(drained, "turn_end");
  markMessagesRead(drained);
  queue.setInFlightDrainBatch(drained);
  executeInput(drained).finally(() => queue.clearInFlightDrainBatch(drained));
}
//@ chunk-czq1j3j2.js:1708434-1708464 placement
/**
 * neverSubscribed：恒 false 的订阅判定占位。
 */
var NOOP_UNSUBSCRIBE = () => () => {};
var neverSubscribed = () => false;
//@ chunk-czq1j3j2.js:1708464-1708541 layout
function scriptAskHoldsSlot() {
  return codeModeAccepted() ? require("./codeMode/scriptAskDeclined.js").scriptAskHolds : null;
}
//@ chunk-czq1j3j2.js:1708541-1708658 placement
var NON_INTERRUPTING_DIALOGS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var TENGU_WOOLLY_OWL;
deferInit("chunk-czq1j3j2.js:1708541", () => {
  NON_INTERRUPTING_DIALOGS = new Set([
    "managed_settings_security",
    "sandbox_network_access",
    "mcp_url_elicitation",
  ]);
  TENGU_WOOLLY_OWL = "tengu_woolly_owl";
});
//@ chunk-czq1j3j2.js:1708658-1708950 placement
/**
 * 桥接来的斜杠命令是否不可用
 */
function isBridgeSlashCommandUnavailable(command, commands) {
  if (command.bridgeOrigin !== true || command.textNotTyped === true || !isHumanOrigin(command.origin))
    return false;
  if (getFeatureValue_CACHED_MAY_BE_STALE(TENGU_WOOLLY_OWL, false)) return false;
  if (typeof command.value !== "string" || !command.value.startsWith("/")) return false;
  let slashCommand = parseSlashCommand(command.value);
  if (!slashCommand) return false;
  let command_2 = findCommand(slashCommand.commandName, commands);
  return (
    command_2 !== undefined &&
    command_2.type === "local" &&
    command_2.name === "clear" &&
    isCommandEnabled(command_2)
  );
}
//@ chunk-czq1j3j2.js:1708950-1709114 placement (2.1.88 match: prependModeCharacterToInput, 1)
function prependModeCharacterToInput_2(input, mode) {
  let textBlock = input.mode === "bash" ? null : lastTextBlockText(input.value);
  let slashCommand = textBlock === null || !textBlock.startsWith("/") ? null : parseSlashCommand(textBlock);
  let resolved = slashCommand === null ? undefined : resolveSlashCommand(slashCommand, mode);
  return resolved !== undefined && isCommandEnabled(resolved) ? resolved : undefined;
}
export {
  NON_INTERRUPTING_DIALOGS,
  NOOP_UNSUBSCRIBE,
  peekNextProcessableCommand,
  prependModeCharacterToInput_2,
  isBridgeSlashCommandUnavailable,
  scriptAskHoldsSlot,
  neverSubscribed,
  processQueueIfReady,
};
