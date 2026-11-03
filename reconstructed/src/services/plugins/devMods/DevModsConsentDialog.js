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
import { Ar } from "../../../../runtime/bun-runtime.js";
import { DEV_MODS_DIR_PLACEHOLDER } from "./devModsWatcher.js";
import { getIsNonInteractiveSession } from "../../../bootstrap/state.js";

//@ chunk-zhrgwca4.js:1093-1102 placement
var N = {};
//@ chunk-zhrgwca4.js:1102-1152 placement
Ar(N, { DEV_MODS_PLACEHOLDER: () => DEV_MODS_DIR_PLACEHOLDER, default: () => N });
//@ chunk-zhrgwca4.js:1152-1212 placement
var fo = { explain: "explain", allow: "enable", not_now: "decline" };
//@ chunk-zhrgwca4.js:1212-1310 placement
var lo = { no_one_to_ask: "no_one_to_ask", host_closed: "closed", no_selection: "unpicked", error: "retry" };
//@ chunk-zhrgwca4.js:1310-1472 placement
function consentOutcomeToChoice(o) {
  switch (o.kind) {
    case "chose":
      return fo[o.value];
    case "declined":
      return "decline";
    case "aborted":
      return "withdrawn";
    case "unanswered":
      return lo[o.reason];
  }
}
//@ chunk-zhrgwca4.js:1472-1484 placement
var CONSENT_DIALOG_DELAY_MS = 2000;
//@ chunk-zhrgwca4.js:1484-1534 placement
var co = (o) => (o === "now" ? "now" : "when this turn ends");
//@ chunk-zhrgwca4.js:1534-1675 placement
var devModsConsentBody = (o) =>
  `They'll load ${co(o)}, and they'll reload whenever they change. A mod is code, and it runs with the same access you have here.`;
//@ chunk-zhrgwca4.js:1675-1801 placement
var DEV_MODS_CONSENT_OPTIONS = [
  { value: "explain", label: "How does this work?" },
  { value: "allow", label: "Turn them on" },
  { value: "not_now", label: "Not now" },
];
//@ chunk-zhrgwca4.js:1801-2369 placement
function devModsExplainerLines(o) {
  let e = o === "now",
    r = !getIsNonInteractiveSession();
  return [
    "A mod is a small program that changes how Claude looks or behaves here.",
    "Claude wrote these mods, and they run with the same access you have.",
    e
      ? "If you turn them on, they'll load now and reload whenever they change."
      : "Once they're on, they load when this turn ends and reload when they change.",
    "That lasts for the rest of this session, even if it restarts.",
    "If you choose Not now, nothing new will load until this session next starts.",
    ...(r ? ["You can see what's loaded, and turn it off, with /plugin."] : []),
  ].join(`
`);
}
//@ chunk-zhrgwca4.js:2369-2383 placement
var MODS_DIALOG_TITLE = "Mods";
//@ chunk-zhrgwca4.js:2383-2439 placement
var DEV_MODS_CONSENT_QUESTION = "Turn on the mods Claude writes in this session?";
//@ chunk-zhrgwca4.js:2439-2468 placement
var devModsConsentQuestionFor = (o) => `${DEV_MODS_CONSENT_QUESTION}

${devModsConsentBody(o)}`;

export {
  DEV_MODS_CONSENT_QUESTION,
  devModsExplainerLines,
  devModsConsentQuestionFor,
  consentOutcomeToChoice,
  MODS_DIALOG_TITLE,
  DEV_MODS_CONSENT_OPTIONS,
  CONSENT_DIALOG_DELAY_MS,
  N,
};
