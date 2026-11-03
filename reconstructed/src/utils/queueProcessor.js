/**
 * utils/queueProcessor.ts
 *
 * 命令队列处理：主循环空闲时取出下一批排队输入执行。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/queueProcessor.ts
 * pieces: chunk-18hwfzwa.js (8)
 * attribution: placement 7, fingerprint 1
 */
import { init_react_production } from "../../vendor/react/cjs/react.production.js";
import {
  isSendableQueuedCommand,
  isSlashCommand,
  isMainAgentCommand,
  sameSchedulingPlugin,
  isActiveMainAgentCommand,
} from "./messageQueueManager.js";
import { peekNextQueued } from "../cli/print/rewindStandIn.js";
import { getActiveMessageQueue } from "../query/presenceCheck.js";
import { isGoalIdleCheckinPaused } from "../query/goalCheckIn.js";
import { reportQueuedSubmissions } from "./hooks/postSamplingHooks.js";
import { markMessagesRead } from "../bridge/readReceipts.js";
import { isHumanOrigin } from "./turnOrigin.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { parseSlashCommand } from "./slashCommandParsing.js";
import { findCommand, isCommandEnabled } from "../commands.js";
import { lastTextBlockText } from "./historyFile.js";
import { resolveSlashCommand } from "../screens/repl/PromptSubmitController.js";

//@ chunk-18hwfzwa.js:1661153-1661157 placement
/**
 * 惰性模块初始化调用 j()。
 */
init_react_production();
//@ chunk-18hwfzwa.js:1661157-1661253 placement
/**
 * 队首可处理命令仍在审查（screeningPending）时不取，否则按优先级取下一个。
 */
function peekNextProcessableCommand(queue) {
  if (queue.getCommandQueue().find(isSendableQueuedCommand)?.screeningPending === true) return;
  return peekNextQueued(queue, isSendableQueuedCommand);
}
//@ chunk-18hwfzwa.js:1661334-1662561 fingerprint = processQueueIfReady (0.335)
/**
 * 主循环空闲时从命令队列取出下一批（同类 prompt 可合并、bash 单独）并执行。
 */
function processQueueIfReady({ queue, executeInput, waitsOnSessionStart = () => true, screeningStale }) {
  if (getActiveMessageQueue() !== undefined) {
    let kt = queue.peek((cmd) => isSendableQueuedCommand(cmd) && isGoalIdleCheckinPaused(cmd.uuid));
    let At = kt ?? peekNextProcessableCommand(queue);
    if (!At || (kt === undefined && waitsOnSessionStart(At)))
      return {
        processed: false,
      };
    drainOneQueuedCommand(queue, At, executeInput);
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
  let Re = next.shouldQuery === false;
  let Be = false;
  let He = 0;
  let We = true;
  let ze = false;
  let Xe = false;
  let rt = queue.dequeueAllMatching((cmd) => {
    if (Be) return false;
    if (isMainAgentCommand(cmd) && cmd.screeningPending === true) {
      Be = true;
      return false;
    }
    if (isMainAgentCommand(cmd)) {
      if (!sameSchedulingPlugin(cmd, next)) {
        Be = ze;
        Xe = true;
        return false;
      }
      if (Xe && cmd !== next) return false;
    }
    let At =
      We &&
      isMainAgentCommand(cmd) &&
      cmd.drainOnly !== true &&
      cmd.promptSubmitted !== undefined &&
      cmd.promptSubmitted.stopped === undefined &&
      screeningStale !== undefined &&
      !screeningStale(cmd.promptSubmitted);
    if (isMainAgentCommand(cmd) && (cmd.promptSubmitted !== undefined || cmd.drainOnly === true) && !At) {
      Be = true;
      if (He > 0) return false;
    }
    let It =
      isActiveMainAgentCommand(cmd) &&
      !isSlashCommand(cmd) &&
      cmd.mode === targetMode &&
      (cmd.shouldQuery === false) === Re;
    if (He > 0 && cmd.ideSelection?.text) {
      Be = true;
      return false;
    }
    if (
      He > 0 &&
      We &&
      isMainAgentCommand(cmd) &&
      !(At && It && typeof cmd.value === "string" && !cmd.value.includes("@"))
    ) {
      Be = true;
      return false;
    }
    if (It) {
      He++;
      We = At;
      ze ||= cmd === next;
    }
    return It;
  });
  if (rt.length === 0)
    return {
      processed: false,
    };
  reportQueuedSubmissions(rt, "turn_end");
  markMessagesRead(rt);
  queue.setInFlightDrainBatch(rt);
  executeInput(rt).finally(() => queue.clearInFlightDrainBatch(rt));
  return {
    processed: true,
  };
}
//@ chunk-18hwfzwa.js:1662561-1662712 placement
function drainOneQueuedCommand(queue, x, executeInput) {
  let L = [queue.dequeue((ee) => ee === x)];
  reportQueuedSubmissions(L, "turn_end");
  markMessagesRead(L);
  queue.setInFlightDrainBatch(L);
  executeInput(L).finally(() => queue.clearInFlightDrainBatch(L));
}
//@ chunk-18hwfzwa.js:1662712-1662742 placement
/**
 * neverSubscribed：恒 false 的订阅判定占位。
 */
var NOOP_UNSUBSCRIBE = () => () => {};
var neverSubscribed = () => false;
//@ chunk-18hwfzwa.js:1662742-1662859 placement
var NON_INTERRUPTING_DIALOGS = new Set([
  "managed_settings_security",
  "sandbox_network_access",
  "mcp_url_elicitation",
]);
var TENGU_WOOLLY_OWL = "tengu_woolly_owl";
//@ chunk-18hwfzwa.js:1662859-1663151 placement
/**
 * 桥接来的斜杠命令是否不可用
 */
function isBridgeSlashCommandUnavailable(h, commands) {
  if (h.bridgeOrigin !== true || h.textNotTyped === true || !isHumanOrigin(h.origin)) return false;
  if (getFeatureValue_CACHED_MAY_BE_STALE(TENGU_WOOLLY_OWL, false)) return false;
  if (typeof h.value !== "string" || !h.value.startsWith("/")) return false;
  let slashCommand = parseSlashCommand(h.value);
  if (!slashCommand) return false;
  let command = findCommand(slashCommand.commandName, commands);
  return (
    command !== undefined && command.type === "local" && command.name === "clear" && isCommandEnabled(command)
  );
}
//@ chunk-18hwfzwa.js:1663151-1663315 placement = prependModeCharacterToInput (1)
function prependModeCharacterToInput_2(input, mode) {
  let D = input.mode === "bash" ? null : lastTextBlockText(input.value);
  let L = D === null || !D.startsWith("/") ? null : parseSlashCommand(D);
  let ee = L === null ? undefined : resolveSlashCommand(L, mode);
  return ee !== undefined && isCommandEnabled(ee) ? ee : undefined;
}
export {
  NON_INTERRUPTING_DIALOGS,
  NOOP_UNSUBSCRIBE,
  peekNextProcessableCommand,
  prependModeCharacterToInput_2,
  isBridgeSlashCommandUnavailable,
  neverSubscribed,
  processQueueIfReady,
};
