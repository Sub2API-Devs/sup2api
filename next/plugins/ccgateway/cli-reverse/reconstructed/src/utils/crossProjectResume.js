/**
 * utils/crossProjectResume.ts
 *
 * 跨项目 resume 检查：所选会话属于其他目录时给出切换目录的命令提示。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/crossProjectResume.ts
 * pieces: chunk-y1bp9wp9.js (3)
 * attribution: placement 1, callgraph-fingerprint 1, sole-consumer 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { sep, win32, posix } from "path";
import { lstat } from "fs/promises";
import { getPlatform } from "./platform.js";
import { getOriginalCwd } from "../bootstrap/state.js";
import { isUncOrDevicePath } from "./pathClassification.js";
import { isNetworkRelatedPath } from "./networkPaths.js";
import { getSessionIdFromLog } from "./sessionStorage.js";
import { isSafeIdSegment_2 } from "./agentId.js";
import { shellQuoteArgs } from "./bash/bashPipeCommand.js";
import { getErrnoCode } from "./errors.js";

//@ chunk-y1bp9wp9.js:19771-19818 placement
/**
 * 拼接 shell 命令的链式操作符（Windows 用 “;”，其他平台用 “&&”）。
 */
function getShellChainOperator() {
  return getPlatform() === "windows" ? ";" : "&&";
}
//@ chunk-y1bp9wp9.js:19818-20160 callgraph-fingerprint (2.1.88 match: checkCrossProjectResume, 0.251)
/**
 * 所选会话属于其他项目时，给出 cd 到对应目录再 claude --resume 的提示（同仓库 worktree 可直接恢复）。
 */
async function checkCrossProjectResume(log, showAllProjects, worktreePaths) {
  let currentCwd = getOriginalCwd();
  if (!showAllProjects || !log.projectPath || log.projectPath === currentCwd) return null;
  if (worktreePaths.some((wt) => log.projectPath === wt || log.projectPath.startsWith(wt + sep))) return null;
  if (
    !isUncOrDevicePath(log.projectPath) &&
    !isNetworkRelatedPath(log.projectPath) &&
    !(await pathHasSymlinkOrUnreadable(log.projectPath))
  )
    return null;
  let sessionId = getSessionIdFromLog(log);
  let resumeArg = isSafeIdSegment_2(sessionId) ? ` ${sessionId}` : "";
  return `cd ${shellQuoteArgs([log.projectPath])} ${getShellChainOperator()} claude --resume${resumeArg}`;
}
//@ chunk-y1bp9wp9.js:20160-20499 sole-consumer
/**
 * 检查路径上是否有符号链接或无法读取的部分（兼容 Windows 路径）。
 */
async function pathHasSymlinkOrUnreadable(projectPath) {
  let isWindows = getPlatform() === "windows";
  let { parse, sep } = isWindows ? win32 : posix;
  let rootPath = isWindows ? parse(projectPath).root.replaceAll("/", sep) : parse(projectPath).root;
  let filtered = projectPath
    .slice(parse(projectPath).root.length)
    .split(isWindows ? /[\\/]+/ : sep)
    .filter(Boolean);
  let currentPath = rootPath;
  for (let segment of filtered) {
    currentPath =
      currentPath === "" || currentPath.endsWith(sep) ? currentPath + segment : currentPath + sep + segment;
    try {
      if ((await lstat(currentPath)).isSymbolicLink()) return true;
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      return errnoCode !== "ENOENT" && errnoCode !== "ENOTDIR";
    }
  }
  return true;
}
export { checkCrossProjectResume, getShellChainOperator };
