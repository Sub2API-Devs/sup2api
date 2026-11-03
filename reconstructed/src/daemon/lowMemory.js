/**
 * daemon/lowMemory.ts
 *
 * 2.1.316 新增：当前是否处于低内存状态（Bun memoryPressureLevel）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-22p96rmv.js (5)
 * attribution: placement 5
 */
import { freemem } from "os";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { getPlatform } from "../utils/platform.js";
import { logForDebugging } from "../utils/debug.js";

/**
 * 判断是否低内存：阈值来自 tengu_bg_low_mem_mb；macOS 用 Bun 的 memoryPressureLevel，其他平台用空闲内存。
 */
//@ chunk-22p96rmv.js:325-526 placement
function getLowMemoryState() {
  let e = getFeatureValue_CACHED_MAY_BE_STALE("tengu_bg_low_mem_mb", 1024) * 1024 * 1024;
  if (e <= 0) return { lowMem: !1, level: void 0 };
  if (getPlatform() !== "macos") return { lowMem: freemem() < e, level: void 0 };
  let n = readMemoryPressureLevel();
  return { lowMem: n !== void 0 && n >= critical, level: n };
}
/**
 * 当前是否处于低内存状态（Bun memoryPressureLevel）。
 */
//@ chunk-22p96rmv.js:526-561 placement
function isLowMemory() {
  return getLowMemoryState().lowMem;
}
//@ chunk-22p96rmv.js:561-612 placement
var r = { normal: 1, warning: 2, critical: 4 },
  critical = r.critical;
//@ chunk-22p96rmv.js:612-812 placement
function readMemoryPressureLevel() {
  try {
    let memoryPressureLevel = Bun.ant.memoryPressureLevel();
    return memoryPressureLevel === null ? void 0 : r[memoryPressureLevel];
  } catch (error) {
    logForDebugging(
      `bg low-mem: memoryPressureLevel failed: ${error instanceof Error ? error.message : String(error)}`,
      { level: "warn" },
    );
    return;
  }
}
//@ chunk-22p96rmv.js:812-866 placement
function hho() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_bg_attach_upgrade", !0);
}

export { isLowMemory, getLowMemoryState, hho };
