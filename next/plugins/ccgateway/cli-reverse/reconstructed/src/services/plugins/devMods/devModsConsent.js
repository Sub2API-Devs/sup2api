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
import { join } from "path";
import {
  DEV_MODS_CONSENT_QUESTION,
  devModsExplainerLines,
  devModsConsentQuestionFor,
  consentOutcomeToChoice,
  MODS_DIALOG_TITLE,
  DEV_MODS_CONSENT_OPTIONS,
} from "./DevModsConsentDialog.js";
import { TURN_STATE_PROBE } from "../../../plugins/functionHooks/devModsWatch.js";
import { confirmWithUser, canPromptForConfirmation } from "../../../utils/permissions/confirmWithUser.js";
import { logFeatureOk, logFeatureSad } from "../../analytics/featureTelemetry.js";
import { lit, fromEnum } from "../../analytics/safeMetadata.js";
import { currentSurfaceBinding } from "../../../plugins/functionHooks/surfaceBinding.js";
import { logForDebugging } from "../../../utils/debug.js";
import { errorMessage } from "../../../utils/errors.js";
import { devModsDir } from "../../../plugins/functionHooks/devModsName.js";

//@ chunk-zhrgwca4.js:2468-2492 placement
var MOD_HOT_RELOAD = "mod_hot_reload";
//@ chunk-zhrgwca4.js:2492-2521 placement
/**
 * 拼出完整的同意询问文本。
 */
var consentQuestionText = (options) => `${DEV_MODS_CONSENT_QUESTION}

${devModsExplainerLines(options)}`;
//@ chunk-zhrgwca4.js:2521-2530 placement
/**
 * 最多询问次数（3）。
 */
var MAX_CONSENT_ASKS = 3;
//@ chunk-zhrgwca4.js:2530-2876 placement
/**
 * 询问用户是否开启本会话中 Claude 写的 mod（本轮结束时或立即），返回用户的选择。
 */
async function askDevModsConsent(binding, attempt) {
  let loadTiming = TURN_STATE_PROBE.isRunning() ? "turn-end" : "now";
  let question = attempt === 0 ? devModsConsentQuestionFor(loadTiming) : consentQuestionText(loadTiming);
  let choice = consentOutcomeToChoice(
    await confirmWithUser({
      canUseTool: binding.binding.canUseTool,
      toolUseContext: binding.binding.toolContext(binding.abortController),
      source: MOD_HOT_RELOAD,
      header: MODS_DIALOG_TITLE,
      question,
      choices: DEV_MODS_CONSENT_OPTIONS,
      personOnly: true,
    }),
  );
  if (choice !== "explain") return choice;
  logFeatureOk("plugin_dev_mods", {
    answer: lit("explain"),
  });
  return attempt < MAX_CONSENT_ASKS ? askDevModsConsent(binding, attempt + 1) : "decline";
}
//@ chunk-zhrgwca4.js:2876-2960 placement
/**
 * 结果原因映射。
 */
var OUTCOME_REASON_MAP = {
  no_one_to_ask: "no_one_to_ask",
  closed: "host_closed",
  unpicked: "no_selection",
};
//@ chunk-zhrgwca4.js:2960-3390 placement
async function requestDevModsConsent(folder, signal) {
  let binding = currentSurfaceBinding();
  if (binding === undefined) {
    logFeatureSad("plugin_dev_mods", "no_session");
    return "no_one_to_ask";
  }
  let abortController = new AbortController();
  signal?.addEventListener("abort", () => abortController.abort(), {
    once: true,
  });
  try {
    let outcome = await askDevModsConsent(
      {
        binding,
        folder,
        abortController,
      },
      0,
    );
    let reasonCode = OUTCOME_REASON_MAP[outcome];
    if (reasonCode === undefined)
      logFeatureOk("plugin_dev_mods", {
        answer: fromEnum(outcome),
      });
    else logFeatureSad("plugin_dev_mods", reasonCode);
    return outcome;
  } catch (error) {
    logForDebugging(`dev mods: the ask failed, asked again later: ${errorMessage(error)}`, {
      level: "error",
    });
    return "retry";
  }
}
//@ chunk-zhrgwca4.js:3390-3573 placement
function canAskForConsent() {
  let binding = currentSurfaceBinding();
  if (binding === undefined) return true;
  try {
    return canPromptForConfirmation(binding.toolContext(new AbortController()));
  } catch (error) {
    logForDebugging(`dev mods: no context to ask in yet: ${errorMessage(error)}`, {
      level: "error",
    });
    return true;
  }
}
//@ chunk-zhrgwca4.js:3602-3625 placement
var devModsFolderFor = (sessionId) => join(devModsDir(), sessionId);
export { canAskForConsent, requestDevModsConsent, devModsFolderFor };
