/**
 * utils/launchDirPosition.ts
 *
 * 2.1.316 新增：启动目录位置。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-c6ksygmx.js (3)
 * attribution: placement 3
 */
import { getFeatureValue_SESSION_PINNED } from "../services/analytics/growthbook.js";
import { isPathUnder } from "./pathPrefix.js";

//@ chunk-c6ksygmx.js:264-294 placement
var TENGU_HARP_FOREPILLAR = "tengu_harp_forepillar";
//@ chunk-c6ksygmx.js:294-330 placement
function KZt() {
  return getFeatureValue_SESSION_PINNED(TENGU_HARP_FOREPILLAR, !1) === !0;
}
//@ chunk-c6ksygmx.js:330-424 placement
function pAs(e, r) {
  if (e === r) return "launch_dir";
  return isPathUnder(e, r) ? "inside_launch_dir" : "elsewhere";
}

export { pAs, KZt };
