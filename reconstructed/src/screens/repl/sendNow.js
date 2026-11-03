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
import { plural, Dr, toWellFormedString } from "../../utils/stringUtils.js";
import { stripAnsiSequences } from "../../utils/printableName.js";
import { useKeybindingContext } from "../../keybindings/KeybindingContext.js";
import { parseBindings, chordToString } from "../../keybindings/parser.js";
import { DEFAULT_BINDINGS } from "../../keybindings/defaultBindings.js";
import { isActionUnbound, getActionChords } from "../../keybindings/resolver.js";
import { supportsExtendedKeys } from "../../ink/terminal.js";
import { getEffortLevelIfSupported, resolveEffortLevel } from "../../utils/effort.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnumOpt, fromEnum, lit as lit_2 } from "../../services/analytics/safeMetadata.js";
import { Gfn, h8n } from "../../components/PromptInput/promptFlags.js";
import { logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { GKr } from "../../utils/messageQueueManager.js";

//@ chunk-18hwfzwa.js:120283-120327 placement
function zFe(h) {
  return `${h} ${plural(h, "line")}`;
}
//@ chunk-18hwfzwa.js:120327-120367 placement
var BIt = /[\u202A-\u202E\u2066-\u2069]/g;
/**
 * IDE 选区文件名（取路径最后一段并清理）。
 */
//@ chunk-18hwfzwa.js:120367-120490 placement
function ideFileLabel(h) {
  let index = h.lastIndexOf("/"),
    D = index >= 0 ? index : h.lastIndexOf("\\"),
    sliced = h.slice(D + 1);
  return Dr(stripAnsiSequences(toWellFormedString(sliced)).replace(BIt, ""));
}
//@ chunk-18hwfzwa.js:120490-120521 placement
var SEND_NOW_HINT_KEY = "chat:sendNowHintPress";
//@ chunk-18hwfzwa.js:120521-120620 placement
function hasSendNowBinding() {
  let h = useKeybindingContext()?.bindings ?? parseBindings(DEFAULT_BINDINGS);
  return isActionUnbound("chat:sendNow", "Chat", h) ? null : sendNowShortcut(h, supportsExtendedKeys());
}
/**
 * chat:sendNow 快捷键显示文本。
 */
//@ chunk-18hwfzwa.js:120620-120741 placement
function sendNowShortcut(h, x) {
  let D = getActionChords("chat:sendNow", "Chat", h),
    L = (x ? void 0 : D.findLast((ee) => !UIt(ee))) ?? D.at(-1);
  return L ? chordToString(L) : "";
}
//@ chunk-18hwfzwa.js:120741-120821 placement
function UIt(h) {
  return h.some((x) => x.super || (x.key === "enter" && (x.ctrl || x.shift)));
}
//@ chunk-18hwfzwa.js:1474487-1474644 placement = call (0.304)
function call_4(onDone, context) {
  let { mainLoopModel: mainLoopModel, getAppState: getAppState } = context,
    ee = getEffortLevelIfSupported(mainLoopModel, resolveEffortLevel(getAppState()));
  logEvent("tengu_cancel", {
    source: onDone,
    streamMode: fromEnumOpt(context.streamMode),
    ...(ee && { effort_level: fromEnum(ee) }),
  });
}
/**
 * 立即发送排队消息（打断当前回合）并记录遥测。
 */
//@ chunk-18hwfzwa.js:1474644-1474862 placement
function sendQueuedNow(h) {
  if (!Gfn()) return !1;
  switch (interruptForSendNow(h)) {
    case "cancelled":
      return (logFeatureOk("input_send_queued_now"), !0);
    case "no_live_controller":
      return (logFeatureSad("input_send_queued_now", "no_live_controller"), !1);
    case "nothing_to_send":
      return !1;
  }
}
/**
 * 立即发送键：能不取消回合就直接投递，否则打断回合。
 */
//@ chunk-18hwfzwa.js:1474862-1475195 placement
function handleSendNowKey(h) {
  let x = h8n();
  if (x && Fkt(h) && h.deliverWithoutCancel()) return (logFeatureOk("input_send_now_key"), !0);
  switch (interruptForSendNow(h)) {
    case "cancelled":
      if (x) logFeatureSad("input_send_now_key", "fell_back_to_cancel");
      else logFeatureOk("input_send_now_key");
      return !0;
    case "no_live_controller":
      return (logFeatureSad("input_send_now_key", "no_live_controller"), !1);
    case "nothing_to_send":
      return !1;
  }
}
//@ chunk-18hwfzwa.js:1475195-1475284 placement
function Fkt(h) {
  return (h.mode ?? "prompt") === "prompt" && h.turn.guard.isActive && GKr(h.queue);
}
/**
 * 有待发内容时打断运行中的回合，返回 cancelled/no_live_controller/nothing_to_send。
 */
//@ chunk-18hwfzwa.js:1475284-1475438 placement
function interruptForSendNow(h) {
  if (!Fkt(h)) return "nothing_to_send";
  if (!h.interruptRunningTurn()) return "no_live_controller";
  return (call_4(lit_2("queued_send_now"), h), "cancelled");
}

export { ideFileLabel, zFe, hasSendNowBinding, SEND_NOW_HINT_KEY, sendQueuedNow, handleSendNowKey };
