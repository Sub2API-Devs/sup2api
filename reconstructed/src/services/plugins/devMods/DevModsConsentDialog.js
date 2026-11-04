/**
 * services/plugins/devMods/DevModsConsentDialog.tsx
 *
 * 2.1.316 新增：开启 dev mods 的同意对话框文案与选项
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-zhrgwca4.js (13)
 * attribution: placement 13
 */
import { __export } from "../../../../runtime/bun-runtime.js";
import { DEV_MODS_DIR_PLACEHOLDER } from "./devModsWatcher.js";
import { getIsNonInteractiveSession } from "../../../bootstrap/state.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-zhrgwca4.js:1093-1102 placement
/**
 * 模块命名空间对象占位（导出集合）。
 */
var devModsDialogNamespace = {};
//@ chunk-zhrgwca4.js:1102-1152 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-zhrgwca4.js:1102", () => {
  __export(devModsDialogNamespace, {
    DEV_MODS_PLACEHOLDER: () => DEV_MODS_DIR_PLACEHOLDER,
    default: () => devModsDialogNamespace,
  });
});
//@ chunk-zhrgwca4.js:1152-1212 placement
/**
 * 对话框选项值到结果名的映射。
 */
var CHOICE_BY_VALUE = {
  explain: "explain",
  allow: "enable",
  not_now: "decline",
};
//@ chunk-zhrgwca4.js:1212-1310 placement
/**
 * 失败原因到结果名的映射。
 */
var OUTCOME_BY_REASON = {
  no_one_to_ask: "no_one_to_ask",
  host_closed: "closed",
  no_selection: "unpicked",
  error: "retry",
};
//@ chunk-zhrgwca4.js:1310-1472 placement
function consentOutcomeToChoice(outcome) {
  switch (outcome.kind) {
    case "chose":
      return CHOICE_BY_VALUE[outcome.value];
    case "declined":
      return "decline";
    case "aborted":
      return "withdrawn";
    case "unanswered":
      return OUTCOME_BY_REASON[outcome.reason];
  }
}
//@ chunk-zhrgwca4.js:1472-1484 placement
var CONSENT_DIALOG_DELAY_MS = 2000;
//@ chunk-zhrgwca4.js:1484-1534 placement
/**
 * 描述 mod 加载时机（立即或本轮结束后）。
 */
var loadTimingLabel = (loadTiming) => (loadTiming === "now" ? "now" : "when this turn ends");
//@ chunk-zhrgwca4.js:1534-1675 placement
var devModsConsentBody = (loadTiming) =>
  `They'll load ${loadTimingLabel(loadTiming)}, and they'll reload whenever they change. A mod is code, and it runs with the same access you have here.`;
//@ chunk-zhrgwca4.js:1675-1801 placement
var DEV_MODS_CONSENT_OPTIONS = [
  {
    value: "explain",
    label: "How does this work?",
  },
  {
    value: "allow",
    label: "Turn them on",
  },
  {
    value: "not_now",
    label: "Not now",
  },
];
//@ chunk-zhrgwca4.js:1801-2369 placement
function devModsExplainerLines(loadTiming) {
  let loadsNow = loadTiming === "now";
  let isInteractive = !getIsNonInteractiveSession();
  return [
    "A mod is a small program that changes how Claude looks or behaves here.",
    "Claude wrote these mods, and they run with the same access you have.",
    loadsNow
      ? "If you turn them on, they'll load now and reload whenever they change."
      : "Once they're on, they load when this turn ends and reload when they change.",
    "That lasts for the rest of this session, even if it restarts.",
    "If you choose Not now, nothing new will load until this session next starts.",
    ...(isInteractive ? ["You can see what's loaded, and turn it off, with /plugin."] : []),
  ].join(`
`);
}
//@ chunk-zhrgwca4.js:2369-2383 placement
var MODS_DIALOG_TITLE = "Mods";
//@ chunk-zhrgwca4.js:2383-2439 placement
var DEV_MODS_CONSENT_QUESTION = "Turn on the mods Claude writes in this session?";
//@ chunk-zhrgwca4.js:2439-2468 placement
var devModsConsentQuestionFor = (loadTiming) => `${DEV_MODS_CONSENT_QUESTION}

${devModsConsentBody(loadTiming)}`;
export {
  DEV_MODS_CONSENT_QUESTION,
  devModsExplainerLines,
  devModsConsentQuestionFor,
  consentOutcomeToChoice,
  MODS_DIALOG_TITLE,
  DEV_MODS_CONSENT_OPTIONS,
  CONSENT_DIALOG_DELAY_MS,
  devModsDialogNamespace,
};
