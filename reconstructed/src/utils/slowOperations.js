/**
 * utils/slowOperations.ts
 *
 * JSON 序列化/解析包装与慢操作计时（生产构建为空 logger），慢插件 hook 报告。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/slowOperations.ts
 * pieces: chunk-4121qate.js (1), chunk-cgr0tezp.js (23)
 * attribution: fingerprint 5, placement 11, file-local 1, layout 6, affinity 1
 */
import { realpath as realpath_2, writeFileSync } from "fs";
import { extractDebugCategories } from "./debugFilter.js";
import {
  slowHookReports_2,
  SLOW_PLUGIN_HOOK_WINDOW_MS,
  SLOW_HOOK_REPORT_INTERVAL_MS_2,
} from "../plugins/functionHooks/dispatch/slowHookReports.js";
import { matcherLog } from "./hooks/functionHookMatchers.js";

//@ chunk-cgr0tezp.js:17797-17960 placement
function matchesFilter(debugCategories, n) {
  if (!n) return true;
  if (debugCategories.length === 0) return false;
  if (n.isExclusive) return !debugCategories.some((r) => n.exclude.includes(r));
  else return debugCategories.some((r) => n.include.includes(r));
}
//@ chunk-cgr0tezp.js:17960-18019 placement
function shouldLogDebugCategory(message, filter) {
  if (!filter) return true;
  let debugCategories = extractDebugCategories(message);
  return matchesFilter(debugCategories, filter);
}
//@ chunk-cgr0tezp.js:18369-18435 placement
var realpathPromise = (path) =>
  new Promise((resolve, reject) => {
    realpath_2(path, (i, s) => (i === null ? resolve(s) : reject(i)));
  });
//@ chunk-cgr0tezp.js:18435-18458 placement
/**
 * 恒为 true。
 */
function alwaysTrue() {
  return true;
}
//@ chunk-cgr0tezp.js:18458-18527 placement
/**
 * 是否运行于 Bun 单文件可执行。
 */
function isStandaloneExecutable() {
  return typeof Bun !== "undefined" && Bun.isStandaloneExecutable === true;
}
//@ chunk-cgr0tezp.js:18527-18628 placement
/**
 * 非独立可执行文件时，主模块是否为 .ts/.tsx 源文件。
 */
function isRunningFromTsSource() {
  if (!alwaysTrue() || isStandaloneExecutable()) return false;
  let main = Bun.main;
  if (isBunVirtualPath(main)) return false;
  return /\.[cm]?tsx?$/.test(main);
}
//@ chunk-cgr0tezp.js:18628-18702 placement
function isBunVirtualPath(e) {
  return /^(?:\/\$bunfs|[a-z]:[\\/]~BUN)(?:[\\/]|$)/i.test(e);
}
//@ chunk-cgr0tezp.js:18702-18729 placement
var SENTINEL_INODE_MAX = 0xffffffffffffffffn;
//@ chunk-cgr0tezp.js:18729-18804 placement
/**
 * inode 是否为无效哨兵值。
 */
function isSentinelInode(e) {
  let n = BigInt(e);
  return n === 0n || n === -1n || n === SENTINEL_INODE_MAX || n === 1n << 64n;
}
//@ chunk-cgr0tezp.js:18804-18866 placement
/**
 * 两个文件的 inode 是否都有效且不同（判断是否被替换）。
 */
function didInodeChange(e, n) {
  return !isSentinelInode(e.ino) && !isSentinelInode(n.ino) && e.ino !== n.ino;
}
//@ chunk-cgr0tezp.js:18902-19054 placement
var SLOW_OPERATION_THRESHOLD_MS = (() => {
  let envValue = process.env.CLAUDE_CODE_SLOW_OPERATION_THRESHOLD_MS;
  if (envValue !== undefined) {
    let parsed = Number(envValue);
    if (!Number.isNaN(parsed) && parsed >= 0) return parsed;
  }
  return 1 / 0;
})();
//@ chunk-cgr0tezp.js:19054-19084 file-local
var NOOP_LOGGER = {
  [Symbol.dispose]() {},
};
//@ chunk-cgr0tezp.js:19084-19108 layout
function createSlowOperationLogger() {
  return NOOP_LOGGER;
}
//@ chunk-cgr0tezp.js:19108-19118 layout
var slowLogging = createSlowOperationLogger;
//@ chunk-cgr0tezp.js:19118-19202 fingerprint = jsonStringify (1)
/**
 * JSON.stringify 包装（慢操作计时点）。
 */
function jsonStringify(value, replacer, space) {
  using i = slowLogging`JSON.stringify(${lengthOrValue(value)})`;
  return JSON.stringify(value, replacer, space);
}
//@ chunk-cgr0tezp.js:19202-19246 layout
/**
 * 序列化为一行 JSONL（末尾换行）。
 */
function toJsonLine(e) {
  return (
    JSON.stringify(e) +
    `
`
  );
}
//@ chunk-cgr0tezp.js:19246-19286 layout
/**
 * 直接 JSON.stringify（不计时）。
 */
function jsonStringifyRaw(e) {
  return JSON.stringify(e);
}
//@ chunk-cgr0tezp.js:19286-19410 layout
function jsonlJoin(e) {
  using n = slowLogging`jsonlJoin(${e.length})`;
  let r = "";
  for (let i = 0; i < e.length; i++)
    r +=
      JSON.stringify(e[i]) +
      `
`;
  return r;
}
//@ chunk-cgr0tezp.js:19410-19509 fingerprint = jsonParse (0.745)
/**
 * JSON.parse 包装（慢操作计时点）。
 */
var jsonParse = (text, reviver) => {
  using r = slowLogging`JSON.parse(${lengthOrValue(text)})`;
  return typeof reviver === "undefined" ? JSON.parse(text) : JSON.parse(text, reviver);
};
//@ chunk-cgr0tezp.js:19509-19545 layout
/**
 * 直接 JSON.parse（不计时、不捕获）。
 */
function jsonParseRaw(e) {
  return JSON.parse(e);
}
//@ chunk-cgr0tezp.js:19545-19628 fingerprint = clone (1)
/**
 * structuredClone 包装，带慢操作计时（超阈值记调试日志）。
 */
function clone(value, options) {
  using r = slowLogging`structuredClone(${lengthOrValue(value)})`;
  return structuredClone(value, options);
}
//@ chunk-cgr0tezp.js:19628-19703 fingerprint = writeFileSync_DEPRECATED (0.409)
function writeFileSync_DEPRECATED(value, replacer, space) {
  using i = slowLogging`fs.writeFileSync(${value}, ${lengthOrValue(replacer)})`;
  writeFileSync(value, replacer, space);
}
//@ chunk-cgr0tezp.js:19703-19756 affinity
function lengthOrValue(e) {
  return typeof e === "string" ? e.length : e;
}
//@ chunk-4121qate.js:71907-72078 fingerprint = AntSlowLogger (0.323)
function AntSlowLogger(e, o) {
  let r = slowHookReports_2.get(e);
  slowHookReports_2.delete(e);
  if (r !== undefined && r.count > 0)
    matcherLog().log(
      `${o} ${r.count} more times in the last ${SLOW_PLUGIN_HOOK_WINDOW_MS / SLOW_HOOK_REPORT_INTERVAL_MS_2}s (the last in ${r.lastMs.toFixed(1)}ms)`,
    );
}
export {
  jsonStringify,
  jsonParse,
  writeFileSync_DEPRECATED,
  jsonParseRaw,
  alwaysTrue,
  clone,
  toJsonLine,
  jsonlJoin,
  slowLogging,
  jsonStringifyRaw,
  isSentinelInode,
  isStandaloneExecutable,
  shouldLogDebugCategory,
  AntSlowLogger,
  didInodeChange,
  realpathPromise,
  isBunVirtualPath,
  isRunningFromTsSource,
};
