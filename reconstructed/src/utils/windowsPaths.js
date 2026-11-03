/**
 * utils/windowsPaths.ts
 *
 * Windows 支持：Git Bash 定位、SHELL 设置、Windows↔POSIX 路径转换、PATHEXT 可执行文件解析缓存
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/windowsPaths.ts
 * pieces: chunk-648vry02.js (3), chunk-e6aww6q8.js (1)
 * attribution: fingerprint 3, layout 1
 */
import * as pathWin32Module from "path/win32";
import { getPlatform } from "./platform.js";
import { logForDebugging } from "./debug.js";
import { shellPaths } from "./shell/shellPaths.js";
import { getFsImplementation } from "./fsOperations.js";
import { env } from "./env.js";
import { findExecutableWindows } from "./findExecutableWindows.js";
import { APPLY_SECCOMP_FD } from "./sandbox/linuxSandboxExec.js";

//@ chunk-648vry02.js:1139-1300 fingerprint = setShellIfWindows (0.74)
/**
 * Windows 下把 SHELL 设为 Git Bash 路径。
 */
function setShellIfWindows() {
  if (getPlatform() === "windows") {
    let gitBashPath = getGitBashPathCached();
    if (gitBashPath) {
      process.env.SHELL = gitBashPath;
      logForDebugging(`Using bash path: "${gitBashPath}"`);
    } else logForDebugging("Git Bash not found; BashTool will be unavailable");
  }
}
//@ chunk-648vry02.js:1300-1392 layout
function getGitBashPathCached() {
  let e = shellPaths();
  if (e.gitBashPath === undefined) e.gitBashPath = findGitBashPath();
  return e.gitBashPath;
}
//@ chunk-648vry02.js:1392-2015 fingerprint = findGitBashPath (0.392)
/**
 * Windows 上定位 Git Bash（CLAUDE_CODE_GIT_BASH_PATH，否则由 git.exe 位置推导），Bash 工具依赖它。
 */
function findGitBashPath() {
  let { existsSync } = getFsImplementation();
  if (env.CLAUDE_CODE_GIT_BASH_PATH) {
    let lower = pathWin32Module.basename(env.CLAUDE_CODE_GIT_BASH_PATH).toLowerCase();
    let included = ["bash.exe", "sh.exe", "bash", "sh"].includes(lower);
    if (included && existsSync(env.CLAUDE_CODE_GIT_BASH_PATH)) return env.CLAUDE_CODE_GIT_BASH_PATH;
    logForDebugging(
      `CLAUDE_CODE_GIT_BASH_PATH "${env.CLAUDE_CODE_GIT_BASH_PATH}" ${included ? "not found" : "is not a bash/sh binary"}; falling back to auto-detection`,
      {
        level: "warn",
      },
    );
  }
  let r = ["C:\\Program Files\\Git\\bin\\bash.exe", "C:\\Program Files (x86)\\Git\\bin\\bash.exe"];
  for (let o of r) if (existsSync(o)) return o;
  let gitPath = findExecutableWindows("git");
  if (gitPath) {
    let bashPath = pathWin32Module.join(gitPath, "..", "..", "bin", "bash.exe");
    if (existsSync(bashPath)) return bashPath;
  }
  return null;
}
//@ chunk-e6aww6q8.js:3096725-3096813 fingerprint = checkPathExists (0.784)
function checkPathExists(stdin, usePipeMode, r, stdinFd) {
  let h = usePipeMode ? [stdin, "pipe", "pipe"] : [stdin, r, r];
  if (stdinFd !== undefined) h[APPLY_SECCOMP_FD] = stdinFd;
  return h;
}
export { getGitBashPathCached, setShellIfWindows, checkPathExists };
