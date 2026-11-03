/**
 * utils/envSchema.ts
 *
 * 2.1.316 新增：环境变量解析器（str/bool/triBool/int/names）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-fq90vph4.js (7)
 * attribution: placement 7
 */
import { isEnvTruthy, isEnvDefinedFalsy, parseLooseInteger, parseIntLoose } from "./envUtils.js";

//@ chunk-fq90vph4.js:270-311 placement
function r(n) {
  return { parse: (e) => n(f(e)) };
}
//@ chunk-fq90vph4.js:311-359 placement
function o(n) {
  let e = n?.trim();
  return e ? e : void 0;
}
//@ chunk-fq90vph4.js:359-408 placement
function f(n) {
  return n === void 0 ? void 0 : String(n);
}
//@ chunk-fq90vph4.js:408-508 placement
var strParser = r(o),
  rawStrParser = r((n) => n),
  boolParser = r((n) => isEnvTruthy(n)),
  triBoolParser = r((n) => {
    if (isEnvTruthy(n)) return !0;
    if (isEnvDefinedFalsy(n)) return !1;
    return;
  }),
  defaultIntParser = intParser();
//@ chunk-fq90vph4.js:508-582 placement
function iLi(n) {
  if (typeof n === "boolean") return n ? "1" : "0";
  return String(n);
}
/**
 * 环境变量解析器集合（str/bool/triBool/int/names/enum）。
 */
//@ chunk-fq90vph4.js:582-893 placement
var ENV_PARSERS = {
  str: () => strParser,
  rawStr: () => rawStrParser,
  bool: () => boolParser,
  triBool: () => triBoolParser,
  int: (n) => (n ? intParser(n) : defaultIntParser),
  names: (n) =>
    r((e) => {
      let i = new Set();
      for (let u of e?.split(",") ?? []) {
        let trimmed = u.trim();
        if (trimmed.length > 0) i.add(trimmed);
        if (i.size === n) break;
      }
      return i.size > 0 ? Object.freeze([...i]) : void 0;
    }),
  enum: (n) => r((e) => (e !== void 0 && n.includes(e.trim()) ? e.trim() : void 0)),
};
/**
 * 整数解析器（只数字、整值、上下限）。
 */
//@ chunk-fq90vph4.js:893-1198 placement
function intParser(n) {
  return r((e) => {
    if (e === void 0) return;
    if (n?.digitsOnly && !/^[+-]?\d+$/.test(e.trim())) return;
    if (n?.wholeValue && !/^[+-]?\d+$/.test(e.trim()) && parseLooseInteger(e.trim()) === void 0) return;
    let i = parseIntLoose(e);
    if (!Number.isFinite(i)) return;
    if (n?.min !== void 0 && i < n.min) return;
    if (n?.max !== void 0 && i > n.max) return;
    return i;
  });
}

export { ENV_PARSERS, iLi };
