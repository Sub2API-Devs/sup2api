/**
 * ink/hooks/use-tab-status.ts
 *
 * 仅并入模块初始化调用
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/hooks/use-tab-status.ts
 * pieces: chunk-czq1j3j2.js (2)
 * attribution: fingerprint 1, placement 1
 */
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";

//@ chunk-czq1j3j2.js:1465040-1465320 fingerprint (2.1.88 match: TAB_STATUS_PRESETS, 0.844)
/**
 * 标签页状态预设：idle（绿点，“Idle”）、busy（橙点，“Working…”）、waiting（蓝点，“Waiting”）。
 */
var rgb = (red, green, blue) => ({
  type: "rgb",
  r: red,
  g: green,
  b: blue,
});
var TAB_STATUS_PRESETS = {
  idle: {
    indicator: rgb(0, 215, 95),
    status: "Idle",
    statusColor: rgb(136, 136, 136),
  },
  busy: {
    indicator: rgb(255, 149, 0),
    status: "Working\u2026",
    statusColor: rgb(255, 149, 0),
  },
  waiting: {
    indicator: rgb(95, 135, 255),
    status: "Waiting",
    statusColor: rgb(95, 135, 255),
  },
};
//@ chunk-czq1j3j2.js:1886890-1886894 placement
init_react_production();
export { TAB_STATUS_PRESETS };
