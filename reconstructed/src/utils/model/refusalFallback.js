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

/**
 * 会话切换时重置拒答回退锁存并上报 tengu_refusal_fallback_latch_reset。
 */
//@ chunk-jbv0t0w5.js:36947-37155 placement
function resetRefusalFallbackOnSwitch(e) {
  return onSessionSwitch((n, o, r) => {
    if (!r) return;
    (applyFastMode(r, e),
      logEvent("tengu_refusal_fallback_latch_reset", {
        source: fromEnum(o),
        restored_to_explicit_override: r.restoredToExplicitOverride,
        model_scope: fromEnum(classifyFallbackOrigin(r.fallbackModel)),
      }));
  });
}
//@ chunk-jbv0t0w5.js:37155-37202 placement
function JPs(e) {
  return onSessionSwitch((n, o, r) => {
    if (r) e();
  });
}

export { resetRefusalFallbackOnSwitch, JPs };
