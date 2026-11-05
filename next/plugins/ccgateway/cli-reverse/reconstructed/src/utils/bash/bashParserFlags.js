/**
 * utils/bash/bashParserFlags.ts
 *
 * 2.1.316 新增：Bash 解析器相关功能开关
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-krksbwdz.js (26)
 * attribution: placement 17, layout 9
 */
import { AsyncLocalStorage } from "async_hooks";

//@ chunk-krksbwdz.js:239-266 placement
var TENGU_TINGLY_PEARL = "tengu_tingly_pearl";
//@ chunk-krksbwdz.js:266-340 placement
/**
 * 保存 bash 解析器特性开关读取器的容器（register 返回旧读取器）。
 */
class bashParserFlagReader {
  reader = null;
  register(reader) {
    let reader_2 = this.reader;
    this.reader = reader;
    return reader_2;
  }
}
//@ chunk-krksbwdz.js:340-352 placement
/**
 * 全局唯一的 bash 解析器开关读取器容器。
 */
var installBashParserFlagReader = new bashParserFlagReader();
//@ chunk-krksbwdz.js:352-389 placement
/**
 * 注册开关读取器并返回旧的（供测试替换）。
 */
function readTinglyPearlFlag(reader) {
  return installBashParserFlagReader.register(reader);
}
//@ chunk-krksbwdz.js:389-531 placement
/**
 * 读取 tengu_tingly_pearl 开关（默认开启，只有服务端明确关闭才关闭）。
 */
function isTinglyPearlEnabled() {
  let reader = installBashParserFlagReader.reader;
  if (!reader) return true;
  try {
    let { value, source, defaultHost } = reader(TENGU_TINGLY_PEARL, true);
    return value !== false || source !== "payload" || !defaultHost;
  } catch {
    return true;
  }
}
//@ chunk-krksbwdz.js:531-543 placement
/**
 * 记录“守卫是否关闭、是否已触发”的 AsyncLocalStorage。
 */
var guardStorage = new AsyncLocalStorage();
//@ chunk-krksbwdz.js:543-636 placement
/**
 * 在守卫上下文中运行回调，返回结果与是否触发守卫。
 */
async function runGuarded(off, fn) {
  let state = {
    off,
    fired: false,
  };
  return {
    result: await guardStorage.run(state, fn),
    fired: state.fired,
  };
}
//@ chunk-krksbwdz.js:636-686 placement
/**
 * 在“守卫关闭”的上下文中运行回调。
 */
function runWithGuardOff(fn) {
  return guardStorage.run(
    {
      off: true,
      fired: false,
    },
    fn,
  );
}
//@ chunk-krksbwdz.js:686-731 placement
/**
 * 当前是否处于守卫关闭的上下文。
 */
function isGuardOff() {
  return guardStorage.getStore()?.off === true;
}
//@ chunk-krksbwdz.js:731-781 placement
/**
 * 把当前上下文标记为“守卫已触发”。
 */
function markGuardFired() {
  let state = guardStorage.getStore();
  if (state) state.fired = true;
}
//@ chunk-krksbwdz.js:829-893 layout
var TENGU_FOAMY_HERON = "tengu_foamy_heron";
var TENGU_DEEP_LOCKET = "tengu_deep_locket";
var DOUBLE_SUBST_START_RE = /\$\$[({[]/;
//@ chunk-krksbwdz.js:893-913 placement
/**
 * 保存 tengu_foamy_heron 开关读取器的状态对象。
 */
class foamyHeronState {
  reader = null;
}
//@ chunk-krksbwdz.js:913-925 placement
/**
 * 全局唯一的 tengu_foamy_heron 开关读取器状态。
 */
var setFoamyHeronReader = new foamyHeronState();
//@ chunk-krksbwdz.js:925-952 placement
/**
 * 设置 tengu_foamy_heron 开关的读取器。
 */
function readFoamyHeronFlag(reader) {
  setFoamyHeronReader.reader = reader;
}
//@ chunk-krksbwdz.js:952-1093 layout
function foamyHeronEnabledFor(command) {
  let reader = setFoamyHeronReader.reader;
  if (!reader) return true;
  try {
    let { value, source, defaultHost } = reader(command, true);
    return value !== false || source !== "payload" || !defaultHost;
  } catch {
    return true;
  }
}
//@ chunk-krksbwdz.js:1093-1120 layout
function isFoamyHeronEnabled() {
  return foamyHeronEnabledFor(TENGU_FOAMY_HERON);
}
//@ chunk-krksbwdz.js:1120-1132 layout
var reExpansionStorage = new AsyncLocalStorage();
//@ chunk-krksbwdz.js:1132-1167 layout
function runInReExpansion(callback) {
  return reExpansionStorage.run(true, callback);
}
//@ chunk-krksbwdz.js:1167-1207 layout
function isInReExpansion() {
  return reExpansionStorage.getStore() === true;
}
//@ chunk-krksbwdz.js:1207-1241 layout
function isDeepLocketEnabled() {
  return !isInReExpansion() && foamyHeronEnabledFor(TENGU_DEEP_LOCKET);
}
//@ chunk-krksbwdz.js:1241-1283 layout
function needsReExpansionRun(command) {
  return DOUBLE_SUBST_START_RE.test(command) && isDeepLocketEnabled();
}
//@ chunk-krksbwdz.js:1283-1326 layout
function withReExpansionIfNeeded(command, callback) {
  return needsReExpansionRun(command) ? runInReExpansion(callback) : callback();
}
//@ chunk-krksbwdz.js:1326-1400 placement
/**
 * 保存 tengu_calm_nautilus 开关读取器的状态对象。
 */
class calmNautilusReaderState {
  reader = null;
  register(reader) {
    let reader_2 = this.reader;
    this.reader = reader;
    return reader_2;
  }
}
//@ chunk-krksbwdz.js:1400-1412 placement
/**
 * 全局唯一的 tengu_calm_nautilus 开关读取器状态。
 */
var installCalmNautilusReader = new calmNautilusReaderState();
//@ chunk-krksbwdz.js:1412-1449 placement
/**
 * 注册 tengu_calm_nautilus 开关的读取器。
 */
function readCalmNautilusFlag(reader) {
  return installCalmNautilusReader.register(reader);
}
//@ chunk-krksbwdz.js:1449-1611 placement
/**
 * 读取 tengu_calm_nautilus 开关（默认开启，只有服务端明确关闭才关闭）。
 */
function isCalmNautilusEnabled() {
  let reader = installCalmNautilusReader.reader;
  if (!reader) return true;
  try {
    let { value, source, defaultHost } = reader("tengu_calm_nautilus", true);
    return value !== false || source !== "payload" || !defaultHost;
  } catch {
    return true;
  }
}
export {
  isGuardOff,
  isInReExpansion,
  runGuarded,
  markGuardFired,
  isTinglyPearlEnabled,
  DOUBLE_SUBST_START_RE,
  isDeepLocketEnabled,
  runInReExpansion,
  runWithGuardOff,
  withReExpansionIfNeeded,
  needsReExpansionRun,
  readCalmNautilusFlag,
  readTinglyPearlFlag,
  readFoamyHeronFlag,
  isCalmNautilusEnabled,
  isFoamyHeronEnabled,
};
