/**
 * utils/model/refusalFallback.ts
 *
 * 2.1.316 新增。拒答回退模型。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-jbv0t0w5.js (2)
 * attribution: placement 2
 */
import { onSessionSwitch } from "../../bootstrap/state.js";
import { applyFastMode } from "../../commands/fast/fast.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { classifyFallbackOrigin } from "../../services/api/refusalFallback.js";

//@ chunk-jbv0t0w5.js:36947-37155 placement
/**
 * 会话切换时重置拒答回退锁存并上报 tengu_refusal_fallback_latch_reset。
 */
function resetRefusalFallbackOnSwitch(setAppState) {
  return onSessionSwitch((state, switchInfo, enable) => {
    if (!enable) return;
    applyFastMode(enable, setAppState);
    logEvent("tengu_refusal_fallback_latch_reset", {
      source: fromEnum(switchInfo),
      restored_to_explicit_override: enable.restoredToExplicitOverride,
      model_scope: fromEnum(classifyFallbackOrigin(enable.fallbackModel)),
    });
  });
}
//@ chunk-jbv0t0w5.js:37155-37202 placement
/**
 * 注册"切换会话时"的回调。
 */
function onSessionSwitchCallback(fn) {
  return onSessionSwitch((state, source, apply) => {
    if (apply) fn();
  });
}
export { resetRefusalFallbackOnSwitch, onSessionSwitchCallback };
