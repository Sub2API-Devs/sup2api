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
function E() {
  return !1;
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
var w = new HostScoped(() => new ExecutableResolutionCache()),
  h = 5000;
//@ chunk-hvmek2df.js:626-701 placement
function isPathMissing(e) {
  try {
    return lstatSync(e, { throwIfNoEntry: !1 }) === void 0;
  } catch {
    return !1;
  }
}
//@ chunk-hvmek2df.js:701-746 placement
var WINDOWS_EXECUTABLE_EXTS = new Set([".com", ".exe", ".bat", ".cmd"]);
//@ chunk-hvmek2df.js:746-876 placement
function hasWindowsExecutableExt(e) {
  let replaced = e
      .toLowerCase()
      .replace(/.*[\\/]/, "")
      .replace(/[. ]+$/, ""),
    index = replaced.lastIndexOf(".");
  return index > 0 && WINDOWS_EXECUTABLE_EXTS.has(replaced.slice(index));
}
/**
 * 在 PATH 中查找可执行文件（Windows 处理 PATHEXT 扩展名），结果缓存。
 */
//@ chunk-hvmek2df.js:876-1441 placement = findExecutable (0.461)
function findExecutableWindows(e, t = !1) {
  let of = w.of(getRootSession().host),
    lookup = of.lookup(e);
  if (lookup !== void 0)
    if (lookup !== null) {
      if (!isPathMissing(lookup)) return lookup;
      of.forget(e);
    } else {
      if (!t) return lookup;
      of.forget(e);
    }
  let c = getTrimmedEnvValue("SYSTEMROOT") || "C:\\Windows",
    d = join(c, "System32", "where.exe");
  try {
    let paths = execFileSync(d, [e], {
        stdio: "pipe",
        encoding: "utf8",
        timeout: h,
        windowsHide: !0,
        env: process.env,
      })
        .trim()
        .split(/\r?\n/)
        .filter(Boolean),
      cwd = process.cwd(),
      l = !1;
    for (let candidatePath of paths) {
      if (isPathMissing(candidatePath)) continue;
      if (classifyProtectedDir(candidatePath, cwd)) {
        l = !0;
        continue;
      }
      if (!hasWindowsExecutableExt(candidatePath)) continue;
      return (of.remember(e, candidatePath), candidatePath);
    }
    if (paths.length > 0 && !l) of.remember(e, null);
    return null;
  } catch (error) {
    if (isNotFoundExitError(error)) of.remember(e, null);
    return null;
  }
}
//@ chunk-hvmek2df.js:1441-1611 placement
function isNotFoundExitError(e) {
  if (e === null || typeof e !== "object") return !1;
  let t = "status" in e ? e.status : void 0,
    n = "signal" in e ? e.signal : void 0,
    o = "code" in e ? e.code : void 0;
  return t === 1 && !n && !o;
}
//@ chunk-hvmek2df.js:1611-1710 placement
function resolveExecutableSafely(e, t = !1) {
  if (!E()) return e;
  if (e.includes("/") || e.includes("\\")) return e;
  return findExecutableWindows(e, t);
}

export { resolveExecutableSafely, findExecutableWindows };
