/**
 * utils/slowOperations.ts
 *
 * JSON 序列化/解析包装与慢操作计时（生产构建为空 logger），慢插件 hook 报告。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/slowOperations.ts
 * pieces: chunk-6hadbefe.js (19), chunk-j8f885h1.js (1), chunk-trds6g68.js (4)
 * attribution: placement 11, file-local 1, layout 6, fingerprint 5, affinity 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { realpath as realpath_2, writeFileSync } from "fs";
import { extractDebugCategories } from "./debugFilter.js";
import {
  slowHookReports_2,
  SLOW_PLUGIN_HOOK_WINDOW_MS,
  SLOW_HOOK_REPORT_INTERVAL_MS_2,
} from "../plugins/functionHooks/dispatch/slowHookReports.js";
import { matcherLog } from "./hooks/functionHookMatchers.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-trds6g68.js:191-214 placement
/**
 * 恒为 true。
 */
function alwaysTrue() {
  return true;
}
//@ chunk-trds6g68.js:214-283 placement
/**
 * 是否运行于 Bun 单文件可执行。
 */
function isStandaloneExecutable() {
  return typeof Bun !== "undefined" && Bun.isStandaloneExecutable === true;
}
//@ chunk-trds6g68.js:283-385 placement
/**
 * 非独立可执行文件时，主模块是否为 .ts/.tsx 源文件。
 */
function isRunningFromTsSource() {
  if (!alwaysTrue() || isStandaloneExecutable()) return false;
  let main = Bun.main;
  if (isBunVirtualPath(main)) return false;
  return /\.[cm]?tsx?$/.test(main);
}
//@ chunk-trds6g68.js:385-460 placement
function isBunVirtualPath(path) {
  return /^(?:\/\$bunfs|[a-z]:[\\/]~BUN)(?:[\\/]|$)/i.test(path);
}
//@ chunk-6hadbefe.js:5325-5488 placement (2.1.88 match: parseDebugFilter, 1)
function matchesFilter(categories, filter) {
  if (!filter) return true;
  if (categories.length === 0) return false;
  if (filter.isExclusive) return !categories.some((category) => filter.exclude.includes(category));
  else return categories.some((category) => filter.include.includes(category));
}
//@ chunk-6hadbefe.js:5488-5547 placement
function shouldLogDebugCategory(message, filter) {
  if (!filter) return true;
  let categories = extractDebugCategories(message);
  return matchesFilter(categories, filter);
}
//@ chunk-6hadbefe.js:5897-5963 placement
var realpathPromise = (path) =>
  new Promise((resolve, reject) => {
    realpath_2(path, (error, resolved) => (error === null ? resolve(resolved) : reject(error)));
  });
//@ chunk-6hadbefe.js:5963-5990 placement
var SENTINEL_INODE_MAX = 0xffffffffffffffffn;
//@ chunk-6hadbefe.js:5990-6065 placement
/**
 * inode 是否为无效哨兵值。
 */
function isSentinelInode(ino) {
  let inoBig = BigInt(ino);
  return inoBig === 0n || inoBig === -1n || inoBig === SENTINEL_INODE_MAX || inoBig === 1n << 64n;
}
//@ chunk-6hadbefe.js:6065-6127 placement
/**
 * 两个文件的 inode 是否都有效且不同（判断是否被替换）。
 */
function didInodeChange(before, after) {
  return !isSentinelInode(before.ino) && !isSentinelInode(after.ino) && before.ino !== after.ino;
}
//@ chunk-6hadbefe.js:6163-6315 placement
var SLOW_OPERATION_THRESHOLD_MS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-6hadbefe.js:6163", () => {
  SLOW_OPERATION_THRESHOLD_MS = (() => {
    let envValue = process.env.CLAUDE_CODE_SLOW_OPERATION_THRESHOLD_MS;
    if (envValue !== undefined) {
      let parsed = Number(envValue);
      if (!Number.isNaN(parsed) && parsed >= 0) return parsed;
    }
    return 1 / 0;
  })();
});
//@ chunk-6hadbefe.js:6315-6345 file-local
var NOOP_LOGGER; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-6hadbefe.js:6315", () => {
  NOOP_LOGGER = {
    [Symbol.dispose]() {},
  };
});
//@ chunk-6hadbefe.js:6345-6369 layout
function createSlowOperationLogger() {
  return NOOP_LOGGER;
}
//@ chunk-6hadbefe.js:6369-6379 layout
var slowLogging = createSlowOperationLogger;
//@ chunk-6hadbefe.js:6379-6463 fingerprint (2.1.88 match: jsonStringify, 1)
/**
 * JSON.stringify 包装（慢操作计时点）。
 */
function jsonStringify(value, replacer, space) {
  using span = slowLogging`JSON.stringify(${lengthOrValue(value)})`;
  return JSON.stringify(value, replacer, space);
}
//@ chunk-6hadbefe.js:6463-6507 layout
/**
 * 序列化为一行 JSONL（末尾换行）。
 */
function toJsonLine(value) {
  return (
    JSON.stringify(value) +
    `
`
  );
}
//@ chunk-6hadbefe.js:6507-6547 layout
/**
 * 直接 JSON.stringify（不计时）。
 */
function jsonStringifyRaw(value) {
  return JSON.stringify(value);
}
//@ chunk-6hadbefe.js:6547-6671 layout
function jsonlJoin(items) {
  using span = slowLogging`jsonlJoin(${items.length})`;
  let out = "";
  for (let index = 0; index < items.length; index++)
    out +=
      JSON.stringify(items[index]) +
      `
`;
  return out;
}
//@ chunk-6hadbefe.js:6671-6770 fingerprint (2.1.88 match: jsonParse, 0.746)
/**
 * JSON.parse 包装（慢操作计时点）。
 */
var jsonParse = (text, reviver) => {
  using span = slowLogging`JSON.parse(${lengthOrValue(text)})`;
  return typeof reviver === "undefined" ? JSON.parse(text) : JSON.parse(text, reviver);
};
//@ chunk-6hadbefe.js:6770-6806 layout
/**
 * 直接 JSON.parse（不计时、不捕获）。
 */
function jsonParseRaw(text) {
  return JSON.parse(text);
}
//@ chunk-6hadbefe.js:6806-6889 fingerprint (2.1.88 match: clone, 1)
/**
 * structuredClone 包装，带慢操作计时（超阈值记调试日志）。
 */
function clone(value, options) {
  using span = slowLogging`structuredClone(${lengthOrValue(value)})`;
  return structuredClone(value, options);
}
//@ chunk-6hadbefe.js:6889-6964 fingerprint (2.1.88 match: writeFileSync_DEPRECATED, 0.409)
function writeFileSync_DEPRECATED(value, replacer, space) {
  using span = slowLogging`fs.writeFileSync(${value}, ${lengthOrValue(replacer)})`;
  writeFileSync(value, replacer, space);
}
//@ chunk-6hadbefe.js:6964-7017 affinity
function lengthOrValue(value) {
  return typeof value === "string" ? value.length : value;
}
//@ chunk-j8f885h1.js:52509-52680 fingerprint (2.1.88 match: AntSlowLogger, 0.337)
function AntSlowLogger(hookKey, message) {
  let report = slowHookReports_2.get(hookKey);
  slowHookReports_2.delete(hookKey);
  if (report !== undefined && report.count > 0)
    matcherLog().log(
      `${message} ${report.count} more times in the last ${SLOW_PLUGIN_HOOK_WINDOW_MS / SLOW_HOOK_REPORT_INTERVAL_MS_2}s (the last in ${report.lastMs.toFixed(1)}ms)`,
    );
}
export {
  jsonStringify,
  jsonParse,
  jsonStringifyRaw,
  clone,
  toJsonLine,
  jsonlJoin,
  jsonParseRaw,
  slowLogging,
  alwaysTrue,
  isSentinelInode,
  isStandaloneExecutable,
  realpathPromise,
  isBunVirtualPath,
  writeFileSync_DEPRECATED,
  didInodeChange,
  isRunningFromTsSource,
  shouldLogDebugCategory,
  AntSlowLogger,
};
