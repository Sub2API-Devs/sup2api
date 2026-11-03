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
import { j } from "../../vendor/react/cjs/react.production.js";
import { Ffe, isSlashCommand, $f, Dfn, im } from "./messageQueueManager.js";
import { peekNextQueued } from "../cli/print/rewindStandIn.js";
import { getActiveMessageQueue } from "../query/presenceCheck.js";
import { isGoalIdleCheckinPaused } from "../query/goalCheckIn.js";
import { reportQueuedSubmissions } from "./hooks/postSamplingHooks.js";
import { markMessagesRead } from "../bridge/readReceipts.js";
import { isHumanOrigin } from "./turnOrigin.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { parseSlashCommand } from "./slashCommandParsing.js";
import { findCommand, isCommandEnabled } from "../commands.js";
import { aO } from "./historyFile.js";
import { resolveSlashCommand } from "../screens/repl/PromptSubmitController.js";

/**
 * 惰性模块初始化调用 j()。
 */
//@ chunk-18hwfzwa.js:1661153-1661157 placement
j();
/**
 * 队首可处理命令仍在审查（screeningPending）时不取，否则按优先级取下一个。
 */
//@ chunk-18hwfzwa.js:1661157-1661253 placement
function peekNextProcessableCommand(h) {
  if (h.getCommandQueue().find(Ffe)?.screeningPending === !0) return;
  return peekNextQueued(h, Ffe);
}
/**
 * 主循环空闲时从命令队列取出下一批（同类 prompt 可合并、bash 单独）并执行。
 */
//@ chunk-18hwfzwa.js:1661334-1662561 fingerprint = processQueueIfReady (0.335)
function processQueueIfReady({
  queue: queue,
  executeInput: executeInput,
  waitsOnSessionStart: waitsOnSessionStart = () => !0,
  screeningStale: screeningStale,
}) {
  if (getActiveMessageQueue() !== void 0) {
    let peek = queue.peek((cmd) => Ffe(cmd) && isGoalIdleCheckinPaused(cmd.uuid)),
      At = peek ?? peekNextProcessableCommand(queue);
    if (!At || (peek === void 0 && waitsOnSessionStart(At))) return { processed: !1 };
    return (drainOneQueuedCommand(queue, At, executeInput), { processed: !0 });
  }
  let next = peekNextProcessableCommand(queue);
  if (!next) return { processed: !1 };
  if (isSlashCommand(next) || next.mode === "bash")
    return (drainOneQueuedCommand(queue, next, executeInput), { processed: !0 });
  let targetMode = next.mode,
    Re = next.shouldQuery === !1,
    Be = !1,
    He = 0,
    We = !0,
    ze = !1,
    Xe = !1,
    dequeueAllMatching = queue.dequeueAllMatching((cmd) => {
      if (Be) return !1;
      if ($f(cmd) && cmd.screeningPending === !0) return ((Be = !0), !1);
      if ($f(cmd)) {
        if (!Dfn(cmd, next)) return ((Be = ze), (Xe = !0), !1);
        if (Xe && cmd !== next) return !1;
      }
      let At =
        We &&
        $f(cmd) &&
        cmd.drainOnly !== !0 &&
        cmd.promptSubmitted !== void 0 &&
        cmd.promptSubmitted.stopped === void 0 &&
        screeningStale !== void 0 &&
        !screeningStale(cmd.promptSubmitted);
      if ($f(cmd) && (cmd.promptSubmitted !== void 0 || cmd.drainOnly === !0) && !At) {
        if (((Be = !0), He > 0)) return !1;
      }
      let It = im(cmd) && !isSlashCommand(cmd) && cmd.mode === targetMode && (cmd.shouldQuery === !1) === Re;
      if (He > 0 && cmd.ideSelection?.text) return ((Be = !0), !1);
      if (He > 0 && We && $f(cmd) && !(At && It && typeof cmd.value === "string" && !cmd.value.includes("@")))
        return ((Be = !0), !1);
      if (It) (He++, (We = At), (ze ||= cmd === next));
      return It;
    });
  if (dequeueAllMatching.length === 0) return { processed: !1 };
  return (
    reportQueuedSubmissions(dequeueAllMatching, "turn_end"),
    markMessagesRead(dequeueAllMatching),
    queue.setInFlightDrainBatch(dequeueAllMatching),
    executeInput(dequeueAllMatching).finally(() => queue.clearInFlightDrainBatch(dequeueAllMatching)),
    { processed: !0 }
  );
}
//@ chunk-18hwfzwa.js:1662561-1662712 placement
function drainOneQueuedCommand(h, x, D) {
  let L = [h.dequeue((ee) => ee === x)];
  (reportQueuedSubmissions(L, "turn_end"),
    markMessagesRead(L),
    h.setInFlightDrainBatch(L),
    D(L).finally(() => h.clearInFlightDrainBatch(L)));
}
//@ chunk-18hwfzwa.js:1662712-1662742 placement
var NOOP_UNSUBSCRIBE = () => () => {},
  rCt = () => !1;
//@ chunk-18hwfzwa.js:1662742-1662859 placement
var NON_INTERRUPTING_DIALOGS = new Set([
    "managed_settings_security",
    "sandbox_network_access",
    "mcp_url_elicitation",
  ]),
  TENGU_WOOLLY_OWL = "tengu_woolly_owl";
/**
 * 桥接来的斜杠命令是否不可用
 */
//@ chunk-18hwfzwa.js:1662859-1663151 placement
function isBridgeSlashCommandUnavailable(h, x) {
  if (h.bridgeOrigin !== !0 || h.textNotTyped === !0 || !isHumanOrigin(h.origin)) return !1;
  if (getFeatureValue_CACHED_MAY_BE_STALE(TENGU_WOOLLY_OWL, !1)) return !1;
  if (typeof h.value !== "string" || !h.value.startsWith("/")) return !1;
  let D = parseSlashCommand(h.value);
  if (!D) return !1;
  let L = findCommand(D.commandName, x);
  return L !== void 0 && L.type === "local" && L.name === "clear" && isCommandEnabled(L);
}
//@ chunk-18hwfzwa.js:1663151-1663315 placement = prependModeCharacterToInput (1)
function prependModeCharacterToInput_2(input, mode) {
  let D = input.mode === "bash" ? null : aO(input.value),
    L = D === null || !D.startsWith("/") ? null : parseSlashCommand(D),
    ee = L === null ? void 0 : resolveSlashCommand(L, mode);
  return ee !== void 0 && isCommandEnabled(ee) ? ee : void 0;
}

export {
  NON_INTERRUPTING_DIALOGS,
  NOOP_UNSUBSCRIBE,
  peekNextProcessableCommand,
  prependModeCharacterToInput_2,
  isBridgeSlashCommandUnavailable,
  rCt,
  processQueueIfReady,
};
