/**
 * services/artifacts/startKitSwitch.ts
 *
 * 2.1.316 新增。tengu_concurrent_candle 开关：Artifact 快速起步套件是否开启。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-11fv1n21.js (2)
 * attribution: placement 2
 */
import { env } from "../../utils/env.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";

//@ chunk-11fv1n21.js:261-298 placement
var TENGU_CONCURRENT_CANDLE = "tengu_concurrent_candle",
  e = !1;
/**
 * tengu_concurrent_candle 开关：Artifact 快速起步套件是否开启。
 */
//@ chunk-11fv1n21.js:298-366 placement
function startKitSwitchOn() {
  return (
    env.CLAUDE_CODE_ARTIFACT_START_KIT ??
    getFeatureValue_CACHED_MAY_BE_STALE(TENGU_CONCURRENT_CANDLE, e) === !0
  );
}

export { startKitSwitchOn };
