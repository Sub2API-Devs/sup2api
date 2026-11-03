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
function rDr(e) {
  return isProactivityActive() ? e : void 0;
}
//@ chunk-kavwfxwg.js:264-311 placement
function jye(e) {
  return rDr(e.proactivityLevel);
}
//@ chunk-kavwfxwg.js:311-417 placement
function resolveProactivityOptions(e, t) {
  let i = rDr(t);
  return { permissionMode: e ?? (i === void 0 ? void 0 : "default"), proactivityLevel: i };
}

export { resolveProactivityOptions, jye, rDr };
