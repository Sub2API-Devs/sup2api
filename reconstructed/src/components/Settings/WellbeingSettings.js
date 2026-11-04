/**
 * components/Settings/WellbeingSettings.tsx
 *
 * 2.1.316 新增：健康使用（wellbeing）设置界面与 /wellbeing 命令
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-a7sxm3q7.js (8)
 * attribution: placement 8
 */
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";

//@ chunk-a7sxm3q7.js:5714-5718 placement
init_react_production();
//@ chunk-a7sxm3q7.js:5718-5749 placement
function diffDesc(a, b) {
  return a - b;
}
//@ chunk-a7sxm3q7.js:5749-5921 placement
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
//@ chunk-a7sxm3q7.js:5921-5952 placement
function diffAsc(a, b) {
  return a - b;
}
//@ chunk-a7sxm3q7.js:5952-6107 placement
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
//@ chunk-a7sxm3q7.js:6107-6865 placement
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
//@ chunk-a7sxm3q7.js:6865-6875 placement
/**
 * 导出值：WELLBEING_ROW_HEIGHT（200）。
 */
var WELLBEING_ROW_HEIGHT = 200;
//@ chunk-a7sxm3q7.js:6875-6954 placement
/**
 * /wellbeing 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
var runWellbeingCommand = async (onDone) => {
  onDone("Wellbeing settings are not available in this build");
  return null;
};
export { WELLBEING_ROW_HEIGHT, runWellbeingCommand };
