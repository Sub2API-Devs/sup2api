/**
 * utils/windowsPaths.ts
 *
 * Windows 支持：Git Bash 定位、SHELL 设置、Windows↔POSIX 路径转换、PATHEXT 可执行文件解析缓存
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/windowsPaths.ts
 * pieces: chunk-3yhwrhy0.js (3), chunk-5xgkngpb.js (1)
 * attribution: fingerprint 3, layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import * as pathWin32Module from "path/win32";
import { getPlatform } from "./platform.js";
import { logForDebugging } from "./debug.js";
import { shellPaths } from "./shell/shellPaths.js";
import { getFsImplementation } from "./fsOperations.js";
import { env } from "./env.js";
import { findExecutableWindows } from "./findExecutableWindows.js";
import { APPLY_SECCOMP_FD } from "./sandbox/linuxSandboxExec.js";
import { CWD_FD } from "./shell/bashProvider.js";

//@ chunk-3yhwrhy0.js:1139-1300 fingerprint (2.1.88 match: setShellIfWindows, 0.74)
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
//@ chunk-3yhwrhy0.js:1300-1392 layout
function getGitBashPathCached() {
  let paths = shellPaths();
  if (paths.gitBashPath === undefined) paths.gitBashPath = findGitBashPath();
  return paths.gitBashPath;
}
//@ chunk-3yhwrhy0.js:1392-2015 fingerprint (2.1.88 match: findGitBashPath, 0.392)
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
  let candidatePaths = [
    "C:\\Program Files\\Git\\bin\\bash.exe",
    "C:\\Program Files (x86)\\Git\\bin\\bash.exe",
  ];
  for (let candidatePath of candidatePaths) if (existsSync(candidatePath)) return candidatePath;
  let gitPath = findExecutableWindows("git");
  if (gitPath) {
    let bashPath = pathWin32Module.join(gitPath, "..", "..", "bin", "bash.exe");
    if (existsSync(bashPath)) return bashPath;
  }
  return null;
}
//@ chunk-5xgkngpb.js:3183089-3183202 fingerprint (2.1.88 match: checkPathExists, 0.784)
function checkPathExists(stdin, usePipeMode, outputMode, stdinFd, extraFd) {
  let stdioConfig = usePipeMode ? [stdin, "pipe", "pipe"] : [stdin, outputMode, outputMode];
  if (stdinFd !== undefined) stdioConfig[APPLY_SECCOMP_FD] = stdinFd;
  if (extraFd !== undefined) stdioConfig[CWD_FD] = extraFd;
  return stdioConfig;
}
export { getGitBashPathCached, checkPathExists, setShellIfWindows };
