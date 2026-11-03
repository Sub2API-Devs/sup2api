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
import { gl, getCwd } from "./cwd.js";
import { NoProjectDirectoryError } from "../bootstrap/sessionSlices.js";
import { Mn } from "./pathClassification.js";
import { getPlatform } from "./platform.js";
import { hl } from "./networkPaths.js";
import { getFsImplementation } from "./fsOperations.js";

//@ chunk-648vry02.js:2015-2172 placement
function prependDirToPathEnv(e, r) {
  if (!pathWin32Module.isAbsolute(r)) return;
  let dir = pathWin32Module.dirname(r),
    o = Object.keys(e).find((a) => a.toUpperCase() === "PATH") ?? "PATH",
    s = e[o];
  e[o] = s ? dir + pathWin32Module.delimiter + s : dir;
}
//@ chunk-648vry02.js:2172-2479 placement
function stripShellQuotes(e) {
  let trimmed = e.trim(),
    n = "",
    o = 0;
  while (o < trimmed.length) {
    let s = trimmed[o];
    if (s === '"' || s === "'") {
      let index = trimmed.indexOf(s, o + 1);
      if (index === -1) {
        ((n += trimmed.slice(o + 1)), (o = trimmed.length));
        break;
      }
      ((n += trimmed.slice(o + 1, index)), (o = index + 1));
    } else if (s === "\\" && o + 1 < trimmed.length) ((n += trimmed[o + 1]), (o += 2));
    else if (/\s/.test(s)) break;
    else ((n += s), o++);
  }
  return n.endsWith(".sh") ? `bash ${e}` : e;
}
/**
 * Windows 路径转 POSIX 形式（C:\a\b → /c/a/b，UNC 转正斜杠），LRU 缓存；同语句含反方向转换。
 */
//@ chunk-648vry02.js:2479-3085 placement = posixPathToWindowsPath (1)
var windowsPathToPosixPath = memoizeWithLRU(
    (e) => {
      if (e.startsWith("\\\\")) return e.replaceAll("\\", "/");
      let match = e.match(/^([A-Za-z]):[/\\]/);
      if (match) return "/" + match[1].toLowerCase() + e.slice(2).replaceAll("\\", "/");
      return e.replaceAll("\\", "/");
    },
    (e) => e,
    500,
  ),
  B8 = memoizeWithLRU(
    (e) => {
      if (e.startsWith("//")) return e.replaceAll("/", "\\");
      let match = e.match(/^\/cygdrive\/([A-Za-z])(\/|$)/);
      if (match) {
        let upper = match[1].toUpperCase(),
          sliced = e.slice(("/cygdrive/" + match[1]).length);
        return upper + ":" + (sliced || "\\").replaceAll("/", "\\");
      }
      let match_2 = e.match(/^\/([A-Za-z])(\/|$)/);
      if (match_2) {
        let upper = match_2[1].toUpperCase(),
          sliced = e.slice(2);
        return upper + ":" + (sliced || "\\").replaceAll("/", "\\");
      }
      return e.replaceAll("/", "\\");
    },
    (e) => e,
    500,
  );
//@ chunk-648vry02.js:3085-3187 placement
class NullBytePathError extends Error {
  constructor() {
    super("Path contains null bytes");
    this.name = "NullBytePathError";
  }
}
//@ chunk-648vry02.js:3187-3238 placement
function assertPathHasNoNullBytes(e) {
  if (e.includes("\x00")) throw new NullBytePathError();
}
//@ chunk-648vry02.js:3238-3308 placement
function expandPath(e, r) {
  let n = expandPath_2(e, r ?? gl());
  if (n === null) throw new NoProjectDirectoryError();
  return n;
}
//@ chunk-648vry02.js:3308-3799 fingerprint = expandPath (0.684)
function expandPath_2(path, baseDir) {
  if (typeof path !== "string") throw TypeError(`Path must be a string, received ${typeof path}`);
  if (baseDir !== null && typeof baseDir !== "string")
    throw TypeError(`Base directory must be a string, received ${typeof baseDir}`);
  if ((assertPathHasNoNullBytes(path), baseDir !== null)) assertPathHasNoNullBytes(baseDir);
  let trimmedPath = path.trim();
  if (!trimmedPath) return baseDir === null ? null : Mn(normalize(baseDir));
  if (trimmedPath === "~") return Mn(homedir());
  if (trimmedPath.startsWith("~/")) return Mn(join(homedir(), trimmedPath.slice(2)));
  let processedPath = trimmedPath;
  if (getPlatform() === "windows" && trimmedPath.match(/^\/[a-z]\//i))
    try {
      processedPath = B8(trimmedPath);
    } catch {
      processedPath = trimmedPath;
    }
  if (isAbsolute(processedPath)) return Mn(normalize(processedPath));
  return baseDir === null ? null : Mn(resolve(baseDir, processedPath));
}
//@ chunk-648vry02.js:3799-3937 placement
class UnstablePathError extends Error {
  constructor() {
    super('Path ends in white space once its "." and ".." are resolved');
    this.name = "UnstablePathError";
  }
}
//@ chunk-648vry02.js:3937-4006 placement
function expandStablePath(e, r) {
  let n = expandPath(e, r);
  if (expandPath(n, r) !== n) throw new UnstablePathError();
  return n;
}
//@ chunk-648vry02.js:4006-4067 placement = _temp4 (0.715)
function isFullyQualifiedPath(p_0) {
  return isAbsolute(p_0) && (sep === posix.sep || parse(p_0).root.length > 1);
}
//@ chunk-648vry02.js:4067-4127 placement
function expandPathOrNull(e, r) {
  try {
    return expandPath_2(e, r ?? gl());
  } catch {
    return null;
  }
}
//@ chunk-648vry02.js:4127-4189 placement
function toRelativePath(absolutePath) {
  let relativePath = relative(getCwd(), absolutePath);
  return relativePath.startsWith("..") ? absolutePath : relativePath;
}
/**
 * 路径若是目录返回自身，否则返回其所在目录（UNC 等特殊路径直接取 dirname）。误配名。
 */
//@ chunk-648vry02.js:4189-4303 placement = isFileWithinReadSizeLimit (1)
function getDirectoryForPath(e) {
  let r = expandPath(e);
  if (hl(r)) return dirname(r);
  try {
    if (getFsImplementation().statSync(r).isDirectory()) return r;
  } catch {}
  return dirname(r);
}
//@ chunk-648vry02.js:4303-4361 placement
function containsPathTraversal(path) {
  return /(?:^|[\\/])\.\.(?:[\\/]|$)/.test(path);
}
//@ chunk-648vry02.js:4361-4463 placement
function tildify(e) {
  let r = homedir();
  if (e === r) return "~";
  if (e.startsWith(r + sep)) return "~" + e.slice(r.length);
  return e;
}
//@ chunk-648vry02.js:4463-4547 placement
function normalizePathForConfigKey(e) {
  let r = normalize(e);
  if (getPlatform() === "windows") return r.replaceAll("\\", "/");
  return r;
}
//@ chunk-648vry02.js:4547-4599 placement
function isNotebookPath(e) {
  return extname(e).toLowerCase() === ".ipynb";
}
//@ chunk-648vry02.js:4599-4837 placement
function anchorPathUnnormalized(e, r = "linux") {
  if ((r === "win32" ? win32.isAbsolute : posix.isAbsolute)(e)) return e;
  if (e === "~" || e.startsWith("~/") || (r === "win32" && e.startsWith("~\\")))
    return getUnameSR(homedir(), e.slice(2), r);
  if (r === "win32" && /^[a-zA-Z]:/.test(e)) return e;
  return getUnameSR(getCwd(), e, r);
}
//@ chunk-648vry02.js:4837-4967 placement = getUnameSR (0.793)
function getUnameSR(e, r, n) {
  if (r === "") return e;
  if (n === "win32" ? /[\\/]$/.test(e) : e.endsWith("/")) return e + r;
  return e + (n === "win32" ? "\\" : "/") + r;
}
//@ chunk-0wdgqhcf.js:45183-45290 placement
function toDarwinPrivatePath(e, t = "linux") {
  if (t !== "darwin") return e;
  return /^\/(tmp|var|etc)(\/|$)/.test(e) ? `/private${e}` : e;
}
//@ chunk-0wdgqhcf.js:45290-45344 placement = chordToDisplayString (1)
function isDifferentPath(e, t, n = "linux") {
  return t !== e && t !== toDarwinPrivatePath(e, n);
}
/**
 * 列出给定路径的各级父目录（由近到远逆序后输出、跨路径去重），wipStash 用它找各级 .gitattributes。
 */
//@ chunk-s61vbvea.js:476278-476488 placement = SPINNER_FRAMES (0.711)
function listAncestorDirs(e) {
  let n = new Set();
  return e.flatMap((r) => {
    let s = [];
    for (
      let index = r.lastIndexOf("/");
      index !== -1;
      index = index === 0 ? -1 : r.lastIndexOf("/", index - 1)
    ) {
      let sliced = r.slice(0, index);
      if (n.has(sliced)) break;
      (n.add(sliced), s.push(sliced));
    }
    return s.reverse();
  });
}

export {
  expandPathOrNull,
  tildify,
  expandPath,
  isNotebookPath,
  normalizePathForConfigKey,
  isDifferentPath,
  windowsPathToPosixPath,
  B8,
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
  toRelativePath,
  assertPathHasNoNullBytes,
  listAncestorDirs,
};
