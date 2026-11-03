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
function advanceToolWindowTiming(l, t) {
  let { toolWindowStart, toolWindowEnd, thinkingBurstStart } = l;
  if (t.hasActiveTools) {
    if (t.toolWindowStartedAt !== null) toolWindowStart = Math.min(t.toolWindowStartedAt, t.now);
    else if (toolWindowStart === null || toolWindowEnd !== null) toolWindowStart = t.now;
    toolWindowEnd = null;
  } else if (toolWindowStart !== null && toolWindowEnd === null) toolWindowEnd = t.now;
  if (!t.hasActiveTools && t.thinkingStatus !== null) {
    toolWindowStart = null;
    toolWindowEnd = null;
  }
  if (t.isThinking) {
    if (!l.wasThinking) thinkingBurstStart = t.now;
  } else thinkingBurstStart = null;
  return {
    toolWindowStart,
    toolWindowEnd,
    thinkingBurstStart,
    wasThinking: t.isThinking,
  };
}
//@ chunk-3mec1atf.js:6460-7190 placement
function toolWindowPhase(l, t) {
  if (t.showToolCallTimer && t.hasActiveTools && l.toolWindowStart !== null) {
    let u = t.now - l.toolWindowStart;
    if (u >= 2000)
      return {
        kind: "tool-running",
        toolMs: u,
      };
  }
  if (t.outputLimitRecovery !== null && !t.hasActiveTools)
    return {
      kind: "recovering",
      recovery: t.outputLimitRecovery,
    };
  if (
    t.showToolCallTimer &&
    !t.hasActiveTools &&
    t.thinkingStatus === null &&
    l.toolWindowStart !== null &&
    l.toolWindowEnd !== null
  ) {
    let u = l.toolWindowEnd - l.toolWindowStart;
    if (u >= 2000)
      return {
        kind: "tool-done",
        toolMs: u,
      };
  }
  if (t.thinkingStatus === "thinking" && !t.hasActiveTools)
    return {
      kind: "thinking",
      thinkingMs: l.thinkingBurstStart !== null ? t.now - l.thinkingBurstStart : 0,
    };
  if (typeof t.thinkingStatus === "number")
    return {
      kind: "thought-for",
      thoughtMs: t.thinkingStatus,
    };
  return {
    kind: "none",
  };
}
//@ chunk-3mec1atf.js:7190-7367 placement
function thinkingBurstIntensity(l, t) {
  if (t.hasActiveTools) return 0;
  if (!t.isThinking || l.thinkingBurstStart === null) return 0;
  let u = t.now - l.thinkingBurstStart;
  return Math.min(Math.max((u - 1e4) / 1e4, 0), 1);
}
//@ chunk-3mec1atf.js:7367-7371 placement
init_react_production();
export { createToolWindowTimingState, advanceToolWindowTiming, toolWindowPhase, thinkingBurstIntensity };
