/**
 * services/artifacts/startKitSwitch.ts
 *
 * 2.1.316 新增。tengu_concurrent_candle 开关：Artifact 快速起步套件是否开启。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-0p181y8d.js (2)
 * attribution: placement 2
 */
import { env } from "../../utils/env.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";

//@ chunk-0p181y8d.js:261-298 placement
/**
 * Artifact 快速起步套件开关 tengu_concurrent_candle 及其默认值 false。
 */
var TENGU_CONCURRENT_CANDLE = "tengu_concurrent_candle";
var START_KIT_DEFAULT = false;
//@ chunk-0p181y8d.js:298-366 placement
/**
 * tengu_concurrent_candle 开关：Artifact 快速起步套件是否开启。
 */
function startKitSwitchOn() {
  return (
    env.CLAUDE_CODE_ARTIFACT_START_KIT ??
    getFeatureValue_CACHED_MAY_BE_STALE(TENGU_CONCURRENT_CANDLE, START_KIT_DEFAULT) === true
  );
}
export { startKitSwitchOn };
