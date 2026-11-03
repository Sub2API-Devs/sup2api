/**
 * services/analytics/violinWillowGate.ts
 *
 * 2.1.316 新增。工具服务开关 tengu_violin_willow 是否明确为关。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-j61dm7j5.js (6)
 * attribution: placement 6
 */
import {
  getFeatureValueWithSource_CACHED_MAY_BE_STALE,
  isServedFeatureSource,
  getFeatureValue_CACHED_MAY_BE_STALE,
  checkGate_OWN_OFF_FIRST,
} from "./growthbook.js";
import { isViolinWoodServedOn, isViolinWoodServedOff, isViolinWoodEnabled } from "./violinGates.js";

//@ chunk-j61dm7j5.js:280-310 placement
var VIOLIN_WILLOW_FLAG = "tengu_violin_willow";
//@ chunk-j61dm7j5.js:310-403 placement
function getViolinWillowOwnAnswer() {
  try {
    let { value: e, source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(VIOLIN_WILLOW_FLAG, false);
    return isServedFeatureSource(source) ? e === true : undefined;
  } catch {
    return;
  }
}
//@ chunk-j61dm7j5.js:403-455 placement
function isViolinWillowEnabledCached() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE(VIOLIN_WILLOW_FLAG, false);
  } catch {
    return false;
  }
}
//@ chunk-j61dm7j5.js:455-495 placement
function isCloudClientToolServingAnsweredOn() {
  return isViolinWoodServedOn() && getViolinWillowOwnAnswer() === true;
}
//@ chunk-j61dm7j5.js:495-592 placement
/**
 * 工具服务开关 tengu_violin_willow 是否明确为关。
 */
function getToolServingFlagAnsweredOff({ cloudClient }) {
  if (isViolinWoodServedOff()) return "tengu_violin_wood";
  return cloudClient && getViolinWillowOwnAnswer() === false ? VIOLIN_WILLOW_FLAG : undefined;
}
//@ chunk-j61dm7j5.js:592-688 placement
async function isToolServingEnabled({ cloudClient }) {
  try {
    return (
      (await isViolinWoodEnabled()) && (!cloudClient || (await checkGate_OWN_OFF_FIRST(VIOLIN_WILLOW_FLAG)))
    );
  } catch {
    return false;
  }
}
export {
  isViolinWillowEnabledCached,
  VIOLIN_WILLOW_FLAG,
  isCloudClientToolServingAnsweredOn,
  getToolServingFlagAnsweredOff,
  getViolinWillowOwnAnswer,
  isToolServingEnabled,
};
