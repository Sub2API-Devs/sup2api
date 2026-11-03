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
import { effectiveContextWindow, abe, fse } from "./autoCompactWindow.js";
import { getAutoCompactThresholdTokens } from "./autoCompact.js";

/**
 * 自动压缩状态快照（开关、有效窗口、阈值、是否执行、来源）。
 */
//@ chunk-4x54g1ez.js:280-431 placement
function computeAutocompactState(o, t) {
  let c = isAutoCompactEnabled(),
    e = getModelContextInfo(o),
    n = effectiveContextWindow(e, t),
    a = getAutoCompactThresholdTokens(e, t),
    r = !(canCompactInRemote() && !abe(e, t));
  return { enabled: c, effectiveWindow: n, threshold: a, enforced: r, source: fse(e, t) };
}
/**
 * 状态变化时才通知的自动压缩状态上报器。
 */
//@ chunk-4x54g1ez.js:431-545 placement
function createAutocompactStateReporter(o) {
  let t;
  return {
    notify(c, e) {
      let n = computeAutocompactState(c, e);
      if (t !== void 0 && sameAutocompactState(t, n)) return;
      ((t = n), o(n));
    },
    reset() {
      t = void 0;
    },
  };
}
/**
 * 两个状态快照是否相同。
 */
//@ chunk-4x54g1ez.js:545-704 placement
function sameAutocompactState(o, t) {
  return (
    o.enabled === t.enabled &&
    o.effectiveWindow === t.effectiveWindow &&
    o.threshold === t.threshold &&
    o.enforced === t.enforced &&
    o.source === t.source
  );
}

export { sameAutocompactState, createAutocompactStateReporter };
