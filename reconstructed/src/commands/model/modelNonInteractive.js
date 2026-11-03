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
import { E8 } from "../../utils/model/modelIds.js";
import { COMMON_INFO_ARGS_ALIAS, COMMON_HELP_ARGS } from "../../constants/xml.js";
import { ShowModelAndClose } from "./model.js";
import { logEvent } from "../../services/analytics/index.js";
import { gn } from "../../utils/shortHash.js";
import { withDeadline } from "../../utils/sleep.js";
import {
  switchMainLoopModelSafe,
  jKn,
  runPreModelSwitchHooks,
  preModelSwitchBlockedMessage,
  saveModelSwitch,
  Nf,
} from "./modelSwitch.js";
import { displayModelName, formatModelRestrictedNotice } from "../../utils/model/validateModel.js";
import { lue } from "../../utils/model/modelUnavailability.js";
import { logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { renderUsageCreditsOnlyModelName, parseUserSpecifiedModel } from "../../utils/model/modelDisplay.js";
import { firstWord } from "../../utils/model/thirdPartyModelDefaults.js";
import { serializeModelSwitch } from "../../utils/model/modelSwitchHooks.js";
import { isBridgeOrTransport } from "../../cli/transportState.js";

//@ chunk-0pmcg6nh.js:12127-12215 placement
var u = `Usage: /model <name>. Available: ${E8.join(", ")}, default, or a full model ID.`;
/**
 * 非交互 /model：确认模型可用，检查超时时提示重试
 */
//@ chunk-0pmcg6nh.js:12215-14286 placement
async function runModelCommandNonInteractive(args, context) {
  let trimmed = args.trim();
  if (!trimmed || COMMON_INFO_ARGS_ALIAS.includes(trimmed)) {
    let appState = context.getAppState();
    return {
      type: "text",
      value: `${ShowModelAndClose(appState)}
${u}`,
    };
  }
  if (COMMON_HELP_ARGS.includes(trimmed)) return { type: "text", value: u };
  logEvent("tengu_model_command_inline", { args_hash: gn(trimmed), args_length: trimmed.length });
  let r = async () => {
      let e = await withDeadline(
        switchMainLoopModelSafe(trimmed, context.storageV5, context.credentials),
        jKn,
      );
      if (e === void 0)
        return {
          type: "text",
          value: `Couldn't confirm model '${displayModelName(trimmed)}' is available (the check timed out) \xB7 try again`,
        };
      if (!e.ok) return { type: "text", value: e.message };
      if (e.model !== null && lue(e.model)) {
        logFeatureSad("model_fable_consent", "noninteractive_set_blocked");
        let o = renderUsageCreditsOnlyModelName(parseUserSpecifiedModel(e.model));
        return {
          type: "text",
          value: `${o} uses usage credits and needs a one-time consent \xB7 pick ${firstWord(o)} from /model in an interactive session to set it up`,
        };
      }
      return { validation: e };
    },
    m = async (e) => {
      let o = await runPreModelSwitchHooks(context.session, context.getAppState, e.model, "command");
      if (o.decision === "block" || o.decision === "ask")
        return (
          logFeatureSad("model_switch", "blocked_by_hook"),
          {
            type: "text",
            value: preModelSwitchBlockedMessage(
              e.model,
              o.decision === "ask"
                ? `${o.reason ?? "confirmation required"} (run /model interactively to confirm)`
                : o.reason,
              o.messages,
            ),
          }
        );
      let i = !1,
        s = saveModelSwitch(
          context.session,
          e.model,
          context.getAppState,
          context.setAppState,
          !context.options.isNonInteractiveSession,
          "command",
          e.substitutedFrom,
          context.storageV5,
          (d) => {
            i = d?.kind === "failed";
          },
        ),
        p =
          e.substitutedFrom !== void 0 && e.model !== null
            ? `${formatModelRestrictedNotice(e.substitutedFrom, e.model)}
`
            : "",
        g =
          o.messages.length > 0
            ? `
${o.messages.map(Nf).join(`
`)}`
            : "";
      return { notice: s.then((d) => `${p}${d}${g}`), hasDefaultSaveFailed: () => i };
    };
  if (!context.options.isNonInteractiveSession && context.rowCommit.isHooked()) {
    let e = await serializeModelSwitch(context.session, r);
    if (!("validation" in e)) return e;
    return {
      type: "text",
      value: (
        await context.rowCommit.savedModelPickReply(
          e.validation.model,
          context,
          async () => {
            let i = await serializeModelSwitch(context.session, () => m(e.validation));
            if ("notice" in i) {
              let notice = await i.notice;
              return i.hasDefaultSaveFailed() ? { unsaved: notice } : notice;
            }
            return { refused: i.type === "text" ? i.value : "The model was not changed" };
          },
          { persistsOffBox: () => isBridgeOrTransport(context.session) },
        )
      ).text,
    };
  }
  let l = await serializeModelSwitch(context.session, async () => {
    let e = await r();
    return "validation" in e ? m(e.validation) : e;
  });
  if ("notice" in l) return { type: "text", value: await l.notice };
  return l;
}
