/**
 * components/Settings/WellbeingSettings.tsx
 *
 * 2.1.316 新增：健康使用（wellbeing）设置界面与 /wellbeing 命令
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-jqzj18s4.js (8)
 * attribution: placement 8
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";

//@ chunk-jqzj18s4.js:6078-6082 placement
init_react_production();
//@ chunk-jqzj18s4.js:6082-6113 placement
function diffDesc(a, b) {
  return a - b;
}
//@ chunk-jqzj18s4.js:6113-6285 placement
function toIntervalOption(minutes) {
  return {
    value: String(minutes),
    label: !INTERVAL_PRESETS.includes(minutes)
      ? `Custom \xB7 every ${spanOf(minutes)}`
      : minutes === C
        ? `Every ${spanOf(minutes)} (default)`
        : `Every ${spanOf(minutes)}`,
  };
}
//@ chunk-jqzj18s4.js:6285-6316 placement
function diffAsc(a, b) {
  return a - b;
}
//@ chunk-jqzj18s4.js:6316-6471 placement
function toThresholdOption(minutes) {
  return {
    value: String(minutes),
    label: !THRESHOLD_PRESETS.includes(minutes)
      ? `Custom \xB7 ${minutes} minutes`
      : minutes === M
        ? `${minutes} minutes (default)`
        : `${minutes} minutes`,
  };
}
//@ chunk-jqzj18s4.js:6471-7229 placement
function WellbeingSettings() {
  let breakReminder = i("breakReminder", {
    enabled: false,
  }).value;
  let quietHours = i("quietHours", {
    enabled: false,
  }).value;
  let nextSettings = {
    enabled: breakReminder.enabled ?? false,
    intervalMinutes: breakReminder.intervalMinutes ?? C,
    breakThresholdMinutes: breakReminder.breakThresholdMinutes ?? M,
    quiet: {
      enabled: quietHours.enabled ?? false,
      start: quietHours.start,
      end: quietHours.end,
    },
  };
  let quietRange =
    quietHours.start && quietHours.end
      ? {
          start: quietHours.start,
          end: quietHours.end,
        }
      : undefined;
  let customRange =
    quietRange && !QUIET_PRESETS.some((preset) => keyOf(preset) === keyOf(quietRange))
      ? quietRange
      : undefined;
  return {
    draft: nextSettings,
    intervals: t([...INTERVAL_PRESETS, nextSettings.intervalMinutes])
      .sort(diffDesc)
      .map(toIntervalOption),
    thresholds: t([...THRESHOLD_PRESETS, nextSettings.breakThresholdMinutes])
      .sort(diffAsc)
      .map(toThresholdOption),
    quiets: [
      {
        value: "off",
        label: "Off",
        range: undefined,
      },
      ...[...QUIET_PRESETS, ...(customRange ? [customRange] : [])].map((option) => ({
        value: keyOf(option),
        label: `${option === customRange ? "Custom \xB7 " : ""}${option.start} \u2013 ${option.end}`,
        range: option,
      })),
    ],
  };
}
//@ chunk-jqzj18s4.js:7229-7239 placement
/**
 * 导出值：WELLBEING_ROW_HEIGHT（200）。
 */
var WELLBEING_ROW_HEIGHT = 200;
//@ chunk-jqzj18s4.js:7239-7318 placement
/**
 * /wellbeing 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
var runWellbeingCommand = async (onDone) => {
  onDone("Wellbeing settings are not available in this build");
  return null;
};
export { WELLBEING_ROW_HEIGHT, runWellbeingCommand };
