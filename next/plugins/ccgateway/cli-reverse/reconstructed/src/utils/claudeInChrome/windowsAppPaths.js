/**
 * utils/claudeInChrome/windowsAppPaths.ts
 *
 * 2.1.316 新增：Windows 上浏览器安装路径。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-ztzyr5gs.js (7)
 * attribution: placement 7
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { win32, dirname } from "path";
import { lstat } from "fs/promises";
import { spawn } from "child_process";
import { env } from "../env.js";
import { execFileNoThrowWithCwd } from "../execFileNoThrow.js";
import { logForDebugging } from "../debug.js";
import { withDeadline } from "../sleep.js";
import { getErrnoCode } from "../errors.js";

//@ chunk-ztzyr5gs.js:484-561 placement
/**
 * Windows 注册表里 App Paths 的键路径。
 */
var WINDOWS_APP_PATHS_KEY = "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths";
var REG_QUERY_TIMEOUT_MS = 1e4;
var APP_PATH_STAT_TIMEOUT_MS = 5000;
//@ chunk-ztzyr5gs.js:561-710 placement
function windowsAppsDir() {
  if (!env.LOCALAPPDATA) return;
  let replaced = env.LOCALAPPDATA.replace(/[\\/]+$/, "");
  return win32.normalize(`${replaced}\\Microsoft\\WindowsApps\\`).toLowerCase();
}
//@ chunk-ztzyr5gs.js:710-773 placement
/**
 * 返回 Windows 系统根目录（SYSTEMROOT 等）。
 */
function systemRootDir() {
  return env.SYSTEMROOT || env.SystemRoot || "C:\\Windows";
}
//@ chunk-ztzyr5gs.js:773-992 placement
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
//@ chunk-ztzyr5gs.js:992-1170 placement
function expandWindowsEnvVars(regDefaultValue, env = process.env) {
  let envByLowerKey = new Map();
  for (let [key, value] of Object.entries(env))
    if (value !== undefined) envByLowerKey.set(key.toLowerCase(), value);
  return regDefaultValue.replace(
    /%([^%]+)%/g,
    (fallbackValue, varName) => envByLowerKey.get(varName.toLowerCase()) ?? fallbackValue,
  );
}
//@ chunk-ztzyr5gs.js:1170-2474 placement
/**
 * 通过 reg.exe 查询 HKCU/HKLM 的 App Paths 注册表项解析可执行文件路径：展开 %VAR%，要求完整路径且在时限内确认存在、不是目录（WindowsApps 下 stat 异常也接受）。
 */
async function resolveAppPathFromRegistry(exeName, statTimeoutMs = APP_PATH_STAT_TIMEOUT_MS) {
  let systemRoot = systemRootDir();
  let regExePath = `${systemRoot}\\System32\\reg.exe`;
  for (let hive of ["HKCU", "HKLM"]) {
    let queryResult = await execFileNoThrowWithCwd(
      regExePath,
      ["query", `${hive}\\${WINDOWS_APP_PATHS_KEY}\\${exeName}`, "/ve"],
      {
        timeout: REG_QUERY_TIMEOUT_MS,
        cwd: systemRoot,
      },
    );
    if (queryResult.code !== 0) {
      if (queryResult.exitCode === undefined)
        logForDebugging(
          `[Claude in Chrome] ${hive} App Paths query for ${exeName} did not run to completion: ${queryResult.error ?? `killed at the ${REG_QUERY_TIMEOUT_MS}ms bound, or reg.exe failed to spawn`}`,
        );
      continue;
    }
    let regDefaultValue = parseRegDefaultValue(queryResult.stdout);
    if (!regDefaultValue) {
      logForDebugging(
        `[Claude in Chrome] ${hive} App Paths value for ${exeName} had no parseable string default; skipping`,
      );
      continue;
    }
    let expandedPath = expandWindowsEnvVars(regDefaultValue);
    if (!/^(?:[a-zA-Z]:[\\/]|\\\\)/.test(expandedPath)) {
      logForDebugging(
        `[Claude in Chrome] Skipping ${hive} App Paths candidate for ${exeName}: not a fully qualified path`,
      );
      continue;
    }
    try {
      let statPromise = lstat(expandedPath);
      statPromise.catch(() => {});
      let stats = await withDeadline(statPromise, statTimeoutMs);
      if (stats === undefined) {
        logForDebugging(
          `[Claude in Chrome] Skipping ${hive} App Paths candidate for ${exeName}: existence check exceeded ${statTimeoutMs}ms`,
        );
        continue;
      }
      if (!stats.isDirectory()) {
        logForDebugging(`[Claude in Chrome] Resolved ${exeName} via ${hive} App Paths`);
        return expandedPath;
      }
      logForDebugging(
        `[Claude in Chrome] Skipping ${hive} App Paths candidate for ${exeName}: resolves to a directory`,
      );
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      let windowsAppsDirPath = windowsAppsDir();
      if (
        windowsAppsDirPath !== undefined &&
        win32.normalize(expandedPath).toLowerCase().startsWith(windowsAppsDirPath) &&
        errnoCode !== "ENOENT" &&
        errnoCode !== "ENOTDIR"
      ) {
        logForDebugging(
          `[Claude in Chrome] Resolved ${exeName} via ${hive} App Paths (stat-odd: ${errnoCode ?? String(error)})`,
        );
        return expandedPath;
      }
      logForDebugging(
        `[Claude in Chrome] Skipping ${hive} App Paths candidate for ${exeName}: ${errnoCode ?? String(error)}`,
      );
    }
  }
  return null;
}
//@ chunk-ztzyr5gs.js:2474-2860 placement
/**
 * 以分离方式启动 Windows 程序（工作目录为程序所在目录、不隐藏窗口、不等待）；spawn 成功返回 true，失败记录错误码并返回 false。
 */
function launchDetached(exePath, args) {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(exePath, args, {
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
    child.once("spawn", () => resolve(true));
    child.once("error", (error) => {
      logForDebugging(
        `[Claude in Chrome] Detached launch of ${exePath} failed: ${getErrnoCode(error) ?? error.message}`,
        {
          level: "error",
        },
      );
      resolve(false);
    });
    child.unref();
  });
}
export { systemRootDir, resolveAppPathFromRegistry, launchDetached };
