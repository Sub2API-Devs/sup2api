/**
 * utils/sandbox/windowsNugetPackages.ts
 *
 * 2.1.316 新增：Windows 沙箱里查找可读的 NuGet 包目录，以及需要放行的 NuGet 环境变量名集合。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (2)
 * attribution: placement 2
 */
import { win32 } from "path";
import { homedir } from "os";
import { lstat } from "fs/promises";
import { getPlatform } from "../platform.js";
import { logForDebugging } from "../debug.js";
import { errorMessage } from "../errors.js";
import { RESTOREADDITIONALPROJECTFALLBACKFOLDERS } from "../shell/shellEnvironment.js";
import { memoizeAlias } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { getWindowsProfileReadStatusAsync } from "../../../vendor/@anthropic-ai/sandbox-runtime/dist/sandbox/windows-sandbox-utils.js";
import { rgRunner } from "./windowsSandbox.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:3047991-3048559 placement
/**
 * Windows 下判断沙箱命令能否读取 ~/.nuget/packages：环境变量已指定 NuGet 目录、路径含特殊字符或目录不存在时跳过；目录（或其父目录）在原生沙箱已授权路径中才返回该路径。
 */
async function findReadableNugetPackagesDir(env) {
  try {
    if (getPlatform() !== "windows" || Object.keys(env).some((key) => NUGET_ENV_KEYS.has(key.toUpperCase())))
      return;
    let packagesDir = win32.join(homedir(), ".nuget", "packages");
    if (
      !/^[A-Za-z]:\\/.test(packagesDir) ||
      UNSAFE_MSBUILD_PATH_RE.test(packagesDir) ||
      !(await lstat(packagesDir).then(
        (stats) => stats.isDirectory(),
        () => false,
      ))
    )
      return;
    let grantedPaths = await getGrantedSandboxPaths();
    return [packagesDir, win32.dirname(packagesDir)].some((path) => grantedPaths.has(path.toLowerCase()))
      ? packagesDir
      : undefined;
  } catch (error) {
    logForDebugging(
      `[sandbox] Windows: could not find out whether sandboxed commands can read your NuGet packages folder (${errorMessage(error)}). A sandboxed dotnet build may not find the packages that you restored outside the sandbox.`,
      {
        level: "error",
      },
    );
    return;
  }
}
//@ chunk-e6aww6q8.js:3048559-3048857 placement
var NUGET_ENV_KEYS; // deferred: uses INJECTABLE_ENV_VARS (../shell/shellEnvironment.js) of its import cycle while loading; runs once the cycle is complete
var UNSAFE_MSBUILD_PATH_RE;
var getGrantedSandboxPaths;
deferInit("chunk-e6aww6q8.js:3048559", () => {
  NUGET_ENV_KEYS = new Set(["NUGET_PACKAGES", RESTOREADDITIONALPROJECTFALLBACKFOLDERS.toUpperCase()]);
  UNSAFE_MSBUILD_PATH_RE = /[';]|[$%@]\(|%[0-9A-Fa-f]{2}/;
  getGrantedSandboxPaths = memoizeAlias(async () => {
    let { state, paths = [] } = await getWindowsProfileReadStatusAsync({
      paths: true,
      srtWin: rgRunner(),
    });
    return new Set(
      state === "current"
        ? paths
            .filter(({ kind }) => kind === "granted")
            .map(({ path }) => path.replace(/^\\\\\?\\|\\+$/g, "").toLowerCase())
        : [],
    );
  });
});
export { findReadableNugetPackagesDir };
