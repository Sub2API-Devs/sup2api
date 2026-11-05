/**
 * commands/output-style/outputStyle.ts
 *
 * 2.1.316 新增。/output-style 设置输出风格。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-nrr9gtx9.js (2)
 * attribution: placement 2
 */
import {
  getAllOutputStylesCached,
  isBuiltInOrDefaultStyle,
  hasCustomOutputStyle,
  CUSTOM_STYLE_REMOTE_DENIED_MESSAGE,
  STYLE_SAVE_UNAVAILABLE_MESSAGE,
} from "../../constants/outputStyles.js";
import { getCwd } from "../../utils/cwd.js";
import { isBridgeOrVerifiedSlackTurn } from "../../utils/promptSubmissionOrigin.js";
import { COMMON_INFO_ARGS_ALIAS, COMMON_HELP_ARGS } from "../../constants/xml.js";
import { sanitizeTelemetryString } from "../../utils/sanitization.js";
import { isSettingSourceEnabled } from "../../utils/settings/constants.js";
import { commitRowThroughConfigSet } from "../config/configShorthand.js";
import { updateSettingsForSource } from "../../utils/settings/settings.js";
import { isBridgeOrTransport } from "../../cli/transportState.js";
import { noteSystemPromptSectionInvalidation } from "../../bootstrap/state.js";
import { logEvent } from "../../services/analytics/index.js";
import { markCustomSetting } from "../../components/Settings/Config.js";
import { lit } from "../../services/analytics/safeMetadata.js";

//@ chunk-nrr9gtx9.js:14091-14187 placement
var _ = "Couldn't save the output style (detail withheld on this connection).";
var CUSTOM_STYLE_LABEL = "a custom style";
//@ chunk-nrr9gtx9.js:14187-15499 placement
/**
 * /output-style 的 local call(args, context, invokedName) 实现入口（由命令对象 load() 返回）。
 */
async function setOutputStyleCommand(args, context) {
  let allOutputStyles = await getAllOutputStylesCached(getCwd(), context.storageV5);
  let isBridge = isBridgeOrVerifiedSlackTurn(context);
  let keys = Object.keys(allOutputStyles);
  let eligibleKeys = isBridge ? keys.filter((key) => isBuiltInOrDefaultStyle(allOutputStyles[key])) : keys;
  let currentStyle = hasCustomOutputStyle();
  let bridgeNote = isBridge
    ? `
${CUSTOM_STYLE_REMOTE_DENIED_MESSAGE}`
    : "";
  let trimmed = args.trim();
  let lower = trimmed.toLowerCase();
  let matched = trimmed ? eligibleKeys.find((key) => key.toLowerCase() === lower) : undefined;
  if (matched === undefined) {
    if (trimmed && !COMMON_INFO_ARGS_ALIAS.includes(lower) && !COMMON_HELP_ARGS.includes(lower))
      return {
        type: "text",
        value: `Unknown output style "${sanitizeTelemetryString(trimmed)}". Available styles: ${eligibleKeys.map(sanitizeTelemetryString).join(", ")}${bridgeNote}`,
      };
    let mapped = eligibleKeys.map((key) => {
      let description = allOutputStyles[key]?.description;
      let sanitizedKey = sanitizeTelemetryString(key);
      let currentMark = key === currentStyle ? " (current)" : "";
      return description
        ? `- ${sanitizedKey}${currentMark}: ${sanitizeTelemetryString(description)}`
        : `- ${sanitizedKey}${currentMark}`;
    });
    return {
      type: "text",
      value: `Output style: ${isBridge && !isBuiltInOrDefaultStyle(allOutputStyles[currentStyle]) ? CUSTOM_STYLE_LABEL : sanitizeTelemetryString(currentStyle)}

Available styles:
${mapped.join(`
`)}

Usage: /output-style <style>${bridgeNote}`,
    };
  }
  if (matched === currentStyle)
    return {
      type: "text",
      value: `Output style is already ${sanitizeTelemetryString(matched)}`,
    };
  if (!isSettingSourceEnabled("localSettings"))
    return {
      type: "text",
      value: STYLE_SAVE_UNAVAILABLE_MESSAGE,
    };
  let result;
  let commitResult = await commitRowThroughConfigSet("outputStyle", matched, context, async () => {
    let writeResult = await updateSettingsForSource(
      "localSettings",
      {
        outputStyle: matched,
      },
      undefined,
      context.storageV5,
    );
    result = writeResult.error ?? undefined;
    return writeResult.error
      ? {
          error: writeResult.error,
        }
      : undefined;
  });
  if ("refusal" in commitResult)
    return {
      type: "text",
      value: isBridgeOrTransport(context.session)
        ? _
        : result
          ? `Could not save output style: ${result.message}`
          : commitResult.refusal,
    };
  if (commitResult.written !== matched)
    return {
      type: "text",
      value: `Output style set to ${sanitizeTelemetryString(String(commitResult.written))}`,
    };
  noteSystemPromptSectionInvalidation("output_style");
  logEvent("tengu_output_style_changed", {
    style: markCustomSetting(matched),
    source: lit("slash_command"),
    settings_source: lit("localSettings"),
  });
  return {
    type: "text",
    value: `Output style set to ${sanitizeTelemetryString(matched)}`,
  };
}
export { CUSTOM_STYLE_LABEL, _, setOutputStyleCommand };
