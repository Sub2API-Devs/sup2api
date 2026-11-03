/**
 * services/compact/autoCompactStatus.ts
 *
 * 自动压缩状态（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4x54g1ez.js (3)
 * attribution: placement 3
 */
import { isAutoCompactEnabled, canCompactInRemote } from "./compactSettings.js";
import { getModelContextInfo } from "../../utils/model/modelContextInfo.js";
import { effectiveContextWindow, hasExplicitWindow, windowSource } from "./autoCompactWindow.js";
import { getAutoCompactThresholdTokens } from "./autoCompact.js";

//@ chunk-4x54g1ez.js:280-431 placement
/**
 * 自动压缩状态快照（开关、有效窗口、阈值、是否执行、来源）。
 */
function computeAutocompactState(o, t) {
  let enabled = isAutoCompactEnabled();
  let modelContextInfo = getModelContextInfo(o);
  let effectiveWindow = effectiveContextWindow(modelContextInfo, t);
  let threshold = getAutoCompactThresholdTokens(modelContextInfo, t);
  let enforced = !(canCompactInRemote() && !hasExplicitWindow(modelContextInfo, t));
  return {
    enabled,
    effectiveWindow,
    threshold,
    enforced,
    source: windowSource(modelContextInfo, t),
  };
}
//@ chunk-4x54g1ez.js:431-545 placement
/**
 * 状态变化时才通知的自动压缩状态上报器。
 */
function createAutocompactStateReporter(o) {
  let t;
  return {
    notify(c, e) {
      let autocompactState = computeAutocompactState(c, e);
      if (t !== undefined && sameAutocompactState(t, autocompactState)) return;
      t = autocompactState;
      o(autocompactState);
    },
    reset() {
      t = undefined;
    },
  };
}
//@ chunk-4x54g1ez.js:545-704 placement
/**
 * 两个状态快照是否相同。
 */
function sameAutocompactState(o, autocompactState) {
  return (
    o.enabled === autocompactState.enabled &&
    o.effectiveWindow === autocompactState.effectiveWindow &&
    o.threshold === autocompactState.threshold &&
    o.enforced === autocompactState.enforced &&
    o.source === autocompactState.source
  );
}
export { sameAutocompactState, createAutocompactStateReporter };
