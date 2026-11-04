/**
 * utils/path.ts
 *
 * 路径展开（~、相对 baseDir、Windows 路径归一化）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/path.ts
 * pieces: chunk-0wdgqhcf.js (2), chunk-648vry02.js (19), chunk-s61vbvea.js (1)
 * attribution: placement 21, fingerprint 1
 */
import * as pathWin32Module from "path/win32";
import {
  normalize,
  join,
  isAbsolute,
  resolve,
  sep,
  posix,
  parse,
  relative,
  dirname,
  extname,
  win32,
} from "path";
import { homedir } from "os";
import { memoizeWithLRU } from "./memoize.js";
import { getCwdOrNull, getCwd } from "./cwd.js";
import { NoProjectDirectoryError } from "../bootstrap/sessionSlices.js";
import { identity } from "./pathClassification.js";
import { getPlatform } from "./platform.js";
import { isUntouchableSpelling } from "./networkPaths.js";
import { getFsImplementation } from "./fsOperations.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-648vry02.js:2015-2172 placement
function prependDirToPathEnv(env, execPath) {
  if (!pathWin32Module.isAbsolute(execPath)) return;
  let dir = pathWin32Module.dirname(execPath);
  let pathKey = Object.keys(env).find((key) => key.toUpperCase() === "PATH") ?? "PATH";
  let currentValue = env[pathKey];
  env[pathKey] = currentValue ? dir + pathWin32Module.delimiter + currentValue : dir;
}
//@ chunk-648vry02.js:2172-2479 placement
function stripShellQuotes(command) {
  let trimmed = command.trim();
  let parsed = "";
  let index = 0;
  while (index < trimmed.length) {
    let character = trimmed[index];
    if (character === '"' || character === "'") {
      let index_2 = trimmed.indexOf(character, index + 1);
      if (index_2 === -1) {
        parsed += trimmed.slice(index + 1);
        index = trimmed.length;
        break;
      }
      parsed += trimmed.slice(index + 1, index_2);
      index = index_2 + 1;
    } else if (character === "\\" && index + 1 < trimmed.length) {
      parsed += trimmed[index + 1];
      index += 2;
    } else if (/\s/.test(character)) break;
    else {
      parsed += character;
      index++;
    }
  }
  return parsed.endsWith(".sh") ? `bash ${command}` : command;
}
//@ chunk-648vry02.js:2479-3085 placement (2.1.88 match: posixPathToWindowsPath, 1)
/**
 * Windows 路径转 POSIX 形式（C:\a\b → /c/a/b，UNC 转正斜杠），LRU 缓存；同语句含反方向转换。
 */
var windowsPathToPosixPath; // deferred: uses memoizeWithLRU (./memoize.js) of its import cycle while loading; runs once the cycle is complete
var posixPathToWindowsPath;
deferInit("chunk-648vry02.js:2479", () => {
  windowsPathToPosixPath = memoizeWithLRU(
    (windowsPath) => {
      if (windowsPath.startsWith("\\\\")) return windowsPath.replaceAll("\\", "/");
      let match = windowsPath.match(/^([A-Za-z]):[/\\]/);
      if (match) return "/" + match[1].toLowerCase() + windowsPath.slice(2).replaceAll("\\", "/");
      return windowsPath.replaceAll("\\", "/");
    },
    (windowsPath) => windowsPath,
    500,
  );
  posixPathToWindowsPath = memoizeWithLRU(
    (posixPath) => {
      if (posixPath.startsWith("//")) return posixPath.replaceAll("/", "\\");
      let cygdriveMatch = posixPath.match(/^\/cygdrive\/([A-Za-z])(\/|$)/);
      if (cygdriveMatch) {
        let driveLetter = cygdriveMatch[1].toUpperCase();
        let rest = posixPath.slice(("/cygdrive/" + cygdriveMatch[1]).length);
        return driveLetter + ":" + (rest || "\\").replaceAll("/", "\\");
      }
      let driveMatch = posixPath.match(/^\/([A-Za-z])(\/|$)/);
      if (driveMatch) {
        let driveLetter = driveMatch[1].toUpperCase();
        let rest = posixPath.slice(2);
        return driveLetter + ":" + (rest || "\\").replaceAll("/", "\\");
      }
      return posixPath.replaceAll("/", "\\");
    },
    (posixPath) => posixPath,
    500,
  );
});
//@ chunk-648vry02.js:3085-3187 placement
class NullBytePathError extends Error {
  constructor() {
    super("Path contains null bytes");
    this.name = "NullBytePathError";
  }
}
//@ chunk-648vry02.js:3187-3238 placement
function assertPathHasNoNullBytes(inputPath) {
  if (inputPath.includes("\x00")) throw new NullBytePathError();
}
//@ chunk-648vry02.js:3238-3308 placement
function expandPath(path, baseDir) {
  let resolved = expandPath_2(path, baseDir ?? getCwdOrNull());
  if (resolved === null) throw new NoProjectDirectoryError();
  return resolved;
}
//@ chunk-648vry02.js:3308-3799 fingerprint (2.1.88 match: expandPath, 0.684)
function expandPath_2(path, baseDir) {
  if (typeof path !== "string") throw TypeError(`Path must be a string, received ${typeof path}`);
  if (baseDir !== null && typeof baseDir !== "string")
    throw TypeError(`Base directory must be a string, received ${typeof baseDir}`);
  assertPathHasNoNullBytes(path);
  if (baseDir !== null) assertPathHasNoNullBytes(baseDir);
  let trimmedPath = path.trim();
  if (!trimmedPath) return baseDir === null ? null : identity(normalize(baseDir));
  if (trimmedPath === "~") return identity(homedir());
  if (trimmedPath.startsWith("~/")) return identity(join(homedir(), trimmedPath.slice(2)));
  let processedPath = trimmedPath;
  if (getPlatform() === "windows" && trimmedPath.match(/^\/[a-z]\//i))
    try {
      processedPath = posixPathToWindowsPath(trimmedPath);
    } catch {
      processedPath = trimmedPath;
    }
  if (isAbsolute(processedPath)) return identity(normalize(processedPath));
  return baseDir === null ? null : identity(resolve(baseDir, processedPath));
}
//@ chunk-648vry02.js:3799-3937 placement
class UnstablePathError extends Error {
  constructor() {
    super('Path ends in white space once its "." and ".." are resolved');
    this.name = "UnstablePathError";
  }
}
//@ chunk-648vry02.js:3937-4006 placement
function expandStablePath(inputPath, baseDir) {
  let resolved = expandPath(inputPath, baseDir);
  if (expandPath(resolved, baseDir) !== resolved) throw new UnstablePathError();
  return resolved;
}
//@ chunk-648vry02.js:4006-4067 placement (2.1.88 match: _temp4, 0.715)
function isFullyQualifiedPath(p_0) {
  return isAbsolute(p_0) && (sep === posix.sep || parse(p_0).root.length > 1);
}
//@ chunk-648vry02.js:4067-4127 placement
function expandPathOrNull(path, baseDir) {
  try {
    return expandPath_2(path, baseDir ?? getCwdOrNull());
  } catch {
    return null;
  }
}
//@ chunk-648vry02.js:4127-4189 placement
function toRelativePath(absolutePath) {
  let relativePath = relative(getCwd(), absolutePath);
  return relativePath.startsWith("..") ? absolutePath : relativePath;
}
//@ chunk-648vry02.js:4189-4303 placement (2.1.88 match: isFileWithinReadSizeLimit, 1)
/**
 * 路径若是目录返回自身，否则返回其所在目录（UNC 等特殊路径直接取 dirname）。误配名。
 */
function getDirectoryForPath(inputPath) {
  let resolved = expandPath(inputPath);
  if (isUntouchableSpelling(resolved)) return dirname(resolved);
  try {
    if (getFsImplementation().statSync(resolved).isDirectory()) return resolved;
  } catch {}
  return dirname(resolved);
}
//@ chunk-648vry02.js:4303-4361 placement
function containsPathTraversal(path) {
  return /(?:^|[\\/])\.\.(?:[\\/]|$)/.test(path);
}
//@ chunk-648vry02.js:4361-4463 placement
function tildify(inputPath) {
  let homeDir = homedir();
  if (inputPath === homeDir) return "~";
  if (inputPath.startsWith(homeDir + sep)) return "~" + inputPath.slice(homeDir.length);
  return inputPath;
}
//@ chunk-648vry02.js:4463-4547 placement
function normalizePathForConfigKey(inputPath) {
  let normalized = normalize(inputPath);
  if (getPlatform() === "windows") return normalized.replaceAll("\\", "/");
  return normalized;
}
//@ chunk-648vry02.js:4547-4599 placement
function isNotebookPath(inputPath) {
  return extname(inputPath).toLowerCase() === ".ipynb";
}
//@ chunk-648vry02.js:4599-4837 placement
function anchorPathUnnormalized(inputPath, platform = "linux") {
  if ((platform === "win32" ? win32.isAbsolute : posix.isAbsolute)(inputPath)) return inputPath;
  if (
    inputPath === "~" ||
    inputPath.startsWith("~/") ||
    (platform === "win32" && inputPath.startsWith("~\\"))
  )
    return getUnameSR(homedir(), inputPath.slice(2), platform);
  if (platform === "win32" && /^[a-zA-Z]:/.test(inputPath)) return inputPath;
  return getUnameSR(getCwd(), inputPath, platform);
}
//@ chunk-648vry02.js:4837-4967 placement (2.1.88 match: getUnameSR, 0.793)
function getUnameSR(baseDir, relativePath, platform) {
  if (relativePath === "") return baseDir;
  if (platform === "win32" ? /[\\/]$/.test(baseDir) : baseDir.endsWith("/")) return baseDir + relativePath;
  return baseDir + (platform === "win32" ? "\\" : "/") + relativePath;
}
//@ chunk-s61vbvea.js:476278-476488 placement (2.1.88 match: SPINNER_FRAMES, 0.711)
/**
 * 列出给定路径的各级父目录（由近到远逆序后输出、跨路径去重），wipStash 用它找各级 .gitattributes。
 */
function listAncestorDirs(paths) {
  let seen = new Set();
  return paths.flatMap((path) => {
    let ancestors = [];
    for (
      let index = path.lastIndexOf("/");
      index !== -1;
      index = index === 0 ? -1 : path.lastIndexOf("/", index - 1)
    ) {
      let sliced = path.slice(0, index);
      if (seen.has(sliced)) break;
      seen.add(sliced);
      ancestors.push(sliced);
    }
    return ancestors.reverse();
  });
}
//@ chunk-0wdgqhcf.js:45183-45290 placement
function toDarwinPrivatePath(inputPath, platform = "linux") {
  if (platform !== "darwin") return inputPath;
  return /^\/(tmp|var|etc)(\/|$)/.test(inputPath) ? `/private${inputPath}` : inputPath;
}
//@ chunk-0wdgqhcf.js:45290-45344 placement (2.1.88 match: chordToDisplayString, 1)
function isDifferentPath(inputPath, real, platform = "linux") {
  return real !== inputPath && real !== toDarwinPrivatePath(inputPath, platform);
}
export {
  expandPathOrNull,
  tildify,
  expandPath,
  isNotebookPath,
  normalizePathForConfigKey,
  isDifferentPath,
  windowsPathToPosixPath,
  posixPathToWindowsPath,
  containsPathTraversal,
  anchorPathUnnormalized,
  getDirectoryForPath,
  prependDirToPathEnv,
  stripShellQuotes,
  isFullyQualifiedPath,
  expandStablePath,
  toDarwinPrivatePath,
  NullBytePathError,
  UnstablePathError,
  assertPathHasNoNullBytes,
  toRelativePath,
  listAncestorDirs,
};
