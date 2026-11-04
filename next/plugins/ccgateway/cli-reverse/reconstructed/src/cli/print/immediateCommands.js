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
function runImmediateSlashCommand(command, host) {
  try {
    if (!host.drain.turnUnderWay || command.uuid === undefined || !isImmediateCommandsEnabled()) return;
    let plan = planImmediateCommand(command, host);
    if (plan === undefined) return;
    watchImmediateCommandLifecycle(host.io);
    runCommandInGate(command.uuid, plan);
    reportImmediateCommandRanAhead(command.uuid, host);
    logEvent("tengu_immediate_command_executed", {
      commandName: shippedCommandNameForAnalytics(plan.command),
      fromKeybinding: false,
      headless: true,
    });
  } catch (error) {
    logError(withTelemetryMessage(toError(error), "headless immediate command failed to start"));
  }
}
//@ chunk-tyg7f3ek.js:78743-79296 placement
function planImmediateCommand(command, host) {
  if (
    command.mode !== "prompt" ||
    command.localStdinOrigin !== true ||
    command.bridgeOrigin === true ||
    command.shouldQuery === false ||
    originKindForWakeup(command.hostInitiator) !== undefined ||
    !isSlashCommand_2(command)
  )
    return;
  let text = lastTextBlockText(command.value);
  let parsed = text?.startsWith("/") ? parseSlashCommand(text) : null;
  let commandDef = parsed === null ? undefined : findCommand(parsed.commandName, host.commands());
  if (
    parsed === null ||
    commandDef === undefined ||
    !isCommandEnabled(commandDef) ||
    !isPluginLocalCommand_2(commandDef) ||
    !isImmediateCommand(commandDef, parsed.args, "inline") ||
    !admitsBridgeAuthor(commandDef, {
      origin: command.origin,
      relayAuthored: command.verifiedSlackHumanTurn === true,
    }) ||
    host.closing()
  )
    return;
  return {
    command: getCommandName(commandDef),
    args: parsed.args,
    origin: resolvePromptOrigin({
      submissionOrigin: command.origin,
      dispatchedOverBridge: undefined,
      promptSource: "sdk",
    }),
    presentation: viewportInfo(undefined),
  };
}
//@ chunk-tyg7f3ek.js:79296-79504 placement
async function reportImmediateCommandRanAhead(uuid, host) {
  try {
    await inflightCommandRuns.get(uuid)?.answer;
  } catch {
    return;
  }
  try {
    if (host.queue.peek((queued) => queued.uuid === uuid) !== undefined) host.sayRanAhead(uuid);
  } catch (error) {
    logError(withTelemetryMessage(toError(error), "headless immediate command could not be reported as run"));
  }
}
//@ chunk-tyg7f3ek.js:79504-79734 placement
function watchImmediateCommandLifecycle(io) {
  if (WATCHED_IMMEDIATE_IOS.has(io)) return;
  WATCHED_IMMEDIATE_IOS.add(io);
  wrapCommandLifecycle(io, (commandUuid, outcome) => {
    switch (outcome) {
      case "queued":
      case "started":
        return;
      case "completed":
      case "cancelled":
      case "discarded":
      case "refused":
        takeInflightRun(commandUuid)?.stop(`the command's frame was ${outcome} with no dispatch`);
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
        let unseen = this.messageQueue.dequeueAllMatching(isUnseenPluginPrompt);
        if (unseen.length > 0 && this.held.length === 0) logFeatureOk("ide_mods_unseen_hold");
        this.held.push(...unseen);
        submitMarks.setAside(unseen.flatMap((command) => command.uuid ?? []));
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
    let unseen = this.messageQueue.dequeueAllMatching(isUnseenPluginPrompt);
    for (let command of [...this.held.splice(0), ...unseen]) this.messageQueue.enqueue(command);
    submitMarks.putBack();
  }
}
//@ chunk-tyg7f3ek.js:80592-80661 placement (2.1.88 match: _temp0, 1)
function isUnseenPluginPrompt(a_5) {
  return isActiveMainAgentCommand(a_5) && a_5.origin?.kind === "plugin" && !isGoalIdleCheckinPaused(a_5.uuid);
}
//@ chunk-tyg7f3ek.js:80661-80705 placement
var INITIALIZE_REPLY_WAIT_DEFAULT = true;
var isInitializeReplyWaitEnabled = () =>
  getFeatureValue_CACHED_MAY_BE_STALE("tengu_steady_panda", INITIALIZE_REPLY_WAIT_DEFAULT);
//@ chunk-tyg7f3ek.js:80705-80874 placement
function waitBeforeInitializeReply(host) {
  try {
    let queue = getActiveMessageQueue() ?? host.rescan();
    return queue !== undefined && isInitializeReplyWaitEnabled()
      ? waitForStartupSettled(queue, host).catch(logError)
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
  queue,
  { rescan, isReaderOwed, lookAgainOn, limitMs = MAX_CONTROL_RESPONSE_BYTES },
) {
  let now = Date.now();
  let abortController = new AbortController();
  let unsubscribes = [];
  let endedBy;
  let wake = () => {};
  try {
    let race = Promise.race([
      drainPromiseChain(queue, rescan).then(() => "settled"),
      sleep(limitMs, abortController.signal).then(() => "the limit"),
    ]).then((outcome) => {
      endedBy = outcome;
    });
    for (let subscribe of lookAgainOn) unsubscribes.push(subscribe(() => wake()));
    while (!endedBy && !isReaderOwed() && !submitMarksSlot.get()?.size)
      await Promise.race([
        race,
        new Promise((resolve) => {
          wake = resolve;
        }),
      ]);
  } finally {
    abortController.abort();
    for (let unsubscribe of unsubscribes) unsubscribe();
    logForDebugging(
      `initialize: the reply waited ${Date.now() - now}ms for the session's start (ended by: ${endedBy ?? "the reader being owed"})`,
    );
  }
}
//@ chunk-tyg7f3ek.js:81381-81434 placement
async function drainPromiseChain(queue, rescan) {
  let step = queue;
  while (step) {
    await step;
    step = rescan();
  }
}
export { UnseenPanelModInputHold, waitBeforeInitializeReply, runImmediateSlashCommand };
