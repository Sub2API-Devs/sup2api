/**
 * services/plugins/devMods/devModsConsent.ts
 *
 * 2.1.316 新增：请求开启 dev mods 的同意
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-zhrgwca4.js (8)
 * attribution: placement 8
 */
import { join, join as join_2 } from "path";
import {
  DEV_MODS_CONSENT_QUESTION,
  devModsExplainerLines,
  devModsConsentQuestionFor,
  consentOutcomeToChoice,
  MODS_DIALOG_TITLE,
  DEV_MODS_CONSENT_OPTIONS,
} from "./DevModsConsentDialog.js";
import { TURN_STATE_PROBE } from "../../../plugins/functionHooks/devModsWatch.js";
import { confirmWithUser, oZe } from "../../../utils/permissions/confirmWithUser.js";
import { logFeatureOk, logFeatureSad } from "../../analytics/featureTelemetry.js";
import { lit, fromEnum } from "../../analytics/safeMetadata.js";
import { lp } from "../../../plugins/functionHooks/surfaceBinding.js";
import { logForDebugging } from "../../../utils/debug.js";
import { errorMessage } from "../../../utils/errors.js";
import { gte } from "../../../plugins/functionHooks/devModsName.js";

//@ chunk-zhrgwca4.js:2468-2492 placement
var MOD_HOT_RELOAD = "mod_hot_reload";
//@ chunk-zhrgwca4.js:2492-2521 placement
var se = (o) => `${DEV_MODS_CONSENT_QUESTION}

${devModsExplainerLines(o)}`;
//@ chunk-zhrgwca4.js:2521-2530 placement
var yo = 3;
/**
 * 询问用户是否开启本会话中 Claude 写的 mod（本轮结束时或立即），返回用户的选择。
 */
//@ chunk-zhrgwca4.js:2530-2876 placement
async function askDevModsConsent(o, e) {
  let r = TURN_STATE_PROBE.isRunning() ? "turn-end" : "now",
    n = e === 0 ? devModsConsentQuestionFor(r) : se(r),
    i = consentOutcomeToChoice(
      await confirmWithUser({
        canUseTool: o.binding.canUseTool,
        toolUseContext: o.binding.toolContext(o.abortController),
        source: MOD_HOT_RELOAD,
        header: MODS_DIALOG_TITLE,
        question: n,
        choices: DEV_MODS_CONSENT_OPTIONS,
        personOnly: !0,
      }),
    );
  if (i !== "explain") return i;
  return (
    logFeatureOk("plugin_dev_mods", { answer: lit("explain") }),
    e < yo ? askDevModsConsent(o, e + 1) : "decline"
  );
}
//@ chunk-zhrgwca4.js:2876-2960 placement
var vo = { no_one_to_ask: "no_one_to_ask", closed: "host_closed", unpicked: "no_selection" };
//@ chunk-zhrgwca4.js:2960-3390 placement
async function requestDevModsConsent(o, e) {
  let r = lp();
  if (r === void 0) return (logFeatureSad("plugin_dev_mods", "no_session"), "no_one_to_ask");
  let abortController = new AbortController();
  e?.addEventListener("abort", () => abortController.abort(), { once: !0 });
  try {
    let n = await askDevModsConsent({ binding: r, folder: o, abortController: abortController }, 0),
      i = vo[n];
    return (
      i === void 0
        ? logFeatureOk("plugin_dev_mods", { answer: fromEnum(n) })
        : logFeatureSad("plugin_dev_mods", i),
      n
    );
  } catch (error) {
    return (
      logForDebugging(`dev mods: the ask failed, asked again later: ${errorMessage(error)}`, {
        level: "error",
      }),
      "retry"
    );
  }
}
//@ chunk-zhrgwca4.js:3390-3573 placement
function canAskForConsent() {
  let o = lp();
  if (o === void 0) return !0;
  try {
    return oZe(o.toolContext(new AbortController()));
  } catch (error) {
    return (
      logForDebugging(`dev mods: no context to ask in yet: ${errorMessage(error)}`, { level: "error" }),
      !0
    );
  }
}
//@ chunk-zhrgwca4.js:3602-3625 placement
var devModsFolderFor = (o) => join(gte(), o);

export { canAskForConsent, requestDevModsConsent, devModsFolderFor };
