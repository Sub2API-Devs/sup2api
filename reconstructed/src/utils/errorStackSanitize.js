/**
 * utils/errorStackSanitize.ts
 *
 * 2.1.316 新增：错误栈的遥测安全化（只保留 CLI/SDK 自身帧、node_modules 包名）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-sycgf9xs.js (24)
 * attribution: placement 23, layout 1
 */
import { homedir } from "os";
import { UserResourceUpdateMessage } from "../components/messages/UserResourceUpdateMessage.js";

//@ chunk-sycgf9xs.js:838-861 placement
/**
 * 空实现探针函数，占位用于拼接调用表。
 */
function noopProbe(e) {
  return;
}
//@ chunk-sycgf9xs.js:861-883 placement
/**
 * 堆栈清洗时替换用户代码路径的占位文本 "<user-code>"。
 */
var USER_CODE_PLACEHOLDER = "<user-code>";
//@ chunk-sycgf9xs.js:883-929 placement
/**
 * 取当前用户主目录；取不到时返回空串。
 */
function homeDirectory() {
  try {
    return homedir();
  } catch {
    return "";
  }
}
//@ chunk-sycgf9xs.js:929-1036 placement
var CLI_BUNDLE_BASENAME = "cli";
var ENTRY_BUNDLE_BASENAMES = new Set([
  "cli.js",
  CLI_BUNDLE_BASENAME,
  "sdk.mjs",
  "browser-sdk.js",
  "agentSdk.js",
]);
var CHUNK_FILENAME_RE = /^chunk-[0-9a-z]+\.js$/;
//@ chunk-sycgf9xs.js:1036-1090 placement
function isChunkFilenamePath(e) {
  return e[0] === "/" && CHUNK_FILENAME_RE.test(e.slice(1));
}
//@ chunk-sycgf9xs.js:1090-1150 placement
function isCliBundlePath(file) {
  return isChunkFilenamePath(file) || (file[0] === "/" && ENTRY_BUNDLE_BASENAMES.has(file.slice(1)));
}
//@ chunk-sycgf9xs.js:1150-1188 placement
/**
 * 把 CLI 打包文件路径统一成 "/"+bundle 基名的形式，便于堆栈折叠。
 */
function unifyCliBundlePath(file) {
  return isChunkFilenamePath(file) ? "/" + CLI_BUNDLE_BASENAME : file;
}
//@ chunk-sycgf9xs.js:1188-1260 layout
var BUN_BUNDLE_PATH_RE = /^(?:\/(?:\$bunfs|~BUN)|\/?[A-Za-z]:[\\/](?:\$bunfs|~BUN))[\\/]/;
//@ chunk-sycgf9xs.js:1260-1336 placement = formatUri (1)
function formatUri_2(uri) {
  let n = uri.startsWith("file://") ? uri.slice(7) : uri;
  return BUN_BUNDLE_PATH_RE.test(n);
}
//@ chunk-sycgf9xs.js:1535-1563 placement
var SOURCE_DIR_PREFIXES = ["src/", "packages/"];
//@ chunk-sycgf9xs.js:1563-1663 placement
/**
 * 取路径的文件名部分（支持 / 与 \）。
 */
function getBaseName(e) {
  let max = Math.max(e.lastIndexOf("/"), e.lastIndexOf("\\"));
  return max === -1 ? e : e.slice(max + 1);
}
//@ chunk-sycgf9xs.js:1663-1733 placement
/**
 * 判断堆栈帧是否来自 CLI 自身源码（打包文件名或源码前缀目录）。
 */
function isSourceFrame(e) {
  return isCliBundlePath(e.file) || SOURCE_DIR_PREFIXES.some((n) => e.file.startsWith(n));
}
//@ chunk-sycgf9xs.js:1733-1880 placement
var RUNTIME_FRAME_PREFIXES = ["node:", "bun:", "internal:"];
var IGNORED_FRAME_PACKAGES = new Set([
  "native",
  "unknown",
  "ws",
  "undici",
  "node-fetch",
  "isomorphic-fetch",
  "vercel_fetch",
  "utf-8-validate",
]);
//@ chunk-sycgf9xs.js:1880-1943 placement
function isExternalFramePath(e) {
  return IGNORED_FRAME_PACKAGES.has(e) || RUNTIME_FRAME_PREFIXES.some((n) => e.startsWith(n));
}
//@ chunk-sycgf9xs.js:1943-1977 placement
/**
 * 判断堆栈帧路径是否为外部（非本包）路径。
 */
function isStackFrameExternal(e) {
  return isExternalFramePath(e.file);
}
//@ chunk-sycgf9xs.js:1977-2110 placement
/**
 * 判断错误栈是否只有外部帧（首个有效帧为未知或 node_modules）。
 */
function isStackOnlyExternal(sanitizedStackFrames) {
  let found = sanitizedStackFrames.find((r) => !isStackFrameExternal(r));
  if (found === undefined) return sanitizedStackFrames.length >= MAX_SANITIZED_FRAMES;
  return found.file === USER_CODE_PLACEHOLDER || found.file.startsWith("node_modules/");
}
//@ chunk-sycgf9xs.js:2110-2192 placement
/**
 * 判断堆栈帧是否为打包文件里的匿名帧（无函数名或 <anonymous>）。
 */
function isAnonymousBundledFrame(e) {
  return isCliBundlePath(e.file) && (e.function == null || e.function === "<anonymous>");
}
//@ chunk-sycgf9xs.js:2192-2496 placement
function shortenNodeModulesPath(e) {
  let parts = e.split(/[/\\]/);
  let r = -1;
  for (let idx = parts.length - 1; idx >= 0; idx--)
    if (parts[idx] === "node_modules") {
      r = idx;
      break;
    }
  if (r === -1 || r >= parts.length - 1) return null;
  let o = parts[r + 1];
  let s;
  if (o.startsWith("@")) {
    if (r + 2 >= parts.length) return null;
    s = `${o}/${parts[r + 2]}`;
  } else s = o;
  let last = parts.at(-1);
  if (!last) return null;
  return `node_modules/${s}/${last}`;
}
//@ chunk-sycgf9xs.js:2496-2695 placement
function sanitizeFramePath(uri) {
  let n = UserResourceUpdateMessage(uri);
  let baseName = getBaseName(n);
  let o = shortenNodeModulesPath(n);
  if (
    (ENTRY_BUNDLE_BASENAMES.has(baseName) && (o === null || o.startsWith("node_modules/@anthropic-ai/"))) ||
    (formatUri_2(uri) && CHUNK_FILENAME_RE.test(baseName))
  )
    return "/" + baseName;
  let s = null;
  if (s) return s;
  if (isExternalFramePath(n)) return n;
  return USER_CODE_PLACEHOLDER;
}
//@ chunk-sycgf9xs.js:2695-3141 placement
function sanitizeStackFrame(line) {
  let trimmed = line.trim();
  if (!trimmed.startsWith("at ")) return null;
  let sliced = trimmed.slice(3);
  let index = sliced.indexOf(" (");
  let s;
  let u;
  if (index !== -1 && sliced.endsWith(")")) {
    s = sliced.slice(0, index).trim();
    u = sliced.slice(index + 2, -1);
  } else u = sliced.trim();
  if (s) {
    s = s.replace(/^async\s+/, "").replace(/^new\s+/, "");
    s = s.replace(/\s*\[as\s+[^\]]+\]$/, "");
    if (!s) s = undefined;
  }
  let match = u.match(/^(.*):(\d+):(\d+)$/);
  if (!match) return null;
  let [, d, g, f] = match;
  let m = sanitizeFramePath(d);
  return {
    file: m,
    line: Number(g),
    column: Number(f),
    function: m === USER_CODE_PLACEHOLDER && s ? USER_CODE_PLACEHOLDER : s,
  };
}
//@ chunk-sycgf9xs.js:3141-3151 placement
var MAX_SANITIZED_FRAMES = 50;
//@ chunk-sycgf9xs.js:3151-3272 placement
/**
 * 把错误栈逐帧清理为遥测安全格式，最多保留指定帧数。
 */
function getSanitizedStackFrames(e, n = MAX_SANITIZED_FRAMES) {
  let r = [];
  for (let line of stripStackHeader(e).split(`
`)) {
    let s = sanitizeStackFrame(line);
    if (s) {
      r.push(s);
      if (r.length >= n) break;
    }
  }
  return r;
}
//@ chunk-sycgf9xs.js:3272-3420 placement
/**
 * 去掉错误栈开头的消息部分，只保留帧。
 */
function stripStackHeader(e) {
  let stack = typeof e.stack === "string" ? e.stack : "";
  let message = typeof e.message === "string" ? e.message : "";
  let o = formatErrorForTelemetry(stack, e.name, message);
  return o === -1 ? stack : stack.slice(o + 1);
}
//@ chunk-sycgf9xs.js:3420-3842 placement
function formatErrorForTelemetry(stack, name, message) {
  let o = (u) =>
    u !== "" &&
    stack.startsWith(`${u}
`);
  if (message !== "") {
    let u = typeof name === "string" && name !== "" ? `${name}: ${message}` : "";
    if (u !== "" && o(u)) return u.length;
    let c = `: ${message}`;
    let index = stack.indexOf(`${c}
`);
    return index > 0 &&
      !stack.slice(0, index).includes(`
`)
      ? index + c.length
      : name === "" && o(message)
        ? message.length
        : -1;
  }
  let s =
    name === undefined
      ? "Error"
      : typeof name === "string"
        ? name
        : typeof name === "number" || typeof name === "boolean" || typeof name === "bigint" || name === null
          ? String(name)
          : "";
  return o(s) ? s.length : -1;
}
export {
  stripStackHeader,
  formatUri_2,
  getBaseName,
  homeDirectory,
  isAnonymousBundledFrame,
  unifyCliBundlePath,
  getSanitizedStackFrames,
  isStackOnlyExternal,
  isSourceFrame,
  noopProbe,
  isStackFrameExternal,
  USER_CODE_PLACEHOLDER,
};
