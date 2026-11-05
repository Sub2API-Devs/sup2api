/**
 * services/plugins/devMods/DevModsConsentDialog.tsx
 *
 * 2.1.316 新增：开启 dev mods 的同意对话框文案与选项
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-c3nwd9gm.js (13)
 * attribution: placement 13
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __export } from "../../../../runtime/bun-runtime.js";
import { DEV_MODS_DIR_PLACEHOLDER } from "./devModsWatcher.js";
import { getIsNonInteractiveSession } from "../../../bootstrap/state.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-c3nwd9gm.js:1291-1300 placement
/**
 * 模块命名空间对象占位（导出集合）。
 */
var devModsDialogNamespace = {};
//@ chunk-c3nwd9gm.js:1300-1350 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-c3nwd9gm.js:1300", () => {
  __export(devModsDialogNamespace, {
    DEV_MODS_PLACEHOLDER: () => DEV_MODS_DIR_PLACEHOLDER,
    default: () => devModsDialogNamespace,
  });
});
//@ chunk-c3nwd9gm.js:1350-1410 placement
/**
 * 对话框选项值到结果名的映射。
 */
var CHOICE_BY_VALUE = {
  explain: "explain",
  allow: "enable",
  not_now: "decline",
};
//@ chunk-c3nwd9gm.js:1410-1508 placement
/**
 * 失败原因到结果名的映射。
 */
var OUTCOME_BY_REASON = {
  no_one_to_ask: "no_one_to_ask",
  host_closed: "closed",
  no_selection: "unpicked",
  error: "retry",
};
//@ chunk-c3nwd9gm.js:1508-1670 placement
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
//@ chunk-c3nwd9gm.js:1670-1720 placement
/**
 * 描述 mod 加载时机（立即或本轮结束后）。
 */
var loadTimingLabel = (loadTiming) => (loadTiming === "now" ? "now" : "when this turn ends");
//@ chunk-c3nwd9gm.js:1720-1861 placement
var devModsConsentBody = (loadTiming) =>
  `They'll load ${loadTimingLabel(loadTiming)}, and they'll reload whenever they change. A mod is code, and it runs with the same access you have here.`;
//@ chunk-c3nwd9gm.js:1861-1987 placement
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
//@ chunk-c3nwd9gm.js:1987-2555 placement
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
//@ chunk-c3nwd9gm.js:2555-2569 placement
var MODS_DIALOG_TITLE = "Mods";
//@ chunk-c3nwd9gm.js:2569-2625 placement
var DEV_MODS_CONSENT_QUESTION = "Turn on the mods Claude writes in this session?";
//@ chunk-c3nwd9gm.js:2625-2654 placement
var devModsConsentQuestionFor = (loadTiming) => `${DEV_MODS_CONSENT_QUESTION}

${devModsConsentBody(loadTiming)}`;
//@ chunk-c3nwd9gm.js:3126-3138 placement
var CONSENT_DIALOG_DELAY_MS = 2000;
export {
  DEV_MODS_CONSENT_QUESTION,
  devModsExplainerLines,
  MODS_DIALOG_TITLE,
  DEV_MODS_CONSENT_OPTIONS,
  devModsConsentQuestionFor,
  consentOutcomeToChoice,
  CONSENT_DIALOG_DELAY_MS,
  devModsDialogNamespace,
};
