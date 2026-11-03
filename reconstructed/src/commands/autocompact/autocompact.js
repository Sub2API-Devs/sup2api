/**
 * commands/autocompact/autocompact.ts
 *
 * 2.1.316 新增。应用自动压缩窗口设置（/autocompact）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-z3fsn6g8.js (6)
 * attribution: placement 6
 */
import { getModelContextInfo } from "../../utils/model/modelContextInfo.js";
import { getAutoCompactWindow } from "../../services/compact/autoCompact.js";
import { formatTokens } from "../../utils/format.js";
import { renderModelName } from "../../utils/model/modelDisplay.js";
import {
  oKe,
  Zjt,
  resolveAutoCompactWindow,
  parseWindowArgument,
  resolveWindowOrigin,
  persistSessionWindow,
  readAutoCompactWindowSetting,
} from "../../services/compact/autoCompactWindow.js";
import { env } from "../../utils/env.js";
import { isAutoCompactEnabled } from "../../services/compact/compactSettings.js";
import { whi, buildModelSettingsPatch } from "../../utils/effort.js";
import { updateSettingsForSource } from "../../utils/settings/settings.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit, fromEnum } from "../../services/analytics/safeMetadata.js";
import { telemetrySafeModelName } from "../../utils/model/telemetryModelName.js";

/**
 * 窗口来源标签
 */
//@ chunk-z3fsn6g8.js:553-722 placement
var AUTO_COMPACT_WINDOW_SOURCE_LABELS = {
  env: "from CLAUDE_CODE_AUTO_COMPACT_WINDOW",
  "unknown-model": "default for an unrecognized model",
  "model-default": "default for this model",
  settings: "from settings",
};
/**
 * 生成自动压缩窗口的当前值说明
 */
//@ chunk-z3fsn6g8.js:722-1611 placement
function describeAutoCompactWindow(e, o) {
  let s = getModelContextInfo(e),
    { window: n, configured: configured, source: source } = getAutoCompactWindow(s, o),
    t = configured > n ? ` \xB7 capped to ${formatTokens(n)} by model` : "",
    m =
      source === "auto"
        ? "auto"
        : source === "experiment" || source === "clientdata"
          ? `auto (${formatTokens(configured)} tokens)${t}`
          : `${formatTokens(configured)} tokens (${AUTO_COMPACT_WINDOW_SOURCE_LABELS[source]})${t}`,
    u = [`Auto-compact window for ${renderModelName(s.settingsKey)}: ${m}`],
    p = oKe(env.CLAUDE_CODE_AUTO_COMPACT_WINDOW);
  if (p !== null) u.push(p);
  if (!isAutoCompactEnabled()) u.push("Auto-compact is currently disabled (see /config)");
  if (
    (u.push(
      "Auto-compact summarizes the conversation when context usage approaches this limit. The actual threshold is the minimum of this setting and your model's maximum context window.",
    ),
    advisesStayingOnAuto(s.settingsKey))
  )
    u.push(
      "The auto setting picks a window tuned for your model and is strongly recommended for the best cost and performance.",
    );
  if (Zjt(source) && isAboveAutoWindow(s, configured))
    u.push("Overriding auto may result in high token usage, especially when resuming long sessions.");
  return u.join(`
`);
}
//@ chunk-z3fsn6g8.js:1611-1641 placement
function advisesStayingOnAuto(e) {
  return !whi(e);
}
//@ chunk-z3fsn6g8.js:1641-1708 placement
function isAboveAutoWindow(e, o) {
  return Math.min(e.contextWindow, o) > resolveAutoCompactWindow(e).window;
}
/**
 * 应用自动压缩窗口设置（/autocompact）。
 */
//@ chunk-z3fsn6g8.js:1708-3094 placement
async function applyAutoCompactWindow(e, o, s) {
  let n = getModelContextInfo(o.options.mainLoopModel);
  if (getAutoCompactWindow(n, void 0).source === "env")
    return "CLAUDE_CODE_AUTO_COMPACT_WINDOW is set and takes precedence. Unset it to change this setting.";
  let lower = e.trim().toLowerCase(),
    t = lower === "reset" || lower === "unset" || lower === "default" ? "auto" : parseWindowArgument(lower);
  if (t === void 0)
    return `Couldn't parse '${e}'. Expected 'auto' or 100k\u20131M tokens (e.g. 500k, 200000, or 200 as shorthand)`;
  let m = t === "auto" ? void 0 : t,
    u = resolveWindowOrigin(n, o.options.autoCompactWindow),
    { error: error } = await updateSettingsForSource(
      "userSettings",
      buildModelSettingsPatch(n.model, { autoCompactWindow: t }, { autoCompactWindow: m }),
      void 0,
      o.storageV5,
    );
  if (error) return `Couldn't save setting: ${error.message}`;
  persistSessionWindow(n.settingsKey, t);
  let {
      window: l,
      configured: configured,
      source: source,
    } = getAutoCompactWindow(n, readAutoCompactWindowSetting()),
    f = (source === "settings" ? configured : void 0) !== m;
  (o.onQueryEvent?.({ type: "apply_flag_settings", settings: { autoCompactWindow: null } }),
    logEvent("tengu_autocompact_command", {
      action: lit(t === "auto" ? "auto" : "set"),
      ...(m !== void 0 && { tokens: m }),
      window_model: telemetrySafeModelName(n.settingsKey),
      previous_tokens: u.window,
      previous_origin: fromEnum(u.origin),
      resulting_tokens: l,
      overridden: f,
      route: fromEnum(s),
    }));
  let g = `Auto-compact window for ${renderModelName(n.settingsKey)}`;
  if (t === "auto")
    return f
      ? `${g} set to auto in settings, but a higher-priority override is active (${formatTokens(l)} tokens)`
      : `${g} set to auto`;
  let w = "";
  if (f) w = `, but a higher-priority override is active (${formatTokens(l)} tokens)`;
  else if (l < t) w = ` (capped to model limit of ${formatTokens(l)})`;
  return `${g} set to ${formatTokens(t)} tokens${w}`;
}
//@ chunk-z3fsn6g8.js:3094-3276 placement
var call = async (args, context) => {
  let trimmed = args.trim();
  if (!trimmed)
    return {
      type: "text",
      value: describeAutoCompactWindow(context.options.mainLoopModel, context.options.autoCompactWindow),
    };
  return { type: "text", value: await applyAutoCompactWindow(trimmed, context, "noninteractive") };
};

export { applyAutoCompactWindow, advisesStayingOnAuto, isAboveAutoWindow };
