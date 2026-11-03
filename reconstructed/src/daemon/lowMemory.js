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

//@ chunk-22p96rmv.js:325-526 placement
/**
 * 判断是否低内存：阈值来自 tengu_bg_low_mem_mb；macOS 用 Bun 的 memoryPressureLevel，其他平台用空闲内存。
 */
function getLowMemoryState() {
  let e = getFeatureValue_CACHED_MAY_BE_STALE("tengu_bg_low_mem_mb", 1024) * 1024 * 1024;
  if (e <= 0)
    return {
      lowMem: false,
      level: undefined,
    };
  if (getPlatform() !== "macos")
    return {
      lowMem: freemem() < e,
      level: undefined,
    };
  let memoryPressureLevel = readMemoryPressureLevel();
  return {
    lowMem: memoryPressureLevel !== undefined && memoryPressureLevel >= critical,
    level: memoryPressureLevel,
  };
}
//@ chunk-22p96rmv.js:526-561 placement
/**
 * 当前是否处于低内存状态（Bun memoryPressureLevel）。
 */
function isLowMemory() {
  return getLowMemoryState().lowMem;
}
//@ chunk-22p96rmv.js:561-612 placement
var MEMORY_LEVEL_COST = {
  normal: 1,
  warning: 2,
  critical: 4,
};
var critical = MEMORY_LEVEL_COST.critical;
//@ chunk-22p96rmv.js:612-812 placement
function readMemoryPressureLevel() {
  try {
    let e = Bun.ant.memoryPressureLevel();
    return e === null ? undefined : MEMORY_LEVEL_COST[e];
  } catch (error) {
    logForDebugging(
      `bg low-mem: memoryPressureLevel failed: ${error instanceof Error ? error.message : String(error)}`,
      {
        level: "warn",
      },
    );
    return;
  }
}
//@ chunk-22p96rmv.js:812-866 placement
/**
 * 函数 isAttachUpgradeEnabled（tengu_bg_attach_upgrade 开关）。
 */
function isAttachUpgradeEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_bg_attach_upgrade", true);
}
export { isLowMemory, getLowMemoryState, isAttachUpgradeEnabled };
