/**
 * utils/bash/bashReadingFlags.ts
 *
 * 2.1.316 新增：Bash 命令读取相关功能开关
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-xjt4a4zb.js (27)
 * attribution: placement 27
 */
import { AsyncLocalStorage } from "async_hooks";

//@ chunk-xjt4a4zb.js:191-265 placement
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
//@ chunk-xjt4a4zb.js:265-277 placement
/**
 * 全局唯一的开关读取器容器。
 */
var installWarmSunriseReader = new warmSunriseReaderState();
//@ chunk-xjt4a4zb.js:277-314 placement
/**
 * 注册开关读取器并返回旧的。
 */
function readWarmSunriseFlag(e) {
  return installWarmSunriseReader.register(e);
}
//@ chunk-xjt4a4zb.js:314-473 placement
function isWarmSunriseEnabled() {
  let reader = installWarmSunriseReader.reader;
  if (!reader) return true;
  try {
    let { value: r, source, defaultHost } = reader("tengu_warm_sunrise", true);
    return r !== false || source !== "payload" || !defaultHost;
  } catch {
    return true;
  }
}
//@ chunk-xjt4a4zb.js:473-511 placement
/**
 * 判断 “-rm” 修饰符是否允许（由 tengu_warm_sunrise 开关控制）。
 */
function isRmModifierAllowed(e) {
  return e !== "-rm" || isWarmSunriseEnabled();
}
//@ chunk-xjt4a4zb.js:511-585 placement
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
//@ chunk-xjt4a4zb.js:585-597 placement
/**
 * 全局唯一的 tengu_staged_pumpkin 开关读取器容器。
 */
var installStagedPumpkinReader = new stagedPumpkinReaderState();
//@ chunk-xjt4a4zb.js:597-634 placement
/**
 * 注册该开关读取器。
 */
function readStagedPumpkinFlag(e) {
  return installStagedPumpkinReader.register(e);
}
//@ chunk-xjt4a4zb.js:634-775 placement
function isFlagOnByDefault(e) {
  let reader = installStagedPumpkinReader.reader;
  if (!reader) return true;
  try {
    let { value: a, source, defaultHost } = reader(e, true);
    return a !== false || source !== "payload" || !defaultHost;
  } catch {
    return true;
  }
}
//@ chunk-xjt4a4zb.js:775-820 placement
/**
 * 读取 tengu_vast_puddle 开关（默认开）。
 */
function isVastPuddleEnabled() {
  return isFlagOnByDefault("tengu_vast_puddle");
}
//@ chunk-xjt4a4zb.js:820-866 placement
/**
 * 读取 tengu_snappy_tower 开关（默认开）。
 */
function isSnappyTowerEnabled() {
  return isFlagOnByDefault("tengu_snappy_tower");
}
//@ chunk-xjt4a4zb.js:866-940 placement
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
//@ chunk-xjt4a4zb.js:940-952 placement
/**
 * 全局唯一的 tengu_nested_ripple 开关读取器容器。
 */
var installNestedRippleReader = new nestedRippleReaderState();
//@ chunk-xjt4a4zb.js:952-989 placement
/**
 * 注册该开关读取器。
 */
function readNestedRippleFlag(e) {
  return installNestedRippleReader.register(e);
}
//@ chunk-xjt4a4zb.js:989-1152 placement
/**
 * 读取 tengu_staged_pumpkin 开关（默认开启，只有服务端明确关闭才关闭）。
 */
function isStagedPumpkinEnabled() {
  let reader = installNestedRippleReader.reader;
  if (!reader) return true;
  try {
    let { value: r, source, defaultHost } = reader("tengu_staged_pumpkin", true);
    return r !== false || source !== "payload" || !defaultHost;
  } catch {
    return true;
  }
}
//@ chunk-xjt4a4zb.js:1200-1228 placement
var TENGU_NESTED_RIPPLE = "tengu_nested_ripple";
//@ chunk-xjt4a4zb.js:1228-1302 placement
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
//@ chunk-xjt4a4zb.js:1302-1314 placement
/**
 * 全局唯一的 tengu_nested_ripple 开关读取器。
 */
var nestedRippleFlagReaderInstance = new nestedRippleFlagReader();
//@ chunk-xjt4a4zb.js:1314-1351 placement
/**
 * 注册 tengu_nested_ripple 开关读取器。
 */
function installNestedRippleReader2(e) {
  return nestedRippleFlagReaderInstance.register(e);
}
//@ chunk-xjt4a4zb.js:1351-1493 placement
/**
 * 读取 tengu_nested_ripple 开关（默认开启，只有服务端明确关闭才关闭）。
 */
function isNestedRippleEnabled() {
  let reader = nestedRippleFlagReaderInstance.reader;
  if (!reader) return true;
  try {
    let { value: r, source, defaultHost } = reader(TENGU_NESTED_RIPPLE, true);
    return r !== false || source !== "payload" || !defaultHost;
  } catch {
    return true;
  }
}
//@ chunk-xjt4a4zb.js:1493-1505 placement
/**
 * 记录“读取拒绝次数与首个拒绝原因”的 AsyncLocalStorage。
 */
var readingRefusalStorage = new AsyncLocalStorage();
//@ chunk-xjt4a4zb.js:1505-1649 placement
/**
 * 在"读取拒绝"计数上下文中运行函数，返回结果与本次新增的第一个拒绝原因。
 */
async function runWithReadingRefusals(e) {
  let r = readingRefusalStorage.getStore() ?? {
    reading: "refuse",
    refusals: 0,
  };
  let refusals = r.refusals;
  return [await readingRefusalStorage.run(r, e), r.refusals > refusals ? r.firstReason : undefined];
}
//@ chunk-xjt4a4zb.js:1649-1752 placement
/**
 * 在拒绝模式下记录一次读取拒绝及第一个原因。
 */
function recordReadingRefusal(e) {
  let r = readingRefusalStorage.getStore();
  if (r !== undefined && r.reading === "refuse") {
    r.refusals += 1;
    r.firstReason ??= e;
  }
}
//@ chunk-xjt4a4zb.js:1752-1816 placement
/**
 * 在“规则关闭”的读取模式下运行回调。
 */
function runWithRuleOff(e) {
  return readingRefusalStorage.run(
    {
      reading: "rule off",
      refusals: 0,
    },
    e,
  );
}
//@ chunk-xjt4a4zb.js:1816-1888 placement
/**
 * 在“按 bash 读法”的读取模式下运行回调。
 */
function runAsBashReads(e) {
  return readingRefusalStorage.run(
    {
      reading: "as bash reads it",
      refusals: 0,
    },
    e,
  );
}
//@ chunk-xjt4a4zb.js:1888-1977 placement
/**
 * 当前是否处于“规则关闭”或“按 bash 读法”模式。
 */
function isRuleOffOrBashReading() {
  let reading = readingRefusalStorage.getStore()?.reading;
  return reading === "rule off" || reading === "as bash reads it";
}
//@ chunk-xjt4a4zb.js:1977-2042 placement
/**
 * 当前是否处于“按 bash 读法”模式。
 */
function isBashReadingMode() {
  return readingRefusalStorage.getStore()?.reading === "as bash reads it";
}
export {
  isSnappyTowerEnabled,
  isVastPuddleEnabled,
  isBashReadingMode,
  isNestedRippleEnabled,
  isRuleOffOrBashReading,
  recordReadingRefusal,
  isStagedPumpkinEnabled,
  isRmModifierAllowed,
  runWithReadingRefusals,
  runAsBashReads,
  runWithRuleOff,
  readWarmSunriseFlag,
  readStagedPumpkinFlag,
  readNestedRippleFlag,
  installNestedRippleReader2,
};
