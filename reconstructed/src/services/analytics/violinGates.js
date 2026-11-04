/**
 * services/analytics/violinGates.ts
 *
 * 2.1.316 新增。tengu_violin_* 系列开关（设备身份、设置上云、插件转发）与开关拉取等待。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-g8d4yw80.js (21)
 * attribution: placement 21
 */
import {
  checkGate_CACHED_OR_BLOCKING,
  getFeatureValue_CACHED_MAY_BE_STALE,
  checkGate_OWN_OFF_FIRST,
  getFeatureValueWithSource_CACHED_MAY_BE_STALE,
  isServedFeatureSource,
  initializeGrowthBook,
} from "./growthbook.js";

//@ chunk-g8d4yw80.js:242-319 placement
async function isViolinStradEnabledAsync() {
  try {
    return await checkGate_CACHED_OR_BLOCKING("tengu_violin_strad");
  } catch {
    return false;
  }
}
//@ chunk-g8d4yw80.js:319-386 placement
function isViolinStradEnabledCached() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_violin_strad", false);
  } catch {
    return false;
  }
}
//@ chunk-g8d4yw80.js:386-463 placement
async function isViolinWoodEnabled() {
  try {
    return await checkGate_CACHED_OR_BLOCKING("tengu_violin_wood");
  } catch {
    return false;
  }
}
//@ chunk-g8d4yw80.js:463-530 placement
function isViolinWoodEnabledCached() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_violin_wood", false);
  } catch {
    return false;
  }
}
//@ chunk-g8d4yw80.js:530-557 placement
var TENGU_VIOLIN_MAPLE = "tengu_violin_maple";
//@ chunk-g8d4yw80.js:557-630 placement
async function isDeviceIdentityEnabled() {
  try {
    return (await isViolinWoodEnabled()) || (await checkGate_OWN_OFF_FIRST(TENGU_VIOLIN_MAPLE));
  } catch {
    return false;
  }
}
//@ chunk-g8d4yw80.js:630-685 placement
function isDeviceIdentityEnabledCached() {
  try {
    return isViolinWoodEnabledCached() || getFeatureValue_CACHED_MAY_BE_STALE(TENGU_VIOLIN_MAPLE, false);
  } catch {
    return false;
  }
}
//@ chunk-g8d4yw80.js:685-734 placement
async function isSettingsToCloudEnabled() {
  return (await isViolinWoodEnabled()) && (await isViolinStradEnabledAsync());
}
//@ chunk-g8d4yw80.js:734-765 placement
function isSettingsToCloudEnabledCached() {
  return isViolinWoodEnabledCached() && isViolinStradEnabledCached();
}
//@ chunk-g8d4yw80.js:765-806 placement
function getHomeSettingsForwardingBlocker(reason) {
  return reason ? null : "flag_off";
}
//@ chunk-g8d4yw80.js:806-842 placement
function canForwardHomeSettings(reason) {
  return getHomeSettingsForwardingBlocker(reason) === null;
}
//@ chunk-g8d4yw80.js:842-947 placement
function isViolinWoodServedOff() {
  try {
    let { value: flagValue, source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(
      "tengu_violin_wood",
      false,
    );
    return flagValue === false && isServedFeatureSource(source);
  } catch {
    return false;
  }
}
//@ chunk-g8d4yw80.js:947-981 placement
function isDeviceIdentityServedOff() {
  return isViolinWoodServedOff() && isServedFlagOff(TENGU_VIOLIN_MAPLE);
}
//@ chunk-g8d4yw80.js:981-1034 placement
function isViolinWoodServedOn() {
  return isViolinWoodEnabledCached() && isAccountGateServed("tengu_violin_wood");
}
//@ chunk-g8d4yw80.js:1034-1145 placement
/**
 * 等待自身开关拉取完成；本模块是 tengu_violin_* 系列开关（设备身份、设置上云、插件转发）。
 */
async function waitForOwnFlagFetch() {
  let startTime = performance.now();
  await initializeGrowthBook().catch(() => null);
  return Math.round(performance.now() - startTime);
}
//@ chunk-g8d4yw80.js:1145-1231 placement
function isServedFlagOff(key) {
  try {
    let { value, source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(key, false);
    return value === false && isServedFeatureSource(source);
  } catch {
    return false;
  }
}
//@ chunk-g8d4yw80.js:1231-1294 placement
function isAccountGateServed(gate) {
  try {
    return isServedFeatureSource(getFeatureValueWithSource_CACHED_MAY_BE_STALE(gate, false).source);
  } catch {
    return false;
  }
}
//@ chunk-g8d4yw80.js:1294-1373 placement
async function isViolinAmatiEnabled() {
  try {
    return await checkGate_CACHED_OR_BLOCKING("tengu_violin_amati");
  } catch {
    return false;
  }
}
//@ chunk-g8d4yw80.js:1373-1442 placement
function isViolinAmatiEnabledCached() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_violin_amati", false);
  } catch {
    return false;
  }
}
//@ chunk-g8d4yw80.js:1442-1476 placement
function isCloudPluginForwardingEnabledCached() {
  return isViolinWoodEnabledCached() && isViolinAmatiEnabledCached();
}
//@ chunk-g8d4yw80.js:1476-1550 placement
async function isCloudPluginForwardingFlagOn() {
  let [wood, amati] = await Promise.all([isViolinWoodEnabled(), isViolinAmatiEnabled()]);
  return wood && amati;
}
export {
  isViolinWoodEnabledCached,
  isDeviceIdentityEnabledCached,
  isDeviceIdentityEnabled,
  waitForOwnFlagFetch,
  isViolinWoodServedOn,
  isViolinWoodEnabled,
  isSettingsToCloudEnabled,
  canForwardHomeSettings,
  isCloudPluginForwardingEnabledCached,
  getHomeSettingsForwardingBlocker,
  isSettingsToCloudEnabledCached,
  isCloudPluginForwardingFlagOn,
  isViolinWoodServedOff,
  isDeviceIdentityServedOff,
  isViolinAmatiEnabledCached,
  isAccountGateServed,
  isViolinAmatiEnabled,
};
