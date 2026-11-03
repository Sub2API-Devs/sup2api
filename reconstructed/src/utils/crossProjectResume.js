/**
 * utils/crossProjectResume.ts
 *
 * 跨项目 resume 检查：所选会话属于其他目录时给出切换目录的命令提示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/crossProjectResume.ts
 * pieces: chunk-b79vwm1h.js (3)
 * attribution: affinity 1, callgraph-fingerprint 1, sole-consumer 1
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

//@ chunk-b79vwm1h.js:20088-20135 affinity
/**
 * 拼接 shell 命令的链式操作符（Windows 用 “;”，其他平台用 “&&”）。
 */
function getShellChainOperator() {
  return getPlatform() === "windows" ? ";" : "&&";
}
//@ chunk-b79vwm1h.js:20135-20477 callgraph-fingerprint = checkCrossProjectResume (0.251)
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
  let b = isSafeIdSegment_2(sessionId) ? ` ${sessionId}` : "";
  return `cd ${shellQuoteArgs([log.projectPath])} ${getShellChainOperator()} claude --resume${b}`;
}
//@ chunk-b79vwm1h.js:20477-20816 sole-consumer
/**
 * 检查路径上是否有符号链接或无法读取的部分（兼容 Windows 路径）。
 */
async function pathHasSymlinkOrUnreadable(projectPath) {
  let d = getPlatform() === "windows";
  let { parse, sep } = d ? win32 : posix;
  let u = d ? parse(projectPath).root.replaceAll("/", sep) : parse(projectPath).root;
  let filtered = projectPath
    .slice(parse(projectPath).root.length)
    .split(d ? /[\\/]+/ : sep)
    .filter(Boolean);
  let b = u;
  for (let p of filtered) {
    b = b === "" || b.endsWith(sep) ? b + p : b + sep + p;
    try {
      if ((await lstat(b)).isSymbolicLink()) return true;
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      return errnoCode !== "ENOENT" && errnoCode !== "ENOTDIR";
    }
  }
  return true;
}
export { checkCrossProjectResume, getShellChainOperator };
