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
  slowHookReports,
  SLOW_PLUGIN_HOOK_WINDOW_MS,
  SLOW_HOOK_REPORT_INTERVAL_MS,
} from "../plugins/functionHooks/dispatch/slowHookReports.js";
import { pd } from "./hooks/functionHookMatchers.js";

//@ chunk-cgr0tezp.js:17797-17960 placement
function matchesFilter(e, n) {
  if (!n) return !0;
  if (e.length === 0) return !1;
  if (n.isExclusive) return !e.some((r) => n.exclude.includes(r));
  else return e.some((r) => n.include.includes(r));
}
//@ chunk-cgr0tezp.js:17960-18019 placement
function sn(e, n) {
  if (!n) return !0;
  let r = extractDebugCategories(e);
  return matchesFilter(r, n);
}
//@ chunk-cgr0tezp.js:18369-18435 placement
var li = (e) =>
  new Promise((n, r) => {
    realpath_2(e, (i, s) => (i === null ? n(s) : r(i)));
  });
/**
 * 恒为 true。
 */
//@ chunk-cgr0tezp.js:18435-18458 placement
function alwaysTrue() {
  return !0;
}
/**
 * 是否运行于 Bun 单文件可执行。
 */
//@ chunk-cgr0tezp.js:18458-18527 placement
function isStandaloneExecutable() {
  return typeof Bun < "u" && Bun.isStandaloneExecutable === !0;
}
/**
 * 非独立可执行文件时，主模块是否为 .ts/.tsx 源文件。
 */
//@ chunk-cgr0tezp.js:18527-18628 placement
function isRunningFromTsSource() {
  if (!alwaysTrue() || isStandaloneExecutable()) return !1;
  let main = Bun.main;
  if (nt(main)) return !1;
  return /\.[cm]?tsx?$/.test(main);
}
//@ chunk-cgr0tezp.js:18628-18702 placement
function nt(e) {
  return /^(?:\/\$bunfs|[a-z]:[\\/]~BUN)(?:[\\/]|$)/i.test(e);
}
//@ chunk-cgr0tezp.js:18702-18729 placement
var ci = 0xffffffffffffffffn;
/**
 * inode 是否为无效哨兵值。
 */
//@ chunk-cgr0tezp.js:18729-18804 placement
function isSentinelInode(e) {
  let n = BigInt(e);
  return n === 0n || n === -1n || n === ci || n === 1n << 64n;
}
//@ chunk-cgr0tezp.js:18804-18866 placement
function Kwr(e, n) {
  return !isSentinelInode(e.ino) && !isSentinelInode(n.ino) && e.ino !== n.ino;
}
//@ chunk-cgr0tezp.js:18902-19054 placement
var SLOW_OPERATION_THRESHOLD_MS = (() => {
  let envClaudeCodeSlowOperationThresholdMs = process.env.CLAUDE_CODE_SLOW_OPERATION_THRESHOLD_MS;
  if (envClaudeCodeSlowOperationThresholdMs !== void 0) {
    let n = Number(envClaudeCodeSlowOperationThresholdMs);
    if (!Number.isNaN(n) && n >= 0) return n;
  }
  return 1 / 0;
})();
//@ chunk-cgr0tezp.js:19054-19084 file-local
var NOOP_LOGGER = { [Symbol.dispose]() {} };
//@ chunk-cgr0tezp.js:19084-19108 layout
function createSlowOperationLogger() {
  return NOOP_LOGGER;
}
//@ chunk-cgr0tezp.js:19108-19118 layout
var slowLogging = createSlowOperationLogger;
/**
 * JSON.stringify 包装（慢操作计时点）。
 */
//@ chunk-cgr0tezp.js:19118-19202 fingerprint = jsonStringify (1)
function jsonStringify(value, replacer, space) {
  using i = slowLogging`JSON.stringify(${lengthOrValue(value)})`;
  return JSON.stringify(value, replacer, space);
}
/**
 * 序列化为一行 JSONL（末尾换行）。
 */
//@ chunk-cgr0tezp.js:19202-19246 layout
function toJsonLine(e) {
  return (
    JSON.stringify(e) +
    `
`
  );
}
/**
 * 直接 JSON.stringify（不计时）。
 */
//@ chunk-cgr0tezp.js:19246-19286 layout
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
/**
 * JSON.parse 包装（慢操作计时点）。
 */
//@ chunk-cgr0tezp.js:19410-19509 fingerprint = jsonParse (0.745)
var jsonParse = (text, reviver) => {
  using r = slowLogging`JSON.parse(${lengthOrValue(text)})`;
  return typeof reviver > "u" ? JSON.parse(text) : JSON.parse(text, reviver);
};
/**
 * 直接 JSON.parse（不计时、不捕获）。
 */
//@ chunk-cgr0tezp.js:19509-19545 layout
function jsonParseRaw(e) {
  return JSON.parse(e);
}
/**
 * structuredClone 包装，带慢操作计时（超阈值记调试日志）。
 */
//@ chunk-cgr0tezp.js:19545-19628 fingerprint = clone (1)
function clone(value, options) {
  using r = slowLogging`structuredClone(${lengthOrValue(value)})`;
  return structuredClone(value, options);
}
//@ chunk-cgr0tezp.js:19628-19703 fingerprint = writeFileSync_DEPRECATED (0.409)
function writeFileSync_DEPRECATED(filePath, data, options) {
  using i = slowLogging`fs.writeFileSync(${filePath}, ${lengthOrValue(data)})`;
  writeFileSync(filePath, data, options);
}
//@ chunk-cgr0tezp.js:19703-19756 affinity
function lengthOrValue(e) {
  return typeof e === "string" ? e.length : e;
}
//@ chunk-4121qate.js:71907-72078 fingerprint = AntSlowLogger (0.323)
function AntSlowLogger(e, o) {
  let r = slowHookReports.get(e);
  if ((slowHookReports.delete(e), r !== void 0 && r.count > 0))
    pd().log(
      `${o} ${r.count} more times in the last ${SLOW_PLUGIN_HOOK_WINDOW_MS / SLOW_HOOK_REPORT_INTERVAL_MS}s (the last in ${r.lastMs.toFixed(1)}ms)`,
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
  sn,
  AntSlowLogger,
  Kwr,
  li,
  nt,
  isRunningFromTsSource,
};
