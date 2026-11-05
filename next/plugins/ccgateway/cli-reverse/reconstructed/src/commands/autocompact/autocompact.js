/**
 * commands/autocompact/autocompact.ts
 *
 * 2.1.316 新增。应用自动压缩窗口设置（/autocompact）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-3r3ajxh1.js (6)
 * attribution: placement 6
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getModelContextInfo } from "../../utils/model/modelContextInfo.js";
import { getAutoCompactWindow } from "../../services/compact/autoCompact.js";
import { formatTokens } from "../../utils/format.js";
import { renderModelName } from "../../utils/model/modelDisplay.js";
import {
  reportInvalidWindowEnv,
  isEnvOrSettingsSource,
  resolveAutoCompactWindow,
  parseWindowArgument,
  resolveWindowOrigin,
  persistSessionWindow,
  readAutoCompactWindowSetting,
} from "../../services/compact/autoCompactWindow.js";
import { env } from "../../utils/env.js";
import { isAutoCompactEnabled } from "../../services/compact/compactSettings.js";
import { userEffortForAccount, buildModelSettingsPatch } from "../../utils/effort.js";
import { updateSettingsForSource } from "../../utils/settings/settings.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit, fromEnum } from "../../services/analytics/safeMetadata.js";
import { telemetrySafeModelName } from "../../utils/model/telemetryModelName.js";

//@ chunk-3r3ajxh1.js:553-722 placement
/**
 * 窗口来源标签
 */
var AUTO_COMPACT_WINDOW_SOURCE_LABELS = {
  env: "from CLAUDE_CODE_AUTO_COMPACT_WINDOW",
  "unknown-model": "default for an unrecognized model",
  "model-default": "default for this model",
  settings: "from settings",
};
//@ chunk-3r3ajxh1.js:722-1611 placement
/**
 * 生成自动压缩窗口的当前值说明
 */
function describeAutoCompactWindow(mainLoopModel, autoCompactWindow) {
  let modelContextInfo = getModelContextInfo(mainLoopModel);
  let { window: windowSize, configured, source } = getAutoCompactWindow(modelContextInfo, autoCompactWindow);
  let cappedNote = configured > windowSize ? ` \xB7 capped to ${formatTokens(windowSize)} by model` : "";
  let windowLabel =
    source === "auto"
      ? "auto"
      : source === "experiment" || source === "clientdata"
        ? `auto (${formatTokens(configured)} tokens)${cappedNote}`
        : `${formatTokens(configured)} tokens (${AUTO_COMPACT_WINDOW_SOURCE_LABELS[source]})${cappedNote}`;
  let lines = [`Auto-compact window for ${renderModelName(modelContextInfo.settingsKey)}: ${windowLabel}`];
  let envWarning = reportInvalidWindowEnv(env.CLAUDE_CODE_AUTO_COMPACT_WINDOW);
  if (envWarning !== null) lines.push(envWarning);
  if (!isAutoCompactEnabled()) lines.push("Auto-compact is currently disabled (see /config)");
  lines.push(
    "Auto-compact summarizes the conversation when context usage approaches this limit. The actual threshold is the minimum of this setting and your model's maximum context window.",
  );
  if (advisesStayingOnAuto(modelContextInfo.settingsKey))
    lines.push(
      "The auto setting picks a window tuned for your model and is strongly recommended for the best cost and performance.",
    );
  if (isEnvOrSettingsSource(source) && isAboveAutoWindow(modelContextInfo, configured))
    lines.push("Overriding auto may result in high token usage, especially when resuming long sessions.");
  return lines.join(`
`);
}
//@ chunk-3r3ajxh1.js:1611-1641 placement
function advisesStayingOnAuto(accountId) {
  return !userEffortForAccount(accountId);
}
//@ chunk-3r3ajxh1.js:1641-1708 placement
function isAboveAutoWindow(modelInfo, limit) {
  return Math.min(modelInfo.contextWindow, limit) > resolveAutoCompactWindow(modelInfo).window;
}
//@ chunk-3r3ajxh1.js:1708-3094 placement
/**
 * 应用自动压缩窗口设置（/autocompact）。
 */
async function applyAutoCompactWindow(args, session, storageV5) {
  let modelContextInfo = getModelContextInfo(session.options.mainLoopModel);
  if (getAutoCompactWindow(modelContextInfo, undefined).source === "env")
    return "CLAUDE_CODE_AUTO_COMPACT_WINDOW is set and takes precedence. Unset it to change this setting.";
  let raw = args.trim().toLowerCase();
  let parsed = raw === "reset" || raw === "unset" || raw === "default" ? "auto" : parseWindowArgument(raw);
  if (parsed === undefined)
    return `Couldn't parse '${args}'. Expected 'auto' or 100k\u20131M tokens (e.g. 500k, 200000, or 200 as shorthand)`;
  let nextWindow = parsed === "auto" ? undefined : parsed;
  let windowOrigin = resolveWindowOrigin(modelContextInfo, session.options.autoCompactWindow);
  let { error } = await updateSettingsForSource(
    "userSettings",
    buildModelSettingsPatch(
      modelContextInfo.model,
      {
        autoCompactWindow: parsed,
      },
      {
        autoCompactWindow: nextWindow,
      },
    ),
    undefined,
    session.storageV5,
  );
  if (error) return `Couldn't save setting: ${error.message}`;
  persistSessionWindow(modelContextInfo.settingsKey, parsed);
  let {
    window: currentWindow,
    configured,
    source,
  } = getAutoCompactWindow(modelContextInfo, readAutoCompactWindowSetting());
  let changed = (source === "settings" ? configured : undefined) !== nextWindow;
  session.onQueryEvent?.({
    type: "apply_flag_settings",
    settings: {
      autoCompactWindow: null,
    },
  });
  logEvent("tengu_autocompact_command", {
    action: lit(parsed === "auto" ? "auto" : "set"),
    ...(nextWindow !== undefined && {
      tokens: nextWindow,
    }),
    window_model: telemetrySafeModelName(modelContextInfo.settingsKey),
    previous_tokens: windowOrigin.window,
    previous_origin: fromEnum(windowOrigin.origin),
    resulting_tokens: currentWindow,
    overridden: changed,
    route: fromEnum(storageV5),
  });
  let header = `Auto-compact window for ${renderModelName(modelContextInfo.settingsKey)}`;
  if (parsed === "auto")
    return changed
      ? `${header} set to auto in settings, but a higher-priority override is active (${formatTokens(currentWindow)} tokens)`
      : `${header} set to auto`;
  let envNote = "";
  if (changed) envNote = `, but a higher-priority override is active (${formatTokens(currentWindow)} tokens)`;
  else if (currentWindow < parsed) envNote = ` (capped to model limit of ${formatTokens(currentWindow)})`;
  return `${header} set to ${formatTokens(parsed)} tokens${envNote}`;
}
//@ chunk-3r3ajxh1.js:3094-3276 placement
var call = async (args, context) => {
  let trimmed = args.trim();
  if (!trimmed)
    return {
      type: "text",
      value: describeAutoCompactWindow(context.options.mainLoopModel, context.options.autoCompactWindow),
    };
  return {
    type: "text",
    value: await applyAutoCompactWindow(trimmed, context, "noninteractive"),
  };
};
export { applyAutoCompactWindow, advisesStayingOnAuto, isAboveAutoWindow, call };
