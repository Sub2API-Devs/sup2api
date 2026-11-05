/**
 * utils/nativeInstaller/lockFiles.ts
 *
 * 安装目录的锁文件命名与扫描：生成/识别 <name>#<x>.lock，读锁文件内容收集活动版本，区分 transient/permanent 错误（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-e5z7dpjd.js (6)
 * attribution: placement 6
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { join } from "path";
import { readdir } from "fs/promises";
import { getErrnoCode, isENOENT, toError } from "../errors.js";
import { logForDebugging } from "../debug.js";
import { logError } from "../log.js";
import { getFsImplementation } from "../fsOperations.js";
import { embeddedSearchToolsBinaryPath } from "../embeddedTools.js";
import { isLockActive } from "./pidLock.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e5z7dpjd.js:22431-22492 placement
var TRANSIENT_ERRNOS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e5z7dpjd.js:22431", () => {
  TRANSIENT_ERRNOS = new Set(["EMFILE", "ENFILE", "EAGAIN", "EINTR", "EBUSY"]);
});
//@ chunk-e5z7dpjd.js:22492-22619 placement
function classifyErrno(error) {
  let errnoCode = getErrnoCode(error);
  if (errnoCode && TRANSIENT_ERRNOS.has(errnoCode)) return "transient";
  if (errnoCode === "EISDIR" || errnoCode === "ENOTDIR") return "directory";
  return "permanent";
}
//@ chunk-e5z7dpjd.js:22619-22630 placement
var HASH_MARK = "#";
//@ chunk-e5z7dpjd.js:22630-22683 placement (2.1.88 match: getTaskListLockPath, 1)
function getTaskListLockPath(dir, taskListName, pid) {
  return join(dir, `${taskListName}${HASH_MARK}${pid}.lock`);
}
//@ chunk-e5z7dpjd.js:22683-22771 placement (2.1.88 match: getTaskListLockPath, 1)
function getTaskListLockPath_2(fileName, taskListName) {
  return (
    fileName === `${taskListName}.lock` ||
    (fileName.startsWith(`${taskListName}${HASH_MARK}`) && fileName.endsWith(".lock"))
  );
}
//@ chunk-e5z7dpjd.js:23328-23913 placement
/**
 * 扫描目录里的锁文件，收集锁住的版本号，遇 transient 错误重试、permanent 错误上报。
 */
async function readActiveLockVersions(locks) {
  let versions = new Set();
  let lockNames;
  try {
    lockNames = (await readdir(locks)).filter((lockName) => lockName.endsWith(".lock"));
  } catch (error) {
    if (isENOENT(error)) return versions;
    let transient = classifyErrno(error) === "transient";
    logForDebugging(
      `Failed to readdir locks directory (${transient ? "transient" : "permanent"}): ${toError(error).message}`,
      {
        level: "error",
      },
    );
    if (!transient) logError(toError(error));
    return null;
  }
  let fsImplementation = getFsImplementation();
  for (let lockName of lockNames) {
    let lockPath = join(locks, lockName);
    let lockContent;
    try {
      lockContent = fsImplementation.readFileSync(lockPath, {
        encoding: "utf8",
      });
    } catch (error) {
      if (isENOENT(error)) continue;
      let errorClass = classifyErrno(error);
      if (errorClass === "transient") return null;
      if (errorClass === "permanent") logError(toError(error));
      continue;
    }
    let parsedLock = embeddedSearchToolsBinaryPath(lockContent);
    if (parsedLock && !versions.has(parsedLock.version))
      try {
        if (isLockActive(lockPath, parsedLock)) versions.add(parsedLock.version);
      } catch {}
    await new Promise((resolve) => setImmediate(resolve));
  }
  return versions;
}
export { getTaskListLockPath, readActiveLockVersions, getTaskListLockPath_2, classifyErrno };
