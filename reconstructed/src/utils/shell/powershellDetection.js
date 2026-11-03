/**
 * utils/shell/powershellDetection.ts
 *
 * 查找 pwsh/powershell 可执行文件（含 snap 与 Windows 常见位置）并缓存，判断 core/desktop 版本。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/shell/powershellDetection.ts
 * pieces: chunk-e2fknt7w.js (11), chunk-q8cqcff6.js (1)
 * attribution: file-local 1, layout 8, fingerprint 2, placement 1
 */
import { stat, readlink, realpath, realpath as realpath_2 } from "fs/promises";
import { join, join as join_2 } from "path";
import { isDiskless } from "../../bootstrap/state.js";
import { getPlatform } from "../platform.js";
import { logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { whichAsync, bunWhichOnPath } from "../which.js";
import { env } from "../env.js";
import { pre } from "./shellPaths.js";

//@ chunk-e2fknt7w.js:1573-1652 file-local
async function probePath(p) {
  try {
    return (await stat(p)).isFile() ? p : null;
  } catch {
    return null;
  }
}
/**
 * readlink 后再检查目标是否为文件（Windows 应用执行别名 pwsh.exe）。
 */
//@ chunk-e2fknt7w.js:1652-1727 layout
async function probeAppExecLink(e) {
  let n;
  try {
    n = await readlink(e);
  } catch {
    return null;
  }
  return probePath(n);
}
/**
 * 查找 PowerShell：diskless 返回 null；先 pwsh（Linux snap 版换成 /opt/microsoft 或 /usr/bin 下的直装版），Windows 再查 Program Files、WindowsApps、.dotnet/tools，最后回退 powershell 5（含 System32 固定路径）。
 */
//@ chunk-e2fknt7w.js:1727-2791 fingerprint = findPowerShell (0.39)
async function findPowerShell(envPaths) {
  if (isDiskless()) return null;
  let n = await findExecutableOnPath("pwsh", envPaths);
  if (n) {
    if (getPlatform() === "linux") {
      let resolved = await realpath_2(n).catch(() => n);
      if (n.startsWith("/snap/") || resolved.startsWith("/snap/")) {
        let s = (await probePath("/opt/microsoft/powershell/7/pwsh")) ?? (await probePath("/usr/bin/pwsh"));
        if (s) {
          let directResolved = await realpath_2(s).catch(() => s);
          if (!s.startsWith("/snap/") && !directResolved.startsWith("/snap/"))
            return (logFeatureSad("shell_powershell_detect", "snap_workaround"), s);
        }
      }
    }
    return (logFeatureOk("shell_powershell_detect"), n);
  }
  if (getPlatform() === "windows") {
    let {
        programFiles: programFiles,
        localAppData: localAppData,
        userProfile: userProfile,
      } = envPaths ?? getWindowsEnvPaths(),
      d =
        (programFiles ? await probePath(join_2(programFiles, "PowerShell", "7", "pwsh.exe")) : null) ??
        (localAppData
          ? await probeAppExecLink(join_2(localAppData, "Microsoft", "WindowsApps", "pwsh.exe"))
          : null) ??
        (userProfile ? await probePath(join_2(userProfile, ".dotnet", "tools", "pwsh.exe")) : null);
    if (d) return (logFeatureSad("shell_powershell_detect", "windows_fallback_path"), d);
  }
  let o = await findExecutableOnPath("powershell", envPaths);
  if (o) return (logFeatureSad("shell_powershell_detect", "fell_back_to_powershell_5"), o);
  if (getPlatform() === "windows") {
    let r = (envPaths ?? getWindowsEnvPaths()).systemRoot ?? "C:\\Windows",
      s = await probePath(join_2(r, "System32", "WindowsPowerShell", "v1.0", "powershell.exe"));
    if (s) return (logFeatureSad("shell_powershell_detect", "fell_back_to_powershell_5"), s);
  }
  return null;
}
//@ chunk-e2fknt7w.js:2791-2856 layout
async function findExecutableOnPath(e, n) {
  return n === void 0 ? whichAsync(e) : bunWhichOnPath(e, n.path ?? "");
}
/**
 * 读取探测 PowerShell 所需的 Windows 环境变量：PATH、ProgramFiles、LOCALAPPDATA、USERPROFILE、SYSTEMROOT。
 */
//@ chunk-e2fknt7w.js:2856-2997 layout
function getWindowsEnvPaths() {
  return {
    path: env.PATH,
    programFiles: env.ProgramFiles,
    localAppData: env.LOCALAPPDATA,
    userProfile: env.USERPROFILE,
    systemRoot: env.SYSTEMROOT,
  };
}
/**
 * 按给定环境变量集合查找 PowerShell 并缓存到宿主状态 organizationsPowerShellPath。
 */
//@ chunk-e2fknt7w.js:2997-3136 layout
function findPowerShellForEnv(e) {
  if (isDiskless()) return Promise.resolve(null);
  let n = pre();
  return ((n.organizationsPowerShellPath ??= findPowerShell(e)), n.organizationsPowerShellPath);
}
/**
 * 缓存的 PowerShell 路径 Promise（宿主状态 powerShellPath），完成后写 resolvedPowerShellPath。
 */
//@ chunk-e2fknt7w.js:3136-3379 layout
function getCachedPowerShellPath() {
  if (isDiskless()) return Promise.resolve(null);
  let e = pre();
  if (!e.powerShellPath) {
    e.resolvedPowerShellPath = void 0;
    let n = findPowerShell().then((o) => {
      if (e.powerShellPath === n) e.resolvedPowerShellPath = o;
      return o;
    });
    e.powerShellPath = n;
  }
  return e.powerShellPath;
}
//@ chunk-e2fknt7w.js:3379-3430 layout
function getResolvedPowerShellPath() {
  return pre().resolvedPowerShellPath;
}
//@ chunk-e2fknt7w.js:3430-3488 layout
async function getPowerShellEditionAsync() {
  let e = await getCachedPowerShellPath();
  return e ? powerShellEditionFromPath(e) : null;
}
/**
 * 返回已解析 PowerShell 的版本类别（按路径区分 pwsh 与 Windows PowerShell）；未解析成路径时原样返回状态值。
 */
//@ chunk-e2fknt7w.js:3488-3550 layout
function getResolvedPowerShellEdition() {
  let e = getResolvedPowerShellPath();
  return typeof e === "string" ? powerShellEditionFromPath(e) : e;
}
//@ chunk-e2fknt7w.js:3550-3656 fingerprint = getPowerShellEdition (1)
function powerShellEditionFromPath(e) {
  return e
    .split(/[/\\]/)
    .pop()
    .toLowerCase()
    .replace(/\.exe$/, "") === "pwsh"
    ? "core"
    : "desktop";
}
//@ chunk-q8cqcff6.js:21180-21468 placement
var POWERSHELL_NONINTERACTIVE_ARGS = ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass"],
  yn = "C:\\Windows",
  Ge = "C:\\Program Files",
  We = `${yn}\\System32`,
  ht = `${We}\\WindowsPowerShell\\v1.0`,
  $i = `${We}\\cmd.exe`,
  Gi = [`${Ge}\\PowerShell\\7\\pwsh.exe`, `${Ge}\\PowerShell\\7-preview\\pwsh.exe`, `${ht}\\powershell.exe`];

export {
  getCachedPowerShellPath,
  findPowerShellForEnv,
  getWindowsEnvPaths,
  getPowerShellEditionAsync,
  getResolvedPowerShellEdition,
  Gi,
  getResolvedPowerShellPath,
  Ge,
  ht,
  We,
  yn,
  $i,
  POWERSHELL_NONINTERACTIVE_ARGS,
};
