/**
 * utils/claudeInChrome/windowsAppPaths.ts
 *
 * 2.1.316 新增：Windows 上浏览器安装路径。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-c1gz91xp.js (7)
 * attribution: placement 7
 */
import { win32, dirname } from "path";
import { lstat } from "fs/promises";
import { spawn } from "child_process";
import { env } from "../env.js";
import { execFileNoThrowWithCwd } from "../execFileNoThrow.js";
import { logForDebugging } from "../debug.js";
import { withDeadline } from "../sleep.js";
import { getErrnoCode } from "../errors.js";

//@ chunk-c1gz91xp.js:484-561 placement
/**
 * Windows 注册表里 App Paths 的键路径。
 */
var WINDOWS_APP_PATHS_KEY = "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths";
var REG_QUERY_TIMEOUT_MS = 1e4;
var APP_PATH_STAT_TIMEOUT_MS = 5000;
//@ chunk-c1gz91xp.js:561-710 placement
function windowsAppsDir() {
  if (!env.LOCALAPPDATA) return;
  let replaced = env.LOCALAPPDATA.replace(/[\\/]+$/, "");
  return win32.normalize(`${replaced}\\Microsoft\\WindowsApps\\`).toLowerCase();
}
//@ chunk-c1gz91xp.js:710-773 placement
/**
 * 返回 Windows 系统根目录（SYSTEMROOT 等）。
 */
function systemRootDir() {
  return env.SYSTEMROOT || env.SystemRoot || "C:\\Windows";
}
//@ chunk-c1gz91xp.js:773-992 placement
function parseRegDefaultValue(stdout) {
  for (let line of stdout.split(/\r?\n/)) {
    let match = line.match(/^\s+.+?\s+REG_(?:EXPAND_)?SZ\s+(.+)$/i);
    if (match && match[1]) {
      let trimmed = match[1].trim();
      if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"'))
        trimmed = trimmed.slice(1, -1);
      return trimmed;
    }
  }
  return null;
}
//@ chunk-c1gz91xp.js:992-1170 placement
function expandWindowsEnvVars(regDefaultValue, s = process.env) {
  let o = new Map();
  for (let [key, value] of Object.entries(s)) if (value !== undefined) o.set(key.toLowerCase(), value);
  return regDefaultValue.replace(/%([^%]+)%/g, (r, n) => o.get(n.toLowerCase()) ?? r);
}
//@ chunk-c1gz91xp.js:1170-2474 placement
/**
 * 通过 reg.exe 查询 HKCU/HKLM 的 App Paths 注册表项解析可执行文件路径：展开 %VAR%，要求完整路径且在时限内确认存在、不是目录（WindowsApps 下 stat 异常也接受）。
 */
async function resolveAppPathFromRegistry(exeName, statTimeoutMs = APP_PATH_STAT_TIMEOUT_MS) {
  let o = systemRootDir();
  let r = `${o}\\System32\\reg.exe`;
  for (let n of ["HKCU", "HKLM"]) {
    let u = await execFileNoThrowWithCwd(r, ["query", `${n}\\${WINDOWS_APP_PATHS_KEY}\\${exeName}`, "/ve"], {
      timeout: REG_QUERY_TIMEOUT_MS,
      cwd: o,
    });
    if (u.code !== 0) {
      if (u.exitCode === undefined)
        logForDebugging(
          `[Claude in Chrome] ${n} App Paths query for ${exeName} did not run to completion: ${u.error ?? `killed at the ${REG_QUERY_TIMEOUT_MS}ms bound, or reg.exe failed to spawn`}`,
        );
      continue;
    }
    let regDefaultValue = parseRegDefaultValue(u.stdout);
    if (!regDefaultValue) {
      logForDebugging(
        `[Claude in Chrome] ${n} App Paths value for ${exeName} had no parseable string default; skipping`,
      );
      continue;
    }
    let c = expandWindowsEnvVars(regDefaultValue);
    if (!/^(?:[a-zA-Z]:[\\/]|\\\\)/.test(c)) {
      logForDebugging(
        `[Claude in Chrome] Skipping ${n} App Paths candidate for ${exeName}: not a fully qualified path`,
      );
      continue;
    }
    try {
      let d = lstat(c);
      d.catch(() => {});
      let a = await withDeadline(d, statTimeoutMs);
      if (a === undefined) {
        logForDebugging(
          `[Claude in Chrome] Skipping ${n} App Paths candidate for ${exeName}: existence check exceeded ${statTimeoutMs}ms`,
        );
        continue;
      }
      if (!a.isDirectory()) {
        logForDebugging(`[Claude in Chrome] Resolved ${exeName} via ${n} App Paths`);
        return c;
      }
      logForDebugging(
        `[Claude in Chrome] Skipping ${n} App Paths candidate for ${exeName}: resolves to a directory`,
      );
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      let l = windowsAppsDir();
      if (
        l !== undefined &&
        win32.normalize(c).toLowerCase().startsWith(l) &&
        errnoCode !== "ENOENT" &&
        errnoCode !== "ENOTDIR"
      ) {
        logForDebugging(
          `[Claude in Chrome] Resolved ${exeName} via ${n} App Paths (stat-odd: ${errnoCode ?? String(error)})`,
        );
        return c;
      }
      logForDebugging(
        `[Claude in Chrome] Skipping ${n} App Paths candidate for ${exeName}: ${errnoCode ?? String(error)}`,
      );
    }
  }
  return null;
}
//@ chunk-c1gz91xp.js:2474-2860 placement
/**
 * 以分离方式启动 Windows 程序（工作目录为程序所在目录、不隐藏窗口、不等待）；spawn 成功返回 true，失败记录错误码并返回 false。
 */
function launchDetached(exePath, s) {
  return new Promise((resolve) => {
    let r;
    try {
      r = spawn(exePath, s, {
        cwd: dirname(exePath),
        detached: true,
        stdio: "ignore",
        windowsHide: false,
      });
    } catch (error) {
      logForDebugging(
        `[Claude in Chrome] Detached launch of ${exePath} failed: ${getErrnoCode(error) ?? String(error)}`,
        {
          level: "error",
        },
      );
      resolve(false);
      return;
    }
    r.once("spawn", () => resolve(true));
    r.once("error", (n) => {
      logForDebugging(
        `[Claude in Chrome] Detached launch of ${exePath} failed: ${getErrnoCode(n) ?? n.message}`,
        {
          level: "error",
        },
      );
      resolve(false);
    });
    r.unref();
  });
}
export { systemRootDir, resolveAppPathFromRegistry, launchDetached };
