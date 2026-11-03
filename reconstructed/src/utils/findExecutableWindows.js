/**
 * utils/findExecutableWindows.ts
 *
 * 2.1.316 新增。在 Windows 上查找可执行文件（where.exe，限定扩展名，排除当前目录）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hvmek2df.js (9)
 * attribution: placement 9
 */
import { lstatSync } from "fs";
import { join } from "path";
import { execFileSync } from "child_process";
import { HostScoped } from "./hostScoped.js";
import { getRootSession } from "../bootstrap/state.js";
import { getTrimmedEnvValue } from "./envUtils.js";
import { classifyProtectedDir } from "./permissions/protectedDirs.js";

//@ chunk-hvmek2df.js:439-461 placement
function alwaysFalse() {
  return false;
}
//@ chunk-hvmek2df.js:461-596 placement
class ExecutableResolutionCache {
  resolved = new Map();
  lookup(e) {
    return this.resolved.get(e);
  }
  remember(e, t) {
    this.resolved.set(e, t);
  }
  forget(e) {
    this.resolved.delete(e);
  }
}
//@ chunk-hvmek2df.js:596-626 placement
var executableResolutionCache = new HostScoped(() => new ExecutableResolutionCache());
var RESOLVE_TIMEOUT_MS = 5000;
//@ chunk-hvmek2df.js:626-701 placement
function isPathMissing(e) {
  try {
    return (
      lstatSync(e, {
        throwIfNoEntry: false,
      }) === undefined
    );
  } catch {
    return false;
  }
}
//@ chunk-hvmek2df.js:701-746 placement
var WINDOWS_EXECUTABLE_EXTS = new Set([".com", ".exe", ".bat", ".cmd"]);
//@ chunk-hvmek2df.js:746-876 placement
function hasWindowsExecutableExt(candidatePath) {
  let replaced = candidatePath
    .toLowerCase()
    .replace(/.*[\\/]/, "")
    .replace(/[. ]+$/, "");
  let index = replaced.lastIndexOf(".");
  return index > 0 && WINDOWS_EXECUTABLE_EXTS.has(replaced.slice(index));
}
//@ chunk-hvmek2df.js:876-1441 placement = findExecutable (0.461)
/**
 * 在 PATH 中查找可执行文件（Windows 处理 PATHEXT 扩展名），结果缓存。
 */
function findExecutableWindows(e, t = false) {
  let n = executableResolutionCache.of(getRootSession().host);
  let o = n.lookup(e);
  if (o !== undefined)
    if (o !== null) {
      if (!isPathMissing(o)) return o;
      n.forget(e);
    } else {
      if (!t) return o;
      n.forget(e);
    }
  let c = getTrimmedEnvValue("SYSTEMROOT") || "C:\\Windows";
  let d = join(c, "System32", "where.exe");
  try {
    let paths = execFileSync(d, [e], {
      stdio: "pipe",
      encoding: "utf8",
      timeout: RESOLVE_TIMEOUT_MS,
      windowsHide: true,
      env: process.env,
    })
      .trim()
      .split(/\r?\n/)
      .filter(Boolean);
    let cwd = process.cwd();
    let l = false;
    for (let candidatePath of paths) {
      if (isPathMissing(candidatePath)) continue;
      if (classifyProtectedDir(candidatePath, cwd)) {
        l = true;
        continue;
      }
      if (!hasWindowsExecutableExt(candidatePath)) continue;
      n.remember(e, candidatePath);
      return candidatePath;
    }
    if (paths.length > 0 && !l) n.remember(e, null);
    return null;
  } catch (error) {
    if (isNotFoundExitError(error)) n.remember(e, null);
    return null;
  }
}
//@ chunk-hvmek2df.js:1441-1611 placement
function isNotFoundExitError(error) {
  if (error === null || typeof error !== "object") return false;
  let status = "status" in error ? error.status : undefined;
  let signal = "signal" in error ? error.signal : undefined;
  let code = "code" in error ? error.code : undefined;
  return status === 1 && !signal && !code;
}
//@ chunk-hvmek2df.js:1611-1710 placement
function resolveExecutableSafely(e, t = false) {
  if (!alwaysFalse()) return e;
  if (e.includes("/") || e.includes("\\")) return e;
  return findExecutableWindows(e, t);
}
export { resolveExecutableSafely, findExecutableWindows };
