/**
 * utils/bash/bashParserFlags.ts
 *
 * 2.1.316 新增：Bash 解析器相关功能开关
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-krkjw7dv.js (18)
 * attribution: placement 18
 */
import { AsyncLocalStorage } from "async_hooks";

//@ chunk-krkjw7dv.js:239-266 placement
var TENGU_TINGLY_PEARL = "tengu_tingly_pearl";
//@ chunk-krkjw7dv.js:266-340 placement
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
//@ chunk-krkjw7dv.js:340-352 placement
/**
 * 全局唯一的 bash 解析器开关读取器容器。
 */
var installBashParserFlagReader = new bashParserFlagReader();
//@ chunk-krkjw7dv.js:352-389 placement
/**
 * 注册开关读取器并返回旧的（供测试替换）。
 */
function readTinglyPearlFlag(e) {
  return installBashParserFlagReader.register(e);
}
//@ chunk-krkjw7dv.js:389-531 placement
/**
 * 读取 tengu_tingly_pearl 开关（默认开启，只有服务端明确关闭才关闭）。
 */
function isTinglyPearlEnabled() {
  let reader = installBashParserFlagReader.reader;
  if (!reader) return true;
  try {
    let { value: r, source, defaultHost } = reader(TENGU_TINGLY_PEARL, true);
    return r !== false || source !== "payload" || !defaultHost;
  } catch {
    return true;
  }
}
//@ chunk-krkjw7dv.js:531-543 placement
/**
 * 记录“守卫是否关闭、是否已触发”的 AsyncLocalStorage。
 */
var guardStorage = new AsyncLocalStorage();
//@ chunk-krkjw7dv.js:543-636 placement
/**
 * 在守卫上下文中运行回调，返回结果与是否触发守卫。
 */
async function runGuarded(off, r) {
  let t = {
    off,
    fired: false,
  };
  return {
    result: await guardStorage.run(t, r),
    fired: t.fired,
  };
}
//@ chunk-krkjw7dv.js:636-686 placement
/**
 * 在“守卫关闭”的上下文中运行回调。
 */
function runWithGuardOff(e) {
  return guardStorage.run(
    {
      off: true,
      fired: false,
    },
    e,
  );
}
//@ chunk-krkjw7dv.js:686-731 placement
/**
 * 当前是否处于守卫关闭的上下文。
 */
function isGuardOff() {
  return guardStorage.getStore()?.off === true;
}
//@ chunk-krkjw7dv.js:731-781 placement
/**
 * 把当前上下文标记为“守卫已触发”。
 */
function markGuardFired() {
  let e = guardStorage.getStore();
  if (e) e.fired = true;
}
//@ chunk-krkjw7dv.js:781-801 placement
/**
 * 保存 tengu_foamy_heron 开关读取器的状态对象。
 */
class foamyHeronState {
  reader = null;
}
//@ chunk-krkjw7dv.js:801-813 placement
/**
 * 全局唯一的 tengu_foamy_heron 开关读取器状态。
 */
var setFoamyHeronReader = new foamyHeronState();
//@ chunk-krkjw7dv.js:813-840 placement
/**
 * 设置 tengu_foamy_heron 开关的读取器。
 */
function readFoamyHeronFlag(reader) {
  setFoamyHeronReader.reader = reader;
}
//@ chunk-krkjw7dv.js:840-1000 placement
/**
 * 读取 tengu_foamy_heron 开关（默认开启，只有服务端明确关闭才关闭）。
 */
function isFoamyHeronEnabled() {
  let reader = setFoamyHeronReader.reader;
  if (!reader) return true;
  try {
    let { value: r, source, defaultHost } = reader("tengu_foamy_heron", true);
    return r !== false || source !== "payload" || !defaultHost;
  } catch {
    return true;
  }
}
//@ chunk-krkjw7dv.js:1000-1074 placement
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
//@ chunk-krkjw7dv.js:1074-1086 placement
/**
 * 全局唯一的 tengu_calm_nautilus 开关读取器状态。
 */
var installCalmNautilusReader = new calmNautilusReaderState();
//@ chunk-krkjw7dv.js:1086-1123 placement
/**
 * 注册 tengu_calm_nautilus 开关的读取器。
 */
function readCalmNautilusFlag(e) {
  return installCalmNautilusReader.register(e);
}
//@ chunk-krkjw7dv.js:1123-1285 placement
/**
 * 读取 tengu_calm_nautilus 开关（默认开启，只有服务端明确关闭才关闭）。
 */
function isCalmNautilusEnabled() {
  let reader = installCalmNautilusReader.reader;
  if (!reader) return true;
  try {
    let { value: r, source, defaultHost } = reader("tengu_calm_nautilus", true);
    return r !== false || source !== "payload" || !defaultHost;
  } catch {
    return true;
  }
}
export {
  isTinglyPearlEnabled,
  runGuarded,
  runWithGuardOff,
  readCalmNautilusFlag,
  readTinglyPearlFlag,
  readFoamyHeronFlag,
  isGuardOff,
  markGuardFired,
  isCalmNautilusEnabled,
  isFoamyHeronEnabled,
};
