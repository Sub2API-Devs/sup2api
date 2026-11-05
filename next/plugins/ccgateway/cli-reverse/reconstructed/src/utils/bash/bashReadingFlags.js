/**
 * utils/bash/bashReadingFlags.ts
 *
 * 2.1.316 新增：Bash 命令读取相关功能开关
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-fg9fwa9r.js (32)
 * attribution: placement 32
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { AsyncLocalStorage } from "async_hooks";
import { envReaderHolder } from "../gitSafeExec.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-fg9fwa9r.js:276-315 placement
var TENGU_STURDY_LANTERN; // deferred: uses envReaderHolder (../gitSafeExec.js) of its import cycle while loading; runs once the cycle is complete
var sturdyLanternSetting;
deferInit("chunk-fg9fwa9r.js:276", () => {
  TENGU_STURDY_LANTERN = "tengu_sturdy_lantern";
  sturdyLanternSetting = new envReaderHolder();
});
//@ chunk-fg9fwa9r.js:315-352 placement
/**
 * 注册 bash 读标志的判定器。
 */
function registerSetting(reader) {
  return sturdyLanternSetting.register(reader);
}
//@ chunk-fg9fwa9r.js:352-364 placement
var bypassStorage; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-fg9fwa9r.js:352", () => {
  bypassStorage = new AsyncLocalStorage();
});
//@ chunk-fg9fwa9r.js:364-399 placement
/**
 * 在 AsyncLocalStorage 上下文里跑一次 bash 读标志判定。
 */
function withSturdyLanternOff(fn) {
  return bypassStorage.run(true, fn);
}
//@ chunk-fg9fwa9r.js:399-453 placement
/**
 * 当前上下文是否不是“已知可读”，否则回落到开关默认值。
 */
function isSturdyLanternDefault() {
  return bypassStorage.getStore() !== true && sturdyLanternSetting.read(TENGU_STURDY_LANTERN, true);
}
//@ chunk-fg9fwa9r.js:453-527 placement
/**
 * 保存开关读取器的容器。
 */
class warmSunriseReaderState {
  reader = null;
  register(reader) {
    let reader_2 = this.reader;
    this.reader = reader;
    return reader_2;
  }
}
//@ chunk-fg9fwa9r.js:527-539 placement
/**
 * 全局唯一的开关读取器容器。
 */
var installWarmSunriseReader; // deferred: uses warmSunriseReaderState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-fg9fwa9r.js:527", () => {
  installWarmSunriseReader = new warmSunriseReaderState();
});
//@ chunk-fg9fwa9r.js:539-576 placement
/**
 * 注册开关读取器并返回旧的。
 */
function readWarmSunriseFlag(reader) {
  return installWarmSunriseReader.register(reader);
}
//@ chunk-fg9fwa9r.js:576-735 placement
function isWarmSunriseEnabled() {
  let reader = installWarmSunriseReader.reader;
  if (!reader) return true;
  try {
    let { value, source, defaultHost } = reader("tengu_warm_sunrise", true);
    return value !== false || source !== "payload" || !defaultHost;
  } catch {
    return true;
  }
}
//@ chunk-fg9fwa9r.js:735-773 placement
/**
 * 判断 “-rm” 修饰符是否允许（由 tengu_warm_sunrise 开关控制）。
 */
function isRmModifierAllowed(action) {
  return action !== "-rm" || isWarmSunriseEnabled();
}
//@ chunk-fg9fwa9r.js:773-847 placement
/**
 * 保存 tengu_staged_pumpkin 开关读取器的容器。
 */
class stagedPumpkinReaderState {
  reader = null;
  register(reader) {
    let reader_2 = this.reader;
    this.reader = reader;
    return reader_2;
  }
}
//@ chunk-fg9fwa9r.js:847-859 placement
/**
 * 全局唯一的 tengu_staged_pumpkin 开关读取器容器。
 */
var installStagedPumpkinReader; // deferred: uses stagedPumpkinReaderState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-fg9fwa9r.js:847", () => {
  installStagedPumpkinReader = new stagedPumpkinReaderState();
});
//@ chunk-fg9fwa9r.js:859-896 placement
/**
 * 注册该开关读取器。
 */
function readStagedPumpkinFlag(reader) {
  return installStagedPumpkinReader.register(reader);
}
//@ chunk-fg9fwa9r.js:896-1037 placement
function isFlagOnByDefault(flagKey) {
  let reader = installStagedPumpkinReader.reader;
  if (!reader) return true;
  try {
    let { value, source, defaultHost } = reader(flagKey, true);
    return value !== false || source !== "payload" || !defaultHost;
  } catch {
    return true;
  }
}
//@ chunk-fg9fwa9r.js:1037-1082 placement
/**
 * 读取 tengu_vast_puddle 开关（默认开）。
 */
function isVastPuddleEnabled() {
  return isFlagOnByDefault("tengu_vast_puddle");
}
//@ chunk-fg9fwa9r.js:1082-1128 placement
/**
 * 读取 tengu_snappy_tower 开关（默认开）。
 */
function isSnappyTowerEnabled() {
  return isFlagOnByDefault("tengu_snappy_tower");
}
//@ chunk-fg9fwa9r.js:1128-1202 placement
/**
 * 保存 tengu_nested_ripple 开关读取器的容器。
 */
class nestedRippleReaderState {
  reader = null;
  register(reader) {
    let reader_2 = this.reader;
    this.reader = reader;
    return reader_2;
  }
}
//@ chunk-fg9fwa9r.js:1202-1214 placement
/**
 * 全局唯一的 tengu_nested_ripple 开关读取器容器。
 */
var installNestedRippleReader; // deferred: uses nestedRippleReaderState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-fg9fwa9r.js:1202", () => {
  installNestedRippleReader = new nestedRippleReaderState();
});
//@ chunk-fg9fwa9r.js:1214-1251 placement
/**
 * 注册该开关读取器。
 */
function readNestedRippleFlag(reader) {
  return installNestedRippleReader.register(reader);
}
//@ chunk-fg9fwa9r.js:1251-1414 placement
/**
 * 读取 tengu_staged_pumpkin 开关（默认开启，只有服务端明确关闭才关闭）。
 */
function isStagedPumpkinEnabled() {
  let reader = installNestedRippleReader.reader;
  if (!reader) return true;
  try {
    let { value, source, defaultHost } = reader("tengu_staged_pumpkin", true);
    return value !== false || source !== "payload" || !defaultHost;
  } catch {
    return true;
  }
}
//@ chunk-fg9fwa9r.js:1462-1490 placement
var TENGU_NESTED_RIPPLE = "tengu_nested_ripple";
//@ chunk-fg9fwa9r.js:1490-1564 placement
/**
 * tengu_nested_ripple 开关读取器状态。
 */
class nestedRippleFlagReader {
  reader = null;
  register(reader) {
    let reader_2 = this.reader;
    this.reader = reader;
    return reader_2;
  }
}
//@ chunk-fg9fwa9r.js:1564-1576 placement
/**
 * 全局唯一的 tengu_nested_ripple 开关读取器。
 */
var nestedRippleFlagReaderInstance; // deferred: uses nestedRippleFlagReader of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-fg9fwa9r.js:1564", () => {
  nestedRippleFlagReaderInstance = new nestedRippleFlagReader();
});
//@ chunk-fg9fwa9r.js:1576-1613 placement
/**
 * 注册 tengu_nested_ripple 开关读取器。
 */
function installNestedRippleReader2(reader) {
  return nestedRippleFlagReaderInstance.register(reader);
}
//@ chunk-fg9fwa9r.js:1613-1755 placement
/**
 * 读取 tengu_nested_ripple 开关（默认开启，只有服务端明确关闭才关闭）。
 */
function isNestedRippleEnabled() {
  let reader = nestedRippleFlagReaderInstance.reader;
  if (!reader) return true;
  try {
    let { value, source, defaultHost } = reader(TENGU_NESTED_RIPPLE, true);
    return value !== false || source !== "payload" || !defaultHost;
  } catch {
    return true;
  }
}
//@ chunk-fg9fwa9r.js:1755-1767 placement
/**
 * 记录“读取拒绝次数与首个拒绝原因”的 AsyncLocalStorage。
 */
var readingRefusalStorage; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-fg9fwa9r.js:1755", () => {
  readingRefusalStorage = new AsyncLocalStorage();
});
//@ chunk-fg9fwa9r.js:1767-1911 placement
/**
 * 在"读取拒绝"计数上下文中运行函数，返回结果与本次新增的第一个拒绝原因。
 */
async function runWithReadingRefusals(fn) {
  let state = readingRefusalStorage.getStore() ?? {
    reading: "refuse",
    refusals: 0,
  };
  let refusals = state.refusals;
  return [
    await readingRefusalStorage.run(state, fn),
    state.refusals > refusals ? state.firstReason : undefined,
  ];
}
//@ chunk-fg9fwa9r.js:1911-2014 placement
/**
 * 在拒绝模式下记录一次读取拒绝及第一个原因。
 */
function recordReadingRefusal(reason) {
  let state = readingRefusalStorage.getStore();
  if (state !== undefined && state.reading === "refuse") {
    state.refusals += 1;
    state.firstReason ??= reason;
  }
}
//@ chunk-fg9fwa9r.js:2014-2078 placement
/**
 * 在“规则关闭”的读取模式下运行回调。
 */
function runWithRuleOff(fn) {
  return readingRefusalStorage.run(
    {
      reading: "rule off",
      refusals: 0,
    },
    fn,
  );
}
//@ chunk-fg9fwa9r.js:2078-2150 placement
/**
 * 在“按 bash 读法”的读取模式下运行回调。
 */
function runAsBashReads(fn) {
  return readingRefusalStorage.run(
    {
      reading: "as bash reads it",
      refusals: 0,
    },
    fn,
  );
}
//@ chunk-fg9fwa9r.js:2150-2239 placement
/**
 * 当前是否处于“规则关闭”或“按 bash 读法”模式。
 */
function isRuleOffOrBashReading() {
  let reading = readingRefusalStorage.getStore()?.reading;
  return reading === "rule off" || reading === "as bash reads it";
}
//@ chunk-fg9fwa9r.js:2239-2304 placement
/**
 * 当前是否处于“按 bash 读法”模式。
 */
function isBashReadingMode() {
  return readingRefusalStorage.getStore()?.reading === "as bash reads it";
}
export {
  withSturdyLanternOff,
  isRmModifierAllowed,
  isSnappyTowerEnabled,
  isSturdyLanternDefault,
  isVastPuddleEnabled,
  isBashReadingMode,
  isNestedRippleEnabled,
  isRuleOffOrBashReading,
  recordReadingRefusal,
  isStagedPumpkinEnabled,
  runWithReadingRefusals,
  runAsBashReads,
  runWithRuleOff,
  readWarmSunriseFlag,
  readStagedPumpkinFlag,
  readNestedRippleFlag,
  registerSetting,
  installNestedRippleReader2,
};
