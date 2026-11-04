/**
 * screens/repl/sendNow.ts
 *
 * 2.1.316 新增。立即发送排队消息。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (12)
 * attribution: placement 12
 */
import { plural, collapseWhitespace, toWellFormedString } from "../../utils/stringUtils.js";
import { stripAnsiSequences } from "../../utils/printableName.js";
import { useKeybindingContext } from "../../keybindings/KeybindingContext.js";
import { parseBindings, chordToString } from "../../keybindings/parser.js";
import { DEFAULT_BINDINGS } from "../../keybindings/defaultBindings.js";
import { isActionUnbound, getActionChords } from "../../keybindings/resolver.js";
import { supportsExtendedKeys } from "../../ink/terminal.js";
import { getEffortLevelIfSupported, resolveEffortLevel } from "../../utils/effort.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnumOpt, fromEnum, lit as lit_2 } from "../../services/analytics/safeMetadata.js";
import { isQueuedSendNowEnabled, isSendNowKeyEnabled } from "../../components/PromptInput/promptFlags.js";
import { logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { hasRefillableMainAgentCommand } from "../../utils/messageQueueManager.js";

//@ chunk-18hwfzwa.js:120283-120327 placement
function linesLabel(lineCount) {
  return `${lineCount} ${plural(lineCount, "line")}`;
}
//@ chunk-18hwfzwa.js:120327-120367 placement
var BIDI_CONTROL_RE = /[\u202A-\u202E\u2066-\u2069]/g;
//@ chunk-18hwfzwa.js:120367-120490 placement
/**
 * IDE 选区文件名（取路径最后一段并清理）。
 */
function ideFileLabel(filePath) {
  let index = filePath.lastIndexOf("/");
  let slashIndex = index >= 0 ? index : filePath.lastIndexOf("\\");
  let sliced = filePath.slice(slashIndex + 1);
  return collapseWhitespace(stripAnsiSequences(toWellFormedString(sliced)).replace(BIDI_CONTROL_RE, ""));
}
//@ chunk-18hwfzwa.js:120490-120521 placement
var SEND_NOW_HINT_KEY = "chat:sendNowHintPress";
//@ chunk-18hwfzwa.js:120521-120620 placement
function hasSendNowBinding() {
  let bindings = useKeybindingContext()?.bindings ?? parseBindings(DEFAULT_BINDINGS);
  return isActionUnbound("chat:sendNow", "Chat", bindings)
    ? null
    : sendNowShortcut(bindings, supportsExtendedKeys());
}
//@ chunk-18hwfzwa.js:120620-120741 placement
/**
 * chat:sendNow 快捷键显示文本。
 */
function sendNowShortcut(uiSession, plainOnly) {
  let actionChords = getActionChords("chat:sendNow", "Chat", uiSession);
  let chord =
    (plainOnly ? undefined : actionChords.findLast((actionChord) => !hasShortcutKey(actionChord))) ??
    actionChords.at(-1);
  return chord ? chordToString(chord) : "";
}
//@ chunk-18hwfzwa.js:120741-120821 placement
function hasShortcutKey(actionChord) {
  return actionChord.some((part) => part.super || (part.key === "enter" && (part.ctrl || part.shift)));
}
//@ chunk-18hwfzwa.js:1474487-1474644 placement = call (0.304)
function call_4(onDone, context) {
  let { mainLoopModel, getAppState } = context;
  let effortLevelIfSupported = getEffortLevelIfSupported(mainLoopModel, resolveEffortLevel(getAppState()));
  logEvent("tengu_cancel", {
    source: onDone,
    streamMode: fromEnumOpt(context.streamMode),
    ...(effortLevelIfSupported && {
      effort_level: fromEnum(effortLevelIfSupported),
    }),
  });
}
//@ chunk-18hwfzwa.js:1474644-1474862 placement
/**
 * 立即发送排队消息（打断当前回合）并记录遥测。
 */
function sendQueuedNow(turn) {
  if (!isQueuedSendNowEnabled()) return false;
  switch (interruptForSendNow(turn)) {
    case "cancelled":
      logFeatureOk("input_send_queued_now");
      return true;
    case "no_live_controller":
      logFeatureSad("input_send_queued_now", "no_live_controller");
      return false;
    case "nothing_to_send":
      return false;
  }
}
//@ chunk-18hwfzwa.js:1474862-1475195 placement
/**
 * 立即发送键：能不取消回合就直接投递，否则打断回合。
 */
function handleSendNowKey(turn) {
  let keyEnabled = isSendNowKeyEnabled();
  if (keyEnabled && canSendNow(turn) && turn.deliverWithoutCancel()) {
    logFeatureOk("input_send_now_key");
    return true;
  }
  switch (interruptForSendNow(turn)) {
    case "cancelled":
      if (keyEnabled) logFeatureSad("input_send_now_key", "fell_back_to_cancel");
      else logFeatureOk("input_send_now_key");
      return true;
    case "no_live_controller":
      logFeatureSad("input_send_now_key", "no_live_controller");
      return false;
    case "nothing_to_send":
      return false;
  }
}
//@ chunk-18hwfzwa.js:1475195-1475284 placement
function canSendNow(input) {
  return (
    (input.mode ?? "prompt") === "prompt" &&
    input.turn.guard.isActive &&
    hasRefillableMainAgentCommand(input.queue)
  );
}
//@ chunk-18hwfzwa.js:1475284-1475438 placement
/**
 * 有待发内容时打断运行中的回合，返回 cancelled/no_live_controller/nothing_to_send。
 */
function interruptForSendNow(context) {
  if (!canSendNow(context)) return "nothing_to_send";
  if (!context.interruptRunningTurn()) return "no_live_controller";
  call_4(lit_2("queued_send_now"), context);
  return "cancelled";
}
export { ideFileLabel, linesLabel, SEND_NOW_HINT_KEY, hasSendNowBinding, sendQueuedNow, handleSendNowKey };
