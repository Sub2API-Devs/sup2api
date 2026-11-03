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
async function t() {
  try {
    return await checkGate_CACHED_OR_BLOCKING("tengu_violin_strad");
  } catch {
    return !1;
  }
}
//@ chunk-g8d4yw80.js:319-386 placement
function r() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_violin_strad", !1);
  } catch {
    return !1;
  }
}
//@ chunk-g8d4yw80.js:386-463 placement
async function isViolinWoodEnabled() {
  try {
    return await checkGate_CACHED_OR_BLOCKING("tengu_violin_wood");
  } catch {
    return !1;
  }
}
//@ chunk-g8d4yw80.js:463-530 placement
function isViolinWoodEnabledCached() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_violin_wood", !1);
  } catch {
    return !1;
  }
}
//@ chunk-g8d4yw80.js:530-557 placement
var TENGU_VIOLIN_MAPLE = "tengu_violin_maple";
//@ chunk-g8d4yw80.js:557-630 placement
async function isDeviceIdentityEnabled() {
  try {
    return (await isViolinWoodEnabled()) || (await checkGate_OWN_OFF_FIRST(TENGU_VIOLIN_MAPLE));
  } catch {
    return !1;
  }
}
//@ chunk-g8d4yw80.js:630-685 placement
function isDeviceIdentityEnabledCached() {
  try {
    return isViolinWoodEnabledCached() || getFeatureValue_CACHED_MAY_BE_STALE(TENGU_VIOLIN_MAPLE, !1);
  } catch {
    return !1;
  }
}
//@ chunk-g8d4yw80.js:685-734 placement
async function isSettingsToCloudEnabled() {
  return (await isViolinWoodEnabled()) && (await t());
}
//@ chunk-g8d4yw80.js:734-765 placement
function isSettingsToCloudEnabledCached() {
  return isViolinWoodEnabledCached() && r();
}
//@ chunk-g8d4yw80.js:765-806 placement
function getHomeSettingsForwardingBlocker(e) {
  return e ? null : "flag_off";
}
//@ chunk-g8d4yw80.js:806-842 placement
function canForwardHomeSettings(e) {
  return getHomeSettingsForwardingBlocker(e) === null;
}
//@ chunk-g8d4yw80.js:842-947 placement
function isViolinWoodServedOff() {
  try {
    let { value: e, source: source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE("tengu_violin_wood", !1);
    return e === !1 && isServedFeatureSource(source);
  } catch {
    return !1;
  }
}
//@ chunk-g8d4yw80.js:947-981 placement
function isDeviceIdentityServedOff() {
  return isViolinWoodServedOff() && i(TENGU_VIOLIN_MAPLE);
}
//@ chunk-g8d4yw80.js:981-1034 placement
function isViolinWoodServedOn() {
  return isViolinWoodEnabledCached() && isAccountGateServed("tengu_violin_wood");
}
/**
 * 等待自身开关拉取完成；本模块是 tengu_violin_* 系列开关（设备身份、设置上云、插件转发）。
 */
//@ chunk-g8d4yw80.js:1034-1145 placement
async function waitForOwnFlagFetch() {
  let startTime = performance.now();
  return (await initializeGrowthBook().catch(() => null), Math.round(performance.now() - startTime));
}
//@ chunk-g8d4yw80.js:1145-1231 placement
function i(e) {
  try {
    let { value: o, source: source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(e, !1);
    return o === !1 && isServedFeatureSource(source);
  } catch {
    return !1;
  }
}
//@ chunk-g8d4yw80.js:1231-1294 placement
function isAccountGateServed(e) {
  try {
    return isServedFeatureSource(getFeatureValueWithSource_CACHED_MAY_BE_STALE(e, !1).source);
  } catch {
    return !1;
  }
}
//@ chunk-g8d4yw80.js:1294-1373 placement
async function isViolinAmatiEnabled() {
  try {
    return await checkGate_CACHED_OR_BLOCKING("tengu_violin_amati");
  } catch {
    return !1;
  }
}
//@ chunk-g8d4yw80.js:1373-1442 placement
function isViolinAmatiEnabledCached() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_violin_amati", !1);
  } catch {
    return !1;
  }
}
//@ chunk-g8d4yw80.js:1442-1476 placement
function isCloudPluginForwardingEnabledCached() {
  return isViolinWoodEnabledCached() && isViolinAmatiEnabledCached();
}
//@ chunk-g8d4yw80.js:1476-1550 placement
async function isCloudPluginForwardingFlagOn() {
  let [e, o] = await Promise.all([isViolinWoodEnabled(), isViolinAmatiEnabled()]);
  return e && o;
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
};
