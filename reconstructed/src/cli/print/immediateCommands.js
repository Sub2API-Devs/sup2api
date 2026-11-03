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
import { Xet } from "../../utils/promptSource.js";
import { isSlashCommand_2, im } from "../../utils/messageQueueManager.js";
import { aO } from "../../utils/historyFile.js";
import { parseSlashCommand } from "../../utils/slashCommandParsing.js";
import { I1r } from "../../plugins/functionHooks/commandHooks.js";
import { resolvePromptOrigin } from "../../utils/messageOrigin.js";
import { viewportInfo } from "../../plugins/functionHooks/surfaceBinding.js";
import { Yjt, aUo } from "../../plugins/functionHooks/commandRunDispatch.js";
import { rPe } from "../../bridge/inboundMessageOrigin.js";
import { logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { V_e, oX } from "../../plugins/functionHooks/promptSubmit.js";
import { isGoalIdleCheckinPaused } from "../../query/goalCheckIn.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { getActiveMessageQueue } from "../../query/presenceCheck.js";
import { logForDebugging } from "../../utils/debug.js";
import { MAX_CONTROL_RESPONSE_BYTES } from "../../bridge/controlRequests.js";
import { sleep } from "../../utils/sleep.js";

/**
 * 轮次进行中收到本地 stdin 的即时斜杠命令时立即执行（不等当前轮结束），并上报 tengu_immediate_command_executed。
 */
//@ chunk-tyg7f3ek.js:78432-78743 placement
function runImmediateSlashCommand(e, n) {
  try {
    if (!n.drain.turnUnderWay || e.uuid === void 0 || !isImmediateCommandsEnabled()) return;
    let r = planImmediateCommand(e, n);
    if (r === void 0) return;
    (watchImmediateCommandLifecycle(n.io),
      runCommandInGate(e.uuid, r),
      reportImmediateCommandRanAhead(e.uuid, n),
      logEvent("tengu_immediate_command_executed", {
        commandName: shippedCommandNameForAnalytics(r.command),
        fromKeybinding: !1,
        headless: !0,
      }));
  } catch (error) {
    logError(withTelemetryMessage(toError(error), "headless immediate command failed to start"));
  }
}
//@ chunk-tyg7f3ek.js:78743-79296 placement
function planImmediateCommand(e, n) {
  if (
    e.mode !== "prompt" ||
    e.localStdinOrigin !== !0 ||
    e.bridgeOrigin === !0 ||
    e.shouldQuery === !1 ||
    Xet(e.hostInitiator) !== void 0 ||
    !isSlashCommand_2(e)
  )
    return;
  let r = aO(e.value),
    s = r?.startsWith("/") ? parseSlashCommand(r) : null,
    h = s === null ? void 0 : findCommand(s.commandName, n.commands());
  if (
    s === null ||
    h === void 0 ||
    !isCommandEnabled(h) ||
    !I1r(h) ||
    !isImmediateCommand(h, s.args, "inline") ||
    !admitsBridgeAuthor(h, { origin: e.origin, relayAuthored: e.verifiedSlackHumanTurn === !0 }) ||
    n.closing()
  )
    return;
  return {
    command: getCommandName(h),
    args: s.args,
    origin: resolvePromptOrigin({
      submissionOrigin: e.origin,
      dispatchedOverBridge: void 0,
      promptSource: "sdk",
    }),
    presentation: viewportInfo(void 0),
  };
}
//@ chunk-tyg7f3ek.js:79296-79504 placement
async function reportImmediateCommandRanAhead(e, n) {
  try {
    await Yjt.get(e)?.answer;
  } catch {
    return;
  }
  try {
    if (n.queue.peek((r) => r.uuid === e) !== void 0) n.sayRanAhead(e);
  } catch (error) {
    logError(withTelemetryMessage(toError(error), "headless immediate command could not be reported as run"));
  }
}
//@ chunk-tyg7f3ek.js:79504-79734 placement
function watchImmediateCommandLifecycle(e) {
  if (WATCHED_IMMEDIATE_IOS.has(e)) return;
  (WATCHED_IMMEDIATE_IOS.add(e),
    rPe(e, (n, r) => {
      switch (r) {
        case "queued":
        case "started":
          return;
        case "completed":
        case "cancelled":
        case "discarded":
        case "refused":
          aUo(n)?.stop(`the command's frame was ${r} with no dispatch`);
      }
    }));
}
//@ chunk-tyg7f3ek.js:79734-80592 placement
class UnseenPanelModInputHold {
  messageQueue;
  isShown;
  hasLeft = !1;
  held = [];
  constructor(e, n) {
    ((this.messageQueue = e), (this.isShown = n));
  }
  setAside() {
    try {
      if (this.hasLeft && !this.isShown() && isImmediateCommandsEnabled()) {
        let dequeueAllMatching = this.messageQueue.dequeueAllMatching(isUnseenPluginPrompt);
        if (dequeueAllMatching.length > 0 && this.held.length === 0) logFeatureOk("ide_mods_unseen_hold");
        (this.held.push(...dequeueAllMatching),
          V_e.setAside(dequeueAllMatching.flatMap((r) => r.uuid ?? [])));
      } else this.putBack();
    } catch (error) {
      (logFeatureBad("ide_mods_unseen_hold", "threw"),
        logError(
          withTelemetryMessage(toError(error), "holding mod input of an unseen panel session failed"),
        ));
    }
  }
  noteLeft() {
    this.hasLeft = isImmediateCommandsEnabled();
  }
  noteShown() {
    ((this.hasLeft = !1), this.setAside());
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
    let dequeueAllMatching = this.messageQueue.dequeueAllMatching(isUnseenPluginPrompt);
    for (let n of [...this.held.splice(0), ...dequeueAllMatching]) this.messageQueue.enqueue(n);
    V_e.putBack();
  }
}
//@ chunk-tyg7f3ek.js:80592-80661 placement = _temp0 (1)
function isUnseenPluginPrompt(a_5) {
  return im(a_5) && a_5.origin?.kind === "plugin" && !isGoalIdleCheckinPaused(a_5.uuid);
}
//@ chunk-tyg7f3ek.js:80661-80705 placement
var vB = !0,
  isInitializeReplyWaitEnabled = () => getFeatureValue_CACHED_MAY_BE_STALE("tengu_steady_panda", vB);
//@ chunk-tyg7f3ek.js:80705-80874 placement
function waitBeforeInitializeReply(e) {
  try {
    let n = getActiveMessageQueue() ?? e.rescan();
    return n !== void 0 && isInitializeReplyWaitEnabled()
      ? waitForStartupSettled(n, e).catch(logError)
      : void 0;
  } catch (error) {
    (logForDebugging("initialize: the reply does not wait", { level: "error" }), logError(error));
    return;
  }
}
//@ chunk-tyg7f3ek.js:80874-81381 placement
async function waitForStartupSettled(
  e,
  {
    rescan: rescan,
    isReaderOwed: isReaderOwed,
    lookAgainOn: lookAgainOn,
    limitMs: limitMs = MAX_CONTROL_RESPONSE_BYTES,
  },
) {
  let now = Date.now(),
    abortController = new AbortController(),
    R = [],
    w,
    P = () => {};
  try {
    let L = Promise.race([
      drainPromiseChain(e, rescan).then(() => "settled"),
      sleep(limitMs, abortController.signal).then(() => "the limit"),
    ]).then((q) => {
      w = q;
    });
    for (let q of lookAgainOn) R.push(q(() => P()));
    while (!w && !isReaderOwed() && !oX.get()?.size)
      await Promise.race([
        L,
        new Promise((q) => {
          P = q;
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
async function drainPromiseChain(e, n) {
  let r = e;
  while (r) (await r, (r = n()));
}

export { UnseenPanelModInputHold, waitBeforeInitializeReply, runImmediateSlashCommand };
