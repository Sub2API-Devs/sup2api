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
function parserFrom(trimmedOrUndefined) {
  return {
    parse: (e) => trimmedOrUndefined(toEnvString(e)),
  };
}
//@ chunk-fq90vph4.js:311-359 placement
function trimmedOrUndefined(n) {
  let trimmed = n?.trim();
  return trimmed ? trimmed : undefined;
}
//@ chunk-fq90vph4.js:359-408 placement
function toEnvString(n) {
  return n === undefined ? undefined : String(n);
}
//@ chunk-fq90vph4.js:408-508 placement
var strParser = parserFrom(trimmedOrUndefined);
var rawStrParser = parserFrom((n) => n);
var boolParser = parserFrom((n) => isEnvTruthy(n));
var triBoolParser = parserFrom((n) => {
  if (isEnvTruthy(n)) return true;
  if (isEnvDefinedFalsy(n)) return false;
  return;
});
var defaultIntParser = intParser();
//@ chunk-fq90vph4.js:508-582 placement
/**
 * 把环境变量值序列化：布尔转 "1"/"0"，其余转字符串。
 */
function boolToEnvString(n) {
  if (typeof n === "boolean") return n ? "1" : "0";
  return String(n);
}
//@ chunk-fq90vph4.js:582-893 placement
/**
 * 环境变量解析器集合（str/bool/triBool/int/names/enum）。
 */
var ENV_PARSERS = {
  str: () => strParser,
  rawStr: () => rawStrParser,
  bool: () => boolParser,
  triBool: () => triBoolParser,
  int: (n) => (n ? intParser(n) : defaultIntParser),
  names: (n) =>
    parserFrom((e) => {
      let i = new Set();
      for (let u of e?.split(",") ?? []) {
        let trimmed = u.trim();
        if (trimmed.length > 0) i.add(trimmed);
        if (i.size === n) break;
      }
      return i.size > 0 ? Object.freeze([...i]) : undefined;
    }),
  enum: (n) => parserFrom((e) => (e !== undefined && n.includes(e.trim()) ? e.trim() : undefined)),
};
//@ chunk-fq90vph4.js:893-1198 placement
/**
 * 整数解析器（只数字、整值、上下限）。
 */
function intParser(n) {
  return parserFrom((e) => {
    if (e === undefined) return;
    if (n?.digitsOnly && !/^[+-]?\d+$/.test(e.trim())) return;
    if (n?.wholeValue && !/^[+-]?\d+$/.test(e.trim()) && parseLooseInteger(e.trim()) === undefined) return;
    let intLoose = parseIntLoose(e);
    if (!Number.isFinite(intLoose)) return;
    if (n?.min !== undefined && intLoose < n.min) return;
    if (n?.max !== undefined && intLoose > n.max) return;
    return intLoose;
  });
}
export { ENV_PARSERS, boolToEnvString };
