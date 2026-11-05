/**
 * services/compact/autoCompactStatus.ts
 *
 * 自动压缩状态（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-gf1bbvvf.js (3)
 * attribution: placement 3
 */
import { isAutoCompactEnabled, canCompactInRemote } from "./compactSettings.js";
import { getModelContextInfo } from "../../utils/model/modelContextInfo.js";
import { effectiveContextWindow, hasExplicitWindow, windowSource } from "./autoCompactWindow.js";
import { getAutoCompactThresholdTokens } from "./autoCompact.js";

//@ chunk-gf1bbvvf.js:281-433 placement
/**
 * 自动压缩状态快照（开关、有效窗口、阈值、是否执行、来源）。
 */
function computeAutocompactState(model, autoCompactWindow) {
  let enabled = isAutoCompactEnabled();
  let modelContextInfo = getModelContextInfo(model);
  let effectiveWindow = effectiveContextWindow(modelContextInfo, autoCompactWindow);
  let threshold = getAutoCompactThresholdTokens(modelContextInfo, autoCompactWindow);
  let enforced = !(canCompactInRemote() && !hasExplicitWindow(modelContextInfo, autoCompactWindow));
  return {
    enabled,
    effectiveWindow,
    threshold,
    enforced,
    source: windowSource(modelContextInfo, autoCompactWindow),
  };
}
//@ chunk-gf1bbvvf.js:433-547 placement
/**
 * 状态变化时才通知的自动压缩状态上报器。
 */
function createAutocompactStateReporter(onChange) {
  let lastState;
  return {
    notify(input, now) {
      let autocompactState = computeAutocompactState(input, now);
      if (lastState !== undefined && sameAutocompactState(lastState, autocompactState)) return;
      lastState = autocompactState;
      onChange(autocompactState);
    },
    reset() {
      lastState = undefined;
    },
  };
}
//@ chunk-gf1bbvvf.js:547-706 placement
/**
 * 两个状态快照是否相同。
 */
function sameAutocompactState(state, autocompactState) {
  return (
    state.enabled === autocompactState.enabled &&
    state.effectiveWindow === autocompactState.effectiveWindow &&
    state.threshold === autocompactState.threshold &&
    state.enforced === autocompactState.enforced &&
    state.source === autocompactState.source
  );
}
export { sameAutocompactState, createAutocompactStateReporter };
