/**
 * utils/envSchema.ts
 *
 * 2.1.316 新增：环境变量解析器（str/bool/triBool/int/names）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-t046xvwq.js (7)
 * attribution: placement 7
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isEnvTruthy, isEnvDefinedFalsy, parseLooseInteger, parseIntLoose } from "./envUtils.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-t046xvwq.js:270-311 placement
function parserFrom(trimmedOrUndefined) {
  return {
    parse: (value) => trimmedOrUndefined(toEnvString(value)),
  };
}
//@ chunk-t046xvwq.js:311-359 placement
function trimmedOrUndefined(value) {
  let trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
//@ chunk-t046xvwq.js:359-408 placement
function toEnvString(value) {
  return value === undefined ? undefined : String(value);
}
//@ chunk-t046xvwq.js:408-508 placement
var strParser; // deferred: uses parserFrom of its import cycle while loading; runs once the cycle is complete
var rawStrParser;
var boolParser;
var triBoolParser;
var defaultIntParser;
deferInit("chunk-t046xvwq.js:408", () => {
  strParser = parserFrom(trimmedOrUndefined);
  rawStrParser = parserFrom((value) => value);
  boolParser = parserFrom((value) => isEnvTruthy(value));
  triBoolParser = parserFrom((value) => {
    if (isEnvTruthy(value)) return true;
    if (isEnvDefinedFalsy(value)) return false;
    return;
  });
  defaultIntParser = intParser();
});
//@ chunk-t046xvwq.js:508-582 placement
/**
 * 把环境变量值序列化：布尔转 "1"/"0"，其余转字符串。
 */
function boolToEnvString(value) {
  if (typeof value === "boolean") return value ? "1" : "0";
  return String(value);
}
//@ chunk-t046xvwq.js:582-893 placement
/**
 * 环境变量解析器集合（str/bool/triBool/int/names/enum）。
 */
var ENV_PARSERS = {
  str: () => strParser,
  rawStr: () => rawStrParser,
  bool: () => boolParser,
  triBool: () => triBoolParser,
  int: (min) => (min ? intParser(min) : defaultIntParser),
  names: (allowed) =>
    parserFrom((value) => {
      let names = new Set();
      for (let name of value?.split(",") ?? []) {
        let trimmed = name.trim();
        if (trimmed.length > 0) names.add(trimmed);
        if (names.size === allowed) break;
      }
      return names.size > 0 ? Object.freeze([...names]) : undefined;
    }),
  enum: (allowed) =>
    parserFrom((value) => (value !== undefined && allowed.includes(value.trim()) ? value.trim() : undefined)),
};
//@ chunk-t046xvwq.js:893-1198 placement
/**
 * 整数解析器（只数字、整值、上下限）。
 */
function intParser(min) {
  return parserFrom((value) => {
    if (value === undefined) return;
    if (min?.digitsOnly && !/^[+-]?\d+$/.test(value.trim())) return;
    if (min?.wholeValue && !/^[+-]?\d+$/.test(value.trim()) && parseLooseInteger(value.trim()) === undefined)
      return;
    let intLoose = parseIntLoose(value);
    if (!Number.isFinite(intLoose)) return;
    if (min?.min !== undefined && intLoose < min.min) return;
    if (min?.max !== undefined && intLoose > min.max) return;
    return intLoose;
  });
}
export { ENV_PARSERS, boolToEnvString };
