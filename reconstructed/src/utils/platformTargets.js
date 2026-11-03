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
function $c() {
  return constants.O_RDONLY | zq();
}
//@ chunk-9d1pf3s4.js:331-406 placement
function zq() {
  if (getPlatform() === "windows") return 0;
  return constants.O_NOFOLLOW | constants.O_NONBLOCK;
}
/**
 * 插件二进制支持的平台三元组。
 */
//@ chunk-9d1pf3s4.js:406-518 placement
var PLATFORM_TARGETS = [
  "aarch64-apple-darwin",
  "x86_64-apple-darwin",
  "aarch64-unknown-linux-musl",
  "x86_64-unknown-linux-musl",
];
//@ chunk-9d1pf3s4.js:747-765 placement
var q5r = 268435456;
/**
 * 从 “名字-平台[.exe]” 文件名取出二进制基名。
 */
//@ chunk-9d1pf3s4.js:800-1004 placement
function binaryBaseNameForTarget(r, e) {
  if (r.endsWith(`-${e}`)) {
    let sliced = r.slice(0, -(e.length + 1));
    return BINARY_BASENAME_RE.test(sliced) ? sliced : void 0;
  }
  if (r.endsWith(`-${e}.exe`)) {
    let sliced = r.slice(0, -(e.length + 5));
    return BINARY_BASENAME_RE.test(sliced) ? `${sliced}.exe` : void 0;
  }
  return;
}

export { PLATFORM_TARGETS, binaryBaseNameForTarget, $c, zq, q5r };
