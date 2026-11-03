/**
 * utils/sandbox/windowsNugetPackages.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (2)
 * attribution: placement 2
 */
import {
  win32,
  win32 as win32_2,
  win32 as win32_3,
  win32 as win32_4,
  win32 as win32_5,
  win32 as win32_6,
  win32 as win32_7,
  win32 as win32_8,
} from "path";
import {
  homedir,
  homedir as homedir_2,
  homedir as homedir_3,
  homedir as homedir_4,
  homedir as homedir_5,
  homedir as homedir_6,
  homedir as homedir_7,
  homedir as homedir_8,
  homedir as homedir_9,
  homedir as homedir_10,
  homedir as homedir_11,
  homedir as homedir_12,
} from "os";
import {
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  lstat as lstat_4,
  lstat as lstat_5,
  lstat as lstat_6,
  lstat as lstat_7,
  lstat as lstat_8,
  lstat as lstat_9,
  lstat as lstat_10,
  lstat as lstat_11,
  lstat as lstat_12,
  lstat as lstat_13,
  lstat as lstat_14,
  lstat as lstat_15,
  lstat as lstat_16,
  lstat as lstat_17,
  lstat as lstat_18,
  lstat as lstat_19,
  lstat as lstat_20,
  lstat as lstat_21,
  lstat as lstat_22,
  lstat as lstat_23,
  lstat as lstat_24,
  lstat as lstat_25,
  lstat as lstat_26,
  lstat as lstat_27,
  lstat as lstat_28,
  lstat as lstat_29,
  lstat as lstat_30,
  lstat as lstat_31,
  lstat as lstat_32,
  lstat as lstat_33,
  lstat as lstat_34,
  lstat as lstat_35,
  lstat as lstat_36,
  lstat as lstat_37,
  lstat as lstat_38,
  lstat as lstat_39,
  lstat as lstat_40,
  lstat as lstat_41,
  lstat as lstat_42,
  lstat as lstat_43,
} from "fs/promises";
import { getPlatform } from "../platform.js";
import { logForDebugging } from "../debug.js";
import { errorMessage } from "../errors.js";
import { RESTOREADDITIONALPROJECTFALLBACKFOLDERS } from "../shell/shellEnvironment.js";
import { io } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { q6r } from "../../../vendor/@anthropic-ai/sandbox-runtime/dist/sandbox/windows-sandbox-utils.js";
import { tD } from "./windowsSandbox.js";

/**
 * Windows 下判断沙箱命令能否读取 ~/.nuget/packages：环境变量已指定 NuGet 目录、路径含特殊字符或目录不存在时跳过；目录（或其父目录）在原生沙箱已授权路径中才返回该路径。
 */
//@ chunk-e6aww6q8.js:3047991-3048559 placement
async function findReadableNugetPackagesDir(e) {
  try {
    if (getPlatform() !== "windows" || Object.keys(e).some((s) => NUGET_ENV_KEYS.has(s.toUpperCase())))
      return;
    let packagesDir = win32_5.join(homedir_9(), ".nuget", "packages");
    if (
      !/^[A-Za-z]:\\/.test(packagesDir) ||
      UNSAFE_MSBUILD_PATH_RE.test(packagesDir) ||
      !(await lstat_29(packagesDir).then(
        (s) => s.isDirectory(),
        () => !1,
      ))
    )
      return;
    let grantedPaths = await getGrantedSandboxPaths();
    return [packagesDir, win32_5.dirname(packagesDir)].some((s) => grantedPaths.has(s.toLowerCase()))
      ? packagesDir
      : void 0;
  } catch (error) {
    logForDebugging(
      `[sandbox] Windows: could not find out whether sandboxed commands can read your NuGet packages folder (${errorMessage(error)}). A sandboxed dotnet build may not find the packages that you restored outside the sandbox.`,
      { level: "error" },
    );
    return;
  }
}
//@ chunk-e6aww6q8.js:3048559-3048857 placement
var NUGET_ENV_KEYS = new Set(["NUGET_PACKAGES", RESTOREADDITIONALPROJECTFALLBACKFOLDERS.toUpperCase()]),
  UNSAFE_MSBUILD_PATH_RE = /[';]|[$%@]\(|%[0-9A-Fa-f]{2}/,
  getGrantedSandboxPaths = io(async () => {
    let { state: state, paths: paths = [] } = await q6r({ paths: !0, srtWin: tD() });
    return new Set(
      state === "current"
        ? paths
            .filter(({ kind: kind }) => kind === "granted")
            .map(({ path: path }) => path.replace(/^\\\\\?\\|\\+$/g, "").toLowerCase())
        : [],
    );
  });

export { findReadableNugetPackagesDir };
