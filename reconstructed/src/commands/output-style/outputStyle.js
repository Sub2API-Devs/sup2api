/**
 * commands/output-style/outputStyle.ts
 *
 * 2.1.316 新增。/output-style 设置输出风格。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1ehcpf9z.js (2)
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

//@ chunk-1ehcpf9z.js:12942-13038 placement
var _ = "Couldn't save the output style (detail withheld on this connection).";
var CUSTOM_STYLE_LABEL = "a custom style";
//@ chunk-1ehcpf9z.js:13038-14349 placement
/**
 * /output-style 的 local call(args, context, invokedName) 实现入口（由命令对象 load() 返回）。
 */
async function setOutputStyleCommand(args, context) {
  let allOutputStyles = await getAllOutputStylesCached(getCwd(), context.storageV5);
  let i = isBridgeOrVerifiedSlackTurn(context);
  let keys = Object.keys(allOutputStyles);
  let l = i ? keys.filter((t) => isBuiltInOrDefaultStyle(allOutputStyles[t])) : keys;
  let n = hasCustomOutputStyle();
  let f = i
    ? `
${CUSTOM_STYLE_REMOTE_DENIED_MESSAGE}`
    : "";
  let trimmed = args.trim();
  let lower = trimmed.toLowerCase();
  let e = trimmed ? l.find((t) => t.toLowerCase() === lower) : undefined;
  if (e === undefined) {
    if (trimmed && !COMMON_INFO_ARGS_ALIAS.includes(lower) && !COMMON_HELP_ARGS.includes(lower))
      return {
        type: "text",
        value: `Unknown output style "${sanitizeTelemetryString(trimmed)}". Available styles: ${l.map(sanitizeTelemetryString).join(", ")}${f}`,
      };
    let mapped = l.map((p) => {
      let description = allOutputStyles[p]?.description;
      let S = sanitizeTelemetryString(p);
      let O = p === n ? " (current)" : "";
      return description ? `- ${S}${O}: ${sanitizeTelemetryString(description)}` : `- ${S}${O}`;
    });
    return {
      type: "text",
      value: `Output style: ${i && !isBuiltInOrDefaultStyle(allOutputStyles[n]) ? CUSTOM_STYLE_LABEL : sanitizeTelemetryString(n)}

Available styles:
${mapped.join(`
`)}

Usage: /output-style <style>${f}`,
    };
  }
  if (e === n)
    return {
      type: "text",
      value: `Output style is already ${sanitizeTelemetryString(e)}`,
    };
  if (!isSettingSourceEnabled("localSettings"))
    return {
      type: "text",
      value: STYLE_SAVE_UNAVAILABLE_MESSAGE,
    };
  let m;
  let u = await commitRowThroughConfigSet("outputStyle", e, context, async () => {
    let t = await updateSettingsForSource(
      "localSettings",
      {
        outputStyle: e,
      },
      undefined,
      context.storageV5,
    );
    m = t.error ?? undefined;
    return t.error
      ? {
          error: t.error,
        }
      : undefined;
  });
  if ("refusal" in u)
    return {
      type: "text",
      value: isBridgeOrTransport(context.session)
        ? _
        : m
          ? `Could not save output style: ${m.message}`
          : u.refusal,
    };
  if (u.written !== e)
    return {
      type: "text",
      value: `Output style set to ${sanitizeTelemetryString(String(u.written))}`,
    };
  noteSystemPromptSectionInvalidation("output_style");
  logEvent("tengu_output_style_changed", {
    style: markCustomSetting(e),
    source: lit("slash_command"),
    settings_source: lit("localSettings"),
  });
  return {
    type: "text",
    value: `Output style set to ${sanitizeTelemetryString(e)}`,
  };
}
