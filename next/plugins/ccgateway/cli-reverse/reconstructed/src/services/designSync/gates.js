/**
 * services/designSync/gates.ts
 *
 * 2.1.316 新增。设计同步开关。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-y6jvepgj.js (4)
 * attribution: placement 4
 */
import { isPolicyAllowed } from "../policyLimits/policyEvidence.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import { isFirstPartyProvider } from "../../utils/model/providers.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";

//@ chunk-y6jvepgj.js:334-363 placement
var TENGU_OMELETTE_FOUET = "tengu_omelette_fouet";
//@ chunk-y6jvepgj.js:363-465 placement
/**
 * 判断 Claude Design 同步是否可用（策略允许、非必要流量模式、第一方提供方、开关开启）。
 */
function isDesignSyncEnabled() {
  if (!isPolicyAllowed("allow_design_sync")) return false;
  if (isEssentialTrafficOnly()) return false;
  if (!isFirstPartyProvider()) return false;
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_OMELETTE_FOUET, false);
}
//@ chunk-y6jvepgj.js:465-500 placement
var TENGU_OMELETTE_GRANT_WATCH = "tengu_omelette_grant_watch";
//@ chunk-y6jvepgj.js:500-530 placement
/**
 * 读 tengu_omlette_grant_watch（默认关）。
 */
function isDesignGrantWatchEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_OMELETTE_GRANT_WATCH, false);
}
export { isDesignSyncEnabled, isDesignGrantWatchEnabled };
