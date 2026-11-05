/**
 * components/Spinner/useShimmerAnimation.ts
 *
 * Spinner 微光动画 hook。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/Spinner/useShimmerAnimation.ts
 * pieces: chunk-ct61sn5h.js (1)
 * attribution: fingerprint 1
 */
import { isBridgeStateFramesEnabled } from "../../bridge/bridgeGates.js";

//@ chunk-ct61sn5h.js:1522-1569 fingerprint (2.1.88 match: useShimmerAnimation, 1)
function useShimmerAnimation(status) {
  return status !== "requesting" && isBridgeStateFramesEnabled();
}
export { useShimmerAnimation };
