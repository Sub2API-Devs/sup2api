/**
 * utils/errorStackSanitize.ts
 *
 * 2.1.316 新增：错误栈的遥测安全化（只保留 CLI/SDK 自身帧、node_modules 包名）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-hb44av3w.js (25)
 * attribution: placement 23, layout 2
 */
import { homedir } from "os";
import { sep } from "path";

//@ chunk-hb44av3w.js:871-894 placement
/**
 * 空实现探针函数，占位用于拼接调用表。
 */
function noopProbe(probe) {
  return;
}
//@ chunk-hb44av3w.js:894-916 placement
/**
 * 堆栈清洗时替换用户代码路径的占位文本 "<user-code>"。
 */
var USER_CODE_PLACEHOLDER = "<user-code>";
//@ chunk-hb44av3w.js:916-962 placement
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
//@ chunk-hb44av3w.js:962-1069 placement
var CLI_BUNDLE_BASENAME = "cli";
var ENTRY_BUNDLE_BASENAMES = new Set([
  "cli.js",
  CLI_BUNDLE_BASENAME,
  "sdk.mjs",
  "browser-sdk.js",
  "agentSdk.js",
]);
var CHUNK_FILENAME_RE = /^chunk-[0-9a-z]+\.js$/;
//@ chunk-hb44av3w.js:1069-1123 placement
function isChunkFilenamePath(filePath) {
  return filePath[0] === "/" && CHUNK_FILENAME_RE.test(filePath.slice(1));
}
//@ chunk-hb44av3w.js:1123-1183 placement
function isCliBundlePath(filePath) {
  return (
    isChunkFilenamePath(filePath) || (filePath[0] === "/" && ENTRY_BUNDLE_BASENAMES.has(filePath.slice(1)))
  );
}
//@ chunk-hb44av3w.js:1183-1221 placement
/**
 * 把 CLI 打包文件路径统一成 "/"+bundle 基名的形式，便于堆栈折叠。
 */
function unifyCliBundlePath(filePath) {
  return isChunkFilenamePath(filePath) ? "/" + CLI_BUNDLE_BASENAME : filePath;
}
//@ chunk-hb44av3w.js:1221-1293 layout
var BUN_BUNDLE_PATH_RE = /^(?:\/(?:\$bunfs|~BUN)|\/?[A-Za-z]:[\\/](?:\$bunfs|~BUN))[\\/]/;
//@ chunk-hb44av3w.js:1293-1369 placement (2.1.88 match: formatUri, 1)
function formatUri(uri) {
  let path = uri.startsWith("file://") ? uri.slice(7) : uri;
  return BUN_BUNDLE_PATH_RE.test(path);
}
//@ chunk-hb44av3w.js:1369-1568 layout
function displayPathForUri(resourceUri) {
  let resourceUri_2 = resourceUri;
  if (resourceUri_2.startsWith("file://")) resourceUri_2 = resourceUri_2.slice(7);
  if (formatUri(resourceUri_2)) return getBaseName(resourceUri_2);
  if (resourceUri_2.startsWith("/snapshot/")) resourceUri_2 = resourceUri_2.slice(10);
  let homeDir = homeDirectory();
  if (homeDir && resourceUri_2.startsWith(homeDir + sep))
    resourceUri_2 = "~" + resourceUri_2.slice(homeDir.length);
  return resourceUri_2;
}
//@ chunk-hb44av3w.js:1568-1596 placement
var SOURCE_DIR_PREFIXES = ["src/", "packages/"];
//@ chunk-hb44av3w.js:1596-1696 placement
/**
 * 取路径的文件名部分（支持 / 与 \）。
 */
function getBaseName(filePath) {
  let max = Math.max(filePath.lastIndexOf("/"), filePath.lastIndexOf("\\"));
  return max === -1 ? filePath : filePath.slice(max + 1);
}
//@ chunk-hb44av3w.js:1696-1766 placement
/**
 * 判断堆栈帧是否来自 CLI 自身源码（打包文件名或源码前缀目录）。
 */
function isSourceFrame(frame) {
  return isCliBundlePath(frame.file) || SOURCE_DIR_PREFIXES.some((prefix) => frame.file.startsWith(prefix));
}
//@ chunk-hb44av3w.js:1766-1913 placement
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
//@ chunk-hb44av3w.js:1913-1976 placement
function isExternalFramePath(filePath) {
  return (
    IGNORED_FRAME_PACKAGES.has(filePath) ||
    RUNTIME_FRAME_PREFIXES.some((prefix) => filePath.startsWith(prefix))
  );
}
//@ chunk-hb44av3w.js:1976-2010 placement
/**
 * 判断堆栈帧路径是否为外部（非本包）路径。
 */
function isStackFrameExternal(frame) {
  return isExternalFramePath(frame.file);
}
//@ chunk-hb44av3w.js:2010-2143 placement
/**
 * 判断错误栈是否只有外部帧（首个有效帧为未知或 node_modules）。
 */
function isStackOnlyExternal(sanitizedStackFrames) {
  let found = sanitizedStackFrames.find((frame) => !isStackFrameExternal(frame));
  if (found === undefined) return sanitizedStackFrames.length >= MAX_SANITIZED_FRAMES;
  return found.file === USER_CODE_PLACEHOLDER || found.file.startsWith("node_modules/");
}
//@ chunk-hb44av3w.js:2143-2225 placement
/**
 * 判断堆栈帧是否为打包文件里的匿名帧（无函数名或 <anonymous>）。
 */
function isAnonymousBundledFrame(frame) {
  return isCliBundlePath(frame.file) && (frame.function == null || frame.function === "<anonymous>");
}
//@ chunk-hb44av3w.js:2225-2529 placement
function shortenNodeModulesPath(filePath) {
  let parts = filePath.split(/[/\\]/);
  let moduleIndex = -1;
  for (let idx = parts.length - 1; idx >= 0; idx--)
    if (parts[idx] === "node_modules") {
      moduleIndex = idx;
      break;
    }
  if (moduleIndex === -1 || moduleIndex >= parts.length - 1) return null;
  let packageName = parts[moduleIndex + 1];
  let suffix;
  if (packageName.startsWith("@")) {
    if (moduleIndex + 2 >= parts.length) return null;
    suffix = `${packageName}/${parts[moduleIndex + 2]}`;
  } else suffix = packageName;
  let last = parts.at(-1);
  if (!last) return null;
  return `node_modules/${suffix}/${last}`;
}
//@ chunk-hb44av3w.js:2529-2728 placement
function sanitizeFramePath(filePart) {
  let displayPath = displayPathForUri(filePart);
  let baseName = getBaseName(displayPath);
  let shortened = shortenNodeModulesPath(displayPath);
  if (
    (ENTRY_BUNDLE_BASENAMES.has(baseName) &&
      (shortened === null || shortened.startsWith("node_modules/@anthropic-ai/"))) ||
    (formatUri(filePart) && CHUNK_FILENAME_RE.test(baseName))
  )
    return "/" + baseName;
  let result = null;
  if (result) return result;
  if (isExternalFramePath(displayPath)) return displayPath;
  return USER_CODE_PLACEHOLDER;
}
//@ chunk-hb44av3w.js:2728-3174 placement
function sanitizeStackFrame(line) {
  let trimmed = line.trim();
  if (!trimmed.startsWith("at ")) return null;
  let sliced = trimmed.slice(3);
  let index = sliced.indexOf(" (");
  let filePath;
  let location;
  if (index !== -1 && sliced.endsWith(")")) {
    filePath = sliced.slice(0, index).trim();
    location = sliced.slice(index + 2, -1);
  } else location = sliced.trim();
  if (filePath) {
    filePath = filePath.replace(/^async\s+/, "").replace(/^new\s+/, "");
    filePath = filePath.replace(/\s*\[as\s+[^\]]+\]$/, "");
    if (!filePath) filePath = undefined;
  }
  let match = location.match(/^(.*):(\d+):(\d+)$/);
  if (!match) return null;
  let [, filePart, linePart, columnPart] = match;
  let sanitizedPath = sanitizeFramePath(filePart);
  return {
    file: sanitizedPath,
    line: Number(linePart),
    column: Number(columnPart),
    function: sanitizedPath === USER_CODE_PLACEHOLDER && filePath ? USER_CODE_PLACEHOLDER : filePath,
  };
}
//@ chunk-hb44av3w.js:3174-3184 placement
var MAX_SANITIZED_FRAMES = 50;
//@ chunk-hb44av3w.js:3184-3305 placement
/**
 * 把错误栈逐帧清理为遥测安全格式，最多保留指定帧数。
 */
function getSanitizedStackFrames(error, maxFrames = MAX_SANITIZED_FRAMES) {
  let frames = [];
  for (let line of stripStackHeader(error).split(`
`)) {
    let sanitized = sanitizeStackFrame(line);
    if (sanitized) {
      frames.push(sanitized);
      if (frames.length >= maxFrames) break;
    }
  }
  return frames;
}
//@ chunk-hb44av3w.js:3305-3453 placement
/**
 * 去掉错误栈开头的消息部分，只保留帧。
 */
function stripStackHeader(error) {
  let stack = typeof error.stack === "string" ? error.stack : "";
  let message = typeof error.message === "string" ? error.message : "";
  let text = formatErrorForTelemetry(stack, error.name, message);
  return text === -1 ? stack : stack.slice(text + 1);
}
//@ chunk-hb44av3w.js:3453-3875 placement
function formatErrorForTelemetry(stack, name, line) {
  let matchLine = (line) =>
    line !== "" &&
    stack.startsWith(`${line}
`);
  if (line !== "") {
    let header = typeof name === "string" && name !== "" ? `${name}: ${line}` : "";
    if (header !== "" && matchLine(header)) return header.length;
    let messageSuffix = `: ${line}`;
    let index = stack.indexOf(`${messageSuffix}
`);
    return index > 0 &&
      !stack.slice(0, index).includes(`
`)
      ? index + messageSuffix.length
      : name === "" && matchLine(line)
        ? line.length
        : -1;
  }
  let out =
    name === undefined
      ? "Error"
      : typeof name === "string"
        ? name
        : typeof name === "number" || typeof name === "boolean" || typeof name === "bigint" || name === null
          ? String(name)
          : "";
  return matchLine(out) ? out.length : -1;
}
export {
  stripStackHeader,
  getSanitizedStackFrames,
  isStackFrameExternal,
  isSourceFrame,
  getBaseName,
  USER_CODE_PLACEHOLDER,
  noopProbe,
  isAnonymousBundledFrame,
  unifyCliBundlePath,
  isStackOnlyExternal,
};
