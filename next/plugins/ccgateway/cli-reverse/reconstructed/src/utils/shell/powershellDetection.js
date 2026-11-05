/**
 * utils/shell/powershellDetection.ts
 *
 * 查找 pwsh/powershell 可执行文件（含 snap 与 Windows 常见位置）并缓存，判断 core/desktop 版本。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/shell/powershellDetection.ts
 * pieces: chunk-2214fejy.js (11), chunk-5fn9rb8r.js (1)
 * attribution: file-local 1, layout 8, fingerprint 2, placement 1
 */
import { stat, readlink, realpath } from "fs/promises";
import { join } from "path";
import { isDiskless } from "../../bootstrap/state.js";
import { getPlatform } from "../platform.js";
import { logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { whichAsync, bunWhichOnPath } from "../which.js";
import { env } from "../env.js";
import { shellPaths } from "./shellPaths.js";

//@ chunk-5fn9rb8r.js:21439-21727 placement
var POWERSHELL_NONINTERACTIVE_ARGS = ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass"];
var WINDOWS_ROOT_DIR = "C:\\Windows";
var PROGRAM_FILES_DIR = "C:\\Program Files";
var SYSTEM32_DIR = `${WINDOWS_ROOT_DIR}\\System32`;
var WINDOWS_POWERSHELL_DIR = `${SYSTEM32_DIR}\\WindowsPowerShell\\v1.0`;
var CMD_EXE_PATH = `${SYSTEM32_DIR}\\cmd.exe`;
var POWERSHELL_EXE_CANDIDATES = [
  `${PROGRAM_FILES_DIR}\\PowerShell\\7\\pwsh.exe`,
  `${PROGRAM_FILES_DIR}\\PowerShell\\7-preview\\pwsh.exe`,
  `${WINDOWS_POWERSHELL_DIR}\\powershell.exe`,
];
//@ chunk-2214fejy.js:1340-1419 file-local
async function probePath(p) {
  try {
    return (await stat(p)).isFile() ? p : null;
  } catch {
    return null;
  }
}
//@ chunk-2214fejy.js:1419-1494 layout
/**
 * readlink 后再检查目标是否为文件（Windows 应用执行别名 pwsh.exe）。
 */
async function probeAppExecLink(linkPath) {
  let targetPath;
  try {
    targetPath = await readlink(linkPath);
  } catch {
    return null;
  }
  return probePath(targetPath);
}
//@ chunk-2214fejy.js:1494-2558 fingerprint (2.1.88 match: findPowerShell, 0.39)
/**
 * 查找 PowerShell：diskless 返回 null；先 pwsh（Linux snap 版换成 /opt/microsoft 或 /usr/bin 下的直装版），Windows 再查 Program Files、WindowsApps、.dotnet/tools，最后回退 powershell 5（含 System32 固定路径）。
 */
async function findPowerShell(envPaths) {
  if (isDiskless()) return null;
  let pwshPath = await findExecutableOnPath("pwsh", envPaths);
  if (pwshPath) {
    if (getPlatform() === "linux") {
      let resolved = await realpath(pwshPath).catch(() => pwshPath);
      if (pwshPath.startsWith("/snap/") || resolved.startsWith("/snap/")) {
        let direct =
          (await probePath("/opt/microsoft/powershell/7/pwsh")) ?? (await probePath("/usr/bin/pwsh"));
        if (direct) {
          let directResolved = await realpath(direct).catch(() => direct);
          if (!direct.startsWith("/snap/") && !directResolved.startsWith("/snap/")) {
            logFeatureSad("shell_powershell_detect", "snap_workaround");
            return direct;
          }
        }
      }
    }
    logFeatureOk("shell_powershell_detect");
    return pwshPath;
  }
  if (getPlatform() === "windows") {
    let { programFiles, localAppData, userProfile } = envPaths ?? getWindowsEnvPaths();
    let fallbackPath =
      (programFiles ? await probePath(join(programFiles, "PowerShell", "7", "pwsh.exe")) : null) ??
      (localAppData
        ? await probeAppExecLink(join(localAppData, "Microsoft", "WindowsApps", "pwsh.exe"))
        : null) ??
      (userProfile ? await probePath(join(userProfile, ".dotnet", "tools", "pwsh.exe")) : null);
    if (fallbackPath) {
      logFeatureSad("shell_powershell_detect", "windows_fallback_path");
      return fallbackPath;
    }
  }
  let executableOnPath = await findExecutableOnPath("powershell", envPaths);
  if (executableOnPath) {
    logFeatureSad("shell_powershell_detect", "fell_back_to_powershell_5");
    return executableOnPath;
  }
  if (getPlatform() === "windows") {
    let systemRoot = (envPaths ?? getWindowsEnvPaths()).systemRoot ?? "C:\\Windows";
    let windowsPowerShellPath = await probePath(
      join(systemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe"),
    );
    if (windowsPowerShellPath) {
      logFeatureSad("shell_powershell_detect", "fell_back_to_powershell_5");
      return windowsPowerShellPath;
    }
  }
  return null;
}
//@ chunk-2214fejy.js:2558-2623 layout
async function findExecutableOnPath(name, envPaths) {
  return envPaths === undefined ? whichAsync(name) : bunWhichOnPath(name, envPaths.path ?? "");
}
//@ chunk-2214fejy.js:2623-2764 layout
/**
 * 读取探测 PowerShell 所需的 Windows 环境变量：PATH、ProgramFiles、LOCALAPPDATA、USERPROFILE、SYSTEMROOT。
 */
function getWindowsEnvPaths() {
  return {
    path: env.PATH,
    programFiles: env.ProgramFiles,
    localAppData: env.LOCALAPPDATA,
    userProfile: env.USERPROFILE,
    systemRoot: env.SYSTEMROOT,
  };
}
//@ chunk-2214fejy.js:2764-2903 layout
/**
 * 按给定环境变量集合查找 PowerShell 并缓存到宿主状态 organizationsPowerShellPath。
 */
function findPowerShellForEnv(envPaths) {
  if (isDiskless()) return Promise.resolve(null);
  let hostState = shellPaths();
  hostState.organizationsPowerShellPath ??= findPowerShell(envPaths);
  return hostState.organizationsPowerShellPath;
}
//@ chunk-2214fejy.js:2903-3146 layout
/**
 * 缓存的 PowerShell 路径 Promise（宿主状态 powerShellPath），完成后写 resolvedPowerShellPath。
 */
function getCachedPowerShellPath() {
  if (isDiskless()) return Promise.resolve(null);
  let hostState = shellPaths();
  if (!hostState.powerShellPath) {
    hostState.resolvedPowerShellPath = undefined;
    let pending = findPowerShell().then((powerShell) => {
      if (hostState.powerShellPath === pending) hostState.resolvedPowerShellPath = powerShell;
      return powerShell;
    });
    hostState.powerShellPath = pending;
  }
  return hostState.powerShellPath;
}
//@ chunk-2214fejy.js:3146-3197 layout
function getResolvedPowerShellPath() {
  return shellPaths().resolvedPowerShellPath;
}
//@ chunk-2214fejy.js:3197-3255 layout
async function getPowerShellEditionAsync() {
  let path = await getCachedPowerShellPath();
  return path ? powerShellEditionFromPath(path) : null;
}
//@ chunk-2214fejy.js:3255-3317 layout
/**
 * 返回已解析 PowerShell 的版本类别（按路径区分 pwsh 与 Windows PowerShell）；未解析成路径时原样返回状态值。
 */
function getResolvedPowerShellEdition() {
  let path = getResolvedPowerShellPath();
  return typeof path === "string" ? powerShellEditionFromPath(path) : path;
}
//@ chunk-2214fejy.js:3317-3423 fingerprint (2.1.88 match: getPowerShellEdition, 1)
function powerShellEditionFromPath(path) {
  return path
    .split(/[/\\]/)
    .pop()
    .toLowerCase()
    .replace(/\.exe$/, "") === "pwsh"
    ? "core"
    : "desktop";
}
export {
  getCachedPowerShellPath,
  POWERSHELL_EXE_CANDIDATES,
  PROGRAM_FILES_DIR,
  WINDOWS_POWERSHELL_DIR,
  SYSTEM32_DIR,
  WINDOWS_ROOT_DIR,
  CMD_EXE_PATH,
  POWERSHELL_NONINTERACTIVE_ARGS,
  findPowerShellForEnv,
  getWindowsEnvPaths,
  getPowerShellEditionAsync,
  getResolvedPowerShellEdition,
  getResolvedPowerShellPath,
};
