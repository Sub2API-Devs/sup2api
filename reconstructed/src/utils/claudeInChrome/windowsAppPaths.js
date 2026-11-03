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
var w = "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths",
  f = 1e4,
  A = 5000;
//@ chunk-c1gz91xp.js:561-710 placement
function windowsAppsDir() {
  if (!env.LOCALAPPDATA) return;
  let replaced = env.LOCALAPPDATA.replace(/[\\/]+$/, "");
  return win32.normalize(`${replaced}\\Microsoft\\WindowsApps\\`).toLowerCase();
}
//@ chunk-c1gz91xp.js:710-773 placement
function x2() {
  return env.SYSTEMROOT || env.SystemRoot || "C:\\Windows";
}
//@ chunk-c1gz91xp.js:773-992 placement
function parseRegDefaultValue(e) {
  for (let s of e.split(/\r?\n/)) {
    let match = s.match(/^\s+.+?\s+REG_(?:EXPAND_)?SZ\s+(.+)$/i);
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
function expandWindowsEnvVars(e, s = process.env) {
  let o = new Map();
  for (let [r, n] of Object.entries(s)) if (n !== void 0) o.set(r.toLowerCase(), n);
  return e.replace(/%([^%]+)%/g, (r, n) => o.get(n.toLowerCase()) ?? r);
}
/**
 * 通过 reg.exe 查询 HKCU/HKLM 的 App Paths 注册表项解析可执行文件路径：展开 %VAR%，要求完整路径且在时限内确认存在、不是目录（WindowsApps 下 stat 异常也接受）。
 */
//@ chunk-c1gz91xp.js:1170-2474 placement
async function resolveAppPathFromRegistry(exeName, statTimeoutMs = A) {
  let o = x2(),
    r = `${o}\\System32\\reg.exe`;
  for (let n of ["HKCU", "HKLM"]) {
    let u = await execFileNoThrowWithCwd(r, ["query", `${n}\\${w}\\${exeName}`, "/ve"], {
      timeout: f,
      cwd: o,
    });
    if (u.code !== 0) {
      if (u.exitCode === void 0)
        logForDebugging(
          `[Claude in Chrome] ${n} App Paths query for ${exeName} did not run to completion: ${u.error ?? `killed at the ${f}ms bound, or reg.exe failed to spawn`}`,
        );
      continue;
    }
    let p = parseRegDefaultValue(u.stdout);
    if (!p) {
      logForDebugging(
        `[Claude in Chrome] ${n} App Paths value for ${exeName} had no parseable string default; skipping`,
      );
      continue;
    }
    let c = expandWindowsEnvVars(p);
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
      if (a === void 0) {
        logForDebugging(
          `[Claude in Chrome] Skipping ${n} App Paths candidate for ${exeName}: existence check exceeded ${statTimeoutMs}ms`,
        );
        continue;
      }
      if (!a.isDirectory())
        return (logForDebugging(`[Claude in Chrome] Resolved ${exeName} via ${n} App Paths`), c);
      logForDebugging(
        `[Claude in Chrome] Skipping ${n} App Paths candidate for ${exeName}: resolves to a directory`,
      );
    } catch (error) {
      let a = getErrnoCode(error),
        l = windowsAppsDir();
      if (l !== void 0 && win32.normalize(c).toLowerCase().startsWith(l) && a !== "ENOENT" && a !== "ENOTDIR")
        return (
          logForDebugging(
            `[Claude in Chrome] Resolved ${exeName} via ${n} App Paths (stat-odd: ${a ?? String(error)})`,
          ),
          c
        );
      logForDebugging(
        `[Claude in Chrome] Skipping ${n} App Paths candidate for ${exeName}: ${a ?? String(error)}`,
      );
    }
  }
  return null;
}
/**
 * 以分离方式启动 Windows 程序（工作目录为程序所在目录、不隐藏窗口、不等待）；spawn 成功返回 true，失败记录错误码并返回 false。
 */
//@ chunk-c1gz91xp.js:2474-2860 placement
function launchDetached(e, s) {
  return new Promise((o) => {
    let r;
    try {
      r = spawn(e, s, { cwd: dirname(e), detached: !0, stdio: "ignore", windowsHide: !1 });
    } catch (error) {
      (logForDebugging(
        `[Claude in Chrome] Detached launch of ${e} failed: ${getErrnoCode(error) ?? String(error)}`,
        { level: "error" },
      ),
        o(!1));
      return;
    }
    (r.once("spawn", () => o(!0)),
      r.once("error", (n) => {
        (logForDebugging(
          `[Claude in Chrome] Detached launch of ${e} failed: ${getErrnoCode(n) ?? n.message}`,
          { level: "error" },
        ),
          o(!1));
      }),
      r.unref());
  });
}

export { x2, resolveAppPathFromRegistry, launchDetached };
