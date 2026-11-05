/**
 * utils/findExecutableWindows.ts
 *
 * 2.1.316 新增。在 Windows 上查找可执行文件（where.exe，限定扩展名，排除当前目录）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-tbtcw3yn.js (9)
 * attribution: placement 9
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { lstatSync } from "fs";
import { join } from "path";
import { execFileSync } from "child_process";
import { HostScoped } from "./hostScoped.js";
import { getRootSession } from "../bootstrap/state.js";
import { getTrimmedEnvValue } from "./envUtils.js";
import { classifyProtectedDir } from "./permissions/protectedDirs.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-tbtcw3yn.js:439-461 placement
function alwaysFalse() {
  return false;
}
//@ chunk-tbtcw3yn.js:461-596 placement
class ExecutableResolutionCache {
  resolved = new Map();
  lookup(command) {
    return this.resolved.get(command);
  }
  remember(command, resolvedPath) {
    this.resolved.set(command, resolvedPath);
  }
  forget(command) {
    this.resolved.delete(command);
  }
}
//@ chunk-tbtcw3yn.js:596-626 placement
var executableResolutionCache; // deferred: uses ExecutableResolutionCache of its import cycle while loading; runs once the cycle is complete
var RESOLVE_TIMEOUT_MS;
deferInit("chunk-tbtcw3yn.js:596", () => {
  executableResolutionCache = new HostScoped(() => new ExecutableResolutionCache());
  RESOLVE_TIMEOUT_MS = 5000;
});
//@ chunk-tbtcw3yn.js:626-701 placement
function isPathMissing(filePath) {
  try {
    return (
      lstatSync(filePath, {
        throwIfNoEntry: false,
      }) === undefined
    );
  } catch {
    return false;
  }
}
//@ chunk-tbtcw3yn.js:701-746 placement
var WINDOWS_EXECUTABLE_EXTS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-tbtcw3yn.js:701", () => {
  WINDOWS_EXECUTABLE_EXTS = new Set([".com", ".exe", ".bat", ".cmd"]);
});
//@ chunk-tbtcw3yn.js:746-876 placement
function hasWindowsExecutableExt(candidatePath) {
  let replaced = candidatePath
    .toLowerCase()
    .replace(/.*[\\/]/, "")
    .replace(/[. ]+$/, "");
  let index = replaced.lastIndexOf(".");
  return index > 0 && WINDOWS_EXECUTABLE_EXTS.has(replaced.slice(index));
}
//@ chunk-tbtcw3yn.js:876-1441 placement (2.1.88 match: findExecutable, 0.461)
/**
 * 在 PATH 中查找可执行文件（Windows 处理 PATHEXT 扩展名），结果缓存。
 */
function findExecutableWindows(command, forceRefresh = false) {
  let cache = executableResolutionCache.of(getRootSession().host);
  let cachedPath = cache.lookup(command);
  if (cachedPath !== undefined)
    if (cachedPath !== null) {
      if (!isPathMissing(cachedPath)) return cachedPath;
      cache.forget(command);
    } else {
      if (!forceRefresh) return cachedPath;
      cache.forget(command);
    }
  let systemRoot = getTrimmedEnvValue("SYSTEMROOT") || "C:\\Windows";
  let whereExePath = join(systemRoot, "System32", "where.exe");
  try {
    let paths = execFileSync(whereExePath, [command], {
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
    let skippedProtectedPath = false;
    for (let candidatePath of paths) {
      if (isPathMissing(candidatePath)) continue;
      if (classifyProtectedDir(candidatePath, cwd)) {
        skippedProtectedPath = true;
        continue;
      }
      if (!hasWindowsExecutableExt(candidatePath)) continue;
      cache.remember(command, candidatePath);
      return candidatePath;
    }
    if (paths.length > 0 && !skippedProtectedPath) cache.remember(command, null);
    return null;
  } catch (error) {
    if (isNotFoundExitError(error)) cache.remember(command, null);
    return null;
  }
}
//@ chunk-tbtcw3yn.js:1441-1611 placement
function isNotFoundExitError(error) {
  if (error === null || typeof error !== "object") return false;
  let status = "status" in error ? error.status : undefined;
  let signal = "signal" in error ? error.signal : undefined;
  let code = "code" in error ? error.code : undefined;
  return status === 1 && !signal && !code;
}
//@ chunk-tbtcw3yn.js:1611-1710 placement
function resolveExecutableSafely(command, forceRefresh = false) {
  if (!alwaysFalse()) return command;
  if (command.includes("/") || command.includes("\\")) return command;
  return findExecutableWindows(command, forceRefresh);
}
export { findExecutableWindows, resolveExecutableSafely };
