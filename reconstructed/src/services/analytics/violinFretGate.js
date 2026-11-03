/**
 * services/analytics/violinFretGate.ts
 *
 * 2.1.316 新增。tengu_violin_fret 开关：无人值守服务同意闸门。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4qkxr5m3.js (3)
 * attribution: placement 3
 */
import { checkGate_CACHED_OR_BLOCKING } from "./growthbook.js";
import { isViolinWillowEnabledCached } from "./violinWillowGate.js";
import { isViolinWoodEnabled } from "./violinGates.js";

//@ chunk-4qkxr5m3.js:300-326 placement
var TENGU_VIOLIN_FRET = "tengu_violin_fret";
/**
 * tengu_violin_fret 开关：无人值守服务同意闸门。
 */
//@ chunk-4qkxr5m3.js:326-386 placement
async function isViolinFretEnabled() {
  try {
    return await checkGate_CACHED_OR_BLOCKING(TENGU_VIOLIN_FRET);
  } catch {
    return !1;
  }
}
//@ chunk-4qkxr5m3.js:386-445 placement
async function isUnattendedServingConsentGateOn() {
  return isViolinWillowEnabledCached() && (await isViolinWoodEnabled()) && (await isViolinFretEnabled());
}

export { isUnattendedServingConsentGateOn };
