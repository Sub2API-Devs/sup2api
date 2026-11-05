/**
 * utils/launchDirPosition.ts
 *
 * 2.1.316 新增：启动目录位置。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7radp4f3.js (3)
 * attribution: placement 3
 */
import { getFeatureValue_SESSION_PINNED } from "../services/analytics/growthbook.js";
import { isPathUnder } from "./pathPrefix.js";

//@ chunk-7radp4f3.js:264-294 placement
var TENGU_HARP_FOREPILLAR = "tengu_harp_forepillar";
//@ chunk-7radp4f3.js:294-330 placement
/**
 * 判断 tengu_harp_forepillar 会话开关是否开启。
 */
function isHarpForepillarOn() {
  return getFeatureValue_SESSION_PINNED(TENGU_HARP_FOREPILLAR, false) === true;
}
//@ chunk-7radp4f3.js:330-424 placement
/**
 * 判断目标路径相对启动目录的位置（同目录/在其内/其它）。
 */
function classifyLaunchDirPosition(cwd, originalCwd) {
  if (cwd === originalCwd) return "launch_dir";
  return isPathUnder(cwd, originalCwd) ? "inside_launch_dir" : "elsewhere";
}
export { classifyLaunchDirPosition, isHarpForepillarOn };
