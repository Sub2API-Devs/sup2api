/**
 * utils/proactivityLevel.ts
 *
 * 2.1.316 新增：主动性等级
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-kavwfxwg.js (3)
 * attribution: placement 3
 */
import { isProactivityActive } from "../Tool.js";

//@ chunk-kavwfxwg.js:227-264 placement
/**
 * proactivityLevelIfActive：主动性启用时返回等级。
 */
function proactivityLevelIfActive(proactivityLevel) {
  return isProactivityActive() ? proactivityLevel : undefined;
}
//@ chunk-kavwfxwg.js:264-311 placement
/**
 * promptProactivityLevel：提示词中的主动性等级。
 */
function promptProactivityLevel(context) {
  return proactivityLevelIfActive(context.proactivityLevel);
}
//@ chunk-kavwfxwg.js:311-417 placement
function resolveProactivityOptions(permissionMode, proactivityLevel) {
  let level = proactivityLevelIfActive(proactivityLevel);
  return {
    permissionMode: permissionMode ?? (level === undefined ? undefined : "default"),
    proactivityLevel: level,
  };
}
export { resolveProactivityOptions, promptProactivityLevel, proactivityLevelIfActive };
