/**
 * utils/platformTargets.ts
 *
 * 2.1.316 新增：平台目标
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-9d1pf3s4.js (5)
 * attribution: placement 5
 */
import { constants } from "fs";
import { getPlatform } from "./platform.js";
import { BINARY_BASENAME_RE } from "./plugins/schemas.js";

//@ chunk-9d1pf3s4.js:294-331 placement
/**
 * readOnlyNoFollowFlags：只读 + 不跟随符号链接的打开标志。
 */
function readOnlyNoFollowFlags() {
  return constants.O_RDONLY | platformNoFollowFlags();
}
//@ chunk-9d1pf3s4.js:331-406 placement
/**
 * platformNoFollowFlags：平台相关的 nofollow/nonblock 标志。
 */
function platformNoFollowFlags() {
  if (getPlatform() === "windows") return 0;
  return constants.O_NOFOLLOW | constants.O_NONBLOCK;
}
//@ chunk-9d1pf3s4.js:406-518 placement
/**
 * 插件二进制支持的平台三元组。
 */
var PLATFORM_TARGETS = [
  "aarch64-apple-darwin",
  "x86_64-apple-darwin",
  "aarch64-unknown-linux-musl",
  "x86_64-unknown-linux-musl",
];
//@ chunk-9d1pf3s4.js:747-765 placement
/**
 * MAX_PLUGIN_BINARY_BYTES：插件二进制体积上限。
 */
var MAX_PLUGIN_BINARY_BYTES = 268435456;
//@ chunk-9d1pf3s4.js:800-1004 placement
/**
 * 从 “名字-平台[.exe]” 文件名取出二进制基名。
 */
function binaryBaseNameForTarget(fileName, targetSuffix) {
  if (fileName.endsWith(`-${targetSuffix}`)) {
    let sliced = fileName.slice(0, -(targetSuffix.length + 1));
    return BINARY_BASENAME_RE.test(sliced) ? sliced : undefined;
  }
  if (fileName.endsWith(`-${targetSuffix}.exe`)) {
    let sliced = fileName.slice(0, -(targetSuffix.length + 5));
    return BINARY_BASENAME_RE.test(sliced) ? `${sliced}.exe` : undefined;
  }
  return;
}
export {
  readOnlyNoFollowFlags,
  PLATFORM_TARGETS,
  binaryBaseNameForTarget,
  platformNoFollowFlags,
  MAX_PLUGIN_BINARY_BYTES,
};
