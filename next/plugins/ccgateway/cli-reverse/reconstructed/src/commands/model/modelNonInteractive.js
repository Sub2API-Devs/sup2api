/**
 * commands/model/modelNonInteractive.ts
 *
 * 非交互 /model：检查模型可用性（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0pmcg6nh.js (2)
 * attribution: placement 2
 */
import { LEGACY_MODEL_IDS } from "../../utils/model/modelIds.js";
import { COMMON_INFO_ARGS_ALIAS, COMMON_HELP_ARGS } from "../../constants/xml.js";
import { ShowModelAndClose } from "./model.js";
import { logEvent } from "../../services/analytics/index.js";
import { shortHash } from "../../utils/shortHash.js";
import { withDeadline } from "../../utils/sleep.js";
import {
  switchMainLoopModelSafe,
  MODEL_LIST_REFRESH_TIMEOUT_MS,
  runPreModelSwitchHooks,
  preModelSwitchBlockedMessage,
  saveModelSwitch,
  sanitizeHookText,
} from "./modelSwitch.js";
import { displayModelName, formatModelRestrictedNotice } from "../../utils/model/validateModel.js";
import { hasLadderForSetting } from "../../utils/model/modelUnavailability.js";
import { logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { renderUsageCreditsOnlyModelName, parseUserSpecifiedModel } from "../../utils/model/modelDisplay.js";
import { firstWord } from "../../utils/model/thirdPartyModelDefaults.js";
import { serializeModelSwitch } from "../../utils/model/modelSwitchHooks.js";
import { isBridgeOrTransport } from "../../cli/transportState.js";

//@ chunk-0pmcg6nh.js:12127-12215 placement
var MODEL_USAGE_TEXT = `Usage: /model <name>. Available: ${LEGACY_MODEL_IDS.join(", ")}, default, or a full model ID.`;
//@ chunk-0pmcg6nh.js:12215-14286 placement
/**
 * 非交互 /model：确认模型可用，检查超时时提示重试
 */
async function runModelCommandNonInteractive(args, context) {
  let trimmed = args.trim();
  if (!trimmed || COMMON_INFO_ARGS_ALIAS.includes(trimmed)) {
    let appState = context.getAppState();
    return {
      type: "text",
      value: `${ShowModelAndClose(appState)}
${MODEL_USAGE_TEXT}`,
    };
  }
  if (COMMON_HELP_ARGS.includes(trimmed))
    return {
      type: "text",
      value: MODEL_USAGE_TEXT,
    };
  logEvent("tengu_model_command_inline", {
    args_hash: shortHash(trimmed),
    args_length: trimmed.length,
  });
  let runSwitch = async () => {
    let outcome = await withDeadline(
      switchMainLoopModelSafe(trimmed, context.storageV5, context.credentials),
      MODEL_LIST_REFRESH_TIMEOUT_MS,
    );
    if (outcome === undefined)
      return {
        type: "text",
        value: `Couldn't confirm model '${displayModelName(trimmed)}' is available (the check timed out) \xB7 try again`,
      };
    if (!outcome.ok)
      return {
        type: "text",
        value: outcome.message,
      };
    if (outcome.model !== null && hasLadderForSetting(outcome.model)) {
      logFeatureSad("model_fable_consent", "noninteractive_set_blocked");
      let modelLabel = renderUsageCreditsOnlyModelName(parseUserSpecifiedModel(outcome.model));
      return {
        type: "text",
        value: `${modelLabel} uses usage credits and needs a one-time consent \xB7 pick ${firstWord(modelLabel)} from /model in an interactive session to set it up`,
      };
    }
    return {
      validation: outcome,
    };
  };
  let applyValidation = async (validation) => {
    let hookResult = await runPreModelSwitchHooks(
      context.session,
      context.getAppState,
      validation.model,
      "command",
    );
    if (hookResult.decision === "block" || hookResult.decision === "ask") {
      logFeatureSad("model_switch", "blocked_by_hook");
      return {
        type: "text",
        value: preModelSwitchBlockedMessage(
          validation.model,
          hookResult.decision === "ask"
            ? `${hookResult.reason ?? "confirmation required"} (run /model interactively to confirm)`
            : hookResult.reason,
          hookResult.messages,
        ),
      };
    }
    let success = false;
    let noticePromise = saveModelSwitch(
      context.session,
      validation.model,
      context.getAppState,
      context.setAppState,
      !context.options.isNonInteractiveSession,
      "command",
      validation.substitutedFrom,
      context.storageV5,
      (text) => {
        success = text?.kind === "failed";
      },
    );
    let substitutedPrefix =
      validation.substitutedFrom !== undefined && validation.model !== null
        ? `${formatModelRestrictedNotice(validation.substitutedFrom, validation.model)}
`
        : "";
    let suffix =
      hookResult.messages.length > 0
        ? `
${hookResult.messages.map(sanitizeHookText).join(`
`)}`
        : "";
    return {
      notice: noticePromise.then((savedText) => `${substitutedPrefix}${savedText}${suffix}`),
      hasDefaultSaveFailed: () => success,
    };
  };
  if (!context.options.isNonInteractiveSession && context.rowCommit.isHooked()) {
    let result = await serializeModelSwitch(context.session, runSwitch);
    if (!("validation" in result)) return result;
    return {
      type: "text",
      value: (
        await context.rowCommit.savedModelPickReply(
          result.validation.model,
          context,
          async () => {
            let applied = await serializeModelSwitch(context.session, () =>
              applyValidation(result.validation),
            );
            if ("notice" in applied) {
              let notice = await applied.notice;
              return applied.hasDefaultSaveFailed()
                ? {
                    unsaved: notice,
                  }
                : notice;
            }
            return {
              refused: applied.type === "text" ? applied.value : "The model was not changed",
            };
          },
          {
            persistsOffBox: () => isBridgeOrTransport(context.session),
          },
        )
      ).text,
    };
  }
  let finalized = await serializeModelSwitch(context.session, async () => {
    let outcome = await runSwitch();
    return "validation" in outcome ? applyValidation(outcome.validation) : outcome;
  });
  if ("notice" in finalized)
    return {
      type: "text",
      value: await finalized.notice,
    };
  return finalized;
}
export { runModelCommandNonInteractive };
