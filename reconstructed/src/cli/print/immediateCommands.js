/**
 * cli/print/immediateCommands.ts
 *
 * 2.1.316 新增：立即执行的斜杠命令规划与生命周期（含未见面板 mod 输入暂存）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tyg7f3ek.js (10)
 * attribution: placement 10
 */
import { isImmediateCommandsEnabled, runCommandInGate, WATCHED_IMMEDIATE_IOS } from "./inboundMessages.js";
import { logEvent } from "../../services/analytics/index.js";
import {
  shippedCommandNameForAnalytics,
  findCommand,
  isCommandEnabled,
  isImmediateCommand,
  admitsBridgeAuthor,
  getCommandName,
} from "../../commands.js";
import { logError } from "../../utils/log.js";
import { withTelemetryMessage, toError } from "../../utils/errors.js";
import { originKindForWakeup } from "../../utils/promptSource.js";
import { isSlashCommand_2, isActiveMainAgentCommand } from "../../utils/messageQueueManager.js";
import { lastTextBlockText } from "../../utils/historyFile.js";
import { parseSlashCommand } from "../../utils/slashCommandParsing.js";
import { isPluginLocalCommand_2 } from "../../plugins/functionHooks/commandHooks.js";
import { resolvePromptOrigin } from "../../utils/messageOrigin.js";
import { viewportInfo } from "../../plugins/functionHooks/surfaceBinding.js";
import { inflightCommandRuns, takeInflightRun } from "../../plugins/functionHooks/commandRunDispatch.js";
import { wrapCommandLifecycle } from "../../bridge/inboundMessageOrigin.js";
import { logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { submitMarks, submitMarksSlot } from "../../plugins/functionHooks/promptSubmit.js";
import { isGoalIdleCheckinPaused } from "../../query/goalCheckIn.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { getActiveMessageQueue } from "../../query/presenceCheck.js";
import { logForDebugging } from "../../utils/debug.js";
import { MAX_CONTROL_RESPONSE_BYTES } from "../../bridge/controlRequests.js";
import { sleep } from "../../utils/sleep.js";

//@ chunk-tyg7f3ek.js:78432-78743 placement
/**
 * 轮次进行中收到本地 stdin 的即时斜杠命令时立即执行（不等当前轮结束），并上报 tengu_immediate_command_executed。
 */
function runImmediateSlashCommand(e, n) {
  try {
    if (!n.drain.turnUnderWay || e.uuid === undefined || !isImmediateCommandsEnabled()) return;
    let r = planImmediateCommand(e, n);
    if (r === undefined) return;
    watchImmediateCommandLifecycle(n.io);
    runCommandInGate(e.uuid, r);
    reportImmediateCommandRanAhead(e.uuid, n);
    logEvent("tengu_immediate_command_executed", {
      commandName: shippedCommandNameForAnalytics(r.command),
      fromKeybinding: false,
      headless: true,
    });
  } catch (error) {
    logError(withTelemetryMessage(toError(error), "headless immediate command failed to start"));
  }
}
//@ chunk-tyg7f3ek.js:78743-79296 placement
function planImmediateCommand(e, n) {
  if (
    e.mode !== "prompt" ||
    e.localStdinOrigin !== true ||
    e.bridgeOrigin === true ||
    e.shouldQuery === false ||
    originKindForWakeup(e.hostInitiator) !== undefined ||
    !isSlashCommand_2(e)
  )
    return;
  let r = lastTextBlockText(e.value);
  let s = r?.startsWith("/") ? parseSlashCommand(r) : null;
  let h = s === null ? undefined : findCommand(s.commandName, n.commands());
  if (
    s === null ||
    h === undefined ||
    !isCommandEnabled(h) ||
    !isPluginLocalCommand_2(h) ||
    !isImmediateCommand(h, s.args, "inline") ||
    !admitsBridgeAuthor(h, {
      origin: e.origin,
      relayAuthored: e.verifiedSlackHumanTurn === true,
    }) ||
    n.closing()
  )
    return;
  return {
    command: getCommandName(h),
    args: s.args,
    origin: resolvePromptOrigin({
      submissionOrigin: e.origin,
      dispatchedOverBridge: undefined,
      promptSource: "sdk",
    }),
    presentation: viewportInfo(undefined),
  };
}
//@ chunk-tyg7f3ek.js:79296-79504 placement
async function reportImmediateCommandRanAhead(uuid, n) {
  try {
    await inflightCommandRuns.get(uuid)?.answer;
  } catch {
    return;
  }
  try {
    if (n.queue.peek((r) => r.uuid === uuid) !== undefined) n.sayRanAhead(uuid);
  } catch (error) {
    logError(withTelemetryMessage(toError(error), "headless immediate command could not be reported as run"));
  }
}
//@ chunk-tyg7f3ek.js:79504-79734 placement
function watchImmediateCommandLifecycle(e) {
  if (WATCHED_IMMEDIATE_IOS.has(e)) return;
  WATCHED_IMMEDIATE_IOS.add(e);
  wrapCommandLifecycle(e, (n, r) => {
    switch (r) {
      case "queued":
      case "started":
        return;
      case "completed":
      case "cancelled":
      case "discarded":
      case "refused":
        takeInflightRun(n)?.stop(`the command's frame was ${r} with no dispatch`);
    }
  });
}
//@ chunk-tyg7f3ek.js:79734-80592 placement
class UnseenPanelModInputHold {
  messageQueue;
  isShown;
  hasLeft = false;
  held = [];
  constructor(messageQueue, isShown) {
    this.messageQueue = messageQueue;
    this.isShown = isShown;
  }
  setAside() {
    try {
      if (this.hasLeft && !this.isShown() && isImmediateCommandsEnabled()) {
        let n = this.messageQueue.dequeueAllMatching(isUnseenPluginPrompt);
        if (n.length > 0 && this.held.length === 0) logFeatureOk("ide_mods_unseen_hold");
        this.held.push(...n);
        submitMarks.setAside(n.flatMap((r) => r.uuid ?? []));
      } else this.putBack();
    } catch (error) {
      logFeatureBad("ide_mods_unseen_hold", "threw");
      logError(withTelemetryMessage(toError(error), "holding mod input of an unseen panel session failed"));
    }
  }
  noteLeft() {
    this.hasLeft = isImmediateCommandsEnabled();
  }
  noteShown() {
    this.hasLeft = false;
    this.setAside();
  }
  noteSwitchedOff() {
    this.noteShown();
  }
  giveBack() {
    try {
      this.putBack();
    } catch (error) {
      logError(
        withTelemetryMessage(
          toError(error),
          "giving back the held mod input of an unseen panel session failed",
        ),
      );
    }
  }
  putBack() {
    if (this.held.length === 0) return;
    let e = this.messageQueue.dequeueAllMatching(isUnseenPluginPrompt);
    for (let n of [...this.held.splice(0), ...e]) this.messageQueue.enqueue(n);
    submitMarks.putBack();
  }
}
//@ chunk-tyg7f3ek.js:80592-80661 placement = _temp0 (1)
function isUnseenPluginPrompt(a_5) {
  return isActiveMainAgentCommand(a_5) && a_5.origin?.kind === "plugin" && !isGoalIdleCheckinPaused(a_5.uuid);
}
//@ chunk-tyg7f3ek.js:80661-80705 placement
var INITIALIZE_REPLY_WAIT_DEFAULT = true;
var isInitializeReplyWaitEnabled = () =>
  getFeatureValue_CACHED_MAY_BE_STALE("tengu_steady_panda", INITIALIZE_REPLY_WAIT_DEFAULT);
//@ chunk-tyg7f3ek.js:80705-80874 placement
function waitBeforeInitializeReply(e) {
  try {
    let n = getActiveMessageQueue() ?? e.rescan();
    return n !== undefined && isInitializeReplyWaitEnabled()
      ? waitForStartupSettled(n, e).catch(logError)
      : undefined;
  } catch (error) {
    logForDebugging("initialize: the reply does not wait", {
      level: "error",
    });
    logError(error);
    return;
  }
}
//@ chunk-tyg7f3ek.js:80874-81381 placement
async function waitForStartupSettled(
  e,
  { rescan, isReaderOwed, lookAgainOn, limitMs = MAX_CONTROL_RESPONSE_BYTES },
) {
  let now = Date.now();
  let abortController = new AbortController();
  let R = [];
  let w;
  let P = () => {};
  try {
    let L = Promise.race([
      drainPromiseChain(e, rescan).then(() => "settled"),
      sleep(limitMs, abortController.signal).then(() => "the limit"),
    ]).then((q) => {
      w = q;
    });
    for (let q of lookAgainOn) R.push(q(() => P()));
    while (!w && !isReaderOwed() && !submitMarksSlot.get()?.size)
      await Promise.race([
        L,
        new Promise((resolve) => {
          P = resolve;
        }),
      ]);
  } finally {
    abortController.abort();
    for (let L of R) L();
    logForDebugging(
      `initialize: the reply waited ${Date.now() - now}ms for the session's start (ended by: ${w ?? "the reader being owed"})`,
    );
  }
}
//@ chunk-tyg7f3ek.js:81381-81434 placement
async function drainPromiseChain(e, rescan) {
  let r = e;
  while (r) {
    await r;
    r = rescan();
  }
}
export { UnseenPanelModInputHold, waitBeforeInitializeReply, runImmediateSlashCommand };
