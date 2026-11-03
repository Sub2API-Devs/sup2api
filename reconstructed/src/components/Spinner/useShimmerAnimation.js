/**
 * components/Spinner/useShimmerAnimation.ts
 *
 * Spinner 微光动画 hook。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/Spinner/useShimmerAnimation.ts
 * pieces: chunk-tbfde207.js (1)
 * attribution: fingerprint 1
 */
import { isBridgeStateFramesEnabled } from "../../bridge/bridgeGates.js";

//@ chunk-tbfde207.js:1482-1529 fingerprint = useShimmerAnimation (1)
function useShimmerAnimation(e) {
  return e !== "requesting" && isBridgeStateFramesEnabled();
}

export { useShimmerAnimation };
