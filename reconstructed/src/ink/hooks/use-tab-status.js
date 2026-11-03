/**
 * ink/hooks/use-tab-status.ts
 *
 * 仅并入模块初始化调用
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/hooks/use-tab-status.ts
 * pieces: chunk-x6v6jz2y.js (2)
 * attribution: placement 1, fingerprint 1
 */
import { j } from "../../../vendor/react/cjs/react.production.js";

//@ chunk-x6v6jz2y.js:27197-27201 placement
j();
/**
 * 标签页状态预设：idle（绿点，“Idle”）、busy（橙点，“Working…”）、waiting（蓝点，“Waiting”）。
 */
//@ chunk-x6v6jz2y.js:27201-27473 fingerprint = TAB_STATUS_PRESETS (0.846)
var rgb = (o, r, l) => ({ type: "rgb", r: o, g: r, b: l }),
  TAB_STATUS_PRESETS = {
    idle: { indicator: rgb(0, 215, 95), status: "Idle", statusColor: rgb(136, 136, 136) },
    busy: { indicator: rgb(255, 149, 0), status: "Working\u2026", statusColor: rgb(255, 149, 0) },
    waiting: { indicator: rgb(95, 135, 255), status: "Waiting", statusColor: rgb(95, 135, 255) },
  };

export { TAB_STATUS_PRESETS };
