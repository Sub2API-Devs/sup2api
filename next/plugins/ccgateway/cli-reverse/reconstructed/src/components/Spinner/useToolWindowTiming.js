/**
 * components/Spinner/useToolWindowTiming.ts
 *
 * 2.1.316 新增。工具运行窗口阶段计时（tool-running/recovering…）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3mec1atf.js (6)
 * attribution: placement 6
 */
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";

//@ chunk-3mec1atf.js:5903-5907 placement
init_react_production();
//@ chunk-3mec1atf.js:5907-6008 placement
function createToolWindowTimingState() {
  return {
    toolWindowStart: null,
    toolWindowEnd: null,
    thinkingBurstStart: null,
    wasThinking: false,
  };
}
//@ chunk-3mec1atf.js:6008-6460 placement
/**
 * 根据当前帧（是否有活动工具、thinking 状态、当前时间）推进工具运行窗口与 thinking 爆发的起止时间，返回新状态。
 */
function advanceToolWindowTiming(timing, state) {
  let { toolWindowStart, toolWindowEnd, thinkingBurstStart } = timing;
  if (state.hasActiveTools) {
    if (state.toolWindowStartedAt !== null) toolWindowStart = Math.min(state.toolWindowStartedAt, state.now);
    else if (toolWindowStart === null || toolWindowEnd !== null) toolWindowStart = state.now;
    toolWindowEnd = null;
  } else if (toolWindowStart !== null && toolWindowEnd === null) toolWindowEnd = state.now;
  if (!state.hasActiveTools && state.thinkingStatus !== null) {
    toolWindowStart = null;
    toolWindowEnd = null;
  }
  if (state.isThinking) {
    if (!timing.wasThinking) thinkingBurstStart = state.now;
  } else thinkingBurstStart = null;
  return {
    toolWindowStart,
    toolWindowEnd,
    thinkingBurstStart,
    wasThinking: state.isThinking,
  };
}
//@ chunk-3mec1atf.js:6460-7190 placement
function toolWindowPhase(timing, state) {
  if (state.showToolCallTimer && state.hasActiveTools && timing.toolWindowStart !== null) {
    let elapsedMs = state.now - timing.toolWindowStart;
    if (elapsedMs >= 2000)
      return {
        kind: "tool-running",
        toolMs: elapsedMs,
      };
  }
  if (state.outputLimitRecovery !== null && !state.hasActiveTools)
    return {
      kind: "recovering",
      recovery: state.outputLimitRecovery,
    };
  if (
    state.showToolCallTimer &&
    !state.hasActiveTools &&
    state.thinkingStatus === null &&
    timing.toolWindowStart !== null &&
    timing.toolWindowEnd !== null
  ) {
    let phase = timing.toolWindowEnd - timing.toolWindowStart;
    if (phase >= 2000)
      return {
        kind: "tool-done",
        toolMs: phase,
      };
  }
  if (state.thinkingStatus === "thinking" && !state.hasActiveTools)
    return {
      kind: "thinking",
      thinkingMs: timing.thinkingBurstStart !== null ? state.now - timing.thinkingBurstStart : 0,
    };
  if (typeof state.thinkingStatus === "number")
    return {
      kind: "thought-for",
      thoughtMs: state.thinkingStatus,
    };
  return {
    kind: "none",
  };
}
//@ chunk-3mec1atf.js:7190-7367 placement
function thinkingBurstIntensity(timing, state) {
  if (state.hasActiveTools) return 0;
  if (!state.isThinking || timing.thinkingBurstStart === null) return 0;
  let intensity = state.now - timing.thinkingBurstStart;
  return Math.min(Math.max((intensity - 1e4) / 1e4, 0), 1);
}
//@ chunk-3mec1atf.js:7367-7371 placement
init_react_production();
export { createToolWindowTimingState, advanceToolWindowTiming, toolWindowPhase, thinkingBurstIntensity };
