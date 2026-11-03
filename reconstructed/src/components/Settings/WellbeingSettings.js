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
import { j } from "../../../vendor/react/cjs/react.production.js";

//@ chunk-a7sxm3q7.js:5714-5718 placement
j();
//@ chunk-a7sxm3q7.js:5718-5749 placement
function Z(gn, bn) {
  return gn - bn;
}
//@ chunk-a7sxm3q7.js:5749-5921 placement
function toIntervalOption(fn) {
  return {
    value: String(fn),
    label: !INTERVAL_PRESETS.includes(fn)
      ? `Custom \xB7 every ${spanOf(fn)}`
      : fn === C
        ? `Every ${spanOf(fn)} (default)`
        : `Every ${spanOf(fn)}`,
  };
}
//@ chunk-a7sxm3q7.js:5921-5952 placement
function O(hn, vn) {
  return hn - vn;
}
//@ chunk-a7sxm3q7.js:5952-6107 placement
function toThresholdOption(pn) {
  return {
    value: String(pn),
    label: !THRESHOLD_PRESETS.includes(pn)
      ? `Custom \xB7 ${pn} minutes`
      : pn === M
        ? `${pn} minutes (default)`
        : `${pn} minutes`,
  };
}
//@ chunk-a7sxm3q7.js:6107-6865 placement
function WellbeingSettings() {
  let qn = i("breakReminder", { enabled: !1 }).value;
  let wn = i("quietHours", { enabled: !1 }).value;
  let Mn = {
    enabled: qn.enabled ?? !1,
    intervalMinutes: qn.intervalMinutes ?? C,
    breakThresholdMinutes: qn.breakThresholdMinutes ?? M,
    quiet: { enabled: wn.enabled ?? !1, start: wn.start, end: wn.end },
  };
  let kn = wn.start && wn.end ? { start: wn.start, end: wn.end } : void 0;
  let xn = kn && !QUIET_PRESETS.some((Cn) => keyOf(Cn) === keyOf(kn)) ? kn : void 0;
  return {
    draft: Mn,
    intervals: t([...INTERVAL_PRESETS, Mn.intervalMinutes])
      .sort(Z)
      .map(toIntervalOption),
    thresholds: t([...THRESHOLD_PRESETS, Mn.breakThresholdMinutes])
      .sort(O)
      .map(toThresholdOption),
    quiets: [
      { value: "off", label: "Off", range: void 0 },
      ...[...QUIET_PRESETS, ...(xn ? [xn] : [])].map((Dn) => ({
        value: keyOf(Dn),
        label: `${Dn === xn ? "Custom \xB7 " : ""}${Dn.start} \u2013 ${Dn.end}`,
        range: Dn,
      })),
    ],
  };
}
//@ chunk-a7sxm3q7.js:6865-6875 placement
var z = 200;
/**
 * /wellbeing 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
//@ chunk-a7sxm3q7.js:6875-6954 placement
var runWellbeingCommand = async (onDone) => (
  onDone("Wellbeing settings are not available in this build"),
  null
);
